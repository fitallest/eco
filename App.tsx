import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { UserChat } from './components/UserChat';
import { PaymentModal } from './components/PaymentModal';
import { DisclaimerModal } from './components/DisclaimerModal';
import { UserProfile, INITIAL_USERS, AgentConfig, INITIAL_AGENT_CONFIGS, PlanConfig, INITIAL_PLAN_CONFIGS, ViewMode, UserLevel, AgentType, CREDIT_PACKS } from './types';
import AuthPage from './components/AuthPage';
import { supabase } from './services/supabase';

const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('USER');
  const [users, setUsers] = useState<UserProfile[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<UserProfile>(INITIAL_USERS[1]);
  const [agentConfigs, setAgentConfigs] = useState<Record<AgentType, AgentConfig>>(INITIAL_AGENT_CONFIGS);
  const [planConfigs, setPlanConfigs] = useState<Record<UserLevel, PlanConfig>>(INITIAL_PLAN_CONFIGS);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentInitialMode, setPaymentInitialMode] = useState<'SUBSCRIPTION' | 'CREDITS'>('SUBSCRIPTION');
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserProfile(session.user);
      else setIsAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserProfile(session.user);
      else {
        setIsAuthLoading(false);
        setCurrentUser(INITIAL_USERS[1]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (user: any) => {
    try {
      const { data, error } = await supabase.from('users').select('*').eq('id', user.id).single();
      
      if (data) {
        setCurrentUser({
          id: data.id,
          name: user.user_metadata?.full_name || user.email || 'User',
          email: data.email,
          phone: data.phone || '',
          level: data.role === 'ADMIN' ? 'Enterprise' : 'Free',
          credits: data.credits,
          status: 'Active',
          totalSpent: 0,
          joinedAt: data.created_at,
          lastActive: new Date().toISOString()
        });
        setViewMode(data.role === 'ADMIN' ? 'ADMIN' : 'USER');
      } else {
        // NEW USER: Auto-create record in 'users' table
        const newUser = {
          id: user.id,
          email: user.email,
          credits: 10, // Give 10 starter credits
          role: 'USER'
        };
        
        const { error: insertError } = await supabase.from('users').insert(newUser);
        
        if (!insertError) {
          setCurrentUser({
            id: user.id,
            name: user.user_metadata?.full_name || user.email || 'User',
            email: user.email,
            phone: '',
            level: 'Free',
            credits: 10,
            status: 'Active',
            totalSpent: 0,
            joinedAt: new Date().toISOString(),
            lastActive: new Date().toISOString()
          });
        }
      }
    } catch (err) {
      console.error('Error fetching/creating user profile:', err);
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Realtime subscription — single source of truth for wallet balance
  useEffect(() => {
    if (!session?.user?.id) return;

    const channel = supabase.channel(`wallet_${session.user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
        filter: `id=eq.${session.user.id}`
      }, (payload: any) => {
        setCurrentUser(prev => ({
          ...prev,
          credits: payload.new.credits,
          phone: payload.new.phone || prev.phone,
          level: payload.new.role === 'ADMIN' ? 'Enterprise' : 'Free'
        }));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id]);

  useEffect(() => {
    const accepted = localStorage.getItem('ECOLAW_TERMS_ACCEPTED');
    if (accepted === 'true') setHasAcceptedTerms(true);
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

  // Credits are deducted ONLY by backend Tollgate.
  // Realtime subscription keeps UI synced automatically.
  // No frontend deductCredit needed.

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

  const handlePaymentSuccess = useCallback(async (planId: string, amount: number) => {
    let addedCredits = 0;
    let newLevel: UserLevel = currentUser.level;

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

    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession?.access_token && addedCredits > 0) {
        const resp = await fetch('/api/wallet/topup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentSession.access_token}`
          },
          body: JSON.stringify({ amount: addedCredits })
        });
        const result = await resp.json();
        if (result.success) {
          // Realtime will also fire, but set immediately for snappy UX
          setCurrentUser(prev => ({
            ...prev,
            level: newLevel,
            credits: result.credits,
            totalSpent: prev.totalSpent + amount
          }));
        }
      }

      // Upgrade role if needed
      if (currentUser.id && (planId === 'Gold' || planId === 'Enterprise')) {
        await supabase.from('users').update({
          role: planId === 'Enterprise' ? 'ADMIN' : 'USER'
        }).eq('id', currentUser.id);
      }
    } catch (err) {
      console.error('[PaymentSuccess] Wallet topup failed:', err);
      // Fallback: update local only
      setCurrentUser(prev => ({
        ...prev,
        level: newLevel,
        credits: prev.credits + addedCredits,
        totalSpent: prev.totalSpent + amount
      }));
    }
  }, [currentUser.id, currentUser.level]);

  if (isAuthLoading) {
    return <div className="flex h-screen items-center justify-center bg-[#020617] text-slate-400">Đang tải hệ thống...</div>;
  }

  if (!session) {
    return <AuthPage />;
  }

  return (
    <>
      {!hasAcceptedTerms && <DisclaimerModal onAccept={handleAcceptTerms} />}

      {viewMode === 'USER' ? (
        <UserChat
          currentUser={currentUser}
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
            currentSession={session}
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
