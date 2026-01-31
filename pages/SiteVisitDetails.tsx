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
    <div className="min-h-screen bg-[#f8fafc] pb-48 animate-in fade-in duration-700 overflow-x-hidden relative">
      
      {/* DELETE MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[48px] p-12 max-w-lg w-full shadow-2xl border border-slate-100 text-center animate-in zoom-in-95">
            <div className="w-24 h-24 bg-red-50 text-red-600 rounded-[32px] flex items-center justify-center mb-10 mx-auto shadow-sm"><Trash2 className="w-10 h-10" /></div>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-4">Archive Record?</h3>
            <p className="text-slate-500 leading-relaxed font-medium mb-10 text-sm">Permanently move this visitation to the Recycle Bin?</p>
            <div className="flex gap-4">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-5 bg-slate-50 text-slate-500 rounded-[24px] text-[11px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">Cancel</button>
              <button onClick={handleArchive} disabled={isDeleting} className="flex-1 py-5 bg-red-600 text-white rounded-[24px] text-[11px] font-black uppercase tracking-widest hover:bg-red-700 transition-all flex items-center justify-center gap-3 active:scale-95">{isDeleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Confirm Archive</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[48px] p-8 md:p-14 max-w-3xl w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 overflow-y-auto max-h-[90vh] no-scrollbar relative">
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#064e3b]/5 blur-[100px] rounded-full pointer-events-none" />
            <div className="flex justify-between items-start mb-12 relative z-10">
              <div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Sync Visit Record</h3>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mt-2">TECHNICAL FIELD OVERRIDE</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-red-500 transition-all"><X className="w-6 h-6" /></button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-10 relative z-10">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Visit Location</label>
                    <input required className="w-full h-16 px-8 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:bg-white shadow-inner" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Visit Date</label>
                    <input required type="date" className="w-full h-16 px-8 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none" value={formData.visit_date} onChange={e => setFormData({...formData, visit_date: e.target.value})} />
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Professional Service Mode</label>
                    <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-100 rounded-[22px]">
                       {(['Pre-paid', 'Post-paid', 'Free'] as PaymentStatus[]).map(s => (
                         <button key={s} type="button" onClick={() => setFormData({...formData, payment_status: s})} className={`py-4 rounded-[18px] text-[9px] font-black uppercase tracking-widest transition-all ${formData.payment_status === s ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>{s}</button>
                       ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Execution Status</label>
                    <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-100 rounded-[22px]">
                       {(['Upcoming', 'Done', 'Hold'] as VisitStatus[]).map(s => (
                         <button key={s} type="button" onClick={() => setFormData({...formData, status: s})} className={`py-4 rounded-[18px] text-[9px] font-black uppercase tracking-widest transition-all ${formData.status === s ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>{s}</button>
                       ))}
                    </div>
                  </div>
               </div>

               <div className="space-y-4">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">Assign Team Members ({formData.assigned_team.length})</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-[32px] border border-slate-100 max-h-48 overflow-y-auto no-scrollbar">
                     {staff.map(s => {
                       const active = formData.assigned_team.includes(s.id);
                       return (
                         <button key={s.id} type="button" onClick={() => setFormData(prev => ({ ...prev, assigned_team: active ? prev.assigned_team.filter(i => i !== s.id) : [...prev.assigned_team, s.id] }))} className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${active ? 'bg-[#064e3b] text-white shadow-lg' : 'bg-white border-slate-100 text-slate-600 hover:border-emerald-200'}`}>
                            <img src={s.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.email || s.full_name}`} className="w-8 h-8 rounded-lg bg-white p-0.5 object-cover shrink-0" alt={s.full_name} />
                            <p className="text-[10px] font-black truncate leading-none">{s.full_name}</p>
                         </button>
                       );
                     })}
                  </div>
               </div>

               <div className="space-y-3">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Visit Objectives</label>
                  <textarea className="w-full h-24 p-6 bg-slate-50 border border-slate-100 rounded-[28px] text-sm font-bold text-slate-700 outline-none focus:bg-white resize-none shadow-inner" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
               </div>

               <button type="submit" disabled={isSaving} className="w-full py-8 bg-[#064e3b] text-white rounded-[32px] text-[12px] font-black uppercase tracking-[0.3em] hover:bg-black transition-all flex items-center justify-center gap-4 shadow-2xl disabled:opacity-50">
                 {isSaving ? <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" /> : <Save className="w-6 h-6 text-emerald-400" />} COMMIT SYNCHRONIZATION
               </button>
            </form>
          </div>
        </div>
      )}

      {/* QUICK STATUS DROPDOWN MENU */}
      {showStatusDropdown && (
        <div 
          ref={statusMenuRef}
          className="fixed min-w-[200px] bg-white border border-slate-100 rounded-[28px] shadow-2xl z-[300] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 p-3 space-y-1"
          style={{ top: dropdownPos.top, left: dropdownPos.left }}
        >
          <div className="px-4 py-2 mb-1 border-b border-slate-50"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Update Execution</p></div>
          {(['Upcoming', 'Done', 'Hold'] as VisitStatus[]).map(s => (
            <button 
              key={s} 
              disabled={isUpdatingStatus}
              onClick={() => handleStatusUpdate(s)} 
              className={`w-full text-left px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-between group/st ${visit.status === s ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              <div className="flex items-center gap-3">
                 {s === 'Upcoming' && <Clock className="w-4 h-4" />}
                 {s === 'Done' && <CheckCheck className="w-4 h-4" />}
                 {s === 'Hold' && <PauseCircle className="w-4 h-4" />}
                 {s}
              </div>
              {visit.status === s && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            </button>
          ))}
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="bg-[#0f172a] pt-20 pb-40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#064e3b]/10 blur-[150px] rounded-full pointer-events-none" />
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 relative z-10">
          <div className="flex justify-between items-center mb-12">
            <button onClick={() => navigate('/site-visits')} className="flex items-center gap-3 text-white/40 hover:text-white transition-colors text-[11px] font-black uppercase tracking-widest group">
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> Registry Overview
            </button>
            <div className="flex items-center gap-3">
               <button onClick={() => setShowEditModal(true)} className="p-4 bg-white/5 border border-white/10 text-white/40 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-2xl transition-all"><Edit3 className="w-6 h-6" /></button>
               <button onClick={() => setShowDeleteModal(true)} className="p-4 bg-white/5 border border-white/10 text-white/40 hover:text-red-400 hover:bg-red-400/10 rounded-2xl transition-all"><Trash2 className="w-6 h-6" /></button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row justify-between items-start gap-12">
             <div className="space-y-6">
                <div className="flex items-center gap-4">
                   <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-[24px] flex items-center justify-center text-emerald-400 shadow-2xl backdrop-blur-md"><MapPin className="w-8 h-8" /></div>
                   <button 
                     onClick={toggleStatusDropdown}
                     className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-3 transition-all active:scale-95 ${getVisitStatusStyle(visit.status)}`}
                    >
                      {visit.status === 'Upcoming' && <Clock className="w-3.5 h-3.5" />}
                      {visit.status === 'Done' && <CheckCheck className="w-3.5 h-3.5" />}
                      {visit.status === 'Hold' && <PauseCircle className="w-3.5 h-3.5" />}
                      {visit.status} Execution
                      <ChevronDown className={`w-3 h-3 transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
                   </button>
                </div>
                <div>
                   <h1 className="text-5xl font-black text-white tracking-tight leading-tight">{visit.project?.client?.client_name || visit.lead?.client_name}</h1>
                   <div className="flex items-center gap-4 mt-4">
                      <p className="text-white/40 text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-3"><Hash className="w-4 h-4 text-emerald-500" /> VISIT ID: {visit.id.slice(0, 12).toUpperCase()}</p>
                   </div>
                </div>
             </div>

             <div className="bg-white/5 border border-white/10 p-10 rounded-[56px] backdrop-blur-xl flex flex-col md:flex-row items-center gap-12 shadow-3xl">
                <div className="text-center md:text-left space-y-2"><p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Execution Date</p><p className="text-4xl font-black text-white tracking-tighter">{new Date(visit.visit_date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
                <div className="w-[1px] h-20 bg-white/10 hidden md:block" />
                <div className="text-center md:text-left space-y-2"><p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Scheduled By</p><p className="text-xl font-black text-emerald-400">{visit.creator?.full_name || 'System'}</p></div>
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-6 md:px-12 -mt-24 relative z-20 grid grid-cols-1 lg:grid-cols-12 gap-12">
         <div className="lg:col-span-8 space-y-12">
            <div className="bg-white p-12 md:p-16 rounded-[64px] border border-slate-100 shadow-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
               <div className="flex items-center gap-5 pb-10 border-b border-slate-50 mb-12">
                  <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-[22px] flex items-center justify-center shadow-sm"><Info className="w-7 h-7" /></div>
                  <div><h3 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.3em]">Operational Metrics</h3><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Field Deployment Intel</p></div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                  <div className="space-y-2"><p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Physical Coordinates</p><div className="flex items-start gap-3"><MapPin className="w-5 h-5 text-[#064e3b] mt-0.5" /><span className="text-lg font-black text-slate-900">{visit.location}</span></div></div>
                  <div className="space-y-2"><p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Lifecycle Class</p><div className="flex items-center gap-3"><Coins className="w-5 h-5 text-emerald-500" /><span className="text-lg font-black text-slate-900">{visit.payment_status} Mode</span></div></div>
                  <div className="space-y-2"><p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Linked Context</p><div className="flex items-center gap-3">{visit.project ? <Building2 className="w-5 h-5 text-emerald-500" /> : <FileText className="w-5 h-5 text-blue-500" />}<span className="text-lg font-black text-slate-900">{visit.project ? 'Active Project' : 'Inquiry Discovery'}</span></div></div>
               </div>
               <div className="mt-12 p-10 bg-slate-50 rounded-[40px] border border-slate-100/50"><p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-6 flex items-center gap-3"><FileText className="w-4 h-4 text-emerald-500" /> Mission Objectives</p><p className="text-slate-600 text-lg font-medium leading-relaxed italic">"{visit.notes || 'No objectives predefined.'}"</p></div>
            </div>

            <div className="bg-white p-12 md:p-16 rounded-[64px] border border-slate-100 shadow-xl">
               <div className="flex items-center gap-5 pb-10 border-b border-slate-50 mb-12"><div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-[22px] flex items-center justify-center shadow-sm"><Users className="w-7 h-7" /></div><div><h3 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.3em]">Personnel Assigned</h3><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Authorized Field Staff</p></div></div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {visit.assignments && visit.assignments.length > 0 ? visit.assignments.map((assignment: any, idx: number) => (
                    assignment.profile && (
                      <div key={idx} className="flex items-center gap-5 p-6 bg-slate-50/50 rounded-[32px] border border-transparent hover:border-emerald-100 hover:bg-white transition-all group">
                         <img src={assignment.profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${assignment.profile.email || assignment.profile.full_name}`} className="w-16 h-16 rounded-[22px] bg-white shadow-md border border-slate-100 group-hover:scale-110 transition-transform object-cover" alt={assignment.profile.full_name} />
                         <div><p className="text-sm font-black text-slate-900 tracking-tight">{assignment.profile.full_name}</p><p className="text-[10px] font-black text-slate-400 uppercase mt-1">{assignment.profile.designation || 'Staff'}</p><div className="flex items-center gap-3 mt-3"><a href={`tel:${assignment.profile.phone}`} className="p-1.5 bg-white text-slate-300 hover:text-emerald-500 rounded-lg transition-colors"><PhoneCall className="w-3.5 h-3.5" /></a><a href={`mailto:${assignment.profile.email}`} className="p-1.5 bg-white text-slate-300 hover:text-blue-500 rounded-lg transition-colors"><Mail className="w-3.5 h-3.5" /></a></div></div>
                      </div>
                    )
                  )) : <div className="col-span-full py-12 text-center bg-slate-50/50 rounded-[40px] border border-dashed border-slate-200 text-[11px] font-black text-slate-300 uppercase">No Field Staff Assigned</div>}
               </div>
            </div>
         </div>

         <div className="lg:col-span-4 space-y-12">
            <div className="bg-[#064e3b] p-12 rounded-[64px] shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[60px] rounded-full pointer-events-none" />
               <div className="relative z-10 space-y-10">
                  <div className="space-y-2"><p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.4em]">Linked Resource</p><h3 className="text-3xl font-black text-white tracking-tight leading-tight">{visit.project?.name || visit.lead?.client_name}</h3></div>
                  <div className="pt-8 border-t border-white/5 space-y-4">
                     {visit.project_id ? (
                        <button onClick={() => navigate(`/projects/${visit.project_id}`)} className="w-full py-5 bg-white text-[#064e3b] rounded-[24px] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-50 transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl"><Building2 className="w-4 h-4" /> Open Design Vault</button>
                     ) : (
                        <button onClick={() => navigate(`/leads/${visit.lead_id}`)} className="w-full py-5 bg-emerald-500 text-white rounded-[24px] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-400 transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl"><FileText className="w-4 h-4" /> Discovery Profile</button>
                     )}
                  </div>
               </div>
            </div>

            <div className="bg-white p-12 rounded-[56px] border border-slate-100 shadow-xl shadow-slate-200/20">
               <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em] mb-10 flex items-center gap-4"><ShieldCheck className="w-6 h-6 text-emerald-500" /> System Governance</h3>
               <div className="space-y-8">
                  <div className="flex items-start gap-5">
                     <Clock className="w-6 h-6 text-slate-200 shrink-0" />
                     <div><p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Record Registry Timestamp</p><p className="text-sm font-black text-slate-700">{new Date(visit.created_at).toLocaleDateString()}</p></div>
                  </div>
                  <div className="p-8 bg-emerald-50/50 rounded-[32px] border border-emerald-100/50">
                     <p className="text-[10px] font-medium text-emerald-700 leading-relaxed italic">Field observations must be uploaded to the construction module if physical structural changes are detected.</p>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default SiteVisitDetails;