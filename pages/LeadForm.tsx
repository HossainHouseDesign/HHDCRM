
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Lead, FormFieldConfig } from '../types';
import { useNotification } from '../App';
import { DEFAULT_FORM_CONFIG } from './Settings';
import { 
  ArrowLeft, Save, RefreshCw, 
  User, Home, Zap, Banknote, ShieldCheck, Compass, 
  ChevronDown, CheckCircle2 
} from 'lucide-react';
import { BD_DISTRICTS, BD_UPAZILA_MAP } from '../constants';

const LeadForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const isEditing = !!id;

  const [loading, setLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [formConfig, setFormConfig] = useState<FormFieldConfig[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});

  // Fetch form configuration and lead data if editing
  useEffect(() => {
    fetchConfigAndData();
  }, [id]);

  const fetchConfigAndData = async () => {
    try {
      setLoading(true);
      const [configRes, leadRes] = await Promise.all([
        supabase.from('settings').select('*').eq('key', 'lead_form_config').single(),
        isEditing ? supabase.from('leads').select('*').eq('id', id).single() : Promise.resolve({ data: null })
      ]);

      const config: FormFieldConfig[] = configRes.data?.value || DEFAULT_FORM_CONFIG;
      setFormConfig(config);

      const initialData: Record<string, any> = {};
      config.forEach(f => {
        initialData[f.db_key] = f.type === 'number' ? 0 : (f.type === 'checkbox' ? false : '');
      });

      if (leadRes.data) {
        const lead = leadRes.data as Lead;
        config.forEach(f => {
          const val = lead[f.db_key as keyof Lead] !== undefined ? lead[f.db_key as keyof Lead] : lead.metadata?.[f.db_key];
          initialData[f.db_key] = val ?? initialData[f.db_key];
        });
      }

      setFormData(initialData);
    } catch (err) {
      showNotification("Failed to load form configuration.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication required");

      const { data: profile } = await supabase.from('profiles').select('office_id').eq('id', user.id).single();
      if (!profile?.office_id) throw new Error("No office assigned to user");

      const standardCols = [
        'client_name', 'phone', 'email', 'current_location', 'land_area', 'address', 'upazila', 
        'union_name', 'police_station', 'village_name', 'package', 'asking_fee', 'budget', 'social_media', 
        'next_calling_date', 'notes', 'foundation', 'unit_count', 'bedroom_count', 
        'bathroom_count', 'stair_details', 'interest_construction', 'interest_interior'
      ];

      const payload: Record<string, any> = { 
        updated_at: new Date().toISOString(), 
        office_id: profile.office_id,
        metadata: {} 
      };

      Object.keys(formData).forEach(key => {
        if (standardCols.includes(key)) {
          payload[key] = formData[key];
        } else {
          payload.metadata[key] = formData[key];
        }
      });

      if (isEditing) {
        const { error } = await supabase.from('leads').update(payload).eq('id', id);
        if (error) throw error;
        showNotification("Lead details updated.", "success");
      } else {
        payload.created_at = new Date().toISOString();
        payload.status = 'Discovery';
        payload.is_client = false;
        const { error } = await supabase.from('leads').insert([payload]);
        if (error) throw error;
        showNotification("New lead ingested successfully.", "success");
      }
      navigate('/leads');
    } catch (err: any) {
      showNotification('Sync Error: ' + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const getSectionIcon = (section: string) => {
    switch (section) {
      case 'Identity': return <User className="w-5 h-5 text-emerald-500" />;
      case 'Architecture': return <Home className="w-5 h-5 text-emerald-500" />;
      case 'Logistics': return <Zap className="w-5 h-5 text-emerald-500" />;
      case 'Financials': return <Banknote className="w-5 h-5 text-emerald-500" />;
      case 'Interests': return <ShieldCheck className="w-5 h-5 text-emerald-500" />;
      default: return <Compass className="w-5 h-5 text-emerald-500" />;
    }
  };

  if (loading) return (
    <div className="h-[80vh] flex flex-col items-center justify-center gap-6">
      <RefreshCw className="w-12 h-12 text-[#064e3b] animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Loading Form Schema...</p>
    </div>
  );

  const groupedFields = formConfig.reduce((acc, field) => {
    if (!field.visible) return acc;
    const section = field.section || 'General';
    if (!acc[section]) acc[section] = [];
    acc[section].push(field);
    return acc;
  }, {} as Record<string, FormFieldConfig[]>);

  return (
    <div className="max-w-5xl mx-auto px-6 pt-12 pb-32 animate-in slide-in-from-bottom-6">
      <header className="flex items-center gap-6 mb-12">
        <button onClick={() => navigate(-1)} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-400 hover:text-slate-900 transition-all"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{isEditing ? 'Modify Lead' : 'Lead Intake'}</h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Architectural Discovery Workflow</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-12">
        {Object.keys(groupedFields).map(section => (
          <div key={section} className="bg-white rounded-[48px] border border-slate-100 shadow-xl p-10 md:p-14 space-y-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none" />
            <div className="flex items-center gap-4 border-b border-slate-50 pb-6 relative z-10">
              {getSectionIcon(section)}
              <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">{section} Specifications</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
              {groupedFields[section].map(f => (
                <div key={f.id} className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{f.label} {f.required && <span className="text-red-500">*</span>}</label>
                  {f.type === 'select' ? (
                    <div className="relative">
                      <select 
                        required={f.required}
                        className="w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white focus:border-emerald-500/20 transition-all appearance-none cursor-pointer"
                        value={formData[f.db_key] || ''}
                        onChange={e => setFormData({...formData, [f.db_key]: e.target.value})}
                      >
                        <option value="">Select Option</option>
                        {(f.db_key === 'address' ? BD_DISTRICTS : 
                          (f.db_key === 'upazila' ? (BD_UPAZILA_MAP[formData.address] || []) : f.options)
                        )?.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                    </div>
                  ) : f.type === 'textarea' ? (
                    <textarea 
                      required={f.required}
                      className="w-full h-32 px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white focus:border-emerald-500/20 transition-all resize-none"
                      placeholder={f.placeholder}
                      value={formData[f.db_key] || ''}
                      onChange={e => setFormData({...formData, [f.db_key]: e.target.value})}
                    />
                  ) : f.type === 'checkbox' ? (
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, [f.db_key]: !formData[f.db_key]})}
                      className={`w-full h-14 px-6 bg-slate-50 rounded-2xl transition-all flex items-center gap-4 border-2 border-transparent ${formData[f.db_key] ? 'border-emerald-500/20 bg-white' : ''}`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${formData[f.db_key] ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 bg-white'}`}>
                        {formData[f.db_key] && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <span className={`text-[13px] font-bold ${formData[f.db_key] ? 'text-emerald-900' : 'text-slate-500'}`}>{f.label}</span>
                    </button>
                  ) : (
                    <input 
                      required={f.required}
                      type={f.type === 'number' ? 'number' : (f.type === 'date' ? 'date' : 'text')}
                      className="w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white focus:border-emerald-500/20 transition-all shadow-inner"
                      placeholder={f.placeholder}
                      value={formData[f.db_key] ?? ''}
                      onChange={e => setFormData({...formData, [f.db_key]: f.type === 'number' ? Number(e.target.value) : e.target.value})}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <button 
          type="submit" 
          disabled={isSaving}
          className="w-full py-8 bg-[#064e3b] text-white rounded-[32px] text-[12px] font-black uppercase tracking-[0.3em] shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50"
        >
          {isSaving ? <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" /> : <Save className="w-6 h-6 text-emerald-400" />}
          Finalize Lead Entry
        </button>
      </form>
    </div>
  );
};

export default LeadForm;
