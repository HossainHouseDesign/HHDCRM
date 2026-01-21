
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Trash2, RefreshCw, Edit2, Users, ShieldCheck, UserCircle, AlertTriangle
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Profile } from '../types';
import { useNotification } from '../App';

const TeamList = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<Profile[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const [teamRes, profileRes] = await Promise.all([
        supabase.from('profiles').select('*').is('deleted_at', null).order('role', { ascending: true }),
        user ? supabase.from('profiles').select('*').eq('id', user.id).single() : Promise.resolve({ data: null })
      ]);

      setTeam(teamRes.data || []);
      if (profileRes.data) setCurrentUser(profileRes.data);
    } catch (err) {
      showNotification("Failed to synchronize team directory.", "error");
    } finally {
      setLoading(false);
    }
  };

  const isUserAdmin = () => {
    const role = (currentUser?.role || '').toLowerCase();
    return role === 'office_admin' || role === 'super_admin';
  };

  const getRoleBadge = (role: string) => {
    const r = (role || '').toLowerCase();
    if (r === 'office_admin') return { label: 'Office Admin', style: 'bg-[#064e3b] text-white' };
    if (r === 'super_admin') return { label: 'Super Admin', style: 'bg-slate-900 text-white' };
    return { label: 'Staff', style: 'bg-blue-50 text-blue-600 border border-blue-100' };
  };

  const softDeleteEmployee = async (target: Profile) => {
    if (!isUserAdmin()) {
      showNotification("Access Denied: Only Office Admins can modify staff records.", "error");
      return;
    }

    if (target.id === currentUser?.id) {
      showNotification("Security Protocol: You cannot archive your own administrative account.", "warning");
      return;
    }

    if (!window.confirm(`Archive ${target.full_name} to the Recycle Bin?`)) return;

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
      showNotification(`${target.full_name} archived successfully.`, "success");
    } catch (err: any) {
      console.error("Delete error:", err);
      showNotification("Archive failed: " + (err.message || "Database constraint error. Ensure 'deleted_at' column exists."), "error");
    }
  };

  if (loading) return (
    <div className="h-[50vh] flex flex-col items-center justify-center gap-4">
      <RefreshCw className="w-8 h-8 text-[#064e3b] animate-spin" />
      <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Accessing Team Records...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20 px-6 md:px-10 pt-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Firm Directory</h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1 opacity-80">Synchronized Human Capital Management</p>
        </div>
        {isUserAdmin() && (
          <button 
            onClick={() => navigate('/settings/staff/new')}
            className="flex items-center gap-2 px-8 py-4 bg-[#064e3b] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-emerald-900/10 active:scale-95"
          >
            <Plus className="w-4 h-4" /> Provision Staff
          </button>
        )}
      </header>

      {!isUserAdmin() && (
        <div className="mb-8 p-6 bg-amber-50 border border-amber-100 rounded-3xl flex items-center gap-4 text-amber-700">
           <AlertTriangle className="w-5 h-5 shrink-0" />
           <p className="text-xs font-bold">ReadOnly Access: Only Office Admins can provision or archive personnel.</p>
        </div>
      )}

      <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
        <div className="p-8 bg-slate-50/30 border-b border-slate-50">
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#064e3b] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Verified Operational Personnel
            </h2>
        </div>
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left min-w-[600px]">
            <thead>
              <tr className="text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-50">
                <th className="px-10 py-6">Member Identity</th>
                <th className="px-10 py-6">Security Access</th>
                <th className="px-10 py-6 text-right">Vault Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {team.length === 0 ? (
                <tr><td colSpan={3} className="px-10 py-24 text-center text-slate-300 font-bold uppercase tracking-widest text-[10px]">No active staff entries</td></tr>
              ) : team.map(s => {
                const badge = getRoleBadge(s.role);
                const isSelf = s.id === currentUser?.id;
                return (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-4">
                        <img 
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${s.full_name}`} 
                          className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 group-hover:scale-105 transition-transform" 
                          alt={s.full_name} 
                        />
                        <div>
                          <p className="text-sm font-black text-slate-900 flex items-center gap-2">
                            {s.full_name}
                            {isSelf && <span className="px-2 py-0.5 bg-slate-100 text-slate-400 rounded-lg text-[8px] uppercase tracking-widest">You</span>}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold">{s.designation || 'Architectural Staff'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm ${badge.style}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                        {isUserAdmin() && (
                          <>
                            <button onClick={() => navigate(`/settings/staff/edit/${s.id}`)} className="p-3 text-slate-400 hover:text-[#064e3b] hover:bg-white rounded-xl transition-all" title="Edit Staff">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {!isSelf && (
                              <button onClick={() => softDeleteEmployee(s)} className="p-3 text-slate-400 hover:text-red-500 hover:bg-white rounded-xl transition-all" title="Archive Staff">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                        {!isUserAdmin() && <UserCircle className="w-5 h-5 text-slate-200" />}
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
