
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
    <div className="min-h-screen bg-slate-50/50 pb-32 animate-in fade-in duration-500 text-slate-900">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <header className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
             <button onClick={() => navigate('/team')} className="p-2.5 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all text-slate-400 hover:text-slate-900">
                <ArrowLeft className="w-5 h-5" />
             </button>
             <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{isEditing ? 'Modify Personnel' : 'Initialize Staff Member'}</h1>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Personnel Management Registry</p>
             </div>
          </div>
          <div className={`p-3 rounded-2xl border ${isEditing ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
             {isEditing ? <Edit3 className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
          </div>
        </header>

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Identity Section */}
          <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-8">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-6 mb-2">
               <Contact className="w-5 h-5 text-emerald-500" />
               <h2 className="text-lg font-bold text-slate-900 tracking-tight">Personnel Identity</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Full Name</label>
                <div className="relative group">
                  <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 transition-colors" />
                  <input
                    type="text"
                    className="w-full h-12 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-emerald-500 outline-none transition-all"
                    placeholder="Enter full name"
                    value={formData.full_name}
                    onChange={e => setFormData(p => ({ ...p, full_name: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Official Designation</label>
                <div className="relative group">
                  <Wand2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 transition-colors" />
                  <input
                    type="text"
                    className="w-full h-12 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-emerald-500 outline-none transition-all"
                    placeholder="e.g. Project Manager"
                    value={formData.designation}
                    onChange={e => setFormData(p => ({ ...p, designation: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Phone Number</label>
                <input
                  type="text"
                  className="w-full h-12 px-5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-emerald-500 outline-none transition-all"
                  placeholder="01XXXXXXXXX"
                  value={formData.phone}
                  onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Official Email</label>
                <input
                  type="email"
                  className="w-full h-12 px-5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-emerald-500 outline-none transition-all"
                  placeholder="staff@hhd.com"
                  value={formData.email}
                  disabled={isEditing}
                  onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Access Credentials</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full h-12 pl-12 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-emerald-500 outline-none transition-all"
                    placeholder="Minimum 6 characters"
                    value={formData.password}
                    onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Platform Role</label>
                <select
                  className="w-full h-12 px-5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-emerald-500 outline-none transition-all appearance-none cursor-pointer"
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
          <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-8">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-6 mb-2">
               <ShieldCheck className="w-5 h-5 text-blue-500" />
               <h2 className="text-lg font-bold text-slate-900 tracking-tight">Access Permissions</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {modules.map(module => {
                const modPerms = permissions[module.key] || { view: false, create: false, edit: false, delete: false, see_contact: false };
                const isAnyEnabled = modPerms.view || modPerms.create || modPerms.edit || modPerms.delete || modPerms.see_contact;

                return (
                <div key={module.key} className={`p-5 rounded-2xl border transition-all ${isAnyEnabled ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-100 opacity-60'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <module.icon className={`w-4 h-4 ${isAnyEnabled ? 'text-slate-900' : 'text-slate-300'}`} />
                      <span className="text-sm font-bold text-slate-900">{module.label}</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={isAnyEnabled} onChange={() => handleMasterToggle(module.key)} />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>
                  
                  {isAnyEnabled && (
                    <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-100">
                      {[ 
                        { k: 'view', l: 'View' }, { k: 'create', l: 'Add' }, { k: 'edit', l: 'Edit' }, 
                        { k: 'delete', l: 'Del' }
                      ].map(p => (
                        <button
                          key={p.k}
                          type="button"
                          onClick={() => handleToggleModuleAction(module.key, p.k)}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 border ${modPerms[p.k] ? 'bg-white border-emerald-200 text-emerald-700 shadow-sm' : 'bg-slate-100 border-transparent text-slate-400 opacity-50'}`}
                        >
                          {modPerms[p.k] ? <Check className="w-3 h-3" /> : null}
                          {p.l}
                        </button>
                      ))}
                      {module.hasContact && (
                        <button
                          type="button"
                          onClick={() => handleToggleModuleAction(module.key, 'see_contact')}
                          className={`col-span-2 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 border ${modPerms.see_contact ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' : 'bg-slate-100 border-transparent text-slate-400 opacity-50'}`}
                        >
                          {modPerms.see_contact ? <Check className="w-3 h-3" /> : null}
                          View Contacts
                        </button>
                      )}
                    </div>
                  )}
                </div>
                )})}
              
              {/* Settings Access */}
              <div className={`p-5 rounded-2xl border transition-all ${permissions.settings?.access ? 'bg-slate-900 border-slate-900' : 'bg-white border-slate-100 opacity-60'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Settings className={`w-4 h-4 ${permissions.settings?.access ? 'text-emerald-400' : 'text-slate-300'}`} />
                    <span className={`text-sm font-bold ${permissions.settings?.access ? 'text-white' : 'text-slate-900'}`}>System Settings</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={permissions.settings?.access} onChange={toggleSettingsAccess} />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
                <p className={`text-[10px] font-medium mt-2 leading-relaxed ${permissions.settings?.access ? 'text-white/40' : 'text-slate-400'}`}>Allows modification of global configurations and user roles.</p>
              </div>
            </div>
          </section>

          {permissions.finance?.view && (
             <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-8">
               <div className="flex items-center gap-3 border-b border-slate-100 pb-6 mb-2">
                  <BookOpen className="w-5 h-5 text-emerald-500" />
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">Fund Permissions</h2>
               </div>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {availableCashbooks.map(cb => {
                    const active = selectedCashbooks.includes(cb.id);
                    return (
                      <button 
                        key={cb.id} 
                        type="button" 
                        onClick={() => toggleCashbook(cb.id)}
                        className={`p-4 rounded-xl border text-left flex items-center justify-between transition-all ${active ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-white'}`}
                      >
                        <span className="text-xs font-bold truncate pr-4">{cb.name}</span>
                        {active && <Check className="w-4 h-4 shrink-0" />}
                      </button>
                    )
                  })}
               </div>
             </section>
          )}

          <footer className="pt-8">
             <button
               type="submit"
               disabled={saving}
               className={`w-full h-14 rounded-2xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${saving ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-xl'}`}
             >
               {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
               {isEditing ? 'Authorize Personnel Update' : 'Finalize Boarding Process'}
             </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default StaffOnboarding;
