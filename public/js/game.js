// Pure game rules. The host screen is the only place that calls apply(),
// so every phone sees the same authoritative state.
import { FINISH, MOVE_TILES, NO_SELF_TILES, SKIP_PENALTY, MIN_PLAYERS, MAX_PLAYERS, PODIUM_SIZE, COLORS } from "./tiles.js";

export function newState() {
  return { phase: "lobby", players: {}, order: [], turn: 0, step: "roll", roll: 0, tile: 0, winners: [], msg: "Waiting for players to join", seq: 0 };
}

// Firebase drops empty arrays/objects, so restore them after every read.
export function norm(s) {
  if (!s) return s;
  s.players ||= {};
  s.order ||= [];
  s.winners ||= [];
  return s;
}

export const currentId = s => s.order[s.turn];

function finish(s, id) {
  s.winners.push(id);
  s.players[id].rank = s.winners.length;
}

function nextTurn(s) {
  s.step = "roll";
  s.tile = 0;
  const left = s.order.filter(id => !s.players[id].rank);
  if (s.winners.length >= PODIUM_SIZE || left.length <= 1) {
    if (left.length === 1 && s.winners.length < PODIUM_SIZE) finish(s, left[0]);
    s.phase = "ended";
    s.msg = "Game over";
    return;
  }
  let t = s.turn;
  do t = (t + 1) % s.order.length; while (s.players[s.order[t]].rank);
  s.turn = t;
}

// Returns a new state, or the same object if the action is not allowed.
export function apply(state, a) {
  const s = norm(JSON.parse(JSON.stringify(state)));
  const p = s.players[a.pid];
  const myTurn = s.phase === "playing" && currentId(s) === a.pid;

  switch (a.type) {
    case "join": {
      const name = String(a.name || "").trim().slice(0, 24);
      const taken = Object.values(s.players).some(x => x.symbol === a.symbol);
      if (p || s.phase !== "lobby" || s.order.length >= MAX_PLAYERS || !name || taken) return state;
      s.players[a.pid] = { name, symbol: a.symbol, color: COLORS[s.order.length % COLORS.length], pos: 0 };
      s.order.push(a.pid);
      s.msg = `${name} joined`;
      break;
    }
    case "start": {
      if (s.phase !== "lobby" || s.order.length < MIN_PLAYERS) return state;
      s.phase = "playing";
      s.turn = 0;
      s.step = "roll";
      s.msg = `${s.players[currentId(s)].name} goes first`;
      break;
    }
    case "roll": {
      const n = Math.floor(a.value);
      if (!myTurn || s.step !== "roll" || !(n >= 1 && n <= 6)) return state;
      s.roll = n;
      const target = p.pos + n;
      if (target > FINISH) {
        s.msg = `${p.name} rolled ${n}, but needs exactly ${FINISH - p.pos} to finish. Stays on tile ${p.pos}.`;
        nextTurn(s);
      } else if (target === FINISH) {
        p.pos = target;
        finish(s, a.pid);
        s.msg = `${p.name} rolled ${n} and finished in place #${p.rank}!`;
        nextTurn(s);
      } else {
        p.pos = target;
        s.tile = target;
        s.step = MOVE_TILES.includes(target) ? "pick" : "tile";
        s.msg = `${p.name} rolled ${n} and landed on tile ${target}`;
      }
      break;
    }
    case "done": {
      if (!myTurn || s.step !== "tile") return state;
      s.msg = `${p.name} completed tile ${p.pos}`;
      nextTurn(s);
      break;
    }
    case "skip": {
      if (!myTurn || s.step !== "tile") return state;
      p.pos = Math.max(0, p.pos - SKIP_PENALTY);
      s.msg = `${p.name} skipped and moved back to ${p.pos ? "tile " + p.pos : "the start"}`;
      nextTurn(s);
      break;
    }
    case "pick": {
      const t = s.players[a.target];
      if (!myTurn || s.step !== "pick" || !t || t.rank) return state;
      if (a.target === a.pid && NO_SELF_TILES.includes(p.pos)) return state;
      t.pos += 1;
      if (t.pos === FINISH) {
        finish(s, a.target);
        s.msg = `${p.name} moved ${t.name} forward, and ${t.name} finished in place #${t.rank}!`;
      } else {
        s.msg = `${p.name} moved ${a.target === a.pid ? "themselves" : t.name} forward to tile ${t.pos}`;
      }
      nextTurn(s);
      break;
    }
    default:
      return state;
  }
  s.seq++;
  return s;
}
