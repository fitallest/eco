import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageBase64, mimeType, docTypeHint } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Thiếu dữ liệu ảnh.' });
    }

    const ocrPrompt = `Bạn là ECOLAW.AI OCR Engine chuyên dụng. Phân tích ảnh tài liệu pháp lý này.

LOẠI TÀI LIỆU GỢI Ý: ${docTypeHint || 'Chưa xác định'}

NHIỆM VỤ:
1. Đọc và trích xuất TOÀN BỘ nội dung chữ có trong ảnh (OCR).
2. Tự động nhận diện chính xác loại tài liệu: Sổ đỏ (SO_DO), CCCD (CAN_CUOC), Giấy khai sinh (GIAY_KHAI_SINH), Hợp đồng (HOP_DONG), hoặc Khác (KHAC).
3. Bóc tách tất cả các trường dữ liệu quan trọng thành các cặp key-value tiếng Việt.

QUY TẮC:
- Trả về DUY NHẤT một JSON object, không có text nào khác bên ngoài JSON.
- Không wrap trong markdown code block.
- Nếu ảnh mờ hoặc không đọc được, vẫn trả JSON với confidence thấp.

FORMAT JSON BẮT BUỘC:
{
  "detectedType": "SO_DO",
  "fullText": "Toàn bộ nội dung text đọc được...",
  "fields": {
    "Số sổ": "BV 123456",
    "Chủ sở hữu": "NGUYỄN VĂN A"
  },
  "confidence": 0.95
}`;

    let result: any = null;

    // Try Gemini first (better at vision tasks)
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
                console.error('[Vercel OCR] Lỗi parse GCP_SERVICE_ACCOUNT_JSON:', e.message);
            }
        }

        if (!ai && process.env.GEMINI_API_KEY) {
            ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        }

        if (ai) {
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{
              role: 'user',
              parts: [
                { text: ocrPrompt },
                {
                  inlineData: {
                    mimeType: mimeType || 'image/jpeg',
                    data: imageBase64
                  }
                }
              ]
            }],
            config: {
              temperature: 0.1,
              responseMimeType: 'application/json'
            }
          });

          const raw = response.text || '{}';
          try {
            result = JSON.parse(raw);
          } catch {
            // Try to extract JSON from response if wrapped in markdown
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              result = JSON.parse(jsonMatch[0]);
            }
          }
        }
      } catch (geminiErr: any) {
        console.error('Gemini OCR Error:', geminiErr.message);
      }

    // Fallback to OpenAI GPT-4o Vision
    if (!result && process.env.OPENAI_API_KEY) {
      try {
        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const completion = await client.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: ocrPrompt },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`,
                    detail: 'high'
                  }
                }
              ]
            }
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' }
        });

        const raw = completion.choices[0]?.message?.content || '{}';
        result = JSON.parse(raw);
      } catch (openaiErr: any) {
        console.error('OpenAI OCR Error:', openaiErr.message);
      }
    }

    if (!result) {
      throw new Error('Không có API key nào khả dụng hoặc cả hai API đều lỗi.');
    }

    // Normalize and validate response
    const response = {
      detectedType: ['SO_DO', 'CAN_CUOC', 'GIAY_KHAI_SINH', 'HOP_DONG', 'KHAC'].includes(result.detectedType)
        ? result.detectedType
        : 'KHAC',
      fullText: result.fullText || '',
      fields: result.fields || {},
      confidence: typeof result.confidence === 'number' ? result.confidence : 0.8,
      source: process.env.GEMINI_API_KEY ? 'GEMINI_VISION' : 'OPENAI_VISION'
    };

    res.status(200).json(response);

  } catch (error: any) {
    console.error('OCR API Error:', error);
    res.status(500).json({ error: `Lỗi OCR: ${error.message}` });
  }
}
