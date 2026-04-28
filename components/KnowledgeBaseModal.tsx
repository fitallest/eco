import React, { useState, useEffect } from 'react';
import { Database, Upload, X, FileText, Trash2, ShieldCheck, Zap } from 'lucide-react';
import { saveDocumentToKB, getAllDocuments, deleteDocument } from '../services/ragService';

interface KnowledgeBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  userLevel: string;
}

export const KnowledgeBaseModal: React.FC<KnowledgeBaseModalProps> = ({ isOpen, onClose, userLevel }) => {
  const [documents, setDocuments] = useState<{id: string, title: string, chunks: number}[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (isOpen) {
      loadDocuments();
    }
  }, [isOpen]);

  const loadDocuments = () => {
    setDocuments(getAllDocuments());
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (userLevel !== 'Enterprise') {
      alert('Chức năng Knowledge Base (RAG) chỉ dành cho tài khoản Enterprise.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const text = reader.result as string;
      setIsUploading(true);
      setUploadProgress(0);
      try {
        await saveDocumentToKB(file.name, text, (progress) => {
          setUploadProgress(progress);
        });
        loadDocuments();
      } catch (err) {
        console.error(err);
        alert('Có lỗi xảy ra khi xử lý tài liệu.');
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset
  };

  const handleDelete = (id: string) => {
    if (confirm('Bạn có chắc muốn xóa tài liệu này khỏi Knowledge Base?')) {
      deleteDocument(id);
      loadDocuments();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-slate-900 w-full max-w-2xl rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Database className="text-emerald-500"/> Dữ Liệu Nội Bộ (RAG)
            </h2>
            <p className="text-sm text-slate-400">
              Quản lý tài liệu pháp lý riêng của doanh nghiệp. AI sẽ tự động tham chiếu dữ liệu này khi tư vấn.
            </p>
          </div>
          <button onClick={onClose}><X className="text-slate-500 hover:text-white" size={24}/></button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          {/* Upload Area */}
          <div className="relative group">
            <input 
              type="file" 
              accept=".txt" // For demo we stick to TXT files to avoid complex PDF parsing in browser
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
              disabled={isUploading || userLevel !== 'Enterprise'}
            />
            <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${userLevel === 'Enterprise' ? 'border-emerald-500/30 bg-emerald-500/5 group-hover:bg-emerald-500/10 group-hover:border-emerald-500' : 'border-slate-800 bg-slate-900 opacity-50'}`}>
              {isUploading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 animate-spin"></div>
                  <h3 className="font-bold text-emerald-400">Đang học tài liệu... {uploadProgress}%</h3>
                  <p className="text-xs text-slate-400">Quá trình Vector hóa (Embedding) đang diễn ra</p>
                </div>
              ) : (
                <>
                  <Upload className={`mx-auto mb-3 ${userLevel === 'Enterprise' ? 'text-emerald-500' : 'text-slate-500'}`} size={32}/>
                  <h3 className="font-bold text-white mb-1">Tải lên tài liệu mới (.txt)</h3>
                  {userLevel === 'Enterprise' ? (
                    <p className="text-xs text-slate-400">AI sẽ tự động đọc, chunking và lưu vào Vector Store.</p>
                  ) : (
                    <p className="text-xs text-red-400 flex items-center justify-center gap-1"><ShieldCheck size={12}/> Chỉ dành cho gói Enterprise</p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Document List */}
          <div>
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <FileText size={16}/> Danh sách tài liệu ({documents.length})
            </h3>
            
            {documents.length === 0 ? (
              <div className="text-center p-6 border border-slate-800 rounded-xl bg-slate-900/50">
                <p className="text-slate-500 text-sm">Chưa có tài liệu nào trong Knowledge Base.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map(doc => (
                  <div key={doc.id} className="flex justify-between items-center p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-xl transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 bg-emerald-500/20 text-emerald-500 rounded-lg shrink-0">
                        <Database size={20}/>
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-white text-sm truncate">{doc.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-mono bg-slate-900 text-emerald-400 px-2 py-0.5 rounded">ID: {doc.id.split('_')[1]}</span>
                          <span className="text-[10px] text-slate-500">{doc.chunks} chunks (Vector)</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDelete(doc.id)}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-900 rounded-lg transition-colors shrink-0"
                    >
                      <Trash2 size={18}/>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
