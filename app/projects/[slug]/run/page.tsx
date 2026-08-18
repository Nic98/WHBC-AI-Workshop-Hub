import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getPublishedProjectBySlug } from "@/lib/catalog";
import { ProjectRunner } from "./runner-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const project = await getPublishedProjectBySlug((await params).slug).catch(() => null);
  if (!project) return { title: "Project not found", description: "This project is unavailable.", robots: { index: false, follow: false }, openGraph: { images: [] }, twitter: { images: [] } };
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const cover = project.coverKey ? `${protocol}://${host}/media/covers/${project.id}` : undefined;
  const title = `View ${project.title}`;
  return {
    title, description: project.description, robots: { index: false, follow: false },
    openGraph: { title, description: project.description, images: cover ? [cover] : [] },
    twitter: { card: cover ? "summary_large_image" : "summary", title, description: project.description, images: cover ? [cover] : [] },
  };
}

export default async function RunnerPage({ params }: { params: Promise<{ slug: string }> }) {
  const project = await getPublishedProjectBySlug((await params).slug).catch(() => null);
  if (!project || (project.sourceType !== "url" && !project.currentVersionId)) notFound();
  return <ProjectRunner project={project} />;
}
