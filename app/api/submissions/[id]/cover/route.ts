import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { submissions } from "@/db/schema";
import { getProjectBucket } from "@/lib/storage";
import { submissionCoverKey } from "@/lib/submission-storage";
import { authorizeSubmissionUpload } from "@/lib/submissions";
import { validateCoverBytes } from "@/lib/storage-validation";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const submission = await authorizeSubmissionUpload(request, id);
  if (!submission) return Response.json({ error: "This upload session is unavailable or has expired." }, { status: 401 });
  const bytes = new Uint8Array(await request.arrayBuffer());
  const validation = validateCoverBytes(bytes);
  if (!("type" in validation)) return Response.json({ error: validation.error }, { status: 400 });
  const key = submissionCoverKey(id, validation.extension);
  await getProjectBucket().put(key, bytes, { httpMetadata: { contentType: validation.type, cacheControl: "private, no-store" } });
  if (submission.coverKey && submission.coverKey !== key) await getProjectBucket().delete(submission.coverKey);
  await getDb().update(submissions).set({ coverKey: key, updatedAt: new Date().toISOString() }).where(eq(submissions.id, id));
  return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
