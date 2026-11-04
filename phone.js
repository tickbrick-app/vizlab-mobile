/* VizLab Mobile: the phone's screens over the desktop VizLab (code/mobile/PLAN.md, phases 0 and 1).
   desk.js (web/*.js, unchanged, in web/index.html's order) runs first with its markup hidden in #deskhost, so V is the
   desktop app itself. This file only draws the phone's simple screens and drives V:
     pictures and projects  V.G / V.addImageNode / V.loadProject / V.api (IndexedDB "vizlab-local", as on the PC)
     Render                 the phone's choices go into the desktop's own controls (scene: scenes.js, words and preset:
                            the prompt box, Keep my building: V.keepModel, model / size / shape: the Image panel), then
                            V.makeEditFor(picture), exactly as Make; "See the words" is V.previewEdit (the same prompt)
     Upscale ×2             V.upscale2x (Google 4K without a fal.ai key)
     Change an area         V.submitJob with draw.js's V.areaPrompt, and cutout.js puts the result back through the
                            painted area only (settings.keepMask)
   An older VizLab Mobile's pictures (IndexedDB "vizlab-mobile") are copied once into a project called "Phone pictures".
   Chromium 92 / iOS 16.4 safe (build_mobile.py checks for the newer calls they lack). */
"use strict";
(() => {
const V = window.V, D = V.D;
const VERSION = D.VERSION;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
function h(tag, a = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(a || {})) {
    if (v == null || v === false) continue;
    if (k === "class") e.className = v; else if (k === "html") e.innerHTML = v; else if (k === "style") e.style.cssText = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
  return e;
}
// the phone's own screen choices (open groups, tabs, brush size, size and shape): "vlm_" as before. Everything the
// desktop knows (key, model, keep switch, costs, fill-in values) lives in the desktop's own "vl_" settings.
const store = {
  get(k, d) { try { const v = localStorage.getItem("vlm_" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("vlm_" + k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem("vlm_" + k); } catch (e) {} },
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const money = (v) => "$" + (v > 0 && v < 0.01 ? v.toFixed(3) : (v || 0).toFixed(2));
const plural = (n, one, many = one + "s") => `${n} ${n === 1 ? one : many}`;

// ---------- icons (own line drawings) ----------
const ICON = {
  back: '<path d="M15 5l-7 7 7 7"/>', home: '<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v2.6M12 18.9v2.6M4.6 4.6l1.9 1.9M17.5 17.5l1.9 1.9M2.5 12h2.6M18.9 12h2.6M4.6 19.4l1.9-1.9M17.5 6.5l1.9-1.9"/><circle cx="12" cy="12" r="6.6"/>',
  camera: '<path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.8l1.6-2.5h6.2L16.7 7h2.8A1.5 1.5 0 0 1 21 8.5V18a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18z"/><circle cx="12" cy="13" r="3.8"/>',
  photos: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9.5" r="1.8"/><path d="M21 15.5l-5-5-9 9.5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  save: '<path d="M12 3v12M7 10l5 5 5-5M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17"/>', again: '<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v5h-5"/>',
  brush: '<path d="M14.5 4.5l5 5-8.5 8.5-5-5z"/><path d="M6 13l-2.6 2.6c-1 1-1 4.4-1 4.4s3.4 0 4.4-1L9.5 16.5"/>', up: '<path d="M4 20h7M4 20v-7M4 20l7-7"/><path d="M13 4h7v7M20 4l-8 8"/>',
  sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>', search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>', scene: '<path d="M3 18l5-6 4 4 3-3 6 5"/><circle cx="16" cy="7" r="2.5"/><rect x="2.5" y="3.5" width="19" height="17" rx="2"/>',
  preset: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
  swap: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  make: '<path d="M12 3l2.2 5.6L20 9.5l-4.5 3.8L17 19l-5-3.1L7 19l1.5-5.7L4 9.5l5.8-.9z"/>',
  folder: '<path d="M3 7.5A1.5 1.5 0 0 1 4.5 6H9l2 2.5h8.5A1.5 1.5 0 0 1 21 10v8.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/>',
  sheets: '<rect x="4" y="3" width="16" height="18" rx="1.5"/><rect x="7" y="6" width="6" height="6"/><path d="M15.5 6.5h1.5M15.5 9.5h1.5M7 15h10M7 18h6"/>',
  library: '<rect x="3" y="4" width="4" height="16" rx="1"/><rect x="8.5" y="4" width="4" height="16" rx="1"/><path d="M14.5 5.5l3.8-1 3.2 14.6-3.8 1z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', more: '<circle cx="5.5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18.5" cy="12" r="1.6"/>',
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
  open: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M19 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 4 18.5v-12A1.5 1.5 0 0 1 5.5 5H10"/>',
};
const icon = (n, cls = "i") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[n]}</svg>`;

// ---------- presets, from the desktop's data.js and picons.js (as panel.js reads them) ----------
const groupIds = (names, tabs) => new Set(tabs.flatMap((k) => (D.presetGroups[k] || []).filter(([n]) => names.some((x) => n.startsWith(x))).flatMap(([, ids]) => ids)));
const P = {};
for (const p of [...D.imagePresets, ...D.drawingPresets]) {
  const tpl = p.fill || (p.p && V.hasHoles(p.p) ? p.p : null);
  if (!p.p && !tpl) continue; // (the Mood configurator needs its reference pictures: a later phase)
  P[p.id] = { n: p.name, ...(tpl ? { f: tpl } : { p: p.p }), i: (D.picons && D.picons[p.id]) || D.icons[p.icon] || "" };
}
const GROUPS = {};
for (const [tab, list] of Object.entries(D.presetGroups)) GROUPS[tab] = list.map(([name, ids]) => [name.replace(/\s*\(.*\)\s*$/, ""), ids.filter((id) => P[id])]).filter(([, ids]) => ids.length);
const SET = {
  brief: new Set(D.drawingPresets.map((p) => p.id)),
  design: new Set([...groupIds(["Condition", "Change", "From drawings", "Elevations to CAD", "Line drawings for CAD", "3D views"], ["ext", "int"]), ...D.drawingPresets.map((p) => p.id)]),
  camera: groupIds(["Camera"], ["ext", "int"]),
};
const TABS = { ext: "Exterior", int: "Interior", prod: "Product", land: "Landscape", mont: "Montage" };
const SCENE_TABS = { ext: "Exterior", int: "Interior", prod: "Product" };
const ENG = D.imageEngines.filter((e) => e.g); // the Google models (Nano Banana): the office key runs them
// the image models this phone can use: Google's with the office key, and fal.ai's once a fal.ai key is added (Settings)
const IMG = () => D.imageEngines.filter((e) => !e.codex && !e.hidden && (e.g || (V.cfg.fkey && !V.engineNeed(e))));
const engOf = (id) => D.imageEngines.find((e) => e.id === id) || ENG[0];
const cost = (engine, res, inputs = 1) => { const e = engOf(engine); return e.g ? D.googleCost(engine, { resolution: res, num_images: 1 }, inputs) : e.price ? e.price(res, 1) : 0; };
const via = (engine) => (engOf(engine).g && V.viaGoogle(engine) ? "Google" : "fal.ai");
const SHAPES = D.aspects.map(([l, v]) => [v, v === "auto" ? "Same as the picture" : l]);
// the one-click scenes, from scenes.js (their drawn tiles and layer names, as the desktop's Scene panel shows them)
let SC = null;
const scenes = () => SC || (SC = V.scenePresets().map((s) => ({ id: s.id, mode: s.mode, name: s.name, label: V.scenesTest ? V.scenesTest.labelsOf(s.mode, V.sceneEnv(s.id)).join(" · ") : "" })));
// "__desk": a scene made or adjusted in the desktop's Scene builder (it lives in V.G.scene, with no one-click id)
const sceneOf = (id) => (id === "__desk" ? (V.G.scene ? { id, mode: V.G.scene.mode || "ext", name: V.G.scene.name || "Your own scene", label: "Built in the Scene builder" } : null) : scenes().find((s) => s.id === id) || null);

// ---------- settings: the desktop's own ----------
const cfg = {
  get key() { return V.cfg.gkey || ""; },
  set key(v) { V.cfg.gkey = v || ""; V.store.set("gkey", V.cfg.gkey); if (v) { V.cfg.google = true; V.store.set("google", true); } },
  get model() { const m = V.engines.image; return IMG().some((e) => e.id === m) ? m : ENG[0].id; },
  set model(v) { V.engines.image = v; V.store.set("engines", V.engines); },
  get res() { return store.get("res", "2K"); }, set res(v) { store.set("res", v); },
  get shape() { return store.get("shape", "auto"); }, set shape(v) { store.set("shape", v); },
  get costs() { return V.showCosts(); }, set costs(v) { V.store.set("showCosts", !!v); },
  get keep() { return V.keepModel(); }, set keep(v) { V.store.set("keepModel", !!v); },
};

// ---------- the pictures: the project's pictures ----------
const isPic = (n) => n && ["image", "video", "model", "world"].includes(n.type) && n.status === "done" && !!n.url;
const pics = () => V.G.nodes.filter(isPic).sort((a, b) => (b.created || 0) - (a.created || 0));
const KIND = { photo: "Picture", render: "Render", area: "Area change", upscale: "Upscaled ×2", video: "Video", model: "3D model", world: "Walk-around" };
function kindOf(n) {
  if (n.type !== "image") return n.type;
  if (n.phone && n.phone.area) return "area";
  const k = V.pictureKind(n);
  if (k === "upscale") return "upscale";
  return k === "view" || k === "photo" || k === "drawing" ? "photo" : "render";
}
const nodeById = (id) => V.node(id);
const parentOf = (n) => (n ? V.parents(n.id)[0] || null : null);
// the picture's size (cached by its url)
const dimCache = new Map();
async function dimsOf(n) {
  const k = n.id + ":" + (n.url || "").length;
  if (!dimCache.has(k)) { const i = await V.loadImg(n.url); dimCache.set(k, { w: i.naturalWidth, h: i.naturalHeight }); }
  return dimCache.get(k);
}
const resOf = (d) => { const m = Math.max(d.w, d.h); return m > 2900 ? "4K" : m > 1500 ? "2K" : "1K"; };
const resText = (n) => (n.phone && n.phone.res) || (n.retry && n.retry.settings && n.retry.settings.resolution) || "";
const blobOf = async (url) => (await fetch(url)).blob();
const toDataUrl = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });

// ---------- pictures in ----------
const loadImgEl = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("That picture couldn't be opened. Try a JPEG or PNG.")); i.src = src; });
async function imgOf(blob) { const u = URL.createObjectURL(blob); try { return await loadImgEl(u); } finally { setTimeout(() => URL.revokeObjectURL(u), 1000); } }
function canvas(w, hgt) { const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(hgt)); return c; }
function drawFit(img, max) { const w = img.naturalWidth || img.width, hg = img.naturalHeight || img.height, k = Math.min(1, max / Math.max(w, hg)); const c = canvas(w * k, hg * k), x = c.getContext("2d"); x.imageSmoothingQuality = "high"; x.drawImage(img, 0, 0, c.width, c.height); return c; }
async function addFile(file, fromCamera) {
  if (!file) return;
  if (file.type && !file.type.startsWith("image/")) return say("That isn't a picture. Choose a photo or a screenshot.");
  let n;
  try {
    const c = drawFit(await imgOf(file), 2560);
    newProjectName();
    // a phone picture is treated as a captured view: "Keep my building and camera exactly" locks it, as before
    n = await V.addImageNode(c.toDataURL("image/jpeg", 0.92), null, fromCamera ? "Photo" : "Picture", { capture: "Phone" });
    V.changed(true);
  } catch (e) { return alertBox("Couldn't open the picture", e.message || String(e)); }
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}
  openTodo(n, true);
}
// a project that has never been saved is called "Phone pictures" on the phone (not "Project 30 Oct 2026, 14:05")
function newProjectName() { if (!V.project.id && V.project.name === "unsaved") { V.project.name = "Phone pictures"; V.updateTitle(); } }

// ---------- errors, in plain words ----------
class GErr extends Error { constructor(kind, msg, detail = "") { super(msg); this.kind = kind; this.detail = detail; } }
function gError(status, msg) {
  const m = String(msg || "");
  if (status === 400 && /api key|API_KEY/i.test(m)) return new GErr("badkey", "Google didn't accept the key. Check it was copied in full (Settings).", m);
  if (status === 401 || status === 403) return new GErr("denied", /billing|BILLING/i.test(m) ? "Google says billing isn't set up for this key's project." : "Google says this key isn't allowed to make pictures. Check the key in Settings, or ask whoever looks after the office key.", m);
  if (status === 404) return new GErr("model", "Google doesn't offer this AI model to this key.", m);
  if (status === 429) return new GErr("quota", "Google says the key has reached its limit for now.", m);
  if (status >= 500) return new GErr("busy", "Google is busy at the moment.", m);
  return new GErr("other", "Google couldn't do this one (" + status + ").", m);
}
// a job's error as local.js writes it ("Google 503: …", "Failed to fetch", "Google returned no image (SAFETY)")
function errOf(msg) {
  const m = String(msg || "");
  const g = /^Google (\d{3}): ([\s\S]*)$/.exec(m); if (g) return gError(+g[1], g[2]);
  if (/API key|sign in with Google/i.test(m) && /Add your/i.test(m)) return new GErr("nokey", "Add the office Google key first (Settings).");
  if (/failed to fetch|load failed|networkerror|network error|not available/i.test(m) || navigator.onLine === false) return new GErr("network", navigator.onLine === false ? "This phone is offline. Connect to Wi-Fi or mobile data and try again." : "Couldn't reach Google. Check the internet connection and try again.");
  const ni = /^Google returned no image \((.*)\)$/.exec(m);
  if (ni) { const why = ni[1]; return new GErr("noimage", "Google didn't send a picture back" + (/SAFETY|PROHIBITED|BLOCK/i.test(why) ? " (it was stopped by Google's safety check)" : why && why !== "no reason given" ? " (" + why.toLowerCase().replace(/_/g, " ") + ")" : "") + ". Try different words or another scene."); }
  return new GErr("other", m || "Something went wrong.");
}
async function checkKey(key) {
  let r;
  try { r = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1", { headers: { "x-goog-api-key": key } }); }
  catch (e) { throw new GErr("network", navigator.onLine === false ? "This phone is offline. Connect to Wi-Fi or mobile data and try again." : "Couldn't reach Google. Check the internet connection and try again."); }
  if (r.ok) return true;
  let m = ""; try { m = (await r.json()).error.message || ""; } catch (e) {}
  throw gError(r.status, m);
}

// ---------- the desktop's controls, set to the phone's choices ----------
const setSelect = (sel, v) => { const s = $(sel); if (s && s.value !== v && [...s.options].some((o) => o.value === v)) s.value = v; };
const presetText = (c) => { const p = c.presetId && P[c.presetId]; return !p ? "" : p.p || V.fillText(p.f, c.fill || {}); };
const boxText = (c) => [presetText(c), (c.words || "").trim()].filter(Boolean).join(" "); // a tile pick, then your words (panel.js pickPrompt)
async function syncDesk(c) {
  if (V.tab !== "image") { const t = document.querySelector('#modeTabs button[data-v="image"]'); if (t) t.click(); }
  if (V.tool !== "editor" && V.setTool) V.setTool("editor");
  V.engines.image = c.model || cfg.model;
  setSelect("#resImage", c.res || cfg.res); setSelect("#arImage", c.shape || cfg.shape); setSelect("#numImage", "1");
  cfg.keep = !!c.keep;
  const want = c.sceneId || null, have = (V.G.scene && V.G.scene.id) || null;
  if (want !== "__desk" && (want !== have || (!want && V.G.scene))) {
    if (want) { const sc = V.scenesTest.SCENES.find((s) => s.id === want); if (sc) await V.scenesTest.applyScene(sc); }
    else V.setScene(null);
  }
  const t = boxText(c);
  if ($("#prompt").value !== t) V.setPrompt(t, { noUndo: true });
}
// the words Render sends, exactly as the desktop builds them for this picture and these choices
async function preview(n, c) { await syncDesk(c); return V.previewEdit(n); }

// ---------- jobs: sent and collected by the desktop's code ----------
let job = null; // { stopped, nodes, timer, t0 }
function busyOpen(n, title, model) {
  const pic = n.thumb || n.url; if (pic) $("#bImg").src = pic; else $("#bImg").removeAttribute("src"); $("#bTitle").textContent = title; $("#bModel").textContent = engOf(model).name + " is working on it";
  const b = $("#busy"); b.hidden = false; requestAnimationFrame(() => b.classList.add("on"));
  const t0 = Date.now();
  const tick = () => { const s = Math.floor((Date.now() - t0) / 1000); $("#bTime").textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; $("#bNote").textContent = s > 90 ? "Taking longer than usual. Google can be slow at busy times." : "Usually 20 to 60 seconds. Keep VizLab open until it's done."; };
  tick(); job = { stopped: false, nodes: [], t0, timer: setInterval(tick, 500) };
  return job;
}
function busyClose() { if (!job) return; clearInterval(job.timer); job = null; const b = $("#busy"); b.classList.remove("on"); setTimeout(() => { if (!job) b.hidden = true; }, 250); }
// Cancel: the picture is taken off the project at once; the job itself can't be called back from Google, so when it
// lands it is dropped from History too
$("#bStop").onclick = () => {
  if (!job) return;
  const j = job; j.stopped = true;
  if (j.soft) { busyClose(); return say("It carries on: it appears in the project when it's ready.", 4500); }
  const ids = j.nodes.map((n) => n.id), jobIds = j.nodes.map((n) => n.jobId).filter(Boolean);
  if (ids.length) { V.removeNodes(ids); V.changed(); }
  busyClose(); say("Stopped. Nothing was saved.");
  jobIds.forEach(forget);
};
async function forget(id) {
  for (let i = 0; i < 120; i++) {
    try { const r = await V.api("status", { ids: [id] }); const s = r.jobs[0]; if (!s || s.status === "done" || s.status === "error") break; } catch (e) { break; }
    await sleep(2000);
  }
  try { await V.api("delete", { id }); } catch (e) {}
}
// until the picture has landed (and, for an area change, been put back through the painted area)
async function waitNode(n, j, keepMask) {
  let raw = null, t = 0;
  for (;;) {
    if (j.stopped) return null;
    if (!V.node(n.id)) return null;
    if (n.status === "error") return n;
    if (n.status === "done") {
      if (!keepMask) return n;
      if (raw == null) { raw = n.url; t = Date.now(); }
      if (n.url !== raw || Date.now() - t > 20000) return n;
    }
    await sleep(250);
  }
}
// send(model) makes the job through the desktop code; the chosen model, then the others when Google is busy, doesn't
// offer it, or the key is at its limit (as VizLab Mobile always did)
async function runJob(src, title, model, send, tag, keepMask = false) {
  if (!cfg.key) return failBox(new GErr("nokey", "Add the office Google key first."));
  try { return await runJob0(src, title, model, send, tag, keepMask); }
  finally { V.engines.image = model; } // (a stand-in model for a busy one is for this job only)
}
async function runJob0(src, title, model, send, tag, keepMask) {
  const order = engOf(model).g ? [model, ...ENG.map((e) => e.id).filter((x) => x !== model)] : [model]; // (a fal.ai model has no stand-in)
  const j = busyOpen(src, title, model);
  let last = null;
  for (const m of order) {
    if (j.stopped) return;
    $("#bModel").textContent = engOf(m).name + " is working on it";
    const before = new Set(V.G.nodes.map((n) => n.id));
    let err = null;
    try { await send(m); } catch (e) { err = e; }
    if (j.stopped) return;
    const made = V.G.nodes.filter((n) => !before.has(n.id));
    j.nodes = made;
    const n = made[0];
    if (!n || n.status === "error") {
      const msg = (n && n.error) || (err && err.message) || lastErr || "The job couldn't be sent";
      if (made.length) { V.removeNodes(made.map((x) => x.id)); V.changed(); }
      last = errOf(msg);
      if (!["busy", "model", "quota"].includes(last.kind)) break;
      continue;
    }
    n.phone = Object.assign({}, tag, { model: m });
    const done = await waitNode(n, j, keepMask);
    if (!done || j.stopped) return;
    if (done.status === "done") {
      made.slice(1).forEach((x) => V.removeNodes([x.id]));
      if (tag.name) { done.label = tag.name; done.named = true; } // the phone's own name for a render ("Golden hour hero shot")
      V.changed(true);
      busyClose(); if (m !== model) say(`${engOf(model).name} was busy, so ${engOf(m).name} made this one.`);
      return openResult(done, true);
    }
    last = errOf(done.error);
    V.removeNodes(made.map((x) => x.id)); V.changed();
    if (!["busy", "model", "quota"].includes(last.kind)) break;
  }
  if (last && last.kind === "busy") last.message = "Google is busy at the moment and every model was tried. Wait a minute and try again.";
  busyClose(); failBox(last || new GErr("other", "That didn't work."));
}
function failBox(e) {
  const k = e && e.kind;
  if (k === "nokey" || k === "badkey" || k === "denied") return alertBox(k === "nokey" ? "No Google key yet" : "The Google key didn't work", e.message + (e.detail ? `\n\nGoogle said: ${e.detail.slice(0, 160)}` : ""), [["Open Settings", () => nav("settings")], ["Close"]]);
  if (k === "quota") return alertBox("Google's limit reached", e.message + "\n\nWait a few minutes and try again. If it keeps happening, the key may need billing or a higher limit." + (e.detail ? `\n\nGoogle said: ${e.detail.slice(0, 160)}` : ""));
  if (k === "busy") return alertBox("Google is busy", e.message);
  if (k === "network") return alertBox("No connection", e.message);
  alertBox("That didn't work", (e && e.message) || String(e));
}
const choiceOf = (n) => n.phone && !n.phone.area && !n.phone.upscale ? n.phone : { words: (n.retry && n.retry.settings && n.retry.settings.words) || "", keep: cfg.keep };
function cleanChoice(c) { return { presetId: c.presetId || null, fill: Object.assign({}, c.fill || {}), sceneId: c.sceneId || null, words: c.words || "", keep: c.keep == null ? cfg.keep : !!c.keep, tab: c.tab || null, model: c.model || cfg.model, res: c.res || cfg.res, shape: c.shape || cfg.shape }; }

async function doRender(src, c) {
  const choice = cleanChoice(c);
  await syncDesk(choice);
  if (V.hasHoles(V.promptWords())) return alertBox("Fill in the blanks first", "The preset has a blank still to fill in. Tap it to choose.");
  await runJob(src, "Rendering your picture", choice.model, async (m) => { V.engines.image = m; return V.makeEditFor(src); }, Object.assign({}, choice, { name: titleFor(choice) }));
}
function titleFor(c) { const sc = sceneOf(c.sceneId), p = c.presetId && P[c.presetId]; return [sc && sc.name, p && p.n].filter(Boolean).join(" + ") || (c.words ? c.words.slice(0, 40) : "Photoreal render"); }
// panel.js V.upscale2x: with no fal.ai key, the Google 4K copy (nothing changed but sharpness)
async function doUpscale(src) {
  const d = await dimsOf(src);
  if (Math.max(d.w, d.h) >= 3840) return alertBox("Already 4K", `This picture is ${d.w} × ${d.h} pixels already, so Google can't make it any bigger.`);
  await runJob(src, "Making a sharper, bigger copy", cfg.model, async (m) => { V.engines.image = m; await V.upscale2x(src); }, { upscale: true, res: "4K" });
}
// draw.js's area change: the picture, and a copy with the painted area in translucent red; cutout.js keeps the result
// only inside the painted area (settings.keepMask), so the rest of the picture stays as it was
function maskCanvas(strokes, W, H, grow = 0) {
  const c = canvas(W, H), x = c.getContext("2d"); x.lineCap = x.lineJoin = "round"; x.strokeStyle = x.fillStyle = "#fff";
  for (const s of strokes) { const r = s.r * W + grow; x.lineWidth = 2 * r; x.beginPath(); s.pts.forEach(([u, v], i) => (i ? x.lineTo(u * W, v * H) : x.moveTo(u * W, v * H))); if (s.pts.length === 1) { x.arc(s.pts[0][0] * W, s.pts[0][1] * H, r, 0, 7); x.fill(); } else x.stroke(); }
  return c;
}
function feathered(m, px) { // a soft edge by shrinking and growing again (canvas filters aren't in every Safari)
  const k = Math.max(1, px / 2), s = canvas(m.width / k, m.height / k), sx = s.getContext("2d"); sx.imageSmoothingQuality = "high"; sx.drawImage(m, 0, 0, s.width, s.height);
  const o = canvas(m.width, m.height), ox = o.getContext("2d"); ox.fillStyle = "#000"; ox.fillRect(0, 0, o.width, o.height); ox.imageSmoothingEnabled = true; ox.imageSmoothingQuality = "high"; ox.drawImage(s, 0, 0, o.width, o.height); return o;
}
async function doArea(src, a) {
  const words = a.words.trim();
  let hlUrl, maskUrl, res;
  try {
    const img = await V.loadImg(src.url), W = img.naturalWidth, H = img.naturalHeight; res = resOf({ w: W, h: H });
    const hard = maskCanvas(a.strokes, W, H);
    const hl = canvas(W, H), hx = hl.getContext("2d"); hx.drawImage(img, 0, 0);
    const t = canvas(W, H), tx = t.getContext("2d"); tx.fillStyle = "rgba(255,30,30,0.55)"; tx.fillRect(0, 0, W, H); tx.globalCompositeOperation = "destination-in"; tx.drawImage(hard, 0, 0); hx.drawImage(t, 0, 0);
    hlUrl = await V.uploadDataUrl(hl.toDataURL("image/jpeg", 0.9));
    const fe = Math.max(8, Math.round(16 * Math.max(W, H) / 2048)); // grown a little and feathered (16 px at 2K, as Draw)
    maskUrl = (await V.api("upload", { dataUrl: feathered(maskCanvas(a.strokes, W, H, fe / 2), fe).toDataURL("image/png") })).url;
  } catch (e) { return alertBox("That didn't work", e.message || String(e)); }
  await runJob(src, "Changing the painted area", cfg.model, async (m) => {
    V.engines.image = m;
    const settings = { resolution: res, aspect_ratio: "auto", num_images: 1, ...(V.viaGoogle(m) ? { provider: "google", fallback: V.cfg.gFallback !== false } : {}), protect: true, keepMask: maskUrl, words };
    return V.submitJob({ kind: "edit", engine: m, prompt: V.areaPrompt(V.expandRAL(words)), shownPrompt: "[Area] " + words, inputs: [src], extraUrls: [hlUrl], settings, count: 1, name: "Changed: " + words.slice(0, 40) });
  }, { area: true, words, strokes: a.strokes, size: a.size, res }, true);
}

// ---------- navigation ----------
let cur = null; const stack = [];
const TABBED = ["home", "projects", "sheets", "library"];
const motion = () => !matchMedia("(prefers-reduced-motion: reduce)").matches;
function show(id, dir = 1) {
  const next = $("#" + id), prev = cur && $("#" + cur);
  paintTabs(id);
  if (prev === next) return;
  next.hidden = false; cur = id; next.querySelector(".body") && dir > 0 && (next.querySelector(".body").scrollTop = 0);
  if (motion() && prev && dir) {
    next.style.zIndex = dir > 0 ? 2 : 1; prev.style.zIndex = dir > 0 ? 1 : 2;
    next.animate(dir > 0 ? [{ transform: "translateX(30%)", opacity: 0 }, { transform: "none", opacity: 1 }] : [{ transform: "translateX(-10%)", opacity: 0.4 }, { transform: "none", opacity: 1 }], { duration: 260, easing: "cubic-bezier(.2,.8,.2,1)" });
    const a = prev.animate(dir > 0 ? [{ opacity: 1 }, { transform: "translateX(-10%)", opacity: 0 }] : [{ opacity: 1 }, { transform: "translateX(30%)", opacity: 0 }], { duration: 220, easing: "cubic-bezier(.4,0,.6,1)", fill: "forwards" });
    a.onfinish = () => { if (cur !== prev.id) prev.hidden = true; a.cancel(); };
  } else if (prev) prev.hidden = true;
}
function paintTabs(id) {
  const on = TABBED.includes(id); $("#tabs").hidden = !on; document.body.classList.toggle("tabson", on);
  $$("#tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === id));
}
const screens = { todo: () => paintTodo(), home: paintHome, history: paintHistory, settings: paintSettings, projects: paintProjects, allpics: paintAll, sheets: paintSheets, library: paintLibrary };
function nav(id, ...args) { if (cur && cur !== id) stack.push(cur); if (screens[id]) screens[id](...args); show(id, 1); }
function back() { const to = stack.pop() || "home"; if (screens[to]) screens[to](); show(to, -1); }
function homeNow() { stack.length = 0; paintHome(); show("home", -1); }
function tab(id) { stack.length = 0; if (screens[id]) screens[id](); show(id, 0); }
$$(".back").forEach((b) => { b.innerHTML = icon("back"); b.onclick = back; });
for (const id of ["pHome", "rHome", "tHome", "mHome"]) { $("#" + id).innerHTML = icon("home"); $("#" + id).onclick = homeNow; }
const TAB_ICON = { home: "make", projects: "folder", sheets: "sheets", library: "library" };
$$("#tabs button").forEach((b) => { b.querySelector(".ti").outerHTML = icon(TAB_ICON[b.dataset.tab]); b.onclick = () => tab(b.dataset.tab); });

// ---------- messages ----------
let toastT = 0;
function say(msg, ms = 3200) { const t = $("#mtoast"); t.innerHTML = ""; t.append(h("div", {}, msg)); clearTimeout(toastT); toastT = setTimeout(() => (t.innerHTML = ""), ms); }
function alertBox(title, text, btns = [["OK"]]) {
  return new Promise((res) => {
    $("#dTitle").textContent = title; $("#dText").textContent = text; const B = $("#dBtns"); B.innerHTML = "";
    btns.forEach(([label, fn, cls], i) => B.append(h("button", { class: "btn " + (cls || (i === 0 ? "pri" : "sec")), onclick: () => { $("#dlg").hidden = true; res(i); fn && fn(); } }, label)));
    $("#dlg").hidden = false;
  });
}
const confirmBox = async (title, text, ok, danger) => (await alertBox(title, text, [[ok, null, danger ? "bad" : "pri"], ["Cancel", null, "sec"]])) === 0;
// a name: the same pop-up with a box
function askBox(title, value, ok = "Save") {
  return new Promise((res) => {
    $("#dTitle").textContent = title; $("#dText").textContent = "";
    const inp = h("input", { class: "inp", type: "text", value: value || "", autocomplete: "off", maxlength: "80" });
    const B = $("#dBtns"); B.innerHTML = "";
    const done = (v) => { $("#dlg").hidden = true; res(v); };
    B.append(inp, h("button", { class: "btn pri", onclick: () => done(inp.value.trim() || null) }, ok), h("button", { class: "btn sec", onclick: () => done(null) }, "Cancel"));
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") done(inp.value.trim() || null); });
    $("#dlg").hidden = false; setTimeout(() => { inp.focus(); inp.select(); }, 50);
  });
}
// the desktop's messages: its red ones (a save that failed…) show on the phone; the rest are written for the PC
// ("right-click…", "press Render") and are only kept in its Recent messages. A job's own failure is told by the phone.
const deskToast = V.toast;
V.toast = (msg, err = false, ms, o) => { try { deskToast(msg, err, ms, o); } catch (e) {} if (err) { lastErr = String(msg); if (!job) say(String(msg), 6000); } };
let lastErr = "";

// ---------- bottom sheet ----------
let sheetDone = null;
function openSheet(title, { tall = false, top = null, body, done = null, doneLabel = "Done" }) {
  $("#shTitle").textContent = title; $("#shDone").textContent = doneLabel; const tp = $("#shTop"); tp.innerHTML = ""; if (top) tp.append(top);
  const b = $("#shBody"); b.innerHTML = ""; b.append(body); b.scrollTop = 0;
  const s = $("#sheet"), sh = $("#shade"); s.classList.toggle("tall", tall); sheetDone = done;
  s.hidden = sh.hidden = false; requestAnimationFrame(() => requestAnimationFrame(() => { s.classList.add("on"); sh.classList.add("on"); }));
}
function closeSheet() {
  const s = $("#sheet"), sh = $("#shade"); if (s.hidden) return;
  s.classList.remove("on"); sh.classList.remove("on"); const d = sheetDone; sheetDone = null;
  setTimeout(() => { if (!s.classList.contains("on")) { s.hidden = sh.hidden = true; } }, 300);
  d && d();
}
$("#shDone").onclick = closeSheet; $("#shade").onclick = closeSheet;
(() => { let y0 = null; const s = $("#sheet");
  const down = (e) => { if (!e.target.closest(".grab,.shead") || e.target.closest("button")) return; y0 = e.clientY; s.style.transition = "none"; };
  s.addEventListener("pointerdown", down);
  addEventListener("pointermove", (e) => { if (y0 == null) return; s.style.transform = `translateY(${Math.max(0, e.clientY - y0)}px)`; });
  addEventListener("pointerup", (e) => { if (y0 == null) return; const d = e.clientY - y0; y0 = null; s.style.transition = ""; s.style.transform = ""; if (d > 90) closeSheet(); });
})();

// ---------- welcome ----------
function paintWelcome() {
  $("#wKey").value = ""; $("#wStatus").textContent = ""; $("#wStatus").className = "status";
  // v3.72: the key (and settings, catalogue, projects) from Google Drive, when VizLab is already used on a PC
  const di = V.drive ? V.drive.info() : null, can = !!(di && !di.why && !di.on);
  $("#wDrive").hidden = !can; $("#wDriveStatus").textContent = ""; $("#wDriveStatus").className = "status";
  if (can) V.drive.preload();
}
const welcomeDone = () => { stack.length = 0; paintHome(); show("home", 1); a2hsHint(); };
$("#wDriveBtn").onclick = async () => {
  const b = $("#wDriveBtn"), s = $("#wDriveStatus"); b.disabled = true; s.className = "status"; s.textContent = "Connecting to Google Drive…";
  try { await V.drive.connect(); } catch (e) { s.className = "status bad"; s.textContent = e.message; b.disabled = false; return; }
  b.disabled = false;
  if (cfg.key) { s.className = "status ok"; s.textContent = "Your key came from your Google Drive."; setTimeout(welcomeDone, 600); }
  else { s.className = "status"; s.textContent = V.drive.keys() ? "Connected. No key was in your Drive yet: paste it above once." : "Connected. Bringing keys to other devices is switched off on the PC, so paste the key above."; $("#wDrive").hidden = true; }
};
// keys from Google Drive (drive.js): the welcome screen goes, and an open Settings or Library page shows what came
document.addEventListener("vl-settings", () => { if (cur === "welcome" && cfg.key) welcomeDone(); else if (cur === "settings") paintSettings(); else if (cur === "home") paintHome(); });
document.addEventListener("vl-catalogue", () => { if (cur === "library") paintLibrary(); });
async function keySave(input, status, after) {
  const key = input.value.trim().replace(/\s+/g, "");
  status.className = "status"; if (!key) { status.textContent = "Paste the key first."; status.className = "status bad"; return; }
  if (!/^[\w-]{20,}$/.test(key)) { status.textContent = "That doesn't look like a Google key: it's one long word of letters and numbers, usually starting AIza."; status.className = "status bad"; return; }
  status.textContent = "Checking with Google…";
  try { await checkKey(key); cfg.key = key; status.textContent = "Key works. Saved on this phone."; status.className = "status ok"; input.value = ""; after && setTimeout(after, 600); }
  catch (e) { status.textContent = e.kind === "network" ? e.message : e.kind === "badkey" || e.kind === "denied" ? "Google didn't accept that key. Check it was copied in full." : e.message; status.className = "status bad"; }
}
$("#wSave").onclick = () => keySave($("#wKey"), $("#wStatus"), () => { stack.length = 0; paintHome(); show("home", 1); a2hsHint(); });
$("#wKey").addEventListener("keydown", (e) => { if (e.key === "Enter") $("#wSave").click(); });

// ---------- home (Make) ----------
$("#hHist").innerHTML = icon("clock"); $("#hSet").innerHTML = icon("gear");
$("#hHist").onclick = () => nav("history"); $("#hSet").onclick = () => nav("settings"); $("#hAll").onclick = () => nav("history");
$("#hProj").onclick = () => tab("projects");
$("#bCam .bi").innerHTML = icon("camera"); $("#bLib .bi").innerHTML = icon("photos");
for (const [id, cam] of [["fCam", true], ["fLib", false]]) $("#" + id).addEventListener("change", (e) => { const f = e.target.files[0]; e.target.value = ""; addFile(f, cam); });
const when = (t) => { const d = new Date(t), now = new Date(); const hm = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }); return d.toDateString() === now.toDateString() ? "Today " + hm : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + " " + hm; };
const projName = () => (V.project.name === "unsaved" ? "Phone pictures" : V.project.name);
function card(n, i, onDel) {
  const k = kindOf(n);
  const c = h("button", { class: "card", style: `animation-delay:${Math.min(i, 8) * 30}ms`, onclick: (e) => { if (e.target.closest(".del")) return; openPic(n); } },
    n.thumb || n.poster || n.type === "image" ? h("img", { class: "th", src: n.thumb || n.poster || n.url, alt: "", loading: "lazy" }) : h("span", { class: "th", style: "display:grid;place-items:center;color:var(--acc)", html: icon(n.type === "video" ? "video" : "cube") }),
    h("span", { class: "kind" + (k !== "photo" ? " r" : "") }, KIND[k]),
    h("span", { class: "cap" }, h("b", {}, V.nodeTitle(n)), h("small", {}, when(n.created) + (k !== "photo" && resText(n) ? " · " + resText(n) : ""))));
  if (onDel) c.append(h("span", { class: "del", role: "button", "aria-label": "Delete", onclick: (e) => { e.stopPropagation(); onDel(n); } }, h("span", { html: icon("trash") })));
  return c;
}
function paintHome() {
  $("#hProj").innerHTML = icon("folder") + `<span>Project: <b>${esc(projName())}</b></span><span class="chev" style="flex:none;width:10px;height:10px;border:solid var(--mute);border-width:2px 2px 0 0;transform:rotate(45deg);margin-right:6px"></span>`;
  const g = $("#hRecent"), list = pics().slice(0, 6); g.innerHTML = "";
  $("#hAll").hidden = !list.length;
  if (!list.length) { g.style.display = "block"; g.append(h("div", { class: "empty" }, h("b", {}, "Nothing here yet"), "Your pictures and renders will appear here, kept on this phone.")); return; }
  g.style.display = ""; list.forEach((n, i) => g.append(card(n, i)));
}
const openPic = (n) => (n.type !== "image" ? openMedia(n) : kindOf(n) === "photo" ? openTodo(n) : openResult(n));

// ---------- your picture: choose what to make ----------
let C = null, pRec = null;
function openPicture(n, choice = null, fresh = false) {
  if (n && V.node(n.id)) V.setSel([n.id]);
  pRec = n;
  C = cleanChoice(Object.assign({ keep: cfg.keep }, choice || {}));
  if (choice && choice.fill) C.fill = Object.assign({}, choice.fill);
  $("#pImg").src = n.url; $("#pTitle").textContent = n.label === "Photo" ? "Your photo" : "Your picture"; $("#pWords").value = C.words;
  paintPicture();
  if (fresh) { stack.length = 0; stack.push("home"); show("pic", 1); } else nav("pic");
}
function artOf(s) {
  let a = null; try { a = V.sceneArt(s.id); } catch (e) {}
  if (a && a.tagName === "IMG") return h("div", { class: "art" }, h("img", { src: a.src, alt: "", style: "position:absolute;inset:0;width:100%;height:100%;object-fit:cover" }));
  return h("div", { class: "art" + (a && a.classList.contains("lt") ? " lt" : ""), html: a ? a.innerHTML : "" });
}
function paintPicture() {
  $("#pKeep .tog").classList.toggle("on", C.keep); $("#pKeep").setAttribute("aria-checked", C.keep);
  const sc = sceneOf(C.sceneId), p = C.presetId && P[C.presetId];
  const sBox = $("#pScene"); sBox.innerHTML = "";
  sBox.append(h("button", { class: "opt" + (sc ? " on" : ""), onclick: (e) => { if (e.target.closest(".x")) return; sceneSheet(); } },
    h("span", { class: "oi" }, sc ? artOf(sc) : h("span", { html: icon("scene") })),
    h("span", { class: "ot" }, h("b", {}, sc ? sc.name : "Choose a scene"), h("small", {}, sc ? `${SCENE_TABS[sc.mode]} scene · ${sc.label || ""}` : `${scenes().length} one-click scenes: light, sky, weather, people`)),
    sc ? h("span", { class: "x", role: "button", "aria-label": "Remove the scene", onclick: () => { C.sceneId = null; paintPicture(); } }, h("span", { html: icon("x") })) : h("span", { class: "chev" })));
  const pBox = $("#pPreset"); pBox.innerHTML = "";
  const filled = p && p.f ? V.fillText(p.f, C.fill) : "";
  pBox.append(h("button", { class: "opt" + (p ? " on" : ""), onclick: (e) => { if (e.target.closest(".x")) return; if (p && p.f) fillSheet(C.presetId); else presetSheet(); } },
    h("span", { class: "oi" }, p ? h("span", { html: p.i, style: "display:contents" }) : h("span", { html: icon("preset") })),
    h("span", { class: "ot" }, h("b", {}, p ? p.n : "Choose a preset"), h("small", {}, p ? (p.f ? filled || "Tap to fill in the choices" : briefNote(C.presetId)) : "Render styles, light, weather, people, materials and more")),
    p ? h("span", { class: "x", role: "button", "aria-label": "Remove the preset", onclick: () => { C.presetId = null; C.fill = {}; paintPicture(); } }, h("span", { html: icon("x") })) : h("span", { class: "chev" })));
  const e = engOf(cfg.model);
  $("#pSetLine").innerHTML = icon("sliders") + `<span>${esc(e.name)} · ${esc(cfg.res)} · ${esc(cfg.shape === "auto" ? "same shape" : cfg.shape)}</span><span class="chev" style="flex:none;width:10px;height:10px;border:solid var(--mute);border-width:2px 2px 0 0;transform:rotate(45deg);margin-right:6px"></span>`;
  paintDoes(); paintEvery();
}
const briefNote = (id) => (SET.brief.has(id) ? "A drawing brief: used on its own, without a scene" : SET.design.has(id) ? "A design change: your building can change" : SET.camera.has(id) ? "Moves the camera to a new viewpoint" : "Preset");
// what Render will do, and the words it sends: from the desktop (V.lockState, V.previewEdit), for these choices
let pv = 0;
async function paintDoes() {
  const my = ++pv, c = Object.assign({}, C, { model: cfg.model, res: cfg.res, shape: cfg.shape }), n = pRec;
  $("#pCost").textContent = cfg.costs ? `~${money(cost(cfg.model, cfg.res, 1))} · ${via(cfg.model)} · ${cfg.res}` : `${engOf(cfg.model).name} · ${cfg.res}`;
  let prompt;
  try { prompt = await preview(n, c); } catch (e) { console.warn("preview", e); return; }
  if (my !== pv) return;
  const st = V.lockState(n, V.promptText()), p = C.presetId && P[C.presetId], sc = sceneOf(C.sceneId);
  const rp = V.renderItPreset(), based = !!rp && prompt.includes(rp.p) && !boxText(C).includes(rp.p);
  const what = based && !p && !C.words.trim() ? `<b>Photoreal render</b> (${esc(rp.name)})` : based ? `<b>Photoreal render</b> + your choices` : p && SET.brief.has(C.presetId) ? `<b>${esc(p.n)}</b>` : sc ? `<b>${esc(sc.name)}</b>` : `<b>${esc(p ? p.n : "Your words")}</b>`;
  const k = st ? st.kind : "off";
  const lk = k === "off" ? '<span class="lockchip off"><i></i>camera may change</span>' : k === "design" ? '<span class="lockchip mv"><i></i>design change, not locked</span>' : k === "geometry" ? '<span class="lockchip mv"><i></i>new viewpoint, same building</span>' : '<span class="lockchip"><i></i>keeps building and camera</span>';
  $("#pDoes").innerHTML = `${what} · ${lk}`;
  $("#pPrompt").textContent = prompt;
}
let wordsT = 0;
$("#pKeep").onclick = () => { C.keep = !C.keep; cfg.keep = C.keep; paintPicture(); };
$("#pKeep").onkeydown = (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); $("#pKeep").click(); } };
$("#pWords").addEventListener("input", () => { C.words = $("#pWords").value; clearTimeout(wordsT); wordsT = setTimeout(paintDoes, 250); });
$("#pSetLine").onclick = () => optionsSheet(() => paintPicture());
$("#pGo").onclick = () => { C.words = $("#pWords").value; $("#pWords").blur(); doRender(pRec, C); };

