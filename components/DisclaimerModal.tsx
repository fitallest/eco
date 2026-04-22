import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, Gavel, AlertTriangle, Terminal, Scale } from 'lucide-react';

interface DisclaimerModalProps {
  onAccept: () => void;
}

export const DisclaimerModal: React.FC<DisclaimerModalProps> = ({ onAccept }) => {
  const [canAccept, setCanAccept] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const bottom = e.currentTarget.scrollHeight - e.currentTarget.scrollTop === e.currentTarget.clientHeight;
    // Optional: Force scroll to bottom to accept. For now, we allow immediate acceptance for UX.
    // if (bottom) setCanAccept(true);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020617] p-4 font-inter">
      <div className="bg-slate-900 w-full max-w-2xl rounded-2xl border border-slate-700 shadow-2xl flex flex-col max-h-[90vh] relative overflow-hidden">
        
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-slate-800 bg-slate-950 flex items-center gap-3 md:gap-4">
          <div className="p-2 md:p-3 bg-red-900/20 border border-red-500/30 rounded-xl text-red-500 shrink-0">
            <ShieldAlert size={24} className="md:w-8 md:h-8" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base md:text-xl font-bold text-white uppercase tracking-wide">Tuyên bố miễn trừ trách nhiệm</h1>
            <p className="text-xs md:text-sm text-slate-400">Vui lòng đọc kỹ và xác nhận trước khi sử dụng hệ thống ECOLAW.AI</p>
          </div>
        </div>

        {/* Scrollable Content */}
        <div 
          className="p-6 md:p-8 overflow-y-auto custom-scrollbar space-y-6 text-sm text-slate-300 leading-relaxed"
          onScroll={handleScroll}
        >
          {/* Section 1: AI Limitation */}
          <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700">
            <h3 className="text-emerald-400 font-bold flex items-center gap-2 mb-2">
              <Scale size={16} /> 1. Bản chất hệ thống
            </h3>
            <p>
              ECOLAW.AI là hệ thống tư vấn pháp lý tự động sử dụng Trí tuệ nhân tạo (AI). 
              Các câu trả lời được sinh ra bởi mô hình ngôn ngữ lớn và <strong className="text-white">KHÔNG thay thế cho tư vấn pháp lý chính thức</strong> từ luật sư hoặc cơ quan có thẩm quyền.
              Chúng tôi khuyến nghị người dùng luôn đối chiếu lại thông tin với văn bản pháp luật gốc.
            </p>
          </div>

          {/* Section 2: Data Accuracy */}
          <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700">
             <h3 className="text-amber-400 font-bold flex items-center gap-2 mb-2">
              <AlertTriangle size={16} /> 2. Tính chính xác & Ảo giác AI
            </h3>
            <p>
              Mặc dù hệ thống được cập nhật dữ liệu thường xuyên, AI có thể gặp hiện tượng "ảo giác" (hallucination) hoặc đưa ra thông tin về các văn bản luật đã hết hiệu lực. 
              Nhà phát triển không chịu trách nhiệm về bất kỳ thiệt hại nào (trực tiếp hoặc gián tiếp) phát sinh từ việc sử dụng thông tin do ECOLAW.AI cung cấp.
            </p>
          </div>

          {/* Section 3: Technical Tampering */}
          <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700">
             <h3 className="text-red-400 font-bold flex items-center gap-2 mb-2">
              <Terminal size={16} /> 3. Can thiệp kỹ thuật & Gian lận
            </h3>
            <p>
              Nghiêm cấm mọi hành vi sử dụng công cụ kỹ thuật (F12, Console, Bot, Script...) để can thiệp vào giao diện, thay đổi nội dung phản hồi của AI, hoặc giả mạo kết quả tư vấn nhằm mục đích lừa đảo, vi phạm pháp luật hoặc trục lợi.
              Mọi kết quả bị chỉnh sửa client-side đều <strong className="text-white">vô giá trị về mặt pháp lý</strong> và vi phạm điều khoản sử dụng.
            </p>
          </div>

          {/* Section 4: User Responsibility */}
          <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700">
             <h3 className="text-blue-400 font-bold flex items-center gap-2 mb-2">
              <Gavel size={16} /> 4. Trách nhiệm người dùng
            </h3>
            <p>
              Người dùng cam kết không sử dụng hệ thống để tìm kiếm các tư vấn nhằm mục đích phạm pháp, lách luật, hoặc gây hại cho an ninh quốc gia, trật tự an toàn xã hội.
              Chúng tôi có quyền từ chối phục vụ và khóa tài khoản vĩnh viễn nếu phát hiện dấu hiệu vi phạm.
            </p>
          </div>

          <p className="text-xs text-slate-500 italic mt-4 text-center">
            * Bằng việc nhấn "Tôi Đồng Ý", bạn xác nhận đã hiểu rõ các rủi ro và cam kết tuân thủ các điều khoản trên.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-800 bg-slate-950 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
             <ShieldAlert size={14}/> ID Thiết bị: {typeof window !== 'undefined' ? window.navigator.userAgent.slice(0, 20) + '...' : 'Unknown'}
          </div>
          <button 
            onClick={onAccept}
            className="w-full md:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
          >
            <CheckCircle2 size={18} /> TÔI ĐỒNG Ý & TIẾP TỤC
          </button>
        </div>
      </div>
    </div>
  );
};