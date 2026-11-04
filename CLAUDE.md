# ATMH Essentials — Project Brief

> Home. Beauty. Everyday Living. — *Everything you need, all in one place.*

This file guides Claude Code on this repository. Read it before doing any work.

## 1. What we're building

An online store for **ATMH Essentials**, a Nigerian retail business selling household, cleaning, personal care, beauty, baby and everyday essentials. Most of these are products customers buy again and again, so the store must make **finding, buying and reordering fast**, especially on mobile.

The reference point is a colleague's Bumpa store (twpconfesstimeless.com.ng). We are building a **custom, upgraded version** that fixes its weaknesses:

| Reference site problem | What ATMH does instead |
|---|---|
| Generic template, no brand identity | Full ATMH brand system (see §3) |
| ~1,600 products in a flat grid, 136 numbered pages | Category tree, filters, search-as-you-type, infinite scroll / "load more" |
| Inconsistent shop-floor photos | Clean product image standard (white/blush background, square crop) |
| Weak SEO (default keywords, repeated title) | Per-page titles/descriptions, structured data, sitemap |
| Chat popup covers products | Unobtrusive WhatsApp button, never auto-opens |
| No trust content | About, delivery info, returns, contact, reviews |
| Locked into a SaaS platform | We own the code and the data |

## 2. Tech stack

- **Framework:** Next.js (App Router) + TypeScript
- **Styling:** Tailwind CSS with brand tokens (below); shadcn/ui for primitives
- **Database:** PostgreSQL via Prisma (hosted: Supabase or Neon, to be confirmed)
- **Auth:** Customer accounts (email + phone OTP preferred) and a separate admin role
- **Payments:** Paystack (primary). Also support "Pay on delivery" and "Bank transfer" as manual methods, which the business can switch on or off
- **Images:** Cloudinary (or Supabase Storage) with automatic resizing/WebP
- **Email/SMS:** Order confirmations via Resend (email) + Termii (SMS), to be confirmed
- **Hosting:** Vercel (default) or Azure Static Web Apps, to be confirmed
- **Currency:** NGN only (₦), formatted `₦12,500`

## 3. Brand system

Taken from the official logo. Do not invent new brand colors.

```
--blush:      #FBF1EC   /* page background */
--blush-deep: #F3E1D8   /* cards, sections */
--rose:       #C4877F   /* primary accent (rose gold) */
--rose-dark:  #A9665E   /* hover / pressed */
--gold:       #C8954A   /* secondary accent, badges, dividers */
--gold-dark:  #A9772F
--ink:        #1A1A1A   /* text, wordmark black */
--muted:      #6B5E59   /* secondary text */
--white:      #FFFFFF
```

- **Display / headings:** elegant high-contrast serif, e.g. *Cormorant Garamond* or *Playfair Display*
- **Body / UI:** clean sans with wide tracking for labels, e.g. *Jost* or *Montserrat* (uppercase + letter-spacing for nav and section labels, like "ESSENTIALS" in the logo)
- **Accent script:** *Great Vibes* or *Allura*, used **only** for taglines ("Everything you need, all in one place."), never for body text or prices
- **Motifs:** thin rose/gold rules, small heart divider, leaf sprig, house roofline. Use them sparingly.
- **Feel:** warm, feminine, premium but affordable. Generous whitespace. Not cluttered like a market stall, even with many products.
- Buttons: solid `--ink` or `--rose`, rounded-full, uppercase tracked label. Primary CTA = "Add to cart".

## 4. Product catalog (category tree)

The categories below merge the written product list and the poster. Confirm with the owner before seeding.

1. **Cleaning & Household**: detergents (powder/liquid), bar soap, bleach, disinfectants, toilet/floor cleaners, dishwashing liquid, sponges & scouring pads, brushes, brooms, dustpans, mops, buckets, gloves, air fresheners, waste bags, matches & lighters, mosquito repellents
2. **Laundry**: laundry detergent, fabric softeners, stain removers, laundry blue, clothes pegs, laundry baskets
3. **Bathroom & Toilet**: toilet paper, paper towels, toilet brushes, toilet fresheners, bath sponges, handwash, small waste bins
4. **Kitchen & Food Storage**: aluminium foil, cling film, food storage bags, kitchen towels, scrubbing pads
5. **Skincare & Body Care**
   - Body: lotions, creams, oils, petroleum jelly, body washes, bath soaps, scrubs, sunscreens
   - Face: cleansers, moisturizers, sunscreens, toners, micellar water, lip balms, serums
