
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { X, CheckCircle2, RefreshCw, User, Home, Zap, ChevronDown, Compass, Globe, ArrowLeft, Database, Search, MapPin, Map, AlertCircle, Banknote, CalendarDays, CheckSquare, Square, Hammer, Paintbrush } from 'lucide-react';
import { FormFieldConfig } from '../types';
import { DEFAULT_FORM_CONFIG } from './Settings';
import { COUNTRIES, BD_DISTRICTS, BD_UPAZILA_MAP } from '../constants';
import { useNotification } from '../App';

const STANDARD_COLUMNS = [
  'client_name', 'phone', 'email', 'current_location', 'land_area', 'address', 'upazila', 
  'union_name', 'police_station', 'village_name', 'package', 'asking_fee', 'budget', 'social_media', 
  'next_calling_date', 'notes', 'foundation', 'unit_count', 'bedroom_count', 
  'bathroom_count', 'stair_details', 'status', 'is_client', 'interest_construction', 'interest_interior'
];

const LeadForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const { showNotification } = useNotification();

  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formConfig, setFormConfig] = useState<FormFieldConfig[]>([]);
  
  const [formData, setFormData] = useState<Record<string, any>>({});
  const formSessionId = useMemo(() => Math.random().toString(36).substring(7), []);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [activeSearchFieldId, setActiveSearchFieldId] = useState<string | null>(null);
  const [isWaitingForDistrict, setIsWaitingForDistrict] = useState(false);
  
  const searchableContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeForm();

    const handleClickOutside = (event: MouseEvent) => {
      if (searchableContainerRef.current && !searchableContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setActiveSearchFieldId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [id]);

  const initializeForm = async () => {
    try {
      setLoading(true);
      const { data: configData } = await supabase.from('settings').select('*').eq('key', 'lead_form_config').single();
      const config: FormFieldConfig[] = (configData && configData.value) ? configData.value : DEFAULT_FORM_CONFIG;
      setFormConfig(config);

      let initial: Record<string, any> = {};
      if (isEditing) {
        const { data: leadData, error: leadError } = await supabase.from('leads').select('*').eq('id', id).single();
        if (leadError) throw leadError;
        if (leadData) {
          config.forEach(f => {
            const dbVal = leadData[f.db_key] !== undefined ? leadData[f.db_key] : leadData.metadata?.[f.db_key];
            
            // Normalize boolean interests from various DB formats
            if (f.type === 'checkbox') {
              initial[f.id] = (dbVal === true || dbVal === 'true' || dbVal === 'Yes' || dbVal === 'yes');
            } else {
              initial[f.id] = dbVal !== undefined ? dbVal : (f.type === 'number' ? 0 : '');
            }
          });
        }
      } else {
        config.forEach(f => { initial[f.id] = f.type === 'number' ? 0 : (f.type === 'checkbox' ? false : ''); });
      }
      setFormData(initial);
    } catch (err) {
      showNotification("Vault access failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  const performSearch = (f: FormFieldConfig, value: string) => {
    const query = value?.trim()?.toLowerCase() || '';
    let sourceList: string[] = [];
    const isDistrict = f.db_key === 'address' || f.label.toLowerCase().includes('district');
    const isUpazila = f.db_key === 'upazila' || f.label.toLowerCase().includes('upazila');
    const isLocation = f.db_key.toLowerCase().includes('location') || f.label.toLowerCase().includes('location');

    if (isDistrict) { sourceList = BD_DISTRICTS; setIsWaitingForDistrict(false); }
    else if (isUpazila) {
      const districtField = formConfig.find(cf => cf.db_key === 'address' || cf.label.toLowerCase().includes('district'));
      const selectedDistrict = districtField ? formData[districtField.id]?.trim() : null;
      if (selectedDistrict && BD_UPAZILA_MAP[selectedDistrict]) {
        sourceList = BD_UPAZILA_MAP[selectedDistrict];
        setIsWaitingForDistrict(false);
      } else {
        setSuggestions([]);
        setShowSuggestions(true);
        setActiveSearchFieldId(f.id);
        setIsWaitingForDistrict(true);
        return;
      }
    } else if (isLocation) { sourceList = COUNTRIES; setIsWaitingForDistrict(false); }

    const startsWith = sourceList.filter(c => c.toLowerCase().startsWith(query));
    const contains = sourceList.filter(c => !c.toLowerCase().startsWith(query) && c.toLowerCase().includes(query));
    const matches = Array.from(new Set([...startsWith, ...contains])).slice(0, 10);
    setSuggestions(matches);
    setShowSuggestions(true);
    setActiveSuggestionIndex(0);
    setActiveSearchFieldId(f.id);
  };

  const handleInputChange = (f: FormFieldConfig, value: any) => {
    setFormData(prev => ({ ...prev, [f.id]: value }));
    const isLocation = f.db_key.toLowerCase().includes('location') || f.label.toLowerCase().includes('location');
    const isDistrict = f.db_key === 'address' || f.label.toLowerCase().includes('district');
    const isUpazila = f.db_key === 'upazila' || f.label.toLowerCase().includes('upazila');
    if (isLocation || isDistrict || isUpazila) performSearch(f, value);
    else { setShowSuggestions(false); setActiveSearchFieldId(null); }
  };

  const handleInputFocus = (f: FormFieldConfig) => {
    const isLocation = f.db_key.toLowerCase().includes('location') || f.label.toLowerCase().includes('location');
    const isDistrict = f.db_key === 'address' || f.label.toLowerCase().includes('district');
    const isUpazila = f.db_key === 'upazila' || f.label.toLowerCase().includes('upazila');
    if (isLocation || isDistrict || isUpazila) performSearch(f, formData[f.id] || '');
  };

  const selectSuggestion = (fieldId: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    setShowSuggestions(false);
    setActiveSearchFieldId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, f: FormFieldConfig) => {
    if (!showSuggestions || activeSearchFieldId !== f.id || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions[activeSuggestionIndex]) selectSuggestion(f.id, suggestions[activeSuggestionIndex]);
    } else if (e.key === 'Escape') { setShowSuggestions(false); setActiveSearchFieldId(null); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const missing = formConfig.filter(f => f.required && f.visible && !formData[f.id]);
    if (missing.length > 0) {
      return showNotification(`Required fields missing: ${missing.map(m => m.label).join(', ')}`, "error");
    }

    setIsSaving(true);
    try {
      const payload: Record<string, any> = { updated_at: new Date().toISOString(), metadata: {} };
      if (!isEditing) { 
        payload.status = 'Discovery'; 
        payload.is_client = false; 
        payload.created_at = new Date().toISOString(); 
      }
      formConfig.forEach(f => {
        const val = formData[f.id];
        if (STANDARD_COLUMNS.includes(f.db_key)) {
          payload[f.db_key] = val;
        } else {
          payload.metadata[f.db_key] = val;
        }
      });
      
      if (isEditing) {
        const { error } = await supabase.from('leads').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('leads').insert([payload]);
        if (error) throw error;
      }
      
      showNotification(isEditing ? "Records updated." : "Lead committed.", "success");
      navigate(isEditing ? `/leads/${id}` : '/leads');
    } catch (err: any) {
      showNotification('Sync Error: ' + err.message, "error");
    } finally { setIsSaving(false); }
  };

  const sections = Array.from(new Set(formConfig.map(f => f.section || 'Identity'))) as string[];
  const getSectionIcon = (section: string) => {
    switch (section) {
      case 'Identity': return <User className="w-4 h-4 text-emerald-500" />;
      case 'Architecture': return <Home className="w-4 h-4 text-emerald-500" />;
      case 'Logistics': return <Zap className="w-4 h-4 text-emerald-500" />;
      case 'Financials': return <Banknote className="w-4 h-4 text-emerald-500" />;
      case 'Interests': return <CheckSquare className="w-4 h-4 text-emerald-500" />;
      default: return <Compass className="w-4 h-4 text-emerald-500" />;
    }
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center gap-6 bg-[#f8fafc] px-6 text-center">
      <RefreshCw className="w-12 h-12 text-[#064e3b] animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">LOADING VAULT...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] animate-in fade-in duration-700">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 pb-24 sm:pb-32 pt-8 sm:pt-12">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-8 mb-12 sm:mb-16">
          <div className="flex items-center gap-4 sm:gap-6">
            <button onClick={() => navigate(-1)} className="p-3.5 sm:p-4 bg-white border border-slate-100 rounded-2xl shadow-lg hover:bg-slate-50 transition-all active:scale-95">
              <ArrowLeft className="w-5 h-5 text-slate-500" />
            </button>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Project Intake</h1>
              <p className="text-slate-400 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.25em] mt-2 opacity-80">SECURE DISCOVERY PROTOCOL</p>
            </div>
          </div>
          <button onClick={() => navigate('/leads')} className="p-3.5 sm:p-4 bg-white border border-slate-100 text-slate-300 hover:text-red-500 rounded-2xl transition-all">
            <X className="w-6 h-6" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-12 sm:space-y-20" autoComplete="off">
          {sections.map(section => (
            <div key={section} className="space-y-8 sm:space-y-10">
              <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 bg-white shadow-sm border border-slate-100 text-emerald-600 rounded-xl flex items-center justify-center">
                  {getSectionIcon(section)}
                </div>
                <h3 className="text-[12px] sm:text-sm font-black text-slate-800 uppercase tracking-[0.2em]">{section} Portfolio</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10">
                {formConfig.filter(f => (f.section || 'Identity') === section && f.visible).map(f => {
                  const isSearchable = f.db_key.toLowerCase().includes('location') || f.db_key === 'address' || f.db_key === 'upazila';
                  const isActive = isSearchable && showSuggestions && activeSearchFieldId === f.id;

                  return (
                    <div 
                      key={f.id} 
                      className={`${f.type === 'textarea' ? 'md:col-span-2 lg:col-span-3' : ''} relative`}
                      style={{ isolation: 'isolate', zIndex: isActive ? 100 : 1 }}
                    >
                      <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2.5 sm:mb-3 block">
                        {f.label} {f.required && <span className="text-emerald-500">*</span>}
                      </label>
                      
                      {f.type === 'select' ? (
                        <div className="relative">
                          <select 
                            className="w-full h-14 sm:h-[72px] px-6 bg-white border border-slate-100 rounded-2xl sm:rounded-[28px] text-[13px] font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-200 shadow-sm appearance-none cursor-pointer"
                            value={formData[f.id] || ''}
                            onChange={e => handleInputChange(f, e.target.value)}
                          >
                            <option value="">Select Option</option>
                            {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                          <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                        </div>
                      ) : f.type === 'textarea' ? (
                        <textarea 
                          rows={4}
                          className="w-full p-6 sm:p-8 bg-white border border-slate-100 rounded-[28px] sm:rounded-[32px] text-[13px] font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-200 shadow-sm transition-all resize-none"
                          placeholder={f.placeholder}
                          value={formData[f.id] || ''}
                          onChange={e => handleInputChange(f, e.target.value)}
                        />
                      ) : f.type === 'checkbox' ? (
                         <button 
                           type="button"
                           onClick={() => handleInputChange(f, !formData[f.id])}
                           className={`w-full h-24 sm:h-32 px-8 bg-white border rounded-[32px] transition-all flex items-center justify-between group/cb shadow-md relative overflow-hidden ${formData[f.id] ? 'border-emerald-500 bg-emerald-50/40 ring-4 ring-emerald-500/10' : 'border-slate-200 hover:border-emerald-200'}`}
                         >
                            <div className="flex items-center gap-6 relative z-10">
                               <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${formData[f.id] ? 'bg-emerald-600 text-white shadow-xl scale-110' : 'bg-slate-100 text-slate-400'}`}>
                                  {f.db_key.includes('construction') ? <Hammer className="w-7 h-7" /> : <Paintbrush className="w-7 h-7" />}
                               </div>
                               <div className="text-left">
                                  <span className={`text-[16px] font-black block leading-none ${formData[f.id] ? 'text-emerald-900' : 'text-slate-600'}`}>{f.label}</span>
                                  <p className={`text-[10px] font-black mt-2.5 uppercase tracking-widest ${formData[f.id] ? 'text-emerald-600' : 'text-slate-400'}`}>
                                    {formData[f.id] ? 'Confirmed Interest' : 'Click to Toggle'}
                                  </p>
                               </div>
                            </div>
                            <div className={`w-10 h-10 rounded-full border-4 flex items-center justify-center transition-all shrink-0 ${formData[f.id] ? 'bg-emerald-500 border-emerald-200 shadow-lg' : 'bg-slate-50 border-slate-100'}`}>
                               {formData[f.id] && <CheckCircle2 className="w-6 h-6 text-white" />}
                            </div>
                         </button>
                      ) : (
                        <div ref={isActive ? searchableContainerRef : null} className="relative">
                          <input 
                            name={`entry_${f.id}_${formSessionId}`}
                            type={f.type === 'number' ? 'number' : (f.type === 'date' ? 'date' : 'text')}
                            autoComplete="off"
                            className={`w-full h-14 sm:h-[72px] px-6 bg-white border border-slate-100 rounded-2xl sm:rounded-[28px] text-[13px] font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-200 shadow-sm transition-all ${isSearchable ? 'pl-14' : ''} ${isActive ? 'ring-2 ring-emerald-500' : ''}`}
                            placeholder={f.placeholder}
                            value={formData[f.id] || ''}
                            onChange={e => handleInputChange(f, e.target.value)}
                            onFocus={() => handleInputFocus(f)}
                            onKeyDown={e => handleKeyDown(e, f)}
                          />
                          {isSearchable && (
                            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300">
                               {f.db_key === 'address' || f.db_key === 'upazila' ? <Map className="w-4 h-4 sm:w-5 h-5" /> : <Globe className="w-4 h-4 sm:w-5 h-5" />}
                            </div>
                          )}
                          {isActive && (
                            <div className="absolute left-0 right-0 top-[110%] bg-white border border-slate-100 rounded-[24px] sm:rounded-[32px] shadow-2xl overflow-hidden z-[110] animate-in fade-in slide-in-from-top-2 duration-200">
                              <div className="px-5 py-3 sm:px-6 sm:py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Global Suggestions</span>
                                 <div className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[8px] font-black uppercase tracking-widest">{suggestions.length} Results</div>
                              </div>
                              <div className="max-h-[250px] overflow-y-auto no-scrollbar">
                                {suggestions.length > 0 ? suggestions.map((item, index) => (
                                  <button
                                    key={item}
                                    type="button"
                                    onClick={() => selectSuggestion(f.id, item)}
                                    className={`w-full px-6 sm:px-8 py-4 sm:py-5 text-left transition-all flex items-center justify-between group ${activeSuggestionIndex === index ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}
                                  >
                                    <span className={`text-[13px] sm:text-[14px] font-bold ${activeSuggestionIndex === index ? 'text-emerald-900' : 'text-slate-600'}`}>{item}</span>
                                    {activeSuggestionIndex === index && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                  </button>
                                )) : (
                                  <div className="p-10 text-center">
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{isWaitingForDistrict ? 'District Required' : 'No Results'}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="pt-10 sm:pt-16 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-10">
             <div className="flex items-center gap-4 text-slate-400 text-center md:text-left">
               <Database className="w-5 h-5 text-emerald-500 shrink-0" />
               <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest leading-relaxed max-w-xs">HIERARCHICAL METADATA SYNC ACTIVE.</p>
             </div>
             <button 
                type="submit" 
                disabled={isSaving} 
                className="w-full md:w-auto px-10 sm:px-16 py-6 sm:py-8 bg-[#064e3b] text-white rounded-2xl sm:rounded-[32px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[11px] sm:text-[12px] hover:bg-black transition-all shadow-2xl shadow-emerald-900/20 active:scale-95 flex items-center justify-center gap-4 sm:gap-6 group"
              >
                {isSaving ? <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-emerald-400" /> : <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-400" />}
                {isSaving ? 'Processing...' : isEditing ? 'Update Records' : 'Commit Discovery'}
              </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeadForm;
