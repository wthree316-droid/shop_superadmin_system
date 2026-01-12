import { useEffect, useState } from 'react';
import client from '../../api/client';
import { 
  Search, Calendar, Trophy, ArrowLeft, 
  ChevronRight, Sparkles, TrendingUp 
} from 'lucide-react';
import { Loader2 } from 'lucide-react';

// Interfaces
interface LottoType {
  id: string;
  name: string;
  img_url?: string;
}

interface LottoResult {
  id: string;
  lotto_name: string;
  round_date: string;
  top_3: string;
  bottom_2: string;
  created_at: string;
}

export default function MemberResults() {
  // State ควบคุมหน้าจอ
  const [view, setView] = useState<'MENU' | 'HISTORY'>('MENU');
  const [selectedLotto, setSelectedLotto] = useState<LottoType | null>(null);

  // Data State
  const [lottos, setLottos] = useState<LottoType[]>([]);
  const [results, setResults] = useState<LottoResult[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Search State
  const [searchTerm, setSearchTerm] = useState('');

  // 1. โหลดรายชื่อหวยทั้งหมดมาก่อน (สำหรับทำเมนู)
  useEffect(() => {
    const fetchLottos = async () => {
      try {
        const res = await client.get('/play/lottos'); // ใช้ API เดิมที่ดึงรายชื่อหวย
        setLottos(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchLottos();
  }, []);

  // 2. ฟังก์ชันกดเลือกหวย -> โหลดประวัติ
  const handleSelectLotto = async (lotto: LottoType) => {
    setLoading(true);
    setSelectedLotto(lotto);
    setView('HISTORY'); // เปลี่ยนหน้า
    setResults([]); // เคลียร์ของเก่า

    try {
      // ยิง API ที่เราแก้ backend ตะกี้ พร้อมส่ง ID ไปกรอง
      const res = await client.get(`/reward/history?lotto_type_id=${lotto.id}&limit=50`);
      setResults(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setView('MENU');
    setSelectedLotto(null);
    setSearchTerm('');
  };

  // Helper สำหรับจัดรูปแบบวันที่
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('th-TH', {
      year: 'numeric', month: 'short', day: 'numeric', weekday: 'short'
    });
  };

  // กรองรายชื่อหวยในหน้าเมนู
  const filteredLottos = lottos.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 pb-24 max-w-4xl mx-auto animate-fade-in font-sans">
      
      {/* ================= VIEW 1: MENU (เลือกหวย) ================= */}
      {view === 'MENU' && (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2 mb-2">
              <Trophy className="text-yellow-500" /> ผลรางวัล
            </h1>
            <p className="text-slate-500 text-sm">เลือกประเภทหวยเพื่อดูผลย้อนหลัง</p>
          </div>

          {/* Search Bar */}
          <div className="relative mb-6">
            <input 
              type="text" 
              placeholder="ค้นหาชื่อหวย..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute left-3 top-3.5 text-slate-400" size={20} />
          </div>

          {/* Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredLottos.map(lotto => (
              <button 
                key={lotto.id}
                onClick={() => handleSelectLotto(lotto)}
                className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-bold shadow-sm group-hover:scale-110 transition-transform">
                    {lotto.img_url ? (
                      <img src={lotto.img_url} 
                      loading="lazy" 
                      decoding="async"
                      alt={lotto.name}  
                      className="w-full h-full object-cover rounded-full" />
                    ) : (
                      lotto.name.charAt(0)
                    )}
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-slate-800 text-lg group-hover:text-blue-600 transition-colors">
                        {lotto.name}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-1">
                        <TrendingUp size={12}/> คลิกเพื่อดูผลย้อนหลัง
                    </div>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <ChevronRight size={18} />
                </div>
              </button>
            ))}

            {filteredLottos.length === 0 && (
                <div className="col-span-full text-center py-10 text-slate-400">
                    ไม่พบหวยที่คุณค้นหา
                </div>
            )}
          </div>
        </>
      )}

      {/* ================= VIEW 2: HISTORY (ดูผล) ================= */}
      {view === 'HISTORY' && selectedLotto && (
        <div className="animate-slide-up">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button 
                onClick={handleBack}
                className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 shadow-sm transition-colors"
            >
                <ArrowLeft size={20} />
            </button>
            <div>
                <h2 className="text-xl font-bold text-slate-800">{selectedLotto.name}</h2>
                <div className="text-xs text-slate-500 flex items-center gap-1">
                    <Sparkles size={12} className="text-yellow-500"/> ผลรางวัลล่าสุด & ย้อนหลัง
                </div>
            </div>
          </div>

          {/* Result List */}
          {loading ? (
             <div className="py-20 flex flex-col items-center text-slate-400">
                 <Loader2 className="animate-spin mb-2" size={32} />
                 <p>กำลังโหลดข้อมูล...</p>
             </div>
          ) : results.length > 0 ? (
             <div className="space-y-4">
                 {/* Card รายการผลรางวัล */}
                 {results.map((item, index) => (
                     <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                         {/* วันที่หัวตาราง */}
                         <div className={`px-4 py-2 border-b border-slate-50 flex justify-between items-center ${index === 0 ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-600'}`}>
                             <div className="flex items-center gap-2 font-bold text-sm">
                                 <Calendar size={14} />
                                 {formatDate(item.round_date)}
                             </div>
                             {index === 0 && <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">ล่าสุด</span>}
                         </div>

                         {/* เนื้อหาผลรางวัล */}
                         <div className="p-4 flex items-center divide-x divide-slate-100">
                             {/* 3 ตัวบน */}
                             <div className="flex-1 flex flex-col items-center justify-center px-2">
                                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">3 ตัวบน</span>
                                 <span className="text-3xl font-black text-slate-800 tracking-widest">
                                     {item.top_3 || '-'}
                                 </span>
                             </div>
                             
                             {/* 2 ตัวล่าง */}
                             <div className="flex-1 flex flex-col items-center justify-center px-2">
                                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">2 ตัวล่าง</span>
                                 <span className="text-3xl font-black text-blue-600 tracking-widest">
                                     {item.bottom_2 || '-'}
                                 </span>
                             </div>
                         </div>
                     </div>
                 ))}
             </div>
          ) : (
             <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-200 text-center text-slate-400">
                 <Trophy className="mx-auto mb-2 opacity-20" size={48} />
                 <p>ยังไม่มีการออกผลรางวัลสำหรับหวยนี้</p>
             </div>
          )}
        </div>
      )}

    </div>
  );
}