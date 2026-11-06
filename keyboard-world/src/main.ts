import "./style.css";
import { Game } from "./game";
import { LEVELS, REWARD, type LevelDef } from "./levels";
import { loadSave, writeSave, formatFull, formatShort } from "./save";
import { UNITS, clampSpeed, formatSpeed, moveSpeedFor, parseSpeedText, BASE_MOVE } from "./speed";
import type { TrailStyle } from "./effects";

interface ShopItem {
  id: string;
  name: string;
  icon: string;
  desc: string;
  price: bigint;
  trail?: TrailStyle;
}

const SHOP: ShopItem[] = [
  { id: "footprints", name: "발자국", icon: "👣", desc: "걸어가면 뒤에 발자국이 남아요", price: 1n },
  { id: "rainbow", name: "무지개 꼬리", icon: "🌈", desc: "앞으로 가면 뒤에 무지개가 따라와요", price: 1n, trail: "rainbow" },
  { id: "fire", name: "불꽃 꼬리", icon: "🔥", desc: "앞으로 가면 뒤에 불꽃이 피어올라요", price: 1n, trail: "fire" },
  { id: "star", name: "별가루 꼬리", icon: "✨", desc: "앞으로 가면 뒤에 반짝이 가루가 흩날려요", price: 1n, trail: "star" },
];

const save = loadSave();
save.speed = clampSpeed(save.speed);

const app = document.getElementById("app")!;
const game = new Game(app);

// ---------- HUD ----------
const hud = document.createElement("div");
hud.id = "hud";
hud.innerHTML = `
  <div class="top-left panel">
    <div id="levelName">⌨️ 키보드 월드</div>
    <div id="deaths" class="sub"></div>
  </div>
  <div class="top-right">
    <div class="panel trophy" id="trophy" title=""></div>
    <button id="btnShop">🛒 상점</button>
    <button id="btnLevels">🗺️ 레벨</button>
  </div>
  <div class="help">WASD/방향키: 이동 · Space: 점프 · 마우스 드래그: 시점 · 휠: 줌 · R: 처음부터</div>
  <div id="toast"></div>
  <div class="speedbar panel">
    <div class="speed-row">
      <span class="label">⚡ 속도</span>
      <input id="speedInput" inputmode="decimal" placeholder="숫자 (예: 5 또는 5m)" />
      <div class="units">
        ${UNITS.map((u, i) => `<button class="unit" data-unit="${u.key}" title="${u.name}">${u.key}<small>${"▶".repeat(i + 1)}</small></button>`).join("")}
      </div>
      <button id="speedReset" class="ghost">기본</button>
    </div>
    <div class="speed-now" id="speedNow"></div>
  </div>
  <div class="touch">
    <div class="pad">
      <button data-k="KeyW">▲</button><button data-k="KeyA">◀</button><button data-k="KeyS">▼</button><button data-k="KeyD">▶</button>
    </div>
    <button class="jump" data-k="Space">점프</button>
  </div>
`;
app.appendChild(hud);

const overlay = document.createElement("div");
overlay.id = "overlay";
app.appendChild(overlay);

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const speedInput = $<HTMLInputElement>("speedInput");
let currentLevel: LevelDef | null = null;

function persist(): void {
  writeSave(save);
}

function refreshTrophies(): void {
  const el = $("trophy");
  el.textContent = `🏆 ${formatShort(save.trophies)}`;
  el.title = `${formatFull(save.trophies)} 트로피`;
}

function refreshSpeed(): void {
  const mult = moveSpeedFor(save.speed) / BASE_MOVE;
  $("speedNow").innerHTML =
    `현재 속도 <b>${formatSpeed(save.speed)}</b> · 이동 ×${mult.toFixed(2)} ` +
    `<span class="order">빠르기: k &lt; m &lt; b &lt; t · 숫자가 클수록 빨라져요</span>`;
  game.setMoveSpeed(moveSpeedFor(save.speed));
}

function setSpeed(v: number): void {
  save.speed = clampSpeed(v);
  persist();
  refreshSpeed();
  toast(`⚡ 속도 ${formatSpeed(save.speed)}`);
}

function applyCosmetics(): void {
  const trailItem = SHOP.find((s) => s.trail && save.equipped.includes(s.id));
  game.setCosmetics(save.equipped.includes("footprints"), trailItem?.trail ?? null);
}

let toastTimer = 0;
function toast(msg: string): void {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => t.classList.remove("show"), 1600);
}

