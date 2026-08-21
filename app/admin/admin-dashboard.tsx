"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { prepareProjectFile } from "@/lib/project-upload";
import { InviteSettings } from "./invite-settings";
import { SubmissionsPanel } from "./submissions-panel";

type Option = { id: string; label: string; active: boolean; sortOrder: number };
type Project = {
  id: string; slug: string; title: string; description: string; studentName: string; creatorType: "student" | "teacher";
  creatorRole: string | null; gradeId: string; category: string; categories: string[]; technologies: string[]; coverAlt: string;
  status: string; sourceType: string; externalUrl: string | null; embedMode: string; featured: boolean; coverKey: string | null;
  draftVersionId: string | null; draftReady: boolean; currentVersionId: string | null; currentReady: boolean;
  previousVersionId: string | null; updatedAt: string; views: number;
};
type DashboardData = { projects: Project[]; options: { grades: Option[]; categories: string[]; technologies: string[] } };
type AdminSection = "projects" | "submissions" | "settings";

function MultiChoiceField({ legend, name, options, defaults = [] }: { legend: string; name: string; options: readonly string[]; defaults?: string[] }) {
  return <fieldset className="choice-field span-two"><legend>{legend}</legend><div className="choice-grid">{options.map((option) => <label key={option}><input name={name} type="checkbox" value={option} defaultChecked={defaults.includes(option)} /><span>{option}</span></label>)}</div></fieldset>;
}

