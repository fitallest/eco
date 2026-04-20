import React, { useState } from 'react';
import { X, Calendar, Clock, CreditCard, Shield, CheckCircle2, Star, User, Loader2 } from 'lucide-react';
import { LawyerProfile } from '../types';

interface BookingModalProps {
  lawyer: LawyerProfile;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({ lawyer, isOpen, onClose, onConfirm }) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  // Generate next 5 days
  const dates = Array.from({ length: 5 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    return {
      full: d.toISOString().split('T')[0],
      day: d.toLocaleDateString('vi-VN', { weekday: 'short' }),
      date: d.getDate(),
      month: d.getMonth() + 1
    };
  });

  const timeSlots = ['08:30', '09:30', '10:30', '13:30', '14:30', '15:30', '16:30'];

  const handleConfirm = () => {
    setIsProcessing(true);
    // Simulate API call and Payment
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      setTimeout(() => {
          onConfirm();
          onClose();
          // Reset states after closing
          setTimeout(() => {
            setIsSuccess(false);
            setSelectedDate(null);
            setSelectedTime(null);
          }, 300);
      }, 2000);
    }, 2000);
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in">
        <div className="bg-slate-900 border border-emerald-500/50 rounded-2xl p-10 flex flex-col items-center text-center max-w-sm w-full shadow-2xl shadow-emerald-900/20">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 animate-bounce">
                <CheckCircle2 className="text-emerald-500 w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Đặt lịch thành công!</h2>
            <p className="text-slate-400 text-sm">Hệ thống đã gửi email xác nhận và liên kết phòng họp online tới bạn.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in font-inter">
      <div className="bg-slate-900 w-full max-w-4xl rounded-2xl border border-slate-700 shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[90vh]">
        
        {/* Left: Lawyer Info */}
        <div className="w-full md:w-1/3 bg-slate-950 p-6 border-r border-slate-800 flex flex-col items-center text-center md:text-left">
            <div className="relative mb-4">
                <img src={lawyer.avatarUrl} alt={lawyer.name} className="w-24 h-24 rounded-full object-cover border-2 border-slate-700" />
                <div className="absolute bottom-0 right-0 w-5 h-5 bg-emerald-500 border-4 border-slate-950 rounded-full"></div>
            </div>
            <h2 className="text-xl font-bold text-white mb-1">{lawyer.name}</h2>
            <p className="text-emerald-400 text-sm font-medium mb-3">{lawyer.title}</p>
            
            <div className="flex items-center gap-4 text-xs text-slate-400 mb-6 bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
                <div className="flex items-center gap-1"><Star size={12} className="text-yellow-500 fill-current"/> {lawyer.rating}</div>
                <div className="w-px h-3 bg-slate-700"></div>
                <div className="flex items-center gap-1"><User size={12}/> {lawyer.experience} KN</div>
            </div>

            <div className="mt-auto w-full pt-6 border-t border-slate-800">
                <div className="text-slate-500 text-xs uppercase font-bold mb-1">Phí tư vấn (1 giờ)</div>
                <div className="text-2xl font-mono text-white font-bold">{lawyer.consultationFee.toLocaleString('vi-VN')} ₫</div>
            </div>
        </div>

        {/* Right: Calendar & Payment */}
        <div className="flex-1 p-6 md:p-8 flex flex-col bg-slate-900">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-lg font-bold text-white flex items-center gap-2"><Calendar size={20} className="text-emerald-500"/> Chọn thời gian tư vấn</h3>
               <button onClick={onClose}><X className="text-slate-500 hover:text-white" size={20}/></button>
            </div>

            {/* Date Selection */}
            <div className="mb-6">
                <label className="text-xs text-slate-500 font-bold uppercase mb-3 block">1. Ngày trong tuần</label>
                <div className="grid grid-cols-5 gap-2">
                    {dates.map((d) => (
                        <button 
                            key={d.full}
                            onClick={() => { setSelectedDate(d.full); setSelectedTime(null); }}
                            className={`p-2 rounded-xl border flex flex-col items-center transition-all ${selectedDate === d.full ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/30' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                        >
                            <span className="text-[10px] uppercase font-bold">{d.day}</span>
                            <span className="text-lg font-bold">{d.date}/{d.month}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Time Selection */}
            <div className="mb-8 flex-1">
                <label className="text-xs text-slate-500 font-bold uppercase mb-3 block">2. Giờ trống (GMT+7)</label>
                {!selectedDate ? (
                    <div className="text-center p-8 border border-dashed border-slate-800 rounded-xl text-slate-600 text-sm">
                        Vui lòng chọn ngày trước
                    </div>
                ) : (
                    <div className="grid grid-cols-4 gap-3 animate-fade-in">
                        {timeSlots.map(time => (
                            <button
                                key={time}
                                onClick={() => setSelectedTime(time)}
                                className={`py-2 rounded-lg text-sm font-mono font-medium border transition-all ${selectedTime === time ? 'bg-emerald-900/30 border-emerald-500 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-600'}`}
                            >
                                {time}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer / Payment Action */}
            <div className="border-t border-slate-800 pt-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                        <CreditCard size={16}/> Thanh toán qua thẻ liên kết
                    </div>
                    <div className="text-xs text-emerald-500 flex items-center gap-1">
                        <Shield size={12}/> Bảo mật SSL
                    </div>
                </div>
                <button 
                    onClick={handleConfirm}
                    disabled={!selectedDate || !selectedTime || isProcessing}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/20"
                >
                    {isProcessing ? <Loader2 className="animate-spin"/> : <CheckCircle2 size={18}/>}
                    {isProcessing ? 'Đang xử lý giao dịch...' : `Xác nhận & Thanh toán (${lawyer.consultationFee.toLocaleString()}đ)`}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};