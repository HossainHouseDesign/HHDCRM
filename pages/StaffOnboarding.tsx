import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, UserPlus, UserCircle, Mail, Briefcase, 
  Phone, Lock, CheckCircle2, ShieldCheck, RefreshCw, X 
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { UserRole, Profile } from '../types';
import { useNotification } from '../App';

const StaffOnboarding = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const { showNotification } = useNotification();

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    designation: '',
    password: '',
    role: 'Staff' as UserRole
  });

  useEffect(() => {
    if (isEditing) {
      fetchStaff();
    }
  }, [id]);

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      if (data) {
        setFormData({
          full_name: data.full_name || '',
          email: data.email || '',
          phone: data.phone || '',
          designation: data.designation || '',
          password: '',
          role: data.role || 'Staff'
        });
      }
    } catch (err) {
      console.error(err);
      showNotification("Failed to load staff record", "error");
      navigate('/settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // MANDATORY: Construct payload WITHOUT the 'id' key for insertions.
      // This allows the database default 'gen_random_uuid()' to take effect.
      const payload: any = {
        full_name: formData.full_name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        designation: formData.designation.trim(),
        role: formData.role,
        status: 'active',
        updated_at: new Date().toISOString()
      };

      if (isEditing) {
        const { error } = await supabase
          .from('profiles')
          .update(payload)
          .eq('id', id);
        if (error) throw error;
        showNotification("Staff credentials updated", "success");
      } else {
        // Double check no 'id' exists in payload
        delete payload.id;
        const { error } = await supabase
          .from('profiles')
          .insert([payload]);
        if (error) throw error;
        showNotification("New staff member onboarded", "success");
      }
      navigate('/settings');
    } catch (err: any) {
      console.error("Submission Error:", err);
      // Specific handling for common errors
      if (err.message?.includes('duplicate key')) {
        showNotification('Email address already exists in workspace.', "error");
      } else {
        showNotification('Sync Failed: ' + err.message, "error");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
      <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
      <p className="text-slate-400 font-black tracking-widest uppercase text-[10px]">Accessing Workspace Records</p>
    </div>
  );

  const labelClass = "text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] ml-2 mb-2 block";
  const inputClass = "w-full pl-14 sm:pl-16 pr-6 h-14 sm:h-[72px] bg-white border border-slate-100 rounded-2xl sm:rounded-[28px] text-[13px] font-bold text-slate-700 focus:bg-white focus:border-emerald-200 outline-none transition-all placeholder:text-slate-300 shadow-sm focus:ring-4 focus:ring-emerald-500/5";
  const iconClass = "absolute left-5 sm:left-6 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 h-5 text-slate-300 group-focus-within:text-emerald-500 transition-colors";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8 sm:space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-32">
      <header className="flex justify-between items-center pt-8">
        <div className="flex items-center gap-4 sm:gap-6">
          <button 
            onClick={() => navigate('/settings')}
            className="p-3.5 sm:p-4 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-slate-900 transition-all shadow-xl shadow-slate-200/50 active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              {isEditing ? 'Modify Access' : 'Onboard Staff'}
            </h1>
            <p className="text-slate-400 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] mt-1.5 opacity-80 italic">CONFIGURE WORKSPACE PERMISSIONS.</p>
          </div>
        </div>
      </header>

      <div className="bg-white rounded-[32px] sm:rounded-[64px] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">
        <div className="p-8 sm:p-12 md:p-20 space-y-12 sm:space-y-16">
          <form onSubmit={handleSubmit} className="space-y-12 sm:space-y-16">
            <div className="space-y-8 sm:space-y-10">
              <h3 className="text-[11px] sm:text-[12px] font-black text-[#064e3b] uppercase tracking-[0.3em] flex items-center gap-4">
                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                Professional Profile
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10">
                <div className="space-y-2">
                  <label className={labelClass}>FULL LEGAL NAME</label>
                  <div className="relative group">
                    <UserCircle className={iconClass} />
                    <input 
                      required
                      className={inputClass}
                      placeholder="e.g. Architect Sarah Khan"
                      value={formData.full_name}
                      onChange={e => setFormData({...formData, full_name: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className={labelClass}>WORKSPACE EMAIL</label>
                  <div className="relative group">
                    <Mail className={iconClass} />
                    <input 
                      required
                      type="email"
                      className={inputClass}
                      placeholder="staff@firm.com"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className={labelClass}>PROFESSIONAL DESIGNATION</label>
                  <div className="relative group">
                    <Briefcase className={iconClass} />
                    <input 
                      className={inputClass}
                      placeholder="e.g. Senior Project Architect"
                      value={formData.designation}
                      onChange={e => setFormData({...formData, designation: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className={labelClass}>CONTACT NUMBER</label>
                  <div className="relative group">
                    <Phone className={iconClass} />
                    <input 
                      className={inputClass}
                      placeholder="+880 1XXX-XXXXXX"
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                </div>

                {!isEditing && (
                  <div className="space-y-2 md:col-span-2">
                    <label className={labelClass}>WORKSPACE ACCESS PASSWORD</label>
                    <div className="relative group">
                      <Lock className={iconClass} />
                      <input 
                        required
                        type="password"
                        className={inputClass}
                        placeholder="••••••••••••"
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-8 sm:space-y-10">
              <h3 className="text-[11px] sm:text-[12px] font-black text-[#064e3b] uppercase tracking-[0.3em] flex items-center gap-4">
                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                Security Clearance
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                {(['Admin', 'Staff'] as UserRole[]).map(role => {
                  const isActive = formData.role === role;
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setFormData({...formData, role})}
                      className={`group p-8 sm:p-10 rounded-[32px] sm:rounded-[40px] text-left transition-all duration-500 flex items-center justify-between border-2 relative overflow-hidden ${
                        isActive 
                        ? 'bg-[#064e3b] border-transparent text-white shadow-2xl shadow-emerald-900/40 translate-y-[-2px]' 
                        : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-emerald-200 hover:bg-white shadow-sm'
                      }`}
                    >
                      <div className="space-y-2 relative z-10">
                        <p className={`text-[11px] sm:text-[12px] font-black uppercase tracking-[0.3em] ${isActive ? 'text-emerald-400' : 'text-emerald-600'}`}>{role}</p>
                        <p className={`text-[10px] sm:text-[11px] font-medium leading-relaxed max-w-[220px] ${isActive ? 'text-slate-200' : 'text-slate-400'}`}>
                          {role === 'Admin' ? 'Full operational & system control access for firm directors.' : 'Lead management & project intake access for design team.'}
                        </p>
                      </div>
                      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 flex items-center justify-center transition-all duration-700 shrink-0 ${isActive ? 'bg-emerald-500 border-transparent scale-100' : 'border-slate-200 scale-90 opacity-20'}`}>
                        <CheckCircle2 className={`w-6 h-6 sm:w-7 sm:h-7 ${isActive ? 'text-white' : 'text-slate-300'}`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-8 sm:pt-12 border-t border-slate-50 flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8">
              <button 
                type="button" 
                onClick={() => navigate('/settings')}
                className="px-8 sm:px-10 py-4 sm:py-5 text-slate-400 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.3em] hover:text-red-500 transition-all flex items-center gap-3 active:scale-95"
              >
                <X className="w-4 h-4" />
                Discard
              </button>
              
              <button 
                type="submit"
                disabled={saving}
                className="w-full md:w-auto px-12 sm:px-16 py-6 sm:py-8 bg-[#064e3b] text-white rounded-[24px] sm:rounded-[32px] text-[11px] sm:text-xs font-black uppercase tracking-[0.3em] hover:bg-black transition-all shadow-2xl shadow-emerald-900/40 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-4 sm:gap-6 border border-white/10"
              >
                {saving ? (
                  <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-emerald-400" />
                ) : (
                  <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
                )}
                {saving ? 'SYNCHRONIZING...' : isEditing ? 'AUTHORIZE UPDATE' : 'AUTHORIZE ONBOARDING'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StaffOnboarding;