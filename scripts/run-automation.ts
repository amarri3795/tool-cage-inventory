/**
 * CLI runner for OpsFlow automation.
 *
 * Usage (from project root):
 *   npx tsx scripts/run-automation.ts
 *   npx tsx scripts/run-automation.ts --missing-only
 *   npx tsx scripts/run-automation.ts --alerts-only
 *   npx tsx scripts/run-automation.ts --force-alerts
 *   npx tsx scripts/run-automation.ts --reports-only
 *   npx tsx scripts/run-automation.ts --reports-only --weekly
 *   npx tsx scripts/run-automation.ts --include-weekly
 *
 * Or via npm:
 *   npm run automation:run
 */

async function main() {
  const args = new Set(process.argv.slice(2));
  const missingOnly = args.has("--missing-only");
  const alertsOnly = args.has("--alerts-only");
  const reportsOnly = args.has("--reports-only");
  const forceAlerts = args.has("--force-alerts");
  const weeklyOnly = args.has("--weekly") && !args.has("--include-weekly");
  const includeWeekly = args.has("--include-weekly");

  const { markMissingTools } = await import(
    "../src/lib/automation/markMissingTools"
  );
  const { runLowStockAlerts } = await import(
    "../src/lib/automation/lowStockAlerts"
  );
  const { generateInventoryReports, REPORT_TYPES } = await import(
    "../src/lib/automation/generateInventoryReports"
  );
  const { runAllAutomation } = await import("../src/lib/automation");

  if (missingOnly) {
    const result = await markMissingTools({ user: "CLI" });
    console.log(JSON.stringify({ success: true, markMissing: result }, null, 2));
    return;
  }

  if (alertsOnly) {
    const result = await runLowStockAlerts({
      user: "CLI",
      force: forceAlerts,
    });
    console.log(
      JSON.stringify({ success: true, lowStockAlerts: result }, null, 2),
    );
    return;
  }

  if (reportsOnly) {
    const types = weeklyOnly
      ? [REPORT_TYPES.WEEKLY]
      : includeWeekly
        ? [REPORT_TYPES.DAILY, REPORT_TYPES.WEEKLY]
        : [REPORT_TYPES.DAILY];
    const result = await generateInventoryReports({
      user: "CLI",
      types,
    });
    console.log(JSON.stringify({ success: true, reports: result }, null, 2));
    return;
  }

  const result = await runAllAutomation({
    user: "CLI",
    forceAlerts,
    includeWeeklyReports: includeWeekly || weeklyOnly,
  });
  console.log(JSON.stringify({ success: true, ...result }, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { prisma } = await import("../src/lib/prisma");
    await prisma.$disconnect();
  });
