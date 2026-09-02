/**
 * Bài 1 — Thiết kế bài toán và nhãn.
 * Bài này tồn tại vì Codex chê plan v1 nhảy thẳng vào thuật toán mà bỏ qua
 * phần quyết định thành bại: đơn vị dự đoán, nguồn nhãn, và base rate.
 */
import { defineStep, runPipeline, fmtNum } from "../codemath/step.js";
import { mountCodeMath } from "../codemath/panel.js";
import { createPlot } from "../viz/plot.js";
import { withMath } from "../mathrender.js";
import { mulberry32 } from "../data/gen.js";

const tpStep = defineStep({
  id: "tp",
  inputs: ["N", "prevalence", "recall"],
  output: "TP",
  run: ({ N, prevalence, recall }) => N * prevalence * recall,
  code: "const TP = N * prevalence * recall;",
  math: "TP = N\\,P(S)\\,R",
  bind: { TP: "tp" },
  say: "số tài khoản scam bắt được. Recall cao tới đâu cũng không tạo thêm được scam — trần bị chặn bởi số scam thực có.",
  format: (v) => fmtNum(Math.round(v)),
});

const fpStep = defineStep({
  id: "fp",
  inputs: ["N", "prevalence", "fpr"],
  output: "FP",
  run: ({ N, prevalence, fpr }) => N * (1 - prevalence) * fpr,
  code: "const FP = N * (1 - prevalence) * fpr;",
  math: "FP = N\\,(1-P(S))\\,\\mathrm{FPR}",
  bind: { FP: "fp" },
  say: "số tài khoản lành bị chặn oan. Vì (1 − P(S)) gần bằng 1, con số này bám gần như tuyến tính vào FPR — đây chính là chỗ giết chết mô hình trong thực tế.",
  format: (v) => fmtNum(Math.round(v)),
});

const precStep = defineStep({
  id: "precision",
  inputs: ["TP", "FP"],
  output: "precision",
  run: ({ TP, FP }) => (TP + FP === 0 ? 0 : TP / (TP + FP)),
  code: "const precision = TP / (TP + FP);",
  math: "\\mathrm{Precision} = \\frac{TP}{TP+FP} = \\frac{P(S)R}{P(S)R + (1-P(S))\\mathrm{FPR}}",
  bind: { precision: "prec" },
  say: "đây là dạng Bayes viết lại. Thử đặt recall = 0,95 và FPR = 0,01 với prevalence = 1,5% — precision chỉ khoảng 59%. Nghĩa là 4 trong 10 tài khoản bị đội abuse xem xét là oan.",
  format: (v) => (v * 100).toFixed(1) + "%",
});

const STEPS = [tpStep, fpStep, precStep];

