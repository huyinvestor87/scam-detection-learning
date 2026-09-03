# DATA.md — Hợp đồng dữ liệu (chốt 2026-09-03)

Tổng hợp câu trả lời của Huy cho các câu hỏi P0 trong `REVIEW-2-*.md`.
Đây là ràng buộc thiết kế cho mọi bài học từ đây trở đi.

---

## 1. CDR — 8 cột

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `cli` | string | Số gọi (A-number). Cardinality cao, có thể bị spoof. Không dùng thô làm feature — chỉ prefix / mã vùng / độ dài / hợp lệ. |
| `cld` | string | Số bị gọi (B-number). Prefix `cld` → quốc gia / premium-rate, **cần bảng prefix E.164 vendor kèm repo**, không suy được từ cột này. |
| `direction` | enum | **Chỉ `outbound`.** Phương sai = 0 → **bỏ khỏi feature**. Ý nghĩa: nhà mạng nhìn lưu lượng khách hàng *gọi ra*. |
| `duration` | int | **Giây.** Phân biệt `0` (không nghe máy / rớt) với cuộc có đàm thoại. |
| `customer_id` | string | Tài khoản. **Grain dự đoán = `(customer_id, cửa sổ thời gian)`.** Group split theo cột này. |
| `release_cause` | int | **Mã Q.850** (xem §3). |
| `completion_code` | enum | `initial · attempted · completed · answered · released · expired` (xem §4). |
| `startDateTime` | timestamp | **UTC.** Feature "gọi đêm" cần timezone của khách — suy từ quốc gia khách hoặc prefix, không có sẵn. |

## 2. Nhãn

- Bảng riêng: `(customer_id, cli, scam_flag)` — **subset nhỏ**.
- `scam_flag` **chỉ có giá trị 1** (không có 0). ⇒ **Positive-Unlabeled thuần.**
- **`verdict_at` CÓ** — thời điểm nhãn được xác lập. ⇒ temporal split trung thực **làm được** trên dữ liệu thật.

### Hệ quả PU (phải đưa vào PLAN)

- `P(y=1|x)` chỉ định danh được sai khác hằng `c = P(gán nhãn | thật sự dương)`.
  - **Giữ được:** ranking, top-K triage, ROC-AUC (xấp xỉ).
  - **KHÔNG tính được nếu chưa mua nhãn:** precision, PR-AUC, reliability diagram, Platt/isotonic, ngưỡng Bayes `t*`.
- Cần dạy: giả định **SCAR vs SAR**, propensity `c` (Elkan–Noto), class prior `π`, **nnPU risk**.
- Nhãn từ khiếu nại/verdict ⇒ gần chắc là **SAR** (lệch về campaign to, gây hại nhiều), không phải SCAR. Phải nói rõ — nó quyết định mọi hiệu chỉnh sau đó.
- **Bài 7** (calibration + ngưỡng chi phí): mở đầu bằng "mục này không tính được nếu chưa có slice đã review thủ công". Kế hoạch phải có **dòng ngân sách cho slice review phân tầng theo score** (negative đã xác minh).

### Grain nhãn ≠ grain dự đoán

- Nhãn ở `(customer_id, cli)`; dự đoán ở `(customer_id, window)`.
- Đây là **bài toán định nghĩa target**, KHÔNG phải leakage. Gộp `cli → account` bằng `any()` / `k-of-n` / tỉ trọng lưu lượng bẩn — mỗi cách cho một prevalence và một bài toán khác nhau.
- `cli` bị spoof ⇒ **bộ nhãn cũng bị spoof lây**: một `cli` gán bẩn có thể chỉ là số bị mạo danh. (Nội dung tốt cho Bài 1.)

### Label maturity

- `verdict_at` có, nhưng cửa sổ gần hiện tại vẫn **thiếu nhãn chưa chín** (cuộc tuần trước có thể bị gắn tháng sau) → right-censoring.
- Train: cắt trước `T − seasoning_window` (ví dụ 90 ngày), ghi rõ là giả định.
- Dùng nhãn phát hiện *sau* `T` để train dữ liệu *trước* `T` = rò rỉ độc. Positive lộ sau `T` làm nhiễu negative trong train thì PU chịu được.

