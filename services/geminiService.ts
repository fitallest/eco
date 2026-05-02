import { AgentType, ResponseStyle, AgentConfig } from "../types";
import { supabase } from "./supabase";

export const sendMessageToGemini = async (
  prompt: string, 
  history: { role: string; parts: { text: string }[] }[],
  agentType: AgentType = 'GENERAL',
  responseStyle: ResponseStyle = 'DEEP',
  agentConfig?: AgentConfig,
  userLevel: 'Free' | 'Gold' | 'Enterprise' = 'Free',
  attachment?: { mimeType: string; data: string },
  onToken?: (text: string) => void
): Promise<{ text: string, source: 'BACKEND' | 'GEMINI_DIRECT' | 'OPENAI_DIRECT' }> => {
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    // Primary engine: OpenAI (ChatGPT)
    const response = await fetch('/api/openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        prompt,
        history,
        agentType,
        responseStyle,
        agentConfig,
        userLevel,
        attachment
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      if (errorData && errorData.text) {
        return { text: errorData.text, source: 'OPENAI_DIRECT' };
      }
      throw new Error(`Máy chủ trả về lỗi ${response.status}`);
    }

    if (!response.body) {
      throw new Error('ReadableStream not supported in this browser.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullText = '';
    let source: 'OPENAI_DIRECT' | 'GEMINI_DIRECT' | 'BACKEND' = 'OPENAI_DIRECT';

    let done = false;
    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        const chunkString = decoder.decode(value, { stream: true });
        const lines = chunkString.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') break;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.text) {
                fullText += parsed.text;
                if (parsed.source) source = parsed.source;
                if (onToken) onToken(parsed.text);
              }
            } catch (e) {
              // Ignore partial JSON chunks if they happen, though they shouldn't with standard SSE formatting
            }
          }
        }
      }
    }

    return { text: fullText, source };

  } catch (error: any) {
    console.error(`API Request Error:`, error);
    return { 
        text: `⚠️ LỖI HỆ THỐNG\n\nKhông thể kết nối đến máy chủ. Vui lòng thử lại sau.`, 
        source: 'OPENAI_DIRECT' 
    };
  }
};