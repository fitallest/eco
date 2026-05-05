import React, { useState, useEffect } from 'react';
import { X, CheckCircle, CreditCard, Shield, Globe, Lock, Loader2, Zap, LayoutGrid } from 'lucide-react';
import { PlanConfig, UserLevel, CREDIT_PACKS, UserProfile } from '../types';
import { supabase } from '../services/supabase';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  plans: Record<UserLevel, PlanConfig>;
  onSuccess: (planId: string, amount: number) => void;
  currentLevel: UserLevel;
  initialMode?: 'SUBSCRIPTION' | 'CREDITS';
  currentUser: UserProfile;
}

type PurchaseMode = 'SUBSCRIPTION' | 'CREDITS';

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, plans, onSuccess, currentLevel, initialMode = 'SUBSCRIPTION', currentUser }) => {
  const [mode, setMode] = useState<PurchaseMode>(initialMode);
  const [selectedId, setSelectedId] = useState<string>('Gold');
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);
  
  // Registration form state
  const [phone, setPhone] = useState(currentUser?.phone || '');

  useEffect(() => {
    if (isOpen) {
        setMode(initialMode);
        // Reset selection based on mode
        if (initialMode === 'SUBSCRIPTION') setSelectedId('Gold');
        else setSelectedId(CREDIT_PACKS[0].id);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  // Determine selected item based on mode
  const targetItem = mode === 'SUBSCRIPTION' 
    ? plans[selectedId as UserLevel] 
    : CREDIT_PACKS.find(p => p.id === selectedId);

  const price = targetItem?.price.toLocaleString('vi-VN') || '0';

  const handlePayment = async () => {
    if (!targetItem) return;
    if (!phone.trim()) {
        alert("Vui lòng nhập số điện thoại để tư vấn viên liên hệ hỗ trợ.");
        return;
    }

    setProcessing(true);
    
    try {
        // 1. Update user phone in public.users if not present or different
        if (phone !== currentUser.phone && currentUser.id) {
            await supabase.from('users').update({ phone: phone }).eq('id', currentUser.id);
        }

        // 2. Insert into public.upgrade_requests
        const { error } = await supabase.from('upgrade_requests').insert({
            user_id: currentUser.id,
            package_name: targetItem.name
            // status default is 'PENDING', created_at default is now()
        });

        if (error) throw error;

        setCompleted(true);
        setTimeout(() => {
            setCompleted(false);
            setProcessing(false);
            onClose();
            // Note: We DO NOT call onSuccess() here anymore because we wait for manual approval
        }, 3000);
    } catch (err: any) {
        console.error("Error submitting upgrade request:", err);
        alert("Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại sau.");
        setProcessing(false);
    }
  };

  if (completed && targetItem) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in">
        <div className="bg-slate-900 border border-emerald-500/50 rounded-2xl p-12 flex flex-col items-center text-center max-w-sm w-full">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
                <CheckCircle className="text-emerald-500 w-10 h-10 animate-bounce" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Đã gửi yêu cầu!</h2>
            <p className="text-slate-400">Yêu cầu đăng ký gói {targetItem.name} của bạn đã được gửi đến Ban Quản Trị. Vui lòng chờ phê duyệt.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-slate-900 w-full max-w-4xl rounded-2xl border border-slate-700 shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[92vh]">
        
        {/* Left Side: Selection */}
        <div className="w-full md:w-1/3 bg-slate-950 p-4 md:p-6 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col">
          <div className="flex bg-slate-900 p-1 rounded-lg mb-6 border border-slate-800">
            <button
                onClick={() => { setMode('SUBSCRIPTION'); setSelectedId('Gold'); }}
                className={`flex-1 py-2 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2 ${mode === 'SUBSCRIPTION' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
               <Shield size={14}/> Gói Hội Viên
            </button>
            <button
                onClick={() => { setMode('CREDITS'); setSelectedId(CREDIT_PACKS[0].id); }}
                className={`flex-1 py-2 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2 ${mode === 'CREDITS' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
               <Zap size={14}/> Mua Credits
            </button>
          </div>
          
          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
             {mode === 'SUBSCRIPTION' ? (
                 <>
                    <div 
                        onClick={() => setSelectedId('Gold')}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedId === 'Gold' ? 'bg-amber-900/20 border-amber-500/50 ring-1 ring-amber-500/50' : 'bg-slate-900 border-slate-800 hover:bg-slate-800'}`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className="font-bold text-amber-400">GOLD PRO</span>
                            <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">Phổ biến</span>
                        </div>
                        <div className="text-2xl font-bold text-white mb-2">1.990.000₫<span className="text-xs text-slate-500 font-normal">/tháng</span></div>
                        <ul className="text-xs text-slate-400 space-y-1">
                            <li>• 500 Credits/tháng</li>
                            <li>• Mở khóa Agent chuyên sâu</li>
                            <li>• Tốc độ ưu tiên</li>
                        </ul>
                    </div>

                    <div 
                        onClick={() => setSelectedId('Enterprise')}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedId === 'Enterprise' ? 'bg-purple-900/20 border-purple-500/50 ring-1 ring-purple-500/50' : 'bg-slate-900 border-slate-800 hover:bg-slate-800'}`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className="font-bold text-purple-400">ENTERPRISE</span>
                        </div>
                        <div className="text-2xl font-bold text-white mb-2">15.000.000₫<span className="text-xs text-slate-500 font-normal">/tháng</span></div>
                        <ul className="text-xs text-slate-400 space-y-1">
                            <li>• Không giới hạn Credits</li>
                            <li>• API & Knowledge Base riêng</li>
                            <li>• Hỗ trợ 24/7</li>
                        </ul>
                    </div>
                 </>
             ) : (
                 <>
                    {CREDIT_PACKS.map(pack => (
                        <div 
                            key={pack.id}
                            onClick={() => setSelectedId(pack.id)}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedId === pack.id ? 'bg-emerald-900/20 border-emerald-500/50 ring-1 ring-emerald-500/50' : 'bg-slate-900 border-slate-800 hover:bg-slate-800'}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="font-bold text-emerald-400">{pack.name}</span>
                            </div>
                            <div className="text-2xl font-bold text-white mb-2">{pack.price.toLocaleString('vi-VN')}₫</div>
                            <div className="text-sm font-bold text-emerald-300 mb-2 flex items-center gap-1"><Zap size={14} className="fill-current"/> {pack.credits} Credits</div>
                            <ul className="text-xs text-slate-400 space-y-1">
                                {pack.features.map((f, i) => <li key={i}>• {f}</li>)}
                            </ul>
                        </div>
                    ))}
                 </>
             )}
          </div>
        </div>

        {/* Right Side: Registration Form */}
        <div className="flex-1 p-4 md:p-8 flex flex-col bg-[#0f172a] overflow-y-auto">
           <div className="flex justify-between items-center mb-6">
               <h2 className="text-xl font-bold text-white">Đăng ký dịch vụ</h2>
               <button onClick={onClose}><X className="text-slate-500 hover:text-white" /></button>
           </div>

           <div className="bg-emerald-900/10 border border-emerald-500/30 rounded-xl p-4 mb-6">
               <h3 className="text-emerald-400 font-bold mb-1 flex items-center gap-2"><Zap size={16}/> {targetItem?.name}</h3>
               <p className="text-sm text-slate-300">Quý khách đang tạo yêu cầu đăng ký gói <strong>{targetItem?.name}</strong> với giá <strong>{price} ₫</strong>.</p>
               <p className="text-xs text-slate-500 mt-2">Yêu cầu sẽ được gửi đến Ban Quản Trị để xét duyệt trước khi cộng điểm.</p>
           </div>

           {/* Registration Form */}
           <div className="space-y-4 mb-8 flex-1">
               <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 opacity-70">
                   <label className="text-xs text-slate-500 uppercase font-bold mb-2 block">Email tài khoản</label>
                   <input 
                     type="email" 
                     value={currentUser.email}
                     disabled
                     className="bg-transparent w-full text-slate-300 focus:outline-none"
                    />
               </div>
               <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                    <label className="text-xs text-slate-500 uppercase font-bold mb-2 block">Số điện thoại liên hệ <span className="text-red-400">*</span></label>
                    <input 
                        type="text" 
                        placeholder="Nhập số điện thoại của bạn..." 
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        className="bg-transparent w-full text-white focus:outline-none"
                    />
               </div>
           </div>

           {/* Footer */}
           <div className="mt-auto">
               <div className="flex justify-between items-center text-sm mb-4 text-slate-400">
                   <span>Tổng giá trị gói:</span>
                   <span className="text-xl font-bold text-white">{price} ₫</span>
               </div>
               <button 
                onClick={handlePayment} 
                disabled={processing || !targetItem || !phone.trim()}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/20"
               >
                   {processing ? <Loader2 className="animate-spin"/> : <Shield size={18}/>}
                   {processing ? 'Đang gửi yêu cầu...' : `Gửi Yêu Cầu Đăng Ký`}
               </button>
               <div className="text-center mt-4 text-[10px] text-slate-500 flex justify-center gap-2 items-center">
                   Sau khi gửi yêu cầu, vui lòng theo dõi email hoặc liên hệ CSKH.
               </div>
           </div>
        </div>
      </div>
    </div>
  );
};