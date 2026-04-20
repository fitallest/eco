import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Cpu, Zap, BookOpen, Terminal, Activity, HelpCircle, ArrowDown, ArrowUp, X, AlertTriangle, ChevronDown, Check, LayoutGrid, Edit2, Save, Star, Calendar, FileText, Trash2, Copy, Download, MessageSquare, Plus, Edit3, ChevronLeft, Menu, PanelLeftClose, Paperclip, Mic } from 'lucide-react';
import { Message, AgentStage, UserProfile, AgentType, ResponseStyle, AgentConfig, AGENTS_LIST, MOCK_LAWYERS, LawyerProfile, DocumentTemplate, ChatSession } from '../types';
import { sendMessageToGemini } from '../services/geminiService';
import { MarkdownRenderer } from './MarkdownRenderer';
import { CreditModal } from './CreditModal';
import { BookingModal } from './BookingModal';
import { NewsSection } from './NewsSection';
import { LegalToolsModal } from './LegalToolsModal';
import { DraftDocumentModal } from './DraftDocumentModal';

interface UserChatProps {
  currentUser: UserProfile;
  deductCredit: (amount?: number) => void;
  onCommand: (cmd: string) => void;
  agentConfigs: Record<AgentType, AgentConfig>;
  onTriggerUpgrade: (mode?: 'SUBSCRIPTION' | 'CREDITS') => void;
}

