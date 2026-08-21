import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "../../site-footer";
import { SiteHeader } from "../../site-header";

export const metadata: Metadata = { title: "Submission received", robots: { index: false, follow: false } };

export default async function SubmissionSuccessPage({ searchParams }: { searchParams: Promise<{ reference?: string }> }) {
  const reference = (await searchParams).reference?.toUpperCase() ?? "";
  const validReference = /^AWH-\d{8}-[A-Z2-9]{6}$/.test(reference) ? reference : "Saved in the review queue";
  return <><SiteHeader /><main className="submission-success"><span className="success-mark" aria-hidden="true">✓</span><span className="eyebrow">SUBMISSION RECEIVED</span><h1>Your project is in the review queue.</h1><p>请保存好下面的投稿编号。老师会审核、测试作品，并通过你填写的邮箱联系你。</p><div className="reference-card"><span>YOUR REFERENCE</span><strong>{validReference}</strong></div><div className="submission-success-actions"><Link className="primary-button" href="/projects">Explore projects</Link><Link className="secondary-button" href="/submit">Submit another</Link></div></main><SiteFooter /></>;
}
