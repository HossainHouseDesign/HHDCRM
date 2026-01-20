import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Lead } from '../types';
import { Search, Eye, RefreshCw, Briefcase, MapPin, Hash, BriefcaseIcon } from 'lucide-react';
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
      const { data } = await supabase.from('leads').select('*').eq('is_client', true).is('deleted_at', null).order('converted_at', { ascending: false });
      setClients(data || []);
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
    <div className="min-h-screen bg-[#f8fafc] pb-24 animate-in fade-in duration-700">
      <div className="sticky top-16 lg:top-0 z-40 bg-[#f8fafc]/90 backdrop-blur-xl px-6 md:px-10 pt-10 pb-8 border-b border-slate-50 shadow-sm">
        <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Active Portfolio</h1>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em] mt-2 opacity-80 flex items-center gap-2">
              <BriefcaseIcon className="w-3.5 h-3.5 text-emerald-500" /> MANAGING CONVERTED PROJECT LIFECYCLES
            </p>
          </div>
          <div className="bg-emerald-50 text-emerald-700 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-3 shadow-sm">
            <Briefcase className="w-4 h-4" /> Validated Contracts
          </div>
        </header>

        <div className="relative w-full max-w-lg">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
          <input 
            type="text" 
            placeholder="Search active clients or locations..."
            className="w-full pl-16 pr-6 h-16 bg-white border border-slate-100 rounded-[28px] text-[13px] font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all shadow-sm"
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="px-6 md:px-10 mt-10">
        <div className="bg-white rounded-[48px] border border-slate-100 shadow-xl shadow-slate-200/5 overflow-hidden">
          <div className="overflow-x-auto no-scrollbar max-h-[calc(100vh-320px)] overflow-y-auto">
            <table className="w-full text-left min-w-[1000px] border-separate border-spacing-0">
              <thead className="sticky top-0 z-[40] bg-white">
                <tr className="bg-white text-slate-400 text-[10px] uppercase font-black tracking-[0.25em]">
                  <th className="px-10 py-7 border-b border-slate-100 bg-white">Project Lead</th>
                  <th className="px-10 py-7 border-b border-slate-100 bg-white">Architectural Specs</th>
                  <th className="px-10 py-7 border-b border-slate-100 bg-white">Conversion Status</th>
                  <th className="px-10 py-7 border-b border-slate-100 bg-white text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={4} className="py-24 text-center"><RefreshCw className="w-10 h-10 text-[#064e3b] animate-spin mx-auto" /></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={4} className="py-24 text-center text-slate-300 font-black tracking-widest">No active projects found</td></tr>
                ) : filtered.map((c) => (
                  <tr key={c.id} onClick={() => navigate(`/leads/${c.id}`)} className="hover:bg-slate-50/80 transition-all cursor-pointer group">
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-[20px] flex items-center justify-center font-black text-lg group-hover:bg-[#064e3b] group-hover:text-white transition-all shadow-sm">
                          {c.client_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-[15px] font-black text-slate-900 group-hover:text-emerald-700 transition-colors">{c.client_name}</p>
                          <p className="text-[11px] text-slate-400 font-bold mt-1.5">{c.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex flex-col gap-1.5">
                        <p className="text-[12px] font-black text-slate-700 uppercase tracking-tight">{c.package || 'Discovery Package'}</p>
                        <p className="text-[10px] text-slate-400 font-bold flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400" /> {c.address || 'Location Pending'}
                        </p>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-black text-slate-800">
                          {c.converted_at ? new Date(c.converted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                        </span>
                        <span className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1 opacity-70">VALIDATED CONTRACT</span>
                      </div>
                    </td>
                    <td className="px-10 py-8 text-right">
                       <div className="inline-flex p-3 bg-white border border-slate-100 rounded-xl shadow-sm text-slate-300 group-hover:text-emerald-600 transition-all group-hover:shadow-md group-hover:scale-110">
                          <Eye className="w-5 h-5" />
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