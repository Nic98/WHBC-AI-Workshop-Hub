"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { prepareProjectFile } from "@/lib/project-upload";

type Option = { id: string; label: string; active: boolean; sortOrder: number };
type Project = {
  id: string;
  slug: string;
  title: string;
  description: string;
  studentName: string;
  creatorType: "student" | "teacher";
  creatorRole: string | null;
  gradeId: string;
  classId: string;
  category: string;
  categories: string[];
  technologies: string[];
  coverAlt: string;
  status: string;
  sourceType: string;
  externalUrl: string | null;
  embedMode: string;
  featured: boolean;
  coverKey: string | null;
  draftVersionId: string | null;
  draftReady: boolean;
  currentVersionId: string | null;
  currentReady: boolean;
  previousVersionId: string | null;
  updatedAt: string;
};
type DashboardData = {
  projects: Project[];
  options: { grades: Option[]; classes: Option[]; categories: string[]; technologies: string[]; classProgrammes: string[]; classNumbers: number[] };
};

function MultiChoiceField({ legend, name, options, defaults = [] }: { legend: string; name: string; options: readonly string[]; defaults?: string[] }) {
  return <fieldset className="choice-field span-two"><legend>{legend}</legend><div className="choice-grid">{options.map((option) => <label key={option}><input name={name} type="checkbox" value={option} defaultChecked={defaults.includes(option)} /><span>{option}</span></label>)}</div></fieldset>;
}

function classParts(project: Project, options: DashboardData["options"]) {
  const label = options.classes.find((option) => option.id === project.classId)?.label ?? project.classId;
  const match = /^(PreAP|PreDP|PA)(\d+)$/.exec(label);
  return { programme: match?.[1] ?? "PreDP", number: Number(match?.[2] ?? 1) };
}

