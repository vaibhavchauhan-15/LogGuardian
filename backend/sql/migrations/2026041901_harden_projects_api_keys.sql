-- 2026041901_harden_projects_api_keys.sql
-- Purpose:
-- 1) Move projects to a hashed API key model.
-- 2) Keep backward-compatible writes by accepting plaintext api_key input,
--    hashing it in a trigger, then scrubbing plaintext before storage.
-- 3) Provide a private, security-definer lookup function for key validation.

create extension if not exists pgcrypto;

create schema if not exists private;

do $$
begin
  execute 'revoke all on schema private from public';
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on schema private from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on schema private from authenticated';
  end if;
end
$$;

alter table public.projects
  add column if not exists api_key_hash text,
  add column if not exists api_key_prefix text,
  add column if not exists api_key_last4 text;

update public.projects
set
  api_key_hash = encode(digest(btrim(api_key), 'sha256'), 'hex'),
  api_key_prefix = left(btrim(api_key), 8),
  api_key_last4 = right(btrim(api_key), 4)
where
  api_key is not null
  and btrim(api_key) <> ''
  and (
    api_key_hash is null
    or api_key_prefix is null
    or api_key_last4 is null
  );

-- Drop plaintext uniqueness and replace with hash uniqueness.
drop index if exists public.idx_projects_api_key_unique;
create unique index if not exists idx_projects_api_key_hash_unique
  on public.projects (api_key_hash);

-- Keep constraints idempotent across reruns.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'projects_api_key_hash_len_check'
      and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      add constraint projects_api_key_hash_len_check
      check (char_length(api_key_hash) = 64);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'projects_api_key_prefix_len_check'
      and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      add constraint projects_api_key_prefix_len_check
      check (char_length(api_key_prefix) between 1 and 8);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'projects_api_key_last4_len_check'
      and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      add constraint projects_api_key_last4_len_check
      check (char_length(api_key_last4) between 1 and 4);
  end if;
end
$$;

alter table public.projects
  alter column api_key_hash set not null,
  alter column api_key_prefix set not null,
  alter column api_key_last4 set not null,
  alter column api_key drop not null;

create or replace function private.projects_hash_api_key_before_write()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  cleaned_key text;
begin
  if new.api_key is not null then
    cleaned_key := btrim(new.api_key);

    if cleaned_key = '' then
      raise exception 'api_key cannot be blank';
    end if;

    new.api_key_hash := encode(digest(cleaned_key, 'sha256'), 'hex');
    new.api_key_prefix := left(cleaned_key, 8);
    new.api_key_last4 := right(cleaned_key, 4);

    -- Scrub plaintext before storage.
    new.api_key := null;
  end if;

  if new.api_key_hash is null or char_length(new.api_key_hash) <> 64 then
    raise exception 'api_key_hash must be a 64-char sha256 hex digest';
  end if;

  if new.api_key_prefix is null then
    new.api_key_prefix := left(new.api_key_hash, 8);
  end if;

  if new.api_key_last4 is null then
    new.api_key_last4 := right(new.api_key_hash, 4);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_projects_hash_api_key_before_write on public.projects;
create trigger trg_projects_hash_api_key_before_write
before insert or update of api_key, api_key_hash, api_key_prefix, api_key_last4
on public.projects
for each row
execute function private.projects_hash_api_key_before_write();

-- One-time scrub of existing plaintext values after successful backfill.
update public.projects
set api_key = null
where api_key is not null;

create or replace function private.resolve_project_by_api_key(p_api_key text)
returns table (
  project_id uuid,
  user_id uuid,
  name text,
  api_key_prefix text
)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  key_hash text;
begin
  if p_api_key is null or btrim(p_api_key) = '' then
    return;
  end if;

  key_hash := encode(digest(btrim(p_api_key), 'sha256'), 'hex');

  return query
  select p.id, p.user_id, p.name, p.api_key_prefix
  from public.projects p
  where p.api_key_hash = key_hash
  limit 1;
end;
$$;

do $$
begin
  execute 'revoke all on function private.resolve_project_by_api_key(text) from public';

  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on function private.resolve_project_by_api_key(text) from anon';
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on function private.resolve_project_by_api_key(text) from authenticated';
  end if;

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function private.resolve_project_by_api_key(text) to service_role';
  end if;
end
$$;
