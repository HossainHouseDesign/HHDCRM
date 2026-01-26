import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, CheckCircle2, RefreshCw, 
  ArrowUpRight, Search, Bell, Plus, 
  FileText, TrendingUp, X, 
  Hammer, FileSpreadsheet, Command, UserCheck,
  ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  Activity, Target, ArrowRight, ExternalLink,
  Layers, Clock, Layout, UserPlus, Zap, MessageSquare,
  Briefcase, PlusCircle, Command as CommandIcon,
  Check, MapPin, HardHat
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend
} from 'recharts';
import { supabase } from '../supabaseClient';
import { Lead, Project, Profile, SiteVisit } from '../types';
import { useNavigate } from 'react-router-dom';
import { useNotification, useUser } from '../App';

type Timeframe = 'Weekly' | 'Monthly' | 'Yearly';

interface DayMeta {
  followUps: { id: string, name: string }[];
  siteVisits: { id: string, name: string, location: string }[];
  newLeads: { id: string, name: string }[];
  newClients: { id: string, name: string }[];
  completions: { id: string, name: string }[];
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { profile, isAdmin } = useUser();
  const { showNotification } = useNotification();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [siteVisits, setSiteVisits] = useState<SiteVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
  // Interaction State
  const [timeframe, setTimeframe] = useState<Timeframe>('Monthly');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  // Local Notification Dismissal State
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>([]);
  
