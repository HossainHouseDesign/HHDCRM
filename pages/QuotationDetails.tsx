
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Lead, FormFieldConfig } from '../types';
import { 
  ArrowLeft, FileSpreadsheet, Download, Edit3, Trash2, 
  MapPin, Phone, Mail, Banknote, RefreshCw, X, Save, 
  CheckCircle2, Info, Layout, Layers, Ruler, Briefcase, ChevronDown,
  UserCheck, ShieldCheck, User, Map, Home, Zap, Compass, Hammer, Paintbrush
} from 'lucide-react';
import { DEFAULT_FORM_CONFIG } from './Settings';
import { useNotification } from '../App';

const STANDARD_COLUMNS = [
  'client_name', 'phone', 'email', 'current_location', 'land_area', 'address', 'upazila', 
  'union_name', 'police_station', 'village_name', 'package', 'asking_fee', 'budget', 'social_media', 
  'next_calling_date', 'notes', 'foundation', 'unit_count', 'bedroom_count', 
  'bathroom_count', 'stair_details', 'status', 'is_client', 'interest_construction', 'interest_interior'
];

const QuotationDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const pdfTemplateRef = useRef<HTMLDivElement>(null);

  const [quotation, setQuotation] = useState<Lead | null>(null);
  const [formConfig, setFormConfig] = useState<FormFieldConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<Partial<Lead>>({});
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  // State for editable conversion data (Full Form)
  const [convertFullData, setConvertFullData] = useState<Record<string, any>>({});

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
      const qData = leadRes.data as Lead;
      const config: FormFieldConfig[] = configRes.data?.value || DEFAULT_FORM_CONFIG;
      
      setQuotation(qData);
      setEditData(qData);
      setFormConfig(config);
      
      // Initialize conversion data
      const initial: Record<string, any> = {};
      config.forEach(f => {
        const val = qData[f.db_key as keyof Lead] !== undefined ? qData[f.db_key as keyof Lead] : qData.metadata?.[f.db_key];
        initial[f.db_key] = val !== undefined ? val : (f.type === 'number' ? 0 : (f.type === 'checkbox' ? false : ''));
      });
      setConvertFullData(initial);
      
    } catch (err) {
      showNotification("Failed to load quotation records.", "error");
      navigate('/quotations');
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToClient = async () => {
    if (!quotation || isConverting) return;
    setIsConverting(true);
    try {
      const payload: Record<string, any> = {
        is_client: true, 
        converted_at: new Date().toISOString(),
        status: 'Completed',
        updated_at: new Date().toISOString(),
        metadata: { ...(quotation.metadata || {}) }
      };

      Object.keys(convertFullData).forEach(dbKey => {
        const val = convertFullData[dbKey];
        if (STANDARD_COLUMNS.includes(dbKey)) {
          payload[dbKey] = val;
        } else {
          payload.metadata[dbKey] = val;
        }
      });

      const { error } = await supabase.from('leads').update(payload).eq('id', quotation.id);
      if (error) throw error;
      
      showNotification(`Quotation accepted! ${convertFullData.client_name} is now an active client.`, "success");
      navigate('/clients');
    } catch (err: any) {
      showNotification(`Conversion failed: ${err.message}`, "error");
    } finally {
      setIsConverting(false);
      setShowConvertModal(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!pdfTemplateRef.current || !quotation) return;
    setIsGeneratingPDF(true);
    
    setTimeout(async () => {
      try {
        const element = pdfTemplateRef.current;
        if (!element) return;

        const opt = {
          margin: 0,
          filename: `Quotation_${quotation.client_name || 'Project'}.pdf`,
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
        showNotification("PDF Document Exported.", "success");
      } catch (err) {
        console.error("PDF Export Error:", err);
        showNotification("Export failed.", "error");
      } finally {
        setIsGeneratingPDF(false);
      }
    }, 300);
  };

  const handleUpdate = async () => {
    if (!quotation) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('leads').update({ ...editData, updated_at: new Date().toISOString() }).eq('id', quotation.id);
      if (error) throw error;
      setQuotation({ ...quotation, ...editData } as Lead);
      setIsEditing(false);
      showNotification("Quotation record updated successfully.", "success");
    } catch (err) {
      showNotification("Update synchronization failed.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!quotation) return;
    if (!window.confirm("Permanently remove this quotation record?")) return;
    try {
      const { error } = await supabase.from('leads').delete().eq('id', quotation.id);
      if (error) throw error;
      showNotification("Quotation record erased.", "info");
      navigate('/quotations');
    } catch (err) {
      showNotification("Failed to erase record.", "error");
    }
  };

  const getFieldValue = (dbKey: string) => {
    if (!quotation) return '';
    const val = (quotation as any)[dbKey] !== undefined ? (quotation as any)[dbKey] : quotation.metadata?.[dbKey];
    if (val === null || val === undefined || val === '') return '';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    return val;
  };

  const getSectionIcon = (section: string) => {
    switch (section) {
      case 'Identity': return <User className="w-4 h-4 text-purple-500" />;
      case 'Architecture': return <Home className="w-4 h-4 text-purple-500" />;
      case 'Logistics': return <Zap className="w-4 h-4 text-purple-500" />;
      case 'Financials': return <Banknote className="w-4 h-4 text-purple-500" />;
      case 'Interests': return <CheckCircle2 className="w-4 h-4 text-purple-500" />;
      default: return <Compass className="w-4 h-4 text-purple-500" />;
    }
  };

  if (loading || !quotation) return (
    <div className="h-[80vh] flex flex-col items-center justify-center gap-6 px-6 text-center">
      <RefreshCw className="w-12 h-12 text-purple-600 animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">ACCESSING ARCHIVE...</p>
    </div>
  );

  const modalInputClass = "w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-purple-500/30 transition-all shadow-inner";

  const groupedFields = formConfig.reduce((acc, field) => {
    if (!field.visible) return acc;
    const section = field.section || 'General';
    if (!acc[section]) acc[section] = [];
    acc[section].push(field);
    return acc;
  }, {} as Record<string, FormFieldConfig[]>);

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-32 animate-in fade-in duration-700 overflow-x-hidden relative">
      
      {/* FULL Quotation Conversion Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[48px] p-8 md:p-14 max-w-5xl w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300 relative overflow-hidden flex flex-col max-h-[90vh]">
            <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/5 blur-[100px] rounded-full pointer-events-none" />
            
            <div className="flex justify-between items-start mb-8 relative z-10 shrink-0">
              <div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Convert Quotation to Client</h3>
                <p className="text-[10px] font-black text-purple-600 uppercase tracking-[0.3em] mt-2">VALIDATED CONTRACTUAL REVIEW & OVERRIDE</p>
              </div>
              <button onClick={() => setShowConvertModal(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-red-500 transition-all"><X className="w-6 h-6" /></button>
            </div>

            <div className="flex-1 overflow-y-auto pr-4 no-scrollbar space-y-12 pb-10">
               {Object.keys(groupedFields).map(section => (
                 <div key={section} className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                       <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600">
                          {getSectionIcon(section)}
                       </div>
                       <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">{section} Specification</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                       {groupedFields[section].map(f => (
                         <div key={f.id} className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{f.label}</label>
                            {f.type === 'select' ? (
                               <div className="relative">
                                  <select 
                                     className={modalInputClass}
                                     value={convertFullData[f.db_key] || ''}
                                     onChange={e => setConvertFullData({...convertFullData, [f.db_key]: e.target.value})}
                                  >
                                     <option value="">N/A</option>
                                     {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                                  </select>
                                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                               </div>
                            ) : f.type === 'textarea' ? (
                               <textarea 
                                  className={`${modalInputClass} h-24 py-3 resize-none`}
                                  value={convertFullData[f.db_key] || ''}
                                  onChange={e => setConvertFullData({...convertFullData, [f.db_key]: e.target.value})}
                               />
                            ) : f.type === 'checkbox' ? (
                               <button 
                                 type="button"
                                 onClick={() => setConvertFullData({...convertFullData, [f.db_key]: !convertFullData[f.db_key]})}
                                 className={`w-full h-12 px-4 rounded-xl transition-all flex items-center gap-3 border shadow-inner ${convertFullData[f.db_key] ? 'bg-purple-50 border-purple-500/30' : 'bg-slate-50 border-slate-100'}`}
                               >
                                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${convertFullData[f.db_key] ? 'bg-purple-500 border-purple-500' : 'bg-white border-slate-300'}`}>
                                     {convertFullData[f.db_key] && <CheckCircle2 className="w-3 h-3 text-white" />}
                                  </div>
                                  <span className={`text-[12px] font-bold ${convertFullData[f.db_key] ? 'text-purple-900' : 'text-slate-500'}`}>{f.label}</span>
                               </button>
                            ) : (
                               <input 
                                  type={f.type === 'number' ? 'number' : (f.type === 'date' ? 'date' : 'text')}
                                  className={`${modalInputClass} ${f.db_key === 'asking_fee' ? 'text-purple-700 font-black' : ''}`}
                                  value={convertFullData[f.db_key] ?? ''}
                                  onChange={e => setConvertFullData({...convertFullData, [f.db_key]: f.type === 'number' ? Number(e.target.value) : e.target.value})}
                               />
                            )}
                         </div>
                       ))}
                    </div>
                 </div>
               ))}

               <div className="p-8 bg-purple-50 rounded-[32px] border border-purple-100/50 flex items-start gap-5">
                  <ShieldCheck className="w-8 h-8 text-purple-500 shrink-0" />
                  <div className="space-y-1">
                     <p className="text-[12px] font-black text-purple-900 uppercase tracking-widest">Architectural Agreement</p>
                     <p className="text-[11px] font-medium text-purple-800 leading-relaxed max-w-2xl">
                        Promoting this quotation will finalize the proposal phase. The record will move to the <strong>Active Project Portfolio</strong> and the lifecycle will be marked as <strong>Completed</strong>.
                     </p>
                  </div>
               </div>
            </div>

            <div className="pt-8 border-t border-slate-100 mt-auto flex flex-col sm:flex-row items-center gap-4 relative z-10 shrink-0">
               <button onClick={() => setShowConvertModal(false)} className="w-full sm:w-auto px-10 py-5 text-slate-400 text-[11px] font-black uppercase tracking-widest hover:text-red-500 transition-all">Cancel Review</button>
               <button 
                  onClick={handleConvertToClient} 
                  disabled={isConverting}
                  className="w-full flex-1 py-7 bg-purple-600 text-white rounded-[28px] text-[12px] font-black uppercase tracking-[0.3em] hover:bg-black transition-all flex items-center justify-center gap-4 shadow-2xl shadow-purple-900/20 active:scale-95 disabled:opacity-50"
               >
                  {isConverting ? <RefreshCw className="w-6 h-6 animate-spin text-purple-200" /> : <UserCheck className="w-6 h-6 text-purple-200" />} 
                  COMMIT TO ACTIVE PORTFOLIO
               </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[1200px] mx-auto px-6 md:px-12 pt-12 space-y-12">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="flex items-center gap-8 min-w-0">
            <button onClick={() => navigate('/quotations')} className="w-14 h-14 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center justify-center hover:bg-slate-50 transition-all shrink-0"><ArrowLeft className="w-6 h-6 text-slate-500" /></button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-4">
                <h1 className="text-4xl font-black text-slate-900 tracking-tight truncate">Quotation: {quotation.client_name}</h1>
                <span className="px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest bg-purple-50 text-purple-600 border border-purple-100">QTN-{quotation.id.slice(0, 8).toUpperCase()}</span>
              </div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em] mt-3 flex items-center gap-3"><FileSpreadsheet className="w-3.5 h-3.5 text-purple-500" /> Official Design Proposal Archive</p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
             {!quotation.is_client && (
               <button 
                onClick={() => setShowConvertModal(true)} 
                className="flex-1 sm:flex-none px-8 py-4 bg-purple-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3 border border-white/10"
               >
                 <UserCheck className="w-5 h-5" /> Convert Client
               </button>
             )}
             <button 
              onClick={handleDownloadPDF} 
              disabled={isGeneratingPDF}
              className="flex-1 sm:flex-none px-8 py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3 disabled:opacity-50"
             >
               {isGeneratingPDF ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5 text-emerald-400" />} 
               Export PDF
             </button>
             <button onClick={() => setIsEditing(!isEditing)} className={`p-4 rounded-2xl transition-all shadow-sm ${isEditing ? 'bg-red-50 text-red-500' : 'bg-white border border-slate-100 text-slate-400 hover:text-purple-600'}`}>{isEditing ? <X className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}</button>
             <button onClick={handleDelete} className="p-4 bg-white border border-slate-100 text-slate-400 hover:text-red-500 rounded-2xl transition-all shadow-sm"><Trash2 className="w-5 h-5" /></button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-8">
            <div className="bg-white p-12 md:p-16 rounded-[64px] border border-slate-100 shadow-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 blur-[100px] rounded-full pointer-events-none" />
               <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.3em] mb-12 flex items-center gap-4"><Layout className="w-6 h-6 text-purple-500" /> Technical Proposal Specs</h3>
               {isEditing ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-top-4 duration-500">
                    {formConfig.filter(f => f.visible && (f.section === 'Architecture' || f.section === 'Financials' || f.section === 'Interests')).map(f => (
                       <div key={f.id} className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{f.label}</label>
                          {f.type === 'checkbox' ? (
                            <button 
                              type="button"
                              onClick={() => setEditData({...editData, [f.db_key]: !editData[f.db_key as keyof Lead]})}
                              className={`w-full h-14 px-6 bg-slate-50 rounded-2xl transition-all flex items-center gap-4 border-2 border-transparent ${editData[f.db_key as keyof Lead] ? 'border-purple-500/20 bg-white' : ''}`}
                            >
                               <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${editData[f.db_key as keyof Lead] ? 'bg-purple-500 border-purple-500' : 'border-slate-300 bg-white'}`}>
                                  {editData[f.db_key as keyof Lead] && <CheckCircle2 className="w-3 h-3 text-white" />}
                               </div>
                               <span className={`text-[13px] font-bold ${editData[f.db_key as keyof Lead] ? 'text-purple-900' : 'text-slate-500'}`}>{f.label}</span>
                            </button>
                          ) : (
                            <input className="w-full h-14 px-6 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white border-2 border-transparent focus:border-purple-500/20 transition-all shadow-inner" value={(editData as any)[f.db_key] || ''} onChange={e => setEditData({...editData, [f.db_key]: e.target.value})} />
                          )}
                       </div>
                    ))}
                    <div className="md:col-span-2 pt-6"><button onClick={handleUpdate} disabled={saving} className="w-full py-6 bg-purple-600 text-white rounded-3xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-purple-700 shadow-xl">{saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Save Revisions</button></div>
                 </div>
               ) : (
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-y-12 gap-x-8">
                    {formConfig.filter(f => f.visible && (f.section === 'Architecture' || f.section === 'Financials' || f.section === 'Interests')).map((f) => (
                      <div key={f.id} className="space-y-2 group">
                         <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest group-hover:text-purple-500 transition-colors">{f.label}</p>
                         <div className="flex items-center gap-3 font-black text-slate-900">
                            <Layers className="w-4 h-4 text-purple-300 group-hover:text-purple-500 transition-colors" />
                            <span className="text-lg">{getFieldValue(f.db_key) || 'N/A'}</span>
                         </div>
                      </div>
                    ))}
                 </div>
               )}
            </div>
          </div>
          <div className="lg:col-span-4 space-y-8">
             <div className="bg-[#0f172a] p-10 rounded-[48px] shadow-2xl relative overflow-hidden text-white">
                <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 blur-[60px] rounded-full pointer-events-none" />
                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-purple-400 mb-8 flex items-center gap-3"><Info className="w-5 h-5" /> Client Entity</h3>
                <div className="space-y-6">
                   <div className="flex items-center gap-5">
                      <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center font-black text-2xl text-purple-300">{quotation.client_name.charAt(0)}</div>
                      <div><p className="text-xl font-black tracking-tight">{quotation.client_name}</p><p className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-1">Validated Lead</p></div>
                   </div>
                   <div className="space-y-4 pt-4 border-t border-white/5">
                      <div className="flex items-center gap-4"><Phone className="w-5 h-5 text-purple-400" /><span className="text-sm font-bold">{quotation.phone}</span></div>
                      <div className="flex items-center gap-4"><MapPin className="w-5 h-5 text-purple-400" /><span className="text-sm font-bold">{quotation.address}, {quotation.upazila}</span></div>
                   </div>
                   
                   {/* Interests indicators */}
                   <div className="flex gap-3 pt-4">
                      {quotation.interest_construction && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                           <Hammer className="w-3 h-3" /> Construction
                        </div>
                      )}
                      {quotation.interest_interior && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 rounded-lg text-[9px] font-black text-blue-400 uppercase tracking-widest">
                           <Paintbrush className="w-3 h-3" /> Interior
                        </div>
                      )}
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
      
      {/* 
          PROFESSIONAL PDF TEMPLATE: EXACT MATCH FOR HOSSAIN HOUSE DESIGN 
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
              <div style={{ fontSize: '12pt', lineHeight: '1.4', fontWeight: 600, color: '#111' }}>
                 <p style={{ margin: '1mm 0', display: 'flex', gap: '3mm' }}><span>•</span> {quotation.client_name || '..........................................................'}</p>
                 <p style={{ margin: '1mm 0', display: 'flex', gap: '3mm' }}><span>•</span> {quotation.phone || '..........................................................'}</p>
                 <p style={{ margin: '1mm 0', display: 'flex', gap: '3mm' }}><span>•</span> {quotation.address ? `${quotation.address}, ${quotation.upazila || ''}` : '..........................................................'}</p>
                 <p style={{ margin: '1mm 0', display: 'flex', gap: '3mm' }}><span>•</span> {quotation.email || '..........................................................'}</p>
              </div>
           </div>

           {/* Main Project Specification Box */}
           <div style={{ border: '1px solid #000', minHeight: '420px', padding: '10mm', marginBottom: '8mm', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', width: '100%' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '15mm', rowGap: '6mm' }}>
                 {formConfig.filter(f => f.visible && (f.section === 'Architecture' || f.section === 'Financials' || f.section === 'Interests')).map(f => {
                    const val = (quotation as any)[f.db_key] !== undefined ? (quotation as any)[f.db_key] : quotation.metadata?.[f.db_key];
                    // Removed asking fee and budget from PDF as requested
                    if (!val || val === 'N/A' || val === false || f.db_key === 'asking_fee' || f.db_key === 'budget') return null;
                    return (
                       <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '0.5px solid #eee', paddingBottom: '1mm', alignItems: 'baseline' }}>
                          <span style={{ fontSize: '10pt', fontWeight: 700, color: '#666', textTransform: 'uppercase', marginRight: '4mm' }}>{f.label}:</span>
                          <span style={{ fontSize: '11pt', fontWeight: 800, color: '#000', textAlign: 'right' }}>{typeof val === 'boolean' ? 'Yes' : val}</span>
                       </div>
                    );
                 })}
              </div>
              
              <div style={{ flex: 1 }}></div>

              {/* Total display area - EMPTY as requested */}
           </div>

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

export default QuotationDetails;
