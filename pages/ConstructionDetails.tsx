
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Hammer, HardHat, Building2, MapPin, 
  Calendar, CheckCircle2, Clock, Activity, Edit3, 
  Plus, Save, X, RefreshCw, Layers, ShieldCheck,
  User, MessageSquare, ChevronRight, History,
  Ruler, Grid, Bed, Bath, ListTree, Banknote,
  Globe, Info, ChevronDown, Briefcase, Compass,
  Home, Zap
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useNotification, useUser } from '../App';
import { Lead, FormFieldConfig } from '../types';
import { DEFAULT_FORM_CONFIG } from './Settings';

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

const STATUS_OPTIONS = ['Active', 'On Hold', 'Completed'];

interface SiteLog {
  id: string;
  log_notes: string;
  stage_recorded: string;
  progress_recorded: number;
  created_at: string;
  creator?: { full_name: string };
}

const ConstructionDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { profile } = useUser();
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  
  const [site, setSite] = useState<any>(null);
  const [logs, setLogs] = useState<SiteLog[]>([]);
  const [formConfig, setFormConfig] = useState<FormFieldConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [newLog, setNewLog] = useState({
    log_notes: '',
    stage_recorded: '',
    progress_recorded: 0
  });

  useEffect(() => {
    fetchSiteData();
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [id]);

  const fetchSiteData = async () => {
    try {
      setLoading(true);
      const [siteRes, logsRes, configRes] = await Promise.all([
        supabase.from('construction_projects').select('*, project:projects(*, client:leads(*))').eq('id', id).single(),
        supabase.from('construction_logs').select('*, creator:profiles(full_name)').eq('construction_project_id', id).order('created_at', { ascending: false }),
        supabase.from('settings').select('*').eq('key', 'lead_form_config').single()
      ]);

      if (siteRes.error) throw siteRes.error;
      
      setSite(siteRes.data);
      setLogs(logsRes.data || []);
      setFormConfig(configRes.data?.value || DEFAULT_FORM_CONFIG);
      
      setNewLog({
        log_notes: '',
        stage_recorded: siteRes.data.current_stage,
        progress_recorded: siteRes.data.progress
      });
    } catch (err: any) {
      showNotification("Vault access failure.", "error");
      navigate('/construction');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (isUpdatingStatus) return;
    setIsUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('construction_projects')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      
      setSite({ ...site, status: newStatus });
      showNotification(`Site status updated to ${newStatus}.`, "success");
      setShowStatusDropdown(false);
    } catch (err: any) {
      showNotification(`Status sync failed: ${err.message}`, "error");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLog.log_notes.trim()) return;
    
    setIsSaving(true);
    try {
      const creatorId = profile?.id || (await supabase.auth.getUser()).data.user?.id;
      
      const { error: logError } = await supabase.from('construction_logs').insert([{
        construction_project_id: id,
        log_notes: newLog.log_notes,
        stage_recorded: newLog.stage_recorded,
        progress_recorded: newLog.progress_recorded,
        created_by: creatorId
      }]);

      if (logError) throw logError;

      const { error: siteError } = await supabase.from('construction_projects').update({
        current_stage: newLog.stage_recorded,
        progress: newLog.progress_recorded,
        updated_at: new Date().toISOString()
      }).eq('id', id);

      if (siteError) throw siteError;

      showNotification("Observation synchronized and site records updated.", "success");
      setShowLogModal(false);
      fetchSiteData();
    } catch (err: any) {
      showNotification(`Sync Error: ${err.message}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const getClientValue = (dbKey: string) => {
    const client = site?.project?.client as Lead;
    if (!client) return 'N/A';
    const val = client[dbKey as keyof Lead] !== undefined ? client[dbKey as keyof Lead] : client.metadata?.[dbKey];
    if (val === null || val === undefined || val === '') return 'N/A';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    return val;
  };

  const getIconForField = (dbKey: string) => {
    const key = dbKey.toLowerCase();
    if (key.includes('foundation') || key.includes('store')) return <Layers className="w-5 h-5 text-emerald-500 opacity-30" />;
    if (key.includes('unit')) return <Grid className="w-5 h-5 text-emerald-500 opacity-30" />;
    if (key.includes('bed')) return <Bed className="w-5 h-5 text-emerald-500 opacity-30" />;
    if (key.includes('bath')) return <Bath className="w-5 h-5 text-emerald-500 opacity-30" />;
    if (key.includes('stair')) return <ListTree className="w-5 h-5 text-emerald-500 opacity-30" />;
    if (key.includes('area') || key.includes('land')) return <Ruler className="w-5 h-5 text-emerald-500 opacity-30" />;
    if (key.includes('budget') || key.includes('fee')) return <Banknote className="w-5 h-5 text-emerald-500 opacity-30" />;
    if (key.includes('package')) return <Briefcase className="w-5 h-5 text-emerald-500 opacity-30" />;
    if (key.includes('visit') || key.includes('date')) return <Calendar className="w-5 h-5 text-emerald-500 opacity-30" />;
    if (key.includes('location') || key.includes('country')) return <Globe className="w-5 h-5 text-emerald-500 opacity-30" />;
    return <Info className="w-5 h-5 text-emerald-500 opacity-30" />;
  };

  const getSectionIcon = (section: string) => {
    switch (section) {
      case 'Identity': return <User className="w-4 h-4 text-emerald-500" />;
      case 'Architecture': return <Home className="w-4 h-4 text-emerald-500" />;
      case 'Logistics': return <Zap className="w-4 h-4 text-emerald-500" />;
      case 'Financials': return <Banknote className="w-4 h-4 text-emerald-500" />;
      case 'Interests': return <ShieldCheck className="w-4 h-4 text-emerald-500" />;
      default: return <Compass className="w-4 h-4 text-emerald-500" />;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20';
      case 'On Hold': return 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20';
      case 'Completed': return 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20';
      default: return 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10';
    }
  };

  if (loading || !site) return (
    <div className="h-[80vh] flex flex-col items-center justify-center gap-6 text-slate-400">
      <RefreshCw className="w-12 h-12 text-[#064e3b] animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em]">ACCESSING SITE BLUEPRINT...</p>
    </div>
  );

  const architecturalFields = formConfig.filter(f => (f.section === 'Architecture' || f.section === 'Interests' || f.section === 'Logistics') && f.visible);

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-48 animate-in fade-in duration-700 overflow-x-hidden">
      
      {/* ADD OBSERVATION MODAL */}
      {showLogModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white rounded-[48px] p-8 md:p-14 max-w-2xl w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
              <div className="flex justify-between items-start mb-12 relative z-10">
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">Record Observation</h3>
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mt-2">SITE VISIT & PROGRESS SYNCHRONIZATION</p>
                </div>
                <button onClick={() => setShowLogModal(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-red-500 transition-all"><X className="w-6 h-6" /></button>
              </div>

              <form onSubmit={handleAddLog} className="space-y-10 relative z-10">
                 <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Visit Narrative</label>
                    <textarea 
                      required 
                      className="w-full h-32 p-6 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-bold text-slate-700 outline-none focus:bg-white transition-all shadow-inner resize-none" 
                      placeholder="Detail findings, material status, or labor coordination..."
                      value={newLog.log_notes} 
                      onChange={e => setNewLog({...newLog, log_notes: e.target.value})} 
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-3">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Update Milestone</label>
                       <div className="relative">
                          <select 
                            className="w-full h-16 px-8 bg-slate-50 border border-slate-100 rounded-[28px] text-sm font-bold text-slate-700 outline-none appearance-none cursor-pointer"
                            value={newLog.stage_recorded}
                            onChange={e => setNewLog({...newLog, stage_recorded: e.target.value})}
                          >
                            {CONSTRUCTION_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none rotate-90" />
                       </div>
                    </div>
                    <div className="space-y-3">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Site Maturity (%)</label>
                       <input 
                         type="number" min="0" max="100"
                         className="w-full h-16 px-8 bg-slate-50 border border-slate-100 rounded-[28px] text-sm font-bold text-emerald-700 outline-none focus:bg-white transition-all shadow-inner" 
                         value={newLog.progress_recorded} 
                         onChange={e => setNewLog({...newLog, progress_recorded: Number(e.target.value)})} 
                       />
                    </div>
                 </div>

                 <button type="submit" disabled={isSaving} className="w-full py-8 bg-[#064e3b] text-white rounded-[32px] text-[12px] font-black uppercase tracking-[0.3em] hover:bg-black transition-all flex items-center justify-center gap-4 shadow-2xl active:scale-95 disabled:opacity-50">
                   {isSaving ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6 text-emerald-400" />} AUTHORIZE SITE UPDATE
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="bg-[#0f172a] pt-20 pb-40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#064e3b]/10 blur-[150px] rounded-full pointer-events-none" />
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 relative z-10">
          <button onClick={() => navigate('/construction')} className="flex items-center gap-3 text-white/40 hover:text-white transition-colors mb-12 text-[11px] font-black uppercase tracking-widest group">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> Back to Sites
          </button>

          <div className="flex flex-col lg:flex-row justify-between items-start gap-12">
            <div className="space-y-6 max-w-2xl">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-[24px] flex items-center justify-center text-emerald-400 shadow-2xl backdrop-blur-md">
                   <HardHat className="w-8 h-8" />
                </div>
                
                {/* Status Dropdown */}
                <div className="relative" ref={statusDropdownRef}>
                  <button 
                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    className={`px-6 py-2 border rounded-full text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 active:scale-95 ${getStatusStyle(site.status)}`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${site.status === 'Active' ? 'bg-emerald-400 animate-pulse' : 'bg-current'}`} />
                    Status: {site.status}
                    <ChevronDown className={`w-3.5 h-3.5 opacity-50 transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showStatusDropdown && (
                    <div className="absolute top-full left-0 mt-3 w-48 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-[120] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 p-2 space-y-1">
                      {STATUS_OPTIONS.map(s => (
                        <button 
                          key={s} 
                          onClick={() => handleUpdateStatus(s)}
                          className={`w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-between group ${site.status === s ? 'bg-white/10 text-white' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
                        >
                          {s}
                          {site.status === s && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h1 className="text-5xl font-black text-white tracking-tight leading-tight">{site.title}</h1>
                <p className="text-white/40 text-[11px] font-black uppercase tracking-[0.3em] mt-4 flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-emerald-500" /> Linked Design: {site.project?.name || 'Unlinked'}
                </p>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 p-10 rounded-[56px] backdrop-blur-xl flex flex-col md:flex-row items-center gap-12 shadow-3xl">
              <div className="relative w-40 h-40">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/10" />
                  <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={440} strokeDashoffset={440 - (440 * site.progress) / 100} strokeLinecap="round" className="text-emerald-500 transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-white">{site.progress}%</span>
                  <span className="text-[8px] font-black text-white/30 uppercase tracking-widest mt-1">Maturity</span>
                </div>
              </div>
              <div className="space-y-6">
                 <div>
                   <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Active Phase</p>
                   <p className="text-xl font-black text-white mt-1">{site.current_stage}</p>
                 </div>
                 <button onClick={() => setShowLogModal(true)} className="px-8 py-4 bg-emerald-500 text-white rounded-[22px] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3">
                    <Plus className="w-4 h-4" /> Log Observation
                 </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT GRID */}
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 -mt-24 relative z-20 grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* MAIN AREA */}
        <div className="lg:col-span-8 space-y-12">
           {/* IMPORTED CLIENT DATA SECTION */}
           <div className="bg-white p-12 md:p-16 rounded-[64px] border border-slate-100 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
              <div className="flex items-center gap-5 pb-10 border-b border-slate-50 mb-12">
                  <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-[22px] flex items-center justify-center shadow-sm">
                    {/* Fix: Added missing Compass component to imports and used here */}
                    <Compass className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.3em]">Imported Client & Blueprint Specs</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Design Parameters Ported from Portfolio</p>
                  </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-12 gap-x-8">
                 {architecturalFields.map((f) => (
                   <div key={f.id} className="space-y-2 group">
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest group-hover:text-emerald-500 transition-colors">{f.label}</p>
                      <div className="flex items-center gap-3 font-black text-slate-900">
                         <div className="opacity-40 group-hover:opacity-100 transition-opacity">
                            {getIconForField(f.db_key)}
                         </div>
                         <span className="text-lg truncate">{getClientValue(f.db_key)}</span>
                      </div>
                   </div>
                 ))}
                 {/* Explicitly show budget if available from project */}
                 <div className="space-y-2 group">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest group-hover:text-emerald-500 transition-colors">Design Budget</p>
                    <div className="flex items-center gap-3 font-black text-emerald-600">
                       <Banknote className="w-5 h-5 opacity-30" />
                       <span className="text-lg">Tk. {site.project?.budget?.toLocaleString() || 'N/A'}</span>
                    </div>
                 </div>
              </div>
           </div>

           {/* OBSERVATION LOGS */}
           <div className="bg-white p-12 md:p-16 rounded-[64px] border border-slate-100 shadow-xl space-y-12">
              <div className="flex justify-between items-center pb-8 border-b border-slate-50">
                 <div className="flex items-center gap-4">
                    <History className="w-6 h-6 text-emerald-500" />
                    <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.3em]">Site Observation Log</h3>
                 </div>
                 <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{logs.length} Entries</span>
              </div>

              <div className="space-y-12 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-100">
                {logs.length === 0 ? (
                   <div className="py-20 text-center">
                      <MessageSquare className="w-16 h-16 text-slate-100 mx-auto mb-6" />
                      <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest">No site visits recorded yet</p>
                   </div>
                ) : logs.map((log) => (
                  <div key={log.id} className="relative pl-12 group">
                     <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:border-emerald-500 transition-colors">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-emerald-500 transition-colors" />
                     </div>
                     <div className="bg-slate-50/50 rounded-[40px] p-10 border border-transparent hover:border-slate-100 hover:bg-white transition-all space-y-8 group-hover:shadow-xl group-hover:shadow-slate-200/20">
                        <div className="flex flex-wrap justify-between items-start gap-4">
                           <div className="space-y-1.5">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                 <Calendar className="w-3.5 h-3.5" /> 
                                 {new Date(log.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                              </p>
                              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">{log.stage_recorded}</p>
                           </div>
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-400">
                                 <User className="w-5 h-5" />
                              </div>
                              <div>
                                 <p className="text-[12px] font-black text-slate-900 leading-none">{log.creator?.full_name || 'Legacy Profile'}</p>
                                 <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Visiting Architect</p>
                              </div>
                           </div>
                        </div>
                        
                        <p className="text-slate-600 text-sm font-medium leading-relaxed italic border-l-4 border-emerald-500/20 pl-6 py-1">
                          "{log.log_notes}"
                        </p>

                        <div className="flex items-center gap-6 pt-6 border-t border-slate-100/50">
                           <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Logged Maturity:</span>
                              <span className="text-sm font-black text-[#064e3b]">{log.progress_recorded}%</span>
                           </div>
                        </div>
                     </div>
                  </div>
                ))}
              </div>
           </div>
        </div>

        {/* SIDEBAR INTEL */}
        <div className="lg:col-span-4 space-y-12">
           <div className="bg-white p-12 rounded-[56px] border border-slate-100 shadow-xl shadow-slate-200/20">
              <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em] mb-10 flex items-center gap-4">
                <ShieldCheck className="w-6 h-6 text-emerald-500" /> Execution Metadata
              </h3>
              <div className="space-y-8">
                 {[
                   { label: 'Commencement', val: new Date(site.start_date).toLocaleDateString() },
                   { label: 'Site Alias', val: site.title },
                   { label: 'Client Entity', val: site.project?.client?.client_name || 'Individual' },
                   { label: 'Site Contact', val: site.project?.client?.phone || 'N/A' },
                   { label: 'Operational Status', val: site.status },
                 ].map((meta, i) => (
                    <div key={i} className="flex justify-between items-start pb-6 border-b border-slate-50 last:border-0 last:pb-0">
                       <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1">{meta.label}</span>
                       <span className="text-[12px] font-black text-slate-700 text-right max-w-[150px]">{meta.val}</span>
                    </div>
                 ))}
              </div>
              <div className="mt-12 pt-10 border-t border-slate-50 space-y-4">
                 <button onClick={() => navigate(`/projects/${site.project_id}`)} className="w-full py-5 bg-slate-950 text-white rounded-[24px] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#064e3b] transition-all flex items-center justify-center gap-3 active:scale-95 shadow-2xl shadow-slate-900/20">
                    <Building2 className="w-4 h-4 text-emerald-400" /> Open Design Vault
                 </button>
                 <button onClick={() => navigate(`/leads/${site.project?.client?.id}`)} className="w-full py-5 bg-slate-50 text-slate-600 rounded-[24px] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-100 transition-all flex items-center justify-center gap-3 active:scale-95 border border-slate-100">
                    <User className="w-4 h-4 text-slate-400" /> Client Profile
                 </button>
              </div>
           </div>

           <div className="bg-emerald-950 p-12 rounded-[56px] shadow-3xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[80px] rounded-full pointer-events-none" />
              <div className="relative z-10 space-y-8">
                 <div className="flex items-center gap-4 text-emerald-400">
                    <Activity className="w-6 h-6" />
                    <p className="text-[11px] font-black uppercase tracking-[0.3em]">Health Protocol</p>
                 </div>
                 <h4 className="text-2xl font-black text-white tracking-tight leading-tight">Sync observation data every 48 hours for site fidelity.</h4>
                 <p className="text-white/30 text-xs font-medium leading-relaxed">Regular logging ensures that design intent translates perfectly into structural reality.</p>
                 <div className="pt-4">
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                       <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${site.progress}%` }} />
                    </div>
                    <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mt-3">Vault Connection: Encrypted</p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ConstructionDetails;
