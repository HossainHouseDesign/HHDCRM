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
  
  // Profile state
  const [showPassword, setShowPassword] = useState(false);
  const [localProfile, setLocalProfile] = useState<Partial<Profile>>({});
  
  // Form Schema state
  const [formFields, setFormFields] = useState<FormFieldConfig[]>([]);
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  
  // Branding state
  const [quotationBgUrl, setQuotationBgUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      // Auto-navigate staff to profile view
      if (!isAdmin) {
        setView('profile');
      }
      fetchSchema();
      fetchBranding();
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

  const fetchBranding = async () => {
    try {
      const { data } = await supabase.from('settings').select('*').eq('key', 'quotation_bg_url').single();
      if (data && data.value) setQuotationBgUrl(data.value);
    } catch (err) {
      console.error("Branding fetch failed:", err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showNotification("Invalid format. Please upload an image file (JPG/PNG).", "error");
      return;
    }

    setSaving(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `quotation_bg_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('HHDCRM')
        .upload(filePath, file);

      if (uploadError) {
        if (uploadError.message.includes('not found')) {
          throw new Error("Supabase Error: 'HHDCRM' bucket not found.");
        }
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('HHDCRM')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase.from('settings').upsert({
        key: 'quotation_bg_url',
        value: publicUrl,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

      if (updateError) throw updateError;

      setQuotationBgUrl(publicUrl);
      showNotification("Architectural branding layer synchronized.", "success");
    } catch (err: any) {
      showNotification(err.message || "File upload protocol failure.", "error");
    } finally {
      setSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveBranding = async () => {
    if (!confirm("Are you sure you want to revert to the default minimal letterhead?")) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('settings').upsert({ 
        key: 'quotation_bg_url', 
        value: "", 
        updated_at: new Date().toISOString() 
      }, { onConflict: 'key' });
      if (error) throw error;
      setQuotationBgUrl("");
      showNotification("Branding layer detached.", "info");
    } catch (err: any) {
      showNotification(`Removal Failed: ${err.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const userId = globalProfile?.id;
      if (!userId) throw new Error("Security check failed.");
      const { error } = await supabase.from('profiles').update({
        full_name: localProfile.full_name?.trim() || null,
        designation: localProfile.designation?.trim() || null,
        phone: localProfile.phone?.trim() || null,
        login_password: localProfile.login_password || null,
        avatar_url: localProfile.avatar_url?.trim() || null,
        updated_at: new Date().toISOString()
      }).eq('id', userId);
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
    saveSchema([...formFields, field]);
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
    saveSchema(updated);
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
        <button onClick={() => setView('branding')} className="p-10 bg-white border border-slate-100 rounded-[48px] shadow-sm text-left group hover:border-purple-500 transition-all hover:-translate-y-1">
          <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-[28px] flex items-center justify-center mb-8 group-hover:scale-110 transition-transform"><Palette className="w-8 h-8" /></div>
          <h3 className="text-xl font-black text-slate-900 mb-2">Branding & Assets</h3>
          <p className="text-xs text-slate-400 font-medium leading-relaxed">Manage quotation backgrounds and firm identity.</p>
          <div className="mt-8 flex items-center gap-2 text-purple-600 text-[10px] font-black uppercase tracking-widest">Update Branding <ChevronRight className="w-3 h-3" /></div>
        </button>
        <button onClick={() => setView('profile')} className="p-10 bg-white border border-slate-100 rounded-[48px] shadow-sm text-left group hover:border-blue-500 transition-all hover:-translate-y-1">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-[28px] flex items-center justify-center mb-8 group-hover:scale-110 transition-transform"><UserCircle className="w-8 h-8" /></div>
          <h3 className="text-xl font-black text-slate-900 mb-2">My Account</h3>
          <p className="text-xs text-slate-400 font-medium leading-relaxed">Update your personal profile, photo and password.</p>
          <div className="mt-8 flex items-center gap-2 text-blue-600 text-[10px] font-black uppercase tracking-widest">Edit Profile <ChevronRight className="w-3 h-3" /></div>
        </button>
      </div>
      <div className="mt-12 flex justify-between items-center">
        <Link to="/settings/recycle-bin" className="flex items-center gap-4 text-slate-400 hover:text-red-500 transition-all text-[11px] font-black uppercase tracking-widest">
           <History className="w-5 h-5" /> Operational Archive (Recycle Bin)
        </Link>
      </div>
    </div>
  );

  // 2. LEAD FORM SETTING VIEW
  if (view === 'form' && isAdmin) {
    const sections = Array.from(new Set(formFields.map(f => f.section)));
    return (
      <div className="min-h-screen bg-[#f8fafc] pb-32 px-6 md:px-12 pt-12 animate-in slide-in-from-right-6 duration-500 max-w-5xl mx-auto">
        <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="flex items-center gap-6">
            <button onClick={() => setView('hub')} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:bg-slate-50 transition-all"><ArrowLeft className="w-5 h-5 text-slate-500" /></button>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Form Schema</h1>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">TECHNICAL DATA CAPTURE CONFIGURATION</p>
            </div>
          </div>
          <button onClick={() => setIsFieldModalOpen(true)} className="px-8 py-4 bg-[#064e3b] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-3">
             <Plus className="w-4 h-4" /> Add Parameter
          </button>
        </header>

        <div className="space-y-12">
          {sections.map(section => (
            <div key={section} className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
               <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">{section} Module</h3>
               </div>
               <div className="divide-y divide-slate-50">
                  {formFields.filter(f => f.section === section).map(field => (
                    <div key={field.id} className="p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:bg-slate-50/50 transition-colors group">
                       <div className="flex items-center gap-6">
                          <div className="w-12 h-12 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-300">
                             {field.type === 'select' ? <ListFilter className="w-5 h-5" /> : field.type === 'number' ? <Hash className="w-5 h-5" /> : <TypeIcon className="w-5 h-5" />}
                          </div>
                          <div>
                             <p className="text-sm font-black text-slate-900">{field.label}</p>
                             <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">DB KEY: {field.db_key} • {field.type.toUpperCase()}</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-4">
                          {field.type === 'select' && (
                            <button onClick={() => openOptionsEditor(field)} className="px-4 py-2 bg-purple-50 text-purple-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-purple-100">
                               {field.options?.length || 0} Options
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

        {/* New Field Modal */}
        {isFieldModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
             <div className="bg-white rounded-[40px] p-10 max-w-lg w-full shadow-2xl animate-in zoom-in-95">
                <div className="flex justify-between items-start mb-10">
                   <h3 className="text-2xl font-black text-slate-900">New Parameter</h3>
                   <button onClick={() => setIsFieldModalOpen(false)} className="p-2 text-slate-300 hover:text-slate-900"><X className="w-6 h-6" /></button>
                </div>
                <div className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Display Label</label>
                      <input className="w-full h-14 px-6 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white" value={newField.label} onChange={e => setNewField({...newField, label: e.target.value})} />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Type</label>
                         <select className="w-full h-14 px-4 bg-slate-50 rounded-2xl font-bold" value={newField.type} onChange={e => setNewField({...newField, type: e.target.value as FieldType})}>
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="select">Select</option>
                            <option value="textarea">Large Text</option>
                            <option value="checkbox">Checkbox</option>
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
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Options Management</p>
                         <div className="flex gap-2">
                            <input className="flex-1 h-12 px-4 bg-white rounded-xl text-sm font-bold" placeholder="New option..." value={optionInput} onChange={e => setOptionInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addOptionTag()} />
                            <button onClick={addOptionTag} className="p-3 bg-emerald-600 text-white rounded-xl"><Plus className="w-5 h-5" /></button>
                         </div>
                         <div className="flex flex-wrap gap-2">
                            {tempOptions.map(t => <span key={t} className="px-3 py-1.5 bg-white border border-slate-100 rounded-lg text-[10px] font-bold flex items-center gap-2">{t} <button onClick={() => removeOptionTag(t)}><X className="w-3 h-3 text-red-400" /></button></span>)}
                         </div>
                      </div>
                   )}
                   <button onClick={addNewField} className="w-full py-6 bg-[#064e3b] text-white rounded-[24px] font-black uppercase tracking-widest shadow-xl">Commit Parameter</button>
                </div>
             </div>
          </div>
        )}

        {/* Options Editor Modal */}
        {editingOptionsId && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
             <div className="bg-white rounded-[40px] p-10 max-w-lg w-full shadow-2xl">
                <h3 className="text-xl font-black text-slate-900 mb-8">Manage Selection Options</h3>
                <div className="space-y-6">
                   <div className="flex gap-2">
                      <input className="flex-1 h-14 px-6 bg-slate-50 rounded-2xl font-bold" placeholder="Add entry..." value={optionInput} onChange={e => setOptionInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addOptionTag()} />
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

  // 3. PROFILE VIEW
  if (view === 'profile') return (
    <div className="min-h-screen bg-[#f8fafc] pb-32 px-6 md:px-12 pt-12 animate-in slide-in-from-bottom-6 duration-500 max-w-4xl mx-auto">
      <header className="mb-12 flex items-center gap-6">
        <button onClick={() => isAdmin ? setView('hub') : navigate('/')} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:bg-slate-50 transition-all"><ArrowLeft className="w-5 h-5 text-slate-500" /></button>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Account Settings</h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">PERSONAL IDENTITY & SECURITY PROTOCOL</p>
        </div>
      </header>

      <div className="bg-white rounded-[48px] border border-slate-100 shadow-xl overflow-hidden">
         <div className="h-48 bg-[#064e3b] relative">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />
            <div className="absolute -bottom-16 left-12">
               <div className="relative group">
                  <img 
                    src={localProfile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${localProfile.email || localProfile.full_name || 'User'}`} 
                    className="w-40 h-40 rounded-[48px] border-8 border-white bg-white shadow-2xl object-cover" 
                    alt="Profile" 
                  />
                  <div className="absolute inset-0 bg-black/40 rounded-[48px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-help">
                     <Camera className="w-8 h-8" />
                  </div>
               </div>
            </div>
         </div>

         <div className="pt-24 pb-14 px-12">
            <form onSubmit={handleUpdateProfile} className="space-y-12">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-3">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                     <div className="relative">
                        <UserIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                        <input className="w-full h-16 pl-16 pr-6 bg-slate-50 border border-slate-100 rounded-[24px] font-bold text-slate-700 focus:bg-white transition-all shadow-inner" value={localProfile.full_name || ''} onChange={e => setLocalProfile({...localProfile, full_name: e.target.value})} />
                     </div>
                  </div>
                  <div className="space-y-3">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Designation</label>
                     <div className="relative">
                        <Briefcase className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                        <input className="w-full h-16 pl-16 pr-6 bg-slate-50 border border-slate-100 rounded-[24px] font-bold text-slate-700 focus:bg-white transition-all shadow-inner" value={localProfile.designation || ''} onChange={e => setLocalProfile({...localProfile, designation: e.target.value})} />
                     </div>
                  </div>
                  <div className="space-y-3">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                     <div className="relative">
                        <Phone className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                        <input className="w-full h-16 pl-16 pr-6 bg-slate-50 border border-slate-100 rounded-[24px] font-bold text-slate-700 focus:bg-white transition-all shadow-inner" value={localProfile.phone || ''} onChange={e => setLocalProfile({...localProfile, phone: e.target.value})} />
                     </div>
                  </div>
                  <div className="space-y-3">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Avatar Image URL</label>
                     <div className="relative">
                        <LinkIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                        <input className="w-full h-16 pl-16 pr-6 bg-slate-50 border border-slate-100 rounded-[24px] font-bold text-slate-700 focus:bg-white transition-all shadow-inner" placeholder="Paste image link here..." value={localProfile.avatar_url || ''} onChange={e => setLocalProfile({...localProfile, avatar_url: e.target.value})} />
                     </div>
                  </div>
                  <div className="space-y-3 md:col-span-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Secure Password</label>
                     <div className="relative">
                        <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                        <input type={showPassword ? 'text' : 'password'} className="w-full h-16 pl-16 pr-24 bg-slate-50 border border-slate-100 rounded-[24px] font-bold text-slate-700 focus:bg-white transition-all shadow-inner" value={localProfile.login_password || ''} onChange={e => setLocalProfile({...localProfile, login_password: e.target.value})} />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                           <button type="button" onClick={() => setShowPassword(!showPassword)} className="p-2 text-slate-300 hover:text-slate-900 transition-colors">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                           <button type="button" onClick={generatePassword} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"><RefreshCw className="w-4 h-4" /></button>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="flex flex-col sm:flex-row gap-6 pt-6">
                  <button type="submit" disabled={saving} className="flex-1 py-7 bg-[#064e3b] text-white rounded-[28px] text-[12px] font-black uppercase tracking-[0.4em] shadow-xl hover:bg-black transition-all flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50">
                    {saving ? <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" /> : <Save className="w-5 h-5 text-emerald-400" />} AUTHORIZE IDENTITY UPDATE
                  </button>
                  <button type="button" onClick={() => isAdmin ? setView('hub') : navigate('/')} className="px-12 py-7 bg-slate-50 text-slate-400 rounded-[28px] text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-100">Cancel</button>
               </div>
            </form>
         </div>
      </div>

      {!isAdmin && (
        <div className="mt-12 p-8 bg-blue-50 border border-blue-100 rounded-[40px] flex items-start gap-4">
           <Info className="w-6 h-6 text-blue-500 shrink-0 mt-1" />
           <p className="text-[11px] font-medium text-blue-700 leading-relaxed">
             Staff Protocol: Profile updates are synchronized across the workspace. Ensure your phone number is valid for automated site visit notifications.
           </p>
        </div>
      )}
    </div>
  );

  // 4. BRANDING VIEW
  if (view === 'branding' && isAdmin) return (
    <div className="min-h-screen bg-[#f8fafc] pb-32 px-6 md:px-12 pt-12 animate-in slide-in-from-right-6 duration-500 max-w-4xl mx-auto">
       <header className="mb-12 flex items-center gap-6">
        <button onClick={() => setView('hub')} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:bg-slate-50 transition-all active:scale-90"><ArrowLeft className="w-5 h-5 text-slate-500" /></button>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Branding & Identity</h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">DRAFTING OFFICIAL ARCHITECTURAL IDENTITY</p>
        </div>
      </header>

      <div className="space-y-8">
        <div className="bg-white rounded-[48px] border border-slate-100 shadow-xl p-10 md:p-14 space-y-12 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/5 blur-[100px] rounded-full pointer-events-none" />
          <div className="flex items-center gap-4 border-b border-slate-50 pb-8 relative z-10">
             <ImageLucide className="w-6 h-6 text-purple-500" />
             <div>
                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Quotation Master Layer</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Direct File Upload • High-Resolution Letterhead (A4)</p>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 relative z-10">
             <div className="space-y-8">
                <div className="space-y-4">
                  <h4 className="text-lg font-black text-slate-900 leading-tight">Sync a Custom Letterhead</h4>
                  <p className="text-sm text-slate-500 leading-relaxed font-medium">This design will be utilized as a full-page background for all generated PDF quotations. Maintain a premium, branded experience.</p>
                </div>

                <div className="space-y-6 bg-slate-50 p-8 rounded-[32px] border border-slate-100 shadow-inner">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-emerald-500 shadow-sm"><Info className="w-4 h-4" /></div>
                      <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Technical Specifications</p>
                   </div>
                   <ul className="space-y-3">
                      {[
                        "Standard A4 Aspect Ratio (1:1.414)",
                        "Recommended Size: 2480 x 3508 PX",
                        "Format: JPG, PNG or High-Res WebP",
                        "Policy: Ensure MASTER V30 SQL fix is applied in Supabase"
                      ].map((spec, i) => (
                        <li key={i} className="flex items-center gap-3 text-[11px] font-bold text-slate-500">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> {spec}
                        </li>
                      ))}
                   </ul>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                   <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                    <button onClick={() => fileInputRef.current?.click()} disabled={saving} className="flex-1 flex items-center justify-center gap-4 px-8 py-6 bg-[#064e3b] text-white rounded-[24px] text-[11px] font-black uppercase tracking-[0.2em] hover:bg-black transition-all shadow-2xl shadow-emerald-900/20 active:scale-95 disabled:opacity-50">
                      {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5 text-emerald-400" />}
                      {quotationBgUrl ? 'Replace Design' : 'Upload Design'}
                    </button>
                    {quotationBgUrl && <button onClick={handleRemoveBranding} disabled={saving} className="px-8 py-6 bg-white border border-slate-100 text-red-500 rounded-[24px] text-[11px] font-black uppercase tracking-widest hover:bg-red-50 hover:border-red-100 transition-all active:scale-95">Detach</button>}
                </div>

                <div className="p-6 bg-blue-50 rounded-[32px] border border-blue-100 flex items-start gap-4">
                  <Database className="w-6 h-6 text-blue-500 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Storage Registry</p>
                    <p className="text-[9px] font-bold text-blue-600/70 leading-relaxed uppercase">Bucket: HHDCRM • Protocol: Unified Public Access Required</p>
                  </div>
                </div>
             </div>

             <div className="relative group">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4 ml-2">Active Preview</p>
                <div className="aspect-[1/1.414] w-full bg-slate-50 rounded-[40px] border-4 border-dashed border-slate-200 overflow-hidden flex items-center justify-center relative shadow-inner">
                   {quotationBgUrl ? (
                     <img src={quotationBgUrl} className="w-full h-full object-cover transition-transform group-hover:scale-[1.02]" alt="Preview" />
                   ) : (
                     <div className="flex flex-col items-center gap-5 opacity-20">
                        <ImageLucide className="w-16 h-16" />
                        <div className="text-center">
                          <p className="text-[11px] font-black uppercase tracking-[0.3em]">No Branding Layer</p>
                          <p className="text-[9px] font-bold mt-1">Default Letterhead in Use</p>
                        </div>
                     </div>
                   )}
                   <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <div className="px-6 py-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                        <p className="text-white text-[10px] font-black uppercase tracking-widest">A4 Scale Rendering</p>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );

  return null;
};

export default Settings;