# Review vòng 2 — `scam-detection-learning`

_Reviewer: Claude (Sonnet 5) · 2026-09-02 · phạm vi: toàn bộ repo + PLAN v2 + code đã build (M0, bài 1–3)_
_Bối cảnh mới do Huy cung cấp: dữ liệu đầu vào thật chỉ có 8 cột CDR —
`cli, cld, direction, duration, customer_id, release_cause, completion_code, startDateTime`._

---

## Kết luận thẳng

Engine `codemath/` và ba bài đầu **chắc tay** — đây là phần khó nhất về mặt kỹ thuật và nó chạy được,
test khớp tới 1e-12. Nhưng có **một lỗ hổng nền tảng** mà PLAN v2 lẫn Codex v1 đều chưa chạm tới, và
nó lớn hơn mọi lỗi công thức:

> **Không có cột nhãn. Không có transcript. Không có audio.**
> Toàn bộ xương sống học có giám sát (bài 1–8) và cả bài text (bài 9) đang giả định
> những dữ liệu mà schema thật **không có**.

Ba việc phải chốt trước khi viết thêm bài nào:

1. **Nhãn ở đâu ra?** 8 cột này không mang nhãn. Phải nói cụ thể: khiếu nại join từ hệ thống nào,
   blacklist CLI, hàng đợi review thủ công, hay proxy label (ví dụ CLI xuất hiện trong danh sách chặn
   của nhà mạng). Bài 1 nói về chuyện này ở mức khái niệm nhưng app hứa "soi vào pipeline thật" —
   pipeline đó **có tồn tại không?** (xem mục 5).

   **Chốt 2026-09-03 (xem `DATA.md`):** `scam_flag` **chỉ có giá trị 1** → PU thuần; **`verdict_at` CÓ**
   → temporal split trung thực làm được. `direction` chỉ `outbound` → bỏ khỏi feature. Bài 7 phải mở đầu
   bằng "không tính được nếu chưa mua slice review"; cần dòng ngân sách cho slice đó.

   **Cập nhật (Huy):** CÓ một tập nhãn nhưng là **subset rất nhỏ** — `(customer_id, cli, scam_flag)`.
   Vậy đây là bài toán **positive-unlabeled / semi-supervised thật sự**, không phải "không nhãn" mà
   cũng không phải supervised sạch. Hệ quả cho khoá học:
   - Nhãn `scam_flag` ở grain nào — `(customer_id)` hay `(customer_id, cli)`? Nếu theo `cli` thì
     **mâu thuẫn** với bài 1 (grain phải là `(customer_id, window)`); cần nói rõ cách map `cli` → account
     và cách gộp khi một account có cả cli sạch lẫn cli bẩn.
   - Với subset nhỏ: CI cho recall / PR-AUC rất rộng, dễ overfit khi chọn ngưỡng → cross-fitting /
     nested CV. Đây phải là nội dung chính bài 5.
   - Vẫn cần `available_at` của nhãn để temporal split không rò rỉ.
   - Bài toán nên đóng khung là **rule-assisted + anomaly + PU classifier**, không phải một
     classifier nhị phân đơn thuần.
2. **Bài 9 (text/ASR) ra khỏi MVP** hoặc đánh dấu rõ "cần nguồn dữ liệu bổ sung". Với schema này
   không có một ký tự transcript nào.
3. **`gen.js` phải sinh đúng 8 cột đó.** Hiện generator chỉ có `makeToy2D` với hai đặc trưng đã
   tổng hợp sẵn (`pct_short_calls`, `fanout`). Bài 4 trở đi cần dữ liệu thô đúng tên cột thật để
   dạy feature engineering không bị giả.

---

## 1. Đặc thù của schema 8 cột — cơ hội bị bỏ lỡ

Từ `cli, cld, direction, duration, customer_id, release_cause, completion_code, startDateTime` ta chỉ
rút ra được **đặc trưng hành vi/tổng hợp theo `(customer_id, cửa sổ thời gian)`**. Đây thật ra là
tin tốt — nó ép khoá học đi đúng hướng công nghiệp (telecom fraud) thay vì nghịch feature bảng sạch.

Nhưng PLAN v2 **không hề nhắc** hai cột mạnh nhất mà schema này có sẵn:

