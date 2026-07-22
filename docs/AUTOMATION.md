# Automation — OpsFlow

Scheduled jobs for overdue tools → Missing, low-stock alerts, and inventory report digests.

## What runs

| Job | Behavior |
|-----|----------|
| **Mark missing** | Tools with status `Checked Out` whose `checkout_time` is older than `missing_after_hours` are set to `Missing`. Writes `audit_logs` (+ `update_logs`). |
| **Low stock alerts** | Materials with `current_qty <= min_qty` (or status Low Stock). Simulated email (console + audit). Frequency gated by `alert_frequency_hours`. Resets flags when stock is OK if `reset_email_flag_when_ok=true`. |
| **Inventory reports** | Writes `ops_reports` rows (`daily_inventory` / `weekly_inventory`) with tool/material/txn summary JSON. Simulated email (console + audit). View at `/reports`. |

## Vercel Cron (production schedule)

`vercel.json` runs **daily at 12:00 UTC** (`0 12 * * *`):

- Path: `GET/POST /api/cron/automation`
- Runs mark-missing + low-stock + **daily** reports
- On **Sundays (UTC)** also generates **weekly** reports

Set `CRON_SECRET` in Vercel (and optionally local `.env`). Vercel sends `Authorization: Bearer $CRON_SECRET`. Without a matching secret in production, the route returns 401.

```bash
# Manual cron-style call (local: CRON_SECRET optional in development)
curl -X GET "http://localhost:3000/api/cron/automation" -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Settings keys (DB `settings` table)

| Key | Default | Purpose |
|-----|---------|---------|
| `missing_after_hours` | `2` | Hours after checkout before Missing |
| `low_stock_alerts_enabled` | `true` | Master switch |
| `low_stock_email_to` | (seeded) | Recipient |
| `alert_email_recipient` | optional | Overrides `low_stock_email_to` if set |
| `alert_frequency_hours` | `24` | Min hours between alerts per material |
| `reset_email_flag_when_ok` | `true` | Clear `low_stock_email_*` when OK |

## HTTP endpoints

With the app running (`npm run dev` or `npm start`):

```bash
# All jobs (includes daily inventory reports)
curl -X POST http://localhost:3000/api/automation/run

# All jobs + weekly reports
curl -X POST http://localhost:3000/api/automation/run -H "Content-Type: application/json" -d "{\"includeWeeklyReports\":true}"

# Missing tools only
curl -X POST http://localhost:3000/api/automation/mark-missing

# Low stock alerts only
curl -X POST http://localhost:3000/api/automation/low-stock-alerts

# Inventory reports only (type: daily | weekly | all)
curl -X POST http://localhost:3000/api/automation/reports/run -H "Content-Type: application/json" -d "{\"type\":\"daily\"}"

# Admin Control Center actions (same logic)
curl -X POST http://localhost:3000/api/admin/actions/mark-missing
curl -X POST http://localhost:3000/api/admin/actions/low-stock-check
curl -X POST http://localhost:3000/api/admin/actions/reset-low-stock-flags
```

Optional JSON body: `{ "user": "TaskScheduler", "force": true }` (`force` / `forceAlerts` bypasses frequency window).

## CLI script

```bash
npm run automation:run
npx tsx scripts/run-automation.ts --missing-only
npx tsx scripts/run-automation.ts --alerts-only
npx tsx scripts/run-automation.ts --force-alerts
npx tsx scripts/run-automation.ts --reports-only
npx tsx scripts/run-automation.ts --reports-only --weekly
npx tsx scripts/run-automation.ts --include-weekly
```

## Windows Task Scheduler

1. Create a task (e.g. every 15–60 minutes).
2. Action: **Start a program**
   - Program: `curl` (or `powershell`)
   - Arguments example:

```text
-Method POST -Uri http://localhost:3000/api/automation/run
```

PowerShell action:

```powershell
Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/automation/run" -ContentType "application/json" -Body '{"user":"TaskScheduler"}'
```

Or run the CLI without a running server (needs `DATABASE_URL` in `.env`):

```text
Program: npx
Arguments: tsx scripts/run-automation.ts
Start in: C:\Users\Amarri52\Projects\tool-cage-inventory
```

Ensure the Next.js app is running if you use the HTTP endpoints.
