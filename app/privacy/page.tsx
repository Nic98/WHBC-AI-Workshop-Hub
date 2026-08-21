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
        <h1>Projects can be public. Contact details are not.</h1>
        <div className="privacy-grid">
          <section><h2>What visitors can see</h2><p>Student projects show an approved English display name and grade. Teacher tools show a display name and subject or department. The Hub does not publish avatars, classes or email addresses.</p></section>
          <section><h2>What a submission stores</h2><p>The private review queue stores contact email, project details, cover and uploaded files. Files remain quarantined until a teacher reviews them.</p></section>
          <section><h2>Administrator access</h2><p>The administrator area uses a secure sign-in cookie. Failed sign-in attempts are temporarily limited to protect the project collection.</p></section>
          <section><h2>Retention and removal</h2><p>Incomplete uploads are removed after 24 hours. Rejected submissions are removed after 30 days. Accepted submissions remain linked to the published project so the teacher can handle corrections or removal requests.</p></section>
          <section><h2>External projects</h2><p>Some projects open an external HTTPS website. Those websites may have their own privacy practices, which apply after a visitor leaves the Hub.</p></section>
          <section><h2>Private viewing data</h2><p>The Hub keeps approximate daily project view totals for the administrator. Exact counts are not shown publicly and are not used to rank students.</p></section>
        </div>
        <p className="privacy-note">AI Workshop Hub is currently a teacher-led school pilot. Questions, corrections or removal requests can be sent through the school’s usual communication channels.</p>
      </main>
      <SiteFooter />
    </>
  );
}
