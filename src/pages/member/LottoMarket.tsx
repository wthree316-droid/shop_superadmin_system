import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import { supabase } from '../../utils/supabaseClient';
import { 
  Sparkles, Search, Clock, Layers, 
  TrendingUp, Crown,  
  Globe, Lock
} from 'lucide-react';

// --------------------------------------------------------
// ✅ 1. ฟังก์ชันเช็คว่า "เปิดรับแทงอยู่หรือไม่?" (Real-time Check)
// --------------------------------------------------------
const checkIsOpen = (lotto: any, now: Date) => {

    if (lotto.is_active === false) return false;
    if (!lotto.close_time) return false;

    // -----------------------------------------------------
    // 🅰️ กรณี: หวยรายเดือน (Monthly) เช่น หวยรัฐบาล
    // -----------------------------------------------------
    if (lotto.rules?.schedule_type === 'monthly') {
        const closeDates = (lotto.rules.close_dates || [1, 16]).map(Number);
        const todayDate = now.getDate(); // วันที่ 1-31
        
        // ถ้า "วันนี้" เป็นวันหวยออก (เช่นวันที่ 1 หรือ 16)
        if (closeDates.includes(todayDate)) {
             const [cH, cM] = lotto.close_time.split(':').map(Number);
             const closeToday = new Date(now);
             closeToday.setHours(cH, cM, 0, 0);
             
             // ถ้าเวลายังไม่เกินเวลาปิด -> เปิด (True)
             // ถ้าเกินแล้ว -> ปิด (False)
             return now <= closeToday;
        }
        
        // วันอื่นๆ (วันที่ 2-15, 17-31) ให้เปิดตลอด 24 ชม. (เพื่อรับแทงล่วงหน้า)
        return true; 
        
        // ⚠️ หมายเหตุ: เรา return ตรงนี้เลย เพื่อ "ไม่ให้" ไปเช็ค จันทร์-อาทิตย์ ด้านล่าง
        // เพราะหวยรัฐบาลออกได้ทุกวัน ไม่สนว่าจะเป็นวันหยุดหรือไม่
    }

    // -----------------------------------------------------
    // 🅱️ กรณี: หวยรายวัน/หุ้น (เช็ควัน จันทร์-อาทิตย์)
    // -----------------------------------------------------
    // ถ้ามีข้อมูลวันเปิด และวันนี้ไม่อยู่ในรายการ -> ปิด
    if (lotto.open_days && Array.isArray(lotto.open_days) && lotto.open_days.length > 0) {
        const daysMap = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        const currentDayStr = daysMap[now.getDay()];
        
        // ถ้าวันนี้ไม่อยู่ในลิสต์เปิดรับ -> ปิดเลย
        if (!lotto.open_days.includes(currentDayStr)) {
            return false; 
        }
    }

    // -----------------------------------------------------
    // 🕒 เช็คเวลา (สำหรับหวยรายวัน)
    // -----------------------------------------------------
    if (!lotto.open_time) {
        // ถ้าไม่ระบุเวลาเปิด ให้ดูแค่ว่าเลยเวลาปิดหรือยัง
        const [cH, cM] = lotto.close_time.split(':').map(Number);
        const closeToday = new Date(now);
        closeToday.setHours(cH, cM, 0, 0);
        return now <= closeToday;
    }

    // กรณีมีทั้งเปิดและปิด (เช่น 08:00 - 15:30)
    const currentStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const openStr = lotto.open_time.substring(0, 5);
    const closeStr = lotto.close_time.substring(0, 5);

    if (openStr < closeStr) {
        return currentStr >= openStr && currentStr <= closeStr;
    } else {
        // ข้ามวัน
        return currentStr >= openStr || currentStr <= closeStr;
    }
};

