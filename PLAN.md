# PLAN v2 — `scam-detection`

**Web app học Machine Learning để phát hiện cuộc gọi lừa đảo**
Opus 5 viết v1 → Codex review (`REVIEW-codex.md`) → **v2 này đã sửa theo review** · 2026-09-02
Trạng thái: **chờ Huy duyệt trước khi code**

---

## 0. Codex đã bác điều gì, v2 sửa thế nào

| Codex phản đối | Sửa trong v2 |
|---|---|
| "Phase 1–3 đủ làm hệ thống thật" là vô căn cứ — thiếu split/leakage, định nghĩa nhãn, calibration, đánh giá vận hành | Thêm **Bài 1 (thiết kế bài toán & nhãn)** và **Bài 4 (split & leakage)** vào ngay đầu; calibration lên Bài 7, đi liền cost threshold |
| Thứ tự sư phạm sai: train nhiều model rồi mới học cách đo | Metrics lên **Bài 5**, ngay sau mô hình đầu tiên |
| 5.000 dòng × 1,5% = ~75 positive, không đủ | Nâng lên **50.000 dòng (~750 positive)**, seeded RNG, **3 tầng dữ liệu** (sạch / bẩn / capstone) |
| `codemath.js` mâu thuẫn: vừa lưu code dạng chuỗi vừa nói sinh từ source | Chốt **một nguồn sự thật duy nhất**: Step registry + contract test số học (mục 4.1) |
| 24 bài × song ngữ × ML thuần JS × notebook = phạm vi nhiều tháng | MVP còn **12 bài**, một ngôn ngữ. Audio/Transformer tách thành **Khoá 2** |
| "M1 xong thì 23 bài còn lại chỉ là viết nội dung" — sai nghiêm trọng | Bỏ hẳn câu đó. Mỗi họ thuật toán cần một viz engine riêng; đã tính vào mốc |
| Sai công thức: phép chiếu, Laplace, IDF âm, PageRank, MFCC "cần training" | Đã sửa từng chỗ, xem mục 3 và 7 |
| Thiếu Web Worker, service worker, seeded RNG, test đối chiếu sklearn | Thêm vào mục 4.3 |

Hai chỗ **giữ nguyên** dù Codex đề nghị bỏ: Naive Bayes (giữ, nhưng chuyển sang bài text đúng như Codex nói) và Gradient Boosting (giữ ở mức trực quan — đây là thứ thắng thật trên CDR).

---

## 1. Mục tiêu

Web app học tập trực quan, chạy offline, dạy đủ toán + thuật toán để **tự xây được một hệ thống
phát hiện scam call dùng thật** — không phải chỉ train được một classifier trên bảng đã sạch.

Nguyên tắc xuyên suốt:

> **Mỗi dòng code soi ra một công thức toán, và công thức đó nhìn thấy được đang chạy trên màn hình.**

Ba biểu diễn — **code ↔ toán ↔ hình động** — liên kết hai chiều. Rê/chạm dòng code thì công thức
sáng lên và đại lượng tương ứng trong hình nhấp nháy; kéo slider thì số trong code đổi theo.

Kế thừa `education/`: vanilla ES modules, không build step, SVG/Canvas tự vẽ, deploy GitHub Pages.

---

## 2. Bài toán thật

| Luồng | Dữ liệu | Đặc điểm | Trong MVP? |
|---|---|---|---|
| **A. Metadata / CDR** | số gọi, giờ, thời lượng, tần suất, đồ thị gọi | rẻ, real-time, không xâm phạm nội dung | ✅ trọng tâm |
| **B. Transcript (sau ASR)** | văn bản, đầy lỗi ASR | chính xác hơn, đắt, nhạy cảm | ✅ 2 bài, bám lỗi ASR |
| **C. Audio thô** | sóng âm, MFCC, voice deepfake | nặng nhất | ❌ **Khoá 2** |

**Bốn đặc thù** khiến bài toán này khó hơn phân loại thường — mỗi cái có bài riêng, không phải chú thích:

1. **Mất cân bằng cực đoan** — scam ~0,1–2%. Accuracy 99% là vô dụng. → Bài 5
2. **Chi phí lệch** — FN mất tiền thật, FP mất niềm tin. Ngưỡng phải tính theo chi phí, và **chỉ có nghĩa khi xác suất đã hiệu chỉnh**. → Bài 7
3. **Nhãn trễ, thiếu, nhiễu** — nhãn đến từ khiếu nại/blacklist/tổn thất đã xác nhận, mỗi nguồn lệch một kiểu. → Bài 1
4. **Đối thủ thích nghi** — đổi kịch bản, đổi số, campaign mới. Model trôi. → Bài 12

