/** Router hash + mục lục. Không framework, không build step. */
import { LESSONS, GROUPS, bySlug, isReady } from "./lessons/index.js";

const tocEl = document.getElementById("toc");
const mainEl = document.getElementById("main");
const menuBtn = document.getElementById("menuBtn");

/* ---------------------------------------------------------------- mục lục */
function buildToc() {
  tocEl.innerHTML = "";
  for (const g of GROUPS) {
    const h = document.createElement("h2");
    h.textContent = g.name;
    tocEl.append(h);
    for (const l of LESSONS.filter((x) => x.num >= g.from && x.num <= g.to)) {
      const a = document.createElement("a");
      a.href = `#/${l.slug}`;
      a.innerHTML = `<span class="n">${String(l.num).padStart(2, "0")}</span><span>${l.title}</span>`;
      if (!isReady(l)) a.classList.add("planned");
      tocEl.append(a);
    }
  }
}

function markCurrent(slug) {
  tocEl.querySelectorAll("a").forEach((a) => {
    if (a.getAttribute("href") === `#/${slug}`) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
}

/* ---------------------------------------------------------------- render */
let currentRoot = null;

async function route() {
  const slug = location.hash.replace(/^#\//, "") || LESSONS[0].slug;
  const lesson = bySlug(slug);

  if (currentRoot) currentRoot.dispatchEvent(new CustomEvent("lesson:leave"));

  if (!lesson) {
    mainEl.innerHTML = `<div class="wrap"><h2>Không tìm thấy bài này.</h2><p><a href="#/${LESSONS[0].slug}">Về bài 1</a></p></div>`;
    return;
  }

  markCurrent(slug);
  tocEl.classList.remove("open");
  menuBtn.setAttribute("aria-expanded", "false");

  const wrap = document.createElement("div");
  wrap.className = "wrap";
  wrap.innerHTML = `
    <div class="lesson-num">Bài ${String(lesson.num).padStart(2, "0")}</div>
    <h2 class="lesson-title">${lesson.title}</h2>`;

  const body = document.createElement("div");

  if (isReady(lesson)) {
    const mod = (await lesson.load()).default;
    if (mod.subtitle) {
      const p = document.createElement("p");
      p.className = "lesson-sub";
      p.textContent = mod.subtitle;
      wrap.append(p);
    }
    wrap.append(body);
    mod.render(body);
  } else {
    if (lesson.subtitle) {
      const p = document.createElement("p");
      p.className = "lesson-sub";
      p.textContent = lesson.subtitle;
      wrap.append(p);
    }
    body.innerHTML = `
      <div class="planned-box">
        <h4>Bài này đã có đề cương, chưa build</h4>
        <ul>${lesson.outline.map((o) => `<li>${o}</li>`).join("")}</ul>
      </div>`;
    wrap.append(body);
  }

  wrap.append(pager(lesson));
  mainEl.innerHTML = "";
  mainEl.append(wrap);
  currentRoot = body;
  mainEl.focus();
  window.scrollTo(0, 0);
}

function pager(lesson) {
  const i = LESSONS.findIndex((l) => l.num === lesson.num);
  const prev = LESSONS[i - 1], next = LESSONS[i + 1];
  const nav = document.createElement("div");
  nav.className = "pager";
  nav.innerHTML =
    (prev ? `<a href="#/${prev.slug}"><span class="lbl">← Bài trước</span>${prev.title}</a>` : "<span></span>") +
    (next ? `<a class="next" href="#/${next.slug}"><span class="lbl">Bài tiếp →</span>${next.title}</a>` : "<span></span>");
  return nav;
}

menuBtn.addEventListener("click", () => {
  const open = tocEl.classList.toggle("open");
  menuBtn.setAttribute("aria-expanded", String(open));
});

window.addEventListener("hashchange", route);
buildToc();
route();

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
