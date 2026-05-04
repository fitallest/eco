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

        const stream = await client.chat.completions.create({
          model: 'gpt-4o',
          messages,
          temperature: 0.2,
          stream: true,
        });

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
          }
        }
        res.write(`data: [DONE]\n\n`);
        return res.end();
      } catch (openaiErr: any) {
        console.error('OpenAI contract-chat error, trying Gemini:', openaiErr.message);
        if (res.headersSent) {
          res.write(`data: ${JSON.stringify({ text: "\n\n[Lỗi kết nối OpenAI]" })}\n\n`);
          return res.end();
        }
      }
    }

    // Fallback to Gemini
    if (!res.headersSent) {
      try {
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
                console.error('[Vercel Chat] Lỗi parse GCP_SERVICE_ACCOUNT_JSON:', e.message);
            }
        }

        if (!ai && process.env.GEMINI_API_KEY) {
            ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        }

        if (ai) {
          const historyParts = (chatHistory || []).map((m: any) => ({
            role: m.role === 'model' ? 'model' : 'user',
            parts: [{ text: m.text || '' }]
          }));
          
          const responseStream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: [
              ...historyParts,
              { role: 'user', parts: [{ text: question }] }
            ],
            config: { systemInstruction: systemPrompt, temperature: 0.2 }
          });

          if (!res.headersSent) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.flushHeaders();
          }

          for await (const chunk of responseStream) {
            if (chunk.text) {
              res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
            }
          }
          res.write(`data: [DONE]\n\n`);
          return res.end();
        }
      } catch (geminiErr: any) {
        console.error('Gemini contract-chat error:', geminiErr.message);
        if (res.headersSent) {
           res.write(`data: ${JSON.stringify({ text: "\n\n[Lỗi kết nối Gemini]" })}\n\n`);
           return res.end();
        }
      }
    }

    if (!res.headersSent) {
      throw new Error('Không có API key nào khả dụng hoặc lỗi API.');
    }

  } catch (error: any) {
    console.error('Contract Chat Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: `Lỗi: ${error.message}` });
    } else {
      res.write(`data: ${JSON.stringify({ text: `\n\n[Lỗi: ${error.message}]` })}\n\n`);
      res.end();
    }
  }
}
