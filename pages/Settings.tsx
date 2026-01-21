
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Plus, Trash2, RefreshCw, Eye, EyeOff, Lock, ChevronRight, Users, 
  UserCircle, FormInput, ArrowLeft, Save, Shield, RotateCcw, 
  Mail, Phone, Briefcase, Camera, Tag, ListFilter, X, History,
  Type as TypeIcon, Wand2
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { FormFieldConfig, FieldType, Profile } from '../types';
import { useNotification, useUser } from '../App';

export const DEFAULT_FORM_CONFIG: FormFieldConfig[] = [
  { id: '1', label: 'Full Name', db_key: 'client_name', type: 'text', section: 'Identity', required: true, visible: true, placeholder: 'e.g. Sarah Khan' },
  { id: '2', label: 'Phone Number', db_key: 'phone', type: 'text', section: 'Identity', required: true, visible: true, placeholder: '01XXXXXXXXX' },
  { id: '14', label: 'Land Area', db_key: 'land_area', type: 'text', section: 'Architecture', required: false, visible: true, placeholder: 'e.g. 5 Katha' },
  { id: 'pkg_idx', label: 'Design Package', db_key: 'package', type: 'select', section: 'Financials', required: false, visible: true, options: ['Standard Architectural', 'Premium Engineering', 'Luxury Full-Service'] },
  { id: 'fee_idx', label: 'Design Charge (BDT)', db_key: 'asking_fee', type: 'number', section: 'Financials', required: false, visible: true, placeholder: '0' },
];

