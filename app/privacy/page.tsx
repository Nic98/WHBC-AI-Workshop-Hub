import type { Metadata } from "next";
import { SiteFooter } from "../site-footer";
import { SiteHeader } from "../site-header";

export const metadata: Metadata = { title: "Privacy", description: "How AI Workshop Hub handles public project information and administrator access." };

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader active="privacy" />
      <main className="privacy-page">
        <span className="eyebrow">PRIVACY AT THE HUB</span>
        <h1>Student work is public. Private details are not.</h1>
        <div className="privacy-grid">
          <section><h2>What visitors can see</h2><p>Published projects show an approved English display name, grade and class, project description, categories, technologies, cover, and the interactive project itself.</p></section>
          <section><h2>What the Hub stores</h2><p>The Hub stores project files and catalog information needed to present student work. It does not publish student email addresses or private school identifiers.</p></section>
          <section><h2>Administrator access</h2><p>The administrator area uses a secure sign-in cookie. Failed sign-in attempts are temporarily limited to protect the project collection.</p></section>
          <section><h2>External projects</h2><p>Some projects open an external HTTPS website. Those websites may have their own privacy practices, which apply after a visitor leaves the Hub.</p></section>
        </div>
        <p className="privacy-note">Questions or correction requests can be sent to the school through its usual communication channels.</p>
      </main>
      <SiteFooter />
    </>
  );
}
