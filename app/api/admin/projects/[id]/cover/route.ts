import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { projects } from "@/db/schema";
import { assertSameOrigin, isAdminRequest } from "@/lib/auth";
import { coverObjectKey, getProjectBucket, MAX_COVER_BYTES } from "@/lib/storage";

const allowed = new Map([["image/png", "png"], ["image/jpeg", "jpg"], ["image/webp", "webp"], ["image/avif", "avif"]]);

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!assertSameOrigin(request)) return Response.json({ error: "This request was rejected." }, { status: 403 });
  if (!(await isAdminRequest(request))) return Response.json({ error: "Sign in to continue." }, { status: 401 });
  const { id } = await context.params;
  const type = request.headers.get("content-type")?.split(";")[0] ?? "";
  const extension = allowed.get(type);
  if (!extension) return Response.json({ error: "Use a PNG, JPEG, WebP, or AVIF cover." }, { status: 400 });
  const body = await request.arrayBuffer();
  if (!body.byteLength || body.byteLength > MAX_COVER_BYTES) return Response.json({ error: "Cover images must be smaller than 10 MB." }, { status: 400 });
  const [project] = await getDb().select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!project) return Response.json({ error: "Project not found." }, { status: 404 });
  const key = coverObjectKey(id, extension);
  await getProjectBucket().put(key, body, { httpMetadata: { contentType: type, cacheControl: "public, max-age=31536000, immutable" } });
  await getDb().update(projects).set({ coverKey: key, updatedAt: new Date().toISOString() }).where(eq(projects.id, id));
  if (project.coverKey && project.coverKey !== key) await getProjectBucket().delete(project.coverKey);
  return Response.json({ ok: true, coverUrl: `/media/covers/${id}` });
}
