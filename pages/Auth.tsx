
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNotification } from '../App';
import { 
  ShieldCheck, Mail, Lock, User, 
  ArrowRight, RefreshCw, Sparkles, Home 
} from 'lucide-react';

const Auth = () => {
  const { showNotification } = useNotification();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: ''
  });

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (error) throw error;
        showNotification("Access granted. Welcome to the vault.", "success");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: { full_name: formData.full_name }
          }
        });
        if (error) throw error;
        
        // Initialize profile in public table
        if (data.user) {
          const { error: profileError } = await supabase.from('profiles').insert([{
            id: data.user.id,
            email: formData.email,
            full_name: formData.full_name,
            role: 'Staff',
            status: 'active'
          }]);
          if (profileError) console.error("Profile init error:", profileError);
        }
        
        showNotification("Account created. Please check your email for verification.", "info");
      }
    } catch (err: any) {
      showNotification(err.message || "Authentication failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row animate-in fade-in duration-700">
      {/* Visual Side */}
      <div className="hidden md:flex md:w-1/2 bg-[#064e3b] relative overflow-hidden items-center justify-center p-20">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:40px_40px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
        </div>
        <div className="relative z-10 space-y-10 max-w-lg">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-2xl">
             <div className="w-10 h-10 border-[5px] border-[#064e3b] rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-[#064e3b] rounded-full"></div>
             </div>
          </div>
          <div className="space-y-4">
            <h1 className="text-6xl font-black text-white tracking-tighter leading-none">The Future of Design.</h1>
            <p className="text-emerald-100/60 text-lg font-medium leading-relaxed">Securely managing architectural lead portfolios and site execution protocols.</p>
          </div>
          <div className="pt-10 flex items-center gap-6">
             <div className="flex -space-x-4">
                {[1,2,3].map(i => <div key={i} className="w-12 h-12 rounded-full border-4 border-[#064e3b] bg-emerald-700/50"></div>)}
             </div>
             <p className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">Trusted by 50+ Modern Firms</p>
          </div>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex-1 flex items-center justify-center p-8 sm:p-12 md:p-20 bg-[#f8fafc]">
        <div className="w-full max-w-md space-y-12">
          <div className="space-y-4">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">
              {isLogin ? 'Welcome Back' : 'Join the Firm'}
            </h2>
            <p className="text-slate-400 font-medium">Enter your credentials to access the workspace.</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative group">
                  <User className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-emerald-600 transition-colors" />
                  <input 
                    required 
                    type="text" 
                    className="w-full h-16 pl-16 pr-6 bg-white border border-slate-100 rounded-[24px] text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/5 shadow-sm transition-all"
                    placeholder="Samiul Alim"
                    value={formData.full_name}
                    onChange={e => setFormData({...formData, full_name: e.target.value})}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-emerald-600 transition-colors" />
                <input 
                  required 
                  type="email" 
                  className="w-full h-16 pl-16 pr-6 bg-white border border-slate-100 rounded-[24px] text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/5 shadow-sm transition-all"
                  placeholder="name@firm.com"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Secure Password</label>
              <div className="relative group">
                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-emerald-600 transition-colors" />
                <input 
                  required 
                  type="password" 
                  className="w-full h-16 pl-16 pr-6 bg-white border border-slate-100 rounded-[24px] text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/5 shadow-sm transition-all"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-6 bg-[#064e3b] text-white rounded-[24px] text-[12px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-emerald-900/20 hover:bg-black transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4"
            >
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
              {isLogin ? 'Authorize Access' : 'Register Profile'}
            </button>
          </form>

          <div className="pt-6 text-center">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-[#064e3b] transition-colors"
            >
              {isLogin ? "Don't have an account? Create one" : "Already registered? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
