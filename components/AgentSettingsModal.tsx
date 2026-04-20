import React, { useState, useEffect } from 'react';
import { X, Save, Server, Link as LinkIcon, Key, MessageSquare, RotateCcw, Eye, Database, FileText, Upload, Trash2, CheckCircle2, Loader2, BrainCircuit, AlertTriangle } from 'lucide-react';
import { AgentConfig, AgentType, AGENT_PERSONAS, AgentDocument } from '../types';

interface AgentSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  configs: Record<AgentType, AgentConfig>;
  onSave: (newConfigs: Record<AgentType, AgentConfig>) => void;
  agentList: { id: AgentType; label: string; icon: any }[];
}

export const AgentSettingsModal: React.FC<AgentSettingsModalProps> = ({ isOpen, onClose, configs, onSave, agentList }) => {
  const [localConfigs, setLocalConfigs] = useState(configs);
  const [activeTab, setActiveTab] = useState<AgentType>('CRIMINAL');
  const [mode, setMode] = useState<'PERSONA' | 'KNOWLEDGE'>('PERSONA');
  const [showDefaultPreview, setShowDefaultPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync localConfigs when configs prop changes or modal opens
  useEffect(() => {
      setLocalConfigs(configs);
      setErrorMsg(null); // Reset error on open
  }, [configs, isOpen]);

  if (!isOpen) return null;

  const currentConfig = localConfigs[activeTab];

  const handleInputChange = (field: keyof AgentConfig, value: any) => {
    setLocalConfigs(prev => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], [field]: value }
    }));
  };
  
  const handleResetPersona = () => {
    handleInputChange('systemPrompt', undefined);
    setShowDefaultPreview(false);
  };

  const handleUploadFile = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,.docx,.txt';
    fileInput.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
            // Validation Logic
            const validExtensions = ['pdf', 'docx', 'txt'];
            const fileExtension = file.name.split('.').pop()?.toLowerCase();

            if (!fileExtension || !validExtensions.includes(fileExtension)) {
                setErrorMsg("Định dạng file không hợp lệ. Vui lòng chọn file PDF, DOCX hoặc TXT.");
                return;
            }

            setErrorMsg(null); // Clear error if valid
            setUploading(true);
            
            // Simulate Upload & Indexing Process
            setTimeout(() => {
                const newDoc: AgentDocument = {
                    id: Date.now().toString(),
                    name: file.name,
                    size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
                    type: file.name.endsWith('pdf') ? 'PDF' : file.name.endsWith('docx') ? 'DOCX' : 'TXT',
                    uploadedAt: new Date().toLocaleDateString('vi-VN'),
                    status: 'INDEXING' // Start with Indexing
                };
                
                const updatedDocs = [...(currentConfig.documents || []), newDoc];
                handleInputChange('documents', updatedDocs);

                // Simulate Indexing Completion after 2 seconds
                setTimeout(() => {
                     setLocalConfigs(prev => {
                        const docs = prev[activeTab].documents.map(d => d.id === newDoc.id ? { ...d, status: 'READY' as const } : d);
                        return {
                            ...prev,
                            [activeTab]: { ...prev[activeTab], documents: docs }
                        };
                     });
                     setUploading(false);
                }, 2000);

            }, 1000);
        }
    };
    fileInput.click();
  };

  const handleDeleteDoc = (docId: string) => {
      const updatedDocs = currentConfig.documents.filter(d => d.id !== docId);
      handleInputChange('documents', updatedDocs);
  };

  // Determine effective prompt: use overridden systemPrompt if exists, otherwise default persona
  const effectivePrompt = currentConfig.systemPrompt !== undefined ? currentConfig.systemPrompt : AGENT_PERSONAS[activeTab];
  const isModified = currentConfig.systemPrompt !== undefined;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-slate-900 w-full max-w-5xl rounded-2xl border border-slate-700 shadow-2xl flex flex-col md:flex-row h-[80vh]">
        {/* Sidebar: Agent List */}
        <div className="w-full md:w-64 bg-slate-950 border-r border-slate-800 p-4 overflow-y-auto">
          <div className="flex items-center space-x-2 mb-6 px-2">
            <Server className="text-emerald-500" size={20} />
            <span className="font-bold text-white">CẤU HÌNH AGENT</span>
          </div>
          <div className="space-y-1">
            {agentList.map((agent) => (
              <button
                key={agent.id}
                onClick={() => { setActiveTab(agent.id); setErrorMsg(null); }}
                className={`w-full flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === agent.id ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:bg-slate-900'}`}
              >
                <span>{agent.label}</span>
                <div className="flex items-center gap-2">
                    {/* Knowledge Indicator */}
                    {(localConfigs[agent.id]?.documents?.length || 0) > 0 && <Database size={12} className="text-amber-500"/>}
                    {localConfigs[agent.id]?.isEnabled && <div className="w-2 h-2 rounded-full bg-emerald-500"></div>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col bg-slate-900">
            {/* Header */}
            <div className="p-6 md:p-8 pb-0 border-b border-slate-800 bg-slate-900">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-1">{agentList.find(a => a.id === activeTab)?.label} Agent</h2>
                        <div className="flex items-center gap-4">
                             <div className="flex items-center gap-2 text-sm text-slate-400">
                                <label className="flex items-center cursor-pointer">
                                    <input type="checkbox" checked={currentConfig.isEnabled} onChange={(e) => handleInputChange('isEnabled', e.target.checked)} className="accent-emerald-500 w-4 h-4 mr-2"/>
                                    {currentConfig.isEnabled ? <span className="text-emerald-400 font-bold">Đang hoạt động</span> : 'Tạm dừng'}
                                </label>
                             </div>
                        </div>
                    </div>
                    <button onClick={onClose}><X className="text-slate-500 hover:text-white" size={24} /></button>
                </div>

                {/* Tabs */}
                <div className="flex gap-6">
                    <button 
                        onClick={() => { setMode('PERSONA'); setErrorMsg(null); }}
                        className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${mode === 'PERSONA' ? 'text-emerald-400 border-emerald-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
                    >
                        <MessageSquare size={16}/> Persona & Vai trò
                    </button>
                    <button 
                        onClick={() => { setMode('KNOWLEDGE'); setErrorMsg(null); }}
                        className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${mode === 'KNOWLEDGE' ? 'text-emerald-400 border-emerald-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
                    >
                        <Database size={16}/> Dữ liệu & Đào tạo (RAG)
                    </button>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                
                {/* MODE: PERSONA */}
                {mode === 'PERSONA' && (
                    <div className="space-y-6 animate-fade-in">
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                    <label className="block text-slate-300 text-sm font-bold flex items-center gap-2">HƯỚNG DẪN HỆ THỐNG (SYSTEM PROMPT)</label>
                                    <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-bold ${isModified ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                                        {isModified ? 'Customized' : 'Default'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    {isModified && (
                                        <button onClick={() => setShowDefaultPreview(!showDefaultPreview)} className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 font-bold transition-colors">
                                            <Eye size={10}/> {showDefaultPreview ? 'Ẩn mặc định' : 'Xem mặc định'}
                                        </button>
                                    )}
                                    {isModified && (
                                        <button onClick={handleResetPersona} className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold transition-colors">
                                            <RotateCcw size={10}/> Khôi phục mặc định
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                            {showDefaultPreview && isModified && (
                                <div className="mb-2 p-3 bg-slate-950/50 border border-slate-800 rounded-lg">
                                    <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Nội dung mặc định</div>
                                    <div className="text-xs text-slate-400 font-mono whitespace-pre-wrap">{AGENT_PERSONAS[activeTab]}</div>
                                </div>
                            )}

                            <textarea 
                                value={effectivePrompt} 
                                onChange={(e) => handleInputChange('systemPrompt', e.target.value)} 
                                className={`w-full bg-slate-950 border rounded-xl p-4 text-white h-64 font-mono text-xs focus:outline-none leading-relaxed transition-all resize-none ${isModified ? 'border-amber-500/30 focus:border-amber-500' : 'border-slate-700 focus:border-emerald-500'}`}
                                placeholder="Mô tả vai trò và nhiệm vụ của Agent..."
                            />
                            <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1"><BrainCircuit size={12}/> AI sẽ tuân thủ nghiêm ngặt các hướng dẫn này trong quá trình tư vấn.</p>
                        </div>
                    </div>
                )}

                {/* MODE: KNOWLEDGE BASE */}
                {mode === 'KNOWLEDGE' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-emerald-900/10 border border-emerald-500/20 p-4 rounded-xl flex items-start gap-3">
                             <Database className="text-emerald-500 mt-1" size={20}/>
                             <div>
                                 <h3 className="text-emerald-400 font-bold text-sm">Knowledge Base (RAG)</h3>
                                 <p className="text-xs text-slate-400 mt-1">Tải lên các tài liệu pháp lý chuyên ngành (Luật, Nghị định, Án lệ...). Agent sẽ được "đào tạo" để trích xuất thông tin chính xác từ nguồn dữ liệu này thay vì trả lời chung chung.</p>
                             </div>
                        </div>

                        {/* Error Message Display */}
                        {errorMsg && (
                            <div className="bg-red-900/20 border border-red-500/30 p-3 rounded-lg flex items-center gap-2 text-red-400 text-xs font-bold animate-shake">
                                <AlertTriangle size={16}/> {errorMsg}
                            </div>
                        )}

                        {/* External URL Option */}
                        <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                            <label className="block text-slate-300 text-xs font-bold uppercase mb-2 flex items-center gap-2"><LinkIcon size={14}/> Endpoint / External Knowledge ID</label>
                            <div className="flex gap-2">
                                <input type="text" value={currentConfig.endpointUrl || ''} onChange={(e) => handleInputChange('endpointUrl', e.target.value)} placeholder="https://..." className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:border-emerald-500 focus:outline-none"/>
                                <input type="password" value={currentConfig.apiKey || ''} onChange={(e) => handleInputChange('apiKey', e.target.value)} placeholder="API Key (Optional)" className="w-40 bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:border-emerald-500 focus:outline-none"/>
                            </div>
                        </div>

                        {/* Document Upload Area */}
                        <div>
                             <div className="flex justify-between items-end mb-3">
                                <label className="block text-slate-300 text-xs font-bold uppercase">Tài liệu đã đào tạo ({currentConfig.documents?.length || 0})</label>
                                <button onClick={handleUploadFile} disabled={uploading} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50">
                                    {uploading ? <Loader2 size={14} className="animate-spin"/> : <Upload size={14}/>}
                                    {uploading ? 'Đang xử lý...' : 'Nạp tài liệu mới'}
                                </button>
                             </div>

                             <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                                 {(!currentConfig.documents || currentConfig.documents.length === 0) ? (
                                     <div className="p-8 text-center flex flex-col items-center justify-center text-slate-500">
                                         <FileText size={48} className="mb-3 opacity-20"/>
                                         <p className="text-sm">Chưa có tài liệu nào.</p>
                                         <p className="text-xs mt-1">Hỗ trợ PDF, DOCX, TXT (Max 50MB)</p>
                                     </div>
                                 ) : (
                                     <table className="w-full text-left text-sm">
                                         <thead className="bg-slate-900 text-slate-500 uppercase font-bold text-[10px]">
                                             <tr>
                                                 <th className="px-4 py-3">Tên File</th>
                                                 <th className="px-4 py-3">Loại</th>
                                                 <th className="px-4 py-3">Kích thước</th>
                                                 <th className="px-4 py-3">Trạng thái</th>
                                                 <th className="px-4 py-3 text-right">Hành động</th>
                                             </tr>
                                         </thead>
                                         <tbody className="divide-y divide-slate-800">
                                             {currentConfig.documents.map((doc) => (
                                                 <tr key={doc.id} className="hover:bg-slate-900/50 group">
                                                     <td className="px-4 py-3 font-medium text-slate-200 flex items-center gap-2">
                                                         <FileText size={14} className="text-slate-500"/> {doc.name}
                                                     </td>
                                                     <td className="px-4 py-3 text-slate-400 text-xs">{doc.type}</td>
                                                     <td className="px-4 py-3 text-slate-400 text-xs font-mono">{doc.size}</td>
                                                     <td className="px-4 py-3">
                                                         {doc.status === 'READY' ? (
                                                             <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-500/20 w-fit">
                                                                 <CheckCircle2 size={10}/> READY
                                                             </span>
                                                         ) : doc.status === 'INDEXING' ? (
                                                             <span className="flex items-center gap-1 text-[10px] text-amber-400 font-bold bg-amber-950/30 px-2 py-0.5 rounded border border-amber-500/20 w-fit animate-pulse">
                                                                 <Loader2 size={10} className="animate-spin"/> INDEXING...
                                                             </span>
                                                         ) : (
                                                             <span className="text-red-500 text-xs">ERROR</span>
                                                         )}
                                                     </td>
                                                     <td className="px-4 py-3 text-right">
                                                         <button onClick={() => handleDeleteDoc(doc.id)} className="text-slate-600 hover:text-red-500 transition-colors p-1">
                                                             <Trash2 size={14}/>
                                                         </button>
                                                     </td>
                                                 </tr>
                                             ))}
                                         </tbody>
                                     </table>
                                 )}
                             </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-800 flex justify-between items-center bg-slate-950">
                <div className="text-xs text-slate-500">
                    {isModified && <span className="text-amber-500">⚠ Có thay đổi chưa lưu</span>}
                </div>
                <button onClick={() => onSave(localConfigs)} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/20">
                    <Save size={18}/> Lưu cấu hình
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};