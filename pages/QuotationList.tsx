
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Lead } from '../types';
import { Search, Eye, RefreshCw, Hash, MapPin, FileSpreadsheet, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const QuotationList = () => {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchQuotations();
  }, []);

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const { data } = await supabase.from('leads').select('*').eq('status', 'Quotation').is('deleted_at', null).order('updated_at', { ascending: false });
      setQuotations(data || []);
    } finally {
      setLoading(false);
    }
  };

  const filtered = quotations.filter(l => 
    l.client_name.toLowerCase().includes(search.toLowerCase()) || 
    l.phone.includes(search)
  );

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 animate-in fade-in duration-500 relative">
      <div className="sticky top-14 lg:top-0 z-40 bg-white/80 backdrop-blur-md px-4 py-3 border-b border-slate-100 shadow-sm transition-all">
        <header className="flex flex-row justify-between items-center gap-4 mb-3">
          <div>
            <h1 className="text-xl font-bold text-[#0f172a] tracking-tight leading-none uppercase">Proposal Vault</h1>
            <p className="text-slate-400 text-[8px] font-bold uppercase tracking-widest mt-1 flex items-center gap-1.5 leading-none">
              <FileSpreadsheet className="w-3 h-3 text-purple-500" /> QUOTATION REPOSITORY
            </p>
          </div>
          <button onClick={() => navigate('/quotations/add')} className="px-5 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md active:scale-95 leading-none flex items-center gap-2">
            <Plus className="w-3.5 h-3.5" /> Proposal
          </button>
        </header>

        <div className="relative w-full max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
          <input 
            type="text" 
            placeholder="Search proposals..."
            className="w-full pl-9 pr-4 h-8 bg-slate-50 border border-slate-100 rounded-lg text-xs font-medium text-slate-700 outline-none focus:bg-white transition-all shadow-none"
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="px-4 mt-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-12 transition-all">
          <div className="overflow-x-auto no-scrollbar max-h-[calc(100vh-220px)] overflow-y-auto">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead className="sticky top-0 z-[40] bg-white">
                <tr className="bg-slate-50/50 text-slate-400 text-[8px] uppercase font-bold tracking-widest leading-none">
                  <th className="px-5 py-2.5 border-b border-slate-100 bg-slate-50/50">Reference ID</th>
                  <th className="px-5 py-2.5 border-b border-slate-100 bg-slate-50/50">Client Identity</th>
                  <th className="px-5 py-2.5 border-b border-slate-100 bg-slate-50/50">Financials</th>
                  <th className="px-5 py-2.5 border-b border-slate-100 bg-slate-50/50">Phase</th>
                  <th className="px-5 py-2.5 border-b border-slate-100 bg-slate-50/50 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={5} className="py-24 text-center"><RefreshCw className="w-8 h-8 text-purple-900 animate-spin mx-auto" /><p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-4">Accessing Data...</p></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="py-24 text-center text-slate-200 font-bold tracking-widest uppercase text-[10px]">Vault Records Empty</td></tr>
                ) : filtered.map((l) => (
                  <tr key={l.id} onClick={() => navigate(`/quotations/${l.id}`)} className="hover:bg-slate-50/30 transition-all cursor-pointer group">
                    <td className="px-5 py-2">
                       <p className="text-[7px] font-bold text-slate-300 uppercase tracking-widest leading-none">QTN-{l.id.slice(0,8).toUpperCase()}</p>
                       <p className="text-[13px] font-bold text-slate-900 group-hover:text-purple-700 transition-colors mt-1.5 leading-none uppercase tracking-tight">{l.package || 'Proposal'}</p>
                    </td>
                    <td className="px-5 py-2">
                       <div className="flex items-center gap-3">
                          <div className="w-7 h-7 bg-slate-50 rounded text-slate-300 group-hover:bg-purple-900 group-hover:text-white transition-all shadow-none flex items-center justify-center font-black">
                             {l.client_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                             <p className="text-[13px] font-bold text-slate-700 leading-none truncate uppercase tracking-tight">{l.client_name}</p>
                             <p className="text-[8px] font-bold text-slate-300 flex items-center gap-1.5 mt-1 leading-none uppercase"><MapPin className="w-2.5 h-2.5 text-purple-200" /> {l.address || 'PENDING'}</p>
                          </div>
                       </div>
                    </td>
                    <td className="px-5 py-2">
                       <div className="flex flex-col leading-none">
                          <span className="text-[13px] font-bold text-purple-900">৳{l.asking_fee?.toLocaleString() || '0'}</span>
                          <span className="text-[7px] font-black text-slate-200 uppercase tracking-widest mt-1">ASKING RATE</span>
                       </div>
                    </td>
                    <td className="px-5 py-2">
                      <span className="px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest bg-purple-50 text-purple-600 border border-purple-100 leading-none">
                        Transmitted
                      </span>
                    </td>
                    <td className="px-5 py-2 text-right">
                       <div className="inline-flex p-1.5 text-slate-100 group-hover:text-purple-900 transition-all">
                          <Eye className="w-3.5 h-3.5" />
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuotationList;
