"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

type HomeProject = {
  id?: string; slug?: string; title: string; student: string; grade: string; tag: string; tone: string;
  preview: "dashboard" | "story" | "orbit"; coverKey?: string | null; coverAlt?: string; featured?: boolean; creatorType?: "student" | "teacher";
};

export type PublicHomeProject = {
  id: string; slug: string; title: string; studentName: string; gradeId: string; creatorType: "student" | "teacher"; creatorRole: string | null;
  category: string; categories: string[]; coverKey: string | null; coverAlt: string; featured: boolean;
};

export type PublicHomeOptions = { grades: Array<{ id: string; label: string }> };

const holdingCards: HomeProject[] = [
  { title: "A space for the next idea", student: "Project coming soon", grade: "IDEA → BUILD → SHARE", tag: "WORKSHOP", tone: "mint", preview: "dashboard", creatorType: "student" },
  { title: "Stories made interactive", student: "Project coming soon", grade: "IDEA → BUILD → SHARE", tag: "CREATIVE AI", tone: "violet", preview: "story", creatorType: "student" },
  { title: "Experiments in motion", student: "Project coming soon", grade: "IDEA → BUILD → SHARE", tag: "SIMULATION", tone: "lime", preview: "orbit", creatorType: "student" },
];
const categoryTones: Record<string, string> = { Simulation: "lime", Art: "violet", Game: "coral", Tool: "blue", Academic: "mint" };

function ProjectPreview({ type }: { type: HomeProject["preview"] }) {
  if (type === "dashboard") return <div className="preview-ui preview-dashboard" aria-hidden="true"><div className="preview-toolbar"><span /><span /><span /></div><div className="preview-dashboard-body"><div className="preview-map"><i /><i /><i /><i /></div><div className="preview-chart"><b /><b /><b /><b /><b /></div></div></div>;
  if (type === "story") return <div className="preview-ui preview-story" aria-hidden="true"><div className="story-sun" /><div className="story-hill story-hill-one" /><div className="story-hill story-hill-two" /><div className="story-copy"><i /><i /><i /></div></div>;
  return <div className="preview-ui preview-orbit" aria-hidden="true"><div className="orbit-ring orbit-ring-one" /><div className="orbit-ring orbit-ring-two" /><div className="orbit-core" /><span className="orbit-dot orbit-dot-one" /><span className="orbit-dot orbit-dot-two" /></div>;
}

function ProjectCard({ project, className = "" }: { project: HomeProject; className?: string }) {
  const content = <article className={`project-card project-card-${project.tone} ${className}`}><div className="project-window">{project.coverKey && project.id ? <Image fill sizes="(max-width: 639px) 68vw, (max-width: 1023px) 46vw, 32vw" src={`/media/covers/${project.id}`} alt={project.coverAlt ?? ""} style={{ objectFit: "contain" }} /> : <ProjectPreview type={project.preview} />}</div><div className="project-meta"><span className="project-tag">{project.tag}</span><h3>{project.title}</h3><p>{project.student}</p><span className="project-grade">{project.grade}</span></div></article>;
  return project.slug ? <Link className="home-project-link" href={`/projects/${project.slug}`}>{content}</Link> : content;
}

