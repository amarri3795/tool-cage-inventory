import { markMissingTools, type MarkMissingResult } from "@/lib/automation/markMissingTools";
import {
  runLowStockAlerts,
  type LowStockAlertsResult,
} from "@/lib/automation/lowStockAlerts";

export type RunAutomationResult = {
  markMissing: MarkMissingResult;
  lowStockAlerts: LowStockAlertsResult;
  ranAt: string;
};

export async function runAllAutomation(options?: {
  user?: string;
  forceAlerts?: boolean;
}): Promise<RunAutomationResult> {
  const user = options?.user ?? "Automation";
  const markMissing = await markMissingTools({ user });
  const lowStockAlerts = await runLowStockAlerts({
    user,
    force: options?.forceAlerts,
  });

  return {
    markMissing,
    lowStockAlerts,
    ranAt: new Date().toISOString(),
  };
}

export { markMissingTools } from "@/lib/automation/markMissingTools";
export {
  runLowStockAlerts,
  resetLowStockEmailFlags,
} from "@/lib/automation/lowStockAlerts";
export { writeAuditLog, writeUpdateLog } from "@/lib/automation/audit";
export {
  getSettingValue,
  getSettingBool,
  getSettingNumber,
  getAlertEmailRecipient,
  ensureAutomationSettings,
  upsertSetting,
} from "@/lib/automation/settings";
