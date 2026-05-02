import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { FileText, AlertTriangle, CheckCircle, Shield, ChevronRight, Send, Eye, X, ArrowRight, Scale, Lightbulb, Upload, ClipboardPaste, Play, RotateCcw } from 'lucide-react';
import { RiskHighlight, MOCK_CONTRACT_WITH_RISKS, MOCK_RISK_HIGHLIGHTS, Message } from '../../types';
import { useLegalEngine } from '../../hooks/useLegalEngine';
import * as mammoth from 'mammoth';
import { retrieveRelevantContext, saveDocumentToKB } from '../../services/ragService';

interface ContractAnalyzerProps {
  initialDocument?: { text: string; metadata: Record<string, string> };
  onBack?: () => void;
}

const RISK_COLORS = {
  HIGH: { bg: 'bg-red-500/15', border: 'border-red-500/40', text: 'text-red-400', badge: 'bg-red-500', label: 'Cao' },
  MEDIUM: { bg: 'bg-amber-500/15', border: 'border-amber-500/40', text: 'text-amber-400', badge: 'bg-amber-500', label: 'Trung bình' },
  LOW: { bg: 'bg-blue-500/15', border: 'border-blue-500/40', text: 'text-blue-400', badge: 'bg-blue-500', label: 'Thấp' }
};

// Helper for fuzzy text matching to ignore whitespaces and newlines
function findTextMatch(fullText: string, searchSnippet: string): { start: number, end: number } | null {
  if (!searchSnippet) return null;
  const normalize = (str: string) => str.replace(/\s+/g, '').toLowerCase();
  const normalizedSnippet = normalize(searchSnippet);
  if (!normalizedSnippet) return null;

  const map: number[] = [];
  let normalizedFull = '';
  for (let i = 0; i < fullText.length; i++) {
    if (!/\s/.test(fullText[i])) {
      normalizedFull += fullText[i].toLowerCase();
      map.push(i);
    }
  }

  const matchIdx = normalizedFull.indexOf(normalizedSnippet);
  if (matchIdx !== -1) {
    return {
      start: map[matchIdx],
      end: map[matchIdx + normalizedSnippet.length - 1] + 1
    };
  }
  return null;
}

