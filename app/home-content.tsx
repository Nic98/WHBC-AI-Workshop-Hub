"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

type HomeProject = {
  id?: string; slug?: string; title: string; student: string; grade: string; tag: string; tone: string;
  preview: "dashboard" | "story" | "orbit"; coverKey?: string | null; coverAlt?: string; featured?: boolean;
};

type PublicProject = {
  id: string; slug: string; title: string; studentName: string; gradeId: string; classId: string;
  creatorType: "student" | "teacher"; creatorRole: string | null;
  category: string; categories: string[]; coverKey: string | null; coverAlt: string; featured: boolean;
};

type PublicOptions = { grades: Array<{ id: string; label: string }>; classes: Array<{ id: string; label: string }> };

const holdingCards: HomeProject[] = [
  { title: "A space for the next idea", student: "Student project coming soon", grade: "IDEA → BUILD → SHARE", tag: "WORKSHOP", tone: "mint", preview: "dashboard" },
  { title: "Stories made interactive", student: "Student project coming soon", grade: "IDEA → BUILD → SHARE", tag: "CREATIVE AI", tone: "violet", preview: "story" },
  { title: "Experiments in motion", student: "Student project coming soon", grade: "IDEA → BUILD → SHARE", tag: "SIMULATION", tone: "lime", preview: "orbit" },
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

export function HomeContent() {
  const [displayProjects, setDisplayProjects] = useState<HomeProject[]>(holdingCards);
  const [featuredProjects, setFeaturedProjects] = useState<HomeProject[]>([]);
  const heroGallery = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/projects?sort=featured")
      .then((response): Promise<{ projects?: PublicProject[]; options?: PublicOptions }> => response.ok ? response.json() : Promise.reject(new Error("Project catalog unavailable")))
      .then((result) => {
        const options = result.options;
        const projects = (result.projects ?? []).map((project, index): HomeProject => ({
          id: project.id, slug: project.slug, title: project.title, student: project.studentName,
          grade: project.creatorType === "teacher" ? project.creatorRole ?? "Teacher" : `${options?.grades.find((item) => item.id === project.gradeId)?.label ?? project.gradeId} · ${options?.classes.find((item) => item.id === project.classId)?.label ?? project.classId}`,
          tag: project.categories.join(" · ").toUpperCase(), tone: categoryTones[project.categories[0]] ?? "blue",
          preview: (["dashboard", "story", "orbit"] as const)[index % 3], coverKey: project.coverKey, coverAlt: project.coverAlt, featured: project.featured,
        }));
        if (active && projects.length) {
          setDisplayProjects(projects.slice(0, 3));
          setFeaturedProjects(projects.filter((project) => project.featured).slice(0, 3));
        }
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const element = heroGallery.current;
    if (!element) return;
    let visible = true;
    const update = () => element.classList.toggle("ambient-paused", document.hidden || !visible);
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); }, { threshold: 0.05 });
    observer.observe(element);
    document.addEventListener("visibilitychange", update);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", update); };
  }, []);

  return <>
    <main>
    <SiteHeader active="home" />
    <section className="hero" id="top"><div className="hero-copy"><span className="eyebrow">STUDENT-BUILT · AI-POWERED</span><h1>Ideas become interactive.</h1><p>这里收集学生亲手做出的 AI 项目。看看灵感如何变成可以玩的作品。</p><Link className="primary-button" href="/projects">逛逛项目 <span aria-hidden="true">↘</span></Link><div className="process" aria-label="Our project process"><span>IDEA</span><i>→</i><span>BUILD</span><i>→</i><span>TEST</span><i>→</i><span>SHARE</span></div></div>
      <div className="hero-gallery" aria-label="Selected student project previews" ref={heroGallery}><div className="dot-field" aria-hidden="true" /><div className="workshop-shape shape-violet" aria-hidden="true" /><div className="workshop-shape shape-coral" aria-hidden="true" /><ProjectCard project={displayProjects[0]} className="hero-card hero-card-one" /><ProjectCard project={displayProjects[1] ?? holdingCards[1]} className="hero-card hero-card-two" /><ProjectCard project={displayProjects[2] ?? holdingCards[2]} className="hero-card hero-card-three" /><div className="idea-mark" aria-hidden="true"><span /><span /><span /><span /></div></div>
    </section>
    <section className="featured-section" id="featured"><div className="section-heading"><div><span className="eyebrow">CURATED FROM THE WORKSHOP</span><h2>Featured Projects</h2></div><Link className="secondary-button" href="/projects">查看全部 <span aria-hidden="true">→</span></Link></div><div className="featured-grid">{(featuredProjects.length ? featuredProjects : holdingCards.slice(0, 2)).map((project) => <ProjectCard key={project.title} project={project} />)}</div></section>
    <section className="platform-statement" id="about"><span className="eyebrow">ABOUT THE HUB</span><div className="platform-statement-grid"><h2>Made to share.<br />Built to inspire.</h2><div className="platform-statement-copy"><p>Student AI projects, open for everyone to explore.</p><p lang="zh-CN">学生 AI 作品，在这里被看见、被体验。</p></div></div></section>
    </main>
    <SiteFooter />
  </>;
}
