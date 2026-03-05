create table if not exists public.surpriseme_image_ratings (
  id uuid primary key default gen_random_uuid(),
  image_id uuid not null references public.surpriseme_profile_images(id) on delete cascade,
  profile_id uuid not null references public.surpriseme_profiles(id) on delete cascade,
  contributor_id uuid not null,
  rating int not null check (rating >= 1 and rating <= 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(image_id, contributor_id)
);

create index if not exists idx_surpriseme_image_ratings_image on public.surpriseme_image_ratings(image_id);
create index if not exists idx_surpriseme_image_ratings_profile on public.surpriseme_image_ratings(profile_id);
create index if not exists idx_surpriseme_image_ratings_contributor on public.surpriseme_image_ratings(contributor_id);

alter table public.surpriseme_image_ratings enable row level security;

create policy "image_ratings_read_public_or_owner" on public.surpriseme_image_ratings
for select using (
  exists (
    select 1
    from public.surpriseme_profiles p
    where p.id = surpriseme_image_ratings.profile_id
      and (p.is_public = true or p.user_id = auth.uid())
  )
);

create policy "image_ratings_insert_authenticated" on public.surpriseme_image_ratings
for insert with check (
  auth.uid() is not null
  and contributor_id = auth.uid()
  and exists (
    select 1
    from public.surpriseme_profiles p
    where p.id = surpriseme_image_ratings.profile_id
      and p.user_id <> auth.uid()
      and p.is_public = true
  )
  and exists (
    select 1
    from public.surpriseme_profile_images i
    where i.id = surpriseme_image_ratings.image_id
      and i.profile_id = surpriseme_image_ratings.profile_id
  )
);

create policy "image_ratings_update_own" on public.surpriseme_image_ratings
for update using (contributor_id = auth.uid()) with check (contributor_id = auth.uid());

create policy "image_ratings_delete_own" on public.surpriseme_image_ratings
for delete using (contributor_id = auth.uid());
