
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Lead, FormFieldConfig } from '../types';
import { useNotification, useUser } from '../App';
import { DEFAULT_FORM_CONFIG } from './Settings';
import { 
  ArrowLeft, Save, RefreshCw, 
  User, Home, Zap, Banknote, ShieldCheck, Compass, 
  ChevronDown, CheckCircle2, Search, X, MapPin, UserCheck,
  FileSpreadsheet
} from 'lucide-react';
import { BD_DISTRICTS, BD_UPAZILA_MAP, COUNTRIES } from '../constants';

const LeadForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { showNotification } = useNotification();
  const { profile } = useUser();
  const isEditing = !!id;

  // Check modes
  const searchParams = new URLSearchParams(location.search);
  const isDirectClientMode = searchParams.get('mode') === 'client';
  const isQuotationMode = searchParams.get('mode') === 'quotation';

  const [loading, setLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [formConfig, setFormConfig] = useState<FormFieldConfig[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  
  // Searchable state
  const [searchStates, setSearchStates] = useState<Record<string, { isOpen: boolean; query: string }>>({});
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    fetchConfigAndData();
    const handleClickOutside = (event: MouseEvent) => {
      Object.keys(dropdownRefs.current).forEach(key => {
        if (dropdownRefs.current[key] && !dropdownRefs.current[key]?.contains(event.target as Node)) {
          setSearchStates(prev => ({ ...prev, [key]: { isOpen: false, query: '' } }));
        }
      });
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
        if (!f || !f.db_key) return;
        initialData[f.db_key] = f.type === 'number' ? 0 : (f.type === 'checkbox' ? false : '');
      });

      if (leadRes.data) {
        const lead = leadRes.data as Lead;
        config.forEach(f => {
          if (!f || !f.db_key) return;
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

  const handleSelectOption = (dbKey: string, value: string) => {
    setFormData(prev => {
      const next = { ...prev, [dbKey]: value };
      // If we are changing the district/address, reset the Upazila
      if (dbKey.toLowerCase() === 'address' || dbKey.toLowerCase() === 'district') {
        next.upazila = '';
      }
      return next;
    });
    setSearchStates(prev => ({ ...prev, [dbKey]: { query: '', isOpen: false } }));
  };

  const getOptionsForField = (dbKey: string): string[] => {
    if (!dbKey) return [];
    const key = dbKey.toLowerCase();
    if (key === 'current_location' || key === 'country') return COUNTRIES || [];
    if (key === 'address' || key === 'district') return BD_DISTRICTS || [];
    if (key === 'upazila') {
      // Find the district value from either 'address' or 'district' keys
      const districtValue = formData.address || formData.district;
      return BD_UPAZILA_MAP[districtValue] || [];
    }
    const config = formConfig.find(f => f && f.db_key === dbKey);
    return config?.options || [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const standardCols = [
        'client_name', 'phone', 'email', 'current_location', 'land_area', 'address', 'upazila', 
        'union_name', 'police_station', 'village_name', 'package', 'asking_fee', 'budget', 'social_media', 
        'next_calling_date', 'notes', 'foundation', 'unit_count', 'bedroom_count', 
        'bathroom_count', 'stair_details', 'interest_construction', 'interest_interior'
      ];

      const payload: Record<string, any> = { updated_at: new Date().toISOString(), metadata: {} };
      Object.keys(formData).forEach(key => {
        if (standardCols.includes(key)) payload[key] = formData[key];
        else payload.metadata[key] = formData[key];
      });

      if (isEditing) {
        const { error } = await supabase.from('leads').update(payload).eq('id', id);
        if (error) throw error;
        showNotification("Record updated successfully.", "success");
      } else {
        payload.created_at = new Date().toISOString();
        payload.created_by = profile?.id;
        
        // IMPORTANT: Ensure office_id is propagated for visibility
        if (profile?.office_id) {
          payload.office_id = profile.office_id;
        }
        
        if (isDirectClientMode) {
          payload.status = 'Completed';
          payload.is_client = true;
          payload.converted_at = new Date().toISOString();
          showNotification("New client added directly to portfolio.", "success");
        } else if (isQuotationMode) {
          payload.status = 'Quotation';
          payload.is_client = false;
          showNotification("New quotation drafted and synchronized.", "success");
        } else {
          payload.status = 'Discovery';
          payload.is_client = false;
          showNotification("New lead ingested successfully.", "success");
        }
        
        const { error } = await supabase.from('leads').insert([payload]);
        if (error) throw error;
      }
      
      if (isDirectClientMode) navigate('/clients');
      else if (isQuotationMode) navigate('/quotations');
      else navigate('/leads');
      
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
    if (!field || !field.visible || !field.db_key) return acc;
    const section = field.section || 'General';
    if (!acc[section]) acc[section] = [];
    acc[section].push(field);
    return acc;
  }, {} as Record<string, FormFieldConfig[]>);

  const formTitle = isEditing ? 'Modify Record' : (isDirectClientMode ? 'Client Onboarding' : isQuotationMode ? 'Draft Quotation' : 'Lead Intake');

  return (
    <div className="max-w-5xl mx-auto px-6 pt-12 pb-32 animate-in slide-in-from-bottom-6">
      <header className="flex items-center gap-6 mb-12">
        <button onClick={() => navigate(-1)} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-400 hover:text-slate-900 transition-all shadow-slate-200/50"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{formTitle}</h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">
            {isDirectClientMode ? 'Portfolio Promotion Gateway' : isQuotationMode ? 'Direct Proposal Induction' : 'Architectural Discovery Workflow'}
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-12">
        {Object.keys(groupedFields).map(section => (
          <div key={section} className="bg-white rounded-[48px] border border-slate-100 shadow-xl p-10 md:p-14 space-y-10 relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
            <div className="flex items-center gap-4 border-b border-slate-50 pb-6 relative z-10">
              {getSectionIcon(section)}
              <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">{section} Specifications</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
              {groupedFields[section].map(f => {
                const dbKey = f.db_key || '';
                const isSelectionField = f.type === 'select' || 
                  ['current_location', 'address', 'upazila', 'country', 'district'].includes(dbKey.toLowerCase());
                
                if (isSelectionField) {
                  const state = searchStates[dbKey] || { isOpen: false, query: '' };
                  const options = getOptionsForField(dbKey);
                  const filtered = options.filter(o => (o || '').toLowerCase().includes((state.query || '').toLowerCase()));
                  const displayValue = formData[dbKey] || '';

                  return (
                    // Fix: Wrapped ref assignment in curly braces to ensure it returns void and satisfy TypeScript requirements
                    <div key={f.id} className="space-y-2 relative" ref={el => { dropdownRefs.current[dbKey] = el; }}>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{f.label} {f.required && <span className="text-red-500">*</span>}</label>
                      <div className="relative">
                        <input 
                          type="text"
                          autoComplete="off"
                          placeholder={state.isOpen ? "Search..." : (displayValue || "Select...")}
                          className={`w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white focus:border-emerald-500/20 transition-all shadow-inner pr-12 ${displayValue && !state.isOpen ? 'placeholder:text-slate-900' : 'placeholder:text-slate-300'}`}
                          value={state.isOpen ? state.query : ''}
                          onFocus={() => setSearchStates(prev => ({ ...prev, [dbKey]: { ...state, isOpen: true, query: '' } }))}
                          onChange={e => setSearchStates(prev => ({ ...prev, [dbKey]: { ...state, query: e.target.value } }))}
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                           {displayValue && !state.isOpen ? (
                             <button 
                               type="button" 
                               onClick={(e) => { e.stopPropagation(); handleSelectOption(dbKey, ''); }}
                               className="p-1 hover:bg-slate-100 rounded-full transition-all text-slate-300 hover:text-red-500"
                             >
                               <X className="w-3.5 h-3.5" />
                             </button>
                           ) : (
                             <ChevronDown className={`w-4 h-4 text-slate-300 transition-transform ${state.isOpen ? 'rotate-180' : ''}`} />
                           )}
                        </div>
                      </div>

                      {state.isOpen && (
                        <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white border border-slate-100 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] z-[100] max-h-64 overflow-y-auto no-scrollbar animate-in fade-in zoom-in-95 duration-200">
                          <div className="p-2 space-y-1">
                            {filtered.length === 0 ? (
                              <div className="p-6 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest flex flex-col items-center gap-2">
                                <Search className="w-5 h-5 opacity-20" />
                                No results found
                              </div>
                            ) : (
                              filtered.map(opt => (
                                <button 
                                  key={opt}
                                  type="button"
                                  onClick={() => handleSelectOption(dbKey, opt)}
                                  className={`w-full text-left px-5 py-4 rounded-2xl text-[12px] font-bold transition-all flex items-center justify-between group ${formData[dbKey] === opt ? 'bg-emerald-50 text-emerald-900' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                  {opt}
                                  {formData[dbKey] === opt && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                <div key={f.id} className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{f.label} {f.required && <span className="text-red-500">*</span>}</label>
                  {f.type === 'textarea' ? (
                    <textarea 
                      required={f.required}
                      className="w-full h-32 px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white focus:border-emerald-500/20 transition-all resize-none shadow-inner"
                      placeholder={f.placeholder}
                      value={formData[dbKey] || ''}
                      onChange={e => setFormData({...formData, [dbKey]: e.target.value})}
                    />
                  ) : f.type === 'checkbox' ? (
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, [dbKey]: !formData[dbKey]})}
                      className={`w-full h-14 px-6 bg-slate-50 rounded-2xl transition-all flex items-center gap-4 border-2 border-transparent ${formData[dbKey] ? 'border-emerald-500/20 bg-white' : ''}`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${formData[dbKey] ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 bg-white'}`}>
                        {formData[dbKey] && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <span className={`text-[13px] font-bold ${formData[dbKey] ? 'text-emerald-900' : 'text-slate-500'}`}>{f.label}</span>
                    </button>
                  ) : (
                    <input 
                      required={f.required}
                      type={f.type === 'number' ? 'number' : (f.type === 'date' ? 'date' : 'text')}
                      className="w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white focus:border-emerald-500/20 transition-all shadow-inner"
                      placeholder={f.placeholder}
                      value={formData[dbKey] ?? ''}
                      onChange={e => setFormData({...formData, [dbKey]: f.type === 'number' ? Number(e.target.value) : e.target.value})}
                    />
                  )}
                </div>
              )})}
            </div>
          </div>
        ))}

        <button 
          type="submit" 
          disabled={isSaving}
          className="w-full py-8 bg-[#064e3b] text-white rounded-[32px] text-[12px] font-black uppercase tracking-[0.3em] shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50"
        >
          {isSaving ? (
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
          ) : (
            isDirectClientMode ? <UserCheck className="w-6 h-6 text-emerald-400" /> : isQuotationMode ? <FileSpreadsheet className="w-6 h-6 text-emerald-400" /> : <Save className="w-6 h-6 text-emerald-400" />
          )}
          {isDirectClientMode ? 'Finalize Client Entry' : isQuotationMode ? 'Finalize Quotation Entry' : 'Finalize Lead Entry'}
        </button>
      </form>
    </div>
  );
};

export default LeadForm;
