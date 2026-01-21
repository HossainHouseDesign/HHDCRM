
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Trash2, RefreshCw, Edit2, Users, ShieldCheck, UserCircle, AlertTriangle, 
  Search, ShieldAlert, Mail, Phone
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Profile } from '../types';
import { useNotification, useUser } from '../App';

const TeamList = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { profile: currentUser, isAdmin, loading: contextLoading } = useUser();
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const { data: teamRes, error } = await supabase
        .from('profiles')
        .select('*')
        .is('deleted_at', null)
        .order('role', { ascending: true });
      
      if (error) throw error;
      setTeam(teamRes || []);
    } catch (err: any) {
      showNotification("Failed to synchronize team directory: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredTeam = team.filter(s => {
    const search = searchTerm.toLowerCase();
    const name = (s.full_name || '').toLowerCase();
    const email = (s.email || '').toLowerCase();
    const designation = (s.designation || '').toLowerCase();
    return name.includes(search) || email.includes(search) || designation.includes(search);
  });

  const getRoleBadge = (role: string) => {
    const r = (role || '').toLowerCase();
    if (['office_admin', 'super_admin', 'admin', 'administrator', 'office-admin'].includes(r)) {
      return { label: 'Admin Access', style: 'bg-[#064e3b] text-white shadow-md' };
    }
    return { label: 'Firm Staff', style: 'bg-blue-50 text-blue-600 border border-blue-100' };
  };

  const softDeleteEmployee = async (target: Profile) => {
    if (!isAdmin) {
      showNotification("Access Denied: Administrative clearance required.", "error");
      return;
    }
    if (target.id === currentUser?.id) {
      showNotification("Security Protocol: You cannot archive your own account.", "warning");
      return;
    }
    if (!window.confirm(`Archive ${target.full_name || 'this staff member'} to the Recycle Bin?`)) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          deleted_at: new Date().toISOString(), 
          status: 'inactive' 
        })
        .eq('id', target.id);
      
      if (error) throw error;
      
      setTeam(prev => prev.filter(s => s.id !== target.id));
      showNotification(`${target.full_name || 'Staff Member'} archived successfully.`, "success");
    } catch (err: any) {
      showNotification("Archive failed: " + err.message, "error");
    }
  };

  if (loading || contextLoading) return (
    <div className="h-[50vh] flex flex-col items-center justify-center gap-4">
      <RefreshCw className="w-8 h-8 text-[#064e3b] animate-spin" />
      <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Accessing Team Records...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-32 px-6 md:px-10 pt-8 animate-in fade-in duration-500 max-w-6xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Firm Directory</h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1 opacity-80">Synchronized Human Capital Management</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button onClick={fetchInitialData} className="p-4 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-[#064e3b] transition-all shadow-sm active:scale-95" title="Sync Team">
            <RefreshCw className="w-5 h-5" />
          </button>
          {isAdmin && (
            <button onClick={() => navigate('/settings/staff/new')} className="flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-4 bg-[#064e3b] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95">
              <Plus className="w-4 h-4" /> Provision Staff
            </button>
          )}
        </div>
      </header>

      <div className="mb-10 flex flex-col md:flex-row items-center gap-6">
        <div className="relative w-full max-w-md group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-[#064e3b] transition-colors" />
          <input 
            type="text" 
            placeholder="Search directory..."
            className="w-full h-14 pl-12 pr-6 bg-white border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {!isAdmin && (
          <div className="px-6 py-3 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-3 text-amber-700 shadow-sm">
             <ShieldAlert className="w-4 h-4 shrink-0" />
             <p className="text-[10px] font-black uppercase tracking-widest">ReadOnly Mode Active</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden">
        <div className="p-8 bg-slate-50/30 border-b border-slate-50 flex items-center justify-between">
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#064e3b] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Verified Operational Personnel
            </h2>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{filteredTeam.length} Records Found</span>
        </div>
        
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-50">
                <th className="px-10 py-6">Member Identity</th>
                <th className="px-10 py-6">Email & Contact</th>
                <th className="px-10 py-6">Security Access</th>
                <th className="px-10 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTeam.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-10 py-24 text-center">
                    <div className="max-w-xs mx-auto space-y-4">
                      <Users className="w-12 h-12 text-slate-100 mx-auto" />
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Directory Sector Empty</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : filteredTeam.map(s => {
                const badge = getRoleBadge(s.role);
                const isSelf = s.id === currentUser?.id;
                return (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-4">
                        <img 
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${s.full_name || s.email || 'Staff'}`} 
                          className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100" 
                          alt="Avatar" 
                        />
                        <div>
                          <p className="text-sm font-black text-slate-900 flex items-center gap-2">
                            {s.full_name || 'Unnamed Member'}
                            {isSelf && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-lg text-[8px] uppercase font-black tracking-widest">You</span>}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                            {s.designation || 'Architectural Staff'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                       <div className="space-y-1">
                          <p className="text-[13px] font-bold text-slate-700">{s.email || 'N/A'}</p>
                          <p className="text-[10px] text-slate-300 font-medium">{s.phone || 'N/A'}</p>
                       </div>
                    </td>
                    <td className="px-10 py-6">
                      <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${badge.style}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                        {isAdmin && (
                          <>
                            <button onClick={() => navigate(`/settings/staff/edit/${s.id}`)} className="p-3 text-slate-400 hover:text-[#064e3b] hover:bg-white rounded-xl transition-all shadow-sm" title="Edit Profile">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {!isSelf && (
                              <button onClick={() => softDeleteEmployee(s)} className="p-3 text-slate-400 hover:text-red-500 hover:bg-white rounded-xl transition-all shadow-sm" title="Archive Profile">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                        {!isAdmin && <UserCircle className="w-5 h-5 text-slate-200" />}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TeamList;
