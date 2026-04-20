import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Lead, LeadStatus, LeadAIAnalysis, FormFieldConfig } from '../types';
import { analyzeLead } from '../geminiService';
import { DEFAULT_FORM_CONFIG } from './Settings';
import { resolveInterest } from './LeadsList'; 
import { 
  ArrowLeft, MapPin, Ruler, Banknote, Layers, Grid, Bed, Bath, 
  ListTree, Briefcase, Calendar, Phone, RefreshCw, CheckCircle2, 
  Activity, Sparkles, Edit3, Trash2, ShieldCheck, 
  Hash, X, Save, Mail, FileText, Info, Globe,
  Layout, FileSpreadsheet, Download, FileCheck, ChevronDown,
  UserCheck, User, Home, Zap, Compass, Hammer, Paintbrush,
  Target, MessageSquare
} from 'lucide-react';
import { useNotification, useUser } from '../App';

const STANDARD_COLUMNS = [
  'client_name', 'phone', 'email', 'current_location', 'land_area', 'address', 'upazila', 
  'union_name', 'police_station', 'village_name', 'package', 'asking_fee', 'budget', 'social_media', 
  'next_calling_date', 'notes', 'foundation', 'unit_count', 'bedroom_count', 
  'bathroom_count', 'stair_details', 'status', 'is_client', 'interest_construction', 'interest_interior'
];

const LeadDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { showNotification } = useNotification();
  const { profile } = useUser();
  const pdfTemplateRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  const [lead, setLead] = useState<Lead | null>(null);
  const [formConfig, setFormConfig] = useState<FormFieldConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<LeadAIAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpDate, setFollowUpDate] = useState(new Date().toISOString().split('T')[0]);

  const [quotationDraft, setQuotationDraft] = useState<Record<string, any>>({});
  const [convertFullData, setConvertFullData] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchData();
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [id]);

  useEffect(() => {
    if (!loading && lead) {
      const params = new URLSearchParams(location.search);
      if (params.get('open') === 'quotation') {
        setShowQuotationModal(true);
      }
    }
  }, [location.search, loading, lead]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [leadRes, configRes] = await Promise.all([
        supabase.from('leads').select('*').eq('id', id).single(),
        supabase.from('settings').select('*').eq('key', 'lead_form_config').single()
      ]);

      if (leadRes.error) throw leadRes.error;
      const leadData = leadRes.data as Lead;
      const config: FormFieldConfig[] = configRes.data?.value || DEFAULT_FORM_CONFIG;
      
      setLead(leadData);
      setQuotationDraft({ ...leadData, ...(leadData.metadata || {}) });
      setFormConfig(config);
      
      const initial: Record<string, any> = {};
      config.forEach(f => {
        const val = leadData[f.db_key as keyof Lead] !== undefined ? leadData[f.db_key as keyof Lead] : leadData.metadata?.[f.db_key];
        initial[f.db_key] = val !== undefined ? val : (f.type === 'number' ? 0 : (f.type === 'checkbox' ? false : ''));
      });
      setConvertFullData(initial);
    } catch (err) {
      showNotification("Vault access failed.", "error");
      navigate('/leads');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: LeadStatus, selectedFollowUpDate?: string) => {
    if (!lead || isUpdatingStatus) return;

    if (newStatus === 'Follow_Up' && !selectedFollowUpDate) {
      setShowFollowUpModal(true);
      setShowStatusDropdown(false);
      return;
    }

    setIsUpdatingStatus(true);
    try {
      const payload: any = { 
        status: newStatus, 
        updated_at: new Date().toISOString(),
        is_client: newStatus === 'Completed' ? true : lead.is_client,
        converted_at: newStatus === 'Completed' && !lead.converted_at ? new Date().toISOString() : lead.converted_at
      };

      if (selectedFollowUpDate) {
        payload.follow_up_date = selectedFollowUpDate;
      }

      const { error } = await supabase
        .from('leads')
        .update(payload)
        .eq('id', lead.id);
      
      if (error) throw error;
      
      setLead({ ...lead, status: newStatus, follow_up_date: selectedFollowUpDate || lead.follow_up_date });
      showNotification(`Lead advanced to ${newStatus.replace('_', ' ')}.`, "success");
      setShowStatusDropdown(false);
      setShowFollowUpModal(false);
    } catch (err: any) {
      showNotification(`Status sync failed: ${err.message}`, "error");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const finalizeQuotation = async (silent: boolean = false) => {
    if (!lead) return false;
    if (!silent) setIsUpdatingStatus(true);
    try {
      const payload: Record<string, any> = {
        status: 'Quotation',
        updated_at: new Date().toISOString(),
        metadata: { ...(lead.metadata || {}) }
      };
      
      if (lead.office_id) payload.office_id = lead.office_id;

      Object.keys(quotationDraft).forEach(key => {
        if (['id', 'created_at', 'updated_at', 'deleted_at', 'metadata', 'office_id'].includes(key)) return;
        const value = quotationDraft[key];
        if (STANDARD_COLUMNS.includes(key)) {
          if (key === 'asking_fee') {
            payload[key] = isNaN(Number(value)) ? 0 : Number(value);
          } else {
            payload[key] = (value === 'N/A' || value === '') ? null : value;
          }
        } else {
          payload.metadata[key] = (value === 'N/A' || value === '') ? null : value;
        }
      });

      const { error } = await supabase.from('leads').update(payload).eq('id', lead.id);
      if (error) throw error;
      
      if (!silent) {
        showNotification("Quotation dispatched. Moving to Portfolio...", "success");
        setShowQuotationModal(false);
        navigate('/quotations');
      }
      return true;
    } catch (err: any) {
      if (!silent) showNotification(`Porting Error: ${err.message}`, "error");
      return false;
    } finally {
      if (!silent) setIsUpdatingStatus(false);
    }
  };

  const handleAIAnalysis = async () => {
    if (!lead) return;
    setIsAnalyzing(true);
    try {
      const analysis = await analyzeLead(lead);
      setAiAnalysis(analysis);
      showNotification("AI Strategy successfully drafted.", "success");
    } catch (err) {
      showNotification("AI Services temporarily offline.", "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const executeSoftDelete = async () => {
    if (!lead) return;
    setIsUpdatingStatus(true);
    try {
      const { error } = await supabase.from('leads').update({ deleted_at: new Date().toISOString() }).eq('id', lead.id);
      if (error) throw error;
      showNotification("Lead archived to Recycle Bin.", "info");
      navigate('/leads');
    } catch (err) {
      showNotification("Archive failed.", "error");
    } finally {
      setIsUpdatingStatus(false);
      setShowDeleteModal(false);
    }
  };

  const getFieldValue = (dbKey: string) => {
    if (!lead) return 'N/A';
    if (dbKey === 'interest_construction') return resolveInterest(lead, 'interest_construction') ? 'Yes' : 'No';
    if (dbKey === 'interest_interior') return resolveInterest(lead, 'interest_interior') ? 'Yes' : 'No';
    const value = lead[dbKey as keyof Lead] !== undefined ? lead[dbKey as keyof Lead] : lead.metadata?.[dbKey];
    if (value === null || value === undefined || value === '') return 'N/A';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return value;
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

  const formatWhatsAppLink = (phone: string) => {
    const clean = phone.replace(/\D/g, '');
    const number = clean.startsWith('0') ? `88${clean}` : clean;
    return `https://wa.me/${number}`;
  };

  if (loading || !lead) return (
    <div className="h-[80vh] flex flex-col items-center justify-center gap-6 px-6 text-center">
      <RefreshCw className="w-12 h-12 text-[#064e3b] animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">SYNCING ARCHITECTURAL VAULT...</p>
    </div>
  );

  const statusMap: Record<LeadStatus, { label: string; color: string; hover: string }> = {
    'Discovery': { label: 'Discovery', color: 'bg-blue-50 text-blue-600 border-blue-100', hover: 'hover:bg-blue-100' },
    'Follow_Up': { label: 'Follow Up', color: 'bg-amber-50 text-amber-600 border-amber-100', hover: 'hover:bg-amber-100' },
    'Quotation': { label: 'Quotation', color: 'bg-purple-50 text-purple-600 border-purple-100', hover: 'hover:bg-purple-100' },
    'Completed': { label: 'Completed', color: 'bg-emerald-50 text-emerald-600 border-emerald-100', hover: 'hover:bg-emerald-100' },
    'Rejected': { label: 'Rejected', color: 'bg-red-50 text-red-600 border-red-100', hover: 'hover:bg-red-100' },
  };

  const groupedFields = formConfig.reduce((acc, field) => {
    if (!field.visible) return acc;
    const section = field.section || 'General';
    if (!acc[section]) acc[section] = [];
    acc[section].push(field);
    return acc;
  }, {} as Record<string, FormFieldConfig[]>);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 animate-in fade-in duration-500 overflow-x-hidden relative">
      
      {/* Modals are already responsive from previous turn fixes, but ensuring they fit on mobile */}
      {showFollowUpModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-300 relative">
              <div className="flex justify-between items-start mb-6">
                <div>
                   <h3 className="text-xl font-bold text-slate-900 tracking-tight">Schedule Follow Up</h3>
                   <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mt-1">Calendar Sync</p>
                </div>
                <button onClick={() => setShowFollowUpModal(false)} className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:text-red-500 transition-all"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Target Date</label>
                    <div className="relative">
                       <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                       <input 
                         type="date" 
                         className="w-full h-12 pl-11 pr-6 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:bg-white transition-all"
                         value={followUpDate}
                         onChange={(e) => setFollowUpDate(e.target.value)}
                       />
                    </div>
                 </div>
                 <button 
                   onClick={() => handleStatusUpdate('Follow_Up', followUpDate)} 
                   disabled={isUpdatingStatus}
                   className="w-full py-4 bg-amber-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg hover:bg-black transition-all flex items-center justify-center gap-2 active:scale-95"
                 >
                   {isUpdatingStatus ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Schedule
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Main Details View */}
      <div className="max-w-[1440px] mx-auto px-4 pt-6 space-y-6">
        <header className="flex flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button onClick={() => navigate(-1)} className="w-9 h-9 bg-white border border-slate-200 rounded-lg shadow-sm flex items-center justify-center hover:bg-slate-50 transition-all shrink-0"><ArrowLeft className="w-4 h-4 text-slate-500" /></button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight truncate leading-none uppercase">{lead.client_name}</h1>
                <div className="relative" ref={statusDropdownRef}>
                  <button onClick={() => setShowStatusDropdown(!showStatusDropdown)} className={`px-2 py-0.5 rounded-md text-[7px] font-bold uppercase tracking-widest border transition-all flex items-center gap-1 leading-none ${statusMap[lead.status]?.color}`}>
                    {statusMap[lead.status]?.label}
                    <ChevronDown className="w-2.5 h-2.5 opacity-50" />
                  </button>
                  {showStatusDropdown && (
                    <div className="absolute top-full left-0 mt-1 min-w-[120px] bg-white border border-slate-200 rounded-lg shadow-xl z-[150] p-1 space-y-0.5 animate-in fade-in slide-in-from-top-1">
                      {(['Discovery', 'Follow_Up', 'Quotation', 'Completed', 'Rejected'] as LeadStatus[]).map(s => (
                        <button key={s} onClick={() => handleStatusUpdate(s)} className={`w-full text-left px-3 py-1.5 rounded-md text-[8px] font-bold uppercase tracking-widest transition-all ${lead.status === s ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>{s.replace('_', ' ')}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <p className="text-slate-400 text-[8px] font-bold uppercase tracking-widest mt-1 leading-none">ID: {lead.id.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
             <button onClick={() => setShowQuotationModal(true)} className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-[8px] font-bold uppercase tracking-widest shadow-sm flex items-center gap-1.5 active:scale-95 leading-none"><FileSpreadsheet className="w-3 h-3" /> Quotation</button>
             <button onClick={() => navigate(`/leads/edit/${lead.id}`)} className="p-1.5 bg-white border border-slate-200 text-slate-400 rounded-lg shadow-sm hover:text-emerald-600 transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
             <button onClick={() => setShowDeleteModal(true)} className="p-1.5 bg-white border border-slate-200 text-slate-400 hover:text-red-500 rounded-lg shadow-sm transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          <div className="col-span-12 lg:col-span-8 space-y-5">
             {Object.keys(groupedFields).map((section) => (
                  <div key={section} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <h3 className="text-[9px] font-bold text-slate-900 uppercase tracking-widest mb-5 flex items-center gap-2 leading-none">{getSectionIcon(section)} {section}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-4">
                      {groupedFields[section].map((f) => (
                        <div key={f.id} className="space-y-0.5 min-w-0">
                          <p className="text-[7px] font-bold text-slate-300 uppercase tracking-widest leading-none">{f.label}</p>
                          <div className="font-bold text-slate-900 text-[13px] leading-tight truncate uppercase tracking-tight">{getFieldValue(f.db_key)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
             {/* AI Analysis Panel */}
             <div className="bg-slate-900 p-6 md:p-8 rounded-2xl shadow-xl relative overflow-hidden">
               <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                 <div className="flex items-center gap-3">
                   <Sparkles className="w-5 h-5 text-emerald-400" />
                   <div>
                     <h3 className="text-base font-bold text-white tracking-tight">AI Strategy</h3>
                     <p className="text-emerald-400/50 text-[9px] font-bold uppercase tracking-widest">Feasibility Insight</p>
                   </div>
                 </div>
                 <button onClick={handleAIAnalysis} disabled={isAnalyzing} className="w-full sm:w-auto px-4 py-2 bg-emerald-500 text-white rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-emerald-400 transition-all disabled:opacity-50">
                    {isAnalyzing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Refined Strategy'}
                 </button>
               </div>
               {aiAnalysis ? (
                 <div className="space-y-6 animate-in fade-in duration-1000">
                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-white/5 border border-white/5 p-4 rounded-xl text-center"><p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Score</p><p className="text-xl font-bold text-white mt-0.5">{aiAnalysis.priority_score}%</p></div>
                       <div className="bg-white/5 border border-white/5 p-4 rounded-xl text-center"><p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Feasibility</p><p className="text-xl font-bold text-emerald-400 mt-0.5">{aiAnalysis.feasibility_score}%</p></div>
                    </div>
                    <p className="text-white/70 text-sm font-medium leading-relaxed">{aiAnalysis.brief}</p>
                 </div>
               ) : (
                 <div className="py-4 text-center text-white/20 text-[10px] font-bold uppercase tracking-widest">No strategy recorded</div>
               )}
            </div>
          </div>
          <div className="lg:col-span-4 space-y-6 md:space-y-8">
             <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-[9px] font-bold text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2 leading-none"><Phone className="w-4 h-4 text-emerald-500" /> Contacts</h3>
                <div className="space-y-2">
                  <a href={formatWhatsAppLink(lead.phone)} target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center group transition-all">
                    <div className="min-w-0"><p className="text-[7px] font-bold text-slate-300 uppercase leading-none mb-1">Phone</p><p className="text-xs font-bold text-slate-900 truncate leading-none">{lead.phone}</p></div>
                    <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center text-emerald-500 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                      <MessageSquare className="w-3.5 h-3.5" />
                    </div>
                  </a>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-[7px] font-bold text-slate-300 uppercase leading-none mb-1">Email</p>
                    <p className="text-xs font-bold text-slate-900 truncate leading-none">{lead.email || 'N/A'}</p>
                  </div>
                </div>
             </div>

             <div className="bg-slate-900 p-5 rounded-xl shadow-lg relative overflow-hidden text-white">
                <div className="relative z-10 flex flex-row justify-between items-center gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-bold tracking-tight leading-none">AI Insight</h3>
                  </div>
                  <button onClick={handleAIAnalysis} disabled={isAnalyzing} className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[7px] font-bold uppercase tracking-widest hover:bg-emerald-500/20 transition-all disabled:opacity-50">
                     {isAnalyzing ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : 'RE-ANALYZE'}
                  </button>
                </div>
                {aiAnalysis ? (
                  <div className="space-y-4 animate-in fade-in duration-700">
                     <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white/5 border border-white/5 p-2 rounded-lg text-center"><p className="text-[7px] font-bold text-white/30 uppercase tracking-widest leading-none">Priority</p><p className="text-sm font-bold text-white mt-1 leading-none">{aiAnalysis.priority_score}%</p></div>
                        <div className="bg-white/5 border border-white/5 p-2 rounded-lg text-center"><p className="text-[7px] font-bold text-white/30 uppercase tracking-widest leading-none">Win Prob</p><p className="text-sm font-bold text-emerald-400 mt-1 leading-none">{aiAnalysis.feasibility_score}%</p></div>
                     </div>
                     <p className="text-white/60 text-[11px] font-medium leading-normal">{aiAnalysis.brief}</p>
                  </div>
                ) : (
                  <div className="py-2 text-center text-white/10 text-[8px] font-bold uppercase tracking-widest">No intelligence recorded</div>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadDetails;