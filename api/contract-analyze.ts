import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-flash-latest',
          contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\nPhân tích hợp đồng sau:\n\n${contractText}` }] }],
          config: { temperature: 0.1, responseMimeType: 'application/json' }
        });
        const raw = response.text || '{}';
        result = JSON.parse(raw);
      } catch (geminiErr: any) {
        console.error('Gemini contract-analyze error:', geminiErr.message);
      }
    }

    if (!result) throw new Error('Không có API key nào khả dụng hoặc lỗi API.');

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

    res.status(200).json({
      summary: result.summary || 'Phân tích hoàn tất.',
      recommendation: result.recommendation || 'CẦN SỬA ĐỔI',
      risks,
      source: process.env.OPENAI_API_KEY ? 'OPENAI' : 'GEMINI'
    });

  } catch (error: any) {
    console.error('Contract Analysis Error:', error);
    res.status(500).json({ error: `Lỗi phân tích: ${error.message}` });
  }
}
