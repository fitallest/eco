import React, { useState } from 'react';
import { LogOut, CreditCard, Star, LayoutGrid, ChevronDown, User, Shield } from 'lucide-react';
import { UserProfile } from '../types';
import { supabase } from '../services/supabase';

interface UserMenuProps {
  currentUser: UserProfile;
  onTriggerUpgrade: (mode?: 'SUBSCRIPTION' | 'CREDITS') => void;
  onCommand: (cmd: string) => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({ currentUser, onTriggerUpgrade, onCommand }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const getInitial = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  const isAdmin = currentUser.level === 'Enterprise' || currentUser.email.toLowerCase() === 'caophi.nasani@gmail.com';

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 pl-2 pr-1 md:pr-3 rounded-full hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-all bg-slate-900/50 relative z-50"
      >
        <div className="hidden md:flex flex-col items-end mr-1 text-left">
          <span className="text-xs font-bold text-slate-200 truncate max-w-[100px]">{currentUser.name}</span>
          <span className="text-[10px] font-mono text-emerald-400 font-bold">{currentUser.credits} CR</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold border-2 border-slate-900 shadow-sm relative shrink-0">
          {getInitial(currentUser.name)}
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full"></div>
        </div>
        <ChevronDown size={14} className="text-slate-400 shrink-0 hidden md:block" />
      </button>

      {isOpen && (
        <>
          {/* Invisible backdrop to capture outside clicks reliably */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Menu */}
          <div className="absolute right-0 top-full mt-2 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-950/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-lg border-2 border-slate-800 shadow-sm shrink-0">
                  {getInitial(currentUser.name)}
                </div>
                <div className="flex-col min-w-0 flex-1">
                  <div className="text-sm font-bold text-white truncate">{currentUser.name}</div>
                  <div className="text-xs text-slate-400 truncate">{currentUser.email}</div>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Số dư Credits</span>
                  <span className="text-sm font-mono font-bold text-emerald-400">{currentUser.credits} CR</span>
                </div>
                <button 
                  onClick={() => { setIsOpen(false); onTriggerUpgrade('CREDITS'); }}
                  className="px-2.5 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-md text-xs font-bold transition-colors cursor-pointer"
                >
                  Nạp thêm
                </button>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              <div className="px-3 py-1.5">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 ml-1">Tài khoản</div>
                <button 
                  onClick={() => { setIsOpen(false); onTriggerUpgrade('SUBSCRIPTION'); }}
                  className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-emerald-400 rounded-lg flex items-center gap-2.5 transition-colors group cursor-pointer"
                >
                  <Star size={16} className="text-slate-400 group-hover:text-emerald-400" /> 
                  <span className="flex-1">Gói dịch vụ</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 rounded text-slate-400">{currentUser.level}</span>
                </button>
                
                <button 
                  onClick={() => { setIsOpen(false); alert('Tính năng đang phát triển'); }}
                  className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg flex items-center gap-2.5 transition-colors group cursor-pointer"
                >
                  <User size={16} className="text-slate-400 group-hover:text-white" /> 
                  Thông tin cá nhân
                </button>
              </div>

              {isAdmin && (
                <div className="px-3 py-1.5 border-t border-slate-800/50 mt-1">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 ml-1">Quản trị</div>
                  <button 
                    onClick={() => { setIsOpen(false); onCommand('/admin'); }}
                    className="w-full text-left px-3 py-2 text-sm text-amber-400/90 hover:bg-amber-900/20 hover:text-amber-400 rounded-lg flex items-center gap-2.5 transition-colors group cursor-pointer"
                  >
                    <Shield size={16} className="text-amber-500/70 group-hover:text-amber-500" /> 
                    Trang quản trị (Admin)
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-2 border-t border-slate-800 bg-slate-950/50">
              <button 
                onClick={() => { setIsOpen(false); handleSignOut(); }}
                className="w-full text-left px-3 py-2 text-sm text-red-400/90 hover:bg-red-900/20 hover:text-red-400 rounded-lg flex items-center gap-2.5 transition-colors group cursor-pointer"
              >
                <LogOut size={16} className="text-red-400/70 group-hover:text-red-400" /> 
                Đăng xuất
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
