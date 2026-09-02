/** Bọc KaTeX (vendored, chạy offline). Lỗi cú pháp thì hiện nguyên chuỗi thay vì vỡ trang. */

export function renderMath(tex, { display = false } = {}) {
  const span = document.createElement("span");
  if (typeof window.katex === "undefined") {
    span.textContent = tex;
    return span;
  }
  try {
    window.katex.render(tex, span, { displayMode: display, throwOnError: false, output: "html" });
  } catch {
    span.textContent = tex;
  }
  return span;
}

/** Chèn công thức vào văn bản thường: "loss là $L = -\\log p$ nên..." */
export function withMath(html) {
  const frag = document.createElement("span");
  const parts = String(html).split(/\$([^$]+)\$/g);
  parts.forEach((part, i) => {
    if (i % 2 === 1) frag.append(renderMath(part));
    else frag.append(document.createRange().createContextualFragment(part));
  });
  return frag;
}
