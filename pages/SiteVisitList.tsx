import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  MapPin, Search, Plus, RefreshCw, X, Save, 
  ChevronDown, CheckCircle2, User, Building2, 
  Calendar, Clock, Layout, Users2, Filter, 
  ChevronRight, ArrowRight, Target, Info,
  FilterX, CalendarDays, ListFilter, UserCheck,
  Check, HardHat, FileText, UserPlus, Banknote,
  Coins, Wallet, PauseCircle, PlayCircle, CheckCheck,
  FolderKanban, FolderCheck, FolderClock, FolderDown
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Project, Lead, Profile, SiteVisit, PaymentStatus, VisitStatus } from '../types';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNotification, useUser } from '../App';

type DateFilter = 'All' | 'Today' | 'Weekly' | 'Custom';
type PaymentFilter = 'All' | PaymentStatus;
type FolderType = VisitStatus;

const SiteVisitList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useUser();
  const { showNotification } = useNotification();
  
  const [visits, setVisits] = useState<SiteVisit[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Folder & Filtering State
  const [activeFolder, setActiveFolder] = useState<FolderType>('Upcoming');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('All');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('All');
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);

  // Dropdown states for quick status update in list
  const [activeStatusMenu, setActiveStatusMenu] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const statusMenuRef = useRef<HTMLDivElement>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    project_id: '',
    lead_id: '',
    location: '',
    visit_date: new Date().toISOString().split('T')[0],
    payment_status: 'Free' as PaymentStatus,
    status: 'Upcoming' as VisitStatus,
    notes: '',
    assigned_team: [] as string[]
  });

  // Autocomplete search states
  const [entityQuery, setEntityQuery] = useState('');
  const [showEntityDrop, setShowEntityDrop] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
    const params = new URLSearchParams(location.search);
    if (params.get('schedule') === 'true') setShowModal(true);

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowEntityDrop(false);
      }
      if (activeStatusMenu && statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) {
        setActiveStatusMenu(null);
      }
    };

    const handleScroll = () => {
      if (activeStatusMenu) setActiveStatusMenu(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [activeStatusMenu]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [visitsRes, projRes, leadsRes, staffRes] = await Promise.all([
        supabase.from('site_visits').select('*, project:projects(*, client:leads(*)), lead:leads(*), creator:profiles!scheduled_by(full_name), assignments:site_visit_assignments(profile:profiles(*))').is('deleted_at', null).order('visit_date', { ascending: true }),
        supabase.from('projects').select('*, client:leads(*)').is('deleted_at', null),
        supabase.from('leads').select('*').is('deleted_at', null),
        supabase.from('profiles').select('*').is('deleted_at', null).eq('status', 'active')
      ]);

      if (visitsRes.error) throw visitsRes.error;
      
      setVisits(visitsRes.data || []);
      setProjects(projRes.data || []);
      setLeads(leadsRes.data || []);
      setStaff(staffRes.data || []);
    } catch (err: any) {
      console.error(err);
      showNotification("Registry data sync failure.", "error");
    } finally {
      setLoading(false);
    }
  };

  const folderCounts = useMemo(() => {
    return {
      Upcoming: visits.filter(v => v.status === 'Upcoming').length,
      Done: visits.filter(v => v.status === 'Done').length,
      Hold: visits.filter(v => v.status === 'Hold').length
    };
  }, [visits]);

  const filteredVisits = useMemo(() => {
    // 1. Primary Folder Filter
    let result = visits.filter(v => v.status === activeFolder);

    // 2. Search Filter
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(v => {
        const clientName = v.project?.client?.client_name || v.lead?.client_name || '';
        const projectName = v.project?.name || 'Inquiry';
        const locationStr = v.location.toLowerCase();
        return clientName.toLowerCase().includes(q) || projectName.toLowerCase().includes(q) || locationStr.includes(q);
      });
    }

    // 3. Date Filter
    const todayStr = new Date().toISOString().split('T')[0];
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    if (dateFilter === 'Today') {
      result = result.filter(v => v.visit_date === todayStr);
    } else if (dateFilter === 'Weekly') {
      result = result.filter(v => v.visit_date >= todayStr && v.visit_date <= nextWeekStr);
    } else if (dateFilter === 'Custom') {
      result = result.filter(v => v.visit_date === customDate);
    }

    // 4. Payment Filter
    if (paymentFilter !== 'All') {
      result = result.filter(v => v.payment_status === paymentFilter);
    }

    return result;
  }, [visits, search, dateFilter, paymentFilter, activeFolder, customDate]);

  const toggleStatusDropdown = (e: React.MouseEvent, visitId: string) => {
    e.stopPropagation();
    if (activeStatusMenu === visitId) {
      setActiveStatusMenu(null);
    } else {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 8, left: rect.left });
      setActiveStatusMenu(visitId);
    }
  };

  const handleUpdateVisitStatus = async (visitId: string, newStatus: VisitStatus) => {
    try {
      const { error } = await supabase.from('site_visits').update({ status: newStatus }).eq('id', visitId);
      if (error) throw error;
      setVisits(prev => prev.map(v => v.id === visitId ? { ...v, status: newStatus } : v));
      showNotification(`Record migrated to ${newStatus} vault.`, "success");
      setActiveStatusMenu(null);
    } catch (err: any) {
      showNotification(`Migration failed: ${err.message}`, "error");
    }
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    const schedulerId = profile?.id;
    if (!schedulerId) return;

    setIsSaving(true);
    try {
      const { data: visit, error: vError } = await supabase.from('site_visits').insert([{
        project_id: formData.project_id || null,
        lead_id: formData.lead_id || null,
        location: formData.location,
        visit_date: formData.visit_date,
        payment_status: formData.payment_status,
        status: formData.status,
        notes: formData.notes,
        scheduled_by: schedulerId,
        office_id: profile.office_id || null
      }]).select().single();

      if (vError) throw vError;

      if (formData.assigned_team.length > 0 && visit) {
        const assignments = formData.assigned_team.map(pid => ({
          site_visit_id: visit.id,
          profile_id: pid
        }));
        await supabase.from('site_visit_assignments').insert(assignments);
      }

      showNotification("Visit registered and archived in registry.", "success");
      setShowModal(false);
      setFormData({ project_id: '', lead_id: '', location: '', visit_date: new Date().toISOString().split('T')[0], payment_status: 'Free', status: 'Upcoming', notes: '', assigned_team: [] });
      setEntityQuery('');
      fetchData();
    } catch (err: any) {
      showNotification("Sync Error: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const getPaymentStatusStyle = (status: PaymentStatus) => {
    switch (status) {
      case 'Pre-paid': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'Post-paid': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'Free': return 'bg-slate-100 text-slate-500 border-slate-200';
      default: return 'bg-slate-50 text-slate-400';
    }
  };

  const getVisitStatusStyle = (status: VisitStatus) => {
    switch (status) {
      case 'Upcoming': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'Done': return 'bg-emerald-600 text-white border-transparent shadow-emerald-900/10 shadow-lg';
      case 'Hold': return 'bg-amber-50 text-amber-600 border-amber-100';
      default: return 'bg-slate-50 text-slate-400';
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-32 animate-in fade-in duration-700">
      
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white rounded-[48px] p-8 md:p-14 max-w-2xl w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 overflow-y-auto max-h-[90vh] no-scrollbar relative">
              <div className="flex justify-between items-start mb-12">
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">Schedule Site Visit</h3>
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mt-2">TECHNICAL REGISTRY INPUT</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-red-500 transition-all"><X className="w-6 h-6" /></button>
              </div>

              <form onSubmit={handleSchedule} className="space-y-10 relative z-10">
                 <div className="space-y-3 relative" ref={dropdownRef}>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Portfolio Object</label>
                    <div className="relative group">
                      <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input 
                        className="w-full h-16 pl-14 pr-8 bg-slate-50 border border-slate-100 rounded-[24px] text-sm font-bold text-slate-700 outline-none focus:bg-white shadow-inner" 
                        placeholder="Search Portfolio..." 
                        value={entityQuery} 
                        onFocus={() => setShowEntityDrop(true)}
                        onChange={e => { setEntityQuery(e.target.value); setShowEntityDrop(true); }}
                      />
                    </div>
                    {showEntityDrop && (
                      <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-100 rounded-[32px] shadow-2xl z-[150] overflow-hidden max-h-64 overflow-y-auto no-scrollbar py-2">
                         {projects.filter(p => p.name.toLowerCase().includes(entityQuery.toLowerCase())).map(p => (
                            <div key={p.id} onClick={() => { setFormData({ ...formData, project_id: p.id, lead_id: p.client_id, location: p.client?.address || '' }); setEntityQuery(`Project: ${p.name}`); setShowEntityDrop(false); }} className="flex items-center gap-4 p-4 hover:bg-emerald-50 cursor-pointer group">
                               <div className="w-10 h-10 bg-slate-50 text-slate-300 rounded-xl flex items-center justify-center group-hover:bg-[#064e3b] group-hover:text-white transition-all"><Building2 className="w-5 h-5" /></div>
                               <div><p className="text-[13px] font-black text-slate-900 truncate">Project: {p.name}</p><p className="text-[10px] text-slate-400 font-bold uppercase">{p.client?.client_name}</p></div>
                            </div>
                         ))}
                         {leads.filter(l => !l.is_client && l.client_name.toLowerCase().includes(entityQuery.toLowerCase())).map(l => (
                            <div key={l.id} onClick={() => { setFormData({ ...formData, project_id: '', lead_id: l.id, location: l.address || '' }); setEntityQuery(`Lead: ${l.client_name}`); setShowEntityDrop(false); }} className="flex items-center gap-4 p-4 hover:bg-blue-50 cursor-pointer group">
                               <div className="w-10 h-10 bg-slate-50 text-slate-300 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all"><FileText className="w-5 h-5" /></div>
                               <div><p className="text-[13px] font-black text-slate-900 truncate">Lead: {l.client_name}</p><p className="text-[10px] text-slate-400 font-bold uppercase">{l.phone}</p></div>
                            </div>
                         ))}
                      </div>
                    )}
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Visit Location</label>
                       <input required className="w-full h-16 px-8 bg-slate-50 border border-slate-100 rounded-[24px] text-sm font-bold text-slate-700 outline-none focus:bg-white" placeholder="Site Address" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                    </div>
                    <div className="space-y-3">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Visit Date</label>
                       <input required type="date" className="w-full h-16 px-8 bg-slate-50 border border-slate-100 rounded-[24px] text-sm font-bold text-slate-700" value={formData.visit_date} onChange={e => setFormData({...formData, visit_date: e.target.value})} />
                    </div>
                 </div>

                 <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Initial Registry Status</label>
                    <div className="grid grid-cols-3 gap-3 p-2 bg-slate-50 rounded-[32px] border border-slate-100">
                       {(['Upcoming', 'Done', 'Hold'] as VisitStatus[]).map(s => (
                         <button key={s} type="button" onClick={() => setFormData({...formData, status: s})} className={`py-4 rounded-[22px] text-[10px] font-black uppercase tracking-widest transition-all ${formData.status === s ? 'bg-[#064e3b] text-white shadow-xl' : 'bg-white text-slate-400 hover:text-slate-600 border border-slate-50'}`}>{s}</button>
                       ))}
                    </div>
                 </div>

                 <button type="submit" disabled={isSaving} className="w-full py-8 bg-[#064e3b] text-white rounded-[32px] text-[12px] font-black uppercase tracking-[0.3em] hover:bg-black transition-all flex items-center justify-center gap-4 shadow-2xl disabled:opacity-50">
                   {isSaving ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6 text-emerald-400" />} Commit Schedule
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* HUB VIEW HEADER */}
      <div className="sticky top-16 lg:top-0 z-[60] bg-[#f8fafc]/90 backdrop-blur-xl px-6 md:px-10 pt-10 pb-8 border-b border-slate-50 shadow-sm">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-10">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Field Registry</h1>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em] mt-2 opacity-80 flex items-center gap-2">
              <HardHat className="w-3.5 h-3.5 text-emerald-500" /> MANAGING ARCHITECTURAL FIELD LOGISTICS
            </p>
          </div>
          <button onClick={() => setShowModal(true)} className="px-10 py-5 bg-[#064e3b] text-white rounded-[24px] text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-emerald-900/20 active:scale-95 transition-all flex items-center gap-3 hover:bg-black">
            <UserPlus className="w-5 h-5" /> Schedule Site Visit
          </button>
        </header>

        <div className="flex flex-col gap-8">
           {/* FOLDER NAVIGATION - NEW SYSTEM */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { id: 'Upcoming', label: 'Active Schedule', icon: FolderClock, color: 'text-blue-600', bg: 'bg-blue-50', count: folderCounts.Upcoming },
                { id: 'Done', label: 'Completed Archive', icon: FolderCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', count: folderCounts.Done },
                { id: 'Hold', label: 'Paused Registry', icon: FolderDown, color: 'text-amber-600', bg: 'bg-amber-50', count: folderCounts.Hold }
              ].map((folder) => (
                <button 
                  key={folder.id} 
                  onClick={() => setActiveFolder(folder.id as FolderType)}
                  className={`relative p-8 rounded-[44px] text-left transition-all group overflow-hidden border-2 ${activeFolder === folder.id ? 'bg-white border-[#064e3b] shadow-2xl scale-[1.02]' : 'bg-white/40 border-transparent hover:bg-white hover:border-slate-200'}`}
                >
                   <div className="absolute top-0 right-0 w-32 h-32 bg-slate-500/5 blur-[50px] rounded-full pointer-events-none" />
                   <div className="flex justify-between items-start relative z-10">
                      <div className={`w-14 h-14 ${folder.bg} ${folder.color} rounded-[22px] flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
                         <folder.icon className="w-7 h-7" />
                      </div>
                      <span className={`text-3xl font-black ${activeFolder === folder.id ? 'text-slate-900' : 'text-slate-200'}`}>{folder.count}</span>
                   </div>
                   <div className="mt-8 relative z-10">
                      <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${activeFolder === folder.id ? 'text-emerald-600' : 'text-slate-400'}`}>Repository Vault</p>
                      <h3 className="text-lg font-black text-slate-900 mt-1">{folder.label}</h3>
                   </div>
                   {activeFolder === folder.id && (
                     <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-1 bg-[#064e3b] rounded-t-full" />
                   )}
                </button>
              ))}
           </div>

           <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-6 pt-4">
              <div className="relative group flex-1">
                 <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-[#064e3b] transition-colors" />
                 <input 
                   type="text" 
                   placeholder={`Search ${activeFolder} records...`}
                   className="w-full h-16 pl-16 pr-6 bg-white border border-slate-100 rounded-[28px] text-[14px] font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all shadow-sm"
                   value={search}
                   onChange={e => setSearch(e.target.value)}
                 />
              </div>

              <div className="flex flex-wrap items-center gap-4">
                 <div className="flex items-center gap-2 bg-white/50 p-1.5 rounded-[24px] border border-slate-50 shadow-sm">
                    {(['All', 'Today', 'Weekly', 'Custom'] as DateFilter[]).map(opt => (
                      <button key={opt} onClick={() => setDateFilter(opt)} className={`px-8 py-3.5 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all ${dateFilter === opt ? 'bg-[#064e3b] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>{opt}</button>
                    ))}
                 </div>
                 {dateFilter === 'Custom' && <input type="date" className="h-14 px-6 bg-white border border-slate-100 rounded-[24px] text-[10px] font-black uppercase text-slate-700 outline-none shadow-sm" value={customDate} onChange={e => setCustomDate(e.target.value)} />}
                 <div className="flex items-center gap-2 bg-white/50 p-1.5 rounded-[24px] border border-slate-50 shadow-sm">
                    {(['All', 'Pre-paid', 'Post-paid', 'Free'] as PaymentFilter[]).map(opt => (
                      <button key={opt} onClick={() => setPaymentFilter(opt)} className={`px-8 py-3.5 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all ${paymentFilter === opt ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>{opt}</button>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-6 md:px-10 mt-12">
        {loading ? (
          <div className="py-32 flex justify-center"><RefreshCw className="w-12 h-12 text-[#064e3b] animate-spin" /></div>
        ) : filteredVisits.length === 0 ? (
          <div className="py-40 text-center bg-white rounded-[64px] border border-slate-100 shadow-xl"><FolderKanban className="w-16 h-16 text-slate-100 mx-auto mb-6" /><p className="text-[11px] font-black text-slate-300 uppercase tracking-widest">This folder currently contains no site visits</p></div>
        ) : (
          <div className="bg-white rounded-[48px] border border-slate-100 shadow-xl shadow-slate-200/5 overflow-hidden">
            <div className="overflow-x-auto no-scrollbar max-h-[calc(100vh-320px)] overflow-y-auto">
              <table className="w-full text-left min-w-[1500px] border-separate border-spacing-0">
                <thead className="sticky top-0 z-[40] bg-white">
                  <tr className="text-slate-400 text-[10px] uppercase font-black tracking-[0.25em]">
                    <th className="px-10 py-7 border-b border-slate-100 bg-white">Execution Target</th>
                    <th className="px-10 py-7 border-b border-slate-100 bg-white">Coordinates</th>
                    <th className="px-10 py-7 border-b border-slate-100 bg-white">Vault Status</th>
                    <th className="px-10 py-7 border-b border-slate-100 bg-white">Design Personnel</th>
                    <th className="px-10 py-7 border-b border-slate-100 bg-white">Billing Mode</th>
                    <th className="px-10 py-7 border-b border-slate-100 bg-white">Managed By</th>
                    <th className="px-10 py-7 border-b border-slate-100 bg-white text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredVisits.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/80 transition-all cursor-pointer group">
                      <td onClick={() => navigate(`/site-visits/${v.id}`)} className="px-10 py-8">
                         <div className="flex items-center gap-5">
                            <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black group-hover:bg-[#064e3b] group-hover:text-white transition-all shadow-sm ${v.visit_date === new Date().toISOString().split('T')[0] ? 'bg-[#064e3b] text-white animate-pulse' : 'bg-slate-50 text-slate-400'}`}>
                               <span className="text-[10px] uppercase tracking-tighter opacity-60">{new Date(v.visit_date).toLocaleString('default', { month: 'short' })}</span>
                               <span className="text-lg leading-none">{new Date(v.visit_date).getDate()}</span>
                            </div>
                            <div>
                               <p className="text-[15px] font-black text-slate-900 group-hover:text-[#064e3b] transition-colors">{v.project?.client?.client_name || v.lead?.client_name || 'Anonymous'}</p>
                               <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Ref: {v.id.slice(0, 8).toUpperCase()}</p>
                            </div>
                         </div>
                      </td>
                      <td onClick={() => navigate(`/site-visits/${v.id}`)} className="px-10 py-8">
                         <div className="flex items-start gap-3"><MapPin className="w-4 h-4 text-emerald-500 mt-0.5" /><span className="text-[13px] font-black text-slate-700 max-w-[220px]">{v.location}</span></div>
                      </td>
                      <td className="px-10 py-8">
                         <div className="relative">
                            <button onClick={(e) => toggleStatusDropdown(e, v.id)} className={`px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm transition-all flex items-center gap-3 active:scale-95 ${getVisitStatusStyle(v.status)}`}>
                               {v.status === 'Upcoming' && <Clock className="w-3.5 h-3.5" />}
                               {v.status === 'Done' && <CheckCheck className="w-3.5 h-3.5" />}
                               {v.status === 'Hold' && <PauseCircle className="w-3.5 h-3.5" />}
                               {v.status}
                               <ChevronDown className="w-3 h-3 opacity-50" />
                            </button>
                            {activeStatusMenu === v.id && (
                               <div 
                                 ref={statusMenuRef}
                                 className="fixed min-w-[176px] bg-white border border-slate-100 rounded-3xl shadow-2xl z-[200] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 p-2 space-y-1"
                                 style={{ top: dropdownPos.top, left: dropdownPos.left }}
                               >
                                  {(['Upcoming', 'Done', 'Hold'] as VisitStatus[]).map(st => (
                                    <button key={st} onClick={(e) => { e.stopPropagation(); handleUpdateVisitStatus(v.id, st); }} className={`w-full text-left px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-between group/st ${v.status === st ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50'}`}>
                                       {st}
                                       {v.status === st && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                                    </button>
                                  ))}
                               </div>
                            )}
                         </div>
                      </td>
                      <td onClick={() => navigate(`/site-visits/${v.id}`)} className="px-10 py-8">
                         <div className="flex flex-col gap-2">
                            {v.assignments && v.assignments.length > 0 ? v.assignments.map((a, i) => (
                              <div key={i} className="flex items-center gap-3"><img src={a.profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${a.profile?.full_name}`} className="w-8 h-8 rounded-lg border border-slate-100 bg-white shadow-sm object-cover" alt={a.profile?.full_name} /><span className="text-[12px] font-bold text-slate-600">{a.profile?.full_name}</span></div>
                            )) : <div className="px-3 py-1 bg-slate-50 text-slate-300 text-[9px] font-black uppercase rounded-lg border border-slate-100 w-fit">No Assignments</div>}
                         </div>
                      </td>
                      <td onClick={() => navigate(`/site-visits/${v.id}`)} className="px-10 py-8">
                         <div className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border inline-flex items-center gap-2 ${getPaymentStatusStyle(v.payment_status)}`}>
                            {v.payment_status === 'Pre-paid' && <Wallet className="w-3 h-3" />}
                            {v.payment_status === 'Post-paid' && <Banknote className="w-3 h-3" />}
                            {v.payment_status === 'Free' && <Target className="w-3 h-3" />}
                            {v.payment_status}
                         </div>
                      </td>
                      <td onClick={() => navigate(`/site-visits/${v.id}`)} className="px-10 py-8">
                         <div className="flex items-center gap-3"><div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 shadow-sm"><UserCheck className="w-4 h-4" /></div><span className="text-[12px] font-black text-slate-700">{v.creator?.full_name || 'System Auto'}</span></div>
                      </td>
                      <td className="px-10 py-8 text-right">
                         <button onClick={(e) => { e.stopPropagation(); navigate(`/site-visits/${v.id}`); }} className="inline-flex p-3 bg-white border border-slate-100 rounded-xl shadow-sm text-slate-300 group-hover:text-[#064e3b] transition-all group-hover:shadow-md active:scale-90"><ArrowRight className="w-5 h-5" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SiteVisitList;