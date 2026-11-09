# PULP: the overall website and product concept

* **Author:** PulpFashionReviews
* **Date:** 2026-11-07
* **Process:** Elephant-Goldfish Model, brainstorm stage. Seven fresh reviewers read the concept and the live code without seeing the design conversation.

## Overview

PULP is a review website. Shoppers outside Pakistan, mainly in the US, UK and Canada, rate and review Pakistani fashion designers. They add photos of what actually arrived, so other shoppers can buy with confidence. Designers can claim their page for free, reply to reviews and add their logo. A paid designer tier is planned only after the site has real traffic.

Success in 12 months means 30+ approved reviews a month. The first reviews will come from friends and family. One person runs the site with 2–3 hours a week, and every review is approved by hand.

Today the site is live and well built, but it has zero reviews and little traffic.

## Analysis

All seven reviewers reached the same conclusion: **getting reviews in is the problem, not building features.** The site already has more designer-facing features than its traffic justifies. The things that will decide whether it reaches 30 reviews a month are listed below, most urgent first.

### 1. Sign-ups and guest reviews do not work for anyone outside the owner's account (Blocker, confirmed)

Supabase's built-in email sender only delivers to email addresses on the project's own team, and only 2 emails an hour. Anyone else trying to sign up or post as a guest gets "Email address not authorized" and never receives a link. Friends and family would hit this on their first try.

* Connect a proper email provider (for example Resend) on PULP's own domain before inviting anyone. Test it with an outside Gmail and Outlook address.
* Raise Supabase's hourly email limit after connecting it.
* Reviewer suggestion: save a guest's review, including photos, on the server *before* sending the link, so the email link only confirms it. Today the draft is saved only in the browser and leaves out photos. A guest who opens the email on their phone lands on an empty form.

### 2. The first 100 reviews need a deliberate plan (Blocker for the 12-month target)

Friends and family can supply perhaps 10–20 reviews. After that the site needs an outside source. Diaspora shoppers already share "what arrived" photos in Facebook groups, Reddit, Instagram comments and WhatsApp. PULP is competing with those, not filling an empty gap.

* **Focus.** Pick the 30–50 designers the diaspora actually buys from and fill those pages first, rather than spreading 360 reviews a year across 350 pages.
* **Ask, don't wait.** Give each friend or family member a personal link with the designer already filled in. After each approved review, prompt the reviewer to "review another designer you've bought from".
* **Go where the conversations are.** Post direct links to designer review pages in the groups where shoppers already swap photos. Invite people who post good photos to put them on PULP.
* **Integrity of early reviews.** Friends and family must review genuine orders only, never a designer they have a personal or business tie to, and should add proof so the review earns "Verified purchase". If several friends review the same designer in the same week, it can look coordinated. US rules on fake and insider reviews (FTC, 2024) make undisclosed ties a legal risk too.

### 3. The directory hurts trust as it stands (Major)

About 146 of ~350 listings are probably not real labels. Visitors also see hundreds of "Be the first to review" cards. Together these make the site look empty or auto-generated.

* Add a listing status: **Confirmed** (shown in the directory) and **Unconfirmed** (hidden from browsing, still reachable by search and the review form).
* Let evidence confirm listings automatically: a first approved review with photos, an approved designer claim, or a working website. This replaces the slow 146-listing manual check.
* **Never delete listings.** Deleting a designer today silently deletes its reviews, claims, managers and replies, because of how the tables are linked. Hide listings instead, and replace the one-off merge scripts with one admin action that moves everything linked to a designer.
* Until there are enough reviews, show reviewed designers first.

### 4. Search engines can barely see the site (Major)

People will mostly arrive by searching "[designer] reviews". The home page and directory are built in the visitor's browser, so search engines see an almost empty page. There is no sitemap.

* Build the directory on the server.
* Add a sitemap and a robots file.
* Mark designer pages with no reviews as "do not index" until their first review is approved.
* Store a permanent web address (slug) for each designer, with redirects when a name changes. Today the address is worked out from the name, so a rename or merge breaks shared links.

### 5. Moderation must fit 2–3 hours a week (Major)

Today the owner approves every review and also handles proof checks, claims, replies, logos, suggestions and contact messages, all by hand.

* Set a budget, for example "under 2 minutes per review, approved within 72 hours".
* **Close the loop with reviewers.** Promise a turnaround time, email them when a review is approved or rejected, and give a short reason when it's rejected. Today they hear nothing, and a friend left waiting a week stops recommending the site.
* Make proof checks only for reviews that look suspicious, not a step on every review.
* Later, once volume grows: auto-publish reviews from people with 2+ approved reviews, with a "Report this review" link and the ability to unpublish.
* Run the 30-day proof-of-purchase deletion on a schedule. Today it only runs when the admin screen is opened, so the privacy promise depends on memory.
* Add a captcha and a rate limit to the contact form. Its spam protection is currently switched off.

### 6. Nothing measures the goal or reports failures (Major)

* Track the review funnel: form viewed, started, guest link requested, link confirmed, submitted, submit failed (with a reason), approved. Use privacy-friendly analytics without cookies, for example Vercel Web Analytics, and update the privacy page.
* Count "approved reviews per month" from the review timestamps already stored in the database, and treat that as the official success number.
* Failed data loads currently look like "no designers" or "page not found". Show a real error instead, and log it.
* Supabase's free plan pauses a project after about a week of inactivity. Add an uptime check, or plan to move to the paid plan (about $25/month) once real users arrive.