// 속도 입력
document.querySelectorAll<HTMLButtonElement>(".unit").forEach((btn) =>
  btn.addEventListener("click", () => {
    const unit = UNITS.find((u) => u.key === btn.dataset.unit)!;
    const raw = speedInput.value.trim().replace(/[kmbt]$/i, "");
    const n = raw === "" ? 1 : parseFloat(raw);
    if (!(n > 0)) return toast("숫자를 입력하세요");
    speedInput.value = `${n}`;
    setSpeed(n * unit.mult);
    btn.blur();
  }),
);
speedInput.addEventListener("keydown", (e) => {
  e.stopPropagation();
  if (e.key !== "Enter") return;
  const v = parseSpeedText(speedInput.value);
  if (v === null) return toast("예: 5, 2.5k, 10m, 3b, 1t");
  setSpeed(v);
  speedInput.blur();
});
$("speedReset").addEventListener("click", (e) => {
  speedInput.value = "";
  setSpeed(1);
  (e.currentTarget as HTMLElement).blur();
});

// 터치 버튼
document.querySelectorAll<HTMLButtonElement>(".touch [data-k]").forEach((b) => {
  const k = b.dataset.k!;
  b.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    game.setVirtualKey(k, true);
  });
  for (const ev of ["pointerup", "pointerleave", "pointercancel"]) b.addEventListener(ev, () => game.setVirtualKey(k, false));
});

// ---------- 화면들 ----------
function showOverlay(html: string): void {
  overlay.innerHTML = `<div class="modal">${html}</div>`;
  overlay.classList.add("show");
  game.paused = true;
}

function hideOverlay(): void {
  overlay.classList.remove("show");
  overlay.innerHTML = "";
  game.paused = false;
}

function isUnlocked(id: number): boolean {
  return id === 1 || save.cleared.includes(id - 1);
}

function showMenu(): void {
  const cards = LEVELS.map((lv) => {
    const unlocked = isUnlocked(lv.id);
    const cleared = save.cleared.includes(lv.id);
    return `<button class="level-card ${unlocked ? "" : "locked"}" data-level="${lv.id}" ${unlocked ? "" : "disabled"} style="--c:${lv.color}">
      <span class="lv">Lv.${lv.id}</span>
      <span class="name">${lv.name}</span>
      <span class="desc">${unlocked ? lv.desc : "이전 레벨을 성공하면 열려요"}</span>
      <span class="status">${cleared ? "✅ 성공" : unlocked ? "▶ 도전" : "🔒 잠김"}</span>
    </button>`;
  }).join("");
  showOverlay(`
    <h1>⌨️ 키보드 월드</h1>
    <p class="lead">거대한 키보드 위를 달려 <b class="enter">Enter</b> 키에 도착하면 성공!<br/>
    성공 보상: <b class="gold">${formatFull(REWARD)} 🏆</b></p>
    <div class="levels">${cards}</div>
    <div class="actions">
      <button id="menuShop">🛒 상점</button>
      ${currentLevel ? `<button id="menuBack" class="ghost">계속하기</button>` : ""}
    </div>
  `);
  overlay.querySelectorAll<HTMLButtonElement>("[data-level]").forEach((b) =>
    b.addEventListener("click", () => startLevel(LEVELS.find((l) => l.id === Number(b.dataset.level))!)),
  );
  $("menuShop").addEventListener("click", () => showShop(showMenu));
  document.getElementById("menuBack")?.addEventListener("click", hideOverlay);
}

