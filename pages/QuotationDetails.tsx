
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Lead, FormFieldConfig, VisitStatus } from '../types';
import { 
  ArrowLeft, FileSpreadsheet, Download, Edit3, Trash2, 
  MapPin, Phone, Mail, Banknote, RefreshCw, X, Save, 
  CheckCircle2, Info, Layout, Layers, Ruler, Briefcase, ChevronDown,
  UserCheck, ShieldCheck, User, Map, Home, Zap, Compass, Hammer, Paintbrush,
  FileText, MessageSquare, Clock, CheckCheck, PauseCircle
} from 'lucide-react';
import { DEFAULT_FORM_CONFIG } from './Settings';
import { useNotification, useUser } from '../App';

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
  const { profile } = useUser();
  const pdfTemplateRef = useRef<HTMLDivElement>(null);

  const [quotation, setQuotation] = useState<Lead | null>(null);
  const [formConfig, setFormConfig] = useState<FormFieldConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<Partial<Lead>>({});
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [convertFullData, setConvertFullData] = useState<Record<string, any>>({});
  const [quotationBg, setQuotationBg] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [leadRes, configRes, brandingRes] = await Promise.all([
        supabase.from('leads').select('*').eq('id', id).single(),
        supabase.from('settings').select('*').eq('key', 'lead_form_config').single(),
        supabase.from('settings').select('*').eq('key', 'quotation_bg_url').single()
      ]);

      if (leadRes.error) throw leadRes.error;
      const qData = leadRes.data as Lead;
      const config: FormFieldConfig[] = configRes.data?.value || DEFAULT_FORM_CONFIG;
      
      setQuotation(qData);
      setEditData(qData);
      setFormConfig(config);
      setQuotationBg(brandingRes.data?.value || null);
      
      const initial: Record<string, any> = {};
      config.forEach(f => {
        const val = qData[f.db_key as keyof Lead] !== undefined ? qData[f.db_key as keyof Lead] : qData.metadata?.[f.db_key];
        initial[f.db_key] = val !== undefined ? val : (f.type === 'number' ? 0 : (f.type === 'checkbox' ? false : ''));
      });
      setConvertFullData(initial);
      
    } catch (err) {
      showNotification("Failed to load records.", "error");
      navigate('/quotations');
    } finally {
      setLoading(false);
    }
  };

  const formatWhatsAppLink = (phone: string) => {
    if (!phone) return '#';
    const clean = phone.replace(/\D/g, '');
    const number = clean.startsWith('0') ? `88${clean}` : clean;
    return `https://wa.me/${number}`;
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
        if (STANDARD_COLUMNS.includes(dbKey)) payload[dbKey] = val;
        else payload.metadata[dbKey] = val;
      });

      const { error } = await supabase.from('leads').update(payload).eq('id', quotation.id);
      if (error) throw error;
      
      showNotification(`Acceptance verified! Portfolio updated.`, "success");
      navigate('/clients');
    } catch (err: any) {
      showNotification(`Sync Error: ${err.message}`, "error");
    } finally {
      setIsConverting(false);
      setShowConvertModal(false);
    }
  };

  const handleDownloadDoc = async () => {
    if (!quotation) return;
    setIsGeneratingDoc(true);

    setTimeout(async () => {
      try {
        const clientName = quotation.client_name;
        const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        
        const specs = formConfig.filter(f => f.visible && (f.section === 'Architecture' || f.section === 'Interests')).map(f => {
          const val = getFieldValue(f.db_key);
          if (!val || val === 'N/A' || val === 'No' || val === false) return null;
          return { label: f.label, value: val };
        }).filter(Boolean);

        let specsRows = '';
        for (let i = 0; i < (specs as any[]).length; i += 2) {
          const s1 = (specs as any[])[i];
          const s2 = (specs as any[])[i+1];
          specsRows += `
            <tr>
              <td style="width: 50%; padding: 4px 0; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
                <div style="font-size: 7.5pt; color: #64748b; font-weight: bold; text-transform: uppercase;">${s1?.label || ''}</div>
                <div style="font-size: 10pt; color: #1e293b; font-weight: bold;">${s1?.value || ''}</div>
              </td>
              <td style="width: 50%; padding: 4px 0; border-bottom: 1px solid #f1f5f9; padding-left: 20px; vertical-align: top;">
                <div style="font-size: 7.5pt; color: #64748b; font-weight: bold; text-transform: uppercase;">${s2?.label || ''}</div>
                <div style="font-size: 10pt; color: #1e293b; font-weight: bold;">${s2?.value || ''}</div>
              </td>
            </tr>`;
        }

        const htmlString = `
          <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
          <head>
            <meta charset='utf-8'>
            <style>
              @page { size: 8.5in 11in; margin: 0.4in; }
              body { font-family: 'Plus Jakarta Sans', Arial, sans-serif; color: #111; line-height: 1.1; margin: 0; padding: 0; }
              .header-table { width: 100%; border-collapse: collapse; margin-bottom: 5px; }
              .divider { height: 4px; background-color: #f05a25; width: 100%; margin: 5px 0; }
              .specs-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            </style>
          </head>
          <body>
            <div style="background-color: #042952; height: 10px; width: 100%;"></div>
            <table class="header-table">
              <tr>
                <td style="padding: 10px 0;">
                  <h1 style="font-size: 22pt; margin: 0; color: #042952; font-weight: 900;">Hossain House Design</h1>
                  <p style="font-size: 9pt; color: #333; margin: 1px 0;">House 27, Road 14, Block G, Niketon, Gulshan 1, Dhaka</p>
                  <p style="font-size: 8.5pt; color: #444; margin: 0;">+8801705323220, support@hossainhousedesign.com</p>
                </td>
                <td style="text-align: right; vertical-align: middle;">
                   <div style="font-size: 10pt; font-weight: bold;">Date: ${date}</div>
                </td>
              </tr>
            </table>
            <div class="divider"></div>
            
            <div style="margin-top: 10px;">
              <div style="font-size: 11pt; font-weight: bold;">To,</div>
              <div style="font-size: 10pt; margin-top: 2px;">
                <div style="font-weight: bold; font-size: 11pt;">${clientName}</div>
                <div>${quotation.address || ''}, ${quotation.upazila || ''}</div>
              </div>
            </div>

            <table class="specs-table">
              ${specsRows}
            </table>

            <div style="margin-top: 15px; font-size: 9pt; color: #64748b; font-style: italic;">
              Thank you for choosing Hossain House Design. We are committed to delivering architectural excellence tailored to your requirements.
            </div>

            <div style="margin-top: 20px;">
              <div style="font-size: 10pt;">Sincerely</div>
              <div style="font-size: 11pt; font-weight: bold; margin-top: 2px;">${profile?.full_name || 'Marketing Manager'}</div>
              <div style="font-size: 10pt; font-weight: bold; color: #64748b;">${profile?.designation || 'Hossain House Design'}</div>
              <div style="font-size: 11pt; font-weight: 900;">Hossain House Design</div>
              <div style="font-size: 9pt;">Ph: +8801705323220</div>
            </div>

            <div style="text-align: center; margin-top: 30px; font-size: 8.5pt; color: #333; border-top: 1px solid #f1f5f9; padding-top: 5px;">
              www.hossainhousedesign.com
            </div>
            <div style="background-color: #042952; height: 10px; width: 100%; margin-top: 5px;"></div>
          </body>
          </html>`;
        
        const blob = new Blob(['\ufeff', htmlString], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Quotation_${quotation.client_name}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showNotification("Word Document Exported.", "success");
      } catch (err) {
        showNotification("Doc export failed.", "error");
      } finally {
        setIsGeneratingDoc(false);
      }
    }, 300);
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
          filename: `Quotation_${quotation.client_name}.pdf`,
          image: { type: 'jpeg', quality: 1.0 },
          html2canvas: { scale: 4, useCORS: true, letterRendering: true, logging: false },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // @ts-ignore
        await window.html2pdf().from(element).set(opt).save();
        showNotification("PDF Exported.", "success");
      } catch (err) {
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
      showNotification("Record updated.", "success");
    } catch (err) {
      showNotification("Update failed.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!quotation) return;
    if (!window.confirm("Erase this quotation?")) return;
    try {
      const { error } = await supabase.from('leads').delete().eq('id', quotation.id);
      if (error) throw error;
      showNotification("Record purged.", "info");
      navigate('/quotations');
    } catch (err) {
      showNotification("Purge failed.", "error");
    }
  };

  const getFieldValue = (dbKey: string) => {
    if (!quotation) return '';
    const val = (quotation as any)[dbKey] !== undefined ? (quotation as any)[dbKey] : quotation.metadata?.[dbKey];
    if (val === null || val === undefined || val === '') return '';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    return val;
  };

  if (loading || !quotation) return <div className="h-[80vh] flex flex-col items-center justify-center gap-6"><RefreshCw className="w-12 h-12 text-purple-600 animate-spin" /></div>;

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
      
      {/* Convert to Client Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-5xl w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300 relative overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-start mb-6 shrink-0 leading-none">
              <div className="leading-none">
                <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase leading-none">Acceptance Logic</h3>
                <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mt-1.5 opacity-80 leading-none">Final specification audit & repository induction</p>
              </div>
              <button onClick={() => setShowConvertModal(false)} className="p-1.5 bg-slate-50 text-slate-400 rounded-lg hover:text-slate-900 transition-all leading-none focus:outline-none"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 no-scrollbar space-y-6 pb-6">
               {Object.keys(groupedFields).map(section => (
                 <div key={section} className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
                       <Home className="w-3.5 h-3.5 text-slate-900" />
                       <h4 className="text-[9px] font-black text-slate-900 uppercase tracking-widest">{section} Metrics</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                       {groupedFields[section].map(f => (
                          <div key={f.id} className="space-y-1">
                             <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">{f.label}</label>
                             {f.type === 'select' ? (
                                <div className="relative leading-none">
                                   <select className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-[12px] font-bold text-slate-700 outline-none focus:border-slate-900 transition-all shadow-none appearance-none" value={convertFullData[f.db_key] || ''} onChange={e => setConvertFullData({...convertFullData, [f.db_key]: e.target.value})}><option value="">N/A</option>{f.options?.map(o => <option key={o} value={o}>{o}</option>)}</select>
                                   <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-300 pointer-events-none" />
                                </div>
                             ) : f.type === 'textarea' ? (
                                <textarea className="w-full h-20 p-3 bg-white border border-slate-200 rounded-xl text-[12px] font-bold text-slate-700 outline-none focus:border-slate-900 transition-all shadow-none resize-none" value={convertFullData[f.db_key] || ''} onChange={e => setConvertFullData({...convertFullData, [f.db_key]: e.target.value})} />
                             ) : f.type === 'checkbox' ? (
                                <button type="button" onClick={() => setConvertFullData({...convertFullData, [f.db_key]: !convertFullData[f.db_key]})} className={`w-full h-10 px-3 rounded-xl transition-all flex items-center gap-2 border shadow-none leading-none ${convertFullData[f.db_key] ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-400'}`}><CheckCircle2 className={`w-3.5 h-3.5 ${convertFullData[f.db_key] ? 'text-emerald-400' : 'text-slate-200'}`} /><span className="text-[10px] font-black uppercase truncate">{f.label}</span></button>
                             ) : (
                                <input type={f.type === 'number' ? 'number' : (f.type === 'date' ? 'date' : 'text')} className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-[12px] font-bold text-slate-700 outline-none focus:border-slate-900 transition-all shadow-none" value={convertFullData[f.db_key] ?? ''} onChange={e => setConvertFullData({...convertFullData, [f.db_key]: f.type === 'number' ? Number(e.target.value) : e.target.value})} />
                             )}
                          </div>
                       ))}
                    </div>
                 </div>
               ))}
               <div className="p-4 bg-[#f8fafc] rounded-2xl border border-slate-100 flex items-start gap-3">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="space-y-1 leading-none">
                     <p className="text-[9px] font-black text-slate-900 uppercase tracking-widest leading-none">Protocol Warning</p>
                     <p className="text-[8px] font-black text-slate-400 leading-relaxed uppercase tracking-tight">System will transition this proposal into a <strong className="text-slate-900">Live Client Record</strong>. Operation is synchronous and irreversible.</p>
                  </div>
               </div>
            </div>
            <div className="pt-4 border-t border-slate-50 mt-auto flex items-center gap-3 relative z-10 shrink-0">
               <button onClick={() => setShowConvertModal(false)} className="px-6 py-4 text-slate-300 text-[9px] font-black uppercase tracking-widest hover:text-slate-900 transition-all leading-none focus:outline-none">Cancel</button>
               <button onClick={handleConvertToClient} disabled={isConverting} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-3 shadow-none active:scale-95 disabled:opacity-50 leading-none">{isConverting ? <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> : <UserCheck className="w-4 h-4 text-emerald-400" />} AUTHORIZE PROMOTION</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[1240px] mx-auto px-4 md:px-6 pt-6 md:pt-10 space-y-6 md:space-y-8">
        <header className="flex flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <button onClick={() => navigate('/quotations')} className="hidden md:flex w-10 h-10 bg-white border border-slate-200 rounded-xl shadow-none items-center justify-center hover:bg-slate-50 transition-all shrink-0 leading-none"><ArrowLeft className="w-4 h-4 text-slate-400" /></button>
            <div className="min-w-0 leading-none">
              <div className="flex flex-wrap items-center gap-3 leading-none">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase truncate leading-none">{quotation.client_name}</h1>
                <span className="px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 border border-slate-200 leading-none">QTN-{quotation.id.slice(0, 8).toUpperCase()}</span>
              </div>
              <p className="text-slate-400 text-[8px] font-black uppercase tracking-widest mt-1.5 flex items-center gap-2 leading-none opacity-80"><FileSpreadsheet className="w-3 h-3 text-slate-900" /> OFFICIAL PROPOSAL ARCHIVE</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
             <button onClick={() => setShowConvertModal(true)} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-none hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 active:scale-95 leading-none">
               <UserCheck className="w-3.5 h-3.5" /> Convert
             </button>
             <button onClick={handleDownloadDoc} disabled={isGeneratingDoc} className="hidden sm:flex p-2.5 bg-white border border-slate-200 text-slate-300 hover:text-slate-900 rounded-xl transition-all shadow-none leading-none">
               {isGeneratingDoc ? <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> : <FileText className="w-4 h-4" />}
             </button>
             <button onClick={handleDownloadPDF} disabled={isGeneratingPDF} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-none hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 inline-flex leading-none">
               {isGeneratingPDF ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" /> : <Download className="w-3.5 h-3.5 text-emerald-400" />} <span className="hidden sm:inline">PDF</span>
             </button>
             <button onClick={() => setIsEditing(!isEditing)} className={`p-2.5 rounded-xl transition-all shadow-none border leading-none ${isEditing ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-200 hover:text-slate-900'}`}>{isEditing ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}</button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
           <div className="lg:col-span-8">
              <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-200 shadow-none relative overflow-hidden transition-all hover:bg-slate-50/20">
                 <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-6 md:mb-8 flex items-center gap-2.5 leading-none"><Layout className="w-4 h-4 text-slate-900" /> Proposal Metrics</h3>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 md:gap-y-8 gap-x-4 md:gap-x-6">
                    {formConfig.filter(f => f.visible && (f.section === 'Architecture' || f.section === 'Interests' || f.section === 'Financials')).map((f) => (
                      <div key={f.id} className="space-y-1.5 group font-black uppercase leading-none">
                         <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest group-hover:text-slate-900 transition-colors leading-none">{f.label}</p>
                         <div className={`flex items-center gap-2 leading-none mt-1 ${f.db_key === 'asking_fee' ? 'text-slate-950 underline decoration-emerald-500/50 decoration-2' : 'text-slate-700'}`}>
                            <span className="text-[13px] font-black tracking-tight truncate leading-none">{getFieldValue(f.db_key) || 'N/A'}</span>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
           </div>

           <div className="lg:col-span-4">
              <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-200 shadow-none leading-none">
                <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2.5 leading-none">
                  <Phone className="w-4 h-4 text-slate-900" /> Contact Node
                </h3>
                <div className="space-y-3">
                  <a 
                    href={formatWhatsAppLink(quotation.phone)} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-slate-900 hover:bg-white transition-all flex justify-between items-center leading-none"
                  >
                    <div className="leading-none">
                      <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1.5">Direct Line</p>
                      <p className="text-[14px] font-black text-slate-900 leading-none">{quotation.phone}</p>
                    </div>
                    <div className="w-8 h-8 bg-white rounded-lg shadow-none flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all leading-none">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                  </a>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 leading-none">
                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1.5">Vault Email</p>
                    <p className="text-[14px] font-black text-slate-900 truncate leading-none uppercase">{quotation.email || 'N/A'}</p>
                  </div>
                </div>
              </div>
           </div>
        </div>
      </div>
      
      {/* BRANDED PDF TEMPLATE - INCORPORATING CUSTOM BACKGROUND */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '210mm', background: '#fff', zIndex: -1 }}>
        <div ref={pdfTemplateRef} style={{ width: '210mm', height: '296.5mm', padding: '0', fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1a1a1a', backgroundColor: '#fff', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
           <div style={{ height: '2mm', width: '100%', backgroundColor: '#042952' }}></div>
           
           {/* Dynamic Background Layer */}
           {quotationBg && (
              <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${quotationBg})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 1, zIndex: 0 }}></div>
           )}

           <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Header logic matches LeadDetails for consistency */}
              {!quotationBg && (
                <div style={{ padding: '2mm 20mm 2mm 20mm', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center', marginTop: '2mm' }}>
                    <h1 style={{ fontSize: '28pt', fontWeight: 900, margin: 0, padding: 0, color: '#042952', lineHeight: '1.1', letterSpacing: '-0.01em' }}>Hossain House Design</h1>
                    <p style={{ fontSize: '10pt', color: '#042952', fontWeight: 700, margin: '1mm 0' }}>www.hossainhousedesign.com, +8801705323220, +8801313199299</p>
                    <p style={{ fontSize: '9pt', color: '#333', fontWeight: 500, margin: '1mm 0' }}>House 27, Road 14, Block G, Niketon, Gulshan 1, Dhaka</p>
                  </div>
                </div>
              )}

              <div style={{ marginTop: quotationBg ? '45mm' : '2mm' }}>
                <div style={{ borderTop: quotationBg ? 'none' : '2px solid #f05a25', borderBottom: quotationBg ? 'none' : '2px solid #f05a25', margin: '2mm 0', textAlign: 'center', padding: '10px 0' }}>
                    <h2 style={{ fontSize: '28pt', fontWeight: 900, color: '#042952', letterSpacing: '0.15em', textTransform: 'uppercase', margin: 0 }}>Quotation</h2>
                </div>
              </div>

              <div style={{ padding: '4mm 25mm', flex: 1, position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px', alignItems: 'flex-start' }}>
                    <div>
                        <h3 style={{ fontSize: '12pt', fontWeight: 800, marginBottom: '6px', color: '#000' }}>To,</h3>
                        <div style={{ fontSize: '11pt', lineHeight: '1.4', fontWeight: 600, color: '#111' }}>
                          <p style={{ margin: '1px 0', fontSize: '12pt', fontWeight: 800 }}>{quotation.client_name}</p>
                          <p style={{ margin: '1px 0' }}>{quotation.current_location || 'Local'}</p>
                          <p style={{ margin: '1px 0' }}>{quotation.address}, {quotation.upazila}</p>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '11pt', fontWeight: 800, color: '#042952' }}>Date: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                  </div>

                  <div style={{ border: quotationBg ? 'none' : '1px solid #e2e8f0', borderRadius: '30px', padding: '30px', minHeight: '400px', backgroundColor: quotationBg ? 'rgba(255,255,255,0.7)' : 'transparent', backdropFilter: quotationBg ? 'blur(2px)' : 'none' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '20mm', rowGap: '8mm' }}>
                        {formConfig.filter(f => f.visible && (f.section === 'Architecture' || f.section === 'Interests' || f.section === 'Financials')).map(f => {
                          const val = getFieldValue(f.db_key);
                          if (!val || val === 'N/A' || val === 'No' || val === false) return null;
                          return (
                              <div key={f.id} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                                <p style={{ fontSize: '8pt', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>{f.label}</p>
                                <p style={{ fontSize: '11pt', fontWeight: 800, color: '#042952' }}>{val}</p>
                              </div>
                          );
                        })}
                    </div>
                  </div>

                  <div style={{ marginTop: '30px' }}>
                    <p style={{ fontSize: '10pt', color: '#042952', fontWeight: 800, marginBottom: '20px', textAlign: 'center' }}>
                        Thank you for your inquiry. We look forward to the opportunity to work with you.
                    </p>
                    <div style={{ marginTop: '35px' }}>
                        <p style={{ fontSize: '11pt', fontWeight: 600, margin: 0 }}>Sincerely</p>
                        <p style={{ fontSize: '12pt', fontWeight: 800, marginTop: '5px', marginBottom: 0, color: '#042952' }}>{profile?.full_name || 'Marketing Manager'}</p>
                        <p style={{ fontSize: '10pt', fontWeight: 700, margin: 0, color: '#64748b' }}>{profile?.designation || 'Hossain House Design'}</p>
                        <p style={{ fontSize: '12pt', fontWeight: 900, margin: 0, color: '#042952' }}>Hossain House Design</p>
                    </div>
                  </div>
              </div>

              {!quotationBg && <div style={{ height: '8mm', width: '100%', backgroundColor: '#042952' }}></div>}
           </div>
        </div>
      </div>
    </div>
  );
};

export default QuotationDetails;