  // Notification Popover State
  const [showNotificationList, setShowNotificationList] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDashboardData();
    
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotificationList(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchDashboardData = async (isManualSync = false) => {
    try {
      if (isManualSync) setSyncing(true);
      else setLoading(true);
      
      const [leadsRes, projectsRes, visitsRes] = await Promise.all([
        supabase.from('leads').select('*, creator:profiles!created_by(full_name)').is('deleted_at', null).order('created_at', { ascending: false }),
        supabase.from('projects').select('*, client:leads(*)').is('deleted_at', null),
        supabase.from('site_visits').select('*, project:projects(*, client:leads(*)), lead:leads(*), creator:profiles!scheduled_by(full_name)').is('deleted_at', null)
      ]);
      
      setLeads(leadsRes.data || []);
      setProjects(projectsRes.data || []);
      setSiteVisits(visitsRes.data || []);
      
      if (isManualSync) {
        showNotification("Vault synchronization complete.", "success");
      }
    } catch (err) {
      console.error(err);
      showNotification("Failed to sync with architectural vault.", "error");
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  // Universal Search Logic
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return { leads: [], projects: [], clients: [] };
    const q = searchQuery.toLowerCase();
    
    return {
      leads: leads.filter(l => !l.is_client && (l.client_name.toLowerCase().includes(q) || l.phone.includes(q))).slice(0, 5),
      clients: leads.filter(l => l.is_client && (l.client_name.toLowerCase().includes(q) || l.phone.includes(q))).slice(0, 5),
      projects: projects.filter(p => p.name.toLowerCase().includes(q) || p.client?.client_name.toLowerCase().includes(q)).slice(0, 5)
    };
  }, [searchQuery, leads, projects]);

  const hasAnyResults = searchResults.leads.length > 0 || searchResults.clients.length > 0 || searchResults.projects.length > 0;

  const calendarData = useMemo(() => {
    const data: Record<string, DayMeta> = {};
    const ensureDate = (d: string) => {
      if (!data[d]) data[d] = { followUps: [], siteVisits: [], newLeads: [], newClients: [], completions: [] };
    };

    leads.forEach(l => {
      if (l.follow_up_date) {
        ensureDate(l.follow_up_date);
        data[l.follow_up_date].followUps.push({ id: l.id, name: l.client_name });
      }
      const createdDate = l.created_at.split('T')[0];
      ensureDate(createdDate);
      data[createdDate].newLeads.push({ id: l.id, name: l.client_name });
      
      if (l.is_client && l.converted_at) {
        const convertedDate = l.converted_at.split('T')[0];
        ensureDate(convertedDate);
        data[convertedDate].newClients.push({ id: l.id, name: l.client_name });
      }
    });

    siteVisits.forEach(v => {
      ensureDate(v.visit_date);
      data[v.visit_date].siteVisits.push({ 
        id: v.id, 
        name: v.project?.name || v.lead?.client_name || 'Untitled Site Operation', 
        location: v.location 
      });
    });

    projects.filter(p => p.status === 'Complete').forEach(p => {
       const completedDate = p.updated_at?.split('T')[0];
       if (completedDate) {
         ensureDate(completedDate);
         data[completedDate].completions.push({ id: p.id, name: p.name });
       }
    });

    return data;
  }, [leads, projects, siteVisits]);

  const todaysAgendaItems = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const items = calendarData[todayStr] || { followUps: [], siteVisits: [], newLeads: [], newClients: [], completions: [] };
    
    const combined = [
      ...items.siteVisits.map(v => ({ ...v, type: 'visit' as const })),
      ...items.followUps.map(f => ({ ...f, type: 'followup' as const }))
    ];

    return combined.filter(i => !dismissedNotifications.includes(i.id));
  }, [calendarData, dismissedNotifications]);

  const dismissNotification = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDismissedNotifications(prev => [...prev, id]);
  };

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= lastDate; i++) days.push(i);
    return days;
  }, [currentDate]);

  const stats = useMemo(() => {
    const totalLeads = leads.filter(l => !l.is_client).length;
    const activeProjects = projects.filter(p => p.status === 'Running').length;
    const validatedClients = leads.filter(l => l.is_client).length;
    const completed = projects.filter(p => p.status === 'Complete').length;
    return { totalLeads, activeProjects, validatedClients, completed };
  }, [leads, projects]);

  const analyticsData = useMemo(() => {
    const dataPoints = [];
    const now = new Date();
    
    if (timeframe === 'Weekly') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dStr = d.toISOString().split('T')[0];
        dataPoints.push({
          name: d.toLocaleDateString('default', { weekday: 'short' }),
          key: dStr,
          Leads: 0,
          Clients: 0,
          Projects: 0
        });
      }

      leads.forEach(l => {
        const cDate = l.created_at.split('T')[0];
        const mIdx = dataPoints.findIndex(dp => dp.key === cDate);
        if (mIdx !== -1 && !l.is_client) dataPoints[mIdx].Leads++;

        if (l.is_client && l.converted_at) {
          const convDate = l.converted_at.split('T')[0];
          const cIdx = dataPoints.findIndex(dp => dp.key === convDate);
          if (cIdx !== -1) dataPoints[cIdx].Clients++;
        }
      });

      projects.forEach(p => {
        const pDate = p.created_at.split('T')[0];
        const pIdx = dataPoints.findIndex(dp => dp.key === pDate);
        if (pIdx !== -1) dataPoints[pIdx].Projects++;
      });
    } 
    else if (timeframe === 'Monthly') {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        dataPoints.push({
          name: d.toLocaleString('default', { month: 'short' }),
          month: d.getMonth(),
          year: d.getFullYear(),
          Leads: 0,
          Clients: 0,
          Projects: 0
        });
      }

      leads.forEach(l => {
        const date = new Date(l.created_at);
        const mIdx = dataPoints.findIndex(m => m.month === date.getMonth() && m.year === date.getFullYear());
        if (mIdx !== -1 && !l.is_client) dataPoints[mIdx].Leads++;

        if (l.is_client && l.converted_at) {
          const cDate = new Date(l.converted_at);
          const cIdx = dataPoints.findIndex(m => m.month === cDate.getMonth() && m.year === cDate.getFullYear());
          if (cIdx !== -1) dataPoints[cIdx].Clients++;
        }
      });

      projects.forEach(p => {
        const pDate = new Date(p.created_at);
        const pIdx = dataPoints.findIndex(m => m.month === pDate.getMonth() && m.year === pDate.getFullYear());
        if (pIdx !== -1) dataPoints[pIdx].Projects++;
      });
    }
    else if (timeframe === 'Yearly') {
      for (let i = 4; i >= 0; i--) {
        const year = now.getFullYear() - i;
        dataPoints.push({
          name: year.toString(),
          year: year,
          Leads: 0,
          Clients: 0,
          Projects: 0
        });
      }

      leads.forEach(l => {
        const year = new Date(l.created_at).getFullYear();
        const yIdx = dataPoints.findIndex(y => y.year === year);
        if (yIdx !== -1 && !l.is_client) dataPoints[yIdx].Leads++;

        if (l.is_client && l.converted_at) {
          const cYear = new Date(l.converted_at).getFullYear();
          const cIdx = dataPoints.findIndex(y => y.year === cYear);
          if (cIdx !== -1) dataPoints[cIdx].Clients++;
        }
      });

      projects.forEach(p => {
        const pYear = new Date(p.created_at).getFullYear();
        const pIdx = dataPoints.findIndex(y => y.year === pYear);
        if (pIdx !== -1) dataPoints[pIdx].Projects++;
      });
    }

    return dataPoints;
  }, [leads, projects, timeframe]);

  const selectedDayStats = useMemo(() => {
    return calendarData[selectedDate] || { followUps: [], siteVisits: [], newLeads: [], newClients: [], completions: [] };
  }, [calendarData, selectedDate]);

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  if (loading) return (
    <div className="h-[70vh] flex flex-col items-center justify-center gap-6 px-6 text-center">
      <RefreshCw className="w-10 h-10 text-[#064e3b] animate-spin" />
      <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em]">Syncing Architectural Workspace...</p>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-700 max-w-[1600px] mx-auto px-4 sm:px-6 md:px-10 pb-24">
      <header className="sticky top-16 lg:top-0 z-40 bg-[#f8fafc]/80 backdrop-blur-md py-6 sm:py-8 flex flex-col md:flex-row justify-between items-center gap-6 md:gap-8 border-b border-slate-50">
        <div className="relative w-full md:w-[450px]" ref={searchContainerRef}>
           <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
           <input 
             type="text" 
             placeholder="Secure Command Search..." 
             className="w-full bg-white border border-slate-100 rounded-[24px] h-14 pl-14 pr-12 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-[#064e3b]/5 transition-all shadow-sm" 
             value={searchQuery} 
             onFocus={() => setShowSearchResults(true)}
             onChange={(e) => {
               setSearchQuery(e.target.value);
               setShowSearchResults(true);
             }} 
           />
           
           {/* UNIVERSAL SEARCH DROPDOWN */}
           {showSearchResults && searchQuery.trim() !== '' && (
             <div className="absolute top-[calc(100%+12px)] left-0 right-0 bg-white/95 backdrop-blur-xl border border-slate-100 rounded-[32px] shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                   <h5 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 flex items-center gap-2">
                     <CommandIcon className="w-3 h-3" /> Command Results
                   </h5>
                   <button onClick={() => setShowSearchResults(false)} className="p-1 hover:bg-slate-100 rounded-full text-slate-300"><X className="w-3.5 h-3.5" /></button>
                </div>
                
                <div className="max-h-[450px] overflow-y-auto no-scrollbar py-3 px-3 space-y-1">
                   {!hasAnyResults ? (
                     <div className="py-12 text-center space-y-4">
                        <Search className="w-8 h-8 text-slate-100 mx-auto" />
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No entries match your query</p>
                     </div>
                   ) : (
                     <>
                        {searchResults.projects.length > 0 && (
                          <div className="space-y-1 pb-4">
                            <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest px-4 mb-2">Portfolio Projects</p>
                            {searchResults.projects.map(p => (
                              <button key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="w-full flex items-center gap-4 p-4 hover:bg-blue-50 rounded-2xl transition-all text-left group">
                                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                  <Layers className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[13px] font-black text-slate-900 truncate">{p.name}</p>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase truncate">Client: {p.client?.client_name || 'Individual'}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {searchResults.clients.length > 0 && (
                          <div className="space-y-1 pb-4">
                            <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest px-4 mb-2">Verified Clients</p>
                            {searchResults.clients.map(c => (
                              <button key={c.id} onClick={() => navigate(`/leads/${c.id}`)} className="w-full flex items-center gap-4 p-4 hover:bg-indigo-50 rounded-2xl transition-all text-left group">
                                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                                  <UserCheck className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[13px] font-black text-slate-900 truncate">{c.client_name}</p>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase truncate">{c.phone} • {c.address}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {searchResults.leads.length > 0 && (
                          <div className="space-y-1 pb-2">
                            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest px-4 mb-2">Pipeline Leads</p>
                            {searchResults.leads.map(l => (
                              <button key={l.id} onClick={() => navigate(`/leads/${l.id}`)} className="w-full flex items-center gap-4 p-4 hover:bg-emerald-50 rounded-2xl transition-all text-left group">
                                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                                  <FileText className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[13px] font-black text-slate-900 truncate">{l.client_name}</p>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase truncate">{l.phone} • {l.status}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                     </>
                   )}
                </div>
             </div>
           )}
        </div>
        <div className="flex items-center gap-6">
          <button 
            onClick={() => fetchDashboardData(true)}
            disabled={syncing}
            className={`p-4 bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all shadow-sm relative group ${syncing ? 'bg-emerald-50/10 ring-2 ring-emerald-500/10' : ''}`}
            title="Manual Database Sync"
          >
            <RefreshCw className={`w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-all ${syncing ? 'animate-spin text-emerald-600' : ''}`} />
          </button>

          <div className="relative" ref={notificationRef}>
            <button 
              onClick={() => setShowNotificationList(!showNotificationList)}
              className={`p-4 bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all shadow-sm relative group ${showNotificationList ? 'ring-2 ring-emerald-500/20 bg-emerald-50/10' : ''}`}
            >
              <Bell className={`w-6 h-6 transition-colors ${todaysAgendaItems.length > 0 ? 'text-emerald-600 animate-pulse' : 'text-slate-400'}`} />
              {todaysAgendaItems.length > 0 && (
                <div className="absolute top-3 right-3 min-w-[20px] h-5 px-1 bg-emerald-600 border-2 border-white rounded-full flex items-center justify-center shadow-md">
                   <span className="text-[10px] font-black text-white leading-none">{todaysAgendaItems.length}</span>
                </div>
              )}
            </button>

            {/* Notification Popover */}
            {showNotificationList && (
              <div className="absolute top-[calc(100%+12px)] right-0 w-80 bg-white border border-slate-100 rounded-[32px] shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                   <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Today's Agenda</h5>
                   <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg uppercase">{todaysAgendaItems.length} Pending</span>
                </div>
                <div className="max-h-80 overflow-y-auto no-scrollbar py-3">
                   {todaysAgendaItems.length === 0 ? (
                     <div className="p-10 text-center space-y-4">
                        <Zap className="w-8 h-8 text-slate-200 mx-auto" />
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-relaxed">System clear. No visits or follow-ups for today.</p>
                     </div>
                   ) : (
                     <div className="space-y-2 px-3">
                        {todaysAgendaItems.map(i => (
                          <div 
                            key={i.id} 
                            onClick={() => { navigate(i.type === 'visit' ? '/site-visits' : `/leads/${i.id}`); setShowNotificationList(false); }}
                            className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-left group relative cursor-pointer ${i.type === 'visit' ? 'hover:bg-blue-50' : 'hover:bg-emerald-50'}`}
                          >
                             <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 group-hover:text-white transition-all shadow-sm ${i.type === 'visit' ? 'bg-blue-50 text-blue-600 group-hover:bg-blue-600' : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600'}`}>
                                {i.type === 'visit' ? <MapPin className="w-5 h-5" /> : <Target className="w-5 h-5" />}
                             </div>
                             <div className="min-w-0 flex-1">
                                <p className="text-[13px] font-black text-slate-900 truncate">{i.name}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">{i.type === 'visit' ? 'Site Visitation' : 'Engagement Due'}</p>
                             </div>
                             <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                               <button 
                                 onClick={(e) => dismissNotification(e, i.id)}
                                 className="p-1.5 bg-white border border-slate-100 rounded-lg text-slate-400 hover:text-emerald-600 transition-all shadow-sm"
                               >
                                 <Check className="w-3.5 h-3.5" />
                               </button>
                               <ArrowRight className={`w-4 h-4 text-slate-200 ${i.type === 'visit' ? 'group-hover:text-blue-500' : 'group-hover:text-emerald-500'} transition-colors`} />
                             </div>
                          </div>
                        ))}
                     </div>
                   )}
                </div>
                <div className="p-4 bg-slate-50/30 border-t border-slate-50 text-center flex justify-between items-center px-6">
                   <button 
                     onClick={() => setDismissedNotifications(todaysAgendaItems.map(i => i.id))} 
                     className="text-[9px] font-black text-slate-300 uppercase tracking-widest hover:text-red-500 transition-colors"
                   >
                      Clear All
                   </button>
                   <button onClick={() => { navigate('/site-visits'); setShowNotificationList(false); }} className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-[#064e3b] transition-colors">
                      View Hub
                   </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 pl-6 border-l border-slate-200">
            <div className="text-right hidden sm:block">
              <p className="text-[14px] font-black text-slate-900 leading-none">{profile?.full_name || 'Firm Member'}</p>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">{isAdmin ? 'Executive Admin' : 'Design Staff'}</p>
            </div>
            <img 
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.full_name || 'Arch1'}`} 
              className="w-12 h-12 rounded-2xl border-2 border-white shadow-lg bg-white cursor-pointer hover:scale-105 transition-transform"
              alt="Avatar"
              onClick={() => navigate('/settings')}
            />
          </div>
        </div>
      </header>

      <div className="pt-8 space-y-12">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Executive Control</h1>
            <p className="text-slate-400 text-sm mt-2 font-medium">Global oversight of pipeline velocity and site operations.</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {(isAdmin || profile?.permissions?.leads) && (
              <button 
                onClick={() => navigate('/leads/new')} 
                className="flex items-center gap-3 px-10 py-5 bg-[#064e3b] text-white rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-emerald-900/20 hover:bg-black hover:scale-105 active:scale-95 transition-all"
              >
                <PlusCircle className="w-5 h-5" /> Add New Lead
              </button>
            )}
            {(isAdmin || profile?.permissions?.site_visits) && (
              <button 
                onClick={() => navigate('/site-visits?schedule=true')} 
                className="flex items-center gap-3 px-10 py-5 bg-blue-600 text-white rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-blue-900/20 hover:bg-black hover:scale-105 active:scale-95 transition-all"
              >
                <MapPin className="w-5 h-5" /> Schedule Visit
              </button>
            )}
            {(isAdmin || profile?.permissions?.projects) && (
              <button 
                onClick={() => navigate('/projects?new=true')} 
                className="flex items-center gap-3 px-10 py-5 bg-slate-900 text-white rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-slate-900/20 hover:bg-[#064e3b] hover:scale-105 active:scale-95 transition-all"
              >
                <Layers className="w-5 h-5" /> Add Project
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { label: 'Total Leads', val: stats.totalLeads, icon: FileText, color: 'bg-emerald-600' },
            { label: 'Active Projects', val: stats.activeProjects, icon: Layers, color: 'bg-blue-600' },
            { label: 'Validated Clients', val: stats.validatedClients, icon: Users, color: 'bg-indigo-600' },
            { label: 'Completions', val: stats.completed, icon: CheckCircle2, color: 'bg-slate-900' }
          ].map((s, i) => (
            <div key={i} className="bg-white p-8 rounded-[44px] border border-slate-100 space-y-8 shadow-sm hover:shadow-xl transition-all group hover:translate-y-[-2px]">
              <div className="flex justify-between items-start">
                <div className={`w-14 h-14 ${s.color} rounded-[22px] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                  <s.icon className="w-6 h-6 text-white" />
                </div>
                <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4 text-slate-900" />
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{s.label}</p>
                <h3 className="text-4xl font-black text-slate-900 tracking-tighter mt-1">{s.val}</h3>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
          <div className="xl:col-span-8 bg-white p-10 rounded-[56px] border border-slate-100 shadow-sm space-y-12">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-xl font-black text-slate-900 tracking-tight">Portfolio Velocity</h4>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2 opacity-80 flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> {timeframe.toUpperCase() + ' PERFORMANCE'}
                </p>
              </div>
              <div className="bg-slate-100 p-1.5 rounded-[24px] flex gap-2">
                  {['Weekly', 'Monthly', 'Yearly'].map(v => (
                      <button 
                        key={v} 
                        onClick={() => setTimeframe(v as any)}
                        className={`px-8 py-3.5 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all ${timeframe === v ? 'bg-white text-[#064e3b] shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        {v}
                      </button>
                  ))}
              </div>
            </div>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barGap={8}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px -10px rgb(0 0 0 / 0.1)', padding: '16px' }} />
                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }} />
                  <Bar dataKey="Leads" fill="#10b981" radius={[6, 6, 0, 0]} barSize={10} />
                  <Bar dataKey="Clients" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={10} />
                  <Bar dataKey="Projects" fill="#0f172a" radius={[6, 6, 0, 0]} barSize={10} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Interaction Calendar */}
          <div className="xl:col-span-4 bg-white rounded-[56px] border border-slate-100 shadow-sm flex flex-col">
            <div className="p-10 border-b border-slate-50">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-xl font-black text-slate-900 tracking-tight">Vault Calendar</h4>
                <div className="flex gap-2">
                  <button onClick={handlePrevMonth} className="p-2.5 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all"><ChevronLeft className="w-4 h-4" /></button>
                  <button onClick={handleNextMonth} className="p-2.5 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
              <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">{currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
            </div>
            
            <div className="p-8 grid grid-cols-7 gap-1 mb-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => <div key={d} className="text-center text-[10px] font-black text-slate-300 uppercase">{d}</div>)}
              {calendarDays.map((day, i) => {
                if (day === null) return <div key={`empty-${i}`} className="h-10" />;
                const dateKey = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                const hasFollowUp = (calendarData[dateKey]?.followUps.length || 0) > 0;
                const hasSiteVisit = (calendarData[dateKey]?.siteVisits.length || 0) > 0;
                const isSelected = selectedDate === dateKey;
                return (
                  <button 
                    key={day} 
                    onClick={() => setSelectedDate(dateKey)}
                    className={`h-10 relative flex items-center justify-center text-xs font-bold rounded-xl transition-all ${isSelected ? 'bg-[#064e3b] text-white shadow-lg' : 'hover:bg-slate-50 text-slate-600'}`}
                  >
                    {day}
                    <div className="absolute bottom-1.5 flex gap-0.5">
                      {hasFollowUp && <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-amber-500 animate-pulse'}`} />}
                      {hasSiteVisit && <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-500 animate-pulse'}`} />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex-1 bg-slate-50/50 p-8 rounded-b-[56px] space-y-6 overflow-y-auto no-scrollbar max-h-[300px]">
               <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Day Intel: {selectedDate}</h5>
               {selectedDayStats.followUps.length === 0 && selectedDayStats.siteVisits.length === 0 && selectedDayStats.newLeads.length === 0 ? (
                 <div className="py-10 text-center space-y-3">
                    <Zap className="w-8 h-8 text-slate-200 mx-auto" />
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No activities scheduled</p>
                 </div>
               ) : (
                 <div className="space-y-4">
                    {selectedDayStats.siteVisits.map(v => (
                      <div key={v.id} onClick={() => navigate(`/site-visits`)} className="flex items-center justify-between p-5 bg-white rounded-3xl border border-slate-100 cursor-pointer hover:border-blue-200 transition-all group shadow-sm">
                         <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all"><MapPin className="w-5 h-5" /></div>
                            <div className="min-w-0">
                               <p className="text-[13px] font-black text-slate-900 truncate max-w-[120px]">{v.name}</p>
                               <p className="text-[9px] font-bold text-slate-400 uppercase truncate">{v.location}</p>
                            </div>
                         </div>
                         <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
                      </div>
                    ))}
                    {selectedDayStats.followUps.map(f => (
                      <div key={f.id} onClick={() => navigate(`/leads/${f.id}`)} className="flex items-center justify-between p-5 bg-white rounded-3xl border border-slate-100 cursor-pointer hover:border-amber-200 transition-all group shadow-sm">
                         <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shadow-sm group-hover:bg-amber-600 group-hover:text-white transition-all"><Target className="w-5 h-5" /></div>
                            <div>
                               <p className="text-[13px] font-black text-slate-900 truncate max-w-[120px]">{f.name}</p>
                               <p className="text-[9px] font-bold text-slate-400 uppercase">Follow Up</p>
                            </div>
                         </div>
                         <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 transition-colors" />
                      </div>
                    ))}
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
