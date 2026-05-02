import OpenAI from "openai";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { input } = req.body;
    if (!input) {
      return res.status(400).json({ error: 'Missing input' });
    }

    if (!process.env.OPENAI_API_KEY) throw new Error("Thiếu OPENAI_API_KEY trong Environment Variables");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: input,
    });

    res.status(200).json({
      embedding: response.data[0].embedding,
      embeddings: response.data.map(d => d.embedding)
    });

  } catch (error: any) {
    console.error(`OpenAI Embeddings Error:`, error);
    res.status(500).json({
      error: 'Lỗi khi tạo embeddings',
      details: error.message
    });
  }
}
