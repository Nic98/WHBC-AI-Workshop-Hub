import { getDb } from "@/db";
import { submissions } from "@/db/schema";
import { assertSameOrigin } from "@/lib/auth";
import { catalogSelectionExists } from "@/lib/catalog";
import {
  clearInviteFailures,
  createSubmissionReference,
  createUploadToken,
  isInviteAttemptBlocked,
  isSubmissionLimitReached,
  purgeExpiredSubmissions,
  recordInviteFailure,
  uploadingPurgeAfter,
  validateSubmissionPayload,
  verifyInviteCode,
} from "@/lib/submissions";

export async function POST(request: Request) {
  if (!assertSameOrigin(request)) return Response.json({ error: "This request was rejected." }, { status: 403 });
  if (await isInviteAttemptBlocked(request)) return Response.json({ error: "Too many invitation code attempts. Try again later." }, { status: 429 });
  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!payload || typeof payload.honeypot === "string" && payload.honeypot) return Response.json({ error: "The submission could not be accepted." }, { status: 400 });
  const inviteCode = typeof payload.inviteCode === "string" ? payload.inviteCode : "";
  if (!(await verifyInviteCode(inviteCode))) {
    await recordInviteFailure(request);
    return Response.json({ error: "The invitation code is not valid." }, { status: 403 });
  }
  await clearInviteFailures(request);

  const validation = validateSubmissionPayload(payload);
  if (!validation.data) return Response.json({ error: validation.error }, { status: 400 });
  const data = validation.data;
  if (data.creatorType === "student" && !(await catalogSelectionExists(data.gradeId))) return Response.json({ error: "Choose an available grade." }, { status: 400 });
  if (await isSubmissionLimitReached(request, data.contactEmail)) return Response.json({ error: "This email has reached today’s submission limit." }, { status: 429 });

  void purgeExpiredSubmissions().catch(() => undefined);
  const id = crypto.randomUUID();
  const token = await createUploadToken();
  const referenceCode = createSubmissionReference();
  await getDb().insert(submissions).values({
    id,
    referenceCode,
    creatorType: data.creatorType,
    creatorDisplayName: data.creatorDisplayName,
    contactEmail: data.contactEmail,
    gradeId: data.gradeId,
    creatorRole: data.creatorRole,
    title: data.title,
    description: data.description,
    categoriesJson: JSON.stringify(data.categories),
    technologiesJson: JSON.stringify(data.technologies),
    sourceType: data.sourceType,
    externalUrl: data.externalUrl,
    coverAlt: data.coverAlt,
    testInstructions: data.testInstructions,
    revisionReference: data.revisionReference,
    originalFilename: data.originalFilename,
    manifestJson: JSON.stringify(data.manifest),
    totalBytes: data.totalBytes,
    fileCount: data.manifest.length,
    uploadTokenHash: token.hash,
    uploadExpiresAt: token.expiresAt,
    rightsConfirmed: data.rightsConfirmed,
    purgeAfter: uploadingPurgeAfter(),
  });

  return Response.json({ submissionId: id, uploadToken: token.raw, referenceCode }, { status: 201, headers: { "cache-control": "no-store" } });
}
