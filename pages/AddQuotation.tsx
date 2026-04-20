
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
    <div className="min-h-screen bg-[#f8fafc] pb-32 px-6 pt-10 animate-in slide-in-from-bottom-6">
      <header className="max-w-3xl mx-auto flex items-center gap-4 mb-10">
        <button 
          onClick={() => mode === 'choice' ? navigate(-1) : setMode('choice')} 
          className="p-3 bg-white border border-slate-100 rounded-xl shadow-none text-slate-300 hover:text-slate-900 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="leading-none">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none uppercase">Initiate Quotation</h1>
          <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mt-2 opacity-80 leading-none">DRAFTING OFFICIAL ARCHITECTURAL PROPOSALS</p>
        </div>
      </header>

      {mode === 'choice' ? (
        <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          <button 
            onClick={fetchLeads}
            disabled={loading}
            className="p-8 bg-white border border-slate-100 rounded-[32px] shadow-sm text-left group hover:border-purple-500 transition-all hover:-translate-y-1 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 blur-[30px] rounded-full pointer-events-none" />
            <div className="w-12 h-12 bg-slate-50 text-slate-900 border border-slate-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-none">
              {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <FileText className="w-6 h-6" />}
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2 leading-none uppercase">From Pipeline</h3>
            <p className="text-xs text-slate-400 font-bold leading-relaxed uppercase tracking-tight">Advance existing inquiry to proposal.</p>
            <div className="mt-8 flex items-center gap-2 text-purple-600 text-[9px] font-black uppercase tracking-widest leading-none">
              Select Active Lead <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </button>

          <button 
            onClick={() => navigate('/leads/new?mode=quotation')}
            className="p-8 bg-white border border-slate-100 rounded-[32px] shadow-sm text-left group hover:border-slate-900 transition-all hover:-translate-y-1 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-slate-900/5 blur-[40px] rounded-full pointer-events-none" />
            <div className="w-12 h-12 bg-slate-50 text-slate-900 border border-slate-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-none">
              <Plus className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2 leading-none uppercase">Direct Proposal</h3>
            <p className="text-xs text-slate-400 font-bold leading-relaxed uppercase tracking-tight">Draft quotation for a new entity.</p>
            <div className="mt-8 flex items-center gap-2 text-slate-900 text-[9px] font-black uppercase tracking-widest leading-none">
              Draft New Record <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300">
           <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-slate-900 transition-colors" />
              <input 
                type="text" 
                placeholder="Search leads to Advance..."
                autoFocus
                className="w-full h-12 pl-12 pr-6 bg-white border border-slate-200 rounded-2xl text-[13px] font-bold text-slate-700 outline-none focus:border-slate-900 transition-all shadow-none"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
           </div>

           <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
              {filteredLeads.length === 0 ? (
                <div className="py-20 text-center">
                   <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 opacity-30">
                      <History className="w-8 h-8" />
                   </div>
                   <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No discovery leads eligible for advancement</p>
                </div>
              ) : filteredLeads.map(l => (
                <div 
                  key={l.id} 
                  onClick={() => navigate(`/leads/${l.id}?open=quotation`)}
                  className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-all cursor-pointer group"
                >
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-sm font-black text-slate-300 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-none">
                         {l.client_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="leading-none">
                         <p className="text-sm font-black text-slate-900 group-hover:text-purple-700 transition-colors leading-none uppercase truncate tracking-tight">{l.client_name}</p>
                         <div className="flex items-center gap-3 mt-2 leading-none">
                            <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 leading-none uppercase"><Phone className="w-3 h-3 text-emerald-400" /> {l.phone}</p>
                            <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 leading-none uppercase truncate max-w-[150px]"><MapPin className="w-3 h-3 text-purple-400" /> {l.address || 'PENDING'}</p>
                         </div>
                      </div>
                   </div>
                   <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg border border-slate-100 flex items-center justify-center text-slate-200 group-hover:bg-slate-900 group-hover:text-white transition-all">
                         <ChevronRight className="w-4 h-4" />
                      </div>
                   </div>
                </div>
              ))}
           </div>

           <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-200 flex items-center gap-4 shadow-none">
              <Sparkles className="w-5 h-5 text-purple-500 shrink-0" />
              <div className="leading-tight">
                 <p className="text-[9px] font-black text-slate-900 uppercase tracking-widest leading-none">PRO-TIP: PIPELINE VELOCITY</p>
                 <p className="text-[11px] font-bold text-slate-400 tracking-tight leading-relaxed mt-1.5 uppercase leading-none">Advancing leads enables formal proposal generation.</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AddQuotation;
