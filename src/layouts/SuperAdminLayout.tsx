import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard,  
  Store, 
  LogOut, 
  Menu, 
  X, 
  BadgePercent, 
  Database, 
  ChevronRight
} from 'lucide-react';

export default function SuperAdminLayout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/super/dashboard', label: 'ภาพรวม', icon: LayoutDashboard },
    { path: '/super/shops', label: 'ร้านค้า', icon: Store },
    { path: '/super/lottos', label: 'แม่แบบหวย', icon: Database },
    { path: '/super/rates', label: 'เรทกลาง', icon: BadgePercent },
  ];

  return (
    <div className="flex h-screen bg-[#F9FAFB] font-sans overflow-hidden text-slate-800">
      
      {/* Overlay สำหรับมือถือ */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden animate-fade-in" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* --- Sidebar (Desktop) --- */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-yellow-100 flex flex-col transition-transform duration-300 shadow-2xl md:shadow-xl
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:relative md:translate-x-0
      `}>
        {/* Header Logo (Bright Yellow Gradient) */}
        <div className="h-24 flex items-center justify-between px-6 bg-linear-to-r from-yellow-400 to-amber-500 relative overflow-hidden">
          {/* Decor Circles */}
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/20 rounded-full blur-xl -mr-8 -mt-8"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/20 rounded-full blur-lg -ml-6 -mb-6"></div>

          <div className="relative z-10 text-white">
            <h1 className="text-2xl font-black tracking-tighter drop-shadow-md flex items-center gap-2">
              SUPER <span className="bg-white text-amber-500 px-1 rounded text-lg">GOD</span>
            </h1>
            <p className="text-[10px] font-bold text-yellow-50 opacity-90 tracking-widest uppercase mt-0.5">System Controller</p>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-white hover:bg-white/20 p-1 rounded-lg transition-colors relative z-10">
            <X size={24} />
          </button>
        </div>

        {/* User Info */}
        <div className="px-6 py-6">
            <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                <div className="w-12 h-12 rounded-full bg-white border-2 border-yellow-200 flex items-center justify-center font-bold text-amber-500 shadow-sm text-xl">
                    {user?.username?.[0]?.toUpperCase() || 'S'}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-800 truncate">{user?.username || 'SuperAdmin'}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <p className="text-[10px] text-slate-500 font-bold">Online</p>
                    </div>
                </div>
            </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          <div className="text-[10px] font-bold text-slate-400 uppercase px-4 mb-2 tracking-wider">Main Menu</div>
          {menuItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`
                  relative flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-200 group font-medium
                  ${isActive 
                    ? 'bg-yellow-400 text-white shadow-lg shadow-yellow-200 font-bold translate-x-1' 
                    : 'text-slate-500 hover:bg-yellow-50 hover:text-amber-600'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                    <Icon size={20} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-amber-500 transition-colors'} />
                    <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight size={18} className="text-white/80" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <button 
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full py-3 bg-white border border-slate-200 text-slate-500 hover:text-red-500 hover:border-red-200 hover:bg-red-50 rounded-xl transition-all shadow-sm font-bold text-sm"
          >
            <LogOut size={18} /> ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* --- Main Content Area --- */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative bg-[#F9FAFB]">
        
        {/* Mobile Header (Yellow Gradient) */}
        <div className="h-16 bg-linear-to-r from-yellow-400 to-amber-500 flex items-center justify-between px-4 md:hidden shrink-0 z-10 sticky top-0 shadow-md">
             <div className="flex items-center gap-3">
                 <span className="font-black text-white text-lg tracking-tight drop-shadow-sm">SUPER ADMIN</span>
             </div>
             <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white flex items-center justify-center font-bold text-xs shadow-inner">
                {user?.username?.[0] || 'S'}
             </div>
        </div>

        {/* Content Outlet */}
        <div className="flex-1 overflow-auto p-4 md:p-8 pb-24 md:pb-8 relative custom-scrollbar">
            <Outlet />
        </div>

        {/* [NEW] Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 py-2 pb-6 flex justify-around items-center z-30 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] rounded-t-2xl">
            {menuItems.map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                return (
                    <Link 
                        key={item.path} 
                        to={item.path}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 ${
                            isActive ? 'text-amber-500 -translate-y-2' : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        <div className={`p-2 rounded-full transition-all ${
                            isActive ? 'bg-yellow-100 shadow-sm' : 'bg-transparent'
                        }`}>
                            <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                        </div>
                        {isActive && <span className="text-[10px] font-bold animate-fade-in">{item.label}</span>}
                    </Link>
                );
            })}
             {/* Menu Button (Opens Sidebar) */}
             <button onClick={() => setIsSidebarOpen(true)} className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-slate-600">
                <div className="p-2">
                    <Menu size={20} />
                </div>
            </button>
        </div>

      </main>
    </div>
  );
}