export function HomeContent({ initialProjects, options }: { initialProjects: PublicHomeProject[]; options: PublicHomeOptions }) {
  const projects = useMemo(() => initialProjects.map((project, index): HomeProject => ({
    id: project.id, slug: project.slug, title: project.title, student: project.studentName,
    grade: project.creatorType === "teacher" ? project.creatorRole ?? "Teacher" : options.grades.find((item) => item.id === project.gradeId)?.label ?? project.gradeId,
    tag: project.categories.join(" · ").toUpperCase(), tone: categoryTones[project.categories[0]] ?? "blue", preview: (["dashboard", "story", "orbit"] as const)[index % 3],
    coverKey: project.coverKey, coverAlt: project.coverAlt, featured: project.featured, creatorType: project.creatorType,
  })), [initialProjects, options]);
  const heroProjects = projects.filter((project) => project.creatorType !== "teacher").slice(0, 3);
  const studentFeatured = projects.filter((project) => project.creatorType !== "teacher" && project.featured).slice(0, 3);
  const teacherTools = projects.filter((project) => project.creatorType === "teacher").slice(0, 3);
  const heroGallery = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = heroGallery.current; if (!element) return; let visible = true;
    const update = () => element.classList.toggle("ambient-paused", document.hidden || !visible);
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); }, { threshold: 0.05 });
    observer.observe(element); document.addEventListener("visibilitychange", update);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", update); };
  }, []);

  const hero = heroProjects.length ? heroProjects : holdingCards;
  const featured = studentFeatured.length ? studentFeatured : projects.filter((project) => project.creatorType !== "teacher").slice(0, 3);
  return <>
    <main><SiteHeader active="home" />
      <section className="hero" id="top"><div className="hero-copy"><span className="eyebrow">STUDENT-BUILT · TEACHER-SHARED</span><h1>Ideas become interactive.</h1><p>这里收集学生的 Vibe Coding 作品，也分享老师用 AI 做出的教学工具。</p><div className="hero-actions"><Link className="primary-button" href="/projects">逛逛项目 <span aria-hidden="true">↘</span></Link><Link className="secondary-button" href="/submit">分享作品</Link></div><div className="process" aria-label="Our project process"><span>IDEA</span><i>→</i><span>BUILD</span><i>→</i><span>TEST</span><i>→</i><span>SHARE</span></div></div>
        <div className="hero-gallery" aria-label="Selected student project previews" ref={heroGallery}><div className="dot-field" aria-hidden="true" /><div className="workshop-shape shape-violet" aria-hidden="true" /><div className="workshop-shape shape-coral" aria-hidden="true" /><ProjectCard project={hero[0] ?? holdingCards[0]} className="hero-card hero-card-one" /><ProjectCard project={hero[1] ?? holdingCards[1]} className="hero-card hero-card-two" /><ProjectCard project={hero[2] ?? holdingCards[2]} className="hero-card hero-card-three" /><div className="idea-mark" aria-hidden="true"><span /><span /><span /><span /></div></div>
      </section>
      <section className="featured-section" id="featured"><div className="section-heading"><div><span className="eyebrow">STUDENT PROJECTS · 学生作品</span><h2>Ideas you can try</h2></div><Link className="secondary-button" href="/projects?creator=student">查看全部 <span aria-hidden="true">→</span></Link></div><div className="featured-grid">{(featured.length ? featured : holdingCards.slice(0, 2)).map((project) => <ProjectCard key={project.slug ?? project.title} project={project} />)}</div></section>
      <section className="teacher-tools-section"><div className="section-heading"><div><span className="eyebrow">TEACHER TOOLS · 教师工具</span><h2>Built for the classroom</h2></div><Link className="secondary-button" href="/projects?creator=teacher">Explore tools <span aria-hidden="true">→</span></Link></div>{teacherTools.length ? <div className="featured-grid">{teacherTools.map((project) => <ProjectCard key={project.slug} project={project} />)}</div> : <div className="teacher-empty"><div><span className="project-tag">OPEN CALL</span><h3>Teachers can share here too.</h3><p>Submit an AI-powered teaching tool so colleagues across the school can try it.</p></div><Link className="primary-button" href="/submit">Share a teacher tool</Link></div>}</section>
      <section className="platform-statement" id="about"><span className="eyebrow">ABOUT THE HUB</span><div className="platform-statement-grid"><h2>Made to share.<br />Built to inspire.</h2><div className="platform-statement-copy"><p>Student projects and teacher-made tools, open for everyone to explore.</p><p lang="zh-CN">让作品被看见，让好工具在校园里真正流动起来。</p></div></div></section>
    </main><SiteFooter />
  </>;
}
