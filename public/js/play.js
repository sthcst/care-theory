import { SYMBOLS, NO_SELF_TILES, FINISH, tileText } from "./tiles.js";
import { currentId } from "./game.js";
import { isLocal, watchState, sendAction } from "./sync.js";

const app = document.getElementById("app");
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const code = (new URLSearchParams(location.search).get("room") || "").toUpperCase();
if (!code) location.href = "index.html";
if (isLocal) document.getElementById("banner").innerHTML = `<div class="banner">Local test mode</div>`;

// Local test mode uses per-tab storage so several tabs can each be a player.
const store = isLocal ? sessionStorage : localStorage;
const pidKey = `ct-pid-${code}`;
let pid = store.getItem(pidKey);
if (!pid) { pid = Math.random().toString(36).slice(2, 12); store.setItem(pidKey, pid); }

let state = null, view = "", seenSeq = -1, pending = false;
let joinName = "", joinSymbol = "", joinError = "", joinTimer = 0, dice = 0;

const send = action => { pending = true; sendAction(code, { ...action, pid }); render(); };

const who = p => `<div class="who"><span class="sym" style="background:${p.color}">${p.symbol}</span>${esc(p.name)}</div>`;

function render() {
  const s = state;
  if (!s) return show("missing", `<h1>Room ${esc(code)} not found</h1><p class="muted">Check the code on the big screen.</p><a href="index.html">Try another code</a>`);
  const me = s.players[pid];

  if (!me) {
    if (s.phase !== "lobby") return show("late", `<h1>This game already started</h1><p class="muted">Ask the host to start a new game to join.</p>`);
    return renderJoin(s);
  }

  if (s.phase === "lobby") {
    return show(`lobby-${s.order.length}`, `${who(me)}<h1>You're in!</h1><p class="muted">Waiting for the host to start. ${s.order.length} joined so far.</p>`);
  }

  if (s.phase === "ended") {
    return show("ended", `${who(me)}<h1>Game over</h1>
      ${me.rank ? `<div class="big-rank">#${me.rank}</div>` : ""}
      <div class="card">${s.winners.map((id, i) => `<div>#${i + 1} ${s.players[id].symbol} ${esc(s.players[id].name)}</div>`).join("")}</div>`);
  }

  if (me.rank) {
    return show(`fin-${s.seq}`, `${who(me)}<h1>You finished!</h1><div class="big-rank">#${me.rank}</div><p class="muted">${esc(s.msg)}</p>`);
  }

  const posText = me.pos ? `You're on tile ${me.pos}` : "You're at the start";
  if (currentId(s) !== pid) {
    const cur = s.players[currentId(s)];
    return show(`wait-${s.seq}`, `${who(me)}<p class="muted">${posText}</p>
      <div class="card"><div class="muted">Now playing</div><div class="q">${cur.symbol} ${esc(cur.name)}</div></div>
      <p class="muted">${esc(s.msg)}</p>`);
  }

  if (s.step === "roll") {
    const need = FINISH - me.pos;
    show(`roll-${s.seq}-${dice}-${pending}`, `${who(me)}<p class="muted">${posText}${need <= 6 ? ` · you need exactly ${need} to finish` : ""}</p>
      <h1>Your turn! Roll the dice</h1>
      <p class="muted">Tap the number you rolled.</p>
      <div class="dice">${[1, 2, 3, 4, 5, 6].map(n => `<button data-n="${n}" class="${n === dice ? "sel" : ""}" ${pending ? "disabled" : ""}>${n}</button>`).join("")}</div>
      <button class="primary" id="go" ${!dice || pending ? "disabled" : ""}>${dice ? `Move ${dice} tile${dice > 1 ? "s" : ""}` : "Pick a number"}</button>`);
    app.querySelectorAll("[data-n]").forEach(b => b.onclick = () => { dice = +b.dataset.n; render(); });
    document.getElementById("go").onclick = () => dice && send({ type: "roll", value: dice });
    return;
  }

  if (s.step === "tile") {
    show(`tile-${s.seq}-${pending}`, `${who(me)}
      <div class="card"><div class="muted">Tile ${s.tile}</div><div class="q">${esc(tileText(s.tile))}</div></div>
      <p class="muted">Answer out loud, then tap one. This can't be undone.</p>
      <div class="stack">
        <button class="primary" id="done" ${pending ? "disabled" : ""}>Done</button>
        <button id="skip" ${pending ? "disabled" : ""}>Skip, move back 2</button>
      </div>`);
    document.getElementById("done").onclick = () => send({ type: "done" });
    document.getElementById("skip").onclick = () => send({ type: "skip" });
    return;
  }

  if (s.step === "pick") {
    const noSelf = NO_SELF_TILES.includes(me.pos);
    const options = s.order.filter(id => !s.players[id].rank && !(noSelf && id === pid));
    show(`pick-${s.seq}-${pending}`, `${who(me)}
      <div class="card"><div class="muted">Tile ${s.tile}</div><div class="q">${esc(tileText(s.tile))}</div></div>
      <p class="muted">Tap who moves forward 1 tile. This can't be undone.</p>
      <div class="stack">${options.map(id => {
        const p = s.players[id];
        return `<button class="pick" data-id="${id}" ${pending ? "disabled" : ""}><span class="sym" style="background:${p.color};width:32px;height:32px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center">${p.symbol}</span>${esc(p.name)}${id === pid ? " (you)" : ""} <span class="muted" style="margin-left:auto">${p.pos ? "tile " + p.pos : "start"}</span></button>`;
      }).join("")}</div>`);
    app.querySelectorAll("[data-id]").forEach(b => b.onclick = () => send({ type: "pick", target: b.dataset.id }));
  }
}

function show(key, html) {
  if (key === view) return;
  view = key;
  app.innerHTML = html;
}

// The join form updates in place so typing isn't interrupted when others join.
function renderJoin(s) {
  const taken = new Set(Object.values(s.players).map(p => p.symbol));
  if (taken.has(joinSymbol) && !pending) joinSymbol = "";
  if (view !== "join") {
    view = "join";
    app.innerHTML = `<h1>Join Care Theory</h1><p class="muted">Room ${esc(code)}. If you're a tandem, use one phone and both your names.</p>
      <label class="stack"><span>Your name or tandem name</span><input id="name" maxlength="24" placeholder="Ana &amp; Ben"></label>
      <div>Pick a symbol</div><div class="symbols" id="syms"></div>
      <div class="err" id="err"></div>
      <button class="primary" id="join">Join</button>`;
    const nameEl = document.getElementById("name");
    nameEl.value = joinName;
    nameEl.oninput = () => { joinName = nameEl.value; joinError = ""; renderJoin(state); };
    document.getElementById("join").onclick = () => {
      if (!joinName.trim()) joinError = "Enter a name first.";
      else if (!joinSymbol) joinError = "Pick a symbol first.";
      else {
        joinError = "";
        pending = true;
        sendAction(code, { type: "join", pid, name: joinName.trim(), symbol: joinSymbol });
        joinTimer = setTimeout(() => { pending = false; joinError = "Couldn't join. The game may be full or that symbol was just taken."; renderJoin(state); }, 6000);
      }
      renderJoin(state);
    };
  }
  document.getElementById("syms").innerHTML = SYMBOLS.map(sym =>
    `<button data-s="${sym}" class="${sym === joinSymbol ? "sel" : ""}" ${taken.has(sym) || pending ? "disabled" : ""}>${sym}</button>`).join("");
  document.querySelectorAll("[data-s]").forEach(b => b.onclick = () => { joinSymbol = b.dataset.s; joinError = ""; renderJoin(state); });
  document.getElementById("err").textContent = joinError;
  const btn = document.getElementById("join");
  btn.disabled = pending;
  btn.textContent = pending ? "Joining…" : "Join";
}

watchState(code, s => {
  state = s;
  if (s && s.seq !== seenSeq) { seenSeq = s.seq; pending = false; dice = 0; }
  if (s?.players[pid]) clearTimeout(joinTimer);
  render();
});