// --------------------------------------------------------
// ✅ 2. ฟังก์ชันคำนวณวันปิดรอบถัดไป (Target Close Date)
// --------------------------------------------------------
const getCloseDate = (lotto: any, now: Date) => {
  if (!lotto.close_time) return null;
  
  const [cH, cM] = lotto.close_time.split(':').map(Number);
  const rules = lotto.rules || {}; 

  // --- A. หวยรายเดือน ---
  if (rules.schedule_type === 'monthly') {
      const targetDates = (rules.close_dates || [1, 16]).map(Number).sort((a: number, b: number) => a - b);
      const currentDay = now.getDate();
      let targetDay = -1;
      let targetMonth = now.getMonth();
      let targetYear = now.getFullYear();

      for (const d of targetDates) {
          if (d > currentDay) { targetDay = d; break; }
          if (d === currentDay) {
              const closeToday = new Date(now);
              closeToday.setHours(cH, cM, 0, 0);
              if (now <= closeToday) { targetDay = d; break; }
          }
      }

      if (targetDay === -1) {
          targetDay = targetDates[0]; 
          targetMonth++; 
          if (targetMonth > 11) { targetMonth = 0; targetYear++; }
      }
      return new Date(targetYear, targetMonth, targetDay, cH, cM, 0, 0);
  }

  // --- B. หวยรายวัน ---
  const closeDate = new Date(now);
  closeDate.setHours(cH, cM, 0, 0);

  // ถ้าเลยเวลาปิดแล้ว เป้าหมายคือพรุ่งนี้
  if (now >= closeDate) {
      closeDate.setDate(closeDate.getDate() + 1);
  }
  return closeDate;
};

