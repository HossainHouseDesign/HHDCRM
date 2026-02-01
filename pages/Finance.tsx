import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Banknote, ArrowLeft, ShieldCheck, 
  TrendingUp, CreditCard, DollarSign, RefreshCw, 
  Wallet, PieChart, Activity, Zap, Layers, 
  Search, Plus, X, ArrowRight,
  CheckCircle2, ArrowUpRight, ArrowDownRight, Coins,
  LogIn, LogOut, History, Database, Wrench, BookOpen,
  ChevronDown, Building2, FileText, Save, Tag, Users2,
  Check, UserCircle, AlertCircle, Briefcase, ChevronRight,
  Archive, RotateCcw, Trash2, FolderKanban, ListFilter,
  ArrowRightLeft
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
  const [activeTab, setActiveTab] = useState<FinanceTab>('active');
  const [typeFilter, setTypeFilter] = useState<CashbookType | 'All'>('All');
  
  const [cashbooks, setCashbooks] = useState<Cashbook[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);

  const [showCashbookModal, setShowCashbookModal] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [cashbookForm, setCashbookForm] = useState({ 
    name: '', 
    initial_balance: 0,
    type: 'Project' as CashbookType,
    project_id: '',
    assigned_team: [] as string[]
  });
  
  const [entryForm, setEntryForm] = useState({
    cashbook_id: '',
    type: 'Income' as 'Income' | 'Expense',
    amount: 0,
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    project_id: '',
    lead_id: ''
  });

  const [entityQuery, setEntityQuery] = useState('');
  const [showEntityDrop, setShowEntityDrop] = useState(false);
  const [cbProjectQuery, setCbProjectQuery] = useState('');
  const [showCbProjectDrop, setShowCbProjectDrop] = useState(false);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const cbProjRef = useRef<HTMLDivElement>(null);
  const staffSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchFinancials();
    fetchContextData();
    
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setShowEntityDrop(false);
      if (cbProjRef.current && !cbProjRef.current.contains(event.target as Node)) setShowCbProjectDrop(false);
      if (staffSearchRef.current && !staffSearchRef.current.contains(event.target as Node)) setShowStaffDropdown(false);
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
      const { data: cbData } = await supabase.from('finance_cashbooks').select('*');
      const { data: transData } = await supabase.from('finance_transactions').select('*').order('date', { ascending: false });

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
      setTransactions(safeTrans);
    } catch (err) {
      showNotification("Fiscal registry access failed.", "error");
    } finally {
      setLoading(false);
    }
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
      setEntryForm({ cashbook_id: '', type: 'Income', amount: 0, category: '', description: '', date: new Date().toISOString().split('T')[0], project_id: '', lead_id: '' });
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
    if (activeTab === 'archived' && !isAdmin) return [];
    let filtered = activeTab === 'active' ? cashbooks.filter(cb => !cb.deleted_at) : cashbooks.filter(cb => !!cb.deleted_at);
    if (typeFilter !== 'All') filtered = filtered.filter(cb => cb.type === typeFilter);
    return filtered;
  }, [cashbooks, activeTab, isAdmin, typeFilter]);

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-32 animate-in fade-in duration-700">
      
      {/* MODALS */}
      {showCashbookModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] p-8 md:p-12 max-w-xl w-full shadow-2xl animate-in zoom-in-95">
             <div className="flex justify-between items-start mb-8">
                <h3 className="text-2xl font-black text-slate-900">New Cashbook</h3>
                <button onClick={() => setShowCashbookModal(false)} className="p-2 text-slate-300 hover:text-red-500"><X className="w-6 h-6" /></button>
             </div>
             <form onSubmit={handleAddCashbook} className="space-y-6">
                <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ledger Name</label>
                   <input required className="w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white transition-all shadow-inner" value={cashbookForm.name} onChange={e => setCashbookForm({...cashbookForm, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type</label>
                    <select className="w-full h-14 px-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold" value={cashbookForm.type} onChange={e => setCashbookForm({...cashbookForm, type: e.target.value as CashbookType})}>
                      <option value="Project">Project</option>
                      <option value="Office Cost">Office Cost</option>
                      <option value="Salary">Salary</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Opening Bal</label>
                    <input type="number" className="w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl font-bold" value={cashbookForm.initial_balance} onChange={e => setCashbookForm({...cashbookForm, initial_balance: Number(e.target.value)})} />
                  </div>
                </div>
                <button type="submit" disabled={isSaving} className="w-full py-6 bg-[#064e3b] text-white rounded-[24px] font-black uppercase tracking-widest shadow-xl">Commit Ledger</button>
             </form>
          </div>
        </div>
      )}

      {showEntryModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] p-8 md:p-12 max-w-xl w-full shadow-2xl animate-in zoom-in-95">
             <div className="flex justify-between items-start mb-8">
                <h3 className="text-2xl font-black text-slate-900">Record Entry</h3>
                <button onClick={() => setShowEntryModal(false)} className="p-2 text-slate-300 hover:text-red-500"><X className="w-6 h-6" /></button>
             </div>
             <form onSubmit={handleAddEntry} className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Cashbook</label>
                  <select required className="w-full h-14 px-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold" value={entryForm.cashbook_id} onChange={e => setEntryForm({...entryForm, cashbook_id: e.target.value})}>
                    <option value="">Choose Registry...</option>
                    {cashbooks.filter(c => !c.deleted_at).map(cb => <option key={cb.id} value={cb.id}>{cb.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type</label>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                      <button type="button" onClick={() => setEntryForm({...entryForm, type: 'Income'})} className={`py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${entryForm.type === 'Income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Income</button>
                      <button type="button" onClick={() => setEntryForm({...entryForm, type: 'Expense'})} className={`py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${entryForm.type === 'Expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}>Expense</button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount</label>
                    <input type="number" required className="w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl font-bold" value={entryForm.amount} onChange={e => setEntryForm({...entryForm, amount: Number(e.target.value)})} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                  <input required className="w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl font-bold" placeholder="e.g. Project A - Installment 1" value={entryForm.description} onChange={e => setEntryForm({...entryForm, description: e.target.value})} />
                </div>
                <button type="submit" disabled={isSaving} className="w-full py-6 bg-slate-900 text-white rounded-[24px] font-black uppercase tracking-widest shadow-xl">Commit Transaction</button>
             </form>
          </div>
        </div>
      )}

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 pt-8 md:pt-12 space-y-10 md:space-y-12">
        {/* MINIMAL HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-5 md:gap-8 min-w-0">
            <button onClick={() => navigate('/')} className="w-12 h-12 md:w-14 md:h-14 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center justify-center hover:bg-slate-50 shrink-0">
              <ArrowLeft className="w-5 h-5 md:w-6 md:h-6 text-slate-500" />
            </button>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-none">Finance Command</h1>
              <p className="text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
                <Banknote className="w-3.5 h-3.5 text-amber-500" /> FISCAL MANAGEMENT
              </p>
            </div>
          </div>
        </header>

        {/* PRIMARY ACTIONS */}
        <div className="flex items-center gap-3 w-full">
            <button onClick={() => setShowCashbookModal(true)} className="flex-1 px-4 py-5 bg-white border border-slate-100 text-slate-900 rounded-[24px] text-[10px] md:text-[11px] font-black uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2 md:gap-3 active:scale-95">
              <Plus className="w-4 h-4 text-emerald-600" /> Add Ledger
            </button>
            <button onClick={() => setShowEntryModal(true)} className="flex-1 px-4 py-5 bg-[#064e3b] text-white rounded-[24px] text-[10px] md:text-[11px] font-black uppercase tracking-widest shadow-2xl shadow-emerald-900/10 hover:bg-black transition-all flex items-center justify-center gap-2 md:gap-3 active:scale-95">
              <LogIn className="w-4 h-4 text-emerald-400" /> Add Entry
            </button>
        </div>

        {/* HERO STATS - COMPACT HORIZONTAL ON MOBILE */}
        <div className="grid grid-cols-3 gap-3 md:gap-8">
             <div className="bg-white p-4 md:p-10 rounded-[32px] md:rounded-[44px] border border-slate-100 shadow-sm relative overflow-hidden flex flex-col items-center text-center">
                <div className="w-8 h-8 md:w-12 md:h-12 bg-emerald-50 text-emerald-600 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-10">
                   <TrendingUp className="w-4 h-4 md:w-6 md:h-6" />
                </div>
                <p className="text-[7px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Inflow</p>
                <h3 className="text-[12px] md:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">Tk. {totals.in.toLocaleString()}</h3>
             </div>

             <div className="bg-white p-4 md:p-10 rounded-[32px] md:rounded-[44px] border border-slate-100 shadow-sm relative overflow-hidden flex flex-col items-center text-center">
                <div className="w-8 h-8 md:w-12 md:h-12 bg-rose-50 text-rose-600 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-10">
                   <DollarSign className="w-4 h-4 md:w-6 md:h-6" />
                </div>
                <p className="text-[7px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Outflow</p>
                <h3 className="text-[12px] md:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">Tk. {totals.out.toLocaleString()}</h3>
             </div>

             <div className="bg-[#0f172a] p-4 md:p-10 rounded-[32px] md:rounded-[44px] border border-white/5 shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
                <div className="w-8 h-8 md:w-12 md:h-12 bg-white/10 text-emerald-400 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-10">
                   <Wallet className="w-4 h-4 md:w-6 md:h-6" />
                </div>
                <p className="text-[7px] md:text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Balance</p>
                <h3 className="text-[12px] md:text-3xl lg:text-4xl font-black text-white tracking-tight">Tk. {totals.balance.toLocaleString()}</h3>
             </div>
        </div>

        {/* CASHBOOK DIRECTORY SECTION */}
        <div className="space-y-6 md:space-y-8 animate-in slide-in-from-bottom-4">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                   <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                     <BookOpen className="w-6 h-6 text-emerald-600" /> Ledgers Directory
                   </h2>
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 ml-9">FIRM FISCAL SECTORS</p>
                </div>
                <div className="flex p-1 bg-slate-100 rounded-2xl w-full md:w-auto">
                   <button onClick={() => setActiveTab('active')} className={`flex-1 px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'active' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Active ({cashbooks.filter(cb => !cb.deleted_at).length})</button>
                   {isAdmin && <button onClick={() => setActiveTab('archived')} className={`flex-1 px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'archived' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-400'}`}>Archived ({cashbooks.filter(cb => !!cb.deleted_at).length})</button>}
                </div>
             </div>

             <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                {(['All', 'Project', 'Office Cost', 'Salary', 'Site Visit', 'Other'] as (CashbookType | 'All')[]).map((type) => (
                  <button key={type} onClick={() => setTypeFilter(type)} className={`whitespace-nowrap px-6 py-3 rounded-[18px] text-[9px] font-black uppercase tracking-widest transition-all border ${typeFilter === type ? 'bg-slate-900 text-white border-transparent shadow-md' : 'bg-white text-slate-400 border-slate-100 hover:border-emerald-200'}`}>{type}</button>
                ))}
             </div>

             {/* MINIMAL MOBILE LEDGER CARDS (ICON, NAME, CATEGORY ONLY) */}
             <div className="grid grid-cols-1 gap-3 lg:hidden">
                {displayedCashbooks.length === 0 ? (
                  <div className="py-24 text-center bg-white rounded-[40px] border border-slate-100 shadow-sm">
                     <FolderKanban className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                     <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No matching ledgers</p>
                  </div>
                ) : displayedCashbooks.map(cb => (
                  <div key={cb.id} onClick={() => navigate(`/finance/${cb.id}`)} className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm active:scale-[0.98] transition-all flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cb.type === 'Project' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                         {cb.type === 'Project' ? <Building2 className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
                      </div>
                      <div>
                        <h3 className="text-[14px] font-black text-slate-900 leading-tight">{cb.name}</h3>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{cb.type} Ledger</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       {activeTab === 'active' ? (isAdmin && <button onClick={(e) => handleArchiveCashbook(e, cb.id)} className="p-2 text-slate-300 hover:text-red-500"><Archive className="w-4 h-4" /></button>) : (isAdmin && <button onClick={(e) => handleRestoreCashbook(e, cb.id)} className="p-2 text-slate-300 hover:text-emerald-500"><RotateCcw className="w-4 h-4" /></button>)}
                       <ChevronRight className="w-4 h-4 text-slate-200" />
                    </div>
                  </div>
                ))}
             </div>

             {/* DESKTOP TABLE */}
             <div className="hidden lg:block bg-white rounded-[48px] border border-slate-100 shadow-xl overflow-hidden">
                <div className="overflow-x-auto no-scrollbar">
                   <table className="w-full text-left border-separate border-spacing-0">
                      <thead>
                         <tr className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-black tracking-[0.25em]">
                            <th className="px-10 py-7 border-b border-slate-100">Ledger Name & Type</th>
                            <th className="px-10 py-7 border-b border-slate-100 text-right">Total Inflow</th>
                            <th className="px-10 py-7 border-b border-slate-100 text-right">Total Outflow</th>
                            <th className="px-10 py-7 border-b border-slate-100 text-right">Liquid Balance</th>
                            <th className="px-10 py-7 border-b border-slate-100 text-right">Actions</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                         {displayedCashbooks.map(cb => (
                            <tr key={cb.id} onClick={() => navigate(`/finance/${cb.id}`)} className="group hover:bg-slate-50/80 transition-colors cursor-pointer">
                               <td className="px-10 py-8"><div className="flex items-center gap-5"><div className={`w-12 h-12 rounded-[18px] flex items-center justify-center shadow-sm shrink-0 transition-transform group-hover:scale-110 ${cb.type === 'Project' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>{cb.type === 'Project' ? <Building2 className="w-6 h-6" /> : <Layers className="w-6 h-6" />}</div><div><p className="text-[15px] font-black text-slate-900 group-hover:text-emerald-700 transition-colors">{cb.name}</p><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{cb.type} Ledger</p></div></div></td>
                               <td className="px-10 py-8 text-right"><p className="text-[14px] font-black text-emerald-600">+ Tk. {cb.total_in.toLocaleString()}</p></td>
                               <td className="px-10 py-8 text-right"><p className="text-[14px] font-black text-rose-500">- Tk. {cb.total_out.toLocaleString()}</p></td>
                               <td className="px-10 py-8 text-right"><p className="text-[18px] font-black text-slate-900 tracking-tight">Tk. {cb.balance.toLocaleString()}</p></td>
                               <td className="px-10 py-8 text-right"><div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">{activeTab === 'active' ? (isAdmin && <button onClick={(e) => handleArchiveCashbook(e, cb.id)} className="p-3 bg-white border border-slate-100 text-slate-300 hover:text-amber-500 rounded-xl transition-all shadow-sm active:scale-90"><Archive className="w-5 h-5" /></button>) : (isAdmin && <button onClick={(e) => handleRestoreCashbook(e, cb.id)} className="p-3 bg-white border border-slate-100 text-slate-300 hover:text-emerald-500 rounded-xl transition-all shadow-sm active:scale-90"><RotateCcw className="w-5 h-5" /></button>)}</div></td>
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