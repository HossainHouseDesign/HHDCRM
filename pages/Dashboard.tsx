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
  Check, MapPin, HardHat, LayoutDashboard, Users2, Settings, History
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend
} from 'recharts';
import { supabase } from '../supabaseClient';
import { Lead, Project, Profile, SiteVisit } from '../types';
import { useNavigate } from 'react-router-dom';
import { useNotification, useUser, useAppState } from '../App';

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
  const { isSyncing, triggerSync, agendaItems } = useAppState();
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
  
  // Desktop Notification Popover State
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

  // Mobile Menu Items (Icons used for the mobile grid)
  const mobileNavItems = useMemo(() => {
    const items = [
      { name: 'Leads', icon: FileText, path: '/leads', key: 'leads', color: 'bg-emerald-50 text-emerald-600' },
      { name: 'Visits', icon: MapPin, path: '/site-visits', key: 'site_visits', color: 'bg-blue-50 text-blue-600' },
      { name: 'Quote', icon: FileSpreadsheet, path: '/quotations', key: 'quotations', color: 'bg-purple-50 text-purple-600' },
      { name: 'Clients', icon: Users, path: '/clients', key: 'clients', color: 'bg-indigo-50 text-indigo-600' },
      { name: 'Projects', icon: Layers, path: '/projects', key: 'projects', color: 'bg-slate-100 text-slate-800' },
      { name: 'Site', icon: Hammer, path: '/construction', key: 'construction', color: 'bg-orange-50 text-orange-600' },
      { name: 'Team', icon: Users2, path: '/team', key: 'team', color: 'bg-rose-50 text-rose-600' },
      { name: 'Vault', icon: History, path: '/settings/recycle-bin', key: 'settings', color: 'bg-slate-100 text-slate-400', adminOnly: true },
      { name: 'Setting', icon: Settings, path: '/settings', key: 'settings', color: 'bg-slate-50 text-slate-500' },
    ];

    return items.filter(item => {
      if (item.adminOnly && !isAdmin) return false;
      if (isAdmin) return true;
      return profile?.permissions?.[item.key as keyof typeof profile.permissions] === true;
    });
  }, [profile, isAdmin]);

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

  // FIX: Added missing calendarDays memo to calculate days for the current month grid
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days: (number | null)[] = [];
    // Padding for the start of the week
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    // Days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
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
          const cIdx = dataPoints.findIndex(dp => dp.key === cDate);
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
      {/* Dashboard Top Header */}
      <header className="sticky top-16 lg:top-0 z-40 bg-[#f8fafc]/80 backdrop-blur-md py-6 sm:py-8 flex flex-col lg:flex-row justify-between items-center gap-4 lg:gap-8 border-b border-slate-50">
        <div className="relative w-full lg:w-[450px]" ref={searchContainerRef}>
           <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
           <input 
             type="text" 
             placeholder="Secure Command Search..." 
             className="w-full bg-white border border-slate-100 rounded-[24px] h-12 lg:h-14 pl-14 pr-12 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-[#064e3b]/5 transition-all shadow-sm" 
             value={searchQuery} 
             onFocus={() => setShowSearchResults(true)}
             onChange={(e) => {
               setSearchQuery(e.target.value);
               setShowSearchResults(true);
             }} 
           />
           
           {showSearchResults && searchQuery.trim() !== '' && (
             <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white border border-slate-100 rounded-[32px] shadow-2xl z-[100] overflow-hidden">
                <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                   <h5 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 flex items-center gap-2">
                     <CommandIcon className="w-3 h-3" /> Command Results
                   </h5>
                   <button onClick={() => setShowSearchResults(false)} className="p-1 hover:bg-slate-100 rounded-full text-slate-300"><X className="w-3.5 h-3.5" /></button>
                </div>
                
                <div className="max-h-[350px] overflow-y-auto no-scrollbar p-2 space-y-1">
                   {!hasAnyResults ? (
                     <div className="py-12 text-center text-slate-300 uppercase text-[10px] font-black tracking-widest">No results</div>
                   ) : (
                     <>
                        {searchResults.projects.map(p => (
                          <button key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="w-full text-left p-3 hover:bg-slate-50 rounded-xl flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0"><Layers className="w-4 h-4" /></div>
                            <span className="text-sm font-bold truncate">{p.name}</span>
                          </button>
                        ))}
                        {searchResults.clients.map(c => (
                          <button key={c.id} onClick={() => navigate(`/leads/${c.id}`)} className="w-full text-left p-3 hover:bg-slate-50 rounded-xl flex items-center gap-3">
                            <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0"><UserCheck className="w-4 h-4" /></div>
                            <span className="text-sm font-bold truncate">{c.client_name}</span>
                          </button>
                        ))}
                        {searchResults.leads.map(l => (
                          <button key={l.id} onClick={() => navigate(`/leads/${l.id}`)} className="w-full text-left p-3 hover:bg-slate-50 rounded-xl flex items-center gap-3">
                            <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0"><FileText className="w-4 h-4" /></div>
                            <span className="text-sm font-bold truncate">{l.client_name}</span>
                          </button>
                        ))}
                     </>
                   )}
                </div>
             </div>
           )}
        </div>
        
        {/* Desktop Header Actions (Hidden on Mobile as they moved to global header) */}
        <div className="hidden lg:flex items-center justify-between w-full lg:w-auto gap-4 lg:gap-6">
          <div className="flex items-center gap-3">
            <button onClick={() => fetchDashboardData(true)} className="p-3 lg:p-4 bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all shadow-sm">
              <RefreshCw className={`w-5 lg:w-6 h-5 lg:h-6 text-slate-400 ${syncing ? 'animate-spin text-emerald-600' : ''}`} />
            </button>

            <div className="relative" ref={notificationRef}>
              <button onClick={() => setShowNotificationList(!showNotificationList)} className="p-3 lg:p-4 bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 shadow-sm relative">
                <Bell className={`w-5 lg:w-6 h-5 lg:h-6 ${agendaItems.length > 0 ? 'text-emerald-600 animate-pulse' : 'text-slate-400'}`} />
                {agendaItems.length > 0 && <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-emerald-600 rounded-full border-2 border-white" />}
              </button>
              {showNotificationList && (
                <div className="absolute top-[calc(100%+8px)] right-0 w-72 lg:w-80 bg-white border border-slate-100 rounded-[28px] shadow-2xl z-[100] overflow-hidden">
                   <div className="p-4 bg-slate-50 border-b text-[10px] font-black uppercase tracking-widest text-slate-500">Today's Agenda</div>
                   <div className="max-h-64 overflow-y-auto no-scrollbar p-2">
                     {agendaItems.length === 0 ? <p className="p-8 text-center text-xs text-slate-300 uppercase font-black tracking-widest">No tasks</p> : 
                      agendaItems.map(i => (
                        <div key={i.id} onClick={() => navigate(i.type === 'visit' ? `/site-visits/${i.id}` : `/leads/${i.id}`)} className="p-3 hover:bg-slate-50 rounded-2xl cursor-pointer flex items-center gap-3">
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${i.type === 'visit' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>{i.type === 'visit' ? <MapPin className="w-5 h-5" /> : <Target className="w-5 h-5" />}</div>
                           <span className="text-sm font-bold truncate">{i.name}</span>
                        </div>
                      ))
                     }
                   </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 pl-4 lg:pl-6 border-l border-slate-200">
            <div className="text-right hidden sm:block">
              <p className="text-[13px] lg:text-[14px] font-black text-slate-900 leading-none">{profile?.full_name || 'Member'}</p>
              <p className="text-[9px] lg:text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Workspace</p>
            </div>
            <img 
              src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.email || 'Arch'}`} 
              className="w-10 lg:w-12 h-10 lg:h-12 rounded-xl lg:rounded-2xl border-2 border-white shadow-lg bg-white cursor-pointer object-cover"
              alt="Avatar"
              onClick={() => navigate('/settings')}
            />
          </div>
        </div>

        {/* Mobile Spacer (for UI alignment when the search bar is full width) */}
        <div className="lg:hidden w-full h-2"></div>
      </header>

      <div className="pt-8 space-y-12">
        {/* MOBILE ICON NAVIGATION GRID - VISIBLE ONLY ON MOBILE */}
        <section className="lg:hidden animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Quick Navigation</h2>
            <div className="h-px flex-1 bg-slate-100 ml-4"></div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
            {mobileNavItems.map((item) => (
              <button
                key={item.name}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center gap-3 p-4 bg-white border border-slate-50 rounded-[24px] shadow-sm active:scale-95 active:bg-slate-50 transition-all group"
              >
                <div className={`w-12 h-12 ${item.color} rounded-2xl flex items-center justify-center shadow-sm group-active:shadow-inner`}>
                  <item.icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Main Actions Stacked on Mobile */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">Executive Control</h1>
            <p className="text-slate-400 text-xs lg:text-sm font-medium">Pipeline velocity and site operation status.</p>
          </div>
          <div className="flex flex-wrap lg:flex-nowrap items-center gap-3 w-full lg:w-auto">
            <button onClick={() => navigate('/leads/new')} className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-[#064e3b] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all">
              <PlusCircle className="w-4 h-4" /> New Lead
            </button>
            <button onClick={() => navigate('/site-visits?schedule=true')} className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all">
              <MapPin className="w-4 h-4" /> Schedule Visit
            </button>
          </div>
        </div>

        {/* Stats Grid responsive tiers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {[
            { label: 'Pipeline Leads', val: stats.totalLeads, icon: FileText, color: 'bg-emerald-600' },
            { label: 'Active Projects', val: stats.activeProjects, icon: Layers, color: 'bg-blue-600' },
            { label: 'Validated Clients', val: stats.validatedClients, icon: Users, color: 'bg-indigo-600' },
            { label: 'Project Completions', val: stats.completed, icon: CheckCircle2, color: 'bg-slate-900' }
          ].map((s, i) => (
            <div key={i} className="bg-white p-6 lg:p-8 rounded-[32px] lg:rounded-[44px] border border-slate-100 shadow-sm hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-6 lg:mb-8">
                <div className={`w-12 lg:w-14 h-12 lg:h-14 ${s.color} rounded-2xl flex items-center justify-center shadow-lg`}>
                  <s.icon className="w-5 lg:w-6 h-5 lg:h-6 text-white" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-300" />
              </div>
              <p className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
              <h3 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tighter mt-1">{s.val}</h3>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 lg:gap-10">
          {/* Chart Section */}
          <div className="xl:col-span-8 bg-white p-6 lg:p-10 rounded-[40px] lg:rounded-[56px] border border-slate-100 shadow-sm space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h4 className="text-lg lg:text-xl font-black text-slate-900">Portfolio Performance</h4>
                <p className="text-[9px] lg:text-[10px] text-slate-400 font-black uppercase mt-1">Synced Pipeline Metrics</p>
              </div>
              <div className="bg-slate-50 p-1 rounded-2xl flex w-full sm:w-auto">
                  {['Weekly', 'Monthly', 'Yearly'].map(v => (
                      <button key={v} onClick={() => setTimeframe(v as any)} className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${timeframe === v ? 'bg-white text-[#064e3b] shadow-sm' : 'text-slate-400'}`}>
                        {v}
                      </button>
                  ))}
              </div>
            </div>
            <div className="h-[300px] lg:h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.1)', padding: '12px' }} />
                  <Bar dataKey="Leads" fill="#10b981" radius={[4, 4, 0, 0]} barSize={8} />
                  <Bar dataKey="Clients" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={8} />
                  <Bar dataKey="Projects" fill="#0f172a" radius={[4, 4, 0, 0]} barSize={8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Calendar Section */}
          <div className="xl:col-span-4 bg-white rounded-[40px] lg:rounded-[56px] border border-slate-100 shadow-sm flex flex-col overflow-hidden">
            <div className="p-8 lg:p-10 border-b border-slate-50 flex justify-between items-center">
              <div>
                <h4 className="text-lg lg:text-xl font-black text-slate-900 tracking-tight">Vault Calendar</h4>
                <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest mt-1">{currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={handlePrevMonth} className="p-2 bg-slate-50 rounded-lg"><ChevronLeft className="w-4 h-4" /></button>
                <button onClick={handleNextMonth} className="p-2 bg-slate-50 rounded-lg"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
            
            <div className="p-6 lg:p-8 grid grid-cols-7 gap-1">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => <div key={d} className="text-center text-[9px] font-black text-slate-300 uppercase py-2">{d}</div>)}
              {calendarDays.map((day, i) => {
                if (day === null) return <div key={`empty-${i}`} className="h-8 lg:h-10" />;
                const dateKey = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                const isSelected = selectedDate === dateKey;
                return (
                  <button 
                    key={day} 
                    onClick={() => setSelectedDate(dateKey)}
                    className={`h-8 lg:h-10 relative flex items-center justify-center text-[11px] font-bold rounded-xl transition-all ${isSelected ? 'bg-[#064e3b] text-white shadow-md' : 'hover:bg-slate-50 text-slate-600'}`}
                  >
                    {day}
                    {(calendarData[dateKey]?.siteVisits.length || 0) > 0 && <div className="absolute bottom-1 w-1 h-1 bg-blue-500 rounded-full" />}
                  </button>
                );
              })}
            </div>

            <div className="flex-1 bg-slate-50/50 p-6 lg:p-8 space-y-4 overflow-y-auto max-h-[250px] no-scrollbar">
               {selectedDayStats.followUps.length === 0 && selectedDayStats.siteVisits.length === 0 ? (
                 <p className="text-[10px] text-center text-slate-300 font-black uppercase tracking-widest py-8">System clear for this date</p>
               ) : (
                 <div className="space-y-3">
                    {selectedDayStats.siteVisits.map(v => (
                      <div key={v.id} className="p-4 bg-white rounded-2xl border border-slate-100 flex items-center justify-between group cursor-pointer" onClick={() => navigate(`/site-visits/${v.id}`)}>
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center"><MapPin className="w-4 h-4" /></div>
                           <span className="text-xs font-bold text-slate-700 truncate max-w-[120px]">{v.name}</span>
                         </div>
                         <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:translate-x-1 transition-transform" />
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