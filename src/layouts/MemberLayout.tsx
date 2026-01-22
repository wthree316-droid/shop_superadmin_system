import { useState, useEffect } from 'react'; 
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Store, List, FileText, LogOut, Wallet, Menu, X, User, Bell, ChevronRight
} from 'lucide-react';
import { useShop } from '../hooks/useShop';
import client from '../api/client'; 

export default function MemberLayout() {
  const { logout, user } = useAuth();
  const { shop } = useShop();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const menuItems = [
    { path: '/play', label: 'ตลาดหวย', icon: Store },
    { path: '/history', label: 'โพยของฉัน', icon: List },
    { path: '/results', label: 'ผลรางวัล', icon: FileText },
    { path: '/topup', label: 'เติมเครดิต', icon: Wallet },
  ];

  const sidebarColor = shop?.theme_color || '#4338ca';

  // ✅ 1. เพิ่ม State เก็บเรทของหวยปัจจุบัน
  const [currentLottoRates, setCurrentLottoRates] = useState<any>(null);

  // ✅ 2. ตรวจสอบ URL เพื่อดึงข้อมูลเรท (ทำงานเมื่อ location เปลี่ยน)
  useEffect(() => {
      // เช็คว่าอยู่ในหน้า /play/xxx หรือไม่ (โดยที่ xxx ไม่ใช่ตัวเลขเปล่าๆ หรือ root)
      // Pattern: /play/UUID
      const match = location.pathname.match(/\/play\/([a-zA-Z0-9-]+)$/);
      
      const fetchRates = async (lottoId: string) => {
          try {
              const res = await client.get(`/play/lottos/${lottoId}`);
              setCurrentLottoRates(res.data.rates);
          } catch (err) {
              setCurrentLottoRates(null);
          }
      };

      if (match && match[1]) {
          fetchRates(match[1]);
      } else {
          setCurrentLottoRates(null); // ถ้าไม่อยู่หน้าแทง ให้ซ่อน
      }
  }, [location.pathname]);

  // ✅ 3. ฟังก์ชัน Helper สำหรับดึงค่าเรท (Copy มาจาก BettingRoom หรือเขียนใหม่ให้สั้นๆ)
  const getRateDisplay = (rateObj: any) => {
      if (!rateObj) return '-';
      if (typeof rateObj === 'object') return Number(rateObj.pay || 0).toLocaleString();
      return Number(rateObj).toLocaleString();
  };
  
  return (
    <div className="flex h-screen bg-[#F0F4F8] font-sans overflow-hidden text-slate-800 relative">
      
      {/* Background Decor (เพิ่มสีสันพื้นหลังจางๆ) */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-400/10 blur-[100px]"></div>
          <div className="absolute top-[20%] -right-[10%] w-[30%] h-[30%] rounded-full bg-purple-400/10 blur-[100px]"></div>
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-30 md:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* --- Sidebar (Vibrant Style) --- */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 
        bg-linear-to-b from-[#1e1b4b] via-[#312e81] to-[#4338ca] /* พื้นหลัง Gradient ม่วง-น้ำเงินเข้ม */
        text-white border-r border-white/10 flex flex-col shadow-2xl md:shadow-none transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:relative md:translate-x-0
      `}
        style={{ 
              background: `linear-gradient(to bottom, ${sidebarColor}, #1e1b4b)` 
          }}
      >
        {/* Logo Area */}
        <div className="p-6 border-b border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-3 font-black text-xl tracking-tighter truncate">
                
                {/* ✅ [ปรับปรุงใหม่] แสดง Logo ถ้ามี */}
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-white shrink-0 overflow-hidden border border-white/20">
                    {user?.shop_logo ? (
                        <img 
                            src={user.shop_logo} 
                            className="w-full h-full object-cover" 
                            alt="Shop Logo"
                            onError={(e) => e.currentTarget.style.display = 'none'} // ถ้าโหลดรูปไม่ติด ให้ซ่อนไป
                        />
                    ) : (
                        // ถ้าไม่มีรูป ให้โชว์ตัวอักษรย่อเหมือนเดิม
                        <span>{user?.shop_name ? user.shop_name.charAt(0).toUpperCase() : 'S'}</span>
                    )}
                </div>

                <span className="text-white truncate text-base">
                    {user?.shop_name || 'SYSTEM'}
                </span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 bg-white/10 rounded-full text-white/70 hover:bg-white/20">
                <X size={20} />
            </button>
        </div>

        {/* Credit Card (Colorful Glass) */}
        <div className="px-6 mb-2">
          <Link to="/profile">
            <div className="bg-linear-to-r from-yellow-500 to-yellow-900 rounded-2xl p-5 text-white shadow-lg shadow-yellow-500/30 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/20 rounded-full blur-2xl -mr-10 -mt-10"></div>
                <div className="absolute bottom-0 left-0 w-16 h-16 bg-yellow-400/20 rounded-full blur-xl -ml-5 -mb-5"></div>
                
                <div className="flex justify-between items-start mb-4 relative z-10">
                    <div>
                        <p className="text-pink-100 text-[10px] font-bold uppercase tracking-wider mb-1">ยอดเครดิตคงเหลือ</p>
                        <h2 className="text-3xl font-black tracking-tight flex items-baseline gap-1">
                           {user?.credit_balance?.toLocaleString()} <span className="text-sm font-medium opacity-80">฿</span>
                        </h2>
                    </div>
                    <div className="bg-white/20 p-2 rounded-lg backdrop-blur-md">
                        <Wallet size={18} className="text-white" />
                    </div>
                </div>
                
                <div className="flex items-center justify-between text-xs text-pink-100 font-medium relative z-10">
                    <span className="flex items-center gap-1"><User size={12}/> {user?.username}</span>
                    <span className="bg-black/20 px-2 py-0.5 rounded-full text-[10px]">Member</span>
                </div>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          <div className="text-[10px] font-bold text-indigo-200 uppercase px-4 mb-2 tracking-wider">Main Menu</div>
          {menuItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`group flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-white text-indigo-900 shadow-lg shadow-black/10 font-bold' /* ปุ่ม Active สีขาว ตัวหนังสือเข้ม */
                    : 'text-indigo-200 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                    <item.icon size={20} className={isActive ? 'text-indigo-600' : 'opacity-70 group-hover:opacity-100'} />
                    <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight size={16} className="text-indigo-400" />}
              </Link>
            );
          })}

          {currentLottoRates && (
               <div className="mt-6 animate-fade-in">
                   <div className="text-[10px] font-bold text-yellow-200 uppercase px-4 mb-2 tracking-wider border-b border-white/10 pb-1">
                       อัตราจ่าย (บาทละ)
                   </div>
                   <div className="bg-black/20 mx-2 rounded-xl p-3 text-xs space-y-2">
                       <div className="flex justify-between text-indigo-100">
                           <span>3 ตัวบน</span>
                           <span className="font-bold text-green-300">{getRateDisplay(currentLottoRates['3top'])}</span>
                       </div>
                       <div className="flex justify-between text-indigo-100">
                           <span>3 ตัวโต๊ด</span>
                           <span className="font-bold text-green-300">{getRateDisplay(currentLottoRates['3tod'])}</span>
                       </div>
                       <div className="flex justify-between text-indigo-100">
                           <span>2 ตัวบน</span>
                           <span className="font-bold text-green-300">{getRateDisplay(currentLottoRates['2up'])}</span>
                       </div>
                       <div className="flex justify-between text-indigo-100">
                           <span>2 ตัวล่าง</span>
                           <span className="font-bold text-green-300">{getRateDisplay(currentLottoRates['2down'])}</span>
                       </div>
                       <div className="flex justify-between text-indigo-100">
                           <span>วิ่งบน</span>
                           <span className="font-bold text-green-300">{getRateDisplay(currentLottoRates['run_up'])}</span>
                       </div>
                       <div className="flex justify-between text-indigo-100">
                           <span>วิ่งล่าง</span>
                           <span className="font-bold text-green-300">{getRateDisplay(currentLottoRates['run_down'])}</span>
                       </div>
                   </div>
               </div>
           )}
        </nav>

        {/* Footer */}
        <div className="p-4 mx-4 mb-4 bg-black/20 rounded-2xl">
          <button 
            onClick={() => { logout(); navigate('/login'); }}
            className="flex items-center justify-center gap-2 text-red-200 hover:text-white w-full py-2 transition-all font-bold text-sm"
          >
            <LogOut size={16} /> ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* --- Main Content --- */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
        
        {/* Topbar (Clean Glass) */}
        <header className="h-20 flex items-center justify-between px-4 md:px-8 bg-white/70 backdrop-blur-xl border-b border-white/50 sticky top-0 z-20">
           <div className="flex items-center gap-3">
               <button 
                 onClick={() => setIsSidebarOpen(true)}
                 className="md:hidden p-2.5 -ml-2 bg-white rounded-xl shadow-sm ..."
                 style={{ color: sidebarColor }} // ✅ เปลี่ยนสีไอคอน Menu
               >
                 <Menu size={20} />
               </button>
               <div>
                  <h2 className="font-bold text-slate-800 text-lg">
                   คุณ <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-purple-600">{user?.full_name?.split(' ')[0] || user?.username}</span> 👋
                  </h2>
                  <p className="text-[10px] text-slate-500 font-medium hidden sm:block">ยินดีต้อนรับสู่ SHOP LOTTO</p>
               </div>
           </div>

           <div className="flex items-center gap-3">
              <div className="hidden md:flex flex-col items-end mr-2">
                  <span className="text-xs font-bold text-slate-700">{user?.username}</span>
                  <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                      <span className="text-[10px] text-green-600 font-bold">Online</span>
                  </div>
              </div>
              <button className="w-10 h-10 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors">
                  <Bell size={20} />
              </button>
              <div className="w-10 h-10 rounded-full bg-linear-to-tr from-blue-500 to-purple-500 p-0.5">
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                      <User size={20} className="text-slate-700" />
                  </div>
              </div>
           </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto pb-24 md:pb-8 p-4 md:p-6 custom-scrollbar">
           <Outlet />
        </div>

        {/* [Colorful] Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-4 left-4 right-4 bg-white/90 backdrop-blur-lg border border-white/50 rounded-2xl p-2 flex justify-around items-center z-30 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            {menuItems.map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                return (
                    <Link 
                        key={item.path} 
                        to={item.path}
                        className={`flex flex-col items-center justify-center w-full h-full py-2 rounded-xl transition-all ${
                            isActive ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        <div className={`p-2 rounded-xl mb-1 transition-all ${
                            isActive ? 'bg-indigo-50 shadow-sm translate-y-0.5' : 'bg-transparent'
                        }`}>
                            <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                        </div>
                        <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
                    </Link>
                );
            })}
             <Link to="/profile" className="flex flex-col items-center justify-center w-full h-full py-2 text-slate-400 hover:text-slate-600">
                <div className={`p-2 mb-1 ${location.pathname === '/profile' ? 'bg-indigo-50 rounded-xl text-indigo-600' : ''}`}>
                    <User size={22} />
                </div>
                <span className={`text-[10px] ${location.pathname === '/profile' ? 'font-bold text-indigo-600' : 'font-medium'}`}>โปรไฟล์</span>
            </Link>
        </div>
      </main>
    </div>
  );
}