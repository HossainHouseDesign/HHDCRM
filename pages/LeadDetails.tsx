
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Lead, LeadStatus, LeadAIAnalysis } from '../types';
import { analyzeLead } from '../geminiService';
import { 
  ArrowLeft, MapPin, Ruler, Banknote, Layers, Grid, Bed, Bath, 
  ListTree, Briefcase, Calendar, Phone, RefreshCw, CheckCircle2, 
  Activity, Sparkles, Edit3, Trash2, PhoneCall, ShieldCheck, 
  Hash, X, Save, Mail, Tag, FileText
} from 'lucide-react';
import { useNotification } from '../App';

const LeadDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<LeadAIAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  
  // Conversion / Quotation Modal State
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [quotationData, setQuotationData] = useState<Partial<Lead>>({});

  useEffect(() => {
    fetchLead();
  }, [id]);

  const fetchLead = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('leads').select('*').eq('id', id).single();
      if (error) throw error;
      setLead(data);
      // Pre-fill the quotation modal data with existing specs
      setQuotationData(data);
    } catch (err) {
      showNotification("Vault access failed.", "error");
      navigate('/leads');
    } finally {
      setLoading(false);
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

  const handleStatusChange = async (newStatus: LeadStatus) => {
    if (!lead) return;

    // RULE: If moving to Quotation, open the refinement form instead of instant change
    if (newStatus === 'Quotation') {
      setShowQuotationModal(true);
      return;
    }

    setIsUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', lead.id);
      
      if (error) throw error;
      setLead({ ...lead, status: newStatus });
      showNotification(`Lead moved to ${newStatus.replace('_', ' ')} phase.`, "success");
    } catch (err) {
      showNotification("Sync failed.", "error");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const processQuotationConversion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;
    setIsUpdatingStatus(true);
    try {
      const { error } = await supabase.from('leads').update({ 
        ...quotationData,
        is_client: true, // Auto-convert to client when quotation is finalized
        converted_at: new Date().toISOString(),
        status: 'Quotation',
        updated_at: new Date().toISOString()
      }).eq('id', lead.id);
      
      if (error) throw error;
      showNotification("Quotation finalized. Lead converted to Active Client.", "success");
      navigate('/clients');
    } catch (err) {
      showNotification("Conversion failed.", "error");
    } finally {
      setIsUpdatingStatus(false);
      setShowQuotationModal(false);
    }
  };

  const softDelete = async () => {
    if (!lead) return;
    if (!window.confirm("Archive this record to the Recycle Bin?")) return;
    try {
      const { error } = await supabase.from('leads').update({ deleted_at: new Date().toISOString() }).eq('id', lead.id);
      if (error) throw error;
      showNotification("Lead archived to vault.", "info");
      navigate('/leads');
    } catch (err) {
      showNotification("Archive failed.", "error");
    }
  };

  if (loading || !lead) return (
    <div className="h-[80vh] flex flex-col items-center justify-center gap-6 px-6 text-center">
      <RefreshCw className="w-12 h-12 text-[#064e3b] animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">ACCESSING LEAD RECORD...</p>
    </div>
  );

  const statusMap: Record<LeadStatus, { label: string; color: string }> = {
    'Discovery': { label: 'Discovery', color: 'bg-blue-50 text-blue-600 border-blue-100' },
    'Follow_Up': { label: 'Follow Up', color: 'bg-amber-50 text-amber-600 border-amber-100' },
    'Quotation': { label: 'Quotation', color: 'bg-purple-50 text-purple-600 border-purple-100' },
    'Completed': { label: 'Completed', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
    'Rejected': { label: 'Rejected', color: 'bg-red-50 text-red-600 border-red-100' },
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-32 animate-in fade-in duration-700 overflow-x-hidden">
      
      {/* Quotation / Conversion Modal (The "Form") */}
      {showQuotationModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-xl animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white rounded-[56px] p-10 md:p-14 max-w-3xl w-full shadow-2xl border border-slate-100 my-10 relative">
            <div className="flex justify-between items-start mb-10">
              <div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Quotation & Technical Review</h3>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mt-2">Refine Specifications Before Contract Conversion</p>
              </div>
              <button onClick={() => setShowQuotationModal(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-red-500 transition-all"><X className="w-6 h-6" /></button>
            </div>

            <form onSubmit={processQuotationConversion} className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Foundation Level</label>
                    <select className="w-full h-16 px-6 bg-slate-50 rounded-[24px] text-[13px] font-bold" value={quotationData.foundation || ''} onChange={e => setQuotationData({...quotationData, foundation: e.target.value})}>
                      {['1 Store','2 Store','3 Store','4 Store','5 Store','6 Store','7 Store','8 Store','9 Store','10 Store'].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Units Per Floor</label>
                    <select className="w-full h-16 px-6 bg-slate-50 rounded-[24px] text-[13px] font-bold" value={quotationData.unit_count || ''} onChange={e => setQuotationData({...quotationData, unit_count: e.target.value})}>
                      {['1 Unit','2 Units','3 Units','4 Units'].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Design Package</label>
                    <select className="w-full h-16 px-6 bg-slate-50 rounded-[24px] text-[13px] font-bold" value={quotationData.package || ''} onChange={e => setQuotationData({...quotationData, package: e.target.value})}>
                      {['Basic Drafting', 'Standard Architectural', 'Premium Engineering', 'Luxury Full-Service'].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Confirmed Land Area</label>
                    <input className="w-full h-16 px-6 bg-slate-50 rounded-[24px] text-[13px] font-bold" value={quotationData.land_area || ''} onChange={e => setQuotationData({...quotationData, land_area: e.target.value})} />
                 </div>
              </div>
              
              <div className="grid grid-cols-3 gap-6">
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Beds</label>
                    <input type="number" className="w-full h-16 px-6 bg-slate-50 rounded-[24px]" value={quotationData.bedroom_count || ''} onChange={e => setQuotationData({...quotationData, bedroom_count: e.target.value})} />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Baths</label>
                    <input type="number" className="w-full h-16 px-6 bg-slate-50 rounded-[24px]" value={quotationData.bathroom_count || ''} onChange={e => setQuotationData({...quotationData, bathroom_count: e.target.value})} />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Final Asking Fee (BDT)</label>
                    <input type="number" className="w-full h-16 px-6 bg-emerald-50 rounded-[24px] font-black text-emerald-700" value={quotationData.asking_fee || ''} onChange={e => setQuotationData({...quotationData, asking_fee: Number(e.target.value)})} />
                 </div>
              </div>

              <div className="pt-8 border-t border-slate-50">
                <button type="submit" className="w-full py-8 bg-[#064e3b] text-white rounded-[32px] font-black uppercase tracking-[0.3em] text-[11px] shadow-2xl flex items-center justify-center gap-4 hover:bg-black transition-all">
                   <ShieldCheck className="w-6 h-6 text-emerald-400" /> Finalize Technical Review & Convert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-[1440px] mx-auto px-6 md:px-12 pt-12 space-y-12">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="flex items-center gap-8 min-w-0">
            <button onClick={() => navigate('/leads')} className="w-14 h-14 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center justify-center hover:bg-slate-50 transition-all shrink-0">
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
                 <Hash className="w-3.5 h-3.5 text-emerald-500" /> VAULT ID: {lead.id.slice(0, 12).toUpperCase()} • Intake: {new Date(lead.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
             <button onClick={() => navigate(`/leads/edit/${lead.id}`)} className="p-4 bg-white border border-slate-100 text-slate-400 hover:text-[#064e3b] rounded-2xl transition-all shadow-sm"><Edit3 className="w-5 h-5" /></button>
             <button onClick={softDelete} className="p-4 bg-white border border-slate-100 text-slate-400 hover:text-red-500 rounded-2xl transition-all shadow-sm"><Trash2 className="w-5 h-5" /></button>
          </div>
        </header>

        {/* Lead Status Workflow - Professional Stepper */}
        <div className="bg-white p-2.5 rounded-[32px] border border-slate-50 shadow-sm flex items-center gap-2 overflow-x-auto no-scrollbar">
          {(['Discovery', 'Follow_Up', 'Quotation', 'Rejected'] as LeadStatus[]).map((st) => (
            <button
              key={st}
              onClick={() => handleStatusChange(st)}
              disabled={isUpdatingStatus}
              className={`px-10 py-5 rounded-[24px] text-[10px] font-black uppercase tracking-widest transition-all ${lead.status === st ? 'bg-slate-900 text-white shadow-xl translate-y-[-2px]' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          <div className="lg:col-span-8 space-y-12">
            
            {/* Architectural Data Visualization */}
            <div className="bg-white p-12 md:p-16 rounded-[64px] border border-slate-100 shadow-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
               <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.3em] mb-12 flex items-center gap-4">
                 <Layers className="w-6 h-6 text-emerald-500" /> Discovery Parameters
               </h3>
               <div className="grid grid-cols-2 md:grid-cols-3 gap-y-12 gap-x-8">
                  {[
                    { label: 'Foundation', val: lead.foundation, icon: Layers },
                    { label: 'Units/Floor', val: lead.unit_count, icon: Grid },
                    { label: 'Bedrooms', val: lead.bedroom_count, icon: Bed },
                    { label: 'Bathrooms', val: lead.bathroom_count, icon: Bath },
                    { label: 'Stair Style', val: lead.stair_details, icon: ListTree },
                    { label: 'Land Area', val: lead.land_area, icon: Ruler },
                    { label: 'Design Package', val: lead.package, icon: Briefcase },
                    { label: 'Lead Source', val: lead.social_media, icon: Tag },
                    { label: 'Client Budget', val: lead.budget, icon: Banknote },
                  ].map((item, i) => (
                    <div key={i} className="space-y-2 group">
                       <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest group-hover:text-emerald-500 transition-colors">{item.label}</p>
                       <div className="flex items-center gap-3 font-black text-slate-900">
                          <item.icon className="w-4 h-4 text-emerald-500 opacity-40 group-hover:opacity-100 transition-opacity" />
                          <span className="text-lg">{item.val || 'N/A'}</span>
                       </div>
                    </div>
                  ))}
               </div>
            </div>

            {/* AI Reasoning Section */}
            <div className="bg-slate-950 p-12 md:p-16 rounded-[64px] shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 blur-[100px] rounded-full" />
               <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-12">
                  <div className="flex items-center gap-4">
                     <Sparkles className="w-7 h-7 text-emerald-400" />
                     <div>
                        <h3 className="text-lg font-black text-white tracking-tight">AI Strategy Draft</h3>
                        <p className="text-emerald-400/50 text-[9px] font-black uppercase tracking-widest mt-1">Techno-Financial Feasibility</p>
                     </div>
                  </div>
                  <button onClick={handleAIAnalysis} disabled={isAnalyzing} className="w-full sm:w-auto px-8 py-4 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/20 active:scale-95">
                     {isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />} Draft Strategy
                  </button>
               </div>

               {aiAnalysis ? (
                 <div className="space-y-10 animate-in fade-in duration-1000">
                    <div className="grid grid-cols-2 gap-6">
                       <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
                          <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Priority Score</p>
                          <p className="text-3xl font-black text-white mt-1">{aiAnalysis.priority_score}%</p>
                       </div>
                       <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
                          <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Feasibility</p>
                          <p className="text-3xl font-black text-emerald-400 mt-1">{aiAnalysis.feasibility_score}%</p>
                       </div>
                    </div>
                    <div className="space-y-4">
                       <p className="text-[10px] font-black text-emerald-400/40 uppercase tracking-widest">Brief Narrative</p>
                       <p className="text-white/70 font-medium leading-relaxed">{aiAnalysis.brief}</p>
                    </div>
                 </div>
               ) : (
                 <div className="py-12 text-center">
                    <p className="text-white/20 text-xs font-black uppercase tracking-[0.3em]">No active strategy records</p>
                 </div>
               )}
            </div>
          </div>

          <div className="lg:col-span-4 space-y-12">
             <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm">
                <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center gap-3">
                   <Phone className="w-5 h-5 text-emerald-500" /> Contact Intel
                </h3>
                <div className="space-y-6">
                   <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-50 group hover:border-emerald-100 transition-all">
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Direct Line</p>
                      <p className="text-lg font-black text-slate-900">{lead.phone}</p>
                   </div>
                   <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-50 group hover:border-emerald-100 transition-all">
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Vault Email</p>
                      <p className="text-lg font-black text-slate-900 truncate">{lead.email || 'N/A'}</p>
                   </div>
                   <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-50 group hover:border-emerald-100 transition-all">
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Origin Country</p>
                      <p className="text-lg font-black text-slate-900">{lead.current_location || 'Global Discovery'}</p>
                   </div>
                </div>
             </div>

             <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm">
                <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center gap-3">
                   <MapPin className="w-5 h-5 text-emerald-500" /> Logistics
                </h3>
                <div className="space-y-4">
                   {[
                     { label: 'District', val: lead.address },
                     { label: 'Upazila', val: lead.upazila },
                     { label: 'Village', val: lead.village_name },
                     { label: 'Created At', val: new Date(lead.created_at).toLocaleDateString() },
                   ].map((loc, i) => (
                     <div key={i} className="flex justify-between items-center py-4 border-b border-slate-50 last:border-0">
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{loc.label}</span>
                        <span className="text-[13px] font-black text-slate-700">{loc.val || 'N/A'}</span>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadDetails;
