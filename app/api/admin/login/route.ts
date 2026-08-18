import {
  assertSameOrigin,
  clearLoginFailures,
  createAdminSession,
  isLoginBlocked,
  loginRateLimitKey,
  recordLoginFailure,
  sessionCookie,
  verifyAdminPassword,
} from "@/lib/auth";

export async function POST(request: Request) {
  if (!assertSameOrigin(request)) return Response.json({ error: "This sign-in request was rejected." }, { status: 403 });
  const payload = (await request.json().catch(() => null)) as { email?: string; password?: string } | null;
  const email = payload?.email?.trim() ?? "";
  const password = payload?.password ?? "";
  if (!email || !password) return Response.json({ error: "Enter both your email and password." }, { status: 400 });

  const keyHash = await loginRateLimitKey(request, email);
  if (await isLoginBlocked(keyHash)) {
    return Response.json({ error: "Too many attempts. Wait 15 minutes before trying again." }, { status: 429 });
  }

  if (!(await verifyAdminPassword(email, password))) {
    await recordLoginFailure(keyHash);
    return Response.json({ error: "The email or password is incorrect." }, { status: 401 });
  }

  await clearLoginFailures(keyHash);
  const token = await createAdminSession();
  return Response.json(
    { ok: true },
    { status: 200, headers: { "set-cookie": sessionCookie(token), "cache-control": "no-store" } },
  );
}
