/**
 * Contract test: giữ lời hứa "code hiển thị = code chạy" BẰNG SỐ, không bằng tuyên bố.
 *
 * Mỗi Step trong js/ml/logreg.js vừa là thứ bài học hiển thị, vừa là thứ thật sự chạy.
 * Test này chạy chính các Step đó và so với số vàng sinh bởi một cài đặt Python độc lập
 * (tools/make_golden.py). Lệch quá 1e-12 là hỏng.
 *
 * Chạy: node js/tests/golden.js
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { runPipeline } from "../codemath/step.js";
import { PREDICT_STEPS, TRAIN_STEPS } from "../ml/logreg.js";
import { mulberry32, makeToy2D } from "../data/gen.js";

const here = dirname(fileURLToPath(import.meta.url));
const golden = JSON.parse(readFileSync(join(here, "../../fixtures/golden.json"), "utf-8"));
const { X, y, w, b, lr } = golden.input;
const E = golden.expect;

const TOL = 1e-12;
let pass = 0, fail = 0;

function check(name, actual, expected, tol = TOL) {
  const a = Array.isArray(actual) ? actual : [actual];
  const e = Array.isArray(expected) ? expected : [expected];
  const bad = a.length !== e.length || a.some((v, i) => !(Math.abs(v - e[i]) <= tol));
  if (bad) {
    fail++;
    console.error(`  ✗ ${name}\n      chạy ra: ${JSON.stringify(a)}\n      mong đợi: ${JSON.stringify(e)}`);
  } else {
    pass++;
    console.log(`  ✓ ${name}`);
  }
}

console.log("\nDự đoán một cuộc gọi — PREDICT_STEPS");
{
  const { state } = runPipeline(PREDICT_STEPS, { w, x: X[0], b });
  check("z = wᵀx + b", state.z, E.affine_score_single);
  check("p = σ(z)", state.p, E.sigmoid_single);
}

console.log("\nMột vòng gradient descent — TRAIN_STEPS");
{
  const { state, trace } = runPipeline(TRAIN_STEPS, { X, y, w: [...w], b, lr });
  check("zs = Xw + b", state.zs, E.zs);
  check("ps = σ(zs)", state.ps, E.ps);
  check("L (cross-entropy)", state.loss, E.loss, 1e-11);
  check("r = p − y", state.r, E.r);
  check("∇_w L = (1/n)Xᵀr", state.gw, E.gw);
  check("∂L/∂b", state.gb, E.gb);
  check("w sau cập nhật", state.w, E.w_after);
  check("b sau cập nhật", state.b, E.b_after);

  console.log("\nMỗi bước đều có code + công thức đi kèm");
  for (const s of TRAIN_STEPS) {
    const t = trace.find((x) => x.id === s.id);
    const ok = s.code.trim().length > 0 && s.math.trim().length > 0 && t !== undefined;
    ok ? pass++ : fail++;
    console.log(`  ${ok ? "✓" : "✗"} ${s.id}`);
  }
}

console.log("\nSinh dữ liệu tái lập được (seeded)");
{
  const a = makeToy2D({ seed: 42, n: 50 });
  const c = makeToy2D({ seed: 42, n: 50 });
  check("cùng seed → cùng điểm đầu", a.X[0], c.X[0], 0);
  const r1 = mulberry32(1)(), r2 = mulberry32(1)();
  check("mulberry32 tất định", r1, r2, 0);
  const diff = makeToy2D({ seed: 43, n: 50 });
  const same = Math.abs(a.X[0][0] - diff.X[0][0]) < 1e-15;
  same ? fail++ : pass++;
  console.log(`  ${same ? "✗" : "✓"} seed khác → dữ liệu khác`);
}

console.log(`\n${fail === 0 ? "TẤT CẢ ĐẠT" : "CÓ LỖI"} — ${pass} đạt, ${fail} hỏng\n`);
process.exit(fail === 0 ? 0 : 1);
