/**
 * Logistic Regression — lắp hoàn toàn từ các Step.
 * Không có bản sao code nào khác: thứ hiển thị trong bài học CHÍNH LÀ thứ chạy ở đây.
 */
import { defineStep, runPipeline, compile, fmtNum } from "../codemath/step.js";
import { dot, matVec, matTVec, scale, sub, mean, zeros } from "./linalg.js";

/* ---------------------------------------------------------------- dự đoán 1 cuộc gọi */

export const scoreStep = defineStep({
  id: "affine-score",
  inputs: ["w", "x", "b"],
  output: "z",
  run: ({ w, x, b }) => dot(w, x) + b,
  code: "const z = dot(w, x) + b;",
  math: "z = \\mathbf{w}^\\top\\mathbf{x} + b",
  bind: { z: "score", w: "normal" },
  say: "điểm affine. KHÔNG phải phép chiếu — phép chiếu vô hướng lên hướng w là wᵀx/‖w‖, và cộng thêm b thì càng không còn là chiếu. z chỉ là một số thực, chưa có ý nghĩa xác suất.",
});

export const sigmoidStep = defineStep({
  id: "sigmoid",
  inputs: ["z"],
  output: "p",
  run: ({ z }) => 1 / (1 + Math.exp(-z)),
  code: "const p = 1 / (1 + Math.exp(-z));",
  math: "\\hat p = \\sigma(z) = \\frac{1}{1+e^{-z}}",
  bind: { p: "sigmoid" },
  say: "ép z về khoảng (0,1). Cẩn thận: một số nằm trong (0,1) CHƯA CHẮC là xác suất đúng — muốn đọc nó như xác suất thật thì phải hiệu chỉnh, xem bài 7.",
});

export const PREDICT_STEPS = [scoreStep, sigmoidStep];
export const predictOne = compile(PREDICT_STEPS);

/* ---------------------------------------------------------- một vòng gradient descent */

const EPS = 1e-12;

export const scoresStep = defineStep({
  id: "scores",
  inputs: ["X", "w", "b"],
  output: "zs",
  run: ({ X, w, b }) => matVec(X, w).map((z) => z + b),
  code: "const zs = matVec(X, w).map(z => z + b);",
  math: "\\mathbf{z} = X\\mathbf{w} + b\\mathbf{1}",
  bind: { zs: "boundary" },
  say: "tính điểm affine cho cả n cuộc gọi một lượt.",
  format: (v) => `n=${v.length}`,
});

export const probsStep = defineStep({
  id: "probs",
  inputs: ["zs"],
  output: "ps",
  run: ({ zs }) => zs.map((z) => 1 / (1 + Math.exp(-z))),
  code: "const ps = zs.map(z => 1 / (1 + Math.exp(-z)));",
  math: "\\hat{\\mathbf{p}} = \\sigma(\\mathbf{z})",
  bind: { ps: "shading" },
  say: "áp sigmoid từng phần tử. Đây là thứ tô màu nền trong hình — càng đỏ, mô hình càng nghi là scam.",
  format: (v) => `n=${v.length}`,
});

export const lossStep = defineStep({
  id: "loss",
  inputs: ["ps", "y"],
  output: "loss",
  run: ({ ps, y }) =>
    -mean(ps.map((p, i) => y[i] * Math.log(p + EPS) + (1 - y[i]) * Math.log(1 - p + EPS))),
  code: "const loss = -mean(ps.map((p,i) =>\n    y[i]*Math.log(p) + (1-y[i])*Math.log(1-p)));",
  math: "L = -\\frac{1}{n}\\sum_i\\big[y_i\\log\\hat p_i + (1-y_i)\\log(1-\\hat p_i)\\big]",
  bind: { loss: "losscurve" },
  say: "cross-entropy. Đoán đúng mà chắc chắn → loss ≈ 0; đoán sai mà chắc chắn → loss bùng lên rất nhanh. Đó là lý do nó phạt sự tự tin sai lầm mạnh hơn MSE.",
});

