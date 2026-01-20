
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Lead } from '../types';
import { 
  Search, Eye, RefreshCw, Hash, Mail, MapPin, 
  Banknote, Layers, Calendar, Phone, FileSpreadsheet, Download
} from 'lucide-react';
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
      const { data } = await supabase
        .from('leads')
        .select('*')
        .eq('status', 'Quotation')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });
      setQuotations(data || []);
    } finally {
      setLoading(false);
    }
  };

  const filtered = quotations.filter(l => 
    l.client_name.toLowerCase().includes(search.toLowerCase()) || 
    l.phone.includes(search) || 
    (l.email && l.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24 animate-in fade-in duration-500">
      <div className="sticky top-0 z-40 bg-[#f8fafc]/80 backdrop-blur-md px-6 md:px-10 pt-10 pb-6">
        <header className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8">
          <div>
            <h1 className="text-4xl font-black text-[#0f172a] tracking-tight">Quotations Archive</h1>
            <p className="text-slate-400 text-sm mt-1.5 font-medium flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" /> Monitoring {quotations.length} active architectural design proposals.
            </p>
          </div>
          <div className="bg-purple-50 text-purple-700 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-purple-100 flex items-center gap-2 shadow-sm">
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

      <div className="px-6 md:px-10 mt-6">
        <div className="bg-white rounded-[48px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left min-w-[1000px]">
              <thead>
                <tr className="text-slate-400 text-[10px] uppercase font-black tracking-[0.25em] border-b border-slate-50">
                  <th className="px-10 py-7">Proposal Reference</th>
                  <th className="px-10 py-7">Client Detail</th>
                  <th className="px-10 py-7">Quoted Value</th>
                  <th className="px-10 py-7">Status</th>
                  <th className="px-10 py-7 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={5} className="py-24 text-center"><RefreshCw className="w-10 h-10 text-purple-600 animate-spin mx-auto" /></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="py-24 text-center text-slate-300 font-black uppercase tracking-widest">No matching quotations found</td></tr>
                ) : filtered.map((l) => (
                  <tr key={l.id} onClick={() => navigate(`/quotations/${l.id}`)} className="hover:bg-slate-50/80 transition-all cursor-pointer group">
                    <td className="px-10 py-8">
                       <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1.5">QTN-{l.id.slice(0,8).toUpperCase()}</p>
                       <p className="text-sm font-black text-slate-900">{l.package || 'Custom Proposal'}</p>
                    </td>
                    <td className="px-10 py-8">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center font-black text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                             {l.client_name.charAt(0)}
                          </div>
                          <div>
                             <p className="text-[13px] font-black text-slate-700">{l.client_name}</p>
                             <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3" /> {l.address}</p>
                          </div>
                       </div>
                    </td>
                    <td className="px-10 py-8">
                       <div className="flex flex-col">
                          <span className="text-sm font-black text-purple-700">BDT {l.asking_fee?.toLocaleString() || 'N/A'}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Architectural Fee</span>
                       </div>
                    </td>
                    <td className="px-10 py-8">
                      <span className="px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest bg-purple-50 text-purple-600 border border-purple-100">
                        Quotation Sent
                      </span>
                    </td>
                    <td className="px-10 py-8 text-right">
                       <div className="inline-flex p-3 bg-white border border-slate-100 rounded-xl shadow-sm text-slate-300 group-hover:text-purple-600 transition-all">
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
