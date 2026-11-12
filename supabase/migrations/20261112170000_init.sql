-- SponsorStory initial schema. Mirrors lib/contract.ts (camelCase there, snake_case here).

-- ───────────── Tables ─────────────

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null unique default auth.uid() references auth.users on delete cascade,
  name text not null check (length(trim(name)) > 0),
  logo_path text,
  brand_colors jsonb,
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  title text not null check (length(trim(title)) > 0),
  -- Set once at creation, never updated (published URLs depend on it). Keep in sync with RESERVED_SLUGS.
  slug text not null unique check (
    slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 60
    and slug not in ('login','logout','signup','dashboard','api','auth','_next','public','static','favicon.ico','robots.txt','sitemap.xml')
  ),
  date date,
  description text,
  cover_image_path text,
  logo_path text,
  brand_colors jsonb not null,
  metrics jsonb not null default '[]',
  default_cta jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.events (organization_id);

create table public.sponsors (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events on delete cascade,
  name text not null default '',
  slug text check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 60),
  logo_path text,
  template_key text not null default 'impact-classic',
  draft_content jsonb not null,
  draft_updated_at timestamptz not null default now(),
  published_snapshot jsonb,
  published_at timestamptz,
  published_version int not null default 0,
  created_at timestamptz not null default now(),
  unique (event_id, slug),
  -- ponytail: the snapshot is otherwise trusted to the org's own admin (they can write it via the API);
  -- this guards the one field that becomes a link on a public page. The renderer must never use
  -- dangerouslySetInnerHTML. Move publishing to a service-role path if snapshot content needs full DB-side validation.
  check (
    published_snapshot is null
    or jsonb_typeof(published_snapshot->'cta') is distinct from 'object'
    or published_snapshot->'cta'->>'url' like 'https://%'
  )
);
create index on public.sponsors (event_id);

-- ───────────── Triggers ─────────────

create function public.sponsors_before_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.published_version > 0 and new.slug is distinct from old.slug then
    raise exception 'slug is locked after first publish' using errcode = 'P0001', hint = 'locked';
  end if;
  if (new.name, new.logo_path, new.template_key, new.draft_content)
     is distinct from (old.name, old.logo_path, old.template_key, old.draft_content) then
    new.draft_updated_at := now();
  end if;
  if new.published_version <> old.published_version then
    new.published_at := now();
  end if;
  return new;
end $$;

create trigger sponsors_before_update before update on public.sponsors
  for each row execute function public.sponsors_before_update();

create function public.events_before_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.slug is distinct from old.slug then
    raise exception 'event slug is immutable' using errcode = 'P0001';
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger events_before_update before update on public.events
  for each row execute function public.events_before_update();

-- ───────────── RLS: admins see only their org. Anonymous gets nothing. ─────────────

alter table public.organizations enable row level security;
alter table public.events enable row level security;
alter table public.sponsors enable row level security;

revoke all on public.organizations, public.events, public.sponsors from anon;

create policy "admin owns org" on public.organizations for all to authenticated
  using (admin_user_id = (select auth.uid()))
  with check (admin_user_id = (select auth.uid()));

create policy "admin owns events" on public.events for all to authenticated
  using (organization_id in (select id from public.organizations where admin_user_id = (select auth.uid())))
  with check (organization_id in (select id from public.organizations where admin_user_id = (select auth.uid())));

create policy "admin owns sponsors" on public.sponsors for all to authenticated
  using (event_id in (
    select e.id from public.events e join public.organizations o on o.id = e.organization_id
    where o.admin_user_id = (select auth.uid())))
  with check (event_id in (
    select e.id from public.events e join public.organizations o on o.id = e.organization_id
    where o.admin_user_id = (select auth.uid())));

-- ───────────── Public read: published snapshot only ─────────────

create function public.get_published_report(event_slug text, sponsor_slug text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select s.published_snapshot
  from public.sponsors s join public.events e on e.id = s.event_id
  where e.slug = event_slug and s.slug = sponsor_slug and s.published_version > 0;
$$;

revoke execute on function public.get_published_report(text, text) from public;
grant execute on function public.get_published_report(text, text) to anon, authenticated;

-- ───────────── Storage: public `media` bucket, writes limited to <orgId>/... ─────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 8388608, array['image/jpeg', 'image/png', 'image/webp']);

-- ponytail: public bucket, so draft images are readable by anyone who knows the uuid path.
-- Upgrade to a private bucket + signed URLs if unpublished photos must stay private.
create policy "admin manages own media" on storage.objects for all to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] in (
    select id::text from public.organizations where admin_user_id = (select auth.uid())))
  with check (bucket_id = 'media' and (storage.foldername(name))[1] in (
    select id::text from public.organizations where admin_user_id = (select auth.uid())));
