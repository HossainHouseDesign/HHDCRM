import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Lead, Profile, Project } from '../types';
import { 
  Trash2, RefreshCw, ArrowLeft, History, 
  User, FileText, Trash, AlertTriangle, 
  RotateCcw, Search, CheckCircle2, X, Layers, HardHat,
  MapPin, Briefcase, Banknote, FolderKanban, LayoutGrid,
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../App';

type BinTab = 'all' | 'leads' | 'clients' | 'team' | 'projects' | 'construction' | 'visits' | 'cashbooks';

const RecycleBin = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<BinTab>('all');
  const [items, setItems] = useState<(any)[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [purgeTarget, setPurgeTarget] = useState<any | null>(null);

  useEffect(() => {
    fetchDeletedItems();
  }, [activeTab]);

  const fetchDeletedItems = async () => {
    setLoading(true);
    try {
      if (activeTab === 'all') {
        const [leadsRes, clientsRes, teamRes, projRes, constRes, visitsRes, cashRes] = await Promise.all([
          supabase.from('leads').select('*').eq('is_client', false).not('deleted_at', 'is', null),
          supabase.from('leads').select('*').eq('is_client', true).not('deleted_at', 'is', null),
          supabase.from('profiles').select('*').not('deleted_at', 'is', null),
          supabase.from('projects').select('*').not('deleted_at', 'is', null),
          supabase.from('construction_projects').select('*').not('deleted_at', 'is', null),
          supabase.from('site_visits').select('*, project:projects(name), lead:leads(client_name)').not('deleted_at', 'is', null),
          supabase.from('finance_cashbooks').select('*').not('deleted_at', 'is', null)
        ]);

        const allItems = [
          ...(leadsRes.data || []).map(i => ({ ...i, __type: 'leads' })),
          ...(clientsRes.data || []).map(i => ({ ...i, __type: 'clients' })),
          ...(teamRes.data || []).map(i => ({ ...i, __type: 'team' })),
          ...(projRes.data || []).map(i => ({ ...i, __type: 'projects' })),
          ...(constRes.data || []).map(i => ({ ...i, __type: 'construction' })),
          ...(visitsRes.data || []).map(i => ({ ...i, __type: 'visits' })),
          ...(cashRes.data || []).map(i => ({ ...i, __type: 'cashbooks' })),
        ];
        setItems(allItems.sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime()));
      } else {
        let table = 'leads';
        if (activeTab === 'team') table = 'profiles';
        if (activeTab === 'projects') table = 'projects';
        if (activeTab === 'construction') table = 'construction_projects';
        if (activeTab === 'visits') table = 'site_visits';
        if (activeTab === 'cashbooks') table = 'finance_cashbooks';
        
        let query = supabase.from(table).select('*').not('deleted_at', 'is', null);
        if (activeTab === 'leads' || activeTab === 'clients') query = query.eq('is_client', activeTab === 'clients');
        
        const { data, error } = await query.order('deleted_at', { ascending: false });
        if (error) throw error;
        setItems(data || []);
      }
    } catch (err: any) { showNotification(`Archive failed.`, "error"); } finally { setLoading(false); }
  };

  const handleRestore = async (item: any) => {
    const id = item.id;
    const tab = activeTab === 'all' ? item.__type : activeTab;
    setProcessingId(id);
    try {
      let table = 'leads';
      if (tab === 'team') table = 'profiles';
      if (tab === 'projects') table = 'projects';
      if (tab === 'construction') table = 'construction_projects';
      if (tab === 'visits') table = 'site_visits';
      if (tab === 'cashbooks') table = 'finance_cashbooks';
      
      const { error } = await supabase.from(table).update({ deleted_at: null }).eq('id', id);
      if (error) throw error;
      setItems(prev => prev.filter(i => i.id !== id));
      showNotification("Record restored.", "success");
    } catch (err: any) { showNotification(`Recovery failed.`, "error"); } finally { setProcessingId(null); }
  };

  const handlePermanentPurge = async () => {
    if (!purgeTarget) return;
    const id = purgeTarget.id;
    const tab = activeTab === 'all' ? purgeTarget.__type : activeTab;
    setProcessingId(id);
    let table = 'leads';
    if (tab === 'team') table = 'profiles';
    if (tab === 'projects') table = 'projects';
    if (tab === 'construction') table = 'construction_projects';
    if (tab === 'visits') table = 'site_visits';
    if (tab === 'cashbooks') table = 'finance_cashbooks';
    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      setItems(prev => prev.filter(i => i.id !== id));
      showNotification("Purged.", "info");
      setPurgeTarget(null);
    } catch (err: any) { showNotification(`Purge failed.`, "error"); } finally { setProcessingId(null); }
  };

  const getTargetName = (item: any) => {
    const type = activeTab === 'all' ? item.__type : activeTab;
    if (type === 'visits') return item.project?.name || item.lead?.client_name || 'Untitled Visit';
    return item.client_name || item.full_name || item.name || item.title || 'Unknown Record';
  };

  const filteredItems = items.filter(item => getTargetName(item)?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-32 px-4 md:px-10 pt-6 md:pt-12 animate-in fade-in duration-500 max-w-[1440px] mx-auto">
      <header className="mb-8 md:mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/settings')} className="w-12 h-12 md:w-14 md:h-14 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center justify-center"><ArrowLeft className="w-5 h-5 text-slate-500" /></button>
          <div>
            <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">Recycle Bin</h1>
            <p className="text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-[0.25em] mt-1 opacity-80">ARCHIVE GOVERNANCE</p>
          </div>
        </div>
      </header>

      <div className="space-y-6 mb-8 md:mb-12">
        <div className="flex flex-col lg:flex-row items-stretch gap-4 md:gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar p-1.5 bg-white border border-slate-100 rounded-[28px] md:rounded-[32px] shadow-sm">
              {['all', 'leads', 'clients', 'projects', 'construction', 'visits', 'cashbooks', 'team'].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab as BinTab)} className={`whitespace-nowrap px-5 md:px-6 py-2.5 md:py-3.5 rounded-[22px] text-[9px] md:text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === tab ? 'bg-[#064e3b] text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>{tab}</button>
              ))}
            </div>
          </div>
          <div className="relative w-full lg:w-72 shrink-0 group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            <input type="text" placeholder="Search bin..." className="w-full h-12 md:h-16 pl-12 pr-6 bg-white border border-slate-100 rounded-[20px] md:rounded-[28px] text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/5 shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="px-1 md:px-0">
        {loading ? (
          <div className="py-24 flex justify-center"><RefreshCw className="w-10 h-10 animate-spin text-[#064e3b]" /></div>
        ) : filteredItems.length === 0 ? (
          <div className="py-32 text-center bg-white rounded-[40px] border border-slate-100 shadow-sm"><History className="w-16 h-16 text-slate-100 mx-auto mb-6" /><p className="text-[11px] font-black uppercase tracking-widest text-slate-300">Bin segment is empty</p></div>
        ) : (
          <>
            {/* MOBILE GRID */}
            <div className="grid grid-cols-1 gap-4 lg:hidden">
              {filteredItems.map((item) => {
                const name = getTargetName(item);
                const itemType = activeTab === 'all' ? item.__type : activeTab;
                return (
                  <div key={`${itemType}-${item.id}`} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="px-2.5 py-1 bg-slate-50 text-slate-400 rounded-lg text-[8px] font-black uppercase border border-slate-100 mb-2 inline-block">{itemType}</span>
                        <h3 className="text-base font-black text-slate-900 line-clamp-1">{name}</h3>
                        <p className="text-[10px] text-slate-400 font-bold mt-1">Deleted: {new Date(item.deleted_at!).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-4 border-t border-slate-50">
                       <button onClick={() => handleRestore(item)} className="flex-1 py-3 bg-emerald-50 text-emerald-600 rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all">Restore</button>
                       <button onClick={() => setPurgeTarget(item)} className="px-6 py-3 bg-red-50 text-red-600 rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all">Purge</button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DESKTOP TABLE */}
            <div className="hidden lg:block bg-white rounded-[48px] border border-slate-100 shadow-xl overflow-hidden">
               <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-black tracking-[0.3em]">
                        <th className="px-12 py-8 border-b border-slate-100">Record</th>
                        {activeTab === 'all' && <th className="px-12 py-8 border-b border-slate-100">Sector</th>}
                        <th className="px-12 py-8 border-b border-slate-100">Deleted</th>
                        <th className="px-12 py-8 border-b border-slate-100 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredItems.map((item) => {
                        const name = getTargetName(item);
                        const itemType = activeTab === 'all' ? item.__type : activeTab;
                        return (
                          <tr key={`${itemType}-${item.id}`} className="hover:bg-slate-50/30 transition-all group">
                            <td className="px-12 py-8">
                               <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-slate-50 text-slate-300 rounded-xl flex items-center justify-center font-black">{name?.charAt(0)}</div>
                                  <p className="text-sm font-black text-slate-900">{name}</p>
                               </div>
                            </td>
                            {activeTab === 'all' && <td className="px-12 py-8"><span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase">{itemType}</span></td>}
                            <td className="px-12 py-8 text-slate-500 font-bold text-[11px]">{new Date(item.deleted_at!).toLocaleDateString()}</td>
                            <td className="px-12 py-8 text-right"><div className="flex items-center justify-end gap-3"><button onClick={() => handleRestore(item)} className="px-5 py-2.5 bg-white border border-slate-100 text-emerald-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-50 transition-all">Restore</button><button onClick={() => setPurgeTarget(item)} className="px-5 py-2.5 bg-red-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-700 transition-all">Purge</button></div></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
               </div>
            </div>
          </>
        )}
      </div>

      {purgeTarget && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[40px] p-10 max-w-lg w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300 text-center">
            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-[28px] flex items-center justify-center mb-8 mx-auto shadow-sm"><AlertTriangle className="w-10 h-10" /></div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-4">Permanent Purge?</h3>
            <p className="text-slate-500 mb-8 text-sm">Erase <span className="font-bold">"{getTargetName(purgeTarget)}"</span> permanently from registry?</p>
            <div className="flex gap-4"><button onClick={() => setPurgeTarget(null)} className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest">Cancel</button><button onClick={handlePermanentPurge} className="flex-1 py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">Confirm Purge</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecycleBin;