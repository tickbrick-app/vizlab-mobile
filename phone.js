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
  // v3.74 (mobile:M12): the Make tab is a sparkle (a star read as Favourites); filled versions for the chosen tab
  sparkle: '<path d="M11 3.5c.6 3.9 2.6 5.9 6.5 6.5-3.9.6-5.9 2.6-6.5 6.5-.6-3.9-2.6-5.9-6.5-6.5 3.9-.6 5.9-2.6 6.5-6.5z"/><path d="M18.5 14.5c.3 1.9 1.1 2.7 3 3-1.9.3-2.7 1.1-3 3-.3-1.9-1.1-2.7-3-3 1.9-.3 2.7-1.1 3-3z"/>',
  sparkleF: '<path fill="currentColor" d="M11 3.5c.6 3.9 2.6 5.9 6.5 6.5-3.9.6-5.9 2.6-6.5 6.5-.6-3.9-2.6-5.9-6.5-6.5 3.9-.6 5.9-2.6 6.5-6.5z"/><path fill="currentColor" d="M18.5 14.5c.3 1.9 1.1 2.7 3 3-1.9.3-2.7 1.1-3 3-.3-1.9-1.1-2.7-3-3 1.9-.3 2.7-1.1 3-3z"/>',
  folderF: '<path fill="currentColor" d="M3 7.5A1.5 1.5 0 0 1 4.5 6H9l2 2.5h8.5A1.5 1.5 0 0 1 21 10v8.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/>',
  sheetsF: '<rect x="4" y="3" width="16" height="18" rx="1.5" fill="currentColor"/><g stroke="#0d0d0e" stroke-width="1.8"><rect x="7" y="6" width="6" height="6"/><path d="M15.5 6.5h1.5M15.5 9.5h1.5M7 15h10M7 18h6"/></g>',
  libraryF: '<rect fill="currentColor" x="3" y="4" width="4" height="16" rx="1"/><rect fill="currentColor" x="8.5" y="4" width="4" height="16" rx="1"/><path fill="currentColor" d="M14.5 5.5l3.8-1 3.2 14.6-3.8 1z"/>',
  next: '<path d="M9 5l7 7-7 7"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  pick: '<path d="M14 4l6 6M12.5 5.5l6 6-9 9H3.5v-6z"/>',
  all: '<rect x="3" y="3" width="7.5" height="7.5" rx="1"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1.2"/><circle cx="4" cy="12" r="1.2"/><circle cx="4" cy="18" r="1.2"/>',
  redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
  fit: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/><rect x="8" y="8" width="8" height="8" rx="1"/>',
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
  get versions() { return store.get("versions", 1); }, set versions(v) { store.set("versions", v); }, // (v3.74 D3, N7: 1 | 2 | 4 each press)
  get costs() { return V.showCosts(); }, set costs(v) { V.store.set("showCosts", !!v); },
  get keep() { return V.keepModel(); }, set keep(v) { V.store.set("keepModel", !!v); },
};

