# Review vòng 2 — Opus 5

_Phạm vi: toàn repo (PLAN.md, README.md, `js/**`, `sw.js`, `index.html`, `css/style.css`,
`.github/workflows/deploy.yml`, `tools/`), đối chiếu `REVIEW-codex.md`, `REVIEW-2-claude.md`,
`REVIEW-2-codex.md`. Bối cảnh dữ liệu: CDR 8 cột + nhãn subset nhỏ `(customer_id, cli, scam_flag)`._

**Đã chạy:** `node js/tests/golden.js` → **21/21 đạt, exit 0**. Test xanh, nhưng phần dưới chứng minh
bằng số rằng nó xanh *bất chấp* ít nhất một chỗ code hiển thị ≠ code chạy.

---

## Phán quyết

Engine `codemath/` là thiết kế đúng và ba bài đã build dạy đúng phần lớn toán — nhưng **cả ba lời hứa
in trên trang chủ đều đang bị vi phạm bằng chứng cứ số học** (code = code chạy; trục 1:1; ba biểu
diễn đồng bộ), và **PLAN v2 chưa hề tính tới việc nhãn là PU subset nhỏ** — điều này làm hỏng Bài 5
và Bài 7 ở mức khái niệm, không phải mức chi tiết.

---

## 0. Chỗ đồng ý, chỗ phản bác hai bản kia

### Đồng ý (không nhắc lại)

Bài 2 sai khi `b ≠ 0`; khe hở test code↔run; EPS trong `lossStep`; lệch một iteration ở Bài 3; SW xoá
cache app khác; rò rỉ listener `createPlot`; `gen.js` chưa sinh CDR thô 8 cột; Bài 9 (text/ASR) ra
khỏi MVP; "pipeline thật" phải link commit cụ thể hoặc đổi cách nói; toy 28% vs 1,5% cần câu cầu nối;
`put()` trong SW không gắn lifetime; race router; CI quá hẹp; `linalg.js:1` nói sai "mọi hàm đều có test".
Codex vòng 2 là bản mạnh hơn trong hai bản.

### Phản bác

**1. Claude — tiêu đề "Không có cột nhãn" (`REVIEW-2-claude.md:15`) không được sửa sau khi có update ở `:26`.**
Kết luận "toàn bộ xương sống có giám sát (bài 1–8) đang giả định dữ liệu schema thật không có" là **sai**
khi đã biết có nhãn. PU **là** học có giám sát — cái đổi là *hàm mất mát và metric*, không phải lớp mô
hình. Hệ quả của tiêu đề chưa sửa: cả Claude (`:214`) lẫn Codex (`REVIEW-2-codex.md:77`) đều khuyến nghị
đổi mục tiêu MVP sang "anomaly/rule-assisted triage" — **đó là dùng phí bộ nhãn Huy đang có**. Đúng phải là:
giữ classifier, đổi sang PU risk + rule/anomaly làm feature, không phải thay thế.

**2. Codex — `REVIEW-2-codex.md:9`: "chưa đủ cơ sở kết luận toàn bộ bài toán là PU learning. Câu đó hiện khẳng định quá mức (`L01.js:64`)".**
Với ground truth đã xác nhận (nhãn chỉ tồn tại như một subset nhỏ), câu ở `js/lessons/L01.js:64` **đúng**,
không phải khẳng định quá mức. Phần còn giá trị trong ý Codex là đòi data contract — giữ; bỏ vế bác bỏ PU.

**3. Claude — "nested CV" cho subset nhỏ (`REVIEW-2-claude.md:32`) là thuốc sai bệnh.**
Nested CV sửa *bias do chọn siêu tham số*, không sửa *variance* và tuyệt đối không sửa *non-identifiability*
của PU (mục 2 dưới). Với vài trăm positive, nested CV chia nhỏ tiếp thành fold trong-fold → ước lượng nhiễu
tới mức vô dụng. Đúng phải là: **repeated grouped rolling-origin CV** + không gian siêu tham số cực nhỏ
(hoặc cố định), + báo CI Wilson mỗi lần.

