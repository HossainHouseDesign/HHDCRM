
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Building2, Plus, Trash2, Edit3, MapPin, 
  RefreshCw, CheckCircle2, ArrowLeft, X, Save 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../App';

const Offices = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [offices, setOffices] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    status: 'active'
  });

  useEffect(() => {
    fetchOffices();
  }, []);

  const fetchOffices = async () => {
    try {
      const { data, error } = await supabase.from('offices').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setOffices(data || []);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editTarget) {
        const { error } = await supabase.from('offices').update(formData).eq('id', editTarget.id);
        if (error) throw error;
        showNotification("Office registry updated.", "success");
      } else {
        const { error } = await supabase.from('offices').insert([formData]);
        if (error) throw error;
        showNotification("New office registered.", "success");
      }
      setShowModal(false);
      setEditTarget(null);
      setFormData({ name: '', location: '', status: 'active' });
      fetchOffices();
    } catch (err: any) {
      showNotification("Registry failed: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (office: any) => {
    setEditTarget(office);
    setFormData({ name: office.name, location: office.location, status: office.status });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Operational Warning: Erasing an office may affect linked staff profiles. Proceed?")) return;
    try {
      const { error } = await supabase.from('offices').delete().eq('id', id);
      if (error) throw error;
      showNotification("Office records purged.", "info");
      fetchOffices();
    } catch (err: any) {
      showNotification("Purge failed.", "error");
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-32 px-6 pt-10 animate-in fade-in duration-500 max-w-6xl mx-auto">
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[32px] p-8 md:p-10 max-w-md w-full shadow-2xl relative animate-in zoom-in-95 border border-slate-100">
             <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">{editTarget ? 'Modify Facility' : 'Register Facility'}</h3>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">OFFICIAL BRANCH REGISTRY UPDATE</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:text-red-500 transition-all"><X className="w-5 h-5" /></button>
             </div>
             <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Facility Name</label>
                   <input required className="w-full h-12 px-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm text-slate-700 outline-none focus:bg-white focus:border-emerald-500/30 transition-all shadow-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Dhaka HQ" />
                </div>
                <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Physical Location</label>
                   <input required className="w-full h-12 px-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm text-slate-700 outline-none focus:bg-white focus:border-emerald-500/30 transition-all shadow-none" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="e.g. Gulshan, Dhaka" />
                </div>
                <button disabled={saving} className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-none hover:bg-black transition-all active:scale-95 disabled:opacity-50">
                   {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-emerald-400" />} Commit Changes
                </button>
             </form>
          </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/settings')} className="p-3 bg-white border border-slate-100 rounded-xl shadow-none text-slate-300 hover:text-slate-600 transition-all"><ArrowLeft className="w-5 h-5" /></button>
          <div className="leading-none">
             <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase leading-none">Office Registry</h1>
             <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mt-2 opacity-80 leading-none">MULTI-BRANCH FACILITY AGGREGATOR</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 shadow-none hover:bg-black transition-all active:scale-95">
          <Plus className="w-4 h-4" /> Add Facility
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
           Array(3).fill(0).map((_, i) => <div key={i} className="h-40 bg-slate-100 rounded-[32px] animate-pulse" />)
        ) : offices.map(o => (
          <div key={o.id} className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm transition-all group relative overflow-hidden hover:shadow-md">
             <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-[30px] rounded-full" />
             <div className="relative z-10 flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-slate-50 text-slate-900 border border-slate-100 rounded-xl flex items-center justify-center shadow-none transition-transform group-hover:scale-105">
                   <Building2 className="w-6 h-6" />
                </div>
                <div className="flex gap-1.5">
                   <button onClick={() => handleEdit(o)} className="p-2 bg-slate-50 text-slate-300 hover:text-slate-900 rounded-lg transition-all"><Edit3 className="w-4 h-4" /></button>
                   <button onClick={() => handleDelete(o.id)} className="p-2 bg-slate-50 text-slate-300 hover:text-red-500 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                </div>
             </div>
             <h3 className="text-xl font-black text-slate-900 mb-1 leading-none uppercase truncate">{o.name}</h3>
             <p className="text-slate-400 font-bold text-[11px] flex items-center gap-2 mb-6 uppercase tracking-tight leading-none truncate"><MapPin className="w-3 h-3 text-purple-500" /> {o.location}</p>
             <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-emerald-600 leading-none">
                <CheckCircle2 className="w-3.5 h-3.5" /> Operational Status Active
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Offices;
