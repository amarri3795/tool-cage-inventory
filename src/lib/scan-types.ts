export const TOOL_STATUS = {
  AVAILABLE: "Available",
  CHECKED_OUT: "Checked Out",
  MISSING: "Missing",
} as const;

export const TOOL_ACTIONS = {
  CHECK_OUT: "Checked Out",
  CHECK_IN: "Checked In",
} as const;

export const MATERIAL_ACTIONS = {
  ISSUE: "Issue",
  RECEIVE: "Receive",
} as const;

export const MATERIAL_STATUS = {
  OK: "OK",
  LOW_STOCK: "Low Stock",
} as const;

export type ItemKind = "tool" | "material";

export type EmployeeSummary = {
  id: number;
  badge_id: string;
  raw_badge_data: string;
  name: string;
  job_title: string | null;
};

export type ToolSummary = {
  kind: "tool";
  id: number;
  tool_id: string;
  name: string;
  category: string | null;
  location: string | null;
  status: string;
  condition: string | null;
  notes: string | null;
  last_checked_out_by: string | null;
  checkout_time: string | null;
};

export type MaterialSummary = {
  kind: "material";
  id: number;
  material_id: string;
  name: string;
  category: string | null;
  unit: string | null;
  location: string | null;
  current_qty: number;
  min_qty: number;
  status: string;
  last_taken_by: string | null;
  notes: string | null;
};

export type ItemSummary = ToolSummary | MaterialSummary;
