
import React, { useState, useEffect } from 'react';
import { 
  Hammer, Search, Plus, RefreshCw, ChevronRight, 
  MapPin, Calendar, Clock, ArrowUpRight, CheckCircle2,
  HardHat, Info
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

interface ConstructionProject {
  id: string;
  title: string;
  current_stage: string;
  progress: number;
  status: string;
  last_site_visit: string;
  start_date: string;
}

const Construction = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ConstructionProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchConstructionData();
  }, []);

  const fetchConstructionData = async () => {
    try {
      setLoading(true);
      // In a real app, this would query the `construction_projects` table
      // For now, we'll fetch converted clients as a proxy or use dummy data
      const { data } = await supabase
        .from('leads')
        .select('*')
        .eq('is_client', true)
        .is('deleted_at', null);
      
      const mappedProjects = (data || []).map(lead => ({
        id: lead.id,
        title: lead.client_name + "'s Residence",
        current_stage: lead.foundation || 'Initial Site Works',
        progress: Math.floor(Math.random() * 80) + 10,
        status: 'Active',
        last_site_visit: new Date().toISOString(),
        start_date: lead.converted_at || lead.created_at
      }));

      setProjects(mappedProjects);
    } finally {
      setLoading(false);
    }
  };

  const filtered = projects.filter(p => p.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-32 animate-in fade-in duration-700">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 pt-12 space-y-12">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Site Execution</h1>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em] mt-2 opacity-80">MONITORING ACTIVE CONSTRUCTION SITES</p>
          </div>
          <button className="px-8 py-4 bg-[#064e3b] text-white rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-emerald-900/20 active:scale-95 transition-all flex items-center gap-3">
            <Plus className="w-5 h-5" /> Initiate Site Work
          </button>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           {[
             { label: 'Active Sites', val: projects.length, icon: HardHat, color: 'bg-emerald-500' },
             { label: 'Avg. Progress', val: '42%', icon: Clock, color: 'bg-blue-500' },
             { label: 'Visits (MTD)', val: '18', icon: MapPin, color: 'bg-amber-500' }
           ].map((stat, i) => (
             <div key={i} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/10 flex items-center gap-6 group hover:translate-y-[-2px] transition-all">
                <div className={`w-14 h-14 ${stat.color} text-white rounded-[20px] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                   <stat.icon className="w-6 h-6" />
                </div>
                <div>
                   <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{stat.label}</p>
                   <p className="text-2xl font-black text-slate-900 mt-0.5">{stat.val}</p>
                </div>
             </div>
           ))}
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col md:flex-row gap-6">
           <div className="relative flex-1">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
              <input 
                type="text" 
                placeholder="Search active project sites..."
                className="w-full h-16 pl-16 pr-6 bg-white border border-slate-100 rounded-[28px] text-[13px] font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all shadow-sm"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
           </div>
           <button className="px-8 bg-white border border-slate-100 rounded-[28px] text-[11px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all flex items-center gap-3">
              Filter Pipeline <ChevronRight className="w-4 h-4 rotate-90" />
           </button>
        </div>

        {/* Construction List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading ? (
             Array(6).fill(0).map((_, i) => (
               <div key={i} className="h-64 bg-slate-100/50 rounded-[48px] animate-pulse border border-slate-100" />
             ))
          ) : filtered.length === 0 ? (
             <div className="col-span-full py-32 text-center bg-white rounded-[64px] border border-slate-100 shadow-xl">
               <Hammer className="w-16 h-16 text-slate-100 mx-auto mb-6" />
               <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No Active Sites Found</p>
             </div>
          ) : filtered.map((project) => (
            <div key={project.id} className="bg-white p-10 rounded-[56px] border border-slate-100 shadow-xl shadow-slate-200/20 hover:shadow-2xl transition-all group hover:translate-y-[-4px] flex flex-col justify-between">
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                   <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-[24px] flex items-center justify-center font-black group-hover:bg-[#064e3b] group-hover:text-white transition-all shadow-sm">
                      <HardHat className="w-8 h-8" />
                   </div>
                   <div className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-100">
                      {project.status}
                   </div>
                </div>
                
                <div>
                   <h3 className="text-xl font-black text-slate-900 tracking-tight leading-tight">{project.title}</h3>
                   <div className="flex items-center gap-2 mt-2 text-slate-400 font-bold text-[11px]">
                      <MapPin className="w-3.5 h-3.5" /> Site Coordinates Pending
                   </div>
                </div>

                <div className="space-y-3">
                   <div className="flex justify-between items-end">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{project.current_stage}</p>
                      <p className="text-sm font-black text-[#064e3b]">{project.progress}%</p>
                   </div>
                   <div className="h-2.5 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100/50">
                      <div 
                        className="h-full bg-[#064e3b] rounded-full transition-all duration-1000 group-hover:bg-emerald-500"
                        style={{ width: `${project.progress}%` }}
                      />
                   </div>
                </div>
              </div>

              <div className="mt-10 pt-8 border-t border-slate-50 flex items-center justify-between">
                 <div className="flex flex-col">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Last Visit</p>
                    <p className="text-[11px] font-bold text-slate-600">
                      {new Date(project.last_site_visit).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                 </div>
                 <button className="w-12 h-12 rounded-full border border-slate-100 flex items-center justify-center hover:bg-[#064e3b] hover:text-white transition-all group/btn shadow-sm">
                    <ArrowUpRight className="w-5 h-5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                 </button>
              </div>
            </div>
          ))}
        </div>

        {/* Info Box */}
        <div className="bg-slate-900 p-12 rounded-[64px] flex flex-col md:flex-row items-center justify-between gap-10 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full" />
           <div className="relative z-10 max-w-xl">
              <div className="flex items-center gap-3 text-emerald-400 mb-6">
                 <Info className="w-6 h-6" />
                 <p className="text-[11px] font-black uppercase tracking-[0.4em]">Construction Protocol</p>
              </div>
              <h2 className="text-3xl font-black text-white tracking-tight leading-tight">Sync site visits with the Design Team in real-time.</h2>
              <p className="text-white/40 text-sm font-medium mt-4">Automated progress reports are generated every time a site supervisor submits a visit log via the workspace app.</p>
           </div>
           <button className="relative z-10 px-12 py-6 bg-white text-black rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-emerald-50 transition-all flex items-center gap-4 group">
              View Visit Protocols <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
           </button>
        </div>
      </div>
    </div>
  );
};

export default Construction;
