import type { Metadata } from "next";
import { HomeContent } from "./home-content";

export const metadata: Metadata = {
  title: { absolute: "AI Workshop Hub" },
  description: "Explore AI projects designed and built by students.",
};

export default function Home() {
  return <HomeContent />;
}
