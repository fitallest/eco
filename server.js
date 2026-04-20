import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';

// --- BACKEND CONFIGURATION ---
const PORT = 8000; // Cổng Backend chuyên biệt
const API_KEY = process.env.API_KEY; 

const app = express();

// Cấu hình CORS chặt chẽ hơn nhưng cho phép Preflight
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Handle Preflight requests explicitely
app.options('*', cors());

app.use(express.json());

// Initialize AI only if Key exists (Safe initialization)
let ai = null;
if (API_KEY) {
  ai = new GoogleGenAI({ apiKey: API_KEY });
} else {
  console.warn("⚠️ CẢNH BÁO: Không tìm thấy API_KEY trong biến môi trường. Server vẫn chạy nhưng tính năng AI sẽ không hoạt động.");
}

// ============================================================================
// PAYMENT GATEWAY SIMULATION
// ============================================================================
app.post('/api/pay', async (req, res) => {
  const { amount, method, planId, userId } = req.body;
  
  console.log(`[PAYMENT] Processing transaction for User: ${userId} | Plan: ${planId} | Amount: ${amount}`);

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Simulate success (In a real app, this calls Stripe/PayPal API)
  if (amount > 0) {
    res.json({
      success: true,
      transactionId: `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      message: "Thanh toán thành công!",
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(400).json({ success: false, message: "Số tiền không hợp lệ" });
  }
});


// ============================================================================
// AI BRAIN LOGIC
// ============================================================================

const BASE_SYSTEM_INSTRUCTION = `
Bạn là ECOLAW.AI - HỆ ĐIỀU HÀNH PHÁP LÝ (LEGAL OS) MÔ PHỎNG VĂN PHÒNG LUẬT SƯ.

VAI TRÒ CỦA BẠN: "Người quản lý văn phòng" (Orchestrator).
Bạn không chỉ trả lời câu hỏi, bạn vận hành một quy trình xử lý vụ việc qua 8 bước ảo sau đây trước khi xuất ra kết quả:

1. Routing (Lễ tân): Phân loại lĩnh vực (Hình sự, Dân sự, Đất đai...).
2. Fact-Intake (Lấy lời khai): Kiểm tra dữ liệu đầu vào. NẾU THIẾU THÔNG TIN QUAN TRỌNG -> Dừng lại và hỏi người dùng (Interview Mode).
3. Legal Research (Tra cứu): Tìm kiếm văn bản luật MỚI NHẤT (2024, 2025, 2026).
4. Procedure (Thủ tục): Xác định Thẩm quyền (Nộp ở đâu?) và Thời gian.
5. Risk & Strategy (Chiến lược): Đánh giá tỷ lệ thắng/rủi ro pháp lý.
6. Drafting (Soạn thảo): Định hình khung nội dung đơn từ (nếu cần).
7. Quality Control (Kiểm soát): BẮT BUỘC TRÍCH DẪN (Điều X, Khoản Y, Luật Z). Không trích dẫn -> Không tư vấn.
8. Synthesizer (Tổng hợp): Gom lại thành câu trả lời dễ hiểu nhất cho khách hàng.

QUY TẮC "FACT-INTAKE" (QUAN TRỌNG NHẤT):
- Nếu người dùng hỏi cộc lốc (ví dụ: "Ly hôn chia tài sản thế nào?"), TUYỆT ĐỐI KHÔNG trả lời tràng giang đại hải.
- HÃY HỎI NGƯỢC LẠI: "Tài sản hình thành trước hay trong hôn nhân?", "Hai bên có thỏa thuận được không?".

CẤU TRÚC TRẢ LỜI (BẮT BUỘC DÙNG MARKDOWN):

---
📍 TRẠNG THÁI HỆ THỐNG
📂 Phân loại: [Lĩnh vực]
⚙️ Quy trình: [Routing > Research > Risk Analysis > QC Passed]
👤 Chuyên gia thực hiện: [Tên Agent]
---

🤖 [NỘI DUNG TƯ VẤN]
(Phần này là kết quả của bước Synthesizer)
[Nội dung thay đổi tùy theo Chế độ Ngắn gọn hoặc Chuyên sâu]

---
⚖️ KHUYẾN NGHỊ & RỦI RO
(Kết quả của bước Risk & Strategy)
- [Cảnh báo rủi ro]
- [Việc cần làm ngay]

---
💡 GỢI Ý TIẾP THEO
(Kết quả của bước Procedure - tạo lộ trình tiếp theo)
- [Gợi ý 1 - Dạng câu hỏi người dùng cần hỏi tiếp]
- [Gợi ý 2]
`;

const STYLE_INSTRUCTIONS = {
  CONCISE: `
  🔥 CHẾ ĐỘ: TƯ VẤN NHANH (CONCISE MODE)
  - Đi thẳng vào kết luận của bước Risk & Strategy.
  - Bỏ qua trích dẫn dài dòng, chỉ nêu số hiệu điều luật để tham chiếu (bước Quality Control tối giản).
  - Tập trung vào Actionable Items (Việc cần làm).
  `,
  DEEP: `
  📚 CHẾ ĐỘ: PHÂN TÍCH CHUYÊN SÂU (DEEP MODE)
  - Hiển thị rõ tư duy pháp lý.
  - Trích dẫn cụ thể (Theo Khoản..., Điều..., Luật...).
  - Phân tích lợi/hại của từng phương án (Chiến lược tranh tụng).
  `
};

const AGENT_PERSONAS = {
  GENERAL: "Bạn là Luật sư Tổng hợp. Hãy điều phối và hỏi thông tin bao quát.",
  CRIMINAL: "Bạn là Luật sư Hình sự. Cần hỏi rõ: Độ tuổi, hành vi, thiệt hại.",
  CIVIL: "Bạn là Luật sư Dân sự. Cần hỏi rõ: Hợp đồng, bằng chứng, thiệt hại.",
  LAND: "Bạn là Luật sư Đất đai. Cần hỏi rõ: Nguồn gốc đất, Sổ đỏ, tranh chấp.",
  MARRIAGE: "Bạn là Luật sư Hôn nhân. Cần hỏi rõ: Tài sản, con chung, nợ chung.",
  ENTERPRISE: "Bạn là Luật sư Doanh nghiệp. Cần hỏi rõ: Vốn, điều lệ, loại hình.",
  LABOR: "Bạn là Luật sư Lao động. Cần hỏi rõ: HĐLĐ, thời gian làm việc.",
  TAX: "Bạn là Luật sư Thuế. Cần hỏi rõ: Doanh thu, chứng từ."
};

// ============================================================================
// API ENDPOINTS
// ============================================================================

// Root Health Check
app.get('/', (req, res) => {
  res.send('✅ ECOLAW.AI BACKEND IS RUNNING! (Use POST /chat to interact)');
});

app.post('/chat', async (req, res) => {
  const startTime = Date.now();
  try {
    // 1. Kiểm tra API Key có tồn tại không
    if (!ai) {
        return res.status(500).json({ 
            error: "MISSING_API_KEY", 
            details: "Server chưa được cấu hình API_KEY. Vui lòng kiểm tra file .env hoặc biến môi trường." 
        });
    }

    // 2. Nhận dữ liệu từ Frontend
    const { user_query, prompt, history, agentType, responseStyle, agentConfig, userLevel } = req.body;
    const finalPrompt = user_query || prompt;

    if (!finalPrompt) {
      return res.status(400).json({ error: "Missing 'user_query' in request body" });
    }

    console.log(`[INCOMING] Request từ User Level: ${userLevel} | Agent: ${agentType}`);

    // 3. Xây dựng System Instruction
    // Determine Persona: Use Custom Prompt if available, otherwise default
    const defaultPersona = AGENT_PERSONAS[agentType] || AGENT_PERSONAS.GENERAL;
    const persona = agentConfig?.systemPrompt || defaultPersona;

    const styleInstruction = STYLE_INSTRUCTIONS[responseStyle] || STYLE_INSTRUCTIONS.DEEP;
    
    let customKbInstruction = "";
    if (agentConfig && agentConfig.isEnabled && agentConfig.endpointUrl) {
      console.log(`[LOGIC] Kích hoạt Hybrid Mode với KB: ${agentConfig.endpointUrl}`);
      customKbInstruction = `
      🔴 CHẾ ĐỘ HYBRID AGENT ĐƯỢC KÍCH HOẠT:
      Bạn đang được kết nối với KNOWLEDGE BASE CHUYÊN BIỆT: "${agentConfig.endpointUrl}".
      `;
    }

    const fullSystemInstruction = `${BASE_SYSTEM_INSTRUCTION}\n\n=== AGENT PERSONA ===\n${persona}\n\n${customKbInstruction}\n\n=== OUTPUT STYLE ===\n${styleInstruction}`;

    // 4. Gọi Gemini API (Server giữ API Key an toàn)
    const selectedModel = 'gemini-3-flash-preview'; 

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: [
        ...(history || []),
        { role: 'user', parts: [{ text: finalPrompt }] }
      ],
      config: {
        systemInstruction: fullSystemInstruction,
        temperature: 0.3,
        tools: [{ googleSearch: {} }], 
      }
    });

    const executionTime = Date.now() - startTime;
    console.log(`[SUCCESS] Đã trả lời trong ${executionTime}ms`);

    // 5. Trả về Frontend
    res.json({ 
      answer: response.text,
      metadata: {
        model: selectedModel,
        execution_time_ms: executionTime
      }
    });

  } catch (error) {
    console.error("[ERROR] Lỗi xử lý tại Server:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

// Bind to 0.0.0.0 to listen on all interfaces
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`=================================================`);
  console.log(`✅ BACKEND SERVER ĐANG CHẠY TẠI: http://127.0.0.1:${PORT}`);
  console.log(`✅ Network Access: http://0.0.0.0:${PORT}`);
  if (!API_KEY) console.log(`⚠️  LƯU Ý: API_KEY bị thiếu. Chat sẽ báo lỗi.`);
  console.log(`=================================================`);
});

// Handle Port Conflict Error
server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`❌ LỖI: Cổng ${PORT} đang được sử dụng!`);
    console.error(`   Hãy tắt Server cũ đang chạy hoặc đổi PORT trong file server.js`);
    process.exit(1);
  } else {
    console.error("❌ Lỗi khởi động Server:", e);
  }
});