function CreatorFields({ options, firstGrade, project }: { options: DashboardData["options"]; firstGrade: string; project?: Project }) {
  const [creatorType, setCreatorType] = useState<"student" | "teacher">(project?.creatorType ?? "student");
  return <>
    <label>Creator type / 创建者身份<select name="creatorType" value={creatorType} onChange={(event) => setCreatorType(event.target.value as "student" | "teacher")}><option value="student">Student / 学生</option><option value="teacher">Teacher / 教师</option></select></label>
    <label>English display name<input name="studentName" defaultValue={project?.studentName ?? ""} maxLength={60} required /></label>
    {creatorType === "student" ? <label>Grade<select name="gradeId" defaultValue={project?.gradeId || firstGrade}>{options.grades.filter((option) => option.active || option.id === project?.gradeId).map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label> : <label>Subject or department<input name="creatorRole" defaultValue={project?.creatorRole ?? ""} maxLength={60} placeholder="English · Humanities" required /></label>}
  </>;
}

async function jsonResult(response: Response) {
  return (await response.json().catch(() => ({}))) as { error?: string };
}

export function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [activeSection, setActiveSection] = useState<AdminSection>("projects");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [pending, setPending] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState("");

  async function load() {
    const response = await fetch("/api/admin/projects", { cache: "no-store" });
    if (response.status === 401) return window.location.assign("/admin/login");
    const result = (await response.json().catch(() => ({}))) as DashboardData & { error?: string };
    if (!response.ok) return setError(result.error ?? "The project list could not be loaded.");
    setData(result);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (new URLSearchParams(window.location.search).has("submission")) setActiveSection("submissions");
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const firstGrade = data?.options.grades.find((option) => option.active)?.id ?? "";
  const summary = useMemo(() => ({ total: data?.projects.length ?? 0, published: data?.projects.filter((project) => project.status === "published").length ?? 0, drafts: data?.projects.filter((project) => project.status === "draft").length ?? 0, views: data?.projects.reduce((total, project) => total + (project.views ?? 0), 0) ?? 0 }), [data]);

  function projectPayload(form: FormData) {
    return {
      title: form.get("title"), description: form.get("description"), studentName: form.get("studentName"), creatorType: form.get("creatorType"), creatorRole: form.get("creatorRole"),
      gradeId: form.get("gradeId"), categories: form.getAll("categories"), technologies: form.getAll("technologies"), coverAlt: form.get("coverAlt"), sourceType: form.get("sourceType"), externalUrl: form.get("externalUrl"),
    };
  }

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const formElement = event.currentTarget; setPending(true); setError(""); setNotice("");
    const response = await fetch("/api/admin/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(projectPayload(new FormData(formElement))) });
    const result = await jsonResult(response); setPending(false);
    if (!response.ok) return setError(result.error ?? "The draft could not be created.");
    formElement.reset(); setShowForm(false); setNotice("Draft created. Add project files and a cover before publishing."); await load();
  }

  async function logout() { await fetch("/api/admin/logout", { method: "POST" }); window.location.assign("/admin/login"); }

  async function uploadProject(project: Project, file: File) {
    setError(""); setNotice(""); setUploadProgress("Preparing project files…");
    try {
      const files = await prepareProjectFile(file);
      const createResponse = await fetch(`/api/admin/projects/${project.id}/versions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ originalFilename: file.name, files: files.map((item) => ({ path: item.path, size: item.bytes.byteLength, type: item.type })) }) });
      const created = (await createResponse.json()) as { versionId?: string; error?: string };
      if (!createResponse.ok || !created.versionId) throw new Error(created.error ?? "The upload could not be started.");
      for (let index = 0; index < files.length; index += 1) {
        const item = files[index]; setUploadProgress(`Uploading ${index + 1} of ${files.length}: ${item.path}`);
        const body = item.bytes.buffer.slice(item.bytes.byteOffset, item.bytes.byteOffset + item.bytes.byteLength) as ArrayBuffer;
        const response = await fetch(`/api/admin/projects/${project.id}/versions/${created.versionId}/files?path=${encodeURIComponent(item.path)}`, { method: "PUT", body });
        const result = await jsonResult(response); if (!response.ok) throw new Error(result.error ?? `The file ${item.path} could not be uploaded.`);
      }
      setUploadProgress("Verifying uploaded files…");
      const finalizeResponse = await fetch(`/api/admin/projects/${project.id}/versions/${created.versionId}/finalize`, { method: "POST" });
      const finalized = await jsonResult(finalizeResponse); if (!finalizeResponse.ok) throw new Error(finalized.error ?? "The uploaded project could not be verified.");
      setUploadProgress(""); setNotice("Project files are ready. Preview and publish when the cover is in place."); await load();
    } catch (reason) { setUploadProgress(""); setError(reason instanceof Error ? reason.message : "Project upload failed."); }
  }

  async function uploadCover(project: Project, file: File) {
    setError(""); setUploadProgress("Uploading project cover…");
    const response = await fetch(`/api/admin/projects/${project.id}/cover`, { method: "PUT", headers: { "content-type": file.type }, body: file });
    const result = await jsonResult(response); setUploadProgress("");
    if (!response.ok) return setError(result.error ?? "The cover could not be uploaded.");
    setNotice("Project cover updated."); await load();
  }

  async function projectAction(project: Project, action: string) {
    setError(""); setNotice("");
    const response = await fetch(`/api/admin/projects/${project.id}/actions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) });
    const result = await jsonResult(response); if (!response.ok) return setError(result.error ?? "The project could not be updated.");
    setNotice("Project status updated."); await load();
  }

  async function editProject(project: Project, event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(""); setNotice("");
    const response = await fetch(`/api/admin/projects/${project.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(projectPayload(new FormData(event.currentTarget))) });
    const result = await jsonResult(response); setPending(false);
    if (!response.ok) return setError(result.error ?? "The project could not be updated.");
    setEditingId(null); setNotice("Project details updated."); await load();
  }

  async function deleteProject(project: Project) {
    if (!window.confirm(`Delete “${project.title}” and all uploaded files? This cannot be undone.`)) return;
    const response = await fetch(`/api/admin/projects/${project.id}`, { method: "DELETE" }); const result = await jsonResult(response);
    if (!response.ok) return setError(result.error ?? "The project could not be deleted.");
    setSelectedId(null); setNotice("Project deleted."); await load();
  }

  async function addGrade(label: string) {
    const response = await fetch("/api/admin/options", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "grade", label }) }); const result = await jsonResult(response);
    if (!response.ok) return setError(result.error ?? "The grade could not be added."); setNotice("Grade added."); await load();
  }
  async function toggleGrade(option: Option) {
    const response = await fetch("/api/admin/options", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "grade", id: option.id, active: !option.active }) }); const result = await jsonResult(response);
    if (!response.ok) return setError(result.error ?? "The grade could not be updated."); setNotice(`${option.label} ${option.active ? "hidden" : "restored"}.`); await load();
  }
  async function renameGrade(option: Option) {
    const label = window.prompt(`Rename ${option.label}`, option.label)?.trim(); if (!label || label === option.label) return;
    const response = await fetch("/api/admin/options", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "grade", id: option.id, label }) }); const result = await jsonResult(response);
    if (!response.ok) return setError(result.error ?? "The grade could not be renamed."); setNotice(`${option.label} renamed.`); await load();
  }

  return <main className="admin-shell">
    <header className="admin-header"><Link className="wordmark" href="/">AI WORKSHOP HUB</Link><div><Link href="/" target="_blank" rel="noreferrer">View gallery ↗</Link><button onClick={logout}>Sign out</button></div></header>
    <div className="admin-content">
      <div className="admin-title-row"><div><span className="eyebrow">ADMIN WORKSPACE · 管理后台</span><h1>Workshop hub</h1><p>Review submissions, test projects and decide what the community can explore.</p></div>{activeSection === "projects" ? <button className="primary-button" onClick={() => setShowForm((value) => !value)}>{showForm ? "Close form" : "+ New project"}</button> : null}</div>
      <nav className="admin-tabs" aria-label="Admin sections"><button className={activeSection === "projects" ? "active" : ""} onClick={() => setActiveSection("projects")}>Projects</button><button className={activeSection === "submissions" ? "active" : ""} onClick={() => setActiveSection("submissions")}>Submissions</button><button className={activeSection === "settings" ? "active" : ""} onClick={() => setActiveSection("settings")}>Settings</button></nav>

      {activeSection === "submissions" ? <SubmissionsPanel /> : null}
      {activeSection === "settings" ? <div className="settings-stack"><InviteSettings />{data ? <section className="option-settings"><div className="form-heading"><div><span className="project-tag">CATALOG SETTINGS</span><h2>Grade settings</h2></div><p>Student projects use grade only. Class is no longer collected or displayed.</p></div><div className="option-columns"><div><h3>Grades</h3><form onSubmit={(event) => { event.preventDefault(); const input = new FormData(event.currentTarget).get("label"); if (typeof input === "string" && input.trim()) { void addGrade(input.trim()); event.currentTarget.reset(); } }}><input aria-label="New grade label" name="label" placeholder="Add grade" required maxLength={40} /><button type="submit">Add</button></form><ul>{data.options.grades.map((option) => <li key={option.id}><span>{option.label}</span><span className="option-row-actions"><button type="button" onClick={() => void renameGrade(option)}>Rename</button><button type="button" onClick={() => void toggleGrade(option)}>{option.active ? "Hide" : "Restore"}</button></span></li>)}</ul></div></div></section> : null}</div> : null}

      {activeSection === "projects" ? <>
        <section className="admin-stats" aria-label="Project summary"><div><span>ALL PROJECTS</span><strong>{summary.total}</strong></div><div><span>PUBLISHED</span><strong>{summary.published}</strong></div><div><span>DRAFTS</span><strong>{summary.drafts}</strong></div><div><span>PRIVATE VIEWS</span><strong>{summary.views}</strong></div></section>
        {showForm && data ? <ProjectForm data={data} firstGrade={firstGrade} pending={pending} onSubmit={createProject} onCancel={() => setShowForm(false)} /> : null}
        {uploadProgress ? <p className="admin-notice" role="status">{uploadProgress}</p> : null}{notice ? <p className="admin-notice" role="status">{notice}</p> : null}{error ? <p className="form-error" role="alert">{error}</p> : null}
        <section className="project-table" aria-label="Projects"><div className="table-head"><span>PROJECT</span><span>CATEGORY</span><span>STATUS</span><span>ACTIONS</span></div>
          {!data ? <p className="table-empty">Loading projects…</p> : data.projects.length === 0 ? <p className="table-empty">No projects yet. Accept a submission or create the first draft.</p> : data.projects.map((project) => <div key={project.id}><article className="project-row"><div><strong>{project.title}</strong><span>{project.creatorType === "teacher" ? "Teacher" : "Student"} · {project.studentName} · {project.views ?? 0} private views</span></div><span>{project.categories.join(" · ")}</span><span className={`status status-${project.status}`}>{project.status}</span><button className="manage-button" onClick={() => setSelectedId(selectedId === project.id ? null : project.id)}>{selectedId === project.id ? "Close" : "Manage"}</button></article>
            {selectedId === project.id ? <section className="manage-panel"><div><span className="eyebrow">PROJECT FILES</span><h3>{project.title}</h3><p>{project.sourceType === "url" ? "This project launches from its deployed HTTPS address." : project.draftReady ? "A verified draft version is ready." : project.draftVersionId ? "The latest upload is incomplete." : project.currentReady ? "The published version is ready to preview." : "Upload a single HTML file or ZIP project."}</p></div><div className="manage-controls">
              {project.sourceType !== "url" ? <label className="file-control">Upload project<input type="file" accept=".html,.zip,text/html,application/zip" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadProject(project, file); }} /></label> : null}
              <label className="file-control">{project.coverKey ? "Replace cover" : "Upload cover"}<input type="file" accept="image/png,image/jpeg,image/webp,image/avif" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadCover(project, file); }} /></label>
              {(project.sourceType === "url" || project.draftReady || project.currentReady) ? <a href={`/admin/preview/${project.id}`} target="_blank" rel="noreferrer">Preview ↗</a> : null}
              {project.status === "published" ? <button onClick={() => void projectAction(project, "unpublish")}>Unpublish</button> : <button className="ink-control" onClick={() => void projectAction(project, "publish")}>Publish</button>}
              <button onClick={() => void projectAction(project, project.featured ? "unfeature" : "feature")}>{project.featured ? "Remove featured" : "Make featured"}</button>{project.previousVersionId ? <button onClick={() => void projectAction(project, "rollback")}>Restore previous</button> : null}<button onClick={() => setEditingId(editingId === project.id ? null : project.id)}>{editingId === project.id ? "Close editor" : "Edit details"}</button><button className="danger-control" onClick={() => void deleteProject(project)}>Delete project</button></div>
              {editingId === project.id && data ? <ProjectForm data={data} firstGrade={firstGrade} pending={pending} project={project} onSubmit={(event) => void editProject(project, event)} onCancel={() => setEditingId(null)} /> : null}
            </section> : null}</div>)}
        </section>
      </> : null}
    </div>
  </main>;
}

function ProjectForm({ data, firstGrade, pending, project, onSubmit, onCancel }: { data: DashboardData; firstGrade: string; pending: boolean; project?: Project; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  return <form className={`project-form${project ? " compact-project-form" : ""}`} onSubmit={onSubmit}><div className="form-heading"><div><span className="project-tag">{project ? "EDIT DRAFT" : "NEW DRAFT"}</span><h2>Project details</h2></div><p>Students use grade only; teachers use subject or department.</p></div><div className="form-grid">
    <label>Project title<input name="title" maxLength={42} defaultValue={project?.title ?? ""} required /></label><CreatorFields options={data.options} firstGrade={firstGrade} project={project} />
    <label className="span-two">Short description<textarea name="description" maxLength={180} defaultValue={project?.description ?? ""} required /></label>
    <label>Source<select name="sourceType" defaultValue={project?.sourceType ?? "html"}><option value="html">Single HTML</option><option value="zip">ZIP project</option><option value="url">Deployed HTTPS URL</option></select></label>
    <MultiChoiceField legend="Category / 项目类别（可多选）" name="categories" options={data.options.categories} defaults={project?.categories} /><MultiChoiceField legend="Technologies / 使用技术（可多选）" name="technologies" options={data.options.technologies} defaults={project?.technologies} />
    <label className="span-two">External URL <span>(URL projects only)</span><input name="externalUrl" type="url" defaultValue={project?.externalUrl ?? ""} placeholder="https://" /></label><label className="span-two">Cover alt text<input name="coverAlt" defaultValue={project?.coverAlt ?? ""} required /></label>
  </div><div className="form-actions"><button className="secondary-button" type="button" onClick={onCancel}>Cancel</button><button className="primary-button" disabled={pending} type="submit">{pending ? "Saving…" : project ? "Save changes" : "Create draft"}</button></div></form>;
}
