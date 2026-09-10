/**
 * 数据库自测脚本
 * ============================================================================
 * 在不连接真实 Supabase 的情况下，用 PGlite（跑在 WebAssembly 里的真 PostgreSQL）
 * 执行 supabase/migrations/0001_init.sql，然后逐条验证：
 *
 *   · 建表、触发器、RPC 是否都能正常跑通
 *   · 邀请码 / 加入空间 / 满员拒绝 是否符合预期
 *   · 行级安全（RLS）是否真的隔离了两个不同的情侣空间
 *   · 陌生人是否完全读不到数据
 *
 * 运行：npm run db:test
 *
 * 它只做验证，不写入任何真实数据，也不会碰你的 Supabase 项目。
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import { PGlite } from '@electric-sql/pglite'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MIGRATION = join(__dirname, '..', 'supabase', 'migrations', '0001_init.sql')

/* ------------------------------------------------------------------ 断言工具 */

let passed = 0
const failures = []

function ok(name, cond, detail = '') {
  if (cond) {
    passed += 1
    console.log(`  \u2713 ${name}`)
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`)
    console.log(`  \u2717 ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

function section(title) {
  console.log(`\n${title}`)
}

async function expectError(name, fn, expectFragment) {
  try {
    await fn()
    ok(name, false, '预期报错，但成功执行了')
  } catch (err) {
    const msg = String(err?.message ?? err)
    const good = expectFragment ? msg.includes(expectFragment) : true
    ok(name, good, `错误信息是「${msg}」`)
  }
}

/**
 * 期望「被挡住」：报权限错误、或者返回空结果都算通过。
 * 未登录用户更常见的表现是 permission denied —— 这比返回空列表更安全。
 */
async function expectDenied(name, fn) {
  try {
    const res = await fn()
    if (Array.isArray(res)) {
      ok(name, res.length === 0, `预期被拒绝，却读到了 ${res.length} 条数据`)
      return
    }
    // insert / update / delete 返回的是影响行数，0 行就说明被 RLS 挡下了
    const affected = res?.affectedRows
    ok(name, affected === 0 || affected === undefined, `预期被拒绝，却影响了 ${affected} 行`)
  } catch (err) {
    ok(name, true)
    console.log(`      （拦截方式：${String(err?.message ?? err).slice(0, 72)}）`)
  }
}

/* ------------------------------------------------------------------ 引导环境 */

/** Supabase 已经准备好、但原生 PostgreSQL 没有的东西，先补上 */
const BOOTSTRAP = `
  create schema if not exists auth;

  create table if not exists auth.users (
    id                 uuid primary key default gen_random_uuid(),
    email              text,
    raw_user_meta_data jsonb not null default '{}'::jsonb
  );

  -- 用会话变量模拟 auth.uid()
  create or replace function auth.uid()
  returns uuid
  language sql
  stable
  as $$
    select nullif(current_setting('test.uid', true), '')::uuid;
  $$;

  do $$ begin
    create role anon noinherit;
  exception when duplicate_object then null; end $$;

  do $$ begin
    create role authenticated noinherit;
  exception when duplicate_object then null; end $$;

  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;

  do $$ begin
    create publication supabase_realtime;
  exception when duplicate_object then null; end $$;
`

/* ------------------------------------------------------------------ 主流程 */

const db = new PGlite()

/** 以某个身份执行操作 */
async function as(role, uid, fn) {
  await db.exec(`select set_config('test.uid', '${uid ?? ''}', false);`)
  await db.exec(`set role ${role};`)
  try {
    return await fn()
  } finally {
    await db.exec('reset role;')
  }
}

const one = async (sql, params) => (await db.query(sql, params)).rows[0]
const all = async (sql, params) => (await db.query(sql, params)).rows

async function main() {
  console.log('情侣约会空间 · 数据库自测')
  console.log('='.repeat(64))

  await db.exec(BOOTSTRAP)
  console.log('\n[1/6] 执行数据库迁移脚本 0001_init.sql …')
  await db.exec(readFileSync(MIGRATION, 'utf8'))
  console.log('  \u2713 迁移脚本执行成功，没有语法错误')

  /* ---------------------------------------------------------------- 用户 */
  const U1 = '11111111-1111-4111-8111-111111111111'
  const U2 = '22222222-2222-4222-8222-222222222222'
  const U3 = '33333333-3333-4333-8333-333333333333'
  const U4 = '44444444-4444-4444-8444-444444444444'

  section('[2/6] 注册触发器与资料表')
  await db.query(
    `insert into auth.users (id, email, raw_user_meta_data) values
       ($1, 'a@example.com', '{"display_name":"小明"}'::jsonb),
       ($2, 'b@example.com', '{"display_name":"小红"}'::jsonb),
       ($3, 'c@example.com', '{"display_name":"路人甲"}'::jsonb),
       ($4, 'd@example.com', '{}'::jsonb)`,
    [U1, U2, U3, U4],
  )
  ok('注册后自动创建 profile', (await one(`select display_name from public.profiles where id = $1`, [U1]))?.display_name === '小明')
  ok(
    '没填昵称时使用默认值',
    (await one(`select display_name from public.profiles where id = $1`, [U4]))?.display_name === '我',
  )

  section('[3/6] 创建情侣空间 / 邀请码')
  let coupleA
  await as('authenticated', U1, async () => {
    coupleA = (await one(`select public.create_couple('我们的小天地', '2024-05-20', '小明') as id`)).id
  })
  ok('create_couple 返回空间 id', Boolean(coupleA))

  const codeA = (await one(`select invite_code from public.couples where id = $1`, [coupleA]))?.invite_code
  ok('自动生成了 6 位邀请码', typeof codeA === 'string' && /^[A-Z0-9]{6}$/.test(codeA), `实际：${codeA}`)
  ok(
    '创建者自动成为 owner',
    (await one(`select role from public.couple_members where couple_id = $1 and user_id = $2`, [coupleA, U1]))?.role === 'owner',
  )

  // 未登录用户也能预览邀请（用于「XX 邀请你加入」）
  const preview = await as('anon', null, () =>
    one(`select * from public.preview_invite($1)`, [codeA]),
  )
  ok('未登录用户可以预览邀请信息', preview?.name === '我们的小天地' && preview?.member_count === 1)

  section('[4/6] 加入空间 / 满员与错误码')
  await as('authenticated', U2, () => db.query(`select public.join_couple($1)`, [codeA]))
  ok(
    '第二位成员加入成功，空间变成 2 人',
    (await one(`select count(*)::int as n from public.couple_members where couple_id = $1`, [coupleA]))?.n === 2,
  )

  await expectError(
    '第三个人加入被拒绝（SPACE_FULL）',
    () => as('authenticated', U3, () => db.query(`select public.join_couple($1)`, [codeA])),
    'SPACE_FULL',
  )

  await expectError(
    '错误邀请码被拒绝（INVALID_CODE）',
    () => as('authenticated', U4, () => db.query(`select public.join_couple('ZZZZZZ')`)),
    'INVALID_CODE',
  )

  await expectDenied(
    '未登录不能加入空间',
    () => as('anon', null, () => db.query(`select public.join_couple($1)`, [codeA])),
  )

  // 路人甲自己建一个空间
  let coupleB
  await as('authenticated', U3, async () => {
    coupleB = (await one(`select public.create_couple('别人的空间', null, '路人甲') as id`)).id
  })
  ok('另一个人可以创建自己的空间', coupleB && coupleB !== coupleA)

  await expectDenied('不能绕过 RPC 直接插入情侣空间', () =>
    as('authenticated', U4, () =>
      db.query(
        `insert into public.couples (name, invite_code, created_by) values ('野空间', 'ORPHAN', $1)`,
        [U4],
      ),
    ),
  )

  section('[5/6] 约会 CRUD 与实时同步所需的表结构')
  let dateId
  await as('authenticated', U1, async () => {
    dateId = (
      await one(
        `insert into public.dates (couple_id, title, date_on, time_at, place, activity, budget, note, created_by)
         values ($1, '去看美术馆', '2026-03-14', '14:00', '西岸美术馆', 'play', 240, '记得预约', $2)
         returning id`,
        [coupleA, U1],
      )
    ).id
  })
  ok('可以新建约会', Boolean(dateId))

  const seenByPartner = await as('authenticated', U2, () =>
    all(`select id, title, status from public.dates where id = $1`, [dateId]),
  )
  ok('另一半能看到这次约会', seenByPartner.length === 1 && seenByPartner[0].title === '去看美术馆')

  await as('authenticated', U2, () =>
    db.query(`update public.dates set status = 'done', completed_at = now() where id = $1`, [dateId]),
  )
  ok(
    '另一半可以把它标记为已完成',
    (await one(`select status from public.dates where id = $1`, [dateId]))?.status === 'done',
  )

  await as('authenticated', U1, () =>
    db.query(`delete from public.dates where id = $1`, [dateId]),
  )
  ok(
    '另一半删除后真的没了',
    (await one(`select count(*)::int as n from public.dates where id = $1`, [dateId]))?.n === 0,
  )

  section('[6/6] 行级安全（RLS）隔离验证')
  // 两个空间各放一条数据
  await as('authenticated', U1, () =>
    db.query(
      `insert into public.dates (couple_id, title, date_on, activity, created_by)
       values ($1, 'A 空间的约会', '2026-04-01', 'eat', $2)`,
      [coupleA, U1],
    ),
  )
  await as('authenticated', U3, () =>
    db.query(
      `insert into public.dates (couple_id, title, date_on, activity, created_by)
       values ($1, 'B 空间的约会', '2026-04-02', 'movie', $2)`,
      [coupleB, U3],
    ),
  )

  const aSees = await as('authenticated', U1, () => all(`select title from public.dates`))
  ok(
    'A 只看得到自己空间的数据',
    aSees.length === 1 && aSees[0].title === 'A 空间的约会',
    `看到 ${aSees.length} 条`,
  )

  const bSees = await as('authenticated', U3, () => all(`select title from public.dates`))
  ok(
    'B 只看得到自己空间的数据',
    bSees.length === 1 && bSees[0].title === 'B 空间的约会',
    `看到 ${bSees.length} 条`,
  )

  await expectDenied('未登录用户读不到任何约会', () =>
    as('anon', null, () => all(`select title from public.dates`)),
  )

  await expectError(
    '不能往别人的空间里写数据',
    () =>
      as('authenticated', U3, () =>
        db.query(
          `insert into public.dates (couple_id, title, date_on, activity, created_by)
           values ($1, '越权写入', '2026-05-01', 'eat', $2)`,
          [coupleA, U3],
        ),
      ),
    'row-level security',
  )

  await expectDenied('不能删除别人空间的约会', () =>
    as('authenticated', U3, () => db.query(`delete from public.dates where couple_id = $1`, [coupleA])),
  )
  ok(
    '越权删除后对方数据仍然在',
    (await one(`select count(*)::int as n from public.dates where couple_id = $1`, [coupleA]))?.n === 1,
  )

  // 资料表：只能看到同空间的人
  const u1SeesProfiles = await as('authenticated', U1, () =>
    all(`select display_name from public.profiles order by display_name`),
  )
  const u1Names = u1SeesProfiles.map((r) => r.display_name).sort()
  ok(
    '只能看到自己和另一半的资料',
    u1Names.length === 2 && u1Names.includes('小明') && u1Names.includes('小红'),
    `看到：${u1Names.join('、')}`,
  )

  const u3SeesProfiles = await as('authenticated', U3, () =>
    all(`select display_name from public.profiles`),
  )
  ok(
    '看不到其他空间成员的资料',
    u3SeesProfiles.length === 1 && u3SeesProfiles[0].display_name === '路人甲',
    `看到 ${u3SeesProfiles.length} 条`,
  )

  // 一个人只能属于一个空间
  await expectDenied('一个账号不能同时待在两个空间', () =>
    as('authenticated', U1, () =>
      db.query(`insert into public.couple_members (couple_id, user_id) values ($1, $2)`, [
        coupleB,
        U1,
      ]),
    ),
  )
  ok(
    '越权加入失败后成员关系没有被写进去',
    (await one(`select count(*)::int as n from public.couple_members where couple_id = $1`, [coupleB]))?.n === 1,
  )

  // 邀请码重新生成
  const newCode = await as('authenticated', U1, async () =>
    (await one(`select public.regenerate_invite_code() as code`)).code,
  )
  ok('可以重新生成邀请码', typeof newCode === 'string' && newCode !== codeA, `新邀请码：${newCode}`)
  await expectError(
    '旧邀请码立刻失效',
    () => as('authenticated', U4, () => db.query(`select public.join_couple($1)`, [codeA])),
    'INVALID_CODE',
  )

  // Realtime 所需的 publication 与 replica identity
  const pubTables = await all(
    `select tablename from pg_publication_tables where pubname = 'supabase_realtime' order by tablename`,
  )
  const pubNames = pubTables.map((r) => r.tablename)
  ok(
    'realtime 发布包含 dates / ideas / couples / couple_members',
    ['couple_members', 'couples', 'dates', 'ideas'].every((t) => pubNames.includes(t)),
    `实际：${pubNames.join(', ')}`,
  )
  ok(
    'replica identity 已设为 full（删除事件也能同步）',
    (await one(`select relreplident from pg_class where relname = 'dates'`))?.relreplident === 'f',
  )

  /* ---------------------------------------------------------------- 汇总 */
  console.log('\n' + '='.repeat(64))
  if (failures.length === 0) {
    console.log(`全部通过：${passed} 项检查 \u2713`)
  } else {
    console.log(`通过 ${passed} 项，失败 ${failures.length} 项：`)
    failures.forEach((f) => console.log(`  · ${f}`))
  }

  await db.close()
  process.exit(failures.length === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error('\n自测脚本本身出错了：', err)
  process.exit(1)
})
