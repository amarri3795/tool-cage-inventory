import { markMissingTools, type MarkMissingResult } from "@/lib/automation/markMissingTools";
import {
  runLowStockAlerts,
  type LowStockAlertsResult,
} from "@/lib/automation/lowStockAlerts";
import {
  generateInventoryReports,
  type GenerateReportsResult,
} from "@/lib/automation/generateInventoryReports";

export type RunAutomationResult = {
  markMissing: MarkMissingResult;
  lowStockAlerts: LowStockAlertsResult;
  reports: GenerateReportsResult;
  ranAt: string;
};

export async function runAllAutomation(options?: {
  user?: string;
  forceAlerts?: boolean;
  /** Also generate weekly digests (default: daily only) */
  includeWeeklyReports?: boolean;
  siteId?: number;
}): Promise<RunAutomationResult> {
  const user = options?.user ?? "Automation";
  const markMissing = await markMissingTools({ user });
  const lowStockAlerts = await runLowStockAlerts({
    user,
    force: options?.forceAlerts,
  });
  const reports = await generateInventoryReports({
    user,
    siteId: options?.siteId,
    types: options?.includeWeeklyReports
      ? ["daily_inventory", "weekly_inventory"]
      : ["daily_inventory"],
  });

  return {
    markMissing,
    lowStockAlerts,
    reports,
    ranAt: new Date().toISOString(),
  };
}

export { markMissingTools } from "@/lib/automation/markMissingTools";
export {
  runLowStockAlerts,
  resetLowStockEmailFlags,
} from "@/lib/automation/lowStockAlerts";
export {
  generateInventoryReports,
  REPORT_TYPES,
} from "@/lib/automation/generateInventoryReports";
export { writeAuditLog, writeUpdateLog } from "@/lib/automation/audit";
export {
  getSettingValue,
  getSettingBool,
  getSettingNumber,
  getAlertEmailRecipient,
  ensureAutomationSettings,
  upsertSetting,
} from "@/lib/automation/settings";
