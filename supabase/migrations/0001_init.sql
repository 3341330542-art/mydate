-- ============================================================================
--  情侣约会空间 · 数据库初始化脚本  (v1)
-- ============================================================================
--  用法：
--    1. 打开 Supabase 控制台 → 左侧 SQL Editor → New query
--    2. 把本文件全部内容粘贴进去，点击 Run
--    3. 看到 "Success. No rows returned" 即表示数据库已就绪
--
--  本脚本是幂等的：重复执行不会报错、不会清空已有数据。
--
--  安全模型：
--    * 所有表都开启 RLS（行级安全），默认拒绝一切访问；
--    * 只有登录用户能访问数据，且只能访问「自己所在情侣空间」的数据；
--    * 陌生人即使拿到 anon key，也读不到任何人的约会数据；
--    * 加入情侣空间只能通过服务端 RPC（邀请码），无法绕过人数上限。
-- ============================================================================


-- ============================================================================
--  1. 数据表
-- ============================================================================

-- 1.1 用户资料（与 auth.users 一对一）
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text        not null default '我',
  emoji         text        not null default '🌙',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 1.2 情侣空间
create table if not exists public.couples (
  id            uuid primary key default gen_random_uuid(),
  name          text        not null default '我们的小天地',
  slogan        text        not null default '和喜欢的人，一起去喜欢的地方。',
  invite_code   text        not null unique,
  anniversary   date,                                  -- 在一起的日子，用于计算天数
  created_by    uuid        not null references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 1.3 空间成员（一个空间最多 2 人；一个人最多属于 1 个空间）
create table if not exists public.couple_members (
  couple_id  uuid        not null references public.couples(id) on delete cascade,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  role       text        not null default 'member' check (role in ('owner', 'member')),
  joined_at  timestamptz not null default now(),
  primary key (couple_id, user_id)
);

-- 一个人只能在一个情侣空间里
create unique index if not exists couple_members_one_space_per_user
  on public.couple_members (user_id);

-- 1.4 约会
create table if not exists public.dates (
  id            uuid primary key default gen_random_uuid(),
  couple_id     uuid        not null references public.couples(id) on delete cascade,
  title         text        not null,
  date_on       date        not null,
  time_at       time,                                  -- 可空，代表「还没定几点」
  place         text,
  activity      text        not null default 'other'
                check (activity in ('eat','movie','coffee','walk','play','travel','surprise','other')),
  budget        numeric(10, 2),                        -- 预计花费（元）
  note          text,
  status        text        not null default 'planned' check (status in ('planned', 'done')),
  completed_at  timestamptz,
  created_by    uuid        not null references auth.users(id) on delete cascade,
  updated_by    uuid        references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists dates_couple_date_idx on public.dates (couple_id, date_on);

-- 1.5 灵感清单 / 抽签池（「今天想做什么」+「约会抽签」共用）
create table if not exists public.ideas (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid        not null references public.couples(id) on delete cascade,
  title       text        not null,
  emoji       text        not null default '✨',
  created_by  uuid        not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create index if not exists ideas_couple_idx on public.ideas (couple_id, created_at desc);


-- ============================================================================
--  2. 工具函数（security definer：内部绕过 RLS，避免策略递归）
-- ============================================================================

-- 2.1 当前登录用户所在的情侣空间 id（没有则返回 null）
create or replace function public.current_couple_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select couple_id
  from public.couple_members
  where user_id = auth.uid()
  limit 1;
$$;

-- 2.2 指定用户是否与我处在同一个情侣空间（用于查看另一半的资料）
create or replace function public.shares_space_with(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.couple_members a
    join public.couple_members b on a.couple_id = b.couple_id
    where a.user_id = auth.uid()
      and b.user_id = p_user
  );
$$;

-- 2.3 生成一个不重复的 6 位邀请码（去掉了容易看错的 0/O/1/I）
create or replace function public.gen_invite_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code     text;
  i        int;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.couples where invite_code = code);
  end loop;
  return code;
end;
$$;

-- 2.4 updated_at 自动维护
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- 2.5 注册新用户时自动建 profile
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, emoji)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), '我'),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'emoji'), ''), '🌙')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists couples_touch_updated_at on public.couples;
create trigger couples_touch_updated_at
  before update on public.couples
  for each row execute function public.touch_updated_at();

