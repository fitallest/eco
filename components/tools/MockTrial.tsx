import React, { useState, useEffect, useRef } from 'react';
import { Gavel, User, MessageSquare, Shield } from 'lucide-react';
import { sendMessageToGemini } from '../../services/geminiService';

interface TrialMessage {
  role: 'JUDGE' | 'LAWYER' | 'USER';
  text: string;
}

export const MockTrial: React.FC = () => {
  const [caseType, setCaseType] = useState('CIVIL');
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<TrialMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const startTrial = async () => {
    setStarted(true);
    setLoading(true);
    const introPrompt = `
    [KHỞI ĐỘNG PHIÊN TÒA GIẢ ĐỊNH]
    Loại vụ án: ${caseType === 'CIVIL' ? 'Dân sự (Tranh chấp đất đai/Hợp đồng)' : caseType === 'CRIMINAL' ? 'Hình sự (Cố ý gây thương tích/Trộm cắp)' : 'Hôn nhân gia đình (Ly hôn/Giành quyền nuôi con)'}.
    
    Vai trò của bạn: CHỦ TỌA PHIÊN TÒA (Thẩm phán).
    Nhiệm vụ:
    1. Tuyên bố khai mạc phiên tòa giả định.
    2. Yêu cầu "Đương sự" (Người dùng) trình bày tóm tắt nội dung vụ việc hoặc yêu cầu khởi kiện.
    
    Hãy bắt đầu bằng giọng điệu trang nghiêm của tòa án.
    `;
    
    try {
      const response = await sendMessageToGemini(introPrompt, [], 'GENERAL', 'DEEP', undefined, 'Gold');
      setMessages([{ role: 'JUDGE', text: response.text }]);
    } catch (e) {
      setMessages([{ role: 'JUDGE', text: 'Lỗi hệ thống tòa án. Vui lòng thử lại.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = { role: 'USER', text: input } as TrialMessage;
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const history = messages.map(m => ({
        role: m.role === 'USER' ? 'user' : 'model',
        parts: [{ text: m.text }]
    }));

    const prompt = `
    [PHIÊN TÒA ĐANG DIỄN RA - CĂNG THẲNG & THỰC TẾ]
    Người dùng (Đương sự) vừa trình bày: "${input}"
    
    VAI TRÒ CỦA BẠN (Đa nhân cách):
    1. **CHỦ TỌA (Thẩm phán)**: Nghiêm khắc, chỉ quan tâm đến chứng cứ và quy định pháp luật. Sẵn sàng ngắt lời nếu đương sự nói lan man.
    2. **LUẬT SƯ ĐỐI PHƯƠNG**: Sắc sảo, luôn tìm kẽ hở trong lời khai để tấn công, phủ nhận yêu cầu của đương sự.
    
    NHIỆM VỤ:
    - Đừng chỉ đặt câu hỏi. Hãy **PHẢN BIỆN (Rebuttal)** ngay lập tức.
    - Nếu lời khai thiếu bằng chứng: Hãy bác bỏ ngay ("Ông/Bà nói vậy nhưng chứng cứ đâu?").
    - Nếu lời khai mâu thuẫn: Hãy vạch trần ngay.
    - Đặt câu hỏi "gài" để xem đương sự có vững tâm lý không.
    
    Mục tiêu: Tạo áp lực tâm lý như phiên tòa thật để người dùng rèn luyện bản lĩnh.
    `;

    try {
        const response = await sendMessageToGemini(prompt, history as any, 'GENERAL', 'DEEP', undefined, 'Gold');
        setMessages(prev => [...prev, { role: 'JUDGE', text: response.text }]);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  if (!started) {
    return (
      <div className="p-6 bg-slate-900 rounded-xl border border-slate-700 h-full flex flex-col items-center justify-center text-center">
        <Gavel size={48} className="text-emerald-500 mb-4"/>
        <h3 className="text-2xl font-bold text-white mb-2">Phiên Tòa Giả Định</h3>
        <p className="text-slate-400 mb-6 max-w-md">Luyện tập tranh tụng, trả lời thẩm vấn trước Thẩm phán AI. Chuẩn bị tâm lý vững vàng trước khi ra tòa thật.</p>
        
        <div className="grid grid-cols-1 gap-3 w-full max-w-xs">
          <button onClick={() => setCaseType('CIVIL')} className={`p-3 rounded-lg border ${caseType === 'CIVIL' ? 'bg-emerald-900/30 border-emerald-500 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-400'} hover:border-emerald-500 transition-all`}>Tranh chấp Dân sự</button>
          <button onClick={() => setCaseType('MARRIAGE')} className={`p-3 rounded-lg border ${caseType === 'MARRIAGE' ? 'bg-emerald-900/30 border-emerald-500 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-400'} hover:border-emerald-500 transition-all`}>Ly hôn & Gia đình</button>
          <button onClick={() => setCaseType('CRIMINAL')} className={`p-3 rounded-lg border ${caseType === 'CRIMINAL' ? 'bg-emerald-900/30 border-emerald-500 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-400'} hover:border-emerald-500 transition-all`}>Hình sự</button>
        </div>

        <button onClick={startTrial} className="mt-8 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-full shadow-lg shadow-emerald-900/20 flex items-center gap-2">
          <Gavel size={18}/> Bắt đầu Phiên tòa
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
      <div className="bg-slate-900 p-3 border-b border-slate-800 flex justify-between items-center">
        <div className="font-bold text-white flex items-center gap-2"><Gavel size={16} className="text-emerald-500"/> Tòa án Nhân dân (Giả định)</div>
        <button onClick={() => setStarted(false)} className="text-xs text-slate-500 hover:text-white">Kết thúc</button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'USER' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-xl text-sm ${m.role === 'USER' ? 'bg-emerald-900/20 text-emerald-100 border border-emerald-500/30' : 'bg-slate-900 text-slate-300 border border-slate-800'}`}>
              {m.role === 'JUDGE' && <div className="text-xs font-bold text-amber-500 mb-1 flex items-center gap-1"><Shield size={10}/> HỘI ĐỒNG XÉT XỬ</div>}
              <div className="whitespace-pre-wrap">{m.text}</div>
            </div>
          </div>
        ))}
        {loading && <div className="text-xs text-slate-500 text-center animate-pulse">Thẩm phán đang xem xét hồ sơ...</div>}
      </div>

      <div className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2">
        <input 
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Trình bày ý kiến của bạn..."
          className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
        />
        <button onClick={handleSend} disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-lg"><MessageSquare size={18}/></button>
      </div>
    </div>
  );
};
