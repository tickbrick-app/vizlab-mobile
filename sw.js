// VizLab Mobile service worker: keeps the app itself on the phone so it opens without a connection.
// Only the app's own files and the Google Fonts files are kept. The AI calls (generativelanguage.googleapis.com) and
// anything else are never cached: they always go to the network.
const CACHE = "vizlab-mobile-3.69.0-53fac434f4";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icons/apple-touch-icon.png", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("vizlab-mobile-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname.endsWith("googleapis.com") && url.hostname !== "fonts.googleapis.com") return; // the AI: never cached
  if (url.origin === self.location.origin) {
    // the app: from the phone straight away (quick, works offline); a page load also checks for a newer copy
    // (after 4 s on a poor connection the kept copy is used, and the newer one is still kept for next time)
    if (req.mode === "navigate") {
      const net = fetch(req).then((r) => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then((x) => x.put("./index.html", c)); } return r; });
      const kept = () => caches.match("./index.html", { ignoreSearch: true });
      e.respondWith(Promise.race([net, new Promise((res) => setTimeout(() => kept().then((k) => k && res(k)), 4000))]).catch(() => kept()));
      return;
    }
    e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req)));
    return;
  }
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open(CACHE).then((c) => c.match(req).then((hit) => hit || fetch(req).then((r) => { if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; }))));
  }
});
