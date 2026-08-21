import { and, desc, eq, lte } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import { auditLogs, inviteSettings, submissionRateLimits, submissions } from "@/db/schema";
import { parseList } from "@/lib/catalog";
import { deleteSubmissionObjects } from "@/lib/submission-storage";
import { validateSubmissionPayload as validateSubmissionPayloadPure } from "@/lib/submission-validation";
import type { SubmissionPayload } from "@/lib/submission-validation";
import type { ManifestFile } from "@/lib/storage-validation";

export type { SubmissionPayload } from "@/lib/submission-validation";

const INVITE_SETTING_ID = "current";
const UPLOAD_TOKEN_TTL_MS = 2 * 60 * 60 * 1000;
const INCOMPLETE_PURGE_MS = 24 * 60 * 60 * 1000;
const REJECTED_PURGE_MS = 30 * 24 * 60 * 60 * 1000;
const FAILURE_WINDOW_MS = 15 * 60 * 1000;
const COMPLETION_WINDOW_MS = 24 * 60 * 60 * 1000;

export const requiredReviewChecklist = ["tested", "safe", "identity", "rights", "presentation"] as const;

type RuntimeSubmissionSecrets = {
  ADMIN_PASSWORD_HASH?: string;
  RESEND_API_KEY?: string;
  SUBMISSION_NOTIFY_EMAIL?: string;
  SUBMISSION_FROM_EMAIL?: string;
};

function runtimeSecrets() {
  return env as unknown as RuntimeSubmissionSecrets;
}

export function validateSubmissionPayload(input: unknown): { data?: SubmissionPayload; error?: string } {
  return validateSubmissionPayloadPure(input);
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(digest));
}

async function deriveInviteHash(code: string, salt: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(code), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(salt), iterations: 120_000 }, key, 256);
  return bytesToBase64Url(new Uint8Array(bits));
}

export async function rotateInviteCode(code: string) {
  const normalized = code.trim();
  if (normalized.length < 8 || normalized.length > 64) return { error: "Invitation codes must be 8–64 characters." } as const;
  const salt = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(18)));
  const now = new Date().toISOString();
  await getDb().insert(inviteSettings).values({ id: INVITE_SETTING_ID, codeHash: await deriveInviteHash(normalized, salt), codeSalt: salt, updatedAt: now }).onConflictDoUpdate({ target: inviteSettings.id, set: { codeHash: await deriveInviteHash(normalized, salt), codeSalt: salt, updatedAt: now } });
  return { updatedAt: now } as const;
}

export async function getInviteStatus() {
  const [setting] = await getDb().select({ updatedAt: inviteSettings.updatedAt }).from(inviteSettings).where(eq(inviteSettings.id, INVITE_SETTING_ID)).limit(1);
  return { configured: Boolean(setting), updatedAt: setting?.updatedAt ?? null };
}

export async function verifyInviteCode(code: string) {
  const [setting] = await getDb().select().from(inviteSettings).where(eq(inviteSettings.id, INVITE_SETTING_ID)).limit(1);
  if (!setting) return false;
  const candidate = await deriveInviteHash(code.trim(), setting.codeSalt);
  if (candidate.length !== setting.codeHash.length) return false;
  let different = 0;
  for (let index = 0; index < candidate.length; index += 1) different |= candidate.charCodeAt(index) ^ setting.codeHash.charCodeAt(index);
  return different === 0;
}

