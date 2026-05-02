import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  Key, 
  User, 
  Building2, 
  ArrowRight, 
  Loader2, 
  Scale,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '../services/supabase';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [accountType, setAccountType] = useState('individual');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              account_type: accountType,
            }
          }
        });
        if (error) throw error;
        setSuccessMsg('Registration successful! Please check your email to verify your account.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    if (error) {
      alert(error.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-900 text-slate-200 font-sans selection:bg-blue-500/30">
      {/* LEFT PANE - Trust & Value Proposition */}
      <div className="lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 flex flex-col justify-between p-8 lg:p-16 border-b lg:border-b-0 lg:border-r border-slate-800">
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdHRoIGQ9Ik0gNDAgMCBMIDAgMCBMIDAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAyKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50 pointer-events-none"></div>
        
        {/* Logo Branding */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Scale className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">
            ECOLAW<span className="text-blue-500">.AI</span>
          </span>
        </div>

        {/* Value Proposition */}
        <div className="relative z-10 mt-16 lg:mt-0 max-w-xl">
          <h1 className="text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-6">
            The Operating System for Modern <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Legal Intelligence</span>
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed mb-8">
            Empower your firm with enterprise-grade AI. Automate contract analysis, 
            accelerate legal research, and protect your clients with military-grade security infrastructure.
          </p>
          
          <div className="space-y-4">
            {[
              'AI-powered contract analysis in seconds', 
              'Seamless integration with existing workflows', 
              'SOC 2 Type II Certified Data Privacy'
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-slate-300">
                <CheckCircle2 className="w-5 h-5 text-blue-500" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trust Badges */}
        <div className="relative z-10 mt-16 lg:mt-0 flex flex-wrap items-center gap-6 pt-8 border-t border-slate-800/60">
          <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-800/40 py-2 px-3 rounded-md border border-slate-700/50">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <span className="font-medium">Enterprise Grade Security</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-800/40 py-2 px-3 rounded-md border border-slate-700/50">
            <Lock className="w-5 h-5 text-blue-500" />
            <span className="font-medium">AES-256 Encrypted</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANE - Interaction & Forms */}
      <div className="lg:w-1/2 flex items-center justify-center p-8 lg:p-16 bg-slate-900 relative">
        <div className="w-full max-w-md">
          
          {/* Header & Toggle */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-6">
              {isLogin ? 'Welcome back' : 'Create an account'}
            </h2>
            
            <div className="flex p-1 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <button 
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all duration-200 ${
                  isLogin 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
                }`}
              >
                Sign In
              </button>
              <button 
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all duration-200 ${
                  !isLogin 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
                }`}
              >
                Register
              </button>
            </div>
          </div>

          {/* Authentication Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <>
                <div className="space-y-1.5 group">
                  <label className="text-sm font-medium text-slate-300">Full Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input 
                      type="text" 
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="John Doe" 
                      className="block w-full pl-10 pr-3 py-2.5 border border-slate-700 rounded-lg bg-slate-800/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors sm:text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-300">Account Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className={`flex items-center justify-center px-4 py-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                      accountType === 'individual' 
                        ? 'bg-blue-600/10 border-blue-500 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.1)]' 
                        : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                    }`}>
                      <input type="radio" name="accountType" value="individual" className="sr-only" checked={accountType === 'individual'} onChange={() => setAccountType('individual')} />
                      <User className="w-4 h-4 mr-2" />
                      <span className="text-sm font-medium">Individual</span>
                    </label>
                    <label className={`flex items-center justify-center px-4 py-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                      accountType === 'enterprise' 
                        ? 'bg-blue-600/10 border-blue-500 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.1)]' 
                        : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                    }`}>
                      <input type="radio" name="accountType" value="enterprise" className="sr-only" checked={accountType === 'enterprise'} onChange={() => setAccountType('enterprise')} />
                      <Building2 className="w-4 h-4 mr-2" />
                      <span className="text-sm font-medium">Law Firm</span>
                    </label>
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1.5 group">
              <label className="text-sm font-medium text-slate-300">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@firm.com" 
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-700 rounded-lg bg-slate-800/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors sm:text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5 group">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-300">Password</label>
                {isLogin && (
                  <a href="#" className="text-sm font-medium text-blue-500 hover:text-blue-400 transition-colors">
                    Forgot Password?
                  </a>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="h-5 w-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-700 rounded-lg bg-slate-800/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors sm:text-sm"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-md bg-red-500/10 border border-red-500/50 text-red-400 text-sm">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-md bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 text-sm">
                {successMsg}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full flex items-center justify-center py-2.5 px-4 mt-6 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-blue-500 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>{isLogin ? 'Continue to Workspace' : 'Create Account'}</span>
                  <ArrowRight className="ml-2 w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Social Auth */}
          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-slate-900 text-slate-500">or continue with</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              {/* Microsoft Button */}
              <button className="flex items-center justify-center px-4 py-2.5 border border-slate-700 rounded-lg bg-slate-800/30 hover:bg-slate-800/80 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-slate-500">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11.4 24H0V12.6H11.4V24ZM24 24H12.6V12.6H24V24ZM11.4 11.4H0V0H11.4V11.4ZM24 11.4H12.6V0H24V11.4Z" fill="#00A4EF"/>
                </svg>
                <span className="sr-only">Sign in with Microsoft</span>
              </button>
              
              {/* Google Button */}
              <button 
                type="button"
                onClick={handleGoogleLogin}
                className="flex items-center justify-center px-4 py-2.5 border border-slate-700 rounded-lg bg-slate-800/30 hover:bg-slate-800/80 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-slate-500"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1V21.1H19.94C22.205 19.01 23.49 15.92 23.49 12.275Z" fill="#4285F4"/>
                  <path d="M12 24C15.24 24 17.96 22.935 19.945 21.095L16.085 18.095C15.005 18.82 13.62 19.245 12 19.245C8.87 19.245 6.215 17.135 5.265 14.3H1.32V17.355C3.285 21.26 7.31 24 12 24Z" fill="#34A853"/>
                  <path d="M5.265 14.295C5.025 13.57 4.885 12.8 4.885 12C4.885 11.2 5.025 10.43 5.265 9.705V6.65H1.32C0.48 8.32 0 10.11 0 12C0 13.89 0.48 15.68 1.32 17.35L5.265 14.295Z" fill="#FBBC05"/>
                  <path d="M12 4.75C13.77 4.75 15.355 5.36 16.605 6.545L20.025 3.125C17.95 1.19 15.24 0 12 0C7.31 0 3.285 2.74 1.32 6.65L5.265 9.705C6.215 6.865 8.87 4.75 12 4.75Z" fill="#EA4335"/>
                </svg>
                <span className="sr-only">Sign in with Google</span>
              </button>

              {/* Apple Button */}
              <button className="flex items-center justify-center px-4 py-2.5 border border-slate-700 rounded-lg bg-slate-800/30 hover:bg-slate-800/80 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-slate-500">
                <svg className="w-5 h-5 text-slate-200" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16.48 10.59C16.44 8.01 18.59 6.74 18.7 6.68C17.5 4.92 15.65 4.65 15.02 4.57C13.43 4.41 11.89 5.51 11.08 5.51C10.27 5.51 8.98 4.59 7.64 4.62C5.9 4.65 4.3 5.58 3.4 7.15C1.56 10.35 2.93 15.07 4.72 17.65C5.6 18.91 6.64 20.32 8.01 20.27C9.33 20.22 9.83 19.42 11.4 19.42C12.96 19.42 13.41 20.27 14.8 20.22C16.22 20.17 17.13 18.92 18 17.65C19 16.18 19.42 14.77 19.47 14.7C19.44 14.68 16.53 13.57 16.48 10.59ZM14.15 3.03C14.88 2.15 15.37 0.93 15.24 -0.25C14.22 -0.21 12.91 0.43 12.15 1.34C11.48 2.14 10.89 3.42 11.05 4.57C12.19 4.66 13.42 4.02 14.15 3.03Z"/>
                </svg>
                <span className="sr-only">Sign in with Apple</span>
              </button>
            </div>
            
            <p className="mt-8 text-center text-xs text-slate-500">
              By continuing, you agree to ECOLAW.AI's <br/>
              <a href="#" className="text-slate-400 hover:text-white transition-colors underline underline-offset-2">Terms of Service</a> and <a href="#" className="text-slate-400 hover:text-white transition-colors underline underline-offset-2">Privacy Policy</a>.
            </p>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
