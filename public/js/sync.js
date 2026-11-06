// Room storage. Firebase Realtime Database when configured, otherwise a
// BroadcastChannel + localStorage stand-in for testing in one browser.
import { firebaseConfig } from "./firebase-config.js";
import { norm } from "./game.js";

export const isLocal = !firebaseConfig.apiKey;

const SDK = "https://www.gstatic.com/firebasejs/10.12.2";
let F, db;
async function fb() {
  if (!F) {
    const app = await import(`${SDK}/firebase-app.js`);
    F = await import(`${SDK}/firebase-database.js`);
    db = F.getDatabase(app.initializeApp(firebaseConfig));
  }
  return F;
}

const ch = isLocal ? new BroadcastChannel("care-theory") : null;
const localStateListeners = new Set();
const stateKey = code => `ct:${code}:state`;
const readLocal = code => norm(JSON.parse(localStorage.getItem(stateKey(code)) || "null"));

export async function getState(code) {
  if (isLocal) return readLocal(code);
  const f = await fb();
  return norm((await f.get(f.ref(db, `rooms/${code}/state`))).val());
}

export async function writeState(code, state) {
  const clean = JSON.parse(JSON.stringify(state));
  if (isLocal) {
    localStorage.setItem(stateKey(code), JSON.stringify(clean));
    ch.postMessage({ kind: "state", code });
    localStateListeners.forEach(l => l.code === code && l.cb(norm(clean)));
    return;
  }
  const f = await fb();
  await f.set(f.ref(db, `rooms/${code}/state`), clean);
}

export function watchState(code, cb) {
  if (isLocal) {
    const l = { code, cb };
    localStateListeners.add(l);
    const onMsg = e => e.data.kind === "state" && e.data.code === code && cb(readLocal(code));
    ch.addEventListener("message", onMsg);
    cb(readLocal(code));
    return () => { localStateListeners.delete(l); ch.removeEventListener("message", onMsg); };
  }
  let off = () => {};
  fb().then(f => { off = f.onValue(f.ref(db, `rooms/${code}/state`), snap => cb(norm(snap.val()))); });
  return () => off();
}

export async function sendAction(code, action) {
  if (isLocal) { ch.postMessage({ kind: "action", code, action }); return; }
  const f = await fb();
  await f.push(f.ref(db, `rooms/${code}/actions`), action);
}

// Host only: receives each action once, in order, then deletes it.
export function watchActions(code, cb) {
  if (isLocal) {
    ch.addEventListener("message", e => e.data.kind === "action" && e.data.code === code && cb(e.data.action));
    return;
  }
  fb().then(f => {
    f.onChildAdded(f.ref(db, `rooms/${code}/actions`), snap => { cb(snap.val()); f.remove(snap.ref); });
  });
}
