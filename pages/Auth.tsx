import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNotification } from '../App';
import { 
  ShieldCheck, Mail, Lock, User, 
  Building2, RefreshCw 
} from 'lucide-react';

interface AuthProps {
  onLogin: () => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
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
        // 1. Attempt standard Supabase Auth Login
        const { data: sbData, error: sbError } = await supabase.auth.signInWithPassword({
          email: formData.email.trim(),
          password: formData.password,
        });

        if (!sbError && sbData.session) {
          showNotification("Administrator identity verified.", "success");
          localStorage.removeItem('donezo_manual_session');
          onLogin();
          return;
        }

        // 2. Fallback: Shadow Login for provisioned staff
        const { data: staffData, error: staffError } = await supabase.rpc('check_staff_login', {
          p_email: formData.email.trim(),
          p_password: formData.password
        });

        if (staffError) {
          console.error("RPC Error:", staffError);
          throw new Error("Security layer connection failure. Please contact your administrator.");
        }
        
        if (staffData && staffData.length > 0) {
          const profile = staffData[0];
          const manualSession = {
            user: {
              id: profile.id,
              email: profile.email,
              user_metadata: { full_name: profile.full_name }
            },
            access_token: 'manual_shadow_token',
            is_manual: true
          };

          localStorage.setItem('donezo_manual_session', JSON.stringify(manualSession));
          showNotification(`Staff Access Granted. Welcome, ${profile.full_name}.`, "success");
          onLogin();
        } else {
          throw new Error("Invalid Credentials. Please check your email and password.");
        }

      } else {
        // Admin Registration
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email.trim(),
          password: formData.password,
          options: { data: { full_name: formData.full_name } }
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("Registration timed out.");

        const { error: profileError } = await supabase.from('profiles').upsert([{
          id: authData.user.id,
          full_name: formData.full_name.trim(),
          email: formData.email.trim().toLowerCase(),
          role: 'office_admin',
          status: 'active',
          updated_at: new Date().toISOString()
        }]);

        if (profileError) throw profileError;
        
        showNotification("Firm account created. Verification email sent.", "success");
        setIsLogin(true);
      }
    } catch (err: any) {
      showNotification(err.message || "Authorization protocol failure.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row animate-in fade-in duration-700">
      <div className="hidden md:flex md:w-1/2 bg-[#064e3b] relative overflow-hidden items-center justify-center p-20">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:40px_40px]"></div>
        </div>
        <div className="relative z-10 space-y-10 max-w-lg">
          <div className="w-24 h-24 bg-white rounded-[32px] flex items-center justify-center shadow-2xl">
             <Building2 className="w-12 h-12 text-[#064e3b]" />
          </div>
          <div className="space-y-4 text-white">
            <h1 className="text-6xl font-black tracking-tighter leading-none">Firm Gateway.</h1>
            <p className="text-emerald-100/60 text-lg font-medium">Enterprise Role-Based Access. Architectural Lead Governance.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 md:p-20 bg-[#f8fafc]">
        <div className="w-full max-w-md space-y-12">
          {/* Mobile Brand Visual */}
          <div className="md:hidden flex flex-col items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-[#064e3b] rounded-[24px] flex items-center justify-center shadow-xl">
               <Building2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">HHD CRM</h1>
          </div>

          <div className="space-y-4 text-center md:text-left">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
              {isLogin ? 'Authorized Access' : 'Register Firm'}
            </h2>
            <p className="text-slate-400 font-medium">
              {isLogin ? 'Enter credentials to enter workspace.' : 'Create a private workspace for your architectural team.'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Administrator Full Name</label>
                <div className="relative">
                  <User className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                  <input 
                    required 
                    className="w-full h-16 pl-16 pr-6 bg-white border border-slate-100 rounded-[24px] text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all shadow-sm" 
                    placeholder="e.g. Sarah Khan" 
                    value={formData.full_name} 
                    onChange={e => setFormData({...formData, full_name: e.target.value})} 
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Workspace Email</label>
              <div className="relative">
                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <input 
                  required 
                  type="email" 
                  className="w-full h-16 pl-16 pr-6 bg-white border border-slate-100 rounded-[24px] text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all shadow-sm" 
                  placeholder="name@archfirm.com" 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Secure Password</label>
              <div className="relative">
                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <input 
                  required 
                  type="password" 
                  className="w-full h-16 pl-16 pr-6 bg-white border border-slate-100 rounded-[24px] text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all shadow-sm" 
                  placeholder="••••••••" 
                  value={formData.password} 
                  onChange={e => setFormData({...formData, password: e.target.value})} 
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full py-6 bg-[#064e3b] text-white rounded-[24px] text-[12px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-4 hover:bg-black transition-all shadow-2xl shadow-emerald-900/20 active:scale-95 disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5 text-emerald-400" />}
              {isLogin ? 'Authorize Access' : 'Create Firm'}
            </button>
          </form>

          <div className="pt-6 text-center">
            <button 
              onClick={() => setIsLogin(!isLogin)} 
              className="text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-[#064e3b] transition-colors"
            >
              {isLogin ? "New Firm? Sign Up" : "Already Registered? Login"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;