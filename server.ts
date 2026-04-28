import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

try { process.loadEnvFile(); } catch (e) {}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload size limit for file attachments
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API routes FIRST
  app.post("/api/gemini", async (req, res) => {
    try {
      const { prompt, history, agentType, responseStyle, agentConfig, userLevel, attachment } = req.body;
      
      if (!process.env.GEMINI_API_KEY) throw new Error("Thieu GEMINI_API_KEY trong Environment Variables");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // Select Model based on User Level
      let modelName = 'gemini-flash-lite-latest'; 
      if (userLevel === 'Enterprise' || userLevel === 'Gold') {
          modelName = 'gemini-flash-latest'; 
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
(Đây là các câu lệnh tắt trên giao diện để người dùng bấm vào. BẮT BUỘC phải là LỜI CỦA NGƯỜI DÙNG yêu cầu AI)
- [Gợi ý 1: "Hãy soạn đơn tố cáo cho tôi"] (KHÔNG ĐƯỢC VIẾT: "Bạn có muốn soạn đơn không?")
- [Gợi ý 2: "Thủ tục này mất bao lâu?"] (KHÔNG ĐƯỢC VIẾT: "Tôi có thể giải thích về thủ tục...")
- [Gợi ý 3: "Chi phí thuê luật sư là bao nhiêu?"]
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

      const response = await ai.models.generateContent({
          model: modelName,
          contents: contents,
          config: {
              systemInstruction: fullSystemInstruction,
              temperature: 0.3, 
              tools: [{ googleSearch: {} }]
          }
      });

      res.json({ 
          text: response.text || "Hệ thống không phản hồi.", 
          source: 'GEMINI_DIRECT' 
      });

    } catch (error: any) {
      console.error(`Gemini API Error:`, error);
      let errorMsg = `Lỗi thực tế: ${error.message} - ${error.stack}`;
      
      res.status(500).json({ 
          text: `⚠️ LỖI HỆ THỐNG\n\n${errorMsg}`, 
          source: 'GEMINI_DIRECT' 
      });
    }
  });

  // ── OpenAI (ChatGPT) endpoint ─────────────────────────────────────
  app.post("/api/openai", async (req, res) => {
    try {
      const { prompt, history, agentType, responseStyle, agentConfig, userLevel } = req.body;

      if (!process.env.OPENAI_API_KEY) throw new Error("Thiếu OPENAI_API_KEY trong Environment Variables");
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // Select model based on User Level
      let modelName = 'gpt-4o-mini';
      if (userLevel === 'Enterprise' || userLevel === 'Gold') {
        modelName = 'gpt-4o';
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
- Nếu người dùng hỏi cộc lốc, TUYỆT ĐỐI KHÔNG trả lời tràng giang đại hải.
- HÃY HỎI NGƯỢC LẠI để khai thác thêm thông tin.

🔥 QUY TẮC "HUMAN HANDOFF":
Thêm "[[HUMAN_REQUIRED]]" vào CUỐI câu trả lời nếu: yêu cầu đại diện ra tòa, công chứng, vụ hình sự nghiêm trọng, tài sản trên 10 tỷ, hợp đồng M&A/IPO, hoặc người dùng yêu cầu "Gặp luật sư".

CẤU TRÚC TRẢ LỜI (BẮT BUỘC DÙNG MARKDOWN):
---
📍 TRẠNG THÁI HỆ THỐNG
📂 Phân loại: [Lĩnh vực] | ⚙️ Engine: ChatGPT | 👤 Agent: [Tên]
---
🤖 [NỘI DUNG TƯ VẤN]
---
⚖️ KHUYẾN NGHỊ & RỦI RO
---
💡 GỢI Ý TIẾP THEO
`;

      const STYLE_INSTRUCTIONS: Record<string, string> = {
        CONCISE: "🔥 CHẾ ĐỘ TƯ VẤN NHANH: Kết luận ngắn gọn, chỉ nêu số hiệu điều luật, tập trung Actionable Items.",
        DEEP: "📚 CHẾ ĐỘ CHUYÊN SÂU: Trích dẫn cụ thể (Khoản, Điều, Luật). Phân tích lợi/hại từng phương án."
      };

      const AGENT_PERSONAS: Record<string, string> = {
        GENERAL: "Bạn là Luật sư Tổng hợp. Phân tích toàn diện các khía cạnh pháp lý liên quan.",
        CORPORATE: "Bạn là Luật sư Doanh nghiệp. Tập trung rủi ro thương mại, tuân thủ, thuế và hợp đồng.",
        REAL_ESTATE: "Bạn là Luật sư Đất đai. Chú trọng quy hoạch, sổ đỏ, tranh chấp và thủ tục nhà đất.",
        FAMILY: "Bạn là Luật sư Hôn nhân & Gia đình. Tư vấn thấu cảm, tập trung quyền lợi trẻ em và chia tài sản.",
        CRIMINAL: "Bạn là Luật sư Hình sự. Đánh giá yếu tố cấu thành tội phạm, khung hình phạt và tình tiết giảm nhẹ."
      };

      const persona = (agentConfig?.systemPrompt !== undefined) ? agentConfig.systemPrompt : (AGENT_PERSONAS[agentType] || AGENT_PERSONAS.GENERAL);
      const styleInstruction = STYLE_INSTRUCTIONS[responseStyle] || STYLE_INSTRUCTIONS.DEEP;
      let customKbInstruction = "";
      if (agentConfig?.isEnabled && agentConfig?.endpointUrl) {
        customKbInstruction = `🔴 CHẾ ĐỘ HYBRID AGENT: Kết nối KNOWLEDGE BASE: "${agentConfig.endpointUrl}". Ưu tiên thông tin từ nguồn này.`;
      }

      const systemContent = `${BASE_SYSTEM_INSTRUCTION}\n\n=== AGENT PERSONA ===\n${persona}\n\n${customKbInstruction}\n\n=== OUTPUT STYLE ===\n${styleInstruction}`;

      // Build OpenAI messages array from Gemini-format history
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemContent }
      ];
      for (const msg of (history || [])) {
        const text = msg.parts?.[0]?.text || '';
        if (text.startsWith("⚠️ LỖI") || text.startsWith("🔴 LỖI")) continue;
        messages.push({ role: msg.role === 'model' ? 'assistant' : 'user', content: text });
      }
      messages.push({ role: 'user', content: prompt });

      const completion = await client.chat.completions.create({
        model: modelName,
        messages,
        temperature: 0.3,
      });

      res.json({
        text: completion.choices[0]?.message?.content || "Hệ thống không phản hồi.",
        source: 'OPENAI_DIRECT'
      });

    } catch (error: any) {
      console.error(`OpenAI API Error:`, error);
      let errorMsg = `Lỗi: ${error.message}`;
      if (error.status === 429) errorMsg = "Rate limit – vui lòng thử lại sau.";
      res.status(500).json({ text: `⚠️ LỖI HỆ THỐNG\n\n${errorMsg}`, source: 'OPENAI_DIRECT' });
    }
  });

  // ── Contract Risk Analysis endpoint ─────────────────────────────────
  app.post("/api/contract-analyze", async (req, res) => {
    try {
      const { contractText } = req.body;
      if (!contractText || contractText.trim().length < 50) {
        return res.status(400).json({ error: 'Nội dung hợp đồng quá ngắn hoặc trống.' });
      }

      const systemPrompt = `Bạn là ECOLAW.AI — Chuyên gia phân tích rủi ro hợp đồng pháp lý Việt Nam.

NHIỆM VỤ: Đọc toàn bộ hợp đồng và tìm TẤT CẢ các điều khoản có rủi ro pháp lý cho bên mua/bên yếu thế hơn.

QUY TẮC BẮT BUỘC:
1. Chỉ phân tích dựa trên NỘI DUNG HỢP ĐỒNG được cung cấp — KHÔNG bịa đặt.
2. Mỗi rủi ro phải trích dẫn CHÍNH XÁC đoạn text gốc trong hợp đồng.
3. Phải có căn cứ pháp luật Việt Nam (Điều, Khoản, Luật cụ thể).
4. Xếp hạng rủi ro: HIGH (trái luật hoặc bất công nghiêm trọng), MEDIUM (bất lợi nhưng hợp pháp), LOW (cần lưu ý).

TRẢ VỀ JSON THUẦN TÚY (không markdown, không backtick), theo format:
{
  "summary": "Tóm tắt ngắn gọn tình trạng hợp đồng",
  "recommendation": "KHÔNG NÊN KÝ / CẦN SỬA ĐỔI / AN TOÀN",
  "risks": [
    {
      "id": "RISK-001",
      "text": "Đoạn text CHÍNH XÁC từ hợp đồng chứa rủi ro",
      "riskLevel": "HIGH",
      "explanation": "Giải thích tại sao điều khoản này nguy hiểm",
      "suggestion": "Đề xuất thay thế cụ thể",
      "lawReference": "Điều X, Luật Y năm Z"
    }
  ]
}`;

      let result: any;

      // Try OpenAI first
      if (process.env.OPENAI_API_KEY) {
        try {
          const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
          const completion = await client.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Phân tích hợp đồng sau:\n\n${contractText}` }
            ],
            temperature: 0.1,
            response_format: { type: 'json_object' }
          });
          const raw = completion.choices[0]?.message?.content || '{}';
          result = JSON.parse(raw);
        } catch (openaiErr: any) {
          console.error('OpenAI contract-analyze error, trying Gemini:', openaiErr.message);
        }
      }

      // Fallback to Gemini
      if (!result && process.env.GEMINI_API_KEY) {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-flash-latest',
          contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\nPhân tích hợp đồng sau:\n\n${contractText}` }] }],
          config: { temperature: 0.1, responseMimeType: 'application/json' }
        });
        const raw = response.text || '{}';
        result = JSON.parse(raw);
      }

      if (!result) throw new Error('Không có API key nào khả dụng.');

      // Validate and normalize
      const risks = (result.risks || []).map((r: any, i: number) => ({
        id: r.id || `RISK-${String(i + 1).padStart(3, '0')}`,
        text: r.text || '',
        riskLevel: ['HIGH', 'MEDIUM', 'LOW'].includes(r.riskLevel) ? r.riskLevel : 'MEDIUM',
        explanation: r.explanation || '',
        suggestion: r.suggestion || '',
        lawReference: r.lawReference || '',
        position: { start: 0, end: 0 }
      }));

      res.json({
        summary: result.summary || 'Phân tích hoàn tất.',
        recommendation: result.recommendation || 'CẦN SỬA ĐỔI',
        risks,
        source: process.env.OPENAI_API_KEY ? 'OPENAI' : 'GEMINI'
      });

    } catch (error: any) {
      console.error('Contract Analysis Error:', error);
      res.status(500).json({ error: `Lỗi phân tích: ${error.message}` });
    }
  });

  // ── Contract Chat endpoint ──────────────────────────────────────────
  app.post("/api/contract-chat", async (req, res) => {
    try {
      const { question, contractText, chatHistory } = req.body;
      if (!question) return res.status(400).json({ error: 'Thiếu câu hỏi.' });

      const systemPrompt = `Bạn là ECOLAW.AI — Trợ lý phân tích hợp đồng pháp lý.

CHẾ ĐỘ: STRICT MODE (Chỉ trả lời dựa trên nội dung hợp đồng và pháp luật Việt Nam)

QUY TẮC:
1. CHỈ trả lời dựa trên nội dung hợp đồng đã cung cấp và kiến thức pháp luật Việt Nam.
2. Nếu câu hỏi nằm ngoài phạm vi hợp đồng, nói rõ "Thông tin này không có trong hợp đồng."
3. Trích dẫn chính xác điều khoản khi trả lời.
4. Luôn đề cập căn cứ pháp luật (Điều, Khoản, Luật).
5. Trả lời bằng tiếng Việt, ngắn gọn, dễ hiểu.
6. KHÔNG bịa đặt thông tin không có trong hợp đồng.

NỘI DUNG HỢP ĐỒNG ĐANG PHÂN TÍCH:
${contractText || 'Không có hợp đồng.'}`;

      let answer = '';

      // Try OpenAI first
      if (process.env.OPENAI_API_KEY) {
        try {
          const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
          const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            { role: 'system', content: systemPrompt }
          ];
          for (const msg of (chatHistory || [])) {
            messages.push({ role: msg.role === 'model' ? 'assistant' : 'user', content: msg.text || '' });
          }
          messages.push({ role: 'user', content: question });

          const completion = await client.chat.completions.create({
            model: 'gpt-4o-mini',
            messages,
            temperature: 0.2,
          });
          answer = completion.choices[0]?.message?.content || 'Không có phản hồi.';
        } catch (openaiErr: any) {
          console.error('OpenAI contract-chat error, trying Gemini:', openaiErr.message);
        }
      }

      // Fallback to Gemini
      if (!answer && process.env.GEMINI_API_KEY) {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const historyParts = (chatHistory || []).map((m: any) => ({
          role: m.role === 'model' ? 'model' : 'user',
          parts: [{ text: m.text || '' }]
        }));
        const response = await ai.models.generateContent({
          model: 'gemini-flash-latest',
          contents: [
            ...historyParts,
            { role: 'user', parts: [{ text: question }] }
          ],
          config: { systemInstruction: systemPrompt, temperature: 0.2 }
        });
        answer = response.text || 'Không có phản hồi.';
      }

      if (!answer) throw new Error('Không có API key nào khả dụng.');

      res.json({ answer, source: process.env.OPENAI_API_KEY ? 'OPENAI' : 'GEMINI' });

    } catch (error: any) {
      console.error('Contract Chat Error:', error);
      res.status(500).json({ error: `Lỗi: ${error.message}` });
    }
  });

  // ── Embeddings endpoint ──────────────────────────────────────────
  app.post("/api/embeddings", async (req, res) => {
    try {
      const { input } = req.body;
      if (!input) return res.status(400).json({ error: 'Missing input' });

      if (!process.env.OPENAI_API_KEY) throw new Error("Thiếu OPENAI_API_KEY trong Environment Variables");
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const response = await client.embeddings.create({
        model: "text-embedding-3-small",
        input: input,
      });

      res.status(200).json({
        embedding: response.data[0].embedding
      });
    } catch (error: any) {
      console.error('Embeddings Error:', error);
      res.status(500).json({ error: 'Lỗi khi tạo embeddings', details: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
  
  return app;
}

const appPromise = startServer();
export default async function handler(req: any, res: any) {
  const app = await appPromise;
  app(req, res);
}
