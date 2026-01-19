import { useState, useEffect, useRef } from 'react';
import client from '../../api/client';
import { 
  X, Trophy, Calendar, 
  CheckCircle, Clock, Loader2, Edit3, 
  AlertCircle, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ManageResults() {
  const [lottos, setLottos] = useState<any[]>([]);
  const [resultsMap, setResultsMap] = useState<any>({}); 
  const [selectedLotto, setSelectedLotto] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // State สำหรับ Modal
  const [top3, setTop3] = useState('');
  const [bottom2, setBottom2] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterDate, setFilterDate] = useState('today'); 

  // Refs สำหรับ Auto Focus
  const topInputRef = useRef<HTMLInputElement>(null);
  const bottomInputRef = useRef<HTMLInputElement>(null);

  const getDateParams = () => {
      const d = new Date();
      if (filterDate === 'yesterday') d.setDate(d.getDate() - 1);
      return {
          display: d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' }),
          full_display: d.toLocaleDateString('th-TH', { weekday:'long', day: '2-digit', month: 'long', year: 'numeric' }),
          api: d.toISOString().split('T')[0] 
      };
  };

  useEffect(() => {
    fetchData();
  }, [filterDate]);

  // Focus Input เมื่อเปิด Modal
  useEffect(() => {
      if (selectedLotto) {
          setTimeout(() => topInputRef.current?.focus(), 100);
      }
  }, [selectedLotto]);

  const fetchData = async () => {
      setIsLoading(true);
      try {
        const dateStr = getDateParams().api;
        const [resLottos, resResults] = await Promise.all([
            client.get('/play/lottos'),
            client.get(`/reward/daily?date=${dateStr}`)
        ]);
        
        // ✅ 1. เรียงลำดับหวยตามเวลาปิด (เช้า -> ดึก)
        const sortedLottos = resLottos.data.sort((a: any, b: any) => {
            if (!a.close_time) return 1;
            if (!b.close_time) return -1;
            return a.close_time.localeCompare(b.close_time);
        });

        setLottos(sortedLottos);
        setResultsMap(resResults.data || {}); 
        
      } catch (err) {
          console.error(err);
      } finally {
          setIsLoading(false);
      }
  };

  const handleOpenModal = (lotto: any) => {
    const existingResult = resultsMap[lotto.id];
    setSelectedLotto(lotto);
    if (existingResult) {
        setTop3(existingResult.top_3);
        setBottom2(existingResult.bottom_2);
    } else {
        setTop3('');
        setBottom2('');
    }
  };

  // ✅ Auto Focus Logic: พิมพ์ครบ 3 ตัวบน เด้งไป 2 ตัวล่าง
  const handleTopChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 3);
      setTop3(val);
      if (val.length === 3) {
          bottomInputRef.current?.focus();
      }
  };

  const handleSubmitReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLotto) return;
    
    if (top3.length !== 3 || bottom2.length !== 2) {
        toast.error("กรุณากรอกเลขให้ครบ (3 ตัวบน และ 2 ตัวล่าง)");
        return;
    }

    const isEdit = !!resultsMap[selectedLotto.id];
    
    if (!confirm(isEdit ? `⚠️ ยืนยันแก้ไขผลรางวัล?` : `ยืนยันบันทึกผลรางวัล?`)) return;

    setIsSubmitting(true);
    try {
      await client.post('/reward/issue', {
        lotto_type_id: selectedLotto.id,
        top_3: top3,
        bottom_2: bottom2,
        date: getDateParams().api 
      });
      
      toast.success(isEdit ? 'แก้ไขเรียบร้อย' : 'บันทึกเรียบร้อย');
      setSelectedLotto(null);
      fetchData(); 
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'เกิดข้อผิดพลาด');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in p-4 md:p-8 max-w-7xl mx-auto pb-24">
      
      {/* --- Header Section --- */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
        <div>
           <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
              <span className="w-10 h-10 rounded-xl bg-linear-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-200">
                  <Trophy size={20} className="drop-shadow-sm" />
              </span>
              ออกผลรางวัล
           </h2>
           <p className="text-slate-500 mt-2 font-medium flex items-center gap-2">
              <Calendar size={14}/> ประจำงวดวันที่ <span className="text-slate-800 font-bold border-b-2 border-amber-200">{getDateParams().full_display}</span>
           </p>
        </div>

        {/* Date Filter Toggle */}
        <div className="bg-slate-100 p-1 rounded-xl flex items-center w-full lg:w-auto shadow-inner">
            <button 
                onClick={() => setFilterDate('today')}
                className={`flex-1 lg:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                    filterDate === 'today' 
                    ? 'bg-white text-slate-800 shadow-sm ring-1 ring-black/5' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
            >
                วันนี้
            </button>
            <button 
                onClick={() => setFilterDate('yesterday')}
                className={`flex-1 lg:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                    filterDate === 'yesterday' 
                    ? 'bg-white text-slate-800 shadow-sm ring-1 ring-black/5' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
            >
                เมื่อวาน
            </button>
        </div>
      </div>

      {/* --- Loading State --- */}
      {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
              <Loader2 className="animate-spin text-amber-500" size={40} />
              <span className="text-sm font-medium">กำลังโหลดข้อมูล...</span>
          </div>
      ) : (
        <>
            {/* --- Desktop Table View --- */}
            <div className="hidden lg:block bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-xs tracking-wider">
                    <tr>
                    <th className="p-5 pl-8">รายการหวย</th>
                    <th className="p-5 text-center">เวลาปิดรับ</th>
                    <th className="p-5 text-center">สถานะ</th>
                    <th className="p-5 text-center">ผลรางวัล (บน / ล่าง)</th>
                    <th className="p-5 text-center pr-8">จัดการ</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                    {lottos.map((lotto) => {
                    const result = resultsMap[lotto.id]; 
                    return (
                        <tr key={lotto.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="p-5 pl-8">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                                    {lotto.img_url ? (
                                        <img src={lotto.img_url} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-xs font-bold text-slate-400">{lotto.code.substring(0,2)}</span>
                                    )}
                                </div>
                                <div>
                                    <div className="font-bold text-slate-800 text-base">{lotto.name}</div>
                                    <div className="text-[10px] text-slate-400 font-mono">{lotto.code}</div>
                                </div>
                            </div>
                        </td>
                        <td className="p-5 text-center">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-600 font-mono font-bold text-xs">
                                <Clock size={12} /> {lotto.close_time?.substring(0,5)}
                            </div>
                        </td>
                        <td className="p-5 text-center">
                            {result ? (
                                <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200/50">
                                    <CheckCircle size={12} /> ออกผลแล้ว
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-400 px-3 py-1 rounded-full text-xs font-bold border border-slate-200">
                                    รอออกผล
                                </span>
                            )}
                        </td>
                        <td className="p-5 text-center">
                            {result ? (
                                <div className="flex justify-center items-center gap-3">
                                    <div className="flex flex-col items-center">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">3 บน</span>
                                        <span className="font-mono font-black text-lg text-slate-800 tracking-wider bg-slate-100 px-2 rounded">{result.top_3}</span>
                                    </div>
                                    <div className="w-px h-8 bg-slate-200"></div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">2 ล่าง</span>
                                        <span className="font-mono font-black text-lg text-slate-800 tracking-wider bg-slate-100 px-2 rounded">{result.bottom_2}</span>
                                    </div>
                                </div>
                            ) : (
                                <span className="text-slate-300 text-2xl font-black tracking-widest opacity-20">--</span>
                            )}
                        </td>
                        <td className="p-5 text-center pr-8">
                            <button 
                            onClick={() => handleOpenModal(lotto)}
                            className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2 mx-auto w-32 ${
                                result 
                                ? 'bg-white border border-slate-200 text-slate-500 hover:text-amber-600 hover:border-amber-200' 
                                : 'bg-slate-800 text-white hover:bg-black shadow-lg shadow-slate-200'
                            }`}
                            >
                            {result ? <><Edit3 size={14} /> แก้ไข</> : <><Trophy size={14} className="text-amber-400" /> ใส่ผล</>}
                            </button>
                        </td>
                        </tr>
                    );
                    })}
                </tbody>
                </table>
                {lottos.length === 0 && (
                    <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                        <AlertCircle size={48} className="mb-4 opacity-20"/>
                        <p>ไม่มีรายการหวยสำหรับวันนี้</p>
                    </div>
                )}
            </div>

            {/* --- Mobile Card View --- */}
            <div className="lg:hidden grid grid-cols-1 gap-4">
                {lottos.map((lotto) => {
                    const result = resultsMap[lotto.id];
                    return (
                        <div key={lotto.id} className="bg-white rounded-3xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
                            {/* Header Card */}
                            <div className="flex justify-between items-start mb-5">
                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold shadow-inner ${result ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                                        {lotto.img_url ? <img src={lotto.img_url} className="w-full h-full object-cover rounded-2xl"/> : lotto.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-800 leading-tight">{lotto.name}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono border border-slate-200">
                                                {lotto.close_time?.substring(0,5)} น.
                                            </span>
                                            {result && <span className="text-[10px] text-green-600 font-bold flex items-center gap-1"><CheckCircle size={10}/> ออกผลแล้ว</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Result Display */}
                            {result ? (
                                <div className="bg-slate-50 rounded-2xl p-4 mb-5 border border-slate-200 flex justify-around items-center relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                                    <div className="text-center z-10">
                                        <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">3 ตัวบน</div>
                                        <div className="text-3xl font-black text-slate-800 tracking-widest">{result.top_3}</div>
                                    </div>
                                    <div className="w-px h-10 bg-slate-200 z-10"></div>
                                    <div className="text-center z-10">
                                        <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">2 ตัวล่าง</div>
                                        <div className="text-3xl font-black text-slate-800 tracking-widest">{result.bottom_2}</div>
                                    </div>
                                </div>
                            ) : (
                                <div className="mb-5 p-4 rounded-2xl border-2 border-dashed border-slate-100 text-center">
                                    <p className="text-xs text-slate-400 font-bold">รอการออกผลรางวัล</p>
                                </div>
                            )}

                            <button 
                                onClick={() => handleOpenModal(lotto)}
                                className={`w-full py-3.5 rounded-2xl font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 ${
                                    result 
                                    ? 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50' 
                                    : 'bg-slate-900 text-white hover:bg-black shadow-slate-300'
                                }`}
                            >
                                {result ? <><Edit3 size={18} /> แก้ไขผลรางวัล</> : <><Trophy size={18} className="text-amber-400" /> บันทึกผลรางวัล</>}
                            </button>
                        </div>
                    );
                })}
                {lottos.length === 0 && (
                    <div className="text-center py-12 text-slate-400">ยังไม่มีรายการหวย</div>
                )}
            </div>
        </>
      )}

      {/* --- Modal ใส่ผล (Clean Design) --- */}
      {selectedLotto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-4xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 relative ring-1 ring-white/20">
            
            {/* Modal Header */}
            <div className={`p-8 pb-6 text-white text-center relative overflow-hidden ${resultsMap[selectedLotto.id] ? 'bg-slate-800' : 'bg-linear-to-br from-amber-400 to-orange-600'}`}>
                {/* Decoration Circles */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10"></div>
                
                <h3 className="text-2xl font-black tracking-tight relative z-10">{selectedLotto.name}</h3>
                <p className="text-white/80 text-xs mt-1 font-medium relative z-10 uppercase tracking-wider">
                    {resultsMap[selectedLotto.id] ? 'แก้ไขผลรางวัล' : `งวดวันที่ ${getDateParams().display}`}
                </p>
                <button 
                    onClick={() => setSelectedLotto(null)} 
                    className="absolute top-4 right-4 text-white/60 hover:text-white bg-black/10 hover:bg-black/20 rounded-full p-1.5 transition-colors z-20"
                >
                    <X size={20} />
                </button>
            </div>
            
            <form onSubmit={handleSubmitReward} className="p-6 pt-8 space-y-8 bg-white">
              <div className="space-y-6">
                  {/* Input 3 บน */}
                  <div className="relative group">
                      <label className="absolute -top-3 left-4 bg-white px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider group-focus-within:text-amber-500 transition-colors">
                          เลข 3 ตัวบน
                      </label>
                      <input 
                        ref={topInputRef}
                        type="tel" 
                        value={top3}
                        onChange={handleTopChange}
                        maxLength={3}
                        className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 text-5xl text-center font-black tracking-[0.3em] text-slate-800 focus:border-amber-500 focus:ring-4 focus:ring-amber-100 outline-none transition-all placeholder-slate-200"
                        placeholder="---"
                      />
                  </div>

                  {/* Arrow Indicator */}
                  <div className="flex justify-center -my-2 text-slate-300">
                      <ArrowRight className="rotate-90" size={20}/>
                  </div>

                  {/* Input 2 ล่าง */}
                  <div className="relative group">
                      <label className="absolute -top-3 left-4 bg-white px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider group-focus-within:text-amber-500 transition-colors">
                          เลข 2 ตัวล่าง
                      </label>
                      <input 
                        ref={bottomInputRef}
                        type="tel" 
                        value={bottom2}
                        onChange={e => setBottom2(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
                        maxLength={2}
                        className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 text-5xl text-center font-black tracking-[0.3em] text-slate-800 focus:border-amber-500 focus:ring-4 focus:ring-amber-100 outline-none transition-all placeholder-slate-200"
                        placeholder="--"
                      />
                  </div>
              </div>

              <div className="pt-2 grid grid-cols-2 gap-3">
                  <button 
                    type="button"
                    onClick={() => setSelectedLotto(null)}
                    className="py-4 rounded-xl font-bold text-sm text-slate-500 bg-slate-100 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className={`py-4 text-white rounded-xl font-bold text-sm shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed ${
                        resultsMap[selectedLotto.id] ? 'bg-slate-800 hover:bg-black' : 'bg-linear-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700'
                    }`}
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <CheckCircle size={18} />} 
                    {resultsMap[selectedLotto.id] ? 'บันทึกแก้ไข' : 'ยืนยันผล'}
                  </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}