## 3. `release_cause` — Q.850 (ITU-T)

ISUP REL cause value; map sang/từ SIP qua RFC 3398 & RFC 3326 (header `Reason`).

Nhóm hay gặp:

| Code | Nghĩa | Tín hiệu |
|---|---|---|
| 1 | Unallocated (unassigned) number | dò số / danh sách sai |
| 3 | No route to destination | dò số |
| 16 | Normal call clearing | bình thường; đáng ngờ khi đi kèm duration ≈ 0 |
| 17 | User busy | auto-dialer khi tỉ lệ cao |
| 18 | No user responding | robocall / wangiri khi tỉ lệ cao |
| 19 | No answer (user alerted) | robocall / wangiri |
| 20 | Subscriber absent | robocall / wangiri |
| 21 | Call rejected | bị chặn phía nhận |
| 28 | Invalid number format (incomplete) | dò số tuần tự |
| 31 | Normal, unspecified | — |
| 34 / 42 | No circuit available / Switching congestion | lạm dụng capacity |
| 102 | Recovery on timer expiry | timeout, gần nghĩa `expired` |

**Chữ ký fraud (outbound):** tỉ lệ cao `17/18/19/20/1` + cuộc rất ngắn + volume lớn + nhiều `cld` phân biệt → auto-dialer / robocall / IRSF harvesting. Nhiều `1/3/28` → quét số tuần tự.

Việc phải làm *trước* khi viết bài: `value_counts(release_cause)` + crosstab `release_cause × completion_code × (duration == 0)` trên dữ liệu thật để xác nhận đúng Q.850 và bắt trùng thông tin giữa hai cột.

## 4. `completion_code` — vòng đời cuộc gọi

`initial → attempted → answered → completed` ; nhánh `released` / `expired`.

Diễn giải (cần team xác nhận):

| Giá trị | Nghĩa | 
|---|---|
| `initial` | Bản ghi tạo, setup bắt đầu |
| `attempted` | Đã quay số, đẩy vào mạng |
| `answered` | Bên nhận nhấc máy (B-answer) |
| `completed` | Kết thúc bình thường sau khi đã đàm thoại |
| `released` | Bị tear-down (có thể trước hoặc sau answer) |
| `expired` | Hết giờ, không nghe máy (ring-no-answer) |

Feature rút ra:
- `answered / attempted` = **ASR** (Answer-Seizure Ratio) — ở đây ASR ≠ speech recognition.
- `expired / attempted` = tỉ lệ không nghe máy → wangiri / robocall.
- `answered` & `duration ≈ 0` → short-call ratio → pump-and-dump / IRSF ngắn.
- `completed` vs `released` → chất lượng kết thúc.

## 5. Taxonomy — lọc theo vantage point (outbound, nhà mạng nhìn khách mình)

**Trong phạm vi:**
- Khách chạy **wangiri phía originator** (chiến dịch gọi nhỡ 1 hồi chuông) — volume lớn, `expired`/`18`/`19`, duration ≈ 0.
- **IRSF từ PBX/SIP trunk của khách bị chiếm** — đột biến gọi ra quốc tế / premium.
- **Robocall / vishing do chính khách chạy** — burst, fan-out `cld` lớn, ACD thấp.

**Ngoài phạm vi:** wangiri phía nạn nhân (fraudster gọi *tới* thuê bao ta) — trừ khi khách của ta *là* kẻ chạy.

**8 cột này KHÔNG cho biết:** PDD / ring duration (không có `answer_time`), charge / tariff (⇒ IRSF không *xác nhận* được, chỉ nghi ngờ), call-id (⇒ dedup phải suy đoán), mã trunk (⇒ không tách PBX bị chiếm khỏi hành vi hợp pháp của khách).

## 6. Việc phải làm trước khi viết thêm bài

1. `value_counts(scam_flag)` — xác nhận không có 0. ✅ (Huy: không có 0)
2. `verdict_at` — ✅ có. Lấy đúng tên cột + đơn vị + timezone.
3. `value_counts` + crosstab cho `release_cause`, `completion_code`; xác nhận Q.850.
4. Bảng prefix E.164 (quốc gia / premium-rate) để vendor vào repo.
5. Bảng timezone theo `customer_id` (hoặc quy tắc suy ra).