// ---------- the pictures: the project's pictures ----------
const isPic = (n) => n && ["image", "video", "model", "world"].includes(n.type) && n.status === "done" && !!n.url;
const pics = () => V.G.nodes.filter(isPic).sort((a, b) => (b.created || 0) - (a.created || 0));
const KIND = { photo: "Picture", render: "Render", area: "Brush edit", upscale: "Upscaled ×2", video: "Video", model: "3D model", world: "Walk-around" };
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
  if (/^Interrupted\b|page was closed|VizLab was closed/i.test(m)) return new GErr("interrupted", "Google can't finish a picture once VizLab has been closed.");
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
  setSelect("#resImage", c.res || cfg.res); setSelect("#arImage", c.shape || cfg.shape); setSelect("#numImage", String(engOf(V.engines.image).single ? 1 : c.versions || 1)); V.paintVersions && V.paintVersions();
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
// v3.74 (mobile:big:3, M4): no full-screen busy page any more. A job runs in the background: the Result screen shows the
// picture under a sweeping shine while it works, a pill floats over every other screen (tap it: what is working, Cancel),
// and when it lands there is a haptic, a "ready" message with View, and a dot on the Make tab. Several can run at once.
const jobs = []; // { id, stopped, nodes, t0, title, verb, model, note, src, soft, node }
let jobSeq = 0;
const verbOf = (t) => (/^Tweak/i.test(t) ? "Tweaking" : /^Relight/i.test(t) ? "Relighting" : /^Render/i.test(t) ? "Rendering" : /bigger|upscal/i.test(t) ? "Upscaling" : /area/i.test(t) ? "Editing" : /video/i.test(t) ? "Making the video" : /3D|model|walk/i.test(t) ? "Making the 3D model" : "Working");
const clock = (t0) => { const s = Math.max(0, Math.floor((Date.now() - t0) / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
function busyOpen(n, title, model) {
  const j = { id: ++jobSeq, stopped: false, nodes: [], t0: Date.now(), title, verb: verbOf(title), model: engOf(model).name, note: "", src: n, soft: false, node: null };
  jobs.push(j); paintPill(); return j;
}
function busyClose(j) { const i = jobs.indexOf(j); if (i >= 0) jobs.splice(i, 1); pendDrop(j); paintPill(); }
// Cancel: the picture is taken off the project at once; the job itself can't be called back from Google, so when it
// lands it is dropped from History too. (A job a desktop window started only stops being waited for.)
function cancelJob(j) {
  if (!j || j.stopped) return;
  j.stopped = true;
  const onIt = cur === "result" && rPend === j;
  if (j.soft) { busyClose(j); if (onIt) back(); return say("It carries on: it appears in the project when it's ready.", 4500); }
  const ids = j.nodes.map((n) => n.id), jobIds = j.nodes.map((n) => n.jobId).filter(Boolean);
  if (ids.length) { V.removeNodes(ids); V.changed(); }
  busyClose(j); say("Stopped. Nothing was saved."); haptic();
  jobIds.forEach(forget);
  if (onIt) back();
}
async function forget(id) {
  for (let i = 0; i < 120; i++) {
    try { const r = await V.api("status", { ids: [id] }); const s = r.jobs[0]; if (!s || s.status === "done" || s.status === "error") break; } catch (e) { break; }
    await sleep(2000);
  }
  try { await V.api("delete", { id }); } catch (e) {}
}
// until the picture has landed (and, for an area change, been put back through the painted area)
async function waitNode(n, j, keepMask) {
  let raw = null, rt = "", t = 0;
  for (;;) {
    if (j.stopped) return null;
    if (!V.node(n.id)) return null;
    if (n.status === "error") return n;
    if (n.status === "done") {
      if (!keepMask) return n;
      if (raw == null) { raw = n.url; rt = n.thumb || ""; t = Date.now(); }
      // (final, phone-11) finished when the painted-area step has put its picture back (cutout.js protectZones ends with a new
      // thumb), or at once when that step does not run (the shield is off)
      if (n.url !== raw || (n.thumb || "") !== rt || !(V.protectOn && V.protectOn()) || Date.now() - t > 20000) return n;
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
  openPending(j);
  let last = null;
  for (const m of order) {
    if (j.stopped) return;
    j.model = engOf(m).name; paintPill();
    const before = new Set(V.G.nodes.map((n) => n.id));
    let err = null;
    try { await send(m); } catch (e) { err = e; }
    let made = V.G.nodes.filter((n) => !before.has(n.id));
    const mine = made.filter((n) => V.parents(n.id).some((p) => p && p.id === src.id)); if (mine.length) made = mine; // (not another job's picture, made meanwhile)
    if (j.stopped) { if (made.length) { V.removeNodes(made.map((x) => x.id)); V.changed(); made.map((x) => x.jobId).filter(Boolean).forEach(forget); } return; }
    j.nodes = made;
    const n = made[0];
    if (!n || n.status === "error") {
      const msg = (n && n.error) || (err && err.message) || lastErr || "The job couldn't be sent";
      if (made.length) { V.removeNodes(made.map((x) => x.id)); V.changed(); }
      last = errOf(msg);
      if (!["busy", "model", "quota"].includes(last.kind)) break;
      continue;
    }
    // v3.74 D3: every picture of a round (Versions 2 or 4) is kept and waited for; a stand-in model is recorded on each, as
    // the desktop does (n.askedEngine: the hover card and History say which model was asked for)
    made.forEach((x) => { x.phone = Object.assign({}, tag, { model: m }); if (m !== model) x.askedEngine = model; });
    // (N6) a Google job runs from the moment it is sent (local.js submit says "running"); the desktop's poll copies that
    // onto the cards only every 3 s, so the pill and the waiting picture show "Rendering · about N s left" at once
    if (engOf(m).g) { const t = Date.now(); made.forEach((x) => { if (x.jobId && x.status === "queued") { x.status = "running"; x.ranAt = x.ranAt || t; x.sent = x.sent || t; } }); }
    j.node = n; pendAdd(j, n);
    const done = await waitNode(n, j, keepMask);
    if (!done || j.stopped) return;
    if (done.status === "done") {
      const rest = await Promise.all(made.slice(1).map((x) => waitNode(x, j, keepMask)));
      if (j.stopped) return;
      rest.forEach((x) => { if (x && x.status !== "done" && V.node(x.id)) V.removeNodes([x.id]); });
      V.titlesChanged && V.titlesChanged(); // (names by what made them: V.nodeTitle, never a phone label over it)
      V.changed(true);
      if (m !== model) say(`${engOf(model).name} was busy, so ${engOf(m).name} made ${made.length > 1 ? "these" : "this one"}.`);
      return landed(j, done);
    }
    last = errOf(done.error);
    V.removeNodes(made.map((x) => x.id)); V.changed();
    if (!["busy", "model", "quota"].includes(last.kind)) break;
  }
  if (last && last.kind === "busy") last.message = "Google is busy at the moment and every model was tried. Wait a minute and try again.";
  jobFailed(j, last || new GErr("other", "That didn't work."));
}
function failBox(e, n = null) {
  const k = e && e.kind;
  if (k === "interrupted") return n ? stoppedBox([n]) : alertBox("It stopped when VizLab was closed", e.message);
  if (k === "nokey" || k === "badkey" || k === "denied") return alertBox(k === "nokey" ? "No Google key yet" : "The Google key didn't work", e.message + (e.detail ? `\n\nGoogle said: ${e.detail.slice(0, 160)}` : ""), [["Open Settings", () => nav("settings")], ["Close"]]);
  if (k === "quota") return alertBox("Google's limit reached", e.message + "\n\nWait a few minutes and try again. If it keeps happening, the key may need billing or a higher limit." + (e.detail ? `\n\nGoogle said: ${e.detail.slice(0, 160)}` : ""));
  if (k === "busy") return alertBox("Google is busy", e.message);
  if (k === "network") return alertBox("No connection", e.message);
  alertBox("That didn't work", (e && e.message) || String(e));
}
const choiceOf = (n) => n.phone && !n.phone.area && !n.phone.upscale && !n.phone.tweak ? n.phone : { words: (n.retry && n.retry.settings && n.retry.settings.words) || "", keep: cfg.keep };
function cleanChoice(c) { return { presetId: c.presetId || null, fill: Object.assign({}, c.fill || {}), sceneId: c.sceneId || null, words: c.words || "", keep: c.keep == null ? cfg.keep : !!c.keep, tab: c.tab || null, model: c.model || cfg.model, res: c.res || cfg.res, shape: c.shape || cfg.shape, versions: c.versions || cfg.versions }; }

async function doRender(src, c) {
  const choice = cleanChoice(c);
  await syncDesk(choice);
  if (V.hasHoles(V.promptWords())) return alertBox("Fill in the blanks first", "The preset has a blank still to fill in. Tap it to choose.");
  // (the desktop's controls are set again for each try: another render may have been started meanwhile, v3.74)
  await runJob(src, verN1(choice) > 1 ? `Rendering ${verN1(choice)} versions` : "Rendering your picture", choice.model, async (m) => { await syncDesk(choice); V.engines.image = m; try { return await V.makeEditFor(src); } finally { setSelect("#numImage", "1"); } }, Object.assign({}, choice, { name: titleFor(choice) }));
}
const verN1 = (c) => (engOf(c.model).single ? 1 : c.versions || 1);
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
  // (v3.74: Rub out strokes take paint away)
  for (const s of strokes) { const r = Math.max(0.5, s.r * W + (s.erase ? -grow : grow)); x.globalCompositeOperation = s.erase ? "destination-out" : "source-over"; x.lineWidth = 2 * r; x.beginPath(); s.pts.forEach(([u, v], i) => (i ? x.lineTo(u * W, v * H) : x.moveTo(u * W, v * H))); if (s.pts.length === 1) { x.arc(s.pts[0][0] * W, s.pts[0][1] * H, r, 0, 7); x.fill(); } else x.stroke(); }
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
    const settings = { resolution: res, aspect_ratio: "auto", num_images: 1, ...(V.viaGoogle(m) ? { provider: "google", fallback: V.cfg.gFallback !== false } : {}), protect: true, keepMask: maskUrl, words, brush: a.label || words.replace(/[.:,;].*$/, "").split(/\s+/).slice(0, 4).join(" ") }; // (v3.74 D3: named by the brush change, as draw.js runBrush)
    return V.submitJob({ kind: "edit", engine: m, prompt: V.areaPrompt(V.expandRAL(words)), shownPrompt: "[Area] " + words, inputs: [src], extraUrls: [hlUrl], settings, count: 1 }); // (v3.74 D3: no "Changed: …" label: V.nodeTitle names it by the brush change)
  }, { area: true, words, strokes: a.strokes, size: a.size, res, decide: true }, true);
}

// ---------- navigation ----------
let cur = null; const stack = [];
const TABBED = ["home", "projects", "sheets", "library"];
const motion = () => !matchMedia("(prefers-reduced-motion: reduce)").matches;
// v3.74 (mobile:M5): an iOS push: the new screen slides in from the right edge over the old one, which moves a third of
// the way left and dims; Back the other way. 380 ms on iOS's own curve; none with Reduce Motion.
const PUSH = { duration: 380, easing: "cubic-bezier(.32,.72,0,1)" };
let noAnim = false; // (an edge swipe has already moved the screens)
function show(id, dir = 1) {
  const next = $("#" + id), prev = cur && $("#" + cur);
  paintTabs(id);
  if (prev === next) { paintPill(); return; }
  if (!cur) $$(".scr").forEach((s) => { if (s !== next) s.hidden = true; }); // (the page's own markup may show the first screen already)
  next.hidden = false; cur = id; next.querySelector(".body") && dir > 0 && (next.querySelector(".body").scrollTop = 0);
  paintPill();
  const still = noAnim; noAnim = false;
  if (motion() && prev && dir && !still) {
    const top = dir > 0 ? next : prev, under = dir > 0 ? prev : next;
    top.style.zIndex = 3; under.style.zIndex = 1;
    const inA = dir > 0 ? [{ transform: "translateX(100%)" }, { transform: "none" }] : [{ transform: "translateX(-30%)", filter: "brightness(.85)" }, { transform: "none", filter: "brightness(1)" }];
    const outA = dir > 0 ? [{ transform: "none", filter: "brightness(1)" }, { transform: "translateX(-30%)", filter: "brightness(.85)" }] : [{ transform: "none" }, { transform: "translateX(100%)" }];
    next.animate(inA, PUSH);
    const a = prev.animate(outA, Object.assign({ fill: "forwards" }, PUSH));
    a.onfinish = () => { if (cur !== prev.id) prev.hidden = true; a.cancel(); top.style.zIndex = under.style.zIndex = ""; };
  } else if (prev) { prev.hidden = true; prev.style.transform = prev.style.filter = ""; next.style.transform = next.style.filter = ""; }
}
function paintTabs(id) {
  const on = TABBED.includes(id); $("#tabs").hidden = !on; document.body.classList.toggle("tabson", on);
  $$("#tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === id));
  if (id === "home") $("#tabs button[data-tab=home]").classList.remove("dot");
}
const screens = { duel: () => paintDuel(), todo: () => paintTodo(), home: paintHome, history: paintHistory, settings: paintSettings, projects: paintProjects, allpics: paintAll, sheets: paintSheets, library: paintLibrary };
// every push is also a browser history entry, so the system Back (Android, a browser) steps back inside VizLab; the
// screens' own Back goes through history too when it can
let hist = 0;
const pushHist = () => { try { history.pushState({ vl: 1 }, ""); hist++; } catch (e) {} };
function nav(id, ...args) { if (cur && cur !== id) { stack.push(cur); try { history.pushState({ vl: 1 }, ""); hist++; } catch (e) {} } if (screens[id]) screens[id](...args); show(id, 1); }
function doBack() { const to = stack.pop() || "home"; if (screens[to]) screens[to](); show(to, -1); }
function back() { if (hist > 0 && stack.length) history.back(); else doBack(); }
addEventListener("popstate", () => {
  hist = Math.max(0, hist - 1);
  if (!$("#dlg").hidden) return;
  if (!$("#sheet").hidden) return closeSheet();
  if (!$("#pview").hidden) return closeViewer();
  if (LF) return liftClose();
  if (stack.length) doBack();
});
function homeNow() { stack.length = 0; paintHome(); show("home", -1); }
function tab(id) { stack.length = 0; if (screens[id]) screens[id](); show(id, 0); }
$$(".back").forEach((b) => { b.innerHTML = icon("back"); b.onclick = back; });
for (const id of ["pHome", "rHome", "tHome", "mHome"]) { $("#" + id).innerHTML = icon("home"); $("#" + id).onclick = homeNow; }
// v3.74 (mobile:M12): an outline icon, a filled one (and a bar above the name) for the chosen tab; tapping the tab you are
// on scrolls it back to the top
const TAB_ICON = { home: "sparkle", projects: "folder", sheets: "sheets", library: "library" };
$$("#tabs button").forEach((b) => {
  b.querySelector(".ti").outerHTML = icon(TAB_ICON[b.dataset.tab], "i o") + icon(TAB_ICON[b.dataset.tab] + "F", "i f");
  b.onclick = () => { if (cur === b.dataset.tab) { const bd = $("#" + cur + " .body"); if (bd) bd.scrollTo({ top: 0, behavior: motion() ? "smooth" : "auto" }); return; } tab(b.dataset.tab); };
});

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
// (fix A3-5: a job the phone is following tells its own failure, so the desktop's "Render failed: … Press Try again" is
// not passed on, nor is a job stopped by the app closing; any other red message loses the PC's "Press Try again", as the
// phone has no such button)
const jobFail = (m) => /^[^:]{0,60}\b(failed|Couldn't send)\b|Stopped when VizLab was closed|page was closed|^Interrupted\b/i.test(m);
V.toast = (msg, err = false, ms, o) => {
  try { deskToast(msg, err, ms, o); } catch (e) {}
  if (!err) { if (Date.now() < relayT && msg) { let t = String(msg); try { t = phoneWords(t); } catch (e) {} say(t, 4500); } return; }
  lastErr = String(msg);
  if (/Stopped when VizLab was closed|page was closed|^Interrupted\b/i.test(lastErr) || (jobs.length && jobFail(lastErr))) return;
  let t = lastErr; try { t = phoneWords(t); } catch (e) {} // (phoneWords is defined further down)
  say(t.replace(/\s*Press Try again to make it again\.?/g, "").replace(/\bPress Try again\b/g, "Try again"), 6000);
};
let lastErr = "";
let relayT = 0; // (v3.74 D3: while a desktop action the phone started finishes, its plain message is shown too)
const relay = (ms = 4000) => { relayT = Date.now() + ms; };

// ---------- bottom sheet ----------
let sheetDone = null;
function openSheet(title, { tall = false, top = null, body, done = null, doneLabel = "Done" }) {
  $("#shTitle").textContent = title; $("#shDone").textContent = doneLabel; const tp = $("#shTop"); tp.innerHTML = ""; if (top) tp.append(top);
  const b = $("#shBody"); b.innerHTML = ""; b.append(body); b.scrollTop = 0;
  const s = $("#sheet"), sh = $("#shade"); s.classList.toggle("tall", tall); s.classList.remove("half"); s.style.transform = ""; sheetDone = done;
  s.hidden = sh.hidden = false; requestAnimationFrame(() => requestAnimationFrame(() => { s.classList.add("on"); sh.classList.add("on"); haptic(); }));
}
function closeSheet() {
  const s = $("#sheet"), sh = $("#shade"); if (s.hidden) return;
  s.classList.remove("on"); sh.classList.remove("on"); s.style.transform = ""; const d = sheetDone; sheetDone = null;
  setTimeout(() => { if (!s.classList.contains("on")) { s.hidden = sh.hidden = true; } }, 300);
  d && d();
}
const sheetOpen = () => !$("#sheet").hidden && $("#sheet").classList.contains("on");
$("#shDone").onclick = closeSheet; $("#shade").onclick = closeSheet;
// v3.74 (mobile:M21): pulled down from anywhere once its list is at the top (or by the handle and title); a quick flick
// closes it; a tall sheet first settles at about half height; past the top it gives a little (rubber band)
(() => { let d = null; const s = $("#sheet"), body = $("#shBody");
  // touch events, so a pull at the top of the list can be taken from the page's own scrolling (preventDefault)
  const start = (x, y, target) => {
    const onHead = !!target.closest(".grab,.shead") && !target.closest("button");
    if (!onHead && target.closest("input,textarea,select,.seg,.chips,.crow")) return;
    d = { y0: y, x0: x, t: performance.now(), y: 0, v: 0, go: onHead, top: !body.contains(target) || body.scrollTop <= 0 };
  };
  const move = (x, y, e) => {
    if (!d) return;
    const dy = y - d.y0;
    if (!d.go) {
      if (!d.top || body.scrollTop > 0 || Math.abs(x - d.x0) > Math.abs(dy)) { d = null; return; }
      if (dy < 8) { if (dy < -4) d = null; return; }
      d.go = true;
    }
    if (e && e.cancelable) e.preventDefault();
    const now = performance.now(); d.v = (dy - d.y) / Math.max(1, now - d.t); d.t = now; d.y = dy;
    s.style.transition = "none";
    s.style.transform = `translateY(${dy >= 0 ? dy + (s.classList.contains("half") ? s.offsetHeight * 0.45 : 0) : -Math.pow(-dy, 0.7)}px)`;
  };
  const end = () => {
    const D = d; d = null; if (!D || !D.go) return;
    s.style.transition = ""; s.style.transform = "";
    const H = s.offsetHeight, half = s.classList.contains("half"), at = D.y + (half ? H * 0.45 : 0);
    if (D.v > 0.6 || at > H * 0.72) return closeSheet();
    if (s.classList.contains("tall") && at > H * 0.22) { s.classList.add("half"); haptic(); } else s.classList.remove("half");
  };
  s.addEventListener("touchstart", (e) => { if (e.touches.length === 1) start(e.touches[0].clientX, e.touches[0].clientY, e.target); else d = null; }, { passive: true });
  s.addEventListener("touchmove", (e) => { if (e.touches.length === 1) move(e.touches[0].clientX, e.touches[0].clientY, e); }, { passive: false });
  s.addEventListener("touchend", end); s.addEventListener("touchcancel", end);
  // a mouse (the handle and the title only)
  s.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse" || !e.target.closest(".grab,.shead") || e.target.closest("button")) return; start(e.clientX, e.clientY, e.target); });
  addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") move(e.clientX, e.clientY, null); });
  addEventListener("pointerup", (e) => { if (e.pointerType === "mouse") end(); });
})();

// ---------- welcome ----------
function paintWelcome() {
  $("#wKey").value = ""; $("#wStatus").textContent = ""; $("#wStatus").className = "status";
  // v3.72: the key (and settings, catalogue, projects) from Google Drive, when VizLab is already used on a PC
  const di = V.drive ? V.drive.info() : null, can = !!(di && !di.why && !di.on);
  $("#wDrive").hidden = !can; $("#wDriveStatus").textContent = ""; $("#wDriveStatus").className = "status";
  $("#wSave").className = can ? "btn sec" : "btn pri cl"; // (v3.74 M19: one amber button: Drive first when it can bring the key)
  $("#wPaste").hidden = !(navigator.clipboard && navigator.clipboard.readText);
  if (can) V.drive.preload();
}
$("#wPaste").onclick = async () => { try { const t = (await navigator.clipboard.readText()).trim(); if (t) { $("#wKey").value = t; haptic(); } else say("Nothing to paste: copy the key first."); } catch (e) { say("Couldn't paste: long-press the box and choose Paste."); } };
const welcomeDone = () => { stack.length = 0; paintHome(); show("home", 1); a2hsHint(); };
$("#wDriveBtn").onclick = async () => {
  const b = $("#wDriveBtn"), s = $("#wDriveStatus"); b.disabled = true; s.className = "status"; s.textContent = "Connecting to Google Drive…";
  try { await V.drive.connect(); } catch (e) { s.className = "status bad"; s.textContent = e.message; b.disabled = false; return; }
  b.disabled = false;
  if (cfg.key) { s.className = "status ok"; s.textContent = "Your key came from your Google Drive."; setTimeout(welcomeDone, 600); }
  else { s.className = "status"; s.textContent = V.drive.keys() ? "Connected. No key was in your Drive yet: paste it below once." : "Connected. Bringing keys to other devices is switched off on the PC, so paste the key below."; $("#wDriveBtn").hidden = true; $("#wSave").className = "btn pri cl"; }
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
// (v3.74 M18: no History clock in the header: it repeated "See all" and Projects › All pictures)
$("#hSet").innerHTML = icon("gear");
$("#hSet").onclick = () => nav("settings"); $("#hAll").onclick = $("#hAll2").onclick = () => nav("history");
$("#hProj").onclick = () => tab("projects");
$("#bCam .bi").innerHTML = icon("camera"); $("#bLib .bi").innerHTML = icon("photos");
for (const [id, cam] of [["fCam", true], ["fLib", false]]) $("#" + id).addEventListener("change", (e) => { const f = e.target.files[0]; e.target.value = ""; addFile(f, cam); });
const when = (t) => { const d = new Date(t), now = new Date(); const hm = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }); return d.toDateString() === now.toDateString() ? "Today " + hm : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + " " + hm; };
const projName = () => (V.project.name === "unsaved" ? "Phone pictures" : V.project.name);
let cardTap = () => false; // (v3.74 D3: History's Select mode takes the tap)
function card(n, i, onDel, cls = "card") {
  const k = kindOf(n);
  const c = h("button", { class: cls, style: `animation-delay:${Math.min(i, 8) * 30}ms`, onclick: (e) => { if (e.target.closest(".del")) return; if (cardTap(n, c)) return; openPic(n); } },
    n.thumb || n.poster || n.type === "image" ? smallImg(n, "th") : h("span", { class: "th", style: "display:grid;place-items:center;color:var(--acc)", html: icon(n.type === "video" ? "video" : "cube") }),
    h("span", { class: "kind" + (k !== "photo" ? " r" : "") }, KIND[k]),
    h("span", { class: "cap" }, V.titleEl ? V.titleEl(n, "b") : h("b", {}, V.nodeTitle(n)), h("small", {}, when(n.created) + (k !== "photo" && resText(n) ? " · " + resText(n) : ""))));
  if (onDel) c.append(h("span", { class: "del", role: "button", "aria-label": "Delete", onclick: (e) => { e.stopPropagation(); onDel(n); } }, h("span", { html: icon("trash") })));
  longPress(c, () => picSheet(n));
  return c;
}
// v3.74 (mobile:M23): grids show a 360 px copy of the picture (made once, kept for the session), not the 1024 px one
const smallCache = new Map();
function smallImg(n, cls) {
  const src = n.thumb || n.poster || n.url, key = n.id + ":" + (src || "").length;
  const img = h("img", { class: cls, alt: "", loading: "lazy", decoding: "async" });
  if (smallCache.has(key)) { img.src = smallCache.get(key); return img; }
  img.src = src;
  if (src && /^(data:image|blob:)/.test(src)) {
    (async () => {
      try {
        const i = await loadImgEl(src); if (Math.max(i.naturalWidth, i.naturalHeight) <= 420) { smallCache.set(key, src); return; }
        const c = drawFit(i, 360), b = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.85)); if (!b) return;
        const u = URL.createObjectURL(b); smallCache.set(key, u); if (img.isConnected || !img.complete) img.src = u;
      } catch (e) {}
    })();
  }
  return img;
}
function paintHome() {
  $("#hProj").innerHTML = icon("folder") + `<span>Project: <b>${esc(projName())}</b></span><span class="chev" style="flex:none;width:10px;height:10px;border:solid var(--mute);border-width:2px 2px 0 0;transform:rotate(45deg);margin-right:6px"></span>`;
  const all = pics(), list = all.slice(0, 6), g = $("#hRecent"); g.innerHTML = "";
  // v3.74 (mobile:M11): a returning user sees Continue first (the latest 8, big), the starts folded into one row of three
  const back2 = all.length > 0;
  $("#home").classList.toggle("returning", back2);
  $("#hCont").hidden = !back2; $("#hRecentBox").hidden = back2;
  const cr = $("#hContRow"); cr.innerHTML = "";
  if (back2) all.slice(0, 8).forEach((n, i) => cr.append(card(n, i, null, "crcard")));
  paintAway();
  $("#hAll").hidden = !list.length;
  if (!list.length) { g.style.display = "block"; g.append(h("div", { class: "empty" }, h("b", {}, "Nothing here yet"), "Your pictures and renders will appear here, kept on this phone.")); }
  else { g.style.display = ""; list.forEach((n, i) => g.append(card(n, i))); }
  a2hsHint();
}
$("#bMore .bi").innerHTML = icon("more");
$("#bMore").onclick = () => sheetRows("More ways to start", [
  ["sheets", "Open a file", "A PDF drawing or a picture from Files", () => $("#fFile").click(), "", true], // (at once: iPhone opens a file box only straight from a tap)
  ["text", "From words", "A new picture from a description", () => newFromWords(null)],
  ["search", "Find", "Any tool or picture", () => $("#bFind").click()],
]);
const openPic = (n) => (n.type !== "image" ? openMedia(n) : kindOf(n) === "photo" ? openTodo(n) : openResult(n));

// ---------- your picture: choose what to make ----------
let C = null, pRec = null;
function openPicture(n, choice = null, fresh = false) {
  if (n && V.node(n.id)) V.setSel([n.id]);
  pRec = n;
  C = cleanChoice(Object.assign({ keep: cfg.keep }, choice || {}));
  if (choice && choice.fill) C.fill = Object.assign({}, choice.fill);
  $("#pImg").src = n.url; $("#pTitle").textContent = n.label === "Photo" ? "Your photo" : "Your picture"; $("#pWords").value = C.words;
  paintPicture(); requestAnimationFrame(growWords);
  if (fresh) { stack.length = 0; stack.push("home"); pushHist(); show("pic", 1); } else nav("pic");
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
  paintVers(); paintDoes(); paintEvery();
}
// v3.74 D3 (N7): Versions 1 | 2 | 4 beside Render (a model that makes one at a time shows 1 only, saying why)
const verN = () => (engOf(cfg.model).single ? 1 : C && C.versions ? C.versions : 1);
function paintVers() {
  const seg = $("#pVerSeg"), single = !!engOf(cfg.model).single; seg.innerHTML = "";
  [1, 2, 4].forEach((v) => seg.append(h("button", { type: "button", class: verN() === v ? "on" : "", disabled: single && v > 1, "aria-pressed": String(verN() === v), "aria-label": `${v} version${v > 1 ? "s" : ""} each time`, onclick: () => { C.versions = v; cfg.versions = v; haptic(); paintVers(); paintDoes(); } }, String(v))));
  $("#pVers").title = single ? `${engOf(cfg.model).name} makes one version at a time` : "";
}
const briefNote = (id) => (SET.brief.has(id) ? "A drawing brief: used on its own, without a scene" : SET.design.has(id) ? "A design change: your building can change" : SET.camera.has(id) ? "Moves the camera to a new viewpoint" : "Preset");
// what Render will do, and the words it sends: from the desktop (V.lockState, V.previewEdit), for these choices
let pv = 0;
async function paintDoes() {
  const my = ++pv, c = Object.assign({}, C, { model: cfg.model, res: cfg.res, shape: cfg.shape }), n = pRec;
  const nv = verN();
  $("#pGoT").textContent = nv > 1 ? `Render ${nv} versions` : "Render";
  $("#pCost").textContent = cfg.costs ? `~${money(cost(cfg.model, cfg.res, 1) * nv)} · ${via(cfg.model)} · ${cfg.res}` : `${engOf(cfg.model).name} · ${cfg.res}`;
  let prompt;
  try { prompt = await preview(n, c); } catch (e) { console.warn("preview", e); return; }
  if (my !== pv) return;
  const st = V.lockState(n, V.promptText()), p = C.presetId && P[C.presetId], sc = sceneOf(C.sceneId);
  const rp = V.renderItPreset(), based = !!rp && prompt.includes(rp.p) && !boxText(C).includes(rp.p);
  const what = based && !p && !C.words.trim() ? `<b>Photoreal render</b> (${esc(rp.name)})` : based ? `<b>Photoreal render</b> + your choices` : p && SET.brief.has(C.presetId) ? `<b>${esc(p.n)}</b>` : sc ? `<b>${esc(sc.name)}</b>` : `<b>${esc(p ? p.n : "Your words")}</b>`;
  const k = st ? st.kind : "off";
  const lk = k === "off" ? '<span class="lockchip off"><i></i>camera may change</span>' : k === "design" ? '<span class="lockchip mv"><i></i>design change, not locked</span>' : k === "geometry" ? '<span class="lockchip mv"><i></i>new viewpoint, same building</span>' : '<span class="lockchip"><i></i>keeps building<span class="kcam"> and camera</span></span>'; // (final, phone-10: shortened as the switch is on an iPhone SE)
  $("#pDoes").innerHTML = `${what} · ${lk}`;
  $("#pPrompt").textContent = prompt;
}
let wordsT = 0;
$("#pKeep").onclick = (e) => { if (e.target.closest(".info")) return; C.keep = !C.keep; cfg.keep = C.keep; haptic(); paintPicture(); };
$("#pKeepInfo").innerHTML = icon("info"); // (the explanation, behind (i): v3.74 M24)
$("#pKeepInfo").onclick = () => alertBox("Keep building & camera", "For SketchUp and Revit views: the render keeps your building and your camera exactly as they are.\n\nTurn it off for a photo you want re-imagined more freely.");
// v3.74 (mobile:M22): the words box grows as you type; Return renders (Shift+Return for a new line)
const autoGrow = (ta, max = 180) => { const f = () => { ta.style.height = "auto"; ta.style.height = Math.min(max, ta.scrollHeight + 2) + "px"; }; ta.addEventListener("input", f); return f; };
const growWords = autoGrow($("#pWords"));
const enterGo = (ta, go) => ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); go(); } });
enterGo($("#pWords"), () => $("#pGo").click());
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
  // (v3.74 M16: equal buttons with short labels)
  const tools = h("div", { class: "row sctools" },
    h("button", { class: "btn sec", onclick: () => builder(() => V.openEnv(null, tb)) }, "Build your own…"),
    C.sceneId ? h("button", { class: "btn sec", onclick: () => builder(() => V.adjustScene()) }, "Adjust…") : null,
    h("button", { class: "btn sec", onclick: () => builder(() => V.openScenePictures()) }, "Examples…"));
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
let rRec = null, rFrom = null, rDim = null, rFromDim = null, rPend = null;
const rWait = (on) => { // the Result screen while a job works (v3.74 big:3) or with its picture
  $("#rCmp").classList.toggle("wait", on); $("#rPend").hidden = !on;
  ["#rSaveRow", "#result .acts", "#rMore", "#result .more"].forEach((s) => ($(s).hidden = on));
  if (on) { $("#rPager").hidden = true; ["#rTweak", "#rDecide"].forEach((s) => { const e = $(s); if (e) e.hidden = true; }); } // (no tweak of the source while its job is still working)
};
async function openResult(n, fresh = false) {
  if (V.node(n.id)) V.setSel([n.id]);
  rRec = n; rFrom = parentOf(n); rPend = null; rWait(false); paintPill();
  try { rDim = await dimsOf(n); } catch (e) { rDim = { w: 4, h: 3 }; }
  const k = kindOf(n);
  $("#rTitle").textContent = KIND[k] || "Picture";
  paintCompare(); paintMeta(); paintPager(); paintStrip(); paintTweakRow(); paintDecide();
  $("#rSave").innerHTML = icon("save") + "<span>Save to Photos</span>"; $("#rShare").innerHTML = icon("share");
  $("#rAgain").innerHTML = icon("again") + `<span>${k === "upscale" ? "Upscale again" : k === "area" ? "Edit again" : "Render again"}</span><small>${rFrom ? "From the original, same choices" : "The original was deleted"}</small>`;
  $("#rAgain").disabled = !rFrom || k === "photo";
  $("#rArea").innerHTML = icon("brush") + "<span>Brush</span><small>Paint over a part, say what goes there</small>";
  const vn = V.versionsOf ? V.versionsOf(n).length : 0; $("#rBest").hidden = vn < 2;
  $("#rBest").innerHTML = icon("pickbest") + `<span>Pick the best</span><small>${vn} versions, two at a time</small>`;
  $("#rPresent").innerHTML = icon("present") + `<span>Present</span><small>Full screen, swipe through</small>`;
  $("#rUp").innerHTML = icon("up") + `<span>Upscale ×2</span><small>${Math.max(rDim.w, rDim.h) >= 3840 ? "Already 4K" : "Sharper 4K copy" + (cfg.costs ? " · ~" + money(cost(cfg.model, "4K")) : "")}</small>`;
  $("#rChoices").innerHTML = icon("sliders") + `<span>${k === "render" ? "Change choices" : "New render"}</span><small>${k === "render" ? "Scene, preset, words" : "Start from this picture"}</small>`;
  $("#rDel").innerHTML = icon("trash") + "<span>Delete this picture</span>";
  $("#rMore").innerHTML = icon("grid") + "<span>More things to do</span>";
  nav("result");
}
function costOf(n) {
  const r = n.retry; if (!r || !r.settings) return (n.phone && n.phone.cost) || 0;
  try { return D.googleCost(n.engine, r.settings, (r.images || []).length) || 0; } catch (e) { return 0; }
}
function paintMeta() {
  const n = rRec, k = kindOf(n), c = n.phone || {};
  const sub = V.nodeSub(n);
  const what = k === "render" ? sub || "Photoreal render" : k === "area" ? `“${c.words || sub}”` : k === "upscale" ? "The same picture, sharper and bigger" : "";
  // v3.74 (mobile:M20): two chips (model and size, when), the rest in an Info sheet
  const res = resText(n) || (rDim ? resOf(rDim) : "");
  const chips = [[n.engine ? V.engineName(n.engine) : "", res].filter(Boolean).join(" · "), when(n.created)].filter(Boolean);
  $("#rMeta").innerHTML = "";
  $("#rMeta").append(h("b", {}, V.nodeTitle(n)), what ? h("span", { class: "what" }, what) : null,
    h("span", { class: "rchips" }, chips.map((c) => h("span", { class: "rchip" }, c)), h("button", { class: "rchip ri", "aria-label": "Details", onclick: () => infoSheet(n) }, h("span", { html: icon("info"), style: "display:contents" }), "Info"),
      // v3.74 D3 (N9): this view's pick and the project's hero, a tap each (the same marks as Review on the PC)
      pickable(n) ? h("button", { class: "rchip ri mk" + (n.pick ? " on" : ""), "aria-pressed": String(!!n.pick), onclick: () => { togglePick(n); paintMeta(); paintStrip(); } }, h("span", { html: icon(n.pick ? "check" : "pickbest"), style: "display:contents" }), n.pick ? "Picked" : "Pick") : null,
      pickable(n) ? h("button", { class: "rchip ri mk" + (n.hero ? " on" : ""), "aria-pressed": String(!!n.hero), onclick: () => { toggleHero(n); paintMeta(); paintStrip(); } }, h("span", { html: icon("star"), style: "display:contents" }), n.hero ? "Hero" : "Make hero") : null));
}
function infoSheet(n) {
  const k = kindOf(n), row = (a, b) => (b ? h("div", { class: "irow" }, h("span", {}, a), h("b", {}, b)) : null);
  const words = V.nodePrompt ? V.nodePrompt(n) : "";
  openSheet("Details", { body: h("div", { class: "dinfo" },
    row("Name", V.nodeTitle(n)), row("What", V.nodeSub(n) || KIND[k]), row("AI model", n.engine && V.engineName(n.engine) + (n.askedEngine && n.askedEngine !== n.engine ? ` (${V.engineName(n.askedEngine)} was busy)` : "")),
    row("Size", rDim ? `${rDim.w} × ${rDim.h} px` : ""), row("Made", when(n.created)), row("Cost", cfg.costs && costOf(n) ? "~" + money(costOf(n)) : ""),
    words ? h("details", { class: "sent" }, h("summary", {}, "The words sent to the AI"), h("pre", {}, words)) : null) });
}
// the other versions made from the same picture (render again makes siblings), newest last: a swipe or the arrows
// (v3.74 D3, N3: the same set as the desktop's film strip, V.versionSet: the view and everything made from it, less the view)
const versions = (n) => { const l = (V.versionSet ? V.versionSet(n) : [n]).filter((x) => isPic(x) && x.type === "image" && kindOf(x) !== "photo"); return l.includes(n) ? l : [n]; };
function paintPager() {
  const l = versions(rRec), i = l.indexOf(rRec), P = $("#rPager"); P.hidden = l.length < 2;
  if (l.length < 2) return;
  const D = $("#rDots"); D.innerHTML = "";
  D.append(h("span", { class: "vtext" }, `Version ${i + 1} of ${l.length}`), h("span", { class: "dots" }, l.slice(0, 12).map((x, k) => h("i", { class: k === i ? "on" : "" }))));
  $("#rPrev").disabled = i <= 0; $("#rNext").disabled = i >= l.length - 1;
}
const stepVersion = async (d, swiped = false) => {
  const l = versions(rRec), i = l.indexOf(rRec) + d; if (i < 0 || i >= l.length) return; haptic();
  await openResult(l[i]);
  const z = $("#rCmp .cz"); if (z && motion()) z.animate([{ transform: `translateX(${d * (swiped ? 100 : 30)}%)`, opacity: swiped ? 1 : 0.3 }, { transform: "none", opacity: 1 }], { duration: 280, easing: "cubic-bezier(.2,.8,.2,1)" });
};
$("#rPrev").innerHTML = icon("back"); $("#rNext").innerHTML = icon("next");
$("#rPrev").onclick = () => stepVersion(-1); $("#rNext").onclick = () => stepVersion(1);
let cmpG = null; // the picture's zoom (pinch, double-tap: V.phoneGestures)
function paintCompare() {
  const box = $("#rCmp"), r = rRec; box.innerHTML = "";
  box.style.aspectRatio = `${rDim.w} / ${rDim.h}`;
  const maxH = innerHeight * 0.58, w = Math.min(box.parentElement.clientWidth || innerWidth - 32, maxH * rDim.w / rDim.h); box.style.width = w + "px";
  const z = h("div", { class: "cz" }, h("img", { src: r.url, alt: "After" })); box.append(z);
  if (cmpG) cmpG.reset();
  if (!rFrom) return;
  const bw = h("div", { class: "bw" }, h("img", { src: rFrom.url, alt: "Before" })), hd = h("div", { class: "hd" }, h("span", { class: "knob", html: icon("swap") }));
  z.append(bw, hd); box.append(h("span", { class: "tag l" }, "Before"), h("span", { class: "tag r" }, kindOf(r) === "upscale" ? "4K" : "After"));
  let fNow = 0.5;
  const set = (f) => { f = Math.max(0, Math.min(1, f)); fNow = f; bw.style.clipPath = `inset(0 ${(1 - f) * 100}% 0 0)`; hd.style.left = f * 100 + "%"; };
  let drag = false, sx = 0, sy = 0, decided = false, lp = 0, held = null;
  // (zoomed in, the slider follows the picture: the point under the finger, not the box)
  const at = (e) => { const b = box.getBoundingClientRect(), g = cmpG || { z: 1, x: 0 }; return (e.clientX - b.left - g.x) / (b.width * g.z); };
  // several versions (fix A3-8): a finger drawn sideways away from the slider's handle swipes to the next or previous
  // version, the picture following the finger; on the handle (or with one version) it moves the slider; a tap puts the
  // slider there
  const multi = versions(r).length > 1;
  let sw = null;
  box.onpointerdown = (e) => {
    drag = true; decided = e.pointerType !== "touch"; sx = e.clientX; sy = e.clientY; sw = null;
    const hb = hd.getBoundingClientRect();
    if (multi && e.pointerType === "touch" && Math.abs(e.clientX - (hb.left + hb.width / 2)) > 36) sw = { t: performance.now(), dx: 0 };
    if (decided) { box.setPointerCapture(e.pointerId); set(at(e)); }
    // a long press shows the picture it was made from (v3.74 M20); letting go puts the slider back
    clearTimeout(lp); lp = setTimeout(() => { if (drag && !decided) { held = fNow; sw = null; set(1); haptic(); } }, 450);
  };
  box.onpointermove = (e) => {
    if (!drag) return;
    if (!decided) { if (Math.abs(e.clientX - sx) < 6 && Math.abs(e.clientY - sy) < 6) return; clearTimeout(lp); if (held != null) return; decided = true; if (Math.abs(e.clientY - sy) > Math.abs(e.clientX - sx)) { drag = false; sw = null; return; } box.setPointerCapture(e.pointerId); }
    if (sw) { const l = versions(r), i = l.indexOf(r), dx = e.clientX - sx, end = (dx > 0 && i <= 0) || (dx < 0 && i >= l.length - 1); sw.dx = dx; z.style.transform = `translateX(${end ? dx * 0.3 : dx}px)`; return; }
    set(at(e));
  };
  box.onpointerup = box.onpointercancel = (e) => {
    clearTimeout(lp); if (held != null) { set(held); held = null; drag = false; return; }
    if (sw && decided) {
      const S = sw, d = S.dx < 0 ? 1 : -1, l = versions(r), i = l.indexOf(r) + d, v = Math.abs(S.dx) / Math.max(1, performance.now() - S.t); sw = null; drag = false;
      if (e.type === "pointerup" && i >= 0 && i < l.length && (Math.abs(S.dx) > box.clientWidth * 0.25 || (v > 0.5 && Math.abs(S.dx) > 30))) {
        const a = motion() ? z.animate([{ transform: z.style.transform }, { transform: `translateX(${-d * 100}%)` }], { duration: 180, easing: "cubic-bezier(.4,0,1,1)", fill: "forwards" }) : null;
        const go = () => stepVersion(d, true); if (a) a.onfinish = go; else go();
      } else { const from = z.style.transform; z.style.transform = ""; if (motion() && from) z.animate([{ transform: from }, { transform: "none" }], { duration: 220, easing: "cubic-bezier(.2,.8,.2,1)" }); }
      return;
    }
    if (drag && !decided && e.type === "pointerup") set(at(e)); drag = false; sw = null;
  };
  if (motion()) { const t0 = performance.now(); const step = (t) => { const k = Math.min(1, (t - t0) / 900), e = 1 - Math.pow(1 - k, 3); set(1 - 0.5 * e); if (k < 1 && !drag) requestAnimationFrame(step); }; set(1); requestAnimationFrame(step); } else set(0.5);
}
$("#rSave").onclick = () => saveToPhotos(rRec);
$("#rShare").onclick = () => saveToPhotos(rRec); // (the share sheet: Messages, Mail, AirDrop… as well as Save Image)
$("#rPendStop").onclick = () => cancelJob(rPend);
$("#rAgain").onclick = () => { const n = rRec, k = kindOf(n); if (!rFrom) return; if (n.phone && n.phone.tweak) doTweak(rFrom, n.phone.tweak); else if (k === "render") doRender(rFrom, choiceOf(n)); else if (k === "upscale") doUpscale(rFrom); else if (k === "area" && n.phone && n.phone.strokes) doArea(rFrom, n.phone); };
$("#rArea").onclick = () => openPaint(rRec);
$("#rUp").onclick = () => doUpscale(rRec);
$("#rChoices").onclick = () => { const n = rRec; if (kindOf(n) === "render" && rFrom) openPicture(rFrom, choiceOf(n)); else openPicture(n); };
$("#rDel").onclick = async () => { if (await delPic(rRec)) back(); };
async function delPic(n) {
  if (!(await confirmBox("Delete this picture?", "It goes to Recently deleted (Settings) for 30 days. Pictures already saved to Photos stay there.", "Delete", true))) return false;
  // (v3.74 N15: as the canvas's remove, kept 30 days in Recently deleted, trust.js)
  V.snapshot(); if (V.binPictures) V.binPictures([n]); V.removeNodes([n.id]); V.render(); V.changed(true); say("Deleted"); return true;
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
// v3.74 (mobile:M14): the brush size is a slider on the right edge (radius as a part of the picture's width, shown as a
// ring on the picture while it moves); Paint | Rub out; the picture fits the free height and pinches to zoom (a finger
// still paints, through the zoom, with a loupe above it)
const SIZES = [0.018, 0.035, 0.065]; // (older pictures' "size": small, medium, large)
let A = null; // { rec, strokes, r, erase, cur, d }
let aG = null; // the stage's zoom (V.phoneGestures)
async function openPaint(n) {
  A = { rec: n, strokes: [], r: store.get("brushR", 0.035), erase: false, cur: null, d: await dimsOf(n) };
  $("#aImg").src = n.url; $("#aWords").value = ""; $("#aWords").style.height = "";
  $("#aSize").value = Math.round(A.r * 1000);
  $$("#aMode button").forEach((b) => b.classList.toggle("on", b.dataset.m === "paint"));
  $("#aUndo").innerHTML = icon("undo"); $("#aMenu").innerHTML = icon("more");
  $("#aCost").textContent = cfg.costs ? `~${money(cost(cfg.model, resOf(A.d), 2))} · Google · the rest stays exactly as it is` : "The rest of the picture stays exactly as it is";
  if (!$("#aTools")) $("#aUndo").after(h("button", { class: "tb wide", id: "aTools", onclick: () => openDraw(A.rec) }, h("span", { html: icon("layers"), style: "display:contents" }), h("span", {}, "Tools")));
  nav("paint"); if (aG) aG.reset(); requestAnimationFrame(sizePaint); paintTools();
}
function sizePaint() {
  if (!A || cur !== "paint") return;
  const st = $("#aStage"), zone = $("#aZone"), r = A.d, k = r.w / r.h;
  // (fix A3-2) the zone's real width (the screen less 8 px gutters) and height; the size slider goes on the right edge (56 px
  // off the width) or flat under the picture (60 px off the height), whichever leaves the picture bigger: a wide picture
  // keeps the whole width, a tall one the whole height
  zone.classList.remove("side", "under");
  const W = zone.clientWidth || innerWidth - 16, H = Math.max(160, zone.clientHeight || innerHeight * 0.5);
  const ws = Math.min(W - 56, H * k), wu = Math.min(W, (H - 60) * k), side = ws > wu + 1;
  zone.classList.add(side ? "side" : "under");
  const w = side ? ws : wu;
  st.style.width = w + "px"; st.style.height = (w * r.h) / r.w + "px";
  const c = $("#aCan"), dpr = Math.min(3, devicePixelRatio || 1); c.width = Math.round(w * dpr); c.height = Math.round((w * r.h / r.w) * dpr); drawStrokes();
}
function drawStrokes() {
  const c = $("#aCan"), x = c.getContext("2d"), W = c.width, H = c.height; x.clearRect(0, 0, W, H);
  const m = maskCanvas(A.strokes.concat(A.cur ? [A.cur] : []), W, H);
  x.globalAlpha = 0.5; x.drawImage(m, 0, 0); x.globalCompositeOperation = "source-in"; x.globalAlpha = 1; x.fillStyle = "#FAAF29"; x.fillRect(0, 0, W, H); x.globalCompositeOperation = "source-over";
}
const painted = () => A.strokes.some((s) => !s.erase);
function paintTools() {
  const any = A.strokes.length > 0;
  $("#aUndo").disabled = !any; $("#aGo").disabled = !painted() || !$("#aWords").value.trim();
  $("#aHint").textContent = A.erase ? "Rub out the parts you don't want changed." : any ? "Paint more, or say what should change there." : "Paint over the part to change";
}
(() => {
  const c = $("#aCan"); let id = null;
  const pt = (e) => { const b = c.getBoundingClientRect(); return [Math.max(0, Math.min(1, (e.clientX - b.left) / b.width)), Math.max(0, Math.min(1, (e.clientY - b.top) / b.height))]; };
  c.addEventListener("pointerdown", (e) => { if (!A || id != null) return; id = e.pointerId; try { c.setPointerCapture(id); } catch (er) {} A.cur = { r: A.r, pts: [pt(e)], ...(A.erase ? { erase: true } : {}) }; drawStrokes(); e.preventDefault(); });
  c.addEventListener("pointermove", (e) => { if (e.pointerId !== id || !A.cur) return; const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e]; for (const v of evs.length ? evs : [e]) A.cur.pts.push(pt(v)); drawStrokes(); });
  const end = (e) => { if (e.pointerId !== id) return; id = null; if (A.cur) { A.strokes.push(A.cur); A.cur = null; } drawStrokes(); paintTools(); };
  c.addEventListener("pointerup", end); c.addEventListener("pointercancel", end);
})();
$$("#aMode button").forEach((b) => (b.onclick = () => { A.erase = b.dataset.m === "erase"; $$("#aMode button").forEach((x) => x.classList.toggle("on", x === b)); haptic(); paintTools(); }));
// the size: a ring on the picture shows it while the slider moves
let ringT = 0;
$("#aSize").addEventListener("input", (e) => {
  A.r = +e.target.value / 1000; store.set("brushR", A.r);
  const st = $("#aStage"); let ring = $("#aRing"); if (!ring) { ring = h("span", { id: "aRing", class: "ring" }); st.append(ring); }
  const d = 2 * A.r * st.clientWidth * (aG ? aG.z : 1); ring.style.width = ring.style.height = d + "px"; ring.hidden = false;
  clearTimeout(ringT); ringT = setTimeout(() => (ring.hidden = true), 700);
});
$("#aSize").addEventListener("change", () => haptic());
$("#aUndo").onclick = () => { A.strokes.pop(); drawStrokes(); paintTools(); };
$("#aMenu").onclick = () => sheetRows("Brush", [
  ["trash", "Clear the painting", "Start the area again", () => { A.strokes = []; drawStrokes(); paintTools(); }],
  ["layers", "More tools", "Select, AI select, notes, layers (Draw)", () => openDraw(A.rec)],
  ["fit", "Fit the picture", "Back to the whole picture", () => aG && aG.reset(true)],
]);
$("#aWords").addEventListener("input", paintTools);
autoGrow($("#aWords"), 120); enterGo($("#aWords"), () => $("#aGo").click());
$("#aGo").onclick = () => { const w = $("#aWords").value.trim(); if (!painted()) return say("Paint over the area first."); if (!w) return say("Say what should change in the painted area."); $("#aWords").blur(); doArea(A.rec, { strokes: A.strokes, words: w, size: A.r }); };
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
$("#jNew").innerHTML = icon("plus") + "<span>New</span>"; $("#jNew2").innerHTML = icon("plus") + "<span>New project</span>"; $("#jNew2").hidden = true; // (v3.74 M17: one New button, in the header)
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
    const count = p.stats && p.stats.pictures != null ? p.stats.pictures : on ? pics().length : null;
    const n = count != null ? plural(count, "picture") : "";
    // v3.74 (mobile:M17): the open project shows its latest four pictures; an empty one is a slim row, not a big placeholder
    const four = on ? pics().filter((x) => x.type === "image").slice(0, 4) : [];
    const empty = count === 0 || (!p.thumb && !four.length);
    const saidSaved = p.updated_at ? "Saved on this phone · " + when(Date.parse(p.updated_at)) : "Not saved yet";
    const c = h("button", { class: "pcard" + (on ? " cur" : "") + (empty ? " slim" : ""), style: `animation-delay:${Math.min(i, 8) * 30}ms`, onclick: (e) => { if (e.target.closest(".more3,.savenow")) return; if (p.id) openProject(p.id); else tab("home"); } },
      empty ? h("span", { class: "noth", html: icon("folder") }) : four.length >= 2 ? h("span", { class: "mosaic" + (four.length < 4 ? " m" + four.length : "") }, four.map((x) => smallImg(x, ""))) : p.thumb ? h("img", { class: "th", src: p.thumb, alt: "", loading: "lazy" }) : smallImg(four[0], "th"),
      on && !empty ? h("span", { class: "now" }, "Open now") : null,
      p.drive === "on" || p.drive === "remote" ? h("span", { class: "drv" + (p.drive === "remote" ? " remote" : "") }, p.only ? "In Drive" : "On Drive") : p.only && p.drive === "waiting" ? h("span", { class: "drv wait" }, "Not saved to Drive yet") : null,
      h("span", { class: "cap" }, h("b", {}, p.name), h("small", {}, empty ? (on ? "Open now · " : "") + "No pictures yet · Start one" : [p.drive === "remote" && !p.only ? "not on this phone yet" : "", n, p.drive ? (p.updated_at ? when(Date.parse(p.updated_at)) : "") : saidSaved].filter(Boolean).join(" · ")),
        !p.id ? h("span", { class: "savenow", role: "button", onclick: async (e) => { e.stopPropagation(); const nm = await askBox("Save the project as", projName() === "Phone pictures" ? "" : projName(), "Save"); if (!nm) return; V.renameProject(nm); try { await V.save(); } catch (er) {} paintProjects(); say("Saved on this phone"); } }, "Save now") : null));
    if (p.id) c.append(h("span", { class: "more3", role: "button", "aria-label": "More for " + p.name, html: icon("more"), onclick: (e) => { e.stopPropagation(); projectSheet(p); } }));
    if (p.id) longPress(c, () => projectSheet(p));
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
  // (final, phone-05) every picture of a job (Versions 2 or 4 give one job with several), each its own card under its own name
  js = js.flatMap((j) => { const im = j.outputs.filter((o) => o.type === "image"); return im.length < 2 ? [j] : im.map((o) => Object.assign({}, j, { outputs: [o], _oi: j.outputs.indexOf(o) })); });
  const nodeOfJob = (j) => V.G.nodes.find((n) => n.jobId === j.id && (n.outIndex || 0) === (j._oi || 0)) || null;
  $("#xCount").textContent = js.length ? `${plural(js.length, "picture")}, newest first.` : "";
  if (!js.length) { g.style.display = "block"; g.append(h("div", { class: "empty" }, h("b", {}, "Nothing here yet"), "Renders, edits and upscales appear here.")); return; }
  g.style.display = "";
  xList = js;
  js.forEach((j, i) => {
    const o = j.outputs.find((x) => x.type === "image"), up = V.kindOf(j.kind, j.settings) === "upscale", jn = nodeOfJob(j);
    const c = h("button", { class: "card", style: `animation-delay:${Math.min(i, 8) * 30}ms`, onclick: () => openViewer(j) },
      h("img", { class: "th", src: o.url, alt: "", loading: "lazy", decoding: "async" }),
      h("span", { class: "kind r" }, up ? "Upscaled ×2" : j.settings && j.settings.keepMask ? "Brush edit" : "Render"),
      h("span", { class: "cap" }, h("b", {}, jn && V.nodeTitle ? V.nodeTitle(jn) : (V.historyPrompt(j) || V.engineName(j.engine)).replace(/^\[(Area|Draw|Materials)\] /, "")), h("small", {}, when(Date.parse(j.created_at)) + (j.project ? " · " + j.project : ""))));
    longPress(c, () => sheetRows("Picture", [
      ["save", "Save to Photos", "", () => jobSave(j)], ["share", "Share…", "", () => jobSave(j)],
      j.project_id ? ["folder", "Open its project", j.project || "", async () => { await openProject(j.project_id); }] : null]));
    g.append(c);
  });
}
let vJob = null, xList = [];
const jobSave = async (j) => { const o = j.outputs.find((x) => x.type === "image"); let u; try { u = await fullOf(o); } catch (e) { return alertBox("Google Drive", e.message); } const b = await blobOf(u); shareFile(b, `VizLab ${new Date(j.created_at).toISOString().slice(0, 10)}.${/png/.test(b.type) ? "png" : "jpg"}`); };
// v3.74 (mobile:big:2): swipe down closes the picture, left and right go through All pictures; pinch and double-tap zoom
function closeViewer() {
  const v = $("#pview"); if (v.hidden) return;
  if (!motion()) { v.hidden = true; return; }
  const a = v.animate([{ opacity: 1, transform: v.style.transform || "none" }, { opacity: 0, transform: "translateY(40%)" }], { duration: 220, easing: "ease-in" });
  a.onfinish = () => { v.hidden = true; v.style.transform = ""; };
}
$("#vClose").innerHTML = icon("x"); $("#vClose").onclick = closeViewer;
$("#vSave").innerHTML = icon("save") + "<span>Save to Photos</span>";
const fullOf = async (o) => (o && o.ref && V.drive && V.drive.fullUrl ? V.drive.fullUrl(o) : o.url); // (v3.73: a picture kept only in Google Drive: its preview in the list, the picture fetched here)
$("#vSave").onclick = () => jobSave(vJob);
$("#vOpen").onclick = () => { const id = vJob.project_id; $("#pview").hidden = true; if (id) openProject(id); };
let vG = null;
async function openViewer(j) {
  vJob = j; const o = j.outputs.find((x) => x.type === "image");
  if (vG) vG.reset();
  $("#vImg").src = o.url;
  if (o.ref) fullOf(o).then((u) => { if (vJob === j) $("#vImg").src = u; }, () => {}); $("#vTitle").textContent = V.kindOf(j.kind, j.settings) === "upscale" ? "Upscaled ×2" : "Render";
  $("#vMeta").textContent = [V.historyPrompt(j), V.engineName(j.engine), when(Date.parse(j.created_at))].filter(Boolean).join(" · ");
  let has = false; try { has = !!j.project_id && (((await V.api("project_list")).projects || []).some((p) => p.id === j.project_id)); } catch (e) {}
  $("#vOpen").hidden = !has; $("#vOpen").innerHTML = icon("folder") + `<span>Open its project${j.project ? ": " + esc(j.project) : ""}</span>`;
  $("#pview").hidden = false;
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
    h("button", { class: "btn bad", disabled: !list.length, onclick: async () => { if (await confirmBox("Clear this project's pictures?", `All ${list.length} pictures in ${projName()} go to Recently deleted (Settings) for 30 days. Pictures saved to Photos stay there.`, "Clear all", true)) { if (V.binPictures) V.binPictures(list); V.removeNodes(list.map((n) => n.id)); V.render(); V.changed(true); say("Pictures cleared"); paintSettings(); } } }, "Clear this project's pictures")));
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
  const ready = startMs(); // (v3.74 M23: how long the app took to be ready, this time)
  B.append(h("p", { class: "ver" }, `Clarman VizLab Mobile · version ${VERSION}` + (ready ? ` · ready in ${(ready / 1000).toFixed(1)} s` : "")), h("p", { class: "ver", style: "margin-top:0" }, V.drive && V.drive.on() ? (V.drive.keys() ? "Your key, settings and projects are also kept in your own Google Drive." : "Your projects are also kept in your own Google Drive; your key stays on this phone.") + " Pictures go to Google's AI only when you press Render, Edit or Upscale." : "Your key and pictures stay on this phone. Pictures go only to Google, when you press Render, Edit or Upscale."));
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
// v3.74 (mobile:M8): a card in Home's own page (never over other screens), at most once a week, and not once a render
// has been made from the Home Screen app or the hint was closed
function a2hsHint() {
  const wk = 7 * 864e5, last = store.get("a2hsSeen", 0), rendered = V.G.nodes.some((n) => isPic(n) && kindOf(n) !== "photo");
  const off = standalone() || !isIOS() || store.get("a2hsDone", false) || (rendered && store.get("a2hsShown", 0) > 0) || (Date.now() - last > 3e5 && Date.now() - last < wk);
  $("#a2hs").hidden = off; if (off) return;
  if (Date.now() - last > 3e5) { store.set("a2hsSeen", Date.now()); store.set("a2hsShown", store.get("a2hsShown", 0) + 1); }
  $("#a2hsX").innerHTML = icon("x");
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
// (v3.74: in the background like a render: o.quiet = followed again after the app was reopened, so no screen opens)
async function follow(n, title = "Working on it", o = {}) {
  if (n.status === "done" && n.url) return o.quiet ? null : openAny(n, true);
  const src = parentOf(n) || n;
  const j = busyOpen(src, title, V.engines.image); j.nodes = []; j.node = n;
  j.model = n.engine ? V.engineName(n.engine) : "VizLab";
  if (n.type === "video" || n.kind === "video" || n.kind === "3d" || n.kind === "world") j.note = "Videos and 3D models take a few minutes.";
  j.soft = true; // (Cancel here only stops waiting: the job carries on and lands in the project)
  pendAdd(j, n);
  if (!o.quiet) openPending(j); else paintPill();
  for (;;) {
    if (j.stopped) return;
    if (!V.node(n.id)) { busyClose(j); if (cur === "result" && rPend === j) back(); return; }
    if (n.status === "error") return jobFailed(j, errOf(n.error));
    if (n.status === "done" && n.url) { await sleep(400); return landed(j, n); }
    await sleep(400);
  }
}
const openAny = (n, fresh) => (n.type === "image" ? (kindOf(n) === "photo" ? openTodo(n, fresh) : openResult(n, fresh)) : openMedia(n, fresh));
// the desktop's Draw / Touch-ups viewer, lifted full-screen under a phone header (and, for Make, a phone footer)
// v3.74 (mobile:big:1, M1, M18): the phone editor shell. The desktop code still does all the work (draw.js, matbucket.js,
// touchup.js, V.bucketMode); only the layout is the phone's:
//   top     Back, the screen's name, ••• (Preview / Compare / Draw / Touch-ups, Save as new picture, Hand, Zoom, gestures)
//   middle  the picture, everything between the header and the dock (pinch to zoom, two fingers to move, a loupe while
//           painting: V.phoneGestures); the tool's help as a pill on the picture, in phone words
//   dock    one sideways row of labelled 64 px tiles (Draw: the desktop's own tool buttons, restyled; Materials: Paint, All
//           of this colour, Pick up, Rub out, Materials list; Touch up: Paint in, Paint out, Original…), Settings opens the
//           tool's options (tolerance, size, hardness…) in a panel over the picture
//   foot    your words and one amber action (Edit / Render with these materials / Save touch-up), Done beside it
let LF = null; // { node, before, closing, mode, kind, title }
function liftOpen(n, { title, mode, kind = null, after = null }) {
  if (LF) liftClose(true);
  kind = kind || (mode === "touch" ? "touch" : mode === "compare" ? "compare" : "draw");
  LF = { node: n, before: new Set(V.G.nodes.map((x) => x.id)), mode, kind, title, touch0: touchSnap(n) };
  closeSheet();
  V.setSel([n.id]);
  const head = h("div", { id: "lifthead", "data-phone": "1" }, h("button", { class: "ib", "aria-label": "Back", html: icon("back"), onclick: () => liftClose() }), h("h2", {}, title), h("button", { class: "ib", "aria-label": "More", html: icon("more"), onclick: liftMenu }));
  deskHost.prepend(head);
  deskHost.classList.add("lift"); deskHost.classList.remove("optson", "listoff"); $("#tabs").hidden = true;
  V.setViewerMode(mode);
  liftShell();
  try { history.pushState({ vl: 1 }, ""); hist++; } catch (e) {} // (the system Back closes the editor)
  requestAnimationFrame(() => { after && after(); liftSize(); });
}
const liftSize = () => {
  if (!LF) return; const f = $("#liftfoot"), cb = $("#cmpBar");
  deskHost.style.setProperty("--liftfoot", (f ? f.offsetHeight : 0) + "px");
  deskHost.style.setProperty("--liftdock", LF.kind === "compare" ? (cb && !cb.hidden ? cb.offsetHeight : 0) + "px" : LF.kind === "preview" ? "0px" : "92px");
  // (fix A3-3) a Layers or Materials list open above the dock: the picture fits in the space above it, so every part of
  // it can still be tapped
  const pan = $$("#deskhost #viewer .layers").filter((p) => !p.hidden && p.getClientRects().length > 0);
  deskHost.style.setProperty("--liftlist", (pan.length ? Math.max(...pan.map((p) => p.offsetHeight)) + 8 : 0) + "px");
};
{ const ro = new ResizeObserver(() => LF && requestAnimationFrame(liftSize)); ["#matPanel", "#layersPanel", "#cmpBar"].forEach((s) => $(s) && ro.observe($(s))); }
const phx = (el) => { el.classList.add("phx"); el.dataset.phone = "1"; return el; }; // (a phone tile put into a desktop toolbar; taken out on close)
function tileBtn(ic, label, fn, cls = "") { return h("button", { class: "dt " + cls, type: "button", onclick: fn }, h("span", { html: icon(ic), style: "display:contents" }), h("small", {}, label)); }
const proxyTile = (ic, label, sel) => { const src = $(sel), b = tileBtn(ic, label, () => { if (src && !src.disabled) { src.click(); haptic(); } }); b.disabled = !!(src && src.disabled); return b; };
const toggleOpts = () => { deskHost.classList.toggle("optson"); haptic(); syncDock(); };
function liftShell() {
  const k = LF.kind;
  ["#liftfoot", "#liftdock", "#lifthint"].forEach((s) => $(s) && $(s).remove());
  $$("#deskhost .phx").forEach((e) => e.remove());
  deskHost.dataset.kind = k; deskHost.classList.remove("optson");
  $("#lifthead h2").textContent = LF.title;
  deskHost.append(h("div", { id: "lifthint", "data-phone": "1", hidden: true }));
  if (k === "mats") { const dock = h("div", { id: "liftdock", "data-phone": "1", class: "dock" }); deskHost.append(dock); }
  else if (k === "draw") $("#dtools").append(phx(tileBtn("sliders", "Settings", toggleOpts, "optt")));
  else if (k === "touch") $("#ttools").prepend(phx(tileBtn("photos", "Original", srcSheet, "srct"))), $("#ttools").append(phx(tileBtn("sliders", "Size & flow", toggleOpts, "optt")));
  const foot = k === "touch" ? touchFoot() : k === "compare" || k === "preview" ? liftFoot(null, null, null, "Done")
    : k === "mats" ? liftFoot("Render with these materials", "Anything to add? (optional)", () => V.make()) : liftFoot("Edit", "What should change? e.g. \"a timber door\"", () => V.make());
  foot.id = "liftfoot"; foot.dataset.phone = "1"; deskHost.append(foot);
  syncDock(); syncHint(); requestAnimationFrame(liftSize);
}
// (Compare's dock, A3-10: "Download" on the phone is the share sheet, so the pair is saved, not downloaded)
{ const b = $("#cmpDlBoth"); if (b) b.textContent = "Save both"; }
// Materials: SketchUp's Paint Bucket keys as tiles (V.bucketMode, read by draw.js)
const BMODES = [[null, "Paint", "bucket"], ["all", "All of this colour", "all"], ["pick", "Pick up", "pick"], ["erase", "Rub out", "eraser"]];
function syncDock() {
  if (!LF) return;
  const dock = $("#liftdock");
  if (dock && LF.kind === "mats") {
    dock.innerHTML = "";
    BMODES.forEach(([m, l, ic]) => dock.append(tileBtn(ic, l, () => { V.bucketMode = m; haptic(); syncDock(); setTimeout(syncHint, 30); }, (V.bucketMode || null) === m ? "on" : "")));
    dock.append(tileBtn("list", "Materials list", () => { deskHost.classList.toggle("listoff"); haptic(); syncDock(); }, deskHost.classList.contains("listoff") ? "" : "on"),
      tileBtn("sliders", "Settings", toggleOpts, deskHost.classList.contains("optson") ? "on" : ""),
      proxyTile("undo", "Undo", "#dUndo"), proxyTile("redo", "Redo", "#dRedo"), proxyTile("fit", "Fit", "#dFit"));
  }
  $$("#deskhost .phx.optt").forEach((b) => b.classList.toggle("on", deskHost.classList.contains("optson")));
}
// Touch up: the original it paints back in (the desktop's #tSrc list) as a sheet
function srcSheet() {
  const s = $("#tSrc"); if (!s) return;
  const opts = [...s.options];
  if (opts.length < 2) return say(opts.length ? "Painting in from: " + opts[0].textContent : "No original to paint from");
  sheetRows("Paint in from", opts.map((o) => [o.selected ? "check" : "photos", o.textContent, o.selected ? "In use now" : "", () => { s.value = o.value; s.dispatchEvent(new Event("change", { bubbles: true })); haptic(); }]));
}
// the tool's help, as a pill over the picture, in phone words
let phoneWords = (s) => String(s || "")
  .replace(/\s*\((?:[^()]*?(?:Shift|Ctrl|Alt|Esc|Space|right-click|\[|\])[^()]*?)\)/g, "")
  .replace(/right-click(s|ed|ing)?/gi, (m) => (m[0] === "R" ? "Long-press" : "long-press"))
  .replace(/Shift\s*\+\s*click/gi, "All of this colour").replace(/Alt\s*\+\s*click/gi, "Pick up").replace(/Ctrl\s*\+\s*click/gi, "Rub out")
  .replace(/\b(double-)?(c)lick(s|ed|ing)?\b/gi, (m, d, c, e) => (d ? (d[0] === "D" ? "Double-" : "double-") : "") + (c === "C" && !d ? "T" : "t") + "ap" + ({ s: "s", ed: "ped", ing: "ping" }[(e || "").toLowerCase()] || ""))
  .replace(/\bor drag or paste one here\b/gi, "or take a photo of the sample").replace(/\bdrag them here, paste them\b/gi, "add them with + Add pictures or the camera")
  .replace(/\bFrom the canvas\b/g, "From your pictures").replace(/\bon the canvas\b/gi, "in this project").replace(/\bthe mouse\b/gi, "your finger")
  .replace(/\bon this PC\b/g, "on this phone").replace(/\bThis PC's\b/g, "This phone's"); // (A3-14: "shared by every project on this PC")
// (the keyboard's part of a help line goes: "X: Paint out. [ ] size, Shift+[ ] hardness, 1–0 flow." means nothing here)
const noKeys = (s) => s.split(/(?<=[.!?])\s+/).filter((x) => !/(Shift|Ctrl|Alt|Esc)\s*[+:]|\[ ?\]|\b1[–-][08]\b|^[A-Z]:\s|\bkeys?\b/.test(x)).join(" ").trim();
function syncHint() {
  const pill = $("#lifthint"); if (!pill || !LF) return;
  const st = $("#dstatus"), t = st && !st.hidden ? noKeys(phoneWords($("#dstatusT").textContent.trim())) : "";
  pill.textContent = t; pill.hidden = !t || LF.kind === "compare";
}
new MutationObserver(() => { if (LF) { syncHint(); if (LF.kind === "mats") { clearTimeout(syncDock.t); syncDock.t = setTimeout(syncDock, 60); } } }).observe($("#dstatus"), { childList: true, subtree: true, characterData: true, attributes: true });
new MutationObserver(() => { if (LF && LF.kind === "mats") { clearTimeout(syncDock.t); syncDock.t = setTimeout(syncDock, 60); } }).observe($("#dtools"), { subtree: true, attributes: true, attributeFilter: ["disabled"] });
// •••: the viewer's tabs as a segmented switch, then the rest
function liftMenu() {
  if (!LF) return;
  const n = LF.node, k = LF.kind, seg = h("div", { class: "seg even" });
  const touchOk = V.touchSources(n).length > 0;
  [["preview", "Preview"], ["compare", "Compare"], ["draw", k === "mats" ? "Materials" : "Draw"], ["touch", "Touch-ups"]].forEach(([m, l]) => {
    // (fix A3-11: Preview keeps the editor's shell, only looking: no tools, Done to close)
    const b = h("button", { class: (m === "draw" ? k === "draw" || k === "mats" : m === k) ? "on" : "", disabled: m === "touch" && !touchOk, onclick: () => { closeSheet(); setTimeout(() => switchLift(m === "draw" && k === "mats" ? "mats" : m), 250); } }, l);
    seg.append(b);
  });
  const body = h("div", {}, seg), rows = h("div", { class: "rows", style: "margin-top:12px" }); body.append(rows);
  const row = (ic, name, sub, fn) => rows.append(h("button", { class: "rowbtn", onclick: () => { closeSheet(); setTimeout(fn, 280); } }, h("span", { class: "ti", html: icon(ic) }), h("span", {}, h("b", {}, name), sub ? h("small", {}, sub) : null)));
  if (k === "draw" || k === "mats") row("save", "Save as new picture", "The picture with its layers, as a new picture next to it", () => $("#dSave").click());
  if (k === "draw") row("bucket", "Materials", "Paint materials onto the surfaces", () => switchLift("mats"));
  if (k === "mats") row("edit", "All of Draw", "Select, AI select, notes, layers", () => switchLift("draw"));
  if (k !== "compare" && k !== "preview") {
    row("hand", "Hand tool", "One finger moves the picture (or use two fingers any time)", () => $(k === "touch" ? "#tHand" : "#dHand").click());
    row("search", "Zoom tool", "Tap to zoom in (or pinch any time)", () => $(k === "touch" ? "#tZoom" : "#dZoom").click());
  }
  row("info", "Gestures", "Pinch, two fingers, the loupe", () => alertBox("Gestures", "Pinch to zoom in and out (up to 8×).\nTwo fingers move the picture.\nA quick two-finger tap fits the picture again.\nWhile you paint, the loupe above your finger shows the spot under it, twice as big."));
  openSheet(LF.title, { body });
}
function switchLift(kind) {
  if (!LF || kind === LF.kind) return;
  const mode = kind === "touch" ? "touch" : kind === "compare" ? "compare" : kind === "preview" ? "preview" : "draw";
  if (kind === "touch" && !V.touchSources(LF.node).length) return say("Touch-ups is for a render: it paints back the picture it was made from.");
  if (kind === "touch") LF.touch0 = touchSnap(V.selImages()[0] || LF.node);
  LF.kind = kind; LF.mode = mode; LF.title = { draw: "Draw", mats: "Materials", touch: "Touch up", compare: "Compare", preview: "Preview" }[kind];
  V.bucketMode = null;
  V.setViewerMode(mode);
  if (kind === "mats") setTimeout(() => V.drawApi.setTool("bucket"), 60);
  else if (kind === "draw" && V.drawApi && V.drawApi.setTool) setTimeout(() => V.drawApi.setTool("select"), 60);
  if (kind === "compare" || kind === "preview") setTimeout(() => V.setEnlarged(true), 60); // (the picture big, not the canvas behind it)
  liftShell(); haptic();
}
function liftClose(quiet) {
  if (!LF || LF.closing) return; const L = LF; L.closing = true;
  ["#lifthead", "#liftfoot", "#liftdock", "#lifthint"].forEach((s) => $(s) && $(s).remove());
  $$("#deskhost .phx").forEach((e) => e.remove());
  deskHost.classList.remove("optson", "listoff"); delete deskHost.dataset.kind; hideLoupe();
  V.bucketMode = null;
  // a window the tool left open (the material chooser, the key) closes with it
  [...deskHost.querySelectorAll(".modal")].filter((m) => !m.hidden && m.getClientRects().length > 0).forEach((m) => { const x = m.querySelector(".mclose"); if (x) x.click(); else m.remove(); });
  if (V.viewerMode !== "preview") V.setViewerMode("preview");
  if ((L.mode === "compare" || L.mode === "preview") && (V.pictureView ? V.pictureView() : document.body.classList.contains("enlarged"))) V.setEnlarged(false); // (v3.74: the desktop's Picture view, body.picview)
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
  if (LF && !LF.closing && m !== LF.mode) {
    if (m === "draw" || m === "touch") { LF.mode = m; LF.kind = m === "touch" ? "touch" : "draw"; LF.title = m === "touch" ? "Touch up" : "Draw"; liftShell(); } // (the desktop moved between Draw and Touch-ups)
    else liftClose();
  } else if (!LF && viaFind() && (m === "draw" || m === "touch") && V.selImages()[0]) liftOpen(V.selImages()[0], { title: m === "draw" ? "Draw" : "Touch up", mode: m });
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
// (v3.74: [Done] beside the one amber action; a screen with nothing to make has only its amber Done)
function liftFoot(label, ph, go, only = null) {
  if (only) return h("div", {}, h("div", { class: "frow" }, h("button", { class: "btn pri cl", onclick: () => liftClose() }, only)));
  const ta = h("textarea", { rows: 1, placeholder: ph, "aria-label": "Your words", enterkeyhint: "go" });
  const b = h("button", { class: "btn pri cl go" }, label);
  b.onclick = async () => {
    V.setPrompt(ta.value.trim(), { noUndo: true }); ta.blur();
    const before = new Set(V.G.nodes.map((x) => x.id));
    try { await go(); } catch (e) { return alertBox("That didn't work", e.message || String(e)); }
    await sleep(300);
    const made = V.G.nodes.filter((x) => !before.has(x.id) && isMedia(x));
    if (made.length) { liftClose(true); follow(made[made.length - 1], label); }
  };
  autoGrow(ta, 96); ta.addEventListener("input", () => requestAnimationFrame(liftSize)); enterGo(ta, () => b.click());
  return h("div", {}, ta, h("div", { class: "frow" }, h("button", { class: "btn sec fdone", onclick: () => liftClose() }, "Done"), b));
}

// Touch up (fix A3-11): [Discard] beside the amber Save touch-up, as Draw has [Done] beside Edit. Touch-ups saves as you
// paint (the first stroke makes a "Touched up" picture, later strokes rewrite it), so Save touch-up closes and shows it,
// and Discard takes this visit's painting away again: a Touched up picture made now is removed, an earlier one gets back
// the picture and mask it had when the editor opened
const touchSnap = (n) => (n && n.touchup ? { id: n.id, url: n.url, thumb: n.thumb, touchup: JSON.parse(JSON.stringify(n.touchup)) } : null);
function touchFoot() {
  return h("div", {}, h("div", { class: "frow" }, h("button", { class: "btn sec fdone", onclick: discardTouch }, "Discard"), h("button", { class: "btn pri cl go", onclick: () => liftClose() }, "Save touch-up")));
}
async function discardTouch() {
  if (!LF) return;
  const L = LF, made = V.G.nodes.filter((x) => !L.before.has(x.id) && isMedia(x)), t0 = L.touch0, n0 = t0 && V.node(t0.id), changed = !!(n0 && n0.url !== t0.url);
  if (!made.length && !changed) return liftClose();
  if (!(await confirmBox("Discard this touch-up?", "What you painted since opening Touch up is taken away. The render stays as it is.", "Discard", true)) || LF !== L) return;
  V.snapshot();
  if (made.length) V.removeNodes(made.map((x) => x.id));
  if (changed) Object.assign(n0, { url: t0.url, thumb: t0.thumb, touchup: t0.touchup });
  V.changed(true); haptic();
  if (V.node(L.node.id)) V.setSel([L.node.id]);
  liftClose(); say("Touch-up discarded");
}

// ---------- your picture: what do you want to do? (D7: ordered by what the picture is) ----------
let tRec = null;
function openTodo(n, fresh = false) {
  tRec = n; if (V.node(n.id)) V.setSel([n.id]); paintTodo();
  if (fresh) { stack.length = 0; stack.push("home"); pushHist(); show("todo", 1); } else nav("todo");
}
const TOOL = {
  render: ["Render", "scene", "Photoreal, with a scene, a preset or your words"],
  area: ["Brush", "brush", "Paint over a part, say what goes there"], // (N10: one name, as on the Result screen)
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
  // v3.74 (mobile:M13): the meta line says what the picture is ("Photo from your library · 1920 × 1080" for a photo)
  const sub = V.nodeSub(n) || "";
  $("#tMeta").innerHTML = `<b>${esc(V.nodeTitle(n))}</b>${esc(sub)}`;
  if (!sub && kindOf(n) === "photo") dimsOf(n).then((d) => { if (tRec === n) $("#tMeta").innerHTML = `<b>${esc(V.nodeTitle(n))}</b>${esc((n.label === "Photo" ? "Photo from the camera" : n.pdf ? "PDF page" : "Photo from your library") + ` · ${d.w} × ${d.h}`)}`; }, () => {});
  // the first tool (by what the picture is, D7) is a hero across both columns with its amber button; a tool that can't
  // be used on this picture is left out here (More explains why)
  const k = V.pictureKind(n), order = ORDER[k] || ORDER.render, G = $("#tGrid"); G.innerHTML = "";
  const touchOk = V.touchSources(n).length > 0;
  order.filter((id) => !(id === "touch" && !touchOk)).forEach((id, i) => {
    const [name, ic, sub2] = TOOL[id];
    if (i === 0) return G.append(h("div", { class: "tt hero", "data-tool": id },
      h("span", { class: "ti", html: icon(ic) }), h("span", { class: "ht" }, h("b", {}, name), h("small", {}, sub2)),
      h("button", { class: "btn pri cl", onclick: () => runTool(id, n) }, id === "render" ? "Render this picture" : name)));
    G.append(h("button", { class: "tt", "data-tool": id, onclick: () => runTool(id, n) }, h("span", { class: "ti", html: icon(ic) }), h("b", {}, name), h("small", {}, sub2)));
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
$("#pImprove").innerHTML = icon("sparkle") + "<span>Improve words</span>"; $("#pRal").innerHTML = icon("bucket") + "<span>RAL colour…</span>";
$("#pImprove").onclick = async () => {
  const b = $("#pImprove"), w = $("#pWords").value.trim() || presetText(C); b.disabled = true; b.querySelector("span").textContent = "Improving…";
  try { const r = await V.api("enhance", { prompt: w, tab: "image", images: [pRec.url] }); if (r && r.prompt) { $("#pWords").value = r.prompt; C.words = r.prompt; growWords(); paintDoes(); } }
  catch (e) { failBox(errOf(e.message)); }
  b.disabled = false; b.querySelector("span").textContent = "Improve words";
};
$("#pRal").onclick = () => { const r = $("#pRal").getBoundingClientRect(); V.openRAL(16, Math.max(80, r.top - 360), (c) => { const code = /^RAL/i.test(c.code) ? c.code : "RAL " + c.code; const t = $("#pWords"); t.value = (t.value.trim() ? t.value.trim().replace(/([^.!?,;:])$/, "$1,") + " " : "") + code; C.words = t.value; paintDoes(); }); };
function paintEvery() {
  const B = $("#pEvery"); B.innerHTML = "";
  const lk = V.G.look && V.G.look.on ? V.G.look : null, lib = ((V.G.library && V.G.library.items) || []).filter((i) => i.use && i.kind !== "style");
  const row = (ic, name, sub, on, open, off) => h("button", { class: "opt" + (on ? " on" : ""), onclick: (e) => { if (e.target.closest(".x")) return; open(); } }, h("span", { class: "oi ic", html: icon(ic) }), h("span", { class: "ot" }, h("b", {}, name), h("small", {}, sub)), on && off ? h("span", { class: "x", role: "button", "aria-label": "Take it out", onclick: () => { off(); paintEvery(); paintDoes(); } }, h("span", { html: icon("x") })) : h("span", { class: "chev" }));
  B.append(row("sun", lk ? "Project look: " + (lk.name || "on") : "Project look", lk ? "The materials, colours and light of your reference, in every render" : "Match every render to one picture you like", !!lk, () => waitModal(() => V.openLook(pRec)).then(() => { paintEvery(); paintDoes(); }), () => { V.G.look.on = false; V.changed(); }),
    row("library", lib.length ? `Furniture & materials: ${lib.length}` : "Furniture & materials", lib.length ? lib.map((i) => i.name).join(", ") : "Products and materials from the Library", lib.length > 0, () => waitModal(() => V.openPicker()).then(() => { paintEvery(); paintDoes(); })));
}

// ---------- Change an area: the full Draw (selections, AI select, notes, place, layers, adjust) ----------
function openDraw(n, title = "Brush · more tools") {
  liftOpen(n, { title, mode: "draw", kind: "draw" });
}
// ---------- Materials: Draw's material bucket, with SketchUp's keys as tiles in the dock (BMODES, above) ----------
function openMaterials(n) {
  V.bucketMode = null;
  liftOpen(n, { title: "Materials", mode: "draw", kind: "mats", after: () => { V.drawApi.setTool("bucket"); syncDock(); } });
}
// ---------- Touch up: the desktop's Touch-ups on the render ----------
function openTouch(n) {
  if (!V.touchSources(n).length) return say("Touch up paints back parts of the picture a render was made from (text, logos, a face). Open a render to use it.", 6000);
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
function pickPicture(title, not, then, clear, cls = "") {
  const list = pics().filter((x) => x.type === "image" && x !== not), body = h("div");
  if (clear) body.append(h("button", { class: "btn sec", style: "margin-bottom:12px", onclick: () => { closeSheet(); clear(); } }, "None"));
  if (!list.length) body.append(h("p", { class: "none" }, "No other pictures in this project yet."));
  const g = h("div", { class: "vgrid " + cls }); body.append(g);
  list.forEach((m) => g.append(h("button", { class: "pick", onclick: () => { closeSheet(); then(m); } }, smallImg(m, ""), h("span", { class: "cap" }, V.nodeTitle(m)))));
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
  if (fresh && cur === "result" && !rRec) { show("media", 1); return; } // (it takes the place of the waiting Result screen)
  nav("media");
}

// ---------- Drawing & CAD ----------
function sheetRows(title, rows) {
  const body = h("div", { class: "rows" });
  rows.filter(Boolean).forEach(([ic, name, sub, fn, cls, now]) => body.append(h("button", { class: "rowbtn" + (cls ? " " + cls : ""), onclick: () => { if (now) fn(); closeSheet(); if (!now) setTimeout(fn, 320); } }, h("span", { class: "ti", html: icon(ic) }), h("span", {}, h("b", {}, name), sub ? h("small", {}, sub) : null))));
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
    V.touchSources(n).length ? null : ["eraser", "Touch up", "For a render: paints back parts of the picture it was made from", () => openTouch(n)], // (v3.74 M13: here when it can't be used, saying why)
    ["text", "New picture from words", "Your picture only lends the style", () => newFromWords(n)],
    ["batch", "Batch render", "Several pictures, one choice each", () => deskFlow(() => V.openBatch({}), { title: "Rendering" })],
    ["compare", "Compare with another picture", "A before/after slider", () => pickPicture("Compare with…", n, (m) => compareTwo(n, m))],
    ["star", n.fav ? "Remove from favourites" : "Add to favourites", "", () => { n.fav = !n.fav; V.changed(true); say(n.fav ? "Added to favourites" : "Removed from favourites"); }],
    ["star", "Review the favourites", "Full screen, side by side", () => deskFlow(() => V.openReview({}))],
    V.versionsOf && V.versionsOf(n).length > 1 ? ["pickbest", "Pick the best", "Its versions two at a time; the pick, the hero, then the sheet", () => openBest(n)] : null,
    ["present", "Present", "Full screen: swipe through its versions, hold for the picture it came from", () => { const l = versions(n); presentList(l, l.indexOf(n)); }],
    ...presentRows().slice(0, 3),
    ["scene", "Photomontage", "Put a proposal into a site photo", () => deskFlow(() => V.openMontage(n), { title: "Making the photomontage" })],
    ["cut", "Cut out an object", "A transparent picture of one thing", () => deskFlow(() => V.openCutout(n), { title: "Cutting it out" })],
    ["layers", "Place into a scene", "Put this object into another picture", () => deskFlow(() => V.openPlace(n), { title: "Placing it" })],
    ["sun", "Adjust colour and layers", "Brightness, colour, layers (Draw)", () => openDraw(n, "Adjust")],
    ["info", "Describe this picture", "Words you can use in a render", () => deskFlow(() => V.openRefPrompt(n))],
    ["save", "Save with the Clarman logo", "", async () => { try { const u = await V.stampLogo(n.url); shareFile(await blobOf(u), fileName(n, "jpg").replace(/\.jpg$/, " Clarman.jpg")); } catch (e) { alertBox("Couldn't add the logo", e.message); } }],
    n.cutout ? ["cut", "Refine the cut-out", "Paint parts in or out", () => deskFlow(() => V.openRefine(n))] : null,
    ["compare", "Compare: overlay and edges", "The desktop's Compare view", () => liftOpen(n, { title: "Compare", mode: "compare", kind: "compare", after: () => V.setEnlarged(true) })],
    ["text", "Copy the words", "The prompt this picture was made with", async () => { try { await navigator.clipboard.writeText(V.nodePrompt(n) || ""); say("Copied"); } catch (e) { say("Couldn't copy"); } }],
    ["sheets", "Add to a sheet", "Puts it on the project's sheets, then opens Sheets", () => { sheetsAdd([n]); V.changed(); shCur = Math.max(0, ((V.G.sheets && V.G.sheets.pages) || []).findIndex((p) => p.frames.some((f) => f.node === n.id))); tab("sheets"); }],
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
  const ov = $({ sheets: "#ovSheets", library: "#ovLibrary", settings: "#ovSettings", account: "#ovAccount", help: "#ovHelp", projects: "#ovProjects" }[view]); if (ov) ov.classList.add("liftov");
}
function unliftPage() { if (!deskHost.classList.contains("liftpage")) return; deskHost.classList.remove("liftpage"); $$("#deskhost .phhide").forEach((x) => x.classList.remove("phhide")); $$("#deskhost .overlay").forEach((o) => o.classList.remove("liftov")); liftingPage = true; try { V.setView("canvas"); } finally { liftingPage = false; } }
const show0 = show;
show = (id, dir) => { if (!["dpage", "fullpage"].includes(id)) unliftPage(); deskHost.style.setProperty("--pagebot", "var(--sab)"); return show0(id, dir); };
// a desktop page (All settings, Usage, Help) on a phone screen with a Back button
function deskPage(view, title) { $("#dpTitle").textContent = title; nav("dpage"); liftPage(view, $("#dpage .wrap")); }
// v3.74 (mobile:big:4): the desktop's own Sheets or Library page, as "Full editor (as on the PC)": every tool it has
function fullPage(view) { $("#fpTitle").textContent = view === "sheets" ? "Sheets · full editor" : "Library · full editor"; nav("fullpage"); liftPage(view, $("#fullpage .wrap")); }
screens.fullpage = null;
// a desktop window opened from the phone: resolves once it has been closed
async function waitModal(fn) {
  await fn(); const t0 = Date.now(); let seen = false;
  for (;;) { await sleep(250); const o = modalOpen(); if (o) seen = true; if ((seen && !o) || (!seen && Date.now() - t0 > 1500) || Date.now() - t0 > 30 * 60000) return; }
}

// ---------- the desktop's own pop-ups belong to the PC: anything it puts on the page goes into the hidden host ----------
const host = $("#deskhost");
const MINE = new Set(["duel", "todo", "video", "three", "media", "dpage", "fullpage", "welcome", "home", "pic", "result", "paint", "history", "settings", "projects", "allpics", "sheets", "library", "tabs", "pview", "jpill", "loupe", "shade", "sheet", "dlg", "mtoast", "deskhost"]);
const stray = (el) => el.nodeType === 1 && !MINE.has(el.id) && !(el.dataset && el.dataset.phone) && !/^(SCRIPT|STYLE|LINK|TEMPLATE)$/.test(el.tagName);
[...document.body.children].filter(stray).forEach((el) => host.append(el));
new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((el) => { if (el.parentNode === document.body && stray(el)) host.append(el); }))).observe(document.body, { childList: true });
// (v3.74: core.js makes the page behind a dialog inert while it is open and watches the body for it going; on the phone a
// dialog lives in the host, so when the last one there goes, the page is made usable again here)
new MutationObserver((ms) => {
  if (!ms.some((m) => [...m.removedNodes].some((x) => x.nodeType === 1 && x.matches && x.matches(".modal")))) return;
  if ([...host.querySelectorAll(".modal:not([hidden])")].some((x) => x.getClientRects().length)) return;
  host.querySelectorAll("[data-vminert]").forEach((x) => { x.inert = false; x.removeAttribute("aria-hidden"); x.removeAttribute("data-vminert"); });
}).observe(host, { childList: true });

// ================= v3.74 A3: iPhone polish (design/critique-3.73.json mobile:big:1-4, mobile:M1-M25) =================

// ---------- haptics (M10): iOS 18 Safari taps lightly when a hidden switch is flipped; elsewhere a short vibration ----------
const hapLab = h("label", { "data-phone": "1", "aria-hidden": "true", style: "position:fixed;left:-200px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden" });
hapLab.append(h("input", { type: "checkbox", switch: true, tabindex: "-1" })); document.body.append(hapLab);
function haptic(kind) { try { if (isIOS()) hapLab.click(); else if (navigator.vibrate) navigator.vibrate(kind === "success" ? [10, 60, 10] : 8); } catch (e) {} }
V.haptic = haptic;

// ---------- long press on a picture (M15): Save, Share, Render again, Favourite, Rename, Delete ----------
// (the finger lifting after a long press makes a click on whatever is under it by then, e.g. the sheet's shade: swallowed)
let swallowClick = 0;
document.addEventListener("click", (e) => { if (Date.now() < swallowClick) { swallowClick = 0; e.preventDefault(); e.stopImmediatePropagation(); } }, true);
function longPress(el, fn, ms = 450) {
  let t = 0, x0 = 0, y0 = 0, fired = false;
  el.addEventListener("pointerdown", (e) => { if (e.pointerType === "mouse") return; fired = false; x0 = e.clientX; y0 = e.clientY; clearTimeout(t); t = setTimeout(() => { fired = true; swallowClick = Date.now() + 1500; haptic(); fn(); }, ms); });
  el.addEventListener("pointerup", () => { if (fired) swallowClick = Date.now() + 400; });
  el.addEventListener("pointermove", (e) => { if (Math.abs(e.clientX - x0) + Math.abs(e.clientY - y0) > 10) clearTimeout(t); });
  ["pointerup", "pointercancel", "pointerleave"].forEach((k) => el.addEventListener(k, () => clearTimeout(t)));
  el.addEventListener("click", (e) => { if (fired) { e.preventDefault(); e.stopImmediatePropagation(); fired = false; } }, true);
  el.addEventListener("contextmenu", (e) => { e.preventDefault(); if (!fired) { fired = true; clearTimeout(t); fn(); } });
}
function picSheet(n) {
  const k = kindOf(n), p = parentOf(n);
  const again = n.type !== "image" ? null : k !== "photo" && p && againOf(n) ? ["again", "Render again", "From the original, with the same choices", () => againOf(n)()]
    : ["again", "Render it", "Choose a scene, a preset or your words", () => openPicture(n)];
  const repaint = () => { if (cur === "home") paintHome(); else if (cur === "history") paintHistory(); };
  sheetRows(V.nodeTitle(n), [
    ["save", "Save to Photos", "The whole picture, full size", () => (n.type === "image" ? saveToPhotos(n) : blobOf(n.url).then((b) => shareFile(b, fileName(n, n.type === "video" ? "mp4" : "glb")))), "", true],
    ["share", "Share…", "Messages, Mail, AirDrop, Files", () => (n.type === "image" ? saveToPhotos(n) : blobOf(n.url).then((b) => shareFile(b, fileName(n, n.type === "video" ? "mp4" : "glb")))), "", true],
    again,
    ["star", n.fav ? "Remove from favourites" : "Favourite", "", () => { n.fav = !n.fav; V.changed(true); haptic(); say(n.fav ? "Added to favourites" : "Removed from favourites"); }],
    pickable(n) ? ["pickbest", n.pick ? "Take the pick off" : "Pick for this view", "The one picture of its view for sheets and the client pack", () => togglePick(n)] : null,
    pickable(n) ? ["star", n.hero ? "Take the hero off" : "Make it the hero", "The one picture of the project", () => toggleHero(n)] : null,
    ["edit", "Rename", "", async () => { const v = await askBox("Rename", V.nodeTitle(n)); if (v) { V.renameNode(n, v); V.changed(true); repaint(); say("Renamed"); } }],
    ["trash", "Delete", "", async () => { if (await delPic(n)) { haptic(); repaint(); } }, "bad"],
  ]);
}

// ---------- gestures (big:2, M2): V.phoneGestures(el, o) ----------
// Two fingers pinch (1-8×) and move the picture; o.paint: one finger still paints (held back for a moment, so a second
// finger makes it a pinch, then handed on to the editor), with a loupe; o.dbl: a double tap zooms 2.5× there and back;
// a quick two-finger tap fits again; o.onSwipe(±1) / o.onSwipeDown when not zoomed. o.target() is the element moved
// (inside el, filling it); o.nav() is a desktop editor's own zoom (nav.js psNav) to drive instead; o.on() when it applies.
const SURF = [];
V.phoneGestures = (el, o = {}) => {
  const g = { el, o, z: 1, x: 0, y: 0, pts: new Map(), pinch: null, hold: null, live: null, pan: null, start: null, tap: null };
  g.apply = (anim) => {
    const t = o.target && o.target(); if (!t) return;
    t.style.transition = anim && motion() ? "transform .24s cubic-bezier(.2,.8,.2,1)" : ""; t.style.transformOrigin = "0 0";
    t.style.transform = g.z === 1 && !g.x && !g.y ? "" : `translate(${g.x}px,${g.y}px) scale(${g.z})`;
    el.classList.toggle("zoomed", g.z > 1.01);
  };
  g.reset = (anim) => { if (o.nav) { const nv = o.nav(); if (nv) nv.fit(); return; } g.z = 1; g.x = g.y = 0; g.apply(anim); };
  g.clamp = () => { const w = el.clientWidth, hh = el.clientHeight; g.z = Math.max(1, Math.min(o.max || 8, g.z)); g.x = Math.min(0, Math.max(w - w * g.z, g.x)); g.y = Math.min(0, Math.max(hh - hh * g.z, g.y)); };
  g.zoomAt = (z1, cx, cy) => { const r = el.getBoundingClientRect(), lx = cx - r.left, ly = cy - r.top, px = (lx - g.x) / g.z, py = (ly - g.y) / g.z; g.z = Math.max(1, Math.min(o.max || 8, z1)); g.x = lx - g.z * px; g.y = ly - g.z * py; g.clamp(); };
  SURF.push(g); return g;
};
const surfOf = (e) => { for (let i = SURF.length - 1; i >= 0; i--) { const s = SURF[i]; if (!s.el.isConnected) { if (s.o.temp) SURF.splice(i, 1); continue; } if (s.el.contains(e.target) && (!s.o.on || s.o.on())) return s; } return null; };
const gdist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y), gmid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const evInit = (e, type) => ({ bubbles: true, cancelable: true, composed: true, pointerId: e.pointerId, pointerType: e.pointerType, isPrimary: true, clientX: e.clientX, clientY: e.clientY, screenX: e.screenX, screenY: e.screenY,
  button: type === "pointermove" ? -1 : 0, buttons: type === "pointerup" ? 0 : 1, pressure: type === "pointerup" ? 0 : e.pressure || 0.5, width: e.width || 1, height: e.height || 1 });
const fire = (target, type, e) => { try { target.dispatchEvent(new PointerEvent(type, evInit(e, type))); } catch (er) {} };
// a tap handed on as the finger lifts: the pointer is no longer down, so an editor's setPointerCapture would throw and stop
// its handler; on the phone a capture that can't be made is simply skipped
(() => { const sc = Element.prototype.setPointerCapture; Element.prototype.setPointerCapture = function (id) { try { return sc.call(this, id); } catch (e) { return undefined; } }; })();
function release(g) { // the held first finger was a stroke after all: hand it to the editor, with the moves so far
  const H = g.hold; if (!H) return; g.hold = null; clearTimeout(H.t);
  g.live = { id: H.ev.pointerId, target: H.ev.target, last: H.ev, moved: false, x0: H.ev.clientX, y0: H.ev.clientY };
  fire(H.ev.target, "pointerdown", H.ev); H.moves.forEach((m) => { g.live.last = m; fire(H.ev.target, "pointermove", m); });
}
function endLive(g) { const L = g.live; if (!L) return; g.live = null; fire(L.target, "pointerup", L.last); hideLoupe(); }
let gTouch = null; // the surface the fingers now on the screen belong to
document.addEventListener("pointerdown", (e) => {
  if (!e.isTrusted || e.pointerType !== "touch") return;
  const g = gTouch && gTouch.pts.size ? gTouch : surfOf(e); if (!g) return;
  gTouch = g;
  g.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  const stop = () => { e.stopImmediatePropagation(); if (e.cancelable) e.preventDefault(); };
  if (g.pts.size === 1) {
    g.start = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
    if (g.o.paint) { stop(); g.hold = { ev: e, moves: [], t: setTimeout(() => release(g), 90) }; }
    else if (g.z > 1.01 && !(g.o.keep && e.target.closest(g.o.keep))) { stop(); g.pan = { x: e.clientX, y: e.clientY }; }
  } else if (g.pts.size === 2) {
    stop();
    if (g.hold) { clearTimeout(g.hold.t); g.hold = null; } else if (g.live) endLive(g);
    g.pan = null;
    const [a, b] = [...g.pts.values()];
    g.pinch = { d: gdist(a, b), m: gmid(a, b), d0: gdist(a, b), m0: gmid(a, b), t: performance.now(), moved: false };
  } else stop();
}, true);
document.addEventListener("pointermove", (e) => {
  const g = gTouch; if (!e.isTrusted || !g || !g.pts.has(e.pointerId)) return;
  const p = g.pts.get(e.pointerId); p.x = e.clientX; p.y = e.clientY;
  if (g.pinch) {
    e.stopImmediatePropagation(); if (g.pts.size < 2) return;
    const [a, b] = [...g.pts.values()], d = gdist(a, b), m = gmid(a, b), P = g.pinch;
    if (g.o.nav) {
      const nv = g.o.nav(); if (nv) { const fs = nv.fitScale() || 1, z1 = Math.max(1, Math.min(8, nv.st.z * d / P.d)); nv.zoomTo(z1 * fs, P.m.x, P.m.y); nv.st.x += m.x - P.m.x; nv.st.y += m.y - P.m.y; nv.apply(); }
    } else { g.zoomAt(g.z * d / P.d, P.m.x, P.m.y); g.x += m.x - P.m.x; g.y += m.y - P.m.y; g.clamp(); g.apply(); }
    if (Math.abs(d - P.d0) > 10 || gdist(m, P.m0) > 10) P.moved = true;
    P.d = d; P.m = m; return;
  }
  if (g.hold && e.pointerId === g.hold.ev.pointerId) {
    e.stopImmediatePropagation(); g.hold.moves.push(e);
    if (Math.abs(e.clientX - g.start.x) + Math.abs(e.clientY - g.start.y) > 14) release(g); // (moving on: it is a stroke)
    return;
  }
  if (g.pan) { e.stopImmediatePropagation(); g.x += e.clientX - g.pan.x; g.y += e.clientY - g.pan.y; g.pan = { x: e.clientX, y: e.clientY }; g.clamp(); g.apply(); return; }
  if (g.live && e.pointerId === g.live.id) {
    g.live.last = e;
    if (!g.live.moved && Math.abs(e.clientX - g.live.x0) + Math.abs(e.clientY - g.live.y0) > 6) g.live.moved = true;
    if (g.live.moved && g.o.loupe) showLoupe(g, e.clientX, e.clientY);
  }
}, true);
// a quick tap (under 12 px, 260 ms): the second of two zooms in 2.5× there, or back to the whole picture when zoomed in
// (fix A3-1: zoomed in, a finger pans, so the tap is looked for when that pan ends too)
const isTap = (e, st) => st && e.type === "pointerup" && performance.now() - st.t < 260 && Math.abs(e.clientX - st.x) + Math.abs(e.clientY - st.y) < 12;
function gTap(g, e) {
  const tp = g.tap; g.tap = { t: performance.now(), x: e.clientX, y: e.clientY };
  if (tp && performance.now() - tp.t < 320 && gdist(tp, g.tap) < 30) { g.tap = null; if (g.z > 1.05) g.reset(true); else { g.zoomAt(2.5, e.clientX, e.clientY); g.apply(true); } haptic(); }
}
const gUp = (e) => {
  const g = gTouch; if (!e.isTrusted || !g || !g.pts.has(e.pointerId)) return;
  const st = g.start, wasPinch = !!g.pinch;
  if (g.hold && e.pointerId === g.hold.ev.pointerId) { release(g); } // (a tap: the editor gets down, then this up)
  else if (g.pinch) {
    e.stopImmediatePropagation();
    if (g.pts.size === 2 && !g.pinch.moved && performance.now() - g.pinch.t < 260) { g.reset(true); haptic(); } // a two-finger tap fits again
  } else if (g.pan) { e.stopImmediatePropagation(); g.pan = null; if (g.o.dbl && g.pts.size === 1 && isTap(e, st)) gTap(g, e); }
  else if (g.live && e.pointerId === g.live.id) { g.live = null; hideLoupe(); }
  else if (st && e.type === "pointerup" && g.pts.size === 1) {
    const dx = e.clientX - st.x, dy = e.clientY - st.y, dt = performance.now() - st.t;
    if (g.o.dbl && isTap(e, st)) gTap(g, e);
    else if (g.z <= 1.01 && dt < 600) {
      if (g.o.onSwipe && Math.abs(dx) > 60 && Math.abs(dx) > 2 * Math.abs(dy)) g.o.onSwipe(dx < 0 ? 1 : -1);
      else if (g.o.onSwipeDown && dy > 90 && dy > 2 * Math.abs(dx)) g.o.onSwipeDown();
    }
  }
  g.pts.delete(e.pointerId);
  if (!g.pts.size) { g.pinch = null; g.pan = null; gTouch = null; if (wasPinch && g.o.nav) { const nv = g.o.nav(); if (nv && nv.st.z < 1.02) nv.fit(); } }
};
document.addEventListener("pointerup", gUp, true); document.addEventListener("pointercancel", gUp, true);
// the loupe: a circle above the finger showing the spot under it at 2×, drawn from the editor's own pictures and layers
const loupeEl = $("#loupe"), loupeCan = loupeEl.querySelector("canvas");
function showLoupe(g, x, y) {
  const S = 112, k = 2, dpr = Math.min(3, devicePixelRatio || 1);
  if (loupeCan.width !== S * dpr) { loupeCan.width = loupeCan.height = S * dpr; }
  const cx = loupeCan.getContext("2d"); cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, S, S); cx.fillStyle = "#141416"; cx.fillRect(0, 0, S, S);
  const half = S / (2 * k);
  for (const src of g.el.querySelectorAll("canvas, img")) {
    const r = src.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const cs = getComputedStyle(src); if (cs.visibility === "hidden" || cs.display === "none" || +cs.opacity === 0) continue;
    const sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height; if (!sw || !sh) continue;
    // the screen square round the finger, clipped to this picture (Safari draws nothing for a source outside it)
    const L = Math.max(x - half, r.left), T = Math.max(y - half, r.top), R = Math.min(x + half, r.right), B = Math.min(y + half, r.bottom); if (R <= L || B <= T) continue;
    const fx = sw / r.width, fy = sh / r.height;
    try { cx.globalAlpha = +cs.opacity || 1; cx.drawImage(src, (L - r.left) * fx, (T - r.top) * fy, (R - L) * fx, (B - T) * fy, (L - (x - half)) * k, (T - (y - half)) * k, (R - L) * k, (B - T) * k); } catch (e) {}
  }
  cx.globalAlpha = 1; cx.strokeStyle = "#fff"; cx.lineWidth = 1.5; cx.beginPath(); cx.arc(S / 2, S / 2, 7, 0, 7); cx.stroke();
  cx.strokeStyle = "#000a"; cx.lineWidth = 1; cx.beginPath(); cx.arc(S / 2, S / 2, 8.5, 0, 7); cx.stroke();
  const top = y - S - 70 < 8 ? y + 60 : y - S - 70; // (above the finger; under it near the top edge)
  loupeEl.style.transform = `translate(${Math.round(Math.max(8, Math.min(innerWidth - S - 8, x - S / 2)))}px,${Math.round(top)}px)`; loupeEl.hidden = false;
}
function hideLoupe() { loupeEl.hidden = true; }
// the surfaces
aG = V.phoneGestures($("#aStage"), { paint: true, loupe: true, target: () => $("#aZ"), on: () => cur === "paint" });
cmpG = V.phoneGestures($("#rCmp"), { dbl: true, keep: ".knob", target: () => $("#rCmp .cz"), on: () => cur === "result" && !!rRec });
vG = V.phoneGestures($("#pview .vimg"), { dbl: true, target: () => $("#vZ"), on: () => !$("#pview").hidden, onSwipe: (d) => stepViewer(d), onSwipeDown: () => closeViewer() });
V.phoneGestures($("#vstage"), { paint: true, loupe: true, nav: () => (V.navTest ? V.navTest.active() : null), on: () => !!LF && LF.kind !== "compare" });
function stepViewer(d) {
  let i = xList.indexOf(vJob); if (i < 0) i = xList.findIndex((j) => vJob && j.id === vJob.id); // (final: a job's versions are cards of their own)
  const j = xList[i + d]; if (i < 0 || !j) return;
  haptic(); openViewer(j);
  if (motion()) $("#vZ").animate([{ transform: `translateX(${d * 30}%)`, opacity: 0.3 }, { transform: "none", opacity: 1 }], { duration: 240, easing: "cubic-bezier(.2,.8,.2,1)" });
}

// ---------- edge swipe back (M5): from the left edge, the screen follows the finger, the one below shows through ----------
(() => {
  let s = null;
  const can = () => cur && !TABBED.includes(cur) && stack.length && !LF && $("#sheet").hidden && $("#dlg").hidden && $("#pview").hidden && !modalOpen() && !deskHost.classList.contains("liftpage") && motion();
  document.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "touch" || e.clientX > 24 || s || !can()) return;
    s = { id: e.pointerId, x0: e.clientX, y0: e.clientY, a: $("#" + cur), b: $("#" + stack[stack.length - 1]), to: stack[stack.length - 1], w: innerWidth, dx: 0, go: false, v: 0, lt: performance.now(), lx: e.clientX };
  }, true);
  document.addEventListener("pointermove", (e) => {
    if (!s || e.pointerId !== s.id) return;
    const dx = Math.max(0, e.clientX - s.x0);
    if (!s.go) {
      if (Math.abs(e.clientY - s.y0) > 14 && Math.abs(e.clientY - s.y0) > dx) { s = null; return; }
      if (dx < 10) return;
      s.go = true; if (screens[s.to]) screens[s.to]();
      s.b.hidden = false; s.b.style.zIndex = 1; s.a.style.zIndex = 3;
    }
    e.stopImmediatePropagation();
    const now = performance.now(); s.v = (e.clientX - s.lx) / Math.max(1, now - s.lt); s.lt = now; s.lx = e.clientX; s.dx = dx;
    s.a.style.transform = `translateX(${dx}px)`; s.b.style.transform = `translateX(${-30 + (30 * dx) / s.w}%)`; s.b.style.filter = `brightness(${0.85 + (0.15 * dx) / s.w})`;
  }, true);
  const end = (e) => {
    if (!s || e.pointerId !== s.id) return; const S = s; s = null; if (!S.go) return;
    e.stopImmediatePropagation();
    const ok = S.dx > S.w * 0.35 || S.v > 0.5, T = { duration: 220, easing: "cubic-bezier(.2,.8,.2,1)" };
    const aEnd = ok ? `translateX(${S.w}px)` : "translateX(0px)", bEnd = ok ? "translateX(0%)" : "translateX(-30%)";
    const a1 = S.a.animate([{ transform: S.a.style.transform }, { transform: aEnd }], T); S.b.animate([{ transform: S.b.style.transform, filter: S.b.style.filter }, { transform: bEnd, filter: ok ? "brightness(1)" : "brightness(.85)" }], T);
    a1.onfinish = () => {
      S.a.style.transform = S.b.style.transform = S.b.style.filter = ""; S.a.style.zIndex = S.b.style.zIndex = "";
      if (ok) { haptic(); S.a.hidden = true; noAnim = true; back(); } else S.b.hidden = true;
    };
  };
  document.addEventListener("pointerup", end, true); document.addEventListener("pointercancel", end, true);
})();

