import { useEffect, useState, useMemo } from 'react';
import client from '../../api/client';
import { 
  Calendar, Trophy, Copy, 
  ChevronLeft, ChevronRight, Loader2, Search,
  ShieldAlert
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function MemberResults() {
  const [lottos, setLottos] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [resultsMap, setResultsMap] = useState<any>({});
  
  // ✅ เก็บข้อมูลความเสี่ยงแบบกลุ่ม { lotto_id: [RiskItems...] }
  const [risksMap, setRisksMap] = useState<Record<string, any[]>>({}); 

  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    setRisksMap({}); 
    try {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      // ✅ ยิง 4 API พร้อมกัน (เพิ่ม Risks เข้ามา)
      const [resLottos, resCats, resResults, resRisks] = await Promise.all([
        client.get('/play/lottos'),
        client.get('/play/categories'),
        client.get(`/reward/daily?date=${dateStr}`),
        client.get(`/play/risks/daily/all?date=${dateStr}`) // ✅ API ใหม่
      ]);

      const activeLottos = resLottos.data.filter((l: any) => l.is_active);
      setLottos(activeLottos);
      setCategories(resCats.data);
      setResultsMap(resResults.data || {});
      setRisksMap(resRisks.data || {}); // ✅ เก็บข้อมูลเลขอั้นลง State

    } catch (err) {
      console.error("Error fetching results:", err);
      toast.error("โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('คัดลอกเรียบร้อย');
  };

  // ✅ Logic เช็คเลขอั้น (ทำงานสมบูรณ์แล้ว)
  const getNumberClass = (lottoId: string, number: string, type: '3top' | '2down' | '2up') => {
      // ถ้าไม่มีเลข หรือไม่มีข้อมูลอั้น ให้กลับเป็นสีปกติ
      if (!number || !risksMap[lottoId]) return "text-slate-700";

      const risks = risksMap[lottoId];
      
      // หาว่าเลขนี้โดนอั้นไหม (เช็คทั้งแบบระบุประเภท และแบบเหมา ALL)
      const riskItem = risks.find((r: any) => 
          r.number === number && (r.specific_bet_type === type || r.specific_bet_type === 'ALL')
      );

      if (riskItem) {
          if (riskItem.risk_type === 'CLOSE') return "text-red-600 drop-shadow-sm font-black"; // เลขปิด (แดง)
          if (riskItem.risk_type === 'HALF') return "text-orange-500 drop-shadow-sm font-black"; // จ่ายครึ่ง (ส้ม)
      }
      return "text-slate-700"; 
  };

  const groupedLottos = useMemo(() => {
    if (!lottos.length || !categories.length) return [];
    
    const sortedCats = [...categories].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    
    const groups = sortedCats.map(cat => ({
      ...cat,
      lottos: lottos
        .filter(l => l.category === cat.id && resultsMap[l.id]) 
        .sort((a, b) => {
           if (!a.close_time) return 1;
           if (!b.close_time) return -1;
           return a.close_time.localeCompare(b.close_time);
        })
    })).filter(group => group.lottos.length > 0);

    const uncategorized = lottos.filter(l => !l.category && resultsMap[l.id]);
    if (uncategorized.length > 0) {
        groups.push({ id: 'other', label: 'อื่นๆ', color: 'bg-gray-500', lottos: uncategorized } as any);
    }

    return groups;

  }, [lottos, categories, resultsMap]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('th-TH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="animate-fade-in pb-20 bg-gray-50 min-h-screen font-sans">
      
      {/* --- Header --- */}
      <div className="bg-white sticky top-0 z-20 shadow-sm border-b border-gray-200">
          <div className="max-w-5xl mx-auto px-4 py-3">
              <div className="flex justify-between items-center mb-4">
                  <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
                      <Trophy className="text-amber-500" /> ผลรางวัล
                  </h1>
                  <button 
                    onClick={() => setSelectedDate(new Date())}
                    className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors"
                  >
                      วันนี้
                  </button>
              </div>

              <div className="flex items-center justify-between bg-slate-100 p-1 rounded-xl">
                  <button onClick={() => handleDateChange(-1)} className="p-2 hover:bg-white rounded-lg transition-all text-slate-500 hover:text-slate-800 shadow-sm">
                      <ChevronLeft size={20} />
                  </button>
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                      <Calendar size={16} className="text-blue-500" />
                      {formatDate(selectedDate)}
                  </div>
                  <button onClick={() => handleDateChange(1)} className="p-2 hover:bg-white rounded-lg transition-all text-slate-500 hover:text-slate-800 shadow-sm">
                      <ChevronRight size={20} />
                  </button>
              </div>
          </div>
      </div>

      {/* --- Content --- */}
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
          
          {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <Loader2 size={40} className="animate-spin mb-4 text-blue-500" />
                  <p className="font-medium animate-pulse">กำลังโหลดผลรางวัล...</p>
              </div>
          ) : (
              Object.keys(resultsMap).length > 0 && groupedLottos.length > 0 ? (
                  groupedLottos.map((cat) => (
                      <div key={cat.id} className="animate-slide-up">
                          <div className="flex items-center gap-2 mb-3 px-2">
                              <span className={`w-2 h-2 rounded-full ${cat.color?.replace('bg-', 'bg-') || 'bg-blue-500'}`}></span>
                              <h2 className="font-bold text-slate-500 text-sm uppercase tracking-wider">{cat.label}</h2>
                          </div>

                          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                              <div className="overflow-x-auto">
                                  <table className="w-full text-sm text-left">
                                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 uppercase text-xs">
                                          <tr>
                                              <th className="p-4 pl-6">หวย</th>
                                              <th className="p-4 text-center">งวดวันที่</th>
                                              <th className="p-4 text-center">3 ตัวบน</th>
                                              <th className="p-4 text-center">2 ตัวบน</th>
                                              <th className="p-4 text-center">2 ตัวล่าง</th>
                                              <th className="p-4 text-center w-20">คัดลอก</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                          {cat.lottos.map((lotto: any) => {
                                              const result = resultsMap[lotto.id];
                                              const twoTop = result.top_3 ? result.top_3.slice(-2) : '';

                                              // ✅ เรียกใช้ Helper Function เพื่อเปลี่ยนสี
                                              const top3Class = getNumberClass(lotto.id, result.top_3, '3top');
                                              const top2Class = getNumberClass(lotto.id, twoTop, '2up'); 
                                              const bottomClass = getNumberClass(lotto.id, result.bottom_2, '2down');

                                              return (
                                                  <tr key={lotto.id} className="hover:bg-slate-50 transition-colors">
                                                      <td className="p-4 pl-6">
                                                          <div className="flex items-center gap-3">
                                                              <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 font-bold overflow-hidden shadow-inner shrink-0">
                                                                  {lotto.img_url ? <img src={lotto.img_url} className="w-full h-full object-cover"/> : <Trophy size={18} className="text-yellow-500"/>}
                                                              </div>
                                                              <div>
                                                                  <div className="font-bold text-slate-800">{lotto.name}</div>
                                                                  <div className="text-[10px] text-slate-400 font-mono">
                                                                    ประกาศ: {new Date(result.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute:'2-digit' })} น.
                                                                  </div>
                                                              </div>
                                                          </div>
                                                      </td>

                                                      <td className="p-4 text-center">
                                                          <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-mono font-bold text-xs border border-slate-200">
                                                              {new Date(result.created_at).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                                          </span>
                                                      </td>
                                                      
                                                      <td className="p-4 text-center">
                                                          <div className={`text-xl font-bold tracking-widest relative inline-block ${top3Class}`}>
                                                              {result.top_3 || '-'}
                                                              {(top3Class.includes('red') || top3Class.includes('orange')) && (
                                                                  <ShieldAlert size={10} className="absolute -top-1 -right-2 text-current opacity-50"/>
                                                              )}
                                                          </div>
                                                      </td>

                                                      <td className="p-4 text-center">
                                                          <div className={`text-xl font-bold tracking-widest relative inline-block ${top2Class}`}>
                                                              {twoTop || '-'}
                                                              {(top2Class.includes('red') || top2Class.includes('orange')) && (
                                                                  <ShieldAlert size={10} className="absolute -top-1 -right-2 text-current opacity-50"/>
                                                              )}
                                                          </div>
                                                      </td>

                                                      <td className="p-4 text-center">
                                                          <div className={`text-xl font-bold tracking-widest relative inline-block ${bottomClass}`}>
                                                              {result.bottom_2 || '-'}
                                                              {(bottomClass.includes('red') || bottomClass.includes('orange')) && (
                                                                  <ShieldAlert size={10} className="absolute -top-1 -right-2 text-current opacity-50"/>
                                                              )}
                                                          </div>
                                                      </td>
                                                      
                                                      <td className="p-4 text-center">
                                                          <button 
                                                            onClick={() => handleCopy(`${lotto.name}\nงวด: ${new Date(result.created_at).toLocaleDateString('th-TH')}\nบน: ${result.top_3}\nล่าง: ${result.bottom_2}`)}
                                                            className="bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 w-full"
                                                          >
                                                              <Copy size={14} />
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