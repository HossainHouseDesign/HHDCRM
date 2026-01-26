import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Lead, FormFieldConfig } from '../types';
import { 
  ArrowLeft, FileSpreadsheet, Download, Edit3, Trash2, 
  MapPin, Phone, Mail, Banknote, RefreshCw, X, Save, 
  CheckCircle2, Info, Layout, Layers, Ruler, Briefcase, ChevronDown,
  UserCheck, ShieldCheck, User, Map, Home, Zap, Compass, Hammer, Paintbrush,
  FileText, MessageSquare
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
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
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
              body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; line-height: 1.1; margin: 0; padding: 0; }
              .header-table { width: 100%; border-collapse: collapse; margin-bottom: 5px; }
              .divider { height: 4px; background-color: #ff5a1f; width: 100%; margin: 5px 0; }
              .specs-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            </style>
          </head>
          <body>
            <div style="background-color: #0a2540; height: 10px; width: 100%;"></div>
            <table class="header-table">
              <tr>
                <td style="padding: 10px 0;">
                  <h1 style="font-size: 22pt; margin: 0; color: #000; font-weight: 900;">Hossain House Design</h1>
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
              <div style="font-size: 10pt;">Sincere</div>
              <div style="font-size: 11pt; font-weight: bold; margin-top: 2px;">Marketing Manager</div>
              <div style="font-size: 11pt; font-weight: 900;">Hossain House Design</div>
              <div style="font-size: 9pt;">Ph: +8801705323220</div>
            </div>

            <div style="text-align: center; margin-top: 30px; font-size: 8.5pt; color: #333; border-top: 1px solid #f1f5f9; padding-top: 5px;">
              www.hossainhousedesign.com
            </div>
            <div style="background-color: #0a2540; height: 10px; width: 100%; margin-top: 5px;"></div>
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
          html2canvas: { scale: 3, useCORS: true, letterRendering: true, logging: false },
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
          <div className="bg-white rounded-[48px] p-8 md:p-14 max-w-5xl w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300 relative overflow-hidden flex flex-col max-h-[90vh]">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
            <div className="flex justify-between items-start mb-8 relative z-10 shrink-0">
              <div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Promote to Client</h3>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mt-2">FINAL REVIEW BEFORE CONTRACTUAL PORTFOLIO INDUCTION</p>
              </div>
              <button onClick={() => setShowConvertModal(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-red-500 transition-all"><X className="w-6 h-6" /></button>
            </div>
            <div className="flex-1 overflow-y-auto pr-4 no-scrollbar space-y-12 pb-10">
               {Object.keys(groupedFields).map(section => (
                 <div key={section} className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                       <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">{getSectionIcon(section)}</div>
                       <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">{section} Final Specs</h4>
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
                     <p className="text-[12px] font-black text-emerald-900 uppercase tracking-widest">Authorized Conversion</p>
                     <p className="text-[11px] font-medium text-emerald-800 leading-relaxed max-w-2xl">Proceeding will transition this proposal into a <strong>Live Contractual Client</strong>. This action updates the global portfolio registry.</p>
                  </div>
               </div>
            </div>
            <div className="pt-8 border-t border-slate-100 mt-auto flex flex-col sm:flex-row items-center gap-4 relative z-10 shrink-0">
               <button onClick={() => setShowConvertModal(false)} className="w-full sm:w-auto px-10 py-5 text-slate-400 text-[11px] font-black uppercase tracking-widest hover:text-red-500 transition-all">Cancel Review</button>
               <button onClick={handleConvertToClient} disabled={isConverting} className="w-full flex-1 py-7 bg-[#064e3b] text-white rounded-[28px] text-[12px] font-black uppercase tracking-[0.3em] hover:bg-black transition-all flex items-center justify-center gap-4 shadow-2xl shadow-emerald-900/20 active:scale-95 disabled:opacity-50">{isConverting ? <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" /> : <UserCheck className="w-6 h-6 text-emerald-400" />} AUTHORIZE CLIENT PROMOTION</button>
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
                <h1 className="text-4xl font-black text-slate-900 tracking-tight truncate">{quotation.client_name}</h1>
                <span className="px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest bg-purple-50 text-purple-600 border border-purple-100">QTN-{quotation.id.slice(0, 8).toUpperCase()}</span>
              </div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em] mt-3 flex items-center gap-3"><FileSpreadsheet className="w-3.5 h-3.5 text-purple-500" /> Official Design Proposal Archive</p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
             <button onClick={() => setShowConvertModal(true)} className="flex-1 sm:flex-none px-8 py-4 bg-emerald-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 active:scale-95">
               <UserCheck className="w-5 h-5 text-white" /> Convert Client
             </button>
             <button onClick={handleDownloadDoc} disabled={isGeneratingDoc} className="p-4 bg-white border border-slate-100 text-slate-400 hover:text-blue-600 rounded-2xl transition-all shadow-sm">
               {isGeneratingDoc ? <RefreshCw className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
             </button>
             <button onClick={handleDownloadPDF} disabled={isGeneratingPDF} className="flex-1 sm:flex-none px-8 py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3 disabled:opacity-50">
               {isGeneratingPDF ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5 text-emerald-400" />} Export PDF
             </button>
             <button onClick={() => setIsEditing(!isEditing)} className={`p-4 rounded-2xl transition-all shadow-sm ${isEditing ? 'bg-red-50 text-red-500' : 'bg-white border border-slate-100 text-slate-400 hover:text-purple-600'}`}>{isEditing ? <X className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}</button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
           <div className="lg:col-span-8">
              <div className="bg-white p-12 md:p-16 rounded-[64px] border border-slate-100 shadow-xl relative overflow-hidden">
                 <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.3em] mb-12 flex items-center gap-4"><Layout className="w-6 h-6 text-purple-500" /> Technical Proposal Specs</h3>
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-y-12 gap-x-8">
                    {formConfig.filter(f => f.visible && (f.section === 'Architecture' || f.section === 'Interests' || f.section === 'Financials')).map((f) => (
                      <div key={f.id} className="space-y-2 group">
                         <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest group-hover:text-purple-500 transition-colors">{f.label}</p>
                         <div className={`flex items-center gap-3 font-black ${f.db_key === 'asking_fee' ? 'text-purple-700' : 'text-slate-900'}`}>
                            <Layers className={`w-4 h-4 ${f.db_key === 'asking_fee' ? 'text-purple-500' : 'text-purple-300'}`} />
                            <span className="text-lg">{getFieldValue(f.db_key) || 'N/A'}</span>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
           </div>

           <div className="lg:col-span-4">
              <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm">
                <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center gap-3">
                  <Phone className="w-5 h-5 text-purple-500" /> Contact Intel
                </h3>
                <div className="space-y-6">
                  <a 
                    href={formatWhatsAppLink(quotation.phone)} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="p-6 bg-slate-50 rounded-[32px] border border-slate-50 group hover:border-purple-500 hover:bg-purple-50/30 transition-all flex justify-between items-center"
                  >
                    <div>
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Direct Line</p>
                      <p className="text-lg font-black text-slate-900">{quotation.phone}</p>
                    </div>
                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                  </a>
                  <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-50 group hover:border-purple-100 transition-all">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Vault Email</p>
                    <p className="text-lg font-black text-slate-900 truncate">{quotation.email || 'N/A'}</p>
                  </div>
                </div>
              </div>
           </div>
        </div>
      </div>
      
      {/* BRANDED PDF TEMPLATE (NO WATERMARK HERE EITHER FOR SAFETY) */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '210mm', background: '#fff', zIndex: -1 }}>
        <div ref={pdfTemplateRef} style={{ width: '210mm', height: '297mm', padding: '0', fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1a1a1a', backgroundColor: '#fff', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', position: 'relative' }}>
           <div style={{ height: '24px', width: '100%', backgroundColor: '#0a2540' }}></div>
           <div style={{ padding: '30px 60px 10px 60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                 <div style={{ width: '80px', height: '80px', backgroundColor: '#0a2540', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', bottom: '15%', width: '60%', height: '50%', backgroundColor: '#ff5a1f', transform: 'skewY(-5deg)' }}></div>
                    <div style={{ position: 'absolute', top: '15%', width: '40%', height: '40%', border: '4px solid white', borderRadius: '4px', transform: 'rotate(45deg)' }}></div>
                    <span style={{ color: 'white', fontSize: '8pt', fontWeight: 900, position: 'absolute', bottom: '8px', width: '100%', textAlign: 'center' }}>Hossain</span>
                 </div>
                 <div>
                    <h1 style={{ fontSize: '38pt', fontWeight: 900, margin: 0, color: '#000', lineHeight: '1' }}>Hossain House Design</h1>
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
                    <p style={{ margin: '2px 0' }}>{quotation.client_name}</p>
                    <p style={{ margin: '2px 0' }}>{quotation.current_location || 'Local Resident'}</p>
                    <p style={{ margin: '2px 0' }}>{quotation.address}, {quotation.upazila}</p>
                 </div>
              </div>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '40px', minHeight: '400px', padding: '40px', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                 <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '20mm', rowGap: '10mm' }}>
                    {formConfig.filter(f => f.visible && (f.section === 'Architecture' || f.section === 'Interests')).map(f => {
                       const val = getFieldValue(f.db_key);
                       if (!val || val === 'N/A' || val === 'No') return null;
                       return (
                          <div key={f.id} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                             <p style={{ fontSize: '9pt', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>{f.label}</p>
                             <p style={{ fontSize: '12pt', fontWeight: 800, color: '#1e293b' }}>{val}</p>
                          </div>
                       );
                    })}
                 </div>
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

export default QuotationDetails;