import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div><Link className="wordmark" href="/">AI WORKSHOP HUB</Link><p><span>Student projects and teacher-made tools.</span><span lang="zh-CN">学生作品与教师 AI 工具分享社区</span></p></div>
      <nav aria-label="Footer navigation"><Link href="/projects">Projects</Link><Link href="/submit">Share a project</Link><Link href="/about">About</Link><Link href="/guidelines">Guidelines</Link><Link href="/privacy">Privacy</Link></nav>
      <small>A teacher-led pilot at Wuhan Britain-China School · © {new Date().getFullYear()}</small>
    </footer>
  );
}