function sceneSheet() {
  let tb = (sceneOf(C.sceneId) || {}).mode || store.get("sceneTab", "ext"), q = "";
  const body = h("div"), seg = h("div", { class: "seg even" }), find = h("div", { class: "search", html: icon("search") });
  const inp = h("input", { class: "inp", type: "search", placeholder: "Find: dusk, rain, snow, night, café…", "aria-label": "Find a scene", autocomplete: "off" });
  find.append(inp);
  // the Scene builder and the example pictures: the desktop's own windows
  const builder = async (fn) => { closeSheet(); await syncDesk(Object.assign({}, C, { model: cfg.model })); const was = JSON.stringify(V.G.scene || null); await waitModal(fn); const now = V.G.scene; if (JSON.stringify(now || null) !== was) { C.sceneId = now ? now.id || "__desk" : null; paintPicture(); } };
  const tools = h("div", { class: "row", style: "margin-bottom:12px;flex-wrap:wrap" },
    h("button", { class: "btn sec", style: "min-height:52px;font-size:15px;flex:1 1 40%", onclick: () => builder(() => V.openEnv(null, tb)) }, "Build your own…"),
    C.sceneId ? h("button", { class: "btn sec", style: "min-height:52px;font-size:15px;flex:1 1 40%", onclick: () => builder(() => V.adjustScene()) }, "Adjust this scene…") : null,
    h("button", { class: "btn sec", style: "min-height:52px;font-size:15px;flex:1 1 40%", onclick: () => builder(() => V.openScenePictures()) }, "Example pictures…"));
  const top = h("div", {}, seg, find, tools);
  const paint = () => {
    seg.innerHTML = ""; for (const [k, n] of Object.entries(SCENE_TABS)) seg.append(h("button", { class: k === tb && !q ? "on" : "", onclick: () => { tb = k; q = ""; inp.value = ""; store.set("sceneTab", k); paint(); } }, n));
    body.innerHTML = ""; const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    // the desktop's own scene search (names, layers and mood words: "rain", "cosy", "winter")
    const list = scenes().filter((s) => (words.length ? words.every((w) => ((V.sceneMoodHay ? V.sceneMoodHay(s.id) : "") + " " + s.name + " " + s.label + " " + SCENE_TABS[s.mode]).toLowerCase().includes(w)) : s.mode === tb));
    if (!list.length) return body.append(h("p", { class: "none" }, "No scene matches. Try another word."));
    const g = h("div", { class: "scgrid" }); body.append(g);
    list.forEach((s) => g.append(h("button", { class: "sct" + (C.sceneId === s.id ? " on" : ""), onclick: () => { C.sceneId = C.sceneId === s.id ? null : s.id; paintPicture(); closeSheet(); } },
      artOf(s), C.sceneId === s.id ? h("span", { class: "tick", html: icon("check") }) : null, h("span", { class: "cap" }, h("b", {}, s.name), h("small", {}, s.label || "")))));
  };
  inp.addEventListener("input", () => { q = inp.value.trim(); paint(); });
  paint(); openSheet("Scenes", { tall: true, top, body });
}
function presetSheet(briefs = false) {
  let tb = C.tab || store.get("presetTab", "ext"), q = "";
  const open = new Set(store.get("openGroups", []));
  const body = h("div"), seg = h("div", { class: "seg" }), find = h("div", { class: "search", html: icon("search") });
  const inp = h("input", { class: "inp", type: "search", placeholder: "Find a preset: brick, dusk, people, plan…", "aria-label": "Find a preset", autocomplete: "off" });
  find.append(inp); const top = h("div", {}, seg, find);
  const pick = (id) => {
    const p = P[id]; if (!q) { C.tab = tb; store.set("presetTab", tb); }
    if (C.presetId === id && !p.f) { C.presetId = null; C.fill = {}; paintPicture(); return closeSheet(); }
    C.presetId = id; if (!q) C.tab = tb; else C.tab = Object.keys(GROUPS).find((k) => GROUPS[k].some(([, ids]) => ids.includes(id))) || null;
    C.fill = p.f ? defaults(p.f) : {}; paintPicture(); closeSheet();
    if (p.f) setTimeout(() => fillSheet(id), 320);
  };
  const tile = (id) => { const p = P[id]; return h("button", { class: "pt" + (C.presetId === id ? " on" : ""), onclick: () => pick(id) }, h("span", { html: p.i, style: "display:contents" }), h("b", {}, p.n), p.f ? h("span", { class: "fillmark" }, "Fill") : null, C.presetId === id ? h("span", { class: "tick", html: icon("check") }) : null); };
  const paint = () => {
    seg.innerHTML = ""; for (const [k, n] of Object.entries(TABS)) if (GROUPS[k]) seg.append(h("button", { class: k === tb && !q ? "on" : "", onclick: () => { tb = k; q = ""; inp.value = ""; store.set("presetTab", k); paint(); } }, n));
    body.innerHTML = "";
    if (q) {
      const ws = q.toLowerCase().split(/\s+/).filter(Boolean), ids = Object.keys(P).filter((id) => ws.every((w) => (P[id].n + " " + (P[id].p || P[id].f)).toLowerCase().includes(w)));
      ids.sort((a, b) => (P[b].n.toLowerCase().includes(ws[0]) ? 1 : 0) - (P[a].n.toLowerCase().includes(ws[0]) ? 1 : 0));
      if (!ids.length) return body.append(h("p", { class: "none" }, "No preset matches. Try another word."));
      return body.append(h("div", { class: "pgrid" }, ids.slice(0, 60).map(tile)));
    }
    if (briefs === true) { briefs = "shown"; return body.append(h("div", { class: "pgrid" }, D.drawingPresets.filter((p) => P[p.id]).map((p) => tile(p.id)))); }
    const gs = GROUPS[tb] || [];
    gs.forEach(([name, ids], gi) => {
      const key = tb + ":" + name, isOpen = open.has(key) || (gi === 0 && !open.has(tb + ":-")) || ids.includes(C.presetId);
      const grid = h("div", { class: "pgrid" }, isOpen ? ids.map(tile) : []);
      const g = h("div", { class: "grp" + (isOpen ? " open" : "") }, h("button", { onclick: () => { const now = !g.classList.contains("open"); g.classList.toggle("open", now); if (now) { open.add(key); grid.innerHTML = ""; ids.forEach((id) => grid.append(tile(id))); } else { open.delete(key); if (gi === 0) open.add(tb + ":-"); grid.innerHTML = ""; } grid.hidden = !now; store.set("openGroups", [...open]); } }, h("span", {}, name), h("small", {}, ids.length), h("i")), grid);
      grid.hidden = !isOpen; body.append(g);
    });
  };
  inp.addEventListener("input", () => { q = inp.value.trim(); paint(); });
  paint(); openSheet(briefs ? "Drawing briefs" : "Presets", { tall: true, top, body });
}
// Fill: the blanks of the preset (prompt.js V.fillFieldsOf), the remembered values (vl_fill_<label>, shared with the PC),
// and the finished sentence from prompt.js (V.fillText). The preview below marks the blanks as the desktop's does.
const NO = "no change";
const defaults = (tpl) => { const v = {}; V.fillFieldsOf(tpl).forEach((f, l) => { const s = V.store.get("fill_" + l.toLowerCase(), null); v[l] = s != null ? s : f.def != null ? f.def : ""; }); return v; };
const sentences = (t) => t.split(/(?<=[.!?])\s+/);
function fillHtml(tpl, v) {
  const fields = V.fillFieldsOf(tpl), out = [];
  for (const s of sentences(tpl)) {
    let ok = true;
    const rep = s.replace(/\{([^{}\n]+)\}/g, (m, raw) => { const l = [...fields.keys()].find((k) => raw.trim().startsWith(k)) || raw, x = v[l], empty = x == null || x === "" || x === NO; if (empty) ok = false; return empty ? `<b class="h">${esc(l)}</b>` : `<b class="v">${esc(x)}</b>`; });
    out.push(ok ? rep : `<span class="drop">${rep}</span>`);
  }
  return out.join(" ");
}
function fillSheet(id) {
  const p = P[id], fields = V.fillFieldsOf(p.f), v = Object.assign(defaults(p.f), C.fill), sent = h("div", { class: "fillsent" }), body = h("div");
  const upd = () => { sent.innerHTML = fillHtml(p.f, v); };
  body.append(sent, h("p", { style: "color:var(--mute);font-size:14px;margin:-6px 2px 16px" }, "Leave a box empty, or choose \"no change\", to leave that sentence out."));
  let k = 0;
  fields.forEach((f, l) => {
    const set = (x) => { v[l] = x; V.store.set("fill_" + l.toLowerCase(), x); upd(); };
    let ctl; const id2 = "ff" + k++;
    if (f.options || f.min != null) {
      const opts = f.options ? [...(f.noChange ? [NO] : []), ...f.options] : Array.from({ length: f.max - f.min + 1 }, (_, i) => String(f.min + i));
      ctl = h("select", { class: "inp", id: id2, onchange: (e) => set(e.target.value) }, h("option", { value: "" }, "Choose…"), opts.map((o) => h("option", { value: o, selected: v[l] === o }, o)));
    } else {
      ctl = h("input", { class: "inp", id: id2, type: "text", value: v[l] || "", autocomplete: "off", placeholder: f.ral ? "e.g. RAL 7016 anthracite grey" : f.combo ? "Type, or pick a suggestion" : "Type it here", list: f.combo ? id2 + "l" : null, oninput: (e) => set(e.target.value) });
      if (f.combo) body.append(h("datalist", { id: id2 + "l" }, f.combo.map((o) => h("option", { value: o }))));
    }
    body.append(h("label", { class: "field" }, h("span", {}, l.charAt(0).toUpperCase() + l.slice(1)), ctl));
  });
  body.append(h("button", { class: "btn pri", style: "margin-top:8px", onclick: () => { C.fill = Object.assign({}, v); paintPicture(); closeSheet(); } }, "Use this"));
  upd(); openSheet(p.n, { body, done: () => { C.fill = Object.assign({}, v); paintPicture(); } });
}
function optionsSheet(after) {
  const body = h("div");
  const paint = () => {
    body.innerHTML = "";
    body.append(h("div", { class: "lab", style: "margin-top:4px" }, "AI model"));
    for (const e of IMG()) body.append(h("button", { class: "radio" + (cfg.model === e.id ? " on" : ""), onclick: () => { cfg.model = e.id; paint(); } }, h("span", { class: "dot" }), h("span", { class: "ot" }, h("b", {}, e.name), h("small", {}, (e.id === ENG[0].id ? "Recommended · " : "") + (e.g ? "" : "fal.ai · ") + (cfg.costs ? `about ${money(cost(e.id, "1K"))} at 1K, ${money(cost(e.id, "2K"))} at 2K` : e.id === "nano-banana-pro" ? "Slower, sometimes finer" : "Quick")))));
    if (!V.cfg.fkey) body.append(h("p", { style: "color:var(--mute);font-size:14px;margin:4px 2px 8px" }, "More models (Seedream, FLUX) come with a fal.ai key: Settings › More AI services."));
    body.append(h("div", { class: "lab" }, "Size"), h("div", { class: "seg even" }, ["1K", "2K"].map((r) => h("button", { class: cfg.res === r ? "on" : "", onclick: () => { cfg.res = r; paint(); } }, r === "1K" ? "1K · quicker" : "2K · sharper"))));
    body.append(h("div", { class: "lab" }, "Shape"), h("select", { class: "inp", onchange: (e) => { cfg.shape = e.target.value; } }, SHAPES.map(([v, n]) => h("option", { value: v, selected: cfg.shape === v }, n))));
  };
  paint(); openSheet("Render settings", { body, done: after });
}

