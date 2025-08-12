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
// --- BƯỚC 4: ĐỊNH NGHĨA TIÊU CHÍ MBTI DẠNG CRITERIA ---
const mbtiCriteriaMapping = {
  INTJ: [
    { key: "people_person", expected: 0, weight: 2 },
    { key: "data_skill", expected: 1, weight: 3 },
    { key: "creativity_level", expectedMin: 1, weight: 2 },
  ],
  INTP: [
    { key: "people_person", expected: 0, weight: 2 },
    { key: "tech_comfort", expected: 1, weight: 3 },
    { key: "creativity_level", expectedMin: 2, weight: 2 },
  ],
  ENTJ: [
    { key: "people_person", expected: 1, weight: 2 },
    { key: "public_speaking", expected: 1, weight: 3 },
    { key: "data_skill", expected: 1, weight: 2 },
  ],
  ENTP: [
    { key: "people_person", expected: 1, weight: 2 },
    { key: "public_speaking", expected: 1, weight: 3 },
    { key: "creativity_level", expectedMin: 2, weight: 2 },
  ],
  INFJ: [
    { key: "people_person", expected: 1, weight: 2 },
    { key: "teamwork", expected: 1, weight: 2 },
    { key: "creativity_level", expectedMin: 1, weight: 2 },
    { key: "public_speaking", expected: 0, weight: 1 },
  ],
  INFP: [
    { key: "people_person", expected: 0, weight: 2 },
    { key: "artistic", expected: 1, weight: 3 },
    { key: "creativity_level", expectedMin: 2, weight: 2 },
  ],
  ENFJ: [
    { key: "people_person", expected: 1, weight: 2 },
    { key: "public_speaking", expected: 1, weight: 3 },
    { key: "teamwork", expected: 1, weight: 2 },
  ],
  ENFP: [
    { key: "people_person", expected: 1, weight: 2 },
    { key: "artistic", expected: 1, weight: 3 },
    { key: "creativity_level", expectedMin: 2, weight: 2 },
  ],
  ISTJ: [
    { key: "people_person", expected: 0, weight: 2 },
    { key: "data_skill", expected: 1, weight: 3 },
    { key: "preferred_work_env", expected: 0, weight: 2 },
  ],
  ISFJ: [
    { key: "people_person", expected: 1, weight: 2 },
    { key: "teamwork", expected: 0, weight: 2 },
    { key: "data_skill", expected: 1, weight: 3 },
  ],
  ESTJ: [
    { key: "people_person", expected: 1, weight: 2 },
    { key: "public_speaking", expected: 1, weight: 2 },
    { key: "preferred_work_env", expected: 1, weight: 2 },
    { key: "teamwork", expected: 1, weight: 2 },
  ],
  ESFJ: [
    { key: "people_person", expected: 1, weight: 2 },
    { key: "teamwork", expected: 1, weight: 3 },
    { key: "creativity_level", expectedMax: 1, weight: 2 },
  ],
  ISTP: [
    { key: "people_person", expected: 0, weight: 2 },
    { key: "tech_comfort", expected: 0, weight: 2 },
    { key: "outdoor", expected: 1, weight: 3 },
  ],
  ISFP: [
    { key: "people_person", expected: 0, weight: 2 },
    { key: "artistic", expected: 1, weight: 3 },
    { key: "outdoor", expected: 1, weight: 2 },
  ],
  ESTP: [
    { key: "people_person", expected: 1, weight: 2 },
    { key: "outdoor", expected: 1, weight: 2 },
    { key: "public_speaking", expected: 1, weight: 2 },
  ],
  ESFP: [
    { key: "people_person", expected: 1, weight: 2 },
    { key: "artistic", expected: 1, weight: 3 },
    { key: "preferred_work_env", expected: 1, weight: 2 },
  ],
};

// --- HÀM TÍNH MATCH SCORE ---
function calculateMatchScore(job, criteria) {
  let score = 0;
  let maxScore = 0;

  // 1. Cộng điểm nếu khớp
  for (const c of criteria) {
    maxScore += c.weight;
    const val = job[c.key] ?? 0;

    if (c.expected !== undefined) {
      const diff = Math.abs(val - c.expected);
      score += (1 - diff) * c.weight;
    }
    if (c.expectedMin !== undefined) {
      score += (val >= c.expectedMin ? 1 : val / c.expectedMin) * c.weight;
    }
    if (c.expectedMax !== undefined) {
      score += (val <= c.expectedMax ? 1 : c.expectedMax / val) * c.weight;
    }
  }

  // 2. Trừ điểm nếu nghề có extra key ngoài criteria
  const criteriaKeys = criteria.map(c => c.key);
  const allKeys = Object.keys(job).filter(
    k => !["name", "id", "detail"].includes(k)
  );
  const extraKeys = allKeys.filter(k => !criteriaKeys.includes(k));

  const penaltyPerExtra = maxScore * 0.05; // trừ 5% maxScore mỗi extra
  score -= extraKeys.length * penaltyPerExtra;

  if (score < 0) score = 0;

  // 3. Chuẩn hóa sang %
  return Math.round((score / maxScore) * 100);
}

// --- API MBTI SUGGEST ---
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

  // 1. Tính MBTI type
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

  // 2. Lấy criteria theo MBTI
  const criteria = mbtiCriteriaMapping[mbtiType];
  if (!criteria) {
    return res.status(500).json({ error: "Không tìm thấy mapping cho MBTI này" });
  }

  // 3. Chấm điểm tất cả nghề
  const scoredJobs = uniqueCareerData.map(job => ({
    ...job,
    matchScore: calculateMatchScore(job, criteria),
  }));

  // 4. Sắp xếp giảm dần theo điểm
  const sorted = scoredJobs.sort((a, b) => b.matchScore - a.matchScore);

  // 5. Lấy top 5
  const topSuggestions = sorted.slice(0, 5);

  res.status(200).json({
    mbtiType,
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
