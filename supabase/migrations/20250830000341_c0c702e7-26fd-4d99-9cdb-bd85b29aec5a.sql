-- Secure, public-friendly RLS for results + batchrun
-- Keeps public read for site widgets, restricts writes to service_role.
-- Temporary public read on batchrun to support current debug UI.

begin;

-- =========================
-- RESULTS
-- =========================
alter table if exists public.results enable row level security;

-- Drop overly restrictive policy if Lovable already created it
do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename  = 'results'
      and policyname = 'Service role only access to results'
  ) then
    execute 'drop policy "Service role only access to results" on public.results';
  end if;
end$$;

-- Public read (anon + authenticated)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='results'
      and policyname='Anon read access to results'
  ) then
    execute 'create policy "Anon read access to results"
             on public.results
             for select
             using (true)';
  end if;
end$$;

-- Service role INSERT/UPDATE/DELETE only
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='results'
      and policyname='Service role insert access to results'
  ) then
    execute 'create policy "Service role insert access to results"
             on public.results
             for insert
             with check (auth.role() = ''service_role'')';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='results'
      and policyname='Service role update access to results'
  ) then
    execute 'create policy "Service role update access to results"
             on public.results
             for update
             using (auth.role() = ''service_role'')
             with check (auth.role() = ''service_role'')';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='results'
      and policyname='Service role delete access to results'
  ) then
    execute 'create policy "Service role delete access to results"
             on public.results
             for delete
             using (auth.role() = ''service_role'')';
  end if;
end$$;

-- Optional explicit grants (RLS still governs row access)
grant select on table public.results to anon, authenticated;
grant insert, update, delete on table public.results to service_role;

-- =========================
-- BATCHRUN
-- =========================
alter table if exists public.batchrun enable row level security;

-- Drop Lovable's restrictive policy if present
do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename  = 'batchrun'
      and policyname = 'Service role only access to batchrun'
  ) then
    execute 'drop policy "Service role only access to batchrun" on public.batchrun';
  end if;
end$$;

-- TEMP: Public read to support current debug UI on the public page.
-- Replace later with a locked-down view or RPC when you move logs behind admin.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='batchrun'
      and policyname='Anon read access to batchrun (temporary)'
  ) then
    execute 'create policy "Anon read access to batchrun (temporary)"
             on public.batchrun
             for select
             using (true)';
  end if;
end$$;

-- Service role writes only
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='batchrun'
      and policyname='Service role insert access to batchrun'
  ) then
    execute 'create policy "Service role insert access to batchrun"
             on public.batchrun
             for insert
             with check (auth.role() = ''service_role'')';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='batchrun'
      and policyname='Service role update access to batchrun'
  ) then
    execute 'create policy "Service role update access to batchrun"
             on public.batchrun
             for update
             using (auth.role() = ''service_role'')
             with check (auth.role() = ''service_role'')';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='batchrun'
      and policyname='Service role delete access to batchrun'
  ) then
    execute 'create policy "Service role delete access to batchrun"
             on public.batchrun
             for delete
             using (auth.role() = ''service_role'')';
  end if;
end$$;

grant select on table public.batchrun to anon, authenticated;
grant insert, update, delete on table public.batchrun to service_role;

commit;