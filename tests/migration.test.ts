import { it, expect } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
it('기존 코드·준비물·제출 기록을 보존하고 작성 중 경로에 출발지를 추가한다', async () => {
  const sql = new PGlite()
  const teacher = '11111111-1111-4111-8111-111111111111',
    alice = '22222222-2222-4222-8222-222222222222',
    bob = '33333333-3333-4333-8333-333333333333',
    outsider = '44444444-4444-4444-8444-444444444444'
  try {
    await sql.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
 create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select current_setting('request.jwt.claims',true)::jsonb$$;
 grant usage on schema auth,storage to authenticated,anon;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant select,insert,delete on storage.objects to authenticated;
 insert into auth.users values('${teacher}'),('${alice}'),('${bob}'),('${outsider}');`)
    await sql.exec(readFileSync('supabase/migrations/202609150001_initial.sql', 'utf8'))
    await sql.exec(`insert into projects(id,teacher_id,title,class_code) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','${teacher}','기존 학급','ABCD1234');
insert into students(id,user_id,project_id,nickname) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','${alice}','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','가'),('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','${bob}','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','나');
insert into trips(id,student_id,submitted) values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',false),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',true);
insert into destinations(id,trip_id,country_code,country_name,visit_order,diary) values('cccccccc-cccc-4ccc-8ccc-ccccccccccc1','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1','JP','일본',0,'기존 일기'),('cccccccc-cccc-4ccc-8ccc-ccccccccccc2','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2','FR','프랑스',0,'제출 일기');
insert into packing_items(destination_id,text,checked) values('cccccccc-cccc-4ccc-8ccc-ccccccccccc1','여권',true),('cccccccc-cccc-4ccc-8ccc-ccccccccccc2','우산',false);`)
    await sql.exec(readFileSync('supabase/migrations/202609150002_roundtrip.sql', 'utf8'))
    expect((await sql.query('select class_code from projects')).rows[0]).toEqual({
      class_code: 'ABCD1234',
    })
    expect(
      (
        await sql.query(
          "select country_code,kind,visit_order from destinations where trip_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1' order by visit_order",
        )
      ).rows,
    ).toEqual([
      { country_code: 'KR', kind: 'departure', visit_order: 0 },
      { country_code: 'JP', kind: 'visit', visit_order: 1 },
    ])
    expect(
      (
        await sql.query(
          "select country_code,diary from destinations where trip_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'",
        )
      ).rows,
    ).toEqual([{ country_code: 'FR', diary: '제출 일기' }])
    expect(
      (
        await sql.query(
          'select text,checked,destination_id,trip_id is not null as linked from packing_items order by text',
        )
      ).rows,
    ).toEqual([
      { text: '여권', checked: true, destination_id: null, linked: true },
      { text: '우산', checked: false, destination_id: null, linked: true },
    ])
    await sql.exec(readFileSync('supabase/migrations/202609160003_rejoin_reopen.sql', 'utf8'))
    expect((await sql.query('select * from student_sessions')).rows).toHaveLength(2)
    await sql.query("select set_config('request.jwt.claim.sub',$1,false)", [teacher])
    await sql.query("select set_config('request.jwt.claims',$1,false)", ['{"is_anonymous":false}'])
    await sql.query("select reopen_trip('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2')")
    expect(
      (
        await sql.query(
          "select country_code,kind from destinations where trip_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2' order by visit_order",
        )
      ).rows,
    ).toEqual([
      { country_code: 'KR', kind: 'departure' },
      { country_code: 'FR', kind: 'visit' },
    ])
    expect((await sql.query('select * from packing_items')).rows).toHaveLength(2)
  } finally {
    await sql.close()
  }
}, 30000)
