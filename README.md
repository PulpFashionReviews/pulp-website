# PULP website MVP

A responsive Next.js website for PULP, using the existing Supabase `fashion_brands` table. The interface includes a homepage, designer directory search/category filter, brand detail modal, email-link sign-in, category ratings, review submission, and public display of approved reviews.

## What is included
- `app/page.tsx` — website and interactions
- `app/globals.css` — responsive editorial styling
- `lib/supabase.ts` — Supabase client
- `supabase/setup.sql` — reviews table and row-level security policies
- `.env.example` — names of the two browser-safe Supabase environment variables

## Before deploying
1. In Supabase, open **SQL Editor** and run `supabase/setup.sql`.
2. In Supabase **Project Settings → API** (or **Connect**), copy the Project URL and the publishable/anon key. Never use the `service_role` key in the website.
3. Copy `.env.example` to `.env.local` and fill in the two values.
4. Install Node.js if needed, then run:
   ```bash
   npm install
   npm run dev
   ```
5. Push this folder to a GitHub repository and import that repository into Vercel. Add the same two environment variables in Vercel's project settings, then deploy.

## Review moderation
New reviews are inserted with `status = 'pending'`; public visitors only see approved reviews. For the initial MVP, manually moderate in Supabase: **Table Editor → reviews**, change a suitable row's `status` to `approved` or `rejected`. Do not give public users permission to change status.

## Notes / current MVP limitations
- Photo fields currently accept image URLs, not direct file uploads. Direct uploads can be added later with Supabase Storage.
- The initial homepage art is CSS illustration, not a copy of the exact original reference image. It uses the approved charcoal/burgundy editorial direction and can be refined against the reference screenshot.
- This MVP does not yet include an admin moderation dashboard, password-based accounts, user profile pages, pagination, or abuse-reporting tools.
- Vercel Hobby is generally intended for personal/non-commercial use. Review the current Vercel plan terms before using the free tier for a commercial launch.
