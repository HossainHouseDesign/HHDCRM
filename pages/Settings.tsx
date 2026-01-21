import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Plus, Trash2, RefreshCw, Eye, EyeOff, Lock, ChevronRight, Users, 
  UserCircle, FormInput, ArrowLeft, Save, Shield, RotateCcw, 
  Mail, Phone, Briefcase, Camera, Tag, ListFilter, X, History,
  Type as TypeIcon, Wand2, ShieldCheck, User as UserIcon,
  Image as ImageIcon, ToggleLeft, ToggleRight, AlertTriangle, ListPlus,
  Settings2, CheckCircle2
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { FormFieldConfig, FieldType, Profile } from '../types';
import { useNotification, useUser } from '../App';

export const DEFAULT_FORM_CONFIG: FormFieldConfig[] = [
  { id: '1', label: 'Full Name', db_key: 'client_name', type: 'text', section: 'Identity', required: true, visible: true, placeholder: 'e.g. Sarah Khan' },
  { id: '2', label: 'Phone Number', db_key: 'phone', type: 'text', section: 'Identity', required: true, visible: true, placeholder: '01XXXXXXXXX' },
  { id: 'loc_idx', label: 'Current Location (Country)', db_key: 'current_location', type: 'select', section: 'Identity', required: false, visible: true },
  { id: '14', label: 'Land Area', db_key: 'land_area', type: 'text', section: 'Architecture', required: false, visible: true, placeholder: 'e.g. 5 Katha' },
  { id: 'dist_idx', label: 'District', db_key: 'address', type: 'select', section: 'Logistics', required: true, visible: true },
  { id: 'upz_idx', label: 'Upazila', db_key: 'upazila', type: 'select', section: 'Logistics', required: true, visible: true },
  { id: 'pkg_idx', label: 'Design Package', db_key: 'package', type: 'select', section: 'Financials', required: false, visible: true, options: ['Standard Architectural', 'Premium Engineering', 'Luxury Full-Service'] },
  { id: 'fee_idx', label: 'Design Charge (BDT)', db_key: 'asking_fee', type: 'number', section: 'Financials', required: false, visible: true, placeholder: '0' },
];