// ---------- background jobs: the pill, the waiting Result screen, landing (big:3, M4) ----------
$("#jpill").onclick = () => jobSheet();
function paintPill() {
  const p = $("#jpill"); if (!p) return;
  const act = jobs.filter((j) => !j.stopped), hereOnly = cur === "result" && rPend && act.length === 1 && act[0] === rPend;
  p.hidden = !act.length || hereOnly || !!LF || cur === "welcome";
  p.classList.toggle("up", !TABBED.includes(cur));
  // (no tab bar: the pill sits 12 px above the screen's own foot, or at the bottom edge when it has none: fix A3-13)
  const ft = !TABBED.includes(cur) && $("#" + cur + " .foot");
  p.style.setProperty("--pillb", ft && ft.offsetHeight ? `calc(${ft.offsetHeight + 12}px + var(--kb,0px))` : "calc(var(--sab) + 16px + var(--kb,0px))");
  if (act.length) {
    const j = act[act.length - 1], pic = j.src && (j.src.thumb || j.src.url);
    if (pic && $("#jImg").getAttribute("src") !== pic) $("#jImg").src = pic;
    $("#jText").textContent = act.length > 1 ? `${act.length} working · ${leftOf(j) || clock(j.t0)}` : jobLine(j);
    const st = stOf(j); $("#jpill").style.setProperty("--jp", st ? Math.round(st.p * 100) + "%" : "0%");
  }
  if (rPend && cur === "result") {
    const t = $("#rTime"); if (t) t.textContent = (leftOf(rPend, true) || clock(rPend.t0)) + " · " + rPend.model;
    const st = stOf(rPend), bar = $("#rProg"); if (bar) { bar.style.width = st ? Math.round(st.p * 100) + "%" : rPend.node && rPend.node.status === "done" ? "96%" : "4%"; bar.parentElement.setAttribute("aria-valuenow", st ? Math.round(st.p * 100) : 0); }
    const s = Math.floor((Date.now() - rPend.t0) / 1000); $("#rPendT").textContent = s > 90 && !rPend.note ? "Taking longer than usual: Google can be slow at busy times. You can leave this screen; it will be here when it's ready." : "You can leave this screen. It will be here when it's ready.";
  }
  clearTimeout(paintPill.t); if (act.length) paintPill.t = setTimeout(paintPill, 1000);
}
// v3.74 D3 (N6): the stage and the time left from the desktop's V.jobClock (what History says such jobs take), as the PC's
// cards and title bar show it: "Rendering · about 40 s left", "Waiting in line", "Rendering · 1:12 · taking longer than usual"
const stOf = (j) => { const n = j && j.node; if (!n || !V.jobClock || !V.node(n.id) || n.status === "done" || n.status === "error") return null; try { return V.jobClock.state(n); } catch (e) { return null; } };
function leftOf(j, long) {
  const st = stOf(j); if (!st) return j && j.node && j.node.status === "done" ? "nearly done" : ""; // (final, phone-11: the AI is done, the painted area is being put back: no clock)
  if (st.stage === "sending") return "Sending…";
  if (st.stage === "queued" || st.stage === "waiting") return "Waiting in line";
  if (st.over) return clock(j.t0) + (long ? " · taking longer than usual" : "");
  return st.left > 3 ? `about ${V.jobClock.leftText(st.left)} left` : "nearly done";
}
const jobLine = (j) => { const l = leftOf(j); return j.verb + " · " + (l || clock(j.t0)); };
function jobSheet() {
  const body = h("div", { class: "rows" });
  jobs.filter((j) => !j.stopped).forEach((j) => body.append(h("div", { class: "jrow" }, h("img", { src: j.src.thumb || j.src.url, alt: "" }),
    h("span", { class: "jt" }, h("b", {}, j.verb), h("small", {}, `${leftOf(j, true) || clock(j.t0)} · ${j.model}` + (j.note ? " · " + j.note : ""))),
    h("button", { class: "btn sec", onclick: () => { closeSheet(); setTimeout(() => openPending(j), 260); } }, "View"),
    h("button", { class: "btn ghost", "aria-label": "Cancel", onclick: () => { closeSheet(); cancelJob(j); } }, "Cancel"))));
  body.append(h("p", { class: "hint2" }, "You can keep working: each one appears in the project when it's ready."));
  openSheet("Working on it", { body });
}
function openPending(j) {
  rPend = j; rRec = null; rFrom = j.src;
  $("#rTitle").textContent = j.verb + "…";
  const box = $("#rCmp"); box.innerHTML = "";
  const fit = (d) => { box.style.aspectRatio = `${d.w} / ${d.h}`; box.style.width = Math.min(box.parentElement.clientWidth || innerWidth - 32, innerHeight * 0.58 * d.w / d.h) + "px"; };
  fit({ w: 4, h: 3 }); dimsOf(j.src).then((d) => { if (rPend === j) fit(d); }, () => {});
  box.append(h("div", { class: "cz" }, h("img", { src: j.src.url, alt: "" })), h("div", { class: "shine" }), h("span", { class: "tchip", id: "rTime" }, clock(j.t0) + " · " + j.model),
    h("div", { class: "jprog", role: "progressbar", "aria-label": "Progress", "aria-valuemin": "0", "aria-valuemax": "100" }, h("i", { id: "rProg" })));
  $("#rMeta").innerHTML = ""; $("#rMeta").append(h("b", {}, j.title), h("span", { class: "what" }, j.note || "Usually 20 to 60 seconds."));
  rWait(true);
  if (cur !== "result") nav("result"); else paintPill();
}
const doneWord = (v) => ({ Tweaking: "Tweak ready", Relighting: "Relight ready", Rendering: "Render ready", Upscaling: "Upscale ready", Editing: "Edit ready", "Making the video": "Video ready", "Making the 3D model": "3D model ready" }[v] || "Ready");
function landed(j, n) {
  const here = cur === "result" && rPend === j;
  busyClose(j); haptic("success");
  if (here) { rPend = null; return openAny(n, true); }
  if (cur !== "home") $("#tabs button[data-tab=home]").classList.add("dot"); // (the dot is for something that finished while you were elsewhere: fix A3-6)
  sayAct(doneWord(j.verb), n, "View", () => openAny(n));
  if (cur === "home") paintHome();
}
function jobFailed(j, e) {
  const here = cur === "result" && rPend === j;
  busyClose(j); if (here) { rPend = null; back(); }
  failBox(e, j.node);
}
function sayAct(msg, n, label, fn, ms = 7000) {
  const t = $("#mtoast"); t.innerHTML = "";
  t.append(h("div", { class: "tact" }, n && (n.thumb || n.url) ? h("img", { src: n.thumb || n.url, alt: "" }) : null, h("span", {}, msg), h("button", { onclick: () => { t.innerHTML = ""; fn(); } }, label)));
  clearTimeout(toastT); toastT = setTimeout(() => (t.innerHTML = ""), ms);
}
// what is still working is noted on the phone. After the app is reopened: what landed while you were away is shown under
// "Finished while you were away" on Home; a job still running (a fal.ai queue job, a desktop window's) is followed again;
// a direct Google job dies with the page (local.js marks it Interrupted), so it gets one message with Render again
// (A3-5). Switching apps without closing is different: the page is only paused and the job usually carries on when it
// is back (not checked on a real iPhone: iOS may still drop the request if the app stays in the background a long time).
const PEND = "pending";
function pendAdd(j, n) { const l = store.get(PEND, []).filter((p) => p.id !== n.id); l.push({ id: n.id, project: V.project.id || null, title: j.title, t0: j.t0 }); store.set(PEND, l.slice(-12)); }
function pendDrop(j) { if (j && j.node) store.set(PEND, store.get(PEND, []).filter((p) => p.id !== j.node.id)); }
// (a picture that was still being made when the app was closed can't come back: Google's answer goes with the page. What
// had already landed shows under "Finished while you were away"; the rest gets one phone message with Render again.)
async function resumePending() {
  const l = store.get(PEND, []); if (!l.length) return;
  const away = store.get("away", []), keep = [], stopped = [];
  for (const p of l) {
    if (p.project !== (V.project.id || null)) { if (Date.now() - p.t0 < 864e5) keep.push(p); continue; }
    const n = V.node(p.id); if (!n) continue;
    if (n.status === "error") { if (errOf(n.error).kind === "interrupted" && Date.now() - p.t0 < 864e5) stopped.push(n); continue; }
    if (n.status === "done" && n.url) { if (!away.includes(n.id)) away.push(n.id); }
    else if (Date.now() - p.t0 < 30 * 60000) { keep.push(p); follow(n, p.title, { quiet: true }); }
  }
  store.set(PEND, keep); store.set("away", away.slice(-8));
  if (cur === "home") paintHome();
  if (stopped.length) stoppedBox(stopped);
}
// what Render again does for a picture (or one that never arrived): the same source picture, the same choices
function againOf(n) {
  const p = parentOf(n), c = n.phone || {}; if (!p) return null;
  if (c.upscale || (n.status === "done" && kindOf(n) === "upscale")) return () => doUpscale(p);
  if (c.area && c.strokes) return () => doArea(p, c);
  if (c.tweak) return () => doTweak(p, c.tweak);
  return () => doRender(p, choiceOf(n));
}
// one phone message for renders the app was closed during, with Render again (fix A3-5; never the PC's "Press Try again").
// The empty picture stays in the project until it is made again (the PC shows it with its own Try again).
// (several found at once, or failing one after another as the app comes back, make one message: gathered for a moment)
let stopQ = [], stopT = 0, stoppedOpen = false;
function stoppedBox(list) {
  list.forEach((n) => { if (n && !stopQ.includes(n)) stopQ.push(n); });
  clearTimeout(stopT); stopT = setTimeout(() => { if (stoppedOpen) return; const l = stopQ; stopQ = []; if (l.length) stoppedBox1(l).then(() => stopQ.length && stoppedBox([])); }, 700);
}
function stoppedBox1(list) {
  list = list.filter((n) => n && V.node(n.id)); if (!list.length) return Promise.resolve();
  const runs = list.map(againOf).filter(Boolean), one = list.length <= 1;
  const title = one ? "The render stopped when VizLab was closed" : `${list.length} renders stopped when VizLab was closed`;
  const text = `Google can't finish a picture once VizLab has been closed, so ${one ? "it" : "they"} didn't arrive.` + (runs.length ? ` Render ${one ? "it" : "them"} again with the same choices?` : "");
  const redo = () => { const ids = list.map((n) => n.id).filter((id) => V.node(id)); if (ids.length) { V.removeNodes(ids); V.changed(); } runs.forEach((go, i) => setTimeout(go, i * 600)); };
  stoppedOpen = true; haptic();
  return alertBox(title, text, runs.length ? [[one ? "Render again" : "Render them again", redo], ["Not now"]] : [["OK"]]).then((r) => { stoppedOpen = false; return r; });
}
function paintAway() {
  const list = store.get("away", []).map((id) => V.node(id)).filter((n) => n && isPic(n));
  $("#hAway").hidden = !list.length; const r = $("#hAwayRow"); r.innerHTML = "";
  list.forEach((n, i) => { const c = card(n, i, null, "crcard"); c.addEventListener("click", () => store.set("away", store.get("away", []).filter((x) => x !== n.id)), true); r.append(c); });
}
$("#hAwayX").onclick = () => { store.set("away", []); paintAway(); };
// back in the app (only paused, not closed): the desktop's polling looks at the jobs again at once
document.addEventListener("visibilitychange", () => { if (document.visibilityState !== "visible") return; if (jobs.length) { try { V.resumeJobs ? V.resumeJobs() : V.poll && V.poll(); } catch (e) {} } paintPill(); });

