"""Sinh số vàng cho js/tests/golden.js.

Cài đặt ở đây CỐ TÌNH viết độc lập với bản JS (vòng lặp Python thuần, không dùng
chung một dòng code nào) — nếu hai bên khớp tới 1e-12 thì công thức trong bài học
đúng là công thức đang chạy, chứ không phải một lời hứa suông.

Chạy: python3 tools/make_golden.py
"""
import json
import math
import pathlib

X = [[0.5, -1.2], [-0.3, 0.8], [1.4, 0.2], [-1.1, -0.6], [0.9, 1.7]]
Y = [1, 0, 1, 0, 1]
W = [0.7, -0.4]
B = 0.15
LR = 0.5


def sigmoid(z):
    return 1.0 / (1.0 + math.exp(-z))


zs = [sum(w * x for w, x in zip(W, row)) + B for row in X]
ps = [sigmoid(z) for z in zs]
loss = -sum(y * math.log(p) + (1 - y) * math.log(1 - p) for p, y in zip(ps, Y)) / len(Y)
r = [p - y for p, y in zip(ps, Y)]

n, d = len(X), len(W)
gw = [sum(X[i][j] * r[i] for i in range(n)) / n for j in range(d)]
gb = sum(r) / n
w_new = [W[j] - LR * gw[j] for j in range(d)]
b_new = B - LR * gb

golden = {
    "_comment": "Sinh bởi tools/make_golden.py — cài đặt Python độc lập với JS.",
    "input": {"X": X, "y": Y, "w": W, "b": B, "lr": LR},
    "expect": {
        "affine_score_single": sum(w * x for w, x in zip(W, X[0])) + B,
        "sigmoid_single": sigmoid(sum(w * x for w, x in zip(W, X[0])) + B),
        "zs": zs,
        "ps": ps,
        "loss": loss,
        "r": r,
        "gw": gw,
        "gb": gb,
        "w_after": w_new,
        "b_after": b_new,
    },
}

out = pathlib.Path(__file__).resolve().parent.parent / "fixtures" / "golden.json"
out.parent.mkdir(exist_ok=True)
out.write_text(json.dumps(golden, indent=2), encoding="utf-8")
print(f"Đã ghi {out}")
