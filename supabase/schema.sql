-- Execute no SQL Editor do seu projeto Supabase.
create table if not exists public.fichas (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  character jsonb not null check (jsonb_typeof(character) = 'object' and octet_length(character::text) <= 262144),
  revision integer not null default 1,
  updated_at timestamptz not null default now()
);
alter table public.fichas enable row level security;
revoke all on public.fichas from anon;
grant select, insert, update, delete on public.fichas to authenticated;
create policy "Somente minhas fichas" on public.fichas
  for all to authenticated using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
