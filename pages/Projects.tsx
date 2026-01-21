import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Layers, Search, Plus, RefreshCw, Briefcase, Calendar, 
  Trash2, Edit3, ArrowUpRight, CheckCircle2, X, AlertTriangle,
  Clock, MapPin, User, ChevronDown, Check, UserPlus,
  CalendarDays, FilterX, Hash, Map, Activity, FileSpreadsheet, 
  Download, LayoutGrid, List, Save, UserCheck, Phone, Users2
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Project, Lead, Profile, ProjectStatus } from '../types';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNotification, useUser } from '../App';

type ProjectFilterType = 'All' | 'Upcoming' | 'Running' | 'Complete';
type ViewMode = 'grid' | 'list';

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
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [statusFilter, setStatusFilter] = useState<ProjectFilterType>('All');
  
  const [activeStatusDropdown, setActiveStatusDropdown] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Client Search Autocomplete State
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
    
    // Check for auto-open parameter from Dashboard
    const params = new URLSearchParams(location.search);
    if (params.get('new') === 'true') {
      setShowModal(true);
      // Clean up URL without reload
      navigate('/projects', { replace: true });
    }
  }, [location.search]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeStatusDropdown && statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) {
        setActiveStatusDropdown(null);
      }
      if (clientSearchRef.current && !clientSearchRef.current.contains(event.target as Node)) {
        setShowClientDropdown(false);
      }
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
      
      if (projRes.error) {
        if (projRes.error.code === '42703') {
           showNotification("Database Error: 'office_id' missing. Run SQL in 'supabaseClient.ts'.", "error");
        }
        throw projRes.error;
      }
      if (clientRes.error) throw clientRes.error;
      if (staffRes.error) throw staffRes.error;

      setProjects(projRes.data || []);
      setClients(clientRes.data || []);
      setStaff(staffRes.data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = useMemo(() => {
    if (!clientSearchQuery) return clients.slice(0, 5);
    const q = clientSearchQuery.toLowerCase();
    return clients.filter(c => 
      c.client_name.toLowerCase().includes(q) || 
      c.phone.includes(q)
    ).slice(0, 10);
  }, [clients, clientSearchQuery]);

  const handleSelectClient = (client: Lead) => {
    setSelectedClient(client);
    setFormData({ ...formData, client_id: client.id });
    setClientSearchQuery(client.client_name);
    setShowClientDropdown(false);
  };

  const toggleStaffSelection = (staffId: string) => {
    setFormData(prev => ({
      ...prev,
      assigned_team: prev.assigned_team.includes(staffId)
        ? prev.assigned_team.filter(id => id !== staffId)
        : [...prev.assigned_team, staffId]
    }));
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.client_id) {
      showNotification("Project name and client entity are mandatory.", "warning");
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        name: formData.name,
        client_id: formData.client_id,
        status: formData.status,
        budget: formData.budget,
        start_date: formData.start_date,
        description: formData.description,
        created_by: profile?.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (profile?.office_id) {
        payload.office_id = profile.office_id;
      }

      const { data: newProject, error: projectError } = await supabase.from('projects').insert([payload]).select().single();

      if (projectError) throw projectError;
      
      if (formData.assigned_team.length > 0 && newProject) {
        const assignments = formData.assigned_team.map(profileId => ({
          project_id: newProject.id,
          profile_id: profileId,
          created_at: new Date().toISOString()
        }));
        const { error: assignError } = await supabase.from('project_assignments').insert(assignments);
        if (assignError) throw assignError;
      }

      showNotification("New architectural project initiated & staff assigned.", "success");
      setShowModal(false);
      setFormData({ name: '', client_id: '', status: 'Upcoming', budget: 0, start_date: new Date().toISOString().split('T')[0], description: '', assigned_team: [] });
      setSelectedClient(null);
      setClientSearchQuery('');
      await fetchData();
    } catch (err: any) {
      console.error(err);
      showNotification(`Submission Error: ${err.message}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStatus = async (projectId: string, newStatus: ProjectStatus) => {
    try {
      const { error } = await supabase.from('projects').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', projectId);
      if (error) throw error;
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: newStatus } : p));
      showNotification(`Status updated to ${newStatus}.`, "success");
      setActiveStatusDropdown(null);
    } catch (err: any) {
      showNotification(`Status update failed: ${err.message}`, "error");
    }
  };

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.client?.client_name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, search, statusFilter]);

  const toggleDropdown = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (activeStatusDropdown === projectId) {
      setActiveStatusDropdown(null);
    } else {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 8, left: rect.left });
      setActiveStatusDropdown(projectId);
    }
  };

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
      
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white rounded-[48px] p-8 md:p-14 max-w-3xl w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300 relative my-10">
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#064e3b]/5 blur-[100px] rounded-full pointer-events-none" />
            <div className="flex justify-between items-start mb-12 relative z-10">
              <div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Initiate Project</h3>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mt-2">TECHNICAL ARCHITECTURAL ONBOARDING</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-red-500 transition-all"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleCreateProject} className="space-y-10 relative z-10">
               <div className="space-y-2">
                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Project Identifier</label>
                 <input required className="w-full h-16 px-8 bg-slate-50 border border-slate-100 rounded-[24px] text-[14px] font-bold text-slate-700 outline-none focus:bg-white focus:border-emerald-200 transition-all shadow-inner" placeholder="e.g. Modern duplex architecture..." value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* CLIENT SEARCH SEARCH BAR */}
                  <div className="space-y-2 relative" ref={clientSearchRef}>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Client Entity</label>
                    <div className="relative">
                      <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                      <input 
                        type="text"
                        placeholder="Search by name or phone..."
                        className={`w-full h-16 pl-14 pr-8 bg-slate-50 border rounded-[24px] text-[14px] font-bold text-slate-700 outline-none focus:bg-white transition-all shadow-inner ${selectedClient ? 'border-emerald-500/20 bg-emerald-50/10' : 'border-slate-100'}`}
                        value={clientSearchQuery}
                        onFocus={() => setShowClientDropdown(true)}
                        onChange={(e) => {
                          setClientSearchQuery(e.target.value);
                          setShowClientDropdown(true);
                          if (selectedClient && e.target.value !== selectedClient.client_name) {
                            setSelectedClient(null);
                            setFormData({ ...formData, client_id: '' });
                          }
                        }}
                      />
                      {selectedClient && <CheckCircle2 className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />}
                    </div>

                    {showClientDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-100 rounded-[32px] shadow-2xl z-[250] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="p-3 bg-slate-50/50 border-b border-slate-50 flex items-center justify-between">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">VALIDATED PORTFOLIO</span>
                        </div>
                        <div className="max-h-60 overflow-y-auto no-scrollbar py-2">
                          {filteredClients.length === 0 ? (
                            <div className="py-8 text-center text-slate-300 text-[10px] font-black uppercase tracking-widest">No client records found</div>
                          ) : (
                            filteredClients.map(c => (
                              <div 
                                key={c.id} 
                                onClick={() => handleSelectClient(c)}
                                className={`flex items-center justify-between p-4 hover:bg-emerald-50 cursor-pointer transition-colors group ${formData.client_id === c.id ? 'bg-emerald-50' : ''}`}
                              >
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-white border border-slate-100 text-slate-400 rounded-xl flex items-center justify-center font-black group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                    {c.client_name.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="text-[13px] font-black text-slate-900">{c.client_name}</p>
                                    <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5"><Phone className="w-3 h-3" /> {c.phone}</p>
                                  </div>
                                </div>
                                {formData.client_id === c.id && <Check className="w-4 h-4 text-emerald-600" />}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Lifecycle Stage</label>
                    <div className="relative">
                      <select className="w-full h-16 px-8 bg-slate-50 border border-slate-100 rounded-[24px] text-[14px] font-bold text-slate-700 outline-none focus:bg-white transition-all appearance-none cursor-pointer" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as ProjectStatus})}>
                        <option value="Upcoming">Upcoming</option>
                        <option value="Running">Running</option>
                        <option value="Complete">Complete</option>
                      </select>
                      <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                    </div>
                  </div>
               </div>

               {/* TEAM ASSIGNMENT GRID */}
               <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Users2 className="w-3 h-3" /> Assign Firm Personnel
                    </label>
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{formData.assigned_team.length} Selected</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-[32px] border border-slate-100 max-h-64 overflow-y-auto no-scrollbar">
                    {staff.map(member => {
                      const isSelected = formData.assigned_team.includes(member.id);
                      return (
                        <button 
                          key={member.id} 
                          type="button" 
                          onClick={() => toggleStaffSelection(member.id)}
                          className={`flex items-center gap-3 p-3 rounded-2xl border transition-all text-left group/staff ${isSelected ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-600 hover:border-emerald-200'}`}
                        >
                          <img 
                            src={member.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.full_name}`} 
                            className="w-10 h-10 rounded-xl bg-white p-0.5 object-cover shrink-0" 
                            alt={member.full_name} 
                          />
                          <div className="min-w-0">
                            <p className="text-[11px] font-black truncate">{member.full_name}</p>
                            <p className={`text-[8px] font-bold uppercase tracking-tight truncate ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                              {member.designation || 'Staff'}
                            </p>
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0 ml-auto" />}
                        </button>
                      );
                    })}
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Allocated Budget (BDT)</label>
                    <input type="number" className="w-full h-16 px-8 bg-slate-50 border border-slate-100 rounded-[24px] text-[14px] font-bold text-emerald-700 outline-none focus:bg-white transition-all shadow-inner" value={formData.budget} onChange={e => setFormData({...formData, budget: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Commencement Date</label>
                    <input type="date" className="w-full h-16 px-8 bg-slate-50 border border-slate-100 rounded-[24px] text-[14px] font-bold text-slate-700 outline-none focus:bg-white transition-all" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
                  </div>
               </div>
               <button type="submit" disabled={isSaving} className="w-full py-8 bg-[#064e3b] text-white rounded-[32px] text-[12px] font-black uppercase tracking-[0.3em] hover:bg-black transition-all flex items-center justify-center gap-4 shadow-2xl active:scale-95 disabled:opacity-50">
                 {isSaving ? <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" /> : <Save className="w-6 h-6 text-emerald-400" />} Synchronize Project Vault
               </button>
            </form>
          </div>
        </div>
      )}

      <div className="sticky top-16 lg:top-0 z-[60] bg-[#f8fafc]/90 backdrop-blur-xl px-6 md:px-10 pt-12 pb-8 border-b border-slate-100 shadow-sm">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-10">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Project Portfolio</h1>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em] mt-2 opacity-80">CENTRALIZED ARCHITECTURAL REPOSITORY</p>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')} className="p-4 bg-white border border-slate-200 text-slate-400 rounded-2xl hover:bg-slate-50 transition-all shadow-sm">
              {viewMode === 'list' ? <LayoutGrid className="w-6 h-6" /> : <List className="w-6 h-6" />}
            </button>
            <button onClick={() => setShowModal(true)} className="flex-1 sm:flex-none px-8 py-5 bg-[#064e3b] text-white rounded-[24px] text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-emerald-900/20 active:scale-95 transition-all flex items-center justify-center gap-3">
              <Plus className="w-5 h-5" /> New Project
            </button>
          </div>
        </header>
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-6">
          <div className="relative group flex-1">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-[#064e3b] transition-colors" />
            <input type="text" placeholder="Search project name or client..." className="w-full h-16 pl-16 pr-6 bg-white border border-slate-100 rounded-[28px] text-[13px] font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all shadow-sm" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 bg-white/50 p-2 rounded-[32px] border border-slate-50 w-fit shrink-0">
            {(['All', 'Upcoming', 'Running', 'Complete'] as ProjectFilterType[]).map(f => (
              <button key={f} onClick={() => setStatusFilter(f)} className={`px-8 py-4 rounded-[24px] text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${statusFilter === f ? 'bg-[#064e3b] text-white shadow-xl' : 'text-slate-400 hover:bg-white hover:text-slate-600'}`}>{f}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-6 md:px-10 mt-12">
        {loading ? (
          <div className="py-32 flex justify-center"><RefreshCw className="w-12 h-12 text-[#064e3b] animate-spin" /></div>
        ) : (
          <div className="bg-white rounded-[48px] border border-slate-100 shadow-xl shadow-slate-200/5 overflow-hidden">
            <div className="overflow-x-auto no-scrollbar max-h-[calc(100vh-320px)] overflow-y-auto">
              <table className="w-full text-left min-w-[1200px] border-separate border-spacing-0">
                <thead className="sticky top-0 z-[40]">
                  <tr className="bg-white text-slate-400 text-[10px] uppercase font-black tracking-[0.25em]">
                    <th className="px-10 py-7 border-b border-slate-100 bg-white">Architectural Project</th>
                    <th className="px-10 py-7 border-b border-slate-100 bg-white">Client Entity</th>
                    <th className="px-10 py-7 border-b border-slate-100 bg-white">Added By</th>
                    <th className="px-10 py-7 border-b border-slate-100 bg-white">Lifecycle Stage</th>
                    <th className="px-10 py-7 border-b border-slate-100 bg-white text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredProjects.length === 0 ? (
                    <tr><td colSpan={5} className="py-24 text-center text-slate-300 font-black tracking-widest uppercase text-[11px]">No active projects found in portfolio</td></tr>
                  ) : filteredProjects.map((p) => {
                    const statusInfo = getStatusDisplay(p.status);
                    const isDropdownActive = activeStatusDropdown === p.id;
                    return (
                      <tr key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="hover:bg-slate-50/80 transition-all cursor-pointer group">
                        <td className="px-10 py-8">
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center font-black group-hover:bg-[#064e3b] group-hover:text-white transition-all shadow-sm">
                              <Layers className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="text-[14px] font-black text-slate-900 group-hover:text-[#064e3b] transition-colors">{p.name}</p>
                              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Ref: {p.id.slice(0, 8).toUpperCase()}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-8">
                           <div className="flex items-center gap-3">
                              <img className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100" src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.client?.client_name}`} alt={p.client?.client_name} />
                              <p className="text-sm font-black text-slate-700">{p.client?.client_name}</p>
                           </div>
                        </td>
                        <td className="px-10 py-8">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-[#064e3b] group-hover:text-white transition-all shadow-sm">
                                <UserCheck className="w-4 h-4" />
                              </div>
                              <p className="text-[12px] font-black text-slate-700">{p.creator?.full_name || 'System'}</p>
                           </div>
                        </td>
                        <td className="px-10 py-8">
                          <div className="relative">
                            <button onClick={(e) => toggleDropdown(e, p.id)} className={`flex items-center gap-3 px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm transition-all active:scale-95 ${statusInfo.style}`}>
                               {statusInfo.icon}{p.status}<ChevronDown className={`w-3.5 h-3.5 opacity-50 transition-transform ${isDropdownActive ? 'rotate-180' : ''}`} />
                            </button>
                            {isDropdownActive && (
                              <div ref={statusMenuRef} className="fixed min-w-[200px] bg-white border border-slate-100 rounded-[28px] shadow-2xl z-[200] overflow-hidden animate-in fade-in zoom-in-95 duration-200" style={{ top: dropdownPos.top, left: dropdownPos.left }}>
                                <div className="p-3 space-y-1">
                                  {(['Upcoming', 'Running', 'Complete'] as ProjectStatus[]).map(s => (
                                    <button key={s} onClick={(e) => { e.stopPropagation(); handleUpdateStatus(p.id, s); }} className={`w-full text-left px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-between group ${p.status === s ? 'bg-[#064e3b] text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}`}>
                                      {s}{p.status === s && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-10 py-8 text-right">
                           <div className="inline-flex p-3 bg-white border border-slate-100 rounded-xl shadow-sm text-slate-300 group-hover:text-[#064e3b] transition-all group-hover:shadow-md">
                            <ArrowUpRight className="w-5 h-5" />
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

export default Projects;