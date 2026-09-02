# Codex review — PLAN.md v1

_Reviewer: codex-cli 0.152.0 · 2026-09-02 · yêu cầu: review nghiêm khắc vai trò senior ML engineer + giáo viên_

---

## Kết luận thẳng

Plan này có ý tưởng lõi tốt, nhưng hiện tại **chưa đủ chặt để bắt đầu xây 24 bài**.

Bốn vấn đề nghiêm trọng nhất:

1. **Nhầm “dạy nhiều thuật toán” với “đủ để xây hệ thống thật”.** Phần dữ liệu, chống leakage, validation theo thời gian/thực thể, calibration và thiết kế nhãn còn thiếu — đây mới là chỗ hệ thống scam detection thường thất bại.
2. **Phạm vi quá lớn, ước lượng sai khối lượng.** Câu “M1 chạy đẹp thì 23 bài còn lại chỉ là viết nội dung” là sai rõ ràng.
3. **Dataset 5.000 dòng, 1,5% scam chỉ có khoảng 75 mẫu dương.** Không đủ để train/validation/test đáng tin, chưa nói đến boosting, calibration, drift hay Transformer.
4. **`codemath.js` chưa có mô hình kỹ thuật khả thi cho cam kết “code hiển thị luôn giống code chạy”.** Plan vừa lưu code dưới dạng chuỗi, vừa nói sinh nó từ source thật — hai thiết kế này mâu thuẫn.

---

## 1. Lộ trình 24 bài: chưa đúng và chưa đủ

### Thiếu nghiêm trọng

Các chủ đề sau quan trọng hơn Word2Vec, LSTM hay autoencoder nhưng đang vắng mặt:

- **Train/validation/test và data leakage**, đặc biệt:
  - chia theo thời gian;
  - group split theo số gọi/campaign;
  - không để cùng một caller xuất hiện ở cả train và test;
  - không tính feature tương lai cho cuộc gọi quá khứ.
- **Định nghĩa đơn vị dự đoán và nhãn**: dự đoán một cuộc gọi, một số điện thoại hay một campaign? Nhãn từ khiếu nại, blacklist hay tổn thất đã xác nhận? Nhãn scam thường trễ, thiếu và nhiễu.
- **Tiền xử lý dữ liệu CDR**: missing values, categorical/high-cardinality features, scaling, rolling-window features, caller-ID spoofing và entity resolution.
- **Calibration trước khi tối ưu ngưỡng**. Cost threshold chỉ có ý nghĩa rõ khi xác suất được hiệu chỉnh. Plan để calibration tận bài 6.3, sau bài threshold rất lâu.
- **Đánh giá theo vận hành**: recall tại một mức FP cho phép, precision@K, số cuộc chặn nhầm mỗi triệu cuộc gọi, confidence interval và backtest theo thời gian.
- **Baseline rule/reputation/blacklist kết hợp ML**. Hệ thống chống scam thực tế hiếm khi chỉ là một classifier.
- **Delayed/noisy labels, positive–unlabeled hoặc weak supervision, active learning**.
- **ASR và lỗi ASR**: WER, confidence, chuẩn hóa tiếng Việt, code-switching, mất dấu, nhiễu tổng đài. Plan nói audio → ASR → transcript nhưng bỏ qua toàn bộ mắt xích khó nhất.
- **Character n-gram + linear classifier/SVM**. Đây thường là baseline mạnh, rẻ và phù hợp transcript ASR nhiễu hơn Word2Vec/LSTM.
- **Temporal/behavioral modeling** cho chuỗi hành vi cuộc gọi. RNN hiện chỉ được dùng cho transcript, trong khi chuỗi CDR mới là tín hiệu cốt lõi.

Vì vậy, khẳng định “Phase 1–3 đủ làm một hệ thống thật dùng được” ở [PLAN.md:112](/home/huy/.openclaw/workspace/scam-detection/PLAN.md:112) là **không có cơ sở**. Nó chỉ đủ cho một demo classifier trên bảng dữ liệu đã làm sạch.

### Thứ tự sư phạm sai

