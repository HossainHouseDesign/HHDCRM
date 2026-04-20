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
    <div className="min-h-screen bg-slate-50/50 pb-32 animate-in fade-in duration-700">
      
      {/* SCHEDULE VISIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-8 md:p-10 max-w-2xl w-full shadow-2xl border border-slate-200 animate-in zoom-in-95 overflow-y-auto max-h-[90vh] no-scrollbar">
            <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Schedule New Visit</h3>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">Visit Details & Logistics</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVisit} className="space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 relative" ref={dropdownRef}>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Client / Project</label>
                    <div className="relative group">
                       <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                       <input 
                         className="w-full h-12 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:bg-white focus:border-emerald-500 transition-all" 
                         placeholder="Find project or lead..." 
                         value={entityQuery} 
                         onFocus={() => setShowEntityDrop(true)}
                         onChange={e => { setEntityQuery(e.target.value); setShowEntityDrop(true); }}
                       />
                    </div>
                    {showEntityDrop && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-[250] overflow-hidden max-h-60 overflow-y-auto no-scrollbar py-1">
                        {projects.filter(p => p.name.toLowerCase().includes(entityQuery.toLowerCase())).map(p => (
                          <button key={p.id} type="button" onClick={() => { setFormData({...formData, project_id: p.id, lead_id: '', location: p.client?.address || ''}); setEntityQuery(`${p.name}`); setShowEntityDrop(false); }} className="w-full px-4 py-3 hover:bg-slate-50 text-left flex items-center gap-3 border-b border-slate-50 last:border-0">
                            <div className="w-8 h-8 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center shrink-0"><Building2 className="w-4 h-4" /></div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-bold text-slate-900 truncate">{p.name}</p>
                              <p className="text-[10px] text-slate-400 font-medium uppercase truncate">Project • {p.client?.client_name}</p>
                            </div>
                          </button>
                        ))}
                        {leads.filter(l => l.client_name.toLowerCase().includes(entityQuery.toLowerCase())).map(l => (
                          <button key={l.id} type="button" onClick={() => { setFormData({...formData, project_id: '', lead_id: l.id, location: l.address || ''}); setEntityQuery(`${l.client_name}`); setShowEntityDrop(false); }} className="w-full px-4 py-3 hover:bg-slate-50 text-left flex items-center gap-3 border-b border-slate-50 last:border-0">
                            <div className="w-8 h-8 bg-emerald-50 text-emerald-500 rounded-lg flex items-center justify-center shrink-0"><FileText className="w-4 h-4" /></div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-bold text-slate-900 truncate">{l.client_name}</p>
                              <p className="text-[10px] text-slate-400 font-medium uppercase truncate">Lead • {l.status}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Location</label>
                    <input required className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:bg-white focus:border-emerald-500 transition-all" placeholder="Enter site address" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Visit Date</label>
                    <input required type="date" className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:bg-white focus:border-emerald-500 transition-all" value={formData.visit_date} onChange={e => setFormData({...formData, visit_date: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Payment Type</label>
                    <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl">
                       {(['Pre-paid', 'Post-paid', 'Free'] as PaymentStatus[]).map(s => (
                         <button key={s} type="button" onClick={() => setFormData({...formData, payment_status: s})} className={`py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${formData.payment_status === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{s}</button>
                       ))}
                    </div>
                  </div>
               </div>

               <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-2">Assign Team ({formData.assigned_team.length})</label>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 px-1 max-h-40 overflow-y-auto no-scrollbar">
                     {staff.map(s => {
                       const active = formData.assigned_team.includes(s.id);
                       return (
                         <button key={s.id} type="button" onClick={() => setFormData(prev => ({ ...prev, assigned_team: active ? prev.assigned_team.filter(i => i !== s.id) : [...prev.assigned_team, s.id] }))} className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all text-left ${active ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'}`}>
                            <img src={s.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.email}`} className="w-8 h-8 rounded-lg object-cover shrink-0" alt={s.full_name} />
                            <p className="text-[11px] font-bold truncate leading-none">{s.full_name}</p>
                         </button>
                       );
                     })}
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Notes</label>
                  <textarea 
                    className="w-full h-24 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:bg-white focus:border-emerald-500 transition-all resize-none shadow-sm" 
                    placeholder="Specific instructions or visit goals..." 
                    value={formData.notes} 
                    onChange={e => setFormData({...formData, notes: e.target.value})} 
                  />
               </div>

               <footer className="pt-4 border-t border-slate-100 flex gap-4">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 h-14 rounded-2xl bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider hover:bg-slate-100 transition-all">Cancel</button>
                  <button type="submit" disabled={isSaving} className="flex-[2] h-14 bg-slate-900 text-white rounded-2xl text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-xl disabled:opacity-50 active:scale-95">
                    {isSaving ? <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> : <Save className="w-4 h-4 text-emerald-400" />} Schedule Visit
                  </button>
               </footer>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 pt-12 pb-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Site Visits</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Field Registry & Management</p>
          </div>
          <button onClick={() => setShowModal(true)} className="px-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-xl hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2.5">
            <Plus className="w-4 h-4" /> Schedule Visit
          </button>
        </header>

        {/* FOLDER NAVIGATION */}
        <div className="grid grid-cols-3 gap-3 md:gap-4 mb-8">
           {[
             { id: 'Upcoming', label: 'Active', icon: FolderClock, color: 'text-blue-600', bg: 'bg-blue-50', count: counts.Upcoming },
             { id: 'Done', label: 'Done', icon: FolderCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', count: counts.Done },
             { id: 'Hold', label: 'Hold', icon: FolderDown, color: 'text-amber-600', bg: 'bg-amber-50', count: counts.Hold }
           ].map((folder) => (
             <button 
               key={folder.id} 
               onClick={() => setActiveFolder(folder.id as VisitStatus)} 
               className={`p-6 rounded-2xl transition-all flex flex-col items-center justify-center gap-4 border-2 group ${activeFolder === folder.id ? 'bg-white border-slate-900 shadow-xl' : 'bg-white/50 border-transparent hover:bg-white'}`}
             >
                <div className={`w-12 h-12 ${folder.bg} ${folder.color} rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110`}>
                  <folder.icon className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-900 block">{folder.label}</span>
                  <span className={`text-[11px] font-bold ${folder.color}`}>{folder.count} registered</span>
                </div>
             </button>
           ))}
        </div>

        {/* FILTER TOOLBAR */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm focus-within:shadow-md transition-shadow">
           <div className="relative group flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-slate-900 transition-colors" />
              <input 
                type="text" 
                placeholder="Search visits by name or address..." 
                className="w-full h-10 pl-11 pr-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium text-slate-700 outline-none focus:bg-white transition-all" 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
              />
           </div>
           
           <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
                 <div className="px-2 text-slate-400"><CalendarDays className="w-3.5 h-3.5" /></div>
                 {(['All', 'Today', 'Weekly'] as DateFilter[]).map(df => (
                   <button 
                     key={df} 
                     onClick={() => setDateFilter(df)}
                     className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${dateFilter === df ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                   >
                     {df}
                   </button>
                 ))}
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
                 <div className="px-2 text-slate-400"><Banknote className="w-3.5 h-3.5" /></div>
                 {(['All', 'Pre-paid', 'Post-paid', 'Free'] as PaymentFilter[]).map(pf => (
                   <button 
                     key={pf} 
                     onClick={() => setPaymentFilter(pf)}
                     className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${paymentFilter === pf ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                   >
                     {pf}
                   </button>
                 ))}
              </div>
           </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6">
        {loading ? (
          <div className="py-24 flex flex-col items-center gap-4 text-slate-300">
            <RefreshCw className="w-8 h-8 animate-spin" />
            <p className="text-[10px] font-bold uppercase tracking-widest">Updating registry...</p>
          </div>
        ) : filteredVisits.length === 0 ? (
          <div className="py-24 text-center bg-white rounded-3xl border border-slate-200 border-dashed">
            <MapPin className="w-12 h-12 text-slate-100 mx-auto mb-4" />
            <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">No matching visits found</p>
          </div>
        ) : (
          <>
            {/* MOBILE CARDS */}
            <div className="grid grid-cols-1 gap-4 lg:hidden">
              {filteredVisits.map((v) => (
                <div key={v.id} onClick={() => navigate(`/site-visits/${v.id}`)} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm active:scale-[0.98] transition-all hover:border-slate-300">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center font-bold ${v.visit_date === new Date().toISOString().split('T')[0] ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-500'}`}>
                        <span className="text-[7px] uppercase">{new Date(v.visit_date).toLocaleString('default', { month: 'short' })}</span>
                        <span className="text-[14px] leading-none">{new Date(v.visit_date).getDate()}</span>
                      </div>
                      <div className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase border ${getPaymentBadge(v.payment_status)}`}>{v.payment_status}</div>
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight mb-2 truncate">{v.project?.client?.client_name || v.lead?.client_name}</h3>
                  <div className="flex items-start gap-2 mb-4">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="text-[11px] font-medium text-slate-500 line-clamp-1">{v.location}</span>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex -space-x-2">
                       {v.assignments?.slice(0,4).map((a, i) => (
                         <img key={i} src={a.profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${a.profile?.full_name}`} className="w-7 h-7 rounded-lg border-2 border-white shadow-sm object-cover bg-white" alt="Staff" />
                       ))}
                    </div>
                    <div className="p-2 bg-slate-50 text-slate-300 rounded-lg group-hover:text-slate-900 group-hover:bg-slate-100 transition-all">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* DESKTOP TABLE */}
            <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-bold tracking-widest">
                        <th className="px-8 py-5 border-b border-slate-100">Schedule Date</th>
                        <th className="px-8 py-5 border-b border-slate-100">Client / Location</th>
                        <th className="px-8 py-5 border-b border-slate-100 text-center">Payment</th>
                        <th className="px-8 py-5 border-b border-slate-100">Assignments</th>
                        <th className="px-8 py-5 border-b border-slate-100 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredVisits.map((v) => (
                        <tr key={v.id} onClick={() => navigate(`/site-visits/${v.id}`)} className="hover:bg-slate-50/50 transition-all cursor-pointer group">
                           <td className="px-8 py-6">
                             <div className="flex items-center gap-4">
                               <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-slate-900 group-hover:bg-white transition-all shadow-sm"><Calendar className="w-4 h-4" /></div>
                               <span className="text-sm font-bold text-slate-900">{new Date(v.visit_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                             </div>
                           </td>
                           <td className="px-8 py-6">
                             <div className="max-w-md">
                               <p className="text-[15px] font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{v.project?.client?.client_name || v.lead?.client_name}</p>
                               <p className="text-[11px] text-slate-400 font-semibold mt-1 flex items-center gap-1.5"><MapPin className="w-3 h-3 text-emerald-500" /> {v.location}</p>
                             </div>
                           </td>
                           <td className="px-8 py-6 text-center">
                             <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border shadow-sm ${getPaymentBadge(v.payment_status)}`}>
                               {v.payment_status}
                             </span>
                           </td>
                           <td className="px-8 py-6">
                             <div className="flex items-center gap-1.5">
                               {v.assignments?.length ? v.assignments.map((a, i) => (
                                 <div key={i} className="group/avatar relative">
                                   <img src={a.profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${a.profile?.full_name}`} className="w-8 h-8 rounded-lg shadow-sm border border-white object-cover bg-white" alt="Member" />
                                   <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white rounded-lg text-[8px] font-bold uppercase tracking-wider opacity-0 group-hover/avatar:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">{a.profile?.full_name}</div>
                                 </div>
                               )) : <span className="text-[9px] text-slate-300 font-bold uppercase tracking-widest">Unassigned</span>}
                             </div>
                           </td>
                           <td className="px-8 py-6 text-right">
                             <div className="inline-flex p-2 bg-slate-50 text-slate-300 rounded-lg group-hover:text-slate-900 group-hover:bg-white border border-transparent group-hover:border-slate-200 shadow-sm transition-all group-hover:scale-105">
                               <ArrowRight className="w-4 h-4" />
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