import React, { useState, useEffect, useRef } from 'react';
import { 
  Scale, 
  Gavel, 
  FileText, 
  AlertTriangle, 
  Mic, 
  MicOff, 
  PhoneOff, 
  Play, 
  Send, 
  ChevronDown, 
  ChevronUp,
  BrainCircuit,
  Activity,
  FileCheck,
  ShieldAlert,
  BarChart3,
  Shield,
  Loader2,
  Upload
} from 'lucide-react';
import { sendMessageToGemini } from '../../services/geminiService';
import * as mammoth from 'mammoth';

// --- MOCK DATA (TIẾNG VIỆT) ---

const MOCK_ARGUMENTS = [
  {
    id: 1,
    text: "Người lao động đã bị sa thải sau khi được báo trước 30 ngày theo Điều 36.",
    logicScore: 85,
    persuasionRate: 70,
    loophole: null
  },
  {
    id: 2,
    text: "Không áp dụng trợ cấp thôi việc do vi phạm kỷ luật.",
    logicScore: 40,
    persuasionRate: 35,
    loophole: "Chưa cung cấp được Biên bản họp xử lý kỷ luật lao động bắt buộc theo Điều 122."
  }
];

const MOCK_DOCUMENTS = [
  {
    id: 'doc1',
    title: 'Hợp Đồng Lao Động - Nguyễn Văn A',
    excerpt: 'Điều 4.2: Người sử dụng lao động có quyền đơn phương chấm dứt hợp đồng với 30 ngày báo trước nếu không hoàn thành công việc.',
    type: 'contract'
  },
  {
    id: 'doc2',
    title: 'Nội Quy Lao Động Công Ty',
    excerpt: 'Mục 8: Việc xử lý kỷ luật sa thải phải có sự tham gia của tổ chức đại diện người lao động (Công đoàn).',
    type: 'policy'
  },
  {
    id: 'doc3',
    title: 'Quyết định sa thải',
    excerpt: 'Ban hành ngày 12/10/2025. Hiệu lực 12/11/2025. Lý do: Vi phạm nội quy.',
    type: 'evidence'
  }
];

// --- INTERFACES ---
interface TrialMessage {
  id: number;
  role: 'JUDGE' | 'LAWYER' | 'USER';
  text: string;
  timestamp: string;
}

