import type { Metadata } from "next";
import { ProjectsGallery } from "./projects-gallery";

export const metadata: Metadata = { title: "All Projects", description: "Explore what students are building with AI." };

export default function ProjectsPage() { return <ProjectsGallery />; }
