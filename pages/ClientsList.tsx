
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Lead } from '../types';
import { Search, Eye, RefreshCw, Briefcase, MapPin, Hash, BriefcaseIcon, UserCheck, Plus, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ClientsList = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      // FIX: Added !created_by to the creator join to resolve ambiguity
      const { data, error } = await supabase
        .from('leads')
        .select('*, creator:profiles!created_by(full_name)')
        .eq('is_client', true)
        .is('deleted_at', null)
        .order('converted_at', { ascending: false });
      
      if (error) throw error;
      setClients(data || []);
    } catch (err: any) {
      console.error("Client Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = clients.filter(c => 
    c.client_name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search) ||
    (c.address && c.address.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 animate-in fade-in duration-500 relative">
      <div className="sticky top-14 lg:top-0 z-40 bg-white px-4 py-2 border-b border-slate-100 transition-all leading-none">
        <header className="flex flex-row justify-between items-center gap-4 mb-2 leading-none">
          <div className="leading-none">
            <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none uppercase">Client Base</h1>
            <p className="text-slate-300 text-[7px] font-black uppercase tracking-widest mt-1.5 flex items-center gap-1.5 leading-none opacity-80">
              <Plus className="w-3 h-3 text-slate-900" /> STAKEHOLDER DIRECTORY
            </p>
          </div>
          <button onClick={() => navigate('/clients/add')} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-black transition-all active:scale-95 leading-none flex items-center gap-2">
            <Plus className="w-3 h-3" /> Acquisition
          </button>
        </header>

        <div className="relative w-full max-w-lg leading-none">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-300" />
          <input 
            type="text" 
            placeholder="Search stakeholders..."
            className="w-full pl-9 pr-4 h-7 bg-slate-50 border border-slate-100 rounded-lg text-[11px] font-bold text-slate-700 outline-none focus:bg-white transition-all shadow-none leading-none"
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="px-4 mt-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-12">
          <div className="overflow-x-auto no-scrollbar max-h-[calc(100vh-220px)] overflow-y-auto">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead className="sticky top-0 z-[40] bg-white">
                <tr className="bg-slate-50/50 text-slate-400 text-[8px] uppercase font-bold tracking-widest leading-none">
                  <th className="px-5 py-2.5 border-b border-slate-100 bg-slate-50/50">Client Identity</th>
                  <th className="px-5 py-2.5 border-b border-slate-100 bg-slate-50/50">Strategy / Loc</th>
                  <th className="px-5 py-2.5 border-b border-slate-100 bg-slate-50/50">Initiator</th>
                  <th className="px-5 py-2.5 border-b border-slate-100 bg-slate-50/50">Validation</th>
                  <th className="px-5 py-2.5 border-b border-slate-100 bg-slate-50/50 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={5} className="py-24 text-center"><RefreshCw className="w-8 h-8 text-emerald-900 animate-spin mx-auto" /><p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-4">Accessing Vault...</p></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="py-24 text-center text-slate-200 font-bold tracking-widest uppercase text-[10px]">Vault Records Empty</td></tr>
                ) : filtered.map((c) => (
                  <tr key={c.id} onClick={() => navigate(`/leads/${c.id}`)} className="hover:bg-slate-50/30 transition-all cursor-pointer group">
                    <td className="px-5 py-2">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 bg-slate-50 text-slate-200 rounded-lg flex items-center justify-center font-black group-hover:bg-slate-900 group-hover:text-white transition-all shadow-none">
                          {c.client_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-slate-900 group-hover:text-emerald-700 transition-colors truncate uppercase tracking-tight leading-none">{c.client_name}</p>
                          <p className="text-[8px] text-slate-300 font-bold leading-none mt-1 uppercase">#{c.id.slice(0,8).toUpperCase()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-2">
                      <div className="flex flex-col gap-1">
                        <p className="text-[11px] font-bold text-slate-700 uppercase tracking-tight leading-none leading-none truncate max-w-[150px]">{c.package || 'Standard'}</p>
                        <p className="text-[8px] text-slate-400 font-bold flex items-center gap-1 leading-none uppercase">
                          <Phone className="w-2.5 h-2.5 text-emerald-400 shrink-0" /> {c.phone}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-2">
                        <div className="flex items-center gap-2">
                           <div className="w-5 h-5 bg-slate-50 rounded flex items-center justify-center text-slate-200 group-hover:bg-slate-900 group-hover:text-white transition-all">
                              <UserCheck className="w-2.5 h-2.5" />
                           </div>
                           <p className="text-[10px] font-bold text-slate-500 uppercase leading-none">{c.creator?.full_name?.split(' ')[0] || 'Staff'}</p>
                        </div>
                    </td>
                    <td className="px-5 py-2">
                      <div className="flex flex-col leading-none">
                        <span className="text-[11px] font-bold text-slate-800 uppercase leading-none">
                          {c.converted_at ? new Date(c.converted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'N/A'}
                        </span>
                        <span className="text-[7px] text-slate-200 font-bold uppercase tracking-widest mt-1">Confirmed</span>
                      </div>
                    </td>
                    <td className="px-5 py-2 text-right">
                       <div className="inline-flex p-1.5 text-slate-100 group-hover:text-emerald-600 transition-all">
                          <Eye className="w-3.5 h-3.5" />
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientsList;
