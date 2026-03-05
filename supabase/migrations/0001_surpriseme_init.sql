create extension if not exists pgcrypto;

create table if not exists public.surpriseme_users (
  id uuid primary key,
  email text not null unique,
  display_name text not null,
  gender_identity text,
  sexual_orientation text,
  age_range text,
  country text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.surpriseme_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.surpriseme_users(id) on delete cascade,
  bio text,
  height_range text,
  body_type text,
  fitness_level text,
  hair_colour text,
  eye_colour text,
  ethnicity text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.surpriseme_profile_images (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.surpriseme_profiles(id) on delete cascade,
  image_url text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.surpriseme_predictions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.surpriseme_profiles(id) on delete cascade,
  predicted_attractiveness text,
  predicted_confidence text,
  predicted_body_type text,
  created_at timestamptz not null default now()
);

create table if not exists public.surpriseme_questionnaires (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.surpriseme_profiles(id) on delete cascade,
  contributor_id uuid not null,
  attractiveness_rating text not null,
  body_type_perception text not null,
  confidence_perception text not null,
  approachability text not null,
  comment text,
  created_at timestamptz not null default now(),
  unique(profile_id, contributor_id)
);

create index if not exists idx_surpriseme_profiles_user on public.surpriseme_profiles(user_id);
create index if not exists idx_surpriseme_profiles_public on public.surpriseme_profiles(is_public);
create index if not exists idx_surpriseme_images_profile on public.surpriseme_profile_images(profile_id);
create index if not exists idx_surpriseme_predictions_profile on public.surpriseme_predictions(profile_id);
create index if not exists idx_surpriseme_questionnaires_profile on public.surpriseme_questionnaires(profile_id);
create index if not exists idx_surpriseme_questionnaires_contributor on public.surpriseme_questionnaires(contributor_id);

alter table public.surpriseme_users enable row level security;
alter table public.surpriseme_profiles enable row level security;
alter table public.surpriseme_profile_images enable row level security;
alter table public.surpriseme_predictions enable row level security;
alter table public.surpriseme_questionnaires enable row level security;

create policy "users_select_own" on public.surpriseme_users
for select using (id = auth.uid());

create policy "users_update_own" on public.surpriseme_users
for update using (id = auth.uid()) with check (id = auth.uid());

create policy "users_insert_own" on public.surpriseme_users
for insert with check (id = auth.uid());

create policy "profiles_read_public_or_owner" on public.surpriseme_profiles
for select using (is_public = true or user_id = auth.uid());

create policy "profiles_insert_owner" on public.surpriseme_profiles
for insert with check (user_id = auth.uid());

create policy "profiles_update_owner" on public.surpriseme_profiles
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "profiles_delete_owner" on public.surpriseme_profiles
for delete using (user_id = auth.uid());

create policy "images_public_read" on public.surpriseme_profile_images
for select using (
  exists (
    select 1
    from public.surpriseme_profiles p
    where p.id = surpriseme_profile_images.profile_id
      and (p.is_public = true or p.user_id = auth.uid())
  )
);

create policy "images_manage_owner" on public.surpriseme_profile_images
for all using (
  exists (
    select 1
    from public.surpriseme_profiles p
    where p.id = surpriseme_profile_images.profile_id
      and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.surpriseme_profiles p
    where p.id = surpriseme_profile_images.profile_id
      and p.user_id = auth.uid()
  )
);

create policy "predictions_read_owner" on public.surpriseme_predictions
for select using (
  exists (
    select 1
    from public.surpriseme_profiles p
    where p.id = surpriseme_predictions.profile_id
      and p.user_id = auth.uid()
  )
);

create policy "predictions_manage_owner" on public.surpriseme_predictions
for all using (
  exists (
    select 1
    from public.surpriseme_profiles p
    where p.id = surpriseme_predictions.profile_id
      and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.surpriseme_profiles p
    where p.id = surpriseme_predictions.profile_id
      and p.user_id = auth.uid()
  )
);

create policy "questionnaires_insert_authenticated" on public.surpriseme_questionnaires
for insert with check (
  auth.uid() is not null
  and contributor_id = auth.uid()
  and exists (
    select 1
    from public.surpriseme_profiles p
    where p.id = surpriseme_questionnaires.profile_id
      and p.user_id <> auth.uid()
      and p.is_public = true
  )
);

create policy "questionnaires_read_own_submission" on public.surpriseme_questionnaires
for select using (contributor_id = auth.uid());

create or replace function public.surpriseme_get_profile_results(p_profile_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_payload jsonb;
begin
  select user_id into v_owner
  from public.surpriseme_profiles
  where id = p_profile_id;

  if v_owner is null then
    raise exception 'Profile not found';
  end if;

  if auth.uid() is distinct from v_owner then
    raise exception 'Not authorized';
  end if;

  with base as (
    select *
    from public.surpriseme_questionnaires
    where profile_id = p_profile_id
  ),
  agg as (
    select
      jsonb_object_agg(attractiveness_rating, cnt) filter (where attractiveness_rating is not null) as attractiveness,
      jsonb_object_agg(body_type_perception, cnt2) filter (where body_type_perception is not null) as body_types,
      jsonb_object_agg(confidence_perception, cnt3) filter (where confidence_perception is not null) as confidence,
      jsonb_object_agg(approachability, cnt4) filter (where approachability is not null) as approachability
    from (
      select attractiveness_rating, count(*) as cnt, null::text as body_type_perception, null::bigint as cnt2,
             null::text as confidence_perception, null::bigint as cnt3, null::text as approachability, null::bigint as cnt4
      from base group by attractiveness_rating
      union all
      select null, null, body_type_perception, count(*), null, null, null, null
      from base group by body_type_perception
      union all
      select null, null, null, null, confidence_perception, count(*), null, null
      from base group by confidence_perception
      union all
      select null, null, null, null, null, null, approachability, count(*)
      from base group by approachability
    ) x
  ),
  comments as (
    select coalesce(jsonb_agg(comment), '[]'::jsonb) as comments
    from base
    where comment is not null and length(trim(comment)) > 0
  ),
  prediction as (
    select to_jsonb(p) - 'id' - 'profile_id' as prediction
    from public.surpriseme_predictions p
    where p.profile_id = p_profile_id
    order by p.created_at desc
    limit 1
  )
  select jsonb_build_object(
    'profile_id', p_profile_id,
    'aggregates', jsonb_build_object(
      'attractiveness', coalesce(a.attractiveness, '{}'::jsonb),
      'body_type_perception', coalesce(a.body_types, '{}'::jsonb),
      'confidence_perception', coalesce(a.confidence, '{}'::jsonb),
      'approachability', coalesce(a.approachability, '{}'::jsonb)
    ),
    'comments', c.comments,
    'prediction', coalesce(pr.prediction, '{}'::jsonb)
  ) into v_payload
  from agg a
  cross join comments c
  left join prediction pr on true;

  return coalesce(v_payload, jsonb_build_object('profile_id', p_profile_id, 'aggregates', '{}'::jsonb, 'comments', '[]'::jsonb, 'prediction', '{}'::jsonb));
end;
$$;

grant execute on function public.surpriseme_get_profile_results(uuid) to authenticated;
