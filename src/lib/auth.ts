import { createHash, randomBytes, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "tci_session";
export const REMEMBER_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
export const SESSION_COOKIE_MAX_AGE = 60 * 60 * 12; // 12 hours

export type SessionRole = "master_admin" | "site_admin" | "site_member";

export type AppSession = {
  role: SessionRole;
  adminId?: string;
  siteId?: number;
  siteName?: string;
};

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "SESSION_SECRET must be set in environment (min 16 characters).",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(
  plain: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, passwordHash);
}

function safeEqualString(a: string, b: string): boolean {
  const ah = createHash("sha256").update(a).digest();
  const bh = createHash("sha256").update(b).digest();
  return timingSafeEqual(ah, bh);
}

/** Master admin from env: MASTER_ADMIN_ID + MASTER_ADMIN_PASSWORD_HASH or MASTER_ADMIN_PASSWORD */
export async function verifyMasterAdmin(
  adminId: string,
  password: string,
): Promise<boolean> {
  const expectedId = process.env.MASTER_ADMIN_ID?.trim();
  if (!expectedId || !safeEqualString(adminId.trim(), expectedId)) {
    return false;
  }

  const hash = process.env.MASTER_ADMIN_PASSWORD_HASH?.trim();
  if (hash) {
    return verifyPassword(password, hash);
  }

  const plain = process.env.MASTER_ADMIN_PASSWORD;
  if (!plain) return false;
  return safeEqualString(password, plain);
}

function normalizeRole(raw: unknown): SessionRole | null {
  if (raw === "master_admin" || raw === "site_admin" || raw === "site_member") {
    return raw;
  }
  // Legacy sessions
  if (raw === "site") return "site_member";
  return null;
}

export async function createSessionToken(
  session: AppSession,
  maxAgeSeconds: number,
): Promise<string> {
  return new SignJWT({ ...session } as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSeconds}s`)
    .sign(getSecretKey());
}

export async function readSessionToken(
  token: string,
): Promise<AppSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const role = normalizeRole(payload.role);
    if (!role) return null;

    if (role === "master_admin") {
      const adminId = typeof payload.adminId === "string" ? payload.adminId : "";
      if (!adminId) return null;
      return { role, adminId };
    }

    const siteId =
      typeof payload.siteId === "number"
        ? payload.siteId
        : Number(payload.siteId);
    const siteName =
      typeof payload.siteName === "string" ? payload.siteName : "";
    if (!Number.isFinite(siteId) || !siteName) return null;
    return { role, siteId, siteName };
  } catch {
    return null;
  }
}

export async function setSessionCookie(
  session: AppSession,
  rememberMe: boolean,
) {
  const maxAge = rememberMe ? REMEMBER_COOKIE_MAX_AGE : SESSION_COOKIE_MAX_AGE;
  const token = await createSessionToken(session, maxAge);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<AppSession | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return readSessionToken(token);
}

export async function requireMasterAdmin(): Promise<
  | { ok: true; session: AppSession }
  | { ok: false; status: number; error: string }
> {
  const session = await getSession();
  if (!session || session.role !== "master_admin") {
    return { ok: false, status: 401, error: "Master admin login required." };
  }
  return { ok: true, session };
}

export async function requireSiteAdminOrMaster(): Promise<
  | { ok: true; session: AppSession; siteId: number | null }
  | { ok: false; status: number; error: string }
> {
  const session = await getSession();
  if (!session) {
    return { ok: false, status: 401, error: "Authentication required." };
  }
  if (session.role === "master_admin") {
    return { ok: true, session, siteId: null };
  }
  if (session.role === "site_admin" && session.siteId != null) {
    return { ok: true, session, siteId: session.siteId };
  }
  return { ok: false, status: 403, error: "Site admin access required." };
}

export async function requireSiteOrAdmin(): Promise<
  | { ok: true; session: AppSession; siteId: number | null }
  | { ok: false; status: number; error: string }
> {
  const session = await getSession();
  if (!session) {
    return { ok: false, status: 401, error: "Authentication required." };
  }
  if (session.role === "master_admin") {
    return { ok: true, session, siteId: null };
  }
  if (
    (session.role === "site_admin" || session.role === "site_member") &&
    session.siteId != null
  ) {
    return { ok: true, session, siteId: session.siteId };
  }
  return { ok: false, status: 401, error: "Authentication required." };
}

/** Site-scoped filter: master admin with null siteId sees all; site users are locked to site. */
export function siteWhere(siteId: number | null): { site_id?: number } {
  if (siteId == null) return {};
  return { site_id: siteId };
}

export async function findSiteByName(name: string) {
  return prisma.site.findUnique({
    where: { name: name.trim() },
  });
}

export function normalizeSiteName(raw: string): string {
  return raw.trim().replace(/\s+/g, "");
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateResetToken(): string {
  return randomBytes(32).toString("hex");
}

export async function verifySiteAdminPassword(
  siteId: number,
  password: string,
): Promise<boolean> {
  const site = await prisma.site.findUnique({ where: { id: siteId } });
  if (!site?.site_admin_password_hash) return false;
  return verifyPassword(password, site.site_admin_password_hash);
}
