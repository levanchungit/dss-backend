/*
 * File: server.js
 * Description: Backend server cho hệ thống gợi ý ngành nghề.
 * Tác giả: Gemini
 * Ngày tạo: 21/05/2024
 */

// --- BƯỚC 1: IMPORT CÁC THƯ VIỆN CẦN THIẾT ---
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors"); // Thư viện để cho phép frontend gọi API từ domain khác

// --- BƯỚC 2: KHỞI TẠO SERVER VÀ CẤU HÌNH ---
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware để cho phép server nhận và phân tích dữ liệu JSON từ client
app.use(express.json());
// Middleware để kích hoạt CORS, cho phép các trang web khác (frontend) gọi tới API này
app.use(cors());

// --- BƯỚC 3: ĐỌC DỮ LIỆU TỪ "DATABASE" (FILE JSON) ---
let careerData = [];
try {
  // Đọc file database.json một cách đồng bộ khi server khởi động
  // path.join đảm bảo đường dẫn đúng trên mọi hệ điều hành
  const rawData = fs.readFileSync(path.join(__dirname, "database.json"));
  // Chuyển đổi chuỗi JSON thành một mảng đối tượng JavaScript
  careerData = JSON.parse(rawData);
  console.log("✅ Đã tải dữ liệu ngành nghề từ database.json thành công!");
} catch (error) {
  console.error(
    "❌ Lỗi nghiêm trọng: Không thể đọc file database.json.",
    error
  );
  // Nếu không có dữ liệu, server không thể hoạt động, nên ta thoát tiến trình
  process.exit(1);
}

// --- BƯỚC 4: XÂY DỰNG API GỢI Ý NGÀNH NGHỀ ---

/**
 * API Endpoint: POST /api/suggest-career
 * Nhận một object chứa các câu trả lời của người dùng và trả về các ngành nghề phù hợp.
 *
 * Cấu trúc Request Body (Ví dụ):
 * {
 * "people_person": 1,
 * "tech_comfort": 1,
 * "public_speaking": 1,
 * "artistic": 0,
 * "outdoor": 0,
 * "teamwork": 1,
 * "data_skill": 0,
 * "creativity_level": 1,
 * "preferred_work_env": 0
 * }
 */
app.post("/api/suggest-career", (req, res) => {
  const userAnswers = req.body;

  // Kiểm tra xem input có hợp lệ không
  if (
    !userAnswers ||
    typeof userAnswers !== "object" ||
    Object.keys(userAnswers).length === 0
  ) {
    return res.status(400).json({
      error:
        "Dữ liệu đầu vào không hợp lệ. Vui lòng gửi một object JSON chứa các câu trả lời.",
    });
  }

  // Thuật toán tính điểm tương đồng đơn giản
  const suggestions = careerData.map((career) => {
    let matchScore = 0;
    const totalAttributes = 9; // Tổng số thuộc tính để tính phần trăm

    // So sánh từng thuộc tính
    if (career.people_person === userAnswers.people_person) matchScore++;
    if (career.tech_comfort === userAnswers.tech_comfort) matchScore++;
    if (career.public_speaking === userAnswers.public_speaking) matchScore++;
    if (career.artistic === userAnswers.artistic) matchScore++;
    if (career.outdoor === userAnswers.outdoor) matchScore++;
    if (career.teamwork === userAnswers.teamwork) matchScore++;
    if (career.data_skill === userAnswers.data_skill) matchScore++;
    if (career.preferred_work_env === userAnswers.preferred_work_env)
      matchScore++;

    // Với các thuộc tính có nhiều mức độ (như creativity_level), ta tính khoảng cách
    // Khoảng cách càng nhỏ, điểm càng cao. Tối đa là 1 điểm.
    const creativityDifference = Math.abs(
      career.creativity_level - userAnswers.creativity_level
    );
    matchScore += Math.max(0, 1 - creativityDifference / 2); // Chia cho 2 (giá trị lớn nhất) để chuẩn hóa về khoảng [0, 1]

    // Tính phần trăm tương thích
    const compatibilityPercentage = (matchScore / totalAttributes) * 100;

    return {
      id: career.id,
      name: career.name,
      detail: career.detail,
      matchScore: parseFloat(matchScore.toFixed(2)), // Làm tròn điểm số
      compatibility: `${Math.round(compatibilityPercentage)}%`, // Làm tròn phần trăm
    };
  });

  // Sắp xếp các gợi ý theo điểm từ cao xuống thấp
  suggestions.sort((a, b) => b.matchScore - a.matchScore);

  // Trả về 3 kết quả hàng đầu
  const topSuggestions = suggestions.slice(0, 3);

  console.log("Trả về các gợi ý hàng đầu:", topSuggestions);
  res.status(200).json(topSuggestions);
});

// --- BƯỚC 5: KHỞI ĐỘNG SERVER ---
app.listen(PORT, () => {
  console.log(`🚀 Server đang lắng nghe tại cổng http://localhost:${PORT}`);
  console.log("Nhấn CTRL + C để dừng server.");
});
