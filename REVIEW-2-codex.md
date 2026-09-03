# Review vòng 2 — Codex (nghiêm khắc)

Phạm vi: toàn repo, `PLAN.md`, M0 và bài 1–3. Đã chạy `npm test`: **21/21 đạt**. Kết luận: **chưa nên build bài 4** trước khi sửa hợp đồng dữ liệu và định nghĩa nhãn. Tôi đồng ý phần lớn `REVIEW-2-claude.md`, nhưng Claude còn bỏ sót lỗi trace bài 3 và đánh giá service worker quá nhẹ.

## P0 — Sai hợp đồng dữ liệu / không thể thực hiện lời hứa sản phẩm

1. **Schema thật không có `y`, transcript hay audio.** PLAN vẫn đặt supervised learning làm xương sống bài 1–8 và T3 còn chứa transcript (`PLAN.md:44-48`, `PLAN.md:202-206`); bài 9 dạy ASR (`PLAN.md:120-126`, `js/lessons/index.js:64-70`). Đây không phải “tín hiệu khác” mà là **nguồn dữ liệu không tồn tại**. Chuyển bài 9 sang Khoá 2; T3 phải là CDR-only.

2. **Bài 1 kể nguồn nhãn giả định, chưa định nghĩa join có thể chạy.** “Khiếu nại/blacklist/tổn thất” (`js/lessons/L01.js:62-64`) không nằm trong 8 cột. Cần một data contract riêng: nguồn verdict nào, key nào, thời điểm `observed_at`/`available_at`, TTL, policy negative/unlabeled và độ trễ. Không có contract này thì không được gọi bản ghi còn lại là nhãn 0 và cũng chưa đủ cơ sở kết luận toàn bộ bài toán là PU learning. Câu đó hiện khẳng định quá mức (`L01.js:64`).

3. **Generator không sinh CDR.** Nó sinh thẳng `X, y` với hai feature đã tổng hợp (`js/data/gen.js:27-57`), trong đó `y` được tạo từ chính Gaussian component. PLAN hứa 50.000 CDR bẩn nhưng chưa có (`PLAN.md:202-210`). Trước bài 4 phải có raw rows đúng 8 tên cột, schema/types/missing/duplicates, rồi một feature builder point-in-time từ raw CDR; nhãn giả lập phải ở bảng verdict tách biệt, có thời điểm xuất hiện. Nếu không, demo leakage chỉ là sân khấu do tác giả dựng.

4. **“Pipeline thật” cần kiểm chứng, không được dùng như thẩm quyền.** Bài 1 khẳng định grain và feature cụ thể (`L01.js:59-60`), các outline nêu `latest verdict wins`, hàm Python và `ensemble.py` (`js/lessons/index.js:21`, `:77`, `:86`). README có link repo (`README.md:71-74`), nhưng khoá học phải link đến commit/file/dòng cố định hoặc gọi rõ đây là thiết kế tham khảo. Quan trọng hơn: “enforcement tác động lên account nên prediction cũng phải account” không tất yếu; scoring grain và action grain có thể khác nhau.

## P0 — Nội dung đang dạy sai / code và hình không đồng bộ

1. **Bài 2 sai khi `b != 0`.** Câu “nhân đôi w ... ranh giới không dịch” (`js/lessons/L02.js:27-30`) chỉ đúng khi `b=0`; UI lại cho chỉnh `b` (`:41-44`). Muốn giữ cùng biên quyết định phải scale **cả** `(w,b)` bởi cùng số dương. Đồng ý Claude, phải sửa ngay.

2. **History bài 3 lệch một bước.** `train()` chạy loss/gradient tại `(w_t,b_t)`, sau đó lưu **trọng số mới** cùng **loss cũ** (`js/ml/logreg.js:141-149`). UI lấy cặp này làm cùng snapshot (`js/lessons/L03.js:63-65`, `:97-99`), còn panel lại chạy thêm một iteration từ trọng số snapshot (`:57-61`). Vì vậy code, số loss, biên quyết định và trace không cùng thời điểm — trực tiếp phá lời hứa code ↔ toán ↔ hình. Lưu state trước update kèm trace/loss, hoặc recompute loss sau update và định nghĩa epoch nhất quán; thêm test invariant cho snapshot.

3. **Cross-entropy hiển thị không phải code chạy.** `run` dùng `log(p + EPS)` và `log(1-p + EPS)`, chuỗi hiển thị bỏ `EPS` (`js/ml/logreg.js:63-70`). Ngoài việc lệch lời hứa, cộng epsilon có thể cho loss âm rất nhỏ tại `p=1`; cách ổn định đúng là BCE-from-logits/softplus hoặc clamp `p` vào `[eps,1-eps]` và hiển thị đúng code.

4. **Phát biểu hệ số logistic quá mạnh.** Điều kiện “chỉ có ý nghĩa nếu feature không tương quan mạnh” (`js/lessons/L03.js:29-31`) không phải điều kiện toán học của odds ratio có điều kiện. Đa cộng tuyến làm hệ số bất ổn/sai số lớn và phá diễn giải nhân quả, không làm identity `exp(w_j)` mất nghĩa trong model. Đồng thời sigmoid là **inverse** của canonical logit link, không phải “canonical link” (`L03.js:27`).

