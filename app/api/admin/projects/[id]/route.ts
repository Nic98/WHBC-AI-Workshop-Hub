import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { projects, projectVersions } from "@/db/schema";
import { assertSameOrigin, isAdminRequest } from "@/lib/auth";
import { catalogSelectionExists, serializeProject, validateProjectPayload } from "@/lib/catalog";
import { fetchExternalImage, inspectExternalProjectUrl } from "@/lib/external";
import { coverObjectKey, deleteProjectObjects, getProjectBucket } from "@/lib/storage";

async function authorize(request: Request) {
  return assertSameOrigin(request) && await isAdminRequest(request);
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await authorize(request))) return Response.json({ error: "Sign in to continue." }, { status: 401 });
  const { id } = await context.params;
  const [existing] = await getDb().select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!existing) return Response.json({ error: "Project not found." }, { status: 404 });
  const validation = validateProjectPayload(await request.json().catch(() => null));
  if (!validation.data) return Response.json({ error: validation.error }, { status: 400 });
  const data = validation.data;
  if (data.creatorType === "student" && !(await catalogSelectionExists(data.gradeId))) return Response.json({ error: "Choose an available grade." }, { status: 400 });
  const external = data.sourceType === "url" ? await inspectExternalProjectUrl(data.externalUrl!) : null;
  const [updated] = await getDb().update(projects).set({
    title: data.title,
    description: data.description,
    studentName: data.studentName,
    creatorType: data.creatorType,
    creatorRole: data.creatorRole,
    gradeId: data.gradeId,
    classId: "",
    category: data.categories[0],
    categoriesJson: JSON.stringify(data.categories),
    technologiesJson: JSON.stringify(data.technologies),
    coverAlt: data.coverAlt,
    sourceType: data.sourceType,
    externalUrl: external?.url ?? null,
    embedMode: external?.embedMode ?? "embedded",
    updatedAt: new Date().toISOString(),
  }).where(eq(projects.id, id)).returning();

  let savedProject = updated;
  if (!updated.coverKey && external?.ogImageUrl) {
    const image = await fetchExternalImage(external.ogImageUrl).catch(() => null);
    if (image) {
      const key = coverObjectKey(id, image.extension);
      await getProjectBucket().put(key, image.bytes, { httpMetadata: { contentType: image.type, cacheControl: "public, max-age=31536000, immutable" } });
      const [withCover] = await getDb().update(projects).set({ coverKey: key }).where(eq(projects.id, id)).returning();
      savedProject = withCover;
    }
  }
  return Response.json({ project: serializeProject(savedProject) });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await authorize(request))) return Response.json({ error: "Sign in to continue." }, { status: 401 });
  const { id } = await context.params;
  const [existing] = await getDb().select({ id: projects.id }).from(projects).where(eq(projects.id, id)).limit(1);
  if (!existing) return Response.json({ error: "Project not found." }, { status: 404 });
  await deleteProjectObjects(id);
  await getDb().batch([
    getDb().delete(projectVersions).where(eq(projectVersions.projectId, id)),
    getDb().delete(projects).where(eq(projects.id, id)),
  ]);
  return Response.json({ ok: true });
}
