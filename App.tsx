
import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import LeadsList from './pages/LeadsList';
import LeadForm from './pages/LeadForm';
import LeadDetails from './pages/LeadDetails';
import Settings from './pages/Settings';
import TeamList from './pages/TeamList';
import StaffOnboarding from './pages/StaffOnboarding';
import ClientsList from './pages/ClientsList';
import RecycleBin from './pages/RecycleBin';
import Construction from './pages/Construction';
import Projects from './pages/Projects';
import ProjectDetails from './pages/ProjectDetails';
import QuotationList from './pages/QuotationList';
import QuotationDetails from './pages/QuotationDetails';
import { Menu, X, CheckCircle2, AlertCircle, Info, XCircle, ShieldAlert } from 'lucide-react';

// --- Notification System ---

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

interface NotificationContextType {
  showNotification: (message: string, type?: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotification must be used within a NotificationProvider");
  return context;
};

const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback((message: string, type: NotificationType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
    
    // STRICT 10 SECOND AUTO-CLOSE
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 10000);
  }, []);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      {/* Floating Top-Middle Notification Container */}
      <div className="fixed top-6 sm:top-10 left-1/2 -translate-x-1/2 z-[300] flex flex-col gap-4 max-w-[calc(100vw-2rem)] sm:max-w-xl w-full pointer-events-none items-center">
        {notifications.map(n => (
          <div 
            key={n.id}
            className={`
              pointer-events-auto flex items-start gap-4 p-5 sm:p-6 rounded-[28px] sm:rounded-[36px] border shadow-[0_40px_80px_-15px_rgba(0,0,0,0.35)] backdrop-blur-3xl animate-in slide-in-from-top-10 fade-in duration-500 w-full
              ${n.type === 'success' ? 'bg-[#064e3b]/95 border-emerald-500/30 text-white' : 
                n.type === 'error' ? 'bg-red-950/95 border-red-500/30 text-white' : 
                n.type === 'warning' ? 'bg-amber-950/95 border-amber-500/30 text-white' : 
                'bg-slate-950/95 border-slate-500/30 text-white'}
            `}
          >
            <div className="mt-1 shrink-0">
              {n.type === 'success' && <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />}
              {n.type === 'error' && <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6 text-red-400" />}
              {n.type === 'warning' && <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />}
              {n.type === 'info' && <Info className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />}
            </div>
            <div className="flex-1 space-y-1.5 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.3em] opacity-50 whitespace-nowrap">
                  {n.type === 'error' ? 'Critical System Alert' : 'ArchLead Insight'}
                </p>
                <div className="h-0.5 flex-1 mx-4 bg-white/10 rounded-full overflow-hidden">
                   <div className="h-full bg-white/30 animate-[shrink_10s_linear_forwards]" />
                </div>
              </div>
              <p className="text-sm sm:text-[15px] font-black leading-snug tracking-tight pr-2">{n.message}</p>
            </div>
            <button onClick={() => removeNotification(n.id)} className="p-1.5 hover:bg-white/10 rounded-xl transition-all shrink-0 mt-1">
              <X className="w-4 h-4 opacity-40" />
            </button>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </NotificationContext.Provider>
  );
};

// --- App Layout ---

const AppContent = () => {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex bg-[#f8fafc] min-h-screen text-slate-900 antialiased font-['Plus_Jakarta_Sans']">
      {/* Mobile Top Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-100 z-[60] px-4 flex items-center justify-between shadow-sm">
         <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-[#064e3b] rounded-xl flex items-center justify-center">
              <div className="w-4 h-4 border-[2.5px] border-white rounded-full flex items-center justify-center">
                <div className="w-1 h-1 bg-white rounded-full"></div>
              </div>
            </div>
            <span className="font-bold text-lg text-slate-900 tracking-tight">Donezo</span>
         </div>
         <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-all"
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[65] animate-in fade-in duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className={`
        fixed inset-y-0 left-0 z-[70] transition-all duration-500 ease-in-out transform
        lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:block
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
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
            <Route path="/quotations/:id" element={<QuotationDetails />} />
            <Route path="/clients" element={<ClientsList />} />
            <Route path="/construction" element={<Construction />} />
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

const App: React.FC = () => {
  return (
    <NotificationProvider>
      <Router>
        <AppContent />
      </Router>
    </NotificationProvider>
  );
};

export default App;