- Metrics, split và leakage phải xuất hiện **trước hoặc ngay sau mô hình đầu tiên**, không nên đợi đến Phase 3. Hiện người học train nhiều mô hình trước khi được dạy cách biết chúng có tốt thật hay không.
- Calibration phải đi cùng xác suất và cost-sensitive decisions, không nên để ở Phase 6.
- Phase 6 đang nhồi graph, anomaly detection và production vào ba bài. Mỗi nhóm là một chủ đề lớn, không phải phần kết ngắn.
- Naive Bayes được đặt trong “phân loại tuyến tính” hơi gượng; đây là mô hình sinh. Có thể làm baseline text, nhưng nên đặt cạnh TF-IDF/character n-gram.
- Word2Vec → LSTM → Transformer là lộ trình mang tính lịch sử hơn là lộ trình hiệu quả cho ứng dụng. Nếu có giới hạn thời gian, nên bỏ Word2Vec và LSTM hoặc chuyển thành phần đọc thêm.
- Audio đang trộn ba bài toán khác nhau:
  - nhận biết nội dung scam;
  - nhận diện người nói;
  - phát hiện audio giả.
  
  Embedding + cosine chủ yếu gợi đến speaker verification, **không tự động trở thành deepfake detector**.

### Thuật toán nào nên thêm?

Không cần cố thêm thật nhiều. Nếu phải chọn:

- linear SVM/logistic trên word + character n-gram;
- LightGBM/CatBoost hoặc ít nhất giải thích categorical boosting;
- label propagation/community detection cho graph;
- change-point hoặc temporal aggregation cho hành vi;
- calibration và uncertainty;
- hybrid rules + model.

KNN không cần thiết, GNN có thể để nâng cao. Vấn đề lớn hiện tại không phải thiếu “thêm một classifier”, mà thiếu quy trình xây và đánh giá hệ thống đúng.

---

## 2. Các công thức sai hoặc viết ẩu

### Sai hoặc dễ dạy sai

- Ở [PLAN.md:55](/home/huy/.openclaw/workspace/scam-detection/PLAN.md:55), \(w^\top x+b\) được gọi là “bóng chiếu”. Nó là **affine score**. Scalar projection lên hướng \(w\) phải liên quan đến \(\frac{w^\top x}{\|w\|}\); thêm \(b\) thì càng không còn là phép chiếu.
- Diễn giải hệ số logistic tại [PLAN.md:64](/home/huy/.openclaw/workspace/scam-detection/PLAN.md:64) thiếu điều kiện. Odds nhân \(e^{w_j}\) cho mỗi đơn vị tăng của \(x_j\), giữ các biến khác cố định. “Sau 22h tăng odds 3,2 lần” chỉ đúng nếu feature đó là biến nhị phân và \(w_j=\log 3.2\).
- Công thức Laplace ở [PLAN.md:67](/home/huy/.openclaw/workspace/scam-detection/PLAN.md:67) quá mơ hồ. Với multinomial NB phải là:
  \[
  P(w_j\mid S)=\frac{c_{j,S}+\alpha}
  {\sum_v c_{v,S}+\alpha V}.
  \]
  \(N\) ở plan không nói là số mẫu hay tổng token của lớp. Ký hiệu \(\mathbf w\) cũng xung đột với vector trọng số logistic.
- TF-IDF tại [PLAN.md:91](/home/huy/.openclaw/workspace/scam-detection/PLAN.md:91):
  \[
  \log\frac{N}{1+\mathrm{df}(t)}
  \]
  cho IDF âm nếu từ xuất hiện trong toàn bộ tài liệu. Nếu muốn smoothing, dạng phổ biến là
  \[
  \log\frac{N+1}{\mathrm{df}(t)+1}+1.
  \]
- PageRank tại [PLAN.md:108](/home/huy/.openclaw/workspace/scam-detection/PLAN.md:108) thiếu biến ở vế trái và thiếu tập đỉnh đi vào:
  \[
  PR(u)=\frac{1-d}{N}
  +d\sum_{v\in In(u)}\frac{PR(v)}{L(v)}.
  \]
  Ngoài ra còn phải xử lý dangling nodes.
