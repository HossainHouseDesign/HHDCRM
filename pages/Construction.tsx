
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto no-scrollbar">
          <div className="bg-white rounded-[32px] p-8 md:p-10 max-w-xl w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300 relative my-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none" />
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">Initiate Site Work</h3>
                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mt-2 leading-none">LINK ARCHITECTURAL PROJECT TO CONSTRUCTION</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:text-red-500 transition-all"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleCreateConstruction} className="space-y-6 relative z-10">
               <div className="space-y-1.5 relative" ref={projectSearchRef}>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Assign Design Blueprint</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-900 transition-colors">
                      <Layout className="w-4 h-4" />
                    </div>
                    <input 
                      type="text"
                      placeholder="Search designs..."
                      className={`w-full h-12 pl-12 pr-6 bg-slate-50 border rounded-2xl text-[13px] font-bold text-slate-700 outline-none focus:bg-white transition-all shadow-none ${selectedProject ? 'border-emerald-500/40 bg-emerald-50/20' : 'border-slate-100'}`}
                      value={projectSearchQuery}
                      onFocus={() => setShowProjectDropdown(true)}
                      onChange={(e) => {
                        setProjectSearchQuery(e.target.value);
                        setShowProjectDropdown(true);
                      }}
                    />
                    {selectedProject && <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500"><CheckCircle2 className="w-4 h-4" /></div>}
                  </div>

                  {showProjectDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[250] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="max-h-48 overflow-y-auto no-scrollbar py-1">
                        {availableProjects.filter(p => p.name.toLowerCase().includes(projectSearchQuery.toLowerCase())).map(p => (
                          <div key={p.id} onClick={() => handleSelectProject(p)} className="flex items-center gap-3 p-3 hover:bg-emerald-50 cursor-pointer transition-colors group border-b border-slate-50 last:border-0">
                            <div className="w-8 h-8 bg-slate-50 text-slate-300 rounded-lg flex items-center justify-center font-black group-hover:bg-slate-900 group-hover:text-white transition-all shadow-none"><Building2 className="w-4 h-4" /></div>
                            <div className="min-w-0"><p className="text-[12px] font-black text-slate-900 truncate uppercase leading-none">{p.name}</p><p className="text-[9px] text-slate-400 font-bold uppercase truncate mt-1 leading-none">Client: {p.client?.client_name || 'Private'}</p></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
               </div>

               <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Execution Alias</label>
                  <input required className="w-full h-12 px-5 bg-slate-50 border border-slate-100 rounded-2xl text-[13px] font-bold text-slate-700 outline-none focus:bg-white shadow-none uppercase" placeholder="e.g. Modern Villa - Site Execution" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Milestone Stage</label>
                    <select className="w-full h-12 px-5 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-tight text-slate-700 outline-none appearance-none cursor-pointer" value={formData.current_stage} onChange={e => setFormData({...formData, current_stage: e.target.value})}>
                      {CONSTRUCTION_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Initial Status</label>
                    <select className="w-full h-12 px-5 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-tight text-slate-700 outline-none appearance-none cursor-pointer" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                      {STATUS_OPTIONS.slice(1).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
               </div>

               <button type="submit" disabled={isSaving} className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-3 shadow-none active:scale-95 disabled:opacity-50">
                 {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-emerald-400" />} Authorize Logs
               </button>
            </form>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="sticky top-16 lg:top-0 z-[60] bg-[#f8fafc]/90 backdrop-blur-xl px-4 md:px-6 pt-6 pb-6 border-b border-slate-100 shadow-sm transition-all">
        <header className="flex flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">Site Execution</h1>
            <p className="text-slate-400 text-[8px] font-black uppercase tracking-widest mt-2 opacity-80 flex items-center gap-2 leading-none">
              <HardHat className="w-3 h-3 text-emerald-500" /> MONITORING FIRM SITE OPERATIONS
            </p>
          </div>
          <button onClick={() => setShowModal(true)} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-all flex items-center gap-2 leading-none hover:bg-slate-800">
            <Plus className="w-4 h-4 text-emerald-400" /> Initiate Site Work
          </button>
        </header>

        {/* Filter Toolbar compacted */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
           <div className="relative group flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-slate-900 transition-colors" />
              <input 
                type="text" 
                placeholder="Search sites or designs..."
                className="w-full h-10 pl-11 pr-6 bg-white border border-slate-200 rounded-xl text-[12px] font-bold text-slate-700 outline-none focus:border-slate-900 transition-all shadow-none"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
           </div>

           <div className="flex flex-row items-center gap-2 overflow-x-auto no-scrollbar pb-1 lg:pb-0">
              <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg shrink-0">
                 {STATUS_OPTIONS.map(opt => (
                   <button 
                     key={opt}
                     onClick={() => setStatusFilter(opt)}
                     className={`px-4 py-1.5 rounded-md text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${statusFilter === opt ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                   >
                     {opt}
                   </button>
                 ))}
              </div>

              <div className="relative group shrink-0">
                <ListFilter className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-300 pointer-events-none" />
                <select 
                  className="pl-8 pr-8 h-8.5 bg-white border border-slate-200 rounded-lg text-[8px] font-black uppercase tracking-widest text-slate-500 outline-none appearance-none cursor-pointer focus:border-slate-900 transition-all shadow-none min-w-[140px]"
                  value={stageFilter}
                  onChange={e => setStageFilter(e.target.value)}
                >
                  <option value="All">All Stages</option>
                  {CONSTRUCTION_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-300 pointer-events-none" />
              </div>
           </div>
        </div>
      </div>

      {/* LIST VIEW (Table Structure) */}
      <div className="max-w-[1440px] mx-auto px-4 mt-6">
        {loading ? (
          <div className="py-32 flex justify-center"><RefreshCw className="w-10 h-10 text-slate-900 animate-spin" /></div>
        ) : filteredItems.length === 0 ? (
          <div className="py-32 text-center bg-white rounded-[32px] border border-slate-200 shadow-sm">
             <HardHat className="w-12 h-12 text-slate-100 mx-auto mb-4" />
             <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No matching site logs found</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
            <div className="overflow-x-auto no-scrollbar max-h-[calc(100vh-280px)] overflow-y-auto">
              <table className="w-full text-left border-separate border-spacing-0">
                <thead className="sticky top-0 z-[40] bg-white">
                  <tr className="text-slate-400 text-[8px] uppercase font-black tracking-widest leading-none">
                    <th className="px-5 py-3 border-b border-slate-100 bg-white">Execution Entity</th>
                    <th className="px-5 py-3 border-b border-slate-100 bg-white">Phase</th>
                    <th className="px-5 py-3 border-b border-slate-100 bg-white">Maturity</th>
                    <th className="px-5 py-3 border-b border-slate-100 bg-white">Commencement</th>
                    <th className="px-5 py-3 border-b border-slate-100 bg-white">Status</th>
                    <th className="px-5 py-3 border-b border-slate-100 bg-white text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((site) => (
                    <tr 
                      key={site.id} 
                      onClick={() => navigate(`/construction/${site.id}`)}
                      className="hover:bg-slate-50/30 transition-all cursor-pointer group"
                    >
                      <td className="px-5 py-2.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-slate-50 text-slate-300 rounded-lg flex items-center justify-center font-black group-hover:bg-slate-900 group-hover:text-white transition-all shadow-none">
                            <HardHat className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 leading-none">
                            <p className="text-[13px] font-black text-slate-900 group-hover:text-slate-900 transition-colors uppercase truncate tracking-tight">{site.title}</p>
                            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-1.5 flex items-center gap-1.5 leading-none">
                              <Building2 className="w-2.5 h-2.5 text-emerald-500" /> {site.project?.name || 'Unlinked Design'}
                            </p>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-5 py-2.5">
                         <div className="flex items-center gap-2 leading-none">
                            <div className="w-6 h-6 bg-slate-50 rounded flex items-center justify-center text-slate-300">
                               <Layers className="w-3 h-3" />
                            </div>
                            <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">{site.current_stage}</span>
                         </div>
                      </td>

                      <td className="px-5 py-2.5">
                        <div className="w-28 space-y-1.5 leading-none">
                           <div className="flex justify-between items-end leading-none">
                              <p className="text-[7px] font-black text-slate-200 uppercase tracking-widest">Progress</p>
                              <p className="text-[10px] font-black text-emerald-600 leading-none">{site.progress}%</p>
                           </div>
                           <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-slate-900 rounded-full transition-all duration-1000 group-hover:bg-emerald-500"
                                style={{ width: `${site.progress}%` }}
                              />
                           </div>
                        </div>
                      </td>

                      <td className="px-5 py-2.5">
                         <div className="flex flex-col leading-none">
                            <p className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5 leading-none">
                               <Calendar className="w-3 h-3 text-slate-300" />
                               {new Date(site.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                            <p className="text-[7px] font-black text-slate-200 uppercase tracking-widest mt-1.5 leading-none">INITIATED</p>
                         </div>
                      </td>

                      <td className="px-5 py-2.5">
                         <div className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest border inline-flex items-center gap-1 leading-none ${getStatusStyle(site.status)}`}>
                            <div className={`w-1 h-1 rounded-full ${site.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-current'}`} />
                            {site.status}
                         </div>
                      </td>

                      <td className="px-5 py-2.5 text-right leading-none">
                         <div className="inline-flex p-1.5 text-slate-100 group-hover:text-slate-900 transition-all leading-none">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Informational Governance Footer compacted */}
        <div className="mt-8 bg-slate-900 p-8 rounded-[32px] flex flex-col md:flex-row items-center justify-between gap-8 shadow-none relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[80px] rounded-full pointer-events-none" />
           <div className="relative z-10 space-y-4 leading-tight">
              <div className="flex items-center gap-3 text-emerald-400 leading-none">
                 <ShieldCheck className="w-6 h-6 border-emerald-400/20" />
                 <p className="text-[9px] font-black uppercase tracking-widest opacity-80 leading-none">Site Execution Protocols</p>
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight leading-tight max-w-xl uppercase">Fidelity from blueprint to building.</h2>
              <p className="text-slate-400 text-[11px] font-bold leading-relaxed max-w-lg uppercase tracking-tight opacity-60">Site execution metrics indexed directly to prime architectural Design records.</p>
           </div>
           <button className="relative z-10 px-8 py-3.5 bg-white text-slate-900 border border-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-none hover:bg-slate-50 transition-all flex items-center gap-3 whitespace-nowrap active:scale-95 leading-none">
              Governance Handbook <ChevronRight className="w-4 h-4" />
           </button>
        </div>
      </div>
    </div>
  );
};

export default Construction;
