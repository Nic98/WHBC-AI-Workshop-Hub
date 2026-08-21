import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { projectDailyMetrics, projects } from "@/db/schema";
import { assertSameOrigin } from "@/lib/auth";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!assertSameOrigin(request)) return Response.json({ error: "This request was rejected." }, { status: 403 });
  const { id } = await context.params;
  const [project] = await getDb().select({ id: projects.id }).from(projects).where(and(eq(projects.id, id), eq(projects.status, "published"))).limit(1);
  if (!project) return Response.json({ error: "Project not found." }, { status: 404 });
  const day = new Date().toISOString().slice(0, 10);
  const metricId = `${id}:${day}`;
  await getDb().insert(projectDailyMetrics).values({ id: metricId, projectId: id, day, views: 1 }).onConflictDoUpdate({ target: projectDailyMetrics.id, set: { views: sql`${projectDailyMetrics.views} + 1` } });
  return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
