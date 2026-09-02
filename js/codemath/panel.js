/**
 * Panel liên kết hai chiều: rê/chạm/tab vào một dòng code → công thức tương ứng
 * sáng lên, giá trị số hiện ra, và hình vẽ được báo để làm nổi bật đại lượng đó.
 *
 * iPad: tap không tương đương hover (Codex nhắc), nên mọi dòng là <button> thật —
 * có trạng thái "đang chọn" rõ ràng, điều hướng được bằng bàn phím, đọc được bằng screen reader.
 */
import { renderMath } from "../mathrender.js";

export function mountCodeMath(root, { steps, trace = [], onFocus = () => {} }) {
  root.innerHTML = "";
  root.className = "codemath";

  const codeCol = el("div", "cm-col");
  const mathCol = el("div", "cm-col");
  codeCol.append(head("Code chạy thật"));
  mathCol.append(head("Toán tương ứng"));

  const say = el("div", "cm-say");
  say.textContent = "Rê chuột hoặc chạm vào một dòng code để xem ý nghĩa toán học của nó.";

  const rows = [];
  const byId = new Map(trace.map((t) => [t.id, t]));

  steps.forEach((s, i) => {
    const btn = el("button", "cm-row");
    btn.type = "button";
    btn.textContent = s.code;
    btn.setAttribute("aria-label", `Dòng ${i + 1}: ${s.code}`);

    const mrow = el("div", "cm-math-row");
    mrow.append(renderMath(s.math));

    const t = byId.get(s.id);
    if (t !== undefined) {
      const val = el("span", "cm-val");
      val.textContent = `${s.output} = ${s.format(t.value)}`;
      mrow.append(val);
    }

    const activate = () => {
      rows.forEach((r) => {
        r.btn.classList.remove("active");
        r.mrow.classList.remove("active");
      });
      btn.classList.add("active");
      mrow.classList.add("active");
      say.innerHTML = s.say ? `<b>${s.output}</b> — ${s.say}` : "";
      onFocus(s, byId.get(s.id));
    };

    btn.addEventListener("mouseenter", activate);
    btn.addEventListener("focus", activate);
    btn.addEventListener("click", activate);
    mrow.addEventListener("mouseenter", activate);

    codeCol.append(btn);
    mathCol.append(mrow);
    rows.push({ btn, mrow, step: s });
  });

  root.append(codeCol, mathCol, say);

  return {
    /** Cập nhật cột giá trị sau mỗi lần chạy lại (đổi slider, chạy thêm vòng lặp…). */
    update(newTrace) {
      const map = new Map(newTrace.map((t) => [t.id, t]));
      rows.forEach(({ mrow, step }) => {
        const t = map.get(step.id);
        const chip = mrow.querySelector(".cm-val");
        if (!t) return;
        const text = `${step.output} = ${step.format(t.value)}`;
        if (chip) chip.textContent = text;
        else {
          const c = el("span", "cm-val");
          c.textContent = text;
          mrow.append(c);
        }
      });
      byId.clear();
      newTrace.forEach((t) => byId.set(t.id, t));
    },
  };
}

function el(tag, cls) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  return n;
}

function head(text) {
  const h = el("div", "cm-head");
  h.textContent = text;
  return h;
}
