
import React, { useState, useEffect, createContext, useContext, useCallback, useMemo } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
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
import Auth from './pages/Auth';
import { supabase } from './supabaseClient';
import { Profile } from './types';
import { Menu, X, CheckCircle2, AlertCircle, Info, ShieldAlert, RefreshCw } from 'lucide-react';

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
interface NotificationContextType { showNotification: (message: string, type?: NotificationType) => void; }
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotification must be used within a NotificationProvider");
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
              <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-50">System Insight</p>
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
  const { session, logout, loading, refreshUser } = useUser();
  const { showNotification } = useNotification();

  useEffect(() => { setIsSidebarOpen(false); }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    showNotification("Identity detached. Session finalized.", "info");
    navigate('/');
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center gap-6 bg-[#f8fafc]">
      <RefreshCw className="w-10 h-10 text-[#064e3b] animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Syncing Workspace...</p>
    </div>
  );

  if (!session) return <Auth onLogin={refreshUser} />;

  return (
    <div className="flex bg-[#f8fafc] min-h-screen text-slate-900 antialiased">
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-100 z-[60] px-4 flex items-center justify-between shadow-sm">
         <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-[#064e3b] rounded-xl flex items-center justify-center">
              <div className="w-4 h-4 border-[2.5px] border-white rounded-full flex items-center justify-center"><div className="w-1 h-1 bg-white rounded-full"></div></div>
            </div>
            <span className="font-bold text-lg text-slate-900 tracking-tight">Donezo</span>
         </div>
         <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg"><Menu className="w-6 h-6" /></button>
      </div>
      <div className={`fixed inset-y-0 left-0 z-[70] transition-all duration-500 lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:block ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar onClose={() => setIsSidebarOpen(false)} onLogout={handleLogout} />
      </div>
      <main className="flex-1 relative pt-16 lg:pt-0 min-w-0">
        <div className="max-w-[1600px] mx-auto min-h-full">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/leads" element={<LeadsList />} />
            <Route path="/leads/new" element={<LeadForm />} />
            <Route path="/leads/edit/:id" element={<LeadForm />} />
            <Route path="/leads/:id" element={<LeadDetails />} />
            <Route path="/quotations" element={<QuotationList />} />
            <Route path="/quotations/add" element={<AddQuotation />} />
            <Route path="/quotations/:id" element={<QuotationDetails />} />
            <Route path="/clients" element={<ClientsList />} />
            <Route path="/clients/add" element={<AddClient />} />
            <Route path="/construction" element={<Construction />} />
            <Route path="/construction/:id" element={<ConstructionDetails />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:id" element={<ProjectDetails />} />
            <Route path="/team" element={<TeamList />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/recycle-bin" element={<RecycleBin />} />
            <Route path="/settings/staff/new" element={<StaffOnboarding />} />
            <Route path="/settings/staff/edit/:id" element={<StaffOnboarding />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => (
  <NotificationProvider>
    <UserProvider>
      <Router>
        <AppContent />
      </Router>
    </UserProvider>
  </NotificationProvider>
);

export default App;
