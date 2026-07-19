import type { AdminSettings } from "@/lib/settings";
import type { SystemHealthReport } from "@/lib/admin-health";

/** Cookie session auth — no client badge storage. */
export function adminHeaders(json = true): HeadersInit {
  const headers: Record<string, string> = {};
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

export async function adminFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(path, { ...init, headers, credentials: "same-origin" });
}

export type SettingsResponse = {
  success: boolean;
  settings: AdminSettings;
  rows?: unknown[];
  error?: string;
};

export type HealthResponse = {
  success: boolean;
  health: SystemHealthReport;
  error?: string;
};

export type ActionResponse = {
  success: boolean;
  message?: string;
  error?: string;
  [key: string]: unknown;
};
