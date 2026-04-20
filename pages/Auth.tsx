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
      <div className="hidden md:flex md:w-1/2 bg-slate-900 relative overflow-hidden items-center justify-center p-12 lg:p-20">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]"></div>
        </div>
        <div className="relative z-10 space-y-8 max-w-sm">
          <div className="w-16 h-16 bg-white rounded-[24px] flex items-center justify-center shadow-xl">
             <Building2 className="w-8 h-8 text-slate-900" />
          </div>
          <div className="space-y-3 text-white">
            <h1 className="text-5xl font-black tracking-tighter leading-none uppercase">HHD ERP<span className="text-emerald-500">.</span></h1>
            <p className="text-slate-400 text-sm font-bold tracking-widest uppercase opacity-80">ARCHITECTURAL LEAD GOVERNANCE</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-slate-50/30">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile Brand Visual */}
          <div className="md:hidden flex flex-col items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-slate-900 rounded-[18px] flex items-center justify-center shadow-lg">
               <Building2 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">HHD ERP</h1>
          </div>

          <div className="space-y-1.5 text-center md:text-left leading-none">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase leading-none">
              {isLogin ? 'Secure Gateway' : 'Register Firm'}
            </h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-tight mt-1.5 leading-none">
              {isLogin ? 'Authorization Required' : 'Onboard Workspace'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Administrator Identity</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-slate-900 transition-colors" />
                  <input 
                    required 
                    className="w-full h-11 pl-11 pr-5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-slate-900 transition-all shadow-none" 
                    placeholder="Full Name" 
                    value={formData.full_name} 
                    onChange={e => setFormData({...formData, full_name: e.target.value})} 
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Corporate Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-slate-900 transition-colors" />
                <input 
                  required 
                  type="email" 
                  className="w-full h-11 pl-11 pr-5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-slate-900 transition-all shadow-none" 
                  placeholder="name@firm.com" 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Access Credentials</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-slate-900 transition-colors" />
                <input 
                  required 
                  type="password" 
                  className="w-full h-11 pl-11 pr-5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-slate-900 transition-all shadow-none" 
                  placeholder="••••••••" 
                  value={formData.password} 
                  onChange={e => setFormData({...formData, password: e.target.value})} 
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full py-3.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-black transition-all shadow-none active:scale-95 disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 text-emerald-400" />}
              {isLogin ? 'Authorize Connection' : 'Establish Workspace'}
            </button>
          </form>

          <div className="pt-2 text-center">
            <button 
              onClick={() => setIsLogin(!isLogin)} 
              className="text-[9px] font-black uppercase tracking-widest text-slate-300 hover:text-slate-900 transition-colors"
            >
              {isLogin ? "PROVISION NEW WORKSPACE" : "EXISTING OPERATOR LOGIN"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;