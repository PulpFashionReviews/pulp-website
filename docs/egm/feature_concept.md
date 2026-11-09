# Feature concept under review: PULP (the whole website and product idea)

Mode: BRAINSTORM

## Concept
PULP is a review website where shoppers outside Pakistan (mainly the US/UK/Canada diaspora and other western shoppers)
rate and review Pakistani fashion designers, with photos of what actually arrived, so others can shop with confidence.

## Success target and constraints
- Success in 12 months: 30+ approved reviews per month.
- The first reviews will come from the owner's friends and family.
- Run by one person with 2-3 hours per week (all moderation is manual today).
- No designer has yet asked for paid features. Designers can claim their page and reply to reviews for free and upload a logo for free.
  A paid tier (cover photo, page stats, labeled "featured/sponsored" placement, possibly ads) is planned only after traffic is high;
  paying must never affect ratings, ranking or which reviews show.

## What exists today (live)
- Next.js 15 site on Vercel, Supabase (Postgres, auth, storage). Code: /home/claude/pulp-website (read-only for you).
  Database schema and rules are in /home/claude/pulp-website/supabase/migrations/.
- Home page: hero with designer search, "How it works", a directory of ~350 designers (filters by 10 categories,
  sort by popularity), review form.
- Designer pages: fair score (each customer counts once, latest review), last-12-months score, repeat-customer grouping,
  detail ratings, photos, "Verified purchase" badge (optional proof of purchase checked by the admin), designer replies.
- Reviews: account holders (email+password) or guests (one-click email link; guests must add at least one photo).
  Every review is approved manually by the admin before it appears. One review per designer per 30 days per person.
- Other: suggest-a-designer form, designer claim flow, contact form, admin moderation screen, terms/privacy/guidelines.
- Known issues: ~146 of ~350 listings are probably not real fashion labels (celebrity names, generic names) and are
  awaiting the owner's manual check; sign-in emails use Supabase's built-in sender (low hourly limit, spam risk);
  the site currently has zero reviews and little traffic.
