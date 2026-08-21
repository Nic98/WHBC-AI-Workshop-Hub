import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { submissions } from "@/db/schema";
import { isAdminRequest } from "@/lib/auth";
import { purgeExpiredSubmissions, serializeSubmission } from "@/lib/submissions";

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return Response.json({ error: "Sign in to continue." }, { status: 401 });
  await purgeExpiredSubmissions().catch(() => undefined);
  const rows = await getDb().select().from(submissions).orderBy(desc(submissions.createdAt)).limit(200);
  const serialized = rows.map(serializeSubmission);
  return Response.json({
    submissions: serialized,
    summary: {
      total: serialized.length,
      awaiting: serialized.filter((item) => item.status === "submitted" || item.status === "reviewing").length,
      accepted: serialized.filter((item) => item.status === "accepted").length,
    },
  }, { headers: { "cache-control": "no-store" } });
}
