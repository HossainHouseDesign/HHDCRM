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
    <div className="min-h-screen bg-slate-50/50 pb-20 animate-in fade-in duration-500">
      
      {/* NEW PROJECT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-2xl w-full shadow-2xl border border-slate-200 animate-in zoom-in-95 overflow-y-auto max-h-[90vh] no-scrollbar relative">
            <div className="flex justify-between items-start mb-6 border-b border-slate-50 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">New Project</h3>
                <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mt-1">Induction Portfolio</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 bg-slate-50 text-slate-400 rounded-lg hover:text-red-500 transition-all"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest ml-1">Project Name</label>
                    <input required className="w-full h-10 px-4 bg-slate-50 border border-slate-100 rounded-lg text-[13px] font-medium text-slate-700 outline-none focus:bg-white transition-all shadow-none" placeholder="e.g. Modern Villa Design" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="space-y-1.5 relative" ref={clientSearchRef}>
                    <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest ml-1">Client</label>
                    <div className="relative group">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-300" />
                       <input 
                         className="w-full h-10 pl-9 pr-4 bg-slate-50 border border-slate-100 rounded-lg text-[13px] font-medium text-slate-700 outline-none focus:bg-white transition-all shadow-none" 
                         placeholder="Search clients..." 
                         value={clientSearchQuery} 
                         onFocus={() => setShowClientDropdown(true)}
                         onChange={e => { setClientSearchQuery(e.target.value); setShowClientDropdown(true); }}
                       />
                    </div>
                    {showClientDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-[250] overflow-hidden max-h-48 overflow-y-auto no-scrollbar py-1">
                        {clients.filter(c => c.client_name.toLowerCase().includes(clientSearchQuery.toLowerCase())).map(c => (
                          <div key={c.id} onClick={() => { setFormData({...formData, client_id: c.id}); setClientSearchQuery(c.client_name); setSelectedClient(c); setShowClientDropdown(false); }} className="px-3 py-2 hover:bg-emerald-50 cursor-pointer flex items-center gap-3 border-b border-slate-50 last:border-0"><div className="w-7 h-7 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center shrink-0"><User className="w-4 h-4" /></div><div className="min-w-0"><p className="text-[12px] font-bold text-slate-900 truncate">{c.client_name}</p><p className="text-[9px] text-slate-400 font-bold uppercase truncate">{c.phone}</p></div></div>
                        ))}
                      </div>
                    )}
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest ml-1">Budget (BDT)</label>
                    <input type="number" className="w-full h-10 px-4 bg-slate-50 border border-slate-100 rounded-lg text-[13px] font-medium text-slate-700 outline-none focus:bg-white transition-all shadow-none" placeholder="0" value={formData.budget} onChange={e => setFormData({...formData, budget: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest ml-1">Start Date</label>
                    <input required type="date" className="w-full h-10 px-4 bg-slate-50 border border-slate-100 rounded-lg text-[13px] font-medium text-slate-700 outline-none" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Team Assignment ({formData.assigned_team.length})</label>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-100 max-h-36 overflow-y-auto no-scrollbar">
                     {staff.map(s => {
                       const active = formData.assigned_team.includes(s.id);
                       return (
                         <button key={s.id} type="button" onClick={() => setFormData(prev => ({ ...prev, assigned_team: active ? prev.assigned_team.filter(i => i !== s.id) : [...prev.assigned_team, s.id] }))} className={`flex items-center gap-2 p-1.5 rounded-lg border transition-all text-left ${active ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300'}`}>
                            <img src={s.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.email}`} className="w-6 h-6 rounded bg-slate-100 object-cover shrink-0" alt={s.full_name} />
                            <p className="text-[9px] font-bold truncate leading-none">{s.full_name}</p>
                         </button>
                       );
                     })}
                  </div>
               </div>

               <button type="submit" disabled={isSaving} className="w-full h-12 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-3 shadow-lg active:scale-95 disabled:opacity-50">
                 {isSaving ? <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> : <ShieldCheck className="w-4 h-4 text-emerald-400" />} Register Project
               </button>
            </form>
          </div>
        </div>
      )}

      <div className="sticky top-14 lg:top-0 z-[60] bg-white px-4 py-2 border-b border-slate-100 leading-none">
        <header className="flex flex-row justify-between items-center gap-4 mb-2 leading-none">
          <div className="leading-none">
            <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none uppercase">Project Vault</h1>
            <p className="text-slate-300 text-[7px] font-black uppercase tracking-widest mt-1.5 flex items-center gap-1.5 leading-none opacity-80"><Layers className="w-3 h-3 text-slate-900" /> MASTER REPOSITORY</p>
          </div>
          <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-none active:scale-95 flex items-center justify-center gap-2 leading-none transition-all hover:bg-black"><Plus className="w-3 h-3" /> Project</button>
        </header>

        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2 leading-none">
          <div className="relative group flex-1 leading-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-300" />
            <input type="text" placeholder="Search portfolio..." className="w-full h-7 pl-9 pr-4 bg-slate-50 border border-slate-100 rounded-lg text-[11px] font-bold text-slate-700 outline-none focus:bg-white transition-all shadow-none leading-none" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg shrink-0 overflow-x-auto no-scrollbar leading-none">
            {(['All', 'Upcoming', 'Running', 'Complete'] as ProjectFilterType[]).map(f => (
              <button key={f} onClick={() => setStatusFilter(f)} className={`px-4 py-1.5 rounded-md text-[7px] font-black uppercase tracking-wider transition-all whitespace-nowrap leading-none ${statusFilter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{f}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 mt-4">
        {loading ? (
          <div className="py-32 flex justify-center"><RefreshCw className="w-10 h-10 text-emerald-900 animate-spin" /></div>
        ) : filteredProjects.length === 0 ? (
          <div className="py-24 text-center bg-white rounded-xl border border-slate-100 shadow-none grayscale opacity-50"><Layers className="w-10 h-10 text-slate-100 mx-auto mb-4" /><p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Repository Empty</p></div>
        ) : (
          <>
            {/* MOBILE GRID VIEW */}
            <div className="grid grid-cols-1 gap-4 lg:hidden">
              {filteredProjects.map((p) => {
                const statusInfo = getStatusDisplay(p.status);
                return (
                  <div key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm active:scale-[0.98] transition-all">
                    <div className="flex justify-between items-start mb-2">
                       <div className="w-8 h-8 bg-slate-50 text-slate-300 rounded-lg flex items-center justify-center"><Layers className="w-4 h-4" /></div>
                       <div className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase border ${statusInfo.style}`}>{p.status}</div>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 leading-tight mb-1 uppercase tracking-tight">{p.name}</h3>
                    <div className="flex items-center gap-2 mb-3">
                      <UserCheck className="w-3 h-3 text-emerald-500" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase">{p.client?.client_name}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                       <div className="flex items-center gap-1.5">
                          <p className="text-[7px] font-bold text-slate-300 uppercase tracking-widest leading-none">Initiator:</p>
                          <p className="text-[8px] font-bold text-slate-600 uppercase leading-none">{p.creator?.full_name?.split(' ')[0]}</p>
                       </div>
                       <ArrowUpRight className="w-3.5 h-3.5 text-slate-200" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DESKTOP TABLE */}
            <div className="hidden lg:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-12">
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left border-separate border-spacing-0">
                  <thead className="bg-slate-50/50">
                    <tr className="text-slate-400 text-[8px] uppercase font-bold tracking-widest leading-none">
                      <th className="px-5 py-2.5 border-b border-slate-100">Design Entity</th>
                      <th className="px-5 py-2.5 border-b border-slate-100">Owner</th>
                      <th className="px-5 py-2.5 border-b border-slate-100">Initiator</th>
                      <th className="px-5 py-2.5 border-b border-slate-100 text-center">Status</th>
                      <th className="px-5 py-2.5 border-b border-slate-100 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProjects.map((p) => {
                      const statusInfo = getStatusDisplay(p.status);
                      return (
                        <tr key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="hover:bg-slate-50/30 transition-all cursor-pointer group">
                          <td className="px-5 py-2">
                             <div className="flex items-center gap-3">
                               <div className="w-7 h-7 bg-slate-50 text-slate-200 rounded-lg flex items-center justify-center font-black group-hover:bg-slate-900 group-hover:text-white transition-all shadow-none"><Layers className="w-3.5 h-3.5" /></div>
                               <div>
                                 <p className="text-[13px] font-bold text-slate-900 leading-none uppercase tracking-tight">{p.name}</p>
                                 <p className="text-[7px] font-bold text-slate-300 uppercase leading-none mt-1">REF: #{p.id.slice(0,6).toUpperCase()}</p>
                               </div>
                             </div>
                          </td>
                          <td className="px-5 py-2"><p className="text-[12px] font-bold text-slate-700 leading-none uppercase">{p.client?.client_name}</p></td>
                          <td className="px-5 py-2"><p className="text-[11px] font-bold text-slate-500 leading-none uppercase">{p.creator?.full_name?.split(' ')[0] || 'Staff'}</p></td>
                          <td className="px-5 py-2 text-center">
                            <div className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest border transition-all ${statusInfo.style}`}>
                              {statusInfo.icon && React.cloneElement(statusInfo.icon as React.ReactElement, { className: 'w-2 h-2' })}
                              {p.status}
                            </div>
                          </td>
                          <td className="px-5 py-2 text-right"><div className="inline-flex p-1.5 text-slate-100 group-hover:text-slate-900 transition-all"><ArrowUpRight className="w-3 h-3" /></div></td>
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