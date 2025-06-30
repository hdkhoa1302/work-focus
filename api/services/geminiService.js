const { GoogleGenAI } = require('@google/genai');

async function chat(request) {
  // Đọc biến môi trường tại runtime
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
  const USE_MOCK = process.env.USE_MOCK_GEMINI === 'true';

  if (USE_MOCK) {
    // Mock response dựa trên nội dung để test agents
    const content = request.contents.toLowerCase();
    
    if (content.includes('task') || content.includes('nhiệm vụ')) {
      return { 
        text: `Tôi đã phân tích yêu cầu của bạn về quản lý nhiệm vụ. Dựa trên thông tin bạn cung cấp, tôi khuyên bạn nên:

• Ưu tiên các task có deadline gần nhất
• Chia nhỏ các task lớn thành subtasks
• Dành 25% thời gian cho các task không dự kiến trước

Bạn có muốn tôi giúp lập kế hoạch chi tiết không?` 
      };
    }
    
    if (content.includes('năng suất') || content.includes('hiệu quả') || content.includes('productivity')) {
      return { 
        text: `Để tăng năng suất, tôi gợi ý:

• Áp dụng kỹ thuật Pomodoro (25 phút tập trung + 5 phút nghỉ)
• Loại bỏ các yếu tố gây xao nhãng
• Đặt mục tiêu cụ thể cho từng phiên làm việc
• Theo dõi và phân tích thời gian làm việc

Bạn muốn tôi hướng dẫn chi tiết kỹ thuật nào?` 
      };
    }
    
    if (content.includes('tập trung') || content.includes('xao nhãng') || content.includes('focus')) {
      return { 
        text: `Để bảo vệ sự tập trung:

• Tắt thông báo không cần thiết
• Sử dụng chế độ "Do Not Disturb"
• Tạo môi trường làm việc tĩnh lặng
• Lập lịch kiểm tra email/tin nhắn cố định

Tôi có thể thiết lập các quy tắc chặn xao nhãng cho bạn.` 
      };
    }
    
    return { text: 'Tôi sẵn sàng hỗ trợ bạn với các câu hỏi về quản lý task, tăng năng suất, và duy trì sự tập trung!' };
  }

  // Sử dụng thật Gemini API
  if (!GEMINI_API_KEY) {
    return { text: 'Gemini API chưa được khởi tạo. Vui lòng kiểm tra GEMINI_API_KEY.' };
  }
  
  try {
    // Khởi tạo GoogleGenAI với key
    const genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const response = await genAI.models.generateContent({
      model: request.model,
      contents: request.contents,
      ...request.generationConfig,
    });
    return { text: response.text || '' };
  } catch (error) {
    console.error('Gemini API Error:', error);
    return { text: 'Xin lỗi, tôi gặp sự cố khi kết nối với Gemini AI.' };
  }
}

module.exports = { chat }; 