**4. Codex — bác `run.toString()` để đòi AST/DSL (`REVIEW-2-codex.md:33`) là over-engineering.**
DSL cho 8 Step chỉ chuyển vấn đề tin cậy sang pretty-printer. Có phương án thứ ba rẻ hơn và *sound* hơn cả
hai: **lấy `code` làm nguồn duy nhất, sinh `run` từ nó bằng `new Function`** — lúc đó chuỗi hiển thị và
hàm chạy là **cùng một chuỗi ký tự**, và `golden.js` sẵn có đã đủ để validate. ~10 dòng, không normalize,
không heuristic. Đánh đổi: mất stack trace đẹp và cần không có CSP `unsafe-eval` (repo hiện không đặt CSP →
chạy được). Nếu không muốn `eval`: lint substring của Claude là *heuristic nhưng > 0*, còn hiện tại là **0**.

**5. Claude — "`release_cause`/`completion_code` là hai cột mạnh nhất" (`REVIEW-2-claude.md:53`).**
Codex phản bác đúng. Bổ sung việc cần làm *trước* khi viết bài nào: chạy `value_counts` +
crosstab `release_cause × completion_code × (duration == 0)` trên dữ liệu thật. Ba bảng đó trả lời ngay
ba câu: có phải Q.850 không, hai cột có trùng thông tin không, và "answered" có suy ra được không.

**6. Codex — "bỏ Taylor bậc hai khỏi MVP" (`REVIEW-2-codex.md:48`).**
Không đồng ý. `PLAN.md:22` nói đúng rằng boosting là thứ thắng thật trên CDR; bỏ khai triển bậc hai là
bỏ đúng chỗ *duy nhất* giải thích vì sao nó thắng, trong một khoá học lấy code↔toán làm luận đề. Chỗ nên
cắt là **viz engine vẽ cây lớn dần** (đắt), không phải phần `g_i, h_i` (rẻ, dùng lại được engine loss curve).

---

## 1. P0 — Lỗi cả hai bản đều bỏ sót

### P0-1. Trục **không** 1:1 — canvas luôn được layout ở 600px vì `render()` chạy khi DOM còn rời

`js/app.js:67` gọi `mod.render(body)` **trước** `mainEl.append(wrap)` ở `js/app.js:85`. Lúc `createPlot`
chạy, container chưa nằm trong document → `js/viz/plot.js:19-20`:
`rect.width` = 0, `container.clientWidth` = 0 → rơi vào fallback **`600`**.

Chứng minh (mô phỏng đúng đường đi đó với `dpr = 2`, tham số của Bài 2):

```
plot.width (logic)  = 600          <-- không phải bề rộng thật
canvas.width        = 1200 px bitmap
canvas.style.width  = (không đặt)  <-- CSS .viz canvas { width: 100% } kéo giãn
view sau equal      = {xmin:-4.5, xmax:4.5, ymin:-3, ymax:3}
container 900px CSS -> kéo ngang 1.500x, kéo dọc 1.000x
```

Hệ quả, đúng bằng chính lời README:

- `README.md:99-100` — *"thiếu nó thì vector pháp tuyến w trông không vuông góc với ranh giới, và hình
  vẽ nói dối"*. `equal:true` (`plot.js:27-31`) tính đúng cho khung 600×400, rồi CSS kéo ngang thêm
  `containerWidth/600` lần. **Hình đang nói dối ở đúng cái nó hứa không nói dối** — trên mọi lần vào bài,
  cho tới khi người dùng resize cửa sổ (lúc đó `plot.js:136` mới đo lại và tự lành).
- Khung nhìn tác giả đặt (`L02.js:36` `xmin:-3.2..3.2`) bị ghi đè thành `-4.5..4.5` — sai cả tỉ lệ lẫn phạm vi.
- HiDPI (`plot.js:18`, `README.md:99`) mất tác dụng: dpr=1, container 900px → 600 bitmap px kéo lên 900 CSS px.
- Bài 1 (`L01.js:110-131`): `cw = 600/80`, chấm tròn bị kéo thành elip.

