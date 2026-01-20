import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Lead } from '../types';
import { Search, Eye, RefreshCw, Hash, MapPin, FileSpreadsheet } from 'lucide-react';
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
    <div className="min-h-screen bg-[#f8fafc] pb-24 animate-in fade-in duration-500">
      <div className="sticky top-16 lg:top-0 z-40 bg-[#f8fafc]/90 backdrop-blur-xl px-6 md:px-10 pt-10 pb-8 border-b border-slate-50 shadow-sm">
        <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div>
            <h1 className="text-4xl font-black text-[#0f172a] tracking-tight">Quotations Portfolio</h1>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em] mt-2 opacity-80 flex items-center gap-2">
              <FileSpreadsheet className="w-3.5 h-3.5 text-purple-500" /> MONITORING ACTIVE ARCHITECTURAL PROPOSALS
            </p>
          </div>
          <div className="bg-purple-50 text-purple-700 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-purple-100 flex items-center gap-3 shadow-sm">
             Drafting Verified Phase
          </div>
        </header>

        <div className="relative w-full max-w-lg">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
          <input 
            type="text" 
            placeholder="Search proposals by client or ID..."
            className="w-full pl-16 pr-6 h-16 bg-white border border-slate-100 rounded-[28px] text-[13px] font-bold text-slate-700 outline-none focus:ring-4 focus:ring-purple-500/5 transition-all shadow-sm"
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="px-6 md:px-10 mt-10">
        <div className="bg-white rounded-[48px] border border-slate-100 shadow-xl shadow-slate-200/5 overflow-hidden">
          <div className="overflow-x-auto no-scrollbar max-h-[calc(100vh-320px)] overflow-y-auto">
            <table className="w-full text-left min-w-[1000px] border-separate border-spacing-0">
              <thead className="sticky top-0 z-[40] bg-white">
                <tr className="bg-white text-slate-400 text-[10px] uppercase font-black tracking-[0.25em]">
                  <th className="px-10 py-7 border-b border-slate-100 bg-white">Proposal Reference</th>
                  <th className="px-10 py-7 border-b border-slate-100 bg-white">Client Entity</th>
                  <th className="px-10 py-7 border-b border-slate-100 bg-white">Quoted Value</th>
                  <th className="px-10 py-7 border-b border-slate-100 bg-white">Lifecycle Stage</th>
                  <th className="px-10 py-7 border-b border-slate-100 bg-white text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={5} className="py-24 text-center"><RefreshCw className="w-10 h-10 text-purple-600 animate-spin mx-auto" /></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="py-24 text-center text-slate-300 font-black tracking-widest">No matching quotations found</td></tr>
                ) : filtered.map((l) => (
                  <tr key={l.id} onClick={() => navigate(`/quotations/${l.id}`)} className="hover:bg-slate-50/80 transition-all cursor-pointer group">
                    <td className="px-10 py-8">
                       <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1.5">QTN-{l.id.slice(0,8).toUpperCase()}</p>
                       <p className="text-[14px] font-black text-slate-900 group-hover:text-purple-700 transition-colors">{l.package || 'Custom Proposal'}</p>
                    </td>
                    <td className="px-10 py-8">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-slate-400 group-hover:bg-purple-600 group-hover:text-white transition-all shadow-sm">
                             {l.client_name.charAt(0)}
                          </div>
                          <div>
                             <p className="text-[14px] font-black text-slate-700">{l.client_name}</p>
                             <p className="text-[10px] font-bold text-slate-400 flex items-center gap-2 mt-0.5"><MapPin className="w-3.5 h-3.5 text-purple-300" /> {l.address}</p>
                          </div>
                       </div>
                    </td>
                    <td className="px-10 py-8">
                       <div className="flex flex-col">
                          <span className="text-[15px] font-black text-purple-700">BDT {l.asking_fee?.toLocaleString() || 'N/A'}</span>
                          <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mt-1">ARCHITECTURAL FEE</span>
                       </div>
                    </td>
                    <td className="px-10 py-8">
                      <span className="px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-purple-50 text-purple-600 border border-purple-100 shadow-sm">
                        Quotation Sent
                      </span>
                    </td>
                    <td className="px-10 py-8 text-right">
                       <div className="inline-flex p-3 bg-white border border-slate-100 rounded-xl shadow-sm text-slate-300 group-hover:text-purple-600 transition-all group-hover:shadow-md group-hover:scale-110">
                          <Eye className="w-5 h-5" />
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