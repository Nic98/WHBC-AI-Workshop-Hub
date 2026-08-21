import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "../site-footer";
import { SiteHeader } from "../site-header";

export const metadata: Metadata = { title: "Project guidelines", description: "What to prepare before sharing a project with AI Workshop Hub." };

const checks = [
  { title: "Make it yours", body: "Submit work you created, or content you have clear permission to use. Credit borrowed media inside the project when appropriate." },
  { title: "Remove secrets", body: "Never upload passwords, personal records, private API keys, service-account files or hidden environment files." },
  { title: "Keep people safe", body: "Do not include another person’s private information, harmful instructions, harassment, or content unsuitable for a school community." },
  { title: "Help us test", body: "Include a clear cover, short description and simple notes explaining what the reviewer should click or try." },
  { title: "Expect a review", body: "A teacher will open and test every submission. Approval creates a draft first; nothing is published automatically." },
  { title: "Improve and resubmit", body: "If changes are needed, use the previous submission number when sending a revised version." },
];

export default function GuidelinesPage() {
  return <><SiteHeader /><main className="guidelines-page"><section className="guidelines-hero"><span className="eyebrow">PROJECT GUIDELINES</span><h1>Share work you’re proud to put your name on.</h1><p>投稿前快速检查一下：作品能运行、资料清楚、不包含隐私或密钥，并且适合在学校社区公开体验。</p></section><section className="guidelines-grid">{checks.map((check, index) => <article key={check.title}><span>{String(index + 1).padStart(2, "0")}</span><h2>{check.title}</h2><p>{check.body}</p></article>)}</section><section className="guidelines-cta"><div><span className="eyebrow">READY TO SHARE?</span><h2>Your project stays private until review.</h2></div><Link className="primary-button" href="/submit">Open the submission form ↗</Link></section></main><SiteFooter /></>;
}
