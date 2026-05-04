import { GoogleGenAI } from "@google/genai";
import { checkAndDeductCredits } from "../lib/auth";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Tollgate: Check and deduct credits
    const cost = req.body.agentConfig?.metadata?.type === 'DRAFT_DOCUMENT' ? 50 : 1; 
    try {
        await checkAndDeductCredits(req, cost);
    } catch (err: any) {
        if (err.message === 'INSUFFICIENT_CREDITS') {
            return res.status(402).json({ text: "Bạn đã hết điểm pháp lý. Vui lòng nạp thêm để tiếp tục sử dụng." });
        } else if (err.message === 'UNAUTHORIZED') {
            return res.status(401).json({ text: "Vui lòng đăng nhập để sử dụng tính năng này." });
        } else {
            console.error('[Tollgate Gemini] Error:', err.message);
            return res.status(500).json({ text: `Lỗi xác thực tài khoản: ${err.message}` });
        }
    }

    const { prompt, history, agentType, responseStyle, agentConfig, userLevel, attachment } = req.body;
    
    let ai: any = null;
    let creds: any = null;

    if (process.env.GCP_SERVICE_ACCOUNT_JSON) {
        try {
            creds = JSON.parse(process.env.GCP_SERVICE_ACCOUNT_JSON);
            ai = new GoogleGenAI({
                vertexai: true,
                project: creds.project_id,
                location: 'us-central1',
                googleAuthOptions: {
                    credentials: {
                        client_email: creds.client_email,
                        private_key: creds.private_key,
                    }
                }
            });
        } catch (e: any) {
            console.error('[Vercel Gemini] Lỗi parse GCP_SERVICE_ACCOUNT_JSON:', e.message);
        }
    }

    if (!ai && process.env.GEMINI_API_KEY) {
        ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }

    if (!ai) {
        throw new Error("Không tìm thấy cấu hình xác thực AI (GCP_SERVICE_ACCOUNT_JSON hoặc GEMINI_API_KEY).");
    }
    
    // Select Model based on User Level
    let modelName = 'gemini-2.5-flash'; 
    if (userLevel === 'Enterprise' || userLevel === 'Gold') {
        modelName = 'gemini-2.5-pro'; 
    }

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