export default {
  num: 1,
  title: "Thiết kế bài toán và nhãn",
  subtitle: "Trước khi chọn thuật toán: dự đoán cái gì, nhãn ở đâu ra, và vì sao 'hiếm' đổi mọi thứ",

  render(root) {
    root.innerHTML = `
      <h3 class="sec">Đơn vị dự đoán là gì?</h3>
      <p>Câu hỏi đầu tiên không phải "dùng model nào" mà là <b>một dòng dữ liệu huấn luyện đại diện cho cái gì</b>. Một cuộc gọi? Một số thuê bao? Một tài khoản trong một cửa sổ thời gian?</p>
      <p>Pipeline thật trong repo <code class="inline">scam-detection</code> chọn grain <code class="inline">(customer_id, window)</code> — không phải <code class="inline">cli</code>. Lý do rất cụ thể: một tài khoản lạm dụng có nhiều đường dây và <b>xoay vòng giữa chúng</b> để né giới hạn theo từng line. Gom theo line thì mỗi line trông đều vô hại. Đặc trưng <code class="inline">distinct_cli_used</code> tồn tại chính vì chuyện đó.</p>
      <div class="note"><b>Nhớ:</b> chọn sai grain thì không thuật toán nào cứu được. Enforcement tác động lên tài khoản, nên nhãn và dự đoán cũng phải ở cấp tài khoản.</div>

      <h3 class="sec">Nhãn đến từ đâu — và trễ bao lâu?</h3>
      <p>Nhãn scam không rơi từ trên trời. Nó đến từ khiếu nại của người bị gọi, từ blacklist, hoặc từ tổn thất đã xác nhận. Cả ba đều <b>trễ</b>, <b>thiếu</b> và <b>lệch</b>: chỉ một phần nhỏ nạn nhân khiếu nại, và họ khiếu nại sau nhiều ngày.</p>
      <p>Hệ quả: rất nhiều bản ghi mang nhãn 0 thực chất là scam chưa bị phát hiện. Đây là bài toán <i>positive–unlabeled</i>, không phải phân loại nhị phân sạch sẽ.</p>

      <h3 class="sec">Base rate: vì sao 99% chính xác là vô nghĩa</h3>
      <p>Mỗi chấm dưới đây là một tài khoản. Đỏ là scam. Kéo thanh trượt để thấy tỉ lệ hiếm trông như thế nào.</p>
      <div class="viz" id="viz"></div>
      <p>Bây giờ giả sử có một mô hình rất tốt. Ba dòng code dưới đây tính ra thứ mà đội vận hành thực sự quan tâm: <b>trong số tài khoản bị mô hình tố cáo, bao nhiêu phần trăm đúng là scam?</b></p>
      <div id="cm"></div>
      <div class="note bad"><b>Đây là lý do accuracy vô dụng ở đây:</b> đoán bừa "không ai là scam" cho ngay 98,5% accuracy, và bắt được đúng 0 kẻ lừa đảo.</div>
    `;

    /* ---------------- hình: base rate ---------------- */
    const vizBox = root.querySelector("#viz");
    const plot = createPlot(vizBox, { xmin: 0, xmax: 1, ymin: 0, ymax: 1, height: 300 });

    const bar = document.createElement("div");
    bar.className = "viz-bar";
    bar.innerHTML = `
      <label class="ctrl">Tỉ lệ scam <input type="range" id="prev" min="0.1" max="10" step="0.1" value="1.5"><output id="prevOut">1,5%</output></label>
      <label class="ctrl">Recall <input type="range" id="rec" min="0.5" max="1" step="0.01" value="0.95"><output id="recOut">0,95</output></label>
      <label class="ctrl">FPR <input type="range" id="fpr" min="0.001" max="0.1" step="0.001" value="0.01"><output id="fprOut">0,010</output></label>
      <div class="readout" id="read"></div>`;
    vizBox.append(bar);

    const COLS = 80, ROWS = 34, TOTAL = COLS * ROWS;
    let highlight = null;

    // Rải scam ngẫu nhiên (có seed) khắp lưới thay vì dồn thành khối:
    // cảm giác "hiếm" chỉ thật khi phải đi tìm từng chấm đỏ giữa đám xám.
    const perm = (() => {
      const rnd = mulberry32(2026);
      const a = Array.from({ length: TOTAL }, (_, i) => i);
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      const rank = new Array(TOTAL);
      a.forEach((cellIndex, r) => { rank[cellIndex] = r; });
      return rank;
    })();

    function draw(prevalence, recall, fpr) {
      plot.clear();
      const nScam = Math.round(TOTAL * prevalence);
      const nCaught = Math.round(nScam * recall);
      const nFalse = Math.round((TOTAL - nScam) * fpr);
      const w = plot.width, h = plot.height;
      const cw = w / COLS, ch = (h - 26) / ROWS;
      const ctx = plot.ctx;

      for (let cell = 0; cell < TOTAL; cell++) {
        const c = cell % COLS, r = Math.floor(cell / COLS);
        const i = perm[cell];
        const isScam = i < nScam;
        const caught = i < nCaught;
        const falseAlarm = !isScam && i < nScam + nFalse;

        let color = "#2f3a4d";
        if (isScam) color = caught ? "#ff5c7a" : "#7a3040";
        else if (falseAlarm) color = "#ffc857";

        const dim =
          (highlight === "tp" && !caught) ||
          (highlight === "fp" && !falseAlarm) ||
          (highlight === "prec" && !(caught || falseAlarm));
        ctx.globalAlpha = dim ? 0.16 : 1;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(c * cw + cw / 2, 8 + r * ch + ch / 2, Math.min(cw, ch) * 0.31, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      plot.labelPx(
        `${TOTAL.toLocaleString("vi")} chấm minh hoạ tỉ lệ · đỏ = scam bị bắt · đỏ sẫm = scam lọt lưới · vàng = báo động giả`,
        12, h - 7, { size: 11 });
    }

    /* ---------------- panel code ↔ toán ---------------- */
    const N = 200000;
    const cmBox = root.querySelector("#cm");
    const inputs = {
      prev: root.querySelector("#prev"),
      rec: root.querySelector("#rec"),
      fpr: root.querySelector("#fpr"),
    };

    function currentState() {
      return {
        N,
        prevalence: +inputs.prev.value / 100,
        recall: +inputs.rec.value,
        fpr: +inputs.fpr.value,
      };
    }

    const first = runPipeline(STEPS, currentState());
    const panel = mountCodeMath(cmBox, {
      steps: STEPS,
      trace: first.trace,
      onFocus: (step) => {
        highlight = Object.values(step.bind)[0] || null;
        refresh();
      },
    });

    function refresh() {
      const st = currentState();
      const { state, trace } = runPipeline(STEPS, st);
      panel.update(trace);
      draw(st.prevalence, st.recall, st.fpr);
      root.querySelector("#prevOut").textContent = (+inputs.prev.value).toLocaleString("vi", { minimumFractionDigits: 1 }) + "%";
      root.querySelector("#recOut").textContent = (+inputs.rec.value).toFixed(2).replace(".", ",");
      root.querySelector("#fprOut").textContent = (+inputs.fpr.value).toFixed(3).replace(".", ",");
      const r = root.querySelector("#read");
      r.innerHTML = "";
      r.append(withMath(
        `Trên ${N.toLocaleString("vi")} tài khoản: bắt đúng <b>${Math.round(state.TP).toLocaleString("vi")}</b> · ` +
        `oan <b>${Math.round(state.FP).toLocaleString("vi")}</b> · precision <b>${(state.precision * 100).toFixed(1)}%</b>`
      ));
    }

    Object.values(inputs).forEach((i) => i.addEventListener("input", refresh));
    vizBox.addEventListener("plot:resize", refresh);
    refresh();
  },
};