drop trigger if exists dates_touch_updated_at on public.dates;
create trigger dates_touch_updated_at
  before update on public.dates
  for each row execute function public.touch_updated_at();


-- ============================================================================
--  3. 开启 RLS + 行级安全策略
-- ============================================================================

alter table public.profiles       enable row level security;
alter table public.couples        enable row level security;
alter table public.couple_members enable row level security;
alter table public.dates          enable row level security;
alter table public.ideas          enable row level security;

-- ---------- profiles ----------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.shares_space_with(id));

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------- couples ----------
drop policy if exists couples_select on public.couples;
create policy couples_select on public.couples
  for select to authenticated
  using (id = public.current_couple_id());

-- 刻意不提供 INSERT 策略：新建空间只能走 create_couple() RPC，
-- 那样才能保证「创建者自动成为成员、邀请码唯一」这两件事一定同时发生。
-- 否则任何人都能直接插入一堆没人加入得了的孤儿空间。
drop policy if exists couples_insert on public.couples;

drop policy if exists couples_update on public.couples;
create policy couples_update on public.couples
  for update to authenticated
  using (id = public.current_couple_id())
  with check (id = public.current_couple_id());

-- ---------- couple_members ----------
-- 只能看到同一空间的成员；加入空间必须走 join_couple() RPC
drop policy if exists couple_members_select on public.couple_members;
create policy couple_members_select on public.couple_members
  for select to authenticated
  using (couple_id = public.current_couple_id());

drop policy if exists couple_members_delete_self on public.couple_members;
create policy couple_members_delete_self on public.couple_members
  for delete to authenticated
  using (user_id = auth.uid());

-- ---------- dates ----------
drop policy if exists dates_select on public.dates;
create policy dates_select on public.dates
  for select to authenticated
  using (couple_id = public.current_couple_id());

drop policy if exists dates_insert on public.dates;
create policy dates_insert on public.dates
  for insert to authenticated
  with check (couple_id = public.current_couple_id() and created_by = auth.uid());

drop policy if exists dates_update on public.dates;
create policy dates_update on public.dates
  for update to authenticated
  using (couple_id = public.current_couple_id())
  with check (couple_id = public.current_couple_id());

drop policy if exists dates_delete on public.dates;
create policy dates_delete on public.dates
  for delete to authenticated
  using (couple_id = public.current_couple_id());

-- ---------- ideas ----------
drop policy if exists ideas_select on public.ideas;
create policy ideas_select on public.ideas
  for select to authenticated
  using (couple_id = public.current_couple_id());

drop policy if exists ideas_insert on public.ideas;
create policy ideas_insert on public.ideas
  for insert to authenticated
  with check (couple_id = public.current_couple_id() and created_by = auth.uid());

drop policy if exists ideas_delete on public.ideas;
create policy ideas_delete on public.ideas
  for delete to authenticated
  using (couple_id = public.current_couple_id());


-- ============================================================================
--  4. 业务 RPC（全部 security definer，前端只能通过这些入口操作空间）
-- ============================================================================

