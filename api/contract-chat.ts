import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
        if (chatHistory && chatHistory.length > 0) {
          for (const msg of chatHistory) {
            messages.push({ role: msg.role === 'model' ? 'assistant' : 'user', content: msg.text || '' });
          }
        }
        messages.push({ role: 'user', content: question });

        const completion = await client.chat.completions.create({
          model: 'gpt-4o',
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
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const historyParts = (chatHistory || []).map((m: any) => ({
          role: m.role === 'model' ? 'model' : 'user',
          parts: [{ text: m.text || '' }]
        }));
        const response = await ai.models.generateContent({
          model: 'gemini-1.5-pro-latest',
          contents: [
            ...historyParts,
            { role: 'user', parts: [{ text: question }] }
          ],
          config: { systemInstruction: systemPrompt, temperature: 0.2 }
        });
        answer = response.text || 'Không có phản hồi.';
      } catch (geminiErr: any) {
        console.error('Gemini contract-chat error:', geminiErr.message);
      }
    }

    if (!answer) throw new Error('Không có API key nào khả dụng hoặc lỗi API.');

    res.status(200).json({ answer, source: process.env.OPENAI_API_KEY ? 'OPENAI' : 'GEMINI' });

  } catch (error: any) {
    console.error('Contract Chat Error:', error);
    res.status(500).json({ error: `Lỗi: ${error.message}` });
  }
}
