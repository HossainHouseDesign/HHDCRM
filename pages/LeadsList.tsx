
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Lead, LeadStatus } from '../types';
import { 
  Search, Plus, Eye, RefreshCw, Hash, Mail, MapPin, 
  Banknote, Layers, Calendar, Phone, Home 
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const LeadsList = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<LeadStatus | 'All'>('All');

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('leads')
        .select('*')
        .eq('is_client', false)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      setLeads(data || []);
    } finally {
      setLoading(false);
    }
  };

  const statusMap: Record<LeadStatus, { label: string; color: string }> = {
    'Discovery': { label: 'Discovery', color: 'bg-blue-50 text-blue-600 border-blue-100' },
    'Follow_Up': { label: 'Follow Up', color: 'bg-amber-50 text-amber-600 border-amber-100' },
    'Quotation': { label: 'Quotation', color: 'bg-purple-50 text-purple-600 border-purple-100' },
    'Completed': { label: 'Completed', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
    'Rejected': { label: 'Rejected', color: 'bg-red-50 text-red-600 border-red-100' },
  };

  const filtered = leads.filter(l => 
    (l.client_name.toLowerCase().includes(search.toLowerCase()) || 
     l.phone.includes(search) || 
     (l.email && l.email.toLowerCase().includes(search.toLowerCase()))) && 
    (activeFilter === 'All' || l.status === activeFilter)
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24 animate-in fade-in duration-500">
      <div className="sticky top-0 z-40 bg-[#f8fafc]/80 backdrop-blur-md px-6 md:px-10 pt-10 pb-6">
        <header className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8">
          <div>
            <h1 className="text-4xl font-black text-[#0f172a] tracking-tight">Lead Portfolio</h1>
            <p className="text-slate-400 text-sm mt-1.5 font-medium flex items-center gap-2">
              <Home className="w-4 h-4" /> Monitoring {leads.length} architectural design inquiries.
            </p>
          </div>
          <Link to="/leads/new" className="w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-5 bg-[#064e3b] text-white rounded-[24px] text-[11px] font-black uppercase tracking-[0.2em] hover:bg-black transition-all shadow-2xl shadow-emerald-900/10 active:scale-95">
            <Plus className="w-5 h-5" /> New Lead Intake
          </Link>
        </header>

        <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar">
          {(['All', 'Discovery', 'Follow_Up', 'Quotation', 'Rejected'] as (LeadStatus | 'All')[]).map((status) => (
            <button
              key={status}
              onClick={() => setActiveFilter(status)}
              className={`whitespace-nowrap px-8 py-3.5 rounded-[20px] text-[9px] font-black uppercase tracking-[0.2em] transition-all border ${activeFilter === status ? 'bg-slate-900 text-white border-transparent shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}
            >
              {status === 'All' ? 'All Leads' : status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 md:px-10">
        <div className="bg-white rounded-[48px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row gap-6 justify-between items-center">
            <div className="relative w-full max-w-lg">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
              <input 
                type="text" 
                placeholder="Search by client name, ID, or contact info..."
                className="w-full pl-16 pr-6 h-16 bg-white border border-slate-100 rounded-[28px] text-[13px] font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all"
                value={search} 
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="hidden lg:flex items-center gap-4 text-[9px] font-black text-slate-300 uppercase tracking-widest">
               <Hash className="w-4 h-4" /> SECURE DISCOVERY VAULT
            </div>
          </div>

          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left min-w-[1200px]">
              <thead>
                <tr className="text-slate-400 text-[10px] uppercase font-black tracking-[0.25em] border-b border-slate-50">
                  <th className="px-10 py-7">ID & Client</th>
                  <th className="px-10 py-7">Contact Info</th>
                  <th className="px-10 py-7">Project Details</th>
                  <th className="px-10 py-7">Budget & Location</th>
                  <th className="px-10 py-7">Current Status</th>
                  <th className="px-10 py-7">Created Date</th>
                  <th className="px-10 py-7 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={7} className="py-24 text-center"><RefreshCw className="w-10 h-10 text-[#064e3b] animate-spin mx-auto" /></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="py-24 text-center text-slate-300 font-black uppercase tracking-widest">No matching leads found</td></tr>
                ) : filtered.map((l) => (
                  <tr key={l.id} onClick={() => navigate(`/leads/${l.id}`)} className="hover:bg-slate-50/80 transition-all cursor-pointer group">
                    <td className="px-10 py-8">
                       <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1.5">#{l.id.slice(0,8).toUpperCase()}</p>
                       <p className="text-sm font-black text-slate-900 group-hover:text-emerald-700 transition-colors">{l.client_name}</p>
                    </td>
                    <td className="px-10 py-8">
                       <div className="space-y-2">
                          <p className="text-[12px] font-bold text-slate-700 flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-300" /> {l.phone}</p>
                          <p className="text-[12px] font-bold text-slate-500 flex items-center gap-2 truncate max-w-[180px]"><Mail className="w-3.5 h-3.5 text-slate-300" /> {l.email || 'N/A'}</p>
                       </div>
                    </td>
                    <td className="px-10 py-8">
                       <div className="flex items-center gap-3">
                          <div className="p-3 bg-blue-50 text-blue-600 rounded-[14px]"><Layers className="w-4 h-4" /></div>
                          <div>
                             <p className="text-[12px] font-black text-slate-700">{l.package || 'House Design'}</p>
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{l.foundation || 'Standard'}</p>
                          </div>
                       </div>
                    </td>
                    <td className="px-10 py-8">
                       <div className="space-y-1.5">
                          <p className="text-[12px] font-black text-emerald-700 flex items-center gap-2"><Banknote className="w-3.5 h-3.5 text-emerald-300" /> {l.budget || 'Open'}</p>
                          <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {l.address || 'Global'}</p>
                       </div>
                    </td>
                    <td className="px-10 py-8">
                      <span className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border whitespace-nowrap ${statusMap[l.status]?.color}`}>
                        {statusMap[l.status]?.label}
                      </span>
                    </td>
                    <td className="px-10 py-8">
                       <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                          <Calendar className="w-4 h-4 text-slate-300" />
                          {new Date(l.created_at).toLocaleDateString()}
                       </div>
                    </td>
                    <td className="px-10 py-8 text-right">
                       <div className="inline-flex p-3 bg-white border border-slate-100 rounded-xl shadow-sm text-slate-300 group-hover:text-emerald-600 transition-all">
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

export default LeadsList;