- **`release_cause` / `completion_code`** (mã Q.850 / ISUP): phân bố cause code là tín hiệu gian lận
  kinh điển — tỉ lệ "no answer", "user busy", "normal clearing" sau cuộc gọi < 5 giây. **Answer-Seizure
  Ratio (ASR)** và **Average Call Duration (ACD)** tính thẳng từ hai cột này là bộ dò wangiri / robocall
  chuẩn mực. Hiện không bài nào dạy cách featurize categorical bậc cao này.
- **`direction` + tiền tố `cld`**: phát hiện **IRSF** (international revenue share fraud) và
  **wangiri** (gọi nhỡ một hồi chuông). Đây mới là nhóm gian lận CDR chiếm đa số thực tế, nhưng
  khoá học gộp tất cả vào "scam call" chung chung. Một chuyên gia domain sẽ muốn thấy **taxonomy**:
  wangiri / IRSF / PBX hijack / robocall / vishing — mỗi loại có chữ ký CDR khác nhau.

**Đề xuất:** thêm vào bài 1 một bảng "loại gian lận → chữ ký trên 8 cột này", và cho bài 6 hoặc bài 10
một mục featurize `release_cause`/`completion_code` cụ thể (gom nhóm cause code, ASR, ACD, short-call
ratio, unanswered ratio, đêm/ngày, burst).

### Bẫy dữ liệu thật với đúng schema này (nên đưa vào bài 6):

- `cli`/`cld` là số điện thoại — **cardinality cực cao, không được dùng làm feature thô** (model sẽ
  học thuộc số đã biết, không tổng quát hoá). Dùng được: tiền tố, mã vùng, độ dài, có/không hợp lệ.
- `duration = 0` vs `null` cho cuộc không nghe máy — phân biệt hay gộp? Đơn vị giây hay ms?
- `startDateTime`: múi giờ, DST, định dạng. Rolling-window phải cẩn thận ranh giới ngày.
- Không có call-id duy nhất → khử trùng lặp thế nào?
- `direction` mã hoá ra sao (inbound/outbound/1/2)?
- CLI spoofing: cùng một kẻ tấn công đổi `cli` liên tục → entity resolution theo `customer_id` chứ
  không theo `cli` (bài 1 nói đúng ý này rồi, giữ).

---

## 2. Engine `codemath/` — phần mạnh nhất, nhưng lời hứa hơi quá

Thiết kế Step (`run` + `code` + `math` trong một object, model thật lắp từ chính Step đó) là cách xử
lý đúng mâu thuẫn Codex v1 nêu. `runPipeline` / `compile` khiến `logreg.train()` chạy đúng cùng một
đường code mà bài học hiển thị — **không có bản sao thứ hai**. Tốt.

**Nhưng:** contract test chỉ kiểm chứng `run()` khớp số Python. Nó **không** kiểm chứng chuỗi `code`
khớp `run()`. Test tại `js/tests/golden.js` với mỗi step chỉ khẳng định `s.code.trim().length > 0`.

Hệ quả: nếu ai đó sửa chuỗi `code` hiển thị (ví dụ đổi `sub(ps, y)` thành `sub(y, ps)` **chỉ trong
chuỗi code**, không đụng `run`), **không test nào hỏng**. Câu "giữ lời hứa bằng test, không bằng
tuyên bố" trong `step.js` vì thế **vẫn còn một khe hở**: math↔run được test, code↔run thì không.

**Sửa (chọn một):**
- Suy ra `code` từ `run.toString()` (chuẩn hoá whitespace) và so trong test; hoặc
- Thêm lint: RHS của `code` phải xuất hiện nguyên văn trong `run.toString()`; hoặc
- Hạ giọng: nói rõ "chuỗi code là bản chép tay, được review thủ công; test đảm bảo math = số học".

Chi tiết nhỏ:
- `predictOne = compile(PREDICT_STEPS)` export nhưng bài 2 dùng thẳng `scoreStep` — chưa ai gọi
  `predictOne`. Kiểm tra lại còn cần export không.
- `lossStep` cộng `EPS = 1e-12` vào trong `log` → sai lệch nhỏ, test phải nới lên `1e-11`. Chấp nhận
  được, nhưng nên ghi chú vì sao dung sai bài này khác các bài kia.
- `gauss()` gọi `rnd()` hai lần, bỏ biến Box–Muller thứ hai — lãng phí, không sai. Determinism ok.

---

## 3. Lỗi công thức / phát biểu còn sót

### 3.1 Bài 2 — phát biểu SAI khi `b ≠ 0`

