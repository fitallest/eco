import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Phone, PhoneOff, Activity } from 'lucide-react';
import { sendMessageToGemini } from '../../services/geminiService';
import { retrieveRelevantContext } from '../../services/ragService';

interface VoiceLawyerProps {
  userLevel?: string;
}

export const VoiceLawyer: React.FC<VoiceLawyerProps> = ({ userLevel = 'Free' }) => {
  const [isCalling, setIsCalling] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  
  // Speech Recognition Setup
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis>(window.speechSynthesis);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.lang = 'vi-VN';
        recognitionRef.current.interimResults = false;

        recognitionRef.current.onresult = (event: any) => {
            const text = event.results[0][0].transcript;
            setTranscript(text);
            handleProcessVoiceInput(text);
        };

        recognitionRef.current.onend = () => {
            setIsListening(false);
        };
    }
  }, []);

  const handleProcessVoiceInput = async (text: string) => {
      setIsListening(false);
      
      try {
          // RAG Integration
          let ragContextText = "";
          if (userLevel === 'Enterprise') {
              const ragContext = await retrieveRelevantContext(text);
              if (ragContext && ragContext.length > 0) {
                  ragContextText = `
[THÔNG TIN NỘI BỘ (RAG)]
${ragContext.map(c => c.content).join('\n')}
                  `;
              }
          }

          const prompt = `
          [CHẾ ĐỘ CUỘC GỌI KHẨN CẤP - VOICE CALL]
          Bạn đang nói chuyện điện thoại trực tiếp với khách hàng đang gặp rắc rối pháp lý (có thể đang hoảng loạn).
          Khách hàng vừa nói: "${text}"
          ${ragContextText}
          
          NGUYÊN TẮC TRẢ LỜI (BẮT BUỘC):
          1. **KHÔNG DÙNG MARKDOWN** (Không in đậm, không gạch đầu dòng, không danh sách). Chỉ dùng văn bản thuần túy.
          2. **CỰC NGẮN GỌN**: Trả lời dưới 3 câu. Người nghe không thể nhớ nội dung dài qua điện thoại.
          3. **TRẤN AN & HÀNH ĐỘNG**: Đầu tiên hãy trấn an, sau đó chỉ dẫn hành động cụ thể ngay lập tức (Ví dụ: "Đừng ký gì cả", "Gọi 113 ngay", "Giữ nguyên hiện trường").
          4. **GIỌNG ĐIỆU**: Bình tĩnh, chắc chắn, tin cậy.
          
          Hãy trả lời ngay bây giờ như một luật sư đang cầm máy.
          `;
          const response = await sendMessageToGemini(prompt, [], 'GENERAL', 'CONCISE', undefined, userLevel as any);
          setAiResponse(response.text);
          speak(response.text);
      } catch (e) {
          speak("Xin lỗi, tín hiệu kém quá. Bạn nói lại được không?");
      }
  };

  const speak = (text: string) => {
      if (synthesisRef.current) {
          setIsSpeaking(true);
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'vi-VN';
          utterance.rate = 1.15; // Faster for urgency
          utterance.onend = () => {
              setIsSpeaking(false);
              // Auto-resume listening for continuous hands-free conversation
              if (recognitionRef.current && isCalling) {
                  try {
                      recognitionRef.current.start();
                      setIsListening(true);
                      setTranscript("Đang nghe...");
                  } catch (e) {}
              }
          };
          synthesisRef.current.speak(utterance);
      }
  };

  const startCall = () => {
      setIsCalling(true);
      speak("Alo, Văn phòng luật sư Eco Law xin nghe. Tôi có thể giúp gì cho bạn?");
  };

  const endCall = () => {
      setIsCalling(false);
      setIsListening(false);
      synthesisRef.current.cancel();
      setTranscript('');
      setAiResponse('');
  };

  const toggleMic = () => {
      // Interrupt AI if speaking
      if (isSpeaking) {
          synthesisRef.current.cancel();
          setIsSpeaking(false);
      }

      if (isListening) {
          recognitionRef.current?.stop();
          setIsListening(false);
      } else {
          try {
              recognitionRef.current?.start();
              setIsListening(true);
              setTranscript("Đang nghe...");
          } catch(e) {}
      }
  };

  if (!isCalling) {
      return (
          <div className="h-full flex flex-col items-center justify-center bg-slate-900 rounded-xl border border-slate-700 p-6 text-center">
              <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
                  <Phone size={40} className="text-emerald-500"/>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Tổng đài Luật sư AI 24/7</h3>
              <p className="text-slate-400 mb-8 max-w-sm">Tư vấn pháp lý khẩn cấp qua giọng nói. Hỗ trợ ngay lập tức các tình huống va chạm giao thông, làm việc với cơ quan chức năng.</p>
              <button onClick={startCall} className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-full shadow-xl shadow-emerald-900/30 flex items-center gap-3 text-lg transition-transform hover:scale-105">
                  <Phone size={24}/> Gọi Ngay
              </button>
          </div>
      );
  }

  return (
      <div className="h-full flex flex-col bg-black rounded-xl overflow-hidden relative">
          {/* Visualizer Background Effect */}
          <div className="absolute inset-0 flex items-center justify-center opacity-20">
              <div className={`w-64 h-64 rounded-full bg-emerald-500 blur-3xl transition-all duration-500 ${isSpeaking ? 'scale-150 opacity-40' : 'scale-100'}`}></div>
          </div>

          <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="mb-8">
                  <h3 className="text-xl font-bold text-white mb-1">Luật sư AI</h3>
                  <p className="text-emerald-400 text-sm flex items-center justify-center gap-2">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> 
                      {isSpeaking ? 'Đang nói...' : isListening ? 'Đang nghe bạn...' : 'Đang kết nối...'}
                  </p>
              </div>

              <div className="w-32 h-32 rounded-full border-4 border-slate-800 flex items-center justify-center bg-slate-900 mb-8 relative overflow-hidden">
                  {isSpeaking ? (
                      <div className="flex items-center justify-center gap-1.5 h-full w-full">
                          <div className="w-2 h-12 bg-emerald-400 rounded-full animate-[wave_1s_ease-in-out_infinite]" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-20 bg-emerald-400 rounded-full animate-[wave_1s_ease-in-out_infinite]" style={{ animationDelay: '200ms' }}></div>
                          <div className="w-2 h-16 bg-emerald-400 rounded-full animate-[wave_1s_ease-in-out_infinite]" style={{ animationDelay: '400ms' }}></div>
                          <div className="w-2 h-24 bg-emerald-400 rounded-full animate-[wave_1s_ease-in-out_infinite]" style={{ animationDelay: '600ms' }}></div>
                          <div className="w-2 h-10 bg-emerald-400 rounded-full animate-[wave_1s_ease-in-out_infinite]" style={{ animationDelay: '800ms' }}></div>
                      </div>
                  ) : (
                      <Activity size={48} className="text-slate-500"/>
                  )}
              </div>

              <div className="min-h-[60px] max-w-md">
                  <p className="text-slate-300 text-lg font-medium transition-all">
                      "{transcript || aiResponse || "..."}"
                  </p>
              </div>
          </div>

          <div className="relative z-10 p-8 flex justify-center gap-8 items-center bg-gradient-to-t from-black to-transparent">
              <button onClick={toggleMic} className={`p-4 rounded-full transition-all ${isListening ? 'bg-white text-black scale-110' : 'bg-slate-800 text-white hover:bg-slate-700'}`}>
                  {isListening ? <MicOff size={24}/> : <Mic size={24}/>}
              </button>
              <button onClick={endCall} className="p-4 rounded-full bg-red-600 text-white hover:bg-red-500 transition-transform hover:scale-110 shadow-lg shadow-red-900/50">
                  <PhoneOff size={32}/>
              </button>
          </div>
      </div>
  );
};
