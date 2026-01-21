
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, UserCircle, Mail, Briefcase, 
  ShieldCheck, RefreshCw, Building2, Eye, EyeOff, Lock, 
  CheckCircle2, FileText, FileSpreadsheet, Users, Layers, 
  Hammer, Users2, Settings, Wand2, ShieldAlert
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
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [adminProfile, setAdminProfile] = useState<Profile | null>(null);
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    designation: '',
    password: '',
    role: 'staff' as UserRole
  });

  const [permissions, setPermissions] = useState({
    leads: true,
    quotations: false,
    clients: false,
    projects: false,
    construction: false,
    team: false,
    settings: false
  });

  useEffect(() => {
    validateAccess();
  }, [id]);

  const validateAccess = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return navigate('/');

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error || !profile) {
        showNotification("Identity could not be verified in the profile vault.", "error");
        return navigate('/');
      }

      const userRole = (profile.role || '').toLowerCase();
      if (userRole !== 'office_admin' && userRole !== 'super_admin') {
        showNotification(`Security Protocol: Role '${profile.role}' lacks provisioning clearance.`, "error");
        return navigate('/');
      }

      setAdminProfile(profile);

      if (isEditing) {
        const { data, error: editError } = await supabase.from('profiles').select('*').eq('id', id).single();
        if (editError) throw editError;
        setFormData({
          full_name: data.full_name,
          email: data.email,
          phone: data.phone || '',
          designation: data.designation || '',
          password: data.login_password || '',
          role: data.role || 'staff'
        });
        if (data.permissions) {
          setPermissions(prev => ({ ...prev, ...data.permissions }));
        }
      }
    } catch (err: any) {
      showNotification("Security Layer Exception: " + err.message, "error");
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = (key: keyof typeof permissions) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pass = "";
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password: pass }));
    showNotification("Secure password generated.", "info");
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (!adminProfile?.office_id) throw new Error("Administrator session lacks a valid Office Link.");

      const payload = {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        designation: formData.designation,
        role: formData.role,
        office_id: adminProfile.office_id,
        status: 'active',
        permissions: permissions,
        login_password: formData.password,
        updated_at: new Date().toISOString()
      };

      if (isEditing) {
        const { error } = await supabase.from('profiles').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('profiles').insert([payload]);
        if (error) throw error;
      }
      
      showNotification("Staff credentials and permissions provisioned.", "success");
      navigate('/team');
    } catch (err: any) {
      showNotification("Sync Failed: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const permissionList = [
    { key: 'leads', label: 'Lead Portfolio', desc: 'Inquiry management module', icon: FileText },
    { key: 'quotations', label: 'Quotations', desc: 'Proposal and Bidding module', icon: FileSpreadsheet },
    { key: 'clients', label: 'Client Directory', desc: 'Active contract management', icon: Users },
    { key: 'projects', label: 'Project Vault', desc: 'Architectural tracking module', icon: Layers },
    { key: 'construction', label: 'Construction', desc: 'Site execution and visit logs', icon: Hammer },
    { key: 'team', label: 'Team Directory', desc: 'Personnel visibility', icon: Users2 },
    { key: 'settings', label: 'Setting', desc: 'System configuration access', icon: Settings },
  ] as const;

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center gap-6">
      <RefreshCw className="w-10 h-10 text-[#064e3b] animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Verifying Security Clearances...</p>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 pb-32 animate-in slide-in-from-bottom-6">
      <header className="flex items-center gap-6 mb-12">
        <button onClick={() => navigate('/team')} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-400 hover:text-slate-900 transition-all"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{isEditing ? 'Modify Permissions' : 'Provision Staff'}</h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Vault Branch: {adminProfile?.office_id?.slice(0,8).toUpperCase()}</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-12">
        {/* Profile Identity & Security */}
        <div className="bg-white rounded-[48px] border border-slate-100 shadow-2xl p-10 md:p-14 space-y-16 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none" />
          
          <div className="space-y-10 relative z-10">
            <h3 className="text-[11px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-3"><UserCircle className="w-5 h-5" /> Staff Identification & Security</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative">
                  <UserCircle className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input required className="w-full h-14 pl-12 pr-6 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white transition-all" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Email</label>
                <div className="relative">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input required type="email" className="w-full h-14 pl-12 pr-6 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white transition-all" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Designation</label>
                <div className="relative">
                  <Briefcase className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input className="w-full h-14 pl-12 pr-6 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white transition-all" placeholder="Architect" value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Login Password</label>
                <div className="relative group/pass">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within/pass:text-emerald-500 transition-colors" />
                  <input 
                    required 
                    type={showPassword ? 'text' : 'password'} 
                    className="w-full h-14 pl-12 pr-28 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white transition-all" 
                    value={formData.password} 
                    onChange={e => setFormData({...formData, password: e.target.value})} 
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="p-2 text-slate-300 hover:text-slate-600 transition-all">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button type="button" onClick={generatePassword} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all" title="Generate Secure Password">
                      <Wand2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Access Control Section */}
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
               const isActive = permissions[perm.key as keyof typeof permissions];
               return (
                 <button 
                   key={perm.key}
                   type="button"
                   onClick={() => handleTogglePermission(perm.key as keyof typeof permissions)}
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
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${isActive ? 'bg-emerald-500 border-emerald-400 shadow-md' : 'bg-slate-50 border-slate-100'}`}>
                       {isActive ? <CheckCircle2 className="w-5 h-5 text-white" /> : <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />}
                    </div>
                 </button>
               );
             })}
          </div>

          <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-100 flex items-start gap-4">
             <ShieldAlert className="w-6 h-6 text-slate-300 shrink-0" />
             <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
               Module Integrity: Password defined above will be the staff member's primary login credential. Permissions defined here will hide or show entire application modules in the sidebar.
             </p>
          </div>
        </div>

        <button type="submit" disabled={saving} className="w-full py-8 bg-[#064e3b] text-white rounded-[32px] text-[12px] font-black uppercase tracking-[0.3em] shadow-xl flex items-center justify-center gap-4 hover:bg-black transition-all active:scale-95 disabled:opacity-50">
          {saving ? <RefreshCw className="w-6 h-6 animate-spin" /> : <ShieldCheck className="w-6 h-6 text-emerald-400" />}
          Commit Staff Entry & Access Protocol
        </button>
      </form>
    </div>
  );
};

export default StaffOnboarding;