const Settings = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { isAdmin, refreshUser } = useUser();
  const [view, setView] = useState<'hub' | 'form' | 'profile'>('hub');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formFields, setFormFields] = useState<FormFieldConfig[]>([]);
  const [profile, setProfile] = useState<Partial<Profile>>({});

  useEffect(() => {
    fetchConfig();
    fetchMyProfile();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data } = await supabase.from('settings').select('*').eq('key', 'lead_form_config').single();
      setFormFields(data?.value || DEFAULT_FORM_CONFIG);
    } catch (err) { setFormFields(DEFAULT_FORM_CONFIG); }
    finally { setLoading(false); }
  };

  const fetchMyProfile = async () => {
    const manualSession = localStorage.getItem('donezo_manual_session');
    let userId = null;
    
    if (manualSession) {
      userId = JSON.parse(manualSession).user.id;
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
    }

    if (userId) {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (data) setProfile(data);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const userId = profile.id;
      if (!userId) throw new Error("Identifier not found.");

      const { error } = await supabase.from('profiles').update({
        full_name: profile.full_name?.trim(),
        phone: profile.phone?.trim(),
        designation: profile.designation?.trim(),
        login_password: profile.login_password, // Allow users to update their own password
        updated_at: new Date().toISOString()
      }).eq('id', userId);

      if (error) throw error;
      
      showNotification("Profile credentials successfully synchronized.", "success");
      await refreshUser();
      setView('hub');
    } catch (err: any) { 
      showNotification("Sync failed: " + err.message, "error"); 
    } finally { 
      setSaving(false); 
    }
  };

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pass = "";
    for (let i = 0; i < 12; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
    setProfile(prev => ({ ...prev, login_password: pass }));
    setShowPassword(true);
  };

  if (view === 'hub') return (
    <div className="min-h-screen bg-[#f8fafc] pb-32 px-6 md:px-12 pt-12 animate-in fade-in duration-500 max-w-6xl mx-auto">
      <header className="mb-16"><h1 className="text-4xl font-black text-slate-900 tracking-tight">Workspace Hub</h1><p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em] mt-2 opacity-80">CENTRALIZED FIRM ADMINISTRATION</p></header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        
        {isAdmin && (
          <button onClick={() => setView('form')} className="p-10 bg-white border border-slate-100 rounded-[48px] shadow-sm text-left group hover:border-emerald-500 transition-all hover:-translate-y-1">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-[28px] flex items-center justify-center mb-8 group-hover:scale-110 transition-transform"><FormInput className="w-8 h-8" /></div>
            <h3 className="text-xl font-black text-slate-900 mb-2">Form Blueprint</h3>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">Define technical parameters and land specs for intake.</p>
            <div className="mt-8 flex items-center gap-2 text-emerald-600 text-[10px] font-black uppercase tracking-widest">Manage Schema <ChevronRight className="w-3 h-3" /></div>
          </button>
        )}

        {isAdmin && (
          <Link to="/settings/recycle-bin" className="p-10 bg-white border border-slate-100 rounded-[48px] shadow-sm group hover:border-red-500 transition-all hover:-translate-y-1">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-[28px] flex items-center justify-center mb-8 group-hover:scale-110 transition-transform"><History className="w-8 h-8" /></div>
            <h3 className="text-xl font-black text-slate-900 mb-2">Archive Vault</h3>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">Access soft-deleted records and permanently purge.</p>
            <div className="mt-8 flex items-center gap-2 text-red-600 text-[10px] font-black uppercase tracking-widest">Open Bin <ChevronRight className="w-3 h-3" /></div>
          </Link>
        )}

        <Link to="/team" className="p-10 bg-white border border-slate-100 rounded-[48px] shadow-sm group hover:border-blue-500 transition-all hover:-translate-y-1">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-[28px] flex items-center justify-center mb-8 group-hover:scale-110 transition-transform"><Users className="w-8 h-8" /></div>
          <h3 className="text-xl font-black text-slate-900 mb-2">Design Team</h3>
          <p className="text-xs text-slate-400 font-medium leading-relaxed">Manage workspace staff and define roles.</p>
          <div className="mt-8 flex items-center gap-2 text-blue-600 text-[10px] font-black uppercase tracking-widest">Directory <ChevronRight className="w-3 h-3" /></div>
        </Link>

        <button onClick={() => setView('profile')} className="p-10 bg-white border border-slate-100 rounded-[48px] shadow-sm text-left group hover:border-slate-900 transition-all hover:-translate-y-1">
          <div className="w-16 h-16 bg-slate-50 text-slate-600 rounded-[28px] flex items-center justify-center mb-8 group-hover:scale-110 transition-transform"><UserCircle className="w-8 h-8" /></div>
          <h3 className="text-xl font-black text-slate-900 mb-2">My Credentials</h3>
          <p className="text-xs text-slate-400 font-medium leading-relaxed">Update professional bio and security credentials.</p>
          <div className="mt-8 flex items-center gap-2 text-slate-600 text-[10px] font-black uppercase tracking-widest">Update Profile <ChevronRight className="w-3 h-3" /></div>
        </button>
      </div>
    </div>
  );

  if (view === 'profile') return (
    <div className="min-h-screen bg-[#f8fafc] pb-32 px-6 md:px-12 pt-12 animate-in slide-in-from-right-6 duration-500 max-w-4xl mx-auto">
      <header className="mb-12 flex items-center gap-6">
         <button onClick={() => setView('hub')} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:bg-slate-50 transition-all"><ArrowLeft className="w-5 h-5 text-slate-500" /></button>
         <div><h1 className="text-3xl font-black text-slate-900 tracking-tight">Identity Management</h1><p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2 opacity-80">VERIFIED FIRM CREDENTIALS</p></div>
      </header>

      <div className="bg-white rounded-[48px] border border-slate-100 shadow-xl p-10 md:p-16 space-y-16 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-500/5 blur-[80px] rounded-full pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.full_name || 'Arch'}`} className="w-32 h-32 md:w-40 md:h-40 rounded-[40px] bg-slate-50 border-4 border-white shadow-2xl" alt="Avatar" />
          <div className="text-center md:text-left space-y-2">
            <h2 className="text-3xl font-black text-slate-900">{profile.full_name || 'System User'}</h2>
            <p className="text-[#064e3b] font-black uppercase tracking-[0.3em] text-[10px]">{profile.designation || 'Architectural Staff'}</p>
            <div className="flex items-center gap-2 mt-4 justify-center md:justify-start">
              <span className="px-3 py-1 bg-slate-50 text-slate-400 border border-slate-100 rounded-lg text-[9px] font-black uppercase tracking-widest">{profile.role}</span>
              <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${profile.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>{profile.status}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-12 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-slate-50">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Full Name</label>
              <input required className="w-full h-14 px-6 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white border border-slate-100 focus:border-emerald-500/20 transition-all shadow-inner" value={profile.full_name || ''} onChange={e => setProfile({...profile, full_name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Designation</label>
              <input className="w-full h-14 px-6 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white border border-slate-100 focus:border-emerald-500/20 transition-all shadow-inner" placeholder="e.g. Senior Architect" value={profile.designation || ''} onChange={e => setProfile({...profile, designation: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Phone Contact</label>
              <input className="w-full h-14 px-6 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white border border-slate-100 focus:border-emerald-500/20 transition-all shadow-inner" value={profile.phone || ''} onChange={e => setProfile({...profile, phone: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Security Password</label>
              <div className="relative">
                <input required type={showPassword ? 'text' : 'password'} className="w-full h-14 pl-6 pr-24 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white border border-slate-100 focus:border-emerald-500/20 transition-all shadow-inner" value={profile.login_password || ''} onChange={e => setProfile({...profile, login_password: e.target.value})} />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="p-2 text-slate-300 hover:text-slate-600 transition-all">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                  <button type="button" onClick={generatePassword} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all" title="Generate Secure Password"><Wand2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          </div>

          <button type="submit" disabled={saving} className="w-full py-7 bg-[#064e3b] text-white rounded-[28px] text-[12px] font-black uppercase tracking-[0.3em] shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50">
            {saving ? <RefreshCw className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5 text-emerald-400" />} 
            Synchronize Credentials
          </button>
        </form>
      </div>
    </div>
  );

  return null;
};

export default Settings;
