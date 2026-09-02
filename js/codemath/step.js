/**
 * Step — nguồn sự thật DUY NHẤT cho bộ ba code ↔ toán ↔ hình.
 *
 * Codex chỉ ra mâu thuẫn trong plan v1: không thể vừa lưu code dưới dạng chuỗi,
 * vừa nói là sinh nó từ source thật, mà vẫn hứa "không bao giờ lệch".
 *
 * Cách giải: một Step vừa LÀ code chạy thật (`run`), vừa LÀ thứ hiển thị (`code`, `math`).
 * Model thật trong js/ml/* được lắp từ chính các Step này — không tồn tại bản sao thứ hai.
 * Việc `code` mô tả đúng `run` được giữ bằng TEST SỐ HỌC (js/tests/golden.js),
 * không phải bằng lời hứa.
 */

const REQUIRED = ["id", "inputs", "output", "run", "code", "math"];

export function defineStep(spec) {
  for (const k of REQUIRED) {
    if (spec[k] === undefined) throw new Error(`Step "${spec.id ?? "?"}" thiếu trường "${k}"`);
  }
  if (!Array.isArray(spec.inputs)) throw new Error(`Step "${spec.id}": inputs phải là mảng`);
  if (typeof spec.run !== "function") throw new Error(`Step "${spec.id}": run phải là hàm`);

  return Object.freeze({
    id: spec.id,
    inputs: Object.freeze([...spec.inputs]),
    output: spec.output,
    run: spec.run,
    code: spec.code,
    math: spec.math,
    /** Ánh xạ tên biến → khoá phần tử hình vẽ cần làm nổi bật. */
    bind: Object.freeze({ ...(spec.bind || {}) }),
    /** Câu giải thích ngắn hiện dưới panel khi dòng này được chọn. */
    say: spec.say || "",
    /** Hàm định dạng giá trị đầu ra để hiện cạnh công thức. */
    format: spec.format || defaultFormat,
  });
}

function defaultFormat(v) {
  if (typeof v === "number") return fmtNum(v);
  if (Array.isArray(v)) {
    if (v.length <= 4 && v.every((x) => typeof x === "number")) return `[${v.map(fmtNum).join(", ")}]`;
    return `mảng ${v.length} phần tử`;
  }
  return String(v);
}

export function fmtNum(x) {
  if (!Number.isFinite(x)) return String(x);
  if (x === 0) return "0";
  const a = Math.abs(x);
  if (a >= 1e4 || a < 1e-3) return x.toExponential(2);
  return x.toFixed(a < 1 ? 4 : a < 100 ? 3 : 2).replace(/\.?0+$/, "");
}

/**
 * Chạy một chuỗi Step trên state ban đầu, ghi lại mọi giá trị trung gian.
 * Trace chính là thứ cho phép hiện con số cụ thể ngay cạnh ký hiệu toán.
 */
export function runPipeline(steps, initialState) {
  const state = { ...initialState };
  const trace = [];
  for (const s of steps) {
    const args = {};
    for (const key of s.inputs) {
      if (!(key in state)) throw new Error(`Step "${s.id}" cần input "${key}" nhưng chưa có trong state`);
      args[key] = state[key];
    }
    const value = s.run(args);
    state[s.output] = value;
    trace.push({ id: s.id, args, output: s.output, value });
  }
  return { state, trace };
}

/** Gộp một chuỗi Step thành một hàm thường — để js/ml/* dùng như code bình thường. */
export function compile(steps) {
  return (initialState) => runPipeline(steps, initialState).state;
}
