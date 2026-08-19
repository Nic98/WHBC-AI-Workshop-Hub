import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@/db";
import { projects, projectVersions } from "@/db/schema";
import { isAdminPageSession, issueProjectPreviewToken } from "@/lib/auth";
import { localPreviewOrigin } from "@/lib/local-preview-origin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Project preview", robots: { index: false, follow: false } };

export default async function AdminProjectPreview({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminPageSession().catch(() => false))) redirect("/admin/login");
  const { id } = await params;
  const [project] = await getDb().select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!project) notFound();

  const versionId = project.draftVersionId ?? project.currentVersionId;
  if (project.sourceType !== "url") {
    if (!versionId) notFound();
    const [version] = await getDb().select({ state: projectVersions.state }).from(projectVersions).where(eq(projectVersions.id, versionId)).limit(1);
    if (!version || version.state !== "ready") notFound();
  }

  const previewToken = project.sourceType === "url" || !versionId ? null : await issueProjectPreviewToken(project.id, versionId);
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  const isolatedPreviewOrigin = localPreviewOrigin(host, protocol);
  const previewPath = `/embed-preview/${project.id}/${versionId}/${previewToken}/index.html`;
  const source = project.sourceType === "url" ? project.externalUrl : `${isolatedPreviewOrigin ?? ""}${previewPath}`;
  return (
    <main className="preview-shell">
      <header className="runner-bar">
        <a href="/admin">← Back to Admin</a>
        <div><strong>Preview · {project.title}</strong><span> · {project.studentName}</span></div>
        <span className="preview-badge">NOT PUBLIC</span>
      </header>
      <section className="runner-viewport">
        {project.sourceType === "url" && project.embedMode === "external" ? (
          <div className="preview-external"><span className="eyebrow">NEW TAB REQUIRED</span><h1>{project.title}</h1><p>This project prevents embedded viewing. Open it in a new tab to preview it safely.</p><a className="primary-button" href={source!} target="_blank" rel="noopener noreferrer">Open project ↗</a></div>
        ) : (
          <iframe allow="camera 'none'; microphone 'none'; geolocation 'none'; payment 'none'; usb 'none'" sandbox={project.sourceType === "url" || isolatedPreviewOrigin ? "allow-scripts allow-forms allow-downloads allow-modals allow-same-origin" : "allow-scripts allow-forms allow-downloads allow-modals"} src={source!} title={`Preview ${project.title}`} />
        )}
      </section>
    </main>
  );
}
