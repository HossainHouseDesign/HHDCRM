
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, CheckCircle2, RefreshCw, 
  ArrowUpRight, Search, Bell, Plus, 
  FileText, TrendingUp, X, 
  Hammer, FileSpreadsheet, Command, UserCheck,
  ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  Activity, Target, ArrowRight, ExternalLink,
  Layers, Clock, Layout, UserPlus, Zap, MessageSquare,
  Briefcase, PlusCircle
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend
} from 'recharts';
import { supabase } from '../supabaseClient';
import { Lead, Project, Profile } from '../types';
import { useNavigate } from 'react-router-dom';
import { useNotification, useUser } from '../App';

type Timeframe = 'Weekly' | 'Monthly' | 'Yearly';

interface DayMeta {
  followUps: { id: string, name: string }[];
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
  const [loading, setLoading] = useState(true);
  
  // Interaction State
  const [timeframe, setTimeframe] = useState<Timeframe>('Monthly');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Notification Popover State
  const [showNotificationList, setShowNotificationList] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDashboardData();
    
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotificationList(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [leadsRes, projectsRes] = await Promise.all([
        supabase.from('leads').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
        supabase.from('projects').select('*').is('deleted_at', null)
      ]);
      setLeads(leadsRes.data || []);
      setProjects(projectsRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calendarData = useMemo(() => {
    const data: Record<string, DayMeta> = {};
    const ensureDate = (d: string) => {
      if (!data[d]) data[d] = { followUps: [], newLeads: [], newClients: [], completions: [] };
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

    projects.filter(p => p.status === 'Complete').forEach(p => {
       const completedDate = p.updated_at?.split('T')[0];
       if (completedDate) {
         ensureDate(completedDate);
         data[completedDate].completions.push({ id: p.id, name: p.name });
       }
    });

    return data;
  }, [leads, projects]);

  const selectedDayStats = useMemo(() => {
    return calendarData[selectedDate] || { followUps: [], newLeads: [], newClients: [], completions: [] };
  }, [calendarData, selectedDate]);

  const todaysFollowUps = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return calendarData[todayStr]?.followUps || [];
  }, [calendarData]);

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
    const monthsArr = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthsArr.push({
        name: d.toLocaleString('default', { month: 'short' }),
        monthNum: d.getMonth(),
        year: d.getFullYear(),
        Leads: 0,
        Clients: 0,
        Projects: 0
      });
    }
    leads.forEach(l => {
      const date = new Date(l.created_at);
      const mIdx = monthsArr.findIndex(m => m.monthNum === date.getMonth() && m.year === date.getFullYear());
      if (mIdx !== -1) {
        if (l.is_client) monthsArr[mIdx].Clients++;
        else monthsArr[mIdx].Leads++;
      }
    });
    projects.forEach(p => {
      const date = new Date(p.created_at);
      const mIdx = monthsArr.findIndex(m => m.monthNum === date.getMonth() && m.year === date.getFullYear());
      if (mIdx !== -1) { monthsArr[mIdx].Projects++; }
    });
    return monthsArr;
  }, [leads, projects]);

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
        <div className="relative w-full md:w-[450px]">
           <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
           <input 
             type="text" 
             placeholder="Secure Command Search..." 
             className="w-full bg-white border border-slate-100 rounded-[24px] h-14 pl-14 pr-12 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-[#064e3b]/5 transition-all shadow-sm" 
             value={searchQuery} 
             onChange={(e) => setSearchQuery(e.target.value)} 
           />
        </div>
        <div className="flex items-center gap-6">
          <div className="relative" ref={notificationRef}>
            <button 
              onClick={() => setShowNotificationList(!showNotificationList)}
              className={`p-4 bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all shadow-sm relative group ${showNotificationList ? 'ring-2 ring-emerald-500/20 bg-emerald-50/10' : ''}`}
            >
              <Bell className={`w-6 h-6 transition-colors ${todaysFollowUps.length > 0 ? 'text-emerald-600 animate-pulse' : 'text-slate-400'}`} />
              {todaysFollowUps.length > 0 && (
                <div className="absolute top-3 right-3 min-w-[20px] h-5 px-1 bg-emerald-600 border-2 border-white rounded-full flex items-center justify-center shadow-md">
                   <span className="text-[10px] font-black text-white leading-none">{todaysFollowUps.length}</span>
                </div>
              )}
            </button>

            {showNotificationList && (
              <div className="absolute top-[calc(100%+12px)] right-0 w-80 bg-white border border-slate-100 rounded-[32px] shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                   <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Today's Agenda</h5>
                   <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg uppercase">{todaysFollowUps.length} Pending</span>
                </div>
                <div className="max-h-80 overflow-y-auto no-scrollbar py-3">
                   {todaysFollowUps.length === 0 ? (
                     <div className="p-10 text-center space-y-4">
                        <Zap className="w-8 h-8 text-slate-200 mx-auto" />
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-relaxed">System clear. No follow-ups scheduled for today.</p>
                     </div>
                   ) : (
                     <div className="space-y-1 px-3">
                        {todaysFollowUps.map(f => (
                          <button 
                            key={f.id} 
                            onClick={() => { navigate(`/leads/${f.id}`); setShowNotificationList(false); }}
                            className="w-full flex items-center gap-4 p-4 hover:bg-emerald-50 rounded-2xl transition-all text-left group"
                          >
                             <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                                <Target className="w-5 h-5" />
                             </div>
                             <div className="min-w-0">
                                <p className="text-[13px] font-black text-slate-900 truncate">{f.name}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">Engagement Due Today</p>
                             </div>
                             <ArrowRight className="w-4 h-4 text-slate-200 ml-auto group-hover:text-emerald-500 transition-colors" />
                          </button>
                        ))}
                     </div>
                   )}
                </div>
                <div className="p-4 bg-slate-50/30 border-t border-slate-50 text-center">
                   <button onClick={() => { navigate('/leads'); setShowNotificationList(false); }} className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-emerald-600 transition-colors">
                      View Discovery Pipeline
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
            <button 
              onClick={() => navigate('/leads/new')} 
              className="flex items-center gap-3 px-10 py-5 bg-[#064e3b] text-white rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-emerald-900/20 hover:bg-black hover:scale-105 active:scale-95 transition-all"
            >
              <PlusCircle className="w-5 h-5" /> Add New Lead
            </button>
            <button 
              onClick={() => navigate('/clients/add')} 
              className="flex items-center gap-3 px-10 py-5 bg-indigo-600 text-white rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-indigo-900/20 hover:bg-black hover:scale-105 active:scale-95 transition-all"
            >
              <Briefcase className="w-5 h-5" /> Add Client
            </button>
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
                <h4 className="text-xl font-black text-slate-900 tracking-tight">Lead Trajectory</h4>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2 opacity-80 flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> PIPELINE PERFORMANCE
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
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barGap={8}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px -10px rgb(0 0 0 / 0.1)', padding: '16px' }} />
                  <Bar dataKey="Leads" fill="#10b981" radius={[6, 6, 0, 0]} barSize={10} />
                  <Bar dataKey="Clients" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={10} />
                  <Bar dataKey="Projects" fill="#0f172a" radius={[6, 6, 0, 0]} barSize={10} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="xl:col-span-4 bg-[#0a0a0a] rounded-[56px] shadow-2xl flex flex-col relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
            <div className="p-10 relative z-10">
              <div className="flex justify-between items-center mb-10">
                <div>
                   <h4 className="text-white text-xl font-black tracking-tight flex items-center gap-3"><CalendarIcon className="w-5 h-5 text-emerald-400" /> Firm Calendar</h4>
                   <p className="text-white/30 text-[9px] font-black uppercase tracking-widest mt-1">PLANNING HUB</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={handlePrevMonth} className="p-2.5 bg-white/5 rounded-xl hover:bg-white/10 transition-all text-white/40 hover:text-white"><ChevronLeft className="w-4 h-4" /></button>
                  <button onClick={handleNextMonth} className="p-2.5 bg-white/5 rounded-xl hover:bg-white/10 transition-all text-white/40 hover:text-white"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="text-center mb-8"><h3 className="text-2xl font-black text-white capitalize">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3></div>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => <div key={d} className="text-center text-[10px] font-black text-white/20 uppercase">{d}</div>)}
                {calendarDays.map((day, i) => {
                  if (day === null) return <div key={`empty-${i}`} className="h-10" />;
                  const dateKey = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                  const meta = calendarData[dateKey];
                  const hasActivity = meta && (meta.followUps.length > 0 || meta.newLeads.length > 0 || meta.newClients.length > 0);
                  const isSelected = selectedDate === dateKey;
                  const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();
                  
                  return (
                    <button 
                      key={day} 
                      onClick={() => setSelectedDate(dateKey)}
                      className={`h-11 relative flex flex-col items-center justify-center text-xs font-black rounded-2xl transition-all ${isSelected ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/40 scale-110' : isToday ? 'border border-emerald-500/50 text-white' : 'hover:bg-white/5 text-white/40'}`}
                    >
                      {day}
                      <div className="flex gap-0.5 mt-0.5">
                         {meta?.followUps.length ? <div className="w-1 h-1 bg-emerald-400 rounded-full" /> : null}
                         {meta?.newLeads.length ? <div className="w-1 h-1 bg-blue-400 rounded-full" /> : null}
                         {meta?.completions.length ? <div className="w-1 h-1 bg-indigo-400 rounded-full" /> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 bg-white/5 p-8 rounded-b-[56px] space-y-6 overflow-y-auto no-scrollbar max-h-[350px] relative z-10 border-t border-white/5">
               <div className="flex items-center justify-between">
                  <h5 className="text-[10px] font-black uppercase text-white/30 tracking-widest">Day Intelligence: {new Date(selectedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</h5>
                  <div className="px-3 py-1 bg-emerald-500/10 rounded-lg text-emerald-400 text-[9px] font-black uppercase tracking-widest">Active Sync</div>
               </div>
               
               <div className="space-y-4">
                  {selectedDayStats.followUps.length === 0 && selectedDayStats.newLeads.length === 0 && selectedDayStats.completions.length === 0 ? (
                    <div className="py-12 text-center space-y-4">
                       <Zap className="w-10 h-10 text-white/5 mx-auto" />
                       <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">No firm records for this date</p>
                    </div>
                  ) : (
                    <div className="space-y-5">
                       {selectedDayStats.followUps.map(f => (
                         <div key={f.id} onClick={() => navigate(`/leads/${f.id}`)} className="flex items-center justify-between p-5 bg-white/5 border border-white/5 rounded-[32px] cursor-pointer hover:bg-white/10 transition-all group shadow-sm">
                            <div className="flex items-center gap-4">
                               <div className="w-11 h-11 bg-emerald-500 text-black rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"><Target className="w-5 h-5" /></div>
                               <div><p className="text-[13px] font-black text-white truncate max-w-[150px]">{f.name}</p><p className="text-[9px] font-bold text-emerald-400 uppercase mt-0.5 tracking-widest">Follow Up Schedule</p></div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-emerald-400 transition-colors" />
                         </div>
                       ))}
                       {selectedDayStats.newLeads.map(l => (
                         <div key={l.id} onClick={() => navigate(`/leads/${l.id}`)} className="flex items-center justify-between p-5 bg-white/5 border border-white/5 rounded-[32px] cursor-pointer hover:bg-white/10 transition-all group shadow-sm">
                            <div className="flex items-center gap-4">
                               <div className="w-11 h-11 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"><PlusCircle className="w-5 h-5" /></div>
                               <div><p className="text-[13px] font-black text-white truncate max-w-[150px]">{l.name}</p><p className="text-[9px] font-bold text-blue-400 uppercase mt-0.5 tracking-widest">Inquiry Ingested</p></div>
                            </div>
                            <ExternalLink className="w-4 h-4 text-white/20 group-hover:text-blue-400 transition-colors" />
                         </div>
                       ))}
                       {selectedDayStats.completions.map(c => (
                         <div key={c.id} onClick={() => navigate(`/projects/${c.id}`)} className="flex items-center justify-between p-5 bg-white/5 border border-white/5 rounded-[32px] cursor-pointer hover:bg-white/10 transition-all group shadow-sm">
                            <div className="flex items-center gap-4">
                               <div className="w-11 h-11 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"><CheckCircle2 className="w-5 h-5" /></div>
                               <div><p className="text-[13px] font-black text-white truncate max-w-[150px]">{c.name}</p><p className="text-[9px] font-bold text-indigo-400 uppercase mt-0.5 tracking-widest">Project Completed</p></div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-indigo-400 transition-colors" />
                         </div>
                       ))}
                    </div>
                  )}
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
