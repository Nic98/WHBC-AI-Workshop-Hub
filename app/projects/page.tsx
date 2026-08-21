import type { Metadata } from "next";
import { getPublicCatalogOptions, getPublicProjects } from "@/lib/catalog";
import { ProjectsGallery } from "./projects-gallery";

export const metadata: Metadata = { title: "All Projects", description: "Explore what students are building with AI." };

export const dynamic = "force-dynamic";

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const key of ["search", "category", "creator", "grade", "sort"]) {
    const value = raw[key];
    if (typeof value === "string") params.set(key, value);
  }
  const [projects, options] = await Promise.all([
    getPublicProjects(params).catch(() => []),
    getPublicCatalogOptions().catch(() => ({ categories: [], grades: [], technologies: [] })),
  ]);
  return <ProjectsGallery initialProjects={projects} initialOptions={options} initialFilters={{ search: params.get("search") ?? "", category: params.get("category") ?? "", creator: params.get("creator") ?? "", grade: params.get("grade") ?? "", sort: params.get("sort") ?? "featured" }} />;
}
