import { assertSameOrigin, clearSessionCookie, destroyAdminSession } from "@/lib/auth";

export async function POST(request: Request) {
  if (!assertSameOrigin(request)) return Response.json({ error: "This request was rejected." }, { status: 403 });
  await destroyAdminSession(request);
  return Response.json({ ok: true }, { headers: { "set-cookie": clearSessionCookie(), "cache-control": "no-store" } });
}