// ---------- result ----------
let rRec = null, rFrom = null, rDim = null, rFromDim = null;
async function openResult(n, fresh = false) {
  if (V.node(n.id)) V.setSel([n.id]);
  rRec = n; rFrom = parentOf(n);
  try { rDim = await dimsOf(n); } catch (e) { rDim = { w: 4, h: 3 }; }
  const k = kindOf(n);
  $("#rTitle").textContent = KIND[k] || "Picture";
  paintCompare(); paintMeta();
  $("#rSave").innerHTML = icon("save") + "<span>Save to Photos</span>";
  $("#rAgain").innerHTML = icon("again") + `<span>${k === "upscale" ? "Upscale again" : k === "area" ? "Edit again" : "Render again"}</span><small>${rFrom ? "From the original, same choices" : "The original was deleted"}</small>`;
  $("#rAgain").disabled = !rFrom || k === "photo";
  $("#rArea").innerHTML = icon("brush") + "<span>Change an area</span><small>Paint over it, say what</small>";
  $("#rUp").innerHTML = icon("up") + `<span>Upscale ×2</span><small>${Math.max(rDim.w, rDim.h) >= 3840 ? "Already 4K" : "Sharper 4K copy" + (cfg.costs ? " · ~" + money(cost(cfg.model, "4K")) : "")}</small>`;
  $("#rChoices").innerHTML = icon("sliders") + `<span>${k === "render" ? "Change choices" : "New render"}</span><small>${k === "render" ? "Scene, preset, words" : "Start from this picture"}</small>`;
  $("#rDel").innerHTML = icon("trash") + "<span>Delete this picture</span>";
  $("#rMore").innerHTML = icon("grid") + "<span>More things to do</span>";
  if (fresh) { if (cur === "pic" || cur === "paint") { stack.push(cur); show("result", 1); } else nav("result"); }
  else nav("result");
}
function costOf(n) {
  const r = n.retry; if (!r || !r.settings) return (n.phone && n.phone.cost) || 0;
  try { return D.googleCost(n.engine, r.settings, (r.images || []).length) || 0; } catch (e) { return 0; }
}
function paintMeta() {
  const n = rRec, k = kindOf(n), c = n.phone || {};
  const sub = V.nodeSub(n);
  const what = k === "render" ? sub || "Photoreal render" : k === "area" ? `“${c.words || sub}”` : k === "upscale" ? "The same picture, sharper and bigger" : "";
  const tech = [n.engine && V.engineName(n.engine), `${rDim.w} × ${rDim.h} px`, cfg.costs && costOf(n) ? "~" + money(costOf(n)) : "", when(n.created)].filter(Boolean).join(" · ");
  $("#rMeta").innerHTML = `<b>${esc(V.nodeTitle(n))}</b>${what ? esc(what) + "<br>" : ""}${esc(tech)}`;
}
function paintCompare() {
  const box = $("#rCmp"), r = rRec; box.innerHTML = "";
  box.style.aspectRatio = `${rDim.w} / ${rDim.h}`;
  const maxH = innerHeight * 0.58, w = Math.min(box.parentElement.clientWidth || innerWidth - 32, maxH * rDim.w / rDim.h); box.style.width = w + "px";
  box.append(h("img", { src: r.url, alt: "After" }));
  if (!rFrom) return;
  const bw = h("div", { class: "bw" }, h("img", { src: rFrom.url, alt: "Before" })), hd = h("div", { class: "hd" }, h("span", { class: "knob", html: icon("swap") }));
  box.append(bw, hd, h("span", { class: "tag l" }, "Before"), h("span", { class: "tag r" }, kindOf(r) === "upscale" ? "4K" : "After"));
  const set = (f) => { f = Math.max(0, Math.min(1, f)); bw.style.clipPath = `inset(0 ${(1 - f) * 100}% 0 0)`; hd.style.left = f * 100 + "%"; };
  let drag = false, sx = 0, sy = 0, decided = false;
  const at = (e) => { const b = box.getBoundingClientRect(); return (e.clientX - b.left) / b.width; };
  box.onpointerdown = (e) => { drag = true; decided = e.pointerType !== "touch"; sx = e.clientX; sy = e.clientY; if (decided) { box.setPointerCapture(e.pointerId); set(at(e)); } };
  box.onpointermove = (e) => { if (!drag) return; if (!decided) { if (Math.abs(e.clientX - sx) < 6 && Math.abs(e.clientY - sy) < 6) return; decided = true; if (Math.abs(e.clientY - sy) > Math.abs(e.clientX - sx)) { drag = false; return; } box.setPointerCapture(e.pointerId); } set(at(e)); };
  box.onpointerup = box.onpointercancel = (e) => { if (drag && !decided) set(at(e)); drag = false; };
  if (motion()) { const t0 = performance.now(); const step = (t) => { const k = Math.min(1, (t - t0) / 900), e = 1 - Math.pow(1 - k, 3); set(1 - 0.5 * e); if (k < 1 && !drag) requestAnimationFrame(step); }; set(1); requestAnimationFrame(step); } else set(0.5);
}
$("#rSave").onclick = () => saveToPhotos(rRec);
$("#rAgain").onclick = () => { const n = rRec, k = kindOf(n); if (!rFrom) return; if (k === "render") doRender(rFrom, choiceOf(n)); else if (k === "upscale") doUpscale(rFrom); else if (k === "area" && n.phone && n.phone.strokes) doArea(rFrom, n.phone); };
$("#rArea").onclick = () => openPaint(rRec);
$("#rUp").onclick = () => doUpscale(rRec);
$("#rChoices").onclick = () => { const n = rRec; if (kindOf(n) === "render" && rFrom) openPicture(rFrom, choiceOf(n)); else openPicture(n); };
$("#rDel").onclick = async () => { if (await delPic(rRec)) back(); };
async function delPic(n) {
  if (!(await confirmBox("Delete this picture?", "It is removed from this phone. Pictures already saved to Photos stay there.", "Delete", true))) return false;
  V.snapshot(); V.removeNodes([n.id]); V.render(); V.changed(true); say("Deleted"); return true;
}
const fileName = (n, ext) => { const d = new Date(n.created || Date.now()); return `VizLab ${KIND[kindOf(n)] || "picture"} ${d.toISOString().slice(0, 10)} ${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}.${ext}`.replace(/×/g, "x"); };
// Save to Photos: the iPhone share sheet ("Save Image"); a browser without it downloads the file
async function shareFile(blob, name) {
  const file = new File([blob], name, { type: blob.type || "application/octet-stream" });
  if (navigator.canShare && navigator.share) {
    try { if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return true; } }
    catch (e) { if (e.name === "AbortError") return true; }
  }
  const u = URL.createObjectURL(blob), a = h("a", { href: u, download: name, "data-phone": "1" }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
  say("Saved to your Downloads"); return true;
}
async function saveToPhotos(n) {
  const blob = await blobOf(n.url);
  return shareFile(blob, fileName(n, /png/.test(blob.type) ? "png" : "jpg"));
}

