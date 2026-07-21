# OpsFlow — Handoff for a New Chat / Repo

Use this when starting a fresh Cursor chat (token limit) or cloning into another folder.

## Fastest path (recommended)

You do **not** need to rebuild. The full app is already on GitHub:

```text
https://github.com/amarri3795/tool-cage-inventory
```

In a **new** Cursor window / chat:

```powershell
cd C:\Users\Amarri52\Projects
git clone https://github.com/amarri3795/tool-cage-inventory.git opsflow
cd opsflow
copy .env.example .env
# Paste your real secrets into .env (see below)
npm install
npx prisma migrate deploy
npm run dev
```

Open http://localhost:3000

**Database:** Neon is already set up. Keep the same `DATABASE_URL` — you do **not** need to move the DB unless you want a fresh empty one. Same connection string = same data.

**Vercel:** same GitHub repo → same project; just redeploy after pushes.

---

## What this product is today

**OpsFlow** = multi-site tool / material inventory SaaS (tool-cage successor), dark/gold UI, logo in `public/opsflow-logo.png`.

| Role | How to log in | Access |
|------|----------------|--------|
| Site member | `/` plant name + site password | Dashboard + Scan only |
| Site admin | Dashboard → Site admin login | Tools, materials, employees, transactions, site settings |
| Master admin | `/admin/login` | Admin Control Center + `/admin/sites` (paywall flags, delete site, disable, reset passwords) |

**Billing:** **Fake / manual only.** Site has `paywall_*` fields toggled by master admin. **No Stripe yet** — add later when finalized.

**Automation (light):** mark overdue tools Missing; simulated low-stock alerts; audit logs. Run via `POST /api/automation/run` or `npm run automation:run`.

**Stack:** Next.js 15 App Router, TypeScript, Tailwind, Prisma, PostgreSQL (Neon), bcrypt + JWT cookie auth (`SESSION_SECRET`). Not Supabase / ShadCN / Stripe yet.

---

## Required `.env` (never commit)

```env
DATABASE_URL=postgresql://...neon.../neondb?sslmode=require
SESSION_SECRET=at-least-32-random-characters
MASTER_ADMIN_ID=your-admin-id
MASTER_ADMIN_PASSWORD=your-admin-password
DEFAULT_SITE_PASSWORD=site-member-password
DEFAULT_SITE_ADMIN_PASSWORD=optional-explicit-site-admin-password
```

If `DEFAULT_SITE_ADMIN_PASSWORD` is unset, seed uses `{DEFAULT_SITE_PASSWORD}Admin`.

Update site password hash after changing site password:

```powershell
npx tsx scripts/update-site-password.ts
```

Vercel needs the same env vars (no quotes) + Redeploy.

---

## Paste this into a new Cursor chat

```text
Continue OpsFlow from https://github.com/amarri3795/tool-cage-inventory

Local path: C:\Users\Amarri52\Projects\opsflow (or tool-cage-inventory)

Product: multi-site inventory (tools/materials/scan), roles site_member / site_admin / master_admin.
Billing: FAKE ONLY (Site paywall_* flags). Do NOT add real Stripe until I ask.
Stack: Next.js 15, Prisma, Neon Postgres, Tailwind, JWT auth in src/lib/auth.ts.

Read docs/AUTH.md and docs/DEPLOY.md first.

Current gaps vs full automation SaaS vision (for later):
- No Stripe webhooks / real subscriptions
- No Supabase (using Prisma+Neon)
- No reports / reminders / compliance modules
- Email alerts simulated only
- Light automation only (missing tools + low stock)

When I ask to align with the SaaS vision, keep billing fake (mock paywall UI) until I say to wire Stripe.
```

---

## Moving the database (only if you want a new empty DB)

1. Create a new Neon project → copy new `DATABASE_URL`
2. Put it in `.env`
3. `npx prisma migrate deploy`
4. `npx prisma db seed`
5. Update Vercel `DATABASE_URL` + redeploy

Old Neon project can be deleted after you confirm the new one works.

---

## Do not paste

- Full `node_modules`
- `.env` secrets in chat if avoidable
- The whole repo as one giant script (clone GitHub instead)

---

## Latest known good remotes

- GitHub `main` includes OpsFlow rebrand + logo + multi-site roles/paywall tools
- Local folder may still be named `tool-cage-inventory`; product name is **OpsFlow**
