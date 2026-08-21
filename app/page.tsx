import type { Metadata } from "next";
import { getPublicCatalogOptions, getPublicProjects } from "@/lib/catalog";
import { HomeContent, PublicHomeOptions, PublicHomeProject } from "./home-content";

export const metadata: Metadata = {
  title: { absolute: "AI Workshop Hub" },
  description: "Explore student AI projects and teacher-made learning tools.",
};

export default async function Home() {
  const [projects, options] = await Promise.all([
    getPublicProjects(new URLSearchParams({ sort: "featured" })).catch(() => [] as PublicHomeProject[]),
    getPublicCatalogOptions().catch(() => ({ grades: [] } as PublicHomeOptions)),
  ]);
  return <HomeContent initialProjects={projects as PublicHomeProject[]} options={options as PublicHomeOptions} />;
}