-- 4.1 创建情侣空间（创建者自动成为 owner，并自动生成邀请码）
create or replace function public.create_couple(
  p_name          text default null,
  p_anniversary   date default null,
  p_display_name  text default null,
  p_slogan        text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_couple_id uuid;
  v_code      text;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  -- 已经有空间了就直接返回（幂等）
  select couple_id into v_couple_id from public.couple_members where user_id = v_uid limit 1;
  if v_couple_id is not null then
    return v_couple_id;
  end if;

  v_code := public.gen_invite_code();

  insert into public.couples (name, slogan, invite_code, anniversary, created_by)
  values (
    coalesce(nullif(trim(p_name), ''), '我们的小天地'),
    coalesce(nullif(trim(p_slogan), ''), '和喜欢的人，一起去喜欢的地方。'),
    v_code,
    p_anniversary,
    v_uid
  )
  returning id into v_couple_id;

  insert into public.couple_members (couple_id, user_id, role)
  values (v_couple_id, v_uid, 'owner');

  if p_display_name is not null and trim(p_display_name) <> '' then
    update public.profiles
       set display_name = trim(p_display_name)
     where id = v_uid;
  end if;

  return v_couple_id;
end;
$$;

-- 4.2 用邀请码加入情侣空间
create or replace function public.join_couple(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_couple   uuid;
  v_count    int;
  v_existing uuid;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  -- 已经在某个空间里了，直接返回该空间（不报错，避免用户困惑）
  select couple_id into v_existing from public.couple_members where user_id = v_uid limit 1;
  if v_existing is not null then
    return v_existing;
  end if;

  select id into v_couple
    from public.couples
   where invite_code = upper(trim(p_code));

  if v_couple is null then
    raise exception 'INVALID_CODE';
  end if;

  -- 锁住这一行，把「数人数」和「插入成员」变成一个串行操作。
  -- 否则两个人在同一瞬间加入，可能都通过人数检查，空间里就挤进 3 个人了。
  perform 1 from public.couples where id = v_couple for update;

  select count(*) into v_count
    from public.couple_members
   where couple_id = v_couple;

  if v_count >= 2 then
    raise exception 'SPACE_FULL';
  end if;

  insert into public.couple_members (couple_id, user_id, role)
  values (v_couple, v_uid, 'member');

  return v_couple;
end;
$$;

-- 4.3 预览邀请信息（用于「你即将加入 XX 的空间」提示，不泄露其他数据）
create or replace function public.preview_invite(p_code text)
returns table (couple_id uuid, name text, member_count int, has_anniversary boolean)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.name,
    (select count(*)::int from public.couple_members m where m.couple_id = c.id),
    (c.anniversary is not null)
  from public.couples c
  where c.invite_code = upper(trim(p_code));
$$;

-- 4.4 重新生成邀请码
create or replace function public.regenerate_invite_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_couple uuid;
  v_code   text;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select couple_id into v_couple from public.couple_members where user_id = v_uid limit 1;
  if v_couple is null then
    raise exception 'NO_SPACE';
  end if;

  v_code := public.gen_invite_code();
  update public.couples set invite_code = v_code where id = v_couple;
  return v_code;
end;
$$;

-- 4.5 最小权限：只允许登录用户调用这些函数
revoke all on function public.current_couple_id()          from public;
revoke all on function public.shares_space_with(uuid)      from public;
revoke all on function public.gen_invite_code()            from public;
revoke all on function public.create_couple(text, date, text, text) from public;
revoke all on function public.join_couple(text)            from public;
revoke all on function public.preview_invite(text)         from public;
revoke all on function public.regenerate_invite_code()     from public;

-- 触发器函数不需要被任何人直接调用（REVOKE 不影响触发器正常工作）
revoke all on function public.handle_new_user()            from public;
revoke all on function public.touch_updated_at()           from public;

grant execute on function public.current_couple_id()               to authenticated;
grant execute on function public.shares_space_with(uuid)           to authenticated;
grant execute on function public.create_couple(text, date, text, text) to authenticated;
grant execute on function public.join_couple(text)                 to authenticated;
grant execute on function public.preview_invite(text)              to authenticated;
grant execute on function public.regenerate_invite_code()          to authenticated;

-- anon 用户（尚未注册）也需要能预览邀请信息，才能决定要不要加入
grant execute on function public.preview_invite(text) to anon;


-- ============================================================================
--  5. 表权限（RLS 决定「能看哪些行」，GRANT 决定「能不能碰这张表」）
-- ============================================================================
grant usage on schema public to anon, authenticated;

grant select, insert, update         on public.profiles       to authenticated;
grant select, insert, update         on public.couples        to authenticated;
grant select, delete                 on public.couple_members to authenticated;
grant select, insert, update, delete on public.dates          to authenticated;
grant select, insert, delete         on public.ideas          to authenticated;


-- ============================================================================
--  6. 实时同步（Supabase Realtime）：两个人的改动互相立刻可见
-- ============================================================================
alter table public.dates          replica identity full;
alter table public.ideas          replica identity full;
alter table public.couples        replica identity full;
alter table public.couple_members replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.dates;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.ideas;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.couples;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.couple_members;
  exception when duplicate_object then null;
  end;
end;
$$;


-- ============================================================================
--  ✅ 完成。接下来回到项目，把 .env.local 里的两个变量填好即可。
-- ============================================================================