**Sửa (1 dòng):** đổi thứ tự trong `app.js` — `mainEl.innerHTML=""; mainEl.append(wrap);` **trước**
`mod.render(body)`. Bền hơn: `ResizeObserver` trên container thay cho `window resize`.

### P0-2. Dung sai test đã bị nới **đúng chỗ** che lỗi EPS — "oracle" đang bị bẻ

Ba dòng này phải đọc cùng nhau:

- `js/ml/logreg.js:68` — `run` dùng `Math.log(p + EPS)`
- `js/ml/logreg.js:69` — chuỗi `code` hiển thị dùng `Math.log(p)`
- `tools/make_golden.py:26` — oracle Python dùng `math.log(p)`, tức **khớp chuỗi hiển thị, không khớp code chạy**
- `js/tests/golden.js:51` — riêng `loss` được cấp `tol = 1e-11`, mọi kiểm tra khác là `TOL = 1e-12` (`:23`)

Đo thật trên chính fixture:

```
loss có EPS  = 0.4610628653304449
loss không EPS = 0.4610628653320445
|lệch|        = 1.5996e-12
qua tol 1e-12? KHÔNG      qua tol 1e-11? CÓ
```

Nói thẳng: **cái duy nhất trong repo mà code hiển thị ≠ code chạy cũng chính là cái duy nhất được nới
dung sai để test vẫn xanh.** Claude thấy dung sai và gọi là "chấp nhận được" (`REVIEW-2-claude.md:100-101`);
Codex thấy EPS mà không nối với dung sai. Nối lại thì `README.md:60` — *"Nếu ai đó sửa công thức trong bài
mà quên sửa code, CI hỏng ngay"* — không chỉ thiếu bằng chứng, nó đã bị **phản chứng ngay trong repo**.

Kèm theo, Codex đúng khi nói EPS cho loss âm: tại `p=1, y=1`, số hạng `= +1.0001e-12` → `loss = -1.0001e-12`.
Sửa đúng là clamp `p ∈ [eps, 1-eps]` hoặc BCE-from-logits, rồi hiển thị đúng cái đang chạy, rồi
`make_golden.py` cũng clamp, rồi **trả `loss` về `TOL = 1e-12`**.

### P0-3. Bài 3: ba con số trên **cùng một màn hình, cùng một thời điểm** nói ba chuyện khác nhau

Xác nhận lỗi (a), nhưng nó nặng hơn mô tả của Codex (`REVIEW-2-codex.md:19`). Cơ chế:
`js/ml/logreg.js:146-148` đẩy vào `history[t+1]` cặp **(w mới, loss cũ)**.

- Nhãn trên hình `js/lessons/L03.js:97-99` đọc `history[epoch].loss` → loss tại `history[epoch-1].w`
- Vạch trên đường loss `js/lessons/L03.js:125` dùng chỉ số `epoch - 1` → cùng lệch
- Panel code↔toán `js/lessons/L03.js:57-61` chạy lại pipeline tại `history[epoch].w` → loss **đúng**
- Ranh giới trắng `js/lessons/L03.js:85` vẽ từ `history[epoch].w` → **đúng**

Đo thật (`seed 11, n 240, lr 0.6, w0 [-1.6,1.4], b0 0.9`):

| vòng | nhãn trên hình | panel code↔toán | lệch |
|---|---|---|---|
| 0 | `—` (NaN) | 1.497571926 | panel có số, hình không |
| 1 | 1.4975719 | 1.0085755 | **−0.489 (33%)** |
| 2 | 1.0085755 | 0.7076211 | −0.301 |
| 5 | 0.4319938 | 0.3666063 | −0.065 |
| 50 | 0.1394082 | 0.1389603 | −4.5e-4 |

