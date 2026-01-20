import { useEffect, useState, useMemo } from 'react';
import client from '../../api/client';
import { 
  Calendar, Trophy, Copy, 
  ChevronLeft, ChevronRight, Loader2, Search
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function MemberResults() {
  const [lottos, setLottos] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [resultsMap, setResultsMap] = useState<any>({});
  const [loading, setLoading] = useState(true);
  
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];

      const [resLottos, resCats, resResults] = await Promise.all([
        client.get('/play/lottos'),
        client.get('/play/categories'),
        client.get(`/reward/daily?date=${dateStr}`) 
      ]);

      setLottos(resLottos.data);
      setCategories(resCats.data);
      setResultsMap(resResults.data || {});

    } catch (err) {
      console.error(err);
      toast.error("ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  };

  // --- Logic การจัดกลุ่มและเรียงลำดับ (ปรับปรุงใหม่) ---
  const groupedLottos = useMemo(() => {
    if (lottos.length === 0) return [];

    const catMap = new Map();
    categories.forEach(c => catMap.set(c.id, c));

    const groups: any = {};
    const noCatKey = 'uncategorized';

    lottos.forEach(lotto => {
        // ✅ 1. กรองเฉพาะหวยที่มีผลรางวัลแล้วเท่านั้น (ในวันที่เลือก)
        // ถ้าไม่มีผลใน resultsMap ให้ข้ามไปเลย (ไม่แสดง)
        if (!resultsMap[lotto.id]) return;

        const catId = lotto.category || noCatKey;
        if (!groups[catId]) {
            groups[catId] = {
                info: catMap.get(catId) || { label: 'หมวดอื่นๆ', color: 'bg-gray-800 text-white' },
                items: []
            };
        }
        groups[catId].items.push(lotto);
    });

    // 2. แปลงเป็น Array และเรียงลำดับ
    return Object.values(groups)
        .map((group: any) => {
            // ✅ 3. เรียงหวยในกลุ่มจาก "ล่าสุด -> เก่าสุด" (เวลาปิดดึกสุดอยู่บน)
            group.items.sort((a: any, b: any) => {
                if (!a.close_time) return 1;
                if (!b.close_time) return -1;
                // สลับ a กับ b เพื่อเรียงจากมากไปน้อย (Descending)
                return b.close_time.localeCompare(a.close_time);
            });
            return group;
        })
        // (Optional) เรียงกลุ่มหมวดหมู่ถ้าต้องการ แต่ตอนนี้ปล่อยตามลำดับที่เจอ
        ; 
  }, [lottos, categories, resultsMap]);

  // --- Helpers ---
  const changeDate = (days: number) => {
      const newDate = new Date(selectedDate);
      newDate.setDate(selectedDate.getDate() + days);
      setSelectedDate(newDate);
  };

  const formatDateDisplay = (date: Date) => {
      return date.toLocaleDateString('th-TH', { 
          day: '2-digit', month: '2-digit', year: 'numeric' 
      });
  };

  const getTop2 = (top3: string) => {
      if (!top3 || top3.length < 2) return '-';
      return top3.slice(-2);
  };

  const handleCopy = (lottoName: string, top3: string, bottom2: string) => {
      const text = `${lottoName}\nบน: ${top3}\nล่าง: ${bottom2}`;
      navigator.clipboard.writeText(text);
      toast.success(`คัดลอกผล ${lottoName} แล้ว`);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-10 font-sans animate-fade-in">
      
      {/* --- Header Section --- */}
      <div className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-20">
          <div className="max-w-5xl mx-auto p-4 md:p-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                        <Trophy size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-800 tracking-tight">ตรวจผลรางวัล</h1>
                        <p className="text-xs text-slate-500">อัพเดทล่าสุดแบบเรียลไทม์</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                    <button onClick={() => changeDate(-1)} className="p-2 hover:bg-white rounded-lg transition-colors text-slate-500 shadow-sm">
                        <ChevronLeft size={20} />
                    </button>
                    
                    <div className="flex items-center gap-2 px-4 min-w-35 justify-center font-bold text-slate-700">
                        <Calendar size={16} className="text-blue-600 mb-0.5" />
                        {formatDateDisplay(selectedDate)}
                    </div>

                    <button onClick={() => changeDate(1)} className="p-2 hover:bg-white rounded-lg transition-colors text-slate-500 shadow-sm" disabled={selectedDate >= new Date()}>
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>
          </div>
      </div>

      {/* --- Content --- */}
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-8">
          
          {loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                  <Loader2 className="animate-spin mb-2 text-blue-500" size={40} />
                  <p>กำลังโหลดผลรางวัล...</p>
              </div>
          ) : (
              groupedLottos.length > 0 ? (
                  groupedLottos.map((group: any, idx: number) => (
                      <div key={idx} className="animate-slide-up" style={{ animationDelay: `${idx * 50}ms` }}>
                          
                          {/* Category Header */}
                          <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                              <span className={`w-1.5 h-6 rounded-full ${group.info.color.split(' ')[0].replace('text', 'bg').replace('100', '500')}`}></span>
                              {group.info.label} 
                          </h2>

                          {/* Table Card */}
                          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                              <div className="overflow-x-auto">
                                  <table className="w-full text-center text-sm whitespace-nowrap">
                                      <thead>
                                          <tr className="bg-[#1e40af] text-white font-bold uppercase text-xs tracking-wider">
                                              <th className="p-4 text-left pl-6">ประเภทหวย</th>
                                              <th className="p-4 w-32">งวดหวย</th>
                                              <th className="p-4 w-24">3 ตัวบน</th>
                                              <th className="p-4 w-24">2 ตัวบน</th>
                                              <th className="p-4 w-24">2 ตัวล่าง</th>
                                              <th className="p-4 w-24 pr-6">คัดลอกผล</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 font-mono font-medium text-slate-600">
                                          {group.items.map((lotto: any) => {
                                              const result = resultsMap[lotto.id];
                                              // (Logic นี้จริง ๆ ไม่จำเป็นแล้วเพราะเรากรองตั้งแต่แรก แต่ใส่ไว้เพื่อ type safety)
                                              if (!result) return null; 

                                              const top3 = result.top_3;
                                              const bottom2 = result.bottom_2;
                                              const top2 = getTop2(top3);

                                              return (
                                                  <tr key={lotto.id} className="hover:bg-slate-50 transition-colors">
                                                      <td className="p-4 text-left pl-6 font-sans">
                                                          <div className="font-bold text-slate-800">{lotto.name}</div>
                                                          <div className="text-[10px] text-slate-400 mt-0.5 font-normal">ปิด {lotto.close_time?.substring(0,5)}</div>
                                                      </td>
                                                      <td className="p-4 text-slate-400 text-xs font-sans">
                                                          {formatDateDisplay(selectedDate)}
                                                      </td>
                                                      <td className="p-4">
                                                          <span className="text-slate-800 font-bold text-lg">{top3}</span>
                                                      </td>
                                                      <td className="p-4">
                                                          <span className="text-slate-800 font-bold text-lg">{top2}</span>
                                                      </td>
                                                      <td className="p-4">
                                                          <span className="text-blue-600 font-bold text-lg">{bottom2}</span>
                                                      </td>
                                                      <td className="p-4 pr-6">
                                                          <button 
                                                              onClick={() => handleCopy(lotto.name, top3, bottom2)}
                                                              className="bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 w-full font-sans"
                                                          >
                                                              <Copy size={14} /> คัดลอก
                                                          </button>
                                                      </td>
                                                  </tr>
                                              );
                                          })}
                                      </tbody>
                                  </table>
                              </div>
                          </div>
                      </div>
                  ))
              ) : (
                  // State ว่าง (ยังไม่มีผลรางวัลออก)
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl bg-white/50">
                      <Search size={48} className="mb-4 opacity-20" />
                      <p className="font-medium text-lg text-slate-600">ยังไม่มีผลรางวัล</p>
                      <p className="text-sm mt-1 text-slate-400">รายการจะปรากฏเมื่อมีการประกาศผลของวันที่เลือก</p>
                  </div>
              )
          )}

      </div>
    </div>
  );
}