---

## 3. Lộ trình MVP — 12 bài

Thứ tự đã sửa theo Codex: **thiết kế bài toán → mô hình đầu tiên → cách đo → rồi mới thêm model.**

### Nhóm I — Nền tảng làm đúng (bài 1–5)

**Bài 1 · Thiết kế bài toán và nhãn** *(mới, Codex yêu cầu)*
Đơn vị dự đoán là gì — một cuộc gọi, một số thuê bao, hay một campaign? Nhãn lấy từ đâu? Vì sao
nhãn scam luôn trễ và thiếu. Baseline rule/blacklist trước khi nói tới ML.
Toán: base rate, $P(S)$ nhỏ và hệ quả Bayes — precision trần bị chặn bởi prevalence.
Hình: 1 triệu chấm xám, 1.500 chấm đỏ — thấy tận mắt "hiếm" nghĩa là gì.

**Bài 2 · Vector, tích vô hướng, điểm số tuyến tính**
$z=\mathbf{w}^\top\mathbf{x}+b$ — đây là **affine score**, *không phải* phép chiếu (Codex bắt lỗi v1).
Phép chiếu vô hướng lên hướng $\mathbf w$ là $\frac{\mathbf w^\top\mathbf x}{\lVert\mathbf w\rVert}$; thêm $b$ thì không còn là chiếu.
Hình: cuộc gọi = điểm trong không gian đặc trưng, $\mathbf w$ = pháp tuyến, $b$ = dịch siêu phẳng.

**Bài 3 · Logistic Regression + Cross-entropy + Gradient Descent** ← *trái tim khoá học*
$\hat p=\sigma(z)=\dfrac{1}{1+e^{-z}}$, $\;L=-\dfrac1n\sum_i[y_i\log\hat p_i+(1-y_i)\log(1-\hat p_i)]$,
$\;\nabla_{\mathbf w}L=\dfrac1n X^\top(\hat{\mathbf p}-\mathbf y)$ — dẫn xuất đầy đủ, không giấu bước nào.
Đọc hệ số **kèm điều kiện** (Codex bắt lỗi v1): với $x_j$ nhị phân, odds nhân $e^{w_j}$ khi $x_j$ đổi 0→1, *giữ nguyên các biến khác*.
Cảnh báo ngay tại chỗ: $\hat p\in(0,1)$ **chưa chắc là xác suất đúng** — hẹn Bài 7.
Hình: ranh giới quyết định xoay dần qua từng vòng lặp; đường loss tụt; mặt lỗi 3D.

**Bài 4 · Chia dữ liệu và rò rỉ (leakage)** *(mới, Codex yêu cầu)*
Chia **theo thời gian** (train quá khứ, test tương lai). **Group split** theo số gọi/campaign — cùng
một caller không được nằm cả hai bên. Không tính đặc trưng tương lai cho cuộc gọi quá khứ.
Demo phản chứng: random split cho AUC 0.97, temporal+group split cho 0.78 — **trên cùng model**.
Đây là bài có sức thuyết phục cao nhất khoá học.

**Bài 5 · Đo lường cho lớp hiếm**
Confusion matrix, $P=\frac{TP}{TP+FP}$, $R=\frac{TP}{TP+FN}$, $F_\beta$.
ROC-AUC vs PR-AUC: ROC **không "nói dối"** (sửa cách nói giật gân của v1) — nó chỉ không phản ánh
*số FP tuyệt đối* khi negative áp đảo; PR-AUC thì phụ thuộc mạnh vào prevalence. Dựng cả hai trên
cùng dữ liệu để thấy khác biệt.
Thêm metric vận hành: recall tại mức FP cho phép, precision@K, **số cuộc chặn nhầm trên mỗi triệu cuộc gọi**.

### Nhóm II — Mô hình mạnh hơn (bài 6–8)

**Bài 6 · Regularization và tiền xử lý CDR**
$L+\lambda\lVert\mathbf w\rVert_2^2$ (co đều) vs $\lambda\lVert\mathbf w\rVert_1$ (đẩy về 0, tự chọn đặc trưng).
Kèm phần Codex đòi: missing values, categorical bậc cao (prefix, mã vùng), scaling, rolling-window
features, caller-ID spoofing, entity resolution.

