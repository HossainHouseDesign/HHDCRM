
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Layers, Search, Plus, RefreshCw, ChevronRight, 
  Briefcase, Calendar, Users, Filter, Trash2, 
  Edit3, ArrowUpRight, CheckCircle2, X, AlertTriangle,
  Clock, MapPin, User, ChevronDown, Check, UserPlus,
  CalendarDays, FilterX, Hash, Map, Activity, FileSpreadsheet, Download
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Project, Lead, Profile, ProjectStatus } from '../types';
import { useNavigate } from 'react-router-dom';

type ProjectFilterType = 'All' | 'Upcoming' | 'Running' | 'Complete';
type TimeFilterType = 'All Time' | 'Daily' | 'Weekly' | 'Monthly' | 'Yearly' | 'Custom';

const Projects = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Lead[]>([]);
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Filtering States
  const [statusFilter, setStatusFilter] = useState<ProjectFilterType>('All');
  const [timeFilter, setTimeFilter] = useState<TimeFilterType>('All Time');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  
  // Modal & Dropdown State
  const [showModal, setShowModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isEditing, setIsEditing] = useState<Project | null>(null);
  const [activeStatusDropdown, setActiveStatusDropdown] = useState<string | null>(null);
  
  // Report Generation State
  const [reportConfig, setReportConfig] = useState({
    status: 'All' as ProjectFilterType,
    start: '',
    end: ''
  });

  const [formData, setFormData] = useState({
    name: '',
    client_id: '',
    status: 'Upcoming' as ProjectStatus,
    budget: 0,
    start_date: new Date().toISOString().split('T')[0],
    description: '',
    assigned_team: [] as string[]
  });

  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsClientDropdownOpen(false);
      }
      if (activeStatusDropdown) setActiveStatusDropdown(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeStatusDropdown]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [projRes, clientRes, teamRes] = await Promise.all([
        supabase.from('projects')
          .select('*, client:leads(*), assignments:project_assignments(profile:profiles(*))')
          .is('deleted_at', null)
          .order('created_at', { ascending: false }),
        supabase.from('leads').select('*').eq('is_client', true).is('deleted_at', null),
        supabase.from('profiles').select('*').is('deleted_at', null).eq('status', 'active')
      ]);

      setProjects(projRes.data || []);
      setClients(clientRes.data || []);
      setTeamMembers(teamRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (projectId: string, newStatus: ProjectStatus) => {
    try {
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: newStatus } : p));
      const { error } = await supabase
        .from('projects')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', projectId);
      if (error) throw error;
      setActiveStatusDropdown(null);
    } catch (err: any) {
      alert("Status update failed: " + err.message);
      fetchData();
    }
  };

  const handleOpenModal = (project?: Project) => {
    if (project) {
      setIsEditing(project);
      setFormData({
        name: project.name,
        client_id: project.client_id,
        status: project.status,
        budget: project.budget,
        start_date: project.start_date,
        description: project.description || '',
        assigned_team: project.assignments?.map(a => (a.profile as Profile).id) || []
      });
      setClientSearchQuery(project.client?.client_name || '');
    } else {
      setIsEditing(null);
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
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_id) return alert("Select a Project Owner.");
    setLoading(true);
    try {
      let projectId = isEditing?.id;
      const projectPayload = {
        name: formData.name,
        client_id: formData.client_id,
        status: formData.status,
        budget: formData.budget,
        start_date: formData.start_date,
        description: formData.description,
        updated_at: new Date().toISOString()
      };

      if (isEditing) {
        await supabase.from('projects').update(projectPayload).eq('id', isEditing.id);
      } else {
        const { data, error } = await supabase.from('projects').insert([projectPayload]).select();
        if (error) throw error;
        projectId = data[0].id;
      }

      if (projectId) {
        await supabase.from('project_assignments').delete().eq('project_id', projectId);
        if (formData.assigned_team.length > 0) {
          const assignments = formData.assigned_team.map(profileId => ({ project_id: projectId, profile_id: profileId }));
          await supabase.from('project_assignments').insert(assignments);
        }
      }
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Move project to Archive?')) return;
    try {
      await supabase.from('projects').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      fetchData();
    } catch (err) {
      alert('Delete failed');
    }
  };

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                           p.client?.client_name.toLowerCase().includes(search.toLowerCase());
      
      const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
      
      let matchesTime = true;
      const projectDate = new Date(p.created_at);
      const now = new Date();
      
      if (timeFilter === 'Daily') {
        matchesTime = projectDate.toDateString() === now.toDateString();
      } else if (timeFilter === 'Weekly') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        matchesTime = projectDate >= weekAgo;
      } else if (timeFilter === 'Monthly') {
        const monthAgo = new Date();
        monthAgo.setMonth(now.getMonth() - 1);
        matchesTime = projectDate >= monthAgo;
      } else if (timeFilter === 'Yearly') {
        const yearAgo = new Date();
        yearAgo.setFullYear(now.getFullYear() - 1);
        matchesTime = projectDate >= yearAgo;
      } else if (timeFilter === 'Custom' && customDateRange.start && customDateRange.end) {
        const start = new Date(customDateRange.start);
        const end = new Date(customDateRange.end);
        end.setHours(23, 59, 59, 999);
        matchesTime = projectDate >= start && projectDate <= end;
      }

      return matchesSearch && matchesStatus && matchesTime;
    });
  }, [projects, search, statusFilter, timeFilter, customDateRange]);

  const generateCSV = () => {
    const reportData = projects.filter(p => {
      const matchesStatus = reportConfig.status === 'All' || p.status === reportConfig.status;
      let matchesDate = true;
      if (reportConfig.start && reportConfig.end) {
        const projectDate = new Date(p.created_at);
        const start = new Date(reportConfig.start);
        const end = new Date(reportConfig.end);
        end.setHours(23, 59, 59);
        matchesDate = projectDate >= start && projectDate <= end;
      }
      return matchesStatus && matchesDate;
    });

    if (reportData.length === 0) {
      alert("No projects found for the selected criteria.");
      return;
    }

    const headers = ["Client Name", "Project Name", "Status", "Budget (BDT)", "Start Date", "District", "Upazila"];
    const rows = reportData.map(p => [
      p.client?.client_name || 'N/A',
      p.name,
      p.status,
      p.budget,
      p.start_date,
      p.client?.address || 'N/A',
      p.client?.upazila || 'N/A'
    ]);

    const csvContent = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `archlead_projects_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowReportModal(false);
  };

  const getStatusDisplay = (status: ProjectStatus) => {
    switch (status) {
      case 'Upcoming': 
        return {
          style: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: <Clock className="w-3.5 h-3.5" />
        };
      case 'Running': 
        return {
          style: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: <Activity className="w-3.5 h-3.5" />
        };
      case 'Complete': 
        return {
          style: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: <CheckCircle2 className="w-3.5 h-3.5" />
        };
      default: 
        return {
          style: 'bg-slate-50 text-slate-400 border-slate-200',
          icon: null
        };
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-32 animate-in fade-in duration-700">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 pt-12 space-y-12">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Project Portfolio</h1>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em] mt-2 opacity-80">CENTRALIZED ARCHITECTURAL REPOSITORY</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowReportModal(true)}
              className="px-8 py-4 bg-white border border-slate-200 text-slate-600 rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] shadow-sm hover:bg-slate-50 transition-all flex items-center gap-3"
            >
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" /> Export Report
            </button>
            <button 
              onClick={() => handleOpenModal()}
              className="px-8 py-4 bg-[#064e3b] text-white rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-emerald-900/20 active:scale-95 transition-all flex items-center gap-3"
            >
              <Plus className="w-5 h-5" /> Initiate New Project
            </button>
          </div>
        </header>

        {/* Filter Controls */}
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-6">
            <div className="relative group flex-1">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-[#064e3b] transition-colors" />
              <input 
                type="text" 
                placeholder="Search project name or client..."
                className="w-full h-16 pl-16 pr-6 bg-white border border-slate-100 rounded-[28px] text-[13px] font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all shadow-sm"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 bg-white/50 p-2 rounded-[32px] border border-slate-50 w-fit shrink-0">
              {(['All', 'Upcoming', 'Running', 'Complete'] as ProjectFilterType[]).map(f => (
                <button 
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-8 py-4 rounded-[24px] text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${statusFilter === f ? 'bg-[#064e3b] text-white shadow-xl shadow-emerald-900/10' : 'text-slate-400 hover:bg-white hover:text-slate-600'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
             <div className="flex items-center gap-2 bg-white/50 p-2 rounded-[32px] border border-slate-50 w-fit shrink-0 overflow-x-auto no-scrollbar">
                {(['All Time', 'Daily', 'Weekly', 'Monthly', 'Yearly', 'Custom'] as TimeFilterType[]).map(f => (
                  <button 
                    key={f}
                    onClick={() => setTimeFilter(f)}
                    className={`px-6 py-3.5 rounded-[22px] text-[9px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${timeFilter === f ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-white hover:text-slate-600'}`}
                  >
                    {f}
                  </button>
                ))}
             </div>

             {timeFilter === 'Custom' && (
                <div className="flex items-center gap-3 px-6 py-2 bg-white border border-slate-100 rounded-[24px] animate-in fade-in slide-in-from-left-4 shadow-sm">
                  <CalendarDays className="w-4 h-4 text-slate-300" />
                  <input type="date" className="bg-transparent text-[10px] font-bold text-slate-700 outline-none" value={customDateRange.start} onChange={e => setCustomDateRange({...customDateRange, start: e.target.value})} />
                  <span className="text-slate-200">—</span>
                  <input type="date" className="bg-transparent text-[10px] font-bold text-slate-700 outline-none" value={customDateRange.end} onChange={e => setCustomDateRange({...customDateRange, end: e.target.value})} />
                </div>
             )}

             {(statusFilter !== 'All' || timeFilter !== 'All Time') && (
                <button 
                  onClick={() => { setStatusFilter('All'); setTimeFilter('All Time'); setSearch(''); }}
                  className="flex items-center gap-2 px-6 py-4 rounded-[24px] text-[9px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 transition-all"
                >
                  <FilterX className="w-4 h-4" /> Reset Filters
                </button>
             )}
          </div>
        </div>

        {/* Project List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {loading ? (
             Array(6).fill(0).map((_, i) => <div key={i} className="h-80 bg-white rounded-[56px] animate-pulse border border-slate-100" />)
          ) : filteredProjects.map((p) => {
            const statusInfo = getStatusDisplay(p.status);
            return (
              <div 
                key={p.id} 
                onClick={() => navigate(`/projects/${p.id}`)}
                className="bg-white p-10 rounded-[56px] border border-slate-100 shadow-xl shadow-slate-200/20 hover:shadow-2xl transition-all group hover:translate-y-[-4px] flex flex-col justify-between relative cursor-pointer"
              >
                <div className="absolute top-0 right-0 p-8 flex gap-2 z-10" onClick={(e) => e.stopPropagation()}>
                   <button onClick={() => handleOpenModal(p)} className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 transition-all shadow-sm"><Edit3 className="w-4 h-4" /></button>
                   <button onClick={() => handleDelete(p.id)} className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition-all shadow-sm"><Trash2 className="w-4 h-4" /></button>
                </div>
                
                <div className="space-y-6">
                  <div className={`flex items-center gap-2 px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border w-fit shadow-sm ${statusInfo.style}`}>
                     {statusInfo.icon}
                     {p.status}
                  </div>
                  
                  <div className="space-y-2">
                     <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-tight group-hover:text-emerald-700 transition-colors">{p.name}</h3>
                     <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center font-black text-xs uppercase">
                          {p.client?.client_name.charAt(0)}
                        </div>
                        <p className="text-sm font-black text-slate-500">{p.client?.client_name || 'Individual Client'}</p>
                     </div>
                  </div>

                  <div className="space-y-4 pt-4">
                     <div className="flex items-center gap-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                        <MapPin className="w-4 h-4 text-emerald-500" />
                        <div>
                           <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Site Location</p>
                           <p className="text-[12px] font-bold text-slate-700 leading-tight">
                              {p.client?.address}, {p.client?.upazila}
                           </p>
                        </div>
                     </div>
                     
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-slate-300" />
                          <p className="text-[11px] font-bold text-slate-500">
                             Created {new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <div className="flex -space-x-3">
                           {p.assignments?.map((a, i) => (
                              <img 
                                key={i} 
                                title={(a.profile as Profile).full_name} 
                                className="w-8 h-8 rounded-full ring-4 ring-white shadow-sm bg-white" 
                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${(a.profile as Profile).full_name}`} 
                              />
                           ))}
                           {(!p.assignments || p.assignments.length === 0) && (
                              <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center"><User className="w-3.5 h-3.5 text-slate-200" /></div>
                           )}
                        </div>
                     </div>
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-slate-50 flex items-center justify-between">
                   <div>
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Architectural Budget</p>
                      <p className="text-base font-black text-slate-900">Tk. {p.budget?.toLocaleString()}</p>
                   </div>
                   <div className="w-12 h-12 rounded-2xl border border-slate-100 flex items-center justify-center bg-slate-50 group-hover:bg-[#064e3b] group-hover:text-white transition-all shadow-sm">
                      <ArrowUpRight className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                   </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Report Export Modal */}
        {showReportModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-xl animate-in fade-in duration-300">
             <div className="bg-white rounded-[56px] p-10 md:p-14 max-w-xl w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300 relative">
                <div className="flex justify-between items-start mb-14">
                   <div>
                      <h3 className="text-4xl font-black text-slate-900 tracking-tight">Export Workspace Report</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-3">COMPILING PORTFOLIO ANALYTICS</p>
                   </div>
                   <button onClick={() => setShowReportModal(false)} className="p-4 bg-slate-50 text-slate-400 rounded-[20px] hover:text-red-500 hover:bg-red-50 transition-all"><X className="w-6 h-6" /></button>
                </div>

                <div className="space-y-10">
                   <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Project Lifecycle Stage</label>
                      <div className="grid grid-cols-2 gap-3">
                         {(['All', 'Upcoming', 'Running', 'Complete'] as ProjectFilterType[]).map(s => (
                           <button 
                             key={s} 
                             onClick={() => setReportConfig({...reportConfig, status: s})}
                             className={`py-4 rounded-[20px] text-[10px] font-black uppercase tracking-widest border transition-all ${reportConfig.status === s ? 'bg-slate-900 text-white border-transparent' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}
                           >
                              {s}
                           </button>
                         ))}
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Range Start</label>
                        <input type="date" className="w-full h-16 px-6 bg-slate-50 border-transparent rounded-[24px] text-[12px] font-bold text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/5 transition-all" value={reportConfig.start} onChange={e => setReportConfig({...reportConfig, start: e.target.value})} />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Range End</label>
                        <input type="date" className="w-full h-16 px-6 bg-slate-50 border-transparent rounded-[24px] text-[12px] font-bold text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/5 transition-all" value={reportConfig.end} onChange={e => setReportConfig({...reportConfig, end: e.target.value})} />
                      </div>
                   </div>

                   <div className="bg-emerald-50 rounded-[32px] p-6 flex items-center justify-between border border-emerald-100">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg"><Activity className="w-5 h-5" /></div>
                        <p className="text-[10px] font-black text-emerald-900 uppercase tracking-widest">Live Export Preview</p>
                      </div>
                      <p className="text-sm font-black text-emerald-600">
                        {projects.filter(p => {
                          const matchesStatus = reportConfig.status === 'All' || p.status === reportConfig.status;
                          let matchesDate = true;
                          if (reportConfig.start && reportConfig.end) {
                            const projectDate = new Date(p.created_at);
                            const start = new Date(reportConfig.start);
                            const end = new Date(reportConfig.end);
                            end.setHours(23, 59, 59);
                            matchesDate = projectDate >= start && projectDate <= end;
                          }
                          return matchesStatus && matchesDate;
                        }).length} Records
                      </p>
                   </div>

                   <button 
                     onClick={generateCSV}
                     className="w-full py-8 bg-[#064e3b] text-white rounded-[28px] font-black uppercase tracking-[0.3em] text-[12px] shadow-2xl shadow-emerald-900/40 hover:bg-black transition-all flex items-center justify-center gap-4 group"
                   >
                     <Download className="w-6 h-6 text-emerald-400 group-hover:translate-y-1 transition-transform" />
                     Download Portfolio CSV
                   </button>
                </div>
             </div>
          </div>
        )}

        {/* Project Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-xl animate-in fade-in duration-300 overflow-y-auto">
             <div className="bg-white rounded-[56px] p-10 md:p-14 max-w-2xl w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300 my-10 relative">
                <div className="flex justify-between items-start mb-14">
                   <div>
                      <h3 className="text-4xl font-black text-slate-900 tracking-tight">{isEditing ? 'Refine Project' : 'New Project Draft'}</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-3">TECHNICAL PARAMETERS & TEAM SYNC</p>
                   </div>
                   <button onClick={() => setShowModal(false)} className="p-4 bg-slate-50 text-slate-400 rounded-[20px] hover:text-red-500 hover:bg-red-50 transition-all"><X className="w-6 h-6" /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-12">
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Project Identity</label>
                      <input required className="w-full h-20 px-8 bg-slate-50 border-transparent rounded-[28px] text-[14px] font-bold text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/5 transition-all shadow-inner" placeholder="e.g. Modern duplex in Gulshan" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-3 relative" ref={dropdownRef}>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Select Project Owner</label>
                        <div className="relative group">
                          <input required autoComplete="off" className="w-full h-20 px-8 pr-14 bg-slate-50 border-transparent rounded-[28px] text-[14px] font-bold text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/5 transition-all shadow-inner" placeholder="Type client..." value={clientSearchQuery} onFocus={() => setIsClientDropdownOpen(true)} onChange={e => { setClientSearchQuery(e.target.value); setIsClientDropdownOpen(true); if (!e.target.value) setFormData({...formData, client_id: ''}); }} />
                          <ChevronDown className={`absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 transition-transform ${isClientDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>
                        {isClientDropdownOpen && (
                          <div className="absolute top-[110%] left-0 right-0 bg-white rounded-[32px] border border-slate-100 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.2)] z-[110] overflow-hidden">
                             <div className="max-h-[340px] overflow-y-auto no-scrollbar py-4">
                                {clients.filter(c => c.client_name.toLowerCase().includes(clientSearchQuery.toLowerCase())).map(c => (
                                  <button key={c.id} type="button" onClick={() => { setFormData({...formData, client_id: c.id}); setClientSearchQuery(c.client_name); setIsClientDropdownOpen(false); }} className="w-full px-8 py-5 text-left hover:bg-slate-50 transition-all flex items-center justify-between border-b last:border-0 border-slate-50">
                                    <div><p className="text-[14px] font-black text-slate-900">{c.client_name}</p><p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mt-1">{c.address}</p></div>
                                  </button>
                                ))}
                             </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Initial Design Fee (BDT)</label>
                        <input type="number" className="w-full h-20 px-8 bg-slate-50 border-transparent rounded-[28px] text-[14px] font-bold text-emerald-600 outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/5 transition-all shadow-inner" value={formData.budget} onChange={e => setFormData({...formData, budget: Number(e.target.value)})} />
                      </div>
                   </div>

                   <div className="space-y-6">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Assign Design Team</label>
                      <div className="grid grid-cols-2 gap-5 p-2 bg-slate-50/50 rounded-[40px] border border-slate-50">
                        {teamMembers.map(tm => {
                          const isSelected = formData.assigned_team.includes(tm.id);
                          return (
                            <button key={tm.id} type="button" onClick={() => setFormData({ ...formData, assigned_team: isSelected ? formData.assigned_team.filter(id => id !== tm.id) : [...formData.assigned_team, tm.id] })} className={`flex items-center gap-4 p-5 rounded-[24px] border transition-all ${isSelected ? 'bg-[#064e3b] border-[#064e3b] text-white shadow-xl' : 'bg-white border-white text-slate-500'}`}>
                               <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${tm.full_name}`} className="w-10 h-10 rounded-xl bg-white p-0.5" />
                               <div className="text-left"><p className="text-[12px] font-black leading-tight">{tm.full_name}</p><p className="text-[8px] font-black uppercase tracking-widest mt-1 opacity-60">{tm.designation || 'Staff'}</p></div>
                            </button>
                          );
                        })}
                      </div>
                   </div>

                   <button type="submit" className="w-full py-9 bg-[#064e3b] text-white rounded-[32px] font-black uppercase tracking-[0.4em] text-[13px] shadow-2xl shadow-emerald-900/40 hover:bg-black transition-all mt-8 flex items-center justify-center gap-4 active:scale-95 group">
                     {loading ? <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" /> : <Plus className="w-6 h-6 text-emerald-400" />}
                     Commit Project To Vault
                   </button>
                </form>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Projects;
