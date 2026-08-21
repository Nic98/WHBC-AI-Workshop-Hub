import { and, eq, gt } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { cookies } from "next/headers";
import { getDb } from "@/db";
import { adminSessions, loginAttempts } from "@/db/schema";
import { verifyPbkdf2Password } from "@/lib/password";
import { createProjectPreviewToken, verifyProjectPreviewToken } from "@/lib/preview-token";

const SESSION_COOKIE = "whbc_admin_session";
const IDLE_SESSION_MS = 12 * 60 * 60 * 1000;
const ABSOLUTE_SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

type RuntimeSecrets = {
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD_HASH?: string;
};

function secrets(): RuntimeSecrets {
  return env as unknown as RuntimeSecrets;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToBase64(new Uint8Array(digest));
}

export async function verifyAdminPassword(email: string, password: string) {
  const { ADMIN_EMAIL, ADMIN_PASSWORD_HASH } = secrets();
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD_HASH || email.trim().toLowerCase() !== ADMIN_EMAIL.trim().toLowerCase()) {
    return false;
  }

  return verifyPbkdf2Password(password, ADMIN_PASSWORD_HASH);
}

export async function createAdminSession() {
  const raw = bytesToBase64(crypto.getRandomValues(new Uint8Array(32)));
  const now = Date.now();
  await getDb().insert(adminSessions).values({
    id: crypto.randomUUID(),
    tokenHash: await sha256(raw),
    idleExpiresAt: now + IDLE_SESSION_MS,
    absoluteExpiresAt: now + ABSOLUTE_SESSION_MS,
    lastSeenAt: now,
    createdAt: now,
  });
  return raw;
}

export function sessionCookie(value: string, maxAge = Math.floor(ABSOLUTE_SESSION_MS / 1000)) {
  return `${SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

function readCookie(request: Request) {
  const header = request.headers.get("cookie") ?? "";
  for (const item of header.split(";")) {
    const [name, ...parts] = item.trim().split("=");
    if (name === SESSION_COOKIE) return decodeURIComponent(parts.join("="));
  }
  return null;
}

async function validateToken(token: string | null, touch: boolean) {
  if (!token) return false;
  const now = Date.now();
  const tokenHash = await sha256(token);
  const [session] = await getDb()
    .select()
    .from(adminSessions)
    .where(and(eq(adminSessions.tokenHash, tokenHash), gt(adminSessions.idleExpiresAt, now), gt(adminSessions.absoluteExpiresAt, now)))
    .limit(1);
  if (!session) return false;
  if (touch && now - session.lastSeenAt > 5 * 60 * 1000) {
    await getDb().update(adminSessions).set({ lastSeenAt: now, idleExpiresAt: Math.min(now + IDLE_SESSION_MS, session.absoluteExpiresAt) }).where(eq(adminSessions.id, session.id));
  }
  return true;
}

export async function isAdminRequest(request: Request) {
  return validateToken(readCookie(request), true);
}

export async function isAdminPageSession() {
  const jar = await cookies();
  return validateToken(jar.get(SESSION_COOKIE)?.value ?? null, true);
}

export async function issueProjectPreviewToken(projectId: string, versionId: string) {
  const secret = secrets().ADMIN_PASSWORD_HASH;
  if (!secret) throw new Error("Project preview is unavailable.");
  return createProjectPreviewToken(secret, projectId, versionId);
}

export async function isProjectPreviewToken(token: string, projectId: string, versionId: string) {
  const secret = secrets().ADMIN_PASSWORD_HASH;
  if (!secret) return false;
  return verifyProjectPreviewToken(secret, token, projectId, versionId);
}

export async function issueSubmissionPreviewToken(submissionId: string) {
  const secret = secrets().ADMIN_PASSWORD_HASH;
  if (!secret) throw new Error("Submission preview is unavailable.");
  return createProjectPreviewToken(secret, "submission", submissionId);
}

export async function isSubmissionPreviewToken(token: string, submissionId: string) {
  const secret = secrets().ADMIN_PASSWORD_HASH;
  if (!secret) return false;
  return verifyProjectPreviewToken(secret, token, "submission", submissionId);
}

export async function destroyAdminSession(request: Request) {
  const token = readCookie(request);
  if (token) await getDb().delete(adminSessions).where(eq(adminSessions.tokenHash, await sha256(token)));
}

export async function loginRateLimitKey(request: Request, email: string) {
  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  return sha256(`${email.trim().toLowerCase()}|${ip.trim()}`);
}

export async function isLoginBlocked(keyHash: string) {
  const [attempt] = await getDb().select().from(loginAttempts).where(eq(loginAttempts.keyHash, keyHash)).limit(1);
  return Boolean(attempt && attempt.blockedUntil > Date.now());
}

export async function recordLoginFailure(keyHash: string) {
  const now = Date.now();
  const [attempt] = await getDb().select().from(loginAttempts).where(eq(loginAttempts.keyHash, keyHash)).limit(1);
  const inWindow = attempt && now - attempt.windowStartedAt < ATTEMPT_WINDOW_MS;
  const failures = inWindow ? attempt.failures + 1 : 1;
  await getDb()
    .insert(loginAttempts)
    .values({ keyHash, failures, windowStartedAt: inWindow ? attempt.windowStartedAt : now, blockedUntil: failures >= MAX_FAILURES ? now + ATTEMPT_WINDOW_MS : 0 })
    .onConflictDoUpdate({
      target: loginAttempts.keyHash,
      set: { failures, windowStartedAt: inWindow ? attempt.windowStartedAt : now, blockedUntil: failures >= MAX_FAILURES ? now + ATTEMPT_WINDOW_MS : 0 },
    });
}

export async function clearLoginFailures(keyHash: string) {
  await getDb().delete(loginAttempts).where(eq(loginAttempts.keyHash, keyHash));
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}