Và xác minh cơ chế: `loss tại w của history[0]` = `history[1].loss` = `1.497571925798` (khớp tuyệt đối).

**Cái cả hai bản bỏ sót:** `train()` **không bao giờ tính loss tại bộ trọng số cuối**. Loss thật tại
`history[200].w` là `0.124864400`, app hiển thị `0.124877983` — người học không bao giờ nhìn thấy
kết quả của vòng lặp cuối cùng. Sửa: sau vòng lặp, tính thêm một lần loss tại `w` cuối và
đổi `history[t] = {w_t, b_t, loss_t}` với `loss_t` là loss **tại chính `w_t`**.

Bonus latent: `js/lessons/L03.js:105` lọc `Number.isFinite` **sau** `slice(1)`; nếu một loss nào đó
không hữu hạn thì mảng ngắn đi và toàn bộ ánh xạ `epoch → chỉ số` ở `:118` và `:125` lệch âm thầm.

### P0-4. PU làm **Bài 7 sụp**, không chỉ làm Bài 5 nhiễu — cả hai bản đều không thấy

Dưới PU, `P(y = 1 | x)` chỉ **định danh được sai khác một hằng số** `c = P(được gán nhãn | thật sự dương)`.
Hệ quả cứng, theo đúng nội dung PLAN v2:

| Nội dung PLAN | Dưới PU với nhãn subset nhỏ |
|---|---|
| Xếp hạng / top-K triage | **Giữ được.** `c` là hằng → thứ tự không đổi |
| ROC-AUC (`PLAN.md:91`) | Giữ được xấp xỉ (positive quan sát vs unlabeled) |
| Precision, PR-AUC (`PLAN.md:89-94`) | **Không tính được** — mẫu số FP chứa positive chưa lộ |
| Reliability diagram, Platt/isotonic (`PLAN.md:104`) | **Không tính được** — đích hiệu chỉnh không quan sát được |
| Ngưỡng Bayes `t* = C_FP/(C_FP+C_FN)` (`PLAN.md:105`) | **Vô nghĩa** nếu áp lên `p` chưa chia `c` |

Tức là **cả Bài 7 — bài Codex vòng 1 yêu cầu kéo lên sớm — đang đứng trên một giả định dữ liệu không có**.
Không bản review nào nêu. Muốn cứu Bài 7 thì bắt buộc phải có **một slice được review thủ công**
(lấy mẫu phân tầng theo score) để làm negative đã xác minh — tức là phải *mua* nhãn, và việc đó phải là
một mục trong kế hoạch, không phải chú thích.

Và bộ khái niệm PU tối thiểu mà **PLAN v2 không có một chữ nào**: giả định **SCAR**, propensity `c`
(Elkan–Noto), ước lượng class prior `π`, **nnPU risk**. Riêng SCAR gần như chắc chắn **sai** ở đây —
nhãn đến từ khiếu nại/verdict nên lệch về campaign to và gây hại nhiều, tức là SAR chứ không SCAR;
điều này phải được nói ra vì nó quyết định mọi hiệu chỉnh sau đó.

### P0-5. Câu hỏi rẻ nhất, quan trọng nhất, không bản nào hỏi: **`scam_flag` có giá trị 0 không?**

Nếu subset chỉ chứa `scam_flag = 1` → PU thuần, mọi thứ ở P0-4 áp dụng.
Nếu subset có **cả 0 và 1 đã được xác minh** → Huy đang có một **tập đánh giá sạch hai chiều**, và khi đó
precision/calibration/ngưỡng chi phí **tính được** trên slice đó (kèm reweighting về prevalence thật).
Đây là hai thế giới thiết kế khác hẳn nhau và nó được trả lời bằng một câu `value_counts`.
**Chốt câu này trước khi viết thêm bất kỳ bài nào.**

---

## 2. P0/P1 — Xác nhận các lỗi đã nêu

