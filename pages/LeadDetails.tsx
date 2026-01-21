
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
  Activity, Sparkles, Edit3, Trash2, PhoneCall, ShieldCheck, 
  Hash, X, Save, Mail, Tag, FileText, AlertTriangle, Info, Globe,
  Layout, FileSpreadsheet, Download, FileCheck, ChevronDown, ChevronRight,
  UserCheck, ShieldAlert, User, Map, Home, Zap, Compass, Hammer, Paintbrush
} from 'lucide-react';
import { useNotification, useUser } from '../App';

const STANDARD_COLUMNS = [
  'client_name', 'phone', 'email', 'current_location', 'land_area', 'address', 'upazila', 
  'union_name', 'police_station', 'village_name', 'package', 'asking_fee', 'budget', 'social_media', 
  'next_calling_date', 'notes', 'foundation', 'unit_count', 'bedroom_count', 
  'bathroom_count', 'stair_details', 'status', 'is_client', 'interest_construction', 'interest_interest_interior'
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
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
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

  const handleStatusUpdate = async (newStatus: LeadStatus) => {
    if (!lead || isUpdatingStatus) return;
    setIsUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('leads')
        .update({ 
          status: newStatus, 
          updated_at: new Date().toISOString(),
          is_client: newStatus === 'Completed' ? true : lead.is_client,
          converted_at: newStatus === 'Completed' && !lead.converted_at ? new Date().toISOString() : lead.converted_at
        })
        .eq('id', lead.id);
      
      if (error) throw error;
      
      setLead({ ...lead, status: newStatus });
      showNotification(`Lifecycle status updated to ${newStatus.replace('_', ' ')}.`, "success");
      setShowStatusDropdown(false);
    } catch (err: any) {
      showNotification(`Status sync failed: ${err.message}`, "error");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleConvertToClient = async () => {
    if (!lead || isUpdatingStatus) return;
    setIsUpdatingStatus(true);
    try {
      const payload: Record<string, any> = {
        is_client: true, 
        converted_at: new Date().toISOString(),
        status: 'Completed',
        updated_at: new Date().toISOString(),
        metadata: { ...(lead.metadata || {}) }
      };

      if (lead.office_id) payload.office_id = lead.office_id;
      else if (profile?.office_id) payload.office_id = profile.office_id;

      Object.keys(convertFullData).forEach(dbKey => {
        const val = convertFullData[dbKey];
        if (STANDARD_COLUMNS.includes(dbKey)) {
          payload[dbKey] = val;
        } else {
          payload.metadata[dbKey] = val;
        }
      });

      const { error } = await supabase.from('leads').update(payload).eq('id', lead.id);
      if (error) throw error;
      
      showNotification(`${convertFullData.client_name} successfully promoted to Client Portfolio.`, "success");
      navigate('/clients');
    } catch (err: any) {
      showNotification(`Conversion sync failed: ${err.message}`, "error");
    } finally {
      setIsUpdatingStatus(false);
      setShowConvertModal(false);
    }
  };

  const finalizeQuotation = async (silent: boolean = false) => {
    if (!lead) return;
    if (!silent) setIsUpdatingStatus(true);
    try {
      const payload: Record<string, any> = {
        status: 'Quotation',
        updated_at: new Date().toISOString(),
        metadata: { ...(lead.metadata || {}) }
      };
      
      // Ensure office_id is preserved
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
        showNotification("Quotation dispatched. Lead status updated.", "success");
        setShowQuotationModal(false);
        navigate('/quotations');
      }
      return true;
    } catch (err: any) {
      const errorMsg = err.message || 'Vault commit failed';
      showNotification(`Porting Error: ${errorMsg}`, "error");
      return false;
    } finally {
      if (!silent) setIsUpdatingStatus(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!pdfTemplateRef.current || !lead) return;
    setIsGeneratingPDF(true);
    
    // Capture state before async boundary
    const isQuotationFlow = showQuotationModal;

    setTimeout(async () => {
      try {
        const element = pdfTemplateRef.current;
        if (!element) return;

        const opt = {
          margin: 0,
          filename: `Quotation_${quotationDraft.client_name || lead.client_name}.pdf`,
          image: { type: 'jpeg', quality: 1.0 },
          html2canvas: { 
            scale: 3, 
            useCORS: true, 
            letterRendering: true,
            logging: false,
            scrollY: 0,
            scrollX: 0
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // Trigger download
        // @ts-ignore
        await window.html2pdf().from(element).set(opt).save();
        
        if (isQuotationFlow) {
          showNotification("Quotation downloaded. Finalizing lifecycle transition...", "success");
          // Proceed with database update and navigation
          const success = await finalizeQuotation(true);
          if (success) {
            setShowQuotationModal(false);
            navigate('/quotations');
          }
        } else {
          showNotification("Document Exported.", "success");
        }
      } catch (err) {
        showNotification("Export failed. Please check browser permissions.", "error");
      } finally {
        setIsGeneratingPDF(false);
      }
    }, 500);
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

  const getIconForField = (dbKey: string) => {
    const key = dbKey.toLowerCase();
    if (key.includes('foundation') || key.includes('store')) return <Layers className="w-4 h-4 text-emerald-500" />;
    if (key.includes('unit')) return <Grid className="w-4 h-4 text-emerald-500" />;
    if (key.includes('bed')) return <Bed className="w-4 h-4 text-emerald-500" />;
    if (key.includes('bath')) return <Bath className="w-4 h-4 text-emerald-500" />;
    if (key.includes('stair')) return <ListTree className="w-4 h-4 text-emerald-500" />;
    if (key.includes('area') || key.includes('land')) return <Ruler className="w-4 h-4 text-emerald-500" />;
    if (key.includes('budget') || key.includes('fee')) return <Banknote className="w-4 h-4 text-emerald-500" />;
    if (key.includes('location') || key.includes('country')) return <Globe className="w-4 h-4 text-emerald-500" />;
    if (key.includes('address') || key.includes('district') || key.includes('village')) return <MapPin className="w-4 h-4 text-emerald-500" />;
    if (key.includes('package')) return <Briefcase className="w-4 h-4 text-emerald-500" />;
    if (key.includes('date')) return <Calendar className="w-4 h-4 text-emerald-500" />;
    if (key.includes('construction')) return <Hammer className="w-4 h-4 text-emerald-500" />;
    if (key.includes('interior')) return <Paintbrush className="w-4 h-4 text-emerald-500" />;
    return <Info className="w-4 h-4 text-emerald-500" />;
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

  const modalInputClass = "w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-emerald-500/30 transition-all shadow-inner";

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-32 animate-in fade-in duration-700 overflow-x-hidden relative">
      
      {showConvertModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[48px] p-8 md:p-14 max-w-5xl w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300 relative overflow-hidden flex flex-col max-h-[90vh]">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
            <div className="flex justify-between items-start mb-8 relative z-10 shrink-0">
              <div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Convert to Client Portfolio</h3>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mt-2">VALIDATED CONTRACTUAL REVIEW & OVERRIDE</p>
              </div>
              <button onClick={() => setShowConvertModal(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-red-500 transition-all"><X className="w-6 h-6" /></button>
            </div>
            <div className="flex-1 overflow-y-auto pr-4 no-scrollbar space-y-12 pb-10">
               {Object.keys(groupedFields).map(section => (
                 <div key={section} className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                       <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">{getSectionIcon(section)}</div>
                       <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">{section} Specs</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                       {groupedFields[section].map(f => (
                         <div key={f.id} className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{f.label}</label>
                            {f.type === 'select' ? (
                               <div className="relative">
                                  <select className={modalInputClass} value={convertFullData[f.db_key] || ''} onChange={e => setConvertFullData({...convertFullData, [f.db_key]: e.target.value})}><option value="">N/A</option>{f.options?.map(o => <option key={o} value={o}>{o}</option>)}</select>
                                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                               </div>
                            ) : f.type === 'textarea' ? (
                               <textarea className={`${modalInputClass} h-24 py-3 resize-none`} value={convertFullData[f.db_key] || ''} onChange={e => setConvertFullData({...convertFullData, [f.db_key]: e.target.value})} />
                            ) : f.type === 'checkbox' ? (
                               <button type="button" onClick={() => setConvertFullData({...convertFullData, [f.db_key]: !convertFullData[f.db_key]})} className={`w-full h-12 px-4 rounded-xl transition-all flex items-center gap-3 border shadow-inner ${convertFullData[f.db_key] ? 'bg-emerald-50 border-emerald-500/30' : 'bg-slate-50 border-slate-100'}`}><div className={`w-4 h-4 rounded border flex items-center justify-center ${convertFullData[f.db_key] ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-300'}`}>{convertFullData[f.db_key] && <CheckCircle2 className="w-3 h-3 text-white" />}</div><span className={`text-[12px] font-bold ${convertFullData[f.db_key] ? 'text-emerald-900' : 'text-slate-500'}`}>{f.label}</span></button>
                            ) : (
                               <input type={f.type === 'number' ? 'number' : (f.type === 'date' ? 'date' : 'text')} className={`${modalInputClass} ${f.db_key === 'asking_fee' ? 'text-emerald-700 font-black' : ''}`} value={convertFullData[f.db_key] ?? ''} onChange={e => setConvertFullData({...convertFullData, [f.db_key]: f.type === 'number' ? Number(e.target.value) : e.target.value})} />
                            )}
                         </div>
                       ))}
                    </div>
                 </div>
               ))}
               <div className="p-8 bg-emerald-50 rounded-[32px] border border-emerald-100/50 flex items-start gap-5">
                  <ShieldCheck className="w-8 h-8 text-emerald-500 shrink-0" />
                  <div className="space-y-1">
                     <p className="text-[12px] font-black text-emerald-900 uppercase tracking-widest">Protocol Confirmation</p>
                     <p className="text-[11px] font-medium text-emerald-800 leading-relaxed max-w-2xl">Promoting this lead will transition the lifecycle state to <strong>Completed (Sale)</strong> and establish an entry in the <strong>Active Client Portfolio</strong>.</p>
                  </div>
               </div>
            </div>
            <div className="pt-8 border-t border-slate-100 mt-auto flex flex-col sm:flex-row items-center gap-4 relative z-10 shrink-0">
               <button onClick={() => setShowConvertModal(false)} className="w-full sm:w-auto px-10 py-5 text-slate-400 text-[11px] font-black uppercase tracking-widest hover:text-red-500 transition-all">Cancel Review</button>
               <button onClick={handleConvertToClient} disabled={isUpdatingStatus} className="w-full flex-1 py-7 bg-[#064e3b] text-white rounded-[28px] text-[12px] font-black uppercase tracking-[0.3em] hover:bg-black transition-all flex items-center justify-center gap-4 shadow-2xl shadow-emerald-900/20 active:scale-95 disabled:opacity-50">{isUpdatingStatus ? <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" /> : <UserCheck className="w-6 h-6 text-emerald-400" />} AUTHORIZE CLIENT PROMOTION</button>
            </div>
          </div>
        </div>
      )}

      {/* Quotation Modal */}
      {showQuotationModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[48px] p-8 sm:p-12 max-w-4xl w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-start mb-10">
              <div><h3 className="text-3xl font-black text-slate-900 tracking-tight">Quotation Review</h3><p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mt-2">Finalize Technical Specifications</p></div>
              <button onClick={() => setShowQuotationModal(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-red-500 transition-all"><X className="w-6 h-6" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
               {formConfig.filter(f => f.visible && (f.section === 'Architecture' || f.section === 'Financials' || f.section === 'Interests')).map(f => (
                  <div key={f.id} className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{f.label}</label>
                    {f.type === 'select' ? (
                      <div className="relative"><select className="w-full h-14 px-6 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white border-2 border-transparent focus:border-emerald-500/20 transition-all appearance-none cursor-pointer" value={quotationDraft[f.db_key] || ''} onChange={e => setQuotationDraft({...quotationDraft, [f.db_key]: e.target.value})}><option value="">N/A</option>{f.options?.map(o => <option key={o} value={o}>{o}</option>)}</select><ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" /></div>
                    ) : f.type === 'checkbox' ? (
                        <button type="button" onClick={() => setQuotationDraft({...quotationDraft, [f.db_key]: !quotationDraft[f.db_key]})} className={`w-full h-14 px-6 bg-slate-50 rounded-2xl transition-all flex items-center gap-4 border-2 border-transparent ${quotationDraft[f.db_key] ? 'border-emerald-500/20 bg-white' : ''}`}><div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${quotationDraft[f.db_key] ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 bg-white'}`}>{quotationDraft[f.db_key] && <CheckCircle2 className="w-3 h-3 text-white" />}</div><span className={`text-[13px] font-bold ${quotationDraft[f.db_key] ? 'text-emerald-900' : 'text-slate-500'}`}>{f.label}</span></button>
                    ) : (
                      <input type={f.type === 'number' ? 'number' : 'text'} className="w-full h-14 px-6 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white border-2 border-transparent focus:border-emerald-500/20 transition-all shadow-inner" placeholder={f.placeholder || 'Enter value...'} value={quotationDraft[f.db_key] === null ? '' : quotationDraft[f.db_key] ?? ''} onChange={e => setQuotationDraft({...quotationDraft, [f.db_key]: e.target.value})} />
                    )}
                  </div>
               ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
               <button onClick={handleDownloadPDF} disabled={isGeneratingPDF} className="flex-1 py-6 bg-slate-900 text-white rounded-[24px] text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 disabled:opacity-50">{isGeneratingPDF ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5 text-emerald-400" />} {isGeneratingPDF ? 'Generating...' : 'Print / Export PDF'}</button>
               <button onClick={() => finalizeQuotation()} disabled={isUpdatingStatus} className="flex-1 py-6 bg-[#064e3b] text-white rounded-[24px] text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-900/20 active:scale-95">{isUpdatingStatus ? <RefreshCw className="w-5 h-5 animate-spin" /> : <FileCheck className="w-5 h-5 text-emerald-400" />} Dispatch & Update Status</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[48px] p-12 max-w-lg w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300 text-center"><div className="w-24 h-24 bg-amber-50 text-amber-600 rounded-[32px] flex items-center justify-center mb-10 mx-auto shadow-sm"><Trash2 className="w-10 h-10" /></div><h3 className="text-3xl font-black text-slate-900 tracking-tight mb-4">Archive to Bin?</h3><p className="text-slate-500 leading-relaxed font-medium mb-10 text-sm">You are about to archive <span className="font-black text-slate-800">"{lead.client_name}"</span>.</p><div className="flex gap-4"><button onClick={() => setShowDeleteModal(false)} className="flex-1 py-5 bg-slate-50 text-slate-500 rounded-[24px] text-[11px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">Keep Record</button><button onClick={executeSoftDelete} disabled={isUpdatingStatus} className="flex-1 py-5 bg-amber-600 text-white rounded-[24px] text-[11px] font-black uppercase tracking-widest hover:bg-amber-700 transition-all flex items-center justify-center gap-3 active:scale-95">{isUpdatingStatus ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Confirm Archive</button></div></div>
        </div>
      )}

      <div className="max-w-[1440px] mx-auto px-6 md:px-12 pt-12 space-y-12">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="flex items-center gap-8 min-w-0">
            <button onClick={() => navigate(-1)} className="w-14 h-14 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center justify-center hover:bg-slate-50 transition-all shrink-0"><ArrowLeft className="w-6 h-6 text-slate-500" /></button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-4">
                <h1 className="text-4xl font-black text-slate-900 tracking-tight truncate">{lead.client_name}</h1>
                <div className="relative" ref={statusDropdownRef}><button onClick={() => setShowStatusDropdown(!showStatusDropdown)} className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 ${statusMap[lead.status]?.color} ${statusMap[lead.status]?.hover} shadow-sm active:scale-95`}>{statusMap[lead.status]?.label}<ChevronDown className="w-3 h-3 opacity-50" /></button>{showStatusDropdown && <div className="absolute top-[calc(100%+8px)] left-0 w-48 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[120] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"><div className="p-2 space-y-1">{(['Discovery', 'Follow_Up', 'Quotation', 'Completed', 'Rejected'] as LeadStatus[]).map(s => <button key={s} disabled={isUpdatingStatus} onClick={() => handleStatusUpdate(s)} className={`w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-between group ${lead.status === s ? 'bg-slate-50 text-slate-900' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}`}><div className="flex items-center gap-3"><div className={`w-1.5 h-1.5 rounded-full ${statusMap[s].color.split(' ')[1].replace('text-', 'bg-')}`} />{s.replace('_', ' ')}</div>{lead.status === s && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}</button>)}</div></div>}</div>
              </div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em] mt-3 flex items-center gap-3"><Hash className="w-3.5 h-3.5 text-emerald-500" /> {lead.is_client ? 'CLIENT' : 'LEAD'} ID: {lead.id.slice(0, 12).toUpperCase()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
             {!lead.is_client && <button onClick={() => setShowConvertModal(true)} className="flex-1 sm:flex-none px-8 py-5 bg-emerald-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-2xl shadow-emerald-900/10 hover:bg-black transition-all flex items-center justify-center gap-3 active:scale-95 border border-white/10"><UserCheck className="w-5 h-5 text-white" /> Convert Client</button>}
             <button onClick={() => setShowQuotationModal(true)} className="flex-1 sm:flex-none px-8 py-5 bg-[#064e3b] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-2xl shadow-emerald-900/10 hover:bg-black transition-all flex items-center justify-center gap-3 active:scale-95"><FileSpreadsheet className="w-5 h-5 text-emerald-400" /> Send Quotation</button>
             <button onClick={() => navigate(`/leads/edit/${lead.id}`)} className="p-4 bg-white border border-slate-100 text-slate-400 hover:text-[#064e3b] rounded-2xl transition-all shadow-sm"><Edit3 className="w-5 h-5" /></button>
             <button onClick={() => setShowDeleteModal(true)} className="p-4 bg-white border border-slate-100 text-slate-400 hover:text-red-500 rounded-2xl transition-all shadow-sm"><Trash2 className="w-5 h-5" /></button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-8 space-y-12">
            <div className="space-y-12">
               {Object.keys(groupedFields).map((section) => (
                    <div key={section} className="bg-white p-12 md:p-16 rounded-[64px] border border-slate-100 shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
                      <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.3em] mb-12 flex items-center gap-4"><Layout className="w-6 h-6 text-emerald-500" /> {section} Parameters</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-y-12 gap-x-8">
                        {groupedFields[section].map((f) => (
                          <div key={f.id} className="space-y-2 group">
                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest group-hover:text-emerald-500 transition-colors">{f.label}</p>
                            <div className="flex items-center gap-3 font-black text-slate-900"><div className="opacity-40 group-hover:opacity-100 transition-opacity">{getIconForField(f.db_key)}</div><span className="text-lg truncate">{getFieldValue(f.db_key)}</span></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
            </div>
            <div className="bg-slate-950 p-12 md:p-16 rounded-[64px] shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 blur-[100px] rounded-full" />
               <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-12"><div className="flex items-center gap-4"><Sparkles className="w-7 h-7 text-emerald-400" /><div><h3 className="text-lg font-black text-white tracking-tight">AI Strategy Draft</h3><p className="text-emerald-400/50 text-[9px] font-black uppercase tracking-widest mt-1">Techno-Financial Feasibility</p></div></div><button onClick={handleAIAnalysis} disabled={isAnalyzing} className="w-full sm:w-auto px-8 py-4 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/20 active:scale-95">{isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />} Draft Strategy</button></div>
               {aiAnalysis ? (
                 <div className="space-y-10 animate-in fade-in duration-1000"><div className="grid grid-cols-2 gap-6"><div className="bg-white/5 border border-white/10 p-6 rounded-3xl"><p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Priority Score</p><p className="text-3xl font-black text-white mt-1">{aiAnalysis.priority_score}%</p></div><div className="bg-white/5 border border-white/10 p-6 rounded-3xl"><p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Feasibility</p><p className="text-3xl font-black text-emerald-400 mt-1">{aiAnalysis.feasibility_score}%</p></div></div><div className="space-y-4"><p className="text-[10px] font-black text-emerald-400/40 uppercase tracking-widest">Brief Narrative</p><p className="text-white/70 font-medium leading-relaxed">{aiAnalysis.brief}</p></div></div>
               ) : (
                 <div className="py-12 text-center"><p className="text-white/20 text-xs font-black uppercase tracking-[0.3em]">No active strategy records</p></div>
               )}
            </div>
          </div>
          <div className="lg:col-span-4 space-y-12">
             <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm"><h3 className="text-[12px] font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center gap-3"><Phone className="w-5 h-5 text-emerald-500" /> Contact Intel</h3><div className="space-y-6"><div className="p-6 bg-slate-50 rounded-[32px] border border-slate-50 group hover:border-emerald-100 transition-all"><p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Direct Line</p><p className="text-lg font-black text-slate-900">{lead.phone}</p></div><div className="p-6 bg-slate-50 rounded-[32px] border border-slate-50 group hover:border-emerald-100 transition-all"><p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Vault Email</p><p className="text-lg font-black text-slate-900 truncate">{lead.email || 'N/A'}</p></div><div className="p-6 bg-slate-50 rounded-[32px] border border-slate-50 group hover:border-emerald-100 transition-all"><p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Origin Country</p><p className="text-lg font-black text-slate-900">{lead.current_location || 'Global Discovery'}</p></div></div></div>
          </div>
        </div>
      </div>
      
      {/* PROFESSIONAL BRANDED PDF TEMPLATE */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '210mm', background: '#fff', zIndex: -1 }}>
        <div ref={pdfTemplateRef} style={{ width: '210mm', height: '297mm', padding: '0', fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1a1a1a', backgroundColor: '#fff', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', position: 'relative' }}>
           <div style={{ height: '24px', width: '100%', backgroundColor: '#0a2540' }}></div>
           <div style={{ padding: '30px 60px 10px 60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                 <div style={{ width: '80px', height: '80px', backgroundColor: '#0a2540', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', bottom: '15%', width: '60%', height: '50%', backgroundColor: '#ff5a1f', transform: 'skewY(-5deg)' }}></div>
                    <div style={{ position: 'absolute', top: '15%', width: '40%', height: '40%', border: '4px solid white', borderRadius: '4px', transform: 'rotate(45deg)' }}></div>
                    <span style={{ color: 'white', fontSize: '8pt', fontWeight: 900, position: 'absolute', bottom: '8px', width: '100%', textAlign: 'center', textTransform: 'uppercase' }}>Hossain</span>
                 </div>
                 <div>
                    <h1 style={{ fontSize: '38pt', fontWeight: 900, margin: 0, padding: 0, color: '#000', letterSpacing: '-1px', lineHeight: '1' }}>Hossain House Design</h1>
                    <p style={{ fontSize: '11pt', margin: '4px 0 0 0', fontWeight: 600, color: '#333' }}>House 27, Road 14, Block G, Niketon, Gulshan 1, Dhaka</p>
                    <p style={{ fontSize: '10pt', margin: '2px 0 0 0', fontWeight: 500, color: '#444' }}>+8801705323220, support@hossainhousedesign.com</p>
                 </div>
              </div>
           </div>
           <div style={{ height: '6px', width: '100%', backgroundColor: '#ff5a1f', marginTop: '10px' }}></div>
           <div style={{ padding: '40px 80px', flex: 1, position: 'relative' }}>
              <div style={{ textAlign: 'right', marginBottom: '20px' }}><p style={{ fontSize: '12pt', fontWeight: 700, color: '#000' }}>Date: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
              <div style={{ marginBottom: '40px' }}>
                 <h3 style={{ fontSize: '14pt', fontWeight: 800, marginBottom: '6px', color: '#000' }}>To,</h3>
                 <div style={{ fontSize: '13pt', lineHeight: '1.4', fontWeight: 600, color: '#111' }}>
                    <p style={{ margin: '2px 0' }}>{quotationDraft.client_name || lead.client_name}</p>
                    <p style={{ margin: '2px 0' }}>{quotationDraft.current_location || lead.current_location || 'Resident'}</p>
                    <p style={{ margin: '2px 0' }}>{quotationDraft.address || lead.address}, {quotationDraft.upazila || lead.upazila}</p>
                 </div>
              </div>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '40px', minHeight: '400px', padding: '40px', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                 <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '350px', height: '350px', opacity: 0.03, zIndex: 0, pointerEvents: 'none' }}><div style={{ width: '100%', height: '100%', backgroundColor: '#000', borderRadius: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><h1 style={{ color: 'white', fontSize: '40pt', fontWeight: 900 }}>H</h1></div></div>
                 <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '20mm', rowGap: '10mm' }}>
                    {formConfig.filter(f => f.visible && (f.section === 'Architecture' || f.section === 'Interests')).map(f => {
                       const val = (quotationDraft as any)[f.db_key] !== undefined ? (quotationDraft as any)[f.db_key] : lead.metadata?.[f.db_key];
                       if (!val || val === 'N/A' || val === 'No' || val === false) return null;
                       return (
                          <div key={f.id} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                             <p style={{ fontSize: '9pt', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>{f.label}</p>
                             <p style={{ fontSize: '12pt', fontWeight: 800, color: '#1e293b' }}>{typeof val === 'boolean' ? 'Yes' : val}</p>
                          </div>
                       );
                    })}
                 </div>
                 <div style={{ marginTop: 'auto', paddingTop: '30px' }}><p style={{ fontSize: '11pt', color: '#64748b', fontStyle: 'italic', lineHeight: '1.6' }}>Design excellence tailored to your specific land requirements and aesthetic vision.</p></div>
              </div>
              <div style={{ marginTop: '50px' }}><p style={{ fontSize: '12pt', fontWeight: 600, margin: 0 }}>Sincere</p><p style={{ fontSize: '13pt', fontWeight: 800, marginTop: '8px', marginBottom: 0 }}>Marketing Manager</p><p style={{ fontSize: '13pt', fontWeight: 900, margin: 0 }}>Hossain House Design</p><p style={{ fontSize: '11pt', fontWeight: 600, marginTop: '4px' }}>Ph: +8801705323220</p></div>
           </div>
           <div style={{ textAlign: 'center', padding: '15px 0' }}><p style={{ fontSize: '10pt', fontWeight: 700, color: '#333' }}>www.hossainhousedesign.com</p></div>
           <div style={{ height: '24px', width: '100%', backgroundColor: '#0a2540' }}></div>
        </div>
      </div>
    </div>
  );
};

export default LeadDetails;
