import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { projectVersions } from "@/db/schema";
import { assertSameOrigin, isAdminRequest } from "@/lib/auth";
import { getProjectBucket, ManifestFile, projectObjectKey } from "@/lib/storage";

export async function POST(request: Request, context: { params: Promise<{ id: string; versionId: string }> }) {
  if (!assertSameOrigin(request)) return Response.json({ error: "This request was rejected." }, { status: 403 });
  if (!(await isAdminRequest(request))) return Response.json({ error: "Sign in to continue." }, { status: 401 });
  const { id, versionId } = await context.params;
  const [version] = await getDb().select().from(projectVersions).where(and(eq(projectVersions.id, versionId), eq(projectVersions.projectId, id))).limit(1);
  if (!version) return Response.json({ error: "Upload version not found." }, { status: 404 });
  const manifest = JSON.parse(version.manifestJson) as ManifestFile[];
  const missing: string[] = [];
  for (const file of manifest) {
    const object = await getProjectBucket().head(projectObjectKey(id, versionId, file.path));
    if (!object || object.size !== file.size) missing.push(file.path);
    if (missing.length >= 5) break;
  }
  if (missing.length) return Response.json({ error: `Upload is incomplete. Missing or invalid: ${missing.join(", ")}` }, { status: 400 });
  await getDb().update(projectVersions).set({ state: "ready" }).where(eq(projectVersions.id, versionId));
  return Response.json({ ok: true, previewUrl: `/admin/preview/${id}` });
}
