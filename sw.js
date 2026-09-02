/**
 * Service worker: chạy offline sau lần tải đầu.
 * Tên cache gắn với BUILD_ID nên mỗi lần deploy là một cache mới — iPad không kẹt bản cũ.
 */
const CACHE = "scam-learn-__BUILD_ID__";

const PRECACHE = [
  "./",
  "./index.html",
  "./css/style.css",
  "./vendor/katex/katex.min.css",
  "./vendor/katex/katex.min.js",
  "./js/app.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(
      (hit) =>
        hit ||
        fetch(e.request).then((res) => {
          if (res.ok && new URL(e.request.url).origin === location.origin) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        })
    )
  );
});
