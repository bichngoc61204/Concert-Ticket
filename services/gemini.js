// src/services/gemini.js

const API_KEY = "AIzaSyBaDLHxYIve0kgWG6GuJIF1zzOPYp_S6jc"; 
const MODEL = "gemini-flash-latest"; 
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

export const sendMessageToGemini = async (message, contextData = {}) => {
  try {
    if (!message || !message.trim()) return "Dạ, Anh/Chị cần em hỗ trợ gì ạ?";

    // Hệ thống chỉ dẫn siêu chi tiết
    const systemInstruction = `
Bạn là Trợ lý Quản lý Sự kiện cao cấp. Bạn có toàn quyền truy cập vào hệ thống kho vé.
NHIỆM VỤ: Phân tích sâu dữ liệu sự kiện và các phân khu vé (sections) để báo cáo chính xác.

DỮ LIỆU HỆ THỐNG TẠI ${contextData.cityName?.toUpperCase()}:
${JSON.stringify(contextData.events, null, 2)}

QUY TẮC TRẢ LỜI:
1. Thông tin vé chi tiết: Trả lời chính xác tên khu vực (section.name), giá (section.price) và số chỗ còn lại (section.availableSlots).
2. Tổng quan sự kiện: Sử dụng 'description' để giới thiệu nội dung, 'artists' để liệt kê dàn sao.
3. Tình trạng cháy vé: Nếu 'availableTickets' hoặc 'availableSlots' bằng 0, hãy báo là "Đã hết vé".
4. Phong cách: Chuyên nghiệp, xưng "Em", gọi "Anh/Chị". Tuyệt đối KHÔNG dùng Markdown (** , #).
5. Nếu không thấy dữ liệu: Báo cáo trung thực hệ thống chưa cập nhật nghệ sĩ/sự kiện này.

CÁCH TRÌNH BÀY:
- Phân đoạn rõ ràng, dễ đọc trên điện thoại.
- Ưu tiên liệt kê các hạng vé và giá tiền nếu khách hỏi về giá.
`;

    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [{ text: `${systemInstruction}\n\nCâu hỏi của khách: ${message}` }]
        }],
        generationConfig: {
          temperature: 0.4, // Giảm xuống để cực kỳ chính xác về con số
          maxOutputTokens: 2048,
        }
      })
    });

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text ? text.replace(/[#*]/g, "").trim() : "Dạ, em đang kiểm tra lại kho vé, Anh/Chị đợi em chút nhé.";

  } catch (error) {
    console.error("❌ Gemini Error:", error);
    return "Dạ, kết nối hệ thống đang bận, Anh/Chị thử lại giúp em nhé.";
  }
};