
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Hammer, Search, Plus, RefreshCw, ChevronRight, 
  MapPin, Calendar, Clock, ArrowUpRight, CheckCircle2,
  HardHat, Info, X, Save, ChevronDown, Check, Layout,
  Activity, Building2, UserCheck, ShieldCheck, Filter,
  Layers, PauseCircle, CheckCircle, ListFilter
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useNotification, useUser } from '../App';
import { Project } from '../types';

interface ConstructionProject {
  id: string;
  project_id: string;
  title: string;
  current_stage: string;
  progress: number;
  status: string;
  last_site_visit: string;
  start_date: string;
  project?: Project;
}

const CONSTRUCTION_STAGES = [
  'Earthwork & Excavation',
  'Foundation Work',
  'Column & Grade Beam',
  'Slab Casting',
  'Brickwork & Masonry',
  'Plumbing & Electrical',
  'Plastering',
  'Tiles & Finishing',
  'Paint & Interior Fixes',
  'Handover Phase'
];

const STATUS_OPTIONS = ['All', 'Active', 'On Hold', 'Completed'];

const Construction = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { profile } = useUser();
  const [projects, setProjects] = useState<ConstructionProject[]>([]);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [stageFilter, setStageFilter] = useState('All');
  
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Project Selection State
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const projectSearchRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    current_stage: CONSTRUCTION_STAGES[0],
    progress: 0,
    status: 'Active',
    start_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchConstructionData();
    fetchAvailableProjects();

    const handleClickOutside = (event: MouseEvent) => {
      if (projectSearchRef.current && !projectSearchRef.current.contains(event.target as Node)) {
        setShowProjectDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchConstructionData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('construction_projects')
        .select('*, project:projects(*, client:leads(*))')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      
      if (error) {
        if (error.code === '42703' || error.message.includes('column')) {
           showNotification("Database Sync Pending: Run the V13 SQL repair script.", "error");
        }
        throw error;
      }
      setProjects(data || []);
    } catch (err: any) {
      console.error("Construction Load Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*, client:leads(*)')
        .is('deleted_at', null);
      if (error) throw error;
      setAvailableProjects(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredItems = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) || 
                           p.project?.name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
      const matchesStage = stageFilter === 'All' || p.current_stage === stageFilter;
      return matchesSearch && matchesStatus && matchesStage;
    });
  }, [projects, search, statusFilter, stageFilter]);

  const handleSelectProject = (proj: Project) => {
    setSelectedProject(proj);
    setProjectSearchQuery(proj.name);
    setFormData(prev => ({ 
      ...prev, 
      title: `${proj.client?.client_name || 'Project'}'s Site - ${proj.name}` 
    }));
    setShowProjectDropdown(false);
  };

  const handleCreateConstruction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) {
      showNotification("Selection Required: Assign an architectural design.", "warning");
      return;
    }

    setIsSaving(true);
    try {
      const creatorId = profile?.id || (await supabase.auth.getUser()).data.user?.id;
      if (!creatorId) throw new Error("Authentication failure.");

      const payload: any = {
        ...formData,
        project_id: selectedProject.id,
        created_by: creatorId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (profile?.office_id) payload.office_id = profile.office_id;

      const { error } = await supabase.from('construction_projects').insert([payload]);
      
      if (error) throw error;

      showNotification("Site record authorized.", "success");
      setShowModal(false);
      resetForm();
      fetchConstructionData();
    } catch (err: any) {
      showNotification(`Sync Failure: ${err.message}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      current_stage: CONSTRUCTION_STAGES[0],
      progress: 0,
      status: 'Active',
      start_date: new Date().toISOString().split('T')[0]
    });
    setSelectedProject(null);
    setProjectSearchQuery('');
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'On Hold': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'Completed': return 'bg-slate-900 text-white border-transparent';
      default: return 'bg-slate-50 text-slate-400 border-slate-100';
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-32 animate-in fade-in duration-700">
      
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto no-scrollbar">
          <div className="bg-white rounded-[48px] p-8 md:p-14 max-w-2xl w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300 relative my-10">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
            <div className="flex justify-between items-start mb-12">
              <div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Initiate Site Work</h3>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mt-2">LINK ARCHITECTURAL PROJECT TO CONSTRUCTION</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-red-500 transition-all"><X className="w-6 h-6" /></button>
            </div>

            <form onSubmit={handleCreateConstruction} className="space-y-10 relative z-10">
               <div className="space-y-3 relative" ref={projectSearchRef}>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Assign Design Blueprint</label>
                  <div className="relative group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors">
                      <Layout className="w-4 h-4" />
                    </div>
                    <input 
                      type="text"
                      placeholder="Search designs..."
                      className={`w-full h-16 pl-14 pr-8 bg-slate-50 border rounded-2xl text-sm font-bold text-slate-700 outline-none focus:bg-white transition-all shadow-inner ${selectedProject ? 'border-emerald-500/40 bg-emerald-50/20' : 'border-slate-100'}`}
                      value={projectSearchQuery}
                      onFocus={() => setShowProjectDropdown(true)}
                      onChange={(e) => {
                        setProjectSearchQuery(e.target.value);
                        setShowProjectDropdown(true);
                      }}
                    />
                    {selectedProject && <div className="absolute right-6 top-1/2 -translate-y-1/2 text-emerald-500"><CheckCircle2 className="w-5 h-5" /></div>}
                  </div>

                  {showProjectDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-100 rounded-[32px] shadow-2xl z-[250] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="max-h-60 overflow-y-auto no-scrollbar py-2">
                        {availableProjects.filter(p => p.name.toLowerCase().includes(projectSearchQuery.toLowerCase())).map(p => (
                          <div key={p.id} onClick={() => handleSelectProject(p)} className="flex items-center gap-4 p-4 hover:bg-emerald-50 cursor-pointer transition-colors group">
                            <div className="w-10 h-10 bg-slate-50 text-slate-300 rounded-xl flex items-center justify-center font-black group-hover:bg-[#064e3b] group-hover:text-white transition-all"><Building2 className="w-5 h-5" /></div>
                            <div><p className="text-[13px] font-black text-slate-900 truncate">{p.name}</p><p className="text-[10px] text-slate-400 font-bold uppercase truncate">Client: {p.client?.client_name || 'Private'}</p></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
               </div>

               <div className="space-y-3">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Execution Alias</label>
                  <input required className="w-full h-16 px-8 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:bg-white shadow-inner" placeholder="e.g. Modern Villa - Site Execution" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
               </div>

               <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Milestone Stage</label>
                    <select className="w-full h-16 px-8 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none appearance-none cursor-pointer" value={formData.current_stage} onChange={e => setFormData({...formData, current_stage: e.target.value})}>
                      {CONSTRUCTION_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Initial Status</label>
                    <select className="w-full h-16 px-8 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none appearance-none cursor-pointer" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                      {STATUS_OPTIONS.slice(1).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
               </div>

               <button type="submit" disabled={isSaving} className="w-full py-8 bg-[#064e3b] text-white rounded-[32px] text-[12px] font-black uppercase tracking-[0.3em] hover:bg-black transition-all flex items-center justify-center gap-4 shadow-2xl active:scale-95 disabled:opacity-50">
                 {isSaving ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />} AUTHORIZE CONSTRUCTION LOGS
               </button>
            </form>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="sticky top-16 lg:top-0 z-[60] bg-[#f8fafc]/90 backdrop-blur-xl px-6 md:px-10 pt-10 pb-8 border-b border-slate-50 shadow-sm">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-10">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Site Execution</h1>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em] mt-2 opacity-80 flex items-center gap-2">
              <HardHat className="w-3.5 h-3.5 text-emerald-500" /> MONITORING FIRM SITE OPERATIONS
            </p>
          </div>
          <button onClick={() => setShowModal(true)} className="px-10 py-5 bg-[#064e3b] text-white rounded-[24px] text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-emerald-900/20 active:scale-95 transition-all flex items-center gap-3">
            <Plus className="w-5 h-5" /> Initiate Site Work
          </button>
        </header>

        {/* Filter Toolbar */}
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-6">
           <div className="relative group flex-1">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Search by site alias or architectural design..."
                className="w-full h-16 pl-16 pr-6 bg-white border border-slate-100 rounded-[28px] text-[14px] font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all shadow-sm"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
           </div>

           <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 bg-white/50 p-1.5 rounded-[24px] border border-slate-50 shadow-sm">
                 {STATUS_OPTIONS.map(opt => (
                   <button 
                     key={opt}
                     onClick={() => setStatusFilter(opt)}
                     className={`px-6 py-3.5 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === opt ? 'bg-[#064e3b] text-white shadow-xl shadow-emerald-900/10' : 'text-slate-400 hover:text-slate-600'}`}
                   >
                     {opt}
                   </button>
                 ))}
              </div>

              <div className="relative group">
                <ListFilter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <select 
                  className="pl-11 pr-10 h-14 bg-white border border-slate-100 rounded-[24px] text-[10px] font-black uppercase tracking-widest text-slate-500 outline-none appearance-none cursor-pointer focus:ring-4 focus:ring-emerald-500/5 transition-all shadow-sm min-w-[200px]"
                  value={stageFilter}
                  onChange={e => setStageFilter(e.target.value)}
                >
                  <option value="All">All Stages</option>
                  {CONSTRUCTION_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 pointer-events-none" />
              </div>
           </div>
        </div>
      </div>

      {/* LIST VIEW (Table Structure) */}
      <div className="max-w-[1440px] mx-auto px-6 md:px-10 mt-10">
        {loading ? (
          <div className="py-32 flex justify-center"><RefreshCw className="w-12 h-12 text-[#064e3b] animate-spin" /></div>
        ) : filteredItems.length === 0 ? (
          <div className="py-40 text-center bg-white rounded-[64px] border border-slate-100 shadow-xl">
             <HardHat className="w-16 h-16 text-slate-100 mx-auto mb-6" />
             <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest">No active sites match these parameters</p>
          </div>
        ) : (
          <div className="bg-white rounded-[48px] border border-slate-100 shadow-xl shadow-slate-200/5 overflow-hidden">
            <div className="overflow-x-auto no-scrollbar max-h-[calc(100vh-320px)] overflow-y-auto">
              <table className="w-full text-left min-w-[1200px] border-separate border-spacing-0">
                <thead className="sticky top-0 z-[40] bg-white">
                  <tr className="text-slate-400 text-[10px] uppercase font-black tracking-[0.25em]">
                    <th className="px-10 py-7 border-b border-slate-100 bg-white">Site & Linked Design</th>
                    <th className="px-10 py-7 border-b border-slate-100 bg-white">Milestone Stage</th>
                    <th className="px-10 py-7 border-b border-slate-100 bg-white">Site Maturity</th>
                    <th className="px-10 py-7 border-b border-slate-100 bg-white">Site Logs</th>
                    <th className="px-10 py-7 border-b border-slate-100 bg-white">Status</th>
                    <th className="px-10 py-7 border-b border-slate-100 bg-white text-right">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredItems.map((site) => (
                    <tr 
                      key={site.id} 
                      onClick={() => navigate(`/construction/${site.id}`)}
                      className="hover:bg-slate-50/80 transition-all cursor-pointer group"
                    >
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center font-black group-hover:bg-[#064e3b] group-hover:text-white transition-all shadow-sm">
                            <HardHat className="w-7 h-7" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[15px] font-black text-slate-900 group-hover:text-[#064e3b] transition-colors truncate max-w-[250px]">{site.title}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                              <Building2 className="w-3 h-3 text-emerald-500" /> {site.project?.name || 'Unlinked Design'}
                            </p>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-10 py-8">
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
                               <Layers className="w-4 h-4" />
                            </div>
                            <span className="text-[13px] font-black text-slate-700">{site.current_stage}</span>
                         </div>
                      </td>

                      <td className="px-10 py-8">
                        <div className="w-40 space-y-2.5">
                           <div className="flex justify-between items-end">
                              <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Progress</p>
                              <p className="text-[12px] font-black text-emerald-600">{site.progress}%</p>
                           </div>
                           <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-[#064e3b] rounded-full transition-all duration-1000 group-hover:bg-emerald-500"
                                style={{ width: `${site.progress}%` }}
                              />
                           </div>
                        </div>
                      </td>

                      <td className="px-10 py-8">
                         <div className="flex flex-col gap-1.5">
                            <p className="text-[12px] font-bold text-slate-600 flex items-center gap-2">
                               <Calendar className="w-3.5 h-3.5 text-slate-300" />
                               {new Date(site.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-5">Commencement</p>
                         </div>
                      </td>

                      <td className="px-10 py-8">
                         <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border inline-flex items-center gap-2 ${getStatusStyle(site.status)}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${site.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-current'}`} />
                            {site.status}
                         </div>
                      </td>

                      <td className="px-10 py-8 text-right">
                         <div className="inline-flex p-3 bg-white border border-slate-100 rounded-xl shadow-sm text-slate-300 group-hover:text-[#064e3b] transition-all group-hover:shadow-md">
                            <ArrowUpRight className="w-5 h-5" />
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Informational Governance Footer */}
        <div className="mt-12 bg-[#064e3b] p-10 md:p-14 rounded-[64px] flex flex-col md:flex-row items-center justify-between gap-10 shadow-2xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 blur-[120px] rounded-full pointer-events-none" />
           <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-4 text-emerald-400">
                 <ShieldCheck className="w-8 h-8" />
                 <p className="text-[11px] font-black uppercase tracking-[0.4em]">Site Execution Protocols</p>
              </div>
              <h2 className="text-4xl font-black text-white tracking-tight leading-tight max-w-2xl">Ensuring architectural fidelity from blueprint to building.</h2>
              <p className="text-emerald-100/40 text-sm font-medium leading-relaxed max-w-xl">All site work is linked to the primary design record. Site updates generate notifications for the assigned design team to verify execution maturity.</p>
           </div>
           <button className="relative z-10 px-14 py-7 bg-white text-[#064e3b] rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4">
              Operational Handbook <ChevronRight className="w-5 h-5" />
           </button>
        </div>
      </div>
    </div>
  );
};

export default Construction;
