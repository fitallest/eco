import React, { useState, useRef, useEffect } from 'react';
import { FileText, AlertTriangle, CheckCircle, Search, Upload, X, Paperclip, File, History, MessageSquare, Send, Trash2, ChevronRight } from 'lucide-react';
import { sendMessageToGemini } from '../../services/geminiService';
import { Message } from '../../types';

interface ContractAnalysis {
  id: string;
  title: string;
  date: string;
  type: 'FILE' | 'TEXT';
  content: string; // The text content or file name
  fileData?: string; // Base64 data for files
  mimeType?: string;
  analysisResult: string;
  chatHistory: Message[];
}

export const DocumentAnalyzer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ANALYZE' | 'HISTORY'>('ANALYZE');
  const [text, setText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ name: string; type: string; data: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // History & Chat State
  const [history, setHistory] = useState<ContractAnalysis[]>([]);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
        alert('Hiện tại hệ thống chỉ hỗ trợ phân tích file PDF hoặc Hình ảnh.');
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        
        setSelectedFile({
            name: file.name,
            type: file.type,
            data: base64Data
        });
        setText(''); 
    };
    reader.readAsDataURL(file);
  };

  const clearSelectedFile = () => {
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAnalyze = async () => {
    if (!text.trim() && !selectedFile) return;
    setIsAnalyzing(true);
    setChatMessages([]);
    setCurrentAnalysisId(null);
    
    try {
      let prompt = '';
      let attachment = undefined;

      if (selectedFile) {
          prompt = `
          [YÊU CẦU PHÂN TÍCH TÀI LIỆU ĐÍNH KÈM]
          Người dùng đã tải lên một tài liệu: "${selectedFile.name}".
          
          VAI TRÒ CỦA BẠN:
          Bạn là một Chuyên gia Pháp chế Cao cấp (Senior Legal Compliance Officer) với 20 năm kinh nghiệm. Nhiệm vụ của bạn là bảo vệ quyền lợi tối đa cho người dùng (bên yếu thế).
          
          NHIỆM VỤ PHÂN TÍCH:
          1. **Xác định loại văn bản & Mục đích**: Đây là hợp đồng gì? (Lao động, Thuê nhà, Vay tiền...).
          2. **Quét Rủi Ro (Risk Assessment)**: Tìm các điều khoản bất lợi, gài bẫy, hoặc vi phạm pháp luật (Bộ luật Dân sự 2015, Luật Thương mại, Luật Lao động...).
             - 🔴 **RỦI RO CAO (Nguy hiểm)**: Các điều khoản khiến người dùng mất tiền, mất quyền lợi nghiêm trọng hoặc trái luật.
             - 🟡 **CẢNH BÁO (Cần lưu ý)**: Các điều khoản mập mờ, dễ gây tranh chấp.
             - 🟢 **ĐIỂM TỐT**: Các điều khoản bảo vệ tốt quyền lợi.
          3. **Đề xuất Sửa đổi (Actionable Advice)**: Với mỗi rủi ro, hãy đề xuất cách sửa lại câu chữ cụ thể để an toàn hơn.
          
          HÃY TRÌNH BÀY RÕ RÀNG, DÙNG ICON ĐỂ ĐÁNH DẤU MỨC ĐỘ RỦI RO. TRÍCH DẪN ĐIỀU LUẬT CỤ THỂ NẾU CÓ THỂ.
          QUAN TRỌNG: Hãy dùng cú pháp ==nội dung cần chú ý== để BÔI VÀNG các từ khóa quan trọng hoặc trích dẫn điều khoản rủi ro từ văn bản gốc.
          `;
          attachment = {
              mimeType: selectedFile.type,
              data: selectedFile.data
          };
      } else {
          prompt = `
          [YÊU CẦU PHÂN TÍCH HỢP ĐỒNG/VĂN BẢN PHÁP LÝ CHUYÊN SÂU]
          
          Văn bản cần phân tích:
          """
          ${text}
          """
          
          VAI TRÒ CỦA BẠN:
          Bạn là một Chuyên gia Pháp chế Cao cấp (Senior Legal Compliance Officer) với 20 năm kinh nghiệm. Nhiệm vụ của bạn là bảo vệ quyền lợi tối đa cho người dùng (bên yếu thế).
          
          NHIỆM VỤ PHÂN TÍCH:
          1. **Xác định loại văn bản & Mục đích**: Đây là hợp đồng gì? (Lao động, Thuê nhà, Vay tiền...).
          2. **Quét Rủi Ro (Risk Assessment)**: Tìm các điều khoản bất lợi, gài bẫy, hoặc vi phạm pháp luật (Bộ luật Dân sự 2015, Luật Thương mại, Luật Lao động...).
             - 🔴 **RỦI RO CAO (Nguy hiểm)**: Các điều khoản khiến người dùng mất tiền, mất quyền lợi nghiêm trọng hoặc trái luật.
             - 🟡 **CẢNH BÁO (Cần lưu ý)**: Các điều khoản mập mờ, dễ gây tranh chấp.
             - 🟢 **ĐIỂM TỐT**: Các điều khoản bảo vệ tốt quyền lợi.
          3. **Đề xuất Sửa đổi (Actionable Advice)**: Với mỗi rủi ro, hãy đề xuất cách sửa lại câu chữ cụ thể để an toàn hơn.
          
          HÃY TRÌNH BÀY RÕ RÀNG, DÙNG ICON ĐỂ ĐÁNH DẤU MỨC ĐỘ RỦI RO. TRÍCH DẪN ĐIỀU LUẬT CỤ THỂ NẾU CÓ THỂ.
          QUAN TRỌNG: Hãy dùng cú pháp ==nội dung cần chú ý== để BÔI VÀNG các từ khóa quan trọng hoặc trích dẫn điều khoản rủi ro từ văn bản gốc.
          `;
      }
      
      const response = await sendMessageToGemini(prompt, [], 'GENERAL', 'DEEP', undefined, 'Gold', attachment);
      
      const initialMessage: Message = {
          id: Date.now().toString(),
          role: 'model',
          text: response.text,
          timestamp: new Date()
      };

      const newAnalysis: ContractAnalysis = {
          id: Date.now().toString(),
          title: selectedFile ? selectedFile.name : (text.slice(0, 30) + '...'),
          date: new Date().toLocaleString(),
          type: selectedFile ? 'FILE' : 'TEXT',
          content: selectedFile ? selectedFile.name : text,
          fileData: selectedFile ? selectedFile.data : undefined,
          mimeType: selectedFile ? selectedFile.type : undefined,
          analysisResult: response.text,
          chatHistory: [initialMessage]
      };

      setHistory(prev => [newAnalysis, ...prev]);
      setCurrentAnalysisId(newAnalysis.id);
      setChatMessages([initialMessage]);

    } catch (error) {
      alert("Lỗi khi phân tích. Vui lòng thử lại.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendMessage = async () => {
      if (!chatInput.trim() || !currentAnalysisId) return;
      
      const userMsg: Message = {
          id: Date.now().toString(),
          role: 'user',
          text: chatInput,
          timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, userMsg]);
      setChatInput('');
      setIsChatting(true);

      try {
          // Find current analysis context
          const currentAnalysis = history.find(h => h.id === currentAnalysisId);
          if (!currentAnalysis) return;

          const contextPrompt = `
          [CONTEXT: ĐANG THẢO LUẬN VỀ VĂN BẢN ĐÃ PHÂN TÍCH]
          Văn bản: ${currentAnalysis.type === 'TEXT' ? currentAnalysis.content : currentAnalysis.title}
          Kết quả phân tích trước đó: ${currentAnalysis.analysisResult}
          
          Câu hỏi của người dùng: "${chatInput}"
          
          Hãy trả lời câu hỏi của người dùng dựa trên ngữ cảnh văn bản trên. Giữ vai trò là Chuyên gia Pháp chế.
          `;

          // Prepare attachment if available
          let attachment = undefined;
          if (currentAnalysis.type === 'FILE' && currentAnalysis.fileData && currentAnalysis.mimeType) {
              attachment = {
                  mimeType: currentAnalysis.mimeType,
                  data: currentAnalysis.fileData
              };
          }

          // Map history to Gemini format
          // Skip the first message (Analysis Result) to avoid "Model first" issues and redundancy
          const historyForGemini = chatMessages.slice(1).map(msg => ({
              role: msg.role,
              parts: [{ text: msg.text }]
          }));

          const response = await sendMessageToGemini(contextPrompt, historyForGemini, 'GENERAL', 'DEEP', undefined, 'Gold', attachment);
          
          const botMsg: Message = {
              id: (Date.now() + 1).toString(),
              role: 'model',
              text: response.text,
              timestamp: new Date()
          };

          setChatMessages(prev => [...prev, botMsg]);
          
          // Update history
          setHistory(prev => prev.map(h => {
              if (h.id === currentAnalysisId) {
                  return { ...h, chatHistory: [...h.chatHistory, userMsg, botMsg] };
              }
              return h;
          }));

      } catch (error) {
          console.error(error);
          const errorMsg: Message = {
              id: Date.now().toString(),
              role: 'model',
              text: "⚠️ Lỗi hệ thống: Không thể gửi tin nhắn. Vui lòng thử lại.",
              timestamp: new Date()
          };
          setChatMessages(prev => [...prev, errorMsg]);
      } finally {
          setIsChatting(false);
      }
  };

  const currentAnalysis = history.find(h => h.id === currentAnalysisId);

  // --- RENDER: SPLIT VIEW (DOCUMENT + CHAT) ---
  if (currentAnalysis) {
      return (
          <div className="flex h-full w-full bg-[#020617] text-slate-200">
              {/* LEFT COLUMN: DOCUMENT VIEWER */}
              <div className="w-1/2 border-r border-slate-800 flex flex-col bg-slate-950/50">
                  <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                      <div className="flex items-center gap-2 overflow-hidden">
                          <button onClick={() => setCurrentAnalysisId(null)} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                              <ChevronRight className="rotate-180" size={18}/>
                          </button>
                          <FileText size={16} className="text-emerald-500 flex-shrink-0"/>
                          <span className="font-bold text-sm truncate max-w-[200px]">{currentAnalysis.title}</span>
                      </div>
                      <div className="flex items-center gap-1">
                          {/* Zoom controls could go here */}
                      </div>
                  </div>
                  
                  <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950 relative custom-scrollbar">
                      {/* Grid Background for Viewer */}
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-20 pointer-events-none"></div>
                      
                      {currentAnalysis.type === 'FILE' && currentAnalysis.fileData ? (
                          currentAnalysis.mimeType === 'application/pdf' ? (
                              <iframe 
                                  src={`data:application/pdf;base64,${currentAnalysis.fileData}`} 
                                  className="w-full h-full rounded-lg shadow-2xl border border-slate-800"
                                  title="PDF Viewer"
                              />
                          ) : (
                              <img 
                                  src={`data:${currentAnalysis.mimeType};base64,${currentAnalysis.fileData}`} 
                                  alt="Document" 
                                  className="max-w-none transition-transform duration-200 shadow-2xl border border-slate-800 rounded-lg max-h-full object-contain"
                              />
                          )
                      ) : (
                          <div className="w-full h-full bg-slate-900 p-6 rounded-lg font-mono text-sm whitespace-pre-wrap overflow-auto border border-slate-800 shadow-inner">
                              {currentAnalysis.content}
                          </div>
                      )}
                  </div>
              </div>

              {/* RIGHT COLUMN: CHAT & ANALYSIS */}
              <div className="w-1/2 flex flex-col bg-[#020617]">
                  <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                      <div className="flex items-center gap-2">
                          <CheckCircle size={16} className="text-emerald-500"/>
                          <span className="font-bold text-sm text-emerald-400">KẾT QUẢ & THẢO LUẬN</span>
                      </div>
                      <div className="text-xs text-slate-500">Powered by Gemini Pro</div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                      {chatMessages.map((msg, idx) => (
                          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[90%] rounded-xl p-3 text-sm whitespace-pre-wrap leading-relaxed ${
                                  msg.role === 'user' 
                                  ? 'bg-emerald-600 text-white' 
                                  : 'bg-slate-900 text-slate-300 border border-slate-800'
                              }`}>
                                  {msg.role === 'model' ? (
                                      <div>
                                          {msg.text.split('\n').map((line, i) => {
                                              let className = '';
                                              if (line.startsWith('#')) className = 'font-bold text-white mt-4 mb-2 text-base';
                                              else if (line.includes('🔴')) className = 'text-red-400 font-bold mt-2';
                                              else if (line.includes('🟡')) className = 'text-amber-400 font-bold mt-2';
                                              else if (line.includes('🟢')) className = 'text-emerald-400 font-bold mt-2';
                                              
                                              const parts = line.split('==');
                                              return (
                                                  <div key={i} className={className}>
                                                      {parts.map((part, index) => {
                                                          if (index % 2 === 1) {
                                                              return <span key={index} className="bg-yellow-500/20 text-yellow-200 px-1 rounded mx-0.5 border border-yellow-500/30 font-semibold">{part}</span>;
                                                          }
                                                          return part;
                                                      })}
                                                  </div>
                                              );
                                          })}
                                      </div>
                                  ) : (
                                      msg.text
                                  )}
                              </div>
                          </div>
                      ))}
                      {isChatting && (
                          <div className="flex justify-start">
                              <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 flex items-center gap-2">
                                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
                                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-75"></div>
                                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-150"></div>
                              </div>
                          </div>
                      )}
                      <div ref={chatEndRef} />
                  </div>

                  <div className="p-4 border-t border-slate-800 bg-slate-900">
                      <div className="relative">
                          <input
                              type="text"
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                              placeholder="Hỏi thêm về hợp đồng này..."
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-4 pr-12 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                          />
                          <button 
                              onClick={handleSendMessage}
                              disabled={!chatInput.trim() || isChatting}
                              className="absolute right-2 top-2 p-1.5 bg-slate-800 hover:bg-emerald-600 text-slate-400 hover:text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              <Send size={16} />
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  // --- RENDER: DEFAULT UPLOAD VIEW ---
  return (
    <div className="flex h-full w-full bg-[#020617] text-slate-200">
      {/* LEFT SIDEBAR: HISTORY */}
      <div className="w-64 border-r border-slate-800 bg-slate-950 flex flex-col">
          <div className="p-4 border-b border-slate-800 font-bold text-slate-400 text-xs uppercase tracking-wider flex items-center gap-2">
              <History size={14}/> Kho Hợp Đồng
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {history.length === 0 ? (
                  <div className="text-center text-slate-600 text-xs py-8 italic">Chưa có tài liệu nào</div>
              ) : (
                  history.map(h => (
                      <button 
                          key={h.id} 
                          onClick={() => {
                              setCurrentAnalysisId(h.id);
                              setChatMessages(h.chatHistory);
                          }}
                          className={`w-full text-left p-3 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all group ${currentAnalysisId === h.id ? 'bg-slate-900 border-emerald-500/50' : ''}`}
                      >
                          <div className={`font-bold text-sm truncate group-hover:text-emerald-400 ${currentAnalysisId === h.id ? 'text-emerald-400' : 'text-slate-300'}`}>{h.title}</div>
                          <div className="text-[10px] text-slate-500 mt-1">{h.date}</div>
                      </button>
                  ))
              )}
          </div>
      </div>

      {/* MAIN CONTENT: UPLOAD FORM */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>
          
          <div className="max-w-2xl w-full z-10">
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 backdrop-blur-sm shadow-2xl">
                  <div className="flex items-center gap-4 mb-6">
                      <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
                          <FileText size={32} />
                      </div>
                      <div>
                          <h2 className="text-2xl font-bold text-white">AI Review Hợp Đồng</h2>
                          <p className="text-slate-400">Tải lên hợp đồng hoặc văn bản pháp lý để AI quét rủi ro.</p>
                      </div>
                  </div>

                  <div className="space-y-6">
                      {/* File Upload Area */}
                      <div 
                          onClick={() => fileInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${selectedFile ? 'border-emerald-500 bg-emerald-500/5' : 'border-slate-700 hover:border-emerald-500/50 hover:bg-slate-800/50'}`}
                      >
                          <input 
                              type="file" 
                              ref={fileInputRef} 
                              className="hidden" 
                              accept="application/pdf,image/*" 
                              onChange={handleFileSelect} 
                          />
                          
                          {selectedFile ? (
                              <div className="flex flex-col items-center gap-3">
                                  <div className="w-16 h-16 bg-slate-800 rounded-xl flex items-center justify-center text-emerald-500 shadow-lg">
                                      <FileText size={32} />
                                  </div>
                                  <div>
                                      <div className="font-bold text-white text-lg">{selectedFile.name}</div>
                                      <div className="text-emerald-400 text-sm font-mono uppercase">{selectedFile.type.split('/')[1]} FILE</div>
                                  </div>
                                  <button 
                                      onClick={(e) => { e.stopPropagation(); clearSelectedFile(); }}
                                      className="mt-2 text-xs text-red-400 hover:text-red-300 hover:underline"
                                  >
                                      Xóa file
                                  </button>
                              </div>
                          ) : (
                              <div className="flex flex-col items-center gap-3 text-slate-400">
                                  <Upload size={32} className="mb-2 opacity-50"/>
                                  <div className="font-medium">Kéo thả file hoặc Click để tải lên</div>
                                  <div className="text-xs opacity-50">Hỗ trợ PDF, JPG, PNG (Max 10MB)</div>
                              </div>
                          )}
                      </div>

                      {/* Text Input Area (Alternative) */}
                      <div className="relative">
                          <div className="absolute -top-3 left-4 bg-slate-900 px-2 text-xs text-slate-500">Hoặc dán nội dung văn bản</div>
                          <textarea
                              value={text}
                              onChange={(e) => setText(e.target.value)}
                              placeholder="Dán nội dung hợp đồng vào đây..."
                              className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm focus:border-emerald-500 focus:outline-none transition-colors resize-none"
                              disabled={!!selectedFile}
                          />
                      </div>

                      <button
                          onClick={handleAnalyze}
                          disabled={isAnalyzing || (!text && !selectedFile)}
                          className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
                      >
                          {isAnalyzing ? (
                              <>
                                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                  Đang Phân Tích...
                              </>
                          ) : (
                              <>
                                  <CheckCircle size={20} />
                                  Quét Rủi Ro Ngay
                              </>
                          )}
                      </button>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};
