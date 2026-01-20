import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Lead, LeadStatus, FormFieldConfig } from '../types';
import { 
  Search, Plus, Eye, RefreshCw, Hash, MapPin, 
  Layers, Phone, Home, Hammer, Paintbrush, FilterX, CheckCircle2,
  ChevronDown
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { DEFAULT_FORM_CONFIG } from './Settings';

export const resolveInterest = (l: Lead, dbKey: string): boolean => {
  if (!dbKey) return false;
  const check = (val: any) => {
    if (val === true || val === 'true' || val === 1 || val === '1') return true;
    if (typeof val === 'string' && val.toLowerCase() === 'yes') return true;
    return false;
  };
  if (l[dbKey as keyof Lead] !== undefined) {
    if (check(l[dbKey as keyof Lead])) return true;
  }
  if (l.metadata && l.metadata[dbKey] !== undefined) {
    if (check(l.metadata[dbKey])) return true;
  }
  return false;
};

const LeadsList = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [formConfig, setFormConfig] = useState<FormFieldConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeStatus, setActiveStatus] = useState<LeadStatus | 'All'>('All');
  const [filterConst, setFilterConst] = useState(false);
  const [filterInt, setFilterInt] = useState(false);

  const [activeStatusDropdown, setActiveStatusDropdown] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const statusMenuRef = useRef<HTMLDivElement>(null);

  const detectedKeys = useMemo(() => {
    const config = formConfig.length > 0 ? formConfig : DEFAULT_FORM_CONFIG;
    const findKey = (term: string) => config.find(f => 
      f.db_key.toLowerCase().includes(term) || 
      f.label.toUpperCase().includes(term.toUpperCase())
    )?.db_key;
    return {
      construction: findKey('construction') || 'interest_construction',
      interior: findKey('interior') || 'interest_interior'
    };
  }, [formConfig]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeStatusDropdown && statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) {
        setActiveStatusDropdown(null);
      }
    };
    const handleScroll = () => {
      if (activeStatusDropdown) setActiveStatusDropdown(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [activeStatusDropdown]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [leadsRes, configRes] = await Promise.all([
        supabase.from('leads').select('*').eq('is_client', false).is('deleted_at', null).order('created_at', { ascending: false }),
        supabase.from('settings').select('*').eq('key', 'lead_form_config').single()
      ]);
      setLeads(leadsRes.data || []);
      if (configRes.data) setFormConfig(configRes.data.value);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (leadId: string, newStatus: LeadStatus) => {
    try {
      const { error } = await supabase.from('leads').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', leadId);
      if (error) throw error;
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
      setActiveStatusDropdown(null);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleDropdown = (e: React.MouseEvent, leadId: string) => {
    e.stopPropagation();
    if (activeStatusDropdown === leadId) {
      setActiveStatusDropdown(null);
    } else {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 8, left: rect.left });
      setActiveStatusDropdown(leadId);
    }
  };

  const filtered = leads.filter(l => {
    const matchesSearch = (l.client_name.toLowerCase().includes(search.toLowerCase()) || l.phone.includes(search));
    const matchesStatus = (activeStatus === 'All' || l.status === activeStatus);
    const matchesConst = !filterConst || resolveInterest(l, detectedKeys.construction);
    const matchesInt = !filterInt || resolveInterest(l, detectedKeys.interior);
    return matchesSearch && matchesStatus && matchesConst && matchesInt;
  });

  const statusMap: Record<LeadStatus, { label: string; color: string }> = {
    'Discovery': { label: 'Discovery', color: 'bg-blue-50 text-blue-600 border-blue-100' },
    'Follow_Up': { label: 'Follow Up', color: 'bg-amber-50 text-amber-600 border-amber-100' },
    'Quotation': { label: 'Quotation', color: 'bg-purple-50 text-purple-600 border-purple-100' },
    'Completed': { label: 'Completed', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
    'Rejected': { label: 'Rejected', color: 'bg-red-50 text-red-600 border-red-100' },
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-64 animate-in fade-in duration-500">
      <div className="sticky top-16 lg:top-0 z-[60] bg-[#f8fafc]/90 backdrop-blur-xl px-6 md:px-10 pt-10 pb-6 border-b border-slate-50 shadow-sm">
        <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8">
          <div>
            <h1 className="text-4xl font-black text-[#0f172a] tracking-tight">Lead Portfolio</h1>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em] mt-2 opacity-80 flex items-center gap-2">
               <Home className="w-3.5 h-3.5" /> ARCHITECTURAL DISCOVERY PIPELINE
            </p>
          </div>
          <Link to="/leads/new" className="w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-5 bg-[#064e3b] text-white rounded-[24px] text-[11px] font-black uppercase tracking-[0.2em] hover:bg-black transition-all shadow-2xl shadow-emerald-900/10 active:scale-95">
            <Plus className="w-5 h-5" /> New Lead Intake
          </Link>
        </header>

        <div className="space-y-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            {(['All', 'Discovery', 'Follow_Up', 'Quotation', 'Rejected'] as (LeadStatus | 'All')[]).map((status) => (
              <button
                key={status}
                onClick={() => setActiveStatus(status)}
                className={`whitespace-nowrap px-8 py-3.5 rounded-[20px] text-[9px] font-black uppercase tracking-[0.2em] transition-all border ${activeStatus === status ? 'bg-slate-900 text-white border-transparent shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200 shadow-sm'}`}
              >
                {status === 'All' ? 'All Leads' : status.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4">
             <div className="relative w-full max-w-lg">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <input 
                  type="text" 
                  placeholder="Search lead entity..."
                  className="w-full pl-16 pr-6 h-16 bg-white border border-slate-100 rounded-[28px] text-[13px] font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all shadow-sm"
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)}
                />
             </div>
             <button onClick={() => setFilterConst(!filterConst)} className={`px-6 py-4 rounded-[24px] text-[10px] font-black uppercase tracking-widest border transition-all ${filterConst ? 'bg-emerald-600 text-white border-transparent' : 'bg-white text-slate-400'}`}>Construction: Yes</button>
             <button onClick={() => setFilterInt(!filterInt)} className={`px-6 py-4 rounded-[24px] text-[10px] font-black uppercase tracking-widest border transition-all ${filterInt ? 'bg-blue-600 text-white border-transparent' : 'bg-white text-slate-400'}`}>Interior: Yes</button>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-10 mt-10">
        <div className="bg-white rounded-[48px] border border-slate-100 shadow-xl shadow-slate-200/5 overflow-hidden">
          <div className="overflow-x-auto no-scrollbar max-h-[calc(100vh-320px)] overflow-y-auto">
            <table className="w-full text-left min-w-[1100px] border-separate border-spacing-0">
              <thead className="sticky top-0 z-[40] bg-white">
                <tr className="text-slate-400 text-[10px] uppercase font-black tracking-[0.25em]">
                  <th className="px-10 py-7 border-b border-slate-100 bg-white">ID & Client Entity</th>
                  <th className="px-10 py-7 border-b border-slate-100 bg-white">Architecture Interest</th>
                  <th className="px-10 py-7 border-b border-slate-100 bg-white">Inquiry Detail</th>
                  <th className="px-10 py-7 border-b border-slate-100 bg-white">Lifecycle Stage</th>
                  <th className="px-10 py-7 border-b border-slate-100 bg-white text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={5} className="py-24 text-center"><RefreshCw className="w-10 h-10 text-[#064e3b] animate-spin mx-auto" /></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="py-24 text-center text-slate-300 font-black tracking-widest">No matching leads</td></tr>
                ) : filtered.map((l) => {
                  const isDropdownActive = activeStatusDropdown === l.id;
                  const statusInfo = statusMap[l.status] || { label: 'Unknown', color: 'bg-slate-50' };
                  return (
                    <tr key={l.id} onClick={() => navigate(`/leads/${l.id}`)} className="hover:bg-slate-50/80 transition-all cursor-pointer group">
                      <td className="px-10 py-8">
                         <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">#{l.id.slice(0,8).toUpperCase()}</p>
                         <p className="text-sm font-black text-slate-900 group-hover:text-emerald-700 transition-colors">{l.client_name}</p>
                         <p className="text-[10px] text-slate-400 font-bold mt-1.5 flex items-center gap-2"><Phone className="w-3 h-3" /> {l.phone}</p>
                      </td>
                      <td className="px-10 py-8">
                         <div className="flex flex-col gap-2">
                            {resolveInterest(l, detectedKeys.construction) && <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase w-fit">Construction</div>}
                            {resolveInterest(l, detectedKeys.interior) && <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase w-fit">Interior</div>}
                         </div>
                      </td>
                      <td className="px-10 py-8">
                         <div className="space-y-1.5">
                            <p className="text-[11px] font-black text-slate-700">{l.package || 'Discovery Package'}</p>
                            <p className="text-[10px] font-bold text-slate-400 flex items-center gap-2"><MapPin className="w-3 h-3" /> {l.address || 'Pending'}</p>
                         </div>
                      </td>
                      <td className="px-10 py-8">
                        <div className="relative">
                          <button 
                            onClick={(e) => toggleDropdown(e, l.id)}
                            className={`px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest border whitespace-nowrap shadow-sm flex items-center gap-3 ${statusInfo.color}`}
                          >
                            {statusInfo.label}
                            <ChevronDown className={`w-3.5 h-3.5 opacity-50 transition-transform ${isDropdownActive ? 'rotate-180' : ''}`} />
                          </button>
                          
                          {isDropdownActive && (
                            <div 
                              ref={statusMenuRef}
                              className="fixed min-w-[200px] bg-white border border-slate-100 rounded-[28px] shadow-2xl z-[200] overflow-hidden animate-in fade-in duration-200"
                              style={{ 
                                top: dropdownPos.top, 
                                left: dropdownPos.left 
                              }}
                            >
                              <div className="p-3 space-y-1">
                                {(['Discovery', 'Follow_Up', 'Quotation', 'Completed', 'Rejected'] as LeadStatus[]).map(s => (
                                  <button key={s} onClick={(e) => { e.stopPropagation(); handleUpdateStatus(l.id, s); }} className={`w-full text-left px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-between ${l.status === s ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50'}`}>
                                    {s.replace('_', ' ')}
                                    {l.status === s && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-10 py-8 text-right">
                         <div className="inline-flex p-3 bg-white border border-slate-100 rounded-xl shadow-sm text-slate-300 group-hover:text-emerald-600 transition-all">
                            <Eye className="w-5 h-5" />
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

export default LeadsList;