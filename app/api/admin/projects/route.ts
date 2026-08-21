import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { projectDailyMetrics, projects, projectVersions } from "@/db/schema";
import { assertSameOrigin, isAdminRequest } from "@/lib/auth";
import { catalogSelectionExists, getAdminCatalogOptions, serializeProject, uniqueSlug, validateProjectPayload } from "@/lib/catalog";
import { fetchExternalImage, inspectExternalProjectUrl } from "@/lib/external";
import { coverObjectKey, getProjectBucket } from "@/lib/storage";

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return Response.json({ error: "Sign in to continue." }, { status: 401 });
  const [rows, options, versions, metricRows] = await Promise.all([
    getDb().select().from(projects).orderBy(desc(projects.updatedAt)),
    getAdminCatalogOptions(),
    getDb().select({ id: projectVersions.id, state: projectVersions.state }).from(projectVersions),
    getDb().select({ projectId: projectDailyMetrics.projectId, views: projectDailyMetrics.views }).from(projectDailyMetrics),
  ]);
  const versionStates = new Map(versions.map((version) => [version.id, version.state]));
  const viewTotals = new Map<string, number>();
  for (const metric of metricRows) viewTotals.set(metric.projectId, (viewTotals.get(metric.projectId) ?? 0) + metric.views);
  return Response.json({
    projects: rows.map((row) => ({
      ...serializeProject(row),
      draftReady: Boolean(row.draftVersionId && versionStates.get(row.draftVersionId) === "ready"),
      currentReady: Boolean(row.currentVersionId && versionStates.get(row.currentVersionId) === "ready"),
      views: viewTotals.get(row.id) ?? 0,
    })),
    options,
  }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  if (!assertSameOrigin(request)) return Response.json({ error: "This request was rejected." }, { status: 403 });
  if (!(await isAdminRequest(request))) return Response.json({ error: "Sign in to continue." }, { status: 401 });
  const validation = validateProjectPayload(await request.json().catch(() => null));
  if (!validation.data) return Response.json({ error: validation.error }, { status: 400 });
  const data = validation.data;
  if (data.creatorType === "student" && !(await catalogSelectionExists(data.gradeId))) return Response.json({ error: "Choose an available grade." }, { status: 400 });
  const external = data.sourceType === "url" ? await inspectExternalProjectUrl(data.externalUrl!) : null;
  const id = crypto.randomUUID();
  const [project] = await getDb().insert(projects).values({
    id,
    slug: await uniqueSlug(data.title),
    sourceType: data.sourceType,
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
    externalUrl: external?.url ?? null,
    embedMode: external?.embedMode ?? "embedded",
    coverAlt: data.coverAlt,
  }).returning();
  let savedProject = project;
  if (external?.ogImageUrl) {
    const image = await fetchExternalImage(external.ogImageUrl).catch(() => null);
    if (image) {
      const key = coverObjectKey(id, image.extension);
      await getProjectBucket().put(key, image.bytes, { httpMetadata: { contentType: image.type, cacheControl: "public, max-age=31536000, immutable" } });
      const [updated] = await getDb().update(projects).set({ coverKey: key }).where(eq(projects.id, id)).returning();
      savedProject = updated;
    }
  }
  return Response.json({ project: serializeProject(savedProject) }, { status: 201 });
}