// ---------- the keyboard (M22): the screen shrinks to the space above it, so the words and the button stay in view ----------
if (window.visualViewport) {
  const vv = window.visualViewport;
  const kb = () => { const k = Math.max(0, Math.round(innerHeight - vv.height - vv.offsetTop)), on = k > 80; document.documentElement.style.setProperty("--kb", (on ? k : 0) + "px"); document.body.classList.toggle("kbon", on); if (on && (document.scrollingElement || document.body).scrollTop) window.scrollTo(0, 0); };
  vv.addEventListener("resize", kb); vv.addEventListener("scroll", kb);
}

// ---------- the desktop's windows on the phone (M6, M25): no keyboard popping up by itself, phone words ----------
let downAt = null; document.addEventListener("pointerdown", (e) => { downAt = e.target; }, true);
document.addEventListener("focusin", (e) => {
  const t = e.target;
  if (!t || !t.matches || !t.matches("input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]),textarea")) return;
  if (!t.closest("#deskhost .modal, #deskhost .dpop, #deskhost .overlay")) return;
  if (downAt && (downAt === t || (downAt.closest && downAt.closest("label") && downAt.closest("label").contains(t)))) return; // (you tapped the box)
  t.blur(); // (a window that focuses its search box would bring the keyboard up over half of it)
}, true);
const wordsIn = (root) => {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement && /^(SCRIPT|STYLE|TEXTAREA)$/.test(n.parentElement.tagName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
  for (let n = w.nextNode(); n; n = w.nextNode()) { const v = n.data; if (!/click|drag|canvas|mouse|Shift|Ctrl|\bPC\b/i.test(v)) continue; const p = phoneWords(v); if (p !== v) n.data = p; }
};
let dkWordsT = 0;
// (final, phone-04) the Options board's grid scrolls sideways on a phone: a line above it says so while there are 2+ options
function optSwipe() {
  const og = deskHost.querySelector("#optModal .optgrid"); if (!og) return;
  let p = og.previousElementSibling; if (!p || !p.classList.contains("phswipe")) { p = h("p", { class: "phswipe" }, "Swipe the options sideways to see each one."); og.before(p); }
  p.hidden = !(+og.style.getPropertyValue("--cols") > 1);
}
new MutationObserver(() => { clearTimeout(dkWordsT); optSwipe(); dkWordsT = setTimeout(() => deskHost.querySelectorAll(".modal:not([hidden]), .overlay.liftov, .ctx, .dpop:not([hidden]), .pflow:not([hidden])").forEach(wordsIn), 80); }).observe(deskHost, { childList: true, subtree: true });

// ---------- Sheets, the phone's own screen (big:4, M3), over the project's sheets (V.G.sheets, sheets.js) ----------
let shCur = 0, shSel = null;
$("#tsMenu").innerHTML = icon("more"); $("#tlMenu").innerHTML = icon("more");
// sheets.js keeps its own copy of the open document: open (and close) its page once so it is this project's
function sheetsDesk(fn) { liftingPage = true; try { fn(); } catch (e) { console.warn("sheets", e); } finally { try { V.setView("canvas"); } catch (e) {} liftingPage = false; } }
function syncSheets() {
  const S = V.G.sheets; if (!S || !S.pages || !S.pages.length) return false;
  if (V.sheetsTest.S !== S) sheetsDesk(() => V.openSheets());
  return V.sheetsTest.S === V.G.sheets;
}
const sheetsAdd = (nodes) => sheetsDesk(() => V.openSheets(nodes));
const phoneSvg = (p, i, n) => V.sheetsTest.pageSvg(p, i, n, true).replace(/Drop a picture here/g, "Tap to add a picture").replace(/Double-click to type/g, "Tap to type").replace(/Click to add a sheet title/g, "Tap to add a sheet title");
function paintSheets() {
  const B = $("#tsBody"); B.innerHTML = "";
  if (!syncSheets()) {
    const n = pics().filter((x) => x.type === "image").length;
    // (fix A3-15: the heading says what to do, not "Sheets" a second time under the screen's own title)
    B.append(h("div", { class: "soon" }, h("span", { class: "bi", html: icon("sheets") }), h("h1", {}, "Make sheets from your pictures"),
      h("p", {}, "Presentation pages for this project: pictures in frames, a title strip, and a PDF to send."),
      h("button", { class: "btn pri cl", disabled: !n, onclick: () => pickMany("Pictures for the sheets", (list) => { sheetsAdd(list); paintSheets(); }) }, h("span", { html: icon("photos"), style: "display:contents" }), h("span", {}, "Choose pictures")),
      h("button", { class: "btn sec", style: "margin-top:12px", onclick: () => { sheetsDesk(() => V.openSheets()); V.changed(); paintSheets(); } }, "Start an empty sheet"),
      n ? null : h("p", { class: "sub", style: "margin-top:14px" }, "Make a render first: sheets are made from this project's pictures.")));
    return;
  }
  const S = V.G.sheets; shCur = Math.max(0, Math.min(shCur, S.pages.length - 1));
  const car = h("div", { class: "pscar" }), dots = h("div", { class: "psdots" }), info = h("p", { class: "psinfo" });
  const paintInfo = () => { const p = S.pages[shCur]; info.textContent = `Page ${shCur + 1} of ${S.pages.length} · ${p.size} ${p.orient}` + (p.title ? " · " + p.title : ""); [...dots.children].forEach((d, k) => d.classList.toggle("on", k === shCur)); };
  S.pages.forEach((p, i) => {
    const box = h("div", { class: "psbox" }, h("div", { class: "psz", html: phoneSvg(p, i, S.pages.length) })), pg = h("div", { class: "pspg" }, box);
    if (shSel && i === shCur) { const r = pg.querySelector(`rect[data-f="${shSel}"]`); if (r) { r.setAttribute("stroke", "#FAAF29"); r.setAttribute("stroke-width", "2.5"); r.setAttribute("vector-effect", "non-scaling-stroke"); } }
    pg.addEventListener("click", (e) => sheetTap(e, p, i));
    V.phoneGestures(box, { temp: true, target: () => box.querySelector(".psz"), on: () => cur === "sheets" });
    car.append(pg); dots.append(h("i"));
  });
  car.addEventListener("scroll", () => { const i = Math.round(car.scrollLeft / Math.max(1, car.clientWidth)); if (i !== shCur && i >= 0 && i < S.pages.length) { shCur = i; shSel = null; paintInfo(); } }, { passive: true });
  const t = (ic, l, fn, cls = "") => h("button", { class: "dt " + cls, onclick: fn }, h("span", { html: icon(ic), style: "display:contents" }), h("small", {}, l));
  const bar = h("div", { class: "psbar" }, t("photos", "Add picture", () => addToSheet()), t("text", "Text", addSheetText), t("sheets", "Page", pageSheet), t("save", "Export PDF", exportSheets, "pri"));
  B.append(info, car, dots, h("p", { class: "pstip" }, "Swipe for the other pages. Tap a frame to put a picture in it, tap a title to type it. Pinch to look closer."), bar);
  paintInfo();
  requestAnimationFrame(() => { car.scrollLeft = shCur * car.clientWidth; });
  setTimeout(() => { if (cur === "sheets" && B.querySelector('text') && /Loading/.test(B.textContent)) paintSheets(); }, 900); // (pictures drawn as they arrive)
}
function sheetTap(e, p, i) {
  if (i !== shCur) return;
  const t = e.target.closest("[data-edit],[data-f]"), S = V.G.sheets;
  if (!t) { if (shSel) { shSel = null; paintSheets(); } return; }
  const done = () => { V.changed(); paintSheets(); };
  if (t.dataset.edit) {
    const key = t.dataset.edit;
    if (key === "proj") return askBox("Project title (every sheet)", S.tb.project || (V.realProjectName ? V.realProjectName() : "")).then((v) => { if (v != null) { S.tb.project = v; done(); } });
    if (key === "sheet") return askBox("This sheet's title", p.title || "").then((v) => { if (v != null) { p.title = v; done(); } });
    if (key.startsWith("cap:")) { const f = p.frames.find((x) => x.id === key.slice(4)), n = f && V.node(f.node); if (n) askBox("Picture title", V.nodeTitle(n)).then((v) => { if (v != null) { V.renameNode(n, v); done(); } }); return; }
  }
  const f = p.frames.find((x) => x.id === t.dataset.f); if (!f) return;
  if (f.kind === "text") return askBox("Text", f.text || "").then((v) => { if (v != null) { f.text = v; done(); } });
  shSel = f.id; haptic(); paintSheets();
  addToSheet(f);
}
function addToSheet(f) {
  const S = V.G.sheets, p = S.pages[shCur];
  pickPicture(f && f.node ? "Change the picture" : "Picture for this frame", null, (m) => {
    let fr = f || p.frames.find((x) => x.kind === "pic" && !x.node);
    if (!fr) { // no empty frame here: a new page after this one, with the same size and layout
      const q = { id: V.uid(), size: p.size, orient: p.orient, layout: p.layout && p.layout !== "free" ? p.layout : "1", title: "", frames: [] };
      S.pages.push(q); V.sheetsTest.applyLayout(q, q.layout); S.pages.splice(S.pages.indexOf(q), 1); S.pages.splice(shCur + 1, 0, q); shCur++;
      fr = q.frames.find((x) => x.kind === "pic");
    }
    if (!fr) return say("This page has no picture frame: choose a layout in the full editor.");
    V.sheetsTest.putPic(fr, m); shSel = null; V.changed(); haptic(); paintSheets();
  }, null, "g3");
}
async function addSheetText() {
  const v = await askBox("Text on this page", ""); if (!v) return;
  const S = V.G.sheets, p = S.pages[shCur], A = V.sheetsTest.areas(p);
  p.frames.push({ id: V.uid(), kind: "text", x: A.C.x, y: A.C.y, w: A.C.w * 0.5, h: 18 * A.k, text: v, pt: 12, bold: false, align: "left" });
  V.changed(); paintSheets(); say("Added. Move or resize it in the full editor (•••).");
}
function pageSheet() {
  const S = V.G.sheets, p = S.pages[shCur], done = () => { V.changed(); haptic(); paintSheets(); };
  sheetRows(`Page ${shCur + 1} of ${S.pages.length}`, [
    ["plus", "Add a page", "After this one, the same size and layout", () => { const q = { id: V.uid(), size: p.size, orient: p.orient, layout: p.layout && p.layout !== "free" ? p.layout : "1", title: "", frames: [] }; S.pages.push(q); V.sheetsTest.applyLayout(q, q.layout); S.pages.splice(S.pages.indexOf(q), 1); S.pages.splice(shCur + 1, 0, q); shCur++; done(); }],
    ["layers", "Duplicate this page", "", () => { const q = JSON.parse(JSON.stringify(p)); q.id = V.uid(); q.frames.forEach((f) => (f.id = V.uid())); delete q.marks; S.pages.splice(shCur + 1, 0, q); shCur++; done(); }],
    ["sheets", "Size: " + p.size + " " + p.orient, "A4, A3, A2 or A1, landscape or portrait", () => sheetRows("Page size", [["A4", "landscape"], ["A4", "portrait"], ["A3", "landscape"], ["A3", "portrait"], ["A2", "landscape"], ["A2", "portrait"], ["A1", "landscape"], ["A1", "portrait"]].map(([s, o]) => [p.size === s && p.orient === o ? "check" : "sheets", `${s} ${o}`, "", () => { V.sheetsTest.resize(p, s, o); done(); }]))],
    ["open", "Full editor (as on the PC)", "Layouts, frames, mark-up, scales", () => fullPage("sheets")],
    S.pages.length > 1 ? ["trash", "Delete this page", "", async () => { if (await confirmBox("Delete this page?", "Its pictures stay in the project.", "Delete", true)) { S.pages.splice(shCur, 1); shCur = Math.max(0, shCur - 1); done(); } }, "bad"] : null,
  ]);
}
function exportSheets() { if (!syncSheets()) return; say("Making the PDF…", 4000); V.sheetsTest.exportPdf().catch((e) => alertBox("Couldn't make the PDF", e.message || String(e))); }
$("#tsMenu").onclick = () => sheetRows("Sheets", [
  ["undo", "Undo", "The last change on the sheets", () => { if (syncSheets()) { V.sheetsUndo(); paintSheets(); } }],
  ["redo", "Redo", "", () => { if (syncSheets()) { V.sheetsRedo(); paintSheets(); } }],
  ["open", "Full editor (as on the PC)", "Layouts, frames, mark-up, scales, export choices", () => { if (!V.G.sheets) sheetsDesk(() => V.openSheets()); fullPage("sheets"); }],
]);
// several of the project's pictures, in the order tapped
function pickMany(title, then) {
  const list = pics().filter((x) => x.type === "image"), chosen = [], body = h("div"), g = h("div", { class: "vgrid g3" });
  const go = h("button", { class: "btn pri", disabled: true, onclick: () => { closeSheet(); then(chosen); } }, "Add");
  list.forEach((m) => { const b = h("button", { class: "pick", onclick: () => { const i = chosen.indexOf(m); if (i >= 0) chosen.splice(i, 1); else chosen.push(m); haptic(); b.classList.toggle("on", chosen.includes(m)); go.disabled = !chosen.length; go.textContent = chosen.length ? `Add ${plural(chosen.length, "picture")}` : "Add"; } }, smallImg(m, ""), h("span", { class: "cap" }, V.nodeTitle(m))); g.append(b); });
  body.append(g, h("div", { class: "stickgo" }, go));
  openSheet(title, { tall: true, body });
}

// ---------- Library, the phone's own screen (big:4, M7), over V.G.library and the office catalogue (library.js) ----------
const LVIEWS = { project: [["furniture", "Furniture & products"], ["material", "Materials"], ["style", "Style boards"]], office: [["sets", "Collections"], ["furniture", "Furniture & products"], ["material", "Materials"]] };
let libQ = "", libSc = false; // (libSc: the Scenes chip is chosen)
const libUse = () => V.libraryTest.lib().items.filter((i) => (i.kind === "furniture" || i.kind === "material") && i.use).length;
function libItems() {
  const L = V.libraryTest, q = libQ.toLowerCase();
  const all = L.scope === "office" ? (L.view === "sets" ? L.CAT.sets : L.CAT.items.filter((i) => i.kind === L.view)) : L.lib().items.filter((i) => i.kind === L.view);
  return all.filter((it) => !q || [it.name, it.maker, it.finish, it.code, it.cat, it.room, it.where, it.product, it.supplier, it.tags, it.prompt, it.notes, it.text].filter(Boolean).join(" ").toLowerCase().includes(q));
}
const libPic = (it) => it.img || (it.imgs && it.imgs[0]) || (it.ids && ((V.libraryTest.CAT.items.find((x) => x.id === it.ids[0]) || {}).img)) || "";
const inRenders = (it) => (V.libraryTest.scope === "office" ? !!V.libraryTest.lib().items.find((p) => p.catId === it.id && p.use) : !!it.use);
function toggleRenders(it) {
  const L = V.libraryTest;
  if (L.scope === "office") { if (!L.useInScene(it)) return say(`Up to ${V.catalogue.MAX_USE} products and materials at once: switch one off first`, 4500); }
  else { if (!it.use && libUse() >= V.catalogue.MAX_USE) return say(`Up to ${V.catalogue.MAX_USE} products and materials at once: switch one off first`, 4500); it.use = !it.use; V.changed(); V.catalogue.refresh(); }
  haptic(); paintLibrary();
}
function paintLibrary() {
  const B = $("#tlBody"), L = V.libraryTest; if (!L) return;
  if (!L.CAT.done) L.loadCat().then(() => { if (cur === "library") paintLibrary(); });
  if (!LVIEWS[L.scope].some(([k]) => k === L.view)) L.view = LVIEWS[L.scope][0][0];
  const keepFocus = document.activeElement && document.activeElement.id === "libFind";
  B.innerHTML = "";
  const seg = h("div", { class: "seg even" }, [["project", "This project"], ["office", "Office catalogue"]].map(([k, l]) => h("button", { class: L.scope === k ? "on" : "", onclick: () => { L.scope = k; L.view = LVIEWS[k][0][0]; V.store.set("libScope", k); V.store.set("libView", L.view); haptic(); paintLibrary(); } }, l)));
  const find = h("div", { class: "search", html: icon("search") }), inp = h("input", { class: "inp", id: "libFind", type: "search", value: libQ, placeholder: L.scope === "office" ? "Find in the office catalogue" : "Find in this project's Library", "aria-label": "Find", autocomplete: "off" });
  inp.addEventListener("input", () => { libQ = inp.value; paintGrid(); }); find.append(inp);
  // (fix A3-14) a Scenes chip, as the desktop Library's "Scenes and example pictures →": the one-click scenes, each a tap
  // from rendering a picture with it
  const chips = h("div", { class: "chips" }, LVIEWS[L.scope].map(([k, l]) => h("button", { class: !libSc && L.view === k ? "on" : "", onclick: () => { libSc = false; L.view = k; V.store.set("libView", k); paintLibrary(); } }, l)),
    h("button", { class: libSc ? "on" : "", onclick: () => { libSc = true; haptic(); paintLibrary(); } }, "Scenes"));
  if (libSc) inp.placeholder = "Find a scene: dusk, rain, snow, café…";
  const head = libSc ? h("div", { class: "sech" }, h("h3", {}, "One-click scenes"), h("button", { class: "link", onclick: () => waitModal(() => V.openScenePictures()) }, "Example pictures"))
    : h("div", { class: "sech" }, h("h3", {}, L.scope === "office" ? "Shared by every project" : "For " + projName()), h("button", { class: "link", onclick: addSheet }, "+ Add"));
  const grid = h("div", { class: libSc ? "scgrid" : "lgrid" });
  const paintGrid = () => {
    if (libSc) return paintSceneGrid(grid);
    grid.innerHTML = ""; const list = libItems();
    if (!list.length) return grid.append(h("div", { class: "empty", style: "grid-column:1/-1" }, h("b", {}, libQ ? "Nothing matches" : "Nothing here yet"), libQ ? "Try another word." : L.view === "sets" ? "Collections are made in the full editor (•••) from ticked catalogue items." : "Add with + Add: take a photo, choose one from Photos, or use one of your pictures."));
    list.forEach((it, i) => {
      const can = it.kind === "furniture" || it.kind === "material", on = can && inRenders(it);
      const c = h("button", { class: "lcard", style: `animation-delay:${Math.min(i, 8) * 30}ms`, onclick: (e) => { if (e.target.closest(".use")) return; itemSheet(it); } },
        libPic(it) ? h("img", { class: "th", src: libPic(it), alt: "", loading: "lazy", decoding: "async" }) : h("span", { class: "th", html: icon(it.kind === "set" ? "grid" : "library") }),
        h("span", { class: "cap" }, h("b", {}, it.name || "Untitled"), h("small", {}, it.kind === "set" ? plural(it.ids.length, "item") : [it.maker || it.where || it.cat, it.finish || it.product].filter(Boolean).join(" · ") || (it.kind === "style" ? plural((it.imgs || []).length, "picture") : ""))),
        can ? h("span", { class: "use" + (on ? " on" : ""), role: "switch", "aria-checked": on, onclick: () => toggleRenders(it) }, h("span", { html: icon(on ? "check" : "plus"), style: "display:contents" }), on ? "In renders" : "Use") : null);
      grid.append(c);
    });
  };
  B.append(seg, find, chips, head, grid); paintGrid();
  requestAnimationFrame(() => { const on = chips.querySelector(".on"); if (!on) return; const a = on.getBoundingClientRect(), b = chips.getBoundingClientRect(); if (a.right > b.right) chips.scrollLeft += a.right - b.right + 16; }); // (the chosen chip in view)
  if (L.scope === "project" && !libSc) B.append(h("p", { class: "sub", style: "margin-top:14px" }, `${libUse()} of ${V.catalogue.MAX_USE} products and materials go with every render.`));
  if (keepFocus) { inp.focus(); try { inp.setSelectionRange(inp.value.length, inp.value.length); } catch (e) {} }
}
// the scenes in the Library (A3-14): found by name or mood words, as the scene sheet; a tap offers to render with it
function paintSceneGrid(grid) {
  grid.innerHTML = ""; const words = libQ.toLowerCase().split(/\s+/).filter(Boolean);
  const list = scenes().filter((s) => !words.length || words.every((w) => ((V.sceneMoodHay ? V.sceneMoodHay(s.id) : "") + " " + s.name + " " + (s.label || "") + " " + SCENE_TABS[s.mode]).toLowerCase().includes(w)));
  if (!list.length) return grid.append(h("p", { class: "none", style: "grid-column:1/-1" }, "No scene matches. Try another word."));
  list.forEach((s) => grid.append(h("button", { class: "sct", onclick: () => sceneUse(s) }, artOf(s), h("span", { class: "cap" }, h("b", {}, s.name), h("small", {}, `${SCENE_TABS[s.mode]} · ${s.label || ""}`)))));
}
function sceneUse(s) {
  const imgs = pics().filter((x) => x.type === "image");
  sheetRows(s.name, [
    ["scene", "Render a picture with it", imgs.length ? "Choose one of this project's pictures" : "Add a picture first: take a photo or choose one", () => (imgs.length ? pickPicture("Render with " + s.name, null, (m) => openPicture(m, { sceneId: s.id }), null, "g3") : homeNow())],
    ["photos", "Example pictures", "Each scene drawn on a standard picture (the AI draws any not made yet: it shows the cost first)", () => waitModal(() => V.openScenePictures())],
    ["sliders", "Build your own…", "The Scene builder, as on the PC", () => waitModal(() => V.openEnv(null, s.mode))],
  ]);
}
// an item's details as a sheet (the full editor has every field)
function itemSheet(it) {
  const L = V.libraryTest, office = L.scope === "office", body = h("div", { class: "libed" });
  const save = () => { if (office) V.catalogue.put(it); else { V.changed(); V.catalogue.refresh(); } };
  let saveT = 0; const later = () => { clearTimeout(saveT); saveT = setTimeout(save, 400); };
  const field = (label, key, ph) => { const el = h("input", { class: "inp", value: it[key] || "", placeholder: ph || "", autocomplete: "off" }); el.oninput = () => { it[key] = el.value; later(); }; return h("label", { class: "field" }, h("span", {}, label), el); };
  const area = (label, key, ph) => { const el = h("textarea", { class: "inp", rows: 3, placeholder: ph || "" }); el.value = it[key] || ""; el.oninput = () => { it[key] = el.value; later(); }; return h("label", { class: "field" }, h("span", {}, label), el); };
  if (libPic(it)) body.append(h("div", { class: "pic" }, h("img", { src: libPic(it), alt: "" })));
  if (it.kind === "set") {
    body.append(field("Name", "name"), area("Words it adds to the render", "prompt"));
    const members = it.ids.map((id) => L.CAT.items.find((x) => x.id === id)).filter(Boolean);
    body.append(h("div", { class: "lab" }, plural(members.length, "item")), h("div", { class: "vgrid g3" }, members.map((m) => h("div", { class: "pick" }, h("img", { src: m.img || "", alt: "" }), h("span", { class: "cap" }, m.name)))));
    body.append(h("button", { class: "btn pri", style: "margin-top:14px", onclick: () => { closeSheet(); const r = V.catalogue.useSet(it); say(r && r.left && r.left.length ? `In this scene, except ${r.left.length} (6 at most)` : "In this scene: it goes with every render"); paintLibrary(); } }, "Use in this scene"));
  } else if (it.kind === "style") {
    body.append(field("Name", "name"), area("How it looks (words for the render)", "text", "Describe the style, or use Describe with AI in the full editor"));
  } else {
    body.append(field("Name", "name"));
    if (it.kind === "furniture") body.append(field("Maker", "maker"), field("Finish", "finish", "e.g. oiled oak, boucle cream"), field("Code", "code"), field("Room", "room"));
    else body.append(field("Where it goes", "where", "e.g. the front wall, the floor"), field("Product or RAL colour", "product", "e.g. RAL 7016"), field("Supplier", "supplier"));
    body.append(area("Notes", "notes"));
    const on = inRenders(it);
    body.append(h("div", { class: "sw", role: "switch", "aria-checked": on, onclick: () => { closeSheet(); toggleRenders(it); } }, h("div", { class: "ot" }, h("b", {}, "In renders"), h("small", {}, `Goes with every render (${libUse()} of ${V.catalogue.MAX_USE} in use)`)), h("span", { class: "tog" + (on ? " on" : "") })));
    if (!office) body.append(h("button", { class: "btn sec", style: "margin-bottom:10px", onclick: () => { try { L.saveToCatalogue(it); say("Saved to the office catalogue"); } catch (e) { alertBox("Couldn't save it", e.message); } closeSheet(); } }, "Save to the office catalogue"));
  }
  body.append(h("button", { class: "btn sec", style: "margin-bottom:10px", onclick: () => { closeSheet(); fullPage("library"); } }, "Full editor (as on the PC)"),
    h("button", { class: "btn bad", onclick: async () => {
      if (!(await confirmBox(`Delete "${it.name || "this"}"?`, office ? "It goes from the office catalogue on this phone (and from your Google Drive's copy when it syncs)." : "It goes from this project's Library.", "Delete", true))) return;
      if (office) { if (it.kind === "set") { L.CAT.sets.splice(L.CAT.sets.indexOf(it), 1); try { await V.catalogue.raw.del(it); } catch (e) {} } else await V.catalogue.remove(it); }
      else { const a = L.lib().items; a.splice(a.indexOf(it), 1); V.changed(); }
      V.catalogue.refresh(); closeSheet(); haptic(); paintLibrary();
    } }, "Delete"));
  openSheet(it.name || "Item", { tall: true, body, done: () => { clearTimeout(saveT); save(); if (cur === "library") paintLibrary(); } });
}
// + Add: a photo, a picture from Photos, or one of this project's pictures
const libFile = (cam) => { const i = h("input", { type: "file", accept: "image/*", "data-phone": "1", style: "position:fixed;left:-99px;width:1px;height:1px;opacity:0", ...(cam ? { capture: "environment" } : { multiple: true }) }); i.onchange = async () => { const fs = [...i.files]; i.remove(); if (!fs.length) return; const list = []; for (const f of fs) { try { list.push({ src: await toDataUrl(f), name: f.name }); } catch (e) {} } const n = await V.libraryTest.addPictures(list, true); say(n ? `${plural(n, "picture")} added to the Library` : "Couldn't read that picture"); paintLibrary(); }; document.body.append(i); i.click(); };
function addSheet() {
  const L = V.libraryTest; if (L.view === "sets") { L.view = "furniture"; V.store.set("libView", "furniture"); }
  const what = { furniture: "a product", material: "a material sample", style: "a style board picture" }[L.view] || "a picture";
  sheetRows("Add " + what, [
    ["camera", "Take a photo", "Opens the camera", () => libFile(true), "", true],
    ["photos", "Choose from Photos", "One or several", () => libFile(false), "", true],
    ["grid", "From your pictures", "One of this project's pictures", () => pickPicture("From your pictures", null, async (m) => { await V.libraryAdd(m); say("Added to the Library"); paintLibrary(); }, null, "g3")],
  ]);
}
$("#tlMenu").onclick = () => sheetRows("Library", [
  ["open", "Full editor (as on the PC)", "Every field, collections, starter libraries, export and import", () => fullPage("library")],
  ["library", "Furniture & materials in renders", "The picker: what goes with every render", () => waitModal(() => V.openPicker()).then(() => paintLibrary())],
]);
const startMs = () => { try { const m = performance.getEntriesByName("vl-home")[0]; return m ? m.startTime : 0; } catch (e) { return 0; } };

// ================= v3.74 D3: the phone catches up with rounds B and C (NEXT-LEVEL N16, second half) =================
// Everything here drives the desktop's own code (V.versionSet, V.tweak, V.versionsOf / V.pickApi, V.present, V.jobClock,
// V.openPresentFlow, V.openOptionsBoard, V.openClientPack, V.openSetups, V.selActions / V.forSelection, V.binOpen,
// V.openStatus); the phone only lays it out for a finger.
Object.assign(ICON, {
  pickbest: '<rect x="2.5" y="5" width="8" height="12" rx="1.5"/><rect x="13.5" y="5" width="8" height="12" rx="1.5"/><path d="M15 11l1.8 1.8L20 9.5"/>',
  present: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M12 16v4M8 20h8"/><path d="M10.5 8v4.5l4-2.25z"/>',
  hand: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11M11 10V4.5a1.5 1.5 0 0 1 3 0V11M14 10.5V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-.5a6 6 0 0 1-4.6-2.2L3.6 15a1.5 1.5 0 0 1 2.2-2l2.2 2"/>',
  setup: '<rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M7.5 9h9M7.5 13h9M7.5 17h5"/>',
  bin: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/><path d="M3 4.5l2 1"/>',
  pulse: '<path d="M3 12h4l2.5-6 4 12 2.5-6H21"/>',
  pack: '<path d="M4 8l8-4 8 4v9l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v9"/>',
});

// ---------- the versions strip on Result (N3, N7): the picture's versions, a round's versions together ----------
let stripKey = "";
function paintStrip() {
  const S = $("#rStrip"), n = rRec; if (!S) return;
  const list = n ? versions(n) : [];
  if (list.length < 2) { S.hidden = true; S.innerHTML = ""; stripKey = ""; return; }
  const key = list.map((x) => [x.id, x === n ? 1 : 0, x.pick ? 1 : 0, x.hero ? 1 : 0, x.fav ? 1 : 0, V.nodeTitle(x)].join(":")).join("|");
  S.hidden = false; if (key === stripKey) return; stripKey = key; S.innerHTML = "";
  let grp = null, gid = null;
  list.forEach((x) => {
    const rid = x.round && x.round.n > 1 ? x.round.id : null;
    if (rid !== gid) { gid = rid; grp = rid ? h("div", { class: "vgrp" }, h("span", { class: "vglab" }, `Round · ${x.round.n} versions`)) : null; if (grp) S.append(grp); }
    const b = h("button", { class: "vth" + (x === n ? " on" : ""), role: "option", "aria-selected": String(x === n), onclick: () => { if (x !== n) { haptic(); openResult(x); } } },
      h("span", { class: "vpic" }, smallImg(x, ""), x.hero ? h("span", { class: "vmk" }, "Hero") : x.pick ? h("span", { class: "vmk" }, "Pick") : null, x.fav ? h("span", { class: "vfav", html: icon("star") }) : null),
      V.titleEl ? V.titleEl(x, "small") : h("small", {}, V.nodeTitle(x))); // (cut from the middle: the version's own last part stays)
    longPress(b, () => picSheet(x));
    (grp || S).append(b);
  });
  // (final, phone-12) the chosen one in view with its round's heading readable: the whole group when it fits, else the
  // thumb kept clear of the edge by the strip's own padding
  const on = S.querySelector(".vth.on"); if (on) requestAnimationFrame(() => {
    const g = on.closest(".vgrp"), pad = parseFloat(getComputedStyle(S).paddingLeft) || 16, sr = S.getBoundingClientRect();
    const el = g && g.offsetWidth <= sr.width - 2 * pad ? g : on, r = el.getBoundingClientRect();
    if (r.left < sr.left + pad) S.scrollLeft += r.left - sr.left - pad; else if (r.right > sr.right - pad) S.scrollLeft += r.right - sr.right + pad;
  });
}
// the pager's dots give way to the strip; its line still says where you are
const pager0 = paintPager;
paintPager = function () { pager0(); const d = $("#rDots .dots"); if (d) d.remove(); };

// ---------- tweak and relight chips (N8): always an edit of THIS picture, it lands compared with Keep / Discard ----------
const TWK = ["render", "new", "upscale", "touchup", "photo"];
const tweakable = (n) => !!n && !!V.tweak && n.type === "image" && isPic(n) && TWK.includes(V.pictureKind(n)) && !V.isCapture(n);
function paintTweakRow() {
  const B = $("#rTweak"), n = rRec; if (!B) return;
  B.hidden = !tweakable(n) || !!rPend; B.innerHTML = ""; if (B.hidden) return;
  const which = store.get("twRow", "tweak") === "relight" ? "relight" : "tweak";
  const seg = h("div", { class: "seg twseg" }, [["tweak", "Tweak"], ["relight", "Relight"]].map(([k, l]) => h("button", { type: "button", class: k === which ? "on" : "", "aria-pressed": String(k === which), onclick: () => { store.set("twRow", k); haptic(); paintTweakRow(); } }, l)));
  const row = h("div", { class: "chips twchips", role: "group", "aria-label": which === "relight" ? "Relight this picture" : "Tweak this picture" });
  V.tweaks().filter((t) => t.row === which).forEach((t) => {
    const run = V.tweakRunning(n, t.id).length > 0 || jobs.some((j) => !j.stopped && j.src === n && j.tweak === t.id);
    row.append(h("button", { type: "button", class: "twc" + (run ? " run" : ""), disabled: run, "aria-busy": run ? "true" : null, onclick: () => doTweak(n, t.id) }, run ? h("i", { class: "spin", "aria-hidden": "true" }) : null, t.name));
  });
  B.append(h("div", { class: "twhead" }, seg, h("small", {}, which === "relight" ? "New light, the same picture" : "One tap, the rest kept")), row);
}
async function doTweak(n, id) {
  const t = V.tweaks().find((x) => x.id === id); if (!t || !n) return;
  let res = resText(n); try { if (!res) res = resOf(await dimsOf(n)); } catch (e) {}
  const title = (t.row === "relight" ? "Relight: " : "Tweak: ") + t.name;
  haptic();
  const go = runJob(n, title, cfg.model, async (m) => { V.engines.image = m; setSelect("#resImage", res === "4K" ? "4K" : res || cfg.res); const ok = await V.tweak(n, id); if (!ok) throw new Error(lastErr || "The tweak couldn't be sent"); }, { tweak: id, decide: true, res });
  const j = jobs[jobs.length - 1]; if (j && j.src === n) j.tweak = id;
  setTimeout(paintTweakRow, 50); return go;
}
// the Keep / Discard / Keep both bar, under a result that came from a tweak, a relight or the brush, until it is decided
function paintDecide() {
  const B = $("#rDecide"), n = rRec, p = n && rFrom, c = (n && n.phone) || {};
  const on = !!(n && p && c.decide && !c.decided && V.node(n.id)) && !rPend;
  B.hidden = !on; B.innerHTML = ""; if (!on) return;
  const set = () => { n.phone = Object.assign({}, n.phone, { decided: true }); V.changed(); };
  B.append(h("p", {}, h("b", {}, "Keep the change?"), ` Compared with ${V.nodeTitle(p)}: slide to see both.`),
    h("div", { class: "row" },
      h("button", { class: "btn sec on", onclick: () => { set(); haptic(); paintDecide(); say("Kept"); } }, "Keep"),
      h("button", { class: "btn sec", onclick: () => { V.snapshot("Discard " + V.nodeTitle(n)); V.removeNodes([n.id]); V.render(); V.changed(true); haptic(); stack.pop(); openResult(p); sayAct("Discarded", null, "Undo", () => { V.undo(); const b = V.node(n.id); if (b) openResult(b); }); } }, "Discard"),
      h("button", { class: "btn sec", onclick: () => { set(); haptic(); paintDecide(); paintStrip(); say(`Both kept in the versions`); } }, "Keep both")));
}
$("#rArea").onclick = () => openPaint(rRec);

// ---------- Pick the best (N9): two versions, tap the better one; picks, the hero and the end card ----------
const pickable = (n) => !!n && !!V.pickApi && n.type === "image" && isPic(n) && kindOf(n) !== "photo";
function togglePick(n) { V.snapshot(n.pick ? "Pick off" : "Pick"); if (n.pick) delete n.pick; else V.pickApi.setPick(n); V.titlesChanged && V.titlesChanged(); V.changed(true); haptic(); say(n.pick ? `${V.nodeTitle(n)} is this view's pick` : "Pick taken off"); }
function toggleHero(n) { V.snapshot("Hero"); const on = V.pickApi.setHero(n); V.changed(true); haptic(); say(on ? `${V.nodeTitle(n)} is the hero: the one picture for the project` : "Hero taken off"); }
let U = null; // { pair, queue, out, end, win }
function openBest(n) {
  if (!V.versionsOf || !V.pickApi) return say("Pick the best isn't in this copy yet");
  const pool = V.versionsOf(n); if (pool.length < 2) return say("Pick the best needs two or more versions of this view");
  V.snapshot("Pick the best");
  const first = pool.includes(n) ? n : pool[0], rest = pool.filter((x) => x !== first);
  U = { pair: [first, rest[0]], queue: rest.slice(1), out: 0, end: false, win: null, lost: [] };
  nav("duel");
}
function bestFor(o) { const vs = V.versionsOf(o.v); if (vs.length > 1) openBest(vs[0]); else if (vs[0]) openResult(vs[0]); } // (the next view without a pick)
function paintDuel() {
  const B = $("#uBody"); B.innerHTML = ""; if (!U) return;
  $("#uTitle").textContent = U.end ? "Picks" : "Pick the best";
  if (!U.end) {
    const left = U.queue.length;
    B.append(h("p", { class: "sub ucount" }, left ? `${left + 1} still to compare · ${U.out} set aside` : "The last two: the one you keep is the pick"));
    U.pair.forEach((x, side) => {
      const c = h("button", { class: "ucell", "aria-label": `Keep ${V.nodeTitle(x)}`, onclick: () => keepSide(side) }, h("img", { src: x.url, alt: "" }), h("span", { class: "ucap" }, h("b", {}, V.nodeTitle(x)), h("small", {}, "Keep this")));
      V.phoneGestures(c, { temp: true, dbl: false, target: () => c.querySelector("img"), on: () => cur === "duel" }); // (pinch to look closer)
      B.append(c);
    });
    B.append(h("p", { class: "pstip" }, "The other one is set aside: the Picks screen can bring them back. Pinch to look closer."));
    return;
  }
  const picks = V.pickApi.allPicks(), hero = picks.find((x) => x.hero), left = V.pickApi.viewsLeft(), nv = left[0];
  if (U.win) B.append(h("div", { class: "uwin" }, h("img", { src: U.win.url, alt: "" }), h("p", {}, h("b", {}, V.nodeTitle(U.win)), ` is the pick` + (U.out ? ` · ${plural(U.out, "version")} set aside` : ""))));
  B.append(h("div", { class: "sech" }, h("h3", {}, `${plural(picks.length, "pick")}` + (hero ? " · the hero is " + V.nodeTitle(hero) : ""))),
    h("p", { class: "sub" }, hero ? "Tap a pick to make it the hero (again: take it off)." : "No hero yet: tap the pick that should be the hero."),
    // (the hero is a mark on the tile, as on the versions strip; the caption is the plain name)
    h("div", { class: "upicks" }, picks.slice(0, 12).map((x) => h("button", { class: "upk" + (x.hero ? " on" : ""), "aria-pressed": String(!!x.hero), "aria-label": (x.hero ? "Hero: " : "") + V.nodeTitle(x), onclick: () => { V.snapshot("Hero"); V.pickApi.setHero(x); V.changed(true); haptic(); paintDuel(); } }, smallImg(x, ""), x.hero ? h("span", { class: "vmk" }, "Hero") : null, V.titleEl ? V.titleEl(V.nodeTitle(x), "small") : h("small", {}, V.nodeTitle(x))))));
  const lost = U.lost.filter((x) => V.node(x.id) && x.rejected);
  if (lost.length) B.append(h("button", { class: "linkrow", style: "margin-top:10px", onclick: () => { new Set(lost.map((x) => (parentOf(x) || x).id)).forEach((id) => V.unreject(id)); U.lost = []; U.out = 0; haptic(); say(`${plural(lost.length, "version")} back`); paintDuel(); } }, `Bring back the ${plural(lost.length, "version")} set aside`));
  if (nv) B.append(h("button", { class: "btn sec", style: "margin-top:12px", onclick: () => bestFor(nv) }, h("span", { html: icon("pickbest"), style: "display:contents" }), h("span", {}, `Next view: ${V.nodeTitle(nv.v)} (${nv.n})`)));
  B.append(h("div", { class: "rows uend" },
    h("button", { class: "btn pri cl", disabled: !picks.length, onclick: async () => { if (V.sheetsFromPicks) await V.sheetsFromPicks(picks, { hero: hero || null }); else sheetsAdd(picks); V.changed(); shCur = 0; tab("sheets"); } }, h("span", { html: icon("sheets"), style: "display:contents" }), h("span", {}, "Make the sheet")),
    h("button", { class: "btn sec", disabled: !hero, onclick: () => hero && doUpscale(hero) }, h("span", { html: icon("up"), style: "display:contents" }), h("span", {}, hero ? "Upscale the hero" : "Upscale the hero (choose one)")),
    h("button", { class: "btn sec", disabled: !picks.length, onclick: () => saveMany(picks) }, h("span", { html: icon("save"), style: "display:contents" }), h("span", {}, `Save the picks (${picks.length})`)),
    h("button", { class: "btn sec", disabled: !picks.length, onclick: () => presentList(picks) }, h("span", { html: icon("present"), style: "display:contents" }), h("span", {}, "Present the picks"))));
}
function keepSide(side) {
  if (!U || U.end) return;
  const win = U.pair[side], lose = U.pair[1 - side];
  lose.rejected = true; U.out++; U.lost.push(lose); haptic();
  if (U.queue.length) { U.pair = side ? [U.queue.shift(), win] : [win, U.queue.shift()]; V.changed(); V.render(); return paintDuel(); }
  V.pickApi.setPick(win); V.titlesChanged && V.titlesChanged(); V.render(); V.changed(true);
  U.end = true; U.win = win; haptic("success"); paintDuel();
  $("#duel .body").scrollTop = 0;
}
$("#rBest").onclick = () => openBest(rRec);

// ---------- Present (N3): the desktop's own full-screen Present; swipe, hold for the picture it came from ----------
function presentList(list, start = 0) {
  const l = list.filter((x) => isPic(x) && (x.type === "image" || x.type === "video")); if (!l.length) return say("Nothing to present yet");
  closeSheet(); V.present({ list: l, start: Math.max(0, start) }); pushHist();
}
$("#rPresent").onclick = () => { const l = versions(rRec); presentList(l, l.indexOf(rRec)); };
// (the system Back leaves it, as Esc does on the PC)
addEventListener("popstate", () => { if (V.presentOpen && V.presentOpen()) V.presentClose(); }, true);

// ---------- Brush (N10): paint, then "What should be here?" with the desktop's quick chips ----------
const QUICKB = () => (V.brushQuick ? V.brushQuick() : []);
let askedOnce = false;
function whatSheet() {
  const body = h("div", { class: "whatbody" }), inp = h("textarea", { class: "inp", rows: 2, placeholder: "e.g. a red front door", enterkeyhint: "go", "aria-label": "What should be here?" });
  inp.value = $("#aWords").value;
  const go = (label) => { const w = inp.value.trim(); if (!w) { inp.focus(); return say("Say what should be there, or tap a chip"); } $("#aWords").value = w; paintTools(); closeSheet(); doArea(A.rec, { strokes: A.strokes, words: w, size: A.r, label }); };
  body.append(h("div", { class: "chips wchips" }, QUICKB().map((q) => h("button", { type: "button", onclick: () => { if (!q.text) { inp.value = "Change the material to "; inp.focus(); return; } inp.value = q.text; go(q.label); } }, q.label))),
    inp, h("div", { class: "row", style: "margin-top:12px" }, h("button", { class: "btn sec", onclick: () => { $("#aWords").value = inp.value; paintTools(); closeSheet(); } }, "Paint more"), h("button", { class: "btn pri cl", onclick: () => go() }, "Edit")));
  enterGo(inp, () => go());
  openSheet("What should be here?", { body, done: () => { $("#aWords").value = inp.value; paintTools(); } });
}
{ // the first stroke asks; later the button in the foot (or the words box) does
  const c = $("#aCan");
  c.addEventListener("pointerup", () => { if (A && painted() && !askedOnce && !$("#aWords").value.trim()) { askedOnce = true; setTimeout(() => { if (cur === "paint" && !sheetOpen()) whatSheet(); }, 250); } });
  const q = h("div", { class: "chips achips", role: "group", "aria-label": "What should be here?" }, QUICKB().map((x) => h("button", { type: "button", onclick: () => { if (!painted()) return say("Paint over the area first"); if (!x.text) { $("#aWords").value = "Change the material to "; $("#aWords").focus(); paintTools(); return; } $("#aWords").value = x.text; paintTools(); doArea(A.rec, { strokes: A.strokes, words: x.text, size: A.r, label: x.label }); } }, x.label)));
  $("#aWords").before(q);
}
const openPaint0 = openPaint;
openPaint = async (n) => { askedOnce = false; await openPaint0(n); $("#paint h2").textContent = "Brush"; };

// ---------- selecting pictures (N14): History's Select, then what they can do, with counts ----------
let selMode = false; const selIds = new Set();
// (a card tapped while choosing is chosen or let go, not opened)
cardTap = (n, c) => { if (!(selMode && cur === "history")) return false; if (selIds.has(n.id)) selIds.delete(n.id); else selIds.add(n.id); haptic(); c.classList.toggle("chosen", selIds.has(n.id)); c.setAttribute("aria-pressed", String(selIds.has(n.id))); paintSelBar(); return true; };
$("#ySel").onclick = () => { selMode = !selMode; selIds.clear(); haptic(); paintHistory(); };
const paintHistory0 = paintHistory;
paintHistory = function () {
  paintHistory0();
  $("#ySel").textContent = selMode ? "Cancel" : "Select"; $("#ySel").hidden = !pics().length;
  $("#history").classList.toggle("selmode", selMode);
  $$("#yGrid .card").forEach((c, i) => {
    const n = pics()[i]; if (!n) return;
    c.classList.toggle("chosen", selIds.has(n.id)); c.setAttribute("aria-pressed", selMode ? String(selIds.has(n.id)) : null);
    if (selMode) c.append(h("span", { class: "selmk", html: icon("check") }));
  });
  paintSelBar();
};
screens.history = paintHistory;
function paintSelBar() {
  const bar = $("#ySelBar"), ns = [...selIds].map(V.node).filter(Boolean);
  bar.hidden = !selMode; if (!selMode) return;
  $("#ySelN").textContent = ns.length ? `${plural(ns.length, "picture")} chosen` : "Tap pictures to choose them";
  const A2 = $("#ySelActs"); A2.innerHTML = "";
  if (!ns.length || !V.selActions) return;
  const ICO = { upscale: "up", favourite: "star", download: "save", sheets: "sheets", compare: "compare", relight: "sun", retry: "again", aside: "eraser", remove: "trash" };
  const acts = V.selActions(ns);
  acts.push(...(ns.filter(isPic).length ? [{ act: "present", k: ns.filter(isPic).length, short: `Present ${ns.filter(isPic).length}` }] : []));
  acts.forEach((a) => A2.append(h("button", { class: "dt" + (a.cls === "danger" ? " bad" : ""), type: "button", onclick: () => selRun(a.act, ns) }, h("span", { html: icon(ICO[a.act] || "present"), style: "display:contents" }), h("small", {}, a.short.replace(/^Download/, "Save")))));
}
async function selRun(act, ns) {
  V.setSel(ns.map((n) => n.id));
  const done = () => { selIds.clear(); selMode = false; paintHistory(); };
  if (act === "download") return saveMany(ns.filter(isPic));
  if (act === "present") return presentList(ns);
  if (act === "compare") { const [a, b] = ns.filter((x) => isPic(x) && x.type === "image"); done(); return compareTwo(a, b); }
  if (act === "sheets") { sheetsAdd(ns.filter((x) => isPic(x) && x.type === "image")); V.changed(); done(); return tab("sheets"); }
  if (act === "relight") return sheetRows("Relight " + plural(ns.length, "picture"), V.tweaks().filter((t) => t.row === "relight").map((t) => ["sun", t.name, "An edit of each, the rest kept", async () => { relay(); await V.forSelection("relight", ns, t.id); done(); }]));
  if (act === "remove" && !(await confirmBox(`Remove ${plural(ns.length, "picture")}?`, "They go to Recently deleted (Settings) for 30 days.", "Remove", true))) return;
  relay(); await V.forSelection(act, ns); done();
}
// several files at once go to one share sheet (Save Images, AirDrop, Files)
async function saveMany(ns) {
  const files = [];
  for (const n of ns) { try { const b = await blobOf(n.url); files.push(new File([b], fileName(n, /png/.test(b.type) ? "png" : "jpg").replace(/\.(\w+)$/, ` ${files.length + 1}.$1`), { type: b.type })); } catch (e) {} }
  if (!files.length) return;
  try { if (navigator.canShare && navigator.share && navigator.canShare({ files })) { await navigator.share({ files }); return; } } catch (e) { if (e.name === "AbortError") return; }
  for (const f of files) await shareFile(f, f.name);
}

// ---------- presentations, options and the client pack (N12) ----------
const viewPics = () => pics().filter((x) => x.type === "image" && ["view", "photo", "drawing"].includes(V.pictureKind(x)));
function pickViews(title, then) {
  if (!viewPics().length) return alertBox(title, "Add a picture first (a SketchUp screenshot or a photo): a presentation starts from your views.");
  const list = viewPics(), chosen = [], body = h("div"), g = h("div", { class: "vgrid g3" });
  const go = h("button", { class: "btn pri", disabled: true, onclick: () => { closeSheet(); then(chosen); } }, "Choose the views");
  list.forEach((m) => { const b = h("button", { class: "pick", onclick: () => { const i = chosen.indexOf(m); if (i >= 0) chosen.splice(i, 1); else chosen.push(m); haptic(); b.classList.toggle("on", chosen.includes(m)); go.disabled = !chosen.length; go.textContent = chosen.length ? `Use ${plural(chosen.length, "view")}` : "Choose the views"; } }, smallImg(m, ""), h("span", { class: "cap" }, V.nodeTitle(m))); g.append(b); });
  body.append(h("p", { class: "sub" }, "Tap the views to include, in order."), g, h("div", { class: "stickgo" }, go));
  openSheet(title, { tall: true, body });
}
const presentRows = () => [
  ["present", "Make a presentation", "Views › look › render › pick › sheet › share, step by step", () => pickViews("Make a presentation", (vs) => { V.setSel(vs.map((x) => x.id)); deskFlow(() => V.openPresentFlow({ nodes: vs }), { title: "Rendering the presentation", still: () => !!(V.presentFlowOpen && V.presentFlowOpen()) }); })],
  ["grid", "Options board", "Each view in 2 to 4 options (a scene, words or a material), side by side", () => pickViews("Options board", (vs) => { V.setSel(vs.map((x) => x.id)); deskFlow(() => V.openOptionsBoard({ nodes: vs }), { title: "Rendering the options" }); })],
  ["pack", "Client pack", "One file with the picks and before/after sliders, to send", () => waitModal(() => V.openClientPack({}))],
  ["present", "Present", "Full screen: the favourites, else the newest versions", () => { const s = V.presentSet && V.presentSet(); if (s) presentList(s.list, s.start); else say("Nothing to present yet"); }],
];
// Sheets' ••• menu, and More on a picture
{ $("#tsMenu").onclick = () => sheetRows("Sheets", [
  ["undo", "Undo", "The last change on the sheets", () => { if (syncSheets()) { V.sheetsUndo(); paintSheets(); } }],
  ["redo", "Redo", "", () => { if (syncSheets()) { V.sheetsRedo(); paintSheets(); } }],
  ["present", "Present the sheets' pictures", "Full screen, in page order", () => { if (syncSheets()) { closeSheet(); V.present({ from: "sheets" }); pushHist(); } else say("Put a picture on a sheet first"); }],
  ...presentRows().slice(0, 3),
  ["open", "Full editor (as on the PC)", "Layouts, frames, mark-up, scales, export choices", () => { if (!V.G.sheets) sheetsDesk(() => V.openSheets()); fullPage("sheets"); }],
]); }

// ---------- Setups (N14): the desktop's chooser; what it sets comes back into this screen ----------
const deskChoice = () => ({ scene: V.G.scene ? V.G.scene.id || "__desk" : null, words: $("#prompt").value, keep: V.keepModel(), model: V.engines.image, res: ($("#resImage") || {}).value, shape: ($("#arImage") || {}).value, n: ($("#numImage") || {}).value });
async function setupsSheet() {
  await syncDesk(Object.assign({}, C, { model: cfg.model }));
  const was = JSON.stringify(deskChoice());
  relay(6000); await waitModal(() => V.openSetups());
  const now = deskChoice(); if (JSON.stringify(now) === was) return;
  // a setup was used: the scene, words, keep switch, model, size, shape and versions it set are this screen's now
  C.sceneId = now.scene; C.presetId = null; C.fill = {}; C.words = now.words || ""; C.keep = !!now.keep; cfg.keep = C.keep;
  if (IMG().some((e) => e.id === now.model)) cfg.model = now.model;
  if (now.res === "1K" || now.res === "2K") cfg.res = now.res;
  if (SHAPES.some(([v]) => v === now.shape)) cfg.shape = now.shape;
  if ([1, 2, 4].includes(+now.n)) { C.versions = +now.n; cfg.versions = C.versions; }
  $("#pWords").value = C.words; growWords(); paintPicture();
}
const paintEvery0 = paintEvery;
paintEvery = function () {
  paintEvery0();
  if (!V.openSetups) return;
  const n = V.setups ? V.setups().length : 0;
  $("#pEvery").append(h("button", { class: "opt", onclick: setupsSheet }, h("span", { class: "oi ic", html: icon("setup") }), h("span", { class: "ot" }, h("b", {}, n ? `Setups: ${n}` : "Setups"), h("small", {}, n ? "Scene, words, look, model and size in one tap" : "Save what you set up for a kind of shot, use it again in one tap")), h("span", { class: "chev" })),
    h("button", { class: "linkrow", onclick: async () => { await syncDesk(Object.assign({}, C, { model: cfg.model })); relay(6000); waitModal(() => V.saveSetup()); } }, "Save these choices as a setup…"));
};

// ---------- Settings: Recently deleted, the status panel, Setups ----------
// Recently deleted: the desktop's own list (Projects › Recently deleted), shown on its own: the rest of that page is hidden
// (final, phone-03) every way in (the status panel's Open, Ctrl+K's Find) lands on this page, not the hidden desktop's
const binOpen0 = V.binOpen;
if (binOpen0) V.binOpen = () => binPage();
async function binPage() {
  deskPage("projects", "Recently deleted"); await binOpen0();
  const f = $("#binFold");
  if (!f || f.hidden) { back(); return say("Nothing deleted in the last 30 days", 3500); }
  for (let el = f; el && el.parentElement && el.id !== "ovProjects"; el = el.parentElement) [...el.parentElement.children].forEach((c) => { if (c !== el) c.classList.add("phhide"); });
  f.open = true;
}
const paintSettings0 = paintSettings;
paintSettings = async function () {
  await paintSettings0();
  const rows = $("#sBody .set:last-of-type .rows") || [...$$("#sBody .set")].map((s) => s.querySelector(".rows")).filter(Boolean).pop(); if (!rows) return;
  const drow = (ic, t, s, fn) => h("button", { class: "rowbtn", onclick: fn }, h("span", { class: "ti", html: icon(ic) }), h("span", {}, h("b", {}, t), h("small", {}, s)));
  const bn = V.binCount ? V.binCount() : 0;
  rows.prepend(
    V.openStatus ? drow("pulse", "Status", "Google Drive, connection, storage and what is waiting", () => { V.openStatus(); }) : null,
    V.binOpen ? drow("bin", "Recently deleted", bn ? `${plural(bn, "item")}, kept for 30 days` : "Projects and pictures you deleted, for 30 days", binPage) : null,
    V.openSetups ? drow("setup", "Setups", "Saved choices for a kind of shot; one can start every new project", () => { relay(6000); waitModal(() => V.openSetups()); }) : null);
};
screens.settings = paintSettings;

// ---------- the material options strip, quick-picks several at once, Describe it (N13) ----------
// matbucket.js tries several quick-picks as options with Ctrl+click; a long press does it on the phone
document.addEventListener("pointerdown", (e) => {
  const t = e.target.closest && e.target.closest("#deskhost .mqtile"); if (!t || e.pointerType === "mouse") return;
  const x0 = e.clientX, y0 = e.clientY;
  // (the finger lifting afterwards makes a plain click on whatever tile is under it by then: swallowed, as for a long press)
  // (final phone-n1) only that lift's click is swallowed: one on a tile, where the finger was, within 1.5 s. The old general
  // 1.5 s window stayed open when the lift made no click (a long touch often makes none) and ate the next tap on "Use these 2
  // as options" (the tiles are redrawn by the press, so the finger's own pointerup can't be relied on to close it)
  const tm = setTimeout(() => {
    haptic(); t.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, ctrlKey: true }));
    const until = Date.now() + 1500;
    const eat = (ev) => {
      document.removeEventListener("click", eat, true);
      if (Date.now() < until && ev.target.closest && ev.target.closest(".mqtile") && Math.abs(ev.clientX - x0) + Math.abs(ev.clientY - y0) < 40) { ev.preventDefault(); ev.stopImmediatePropagation(); }
    };
    document.addEventListener("click", eat, true); setTimeout(() => document.removeEventListener("click", eat, true), 1500);
  }, 450);
  const off = () => { clearTimeout(tm); removeEventListener("pointerup", off, true); removeEventListener("pointermove", mv, true); };
  const mv = (ev) => { if (Math.abs(ev.clientX - x0) + Math.abs(ev.clientY - y0) > 10) off(); };
  addEventListener("pointerup", off, true); addEventListener("pointermove", mv, true);
}, true);
// the chooser's own hint says Ctrl+click: in phone words
const phoneWords0 = phoneWords;
phoneWords = (s) => phoneWords0(String(s || "").replace(/\s*Find shows favourites with ★\./g, "")
  .replace(/\s*Keys: P picks the version in focus \(Tab to it\), or opens Review\./g, "") /* (final, phone-02: the presentation steps) */
  .replace(/^Setup "([^"]*)" saved:.*$/s, 'Setup "$1" saved. Make › Setups uses it in one tap.') /* (setups.js: no Tools menu or Ctrl+K here) */
  .replace(/Ctrl\+click several/gi, "long-press several").replace(/Click one to use it/gi, "Tap one to use it"));