// ---------- paint: change an area ----------
const SIZES = [0.018, 0.035, 0.065]; // brush radius as a part of the picture's width
let A = null; // { rec, strokes, size, cur, d }
async function openPaint(n) {
  A = { rec: n, strokes: [], size: store.get("brush", 1), cur: null, d: await dimsOf(n) };
  $("#aImg").src = n.url; $("#aWords").value = "";
  const sz = $("#aSize"); sz.innerHTML = "";
  SIZES.forEach((s, i) => sz.append(h("button", { class: A.size === i ? "on" : "", "aria-label": ["Small", "Medium", "Large"][i] + " brush", onclick: () => { A.size = i; store.set("brush", i); $$("#aSize button").forEach((b, k) => b.classList.toggle("on", k === i)); } }, h("i", { style: `width:${8 + i * 9}px;height:${8 + i * 9}px` }))));
  $("#aUndo").innerHTML = icon("undo"); $("#aCost").textContent = cfg.costs ? `~${money(cost(cfg.model, resOf(A.d), 2))} · Google · the rest stays exactly as it is` : "The rest of the picture stays exactly as it is";
  if (!$("#aMore")) $("#aUndo").parentElement.after(h("button", { class: "btn sec", id: "aMore", style: "margin-bottom:12px", onclick: () => openDraw(A.rec) }, h("span", { html: icon("layers"), style: "display:contents" }), h("span", {}, "More tools: select, AI select, notes, layers")));
  nav("paint"); requestAnimationFrame(sizePaint); paintTools();
}
function sizePaint() {
  if (!A) return; const st = $("#aStage"), r = A.d, maxH = innerHeight * 0.5, w = Math.min(st.parentElement.clientWidth || innerWidth - 32, maxH * r.w / r.h);
  st.style.width = w + "px"; st.style.height = (w * r.h) / r.w + "px";
  const c = $("#aCan"), dpr = Math.min(3, devicePixelRatio || 1); c.width = Math.round(w * dpr); c.height = Math.round((w * r.h / r.w) * dpr); drawStrokes();
}
function drawStrokes() {
  const c = $("#aCan"), x = c.getContext("2d"), W = c.width, H = c.height; x.clearRect(0, 0, W, H);
  const m = maskCanvas(A.strokes.concat(A.cur ? [A.cur] : []), W, H);
  x.globalAlpha = 0.5; x.drawImage(m, 0, 0); x.globalCompositeOperation = "source-in"; x.globalAlpha = 1; x.fillStyle = "#FAAF29"; x.fillRect(0, 0, W, H); x.globalCompositeOperation = "source-over";
}
function paintTools() { $("#aUndo").disabled = !A.strokes.length; $("#aClear").disabled = !A.strokes.length; $("#aGo").disabled = !A.strokes.length || !$("#aWords").value.trim(); $("#aHint").textContent = A.strokes.length ? "Paint more, or say what should change there." : "Paint over the part to change with your finger."; }
(() => {
  const c = $("#aCan"); let id = null;
  const pt = (e) => { const b = c.getBoundingClientRect(); return [Math.max(0, Math.min(1, (e.clientX - b.left) / b.width)), Math.max(0, Math.min(1, (e.clientY - b.top) / b.height))]; };
  c.addEventListener("pointerdown", (e) => { if (!A || id != null) return; id = e.pointerId; c.setPointerCapture(id); A.cur = { r: SIZES[A.size], pts: [pt(e)] }; drawStrokes(); e.preventDefault(); });
  c.addEventListener("pointermove", (e) => { if (e.pointerId !== id || !A.cur) return; const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e]; for (const v of evs.length ? evs : [e]) A.cur.pts.push(pt(v)); drawStrokes(); });
  const end = (e) => { if (e.pointerId !== id) return; id = null; if (A.cur) { A.strokes.push(A.cur); A.cur = null; } drawStrokes(); paintTools(); };
  c.addEventListener("pointerup", end); c.addEventListener("pointercancel", end);
})();
$("#aUndo").onclick = () => { A.strokes.pop(); drawStrokes(); paintTools(); };
$("#aClear").onclick = () => { A.strokes = []; drawStrokes(); paintTools(); };
$("#aWords").addEventListener("input", paintTools);
$("#aGo").onclick = () => { const w = $("#aWords").value.trim(); if (!A.strokes.length) return say("Paint over the area first."); if (!w) return say("Say what should change in the painted area."); $("#aWords").blur(); doArea(A.rec, { strokes: A.strokes, words: w, size: A.size }); };
addEventListener("resize", () => { if (cur === "paint") sizePaint(); if (cur === "result" && rRec && rDim) { const box = $("#rCmp"), maxH = innerHeight * 0.58; box.style.width = Math.min(box.parentElement.clientWidth, maxH * rDim.w / rDim.h) + "px"; } });

