
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Lead, Profile, Project } from '../types';
import { 
  Trash2, RefreshCw, ArrowLeft, History, 
  User, Briefcase, FileText, Trash, AlertTriangle, 
  RotateCcw, Search, CheckCircle2, X, Layers
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const RecycleBin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'leads' | 'clients' | 'team' | 'projects'>('leads');
  const [items, setItems] = useState<(Lead | Profile | Project)[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Custom Modal State for Permanent Deletion
  const [purgeTarget, setPurgeTarget] = useState<Lead | Profile | Project | null>(null);

  useEffect(() => {
    fetchDeletedItems();
  }, [activeTab]);

  const fetchDeletedItems = async () => {
    setLoading(true);
    try {
      let query;
      if (activeTab === 'team') {
        query = supabase.from('profiles').select('*').not('deleted_at', 'is', null);
      } else if (activeTab === 'projects') {
        query = supabase.from('projects').select('*').not('deleted_at', 'is', null);
      } else {
        const isClient = activeTab === 'clients';
        query = supabase.from('leads').select('*').eq('is_client', isClient).not('deleted_at', 'is', null);
      }
      
      const { data, error } = await query.order('deleted_at', { ascending: false });
      if (error) throw error;
      setItems(data || []);
    } catch (err: any) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id: string) => {
    setProcessingId(id);
    try {
      let table = 'leads';
      if (activeTab === 'team') table = 'profiles';
      if (activeTab === 'projects') table = 'projects';

      const { error } = await supabase.from(table).update({ deleted_at: null }).eq('id', id);
      if (error) throw error;
      setItems(prev => prev.filter(item => item.id !== id));
    } catch (err: any) {
      alert('Restoration failed: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handlePermanentPurge = async () => {
    if (!purgeTarget) return;
    
    setProcessingId(purgeTarget.id);
    let table = 'leads';
    if (activeTab === 'team') table = 'profiles';
    if (activeTab === 'projects') table = 'projects';
    
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', purgeTarget.id);
      
      if (error) throw error;
      
      setItems(prev => prev.filter(item => item.id !== purgeTarget.id));
      setPurgeTarget(null);
    } catch (err: any) {
      console.error('Purge error:', err);
      alert('Purge failed. Verify RLS policies. Error: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredItems = items.filter(item => {
    let name = '';
    if ('client_name' in item) name = item.client_name;
    else if ('full_name' in item) name = item.full_name;
    else if ('name' in item) name = item.name;
    return name?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getTargetName = (item: Lead | Profile | Project | null) => {
    if (!item) return '';
    if ('client_name' in item) return item.client_name;
    if ('full_name' in item) return item.full_name;
    if ('name' in item) return item.name;
    return '';
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-32 px-6 md:px-10 pt-12 animate-in fade-in duration-500 max-w-6xl mx-auto">
      
      {/* Custom Purge Confirmation Modal */}
      {purgeTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/50 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[48px] p-12 max-w-lg w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300 text-center">
            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-[32px] flex items-center justify-center mb-8 mx-auto shadow-lg">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-4">Final Purge?</h3>
            <p className="text-slate-500 leading-relaxed font-medium mb-10 text-sm">
              You are about to permanently erase <span className="text-red-600 font-bold">"{getTargetName(purgeTarget)}"</span> from the architectural vault. This action is irreversible.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setPurgeTarget(null)} 
                className="flex-1 py-5 bg-slate-50 text-slate-500 rounded-[24px] text-[11px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
              >
                Keep Record
              </button>
              <button 
                onClick={handlePermanentPurge} 
                className="flex-1 py-5 bg-red-600 text-white rounded-[24px] text-[11px] font-black uppercase tracking-widest hover:bg-red-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-red-900/20"
              >
                {processingId === purgeTarget.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Confirm Purge
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/settings')} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-xl shadow-slate-200/40 hover:bg-slate-50 transition-all active:scale-95">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Archive Vault</h1>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em] mt-2 opacity-80">RECYCLE BIN & RECORD PURGING</p>
          </div>
        </div>
      </header>

      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar w-full md:w-auto">
          {[
            { id: 'leads', label: 'Leads', icon: FileText },
            { id: 'clients', label: 'Clients', icon: Briefcase },
            { id: 'projects', label: 'Projects', icon: Layers },
            { id: 'team', label: 'Team', icon: User }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`whitespace-nowrap px-8 py-4 rounded-[24px] text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 border ${activeTab === tab.id ? 'bg-slate-900 text-white border-transparent shadow-2xl shadow-slate-900/20' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-slate-900 transition-colors" />
          <input 
            type="text" 
            placeholder="Search archive..."
            className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-slate-500/5 transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-[48px] border border-slate-100 shadow-xl shadow-slate-200/20 overflow-hidden">
        {loading ? (
          <div className="py-32 flex flex-col items-center justify-center gap-6 text-slate-400">
            <RefreshCw className="w-10 h-10 animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest">Scanning Secure Archive...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-32 flex flex-col items-center justify-center gap-8 text-center">
            <div className="w-24 h-24 bg-slate-50 text-slate-200 rounded-[32px] flex items-center justify-center mx-auto">
               <History className="w-10 h-10 opacity-30" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">Vault is Clear</p>
              <p className="text-[10px] text-slate-300 font-medium">No archived records found in this sector.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-black tracking-[0.3em] border-b border-slate-50">
                  <th className="px-12 py-8">Record Identifier</th>
                  <th className="px-12 py-8">Deletion Date</th>
                  <th className="px-12 py-8 text-right">Vault Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredItems.map((item) => {
                  const name = getTargetName(item);
                  const isProcessing = processingId === item.id;
                  
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/30 transition-all group">
                      <td className="px-12 py-8">
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center font-black group-hover:bg-slate-900 group-hover:text-white transition-all shadow-sm">
                            {name?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900">{name}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 opacity-70">
                              {activeTab === 'team' ? (item as Profile).role : activeTab === 'projects' ? (item as Project).status : (item as Lead).package || 'General Discovery'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-12 py-8 text-slate-500 font-bold text-[11px]">
                        {new Date(item.deleted_at!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-12 py-8 text-right">
                        <div className="flex items-center justify-end gap-3 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button 
                            disabled={isProcessing}
                            onClick={() => handleRestore(item.id)}
                            className="px-6 py-3 bg-white border border-slate-100 text-emerald-600 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-50 transition-all flex items-center gap-2 shadow-sm"
                          >
                            {isProcessing && processingId === item.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                            Restore
                          </button>
                          <button 
                            disabled={isProcessing}
                            onClick={() => setPurgeTarget(item)}
                            className="px-6 py-3 bg-red-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-red-700 transition-all flex items-center gap-2 shadow-xl shadow-red-900/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Purge
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-12 p-8 bg-amber-50 border border-amber-100 rounded-[32px] flex items-start gap-6">
        <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0 mt-1" />
        <div className="space-y-1">
          <p className="text-[11px] font-black text-amber-900 uppercase tracking-widest">Permanent Deletion Notice</p>
          <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
            Purged records are completely removed from the database. Recovery is impossible even for workspace administrators.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RecycleBin;
