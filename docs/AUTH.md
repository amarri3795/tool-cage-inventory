# Deploy notes — multi-site auth

## Required Vercel environment variables

Add these in Vercel → Settings → Environment Variables (no quotes):

| Key | Value |
|-----|--------|
| `DATABASE_URL` | Neon connection string |
| `SESSION_SECRET` | Long random string (32+ chars) |
| `MASTER_ADMIN_ID` | Your master admin username |
| `MASTER_ADMIN_PASSWORD` | Your master admin password |
| `DEFAULT_SITE_PASSWORD` | Optional; used when seeding sites |

After changing env vars, **Redeploy**.

## App flow

1. `/` — Site Login (plant name + password)
2. `/signup` — Register a new plant
3. `/admin/login` — Master admin (ID + password) → `/admin`
4. Site users → `/dashboard` and inventory pages (scoped to that site)

## First site

`BowlingGreenKY` is seeded. Local default site password comes from `DEFAULT_SITE_PASSWORD`.
