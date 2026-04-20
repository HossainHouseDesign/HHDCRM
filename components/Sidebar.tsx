import React from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  FileSpreadsheet, 
  Users, 
  Layers, 
  Users2, 
  Settings, 
  LogOut, 
  Compass, 
  X,
  Hammer,
  History,
  UserCircle,
  Smartphone,
  Download,
  MapPin,
  Banknote
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '../App';

interface SidebarProps {
  onClose?: () => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onClose, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, isAdmin } = useUser();

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/', key: 'dashboard' },
    { name: 'Lead', icon: FileText, path: '/leads', key: 'leads' },
    { name: 'Site Visit', icon: MapPin, path: '/site-visits', key: 'site_visits' },
    { name: 'Quotation', icon: FileSpreadsheet, path: '/quotations', key: 'quotations' },
    { name: 'Client', icon: Users, path: '/clients', key: 'clients' },
    { name: 'Project', icon: Layers, path: '/projects', key: 'projects' },
    { name: 'Construction', icon: Hammer, path: '/construction', key: 'construction' },
    { name: 'Finance', icon: Banknote, path: '/finance', key: 'finance' },
    { name: 'Team', icon: Users2, path: '/team', key: 'team' },
    { name: 'Recycle Bin', icon: History, path: '/settings/recycle-bin', key: 'settings', adminOnly: true },
    { 
      name: isAdmin ? 'Settings' : 'Account', 
      icon: isAdmin ? Settings : UserCircle, 
      path: '/settings', 
      key: 'settings',
      alwaysShow: true 
    },
  ];

  const filteredMenuItems = menuItems.filter(item => {
    if (item.alwaysShow) return true;
    if (item.adminOnly && !isAdmin) return false;
    if (isAdmin) return true;
    if (item.key === 'dashboard') return true;
    
    const perms = profile?.permissions?.[item.key as keyof typeof profile.permissions];
    if (perms && typeof perms === 'object') {
      return (perms as any).view === true || (perms as any).access === true;
    }
    return perms === true;
  });

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className="w-64 bg-white h-full flex flex-col border-r border-slate-200">
      <div className="p-6 pb-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white rounded-full flex items-center justify-center">
              <div className="w-1 h-1 bg-white rounded-full"></div>
            </div>
          </div>
          <span className="font-bold text-lg text-slate-900 tracking-tight">HHD ERP</span>
        </div>
        <button onClick={onClose} className="lg:hidden p-2 text-slate-400 hover:bg-slate-50 rounded-lg">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 px-4 py-6 space-y-1 overflow-y-auto no-scrollbar">
        <nav className="space-y-1">
          {filteredMenuItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-200 group ${
                  active 
                    ? 'bg-slate-100 text-slate-900' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`w-4 h-4 transition-colors ${active ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-900'}`} />
                  <span className="text-sm font-semibold tracking-tight">{item.name}</span>
                </div>
              </Link>
            );
          })}
          
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all duration-200 group"
          >
            <LogOut className="w-4 h-4 text-slate-400 group-hover:text-rose-600" />
            <span className="text-sm font-semibold tracking-tight">Log out</span>
          </button>
        </nav>
      </div>

      <div className="p-4 mt-auto border-t border-slate-100 space-y-4 shrink-0">
        <div 
          onClick={() => navigate('/settings')}
          className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-white transition-all group"
        >
           <img 
             src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.email || profile?.full_name || 'User'}`} 
             className="w-9 h-9 rounded-lg bg-white border border-slate-200 object-cover" 
             alt="Avatar" 
           />
           <div className="min-w-0">
             <p className="text-[12px] font-bold text-slate-900 truncate">{profile?.full_name || 'Guest'}</p>
             <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest truncate">{profile?.designation || 'Staff'}</p>
           </div>
        </div>

        <div className="bg-slate-900 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center">
               <Compass className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">V 3.4.0 CORE</p>
          </div>
          <p className="text-[10px] font-medium text-white/40 leading-relaxed mb-4">
            {isAdmin ? "Admin Access Active." : "Staff Access Active."}
          </p>
          <a 
            href="https://drive.google.com/file/d/16rIV8n9VaH4f_a5MGG5WFq3hvyMNa0NY/view?usp=sharing" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full bg-white/10 text-white py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-white hover:text-slate-900 transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-3 h-3" />
            GET MOBILE APP
          </a>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;