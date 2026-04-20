
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
  Check, MapPin, HardHat, LayoutDashboard, Users2, Settings, History,
  Banknote
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
        showNotification("Workspace updated.", "success");
      }
    } catch (err) {
      console.error(err);
      showNotification("Failed to connect to the archive.", "error");
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
      { name: 'Finance', icon: Banknote, path: '/finance', key: 'finance', color: 'bg-amber-50 text-amber-600' },
      { name: 'Site', icon: Hammer, path: '/construction', key: 'construction', color: 'bg-orange-50 text-orange-600' },
      { name: 'Team', icon: Users2, path: '/team', key: 'team', color: 'bg-rose-50 text-rose-600' },
      { name: 'Trash', icon: History, path: '/settings/recycle-bin', key: 'settings', color: 'bg-slate-100 text-slate-400', adminOnly: true },
      { name: 'Setting', icon: Settings, path: '/settings', key: 'settings', color: 'bg-slate-50 text-slate-500' },
    ];

    return items.filter(item => {
      if (item.adminOnly && !isAdmin) return false;
      if (isAdmin) return true;
      
      const perms = profile?.permissions?.[item.key as keyof typeof profile.permissions];
      if (perms && typeof perms === 'object') {
        return (perms as any).view === true || (perms as any).access === true;
      }
      return perms === true;
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
        name: v.project?.name || v.lead?.client_name || 'Site Visit', 
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

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
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
      <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em]">Loading Workspace...</p>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-700 max-w-[1600px] mx-auto px-4 sm:px-6 md:px-10 pb-12">
      {/* Dashboard Top Header */}
      <header className="sticky top-16 lg:top-0 z-40 bg-[#f8fafc]/80 backdrop-blur-md py-2 px-4 flex flex-col lg:flex-row justify-between items-center gap-2 lg:gap-4 border-b border-slate-100 shadow-sm transition-all">
        <div className="relative w-full lg:w-[350px]" ref={searchContainerRef}>
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
           <input 
             type="text" 
             placeholder="Search archive..." 
             className="w-full bg-white border border-slate-200 rounded-lg h-8 pl-9 pr-8 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all shadow-none" 
             value={searchQuery} 
             onFocus={() => setShowSearchResults(true)}
             onChange={(e) => {
               setSearchQuery(e.target.value);
               setShowSearchResults(true);
             }} 
           />
           
           {showSearchResults && searchQuery.trim() !== '' && (
             <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl z-[100] overflow-hidden">
                <div className="p-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                   <h5 className="text-[9px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                     <CommandIcon className="w-3 h-3" /> ARCHIVE SEARCH
                   </h5>
                   <button onClick={() => setShowSearchResults(false)} className="p-1 hover:bg-slate-100 rounded-full text-slate-300"><X className="w-3 h-3" /></button>
                </div>
                
                <div className="max-h-[300px] overflow-y-auto no-scrollbar p-1 space-y-0.5">
                   {!hasAnyResults ? (
                     <div className="py-8 text-center text-slate-200 uppercase text-[9px] font-black tracking-widest leading-none">Access Denied: No Records</div>
                   ) : (
                     <>
                        {searchResults.projects.map(p => (
                          <button key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg flex items-center gap-3">
                            <div className="w-7 h-7 bg-slate-50 text-slate-300 rounded flex items-center justify-center shrink-0"><Layers className="w-3.5 h-3.5" /></div>
                            <span className="text-[12px] font-bold text-slate-700 truncate leading-none uppercase">{p.name}</span>
                          </button>
                        ))}
                        {searchResults.clients.map(c => (
                          <button key={c.id} onClick={() => navigate(`/leads/${c.id}`)} className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg flex items-center gap-3">
                            <div className="w-7 h-7 bg-emerald-50 text-emerald-600 rounded flex items-center justify-center shrink-0"><UserCheck className="w-3.5 h-3.5" /></div>
                            <span className="text-[12px] font-bold text-slate-700 truncate leading-none uppercase">{c.client_name}</span>
                          </button>
                        ))}
                        {searchResults.leads.map(l => (
                          <button key={l.id} onClick={() => navigate(`/leads/${l.id}`)} className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg flex items-center gap-3">
                            <div className="w-7 h-7 bg-slate-100 text-slate-400 rounded flex items-center justify-center shrink-0"><FileText className="w-3.5 h-3.5" /></div>
                            <span className="text-[12px] font-bold text-slate-700 truncate leading-none uppercase">{l.client_name}</span>
                          </button>
                        ))}
                     </>
                   )}
                </div>
             </div>
           )}
        </div>
        
        {/* Desktop Header Actions */}
        <div className="hidden lg:flex items-center justify-between w-full lg:w-auto gap-2">
          <div className="flex items-center gap-1.5">
            <button onClick={() => fetchDashboardData(true)} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all shadow-none">
              <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${syncing ? 'animate-spin text-emerald-600' : ''}`} />
            </button>

            <div className="relative" ref={notificationRef}>
              <button onClick={() => setShowNotificationList(!showNotificationList)} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-none relative">
                <Bell className={`w-3.5 h-3.5 ${agendaItems.length > 0 ? 'text-emerald-600 animate-pulse' : 'text-slate-400'}`} />
                {agendaItems.length > 0 && <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-emerald-600 rounded-full border border-white" />}
              </button>
              {showNotificationList && (
                <div className="absolute top-[calc(100%+4px)] right-0 w-64 bg-white border border-slate-200 rounded-xl shadow-2xl z-[100] overflow-hidden">
                   <div className="p-2 bg-slate-50 border-b text-[9px] font-black uppercase tracking-widest text-slate-500 leading-none">Today's Agenda</div>
                   <div className="max-h-60 overflow-y-auto no-scrollbar p-1">
                     {agendaItems.length === 0 ? <p className="p-6 text-center text-[9px] text-slate-200 uppercase font-black tracking-widest uppercase">Agenda Clear</p> : 
                      agendaItems.map(i => (
                        <div key={i.id} onClick={() => navigate(i.type === 'visit' ? `/site-visits/${i.id}` : `/leads/${i.id}`)} className="p-2 hover:bg-slate-50 rounded-lg cursor-pointer flex items-center gap-2.5">
                           <div className={`w-7 h-7 rounded flex items-center justify-center shrink-0 ${i.type === 'visit' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>{i.type === 'visit' ? <MapPin className="w-3.5 h-3.5" /> : <Target className="w-3.5 h-3.5" />}</div>
                           <span className="text-[11px] font-bold text-slate-700 truncate leading-none uppercase">{i.name}</span>
                        </div>
                      ))
                     }
                   </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
            <div className="text-right hidden sm:block">
              <p className="text-[12px] font-bold text-slate-900 leading-none uppercase tracking-tight">{profile?.full_name?.split(' ')[0] || 'REDACTED'}</p>
              <p className="text-[8px] text-slate-300 font-bold uppercase tracking-widest mt-1 leading-none">OPERATIVE</p>
            </div>
            <img 
              src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.email || 'Arch'}`} 
              className="w-9 h-9 rounded-lg border border-white shadow-sm bg-white cursor-pointer object-cover"
              alt="Avatar"
              onClick={() => navigate('/settings')}
            />
          </div>
        </div>

        <div className="lg:hidden w-full h-1"></div>
      </header>

      <div className="pt-4 space-y-6">
        {/* MOBILE ICON NAVIGATION GRID */}
        <section className="lg:hidden animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-300">Quick Portal</h2>
            <div className="h-[1px] flex-1 bg-slate-100 ml-4"></div>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
            {mobileNavItems.map((item) => (
              <button
                key={item.name}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center gap-1.5 p-2 bg-white border border-slate-100 rounded-xl shadow-none active:scale-95 active:bg-slate-50 transition-all group"
              >
                <div className={`w-9 h-9 ${item.color} rounded-lg flex items-center justify-center shadow-none`}>
                  <item.icon className="w-4 h-4" />
                </div>
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none truncate w-full text-center">{item.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Header Section */}
        <div className="flex flex-row justify-between items-center gap-3 mb-4 px-1">
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none uppercase">COMMAND CENTER</h1>
            <p className="text-slate-400 text-[8px] font-black uppercase tracking-[0.2em] mt-1.5 leading-none flex items-center gap-1.5">
               <Activity className="w-3 h-3 text-emerald-500" /> Operational Matrix
            </p>
          </div>
          <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 shadow-none">
            <button 
              onClick={() => navigate('/leads/new')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-md text-[8px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-none leading-none"
            >
              <PlusCircle className="w-3 h-3" /> LEAD
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Leads', val: stats.totalLeads, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Active', val: stats.activeProjects, icon: Layers, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Clients', val: stats.validatedClients, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'History', val: stats.completed, icon: CheckCircle2, color: 'text-slate-600', bg: 'bg-slate-100' }
          ].map((s, i) => (
            <div key={i} className="bg-white p-3 rounded-xl border border-slate-100 shadow-none transition-all group hover:border-slate-300">
              <div className="flex justify-between items-start mb-2">
                <div className={`w-7 h-7 ${s.bg} ${s.color} rounded flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <s.icon className="w-3.5 h-3.5" />
                </div>
                <ArrowUpRight className="w-3 h-3 text-slate-200 group-hover:text-slate-900 transition-colors" />
              </div>
              <p className="text-xl font-bold text-slate-900 mb-0.5 tracking-tighter">{s.val}</p>
              <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-none group-hover:text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          {/* Charts Section */}
          <div className="xl:col-span-8 bg-white p-4 rounded-xl border border-slate-100 shadow-none space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h4 className="text-xs font-bold text-slate-900 tracking-tight uppercase leading-none">Operational Rhythm</h4>
                <p className="text-[8px] text-slate-300 font-black uppercase tracking-widest mt-1.5 leading-none italic">Throughput Analytics</p>
              </div>
              <div className="bg-slate-50 p-0.5 rounded-lg flex w-full sm:w-auto overflow-hidden border border-slate-100">
                  {['Weekly', 'Monthly', 'Yearly'].map(v => (
                      <button 
                        key={v} 
                        onClick={() => setTimeframe(v as any)} 
                        className={`flex-1 sm:flex-none px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-wider transition-all leading-none ${timeframe === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        {v}
                      </button>
                  ))}
              </div>
            </div>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 8, fontWeight: 700}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 8, fontWeight: 700}} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', padding: '8px' }} labelStyle={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }} itemStyle={{ fontSize: '10px', fontWeight: 700, padding: 0 }} />
                  <Bar dataKey="Leads" fill="#60a5fa" radius={[2, 2, 0, 0]} barSize={6} />
                  <Bar dataKey="Clients" fill="#10b981" radius={[2, 2, 0, 0]} barSize={6} />
                  <Bar dataKey="Projects" fill="#0f172a" radius={[2, 2, 0, 0]} barSize={6} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Calendar Section */}
          <div className="xl:col-span-4 bg-white rounded-xl border border-slate-100 shadow-none flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
              <div>
                <h4 className="text-xs font-bold text-slate-900 tracking-tight uppercase leading-none">Engagement log</h4>
                <p className="text-[8px] font-black uppercase text-blue-600 tracking-widest mt-1.5 leading-none">{currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
              </div>
              <div className="flex gap-0.5">
                <button onClick={handlePrevMonth} className="p-1 text-slate-300 hover:text-slate-900 hover:bg-white rounded transition-all"><ChevronLeft className="w-3.5 h-3.5" /></button>
                <button onClick={handleNextMonth} className="p-1 text-slate-300 hover:text-slate-900 hover:bg-white rounded transition-all"><ChevronRight className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            
            <div className="p-3 grid grid-cols-7 gap-0.5 border-b border-slate-100 bg-white">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, idx) => (
                <div key={`${d}-${idx}`} className="text-center text-[8px] font-black text-slate-300 uppercase py-1">{d}</div>
              ))}
              {calendarDays.map((day, i) => {
                if (day === null) return <div key={`empty-${i}`} className="h-7" />;
                const dateKey = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                const isSelected = selectedDate === dateKey;
                const isToday = day === new Date().getDate() && 
                                currentDate.getMonth() === new Date().getMonth() && 
                                currentDate.getFullYear() === new Date().getFullYear();

                return (
                  <button 
                    key={i} 
                    onClick={() => setSelectedDate(dateKey)}
                    className={`h-7 relative flex items-center justify-center text-[10px] font-bold rounded transition-all ${
                      isSelected ? 'bg-slate-900 text-white shadow-none' : 
                      isToday ? 'text-blue-600 bg-blue-50/50' : 
                      'hover:bg-slate-50 text-slate-500'
                    }`}
                  >
                    {day}
                    {(calendarData[dateKey]?.siteVisits.length || 0) > 0 && <div className={`absolute bottom-0.5 w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-500'}`} />}
                  </button>
                );
              })}
            </div>

            <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-[180px] no-scrollbar italic text-[9px] font-medium text-slate-400 leading-relaxed bg-slate-50/20">
               {selectedDayStats.followUps.length === 0 && selectedDayStats.siteVisits.length === 0 ? (
                 <div className="py-8 text-center grayscale opacity-50">
                   <Clock className="w-6 h-6 text-slate-200 mx-auto mb-2" />
                   <p className="text-[8px] text-slate-300 font-bold uppercase tracking-widest">Logs Empty</p>
                 </div>
               ) : (
                 <div className="space-y-1.5">
                    {selectedDayStats.siteVisits.map(v => (
                      <div 
                        key={v.id} 
                        className="p-2.5 bg-white rounded-lg border border-slate-100 flex items-center justify-between group cursor-pointer hover:border-slate-300 hover:shadow-sm transition-all" 
                        onClick={() => navigate(`/site-visits/${v.id}`)}
                      >
                         <div className="flex items-center gap-2">
                           <div className="w-6 h-6 bg-blue-50 text-blue-600 rounded flex items-center justify-center"><MapPin className="w-3.5 h-3.5" /></div>
                           <span className="text-[11px] font-bold text-slate-700 truncate max-w-[140px] uppercase leading-none">{v.name}</span>
                         </div>
                         <ArrowUpRight className="w-3 h-3 text-slate-200 group-hover:text-slate-900 transition-all" />
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
