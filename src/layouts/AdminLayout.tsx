import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'; 
import { useAuth } from '../contexts/AuthContext';
import { 
  PieChart,
  Ticket,
  Trophy,
  LogOut,
  Settings,
  ArrowRightCircle,
  Menu, 
  X,
  Store // เพิ่มไอคอน
} from 'lucide-react'; 

export default function AdminLayout() {
  const { logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // [ใหม่] ฟังก์ชันออกจากร่างทรง (กลับเป็น Superadmin)
  const superBackupToken = localStorage.getItem('super_backup_token');
  
  const handleExitImpersonation = () => {
      if (superBackupToken) {
          // 1. คืนชีพ Token เดิม
          localStorage.setItem('token', superBackupToken);
          // 2. ลบตัวสำรองทิ้ง
          localStorage.removeItem('super_backup_token');
          // 3. ดีดกลับไปหน้า Super Shop List
          window.location.href = '/super/shops';
      }
  };


  const menuItems = [
    { path: '/admin/dashboard', label: 'ภาพรวม', fullLabel: 'Dashboard', icon: PieChart },
    { path: '/admin/shop', label: 'ตั้งค่าร้าน', fullLabel: 'จัดการร้าน & หวย', icon: Settings }, 
    { path: '/admin/history', label: 'โพย', fullLabel: 'โพยทั้งหมด', icon: Ticket },
    { path: '/admin/results', label: 'ผลรางวัล', fullLabel: 'ออกผลรางวัล', icon: Trophy },
  ];

  return (
    <div className="flex h-screen bg-[#F3F4F6] font-sans overflow-hidden text-gray-800">
      
      {/* Mobile Overlay (เพิ่ม Z-index ให้สูงกว่า content) */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-fade-in" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar - Clean Style (ปรับ Z-index เป็น 50 เพื่อทับทุกอย่าง) */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-100 flex flex-col transition-transform duration-300 shadow-2xl md:shadow-none
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:relative md:translate-x-0
      `}>
        {/* Header Logo */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-gray-50 bg-white">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg text-white shadow-lg shadow-blue-200">
                <Store size={20} />
            </div>
            <div>
                <h1 className="text-lg font-black text-gray-800 tracking-tight leading-none">
                  SHOP <span className="text-blue-600">ADMIN</span>
                </h1>
                <p className="text-[10px] text-gray-400 font-medium mt-0.5">ระบบจัดการร้านค้า</p>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-gray-600 transition-colors p-1 bg-gray-50 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* User Info (Mini Profile) */}
        <div className="px-6 py-6 pb-2">
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white border border-blue-100 flex items-center justify-center font-bold text-blue-600 shadow-sm">
                    {user?.username?.[0]?.toUpperCase() || 'A'}
                </div>
                <div className="min-w-0">
                    <p className="font-bold text-sm text-gray-800 truncate">{user?.username || 'Admin'}</p>
                    <p className="text-[10px] text-gray-500 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Online
                    </p>
                </div>
            </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto custom-scrollbar">
          
          {/* [ใหม่] ปุ่มแจ้งเตือนว่ากำลังสวมรอยอยู่ (กดเพื่อออก) */}
          {superBackupToken && (
             <div className="mb-4 px-2 animate-pulse">
                <button 
                  onClick={handleExitImpersonation}
                  className="w-full bg-red-600 text-white p-3 rounded-xl shadow-lg shadow-red-200 flex items-center gap-3 font-bold text-sm hover:bg-red-700 transition-colors"
                >
                    <div className="bg-white/20 p-1.5 rounded-full"><LogOut size={16}/></div>
                    <span>ออกจากการสวมรอย</span>
                </button>
                <p className="text-[10px] text-center text-red-400 mt-1 font-medium">คุณกำลังใช้งานในฐานะ Admin ร้าน</p>
             </div>
          )}

          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-2">Main Menu</div>
          {menuItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group font-medium text-sm
                  ${isActive 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
                    : 'text-gray-500 hover:bg-gray-50 hover:text-blue-600'
                  }
                `}
              >
                <Icon size={18} className={`${isActive ? 'text-white' : 'text-gray-400 group-hover:text-blue-600'} transition-colors`} />
                <span>{item.fullLabel}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-50 space-y-2 bg-gray-50/30">
          <Link 
            to="/play" 
            target="_blank" 
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-emerald-700 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 hover:shadow-sm transition-all text-sm font-bold"
          >
            <ArrowRightCircle size={18} />
            ไปหน้าแทงหวย
          </Link>

          <button 
            onClick={handleLogout} 
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700 transition-all text-sm font-bold"
          >
            <LogOut size={18} />
            ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#F3F4F6] relative">
        
        {/* Mobile Header (แสดงเฉพาะจอมือถือ) */}
        <div className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 md:hidden shrink-0 z-10 sticky top-0 shadow-sm">
             <div className="flex items-center gap-3">
                 {/* ปุ่ม Menu ด้านบนซ่อนไว้ เพราะมีด้านล่างแล้ว หรือจะเก็บไว้ก็ได้แล้วแต่ชอบ (ในที่นี้เก็บไว้เผื่อคนชิน) */}
                 <div className="flex items-center gap-2">
                    <div className="bg-blue-600 p-1.5 rounded-lg text-white">
                        <Store size={18} />
                    </div>
                    <span className="font-black text-gray-800 tracking-tight">SHOP ADMIN</span>
                 </div>
             </div>
             <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                {user?.username?.[0] || 'A'}
             </div>
        </div>

        {/* Scrollable Content (เพิ่ม pb-24 กันเนื้อหาตกขอบล่าง) */}
        <div className="flex-1 overflow-auto p-4 pb-24 md:p-8 md:pb-8 relative">
           <div className="max-w-6xl mx-auto">
               <Outlet />
           </div>
        </div>

        {/* [NEW] Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-2 pb-6 flex justify-between items-center z-30 shadow-[0_-5px_20px_rgba(0,0,0,0.03)]">
            {menuItems.map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                return (
                    <Link 
                        key={item.path} 
                        to={item.path}
                        className={`flex flex-col items-center gap-1 p-1 rounded-xl transition-all ${
                            isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        <div className={`p-1.5 rounded-full transition-all ${
                            isActive ? 'bg-blue-50 -translate-y-1' : 'bg-transparent'
                        }`}>
                            <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                        </div>
                        <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
                    </Link>
                );
            })}
             {/* ปุ่ม "เพิ่มเติม" เพื่อเปิด Sidebar */}
             <button onClick={() => setIsSidebarOpen(true)} className="flex flex-col items-center gap-1 p-1 text-gray-400 hover:text-gray-600">
                <div className="p-1.5">
                    <Menu size={22} />
                </div>
                <span className="text-[10px] font-medium">เมนู</span>
            </button>
        </div>

      </main>
    </div>
  );
}