/** Đại số tuyến tính tối thiểu. Mọi hàm ở đây đều có test số học trong js/tests/golden.js. */

export function dot(a, b) {
  if (a.length !== b.length) throw new Error(`dot: độ dài lệch (${a.length} vs ${b.length})`);
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

export const norm = (a) => Math.sqrt(dot(a, a));

export const add = (a, b) => a.map((v, i) => v + b[i]);
export const sub = (a, b) => a.map((v, i) => v - b[i]);
export const scale = (a, k) => a.map((v) => v * k);
export const zeros = (n) => new Array(n).fill(0);

/** X (n×d) nhân vector d → vector n. */
export const matVec = (X, v) => X.map((row) => dot(row, v));

/** Xᵀ (d×n) nhân vector n → vector d. Đây là dạng dùng trong công thức gradient. */
export function matTVec(X, v) {
  const d = X[0].length;
  const out = zeros(d);
  for (let i = 0; i < X.length; i++) {
    for (let j = 0; j < d; j++) out[j] += X[i][j] * v[i];
  }
  return out;
}

export const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
