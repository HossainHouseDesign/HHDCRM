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
  ListTree,
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
    { name: 'Tasks', icon: ListTree, path: '/tasks', key: 'projects' },
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
    <aside className="w-56 bg-white h-full flex flex-col border-r border-slate-200">
      <div className="p-3 border-b border-slate-50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-slate-800 rounded-lg flex items-center justify-center">
            <div className="w-2.5 h-2.5 border-2 border-white rounded-full flex items-center justify-center">
              <div className="w-0.5 h-0.5 bg-white rounded-full"></div>
            </div>
          </div>
          <span className="font-bold text-[15px] text-slate-900 tracking-tight">HHD ERP</span>
        </div>
        <button onClick={onClose} className="lg:hidden p-1.5 text-slate-400 hover:bg-slate-50 rounded-lg">
          <X className="w-4.5 h-4.5" />
        </button>
      </div>

      <div className="flex-1 px-2.5 py-3 space-y-0 overflow-y-auto no-scrollbar">
        <nav className="space-y-0.5">
          {filteredMenuItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all duration-150 group ${
                  active 
                    ? 'bg-slate-100 text-slate-900' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`w-3.5 h-3.5 transition-colors ${active ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-900'}`} />
                  <span className="text-[13px] font-medium tracking-tight">{item.name}</span>
                </div>
              </Link>
            );
          })}
          
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-all duration-150 group"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-600" />
            <span className="text-[13px] font-medium tracking-tight">Log out</span>
          </button>
        </nav>
      </div>

      <div className="p-3 mt-auto border-t border-slate-100 shrink-0">
        <div 
          onClick={() => navigate('/settings')}
          className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg border border-slate-100 cursor-pointer hover:bg-white transition-all group"
        >
           <img 
             src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.email || profile?.full_name || 'User'}`} 
             className="w-8 h-8 rounded-md bg-white border border-slate-200 object-cover" 
             alt="Avatar" 
           />
           <div className="min-w-0">
             <p className="text-[11px] font-bold text-slate-900 truncate">{profile?.full_name || 'Guest'}</p>
             <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest truncate">{profile?.designation || 'Staff'}</p>
           </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;