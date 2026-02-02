
import React, { useState, useEffect, createContext, useContext, useCallback, useMemo } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import AIChatBot from './components/AIChatBot'; // New Import
import Dashboard from './pages/Dashboard';
import LeadsList from './pages/LeadsList';
import LeadForm from './pages/LeadForm';
import LeadDetails from './pages/LeadDetails';
import Settings from './pages/Settings';
import TeamList from './pages/TeamList';
import StaffOnboarding from './pages/StaffOnboarding';
import ClientsList from './pages/ClientsList';
import AddClient from './pages/AddClient';
import AddQuotation from './pages/AddQuotation';
import RecycleBin from './pages/RecycleBin';
import Construction from './pages/Construction';
import ConstructionDetails from './pages/ConstructionDetails';
import Projects from './pages/Projects';
import ProjectDetails from './pages/ProjectDetails';
import QuotationList from './pages/QuotationList';
import QuotationDetails from './pages/QuotationDetails';
import SiteVisitList from './pages/SiteVisitList';
import SiteVisitDetails from './pages/SiteVisitDetails';
import Finance from './pages/Finance';
import CashbookDetails from './pages/CashbookDetails';
import Auth from './pages/Auth';
import { supabase } from './supabaseClient';
import { Profile, SiteVisit, Lead } from './types';
import { Menu, X, CheckCircle2, AlertCircle, Info, ShieldAlert, RefreshCw, Bell, MapPin, Target } from 'lucide-react';

// --- User Context ---
interface UserContextType {
  session: any;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}
const UserContext = createContext<UserContextType | undefined>(undefined);
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used within a UserProvider");
  return context;
};

// --- Notification System ---
type NotificationType = 'success' | 'error' | 'info' | 'warning';
interface Notification { id: string; message: string; type: NotificationType; }
interface NotificationContextType { 
  showNotification: (message: string, type?: NotificationType) => void;
}
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotification must be used within a NotificationProvider");
  return context;
};

// --- App State Context (Sync & Agenda) ---
interface AppStateContextType {
  isSyncing: boolean;
  triggerSync: () => Promise<void>;
  agendaItems: any[];
}
const AppStateContext = createContext<AppStateContextType | undefined>(undefined);
export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) throw new Error("useAppState must be used within a AppStateProvider");
  return context;
};

const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    setLoading(true);
    let currentSession = null;
    
    const manualSession = localStorage.getItem('donezo_manual_session');
    if (manualSession) {
      try { currentSession = JSON.parse(manualSession); } catch (e) { localStorage.removeItem('donezo_manual_session'); }
    }

    if (!currentSession) {
      const { data } = await supabase.auth.getSession();
      currentSession = data.session;
    }

    setSession(currentSession);

    if (currentSession?.user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentSession.user.id)
        .single();
      setProfile(profileData);
    } else {
      setProfile(null);
    }
    setLoading(false);
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('donezo_manual_session');
    setSession(null);
    setProfile(null);
  }, []);

  useEffect(() => {
    refreshUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sbSession) => {
      const manualSession = localStorage.getItem('donezo_manual_session');
      if (sbSession) {
        setSession(sbSession);
        refreshUser();
      } else if (!manualSession && event === 'SIGNED_OUT') {
        setSession(null);
        setProfile(null);
      }
    });
    return () => subscription.unsubscribe();
  }, [refreshUser]);

  const isAdmin = useMemo(() => {
    const masterEmail = 'hhdandbhd@gmail.com';
    if (session?.user?.email?.toLowerCase() === masterEmail.toLowerCase()) return true;
    if (!profile) return false;
    if (profile.email?.toLowerCase() === masterEmail.toLowerCase()) return true;
    const r = (profile.role || '').toLowerCase();
    return ['office_admin', 'super_admin', 'admin', 'administrator', 'office-admin'].includes(r);
  }, [profile, session]);

  return (
    <UserContext.Provider value={{ session, profile, isAdmin, loading, refreshUser, logout }}>
      {children}
    </UserContext.Provider>
  );
};