export const UserChat: React.FC<UserChatProps> = ({ currentUser, deductCredit, onCommand, agentConfigs, onTriggerUpgrade }) => {
  // Session State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [processingSessionId, setProcessingSessionId] = useState<string | null>(null);

  // Computed Messages from Current Session
  const messages = useMemo(
    () => currentSessionId
      ? sessions.find(s => s.id === currentSessionId)?.messages ?? []
      : [],
    [sessions, currentSessionId]
  );

  const setMessages = (newMessagesOrUpdater: Message[] | ((prev: Message[]) => Message[])) => {
      if (!currentSessionId) return;
      
      setSessions(prev => prev.map(session => {
          if (session.id === currentSessionId) {
              const newMessages = typeof newMessagesOrUpdater === 'function' 
                  ? newMessagesOrUpdater(session.messages)
                  : newMessagesOrUpdater;
              
              // Auto-update title if it's the first user message and title is default
              let newTitle = session.title;
              if (session.messages.length === 0 && newMessages.length > 0) {
                  const firstMsg = newMessages[0];
                  if (firstMsg.role === 'user') {
                      newTitle = firstMsg.text.slice(0, 30) + (firstMsg.text.length > 30 ? '...' : '');
                  }
              }

              return { ...session, messages: newMessages, title: newTitle, updatedAt: new Date() };
          }
          return session;
      }));
  };

  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ name: string; type: string; data: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type (PDF only for now as requested, but images work too)
    if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
        alert('Hiện tại hệ thống chỉ hỗ trợ phân tích file PDF hoặc Hình ảnh.');
        return;
    }

    // Convert to Base64
    const reader = new FileReader();
    reader.onload = () => {
        const base64String = reader.result as string;
        // Remove data URL prefix (e.g., "data:application/pdf;base64,")
        const base64Data = base64String.split(',')[1];
        
        setSelectedFile({
            name: file.name,
            type: file.type,
            data: base64Data
        });
    };
    reader.readAsDataURL(file);
  };

  const clearSelectedFile = useCallback(() => {
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const [agentStage, setAgentStage] = useState<AgentStage>(AgentStage.IDLE);
  const [showCreditModal, setShowCreditModal] = useState(false);
  
  // isLanding is true if no session is selected OR current session has no messages
  const isLanding = !currentSessionId || messages.length === 0;

  const [selectedAgent, setSelectedAgent] = useState<AgentType>('GENERAL');
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const [responseStyle, setResponseStyle] = useState<ResponseStyle>('CONCISE');
  
  // Drafting Modal State
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [selectedDocForForm, setSelectedDocForForm] = useState<DocumentTemplate | null>(null);
  const [draftFormData, setDraftFormData] = useState<Record<string, string>>({});
  
  // Document Preview Modal State
  const [viewingDocument, setViewingDocument] = useState<{ content: string; title: string } | null>(null);
  
  // Tools Modal State
  const [showToolsModal, setShowToolsModal] = useState(false);

  // Booking Modal State
  const [bookingLawyer, setBookingLawyer] = useState<LawyerProfile | null>(null);

  // Editing State
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editTempText, setEditTempText] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load Sessions from LocalStorage
  useEffect(() => {
    const savedSessions = localStorage.getItem('ECOLAW_CHAT_SESSIONS');
    const legacyHistory = localStorage.getItem('ECOLAW_CHAT_HISTORY');

    if (savedSessions) {
        try {
            const parsed = JSON.parse(savedSessions);
            const hydrated = parsed.map((s: any) => ({
                ...s,
                createdAt: new Date(s.createdAt),
                updatedAt: new Date(s.updatedAt),
                messages: s.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
            }));
            setSessions(hydrated);
            // If there are sessions, select the most recent one
            if (hydrated.length > 0) {
                const mostRecent = hydrated.sort((a: ChatSession, b: ChatSession) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
                setCurrentSessionId(mostRecent.id);
            }
        } catch (e) {
            console.error("Failed to load sessions", e);
        }
    } else if (legacyHistory) {
        // Migration Logic
        try {
            const parsedHistory = JSON.parse(legacyHistory);
            if (parsedHistory.length > 0) {
                const hydratedMsgs = parsedHistory.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
                const legacySession: ChatSession = {
                    id: Date.now().toString(),
                    title: 'Đoạn chat cũ',
                    messages: hydratedMsgs,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                setSessions([legacySession]);
                setCurrentSessionId(legacySession.id);
                localStorage.setItem('ECOLAW_CHAT_SESSIONS', JSON.stringify([legacySession]));
                localStorage.removeItem('ECOLAW_CHAT_HISTORY');
            }
        } catch (e) {
            console.error("Failed to migrate history", e);
        }
    }
  }, []);

  // Save Sessions to LocalStorage (debounced to avoid excessive writes on every keystroke)
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      localStorage.setItem('ECOLAW_CHAT_SESSIONS', JSON.stringify(sessions));
    }, 400);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [sessions]);

  useEffect(() => {
    if (!isLanding) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, agentStage, isLanding]);

  const handleCreateNewSession = useCallback(() => {
      const newSession: ChatSession = {
          id: Date.now().toString(),
          title: 'Đoạn chat mới',
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date()
      };
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
  }, []);

  const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
      e.stopPropagation();
      e.preventDefault();
      if (window.confirm("Xóa đoạn chat này?")) {
          setSessions(prev => {
              const newSessions = prev.filter(s => s.id !== sessionId);
              return newSessions;
          });
          if (currentSessionId === sessionId) {
              setCurrentSessionId(null);
          }
      }
  };

  const handleRenameSession = (e: React.MouseEvent, sessionId: string) => {
      e.stopPropagation();
      e.preventDefault();
      const currentSession = sessions.find(s => s.id === sessionId);
      const newTitle = prompt("Nhập tên mới cho đoạn chat:", currentSession?.title || "");
      if (newTitle !== null && newTitle.trim() !== "") {
          setSessions(prev => prev.map(s => {
              if (s.id === sessionId) return { ...s, title: newTitle.trim() };
              return s;
          }));
      }
  };

  const handleClearHistory = useCallback(() => {
    if (window.confirm("Bạn có chắc chắn muốn xóa TOÀN BỘ lịch sử các đoạn chat?")) {
        setSessions([]);
        setCurrentSessionId(null);
        localStorage.removeItem('ECOLAW_CHAT_SESSIONS');
        localStorage.removeItem('ECOLAW_CHAT_HISTORY');
    }
  }, []);

  const processAIResponse = async (prompt: string, historyMessages: Message[], customCreditAmount: number = 1, _isSystemPrompt: boolean = false, extraMetadata?: any, targetSessionId?: string, attachmentData?: { mimeType: string, data: string }) => {
    deductCredit(customCreditAmount);
    
    // Set processing session to current session or target
    const activeSessionForRequest = targetSessionId || currentSessionId;
    if (!activeSessionForRequest) {
        console.error("No active session for request");
        return;
    }
    setProcessingSessionId(activeSessionForRequest);
    
    setAgentStage(AgentStage.ROUTING);
    await new Promise(r => setTimeout(r, 800));
    setAgentStage(AgentStage.SPECIALIST);
    
    const apiHistory = historyMessages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
    const activeConfig = selectedAgent !== 'GENERAL' ? agentConfigs[selectedAgent] : undefined;
    
    try {
      // If it's a system prompt (like drafting), we might want to override the persona in the prompt text itself or keep it general
      const response = await sendMessageToGemini(prompt, apiHistory, selectedAgent, responseStyle, activeConfig, currentUser.level, attachmentData);
      
      let rawText = response.text;
      let requiresHuman = false;
      let suggestedLawyers: LawyerProfile[] = [];

      // Check for Human Handoff Trigger
      if (rawText.includes('[[HUMAN_REQUIRED]]')) {
          requiresHuman = true;
          rawText = rawText.replace('[[HUMAN_REQUIRED]]', '').trim();
          
          // Find suitable lawyers based on current agent type or default
          suggestedLawyers = MOCK_LAWYERS.filter(l => l.specialty === selectedAgent || l.specialty === 'GENERAL').slice(0, 2);
          // If no specific lawyers found, show generic ones
          if (suggestedLawyers.length === 0) suggestedLawyers = MOCK_LAWYERS.slice(0, 2);
      }

      // Helper to clean and transform suggestions to User Perspective
      const cleanSuggestion = (s: string) => {
          let text = s.replace('-','').trim();
          // Remove markdown bolding
          text = text.replace(/\*\*/g, '');
          
          // Transform AI questions to User commands (Regex magic)
          // "Bạn có muốn tôi cung cấp X không?" -> "Tôi muốn cung cấp X"
          if (text.match(/^(Bạn|bạn) có (muốn|cần) (tôi|chúng tôi)?\s*/i)) {
              text = text.replace(/^(Bạn|bạn) có (muốn|cần) (tôi|chúng tôi)?\s*/i, 'Tôi $2 ');
              text = text.replace(/không\?$/i, ''); // Remove trailing "không?"
              text = text.replace(/\?$/, '');       // Remove trailing "?"
          }
          
          return text.trim();
      };

      const parts = rawText.split("💡 GỢI Ý TIẾP THEO");
      const cleanText = parts[0].trim();
      const suggestions = parts[1] ? parts[1].split('\n').filter(l => l.trim().startsWith('-')).map(cleanSuggestion).slice(0, 4) : [];

      setAgentStage(AgentStage.REVIEWING);
      await new Promise(r => setTimeout(r, 800));

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: cleanText,
        suggestedQuestions: suggestions,
        suggestedLawyers: requiresHuman ? suggestedLawyers : undefined,
        timestamp: new Date(),
        metadata: { 
            agentUsed: selectedAgent, 
            source: response.source === 'BACKEND' ? 'SPECIALIZED_KB' : 'GENERAL_AI',
            ...extraMetadata
        }
      };
      
      // Update session messages - need to find the session again in case it changed (though we are in a closure)
      // Actually, we should update the session that initiated the request
      setSessions(prev => prev.map(s => {
          if (s.id === activeSessionForRequest) {
              return { ...s, messages: [...s.messages, botMsg], updatedAt: new Date() };
          }
          return s;
      }));
      
      setAgentStage(AgentStage.IDLE);
      setProcessingSessionId(null);
    } catch (e) {
      console.error("Error in processAIResponse:", e);
      setAgentStage(AgentStage.IDLE);
      setProcessingSessionId(null);
      
      const errorMsg: Message = {
          id: Date.now().toString(),
          role: 'model',
          text: '⚠️ Xin lỗi, đã có lỗi xảy ra khi kết nối với AI. Vui lòng thử lại.',
          timestamp: new Date()
      };
      
      setSessions(prev => prev.map(s => {
          if (s.id === activeSessionForRequest) {
              return { ...s, messages: [...s.messages, errorMsg], updatedAt: new Date() };
          }
          return s;
      }));
    }
  };

  const handleSendMessage = async (textOverride?: string) => {
    if (agentStage !== AgentStage.IDLE) return; // Prevent sending while processing
    
    const textToSend = textOverride || inputText;
    if (!textToSend.trim() && !selectedFile) return; // Allow sending if only file is selected

    if (textToSend.startsWith('/')) {
      onCommand(textToSend);
      setInputText('');
      return;
    }

    if (currentUser.credits <= 0 && currentUser.level !== 'Enterprise') {
      setShowCreditModal(true);
      return;
    }

    setInputText('');
    const fileToSend = selectedFile;
    clearSelectedFile(); // Clear immediately after grabbing

    // Logic:
    // 1. If we are on Landing (no current session), create a NEW session.
    // 2. If we are in a session, append to it.
    
    let activeSessionId = currentSessionId;
    let isNewSession = false;

    if (!activeSessionId) {
        const newSession: ChatSession = {
            id: Date.now().toString(),
            title: textToSend.slice(0, 30) + (textToSend.length > 30 ? '...' : '') || (fileToSend ? `Phân tích ${fileToSend.name}` : 'Đoạn chat mới'),
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date()
        };
        setSessions(prev => [newSession, ...prev]);
        setCurrentSessionId(newSession.id);
        activeSessionId = newSession.id;
        isNewSession = true;
    }

    const userMsg: Message = { 
        id: Date.now().toString(), 
        role: 'user', 
        text: textToSend, 
        timestamp: new Date(),
        attachment: fileToSend ? {
            name: fileToSend.name,
            type: fileToSend.type,
            data: fileToSend.data
        } : undefined
    };
    
    // Update the session with the new message
    setSessions(prev => prev.map(s => {
        if (s.id === activeSessionId) {
            // Auto-update title if it's the first message in the session
            let newTitle = s.title;
            if (s.messages.length === 0) {
                 // Use the first 30 chars of the message as the title
                 newTitle = textToSend.slice(0, 30) + (textToSend.length > 30 ? '...' : '') || (fileToSend ? `Phân tích ${fileToSend.name}` : 'Đoạn chat mới');
            }

            return {
                ...s,
                messages: [...s.messages, userMsg],
                title: newTitle,
                updatedAt: new Date()
            };
        }
        return s;
    }));

    // Get the updated history for the AI context
    const currentSession = sessions.find(s => s.id === activeSessionId);
    const previousMessages = currentSession ? currentSession.messages : [];
    const contextMessages = isNewSession ? [] : previousMessages; // Context *before* this new message

    // Construct Prompt for Contract Review if file is present
    let finalPrompt = textToSend;
    if (fileToSend && fileToSend.type === 'application/pdf') {
        finalPrompt = `
        [YÊU CẦU PHÂN TÍCH HỢP ĐỒNG/TÀI LIỆU]
        Người dùng vừa tải lên một tài liệu PDF: "${fileToSend.name}".
        
        NHIỆM VỤ CỦA BẠN:
        1. Đọc kỹ nội dung tài liệu đính kèm.
        2. **RÀ SOÁT RỦI RO (RISK HIGHLIGHT)**: Chỉ ra các điều khoản bất lợi, mơ hồ hoặc trái luật.
        3. **ĐỐI CHIẾU PHÁP LÝ**: So sánh với Luật Doanh nghiệp 2020, Bộ luật Dân sự 2015 hoặc các luật chuyên ngành liên quan của Việt Nam.
        4. **GỢI Ý SỬA ĐỔI**: Đề xuất câu chữ cụ thể để bảo vệ quyền lợi cho người dùng (giả định người dùng là bên yếu thế hơn hoặc bên đang hỏi).
        
        **QUAN TRỌNG**: Khi trích dẫn các đoạn văn bản quan trọng hoặc có rủi ro từ hợp đồng, hãy bôi vàng chúng bằng cú pháp ==đoạn văn bản cần bôi vàng==.
        
        ${textToSend ? `LƯU Ý CỦA NGƯỜI DÙNG: "${textToSend}"` : ''}
        
        HÃY TRÌNH BÀY KẾT QUẢ RÕ RÀNG, DÙNG MARKDOWN (Bảng biểu, In đậm) ĐỂ DỄ ĐỌC.
        `;
    }

    const attachmentData = fileToSend ? { mimeType: fileToSend.type, data: fileToSend.data } : undefined;
    
    await processAIResponse(finalPrompt, contextMessages, 1, false, undefined, activeSessionId, attachmentData);
  };

  // --- Document Drafting Logic ---
  const handleSelectDocument = (doc: DocumentTemplate) => {
      // 1. Check Credits
      if (currentUser.level !== 'Enterprise' && currentUser.credits < doc.price) {
          setShowDraftModal(false);
          setShowCreditModal(true);
          return;
      }
      
      // 2. Open Form
      setSelectedDocForForm(doc);
      setDraftFormData({});
  };

  const handleGenerateDocument = async () => {
      if (!selectedDocForForm) return;

      const doc = selectedDocForForm;
      
      // Validation
      const missingFields = doc.fields?.filter(f => f.required && !draftFormData[f.id]);
      if (missingFields && missingFields.length > 0) {
          alert(`Vui lòng điền đầy đủ các trường bắt buộc: ${missingFields.map(f => f.label).join(', ')}`);
          return;
      }

      setShowDraftModal(false);
      setSelectedDocForForm(null);
      
      // Format the form data for the prompt
      const details = Object.entries(draftFormData)
          .map(([key, value]) => {
              const field = doc.fields?.find(f => f.id === key);
              return `- ${field?.label || key}: ${value}`;
          })
          .join('\n');

      // Ensure we have a session
      let activeSessionId = currentSessionId;
      let isNewSession = false;

      if (!activeSessionId) {
          const newSession: ChatSession = {
              id: Date.now().toString(),
              title: `Soạn thảo: ${doc.name}`,
              messages: [],
              createdAt: new Date(),
              updatedAt: new Date()
          };
          setSessions(prev => [newSession, ...prev]);
          setCurrentSessionId(newSession.id);
          activeSessionId = newSession.id;
          isNewSession = true;
      }

      // 3. Add User Message
      const userMsg: Message = {
          id: Date.now().toString(),
          role: 'user',
          text: `Yêu cầu soạn thảo: ${doc.name}\n\nThông tin cung cấp:\n${details}`,
          timestamp: new Date()
      };
      
      // Update session with user message
      setSessions(prev => prev.map(s => {
          if (s.id === activeSessionId) {
              return { ...s, messages: [...s.messages, userMsg], updatedAt: new Date() };
          }
          return s;
      }));

      // 4. Construct Special Prompt for AI
      const systemPrompt = `
      [YÊU CẦU DỊCH VỤ ĐẶC BIỆT]: Người dùng đã thanh toán ${doc.price} Credits để soạn thảo văn bản: "${doc.name}".
      
      THÔNG TIN ĐẦU VÀO:
      ${details}
      
      NHIỆM VỤ CỦA BẠN:
      1. Đóng vai Chuyên viên Pháp lý Soạn thảo (Legal Drafter) chuyên nghiệp.
      2. Dựa trên thông tin trên, hãy SOẠN THẢO HOÀN CHỈNH văn bản "${doc.name}".
      3. **QUAN TRỌNG**: Văn bản phải chuẩn thể thức hành chính/pháp lý Việt Nam:
         - Quốc hiệu: CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
         - Tiêu ngữ: Độc lập - Tự do - Hạnh phúc
         - Tên văn bản: Viết in hoa (VD: ĐƠN KHỞI KIỆN)
         - Kính gửi: Cơ quan thẩm quyền phù hợp.
      4. Nếu thiếu thông tin không quan trọng, hãy để trống [...] hoặc tự điền giả định hợp lý (trong ngoặc đơn).
      5. Cuối văn bản, hãy đưa ra lời khuyên pháp lý ngắn gọn liên quan đến thủ tục nộp đơn này.
      
      HÃY TRẢ LỜI BẰNG ĐỊNH DẠNG MARKDOWN RÕ RÀNG. KHÔNG CẦN CHÀO HỎI DÀI DÒNG, HÃY ĐƯA RA VĂN BẢN NGAY.
      `;

      // 5. Trigger AI
      const currentSession = sessions.find(s => s.id === activeSessionId);
      const history = isNewSession ? [] : (currentSession?.messages || []);

      await processAIResponse(systemPrompt, history, doc.price, true, { type: 'DRAFT_DOCUMENT', docName: doc.name }, activeSessionId);
  };

  const startEditing = (msg: Message) => {
    setEditingMsgId(msg.id);
    setEditTempText(msg.text);
  };

  const cancelEditing = useCallback(() => {
    setEditingMsgId(null);
    setEditTempText('');
  }, []);

  const submitEdit = async () => {
    if (!editingMsgId || !editTempText.trim()) return;
    
    const msgIndex = messages.findIndex(m => m.id === editingMsgId);
    if (msgIndex === -1) return;

    if (currentUser.credits <= 0 && currentUser.level !== 'Enterprise') {
        setShowCreditModal(true);
        return;
    }

    const newText = editTempText;
    setEditingMsgId(null);
    setEditTempText('');

    // Slice history up to the edited message (remove everything after it)
    const historyMessages = messages.slice(0, msgIndex);
    
    const newUserMsg: Message = { 
        ...messages[msgIndex], 
        text: newText, 
        timestamp: new Date() 
    };

    // Update state: History + New User Msg
    setMessages([...historyMessages, newUserMsg]);

    // Trigger AI with the truncated history
    await processAIResponse(newText, historyMessages);
  };

  // Helper to clean system metadata from document text
  const cleanDocumentContent = (text: string) => {
      // 1. Try to find the standard Vietnamese header
      const headerIndex = text.indexOf('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM');
      if (headerIndex !== -1) {
          return text.substring(headerIndex);
      }
      
      // 2. If not found, try to strip the "TRẠNG THÁI HỆ THỐNG" block
      if (text.includes('TRẠNG THÁI HỆ THỐNG')) {
          // Remove everything up to the first horizontal rule or significant separator after the status block
          const parts = text.split(/_{3,}|-{3,}/); // Split by horizontal rules
          if (parts.length > 1) {
              // Usually the document is the last part or the part after the status
              // But safely, let's just remove the part containing "TRẠNG THÁI HỆ THỐNG"
              return parts.filter(p => !p.includes('TRẠNG THÁI HỆ THỐNG')).join('\n').trim();
          }
          // Fallback regex to remove the specific block
          return text.replace(/📍 \*\*TRẠNG THÁI HỆ THỐNG\*\*[\s\S]*?(?=\n\n|\n[A-ZĐ])/, '').trim();
      }
      
      return text;
  };

  const handleBookingConfirm = () => {
      // Add a system notification in chat about the successful booking
      if (bookingLawyer) {
          const sysMsg: Message = {
              id: Date.now().toString(),
              role: 'model',
              text: `✅ **ĐẶT LỊCH THÀNH CÔNG**\n\nBạn đã đặt lịch hẹn tư vấn với **${bookingLawyer.name}**.\n\nThông tin chi tiết và đường dẫn phòng họp đã được gửi qua email. Vui lòng kiểm tra hòm thư và đến đúng giờ.`,
              timestamp: new Date(),
              metadata: { agentUsed: 'SYSTEM' }
          };
          setMessages(prev => [...prev, sysMsg]);
      }
      setBookingLawyer(null);
  };

  const activeAgent = useMemo(() => AGENTS_LIST.find(a => a.id === selectedAgent), [selectedAgent]);
  const activeLabel = activeAgent?.label ?? 'Luật sư Tổng hợp';
  const ActiveIcon = activeAgent?.icon ?? Cpu;

  if (isLanding) {
    return (
      <div className="min-h-screen bg-[#020617] text-white flex flex-col relative font-inter overflow-y-auto">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>
        <header className="p-6 flex justify-between items-center z-10">
            {/* ... header content ... */}
            <div className="font-bold text-xl font-mono">ecolaw<span className="text-emerald-500">.ai</span></div>
            <div className="flex items-center gap-4">
                <button 
                  onClick={() => onCommand('/admin')}
                  className="hidden md:flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white border border-transparent hover:border-slate-700 rounded-lg transition-all"
                >
                  <LayoutGrid size={14}/> ADMIN PORTAL
                </button>
                <div className="hidden md:flex bg-slate-900 rounded-full p-1 border border-slate-800">
                   <button onClick={() => setResponseStyle('CONCISE')} className={`px-3 py-1 rounded-full text-xs ${responseStyle === 'CONCISE' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}>Ngắn gọn</button>
                   <button onClick={() => setResponseStyle('DEEP')} className={`px-3 py-1 rounded-full text-xs ${responseStyle === 'DEEP' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}>Chuyên sâu</button>
                </div>
                <div className="text-right">
                    <div className="text-xs font-bold text-slate-300">{currentUser.name}</div>
                    <div onClick={() => onTriggerUpgrade('CREDITS')} className="text-[10px] text-emerald-400 cursor-pointer hover:underline">{currentUser.credits} CR (Nạp thêm)</div>
                </div>
            </div>
        </header>
        <main className="flex-1 flex flex-col items-center justify-start pt-10 px-4 relative z-10 pb-20">
            <div className="text-center mb-10">
                <h1 className="text-6xl font-bold mb-4">ecolaw<span className="text-emerald-500">.ai</span></h1>
                <p className="text-slate-400 text-lg max-w-2xl mx-auto">Hệ thống tư vấn pháp lý <span className="text-emerald-400 font-bold">Real-time</span> được hỗ trợ bởi trí tuệ nhân tạo đa tác nhân.</p>
            </div>
            <div className="w-full max-w-2xl">
                {/* Quick Actions for Landing Page - Moved Up */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <button 
                        onClick={() => setShowDraftModal(true)}
                        className="bg-slate-900/50 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 p-4 rounded-xl flex items-center justify-center gap-4 transition-all group"
                    >
                        <div className="p-3 bg-emerald-900/20 rounded-lg text-emerald-500 group-hover:scale-110 transition-transform">
                            <FileText size={24}/>
                        </div>
                        <div className="text-left">
                            <div className="font-bold text-white">Soạn Thảo Văn Bản</div>
                            <div className="text-xs text-slate-400">Tạo đơn từ, hợp đồng chuẩn</div>
                        </div>
                    </button>

                    <button 
                        onClick={() => setShowToolsModal(true)}
                        className="bg-slate-900/50 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 p-4 rounded-xl flex items-center justify-center gap-4 transition-all group"
                    >
                        <div className="p-3 bg-blue-900/20 rounded-lg text-blue-500 group-hover:scale-110 transition-transform">
                            <LayoutGrid size={24}/>
                        </div>
                        <div className="text-left">
                            <div className="font-bold text-white">Tiện Ích Mở Rộng</div>
                            <div className="text-xs text-slate-400">Review HĐ, Tính án phí...</div>
                        </div>
                    </button>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="relative w-full max-w-3xl mx-auto group z-20">
                    {selectedFile && (
                        <div className="absolute bottom-full left-0 mb-3 bg-[#1e293b] border border-slate-700 rounded-xl p-3 flex items-center gap-3 shadow-xl animate-in fade-in slide-in-from-bottom-2 w-full max-w-sm">
                            <div className="bg-red-500/20 p-2 rounded-lg text-red-500 shrink-0">
                                <FileText size={20} />
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                                <span className="text-sm font-bold text-slate-200 truncate">{selectedFile.name}</span>
                                <span className="text-[10px] text-slate-500 uppercase font-mono">{selectedFile.type.split('/')[1]} • {(selectedFile.data.length * 0.75 / 1024).toFixed(1)} KB</span>
                            </div>
                            <button type="button" onClick={clearSelectedFile} className="p-1.5 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors shrink-0">
                                <X size={16} />
                            </button>
                        </div>
                    )}
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="application/pdf,image/*" 
                        onChange={handleFileSelect} 
                    />
                    
                    <div className="relative flex items-center w-full bg-[#0f172a]/90 backdrop-blur-xl border border-slate-800 rounded-[2rem] shadow-2xl shadow-black/50 transition-all focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/50 hover:border-slate-700">
                        {/* Attachment Button */}
                        <button 
                            type="button" 
                            onClick={() => fileInputRef.current?.click()} 
                            className="pl-4 pr-3 py-4 text-slate-400 hover:text-emerald-400 transition-colors"
                            title="Tải lên tài liệu"
                        >
                            <Paperclip size={22} />
                        </button>

                        {/* Input Field */}
                        <input 
                            ref={inputRef} 
                            autoFocus 
                            type="text" 
                            value={inputText} 
                            onChange={e => setInputText(e.target.value)} 
                            placeholder={selectedFile ? "Nhập yêu cầu phân tích..." : `Hỏi ${activeLabel}...`} 
                            className="flex-1 bg-transparent border-none text-white placeholder-slate-500 focus:ring-0 py-4 text-base font-medium"
                        />

                        {/* Right Controls */}
                        <div className="flex items-center gap-3 pr-2 pl-2">
                            {/* Mode Toggle - Minimalist Pill */}
                            <div className="hidden sm:flex bg-slate-900/80 rounded-full p-1 border border-slate-800 items-center h-9">
                                 <button 
                                    type="button" 
                                    onClick={() => setResponseStyle('CONCISE')} 
                                    className={`px-3 h-full rounded-full text-[11px] font-bold transition-all flex items-center ${responseStyle === 'CONCISE' ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700' : 'text-slate-500 hover:text-slate-300'}`}
                                 >
                                    Ngắn gọn
                                 </button>
                                 <button 
                                    type="button" 
                                    onClick={() => setResponseStyle('DEEP')} 
                                    className={`px-3 h-full rounded-full text-[11px] font-bold transition-all flex items-center ${responseStyle === 'DEEP' ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700' : 'text-slate-500 hover:text-slate-300'}`}
                                 >
                                    Chuyên sâu
                                 </button>
                            </div>

                            {/* Action Button - Circular */}
                            {!inputText && !selectedFile ? (
                                 <button type="button" onClick={() => alert("Tính năng nhập liệu bằng giọng nói đang được phát triển.")} className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full transition-all border border-slate-700 group">
                                    <Mic size={20} className="group-hover:scale-110 transition-transform"/>
                                 </button>
                            ) : (
                                <button type="submit" className="w-10 h-10 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full flex items-center justify-center transition-all shadow-lg shadow-emerald-900/20 hover:shadow-emerald-900/40 hover:scale-105 active:scale-95">
                                    <ArrowUp size={20} strokeWidth={3}/>
                                </button>
                            )}
                        </div>
                    </div>
                </form>

                <div className="mt-8 text-center text-xs text-slate-500 uppercase tracking-widest mb-4">Gợi ý tìm kiếm (2026)</div>
                <div className="flex flex-wrap justify-center gap-2">
                    {[
                        "Luật Đất đai 2026: Bảng giá đất mới",
                        "Thủ tục ly hôn đơn phương nhanh",
                        "Đòi nợ cá nhân không giấy tờ",
                        "Sa thải trái luật & Bồi thường",
                        "Thủ tục sang tên Sổ đỏ 2026",
                        "Tố cáo lừa đảo qua mạng",
                        "Mức đóng BHXH tự nguyện mới",
                        "Đăng ký kinh doanh Online",
                        "Luật Căn cước & VNeID mới nhất",
                        "Quyền nuôi con khi ly hôn"
                    ].map((t, i) => (
                        <button key={i} onClick={() => handleSendMessage(t)} className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/50 text-slate-400 text-xs hover:border-emerald-500/30 hover:text-emerald-400 transition-colors">{t}</button>
                    ))}
                </div>
                <div className="mt-8 flex flex-wrap justify-center gap-2">
                     {AGENTS_LIST.filter(a => a.id !== 'GENERAL').map(a => { const Icon = a.icon; return (
                         <button key={a.id} onClick={() => setSelectedAgent(a.id)} className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs transition-all ${selectedAgent === a.id ? 'bg-slate-800 border-emerald-500 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-600'}`}><Icon size={14}/> {a.label}</button>
                     )})}
                </div>
            </div>
            
            <div className="w-full max-w-5xl mt-12 px-4">
                <NewsSection />
            </div>
            
            <div className="mt-12 text-xs text-slate-600 font-mono">ECOLAW.AI SYSTEM © 2026. ALL RIGHTS RESERVED.</div>
        </main>

        {/* Modals for Landing Page */}
        <DraftDocumentModal 
            isOpen={showDraftModal}
            onClose={() => { setShowDraftModal(false); setSelectedDocForForm(null); }}
            selectedDoc={selectedDocForForm}
            onSelectDoc={setSelectedDocForForm}
            onCheckAndSelectDoc={handleSelectDocument}
            formData={draftFormData}
            setFormData={setDraftFormData}
            onGenerate={handleGenerateDocument}
            userCredits={currentUser.credits}
            userLevel={currentUser.level}
        />
        <LegalToolsModal isOpen={showToolsModal} onClose={() => setShowToolsModal(false)} />
        <CreditModal isOpen={showCreditModal} onClose={() => setShowCreditModal(false)} onUpgrade={(mode) => { setShowCreditModal(false); onTriggerUpgrade(mode); }} />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#020617] font-inter text-slate-200 overflow-hidden">
      
      {/* SIDEBAR */}
      <div className={`${showSidebar ? 'w-64' : 'w-0'} bg-slate-950 border-r border-slate-800 transition-all duration-300 flex flex-col flex-shrink-0 overflow-hidden`}>
          <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <div className="font-bold font-mono text-emerald-500 flex items-center gap-2"><Terminal size={16}/> HISTORY</div>
              <div className="flex items-center gap-1">
                  <button onClick={handleCreateNewSession} className="p-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white" title="Đoạn chat mới">
                      <Plus size={16}/>
                  </button>
                  <button onClick={() => setShowSidebar(false)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg md:hidden" title="Thu gọn">
                      <PanelLeftClose size={16}/>
                  </button>
              </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {sessions.map(session => (
                  <div 
                    key={session.id} 
                    onClick={() => setCurrentSessionId(session.id)}
                    className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${currentSessionId === session.id ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'}`}
                  >
                      <div className="flex items-center gap-3 overflow-hidden flex-1">
                          <MessageSquare size={16} className="flex-shrink-0"/>
                          <div className="truncate text-xs font-medium">{session.title}</div>
                      </div>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <button 
                            type="button"
                            onClick={(e) => handleRenameSession(e, session.id)} 
                            className="p-1.5 hover:bg-slate-700 rounded text-slate-500 hover:text-blue-400 transition-colors relative z-10"
                            title="Đổi tên"
                          >
                            <Edit3 size={14}/>
                          </button>
                          <button 
                            type="button"
                            onClick={(e) => handleDeleteSession(e, session.id)} 
                            className="p-1.5 hover:bg-slate-700 rounded text-slate-500 hover:text-red-400 transition-colors relative z-10"
                            title="Xóa"
                          >
                            <Trash2 size={14}/>
                          </button>
                      </div>
                  </div>
              ))}
              {sessions.length === 0 && (
                  <div className="text-center text-slate-600 text-xs mt-10">Chưa có lịch sử chat</div>
              )}
          </div>
          <div className="p-4 border-t border-slate-800">
              <button onClick={handleClearHistory} className="w-full flex items-center justify-center gap-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20 p-2 rounded-lg transition-colors">
                  <Trash2 size={14}/> Xóa tất cả
              </button>
          </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full relative min-w-0">
        
        {/* HEADER */}
        <header className="h-16 border-b border-slate-800 bg-slate-950 flex items-center justify-between px-4 md:px-6 z-20 flex-shrink-0">
             <div className="flex items-center gap-3">
                 <button onClick={() => setShowSidebar(!showSidebar)} className="text-slate-400 hover:text-white transition-colors">
                    {showSidebar ? <ChevronLeft size={20}/> : <Menu size={20}/>}
                 </button>
                 <div className="font-bold text-xl font-mono cursor-pointer" onClick={() => setCurrentSessionId(null)}>ecolaw<span className="text-emerald-500">.ai</span></div>
             </div>
             
             <div className="flex items-center gap-4">
                 <div className="hidden md:flex bg-slate-900 rounded-full p-1 border border-slate-800">
                    <button onClick={() => setResponseStyle('CONCISE')} className={`px-3 py-1 rounded-full text-xs ${responseStyle === 'CONCISE' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}><Zap size={12}/> Nhanh</button>
                    <button onClick={() => setResponseStyle('DEEP')} className={`px-3 py-1 rounded-full text-xs ${responseStyle === 'DEEP' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}><BookOpen size={12}/> Sâu</button>
                 </div>
                 <div className="relative">
                    <button onClick={() => setShowAgentMenu(!showAgentMenu)} className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-full text-sm hover:border-emerald-500 transition-colors">
                        <ActiveIcon size={16} className="text-emerald-500"/> {activeLabel} <ChevronDown size={14}/>
                    </button>
                    {showAgentMenu && (
                        <div className="absolute top-full right-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-30">
                            {AGENTS_LIST.map(a => (
                                <button key={a.id} onClick={() => {setSelectedAgent(a.id); setShowAgentMenu(false)}} className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-800 flex items-center justify-between ${selectedAgent === a.id ? 'text-emerald-400' : 'text-slate-300'}`}>
                                    <div className="flex items-center gap-2">
                                        <a.icon size={16}/> {a.label}
                                    </div>
                                    {selectedAgent === a.id && <Check size={14}/>}
                                </button>
                            ))}
                        </div>
                    )}
                 </div>
                 
                 <button onClick={() => onCommand('/admin')} className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors" title="Admin Dashboard"><LayoutGrid size={20}/></button>
                 <button onClick={() => onTriggerUpgrade('SUBSCRIPTION')} className="bg-emerald-900/30 text-emerald-400 text-xs px-3 py-1.5 rounded-lg border border-emerald-500/30 hover:bg-emerald-900/50 transition-colors font-mono font-bold">
                     UPGRADE
                 </button>
             </div>
        </header>

        {/* CHAT AREA WITH OPTIONAL SPLIT SCREEN */}
        <div className="flex-1 overflow-hidden flex">
            {/* Left Pane: File Viewer (if attachment exists) */}
            {(() => {
                const sessionAttachment = messages.find(m => m.attachment)?.attachment;
                if (!sessionAttachment) return null;

                return (
                    <div className="w-1/2 border-r border-slate-800 flex-col bg-slate-950 hidden lg:flex">
                        <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-900 shrink-0">
                            <div className="flex items-center gap-2 text-slate-300 min-w-0">
                                <FileText size={16} className="text-emerald-500 shrink-0"/>
                                <span className="text-sm font-medium truncate">{sessionAttachment.name}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 uppercase font-mono shrink-0 ml-2">
                                {sessionAttachment.type.split('/')[1]}
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden relative bg-slate-950/50 flex items-center justify-center">
                            {sessionAttachment.type === 'application/pdf' ? (
                                <iframe 
                                    src={`data:application/pdf;base64,${sessionAttachment.data}`} 
                                    className="absolute inset-0 w-full h-full border-none"
                                    title="PDF Viewer"
                                />
                            ) : sessionAttachment.type.startsWith('image/') ? (
                                <img 
                                    src={`data:${sessionAttachment.type};base64,${sessionAttachment.data}`} 
                                    className="max-w-full max-h-full object-contain p-4"
                                    alt="Attachment"
                                    referrerPolicy="no-referrer"
                                />
                            ) : (
                                <div className="text-slate-500 flex flex-col items-center gap-2">
                                    <FileText size={48} className="text-slate-700" />
                                    <p className="text-sm">Không thể xem trước tệp này</p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}

            {/* Right Pane: Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 relative">
                {/* Render Messages in Chronological Order */}
                {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}>
                {msg.role === 'model' && <div className="w-8 h-8 rounded bg-slate-900 border border-slate-700 flex items-center justify-center mr-3 text-emerald-500"><Cpu size={18}/></div>}
                <div className={`max-w-[85%] rounded-2xl p-4 md:p-6 border relative ${msg.role === 'user' ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-100 rounded-tr-sm' : 'bg-slate-900/80 border-slate-800 text-slate-200 rounded-tl-sm'}`}>
                    
                    {editingMsgId === msg.id ? (
                        <div className="flex flex-col gap-2 min-w-[280px] md:min-w-[400px]">
                            <textarea 
                                value={editTempText} 
                                onChange={e => setEditTempText(e.target.value)}
                                className="w-full bg-slate-950/50 text-emerald-100 p-3 rounded-xl border border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm font-mono leading-relaxed resize-none"
                                rows={Math.max(3, editTempText.split('\n').length)}
                                autoFocus
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={cancelEditing} className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white bg-slate-900 rounded-lg flex items-center gap-1 transition-colors"><X size={14}/> Cancel</button>
                                <button onClick={submitEdit} className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg flex items-center gap-1 transition-colors"><Save size={14}/> Save & Run</button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {msg.role === 'user' ? (
                                <p className="whitespace-pre-wrap">{msg.text}</p>
                            ) : (
                                msg.metadata?.type === 'DRAFT_DOCUMENT' ? (
                                    (() => {
                                        const cleanText = cleanDocumentContent(msg.text);
                                        return (
                                            <div className="w-full overflow-x-auto bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                                                <div className="flex justify-between items-center mb-4 px-2">
                                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                                        <FileText size={14} className="text-emerald-500"/> Bản xem trước văn bản
                                                    </span>
                                                    <div className="flex gap-2">
                                                         <button 
                                                            onClick={() => setViewingDocument({ content: cleanText, title: msg.metadata?.docName || 'Văn bản' })}
                                                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-white flex items-center gap-1 transition-colors"
                                                         >
                                                             <BookOpen size={14}/> Xem A4
                                                         </button>
                                                         <button 
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(cleanText);
                                                                alert('Đã sao chép văn bản!');
                                                            }}
                                                            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                                                            title="Sao chép"
                                                        >
                                                            <Copy size={16}/>
                                                        </button>
                                                        <button 
                                                            onClick={() => {
                                                                const blob = new Blob([cleanText], { type: 'text/plain;charset=utf-8' });
                                                                const url = URL.createObjectURL(blob);
                                                                const link = document.createElement('a');
                                                                link.href = url;
                                                                link.download = `${msg.metadata?.docName || 'van_ban'}.txt`;
                                                                document.body.appendChild(link);
                                                                link.click();
                                                                document.body.removeChild(link);
                                                            }}
                                                            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-emerald-400 transition-colors"
                                                            title="Tải về"
                                                        >
                                                            <Download size={16}/>
                                                        </button>
                                                    </div>
                                                </div>
                                                
                                                {/* Mini Preview Container */}
                                                <div className="mx-auto shadow-2xl overflow-hidden max-h-[300px] relative">
                                                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950 pointer-events-none"></div>
                                                    <MarkdownRenderer content={cleanText} mode="document" />
                                                </div>
                                            </div>
                                        );
                                    })()
                                ) : (
                                    <MarkdownRenderer content={msg.text} />
                                )
                            )}

                            {msg.role === 'user' && (
                                <button 
                                    onClick={() => startEditing(msg)}
                                    className="absolute -left-10 top-2 p-2 text-slate-600 hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-all bg-slate-900/50 rounded-full"
                                    title="Chỉnh sửa tin nhắn"
                                >
                                    <Edit2 size={14}/>
                                </button>
                            )}
                            
                            {/* HUMAN HANDOFF SECTION - LAWYER CARDS */}
                            {msg.suggestedLawyers && msg.suggestedLawyers.length > 0 && (
                                <div className="mt-6 pt-4 border-t border-slate-800 animate-fade-in-up">
                                    <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4 mb-4 flex items-start gap-3">
                                        <AlertTriangle className="text-amber-500 flex-shrink-0" size={20}/>
                                        <div>
                                            <h4 className="text-amber-400 font-bold text-sm">Cần sự can thiệp của Luật sư</h4>
                                            <p className="text-xs text-slate-400 mt-1">Vấn đề của bạn có tính chất phức tạp, cần thực hiện thủ tục trực tiếp hoặc đại diện tranh tụng. Dưới đây là các Luật sư đối tác phù hợp nhất:</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {msg.suggestedLawyers.map(lawyer => (
                                            <div key={lawyer.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 hover:border-emerald-500/50 transition-all group/card">
                                                <div className="flex gap-4">
                                                    <div className="relative">
                                                        <img src={lawyer.avatarUrl} alt={lawyer.name} className="w-12 h-12 rounded-full bg-slate-800 object-cover"/>
                                                        {lawyer.isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full"></div>}
                                                    </div>
                                                    <div>
                                                        <h5 className="font-bold text-white text-sm">{lawyer.name}</h5>
                                                        <p className="text-xs text-emerald-400 font-medium">{lawyer.title}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <div className="flex items-center text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded"><Star size={10} className="text-yellow-500 mr-1"/> {lawyer.rating}</div>
                                                            <div className="text-[10px] text-slate-500">{lawyer.experience} KN</div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="mt-4 pt-3 border-t border-slate-900 flex justify-between items-center">
                                                    <div className="text-xs text-slate-400">Phí tư vấn: <span className="text-white font-mono">{lawyer.consultationFee.toLocaleString()}đ</span>/h</div>
                                                    <button 
                                                        onClick={() => setBookingLawyer(lawyer)}
                                                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                                                    >
                                                        <Calendar size={12}/> Đặt lịch
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                                <div className="mt-4 pt-3 border-t border-slate-800">
                                     <div className="text-xs text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1"><HelpCircle size={12}/> Gợi ý tiếp theo</div>
                                     <div className="flex flex-wrap gap-2">
                                        {msg.suggestedQuestions.map((q, i) => (
                                            <button 
                                                key={i} 
                                                onClick={() => handleSendMessage(q)}
                                                style={{ animationDelay: `${i * 100}ms` }} 
                                                className="animate-fade-in-up px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 hover:border-emerald-500 hover:text-emerald-400 transition-colors flex items-center gap-1"
                                            >
                                                {q} <ArrowDown size={12}/>
                                            </button>
                                        ))}
                                     </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        ))}
        {agentStage !== AgentStage.IDLE && currentSessionId === processingSessionId && (
            <div className="flex justify-center my-4">
                <div className="bg-slate-900 border border-emerald-500/30 px-6 py-2 rounded-full text-emerald-400 text-xs font-mono animate-pulse flex items-center gap-2"><Activity size={14}/> {agentStage === AgentStage.ROUTING ? 'ROUTING...' : agentStage === AgentStage.SPECIALIST ? 'CONNECTING AGENT...' : 'ANALYZING...'}</div>
            </div>
        )}
        <div ref={messagesEndRef}/>
      </div>
      </div>
      <div className="p-4 bg-[#0f172a] border-t border-slate-800 shrink-0">
         <div className="max-w-4xl mx-auto flex gap-2">
             <button 
                type="button"
                onClick={() => setShowDraftModal(true)}
                className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white px-3 rounded-xl flex flex-col items-center justify-center transition-all group shrink-0"
                title="Soạn thảo văn bản pháp lý"
             >
                <FileText size={20} className="group-hover:text-emerald-400 mb-0.5"/>
                <span className="text-[9px] font-bold uppercase group-hover:text-emerald-400">Soạn Đơn</span>
             </button>
             
             <button 
                type="button"
                onClick={() => setShowToolsModal(true)}
                className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white px-3 rounded-xl flex flex-col items-center justify-center transition-all group shrink-0"
                title="Tiện ích pháp lý mở rộng"
             >
                <LayoutGrid size={20} className="group-hover:text-blue-400 mb-0.5"/>
                <span className="text-[9px] font-bold uppercase group-hover:text-blue-400">Tiện Ích</span>
             </button>

             <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex-1 relative group">
                {selectedFile && (
                    <div className="absolute bottom-full left-0 mb-3 bg-[#1e293b] border border-slate-700 rounded-xl p-3 flex items-center gap-3 shadow-xl animate-in fade-in slide-in-from-bottom-2 w-full max-w-sm">
                        <div className="bg-red-500/20 p-2 rounded-lg text-red-500 shrink-0">
                            <FileText size={20} />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-sm font-bold text-slate-200 truncate">{selectedFile.name}</span>
                            <span className="text-[10px] text-slate-500 uppercase font-mono">{selectedFile.type.split('/')[1]} • {(selectedFile.data.length * 0.75 / 1024).toFixed(1)} KB</span>
                        </div>
                        <button type="button" onClick={clearSelectedFile} className="p-1.5 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors shrink-0">
                            <X size={16} />
                        </button>
                    </div>
                )}
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="application/pdf,image/*" 
                    onChange={handleFileSelect} 
                />
                
                <div className="relative flex items-center w-full bg-[#1e293b] border border-slate-700 rounded-2xl shadow-lg transition-all focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/50">
                    {/* Attachment Button */}
                    <button 
                        type="button" 
                        onClick={() => fileInputRef.current?.click()} 
                        className="pl-4 pr-3 py-3 text-slate-400 hover:text-emerald-400 transition-colors"
                        title="Tải lên tài liệu"
                    >
                        <Paperclip size={20} />
                    </button>

                    {/* Input Field */}
                    <input 
                        ref={inputRef} 
                        autoFocus 
                        type="text" 
                        value={inputText} 
                        onChange={e => setInputText(e.target.value)} 
                        placeholder={selectedFile ? "Nhập yêu cầu phân tích..." : `[${activeLabel}] Nhập câu hỏi chi tiết...`} 
                        className="flex-1 bg-transparent border-none text-white placeholder-slate-500 focus:ring-0 py-3 text-sm font-medium"
                    />

                    {/* Right Controls */}
                    <div className="flex items-center gap-2 pr-2 pl-2">
                        {/* Mode Toggle - Minimalist Pill */}
                        <div className="hidden sm:flex bg-slate-900/80 rounded-full p-1 border border-slate-800 items-center h-8">
                             <button 
                                type="button" 
                                onClick={() => setResponseStyle('CONCISE')} 
                                className={`px-3 h-full rounded-full text-[10px] font-bold transition-all flex items-center ${responseStyle === 'CONCISE' ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700' : 'text-slate-500 hover:text-slate-300'}`}
                             >
                                Ngắn gọn
                             </button>
                             <button 
                                type="button" 
                                onClick={() => setResponseStyle('DEEP')} 
                                className={`px-3 h-full rounded-full text-[10px] font-bold transition-all flex items-center ${responseStyle === 'DEEP' ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700' : 'text-slate-500 hover:text-slate-300'}`}
                             >
                                Chuyên sâu
                             </button>
                        </div>

                        {/* Action Button - Circular */}
                        {!inputText && !selectedFile ? (
                             <button type="button" onClick={() => alert("Tính năng nhập liệu bằng giọng nói đang được phát triển.")} className="w-8 h-8 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full transition-all border border-slate-700 group">
                                <Mic size={16} className="group-hover:scale-110 transition-transform"/>
                             </button>
                        ) : (
                            <button type="submit" className="w-8 h-8 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full flex items-center justify-center transition-all shadow-lg shadow-emerald-900/20 hover:shadow-emerald-900/40 hover:scale-105 active:scale-95">
                                <ArrowUp size={16} strokeWidth={3}/>
                            </button>
                        )}
                    </div>
                </div>
             </form>
         </div>
      </div>
      
      {/* Draft Document Modal */}
      <DraftDocumentModal 
          isOpen={showDraftModal}
          onClose={() => { setShowDraftModal(false); setSelectedDocForForm(null); }}
          selectedDoc={selectedDocForForm}
          onSelectDoc={setSelectedDocForForm}
          onCheckAndSelectDoc={handleSelectDocument}
          formData={draftFormData}
          setFormData={setDraftFormData}
          onGenerate={handleGenerateDocument}
          userCredits={currentUser.credits}
          userLevel={currentUser.level}
      />

      {/* Document Preview Modal (A4) */}
      {viewingDocument && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fade-in">
              <div className="w-full h-full max-w-5xl flex flex-col">
                  <div className="flex justify-between items-center mb-4 px-4">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                          <FileText className="text-emerald-500"/> {viewingDocument.title}
                      </h2>
                      <div className="flex items-center gap-3">
                          <button 
                            onClick={() => {
                                const blob = new Blob([viewingDocument.content], { type: 'text/plain;charset=utf-8' });
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = `${viewingDocument.title}.txt`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"
                          >
                              <Download size={18}/> Tải về
                          </button>
                          <button onClick={() => setViewingDocument(null)} className="bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-lg transition-colors">
                              <X size={24}/>
                          </button>
                      </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto custom-scrollbar flex justify-center bg-slate-900/50 rounded-2xl border border-slate-800 p-8">
                      <div className="bg-white text-black shadow-2xl min-h-[29.7cm] w-[21cm] p-[2.54cm] origin-top transform scale-90 md:scale-100 transition-transform">
                          <MarkdownRenderer content={viewingDocument.content} mode="document" />
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Booking Modal */}
      {bookingLawyer && (
          <BookingModal 
              lawyer={bookingLawyer} 
              isOpen={!!bookingLawyer} 
              onClose={() => setBookingLawyer(null)}
              onConfirm={handleBookingConfirm}
          />
      )}

      <CreditModal isOpen={showCreditModal} onClose={() => setShowCreditModal(false)} onUpgrade={(mode) => { setShowCreditModal(false); onTriggerUpgrade(mode); }} />
      
      <LegalToolsModal isOpen={showToolsModal} onClose={() => setShowToolsModal(false)} />
      </div>
    </div>
  );
};