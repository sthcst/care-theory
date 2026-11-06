import { FINISH, MIN_PLAYERS, MAX_PLAYERS, tileText } from "./tiles.js";
import { newState, apply, currentId } from "./game.js";
import { isLocal, getState, writeState, watchActions } from "./sync.js";

const $ = id => document.getElementById(id);
const board = $("board"), center = $("center"), tokensEl = $("tokens");
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

if (isLocal) $("banner").innerHTML = `<div class="banner">Local test mode: players must join from other tabs of this same browser. Add your Firebase config to play on phones.</div>`;

// ---------- Board cells: index 0 is the start pad, 1–24 go clockwise ----------
function cellPos(n) {
  if (n === 0) return [1, 1];
  const i = n - 1;
  if (i < 7) return [1, i + 2];
  if (i < 13) return [i - 5, 8];
  if (i < 19) return [7, 8 - (i - 12)];
  return [7 - (i - 18), 2];
}
const cells = [];
for (let n = 0; n <= FINISH; n++) {
  const el = document.createElement("div");
  el.className = "tile" + (n === 0 ? " start" : n === FINISH ? " finish" : "");
  el.textContent = n === 0 ? "Start" : n === FINISH ? `${n} 🏁` : n;
  [el.style.gridRow, el.style.gridColumn] = cellPos(n);
  board.insertBefore(el, center);
  cells.push(el);
}

// ---------- Room setup / resume ----------
const genCode = () => Array.from({ length: 4 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ"[Math.floor(Math.random() * 24)]).join("");
let code = new URLSearchParams(location.search).get("room") || localStorage.getItem("ct-host-room");
let state = code ? await getState(code) : null;
if (!state) {
  code = genCode();
  state = newState();
  await writeState(code, state);
}
localStorage.setItem("ct-host-room", code);
history.replaceState(null, "", `?room=${code}`);
const joinUrl = new URL(`play.html?room=${code}`, location.href).href;

const qrEl = document.createElement("div");
qrEl.className = "qr";
new QRCode(qrEl, { text: joinUrl, width: 256, height: 256 });

function commit(next) {
  if (next === state) return;
  state = next;
  writeState(code, state);
  render();
  layoutTokens();
}
watchActions(code, a => commit(apply(state, a)));

// ---------- Rendering ----------
const chip = (id, p) => `<span class="chip ${id === currentId(state) && state.phase === "playing" ? "turn" : ""} ${p.rank ? "done" : ""}">
  <span class="sym" style="background:${p.color}">${p.symbol}</span>${esc(p.name)} <span class="muted">· ${p.rank ? "#" + p.rank : p.pos || "start"}</span></span>`;
const chips = () => `<div class="chips">${state.order.map(id => chip(id, state.players[id])).join("")}</div>`;

let lastCard = "";
function render() {
  const s = state;
  cells.forEach((c, n) => c.classList.toggle("active", s.phase === "playing" && s.step !== "roll" && n === s.tile));

  if (s.phase === "lobby") {
    const n = s.order.length;
    center.innerHTML = `
      <h1>Care Theory</h1>
      <div class="lobby"><div id="qrslot"></div><div>
        <div class="muted">Join on your phone with code</div>
        <div class="code">${code}</div>
        <div class="muted" style="font-size:.8em;word-break:break-all">${esc(joinUrl)}</div>
      </div></div>
      <h2>${n} / ${MAX_PLAYERS} joined</h2>
      ${chips()}
      <div class="spacer"></div>
      <div><button class="primary" id="start" ${n < MIN_PLAYERS ? "disabled" : ""}>Start game</button>
      ${n < MIN_PLAYERS ? `<span class="muted"> Need at least ${MIN_PLAYERS} players</span>` : ""}</div>`;
    $("qrslot").appendChild(qrEl);
    $("start").onclick = () => commit(apply(state, { type: "start" }));
  } else if (s.phase === "playing") {
    const p = s.players[currentId(s)];
    const showCard = s.step !== "roll";
    const key = showCard ? `${s.seq}-${s.tile}` : "";
    const fresh = key && key !== lastCard;
    lastCard = key || lastCard;
    center.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px">
        <span class="chip" style="font-size:1.3em"><span class="sym" style="background:${p.color}">${p.symbol}</span>${esc(p.name)}'s turn</span>
        ${showCard ? `<span class="muted">rolled ${s.roll}</span>` : ""}
      </div>
      ${showCard ? `<div class="card ${fresh ? "reveal" : ""}"><div class="muted">Tile ${s.tile}</div><div class="q">${esc(tileText(s.tile))}</div></div>
        <div class="status">${s.step === "pick" ? "Choosing who moves forward…" : "Answer out loud, then tap Done or Skip"}</div>`
        : `<div class="card"><div class="q">Roll the dice!</div></div><div class="status">${esc(s.msg)}</div>`}
      <div class="spacer"></div>
      ${chips()}`;
  } else {
    const [a, b, c] = s.winners.map(id => s.players[id]);
    const step = (p, h, place) => p ? `<div class="step"><div class="big">${p.symbol}</div>${esc(p.name)}<div class="bar" style="height:${h}">${place}</div></div>` : "";
    center.innerHTML = `
      <h1>Game over</h1>
      <div class="podium">${step(b, "calc(var(--c) * 1.1)", 2)}${step(a, "calc(var(--c) * 1.6)", 1)}${step(c, "calc(var(--c) * .7)", 3)}</div>
      <div><button id="again">New game</button></div>`;
    $("again").onclick = () => { localStorage.removeItem("ct-host-room"); location.href = "host.html"; };
  }
}

// ---------- Pieces: step one tile at a time toward the real position ----------
const disp = {}, tokenEls = {};
function layoutTokens() {
  const c = cells[1].offsetWidth;
  const groups = {};
  for (const id of state.order) {
    const p = state.players[id];
    if (!tokenEls[id]) {
      const t = document.createElement("div");
      t.className = "token";
      tokensEl.appendChild(t);
      tokenEls[id] = t;
      disp[id] = p.pos;
    }
    const t = tokenEls[id];
    t.style.background = p.color;
    t.textContent = p.symbol;
    const k = (groups[disp[id]] = (groups[disp[id]] || 0) + 1) - 1;
    const cell = cells[disp[id]];
    t.style.left = cell.offsetLeft + c * (0.1 + (k % 3) * 0.29) + "px";
    t.style.top = cell.offsetTop + c * (0.3 + Math.floor(k / 3) * 0.24) + "px";
  }
}
setInterval(() => {
  let moved = false;
  for (const id of state.order) {
    const target = state.players[id].pos;
    if (disp[id] === undefined || disp[id] === target) continue;
    disp[id] += Math.sign(target - disp[id]);
    const t = tokenEls[id];
    t.classList.remove("hop"); void t.offsetWidth; t.classList.add("hop");
    moved = true;
  }
  if (moved) layoutTokens();
}, 280);
addEventListener("resize", layoutTokens);

render();
layoutTokens();