| # | Lỗi | Kết luận | Dẫn chiếu |
|---|---|---|---|
| (a) | Bài 3 lệch một iteration | **Xác nhận, nặng hơn mô tả** | `js/ml/logreg.js:144-149`, `js/lessons/L03.js:57-61`, `:97-99`, `:125` — xem P0-3 |
| (b) | "Scale w → ranh giới đứng yên" sai khi `b≠0` | **Xác nhận** | `js/lessons/L02.js:29` vs slider `b` ở `:43`. Biên `{w·x+b=0}` → `{w·x+b/k=0}`. Thêm: câu "**z** tăng gấp đôi" cũng sai (`z = k·wᵀx + b`) — cả hai vế của câu đều sai, hai bản kia chỉ bắt vế ranh giới |
| (c) | Khe hở test code↔run | **Xác nhận** | `js/tests/golden.js:59-64` chỉ kiểm `s.code.trim().length > 0 && s.math.trim().length > 0`. `math` cũng không được kiểm. Tên bước CI `.github/workflows/deploy.yml:33` sai sự thật |
| (d) | `lossStep` EPS trong `run`, không trong `code` | **Xác nhận + chứng minh bằng số** | `js/ml/logreg.js:68` vs `:69`; xem P0-2 |
| (e) | SW xoá cache app khác cùng origin | **Xác nhận** | `sw.js:35` `keys.filter(k => k !== CACHE)` — `caches.keys()` là **origin-wide**, không giới hạn theo scope. `huyinvestor87.github.io` đang host cả repo `education` (`README.md:38`) → deploy bài mới ở đây **xoá cache offline của app kia**. Sửa: `k.startsWith("scam-learn-") && k !== CACHE` |
| (f) | Rò rỉ listener `createPlot` | **Xác nhận, có thêm hệ quả** | `js/viz/plot.js:136` — không `destroy()`, closure giữ `canvas`+`X`+`y`. Hệ quả chưa ai nêu: listener cũ vẫn `dispatchEvent("plot:resize")` lên **container đã rời DOM**, và handler Bài 3 (`L03.js:174`) vẫn `draw()` vào canvas chết mỗi lần resize — CPU tăng tuyến tính theo số bài đã xem |

Bổ sung cho (e): `sw.js:29` dùng `addAll` — **atomic**, một URL 404 là install hỏng toàn bộ, và
`js/app.js:112` nuốt lỗi bằng `.catch(() => {})` → **mất offline hoàn toàn mà không có tín hiệu nào**.

---

## 3. P1 — Nhãn subset nhỏ: PLAN v2 xử lý tới đâu

**PLAN v2 xử lý: gần như chưa.** `PLAN.md:54` nhận diện "nhãn trễ, thiếu, nhiễu" đúng ở mức khái niệm và
`js/lessons/L01.js:64` gọi đúng tên PU — rồi dừng ở đó. Toàn bộ phần còn lại của PLAN (Bài 5, 7, và mốc M1
ở `PLAN.md:228`) viết như thể nhãn là supervised sạch.

### 3.1 Grain: mâu thuẫn có thật, và không phải mâu thuẫn Claude mô tả

`js/lessons/L01.js:59` chốt grain dự đoán `(customer_id, window)`. Nhãn ở grain `(customer_id, cli)`.
Claude gọi đây là mâu thuẫn (`REVIEW-2-claude.md:29-31`) — đúng là có xung đột, nhưng phải gọi đúng tên:
đây **không phải leakage, đây là bài toán *định nghĩa target***. Gộp `cli → account` bằng `any()`,
`k-of-n`, hay `tỉ trọng lưu lượng bẩn`, mỗi lựa chọn cho một prevalence khác nhau và một bài toán khác nhau.
`js/lessons/index.js:21` đang xếp "latest verdict wins" vào bài leakage — trộn hai thứ khác loại.

Thêm một hệ quả không bản nào nêu: nếu nhãn ở grain `cli` mà `cli` bị spoof (chính `L01.js:59` dạy điều đó),
thì **bản thân bộ nhãn cũng bị spoof lây** — một `cli` bị gán bẩn có thể chỉ là số bị mạo danh.
Đây là nội dung tốt cho Bài 1, và nó là thật.

