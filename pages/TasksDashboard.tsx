
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Search, Filter, ListTree, CheckCircle2, Circle, Clock, Activity,
  Users2, Calendar, ChevronRight, LayoutGrid, List as ListIcon,
  Search as SearchIcon, ArrowUpRight, BarChart3, TrendingUp, RefreshCw,
  MoreVertical, Check, UserPlus, Trash2, X, Building, Info,
  AlertCircle, ShieldCheck, MapPin
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { 
  Project, Profile, ProjectTask, TaskStage, TaskStatus,
  Lead
} from '../types';
import { useNotification, useUser } from '../App';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';

const STAGES: TaskStage[] = ['Floor Plan', '3D Design', 'Structure', 'Drafting'];

const TasksDashboard = () => {
  const { showNotification } = useNotification();
  const { profile, isAdmin } = useUser();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [clients, setClients] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Running' | 'Completed' | 'Upcoming'>('All');
  
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  // Form State
  const [newProjData, setNewProjData] = useState({
    name: '',
    client_id: '',
    foundation_type: 'Pile Foundation',
    start_date: new Date().toISOString().split('T')[0],
    deadline: '',
  });

  const [clientSearch, setClientSearch] = useState('');
  const [showClientList, setShowClientList] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch core data first
      const [projBaseRes, staffRes, clientRes] = await Promise.all([
        supabase.from('projects').select('*, client:leads(*)').is('deleted_at', null).order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').is('deleted_at', null).eq('status', 'active'),
        supabase.from('leads').select('*').eq('is_client', true).is('deleted_at', null)
      ]);

      if (projBaseRes.error) throw projBaseRes.error;

      const projectsData = projBaseRes.data || [];
      const staffData = staffRes.data || [];
      const clientsData = clientRes.data || [];

      // Try fetching tasks separately to handle case where table might be missing
      try {
        const { data: tasksData, error: tasksError } = await supabase
          .from('project_tasks')
          .select('*');
        
        if (tasksError) {
          console.warn("Project tasks table might be missing or inaccessible:", tasksError);
          setDbError("The 'project_tasks' table is missing from your database. Task stages and assignments will not persist until the table is created.");
        } else {
          setDbError(null);
          // Merge tasks into projects
          projectsData.forEach(p => {
            p.tasks = (tasksData || []).filter(t => t.project_id === p.id);
          });
        }
      } catch (taskErr) {
        console.error("Secondary fetch for tasks failed:", taskErr);
      }

      setProjects(projectsData);
      setStaff(staffData);
      setClients(clientsData);
    } catch (err: any) {
      console.error("Critical fetch failed:", err);
      showNotification("Failed to fetch records. Please verify database schema.", "error");
    } finally {
      setLoading(false);
    }
  };

  const initProjectTasks = async (projectId: string) => {
    const tasks = STAGES.map((stage, index) => ({
      project_id: projectId,
      stage,
      status: index === 0 ? 'Running' : 'Upcoming',
      order: index,
      assigned_employees: []
    }));

    const { error } = await supabase.from('project_tasks').insert(tasks);
    if (error) {
       console.error("Task Init Error:", error);
       // Fallback: If table project_tasks doesn't exist, we might be in trouble
       // but in our environment we assume we should create it or handle it.
       showNotification("Error initializing project workflow stages.", "error");
    }
    return !error;
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjData.name) return;
    setIsSaving(true);

    try {
      const { data: proj, error } = await supabase.from('projects').insert([{
        name: newProjData.name,
        client_id: newProjData.client_id || null,
        status: 'Running',
        start_date: newProjData.start_date,
        deadline: newProjData.deadline || null,
        foundation_type: newProjData.foundation_type,
        created_by: profile?.id
      }]).select().single();

      if (error) throw error;

      // Initialize stages
      await initProjectTasks(proj.id);

      showNotification("Project blueprint & stages initialized.", "success");
      setShowAddProjectModal(false);
      setNewProjData({
        name: '',
        client_id: '',
        foundation_type: 'Pile Foundation',
        start_date: new Date().toISOString().split('T')[0],
        deadline: '',
      });
      fetchData();
    } catch (err: any) {
      showNotification("Induction failed: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: TaskStatus, projectId: string, currentOrder: number) => {
    try {
      const { error } = await supabase
        .from('project_tasks')
        .update({ status: newStatus, completed_at: newStatus === 'Completed' ? new Date().toISOString() : null })
        .eq('id', taskId);

      if (error) throw error;

      // Logic: If completed, move to next stage
      if (newStatus === 'Completed') {
        const nextOrder = currentOrder + 1;
        if (nextOrder < STAGES.length) {
          await supabase
            .from('project_tasks')
            .update({ status: 'Running' })
            .eq('project_id', projectId)
            .eq('order', nextOrder);
        } else {
          // All stages complete -> Mark project as complete
          await supabase
            .from('projects')
            .update({ status: 'Complete' })
            .eq('id', projectId);
        }
      }

      showNotification("Workflow state updated.", "success");
      fetchData();
    } catch (err: any) {
      showNotification("Sync failed: " + err.message, "error");
    }
  };

  const assignEmployee = async (taskId: string, profileId: string, currentAssignments: string[]) => {
    const isAssigned = currentAssignments.includes(profileId);
    const newAssignments = isAssigned 
      ? currentAssignments.filter(id => id !== profileId)
      : [...currentAssignments, profileId];

    try {
      const { error } = await supabase
        .from('project_tasks')
        .update({ assigned_employees: newAssignments })
        .eq('id', taskId);

      if (error) throw error;
      fetchData();
    } catch (err: any) {
      showNotification("Assignment failed.", "error");
    }
  };

  // Stats
  const stats = useMemo(() => {
    const totalRunning = projects.filter(p => (p.tasks || []).some(t => t.status === 'Running')).length;
    const totalCompleted = projects.filter(p => (p.tasks || []).every(t => t.status === 'Completed') && p.tasks?.length === STAGES.length).length;
    
    // Performance (current month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const completedThisMonth = projects.reduce((acc, p) => {
       return acc + (p.tasks || []).filter(t => t.status === 'Completed' && t.completed_at && new Date(t.completed_at) >= startOfMonth).length;
    }, 0);

    return { totalRunning, totalCompleted, completedThisMonth };
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.client?.client_name || '').toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;
      
      if (statusFilter === 'All') return true;
      if (statusFilter === 'Running') return (p.tasks || []).some(t => t.status === 'Running');
      if (statusFilter === 'Completed') return (p.tasks || []).every(t => t.status === 'Completed');
      if (statusFilter === 'Upcoming') return (p.tasks || []).every(t => t.status === 'Upcoming');
      return true;
    });
  }, [projects, search, statusFilter]);

  const selectedProjectDetails = useMemo(() => {
    if (!selectedProject) return null;
    return projects.find(p => p.id === selectedProject.id);
  }, [selectedProject, projects]);

  // Employee specific logic
  const myTasks = useMemo(() => {
    if (!profile) return [];
    return projects.flatMap(p => (p.tasks || []).filter(t => t.assigned_employees.includes(profile.id)).map(t => ({ ...t, project: p })));
  }, [projects, profile]);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 animate-in fade-in duration-500 relative">
      
      {/* ... Add Project Modal logic stays the same but shrinking modal paddings if needed elsewhere ... */}
      
      <div className="sticky top-14 lg:top-0 z-[60] bg-white/80 backdrop-blur-md px-4 py-3 border-b border-slate-100 shadow-sm">
        <header className="flex flex-row justify-between items-center gap-4 mb-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none uppercase">Task Flow</h1>
            <p className="text-slate-400 text-[8px] font-bold uppercase tracking-widest mt-1 flex items-center gap-1.5 leading-none">
              <Activity className="w-3 h-3 text-emerald-500" /> STAGE ENGINE
            </p>
          </div>
          {isAdmin && (
            <button onClick={() => setShowAddProjectModal(true)} className="px-5 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-md hover:bg-slate-800 transition-all flex items-center gap-2 leading-none active:scale-95"><Plus className="w-3.5 h-3.5" /> Project</button>
          )}
        </header>

        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2">
          <div className="relative group flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
            <input type="text" placeholder="Search projects..." className="w-full h-8 pl-9 pr-4 bg-slate-50 border border-slate-100 rounded-lg text-xs font-medium text-slate-700 outline-none focus:bg-white transition-all shadow-none" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg shrink-0 overflow-x-auto no-scrollbar">
            {(['All', 'Running', 'Completed', 'Upcoming'] as const).map(f => (
              <button key={f} onClick={() => setStatusFilter(f)} className={`px-4 py-1.5 rounded-md text-[8px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${statusFilter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{f}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 mt-4 grid grid-cols-12 gap-5">
        
        {/* LEFT COLUMN: Project List */}
        <div className="col-span-12 lg:col-span-3 space-y-3">
           <div className="flex items-center justify-between px-1">
              <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Execution Queue</h3>
              <div className="text-[8px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-md border border-emerald-100 uppercase tracking-tight">{filteredProjects.length} Designs</div>
           </div>
           
           <div className="space-y-1.5 max-h-[calc(100vh-260px)] overflow-y-auto no-scrollbar pr-1 pb-10">
              {filteredProjects.map(p => {
                const completedStages = (p.tasks || []).filter(t => t.status === 'Completed').length;
                const progress = (completedStages / STAGES.length) * 100;
                
                return (
                  <motion.div 
                    layout
                    key={p.id} 
                    onClick={() => setSelectedProject(p)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer group relative ${selectedProject?.id === p.id ? 'bg-white border-emerald-500 shadow-sm' : 'bg-white border-slate-100 hover:border-emerald-300 shadow-none'}`}
                  >
                    <div className="flex justify-between items-start mb-1.5">
                       <div className="min-w-0 flex-1">
                          <h4 className="text-[13px] font-bold text-slate-800 leading-tight truncate group-hover:text-emerald-700 uppercase tracking-tight leading-none">{p.name}</h4>
                          <p className="text-[9px] font-bold text-slate-400 mt-1 truncate leading-none uppercase">{p.client?.client_name || 'Individual'}</p>
                       </div>
                       <div className={`p-1 rounded-md border ml-2 ${selectedProject?.id === p.id ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-50 border-slate-100 text-slate-200'}`}>
                          <ArrowUpRight className="w-3 h-3" />
                       </div>
                    </div>

                    <div className="space-y-1">
                       <div className="h-1 bg-slate-50 rounded-full overflow-hidden">
                          <div 
                            style={{ width: `${progress}%` }}
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          />
                       </div>
                       <div className="flex justify-between items-center text-[7px] font-bold text-slate-300 tracking-tighter">
                          <div className="flex gap-0.5">
                             {(p.tasks || []).sort((a,b) => a.order - b.order).map(t => (
                               <div key={t.id} className={`w-1 h-1 rounded-full ${t.status === 'Completed' ? 'bg-emerald-500' : t.status === 'Running' ? 'bg-blue-500 animate-pulse' : 'bg-slate-200'}`} />
                             ))}
                          </div>
                          <span className="text-emerald-600 font-bold uppercase">{Math.round(progress)}% Progress</span>
                       </div>
                    </div>
                  </motion.div>
                );
              })}
           </div>
        </div>

        {/* RIGHT COLUMN: Project Details & Stages */}
        <div className="col-span-12 lg:col-span-9">
           <AnimatePresence mode="wait">
             {selectedProjectDetails ? (
               <motion.div 
                 key={selectedProjectDetails.id}
                 initial={{ opacity: 0, x: 10 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: -10 }}
                 className="space-y-5"
               >
                  {/* PROJECT HEADER CARD */}
                  <div className="bg-slate-900 rounded-xl p-5 text-white relative overflow-hidden shadow-lg border border-slate-800">
                     <div className="flex flex-row justify-between items-center relative z-10">
                        <div className="space-y-2">
                           <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md text-[7px] font-bold uppercase tracking-widest border border-emerald-500/10">Active Strategy</span>
                              <span className="text-white/20 text-[7px] font-bold uppercase tracking-widest">REF: {selectedProjectDetails.id.slice(0, 8)}</span>
                           </div>
                           <h2 className="text-lg font-bold tracking-tight uppercase">{selectedProjectDetails.name}</h2>
                           <p className="text-[10px] text-white/50 font-bold tracking-widest uppercase leading-none">{selectedProjectDetails.foundation_type || 'Standard'}</p>
                        </div>
                        <div className="text-right">
                           <p className="text-[7px] text-white/30 font-bold uppercase tracking-widest mb-1.5 leading-none">Architectural Lead</p>
                           <p className="text-xs font-bold uppercase text-emerald-400 leading-none">{selectedProjectDetails.creator?.full_name || '-'}</p>
                           <p className="text-[8px] text-white/20 font-bold uppercase tracking-widest mt-2 leading-none">Due: {selectedProjectDetails.deadline ? new Date(selectedProjectDetails.deadline).toLocaleDateString() : 'N/A'}</p>
                        </div>
                     </div>
                  </div>

                  {/* STEPPER / STAGES GRID */}
                  <div className="space-y-3">
                     <div className="flex items-center justify-between px-1">
                        <h3 className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Workflow Segments</h3>
                        <div className="flex gap-2">
                           <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /><span className="text-[7px] font-bold text-slate-300 uppercase tracking-widest">Done</span></div>
                           <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /><span className="text-[7px] font-bold text-slate-300 uppercase tracking-widest">Live</span></div>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-20">
                        {(selectedProjectDetails.tasks || []).sort((a,b) => a.order - b.order).map((task, idx) => {
                          const isActive = task.status === 'Running';
                          const isCompleted = task.status === 'Completed';
                          const canEdit = isAdmin || (profile && task.assigned_employees.includes(profile.id));

                          return (
                            <motion.div 
                              layout
                              key={task.id}
                              className={`p-4 rounded-xl border transition-all relative ${
                                isCompleted ? 'bg-white border-emerald-500 shadow-sm' :
                                isActive ? 'bg-white border-blue-500 shadow-md ring-2 ring-blue-500/5' :
                                'bg-slate-50 border-slate-200 opacity-50 shadow-none grayscale'
                              }`}
                            >
                               <div className="flex justify-between items-start mb-3">
                                  <div className="flex items-center gap-2">
                                     <span className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[8px] ${isCompleted ? 'bg-emerald-500 text-white' : isActive ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-400'}`}>{idx + 1}</span>
                                     <h5 className="text-sm font-bold text-slate-900 tracking-tight uppercase leading-none">{task.stage}</h5>
                                  </div>
                                  <div className={`px-2 py-0.5 rounded-md text-[7px] font-bold uppercase tracking-widest border ${
                                    isCompleted ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                    isActive ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                    'bg-slate-100 text-slate-400 border-slate-200'
                                  }`}>
                                     {task.status}
                                  </div>
                               </div>

                               <div className="space-y-3">
                                  <div className="flex flex-wrap gap-1 min-h-[28px] items-center">
                                     <p className="text-[7px] font-bold text-slate-300 uppercase tracking-widest mr-1 mb-1 leading-none w-full">Assigned Agents:</p>
                                     {task.assigned_employees.length > 0 ? (
                                       task.assigned_employees.map(empId => {
                                         const p = staff.find(s => s.id === empId);
                                         if (!p) return null;
                                         return (
                                           <div key={empId} className="group/avatar relative">
                                              <img 
                                                src={p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.email}`} 
                                                className="w-7 h-7 rounded-lg border border-slate-100 shadow-sm bg-white"
                                                alt={p.full_name}
                                                title={p.full_name}
                                              />
                                              {isAdmin && (
                                                <button onClick={() => assignEmployee(task.id, empId, task.assigned_employees)} className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 shadow-sm leading-none transition-all">
                                                   <X className="w-2 h-2" />
                                                </button>
                                              )}
                                           </div>
                                         );
                                       })
                                     ) : (
                                       <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Vault Empty</span>
                                     )}
                                     
                                     {isAdmin && (
                                       <div className="relative group/assign">
                                          <button className="w-7 h-7 rounded-lg border border-dashed border-slate-200 flex items-center justify-center text-slate-300 hover:border-emerald-500 hover:text-emerald-500 transition-all">
                                             <UserPlus className="w-3 h-3" />
                                          </button>
                                          <div className="absolute bottom-full left-0 mb-1 w-36 bg-white border border-slate-200 rounded-lg shadow-xl z-[150] hidden group-hover/assign:block p-1 animate-in fade-in slide-in-from-bottom-1">
                                             {staff.filter(s => !task.assigned_employees.includes(s.id)).map(s => (
                                               <button key={s.id} onClick={() => assignEmployee(task.id, s.id, task.assigned_employees)} className="w-full flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded-md text-left">
                                                  <div className="w-5 h-5 rounded bg-slate-100" />
                                                  <span className="text-[8px] font-bold uppercase tracking-widest text-slate-700 truncate">{s.full_name.split(' ')[0]}</span>
                                               </button>
                                             ))}
                                          </div>
                                       </div>
                                     )}
                                  </div>

                                  <div className="pt-2 border-t border-slate-50 flex items-center justify-between">
                                     <div className="flex items-center gap-1.5">
                                        <Clock className="w-2.5 h-2.5 text-slate-200" />
                                        <p className="text-[7px] font-bold text-slate-300 uppercase tracking-widest">{task.completed_at ? `Done ${new Date(task.completed_at).toLocaleDateString()}` : isActive ? 'Strategy Running' : 'Queue'}</p>
                                     </div>
                                     
                                     {isActive && canEdit && (
                                       <button 
                                          onClick={() => updateTaskStatus(task.id, 'Completed', selectedProjectDetails.id, task.order)}
                                          className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[8px] font-bold uppercase tracking-widest hover:bg-black flex items-center gap-1 shadow-sm leading-none transition-all active:scale-95"
                                        >
                                          <Check className="w-2.5 h-2.5" /> Commit
                                       </button>
                                     )}
                                  </div>
                               </div>
                            </motion.div>
                          );
                        })}
                     </div>
                  </div>
               </motion.div>
             ) : (
               <div className="h-[400px] flex flex-col items-center justify-center bg-white border border-slate-100 rounded-xl shadow-none text-center p-6 grayscale opacity-80 border-dashed">
                  <div className="w-10 h-10 bg-slate-50 text-slate-200 rounded-lg flex items-center justify-center mb-4 border border-slate-100/50">
                     <ListTree className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-400 tracking-tight mb-1 uppercase">Selection Required</h3>
                  <p className="text-slate-300 text-[9px] font-bold uppercase tracking-widest max-w-[180px] mx-auto mb-6 leading-relaxed">Mount a project to access segment workflow</p>
                  <div className="grid grid-cols-2 gap-2 w-full max-w-[200px]">
                     <div className="p-2 bg-slate-50/50 rounded-lg border border-slate-50 text-center">
                        <p className="text-lg font-bold text-emerald-600/30">{stats.totalRunning}</p>
                        <p className="text-[7px] font-bold text-slate-300 uppercase tracking-widest leading-none">Running</p>
                     </div>
                     <div className="p-2 bg-slate-50/50 rounded-lg border border-slate-50 text-center">
                        <p className="text-lg font-bold text-blue-600/30">{stats.completedThisMonth}</p>
                        <p className="text-[7px] font-bold text-slate-300 uppercase tracking-widest leading-none">Monthly</p>
                     </div>
                  </div>
               </div>
             )}
           </AnimatePresence>
        </div>
      </div>

      {/* EMPLOYEE DASHBOARD OVERVIEW */}
      <div className="max-w-[1600px] mx-auto px-6 md:px-10 mt-8">
         <div className="bg-[#1e293b] rounded-2xl p-8 text-white relative overflow-hidden shadow-lg">
            <div className="flex flex-col lg:flex-row justify-between items-start gap-8 relative z-10">
               <div className="space-y-6 flex-1 w-full">
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight">Personal Workflow</h3>
                    <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest mt-1">Architectural Performance Metrics</p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                     <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                        <TrendingUp className="w-5 h-5 text-emerald-400 mb-2" />
                        <p className="text-2xl font-bold">{myTasks.filter(t => t.status === 'Running').length}</p>
                        <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest">Active</p>
                     </div>
                     <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                        <CheckCircle2 className="w-5 h-5 text-blue-400 mb-2" />
                        <p className="text-2xl font-bold">{myTasks.filter(t => t.status === 'Completed').length}</p>
                        <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest">Total Done</p>
                     </div>
                     <div className="hidden md:block p-4 bg-white/5 rounded-xl border border-white/5">
                        <BarChart3 className="w-5 h-5 text-amber-400 mb-2" />
                        <p className="text-2xl font-bold">{stats.completedThisMonth}</p>
                        <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest">Team Velocity</p>
                     </div>
                  </div>
               </div>

               <div className="w-full lg:w-96 bg-white text-slate-900 p-6 rounded-2xl shadow-xl">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">Recent Tasks</h4>
                  <div className="space-y-3 max-h-40 overflow-y-auto no-scrollbar">
                     {myTasks.length === 0 ? (
                       <p className="text-center py-4 text-[10px] font-bold text-slate-300 uppercase">No active assignments.</p>
                     ) : (
                       myTasks.sort((a,b) => b.updated_at > a.updated_at ? 1 : -1).slice(0, 3).map(t => (
                         <div key={t.id} className="flex items-center gap-3 group">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${t.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                               <ShieldCheck className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                               <p className="text-xs font-bold truncate text-slate-800">{t.project?.name}</p>
                               <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase truncate">{t.stage}</span>
                               </div>
                            </div>
                            <button onClick={() => { setSelectedProject(projects.find(p => p.id === t.project_id) || null); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="p-1.5 text-slate-300 hover:text-slate-900 transition-all"><ArrowUpRight className="w-3.5 h-3.5" /></button>
                         </div>
                       ))
                     )}
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default TasksDashboard;
