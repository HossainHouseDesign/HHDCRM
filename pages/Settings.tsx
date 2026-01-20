import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Plus, Trash2, RefreshCw, Eye, EyeOff, Lock, Layout, X, Settings2,
  User, Home, Zap, Compass, Database, AlertCircle, ListTree, History,
  ChevronRight, Users, UserCircle, FormInput, ArrowLeft, Save, Shield,
  Type as TypeIcon, ListFilter, AlertTriangle, Banknote, ShieldAlert,
  ChevronDown, Tag
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { FormFieldConfig, FieldType } from '../types';

export const DEFAULT_FORM_CONFIG: FormFieldConfig[] = [
  // Identity Section
  { id: '1', label: 'Full Name', db_key: 'client_name', type: 'text', section: 'Identity', required: true, visible: true, placeholder: 'e.g. Sarah Khan' },
  { id: '2', label: 'Phone Number', db_key: 'phone', type: 'text', section: 'Identity', required: true, visible: true, placeholder: '01XXXXXXXXX' },
  { id: '11', label: 'Current Location (Country)', db_key: 'current_location', type: 'text', section: 'Identity', required: false, visible: true, placeholder: 'e.g. Bangladesh' },
  
  // Architecture Section
  { id: '14', label: 'Land Area', db_key: 'land_area', type: 'text', section: 'Architecture', required: false, visible: true, placeholder: 'e.g. 5 Katha' },
  { id: 'foundation_idx', label: 'Foundation', db_key: 'foundation', type: 'select', section: 'Architecture', required: false, visible: true, options: ['1 Store', '2 Store', '3 Store', '4 Store', '5 Store', '6 Store', '7 Store', '8 Store', '9 Store', '10 Store'] },
  { id: '5', label: 'Units Per floor', db_key: 'unit_count', type: 'select', section: 'Architecture', required: false, visible: true, options: ['1 Unit', '2 Units', '3 Units', '4 Units'] },
  { id: 'br_count', label: 'Bedroom Count', db_key: 'bedroom_count', type: 'number', section: 'Architecture', required: false, visible: true, placeholder: '0' },
  { id: 'ba_count', label: 'Bathroom Count', db_key: 'bathroom_count', type: 'number', section: 'Architecture', required: false, visible: true, placeholder: '0' },
  { id: '12', label: 'Stair Case Style', db_key: 'stair_details', type: 'select', section: 'Architecture', required: false, visible: true, options: ['Single Flight', 'Double Flight', 'Spiral', 'U-Shaped'] },
  
  // Logistics Section
  { id: '3', label: 'District', db_key: 'address', type: 'text', section: 'Logistics', required: true, visible: true, placeholder: 'e.g. Pabna' },
  { id: '13', label: 'Upazila', db_key: 'upazila', type: 'text', section: 'Logistics', required: false, visible: true, placeholder: 'e.g. Ishwardi' },
  { id: 'union_idx', label: 'Union Name', db_key: 'union_name', type: 'text', section: 'Logistics', required: false, visible: true, placeholder: 'e.g. Pakuria' },
  { id: 'ps_idx', label: 'Police Station', db_key: 'police_station', type: 'text', section: 'Logistics', required: false, visible: true, placeholder: 'Enter PS name...' },
  { id: 'village_idx', label: 'Village / Area', db_key: 'village_name', type: 'text', section: 'Logistics', required: false, visible: true, placeholder: 'e.g. Master Para' },
  { id: 'social_idx', label: 'Source (Social Media)', db_key: 'social_media', type: 'text', section: 'Logistics', required: false, visible: true, placeholder: 'e.g. Facebook' },
  { id: 'call_date', label: 'Next Calling Date', db_key: 'date', section: 'Logistics', required: false, visible: true, type: 'date' },
  
  // Financials Section
  { id: 'pkg_idx', label: 'Design Package', db_key: 'package', type: 'select', section: 'Financials', required: false, visible: true, options: ['Basic Drafting', 'Standard Architectural', 'Premium Engineering', 'Luxury Full-Service'] },
  { id: 'fee_idx', label: 'Asking Fee (BDT)', db_key: 'asking_fee', type: 'number', section: 'Financials', required: false, visible: true, placeholder: '0' },
  { id: 'budget_idx', label: 'Client Budget Range', db_key: 'budget', type: 'text', section: 'Financials', required: false, visible: true, placeholder: 'e.g. 50-70 Lakh' },
  
  // Notes Section
  { id: 'notes_idx', label: 'Technical Notes', db_key: 'notes', type: 'textarea', section: 'Logistics', required: false, visible: true, placeholder: 'Enter additional requirements...' },
];

