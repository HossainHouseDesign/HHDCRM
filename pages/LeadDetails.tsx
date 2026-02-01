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

  const handleDownloadPDF = async () => {
    if (!pdfTemplateRef.current || !lead) return;
    setIsGeneratingPDF(true);
    const isQuotationFlow = showQuotationModal;

    setTimeout(async () => {
      try {
        const element = pdfTemplateRef.current;
        if (!element) return;
        const opt = {
          margin: 0,
          filename: `Quotation_${quotationDraft.client_name || lead.client_name}.pdf`,
          image: { type: 'jpeg', quality: 1.0 },
          html2canvas: { scale: 4, useCORS: true, letterRendering: true, logging: false },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        // @ts-ignore
        await window.html2pdf().from(element).set(opt).save();
        if (isQuotationFlow) {
          const success = await finalizeQuotation(true);
          if (success) { setShowQuotationModal(false); navigate('/quotations'); }
        }
      } catch (err) {
        showNotification("Export failed.", "error");
      } finally {
        setIsGeneratingPDF(false);
      }
    }, 600);
  };

  const handleDownloadDoc = async () => {
    if (!lead) return;
    setIsGeneratingDoc(true);

    setTimeout(async () => {
      try {
        const clientName = quotationDraft.client_name || lead.client_name;
        const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        
        const specs = formConfig.filter(f => f.visible && (f.section === 'Architecture' || f.section === 'Interests')).map(f => {
          const val = quotationDraft[f.db_key] !== undefined ? quotationDraft[f.db_key] : lead.metadata?.[f.db_key];
          if (!val || val === 'N/A' || val === 'No' || val === false) return null;
          return { label: f.label, value: typeof val === 'boolean' ? 'Yes' : val };
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
                <div>${quotationDraft.address || lead.address}, ${quotationDraft.upazila || lead.upazila}</div>
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
              <div style="font-size: 11pt; font-weight: bold; margin-top: 2px;">Marketing Manager</div>
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
        link.download = `Quotation_${clientName}.doc`;
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
        if (STANDARD_COLUMNS.includes(dbKey)) payload[dbKey] = val;
        else payload.metadata[dbKey] = val;
      });
      const { error } = await supabase.from('leads').update(payload).eq('id', lead.id);
      if (error) throw error;
      showNotification(`${convertFullData.client_name} promoted to Client Portfolio.`, "success");
      navigate('/clients');
    } catch (err: any) {
      showNotification(`Conversion failed: ${err.message}`, "error");
    } finally {
      setIsUpdatingStatus(false);
      setShowConvertModal(false);
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

  const modalInputClass = "w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-emerald-500/30 transition-all shadow-inner";

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-32 animate-in fade-in duration-700 overflow-x-hidden relative">
      
      {/* FOLLOW UP SCHEDULING MODAL */}
      {showFollowUpModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white rounded-[40px] md:rounded-[48px] p-6 md:p-10 max-w-lg w-[95%] shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300 relative">
              <div className="flex justify-between items-start mb-8">
                <div>
                   <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Schedule Follow Up</h3>
                   <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mt-2">DASHBOARD CALENDAR SYNC</p>
                </div>
                <button onClick={() => setShowFollowUpModal(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-red-500 transition-all"><X className="w-6 h-6" /></button>
              </div>
              <div className="space-y-8">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Action Date</label>
                    <div className="relative">
                       <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                       <input 
                         type="date" 
                         className="w-full h-16 pl-14 pr-8 bg-slate-50 border border-slate-100 rounded-[24px] md:rounded-[28px] text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-emerald-500/20 transition-all shadow-inner"
                         value={followUpDate}
                         onChange={(e) => setFollowUpDate(e.target.value)}
                       />
                    </div>
                 </div>
                 <button 
                   onClick={() => handleStatusUpdate('Follow_Up', followUpDate)} 
                   disabled={isUpdatingStatus}
                   className="w-full py-6 md:py-7 bg-amber-600 text-white rounded-[24px] md:rounded-[28px] text-[11px] md:text-[12px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all flex items-center justify-center gap-4 active:scale-95"
                 >
                   {isUpdatingStatus ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} AUTHORIZE SCHEDULE
                 </button>
              </div>
           </div>
        </div>
      )}

      {showConvertModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] md:rounded-[48px] p-6 md:p-10 max-w-5xl w-[95%] shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300 relative overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-start mb-8 relative z-10 shrink-0">
              <div>
                <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Convert to Client</h3>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mt-2">CONTRACTUAL REVIEW & OVERRIDE</p>
              </div>
              <button onClick={() => setShowConvertModal(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-red-500 transition-all"><X className="w-6 h-6" /></button>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 no-scrollbar space-y-10 pb-10">
               {Object.keys(groupedFields).map(section => (
                 <div key={section} className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                       <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">{getSectionIcon(section)}</div>
                       <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">{section} Specs</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                       {groupedFields[section].map(f => (
                         <div key={f.id} className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{f.label}</label>
                            <input type={f.type === 'number' ? 'number' : (f.type === 'date' ? 'date' : 'text')} className={modalInputClass} value={convertFullData[f.db_key] ?? ''} onChange={e => setConvertFullData({...convertFullData, [f.db_key]: f.type === 'number' ? Number(e.target.value) : e.target.value})} />
                         </div>
                       ))}
                    </div>
                 </div>
               ))}
            </div>
            <div className="pt-8 border-t border-slate-100 mt-auto flex flex-col sm:flex-row items-center gap-4 relative z-10 shrink-0">
               <button onClick={handleConvertToClient} disabled={isUpdatingStatus} className="w-full py-6 md:py-7 bg-[#064e3b] text-white rounded-[24px] md:rounded-[28px] text-[11px] md:text-[12px] font-black uppercase tracking-[0.3em] hover:bg-black transition-all flex items-center justify-center gap-4 shadow-2xl active:scale-95 disabled:opacity-50">{isUpdatingStatus ? <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" /> : <UserCheck className="w-6 h-6 text-emerald-400" />} AUTHORIZE CLIENT PROMOTION</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Details View stacking panels on mobile */}
      <div className="max-w-[1440px] mx-auto px-4 md:px-12 pt-8 md:pt-12 space-y-8 md:space-y-12">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-8">
          <div className="flex items-center gap-4 md:gap-8 min-w-0">
            <button onClick={() => navigate(-1)} className="w-12 h-12 md:w-14 md:h-14 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center justify-center hover:bg-slate-50 transition-all shrink-0"><ArrowLeft className="w-6 h-6 text-slate-500" /></button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight truncate">{lead.client_name}</h1>
                <div className="relative" ref={statusDropdownRef}><button onClick={() => setShowStatusDropdown(!showStatusDropdown)} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 ${statusMap[lead.status]?.color}`}>{statusMap[lead.status]?.label}<ChevronDown className="w-3 h-3 opacity-50" /></button></div>
              </div>
              <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] mt-2 flex items-center gap-2">ID: {lead.id.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full sm:w-auto">
             <button onClick={() => setShowQuotationModal(true)} className="flex-1 sm:flex-none px-6 py-4 bg-[#064e3b] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center justify-center gap-2"><FileSpreadsheet className="w-4 h-4" /> Quotation</button>
             <button onClick={() => navigate(`/leads/edit/${lead.id}`)} className="p-4 bg-white border border-slate-100 text-slate-400 rounded-2xl shadow-sm"><Edit3 className="w-5 h-5" /></button>
             <button onClick={() => setShowDeleteModal(true)} className="p-4 bg-white border border-slate-100 text-slate-400 hover:text-red-500 rounded-2xl shadow-sm"><Trash2 className="w-5 h-5" /></button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          <div className="lg:col-span-8 space-y-8 md:space-y-12">
            <div className="space-y-8 md:space-y-12">
               {Object.keys(groupedFields).map((section) => (
                    <div key={section} className="bg-white p-8 md:p-16 rounded-[40px] md:rounded-[64px] border border-slate-100 shadow-xl relative overflow-hidden">
                      <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em] mb-10 md:mb-12 flex items-center gap-3">{getSectionIcon(section)} {section} Specs</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-8 md:gap-y-12 gap-x-8">
                        {groupedFields[section].map((f) => (
                          <div key={f.id} className="space-y-1 group">
                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest group-hover:text-emerald-500 transition-colors">{f.label}</p>
                            <div className="flex items-center gap-3 font-black text-slate-900"><span className="text-base md:text-lg truncate">{getFieldValue(f.db_key)}</span></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
            </div>
            {/* AI Analysis Panel stacked below */}
            <div className="bg-slate-950 p-8 md:p-16 rounded-[40px] md:rounded-[64px] shadow-2xl relative overflow-hidden">
               <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10"><div className="flex items-center gap-4"><Sparkles className="w-7 h-7 text-emerald-400" /><div><h3 className="text-lg font-black text-white tracking-tight">AI Strategy</h3><p className="text-emerald-400/50 text-[9px] font-black uppercase tracking-widest">Feasibility Insight</p></div></div><button onClick={handleAIAnalysis} className="w-full sm:w-auto px-6 py-3 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-all">Draft Strategy</button></div>
               {aiAnalysis ? (
                 <div className="space-y-8 animate-in fade-in duration-1000"><div className="grid grid-cols-2 gap-4 md:gap-6"><div className="bg-white/5 border border-white/10 p-5 rounded-2xl"><p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Score</p><p className="text-2xl font-black text-white mt-1">{aiAnalysis.priority_score}%</p></div><div className="bg-white/5 border border-white/10 p-5 rounded-2xl"><p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Feasibility</p><p className="text-2xl font-black text-emerald-400 mt-1">{aiAnalysis.feasibility_score}%</p></div></div><p className="text-white/70 text-sm font-medium leading-relaxed">{aiAnalysis.brief}</p></div>
               ) : (
                 <div className="py-8 text-center"><p className="text-white/20 text-xs font-black uppercase tracking-widest">No strategy recorded</p></div>
               )}
            </div>
          </div>
          <div className="lg:col-span-4 space-y-8 md:space-y-12">
             <div className="bg-white p-8 md:p-10 rounded-[40px] md:rounded-[48px] border border-slate-100 shadow-sm">
                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center gap-3"><Phone className="w-4 h-4 text-emerald-500" /> Contact Intel</h3>
                <div className="space-y-4">
                  <a href={formatWhatsAppLink(lead.phone)} target="_blank" rel="noopener noreferrer" className="p-5 bg-slate-50 rounded-3xl border border-slate-50 flex justify-between items-center group">
                    <div><p className="text-[9px] font-black text-slate-300 uppercase mb-0.5">Phone</p><p className="text-base font-black text-slate-900">{lead.phone}</p></div>
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all"><MessageSquare className="w-4 h-4" /></div>
                  </a>
                  <div className="p-5 bg-slate-50 rounded-3xl border border-slate-50">
                    <p className="text-[9px] font-black text-slate-300 uppercase mb-0.5">Vault Email</p>
                    <p className="text-base font-black text-slate-900 truncate">{lead.email || 'N/A'}</p>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </div>
      
      {/* PROFESSIONAL PDF TEMPLATE HIDDEN */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '210mm', background: '#fff', zIndex: -1 }}>
        <div ref={pdfTemplateRef} style={{ width: '210mm', height: '297mm', padding: '0', fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1a1a1a', backgroundColor: '#fff', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', position: 'relative' }}>
           <div style={{ height: '2mm', width: '100%', backgroundColor: '#042952' }}></div>
           <div style={{ padding: '2mm 20mm 2mm 20mm', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center', marginTop: '2mm' }}>
                <h1 style={{ fontSize: '28pt', fontWeight: 900, margin: 0, padding: 0, color: '#042952' }}>Hossain House Design</h1>
                <p style={{ fontSize: '10pt', color: '#042952', fontWeight: 700, margin: '1mm 0' }}>www.hossainhousedesign.com, +8801705323220, +8801313199299</p>
                <p style={{ fontSize: '9pt', color: '#333', fontWeight: 500, margin: '1mm 0' }}>House 27, Road 14, Block G, Niketon, Gulshan 1, Dhaka</p>
              </div>
           </div>
           <div style={{ borderTop: '2px solid #f05a25', borderBottom: '2px solid #f05a25', margin: '2mm 0', textAlign: 'center', padding: '10px 0' }}>
              <h2 style={{ fontSize: '28pt', fontWeight: 900, color: '#042952', letterSpacing: '0.15em', textTransform: 'uppercase', margin: 0 }}>Quotation</h2>
           </div>
           <div style={{ padding: '4mm 25mm', flex: 1, position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px', alignItems: 'flex-start' }}>
                 <div>
                    <h3 style={{ fontSize: '12pt', fontWeight: 800, marginBottom: '6px', color: '#000' }}>To,</h3>
                    <div style={{ fontSize: '11pt', lineHeight: '1.4', fontWeight: 600, color: '#111' }}>
                       <p style={{ margin: '1px 0', fontSize: '12pt', fontWeight: 800 }}>{quotationDraft.client_name || lead.client_name}</p>
                       <p style={{ margin: '1px 0' }}>{quotationDraft.current_location || lead.current_location || 'Local'}</p>
                       <p style={{ margin: '1px 0' }}>{quotationDraft.address || lead.address}, {quotationDraft.upazila || lead.upazila}</p>
                    </div>
                 </div>
                 <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '11pt', fontWeight: 800, color: '#042952' }}>Date: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                 </div>
              </div>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '30px', padding: '30px', minHeight: '400px' }}>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '20mm', rowGap: '8mm' }}>
                    {formConfig.filter(f => f.visible && (f.section === 'Architecture' || f.section === 'Interests' || f.section === 'Financials')).map(f => {
                       const val = quotationDraft[f.db_key] !== undefined ? quotationDraft[f.db_key] : lead.metadata?.[f.db_key];
                       if (!val || val === 'N/A' || val === 'No' || val === false) return null;
                       return (
                          <div key={f.id} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                             <p style={{ fontSize: '8pt', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>{f.label}</p>
                             <p style={{ fontSize: '11pt', fontWeight: 800, color: '#042952' }}>{typeof val === 'boolean' ? 'Yes' : val}</p>
                          </div>
                       );
                    })}
                 </div>
              </div>
              <div style={{ marginTop: '30px' }}>
                 <p style={{ fontSize: '10pt', color: '#042952', fontWeight: 800, marginBottom: '20px', textAlign: 'center' }}>Thank you for your inquiry. We look forward to the opportunity to work with you.</p>
                 <div style={{ marginTop: '35px' }}>
                    <p style={{ fontSize: '11pt', fontWeight: 600, margin: 0 }}>Sincerely</p>
                    <p style={{ fontSize: '12pt', fontWeight: 800, marginTop: '5px', color: '#042952' }}>Marketing Manager</p>
                    <p style={{ fontSize: '12pt', fontWeight: 900, color: '#042952' }}>Hossain House Design</p>
                 </div>
              </div>
           </div>
           <div style={{ height: '8mm', width: '100%', backgroundColor: '#042952' }}></div>
        </div>
      </div>
    </div>
  );
};

export default LeadDetails;