export function createSubmissionReference(now = new Date()) {
  const date = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`;
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const random = crypto.getRandomValues(new Uint8Array(6));
  const suffix = [...random].map((value) => alphabet[value % alphabet.length]).join("");
  return `AWH-${date}-${suffix}`;
}

export async function createUploadToken() {
  const raw = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  return { raw, hash: await sha256(raw), expiresAt: Date.now() + UPLOAD_TOKEN_TTL_MS };
}

export async function authorizeSubmissionUpload(request: Request, submissionId: string) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) return null;
  const [submission] = await getDb().select().from(submissions).where(and(eq(submissions.id, submissionId), eq(submissions.status, "uploading"))).limit(1);
  if (!submission?.uploadTokenHash || !submission.uploadExpiresAt || submission.uploadExpiresAt <= Date.now()) return null;
  const tokenHash = await sha256(token);
  return tokenHash === submission.uploadTokenHash ? submission : null;
}

async function rateLimitKey(request: Request, purpose: string, email = "") {
  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  const secret = runtimeSecrets().ADMIN_PASSWORD_HASH ?? "ai-workshop-submission-rate-limit";
  return sha256(`${purpose}|${ip.trim()}|${email.trim().toLowerCase()}|${secret}`);
}

async function readRateLimit(keyHash: string) {
  const [row] = await getDb().select().from(submissionRateLimits).where(eq(submissionRateLimits.keyHash, keyHash)).limit(1);
  return row;
}

export async function isInviteAttemptBlocked(request: Request) {
  const row = await readRateLimit(await rateLimitKey(request, "invite"));
  return Boolean(row && row.blockedUntil > Date.now());
}

export async function recordInviteFailure(request: Request) {
  const keyHash = await rateLimitKey(request, "invite");
  const now = Date.now();
  const row = await readRateLimit(keyHash);
  const inWindow = Boolean(row && now - row.windowStartedAt < FAILURE_WINDOW_MS);
  const failures = inWindow ? (row?.failures ?? 0) + 1 : 1;
  await getDb().insert(submissionRateLimits).values({ keyHash, failures, completed: 0, windowStartedAt: inWindow ? row!.windowStartedAt : now, blockedUntil: failures >= 5 ? now + FAILURE_WINDOW_MS : 0 }).onConflictDoUpdate({ target: submissionRateLimits.keyHash, set: { failures, completed: 0, windowStartedAt: inWindow ? row!.windowStartedAt : now, blockedUntil: failures >= 5 ? now + FAILURE_WINDOW_MS : 0 } });
}

export async function clearInviteFailures(request: Request) {
  await getDb().delete(submissionRateLimits).where(eq(submissionRateLimits.keyHash, await rateLimitKey(request, "invite")));
}

export async function isSubmissionLimitReached(request: Request, email: string) {
  const row = await readRateLimit(await rateLimitKey(request, "complete", email));
  if (!row || Date.now() - row.windowStartedAt >= COMPLETION_WINDOW_MS) return false;
  return row.completed >= 3;
}

export async function recordSubmissionCompleted(request: Request, email: string) {
  const keyHash = await rateLimitKey(request, "complete", email);
  const now = Date.now();
  const row = await readRateLimit(keyHash);
  const inWindow = Boolean(row && now - row.windowStartedAt < COMPLETION_WINDOW_MS);
  const completed = inWindow ? (row?.completed ?? 0) + 1 : 1;
  await getDb().insert(submissionRateLimits).values({ keyHash, failures: 0, completed, windowStartedAt: inWindow ? row!.windowStartedAt : now, blockedUntil: 0 }).onConflictDoUpdate({ target: submissionRateLimits.keyHash, set: { failures: 0, completed, windowStartedAt: inWindow ? row!.windowStartedAt : now, blockedUntil: 0 } });
}

export function uploadingPurgeAfter() {
  return Date.now() + INCOMPLETE_PURGE_MS;
}

export function rejectedPurgeAfter() {
  return Date.now() + REJECTED_PURGE_MS;
}

export function serializeSubmission(row: typeof submissions.$inferSelect) {
  return {
    ...row,
    creatorType: row.creatorType === "teacher" ? "teacher" as const : "student" as const,
    categories: parseList(row.categoriesJson),
    technologies: parseList(row.technologiesJson),
    manifest: parseListOrObjects(row.manifestJson),
    reviewChecklist: parseList(row.reviewChecklistJson),
  };
}

function parseListOrObjects(value: string): ManifestFile[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is ManifestFile => Boolean(item && typeof item.path === "string" && Number.isSafeInteger(item.size))) : [];
  } catch {
    return [];
  }
}

export async function logAudit(action: string, entityType: string, entityId: string, details: Record<string, unknown> = {}) {
  await getDb().insert(auditLogs).values({ id: crypto.randomUUID(), action, entityType, entityId, detailsJson: JSON.stringify(details) });
}

export async function purgeExpiredSubmissions(limit = 20) {
  const expired = await getDb().select({ id: submissions.id }).from(submissions).where(lte(submissions.purgeAfter, Date.now())).orderBy(desc(submissions.purgeAfter)).limit(limit);
  for (const item of expired) {
    await deleteSubmissionObjects(item.id);
    await getDb().delete(submissions).where(eq(submissions.id, item.id));
    await logAudit("submission.purged", "submission", item.id);
  }
  return expired.length;
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

export async function sendSubmissionNotification(row: typeof submissions.$inferSelect, requestUrl: string) {
  const { RESEND_API_KEY, SUBMISSION_NOTIFY_EMAIL, SUBMISSION_FROM_EMAIL } = runtimeSecrets();
  if (!RESEND_API_KEY || !SUBMISSION_NOTIFY_EMAIL) return { state: "skipped", error: "Email notification is not configured." } as const;
  const adminUrl = new URL(`/admin?submission=${encodeURIComponent(row.id)}`, requestUrl).toString();
  const creatorLabel = row.creatorType === "teacher" ? `Teacher · ${row.creatorRole ?? ""}` : `Student · ${row.gradeId}`;
  const text = [`New AI Workshop Hub submission`, `Reference: ${row.referenceCode}`, `Project: ${row.title}`, `Creator: ${row.creatorDisplayName}`, `Type: ${creatorLabel}`, `Contact: ${row.contactEmail}`, `Review: ${adminUrl}`].join("\n");
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: SUBMISSION_FROM_EMAIL || "AI Workshop Hub <onboarding@resend.dev>",
        to: [SUBMISSION_NOTIFY_EMAIL],
        subject: `[${row.referenceCode}] New project: ${row.title}`,
        text,
        html: `<h1>New AI Workshop Hub submission</h1><p><strong>${escapeHtml(row.title)}</strong> by ${escapeHtml(row.creatorDisplayName)}</p><ul><li>Reference: ${escapeHtml(row.referenceCode)}</li><li>Creator: ${escapeHtml(creatorLabel)}</li><li>Contact: ${escapeHtml(row.contactEmail)}</li></ul><p><a href="${escapeHtml(adminUrl)}">Open the review queue</a></p>`,
      }),
    });
    if (!response.ok) return { state: "failed", error: `Notification service returned ${response.status}.` } as const;
    return { state: "sent", error: null } as const;
  } catch {
    return { state: "failed", error: "The notification service could not be reached." } as const;
  }
}
