import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { UserChat } from './components/UserChat';
import { PaymentModal } from './components/PaymentModal';
import { DisclaimerModal } from './components/DisclaimerModal';
import { UserProfile, INITIAL_USERS, AgentConfig, INITIAL_AGENT_CONFIGS, PlanConfig, INITIAL_PLAN_CONFIGS, ViewMode, UserLevel, AgentType, CREDIT_PACKS } from './types';

const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('USER');
  const [users, setUsers] = useState<UserProfile[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<UserProfile>(INITIAL_USERS[1]); // Default to Guest
  const [agentConfigs, setAgentConfigs] = useState<Record<AgentType, AgentConfig>>(INITIAL_AGENT_CONFIGS);
  const [planConfigs, setPlanConfigs] = useState<Record<UserLevel, PlanConfig>>(INITIAL_PLAN_CONFIGS);

  // Payment State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentInitialMode, setPaymentInitialMode] = useState<'SUBSCRIPTION' | 'CREDITS'>('SUBSCRIPTION');

  // Terms Acceptance State
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);

  // Check LocalStorage on Mount
  useEffect(() => {
    const accepted = localStorage.getItem('ECOLAW_TERMS_ACCEPTED');
    if (accepted === 'true') {
      setHasAcceptedTerms(true);
    }
  }, []);

  const handleAcceptTerms = useCallback(() => {
    localStorage.setItem('ECOLAW_TERMS_ACCEPTED', 'true');
    setHasAcceptedTerms(true);
  }, []);

  const handleCommand = useCallback((cmd: string) => {
    const trimmedCmd = cmd.trim().toLowerCase();
    if (trimmedCmd === '/admin') setViewMode('ADMIN');
    else if (trimmedCmd === '/user') setViewMode('USER');
    else if (trimmedCmd.startsWith('/switch ')) {
       const userId = cmd.split(' ')[1];
       setUsers(prev => {
         const foundUser = prev.find(u => u.id === userId);
         if (foundUser) setCurrentUser(foundUser);
         return prev;
       });
    }
  }, []);

  const deductCredit = useCallback((amount: number = 1) => {
    setCurrentUser(prev => {
      if (prev.level === 'Enterprise') return prev;
      const updatedUser = { ...prev, credits: Math.max(0, prev.credits - amount) };
      setUsers(us => us.map(u => u.id === updatedUser.id ? updatedUser : u));
      return updatedUser;
    });
  }, []);

  const handleUpdateUser = useCallback((updatedUser: UserProfile) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    setCurrentUser(prev => prev.id === updatedUser.id ? updatedUser : prev);
  }, []);

  const handleAddUser = useCallback((newUser: UserProfile) => setUsers(prev => [...prev, newUser]), []);

  const handleDeleteUser = useCallback((userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    setCurrentUser(prev => prev.id === userId ? INITIAL_USERS[0] : prev);
  }, []);

  const handleOpenPayment = useCallback((mode: 'SUBSCRIPTION' | 'CREDITS' = 'SUBSCRIPTION') => {
    setPaymentInitialMode(mode);
    setShowPaymentModal(true);
  }, []);

  const handleClosePayment = useCallback(() => setShowPaymentModal(false), []);

  const handlePaymentSuccess = useCallback((planId: string, amount: number) => {
    setCurrentUser(prev => {
      let newLevel = prev.level;
      let addedCredits = 0;

      if (planId === 'Gold') {
          newLevel = 'Gold';
          addedCredits = 500;
      } else if (planId === 'Enterprise') {
          newLevel = 'Enterprise';
          addedCredits = 10000;
      } else {
          const creditPack = CREDIT_PACKS.find(p => p.id === planId);
          if (creditPack) addedCredits = creditPack.credits;
      }

      const updatedUser: UserProfile = {
          ...prev,
          level: newLevel,
          credits: prev.level === 'Enterprise' ? prev.credits : prev.credits + addedCredits,
          totalSpent: prev.totalSpent + amount
      };

      setUsers(us => us.map(u => u.id === updatedUser.id ? updatedUser : u));
      return updatedUser;
    });
  }, []);

  return (
    <>
        {!hasAcceptedTerms && <DisclaimerModal onAccept={handleAcceptTerms} />}

        {viewMode === 'USER' ? (
            <UserChat
                currentUser={currentUser}
                deductCredit={deductCredit}
                onCommand={handleCommand}
                agentConfigs={agentConfigs}
                onTriggerUpgrade={handleOpenPayment}
            />
        ) : (
            <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[#020617] text-slate-400">Đang tải...</div>}>
                <AdminDashboard
                    users={users}
                    onCommand={handleCommand}
                    onUpdateUser={handleUpdateUser}
                    onAddUser={handleAddUser}
                    onDeleteUser={handleDeleteUser}
                    agentConfigs={agentConfigs}
                    onUpdateAgentConfigs={setAgentConfigs}
                    planConfigs={planConfigs}
                    onUpdatePlanConfigs={setPlanConfigs}
                />
            </Suspense>
        )}

        <PaymentModal
            isOpen={showPaymentModal}
            onClose={handleClosePayment}
            plans={planConfigs}
            onSuccess={handlePaymentSuccess}
            currentLevel={currentUser.level}
            initialMode={paymentInitialMode}
        />
    </>
  );
};

export default App;