// ---------- history: this project's pictures ----------
function paintHistory() {
  const g = $("#yGrid"), list = pics(); g.innerHTML = "";
  $("#yCount").textContent = list.length ? `${plural(list.length, "picture")} in ${projName()}, newest first.` : "";
  if (!list.length) { g.style.display = "block"; g.append(h("div", { class: "empty" }, h("b", {}, "No pictures yet"), "Take a photo or choose one from Photos on the first screen.")); return; }
  g.style.display = "";
  list.forEach((n, i) => g.append(card(n, i, async (x) => { if (await delPic(x)) paintHistory(); })));
}

// ---------- projects (the desktop's projects, as on the PC) ----------
$("#jNew").innerHTML = icon("plus"); $("#jNew2").innerHTML = icon("plus") + "<span>New project</span>";
$("#jAll .bi").innerHTML = icon("grid");
$("#jAll").onclick = () => nav("allpics");
$("#jNew").onclick = $("#jNew2").onclick = () => newProject();
const saved = async () => { const s = V.saveState(); if (s.pending || s.saving) await V.save(); };
async function openProject(id) {
  if (V.project.id === id) return tab("home");
  await saved();
  try { await V.loadProject(id); } catch (e) { return alertBox("Couldn't open the project", e.message); }
  dimCache.clear(); tab("home");
}
async function newProject() {
  const name = await askBox("New project", "", "Start it"); if (!name) return;
  await saved(); V.newProject(); V.project.name = name.slice(0, 80); V.updateTitle(); tab("home");
  say(`Project "${V.project.name}": add a photo to start`);
}
// (Google Drive: the list follows a sync; projects from the PC appear "On Drive")
document.addEventListener("vl-drive", () => { const pj = $("#jList"); if (pj && pj.offsetParent) paintProjects(); });
async function paintProjects() {
  const L = $("#jList"); L.innerHTML = "";
  let list = [];
  try { list = (await V.api("project_list")).projects || []; } catch (e) {}
  if (!V.project.id) list.unshift({ id: null, name: projName(), thumb: null, stats: { pictures: pics().length }, updated_at: null });
  if (!list.length) { L.append(h("div", { class: "empty" }, h("b", {}, "No projects yet"), "A project starts with your first picture.")); return; }
  list.forEach((p, i) => {
    const on = p.id === V.project.id;
    const n = p.stats && p.stats.pictures != null ? plural(p.stats.pictures, "picture") : "";
    const c = h("button", { class: "pcard" + (on ? " cur" : ""), style: `animation-delay:${Math.min(i, 8) * 30}ms`, onclick: (e) => { if (e.target.closest(".more3")) return; if (p.id) openProject(p.id); else tab("home"); } },
      p.thumb ? h("img", { class: "th", src: p.thumb, alt: "", loading: "lazy" }) : h("span", { class: "noth", html: icon("folder") }),
      on ? h("span", { class: "now" }, "Open now") : null,
      p.drive === "on" || p.drive === "remote" ? h("span", { class: "drv" + (p.drive === "remote" ? " remote" : "") }, p.only ? "In Drive" : "On Drive") : p.only && p.drive === "waiting" ? h("span", { class: "drv wait" }, "Not saved to Drive yet") : null,
      h("span", { class: "cap" }, h("b", {}, p.name), h("small", {}, [p.drive === "remote" && !p.only ? "not on this phone yet" : "", n, p.updated_at ? when(Date.parse(p.updated_at)) : "not saved yet"].filter(Boolean).join(" · "))));
    if (p.id) c.append(h("span", { class: "more3", role: "button", "aria-label": "More for " + p.name, html: icon("more"), onclick: (e) => { e.stopPropagation(); projectSheet(p); } }));
    L.append(c);
  });
}
function projectSheet(p) {
  const body = h("div");
  const row = (label, ic, fn, cls = "sec") => h("button", { class: "btn " + cls, style: "margin-bottom:10px;justify-content:flex-start", onclick: () => { closeSheet(); fn(); } }, h("span", { html: icon(ic), style: "display:contents" }), h("span", {}, label));
  body.append(row("Open", "open", () => openProject(p.id)), row("Rename", "edit", () => renameProject(p)), row("Delete", "trash", () => deleteProject(p), "bad"));
  openSheet(p.name, { body });
}
async function renameProject(p) {
  const name = await askBox("Rename the project", p.name); if (!name || name === p.name) return;
  if (p.id === V.project.id) V.renameProject(name);
  else { const r = await V.api("project_get", { id: p.id }); await V.api("project_save", { id: r.id, name: name.slice(0, 80), graph: r.graph, thumb: r.thumb, stats: r.stats }); }
  paintProjects();
}
async function deleteProject(p) {
  if (!(await confirmBox(`Delete "${p.name}"?`, "Its pictures are removed from this phone (renders stay in All pictures). Pictures saved to Photos stay there. This can't be undone.", "Delete", true))) return;
  await V.api("project_delete", { id: p.id });
  if (p.id === V.project.id) {
    const rest = ((await V.api("project_list")).projects || []);
    if (rest.length) await V.loadProject(rest[0].id); else { V.newProject(); newProjectName(); }
  }
  say("Project deleted"); paintProjects();
}
// All pictures: every finished job on this phone, newest first (the desktop's History, V.api("list"))
let xFilter = "all";
const X_CHIPS = [["all", "All"], ["renders", "Renders"], ["upscale", "Upscales"], ["fav", "Favourites"]];
async function paintAll() {
  const ch = $("#xChips"); ch.innerHTML = "";
  X_CHIPS.forEach(([k, n]) => ch.append(h("button", { class: xFilter === k ? "on" : "", onclick: () => { xFilter = k; paintAll(); } }, n)));
  const g = $("#xGrid"); g.innerHTML = "";
  let js = [];
  try { js = (await V.api("list", { limit: 200, ...(xFilter === "upscale" ? { kind: "upscale" } : {}), ...(xFilter === "fav" ? { favourites: true } : {}) })).jobs || []; } catch (e) {}
  js = js.filter((j) => j.status === "done" && (j.outputs || []).some((o) => o.type === "image"));
  if (xFilter === "renders") js = js.filter((j) => V.kindOf(j.kind, j.settings) !== "upscale");
  $("#xCount").textContent = js.length ? `${plural(js.length, "picture")}, newest first.` : "";
  if (!js.length) { g.style.display = "block"; g.append(h("div", { class: "empty" }, h("b", {}, "Nothing here yet"), "Renders, edits and upscales appear here.")); return; }
  g.style.display = "";
  js.forEach((j, i) => {
    const o = j.outputs.find((x) => x.type === "image"), up = V.kindOf(j.kind, j.settings) === "upscale";
    g.append(h("button", { class: "card", style: `animation-delay:${Math.min(i, 8) * 30}ms`, onclick: () => openViewer(j) },
      h("img", { class: "th", src: o.url, alt: "", loading: "lazy" }),
      h("span", { class: "kind r" }, up ? "Upscaled ×2" : j.settings && j.settings.keepMask ? "Area change" : "Render"),
      h("span", { class: "cap" }, h("b", {}, (V.historyPrompt(j) || V.engineName(j.engine)).replace(/^\[(Area|Draw|Materials)\] /, "")), h("small", {}, when(Date.parse(j.created_at)) + (j.project ? " · " + j.project : "")))));
  });
}
let vJob = null;
$("#vClose").innerHTML = icon("x"); $("#vClose").onclick = () => { $("#pview").hidden = true; };
$("#vSave").innerHTML = icon("save") + "<span>Save to Photos</span>";
const fullOf = async (o) => (o && o.ref && V.drive && V.drive.fullUrl ? V.drive.fullUrl(o) : o.url); // (v3.73: a picture kept only in Google Drive: its preview in the list, the picture fetched here)
$("#vSave").onclick = async () => { const o = vJob.outputs.find((x) => x.type === "image"); let u; try { u = await fullOf(o); } catch (e) { return alertBox("Google Drive", e.message); } const b = await blobOf(u); shareFile(b, `VizLab ${new Date(vJob.created_at).toISOString().slice(0, 10)}.${/png/.test(b.type) ? "png" : "jpg"}`); };
$("#vOpen").onclick = () => { const id = vJob.project_id; $("#pview").hidden = true; if (id) openProject(id); };
async function openViewer(j) {
  vJob = j; const o = j.outputs.find((x) => x.type === "image");
  $("#vImg").src = o.url;
  if (o.ref) fullOf(o).then((u) => { if (vJob === j) $("#vImg").src = u; }, () => {}); $("#vTitle").textContent = V.kindOf(j.kind, j.settings) === "upscale" ? "Upscaled ×2" : "Render";
  $("#vMeta").textContent = [V.historyPrompt(j), V.engineName(j.engine), when(Date.parse(j.created_at))].filter(Boolean).join(" · ");
  let has = false; try { has = !!j.project_id && (((await V.api("project_list")).projects || []).some((p) => p.id === j.project_id)); } catch (e) {}
  $("#vOpen").hidden = !has; $("#vOpen").innerHTML = icon("folder") + `<span>Open its project${j.project ? ": " + esc(j.project) : ""}</span>`;
  $("#pview").hidden = false;
}

// ---------- Sheets and Library: kept with each project; their phone screens come later (PLAN.md phase 5) ----------
function soon(box, ic, title, lines, count) {
  box.innerHTML = "";
  box.append(h("div", { class: "soon" }, h("span", { class: "bi", html: icon(ic) }), h("h1", {}, title), ...lines.map((t) => h("p", {}, t)), count ? h("div", { class: "count" }, count) : null));
}
function paintSheets() {
  const pages = (V.G.sheets && V.G.sheets.pages) || [];
  soon($("#tsBody"), "sheets", "Sheets", ["Presentation pages for a project: pictures in frames, a title strip and a PDF to send.", "On the phone they come in a later update. For now make and export them in VizLab on the PC; they are kept with the project."], pages.length ? `${plural(pages.length, "page")} in ${projName()}` : "");
}
function paintLibrary() {
  const items = (V.G.library && V.G.library.items) || [];
  soon($("#tlBody"), "library", "Library", ["Furniture, products, materials and style boards that go with every render.", "On the phone the Library comes in a later update. For now fill it in VizLab on the PC; this project's items still go with renders made here."], items.length ? `${plural(items.length, "item")} in ${projName()}` : "");
}