### 3.2 `available_at`: cả hai bản đòi, không bản nào rút ra kết luận

Nhãn có **ba cột**, không có cột thời gian. Kết luận thẳng: **temporal split đúng nghĩa là không kiểm chứng
được trên dữ liệu thật của Huy**, và do đó **demo đinh của Bài 4 (`PLAN.md:86`: AUC 0,97 vs 0,78) chỉ tái
lập được trên dữ liệu mô phỏng — không bao giờ tái lập được trên dữ liệu thật**. Phải nói câu đó ra trong bài.

Ba đường đi thực dụng, theo thứ tự ưu tiên:
1. Xin thêm `verdict_at` / `created_at` từ hệ thống sinh ra `scam_flag` — rẻ hơn mọi cách vòng.
2. Nếu không có: **label maturity / seasoning window** — chỉ train trên khoảng thời gian đủ cũ để việc phát
   hiện coi như đã hoàn tất (ví dụ cắt trước `T − 90 ngày`), và nói rõ đây là giả định, không phải sự thật.
3. Chấp nhận bất đối xứng: positive lộ ra *sau* mốc test làm **nhiễu negative trong train** (bình thường,
   PU chịu được); nhưng dùng nhãn phát hiện sau `T` để **train** trên dữ liệu trước `T` mới là rò rỉ độc.

### 3.3 CI / CV cho subset nhỏ

Xem phản bác #3 mục 0. Bổ sung con số cần hiện trên hình Bài 5: với `n⁺` positive trong fold test và
recall quanh 0,8, nửa rộng CI Wilson ≈ `1.96·√(0.8·0.2/n⁺)`. `n⁺ = 750` → ±0,029 (con số Claude nêu ở
`REVIEW-2-claude.md:137`, đúng) — nhưng đó là **con số của dữ liệu mô phỏng T2**. Với nhãn thật là
"subset rất nhỏ", chia group + temporal xong mỗi fold có thể còn vài chục positive → `n⁺ = 60` → **±0,101**.
Bài 5 phải cho người học **kéo `n⁺`** và nhìn CI phình ra, đó mới là bài học.

---

## 4. P1 — Thứ tự và phạm vi 12 bài cho CDR-only

Về "5 trước 4": Codex đúng (`REVIEW-2-codex.md:53`) — dạy metric trên **prediction fixture** (không cần
train, không cần split), rồi Bài 4 mới dựng evaluation hợp lệ. Không cần tranh tiếp.

Đóng góp riêng: **slot trống do Bài 9 (text) rời đi phải dành cho PU/cơ chế nhãn, không phải cho thêm một
họ mô hình.** Đề xuất:

1. Schema 8 cột, vantage point, taxonomy, grain **dự đoán vs grain hành động**, baseline rule
2. **Cơ chế nhãn & PU** *(bài mới, chiếm slot của Bài 9)* — `c`, SCAR vs SAR, `π`, nnPU, label maturity
3. 8 cột → feature point-in-time theo `(customer_id, window)`
4. Vector / affine score (toy, **nói rõ là toy**)
5. Logistic + cross-entropy + GD
6. Metrics lớp hiếm **trên fixture** + uncertainty (CI kéo được)
7. Temporal/group split, delayed label, leakage
8. Rolling / burst / sequence
9. Regularization, high-cardinality, data quality
10. Calibration + ngưỡng theo capacity/chi phí — **mở đầu bằng "vì sao mục này không tính được nếu chưa có slice đã review"**
11. Trees → boosting (giữ `g_i, h_i`, cắt viz cây)
12. Graph / campaign / entity resolution + drift + capstone CDR-only

### Domain telecom — bổ sung ngoài danh sách Codex

