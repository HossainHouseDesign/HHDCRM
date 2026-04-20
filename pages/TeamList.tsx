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
    <div className="min-h-screen bg-slate-50/50 pb-20 animate-in fade-in duration-500 relative">
      <div className="sticky top-14 lg:top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm transition-all mb-4">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none uppercase">Team Archive</h1>
            <p className="text-slate-400 text-[8px] font-bold uppercase tracking-widest mt-1.5 flex items-center gap-1.5 leading-none">
              <Users className="w-3 h-3 text-emerald-500" /> FIRM DIRECTORY
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchInitialData} className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-400 hover:text-slate-900 transition-all active:scale-95">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            {isAdmin && (
              <button onClick={() => navigate('/settings/staff/new')} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-none active:scale-95 leading-none flex items-center gap-2">
                <Plus className="w-3 h-3" /> New Staff
              </button>
            )}
          </div>
        </div>

        <div className="max-w-[1600px] mx-auto px-4 pb-2 flex flex-col md:flex-row items-center gap-3">
          <div className="relative w-full max-w-sm group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-300 transition-colors" />
            <input 
              type="text" 
              placeholder="Search directory..."
              className="w-full h-8 pl-9 pr-4 bg-slate-50 border border-slate-100 rounded-lg text-xs font-medium text-slate-700 outline-none focus:bg-white transition-all shadow-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {!isAdmin && (
            <div className="px-2 py-1 bg-amber-50 border border-amber-100 rounded-lg flex items-center gap-2 text-amber-700 leading-none">
               <ShieldAlert className="w-2.5 h-2.5 shrink-0" />
               <p className="text-[7px] font-bold uppercase tracking-widest">Read Only</p>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-12 transition-all">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead className="bg-[#f8fafc]">
                <tr className="text-slate-400 text-[8px] uppercase font-bold tracking-widest leading-none">
                  <th className="px-5 py-2.5 border-b border-slate-100">Member Identity</th>
                  <th className="px-5 py-2.5 border-b border-slate-100">Contact Node</th>
                  <th className="px-5 py-2.5 border-b border-slate-100">Clearance</th>
                  <th className="px-5 py-2.5 border-b border-slate-100 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTeam.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Directory Scoped: Empty</p>
                    </td>
                  </tr>
                ) : filteredTeam.map(s => {
                  const badge = getRoleBadge(s.role);
                  const isSelf = s.id === currentUser?.id;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/30 transition-all group">
                      <td className="px-5 py-2">
                        <div className="flex items-center gap-3">
                          <img 
                            src={s.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.email || s.full_name || 'Staff'}`} 
                            className="w-8 h-8 rounded-lg bg-slate-50 shadow-none border border-slate-100 object-cover grayscale group-hover:grayscale-0 transition-all" 
                            alt="Avatar" 
                          />
                          <div className="min-w-0">
                            <p className="text-[13px] font-bold text-slate-900 group-hover:text-emerald-700 transition-colors uppercase tracking-tight truncate leading-tight">
                              {s.full_name || 'Unnamed'}
                              {isSelf && <span className="ml-1.5 px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[7px] font-black tracking-widest uppercase">Self</span>}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-0.5">
                              {s.designation || 'Staff'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-2">
                         <div className="flex flex-col gap-0.5 leading-none">
                            <p className="text-[12px] font-bold text-slate-600 leading-none truncate max-w-[200px]">{s.email || 'N/A'}</p>
                            <p className="text-[9px] text-slate-300 font-bold leading-none mt-1">{s.phone || 'N/A'}</p>
                         </div>
                      </td>
                      <td className="px-5 py-2">
                        <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest border transition-all ${badge.style}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-5 py-2 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-10 group-hover:opacity-100 transition-opacity">
                          {isAdmin && (
                            <>
                              <button onClick={() => navigate(`/settings/staff/edit/${s.id}`)} className="p-1 px-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-all" title="Edit Profile">
                                <Edit2 className="w-3 h-3" />
                              </button>
                              {!isSelf && (
                                <button onClick={() => softDeleteEmployee(s)} className="p-1 px-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all" title="Archive Profile">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </>
                          )}
                          {!isAdmin && <UserCircle className="w-4 h-4 text-slate-100" />}
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
    </div>
  );
};

export default TeamList;