# scam-detection-learning

Web app học **Machine Learning để phát hiện cuộc gọi lừa đảo**, dạy bằng cách liên kết
**code ↔ toán ↔ hình động** theo hai chiều.

Rê chuột hoặc chạm vào một dòng code → công thức tương ứng sáng lên, giá trị số thật hiện ra
bên cạnh, và đại lượng đó được làm nổi bật trong hình vẽ. Kéo slider → cả ba cùng đổi.

Chạy offline sau lần tải đầu. Không framework, không build step.

## Trạng thái

| | |
|---|---|
| Bài đã build | **3 / 12** (bài 1, 2, 3) |
| Contract test | 21/21 đạt — `node js/tests/golden.js` |
| Mốc hiện tại | M0 xong, M1 đang dở (còn bài 4 và 5) |

Bài 4–12 đã có đề cương chi tiết, hiển thị ngay trong app ở mục "sắp có".

## Chạy thử

```bash
python3 -m http.server 8080     # rồi mở http://localhost:8080
node js/tests/golden.js         # chạy contract test
```

## Lộ trình 12 bài

**I · Nền tảng làm đúng** — 1 Thiết kế bài toán và nhãn · 2 Vector và điểm số tuyến tính ·
3 Logistic regression & gradient descent · 4 Chia dữ liệu và rò rỉ · 5 Đo lường cho lớp hiếm

**II · Mô hình mạnh hơn** — 6 Regularization và tiền xử lý CDR ·
7 Hiệu chỉnh xác suất và ngưỡng theo chi phí · 8 Cây quyết định và gradient boosting

**III · Tín hiệu khác và vận hành** — 9 Text trên transcript ASR nhiễu ·
10 Đặc trưng thời gian và hành vi · 11 Đồ thị cuộc gọi và bất thường không nhãn ·
12 Vận hành: drift, giám sát, vòng phản hồi

Chi tiết từng bài, các quyết định thiết kế và lý do: [`PLAN.md`](PLAN.md).

Audio (MFCC, CNN spectrogram, voice deepfake), Transformer/PhoBERT và bản tiếng Anh
được hoãn sang **Khoá 2** — xem phần "Đã hoãn" trong `PLAN.md`.

## Vì sao tin được rằng công thức đúng là code đang chạy

Đây là lời hứa dễ nói và khó giữ. Cách giữ ở đây là **bằng số, không bằng tuyên bố**:

- Mỗi bước học là một **Step** (`js/codemath/step.js`) — nó vừa chứa hàm chạy thật (`run`),
  vừa chứa chuỗi code hiển thị và công thức LaTeX. Model trong `js/ml/logreg.js`
  **được lắp từ chính các Step đó**, nên không tồn tại bản sao thứ hai để lệch nhau.
- `tools/make_golden.py` cài đặt lại toàn bộ phép tính bằng **Python thuần, độc lập hoàn toàn**,
  rồi ghi số vàng ra `fixtures/golden.json`.
- `js/tests/golden.js` chạy các Step và so với số vàng, dung sai `1e-12`. CI chạy cả hai bước
  trước khi cho phép deploy.

Nếu ai đó sửa công thức trong bài mà quên sửa code (hoặc ngược lại), CI hỏng ngay.

## Nguồn gốc

Quy trình đã chạy: **Claude Opus 5 lên plan → Codex review nghiêm khắc → sửa thành v2 → build.**

Bản review gốc giữ nguyên trong [`REVIEW-codex.md`](REVIEW-codex.md). Codex bác bỏ khá nhiều
thứ trong bản đầu — thiếu split/leakage, dataset quá ít mẫu dương, engine mâu thuẫn về thiết kế,
phạm vi 24 bài quá tham vọng, cùng 10 lỗi công thức. Mục 0 của `PLAN.md` đối chiếu từng điểm
với cách đã sửa.

Khoá học neo vào một hệ thống thật: pipeline Python phát hiện outbound scam abuse ở repo
[`huyinvestor87/scam-detection`](https://github.com/huyinvestor87/scam-detection).
Nhiều bài chỉ thẳng vào file cụ thể trong đó — grain `(customer_id, window)`, `ensemble.py`,
`drift.py` — để học xong là đọc hiểu được code thật, không dừng ở ví dụ đồ chơi.

## Cấu trúc

```
index.html            Khung + điều hướng
css/style.css         Giao diện, responsive, tối ưu chạm ≥44px cho iPad
sw.js                 Service worker — offline sau lần tải đầu
vendor/katex/         KaTeX vendored, chỉ woff2 (596 KB)
js/
  app.js              Router hash + mục lục
  codemath/step.js    Step — nguồn sự thật duy nhất cho code ↔ toán ↔ hình
  codemath/panel.js   Panel liên kết hai chiều, hover + chạm + bàn phím
  mathrender.js       Bọc KaTeX
  viz/plot.js         Canvas 2D, HiDPI, tuỳ chọn equal-aspect
  ml/                 linalg.js, logreg.js — lắp từ Step
  data/gen.js         Sinh dữ liệu có seed (mulberry32)
  lessons/            L01–L03 đã build, index.js chứa đề cương 12 bài
  tests/golden.js     Contract test
tools/make_golden.py  Sinh số vàng bằng Python độc lập
fixtures/golden.json
```

## Ghi chú kỹ thuật

- **Trục 1:1 là bắt buộc** với hình dạy hình học. `createPlot(..., { equal: true })` — thiếu nó
  thì vector pháp tuyến **w** trông không vuông góc với ranh giới, và hình vẽ nói dối.
- **Mọi nguồn ngẫu nhiên đều có seed.** Không dùng `Math.random` ở bất cứ đâu ảnh hưởng nội dung
  dạy — bài học, slider, test và thanh tua đều phải tái lập được.
- **Chạm ≠ hover.** Mỗi dòng code là một `<button>` thật, có trạng thái chọn rõ ràng và
  điều hướng được bằng bàn phím.
