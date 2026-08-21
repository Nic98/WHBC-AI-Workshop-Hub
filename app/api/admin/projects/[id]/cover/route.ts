import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { projects } from "@/db/schema";
import { assertSameOrigin, isAdminRequest } from "@/lib/auth";
import { coverObjectKey, getProjectBucket } from "@/lib/storage";
import { validateCoverBytes } from "@/lib/storage-validation";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!assertSameOrigin(request)) return Response.json({ error: "This request was rejected." }, { status: 403 });
  if (!(await isAdminRequest(request))) return Response.json({ error: "Sign in to continue." }, { status: 401 });
  const { id } = await context.params;
  const body = new Uint8Array(await request.arrayBuffer());
  const validation = validateCoverBytes(body);
  if (!("type" in validation)) return Response.json({ error: validation.error }, { status: 400 });
  const [project] = await getDb().select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!project) return Response.json({ error: "Project not found." }, { status: 404 });
  const key = coverObjectKey(id, validation.extension);
  await getProjectBucket().put(key, body, { httpMetadata: { contentType: validation.type, cacheControl: "public, max-age=31536000, immutable" } });
  await getDb().update(projects).set({ coverKey: key, updatedAt: new Date().toISOString() }).where(eq(projects.id, id));
  if (project.coverKey && project.coverKey !== key) await getProjectBucket().delete(project.coverKey);
  return Response.json({ ok: true, coverUrl: `/media/covers/${id}` });
}
