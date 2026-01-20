import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { 
  Users, CheckCircle2, RefreshCw, 
  ArrowUpRight, Search, Bell, Plus, 
  Pause, Square, Briefcase, FileText, Layout,
  UserPlus, Layers
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend
} from 'recharts';
import { supabase } from '../supabaseClient';
import { Lead, Profile } from '../types';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [team, setTeam] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'Weekly' | 'Monthly' | 'Yearly'>('Monthly');
  
  // Manual Dimension Tracking - The "Nuclear Option" for Recharts width -1
  const [dimensions, setDimensions] = useState({ width: 0, height: 400 });
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      if (!entries.length) return;
      const { width } = entries[0].contentRect;
      if (width > 0) {
        // We use a fixed height of 400 to stabilize the layout
        setDimensions({ width, height: 400 });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [leadsRes, teamRes] = await Promise.all([
        supabase.from('leads').select('*').order('created_at', { ascending: true }),
        supabase.from('profiles').select('*').eq('status', 'active').limit(4)
      ]);
      setLeads(leadsRes.data || []);
      setTeam(teamRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  const currentMonthStats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const leadsThisMonth = leads.filter(l => 
      !l.is_client && new Date(l.created_at) >= startOfMonth
    ).length;

    const clientsThisMonth = leads.filter(l => 
      l.is_client && l.converted_at && new Date(l.converted_at) >= startOfMonth
    ).length;

    const projectsThisMonth = leads.filter(l => 
      l.is_client && l.status !== 'Completed' && l.converted_at && new Date(l.converted_at) >= startOfMonth
    ).length;

    const completedThisMonth = leads.filter(l => 
      l.is_client && l.status === 'Completed' && l.updated_at && new Date(l.updated_at) >= startOfMonth
    ).length;

    return { leadsThisMonth, clientsThisMonth, projectsThisMonth, completedThisMonth };
  }, [leads]);

  const analyticsData = useMemo(() => {
    if (!leads.length) return [];
    const now = new Date();
    
    if (timeframe === 'Monthly') {
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleString('default', { month: 'short' });
        const start = new Date(d.getFullYear(), d.getMonth(), 1);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);

        months.push({
          name: label,
          Lead: leads.filter(l => !l.is_client && new Date(l.created_at) >= start && new Date(l.created_at) <= end).length,
          Client: leads.filter(l => l.is_client && l.converted_at && new Date(l.converted_at) >= start && new Date(l.converted_at) <= end).length,
          Project: leads.filter(l => l.is_client && l.status !== 'Completed' && l.converted_at && new Date(l.converted_at) >= start && new Date(l.converted_at) <= end).length,
          Completed: leads.filter(l => l.status === 'Completed' && l.updated_at && new Date(l.updated_at) >= start && new Date(l.updated_at) <= end).length,
        });
      }
      return months;
    }
    return [];
  }, [leads, timeframe]);

  if (loading) return (
    <div className="h-[70vh] flex flex-col items-center justify-center gap-6 px-6 text-center">
      <RefreshCw className="w-10 h-10 text-[#064e3b] animate-spin" />
      <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em]">Architecting Workspace Environment...</p>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-700 max-w-[1600px] mx-auto overflow-x-hidden px-4 sm:px-6 md:px-10 pb-24">
      <header className="sticky top-0 z-40 bg-[#f8fafc]/80 backdrop-blur-md py-6 sm:py-8 flex flex-col md:flex-row justify-between items-center gap-6 md:gap-8">
        <div className="relative w-full md:w-[400px] lg:w-[500px]">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
          <input 
            type="text" 
            placeholder="Search vault..." 
            className="w-full bg-white border border-slate-100 rounded-[24px] sm:rounded-[28px] h-14 sm:h-16 pl-14 sm:pl-16 pr-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-[#064e3b]/5 transition-all shadow-sm focus:border-emerald-100"
          />
        </div>

        <div className="flex items-center gap-4 sm:gap-8 w-full md:w-auto justify-between md:justify-end">
          <button className="p-3 sm:p-4 bg-white border border-slate-100 rounded-xl sm:rounded-2xl hover:bg-slate-50 transition-all shadow-sm relative active:scale-95">
            <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />
            <div className="absolute top-3 sm:top-4 right-3 sm:right-4 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-emerald-500 border-2 border-white rounded-full"></div>
          </button>
          <div className="flex items-center gap-3 sm:gap-4 pl-4 sm:pl-8 border-l border-slate-200">
            <div className="text-right hidden sm:block">
              <p className="text-[14px] sm:text-[15px] font-black text-slate-900 leading-none tracking-tight">Executive Director</p>
              <p className="text-[9px] sm:text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1.5 opacity-80">ADMIN PORTAL</p>
            </div>
            <img 
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Michael" 
              className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl border-2 border-white shadow-lg bg-white"
              alt="Avatar"
            />
          </div>
        </div>
      </header>

      <div className="pt-4 sm:pt-6 space-y-10 sm:space-y-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 sm:gap-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">Executive Dashboard</h1>
            <p className="text-slate-400 text-sm mt-2 font-medium">Real-time performance metrics.</p>
          </div>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
            <button 
              onClick={() => navigate('/leads/new')}
              className="flex items-center justify-center gap-2 px-4 py-3.5 sm:py-4 bg-[#064e3b] text-white rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] shadow-lg active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Lead
            </button>
            <button 
              onClick={() => navigate('/projects')}
              className="flex items-center justify-center gap-2 px-4 py-3.5 sm:py-4 bg-blue-600 text-white rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] shadow-lg active:scale-95 transition-all"
            >
              <Layers className="w-4 h-4" /> Project
            </button>
            <button 
              onClick={() => navigate('/settings/staff/new')}
              className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 px-4 py-3.5 sm:py-4 bg-[#0f172a] text-white rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] shadow-lg active:scale-95 transition-all"
            >
              <UserPlus className="w-4 h-4" /> Add Staff
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
          {[
            { label: 'Leads (MTD)', val: currentMonthStats.leadsThisMonth, icon: FileText, color: 'bg-emerald-600' },
            { label: 'Conversion', val: currentMonthStats.clientsThisMonth, icon: Users, color: 'bg-blue-600' },
            { label: 'Active Projects', val: currentMonthStats.projectsThisMonth, icon: Briefcase, color: 'bg-indigo-600' },
            { label: 'Finalized', val: currentMonthStats.completedThisMonth, icon: CheckCircle2, color: 'bg-slate-900' }
          ].map((s, i) => (
            <div key={i} className="bg-white p-6 sm:p-10 rounded-[32px] sm:rounded-[44px] border border-slate-100 space-y-6 sm:space-y-8 shadow-sm hover:shadow-xl transition-all group hover:translate-y-[-2px]">
              <div className="flex justify-between items-start">
                <div className={`w-12 h-12 sm:w-14 sm:h-14 ${s.color} rounded-2xl sm:rounded-[22px] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                  <s.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center opacity-40 group-hover:opacity-100 transition-opacity">
                  <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-900" />
                </div>
              </div>
              <div>
                <p className="text-[9px] sm:text-[10px] font-black text-slate-300 uppercase tracking-[0.25em]">{s.label}</p>
                <h3 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tighter mt-1.5">{s.val}</h3>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white p-6 sm:p-10 rounded-[32px] sm:rounded-[56px] border border-slate-100 shadow-sm sm:shadow-xl space-y-8 sm:space-y-12">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div>
              <h4 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Historical Trajectory</h4>
              <p className="text-[9px] sm:text-[10px] text-slate-400 font-black uppercase tracking-[0.25em] mt-2 opacity-80">LEAD FLOW</p>
            </div>
            <div className="flex flex-wrap gap-1 bg-slate-100 p-1.5 rounded-2xl sm:rounded-[24px] w-full sm:w-auto">
                {(['Weekly', 'Monthly', 'Yearly'] as const).map(v => (
                    <button 
                      key={v} 
                      onClick={() => setTimeframe(v)}
                      className={`flex-1 sm:flex-none px-4 sm:px-8 py-2.5 sm:py-3.5 rounded-xl sm:rounded-[18px] text-[9px] sm:text-[10px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] transition-all ${timeframe === v ? 'bg-white text-[#064e3b] shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      {v}
                    </button>
                ))}
            </div>
          </div>
          
          {/* PARENT CONTAINER: We provide a fixed CSS height to ensure it never has 'undefined' or '-1' height */}
          <div 
            ref={containerRef}
            className="w-full h-[400px] min-w-0 min-h-0 relative overflow-hidden"
          >
            {dimensions.width > 0 ? (
              <BarChart 
                width={dimensions.width} 
                height={dimensions.height} 
                data={analyticsData} 
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px -10px rgb(0 0 0 / 0.1)', padding: '16px' }}
                />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }} />
                <Bar dataKey="Lead" fill="#10b981" radius={[4, 4, 0, 0]} barSize={12} />
                <Bar dataKey="Client" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={12} />
                <Bar dataKey="Project" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={12} />
                <Bar dataKey="Completed" fill="#0f172a" radius={[4, 4, 0, 0]} barSize={12} />
              </BarChart>
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center gap-3 bg-slate-50/30 rounded-3xl">
                <RefreshCw className="w-6 h-6 text-slate-200 animate-spin" />
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Warming Up Layout...</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10">
          <div className="lg:col-span-8 bg-white p-6 sm:p-12 rounded-[32px] sm:rounded-[64px] border border-slate-100 shadow-sm sm:shadow-xl space-y-10 sm:space-y-12">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
               <h4 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Core Design Team</h4>
               <button 
                onClick={() => navigate('/settings/staff/new')}
                className="w-full sm:w-auto flex items-center justify-center gap-3 text-[9px] sm:text-[10px] font-black text-slate-400 border border-slate-100 px-6 sm:px-8 py-3 sm:py-4 rounded-2xl hover:bg-slate-50 transition-all active:scale-95"
               >
                 <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" /> Invite Core
               </button>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
               {team.map((s, i) => (
                 <div key={i} onClick={() => navigate(`/settings/staff/edit/${s.id}`)} className="flex items-center justify-between p-6 sm:p-8 bg-slate-50/50 rounded-[28px] sm:rounded-[40px] hover:bg-white border border-transparent hover:border-slate-100 transition-all cursor-pointer group shadow-sm">
                   <div className="flex items-center gap-4 sm:gap-6">
                     <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${s.full_name}`} className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-white shadow-md border border-slate-100" alt={s.full_name} />
                     <div>
                       <p className="text-[14px] sm:text-[15px] font-black text-slate-900 tracking-tight">{s.full_name}</p>
                       <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1.5 opacity-80">{s.designation || 'ARCHITECT'}</p>
                     </div>
                   </div>
                   <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full border border-slate-200 flex items-center justify-center group-hover:bg-[#064e3b] group-hover:text-white transition-all shadow-sm">
                      <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5" />
                   </div>
                 </div>
               ))}
             </div>
          </div>

          <div className="lg:col-span-4 bg-[#0a0a0a] p-8 sm:p-12 rounded-[32px] sm:rounded-[64px] relative overflow-hidden flex flex-col justify-between min-h-[300px] sm:min-h-[480px] shadow-2xl">
             <div className="relative z-10 space-y-4 sm:space-y-6">
               <h4 className="text-white/30 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.4em]">FIRM BILLING SESSION</h4>
               <h3 className="text-4xl sm:text-7xl md:text-8xl font-black text-white tracking-tighter">01:24:08</h3>
             </div>
             
             <div className="relative z-10 flex items-center gap-4 sm:gap-6">
               <button className="w-16 h-16 sm:w-24 sm:h-24 bg-white rounded-[24px] sm:rounded-[32px] flex items-center justify-center active:scale-90 transition-all hover:bg-emerald-50 shadow-2xl">
                 <Pause className="w-8 h-8 sm:w-10 sm:h-10 text-black fill-black" />
               </button>
               <button className="w-16 h-16 sm:w-24 sm:h-24 bg-red-600 rounded-[24px] sm:rounded-[32px] flex items-center justify-center active:scale-90 transition-all hover:bg-red-700 shadow-2xl">
                 <Square className="w-8 h-8 sm:w-10 sm:h-10 text-white fill-white" />
               </button>
             </div>
             
             <div className="relative z-10 flex items-center gap-3 sm:gap-4 pt-8 sm:pt-10 border-t border-white/10">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                <p className="text-[9px] sm:text-[10px] text-white/40 font-black uppercase tracking-[0.3em]">SECURE WORKSPACE ACTIVE</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;