# Deploy notes — multi-site auth

## Required Vercel environment variables

Add these in Vercel → Settings → Environment Variables (no quotes):

| Key | Value |
|-----|--------|
| `DATABASE_URL` | Neon connection string |
| `SESSION_SECRET` | Long random string (32+ chars) |
| `MASTER_ADMIN_ID` | Your master admin username |
| `MASTER_ADMIN_PASSWORD` | Your master admin password |
| `DEFAULT_SITE_PASSWORD` | Optional; used when seeding site member password |
| `DEFAULT_SITE_ADMIN_PASSWORD` | Optional; seeded site admin password for BowlingGreenKY |

After changing env vars, **Redeploy**.

## Roles

| Role | How to sign in | Navigation |
|------|----------------|------------|
| **site_member** | `/` plant name + site password | Dashboard, Scan only |
| **site_admin** | Site member session → **Site admin login** on dashboard (`/dashboard/admin-login`) | + Tools, Materials, Employees, Transactions, Site Settings |
| **master_admin** | `/admin/login` (or master ID/password on site login bypass) | Admin Dashboard, Master Admin Tools (`/admin/sites`), full override |

## App flow

1. `/` — Site Login (plant name + **site/member** password)
2. `/signup` — Register a new plant (creates site admin password; session starts as site member)
3. `/dashboard/admin-login` — Elevate to site admin for that plant
4. `/admin/login` — Master admin → `/admin` and `/admin/sites`
5. `/reset-password` — Request reset (token stored; master can reset in Master Admin Tools)
6. `/site-settings` — Site admin (or master with `?siteId=`)

## Paywall (master only)

Configured per site in **Master Admin Tools**. Default off. When on, site members lose scan access after the free trial unless **Mark as paid** is set.

## First site

`BowlingGreenKY` is seeded. Local passwords:

- Site member: `DEFAULT_SITE_PASSWORD` (or seed fallback)
- Site admin: `DEFAULT_SITE_ADMIN_PASSWORD` (or `{sitePassword}Admin`)

Run `npm run db:migrate` and `npm run db:seed` after pulling schema changes.

## Local testing checklist

1. Site member: login at `/` → confirm nav is Dashboard + Scan only; inventory URLs redirect.
2. Site admin: from dashboard → Site admin login → full inventory nav.
3. Master: `/admin/login` → Admin Dashboard + Master Admin Tools; toggle paywall on a test site and verify member scan block after trial.
