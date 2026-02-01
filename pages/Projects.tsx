import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Layers, Search, Plus, RefreshCw, Briefcase, Calendar, 
  Trash2, Edit3, ArrowUpRight, CheckCircle2, X, AlertTriangle,
  Clock, MapPin, User, ChevronDown, Check, UserPlus,
  CalendarDays, FilterX, Hash, Map, Activity, FileSpreadsheet, 
  Download, LayoutGrid, List, Save, UserCheck, Phone, Users2
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Project, Lead, Profile, ProjectStatus } from '../types';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNotification, useUser } from '../App';

type ProjectFilterType = 'All' | 'Upcoming' | 'Running' | 'Complete';

const Projects = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showNotification } = useNotification();
  const { profile } = useUser();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Lead[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectFilterType>('All');
  
  const [activeStatusDropdown, setActiveStatusDropdown] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Lead | null>(null);
  const clientSearchRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    client_id: '',
    status: 'Upcoming' as ProjectStatus,
    budget: 0,
    start_date: new Date().toISOString().split('T')[0],
    description: '',
    assigned_team: [] as string[]
  });

  const statusMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
    const params = new URLSearchParams(location.search);
    if (params.get('new') === 'true') {
      setShowModal(true);
      navigate('/projects', { replace: true });
    }
  }, [location.search]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeStatusDropdown && statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) setActiveStatusDropdown(null);
      if (clientSearchRef.current && !clientSearchRef.current.contains(event.target as Node)) setShowClientDropdown(false);
    };
    const handleScroll = () => { if (activeStatusDropdown) setActiveStatusDropdown(null); };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [activeStatusDropdown]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [projRes, clientRes, staffRes] = await Promise.all([
        supabase.from('projects').select('*, client:leads(*), creator:profiles!created_by(full_name), assignments:project_assignments(profile:profiles(*))').is('deleted_at', null).order('created_at', { ascending: false }),
        supabase.from('leads').select('*').eq('is_client', true).is('deleted_at', null),
        supabase.from('profiles').select('*').is('deleted_at', null).eq('status', 'active')
      ]);
      setProjects(projRes.data || []);
      setClients(clientRes.data || []);
      setStaff(staffRes.data || []);
    } catch (err: any) { console.error(err); } finally { setLoading(false); }
  };

  const handleUpdateStatus = async (projectId: string, newStatus: ProjectStatus) => {
    try {
      const { error } = await supabase.from('projects').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', projectId);
      if (error) throw error;
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: newStatus } : p));
      showNotification(`Status updated.`, "success");
      setActiveStatusDropdown(null);
    } catch (err: any) { showNotification(`Update failed.`, "error"); }
  };

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.client?.client_name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, search, statusFilter]);

  const getStatusDisplay = (status: ProjectStatus) => {
    switch (status) {
      case 'Upcoming': return { style: 'bg-blue-50 text-blue-700 border-blue-200', icon: <Clock className="w-3.5 h-3.5" /> };
      case 'Running': return { style: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <Activity className="w-3.5 h-3.5" /> };
      case 'Complete': return { style: 'bg-slate-900 text-white border-transparent', icon: <CheckCircle2 className="w-3.5 h-3.5" /> };
      default: return { style: 'bg-slate-50 text-slate-400 border-slate-200', icon: null };
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-48 animate-in fade-in duration-700">
      <div className="sticky top-16 lg:top-0 z-[60] bg-[#f8fafc]/90 backdrop-blur-xl px-4 md:px-10 pt-6 md:pt-10 pb-6 md:pb-8 border-b border-slate-100 shadow-sm">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 md:mb-10">
          <div>
            <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">Project Portfolio</h1>
            <p className="text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-[0.25em] mt-1 opacity-80 flex items-center gap-2"><Layers className="w-3.5 h-3.5 text-emerald-500" /> ARCHITECTURAL REPOSITORY</p>
          </div>
          <button onClick={() => setShowModal(true)} className="w-full md:w-auto px-8 py-4 bg-[#064e3b] text-white rounded-[20px] md:rounded-[24px] text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl active:scale-95 flex items-center justify-center gap-3"><Plus className="w-5 h-5" /> New Project</button>
        </header>

        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-6">
          <div className="relative group flex-1">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-[#064e3b] transition-colors" />
            <input type="text" placeholder="Search portfolio..." className="w-full h-12 md:h-16 pl-16 pr-6 bg-white border border-slate-100 rounded-[20px] md:rounded-[28px] text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all shadow-sm" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 bg-white/50 p-1.5 rounded-[24px] border border-slate-50 w-full md:w-fit overflow-x-auto no-scrollbar">
            {(['All', 'Upcoming', 'Running', 'Complete'] as ProjectFilterType[]).map(f => (
              <button key={f} onClick={() => setStatusFilter(f)} className={`px-6 md:px-8 py-2.5 md:py-3.5 rounded-[20px] text-[9px] font-black uppercase tracking-[0.1em] transition-all whitespace-nowrap ${statusFilter === f ? 'bg-[#064e3b] text-white shadow-md' : 'text-slate-400 hover:bg-white'}`}>{f}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 md:px-10 mt-6 md:mt-12">
        {loading ? (
          <div className="py-32 flex justify-center"><RefreshCw className="w-10 h-10 text-[#064e3b] animate-spin" /></div>
        ) : filteredProjects.length === 0 ? (
          <div className="py-24 text-center bg-white rounded-[40px] border border-slate-100 shadow-sm"><Layers className="w-12 h-12 text-slate-100 mx-auto mb-4" /><p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No active designs match filters</p></div>
        ) : (
          <>
            {/* MOBILE GRID VIEW */}
            <div className="grid grid-cols-1 gap-4 lg:hidden">
              {filteredProjects.map((p) => {
                const statusInfo = getStatusDisplay(p.status);
                return (
                  <div key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm active:scale-[0.98] transition-all">
                    <div className="flex justify-between items-start mb-4">
                       <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center"><Layers className="w-5 h-5" /></div>
                       <div className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase border ${statusInfo.style}`}>{p.status}</div>
                    </div>
                    <h3 className="text-lg font-black text-slate-900 leading-tight mb-2">{p.name}</h3>
                    <div className="flex items-center gap-2 mb-6">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-xs font-bold text-slate-500">{p.client?.client_name}</span>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                       <div className="flex items-center gap-2">
                          <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Assigned By:</p>
                          <p className="text-[10px] font-bold text-slate-600">{p.creator?.full_name?.split(' ')[0]}</p>
                       </div>
                       <ArrowUpRight className="w-5 h-5 text-slate-300" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DESKTOP TABLE */}
            <div className="hidden lg:block bg-white rounded-[48px] border border-slate-100 shadow-xl shadow-slate-200/5 overflow-hidden">
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left min-w-[1200px] border-separate border-spacing-0">
                  <thead>
                    <tr className="text-slate-400 text-[10px] uppercase font-black tracking-[0.25em]">
                      <th className="px-10 py-7 border-b border-slate-100">Project</th>
                      <th className="px-10 py-7 border-b border-slate-100">Client</th>
                      <th className="px-10 py-7 border-b border-slate-100">Creator</th>
                      <th className="px-10 py-7 border-b border-slate-100">Stage</th>
                      <th className="px-10 py-7 border-b border-slate-100 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredProjects.map((p) => {
                      const statusInfo = getStatusDisplay(p.status);
                      return (
                        <tr key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="hover:bg-slate-50/80 transition-all cursor-pointer group">
                          <td className="px-10 py-8"><div className="flex items-center gap-5"><div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center font-black group-hover:bg-[#064e3b] group-hover:text-white transition-all shadow-sm"><Layers className="w-6 h-6" /></div><div><p className="text-[14px] font-black text-slate-900 transition-colors">{p.name}</p></div></div></td>
                          <td className="px-10 py-8"><div className="flex items-center gap-3"><p className="text-sm font-black text-slate-700">{p.client?.client_name}</p></div></td>
                          <td className="px-10 py-8"><div className="flex items-center gap-3"><p className="text-[12px] font-black text-slate-700">{p.creator?.full_name}</p></div></td>
                          <td className="px-10 py-8"><div className={`inline-flex items-center gap-3 px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm ${statusInfo.style}`}>{statusInfo.icon}{p.status}</div></td>
                          <td className="px-10 py-8 text-right"><div className="inline-flex p-3 bg-white border border-slate-100 rounded-xl shadow-sm text-slate-300 group-hover:text-[#064e3b] group-hover:shadow-md transition-all"><ArrowUpRight className="w-5 h-5" /></div></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Projects;