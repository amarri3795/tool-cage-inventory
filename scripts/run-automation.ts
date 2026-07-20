/**
 * CLI runner for OpsFlow automation.
 *
 * Usage (from project root):
 *   npx tsx scripts/run-automation.ts
 *   npx tsx scripts/run-automation.ts --missing-only
 *   npx tsx scripts/run-automation.ts --alerts-only
 *   npx tsx scripts/run-automation.ts --force-alerts
 *
 * Or via npm:
 *   npm run automation:run
 */

async function main() {
  const args = new Set(process.argv.slice(2));
  const missingOnly = args.has("--missing-only");
  const alertsOnly = args.has("--alerts-only");
  const forceAlerts = args.has("--force-alerts");

  const { markMissingTools } = await import(
    "../src/lib/automation/markMissingTools"
  );
  const { runLowStockAlerts } = await import(
    "../src/lib/automation/lowStockAlerts"
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

  const result = await runAllAutomation({
    user: "CLI",
    forceAlerts,
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