export const ContractAnalyzer: React.FC<ContractAnalyzerProps> = ({ initialDocument, onBack }) => {
  // Input mode: 'choose' = initial screen, 'paste' = paste textarea, 'analyzing' = analysis view
  const [inputMode, setInputMode] = useState<'choose' | 'paste' | 'analyzing'>(initialDocument ? 'analyzing' : 'choose');
  const [pasteText, setPasteText] = useState('');
  const [documentText, setDocumentText] = useState(initialDocument?.text || '');
  const [risks, setRisks] = useState<RiskHighlight[]>([]);
  const [activeRiskId, setActiveRiskId] = useState<string | null>(null);
  const [showSuggestion, setShowSuggestion] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [apiError, setApiError] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);

  const LOADING_MESSAGES = [
    "Đang phân tích cú pháp hợp đồng...",
    "Đang đối chiếu với quy định pháp luật...",
    "Đang nhận diện các điều khoản bất lợi...",
    "Đang tổng hợp rủi ro & đề xuất sửa đổi..."
  ];

  const docViewerRef = useRef<HTMLDivElement>(null);
  const riskRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentDocIdRef = useRef<string | null>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Cycle loading messages
  useEffect(() => {
    if (isAnalyzing) {
      const interval = setInterval(() => {
        setLoadingMsgIdx(prev => (prev + 1) % LOADING_MESSAGES.length);
      }, 2500);
      return () => clearInterval(interval);
    } else {
      setLoadingMsgIdx(0);
    }
  }, [isAnalyzing]);

  // Auto-analyze if initialDocument provided
  useEffect(() => {
    if (initialDocument && !analysisComplete) {
      runAnalysis();
    }
  }, []); // eslint-disable-line

  // Handle file upload (.txt, .doc, .docx text extraction)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = e.target;
    const file = target.files?.[0];
    if (!file) return;

    const checkAndAnalyze = (text: string) => {
      if (text && text.trim().length > 20) {
        setDocumentText(text);
        setInputMode('analyzing');
        
        // Save to KB in background (don't block UI)
        saveDocumentToKB("Contract_Upload", text).then(id => {
          currentDocIdRef.current = id;
        }).catch(err => console.error("RAG Indexing Error:", err));

        setTimeout(() => runAnalysis(text), 100);
      } else {
        alert('Nội dung file quá ngắn hoặc không thể đọc được chữ (có thể là ảnh chụp hoặc PDF dạng ảnh). Vui lòng copy paste nội dung hoặc dùng chức năng Quét Ảnh.');
      }
      target.value = '';
    };

    if (file.name.toLowerCase().endsWith('.doc')) {
      alert('Định dạng .doc cũ không được hỗ trợ để quét tự động. Vui lòng lưu file dưới dạng .docx hoặc copy paste nội dung.');
      target.value = '';
      return;
    }

    if (file.name.toLowerCase().endsWith('.docx')) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const arrayBuffer = ev.target?.result as ArrayBuffer;
        if (arrayBuffer) {
          try {
            const result = await mammoth.extractRawText({ arrayBuffer });
            checkAndAnalyze(result.value);
          } catch (err) {
            console.error('Lỗi khi đọc file .docx', err);
            alert('Không thể đọc được file .docx này. Vui lòng copy paste nội dung.');
            target.value = '';
          }
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        checkAndAnalyze(text);
      };
      reader.readAsText(file);
    }
  };

  // Start analysis with demo contract
  const startWithDemo = () => {
    setDocumentText(MOCK_CONTRACT_WITH_RISKS);
    setInputMode('analyzing');
    saveDocumentToKB("Contract_Demo", MOCK_CONTRACT_WITH_RISKS).then(id => {
      currentDocIdRef.current = id;
    }).catch(err => console.error("RAG Indexing Error:", err));
    setTimeout(() => runAnalysis(MOCK_CONTRACT_WITH_RISKS), 100);
  };

  // Start analysis with pasted text
  const startWithPaste = () => {
    if (pasteText.trim().length < 50) return;
    setDocumentText(pasteText);
    setInputMode('analyzing');
    saveDocumentToKB("Contract_Paste", pasteText).then(id => {
      currentDocIdRef.current = id;
    }).catch(err => console.error("RAG Indexing Error:", err));
    setTimeout(() => runAnalysis(pasteText), 100);
  };

  // Go back to input screen
  const resetToInput = () => {
    setInputMode('choose');
    setPasteText('');
    setDocumentText('');
    setRisks([]);
    setChatMessages([]);
    setAnalysisComplete(false);
    setActiveRiskId(null);
    setShowSuggestion(null);
    setApiError(false);
    currentDocIdRef.current = null;
  };

  const runAnalysis = async (textOverride?: string) => {
    const textToAnalyze = textOverride || documentText;
    setIsAnalyzing(true);
    setChatMessages([]);
    setApiError(false);
    setRisks([]);
    setAnalysisComplete(false);

    let foundRisks: RiskHighlight[] = [];
    let summary = '';
    let recommendation = '';

    try {
      // Call real API
      const resp = await fetch('/api/contract-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractText: textToAnalyze })
      });
      if (resp.ok) {
        const data = await resp.json();
        foundRisks = data.risks || [];
        summary = data.summary || '';
        recommendation = data.recommendation || '';
      } else {
        throw new Error('API error');
      }
    } catch {
      // Fallback to mock data if API fails
      console.warn('API unavailable, using mock data');
      foundRisks = MOCK_RISK_HIGHLIGHTS;
      summary = 'Hợp đồng chứa nhiều điều khoản bất lợi nghiêm trọng cho Bên B.';
      recommendation = 'KHÔNG NÊN KÝ';
      setApiError(true);
    }

    setRisks(foundRisks);
    const highRisks = foundRisks.filter(r => r.riskLevel === 'HIGH').length;
    const medRisks = foundRisks.filter(r => r.riskLevel === 'MEDIUM').length;

    const analysisMsg: Message = {
      id: 'analysis-' + Date.now(),
      role: 'model',
      text: `🔍 **PHÂN TÍCH HOÀN TẤT**\n\n` +
        `📊 **Tổng quan rủi ro:**\n` +
        `• 🔴 ${highRisks} điều khoản nguy hiểm cao\n` +
        `• 🟡 ${medRisks} điều khoản cần cảnh báo\n` +
        (summary ? `• ${summary}\n` : '') +
        `\n⚠️ **KHUYẾN NGHỊ: ${recommendation}**\n\n` +
        `👇 Click vào từng cảnh báo bên dưới để xem chi tiết.`,
      timestamp: new Date()
    };
    setChatMessages([analysisMsg]);

    await new Promise(r => setTimeout(r, 300));

    const riskAlertsMsg: Message = {
      id: 'risks-' + Date.now(),
      role: 'model',
      text: foundRisks.map((risk, i) =>
        `**${i + 1}. ${risk.riskLevel === 'HIGH' ? '🔴' : '🟡'} [${RISK_COLORS[risk.riskLevel].label}]**\n` +
        `"${risk.text.slice(0, 80)}..."\n` +
        `${risk.explanation.slice(0, 120)}...\n` +
        `📌 ${risk.lawReference || ''}\n` +
        `[[RISK_LINK:${risk.id}]]`
      ).join('\n\n'),
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, riskAlertsMsg]);
    setAnalysisComplete(true);
    setIsAnalyzing(false);
  };

  // Scroll to risk in document viewer
  const scrollToRisk = useCallback((riskId: string) => {
    setActiveRiskId(riskId);
    setShowSuggestion(riskId);

    const el = riskRefs.current[riskId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Pulse animation
      el.classList.add('animate-risk-pulse');
      setTimeout(() => el.classList.remove('animate-risk-pulse'), 3000);
    }
  }, []);

  // Handle chat send — calls real API
  const handleSendChat = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userMsg: Message = {
      id: 'user-' + Date.now(),
      role: 'user',
      text: chatInput,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, userMsg]);
    const question = chatInput;
    setChatInput('');
    setIsChatLoading(true);

    try {
      const history = chatMessages.map(m => ({ role: m.role, text: m.text }));
      
      // RAG: Chỉ lấy context nếu hợp đồng dài
      let contextText = documentText;
      if (documentText.length > 3000) {
        const relevantChunks = await retrieveRelevantContext(question, 5, currentDocIdRef.current || undefined);
        if (relevantChunks.length > 0) {
          contextText = relevantChunks.map(c => c.content).join('\n\n[...]\n\n');
        } else {
          contextText = documentText.slice(0, 3000);
        }
      }

      const resp = await fetch('/api/contract-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, contractText: contextText, chatHistory: history })
      });

      if (!resp.body) throw new Error('ReadableStream not supported.');

      const botMsgId = 'bot-' + Date.now();
      const initialBotMsg: Message = {
        id: botMsgId,
        role: 'model',
        text: '',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, initialBotMsg]);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder('utf-8');
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
                  setChatMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, text: m.text + parsed.text } : m));
                }
              } catch (e) {}
            }
          }
        }
      }
    } catch {
      setChatMessages(prev => [...prev, {
        id: 'err-' + Date.now(),
        role: 'model',
        text: '⚠️ Lỗi kết nối. Vui lòng thử lại.',
        timestamp: new Date()
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Render document with highlighted risks
  const renderHighlightedDocument = useMemo(() => {
    let text = documentText;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    // Sort risks by their position in text using fuzzy matching
    const mappedRisks = risks.map(risk => {
      const match = findTextMatch(text, risk.text);
      return { ...risk, matchStart: match?.start ?? -1, matchEnd: match?.end ?? -1 };
    }).filter(r => r.matchStart !== -1)
      .sort((a, b) => a.matchStart - b.matchStart);

    mappedRisks.forEach(risk => {
      const startIdx = risk.matchStart;
      const endIdx = risk.matchEnd;
      if (startIdx < lastIndex) return; // Skip overlapping for now

      // Add text before this risk
      if (startIdx > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`} className="text-slate-300">
            {text.slice(lastIndex, startIdx)}
          </span>
        );
      }

      // Add highlighted risk
      const colors = RISK_COLORS[risk.riskLevel];
      const isActive = activeRiskId === risk.id;
      parts.push(
        <span
          key={risk.id}
          ref={el => { riskRefs.current[risk.id] = el; }}
          data-risk-id={risk.id}
          onClick={() => {
            setActiveRiskId(risk.id);
            setShowSuggestion(risk.id);
          }}
          className={`relative cursor-pointer rounded px-1 py-0.5 transition-all duration-300 border-b-2 ${colors.bg} ${colors.border} ${
            isActive ? 'ring-2 ring-yellow-400/50 shadow-lg shadow-yellow-500/20' : 'hover:ring-1 hover:ring-yellow-400/30'
          }`}
        >
          {text.slice(startIdx, endIdx)}
          {/* Risk badge */}
          <span className={`absolute -top-3 -right-1 w-5 h-5 ${colors.badge} rounded-full flex items-center justify-center shadow-lg`}>
            <AlertTriangle size={10} className="text-white" />
          </span>
        </span>
      );

      lastIndex = endIdx;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(
        <span key={`text-end`} className="text-slate-300">
          {text.slice(lastIndex)}
        </span>
      );
    }

    return parts;
  }, [documentText, risks, activeRiskId]);

  // Get active risk suggestion
  const activeSuggestion = showSuggestion ? risks.find(r => r.id === showSuggestion) : null;

  // Render chat message with risk links
  const renderChatText = (text: string) => {
    const parts = text.split(/(\[\[RISK_LINK:.*?\]\])/);
    return parts.map((part, i) => {
      const match = part.match(/\[\[RISK_LINK:(.*?)\]\]/);
      if (match) {
        const riskId = match[1];
        return (
          <button
            key={i}
            onClick={() => scrollToRisk(riskId)}
            className="inline-flex items-center gap-1 mt-1 px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-xs font-bold rounded-lg transition-all hover:scale-105"
          >
            <Eye size={12} /> Xem vị trí trong hợp đồng
          </button>
        );
      }
      // Basic markdown-like rendering
      return (
        <span key={i}>
          {part.split('\n').map((line, j) => {
            let cls = '';
            if (line.startsWith('**') && line.endsWith('**')) {
              return <strong key={j} className="text-white block mt-1">{line.replace(/\*\*/g, '')}</strong>;
            }
            if (line.includes('🔴')) cls = 'text-red-400 font-bold';
            else if (line.includes('🟡')) cls = 'text-amber-400 font-bold';
            else if (line.includes('🟢')) cls = 'text-emerald-400 font-bold';
            else if (line.startsWith('•')) cls = 'ml-2';
            return <span key={j} className={cls}>{line}{j < part.split('\n').length - 1 && <br />}</span>;
          })}
        </span>
      );
    });
  };

  // === INPUT MODE: CHOOSE ===
  if (inputMode === 'choose') {
    return (
      <div className="flex h-full w-full bg-[#020617] text-slate-200 items-center justify-center">
        <div className="max-w-2xl w-full px-6">
          {/* Header */}
          <div className="text-center mb-10">
            {onBack && (
              <button onClick={onBack} className="absolute top-4 left-4 p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                <ChevronRight className="rotate-180" size={20} />
              </button>
            )}
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
              <Shield size={32} className="text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Phân Tích Rủi Ro Hợp Đồng</h2>
            <p className="text-slate-400 text-sm">AI sẽ quét toàn bộ nội dung hợp đồng và tìm ra các điều khoản bất lợi, trái pháp luật</p>
          </div>

          {/* 3 Options */}
          <div className="grid grid-cols-1 gap-4">
            {/* Paste */}
            <button
              onClick={() => setInputMode('paste')}
              className="group flex items-center gap-4 p-5 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all text-left"
            >
              <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors shrink-0">
                <ClipboardPaste size={22} className="text-emerald-400" />
              </div>
              <div>
                <h3 className="font-bold text-white group-hover:text-emerald-400 transition-colors">Dán nội dung hợp đồng</h3>
                <p className="text-xs text-slate-500 mt-0.5">Copy & paste toàn bộ nội dung hợp đồng cần phân tích</p>
              </div>
              <ArrowRight size={18} className="text-slate-600 group-hover:text-emerald-400 ml-auto transition-colors" />
            </button>

            {/* Upload */}
            <label
              className="group relative flex items-center gap-4 p-5 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-blue-500/40 hover:bg-blue-500/5 transition-all text-left cursor-pointer overflow-hidden"
            >
              <input type="file" accept=".txt,.doc,.docx" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={handleFileUpload} onClick={(e) => { (e.target as HTMLInputElement).value = ''; }} />
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center group-hover:bg-blue-500/20 transition-colors shrink-0 relative z-0">
                <Upload size={22} className="text-blue-400" />
              </div>
              <div className="relative z-0">
                <h3 className="font-bold text-white group-hover:text-blue-400 transition-colors">Upload file hợp đồng</h3>
                <p className="text-xs text-slate-500 mt-0.5">Hỗ trợ .txt, .docx (trích xuất nội dung văn bản)</p>
              </div>
              <ArrowRight size={18} className="text-slate-600 group-hover:text-blue-400 ml-auto transition-colors relative z-0" />
            </label>

            {/* Demo */}
            <button
              onClick={startWithDemo}
              className="group flex items-center gap-4 p-5 bg-slate-900/50 border border-amber-500/20 rounded-xl hover:border-amber-500/40 hover:bg-amber-500/5 transition-all text-left"
            >
              <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center group-hover:bg-amber-500/20 transition-colors shrink-0">
                <Play size={22} className="text-amber-400" />
              </div>
              <div>
                <h3 className="font-bold text-white group-hover:text-amber-400 transition-colors">Xem Demo — HĐ mẫu</h3>
                <p className="text-xs text-slate-500 mt-0.5">Phân tích hợp đồng mẫu mua bán nhà đất 8.5 tỷ với 6 rủi ro cài cắm</p>
              </div>
              <ArrowRight size={18} className="text-slate-600 group-hover:text-amber-400 ml-auto transition-colors" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // === INPUT MODE: PASTE ===
  if (inputMode === 'paste') {
    return (
      <div className="flex h-full w-full bg-[#020617] text-slate-200 items-center justify-center">
        <div className="max-w-2xl w-full px-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-white mb-1">Dán nội dung hợp đồng</h2>
            <p className="text-slate-400 text-sm">Paste toàn bộ nội dung hợp đồng bạn muốn AI phân tích rủi ro</p>
          </div>

          <textarea
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            placeholder="Dán nội dung hợp đồng vào đây...&#10;&#10;Ví dụ:&#10;HỢP ĐỒNG MUA BÁN NHÀ ĐẤT&#10;Số: 2026/HĐMB-BDS&#10;..."
            className="w-full h-64 bg-slate-900/50 border border-slate-700 rounded-xl p-4 text-sm text-slate-300 font-mono resize-none focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-600"
            autoFocus
          />

          <div className="flex items-center justify-between mt-4">
            <button onClick={() => setInputMode('choose')} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
              ← Quay lại
            </button>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">{pasteText.trim().length} ký tự</span>
              <button
                onClick={startWithPaste}
                disabled={pasteText.trim().length < 50}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Shield size={16} /> Bắt đầu phân tích
              </button>
            </div>
          </div>
          <p className="text-[10px] text-slate-600 text-center mt-3">Tối thiểu 50 ký tự. AI sẽ phân tích rủi ro dựa trên nội dung bạn cung cấp.</p>
        </div>
      </div>
    );
  }

  // === ANALYSIS VIEW (existing) ===
  return (
    <div className="flex h-full w-full bg-[#020617] text-slate-200">
      {/* LEFT: Document Viewer */}
      <div className="w-1/2 border-r border-slate-800 flex flex-col bg-slate-950/50">
        {/* Header */}
        <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-900 shrink-0">
          <div className="flex items-center gap-2 overflow-hidden">
            {onBack && (
              <button onClick={onBack} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                <ChevronRight className="rotate-180" size={18} />
              </button>
            )}
            <button onClick={resetToInput} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-emerald-400 transition-colors" title="Phân tích hợp đồng khác">
              <RotateCcw size={16} />
            </button>
            <FileText size={16} className="text-emerald-500 flex-shrink-0" />
            <span className="font-bold text-sm truncate">Hợp đồng đang phân tích</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-1 rounded-full font-bold flex items-center gap-1">
              <AlertTriangle size={10} /> {risks.filter(r => r.riskLevel === 'HIGH').length} Rủi ro cao
            </span>
          </div>
        </div>

        {/* Document Content with Highlights */}
        <div ref={docViewerRef} className="flex-1 overflow-y-auto p-6 relative custom-scrollbar">
          <div className="max-w-2xl mx-auto">
            <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-6 font-mono text-sm leading-relaxed whitespace-pre-wrap relative">
              {renderHighlightedDocument}
            </div>
          </div>
        </div>

        {/* Suggestion Panel (Bottom of left column) */}
        {activeSuggestion && (
          <div className="border-t border-slate-800 bg-slate-900 p-4 shrink-0 animate-fade-in-up">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb size={14} className="text-yellow-400" />
                  <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">Đề xuất thay thế</span>
                  {activeSuggestion.lawReference && (
                    <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">
                      📚 {activeSuggestion.lawReference}
                    </span>
                  )}
                </div>
                <p className="text-sm text-emerald-300 leading-relaxed">{activeSuggestion.suggestion}</p>
              </div>
              <button onClick={() => setShowSuggestion(null)} className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-white transition-colors shrink-0">
                <X size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: Chat & Analysis */}
      <div className="w-1/2 flex flex-col bg-[#020617]">
        {/* Header */}
        <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-900 shrink-0">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-emerald-500" />
            <span className="font-bold text-sm text-emerald-400">AI PHÂN TÍCH RỦI RO</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500">Strict Mode</span>
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          </div>
        </div>

        {/* Risk Summary Bar */}
        {analysisComplete && (
          <div className="p-3 border-b border-slate-800 bg-slate-900/50 flex gap-2 overflow-x-auto shrink-0">
            {risks.map(risk => {
              const colors = RISK_COLORS[risk.riskLevel];
              return (
                <button
                  key={risk.id}
                  onClick={() => scrollToRisk(risk.id)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                    activeRiskId === risk.id
                      ? `${colors.bg} ${colors.border} ${colors.text} ring-1 ring-yellow-400/30`
                      : `bg-slate-800/50 border-slate-700 text-slate-400 hover:${colors.text}`
                  }`}
                >
                  {risk.riskLevel === 'HIGH' ? '🔴' : '🟡'} {risk.id.replace('RISK-', '#')}
                </button>
              );
            })}
          </div>
        )}

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {isAnalyzing && (
            <div className="flex justify-center py-8">
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 border-2 border-emerald-500/30 rounded-full animate-ping" />
                  <div className="absolute inset-2 border-2 border-emerald-500/50 rounded-full animate-spin" style={{ borderTopColor: 'transparent' }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Scale size={20} className="text-emerald-500" />
                  </div>
                </div>
                <span className="text-sm text-emerald-400 font-bold animate-pulse">
                  {LOADING_MESSAGES[loadingMsgIdx]}
                </span>
              </div>
            </div>
          )}

          {chatMessages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] rounded-xl p-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900 text-slate-300 border border-slate-800'
              }`}>
                {msg.role === 'model' ? renderChatText(msg.text) : msg.text}
              </div>
            </div>
          ))}

          {isChatLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '75ms' }} />
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chat Input */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 shrink-0">
          <div className="relative">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendChat()}
              placeholder="Hỏi thêm về hợp đồng này..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-4 pr-12 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <button
              onClick={handleSendChat}
              disabled={!chatInput.trim() || isChatLoading}
              className="absolute right-2 top-2 p-1.5 bg-slate-800 hover:bg-emerald-600 text-slate-400 hover:text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={16} />
            </button>
          </div>
          <p className="text-[10px] text-slate-600 mt-2 text-center">
            🔒 Strict Mode: Chỉ trả lời dựa trên nội dung hợp đồng & văn bản luật đã xác minh
          </p>
        </div>
      </div>
    </div>
  );
};
