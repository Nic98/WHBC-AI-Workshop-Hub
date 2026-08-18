import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { projects, projectVersions } from "@/db/schema";
import { assertSameOrigin, isAdminRequest } from "@/lib/auth";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!assertSameOrigin(request)) return Response.json({ error: "This request was rejected." }, { status: 403 });
  if (!(await isAdminRequest(request))) return Response.json({ error: "Sign in to continue." }, { status: 401 });
  const { id } = await context.params;
  const payload = (await request.json().catch(() => null)) as { action?: string } | null;
  const [project] = await getDb().select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!project) return Response.json({ error: "Project not found." }, { status: 404 });
  const now = new Date().toISOString();

  if (payload?.action === "publish") {
    if (!project.coverKey) return Response.json({ error: "Upload a project cover before publishing." }, { status: 400 });
    if (project.sourceType !== "url") {
      if (!project.draftVersionId) return Response.json({ error: "Upload and verify project files before publishing." }, { status: 400 });
      const [version] = await getDb().select().from(projectVersions).where(eq(projectVersions.id, project.draftVersionId)).limit(1);
      if (!version || version.state !== "ready") return Response.json({ error: "Finish and verify the current file upload before publishing." }, { status: 400 });
    }
    await getDb().update(projects).set({
      status: "published", previousVersionId: project.currentVersionId,
      currentVersionId: project.sourceType === "url" ? project.currentVersionId : project.draftVersionId,
      draftVersionId: project.sourceType === "url" ? project.draftVersionId : null,
      publishedAt: now, updatedAt: now,
    }).where(eq(projects.id, id));
    return Response.json({ ok: true });
  }

  if (payload?.action === "unpublish") {
    await getDb().update(projects).set({ status: "unpublished", updatedAt: now }).where(eq(projects.id, id));
    return Response.json({ ok: true });
  }

  if (payload?.action === "rollback") {
    if (!project.previousVersionId) return Response.json({ error: "There is no previous published version to restore." }, { status: 400 });
    await getDb().update(projects).set({ currentVersionId: project.previousVersionId, previousVersionId: project.currentVersionId, status: "published", updatedAt: now, publishedAt: now }).where(eq(projects.id, id));
    return Response.json({ ok: true });
  }

  if (payload?.action === "feature" || payload?.action === "unfeature") {
    await getDb().update(projects).set({ featured: payload.action === "feature", updatedAt: now }).where(eq(projects.id, id));
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Unsupported project action." }, { status: 400 });
}
