
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
    <div className="min-h-screen bg-[#f8fafc] pb-32 px-6 md:px-12 pt-12 animate-in fade-in duration-500 max-w-6xl mx-auto">
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[48px] p-10 md:p-14 max-w-xl w-full shadow-2xl relative animate-in zoom-in-95">
             <div className="flex justify-between items-start mb-10">
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">{editTarget ? 'Edit Branch' : 'Register Office'}</h3>
                <button onClick={() => setShowModal(false)} className="p-3 bg-slate-50 rounded-2xl"><X className="w-5 h-5" /></button>
             </div>
             <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Branch Name</label>
                   <input required className="w-full h-16 px-8 bg-slate-50 border border-slate-100 rounded-[24px] font-bold text-slate-700" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Dhaka HQ" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Physical Location</label>
                   <input required className="w-full h-16 px-8 bg-slate-50 border border-slate-100 rounded-[24px] font-bold text-slate-700" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="e.g. Gulshan, Dhaka" />
                </div>
                <button disabled={saving} className="w-full py-8 bg-[#064e3b] text-white rounded-[32px] text-[12px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-4 shadow-xl">
                   {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 text-emerald-400" />} Commit Registry
                </button>
             </form>
          </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/settings')} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-400"><ArrowLeft className="w-5 h-5" /></button>
          <div>
             <h1 className="text-4xl font-black text-slate-900 tracking-tight">Office Registry</h1>
             <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em] mt-2 opacity-80">MULTI-BRANCH FACILITY MANAGEMENT</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="px-10 py-5 bg-[#064e3b] text-white rounded-[24px] text-[11px] font-black uppercase tracking-widest flex items-center gap-3 shadow-xl">
          <Plus className="w-5 h-5" /> Add Facility
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
           Array(3).fill(0).map((_, i) => <div key={i} className="h-48 bg-slate-100 rounded-[48px] animate-pulse" />)
        ) : offices.map(o => (
          <div key={o.id} className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-xl shadow-slate-200/20 hover:shadow-2xl transition-all group relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[40px] rounded-full" />
             <div className="relative z-10 flex justify-between items-start mb-8">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-[22px] flex items-center justify-center shadow-sm">
                   <Building2 className="w-8 h-8" />
                </div>
                <div className="flex gap-2">
                   <button onClick={() => handleEdit(o)} className="p-3 bg-slate-50 text-slate-400 hover:text-[#064e3b] rounded-xl transition-all"><Edit3 className="w-4 h-4" /></button>
                   <button onClick={() => handleDelete(o.id)} className="p-3 bg-slate-50 text-slate-400 hover:text-red-500 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                </div>
             </div>
             <h3 className="text-2xl font-black text-slate-900 mb-2">{o.name}</h3>
             <p className="text-slate-400 font-bold text-xs flex items-center gap-2 mb-8"><MapPin className="w-3.5 h-3.5" /> {o.location}</p>
             <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-emerald-600">
                <CheckCircle2 className="w-4 h-4" /> Operational Status Active
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Offices;
