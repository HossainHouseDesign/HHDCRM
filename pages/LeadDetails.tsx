
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Lead, LeadStatus, LeadAIAnalysis, FormFieldConfig } from '../types';
import { analyzeLead } from '../geminiService';
import { DEFAULT_FORM_CONFIG } from './Settings';
import { 
  ArrowLeft, MapPin, Ruler, Banknote, Layers, Grid, Bed, Bath, 
  ListTree, Briefcase, Calendar, Phone, RefreshCw, CheckCircle2, 
  Activity, Sparkles, Edit3, Trash2, PhoneCall, ShieldCheck, 
  Hash, X, Save, Mail, Tag, FileText, AlertTriangle, Info, Globe,
  Layout, FileSpreadsheet, Download, FileCheck, ChevronDown
} from 'lucide-react';
import { useNotification } from '../App';

const STANDARD_COLUMNS = [
  'client_name', 'phone', 'email', 'current_location', 'land_area', 'address', 'upazila', 
  'union_name', 'police_station', 'village_name', 'package', 'asking_fee', 'budget', 'social_media', 
  'next_calling_date', 'notes', 'foundation', 'unit_count', 'bedroom_count', 
  'bathroom_count', 'stair_details', 'status', 'is_client'
];

const LeadDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const pdfTemplateRef = useRef<HTMLDivElement>(null);

  const [lead, setLead] = useState<Lead | null>(null);
  const [formConfig, setFormConfig] = useState<FormFieldConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<LeadAIAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [quotationDraft, setQuotationDraft] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [leadRes, configRes] = await Promise.all([
        supabase.from('leads').select('*').eq('id', id).single(),
        supabase.from('settings').select('*').eq('key', 'lead_form_config').single()
      ]);

      if (leadRes.error) throw leadRes.error;
      const leadData = leadRes.data as Lead;
      setLead(leadData);
      setQuotationDraft({
        ...leadData,
        ...(leadData.metadata || {})
      });
      setFormConfig(configRes.data?.value || DEFAULT_FORM_CONFIG);
    } catch (err) {
      showNotification("Vault access failed.", "error");
      navigate('/leads');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!pdfTemplateRef.current) return;
    setIsGeneratingPDF(true);
    
    setTimeout(async () => {
      try {
        const element = pdfTemplateRef.current;
        if (!element) return;

        const opt = {
          margin: 0,
          filename: `Quotation_${quotationDraft.client_name || 'Project'}.pdf`,
          image: { type: 'jpeg', quality: 1.0 },
          html2canvas: { 
            scale: 2, 
            useCORS: true, 
            letterRendering: true,
            logging: false,
            scrollY: 0,
            scrollX: 0
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // @ts-ignore
        await window.html2pdf().from(element).set(opt).save();
        showNotification("Quotation document exported successfully.", "success");
      } catch (err) {
        console.error("PDF Export Error:", err);
        showNotification("Failed to generate PDF document.", "error");
      } finally {
        setIsGeneratingPDF(false);
      }
    }, 300);
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

  const finalizeQuotation = async () => {
    if (!lead) return;
    setIsUpdatingStatus(true);
    try {
      const payload: Record<string, any> = {
        status: 'Quotation',
        updated_at: new Date().toISOString(),
        metadata: { ...(lead.metadata || {}) }
      };

      Object.keys(quotationDraft).forEach(key => {
        if (['id', 'created_at', 'updated_at', 'deleted_at', 'metadata'].includes(key)) return;
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
      showNotification("Quotation dispatched. Lead status updated.", "success");
      setShowQuotationModal(false);
      navigate('/quotations');
    } catch (err: any) {
      showNotification(`Sync Error: ${err.message}`, "error");
    } finally {
      setIsUpdatingStatus(false);
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
    const value = quotationDraft[dbKey];
    if (value === null || value === undefined || value === '') return 'N/A';
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
    return <Info className="w-4 h-4 text-emerald-500" />;
  };

  if (loading || !lead) return (
    <div className="h-[80vh] flex flex-col items-center justify-center gap-6 px-6 text-center">
      <RefreshCw className="w-12 h-12 text-[#064e3b] animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">SYNCING ARCHITECTURAL VAULT...</p>
    </div>
  );

  const statusMap: Record<LeadStatus, { label: string; color: string }> = {
    'Discovery': { label: 'Discovery', color: 'bg-blue-50 text-blue-600 border-blue-100' },
    'Follow_Up': { label: 'Follow Up', color: 'bg-amber-50 text-amber-600 border-amber-100' },
    'Quotation': { label: 'Quotation', color: 'bg-purple-50 text-purple-600 border-purple-100' },
    'Completed': { label: 'Completed', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
    'Rejected': { label: 'Rejected', color: 'bg-red-50 text-red-600 border-red-100' },
  };

  const groupedFields = formConfig.reduce((acc, field) => {
    if (!field.visible) return acc;
    const section = field.section || 'General';
    if (!acc[section]) acc[section] = [];
    acc[section].push(field);
    return acc;
  }, {} as Record<string, FormFieldConfig[]>);

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-32 animate-in fade-in duration-700 overflow-x-hidden relative">
      
      {/* Quotation Review & Draft Modal */}
      {showQuotationModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[48px] p-8 sm:p-12 max-w-4xl w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-start mb-10">
              <div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Quotation Review</h3>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mt-2">Finalize Technical Specifications</p>
              </div>
              <button onClick={() => setShowQuotationModal(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-red-500 transition-all"><X className="w-6 h-6" /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
               {formConfig.filter(f => f.visible && (f.section === 'Architecture' || f.section === 'Financials')).map(f => (
                  <div key={f.id} className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{f.label}</label>
                    {f.type === 'select' ? (
                      <div className="relative">
                        <select 
                          className="w-full h-14 px-6 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white border-2 border-transparent focus:border-emerald-500/20 transition-all appearance-none cursor-pointer"
                          value={quotationDraft[f.db_key] || ''}
                          onChange={e => setQuotationDraft({...quotationDraft, [f.db_key]: e.target.value})}
                        >
                          <option value="">N/A</option>
                          {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                      </div>
                    ) : (
                      <input 
                        type={f.type === 'number' ? 'number' : 'text'}
                        className="w-full h-14 px-6 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white border-2 border-transparent focus:border-emerald-500/20 transition-all shadow-inner"
                        placeholder={f.placeholder || 'Enter value...'}
                        value={quotationDraft[f.db_key] === null ? '' : quotationDraft[f.db_key] ?? ''}
                        onChange={e => setQuotationDraft({...quotationDraft, [f.db_key]: e.target.value})}
                      />
                    )}
                  </div>
               ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
               <button 
                onClick={handleDownloadPDF} 
                disabled={isGeneratingPDF}
                className="flex-1 py-6 bg-slate-900 text-white rounded-[24px] text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 disabled:opacity-50"
               >
                  {isGeneratingPDF ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5 text-emerald-400" />} 
                  {isGeneratingPDF ? 'Generating...' : 'Print / Export PDF'}
               </button>
               <button 
                onClick={finalizeQuotation} 
                disabled={isUpdatingStatus}
                className="flex-1 py-6 bg-[#064e3b] text-white rounded-[24px] text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-900/20 active:scale-95"
               >
                  {isUpdatingStatus ? <RefreshCw className="w-5 h-5 animate-spin" /> : <FileCheck className="w-5 h-5 text-emerald-400" />} 
                  Dispatch & Update Status
               </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[48px] p-12 max-w-lg w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300 text-center">
            <div className="w-24 h-24 bg-amber-50 text-amber-600 rounded-[32px] flex items-center justify-center mb-10 mx-auto shadow-sm">
              <Trash2 className="w-10 h-10" />
            </div>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-4">Archive to Bin?</h3>
            <p className="text-slate-500 leading-relaxed font-medium mb-10 text-sm">
              You are about to archive <span className="font-black text-slate-800">"{lead.client_name}"</span>. This will move the record to the Recycle Bin.
            </p>
            <div className="flex gap-4">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-5 bg-slate-50 text-slate-500 rounded-[24px] text-[11px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">Keep Record</button>
              <button onClick={executeSoftDelete} disabled={isUpdatingStatus} className="flex-1 py-5 bg-amber-600 text-white rounded-[24px] text-[11px] font-black uppercase tracking-widest hover:bg-amber-700 transition-all flex items-center justify-center gap-3 active:scale-95">
                {isUpdatingStatus ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Confirm Archive
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[1440px] mx-auto px-6 md:px-12 pt-12 space-y-12">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="flex items-center gap-8 min-w-0">
            <button onClick={() => navigate(-1)} className="w-14 h-14 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center justify-center hover:bg-slate-50 transition-all shrink-0">
              <ArrowLeft className="w-6 h-6 text-slate-500" />
            </button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-4">
                <h1 className="text-4xl font-black text-slate-900 tracking-tight truncate">{lead.client_name}</h1>
                <span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusMap[lead.status]?.color}`}>
                  {statusMap[lead.status]?.label}
                </span>
              </div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em] mt-3 flex items-center gap-3">
                 <Hash className="w-3.5 h-3.5 text-emerald-500" /> {lead.is_client ? 'CLIENT' : 'LEAD'} ID: {lead.id.slice(0, 12).toUpperCase()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
             <button onClick={() => setShowQuotationModal(true)} className="flex-1 sm:flex-none px-8 py-5 bg-[#064e3b] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-2xl shadow-emerald-900/10 hover:bg-black transition-all flex items-center justify-center gap-3 active:scale-95"><FileSpreadsheet className="w-5 h-5 text-emerald-400" /> Send Quotation</button>
             <button onClick={() => navigate(`/leads/edit/${lead.id}`)} className="p-4 bg-white border border-slate-100 text-slate-400 hover:text-[#064e3b] rounded-2xl transition-all shadow-sm"><Edit3 className="w-5 h-5" /></button>
             <button onClick={() => setShowDeleteModal(true)} className="p-4 bg-white border border-slate-100 text-slate-400 hover:text-red-500 rounded-2xl transition-all shadow-sm"><Trash2 className="w-5 h-5" /></button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-8 space-y-12">
            <div className="space-y-12">
               {Object.keys(groupedFields).map((section) => {
                  const fields = groupedFields[section];
                  return (
                    <div key={section} className="bg-white p-12 md:p-16 rounded-[64px] border border-slate-100 shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
                      <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.3em] mb-12 flex items-center gap-4"><Layout className="w-6 h-6 text-emerald-500" /> {section} Parameters</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-y-12 gap-x-8">
                        {fields.map((f) => (
                          <div key={f.id} className="space-y-2 group">
                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest group-hover:text-emerald-500 transition-colors">{f.label}</p>
                            <div className="flex items-center gap-3 font-black text-slate-900">
                                <div className="opacity-40 group-hover:opacity-100 transition-opacity">{getIconForField(f.db_key)}</div>
                                <span className="text-lg truncate">{getFieldValue(f.db_key)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
               })}
            </div>
            <div className="bg-slate-950 p-12 md:p-16 rounded-[64px] shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 blur-[100px] rounded-full" />
               <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-12">
                  <div className="flex items-center gap-4"><Sparkles className="w-7 h-7 text-emerald-400" /><div><h3 className="text-lg font-black text-white tracking-tight">AI Strategy Draft</h3><p className="text-emerald-400/50 text-[9px] font-black uppercase tracking-widest mt-1">Techno-Financial Feasibility</p></div></div>
                  <button onClick={handleAIAnalysis} disabled={isAnalyzing} className="w-full sm:w-auto px-8 py-4 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/20 active:scale-95">{isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />} Draft Strategy</button>
               </div>
               {aiAnalysis ? (
                 <div className="space-y-10 animate-in fade-in duration-1000">
                    <div className="grid grid-cols-2 gap-6">
                       <div className="bg-white/5 border border-white/10 p-6 rounded-3xl"><p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Priority Score</p><p className="text-3xl font-black text-white mt-1">{aiAnalysis.priority_score}%</p></div>
                       <div className="bg-white/5 border border-white/10 p-6 rounded-3xl"><p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Feasibility</p><p className="text-3xl font-black text-emerald-400 mt-1">{aiAnalysis.feasibility_score}%</p></div>
                    </div>
                    <div className="space-y-4"><p className="text-[10px] font-black text-emerald-400/40 uppercase tracking-widest">Brief Narrative</p><p className="text-white/70 font-medium leading-relaxed">{aiAnalysis.brief}</p></div>
                 </div>
               ) : (
                 <div className="py-12 text-center"><p className="text-white/20 text-xs font-black uppercase tracking-[0.3em]">No active strategy records</p></div>
               )}
            </div>
          </div>
          <div className="lg:col-span-4 space-y-12">
             <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm">
                <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center gap-3"><Phone className="w-5 h-5 text-emerald-500" /> Contact Intel</h3>
                <div className="space-y-6">
                   <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-50 group hover:border-emerald-100 transition-all"><p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Direct Line</p><p className="text-lg font-black text-slate-900">{lead.phone}</p></div>
                   <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-50 group hover:border-emerald-100 transition-all"><p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Vault Email</p><p className="text-lg font-black text-slate-900 truncate">{lead.email || 'N/A'}</p></div>
                   <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-50 group hover:border-emerald-100 transition-all"><p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Origin Country</p><p className="text-lg font-black text-slate-900">{lead.current_location || 'Global Discovery'}</p></div>
                </div>
             </div>
          </div>
        </div>
      </div>
      
      {/* 
          PROFESSIONAL PDF TEMPLATE: EXACT MATCH FOR HOSSAIN HOUSE DESIGN 
          Sandbox rendering container with fixed width to prevent cutoff
      */}
      <div 
        style={{ 
          position: 'absolute', 
          left: '-9999px',
          top: 0,
          width: '210mm',
          background: '#fff',
          zIndex: -1
        }}
      >
        <div 
          ref={pdfTemplateRef}
          style={{ 
            width: '210mm', 
            minHeight: '297mm', 
            padding: '20mm',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            color: '#000',
            backgroundColor: '#fff',
            boxSizing: 'border-box',
            display: 'block',
            margin: '0 auto'
          }}
        >
           {/* Branding Header */}
           <div style={{ textAlign: 'center', marginBottom: '2mm', width: '100%' }}>
              <h1 style={{ fontSize: '36pt', fontWeight: 900, margin: '0 0 2mm 0', padding: 0, letterSpacing: '-0.5mm', color: '#1a1a1a', lineHeight: '1.1' }}>Hossain Hosue Design</h1>
              <p style={{ fontSize: '11pt', margin: '0', fontWeight: 500, color: '#333' }}>House 27, Road 14, Block G, Niketon, Gulshan 1, Dhaka</p>
              <p style={{ fontSize: '11pt', margin: '0.5mm 0 0 0', fontWeight: 500, color: '#333' }}>Phone: 01705323220, web: hossainhousedesign.com</p>
           </div>

           {/* Decorative Blue Line */}
           <div style={{ height: '4px', width: '100%', backgroundColor: '#2b478b', marginBottom: '15mm', marginTop: '2mm' }}></div>

           {/* Recipient Details */}
           <div style={{ marginBottom: '15mm', width: '100%' }}>
              <h3 style={{ fontSize: '14pt', fontWeight: 800, marginBottom: '4mm', color: '#000' }}>To</h3>
              <div style={{ fontSize: '12pt', lineHeight: '1.6', fontWeight: 600, color: '#111' }}>
                 <p style={{ margin: '1mm 0', display: 'flex', gap: '3mm' }}><span>•</span> {quotationDraft.client_name || '..........................................................'}</p>
                 <p style={{ margin: '1mm 0', display: 'flex', gap: '3mm' }}><span>•</span> {quotationDraft.phone || '..........................................................'}</p>
                 <p style={{ margin: '1mm 0', display: 'flex', gap: '3mm' }}><span>•</span> {quotationDraft.address ? `${quotationDraft.address}, ${quotationDraft.upazila || ''}` : '..........................................................'}</p>
                 <p style={{ margin: '1mm 0', display: 'flex', gap: '3mm' }}><span>•</span> {quotationDraft.email || '..........................................................'}</p>
              </div>
           </div>

           {/* Main Project Specification Box */}
           <div style={{ border: '1px solid #000', minHeight: '420px', padding: '10mm', marginBottom: '8mm', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', width: '100%' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '15mm', rowGap: '6mm' }}>
                 {formConfig.filter(f => f.visible && (f.section === 'Architecture' || f.section === 'Financials')).map(f => {
                    const val = quotationDraft[f.db_key];
                    // Removed Design Charge and Budget from PDF as requested
                    if (!val || val === 'N/A' || f.db_key === 'asking_fee' || f.db_key === 'budget') return null;
                    return (
                       <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '0.5px solid #eee', paddingBottom: '1mm', alignItems: 'baseline' }}>
                          <span style={{ fontSize: '10pt', fontWeight: 700, color: '#666', textTransform: 'uppercase', marginRight: '4mm' }}>{f.label}:</span>
                          <span style={{ fontSize: '11pt', fontWeight: 800, color: '#000', textAlign: 'right' }}>{val}</span>
                       </div>
                    );
                 })}
              </div>
              
              <div style={{ flex: 1 }}></div>

              {/* Total display area - EMPTY because user requested to remove Design Charge */}
           </div>

           {/* Signature / Footer Section */}
           <div style={{ marginTop: '20mm', width: '100%' }}>
              <div style={{ width: '75mm' }}>
                 <p style={{ fontSize: '12pt', fontWeight: 800, margin: 0 }}>Sincerely,</p>
                 <p style={{ fontSize: '12pt', fontWeight: 800, marginTop: '2mm', marginBottom: 0 }}>Marketing Manager</p>
                 <p style={{ fontSize: '12pt', fontWeight: 900, margin: 0 }}>Hossain House Design</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

const ChevronDown = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m6 9 6 6 6-6"/></svg>
);

export default LeadDetails;
