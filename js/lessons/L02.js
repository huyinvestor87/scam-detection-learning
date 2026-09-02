/**
 * Bài 2 — Vector, tích vô hướng, điểm số tuyến tính.
 * Sửa lỗi khái niệm của plan v1 (Codex bắt): wᵀx + b là AFFINE SCORE, không phải phép chiếu.
 */
import { runPipeline } from "../codemath/step.js";
import { mountCodeMath } from "../codemath/panel.js";
import { createPlot } from "../viz/plot.js";
import { scoreStep } from "../ml/logreg.js";
import { dot, norm } from "../ml/linalg.js";
import { makeToy2D, FEATURES } from "../data/gen.js";

const STEPS = [scoreStep];

export default {
  num: 2,
  title: "Vector, tích vô hướng, điểm số tuyến tính",
  subtitle: "Một cuộc gọi là một điểm. Mô hình tuyến tính là một mặt phẳng cắt qua đám điểm đó",

  render(root) {
    root.innerHTML = `
      <p>Mỗi tài khoản trong một cửa sổ thời gian được mô tả bằng một vector đặc trưng. Ở đây dùng hai chiều để vẽ được:</p>
      <p><code class="inline">x₁</code> = ${FEATURES[0].label} · <code class="inline">x₂</code> = ${FEATURES[1].label}</p>
      <p>Mô hình tuyến tính gán cho mỗi điểm một con số duy nhất. Vector <b>w</b> (mũi tên vàng) quyết định <i>hướng</i> nào là đáng ngờ; <b>b</b> quyết định <i>ngưỡng</i> đặt ở đâu.</p>
      <div class="viz" id="viz"></div>
      <div id="cm"></div>

      <h3 class="sec">Vì sao đây KHÔNG phải phép chiếu</h3>
      <p>Rất hay bị gọi nhầm là "chiếu x lên w". Phép chiếu vô hướng thật sự là <code class="inline">wᵀx / ‖w‖</code> — nó chia cho độ dài của w. Còn <code class="inline">z = wᵀx + b</code> thì không chia, và còn cộng thêm b.</p>
      <p>Khác biệt này quan trọng: nhân đôi <b>w</b> làm <b>z</b> tăng gấp đôi nhưng <b>không</b> làm ranh giới quyết định dịch đi chút nào. Kéo hai thanh w₁, w₂ theo cùng tỉ lệ để tự kiểm chứng — đường trắng đứng yên, còn con số z thì đổi.</p>
      <div class="note"><b>Hệ quả thật:</b> độ lớn của z không phải "mức độ tin tưởng". Muốn có con số đọc được như xác suất thì cần sigmoid (bài 3) và sau đó là hiệu chỉnh (bài 7).</div>
    `;

    const { X, y } = makeToy2D({ seed: 7, n: 200 });
    const vizBox = root.querySelector("#viz");
    // equal:true — bài này dạy hình học, trục phải 1:1 thì w mới trông vuông góc với ranh giới
    const plot = createPlot(vizBox, { xmin: -3.2, xmax: 3.2, ymin: -3, ymax: 3, height: 400, equal: true });

    const bar = document.createElement("div");
    bar.className = "viz-bar";
    bar.innerHTML = `
      <label class="ctrl">w₁ <input type="range" id="w0" min="-3" max="3" step="0.05" value="1"><output id="w0o">1,00</output></label>
      <label class="ctrl">w₂ <input type="range" id="w1" min="-3" max="3" step="0.05" value="1"><output id="w1o">1,00</output></label>
      <label class="ctrl">b <input type="range" id="b" min="-3" max="3" step="0.05" value="0"><output id="bo">0,00</output></label>
      <button class="btn ghost" id="pick">Chọn điểm khác</button>
      <div class="readout" id="read"></div>`;
    vizBox.append(bar);

    let idx = 3;              // điểm đang soi
    let highlight = null;

    const getW = () => [+root.querySelector("#w0").value, +root.querySelector("#w1").value];
    const getB = () => +root.querySelector("#b").value;

    function draw() {
      const w = getW(), b = getB(), x = X[idx];
      const z = dot(w, x) + b;

      plot.clear();
      plot.grid(1);
      plot.axes();

      // hai lớp
      plot.points(X.filter((_, i) => y[i] === 0), { color: "#4da3ff", r: 3, alpha: 0.55 });
      plot.points(X.filter((_, i) => y[i] === 1), { color: "#ff5c7a", r: 3, alpha: 0.7 });

      // ranh giới wᵀx + b = 0
      plot.line2d(w[0], w[1], b, {
        color: highlight === "score" ? "#ffffff" : "#c9d4e4",
        width: highlight === "score" ? 3 : 2,
      });

      // vector w từ gốc
      const nw = norm(w) || 1;
      plot.arrow(0, 0, w[0], w[1], {
        color: highlight === "normal" ? "#fff0b8" : "#ffc857",
        width: highlight === "normal" ? 3.5 : 2.5,
      });
      plot.label("w", w[0] * 1.06 + 0.08, w[1] * 1.06 + 0.08, { color: "#ffc857", size: 13 });

      // điểm đang soi + đoạn vuông góc tới ranh giới (khoảng cách = |z|/‖w‖)
      const d = z / (nw * nw);
      plot.ctx.save();
      plot.ctx.setLineDash([4, 4]);
      plot.ctx.strokeStyle = "#3ddc97";
      plot.ctx.lineWidth = 1.6;
      plot.ctx.beginPath();
      plot.ctx.moveTo(plot.sx(x[0]), plot.sy(x[1]));
      plot.ctx.lineTo(plot.sx(x[0] - d * w[0]), plot.sy(x[1] - d * w[1]));
      plot.ctx.stroke();
      plot.ctx.restore();

      plot.points([x], { color: "#3ddc97", r: 6.5 });
      plot.label("x", x[0] + 0.12, x[1] + 0.12, { color: "#3ddc97", size: 13 });

      plot.labelPx(`z = ${z.toFixed(3)}   ·   khoảng cách tới ranh giới = |z|/‖w‖ = ${(Math.abs(z) / nw).toFixed(3)}`,
        14, 22, { size: 12, color: z >= 0 ? "#ff5c7a" : "#4da3ff", box: true });
      plot.labelPx("xanh = tài khoản bình thường · đỏ = lạm dụng", 14, plot.height - 12, { size: 11, box: true });
      return z;
    }

    const cmBox = root.querySelector("#cm");
    const state0 = { w: getW(), x: X[idx], b: getB() };
    const panel = mountCodeMath(cmBox, {
      steps: STEPS,
      trace: runPipeline(STEPS, state0).trace,
      onFocus: (step) => { highlight = Object.values(step.bind)[0] || null; refresh(); },
    });

    function refresh() {
      const w = getW(), b = getB();
      const { trace } = runPipeline(STEPS, { w, x: X[idx], b });
      panel.update(trace);
      const z = draw();
      root.querySelector("#w0o").textContent = w[0].toFixed(2).replace(".", ",");
      root.querySelector("#w1o").textContent = w[1].toFixed(2).replace(".", ",");
      root.querySelector("#bo").textContent = b.toFixed(2).replace(".", ",");
      root.querySelector("#read").innerHTML =
        `Điểm đang soi: nhãn thật <b>${y[idx] === 1 ? "scam" : "bình thường"}</b> · z = <b>${z.toFixed(3)}</b> · ` +
        `mô hình nói <b>${z >= 0 ? "scam" : "bình thường"}</b>`;
    }

    ["#w0", "#w1", "#b"].forEach((s) => root.querySelector(s).addEventListener("input", refresh));
    root.querySelector("#pick").addEventListener("click", () => { idx = (idx + 17) % X.length; refresh(); });
    vizBox.addEventListener("plot:resize", refresh);
    refresh();
  },
};
