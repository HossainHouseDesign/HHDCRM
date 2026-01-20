
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Briefcase, MapPin, Ruler, Users, Calendar, 
  CheckCircle2, Clock, Grid, Bed, Bath, ListTree, Banknote,
  PhoneCall, RefreshCw, Compass, ShieldCheck, Mail,
  Edit3, Trash2, Hash, Map, Layers, X, Save, Activity, Layout, Info, Globe
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Project, Lead, Profile, ProjectStatus, FormFieldConfig } from '../types';
import { DEFAULT_FORM_CONFIG } from './Settings';

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [formConfig, setFormConfig] = useState<FormFieldConfig[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal & Edit State
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [editFormData, setEditFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [projRes, teamRes, configRes] = await Promise.all([
        supabase.from('projects').select('*, client:leads(*), assignments:project_assignments(profile:profiles(*))').eq('id', id).single(),
        supabase.from('profiles').select('*').is('deleted_at', null).eq('status', 'active'),
        supabase.from('settings').select('*').eq('key', 'lead_form_config').single()
      ]);
      
      if (projRes.error) throw projRes.error;
      
      const currentProject = projRes.data;
      const currentClient = currentProject.client as Lead;
      const currentConfig = configRes.data?.value || DEFAULT_FORM_CONFIG;

      setProject(currentProject);
      setTeamMembers(teamRes.data || []);
      setFormConfig(currentConfig);
      
      // Initialize Edit Form with project and client data
      const initialForm: any = {
        name: currentProject.name,
        status: currentProject.status,
        budget: currentProject.budget,
        start_date: currentProject.start_date,
        description: currentProject.description || '',
        assigned_team: currentProject.assignments?.map((a: any) => a.profile.id) || []
      };

      // Add architectural fields from client
      currentConfig.forEach((f: FormFieldConfig) => {
        initialForm[f.db_key] = currentClient[f.db_key as keyof Lead] !== undefined 
          ? currentClient[f.db_key as keyof Lead] 
          : currentClient.metadata?.[f.db_key];
      });

      setEditFormData(initialForm);

    } catch (err) {
      console.error(err);
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !project) return;
    setIsSaving(true);
    try {
      // 1. Update Project record
      await supabase.from('projects').update({
        name: editFormData.name,
        status: editFormData.status,
        budget: editFormData.budget,
        start_date: editFormData.start_date,
        description: editFormData.description,
        updated_at: new Date().toISOString()
      }).eq('id', id);
      
      // 2. Prepare architectural sync payload
      const standardCols = ['foundation', 'unit_count', 'bedroom_count', 'bathroom_count', 'stair_details', 'land_area', 'package', 'asking_fee', 'address', 'upazila', 'social_media', 'email', 'phone'];
      const clientUpdate: any = { updated_at: new Date().toISOString(), metadata: project.client?.metadata || {} };
      
      formConfig.forEach(f => {
        const val = editFormData[f.db_key];
        if (standardCols.includes(f.db_key)) {
          clientUpdate[f.db_key] = val;
        } else {
          clientUpdate.metadata[f.db_key] = val;
        }
      });

      await supabase.from('leads').update(clientUpdate).eq('id', project.client_id);

      // 3. Update Team
      await supabase.from('project_assignments').delete().eq('project_id', id);
      if (editFormData.assigned_team?.length > 0) {
        await supabase.from('project_assignments').insert(
          editFormData.assigned_team.map((profileId: string) => ({ project_id: id, profile_id: profileId }))
        );
      }

      setShowEditModal(false);
      await fetchData();
    } catch (err: any) {
      alert("Synchronization failed: " + err.message);
    } finally {
      setIsSaving(false);
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

  const client = project.client as Lead;
  const statusDisplay = {
    'Upcoming': { style: 'bg-blue-50 text-blue-700 border-blue-200', icon: Clock },
    'Running': { style: 'bg-slate-900 text-white border-transparent', icon: Activity },
    'Complete': { style: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 }
  }[project.status];

  // Group dynamic architectural fields
  const architecturalFields = formConfig.filter(f => (f.section === 'Architecture' || f.section === 'Financials') && f.visible);

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-32 animate-in fade-in duration-700">
      
      {/* Dynamic Spec Modification Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-xl overflow-y-auto">
          <div className="bg-white rounded-[56px] p-10 md:p-14 max-w-4xl w-full shadow-2xl my-10 relative">
            <div className="flex justify-between items-start mb-14">
              <div>
                <h3 className="text-4xl font-black text-slate-900 tracking-tight">Sync Architectural Logic</h3>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mt-3">Refining Execution Portfolio Specifications</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:text-red-500 transition-all"><X className="w-6 h-6" /></button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Project Phase</label>
                   <select className="w-full h-16 px-8 bg-slate-50 rounded-[24px] text-[14px] font-bold text-slate-700 outline-none focus:bg-white transition-all shadow-inner" value={editFormData.status} onChange={e => setEditFormData({...editFormData, status: e.target.value as ProjectStatus})}>
                      {['Upcoming', 'Running', 'Complete'].map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
                </div>
                <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Execution Budget (BDT)</label>
                   <input type="number" className="w-full h-16 px-8 bg-slate-50 rounded-[24px] text-[14px] font-bold text-emerald-700 outline-none focus:bg-white transition-all shadow-inner" value={editFormData.budget} onChange={e => setEditFormData({...editFormData, budget: Number(e.target.value)})} />
                </div>
              </div>

              <div className="bg-slate-50/50 p-10 rounded-[48px] border border-slate-100 space-y-10">
                 <h4 className="text-[11px] font-black text-[#064e3b] uppercase tracking-[0.3em] flex items-center gap-3"><Layout className="w-4 h-4" /> Technical Overrides (Synced to Master Client Record)</h4>
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                    {architecturalFields.map(f => (
                       <div key={f.id} className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">{f.label}</label>
                          {f.type === 'select' ? (
                             <select className="w-full h-14 px-6 bg-white border border-slate-100 rounded-2xl font-bold text-slate-700" value={editFormData[f.db_key] || ''} onChange={e => setEditFormData({...editFormData, [f.db_key]: e.target.value})}>
                                <option value="">Select Option</option>
                                {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                             </select>
                          ) : (
                             <input type={f.type === 'number' ? 'number' : 'text'} className="w-full h-14 px-6 bg-white border border-slate-100 rounded-2xl font-bold text-slate-700" value={editFormData[f.db_key] || ''} onChange={e => setEditFormData({...editFormData, [f.db_key]: e.target.value})} />
                          )}
                       </div>
                    ))}
                 </div>
              </div>

              <button type="submit" disabled={isSaving} className="w-full py-9 bg-[#064e3b] text-white rounded-[32px] font-black uppercase tracking-[0.4em] text-[13px] shadow-2xl flex items-center justify-center gap-4 transition-all hover:bg-black active:scale-95">
                {isSaving ? <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" /> : <Save className="w-6 h-6 text-emerald-400" />} Synchronize All Data Segments
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-[1440px] mx-auto px-6 md:px-12 pt-12 space-y-12">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="flex items-center gap-8 min-w-0">
            <button onClick={() => navigate(-1)} className="w-14 h-14 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center justify-center hover:bg-slate-50 transition-all shrink-0"><ArrowLeft className="w-6 h-6 text-slate-500" /></button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-4">
                <h1 className="text-4xl font-black text-slate-900 tracking-tight truncate">{project.name}</h1>
                <div className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-sm border flex items-center gap-2 ${statusDisplay.style}`}><statusDisplay.icon className="w-4 h-4" />{project.status}</div>
              </div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em] mt-3 flex items-center gap-3"><Hash className="w-3.5 h-3.5 text-emerald-500" /> PROJECT RECORD: {project.id.slice(0, 12).toUpperCase()}</p>
            </div>
          </div>
          <button onClick={() => setShowEditModal(true)} className="px-10 py-5 bg-[#064e3b] text-white rounded-[24px] text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-3 shadow-2xl hover:bg-black transition-all"><Edit3 className="w-4 h-4" /> Edit Technical Spec</button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-8 space-y-12">
            <div className="bg-white p-12 md:p-16 rounded-[64px] border border-slate-100 shadow-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
               <div className="flex items-center gap-5 pb-10 border-b border-slate-50 mb-12">
                  <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-[22px] flex items-center justify-center shadow-sm"><Compass className="w-7 h-7" /></div>
                  <div><h3 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.3em]">Architectural Master Blueprint</h3><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Synced Dynamic Site Parameters</p></div>
               </div>
               
               <div className="grid grid-cols-2 md:grid-cols-3 gap-y-16 gap-x-12">
                  {architecturalFields.map((f, i) => (
                    <div key={f.id} className="space-y-3 group">
                       <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest group-hover:text-emerald-500 transition-colors">{f.label}</p>
                       <div className="flex items-center gap-3.5 font-black text-lg text-slate-900">
                          {getIconForField(f.db_key)}
                          {getClientValue(f.db_key)}
                       </div>
                    </div>
                  ))}
                  <div className="space-y-3 group">
                     <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Execution Budget</p>
                     <div className="flex items-center gap-3.5 font-black text-lg text-emerald-600">
                        <Banknote className="w-5 h-5 opacity-30" /> Tk. {project.budget.toLocaleString()}
                     </div>
                  </div>
                  <div className="space-y-3 group">
                     <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Team Assigned</p>
                     <div className="flex items-center gap-3.5 font-black text-lg text-slate-900">
                        <Users className="w-5 h-5 text-emerald-500 opacity-30" /> {project.assignments?.length || 0} Members
                     </div>
                  </div>
               </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-12">
             <div className="bg-[#0f172a] p-12 rounded-[64px] shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
                <div className="relative z-10 space-y-10">
                   <div className="space-y-2"><p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.4em]">Project Owner Profile</p><h3 className="text-3xl font-black text-white tracking-tight leading-tight">{client?.client_name || 'Individual Client'}</h3></div>
                   <div className="flex items-center gap-6 p-8 bg-white/5 rounded-[40px] border border-white/5">
                      <div className="w-20 h-20 bg-emerald-500 text-white rounded-[28px] flex items-center justify-center font-black text-3xl shadow-2xl shadow-emerald-900/40">{client?.client_name.charAt(0)}</div>
                      <div><p className="text-[10px] text-white/40 font-black uppercase tracking-widest">Active Client Since</p><p className="text-lg font-black text-white mt-1">{client?.converted_at ? new Date(client.converted_at).toLocaleDateString() : 'N/A'}</p></div>
                   </div>
                   <div className="space-y-4">
                      <a href={`tel:${client?.phone}`} className="flex items-center justify-between p-7 bg-emerald-600 text-white rounded-[32px] shadow-xl hover:bg-emerald-500 transition-all group/call"><div className="flex items-center gap-5"><PhoneCall className="w-6 h-6 group-hover/call:rotate-12 transition-transform" /><span className="text-base font-black tracking-tight">{client?.phone}</span></div><ArrowLeft className="w-5 h-5 rotate-[135deg] opacity-50" /></a>
                   </div>
                </div>
             </div>
             
             <div className="bg-white p-12 rounded-[64px] border border-slate-100 shadow-xl shadow-slate-200/20">
                <div className="flex items-center gap-4 mb-10"><Map className="w-6 h-6 text-emerald-500" /><h3 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.3em]">Site Logistics</h3></div>
                <div className="space-y-8">
                   {[
                     { label: 'District', value: client?.address },
                     { label: 'Upazila', value: client?.upazila },
                     { label: 'Village / Area', value: client?.village_name || 'N/A' },
                   ].map((loc, i) => (
                     <div key={i} className="flex justify-between items-start pb-6 border-b border-slate-50 last:border-0 last:pb-0 group"><span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1 group-hover:text-emerald-500 transition-colors">{loc.label}</span><span className="text-[12px] font-black text-slate-700 text-right">{loc.value}</span></div>
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
