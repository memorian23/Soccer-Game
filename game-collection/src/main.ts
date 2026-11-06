import { ENGINES, MODES, SPEEDS, TOTAL, allEntries, entry } from "./core/catalog";
import { MODE_RULES, Runner } from "./core/runner";
import { muted, setMuted } from "./core/sfx";
import type { GameEntry } from "./core/types";

// ---------- 저장소 ----------
const store = {
  get<T>(k: string, d: T): T {
    try {
      const v = localStorage.getItem(k);
      return v ? (JSON.parse(v) as T) : d;
    } catch {
      return d;
    }
  },
  set(k: string, v: unknown) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
      /* 저장 불가 환경 */
    }
  },
};
const best: Record<string, number> = store.get("g9k.best", {});
const favs = new Set<number>(store.get<number[]>("g9k.favs", []));
let recent: number[] = store.get("g9k.recent", []);

// ---------- 상태 ----------
const PAGE = 48;
const state = {
  q: "",
  cat: "전체",
  engine: "",
  mode: "",
  speed: "",
  view: "all" as "all" | "fav" | "recent" | "played",
  page: 0,
};

const CATS = ["전체", ...Array.from(new Set(ENGINES.map((e) => e.category)))];

const app = document.getElementById("app")!;
app.innerHTML = `
<header>
  <div class="top">
    <h1>🎮 게임 <b>9000</b></h1>
    <span class="stats" id="stats"></span>
    <span class="spacer"></span>
    <input id="search" placeholder="검색 (이름 또는 번호)" />
    <select id="engine"><option value="">모든 종류 (${ENGINES.length})</option>${ENGINES.map((e) => `<option value="${e.id}">${e.icon} ${e.name}</option>`).join("")}</select>
    <select id="mode"><option value="">모든 모드</option>${MODES.map((m) => `<option value="${m.id}">${m.label}</option>`).join("")}</select>
    <select id="speed"><option value="">모든 속도</option>${SPEEDS.map((s) => `<option value="${s.v}">${s.label}</option>`).join("")}</select>
    <button id="random" class="primary">🎲 랜덤 게임</button>
    <button id="mute"></button>
  </div>
  <div class="chips" id="cats"></div>
  <div class="chips" id="views"></div>
</header>
<main>
  <div class="grid" id="grid"></div>
  <div class="pager" id="pager"></div>
</main>
<div id="play">
  <div class="bar">
    <button id="back">← 목록 (Esc)</button>
    <span class="ttl" id="pTitle"></span>
    <span class="sub" id="pSub"></span>
    <span class="spacer"></span>
    <span class="sub" id="pBest"></span>
    <button id="pFav"></button>
    <button id="pRestart">↻ 다시 (R)</button>
    <button id="pNext">🎲 다른 게임</button>
  </div>
  <div class="stage"><canvas id="cv"></canvas></div>
  <div class="help" id="pHelp"></div>
</div>`;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const grid = $("grid");
const pager = $("pager");

function saveBest(e: GameEntry, score: number) {
  if (score > (best[e.id] ?? 0)) {
    best[e.id] = score;
    store.set("g9k.best", best);
  }
}

