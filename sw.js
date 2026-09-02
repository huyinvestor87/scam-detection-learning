/**
 * Service worker: chạy offline sau lần tải đầu.
 *
 * Chiến lược KHÔNG được là cache-first cho toàn bộ site. Lý do rất cụ thể:
 * tên cache gắn với __BUILD_ID__, mà chuỗi đó chỉ được thay khi deploy bằng
 * GitHub Actions. Nếu Pages đang publish thẳng từ nhánh thì nó ở nguyên dạng
 * literal, tên cache không bao giờ đổi, và người học sẽ kẹt vĩnh viễn ở bản cũ
 * — bài mới push lên cũng không bao giờ thấy. Nên:
 *
 *   - vendor/ và font  → cache-first (bất biến, không bao giờ sửa tại chỗ)
 *   - còn lại          → network-first, rớt mạng mới lấy cache
 *
 * Cách này đúng ở cả hai kiểu publish, và vẫn offline được.
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

const isImmutable = (url) => url.pathname.includes("/vendor/") || /\.(woff2?|ttf)$/.test(url.pathname);

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

function put(request, response) {
  if (response.ok) {
    const copy = response.clone();
    caches.open(CACHE).then((c) => c.put(request, copy));
  }
  return response;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (isImmutable(url)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => put(req, res))));
    return;
  }

  // Network-first: luôn thấy bài mới nhất khi có mạng, vẫn mở được khi mất mạng.
  e.respondWith(
    fetch(req)
      .then((res) => put(req, res))
      .catch(() =>
        caches.match(req).then((hit) => hit || (req.mode === "navigate" ? caches.match("./index.html") : undefined))
      )
  );
});
