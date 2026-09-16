import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { newDestination, newHome, totalCost, submissionIssues } from '../src/lib/model'
import type { Destination, Trip } from '../src/lib/model'
const sql = new PGlite()
const teacher = '11111111-1111-4111-8111-111111111111'
const alice = '22222222-2222-4222-8222-222222222222'
const bob = '33333333-3333-4333-8333-333333333333'
const outsider = '44444444-4444-4444-8444-444444444444'
let project: { id: string; class_code: string }
let a: { id: string }
let b: { id: string }
let at: string
let bt: string
let did: string
let departure: Destination
let route: Destination[]
async function asUser(uid: string, anonymous = true) {
  await sql.exec(
    `reset role; set request.jwt.claim.sub='${uid}'; set request.jwt.claims='{"is_anonymous":${anonymous}}'; set role authenticated;`,
  )
}
async function one<T>(q: string, params: unknown[] = []) {
  return (await sql.query<T>(q, params)).rows[0]
}
beforeAll(async () => {
  await sql.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
 create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select current_setting('request.jwt.claims',true)::jsonb$$;
 grant usage on schema auth,storage to authenticated,anon;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant select,insert,delete on storage.objects to authenticated;
 insert into auth.users values('${teacher}'),('${alice}'),('${bob}'),('${outsider}');`)
  await sql.exec(
    readFileSync(
      new URL('../supabase/migrations/202609150001_initial.sql', import.meta.url),
      'utf8',
    ),
  )
  await sql.exec(
    readFileSync(
      new URL('../supabase/migrations/202609150002_roundtrip.sql', import.meta.url),
      'utf8',
    ),
  )
  await sql.exec(
    readFileSync(
      new URL('../supabase/migrations/202609160003_rejoin_reopen.sql', import.meta.url),
      'utf8',
    ),
  )
  await asUser(teacher, false)
  project = (
    await one<{ p: { id: string; class_code: string } }>(
      `select row_to_json(public.create_project('테스트 학급')) as p`,
    )
  ).p
  await asUser(alice)
  a = (
    await one<{ s: { id: string } }>('select row_to_json(public.join_class($1,$2)) as s', [
      project.class_code,
      '여행자A',
    ])
  ).s
  at = (await one<{ id: string }>('select id from trips')).id
  departure = {
    ...newHome('departure', 0),
    id: (await one<{ id: string }>("select id from destinations where kind='departure'")).id,
    visit_date: '2026-10-01',
    visit_time: '09:00',
  }
  await asUser(bob)
  b = (
    await one<{ s: { id: string } }>('select row_to_json(public.join_class($1,$2)) as s', [
      project.class_code,
      '여행자B',
    ])
  ).s
  bt = (await one<{ id: string }>('select id from trips')).id
}, 30000)
afterAll(async () => {
  await sql.close()
})
describe('실제 PostgreSQL RLS 및 서버 쓰기 권한', () => {
  it('새 학급은 4자리 숫자이며 코드는 중복되지 않는다', async () => {
    await asUser(teacher, false)
    const next = (
      await one<{ p: { class_code: string } }>("select row_to_json(create_project('새 학급')) as p")
    ).p
    expect(project.class_code).toMatch(/^[1-9][0-9]{3}$/)
    expect(next.class_code).toMatch(/^[1-9][0-9]{3}$/)
    expect(next.class_code).not.toBe(project.class_code)
  })
  it('구버전 내부 저장 RPC의 직접 실행을 차단한다', async () => {
    await asUser(alice)
    await expect(
      sql.query('select save_trip_records_internal($1,$2,$3)', [at, '우회', '[]']),
    ).rejects.toThrow()
  })
  it('학생은 자신의 행만 조회한다', async () => {
    await asUser(alice)
    expect((await sql.query('select id from students')).rows).toEqual([{ id: a.id }])
    expect((await sql.query('select id from trips')).rows).toEqual([{ id: at }])
  })
  it('학생은 다른 학생 여행과 직접 소유자/제출 상태를 수정할 수 없다', async () => {
    await asUser(alice)
    await expect(
      sql.query('select save_trip($1,$2,$3,$4)', [bt, '침입', '[]', '[]']),
    ).rejects.toThrow()
    await expect(sql.query('update trips set submitted=true where id=$1', [at])).rejects.toThrow()
    await expect(
      sql.query('update students set user_id=$1 where id=$2', [alice, b.id]),
    ).rejects.toThrow()
  })
  it('익명 학생은 교사 프로젝트를 만들지 못한다', async () => {
    await expect(sql.query("select create_project('위조 학급')")).rejects.toThrow()
  })
  it('저장은 원자적이고 교사는 작성 중인 상세 기록을 읽지 못한다', async () => {
    await asUser(alice)
    const d = newDestination('JP', '일본', 0)
    did = d.id
    d.city = '도쿄'
    d.visit_date = '2026-10-01'
    d.reason = '직접 조사'
    d.schedule = '오전 박물관'
    d.activities = '관람'
    d.diary = '여행 일기'
    d.learned = '알게 된 점'
    d.transport_cost = 100000
    const packing = [{ id: crypto.randomUUID(), text: '여권', checked: true }]
    route = [departure, { ...d, visit_order: 1 }]
    await sql.query('select save_trip($1,$2,$3,$4)', [
      at,
      '첫 여행',
      JSON.stringify(route),
      JSON.stringify(packing),
    ])
    expect((await sql.query('select * from packing_items')).rows).toHaveLength(1)
    await asUser(teacher, false)
    expect((await sql.query('select * from students')).rows).toHaveLength(2)
    expect((await sql.query('select * from destinations')).rows).toHaveLength(0)
  })
  it('타인의 여행지 ID로 덮어쓰려 하면 기존 저장이 유지된다', async () => {
    await asUser(bob)
    const bd = {
      ...newHome('departure', 0),
      id: (await one<{ id: string }>("select id from destinations where kind='departure'")).id,
    }
    const d = { ...newDestination('JP', '일본', 1), id: did }
    await expect(
      sql.query('select save_trip($1,$2,$3,$4)', [bt, '변경', JSON.stringify([bd, d]), '[]']),
    ).rejects.toThrow()
    expect((await one<{ title: string }>('select title from trips')).title).toBe('나의 첫 세계여행')
  })
  it('출발지 삭제/교체와 중간 귀국 지점을 거부한다', async () => {
    await asUser(alice)
    await expect(
      sql.query('select save_trip($1,$2,$3,$4)', [
        at,
        '잘못된 여행',
        JSON.stringify(route.slice(1)),
        '[]',
      ]),
    ).rejects.toThrow('출발지는 대한민국')
    await expect(
      sql.query('select save_trip($1,$2,$3,$4)', [
        at,
        '잘못된 여행',
        JSON.stringify([{ ...departure, id: crypto.randomUUID() }, route[1]]),
        '[]',
      ]),
    ).rejects.toThrow('삭제하거나 교체')
    await expect(
      sql.query('select save_trip($1,$2,$3,$4)', [
        at,
        '잘못된 여행',
        JSON.stringify([departure, newHome('arrival', 1), route[1]]),
        '[]',
      ]),
    ).rejects.toThrow('마지막 도착지')
    expect((await sql.query('select id from packing_items')).rows).toHaveLength(1)
  })
  it('공통 준비물은 여행 단위로 저장되며 다른 학생에게 노출되지 않는다', async () => {
    await asUser(alice)
    const items = (
      await sql.query<{ trip_id: string; destination_id: string | null; checked: boolean }>(
        'select * from packing_items',
      )
    ).rows
    expect(items[0]).toMatchObject({ trip_id: at, destination_id: null, checked: true })
    await asUser(bob)
    expect((await sql.query('select * from packing_items')).rows).toHaveLength(0)
  })
  it('사진 경로/개수와 다른 학생 Storage 접근을 제한한다', async () => {
    await asUser(alice)
    const prefix = `${project.id}/${a.id}/${did}/`
    for (let i = 0; i < 3; i++) {
      const id = crypto.randomUUID()
      await sql.query(
        'insert into travel_photos(id,destination_id,storage_path) values($1,$2,$3)',
        [id, did, `${prefix}${id}.webp`],
      )
    }
    const id = crypto.randomUUID()
    await expect(
      sql.query('insert into travel_photos(id,destination_id,storage_path) values($1,$2,$3)', [
        id,
        did,
        `${prefix}${id}.webp`,
      ]),
    ).rejects.toThrow()
    expect(
      (
        await one<{ ok: boolean }>('select photo_path_allowed($1,true) as ok', [
          prefix + 'photo.webp',
        ])
      ).ok,
    ).toBe(true)
    await asUser(bob)
    expect(
      (
        await one<{ ok: boolean }>('select photo_path_allowed($1,false) as ok', [
          prefix + 'photo.webp',
        ])
      ).ok,
    ).toBe(false)
    await expect(
      sql.query("insert into storage.objects(bucket_id,name) values('travel-photos',$1)", [
        prefix + 'bad.webp',
      ]),
    ).rejects.toThrow()
  })
  it('제출 후 저장·사진 수정 차단, 담당 교사만 결과 열람', async () => {
    await asUser(alice)
    await expect(sql.query('select submit_trip($1)', [at])).rejects.toThrow(
      '마지막 도착지를 대한민국으로 설정해주세요.',
    )
    route.push({ ...newHome('arrival', 2), visit_date: '2026-10-05', visit_time: '18:00' })
    await sql.query('select save_trip($1,$2,$3,$4)', [at, '첫 여행', JSON.stringify(route), '[]'])
    await sql.query('select submit_trip($1)', [at])
    await expect(
      sql.query('select save_trip($1,$2,$3,$4)', [at, '수정', '[]', '[]']),
    ).rejects.toThrow()
    await expect(
      sql.query('insert into travel_photos(destination_id,storage_path) values($1,$2)', [
        did,
        'bad.webp',
      ]),
    ).rejects.toThrow()
    await asUser(teacher, false)
    expect((await sql.query('select * from destinations')).rows).toHaveLength(3)
    expect((await sql.query('select * from travel_photos')).rows).toHaveLength(3)
    await asUser(outsider, false)
    expect((await sql.query('select * from destinations')).rows).toHaveLength(0)
    expect((await sql.query('select * from projects')).rows).toHaveLength(0)
  })
  it('내용 없는 제출과 비로그인 RPC 호출을 거부한다', async () => {
    await asUser(bob)
    await expect(sql.query('select submit_trip($1)', [bt])).rejects.toThrow()
    await sql.exec('reset role;set role anon;')
    await expect(
      sql.query('select join_class($1,$2)', [project.class_code, '공격']),
    ).rejects.toThrow()
  })
  it('다른 기기에서 학급 코드와 같은 닉네임으로 기존 여행과 사진을 연다', async () => {
    await asUser(outsider)
    await expect(sql.query('select join_class($1,$2)', ['wrong', '여행자A'])).rejects.toThrow()
    const result = await one<{ id: string }>('select id from join_class($1,$2)', [
      project.class_code,
      ' 여행자A ',
    ])
    expect(result.id).toBe(a.id)
    expect((await one<{ id: string }>('select id from trips')).id).toBe(at)
    expect((await sql.query('select * from travel_photos')).rows).toHaveLength(3)
    await expect(sql.query('update student_sessions set student_id=$1', [b.id])).rejects.toThrow()
    await expect(sql.query('select reopen_trip($1)', [at])).rejects.toThrow('담당 교사')
    await asUser(alice)
    expect((await one<{ id: string }>('select id from trips')).id).toBe(at)
  })
  it('담당 교사만 제출 취소 가능하고 새 기기에서도 수정 권한이 복구된다', async () => {
    await asUser(outsider, false)
    await expect(sql.query('select reopen_trip($1)', [at])).rejects.toThrow('담당 교사')
    await asUser(teacher, false)
    await sql.query('select reopen_trip($1)', [at])
    expect(
      (await one<{ submitted: boolean }>('select submitted from trips where id=$1', [at]))
        .submitted,
    ).toBe(false)
    await asUser(outsider)
    await sql.query('select save_trip($1,$2,$3,$4)', [at, '다시 작성', JSON.stringify(route), '[]'])
    expect((await one<{ title: string }>('select title from trips')).title).toBe('다시 작성')
    const path = project.id + '/' + a.id + '/' + did + '/image.webp'
    expect(
      (await one<{ ok: boolean }>('select photo_path_allowed($1,true) as ok', [path])).ok,
    ).toBe(true)
    await sql.query('select submit_trip($1)', [at])
  })
  it('세션 전환 후 이전 학생과 다른 학급 기록에 접근하지 못한다', async () => {
    await asUser(outsider)
    await sql.query('select join_class($1,$2)', [project.class_code, '새 여행자'])
    expect((await sql.query('select * from trips where id=$1', [at])).rows).toHaveLength(0)
    await expect(
      sql.query('select save_trip($1,$2,$3,$4)', [at, '변경', JSON.stringify(route), '[]']),
    ).rejects.toThrow()
    expect((await sql.query('select * from students')).rows).toHaveLength(1)
  })
})
it('금액은 숫자로 정확하게 합산하고 미완성 제출을 검출한다', () => {
  const d = newDestination('KR', '대한민국', 0)
  d.transport_cost = 120000
  d.food_cost = 45000
  const trip: Trip = {
    id: 't',
    student_id: 's',
    title: '여행',
    submitted: false,
    destinations: [d],
    packing_items: [],
  }
  expect(totalCost(trip)).toBe(165000)
  expect(submissionIssues(trip)).toContain('마지막 도착지를 대한민국으로 설정해주세요.')
})
