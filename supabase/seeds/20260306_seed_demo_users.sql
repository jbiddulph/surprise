-- Seed 100 demo accounts:
-- - 60 female
-- - 40 male
-- Password for all users: testing123456
--
-- Safe to run multiple times (idempotent by email/user_id).

create extension if not exists pgcrypto;

do $$
declare
  rec record;
  v_user_id uuid;
  v_profile_id uuid;

  female_first_names text[] := array[
    'Ava','Mia','Chloe','Nina','Layla','Ruby','Ella','Lily','Hannah','Sophie',
    'Grace','Amelia','Ivy','Zoe','Scarlett','Isla','Phoebe','Aria','Freya','Jade'
  ];
  male_first_names text[] := array[
    'Liam','Noah','Ethan','Omar','Lucas','Mason','Logan','Henry','Jacob','Leo',
    'Adam','Ryan','Daniel','Sam','Aaron','Max','Oliver','Theo','Aiden','Callum'
  ];
  last_names text[] := array[
    'Hart','Vale','Wynn','Sol','Noor','Skye','Cross','Reed','Cole','Hale',
    'Quinn','Frost','Parker','Khan','Blake','Rowe','Stone','Hayes','Price','Lane'
  ];
  female_orientations text[] := array['Straight','Bisexual','Pansexual'];
  male_orientations text[] := array['Straight','Bisexual'];
  age_ranges text[] := array['18-24','25-34','35-44'];
  countries text[] := array[
    'United Kingdom','United States','Canada','Australia','Spain',
    'France','Germany','Italy','Netherlands','Sweden'
  ];
  female_heights text[] := array['4''11" - 5''1"','5''1" - 5''3"','5''4" - 5''6"','5''7" - 5''9"'];
  male_heights text[] := array['5''7" - 5''9"','5''10" - 6''0"','6''1" - 6''3"'];
  female_body_types text[] := array['Slim','Athletic','Average','Curvy','Petite','Tall'];
  male_body_types text[] := array['Slim','Athletic','Average','Muscular','Tall'];
  fitness_levels text[] := array['Sedentary','Moderately active','Active','Very fit'];
  hair_colours text[] := array['Black','Brown','Blonde','Red'];
  eye_colours text[] := array['Brown','Hazel','Blue','Green'];
  ethnicities text[] := array['White','Black','Asian','Latina','Middle Eastern','Mixed','Arab'];
