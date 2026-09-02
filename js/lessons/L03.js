/**
 * Bài 3 — Logistic Regression + Cross-entropy + Gradient Descent.
 * Trái tim khoá học: tám dòng code, tám công thức, và ranh giới quyết định xoay dần trước mắt.
 */
import { runPipeline } from "../codemath/step.js";
import { mountCodeMath } from "../codemath/panel.js";
import { createPlot } from "../viz/plot.js";
import { TRAIN_STEPS, train } from "../ml/logreg.js";
import { makeToy2D } from "../data/gen.js";

const EPOCHS = 200;

export default {
  num: 3,
  title: "Logistic Regression, cross-entropy và gradient descent",
  subtitle: "Tám dòng code. Mỗi dòng một công thức. Bấm ▶ để xem chúng học",

  render(root) {
    root.innerHTML = `
      <p>Bài 2 cho ra <code class="inline">z</code>, một số thực không giới hạn. Giờ ta cần hai thứ nữa: một cách biến z thành số đọc được như xác suất, và một cách <b>tự động</b> tìm ra w, b tốt thay vì kéo slider bằng tay.</p>
      <div class="viz" id="viz"></div>
      <p>Dưới đây là <b>một vòng lặp huấn luyện đầy đủ</b>. Giá trị màu xanh cạnh mỗi công thức là số thật ở vòng lặp hiện tại — kéo thanh tua ở trên để xem chúng đổi.</p>
      <div id="cm"></div>

      <h3 class="sec">Vì sao gradient lại gọn đến thế</h3>
      <p>Cross-entropy có <code class="inline">log</code>, sigmoid có <code class="inline">exp</code>. Đạo hàm lẽ ra phải xấu. Nhưng khi ghép đúng cặp này, đạo hàm của σ là <code class="inline">σ(1−σ)</code> và nó triệt tiêu gọn với mẫu số của log, còn lại đúng phần dư <code class="inline">p − y</code>.</p>
      <p>Đó không phải trùng hợp: sigmoid là <i>canonical link</i> của phân phối Bernoulli. Ghép sai cặp — ví dụ sigmoid với sai số bình phương — thì gradient còn thừa thừa số σ(1−σ), và nó tiến về 0 khi mô hình <b>sai một cách rất tự tin</b>, khiến việc học đứng hình đúng lúc cần sửa nhất.</p>

      <h3 class="sec">Đọc hệ số w như thế nào cho đúng</h3>
      <p>Với đặc trưng nhị phân <code class="inline">x_j</code>, khi nó đổi từ 0 sang 1 và <b>mọi biến khác giữ nguyên</b>, odds được nhân với <code class="inline">e^{w_j}</code>. Nếu w_j = log 3,2 thì odds gấp 3,2 lần.</p>
      <div class="note bad"><b>Ba điều kiện thường bị bỏ quên:</b> chỉ đúng cho biến nhị phân (biến liên tục thì là "mỗi đơn vị tăng"), chỉ đúng khi giữ nguyên các biến khác, và chỉ có ý nghĩa nếu các đặc trưng không tương quan mạnh. Trên dữ liệu CDR thật thì <code class="inline">call_count</code> và <code class="inline">unique_clds</code> tương quan rất chặt — đọc riêng lẻ từng hệ số sẽ ra kết luận sai.</div>
    `;

    const { X, y } = makeToy2D({ seed: 11, n: 240, spread: 0.78 });

    const vizBox = root.querySelector("#viz");
    const plot = createPlot(vizBox, { xmin: -3.4, xmax: 3.4, ymin: -3, ymax: 3, height: 400, equal: true });

    const bar = document.createElement("div");
    bar.className = "viz-bar";
    bar.innerHTML = `
      <button class="btn" id="play">▶ Huấn luyện</button>
      <button class="btn ghost" id="one">Một bước</button>
      <button class="btn ghost" id="reset">Đặt lại</button>
      <label class="ctrl">η <input type="range" id="lr" min="0.02" max="3" step="0.02" value="0.6"><output id="lro">0,60</output></label>
      <label class="ctrl">vòng <input type="range" id="ep" min="0" max="${EPOCHS}" step="1" value="0"><output id="epo">0</output></label>
      <div class="readout" id="read"></div>`;
    vizBox.append(bar);

    let history = null, epoch = 0, timer = null, highlight = null;

    function rebuild() {
      const lr = +root.querySelector("#lr").value;
      history = train({ X, y, lr, epochs: EPOCHS, w0: [-1.6, 1.4], b0: 0.9 }).history;
    }

    function currentTrace() {
      const lr = +root.querySelector("#lr").value;
      const h = history[epoch];
      return runPipeline(TRAIN_STEPS, { X, y, w: [...h.w], b: h.b, lr });
    }

    function draw() {
      const h = history[epoch];
      const w = h.w, b = h.b;
      plot.clear();

      // nền tô theo xác suất dự đoán — "shading" trong bind của bước probs
      const cell = highlight === "shading" ? 6 : 10;
      const ctx = plot.ctx;
      for (let px = 0; px < plot.width; px += cell) {
        for (let py = 0; py < plot.height; py += cell) {
          const wx = plot.view.xmin + (px / plot.width) * (plot.view.xmax - plot.view.xmin);
          const wy = plot.view.ymin + (1 - py / plot.height) * (plot.view.ymax - plot.view.ymin);
          const p = 1 / (1 + Math.exp(-(w[0] * wx + w[1] * wy + b)));
          ctx.fillStyle = `rgba(${Math.round(60 + 195 * p)}, ${Math.round(120 - 60 * p)}, ${Math.round(180 - 60 * p)}, ${highlight === "shading" ? 0.42 : 0.2})`;
          ctx.fillRect(px, py, cell, cell);
        }
      }

      plot.grid(1, "rgba(42,52,70,.6)");
      plot.points(X.filter((_, i) => y[i] === 0), { color: "#4da3ff", r: 3, alpha: 0.75 });
      plot.points(X.filter((_, i) => y[i] === 1), { color: "#ff5c7a", r: 3, alpha: 0.85 });

      plot.line2d(w[0], w[1], b, {
        color: "#ffffff",
        width: highlight === "boundary" || highlight === "normal" ? 3.5 : 2.2,
      });

      if (highlight === "gradient" || highlight === "normal") {
        plot.arrow(0, 0, w[0], w[1], { color: "#ffc857", width: 3 });
      }

      // đường loss ở góc
      drawLossCurve();

      const loss = history[epoch].loss;
      plot.labelPx(`vòng ${epoch} / ${EPOCHS}   ·   L = ${Number.isNaN(loss) ? "—" : loss.toFixed(4)}`,
        12, 20, { size: 12.5, color: "#e6ecf5" });
    }

    function drawLossCurve() {
      const ctx = plot.ctx;
      const W = 168, H = 74, X0 = plot.width - W - 14, Y0 = 14;
      const losses = history.slice(1).map((h) => h.loss).filter(Number.isFinite);
      if (!losses.length) return;
      const lo = Math.min(...losses), hi = Math.max(...losses);
      const span = Math.max(hi - lo, 1e-6);

      ctx.save();
      ctx.fillStyle = "rgba(15,20,32,.82)";
      ctx.strokeStyle = highlight === "losscurve" ? "#3ddc97" : "#2a3446";
      ctx.lineWidth = highlight === "losscurve" ? 2 : 1;
      ctx.beginPath(); ctx.roundRect(X0, Y0, W, H, 8); ctx.fill(); ctx.stroke();

      ctx.beginPath();
      losses.forEach((l, i) => {
        const px = X0 + 8 + (i / (losses.length - 1 || 1)) * (W - 16);
        const py = Y0 + 8 + (1 - (l - lo) / span) * (H - 22);
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      });
      ctx.strokeStyle = "#3ddc97"; ctx.lineWidth = 1.8; ctx.stroke();

      if (epoch > 0) {
        const px = X0 + 8 + ((epoch - 1) / (losses.length - 1 || 1)) * (W - 16);
        ctx.strokeStyle = "rgba(230,236,245,.5)";
        ctx.beginPath(); ctx.moveTo(px, Y0 + 6); ctx.lineTo(px, Y0 + H - 8); ctx.stroke();
      }
      ctx.fillStyle = "#94a3b8"; ctx.font = "10px ui-monospace, monospace";
      ctx.fillText("loss", X0 + 8, Y0 + H - 3);
      ctx.restore();
    }

    const cmBox = root.querySelector("#cm");
    rebuild();
    const panel = mountCodeMath(cmBox, {
      steps: TRAIN_STEPS,
      trace: currentTrace().trace,
      onFocus: (step) => { highlight = Object.values(step.bind)[0] || null; draw(); },
    });

    function refresh() {
      panel.update(currentTrace().trace);
      draw();
      root.querySelector("#epo").textContent = epoch;
      root.querySelector("#ep").value = epoch;
      root.querySelector("#lro").textContent = (+root.querySelector("#lr").value).toFixed(2).replace(".", ",");
      const h = history[epoch];
      root.querySelector("#read").innerHTML =
        `w = <b>[${h.w[0].toFixed(3)}, ${h.w[1].toFixed(3)}]</b> · b = <b>${h.b.toFixed(3)}</b>`;
    }

    function stop() {
      clearInterval(timer); timer = null;
      root.querySelector("#play").textContent = "▶ Huấn luyện";
    }

    root.querySelector("#play").addEventListener("click", () => {
      if (timer) return stop();
      if (epoch >= EPOCHS) epoch = 0;
      root.querySelector("#play").textContent = "⏸ Dừng";
      timer = setInterval(() => {
        epoch++;
        if (epoch >= EPOCHS) { epoch = EPOCHS; stop(); }
        refresh();
      }, 40);
    });
    root.querySelector("#one").addEventListener("click", () => {
      stop(); epoch = Math.min(epoch + 1, EPOCHS); refresh();
    });
    root.querySelector("#reset").addEventListener("click", () => { stop(); epoch = 0; refresh(); });
    root.querySelector("#lr").addEventListener("input", () => { stop(); rebuild(); refresh(); });
    root.querySelector("#ep").addEventListener("input", (e) => { stop(); epoch = +e.target.value; refresh(); });
    vizBox.addEventListener("plot:resize", draw);

    refresh();
    root.addEventListener("lesson:leave", stop);
  },
};
