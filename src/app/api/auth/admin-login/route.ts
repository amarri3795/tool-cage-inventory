import { NextResponse } from "next/server";
import {
  setSessionCookie,
  verifyMasterAdmin,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Master admin login (Admin ID + password). */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const adminId = String(body.adminId ?? body.siteName ?? "").trim();
  const password = String(body.password ?? body.sitePassword ?? "");
  const rememberMe = Boolean(body.rememberMe);

  if (!adminId || !password) {
    return NextResponse.json(
      { success: false, error: "Admin ID and password are required." },
      { status: 400 },
    );
  }

  if (!(await verifyMasterAdmin(adminId, password))) {
    return NextResponse.json(
      { success: false, error: "Invalid admin ID or password." },
      { status: 401 },
    );
  }

  await setSessionCookie(
    { role: "master_admin", adminId },
    rememberMe,
  );

  return NextResponse.json({
    success: true,
    role: "master_admin",
    redirectTo: "/admin",
  });
}
