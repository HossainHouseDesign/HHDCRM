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
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);

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

  const handleStatusUpdate = async (id: string, newStatus: VisitStatus) => {
    setIsUpdatingStatus(id);
    try {
      const { error } = await supabase.from('site_visits').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      showNotification(`Protocol updated: ${newStatus}`, "success");
      fetchData();
    } catch (err: any) {
      showNotification("Sync Failed.", "error");
    } finally {
      setIsUpdatingStatus(null);
    }
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
    <div className="min-h-screen bg-[#f8fafc] pb-20 animate-in fade-in duration-500">
      
      {/* SCHEDULE VISIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-200 animate-in zoom-in-95 overflow-y-auto max-h-[90vh] no-scrollbar leading-none">
            <div className="flex justify-between items-center mb-6 border-b border-slate-50 pb-4">
              <div className="leading-none">
                <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase leading-none">Log Field Visit</h3>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1.5 opacity-80 leading-none">Visit Details & Logistics</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-50 rounded-lg transition-all text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVisit} className="space-y-4">
               <div className="space-y-4">
                  <div className="space-y-1.5 relative" ref={dropdownRef}>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Client / Project</label>
                    <div className="relative group">
                       <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 group-focus-within:text-slate-900 transition-colors" />
                       <input 
                         className="w-full h-11 pl-11 pr-4 bg-slate-50 border border-slate-100 rounded-xl text-[13px] font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-900 transition-all shadow-none uppercase" 
                         placeholder="FIND RECORD..." 
                         value={entityQuery} 
                         onFocus={() => setShowEntityDrop(true)}
                         onChange={e => { setEntityQuery(e.target.value); setShowEntityDrop(true); }}
                       />
                    </div>
                    {showEntityDrop && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-[250] overflow-hidden max-h-52 overflow-y-auto no-scrollbar py-1">
                        {projects.filter(p => p.name.toLowerCase().includes(entityQuery.toLowerCase())).map(p => (
                          <button key={p.id} type="button" onClick={() => { setFormData({...formData, project_id: p.id, lead_id: '', location: p.client?.address || ''}); setEntityQuery(`${p.name}`); setShowEntityDrop(false); }} className="w-full px-4 py-2.5 hover:bg-slate-50 text-left flex items-center gap-2.5 border-b border-slate-50 last:border-0 leading-none uppercase">
                            <div className="w-7 h-7 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center shrink-0 font-black tracking-tighter">P</div>
                            <div className="min-w-0 leading-none">
                              <p className="text-[12px] font-black text-slate-900 truncate tracking-tight leading-none">{p.name}</p>
                              <p className="text-[7px] text-slate-300 font-black uppercase truncate mt-1 leading-none">{p.client?.client_name}</p>
                            </div>
                          </button>
                        ))}
                        {leads.filter(l => l.client_name.toLowerCase().includes(entityQuery.toLowerCase())).map(l => (
                          <button key={l.id} type="button" onClick={() => { setFormData({...formData, project_id: '', lead_id: l.id, location: l.address || ''}); setEntityQuery(`${l.client_name}`); setShowEntityDrop(false); }} className="w-full px-4 py-2.5 hover:bg-slate-50 text-left flex items-center gap-2.5 border-b border-slate-50 last:border-0 leading-none uppercase">
                            <div className="w-7 h-7 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center shrink-0 font-black tracking-tighter">L</div>
                            <div className="min-w-0 leading-none">
                              <p className="text-[12px] font-black text-slate-900 truncate tracking-tight leading-none">{l.client_name}</p>
                              <p className="text-[7px] text-slate-300 font-black uppercase truncate mt-1 leading-none">{l.status}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Deployment Address</label>
                    <input required className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl text-[13px] font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-900 transition-all shadow-none uppercase" placeholder="ENTER SITE ADDRESS" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Date</label>
                    <input required type="date" className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl text-[12px] font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-900 transition-all" value={formData.visit_date} onChange={e => setFormData({...formData, visit_date: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Billing</label>
                    <div className="grid grid-cols-3 gap-0.5 p-0.5 bg-slate-100 rounded-lg leading-none">
                       {(['Pre-paid', 'Post-paid', 'Free'] as PaymentStatus[]).map(s => (
                         <button key={s} type="button" onClick={() => setFormData({...formData, payment_status: s})} className={`py-1.5 rounded-md text-[7px] font-black uppercase tracking-tighter transition-all leading-none ${formData.payment_status === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{s}</button>
                       ))}
                    </div>
                  </div>
               </div>

               <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Staffing ({formData.assigned_team.length})</label>
                  <div className="grid grid-cols-2 gap-1.5 px-0.5 max-h-32 overflow-y-auto no-scrollbar py-0.5">
                     {staff.map(s => {
                       const active = formData.assigned_team.includes(s.id);
                       return (
                         <button key={s.id} type="button" onClick={() => setFormData(prev => ({ ...prev, assigned_team: active ? prev.assigned_team.filter(i => i !== s.id) : [...prev.assigned_team, s.id] }))} className={`flex items-center gap-2 p-1.5 rounded-lg border transition-all text-left leading-none ${active ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                            <div className="w-6 h-6 bg-slate-100 rounded flex items-center justify-center font-black text-[10px] shrink-0 group-hover:bg-white uppercase">{s.full_name?.charAt(0)}</div>
                            <p className="text-[10px] font-black truncate uppercase tracking-tight leading-none">{s.full_name}</p>
                         </button>
                       );
                     })}
                  </div>
               </div>

               <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Operational Brief</label>
                  <textarea 
                    className="w-full h-20 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[12px] font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-900 transition-all resize-none shadow-none uppercase" 
                    placeholder="VISIT GOALS..." 
                    value={formData.notes} 
                    onChange={e => setFormData({...formData, notes: e.target.value})} 
                  />
               </div>

               <footer className="pt-2 flex gap-3">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3.5 bg-slate-50 text-slate-400 rounded-xl text-[9px] font-black uppercase tracking-widest border border-slate-100 leading-none">Cancel</button>
                  <button type="submit" disabled={isSaving} className="flex-1 py-3.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 shadow-none disabled:opacity-50 active:scale-95 leading-none">
                    {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" /> : <Save className="w-3.5 h-3.5 text-emerald-400" />} Log Visit
                  </button>
               </footer>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-[1440px] mx-auto px-4 md:px-6 pt-6 md:pt-10">
        <header className="flex flex-row justify-between items-center gap-4 mb-6 md:mb-8">
          <div className="leading-none">
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">Field Management</h1>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1.5 opacity-80 leading-none">SITE VISIT REGISTRY & OPS</p>
          </div>
          <button onClick={() => setShowModal(true)} className="px-5 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-none hover:bg-black transition-all flex items-center justify-center gap-2 leading-none">
            <Plus className="w-4 h-4 text-emerald-400" /> New Visit
          </button>
        </header>

        {/* FOLDER NAVIGATION */}
        <div className="grid grid-cols-3 gap-2 md:gap-3 mb-6 md:mb-8">
           {[
             { id: 'Upcoming', label: 'Active', icon: FolderClock, color: 'text-slate-900', bg: 'bg-slate-100', count: counts.Upcoming },
             { id: 'Done', label: 'Complete', icon: FolderCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', count: counts.Done },
             { id: 'Hold', label: 'Hold', icon: FolderDown, color: 'text-slate-400', bg: 'bg-slate-50', count: counts.Hold }
           ].map((folder) => (
             <button 
               key={folder.id} 
               onClick={() => setActiveFolder(folder.id as VisitStatus)} 
               className={`p-3 md:p-4 rounded-xl transition-all flex flex-row items-center gap-3 border shadow-none group ${activeFolder === folder.id ? 'bg-white border-slate-900' : 'bg-transparent border-transparent hover:bg-slate-100/50'}`}
             >
                <div className={`w-8 h-8 md:w-10 md:h-10 ${folder.bg} ${folder.color} rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105`}>
                  <folder.icon className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                <div className="text-left leading-none">
                  <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-slate-900 block leading-none">{folder.label}</span>
                  <span className={`text-[12px] md:text-[14px] font-black mt-1 block leading-none ${folder.color}`}>{folder.count}</span>
                </div>
             </button>
           ))}
        </div>

        {/* FILTER TOOLBAR */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 mb-6 md:mb-8">
           <div className="relative group flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 group-focus-within:text-slate-900 transition-colors" />
              <input 
                type="text" 
                placeholder="SEARCH REGISTRY..." 
                className="w-full h-10 pl-11 pr-4 bg-white border border-slate-200 rounded-xl text-[12px] font-bold text-slate-700 outline-none focus:border-slate-900 transition-all shadow-none uppercase" 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
              />
           </div>
           
           <div className="flex flex-row items-center gap-2 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
                 <div className="px-1.5 text-slate-400"><CalendarDays className="w-3.5 h-3.5" /></div>
                 {(['All', 'Today', 'Weekly'] as DateFilter[]).map(df => (
                   <button 
                     key={df} 
                     onClick={() => setDateFilter(df)}
                     className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all leading-none ${dateFilter === df ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                   >
                     {df}
                   </button>
                 ))}
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
                 <div className="px-1.5 text-slate-400"><Banknote className="w-3.5 h-3.5" /></div>
                 {(['All', 'Pre-paid', 'Post-paid', 'Free'] as PaymentFilter[]).map(pf => (
                   <button 
                     key={pf} 
                     onClick={() => setPaymentFilter(pf)}
                     className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all leading-none ${paymentFilter === pf ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                   >
                     {pf}
                   </button>
                 ))}
              </div>
           </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 md:px-6">
        {loading ? (
          <div className="py-24 flex flex-col items-center gap-4 text-slate-300">
            <RefreshCw className="w-8 h-8 animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest">Updating registry...</p>
          </div>
        ) : filteredVisits.length === 0 ? (
          <div className="py-24 text-center bg-white rounded-3xl border border-slate-200 shadow-none">
            <MapPin className="w-12 h-12 text-slate-100 mx-auto mb-4" />
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No matching visits found</p>
          </div>
        ) : (
          <>
            {/* MOBILE LIST */}
            <div className="grid grid-cols-1 gap-3 lg:hidden">
              {filteredVisits.map((v) => (
                <div key={v.id} onClick={() => navigate(`/site-visits/${v.id}`)} className="bg-white p-4 rounded-xl border border-slate-200 shadow-none active:scale-[0.98] transition-all hover:bg-slate-50/30 group">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex flex-col items-center justify-center font-black ${v.visit_date === new Date().toISOString().split('T')[0] ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-300'}`}>
                        <span className="text-[6px] uppercase leading-none">{new Date(v.visit_date).toLocaleString('default', { month: 'short' })}</span>
                        <span className="text-[12px] leading-none mt-0.5">{new Date(v.visit_date).getDate()}</span>
                      </div>
                      <div className={`px-2 py-0.5 rounded-md text-[7px] font-black uppercase border leading-none ${getPaymentBadge(v.payment_status)}`}>{v.payment_status}</div>
                    </div>
                  </div>
                  <h3 className="text-[13px] font-black text-slate-900 leading-none mb-2 truncate uppercase tracking-tight">{v.project?.client?.client_name || v.lead?.client_name}</h3>
                  <div className="flex items-start gap-1.5 mb-3 leading-none">
                    <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight truncate leading-none">{v.location}</span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                    <div className="flex -space-x-1.5">
                       {v.assignments?.slice(0,4).map((a, i) => (
                         <div key={i} className="w-6 h-6 rounded-md bg-slate-50 border-2 border-white shadow-none font-black flex items-center justify-center text-[8px] text-slate-300 uppercase">{a.profile?.full_name?.charAt(0)}</div>
                       ))}
                    </div>
                    <div className="w-7 h-7 bg-slate-50 text-slate-200 rounded-lg flex items-center justify-center group-hover:text-slate-900 transition-all">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* DESKTOP TABLE */}
            <div className="hidden lg:block bg-white rounded-xl border border-slate-200 shadow-none overflow-hidden">
               <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-slate-50/50 text-slate-400 text-[8px] uppercase font-black tracking-widest leading-none">
                        <th className="px-6 py-4 border-b border-slate-100">Schedule Identity</th>
                        <th className="px-6 py-4 border-b border-slate-100">Deployment Record</th>
                        <th className="px-6 py-4 border-b border-slate-100 text-center">Status (Pay)</th>
                        <th className="px-6 py-4 border-b border-slate-100">Team Units</th>
                        <th className="px-6 py-4 border-b border-slate-100 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-slate-700">
                      {filteredVisits.map((v) => (
                        <tr key={v.id} onClick={() => navigate(`/site-visits/${v.id}`)} className="hover:bg-slate-50/30 transition-all cursor-pointer group">
                           <td className="px-6 py-3">
                             <div className="flex items-center gap-3">
                               <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-300 group-hover:text-slate-900 group-hover:bg-white transition-all shadow-none"><Calendar className="w-4 h-4" /></div>
                               <span className="text-[12px] font-black text-slate-900 uppercase tracking-tight">{new Date(v.visit_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                             </div>
                           </td>
                           <td className="px-6 py-3">
                             <div className="max-w-md leading-none">
                               <p className="text-[13px] font-black text-slate-900 group-hover:text-slate-700 transition-colors uppercase tracking-tight leading-none">{v.project?.client?.client_name || v.lead?.client_name}</p>
                               <p className="text-[9px] text-slate-300 font-black uppercase mt-1.5 flex items-center gap-1.5 leading-none transition-colors"><MapPin className="w-2.5 h-2.5 text-emerald-500" /> {v.location}</p>
                             </div>
                           </td>
                           <td className="px-6 py-3 text-center">
                             <span className={`px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-widest border shadow-none ${getPaymentBadge(v.payment_status)}`}>
                               {v.payment_status}
                             </span>
                           </td>
                           <td className="px-6 py-3">
                             <div className="flex flex-col gap-1.5">
                               {v.assignments?.length ? v.assignments.map((a, i) => (
                                 <div key={i} className="flex items-center gap-2 group/member">
                                   <div className="w-6 h-6 bg-slate-50 rounded border border-slate-100 shadow-none font-black flex items-center justify-center overflow-hidden shrink-0 transition-transform group-hover/member:scale-105">
                                     {a.profile?.avatar_url ? (
                                       <img src={a.profile.avatar_url} alt={a.profile.full_name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                     ) : (
                                       <span className="text-[8px] text-slate-300 uppercase font-black">{a.profile?.full_name?.charAt(0)}</span>
                                     )}
                                   </div>
                                   <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight leading-none truncate max-w-[120px]">{a.profile?.full_name}</span>
                                 </div>
                               )) : <span className="text-[8px] text-slate-200 font-black uppercase tracking-widest">UNASSIGNED</span>}
                             </div>
                           </td>
                           <td className="px-6 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="relative inline-flex items-center group">
                                <select 
                                  value={v.status}
                                  onChange={(e) => handleStatusUpdate(v.id, e.target.value as VisitStatus)}
                                  disabled={isUpdatingStatus === v.id}
                                  className="appearance-none bg-slate-50 border border-transparent hover:border-slate-200 text-slate-900 text-[8px] font-black uppercase tracking-widest rounded-lg px-3 py-1.5 focus:outline-none transition-all cursor-pointer pr-7"
                                >
                                  <option value="Upcoming">Active</option>
                                  <option value="Done">Complete</option>
                                  <option value="Hold">Hold</option>
                                </select>
                                <ChevronDown className="absolute right-2 w-3 h-3 text-slate-400 pointer-events-none" />
                                {isUpdatingStatus === v.id && <RefreshCw className="absolute -left-5 w-3 h-3 animate-spin text-emerald-500" />}
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