- Ở [PLAN.md:207](/home/huy/.openclaw/workspace/scam-detection/PLAN.md:207), nói “Transformer và MFCC không thể chạy training thật” là sai về khái niệm: **MFCC là phép trích đặc trưng, không phải model cần training**. MFCC hoàn toàn có thể tính trong trình duyệt; CNN/Transformer training mới là phần nặng.

### Viết ẩu hoặc gây hiểu nhầm

- “ROC nói dối” tại [PLAN.md:84](/home/huy/.openclaw/workspace/scam-detection/PLAN.md:84) là tiêu đề giật gân nhưng sai. ROC-AUC không nói dối; nó có thể không phản ánh số FP tuyệt đối khi negative quá nhiều. PR-AUC cũng phụ thuộc mạnh vào prevalence.
- “Expected cost” tại [PLAN.md:85](/home/huy/.openclaw/workspace/scam-detection/PLAN.md:85) đang dùng số đếm:
  \[
  C_{FN}FN+C_{FP}FP
  \]
  nên đó là empirical total cost, chưa phải expectation trừ khi chuẩn hóa hoặc đưa xác suất vào. Với posterior đã calibrated và chi phí đúng bằng 0, threshold Bayes là:
  \[
  t=\frac{C_{FP}}{C_{FP}+C_{FN}}.
  \]
- Gom class weight, SMOTE và cost threshold vào cùng một bài mà không nói về calibration là nguy hiểm. Weighted loss làm thay đổi ý nghĩa xác suất đầu ra; SMOTE trên feature nhị phân/categorical/time có thể tạo bản ghi CDR vô nghĩa và gây leakage nếu chạy trước split.
- Sigmoid “ép về \((0,1)\) để đọc như xác suất” tại [PLAN.md:162](/home/huy/.openclaw/workspace/scam-detection/PLAN.md:162) quá dễ gây ngộ nhận. Một số nằm trong \((0,1)\) chưa chắc là xác suất calibrated.
- Công thức variance của Random Forest chỉ đúng dưới giả định các cây có cùng variance và tương quan cặp \(\rho\). Cần ghi điều kiện đó.
- XGBoost dùng \(h_m\) cho weak learner rồi lại dùng \(h_i\) cho Hessian; ký hiệu xung đột.
- LSTM, CNN, Isolation Forest và SHAP chỉ được “name-drop”, chưa đủ công thức để đáp ứng tuyên bố “mỗi dòng code soi ra công thức”.

---

## 3. Kiến trúc web app: khả thi cho MVP, không khả thi như phạm vi hiện tại

Vanilla ES modules, Canvas/SVG và KaTeX hoàn toàn đủ cho một demo logistic regression đẹp. “Không build step” không phải vấn đề chính.

### Rủi ro lớn nhất: đồng bộ ba biểu diễn

Ví dụ tại [PLAN.md:152](/home/huy/.openclaw/workspace/scam-detection/PLAN.md:152) lưu code dưới dạng chuỗi. Nhưng [PLAN.md:173](/home/huy/.openclaw/workspace/scam-detection/PLAN.md:173) lại nói code được sinh từ source thật. Không thể vừa làm cả hai mà vẫn bảo đảm “không bao giờ lệch”.

`Function.prototype.toString()` cũng không giải quyết được: nó cho source triển khai, không cho các bước sư phạm đẹp, không có ánh xạ ổn định từ biểu thức sang biến toán và phần tử hình vẽ.

Muốn khả thi cần một representation duy nhất, chẳng hạn mỗi step có:

- ID ngữ nghĩa;
- hàm thực thi;
- trạng thái input/output;
- công thức;
- code hiển thị;
- visual bindings.

Nhưng ngay cả vậy, cam kết “không bao giờ lệch” vẫn cần test số học và test contract, không nên tuyên bố tuyệt đối.

### Các rủi ro khác

