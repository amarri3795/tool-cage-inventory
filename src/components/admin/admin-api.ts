import { BADGE_HEADER, SESSION_KEY } from "@/lib/admin-constants";
import type { AdminSettings } from "@/lib/settings";
import type { SystemHealthReport } from "@/lib/admin-health";

/** Fired on same-tab admin login/logout so nav and gates stay in sync. */
export const ADMIN_AUTH_EVENT = "tci-admin-auth";

export function getStoredBadge(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(SESSION_KEY);
}

export function setStoredBadge(badgeId: string) {
  sessionStorage.setItem(SESSION_KEY, badgeId);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ADMIN_AUTH_EVENT));
  }
}

export function clearStoredBadge() {
  sessionStorage.removeItem(SESSION_KEY);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ADMIN_AUTH_EVENT));
  }
}

export function adminHeaders(badgeId: string, json = true): HeadersInit {
  const headers: Record<string, string> = {
    [BADGE_HEADER]: badgeId,
  };
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

export async function adminFetch(
  badgeId: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set(BADGE_HEADER, badgeId);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(path, { ...init, headers });
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