6. **Personal Care & Hygiene**: deodorants, roll-ons, sanitary pads, cotton wool, cotton buds, hand sanitizers, handwash, wet wipes
7. **Baby Care**: diapers, baby wipes (plus soaps, lotions, oils if stocked)
8. **Hair Care & Accessories**: attachments, wools, hair creams, sprays, oils, accessories
9. *(From poster, confirm)* **Fragrances**, **Grooming**, **Feminine Care**, **Everyday Disposables**

Product data model must support: name, slug, brand, category + subcategory, description, images[], **variants** (size/scent/pack, e.g. 500ml / 1L / 5L), price, compare-at price, SKU, stock qty, low-stock threshold, tags (e.g. "bestseller", "new"), active flag.

Products may share an entry across categories (e.g. handwash appears in Bathroom and Personal Care), so use a many-to-many relationship, not one category per product.

## 5. Features

### Phase 1: Launch (MVP)
**Storefront**
- Home: hero with tagline, category tiles with icons (as on the poster), Best Sellers, New In, "Restock your home" bundle strip, trust bar (Quality · Affordable · Fast Delivery · Satisfaction)
- Category & subcategory pages with filters: brand, price range, size, in-stock only. Sort: popular, price, newest
- Search with instant suggestions (product + category matches)
- Product page: gallery, variant picker, quantity stepper, stock status, delivery estimate, related products, "Order on WhatsApp" secondary button
- Cart drawer, guest checkout, delivery zone selection (Lagos zones first; nationwide flat or calculated)
- Checkout: Paystack, plus pay-on-delivery / bank transfer toggles
- Customer account: order history, saved addresses, **one-tap reorder**
- Pages: About, Delivery & Returns, Contact, FAQ, Privacy, Terms
- Floating WhatsApp button (never auto-opens a popup)

**Admin dashboard** (`/admin`, admin role only)
- Products: create/edit, variants, images, stock, bulk **CSV import/export**
- Categories management
- Orders: list, status updates (Pending → Paid → Packed → Out for delivery → Delivered / Cancelled), print packing slip
- Low-stock list
- Delivery zones & fees
- Simple sales overview (today / week / month)

**Quality**
- Mobile-first; test at 375px width
- Lighthouse ≥ 90 on Performance, SEO and Accessibility for home, category and product pages
- SEO: unique `<title>`/meta per page, Open Graph images, Product JSON-LD, `sitemap.xml`, `robots.txt`
- Fast on Nigerian mobile networks: optimised images, minimal JS on listing pages

### Phase 2: Growth
- Promo/discount codes
- Product reviews & ratings
- Curated bundles ("Monthly home restock", "New baby box")
- Order notifications by email + SMS, and by WhatsApp later
- Wishlist
- Analytics (GA4 / Plausible) + Meta pixel

### Phase 3: Retention
- Reorder reminders ("Running low on detergent?")
- Subscribe & save on repeat items
- Loyalty points
- Optional wholesale/bulk pricing tier

## 6. Working rules for Claude Code

- Work in small, reviewable steps.
- Branching: all work is committed to the `dev` branch. Never commit, push or merge to `main`. Do not create other branches unless I ask.
- Before starting any task: confirm the current branch is `dev` and up to date with origin (`git pull`). If not on `dev`, stop and tell me.
- After finishing: commit to `dev` with a clear message and push. I test on dev, then open the PR to main myself.
- Use brand tokens from §3 via Tailwind config, never hard-coded hex values in components.
- All prices stored as integers in **kobo**; display in naira.
- Never commit secrets. Use `.env.local` with an `.env.example` listing every variable.
- Paystack: verify every payment server-side via webhook + transaction verify before marking an order Paid.
- Seed data: realistic Nigerian products and prices in NGN for development; clearly marked as sample data.
- Write tests for cart totals, delivery fee calculation and payment webhook handling.

## 7. Open decisions (owner to confirm)

- [ ] Domain name
- [ ] Hosting: Vercel vs Azure
- [ ] Database host: Supabase vs Neon
- [ ] Delivery coverage: Lagos only at launch, or nationwide? Delivery fees per zone?
- [ ] Payment methods to enable at launch (Paystack only, or also POD / bank transfer)
- [ ] Final category list (do Fragrances, Grooming, Feminine Care, Disposables go live at launch?)
- [ ] Starting product list (spreadsheet with names, sizes, prices, stock)
- [ ] Business contact details: WhatsApp number, phone, email, address, social handles
- [ ] Logo files: transparent PNG/SVG versions of the full logo and an icon-only mark
