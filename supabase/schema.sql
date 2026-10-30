-- Run this once in your Supabase project: SQL Editor → New query → paste → Run.
-- It creates the table that stores each account's profile, collections and settings,
-- and locks it down so people can only ever read or change their own row.

create table if not exists public.user_data (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  profile     jsonb,
  collections jsonb,
  settings    jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.user_data enable row level security;

drop policy if exists "Read own data" on public.user_data;
create policy "Read own data" on public.user_data
  for select using (auth.uid() = user_id);

drop policy if exists "Create own data" on public.user_data;
create policy "Create own data" on public.user_data
  for insert with check (auth.uid() = user_id);

drop policy if exists "Update own data" on public.user_data;
create policy "Update own data" on public.user_data
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Delete own data" on public.user_data;
create policy "Delete own data" on public.user_data
  for delete using (auth.uid() = user_id);

-- Lets a signed-in person delete their own account from Settings.
-- Their user_data row goes with it (on delete cascade).
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
