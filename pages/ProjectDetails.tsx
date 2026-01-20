
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Briefcase, MapPin, Ruler, Users, Calendar, 
  CheckCircle2, Clock, Grid, Bed, Bath, ListTree, Banknote,
  PhoneCall, RefreshCw, Compass, ShieldCheck, Mail,
  Edit3, Trash2, Hash, Map, Layers, X, Save, Activity
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Project, Lead, Profile, ProjectStatus } from '../types';

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal & Edit State
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [editFormData, setEditFormData] = useState({
    name: '',
    status: 'Upcoming' as ProjectStatus,
    budget: 0,
    start_date: '',
    description: '',
    assigned_team: [] as string[],
    // Architectural Overrides (Synced to Master Lead record)
    foundation: '',
    unit_count: '',
    bedroom_count: '',
    bathroom_count: '',
    stair_details: '',
    land_area: '',
    package: '',
    asking_fee: 0
  });

  useEffect(() => {
    fetchProject();
    fetchTeam();
  }, [id]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('*, client:leads(*), assignments:project_assignments(profile:profiles(*))')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      setProject(data);
      
      const client = data.client as Lead;
      
      // Prep edit form with synced specs
      setEditFormData({
        name: data.name,
        status: data.status,
        budget: data.budget,
        start_date: data.start_date,
        description: data.description || '',
        assigned_team: data.assignments?.map((a: any) => a.profile.id) || [],
        foundation: client?.foundation || '',
        unit_count: client?.unit_count || '',
        bedroom_count: client?.bedroom_count || '',
        bathroom_count: client?.bathroom_count || '',
        stair_details: client?.stair_details || '',
        land_area: client?.land_area || '',
        package: client?.package || '',
        asking_fee: client?.asking_fee || 0
      });
    } catch (err) {
      console.error(err);
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeam = async () => {
    const { data } = await supabase.from('profiles').select('*').is('deleted_at', null).eq('status', 'active');
    setTeamMembers(data || []);
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
      
      // 2. Sync Technical Overrides back to Client record (Leads Table)
      await supabase.from('leads').update({
        foundation: editFormData.foundation,
        unit_count: editFormData.unit_count,
        bedroom_count: editFormData.bedroom_count,
        bathroom_count: editFormData.bathroom_count,
        stair_details: editFormData.stair_details,
        land_area: editFormData.land_area,
        package: editFormData.package,
        asking_fee: editFormData.asking_fee,
        updated_at: new Date().toISOString()
      }).eq('id', project.client_id);

      // 3. Update Team
      await supabase.from('project_assignments').delete().eq('project_id', id);
      if (editFormData.assigned_team.length > 0) {
        await supabase.from('project_assignments').insert(
          editFormData.assigned_team.map(profileId => ({ project_id: id, profile_id: profileId }))
        );
      }

      setShowEditModal(false);
      await fetchProject();
    } catch (err: any) {
      alert("Synchronization failed: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !project) return <div className="h-[80vh] flex flex-col items-center justify-center gap-6"><RefreshCw className="w-12 h-12 text-[#064e3b] animate-spin" /></div>;

  const client = project.client as Lead;
  const statusDisplay = {
    'Upcoming': { style: 'bg-blue-50 text-blue-700 border-blue-200', icon: Clock },
    'Running': { style: 'bg-slate-900 text-white border-transparent', icon: Activity },
    'Complete': { style: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 }
  }[project.status];

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
                <div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Internal Title</label><input required className="w-full h-16 px-8 bg-slate-50 border-transparent rounded-[24px] text-[14px] font-bold text-slate-700 outline-none focus:bg-white transition-all shadow-inner" value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})} /></div>
                <div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Project Phase</label><select className="w-full h-16 px-8 bg-slate-50 rounded-[24px] text-[14px] font-bold text-slate-700 outline-none focus:bg-white transition-all" value={editFormData.status} onChange={e => setEditFormData({...editFormData, status: e.target.value as ProjectStatus})}>{['Upcoming', 'Running', 'Complete'].map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              </div>

              <div className="bg-slate-50/50 p-10 rounded-[48px] border border-slate-100 space-y-10">
                 <h4 className="text-[11px] font-black text-[#064e3b] uppercase tracking-[0.3em] flex items-center gap-3"><Layers className="w-4 h-4" /> Technical Parameters (Synced to Master Client Record)</h4>
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                    <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Foundation</label><select className="w-full h-14 px-6 bg-white border border-slate-100 rounded-2xl" value={editFormData.foundation} onChange={e => setEditFormData({...editFormData, foundation: e.target.value})}>{['1 Store','2 Store','3 Store','4 Store','5 Store','6 Store','7 Store','8 Store','9 Store','10 Store'].map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                    <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Units</label><select className="w-full h-14 px-6 bg-white border border-slate-100 rounded-2xl" value={editFormData.unit_count} onChange={e => setEditFormData({...editFormData, unit_count: e.target.value})}>{['1 Unit','2 Units','3 Units','4 Units'].map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                    <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Design Package</label><select className="w-full h-14 px-6 bg-white border border-slate-100 rounded-2xl" value={editFormData.package} onChange={e => setEditFormData({...editFormData, package: e.target.value})}>{['Basic Drafting', 'Standard Architectural', 'Premium Engineering', 'Luxury Full-Service'].map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                    <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Beds</label><input type="number" className="w-full h-14 px-6 bg-white border border-slate-100 rounded-2xl" value={editFormData.bedroom_count} onChange={e => setEditFormData({...editFormData, bedroom_count: e.target.value})} /></div>
                    <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Baths</label><input type="number" className="w-full h-14 px-6 bg-white border border-slate-100 rounded-2xl" value={editFormData.bathroom_count} onChange={e => setEditFormData({...editFormData, bathroom_count: e.target.value})} /></div>
                    <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Land Area</label><input className="w-full h-14 px-6 bg-white border border-slate-100 rounded-2xl" value={editFormData.land_area} onChange={e => setEditFormData({...editFormData, land_area: e.target.value})} /></div>
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
            <button onClick={() => navigate('/projects')} className="w-14 h-14 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center justify-center hover:bg-slate-50 transition-all shrink-0"><ArrowLeft className="w-6 h-6 text-slate-500" /></button>
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
                  <div><h3 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.3em]">Architectural Master Blueprint</h3><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Synced Site Parameters</p></div>
               </div>
               
               <div className="grid grid-cols-2 md:grid-cols-3 gap-y-16 gap-x-12">
                  {[
                    { label: 'Foundation Type', value: client?.foundation || 'N/A', icon: Layers },
                    { label: 'Units Per Floor', value: client?.unit_count || 'N/A', icon: Grid },
                    { label: 'Bedrooms', value: client?.bedroom_count || 'N/A', icon: Bed },
                    { label: 'Bathrooms', value: client?.bathroom_count || 'N/A', icon: Bath },
                    { label: 'Stair Case', value: client?.stair_details || 'N/A', icon: ListTree },
                    { label: 'Design Package', value: client?.package || 'N/A', icon: Briefcase },
                    { label: 'Project Budget', value: `Tk. ${project.budget.toLocaleString()}`, icon: Banknote, color: 'text-emerald-600' },
                    { label: 'Verified Land Area', value: client?.land_area || 'N/A', icon: Ruler },
                    { label: 'Assigned Team', value: `${project.assignments?.length || 0} Members`, icon: Users },
                  ].map((item, i) => (
                    <div key={i} className="space-y-3 group">
                       <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest group-hover:text-emerald-500 transition-colors">{item.label}</p>
                       <div className={`flex items-center gap-3.5 font-black text-lg ${item.color || 'text-slate-900'}`}><item.icon className="w-5 h-5 text-emerald-500 opacity-30" />{item.value}</div>
                    </div>
                  ))}
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
                   <div className="pt-8 border-t border-white/10 flex items-center gap-4"><ShieldCheck className="w-5 h-5 text-emerald-500" /><p className="text-[10px] text-white/30 font-black uppercase tracking-[0.2em]">Validated Architectural Record</p></div>
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
