import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import { 
  Sparkles, Search, Clock, Layers, 
  TrendingUp, Crown,  
  Globe 
} from 'lucide-react';

// --- Helper Functions ---

// ในไฟล์ LottoMarket.tsx

// ✅ [แก้ไขรอบ 2] ปรับปรุง Logic คำนวณวันปิด โดยใช้ Open Time ช่วยเช็ค
const getCloseDate = (lotto: any, now: Date) => {
  if (!lotto.close_time) return null;
  
  const [cH, cM] = lotto.close_time.split(':').map(Number);
  
  // ตั้งต้นวันปิดเป็น "วันนี้" ไว้ก่อน
  const closeDate = new Date(now);
  closeDate.setHours(cH, cM, 0, 0);

  // ถ้าไม่มี open_time ให้ใช้ Logic เดิม (เดาจากเวลาปัจจุบัน)
  if (!lotto.open_time) {
      if (cH < 12 && now.getHours() >= 12) {
           closeDate.setDate(closeDate.getDate() + 1);
      }
      return closeDate;
  }

  // ดึงเวลาเปิดมาเทียบ
  const [oH, oM] = lotto.open_time.split(':').map(Number);

  // เช็คว่าเป็นหวยข้ามวันหรือไม่? (เวลาเปิด มากกว่า เวลาปิด เช่น เปิด 05:00, ปิด 01:00)
  const isCrossDay = oH > cH || (oH === cH && oM > cM);

  if (isCrossDay) {
      // ถ้าเป็นหวยข้ามวัน และตอนนี้เลยเวลาเปิดมาแล้ว (เช่น ตอนนี้ 08:00, เปิด 05:00)
      // แสดงว่าเวลาปิดต้องเป็น "ของพรุ่งนี้" (ตี 1 พรุ่งนี้)
      if (now.getHours() > oH || (now.getHours() === oH && now.getMinutes() >= oM)) {
          closeDate.setDate(closeDate.getDate() + 1);
      }
      // แต่ถ้าตอนนี้ตี 00:30 (ยังไม่ถึงเวลาปิดตี 1) -> ก็ใช้วันปิดเป็น "วันนี้" ได้เลย (ถูกต้องแล้ว)
  } 
  // ถ้าไม่ใช่หวยข้ามวัน (เช่น เปิด 08:00 ปิด 16:00) 
  // แล้วเวลาปัจจุบันเลยเวลาปิดไปแล้ว (เช่น ตอนนี้ 17:00)
  // ปกติมันจะถือว่าปิด (Diff ติดลบ) ซึ่งถูกต้องแล้ว ไม่ต้องบวกวันเพิ่ม
  
  return closeDate;
};

