// VizLab Mobile service worker: keeps the app itself on the phone so it opens without a connection.
// Only this build's own files and the Google Fonts files are kept. The AI calls (generativelanguage.googleapis.com,
// fal.ai) and anything else are never cached: they always go to the network.
const CACHE = "vizlab-mobile-3.71.0-99d85ee72b";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./desk.js?v=99d85ee72b", "./phone.js?v=99d85ee72b", "./phone.css?v=99d85ee72b", "./desk.css?v=99d85ee72b", "./icons/apple-touch-icon.png", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png"]; // this build's files, with their version stamp (build_mobile.py)

self.addEventListener("install", (e) => {
  // straight from the server (not the browser's own cache), so a new build never mixes with an older file
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("vizlab-mobile-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname.endsWith("googleapis.com") && url.hostname !== "fonts.googleapis.com") return; // the AI: never cached
  if (/(^|\.)fal\.(run|ai|media)$/.test(url.hostname)) return;
  if (url.origin === self.location.origin) {
    // the page: from the phone straight away (quick, works offline); a page load also checks for a newer copy
    // (after 4 s on a poor connection the kept copy is used, and the newer one is still kept for next time)
    if (req.mode === "navigate") {
      const net = fetch(req).then((r) => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then((x) => x.put("./index.html", c)); } return r; });
      const kept = () => caches.match("./index.html", { ignoreSearch: true });
      e.respondWith(Promise.race([net, new Promise((res) => setTimeout(() => kept().then((k) => k && res(k)), 4000))]).catch(() => kept()));
      return;
    }
    // the scripts and styles carry their build's stamp (?v=…): only that exact file is used, never an older build's
    e.respondWith(caches.match(req, { ignoreSearch: !url.search }).then((hit) => hit || fetch(req)));
    return;
  }
  // the libraries the desktop code loads on first use, each at a fixed version (pdf.js and jsPDF from cdnjs,
  // model-viewer from unpkg, three.js and the splat viewer from esm.sh): kept after the first time, so PDFs, sheets
  // and 3D work offline. Their own cache, so a new VizLab build doesn't throw them away.
  if (["cdnjs.cloudflare.com", "unpkg.com", "cdn.jsdelivr.net", "esm.sh"].includes(url.hostname)) {
    e.respondWith(caches.open("vizlab-cdn").then((c) => c.match(req).then((hit) => hit || fetch(req).then((r) => { if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; }))));
    return;
  }
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open(CACHE).then((c) => c.match(req).then((hit) => hit || fetch(req).then((r) => { if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; }))));
  }
});
