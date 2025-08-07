/*
 * File: server.js
 * Description: Backend server cho hệ thống gợi ý ngành nghề, đã cập nhật logic MBTI.
 * Tác giả: Gemini
 * Ngày tạo: 21/05/2024
 * Ngày cập nhật: 03/08/2025
 */

// --- BƯỚC 1: IMPORT CÁC THƯ VIỆN CẦN THIẾT ---
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

// --- BƯỚC 2: KHỞI TẠO SERVER VÀ CẤU HÌNH ---
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

// --- BƯỚC 3: ĐỌC DỮ LIỆU TỪ "DATABASE" (FILE JSON) ---
let careerData = [];
let uniqueCareerData = []; // Mảng chứa các ngành nghề không trùng lặp
try {
  const rawData = fs.readFileSync(path.join(__dirname, "database.json"));
  careerData = JSON.parse(rawData);

  // Xử lý để có một danh sách ngành nghề duy nhất
  const seenNames = new Set();
  uniqueCareerData = careerData.filter((career) => {
    if (seenNames.has(career.name)) {
      return false;
    } else {
      seenNames.add(career.name);
      return true;
    }
  });

  console.log("✅ Đã tải và xử lý dữ liệu ngành nghề thành công!");
} catch (error) {
  console.error(
    "❌ Lỗi nghiêm trọng: Không thể đọc file database.json.",
    error
  );
  process.exit(1);
}

// --- BƯỚC 4: ĐỊNH NGHĨA LOGIC GỢI Ý DỰA TRÊN MBTI ---

// Ánh xạ các đặc điểm của nghề nghiệp với loại MBTI tương ứng
const mbtiCareerMapping = {
  // ANALYSTS - Nhà Phân Tích
  INTJ: (job) =>
    job.people_person === 0 &&
    job.data_skill === 1 &&
    job.creativity_level >= 1,
  INTP: (job) =>
    job.people_person === 0 &&
    job.tech_comfort === 1 &&
    job.creativity_level >= 2,
  ENTJ: (job) =>
    job.people_person === 1 &&
    job.public_speaking === 1 &&
    job.data_skill === 1,
  ENTP: (job) =>
    job.people_person === 1 &&
    job.public_speaking === 1 &&
    job.creativity_level >= 2,
  // DIPLOMATS - Nhà Ngoại Giao
  INFJ: (job) =>
    job.people_person === 1 &&
    job.teamwork === 1 &&
    job.creativity_level >= 1 &&
    job.public_speaking === 0,
  INFP: (job) =>
    job.people_person === 0 && job.artistic === 1 && job.creativity_level >= 2,
  ENFJ: (job) =>
    job.people_person === 1 && job.public_speaking === 1 && job.teamwork === 1,
  ENFP: (job) =>
    job.people_person === 1 && job.artistic === 1 && job.creativity_level >= 2,
  // SENTINELS - Người Canh Gác
  ISTJ: (job) =>
    job.people_person === 0 &&
    job.data_skill === 1 &&
    job.preferred_work_env === 0,
  ISFJ: (job) =>
    job.people_person === 1 && job.teamwork === 0 && job.data_skill === 1,
  ESTJ: (job) =>
    job.people_person === 1 &&
    job.public_speaking === 1 &&
    job.preferred_work_env === 1 &&
    job.teamwork === 1,
  ESFJ: (job) =>
    job.people_person === 1 && job.teamwork === 1 && job.creativity_level <= 1,
  // EXPLORERS - Người Khám Phá
  ISTP: (job) =>
    job.people_person === 0 && job.tech_comfort === 0 && job.outdoor === 1,
  ISFP: (job) =>
    job.people_person === 0 && job.artistic === 1 && job.outdoor === 1,
  ESTP: (job) =>
    job.people_person === 1 && job.outdoor === 1 && job.public_speaking === 1,
  ESFP: (job) =>
    job.people_person === 1 &&
    job.artistic === 1 &&
    job.preferred_work_env === 1,
};