// the options strip sits under the picture in the lifted Materials (liftSize keeps the picture clear of it)
// (when the options appear, the Materials list folds away so the strip under the picture is in view; the dock's Materials
// list tile brings the list back)
{ const os = $("#mOptStrip"); let was = true;
  if (os && window.ResizeObserver) new ResizeObserver(() => {
    if (!LF) return; requestAnimationFrame(liftSize);
    if (was && !os.hidden && LF.kind === "mats" && !deskHost.classList.contains("listoff")) { deskHost.classList.add("listoff"); syncDock(); say("Your options are under the picture: tap one to look, Choose to keep it", 4500); }
    was = os.hidden;
  }).observe(os); }

// ---------- History full screen (Drive-only): the small preview is shown soft, never stretched, until the picture comes ----------
{
  const im = $("#vImg");
  im.addEventListener("load", () => { const o = vJob && vJob.outputs.find((x) => x.type === "image"); $("#pview").classList.toggle("softpv", !!(o && o.ref && im.getAttribute("src") === o.url)); });
}

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
  try { performance.mark("vl-home"); } catch (e) {}
  resumePending().catch((e) => console.warn("resume", e));
}
window.VLM = { version: VERSION, preview: (n, c) => preview(n, cleanChoice(c)), pics, migrate, kindOf, paintState: () => A && { strokes: A.strokes.length, z: aG.z }, jobs: () => jobs.length, get LF() { return LF; }, get cur() { return cur; }, get stack() { return stack.slice(); } }; // for tests
boot();
})();
