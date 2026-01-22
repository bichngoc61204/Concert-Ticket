// src/lib/gemini.ts
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

if (!API_KEY) {
  console.warn("⚠️ Cảnh báo: Chưa cấu hình API Key cho Gemini. Vui lòng thêm VITE_GEMINI_API_KEY vào file .env");
}

// Cấu hình model mới nhất
const MODEL = "gemini-flash-latest";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// Hàm kiểm tra model
async function checkAvailableModels() {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    const data = await response.json();
    console.log("📋 Danh sách model khả dụng:", data.models?.map((m: any) => m.name).join(", "));
  } catch (error) {
    console.error("❌ Lỗi khi kiểm tra model:", error);
  }
}

// Gọi kiểm tra model khi khởi tạo
if (import.meta.env.DEV) {
  checkAvailableModels();
}

export const sendMessageToGemini = async (message: string, contextData: any = {}) => {
  try {
    if (!message || !message.trim()) {
      return "Dạ, Anh/Chị vui lòng nhập nội dung cần hỏi ạ.";
    }

    const isDatabaseQuestion = checkIfDatabaseQuestion(message);

    const systemInstruction = isDatabaseQuestion
      ? `Bạn là một người quản lý bán vé sự kiện chuyên nghiệp và tận tâm.
QUY TẮC TRÒ CHUYỆN:
1. Xưng hô: Tự xưng là "Em" và gọi người dùng là "Anh/Chị".
2. Phong cách: Lịch sự, chân thành, giống như một cộng sự đang báo cáo trực tiếp. 
3. Định dạng: Tuyệt đối KHÔNG dùng các ký tự Markdown như **, ##, ###, hoặc dấu sao ở đầu dòng.
4. Trình bày: Hãy dùng xuống dòng để phân đoạn rõ ràng. Dùng các dấu gạch đầu dòng (-) đơn giản nếu cần liệt kê.
5. Nội dung: Phân tích sâu vào dữ liệu sự kiện được cung cấp bên dưới nhưng giải thích bằng ngôn ngữ đời thường.

DỮ LIỆU SỰ KIỆN HIỆN TẠI:
${JSON.stringify(contextData, null, 2)}`
      : `Bạn là trợ lý ảo thân thiện của hệ thống bán vé sự kiện. 
Hãy trò chuyện vui vẻ, ngắn gọn bằng tiếng Việt. 
Xưng em, gọi Anh/Chị. KHÔNG dùng ký tự lạ như ** hay ##.`;

    const response = await fetch(GEMINI_URL + `?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [{ text: `${systemInstruction}\n\nCâu hỏi của Anh/Chị: ${message}` }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          topP: 0.95,
          topK: 40
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ Lỗi từ Gemini API:", errorData);
      if (response.status === 429) {
        return "Dạ, hiện tại hệ thống đang hơi quá tải một chút, Anh/Chị đợi em vài giây rồi hỏi lại nhé.";
      }
      throw new Error(errorData.error?.message || "Lỗi khi gọi Gemini API");
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    // Hậu xử lý: Đảm bảo không còn ký tự lạ
    return text ? text.replace(/[#*]/g, "").trim() : "Dạ, em chưa tìm thấy câu trả lời phù hợp cho ý này ạ.";

  } catch (error) {
    console.error("❌ Lỗi khi gửi tin nhắn đến Gemini:", error);
    return "Dạ, kết nối với máy chủ của em đang gặp chút vấn đề, Anh/Chị kiểm tra lại giúp em nhé.";
  }
};

// Bộ lọc từ khóa liên quan đến dữ liệu
const checkIfDatabaseQuestion = (message: string) => {
  if (!message) return false;
  
  const keywords = [
    "doanh thu", "thu nhập", "tiền", "giá", "sự kiện", "vé",
    "đặt vé", "booking", "đơn hàng", "thống kê", "phân tích", "dữ liệu",
    "còn vé", "hết vé", "số lượng", "tổng", "tính", "báo cáo", "bảng",
    "khách hàng", "người đặt", "check-in", "thanh toán", "xác nhận",
    "hủy", "tình trạng", "hiện tại", "tháng", "tuần", "ngày", "năm",
    "sự kiện sắp diễn", "sự kiện đã qua", "khán giả", "hòm vé"
  ];
  
  const lower = message.toLowerCase();
  return keywords.some(k => lower.includes(k));
};