🔥 QUY TẮC "HUMAN HANDOFF" (CHUYỂN TIẾP LUẬT SƯ THẬT):
Nếu phát hiện yêu cầu của người dùng thuộc các trường hợp sau, bạn MẮT BUỘC phải thêm thẻ "[[HUMAN_REQUIRED]]" vào CUỐI CÙNG của câu trả lời:
1. Yêu cầu đại diện ra tòa, tranh tụng trực tiếp.
2. Yêu cầu công chứng, chứng thực, ký tá giấy tờ gốc.
3. Vụ việc hình sự nghiêm trọng (Giết người, Ma túy lượng lớn) có khung hình phạt cao nhất.
4. Tranh chấp tài sản giá trị rất lớn (trên 10 tỷ VNĐ) hoặc cực kỳ phức tạp.
5. Soạn thảo hợp đồng M&A phức tạp hoặc hồ sơ IPO.
6. Người dùng trực tiếp yêu cầu "Gặp luật sư", "Cần luật sư", "Thuê luật sư".

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
(Đây là các câu lệnh tắt trên giao diện để người dùng bấm vào. BẮT BUỘC phải là LỜI CỦA NGƯỜI DÙNG yêu cầu AI. TUYỆT ĐỐI KHÔNG thêm tiền tố như "Gợi ý 1:", không dùng ngoặc vuông hay ngoặc kép)
- Hãy soạn đơn tố cáo cho tôi
- Thủ tục này mất bao lâu?
- Chi phí thuê luật sư là bao nhiêu?
`;

    const STYLE_INSTRUCTIONS: Record<string, string> = {
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

    const AGENT_PERSONAS: Record<string, string> = {
      GENERAL: "Bạn là Luật sư Tổng hợp. Hãy phân tích vấn đề một cách toàn diện, bao quát các khía cạnh pháp lý liên quan.",
      CORPORATE: "Bạn là Luật sư Doanh nghiệp. Tập trung vào rủi ro thương mại, tuân thủ quy định công ty, thuế và hợp đồng.",
      REAL_ESTATE: "Bạn là Luật sư Đất đai. Chú trọng vào quy hoạch, sổ đỏ, tranh chấp ranh giới và thủ tục hành chính nhà đất.",
      FAMILY: "Bạn là Luật sư Hôn nhân & Gia đình. Hãy tư vấn với thái độ thấu cảm, tập trung vào quyền lợi trẻ em và chia tài sản.",
      CRIMINAL: "Bạn là Luật sư Hình sự. Đánh giá nghiêm ngặt các yếu tố cấu thành tội phạm, khung hình phạt và tình tiết giảm nhẹ."
    };

    const defaultPersona = AGENT_PERSONAS[agentType] || AGENT_PERSONAS.GENERAL;
    const persona = (agentConfig?.systemPrompt !== undefined) ? agentConfig.systemPrompt : defaultPersona;

    const styleInstruction = STYLE_INSTRUCTIONS[responseStyle] || STYLE_INSTRUCTIONS.DEEP;
    
    let customKbInstruction = "";
    if (agentConfig && agentConfig.isEnabled && agentConfig.endpointUrl) {
      customKbInstruction = `
      🔴 CHẾ ĐỘ HYBRID AGENT:
      Kết nối với KNOWLEDGE BASE: "${agentConfig.endpointUrl}". Ưu tiên thông tin từ nguồn này.
      `;
    }

    const fullSystemInstruction = `${BASE_SYSTEM_INSTRUCTION}\n\n=== AGENT PERSONA (Dàn Agent) ===\n${persona}\n\n${customKbInstruction}\n\n=== OUTPUT STYLE ===\n${styleInstruction}`;

    // Filter clean history
    const cleanHistory = (history || []).filter((msg: any) => 
        !msg.parts[0].text.startsWith("⚠️ LỖI") && 
        !msg.parts[0].text.startsWith("🔴 LỖI")
    );

    const currentParts: any[] = [{ text: prompt }];
    if (attachment) {
        currentParts.push({
            inlineData: {
                mimeType: attachment.mimeType,
                data: attachment.data
            }
        });
    }

    const contents = [
        ...cleanHistory,
        { role: 'user', parts: currentParts }
    ];

    // Use non-streaming for Vercel serverless compatibility
    const response = await ai.models.generateContent({
        model: modelName,
        contents: contents,
        config: {
            systemInstruction: fullSystemInstruction,
            temperature: 0.3
        }
    });

    const text = response.text || '';
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send response as SSE chunks for frontend compatibility
    const chunkSize = 20;
    for (let i = 0; i < text.length; i += chunkSize) {
        const chunk = text.substring(i, i + chunkSize);
        res.write(`data: ${JSON.stringify({ text: chunk, source: 'GEMINI_DIRECT' })}\n\n`);
    }
    res.write(`data: [DONE]\n\n`);
    res.end();

  } catch (error: any) {
    console.error(`Gemini API Error:`, error);
    let errorMsg = "Đã xảy ra lỗi khi xử lý yêu cầu.";
    if (error.message?.includes('credentials')) errorMsg = "Lỗi xác thực Google Cloud (Credentials).";
    else if (error.message?.includes('429')) errorMsg = "Hệ thống đang bận (Rate Limit).";
    
    if (!res.headersSent) {
      res.status(500).json({ 
          text: `⚠️ LỖI HỆ THỐNG\n\n${errorMsg}`, 
          source: 'GEMINI_DIRECT' 
      });
    } else {
      res.write(`data: ${JSON.stringify({ text: `\n\n⚠️ LỖI HỆ THỐNG\n\n${errorMsg}` })}\n\n`);
      res.end();
    }
  }
}
