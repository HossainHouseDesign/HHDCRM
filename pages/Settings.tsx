
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Plus, Trash2, RefreshCw, Eye, EyeOff, Lock, ChevronRight, Users, 
  UserCircle, FormInput, ArrowLeft, Save, Shield, RotateCcw, 
  Mail, Phone, Briefcase, Camera, Tag, ListFilter, X, History,
  Type as TypeIcon, Wand2, ShieldCheck, User as UserIcon,
  Image as ImageIcon, ToggleLeft, ToggleRight, AlertTriangle, ListPlus,
  Settings2, CheckCircle2, Palette, Upload, Image as ImageLucide,
  FileCheck, Info, Database, ShieldAlert, ChevronDown, Check,
  Hash, Link as LinkIcon
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
  const [view, setView] = useState<'hub' | 'form' | 'profile' | 'branding'>('hub');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  // Profile state
  const [showPassword, setShowPassword] = useState(false);
  const [localProfile, setLocalProfile] = useState<Partial<Profile>>({});
  
  // Form Configuration state
  const [formFields, setFormFields] = useState<FormFieldConfig[]>([]);
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  
  // Branding state
  const [quotationBgUrl, setQuotationBgUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

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
      if (!isAdmin) {
        setView('profile');
      }
      fetchFormConfig();
      fetchBranding();
      setLoading(false);
    }
  }, [globalProfile, isAdmin]);

  const fetchFormConfig = async () => {
    try {
      const { data } = await supabase.from('settings').select('*').eq('key', 'lead_form_config').single();
      if (data && Array.isArray(data.value)) setFormFields(data.value);
      else setFormFields(DEFAULT_FORM_CONFIG);
    } catch (err) {
      setFormFields(DEFAULT_FORM_CONFIG);
    }
  };

  const fetchBranding = async () => {
    try {
      const { data } = await supabase.from('settings').select('*').eq('key', 'quotation_bg_url').single();
      if (data && data.value) setQuotationBgUrl(data.value);
    } catch (err) {
      console.error("Branding fetch failed:", err);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showNotification("Please upload an image file (JPG, PNG).", "error");
      return;
    }

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar_${globalProfile?.id}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('UserImage')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('UserImage')
        .getPublicUrl(filePath);

      setLocalProfile(prev => ({ ...prev, avatar_url: publicUrl }));
      showNotification("Photo uploaded. Save to finish.", "success");
    } catch (err: any) {
      showNotification(err.message || "Failed to upload photo.", "error");
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const userId = globalProfile?.id;
      if (!userId) throw new Error("Verification failed.");
      const { error } = await supabase.from('profiles').update({
        full_name: localProfile.full_name?.trim() || null,
        designation: localProfile.designation?.trim() || null,
        phone: localProfile.phone?.trim() || null,
        login_password: localProfile.login_password || null,
        avatar_url: localProfile.avatar_url?.trim() || null,
        updated_at: new Date().toISOString()
      }).eq('id', userId);
      if (error) throw error;
      showNotification("Account details saved.", "success");
      await refreshUser();
      if (isAdmin) setView('hub');
    } catch (err: any) { 
      showNotification(err.message, "error"); 
    } finally { 
      setSaving(false); 
    }
  };

  const saveFormConfig = async (updatedFields: FormFieldConfig[]) => {
    setSaving(true);
    try {
      const { error } = await supabase.from('settings').upsert({
        key: 'lead_form_config',
        value: updatedFields,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
      if (error) throw error;
      setFormFields(updatedFields);
      showNotification("Lead form updated.", "success");
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleFieldVisibility = (id: string) => {
    const updated = formFields.map(f => f.id === id ? { ...f, visible: !f.visible } : f);
    saveFormConfig(updated);
  };

  const deleteField = (id: string) => {
    const field = formFields.find(f => f.id === id);
    if (['client_name', 'phone', 'address', 'upazila'].includes(field?.db_key || '')) {
      showNotification("Cannot delete required fields.", "warning");
      return;
    }
    const updated = formFields.filter(f => f.id !== id);
    saveFormConfig(updated);
  };

  const addOptionTag = () => {
    if (!optionInput.trim()) return;
    const clean = optionInput.trim();
    if (!tempOptions.includes(clean)) setTempOptions([...tempOptions, clean]);
    setOptionInput('');
  };

  const removeOptionTag = (tag: string) => {
    setTempOptions(tempOptions.filter(t => t !== tag));
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
    saveFormConfig([...formFields, field]);
    setIsFieldModalOpen(false);
    setTempOptions([]);
    setNewField({ label: '', type: 'text', section: 'Architecture', required: false, visible: true, options: [] });
  };

  const openOptionsEditor = (field: FormFieldConfig) => {
    setEditingOptionsId(field.id);
    setTempOptions(field.options || []);
  };

  const handleUpdateOptions = () => {
    if (!editingOptionsId) return;
    const updated = formFields.map(f => f.id === editingOptionsId ? { ...f, options: tempOptions } : f);
    saveFormConfig(updated);
    setEditingOptionsId(null);
    setTempOptions([]);
  };

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let pass = "";
    for (let i = 0; i < 10; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
    setLocalProfile(prev => ({ ...prev, login_password: pass }));
    setShowPassword(true);
  };

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-6">
       <RefreshCw className="w-10 h-10 text-[#064e3b] animate-spin" />
       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Account...</p>
    </div>
  );

  // 1. ADMIN HUB VIEW
  if (view === 'hub' && isAdmin) return (
    <div className="min-h-screen bg-[#f8fafc] pb-32 px-4 md:px-6 pt-8 md:pt-10 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <header className="mb-8 md:mb-10">
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase leading-none">Settings Hub</h1>
        <p className="text-slate-400 text-[8px] font-black uppercase tracking-widest mt-2 opacity-80 leading-none">MANAGE FIRM DETAILS & USERS</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <button onClick={() => setView('form')} className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm text-left group hover:border-slate-900 transition-all hover:bg-slate-50/50">
          <div className="w-12 h-12 bg-slate-100 text-slate-900 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><FormInput className="w-6 h-6" /></div>
          <h3 className="text-base font-black text-slate-900 mb-1 uppercase tracking-tight">Lead Logic</h3>
          <p className="text-[10px] text-slate-400 font-bold leading-tight uppercase opacity-60">Fields & Dropdowns</p>
          <div className="mt-6 flex items-center gap-1.5 text-slate-900 text-[8px] font-black uppercase tracking-widest leading-none">Configure <ChevronRight className="w-3 h-3" /></div>
        </button>
        <button onClick={() => setView('branding')} className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm text-left group hover:border-slate-900 transition-all hover:bg-slate-50/50">
          <div className="w-12 h-12 bg-slate-100 text-slate-900 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Palette className="w-6 h-6" /></div>
          <h3 className="text-base font-black text-slate-900 mb-1 uppercase tracking-tight">Firm Identity</h3>
          <p className="text-[10px] text-slate-400 font-bold leading-tight uppercase opacity-60">Logos & Assets</p>
          <div className="mt-6 flex items-center gap-1.5 text-slate-900 text-[8px] font-black uppercase tracking-widest leading-none">Customize <ChevronRight className="w-3 h-3" /></div>
        </button>
        <button onClick={() => setView('profile')} className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm text-left group hover:border-slate-900 transition-all hover:bg-slate-50/50">
          <div className="w-12 h-12 bg-slate-100 text-slate-900 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><UserCircle className="w-6 h-6" /></div>
          <h3 className="text-base font-black text-slate-900 mb-1 uppercase tracking-tight">Operator Profile</h3>
          <p className="text-[10px] text-slate-400 font-bold leading-tight uppercase opacity-60">Account Security</p>
          <div className="mt-6 flex items-center gap-1.5 text-slate-900 text-[8px] font-black uppercase tracking-widest leading-none">Manage <ChevronRight className="w-3 h-3" /></div>
        </button>
      </div>
      <div className="mt-8 flex justify-between items-center border-t border-slate-100 pt-6">
        <Link to="/settings/recycle-bin" className="flex items-center gap-3 text-slate-300 hover:text-slate-900 transition-all text-[9px] font-black uppercase tracking-widest leading-none">
           <History className="w-4 h-4" /> COMPACT ARCHIVE (RECYCLE BIN)
        </Link>
      </div>
    </div>
  );

  // 2. LEAD FORM SETTING VIEW
  if (view === 'form' && isAdmin) {
    const sections = Array.from(new Set(formFields.filter(f => f && f.section).map(f => f.section)));
    return (
      <div className="min-h-screen bg-[#f8fafc] pb-32 px-4 md:px-6 pt-8 md:pt-10 animate-in slide-in-from-right-6 duration-500 max-w-4xl mx-auto">
        <header className="mb-8 flex flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setView('hub')} className="w-10 h-10 bg-white border border-slate-200 rounded-xl shadow-none hover:bg-slate-50 transition-all leading-none flex items-center justify-center"><ArrowLeft className="w-4 h-4 text-slate-500" /></button>
            <div className="leading-none">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">Form Logic</h1>
              <p className="text-slate-400 text-[8px] font-black uppercase tracking-widest mt-1.5 opacity-80 leading-none">CONFIGURE CLIENT DATA INPUTS</p>
            </div>
          </div>
          <button onClick={() => setIsFieldModalOpen(true)} className="px-5 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-none flex items-center gap-2 leading-none hover:bg-black transition-all">
             <Plus className="w-4 h-4 text-emerald-400" /> New Field
          </button>
        </header>

        <div className="space-y-6">
          {sections.map(section => (
            <div key={section || 'general'} className="bg-white rounded-2xl border border-slate-200 shadow-none overflow-hidden">
               <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                  <h3 className="text-[9px] font-black text-slate-900 uppercase tracking-widest">{section} Segment</h3>
               </div>
               <div className="divide-y divide-slate-50">
                  {formFields.filter(f => f && f.section === section).map(field => (
                    <div key={field.id} className="px-6 py-2.5 flex flex-row justify-between items-center gap-4 hover:bg-slate-50/50 transition-colors group">
                       <div className="flex items-center gap-4 min-w-0">
                          <div className="w-8 h-8 bg-slate-50 text-slate-300 rounded-lg flex items-center justify-center font-black flex-shrink-0">
                             {field.type === 'select' ? <ListFilter className="w-4 h-4" /> : field.type === 'number' ? <Hash className="w-4 h-4" /> : <TypeIcon className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0 leading-none">
                             <p className="text-[13px] font-black text-slate-900 uppercase truncate tracking-tight leading-none">{field.label}</p>
                             <p className="text-[8px] text-slate-300 font-bold uppercase tracking-widest mt-1.5 leading-none">SCHEMA: {field.type?.toUpperCase() || 'TEXT'}</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-2 leading-none">
                          {field.type === 'select' && (
                            <button onClick={() => openOptionsEditor(field)} className="px-2.5 py-1 bg-slate-50 text-slate-400 rounded-md text-[7px] font-black uppercase tracking-widest border border-slate-100 hover:bg-slate-100 transition-colors">
                               {field.options?.length || 0} ENUMS
                            </button>
                          )}
                          <button onClick={() => toggleFieldVisibility(field.id)} className={`p-1.5 rounded-md transition-all ${field.visible ? 'text-emerald-600' : 'text-slate-200 hover:text-slate-400'}`}>
                             {field.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => deleteField(field.id)} className="p-1.5 text-slate-100 hover:text-red-500 transition-colors">
                             <Trash2 className="w-3.5 h-3.5" />
                          </button>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          ))}
        </div>

        {isFieldModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
             <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 leading-none">
                <div className="flex justify-between items-start mb-6">
                   <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">New Record Entry</h3>
                   <button onClick={() => setIsFieldModalOpen(false)} className="p-1.5 text-slate-300 hover:text-slate-900 transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-4">
                   <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Label Identity</label>
                      <input className="w-full h-11 px-5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 outline-none focus:bg-white transition-all shadow-none uppercase" value={newField.label} onChange={e => setNewField({...newField, label: e.target.value})} />
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                         <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Input Schema</label>
                         <select className="w-full h-11 px-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold uppercase tracking-tight outline-none cursor-pointer" value={newField.type} onChange={e => setNewField({...newField, type: e.target.value as FieldType})}>
                            <option value="text">Textual</option>
                            <option value="number">Numeric</option>
                            <option value="select">Selection</option>
                            <option value="textarea">Extended</option>
                            <option value="checkbox">Boolean</option>
                         </select>
                      </div>
                      <div className="space-y-1.5">
                         <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Category</label>
                         <select className="w-full h-11 px-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold uppercase tracking-tight outline-none cursor-pointer" value={newField.section} onChange={e => setNewField({...newField, section: e.target.value})}>
                            <option value="Identity">Identity</option>
                            <option value="Architecture">Design</option>
                            <option value="Logistics">Site</option>
                            <option value="Financials">Financial</option>
                            <option value="Interests">Interests</option>
                         </select>
                      </div>
                   </div>
                   {newField.type === 'select' && (
                      <div className="p-4 bg-slate-50 rounded-2xl space-y-3 border border-slate-100">
                         <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Manage Enum Tags</p>
                         <div className="flex gap-2">
                            <input className="flex-1 h-9 px-4 bg-white border border-slate-100 rounded-lg text-[12px] font-bold outline-none uppercase" placeholder="TAG NAME..." value={optionInput} onChange={e => setOptionInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addOptionTag()} />
                            <button onClick={addOptionTag} className="w-9 h-9 bg-slate-900 text-white rounded-lg flex items-center justify-center hover:bg-black transition-all flex-shrink-0"><Plus className="w-4 h-4" /></button>
                         </div>
                         <div className="flex flex-wrap gap-1.5">
                            {tempOptions.map(t => <span key={t} className="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-[9px] font-black uppercase flex items-center gap-1.5 tracking-tight">{t} <button onClick={() => removeOptionTag(t)} className="text-slate-300 hover:text-red-500 transition-colors"><X className="w-3 h-3" /></button></span>)}
                         </div>
                      </div>
                   )}
                   <button onClick={addNewField} className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-none hover:bg-black transition-all active:scale-95 leading-none">Commit Schema</button>
                </div>
             </div>
          </div>
        )}

        {editingOptionsId && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
             <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl leading-none">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-6 leading-none">Refine Enums</h3>
                <div className="space-y-4">
                   <div className="flex gap-2">
                      <input className="flex-1 h-11 px-5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none uppercase" placeholder="NEW TAG..." value={optionInput} onChange={e => setOptionInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addOptionTag()} />
                      <button onClick={addOptionTag} className="w-11 h-11 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-black transition-all flex-shrink-0"><Plus className="w-5 h-5 text-emerald-400" /></button>
                   </div>
                   <div className="max-h-52 overflow-y-auto no-scrollbar space-y-1.5">
                      {tempOptions.map(t => (
                        <div key={t} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl group border border-transparent hover:border-slate-100 transition-all leading-none">
                           <span className="text-[12px] font-black text-slate-700 uppercase tracking-tight leading-none">{t}</span>
                           <button onClick={() => removeOptionTag(t)} className="text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><X className="w-4 h-4" /></button>
                        </div>
                      ))}
                   </div>
                   <div className="flex gap-3 pt-2">
                      <button onClick={() => setEditingOptionsId(null)} className="flex-1 py-3.5 bg-slate-50 text-slate-400 border border-slate-100 rounded-xl font-black uppercase text-[9px] tracking-widest leading-none">Cancel</button>
                      <button onClick={handleUpdateOptions} className="flex-1 py-3.5 bg-slate-900 text-white rounded-xl font-black uppercase text-[9px] tracking-widest leading-none flex items-center justify-center gap-2 active:scale-95"><Check className="w-3.5 h-3.5 text-emerald-400" /> Confirm</button>
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>
    );
  }

  // Profile view
  return (
    <div className="min-h-screen bg-[#f8fafc] pb-32 px-4 md:px-6 pt-8 md:pt-10 animate-in slide-in-from-bottom-6 duration-500 max-w-3xl mx-auto">
      <header className="mb-8 flex flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => isAdmin ? setView('hub') : navigate('/')} className="w-10 h-10 bg-white border border-slate-200 rounded-xl shadow-none hover:bg-slate-50 transition-all leading-none flex items-center justify-center"><ArrowLeft className="w-4 h-4 text-slate-500" /></button>
          <div className="leading-none">
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">Profile Logic</h1>
            <p className="text-slate-400 text-[8px] font-black uppercase tracking-widest mt-1.5 opacity-80 leading-none">MANAGE OPERATOR IDENTITY</p>
          </div>
        </div>
      </header>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-none overflow-hidden transition-all">
         <div className="h-28 md:h-32 bg-slate-900 relative">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
            
            <div className="absolute -bottom-10 md:-bottom-12 left-6 md:left-10 flex flex-row items-end gap-5">
               <div className="relative group shadow-none rounded-2xl border-4 border-white bg-white">
                  <img 
                    src={localProfile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${localProfile.email || 'User'}`} 
                    className={`w-24 h-24 md:w-28 md:h-28 rounded-xl bg-slate-50 object-cover transition-all ${uploadingAvatar ? 'opacity-40 grayscale' : 'group-hover:opacity-90'}`} 
                    alt="Profile" 
                  />
                  {uploadingAvatar && (
                    <div className="absolute inset-0 flex items-center justify-center">
                       <RefreshCw className="w-6 h-6 text-slate-900 animate-spin" />
                    </div>
                  )}
                  <button 
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-lg shadow-md flex items-center justify-center text-slate-900 hover:bg-slate-900 hover:text-white transition-all border border-slate-200"
                    title="Upload Identity Photo"
                  >
                     <Camera className="w-4 h-4" />
                  </button>
                  <input 
                    type="file" 
                    className="hidden" 
                    ref={avatarInputRef} 
                    accept="image/png, image/jpeg, image/webp" 
                    onChange={handleAvatarUpload} 
                  />
               </div>
               
               <div className="mb-1 leading-none">
                  <h2 className="text-lg font-black text-white leading-none uppercase tracking-tight truncate max-w-[150px] md:max-w-xs">{localProfile.full_name || 'OPERATOR'}</h2>
                  <p className="text-slate-400 text-[8px] font-black uppercase tracking-widest mt-1.5 leading-none">{localProfile.designation || 'STAFF UNIT'}</p>
               </div>
            </div>
         </div>

         <div className="pt-16 md:pt-20 pb-8 px-6 md:px-10">
            <form onSubmit={handleUpdateProfile} className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Full Name</label>
                     <div className="relative group">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-slate-900 transition-colors" />
                        <input required className="w-full h-11 pl-11 pr-5 bg-white border border-slate-200 rounded-xl text-[13px] font-bold text-slate-700 outline-none focus:border-slate-900 transition-all shadow-none uppercase" value={localProfile.full_name || ''} onChange={e => setLocalProfile({...localProfile, full_name: e.target.value})} />
                     </div>
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Designation</label>
                     <div className="relative group">
                        <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-slate-900 transition-colors" />
                        <input className="w-full h-11 pl-11 pr-5 bg-white border border-slate-200 rounded-xl text-[13px] font-bold text-slate-700 outline-none focus:border-slate-900 transition-all shadow-none uppercase" placeholder="e.g. Media Manager" value={localProfile.designation || ''} onChange={e => setLocalProfile({...localProfile, designation: e.target.value})} />
                     </div>
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Contact Phone</label>
                     <div className="relative group">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-slate-900 transition-colors" />
                        <input className="w-full h-11 pl-11 pr-5 bg-white border border-slate-200 rounded-xl text-[13px] font-bold text-slate-700 outline-none focus:border-slate-900 transition-all shadow-none" value={localProfile.phone || ''} onChange={e => setLocalProfile({...localProfile, phone: e.target.value})} />
                     </div>
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Identity Link (Photo)</label>
                     <div className="relative group">
                        <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-slate-900 transition-colors" />
                        <input className="w-full h-11 pl-11 pr-20 bg-white border border-slate-200 rounded-xl text-[13px] font-bold text-slate-700 outline-none focus:border-slate-900 transition-all shadow-none" placeholder="Paste link..." value={localProfile.avatar_url || ''} onChange={e => setLocalProfile({...localProfile, avatar_url: e.target.value})} />
                        <button 
                          type="button"
                          onClick={() => avatarInputRef.current?.click()}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 px-3 bg-slate-50 border border-slate-100 rounded-lg text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 hover:bg-white transition-all flex items-center gap-1 leading-none"
                        >
                           <Upload className="w-3 h-3" /> UID
                        </button>
                     </div>
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Operator Credentials</label>
                     <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-slate-900 transition-colors" />
                        <input type={showPassword ? 'text' : 'password'} className="w-full h-11 pl-11 pr-20 bg-white border border-slate-200 rounded-xl text-[13px] font-bold text-slate-700 outline-none focus:border-slate-900 transition-all shadow-none" value={localProfile.login_password || ''} onChange={e => setLocalProfile({...localProfile, login_password: e.target.value})} />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                           <button type="button" onClick={() => setShowPassword(!showPassword)} className="p-2 text-slate-200 hover:text-slate-900 transition-colors">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                           <button type="button" onClick={generatePassword} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all" title="Regenerate credentials"><RefreshCw className="w-4 h-4" /></button>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-50">
                  <button type="submit" disabled={saving} className="flex-1 py-4 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-none hover:bg-black transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 leading-none">
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> : <Save className="w-4 h-4 text-emerald-400" />} Commit Updates
                  </button>
                  <button type="button" onClick={() => isAdmin ? setView('hub') : navigate('/')} className="px-8 py-4 bg-white text-slate-300 rounded-xl text-[9px] font-black uppercase tracking-widest hover:text-slate-900 hover:bg-slate-50 transition-all border border-slate-200 leading-none">Dismiss</button>
               </div>
            </form>
         </div>
      </div>
    </div>
  );
};

export default Settings;
