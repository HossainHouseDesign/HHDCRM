
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, UserPlus, UserCircle, Mail, Briefcase, 
  Phone, ShieldCheck, RefreshCw, Building2 
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
  const [adminProfile, setAdminProfile] = useState<Profile | null>(null);
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    designation: '',
    password: '',
    role: 'staff' as UserRole
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

      // Normalized role check
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
          password: '',
          role: 'staff'
        });
      }
    } catch (err: any) {
      showNotification("Security Layer Exception: " + err.message, "error");
      navigate('/');
    } finally {
      setLoading(false);
    }
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
        role: 'staff',
        office_id: adminProfile.office_id,
        status: 'active',
        updated_at: new Date().toISOString()
      };

      if (isEditing) {
        const { error } = await supabase.from('profiles').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        // Create profile entry
        const { error } = await supabase.from('profiles').insert([payload]);
        if (error) throw error;
      }
      
      showNotification("Staff credentials provisioned successfully.", "success");
      navigate('/team');
    } catch (err: any) {
      showNotification("Sync Failed: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center gap-6">
      <RefreshCw className="w-10 h-10 text-[#064e3b] animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Verifying Security Clearances...</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 pb-32 animate-in slide-in-from-bottom-6">
      <header className="flex items-center gap-6 mb-12">
        <button onClick={() => navigate('/team')} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-400 hover:text-slate-900 transition-all"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{isEditing ? 'Update Credentials' : 'Provision Staff'}</h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Vault Branch: {adminProfile?.office_id?.slice(0,8).toUpperCase()}</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="bg-white rounded-[48px] border border-slate-100 shadow-2xl p-10 md:p-16 space-y-16 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none" />
        
        <div className="space-y-10 relative z-10">
          <h3 className="text-[11px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-3"><UserCircle className="w-5 h-5" /> Staff Identification</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
              <input required className="w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white transition-all" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Email</label>
              <input required type="email" className="w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white transition-all" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Designation</label>
              <input className="w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white transition-all" placeholder="Architect" value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Firm Branch</label>
              <div className="w-full h-14 px-6 bg-slate-100 border border-slate-200 rounded-2xl font-bold text-slate-400 flex items-center gap-2 cursor-not-allowed">
                <Building2 className="w-4 h-4" /> Branch Encrypted
              </div>
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving} className="w-full py-6 bg-[#064e3b] text-white rounded-[24px] text-[12px] font-black uppercase tracking-[0.3em] shadow-xl flex items-center justify-center gap-4 hover:bg-black transition-all active:scale-95 disabled:opacity-50">
          {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5 text-emerald-400" />}
          Commit Staff Entry
        </button>
      </form>
    </div>
  );
};

export default StaffOnboarding;
