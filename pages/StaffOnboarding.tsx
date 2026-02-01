import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, UserCircle, Mail, Briefcase, 
  ShieldCheck, RefreshCw, Building2, Eye, EyeOff, Lock, 
  CheckCircle2, FileText, FileSpreadsheet, Users, Layers, 
  Hammer, Users2, Settings, Wand2, ShieldAlert, MapPin,
  Banknote, BookOpen, Search, Check, ChevronRight
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { UserRole, Profile } from '../types';
import { useNotification, useUser } from '../App';

interface Cashbook {
  id: string;
  name: string;
  description: string;
}

const StaffOnboarding = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const { showNotification } = useNotification();
  const { isAdmin, loading: contextLoading } = useUser();

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  
  // Data for granular permissions
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

  const [permissions, setPermissions] = useState<Record<string, boolean>>({
    leads: true,
    site_visits: true,
    quotations: false,
    clients: false,
    projects: false,
    construction: false,
    finance: false,
    team: false,
    settings: false
  });

  useEffect(() => {
    if (!contextLoading) validateAccess();
  }, [id, contextLoading]);

  const validateAccess = async () => {
    if (!isAdmin) {
      showNotification("Security Protocol: Administrative clearance required.", "error");
      return navigate('/');
    }

    try {
      setLoading(true);
      
      // Fetch available cashbooks for the assignment section
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
          setPermissions(prev => ({ ...prev, ...data.permissions }));
        }

        if (permsRes.data) {
          setSelectedCashbooks(permsRes.data.map(p => p.cashbook_id));
        }
      }
    } catch (err: any) {
      showNotification("Record Access Error: " + err.message, "error");
      navigate('/team');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = (key: string) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
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
        full_name: formData.full_name.trim() || 'Unknown Staff',
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
      
      // Update Cashbook granular permissions
      if (targetId) {
        await supabase.from('finance_cashbook_permissions').delete().eq('profile_id', targetId);
        if (permissions.finance && selectedCashbooks.length > 0) {
          const perms = selectedCashbooks.map(cbId => ({
            profile_id: targetId,
            cashbook_id: cbId
          }));
          await supabase.from('finance_cashbook_permissions').insert(perms);
        }
      }
      
      showNotification("Staff registry synchronized.", "success");
      navigate('/team');
    } catch (err: any) {
      showNotification("Provisioning Failed: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const permissionList = [
    { key: 'leads', label: 'Lead Portfolio', desc: 'Inquiry management', icon: FileText },
    { key: 'site_visits', label: 'Site Visit', desc: 'Field operation logs', icon: MapPin },
    { key: 'quotations', label: 'Quotations', desc: 'Proposal management', icon: FileSpreadsheet },
    { key: 'clients', label: 'Client Directory', desc: 'Active contracts', icon: Users },
    { key: 'projects', label: 'Project Vault', desc: 'Design tracking', icon: Layers },
    { key: 'construction', label: 'Construction', desc: 'Site execution logs', icon: Hammer },
    { key: 'finance', label: 'Finance Command', desc: 'Fiscal ledger access', icon: Banknote },
    { key: 'team', label: 'Team Directory', desc: 'Personnel visibility', icon: Users2 },
    { key: 'settings', label: 'Setting', desc: 'System configuration', icon: Settings },
  ] as const;

  const filteredCashbooks = availableCashbooks.filter(cb => 
    cb.name.toLowerCase().includes(cashbookSearch.toLowerCase())
  );

  if (loading || contextLoading) return (
    <div className="h-screen flex flex-col items-center justify-center gap-6 bg-[#f8fafc]">
      <RefreshCw className="w-10 h-10 text-[#064e3b] animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Verifying Security Clearances...</p>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-6 pt-12 pb-32 animate-in slide-in-from-bottom-6">
      <header className="flex items-center gap-6 mb-12">
        <button onClick={() => navigate('/team')} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-400 hover:text-slate-900 transition-all"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{isEditing ? 'Modify Personnel' : 'Provision Staff'}</h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Firm Security Protocol</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-12">
        <div className="bg-white rounded-[48px] border border-slate-100 shadow-2xl p-10 md:p-14 space-y-16 relative overflow-hidden">
          <div className="space-y-10 relative z-10">
            <h3 className="text-[11px] font-black text-[#064e3b] uppercase tracking-widest flex items-center gap-3"><UserCircle className="w-5 h-5" /> Identification & Credentials</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                <input required className="w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white transition-all shadow-inner" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Email</label>
                <input required type="email" className="w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white transition-all shadow-inner" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Designation</label>
                <input required className="w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white transition-all shadow-inner" placeholder="e.g. Senior Architect" value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Login Password</label>
                <div className="relative">
                  <input required type={showPassword ? 'text' : 'password'} className="w-full h-14 pl-6 pr-24 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white transition-all shadow-inner" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="p-2 text-slate-300 hover:text-slate-600 transition-all">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                    <button type="button" onClick={generatePassword} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all" title="Generate Secure Password"><Wand2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[48px] border border-slate-100 shadow-xl p-10 md:p-14 space-y-12">
          <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
             <ShieldCheck className="w-6 h-6 text-emerald-500" />
             <div>
                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Access Control Protocol</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Authorized Navigation Provisioning</p>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {permissionList.map((perm) => {
               const isActive = permissions[perm.key] === true;
               return (
                 <button 
                   key={perm.key}
                   type="button"
                   onClick={() => handleTogglePermission(perm.key)}
                   className={`w-full h-28 px-6 bg-white border rounded-[32px] transition-all flex items-center justify-between group/cb shadow-sm relative overflow-hidden ${isActive ? 'border-emerald-500 bg-emerald-50/20 ring-4 ring-emerald-500/5' : 'border-slate-100 hover:border-slate-200'}`}
                 >
                    <div className="flex items-center gap-4 relative z-10">
                       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isActive ? 'bg-[#064e3b] text-white shadow-lg' : 'bg-slate-50 text-slate-300'}`}>
                          <perm.icon className="w-5 h-5" />
                       </div>
                       <div className="text-left">
                          <span className={`text-[14px] font-black block leading-none ${isActive ? 'text-slate-900' : 'text-slate-600'}`}>{perm.label}</span>
                          <p className={`text-[9px] font-black mt-2 uppercase tracking-widest ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {isActive ? 'Authorized' : 'Restricted'}
                          </p>
                       </div>
                    </div>
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${isActive ? 'bg-emerald-500 border-emerald-400 shadow-md' : 'bg-white border-slate-100'}`}>
                       {isActive ? <CheckCircle2 className="w-5 h-5 text-white" /> : <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />}
                    </div>
                 </button>
               );
             })}
          </div>

          {/* Granular Cashbook Permissions Section */}
          {permissions.finance && (
            <div className="pt-12 mt-12 border-t border-slate-100 space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                      <BookOpen className="w-6 h-6 text-emerald-600" /> Fiscal Ledger Access
                    </h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">SELECT INDIVIDUAL CASHBOOKS AUTHORIZED FOR THIS PROFILE</p>
                  </div>
                  <div className="relative w-full md:w-64 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-emerald-500" />
                    <input 
                      type="text" 
                      placeholder="Search ledgers..." 
                      className="w-full h-12 pl-11 pr-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:bg-white outline-none transition-all"
                      value={cashbookSearch}
                      onChange={e => setCashbookSearch(e.target.value)}
                    />
                  </div>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCashbooks.length === 0 ? (
                    <div className="col-span-full py-10 text-center bg-slate-50 rounded-[32px] border border-dashed border-slate-200">
                      <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest">No matching ledgers found</p>
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
                               <p className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>{cb.description} Ledger</p>
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
               Module Integrity: The login credentials and permissions defined here will take immediate effect upon the next staff login. Administrators have automatic access to all ledgers.
             </p>
          </div>
        </div>

        <button type="submit" disabled={saving} className="w-full py-8 bg-[#064e3b] text-white rounded-[32px] text-[12px] font-black uppercase tracking-[0.3em] shadow-xl flex items-center justify-center gap-4 hover:bg-black transition-all active:scale-95 disabled:opacity-50">
          {saving ? <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" /> : <ShieldCheck className="w-6 h-6 text-emerald-400" />}
          Commit Staff Entry & Access Protocol
        </button>
      </form>
    </div>
  );
};

export default StaffOnboarding;