// ---------- settings ----------
async function paintSettings() {
  const B = $("#sBody"); B.innerHTML = "";
  let spent = 0; try { spent = Number((await V.api("stats")).total) || 0; } catch (e) {}
  let used = 0; try { used = (await navigator.storage.estimate()).usage || 0; } catch (e) {}
  const list = pics();
  const k = cfg.key, st = h("div", { class: "status", role: "status" }), inp = h("input", { class: "inp mono", type: "text", autocomplete: "off", autocapitalize: "off", spellcheck: "false", placeholder: "Paste a new key here" });
  const keyBox = h("div", { hidden: !!k }, h("label", { class: "field" }, inp), h("button", { class: "btn pri", onclick: () => keySave(inp, st, paintSettings) }, "Check and save"), st);
  B.append(h("div", { class: "set" }, h("h3", {}, "Google key"),
    k ? h("div", { class: "keyrow" }, h("span", { class: "okdot" }), h("span", {}, "Saved on this phone · ", h("span", { class: "k" }, "…" + k.slice(-4))), h("span", { style: "flex:1" })) : h("p", {}, "No key yet: renders need the office Google key."),
    k ? h("div", { class: "row" }, h("button", { class: "btn sec", onclick: () => { keyBox.hidden = false; inp.focus(); } }, "Change key"), h("button", { class: "btn sec", onclick: async () => { if (await confirmBox("Remove the key?", "VizLab can't render until a key is added again. Your pictures stay.", "Remove", true)) { cfg.key = ""; paintSettings(); } } }, "Remove")) : null,
    keyBox));
  // Google Drive (the desktop's drive.js): the same projects on the PC and this phone
  if (V.drive) {
    const di = V.drive.info(), on = V.drive.on();
    if (!on) V.drive.preload(); // (Google's sign-in script ready before the tap, so its window opens from the tap)
    const dbusy = (b, fn) => async () => { b.disabled = true; try { await fn(); } catch (er) { alertBox("Google Drive", er.message); } paintSettings(); };
    const cb = h("button", { class: "btn pri" }, "Connect Google Drive"); cb.onclick = dbusy(cb, () => V.drive.connect());
    const sb = h("button", { class: "btn sec" }, di.state === "needsauth" ? "Reconnect" : "Sync now"); sb.onclick = dbusy(sb, () => (di.state === "needsauth" ? V.drive.reconnect() : V.drive.sync()));
    const o1 = !!(V.drive.only && V.drive.only());
    const ob = h("button", { class: "btn sec" }, "Disconnect"); ob.onclick = async () => { if (await confirmBox("Disconnect Google Drive?", o1 ? "Your projects and pictures are kept only in Google Drive at the moment. Before disconnecting, VizLab brings full copies back to this phone, so they still open here. The copies in your Drive stay there." : "VizLab stops copying projects to your Drive. Everything stays on this phone, and the copies already in your Drive stay there.", o1 ? "Bring back and disconnect" : "Disconnect")) { try { await V.drive.disconnect(); } catch (er) { alertBox("Google Drive", er.message); } paintSettings(); } };
    // v3.73: only in Google Drive (the same switch as the PC's Settings › Google Drive)
    const ou = V.drive.unsaved ? V.drive.unsaved() : null;
    const onlySw = V.drive.setOnly ? h("div", { class: "sw", id: "phDriveOnly", style: "background:none;border:0;padding:0;margin:14px 0 0", role: "switch", "aria-checked": o1, onclick: async () => {
      if (o1 ? !(await confirmBox("Keep full copies on this phone too?", "VizLab downloads full copies of your projects, Library and History pictures from Google Drive to this phone, and keeps both from now on. Big projects take room on the phone.", "Download full copies"))
        : !(await confirmBox("Keep projects and pictures only in Google Drive?", "Your projects, renders, Library and History pictures are moved to Google Drive. Each picture is checked there first; only then is the copy on this phone removed. Opening a project then fetches its pictures from Drive (it needs the internet).", "Only in Drive"))) return;
      say(o1 ? "Bringing full copies back to this phone…" : "Moving your pictures to Google Drive…");
      try { await V.drive.setOnly(!o1); } catch (er) { alertBox("Google Drive", er.message); }
      paintSettings();
    } }, h("div", { class: "ot" }, h("b", {}, "Keep my projects and pictures only in Google Drive (nothing saved on this phone)"), h("small", {}, o1 ? (ou && ou.atRisk ? "On · not saved to Drive yet: kept in VizLab until Drive has it" : "On: this phone keeps only the list of projects and small previews. Opening a project fetches its pictures from Drive.") : "Off: full copies are kept on this phone as well as in Google Drive.")), h("span", { class: "tog" + (o1 ? " on" : "") })) : null;
    B.append(h("div", { class: "set", id: "phDrive" }, h("h3", {}, "Google Drive"),
      on ? h("div", { class: "keyrow" }, h("span", { class: "okdot" }), h("span", {}, "Connected · " + (di.email || "Google Drive"))) : null,
      h("p", {}, on ? V.drive.line() : di.why || "Save your projects and the office catalogue to your own Google Drive, so they are on the PC and this phone. Google's own window does the sign-in."),
      on ? h("div", { class: "row" }, sb, ob) : di.why ? null : cb,
      di.why ? null : onlySw,
      // v3.72: keys and settings come over too (the same switch as the PC's Settings › Google Drive)
      di.why ? null : h("div", { class: "sw", id: "phDriveKeys", style: "background:none;border:0;padding:0;margin:14px 0 0", role: "switch", "aria-checked": V.drive.keys(), onclick: async () => {
        if (V.drive.keys() && !(await confirmBox("Stop bringing keys and settings?", "The file \"VizLab settings (private).json\" goes to your Google Drive's bin, and your other devices stop getting changes from it. The keys already on each device stay there.", "Switch off"))) return;
        await V.drive.setKeys(!V.drive.keys()); paintSettings();
      } }, h("div", { class: "ot" }, h("b", {}, "Bring my keys and settings to my other devices"), h("small", {}, "Your Google and fal.ai keys and preferences are kept in a file in your own Drive, so this phone and your PCs share them. The keys are readable text in that file: only VizLab and you can open it, but anyone who gets into your Google account could see them.")), h("span", { class: "tog" + (V.drive.keys() ? " on" : "") }))));
  }
  const e = engOf(cfg.model);
  B.append(h("div", { class: "set" }, h("h3", {}, "Renders"), h("p", {}, `${e.name} · ${cfg.res} · ${cfg.shape === "auto" ? "same shape as the picture" : cfg.shape}`),
    h("button", { class: "btn sec", onclick: () => optionsSheet(paintSettings) }, "AI model, size and shape")));
  const tg = h("span", { class: "tog" + (cfg.costs ? " on" : "") });
  B.append(h("div", { class: "set" }, h("div", { class: "sw", style: "background:none;border:0;padding:0;margin:0", role: "switch", "aria-checked": cfg.costs, onclick: () => { cfg.costs = !cfg.costs; paintSettings(); } }, h("div", { class: "ot" }, h("b", {}, "Show running costs"), h("small", {}, "Estimates from Google's prices, shown on the Render buttons")), tg),
    cfg.costs ? h("div", { style: "margin-top:14px" }, h("div", { class: "spent" }, "~" + money(spent)), h("small", { style: "color:var(--mute)" }, "spent from this phone so far (estimate)")) : null));
  B.append(h("div", { class: "set" }, h("h3", {}, "Pictures on this phone"), h("p", {}, `${plural(list.length, "picture")} in ${projName()}${used ? ` · VizLab uses about ${(used / 1048576).toFixed(0)} MB on this phone` : ""}. Save the ones you want to keep to Photos.`),
    h("button", { class: "btn bad", disabled: !list.length, onclick: async () => { if (await confirmBox("Clear this project's pictures?", `All ${list.length} pictures in ${projName()} are removed from this phone. Pictures saved to Photos stay there. This can't be undone.`, "Clear all", true)) { V.removeNodes(list.map((n) => n.id)); V.render(); V.changed(true); say("Pictures cleared"); paintSettings(); } } }, "Clear this project's pictures")));
  // fal.ai (optional, as on the PC): more image models, the video models, upscalers and 3D
  const fk = V.cfg.fkey, fin = h("input", { class: "inp mono", type: "text", autocomplete: "off", autocapitalize: "off", spellcheck: "false", placeholder: "Paste the fal.ai key here" });
  B.append(h("div", { class: "set", id: "sFal" }, h("h3", {}, "More AI services (optional)"),
    h("p", {}, fk ? `fal.ai key saved on this phone · …${fk.slice(-4)}. Adds Seedream and FLUX pictures, Kling, Seedance and Wan videos, and 3D models.` : "A fal.ai key adds more picture models, the Kling, Seedance and Wan videos, and 3D models. Google stays the main engine; videos work with the Google key too (Gemini Omni Flash)."),
    fk ? null : h("label", { class: "field" }, fin),
    h("div", { class: "row" }, fk ? h("button", { class: "btn sec", onclick: async () => { if (await confirmBox("Remove the fal.ai key?", "Pictures, videos and 3D made with it stay.", "Remove", true)) { V.cfg.fkey = ""; V.store.set("fkey", ""); V.engRedraw && V.engRedraw(); paintSettings(); } } }, "Remove the fal.ai key")
      : h("button", { class: "btn sec", onclick: () => { const k = fin.value.trim().replace(/\s+/g, ""); if (!/^[\w:.-]{16,}$/.test(k)) return say("That doesn't look like a fal.ai key"); V.cfg.fkey = k; V.store.set("fkey", k); V.engRedraw && V.engRedraw(); say("fal.ai key saved on this phone"); paintSettings(); } }, "Save the fal.ai key"))));
  // back up / restore: the desktop's own backup file (projects, History and presets), through the share sheet
  const rin = h("input", { type: "file", accept: ".json,application/json", style: "display:none", onchange: async (ev) => { const f = ev.target.files[0]; ev.target.value = ""; if (f) restore(f); } });
  B.append(h("div", { class: "set" }, h("h3", {}, "Back up and restore"), h("p", {}, "A backup file holds every project and picture on this phone. Keep it in Files, OneDrive or Mail; VizLab on the PC can restore it too (Settings › Back up)."),
    h("div", { class: "row" }, h("button", { class: "btn sec", onclick: backup }, "Back up"), h("button", { class: "btn sec", onclick: () => rin.click() }, "Restore")), rin));
  const drow = (ic, t, s, fn) => h("button", { class: "rowbtn", onclick: fn }, h("span", { class: "ti", html: icon(ic) }), h("span", {}, h("b", {}, t), h("small", {}, s)));
  B.append(h("div", { class: "set" }, h("h3", {}, "Everything else"), h("div", { class: "rows" },
    drow("gear", "All settings, as on the PC", "Logo on saved pictures, animations, Google and fal.ai options", () => deskPage("settings", "All settings")),
    drow("sliders", "Usage", "Pictures made and estimated running costs, by month", () => deskPage("account", "Usage")),
    drow("info", "Help and tutorial", "Quick start and every how-to topic", () => deskPage("help", "Help")))));
  B.append(h("div", { class: "set" }, h("h3", {}, "On the Home Screen"), h("p", { style: "margin:0" }, standalone() ? "VizLab is running from your Home Screen." : "In Safari, tap Share, then Add to Home Screen. VizLab then opens like an app, full screen, even without a connection.")));
  B.append(h("p", { class: "ver" }, `Clarman VizLab Mobile · version ${VERSION}`), h("p", { class: "ver", style: "margin-top:0" }, V.drive && V.drive.on() ? (V.drive.keys() ? "Your key, settings and projects are also kept in your own Google Drive." : "Your projects are also kept in your own Google Drive; your key stays on this phone.") + " Pictures go to Google's AI only when you press Render, Edit or Upscale." : "Your key and pictures stay on this phone. Pictures go only to Google, when you press Render, Edit or Upscale."));
}
async function backup() {
  await saved();
  try { const r = await V.api("backup_export"); await shareFile(new Blob([r.blob], { type: "application/json" }), `VizLab backup ${new Date().toISOString().slice(0, 10)}.json`); }
  catch (e) { alertBox("Couldn't make the backup", e.message); }
}
async function restore(file) {
  await saved();
  try {
    const r = await V.api("backup_import", { file });
    if (V.project.id) { try { await V.loadProject(V.project.id); } catch (e) {} }
    const p = r.by.projects || { added: 0, updated: 0 };
    alertBox("Restored", `${plural(p.added, "project")} added, ${plural(p.updated, "project")} brought up to date. Anything already newer on this phone was kept.`);
    paintSettings();
  } catch (e) { alertBox("Couldn't restore", e.message); }
}

// ---------- Add to Home Screen hint (Safari on iPhone / iPad, once) ----------
const standalone = () => navigator.standalone === true || matchMedia("(display-mode: standalone)").matches;
const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
function a2hsHint() {
  if (standalone() || !isIOS() || store.get("a2hsDone", false)) return;
  $("#a2hsX").innerHTML = icon("x"); $("#a2hs").hidden = false;
  $("#a2hsX").onclick = () => { $("#a2hs").hidden = true; store.set("a2hsDone", true); };
}

