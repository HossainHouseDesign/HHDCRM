
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

  if (loading || !quotation) return <div className="h-[80vh] flex flex-col items-center justify-center gap-6"><RefreshCw className="w-12 h-12 text-purple-600 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-32 animate-in fade-in duration-700 overflow-x-hidden relative">
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
             <button onClick={handleDownloadPDF} disabled={isGeneratingPDF} className="flex-1 sm:flex-none px-8 py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3 disabled:opacity-50">
               {isGeneratingPDF ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5 text-emerald-400" />} Export PDF
             </button>
             <button onClick={() => setIsEditing(!isEditing)} className={`p-4 rounded-2xl transition-all shadow-sm ${isEditing ? 'bg-red-50 text-red-500' : 'bg-white border border-slate-100 text-slate-400 hover:text-purple-600'}`}>{isEditing ? <X className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}</button>
          </div>
        </header>

        <div className="bg-white p-12 md:p-16 rounded-[64px] border border-slate-100 shadow-xl relative overflow-hidden">
           <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.3em] mb-12 flex items-center gap-4"><Layout className="w-6 h-6 text-purple-500" /> Technical Proposal Specs</h3>
           <div className="grid grid-cols-2 md:grid-cols-3 gap-y-12 gap-x-8">
              {formConfig.filter(f => f.visible && (f.section === 'Architecture' || f.section === 'Interests')).map((f) => (
                <div key={f.id} className="space-y-2 group">
                   <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest group-hover:text-purple-500 transition-colors">{f.label}</p>
                   <div className="flex items-center gap-3 font-black text-slate-900"><Layers className="w-4 h-4 text-purple-300" /><span className="text-lg">{getFieldValue(f.db_key) || 'N/A'}</span></div>
                </div>
              ))}
           </div>
        </div>
      </div>
      
      {/* BRANDED PDF TEMPLATE */}
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
                 <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '350px', height: '350px', opacity: 0.03, zIndex: 0, pointerEvents: 'none' }}><div style={{ width: '100%', height: '100%', backgroundColor: '#000', borderRadius: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><h1 style={{ color: 'white', fontSize: '40pt', fontWeight: 900 }}>H</h1></div></div>
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
