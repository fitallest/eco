import React from 'react';
import { FileText, X, Cpu } from 'lucide-react';
import { DocumentTemplate, LEGAL_DOCUMENTS } from '../types';

interface DraftDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDoc: DocumentTemplate | null;
  onSelectDoc: (doc: DocumentTemplate | null) => void;
  onCheckAndSelectDoc: (doc: DocumentTemplate) => void;
  formData: Record<string, string>;
  setFormData: (data: Record<string, string>) => void;
  onGenerate: () => void;
  userCredits: number;
  userLevel: string;
}

export const DraftDocumentModal: React.FC<DraftDocumentModalProps> = ({
  isOpen,
  onClose,
  selectedDoc,
  onSelectDoc,
  onCheckAndSelectDoc,
  formData,
  setFormData,
  onGenerate,
  userCredits,
  userLevel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
        <div className="bg-slate-900 w-full max-w-4xl rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <FileText className="text-emerald-500"/> 
                        {selectedDoc ? `Soạn thảo: ${selectedDoc.name}` : 'Dịch vụ Soạn thảo Văn bản'}
                    </h2>
                    <p className="text-sm text-slate-400">
                        {selectedDoc ? 'Vui lòng điền thông tin bên dưới để AI soạn thảo ngay lập tức.' : 'Chọn loại văn bản bạn cần hỗ trợ soạn thảo. AI sẽ phỏng vấn bạn để lấy thông tin.'}
                    </p>
                </div>
                <button onClick={onClose}><X className="text-slate-500 hover:text-white" size={24}/></button>
            </div>
            
            {selectedDoc ? (
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {selectedDoc.fields?.map((field) => (
                            <div key={field.id} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                                    {field.label} {field.required && <span className="text-red-500">*</span>}
                                </label>
                                {field.type === 'textarea' ? (
                                    <textarea
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white focus:border-emerald-500 focus:outline-none transition-colors"
                                        rows={3}
                                        placeholder={field.placeholder}
                                        value={formData[field.id] || ''}
                                        onChange={(e) => setFormData({...formData, [field.id]: e.target.value})}
                                    />
                                ) : (
                                    <input
                                        type={field.type}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white focus:border-emerald-500 focus:outline-none transition-colors"
                                        placeholder={field.placeholder}
                                        value={formData[field.id] || ''}
                                        onChange={(e) => setFormData({...formData, [field.id]: e.target.value})}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                        <button 
                            onClick={() => onSelectDoc(null)}
                            className="px-4 py-2 rounded-lg text-sm font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                            Quay lại
                        </button>
                        <button 
                            onClick={onGenerate}
                            className="px-6 py-2 rounded-lg text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 flex items-center gap-2"
                        >
                            <Cpu size={16} /> Tạo Văn Bản Ngay ({selectedDoc.price} CR)
                        </button>
                    </div>
                </div>
            ) : (
                <div className="p-6 overflow-y-auto custom-scrollbar grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {LEGAL_DOCUMENTS.map((doc) => {
                        const Icon = doc.icon;
                        const canAfford = userCredits >= doc.price || userLevel === 'Enterprise';
                        return (
                            <div 
                              key={doc.id} 
                              onClick={() => onCheckAndSelectDoc(doc)}
                              className={`border rounded-xl p-5 flex flex-col transition-all relative overflow-hidden group hover:border-emerald-500/50 cursor-pointer ${canAfford ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-950 border-slate-800 opacity-80'}`}
                            >
                                <div className={`p-3 rounded-lg w-fit mb-3 ${canAfford ? 'bg-emerald-900/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                                    <Icon size={24}/>
                                </div>
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-white">{doc.name}</h3>
                                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">{doc.category}</span>
                                </div>
                                <p className="text-xs text-slate-400 mb-4 flex-1">{doc.description}</p>
                                
                                <div className="mt-auto flex justify-between items-center pt-3 border-t border-slate-800">
                                    <div className={`font-mono font-bold ${canAfford ? 'text-emerald-400' : 'text-red-400'}`}>{doc.price} CR</div>
                                    <button 
                                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${canAfford ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
                                    >
                                        {canAfford ? 'Chọn' : 'Thiếu CR'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    </div>
  );
};
