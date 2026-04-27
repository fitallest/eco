import React, { useState } from 'react';
import { X, Calculator, FileText, Gavel, Phone, Grid, ScanLine, Shield } from 'lucide-react';
import { LegalCalculator } from './tools/LegalCalculator';
import { DocumentAnalyzer } from './tools/DocumentAnalyzer';
import { MockTrial } from './tools/MockTrial';
import { VoiceLawyer } from './tools/VoiceLawyer';
import { DocumentScanner } from './tools/DocumentScanner';
import { ContractAnalyzer } from './tools/ContractAnalyzer';

interface LegalToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ToolType = 'CALCULATOR' | 'DOC_ANALYZER' | 'MOCK_TRIAL' | 'VOICE_LAWYER' | 'DOC_SCANNER' | 'CONTRACT_ANALYZER' | 'MENU';

export const LegalToolsModal: React.FC<LegalToolsModalProps> = ({ isOpen, onClose }) => {
  const [activeTool, setActiveTool] = useState<ToolType>('MENU');
  const [scannerOutput, setScannerOutput] = useState<{ text: string; metadata: Record<string, string> } | null>(null);

  if (!isOpen) return null;

  const handleScanToAnalyze = (text: string, metadata: Record<string, string>) => {
    setScannerOutput({ text, metadata });
    setActiveTool('CONTRACT_ANALYZER');
  };

  const toolTitle: Record<ToolType, string> = {
    MENU: 'HỆ SINH THÁI TIỆN ÍCH',
    CALCULATOR: 'MÁY TÍNH PHÁP LÝ',
    DOC_ANALYZER: 'REVIEW HỢP ĐỒNG',
    MOCK_TRIAL: 'PHIÊN TÒA GIẢ ĐỊNH',
    VOICE_LAWYER: 'TỔNG ĐÀI LUẬT SƯ AI',
    DOC_SCANNER: 'QUÉT TÀI LIỆU THÔNG MINH',
    CONTRACT_ANALYZER: 'PHÂN TÍCH RỦI RO HỢP ĐỒNG'
  };

  const renderContent = () => {
    switch (activeTool) {
      case 'CALCULATOR': return <LegalCalculator />;
      case 'DOC_ANALYZER': return <DocumentAnalyzer />;
      case 'MOCK_TRIAL': return <MockTrial />;
      case 'VOICE_LAWYER': return <VoiceLawyer />;
      case 'DOC_SCANNER': return (
        <DocumentScanner
          onAnalyzeContract={handleScanToAnalyze}
          onScanComplete={(doc) => console.log('Scanned:', doc)}
        />
      );
      case 'CONTRACT_ANALYZER': return (
        <ContractAnalyzer
          initialDocument={scannerOutput || undefined}
          onBack={() => { setActiveTool('DOC_SCANNER'); setScannerOutput(null); }}
        />
      );
      default: return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
          {/* Document Scanner - NEW Phase 1 */}
          <button onClick={() => setActiveTool('DOC_SCANNER')} className="bg-slate-900 hover:bg-slate-800 border border-slate-700 p-6 rounded-xl flex flex-col items-center gap-4 transition-all hover:border-emerald-500 group relative overflow-hidden">
            <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">MỚI</div>
            <div className="w-12 h-12 bg-emerald-900/20 rounded-full flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform"><ScanLine size={24}/></div>
            <div className="text-center">
              <h3 className="font-bold text-white mb-1">Quét Tài Liệu</h3>
              <p className="text-xs text-slate-400">Quét Sổ đỏ, CCCD, Hợp đồng qua camera hoặc upload ảnh.</p>
            </div>
          </button>

          {/* Contract Risk Analyzer - NEW Phase 2 */}
          <button onClick={() => { setScannerOutput(null); setActiveTool('CONTRACT_ANALYZER'); }} className="bg-slate-900 hover:bg-slate-800 border border-slate-700 p-6 rounded-xl flex flex-col items-center gap-4 transition-all hover:border-red-500 group relative overflow-hidden">
            <div className="absolute top-2 right-2 bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">MỚI</div>
            <div className="w-12 h-12 bg-red-900/20 rounded-full flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform"><Shield size={24}/></div>
            <div className="text-center">
              <h3 className="font-bold text-white mb-1">Phân Tích Rủi Ro HĐ</h3>
              <p className="text-xs text-slate-400">Tự động phát hiện điều khoản gài bẫy & đề xuất sửa đổi.</p>
            </div>
          </button>

          {/* Existing tools */}
          <button onClick={() => setActiveTool('CALCULATOR')} className="bg-slate-900 hover:bg-slate-800 border border-slate-700 p-6 rounded-xl flex flex-col items-center gap-4 transition-all hover:border-emerald-500 group">
            <div className="w-12 h-12 bg-emerald-900/20 rounded-full flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform"><Calculator size={24}/></div>
            <div className="text-center">
              <h3 className="font-bold text-white mb-1">Máy Tính Pháp Lý</h3>
              <p className="text-xs text-slate-400">Tính án phí, lãi suất, chia thừa kế nhanh chóng.</p>
            </div>
          </button>
          
          <button onClick={() => setActiveTool('DOC_ANALYZER')} className="bg-slate-900 hover:bg-slate-800 border border-slate-700 p-6 rounded-xl flex flex-col items-center gap-4 transition-all hover:border-emerald-500 group">
            <div className="w-12 h-12 bg-blue-900/20 rounded-full flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform"><FileText size={24}/></div>
            <div className="text-center">
              <h3 className="font-bold text-white mb-1">Review Hợp Đồng</h3>
              <p className="text-xs text-slate-400">AI quét rủi ro pháp lý trong văn bản của bạn.</p>
            </div>
          </button>

          <button onClick={() => setActiveTool('MOCK_TRIAL')} className="bg-slate-900 hover:bg-slate-800 border border-slate-700 p-6 rounded-xl flex flex-col items-center gap-4 transition-all hover:border-emerald-500 group">
            <div className="w-12 h-12 bg-amber-900/20 rounded-full flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform"><Gavel size={24}/></div>
            <div className="text-center">
              <h3 className="font-bold text-white mb-1">Phiên Tòa Giả Định</h3>
              <p className="text-xs text-slate-400">Tập tranh tụng với Thẩm phán AI ảo.</p>
            </div>
          </button>

          <button onClick={() => setActiveTool('VOICE_LAWYER')} className="bg-slate-900 hover:bg-slate-800 border border-slate-700 p-6 rounded-xl flex flex-col items-center gap-4 transition-all hover:border-emerald-500 group">
            <div className="w-12 h-12 bg-red-900/20 rounded-full flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform"><Phone size={24}/></div>
            <div className="text-center">
              <h3 className="font-bold text-white mb-1">Tổng Đài Luật Sư AI</h3>
              <p className="text-xs text-slate-400">Gọi điện tư vấn trực tiếp (Voice Call).</p>
            </div>
          </button>
        </div>
      );
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 animate-fade-in flex flex-col font-inter">
      <div className="flex-1 flex flex-col w-full h-full overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900 shadow-md z-10">
          <div className="flex items-center gap-4">
             {activeTool !== 'MENU' && (
               <button onClick={() => { setActiveTool('MENU'); setScannerOutput(null); }} className="text-slate-400 hover:text-white text-xs font-bold uppercase flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg transition-colors">
                 <Grid size={14}/> Menu
               </button>
             )}
             <h2 className="text-xl font-bold text-white flex items-center gap-2 font-mono">
               {toolTitle[activeTool]}
             </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-red-500/20 hover:text-red-500 rounded-lg transition-colors"><X size={24}/></button>
        </div>
        
        <div className="flex-1 p-0 overflow-hidden bg-[#020617] relative">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>
          <div className={`relative z-10 h-full ${activeTool === 'CONTRACT_ANALYZER' || activeTool === 'DOC_SCANNER' ? '' : 'p-4 md:p-6 max-w-7xl mx-auto'}`}>
             {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};
