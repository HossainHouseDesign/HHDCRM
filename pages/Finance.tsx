import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Banknote, ArrowLeft, ShieldCheck, 
  TrendingUp, DollarSign, RefreshCw, 
  Wallet, PieChart, Activity, Zap, Layers, 
  Search, Plus, X, ArrowRight,
  CheckCircle2, ArrowUpRight, ArrowDownRight, Coins,
  LogIn, History, Database, Wrench, BookOpen,
  ChevronDown, Building2, FileText, Save, Tag, Users2,
  Check, UserCircle, AlertCircle, Briefcase, ChevronRight,
  Archive, RotateCcw, Trash2, FolderKanban, ListFilter,
  ArrowRightLeft, ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useNotification, useUser } from '../App';
import { Project, Lead, Profile } from '../types';

type CashbookType = 'Project' | 'Office Cost' | 'Salary' | 'Site Visit' | 'Other';
type FinanceTab = 'active' | 'archived';

interface Cashbook {
  id: string;
  name: string;
  type: CashbookType;
  initial_balance: number;
  balance: number;
  total_in: number;
  total_out: number;
  project_id?: string;
  deleted_at?: string | null;
}

interface Transaction {
  id: string;
  cashbook_id: string;
  type: 'Income' | 'Expense';
  amount: number;
  category: string;
  description: string;
  date: string;
  project_id?: string;
  lead_id?: string;
}