export const errStep = defineStep({
  id: "residual",
  inputs: ["ps", "y"],
  output: "r",
  run: ({ ps, y }) => sub(ps, y),
  code: "const r = sub(ps, y);",
  math: "\\mathbf{r} = \\hat{\\mathbf{p}} - \\mathbf{y}",
  bind: { r: "residual" },
  say: "phần dư. Toàn bộ gradient của logistic regression rút gọn về đúng đại lượng đơn giản này — đó là món quà của việc ghép sigmoid với cross-entropy.",
  format: (v) => `n=${v.length}`,
});

export const gradWStep = defineStep({
  id: "grad-w",
  inputs: ["X", "r"],
  output: "gw",
  run: ({ X, r }) => scale(matTVec(X, r), 1 / r.length),
  code: "const gw = scale(matTVec(X, r), 1 / r.length);",
  math: "\\nabla_{\\mathbf{w}}L = \\frac{1}{n}X^\\top(\\hat{\\mathbf{p}}-\\mathbf{y})",
  bind: { gw: "gradient" },
  say: "gradient theo trọng số. Mũi tên vàng trong hình chính là vector này (đã đảo dấu) — hướng mà loss giảm nhanh nhất.",
});

export const gradBStep = defineStep({
  id: "grad-b",
  inputs: ["r"],
  output: "gb",
  run: ({ r }) => mean(r),
  code: "const gb = mean(r);",
  math: "\\frac{\\partial L}{\\partial b} = \\frac{1}{n}\\sum_i(\\hat p_i - y_i)",
  say: "gradient theo hệ số chặn. Nếu mô hình đang dự đoán tỉ lệ scam cao hơn thực tế thì số này dương, và b sẽ bị kéo xuống.",
});

export const stepWStep = defineStep({
  id: "update-w",
  inputs: ["w", "gw", "lr"],
  output: "w",
  run: ({ w, gw, lr }) => sub(w, scale(gw, lr)),
  code: "w = sub(w, scale(gw, lr));",
  math: "\\mathbf{w} \\leftarrow \\mathbf{w} - \\eta\\,\\nabla_{\\mathbf{w}}L",
  bind: { w: "normal" },
  say: "bước xuống dốc. η là tốc độ học: quá nhỏ thì bò rất lâu, quá lớn thì nhảy qua đáy và loss dao động — kéo thử slider để thấy.",
});

export const stepBStep = defineStep({
  id: "update-b",
  inputs: ["b", "gb", "lr"],
  output: "b",
  run: ({ b, gb, lr }) => b - lr * gb,
  code: "b = b - lr * gb;",
  math: "b \\leftarrow b - \\eta\\,\\frac{\\partial L}{\\partial b}",
  say: "cập nhật hệ số chặn — dịch ranh giới quyết định song song với chính nó.",
});

export const TRAIN_STEPS = [
  scoresStep, probsStep, lossStep, errStep, gradWStep, gradBStep, stepWStep, stepBStep,
];

/** Một vòng lặp. Trả cả trace để panel hiện số cụ thể cạnh từng công thức. */
export function trainStep({ X, y, w, b, lr }) {
  return runPipeline(TRAIN_STEPS, { X, y, w, b, lr });
}

/**
 * Chạy nhiều vòng, lưu snapshot để tua lại (Codex: đừng recompute mù khi kéo thanh tua).
 */
export function train({ X, y, lr = 0.5, epochs = 200, w0 = null, b0 = 0 }) {
  let w = w0 ? [...w0] : zeros(X[0].length);
  let b = b0;
  const history = [{ w: [...w], b, loss: NaN }];
  for (let t = 0; t < epochs; t++) {
    const { state } = runPipeline(TRAIN_STEPS, { X, y, w, b, lr });
    w = state.w; b = state.b;
    history.push({ w: [...w], b, loss: state.loss });
  }
  return { w, b, history };
}

export { fmtNum };