const formatTimeRemaining = (diff: number) => {
  if (diff <= 0) return null;
  const h = Math.floor(diff / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((diff % (1000 * 60)) / 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const getCategoryFlag = (label: string) => {
  const name = label.toLowerCase();
  
  const Flag = ({ code }: { code: string }) => (
    <img 
      src={`https://flagcdn.com/w40/${code}.png`} 
      srcSet={`https://flagcdn.com/w80/${code}.png 2x`}
      alt={label}
      className="w-5 h-auto rounded-xs shadow-sm object-cover mr-1.5"
    />
  );

  const IconBadge = ({ icon: Icon, color }: any) => (
    <div className={`w-5 h-3.5 flex items-center justify-center rounded-xs shadow-sm mr-1.5 ${color}`}>
       <Icon size={12} strokeWidth={3} className="text-white" />
    </div>
  );

  if (name.includes('vip')) return <IconBadge icon={Crown} color="bg-gradient-to-r from-yellow-400 to-amber-500" />;

  // 2. หวยหุ้น (ทั่วไป)
  if (name.includes('หุ้น') || name.includes('stock')) return <IconBadge icon={TrendingUp} color="bg-blue-500" />;

  // 3. หวยอื่นๆ (ใช้รูปภาพ Emoji ลูกเต๋า หรือ กล่องสุ่ม จาก CDN)
  // หมายเหตุ: ใช้ CDN ของ emojicdn หรือ fluents (Microsoft style)
  if (name.includes('อื่น') || name.includes('etc')) {
       return <IconBadge icon={Search} color="bg-blue-500" />;
  }

  // --- เช็คประเทศ (Logic เดิม) ---
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

  const displayCategories = useMemo(() => {
      return [
          { id: 'ALL', label: 'ทั้งหมด', color: 'bg-blue-600 text-white' },
          ...categories
      ];
  }, [categories]);

  // 3. ฟังก์ชันกรองหวย (Update Logic)
  const getFilteredLottos = (categoryId: string) => {
    const filtered = lottos.filter(l => {
      const catMatch = categoryId === 'ALL' || l.category === categoryId;
      const searchMatch = l.name.toLowerCase().includes(searchTerm.toLowerCase());
      const activeMatch = l.is_active;
      return catMatch && searchMatch && activeMatch;
    });

    // เรียงลำดับตามเวลาปิด
    return filtered.sort((a, b) => {

      const dateA = getCloseDate(a, now);
      const dateB = getCloseDate(b, now);

      if (!dateA) return 1;
      if (!dateB) return -1;

      const diffA = dateA.getTime() - now.getTime();
      const diffB = dateB.getTime() - now.getTime();

      const isOpenA = diffA > 0;
      const isOpenB = diffB > 0;

      // หวยที่เปิดอยู่ ขึ้นก่อน หวยที่ปิดแล้ว
      if (isOpenA && !isOpenB) return -1;
      if (!isOpenA && isOpenB) return 1; 

      // ถ้าเปิดอยู่ทั้งคู่ ให้เรียงตามเวลาที่เหลือน้อยที่สุดขึ้นก่อน (Urgency)
      if (isOpenA && isOpenB) {
        return diffA - diffB;
      }

      return dateA.getTime() - dateB.getTime();
    });
  };

  // --- LottoCard Component ---
  const LottoCard = ({ lotto }: { lotto: any }) => {
      // ✅ [แก้ไข 3] ส่ง now เข้าไป
      const closeDate = getCloseDate(lotto, now);
      const diff = closeDate ? closeDate.getTime() - now.getTime() : 0;
      const isClosed = diff <= 0;
      const timeLeftStr = !isClosed ? formatTimeRemaining(diff) : null;
      const isCritical = !isClosed && diff < 30 * 60 * 1000; 

      return (
        <div 
          onClick={() => !isClosed && navigate(`/play/${lotto.id}`)}
          className={`
            relative p-3 rounded-sm shadow-sm border transition-all duration-200 overflow-hidden cursor-pointer
            ${!isClosed 
                ? 'bg-[#00B900] border-[#00A000] hover:scale-[1.02] hover:shadow-md text-white' 
                : 'bg-white border-gray-200 opacity-80 text-gray-700 grayscale cursor-not-allowed'
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
                    <h3 className={`font-bold text-sm leading-tight line-clamp-1 ${!isClosed ? 'text-white' : 'text-gray-800'}`}>
                        {lotto.name}
                    </h3>
                    <span className={`text-xs font-bold mt-0.5 ${!isClosed ? 'text-white/90' : 'text-gray-500'}`}>
                        {isClosed ? 'ปิดรับ' : 'เปิดรับ'}
                    </span>
                </div>
            </div>

            <div className={`text-[10px] space-y-0.5 font-medium ${!isClosed ? 'text-white/90' : 'text-gray-500'}`}>
                <div className="flex justify-between border-b border-white/10 pb-0">
                    <span>เวลาปิด</span>
                    <span className="font-bold">{lotto.close_time?.substring(0,5) || '-'}</span>
                </div>
                
                <div className="flex justify-between border-b border-white/10 pb-0">
                    <span>ออกผล</span>
                    <span className="font-bold">{lotto.result_time?.substring(0,5) || '-'}</span>
                </div>

                <div className="flex justify-between items-center pt-0">
                    <span>สถานะ</span>
                    {isClosed ? (
                        <span>-</span>
                    ) : (
                        <span className={`
                            font-bold px-1.5 py-0 rounded text-[9px] whitespace-nowrap flex items-center gap-1
                            ${isCritical 
                                ? 'bg-red-600 text-white animate-pulse shadow-sm' 
                                : 'bg-black/20' 
                            }
                        `}>
                           {isCritical && <Clock size={10} strokeWidth={3} />} 
                           ปิดรับใน {timeLeftStr}
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

      {/* Categories Scrollable Bar */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 py-2 px-4 shadow-sm overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {displayCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              className={`
                whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-all border
                ${filter === cat.id 
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }
              `}
            >
              {cat.id !== 'ALL' && (
                  getCategoryFlag(cat.label) ? (
                      getCategoryFlag(cat.label)
                  ) : (
                      filter !== cat.id && (
                          <span className={`w-2 h-2 rounded-full ${cat.color.split(' ')[0].replace('text', 'bg').replace('100', '500')}`}></span>
                      )
                  )
              )}
              {cat.id === 'ALL' && <Layers size={14}/>}
              {cat.label}
            </button>
          ))}
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
                            <h2 className="text-sm font-bold text-gray-700 mb-3 pl-2 border-l-4 border-blue-500 flex items-center gap-2">
                                {getCategoryFlag(cat.label) || (
                                    <span className={`w-2 h-2 rounded-full ${cat.color.split(' ')[0].replace('text', 'bg').replace('100', '500')}`}></span>
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