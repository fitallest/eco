import React, { useState, useEffect } from 'react';
import { UserProfile, AgentConfig, AgentType, AGENTS_LIST, PlanConfig, UserLevel, Transaction, MOCK_TRANSACTIONS } from '../types';
import { AgentSettingsModal } from './AgentSettingsModal';
import { PlanSettingsModal } from './PlanSettingsModal';
import { Users, Activity, BarChart3, Bot, Search, Edit2, Trash2, Zap, DollarSign, Lock, Unlock, X, PlusCircle, CreditCard, Check, Wifi, Globe, Server, Radio, Cpu, Calendar, Save, Receipt, Eye, Clock, CheckCircle2, User } from 'lucide-react';

interface AdminDashboardProps {
  users: UserProfile[];
  onCommand: (cmd: string) => void;
  onUpdateUser: (user: UserProfile) => void;
  onAddUser: (user: UserProfile) => void;
  onDeleteUser: (userId: string) => void;
  agentConfigs: Record<AgentType, AgentConfig>;
  onUpdateAgentConfigs: (newConfigs: Record<AgentType, AgentConfig>) => void;
  planConfigs: Record<UserLevel, PlanConfig>;
  onUpdatePlanConfigs: (newConfigs: Record<UserLevel, PlanConfig>) => void;
  currentSession: any;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  users, onCommand, onDeleteUser, onUpdateUser, onAddUser, agentConfigs, onUpdateAgentConfigs, planConfigs, onUpdatePlanConfigs, currentSession
}) => {
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [creditAdjustLoading, setCreditAdjustLoading] = useState<string | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCreditAdjust = async (targetUser: UserProfile, amount: number) => {
    if (!currentSession?.access_token) {
      showToast('Không có phiên đăng nhập Admin', 'error');
      return;
    }
    setCreditAdjustLoading(targetUser.id);
    try {
      const res = await fetch('/api/wallet/admin-adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession.access_token}`
        },
        body: JSON.stringify({ targetUserId: targetUser.id, amount, note: `Admin manual adjust ${amount > 0 ? '+' : ''}${amount}` })
      });
      const data = await res.json();
      if (data.success) {
        onUpdateUser({ ...targetUser, credits: data.credits });
        showToast(`✅ Đã ${amount > 0 ? 'cộng' : 'trừ'} ${Math.abs(amount)} điểm cho ${targetUser.name}. Số dư mới: ${data.credits} CR`);
      } else {
        showToast(`❌ Lỗi: ${data.error}`, 'error');
      }
    } catch (err: any) {
      showToast(`❌ Lỗi kết nối: ${err.message}`, 'error');
    } finally {
      setCreditAdjustLoading(null);
    }
  };

  // Edit User State
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  // Transaction Modal State
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  
  // Real-time Status State
  const [systemStatus, setSystemStatus] = useState({
      geminiApi: 'operational', // operational, degraded, down
      backend: 'operational',
      activeSessions: 142,
      dailyRequests: 45230,
      latency: 120 // ms
  });

  // Plan Modal State
  const [editingPlan, setEditingPlan] = useState<PlanConfig | null>(null);

  // New User Form State
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    level: 'Free' as UserLevel,
    credits: 100
  });

  // Simulate Real-time Data Updates
  useEffect(() => {
    const interval = setInterval(() => {
        setSystemStatus(prev => {
            // Simulate random status glitches (rare)
            const newGeminiStatus = Math.random() > 0.98 ? (Math.random() > 0.5 ? 'degraded' : 'operational') : prev.geminiApi;
            // Backend is more stable
            const newBackendStatus = Math.random() > 0.99 ? (Math.random() > 0.5 ? 'degraded' : 'operational') : prev.backend;

            return {
                geminiApi: newGeminiStatus,
                backend: newBackendStatus,
                activeSessions: Math.max(100, prev.activeSessions + Math.floor(Math.random() * 7) - 3), // Fluctuate +/- 3
                dailyRequests: prev.dailyRequests + Math.floor(Math.random() * 5), // Always increase
                latency: Math.max(50, Math.min(300, prev.latency + Math.floor(Math.random() * 40) - 20)) // Fluctuate latency
            };
        });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleStatusToggle = (user: UserProfile) => {
    const newStatus = user.status === 'Active' ? 'Locked' : 'Active';
    onUpdateUser({ ...user, status: newStatus });
  };

  const handleCreateUser = () => {
    if (!newUser.name || !newUser.email) return;

    const id = `U-${Date.now().toString().slice(-6)}`;
    const createdUser: UserProfile = {
      id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      level: newUser.level,
      credits: Number(newUser.credits),
      status: 'Active',
      totalSpent: 0,
      joinedAt: new Date().toISOString().split('T')[0],
      lastActive: new Date().toISOString().split('T')[0]
    };

    onAddUser(createdUser);
    setShowAddUserModal(false);
    setNewUser({ name: '', email: '', phone: '', level: 'Free', credits: 100 });
  };
  
  const handleUpdatePlan = (updatedPlan: PlanConfig) => {
      onUpdatePlanConfigs({
          ...planConfigs,
          [updatedPlan.id]: updatedPlan
      });
  };

  const handleSaveUser = () => {
      if (editingUser) {
          onUpdateUser(editingUser);
          setEditingUser(null);
      }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
      if (status === 'operational') return 'bg-emerald-500';
      if (status === 'degraded') return 'bg-amber-500';
      return 'bg-red-500';
  };

  const getLatencyColor = (ms: number) => {
      if (ms < 150) return 'text-emerald-400';
      if (ms < 300) return 'text-amber-400';
      return 'text-red-400';
  };

  const getTxnStatusColor = (status: string) => {
      if (status === 'SUCCESS') return 'text-emerald-400 bg-emerald-900/20 border-emerald-500/30';
      if (status === 'PENDING') return 'text-amber-400 bg-amber-900/20 border-amber-500/30';
      return 'text-red-400 bg-red-900/20 border-red-500/30';
  };

  return (
    <div className="flex h-screen bg-[#020617] text-slate-200 font-inter overflow-hidden">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] px-5 py-3 rounded-xl shadow-2xl border text-sm font-bold animate-fade-in transition-all ${
          toast.type === 'success'
            ? 'bg-emerald-900/90 border-emerald-500/50 text-emerald-300'
            : 'bg-red-900/90 border-red-500/50 text-red-300'
        }`}>
          {toast.msg}
        </div>
      )}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col p-4 hidden md:flex">
        <div className="font-bold text-xl text-white mb-8 px-2">ADMIN<span className="text-emerald-500">.OS</span></div>
        <nav className="space-y-2">
            <button onClick={() => setActiveTab('OVERVIEW')} className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 ${activeTab === 'OVERVIEW' ? 'bg-emerald-600/10 text-emerald-400' : 'text-slate-500 hover:text-white'}`}><BarChart3 size={18}/> Tổng quan</button>
            <button onClick={() => setActiveTab('USERS')} className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 ${activeTab === 'USERS' ? 'bg-emerald-600/10 text-emerald-400' : 'text-slate-500 hover:text-white'}`}><Users size={18}/> Người dùng</button>
            <button onClick={() => setActiveTab('TRANSACTIONS')} className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 ${activeTab === 'TRANSACTIONS' ? 'bg-emerald-600/10 text-emerald-400' : 'text-slate-500 hover:text-white'}`}><Receipt size={18}/> Giao dịch</button>
            <button onClick={() => setActiveTab('PLANS')} className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 ${activeTab === 'PLANS' ? 'bg-emerald-600/10 text-emerald-400' : 'text-slate-500 hover:text-white'}`}><CreditCard size={18}/> Gói dịch vụ</button>
            <button onClick={() => setActiveTab('AGENTS')} className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 ${activeTab === 'AGENTS' ? 'bg-emerald-600/10 text-emerald-400' : 'text-slate-500 hover:text-white'}`}><Bot size={18}/> Agents AI</button>
        </nav>
        <div className="mt-auto">
             <button onClick={() => onCommand('/user')} className="w-full py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-300">ĐĂNG XUẤT</button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-white">
                {activeTab === 'OVERVIEW' ? 'Trung tâm điều khiển' : 
                 activeTab === 'USERS' ? 'Quản lý Người dùng' : 
                 activeTab === 'TRANSACTIONS' ? 'Lịch sử Giao dịch' : 
                 activeTab === 'PLANS' ? 'Cấu hình Gói dịch vụ' : 'Mạng lưới Agent'}
            </h1>
            <div className="flex items-center gap-2 text-slate-500 text-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                System Live
            </div>
        </header>

        {activeTab === 'OVERVIEW' && (
            <div className="space-y-6">
                {/* Real-time Status Monitor */}
                <div>
                    <h3 className="text-slate-500 text-xs font-bold uppercase mb-3 flex items-center gap-2">
                        <Radio size={14} className="text-emerald-500 animate-pulse"/> Real-time Monitor
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Gemini API Status */}
                        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-800 rounded-lg text-slate-400"><Cpu size={18}/></div>
                                <div>
                                    <div className="text-xs text-slate-500 font-bold uppercase">Gemini API</div>
                                    <div className="text-sm font-bold text-white flex items-center gap-2 capitalize">
                                        {systemStatus.geminiApi}
                                    </div>
                                </div>
                            </div>
                            <div className={`w-3 h-3 rounded-full ${getStatusColor(systemStatus.geminiApi)} shadow-lg shadow-${getStatusColor(systemStatus.geminiApi).replace('bg-', '')}/50`}></div>
                        </div>

                        {/* Backend Status */}
                        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-800 rounded-lg text-slate-400"><Server size={18}/></div>
                                <div>
                                    <div className="text-xs text-slate-500 font-bold uppercase">Core Backend</div>
                                    <div className="text-sm font-bold text-white capitalize">
                                        {systemStatus.backend}
                                    </div>
                                </div>
                            </div>
                            <div className={`w-3 h-3 rounded-full ${getStatusColor(systemStatus.backend)} shadow-lg shadow-${getStatusColor(systemStatus.backend).replace('bg-', '')}/50`}></div>
                        </div>

                         {/* Active Users */}
                         <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-800 rounded-lg text-slate-400"><Globe size={18}/></div>
                                <div>
                                    <div className="text-xs text-slate-500 font-bold uppercase">Live Sessions</div>
                                    <div className="text-sm font-bold text-white">
                                        {systemStatus.activeSessions} users
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-end gap-1 h-3">
                                <div className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                                <div className="w-1 h-2 bg-emerald-500 rounded-full animate-bounce" style={{animationDelay: '100ms'}}></div>
                                <div className="w-1 h-3 bg-emerald-500 rounded-full animate-bounce" style={{animationDelay: '200ms'}}></div>
                            </div>
                        </div>

                         {/* API Latency */}
                         <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-800 rounded-lg text-slate-400"><Wifi size={18}/></div>
                                <div>
                                    <div className="text-xs text-slate-500 font-bold uppercase">Avg. Latency</div>
                                    <div className={`text-sm font-bold ${getLatencyColor(systemStatus.latency)}`}>
                                        {systemStatus.latency} ms
                                    </div>
                                </div>
                            </div>
                            <Activity size={16} className={`${getLatencyColor(systemStatus.latency)} opacity-50`}/>
                        </div>
                    </div>
                </div>

                {/* Key Metrics Grid */}
                <div>
                     <h3 className="text-slate-500 text-xs font-bold uppercase mb-3">Business Metrics</h3>
                     <div className="grid grid-cols-4 gap-4">
                        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl">
                            <div className="text-slate-400 text-xs font-bold uppercase mb-2 flex items-center gap-2"><DollarSign size={14}/> Doanh thu</div>
                            <div className="text-3xl font-bold text-white">125.4M ₫</div>
                        </div>
                        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl">
                            <div className="text-slate-400 text-xs font-bold uppercase mb-2 flex items-center gap-2"><Users size={14}/> Total Users</div>
                            <div className="text-3xl font-bold text-white">{users.length}</div>
                        </div>
                        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl">
                            <div className="text-slate-400 text-xs font-bold uppercase mb-2 flex items-center gap-2"><Activity size={14}/> Daily Requests</div>
                            <div className="text-3xl font-bold text-emerald-400">{systemStatus.dailyRequests.toLocaleString()}</div>
                        </div>
                        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl">
                            <div className="text-slate-400 text-xs font-bold uppercase mb-2 flex items-center gap-2"><Zap size={14}/> Token Usage</div>
                            <div className="text-3xl font-bold text-white">1.2M</div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'USERS' && (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
                        <input 
                            type="text" 
                            placeholder="Tìm kiếm người dùng..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-10 pr-10 text-sm text-white focus:border-emerald-500 focus:outline-none placeholder:text-slate-600 transition-all"
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-2.5 text-slate-500 hover:text-white">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                    <button onClick={() => setShowAddUserModal(true)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-emerald-900/20">
                        <PlusCircle size={16}/> Thêm mới
                    </button>
                </div>
                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-xs">
                            <tr>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Level</th>
                                <th className="px-6 py-4">Credits & Cycle</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map(u => (
                                    <tr key={u.id} className="hover:bg-slate-800/30">
                                        <td className="px-6 py-4 font-bold text-white">{u.name}<div className="text-xs text-slate-500 font-normal">{u.email}</div></td>
                                        <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded text-xs border ${u.level === 'Gold' ? 'bg-amber-900/20 text-amber-400 border-amber-500/30' : u.level === 'Enterprise' ? 'bg-purple-900/20 text-purple-400 border-purple-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>{u.level}</span></td>
                                        <td className="px-6 py-4">
                                            <div className="font-mono text-emerald-400 font-bold text-lg">{u.credits} <span className="text-xs text-slate-500 font-normal">CR</span></div>
                                            <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1" title="Ngày reset gói">
                                                <Calendar size={10}/> {u.lastActive}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button 
                                                onClick={() => handleStatusToggle(u)}
                                                className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold border transition-all ${
                                                    u.status === 'Active' 
                                                    ? 'bg-emerald-900/20 text-emerald-500 border-emerald-500/30 hover:bg-emerald-900/40' 
                                                    : 'bg-red-900/20 text-red-500 border-red-500/30 hover:bg-red-900/40'
                                                }`}
                                            >
                                                {u.status === 'Active' ? <Unlock size={10}/> : <Lock size={10}/>}
                                                {u.status}
                                            </button>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleCreditAdjust(u, 10)}
                                                    disabled={creditAdjustLoading === u.id || !u.id?.includes('-')}
                                                    className="px-2 py-1 bg-emerald-900/30 hover:bg-emerald-700/40 text-emerald-400 text-xs font-bold rounded border border-emerald-800 transition-all disabled:opacity-40"
                                                    title="Cộng 10 điểm"
                                                >+10</button>
                                                <button
                                                    onClick={() => handleCreditAdjust(u, 100)}
                                                    disabled={creditAdjustLoading === u.id || !u.id?.includes('-')}
                                                    className="px-2 py-1 bg-emerald-900/30 hover:bg-emerald-700/40 text-emerald-400 text-xs font-bold rounded border border-emerald-800 transition-all disabled:opacity-40"
                                                    title="Cộng 100 điểm"
                                                >+100</button>
                                                <button
                                                    onClick={() => handleCreditAdjust(u, -10)}
                                                    disabled={creditAdjustLoading === u.id || !u.id?.includes('-')}
                                                    className="px-2 py-1 bg-red-900/30 hover:bg-red-700/40 text-red-400 text-xs font-bold rounded border border-red-800 transition-all disabled:opacity-40"
                                                    title="Trừ 10 điểm"
                                                >-10</button>
                                                <button onClick={() => setEditingUser(u)} className="text-slate-400 hover:text-emerald-400 p-1 hover:bg-slate-800 rounded transition-colors ml-1"><Edit2 size={14}/></button>
                                                <button onClick={() => onDeleteUser(u.id)} className="text-slate-400 hover:text-red-500 p-1 hover:bg-slate-800 rounded transition-colors"><Trash2 size={14}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                        Không tìm thấy người dùng phù hợp.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* Transaction History Table */}
        {activeTab === 'TRANSACTIONS' && (
             <div className="space-y-4">
                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-xs">
                            <tr>
                                <th className="px-6 py-4">ID Giao dịch</th>
                                <th className="px-6 py-4">Khách hàng</th>
                                <th className="px-6 py-4">Gói / Dịch vụ</th>
                                <th className="px-6 py-4">Số tiền</th>
                                <th className="px-6 py-4">Trạng thái</th>
                                <th className="px-6 py-4">Thời gian</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {MOCK_TRANSACTIONS.map(txn => (
                                <tr key={txn.id} className="hover:bg-slate-800/30 cursor-pointer" onClick={() => setSelectedTransaction(txn)}>
                                    <td className="px-6 py-4 text-slate-400 font-mono text-xs">{txn.id}</td>
                                    <td className="px-6 py-4 text-white font-medium">{txn.userId}</td>
                                    <td className="px-6 py-4 text-slate-300">{txn.description}</td>
                                    <td className="px-6 py-4 font-mono font-bold text-white">{txn.amount.toLocaleString('vi-VN')}₫</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getTxnStatusColor(txn.status)}`}>
                                            {txn.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 text-xs">{txn.timestamp.toLocaleDateString('vi-VN')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             </div>
        )}

        {activeTab === 'PLANS' && (
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(Object.values(planConfigs) as PlanConfig[]).map((plan) => (
                    <div key={plan.id} className={`bg-slate-900/40 border p-6 rounded-2xl relative group transition-all hover:-translate-y-1 ${plan.id === 'Gold' ? 'border-amber-500/30 hover:border-amber-500/50' : plan.id === 'Enterprise' ? 'border-purple-500/30 hover:border-purple-500/50' : 'border-slate-800 hover:border-slate-600'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-xl ${plan.id === 'Gold' ? 'bg-amber-900/20 text-amber-400' : plan.id === 'Enterprise' ? 'bg-purple-900/20 text-purple-400' : 'bg-slate-800 text-slate-400'}`}>
                                <CreditCard size={24}/>
                            </div>
                            <button onClick={() => setEditingPlan(plan)} className="p-2 bg-slate-900 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition-colors">
                                <Edit2 size={16}/>
                            </button>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                        <div className="text-2xl font-mono text-emerald-400 mb-4">{plan.price.toLocaleString('vi-VN')} <span className="text-sm text-slate-500">vnđ</span></div>
                        
                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between text-sm border-b border-slate-800 pb-2">
                                <span className="text-slate-500">Credits/Tháng</span>
                                <span className="text-white font-mono font-bold">{plan.monthlyCredits.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {plan.features.map((f, i) => (
                                <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                                    <Check size={12} className="text-emerald-500 mt-0.5"/>
                                    <span>{f}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
             </div>
        )}

        {activeTab === 'AGENTS' && (
             <div>
                <button onClick={() => setShowAgentModal(true)} className="mb-6 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-2 font-bold"><Bot size={18}/> Cấu hình Agents</button>
                <div className="grid grid-cols-3 gap-6">
                    {AGENTS_LIST.map(agent => (
                        <div key={agent.id} className="bg-slate-900/40 border border-slate-800 p-6 rounded-xl">
                            <div className="flex justify-between mb-4">
                                <div className="p-2 bg-slate-800 rounded text-emerald-500"><Bot size={20}/></div>
                                <div className={`text-[10px] uppercase font-bold px-2 py-1 rounded border ${agentConfigs[agent.id].isEnabled ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>{agentConfigs[agent.id].isEnabled ? 'Active' : 'Inactive'}</div>
                            </div>
                            <h3 className="font-bold text-white text-lg">{agent.label} Agent</h3>
                            <p className="text-slate-500 text-xs mt-2 truncate">{agentConfigs[agent.id].endpointUrl || 'Sử dụng Model Tổng hợp'}</p>
                        </div>
                    ))}
                </div>
             </div>
        )}
      </main>
      
      {/* Agent Settings Modal */}
      <AgentSettingsModal isOpen={showAgentModal} onClose={() => setShowAgentModal(false)} configs={agentConfigs} onSave={onUpdateAgentConfigs} agentList={AGENTS_LIST} />
      
      {/* Plan Settings Modal */}
      <PlanSettingsModal isOpen={!!editingPlan} onClose={() => setEditingPlan(null)} plan={editingPlan} onSave={handleUpdatePlan} />

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
             <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
                 <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                     <h3 className="font-bold text-white text-lg flex items-center gap-2"><Edit2 size={20} className="text-emerald-500"/> Chỉnh sửa người dùng</h3>
                     <button onClick={() => setEditingUser(null)}><X className="text-slate-500 hover:text-white" size={20}/></button>
                 </div>
                 <div className="p-6 space-y-4">
                     <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Họ tên</label>
                         <input type="text" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:border-emerald-500 focus:outline-none"/>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Level</label>
                            <select value={editingUser.level} onChange={e => setEditingUser({...editingUser, level: e.target.value as UserLevel})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:border-emerald-500 focus:outline-none">
                                <option value="Free">Free</option>
                                <option value="Gold">Gold</option>
                                <option value="Enterprise">Enterprise</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Credits Hiện tại</label>
                            <input type="number" value={editingUser.credits} onChange={e => setEditingUser({...editingUser, credits: parseInt(e.target.value)})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:border-emerald-500 focus:outline-none"/>
                        </div>
                     </div>
                     <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-2"><Calendar size={14}/> Chu kỳ gói (Last Active)</label>
                         <input type="date" value={editingUser.lastActive} onChange={e => setEditingUser({...editingUser, lastActive: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:border-emerald-500 focus:outline-none"/>
                         <p className="text-[10px] text-slate-500 mt-1">Hệ thống sẽ dựa vào ngày này để tính toán việc reset credits hàng tháng.</p>
                     </div>
                 </div>
                 <div className="p-6 border-t border-slate-800 flex justify-end gap-3 bg-slate-950/50">
                     <button onClick={() => setEditingUser(null)} className="px-4 py-2 rounded-lg text-slate-400 hover:text-white font-medium text-sm">Hủy bỏ</button>
                     <button onClick={handleSaveUser} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/20 flex items-center gap-2">
                         <Save size={16}/> Lưu thay đổi
                     </button>
                 </div>
             </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
             <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
                 <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                     <h3 className="font-bold text-white text-lg flex items-center gap-2"><PlusCircle size={20} className="text-emerald-500"/> Thêm người dùng</h3>
                     <button onClick={() => setShowAddUserModal(false)}><X className="text-slate-500 hover:text-white" size={20}/></button>
                 </div>
                 <div className="p-6 space-y-4">
                     <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Họ tên</label>
                         <input type="text" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:border-emerald-500 focus:outline-none"/>
                     </div>
                     <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                         <input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:border-emerald-500 focus:outline-none"/>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Số điện thoại</label>
                            <input type="text" value={newUser.phone} onChange={e => setNewUser({...newUser, phone: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:border-emerald-500 focus:outline-none"/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Level</label>
                            <select value={newUser.level} onChange={e => setNewUser({...newUser, level: e.target.value as UserLevel})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:border-emerald-500 focus:outline-none">
                                <option value="Free">Free</option>
                                <option value="Gold">Gold</option>
                                <option value="Enterprise">Enterprise</option>
                            </select>
                        </div>
                     </div>
                     <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Credits khởi tạo</label>
                         <input type="number" value={newUser.credits} onChange={e => setNewUser({...newUser, credits: parseInt(e.target.value)})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:border-emerald-500 focus:outline-none"/>
                     </div>
                 </div>
                 <div className="p-6 border-t border-slate-800 flex justify-end gap-3 bg-slate-950/50">
                     <button onClick={() => setShowAddUserModal(false)} className="px-4 py-2 rounded-lg text-slate-400 hover:text-white font-medium text-sm">Hủy bỏ</button>
                     <button onClick={handleCreateUser} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/20">Tạo mới</button>
                 </div>
             </div>
        </div>
      )}

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
                  <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                      <div>
                          <h3 className="font-bold text-white text-lg flex items-center gap-2"><Receipt size={20} className="text-emerald-500"/> Chi tiết Giao dịch</h3>
                          <span className="text-xs text-slate-500 font-mono">{selectedTransaction.id}</span>
                      </div>
                      <button onClick={() => setSelectedTransaction(null)}><X className="text-slate-500 hover:text-white" size={20}/></button>
                  </div>
                  <div className="p-6 space-y-6">
                      {/* Amount & Status Hero */}
                      <div className="flex justify-between items-center bg-slate-950 p-4 rounded-xl border border-slate-800">
                           <div>
                               <div className="text-xs text-slate-500 font-bold uppercase mb-1">Số tiền thanh toán</div>
                               <div className="text-2xl font-bold text-white font-mono">{selectedTransaction.amount.toLocaleString('vi-VN')} ₫</div>
                           </div>
                           <div className={`px-3 py-1.5 rounded-lg border text-xs font-bold uppercase flex items-center gap-2 ${getTxnStatusColor(selectedTransaction.status)}`}>
                               {selectedTransaction.status === 'SUCCESS' ? <CheckCircle2 size={14} className="fill-current"/> : selectedTransaction.status === 'PENDING' ? <Clock size={14}/> : <X size={14}/>}
                               {selectedTransaction.status}
                           </div>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-6">
                           <div>
                               <div className="text-xs text-slate-500 font-bold uppercase mb-1">Gói dịch vụ (Plan)</div>
                               <div className="text-white font-medium flex items-center gap-2">
                                   <CreditCard size={14} className="text-slate-400"/> {selectedTransaction.planId}
                               </div>
                           </div>
                           <div>
                               <div className="text-xs text-slate-500 font-bold uppercase mb-1">Phương thức</div>
                               <div className="text-white font-medium flex items-center gap-2">
                                   <Globe size={14} className="text-slate-400"/> {selectedTransaction.method}
                               </div>
                           </div>
                           <div>
                               <div className="text-xs text-slate-500 font-bold uppercase mb-1">Khách hàng</div>
                               <div className="text-white font-medium flex items-center gap-2">
                                   <User size={14} className="text-slate-400"/> {selectedTransaction.userId}
                               </div>
                           </div>
                           <div>
                               <div className="text-xs text-slate-500 font-bold uppercase mb-1">Thời gian</div>
                               <div className="text-white font-medium flex items-center gap-2">
                                   <Calendar size={14} className="text-slate-400"/> {selectedTransaction.timestamp.toLocaleString('vi-VN')}
                               </div>
                           </div>
                      </div>

                      {/* Description */}
                      <div className="bg-slate-800/20 p-4 rounded-xl border border-slate-800">
                          <div className="text-xs text-slate-500 font-bold uppercase mb-2">Nội dung giao dịch</div>
                          <p className="text-sm text-slate-300">{selectedTransaction.description}</p>
                      </div>
                  </div>
                  
                  {/* Footer Actions */}
                  <div className="p-6 border-t border-slate-800 flex justify-end gap-3 bg-slate-950/50">
                      <button className="px-4 py-2 rounded-lg text-slate-400 hover:text-white font-medium text-sm flex items-center gap-2 bg-slate-900 border border-slate-700">
                          <Eye size={14}/> Xem Invoice
                      </button>
                      <button onClick={() => setSelectedTransaction(null)} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/20">
                          Đóng
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};