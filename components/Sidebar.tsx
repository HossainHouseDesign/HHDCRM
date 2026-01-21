
import React, { useEffect, useState } from 'react';
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
  Hammer
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useNotification } from '../App';
import { Profile } from '../types';

interface SidebarProps {
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setUserProfile(data);
      }
    };
    fetchProfile();
  }, []);

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/', key: 'dashboard' },
    { name: 'Lead', icon: FileText, path: '/leads', badge: '12+', key: 'leads' },
    { name: 'Quotation', icon: FileSpreadsheet, path: '/quotations', key: 'quotations' },
    { name: 'Client', icon: Users, path: '/clients', key: 'clients' },
    { name: 'Project', icon: Layers, path: '/projects', key: 'projects' },
    { name: 'Construction', icon: Hammer, path: '/construction', key: 'construction' },
    { name: 'Team', icon: Users2, path: '/team', key: 'team' },
    { name: 'Setting', icon: Settings, path: '/settings', key: 'settings' },
  ];

  // Filter items based on user role and granular permissions
  const filteredMenuItems = menuItems.filter(item => {
    // Admins see everything
    if (userProfile?.role === 'office_admin' || userProfile?.role === 'super_admin') return true;
    // Dashboard is always visible
    if (item.key === 'dashboard') return true;
    // Check granular permissions for staff
    return userProfile?.permissions?.[item.key as keyof typeof userProfile.permissions] === true;
  });

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      showNotification("Session terminated. You have been logged out.", "info");
      navigate('/');
    } catch (err) {
      showNotification("Logout failed.", "error");
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className="w-64 bg-white h-full flex flex-col border-r border-slate-100/50">
      <div className="p-8 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#064e3b] rounded-xl flex items-center justify-center">
            <div className="w-5 h-5 border-[2.5px] border-white rounded-full flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
            </div>
          </div>
          <span className="font-bold text-xl text-slate-900 tracking-tight">Donezo</span>
        </div>
        <button onClick={onClose} className="lg:hidden p-2 text-slate-400">
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
                {'badge' in item && item.badge && !active && (
                  <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg border border-emerald-100">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all duration-300 group"
          >
            <LogOut className="w-5 h-5 text-slate-400 group-hover:text-red-600" />
            <span className="text-sm font-bold tracking-tight">Log out</span>
          </button>
        </nav>
      </div>

      <div className="p-4 mt-auto">
        <div className="bg-slate-50 rounded-[24px] p-5 border border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-[#064e3b]/5 rounded-lg flex items-center justify-center">
               <Compass className="w-4 h-4 text-[#064e3b]" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">V 3.4.0 Core</p>
          </div>
          <p className="text-[11px] font-medium text-slate-500 leading-relaxed mb-4">You are currently in Workspace Mode.</p>
          <button className="w-full bg-white border border-slate-200 text-slate-900 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-[#064e3b] hover:text-white hover:border-transparent transition-all shadow-sm">
            Quick Guide
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
