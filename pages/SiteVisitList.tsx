import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  MapPin, Search, Plus, RefreshCw, X, Save, 
  ChevronDown, CheckCircle2, User, Building2, 
  Calendar, Clock, Layout, Users2, Filter, 
  ChevronRight, ArrowRight, Target, Info,
  FilterX, CalendarDays, ListFilter, UserCheck,
  Check, HardHat, FileText, UserPlus, Banknote,
  Coins, Wallet, PauseCircle, PlayCircle, CheckCheck,
  FolderKanban, FolderCheck, FolderClock, FolderDown,
  ShieldCheck, MessageSquare
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Project, Lead, Profile, SiteVisit, PaymentStatus, VisitStatus } from '../types';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNotification, useUser } from '../App';

type DateFilter = 'All' | 'Today' | 'Weekly';
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
  
  const [activeFolder, setActiveFolder] = useState<FolderType>('Upcoming');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('All');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('All');

  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Scheduling Form State
  const [formData, setFormData] = useState({
    project_id: '',
    lead_id: '',
    location: '',
    visit_date: new Date().toISOString().split('T')[0],
    payment_status: 'Free' as PaymentStatus,
    notes: '',
    assigned_team: [] as string[]
  });

  // Autocomplete state
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
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [location.search]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [visitsRes, projRes, leadsRes, staffRes] = await Promise.all([
        supabase.from('site_visits').select('*, project:projects(*, client:leads(*)), lead:leads(*), creator:profiles!scheduled_by(full_name), assignments:site_visit_assignments(profile:profiles(*))').is('deleted_at', null).order('visit_date', { ascending: true }),
        supabase.from('projects').select('*, client:leads(*)').is('deleted_at', null),
        supabase.from('leads').select('*').is('deleted_at', null),
        supabase.from('profiles').select('*').is('deleted_at', null).eq('status', 'active')
      ]);
      
      setVisits(visitsRes.data || []);
      setProjects(projRes.data || []);
      setLeads(leadsRes.data || []);
      setStaff(staffRes.data || []);
    } catch (err: any) { 
      showNotification("Sync failed.", "error"); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleCreateVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.location || !formData.visit_date) {
      showNotification("Please fill required fields.", "warning");
      return;
    }

    setIsSaving(true);
    try {
      const creatorId = profile?.id || (await supabase.auth.getUser()).data.user?.id;
      
      const { data: newVisit, error: visitError } = await supabase.from('site_visits').insert([{
        project_id: formData.project_id || null,
        lead_id: formData.lead_id || null,
        location: formData.location,
        visit_date: formData.visit_date,
        payment_status: formData.payment_status,
        status: 'Upcoming',
        notes: formData.notes,
        scheduled_by: creatorId,
        office_id: profile?.office_id
      }]).select().single();

      if (visitError) throw visitError;

      if (formData.assigned_team.length > 0 && newVisit) {
        const assignments = formData.assigned_team.map(pid => ({
          site_visit_id: newVisit.id,
          profile_id: pid
        }));
        await supabase.from('site_visit_assignments').insert(assignments);
      }

      showNotification("Visit scheduled successfully.", "success");
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      showNotification("Scheduling Failed: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({ project_id: '', lead_id: '', location: '', visit_date: new Date().toISOString().split('T')[0], payment_status: 'Free', notes: '', assigned_team: [] });
    setEntityQuery('');
    navigate('/site-visits', { replace: true });
  };

  const counts = useMemo(() => {
    return {
      Upcoming: visits.filter(v => v.status === 'Upcoming').length,
      Done: visits.filter(v => v.status === 'Done').length,
      Hold: visits.filter(v => v.status === 'Hold').length
    };
  }, [visits]);

  const filteredVisits = useMemo(() => {
    let result = visits.filter(v => v.status === activeFolder);
    
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(v => 
        (v.project?.client?.client_name || v.lead?.client_name || '').toLowerCase().includes(q) || 
        v.location.toLowerCase().includes(q)
      );
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (dateFilter === 'Today') {
      result = result.filter(v => v.visit_date === todayStr);
    } else if (dateFilter === 'Weekly') {
      const now = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(now.getDate() + 7);
      const nextWeekStr = nextWeek.toISOString().split('T')[0];
      result = result.filter(v => v.visit_date >= todayStr && v.visit_date <= nextWeekStr);
    }

    if (paymentFilter !== 'All') {
      result = result.filter(v => v.payment_status === paymentFilter);
    }

    return result;
  }, [visits, search, dateFilter, paymentFilter, activeFolder]);

  const getPaymentBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'Pre-paid': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'Post-paid': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'Free': return 'bg-slate-50 text-slate-400 border-slate-100';
      default: return 'bg-slate-50 text-slate-400';
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-32 animate-in fade-in duration-700">
      
      {/* SCHEDULE VISIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] md:rounded-[48px] p-6 md:p-12 max-w-3xl w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 overflow-y-auto max-h-[90vh] md:max-h-[95vh] no-scrollbar relative">
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#064e3b]/5 blur-[100px] rounded-full pointer-events-none" />
            <div className="flex justify-between items-start mb-8 md:mb-10 relative z-10">
              <div>
                <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Schedule Visit</h3>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mt-2">TECHNICAL FIELD DEPLOYMENT</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 md:p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-red-500 transition-all"><X className="w-5 h-5 md:w-6 md:h-6" /></button>
            </div>

            <form onSubmit={handleCreateVisit} className="space-y-8 md:space-y-10 relative z-10">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                  <div className="space-y-3 relative" ref={dropdownRef}>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Client / Project Entity</label>
                    <div className="relative group">
                       <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-[#064e3b] transition-colors" />
                       <input 
                         className="w-full h-14 md:h-16 pl-14 pr-6 bg-slate-50 border border-slate-100 rounded-[20px] md:rounded-[24px] text-sm font-bold text-slate-700 outline-none focus:bg-white transition-all shadow-inner" 
                         placeholder="Search portfolio..." 
                         value={entityQuery} 
                         onFocus={() => setShowEntityDrop(true)}
                         onChange={e => { setEntityQuery(e.target.value); setShowEntityDrop(true); }}
                       />
                    </div>
                    {showEntityDrop && (
                      <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-100 rounded-[28px] md:rounded-[32px] shadow-2xl z-[250] overflow-hidden max-h-60 overflow-y-auto no-scrollbar py-2">
                        {projects.filter(p => p.name.toLowerCase().includes(entityQuery.toLowerCase())).map(p => (
                          <div key={p.id} onClick={() => { setFormData({...formData, project_id: p.id, lead_id: '', location: p.client?.address || ''}); setEntityQuery(`Project: ${p.name}`); setShowEntityDrop(false); }} className="p-4 hover:bg-emerald-50 cursor-pointer flex items-center gap-4 border-b border-slate-50 last:border-0"><div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center shrink-0"><Building2 className="w-5 h-5" /></div><div className="min-w-0"><p className="text-[13px] font-black text-slate-900 truncate">{p.name}</p><p className="text-[10px] text-slate-400 font-bold uppercase truncate">Client: {p.client?.client_name}</p></div></div>
                        ))}
                        {leads.filter(l => l.client_name.toLowerCase().includes(entityQuery.toLowerCase())).map(l => (
                          <div key={l.id} onClick={() => { setFormData({...formData, project_id: '', lead_id: l.id, location: l.address || ''}); setEntityQuery(`Lead: ${l.client_name}`); setShowEntityDrop(false); }} className="p-4 hover:bg-blue-50 cursor-pointer flex items-center gap-4 border-b border-slate-50 last:border-0"><div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center shrink-0"><FileText className="w-5 h-5" /></div><div className="min-w-0"><p className="text-[13px] font-black text-slate-900 truncate">{l.client_name}</p><p className="text-[10px] text-slate-400 font-bold uppercase truncate">Status: {l.status}</p></div></div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Visit Location</label>
                    <input required className="w-full h-14 md:h-16 px-6 md:px-8 bg-slate-50 border border-slate-100 rounded-[20px] md:rounded-[24px] text-sm font-bold text-slate-700 outline-none focus:bg-white transition-all shadow-inner" placeholder="Detailed site address..." value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Scheduled Date</label>
                    <input required type="date" className="w-full h-14 md:h-16 px-6 md:px-8 bg-slate-50 border border-slate-100 rounded-[20px] md:rounded-[24px] text-sm font-bold text-slate-700 outline-none" value={formData.visit_date} onChange={e => setFormData({...formData, visit_date: e.target.value})} />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Protocol</label>
                    <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-[18px] md:rounded-[22px]">
                       {(['Pre-paid', 'Post-paid', 'Free'] as PaymentStatus[]).map(s => (
                         <button key={s} type="button" onClick={() => setFormData({...formData, payment_status: s})} className={`py-3 md:py-4 rounded-[14px] md:rounded-[18px] text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all ${formData.payment_status === s ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>{s}</button>
                       ))}
                    </div>
                  </div>
               </div>

               <div className="space-y-4">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">Assign Personnel ({formData.assigned_team.length})</label>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 p-3 md:p-4 bg-slate-50 rounded-[24px] md:rounded-[32px] border border-slate-100 max-h-40 md:max-h-48 overflow-y-auto no-scrollbar shadow-inner">
                     {staff.map(s => {
                       const active = formData.assigned_team.includes(s.id);
                       return (
                         <button key={s.id} type="button" onClick={() => setFormData(prev => ({ ...prev, assigned_team: active ? prev.assigned_team.filter(i => i !== s.id) : [...prev.assigned_team, s.id] }))} className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all text-left ${active ? 'bg-[#064e3b] text-white shadow-lg' : 'bg-white border-slate-100 text-slate-600 hover:border-emerald-200'}`}>
                            <img src={s.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.email}`} className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-white p-0.5 object-cover shrink-0" alt={s.full_name} />
                            <p className="text-[9px] md:text-[10px] font-black truncate leading-none">{s.full_name}</p>
                         </button>
                       );
                     })}
                  </div>
               </div>

               <div className="space-y-3">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Visit Objectives / Description</label>
                  <div className="relative">
                    <MessageSquare className="absolute left-6 top-5 w-4 h-4 text-slate-300" />
                    <textarea 
                      className="w-full h-24 md:h-32 pl-14 pr-6 py-4 md:py-5 bg-slate-50 border border-slate-100 rounded-[20px] md:rounded-[28px] text-sm font-bold text-slate-700 outline-none focus:bg-white transition-all shadow-inner resize-none" 
                      placeholder="Specify meeting goals or site inspection details..." 
                      value={formData.notes} 
                      onChange={e => setFormData({...formData, notes: e.target.value})} 
                    />
                  </div>
               </div>

               <button type="submit" disabled={isSaving} className="w-full py-6 md:py-8 bg-[#064e3b] text-white rounded-[24px] md:rounded-[32px] text-[10px] md:text-[12px] font-black uppercase tracking-[0.3em] hover:bg-black transition-all flex items-center justify-center gap-4 shadow-2xl active:scale-95 disabled:opacity-50">
                 {isSaving ? <RefreshCw className="w-5 h-5 md:w-6 md:h-6 animate-spin text-emerald-400" /> : <ShieldCheck className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" />} AUTHORIZE FIELD MISSION
               </button>
            </form>
          </div>
        </div>
      )}

      <div className="sticky top-16 lg:top-0 z-[60] bg-[#f8fafc]/90 backdrop-blur-xl px-4 md:px-10 pt-6 md:pt-10 pb-6 md:pb-8 border-b border-slate-100 shadow-sm">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 md:mb-10">
          <div>
            <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">Field Registry</h1>
            <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.25em] mt-1 flex items-center gap-2">
              <HardHat className="w-3.5 h-3.5 text-[#064e3b]" /> SITE OPERATION DISCOVERY
            </p>
          </div>
          <button onClick={() => setShowModal(true)} className="w-full md:w-auto px-8 py-4 bg-[#064e3b] text-white rounded-[20px] md:rounded-[24px] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
            <UserPlus className="w-5 h-5" /> Schedule Visit
          </button>
        </header>

        {/* FOLDER NAVIGATION WITH TOTALS */}
        <div className="grid grid-cols-3 gap-3 md:gap-6 mb-8">
           {[
             { id: 'Upcoming', label: 'Active', icon: FolderClock, bg: 'bg-blue-50', color: 'text-blue-600', count: counts.Upcoming },
             { id: 'Done', label: 'Done', icon: FolderCheck, bg: 'bg-emerald-50', color: 'text-emerald-600', count: counts.Done },
             { id: 'Hold', label: 'Hold', icon: FolderDown, bg: 'bg-amber-50', color: 'text-amber-600', count: counts.Hold }
           ].map((folder) => (
             <button 
               key={folder.id} 
               onClick={() => setActiveFolder(folder.id as VisitStatus)} 
               className={`p-4 md:p-8 rounded-[24px] md:rounded-[40px] transition-all flex flex-col items-center text-center gap-2 border-2 ${activeFolder === folder.id ? 'bg-white border-[#064e3b] shadow-xl scale-[1.02]' : 'bg-white/40 border-transparent hover:bg-white'}`}
             >
                <div className={`w-10 h-10 md:w-14 md:h-14 ${folder.bg} ${folder.color} rounded-xl md:rounded-[22px] flex items-center justify-center shrink-0`}>
                  <folder.icon className="w-5 h-5 md:w-7 md:h-7" />
                </div>
                <div>
                  <span className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-slate-900 block">{folder.label}</span>
                  <span className={`text-[8px] md:text-[10px] font-bold ${folder.color}`}>({folder.count})</span>
                </div>
             </button>
           ))}
        </div>

        {/* FILTER TOOLBAR */}
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-4">
           <div className="relative group flex-1">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-[#064e3b] transition-colors" />
              <input 
                type="text" 
                placeholder="Search visits..." 
                className="w-full h-12 md:h-14 pl-14 pr-6 bg-white border border-slate-100 rounded-[18px] md:rounded-[24px] text-[13px] font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/5 shadow-sm" 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
              />
           </div>
           
           <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1">
              <div className="flex items-center gap-2 bg-white/50 p-1.5 rounded-[18px] md:rounded-[20px] border border-slate-50 shadow-sm shrink-0">
                 <Calendar className="w-3.5 h-3.5 text-slate-400 ml-2" />
                 {(['All', 'Today', 'Weekly'] as DateFilter[]).map(df => (
                   <button 
                     key={df} 
                     onClick={() => setDateFilter(df)}
                     className={`px-3 md:px-4 py-2 rounded-xl text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all ${dateFilter === df ? 'bg-[#064e3b] text-white shadow-md' : 'text-slate-400 hover:bg-white'}`}
                   >
                     {df}
                   </button>
                 ))}
              </div>

              <div className="flex items-center gap-2 bg-white/50 p-1.5 rounded-[18px] md:rounded-[20px] border border-slate-50 shadow-sm shrink-0">
                 <Banknote className="w-3.5 h-3.5 text-slate-400 ml-2" />
                 {(['All', 'Pre-paid', 'Post-paid', 'Free'] as PaymentFilter[]).map(pf => (
                   <button 
                     key={pf} 
                     onClick={() => setPaymentFilter(pf)}
                     className={`px-3 md:px-4 py-2 rounded-xl text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all ${paymentFilter === pf ? 'bg-[#064e3b] text-white shadow-md' : 'text-slate-400 hover:bg-white'}`}
                   >
                     {pf}
                   </button>
                 ))}
              </div>
           </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 md:px-10 mt-6 md:mt-10">
        {loading ? (
          <div className="py-24 flex justify-center"><RefreshCw className="w-10 h-10 text-[#064e3b] animate-spin" /></div>
        ) : filteredVisits.length === 0 ? (
          <div className="py-24 text-center bg-white rounded-[32px] md:rounded-[40px] border border-slate-100 shadow-sm">
            <MapPin className="w-12 h-12 text-slate-100 mx-auto mb-4" />
            <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest">No matching records found</p>
          </div>
        ) : (
          <>
            {/* MOBILE CARDS */}
            <div className="grid grid-cols-1 gap-4 lg:hidden">
              {filteredVisits.map((v) => (
                <div key={v.id} onClick={() => navigate(`/site-visits/${v.id}`)} className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm active:scale-[0.98] transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex flex-col items-center justify-center font-black ${v.visit_date === new Date().toISOString().split('T')[0] ? 'bg-[#064e3b] text-white animate-pulse' : 'bg-slate-50 text-slate-400'}`}>
                        <span className="text-[6px] uppercase">{new Date(v.visit_date).toLocaleString('default', { month: 'short' })}</span>
                        <span className="text-[12px] leading-none">{new Date(v.visit_date).getDate()}</span>
                      </div>
                      <div className={`px-2.5 py-1 rounded-full text-[7px] font-black uppercase border ${getPaymentBadge(v.payment_status)}`}>{v.payment_status}</div>
                    </div>
                  </div>
                  <h3 className="text-[15px] font-black text-slate-900 leading-tight mb-2 truncate">{v.project?.client?.client_name || v.lead?.client_name}</h3>
                  <div className="flex items-start gap-2 mb-4">
                    <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-[10px] font-bold text-slate-400 line-clamp-1">{v.location}</span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                    <div className="flex -space-x-1.5">
                       {v.assignments?.slice(0,4).map((a, i) => (
                         <img key={i} src={a.profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${a.profile?.full_name}`} className="w-6 h-6 rounded-lg border-2 border-white shadow-sm object-cover bg-white" alt="Staff" />
                       ))}
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300" />
                  </div>
                </div>
              ))}
            </div>

            {/* DESKTOP TABLE */}
            <div className="hidden lg:block bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden">
               <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-slate-50/30 text-slate-400 text-[10px] uppercase font-black tracking-[0.25em]">
                        <th className="px-10 py-7 border-b border-slate-100">Schedule Date</th>
                        <th className="px-10 py-7 border-b border-slate-100">Client / Context</th>
                        <th className="px-10 py-7 border-b border-slate-100">Payment Status</th>
                        <th className="px-10 py-7 border-b border-slate-100">Field Assignments</th>
                        <th className="px-10 py-7 border-b border-slate-100 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredVisits.map((v) => (
                        <tr key={v.id} onClick={() => navigate(`/site-visits/${v.id}`)} className="hover:bg-slate-50/80 transition-all cursor-pointer group">
                           <td className="px-10 py-8">
                             <div className="flex items-center gap-4">
                               <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-[#064e3b] shadow-sm"><Calendar className="w-5 h-5" /></div>
                               <span className="text-[13px] font-black text-slate-900">{new Date(v.visit_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                             </div>
                           </td>
                           <td className="px-10 py-8">
                             <div>
                               <p className="text-[14px] font-black text-slate-800 group-hover:text-[#064e3b] transition-colors">{v.project?.client?.client_name || v.lead?.client_name}</p>
                               <p className="text-[11px] text-slate-400 font-bold mt-1 flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {v.location}</p>
                             </div>
                           </td>
                           <td className="px-10 py-8">
                             <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm ${getPaymentBadge(v.payment_status)}`}>
                               {v.payment_status}
                             </span>
                           </td>
                           <td className="px-10 py-8">
                             <div className="flex items-center gap-2">
                               {v.assignments?.length ? v.assignments.map((a, i) => (
                                 <div key={i} className="group/avatar relative">
                                   <img src={a.profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${a.profile?.full_name}`} className="w-8 h-8 rounded-lg shadow-sm border border-slate-100 object-cover bg-white" alt="Member" />
                                   <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[8px] font-black uppercase tracking-widest opacity-0 group-hover/avatar:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">{a.profile?.full_name}</div>
                                 </div>
                               )) : <span className="text-[9px] text-slate-300 font-black uppercase tracking-widest">No assigned personnel</span>}
                             </div>
                           </td>
                           <td className="px-10 py-8 text-right">
                             <div className="inline-flex p-3 bg-white border border-slate-100 rounded-xl shadow-sm text-slate-300 group-hover:text-[#064e3b] group-hover:shadow-md transition-all group-hover:scale-105">
                               <ChevronRight className="w-5 h-5" />
                             </div>
                           </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SiteVisitList;