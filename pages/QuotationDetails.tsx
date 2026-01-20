
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Lead, FormFieldConfig } from '../types';
import { 
  ArrowLeft, FileSpreadsheet, Download, Edit3, Trash2, 
  MapPin, Phone, Mail, Banknote, RefreshCw, X, Save, 
  CheckCircle2, Info, Layout, Layers, Ruler, Briefcase, ChevronDown
} from 'lucide-react';
import { DEFAULT_FORM_CONFIG } from './Settings';
import { useNotification } from '../App';

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
      setQuotation(leadRes.data);
      setEditData(leadRes.data);
      setFormConfig(configRes.data?.value || DEFAULT_FORM_CONFIG);
    } catch (err) {
      showNotification("Failed to load quotation records.", "error");
      navigate('/quotations');
    } finally {
      setLoading(false);
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
      setQuotation({ ...quotation, ...editData });
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
    const val = (quotation as any)[dbKey] || quotation.metadata?.[dbKey];
    return (val === null || val === undefined || val === '') ? '' : val;
  };

  if (loading || !quotation) return (
    <div className="h-[80vh] flex flex-col items-center justify-center gap-6 px-6 text-center">
      <RefreshCw className="w-12 h-12 text-purple-600 animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">ACCESSING ARCHIVE...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-32 animate-in fade-in duration-700 overflow-x-hidden relative">
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
                    {formConfig.filter(f => f.visible && (f.section === 'Architecture' || f.section === 'Financials')).map(f => (
                       <div key={f.id} className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{f.label}</label>
                          <input className="w-full h-14 px-6 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white border-2 border-transparent focus:border-purple-500/20 transition-all shadow-inner" value={(editData as any)[f.db_key] || ''} onChange={e => setEditData({...editData, [f.db_key]: e.target.value})} />
                       </div>
                    ))}
                    <div className="md:col-span-2 pt-6"><button onClick={handleUpdate} disabled={saving} className="w-full py-6 bg-purple-600 text-white rounded-3xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-purple-700 shadow-xl">{saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Save Revisions</button></div>
                 </div>
               ) : (
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-y-12 gap-x-8">
                    {formConfig.filter(f => f.visible && (f.section === 'Architecture' || f.section === 'Financials')).map((f) => (
                      <div key={f.id} className="space-y-2 group">
                         <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest group-hover:text-purple-500 transition-colors">{f.label}</p>
                         <div className="flex items-center gap-3 font-black text-slate-900"><Layers className="w-4 h-4 text-purple-300 group-hover:text-purple-500 transition-colors" /><span className="text-lg">{getFieldValue(f.db_key) || 'N/A'}</span></div>
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
                </div>
             </div>
          </div>
        </div>
      </div>
      
      {/* PROFESSIONAL PDF TEMPLATE: EXACT MATCH FOR HOSSAIN HOUSE DESIGN */}
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
                 {formConfig.filter(f => f.visible && (f.section === 'Architecture' || f.section === 'Financials')).map(f => {
                    const val = (quotation as any)[f.db_key] || quotation.metadata?.[f.db_key];
                    // Removed asking fee and budget from PDF as requested
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
