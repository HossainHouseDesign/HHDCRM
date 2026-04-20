
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
    <div className="min-h-screen bg-[#f8fafc] pb-32 animate-in fade-in duration-500 text-slate-900">
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-10">
        <header className="flex items-center justify-between mb-8 md:mb-10">
          <div className="flex items-center gap-4">
             <button onClick={() => navigate('/team')} className="w-10 h-10 bg-white shadow-none border border-slate-200 rounded-xl flex items-center justify-center hover:bg-slate-50 transition-all text-slate-500 hover:text-slate-900 leading-none">
                <ArrowLeft className="w-4 h-4" />
             </button>
             <div className="leading-none">
                <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">{isEditing ? 'Personnel Logic' : 'Staff Enrollment'}</h1>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1.5 opacity-80 leading-none">Personnel Management Registry</p>
             </div>
          </div>
          <div className="w-10 h-10 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center text-slate-900 shadow-none leading-none">
             {isEditing ? <Edit3 className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          </div>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
          {/* Identity Section */}
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-none space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-4 mb-2">
               <Contact className="w-4 h-4 text-slate-900" />
               <h2 className="text-[11px] font-black text-slate-900 tracking-widest uppercase mb-0.5">Personnel Identity</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Legal Identity</label>
                <div className="relative group">
                  <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 transition-colors" />
                  <input
                    type="text"
                    required
                    className="w-full h-11 pl-11 pr-4 bg-white border border-slate-200 rounded-xl text-[13px] font-bold text-slate-700 outline-none focus:border-slate-900 transition-all shadow-none uppercase"
                    placeholder="ENTER FULL NAME"
                    value={formData.full_name}
                    onChange={e => setFormData(p => ({ ...p, full_name: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Official Designation</label>
                <div className="relative group">
                  <Wand2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 transition-colors" />
                  <input
                    type="text"
                    className="w-full h-11 pl-11 pr-4 bg-white border border-slate-200 rounded-xl text-[13px] font-bold text-slate-700 outline-none focus:border-slate-900 transition-all shadow-none uppercase"
                    placeholder="e.g. PROJECT MANAGER"
                    value={formData.designation}
                    onChange={e => setFormData(p => ({ ...p, designation: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Contact Phone</label>
                <input
                  type="text"
                  className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-[13px] font-bold text-slate-700 outline-none focus:border-slate-900 transition-all shadow-none"
                  placeholder="01XXXXXXXXX"
                  value={formData.phone}
                  onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Official Email (UID)</label>
                <input
                  type="email"
                  required
                  className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-[13px] font-bold text-slate-700 outline-none focus:border-slate-900 transition-all shadow-none"
                  placeholder="staff@hhd.com"
                  value={formData.email}
                  disabled={isEditing}
                  onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Passcode Access</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full h-11 pl-11 pr-11 bg-white border border-slate-200 rounded-xl text-[13px] font-bold text-slate-700 outline-none focus:border-slate-900 transition-all shadow-none"
                    placeholder="MIN 6 CHARACTERS"
                    value={formData.password}
                    onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-900 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Platform Authority</label>
                <select
                  className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-[12px] font-black uppercase tracking-tight outline-none focus:border-slate-900 transition-all appearance-none cursor-pointer shadow-none"
                  value={formData.role}
                  onChange={e => setFormData(p => ({ ...p, role: e.target.value as UserRole }))}
                >
                  <option value="staff">Standard Personnel</option>
                  <option value="admin">System Administrator</option>
                </select>
              </div>
            </div>
          </section>

          {/* Permissions Grid */}
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-none space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-4 mb-2">
               <ShieldCheck className="w-4 h-4 text-slate-900" />
               <h2 className="text-[11px] font-black text-slate-900 tracking-widest uppercase mb-0.5">Authorization Grid</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {modules.map(module => {
                const modPerms = permissions[module.key] || { view: false, create: false, edit: false, delete: false, see_contact: false };
                const isAnyEnabled = modPerms.view || modPerms.create || modPerms.edit || modPerms.delete || modPerms.see_contact;

                return (
                <div key={module.key} className={`p-4 rounded-xl border transition-all ${isAnyEnabled ? 'bg-slate-50/50 border-slate-900 shadow-none' : 'bg-white border-slate-100 opacity-60'}`}>
                  <div className="flex items-center justify-between mb-3 leading-none">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <module.icon className={`w-3.5 h-3.5 flex-shrink-0 ${isAnyEnabled ? 'text-slate-900' : 'text-slate-300'}`} />
                      <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight truncate leading-none">{module.label}</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                      <input type="checkbox" className="sr-only peer" checked={isAnyEnabled} onChange={() => handleMasterToggle(module.key)} />
                      <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-slate-900"></div>
                    </label>
                  </div>
                  
                  {isAnyEnabled && (
                    <div className="grid grid-cols-2 gap-1.5 pt-3 border-t border-slate-100">
                      {[ 
                        { k: 'view', l: 'View' }, { k: 'create', l: 'Add' }, { k: 'edit', l: 'Edit' }, 
                        { k: 'delete', l: 'Del' }
                      ].map(p => (
                        <button
                          key={p.k}
                          type="button"
                          onClick={() => handleToggleModuleAction(module.key, p.k)}
                          className={`px-2 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all flex items-center justify-center gap-1.5 border ${modPerms[p.k] ? 'bg-white border-slate-900 text-slate-900 shadow-none' : 'bg-slate-100 border-transparent text-slate-300 opacity-50'}`}
                        >
                          {modPerms[p.k] && <Check className="w-2.5 h-2.5 text-emerald-500" />}
                          {p.l}
                        </button>
                      ))}
                      {module.hasContact && (
                        <button
                          type="button"
                          onClick={() => handleToggleModuleAction(module.key, 'see_contact')}
                          className={`col-span-2 px-2 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all flex items-center justify-center gap-1.5 border ${modPerms.see_contact ? 'bg-slate-900 text-white border-slate-900 shadow-none' : 'bg-slate-100 border-transparent text-slate-300 opacity-50'}`}
                        >
                          {modPerms.see_contact && <Check className="w-2.5 h-2.5 text-emerald-400" />}
                          View Contacts
                        </button>
                      )}
                    </div>
                  )}
                </div>
                )})}
              
              {/* Settings Access */}
              <div className={`p-4 rounded-xl border transition-all ${permissions.settings?.access ? 'bg-slate-900 border-slate-900 shadow-none' : 'bg-white border-slate-100 opacity-60'}`}>
                <div className="flex items-center justify-between leading-none">
                  <div className="flex items-center gap-2.5">
                    <Settings className={`w-3.5 h-3.5 ${permissions.settings?.access ? 'text-emerald-400' : 'text-slate-300'}`} />
                    <span className={`text-[11px] font-black uppercase tracking-tight leading-none ${permissions.settings?.access ? 'text-white' : 'text-slate-900'}`}>Firm Logic</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={permissions.settings?.access} onChange={toggleSettingsAccess} />
                    <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-white/20"></div>
                  </label>
                </div>
                <p className={`text-[8px] font-bold mt-2.5 leading-tight uppercase tracking-wider ${permissions.settings?.access ? 'text-white/40' : 'text-slate-300'}`}>allows master configuration controls.</p>
              </div>
            </div>
          </section>

          {permissions.finance?.view && availableCashbooks.length > 0 && (
             <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-none space-y-6">
               <div className="flex items-center gap-2 border-b border-slate-50 pb-4 mb-2">
                  <BookOpen className="w-4 h-4 text-slate-900" />
                  <h2 className="text-[11px] font-black text-slate-900 tracking-widest uppercase mb-0.5">Fund Authority</h2>
               </div>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {availableCashbooks.map(cb => {
                    const active = selectedCashbooks.includes(cb.id);
                    return (
                      <button 
                        key={cb.id} 
                        type="button" 
                        onClick={() => toggleCashbook(cb.id)}
                        className={`px-4 py-3 rounded-xl border text-left flex items-center justify-between transition-all leading-none ${active ? 'bg-slate-900 border-slate-900 text-white' : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-white hover:border-slate-200'}`}
                      >
                        <span className="text-[10px] font-black uppercase truncate pr-2 tracking-tight leading-none">{cb.name}</span>
                        {active && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
                      </button>
                    )
                  })}
               </div>
             </section>
          )}

          <footer className="pt-6">
             <button
               type="submit"
               disabled={saving}
               className={`w-full h-14 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all leading-none ${saving ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white hover:bg-black shadow-none active:scale-95'}`}
             >
               {saving ? <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> : <ShieldCheck className="w-4 h-4 text-emerald-400" />}
               {isEditing ? 'AUTHORIZE PERSONNEL UPDATE' : 'COMMIT STAFF ENROLLMENT'}
             </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default StaffOnboarding;
