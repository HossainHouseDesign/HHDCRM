import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Hammer, HardHat, Building2, MapPin, 
  Calendar, CheckCircle2, Clock, Activity, Edit3, 
  Plus, Save, X, RefreshCw, Layers, ShieldCheck,
  User, MessageSquare, ChevronRight, History,
  Ruler, Grid, Bed, Bath, ListTree, Banknote,
  Globe, Info, ChevronDown, Briefcase, Compass,
  Home, Zap, Trash2, AlertTriangle
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const executeSoftDelete = async () => {
    if (!site) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('construction_projects')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', site.id);
      
      if (error) throw error;
      showNotification("Site record moved to Recycle Bin.", "info");
      navigate('/construction');
    } catch (err: any) {
      showNotification("Archive failed: " + err.message, "error");
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
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
    <div className="min-h-screen bg-[#f8fafc] pb-32 animate-in fade-in duration-700 overflow-x-hidden relative">
      
      {/* DELETE MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300 text-center leading-none">
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-4 mx-auto leading-none">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase leading-none">Archive Site?</h3>
            <p className="text-slate-400 font-bold mt-2 text-[10px] leading-relaxed uppercase tracking-tight">
              SOFT-DELETE <span className="text-slate-900">"{site.title}"</span>. ITEM WILL REMAIN RETRIEVABLE VIA RECYCLE BIN.
            </p>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 text-slate-300 text-[10px] font-black uppercase tracking-widest hover:text-slate-900 transition-all leading-none focus:outline-none">Cancel</button>
              <button 
                onClick={executeSoftDelete} 
                disabled={isDeleting} 
                className="flex-1 py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all flex items-center justify-center gap-2 leading-none"
              >
                {isDeleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD OBSERVATION MODAL */}
      {showLogModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white rounded-3xl p-6 md:p-8 max-w-xl w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 relative overflow-hidden">
              <div className="flex justify-between items-start mb-6 leading-none">
                <div className="leading-none">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase leading-none">Record Progress</h3>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1 opacity-80 leading-none">OBSERVATION LOG SYNCHRONIZATION</p>
                </div>
                <button onClick={() => setShowLogModal(false)} className="p-1.5 bg-slate-50 text-slate-300 rounded-lg hover:text-slate-900 transition-all focus:outline-none leading-none"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleAddLog} className="space-y-4 relative z-10 leading-none">
                 <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Observational Notes</label>
                    <textarea 
                      required 
                      className="w-full h-24 p-3 bg-white border border-slate-200 rounded-xl text-[12px] font-bold text-slate-700 outline-none focus:border-slate-900 transition-all shadow-none resize-none" 
                      placeholder="Detail findings, material status, or labor coordination..."
                      value={newLog.log_notes} 
                      onChange={e => setNewLog({...newLog, log_notes: e.target.value})} 
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-3 leading-none">
                    <div className="space-y-1 leading-none">
                       <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Active Milestone</label>
                       <div className="relative leading-none">
                          <select 
                            className="w-full h-10 px-4 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-700 outline-none appearance-none cursor-pointer"
                            value={newLog.stage_recorded}
                            onChange={e => setNewLog({...newLog, stage_recorded: e.target.value})}
                          >
                            {CONSTRUCTION_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-300 pointer-events-none" />
                       </div>
                    </div>
                    <div className="space-y-1 leading-none">
                       <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Maturity (%)</label>
                       <input 
                         type="number" min="0" max="100"
                         className="w-full h-10 px-4 bg-white border border-slate-200 rounded-xl text-[12px] font-black text-slate-900 outline-none focus:border-slate-900 transition-all shadow-none leading-none" 
                         value={newLog.progress_recorded} 
                         onChange={e => setNewLog({...newLog, progress_recorded: Number(e.target.value)})} 
                       />
                    </div>
                 </div>

                 <button type="submit" disabled={isSaving} className="w-full py-4 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 leading-none">
                   {isSaving ? <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> : <Save className="w-4 h-4 text-emerald-400" />} Transmit Data
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="bg-[#0f172a] pt-6 md:pt-10 pb-20 md:pb-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="max-w-[1240px] mx-auto px-4 md:px-6 relative z-10 leading-none">
          <div className="flex justify-between items-center mb-6 md:mb-8 leading-none">
            <button onClick={() => navigate('/construction')} className="flex items-center gap-2 text-white/30 hover:text-white transition-colors text-[9px] font-black uppercase tracking-widest group leading-none">
              <ArrowLeft className="w-4 h-4" /> Back to Workspace
            </button>
            <button onClick={() => setShowDeleteModal(true)} className="p-2 bg-white/5 border border-white/10 text-white/40 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all active:scale-95 leading-none">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col lg:flex-row justify-between items-start gap-8 leading-none">
            <div className="space-y-3 md:space-y-4 max-w-xl leading-none">
              <div className="flex items-center gap-3 leading-none">
                <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-emerald-400 shadow-none backdrop-blur-md leading-none">
                   <HardHat className="w-5 h-5" />
                </div>
                
                <div className="relative leading-none" ref={statusDropdownRef}>
                  <button 
                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    className={`px-3 py-1 border rounded-full text-[7px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 active:scale-95 leading-none ${getStatusStyle(site.status)}`}
                  >
                    <div className={`w-1 h-1 rounded-full ${site.status === 'Active' ? 'bg-emerald-400 animate-pulse' : 'bg-current'}`} />
                    {site.status}
                    <ChevronDown className={`w-2.5 h-2.5 opacity-50 transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showStatusDropdown && (
                    <div className="absolute top-full left-0 mt-2 w-40 bg-[#0f172a] border border-white/10 rounded-xl shadow-2xl z-[120] overflow-hidden p-1 space-y-0.5 leading-none">
                      {STATUS_OPTIONS.map(s => (
                        <button 
                          key={s} 
                          onClick={() => handleUpdateStatus(s)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-[7px] font-black uppercase tracking-widest transition-all flex items-center justify-between group leading-none ${site.status === s ? 'bg-white/10 text-white' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
                        >
                          {s}
                          {site.status === s && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="leading-none">
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight uppercase leading-none">{site.title}</h1>
                <p className="text-white/40 text-[8px] font-black uppercase tracking-widest mt-2 flex items-center gap-2 leading-none">
                  <Building2 className="w-3 h-3 text-white/60" /> DESIGN: {site.project?.name || 'UNLINKED ARCHIVE'}
                </p>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 p-5 md:p-6 rounded-[32px] backdrop-blur-xl flex items-center gap-6 md:gap-8 shadow-none group transition-all hover:bg-white/10 leading-none">
              <div className="relative w-20 h-20 md:w-24 md:h-24 shrink-0 leading-none">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="50%" cy="50%" r="42%" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-white/10" />
                  <circle cx="50%" cy="50%" r="42%" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={264} strokeDashoffset={264 - (264 * site.progress) / 100} strokeLinecap="round" className="text-emerald-500 transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center translate-y-0.5 leading-none">
                  <span className="text-lg md:text-xl font-black text-white leading-none">{site.progress}%</span>
                  <span className="text-[5px] font-black text-white/30 uppercase tracking-widest mt-0.5 leading-none">Maturity</span>
                </div>
              </div>
              <div className="space-y-3 leading-none">
                 <div className="leading-none">
                   <p className="text-[7px] font-black text-white/40 uppercase tracking-widest leading-none">Active Phase</p>
                   <p className="text-base md:text-lg font-black text-white leading-none uppercase mt-1">{site.current_stage}</p>
                 </div>
                 <button onClick={() => setShowLogModal(true)} className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-[8px] font-black uppercase tracking-widest shadow-none hover:bg-emerald-600 transition-all flex items-center gap-1.5 leading-none">
                    <Plus className="w-3 h-3" /> Log Visit
                 </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT GRID */}
      <div className="max-w-[1240px] mx-auto px-4 md:px-6 -mt-10 md:-mt-12 relative z-20 grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20 leading-none">
        
        {/* MAIN AREA */}
        <div className="lg:col-span-8 space-y-6 leading-none">
           {/* IMPORTED CLIENT DATA SECTION */}
           <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-200 shadow-none relative overflow-hidden transition-all hover:bg-slate-50/20 leading-none">
              <div className="flex items-center gap-3 pb-6 border-b border-slate-50 mb-6 md:mb-8 leading-none">
                  <div className="w-9 h-9 bg-slate-50 text-slate-300 rounded-xl flex items-center justify-center shadow-none leading-none">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div className="leading-none">
                    <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-none">Design Specifications</h3>
                    <p className="text-[8px] text-slate-300 font-bold uppercase tracking-widest mt-1.5 leading-none opacity-80">Blueprint Ported from Archive</p>
                  </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 md:gap-y-8 gap-x-4 md:gap-x-6 leading-none">
                 {architecturalFields.map((f) => (
                   <div key={f.id} className="space-y-1.5 group leading-none">
                      <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest group-hover:text-slate-900 transition-colors leading-none">{f.label}</p>
                      <div className="flex items-center gap-2 font-black text-slate-700 leading-none mt-1">
                         <span className="text-[13px] tracking-tight uppercase truncate leading-none">{getClientValue(f.db_key)}</span>
                      </div>
                   </div>
                 ))}
                 <div className="space-y-1.5 group leading-none">
                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest group-hover:text-slate-900 transition-colors leading-none">Design Budget</p>
                    <div className="flex items-center gap-2 font-black text-slate-900 leading-none mt-1">
                       <span className="text-[13px] tracking-tight text-slate-950 leading-none uppercase">৳{site.project?.budget?.toLocaleString() || 'N/A'}</span>
                    </div>
                 </div>
              </div>
           </div>

           {/* OBSERVATION LOGS */}
           <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-200 shadow-none space-y-6 md:space-y-8 transition-all hover:bg-slate-50/20 leading-none">
              <div className="flex justify-between items-center pb-6 border-b border-slate-50 leading-none">
                 <div className="flex items-center gap-3 leading-none">
                    <History className="w-4 h-4 text-slate-900" />
                    <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-none">Observatory Chronicle</h3>
                 </div>
                 <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-none">{logs.length} RECORDS</span>
              </div>

              <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1.5px] before:bg-slate-50 leading-none">
                {logs.length === 0 ? (
                   <div className="py-12 md:py-16 text-center leading-none">
                      <MessageSquare className="w-10 h-10 text-slate-100 mx-auto mb-3 grayscale leading-none" />
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none">Archive Empty</p>
                   </div>
                ) : logs.map((log) => (
                  <div key={log.id} className="relative pl-7 md:pl-8 group leading-none">
                     <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-white border border-slate-100 flex items-center justify-center group-hover:border-slate-900 transition-colors leading-none shadow-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-100 group-hover:bg-slate-900 transition-colors leading-none" />
                     </div>
                     <div className="bg-slate-50/30 rounded-2xl p-4 md:p-5 border border-transparent hover:border-slate-100 hover:bg-white transition-all space-y-4 leading-none">
                        <div className="flex flex-wrap justify-between items-center gap-3 leading-none">
                           <div className="space-y-1 leading-none">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 leading-none opacity-80">
                                 <Calendar className="w-2.5 h-2.5" /> 
                                 {new Date(log.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                              <p className="text-[9px] font-black text-slate-900 uppercase tracking-widest leading-none mt-1">{log.stage_recorded}</p>
                           </div>
                           <div className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-100 rounded-lg shadow-none leading-none">
                               <User className="w-2.5 h-2.5 text-slate-300" />
                               <span className="text-[8px] font-black text-slate-400 leading-none uppercase">{log.creator?.full_name?.split(' ')[0] || 'ADMIN'}</span>
                           </div>
                        </div>
                        
                        <p className="text-slate-600 text-[11px] font-bold leading-relaxed border-l-2 border-slate-100 pl-3 py-0.5 leading-none">
                          {log.log_notes}
                        </p>

                        <div className="flex items-center gap-3 pt-3 border-t border-slate-50 leading-none">
                           <div className="flex items-center gap-1.5 leading-none">
                              <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest leading-none">Maturity:</span>
                              <span className="text-[10px] font-black text-slate-900 uppercase leading-none">{log.progress_recorded}%</span>
                           </div>
                        </div>
                     </div>
                  </div>
                ))}
              </div>
           </div>
        </div>

        {/* SIDEBAR INTEL */}
        <div className="lg:col-span-4 space-y-6 leading-none">
           <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-200 shadow-none leading-none">
              <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-6 md:mb-8 flex items-center gap-2.5 leading-none">
                <ShieldCheck className="w-4 h-4 text-slate-900" /> Operational Context
              </h3>
              <div className="space-y-4 md:space-y-5 leading-none">
                 {[
                   { label: 'Initialization', val: new Date(site.start_date).toLocaleDateString('en-GB') },
                   { label: 'Identification', val: site.title },
                   { label: 'Client Entity', val: site.project?.client?.client_name || 'Individual' },
                   { label: 'Access Node', val: site.project?.client?.phone || 'N/A' },
                   { label: 'Status Tier', val: site.status },
                 ].map((meta, i) => (
                    <div key={i} className="flex justify-between items-start pb-3.5 border-b border-slate-50 last:border-0 last:pb-0 leading-none">
                       <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-1 leading-none">{meta.label}</span>
                       <span className="text-[11px] font-black text-slate-700 text-right max-w-[150px] uppercase leading-tight">{meta.val}</span>
                    </div>
                 ))}
              </div>
              <div className="mt-8 pt-8 border-t border-slate-50 space-y-2 md:space-y-3 leading-none">
                 <button onClick={() => navigate(`/projects/${site.project_id}`)} className="w-full py-4 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 active:scale-95 shadow-none leading-none">
                    <Building2 className="w-3.5 h-3.5 text-emerald-400" /> ARCHIVE VAULT
                 </button>
                 <button onClick={() => navigate(`/leads/${site.project?.client?.id}`)} className="w-full py-4 bg-white text-slate-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2 active:scale-95 border border-slate-100 leading-none">
                    <User className="w-3.5 h-3.5 text-slate-200" /> CLIENT RECORD
                 </button>
              </div>
           </div>

           <div className="bg-[#0f172a] p-6 md:p-8 rounded-[32px] shadow-none relative overflow-hidden group leading-none">
              <div className="relative z-10 space-y-5 md:space-y-6 leading-none">
                 <div className="flex items-center gap-3 text-emerald-400 leading-none">
                    <Activity className="w-4 h-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest leading-none">Health Protocol</p>
                 </div>
                 <h4 className="text-lg md:text-xl font-black text-white tracking-tight leading-tight uppercase leading-none">Maintain a 48-hour sync cycle for site fidelity.</h4>
                 <p className="text-white/30 text-[9px] font-bold uppercase tracking-wide leading-relaxed leading-none">Design intent synchronization ensures structural integrity across all execution phases.</p>
                 <div className="pt-2 leading-none">
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden leading-none">
                       <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${site.progress}%` }} />
                    </div>
                    <p className="text-[7px] font-black text-emerald-600 uppercase tracking-widest mt-2 leading-none opacity-80">Vault Connection: Secure Encryption</p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ConstructionDetails;