import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import { 
  Sparkles, Search
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
  { id: 'THAI', label: 'รัฐบาลไทย', icon: '' },
  { id: 'LAOS', label: 'หวยลาว', icon: '' },
  { id: 'HANOI', label: 'หวยฮานอย', icon: '' },
  { id: 'STOCKS', label: 'หวยหุ้น', icon: '📈' },
  { id: 'STOCKSVIP', label: 'หวยหุ้นVIP', icon: '📈' },
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

  const getFilteredLottos = (category: string) => {
    return lottos.filter(l => {
      const catMatch = category === 'ALL' || (l.category || 'OTHERS') === category;
      const searchMatch = l.name.toLowerCase().includes(searchTerm.toLowerCase());
      return catMatch && searchMatch;
    });
  };

  // --- [UPDATED] LottoCard Layout แบบ Dashboard ---
  const LottoCard = ({ lotto }: { lotto: any }) => {
      const closeDate = getCloseDate(lotto.close_time);
      const timeLeft = closeDate ? getTimeRemaining(closeDate, now) : null;
      const isClosed = !timeLeft; 

      return (
        <div 
          onClick={() => !isClosed && navigate(`/play/${lotto.id}`)}
          className={`
            relative p-3 rounded-sm shadow-sm border transition-all duration-200 overflow-hidden cursor-pointer
            ${!isClosed 
                ? 'bg-[#00B900] border-[#00A000] hover:scale-[1.02] hover:shadow-md text-white' 
                : 'bg-white border-gray-200 opacity-80 text-gray-700 grayscale'
            }
          `}
        >
            {/* Header: Flag & Name */}
            <div className="flex justify-between items-start mb-2">
                {/* Flag Image */}
                <div className="w-14 h-9 bg-white/20 rounded-sm overflow-hidden shrink-0 border border-white/10 shadow-sm">
                    {lotto.img_url ? (
                        <img 
                            src={lotto.img_url} 
                            alt={lotto.name} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://placehold.co/60x40?text=Lotto';
                            }}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] font-bold">LOGO</div>
                    )}
                </div>

                {/* Name & Status */}
                <div className="text-right flex flex-col items-end flex-1 pl-2">
                    <h3 className={`font-bold text-xs leading-tight line-clamp-1 ${!isClosed ? 'text-white' : 'text-gray-800'}`}>
                        {lotto.name}
                    </h3>
                    <span className={`text-[10px] font-bold mt-0.5 ${!isClosed ? 'text-white/90' : 'text-gray-500'}`}>
                        {isClosed ? 'ปิดรับ' : 'เปิดรับ'}
                    </span>
                </div>
            </div>

            {/* Info Rows */}
            <div className={`text-[10px] space-y-0.5 font-medium ${!isClosed ? 'text-white/90' : 'text-gray-500'}`}>
                {/* เวลาปิด */}
                <div className="flex justify-between border-b border-white/10 pb-0">
                    <span>เวลาปิด</span>
                    <span className="font-bold">{lotto.close_time || '-'}</span>
                </div>
                
                {/* ออกผล */}
                <div className="flex justify-between border-b border-white/10 pb-0">
                    <span>ออกผล</span>
                    <span className="font-bold">{lotto.result_time || '-'}</span>
                </div>

                {/* สถานะ / Countdown */}
                <div className="flex justify-between items-center pt-0">
                    <span>สถานะ</span>
                    {isClosed ? (
                        <span>-</span>
                    ) : (
                        <span className="font-bold bg-black/20 px-1.5 py-0 rounded text-[9px] whitespace-nowrap">
                           ปิดรับใน {timeLeft}
                        </span>
                    )}
                </div>
            </div>
        </div>
      );
  };

  // --- Main Render ---
  return (
    <div className="min-h-screen bg-[#f1f5f9] pb-24 font-sans">
      
      {/* Header */}
      <div className="bg-white text-gray-800 pt-4 pb-4 px-4 shadow-sm relative z-20">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-bold flex items-center gap-2 text-[#1e293b]">
              <Sparkles className="text-blue-600" size={20} /> รายการหวย
            </h1>
            <div className="text-xs text-gray-500">
               {now.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'short' })}
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="ค้นหา..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-100 border border-gray-200 text-gray-700 placeholder-gray-400 pl-9 pr-4 py-2 rounded-lg focus:outline-none focus:bg-white focus:border-blue-500 text-sm transition-all"
            />
          </div>
      </div>

      {/* Category Tabs */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 py-2 px-4 shadow-sm overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              className={`
                whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-all
                ${filter === cat.id 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              <span>{cat.icon}</span> {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Content */}
      <div className="p-4">
        {filter === 'ALL' && searchTerm === '' ? (
            <div className="space-y-6">
                {CATEGORIES.slice(1).map(cat => {
                    const catLottos = getFilteredLottos(cat.id);
                    if (catLottos.length === 0) return null;

                    return (
                        <div key={cat.id}>
                            <h2 className="text-sm font-bold text-gray-700 mb-3 pl-1 border-l-4 border-blue-500 flex items-center gap-2">
                                {cat.icon} {cat.label}
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {catLottos.map(lotto => <LottoCard key={lotto.id} lotto={lotto} />)}
                            </div>
                        </div>
                    );
                })}
            </div>
        ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {getFilteredLottos(filter).map(lotto => <LottoCard key={lotto.id} lotto={lotto} />)}
            </div>
        )}

        {getFilteredLottos(filter).length === 0 && (
            <div className="text-center py-20 text-gray-400 text-sm">
                <Search className="mx-auto mb-2 opacity-50" size={32} />
                <p>ไม่พบรายการ</p>
            </div>
        )}
      </div>
    </div>
  );
}