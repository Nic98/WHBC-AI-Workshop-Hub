import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { projects, projectVersions } from "@/db/schema";
import { assertSameOrigin, isAdminRequest } from "@/lib/auth";
import { deleteProjectVersionObjects, validateManifest } from "@/lib/storage";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!assertSameOrigin(request)) return Response.json({ error: "This request was rejected." }, { status: 403 });
  if (!(await isAdminRequest(request))) return Response.json({ error: "Sign in to continue." }, { status: 401 });
  const { id } = await context.params;
  const payload = (await request.json().catch(() => null)) as { files?: unknown; originalFilename?: string } | null;
  const validation = validateManifest(payload?.files);
  if (!("files" in validation) || !validation.files) return Response.json({ error: validation.error }, { status: 400 });
  const [project] = await getDb().select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!project || project.sourceType === "url") return Response.json({ error: "This project cannot receive uploaded files." }, { status: 404 });

  if (project.draftVersionId) {
    await deleteProjectVersionObjects(id, project.draftVersionId);
    await getDb().delete(projectVersions).where(eq(projectVersions.id, project.draftVersionId));
  }

  const versionId = crypto.randomUUID();
  await getDb().batch([
    getDb().insert(projectVersions).values({
      id: versionId, projectId: id, state: "staging", entryPath: "index.html",
      originalFilename: payload?.originalFilename?.slice(0, 180), totalBytes: validation.totalBytes,
      fileCount: validation.files.length, manifestJson: JSON.stringify(validation.files),
    }),
    getDb().update(projects).set({ draftVersionId: versionId, updatedAt: new Date().toISOString() }).where(eq(projects.id, id)),
  ]);
  return Response.json({ versionId, files: validation.files }, { status: 201 });
}
