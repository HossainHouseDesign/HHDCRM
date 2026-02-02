
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, UserCircle, RefreshCw, Eye, EyeOff, Lock, 
  FileText, FileSpreadsheet, Users, Layers, 
  Hammer, Users2, Settings, Wand2, ShieldAlert, MapPin,
  Banknote, BookOpen, Search, Check, ChevronRight,
  Shield, UserPlus, Trash2, Edit3, Contact, ShieldCheck
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { UserRole, ModulePermissions } from '../types';
import { useNotification, useUser } from '../App';

interface Cashbook {
  id: string;
  name: string;
  description: string;
}

const DEFAULT_MODULE_PERMS: ModulePermissions = {
  view: true,
  create: true,
  edit: true,
  delete: true,
  see_contact: true
};

const StaffOnboarding = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const { showNotification } = useNotification();
  const { isAdmin, loading: contextLoading } = useUser();

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  
  const [availableCashbooks, setAvailableCashbooks] = useState<Cashbook[]>([]);
  const [selectedCashbooks, setSelectedCashbooks] = useState<string[]>([]);
  const [cashbookSearch, setCashbookSearch] = useState('');
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    designation: '',
    password: '',
    role: 'staff' as UserRole
  });

  const [permissions, setPermissions] = useState<any>({
    leads: { ...DEFAULT_MODULE_PERMS },
    site_visits: { ...DEFAULT_MODULE_PERMS },
    quotations: { ...DEFAULT_MODULE_PERMS },
    clients: { ...DEFAULT_MODULE_PERMS },
    projects: { ...DEFAULT_MODULE_PERMS },
    construction: { ...DEFAULT_MODULE_PERMS },
    finance: { ...DEFAULT_MODULE_PERMS },
    team: { ...DEFAULT_MODULE_PERMS },
    settings: { access: true }
  });

  useEffect(() => {
    if (!contextLoading) validateAccess();
  }, [id, contextLoading]);

  const validateAccess = async () => {
    if (!isAdmin) {
      showNotification("Account Alert: Admin access required.", "error");
      return navigate('/');
    }

    try {
      setLoading(true);
      const { data: cbData } = await supabase.from('finance_cashbooks').select('id, name, description').is('deleted_at', null);
      setAvailableCashbooks(cbData || []);

      if (isEditing) {
        const [profileRes, permsRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', id).single(),
          supabase.from('finance_cashbook_permissions').select('cashbook_id').eq('profile_id', id)
        ]);

        if (profileRes.error) throw profileRes.error;
        
        const data = profileRes.data;
        setFormData({
          full_name: data.full_name || '',
          email: data.email || '',
          phone: data.phone || '',
          designation: data.designation || '',
          password: data.login_password || '',
          role: (data.role as UserRole) || 'staff'
        });
        
        if (data.permissions) {
          setPermissions(data.permissions);
        }

        if (permsRes.data) {
          setSelectedCashbooks(permsRes.data.map(p => p.cashbook_id));
        }
      }
    } catch (err: any) {
      showNotification("Failed to access personnel records.", "error");
      navigate('/team');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleModuleAction = (module: string, action: string) => {
    setPermissions(prev => {
      const currentMod = prev[module] || { view: false, create: false, edit: false, delete: false, see_contact: false };
      return {
        ...prev,
        [module]: {
          ...currentMod,
          [action]: !currentMod[action]
        }
      };
    });
  };

  const handleMasterToggle = (module: string) => {
    setPermissions(prev => {
      const currentMod = prev[module] || { view: false, create: false, edit: false, delete: false, see_contact: false };
      const isAnyOn = currentMod.view || currentMod.create || currentMod.edit || currentMod.delete || currentMod.see_contact;
      
      const newState = !isAnyOn;
      return {
        ...prev,
        [module]: {
          view: newState,
          create: newState,
          edit: newState,
          delete: newState,
          see_contact: newState
        }
      };
    });
  };

  const toggleSettingsAccess = () => {
    setPermissions(prev => ({
      ...prev,
      settings: { ...prev.settings, access: !prev.settings?.access }
    }));
  };

  const toggleCashbook = (cbId: string) => {
    setSelectedCashbooks(prev => 
      prev.includes(cbId) ? prev.filter(id => id !== cbId) : [...prev, cbId]
    );
  };

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pass = "";
    for (let i = 0; i < 12; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
    setFormData(prev => ({ ...prev, password: pass }));
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const payload: any = {
        full_name: formData.full_name.trim() || 'Staff Member',
        email: formData.email.toLowerCase().trim(),
        phone: formData.phone.trim(),
        designation: formData.designation.trim() || 'Architectural Staff',
        role: formData.role,
        status: 'active',
        permissions: permissions,
        login_password: formData.password,
        updated_at: new Date().toISOString()
      };

      let targetId = id;

      if (isEditing) {
        const { error } = await supabase.from('profiles').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { data: newProfile, error } = await supabase.from('profiles').insert([payload]).select().single();
        if (error) throw error;
        targetId = newProfile.id;
      }
      
      if (targetId) {
        await supabase.from('finance_cashbook_permissions').delete().eq('profile_id', targetId);
        if (permissions.finance?.view && selectedCashbooks.length > 0) {
          const perms = selectedCashbooks.map(cbId => ({
            profile_id: targetId,
            cashbook_id: cbId,
            can_input: true,
            can_edit: true,
            can_delete: true,
            can_archive: true
          }));
          await supabase.from('finance_cashbook_permissions').insert(perms);
        }
      }
      
      showNotification("Staff member saved successfully.", "success");
      navigate('/team');
    } catch (err: any) {
      showNotification("Failed to save personnel details: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const modules = [
    { key: 'leads', label: 'Leads Portfolio', icon: FileText, hasContact: true },
    { key: 'site_visits', label: 'Site Visit Logs', icon: MapPin, hasContact: false },
    { key: 'quotations', label: 'Proposals', icon: FileSpreadsheet, hasContact: false },
    { key: 'clients', label: 'Client Directory', icon: Users, hasContact: true },
    { key: 'projects', label: 'Project Vault', icon: Layers, hasContact: false },
    { key: 'construction', label: 'Construction Hub', icon: Hammer, hasContact: false },
    { key: 'finance', label: 'Finance Command', icon: Banknote, hasContact: false },
    { key: 'team', label: 'Team Directory', icon: Users2, hasContact: false },
  ] as const;

  const filteredCashbooks = availableCashbooks.filter(cb => 
    cb.name.toLowerCase().includes(cashbookSearch.toLowerCase())
  );

  if (loading || contextLoading) return (
    <div className="h-screen flex flex-col items-center justify-center gap-6 bg-[#f8fafc]">
      <RefreshCw className="w-10 h-10 text-[#064e3b] animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Account Details...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-6 pt-12 pb-32 animate-in slide-in-from-bottom-6">
      <header className="flex items-center gap-6 mb-12">
        <button onClick={() => navigate('/team')} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-400 hover:text-slate-900 transition-all"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{isEditing ? 'Update Member' : 'Add New Member'}</h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">FIRM ACCOUNT SETUP</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-12">
        <div className="bg-white rounded-[48px] border border-slate-100 shadow-2xl p-10 md:p-14 space-y-10 relative overflow-hidden">
          <h3 className="text-[11px] font-black text-[#064e3b] uppercase tracking-widest flex items-center gap-3"><UserCircle className="w-5 h-5" /> Identification & Access</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
              <input required className="w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white transition-all shadow-inner" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Email</label>
              <input required type="email" className="w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white transition-all shadow-inner" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Job Title</label>
              <input required className="w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white transition-all shadow-inner" placeholder="e.g. Senior Architect" value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Access Password</label>
              <div className="relative">
                <input required type={showPassword ? 'text' : 'password'} className="w-full h-14 pl-6 pr-24 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white transition-all shadow-inner" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="p-2 text-slate-300 hover:text-slate-600 transition-all">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                  <button type="button" onClick={generatePassword} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all" title="Create New Password"><Wand2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[48px] border border-slate-100 shadow-xl p-10 md:p-14 space-y-12">
          <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
             <ShieldCheck className="w-6 h-6 text-emerald-500" />
             <div>
                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Access Control</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">SELECT FEATURES THIS MEMBER CAN ACCESS</p>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
             {modules.map((m) => {
               const modPerms = permissions[m.key] || { view: false, create: false, edit: false, delete: false, see_contact: false };
               const isAnyEnabled = modPerms.view || modPerms.create || modPerms.edit || modPerms.delete || modPerms.see_contact;

               return (
                 <div key={m.key} className={`p-8 rounded-[40px] border transition-all space-y-6 ${isAnyEnabled ? 'bg-white border-emerald-500/30 shadow-xl ring-4 ring-emerald-500/5' : 'bg-slate-50/20 border-slate-100'}`}>
                    <div 
                      onClick={() => handleMasterToggle(m.key)}
                      className="flex items-center gap-4 border-b border-slate-50 pb-4 cursor-pointer group/header"
                    >
                       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isAnyEnabled ? 'bg-[#064e3b] text-white shadow-lg' : 'bg-slate-100 text-slate-400 group-hover/header:bg-slate-200'}`}>
                          <m.icon className="w-6 h-6" />
                       </div>
                       <div className="text-left flex-1 min-w-0">
                          <span className={`text-[15px] font-black block leading-tight truncate transition-colors ${isAnyEnabled ? 'text-slate-900' : 'text-slate-400'}`}>{m.label}</span>
                          <span className={`text-[8px] font-black uppercase tracking-widest ${isAnyEnabled ? 'text-emerald-600' : 'text-slate-300'}`}>{isAnyEnabled ? 'Feature Enabled' : 'Feature Locked'}</span>
                       </div>
                       <button 
                         type="button"
                         className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isAnyEnabled ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-200 text-transparent group-hover/header:border-emerald-300'}`}
                       >
                          <Check className="w-3.5 h-3.5" />
                       </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                       {[
                         { key: 'view', label: 'Only View', icon: Eye },
                         { key: 'create', label: 'Can Add', icon: UserPlus },
                         { key: 'edit', label: 'Can Edit', icon: Edit3 },
                         { key: 'delete', label: 'Can Erase', icon: Trash2 },
                       ].map(action => (
                         <button
                           key={action.key}
                           type="button"
                           onClick={() => handleToggleModuleAction(m.key, action.key)}
                           className={`flex items-center gap-2.5 p-3 rounded-2xl border text-[10px] font-black uppercase tracking-tight transition-all ${modPerms[action.key] ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm' : 'bg-white border-slate-100 text-slate-300 hover:border-emerald-100 hover:text-emerald-400'}`}
                         >
                            <action.icon className="w-3.5 h-3.5" />
                            {action.label}
                         </button>
                       ))}
                       {m.hasContact && (
                         <button
                           type="button"
                           onClick={() => handleToggleModuleAction(m.key, 'see_contact')}
                           className={`col-span-2 flex items-center justify-center gap-2.5 p-3 rounded-2xl border text-[10px] font-black uppercase tracking-tight transition-all ${modPerms.see_contact ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' : 'bg-white border-slate-100 text-slate-300 hover:border-blue-100 hover:text-blue-400'}`}
                         >
                            <Contact className="w-3.5 h-3.5" />
                            View Client Contacts
                         </button>
                       )}
                    </div>
                 </div>
               );
             })}

             <div className={`p-8 rounded-[40px] border transition-all flex flex-col justify-between ${permissions.settings?.access ? 'bg-white border-amber-500/30 shadow-xl ring-4 ring-amber-500/5' : 'bg-slate-50/20 border-slate-100'}`}>
                <div 
                  onClick={toggleSettingsAccess}
                  className="flex items-center gap-4 border-b border-slate-50 pb-4 cursor-pointer group/settings"
                >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${permissions.settings?.access ? 'bg-amber-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400 group-hover/settings:bg-slate-200'}`}>
                       <Settings className="w-6 h-6" />
                    </div>
                    <div className="text-left flex-1">
                       <span className={`text-[15px] font-black block leading-tight transition-colors ${permissions.settings?.access ? 'text-slate-900' : 'text-slate-400'}`}>Admin Settings</span>
                       <span className={`text-[8px] font-black uppercase tracking-widest ${permissions.settings?.access ? 'text-amber-600' : 'text-slate-300'}`}>Management Rights</span>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${permissions.settings?.access ? 'bg-amber-50 border-amber-500 text-white' : 'bg-white border-slate-200 text-transparent group-hover/settings:border-amber-300'}`}>
                        <Check className="w-3.5 h-3.5" />
                    </div>
                </div>
                <button
                  type="button"
                  onClick={toggleSettingsAccess}
                  className={`w-full flex items-center justify-center gap-3 p-4 rounded-2xl border text-[11px] font-black uppercase tracking-widest transition-all mt-6 ${permissions.settings?.access ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-sm' : 'bg-white border-slate-100 text-slate-300 hover:text-amber-500'}`}
                >
                   <Shield className="w-4 h-4" />
                   {permissions.settings?.access ? 'Access Allowed' : 'Access Restricted'}
                </button>
             </div>
          </div>

          {permissions.finance?.view && (
            <div className="pt-12 mt-12 border-t border-slate-100 space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                      <BookOpen className="w-6 h-6 text-emerald-600" /> Cashbook Access
                    </h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">SELECT INDIVIDUAL CASHBOOKS AUTHORIZED FOR THIS MEMBER</p>
                  </div>
                  <div className="relative w-full md:w-64 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-emerald-500" />
                    <input 
                      type="text" 
                      placeholder="Search cashbooks..." 
                      className="w-full h-12 pl-11 pr-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:bg-white outline-none transition-all"
                      value={cashbookSearch}
                      onChange={e => setCashbookSearch(e.target.value)}
                    />
                  </div>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCashbooks.length === 0 ? (
                    <div className="col-span-full py-10 text-center bg-slate-50 rounded-[32px] border border-dashed border-slate-200">
                      <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest">No matching funds found</p>
                    </div>
                  ) : filteredCashbooks.map(cb => {
                    const isSelected = selectedCashbooks.includes(cb.id);
                    return (
                      <button 
                        key={cb.id} 
                        type="button" 
                        onClick={() => toggleCashbook(cb.id)}
                        className={`p-6 rounded-[32px] border transition-all text-left flex items-start justify-between group ${isSelected ? 'bg-emerald-600 border-emerald-500 text-white shadow-xl shadow-emerald-900/10 scale-[1.02]' : 'bg-white border-slate-100 text-slate-500 hover:border-emerald-200 hover:bg-emerald-50/10'}`}
                      >
                         <div className="space-y-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSelected ? 'bg-white/20' : 'bg-slate-50 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500'}`}>
                               <Banknote className="w-5 h-5" />
                            </div>
                            <div>
                               <p className={`text-sm font-black ${isSelected ? 'text-white' : 'text-slate-900'}`}>{cb.name}</p>
                               <p className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>{cb.description} Fund</p>
                            </div>
                         </div>
                         <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-white border-white text-emerald-600' : 'bg-white border-slate-100 text-transparent'}`}>
                            <Check className="w-4 h-4" />
                         </div>
                      </button>
                    );
                  })}
               </div>
            </div>
          )}

          <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-100 flex items-start gap-4">
             <ShieldAlert className="w-6 h-6 text-slate-300 shrink-0" />
             <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
               Security Notice: Management rights define exactly what this member can see and do. Administrators automatically have full access to all features and cashbooks.
             </p>
          </div>
        </div>

        <button type="submit" disabled={saving} className="w-full py-8 bg-[#064e3b] text-white rounded-[32px] text-[12px] font-black uppercase tracking-[0.3em] shadow-xl flex items-center justify-center gap-4 hover:bg-black transition-all active:scale-95 disabled:opacity-50">
          {saving ? <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" /> : <ShieldCheck className="w-6 h-6 text-emerald-400" />}
          Save Member Details
        </button>
      </form>
    </div>
  );
};

export default StaffOnboarding;
