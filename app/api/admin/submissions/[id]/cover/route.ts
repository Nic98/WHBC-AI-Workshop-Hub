import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { submissions } from "@/db/schema";
import { isAdminRequest } from "@/lib/auth";
import { getProjectBucket } from "@/lib/storage";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(request))) return new Response("Not found", { status: 404 });
  const { id } = await context.params;
  const [submission] = await getDb().select({ coverKey: submissions.coverKey }).from(submissions).where(eq(submissions.id, id)).limit(1);
  if (!submission?.coverKey) return new Response("Not found", { status: 404 });
  const object = await getProjectBucket().get(submission.coverKey);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("cache-control", "private, no-store");
  headers.set("x-content-type-options", "nosniff");
  return new Response(object.body, { headers });
}