**Bài 7 · Hiệu chỉnh xác suất và ngưỡng theo chi phí** *(nâng từ Phase 6 lên, Codex yêu cầu)*
Reliability diagram, Platt scaling, isotonic regression.
Ngưỡng Bayes khi xác suất đã hiệu chỉnh: $t^*=\dfrac{C_{FP}}{C_{FP}+C_{FN}}$.
Chi phí thực nghiệm $C_{FN}\cdot FN+C_{FP}\cdot FP$ là **tổng chi phí quan sát**, không phải kỳ vọng (sửa v1).
Class weight và SMOTE: dạy **cùng cảnh báo** — weighted loss làm lệch ý nghĩa xác suất đầu ra; SMOTE
trên biến nhị phân/thời gian sinh ra bản ghi CDR vô nghĩa và gây leakage nếu chạy trước khi split.

**Bài 8 · Cây quyết định → Gradient Boosting**
Entropy $H=-\sum p\log_2 p$, Gini $1-\sum p^2$, information gain.
Boosting: $F_m=F_{m-1}+\eta h_m$, Taylor bậc 2 với $g_i=\partial_{\hat y}\ell$, $h_i=\partial^2_{\hat y}\ell$
(ký hiệu weak learner đổi thành $f_m$ để **không đụng $h_i$** — Codex bắt lỗi v1).
Random forest chỉ nói ngắn, kèm **điều kiện** của công thức phương sai $\rho\sigma^2+\frac{1-\rho}{B}\sigma^2$
(giả định các cây cùng phương sai, tương quan cặp $\rho$).
Nhắc LightGBM/CatBoost cho categorical bậc cao.

### Nhóm III — Tín hiệu khác và vận hành (bài 9–12)

**Bài 9 · Text trên transcript ASR nhiễu**
TF-IDF với dạng **không cho IDF âm** (sửa v1): $\log\dfrac{N+1}{\mathrm{df}(t)+1}+1$.
**Character n-gram + linear classifier** — Codex nói đúng, đây là baseline mạnh và rẻ hơn Word2Vec
cho transcript ASR mất dấu, code-switching, sai chính tả.
Naive Bayes đặt ở đây (mô hình **sinh**, không phải tuyến tính như v1 xếp nhầm):
$P(w_j\mid S)=\dfrac{c_{j,S}+\alpha}{\sum_v c_{v,S}+\alpha V}$ — Laplace viết đủ mẫu số (sửa v1).
Kèm mắt xích Codex nói v1 bỏ qua: **lỗi ASR** — WER, confidence, chuẩn hoá tiếng Việt, nhiễu tổng đài.

**Bài 10 · Đặc trưng thời gian và hành vi**
Chuỗi CDR mới là tín hiệu cốt lõi (v1 chỉ dùng RNN cho transcript — Codex bắt).
Rolling aggregate, burst detection, change-point, khoảng cách giữa các cuộc gọi.

**Bài 11 · Đồ thị cuộc gọi và bất thường không nhãn**
$PR(u)=\dfrac{1-d}{N}+d\displaystyle\sum_{v\in \mathrm{In}(u)}\dfrac{PR(v)}{L(v)}$ — viết đủ vế trái và
tập đỉnh vào, xử lý dangling node (sửa v1). Bậc vào/ra, hệ số cụm, community detection.
Isolation Forest cho campaign **chưa từng thấy**: điểm bất thường $s(x,n)=2^{-E[h(x)]/c(n)}$.

**Bài 12 · Vận hành: drift, giám sát, vòng phản hồi**
PSI/KL để phát hiện trôi, backtest theo thời gian, SHAP để giải thích, hybrid **rule + model**,
nhãn trễ và active learning. Kết bằng capstone.

**Đã hoãn sang Khoá 2** (Codex đề nghị, đồng ý): Word2Vec, LSTM, Transformer/PhoBERT fine-tune,
MFCC/FFT, CNN spectrogram, voice deepfake, One-Class SVM, autoencoder, tự cài đầy đủ RF/XGBoost,
song ngữ EN, huy hiệu/tiến độ, track notebook Python song song.

---

## 4. Kiến trúc

