
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Plus, Trash2, RefreshCw, Eye, EyeOff, Lock, ChevronRight, Users, 
  UserCircle, FormInput, ArrowLeft, Save, Shield, RotateCcw, 
  Mail, Phone, Briefcase, Camera, Tag, ListFilter, X, History,
  Type as TypeIcon, Wand2, ShieldCheck, User as UserIcon,
  Image as ImageIcon, ToggleLeft, ToggleRight, AlertTriangle, ListPlus,
  Settings2, CheckCircle2, Palette, Upload, Image as ImageLucide,
  FileCheck, Info, Database, ShieldAlert
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
      if (!isAdmin) setView('profile');
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

      // Upload to 'HHDCRM' bucket
      const { error: uploadError } = await supabase.storage
        .from('HHDCRM')
        .upload(filePath, file);

      if (uploadError) {
        if (uploadError.message.includes('not found')) {
          throw new Error("Supabase Error: 'HHDCRM' bucket not found. Ensure you created it in Storage Dashboard.");
        }
        if (uploadError.message.includes('security policy')) {
          throw new Error("Security Error: RLS policy violation. Open 'supabaseClient.ts' and run the V30 MASTER SQL fix in your Supabase SQL Editor.");
        }
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('HHDCRM')
        .getPublicUrl(filePath);

      // Sync to settings table
      const { error: updateError } = await supabase.from('settings').upsert({
        key: 'quotation_bg_url',
        value: publicUrl,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

      if (updateError) {
        if (updateError.message.includes('security policy')) {
           throw new Error("Security Error: 'settings' table RLS violation. Run the V30 MASTER SQL fix provided in 'supabaseClient.ts'.");
        }
        throw updateError;
      }

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
      
      if (error) {
        if (error.message.includes('security policy')) {
          throw new Error("Security Error: RLS violation. Run the V30 SQL fix in 'supabaseClient.ts'.");
        }
        throw error;
      }
      
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
      if (error) {
        if (error.message.includes('security policy')) {
           throw new Error("Security Error: RLS violation. Run the V30 SQL fix in 'supabaseClient.ts'.");
        }
        throw error;
      }
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
        <button onClick={() => setView('branding')} className="p-10 bg-white border border-slate-100 rounded-[48px] shadow-sm text-left group hover:border-purple-500 transition-all hover:-translate-y-1">
          <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-[28px] flex items-center justify-center mb-8 group-hover:scale-110 transition-transform"><Palette className="w-8 h-8" /></div>
          <h3 className="text-xl font-black text-slate-900 mb-2">Branding & Assets</h3>
          <p className="text-xs text-slate-400 font-medium leading-relaxed">Manage quotation backgrounds and firm identity.</p>
          <div className="mt-8 flex items-center gap-2 text-purple-600 text-[10px] font-black uppercase tracking-widest">Update Branding <ChevronRight className="w-3 h-3" /></div>
        </button>
        <Link to="/settings/recycle-bin" className="p-10 bg-white border border-slate-100 rounded-[48px] shadow-sm group hover:border-red-500 transition-all hover:-translate-y-1">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-[28px] flex items-center justify-center mb-8 group-hover:scale-110 transition-transform"><History className="w-8 h-8" /></div>
          <h3 className="text-xl font-black text-slate-900 mb-2">Recycle Bin</h3>
          <p className="text-xs text-slate-400 font-medium leading-relaxed">Access soft-deleted records and permanently purge.</p>
          <div className="mt-8 flex items-center gap-2 text-red-600 text-[10px] font-black uppercase tracking-widest">Open Bin <ChevronRight className="w-3 h-3" /></div>
        </Link>
      </div>
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
                   <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                      className="hidden" 
                      accept="image/*" 
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={saving}
                      className="flex-1 flex items-center justify-center gap-4 px-8 py-6 bg-[#064e3b] text-white rounded-[24px] text-[11px] font-black uppercase tracking-[0.2em] hover:bg-black transition-all shadow-2xl shadow-emerald-900/20 active:scale-95 disabled:opacity-50"
                    >
                      {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5 text-emerald-400" />}
                      {quotationBgUrl ? 'Replace Design' : 'Upload Design'}
                    </button>

                    {quotationBgUrl && (
                      <button 
                        onClick={handleRemoveBranding}
                        disabled={saving}
                        className="px-8 py-6 bg-white border border-slate-100 text-red-500 rounded-[24px] text-[11px] font-black uppercase tracking-widest hover:bg-red-50 hover:border-red-100 transition-all active:scale-95"
                      >
                        Detach
                      </button>
                    )}
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
                {saving && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-sm rounded-[40px] flex items-center justify-center z-20">
                     <div className="flex flex-col items-center gap-4">
                        <RefreshCw className="w-10 h-10 text-[#064e3b] animate-spin" />
                        <p className="text-[10px] font-black text-[#064e3b] uppercase tracking-widest text-center px-6">Synchronizing Asset & Permissions (V30)...</p>
                     </div>
                  </div>
                )}
             </div>
          </div>
        </div>

        <div className="p-10 bg-amber-50 rounded-[48px] border border-amber-100 flex flex-col md:flex-row items-center gap-8 shadow-sm">
           <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-amber-500 shadow-sm shrink-0">
             <ShieldAlert className="w-7 h-7" />
           </div>
           <div>
              <h4 className="text-sm font-black text-amber-900 uppercase tracking-widest">Unified Permission Protocol (V30)</h4>
              <p className="text-xs font-medium text-amber-800 leading-relaxed mt-1">Due to the custom staff login system, you must use the <strong>Universal Public Access Policy</strong> in your Supabase SQL Editor. See the setup block in <code>supabaseClient.ts</code> for the specific commands. Also verify the bucket is set to PUBLIC in the storage dashboard.</p>
           </div>
        </div>

        <div className="p-10 bg-slate-900 rounded-[48px] flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
           <div className="flex items-center gap-6 relative z-10">
              <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-emerald-400"><FileCheck className="w-7 h-7" /></div>
              <div>
                <h4 className="text-lg font-black text-white">Global Synchronization</h4>
                <p className="text-white/40 text-xs font-medium">This asset is automatically applied to all PDF exports firm-wide.</p>
              </div>
           </div>
           <button onClick={() => setView('hub')} className="relative z-10 px-8 py-4 bg-white text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">Back to Hub</button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
