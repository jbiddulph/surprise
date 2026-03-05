# SurpriseMe (Nuxt 3 + Supabase + Prisma)

MVP scaffold based on the SurpriseMe PRD.

## Included

- Nuxt 3 pages for public/authenticated flows
- Supabase auth client wiring (email/password)
- Prisma schema with all `surpriseme_` table names
- SQL migration with RLS policies and aggregate results function
- Server API routes:
  - `/api/profile/create`
  - `/api/profile/update`
  - `/api/profile/images/upload`
  - `/api/questionnaire/submit`
  - `/api/results/get`
- Public helper endpoints:
  - `/api/public/profiles`
  - `/api/public/profile/:id`

## Setup

1. Install dependencies.
2. Copy `.env.example` to `.env` and fill values.
   - Required keys:
   - `DATABASE_URL`
   - `SHADOW_DATABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Generate Prisma client:
   - `npm run prisma:generate`
4. Apply SQL in `supabase/migrations/0001_surpriseme_init.sql` to your Supabase Postgres.
5. Create Supabase Storage bucket:
   - `surpriseme_profiles`
6. Run app:
   - `npm run dev`

## Notes

- API auth expects `Authorization: Bearer <supabase-access-token>`.
- Results endpoint uses `surpriseme_get_profile_results(uuid)` to avoid exposing contributor identity.
- Comment moderation currently uses a basic keyword/phrase filter in `server/utils/moderation.ts`.