- **Vantage point quyết định taxonomy, và cả hai bản đều liệt kê taxonomy mà không lọc theo nó.**
  `customer_id` + `direction` + `README.md:71` ("outbound scam abuse") xác định điểm nhìn: **nhà mạng nhìn
  chính khách hàng của mình gọi ra**. Từ chỗ đứng đó, **wangiri phần lớn ngoài phạm vi** — wangiri là
  fraudster gọi *tới* nạn nhân; ta chỉ thấy nó nếu khách hàng của ta *chính là* kẻ chạy wangiri.
  Cái thật sự khớp điểm nhìn này là: **PBX/SIP credential compromise → IRSF từ trunk của khách hàng**, và
  **robocall/vishing do chính khách hàng chạy**. Đưa nguyên danh sách 5 loại vào Bài 1 sẽ dạy sai phạm vi.
- **Chữ ký không tính được từ 8 cột này** — cần một hộp "8 cột này KHÔNG cho biết gì", không bản nào đề xuất:
  không có `answer_time` → **không có PDD, không có ring duration** (đúng chữ ký wangiri/robocall);
  không có `charge`/`tariff` → **IRSF không xác nhận được**; không có call-id → dedup phải suy đoán;
  không có mã trunk → không tách được PBX bị chiếm khỏi hành vi hợp pháp của khách hàng.
- **Phụ thuộc dữ liệu ngoài phải vendor vào repo:** "destination country / premium-rate" **không** suy được
  từ `cld`; cần một bảng prefix E.164. Nếu bài 1/6 dạy feature đó mà không ship bảng thì bài học không chạy được.
- ASR/ACD (`REVIEW-2-claude.md:54`): giữ, nhưng theo Codex phải chốt data dictionary trước — và nhớ ghi chú
  ASR ở đây là **Answer-Seizure Ratio**, sẽ đụng "ASR = speech recognition" ở phần transcript của Khoá 2.

---

## 5. P2 — Kỹ thuật, cả hai bản chưa nêu

1. **`concurrency` dùng chung cho PR và deploy.** `.github/workflows/deploy.yml:15-17` đặt
   `group: pages-deploy` (hằng số) + `cancel-in-progress: true`, trong khi workflow chạy cả `push` lẫn
   `pull_request` (`:4-7`). Một PR mở ra sẽ **huỷ deploy đang chạy dở của `main`**; `actions/deploy-pages`
   bị huỷ giữa chừng có thể để lại deployment kẹt "in progress". Sửa:
   `group: pages-${{ github.ref }}` và chỉ cancel với PR.
2. **`permissions` đặt ở cấp workflow** (`deploy.yml:10-13`) nên job `test` cũng nhận `pages: write` +
   `id-token: write` dù không cần. Chuyển xuống job `deploy`.
3. **Chuỗi `code` nhiều dòng bị bẹp.** `js/ml/logreg.js:69` chứa `\n` + thụt đầu dòng; `panel.js:28` gán
   bằng `textContent` vào `<button>`; `css/style.css:112-120` **không** đặt `white-space: pre`. Nút mặc định
   `white-space: normal` → dòng code hai dòng duy nhất trong repo hiển thị dồn thành một cục.
   Một app lấy việc trình bày code làm luận đề thì đây không phải chuyện nhỏ.
4. **`norm(w) || 1` che chia-cho-0 rồi in ra số sai.** `js/lessons/L02.js:73`: khi kéo cả `w₁`, `w₂` về 0
   (slider cho phép, `:41-42`), `norm(w) = 0` → `nw = 1` → nhãn ở `:95` in
   *"khoảng cách tới ranh giới = |z|/‖w‖ = |b|"* trong khi ranh giới **không tồn tại** và `line2d`
   (`plot.js:87-94`) không vẽ gì. Lại là "hình vẽ nói dối", trong đúng bài dạy hình học.
