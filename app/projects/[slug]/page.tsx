import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getPublishedProjectBySlug } from "@/lib/catalog";
import { ProjectsGallery } from "../projects-gallery";
import { ProjectDialog } from "./project-dialog";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = await getPublishedProjectBySlug(slug).catch(() => null);
  if (!project) return { title: "Project not found", description: "This student project is unavailable." };
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const cover = project.coverKey ? `${protocol}://${host}/media/covers/${project.id}` : undefined;
  return {
    title: project.title, description: project.description,
    openGraph: { title: project.title, description: project.description, images: cover ? [cover] : [] },
    twitter: { card: cover ? "summary_large_image" : "summary", title: project.title, description: project.description, images: cover ? [cover] : [] },
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getPublishedProjectBySlug(slug).catch(() => null);
  if (!project) notFound();
  return (
    <>
      <ProjectsGallery backdrop />
      <div className="paper-veil" />
      <ProjectDialog project={project} />
    </>
  );
}
