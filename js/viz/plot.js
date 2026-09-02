/** Canvas 2D có hệ toạ độ thế giới + HiDPI (Codex nhắc: nhân devicePixelRatio, tránh mờ trên iPad). */

/**
 * @param {object} opts
 * @param {boolean} [opts.equal] Giữ tỉ lệ trục 1:1. BẮT BUỘC cho mọi hình dạy hình học
 *   (vector pháp tuyến, góc vuông, khoảng cách) — trục méo thì hình vẽ nói dối:
 *   w sẽ trông không vuông góc với ranh giới dù toán học nó vuông.
 */
export function createPlot(container, { xmin = -1, xmax = 1, ymin = -1, ymax = 1, height = 380, equal = false } = {}) {
  const canvas = document.createElement("canvas");
  container.append(canvas);
  const ctx = canvas.getContext("2d");
  const view = { xmin, xmax, ymin, ymax };
  const cx = (xmin + xmax) / 2;
  let w = 0, h = 0;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    w = rect.width || container.clientWidth || 600;
    h = height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (equal) {
      const halfX = ((view.ymax - view.ymin) * (w / h)) / 2;
      view.xmin = cx - halfX;
      view.xmax = cx + halfX;
    }
  }

  const sx = (x) => ((x - view.xmin) / (view.xmax - view.xmin)) * w;
  const sy = (y) => h - ((y - view.ymin) / (view.ymax - view.ymin)) * h;

  const api = {
    canvas, ctx, view,
    get width() { return w; },
    get height() { return h; },
    sx, sy,
    resize,

    clear(bg = "#1b2434") {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
    },

    grid(step = 1, color = "#2a3446") {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = Math.ceil(view.xmin / step) * step; x <= view.xmax; x += step) {
        ctx.moveTo(Math.round(sx(x)) + .5, 0); ctx.lineTo(Math.round(sx(x)) + .5, h);
      }
      for (let y = Math.ceil(view.ymin / step) * step; y <= view.ymax; y += step) {
        ctx.moveTo(0, Math.round(sy(y)) + .5); ctx.lineTo(w, Math.round(sy(y)) + .5);
      }
      ctx.stroke();
    },

    axes(color = "#46536b") {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, Math.round(sy(0)) + .5); ctx.lineTo(w, Math.round(sy(0)) + .5);
      ctx.moveTo(Math.round(sx(0)) + .5, 0); ctx.lineTo(Math.round(sx(0)) + .5, h);
      ctx.stroke();
    },

    points(pts, { color = "#4da3ff", r = 3.2, alpha = 1 } = {}) {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      for (const p of pts) {
        ctx.beginPath();
        ctx.arc(sx(p[0]), sy(p[1]), r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },

    /** Vẽ đường thẳng w0*x + w1*y + b = 0 trong khung nhìn hiện tại. */
    line2d(w0, w1, b, { color = "#e6ecf5", width = 2, dash = [] } = {}) {
      ctx.save();
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash);
      ctx.beginPath();
      if (Math.abs(w1) > 1e-9) {
        const yAt = (x) => -(w0 * x + b) / w1;
        ctx.moveTo(sx(view.xmin), sy(yAt(view.xmin)));
        ctx.lineTo(sx(view.xmax), sy(yAt(view.xmax)));
      } else if (Math.abs(w0) > 1e-9) {
        const x = -b / w0;
        ctx.moveTo(sx(x), 0); ctx.lineTo(sx(x), h);
      }
      ctx.stroke();
      ctx.restore();
    },

    arrow(x0, y0, x1, y1, { color = "#ffc857", width = 2.5, headSize = 9 } = {}) {
      const ax = sx(x0), ay = sy(y0), bx = sx(x1), by = sy(y1);
      const ang = Math.atan2(by - ay, bx - ax);
      ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx - headSize * Math.cos(ang - .38), by - headSize * Math.sin(ang - .38));
      ctx.lineTo(bx - headSize * Math.cos(ang + .38), by - headSize * Math.sin(ang + .38));
      ctx.closePath(); ctx.fill();
    },

    label(text, x, y, { color = "#94a3b8", size = 12, align = "left" } = {}) {
      ctx.fillStyle = color;
      ctx.font = `${size}px ui-monospace, Menlo, monospace`;
      ctx.textAlign = align;
      ctx.fillText(text, sx(x), sy(y));
    },

    /** Nhãn theo toạ độ pixel — cho chú thích cố định ở góc. */
    labelPx(text, px, py, { color = "#94a3b8", size = 12, align = "left", box = false } = {}) {
      ctx.font = `${size}px ui-monospace, Menlo, monospace`;
      ctx.textAlign = align;
      if (box) {
        // Nền mờ để chữ không lẫn vào đường vẽ phía sau.
        const tw = ctx.measureText(text).width;
        ctx.fillStyle = "rgba(15,20,32,.78)";
        ctx.beginPath();
        ctx.roundRect(px - 6, py - size - 4, tw + 12, size + 11, 6);
        ctx.fill();
      }
      ctx.fillStyle = color;
      ctx.fillText(text, px, py);
    },
  };

  resize();
  window.addEventListener("resize", () => { resize(); container.dispatchEvent(new CustomEvent("plot:resize")); });
  return api;
}