const formatTimeRemaining = (diff: number) => {
  if (diff <= 0) return null;
  const h = Math.floor(diff / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((diff % (1000 * 60)) / 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// --------------------------------------------------------
// ✅ 3. ฟังก์ชัน UI (Icon & Color)
// --------------------------------------------------------
const getCategoryFlag = (label: string) => {
  const name = label.toLowerCase();
  
  const Flag = ({ code }: { code: string }) => (
    <img src={`https://flagcdn.com/w40/${code}.png`} srcSet={`https://flagcdn.com/w80/${code}.png 2x`} alt={label} className="w-5 h-auto rounded-xs shadow-sm object-cover mr-1.5" />
  );

  const IconBadge = ({ icon: Icon, colorClass, style }: any) => (
    <div className={`w-5 h-3.5 flex items-center justify-center rounded-xs shadow-sm mr-1.5 ${colorClass || ''}`} style={style}>
       <Icon size={12} strokeWidth={3} className="text-white" />
    </div>
  );

  if (name.includes('vip')) return <IconBadge icon={Crown} style={{ background: 'linear-gradient(to right, #FBBF24, #F59E0B)' }} />;
  if (name.includes('หุ้น') || name.includes('stock')) return <IconBadge icon={TrendingUp} colorClass="bg-blue-500" />;
  if (name.includes('อื่น') || name.includes('etc')) return <IconBadge icon={Search} colorClass="bg-gray-500" />;

  if (name.includes('ไทย') || name.includes('รัฐบาล')) return <Flag code="th" />;
  if (name.includes('ฮานอย') || name.includes('เวียดนาม')) return <Flag code="vn" />;
  if (name.includes('ลาว')) return <Flag code="la" />;
  if (name.includes('มาเล')) return <Flag code="my" />;
  if (name.includes('จีน')) return <Flag code="cn" />;
  if (name.includes('เกาหลี')) return <Flag code="kr" />;
  if (name.includes('ญี่ปุ่น') || name.includes('นิเคอิ')) return <Flag code="jp" />;
  if (name.includes('ไต้หวัน')) return <Flag code="tw" />;
  if (name.includes('สิงคโปร์')) return <Flag code="sg" />;
  if (name.includes('อินเดีย')) return <Flag code="in" />;
  if (name.includes('รัสเซีย')) return <Flag code="ru" />;
  if (name.includes('เยอรมัน')) return <Flag code="de" />;
  if (name.includes('อังกฤษ')) return <Flag code="gb" />;
  if (name.includes('ดาวโจนส์') || name.includes('อเมริกา') || name.includes('us')) return <Flag code="us" />;
  if (name.includes('ฮ่องกง')) return <Flag code="hk" />;
  if (name.includes('อียิปต์')) return <Flag code="eg" />;
  
  return <Globe size={16} className="text-gray-400 mr-1.5" />;
};

const getCategoryColorStyle = (cat: any) => {
    if (!cat.color) return { backgroundColor: '#3B82F6' };
    if (cat.color.startsWith('#')) return { backgroundColor: cat.color }; 
    return {};
};

// --------------------------------------------------------
// ✅ Main Component
// --------------------------------------------------------
export default function LottoMarket() {
  const [lottos, setLottos] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [now, setNow] = useState(new Date());
  const [filter, setFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
        try {
            const [resLottos, resCats] = await Promise.all([
                client.get('/play/lottos'),
                client.get('/play/categories')
            ]);
            setLottos(resLottos.data);
            setCategories(resCats.data);
        } catch (err) {
            console.error("Failed to load market data", err);
        }
    };
    fetchData();
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('realtime-lottos-market')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'lotto_types' },
        (payload) => {
          const updatedLotto = payload.new;
          // อัปเดตข้อมูลใน State ทันที
          setLottos((prevLottos) => 
            prevLottos.map((l) => 
              l.id === updatedLotto.id ? { ...l, ...updatedLotto } : l
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const displayCategories = useMemo(() => {
      return [{ id: 'ALL', label: 'ทั้งหมด', color: 'bg-blue-600' }, ...categories];
  }, [categories]);

  const getFilteredLottos = (categoryId: string) => {
    const filtered = lottos.filter(l => {
      const catMatch = categoryId === 'ALL' || l.category === categoryId;
      const searchMatch = l.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      return catMatch && searchMatch;
    });

    return filtered.sort((a, b) => {
      // เรียง Open ขึ้นก่อน Closed
      const openA = checkIsOpen(a, now);
      const openB = checkIsOpen(b, now);
      if (openA && !openB) return -1;
      if (!openA && openB) return 1;
      
      // ถ้าสถานะเหมือนกัน เรียงตามเวลาปิด
      const dateA = getCloseDate(a, now);
      const dateB = getCloseDate(b, now);
      if (!dateA) return 1; 
      if (!dateB) return -1;
      return dateA.getTime() - dateB.getTime();
    });
  };

  // --- LottoCard Component ---
  const LottoCard = ({ lotto }: { lotto: any }) => {
      // ใช้ checkIsOpen เป็นตัวหลักในการบอกว่า "เปิดหรือปิด"
      const isOpen = checkIsOpen(lotto, now);
      const closeDate = useMemo(() => getCloseDate(lotto, now), [lotto, now]);
      
      const diff = closeDate ? closeDate.getTime() - now.getTime() : 0;
      const timeLeftStr = isOpen ? formatTimeRemaining(diff) : null;
      const isCritical = isOpen && diff < 30 * 60 * 1000; 

      return (
        <div 
          onClick={() => isOpen && navigate(`/play/${lotto.id}`)}
          className={`
            relative p-3 rounded-sm shadow-sm border transition-all duration-200 overflow-hidden cursor-pointer
            ${isOpen 
                ? 'bg-[#00B900] border-[#00A000] hover:scale-[1.02] hover:shadow-md text-white' 
                : 'bg-gray-100 border-gray-200 opacity-90 text-gray-500 cursor-not-allowed grayscale'
            }
          `}
        >
            <div className="flex justify-between items-start mb-2">
                <div className="w-14 h-9 bg-white/20 rounded-sm overflow-hidden shrink-0 border border-white/10 shadow-sm">
                    {lotto.img_url ? (
                        <img 
                            src={lotto.img_url} 
                            alt={lotto.name} 
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/60x40?text=Lotto'; }}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] font-bold">LOGO</div>
                    )}
                </div>

                <div className="text-right flex flex-col items-end flex-1 pl-2">
                    <h3 className={`font-bold text-sm leading-tight line-clamp-1 ${isOpen ? 'text-white' : 'text-gray-700'}`}>
                        {lotto.name}
                    </h3>
                    <span className={`text-xs font-bold mt-0.5 ${isOpen ? 'text-white/90' : 'text-red-500'}`}>
                        {isOpen ? 'เปิดรับ' : 'ปิดรับ'}
                    </span>
                </div>
            </div>

            <div className={`text-[10px] space-y-0.5 font-medium ${isOpen ? 'text-white/90' : 'text-gray-500'}`}>
                {/* แถว: ปิดรับเมื่อไหร่ */}
                <div className="flex justify-between border-b border-white/10 pb-0.5 mb-0.5">
                    {closeDate && closeDate.getDate() !== now.getDate() ? (
                        <span className={`${isOpen ? 'text-yellow-200' : 'text-gray-600'} font-bold`}>
                            ปิด {closeDate.getDate()}/{closeDate.getMonth()+1}
                        </span>
                    ) : (
                        <span>ปิดรับวันนี้</span>
                    )}
                    <span className="font-bold">{lotto.close_time?.substring(0,5) || '-'}</span>
                </div>
                
                {/* แถว: ออกผล */}
                <div className="flex justify-between border-b border-white/10 pb-0.5 mb-0.5">
                    <span>ออกผล</span>
                    <span className="font-bold">{lotto.result_time?.substring(0,5) || '-'}</span>
                </div>

                {/* แถว: สถานะ/เวลานับถอยหลัง */}
                <div className="flex justify-between items-center pt-0.5">
                    <span>สถานะ</span>
                    {!isOpen ? (
                        <span className="font-bold text-red-500 flex items-center gap-1">
                            <Lock size={10} /> ปิดชั่วคราว
                        </span>
                    ) : (
                        <span className={`
                            font-bold px-1.5 py-0 rounded text-[9px] whitespace-nowrap flex items-center gap-1
                            ${isCritical 
                                ? 'bg-red-600 text-white animate-pulse shadow-sm' 
                                : 'bg-black/20' 
                            }
                        `}>
                           {isCritical && <Clock size={10} strokeWidth={3} />} 
                           ปิดใน {timeLeftStr}
                        </span>
                    )}
                </div>
            </div>
        </div>
      );
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] pb-24 font-sans">
      
      {/* Header & Search */}
      <div className="bg-white text-gray-800 pt-4 pb-4 px-4 shadow-sm relative z-20">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-bold flex items-center gap-2 text-[#1e293b]">
              <Sparkles className="text-blue-600" size={20} /> ตลาดหวย
            </h1>
            <div className="text-xs text-gray-500">
               {now.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'short' })}
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="ค้นหาชื่อหวย..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-100 border border-gray-200 text-gray-700 placeholder-gray-400 pl-9 pr-4 py-2 rounded-lg focus:outline-none focus:bg-white focus:border-blue-500 text-sm transition-all"
            />
          </div>
      </div>

      {/* Categories Bar */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 py-2 px-4 shadow-sm overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {displayCategories.map(cat => {
            const isSelected = filter === cat.id;
            const style = isSelected ? (cat.id === 'ALL' ? { backgroundColor: '#2563EB' } : getCategoryColorStyle(cat)) : {};
            
            return (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              style={style}
              className={`
                whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-all border
                ${isSelected 
                  ? 'text-white border-transparent shadow-sm' 
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }
              `}
            >
              {cat.id !== 'ALL' && (
                  getCategoryFlag(cat.label) || (
                      !isSelected && (
                         <span className="w-2 h-2 rounded-full" style={getCategoryColorStyle(cat)}></span>
                      )
                  )
              )}
              {cat.id === 'ALL' && <Layers size={14}/>}
              {cat.label}
            </button>
          )})}
        </div>
      </div>

      {/* Content Grid */}
      <div className="p-4">
        {filter === 'ALL' && searchTerm === '' ? (
            <div className="space-y-6">
                {displayCategories.slice(1).map(cat => {
                    const catLottos = getFilteredLottos(cat.id);
                    if (catLottos.length === 0) return null;

                    return (
                        <div key={cat.id}>
                            <h2 className="text-sm font-bold text-gray-700 mb-3 pl-2 border-l-4 flex items-center gap-2"
                                style={{ borderColor: cat.color?.startsWith('#') ? cat.color : '#3B82F6' }}
                            >
                                {getCategoryFlag(cat.label) || (
                                    <span className="w-2 h-2 rounded-full" style={getCategoryColorStyle(cat)}></span>
                                )}
                                {cat.label}
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
            <div className="text-center py-20 text-gray-400 text-sm flex flex-col items-center">
                <Search className="mb-2 opacity-30" size={48} />
                <p>ไม่พบรายการหวยที่เปิดรับ</p>
                <button onClick={() => { setFilter('ALL'); setSearchTerm(''); }} className="mt-2 text-blue-500 underline text-xs">
                    ดูทั้งหมด
                </button>
            </div>
        )}
      </div>
    </div>
  );
}