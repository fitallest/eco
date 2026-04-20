import { AgentType, ResponseStyle, AgentConfig } from "../types";

export const sendMessageToGemini = async (
  prompt: string, 
  history: { role: string; parts: { text: string }[] }[],
  agentType: AgentType = 'GENERAL',
  responseStyle: ResponseStyle = 'DEEP',
  agentConfig?: AgentConfig,
  userLevel: 'Free' | 'Gold' | 'Enterprise' = 'Free',
  attachment?: { mimeType: string; data: string }
): Promise<{ text: string, source: 'BACKEND' | 'GEMINI_DIRECT' }> => {
  
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
        return { text: errorData.text, source: 'GEMINI_DIRECT' };
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;

  } catch (error: any) {
    console.error(`API Request Error:`, error);
    return { 
        text: `⚠️ LỖI HỆ THỐNG\n\nKhông thể kết nối đến máy chủ. Vui lòng thử lại sau.`, 
        source: 'GEMINI_DIRECT' 
    };
  }
};