"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { SiteFooter } from "../site-footer";
import { SiteHeader } from "../site-header";

type Project = {
  id: string; slug: string; title: string; studentName: string; gradeId: string; classId: string;
  creatorType: "student" | "teacher"; creatorRole: string | null;
  category: string; categories: string[]; coverKey: string | null; coverAlt: string;
};
type Options = { categories: string[]; grades: Array<{ id: string; label: string }>; classes: Array<{ id: string; label: string }>; technologies: string[] };

const categoryTones: Record<string, number> = { Simulation: 0, Art: 1, Game: 2, Tool: 3, Academic: 5 };

export function ProjectsGallery({ backdrop = false }: { backdrop?: boolean }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [options, setOptions] = useState<Options>({ categories: [], grades: [], classes: [], technologies: [] });
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("featured");
  const [creator, setCreator] = useState("");
  const [grade, setGrade] = useState("");
  const [visible, setVisible] = useState(9);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setLoading(true);
      const params = new URLSearchParams({ sort });
      if (search.trim()) params.set("search", search.trim());
      if (category) params.set("category", category);
      if (creator) params.set("creator", creator);
      if (grade) params.set("grade", grade);
      const response = await fetch(`/api/projects?${params.toString()}`);
      const result = (await response.json().catch(() => ({}))) as { projects?: Project[]; options?: Options; error?: string };
      if (response.ok) {
        setProjects(result.projects ?? []); setOptions(result.options ?? { categories: [], grades: [], classes: [], technologies: [] }); setError(""); setVisible(9);
      } else setError(result.error ?? "Projects are temporarily unavailable.");
      setLoading(false);
    }, search ? 180 : 0);
    return () => window.clearTimeout(timer);
  }, [search, category, creator, grade, sort]);

  useEffect(() => {
    if (backdrop || loading) return;
    const slug = sessionStorage.getItem("aiwh-return-project");
    if (!slug) return;
    sessionStorage.removeItem("aiwh-return-project");
    window.requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-project-slug="${CSS.escape(slug)}"]`)?.focus());
  }, [backdrop, loading]);

  const shown = useMemo(() => projects.slice(0, visible), [projects, visible]);

  return (
    <div className={backdrop ? "gallery-backdrop" : ""} aria-hidden={backdrop || undefined}>
      <SiteHeader active="projects" />
      <main className="projects-page">
        <div className="projects-heading"><span className="eyebrow">PROJECT COMMUNITY</span><h1>All Projects</h1><p>来看看同学们正在用 AI 做什么有趣的事，也从彼此的作品中发现新想法。</p></div>
        <section className="filters" aria-label="Project filters">
          <label className="search-field"><span>SEARCH PROJECTS</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects or creators" /></label>
          <div className={`filter-selects ${creator === "teacher" ? "teacher-only" : ""}`}>
            <label className="creator-field"><span>CREATOR</span><select value={creator} onChange={(event) => { const value = event.target.value; setCreator(value); if (value === "teacher") setGrade(""); }}><option value="">All creators</option><option value="student">Students</option><option value="teacher">Teachers</option></select></label>
            {creator !== "teacher" ? <label className="grade-field"><span>GRADE</span><select value={grade} onChange={(event) => setGrade(event.target.value)}><option value="">All grades</option>{options.grades.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label> : null}
            <label className="sort-field"><span>SORT</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="featured">Featured</option><option value="newest">Newest</option><option value="title">Title A–Z</option></select></label>
          </div>
          <div className="category-chips" aria-label="Categories"><button className={!category ? "selected" : ""} onClick={() => setCategory("")}>ALL</button>{options.categories.map((item) => <button className={category === item ? "selected" : ""} key={item} onClick={() => setCategory(item)}>{item.toUpperCase()}</button>)}</div>
        </section>
        {creator || grade ? <div className="active-filters" aria-label="Active filters">{creator ? <button onClick={() => setCreator("")}>{creator === "teacher" ? "Teachers" : "Students"} ×</button> : null}{grade ? <button onClick={() => setGrade("")}>{options.grades.find((item) => item.id === grade)?.label ?? grade} ×</button> : null}</div> : null}
        <div className="results-line" aria-live="polite"><span>{loading ? "Updating projects…" : `${projects.length} project${projects.length === 1 ? "" : "s"}`}</span></div>
        {error ? <div className="gallery-empty"><p>{error}</p><button onClick={() => { setSearch(""); setCategory(""); setCreator(""); setGrade(""); }}>Clear filters</button></div> : !loading && projects.length === 0 ? <div className="gallery-empty"><div className="dashed-path" /><h2>No projects match these filters yet.</h2><p>Try removing a filter or searching for something else.</p><button onClick={() => { setSearch(""); setCategory(""); setCreator(""); setGrade(""); }}>Clear filters</button></div> : (
          <div className="projects-grid">
            {shown.map((project) => (
              <a className={`gallery-card tone-${categoryTones[project.category] ?? 3}`} data-project-slug={project.slug} href={`/projects/${project.slug}`} key={project.id} onClick={() => sessionStorage.setItem("aiwh-return-project", project.slug)}>
                <div className="gallery-cover">{project.coverKey ? <Image fill sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw" src={`/media/covers/${project.id}`} alt={project.coverAlt} style={{ objectFit: "contain" }} /> : <div className="cover-placeholder"><span>{project.categories[0]}</span><b>{project.title.slice(0, 1)}</b></div>}<span className="view-affordance">查看项目 ↗</span></div>
                <div className="gallery-meta"><div className="gallery-tags">{project.categories.map((item) => <span key={item}>{item.toUpperCase()}</span>)}</div><h2>{project.title}</h2><p>{project.studentName}</p><small>{project.creatorType === "teacher" ? project.creatorRole ?? "Teacher" : `${options.grades.find((item) => item.id === project.gradeId)?.label ?? project.gradeId} · ${options.classes.find((item) => item.id === project.classId)?.label ?? project.classId}`}</small></div>
              </a>
            ))}
          </div>
        )}
        {visible < projects.length ? <div className="load-more"><button className="secondary-button" onClick={() => setVisible((value) => value + 9)}>Load more projects</button></div> : null}
      </main>
      <SiteFooter />
    </div>
  );
}
