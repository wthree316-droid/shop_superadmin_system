import { useState, useEffect } from 'react'; 
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Store, List, FileText, LogOut, Wallet, Menu, X, User, Bell, ChevronRight,  Crown, Link as LinkIcon 
} from 'lucide-react';

import { useShop } from '../contexts/ShopContext';
import client from '../api/client'; 
import { supabase } from '../utils/supabaseClient'; 
import toast from 'react-hot-toast';
import RulesModal from '../components/modals/RulesModal';

export default function MemberLayout() {
  const { logout, user } = useAuth();
  const { shop, isLoading } = useShop(); 

  const [showRules, setShowRules] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [displayCredit, setDisplayCredit] = useState(0);

  useEffect(() => {
      if (user?.credit_balance) {
          setDisplayCredit(user.credit_balance);
      }
  }, [user]);

  // ระบบ Realtime ฟังยอดเงิน
  useEffect(() => {
      if (!user?.id) return;
      const channel = supabase
          .channel(`user-balance-${user.id}`)
          .on(
              'postgres_changes',
              {
                  event: 'UPDATE', 
                  schema: 'public', 
                  table: 'users',
                  filter: `id=eq.${user.id}`
              },
              (payload) => {
                  const newBalance = payload.new.credit_balance;
                  setDisplayCredit(newBalance);
                  toast.success(`ยอดเงินอัปเดต: ${newBalance.toLocaleString()} ฿`, {
                      id: 'credit-update',
                      icon: '💸',
                      style: { border: '1px solid #10B981', padding: '16px', color: '#065F46' },
                  });
              }
          )
          .subscribe();

      return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-[#F0F4F8]">Loading...</div>;
    
  const menuItems = [
    { path: '/play', label: 'ตลาดหวย', icon: Store },
    { path: '/history', label: 'โพยของฉัน', icon: List },
    { path: '/results', label: 'ผลรางวัล', icon: FileText },
    { path: '/resultslink', label: 'ลิ้งค์ผลรางวัล', icon: LinkIcon }, // เปลี่ยน Icon นิดหน่อยให้ต่างกัน
  ];

  const displayLogo = shop?.logo_url || user?.shop_logo;
  const displayShopName = shop?.name || user?.shop_name || 'SYSTEM';
  const themeColor = shop?.theme_color || '#4338ca';

  const [currentLottoRates, setCurrentLottoRates] = useState<any>(null);

  useEffect(() => {
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
          setCurrentLottoRates(null); 
      }
  }, [location.pathname]);

  const getRateDisplay = (rateObj: any) => {
      if (!rateObj) return '-';
      if (typeof rateObj === 'object') return Number(rateObj.pay || 0).toLocaleString();
      return Number(rateObj).toLocaleString();
  };
  
  return (
    <div className="flex h-screen bg-[#F0F4F8] font-sans overflow-hidden text-slate-800 relative">
      
      {/* Background Decor */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-400/10 blur-[100px]"></div>
          <div className="absolute top-[20%] -right-[10%] w-[30%] h-[30%] rounded-full bg-purple-400/10 blur-[100px]"></div>
      </div>

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-30 md:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* --- Sidebar --- */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 
        bg-[#1e1b4b] text-white border-r border-white/10 flex flex-col shadow-2xl md:shadow-none transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:relative md:translate-x-0
      `}
        style={{ background: `linear-gradient(to bottom, ${themeColor}, #0f172a)` }}
      >
        {/* LOGO AREA */}
        <div className="relative pt-8 pb-6 px-4 text-center border-b border-white/10 bg-black/20">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-[#d4af37]/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="relative z-10 flex flex-col items-center justify-center">
                {displayLogo ? (
                    <div className="group mb-3 relative">
                        <div className="w-20 h-20 rounded-full p-0.5 bg-linear-to-b from-[#d4af37] via-[#fcd34d] to-[#8a6e28] shadow-[0_0_20px_rgba(212,175,55,0.3)]">
                            <div className="w-full h-full rounded-full bg-black/80 flex items-center justify-center overflow-hidden backdrop-blur-sm">
                                <img src={displayLogo} className="w-16 h-16 object-contain drop-shadow-md" alt="Shop Logo" onError={(e) => e.currentTarget.style.display = 'none'} />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center mb-1">
                        <Crown className="w-8 h-8 text-[#d4af37] mb-1 drop-shadow-[0_0_8px_rgba(212,175,55,0.6)]" strokeWidth={1.5} />
                        <h1 className="text-3xl font-black tracking-[0.2em] bg-linear-to-b from-[#FFF] via-[#d4af37] to-[#8a6e28] bg-clip-text text-transparent drop-shadow-sm select-none" style={{ fontFamily: "serif" }}>NTLOT</h1>
                    </div>
                )}
                <h2 className="text-sm font-bold text-white tracking-widest uppercase mt-1 text-shadow-sm opacity-90 truncate max-w-50">{displayShopName}</h2>
                {displayLogo && <p className="text-[10px] text-[#d4af37] mt-0.5 tracking-wider font-medium">PREMIUM MEMBER</p>}
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden absolute top-3 right-3 p-1.5 bg-white/10 rounded-full text-white/60 hover:text-white hover:bg-red-500/20 transition-colors"><X size={16} /></button>
        </div>

        {/* Credit Card */}
        <div className="px-5 mt-6 mb-2">
          <Link to="/profile">
            <div className="bg-linear-to-r from-yellow-600/90 to-yellow-900/90 border border-yellow-500/30 rounded-2xl p-4 text-white shadow-lg shadow-yellow-900/20 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/20 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-white/30 transition-colors"></div>
                <div className="flex justify-between items-start mb-3 relative z-10">
                    <div>
                        <p className="text-yellow-100 text-[10px] font-bold uppercase tracking-wider mb-0.5">เครดิตคงเหลือ</p>
                        <h2 className="text-2xl font-black tracking-tight flex items-baseline gap-1 text-white text-shadow">
                           {displayCredit.toLocaleString()}<span className="text-xs font-medium opacity-80">฿</span>
                        </h2>
                    </div>
                    <div className="bg-black/20 p-2 rounded-lg backdrop-blur-md"><Wallet size={18} className="text-yellow-200" /></div>
                </div>
                <div className="flex items-center justify-between text-xs text-yellow-100/80 font-medium relative z-10 border-t border-white/10 pt-2 mt-1">
                    <span className="flex items-center gap-1 truncate max-w-25"><User size={12}/> {user?.username}</span>
                    <span className="bg-black/20 px-2 py-0.5 rounded-full text-[10px] uppercase">Member</span>
                </div>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          <div className="text-[10px] font-bold text-white/40 uppercase px-4 mb-2 tracking-wider">Main Menu</div>
          {menuItems.map((item) => {
            // ✅ แก้ไข Logic: ต้องตรงเป๊ะ หรือเป็น Path ลูกจริงๆ (มี / ต่อท้าย)
            const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
            
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`group flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-white/10 border border-white/10 text-white shadow-lg shadow-black/5 font-bold' 
                    : 'text-indigo-100/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                    <item.icon size={18} className={isActive ? 'text-[#d4af37]' : 'opacity-70 group-hover:opacity-100 group-hover:text-[#d4af37] transition-colors'} />
                    <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight size={14} className="text-[#d4af37]" />}
              </Link>
            );
          })}

          {currentLottoRates && (
               <div className="mt-6 animate-fade-in mx-1">
                   <div className="text-[10px] font-bold text-[#d4af37] uppercase px-3 mb-2 tracking-wider border-b border-white/10 pb-1 flex items-center gap-2">
                       <Crown size={12} /> อัตราจ่าย (บาทละ)
                   </div>
                   <div className="bg-black/30 border border-white/5 rounded-xl p-3 text-xs space-y-2 backdrop-blur-sm">
                       <div className="flex justify-between text-gray-300"><span>3 ตัวบน</span><span className="font-bold text-[#d4af37]">{getRateDisplay(currentLottoRates['3top'])}</span></div>
                       <div className="flex justify-between text-gray-300"><span>3 ตัวโต๊ด</span><span className="font-bold text-[#d4af37]">{getRateDisplay(currentLottoRates['3tod'])}</span></div>
                       <div className="flex justify-between text-gray-300"><span>2 ตัวบน</span><span className="font-bold text-[#d4af37]">{getRateDisplay(currentLottoRates['2up'])}</span></div>
                       <div className="flex justify-between text-gray-300"><span>2 ตัวล่าง</span><span className="font-bold text-[#d4af37]">{getRateDisplay(currentLottoRates['2down'])}</span></div>
                   </div>
               </div>
           )}
        </nav>

        {/* Footer */}
        <div className="p-4 mx-4 mb-4">
          <button 
            onClick={() => { logout(); navigate('/login'); }}
            className="flex items-center justify-center gap-2 text-red-300/80 hover:text-red-200 hover:bg-red-500/10 rounded-xl w-full py-2.5 transition-all font-bold text-sm"
          >
            <LogOut size={16} /> ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* Main Content */}
        <main className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
            <header className="h-16 flex items-center justify-between px-4 md:px-8 bg-white/80 backdrop-blur-xl border-b border-white/60 sticky top-0 z-20">
            <div className="flex items-center gap-3">
                <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 rounded-lg active:scale-95 transition-transform" style={{ color: themeColor }}>
                    <Menu size={24} />
                </button>
                <div>
                    <h2 className="font-bold text-slate-800 text-base md:text-lg flex items-center gap-2">
                        ยินดีต้อนรับ, <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-700 to-indigo-600">{user?.full_name?.split(' ')[0] || user?.username}</span> 👋
                    </h2>
                </div>
            </div>
            <div className="flex items-center gap-3">

                <button 
                    onClick={() => setShowRules(true)}
                    className="hidden md:flex items-center gap-2 px-3 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-800 rounded-lg transition-all">
                    <FileText size={18} />
                    <span>กติกา</span>
                </button>

                {/* ปุ่มแบบ Icon อย่างเดียวสำหรับมือถือ */}
                <button 
                    onClick={() => setShowRules(true)}
                    className="md:hidden p-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all">
                    <FileText size={20} />
                </button>
                <button className="w-9 h-9 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 hover:text-[#d4af37] hover:border-[#d4af37] transition-all relative">
                    <Bell size={18} />
                    <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                </button>

                <div className="w-9 h-9 rounded-full bg-linear-to-tr from-[#d4af37] to-[#8a6e28] p-0.5">
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden"><User size={18} className="text-slate-700" /></div>
                </div>
           </div>
        </header>

        <div className="flex-1 overflow-auto pb-24 md:pb-8 p-4 md:p-6 custom-scrollbar">
           <Outlet />
        </div>

        {/* Mobile Bottom Nav */}
        <div className="md:hidden fixed bottom-4 left-4 right-4 bg-white/90 backdrop-blur-lg border border-white/50 rounded-2xl p-2 flex justify-around items-center z-30 shadow-[0_8px_30px_rgba(0,0,0,0.1)]">
            {menuItems.map((item) => {
                const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
                return (
                    <Link key={item.path} to={item.path} className={`flex flex-col items-center justify-center w-full h-full py-2 rounded-xl transition-all ${isActive ? 'text-[#d4af37]' : 'text-slate-400 hover:text-slate-600'}`}>
                        <div className={`p-1.5 rounded-lg mb-0.5 transition-all ${isActive ? 'bg-[#d4af37]/10 translate-y-0.5' : 'bg-transparent'}`}>
                            <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                        </div>
                        <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
                    </Link>
                );
            })}
             <Link to="/profile" className="flex flex-col items-center justify-center w-full h-full py-2 text-slate-400 hover:text-slate-600">
                <div className={`p-1.5 mb-0.5 ${location.pathname === '/profile' ? 'bg-[#d4af37]/10 rounded-lg text-[#d4af37]' : ''}`}><User size={20} /></div>
                <span className={`text-[10px] ${location.pathname === '/profile' ? 'font-bold text-[#d4af37]' : 'font-medium'}`}>โปรไฟล์</span>
            </Link>
        </div>
      </main>
      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
    </div>
  );
}