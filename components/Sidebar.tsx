
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
      name: isAdmin ? 'Setting' : 'Account', 
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
    return profile?.permissions?.[item.key as keyof typeof profile.permissions] === true;
  });

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className="w-64 bg-white h-full flex flex-col border-r border-slate-100/50 shadow-sm">
      <div className="p-8 pb-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#064e3b] rounded-xl flex items-center justify-center">
            <div className="w-5 h-5 border-[2.5px] border-white rounded-full flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
            </div>
          </div>
          <span className="font-bold text-xl text-slate-900 tracking-tight">HHD CRM</span>
        </div>
        <button onClick={onClose} className="lg:hidden p-2 text-slate-400 hover:bg-slate-50 rounded-lg">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 px-4 py-8 space-y-1 overflow-y-auto no-scrollbar">
        <nav className="space-y-1">
          {filteredMenuItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
                  active 
                    ? 'bg-[#064e3b] text-white shadow-lg shadow-emerald-900/10 translate-x-1' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <item.icon className={`w-5 h-5 transition-colors ${active ? 'text-white' : 'text-slate-400 group-hover:text-emerald-600'}`} />
                  <span className="text-sm font-bold tracking-tight">{item.name}</span>
                </div>
              </Link>
            );
          })}
          
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all duration-300 group"
          >
            <LogOut className="w-5 h-5 text-slate-400 group-hover:text-red-600" />
            <span className="text-sm font-bold tracking-tight">Log out</span>
          </button>
        </nav>
      </div>

      <div className="p-4 mt-auto border-t border-slate-50 space-y-4 shrink-0">
        <div 
          onClick={() => navigate('/settings')}
          className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer hover:bg-white transition-all"
        >
           <img 
             src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.email || profile?.full_name || 'User'}`} 
             className="w-10 h-10 rounded-xl bg-white shadow-sm object-cover" 
             alt="Avatar" 
           />
           <div className="min-w-0">
             <p className="text-[12px] font-black text-slate-900 truncate">{profile?.full_name || 'Guest'}</p>
             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">{profile?.designation || 'Staff'}</p>
           </div>
        </div>

        <div className="bg-emerald-950 rounded-[24px] p-5 border border-emerald-900/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
               <Compass className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-[10px] font-black text-emerald-400/60 uppercase tracking-widest leading-none">V 3.4.0 CORE</p>
          </div>
          <p className="text-[11px] font-medium text-white/50 leading-relaxed mb-4">
            {isAdmin ? "Master Access Active." : "Provisioned Access Active."}
          </p>
          <a 
            href="https://drive.google.com/file/d/1az-OYspmmDQz2UkwbH14_ohn89zoIpd9/view?usp=sharing" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full bg-emerald-900 text-emerald-100 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-white hover:text-[#064e3b] transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <Smartphone className="w-3.5 h-3.5" />
            DOWNLOAD APP
          </a>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
