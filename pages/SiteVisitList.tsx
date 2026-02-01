import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  MapPin, Search, Plus, RefreshCw, X, Save, 
  ChevronDown, CheckCircle2, User, Building2, 
  Calendar, Clock, Layout, Users2, Filter, 
  ChevronRight, ArrowRight, Target, Info,
  FilterX, CalendarDays, ListFilter, UserCheck,
  Check, HardHat, FileText, UserPlus, Banknote,
  Coins, Wallet, PauseCircle, PlayCircle, CheckCheck,
  FolderKanban, FolderCheck, FolderClock, FolderDown
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Project, Lead, Profile, SiteVisit, PaymentStatus, VisitStatus } from '../types';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNotification, useUser } from '../App';

type DateFilter = 'All' | 'Today' | 'Weekly' | 'Custom';
type PaymentFilter = 'All' | PaymentStatus;
type FolderType = VisitStatus;

const SiteVisitList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useUser();
  const { showNotification } = useNotification();
  
  const [visits, setVisits] = useState<SiteVisit[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeFolder, setActiveFolder] = useState<FolderType>('Upcoming');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('All');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('All');
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);

  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    fetchData();
    const params = new URLSearchParams(location.search);
    if (params.get('schedule') === 'true') setShowModal(true);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [visitsRes, projRes, leadsRes, staffRes] = await Promise.all([
        supabase.from('site_visits').select('*, project:projects(*, client:leads(*)), lead:leads(*), creator:profiles!scheduled_by(full_name), assignments:site_visit_assignments(profile:profiles(*))').is('deleted_at', null).order('visit_date', { ascending: true }),
        supabase.from('projects').select('*, client:leads(*)').is('deleted_at', null),
        supabase.from('leads').select('*').is('deleted_at', null),
        supabase.from('profiles').select('*').is('deleted_at', null).eq('status', 'active')
      ]);
      setVisits(visitsRes.data || []);
      setProjects(projRes.data || []);
      setLeads(leadsRes.data || []);
      setStaff(staffRes.data || []);
    } catch (err: any) { showNotification("Sync failed.", "error"); } finally { setLoading(false); }
  };

  const filteredVisits = useMemo(() => {
    let result = visits.filter(v => v.status === activeFolder);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(v => (v.project?.client?.client_name || v.lead?.client_name || '').toLowerCase().includes(q) || v.location.toLowerCase().includes(q));
    }
    const todayStr = new Date().toISOString().split('T')[0];
    if (dateFilter === 'Today') result = result.filter(v => v.visit_date === todayStr);
    if (paymentFilter !== 'All') result = result.filter(v => v.payment_status === paymentFilter);
    return result;
  }, [visits, search, dateFilter, paymentFilter, activeFolder]);

  const getVisitStatusStyle = (status: VisitStatus) => {
    switch (status) {
      case 'Upcoming': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'Done': return 'bg-emerald-600 text-white border-transparent shadow-emerald-900/10 shadow-lg';
      case 'Hold': return 'bg-amber-50 text-amber-600 border-amber-100';
      default: return 'bg-slate-50 text-slate-400';
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-32 animate-in fade-in duration-700">
      <div className="sticky top-16 lg:top-0 z-[60] bg-[#f8fafc]/90 backdrop-blur-xl px-4 md:px-10 pt-6 md:pt-10 pb-6 md:pb-8 border-b border-slate-50 shadow-sm">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 md:mb-10">
          <div>
            <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">Field Registry</h1>
            <p className="text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-[0.25em] mt-1 flex items-center gap-2"><HardHat className="w-3.5 h-3.5 text-emerald-500" /> SITE VISIT ARCHIVE</p>
          </div>
          <button onClick={() => setShowModal(true)} className="w-full md:w-auto px-8 py-4 bg-[#064e3b] text-white rounded-[20px] md:rounded-[24px] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"><UserPlus className="w-5 h-5" /> Schedule Visit</button>
        </header>

        <div className="grid grid-cols-3 gap-2 md:gap-6 mb-8">
           {[
             { id: 'Upcoming', label: 'Active', icon: FolderClock, bg: 'bg-blue-50', color: 'text-blue-600' },
             { id: 'Done', label: 'Done', icon: FolderCheck, bg: 'bg-emerald-50', color: 'text-emerald-600' },
             { id: 'Hold', label: 'Hold', icon: FolderDown, bg: 'bg-amber-50', color: 'text-amber-600' }
           ].map((folder) => (
             <button key={folder.id} onClick={() => setActiveFolder(folder.id as VisitStatus)} className={`p-4 md:p-8 rounded-[24px] md:rounded-[44px] transition-all flex flex-col items-center text-center gap-3 border-2 ${activeFolder === folder.id ? 'bg-white border-[#064e3b] shadow-xl scale-[1.02]' : 'bg-white/40 border-transparent hover:bg-white'}`}>
                <div className={`w-10 h-10 md:w-14 md:h-14 ${folder.bg} ${folder.color} rounded-xl md:rounded-[22px] flex items-center justify-center shrink-0`}><folder.icon className="w-5 h-5 md:w-7 md:h-7" /></div>
                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-900">{folder.label}</span>
             </button>
           ))}
        </div>

        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
           <div className="relative group flex-1">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-[#064e3b] transition-colors" />
              <input type="text" placeholder="Search visits..." className="w-full h-12 md:h-16 pl-14 md:pl-16 pr-6 bg-white border border-slate-100 rounded-[20px] md:rounded-[28px] text-[13px] md:text-[14px] font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/5 shadow-sm" value={search} onChange={e => setSearch(e.target.value)} />
           </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 md:px-10 mt-6 md:mt-12">
        {loading ? (
          <div className="py-24 flex justify-center"><RefreshCw className="w-10 h-10 text-[#064e3b] animate-spin" /></div>
        ) : filteredVisits.length === 0 ? (
          <div className="py-24 text-center bg-white rounded-[40px] border border-slate-100 shadow-sm"><MapPin className="w-12 h-12 text-slate-100 mx-auto mb-4" /><p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Folder Empty</p></div>
        ) : (
          <>
            {/* MOBILE CARDS */}
            <div className="grid grid-cols-1 gap-4 lg:hidden">
              {filteredVisits.map((v) => (
                <div key={v.id} onClick={() => navigate(`/site-visits/${v.id}`)} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm active:scale-[0.98] transition-all">
                  <div className="flex justify-between items-start mb-6">
                    <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-black ${v.visit_date === new Date().toISOString().split('T')[0] ? 'bg-[#064e3b] text-white animate-pulse' : 'bg-slate-50 text-slate-400'}`}>
                      <span className="text-[8px] uppercase">{new Date(v.visit_date).toLocaleString('default', { month: 'short' })}</span>
                      <span className="text-sm leading-none">{new Date(v.visit_date).getDate()}</span>
                    </div>
                    <div className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase border ${getVisitStatusStyle(v.status)}`}>{v.status}</div>
                  </div>
                  <h3 className="text-base font-black text-slate-900 leading-tight mb-2">{v.project?.client?.client_name || v.lead?.client_name}</h3>
                  <div className="flex items-start gap-2 mb-6">
                    <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-xs font-bold text-slate-500 line-clamp-1">{v.location}</span>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex -space-x-2">
                       {v.assignments?.slice(0,3).map((a, i) => (
                         <img key={i} src={a.profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${a.profile?.full_name}`} className="w-7 h-7 rounded-lg border-2 border-white shadow-sm object-cover bg-white" alt="Staff" />
                       ))}
                       {v.assignments && v.assignments.length > 3 && <div className="w-7 h-7 rounded-lg bg-slate-100 border-2 border-white flex items-center justify-center text-[8px] font-black text-slate-400">+{v.assignments.length-3}</div>}
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-300" />
                  </div>
                </div>
              ))}
            </div>

            {/* DESKTOP TABLE */}
            <div className="hidden lg:block bg-white rounded-[48px] border border-slate-100 shadow-xl overflow-hidden">
               <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left min-w-[1200px] border-separate border-spacing-0">
                    <thead>
                      <tr className="text-slate-400 text-[10px] uppercase font-black tracking-[0.25em]">
                        <th className="px-10 py-7 border-b border-slate-100">Schedule Date</th>
                        <th className="px-10 py-7 border-b border-slate-100">Entity & Location</th>
                        <th className="px-10 py-7 border-b border-slate-100">Assignments</th>
                        <th className="px-10 py-7 border-b border-slate-100 text-right">View</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredVisits.map((v) => (
                        <tr key={v.id} onClick={() => navigate(`/site-visits/${v.id}`)} className="hover:bg-slate-50/80 transition-all cursor-pointer group">
                           <td className="px-10 py-8"><div className="flex items-center gap-4"><Calendar className="w-5 h-5 text-emerald-500" /><span className="text-sm font-black text-slate-900">{new Date(v.visit_date).toLocaleDateString()}</span></div></td>
                           <td className="px-10 py-8"><div><p className="text-sm font-black text-slate-700">{v.project?.client?.client_name || v.lead?.client_name}</p><p className="text-[10px] text-slate-400 font-bold mt-1 flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {v.location}</p></div></td>
                           <td className="px-10 py-8"><div className="flex items-center gap-2">{v.assignments?.map((a, i) => (<img key={i} src={a.profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${a.profile?.full_name}`} className="w-8 h-8 rounded-lg shadow-sm border border-slate-100 object-cover bg-white" alt="Member" />)) || <span className="text-[9px] text-slate-300 font-black uppercase">No Staff</span>}</div></td>
                           <td className="px-10 py-8 text-right"><div className="inline-flex p-3 bg-white border border-slate-100 rounded-xl shadow-sm text-slate-300 group-hover:text-[#064e3b] transition-all"><ArrowRight className="w-5 h-5" /></div></td>
                        </tr>
                      ))}
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

export default SiteVisitList;