const Finance = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { profile, isAdmin } = useUser();
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState<'missing' | 'outdated' | null>(null);
  const [activeTab, setActiveTab] = useState<FinanceTab>('active');
  const [typeFilter, setTypeFilter] = useState<CashbookType | 'All'>('All');
  
  // Data State
  const [cashbooks, setCashbooks] = useState<Cashbook[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);

  // Modal State
  const [showCashbookModal, setShowCashbookModal] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State - Cashbook
  const [cashbookForm, setCashbookForm] = useState({ 
    name: '', 
    initial_balance: 0,
    type: 'Project' as CashbookType,
    project_id: '',
    assigned_team: [] as string[]
  });
  
  // Form State - Entry
  const [entryForm, setEntryForm] = useState({
    cashbook_id: '',
    type: 'Income' as 'Income' | 'Expense',
    amount: 0,
    category: 'General',
    description: '',
    date: new Date().toISOString().split('T')[0],
    project_id: '',
    lead_id: ''
  });

  // Search/Autocomplete States
  const [searchQuery, setSearchQuery] = useState('');
  const [entityQuery, setEntityQuery] = useState('');
  const [showEntityDrop, setShowEntityDrop] = useState(false);
  const [cbProjectQuery, setCbProjectQuery] = useState('');
  const [showCbProjectDrop, setShowCbProjectDrop] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const cbProjRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchFinancials();
    fetchContextData();
    
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setShowEntityDrop(false);
      if (cbProjRef.current && !cbProjRef.current.contains(event.target as Node)) setShowCbProjectDrop(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchContextData = async () => {
    try {
      const [pRes, lRes, sRes] = await Promise.all([
        supabase.from('projects').select('*, client:leads(*)').is('deleted_at', null),
        supabase.from('leads').select('*').is('deleted_at', null),
        supabase.from('profiles').select('*').is('deleted_at', null).eq('status', 'active')
      ]);
      setProjects(pRes.data || []);
      setLeads(lRes.data || []);
      setStaff(sRes.data || []);
    } catch (err) { console.error(err); }
  };

  const fetchFinancials = async () => {
    try {
      setLoading(true);
      setSetupRequired(null);

      // Attempt to fetch with explicit check for cashbook_id
      const { data: cbData, error: cbError } = await supabase.from('finance_cashbooks').select('*');
      if (cbError) {
        if (cbError.code === '42P01') { setSetupRequired('missing'); return; }
        throw cbError;
      }

      const { data: transData, error: transError } = await supabase.from('finance_transactions').select('*').order('date', { ascending: false });
      if (transError) {
        // If error code is '42703' (undefined_column), it's likely missing cashbook_id
        if (transError.code === '42703' || transError.message.includes('cashbook_id')) {
          setSetupRequired('outdated');
          return;
        }
        throw transError;
      }

      const safeCb = cbData || [];
      const safeTrans = transData || [];

      const enriched: Cashbook[] = safeCb.map(cb => {
        const cbTrans = safeTrans.filter(t => t.cashbook_id === cb.id);
        const income = cbTrans.filter(t => t.type === 'Income').reduce((acc, t) => acc + Number(t.amount), 0);
        const expense = cbTrans.filter(t => t.type === 'Expense').reduce((acc, t) => acc + Number(t.amount), 0);
        return {
          ...cb,
          total_in: income,
          total_out: expense,
          balance: (Number(cb.initial_balance) || 0) + income - expense,
          type: (cb.description || 'Other') as CashbookType
        };
      });

      setCashbooks(enriched);
      setTransactions(safeTrans.slice(0, 10)); // Top 10 for dashboard preview
    } catch (err: any) {
      console.error("Finance Sync Failure:", err);
      if (err.code === '42703') setSetupRequired('outdated');
      else showNotification(`Vault connectivity issue: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setSetupRequired(null);
    setLoading(true);
    setTimeout(() => fetchFinancials(), 500); // Small delay to let Supabase cache settle
  };

  const handleArchiveCashbook = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!isAdmin) return;
    try {
      const { error } = await supabase.from('finance_cashbooks').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      showNotification("Ledger archived.", "info");
      fetchFinancials();
    } catch (err: any) { showNotification(err.message, "error"); }
  };

  const handleRestoreCashbook = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const { error } = await supabase.from('finance_cashbooks').update({ deleted_at: null }).eq('id', id);
      if (error) throw error;
      showNotification("Ledger restored.", "success");
      fetchFinancials();
    } catch (err: any) { showNotification(err.message, "error"); }
  };

  const handleAddCashbook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashbookForm.name) return;
    setIsSaving(true);
    try {
      const { data: newCb, error } = await supabase.from('finance_cashbooks').insert([{
        name: cashbookForm.name,
        initial_balance: cashbookForm.initial_balance,
        description: cashbookForm.type,
        project_id: cashbookForm.type === 'Project' ? cashbookForm.project_id : null,
        office_id: profile?.office_id,
        created_by: profile?.id
      }]).select().single();

      if (error) throw error;

      if (newCb && cashbookForm.assigned_team.length > 0) {
        const assignments = cashbookForm.assigned_team.map(pid => ({ cashbook_id: newCb.id, profile_id: pid }));
        await supabase.from('finance_cashbook_permissions').insert(assignments);
      }

      showNotification("Cashbook authorized.", "success");
      setShowCashbookModal(false);
      setCashbookForm({ name: '', initial_balance: 0, type: 'Project', project_id: '', assigned_team: [] });
      fetchFinancials();
    } catch (err: any) { showNotification(err.message, "error"); } finally { setIsSaving(false); }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryForm.cashbook_id || entryForm.amount <= 0) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from('finance_transactions').insert([{
        cashbook_id: entryForm.cashbook_id,
        type: entryForm.type,
        amount: entryForm.amount,
        category: entryForm.category,
        description: entryForm.description,
        date: entryForm.date,
        project_id: entryForm.project_id || null,
        lead_id: entryForm.lead_id || null,
        created_by: profile?.id,
        office_id: profile?.office_id
      }]);
      if (error) throw error;
      showNotification("Transaction synchronized.", "success");
      setShowEntryModal(false);
      setEntryForm({ cashbook_id: '', type: 'Income', amount: 0, category: 'General', description: '', date: new Date().toISOString().split('T')[0], project_id: '', lead_id: '' });
      fetchFinancials();
    } catch (err: any) { showNotification(err.message, "error"); } finally { setIsSaving(false); }
  };

  const totals = useMemo(() => {
    const activeCb = cashbooks.filter(c => !c.deleted_at);
    const initial = activeCb.reduce((acc, cb) => acc + (Number(cb.initial_balance) || 0), 0);
    const cin = activeCb.reduce((acc, cb) => acc + (cb.total_in || 0), 0);
    const cout = activeCb.reduce((acc, cb) => acc + (cb.total_out || 0), 0);
    return { in: cin + initial, out: cout, balance: (cin + initial) - cout };
  }, [cashbooks]);

  const displayedCashbooks = useMemo(() => {
    let result = activeTab === 'active' ? cashbooks.filter(cb => !cb.deleted_at) : cashbooks.filter(cb => !!cb.deleted_at);
    if (typeFilter !== 'All') result = result.filter(cb => cb.type === typeFilter);
    if (searchQuery) result = result.filter(cb => cb.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return result;
  }, [cashbooks, activeTab, typeFilter, searchQuery]);

  if (setupRequired) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-10 text-center animate-in fade-in duration-700 bg-slate-50">
       <div className={`w-28 h-28 ${setupRequired === 'missing' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'} rounded-[40px] flex items-center justify-center mb-10 shadow-2xl border-4 border-white`}>
          {setupRequired === 'missing' ? <Database className="w-12 h-12" /> : <Wrench className="w-12 h-12" />}
       </div>
       <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-4">
         {setupRequired === 'missing' ? 'Database Setup Required' : 'Schema Repair Required'}
       </h2>
       <p className="text-slate-500 max-w-xl leading-relaxed mb-12 text-sm font-medium">
         {setupRequired === 'missing' 
           ? "The architectural finance tables are missing from the vault. Please run the SQL initialization script found in the 'supabaseClient.ts' instructions."
           : "A structural mismatch was detected in the finance ledger columns (missing 'cashbook_id'). Please run the V105 Master Recovery SQL script in 'supabaseClient.ts' to synchronize the schema."}
       </p>
       <div className="flex flex-col sm:flex-row gap-4">
         <button onClick={handleRetry} className="px-10 py-5 bg-[#064e3b] text-white rounded-[24px] text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-emerald-900/20 active:scale-95 transition-all flex items-center gap-3">
            <RefreshCw className="w-5 h-5" /> Retry Connection
         </button>
         <button onClick={() => window.open('https://supabase.com/dashboard/project/_/sql', '_blank')} className="px-10 py-5 bg-white border border-slate-200 text-slate-600 rounded-[24px] text-[11px] font-black uppercase tracking-[0.2em] shadow-sm active:scale-95 transition-all flex items-center gap-3">
            <ExternalLink className="w-5 h-5" /> Open Supabase SQL
         </button>
       </div>
    </div>
  );

  if (loading) return (
    <div className="h-[70vh] flex flex-col items-center justify-center gap-6 px-6 text-center">
      <RefreshCw className="w-12 h-12 text-[#064e3b] animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">SYNCING FIRM VAULTS...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-32 animate-in fade-in duration-700">
      
      {/* MODALS */}
      {showCashbookModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[48px] p-8 md:p-12 max-w-xl w-full shadow-2xl animate-in zoom-in-95 overflow-y-auto max-h-[90vh] no-scrollbar">
             <div className="flex justify-between items-start mb-10">
                <div>
                   <h3 className="text-3xl font-black text-slate-900 tracking-tight">New Ledger</h3>
                   <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-2">FISCAL SECTOR PROVISIONING</p>
                </div>
                <button onClick={() => setShowCashbookModal(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-red-500 transition-all"><X className="w-6 h-6" /></button>
             </div>
             <form onSubmit={handleAddCashbook} className="space-y-8">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ledger Name</label>
                   <input required className="w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white transition-all shadow-inner" placeholder="e.g. Project X - Main Fund" value={cashbookForm.name} onChange={e => setCashbookForm({...cashbookForm, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Registry Type</label>
                    <div className="relative">
                      <select required className="w-full h-14 px-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none appearance-none" value={cashbookForm.type} onChange={e => setCashbookForm({...cashbookForm, type: e.target.value as CashbookType})}>
                        <option value="Project">Project</option>
                        <option value="Office Cost">Office Cost</option>
                        <option value="Salary">Salary</option>
                        <option value="Site Visit">Site Visit</option>
                        <option value="Other">Other</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Opening Inject (BDT)</label>
                    <input type="number" className="w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-emerald-700" value={cashbookForm.initial_balance} onChange={e => setCashbookForm({...cashbookForm, initial_balance: Number(e.target.value)})} />
                  </div>
                </div>
                
                {cashbookForm.type === 'Project' && (
                  <div className="space-y-2 relative" ref={cbProjRef}>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Link to Project</label>
                    <div className="relative group">
                       <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                       <input 
                         className="w-full h-14 pl-12 pr-6 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white" 
                         placeholder="Find active design..." 
                         value={cbProjectQuery} 
                         onFocus={() => setShowCbProjectDrop(true)}
                         onChange={e => { setCbProjectQuery(e.target.value); setShowCbProjectDrop(true); }}
                       />
                    </div>
                    {showCbProjectDrop && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-[28px] shadow-2xl z-[300] max-h-48 overflow-y-auto no-scrollbar py-2">
                        {projects.filter(p => p.name.toLowerCase().includes(cbProjectQuery.toLowerCase())).map(p => (
                          <div key={p.id} onClick={() => { setCashbookForm({...cashbookForm, project_id: p.id, name: `${p.name} Ledger`}); setCbProjectQuery(p.name); setShowCbProjectDrop(false); }} className="px-5 py-3 hover:bg-slate-50 cursor-pointer flex items-center gap-3"><Building2 className="w-4 h-4 text-slate-300" /><span className="text-xs font-bold">{p.name}</span></div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <button type="submit" disabled={isSaving} className="w-full py-7 bg-[#064e3b] text-white rounded-[28px] text-[11px] font-black uppercase tracking-[0.3em] hover:bg-black transition-all flex items-center justify-center gap-4 shadow-xl active:scale-95 disabled:opacity-50">
                  {isSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 text-emerald-400" />} AUTHORIZE LEDGER
                </button>
             </form>
          </div>
        </div>
      )}

      {/* RECORD ENTRY MODAL */}
      {showEntryModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[48px] p-8 md:p-14 max-w-2xl w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300 relative overflow-y-auto max-h-[90vh] no-scrollbar">
            <div className="flex justify-between items-start mb-10">
              <div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Record Entry</h3>
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.3em] mt-2">LEDGER RECONCILIATION</p>
              </div>
              <button onClick={() => setShowEntryModal(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-red-500 transition-all"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleAddEntry} className="space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</label>
                  <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-[20px]">
                    <button type="button" onClick={() => setEntryForm({...entryForm, type: 'Income'})} className={`py-3 rounded-[16px] text-[9px] font-black uppercase tracking-widest transition-all ${entryForm.type === 'Income' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400'}`}>Income (In)</button>
                    <button type="button" onClick={() => setEntryForm({...entryForm, type: 'Expense'})} className={`py-3 rounded-[16px] text-[9px] font-black uppercase tracking-widest transition-all ${entryForm.type === 'Expense' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-400'}`}>Expense (Out)</button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Ledger</label>
                  <select required className="w-full h-14 px-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm" value={entryForm.cashbook_id} onChange={e => setEntryForm({...entryForm, cashbook_id: e.target.value})}>
                    <option value="">Choose registry...</option>
                    {cashbooks.filter(c => !c.deleted_at).map(cb => <option key={cb.id} value={cb.id}>{cb.name} (Tk. {cb.balance.toLocaleString()})</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount (BDT)</label>
                  <input type="number" required className="w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 shadow-inner" value={entryForm.amount} onChange={e => setEntryForm({...entryForm, amount: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</label>
                  <input required className="w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700" placeholder="e.g. Design Fee, Materials..." value={entryForm.category} onChange={e => setEntryForm({...entryForm, category: e.target.value})} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Narrative Description</label>
                <input required className="w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700" placeholder="Transaction notes..." value={entryForm.description} onChange={e => setEntryForm({...entryForm, description: e.target.value})} />
              </div>

              <div className="space-y-2 relative" ref={dropdownRef}>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Link Project/Lead (Optional)</label>
                <div className="relative group">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input className="w-full h-14 pl-12 pr-6 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm text-slate-700" placeholder="Search portfolio..." value={entityQuery} onFocus={() => setShowEntityDrop(true)} onChange={e => { setEntityQuery(e.target.value); setShowEntityDrop(true); }} />
                </div>
                {showEntityDrop && (
                  <div className="absolute bottom-full mb-3 left-0 right-0 bg-white border border-slate-100 rounded-[32px] shadow-2xl z-[150] overflow-hidden max-h-64 overflow-y-auto no-scrollbar py-2 animate-in slide-in-from-bottom-2">
                    {projects.filter(p => p.name.toLowerCase().includes(entityQuery.toLowerCase())).map(p => (
                      <div key={p.id} onClick={() => { setEntryForm({...entryForm, project_id: p.id, lead_id: p.client_id}); setEntityQuery(`Project: ${p.name}`); setShowEntityDrop(false); }} className="p-4 hover:bg-emerald-50 cursor-pointer flex items-center gap-4"><Building2 className="w-4 h-4 text-emerald-500" /><div className="text-xs font-black">{p.name}</div></div>
                    ))}
                    {leads.filter(l => l.client_name.toLowerCase().includes(entityQuery.toLowerCase())).map(l => (
                      <div key={l.id} onClick={() => { setEntryForm({...entryForm, project_id: '', lead_id: l.id}); setEntityQuery(`Lead: ${l.client_name}`); setShowEntityDrop(false); }} className="p-4 hover:bg-blue-50 cursor-pointer flex items-center gap-4"><FileText className="w-4 h-4 text-blue-500" /><div className="text-xs font-black">{l.client_name}</div></div>
                    ))}
                  </div>
                )}
              </div>

              <button type="submit" disabled={isSaving} className="w-full py-7 bg-slate-900 text-white rounded-[28px] text-[11px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-4 shadow-xl active:scale-95">
                 {isSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5 text-emerald-400" />} COMMIT LEDGER ENTRY
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PAGE CONTENT */}
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 pt-8 md:pt-12 space-y-12">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="flex items-center gap-8 min-w-0">
            <button onClick={() => navigate('/')} className="w-14 h-14 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center justify-center hover:bg-slate-50 transition-all shrink-0">
              <ArrowLeft className="w-6 h-6 text-slate-500" />
            </button>
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Finance Command</h1>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em] mt-3 flex items-center gap-3">
                <Banknote className="w-4 h-4 text-amber-500" /> INTEGRATED FIRM FISCAL REPOSITORY
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
            <button 
              onClick={() => setShowCashbookModal(true)}
              className="flex-1 md:flex-none px-8 py-5 bg-white border border-slate-100 text-slate-900 rounded-[24px] text-[11px] font-black uppercase tracking-[0.2em] shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-3 active:scale-95"
            >
              <Plus className="w-5 h-5 text-emerald-600" /> New Ledger
            </button>
            <button 
              onClick={() => setShowEntryModal(true)}
              className="flex-1 md:flex-none px-8 py-5 bg-[#064e3b] text-white rounded-[24px] text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-emerald-900/10 hover:bg-black transition-all flex items-center justify-center gap-3 active:scale-95"
            >
              <LogIn className="w-5 h-5 text-emerald-400" /> Add Entry
            </button>
          </div>
        </header>

        {/* HERO STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             <div className="bg-white p-10 rounded-[56px] border border-slate-100 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full group-hover:bg-emerald-500/10 transition-colors" />
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-[28px] flex items-center justify-center mb-8 shadow-sm">
                  <TrendingUp className="w-8 h-8" />
                </div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Cash In</p>
                <h3 className="text-4xl font-black text-slate-900 mt-2 tracking-tighter">Tk. {totals.in.toLocaleString()}</h3>
                <div className="mt-8 flex items-center gap-3 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
                  <ArrowUpRight className="w-4 h-4 animate-bounce" /> REVENUE ACTIVE
                </div>
             </div>

             <div className="bg-white p-10 rounded-[56px] border border-slate-100 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 blur-3xl rounded-full group-hover:bg-rose-500/10 transition-colors" />
                <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-[28px] flex items-center justify-center mb-8 shadow-sm">
                  <DollarSign className="w-8 h-8" />
                </div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Cash Out</p>
                <h3 className="text-4xl font-black text-slate-900 mt-2 tracking-tighter">Tk. {totals.out.toLocaleString()}</h3>
                <div className="mt-8 flex items-center gap-3 text-rose-600 text-[10px] font-black uppercase tracking-widest">
                  <ArrowDownRight className="w-4 h-4" /> MONITORING COSTS
                </div>
             </div>

             <div className="bg-[#0f172a] p-10 rounded-[56px] border border-white/5 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full" />
                <div className="w-16 h-16 bg-white/5 border border-white/10 text-emerald-400 rounded-[28px] flex items-center justify-center mb-8 shadow-sm">
                  <Wallet className="w-8 h-8" />
                </div>
                <p className="text-[11px] font-black text-white/30 uppercase tracking-[0.2em]">Liquid Balance</p>
                <h3 className="text-4xl font-black text-white mt-2 tracking-tighter">Tk. {totals.balance.toLocaleString()}</h3>
                <div className="mt-8 flex items-center gap-3 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                  <Zap className="w-4 h-4 animate-pulse" /> VAULT SECURE
                </div>
             </div>
        </div>

        {/* LEDGER DIRECTORY */}
        <div className="space-y-8">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                   <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                     <BookOpen className="w-6 h-6 text-emerald-600" /> Ledgers Portfolio
                   </h2>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1 ml-9">ACTIVE FIRM FISCAL SECTORS</p>
                </div>
                <div className="flex p-1 bg-slate-100 rounded-2xl w-full md:w-auto">
                   <button 
                     onClick={() => setActiveTab('active')}
                     className={`flex-1 md:flex-none px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'active' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
                   >
                     Active ({cashbooks.filter(cb => !cb.deleted_at).length})
                   </button>
                   <button 
                     onClick={() => setActiveTab('archived')}
                     className={`flex-1 md:flex-none px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'archived' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-400'}`}
                   >
                     Archive ({cashbooks.filter(cb => !!cb.deleted_at).length})
                   </button>
                </div>
             </div>

             <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-6">
                <div className="relative group flex-1">
                   <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                   <input 
                     type="text" 
                     placeholder="Search ledgers by name..."
                     className="w-full h-16 pl-16 pr-6 bg-white border border-slate-100 rounded-[28px] text-[14px] font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all shadow-sm"
                     value={searchQuery}
                     onChange={e => setSearchQuery(e.target.value)}
                   />
                </div>
                <div className="flex items-center gap-2 bg-white/50 p-1.5 rounded-[24px] border border-slate-50 shadow-sm overflow-x-auto no-scrollbar">
                   {(['All', 'Project', 'Office Cost', 'Salary', 'Site Visit', 'Other'] as (CashbookType | 'All')[]).map(t => (
                     <button key={t} onClick={() => setTypeFilter(t)} className={`px-6 py-3.5 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all ${typeFilter === t ? 'bg-[#064e3b] text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}>{t}</button>
                   ))}
                </div>
             </div>

             <div className="bg-white rounded-[48px] border border-slate-100 shadow-xl overflow-hidden">
                <div className="overflow-x-auto no-scrollbar">
                   <table className="w-full text-left border-separate border-spacing-0">
                      <thead>
                         <tr className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-black tracking-[0.25em]">
                            <th className="px-10 py-7 border-b border-slate-100">Sector Name</th>
                            <th className="px-10 py-7 border-b border-slate-100 text-right">Inflow</th>
                            <th className="px-10 py-7 border-b border-slate-100 text-right">Outflow</th>
                            <th className="px-10 py-7 border-b border-slate-100 text-right">Net Liquidity</th>
                            <th className="px-10 py-7 border-b border-slate-100 text-right">Actions</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                         {displayedCashbooks.length === 0 ? (
                            <tr><td colSpan={5} className="py-24 text-center opacity-30 text-[11px] font-black uppercase tracking-widest">No matching ledgers found</td></tr>
                         ) : displayedCashbooks.map(cb => (
                            <tr key={cb.id} onClick={() => navigate(`/finance/${cb.id}`)} className="group hover:bg-slate-50/80 transition-colors cursor-pointer">
                               <td className="px-10 py-8">
                                  <div className="flex items-center gap-5">
                                     <div className={`w-12 h-12 rounded-[18px] flex items-center justify-center shadow-sm shrink-0 transition-transform group-hover:scale-110 ${cb.type === 'Project' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                                        {cb.type === 'Project' ? <Building2 className="w-6 h-6" /> : <Layers className="w-6 h-6" />}
                                     </div>
                                     <div>
                                        <p className="text-[15px] font-black text-slate-900 group-hover:text-emerald-700 transition-colors">{cb.name}</p>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{cb.type} Ledger</p>
                                     </div>
                                  </div>
                               </td>
                               <td className="px-10 py-8 text-right"><p className="text-[14px] font-black text-emerald-600">+ Tk. {cb.total_in.toLocaleString()}</p></td>
                               <td className="px-10 py-8 text-right"><p className="text-[14px] font-black text-rose-500">- Tk. {cb.total_out.toLocaleString()}</p></td>
                               <td className="px-10 py-8 text-right"><p className="text-[18px] font-black text-slate-900 tracking-tight">Tk. {cb.balance.toLocaleString()}</p></td>
                               <td className="px-10 py-8 text-right">
                                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                     {activeTab === 'active' ? (
                                        isAdmin && <button onClick={(e) => handleArchiveCashbook(e, cb.id)} className="p-3 bg-white border border-slate-100 text-slate-300 hover:text-amber-500 rounded-xl transition-all shadow-sm active:scale-90"><Archive className="w-5 h-5" /></button>
                                     ) : (
                                        isAdmin && <button onClick={(e) => handleRestoreCashbook(e, cb.id)} className="p-3 bg-white border border-slate-100 text-slate-300 hover:text-emerald-500 rounded-xl transition-all shadow-sm active:scale-90"><RotateCcw className="w-5 h-5" /></button>
                                     )}
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
    </div>
  );
};

export default Finance;