function showShop(back: () => void): void {
  const items = SHOP.map((it) => {
    const owned = save.owned.includes(it.id);
    const equipped = save.equipped.includes(it.id);
    const canBuy = save.trophies >= it.price;
    let btn: string;
    if (!owned) btn = `<button data-buy="${it.id}" ${canBuy ? "" : "disabled"}>${canBuy ? "구매" : "트로피 부족"}</button>`;
    else btn = `<button data-equip="${it.id}" class="${equipped ? "on" : "ghost"}">${equipped ? "장착 중 ✔" : "장착"}</button>`;
    return `<div class="shop-item">
      <div class="icon">${it.icon}</div>
      <div class="info"><div class="name">${it.name}</div><div class="desc">${it.desc}</div></div>
      <div class="price">${formatFull(it.price)} 🏆</div>
      ${btn}
    </div>`;
  }).join("");
  showOverlay(`
    <h2>🛒 상점</h2>
    <p class="lead">보유 트로피: <b class="gold">${formatFull(save.trophies)} 🏆</b></p>
    <div class="shop">${items}</div>
    <p class="hint">꼬리 효과는 한 번에 하나만 장착돼요. 발자국은 함께 쓸 수 있어요.</p>
    <div class="actions"><button id="shopBack" class="ghost">돌아가기</button></div>
  `);
  overlay.querySelectorAll<HTMLButtonElement>("[data-buy]").forEach((b) =>
    b.addEventListener("click", () => {
      const it = SHOP.find((s) => s.id === b.dataset.buy)!;
      if (save.trophies < it.price || save.owned.includes(it.id)) return;
      save.trophies -= it.price;
      save.owned.push(it.id);
      equip(it);
      persist();
      refreshTrophies();
      showShop(back);
    }),
  );
  overlay.querySelectorAll<HTMLButtonElement>("[data-equip]").forEach((b) =>
    b.addEventListener("click", () => {
      const it = SHOP.find((s) => s.id === b.dataset.equip)!;
      if (save.equipped.includes(it.id)) save.equipped = save.equipped.filter((id) => id !== it.id);
      else equip(it);
      persist();
      applyCosmetics();
      showShop(back);
    }),
  );
  $("shopBack").addEventListener("click", back);
}

function equip(it: ShopItem): void {
  if (it.trail) save.equipped = save.equipped.filter((id) => !SHOP.find((s) => s.id === id)?.trail);
  if (!save.equipped.includes(it.id)) save.equipped.push(it.id);
  applyCosmetics();
}

function startLevel(lv: LevelDef): void {
  currentLevel = lv;
  game.loadLevel(lv);
  $("levelName").textContent = `Lv.${lv.id} ${lv.name}`;
  $("deaths").textContent = "떨어진 횟수 0";
  hideOverlay();
}

function showWin(): void {
  const lv = currentLevel!;
  save.trophies += REWARD;
  if (!save.cleared.includes(lv.id)) save.cleared.push(lv.id);
  persist();
  refreshTrophies();
  const next = LEVELS.find((l) => l.id === lv.id + 1);
  showOverlay(`
    <h1>🎉 성공!</h1>
    <p class="lead">Lv.${lv.id} ${lv.name} 클리어 · 떨어진 횟수 ${game.deaths}</p>
    <div class="reward">+${formatFull(REWARD)} 🏆</div>
    <p class="lead">보유 트로피: <b class="gold">${formatFull(save.trophies)}</b></p>
    <div class="actions">
      ${next ? `<button id="winNext">다음 레벨 ▶</button>` : `<div class="lead">🏁 모든 레벨 완료!</div>`}
      <button id="winRetry" class="ghost">다시 하기</button>
      <button id="winShop" class="ghost">🛒 상점</button>
      <button id="winMenu" class="ghost">레벨 선택</button>
    </div>
  `);
  if (next) $("winNext").addEventListener("click", () => startLevel(next));
  $("winRetry").addEventListener("click", () => startLevel(lv));
  // 상점에서 돌아오면 레벨 선택으로 (보상 중복 방지)
  $("winShop").addEventListener("click", () => showShop(showMenu));
  $("winMenu").addEventListener("click", showMenu);
}

game.onWin = showWin;
game.onDeath = (d) => {
  $("deaths").textContent = `떨어진 횟수 ${d}`;
  toast("💥 떨어졌다! 다시 시작");
};
game.onCheckpoint = () => toast("🚩 체크포인트!");

$("btnShop").addEventListener("click", (e) => {
  (e.currentTarget as HTMLElement).blur();
  showShop(() => (currentLevel ? hideOverlay() : showMenu()));
});
$("btnLevels").addEventListener("click", (e) => {
  (e.currentTarget as HTMLElement).blur();
  showMenu();
});
window.addEventListener("keydown", (e) => {
  if (e.code === "Escape" && overlay.classList.contains("show") && currentLevel) hideOverlay();
  else if (e.code === "KeyR" && !overlay.classList.contains("show") && currentLevel) {
    game.restart();
    $("deaths").textContent = "떨어진 횟수 0";
  }
});

if (save.speed > 1) speedInput.value = formatSpeed(save.speed);
refreshTrophies();
refreshSpeed();
applyCosmetics();
game.loadLevel(LEVELS[0]);
showMenu();