5. **Toy 2D là bài toán mà mô hình đang dạy *chắc chắn* tối ưu.** `js/data/gen.js:44-46` sinh hai Gaussian
   **đẳng hướng, cùng `spread`** → biên Bayes tối ưu **đúng là tuyến tính**, logistic regression là mô hình
   đúng theo định nghĩa. Đây chính là "lập luận vòng tròn" mà `PLAN.md:208-210` hứa tránh ở T2 — nhưng nó
   đã có mặt ngay ở Bài 3. Sửa rẻ: cho hai lớp hai ma trận hiệp phương sai khác nhau → biên tối ưu thành
   bậc hai, LR **nhìn thấy được là chưa đủ**, mở đường tự nhiên sang Bài 8.
6. **Test seeded RNG chỉ kiểm giá trị đầu tiên.** `js/tests/golden.js:69-77` kiểm `X[0]` và `mulberry32(1)()`
   — một generator hỏng phần cập nhật state (trả mãi cùng một số) vẫn qua cả ba assertion. Kiểm cả chuỗi
   (ví dụ hash 100 giá trị đầu).
7. **Committed = published.** `deploy.yml:60` `rsync -a --exclude '.git' --exclude '.github' --exclude '_site'`
   → mọi file đã commit lên site công khai. Hôm nay vô hại; nhưng bước tiếp theo của dự án là làm việc với
   CDR thật, và một file mẫu commit nhầm sẽ **tự động lên internet**. Đổi sang allowlist
   (`index.html css/ js/ vendor/ sw.js`) trước khi dữ liệu thật xuất hiện gần repo này.
8. **CI không chạy `tools/lint_workflows.py`** dù `README.md:28` bảo người chạy tay. Thêm vào job `test` —
   nó không tự bắt được `deploy.yml` hỏng (workflow hỏng thì không khởi động), nhưng bắt được mọi workflow
   thêm về sau.

---

## 6. Việc phải làm, theo thứ tự

**Trước khi viết thêm một dòng bài học nào:**

1. `value_counts` trên `scam_flag` — có giá trị 0 không? (P0-5). Một câu, đổi cả thiết kế.
2. Xin `verdict_at` cho bảng nhãn. Không có thì chốt seasoning window và ghi vào PLAN (§3.2).
3. Data dictionary cho `release_cause`, `completion_code`, `direction`, đơn vị `duration`, timezone
   `startDateTime` (§0 phản bác 5).

**Sửa code đang dạy sai (nửa ngày):**

4. `app.js` — attach trước render (**P0-1**). Đây là bug rẻ nhất và ảnh hưởng rộng nhất.
5. `logreg.js` history + `L03.js` nhãn/vạch — định nghĩa lại "vòng t" cho ba biểu diễn khớp nhau (**P0-3**),
   kèm test invariant: `loss(history[t].w) === history[t].loss`.
6. `L02.js:29` — sửa cả hai vế của câu; muốn giữ biên phải scale **cả `(w, b)`**.
7. `lossStep` — clamp `p`, hiển thị đúng cái chạy, `make_golden.py` clamp theo, trả `loss` về `TOL = 1e-12` (**P0-2**).
8. `sw.js:35` lọc theo prefix; `plot.js` thêm `destroy()`, gọi trong `lesson:leave`.

**Hạ lời hứa (15 phút, phải làm ngay vì đang sai sự thật):**

9. `README.md:60` và tên bước CI `deploy.yml:33` — hoặc sửa cho đúng, hoặc thêm kiểm tra thật (§0 phản bác 4).

**Rồi mới tới PLAN:**

10. Viết lại Bài 5 và Bài 7 theo ràng buộc PU (**P0-4**) — bao gồm dòng ngân sách cho **slice review thủ công**.
11. Thêm bài "Cơ chế nhãn & PU" vào slot của Bài 9; đưa text sang Khoá 2 (`lessons/index.js:64-70`, `PLAN.md:120-126`).
12. Thêm hộp "8 cột này KHÔNG cho biết gì" vào Bài 1; lọc taxonomy theo vantage point (§4).

---

_Không sửa file nào ngoài tệp này. `git status` giữ nguyên._