5. **Xác suất/calibration bị nói tuyệt đối.** Logistic regression mô hình hoá xác suất có điều kiện; calibration là việc cần đánh giá và đôi khi sửa, không phải điều kiện bắt buộc để một output được gọi là estimated probability (`js/ml/logreg.js:21-30`, `L02.js:30`). Viết “chưa chắc calibrated” thay vì “muốn đọc như xác suất thì cần hiệu chỉnh”.

6. **Toy prevalence mâu thuẫn mà không báo.** Bài 1 dùng 1,5%, bài 2–3 mặc định 28% (`js/data/gen.js:35`; `L02.js:33`; `L03.js:34`). Toy cân bằng để nhìn hình là hợp lý, nhưng phải ghi cầu nối rõ và tuyệt đối không dùng metric/threshold từ toy như thực tế. PLAN còn hứa “1 triệu chấm” (`PLAN.md:65-69`) trong khi hình vẽ 2.720 chấm và phép tính dùng 200.000 account (`L01.js:87`, `:136`, `:141`).

## P0 — `codemath`: test không giữ lời hứa “code hiển thị = code chạy”

- `Step` vẫn có hai nguồn sự thật: function `run` và string `code` (`js/codemath/step.js:22-35`). Test số vàng chỉ kiểm `run`; với chuỗi hiển thị nó chỉ kiểm tra không rỗng (`js/tests/golden.js:58-63`). Đổi `sub(ps,y)` thành `sub(y,ps)` trong string vẫn xanh. README còn tuyên bố CI sẽ bắt sửa công thức quên sửa code (`README.md:48-60`) — sai.
- Test cũng không chứng minh `math` tương ứng với `run`: LaTeX chỉ được kiểm tra không rỗng. Oracle Python tự viết lại xác nhận vài con số logistic, không xác nhận semantics của string/code/math/viz. Tên CI “code hiển thị phải khớp code chạy” (`.github/workflows/deploy.yml:28-34`) gây hiểu lầm.
- Không nên dùng `run.toString()`/lint substring như Claude đề xuất: vẫn là heuristic và source khó đọc. Giải pháp chắc hơn là một AST/DSL nhỏ sinh cả evaluator lẫn pretty-printer code/math; hoặc hạ lời hứa thành “Step chạy được kiểm số, biểu diễn code/math được review”. Trước khi có DSL, thêm mutation test cố tình sửa `code`/`math` để chứng minh validator thật sự fail.
- Coverage hiện chỉ logistic và seeded RNG; câu “mọi hàm linalg đều có test” là sai (`js/ml/linalg.js:1`): `norm`, `add`, kiểm lỗi shape và edge cases không được test.

## P1 — Lộ trình sư phạm cho CDR-only

Giữ 12 slot nhưng không giữ 12 chủ đề hiện tại. Thứ tự hợp lý hơn:

1. Schema, taxonomy, grain/action, nguồn nhãn và baseline rule.
2. Từ 8 cột → feature point-in-time theo account/CLI/destination/window.
3. Linear score + logistic trên toy (nói rõ toy).
4. Metrics lớp hiếm **và uncertainty**.
5. Temporal/group split, delayed-label evaluation, leakage.
6. Rolling/burst/sequence features (đưa bài 10 lên đây).
7. Regularization, categorical/high-cardinality, missing/data quality.
8. Calibration, capacity/cost threshold và abstain/review queue.
9. Trees/boosting, chỉ dạy đủ để so baseline; không cần Taylor bậc hai trong MVP nếu làm loãng pipeline.
10. Graph/campaign/entity resolution.
11. Unsupervised/rules khi chưa có nhãn; đánh giá không nhãn phải nói rõ giới hạn.
12. Drift, backtest, feedback và capstone CDR-only.

Đưa transcript/TF-IDF/NB ra Khoá 2. Metrics nên trước split về khái niệm, nhưng split phải được thiết lập trước mọi con số performance; vì vậy tôi không hoàn toàn đồng ý cách Claude chỉ đơn giản đảo 5 trước 4. Tốt nhất bài metrics dùng prediction fixture, rồi bài split mới tạo evaluation hợp lệ.

## P1 — Domain telecom còn thiếu

