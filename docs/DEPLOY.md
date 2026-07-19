# Deploy Tool Cage Inventory (Vercel + Neon)

This app needs a hosted database. We use **Neon Postgres** (free) and **Vercel** (free `*.vercel.app` URL). You can add a custom domain later in the Vercel dashboard.

## 1. Create a free Neon database

1. Go to [https://console.neon.tech](https://console.neon.tech) and sign up (GitHub login is fine).
2. Create a project (any name, e.g. `tool-cage-inventory`).
3. Copy the **connection string** (prefer the **pooled** / `-pooler` URL if Neon shows one).
4. On your PC, edit `.env` in this project:

```env
DATABASE_URL="postgresql://...your neon url...sslmode=require"
```

5. In a terminal in this project folder:

```powershell
cd C:\Users\Amarri52\Projects\tool-cage-inventory
npm install
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

Confirm [http://localhost:3000](http://localhost:3000) still works (now against Neon).

## 2. Put the code on GitHub

If Git is not installed yet: install [Git for Windows](https://git-scm.com/download/win), then open a **new** PowerShell window.

```powershell
cd C:\Users\Amarri52\Projects\tool-cage-inventory
git init
git add .
git commit -m "Prepare Tool Cage Inventory for Vercel and Neon"
```

Create a new empty repo on [https://github.com/new](https://github.com/new) named `tool-cage-inventory` (do not add a README), then:

```powershell
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/tool-cage-inventory.git
git push -u origin main
```

## 3. Deploy on Vercel

1. Go to [https://vercel.com/signup](https://vercel.com/signup) and sign in with GitHub.
2. **Add New Project** → import `tool-cage-inventory`.
3. Under **Environment Variables**, add:

| Name | Value |
|------|--------|
| `DATABASE_URL` | Same Neon connection string as in `.env` |

4. Click **Deploy**.
5. When it finishes, Vercel gives you a public URL like:

`https://tool-cage-inventory-xxxx.vercel.app`

That URL works for anyone. Share it.

## 4. Seed production data (once)

After the first successful deploy, run seed against the **same** Neon database (from your PC — one database serves both local and Vercel):

```powershell
npx prisma db seed
```

If you already seeded in step 1 against Neon, you can skip this.

## 5. Custom domain later (optional)

In Vercel → Project → **Settings** → **Domains** → add a domain you buy (Namecheap, Google Domains, etc.) and follow the DNS instructions.

## Notes

- Dashboard / Scan stay public; Tools / Materials / Employees / Transactions still need admin badge login (`6279` from seed, or `dev` only in local development — not on Vercel production).
- Do **not** commit `.env`. `.gitignore` already excludes it.
- Low-stock email alerts are still simulated (logged), not real SMTP email.
