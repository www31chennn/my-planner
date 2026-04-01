// ── commons.js ────────────────────────────────────────────
// 所有模組共用的函式、元件、快取

// ── API ───────────────────────────────────────────────────
const API = (() => {
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return "http://localhost:3000/api";
  if (host.includes("netlify")) return "/.netlify/functions/api";
  return "/api/proxy";
})();

async function apiCall(params) {
  try {
    const qs = Object.entries(params)
      .map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");
    const res = await fetch(`${API}?${qs}`);
    const text = await res.text();
    try { return JSON.parse(text); } catch { return text; }
  } catch(e) { console.error("API error:", e); return null; }
}

async function writeOne(user, sheet, key, value) {
  return await apiCall({ action:"writeOne", user, sheet, key:String(key), value:String(value) });
}

async function deleteOne(user, sheet, key) {
  return await apiCall({ action:"deleteOne", user, sheet, key:String(key) });
}

// ── 密碼加密 ───────────────────────────────────────────────
async function hashPassword(password) {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2,'0')).join('');
}

// ── 全域快取 ───────────────────────────────────────────────
const CACHE = {};

function cacheGet(user, sheet, key) {
  return CACHE[`${user}:${sheet}:${key}`];
}
function cacheSet(user, sheet, key, value) {
  CACHE[`${user}:${sheet}:${key}`] = value;
}
function cacheHas(user, sheet, key) {
  return `${user}:${sheet}:${key}` in CACHE;
}
function cacheUpdate(user, sheet, key, value) {
  cacheSet(user, sheet, key, value);
}

async function cachedReadOne(user, sheet, key) {
  if (cacheHas(user, sheet, key)) return cacheGet(user, sheet, key);
  const raw = await apiCall({ action:"readOne", user, sheet, key:String(key) });
  let val = "";
  if (raw === null || raw === undefined) {
    val = "";
  } else if (typeof raw === "string") {
    val = raw;
  } else {
    val = JSON.stringify(raw);
  }
  cacheSet(user, sheet, key, val);
  return val;
}

// ── 共用元件 ───────────────────────────────────────────────
const C = {
  bg:"#F7F5F2", card:"#FFFFFF", border:"#EBEBEB",
  text:"#1A1A1A", sub:"#9A9A9A", accent:"#4A7C59",
  accentLight:"#EAF2EC", red:"#D0533A",
};

function SaveDot({ saving }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:saving?C.sub:C.accent }}>
      <div style={{ width:6, height:6, borderRadius:3, background:saving?C.sub:C.accent, transition:"background 0.3s" }} />
      {saving?"儲存中":"已儲存"}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ padding:40, display:"flex", justifyContent:"center" }}>
      <div style={{ width:28, height:28, borderRadius:14, border:`3px solid ${C.border}`, borderTopColor:C.accent, animation:"spin 0.8s linear infinite" }} />
    </div>
  );
}
