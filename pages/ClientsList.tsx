
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Lead } from '../types';
import { Search, Eye, RefreshCw, Briefcase, MapPin } from 'lucide-react';
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
      const { data } = await supabase
        .from('leads')
        .select('*')
        .eq('is_client', true)
        .is('deleted_at', null)
        .order('converted_at', { ascending: false });
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
    <div className="min-h-screen bg-[#f8fafc] pb-20 animate-in fade-in duration-500">
      {/* Sticky Header Section */}
      <div className="sticky top-0 z-40 bg-[#f8fafc]/90 backdrop-blur-md px-4 md:px-10 pt-8 pb-4 border-b border-transparent">
        <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-[#0f172a] tracking-tight">Active Portfolio</h1>
            <p className="text-slate-400 text-sm mt-1 font-medium">Managing {clients.length} converted project lifecycles.</p>
          </div>
          <div className="bg-emerald-50 text-emerald-700 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-2">
            <Briefcase className="w-4 h-4" /> Validated Contracts
          </div>
        </header>
      </div>

      <div className="px-4 md:px-10 mt-6">
        {/* Table Card */}
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
          {/* Search Header */}
          <div className="p-6 md:p-8">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
              <input 
                type="text" 
                placeholder="Search active clients or locations..."
                className="w-full pl-12 pr-4 h-14 bg-white border border-slate-100 rounded-[24px] text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-200 transition-all"
                value={search} 
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Client Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/30 text-slate-400 text-[10px] uppercase font-black tracking-[0.2em] border-b border-slate-50">
                  <th className="px-10 py-5">Project Lead</th>
                  <th className="px-10 py-5">Architectural Specs</th>
                  <th className="px-10 py-5">Conversion Date</th>
                  <th className="px-10 py-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-10 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <RefreshCw className="w-6 h-6 text-[#064e3b] animate-spin" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Loading Pipeline...</span>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-10 py-20 text-center text-slate-400 font-medium text-sm">
                      No active projects found matching your search.
                    </td>
                  </tr>
                ) : filtered.map((c) => (
                  <tr key={c.id} onClick={() => navigate(`/leads/${c.id}`)} className="hover:bg-slate-50/50 transition-all cursor-pointer group">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-[20px] flex items-center justify-center font-black text-base group-hover:bg-[#064e3b] group-hover:text-white transition-all shadow-sm">
                          {c.client_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-black text-[#0f172a]">{c.client_name}</p>
                          <p className="text-[11px] text-slate-400 font-medium mt-0.5">{c.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <div className="flex flex-col gap-1">
                        <p className="text-xs font-black text-emerald-600 uppercase tracking-tight truncate max-w-[200px]">
                          {c.package || 'Discovery Package'}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {c.address || 'Location Pending'}
                        </p>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-700">
                          {c.converted_at ? new Date(c.converted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Active Project</span>
                      </div>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <div className="flex items-center justify-end">
                        <div className="p-3 bg-white border border-transparent group-hover:border-slate-100 group-hover:shadow-sm rounded-xl text-slate-300 group-hover:text-emerald-500 transition-all">
                          <Eye className="w-5 h-5" />
                        </div>
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
