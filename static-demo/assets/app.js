const projects = [
  {
    slug: "ecosense-city",
    title: "EcoSense City",
    creator: "Mina Chen",
    grade: "Grade 10",
    categories: ["Academic", "Simulation"],
    technologies: ["JavaScript", "Canvas", "AI API"],
    description: "A playful city dashboard that helps students test how transport, energy, and green spaces change an urban sustainability score.",
    chinese: "调整城市参数，观察每一个选择怎样影响空气、能源与生活质量。",
    color: "var(--mint)",
    icon: "🌱",
    featured: true,
    demo: "demos/ecosense-city/index.html"
  },
  {
    slug: "story-spark",
    title: "Story Spark",
    creator: "Leo Wang",
    grade: "Grade 9",
    categories: ["Art", "Tool"],
    technologies: ["HTML", "CSS", "JavaScript"],
    description: "A creative writing companion that combines a setting, mood, and unexpected object into a tiny story prompt.",
    chinese: "选择场景与情绪，让灵感卡片帮你打开一个新的故事。",
    color: "var(--violet)",
    icon: "✦",
    demo: "demos/story-spark/index.html"
  },
  {
    slug: "orbit-lab",
    title: "Orbit Lab",
    creator: "Alex Li",
    grade: "Grade 11",
    categories: ["Game", "Simulation"],
    technologies: ["Canvas", "JavaScript"],
    description: "An interactive orbit sandbox for exploring how speed and gravity reshape a satellite’s path around a planet.",
    chinese: "改变速度与引力，用实时轨迹理解卫星为什么会留在太空。",
    color: "var(--lime)",
    icon: "◎",
    demo: "demos/orbit-lab/index.html"
  }
];