const Settings = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<'hub' | 'form' | 'profile'>('hub');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formFields, setFormFields] = useState<FormFieldConfig[]>([]);
  const [newOptionInputs, setNewOptionInputs] = useState<Record<string, string>>({});
  
  const [fieldToDelete, setFieldToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('settings').select('*').eq('key', 'lead_form_config').single();
      if (error && error.code !== 'PGRST116') throw error;
      setFormFields(data?.value || DEFAULT_FORM_CONFIG);
    } catch (err) {
      setFormFields(DEFAULT_FORM_CONFIG);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveForm = async () => {
    setSaving(true);
    try {
      await supabase.from('settings').upsert({ 
        key: 'lead_form_config', 
        value: formFields,
        updated_at: new Date().toISOString()
      });
      alert('Workspace blueprint updated successfully.');
      setView('hub');
    } catch (err) {
      alert('Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const addNewField = (section: string) => {
    const newField: FormFieldConfig = {
      id: Math.random().toString(36).substr(2, 9),
      label: 'New Field',
      db_key: 'custom_' + Math.random().toString(36).substr(2, 5),
      type: 'text',
      section,
      required: false,
      visible: true,
      placeholder: 'Enter value...'
    };
    setFormFields(prev => [...prev, newField]);
  };

  const confirmRemoveField = () => {
    if (fieldToDelete) {
      setFormFields(prev => prev.filter(f => f.id !== fieldToDelete));
      setFieldToDelete(null);
    }
  };

  const updateField = (id: string, updates: Partial<FormFieldConfig>) => {
    setFormFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const addOption = (id: string) => {
    const option = newOptionInputs[id]?.trim();
    if (!option) return;
    const field = formFields.find(f => f.id === id);
    if (field) {
      const currentOptions = field.options || [];
      if (!currentOptions.includes(option)) {
        updateField(id, { options: [...currentOptions, option] });
      }
    }
    setNewOptionInputs(prev => ({ ...prev, [id]: '' }));
  };

  const removeOption = (id: string, option: string) => {
    const field = formFields.find(f => f.id === id);
    if (field && field.options) {
      updateField(id, { options: field.options.filter(o => o !== option) });
    }
  };

  const groupedFields = useMemo(() => {
    const groups: Record<string, FormFieldConfig[]> = { 'Identity': [], 'Architecture': [], 'Logistics': [], 'Financials': [] };
    formFields.forEach(f => {
      const section = f.section || 'Identity';
      if (!groups[section]) groups[section] = [];
      groups[section].push(f);
    });
    return groups;
  }, [formFields]);

  if (view === 'hub') {
    return (
      <div className="min-h-screen bg-[#f8fafc] pb-24 sm:pb-32 px-4 sm:px-10 pt-8 sm:pt-12 animate-in fade-in duration-500 max-w-6xl mx-auto">
        <header className="mb-10 sm:mb-16">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Workspace Hub</h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em] mt-2 opacity-80">CENTRALIZED FIRM ADMINISTRATION</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10">
          <button onClick={() => setView('form')} className="p-8 sm:p-12 bg-white border border-slate-100 rounded-[32px] sm:rounded-[56px] shadow-sm text-left group hover:border-emerald-500 transition-all hover:-translate-y-1">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-50 text-emerald-600 rounded-[24px] sm:rounded-[32px] flex items-center justify-center mb-6 sm:mb-10 group-hover:scale-110 transition-transform">
              <FormInput className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-2 sm:mb-3">Form Blueprint</h3>
            <p className="text-sm text-slate-400 font-medium leading-relaxed max-w-xs">Define technical parameters, land specs, and intake fields for architectural leads.</p>
            <div className="mt-8 sm:mt-12 flex items-center gap-3 text-emerald-600 text-[10px] sm:text-[11px] font-black uppercase tracking-widest group-hover:gap-5 transition-all">
              Manage Schema <ChevronRight className="w-4 h-4" />
            </div>
          </button>

          <Link to="/settings/recycle-bin" className="p-8 sm:p-12 bg-white border border-slate-100 rounded-[32px] sm:rounded-[56px] shadow-sm group hover:border-red-500 transition-all hover:-translate-y-1">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-50 text-red-600 rounded-[24px] sm:rounded-[32px] flex items-center justify-center mb-6 sm:mb-10 group-hover:scale-110 transition-transform">
              <History className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-2 sm:mb-3">Archive Vault</h3>
            <p className="text-sm text-slate-400 font-medium leading-relaxed max-w-xs">Access soft-deleted leads, clients, and team members. Restore or purge permanently.</p>
            <div className="mt-8 sm:mt-12 flex items-center gap-3 text-red-600 text-[10px] sm:text-[11px] font-black uppercase tracking-widest group-hover:gap-5 transition-all">
              Open Recycle Bin <ChevronRight className="w-4 h-4" />
            </div>
          </Link>

          <Link to="/team" className="p-8 sm:p-12 bg-white border border-slate-100 rounded-[32px] sm:rounded-[56px] shadow-sm group hover:border-blue-500 transition-all hover:-translate-y-1">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-50 text-blue-600 rounded-[24px] sm:rounded-[32px] flex items-center justify-center mb-6 sm:mb-10 group-hover:scale-110 transition-transform">
              <Users className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-2 sm:mb-3">Design Team</h3>
            <p className="text-sm text-slate-400 font-medium leading-relaxed max-w-xs">Manage workspace staff, define architectural roles, and control project access.</p>
            <div className="mt-8 sm:mt-12 flex items-center gap-3 text-blue-600 text-[10px] sm:text-[11px] font-black uppercase tracking-widest group-hover:gap-5 transition-all">
              Team Directory <ChevronRight className="w-4 h-4" />
            </div>
          </Link>

          <button onClick={() => setView('profile')} className="p-8 sm:p-12 bg-white border border-slate-100 rounded-[32px] sm:rounded-[56px] shadow-sm text-left group hover:border-slate-900 transition-all hover:-translate-y-1">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 text-slate-600 rounded-[24px] sm:rounded-[32px] flex items-center justify-center mb-6 sm:mb-10 group-hover:scale-110 transition-transform">
              <UserCircle className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-2 sm:mb-3">My Credentials</h3>
            <p className="text-sm text-slate-400 font-medium leading-relaxed max-w-xs">Update your professional bio, design portfolio link, and security password.</p>
            <div className="mt-8 sm:mt-12 flex items-center gap-3 text-slate-600 text-[10px] sm:text-[11px] font-black uppercase tracking-widest group-hover:gap-5 transition-all">
              Update Profile <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (view === 'form') {
    return (
      <div className="min-h-screen bg-[#f8fafc] pb-24 sm:pb-32 px-4 sm:px-10 pt-8 sm:pt-12 animate-in slide-in-from-bottom-6 duration-500 max-w-6xl mx-auto">
        
        {/* Delete Confirmation Modal */}
        {fieldToDelete && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[48px] p-12 max-w-lg w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300 text-center">
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-[32px] flex items-center justify-center mb-8 mx-auto shadow-sm">
                <Trash2 className="w-10 h-10" />
              </div>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-4">Eliminate Field?</h3>
              <p className="text-slate-500 leading-relaxed font-medium mb-10 text-sm">
                This field will be removed from all future project intake forms. Existing data in the database will remain unaffected.
              </p>
              <div className="flex gap-4">
                <button onClick={() => setFieldToDelete(null)} className="flex-1 py-5 bg-slate-50 text-slate-500 rounded-[24px] text-[11px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">Cancel</button>
                <button onClick={confirmRemoveField} className="flex-1 py-5 bg-red-600 text-white rounded-[24px] text-[11px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-900/20">Delete Field</button>
              </div>
            </div>
          </div>
        )}

        <header className="mb-10 sm:mb-16 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
             <button onClick={() => setView('hub')} className="p-3.5 sm:p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:bg-slate-50 transition-all">
               <ArrowLeft className="w-5 h-5 text-slate-500" />
             </button>
             <div>
               <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">Form Blueprint</h1>
               <p className="text-slate-400 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] mt-2 opacity-80">TECHNICAL DISCOVERY SCHEMA</p>
             </div>
          </div>
          <button onClick={handleSaveForm} disabled={saving} className="w-full sm:w-auto px-10 py-4 bg-[#064e3b] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-900/10 active:scale-95 transition-all">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Commit Blueprint'}
          </button>
        </header>

        <div className="space-y-10 sm:space-y-16">
          {Object.entries(groupedFields).map(([section, fields]) => (
            <section key={section} className="space-y-6 sm:space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h3 className="text-[10px] sm:text-[12px] font-black text-slate-800 uppercase tracking-[0.3em]">{section} Portfolio</h3>
                <button onClick={() => addNewField(section)} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all">
                  <Plus className="w-3.5 h-3.5" /> Add Field
                </button>
              </div>
              <div className="grid grid-cols-1 gap-6 sm:gap-8">
                {(fields as FormFieldConfig[]).map(f => (
                  <div key={f.id} className="bg-white p-6 sm:p-10 rounded-[32px] sm:rounded-[48px] border border-slate-100 shadow-sm flex flex-col gap-6 sm:gap-10 group">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10 items-end">
                      <div className="lg:col-span-5 space-y-2">
                        <p className="text-[8px] sm:text-[9px] font-black text-slate-300 uppercase tracking-widest ml-1">Label</p>
                        <input className="w-full h-14 sm:h-16 bg-slate-50 border-transparent rounded-2xl sm:rounded-[24px] px-6 sm:px-8 text-sm font-bold text-slate-700 outline-none focus:bg-white transition-all shadow-inner" value={f.label} onChange={e => updateField(f.id, { label: e.target.value })} />
                      </div>
                      <div className="lg:col-span-3 space-y-2">
                        <p className="text-[8px] sm:text-[9px] font-black text-slate-300 uppercase tracking-widest ml-1">Modality</p>
                        <div className="relative">
                          <select className="w-full h-14 sm:h-16 px-6 sm:px-8 bg-slate-50 border-transparent rounded-2xl sm:rounded-[24px] text-[12px] sm:text-[13px] font-bold text-slate-700 outline-none focus:bg-white transition-all appearance-none cursor-pointer" value={f.type} onChange={e => updateField(f.id, { type: e.target.value as FieldType })}>
                            <option value="text">Text Entry</option>
                            <option value="number">Numeric Value</option>
                            <option value="select">Dropdown Choice</option>
                            <option value="textarea">Extended Notes</option>
                            <option value="date">Calendar Pick</option>
                          </select>
                          <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                        </div>
                      </div>
                      <div className="lg:col-span-4 flex items-center gap-3">
                         <button onClick={() => updateField(f.id, { required: !f.required })} className={`flex-1 h-14 sm:h-16 rounded-2xl sm:rounded-[24px] border transition-all flex items-center justify-center gap-2 ${f.required ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-50 border-transparent text-slate-300'}`}><Lock className="w-3.5 h-3.5" /> <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest">Req</span></button>
                         <button onClick={() => updateField(f.id, { visible: !f.visible })} className={`flex-1 h-14 sm:h-16 rounded-2xl sm:rounded-[24px] border transition-all flex items-center justify-center gap-2 ${f.visible ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-50 border-transparent text-slate-300'}`}>{f.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />} <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest">Vis</span></button>
                         <button type="button" onClick={() => setFieldToDelete(f.id)} className="w-14 sm:w-16 h-14 sm:h-16 bg-red-50 text-red-300 hover:text-red-500 rounded-2xl sm:rounded-[24px] transition-all flex items-center justify-center"><Trash2 className="w-5 h-5" /></button>
                      </div>
                    </div>

                    {/* Dropdown Options Management restored here */}
                    {f.type === 'select' && (
                      <div className="pt-6 border-t border-slate-50 space-y-6 animate-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-3">
                           <ListFilter className="w-4 h-4 text-emerald-600" />
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Configure Dropdown Options</p>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                           {f.options?.map(opt => (
                             <div key={opt} className="flex items-center gap-3 pl-4 pr-2 py-2 bg-slate-50 border border-slate-100 rounded-full group/opt hover:bg-emerald-50 hover:border-emerald-100 transition-all">
                               <span className="text-[11px] font-bold text-slate-600 group-hover/opt:text-emerald-700">{opt}</span>
                               <button onClick={() => removeOption(f.id, opt)} className="p-1 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-full transition-all">
                                 <X className="w-3.5 h-3.5" />
                               </button>
                             </div>
                           ))}
                           {(!f.options || f.options.length === 0) && (
                             <p className="text-[10px] text-slate-300 font-medium italic">No options defined yet.</p>
                           )}
                        </div>

                        <div className="flex gap-3 max-w-md mt-4">
                           <div className="relative flex-1">
                              <Tag className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                              <input 
                                className="w-full h-14 pl-12 pr-6 bg-slate-50 border-transparent rounded-2xl text-[12px] font-bold text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/5 transition-all"
                                placeholder="Add new option..."
                                value={newOptionInputs[f.id] || ''}
                                onChange={e => setNewOptionInputs(prev => ({ ...prev, [f.id]: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addOption(f.id))}
                              />
                           </div>
                           <button 
                             onClick={() => addOption(f.id)}
                             className="h-14 px-8 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#064e3b] transition-all shadow-lg shadow-emerald-900/10"
                           >
                             Add
                           </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    );
  }

  return null;
};

export default Settings;