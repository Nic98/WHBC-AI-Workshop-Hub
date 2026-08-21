import { assertSameOrigin, isAdminRequest } from "@/lib/auth";
import { getInviteStatus, logAudit, rotateInviteCode } from "@/lib/submissions";

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return Response.json({ error: "Sign in to continue." }, { status: 401 });
  return Response.json(await getInviteStatus(), { headers: { "cache-control": "no-store" } });
}

export async function PUT(request: Request) {
  if (!assertSameOrigin(request) || !(await isAdminRequest(request))) return Response.json({ error: "Sign in to continue." }, { status: 401 });
  const payload = (await request.json().catch(() => null)) as { code?: unknown } | null;
  const code = typeof payload?.code === "string" ? payload.code : "";
  const result = await rotateInviteCode(code);
  if ("error" in result) return Response.json({ error: result.error }, { status: 400 });
  await logAudit("invite.rotated", "settings", "invite");
  return Response.json({ configured: true, updatedAt: result.updatedAt });
}
