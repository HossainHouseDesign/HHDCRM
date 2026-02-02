
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
    <div className="min-h-screen bg-[#f8fafc] pb-32 px-6 md:px-12 pt-12 animate-in fade-in duration-500 max-w-6xl mx-auto">
      <header className="mb-16">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Settings Hub</h1>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em] mt-2 opacity-80">MANAGE FIRM DETAILS & USERS</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <button onClick={() => setView('form')} className="p-10 bg-white border border-slate-100 rounded-[48px] shadow-sm text-left group hover:border-emerald-500 transition-all hover:-translate-y-1">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-[28px] flex items-center justify-center mb-8 group-hover:scale-110 transition-transform"><FormInput className="w-8 h-8" /></div>
          <h3 className="text-xl font-black text-slate-900 mb-2">Lead Form Details</h3>
          <p className="text-xs text-slate-400 font-medium leading-relaxed">Customize input fields and dropdown options.</p>
          <div className="mt-8 flex items-center gap-2 text-emerald-600 text-[10px] font-black uppercase tracking-widest">Edit Form <ChevronRight className="w-3 h-3" /></div>
        </button>
        <button onClick={() => setView('branding')} className="p-10 bg-white border border-slate-100 rounded-[48px] shadow-sm text-left group hover:border-purple-500 transition-all hover:-translate-y-1">
          <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-[28px] flex items-center justify-center mb-8 group-hover:scale-110 transition-transform"><Palette className="w-8 h-8" /></div>
          <h3 className="text-xl font-black text-slate-900 mb-2">Company Branding</h3>
          <p className="text-xs text-slate-400 font-medium leading-relaxed">Update logos and document backgrounds.</p>
          <div className="mt-8 flex items-center gap-2 text-purple-600 text-[10px] font-black uppercase tracking-widest">Edit Branding <ChevronRight className="w-3 h-3" /></div>
        </button>
        <button onClick={() => setView('profile')} className="p-10 bg-white border border-slate-100 rounded-[48px] shadow-sm text-left group hover:border-blue-500 transition-all hover:-translate-y-1">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-[28px] flex items-center justify-center mb-8 group-hover:scale-110 transition-transform"><UserCircle className="w-8 h-8" /></div>
          <h3 className="text-xl font-black text-slate-900 mb-2">My Profile</h3>
          <p className="text-xs text-slate-400 font-medium leading-relaxed">Change your info, photo and password.</p>
          <div className="mt-8 flex items-center gap-2 text-blue-600 text-[10px] font-black uppercase tracking-widest">Edit Account <ChevronRight className="w-3 h-3" /></div>
        </button>
      </div>
      <div className="mt-12 flex justify-between items-center">
        <Link to="/settings/recycle-bin" className="flex items-center gap-4 text-slate-400 hover:text-red-500 transition-all text-[11px] font-black uppercase tracking-widest">
           <History className="w-5 h-5" /> Deleted Records (Trash)
        </Link>
      </div>
    </div>
  );

  // 2. LEAD FORM SETTING VIEW
  if (view === 'form' && isAdmin) {
    const sections = Array.from(new Set(formFields.filter(f => f && f.section).map(f => f.section)));
    return (
      <div className="min-h-screen bg-[#f8fafc] pb-32 px-6 md:px-12 pt-12 animate-in slide-in-from-right-6 duration-500 max-w-5xl mx-auto">
        <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="flex items-center gap-6">
            <button onClick={() => setView('hub')} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:bg-slate-50 transition-all"><ArrowLeft className="w-5 h-5 text-slate-500" /></button>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Form Settings</h1>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">CONFIGURE CLIENT DATA INPUTS</p>
            </div>
          </div>
          <button onClick={() => setIsFieldModalOpen(true)} className="px-8 py-4 bg-[#064e3b] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-3">
             <Plus className="w-4 h-4" /> Add Field
          </button>
        </header>

        <div className="space-y-12">
          {sections.map(section => (
            <div key={section || 'general'} className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
               <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">{section} Section</h3>
               </div>
               <div className="divide-y divide-slate-50">
                  {formFields.filter(f => f && f.section === section).map(field => (
                    <div key={field.id} className="p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:bg-slate-50/50 transition-colors group">
                       <div className="flex items-center gap-6">
                          <div className="w-12 h-12 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-300">
                             {field.type === 'select' ? <ListFilter className="w-5 h-5" /> : field.type === 'number' ? <Hash className="w-5 h-5" /> : <TypeIcon className="w-5 h-5" />}
                          </div>
                          <div>
                             <p className="text-sm font-black text-slate-900">{field.label}</p>
                             <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Type: {field.type?.toUpperCase() || 'TEXT'}</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-4">
                          {field.type === 'select' && (
                            <button onClick={() => openOptionsEditor(field)} className="px-4 py-2 bg-purple-50 text-purple-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-purple-100">
                               {field.options?.length || 0} Choices
                            </button>
                          )}
                          <button onClick={() => toggleFieldVisibility(field.id)} className={`p-3 rounded-xl transition-all ${field.visible ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                             {field.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                          <button onClick={() => deleteField(field.id)} className="p-3 text-slate-300 hover:text-red-500 transition-colors">
                             <Trash2 className="w-4 h-4" />
                          </button>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          ))}
        </div>

        {isFieldModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
             <div className="bg-white rounded-[40px] p-10 max-lg w-full shadow-2xl animate-in zoom-in-95">
                <div className="flex justify-between items-start mb-10">
                   <h3 className="text-2xl font-black text-slate-900">New Form Field</h3>
                   <button onClick={() => setIsFieldModalOpen(false)} className="p-2 text-slate-300 hover:text-slate-900"><X className="w-6 h-6" /></button>
                </div>
                <div className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Field Name</label>
                      <input className="w-full h-14 px-6 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white" value={newField.label} onChange={e => setNewField({...newField, label: e.target.value})} />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Input Type</label>
                         <select className="w-full h-14 px-4 bg-slate-50 rounded-2xl font-bold" value={newField.type} onChange={e => setNewField({...newField, type: e.target.value as FieldType})}>
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="select">Dropdown</option>
                            <option value="textarea">Large Text</option>
                            <option value="checkbox">Yes/No Checkbox</option>
                         </select>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Section</label>
                         <select className="w-full h-14 px-4 bg-slate-50 rounded-2xl font-bold" value={newField.section} onChange={e => setNewField({...newField, section: e.target.value})}>
                            <option value="Identity">Identity</option>
                            <option value="Architecture">Architecture</option>
                            <option value="Logistics">Logistics</option>
                            <option value="Financials">Financials</option>
                            <option value="Interests">Interests</option>
                         </select>
                      </div>
                   </div>
                   {newField.type === 'select' && (
                      <div className="p-6 bg-slate-50 rounded-3xl space-y-4">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Manage Options</p>
                         <div className="flex gap-2">
                            <input className="flex-1 h-12 px-4 bg-white rounded-xl text-sm font-bold" placeholder="New option..." value={optionInput} onChange={e => setOptionInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addOptionTag()} />
                            <button onClick={addOptionTag} className="p-3 bg-emerald-600 text-white rounded-xl"><Plus className="w-5 h-5" /></button>
                         </div>
                         <div className="flex flex-wrap gap-2">
                            {tempOptions.map(t => <span key={t} className="px-3 py-1.5 bg-white border border-slate-100 rounded-lg text-[10px] font-bold flex items-center gap-2">{t} <button onClick={() => removeOptionTag(t)}><X className="w-3 h-3 text-red-400" /></button></span>)}
                         </div>
                      </div>
                   )}
                   <button onClick={addNewField} className="w-full py-6 bg-[#064e3b] text-white rounded-[24px] font-black uppercase tracking-widest shadow-xl">Save Field</button>
                </div>
             </div>
          </div>
        )}

        {editingOptionsId && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
             <div className="bg-white rounded-[40px] p-10 max-w-lg w-full shadow-2xl">
                <h3 className="text-xl font-black text-slate-900 mb-8">Edit Dropdown Options</h3>
                <div className="space-y-6">
                   <div className="flex gap-2">
                      <input className="flex-1 h-14 px-6 bg-slate-50 rounded-2xl font-bold" placeholder="Add choice..." value={optionInput} onChange={e => setOptionInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addOptionTag()} />
                      <button onClick={addOptionTag} className="px-6 bg-slate-900 text-white rounded-2xl"><Plus className="w-5 h-5" /></button>
                   </div>
                   <div className="max-h-64 overflow-y-auto no-scrollbar space-y-2">
                      {tempOptions.map(t => (
                        <div key={t} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl group">
                           <span className="text-sm font-bold text-slate-700">{t}</span>
                           <button onClick={() => removeOptionTag(t)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><X className="w-4 h-4" /></button>
                        </div>
                      ))}
                   </div>
                   <div className="flex gap-4">
                      <button onClick={() => setEditingOptionsId(null)} className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase text-[10px]">Cancel</button>
                      <button onClick={handleUpdateOptions} className="flex-1 py-5 bg-[#064e3b] text-white rounded-2xl font-black uppercase text-[10px]">Save Changes</button>
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
    <div className="min-h-screen bg-[#f8fafc] pb-32 px-4 md:px-12 pt-8 md:pt-12 animate-in slide-in-from-bottom-6 duration-500 max-w-4xl mx-auto">
      <header className="mb-10 md:mb-12 flex items-center gap-6">
        <button onClick={() => isAdmin ? setView('hub') : navigate('/')} className="p-3 md:p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:bg-slate-50 transition-all"><ArrowLeft className="w-5 h-5 text-slate-500" /></button>
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Account Settings</h1>
          <p className="text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] mt-1.5">MANAGE YOUR PERSONAL DETAILS</p>
        </div>
      </header>

      <div className="bg-white rounded-[40px] md:rounded-[48px] border border-slate-100 shadow-xl overflow-hidden">
         <div className="h-40 md:h-48 bg-[#064e3b] relative">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />
            
            <div className="absolute -bottom-14 md:-bottom-16 left-6 md:left-12 flex flex-col md:flex-row items-end md:items-center gap-6">
               <div className="relative group shadow-2xl rounded-[48px]">
                  <img 
                    src={localProfile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${localProfile.email || 'User'}`} 
                    className={`w-32 h-32 md:w-40 md:h-40 rounded-[40px] md:rounded-[48px] border-8 border-white bg-white object-cover transition-all ${uploadingAvatar ? 'opacity-40 grayscale' : 'group-hover:opacity-90'}`} 
                    alt="Profile" 
                  />
                  {uploadingAvatar && (
                    <div className="absolute inset-0 flex items-center justify-center">
                       <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
                    </div>
                  )}
                  <button 
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 w-10 h-10 md:w-12 md:h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center text-emerald-600 hover:bg-[#064e3b] hover:text-white transition-all border border-slate-100"
                    title="Upload Profile Picture"
                  >
                     <Camera className="w-5 h-5 md:w-6 md:h-6" />
                  </button>
                  <input 
                    type="file" 
                    className="hidden" 
                    ref={avatarInputRef} 
                    accept="image/png, image/jpeg, image/webp" 
                    onChange={handleAvatarUpload} 
                  />
               </div>
               
               <div className="hidden md:block mb-6">
                  <h2 className="text-2xl font-black text-white leading-tight drop-shadow-md">{localProfile.full_name || 'Member Profile'}</h2>
                  <p className="text-emerald-100/60 text-[10px] font-black uppercase tracking-widest">{localProfile.designation || 'Operational Staff'}</p>
               </div>
            </div>
         </div>

         <div className="pt-24 md:pt-28 pb-10 md:pb-14 px-6 md:px-12">
            <form onSubmit={handleUpdateProfile} className="space-y-10 md:space-y-12">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
                  <div className="space-y-2.5">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                     <div className="relative group">
                        <UserIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                        <input required className="w-full h-14 md:h-16 pl-14 pr-6 bg-slate-50 border border-slate-100 rounded-2xl md:rounded-[24px] font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 transition-all shadow-inner" value={localProfile.full_name || ''} onChange={e => setLocalProfile({...localProfile, full_name: e.target.value})} />
                     </div>
                  </div>
                  <div className="space-y-2.5">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Job Title</label>
                     <div className="relative group">
                        <Briefcase className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                        <input className="w-full h-14 md:h-16 pl-14 pr-6 bg-slate-50 border border-slate-100 rounded-2xl md:rounded-[24px] font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 transition-all shadow-inner" placeholder="e.g. Media Manager" value={localProfile.designation || ''} onChange={e => setLocalProfile({...localProfile, designation: e.target.value})} />
                     </div>
                  </div>
                  <div className="space-y-2.5">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                     <div className="relative group">
                        <Phone className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                        <input className="w-full h-14 md:h-16 pl-14 pr-6 bg-slate-50 border border-slate-100 rounded-2xl md:rounded-[24px] font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 transition-all shadow-inner" value={localProfile.phone || ''} onChange={e => setLocalProfile({...localProfile, phone: e.target.value})} />
                     </div>
                  </div>
                  <div className="space-y-2.5">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Profile Image Link</label>
                     <div className="relative group">
                        <LinkIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                        <input className="w-full h-14 md:h-16 pl-14 pr-24 bg-slate-50 border border-slate-100 rounded-2xl md:rounded-[24px] font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 transition-all shadow-inner" placeholder="Paste link or upload ->" value={localProfile.avatar_url || ''} onChange={e => setLocalProfile({...localProfile, avatar_url: e.target.value})} />
                        <button 
                          type="button"
                          onClick={() => avatarInputRef.current?.click()}
                          className="absolute right-3 top-1/2 -translate-y-1/2 h-10 px-4 bg-white border border-slate-100 rounded-xl text-[9px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50 transition-all flex items-center gap-2"
                        >
                           <Upload className="w-3.5 h-3.5" /> Upload
                        </button>
                     </div>
                  </div>
                  <div className="space-y-2.5 md:col-span-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account Password</label>
                     <div className="relative group">
                        <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                        <input type={showPassword ? 'text' : 'password'} className="w-full h-14 md:h-16 pl-14 pr-24 bg-slate-50 border border-slate-100 rounded-2xl md:rounded-[24px] font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 transition-all shadow-inner" value={localProfile.login_password || ''} onChange={e => setLocalProfile({...localProfile, login_password: e.target.value})} />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                           <button type="button" onClick={() => setShowPassword(!showPassword)} className="p-2 text-slate-300 hover:text-slate-900 transition-colors">{showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}</button>
                           <button type="button" onClick={generatePassword} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all" title="Generate New Password"><RefreshCw className="w-4.5 h-4.5" /></button>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="flex flex-col sm:flex-row gap-4 md:gap-6 pt-4 border-t border-slate-50">
                  <button type="submit" disabled={saving} className="flex-1 py-6 md:py-7 bg-[#064e3b] text-white rounded-2xl md:rounded-[28px] text-[11px] md:text-[12px] font-black uppercase tracking-[0.4em] shadow-xl hover:bg-black transition-all flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50">
                    {saving ? <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" /> : <Save className="w-5 h-5 text-emerald-400" />} Save Changes
                  </button>
                  <button type="button" onClick={() => isAdmin ? setView('hub') : navigate('/')} className="px-10 py-6 md:py-7 bg-white text-slate-400 rounded-2xl md:rounded-[28px] text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all border border-slate-100">Cancel</button>
               </div>
            </form>
         </div>
      </div>
    </div>
  );
};

export default Settings;
