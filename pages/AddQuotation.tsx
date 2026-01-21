
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Lead } from '../types';
import { 
  ArrowLeft, Search, UserCheck, Edit3, 
  ChevronRight, RefreshCw, 
  FileText, Users, MapPin, Phone, History, Sparkles,
  FileSpreadsheet
} from 'lucide-react';

const AddQuotation = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'choice' | 'select_lead'>('choice');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchLeads = async () => {
    setLoading(true);
    try {
      // Fetch leads that are NOT yet quotations or clients
      const { data } = await supabase
        .from('leads')
        .select('*')
        .eq('is_client', false)
        .eq('status', 'Discovery')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      setLeads(data || []);
      setMode('select_lead');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = leads.filter(l => 
    l.client_name.toLowerCase().includes(search.toLowerCase()) || 
    l.phone.includes(search)
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-32 px-6 md:px-10 pt-12 animate-in slide-in-from-bottom-6">
      <header className="max-w-4xl mx-auto flex items-center gap-6 mb-12">
        <button 
          onClick={() => mode === 'choice' ? navigate(-1) : setMode('choice')} 
          className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-400 hover:text-slate-900 transition-all shadow-slate-200/50"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Initiate Quotation</h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">DRAFTING OFFICIAL ARCHITECTURAL PROPOSALS</p>
        </div>
      </header>

      {mode === 'choice' ? (
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          <button 
            onClick={fetchLeads}
            disabled={loading}
            className="p-12 bg-white border border-slate-100 rounded-[48px] shadow-xl text-left group hover:border-purple-500 transition-all hover:-translate-y-2 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-[40px] rounded-full pointer-events-none" />
            <div className="w-20 h-20 bg-purple-50 text-purple-600 rounded-[32px] flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all shadow-sm">
              {loading ? <RefreshCw className="w-10 h-10 animate-spin" /> : <FileText className="w-10 h-10" />}
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">From Pipeline</h3>
            <p className="text-sm text-slate-400 font-medium leading-relaxed">Advance an existing inquiry to the proposal phase. All technical details will be ported automatically.</p>
            <div className="mt-10 flex items-center gap-3 text-purple-600 text-[11px] font-black uppercase tracking-widest">
              Select Active Lead <ChevronRight className="w-4 h-4" />
            </div>
          </button>

          <button 
            onClick={() => navigate('/leads/new?mode=quotation')}
            className="p-12 bg-white border border-slate-100 rounded-[48px] shadow-xl text-left group hover:border-slate-900 transition-all hover:-translate-y-2 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-900/5 blur-[40px] rounded-full pointer-events-none" />
            <div className="w-20 h-20 bg-slate-50 text-slate-400 rounded-[32px] flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-sm">
              <FileSpreadsheet className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Direct Proposal</h3>
            <p className="text-sm text-slate-400 font-medium leading-relaxed">Draft a quotation for a new entity immediately. Ideal for walking-in or highly qualified clients.</p>
            <div className="mt-10 flex items-center gap-3 text-slate-900 text-[11px] font-black uppercase tracking-widest">
              Draft New Record <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-300">
           <div className="relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 group-focus-within:text-purple-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Search leads to Advance..."
                autoFocus
                className="w-full h-20 pl-16 pr-8 bg-white border border-slate-100 rounded-[32px] text-lg font-bold text-slate-700 outline-none focus:ring-8 focus:ring-purple-500/5 transition-all shadow-xl"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
           </div>

           <div className="bg-white rounded-[48px] border border-slate-100 shadow-2xl overflow-hidden divide-y divide-slate-50">
              {filteredLeads.length === 0 ? (
                <div className="py-24 text-center">
                   <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 opacity-30">
                      <History className="w-10 h-10" />
                   </div>
                   <p className="text-sm font-black text-slate-300 uppercase tracking-widest">No discovery leads eligible for advancement</p>
                </div>
              ) : filteredLeads.map(l => (
                <div 
                  key={l.id} 
                  onClick={() => navigate(`/leads/${l.id}?open=quotation`)}
                  className="p-8 flex items-center justify-between hover:bg-slate-50/80 transition-all cursor-pointer group"
                >
                   <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-xl font-black text-slate-300 group-hover:bg-purple-600 group-hover:text-white transition-all shadow-sm">
                         {l.client_name.charAt(0)}
                      </div>
                      <div>
                         <p className="text-lg font-black text-slate-900 group-hover:text-purple-700 transition-colors">{l.client_name}</p>
                         <div className="flex items-center gap-4 mt-1.5">
                            <p className="text-[11px] font-bold text-slate-400 flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> {l.phone}</p>
                            <p className="text-[11px] font-bold text-slate-400 flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-purple-400" /> {l.address || 'Location Unknown'}</p>
                         </div>
                      </div>
                   </div>
                   <div className="flex items-center gap-6">
                      <div className="w-12 h-12 rounded-full border border-slate-100 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all">
                         <ChevronRight className="w-6 h-6" />
                      </div>
                   </div>
                </div>
              ))}
           </div>

           <div className="p-10 bg-purple-50 rounded-[48px] border border-purple-100 flex items-center gap-6 shadow-sm">
              <Sparkles className="w-8 h-8 text-purple-500 shrink-0" />
              <div>
                 <p className="text-[11px] font-black text-purple-900 uppercase tracking-widest">PRO-TIP: PIPELINE VELOCITY</p>
                 <p className="text-sm font-medium text-purple-800/70 leading-relaxed mt-1">Advancing a lead to a quotation will allow you to generate formal PDF documents for the client and set clear fee structures.</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AddQuotation;