### 7. Photos and scores (Major / Nit)

* **Photos can break on quiet pages.** Designer pages are cached, but the photo links inside them expire after 2 hours. On a quiet site, the first visitor after that sees broken images. Make approved photos public, or create the links in the visitor's browser.
* **Shrink photos before upload.** Photos are up to 5 MB each and shown at full size, which uses up the free-plan download allowance.
* **Scores with 1–2 reviews look more precise than they are.** Below about 3 reviewers, show "Early reviews (n)" instead of a headline score. Add a short "How is this calculated?" note next to each score.

### 8. Rules that confuse reviewers (Major)

* Guests must add a photo, but account holders don't. Consider one rule for everyone: photos encouraged, with a "With photos" label.
* Check the "once per designer every 30 days" limit as soon as the designer is chosen, not after the whole form is filled in.
* Warn people that editing an approved review sends it back for approval.
* Replace raw database error text with plain messages.

### 9. Engineering groundwork (Major, invisible to visitors)

* **Database history.** The database can't be rebuilt from the code: the main designers table was imported by hand, and migration files share date-only names. Take a snapshot as a starting point, use full timestamps, and test changes on a copy first.
* **Review rules.** The rules check on reviews has been completely rewritten four times. Split it into small, testable rules and add tests.
* **Designer list edits.** About 20 of 38 database changes are edits to individual designers. Move those into the admin screen, with bulk hide and retag actions.
* **Guest status.** Store whether an account is a guest when it's created, instead of inferring it from "has no password".
* **Housekeeping.** Remove the duplicate free-text category column and update the out-of-date README.

### 10. Paid tier: keep money and ranking apart in the database (later)

The plan is sound in principle. To keep it honest:

* Put paid features in their own tables, shown only in labeled "Sponsored" slots.
* Never let ranking or scores read anything paid, and add a test that proves it.
* Before any paid feature or ad, move hosting to Vercel's paid plan (about $20/month), because the free plan forbids commercial use.

### Where the reviewers disagreed

The simplicity reviewer says to stop building new features entirely until reviews are flowing. The inventive reviewer proposes new features that would help reviews flow: saving guest reviews before email confirmation, personal invite links, and auto-confirming listings. Both agree that nothing should be built for designers or for paying until reviews arrive. The open question is how much of item 2 should be done in code versus by hand outreach.

### Ideal outcome

PULP stays trustworthy without the owner checking every item. Evidence builds up per review and per listing on its own, reviewers bring in more reviewers, and the owner's 2–3 hours go to the few unclear reviews and to growth.

## Goals vs. Non-Goals

* **In-scope goals (next 3 months):**
  * Sign-up and guest emails reach anyone.
  * A trimmed, credible directory focused on the designers shoppers actually buy from.
  * Search engines can find designer pages.
  * Reviewers hear back about their reviews.
  * The review funnel and approved-reviews-per-month are measured.
  * A friends-and-family launch, followed by outreach in diaspora communities.
* **Out of scope for now:**
  * The paid designer tier: cover photos, page stats, featured placement, advertising.
  * New designer-facing features.
  * Auto-publishing reviews, until volume requires it.

## Alternatives Weighed

* **Launch the paid designer tier now.** Rejected by the reviewers and the author: there's no traffic, and no designer has asked. Revisit after reviews are flowing, starting with a "notify me about premium" button to test demand.
* **Delete the ~146 suspect listings.** Rejected: deleting cascades to reviews, claims and replies. Hide them instead.
* **Check all 146 listings by hand before launch.** Rejected as the main approach: it takes weeks. Let reviews, claims and websites confirm listings over time.
* **Keep Supabase's built-in email sender.** Rejected: it doesn't deliver to outside addresses at all.
* **Require proof of purchase from guests.** Already replaced by the author with "at least one photo" (live since 2026-11-07).

## Key Decisions & Staging for Next Steps

Proposed; the author should confirm each before drafting.

1. **Before inviting anyone:** connect an email provider, and fix the directory with a status field and focus list.
2. **First build batch:**
   * search visibility (server-rendered directory, sitemap, stored slugs);
   * approval and rejection emails with reasons;
   * scheduled proof deletion;
   * contact-form spam protection;
   * public photo links;
   * "Early reviews" below 3 reviewers.
3. **Measurement:** funnel analytics and an approved-reviews-per-month count.
4. **Launch:** friends and family, using personal invite links and early-review integrity rules. Then weekly outreach in 2–3 diaspora communities.
5. **Groundwork, alongside:** database baseline, merge and hide admin tools, and tests for the review rules.
6. **Deferred:** the paid tier, and auto-publishing.

## Reviewer Status

| Reviewer | Lens | Status |
| --- | --- | --- |
| Skeptical Architect | Simplicity / YAGNI | completed |
| Design Critic | Cost, quotas, bottlenecks | completed |
| Codebase Details | Observability and failures | completed |
| Comprehension | Usability for reviewers and the admin | completed |
| Implementation Readiness | Data safety and rollout | completed |
| Structural | Long-term maintainability | completed |
| Inventive Catalyst | Trade-offs that can be avoided | completed |
