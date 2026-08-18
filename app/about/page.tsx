import type { Metadata } from "next";
import { SiteFooter } from "../site-footer";
import { SiteHeader } from "../site-header";

export const metadata: Metadata = { title: "About", description: "About AI Workshop Hub, a community for students to share, experience, and discuss AI projects." };

const communitySteps = [
  { number: "01", title: "NOTICE", chinese: "发现", description: "Start with something worth exploring." },
  { number: "02", title: "BUILD", chinese: "创造", description: "Turn an idea into a working project." },
  { number: "03", title: "EXPERIENCE", chinese: "体验", description: "Open it, play with it, understand it." },
  { number: "04", title: "CONNECT", chinese: "交流", description: "Share reactions and improve together." },
];

function CommunityCards({ duplicate = false }: { duplicate?: boolean }) {
  return communitySteps.map((step, index) => (
    <article aria-hidden={duplicate || undefined} className={`community-card community-card-${index + 1}${duplicate ? " community-card-copy" : ""}`} key={`${duplicate ? "copy" : "main"}-${step.number}`}>
      <span className="community-card-number">{step.number}</span>
      <div><h2>{step.title}<span>{step.chinese}</span></h2><p>{step.description}</p></div>
    </article>
  ));
}

export default function AboutPage() {
  return (
    <>
      <SiteHeader active="about" />
      <main className="about-page">
        <section className="about-hero">
          <span className="eyebrow">ABOUT THE COMMUNITY</span>
          <h1>Student AI Project Community</h1>
          <p>学生 AI 项目交流社区</p>
          <div className="community-marquee" aria-label="Share ideas, try projects, start conversations, and build together">
            <div className="marquee-row marquee-row-forward"><div className="marquee-track"><span>SHARE IDEAS</span><i>·</i><span>TRY PROJECTS</span><i>·</i><span>START CONVERSATIONS</span><i>·</i><span>BUILD TOGETHER</span><i>·</i><span aria-hidden="true">SHARE IDEAS</span><i aria-hidden="true">·</i><span aria-hidden="true">TRY PROJECTS</span><i aria-hidden="true">·</i><span aria-hidden="true">START CONVERSATIONS</span><i aria-hidden="true">·</i><span aria-hidden="true">BUILD TOGETHER</span><i aria-hidden="true">·</i></div></div>
            <div className="marquee-row marquee-row-reverse" aria-hidden="true"><div className="marquee-track"><span>分享灵感</span><i>·</i><span>体验作品</span><i>·</i><span>交流想法</span><i>·</i><span>一起改进</span><i>·</i><span>分享灵感</span><i>·</i><span>体验作品</span><i>·</i><span>交流想法</span><i>·</i><span>一起改进</span><i>·</i></div></div>
          </div>
        </section>
        <section className="community-flow" aria-labelledby="community-flow-title">
          <div className="community-flow-heading"><span className="eyebrow">HOW THE COMMUNITY MOVES</span><h2 id="community-flow-title">From an idea to a conversation.</h2><p>从一个想法，到一次真正的交流。</p></div>
          <div className="community-flow-viewport"><div className="community-flow-track"><CommunityCards /><CommunityCards duplicate /></div></div>
        </section>
        <section className="about-statement">
          <div className="statement-copy"><span className="eyebrow">COMMUNITY MANIFESTO</span><h2>NOT JUST A GALLERY.<br />A PLACE TO SHARE, TRY, AND TALK.</h2></div>
          <div className="statement-side"><span aria-hidden="true">↗</span><p>不只是展示，<br />更是体验与交流。</p></div>
          <div className="about-process" aria-label="Idea, build, experience, connect"><span>IDEA</span><i>→</i><span>BUILD</span><i>→</i><span>EXPERIENCE</span><i>→</i><span>CONNECT</span></div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
