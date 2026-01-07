import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import { 
  Clock, TrendingUp, Sparkles, AlertCircle, 
  Search, Timer, ChevronRight 
} from 'lucide-react';

// --- Helper Functions ---
const getCloseDate = (timeStr: string) => {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

const getTimeRemaining = (closeDate: Date, now: Date) => {
  const diff = closeDate.getTime() - now.getTime();
  if (diff <= 0) return null;
  const h = Math.floor(diff / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((diff % (1000 * 60)) / 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const CATEGORIES = [
  { id: 'ALL', label: 'ทั้งหมด', icon: '🔥' },
  { id: 'THAI', label: 'รัฐบาลไทย', icon: '🇹🇭' },
  { id: 'LAOS', label: 'หวยลาว', icon: '🇱🇦' },
  { id: 'HANOI', label: 'หวยฮานอย', icon: '🇻🇳' },
  { id: 'STOCKS', label: 'หวยหุ้น', icon: '📈' },
  { id: 'YIKI', label: 'ยี่กี', icon: '🎱' },
  { id: 'OTHERS', label: 'อื่นๆ', icon: '🌐' },
];

export default function LottoMarket() {
  const [lottos, setLottos] = useState<any[]>([]);
  const [now, setNow] = useState(new Date());
  const [filter, setFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    client.get('/play/lottos').then(res => setLottos(res.data));
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ฟังก์ชันกรองพื้นฐาน
  const getFilteredLottos = (category: string) => {
    return lottos.filter(l => {
      const catMatch = category === 'ALL' || (l.category || 'OTHERS') === category;
      const searchMatch = l.name.toLowerCase().includes(searchTerm.toLowerCase());
      return catMatch && searchMatch;
    });
  };

  // --- New Card Component (การ์ดแบบโปสเตอร์เต็มใบ) ---
  const LottoCard = ({ lotto }: { lotto: any }) => {
      const closeDate = getCloseDate(lotto.close_time);
      const timeLeft = closeDate ? getTimeRemaining(closeDate, now) : null;
      const isClosed = !timeLeft; 
      const isUrgent = timeLeft && closeDate && (closeDate.getTime() - now.getTime() < 30 * 60 * 1000);

      return (
        <div 
          onClick={() => !isClosed && navigate(`/play/${lotto.id}`)}
          className={`
            relative rounded-2xl overflow-hidden group transition-all duration-300 aspect-5/3
            ${isClosed 
              ? 'cursor-not-allowed grayscale opacity-70' 
              : 'cursor-pointer hover:shadow-2xl hover:scale-[1.02]'
            }
          `}
        >
            {/* 1. Background Image Layer */}
            <div className="absolute inset-0 z-0">
                {lotto.img_url ? (
                    <img src={lotto.img_url} alt={lotto.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                ) : (
                    <div className="w-full h-full bg-linear-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                        <span className="text-white/50 font-bold text-xl">No Image</span>
                    </div>
                )}
            </div>

            {/* 2. Gradient Overlay Layer */}
            <div className={`absolute inset-0 z-10 bg-linear-to-t ${isClosed ? 'from-gray-900/90 via-gray-900/50' : 'from-slate-900/90 via-slate-900/40'} to-transparent`}></div>

            {/* 3. Content Layer */}
            <div className="absolute inset-0 z-20 p-4 flex flex-col justify-between">
                
                {/* Top: Status Badge */}
                <div className="flex justify-end">
                    {isClosed ? (
                        <span className="backdrop-blur-md bg-black/50 text-white text-[10px] px-2.5 py-1 rounded-full font-bold border border-white/20 flex items-center gap-1">
                          <AlertCircle size={12} /> ปิดรับ
                        </span>
                      ) : (
                        <span className={`
                          text-[10px] px-2.5 py-1 rounded-full font-bold border flex items-center gap-1 backdrop-blur-md shadow-sm
                          ${isUrgent 
                            ? 'bg-orange-500/80 text-white border-orange-400/50 animate-pulse' 
                            : 'bg-green-500/80 text-white border-green-400/50'
                          }
                        `}>
                          <span className={`w-1.5 h-1.5 rounded-full bg-white animate-ping`}></span>
                          {isUrgent ? 'ใกล้ปิด!' : 'เปิดรับ'}
                        </span>
                      )}
                </div>
                
                {/* Bottom: Info & Timer */}
                <div>
                    <h3 className="text-white font-bold text-lg leading-tight mb-2 drop-shadow-sm">
                      {lotto.name}
                    </h3>
                    
                    {/* Timer Bar */}
                    <div className="bg-black/40 backdrop-blur-sm rounded-xl p-2 border border-white/10 flex items-center justify-between">
                        {isClosed ? (
                           <div className="flex items-center gap-1.5 text-xs text-gray-300 font-mono">
                              <Clock size={14} /> <span>ปิดแล้ว</span>
                           </div>
                        ) : (
                           <div className={`flex items-center gap-1.5 text-xs font-mono ${isUrgent ? 'text-orange-300' : 'text-blue-300'}`}>
                              <Timer size={14} className={isUrgent ? 'animate-bounce' : ''} />
                              <span className="font-bold tracking-wider">{timeLeft}</span>
                           </div>
                        )}
                        
                        {!isClosed && (
                            <div className="bg-white/20 p-1 rounded-full text-white opacity-70 group-hover:opacity-100 group-hover:bg-blue-500 transition-all">
                                <ChevronRight size={14} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
      );
  };

  // --- Main Render ---
  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24 font-sans">
      
      {/* Header */}
      <div className="bg-linear-to-r from-slate-900 to-blue-900 text-white pt-6 pb-12 px-6 rounded-b-[2.5rem] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Sparkles className="text-yellow-400" fill="currentColor" /> Lotto Market
              </h1>
              <p className="text-slate-300 text-xs mt-1 font-mono opacity-80">
                {now.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/10 shadow-lg">
               <TrendingUp className="text-green-400" />
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="ค้นหาหวย..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/10 border border-white/10 text-white placeholder-slate-300 pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:bg-white/20 focus:border-white/30 transition-all backdrop-blur-sm"
            />
          </div>
        </div>
      </div>

      {/* Category Tabs (Sticky) */}
      <div className="sticky top-0 z-30 bg-[#f8fafc]/95 backdrop-blur-md py-3 px-4 shadow-sm border-b border-slate-100">
        <div className="flex overflow-x-auto gap-2 scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              className={`
                whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all duration-200
                ${filter === cat.id 
                  ? 'bg-slate-800 text-white shadow-md transform scale-105' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-400'
                }
              `}
            >
              <span>{cat.icon}</span> {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area with Separators */}
      <div className="px-4 mt-4 mb-8">
        
        {/* กรณีเลือก "ทั้งหมด" ให้แสดงแบบแยกหมวดหมู่ */}
        {filter === 'ALL' && searchTerm === '' ? (
            <div className="space-y-8">
                {CATEGORIES.slice(1).map(cat => {
                    const catLottos = getFilteredLottos(cat.id);
                    if (catLottos.length === 0) return null;

                    return (
                        <div key={cat.id}>
                            {/* --- จุดที่แก้ไข: ปิด tag ให้ถูกต้อง --- */}
                            <div className="flex items-center gap-3 mb-4">
                                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 whitespace-nowrap">
                                    <span className="text-xl">{cat.icon}</span> {cat.label}
                                </h2>
                                <div className="h-1px bg-slate-200 w-full"></div>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {catLottos.map(lotto => <LottoCard key={lotto.id} lotto={lotto} />)}
                            </div>
                        </div>
                    );
                })}
            </div>
        ) : (
            // กรณีเลือก Filter หรือ Search
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {getFilteredLottos(filter).map(lotto => <LottoCard key={lotto.id} lotto={lotto} />)}
            </div>
        )}

        {/* Empty State */}
        {getFilteredLottos(filter).length === 0 && (
            <div className="text-center py-20 text-gray-400">
                <Search className="mx-auto mb-2 opacity-50" size={40} />
                <p>ไม่พบรายการหวย</p>
            </div>
        )}
      </div>
    </div>
  );
}