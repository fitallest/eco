import React, { useState } from 'react';
import { X, Phone, ShieldCheck, Zap } from 'lucide-react';
import { supabase } from '../services/supabase';

interface UpgradePopupProps {
  onClose: () => void;
  userId: string;
}

export const UpgradePopup: React.FC<UpgradePopupProps> = ({ onClose, userId }) => {
  const [phone, setPhone] = useState('');
  const [selectedPackage, setSelectedPackage] = useState('Gói Cơ Bản (200.000 VNĐ - 50 Điểm)');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBankInfo, setShowBankInfo] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      alert('Vui lòng nhập số điện thoại');
      return;
    }
    
    setIsSubmitting(true);
    
    // Update phone in users table
    await supabase.from('users').update({ phone }).eq('id', userId);
    
    // Create upgrade request
    const { error } = await supabase.from('upgrade_requests').insert([
      { user_id: userId, package_name: selectedPackage }
    ]);
    
    setIsSubmitting(false);
    
    if (error) {
      alert('Đã có lỗi xảy ra: ' + error.message);
    } else {
      setShowBankInfo(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-[#0f172a] border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white z-10">
          <X size={20} />
        </button>
        
        <div className="p-6">
          <div className="w-12 h-12 bg-emerald-500/20 text-emerald-500 rounded-xl flex items-center justify-center mb-4">
            <Zap size={24} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Bạn đã hết điểm Pháp lý</h2>
          <p className="text-sm text-slate-400 mb-6">Để tiếp tục sử dụng hệ thống AI và các dịch vụ chuyên sâu, vui lòng nâng cấp gói.</p>
          
          {!showBankInfo ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Gói Dịch Vụ</label>
                <select 
                  value={selectedPackage}
                  onChange={(e) => setSelectedPackage(e.target.value)}
                  className="w-full bg-[#1e293b] border border-slate-700 text-white p-3 rounded-xl outline-none focus:border-emerald-500"
                >
                  <option value="Gói Cơ Bản (200.000 VNĐ - 50 Điểm)">Gói Cơ Bản (200.000đ - 50 Điểm)</option>
                  <option value="Gói Doanh Nhân (500.000 VNĐ - 150 Điểm)">Gói Doanh Nhân (500.000đ - 150 Điểm)</option>
                  <option value="Gói Enterprise (2.000.000 VNĐ - Không giới hạn)">Gói Enterprise (2.000.000đ - Premium)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Số điện thoại liên hệ</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone size={16} className="text-slate-500" />
                  </div>
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Nhập số điện thoại của bạn..."
                    className="w-full bg-[#1e293b] border border-slate-700 text-white pl-10 p-3 rounded-xl outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-2">Chúng tôi cần số điện thoại để hỗ trợ bạn trong quá trình nâng cấp.</p>
              </div>
              
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold transition-colors disabled:opacity-50 mt-4"
              >
                {isSubmitting ? 'Đang gửi...' : 'Gửi Yêu Cầu Nâng Cấp'}
              </button>
            </form>
          ) : (
            <div className="bg-[#1e293b] border border-emerald-500/30 p-5 rounded-xl text-center">
              <ShieldCheck size={40} className="text-emerald-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-emerald-400 mb-2">Đã ghi nhận yêu cầu!</h3>
              <p className="text-sm text-slate-300 mb-4">Vui lòng chuyển khoản theo thông tin dưới đây. Hệ thống sẽ tự động cộng điểm sau khi nhận được thanh toán.</p>
              
              <div className="bg-[#0f172a] p-4 rounded-lg text-left text-sm font-mono text-slate-300 space-y-2">
                <div>Ngân hàng: <span className="text-white font-bold">Vietcombank</span></div>
                <div>Số tài khoản: <span className="text-white font-bold">1234567890</span></div>
                <div>Chủ tài khoản: <span className="text-white font-bold">CÔNG TY LUẬT ECOLAW</span></div>
                <div>Nội dung CK: <span className="text-emerald-400 font-bold">{phone} {selectedPackage.split(' ')[1]}</span></div>
              </div>
              
              <button 
                onClick={onClose}
                className="w-full mt-6 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-bold transition-colors"
              >
                Đóng
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
