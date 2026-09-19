import { beforeAll, afterAll, it, expect } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { readFileSync } from 'node:fs'
const sql = new PGlite({ extensions: { pgcrypto } })
const teacher = '11111111-1111-4111-8111-111111111111'
const alice = '22222222-2222-4222-8222-222222222222'
const other = '33333333-3333-4333-8333-333333333333'
let code: string, student: string, legacy: string
async function asUser(id: string, anonymous = true) {
  await sql.exec(
    `reset role;set request.jwt.claim.sub='${id}';set request.jwt.claims='{"is_anonymous":${anonymous}}';set role authenticated;`,
  )
}
async function join(pin: string, name = '새학생', classCode = code) {
  return (
    await sql.query<{ result: { error?: string; retry_after?: number; student?: { id: string } } }>(
      'select join_class($1,$2,$3) as result',
      [classCode, name, pin],
    )
  ).rows[0].result
}
beforeAll(async () => {
  await sql.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
  create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  create function auth.jwt() returns jsonb language sql stable as $$select current_setting('request.jwt.claims',true)::jsonb$$;
  grant usage on schema auth,storage to authenticated,anon;
  create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
  alter table storage.objects enable row level security;grant select,insert,delete on storage.objects to authenticated;
  insert into auth.users values('${teacher}'),('${alice}'),('${other}');`)
  for (const file of [
    '202609150001_initial',
    '202609150002_roundtrip',
    '202609160003_rejoin_reopen',
    '202609160004_archive_revision',
  ]) {
    await sql.exec(readFileSync(`supabase/migrations/${file}.sql`, 'utf8'))
  }
  await asUser(teacher, false)
  code = (
    await sql.query<{ class_code: string }>("select class_code from create_project('PIN검증')")
  ).rows[0].class_code
  await asUser(alice)
  legacy = (await sql.query<{ id: string }>('select id from join_class($1,$2)', [code, '기존학생']))
    .rows[0].id
  await sql.exec('reset role')
  await sql.exec(readFileSync('supabase/migrations/202609190005_student_pin.sql', 'utf8'))
}, 30000)
afterAll(async () => {
  await sql.close()
})

it('마이그레이션은 기록을 보존하고 기존 무PIN 세션/구형 RPC를 차단한다', async () => {
  expect((await sql.query('select * from trips')).rows).toHaveLength(1)
  expect((await sql.query('select * from destinations')).rows).toHaveLength(1)
  await asUser(alice)
  expect((await sql.query('select * from trips')).rows).toHaveLength(0)
  await expect(sql.query('select join_class($1,$2)', [code, '기존학생'])).rejects.toThrow()
  expect((await join('1234', '기존학생')).error).toContain('첫 PIN')
})
it('새 PIN은 해시로 저장하고 학생/교사의 직접 해시 조회를 차단한다', async () => {
  const result = await join('0123')
  student = result.student!.id
  await expect(sql.query('select * from student_credentials')).rejects.toThrow()
  await asUser(teacher, false)
  await expect(sql.query('select * from student_credentials')).rejects.toThrow()
  await sql.exec('reset role')
  const hash = (
    await sql.query<{ pin_hash: string }>(
      'select pin_hash from student_credentials where student_id=$1',
      [student],
    )
  ).rows[0].pin_hash
  expect(hash).toMatch(/^\$2/)
  expect(hash).not.toBe('0123')
})
it('다른 기기에서 잘못된 PIN으로 기록/사진 권한을 얻지 못하고 올바른 PIN이면 접속한다', async () => {
  await asUser(other)
  expect((await join('9999')).error).toBeTruthy()
  expect((await sql.query('select * from trips')).rows).toHaveLength(0)
  expect((await join('0123')).student?.id).toBe(student)
  expect((await sql.query('select * from trips')).rows).toHaveLength(1)
})
it('5회 실패가 롤백되지 않으며 다른 사용자 세션으로도 잠금을 우회하지 못한다', async () => {
  for (let i = 0; i < 5; i++) expect((await join('9999')).error).toBeTruthy()
  await asUser(alice)
  expect((await join('0123')).retry_after).toBeGreaterThan(0)
  await sql.exec('reset role')
  expect(
    (
      await sql.query<{ failures: number }>(
        'select failures from student_credentials where student_id=$1',
        [student],
      )
    ).rows[0].failures,
  ).toBe(5)
  await sql.query(
    "update student_credentials set blocked_until=now()-interval '1 second' where student_id=$1",
    [student],
  )
  await asUser(alice)
  expect((await join('0123')).student?.id).toBe(student)
})
it('담당 교사만 PIN을 설정하고 모든 기존 접근을 취소하며 기록은 유지한다', async () => {
  await expect(sql.query('select reset_student_pin($1,$2)', [student, '4567'])).rejects.toThrow(
    '담당 교사',
  )
  await asUser(other, false)
  await expect(sql.query('select reset_student_pin($1,$2)', [student, '4567'])).rejects.toThrow(
    '담당 교사',
  )
  await asUser(teacher, false)
  await expect(sql.query('select reset_student_pin($1,$2)', [student, '123'])).rejects.toThrow(
    '4자리',
  )
  await sql.query('select reset_student_pin($1,$2)', [student, '4567'])
  await sql.query('select reset_student_pin($1,$2)', [legacy, '5678'])
  await asUser(alice)
  expect((await sql.query('select * from trips')).rows).toHaveLength(0)
  expect((await join('0123')).error).toBeTruthy()
  expect((await join('4567')).student?.id).toBe(student)
  await asUser(other)
  expect((await sql.query('select * from trips')).rows).toHaveLength(0)
  expect((await join('5678', '기존학생')).student?.id).toBe(legacy)
})
it('반복된 잘못된 학급 코드에도 사용자별 제한이 적용되고 시간 경과 후 자동 해제된다', async () => {
  await sql.exec('reset role;delete from student_join_attempts;')
  await asUser(other)
  for (let i = 0; i < 20; i++) await join('1234', '학생', '0000')
  expect((await join('4567')).retry_after).toBeGreaterThan(0)
  await sql.exec(
    "reset role;update student_join_attempts set window_start=now()-interval '6 minutes';",
  )
  await asUser(other)
  expect((await join('4567')).student?.id).toBe(student)
})
it('로그인하지 않은 요청과 교사 계정의 학생 참가를 거부한다', async () => {
  await asUser(teacher, false)
  await expect(join('4567')).rejects.toThrow('학생 참가')
  await sql.exec('reset role;set role anon;')
  await expect(join('4567')).rejects.toThrow()
})

it('교사 초기화로 PIN 잠금을 즉시 풀고 제한 테이블 직접 변경을 막는다', async () => {
  await asUser(alice)
  for (let i = 0; i < 5; i++) await join('9999')
  expect((await join('4567')).retry_after).toBeGreaterThan(0)
  await expect(
    sql.query('update student_credentials set failures=0,blocked_until=null'),
  ).rejects.toThrow()
  await expect(sql.query('delete from student_join_attempts')).rejects.toThrow()
  await asUser(teacher, false)
  await sql.query('select reset_student_pin($1,$2)', [student, '8901'])
  await asUser(alice)
  expect((await join('8901')).student?.id).toBe(student)
})
