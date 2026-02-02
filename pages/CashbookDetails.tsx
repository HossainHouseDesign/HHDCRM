
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Banknote, Edit3, Trash2, RefreshCw, X, Save, 
  ChevronDown, Building2, TrendingUp, DollarSign, Wallet,
  Users2, Search, ArrowRightLeft, Tag, Plus, 
  Coins, ShieldCheck, User, AlertTriangle, Archive,
  CheckCircle2, Clock,
  LogIn, Shield
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useNotification, useUser } from '../App';
import { Project, Profile } from '../types';

type CashbookType = 'Project' | 'Office Cost' | 'Salary' | 'Site Visit' | 'Other';

interface Cashbook {
  id: string;
  name: string;
  type: CashbookType;
  initial_balance: number;
  project_id?: string;
  deleted_at?: string | null;
  assigned_team?: Record<string, ActionPermissions>;
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
  creator?: {
    full_name: string;
  };
}

interface ActionPermissions {
  can_input: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_archive: boolean;
}

const CashbookDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { profile, isAdmin } = useUser();
  
  const [cashbook, setCashbook] = useState<Cashbook | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [isProcessingTransaction, setIsProcessingTransaction] = useState(false);

  const [entryForm, setEntryForm] = useState({
    type: 'Income' as 'Income' | 'Expense',
    amount: 0,
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [editTxForm, setEditTxForm] = useState({
    type: 'Income' as 'Income' | 'Expense',
    amount: 0,
    description: '',
    date: ''
  });

  const [editForm, setEditForm] = useState({
    name: '',
    type: 'Project' as CashbookType,
    initial_balance: 0,
    project_id: '',
    assigned_team: {} as Record<string, ActionPermissions>
  });

  const [cbProjectQuery, setCbProjectQuery] = useState('');
  const [showCbProjectDrop, setShowCbProjectDrop] = useState(false);
  
  const cbProjRef = useRef<HTMLDivElement>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
    const handleClickOutside = (event: MouseEvent) => {
      if (cbProjRef.current && !cbProjRef.current.contains(event.target as Node)) setShowCbProjectDrop(false);
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) setShowStatusDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cbRes, transRes, projRes, staffRes, permRes] = await Promise.all([
        supabase.from('finance_cashbooks').select('*').eq('id', id).single(),
        supabase.from('finance_transactions').select('*, creator:profiles(full_name)').eq('cashbook_id', id).order('date', { ascending: false }),
        supabase.from('projects').select('*, client:leads(*)').is('deleted_at', null),
        supabase.from('profiles').select('*').is('deleted_at', null).eq('status', 'active'),
        supabase.from('finance_cashbook_permissions').select('*').eq('cashbook_id', id)
      ]);

      if (cbRes.error) throw cbRes.error;
      
      const cb = cbRes.data;
      const assigned: Record<string, ActionPermissions> = {};
      permRes.data?.forEach(p => {
        assigned[p.profile_id] = {
          can_input: p.can_input,
          can_edit: p.can_edit,
          can_delete: p.can_delete,
          can_archive: p.can_archive
        };
      });
      
      setCashbook({ ...cb, type: (cb.description || 'Other') as CashbookType, assigned_team: assigned });
      setTransactions(transRes.data || []);
      setProjects(projRes.data || []);
      setStaff(staffRes.data || []);

      setEditForm({ name: cb.name, type: (cb.description || 'Other') as CashbookType, initial_balance: Number(cb.initial_balance) || 0, project_id: cb.project_id || '', assigned_team: assigned });
      const linkedProj = projRes.data?.find(p => p.id === cb.project_id);
      if (linkedProj) setCbProjectQuery(linkedProj.name);

    } catch (err: any) { showNotification("Failed to load records.", "error"); navigate('/finance'); } finally { setLoading(false); }
  };

  const totals = useMemo(() => {
    const income = transactions.filter(t => t.type === 'Income').reduce((acc, t) => acc + Number(t.amount), 0);
    const expense = transactions.filter(t => t.type === 'Expense').reduce((acc, t) => acc + Number(t.amount), 0);
    const balance = (cashbook?.initial_balance || 0) + income - expense;
    return { income, expense, balance };
  }, [transactions, cashbook]);

  const handleStatusUpdate = async (archived: boolean) => {
    if (!cashbook || !isAdmin) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from('finance_cashbooks').update({ deleted_at: archived ? new Date().toISOString() : null }).eq('id', cashbook.id);
      if (error) throw error;
      setCashbook({ ...cashbook, deleted_at: archived ? new Date().toISOString() : null });
      showNotification(`Cashbook status saved.`, "success");
      setShowStatusDropdown(false);
    } catch (err: any) { showNotification(err.message, "error"); } finally { setIsSaving(false); }
  };

  const toggleStatusDropdown = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDropdownPos({ top: rect.bottom + 8, left: rect.left });
    setShowStatusDropdown(!showStatusDropdown);
  };

  const handlePermanentDelete = async () => {
    if (!isAdmin || !cashbook) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('finance_cashbooks').delete().eq('id', cashbook.id);
      if (error) throw error;
      showNotification("Cashbook purged.", "info");
      navigate('/finance');
    } catch (err: any) { showNotification(err.message, "error"); } finally { setIsDeleting(false); }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || entryForm.amount <= 0) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from('finance_transactions').insert([{
        cashbook_id: id,
        type: entryForm.type,
        amount: entryForm.amount,
        category: 'General', 
        description: entryForm.description,
        date: entryForm.date,
        created_by: profile?.id,
        office_id: profile?.office_id
      }]);
      if (error) throw error;
      showNotification("Entry saved.", "success");
      setShowEntryModal(false);
      setEntryForm({ type: 'Income', amount: 0, description: '', date: new Date().toISOString().split('T')[0] });
      fetchData();
    } catch (err: any) { showNotification(err.message, "error"); } finally { setIsSaving(false); }
  };

  const handleEditTransaction = (t: Transaction) => {
    setEditingTransaction(t);
    setEditTxForm({ type: t.type, amount: t.amount, description: t.description, date: t.date });
  };

  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;
    setIsProcessingTransaction(true);
    try {
      const { error } = await supabase.from('finance_transactions').update({
        type: editTxForm.type, amount: editTxForm.amount, description: editTxForm.description, date: editTxForm.date
      }).eq('id', editingTransaction.id);
      if (error) throw error;
      showNotification("Record saved.", "success");
      setEditingTransaction(null);
      fetchData();
    } catch (err: any) { showNotification(err.message, "error"); } finally { setIsProcessingTransaction(false); }
  };

  const handleDeleteTransaction = async () => {
    if (!transactionToDelete) return;
    setIsProcessingTransaction(true);
    try {
      const { error } = await supabase.from('finance_transactions').delete().eq('id', transactionToDelete);
      if (error) throw error;
      showNotification("Entry erased.", "info");
      setTransactionToDelete(null);
      fetchData();
    } catch (err: any) { showNotification(err.message, "error"); } finally { setIsProcessingTransaction(false); }
  };

  const handleUpdateCashbook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashbook) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from('finance_cashbooks').update({
        name: editForm.name,
        initial_balance: editForm.initial_balance,
        description: editForm.type,
        project_id: editForm.type === 'Project' ? editForm.project_id : null
      }).eq('id', cashbook.id);

      if (error) throw error;

      await supabase.from('finance_cashbook_permissions').delete().eq('cashbook_id', cashbook.id);
      const teamIds = Object.keys(editForm.assigned_team);
      if (teamIds.length > 0) {
        const assignments = teamIds.map(pid => ({ 
          cashbook_id: cashbook.id, 
          profile_id: pid,
          ...editForm.assigned_team[pid]
        }));
        await supabase.from('finance_cashbook_permissions').insert(assignments);
      }

      showNotification("Cashbook details updated.", "success");
      setShowEditModal(false);
      fetchData();
    } catch (err: any) { showNotification(err.message, "error"); } finally { setIsSaving(false); }
  };

  const toggleStaffAssignment = (staffId: string) => {
    setEditForm(prev => {
      const next = { ...prev.assigned_team };
      if (next[staffId]) {
        delete next[staffId];
      } else {
        next[staffId] = { can_input: true, can_edit: true, can_delete: true, can_archive: true };
      }
      return { ...prev, assigned_team: next };
    });
  };

  const togglePermission = (staffId: string, permission: keyof ActionPermissions) => {
    setEditForm(prev => {
      const staffPerms = prev.assigned_team[staffId];
      if (!staffPerms) return prev;
      return {
        ...prev,
        assigned_team: {
          ...prev.assigned_team,
          [staffId]: { ...staffPerms, [permission]: !staffPerms[permission] }
        }
      };
    });
  };

  if (loading || !cashbook) return <div className="h-[80vh] flex flex-col items-center justify-center gap-6"><RefreshCw className="w-12 h-12 text-[#064e3b] animate-spin" /><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Cashbook...</p></div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-48 animate-in fade-in duration-700 relative">
      <button onClick={() => setShowEntryModal(true)} className="fixed bottom-8 right-8 z-[100] w-16 h-16 bg-[#064e3b] text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-black hover:scale-110 transition-all active:scale-95 group shadow-emerald-900/20"><Plus className="w-8 h-8 transition-transform group-hover:rotate-90" /></button>

      {/* TRANSACTION DELETE MODAL */}
      {transactionToDelete && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] p-10 max-md w-full shadow-2xl text-center">
            <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-[28px] flex items-center justify-center mb-8 mx-auto"><Trash2 className="w-10 h-10" /></div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Erase Entry?</h3>
            <p className="text-slate-500 mb-10 text-sm">This action will permanently erase the transaction from the cashbook. Are you sure?</p>
            <div className="flex gap-4">
              <button onClick={() => setTransactionToDelete(null)} className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest">Cancel</button>
              <button onClick={handleDeleteTransaction} disabled={isProcessingTransaction} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2">
                {isProcessingTransaction ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Confirm Erasure"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRANSACTION EDIT MODAL */}
      {editingTransaction && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white rounded-[40px] p-10 max-w-lg w-full shadow-2xl">
              <div className="flex justify-between items-start mb-10">
                 <h3 className="text-2xl font-black text-slate-900">Update Entry</h3>
                 <button onClick={() => setEditingTransaction(null)} className="p-2 text-slate-300 hover:text-red-500"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleUpdateTransaction} className="space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Type</label>
                       <select className="w-full h-14 px-4 bg-slate-50 rounded-2xl font-bold" value={editTxForm.type} onChange={e => setEditTxForm({...editTxForm, type: e.target.value as any})}>
                          <option value="Income">Inflow</option>
                          <option value="Expense">Outflow</option>
                       </select>
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount</label>
                       <input type="number" required className="w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700" value={editTxForm.amount} onChange={e => setEditTxForm({...editTxForm, amount: Number(e.target.value)})} />
                    </div>
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Logged Date</label>
                    <input type="date" required className="w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700" value={editTxForm.date} onChange={e => setEditTxForm({...editTxForm, date: e.target.value})} />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Details</label>
                    <input required className="w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700" value={editTxForm.description} onChange={e => setEditTxForm({...editTxForm, description: e.target.value})} />
                 </div>
                 <button type="submit" disabled={isProcessingTransaction} className="w-full py-6 bg-slate-900 text-white rounded-[24px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3">
                   {isProcessingTransaction ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Save Changes
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* CASHBOOK EDIT MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white rounded-[48px] p-10 md:p-14 max-w-3xl w-full shadow-2xl relative overflow-y-auto max-h-[95vh] no-scrollbar">
              <div className="flex justify-between items-start mb-12">
                 <div>
                    <h3 className="text-3xl font-black text-slate-900">Cashbook Details</h3>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-2">TECHNICAL CASHBOOK UPDATE</p>
                 </div>
                 <button onClick={() => setShowEditModal(false)} className="p-3 bg-slate-50 rounded-2xl"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleUpdateCashbook} className="space-y-10">
                 <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Name</label>
                    <input required className="w-full h-16 px-8 bg-slate-50 border border-slate-100 rounded-[24px] font-bold text-slate-700" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                 </div>
                 <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-3">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Cashbook Type</label>
                       <select className="w-full h-16 px-6 bg-slate-50 border border-slate-100 rounded-[24px] font-bold" value={editForm.type} onChange={e => setEditForm({...editForm, type: e.target.value as any})}>
                          <option value="Project">Project</option>
                          <option value="Office Cost">Office Cost</option>
                          <option value="Salary">Salary</option>
                          <option value="Other">Other</option>
                       </select>
                    </div>
                    <div className="space-y-3">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Opening Inject</label>
                       <input type="number" className="w-full h-16 px-8 bg-slate-50 border border-slate-100 rounded-[24px] font-bold" value={editForm.initial_balance} onChange={e => setEditForm({...editForm, initial_balance: Number(e.target.value)})} />
                    </div>
                 </div>

                 <div className="space-y-6">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                       <Users2 className="w-4 h-4" /> Team Access & Permissions ({Object.keys(editForm.assigned_team).length})
                    </label>
                    <div className="grid grid-cols-1 gap-3 p-4 bg-slate-50 rounded-[32px] border border-slate-100 max-h-64 overflow-y-auto no-scrollbar shadow-inner">
                       {staff.map(s => {
                          const active = !!editForm.assigned_team[s.id];
                          const perms = editForm.assigned_team[s.id];
                          return (
                             <div 
                               key={s.id} 
                               className={`flex flex-col md:flex-row items-stretch md:items-center gap-4 p-4 rounded-3xl border transition-all ${active ? 'bg-white border-emerald-500 shadow-xl' : 'bg-slate-50/50 border-slate-200 opacity-60'}`}
                             >
                                <button 
                                  type="button" 
                                  onClick={() => toggleStaffAssignment(s.id)}
                                  className="flex items-center gap-3 flex-1 text-left"
                                >
                                   <div className="relative">
                                      <img src={s.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.email}`} className="w-10 h-10 rounded-xl object-cover border border-slate-100" alt="Staff" />
                                      {active && <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center text-white"><CheckCircle2 className="w-3 h-3" /></div>}
                                   </div>
                                   <div className="min-w-0">
                                      <p className="text-[12px] font-black truncate leading-tight">{s.full_name}</p>
                                      <p className={`text-[8px] font-bold uppercase mt-1 text-slate-400`}>{s.designation || 'Staff'}</p>
                                   </div>
                                </button>

                                {active && (
                                  <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100 animate-in slide-in-from-right-2 duration-300">
                                     {[
                                       { key: 'can_input', label: 'Input' },
                                       { key: 'can_edit', label: 'Edit' },
                                       { key: 'can_delete', label: 'Delete' },
                                       { key: 'can_archive', label: 'Archive' }
                                     ].map(p => (
                                       <button
                                         key={p.key}
                                         type="button"
                                         onClick={() => togglePermission(s.id, p.key as keyof ActionPermissions)}
                                         className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all border ${perms?.[p.key as keyof ActionPermissions] ? 'bg-[#064e3b] text-white border-transparent' : 'bg-white text-slate-300 border-slate-100'}`}
                                       >
                                         {p.label}
                                       </button>
                                     ))}
                                  </div>
                                )}
                             </div>
                          );
                       })}
                    </div>
                 </div>

                 <button type="submit" disabled={isSaving} className="w-full py-8 bg-[#064e3b] text-white rounded-[32px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-4">
                    {isSaving ? <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" /> : <Save className="w-6 h-6 text-emerald-400" />} Save Changes
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* CASHBOOK DELETE MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white rounded-[40px] p-12 max-w-lg w-full shadow-2xl text-center">
              <div className="w-24 h-24 bg-red-50 text-red-600 rounded-[32px] flex items-center justify-center mb-10 mx-auto"><Trash2 className="w-12 h-12" /></div>
              <h3 className="text-3xl font-black text-slate-900 mb-4">Purge Cashbook?</h3>
              <p className="text-slate-500 mb-10">You are about to permanently erase <strong>"{cashbook.name}"</strong> and all related history. This action is irreversible.</p>
              <div className="flex gap-4">
                 <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-2xl text-[11px] font-black uppercase">Cancel</button>
                 <button onClick={handlePermanentDelete} disabled={isDeleting} className="flex-1 py-5 bg-red-600 text-white rounded-2xl text-[11px] font-black uppercase shadow-xl flex items-center justify-center gap-2">
                    {isDeleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Purge Record
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* ADD ENTRY MODAL */}
      {showEntryModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] p-8 md:p-12 max-w-xl w-full shadow-2xl animate-in zoom-in-95">
             <div className="flex justify-between items-start mb-8">
                <div>
                   <h3 className="text-2xl font-black text-slate-900">Add Record</h3>
                   <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">LOGGING TO {cashbook.name.toUpperCase()}</p>
                </div>
                <button onClick={() => setShowEntryModal(false)} className="p-2 text-slate-300 hover:text-red-500"><X className="w-6 h-6" /></button>
             </div>
             <form onSubmit={handleAddEntry} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type</label>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                      <button type="button" onClick={() => setEntryForm({...entryForm, type: 'Income'})} className={`py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${entryForm.type === 'Income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Inflow</button>
                      <button type="button" onClick={() => setEntryForm({...entryForm, type: 'Expense'})} className={`py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${entryForm.type === 'Expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}>Outflow</button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount</label>
                    <input type="number" required className="w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl font-bold" value={entryForm.amount} onChange={e => setEntryForm({...entryForm, amount: Number(e.target.value)})} />
                  </div>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                    <input type="date" required className="w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl font-bold" value={entryForm.date} onChange={e => setEntryForm({...entryForm, date: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Details</label>
                  <input required className="w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl font-bold" placeholder="e.g. Project Installment, Material Purchase..." value={entryForm.description} onChange={e => setEntryForm({...entryForm, description: e.target.value})} />
                </div>
                <button type="submit" disabled={isSaving} className="w-full py-6 bg-[#064e3b] text-white rounded-[24px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3">
                   {isSaving ? <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" /> : <LogIn className="w-5 h-5" />} Save Entry
                </button>
             </form>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="bg-[#0f172a] pt-16 md:pt-20 pb-40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-emerald-500/10 blur-[150px] rounded-full pointer-events-none" />
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 relative z-10">
          <div className="flex justify-between items-center mb-8 md:mb-12">
            <button onClick={() => navigate('/finance')} className="flex items-center gap-3 text-white/40 hover:text-white transition-colors text-[10px] md:text-[11px] font-black uppercase tracking-widest group"><ArrowLeft className="w-4 h-4 md:w-5 md:h-5 group-hover:-translate-x-1 transition-transform" /> Back to Center</button>
            {isAdmin && (
              <div className="flex items-center gap-2 md:gap-3">
                <button onClick={() => setShowEditModal(true)} className="px-4 md:px-6 py-3 md:py-4 bg-white/5 border border-white/10 text-white rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 md:gap-3 hover:bg-white/10 transition-all"><Edit3 className="w-3.5 h-3.5 text-emerald-400" /> Update</button>
                <button onClick={() => setShowDeleteModal(true)} className="p-3 md:p-4 bg-white/5 border border-white/10 text-rose-400 rounded-xl md:rounded-2xl hover:bg-rose-500 hover:text-white transition-all"><Trash2 className="w-4 h-4 md:w-5 md:h-5" /></button>
              </div>
            )}
          </div>

          <div className="flex flex-col lg:flex-row justify-between items-start md:items-end gap-10">
             <div className="space-y-4 md:space-y-6">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 md:w-16 md:h-16 bg-white/5 border border-white/10 rounded-[18px] md:rounded-[24px] flex items-center justify-center text-emerald-400 shadow-2xl backdrop-blur-md"><Banknote className="w-6 h-6 md:w-8 md:h-8" /></div>
                   <div className="relative" ref={statusMenuRef}>
                     <button onClick={(e) => isAdmin && toggleStatusDropdown(e)} className={`px-5 py-1.5 md:py-2 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] border transition-all flex items-center gap-2 ${cashbook.deleted_at ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                       {cashbook.deleted_at ? <Clock className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                       {cashbook.deleted_at ? 'Archived' : 'Active'}
                       {isAdmin && <ChevronDown className="w-3.5 h-3.5 opacity-40" />}
                     </button>
                   </div>
                </div>
                <div>
                   <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">{cashbook.name}</h1>
                   <p className="text-white/40 text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] mt-3 md:mt-4 flex items-center gap-3"><Tag className="w-4 h-4 text-emerald-500" /> {cashbook.type} Cashbook</p>
                </div>
             </div>
             <div className="bg-white/5 border border-white/10 p-6 md:p-10 rounded-[32px] md:rounded-[56px] backdrop-blur-xl flex items-center gap-8 md:gap-12 shadow-3xl w-full md:w-auto">
                <div className="flex-1 md:text-right space-y-1">
                   <p className="text-[9px] md:text-[10px] font-black text-white/40 uppercase tracking-widest">Available Balance</p>
                   <p className="text-3xl md:text-4xl font-black text-white tracking-tighter">Tk. {totals.balance.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 md:w-16 md:h-16 bg-emerald-500 text-white rounded-[18px] md:rounded-[28px] flex items-center justify-center shadow-2xl shrink-0"><Wallet className="w-6 h-6 md:w-8 md:h-8" /></div>
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-6 md:px-12 -mt-20 relative z-20 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {[
             { label: 'Opening Balance', val: cashbook.initial_balance, icon: Coins, color: 'text-slate-400', bg: 'bg-slate-50' },
             { label: 'Total Inflow', val: totals.income, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', symbol: '+' },
             { label: 'Total Outflow', val: totals.expense, icon: DollarSign, color: 'text-rose-600', bg: 'bg-rose-50', symbol: '-' }
           ].map((s, i) => (
             <div key={i} className="bg-white p-6 md:p-10 rounded-[32px] md:rounded-[56px] border border-slate-100 shadow-xl relative overflow-hidden group">
                <div className={`w-12 h-12 ${s.bg} ${s.color} rounded-2xl flex items-center justify-center mb-6 md:mb-8`}><s.icon className="w-6 h-6" /></div>
                <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                <h3 className={`text-2xl md:text-3xl font-black mt-2 ${s.symbol === '+' ? 'text-emerald-600' : s.symbol === '-' ? 'text-rose-600' : 'text-slate-900'}`}>{s.symbol && `${s.symbol} `}Tk. {s.val.toLocaleString()}</h3>
             </div>
           ))}
        </div>

        <div className="bg-white rounded-[40px] md:rounded-[64px] border border-slate-100 shadow-xl overflow-hidden">
           <div className="px-8 md:px-12 py-8 md:py-10 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
              <div>
                 <h4 className="text-[11px] md:text-[13px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-3"><ArrowRightLeft className="w-4 h-4 md:w-5 md:h-5 text-emerald-500" /> Transaction Logs</h4>
              </div>
              <span className="px-4 py-1.5 bg-white border border-slate-100 rounded-full text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest shadow-sm">{transactions.length} Records Found</span>
           </div>

           <div className="lg:hidden divide-y divide-slate-50">
             {transactions.length === 0 ? (
               <div className="py-20 text-center"><p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No entries recorded</p></div>
             ) : transactions.map(t => (
               <div key={t.id} className="p-6 space-y-4 hover:bg-slate-50 transition-colors">
                 <div className="flex justify-between items-start">
                   <div className="flex items-center gap-3">
                     <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 shadow-inner"><User className="w-3.5 h-3.5" /></div>
                     <span className="text-[11px] font-black text-slate-600">{t.creator?.full_name || 'Staff'}</span>
                   </div>
                   <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">{new Date(t.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                 </div>
                 <div>
                   <h5 className="text-sm font-black text-slate-900 leading-tight">{t.description || 'General Log'}</h5>
                   <div className={`text-lg font-black mt-2 ${t.type === 'Income' ? 'text-emerald-600' : 'text-rose-500'}`}>
                     {t.type === 'Income' ? '+' : '-'} Tk. {t.amount.toLocaleString()}
                   </div>
                 </div>
                 <div className="flex justify-end gap-2">
                    <button onClick={() => handleEditTransaction(t)} className="p-2.5 bg-slate-50 text-slate-400 rounded-xl active:bg-blue-50 active:text-blue-600 transition-colors"><Edit3 className="w-4 h-4" /></button>
                    {isAdmin && <button onClick={() => setTransactionToDelete(t.id)} className="p-2.5 bg-slate-50 text-slate-400 rounded-xl active:bg-rose-50 active:text-rose-600 transition-colors"><Trash2 className="w-4 h-4" /></button>}
                 </div>
               </div>
             ))}
           </div>

           <div className="hidden lg:block overflow-x-auto no-scrollbar">
              <table className="w-full text-left min-w-[1000px] border-separate border-spacing-0">
                 <thead>
                    <tr className="text-[10px] font-black text-slate-300 uppercase tracking-widest border-b border-slate-50">
                       <th className="px-12 py-8 bg-white sticky left-0 z-10">Added By</th>
                       <th className="px-12 py-8 bg-white">Log Date</th>
                       <th className="px-12 py-8 bg-white">Description</th>
                       <th className="px-12 py-8 bg-white text-right">Inflow (Tk)</th>
                       <th className="px-12 py-8 bg-white text-right">Outflow (Tk)</th>
                       <th className="px-12 py-8 bg-white text-right">Actions</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {transactions.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-12 py-8 sticky left-0 bg-white group-hover:bg-slate-50/80 z-10"><div className="flex items-center gap-3"><div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 shadow-sm border border-slate-100"><User className="w-4 h-4" /></div><p className="text-[12px] font-black text-slate-700">{t.creator?.full_name || 'Legacy Log'}</p></div></td>
                        <td className="px-12 py-8 text-[12px] font-black text-slate-400 uppercase">{new Date(t.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        <td className="px-12 py-8"><p className="text-sm font-black text-slate-900 group-hover:text-[#064e3b] transition-colors">{t.description || 'General Record'}</p></td>
                        <td className="px-12 py-8 text-right">{t.type === 'Income' ? <span className="text-[16px] font-black text-emerald-600">+ {t.amount.toLocaleString()}</span> : <span className="text-slate-100">—</span>}</td>
                        <td className="px-12 py-8 text-right">{t.type === 'Expense' ? <span className="text-[16px] font-black text-rose-500">- {t.amount.toLocaleString()}</span> : <span className="text-slate-100">—</span>}</td>
                        <td className="px-12 py-8 text-right"><div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all"><button onClick={() => handleEditTransaction(t)} className="p-2.5 bg-white border border-slate-100 text-slate-400 hover:text-blue-600 rounded-xl shadow-sm transition-all active:scale-90"><Edit3 className="w-4 h-4" /></button>{isAdmin && <button onClick={() => setTransactionToDelete(t.id)} className="p-2.5 bg-white border border-slate-100 text-slate-400 hover:text-rose-600 rounded-xl shadow-sm transition-all active:scale-90"><Trash2 className="w-4 h-4" /></button>}</div></td>
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

export default CashbookDetails;
