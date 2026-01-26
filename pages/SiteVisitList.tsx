import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  MapPin, Search, Plus, RefreshCw, X, Save, 
  ChevronDown, CheckCircle2, User, Building2, 
  Calendar, Clock, Layout, Users2, Filter, 
  ChevronRight, ArrowRight, Target, Info,
  FilterX, CalendarDays, ListFilter, UserCheck,
  Check, HardHat, FileText, UserPlus
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Project, Lead, Profile, SiteVisit } from '../types';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNotification, useUser } from '../App';

type DateFilter = 'All' | 'Today' | 'Weekly' | 'Custom';

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
  
  // Filtering & Search
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('All');
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    project_id: '',
    lead_id: '',
    location: '',
    visit_date: new Date().toISOString().split('T')[0],
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
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [visitsRes, projRes, leadsRes, staffRes] = await Promise.all([
        supabase.from('site_visits').select('*, project:projects(*, client:leads(*)), lead:leads(*), creator:profiles!scheduled_by(full_name), assignments:site_visit_assignments(profile:profiles(*))').is('deleted_at', null).order('visit_date', { ascending: true }),
        supabase.from('projects').select('*, client:leads(*)').is('deleted_at', null),
        supabase.from('leads').select('*').is('deleted_at', null),
        supabase.from('profiles').select('*').is('deleted_at', null).eq('status', 'active')
      ]);

      if (visitsRes.error) {
        if (visitsRes.error.message.includes("does not exist")) {
           showNotification("Database Table Missing: Please run the SQL script in 'supabaseClient.ts'.", "error");
        }
        throw visitsRes.error;
      }
      setVisits(visitsRes.data || []);
      setProjects(projRes.data || []);
      setLeads(leadsRes.data || []);
      setStaff(staffRes.data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredVisits = useMemo(() => {
    let result = visits.filter(v => {
      const q = search.toLowerCase();
      const clientName = v.project?.client?.client_name || v.lead?.client_name || '';
      const projectName = v.project?.name || 'Inquiry';
      const location = v.location.toLowerCase();
      return clientName.toLowerCase().includes(q) || projectName.toLowerCase().includes(q) || location.includes(q);
    });

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

    return result;
  }, [visits, search, dateFilter, customDate]);

  const handleSelectProject = (p: Project) => {
    setFormData({ ...formData, project_id: p.id, lead_id: p.client_id, location: p.client?.address || '' });
    setEntityQuery(`Project: ${p.name}`);
    setShowEntityDrop(false);
  };

  const handleSelectLead = (l: Lead) => {
    setFormData({ ...formData, project_id: '', lead_id: l.id, location: l.address || '' });
    setEntityQuery(`Lead: ${l.client_name}`);
    setShowEntityDrop(false);
  };

  const toggleStaff = (id: string) => {
    setFormData(prev => ({
      ...prev,
      assigned_team: prev.assigned_team.includes(id) 
        ? prev.assigned_team.filter(i => i !== id) 
        : [...prev.assigned_team, id]
    }));
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.location || !formData.visit_date || (!formData.project_id && !formData.lead_id)) {
      showNotification("Missing Context: Assign a Project or Lead to this visit.", "warning");
      return;
    }

    setIsSaving(true);
    try {
      const { data: visit, error: vError } = await supabase.from('site_visits').insert([{
        project_id: formData.project_id || null,
        lead_id: formData.lead_id || null,
        location: formData.location,
        visit_date: formData.visit_date,
        notes: formData.notes,
        scheduled_by: profile?.id,
        office_id: profile?.office_id
      }]).select().single();

      if (vError) throw vError;

      if (formData.assigned_team.length > 0 && visit) {
        const assignments = formData.assigned_team.map(pid => ({
          site_visit_id: visit.id,
          profile_id: pid
        }));
        await supabase.from('site_visit_assignments').insert(assignments);
      }

      showNotification("Field Operation Authorized & Synced.", "success");
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      showNotification("Scheduling Error: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({ project_id: '', lead_id: '', location: '', visit_date: new Date().toISOString().split('T')[0], notes: '', assigned_team: [] });
    setEntityQuery('');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-32 animate-in fade-in duration-700">
      
      {/* HIGH-END SCHEDULE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white rounded-[48px] p-8 md:p-14 max-w-2xl w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 overflow-y-auto max-h-[90vh] no-scrollbar relative">
              <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />
              <div className="flex justify-between items-start mb-12 relative z-10">
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">Schedule Site Visit</h3>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mt-2">FIELD COORDINATION HUB</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-red-500 transition-all"><X className="w-6 h-6" /></button>
              </div>

              <form onSubmit={handleSchedule} className="space-y-10 relative z-10">
                 <div className="space-y-3 relative" ref={dropdownRef}>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Client or Project</label>
                    <div className="relative group">
                      <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                      <input 
                        className="w-full h-16 pl-14 pr-8 bg-slate-50 border border-slate-100 rounded-[24px] text-sm font-bold text-slate-700 outline-none focus:bg-white transition-all shadow-inner" 
                        placeholder="Search Active Projects or Leads..." 
                        value={entityQuery} 
                        onFocus={() => setShowEntityDrop(true)}
                        onChange={e => { setEntityQuery(e.target.value); setShowEntityDrop(true); }}
                      />
                    </div>
                    {showEntityDrop && (
                      <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-100 rounded-[32px] shadow-2xl z-[150] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                         <div className="max-h-64 overflow-y-auto no-scrollbar py-2">
                            {/* PROJECTS SECTION */}
                            <div className="px-4 py-2 border-b border-slate-50 bg-slate-50/50"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Portfolio</span></div>
                            {projects.filter(p => p.name.toLowerCase().includes(entityQuery.toLowerCase()) || p.client?.client_name.toLowerCase().includes(entityQuery.toLowerCase())).map(p => (
                               <div key={p.id} onClick={() => handleSelectProject(p)} className="flex items-center gap-4 p-4 hover:bg-blue-50 cursor-pointer group">
                                  <div className="w-10 h-10 bg-slate-50 text-slate-300 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all"><Building2 className="w-5 h-5" /></div>
                                  <div><p className="text-[13px] font-black text-slate-900 truncate">Project: {p.name}</p><p className="text-[10px] text-slate-400 font-bold uppercase">{p.client?.client_name}</p></div>
                               </div>
                            ))}
                            {/* LEADS SECTION */}
                            <div className="px-4 py-2 border-b border-slate-50 bg-slate-50/50 mt-2"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pipeline Discovery</span></div>
                            {leads.filter(l => !l.is_client && (l.client_name.toLowerCase().includes(entityQuery.toLowerCase()) || l.phone.includes(entityQuery))).map(l => (
                               <div key={l.id} onClick={() => handleSelectLead(l)} className="flex items-center gap-4 p-4 hover:bg-emerald-50 cursor-pointer group">
                                  <div className="w-10 h-10 bg-slate-50 text-slate-300 rounded-xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all"><FileText className="w-5 h-5" /></div>
                                  <div><p className="text-[13px] font-black text-slate-900 truncate">Lead: {l.client_name}</p><p className="text-[10px] text-slate-400 font-bold uppercase">{l.phone}</p></div>
                               </div>
                            ))}
                         </div>
                      </div>
                    )}
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Visit Location</label>
                       <div className="relative">
                          <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                          <input required className="w-full h-16 pl-14 pr-8 bg-slate-50 border border-slate-100 rounded-[24px] text-sm font-bold text-slate-700 outline-none focus:bg-white shadow-inner" placeholder="Site Address" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                       </div>
                    </div>
                    <div className="space-y-3">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Scheduled Date</label>
                       <input required type="date" className="w-full h-16 px-8 bg-slate-50 border border-slate-100 rounded-[24px] text-sm font-bold text-slate-700 outline-none" value={formData.visit_date} onChange={e => setFormData({...formData, visit_date: e.target.value})} />
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Users2 className="w-3 h-3" /> Assign Architectural Staff</label>
                      <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{formData.assigned_team.length} Selected</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-[32px] border border-slate-100 max-h-48 overflow-y-auto no-scrollbar">
                       {staff.map(s => {
                         const active = formData.assigned_team.includes(s.id);
                         return (
                           <button key={s.id} type="button" onClick={() => toggleStaff(s.id)} className={`flex items-center gap-3 p-3 rounded-2xl border transition-all text-left ${active ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-600 hover:border-blue-200'}`}>
                              <img src={s.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.full_name}`} className="w-8 h-8 rounded-lg bg-white p-0.5 object-cover shrink-0 shadow-sm" alt={s.full_name} />
                              <div className="min-w-0"><p className="text-[10px] font-black truncate leading-none">{s.full_name}</p></div>
                           </button>
                         );
                       })}
                    </div>
                 </div>

                 <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Observation Brief (Short Note)</label>
                    <textarea className="w-full h-24 p-6 bg-slate-50 border border-slate-100 rounded-[28px] text-sm font-bold text-slate-700 outline-none focus:bg-white resize-none shadow-inner" placeholder="Logistics briefing, site measurement, or client meeting..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
                 </div>

                 <button type="submit" disabled={isSaving} className="w-full py-8 bg-[#064e3b] text-white rounded-[32px] text-[12px] font-black uppercase tracking-[0.3em] hover:bg-black transition-all flex items-center justify-center gap-4 shadow-2xl active:scale-95 disabled:opacity-50">
                   {isSaving ? <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" /> : <MapPin className="w-6 h-6 text-emerald-400" />} AUTHORIZE VISIT SCHEDULE
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
              <HardHat className="w-3.5 h-3.5 text-blue-500" /> COORDINATING ARCHITECTURAL SITE VISITS
            </p>
          </div>
          <button onClick={() => setShowModal(true)} className="px-10 py-5 bg-[#064e3b] text-white rounded-[24px] text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-emerald-900/20 active:scale-95 transition-all flex items-center gap-3 hover:bg-black">
            <UserPlus className="w-5 h-5" /> Schedule Site Visit
          </button>
        </header>

        <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-6">
           <div className="relative group flex-1">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Search visits by Client, Location, or Project Name..."
                className="w-full h-16 pl-16 pr-6 bg-white border border-slate-100 rounded-[28px] text-[14px] font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5 transition-all shadow-sm"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
           </div>

           <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 bg-white/50 p-1.5 rounded-[24px] border border-slate-100 shadow-sm">
                 {(['All', 'Today', 'Weekly', 'Custom'] as DateFilter[]).map(opt => (
                   <button 
                     key={opt}
                     onClick={() => setDateFilter(opt)}
                     className={`px-8 py-3.5 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all ${dateFilter === opt ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/10' : 'text-slate-400 hover:text-slate-600'}`}
                   >
                     {opt}
                   </button>
                 ))}
              </div>

              {dateFilter === 'Custom' && (
                <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                   <CalendarDays className="w-5 h-5 text-blue-500" />
                   <input type="date" className="h-14 px-6 bg-white border border-slate-100 rounded-[24px] text-[10px] font-black uppercase text-slate-700 outline-none shadow-sm" value={customDate} onChange={e => setCustomDate(e.target.value)} />
                </div>
              )}
           </div>
        </div>
      </div>

      {/* VISIT LIST DATA GRID */}
      <div className="max-w-[1440px] mx-auto px-6 md:px-10 mt-10">
        {loading ? (
          <div className="py-32 flex flex-col items-center gap-6">
            <RefreshCw className="w-12 h-12 text-blue-600 animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Syncing with Site Records...</p>
          </div>
        ) : filteredVisits.length === 0 ? (
          <div className="py-40 text-center bg-white rounded-[64px] border border-slate-100 shadow-xl">
             <MapPin className="w-16 h-16 text-slate-100 mx-auto mb-6" />
             <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest">No site visits match these criteria</p>
          </div>
        ) : (
          <div className="bg-white rounded-[48px] border border-slate-100 shadow-xl shadow-slate-200/5 overflow-hidden">
            <div className="overflow-x-auto no-scrollbar max-h-[calc(100vh-320px)] overflow-y-auto">
              <table className="w-full text-left min-w-[1400px] border-separate border-spacing-0">
                <thead className="sticky top-0 z-[40] bg-white">
                  <tr className="text-slate-400 text-[10px] uppercase font-black tracking-[0.25em]">
                    <th className="px-10 py-7 border-b border-slate-100 bg-white">Scheduled Date & Client</th>
                    <th className="px-10 py-7 border-b border-slate-100 bg-white">Location</th>
                    <th className="px-10 py-7 border-b border-slate-100 bg-white">Assigned Team</th>
                    <th className="px-10 py-7 border-b border-slate-100 bg-white">Scheduled By</th>
                    <th className="px-10 py-7 border-b border-slate-100 bg-white">Project Connection</th>
                    <th className="px-10 py-7 border-b border-slate-100 bg-white text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredVisits.map((v) => {
                    const isToday = v.visit_date === new Date().toISOString().split('T')[0];
                    return (
                      <tr key={v.id} className="hover:bg-slate-50/80 transition-all cursor-pointer group">
                        <td className="px-10 py-8">
                           <div className="flex items-center gap-5">
                              <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm ${isToday ? 'bg-blue-600 text-white animate-pulse' : 'bg-slate-50 text-slate-400'}`}>
                                 <span className="text-[10px] uppercase tracking-tighter opacity-60">{new Date(v.visit_date).toLocaleString('default', { month: 'short' })}</span>
                                 <span className="text-lg leading-none">{new Date(v.visit_date).getDate()}</span>
                              </div>
                              <div className="min-w-0">
                                 <p className="text-[15px] font-black text-slate-900 group-hover:text-blue-700 transition-colors">{v.project?.client?.client_name || v.lead?.client_name || 'Anonymous'}</p>
                                 <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Visit ID: {v.id.slice(0, 8).toUpperCase()}</p>
                              </div>
                           </div>
                        </td>

                        <td className="px-10 py-8">
                           <div className="flex items-start gap-3">
                              <MapPin className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                              <span className="text-[13px] font-black text-slate-700 max-w-[220px] leading-relaxed">{v.location}</span>
                           </div>
                        </td>

                        <td className="px-10 py-8">
                           <div className="flex items-center -space-x-3">
                              {v.assignments && v.assignments.length > 0 ? (
                                v.assignments.map((a, i) => (
                                  <img 
                                    key={i} 
                                    src={a.profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${a.profile?.full_name}`} 
                                    className="w-10 h-10 rounded-xl border-2 border-white bg-white shadow-md object-cover hover:scale-110 transition-transform relative z-[1]" 
                                    title={a.profile?.full_name}
                                  />
                                ))
                              ) : (
                                <div className="px-3 py-1 bg-slate-50 text-slate-300 text-[9px] font-black uppercase rounded-lg border border-slate-100">No Assignments</div>
                              )}
                           </div>
                        </td>

                        <td className="px-10 py-8">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 shadow-sm"><UserCheck className="w-4 h-4" /></div>
                              <span className="text-[12px] font-black text-slate-700">{v.creator?.full_name || 'System Auto'}</span>
                           </div>
                        </td>

                        <td className="px-10 py-8">
                           <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm ${v.project ? 'bg-blue-50 text-blue-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                 {v.project ? <Building2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                              </div>
                              <span className={`text-[12px] font-black truncate max-w-[180px] ${v.project ? 'text-slate-800' : 'text-slate-500 uppercase italic opacity-60'}`}>
                                 {v.project?.name || 'Pre-Project Discovery'}
                              </span>
                           </div>
                        </td>

                        <td className="px-10 py-8 text-right">
                           <div className="inline-flex p-3 bg-white border border-slate-100 rounded-xl shadow-sm text-slate-300 group-hover:text-blue-600 transition-all group-hover:shadow-md active:scale-90">
                              <ArrowRight className="w-5 h-5" />
                           </div>
                        </td>
                      </tr>
                    );
                  })}
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