- RF, boosting, graph layout và autoencoder thuần JS có thể khóa UI; plan chưa có Web Worker, cancellation hoặc giới hạn computation.
- “Offline sau lần tải đầu” cần Service Worker, cache/version strategy và fallback; cấu trúc hiện tại chưa có.
- Generator phải có seeded RNG để lesson, slider, test và rewind tái lập được.
- “Tua 200 vòng” cần snapshot hoặc recomputation có kiểm soát.
- Không có kế hoạch unit test đối chiếu với NumPy/sklearn, visual regression, accessibility và browser compatibility.
- Canvas khó accessibility và dễ mờ trên màn hình HiDPI.
- Tap trên iPad không tương đương hover; cần trạng thái chọn rõ ràng và keyboard support.
- Mỗi họ thuật toán cần visual/state machine khác nhau. M1 logistic **không chứng minh** engine sẽ phù hợp với tree, FFT, graph, Transformer hay SHAP.

Câu “23 bài còn lại chỉ là viết nội dung” tại [PLAN.md:199](/home/huy/.openclaw/workspace/scam-detection/PLAN.md:199) là đánh giá sai nghiêm trọng nhất về engineering.

---

## 4. Dataset mô phỏng: chấp nhận được, nhưng chỉ cho sandbox

Dùng dữ liệu mô phỏng là hợp lý để:

- giải thích dot product, gradient, regularization;
- kiểm soát class imbalance;
- minh họa leakage, drift và threshold;
- biết ground truth của cơ chế sinh.

Nhưng không được dùng nó để chứng minh “hệ thống phát hiện scam hoạt động”.

Các vấn đề:

- 5.000 × 1,5% chỉ khoảng **75 positive**. Sau chia train/validation/test, mọi metric sẽ dao động mạnh.
- Nếu generator tạo đúng các quy luật mà lesson dạy, model chỉ học lại giả định của tác giả. Câu “chứng minh model học đúng” tại [PLAN.md:183](/home/huy/.openclaw/workspace/scam-detection/PLAN.md:183) có nguy cơ trở thành lập luận vòng tròn.
- Base rate giống thật không làm phân phối giống thật. Còn thiếu label noise, missingness, caller spoofing, campaign correlation, delayed labels, selection bias và drift.
- 200 transcript mô phỏng không đủ để fine-tune hay đánh giá Transformer có ý nghĩa.
- Một mục “vì sao dữ liệu thật khó hơn” ở bài cuối không đủ sửa ảo tưởng đã hình thành trong toàn khóa.

Nên có ít nhất ba miền:

1. toy data sạch để học thuật toán;
2. synthetic data “bẩn” với leakage, noise, drift và unseen campaigns;
3. capstone trên một dataset công khai/thay thế phù hợp, với tuyên bố giới hạn rõ ràng.

---

## 5. Phạm vi quá tham vọng; nên cắt mạnh

24 bài × hai ngôn ngữ × visualization riêng × ML thuần JS × notebook Python là phạm vi của một nhóm nhỏ trong nhiều tháng, không phải một MVP.

### MVP nên còn khoảng 9–12 bài

Giữ:

1. Bài toán, nhãn, temporal/group split và leakage.
2. Vector + logistic prediction.
3. Cross-entropy + gradient descent.
4. Regularization và feature preprocessing.
5. Metrics cho lớp hiếm.
6. Calibration + cost threshold.
7. Decision tree + gradient boosting ở mức trực quan.
8. TF-IDF/character n-gram + linear classifier trên transcript ASR nhiễu.
9. Temporal/graph features.
10. Drift, monitoring và feedback loop.
11. Capstone kết hợp rule + metadata + text.

Hoãn hoặc cắt khỏi MVP:

- Word2Vec;
- LSTM;
- Transformer fine-tuning;
- MFCC/CNN;
- deepfake/spoofing;
- One-Class SVM và autoencoder;
- tự cài hoàn chỉnh Random Forest/XGBoost;
- song ngữ;
- huy hiệu/progress;
- track notebook Python song song.

Nếu audio/deepfake là mục tiêu sản phẩm chính thì nên thành **khóa thứ hai**, không phải ba bài chen trong khóa CDR.

Khuyến nghị quyết định: chỉ duyệt **M1 đã sửa**, nhưng M1 phải bao gồm cả split/leakage, metrics, calibration sơ bộ và một thiết kế `codemath` có single source of truth. Chưa nên duyệt roadmap 24 bài ở trạng thái hiện tại.