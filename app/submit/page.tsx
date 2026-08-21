import type { Metadata } from "next";
import { getPublicCatalogOptions, categories, technologyOptions } from "@/lib/catalog";
import { SiteFooter } from "../site-footer";
import { SiteHeader } from "../site-header";
import { SubmissionForm } from "./submission-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Share a project", description: "Submit a student AI project or teacher-made learning tool for review by AI Workshop Hub." };

const fallbackGrades = ["Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"].map((label) => ({ id: label.toLowerCase().replace(" ", "-"), label }));

export default async function SubmitPage() {
  const options = await getPublicCatalogOptions().catch(() => ({ grades: fallbackGrades, categories, technologies: technologyOptions }));
  return (
    <>
      <SiteHeader />
      <main className="submit-page">
        <section className="submit-intro">
          <div><span className="eyebrow">SHARE WITH THE WORKSHOP</span><h1>Made something with AI?</h1></div>
          <div className="submit-intro-copy"><p>Send us your project. It stays private while a teacher reviews and tests it.</p><p lang="zh-CN">把你的 AI 作品分享给我们。老师审核测试通过后，才会公开展示。</p></div>
        </section>
        <div className="submit-process" aria-label="Submission process"><span><b>01</b> SUBMIT</span><i>→</i><span><b>02</b> REVIEW</span><i>→</i><span><b>03</b> TEST</span><i>→</i><span><b>04</b> SHARE</span></div>
        <SubmissionForm options={options} />
      </main>
      <SiteFooter />
    </>
  );
}