function filtered(): GameEntry[] {
  let list: GameEntry[];
  if (state.view === "fav") list = [...favs].sort((a, b) => a - b).map(entry);
  else if (state.view === "recent") list = recent.map(entry);
  else if (state.view === "played") list = Object.keys(best).map((k) => entry(Number(k.slice(1)))).sort((a, b) => a.no - b.no);
  else list = allEntries();
  const q = state.q.trim();
  return list.filter((e) => {
    if (state.cat !== "전체" && e.engine.category !== state.cat) return false;
    if (state.engine && e.engine.id !== state.engine) return false;
    if (state.mode && e.params.mode !== state.mode) return false;
    if (state.speed && String(e.params.speed) !== state.speed) return false;
    if (q) {
      if (/^#?\d+$/.test(q)) return String(e.no).startsWith(q.replace("#", ""));
      return e.title.includes(q) || e.engine.desc.includes(q);
    }
    return true;
  });
}

function card(e: GameEntry) {
  const t = e.params.theme;
  const b = best[e.id];
  return `<div class="card" data-no="${e.no}">
    <div class="thumb" style="background:linear-gradient(135deg, ${t.bg}, ${t.muted} 60%, ${t.accent})">
      <span class="no" style="color:${t.fg}">#${e.no}</span>
      <button class="fav ${favs.has(e.no) ? "on" : ""}" data-fav="${e.no}" title="즐겨찾기">★</button>
      ${e.engine.icon}
    </div>
    <div class="info">
      <div class="title">${e.title}</div>
      <div class="meta"><span>${e.engine.category}</span><span class="best">${b !== undefined ? `🏆 ${b}` : ""}</span></div>
    </div>
  </div>`;
}

function render() {
  const list = filtered();
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  state.page = Math.min(state.page, pages - 1);
  const slice = list.slice(state.page * PAGE, (state.page + 1) * PAGE);
  grid.style.display = slice.length ? "" : "block";
  grid.innerHTML = slice.length ? slice.map(card).join("") : `<div class="empty">조건에 맞는 게임이 없어요.</div>`;

  const btn = (label: string, p: number, dis = false) =>
    `<button data-page="${p}" ${dis ? "disabled" : ""}>${label}</button>`;
  pager.innerHTML =
    btn("« 처음", 0, state.page === 0) +
    btn("‹ 이전", state.page - 1, state.page === 0) +
    `<span class="stats">${state.page + 1} / ${pages} 페이지 · ${list.length.toLocaleString()}개</span>` +
    btn("다음 ›", state.page + 1, state.page >= pages - 1) +
    btn("끝 »", pages - 1, state.page >= pages - 1);

  $("cats").innerHTML = CATS.map((c) => `<button class="chip ${state.cat === c ? "on" : ""}" data-cat="${c}">${c}</button>`).join("");
  const views: [typeof state.view, string][] = [
    ["all", `전체 ${TOTAL.toLocaleString()}`],
    ["fav", `★ 즐겨찾기 ${favs.size}`],
    ["recent", `🕘 최근 ${recent.length}`],
    ["played", `🏆 기록 있음 ${Object.keys(best).length}`],
  ];
  $("views").innerHTML = views.map(([v, l]) => `<button class="chip ${state.view === v ? "on" : ""}" data-view="${v}">${l}</button>`).join("");
  $("stats").textContent = `${ENGINES.length}가지 장르 × 300가지 변형 = ${TOTAL.toLocaleString()}개 게임 · 플레이한 게임 ${Object.keys(best).length}개`;
  $("mute").textContent = muted ? "🔇" : "🔊";
}

// ---------- 플레이 화면 ----------
let runner: Runner | null = null;
let current: GameEntry | null = null;

function updatePlayBar() {
  if (!current) return;
  $("pBest").textContent = `최고 기록 ${best[current.id] ?? 0}`;
  $("pFav").textContent = favs.has(current.no) ? "★ 즐겨찾기됨" : "☆ 즐겨찾기";
}

function play(no: number) {
  closeGame(false);
  const e = entry(no);
  current = e;
  recent = [no, ...recent.filter((n) => n !== no)].slice(0, 60);
  store.set("g9k.recent", recent);
  $("pTitle").textContent = `#${e.no} ${e.engine.icon} ${e.title}`;
  $("pSub").textContent = MODE_RULES[e.params.mode].label;
  $("pHelp").textContent = `${e.engine.desc}  ·  조작: ${e.engine.controls}  ·  P 일시정지`;
  updatePlayBar();
  $("play").classList.add("on");
  runner = new Runner($<HTMLCanvasElement>("cv"), e, (score) => {
    saveBest(e, score);
    updatePlayBar();
  });
  history.replaceState(null, "", `#${no}`);
}

function closeGame(rerender = true) {
  if (runner && current) {
    if (!runner.isOver) saveBest(current, runner.currentScore);
    runner.destroy();
  }
  runner = null;
  current = null;
  $("play").classList.remove("on");
  if (rerender) {
    history.replaceState(null, "", location.pathname);
    render();
  }
}

const randomNo = () => {
  const list = filtered();
  return list.length ? list[Math.floor(Math.random() * list.length)].no : 1 + Math.floor(Math.random() * TOTAL);
};

// ---------- 이벤트 ----------
document.addEventListener("click", (ev) => {
  const t = ev.target as HTMLElement;
  const fav = t.closest<HTMLElement>("[data-fav]");
  if (fav) {
    ev.stopPropagation();
    const n = Number(fav.dataset.fav);
    favs.has(n) ? favs.delete(n) : favs.add(n);
    store.set("g9k.favs", [...favs]);
    render();
    return;
  }
  const c = t.closest<HTMLElement>(".card");
  if (c) return play(Number(c.dataset.no));
  const pg = t.closest<HTMLElement>("[data-page]");
  if (pg && !(pg as HTMLButtonElement).disabled) {
    state.page = Number(pg.dataset.page);
    render();
    window.scrollTo({ top: 0 });
    return;
  }
  const cat = t.closest<HTMLElement>("[data-cat]");
  if (cat) {
    state.cat = cat.dataset.cat!;
    state.page = 0;
    return render();
  }
  const view = t.closest<HTMLElement>("[data-view]");
  if (view) {
    state.view = view.dataset.view as typeof state.view;
    state.page = 0;
    return render();
  }
});

$("search").addEventListener("input", (e) => {
  state.q = (e.target as HTMLInputElement).value;
  state.page = 0;
  render();
});
for (const id of ["engine", "mode", "speed"] as const)
  $(id).addEventListener("change", (e) => {
    state[id] = (e.target as HTMLSelectElement).value;
    state.page = 0;
    render();
  });
$("random").addEventListener("click", () => play(randomNo()));
$("mute").addEventListener("click", () => {
  setMuted(!muted);
  render();
});
$("back").addEventListener("click", () => closeGame());
$("pRestart").addEventListener("click", () => runner?.start());
$("pNext").addEventListener("click", () => play(randomNo()));
$("pFav").addEventListener("click", () => {
  if (!current) return;
  favs.has(current.no) ? favs.delete(current.no) : favs.add(current.no);
  store.set("g9k.favs", [...favs]);
  updatePlayBar();
});
window.addEventListener("keydown", (e) => {
  if (!current) return;
  if (e.key === "Escape") closeGame();
  else if ((e.key === "r" || e.key === "R") && runner && !runner.isOver && current.engine.id !== "typing") runner.start();
});

render();
const hashNo = Number(location.hash.slice(1));
if (hashNo >= 1 && hashNo <= TOTAL) play(hashNo);