const app = document.querySelector("#app");
const route = () => (location.hash.replace(/^#\/?/, "") || "home").split("/").filter(Boolean);

function header(active) {
  const links = [["home", "Home"], ["projects", "Projects"], ["about", "About"], ["privacy", "Privacy"]];
  return `<header class="site-header"><a class="wordmark" href="#home" aria-label="AI Workshop Hub home">AI WORKSHOP HUB</a><nav aria-label="Primary navigation">${links.map(([key, label]) => `<a href="#${key}" class="${active === key ? "active" : ""}" ${active === key ? 'aria-current="page"' : ""}>${label}</a>`).join("")}</nav><span class="demo-pill">STATIC DEMO</span></header>`;
}

function footer() {
  return `<footer class="site-footer"><div><a class="wordmark" href="#home">AI WORKSHOP HUB</a><p><span>A student AI project community.</span><span lang="zh-CN">学生 AI 项目交流社区</span></p></div><nav aria-label="Footer navigation"><a href="#home">Home</a><a href="#projects">Projects</a><a href="#about">About</a><a href="#privacy">Privacy</a></nav><small>Wuhan Britain-China School · © ${new Date().getFullYear()} · Principal preview</small></footer>`;
}

function card(project, floating = false) {
  return `<a href="#projects/${project.slug}" class="${floating ? "floating-card" : ""}" aria-label="View ${project.title}"><article class="project-card" style="--card-color:${project.color}"><div class="project-cover"><span class="cover-icon" aria-hidden="true">${project.icon}</span></div><div class="project-meta"><div class="tag-line">${project.categories.map((item) => `<span class="tag">${item.toUpperCase()}</span>`).join("")}${project.featured ? '<span class="featured-mark">★ FEATURED</span>' : ""}</div><h3>${project.title}</h3><p>${project.description}</p><p class="creator">${project.creator} · ${project.grade}</p></div></article></a>`;
}

function home() {
  return `<div class="shell fade-in">${header("home")}<main id="app-main"><section class="hero"><div class="hero-copy"><span class="eyebrow">STUDENT-BUILT · AI-POWERED</span><h1>Ideas become interactive.</h1><p lang="zh-CN">这里收集学生亲手做出的 AI 项目。看看灵感如何变成可以玩的作品。</p><a class="primary-button" href="#projects">逛逛项目 <span aria-hidden="true">↘</span></a><div class="process"><span>IDEA</span><i>→</i><span>BUILD</span><i>→</i><span>TEST</span><i>→</i><span>SHARE</span></div></div><div class="hero-gallery" aria-label="Student project previews"><div class="dot-field"></div><div class="blob blob-one"></div><div class="blob blob-two"></div>${projects.map((item) => card(item, true)).join("")}</div></section><section class="section"><div class="section-heading"><div><span class="eyebrow">CURATED FROM THE WORKSHOP</span><h2>Featured Project</h2></div><a class="secondary-button" href="#projects">查看全部 <span>→</span></a></div><div class="project-grid">${projects.filter((item) => item.featured).map((item) => card(item)).join("")}</div></section><section class="section platform"><div><span class="eyebrow">ABOUT THE HUB</span><h2>Made to share.<br>Built to inspire.</h2></div><div class="platform-copy"><p>Student AI projects, open for everyone to explore.</p><p lang="zh-CN">学生 AI 作品，在这里被看见、被体验。</p></div></section></main>${footer()}</div>`;
}

function gallery() {
  return `<div class="shell fade-in">${header("projects")}<main id="app-main"><section class="projects-hero"><span class="eyebrow">PROJECT COMMUNITY</span><h1>Explore what<br>students are making.</h1><p lang="zh-CN">从游戏、工具到艺术实验，找到你想体验的作品。</p></section><section class="filters" aria-label="Project filters"><div class="search"><label>SEARCH<input id="project-search" type="search" placeholder="Project or creator name" autocomplete="off"></label></div><div class="sort"><label>SORT<select id="project-sort"><option value="featured">Featured</option><option value="title">Title A–Z</option></select></label></div><div class="chips" role="group" aria-label="Category"><button class="chip selected" data-category="">ALL</button>${["Game", "Tool", "Art", "Simulation", "Academic"].map((item) => `<button class="chip" data-category="${item}">${item.toUpperCase()}</button>`).join("")}</div></section><section class="results"><p class="results-count" id="results-count"></p><div class="project-grid" id="project-grid"></div></section></main>${footer()}</div>`;
}

function bindGallery() {
  let category = "";
  const search = document.querySelector("#project-search");
  const sort = document.querySelector("#project-sort");
  const grid = document.querySelector("#project-grid");
  const count = document.querySelector("#results-count");
  const draw = () => {
    const query = search.value.trim().toLowerCase();
    let visible = projects.filter((item) => (!category || item.categories.includes(category)) && (!query || `${item.title} ${item.creator} ${item.description}`.toLowerCase().includes(query)));
    visible = [...visible].sort(sort.value === "title" ? (a, b) => a.title.localeCompare(b.title) : (a, b) => Number(b.featured) - Number(a.featured));
    count.textContent = `${visible.length} PROJECT${visible.length === 1 ? "" : "S"}`;
    grid.innerHTML = visible.length ? visible.map((item) => card(item)).join("") : '<p class="empty">No projects match yet. Try another category or search.</p>';
  };
  search.addEventListener("input", draw);
  sort.addEventListener("change", draw);
  document.querySelectorAll(".chip").forEach((button) => button.addEventListener("click", () => {
    category = button.dataset.category;
    document.querySelectorAll(".chip").forEach((item) => item.classList.toggle("selected", item === button));
    draw();
  }));
  draw();
}

function detail(project) {
  return `<div class="shell fade-in">${header("projects")}<main id="app-main" class="detail"><a class="back" href="#projects"><span>←</span> All projects</a><div class="detail-layout"><div class="detail-cover" style="--card-color:${project.color}"><span class="cover-icon" aria-hidden="true">${project.icon}</span></div><div class="detail-copy"><div class="tag-line">${project.categories.map((item) => `<span class="tag">${item.toUpperCase()}</span>`).join("")}${project.featured ? '<span class="featured-mark">★ FEATURED</span>' : ""}</div><h1>${project.title}</h1><p class="lead">${project.description}</p><p class="lead" lang="zh-CN">${project.chinese}</p><dl class="facts"><div class="fact"><dt>CREATOR</dt><dd>${project.creator}</dd></div><div class="fact"><dt>GRADE</dt><dd>${project.grade}</dd></div><div class="fact"><dt>CATEGORY</dt><dd>${project.categories.join(" · ")}</dd></div><div class="fact"><dt>TECHNOLOGIES</dt><dd>${project.technologies.join(" · ")}</dd></div></dl><div class="detail-actions"><a class="primary-button" href="#projects/${project.slug}/experience">Experience project <span>↗</span></a><a class="secondary-button" href="#projects">Keep exploring</a></div></div></div></main>${footer()}</div>`;
}

function runner(project) {
  document.body.classList.add("runner-open");
  return `<main class="runner fade-in"><div class="runner-bar"><a class="runner-back" href="#projects/${project.slug}">← Back to project</a><strong>${project.title}</strong><span class="demo-pill">LIVE DEMO</span></div><iframe title="${project.title} interactive project" src="${project.demo}" sandbox="allow-scripts"></iframe></main>`;
}

function about() {
  const steps = [["01", "NOTICE", "发现", "Start with something worth exploring."], ["02", "BUILD", "创造", "Turn an idea into a working project."], ["03", "EXPERIENCE", "体验", "Open it, play with it, understand it."], ["04", "CONNECT", "交流", "Share reactions and improve together."]];
  return `<div class="shell fade-in">${header("about")}<main id="app-main" class="info-page"><span class="eyebrow">ABOUT THE COMMUNITY</span><h1 class="page-title">Student AI Project Community</h1><p>学生 AI 项目交流社区。这里不只是作品陈列，更是分享想法、体验创造和互相启发的地方。</p><div class="about-flow">${steps.map(([number, title, chinese, copy]) => `<article class="info-card"><span>${number}</span><h2>${title}<small>${chinese}</small></h2><p>${copy}</p></article>`).join("")}</div></main>${footer()}</div>`;
}

function privacy() {
  const items = [["What visitors can see", "Only approved project information: creator display name, grade, description, categories, technologies and the interactive work."], ["What stays private", "The Hub does not publish student email addresses, private school identifiers, passwords or administrative information."], ["Demonstration data", "This principal preview contains three fictional sample projects. It does not connect to the school database or store visitor input."], ["Future administration", "The production version will protect uploading and publishing behind a secure administrator sign-in."]];
  return `<div class="shell fade-in">${header("privacy")}<main id="app-main" class="info-page"><span class="eyebrow">PRIVACY AT THE HUB</span><h1 class="page-title">Student work is public.<br>Private details are not.</h1><p>公开作品，保护学生。正式上线前，我们会继续完善学校审核与隐私流程。</p><div class="privacy-grid">${items.map(([title, copy], index) => `<article class="info-card"><span>0${index + 1}</span><h2>${title}</h2><p>${copy}</p></article>`).join("")}</div></main>${footer()}</div>`;
}

function render() {
  document.body.classList.remove("runner-open");
  const parts = route();
  const project = parts[0] === "projects" && parts[1] ? projects.find((item) => item.slug === parts[1]) : null;
  if (project && parts[2] === "experience") app.innerHTML = runner(project);
  else if (project) app.innerHTML = detail(project);
  else if (parts[0] === "projects") { app.innerHTML = gallery(); bindGallery(); }
  else if (parts[0] === "about") app.innerHTML = about();
  else if (parts[0] === "privacy") app.innerHTML = privacy();
  else app.innerHTML = home();
  document.title = project ? `${parts[2] === "experience" ? "Experience " : ""}${project.title} · AI Workshop Hub` : `${parts[0] === "home" ? "" : `${parts[0][0].toUpperCase()}${parts[0].slice(1)} · `}AI Workshop Hub`;
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", render);
render();
