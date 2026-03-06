alter table public.surpriseme_users
  add column if not exists role text not null default 'user';

alter table public.surpriseme_profile_images
  add column if not exists category text not null default 'Body (torso)',
  add column if not exists approval_status text not null default 'pending',
  add column if not exists approved_by uuid,
  add column if not exists approved_at timestamptz;

create index if not exists idx_surpriseme_profile_images_approval_status
  on public.surpriseme_profile_images(approval_status);

-- Keep existing historical images visible; new uploads are pending.
update public.surpriseme_profile_images
set approval_status = 'approved'
where approval_status = 'pending' and created_at < now() - interval '5 minutes';

alter table public.surpriseme_image_ratings
  alter column contributor_id drop not null;

alter table public.surpriseme_image_ratings
  add column if not exists visitor_token text;

alter table public.surpriseme_image_ratings
  drop constraint if exists surpriseme_image_ratings_image_id_contributor_id_key;

alter table public.surpriseme_image_ratings
  add constraint surpriseme_image_ratings_image_id_contributor_id_key unique (image_id, contributor_id);

alter table public.surpriseme_image_ratings
  drop constraint if exists surpriseme_image_ratings_image_id_visitor_token_key;

alter table public.surpriseme_image_ratings
  add constraint surpriseme_image_ratings_image_id_visitor_token_key unique (image_id, visitor_token);

create index if not exists idx_surpriseme_image_ratings_visitor
  on public.surpriseme_image_ratings(visitor_token);

alter table public.surpriseme_image_ratings
  drop constraint if exists surpriseme_image_ratings_actor_check;

alter table public.surpriseme_image_ratings
  add constraint surpriseme_image_ratings_actor_check check (
    (contributor_id is not null and visitor_token is null)
    or (contributor_id is null and visitor_token is not null)
  );

drop policy if exists "image_ratings_insert_authenticated" on public.surpriseme_image_ratings;

create policy "image_ratings_insert_contributor_or_visitor" on public.surpriseme_image_ratings
for insert with check (
  (
    contributor_id = auth.uid()
    and visitor_token is null
    and auth.uid() is not null
  )
  or (
    contributor_id is null
    and visitor_token is not null
  )
);