Bài 2 nói: *"Kéo hai thanh w₁, w₂ theo cùng tỉ lệ — đường trắng đứng yên, còn con số z thì đổi."*

Ranh giới là `{x : w·x + b = 0}`. Nhân `w` với `k > 0` cho `{x : w·x + b/k = 0}` — **đường DỊCH đi**
trừ khi `b = 0`. Mà UI cho phép kéo `b` tự do. Vậy phát biểu chỉ đúng ở trường hợp riêng `b = 0`.

**Sửa:** hoặc khoá `b = 0` trong demo đó, hoặc đổi câu thành "hướng ranh giới không đổi, chỉ độ lớn z
đổi" và nói thêm khi `b ≠ 0` thì scale `w` cũng làm dịch đường (đúng phải scale cả `w` và `b`).

### 3.2 Bài 1 — số liệu không nhất quán

- Code dùng `N = 200000`, text nói "200.000 tài khoản", PLAN mục 3 lại viết "1 triệu chấm xám,
  1.500 chấm đỏ". Chốt một con số.
- Lưới vẽ `TOTAL = 80 × 34 = 2720` chấm, không phải "1 triệu" — câu trong PLAN đang hứa thứ hình vẽ
  không làm. Sửa PLAN hoặc đổi cách vẽ (ví dụ mỗi chấm = 735 tài khoản, ghi rõ).

### 3.3 Bài 3 — dữ liệu mâu thuẫn với bài 1

Bài 1 đóng đinh "scam ~1,5%, accuracy vô dụng". Bài 3 huấn luyện trên blob Gauss 2D **28% scam**
(`makeToy2D` mặc định `scamRate: 0.28`, bài 3 gọi `n: 240`). Người học vừa ra khỏi bài 1 sẽ hoang mang.
Cần một câu cầu nối: "đây là dữ liệu đồ chơi để nhìn thấy ranh giới; mất cân bằng thật quay lại ở bài 4–5".

### 3.4 Các công thức bài 4–12 (chưa build)

PLAN v2 đã sửa đúng loạt lỗi Codex v1 (affine score, Laplace đủ mẫu số, IDF không âm, PageRank đủ vế,
ký hiệu boosting `f_m`, ngưỡng Bayes `t* = C_FP/(C_FP+C_FN)`). Không thấy lỗi mới trong phần đề cương.
Lưu ý khi build:
- Bài 5: "khoảng tin cậy với ~750 mẫu dương" — nhớ nói rõ đây là CI cho **recall/PR-AUC**, và với
  750 dương thì nửa rộng CI của recall ở mức 0,8 đã cỡ ±0,03 (Wilson). Con số này nên hiện trên hình.
- Bài 7: reliability diagram cần **binning** — nói rõ số bin và nhạy cảm của ECE theo số bin.
- Bài 8: Taylor bậc hai của boosting — `h_i` (Hessian) với log-loss là `p(1-p)`, nhớ khớp với bài 3.

---

## 4. Sư phạm & thứ tự

Sau v2 thì ổn về tổng thể. Hai điểm còn cấn:

- **Metrics (bài 5) nên đứng ngay sau bài 3**, trước cả leakage (bài 4). Người học vừa train xong ở
  bài 3 mà chưa có cách nói "tốt hay không". Codex v1 cũng nói ý này; v2 mới kéo được một nửa.
  Thứ tự đề xuất: 1 → 2 → 3 → **5 (đo lường)** → **4 (split/leakage)** → 6...
- **Bài 4 là bài "bán khoá học"** (demo AUC 0,97 vs 0,78). Nên có một screenshot/GIF của chính demo
  đó trong README — đây là thứ thuyết phục người ta học tiếp.

---

## 5. "Pipeline thật" — có tồn tại không?

Các bài liên tục nói *"soi vào pipeline thật"*, *"pipeline thật trong repo `scam-detection` chọn grain
`(customer_id, window)`"*, dẫn tên hàm `build_customer_window_features()`, `ensemble.py`,
`distinct_cli_used`, `rank-normalize rồi trung bình với rules`.

Nếu repo production đó **có thật** → link nó vào README, ít nhất là các trích đoạn (đã khử nhạy cảm).
Đó sẽ là điểm mạnh lớn nhất của khoá học.

Nếu **chưa có** → đây là "concreteness giả": người học tin là đang xem hệ thống thật trong khi không
phải. Đúng tinh thần cảnh báo "lập luận vòng tròn" của Codex. Đổi cách nói thành "một pipeline thực
tế điển hình" cho tới khi có repo thật để trỏ tới.