```
scam-detection/
├── index.html
├── css/style.css
├── sw.js                     Service worker — offline thật (Codex yêu cầu)
├── js/
│   ├── app.js                Router, render bài, tiến độ
│   ├── codemath/         ★  ENGINE (mục 4.1)
│   │   ├── step.js           Định nghĩa Step — nguồn sự thật duy nhất
│   │   ├── runner.js         Chạy từng bước, ghi trace, snapshot để tua
│   │   └── bind.js           Gắn code ↔ toán ↔ hình, xử lý hover + tap
│   ├── mathrender.js         KaTeX vendored, offline
│   ├── viz/  plot.js · vector.js · tree.js · graph.js · calib.js
│   ├── ml/   linalg · logreg · nb · tree · boost · metrics · calibration · anomaly
│   ├── workers/train.worker.js   Training nặng chạy ngoài UI thread
│   ├── lessons/L01..L12.js   Mỗi bài một tệp
│   ├── data/gen.js           Generator seeded (mục 4.2)
│   └── tests/golden.test.js  Đối chiếu sklearn (mục 4.3)
├── fixtures/                 Số vàng xuất từ sklearn/numpy
└── .github/workflows/deploy.yml
```

### 4.1 `codemath/` — một nguồn sự thật duy nhất

Codex bắt đúng mâu thuẫn của v1: không thể vừa lưu code dạng chuỗi vừa bảo "sinh từ source thật".
`Function.prototype.toString()` cũng không cứu được — nó trả về source triển khai, không có ánh xạ
ổn định sang ký hiệu toán và phần tử hình vẽ.

**Chốt thiết kế:** mỗi bước học là một **Step object** — nó *vừa là* code chạy thật, *vừa là* thứ hiển thị:

```js
export const zStep = defineStep({
  id: "linear-score",
  inputs:  ["w", "x", "b"],
  output:  "z",
  run:  ({w, x, b}) => dot(w, x) + b,
  code:    "z = dot(w, x) + b",
  math:    "z = \\mathbf{w}^\\top\\mathbf{x} + b",
  bind:  { z: "viz:hyperplane.score", w: "viz:hyperplane.normal" },
  say:     "Điểm affine, chưa phải xác suất."
});
```

- Model thật (`js/ml/logreg.js`) **được lắp từ chính các Step này** — không có bản sao thứ hai.
- `runner.js` chạy pipeline, ghi lại mọi giá trị trung gian → hiện số cụ thể ngay cạnh ký hiệu toán.
- **Contract test** (`golden.test.js`) khẳng định `run()` của từng Step khớp số vàng xuất từ sklearn/numpy.
  Đây là cách duy nhất giữ lời hứa "code hiển thị = code chạy" — **bằng test, không bằng tuyên bố**.
- Tua 200 vòng lặp: lưu snapshot mỗi $k$ vòng + phát lại, không recompute mù.

### 4.2 Dữ liệu — 3 tầng (Codex yêu cầu)

Seeded RNG (`mulberry32`) để lesson, slider, test và tua đều tái lập được.

| Tầng | Quy mô | Dùng cho |
|---|---|---|
| **T1 — toy sạch** | 400 điểm, 2 chiều | Bài 2–3: nhìn thấy ranh giới quyết định |
| **T2 — CDR mô phỏng "bẩn"** | **50.000 dòng, ~1,5% scam ≈ 750 positive** | Bài 4–8, 10–11. Có chủ đích nhồi: nhãn nhiễu và trễ, missing, campaign correlation, caller spoofing, drift theo thời gian, một bẫy leakage cài sẵn |
| **T3 — capstone** | transcript + CDR, campaign chưa từng thấy trong train | Bài 12, kèm tuyên bố giới hạn rõ ràng |

Codex cảnh báo lập luận vòng tròn — nếu generator sinh đúng quy luật mà bài học dạy thì model chỉ
học lại giả định của tác giả. **Xử lý:** T2 có các quy luật *không* được dạy ở bài nào, cùng nhiễu và
tương tác; phần "vì sao dữ liệu thật vẫn khó hơn" đặt ở **Bài 1 và Bài 12**, không dồn vào cuối.

### 4.3 Kỹ thuật, theo đúng rủi ro Codex nêu

- **Web Worker** cho boosting/forest/graph layout — không khoá UI; có huỷ tác vụ và giới hạn tính toán.
- **Service worker** + chiến lược cache theo `BUILD_ID` (kế thừa cách cache-bust của repo `education`).
- **Golden test** đối chiếu numpy/sklearn cho: sigmoid, gradient, entropy, Gini, TF-IDF, PR-AUC, Platt.
- Canvas **HiDPI** (nhân `devicePixelRatio`), tránh mờ trên iPad.
- **Tap ≠ hover**: mọi tương tác có trạng thái "đang chọn" rõ ràng + điều hướng bàn phím.
- Mỗi họ thuật toán có viz engine riêng — **đã tính vào mốc**, không coi là "chỉ viết nội dung".

