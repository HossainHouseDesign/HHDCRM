import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Lead, LeadStatus, FormFieldConfig } from '../types';
import { 
  Search, Plus, Eye, RefreshCw, Hash, MapPin, 
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
    <div className="min-h-screen bg-[#f8fafc] pb-64 animate-in fade-in duration-500 relative">
      {/* 
         THE STICKY HEADER BLOCK
         Grouped controls + spacer gap.
         top-16 aligns below the fixed 64px mobile global header.
         z-[50] ensures it's above content but below mobile side-nav/popups.
      */}
      <div className="sticky top-16 lg:top-0 z-[50] bg-[#f8fafc]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Lead Portfolio</h1>
            <p className="text-slate-500 text-sm font-medium mt-1 uppercase tracking-wider flex items-center gap-2">
               <Home className="w-4 h-4 text-emerald-500" /> Architectural Discovery
            </p>
          </div>
          <Link to="/leads/new" className="w-full md:w-auto flex items-center justify-center gap-3 px-8 py-3.5 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-slate-800 transition-all">
            <Plus className="w-4 h-4" /> New Lead
          </Link>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8 space-y-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {(['All', 'Discovery', 'Follow_Up', 'Quotation', 'Rejected'] as (LeadStatus | 'All')[]).map((status) => (
              <button
                key={status}
                onClick={() => setActiveStatus(status)}
                className={`whitespace-nowrap px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${activeStatus === status ? 'bg-slate-900 text-white border-transparent' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`}
              >
                {status === 'All' ? 'All' : status.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-8 relative group">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-emerald-600 transition-colors" />
               <input 
                 type="text" 
                 placeholder="Search by client name or phone..."
                 className="w-full h-12 pl-12 pr-6 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:bg-white focus:border-emerald-500 transition-all"
                 value={search} 
                 onChange={(e) => setSearch(e.target.value)}
               />
            </div>
            <div className="md:col-span-4 flex items-center gap-2">
              <button onClick={() => setFilterConst(!filterConst)} className={`flex-1 h-12 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${filterConst ? 'bg-emerald-600 text-white border-transparent' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`}>Construction</button>
              <button onClick={() => setFilterInt(!filterInt)} className={`flex-1 h-12 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${filterInt ? 'bg-blue-600 text-white border-transparent' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`}>Interior</button>
            </div>
          </div>
        </div>
        
        {/* 
           PERSISTENT AIR GAP (Fixed Height Spacer)
           This stays sticky with the header, creating the visual "architectural buffer"
           that content slides under. Matches page background color [#f8fafc].
        */}
        <div className="h-10 md:h-12 bg-[#f8fafc] w-full border-t border-slate-100/20"></div>
      </div>

      {/* LEAD ROWS (Content) */}
      <div className="px-5 md:px-10 max-w-[1600px] mx-auto relative z-10">
        {loading ? (
          <div className="py-24 text-center"><RefreshCw className="w-12 h-12 text-[#064e3b] animate-spin mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-32 text-center bg-white rounded-[48px] border border-slate-100 shadow-sm">
             <Layers className="w-16 h-16 text-slate-100 mx-auto mb-4" />
             <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest">Pipeline segment empty</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 lg:hidden">
              {filtered.map((l) => (
                <div key={l.id} onClick={() => navigate(`/leads/${l.id}`)} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm active:scale-[0.98] transition-all relative group">
                  <div className="flex justify-between items-start mb-6">
                    <div className="min-w-0">
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">#{l.id.slice(0,6).toUpperCase()}</p>
                      <h3 className="text-[19px] font-black text-slate-900 mt-1.5 leading-tight group-hover:text-[#064e3b] transition-colors truncate pr-2">{l.client_name}</h3>
                    </div>
                    <button 
                      onClick={(e) => toggleDropdown(e, l.id)}
                      className={`shrink-0 px-4 py-2 rounded-full text-[8px] font-black uppercase tracking-widest border flex items-center gap-2 ${statusMap[l.status]?.color || 'bg-slate-50'}`}
                    >
                      {statusMap[l.status]?.label || l.status}
                      <ChevronDown className="w-3.5 h-3.5 opacity-40" />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-3.5 text-slate-400 mb-8">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                       <Phone className="w-4 h-4 text-emerald-500" />
                    </div>
                    <span className="text-[15px] font-bold text-slate-600">{l.phone}</span>
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                    <div className="flex gap-2">
                       {resolveInterest(l, detectedKeys.construction) && <div className="px-3.5 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[8px] font-black uppercase border border-emerald-100/50">Const</div>}
                       {resolveInterest(l, detectedKeys.interior) && <div className="px-3.5 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[8px] font-black uppercase border border-blue-100/50">Int</div>}
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-[10px] font-black text-slate-400">{l.creator?.full_name?.split(' ')[0] || 'Staff'}</p>
                      <div className="w-8 h-8 bg-slate-50 rounded-[14px] flex items-center justify-center text-slate-300 border border-slate-100">
                        <User className="w-4.5 h-4.5" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View Table */}
            <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-20">
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left min-w-[1000px] border-separate border-spacing-0">
                  <thead className="bg-slate-50/50">
                    <tr className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">
                      <th className="px-8 py-5 border-b border-slate-100">Client Entity</th>
                      <th className="px-8 py-5 border-b border-slate-100">Interests</th>
                      <th className="px-8 py-5 border-b border-slate-100">Assigned Staff</th>
                      <th className="px-8 py-5 border-b border-slate-100">Process Status</th>
                      <th className="px-8 py-5 border-b border-slate-100 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filtered.map((l) => {
                      const isDropdownActive = activeStatusDropdown === l.id;
                      const statusInfo = statusMap[l.status] || { label: 'Unknown', color: 'bg-slate-50' };
                      return (
                        <tr key={l.id} onClick={() => navigate(`/leads/${l.id}`)} className="hover:bg-slate-50/50 transition-all cursor-pointer group">
                          <td className="px-8 py-6">
                             <p className="text-[10px] font-bold text-slate-300 uppercase mb-1">#{l.id.slice(0,6).toUpperCase()}</p>
                             <p className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">{l.client_name}</p>
                             <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-emerald-500" /> {l.phone}</p>
                          </td>
                          <td className="px-8 py-6">
                             <div className="flex gap-2">
                                {resolveInterest(l, detectedKeys.construction) && <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold uppercase border border-emerald-100">Construction</div>}
                                {resolveInterest(l, detectedKeys.interior) && <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold uppercase border border-blue-100">Interior</div>}
                             </div>
                          </td>
                          <td className="px-8 py-6">
                             <div className="flex items-center gap-3">
                               <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all"><User className="w-4 h-4" /></div>
                               <p className="text-sm font-semibold text-slate-700">{l.creator?.full_name || 'System'}</p>
                             </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="relative">
                              <button 
                                onClick={(e) => toggleDropdown(e, l.id)}
                                className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border flex items-center gap-2 transition-all ${statusInfo.color}`}
                              >
                                {statusInfo.label}
                                <ChevronDown className={`w-3.5 h-3.5 opacity-50 ${isDropdownActive ? 'rotate-180' : ''}`} />
                              </button>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-right">
                             <div className="inline-flex p-2 bg-white border border-slate-200 rounded-lg shadow-sm text-slate-400 group-hover:text-emerald-600 group-hover:border-emerald-200 transition-all">
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
          </>
        )}
      </div>

      {activeStatusDropdown && (
        <div 
          ref={statusMenuRef} 
          className="fixed min-w-[220px] bg-white border border-slate-100 rounded-[32px] shadow-2xl z-[300] p-4 space-y-1 animate-in fade-in slide-in-from-top-2" 
          style={{ top: dropdownPos.top, left: dropdownPos.left }}
        >
          <div className="px-5 py-3 border-b border-slate-50 mb-2"><p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Update Lifecycle</p></div>
          {(['Discovery', 'Follow_Up', 'Quotation', 'Completed', 'Rejected'] as LeadStatus[]).map(s => (
            <button 
              key={s} 
              onClick={(e) => { e.stopPropagation(); handleUpdateStatus(activeStatusDropdown, s); }} 
              className={`w-full text-left px-5 py-4 rounded-[18px] text-[11px] font-black uppercase tracking-widest transition-all ${leads.find(l => l.id === activeStatusDropdown)?.status === s ? 'bg-[#0f172a] text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50'}`}
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