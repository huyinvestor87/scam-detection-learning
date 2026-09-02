/**
 * Sinh dữ liệu có seed — bài học, slider, test và thanh tua đều phải tái lập được
 * (Codex yêu cầu: không dùng Math.random ở bất kỳ đâu ảnh hưởng tới nội dung dạy).
 *
 * Tầng T1 "toy sạch": 2 chiều để vẽ được ranh giới quyết định.
 * Hai đặc trưng lấy đúng tinh thần pipeline thật:
 *   x1 = pct_short_calls  — tỉ lệ cuộc gọi bị ngắt dưới 5 giây
 *   x2 = fanout           — số thuê bao khác nhau được gọi trong cửa sổ, đã chuẩn hoá
 */

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box–Muller, dùng chung một nguồn ngẫu nhiên có seed. */
function gauss(rnd, mu = 0, sd = 1) {
  const u = Math.max(rnd(), 1e-12), v = rnd();
  return mu + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export const FEATURES = [
  { key: "pct_short_calls", label: "tỉ lệ cuộc gọi < 5 giây" },
  { key: "fanout", label: "số thuê bao khác nhau đã gọi (chuẩn hoá)" },
];

/**
 * @returns {{X:number[][], y:number[], scamRate:number}}
 */
export function makeToy2D({ seed = 42, n = 220, scamRate = 0.28, spread = 0.62 } = {}) {
  const rnd = mulberry32(seed);
  const X = [], y = [];
  const nScam = Math.round(n * scamRate);

  for (let i = 0; i < n; i++) {
    const isScam = i < nScam;
    // Tài khoản bình thường: ít cuộc gọi cụt, fanout thấp.
    // Tài khoản lạm dụng: nhiều cuộc bị ngắt ngay + gọi rất nhiều số khác nhau.
    const mx = isScam ? 1.15 : -1.05;
    const my = isScam ? 0.95 : -0.85;
    X.push([gauss(rnd, mx, spread), gauss(rnd, my, spread)]);
    y.push(isScam ? 1 : 0);
  }

  // Xáo trộn có seed để thứ tự không mang thông tin nhãn.
  for (let i = X.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [X[i], X[j]] = [X[j], X[i]];
    [y[i], y[j]] = [y[j], y[i]];
  }

  return { X, y, scamRate: y.reduce((s, v) => s + v, 0) / y.length };
}