// --- BƯỚC 5: XÂY DỰNG API MỚI CHO MBTI ---

/**
 * API Endpoint: POST /api/mbti-suggest
 * Nhận kết quả trắc nghiệm, tính toán loại MBTI và gợi ý ngành nghề.
 *
 * Request Body (Ví dụ):
 * {
 * "q1": "I", "q2": "E", ..., "q16": "J"
 * }
 */
app.post("/api/mbti-suggest", (req, res) => {
  const userAnswers = req.body;

  if (
    !userAnswers ||
    typeof userAnswers !== "object" ||
    Object.keys(userAnswers).length < 16
  ) {
    return res
      .status(400)
      .json({ error: "Dữ liệu không hợp lệ. Cần đủ 16 câu trả lời." });
  }

  // 1. Tính toán loại MBTI từ câu trả lời
  const counts = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
  for (const key in userAnswers) {
    const value = userAnswers[key];
    if (counts.hasOwnProperty(value)) {
      counts[value]++;
    }
  }

  let mbtiType = "";
  mbtiType += counts.E > counts.I ? "E" : "I";
  mbtiType += counts.S > counts.N ? "S" : "N";
  mbtiType += counts.T > counts.F ? "T" : "F";
  mbtiType += counts.J > counts.P ? "P" : "J";

  // 2. Lọc ra các ngành nghề phù hợp
  const suggestionFilter = mbtiCareerMapping[mbtiType];
  const suggestions = uniqueCareerData.filter(suggestionFilter);

  // 3. Giới hạn số lượng gợi ý (ví dụ: tối đa 5)
  const topSuggestions = suggestions.slice(0, 5);

  // 4. Trả về kết quả
  res.status(200).json({
    mbtiType: mbtiType,
    suggestions: topSuggestions,
  });
});

// --- BƯỚC 6: GIỮ LẠI API CŨ (TÙY CHỌN) ---
// Giữ lại API cũ nếu bạn vẫn muốn dùng form trắc nghiệm 9 câu hỏi
app.post("/api/suggest-career", (req, res) => {
  const userAnswers = req.body;
  if (
    !userAnswers ||
    typeof userAnswers !== "object" ||
    Object.keys(userAnswers).length === 0
  ) {
    return res.status(400).json({ error: "Dữ liệu đầu vào không hợp lệ." });
  }
  const suggestions = careerData.map((career) => {
    let matchScore = 0;
    const totalAttributes = 9;
    if (career.people_person === userAnswers.people_person) matchScore++;
    if (career.tech_comfort === userAnswers.tech_comfort) matchScore++;
    if (career.public_speaking === userAnswers.public_speaking) matchScore++;
    if (career.artistic === userAnswers.artistic) matchScore++;
    if (career.outdoor === userAnswers.outdoor) matchScore++;
    if (career.teamwork === userAnswers.teamwork) matchScore++;
    if (career.data_skill === userAnswers.data_skill) matchScore++;
    if (career.preferred_work_env === userAnswers.preferred_work_env)
      matchScore++;
    const creativityDifference = Math.abs(
      career.creativity_level - userAnswers.creativity_level
    );
    matchScore += Math.max(0, 1 - creativityDifference / 2);
    const compatibilityPercentage = (matchScore / totalAttributes) * 100;
    return {
      id: career.id,
      name: career.name,
      detail: career.detail,
      matchScore: parseFloat(matchScore.toFixed(2)),
      compatibility: `${Math.round(compatibilityPercentage)}%`,
    };
  });
  suggestions.sort((a, b) => b.matchScore - a.matchScore);
  const topSuggestions = suggestions.slice(0, 3);
  res.status(200).json(topSuggestions);
});

// --- BƯỚC 7: KHỞI ĐỘNG SERVER ---
app.listen(PORT, () => {
  console.log(`🚀 Server đang lắng nghe tại cổng http://localhost:${PORT}`);
});