begin
  for rec in
    (
      select
        female_first_names[((gs - 1) % array_length(female_first_names, 1)) + 1]
        || ' ' ||
        last_names[((gs * 3 - 1) % array_length(last_names, 1)) + 1] as display_name,
        format('demo.female.%s@surpriseme.test', lpad(gs::text, 3, '0')) as email,
        'Female'::text as gender_identity,
        female_orientations[((gs - 1) % array_length(female_orientations, 1)) + 1] as sexual_orientation,
        age_ranges[((gs - 1) % array_length(age_ranges, 1)) + 1] as age_range,
        countries[((gs - 1) % array_length(countries, 1)) + 1] as country,
        female_heights[((gs - 1) % array_length(female_heights, 1)) + 1] as height_range,
        female_body_types[((gs - 1) % array_length(female_body_types, 1)) + 1] as body_type,
        fitness_levels[((gs - 1) % array_length(fitness_levels, 1)) + 1] as fitness_level,
        hair_colours[((gs - 1) % array_length(hair_colours, 1)) + 1] as hair_colour,
        eye_colours[((gs - 1) % array_length(eye_colours, 1)) + 1] as eye_colour,
        ethnicities[((gs - 1) % array_length(ethnicities, 1)) + 1] as ethnicity,
        format(
          'Confident and friendly profile #%s with upbeat energy and positive style.',
          gs
        ) as bio
      from generate_series(1, 60) gs

      union all

      select
        male_first_names[((gs - 1) % array_length(male_first_names, 1)) + 1]
        || ' ' ||
        last_names[((gs * 5 - 1) % array_length(last_names, 1)) + 1] as display_name,
        format('demo.male.%s@surpriseme.test', lpad(gs::text, 3, '0')) as email,
        'Male'::text as gender_identity,
        male_orientations[((gs - 1) % array_length(male_orientations, 1)) + 1] as sexual_orientation,
        age_ranges[((gs - 1) % array_length(age_ranges, 1)) + 1] as age_range,
        countries[((gs + 2) % array_length(countries, 1)) + 1] as country,
        male_heights[((gs - 1) % array_length(male_heights, 1)) + 1] as height_range,
        male_body_types[((gs - 1) % array_length(male_body_types, 1)) + 1] as body_type,
        fitness_levels[((gs - 1) % array_length(fitness_levels, 1)) + 1] as fitness_level,
        hair_colours[((gs + 1) % array_length(hair_colours, 1)) + 1] as hair_colour,
        eye_colours[((gs + 1) % array_length(eye_colours, 1)) + 1] as eye_colour,
        ethnicities[((gs + 1) % array_length(ethnicities, 1)) + 1] as ethnicity,
        format(
          'Approachable and confident profile #%s with clean, positive presentation.',
          gs
        ) as bio
      from generate_series(1, 40) gs
    )
  loop
    select u.id into v_user_id
    from auth.users u
    where lower(u.email) = lower(rec.email)
    limit 1;

    if v_user_id is null then
      v_user_id := gen_random_uuid();

      insert into auth.users (
        id,
        instance_id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change
      )
      values (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        rec.email,
        crypt('testing123456', gen_salt('bf')),
        now(),
        jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
        jsonb_build_object('display_name', rec.display_name),
        now(),
        now(),
        '',
        '',
        '',
        ''
      );
    else
      update auth.users
      set
        encrypted_password = crypt('testing123456', gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        raw_app_meta_data = jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
        raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('display_name', rec.display_name),
        updated_at = now()
      where id = v_user_id;
    end if;

    insert into auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    values (
      gen_random_uuid()::text,
      v_user_id,
      v_user_id::text,
      jsonb_build_object('sub', v_user_id::text, 'email', rec.email),
      'email',
      now(),
      now(),
      now()
    )
    on conflict (provider, provider_id) do update
    set
      identity_data = excluded.identity_data,
      last_sign_in_at = excluded.last_sign_in_at,
      updated_at = now();

    insert into public.surpriseme_users (
      id,
      email,
      display_name,
      gender_identity,
      sexual_orientation,
      age_range,
      country
    )
    values (
      v_user_id,
      rec.email,
      rec.display_name,
      rec.gender_identity,
      rec.sexual_orientation,
      rec.age_range,
      rec.country
    )
    on conflict (id) do update
    set
      email = excluded.email,
      display_name = excluded.display_name,
      gender_identity = excluded.gender_identity,
      sexual_orientation = excluded.sexual_orientation,
      age_range = excluded.age_range,
      country = excluded.country,
      updated_at = now();

    select p.id into v_profile_id
    from public.surpriseme_profiles p
    where p.user_id = v_user_id
    order by p.created_at asc
    limit 1;

    if v_profile_id is null then
      insert into public.surpriseme_profiles (
        user_id,
        bio,
        height_range,
        body_type,
        fitness_level,
        hair_colour,
        eye_colour,
        ethnicity,
        is_public
      )
      values (
        v_user_id,
        rec.bio,
        rec.height_range,
        rec.body_type,
        rec.fitness_level,
        rec.hair_colour,
        rec.eye_colour,
        rec.ethnicity,
        true
      );
    else
      update public.surpriseme_profiles
      set
        bio = rec.bio,
        height_range = rec.height_range,
        body_type = rec.body_type,
        fitness_level = rec.fitness_level,
        hair_colour = rec.hair_colour,
        eye_colour = rec.eye_colour,
        ethnicity = rec.ethnicity,
        is_public = true,
        updated_at = now()
      where id = v_profile_id;
    end if;
  end loop;
end $$;