// ---------- the older VizLab Mobile's pictures: copied once into "Phone pictures" ----------
const PHONE_PID = "phone-pictures";
function oldDb() {
  return new Promise((res) => {
    let made = false; const r = indexedDB.open("vizlab-mobile");
    r.onupgradeneeded = () => { made = true; r.transaction.abort(); }; // it wasn't there: don't leave an empty one behind
    r.onsuccess = () => res(r.result); r.onerror = () => { res(null); if (made) try { indexedDB.deleteDatabase("vizlab-mobile"); } catch (e) {} };
    r.onblocked = () => res(null);
  });
}
const allOf = (db) => new Promise((res, rej) => { const q = db.transaction("pics", "readonly").objectStore("pics").getAll(); q.onsuccess = () => res(q.result || []); q.onerror = () => rej(q.error); });
async function migrate() {
  if (indexedDB.databases) { try { if (!(await indexedDB.databases()).some((d) => d.name === "vizlab-mobile")) return null; } catch (e) {} }
  const db = await oldDb(); if (!db) return null;
  if (!db.objectStoreNames.contains("pics")) { db.close(); indexedDB.deleteDatabase("vizlab-mobile"); return null; }
  const recs = (await allOf(db)).filter((r) => r && r.id && r.blob).sort((a, b) => a.created - b.created);
  if (!recs.length) { db.close(); indexedDB.deleteDatabase("vizlab-mobile"); return null; }
  say(`Moving ${plural(recs.length, "picture")} into the project "Phone pictures"…`, 6000);
  let have = null; try { have = await V.api("project_get", { id: PHONE_PID }); } catch (e) {}
  if (!have) {
    const ids = new Set(recs.map((r) => r.id)), kids = new Map();
    recs.forEach((r) => { const p = r.from && ids.has(r.from) ? r.from : null; if (!kids.has(p)) kids.set(p, []); kids.get(p).push(r); });
    const nodes = [], edges = [], jobs = [], NW = V.NODE_W + 90, NH = V.NODE_H + 24;
    let row = 0;
    const scName = (id) => { const s = id && sceneOf(id); return s ? s.name : null; };
    const place = async (r, depth) => {
      const url = await toDataUrl(r.blob), thumb = r.thumb ? await toDataUrl(r.thumb) : null, j = r.job || {};
      const kind = r.kind === "photo" ? "source" : r.kind === "render" ? "render" : r.kind === "upscale" ? "upscale" : "edit";
      const words = r.kind === "render" ? boxText(j) : r.kind === "area" ? j.words || "" : "";
      const sn = r.kind === "render" ? scName(j.sceneId) : null;
      const n = { id: r.id, x: 80 + depth * NW, y: 80 + row * NH, kind, type: "image", status: "done", url, thumb, created: r.created,
        label: r.name || KIND[r.kind] || "Picture", ...(r.kind === "photo" ? { capture: "Phone" } : { named: true, engine: r.model || null }),
        prompt: r.kind === "photo" ? "" : r.kind === "upscale" ? "Upscaled ×2 (Google 4K)" : (r.kind === "area" ? "[Area] " : "") + V.shownPrompt(words, sn ? { name: sn } : null),
        ...(r.kind === "photo" ? {} : { phone: Object.assign({}, r.kind === "render" ? j : {}, r.kind === "area" ? { area: true, words: j.words, strokes: j.strokes, size: j.size } : {}, r.kind === "upscale" ? { upscale: true } : {}, { res: r.res, cost: r.cost || 0, model: r.model }) }) };
      nodes.push(n);
      if (r.from && ids.has(r.from)) edges.push({ id: "e-" + r.id, from: r.from, to: r.id });
      if (r.kind !== "photo") jobs.push({ id: "phone-" + r.id, created_at: new Date(r.created).toISOString(), kind: kind === "upscale" ? "upscale" : kind, engine: r.model || "nano-banana-2.1", prompt: r.prompt || "", provider: "google",
        settings: { resolution: r.res || "2K", words, ...(sn ? { scene: sn } : {}), ...(r.kind === "area" ? { keepMask: true } : {}), phone: true }, project: "Phone pictures", project_id: PHONE_PID, status: "done",
        outputs: [{ url, type: "image" }], favourite: false, cost_estimate: r.cost || 0 });
      const ks = kids.get(r.id) || [];
      if (!ks.length) row++;
      for (const k of ks) await place(k, depth + 1);
    };
    for (const r of kids.get(null) || []) await place(r, 0);
    const last = nodes.slice().reverse().find((n) => n.kind !== "source") || nodes[0];
    const now = new Date().toISOString();
    const project = { id: PHONE_PID, name: "Phone pictures", graph: { nodes, edges, groups: [], view: { x: 80, y: 80, z: 0.5 }, look: null, sheets: null, library: null, scene: null, missing: 0 }, thumb: last ? last.thumb : null, stats: { pictures: nodes.length, sheets: 0 }, created_at: now, updated_at: now };
    await V.api("backup_import", { data: { app: "Clarman VizLab backup", version: 1, projects: [project], jobs } });
    have = await V.api("project_get", { id: PHONE_PID });
  }
  // checked before the old pictures go: every one is in the project with its picture
  const got = new Map(((have.graph && have.graph.nodes) || []).map((n) => [n.id, n]));
  const missing = recs.filter((r) => { const n = got.get(r.id); return !n || !/^data:image\//.test(n.url || ""); });
  if (missing.length) { db.close(); throw new Error(`${plural(missing.length, "picture")} couldn't be copied, so the old pictures were kept`); }
  db.close(); indexedDB.deleteDatabase("vizlab-mobile");
  V.cfg.lastProject = PHONE_PID; V.store.set("lastProject", PHONE_PID);
  return recs.length;
}

// ================= PLAN phases 3-5: the tools, through the desktop's own code =================
// ---------- more icons ----------
Object.assign(ICON, {
  video: '<rect x="2.5" y="6" width="13" height="12" rx="2"/><path d="M15.5 10.5l6-3.5v10l-6-3.5z"/>',
  cube: '<path d="M12 2.8l8.5 4.7v9L12 21.2l-8.5-4.7v-9z"/><path d="M3.5 7.5L12 12l8.5-4.5M12 12v9.2"/>',
  bucket: '<path d="M5 11l7-7 7 7-7 7z"/><path d="M5 11h14"/><path d="M20 15s1.6 2 1.6 3.1a1.6 1.6 0 0 1-3.2 0C18.4 17 20 15 20 15z"/>',
  eraser: '<path d="M8.5 20H20M4.6 15.6l9.8-9.8a2 2 0 0 1 2.8 0l2.5 2.5a2 2 0 0 1 0 2.8L12 18.8a4 4 0 0 1-5.6 0l-1.8-1.8a1 1 0 0 1 0-1.4z"/><path d="M9 11.2l5.6 5.6"/>',
  ruler: '<path d="M3 17L17 3l4 4L7 21z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  share: '<path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
  cut: '<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M7.8 16.2L18 4M16.2 16.2L6 4"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  text: '<path d="M5 6V4h14v2M12 4v16M9 20h6"/>', compare: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>',
  batch: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><path d="M15 17h6M18 14v6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>', ar: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M12 7l5 2.8v5.6L12 18l-5-2.6V9.8z"/>',
});

// ---------- the desktop's own windows and screens on the phone ----------
// The host (#deskhost.dk) stays on the page; desk.css (style.css scoped under .dk) styles it, phone.css makes its
// controls finger-sized. A desktop pop-up (V.confirm, the Elevation, Cut out, Batch… windows) shows over the phone
// screens as it is. Files the desktop "downloads" go to the share sheet (Save to Files, Photos, Mail, AirDrop).
const deskHost = $("#deskhost");
V.download = async (url, name, o = {}) => {
  try { const b = await (await fetch(url)).blob(); await shareFile(b, name || "VizLab file"); } catch (e) { say("Couldn't save the file: " + e.message, 5000); }
  return name;
};
const modalOpen = () => [...deskHost.querySelectorAll(".modal, .revov, .review, [role=dialog]")].some((m) => !m.hidden && m.getClientRects().length > 0);
// a desktop window or tool started from the phone: what it makes (a new picture, video or 3D model) is followed, with
// the busy screen while the AI works, then opened on the phone
const isMedia = (n) => n && ["image", "video", "model", "world"].includes(n.type);
async function deskFlow(fn, o = {}) {
  const before = new Set(V.G.nodes.map((n) => n.id));
  try { await fn(); } catch (e) { console.warn("desk", e); return alertBox("That didn't work", e.message || String(e)); }
  const t0 = Date.now(); let seenModal = false, lastModal = Date.now();
  for (;;) {
    const made = V.G.nodes.filter((n) => !before.has(n.id) && isMedia(n));
    if (made.length) return follow(made[made.length - 1], o.title || "Working on it");
    const open = modalOpen() || (o.still && o.still());
    if (open) { seenModal = true; lastModal = Date.now(); }
    if ((seenModal || Date.now() - t0 > 4000) && !open && Date.now() - lastModal > 2500) return null;
    if (Date.now() - t0 > 15 * 60000) return null;
    await sleep(300);
  }
}
// a picture being made by the desktop's code: the busy screen until it lands, then open it
async function follow(n, title = "Working on it") {
  if (n.status === "done" && n.url) return openAny(n, true);
  const src = parentOf(n) || n;
  const j = busyOpen(src, title, V.engines.image); j.nodes = [];
  $("#bModel").textContent = n.engine ? V.engineName(n.engine) + " is working on it" : "Working on it";
  if (n.type === "video" || n.kind === "video" || n.kind === "3d" || n.kind === "world") $("#bNote").textContent = "Videos and 3D models take a few minutes. Keep VizLab open.";
  j.soft = true; // (Cancel here only stops waiting: the job carries on and lands in the project)
  for (;;) {
    if (j.stopped) return;
    if (!V.node(n.id)) { busyClose(); return; }
    if (n.status === "error") { busyClose(); return failBox(errOf(n.error)); }
    if (n.status === "done" && n.url) { await sleep(400); busyClose(); return openAny(n, true); }
    await sleep(400);
  }
}
const openAny = (n, fresh) => (n.type === "image" ? (kindOf(n) === "photo" ? openTodo(n, fresh) : openResult(n, fresh)) : openMedia(n, fresh));
// the desktop's Draw / Touch-ups viewer, lifted full-screen under a phone header (and, for Make, a phone footer)
let LF = null; // { node, before, closing }
function liftOpen(n, { title, mode, foot = null, after = null }) {
  if (LF) liftClose(true);
  LF = { node: n, before: new Set(V.G.nodes.map((x) => x.id)), mode };
  closeSheet();
  V.setSel([n.id]);
  const head = h("div", { id: "lifthead", "data-phone": "1" }, h("button", { class: "ib", "aria-label": "Back", html: icon("back"), onclick: () => liftClose() }), h("h2", {}, title), h("button", { class: "done", onclick: () => liftClose() }, "Done"));
  deskHost.prepend(head); if (foot) { foot.id = "liftfoot"; foot.dataset.phone = "1"; deskHost.append(foot); }
  deskHost.classList.add("lift"); $("#tabs").hidden = true;
  deskHost.style.setProperty("--liftfoot", "0px");
  V.setViewerMode(mode);
  requestAnimationFrame(() => { deskHost.style.setProperty("--liftfoot", foot ? foot.offsetHeight + "px" : "0px"); after && after(); });
}
function liftClose(quiet) {
  if (!LF || LF.closing) return; const L = LF; L.closing = true;
  $("#lifthead") && $("#lifthead").remove(); $("#liftfoot") && $("#liftfoot").remove();
  V.bucketMode = null;
  // a window the tool left open (the material chooser, the key) closes with it
  [...deskHost.querySelectorAll(".modal")].filter((m) => !m.hidden && m.getClientRects().length > 0).forEach((m) => { const x = m.querySelector(".mclose"); if (x) x.click(); else m.remove(); });
  if (V.viewerMode !== "preview") V.setViewerMode("preview");
  if (L.mode === "compare" && document.body.classList.contains("enlarged")) V.setEnlarged(false);
  deskHost.classList.remove("lift"); LF = null; paintTabs(cur);
  V.changed();
  if (quiet) return;
  const made = V.G.nodes.filter((x) => !L.before.has(x.id) && isMedia(x));
  const last = made[made.length - 1];
  if (last) return last.status === "done" ? openAny(last, true) : follow(last);
  if (cur === "result" && rRec) openResult(rRec); else if (cur === "todo") paintTodo();
}
// the desktop leaving Draw / Touch-ups by itself (its own Done, Save as new picture, Escape) ends the lifted screen too
const svm0 = V.setViewerMode;
V.setViewerMode = (m) => {
  const r = svm0(m);
  if (LF && !LF.closing && m !== LF.mode && m !== "draw" && m !== "touch") liftClose();
  else if (!LF && viaFind() && (m === "draw" || m === "touch") && V.selImages()[0]) liftOpen(V.selImages()[0], { title: m === "draw" ? "Draw" : "Touch up", mode: m, foot: m === "draw" ? liftFoot("Edit", "What should change?", () => V.make()) : null });
  return r;
};
// a page the desktop opens from Find goes to its phone tab or screen
let liftingPage = false;
const sv0 = V.setView;
V.setView = (v) => {
  const r = sv0(v);
  if (!liftingPage && viaFind()) {
    if (v === "sheets" || v === "library") setTimeout(() => tab(v), 0);
    else if (v === "settings" || v === "account" || v === "help") setTimeout(() => deskPage(v, { settings: "All settings", account: "Usage", help: "Help" }[v]), 0);
    else if (v === "projects") setTimeout(() => tab("projects"), 0);
    else if (v === "history") setTimeout(() => nav("allpics"), 0);
  }
  return r;
};
// a footer with your words and the big button, for a lifted tool that makes something
function liftFoot(label, ph, go, chips = null) {
  const ta = h("textarea", { rows: 1, placeholder: ph, "aria-label": "Your words" });
  const b = h("button", { class: "btn pri cl go" }, label);
  b.onclick = async () => {
    V.setPrompt(ta.value.trim(), { noUndo: true }); ta.blur();
    const before = new Set(V.G.nodes.map((x) => x.id));
    try { await go(); } catch (e) { return alertBox("That didn't work", e.message || String(e)); }
    await sleep(300);
    const made = V.G.nodes.filter((x) => !before.has(x.id) && isMedia(x));
    if (made.length) { liftClose(true); follow(made[made.length - 1], label); }
  };
  return h("div", {}, chips, ta, b);
}

// ---------- your picture: what do you want to do? (D7: ordered by what the picture is) ----------
let tRec = null;
function openTodo(n, fresh = false) {
  tRec = n; if (V.node(n.id)) V.setSel([n.id]); paintTodo();
  if (fresh) { stack.length = 0; stack.push("home"); show("todo", 1); } else nav("todo");
}
const TOOL = {
  render: ["Render", "scene", "Photoreal, with a scene, a preset or your words"],
  area: ["Change an area", "brush", "Paint over it and say what"],
  mats: ["Materials", "bucket", "Paint materials onto the surfaces"],
  touch: ["Touch up", "eraser", "Paint the original back in"],
  video: ["Video", "video", "Animate it"],
  three: ["3D", "cube", "A 3D model or a walk-around scene"],
  cad: ["Drawing & CAD", "ruler", "Elevation, straighten a wall, CAD file"],
  more: ["More", "more", "Upscale, cut out, compare, logo, rename…"],
};
const ORDER = {
  view: ["render", "area", "mats", "cad", "video", "three", "touch", "more"],
  photo: ["render", "area", "mats", "cad", "video", "three", "touch", "more"],
  drawing: ["render", "cad", "area", "mats", "three", "video", "touch", "more"],
  elevation: ["cad", "three", "area", "render", "mats", "touch", "video", "more"],
  render: ["area", "touch", "render", "mats", "video", "three", "cad", "more"],
};
function paintTodo() {
  const n = tRec; if (!n) return;
  $("#tImg").src = n.url; $("#tTitle").textContent = kindOf(n) === "photo" ? (n.label === "Photo" ? "Your photo" : "Your picture") : KIND[kindOf(n)] || "Your picture";
  $("#tMeta").innerHTML = `<b>${esc(V.nodeTitle(n))}</b>${esc(V.nodeSub(n) || "")}`;
  const k = V.pictureKind(n), order = ORDER[k] || ORDER.render, G = $("#tGrid"); G.innerHTML = "";
  const touchOk = V.touchSources(n).length > 0;
  order.forEach((id, i) => {
    const [name, ic, sub] = TOOL[id], off = id === "touch" && !touchOk;
    G.append(h("button", { class: "tt" + (i === 0 ? " first" : ""), "data-tool": id, disabled: off, onclick: () => runTool(id, n) },
      h("span", { class: "ti", html: icon(ic) }), h("b", {}, name), h("small", {}, off ? "For a render: brings back parts of the picture it was made from" : sub)));
  });
  $("#tSave").innerHTML = icon("save") + "<span>Save to Photos</span>"; $("#tSave").onclick = () => saveToPhotos(n);
  $("#tShare").innerHTML = icon("share") + "<span>Share</span>"; $("#tShare").onclick = () => saveToPhotos(n);
}
function runTool(id, n) {
  if (id === "render") return kindOf(n) === "render" ? openPicture(parentOf(n) || n, choiceOf(n)) : openPicture(n);
  if (id === "area") return openPaint(n);
  if (id === "mats") return openMaterials(n);
  if (id === "touch") return openTouch(n);
  if (id === "video") return openVideo(n);
  if (id === "three") return open3d(n);
  if (id === "cad") return cadSheet(n);
  if (id === "more") return moreSheet(n);
}
$("#rMore").onclick = () => openTodo(rRec);
// ---------- Make: a file (PDF drawings), a new picture from words, find anything ----------
$("#bFile .ti").innerHTML = icon("sheets"); $("#bWords .ti").innerHTML = icon("text"); $("#bFind .ti").innerHTML = icon("search");
$("#fFile").addEventListener("change", async (e) => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  if (!(f.type === "application/pdf" || /\.pdf$/i.test(f.name))) return addFile(f, false);
  say("Reading " + f.name + "…", 4000); newProjectName();
  try {
    const { pages, total } = await V.pdfPages(f), name = f.name.replace(/\.[^.]+$/, "").slice(0, 30); let first = null;
    for (const p of pages) { const n = await V.addImageNode(p.dataUrl, null, total > 1 ? `${name} p${p.page}` : name, { pdf: true }); first = first || n; }
    V.changed(true); if (total > pages.length) say(`Added the first ${pages.length} of ${total} pages`, 5000);
    if (first) openTodo(first, true);
  } catch (er) { alertBox("Couldn't read the PDF", er.message || String(er)); }
});
$("#bWords").onclick = () => newFromWords(null);
// Find: the desktop's Ctrl+K list. What its commands open lands on the phone: a page (Sheets, Library, Settings…) in
// its tab or screen, Draw / Touch-ups full screen, a new picture followed to its result
let findT = 0; const viaFind = () => Date.now() < findT;
const cmdOpen = () => [...deskHost.querySelectorAll(".cmdrow")].some((r) => r.getClientRects().length > 0);
$("#bFind").onclick = async () => { findT = Date.now() + 3600e3; try { await deskFlow(() => V.openCommand(), { still: cmdOpen }); } finally { findT = Date.now() + 1500; } };
// Render: Improve my words, RAL colour, and what goes with every render (Project look, Furniture & materials)
$("#pImprove").innerHTML = icon("make") + "<span>Improve my words</span>"; $("#pRal").innerHTML = icon("bucket") + "<span>RAL colour…</span>";
$("#pImprove").onclick = async () => {
  const b = $("#pImprove"), w = $("#pWords").value.trim() || presetText(C); b.disabled = true; b.querySelector("span").textContent = "Improving…";
  try { const r = await V.api("enhance", { prompt: w, tab: "image", images: [pRec.url] }); if (r && r.prompt) { $("#pWords").value = r.prompt; C.words = r.prompt; paintDoes(); } }
  catch (e) { failBox(errOf(e.message)); }
  b.disabled = false; b.querySelector("span").textContent = "Improve my words";
};
$("#pRal").onclick = () => { const r = $("#pRal").getBoundingClientRect(); V.openRAL(16, Math.max(80, r.top - 360), (c) => { const code = /^RAL/i.test(c.code) ? c.code : "RAL " + c.code; const t = $("#pWords"); t.value = (t.value.trim() ? t.value.trim().replace(/([^.!?,;:])$/, "$1,") + " " : "") + code; C.words = t.value; paintDoes(); }); };
function paintEvery() {
  const B = $("#pEvery"); B.innerHTML = "";
  const lk = V.G.look && V.G.look.on ? V.G.look : null, lib = ((V.G.library && V.G.library.items) || []).filter((i) => i.use && i.kind !== "style");
  const row = (ic, name, sub, on, open, off) => h("button", { class: "opt" + (on ? " on" : ""), onclick: (e) => { if (e.target.closest(".x")) return; open(); } }, h("span", { class: "oi", html: icon(ic) }), h("span", { class: "ot" }, h("b", {}, name), h("small", {}, sub)), on && off ? h("span", { class: "x", role: "button", "aria-label": "Take it out", onclick: () => { off(); paintEvery(); paintDoes(); } }, h("span", { html: icon("x") })) : h("span", { class: "chev" }));
  B.append(row("sun", lk ? "Project look: " + (lk.name || "on") : "Project look", lk ? "The materials, colours and light of your reference, in every render" : "Match every render to one picture you like", !!lk, () => waitModal(() => V.openLook(pRec)).then(() => { paintEvery(); paintDoes(); }), () => { V.G.look.on = false; V.changed(); }),
    row("library", lib.length ? `Furniture & materials: ${lib.length}` : "Furniture & materials", lib.length ? lib.map((i) => i.name).join(", ") : "Products and materials from the Library", lib.length > 0, () => waitModal(() => V.openPicker()).then(() => { paintEvery(); paintDoes(); })));
}

// ---------- Change an area: the full Draw (selections, AI select, notes, place, layers, adjust) ----------
function openDraw(n, title = "Change an area") {
  liftOpen(n, { title, mode: "draw", foot: liftFoot("Edit", "What should change? e.g. \"a timber front door\"", () => V.make()) });
}
// ---------- Materials: Draw's material bucket, with SketchUp's keys as chips ----------
const BMODES = [[null, "Paint"], ["all", "All of this colour"], ["pick", "Pick up"], ["erase", "Rub out"]];
function openMaterials(n) {
  const chips = h("div", { class: "chips" });
  const paint = () => { chips.innerHTML = ""; BMODES.forEach(([m, l]) => chips.append(h("button", { class: (V.bucketMode || null) === m ? "on" : "", "data-mode": m || "paint", onclick: () => { V.bucketMode = m; paint(); } }, l))); };
  V.bucketMode = null; paint();
  liftOpen(n, { title: "Materials", mode: "draw", foot: liftFoot("Render with these materials", "Anything to add? (optional)", () => V.make(), chips), after: () => V.drawApi.setTool("bucket") });
}
// ---------- Touch up: the desktop's Touch-ups on the render ----------
function openTouch(n) {
  if (!V.touchSources(n).length) return alertBox("Touch up", "Touch up paints back parts of the picture a render was made from (text, logos, a face). Open a render to use it.");
  liftOpen(n, { title: "Touch up", mode: "touch" });
}

// ---------- Video: Gemini Omni Flash with the Google key; fal.ai's models with a fal.ai key ----------
let VD = null; // { n, last, preset, len, engine }
const CAM_WORDS = /camera|orbit|drone|dolly|pan |track|push|pull|rise|fly|crane|walk/i;
const vidPresets = () => D.videoPresets.filter((p) => p.p).sort((a, b) => (CAM_WORDS.test(b.p) ? 1 : 0) - (CAM_WORDS.test(a.p) ? 1 : 0));
const vidEngines = () => D.videoEngines.filter((e) => !e.hidden);
function openVideo(n) {
  const ok = vidEngines().filter((e) => !V.engineNeed(e));
  VD = { n, last: null, preset: (vidPresets()[0] || {}).id, engine: (ok.find((e) => e.id === V.engines.video) || ok[0] || vidEngines()[0]).id, len: store.get("vLen", 5) };
  $("#vWords").value = ""; paintVideo(); nav("video");
}
function paintVideo() {
  const e = D.videoEngines.find((x) => x.id === VD.engine);
  const F = $("#vFrames"); F.innerHTML = "";
  F.append(h("div", { class: "pick on" }, h("img", { src: VD.n.thumb || VD.n.url, alt: "" }), h("span", { class: "kind" }, "First frame")),
    h("button", { class: "pick" + (VD.last ? " on" : ""), onclick: () => pickPicture("The last frame", VD.n, (m) => { VD.last = m; paintVideo(); }, !!VD.last && (() => { VD.last = null; paintVideo(); })) },
      VD.last ? h("img", { src: VD.last.thumb || VD.last.url, alt: "" }) : h("span", { style: "display:grid;place-items:center;aspect-ratio:4/3;color:var(--mute);font-size:15px;padding:8px;text-align:center" }, "+ Last frame (optional)"), VD.last ? h("span", { class: "kind" }, "Last frame") : null));
  const G = $("#vPresets"); G.innerHTML = "";
  vidPresets().forEach((p) => G.append(h("button", { class: "pt" + (VD.preset === p.id ? " on" : ""), onclick: () => { VD.preset = VD.preset === p.id ? null : p.id; paintVideo(); } }, h("span", { html: (D.picons && D.picons[p.id]) || D.icons[p.icon] || "", style: "display:contents" }), h("b", {}, p.name), VD.preset === p.id ? h("span", { class: "tick", html: icon("check") }) : null)));
  const ds = (e && e.durations) || [5]; if (!ds.includes(VD.len)) VD.len = ds.includes(5) ? 5 : ds[0];
  const S = $("#vLen"); S.innerHTML = ""; ds.forEach((d) => S.append(h("button", { class: d === VD.len ? "on" : "", onclick: () => { VD.len = d; store.set("vLen", d); paintVideo(); } }, d + " s")));
  const M = $("#vModels"); M.innerHTML = "";
  vidEngines().forEach((x) => { const need = V.engineNeed(x); M.append(h("button", { class: "radio" + (VD.engine === x.id ? " on" : ""), disabled: !!need, style: need ? "opacity:.5" : "", onclick: () => { if (need) return; VD.engine = x.id; paintVideo(); } }, h("span", { class: "dot" }), h("span", { class: "ot" }, h("b", {}, x.name), h("small", {}, need || (x.google ? "Google key" : "fal.ai") + (cfg.costs && x.price ? ` · about ${money(x.price(VD.len, false, "1080p"))}` : ""))))); });
  $("#vCost").textContent = e && cfg.costs && e.price ? `~${money(e.price(VD.len, false, "720p"))} · ${e.google ? "Google" : "fal.ai"} · ${VD.len} s` : `${VD.len} seconds`;
}
const tabTo = (t) => { const b = document.querySelector(`#modeTabs button[data-v="${t}"]`); if (b && V.tab !== t) b.click(); };
$("#vGo").onclick = async () => {
  const e = D.videoEngines.find((x) => x.id === VD.engine); if (!e || V.engineNeed(e)) return alertBox("Video", "Choose an AI model you have a key for.");
  const p = VD.preset && D.videoPresets.find((x) => x.id === VD.preset);
  tabTo("video"); V.setVTool("create");
  V.engines.video = e.id; V.store.set("engines", V.engines); V.engRedraw();
  setSelect("#vDur", String(VD.len)); const au = $("#vAudio"); if (au) au.checked = false;
  try { const d = await dimsOf(VD.n); setSelect("#vAr", d.h > d.w ? "9:16" : "16:9"); } catch (er) {}
  V.setSel([VD.n.id].concat(VD.last ? [VD.last.id] : []));
  V.setPrompt([p ? p.p : "", $("#vWords").value.trim()].filter(Boolean).join(" "), { noUndo: true });
  await deskFlow(() => V.make(), { title: "Making your video" });
  tabTo("image");
};
// choose one of the project's pictures (the last frame of a video, the second picture to compare…)
function pickPicture(title, not, then, clear) {
  const list = pics().filter((x) => x.type === "image" && x !== not), body = h("div");
  if (clear) body.append(h("button", { class: "btn sec", style: "margin-bottom:12px", onclick: () => { closeSheet(); clear(); } }, "None"));
  if (!list.length) body.append(h("p", { class: "none" }, "No other pictures in this project yet."));
  const g = h("div", { class: "vgrid" }); body.append(g);
  list.forEach((m) => g.append(h("button", { class: "pick", onclick: () => { closeSheet(); then(m); } }, h("img", { src: m.thumb || m.url, alt: "" }), h("span", { class: "cap", style: "display:block;padding:8px 10px;font-size:14px" }, V.nodeTitle(m)))));
  openSheet(title, { tall: true, body });
}

// ---------- 3D ----------
const d3Engines = () => D.d3Engines.filter((e) => !e.hidden && !e.tripoDirect && !e.modly);
function open3d(n) {
  const B = $("#dBody"); B.innerHTML = "";
  const fal = !!V.cfg.fkey;
  const tile = (ic, name, sub, fn, off) => h("button", { class: "rowbtn", disabled: !!off, style: "min-height:96px", onclick: fn }, h("span", { class: "ti", html: icon(ic) }), h("span", {}, h("b", {}, name), h("small", {}, off || sub)));
  B.append(h("div", { class: "pic" }, h("img", { src: n.url, alt: "" })), h("div", { class: "rows" },
    tile("cube", "3D model from this picture", "An AI model of the object or building (Meshy, Hunyuan3D, Tripo)", () => model3d(n), !fal && "Needs a fal.ai key (Settings › More AI services)"),
    tile("ar", "Walk-around scene", "A 3D scene you can move around in (TripoSplat)", () => world3d(n), !fal && "Needs a fal.ai key (Settings › More AI services)"),
    tile("ruler", "From elevations (free, exact)", "Straight elevations to a crisp 3D model, no AI", () => deskFlow(() => V.openElev3d(pickElevs(n)), { title: "Building the model" })),
    tile("layers", "From a 3D view", "An AI elevation of the room or building, then measured into a model", () => deskFlow(() => V.openRoom3d(n), { title: "Building the model" }))));
  nav("three");
}
const pickElevs = (n) => [n].concat(pics().filter((x) => x !== n && x.type === "image" && V.pictureKind(x) === "elevation").slice(0, 3));
function model3d(n) {
  const body = h("div");
  let eng = d3Engines().find((e) => e.id === V.engines["3d"]) ? V.engines["3d"] : d3Engines()[0].id;
  const paint = () => { body.innerHTML = ""; d3Engines().forEach((e) => { const need = V.engineNeed(e); body.append(h("button", { class: "radio" + (eng === e.id ? " on" : ""), disabled: !!need, onclick: () => { eng = e.id; paint(); } }, h("span", { class: "dot" }), h("span", { class: "ot" }, h("b", {}, e.name), h("small", {}, need || (e.tags || []).join(" · ") + (cfg.costs && e.price ? ` · about ${money(e.price({}))}` : ""))))); });
    body.append(h("button", { class: "btn pri cl", style: "margin-top:10px", onclick: () => { closeSheet(); go(); } }, "Make 3D model")); };
  const go = async () => { tabTo("3d"); V.setDTool("model"); V.engines["3d"] = eng; V.store.set("engines", V.engines); V.engRedraw(); V.setSel([n.id]); await deskFlow(() => V.make(), { title: "Making the 3D model" }); tabTo("image"); };
  paint(); openSheet("3D model", { body });
}
async function world3d(n) { tabTo("3d"); V.setDTool("world"); V.setSel([n.id]); await deskFlow(() => V.make(), { title: "Making the walk-around scene" }); tabTo("image"); }

// ---------- a video, 3D model or walk-around scene ----------
let mRec = null, mWatch = 0;
function openMedia(n, fresh = false) {
  mRec = n; const B = $("#mBody"); B.innerHTML = ""; clearInterval(mWatch);
  $("#mTitle").textContent = KIND[n.type] || "Result";
  if (n.type === "video") B.append(h("video", { class: "media", src: n.url, controls: true, playsinline: true, loop: true, muted: true, autoplay: true }));
  else {
    const st = h("div", { class: "mstage dk" }); B.append(st);
    try { if (n.type === "model") V.modelView(st, n); else V.splatView(st, n); } catch (e) { st.append(h("p", { class: "none" }, "Couldn't show it: " + e.message)); }
    const mv = st.querySelector("model-viewer");
    if (mv) { mv.setAttribute("ar", ""); mv.setAttribute("ar-modes", "quick-look webxr scene-viewer"); mv.setAttribute("ar-scale", "auto"); } // See it in AR (iPhone: AR Quick Look)
    // "Use this view": the new picture opens on the phone
    const before = new Set(V.G.nodes.map((x) => x.id));
    mWatch = setInterval(() => { if (cur !== "media") return clearInterval(mWatch); const nn = V.G.nodes.find((x) => !before.has(x.id) && x.type === "image" && x.status === "done"); if (nn) { clearInterval(mWatch); openTodo(nn); } }, 500);
  }
  B.append(h("p", { class: "meta" }, h("b", {}, V.nodeTitle(n)), [n.engine && V.engineName(n.engine), when(n.created)].filter(Boolean).join(" · ")));
  const ext = n.type === "video" ? "mp4" : n.type === "model" ? "glb" : "ply";
  B.append(h("button", { class: "btn pri cl", style: "margin-bottom:12px", onclick: async () => { const b = await blobOf(n.url); shareFile(b, fileName(n, (b.type.split("/")[1] || ext).replace("quicktime", "mov").replace("gltf-binary", "glb").replace("octet-stream", ext))); } }, h("span", { html: icon("share"), style: "display:contents" }), h("span", {}, n.type === "video" ? "Save or share the video" : "Share the model")),
    h("button", { class: "btn ghost", onclick: async () => { if (await delPic(n)) back(); } }, h("span", { html: icon("trash"), style: "display:contents" }), h("span", {}, "Delete")));
  if (fresh && (cur === "busy" || cur === "todo" || cur === "video" || cur === "three")) { stack.push(cur); show("media", 1); } else nav("media");
}

// ---------- Drawing & CAD ----------
function sheetRows(title, rows) {
  const body = h("div", { class: "rows" });
  rows.filter(Boolean).forEach(([ic, name, sub, fn, cls]) => body.append(h("button", { class: "rowbtn" + (cls ? " " + cls : ""), onclick: () => { closeSheet(); setTimeout(fn, 320); } }, h("span", { class: "ti", html: icon(ic) }), h("span", {}, h("b", {}, name), sub ? h("small", {}, sub) : null))));
  openSheet(title, { tall: rows.length > 6, body });
}
function cadSheet(n) {
  sheetRows("Drawing & CAD", [
    ["ruler", "Make an elevation", "AI: a flat elevation from this view", () => deskFlow(() => V.openElevation([n]), { title: "Making the elevation" })],
    ["sheets", "Drawing briefs", "Plans, sections, line drawings and more", () => { openPicture(n); setTimeout(() => presetSheet(true), 400); }],
    ["compare", "Straighten a wall (true elevation)", "Exact, no AI: drag four corners", () => deskFlow(() => V.openRectify(n), { title: "Straightening" })],
    ["layers", "Make a CAD file", "DXF or SVG lines, to share to the PC", () => deskFlow(() => V.openCad(n))],
  ]);
}
// ---------- More ----------
function moreSheet(n) {
  sheetRows("More", [
    ["up", "Upscale ×2", "A sharper 4K copy", () => doUpscale(n)],
    ["text", "New picture from words", "Your picture only lends the style", () => newFromWords(n)],
    ["batch", "Batch render", "Several pictures, one choice each", () => deskFlow(() => V.openBatch({}), { title: "Rendering" })],
    ["compare", "Compare with another picture", "A before/after slider", () => pickPicture("Compare with…", n, (m) => compareTwo(n, m))],
    ["star", n.fav ? "Remove from favourites" : "Add to favourites", "", () => { n.fav = !n.fav; V.changed(true); say(n.fav ? "Added to favourites" : "Removed from favourites"); }],
    ["star", "Review the favourites", "Full screen, side by side", () => deskFlow(() => V.openReview({}))],
    ["scene", "Photomontage", "Put a proposal into a site photo", () => deskFlow(() => V.openMontage(n), { title: "Making the photomontage" })],
    ["cut", "Cut out an object", "A transparent picture of one thing", () => deskFlow(() => V.openCutout(n), { title: "Cutting it out" })],
    ["layers", "Place into a scene", "Put this object into another picture", () => deskFlow(() => V.openPlace(n), { title: "Placing it" })],
    ["sun", "Adjust colour and layers", "Brightness, colour, layers (Draw)", () => openDraw(n, "Adjust")],
    ["info", "Describe this picture", "Words you can use in a render", () => deskFlow(() => V.openRefPrompt(n))],
    ["save", "Save with the Clarman logo", "", async () => { try { const u = await V.stampLogo(n.url); shareFile(await blobOf(u), fileName(n, "jpg").replace(/\.jpg$/, " Clarman.jpg")); } catch (e) { alertBox("Couldn't add the logo", e.message); } }],
    n.cutout ? ["cut", "Refine the cut-out", "Paint parts in or out", () => deskFlow(() => V.openRefine(n))] : null,
    ["compare", "Compare: overlay and edges", "The desktop's Compare view", () => liftOpen(n, { title: "Compare", mode: "compare", after: () => V.setEnlarged(true) })],
    ["text", "Copy the words", "The prompt this picture was made with", async () => { try { await navigator.clipboard.writeText(V.nodePrompt(n) || ""); say("Copied"); } catch (e) { say("Couldn't copy"); } }],
    ["sheets", "Add to a sheet", "Opens Sheets with this picture selected", () => { V.setSel([n.id]); tab("sheets"); }],
    ["save", "A PDF of this project's pictures", "One page each, to share", () => { const ns = pics().filter((x) => x.type === "image"); V.exportPDF(ns.slice().reverse()); }],
    ["edit", "Rename", "", async () => { const v = await askBox("Rename", V.nodeTitle(n)); if (v) { V.renameNode(n, v); V.changed(true); paintTodo(); say("Renamed"); } }],
    ["trash", "Delete", "", async () => { if (await delPic(n)) homeNow(); }, "bad"],
  ]);
}
async function newFromWords(n) {
  const w = await askBox("New picture from words", "", "Make it"); if (!w) return;
  V.setTool("creator"); V.setSel(n ? [n.id] : []); V.setPrompt(w, { noUndo: true });
  await deskFlow(() => V.make(), { title: "Making a new picture" });
  V.setTool("editor");
}
async function compareTwo(a, b) { await openResult(a); rFrom = b; paintCompare(); }

// ---------- Sheets and Library: the desktop's own pages, full screen in their tabs ----------
function liftPage(view, box) {
  box.innerHTML = "";
  deskHost.classList.add("liftpage");
  $$("#deskhost .overlay").forEach((o) => o.classList.remove("liftov"));
  liftingPage = true; try { V.setView(view); } finally { liftingPage = false; }
  const ov = $({ sheets: "#ovSheets", library: "#ovLibrary", settings: "#ovSettings", account: "#ovAccount", help: "#ovHelp" }[view]); if (ov) ov.classList.add("liftov");
}
function unliftPage() { if (!deskHost.classList.contains("liftpage")) return; deskHost.classList.remove("liftpage"); $$("#deskhost .overlay").forEach((o) => o.classList.remove("liftov")); liftingPage = true; try { V.setView("canvas"); } finally { liftingPage = false; } }
const show0 = show;
show = (id, dir) => { if (!["sheets", "library", "dpage"].includes(id)) unliftPage(); deskHost.style.setProperty("--pagebot", id === "dpage" ? "var(--sab)" : "calc(var(--tabh) + var(--sab))"); return show0(id, dir); };
// a desktop page (All settings, Usage, Help) on a phone screen with a Back button
function deskPage(view, title) { $("#dpTitle").textContent = title; nav("dpage"); liftPage(view, $("#dpage .wrap")); }
// a desktop window opened from the phone: resolves once it has been closed
async function waitModal(fn) {
  await fn(); const t0 = Date.now(); let seen = false;
  for (;;) { await sleep(250); const o = modalOpen(); if (o) seen = true; if ((seen && !o) || (!seen && Date.now() - t0 > 1500) || Date.now() - t0 > 30 * 60000) return; }
}
paintSheets = () => liftPage("sheets", $("#tsBody"));
paintLibrary = () => liftPage("library", $("#tlBody"));
screens.sheets = paintSheets; screens.library = paintLibrary;

// ---------- the desktop's own pop-ups belong to the PC: anything it puts on the page goes into the hidden host ----------
const host = $("#deskhost");
const MINE = new Set(["todo", "video", "three", "media", "dpage", "welcome", "home", "pic", "result", "paint", "history", "settings", "projects", "allpics", "sheets", "library", "tabs", "pview", "busy", "shade", "sheet", "dlg", "mtoast", "a2hs", "deskhost"]);
const stray = (el) => el.nodeType === 1 && !MINE.has(el.id) && !(el.dataset && el.dataset.phone) && !/^(SCRIPT|STYLE|LINK|TEMPLATE)$/.test(el.tagName);
[...document.body.children].filter(stray).forEach((el) => host.append(el));
new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((el) => { if (el.parentNode === document.body && stray(el)) host.append(el); }))).observe(document.body, { childList: true });

// ---------- start ----------
async function boot() {
  if (!cfg.key) { paintWelcome(); show("welcome"); } else { paintHome(); show("home"); }
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});
  await sleep(350); // shell.js opens the last project 300 ms after the page loads
  let moved = 0;
  try { moved = await migrate(); } catch (e) { console.warn("move", e); alertBox("Your older pictures", "Couldn't move them into a project: " + e.message + ". They are still on this phone; VizLab tries again next time."); }
  const want = V.cfg.lastProject;
  for (let i = 0; i < 30 && want && !moved && V.project.id !== want; i++) await sleep(100);
  if (want && V.project.id !== want) { try { await V.loadProject(want); } catch (e) { console.warn("project", e); V.newProject(); } }
  newProjectName();
  if (moved) say(`${plural(moved, "picture")} from this phone are now in the project "Phone pictures".`, 5000);
  if (cur === "home") paintHome();
  if (cfg.key) a2hsHint();
}
window.VLM = { version: VERSION, preview: (n, c) => preview(n, cleanChoice(c)), pics, migrate, kindOf }; // for tests
boot();
})();
