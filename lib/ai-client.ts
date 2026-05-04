import { GoogleGenAI } from "@google/genai";

/**
 * Khởi tạo GoogleGenAI client cho Vercel Serverless Functions.
 * Ưu tiên: GCP_SERVICE_ACCOUNT_JSON (Vertex AI) → GEMINI_API_KEY (AI Studio)
 */
export function createAIClient(): GoogleGenAI | null {
    // Cách 1: Vertex AI via Service Account JSON (Production)
    if (process.env.GCP_SERVICE_ACCOUNT_JSON) {
        try {
            const creds = JSON.parse(process.env.GCP_SERVICE_ACCOUNT_JSON);
            // Fix: Vercel có thể lưu \\n thành literal string thay vì newline thật
            const privateKey = creds.private_key?.replace(/\\n/g, '\n');
            console.log('[AI Client] ✅ Vertex AI credentials loaded. Project:', creds.project_id);
            return new GoogleGenAI({
                vertexai: true,
                project: creds.project_id,
                location: 'us-central1',
                googleAuthOptions: {
                    credentials: {
                        client_email: creds.client_email,
                        private_key: privateKey,
                    }
                }
            });
        } catch (e: any) {
            console.error('[AI Client] ❌ Failed to parse GCP_SERVICE_ACCOUNT_JSON:', e.message);
        }
    }

    // Cách 2: AI Studio API Key (Fallback)
    if (process.env.GEMINI_API_KEY) {
        console.log('[AI Client] ⚠️ Using GEMINI_API_KEY fallback');
        return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }

    console.error('[AI Client] ❌ No credentials found. Set GCP_SERVICE_ACCOUNT_JSON or GEMINI_API_KEY');
    return null;
}
