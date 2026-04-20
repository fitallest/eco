import React from 'react';
import { Lock, Crown, X, ArrowRight, Zap } from 'lucide-react';
import { CREDIT_PACKS } from '../types';

interface CreditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: (mode: 'SUBSCRIPTION' | 'CREDITS') => void;
}

export const CreditModal: React.FC<CreditModalProps> = ({ isOpen, onClose, onUpgrade }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-md overflow-hidden relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={24} /></button>
        <div className="bg-gradient-to-r from-slate-950 to-slate-900 p-8 text-center border-b border-slate-800">
          <div className="mx-auto w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mb-4">
            <Lock className="text-red-500" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Hết Credits</h2>
          <p className="text-slate-400">Tài khoản miễn phí đã hết lượt sử dụng trong ngày.</p>
        </div>
        <div className="p-6 space-y-4">
            <div className="flex items-center p-4 border border-amber-900/50 bg-amber-950/20 rounded-xl cursor-pointer hover:bg-amber-900/30 transition-colors" onClick={() => { onClose(); onUpgrade('SUBSCRIPTION'); }}>
              <div className="bg-amber-900/50 p-2 rounded-lg mr-4"><Crown className="text-amber-400" size={24} /></div>
              <div>
                <h3 className="font-bold text-white">Nâng cấp PRO</h3>
                <p className="text-sm text-slate-400">Không giới hạn & Tốc độ cao</p>
              </div>
            </div>

            <div className="flex items-center p-4 border border-emerald-900/50 bg-emerald-950/20 rounded-xl cursor-pointer hover:bg-emerald-900/30 transition-colors" onClick={() => { onClose(); onUpgrade('CREDITS'); }}>
              <div className="bg-emerald-900/50 p-2 rounded-lg mr-4"><Zap className="text-emerald-400" size={24} /></div>
              <div>
                <h3 className="font-bold text-white">Mua thêm Credits</h3>
                <p className="text-sm text-slate-400">Chỉ từ {CREDIT_PACKS[0].price.toLocaleString('vi-VN')}đ / {CREDIT_PACKS[0].credits} Credits</p>
              </div>
            </div>

            <button onClick={onClose} className="w-full py-2 text-slate-500 text-sm hover:text-slate-300">
                Để sau
            </button>
        </div>
      </div>
    </div>
  );
};