export const MockTrial: React.FC = () => {
  // --- STATE ---
  const [trialState, setTrialState] = useState<'setup' | 'active' | 'report'>('setup');
  const [caseType, setCaseType] = useState('CIVIL');
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  
  const [messages, setMessages] = useState<TrialMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const [activeArgs, setActiveArgs] = useState<any[]>([]);
  const [activeDocs, setActiveDocs] = useState<any[]>([]);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // --- HANDLERS ---
  const handleStartTrial = async (demo: boolean = false) => {
    setIsDemoMode(demo);
    setTrialState('active');
    setLoading(true);
    setMessages([]); // Reset messages
    setActiveArgs([]);
    setActiveDocs([]);

    const introPrompt = demo ? `
    [KHỞI ĐỘNG PHIÊN TÒA GIẢ ĐỊNH - CHẾ ĐỘ DEMO]
    Loại vụ án: Tranh chấp hợp đồng lao động (Sa thải trái luật).
    
    Vai trò của bạn: CHỦ TỌA PHIÊN TÒA.
    Nhiệm vụ: Tuyên bố khai mạc và yêu cầu đương sự giải trình về quyết định sa thải ngày 12/10/2025 đối với anh Nguyễn Văn A. Dùng Tiếng Việt trang nghiêm.
    ` : `
    [KHỞI ĐỘNG PHIÊN TÒA GIẢ ĐỊNH]
    Loại vụ án: ${caseType === 'CIVIL' ? 'Dân sự (Tranh chấp tài sản/Hợp đồng)' : caseType === 'CRIMINAL' ? 'Hình sự (Cố ý gây thương tích/Trộm cắp)' : 'Hôn nhân gia đình (Ly hôn/Giành quyền nuôi con)'}.
    
    Vai trò của bạn: CHỦ TỌA PHIÊN TÒA (Thẩm phán).
    Nhiệm vụ:
    1. Tuyên bố khai mạc phiên tòa giả định.
    2. Yêu cầu "Đương sự" (Người dùng) trình bày tóm tắt nội dung vụ việc hoặc yêu cầu khởi kiện.
    
    Hãy bắt đầu bằng giọng điệu trang nghiêm của tòa án. Dùng Tiếng Việt.
    `;
    
    try {
      const response = await sendMessageToGemini(introPrompt, [], 'GENERAL', 'DEEP', undefined, 'Gold');
      setMessages([{ 
        id: Date.now(), 
        role: 'JUDGE', 
        text: response.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch (e) {
      setMessages([{ 
        id: Date.now(), 
        role: 'JUDGE', 
        text: 'Lỗi kết nối với hệ thống tòa án AI. Vui lòng thử lại.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleEndTrial = () => setTrialState('report');
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const newDoc = {
      id: `doc-${Date.now()}`,
      title: file.name,
      excerpt: 'Đang trích xuất nội dung...',
      type: file.name.endsWith('.pdf') ? 'pdf' : 'contract'
    };
    
    setActiveDocs(prev => [...prev, newDoc]);
    
    if (file.name.endsWith('.docx')) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const arrayBuffer = ev.target?.result as ArrayBuffer;
        if (arrayBuffer) {
          try {
            const result = await mammoth.extractRawText({ arrayBuffer });
            const text = result.value;
            setActiveDocs(prev => prev.map(d => 
              d.id === newDoc.id ? { ...d, excerpt: text.substring(0, 150) + '...' } : d
            ));
          } catch (err) {
            console.error(err);
          }
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        setActiveDocs(prev => prev.map(d => 
          d.id === newDoc.id ? { ...d, excerpt: text.substring(0, 150) + '...' } : d
        ));
      };
      reader.readAsText(file);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || loading) return;
    
    const userMsg: TrialMessage = {
      id: Date.now(),
      role: 'USER',
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, userMsg]);
    const currentInput = inputText;
    setInputText("");
    setLoading(true);

    if (!isDemoMode) {
      setTimeout(() => {
        const logicScore = Math.min(95, Math.max(30, 50 + (currentInput.length / 5)));
        const persuasionRate = Math.min(90, Math.max(20, logicScore - 10));
        
        setActiveArgs(prev => [...prev, {
          id: Date.now(),
          text: currentInput,
          logicScore: Math.round(logicScore),
          persuasionRate: Math.round(persuasionRate),
          loophole: logicScore < 60 ? "Lập luận thiếu căn cứ hoặc quá ngắn để thuyết phục." : null
        }]);
      }, 1000);
    }

    // Format history for Gemini (excluding timestamps)
    const history = messages.map(m => ({
        role: m.role === 'USER' ? 'user' : 'model',
        parts: [{ text: m.text }]
    }));

    const prompt = `
    [PHIÊN TÒA ĐANG DIỄN RA - CĂNG THẲNG & THỰC TẾ]
    Người dùng (Đương sự) vừa trình bày: "${currentInput}"
    
    VAI TRÒ CỦA BẠN (Đa nhân cách):
    1. **CHỦ TỌA (Thẩm phán)**: Nghiêm khắc, chỉ quan tâm đến chứng cứ và quy định pháp luật. Sẵn sàng ngắt lời nếu đương sự nói lan man.
    2. **LUẬT SƯ ĐỐI PHƯƠNG**: Sắc sảo, luôn tìm kẽ hở trong lời khai để tấn công, phủ nhận yêu cầu của đương sự.
    
    NHIỆM VỤ:
    - Đừng chỉ đặt câu hỏi. Hãy **PHẢN BIỆN (Rebuttal)** ngay lập tức.
    - Nếu lời khai thiếu bằng chứng: Hãy bác bỏ ngay ("Ông/Bà nói vậy nhưng chứng cứ đâu?").
    - Nếu lời khai mâu thuẫn: Hãy vạch trần ngay.
    - Đặt câu hỏi "gài" để xem đương sự có vững tâm lý không.
    
    Mục tiêu: Tạo áp lực tâm lý như phiên tòa thật để người dùng rèn luyện bản lĩnh.
    Sử dụng Tiếng Việt.
    `;

    try {
        const response = await sendMessageToGemini(prompt, history as any, 'GENERAL', 'DEEP', undefined, 'Gold');
        setMessages(prev => [...prev, { 
            id: Date.now(), 
            role: 'JUDGE', 
            text: response.text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
    } catch (e) {
        console.error(e);
        setMessages(prev => [...prev, { 
            id: Date.now(), 
            role: 'JUDGE', 
            text: 'Tòa án đang mất kết nối tạm thời...',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
    } finally {
        setLoading(false);
    }
  };

  // --- RENDERERS ---

  const renderSetup = () => (
    <div className="flex flex-col items-center justify-center h-full space-y-6 animate-in fade-in zoom-in duration-500 bg-slate-900 p-8 rounded-xl border border-slate-800">
      <div className="p-6 bg-slate-800 rounded-full border border-slate-700 shadow-xl shadow-emerald-900/20">
        <Scale className="w-16 h-16 text-emerald-500" />
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-white tracking-tight">Phiên Tòa Giả Định (AI)</h2>
        <p className="text-slate-400 max-w-lg">Luyện tập tranh tụng, đối đáp trực tiếp với Thẩm phán và Luật sư AI sắc sảo để chuẩn bị tâm lý trước khi ra tòa thật.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-2xl mt-4">
        <button onClick={() => setCaseType('CIVIL')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${caseType === 'CIVIL' ? 'bg-emerald-900/30 border-emerald-500 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'}`}>
            <span className="font-semibold">Dân sự</span>
            <span className="text-xs text-center opacity-70">Tranh chấp hợp đồng, đất đai, bồi thường</span>
        </button>
        <button onClick={() => setCaseType('MARRIAGE')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${caseType === 'MARRIAGE' ? 'bg-emerald-900/30 border-emerald-500 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'}`}>
            <span className="font-semibold">Hôn nhân & GĐ</span>
            <span className="text-xs text-center opacity-70">Ly hôn, giành quyền nuôi con, chia tài sản</span>
        </button>
        <button onClick={() => setCaseType('CRIMINAL')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${caseType === 'CRIMINAL' ? 'bg-emerald-900/30 border-emerald-500 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'}`}>
            <span className="font-semibold">Hình sự</span>
            <span className="text-xs text-center opacity-70">Hành hung, lừa đảo, chiếm đoạt tài sản</span>
        </button>
      </div>

      <div className="flex items-center gap-4 mt-6">
        <button 
          onClick={() => handleStartTrial(false)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-full font-bold transition-all shadow-lg shadow-emerald-600/30 hover:shadow-emerald-500/50"
        >
          <Play className="w-5 h-5 fill-current" />
          Bắt đầu Phiên tòa (Thực tế)
        </button>
        <button 
          onClick={() => handleStartTrial(true)}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-6 py-4 rounded-full font-bold transition-all border border-slate-700"
        >
          <FileText className="w-5 h-5" />
          Xem Demo (Hướng dẫn)
        </button>
      </div>
    </div>
  );

  const renderReport = () => (
    <div className="flex flex-col h-full bg-slate-900 p-8 overflow-y-auto animate-in slide-in-from-bottom-8 duration-500 rounded-xl border border-slate-800">
      <div className="max-w-4xl mx-auto w-full space-y-8">
        <div className="flex items-center gap-4 border-b border-slate-800 pb-6">
          <div className="p-3 bg-emerald-900/50 rounded-lg border border-emerald-500/30">
            <BarChart3 className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white">Báo Cáo Rủi Ro Sau Phiên Tòa</h2>
            <p className="text-slate-400">Phân tích hoàn tất. Vui lòng xem xét các lỗ hổng lập luận trước khi ra tòa thực tế.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 flex flex-col items-center justify-center">
            <span className="text-slate-400 text-sm font-medium mb-2">Xác Suất Thua Kiện</span>
            <span className="text-5xl font-bold text-amber-500">42%</span>
            <div className="w-full bg-slate-700 h-2 rounded-full mt-4">
              <div className="bg-amber-500 h-2 rounded-full" style={{ width: '42%' }}></div>
            </div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 flex flex-col items-center justify-center">
            <span className="text-slate-400 text-sm font-medium mb-2">Độ Logic Tổng Thể</span>
            <span className="text-5xl font-bold text-emerald-500">78%</span>
            <div className="w-full bg-slate-700 h-2 rounded-full mt-4">
              <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '78%' }}></div>
            </div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 flex flex-col items-center justify-center">
            <span className="text-slate-400 text-sm font-medium mb-2">Kẽ Hở Lập Luận</span>
            <span className="text-5xl font-bold text-red-500">3</span>
            <span className="text-xs text-slate-500 mt-2">Cần khắc phục ngay</span>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            Các Điểm Mù (Blind Spots) Đã Phát Hiện
          </h3>
          <div className="space-y-3">
            <div className="bg-amber-950/20 border border-amber-900/50 rounded-lg p-5">
              <h4 className="text-amber-500 font-semibold mb-1">Thiếu quy trình Kỷ luật</h4>
              <p className="text-slate-300 text-sm">Bạn dựa vào lỗi vi phạm kỷ luật để từ chối trợ cấp thôi việc, nhưng lại không cung cấp được biên bản họp xử lý kỷ luật có Công đoàn (Điều 122). Luật sư đối phương sẽ yêu cầu bác bỏ lập luận này.</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
              <h4 className="text-slate-300 font-semibold mb-1">Tính toán sai thời hạn báo trước</h4>
              <p className="text-slate-400 text-sm">Thời hạn 30 ngày báo trước của bạn bao gồm cả ngày nghỉ lễ, điều này có thể bị khiếu nại dựa trên hướng dẫn mới nhất của Bộ Lao động.</p>
            </div>
          </div>
        </div>

        <div className="pt-6 flex justify-end">
          <button 
            onClick={() => setTrialState('setup')}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors border border-slate-600 font-medium"
          >
            Làm lại từ đầu
          </button>
        </div>
      </div>
    </div>
  );

  const renderActive = () => {
    const displayArgs = isDemoMode ? MOCK_ARGUMENTS : activeArgs;
    const displayDocs = isDemoMode ? MOCK_DOCUMENTS : activeDocs;

    return (
    <div className="flex w-full h-[80vh] overflow-hidden bg-slate-900 rounded-xl border border-slate-800">
      
      {/* LEFT PANE: Argument Tracker */}
      <div className="hidden lg:flex w-1/4 border-r border-slate-800 bg-slate-950 flex-col">
        <div className="p-4 border-b border-slate-800 flex items-center gap-2 bg-slate-900">
          <Activity className="w-5 h-5 text-emerald-500" />
          <h3 className="font-semibold text-slate-200">Theo dõi Luận điểm</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {displayArgs.length === 0 ? (
            <div className="text-center text-slate-500 text-sm mt-10 p-4 border border-slate-800 rounded-lg bg-slate-900/50">
              <Activity className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              Luận điểm sẽ được hệ thống AI tự động trích xuất trong quá trình bạn tranh tụng...
            </div>
          ) : displayArgs.map((arg) => (
              <div key={arg.id} className="bg-slate-800 rounded-lg p-4 border border-slate-700/50 shadow-sm">
              <p className="text-sm text-slate-300 mb-4 leading-relaxed">{arg.text}</p>
              
              <div className="space-y-3 mb-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Logic</span>
                    <span className={arg.logicScore > 70 ? 'text-emerald-400' : 'text-amber-400'}>{arg.logicScore}%</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${arg.logicScore > 70 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${arg.logicScore}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Thuyết phục</span>
                    <span className="text-slate-300">{arg.persuasionRate}%</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1.5">
                    <div className="bg-slate-500 h-1.5 rounded-full" style={{ width: `${arg.persuasionRate}%` }}></div>
                  </div>
                </div>
              </div>

              {arg.loophole && (
                <div className="mt-3 p-3 bg-amber-950/30 border border-amber-900/50 rounded-lg text-xs text-amber-200/90 flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span><strong>Kẽ hở:</strong> {arg.loophole}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* CENTER PANE: Courtroom */}
      <div className="flex-1 lg:w-2/4 flex flex-col relative bg-slate-900">
        {/* AI Visualizer Compact Header */}
        <div className="h-16 border-b border-slate-800 flex items-center px-4 justify-between bg-slate-950 shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${loading ? 'bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.3)] border border-emerald-500/50' : 'bg-slate-800 border border-slate-700'}`}>
              {loading ? (
                <BrainCircuit className="w-5 h-5 text-emerald-400 animate-pulse" />
              ) : (
                <Gavel className="w-5 h-5 text-slate-500" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Thẩm phán AI
              </span>
              {loading ? (
                <span className="text-[10px] text-emerald-500 animate-pulse">Đang xem xét...</span>
              ) : (
                <span className="text-[10px] text-slate-500">Đang chờ lượt...</span>
              )}
            </div>
          </div>
          <button onClick={handleEndTrial} className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1.5 shadow-sm">
            <PhoneOff className="w-3 h-3" /> Kết thúc
          </button>
        </div>

        {/* Transcript Area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.role === 'USER' ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] text-slate-500">{msg.timestamp}</span>
                <span className={`text-xs font-semibold ${msg.role === 'USER' ? 'text-slate-400' : 'text-emerald-500'}`}>
                  {msg.role === 'USER' ? 'Bạn' : 'Hội đồng xét xử'}
                </span>
              </div>
              <div className={`max-w-[90%] lg:max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                msg.role === 'USER' 
                  ? 'bg-emerald-600 text-white rounded-tr-sm' 
                  : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-sm'
              }`}>
                {msg.role === 'JUDGE' && <Shield size={14} className="text-amber-500 mb-2 opacity-50 inline-block mr-2" />}
                <span className="whitespace-pre-wrap">{msg.text}</span>
              </div>
            </div>
          ))}
          {loading && (
             <div className="flex flex-col items-start">
               <div className="max-w-[80%] p-4 rounded-2xl bg-slate-800 text-slate-400 border border-slate-700 rounded-tl-sm text-sm flex items-center gap-3">
                 <Loader2 className="w-4 h-4 animate-spin" /> Đang xem xét lập luận...
               </div>
             </div>
          )}
          <div ref={transcriptEndRef} />
        </div>

        {/* Controls Area Compact */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 shrink-0">
          <div className="relative flex items-center gap-2">
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className={`p-3 shrink-0 rounded-xl transition-colors border ${isMuted ? 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
              title={isMuted ? "Mở Mic" : "Tắt Mic"}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={loading}
              placeholder="Hoặc gõ lập luận của bạn tại đây..."
              className="flex-1 bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder-slate-500 disabled:opacity-50"
            />
            <button 
              onClick={handleSendMessage}
              disabled={loading || !inputText.trim()}
              className="p-3 shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors disabled:opacity-50 disabled:bg-slate-800 flex items-center justify-center shadow-lg shadow-emerald-600/20"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT PANE: Evidence */}
      <div className="hidden lg:flex w-1/4 border-l border-slate-800 bg-slate-950 flex-col relative">
        <input ref={fileInputRef} type="file" accept=".txt,.doc,.docx,.pdf" className="hidden" onChange={handleFileUpload} />
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-slate-400" />
            <h3 className="font-semibold text-slate-200">Tài Liệu</h3>
          </div>
          {!isDemoMode && (
            <button onClick={() => fileInputRef.current?.click()} className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors" title="Tải lên tài liệu">
              <Upload className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {displayDocs.length === 0 ? (
            <div className="text-center mt-10 p-5 border border-slate-800 border-dashed rounded-xl bg-slate-900/30">
              <FileText className="w-8 h-8 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm mb-4">Chưa có tài liệu nào cho vụ án này.</p>
              {!isDemoMode && (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 w-full"
                >
                  <Upload className="w-4 h-4" /> Tải lên tài liệu
                </button>
              )}
            </div>
          ) : displayDocs.map((doc) => (
              <div key={doc.id} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden transition-all duration-200">
              <button 
                onClick={() => setExpandedDocId(expandedDocId === doc.id ? null : doc.id)}
                className="w-full text-left p-3 flex items-start justify-between hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex gap-3">
                  <FileText className={`w-4 h-4 mt-0.5 shrink-0 ${doc.type === 'contract' ? 'text-blue-400' : doc.type === 'policy' ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span className="text-sm font-medium text-slate-200 line-clamp-2 leading-tight">{doc.title}</span>
                </div>
                {expandedDocId === doc.id ? (
                  <ChevronUp className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                )}
              </button>
              
              {expandedDocId === doc.id && (
                <div className="px-3 pb-3 pt-1 text-xs text-slate-400 bg-slate-900/50 border-t border-slate-700/50 leading-relaxed">
                  <p>{doc.excerpt}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
    );
  };

  return (
    <div className="h-full w-full">
      {trialState === 'setup' && renderSetup()}
      {trialState === 'active' && renderActive()}
      {trialState === 'report' && renderReport()}
    </div>
  );
};

export default MockTrial;
