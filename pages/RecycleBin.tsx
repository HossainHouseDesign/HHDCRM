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
    <div className="min-h-screen bg-[#f8fafc] pb-32 px-4 md:px-6 pt-6 md:pt-10 animate-in fade-in duration-500 max-w-[1440px] mx-auto">
      <header className="mb-6 md:mb-8 flex flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/settings')} className="w-10 h-10 bg-white border border-slate-200 rounded-xl shadow-none flex items-center justify-center hover:bg-slate-50 transition-colors"><ArrowLeft className="w-4 h-4 text-slate-500" /></button>
          <div className="leading-none">
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">Recycle Bin</h1>
            <p className="text-slate-400 text-[8px] font-black uppercase tracking-widest mt-1.5 opacity-80 leading-none">ARCHIVE GOVERNANCE</p>
          </div>
        </div>
      </header>

      <div className="space-y-4 mb-6 md:mb-8">
        <div className="flex flex-col lg:flex-row items-stretch gap-3 md:gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar p-1 bg-slate-100 rounded-xl transition-all">
              {['all', 'leads', 'clients', 'projects', 'construction', 'visits', 'cashbooks', 'team'].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab as BinTab)} className={`whitespace-nowrap px-4 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{tab}</button>
              ))}
            </div>
          </div>
          <div className="relative w-full lg:w-64 shrink-0 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
            <input type="text" placeholder="Search bin..." className="w-full h-10 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-[12px] font-bold text-slate-700 outline-none focus:border-slate-900 transition-all shadow-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="px-0">
        {loading ? (
          <div className="py-24 flex justify-center"><RefreshCw className="w-8 h-8 animate-spin text-slate-900" /></div>
        ) : filteredItems.length === 0 ? (
          <div className="py-32 text-center bg-white rounded-3xl border border-slate-200 shadow-sm"><History className="w-12 h-12 text-slate-100 mx-auto mb-4" /><p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Archive repository is empty</p></div>
        ) : (
          <>
            {/* MOBILE LIST */}
            <div className="grid grid-cols-1 gap-3 lg:hidden">
              {filteredItems.map((item) => {
                const name = getTargetName(item);
                const itemType = activeTab === 'all' ? item.__type : activeTab;
                return (
                  <div key={`${itemType}-${item.id}`} className="bg-white p-4 rounded-xl border border-slate-200 shadow-none">
                    <div className="flex justify-between items-start mb-3">
                      <div className="leading-none">
                        <span className="px-2 py-0.5 bg-slate-50 text-slate-400 rounded-md text-[7px] font-black uppercase border border-slate-100 mb-1.5 inline-block">{itemType}</span>
                        <h3 className="text-[13px] font-black text-slate-900 uppercase truncate leading-none">{name}</h3>
                        <p className="text-[9px] text-slate-300 font-bold mt-1.5 leading-none">DELETED: {new Date(item.deleted_at!).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-50">
                       <button onClick={() => handleRestore(item)} className="flex-1 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-[8px] font-black uppercase tracking-widest active:scale-95 transition-all">Restore</button>
                       <button onClick={() => setPurgeTarget(item)} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-[8px] font-black uppercase tracking-widest active:scale-95 transition-all">Purge</button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DESKTOP TABLE */}
            <div className="hidden lg:block bg-white rounded-xl border border-slate-200 shadow-none overflow-hidden">
               <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-slate-50/50 text-slate-400 text-[8px] uppercase font-black tracking-widest leading-none">
                        <th className="px-6 py-4 border-b border-slate-100">Record Identity</th>
                        {activeTab === 'all' && <th className="px-6 py-4 border-b border-slate-100">Segment</th>}
                        <th className="px-6 py-4 border-b border-slate-100">Archived Date</th>
                        <th className="px-6 py-4 border-b border-slate-100 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredItems.map((item) => {
                        const name = getTargetName(item);
                        const itemType = activeTab === 'all' ? item.__type : activeTab;
                        return (
                          <tr key={`${itemType}-${item.id}`} className="hover:bg-slate-50/30 transition-all group">
                            <td className="px-6 py-3">
                               <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-slate-50 text-slate-300 rounded-lg flex items-center justify-center font-black group-hover:bg-slate-900 group-hover:text-white transition-all shadow-none uppercase">{name?.charAt(0)}</div>
                                  <p className="text-[13px] font-black text-slate-900 uppercase tracking-tight truncate max-w-[200px]">{name}</p>
                               </div>
                            </td>
                            {activeTab === 'all' && <td className="px-6 py-3"><span className="px-2.5 py-1 bg-slate-50 text-slate-400 rounded-md text-[8px] font-black uppercase tracking-widest border border-slate-100">{itemType}</span></td>}
                            <td className="px-6 py-3 text-slate-300 font-bold text-[10px] uppercase leading-none">{new Date(item.deleted_at!).toLocaleDateString()}</td>
                            <td className="px-6 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => handleRestore(item)} className="px-4 py-1.5 bg-white border border-slate-200 text-emerald-600 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-emerald-50 transition-all leading-none">Restore</button>
                                <button onClick={() => setPurgeTarget(item)} className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-red-700 transition-all leading-none">Purge</button>
                              </div>
                            </td>
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-300 text-center leading-none">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-none"><AlertTriangle className="w-8 h-8" /></div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2 uppercase leading-none">Record Purge?</h3>
            <p className="text-slate-400 mb-6 text-[11px] font-bold uppercase leading-relaxed tracking-tight">Erasing <span className="text-red-600">"{getTargetName(purgeTarget)}"</span> permanently from Registry. This cannot be reversed.</p>
            <div className="flex gap-3"><button onClick={() => setPurgeTarget(null)} className="flex-1 py-3 bg-slate-50 text-slate-400 rounded-xl text-[9px] font-black uppercase tracking-widest">Cancel</button><button onClick={handlePermanentPurge} className="flex-1 py-3 bg-red-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-none hover:bg-red-700 transition-all">Confirm Purge</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecycleBin;