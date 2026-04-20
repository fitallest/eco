import React, { useState, useEffect } from 'react';
import { X, Save, Check, Plus, Trash2, CreditCard } from 'lucide-react';
import { PlanConfig } from '../types';

interface PlanSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: PlanConfig | null;
  onSave: (updatedPlan: PlanConfig) => void;
}

export const PlanSettingsModal: React.FC<PlanSettingsModalProps> = ({ isOpen, onClose, plan, onSave }) => {
  const [localPlan, setLocalPlan] = useState<PlanConfig | null>(null);
  const [newFeature, setNewFeature] = useState('');

  useEffect(() => {
    setLocalPlan(plan);
  }, [plan, isOpen]);

  if (!isOpen || !localPlan) return null;

  const handleAddFeature = () => {
    if (newFeature.trim()) {
      setLocalPlan({
        ...localPlan,
        features: [...localPlan.features, newFeature.trim()]
      });
      setNewFeature('');
    }
  };

  const handleRemoveFeature = (index: number) => {
    setLocalPlan({
      ...localPlan,
      features: localPlan.features.filter((_, i) => i !== index)
    });
  };

  const handleSave = () => {
    if (localPlan) {
      onSave(localPlan);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
          <div className="flex items-center gap-3">
             <div className={`p-2 rounded-lg bg-${localPlan.color}-900/20 border border-${localPlan.color}-500/30 text-${localPlan.color}-400`}>
                <CreditCard size={20}/>
             </div>
             <div>
                <h3 className="font-bold text-white text-lg">Cấu hình Gói {localPlan.name}</h3>
                <p className="text-xs text-slate-500">ID: {localPlan.id}</p>
             </div>
          </div>
          <button onClick={onClose}><X className="text-slate-500 hover:text-white" size={20} /></button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
            {/* Pricing & Credits */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Giá (VNĐ)</label>
                    <input 
                        type="number" 
                        value={localPlan.price} 
                        onChange={e => setLocalPlan({...localPlan, price: Number(e.target.value)})} 
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-emerald-500 focus:outline-none font-mono"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Credits / Tháng</label>
                    <input 
                        type="number" 
                        value={localPlan.monthlyCredits} 
                        onChange={e => setLocalPlan({...localPlan, monthlyCredits: Number(e.target.value)})} 
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-emerald-500 focus:outline-none font-mono"
                    />
                </div>
            </div>

            {/* Features List */}
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Danh sách tính năng hiển thị</label>
                <div className="space-y-2 mb-3">
                    {localPlan.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-slate-800/50 p-2 rounded-lg border border-slate-700 group">
                            <Check size={14} className="text-emerald-500 flex-shrink-0"/>
                            <span className="text-sm text-slate-300 flex-1">{feature}</span>
                            <button onClick={() => handleRemoveFeature(idx)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                                <Trash2 size={16}/>
                            </button>
                        </div>
                    ))}
                </div>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={newFeature} 
                        onChange={e => setNewFeature(e.target.value)} 
                        onKeyDown={e => e.key === 'Enter' && handleAddFeature()}
                        placeholder="Nhập tính năng mới..." 
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    />
                    <button onClick={handleAddFeature} className="bg-slate-800 hover:bg-slate-700 text-white p-2.5 rounded-lg border border-slate-700">
                        <Plus size={18}/>
                    </button>
                </div>
            </div>
        </div>

        <div className="p-6 border-t border-slate-800 flex justify-end gap-3 bg-slate-950/50 mt-auto">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-slate-400 hover:text-white font-medium text-sm">Hủy bỏ</button>
            <button onClick={handleSave} className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/20 flex items-center gap-2">
                <Save size={16}/> Lưu thay đổi
            </button>
        </div>
      </div>
    </div>
  );
};