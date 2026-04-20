import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { SiteVisit, Project, Lead, Profile, PaymentStatus, VisitStatus } from '../types';
import { useNotification, useUser } from '../App';
import { 
  ArrowLeft, MapPin, Calendar, Users, 
  RefreshCw, Edit3, Trash2, Hash, Building2, 
  FileText, User, ChevronRight, X, Save,
  CheckCircle2, Info, Clock, ShieldCheck, Mail, PhoneCall,
  Search, Coins, Wallet, Banknote, Target, PauseCircle, CheckCheck,
  ChevronDown
} from 'lucide-react';

const SiteVisitDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { profile } = useUser();
  
  const [visit, setVisit] = useState<SiteVisit | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Quick Status Dropdown State
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const statusMenuRef = useRef<HTMLDivElement>(null);

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Edit Form State
  const [formData, setFormData] = useState({
    project_id: '',
    lead_id: '',
    location: '',
    visit_date: '',
    payment_status: 'Free' as PaymentStatus,
    status: 'Upcoming' as VisitStatus,
    notes: '',
    assigned_team: [] as string[]
  });

  // Autocomplete search states
  const [entityQuery, setEntityQuery] = useState('');
  const [showEntityDrop, setShowEntityDrop] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
    
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowEntityDrop(false);
      }
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
      }
    };
    
    const handleScroll = () => setShowStatusDropdown(false);

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [visitRes, projRes, leadsRes, staffRes] = await Promise.all([
        supabase.from('site_visits').select('*, project:projects(*, client:leads(*)), lead:leads(*), creator:profiles!scheduled_by(full_name), assignments:site_visit_assignments(profile:profiles(*))').eq('id', id).single(),
        supabase.from('projects').select('*, client:leads(*)').is('deleted_at', null),
        supabase.from('leads').select('*').is('deleted_at', null),
        supabase.from('profiles').select('*').is('deleted_at', null).eq('status', 'active')
      ]);

      if (visitRes.error) throw visitRes.error;
      
      const v = visitRes.data;
      setVisit(v);
      setProjects(projRes.data || []);
      setLeads(leadsRes.data || []);
      setStaff(staffRes.data || []);

      setFormData({
        project_id: v.project_id || '',
        lead_id: v.lead_id || '',
        location: v.location,
        visit_date: v.visit_date,
        payment_status: (v.payment_status as PaymentStatus) || 'Free',
        status: (v.status as VisitStatus) || 'Upcoming',
        notes: v.notes || '',
        assigned_team: (v.assignments || []).map((a: any) => a.profile.id)
      });
      setEntityQuery(v.project?.name || v.lead?.client_name || '');
    } catch (err: any) {
      showNotification("Vault Sync Failed: " + err.message, "error");
      navigate('/site-visits');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: VisitStatus) => {
    if (!visit || isUpdatingStatus) return;
    setIsUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('site_visits')
        .update({ status: newStatus })
        .eq('id', visit.id);
      
      if (error) throw error;
      
      setVisit({ ...visit, status: newStatus });
      setFormData(prev => ({ ...prev, status: newStatus }));
      showNotification(`Execution status updated to ${newStatus}.`, "success");
      setShowStatusDropdown(false);
    } catch (err: any) {
      showNotification(`Update failed: ${err.message}`, "error");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const toggleStatusDropdown = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDropdownPos({ top: rect.bottom + 8, left: rect.left });
    setShowStatusDropdown(!showStatusDropdown);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { error: updateError } = await supabase.from('site_visits').update({
        project_id: formData.project_id || null,
        lead_id: formData.lead_id || null,
        location: formData.location,
        visit_date: formData.visit_date,
        payment_status: formData.payment_status,
        status: formData.status,
        notes: formData.notes
      }).eq('id', id);

      if (updateError) throw updateError;

      await supabase.from('site_visit_assignments').delete().eq('site_visit_id', id);
      
      if (formData.assigned_team.length > 0) {
        const assignments = formData.assigned_team.map(pid => ({
          site_visit_id: id,
          profile_id: pid
        }));
        await supabase.from('site_visit_assignments').insert(assignments);
      }

      showNotification("Site record synchronized.", "success");
      setShowEditModal(false);
      fetchData();
    } catch (err: any) {
      showNotification("Update Failed: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('site_visits').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      showNotification("Moved to Bin.", "info");
      navigate('/site-visits');
    } catch (err: any) {
      showNotification("Archive Failed: " + err.message, "error");
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const getVisitStatusStyle = (status: VisitStatus) => {
    switch (status) {
      case 'Upcoming': return 'bg-blue-600 text-white border-blue-500 shadow-xl shadow-blue-600/20 hover:bg-blue-700';
      case 'Done': return 'bg-emerald-600 text-white border-emerald-500 shadow-xl shadow-emerald-600/20 hover:bg-emerald-700';
      case 'Hold': return 'bg-rose-600 text-white border-rose-500 shadow-xl shadow-rose-600/20 hover:bg-rose-700';
      default: return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  if (loading || !visit) return <div className="h-[80vh] flex flex-col items-center justify-center gap-6 text-slate-400"><RefreshCw className="w-12 h-12 animate-spin text-[#064e3b]" /><p className="text-[10px] font-black uppercase tracking-widest">ACCESSING SITE ARCHIVE...</p></div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-32 animate-in fade-in duration-700 overflow-x-hidden relative">
      
      {/* DELETE MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl border border-slate-200 text-center animate-in zoom-in-95">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-xl flex items-center justify-center mb-6 mx-auto shadow-sm"><Trash2 className="w-7 h-7" /></div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-2">Archive Record?</h3>
            <p className="text-slate-500 leading-relaxed font-semibold mb-6 text-[11px] uppercase tracking-wider">THIS OPERATION IS SYNCHRONOUS AND IRREVERSIBLE.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 bg-slate-50 text-slate-500 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-100 transition-all">Cancel</button>
              <button onClick={handleArchive} disabled={isDeleting} className="flex-1 py-3 bg-red-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-700 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-none">{isDeleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Archive</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] p-8 md:p-10 max-w-2xl w-full shadow-2xl border border-slate-200 animate-in zoom-in-95 overflow-y-auto max-h-[95vh] no-scrollbar relative">
            <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-5">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Modify Site Logs</h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">STATUS & PERSONNEL AUDIT</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-all text-slate-300"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-6 relative z-10">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Location Node</label>
                    <input required className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl text-[13px] font-bold text-slate-700 outline-none focus:bg-white focus:border-emerald-500 shadow-none" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Visit Date</label>
                    <input required type="date" className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl text-[13px] font-bold text-slate-700 outline-none focus:bg-white focus:border-emerald-500 transition-all shadow-none" value={formData.visit_date} onChange={e => setFormData({...formData, visit_date: e.target.value})} />
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Protocol</label>
                    <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl">
                       {(['Pre-paid', 'Post-paid', 'Free'] as PaymentStatus[]).map(s => (
                         <button key={s} type="button" onClick={() => setFormData({...formData, payment_status: s})} className={`py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${formData.payment_status === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{s}</button>
                       ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Execution Status</label>
                    <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl">
                       {(['Upcoming', 'Done', 'Hold'] as VisitStatus[]).map(s => (
                         <button key={s} type="button" onClick={() => setFormData({...formData, status: s})} className={`py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${formData.status === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{s}</button>
                       ))}
                    </div>
                  </div>
               </div>

               <div className="space-y-3">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">Deploy Team ({formData.assigned_team.length})</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 px-1 max-h-40 overflow-y-auto no-scrollbar">
                     {staff.map(s => {
                       const active = formData.assigned_team.includes(s.id);
                       return (
                         <button key={s.id} type="button" onClick={() => setFormData(prev => ({ ...prev, assigned_team: active ? prev.assigned_team.filter(i => i !== s.id) : [...prev.assigned_team, s.id] }))} className={`flex items-center gap-2 p-2 rounded-xl border transition-all text-left group ${active ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}>
                            <img src={s.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.email || s.full_name}`} className="w-7 h-7 rounded shadow-none object-cover shrink-0 bg-slate-50" alt={s.full_name} />
                            <p className="text-[10px] font-black uppercase truncate leading-none">{s.full_name}</p>
                         </button>
                       );
                     })}
                  </div>
               </div>

               <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Objectives / Field Notes</label>
                  <textarea className="w-full h-20 p-4 bg-slate-50 border border-slate-100 rounded-xl text-[13px] font-bold text-slate-700 outline-none focus:bg-white focus:border-emerald-500 resize-none shadow-none" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
               </div>

               <button type="submit" disabled={isSaving} className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-950 transition-all flex items-center justify-center gap-3 shadow-none disabled:opacity-50 active:scale-95">
                 {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-emerald-400" />} Synchronize Data
               </button>
            </form>
          </div>
        </div>
      )}

      {/* QUICK STATUS DROPDOWN MENU */}
      {showStatusDropdown && (
        <div 
          ref={statusMenuRef}
          className="fixed min-w-[180px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-[300] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 p-1.5 space-y-0.5"
          style={{ top: dropdownPos.top, left: dropdownPos.left }}
        >
          <div className="px-3 py-1.5 mb-1 border-b border-slate-50"><p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Update Protocol</p></div>
          {(['Upcoming', 'Done', 'Hold'] as VisitStatus[]).map(s => (
            <button 
              key={s} 
              disabled={isUpdatingStatus}
              onClick={() => handleStatusUpdate(s)} 
              className={`w-full text-left px-3 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-between group/st ${visit.status === s ? 'bg-slate-900 text-white shadow-none' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <div className="flex items-center gap-2.5">
                 {s === 'Upcoming' && <Clock className="w-3.5 h-3.5" />}
                 {s === 'Done' && <CheckCheck className="w-3.5 h-3.5" />}
                 {s === 'Hold' && <PauseCircle className="w-3.5 h-3.5" />}
                 {s}
              </div>
              {visit.status === s && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
            </button>
          ))}
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="bg-slate-900 pt-16 pb-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="flex justify-between items-center mb-8">
            <button onClick={() => navigate('/site-visits')} className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-[9px] font-black uppercase tracking-widest group leading-none">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Core
            </button>
            <div className="flex items-center gap-2">
               <button onClick={() => setShowEditModal(true)} className="p-2.5 bg-white/5 border border-white/5 text-white/40 hover:text-emerald-400 hover:bg-emerald-400/5 rounded-xl transition-all shadow-none"><Edit3 className="w-4 h-4" /></button>
               <button onClick={() => setShowDeleteModal(true)} className="p-2.5 bg-white/5 border border-white/5 text-white/40 hover:text-red-400 hover:bg-red-400/5 rounded-xl transition-all shadow-none"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
             <div className="space-y-4 flex-1">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-white/5 border border-white/5 rounded-xl flex items-center justify-center text-emerald-500 backdrop-blur-md shadow-none"><MapPin className="w-5 h-5" /></div>
                   <button 
                     onClick={toggleStatusDropdown}
                     className={`px-3 py-1.5 rounded-full text-[8.5px] font-black uppercase tracking-widest border flex items-center gap-2 transition-all active:scale-95 shadow-none ${getVisitStatusStyle(visit.status).replace('shadow-xl shadow-blue-600/20', 'shadow-none').replace('shadow-xl shadow-emerald-600/20', 'shadow-none').replace('shadow-xl shadow-rose-600/20', 'shadow-none')}`}
                    >
                      {visit.status === 'Upcoming' && <Clock className="w-3 h-3" />}
                      {visit.status === 'Done' && <CheckCheck className="w-3 h-3" />}
                      {visit.status === 'Hold' && <PauseCircle className="w-3 h-3" />}
                      {visit.status}
                      <ChevronDown className={`w-2.5 h-2.5 text-white/40 transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
                   </button>
                </div>
                <div className="leading-none">
                   <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight uppercase leading-none">{visit.project?.client?.client_name || visit.lead?.client_name}</h1>
                   <div className="flex items-center gap-3 mt-3">
                      <p className="text-slate-500 text-[8.5px] font-black uppercase tracking-widest flex items-center gap-2"><Target className="w-3 h-3 text-emerald-500" /> ID: {visit.id.slice(0, 8).toUpperCase()}</p>
                   </div>
                </div>
             </div>

             <div className="bg-white/5 border border-white/5 p-6 md:p-8 rounded-[32px] backdrop-blur-xl flex flex-col md:flex-row items-center gap-6 md:gap-10 shadow-none">
                <div className="text-center md:text-left space-y-0.5 leading-none">
                  <p className="text-[8.5px] font-black text-slate-500 uppercase tracking-widest">Visit Date</p>
                  <p className="text-2xl font-black text-white tracking-tight">{new Date(visit.visit_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}</p>
                </div>
                <div className="w-[1px] h-10 bg-white/5 hidden md:block" />
                <div className="text-center md:text-left space-y-0.5 leading-none">
                  <p className="text-[8.5px] font-black text-slate-500 uppercase tracking-widest">Authorized By</p>
                  <p className="text-base font-black text-emerald-500 uppercase tracking-tight">{visit.creator?.full_name || 'System'}</p>
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-10 relative z-20 grid grid-cols-1 lg:grid-cols-12 gap-6">
         <div className="lg:col-span-8 space-y-6">
            <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
               <div className="flex items-center gap-3 pb-6 border-b border-slate-50 mb-8 leading-none">
                  <div className="w-10 h-10 bg-slate-50 text-slate-900 rounded-xl flex items-center justify-center shadow-none border border-slate-100"><Info className="w-5 h-5" /></div>
                  <div><h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Audit Logs</h3><p className="text-[8.5px] text-slate-300 font-black uppercase tracking-widest mt-1">Field Intelligence</p></div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8 leading-none uppercase">
                  <div className="space-y-1.5"><p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Location Node</p><div className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 text-emerald-500 mt-0.5" /><span className="text-[13px] font-black text-slate-900 leading-none">{visit.location}</span></div></div>
                  <div className="space-y-1.5"><p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Protocol</p><div className="flex items-center gap-2"><Banknote className="w-3.5 h-3.5 text-emerald-500" /><span className="text-[13px] font-black text-slate-900">{visit.payment_status}</span></div></div>
                  <div className="space-y-1.5"><p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Resource Type</p><div className="flex items-center gap-2">{visit.project ? <Building2 className="w-3.5 h-3.5 text-blue-500" /> : <FileText className="w-3.5 h-3.5 text-emerald-400" />}<span className="text-[13px] font-black text-slate-900">{visit.project ? 'Active Proj' : 'Lead Doc'}</span></div></div>
               </div>
               <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-100/50 leading-relaxed"><p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-2 leading-none"><FileText className="w-3 h-3 text-emerald-500" /> MISSION SCOPE</p><p className="text-slate-600 text-sm font-bold italic">"{visit.notes || 'Static environment. No specific objectives.'}"</p></div>
            </div>

            <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm transition-all hover:shadow-md">
               <div className="flex items-center gap-3 pb-6 border-b border-slate-50 mb-8 leading-none"><div className="w-10 h-10 bg-slate-50 text-slate-900 rounded-xl flex items-center justify-center shadow-none border border-slate-100"><Users className="w-5 h-5" /></div><div><h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Personnel Matrix</h3><p className="text-[8.5px] text-slate-300 font-black uppercase tracking-widest mt-1">Authorized Field Assets</p></div></div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {visit.assignments && visit.assignments.length > 0 ? visit.assignments.map((assignment: any, idx: number) => (
                    assignment.profile && (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-2xl border border-transparent hover:border-slate-100 hover:bg-white transition-all group leading-none">
                         <img src={assignment.profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${assignment.profile.email || assignment.profile.full_name}`} className="w-10 h-10 rounded-xl bg-white shadow-none border border-slate-100 group-hover:scale-105 transition-transform object-cover" alt={assignment.profile.full_name} />
                         <div className="min-w-0 flex-1 uppercase">
                            <p className="text-[12px] font-black text-slate-900 truncate tracking-tight">{assignment.profile.full_name}</p>
                            <p className="text-[8.5px] font-black text-slate-300 truncate mt-1">{assignment.profile.designation || 'Staff'}</p>
                            <div className="flex items-center gap-1.5 mt-2">
                               <a href={`tel:${assignment.profile.phone}`} className="p-1 px-1.5 bg-white text-slate-200 hover:text-emerald-500 rounded-lg border border-slate-100 transition-colors"><PhoneCall className="w-2.5 h-2.5" /></a>
                               <a href={`mailto:${assignment.profile.email}`} className="p-1 px-1.5 bg-white text-slate-200 hover:text-blue-500 rounded-lg border border-slate-100 transition-colors"><Mail className="w-2.5 h-2.5" /></a>
                            </div>
                         </div>
                      </div>
                    )
                  )) : <div className="col-span-full py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-100 text-[8px] font-black text-slate-300 uppercase tracking-widest">Void Assignments</div>}
               </div>
            </div>
         </div>

         <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900 p-8 rounded-[40px] shadow-none border border-slate-800 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 blur-[40px] rounded-full pointer-events-none" />
               <div className="relative z-10 space-y-6">
                  <div className="space-y-0.5 leading-none"><p className="text-[8.5px] font-black text-emerald-500 uppercase tracking-widest">Resource Link</p><h3 className="text-xl font-black text-white tracking-tight leading-tight uppercase line-clamp-2">{visit.project?.name || visit.lead?.client_name}</h3></div>
                  <div className="pt-6 border-t border-white/5">
                     {visit.project_id ? (
                        <button onClick={() => navigate(`/projects/${visit.project_id}`)} className="w-full py-3 bg-white text-slate-900 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-none"><Building2 className="w-3 h-3" /> Entry Link</button>
                     ) : (
                        <button onClick={() => navigate(`/leads/${visit.lead_id}`)} className="w-full py-3 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-none"><FileText className="w-3 h-3" /> Lead Intel</button>
                     )}
                  </div>
               </div>
            </div>

            <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm transition-all hover:shadow-md">
               <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-3 leading-none uppercase"><ShieldCheck className="w-4 h-4 text-emerald-500" /> Data Guard</h3>
               <div className="space-y-5 leading-none">
                  <div className="flex items-start gap-4 uppercase font-black">
                     <Clock className="w-4 h-4 text-slate-200 shrink-0 mt-0.5" />
                     <div><p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1.5 leading-none">Registered On</p><p className="text-[12px] text-slate-700">{new Date(visit.created_at).toLocaleDateString().toUpperCase()}</p></div>
                  </div>
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-50 leading-relaxed italic text-[10px] text-slate-400 font-bold">
                     Synchronized field telemetry. Logged for coordinate verification and staff deployment metrics.
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default SiteVisitDetails;