
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Trash2, RefreshCw, Edit2, Users
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Profile } from '../types';

const TeamList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<Profile[]>([]);

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    setLoading(true);
    try {
      const { data: teamRes } = await supabase
        .from('profiles')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      setTeam(teamRes || []);
    } finally {
      setLoading(false);
    }
  };

  const softDeleteEmployee = async (id: string) => {
    if (!window.confirm('Archive this staff member to the Recycle Bin?')) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      setTeam(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      alert("Failed to archive user.");
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
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Team Hub</h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1 opacity-80">Manage workspace access & permissions</p>
        </div>
        <button 
          onClick={() => navigate('/settings/staff/new')}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-blue-900/10"
        >
          <Plus className="w-4 h-4" /> Invite Staff
        </button>
      </header>

      <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
        <div className="p-8 bg-slate-50/50 border-b border-slate-50">
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-700 flex items-center gap-2">
              <Users className="w-4 h-4" /> Registered Staff Records
            </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-50">
                <th className="px-10 py-6">Workspace User</th>
                <th className="px-10 py-6">Security Role</th>
                <th className="px-10 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {team.length === 0 ? (
                <tr><td colSpan={3} className="px-10 py-20 text-center text-slate-300 font-bold uppercase tracking-widest text-[10px]">No staff profiles found</td></tr>
              ) : team.map(s => (
                <tr key={s.id} className="hover:bg-slate-50/50 transition-all">
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center font-black text-sm uppercase">
                        {s.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900">{s.full_name}</p>
                        <p className="text-[10px] text-slate-400 font-bold">{s.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm ${s.role === 'Admin' ? 'bg-[#064e3b] text-white' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                      {s.role}
                    </span>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => navigate(`/settings/staff/edit/${s.id}`)} className="p-3 text-slate-300 hover:text-[#064e3b] hover:bg-white rounded-xl transition-all">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => softDeleteEmployee(s.id)} className="p-3 text-red-300 hover:text-red-500 hover:bg-white rounded-xl transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TeamList;