---

## 5. Mốc bàn giao

| Mốc | Nội dung | Kiểm chứng |
|---|---|---|
| **M0** | Khung repo, router, KaTeX offline, service worker, deploy Pages | Trang chạy offline, có mục lục 12 bài |
| **M1** | `codemath/` + `viz/plot.js` + `viz/vector.js` + **Bài 1–5 trọn vẹn** + golden test | Chạy logistic regression từng bước trong trình duyệt; **demo leakage** cho hai con số AUC khác nhau; test khớp sklearn |
| **M2** | Bài 6–8 (regularization, calibration, boosting) + Web Worker | Có mô hình boosting + ngưỡng theo chi phí trên xác suất đã hiệu chỉnh |
| **M3** | Bài 9–12 + capstone T3 | Khoá học hoàn chỉnh, dùng được |
| **Khoá 2** | Audio/Transformer/deepfake, song ngữ EN | Sau khi M3 chạy thật |

**M1 mở rộng theo đúng khuyến nghị Codex**: không chỉ logistic mà phải gồm cả split/leakage, metrics
và calibration sơ bộ. Đề xuất dừng ở M1 để Huy dùng thật rồi mới chạy tiếp.

---

## 6. Bốn quyết định cần Huy chốt

1. **Phạm vi** — chấp nhận cắt còn 12 bài (audio/Transformer sang Khoá 2) hay giữ 24 bài như v1?
   *Đề xuất: cắt. Codex nói đúng, 24 bài là phạm vi nhiều tháng.*
2. **Ngôn ngữ code dạy học** — JS trong trình duyệt làm chính (tương tác tức thì, không cài đặt),
   Python để Khoá 2. Hay Huy muốn Python ngay từ đầu?
3. **Repo GitHub** — máy chưa có `gh` CLI. Huy tạo repo trống `huyinvestor87/scam-detection` là mình
   push được ngay (SSH key đã dùng cho repo `education`).
4. **Bắt đầu từ đâu** — build thẳng M0+M1 rồi Huy review bản chạy được, hay Huy muốn xem trước
   thiết kế chi tiết của `codemath/`?

---

## 7. Bảng lỗi công thức v1 → v2

| Chỗ | v1 sai | v2 |
|---|---|---|
| Bài 2 | gọi $\mathbf w^\top\mathbf x+b$ là "bóng chiếu" | affine score; phép chiếu là $\frac{\mathbf w^\top\mathbf x}{\lVert\mathbf w\rVert}$ |
| Bài 3 | "gọi sau 22h tăng odds 3,2 lần" | thêm điều kiện: $x_j$ nhị phân, giữ nguyên biến khác, $w_j=\log 3.2$ |
| Bài 9 | Laplace $\frac{c+\alpha}{N+\alpha V}$, $N$ mơ hồ, $\mathbf w$ đụng trọng số | $\frac{c_{j,S}+\alpha}{\sum_v c_{v,S}+\alpha V}$, đổi ký hiệu token |
| Bài 9 | IDF $\log\frac{N}{1+\mathrm{df}}$ → âm khi df = N | $\log\frac{N+1}{\mathrm{df}+1}+1$ |
| Bài 11 | PageRank thiếu vế trái và $\mathrm{In}(u)$ | viết đủ + xử lý dangling node |
| Bài 7 | gọi $C_{FN}FN+C_{FP}FP$ là "kỳ vọng" | tổng chi phí quan sát; ngưỡng Bayes $t^*=\frac{C_{FP}}{C_{FP}+C_{FN}}$ |
| Bài 8 | $h_m$ (weak learner) đụng $h_i$ (Hessian) | weak learner đổi thành $f_m$ |
| Bài 8 | công thức phương sai RF không nêu giả định | ghi rõ điều kiện $\rho$, cùng phương sai |
| Bài 5 | "ROC nói dối" | ROC không phản ánh số FP tuyệt đối; PR-AUC phụ thuộc prevalence |
| Mục 6 | "MFCC không thể training trong trình duyệt" | MFCC là trích đặc trưng, không cần training |
