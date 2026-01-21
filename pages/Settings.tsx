
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Plus, Trash2, RefreshCw, Eye, EyeOff, Lock, ChevronRight, Users, 
  UserCircle, FormInput, ArrowLeft, Save, Shield, RotateCcw, 
  Mail, Phone, Briefcase, Camera, Tag, ListFilter, X, History,
  Type as TypeIcon
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
  const { isAdmin } = useUser();
  const [view, setView] = useState<'hub' | 'form' | 'profile'>('hub');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) setProfile(data);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from('profiles').update({
        full_name: profile.full_name,
        phone: profile.phone,
        designation: profile.designation,
        updated_at: new Date().toISOString()
      }).eq('id', user.id);
      if (error) throw error;
      showNotification("Profile credentials successfully synchronized.", "success");
      setView('hub');
    } catch (err: any) { showNotification("Sync failed: " + err.message, "error"); }
    finally { setSaving(false); }
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
         <button onClick={() => setView('hub')} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:bg-slate-50"><ArrowLeft className="w-5 h-5 text-slate-500" /></button>
         <div><h1 className="text-3xl font-black text-slate-900 tracking-tight">Identity Management</h1><p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2 opacity-80">VERIFIED FIRM CREDENTIALS</p></div>
      </header>
      <div className="bg-white rounded-[48px] border border-slate-100 shadow-xl p-10 md:p-16 space-y-12">
        <div className="flex flex-col md:flex-row items-center gap-10">
          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.full_name || 'Arch'}`} className="w-32 h-32 md:w-40 md:h-40 rounded-[40px] bg-slate-50 border-4 border-white shadow-2xl" alt="Avatar" />
          <div className="text-center md:text-left space-y-2">
            <h2 className="text-2xl font-black text-slate-900">{profile.full_name || 'System User'}</h2>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">{profile.designation || 'Architectural Staff'}</p>
          </div>
        </div>
        <form onSubmit={handleUpdateProfile} className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-slate-50">
          <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Full Name</label><input className="w-full h-14 px-6 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white border-2 border-transparent transition-all" value={profile.full_name || ''} onChange={e => setProfile({...profile, full_name: e.target.value})} /></div>
          <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Designation</label><input className="w-full h-14 px-6 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white border-2 border-transparent transition-all" value={profile.designation || ''} onChange={e => setProfile({...profile, designation: e.target.value})} /></div>
          <div className="md:col-span-2 pt-8"><button type="submit" disabled={saving} className="w-full py-6 bg-[#064e3b] text-white rounded-[24px] text-[12px] font-black uppercase tracking-[0.3em] shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-4">{saving ? <RefreshCw className="animate-spin" /> : <Save className="w-5 h-5 text-emerald-400" />} Synchronize Identity</button></div>
        </form>
      </div>
    </div>
  );

  return null;
};

export default Settings;
