import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { submissions } from "@/db/schema";
import { assertSameOrigin, isAdminRequest } from "@/lib/auth";
import { acceptSubmission } from "@/lib/submission-review";
import { logAudit, rejectedPurgeAfter, requiredReviewChecklist, sendSubmissionNotification } from "@/lib/submissions";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!assertSameOrigin(request) || !(await isAdminRequest(request))) return Response.json({ error: "Sign in to continue." }, { status: 401 });
  const { id } = await context.params;
  const payload = (await request.json().catch(() => null)) as { action?: unknown; checklist?: unknown } | null;
  const action = typeof payload?.action === "string" ? payload.action : "";
  const checklist = Array.isArray(payload?.checklist) ? [...new Set(payload.checklist.filter((item): item is string => typeof item === "string" && requiredReviewChecklist.includes(item as typeof requiredReviewChecklist[number])))] : [];
  const [submission] = await getDb().select().from(submissions).where(eq(submissions.id, id)).limit(1);
  if (!submission) return Response.json({ error: "Submission not found." }, { status: 404 });

  if (action === "accept") {
    if (requiredReviewChecklist.some((item) => !checklist.includes(item))) return Response.json({ error: "Complete every review check before accepting this project." }, { status: 400 });
    const result = await acceptSubmission(id, checklist);
    return "error" in result ? Response.json({ error: result.error }, { status: 400 }) : Response.json(result);
  }
  if (action === "retry-notification") {
    const notification = await sendSubmissionNotification(submission, request.url);
    await getDb().update(submissions).set({ notificationState: notification.state, notificationError: notification.error, updatedAt: new Date().toISOString() }).where(eq(submissions.id, id));
    await logAudit("submission.notification_retried", "submission", id, { state: notification.state });
    return Response.json({ notificationState: notification.state });
  }
  if (["reviewing", "changes_requested", "rejected"].includes(action)) {
    const now = new Date().toISOString();
    await getDb().update(submissions).set({ status: action, reviewChecklistJson: JSON.stringify(checklist), reviewedAt: action === "rejected" ? now : submission.reviewedAt, updatedAt: now, purgeAfter: action === "rejected" ? rejectedPurgeAfter() : null }).where(eq(submissions.id, id));
    await logAudit(`submission.${action}`, "submission", id, { referenceCode: submission.referenceCode });
    return Response.json({ ok: true });
  }
  return Response.json({ error: "Unsupported submission action." }, { status: 400 });
}
