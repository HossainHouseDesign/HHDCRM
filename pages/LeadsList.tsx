import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Lead, LeadStatus, FormFieldConfig } from '../types';
import { 
  Search, Plus, Eye, RefreshCw, Hash, MapPin, ArrowUpRight,
  Layers, Phone, Home, Hammer, Paintbrush, FilterX, CheckCircle2,
  ChevronDown, UserCheck, User, MessageSquare
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { DEFAULT_FORM_CONFIG } from './Settings';
import { useNotification } from '../App';

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
  const { showNotification } = useNotification();
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
      (f.db_key || '').toLowerCase().includes(term.toLowerCase()) || 
      (f.label || '').toUpperCase().includes(term.toUpperCase())
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
        supabase.from('leads').select('*, creator:profiles!created_by(full_name)').eq('is_client', false).is('deleted_at', null).order('created_at', { ascending: false }),
        supabase.from('settings').select('*').eq('key', 'lead_form_config').single()
      ]);
      
      if (leadsRes.error) throw leadsRes.error;
      setLeads(leadsRes.data || []);
      if (configRes.data) setFormConfig(configRes.data.value);
    } catch (err: any) {
      console.error(err);
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
      showNotification("Status synchronized.", "success");
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
    <div className="min-h-screen bg-slate-50/50 pb-20 animate-in fade-in duration-500 relative">
      <div className="sticky top-14 lg:top-0 z-[50] bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm transition-all">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex flex-row justify-between items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none uppercase">Lead Vault</h1>
            <p className="text-slate-400 text-[8px] font-bold uppercase tracking-widest mt-1.5 flex items-center gap-1.5 leading-none">
               <Home className="w-3 h-3 text-emerald-500" /> ACQUISITION REPOSITORY
            </p>
          </div>
          <Link to="/leads/new" className="flex items-center gap-1.5 px-5 py-2 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-none hover:bg-slate-800 transition-all leading-none">
            <Plus className="w-3.5 h-3.5" /> Acquisition
          </Link>
        </div>

        <div className="max-w-[1600px] mx-auto px-4 pb-2">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center">
            <div className="lg:col-span-12 flex flex-col lg:flex-row items-stretch lg:items-center gap-2">
              <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar py-0.5 bg-slate-100 p-0.5 rounded-lg shrink-0">
                {(['All', 'Discovery', 'Follow_Up', 'Quotation', 'Rejected'] as (LeadStatus | 'All')[]).map((status) => (
                  <button
                    key={status}
                    onClick={() => setActiveStatus(status)}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-md text-[8px] font-bold uppercase tracking-wider transition-all ${activeStatus === status ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {status === 'All' ? 'All' : status.replace('_', ' ')}
                  </button>
                ))}
              </div>

              <div className="flex-1 relative group">
                 <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-300 transition-colors" />
                 <input 
                   type="text" 
                   placeholder="Search archive..."
                   className="w-full h-8 pl-8 pr-4 bg-slate-50 border border-slate-100 rounded-lg text-xs font-medium text-slate-700 outline-none focus:bg-white transition-all shadow-none"
                   value={search} 
                   onChange={(e) => setSearch(e.target.value)}
                 />
              </div>
              
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setFilterConst(!filterConst)} className={`h-8 px-3 rounded-lg text-[8px] font-bold uppercase tracking-wider border transition-all ${filterConst ? 'bg-emerald-600 text-white border-transparent' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'}`}>Const</button>
                <button onClick={() => setFilterInt(!filterInt)} className={`h-8 px-3 rounded-lg text-[8px] font-bold uppercase tracking-wider border transition-all ${filterInt ? 'bg-blue-600 text-white border-transparent' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'}`}>Interior</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 max-w-[1600px] mx-auto relative z-10">
        {loading ? (
          <div className="py-24 text-center">
            <RefreshCw className="w-10 h-10 text-emerald-900 animate-spin mx-auto" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4">Accessing Vault...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-xl border border-slate-200 shadow-none">
             <Layers className="w-10 h-10 text-slate-100 mx-auto mb-3 grayscale opacity-50" />
             <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Repository Empty</p>
          </div>
        ) : (
          <>
            {/* MOBILE VIEW */}
            <div className="grid grid-cols-1 gap-3 lg:hidden">
              {filtered.map((l) => (
                <div key={l.id} onClick={() => navigate(`/leads/${l.id}`)} className="bg-white p-4 rounded-xl border border-slate-100 shadow-none active:scale-[0.98] transition-all relative group">
                  <div className="flex justify-between items-start mb-2">
                    <div className="min-w-0">
                      <p className="text-[7px] font-bold text-slate-300 uppercase">#{l.id.slice(0,6).toUpperCase()}</p>
                      <h3 className="text-[13px] font-bold text-slate-900 mt-0.5 leading-none uppercase tracking-tight group-hover:text-emerald-700 transition-colors truncate pr-2">{l.client_name}</h3>
                    </div>
                    <div 
                      className={`shrink-0 px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest border flex items-center gap-1.5 ${statusMap[l.status]?.color || 'bg-slate-50'}`}
                    >
                      {statusMap[l.status]?.label || l.status}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-slate-400 mb-3">
                     <Phone className="w-3 h-3 text-emerald-500" />
                     <span className="text-[11px] font-bold text-slate-600 leading-none">{l.phone}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                    <div className="flex gap-1">
                       {resolveInterest(l, detectedKeys.construction) && <div className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[7px] font-black uppercase tracking-tighter border border-emerald-100/50 leading-none">Const</div>}
                       {resolveInterest(l, detectedKeys.interior) && <div className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[7px] font-black uppercase tracking-tighter border border-blue-100/50 leading-none">Int</div>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-[9px] font-bold text-slate-400 uppercase leading-none">{l.creator?.full_name?.split(' ')[0] || 'Staff'}</p>
                      <ArrowUpRight className="w-3 h-3 text-slate-200" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* DESKTOP VIEW */}
            <div className="hidden lg:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-10 transition-all">
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left border-separate border-spacing-0">
                  <thead className="bg-slate-50/50">
                    <tr className="text-slate-400 text-[8px] uppercase font-bold tracking-widest leading-none">
                      <th className="px-5 py-2.5 border-b border-slate-100">Lead Entity</th>
                      <th className="px-5 py-2.5 border-b border-slate-100">Interests</th>
                      <th className="px-5 py-2.5 border-b border-slate-100">Staff</th>
                      <th className="px-5 py-2.5 border-b border-slate-100">Status</th>
                      <th className="px-5 py-2.5 border-b border-slate-100 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((l) => {
                      const isDropdownActive = activeStatusDropdown === l.id;
                      const statusInfo = statusMap[l.status] || { label: 'Unknown', color: 'bg-slate-50' };
                      return (
                        <tr key={l.id} onClick={() => navigate(`/leads/${l.id}`)} className="hover:bg-slate-50/30 transition-all cursor-pointer group">
                          <td className="px-5 py-2">
                             <p className="text-[13px] font-bold text-slate-900 leading-none uppercase tracking-tight group-hover:text-emerald-700 transition-colors uppercase leading-none">{l.client_name}</p>
                             <div className="flex items-center gap-1.5 mt-1.5 leading-none">
                               <span className="text-[7px] font-bold text-slate-300 uppercase">#{l.id.slice(0,6).toUpperCase()}</span>
                               <span className="w-0.5 h-0.5 bg-slate-300 rounded-full"></span>
                               <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{l.phone}</span>
                             </div>
                          </td>
                          <td className="px-5 py-2">
                             <div className="flex gap-1">
                                {resolveInterest(l, detectedKeys.construction) && <div className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[7px] font-black uppercase tracking-tighter border border-emerald-100 leading-none">Const</div>}
                                {resolveInterest(l, detectedKeys.interior) && <div className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[7px] font-black uppercase tracking-tighter border border-blue-100 leading-none">Int</div>}
                             </div>
                          </td>
                          <td className="px-5 py-2">
                             <div className="flex items-center gap-2">
                               <div className="w-5 h-5 bg-slate-50 rounded flex items-center justify-center text-slate-200 group-hover:bg-slate-900 group-hover:text-white transition-all"><User className="w-2.5 h-2.5" /></div>
                               <p className="text-[10px] font-bold text-slate-500 uppercase leading-none">{l.creator?.full_name?.split(' ')[0] || 'System'}</p>
                             </div>
                          </td>
                          <td className="px-5 py-2">
                             <button 
                               onClick={(e) => toggleDropdown(e, l.id)}
                               className={`px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest border flex items-center gap-1 transition-all ${statusInfo.color}`}
                             >
                               {statusInfo.label}
                               <ChevronDown className={`w-2.5 h-2.5 opacity-50 ${isDropdownActive ? 'rotate-180' : ''}`} />
                             </button>
                          </td>
                          <td className="px-5 py-2 text-right">
                             <div className="inline-flex p-1.5 text-slate-100 group-hover:text-slate-900 transition-all">
                                <ArrowUpRight className="w-3.5 h-3.5" />
                             </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {activeStatusDropdown && (
        <div 
          ref={statusMenuRef} 
          className="fixed min-w-[180px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-[300] p-1.5 space-y-1 animate-in fade-in slide-in-from-top-2" 
          style={{ top: dropdownPos.top, left: dropdownPos.left }}
        >
          <div className="px-4 py-2 border-b border-slate-50 mb-1"><p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Update Lifecycle</p></div>
          {(['Discovery', 'Follow_Up', 'Quotation', 'Completed', 'Rejected'] as LeadStatus[]).map(s => (
            <button 
              key={s} 
              onClick={(e) => { e.stopPropagation(); handleUpdateStatus(activeStatusDropdown, s); }} 
              className={`w-full text-left px-4 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${leads.find(l => l.id === activeStatusDropdown)?.status === s ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LeadsList;