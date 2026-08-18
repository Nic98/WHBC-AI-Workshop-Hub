import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { projects } from "@/db/schema";
import { isAdminRequest } from "@/lib/auth";
import { getProjectBucket } from "@/lib/storage";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const [project] = await getDb().select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!project?.coverKey || (project.status !== "published" && !(await isAdminRequest(request)))) return new Response("Not found", { status: 404 });
  const object = await getProjectBucket().get(project.coverKey);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("cache-control", project.status === "published" ? "public, max-age=3600" : "private, no-store");
  headers.set("etag", object.httpEtag);
  headers.set("x-content-type-options", "nosniff");
  return new Response(object.body, { headers });
}