- Cần taxonomy **không được nhập nhằng**: wangiri, IRSF, PBX/credential compromise, robocall, vishing. CDR-only không xác nhận nội dung lừa đảo/vishing; chỉ cho risk/anomaly. Đừng dùng nhãn chung “scam” như ground truth chắc chắn.
- Chữ ký khả dụng: ASR (Answer-Seizure Ratio; phải tránh nhầm ASR = speech recognition), ACD, short/zero-duration ratio, attempt/completion/busy/no-answer ratios, burstiness, inter-arrival, unique CLI/CLD, destination prefix/country, giờ địa phương, fan-out/fan-in, reciprocal/callback pattern.
- `release_cause` không tự động là Q.850 chuẩn; `completion_code` có thể vendor-specific. Phải có mapping/version và kiểm consistency; không suy “answered” chỉ từ duration. Claude gọi hai cột này là “mạnh nhất” là quá chắc khi chưa có data dictionary.
- `direction` quyết định vai trò CLI/CLD; inbound/outbound có semantics và exposure khác nhau. Wangiri gồm pha missed-call và callback; IRSF cần destination/tariff/intelligence bổ sung mới phân biệt được gọi quốc tế hợp pháp. Robocall có thể thấy burst/fan-out/ACD thấp, nhưng CDR không chứng minh automation.
- Cần phân biệt spoofed CLI, customer/account, trunk/PBX và campaign. Group split một chiều theo customer (`js/lessons/index.js:18`) chưa đủ; có thể leakage qua CLI, CLD prefix/campaign/time overlap. Entity resolution không thể hứa chắc chỉ từ 8 cột.
- Thiếu exposure denominator và seasonality: call attempts/account-minute, customer size, quốc gia/timezone, ngày lễ; nếu không model chỉ bắt khách hàng lớn hoặc giờ cao điểm. Thiếu policy/capacity: block, rate-limit, challenge hay manual review có chi phí khác nhau.

## P1 — Kỹ thuật / hạ tầng

1. **Service worker chưa “offline sau lần tải đầu”.** Precache chỉ có shell/app (`sw.js:17-24`); các dynamic lesson/module không được precache, nên bài chưa từng mở sẽ không chạy offline. URL app có query build id (`index.html:23`) nhưng precache URL không có query (`sw.js:23`), nên offline lookup không chắc trúng exact request.
2. **Có thể xoá cache của app khác cùng origin.** Activate xoá mọi cache có tên khác `CACHE` (`sw.js:32-36`), không lọc prefix. Trên GitHub Pages cùng origin, đây là hành vi phá sibling app. Chỉ xoá cache bắt đầu bằng prefix của repo.
3. **Cache write không gắn lifetime fetch event.** `put()` mở cache bất đồng bộ nhưng không return/await promise ghi (`sw.js:40-45`); worker có thể bị terminate trước khi `c.put` xong. Trả promise hoặc dùng `event.waitUntil`.
4. **Memory leak đã có.** Mỗi `createPlot` gắn anonymous resize listener và không có `destroy()` (`js/viz/plot.js:135-137`). Router chỉ phát leave cho root cũ (`js/app.js:35-40`); bài 3 chỉ dừng timer (`L03.js:177`), bài 1–2 không cleanup. Điều hướng lặp tích listener và giữ closure/canvas/data cũ.
5. **Race router.** `route()` await dynamic import (`js/app.js:35-67`) nhưng không có navigation token; đổi hash nhanh có thể để route cũ render sau route mới.
6. **Worker mới chỉ là lời hứa.** PLAN yêu cầu worker + cancel (`PLAN.md:212-219`) nhưng repo chưa có. Khi build: protocol có job id, cancellation/cooperative abort, terminate khi leave, transfer typed arrays, giới hạn dataset/epochs và test stale response; không gửi 50k object rows lặp lại bằng structured clone.
7. **CI quá hẹp.** Chỉ test một script Node (`package.json:7-10`); không có lint/typecheck, DOM/browser test, SW/offline test, accessibility, memory/navigation test. CI tái sinh fixture trước test (`deploy.yml:28-34`), nên không kiểm fixture commit có drift; thêm `git diff --exit-code fixtures/golden.json`. `lint_workflows.py` còn chỉ được README bảo chạy tay (`README.md:25-29`).
8. **KaTeX fallback và canvas accessibility.** `renderMath` fallback một lần (`js/mathrender.js:3-14`); canvas không có semantic/table alternative. Đây là lỗi reliability/accessibility, không chỉ polish.

## Quyết định bắt buộc trước M1 tiếp theo

1. Chốt data dictionary 8 cột và nguồn/bảng nhãn ngoài CDR; nếu chưa có nhãn, đổi mục tiêu MVP thành anomaly/rule-assisted triage, không giả supervised ground truth.
2. Sửa ba lỗi đang dạy sai: scale `(w,b)`, snapshot/trace bài 3, BCE hiển thị lệch runtime.
3. Thay generator bằng raw CDR + point-in-time feature builder + verdict table tách biệt.
4. Hạ lời hứa codemath hoặc xây DSL/test thật; test hiện tại **không đủ**.
5. Đưa text ra khỏi MVP; tái cấu trúc quanh temporal/behavioral/graph CDR.
6. Sửa service worker và lifecycle cleanup trước khi thêm viz/worker nặng.

**Phán quyết:** PLAN v2 tốt hơn v1 về ML cơ bản, nhưng **chưa phù hợp dữ liệu thật**. Ba bài đã build dùng toy hợp lệ để dạy toán, song đang kể toy như pipeline CDR thật và có hai lỗi trực tiếp phá tính đúng đắn của hình/trace. Không đạt tiêu chuẩn để tiếp tục mở rộng nếu các P0 trên chưa được xử lý.
