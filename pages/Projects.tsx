import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Layers, Search, Plus, RefreshCw, Briefcase, Calendar, 
  Trash2, Edit3, ArrowUpRight, CheckCircle2, X, AlertTriangle,
  Clock, MapPin, User, ChevronDown, Check, UserPlus,
  CalendarDays, FilterX, Hash, Map, Activity, FileSpreadsheet, 
  Download, LayoutGrid, List, Save, UserCheck, Phone, Users2,
  ShieldCheck, Building2, Layout
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Project, Lead, Profile, ProjectStatus } from '../types';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNotification, useUser } from '../App';

type ProjectFilterType = 'All' | 'Upcoming' | 'Running' | 'Complete';

const Projects = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showNotification } = useNotification();
  const { profile } = useUser();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Lead[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectFilterType>('All');
  
  const [activeStatusDropdown, setActiveStatusDropdown] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Lead | null>(null);
  const clientSearchRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    client_id: '',
    status: 'Upcoming' as ProjectStatus,
    budget: 0,
    start_date: new Date().toISOString().split('T')[0],
    description: '',
    assigned_team: [] as string[]
  });

  const statusMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
    const params = new URLSearchParams(location.search);
    if (params.get('new') === 'true') {
      setShowModal(true);
      navigate('/projects', { replace: true });
    }
  }, [location.search]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeStatusDropdown && statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) setActiveStatusDropdown(null);
      if (clientSearchRef.current && !clientSearchRef.current.contains(event.target as Node)) setShowClientDropdown(false);
    };
    const handleScroll = () => { if (activeStatusDropdown) setActiveStatusDropdown(null); };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [activeStatusDropdown]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [projRes, clientRes, staffRes] = await Promise.all([
        supabase.from('projects').select('*, client:leads(*), creator:profiles!created_by(full_name), assignments:project_assignments(profile:profiles(*))').is('deleted_at', null).order('created_at', { ascending: false }),
        supabase.from('leads').select('*').eq('is_client', true).is('deleted_at', null),
        supabase.from('profiles').select('*').is('deleted_at', null).eq('status', 'active')
      ]);
      setProjects(projRes.data || []);
      setClients(clientRes.data || []);
      setStaff(staffRes.data || []);
    } catch (err: any) { console.error(err); } finally { setLoading(false); }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.client_id) {
      showNotification("Please fill required project details.", "warning");
      return;
    }

    setIsSaving(true);
    try {
      const creatorId = profile?.id || (await supabase.auth.getUser()).data.user?.id;
      
      const { data: newProject, error: projectError } = await supabase.from('projects').insert([{
        name: formData.name,
        client_id: formData.client_id,
        status: formData.status,
        budget: formData.budget,
        start_date: formData.start_date,
        description: formData.description,
        created_by: creatorId,
        office_id: profile?.office_id
      }]).select().single();

      if (projectError) throw projectError;

      if (formData.assigned_team.length > 0 && newProject) {
        const assignments = formData.assigned_team.map(pid => ({
          project_id: newProject.id,
          profile_id: pid
        }));
        await supabase.from('project_assignments').insert(assignments);
      }

      showNotification("Architectural design registered.", "success");
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      showNotification("Project Sync Failed: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      client_id: '',
      status: 'Upcoming',
      budget: 0,
      start_date: new Date().toISOString().split('T')[0],
      description: '',
      assigned_team: []
    });
    setClientSearchQuery('');
    setSelectedClient(null);
  };

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.client?.client_name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, search, statusFilter]);

  const getStatusDisplay = (status: ProjectStatus) => {
    switch (status) {
      case 'Upcoming': return { style: 'bg-blue-50 text-blue-700 border-blue-200', icon: <Clock className="w-3.5 h-3.5" /> };
      case 'Running': return { style: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <Activity className="w-3.5 h-3.5" /> };
      case 'Complete': return { style: 'bg-slate-900 text-white border-transparent', icon: <CheckCircle2 className="w-3.5 h-3.5" /> };
      default: return { style: 'bg-slate-50 text-slate-400 border-slate-200', icon: null };
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-48 animate-in fade-in duration-700">
      
      {/* NEW PROJECT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] md:rounded-[48px] p-6 md:p-12 max-w-3xl w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 overflow-y-auto max-h-[90vh] md:max-h-[95vh] no-scrollbar relative">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
            <div className="flex justify-between items-start mb-8 md:mb-10 relative z-10">
              <div>
                <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">New Project</h3>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mt-2">ARCHITECTURAL PORTFOLIO INDUCTION</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 md:p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-red-500 transition-all"><X className="w-5 h-5 md:w-6 md:h-6" /></button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-8 md:space-y-10 relative z-10">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Project Name / Alias</label>
                    <input required className="w-full h-14 md:h-16 px-6 md:px-8 bg-slate-50 border border-slate-100 rounded-[20px] md:rounded-[24px] text-sm font-bold text-slate-700 outline-none focus:bg-white transition-all shadow-inner" placeholder="e.g. Modern Villa Design" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="space-y-3 relative" ref={clientSearchRef}>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Owner / Client</label>
                    <div className="relative group">
                       <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-[#064e3b] transition-colors" />
                       <input 
                         className="w-full h-14 md:h-16 pl-14 pr-6 bg-slate-50 border border-slate-100 rounded-[20px] md:rounded-[24px] text-sm font-bold text-slate-700 outline-none focus:bg-white transition-all shadow-inner" 
                         placeholder="Search validated clients..." 
                         value={clientSearchQuery} 
                         onFocus={() => setShowClientDropdown(true)}
                         onChange={e => { setClientSearchQuery(e.target.value); setShowClientDropdown(true); }}
                       />
                    </div>
                    {showClientDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-100 rounded-[28px] md:rounded-[32px] shadow-2xl z-[250] overflow-hidden max-h-60 overflow-y-auto no-scrollbar py-2">
                        {clients.filter(c => c.client_name.toLowerCase().includes(clientSearchQuery.toLowerCase())).map(c => (
                          <div key={c.id} onClick={() => { setFormData({...formData, client_id: c.id}); setClientSearchQuery(c.client_name); setSelectedClient(c); setShowClientDropdown(false); }} className="p-4 hover:bg-emerald-50 cursor-pointer flex items-center gap-4 border-b border-slate-50 last:border-0"><div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center shrink-0"><User className="w-5 h-5" /></div><div className="min-w-0"><p className="text-[13px] font-black text-slate-900 truncate">{c.client_name}</p><p className="text-[10px] text-slate-400 font-bold uppercase truncate">{c.phone}</p></div></div>
                        ))}
                      </div>
                    )}
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Execution Budget (BDT)</label>
                    <input type="number" className="w-full h-14 md:h-16 px-6 md:px-8 bg-slate-50 border border-slate-100 rounded-[20px] md:rounded-[24px] text-sm font-bold text-slate-700 outline-none focus:bg-white transition-all shadow-inner" placeholder="0" value={formData.budget} onChange={e => setFormData({...formData, budget: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Commencement Date</label>
                    <input required type="date" className="w-full h-14 md:h-16 px-6 md:px-8 bg-slate-50 border border-slate-100 rounded-[20px] md:rounded-[24px] text-sm font-bold text-slate-700 outline-none" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
                  </div>
               </div>

               <div className="space-y-4">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">Design Team Assignment ({formData.assigned_team.length})</label>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 p-3 md:p-4 bg-slate-50 rounded-[20px] md:rounded-[32px] border border-slate-100 max-h-40 md:max-h-48 overflow-y-auto no-scrollbar shadow-inner">
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

               <button type="submit" disabled={isSaving} className="w-full py-6 md:py-8 bg-[#064e3b] text-white rounded-[24px] md:rounded-[32px] text-[10px] md:text-[12px] font-black uppercase tracking-[0.3em] hover:bg-black transition-all flex items-center justify-center gap-4 shadow-2xl active:scale-95 disabled:opacity-50">
                 {isSaving ? <RefreshCw className="w-5 h-5 md:w-6 md:h-6 animate-spin text-emerald-400" /> : <ShieldCheck className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" />} AUTHORIZE PROJECT CREATION
               </button>
            </form>
          </div>
        </div>
      )}

      <div className="sticky top-16 lg:top-0 z-[60] bg-[#f8fafc]/90 backdrop-blur-xl px-4 md:px-10 pt-6 md:pt-10 pb-6 md:pb-8 border-b border-slate-100 shadow-sm">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 md:mb-10">
          <div>
            <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">Project Portfolio</h1>
            <p className="text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-[0.25em] mt-1 opacity-80 flex items-center gap-2"><Layers className="w-3.5 h-3.5 text-emerald-500" /> ARCHITECTURAL REPOSITORY</p>
          </div>
          <button onClick={() => setShowModal(true)} className="w-full md:w-auto px-8 py-4 bg-[#064e3b] text-white rounded-[20px] md:rounded-[24px] text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl active:scale-95 flex items-center justify-center gap-3"><Plus className="w-5 h-5" /> New Project</button>
        </header>

        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 md:gap-6">
          <div className="relative group flex-1">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-[#064e3b] transition-colors" />
            <input type="text" placeholder="Search portfolio..." className="w-full h-12 md:h-16 pl-16 pr-6 bg-white border border-slate-100 rounded-[18px] md:rounded-[28px] text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all shadow-sm" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 bg-white/50 p-1.5 rounded-[20px] md:rounded-[24px] border border-slate-50 w-full md:w-fit overflow-x-auto no-scrollbar pb-1">
            {(['All', 'Upcoming', 'Running', 'Complete'] as ProjectFilterType[]).map(f => (
              <button key={f} onClick={() => setStatusFilter(f)} className={`px-4 md:px-8 py-2.5 md:py-3.5 rounded-[16px] md:rounded-[20px] text-[8px] md:text-[9px] font-black uppercase tracking-[0.1em] transition-all whitespace-nowrap ${statusFilter === f ? 'bg-[#064e3b] text-white shadow-md' : 'text-slate-400 hover:bg-white'}`}>{f}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 md:px-10 mt-6 md:mt-12">
        {loading ? (
          <div className="py-32 flex justify-center"><RefreshCw className="w-10 h-10 text-[#064e3b] animate-spin" /></div>
        ) : filteredProjects.length === 0 ? (
          <div className="py-24 text-center bg-white rounded-[32px] md:rounded-[40px] border border-slate-100 shadow-sm"><Layers className="w-12 h-12 text-slate-100 mx-auto mb-4" /><p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No active designs match filters</p></div>
        ) : (
          <>
            {/* MOBILE GRID VIEW */}
            <div className="grid grid-cols-1 gap-4 lg:hidden">
              {filteredProjects.map((p) => {
                const statusInfo = getStatusDisplay(p.status);
                return (
                  <div key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm active:scale-[0.98] transition-all">
                    <div className="flex justify-between items-start mb-3">
                       <div className="w-9 h-9 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center"><Layers className="w-5 h-5" /></div>
                       <div className={`px-3 py-1 rounded-full text-[7px] font-black uppercase border ${statusInfo.style}`}>{p.status}</div>
                    </div>
                    <h3 className="text-base font-black text-slate-900 leading-tight mb-1">{p.name}</h3>
                    <div className="flex items-center gap-2 mb-4">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-[11px] font-bold text-slate-500">{p.client?.client_name}</span>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                       <div className="flex items-center gap-2">
                          <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest">Added By:</p>
                          <p className="text-[9px] font-bold text-slate-600">{p.creator?.full_name?.split(' ')[0]}</p>
                       </div>
                       <ArrowUpRight className="w-4 h-4 text-slate-300" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DESKTOP TABLE */}
            <div className="hidden lg:block bg-white rounded-[48px] border border-slate-100 shadow-xl shadow-slate-200/5 overflow-hidden">
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left min-w-[1200px] border-separate border-spacing-0">
                  <thead>
                    <tr className="text-slate-400 text-[10px] uppercase font-black tracking-[0.25em]">
                      <th className="px-10 py-7 border-b border-slate-100">Project</th>
                      <th className="px-10 py-7 border-b border-slate-100">Client</th>
                      <th className="px-10 py-7 border-b border-slate-100">Creator</th>
                      <th className="px-10 py-7 border-b border-slate-100">Stage</th>
                      <th className="px-10 py-7 border-b border-slate-100 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredProjects.map((p) => {
                      const statusInfo = getStatusDisplay(p.status);
                      return (
                        <tr key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="hover:bg-slate-50/80 transition-all cursor-pointer group">
                          <td className="px-10 py-8"><div className="flex items-center gap-5"><div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center font-black group-hover:bg-[#064e3b] group-hover:text-white transition-all shadow-sm"><Layers className="w-6 h-6" /></div><div><p className="text-[14px] font-black text-slate-900 transition-colors">{p.name}</p></div></div></td>
                          <td className="px-10 py-8"><div className="flex items-center gap-3"><p className="text-sm font-black text-slate-700">{p.client?.client_name}</p></div></td>
                          <td className="px-10 py-8"><div className="flex items-center gap-3"><p className="text-[12px] font-black text-slate-700">{p.creator?.full_name}</p></div></td>
                          <td className="px-10 py-8"><div className={`inline-flex items-center gap-3 px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm ${statusInfo.style}`}>{statusInfo.icon}{p.status}</div></td>
                          <td className="px-10 py-8 text-right"><div className="inline-flex p-3 bg-white border border-slate-100 rounded-xl shadow-sm text-slate-300 group-hover:text-[#064e3b] group-hover:shadow-md transition-all"><ArrowUpRight className="w-5 h-5" /></div></td>
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
    </div>
  );
};

export default Projects;