const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [agendaItems, setAgendaItems] = useState<any[]>([]);
  const { session } = useUser();

  const triggerSync = useCallback(async () => {
    if (!session) return;
    setIsSyncing(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const [leadsRes, visitsRes] = await Promise.all([
        supabase.from('leads').select('*').eq('follow_up_date', todayStr).is('deleted_at', null),
        supabase.from('site_visits').select('*, project:projects(name), lead:leads(client_name)').eq('visit_date', todayStr).is('deleted_at', null)
      ]);
      
      const combined = [
        ...(leadsRes.data || []).map((l: Lead) => ({ id: l.id, name: l.client_name, type: 'followup' })),
        ...(visitsRes.data || []).map((v: SiteVisit) => ({ id: v.id, name: v.project?.name || v.lead?.client_name || 'Site Visit', type: 'visit' }))
      ];
      setAgendaItems(combined);
    } finally {
      setIsSyncing(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) triggerSync();
  }, [session, triggerSync]);

  return (
    <AppStateContext.Provider value={{ isSyncing, triggerSync, agendaItems }}>
      {children}
    </AppStateContext.Provider>
  );
};

const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const showNotification = useCallback((message: string, type: NotificationType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 8000);
  }, []);
  const removeNotification = (id: string) => setNotifications(prev => prev.filter(n => n.id !== id));

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] flex flex-col gap-4 max-w-xl w-full pointer-events-none px-4">
        {notifications.map(n => (
          <div key={n.id} className={`pointer-events-auto flex items-start gap-4 p-6 rounded-[32px] border shadow-2xl backdrop-blur-3xl animate-in slide-in-from-top-10 fade-in duration-500 w-full ${n.type === 'success' ? 'bg-[#064e3b]/95 border-emerald-500/30 text-white' : n.type === 'error' ? 'bg-red-950/95 border-red-500/30 text-white' : n.type === 'warning' ? 'bg-amber-950/95 border-amber-500/30 text-white' : 'bg-slate-950/95 border-slate-500/30 text-white'}`}>
            <div className="mt-1 shrink-0">
              {n.type === 'success' && <CheckCircle2 className="w-6 h-6 text-emerald-400" />}
              {n.type === 'error' && <ShieldAlert className="w-6 h-6 text-red-400" />}
              {n.type === 'warning' && <AlertCircle className="w-6 h-6 text-amber-400" />}
              {n.type === 'info' && <Info className="w-6 h-6 text-blue-400" />}
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-50">Notice</p>
              <p className="text-[15px] font-black leading-snug tracking-tight">{n.message}</p>
            </div>
            <button onClick={() => removeNotification(n.id)} className="p-1.5 hover:bg-white/10 rounded-xl transition-all"><X className="w-4 h-4 opacity-40" /></button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

const AppContent = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showAgendaPopup, setShowAgendaPopup] = useState(false);
  const { session, logout, loading, refreshUser } = useUser();
  const { isSyncing, triggerSync, agendaItems } = useAppState();
  const { showNotification } = useNotification();

  useEffect(() => { setIsSidebarOpen(false); }, [location.pathname]);

  const handleManualSync = async () => {
    await triggerSync();
    showNotification("Workspace updated.", "success");
  };

  const handleLogout = async () => {
    await logout();
    showNotification("Logged out successfully.", "info");
    navigate('/');
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center gap-6 bg-[#f8fafc]">
      <RefreshCw className="w-10 h-10 text-[#064e3b] animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Loading Workspace...</p>
    </div>
  );

  if (!session) return <Auth onLogin={refreshUser} />;

  return (
    <div className="flex bg-[#f8fafc] min-h-screen text-slate-900 antialiased relative">
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[65] lg:hidden animate-in fade-in duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Mobile Header - Unified with Sync/Agenda */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-100 z-[60] px-4 flex items-center justify-between shadow-sm">
         <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-[#064e3b] rounded-xl flex items-center justify-center">
              <div className="w-4 h-4 border-[2.5px] border-white rounded-full flex items-center justify-center"><div className="w-1 h-1 bg-white rounded-full"></div></div>
            </div>
            <span className="font-bold text-lg text-slate-900 tracking-tight">HHD</span>
         </div>

         <div className="flex items-center gap-2">
           <button onClick={handleManualSync} className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg">
             <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin text-emerald-600' : ''}`} />
           </button>
           <div className="relative">
             <button onClick={() => setShowAgendaPopup(!showAgendaPopup)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg relative">
               <Bell className={`w-5 h-5 ${agendaItems.length > 0 ? 'text-emerald-600' : ''}`} />
               {agendaItems.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white"></span>}
             </button>
             {showAgendaPopup && (
               <div className="absolute top-12 right-0 w-64 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[100] animate-in fade-in slide-in-from-top-2">
                 <div className="p-3 bg-slate-50 border-b rounded-t-2xl text-[9px] font-black uppercase text-slate-400">Today's Tasks</div>
                 <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                   {agendaItems.length === 0 ? <p className="p-4 text-center text-xs text-slate-300 font-bold uppercase">No tasks for today</p> : 
                    agendaItems.map(item => (
                      <div key={item.id} onClick={() => { setShowAgendaPopup(false); navigate(item.type === 'visit' ? `/site-visits/${item.id}` : `/leads/${item.id}`); }} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl cursor-pointer">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.type === 'visit' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {item.type === 'visit' ? <MapPin className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                        </div>
                        <span className="text-xs font-bold text-slate-700 truncate">{item.name}</span>
                      </div>
                    ))
                   }
                 </div>
               </div>
             )}
           </div>
           <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors ml-1">
             {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
           </button>
         </div>
      </div>

      {/* STICKY SIDEBAR CONTAINER */}
      <div className={`fixed inset-y-0 left-0 z-[70] transition-transform duration-500 ease-out lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:flex lg:flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar onClose={() => setIsSidebarOpen(false)} onLogout={handleLogout} />
      </div>

      <main className="flex-1 min-w-0 flex flex-col relative pt-16 lg:pt-0">
        <div className="flex-1 w-full max-w-[1600px] mx-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/leads" element={<LeadsList />} />
            <Route path="/leads/new" element={<LeadForm />} />
            <Route path="/leads/edit/:id" element={<LeadForm />} />
            <Route path="/leads/:id" element={<LeadDetails />} />
            <Route path="/site-visits" element={<SiteVisitList />} />
            <Route path="/site-visits/:id" element={<SiteVisitDetails />} />
            <Route path="/quotations" element={<QuotationList />} />
            <Route path="/quotations/add" element={<AddQuotation />} />
            <Route path="/quotations/:id" element={<QuotationDetails />} />
            <Route path="/clients" element={<ClientsList />} />
            <Route path="/clients/add" element={<AddClient />} />
            <Route path="/construction" element={<Construction />} />
            <Route path="/construction/:id" element={<ConstructionDetails />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:id" element={<ProjectDetails />} />
            <Route path="/finance" element={<Finance />} />
            <Route path="/finance/:id" element={<CashbookDetails />} />
            <Route path="/team" element={<TeamList />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/recycle-bin" element={<RecycleBin />} />
            <Route path="/settings/staff/new" element={<StaffOnboarding />} />
            <Route path="/settings/staff/edit/:id" element={<StaffOnboarding />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        
        {/* Floating Chat Bot */}
        <AIChatBot />
      </main>
    </div>
  );
};

const App: React.FC = () => (
  <NotificationProvider>
    <UserProvider>
      <AppStateProvider>
        <Router>
          <AppContent />
        </Router>
      </AppStateProvider>
    </UserProvider>
  </NotificationProvider>
);

export default App;