function CreatorFields({ options, firstGrade, project }: { options: DashboardData["options"]; firstGrade: string; project?: Project }) {
  const [creatorType, setCreatorType] = useState<"student" | "teacher">(project?.creatorType ?? "student");
  const parts = project ? classParts(project, options) : { programme: "PreDP", number: 1 };
  return <>
    <label>Creator type / 创建者身份<select name="creatorType" value={creatorType} onChange={(event) => setCreatorType(event.target.value as "student" | "teacher")}><option value="student">Student / 学生</option><option value="teacher">Teacher / 教师</option></select></label>
    <label>{creatorType === "teacher" ? "Teacher display name" : "Student display name"}<input name="studentName" defaultValue={project?.studentName ?? ""} maxLength={60} required /></label>
    {creatorType === "student" ? <>
      <label>Grade<select name="gradeId" defaultValue={project?.gradeId || firstGrade}>{options.grades.filter((option) => option.active || option.id === project?.gradeId).map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
      <label>Programme / 课程<select name="classProgramme" defaultValue={parts.programme}>{options.classProgrammes.map((programme) => <option key={programme}>{programme}</option>)}</select></label>
      <label>Class number / 班级<select name="classNumber" defaultValue={parts.number}>{options.classNumbers.map((number) => <option key={number} value={number}>{number}</option>)}</select></label>
    </> : <label className="span-two">Role / Department / 职位或部门<input name="creatorRole" defaultValue={project?.creatorRole ?? ""} maxLength={60} placeholder="Teacher · AI Workshop" required /></label>}
  </>;
}

export function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [pending, setPending] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");

  async function load() {
    const response = await fetch("/api/admin/projects", { cache: "no-store" });
    if (response.status === 401) return window.location.assign("/admin/login");
    const result = (await response.json().catch(() => ({}))) as DashboardData & { error?: string };
    if (!response.ok) return setError(result.error ?? "The project list could not be loaded.");
    setData(result);
  }

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, []);
  const firstGrade = data?.options.grades.find((option) => option.active)?.id ?? "";
  const summary = useMemo(() => ({
    total: data?.projects.length ?? 0,
    published: data?.projects.filter((project) => project.status === "published").length ?? 0,
    drafts: data?.projects.filter((project) => project.status === "draft").length ?? 0,
  }), [data]);

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setPending(true);
    setError("");
    setNotice("");
    const form = new FormData(formElement);
    const creatorType = String(form.get("creatorType") ?? "student");
    const classId = creatorType === "teacher" ? "" : `${String(form.get("classProgramme") ?? "").toLowerCase()}${String(form.get("classNumber") ?? "")}`;
    const response = await fetch("/api/admin/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"), description: form.get("description"), studentName: form.get("studentName"), creatorType,
        creatorRole: form.get("creatorRole"),
        gradeId: form.get("gradeId"), classId, categories: form.getAll("categories"),
        technologies: form.getAll("technologies"), coverAlt: form.get("coverAlt"),
        sourceType: form.get("sourceType"), externalUrl: form.get("externalUrl"),
      }),
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    setPending(false);
    if (!response.ok) return setError(result.error ?? "The draft could not be created.");
    formElement.reset();
    setShowForm(false);
    setNotice("Draft created. Add project files and a cover before publishing.");
    await load();
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.assign("/admin/login");
  }

  async function uploadProject(project: Project, file: File) {
    setError("");
    setNotice("");
    setUploadProgress("Preparing project files…");
    try {
      const files = await prepareProjectFile(file);

      const createResponse = await fetch(`/api/admin/projects/${project.id}/versions`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ originalFilename: file.name, files: files.map((item) => ({ path: item.path, size: item.bytes.byteLength, type: item.type })) }),
      });
      const created = (await createResponse.json()) as { versionId?: string; error?: string };
      if (!createResponse.ok || !created.versionId) throw new Error(created.error ?? "The upload could not be started.");

      for (let index = 0; index < files.length; index += 1) {
        const item = files[index];
        setUploadProgress(`Uploading ${index + 1} of ${files.length}: ${item.path}`);
        const body = item.bytes.buffer.slice(item.bytes.byteOffset, item.bytes.byteOffset + item.bytes.byteLength) as ArrayBuffer;
        const response = await fetch(`/api/admin/projects/${project.id}/versions/${created.versionId}/files?path=${encodeURIComponent(item.path)}`, { method: "PUT", body });
        const result = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) throw new Error(result.error ?? `The file ${item.path} could not be uploaded.`);
      }

      setUploadProgress("Verifying uploaded files…");
      const finalizeResponse = await fetch(`/api/admin/projects/${project.id}/versions/${created.versionId}/finalize`, { method: "POST" });
      const finalized = (await finalizeResponse.json()) as { error?: string };
      if (!finalizeResponse.ok) throw new Error(finalized.error ?? "The uploaded project could not be verified.");
      setUploadProgress("");
      setNotice("Project files are ready. Preview and publish when the cover is in place.");
      await load();
    } catch (reason) {
      setUploadProgress("");
      setError(reason instanceof Error ? reason.message : "Project upload failed.");
    }
  }

  async function uploadCover(project: Project, file: File) {
    setError("");
    setUploadProgress("Uploading project cover…");
    const response = await fetch(`/api/admin/projects/${project.id}/cover`, { method: "PUT", headers: { "content-type": file.type }, body: file });
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    setUploadProgress("");
    if (!response.ok) return setError(result.error ?? "The cover could not be uploaded.");
    setNotice("Project cover updated.");
    await load();
  }

  async function projectAction(project: Project, action: string) {
    setError("");
    setNotice("");
    const response = await fetch(`/api/admin/projects/${project.id}/actions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) });
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) return setError(result.error ?? "The project could not be updated.");
    setNotice("Project status updated.");
    await load();
  }

  async function editProject(project: Project, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true); setError(""); setNotice("");
    const form = new FormData(event.currentTarget);
    const creatorType = String(form.get("creatorType") ?? "student");
    const classId = creatorType === "teacher" ? "" : `${String(form.get("classProgramme") ?? "").toLowerCase()}${String(form.get("classNumber") ?? "")}`;
    const response = await fetch(`/api/admin/projects/${project.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"), description: form.get("description"), studentName: form.get("studentName"), creatorType,
        creatorRole: form.get("creatorRole"),
        gradeId: form.get("gradeId"), classId, categories: form.getAll("categories"),
        technologies: form.getAll("technologies"), coverAlt: form.get("coverAlt"),
        sourceType: form.get("sourceType"), externalUrl: form.get("externalUrl"),
      }),
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    setPending(false);
    if (!response.ok) return setError(result.error ?? "The project could not be updated.");
    setEditingId(null); setNotice("Project details updated."); await load();
  }

  async function deleteProject(project: Project) {
    if (!window.confirm(`Delete “${project.title}” and all of its uploaded files? This cannot be undone.`)) return;
    setError(""); setNotice("");
    const response = await fetch(`/api/admin/projects/${project.id}`, { method: "DELETE" });
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) return setError(result.error ?? "The project could not be deleted.");
    setSelectedId(null); setNotice("Project deleted."); await load();
  }

  async function addOption(type: "grade" | "class", label: string) {
    const response = await fetch("/api/admin/options", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type, label }) });
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) return setError(result.error ?? "The option could not be added.");
    setNotice(`${type === "grade" ? "Grade" : "Class"} added.`); await load();
  }

  async function toggleOption(type: "grade" | "class", option: Option) {
    const response = await fetch("/api/admin/options", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ type, id: option.id, active: !option.active }) });
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) return setError(result.error ?? "The option could not be updated.");
    setNotice(`${option.label} ${option.active ? "hidden" : "restored"}.`); await load();
  }

  async function renameOption(type: "grade" | "class", option: Option) {
    const label = window.prompt(`Rename ${option.label}`, option.label)?.trim();
    if (!label || label === option.label) return;
    const response = await fetch("/api/admin/options", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ type, id: option.id, label }) });
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) return setError(result.error ?? "The option could not be renamed.");
    setNotice(`${option.label} renamed.`); await load();
  }

  async function deleteOption(type: "grade" | "class", option: Option) {
    if (!window.confirm(`Remove ${option.label}? Options used by projects cannot be removed.`)) return;
    const response = await fetch("/api/admin/options", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ type, id: option.id }) });
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) return setError(result.error ?? "The option could not be removed.");
    setNotice(`${option.label} removed.`); await load();
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <Link className="wordmark" href="/">AI WORKSHOP HUB</Link>
        <div><Link href="/" target="_blank" rel="noreferrer">View gallery ↗</Link><button onClick={logout}>Sign out</button></div>
      </header>
      <div className="admin-content">
        <div className="admin-title-row">
          <div><span className="eyebrow">ADMIN WORKSPACE · 管理后台</span><h1>Workshop projects</h1><p>整理、预览并分享学生与教师的 AI 项目。</p></div>
          <div className="admin-title-actions"><button className="secondary-button" onClick={() => setShowOptions((value) => !value)}>{showOptions ? "Close settings" : "Grade settings"}</button><button className="primary-button" onClick={() => setShowForm((value) => !value)}>{showForm ? "Close form" : "+ New project"}</button></div>
        </div>

        <section className="admin-stats" aria-label="Project summary">
          <div><span>ALL PROJECTS</span><strong>{summary.total}</strong></div>
          <div><span>PUBLISHED</span><strong>{summary.published}</strong></div>
          <div><span>DRAFTS</span><strong>{summary.drafts}</strong></div>
        </section>

        {showForm && data ? (
          <form className="project-form" onSubmit={createProject}>
            <div className="form-heading"><div><span className="project-tag">NEW DRAFT</span><h2>Project details</h2></div><p>Student projects use grade and class; teacher projects use role or department.</p></div>
            <div className="form-grid">
              <label>Project title<input name="title" maxLength={42} required /></label>
              <CreatorFields options={data.options} firstGrade={firstGrade} />
              <label className="span-two">Short description<textarea name="description" maxLength={180} required /></label>
              <label>Source<select name="sourceType" defaultValue="html"><option value="html">Single HTML</option><option value="zip">ZIP project</option><option value="url">Deployed HTTPS URL</option></select></label>
              <MultiChoiceField legend="Category / 项目类别（可多选）" name="categories" options={data.options.categories} />
              <MultiChoiceField legend="Technologies / 使用技术（可多选）" name="technologies" options={data.options.technologies} />
              <label className="span-two">External URL <span>(URL projects only)</span><input name="externalUrl" type="url" placeholder="https://" /></label>
              <label className="span-two">Cover alt text<input name="coverAlt" placeholder="Describe the project preview" required /></label>
            </div>
            <div className="form-actions"><button className="secondary-button" type="button" onClick={() => setShowForm(false)}>Cancel</button><button className="primary-button" disabled={pending} type="submit">{pending ? "Creating…" : "Create draft"}</button></div>
          </form>
        ) : null}

        {showOptions && data ? (
          <section className="option-settings" aria-labelledby="option-settings-title">
            <div className="form-heading"><div><span className="project-tag">CATALOG SETTINGS</span><h2 id="option-settings-title">Grade settings</h2></div><p>课程项目固定为 PreAP、PreDP、PA；这里仅管理年级选项。</p></div>
            <div className="option-columns">
              {(["grade"] as const).map((type) => {
                const options = type === "grade" ? data.options.grades : data.options.classes;
                return <div key={type}><h3>{type === "grade" ? "Grades" : "Classes"}</h3><form onSubmit={(event) => { event.preventDefault(); const input = new FormData(event.currentTarget).get("label"); if (typeof input === "string" && input.trim()) { void addOption(type, input.trim()); event.currentTarget.reset(); } }}><input aria-label={`New ${type} label`} name="label" placeholder={`Add ${type}`} required maxLength={40} /><button type="submit">Add</button></form><ul>{options.map((option) => <li key={option.id}><span>{option.label}</span><span className="option-row-actions"><button onClick={() => void renameOption(type, option)}>Rename</button><button onClick={() => void toggleOption(type, option)}>{option.active ? "Hide" : "Restore"}</button><button onClick={() => void deleteOption(type, option)}>Remove</button></span></li>)}</ul></div>;
              })}
            </div>
          </section>
        ) : null}

        {uploadProgress ? <p className="admin-notice" role="status">{uploadProgress}</p> : null}
        {notice ? <p className="admin-notice" role="status">{notice}</p> : null}
        {error ? <p className="form-error" role="alert">{error}</p> : null}

        <section className="project-table" aria-label="Projects">
          <div className="table-head"><span>PROJECT</span><span>CATEGORY</span><span>STATUS</span><span>ACTIONS</span></div>
          {!data ? <p className="table-empty">Loading projects…</p> : data.projects.length === 0 ? <p className="table-empty">No projects yet. Create the first draft when student work is ready.</p> : data.projects.map((project) => (
            <div key={project.id}>
              <article className="project-row">
                <div><strong>{project.title}</strong><span>{project.creatorType === "teacher" ? "Teacher" : "Student"} · {project.studentName}</span></div>
                <span>{project.categories.join(" · ")}</span><span className={`status status-${project.status}`}>{project.status}</span>
                <button className="manage-button" onClick={() => setSelectedId(selectedId === project.id ? null : project.id)}>{selectedId === project.id ? "Close" : "Manage"}</button>
              </article>
              {selectedId === project.id ? (
                <section className="manage-panel">
                  <div><span className="eyebrow">PROJECT FILES</span><h3>{project.title}</h3><p>{project.sourceType === "url" ? "This project launches from its deployed HTTPS address." : project.draftReady ? "A verified draft version is ready." : project.draftVersionId ? "The latest upload is incomplete. Upload the project again to replace it." : project.currentReady ? "The published version is ready to preview." : "Upload a single HTML file or ZIP project."}</p></div>
                  <div className="manage-controls">
                    {project.sourceType !== "url" ? <label className="file-control">Upload project<input type="file" accept=".html,.zip,text/html,application/zip" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadProject(project, file); }} /></label> : null}
                    <label className="file-control">{project.coverKey ? "Replace cover" : "Upload cover"}<input type="file" accept="image/png,image/jpeg,image/webp,image/avif" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadCover(project, file); }} /></label>
                    {(project.sourceType === "url" || project.draftReady || project.currentReady) ? <a href={`/admin/preview/${project.id}`} target="_blank" rel="noreferrer">Preview ↗</a> : null}
                    {project.status === "published" ? <button onClick={() => void projectAction(project, "unpublish")}>Unpublish</button> : <button className="ink-control" onClick={() => void projectAction(project, "publish")}>Publish</button>}
                    <button onClick={() => void projectAction(project, project.featured ? "unfeature" : "feature")}>{project.featured ? "Remove featured" : "Make featured"}</button>
                    {project.previousVersionId ? <button onClick={() => void projectAction(project, "rollback")}>Restore previous</button> : null}
                    <button onClick={() => setEditingId(editingId === project.id ? null : project.id)}>{editingId === project.id ? "Close editor" : "Edit details"}</button>
                    <button className="danger-control" onClick={() => void deleteProject(project)}>Delete project</button>
                  </div>
                  {editingId === project.id && data ? <form className="project-form compact-project-form" onSubmit={(event) => void editProject(project, event)}>
                    <div className="form-grid">
                      <label>Project title<input name="title" maxLength={42} defaultValue={project.title} required /></label>
                      <CreatorFields options={data.options} firstGrade={firstGrade} project={project} />
                      <label className="span-two">Short description<textarea name="description" maxLength={180} defaultValue={project.description} required /></label>
                      <label>Source<select name="sourceType" defaultValue={project.sourceType}><option value="html">Single HTML</option><option value="zip">ZIP project</option><option value="url">Deployed HTTPS URL</option></select></label>
                      <MultiChoiceField legend="Category / 项目类别（可多选）" name="categories" options={data.options.categories} defaults={project.categories} />
                      <MultiChoiceField legend="Technologies / 使用技术（可多选）" name="technologies" options={data.options.technologies} defaults={project.technologies} />
                      <label className="span-two">External URL <span>(URL projects only)</span><input name="externalUrl" type="url" defaultValue={project.externalUrl ?? ""} placeholder="https://" /></label>
                      <label className="span-two">Cover alt text<input name="coverAlt" defaultValue={project.coverAlt} required /></label>
                    </div>
                    <div className="form-actions"><button className="secondary-button" type="button" onClick={() => setEditingId(null)}>Cancel</button><button className="primary-button" disabled={pending} type="submit">{pending ? "Saving…" : "Save changes"}</button></div>
                  </form> : null}
                </section>
              ) : null}
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
