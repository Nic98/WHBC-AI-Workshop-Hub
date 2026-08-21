import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { submissions } from "@/db/schema";
import { assertSameOrigin } from "@/lib/auth";
import { getProjectBucket } from "@/lib/storage";
import { submissionFileKey } from "@/lib/submission-storage";
import { authorizeSubmissionUpload, logAudit, recordSubmissionCompleted, sendSubmissionNotification } from "@/lib/submissions";
import { ManifestFile } from "@/lib/storage-validation";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!assertSameOrigin(request)) return Response.json({ error: "This request was rejected." }, { status: 403 });
  const { id } = await context.params;
  const submission = await authorizeSubmissionUpload(request, id);
  if (!submission) return Response.json({ error: "This upload session is unavailable or has expired." }, { status: 401 });
  if (!submission.coverKey || !(await getProjectBucket().head(submission.coverKey))) return Response.json({ error: "Upload a valid project cover before submitting." }, { status: 400 });
  if (submission.sourceType !== "url") {
    const manifest = JSON.parse(submission.manifestJson) as ManifestFile[];
    const missing: string[] = [];
    for (const file of manifest) {
      const object = await getProjectBucket().head(submissionFileKey(id, file.path));
      if (!object || object.size !== file.size) missing.push(file.path);
      if (missing.length >= 5) break;
    }
    if (missing.length) return Response.json({ error: `The upload is incomplete. Missing or invalid: ${missing.join(", ")}` }, { status: 400 });
  }

  const now = new Date().toISOString();
  await getDb().update(submissions).set({ status: "submitted", uploadTokenHash: null, uploadExpiresAt: null, purgeAfter: null, updatedAt: now, notificationState: "pending", notificationError: null }).where(eq(submissions.id, id));
  await recordSubmissionCompleted(request, submission.contactEmail);
  const notification = await sendSubmissionNotification({ ...submission, status: "submitted", uploadTokenHash: null, uploadExpiresAt: null, purgeAfter: null, updatedAt: now }, request.url);
  await getDb().update(submissions).set({ notificationState: notification.state, notificationError: notification.error }).where(eq(submissions.id, id));
  await logAudit("submission.received", "submission", id, { referenceCode: submission.referenceCode, notificationState: notification.state });
  return Response.json({ referenceCode: submission.referenceCode, notificationState: notification.state }, { headers: { "cache-control": "no-store" } });
}
