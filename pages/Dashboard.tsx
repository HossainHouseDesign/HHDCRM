
import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { 
  Users, CheckCircle2, RefreshCw, 
  ArrowUpRight, Search, Bell, Plus, 
  Pause, Square, Briefcase, FileText, Layout,
  UserPlus, Layers, TrendingUp, X, MapPin, 
  Hammer, FileSpreadsheet, Command, Users2
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer
} from 'recharts';
import { supabase } from '../supabaseClient';
import { Lead, Profile } from '../types';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../App';

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  link: string;
  avatar_url?: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { profile, isAdmin } = useUser();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [team, setTeam] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'Weekly' | 'Monthly' | 'Yearly'>('Monthly');
  
  // Universal Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [dimensions, setDimensions] = useState({ width: 0, height: 400 });
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (!entries.length) return;
      const { width } = entries[0].contentRect;
      if (width > 0) setDimensions({ width, height: 400 });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    fetchDashboardData();
    
    // Close search on outside click
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Universal Search Logic (SECURE VERSION)
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length > 1 && profile?.id) {
        setIsSearching(true);
        setShowSearchDropdown(true);
        try {
          // Pass user_id to enforce module permissions on DB level
          const { data, error } = await supabase.rpc('universal_search_v2', {
            search_query: searchQuery.trim(),
            user_id: profile.id
          });
          if (error) throw error;
          setSearchResults(data || []);
        } catch (err) {
          console.error("Secure Search Protocol Error:", err);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setShowSearchDropdown(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, profile?.id]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [leadsRes, teamRes] = await Promise.all([
        supabase.from('leads').select('*').is('deleted_at', null).order('created_at', { ascending: true }),
        supabase.from('profiles').select('*').eq('status', 'active').limit(4)
      ]);
      
      setLeads(leadsRes.data || []);
      setTeam(teamRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role: string = '') => {
    const r = role.toLowerCase();
    if (r === 'office_admin') return 'Office Admin';
    if (r === 'super_admin') return 'Super Admin';
    if (r === 'staff') return 'Firm Staff';
    return role || 'Access Restricted';
  };

  const stats = useMemo(() => {
    const totalLeads = leads.filter(l => !l.is_client).length;
    const totalClients = leads.filter(l => l.is_client).length;
    const activeProjects = leads.filter(l => l.is_client && l.status !== 'Completed').length;
    const completed = leads.filter(l => l.status === 'Completed').length;
    return { totalLeads, totalClients, activeProjects, completed };
  }, [leads]);

  const analyticsData = useMemo(() => {
    if (!leads.length) return [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map((m, i) => ({
      name: m,
      Leads: Math.floor(Math.random() * 20) + 5,
      Conversions: Math.floor(Math.random() * 8) + 2,
    }));
  }, [leads]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Lead': return <FileText className="w-4 h-4 text-blue-500" />;
      case 'Client': return <Users className="w-4 h-4 text-emerald-500" />;
      case 'Quotation': return <FileSpreadsheet className="w-4 h-4 text-purple-500" />;
      case 'Project': return <Layers className="w-4 h-4 text-indigo-500" />;
      case 'Construction': return <Hammer className="w-4 h-4 text-amber-500" />;
      case 'Team': return <Users2 className="w-4 h-4 text-slate-500" />;
      default: return <Command className="w-4 h-4 text-slate-400" />;
    }
  };

  if (loading) return (
    <div className="h-[70vh] flex flex-col items-center justify-center gap-6 px-6 text-center">
      <RefreshCw className="w-10 h-10 text-[#064e3b] animate-spin" />
      <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em]">Syncing Architectural Workspace...</p>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-700 max-w-[1600px] mx-auto px-4 sm:px-6 md:px-10 pb-24">
      <header className="sticky top-0 z-40 bg-[#f8fafc]/80 backdrop-blur-md py-6 sm:py-8 flex flex-col md:flex-row justify-between items-center gap-6 md:gap-8">
        <div className="relative w-full md:w-[450px]" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
            <input 
              type="text" 
              placeholder="Secure Command Search..." 
              className="w-full bg-white border border-slate-100 rounded-[24px] h-14 pl-14 pr-12 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-[#064e3b]/5 transition-all shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length > 1 && setShowSearchDropdown(true)}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-5 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>

          {/* Floating Search Results */}
          {showSearchDropdown && (
            <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-100 rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 z-50">
              <div className="p-4 bg-slate-50/50 border-b border-slate-50 flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Command className="w-3 h-3" /> PERSONALIZED DISCOVERY
                </span>
                {isSearching && <RefreshCw className="w-3 h-3 text-[#064e3b] animate-spin" />}
              </div>
              
              <div className="max-h-[450px] overflow-y-auto no-scrollbar py-2">
                {searchResults.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto">
                      <Search className="w-5 h-5 text-slate-200" />
                    </div>
                    <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest">
                      {isSearching ? 'Verifying access & records...' : 'No authorized assets found'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {searchResults.map((result) => (
                      <div 
                        key={`${result.category}-${result.id}`}
                        onClick={() => {
                          navigate(result.link);
                          setShowSearchDropdown(false);
                          setSearchQuery('');
                        }}
                        className="flex items-center justify-between p-4 hover:bg-slate-50 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-4">
                          {result.avatar_url ? (
                            <img src={result.avatar_url} className="w-10 h-10 rounded-xl object-cover shadow-sm bg-white" alt="" />
                          ) : (
                            <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center border border-slate-100 group-hover:bg-white group-hover:text-[#064e3b] transition-all">
                              {getCategoryIcon(result.category)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-[13px] font-black text-slate-900 truncate">{result.title}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight truncate">{result.subtitle}</p>
                          </div>
                        </div>
                        <div className="px-3 py-1 bg-slate-50 text-slate-400 rounded-lg text-[8px] font-black uppercase tracking-widest group-hover:bg-[#064e3b] group-hover:text-white transition-all">
                          {result.category}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-6">
          <button className="p-4 bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all shadow-sm relative">
            <Bell className="w-6 h-6 text-slate-400" />
            <div className="absolute top-4 right-4 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></div>
          </button>
          <div className="flex items-center gap-4 pl-6 border-l border-slate-200">
            <div className="text-right hidden sm:block">
              <p className="text-[14px] font-black text-slate-900 leading-none">{profile?.full_name || 'Firm Member'}</p>
              <p className="text-[10px] text-[#064e3b] font-black uppercase tracking-widest mt-1">
                {profile?.designation || getRoleLabel(profile?.role)}
              </p>
            </div>
            <img 
              src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.full_name || 'Arch1'}`} 
              className="w-12 h-12 rounded-2xl border-2 border-white shadow-lg bg-white cursor-pointer hover:scale-105 transition-transform object-cover"
              alt="Avatar"
              onClick={() => navigate('/settings')}
            />
          </div>
        </div>
      </header>

      <div className="pt-6 space-y-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Executive Control</h1>
            <p className="text-slate-400 text-sm mt-2 font-medium">Monitoring lead flow and project velocity.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => navigate('/leads/new')} className="flex items-center gap-2 px-6 py-4 bg-[#064e3b] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">
              <Plus className="w-4 h-4" /> Intake Lead
            </button>
            {isAdmin && (
              <button onClick={() => navigate('/settings/staff/new')} className="flex items-center gap-2 px-6 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                <UserPlus className="w-4 h-4" /> Onboard Staff
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { label: 'Total Leads', val: stats.totalLeads, icon: FileText, color: 'bg-emerald-600' },
            { label: 'Active Projects', val: stats.activeProjects, icon: Layers, color: 'bg-blue-600' },
            { label: 'Validated Clients', val: stats.totalClients, icon: Users, color: 'bg-indigo-600' },
            { label: 'Finalized', val: stats.completed, icon: CheckCircle2, color: 'bg-slate-900' }
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

        <div className="bg-white p-10 rounded-[56px] border border-slate-100 shadow-sm space-y-12">
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
          
          <div ref={containerRef} className="w-full h-[400px] relative">
            {dimensions.width > 0 && (
              <BarChart width={dimensions.width} height={dimensions.height} data={analyticsData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px -10px rgb(0 0 0 / 0.1)', padding: '16px' }} />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }} />
                <Bar dataKey="Leads" fill="#10b981" radius={[4, 4, 0, 0]} barSize={12} />
                <Bar dataKey="Conversions" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={12} />
              </BarChart>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 bg-white p-12 md:p-16 rounded-[64px] border border-slate-100 shadow-sm space-y-12">
             <div className="flex justify-between items-center">
               <h4 className="text-xl font-black text-slate-900 tracking-tight">Core Design Team</h4>
               <button onClick={() => navigate('/team')} className="text-[10px] font-black text-slate-400 border border-slate-100 px-8 py-4 rounded-2xl hover:bg-slate-50 transition-all uppercase tracking-widest">
                 View Directory
               </button>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
               {team.map((s, i) => (
                 <div key={i} className="flex items-center justify-between p-8 bg-slate-50/50 rounded-[40px] hover:bg-white border border-transparent hover:border-slate-100 transition-all cursor-pointer group shadow-sm">
                   <div className="flex items-center gap-6">
                     <img src={s.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.full_name}`} className="w-16 h-16 rounded-2xl bg-white shadow-md object-cover" alt={s.full_name} />
                     <div>
                       <p className="text-[15px] font-black text-slate-900">{s.full_name}</p>
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">{s.designation || 'Architect'}</p>
                     </div>
                   </div>
                   <div className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center group-hover:bg-[#064e3b] group-hover:text-white transition-all shadow-sm">
                      <ArrowUpRight className="w-5 h-5" />
                   </div>
                 </div>
               ))}
             </div>
          </div>

          <div className="lg:col-span-4 bg-[#0a0a0a] p-12 rounded-[64px] flex flex-col justify-between min-h-[480px] shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
             <div className="relative z-10 space-y-6">
               <h4 className="text-white/30 text-[10px] font-black uppercase tracking-[0.4em]">ACTIVE SESSION</h4>
               <h3 className="text-8xl font-black text-white tracking-tighter">02:14:22</h3>
             </div>
             
             <div className="relative z-10 flex gap-6">
               <button className="w-24 h-24 bg-white rounded-[32px] flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-2xl">
                 <Pause className="w-10 h-10 text-black fill-black" />
               </button>
               <button className="w-24 h-24 bg-red-600 rounded-[32px] flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-2xl">
                 <Square className="w-10 h-10 text-white fill-white" />
               </button>
             </div>
             
             <div className="relative z-10 flex items-center gap-4 pt-10 border-t border-white/10">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">ENCRYPTED WORKSPACE ACTIVE</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