const Settings = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { isAdmin, profile: globalProfile, refreshUser } = useUser();
  const [view, setView] = useState<'hub' | 'form' | 'profile'>('hub');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Profile state
  const [showPassword, setShowPassword] = useState(false);
  const [localProfile, setLocalProfile] = useState<Partial<Profile>>({});
  
  // Form Schema state
  const [formFields, setFormFields] = useState<FormFieldConfig[]>([]);
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  
  // Tag Management State for Dropdowns
  const [tempOptions, setTempOptions] = useState<string[]>([]);
  const [optionInput, setOptionInput] = useState(''); 
  const [editingOptionsId, setEditingOptionsId] = useState<string | null>(null);

  const [newField, setNewField] = useState<Partial<FormFieldConfig>>({
    label: '',
    type: 'text',
    section: 'Architecture',
    required: false,
    visible: true,
    options: []
  });

  useEffect(() => {
    if (globalProfile) {
      setLocalProfile(globalProfile);
      if (!isAdmin) setView('profile');
      fetchSchema();
      setLoading(false);
    }
  }, [globalProfile, isAdmin]);

  const fetchSchema = async () => {
    try {
      const { data } = await supabase.from('settings').select('*').eq('key', 'lead_form_config').single();
      if (data) setFormFields(data.value);
      else setFormFields(DEFAULT_FORM_CONFIG);
    } catch (err) {
      setFormFields(DEFAULT_FORM_CONFIG);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const userId = globalProfile?.id;
      if (!userId) throw new Error("Security check failed.");
      const { error } = await supabase.rpc('update_self_profile_v4', {
        p_id: userId,
        p_full_name: localProfile.full_name?.trim(),
        p_designation: localProfile.designation?.trim(),
        p_phone: localProfile.phone?.trim(),
        p_password: localProfile.login_password,
        p_avatar_url: localProfile.avatar_url?.trim()
      });
      if (error) throw error;
      showNotification("Account information synchronized.", "success");
      await refreshUser();
      if (isAdmin) setView('hub');
    } catch (err: any) { 
      showNotification(err.message, "error"); 
    } finally { 
      setSaving(false); 
    }
  };

  const saveSchema = async (updatedFields: FormFieldConfig[]) => {
    setSaving(true);
    try {
      const { error } = await supabase.from('settings').upsert({
        key: 'lead_form_config',
        value: updatedFields,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
      if (error) throw error;
      setFormFields(updatedFields);
      showNotification("Lead Form Setting updated.", "success");
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleFieldVisibility = (id: string) => {
    const updated = formFields.map(f => f.id === id ? { ...f, visible: !f.visible } : f);
    saveSchema(updated);
  };

  const deleteField = (id: string) => {
    const field = formFields.find(f => f.id === id);
    if (['client_name', 'phone', 'address', 'upazila'].includes(field?.db_key || '')) {
      showNotification("Core fields protected.", "warning");
      return;
    }
    const updated = formFields.filter(f => f.id !== id);
    saveSchema(updated);
  };

  const addOptionTag = () => {
    if (!optionInput.trim()) return;
    const clean = optionInput.trim();
    if (!tempOptions.includes(clean)) {
      setTempOptions([...tempOptions, clean]);
    }
    setOptionInput('');
  };

  const removeOptionTag = (tag: string) => {
    setTempOptions(tempOptions.filter(t => t !== tag));
  };

  const handleOptionInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addOptionTag();
    }
  };

  const addNewField = () => {
    if (!newField.label || !newField.section) return;
    const db_key = newField.label.toLowerCase().replace(/\s+/g, '_');
    
    const field: FormFieldConfig = {
      id: Math.random().toString(36).substr(2, 9),
      label: newField.label,
      db_key: db_key,
      type: (newField.type as FieldType) || 'text',
      section: newField.section,
      required: !!newField.required,
      visible: true,
      options: newField.type === 'select' ? tempOptions : []
    };
    saveSchema([...formFields, field]);
    setIsFieldModalOpen(false);
    setTempOptions([]);
    setOptionInput('');
    setNewField({ label: '', type: 'text', section: 'Architecture', required: false, visible: true, options: [] });
  };

  const handleUpdateOptions = (id: string) => {
    const field = formFields.find(f => f.id === id);
    if (!field) return;
    const updated = formFields.map(f => f.id === id ? { ...f, options: tempOptions } : f);
    saveSchema(updated);
    setEditingOptionsId(null);
    setTempOptions([]);
    setOptionInput('');
  };

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pass = "";
    for (let i = 0; i < 12; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
    setLocalProfile(prev => ({ ...prev, login_password: pass }));
    setShowPassword(true);
  };

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-6">
       <RefreshCw className="w-10 h-10 text-[#064e3b] animate-spin" />
       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Syncing Identity Hub...</p>
    </div>
  );

  // 1. ADMIN HUB VIEW
  if (view === 'hub' && isAdmin) return (
    <div className="min-h-screen bg-[#f8fafc] pb-32 px-6 md:px-12 pt-12 animate-in fade-in duration-500 max-w-6xl mx-auto">
      <header className="mb-16">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Workspace Hub</h1>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em] mt-2 opacity-80">CENTRALIZED FIRM ADMINISTRATION</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <button onClick={() => setView('form')} className="p-10 bg-white border border-slate-100 rounded-[48px] shadow-sm text-left group hover:border-emerald-500 transition-all hover:-translate-y-1">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-[28px] flex items-center justify-center mb-8 group-hover:scale-110 transition-transform"><FormInput className="w-8 h-8" /></div>
          <h3 className="text-xl font-black text-slate-900 mb-2">Lead Form Setting</h3>
          <p className="text-xs text-slate-400 font-medium leading-relaxed">Define technical parameters and dropdown choices.</p>
          <div className="mt-8 flex items-center gap-2 text-emerald-600 text-[10px] font-black uppercase tracking-widest">Manage Schema <ChevronRight className="w-3 h-3" /></div>
        </button>
        <Link to="/settings/recycle-bin" className="p-10 bg-white border border-slate-100 rounded-[48px] shadow-sm group hover:border-red-500 transition-all hover:-translate-y-1">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-[28px] flex items-center justify-center mb-8 group-hover:scale-110 transition-transform"><History className="w-8 h-8" /></div>
          <h3 className="text-xl font-black text-slate-900 mb-2">Recycle Bin</h3>
          <p className="text-xs text-slate-400 font-medium leading-relaxed">Access soft-deleted records and permanently purge.</p>
          <div className="mt-8 flex items-center gap-2 text-red-600 text-[10px] font-black uppercase tracking-widest">Open Bin <ChevronRight className="w-3 h-3" /></div>
        </Link>
        <button onClick={() => setView('profile')} className="p-10 bg-white border border-slate-100 rounded-[48px] shadow-sm text-left group hover:border-slate-900 transition-all hover:-translate-y-1">
          <div className="w-16 h-16 bg-slate-50 text-slate-600 rounded-[28px] flex items-center justify-center mb-8 group-hover:scale-110 transition-transform"><UserCircle className="w-8 h-8" /></div>
          <h3 className="text-xl font-black text-slate-900 mb-2">Account Details</h3>
          <p className="text-xs text-slate-400 font-medium leading-relaxed">Update professional bio and security credentials.</p>
          <div className="mt-8 flex items-center gap-2 text-slate-600 text-[10px] font-black uppercase tracking-widest">Update Profile <ChevronRight className="w-3 h-3" /></div>
        </button>
      </div>
    </div>
  );

  // 2. LEAD FORM SETTING VIEW
  if (view === 'form' && isAdmin) return (
    <div className="min-h-screen bg-[#f8fafc] pb-32 px-6 md:px-12 pt-12 animate-in slide-in-from-right-6 duration-500 max-w-5xl mx-auto">
      <header className="mb-12 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button onClick={() => setView('hub')} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:bg-slate-50 transition-all"><ArrowLeft className="w-5 h-5 text-slate-500" /></button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Lead Form Setting</h1>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">ARCHITECTURAL INTAKE SCHEMA</p>
          </div>
        </div>
        <button onClick={() => { setIsFieldModalOpen(true); setTempOptions([]); setOptionInput(''); }} className="px-8 py-4 bg-[#064e3b] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all flex items-center gap-3">
          <Plus className="w-4 h-4" /> New Field
        </button>
      </header>

      {isFieldModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] p-10 md:p-14 max-w-xl w-full shadow-2xl animate-in zoom-in-95 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 blur-[80px] rounded-full" />
            <h3 className="text-2xl font-black text-slate-900 mb-8 tracking-tight">Provision Technical Field</h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Label Identifier</label>
                <input className="w-full h-14 px-6 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none border-2 border-transparent focus:border-emerald-500/20" value={newField.label} onChange={e => setNewField({...newField, label: e.target.value})} placeholder="e.g. Roof Material" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data Modality</label>
                  <select className="w-full h-14 px-6 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none border-2 border-transparent focus:border-emerald-500/20" value={newField.type} onChange={e => { setNewField({...newField, type: e.target.value as any}); if(e.target.value !== 'select') setTempOptions([]); }}>
                    <option value="text">Short Text</option>
                    <option value="number">Numeric</option>
                    <option value="select">Dropdown Choice</option>
                    <option value="date">Calendar Date</option>
                    <option value="textarea">Long Description</option>
                    <option value="checkbox">Toggle Boolean</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Logical Group</label>
                  <select className="w-full h-14 px-6 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none border-2 border-transparent focus:border-emerald-500/20" value={newField.section} onChange={e => setNewField({...newField, section: e.target.value})}>
                    <option value="Identity">Identity</option>
                    <option value="Architecture">Architecture</option>
                    <option value="Logistics">Logistics</option>
                    <option value="Financials">Financials</option>
                    <option value="Interests">Interests</option>
                  </select>
                </div>
              </div>

              {newField.type === 'select' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                     <ListPlus className="w-3 h-3 text-emerald-500" /> Options Registry
                   </label>
                   <div className="flex gap-2">
                      <input 
                        className="flex-1 h-14 px-6 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none border-2 border-transparent focus:border-emerald-500/20" 
                        placeholder="Add choice..." 
                        value={optionInput} 
                        onChange={e => setOptionInput(e.target.value)}
                        onKeyDown={handleOptionInputKeyDown}
                      />
                      <button onClick={addOptionTag} className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all"><Plus className="w-6 h-6" /></button>
                   </div>
                   <div className="flex flex-wrap gap-2 min-h-[60px] p-4 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl">
                      {tempOptions.length === 0 ? (
                        <p className="text-[10px] text-slate-300 font-bold uppercase mx-auto self-center">No options defined</p>
                      ) : (
                        tempOptions.map(tag => (
                          <div key={tag} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-100 rounded-xl shadow-sm animate-in zoom-in-90">
                             <span className="text-xs font-black text-slate-700">{tag}</span>
                             <button onClick={() => removeOptionTag(tag)} className="text-slate-300 hover:text-red-500 transition-colors"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        ))
                      )}
                   </div>
                </div>
              )}

              <button onClick={addNewField} className="w-full py-6 bg-[#064e3b] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                <ShieldCheck className="w-5 h-5 text-emerald-400" /> Commit to Schema
              </button>
              <button onClick={() => { setIsFieldModalOpen(false); setTempOptions([]); }} className="w-full py-4 text-slate-400 text-[10px] font-black uppercase tracking-widest">Cancel Induction</button>
            </div>
          </div>
        </div>
      )}

      {editingOptionsId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white rounded-[40px] p-10 md:p-14 max-w-xl w-full shadow-2xl animate-in zoom-in-95 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[60px] rounded-full" />
              <h3 className="text-2xl font-black text-slate-900 mb-8 tracking-tight">Configure Choices</h3>
              <div className="space-y-6">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Option Item</label>
                    <div className="flex gap-2">
                       <input 
                         className="flex-1 h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white focus:border-emerald-500/20 transition-all shadow-inner" 
                         placeholder="Type and enter..." 
                         value={optionInput} 
                         onChange={e => setOptionInput(e.target.value)} 
                         onKeyDown={handleOptionInputKeyDown}
                       />
                       <button onClick={addOptionTag} className="w-14 h-14 bg-[#064e3b] text-white rounded-2xl flex items-center justify-center hover:bg-black transition-all shadow-lg"><Plus className="w-6 h-6" /></button>
                    </div>
                 </div>
                 
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Live Registry</label>
                    <div className="flex flex-wrap gap-2 min-h-[120px] max-h-[300px] overflow-y-auto no-scrollbar p-6 bg-slate-50 rounded-[32px] border border-slate-100 shadow-inner">
                       {tempOptions.length === 0 ? (
                         <div className="flex flex-col items-center justify-center w-full gap-3 opacity-20 py-8">
                            <Tag className="w-8 h-8" />
                            <p className="text-[10px] font-black uppercase tracking-widest">No choices active</p>
                         </div>
                       ) : (
                         tempOptions.map(tag => (
                           <div key={tag} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-100 rounded-2xl shadow-sm group hover:border-red-100 transition-all animate-in zoom-in-95">
                              <span className="text-xs font-black text-slate-700">{tag}</span>
                              <button onClick={() => removeOptionTag(tag)} className="text-slate-300 hover:text-red-500 transition-colors"><X className="w-4 h-4" /></button>
                           </div>
                         ))
                       )}
                    </div>
                 </div>

                 <div className="flex gap-4 pt-4">
                    <button onClick={() => { setEditingOptionsId(null); setTempOptions([]); }} className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">Discard</button>
                    <button onClick={() => handleUpdateOptions(editingOptionsId)} className="flex-[2] py-5 bg-[#064e3b] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-emerald-900/10 active:scale-95">
                       <Save className="w-4 h-4 text-emerald-400" /> Synchronize Choices
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      <div className="space-y-6">
        {['Identity', 'Architecture', 'Logistics', 'Financials', 'Interests'].map(section => {
          const fields = formFields.filter(f => f.section === section);
          if (fields.length === 0) return null;
          return (
            <div key={section} className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
               <div className="p-8 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                    <FormInput className="w-4 h-4 text-emerald-500" /> {section} Parameters
                  </h3>
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{fields.length} Fields Active</span>
               </div>
               <div className="divide-y divide-slate-50">
                  {fields.map(f => (
                    <div key={f.id} className="p-6 md:p-8 flex items-center justify-between group transition-all hover:bg-slate-50/30">
                       <div className="flex items-center gap-6">
                          <div className="w-12 h-12 bg-white border border-slate-100 rounded-xl flex items-center justify-center shadow-sm">
                             <TypeIcon className="w-5 h-5 text-slate-300" />
                          </div>
                          <div>
                             <p className="text-[14px] font-black text-slate-900">{f.label}</p>
                             <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1 opacity-70">
                                KEY: {f.db_key} • TYPE: {f.type} 
                                {f.type === 'select' && ` • (${f.options?.length || 0} Options)`}
                             </p>
                          </div>
                       </div>
                       <div className="flex items-center gap-3">
                          {f.type === 'select' && (
                             <button onClick={() => { setEditingOptionsId(f.id); setTempOptions(f.options || []); setOptionInput(''); }} className="p-3 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all" title="Manage Options">
                                <Settings2 className="w-4 h-4" />
                             </button>
                          )}
                          <button onClick={() => toggleFieldVisibility(f.id)} className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border ${f.visible ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                             {f.visible ? <><ToggleRight className="w-4 h-4" /> Visible</> : <><ToggleLeft className="w-4 h-4" /> Hidden</>}
                          </button>
                          {!['client_name', 'phone', 'address', 'upazila'].includes(f.db_key) && (
                            <button onClick={() => deleteField(f.id)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                               <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // 3. PROFILE VIEW
  return (
    <div className="min-h-screen bg-[#f8fafc] pb-32 px-6 md:px-12 pt-12 animate-in slide-in-from-right-6 duration-500 max-w-4xl mx-auto">
      <header className="mb-12 flex items-center gap-6">
         {isAdmin && (
           <button onClick={() => setView('hub')} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:bg-slate-50 transition-all"><ArrowLeft className="w-5 h-5 text-slate-500" /></button>
         )}
         <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{isAdmin ? 'My Identity' : 'Account Settings'}</h1>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2 opacity-80">SECURE PROFILE MANAGEMENT</p>
         </div>
      </header>
      <div className="bg-white rounded-[48px] border border-slate-100 shadow-xl p-10 md:p-16 space-y-16 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-500/5 blur-[80px] rounded-full pointer-events-none" />
        <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
          <div className="relative group">
            <img src={localProfile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${localProfile.full_name || 'Arch'}`} className="w-32 h-32 md:w-40 md:h-40 rounded-[40px] bg-slate-50 border-4 border-white shadow-2xl object-cover transition-transform group-hover:scale-105" alt="Avatar" />
            <div className="absolute inset-0 bg-black/40 rounded-[40px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"><Camera className="w-8 h-8 text-white" /></div>
          </div>
          <div className="text-center md:text-left space-y-2">
            <h2 className="text-3xl font-black text-slate-900">{localProfile.full_name || 'System User'}</h2>
            <p className="text-[#064e3b] font-black uppercase tracking-[0.3em] text-[10px]">{localProfile.designation || 'Architectural Staff'}</p>
            <div className="flex items-center gap-2 mt-4 justify-center md:justify-start">
              <span className="px-3 py-1 bg-slate-50 text-slate-400 border border-slate-100 rounded-lg text-[9px] font-black uppercase tracking-widest">{localProfile.role}</span>
              <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${localProfile.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>{localProfile.status}</span>
            </div>
          </div>
        </div>
        <form onSubmit={handleUpdateProfile} className="space-y-12 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-slate-50">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Display Name</label>
              <div className="relative">
                <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input required className="w-full h-14 pl-12 pr-6 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white border border-slate-100 focus:border-emerald-500/20 transition-all shadow-inner" value={localProfile.full_name || ''} onChange={e => setLocalProfile({...localProfile, full_name: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Job Designation</label>
              <div className="relative">
                <Briefcase className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input className="w-full h-14 pl-12 pr-6 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white border border-slate-100 focus:border-emerald-500/20 transition-all shadow-inner" placeholder="e.g. Senior Architect" value={localProfile.designation || ''} onChange={e => setLocalProfile({...localProfile, designation: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Phone Link</label>
              <div className="relative">
                <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input className="w-full h-14 pl-12 pr-6 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white border border-slate-100 focus:border-emerald-500/20 transition-all shadow-inner" value={localProfile.phone || ''} onChange={e => setLocalProfile({...localProfile, phone: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Login Password</label>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input required type={showPassword ? 'text' : 'password'} className="w-full h-14 pl-12 pr-24 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white border border-slate-100 focus:border-emerald-500/20 transition-all shadow-inner" value={localProfile.login_password || ''} onChange={e => setLocalProfile({...localProfile, login_password: e.target.value})} />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="p-2 text-slate-300 hover:text-slate-600 transition-all">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                  <button type="button" onClick={generatePassword} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all" title="Generate Secure Password"><Wand2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Profile Image URL</label>
              <div className="relative">
                <ImageIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input className="w-full h-14 pl-12 pr-6 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white border border-slate-100 focus:border-emerald-500/20 transition-all shadow-inner" placeholder="https://images.unsplash.com/photo-..." value={localProfile.avatar_url || ''} onChange={e => setLocalProfile({...localProfile, avatar_url: e.target.value})} />
              </div>
            </div>
          </div>
          <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-100 flex items-start gap-4">
             <ShieldCheck className="w-6 h-6 text-emerald-500 shrink-0" />
             <p className="text-[10px] text-slate-500 font-medium leading-relaxed uppercase tracking-widest">Identity Guard: Credentials synchronized with firm vault.</p>
          </div>
          <button type="submit" disabled={saving} className="w-full py-7 bg-[#064e3b] text-white rounded-[28px] text-[12px] font-black uppercase tracking-[0.3em] shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50">
            {saving ? <RefreshCw className="animate-spin w-5 h-5" /> : <ShieldCheck className="w-5 h-5 text-emerald-400" />} 
            Finalize My Credentials
          </button>
        </form>
      </div>
    </div>
  );
};

export default Settings;