`REVIEW-codex.md` còn trỏ đường dẫn cũ `/home/huy/.openclaw/workspace/scam-detection/PLAN.md`
(thư mục giờ là `scam-detection-learning`). Cosmetic.

---

## 6. Kỹ thuật / hạ tầng

- **Rò rỉ listener khi chuyển bài.** `createPlot()` gắn `window.addEventListener("resize", …)` và tạo
  canvas mới mỗi lần vào bài, nhưng không gỡ khi rời bài. `lesson:leave` chỉ dừng timer của bài 3.
  SPA điều hướng nhiều lần → tích luỹ listener + canvas cũ. Thêm dọn dẹp trong `lesson:leave` hoặc
  trả về `destroy()` từ `createPlot`.
- **KaTeX vs app.js.** Cả hai đều defer; katex đứng trước trong DOM nên chạy trước — thường ổn. Nhưng
  `renderMath` chỉ fallback ra chuỗi thô **một lần**, không re-render khi katex tải xong. Nếu thứ tự
  lệch (proxy, HTTP/2 push, cache lạ) thì công thức kẹt ở dạng TeX thô. Thêm: nghe `window load` →
  render lại các `.cm-math-row` chưa render.
- **CI luôn ghi đè `fixtures/golden.json`.** `deploy.yml` chạy `make_golden.py` trước test, nên bản
  `golden.json` commit trong repo **không bao giờ được test như-đã-commit** — Python luôn sinh lại.
  Đúng ý đồ (Python là oracle) nhưng nên ghi chú, và cân nhắc thêm một job "fixture đã commit khớp
  Python" để bắt trường hợp ai đó sửa tay fixture.
- **`sw.js`**: `PRECACHE` liệt kê `./js/app.js` (không query) trong khi HTML nạp `js/app.js?v=…`.
  Network-first nên vẫn chạy, nhưng dòng precache đó vô dụng. Các file `js/lessons/L0*.js` import động
  không có `?v=` cache-bust — dựa hoàn toàn vào network-first. Chấp nhận được, nhưng nêu rõ trong
  comment rằng lesson chunks không được versioned.
- Chưa có Web Worker / huỷ tác vụ — đúng như PLAN, chưa tới lúc (boosting chưa build). Ghi nhận để
  không quên ở M2.
- Thiếu: lint JS (chỉ có `lint_workflows.py`), test cho `viz/plot.js` và `panel.js` (DOM), kiểm tra
  khả năng truy cập (canvas + screen reader).

---

## 7. Phạm vi

Cắt còn 12 bài là đúng. Với schema 8 cột, đề nghị cắt thêm:

- **Bài 9 (text/ASR) → Khoá 2** trừ khi có nguồn transcript. Hiện nó đứng trong "MVP" mà không có
  dữ liệu.
- Bài 11 (đồ thị) giữ được — `cli → cld` là cạnh, dựng đồ thị từ đúng 8 cột này là khả thi và mạnh.
- Bài 10 (thời gian/hành vi) nên **lên sớm hơn**, ngay sau bài 6, vì với schema này thì đặc trưng
  hành vi là gần như toàn bộ tín hiệu — nó không phải "tín hiệu khác", nó là tín hiệu chính.

Thứ tự đề xuất lại: 1 → 2 → 3 → 5 → 4 → 6 → 10 → 7 → 8 → 11 → 12, và 9 sang Khoá 2.

---

## 8. Việc nên làm ngay (ưu tiên giảm dần)

1. Chốt nguồn nhãn; viết vào bài 1 bằng số liệu thật (không phải khái niệm chung).
2. Thêm `makeCDR()` vào `gen.js` sinh đúng 8 cột; bài 4+ chạy trên nó.
3. Sửa phát biểu sai ở bài 2 (`b ≠ 0`).
4. Thêm test code↔run (hoặc hạ giọng lời hứa trong `step.js`).
5. Bảng taxonomy gian lận + featurize `release_cause`/`completion_code` vào bài 1 và bài 6.
6. Bài 9 → Khoá 2; cập nhật `lessons/index.js` và PLAN.
7. Dọn listener rò rỉ trong `createPlot`.
8. Link hoặc reword "pipeline thật".
9. Câu cầu nối bài 1 → bài 3 về việc dữ liệu đồ chơi 28% scam.
10. Thống nhất con số N ở bài 1.
