/** Mục lục 12 bài. Bài chưa build vẫn hiện đề cương để thấy rõ hướng đi. */

export const GROUPS = [
  { name: "I · Nền tảng làm đúng", from: 1, to: 5 },
  { name: "II · Mô hình mạnh hơn", from: 6, to: 8 },
  { name: "III · Tín hiệu khác và vận hành", from: 9, to: 12 },
];

export const LESSONS = [
  { num: 1, slug: "thiet-ke-bai-toan", title: "Thiết kế bài toán và nhãn", load: () => import("./L01.js") },
  { num: 2, slug: "vector-diem-so", title: "Vector và điểm số tuyến tính", load: () => import("./L02.js") },
  { num: 3, slug: "logistic-regression", title: "Logistic regression & gradient descent", load: () => import("./L03.js") },
  {
    num: 4, slug: "split-va-leakage", title: "Chia dữ liệu và rò rỉ",
    subtitle: "Bài có sức thuyết phục cao nhất khoá học",
    outline: [
      "Chia theo thời gian: train quá khứ, test tương lai",
      "Group split theo customer_id — cùng một tài khoản không được nằm cả hai bên",
      "Không tính đặc trưng tương lai cho cửa sổ quá khứ",
      "Demo phản chứng: cùng một mô hình, random split cho AUC ~0,97, temporal + group split cho ~0,78",
      "Soi vào pipeline thật: nhãn keyed theo customer_id với 'latest verdict wins' — verdict hôm nay đang được gán cho cửa sổ quá khứ",
    ],
  },
  {
    num: 5, slug: "do-luong-lop-hiem", title: "Đo lường cho lớp hiếm",
    outline: [
      "Confusion matrix, precision, recall, F_beta",
      "ROC-AUC vs PR-AUC dựng trên cùng bộ dữ liệu — ROC không 'nói dối', nó chỉ không phản ánh số FP tuyệt đối",
      "Metric vận hành: recall tại mức FP cho phép, precision@K, số tài khoản chặn oan trên mỗi triệu cuộc gọi",
      "Khoảng tin cậy: với ~750 mẫu dương thì sai số còn bao nhiêu",
    ],
  },
  {
    num: 6, slug: "regularization-tien-xu-ly", title: "Regularization và tiền xử lý CDR",
    outline: [
      "L2 co đều vs L1 đẩy hệ số về 0 và tự chọn đặc trưng",
      "Missing values, categorical bậc cao (prefix, mã vùng), scaling",
      "Rolling-window features và bẫy tính toán qua ranh giới thời gian",
      "Bẫy có thật: pd.read_csv ép số điện thoại có dấu + thành int64, phá vỡ join",
    ],
  },
  {
    num: 7, slug: "calibration-nguong-chi-phi", title: "Hiệu chỉnh xác suất và ngưỡng theo chi phí",
    subtitle: "Codex yêu cầu kéo bài này lên sớm — và đúng",
    outline: [
      "Reliability diagram: p = 0,8 có thật sự đúng 80% số lần không",
      "Platt scaling và isotonic regression",
      "Ngưỡng Bayes khi xác suất đã hiệu chỉnh: t* = C_FP / (C_FP + C_FN)",
      "Class weight làm lệch ý nghĩa xác suất đầu ra — hệ quả và cách bù",
      "SMOTE trên biến nhị phân/thời gian sinh bản ghi CDR vô nghĩa, và gây leakage nếu chạy trước khi split",
    ],
  },
  {
    num: 8, slug: "cay-va-boosting", title: "Cây quyết định và gradient boosting",
    outline: [
      "Entropy, Gini, information gain — vẽ cây lớn dần theo từng lần chia",
      "Random forest: bagging và điều kiện của công thức giảm phương sai",
      "Boosting: F_m = F_{m-1} + eta·f_m, khai triển Taylor bậc hai với g_i và h_i",
      "Vì sao boosting thắng trên dữ liệu CDR dạng bảng",
      "LightGBM/CatBoost cho categorical bậc cao",
    ],
  },
  {
    num: 9, slug: "text-tren-transcript", title: "Text trên transcript ASR nhiễu",
    outline: [
      "TF-IDF dạng không cho IDF âm: log((N+1)/(df+1)) + 1",
      "Character n-gram + linear classifier — baseline mạnh và rẻ cho transcript mất dấu, code-switching",
      "Naive Bayes là mô hình sinh, đặt đúng chỗ; Laplace với mẫu số đầy đủ",
      "Mắt xích hay bị bỏ qua: lỗi ASR, WER, confidence, chuẩn hoá tiếng Việt",
    ],
  },
  {
    num: 10, slug: "dac-trung-thoi-gian", title: "Đặc trưng thời gian và hành vi",
    outline: [
      "Chuỗi CDR mới là tín hiệu cốt lõi, không phải chỉ transcript",
      "Rolling aggregate, burst detection, change point, khoảng cách giữa các cuộc gọi",
      "Soi build_customer_window_features() trong pipeline thật",
    ],
  },
  {
    num: 11, slug: "do-thi-va-bat-thuong", title: "Đồ thị cuộc gọi và bất thường không nhãn",
    outline: [
      "Bậc vào/ra, hệ số cụm, community detection — số scam có hình sao rất đặc trưng",
      "PageRank viết đủ: PR(u) = (1-d)/N + d·Σ_{v ∈ In(u)} PR(v)/L(v), kèm xử lý dangling node",
      "Isolation Forest: s(x,n) = 2^(-E[h(x)]/c(n)) — bắt campaign chưa từng thấy",
      "Soi ensemble.py: rank-normalize rồi trung bình điểm anomaly với rules",
    ],
  },
  {
    num: 12, slug: "van-hanh", title: "Vận hành: drift, giám sát, vòng phản hồi",
    outline: [
      "PSI và KL để phát hiện trôi phân phối",
      "Backtest theo thời gian, champion/challenger",
      "SHAP để giải thích quyết định cho đội abuse review",
      "Hybrid rule + model, nhãn trễ, active learning",
      "Capstone: vì sao dữ liệu thật vẫn khó hơn mọi thứ đã học",
    ],
  },
];

export const bySlug = (slug) => LESSONS.find((l) => l.slug === slug);
export const isReady = (l) => typeof l.load === "function";
