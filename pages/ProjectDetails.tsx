import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Briefcase, MapPin, Ruler, Users, Calendar, 
  CheckCircle2, Clock, Grid, Bed, Bath, ListTree, Banknote,
  PhoneCall, RefreshCw, Compass, ShieldCheck, Mail,
  Edit3, Trash2, Hash, Map, Layers, X, Save, Activity, Layout, Info, Globe,
  AlertTriangle, UserCircle, User, Home, Zap, Users2, ChevronDown
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Project, Lead, Profile, ProjectStatus, FormFieldConfig } from '../types';
import { DEFAULT_FORM_CONFIG } from './Settings';
import { useNotification } from '../App';

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  const [project, setProject] = useState<Project | null>(null);
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [formConfig, setFormConfig] = useState<FormFieldConfig[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  
  const [editFormData, setEditFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchData();
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setShowStatusMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [projRes, teamRes, configRes] = await Promise.all([
        supabase.from('projects').select('*, client:leads(*), creator:profiles!created_by(full_name), assignments:project_assignments(profile:profiles(*))').eq('id', id).single(),
        supabase.from('profiles').select('*').is('deleted_at', null).eq('status', 'active'),
        supabase.from('settings').select('*').eq('key', 'lead_form_config').single()
      ]);
      
      if (projRes.error) throw projRes.error;
      
      const currentProject = projRes.data;
      const currentClient = (currentProject.client as Lead) || ({} as Lead);
      const currentConfig = configRes.data?.value || DEFAULT_FORM_CONFIG;

      setProject(currentProject);
      setTeamMembers(teamRes.data || []);
      setFormConfig(currentConfig);
      
      const initialForm: any = {
        name: currentProject.name,
        status: currentProject.status,
        budget: currentProject.budget,
        start_date: currentProject.start_date,
        description: currentProject.description || '',
        assigned_team: (currentProject.assignments || [])
          .filter((a: any) => a.profile)
          .map((a: any) => a.profile.id)
      };

      currentConfig.forEach((f: FormFieldConfig) => {
        initialForm[f.db_key] = currentClient[f.db_key as keyof Lead] !== undefined 
          ? currentClient[f.db_key as keyof Lead] 
          : currentClient.metadata?.[f.db_key];
      });

      setEditFormData(initialForm);

    } catch (err: any) {
      console.error("Fetch Data Error:", err);
      showNotification(`Vault access failed: ${err.message}`, "error");
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: ProjectStatus) => {
    if (!project || isUpdatingStatus) return;
    setIsUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', project.id);
      
      if (error) throw error;
      
      setProject({ ...project, status: newStatus });
      showNotification(`Project transitioned to ${newStatus}.`, "success");
      setShowStatusMenu(false);
    } catch (err: any) {
      showNotification(`Status sync failed: ${err.message}`, "error");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !project) return;
    setIsSaving(true);
    try {
      const { error: projectError } = await supabase.from('projects').update({
        name: editFormData.name,
        status: editFormData.status,
        budget: editFormData.budget,
        start_date: editFormData.start_date,
        description: editFormData.description,
        updated_at: new Date().toISOString()
      }).eq('id', id);
      
      if (projectError) throw projectError;
      
      const standardCols = ['foundation', 'unit_count', 'bedroom_count', 'bathroom_count', 'stair_details', 'land_area', 'package', 'asking_fee', 'address', 'upazila', 'social_media', 'email', 'phone'];
      const clientUpdate: any = { 
        updated_at: new Date().toISOString(), 
        metadata: project.client?.metadata || {} 
      };
      
      formConfig.forEach(f => {
        const val = editFormData[f.db_key];
        if (standardCols.includes(f.db_key)) {
          clientUpdate[f.db_key] = val;
        } else {
          clientUpdate.metadata[f.db_key] = val;
        }
      });

      if (project.client_id) {
        const { error: clientError } = await supabase.from('leads').update(clientUpdate).eq('id', project.client_id);
        if (clientError) throw clientError;
      }

      const { error: deleteAssignError } = await supabase.from('project_assignments').delete().eq('project_id', id);
      if (deleteAssignError) throw deleteAssignError;

      if (editFormData.assigned_team?.length > 0) {
        const assignments = editFormData.assigned_team.map((profileId: string) => ({ 
          project_id: id, 
          profile_id: profileId,
          created_at: new Date().toISOString()
        }));
        
        const { error: insertAssignError } = await supabase.from('project_assignments').insert(assignments);
        if (insertAssignError) throw insertAssignError;
      }

      showNotification("Project specifications synchronized.", "success");
      setShowEditModal(false);
      await fetchData();
    } catch (err: any) {
      console.error("Update Error:", err);
      showNotification(`Synchronization failed: ${err.message}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', project.id);
      
      if (error) throw error;
      
      showNotification("Project moved to Archive.", "info");
      navigate('/projects');
    } catch (err: any) {
      showNotification("Failed to archive project: " + err.message, "error");
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const getClientValue = (dbKey: string) => {
    const client = project?.client as Lead;
    if (!client) return 'N/A';
    const val = client[dbKey as keyof Lead] !== undefined ? client[dbKey as keyof Lead] : client.metadata?.[dbKey];
    return (val === null || val === undefined || val === '') ? 'N/A' : val;
  };

  const getIconForField = (dbKey: string) => {
    const key = dbKey.toLowerCase();
    if (key.includes('foundation')) return <Layers className="w-5 h-5 text-emerald-500 opacity-30" />;
    if (key.includes('unit')) return <Grid className="w-5 h-5 text-emerald-500 opacity-30" />;
    if (key.includes('bed')) return <Bed className="w-5 h-5 text-emerald-500 opacity-30" />;
    if (key.includes('bath')) return <Bath className="w-5 h-5 text-emerald-500 opacity-30" />;
    if (key.includes('stair')) return <ListTree className="w-5 h-5 text-emerald-500 opacity-30" />;
    if (key.includes('area') || key.includes('land')) return <Ruler className="w-5 h-5 text-emerald-500 opacity-30" />;
    if (key.includes('budget') || key.includes('fee')) return <Banknote className="w-5 h-5 text-emerald-500 opacity-30" />;
    if (key.includes('package')) return <Briefcase className="w-5 h-5 text-emerald-500 opacity-30" />;
    if (key.includes('visit') || key.includes('date')) return <Calendar className="w-5 h-5 text-emerald-500 opacity-30" />;
    if (key.includes('location')) return <Globe className="w-5 h-5 text-emerald-500 opacity-30" />;
    return <Info className="w-5 h-5 text-emerald-500 opacity-30" />;
  };

  if (loading || !project) return <div className="h-[80vh] flex flex-col items-center justify-center gap-6"><RefreshCw className="w-12 h-12 text-[#064e3b] animate-spin" /></div>;

  const statusConfig = {
    'Upcoming': { style: 'bg-blue-50 text-blue-700 border-blue-200', icon: Clock },
    'Running': { style: 'bg-slate-900 text-white border-transparent', icon: Activity },
    'Complete': { style: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 }
  };
  const statusDisplay = statusConfig[project.status] || statusConfig['Upcoming'];

  const architecturalFields = formConfig.filter(f => (f.section === 'Architecture' || f.section === 'Financials') && f.visible);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 animate-in fade-in duration-500">
      
      {/* Main Details View */}
      <div className="max-w-[1440px] mx-auto px-4 pt-6 space-y-6">
        <header className="flex flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button onClick={() => navigate(-1)} className="w-9 h-9 bg-white border border-slate-200 rounded-lg shadow-sm flex items-center justify-center hover:bg-slate-50 transition-all shrink-0"><ArrowLeft className="w-4 h-4 text-slate-500" /></button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight truncate leading-none uppercase">{project.name}</h1>
                <div className="relative" ref={statusDropdownRef}>
                  <button 
                    onClick={() => setShowStatusMenu(!showStatusMenu)}
                    className={`px-2 py-0.5 rounded-md text-[7px] font-bold uppercase tracking-widest border flex items-center gap-1 transition-all active:scale-95 leading-none ${statusDisplay.style}`}
                  >
                    {isUpdatingStatus ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <statusDisplay.icon className="w-3 h-3" />}
                    {project.status}
                    <ChevronDown className={`w-2.5 h-2.5 opacity-50 transition-transform ${showStatusMenu ? 'rotate-180' : ''}`} />
                  </button>
                  {showStatusMenu && (
                    <div className="absolute top-full left-0 mt-1 w-32 bg-white border border-slate-200 rounded-lg shadow-xl z-[120] p-1 space-y-0.5 animate-in fade-in slide-in-from-top-1">
                      {(['Upcoming', 'Running', 'Complete'] as ProjectStatus[]).map(s => (
                        <button 
                          key={s} 
                          onClick={() => handleUpdateStatus(s)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-md text-[8px] font-bold uppercase tracking-widest transition-all ${project.status === s ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50'}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <p className="text-slate-400 text-[8px] font-bold uppercase tracking-widest mt-1 leading-none">ID: {project.id.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setShowEditModal(true)} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[8px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-sm hover:bg-emerald-700 transition-all leading-none"><Users2 className="w-3 h-3" /> Team</button>
            <button onClick={() => setShowEditModal(true)} className="px-3 py-1.5 bg-[#064e3b] text-white rounded-lg text-[8px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-sm hover:bg-emerald-900 transition-all leading-none"><Edit3 className="w-3 h-3" /> Edit</button>
            <button onClick={() => setShowDeleteModal(true)} className="p-1.5 bg-white border border-slate-200 text-slate-300 hover:text-red-500 rounded-lg transition-all shadow-sm"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-12 lg:col-span-8 space-y-5">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
               <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
                  <div className="w-7 h-7 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center border border-emerald-100"><Compass className="w-3.5 h-3.5" /></div>
                  <div><h3 className="text-[9px] font-bold text-slate-900 uppercase tracking-widest leading-none">Blueprint</h3></div>
               </div>
               
               <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-4">
                  {architecturalFields.map((f) => (
                    <div key={f.id} className="space-y-0.5">
                       <p className="text-[7px] font-bold text-slate-300 uppercase tracking-widest leading-none">{f.label}</p>
                       <div className="flex items-center gap-1.5 font-bold text-slate-900 text-[13px] leading-tight truncate uppercase tracking-tight">
                          <span className="text-sm truncate">{getClientValue(f.db_key)}</span>
                       </div>
                    </div>
                  ))}
                  <div className="space-y-0.5">
                     <p className="text-[7px] font-bold text-slate-300 uppercase tracking-widest leading-none">Budget</p>
                     <div className="flex items-center gap-1.5 font-bold text-sm text-emerald-700 leading-none">
                        Tk. {project.budget.toLocaleString()}
                     </div>
                  </div>
                  <div className="space-y-0.5">
                     <p className="text-[7px] font-bold text-slate-300 uppercase tracking-widest leading-none">Start Date</p>
                     <div className="flex items-center gap-1.5 font-bold text-sm text-slate-900 leading-none">
                        {new Date(project.start_date).toLocaleDateString()}
                     </div>
                  </div>
               </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
               <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center border border-blue-100"><Users className="w-3.5 h-3.5" /></div>
                    <div><h3 className="text-[9px] font-bold text-slate-900 uppercase tracking-widest leading-none">Design Team</h3></div>
                  </div>
                  <button onClick={() => setShowEditModal(true)} className="px-2 py-0.5 bg-slate-50 text-slate-500 rounded-md text-[7px] font-bold uppercase tracking-widest border border-slate-200 leading-none">Manage</button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {project.assignments && project.assignments.length > 0 ? (
                    project.assignments.map((assignment: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-white transition-all group">
                         {assignment.profile && (
                           <>
                             <img 
                               src={assignment.profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${assignment.profile.email || assignment.profile.full_name}`} 
                               className="w-10 h-10 rounded-lg bg-white shadow-sm border border-slate-200 object-cover" 
                               alt={assignment.profile.full_name} 
                             />
                             <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-slate-900 truncate leading-none uppercase">{assignment.profile.full_name}</p>
                                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1 leading-none">{assignment.profile.designation || 'Staff'}</p>
                             </div>
                             <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <a href={`tel:${assignment.profile.phone}`} className="p-1 px-1.5 bg-white border border-slate-200 text-slate-400 hover:text-emerald-500 rounded-md transition-all"><PhoneCall className="w-3 h-3" /></a>
                                <a href={`mailto:${assignment.profile.email}`} className="p-1 px-1.5 bg-white border border-slate-200 text-slate-400 hover:text-blue-500 rounded-md transition-all"><Mail className="w-3 h-3" /></a>
                             </div>
                           </>
                         )}
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-6 text-center bg-slate-50/20 rounded-lg border border-dashed border-slate-200">
                       <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">No personnel assigned</p>
                    </div>
                  )}
               </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4 space-y-5">
             <div className="bg-slate-900 p-6 rounded-xl shadow-lg relative overflow-hidden text-white">
                <div className="relative z-10 space-y-4">
                   <div className="space-y-0.5"><p className="text-[8px] font-bold text-emerald-400/50 uppercase tracking-widest leading-none">Property Principal</p><h3 className="text-lg font-bold text-white tracking-tight leading-none uppercase">{project.client?.client_name || 'Individual'}</h3></div>
                   <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
                      <div className="w-10 h-10 bg-emerald-600 text-white rounded-lg flex items-center justify-center font-bold text-base shadow-lg overflow-hidden shrink-0">
                        {project.client?.metadata?.avatar_url ? (
                          <img src={project.client.metadata.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
                        ) : (
                          project.client?.client_name?.charAt(0) || '?'
                        )}
                      </div>
                      <div><p className="text-[7px] text-white/30 font-bold uppercase tracking-widest leading-none mb-1">Affiliation Date</p><p className="text-sm font-bold text-white leading-none">{project.client?.converted_at ? new Date(project.client.converted_at).toLocaleDateString() : 'N/A'}</p></div>
                   </div>
                   <div className="space-y-2">
                      <a href={`tel:${project.client?.phone}`} className="flex items-center justify-between p-3 bg-emerald-700 text-white rounded-lg shadow-md hover:bg-emerald-600 transition-all"><div className="flex items-center gap-3"><PhoneCall className="w-3.5 h-3.5" /><span className="text-xs font-bold leading-none">{project.client?.phone}</span></div><ArrowLeft className="w-3 h-3 rotate-[135deg] opacity-50" /></a>
                   </div>
                </div>
             </div>
             
             <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-4"><Map className="w-4 h-4 text-emerald-500" /><h3 className="text-[9px] font-bold text-slate-900 uppercase tracking-widest leading-none">Site Logistics</h3></div>
                <div className="space-y-3">
                   {[
                     { label: 'Address', value: project.client?.address },
                     { label: 'Upazila', value: project.client?.upazila },
                     { label: 'Village', value: project.client?.village_name || 'N/A' },
                   ].map((loc, i) => (
                     <div key={i} className="flex justify-between items-start pb-3 border-b border-slate-50 last:border-0 last:pb-0"><span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest leading-none">{loc.label}</span><span className="text-[10px] font-bold text-slate-700 text-right leading-none uppercase">{loc.value}</span></div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetails;