import { useState, useEffect } from 'react';
import client from '../../api/client';
import { 
  X, Trophy, Calendar, 
  CheckCircle, Clock, Loader2, Edit3 
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ManageResults() {
  const [lottos, setLottos] = useState<any[]>([]);
  const [resultsMap, setResultsMap] = useState<any>({}); // ✅ เก็บผลรางวัลที่ดึงมา
  const [selectedLotto, setSelectedLotto] = useState<any>(null);
  
  // State สำหรับ Modal
  const [top3, setTop3] = useState('');
  const [bottom2, setBottom2] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterDate, setFilterDate] = useState('today'); // today, yesterday

  // Helper: แปลงวันที่สำหรับ API และ Display
  const getDateParams = () => {
      const d = new Date();
      if (filterDate === 'yesterday') d.setDate(d.getDate() - 1);
      return {
          display: d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }),
          api: d.toISOString().split('T')[0] // YYYY-MM-DD
      };
  };

  useEffect(() => {
    fetchData();
  }, [filterDate]);

  const fetchData = async () => {
      try {
        const dateStr = getDateParams().api;
        
        // 1. ดึงรายการหวย
        const resLottos = await client.get('/play/lottos');
        
        // 2. ดึงผลรางวัลของวันที่เลือก (ต้องมี API นี้ตามข้อ 1)
        const resResults = await client.get(`/reward/daily?date=${dateStr}`);
        
        setLottos(resLottos.data);
        setResultsMap(resResults.data || {}); // เก็บผลรางวัลลง Map
        
      } catch (err) {
          console.error(err);
          // toast.error('โหลดข้อมูลไม่สำเร็จ');
      }
  };

  const handleOpenModal = (lotto: any) => {
    const existingResult = resultsMap[lotto.id];
    
    setSelectedLotto(lotto);
    // ถ้ามีผลอยู่แล้ว ให้ดึงมาใส่ (Mode แก้ไข)
    if (existingResult) {
        setTop3(existingResult.top_3);
        setBottom2(existingResult.bottom_2);
    } else {
        setTop3('');
        setBottom2('');
    }
  };

  const handleSubmitReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLotto) return;
    
    // Validate length
    if (top3.length !== 3 || bottom2.length !== 2) {
        toast.error("กรุณากรอกเลขให้ครบ (3 ตัวบน และ 2 ตัวล่าง)");
        return;
    }

    const isEdit = !!resultsMap[selectedLotto.id];
    const confirmMsg = isEdit 
        ? `⚠️ แก้ไขผลรางวัล ${selectedLotto.name}?\nค่าเดิมจะถูกเปลี่ยนเป็น:\nบน: ${top3} | ล่าง: ${bottom2}`
        : `ยืนยันผลรางวัล ${selectedLotto.name}?\n3 ตัวบน: ${top3}\n2 ตัวล่าง: ${bottom2}`;

    if (!confirm(confirmMsg)) return;

    setIsSubmitting(true);
    try {
      await client.post('/reward/issue', {
        lotto_type_id: selectedLotto.id,
        top_3: top3,
        bottom_2: bottom2,
        date: getDateParams().api // ส่งวันที่ไปด้วยเพื่อให้ชัวร์
      });
      
      toast.success(isEdit ? 'แก้ไขผลรางวัลเรียบร้อย' : 'บันทึกผลรางวัลเรียบร้อย');
      setSelectedLotto(null);
      fetchData(); // Refresh Data เพื่ออัปเดตสถานะ
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'เกิดข้อผิดพลาด');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in p-4 md:p-6 pb-24 md:pb-8">
      
      {/* --- Header & Filter --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
           <h2 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2 tracking-tight">
              <div className="p-2 bg-amber-500 rounded-lg text-white shadow-lg shadow-amber-200">
                  <Trophy size={24} />
              </div>
              ออกผลรางวัล
           </h2>
           <p className="text-sm text-slate-500 mt-1 ml-1">จัดการผลรางวัลประจำงวด {getDateParams().display}</p>
        </div>

        {/* Date Filters */}
        <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex items-center w-full md:w-auto">
            <button 
                onClick={() => setFilterDate('today')}
                className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                    filterDate === 'today' ? 'bg-amber-100 text-amber-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                }`}
            >
                <Calendar size={16} /> วันนี้
            </button>
            <div className="w-px h-6 bg-slate-200 mx-1"></div>
            <button 
                onClick={() => setFilterDate('yesterday')}
                className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                    filterDate === 'yesterday' ? 'bg-amber-100 text-amber-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                }`}
            >
                <Calendar size={16} /> เมื่อวาน
            </button>
        </div>
      </div>

      {/* --- Desktop Table View --- */}
      <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-xs tracking-wider">
            <tr>
              <th className="p-5">รายการหวย</th>
              <th className="p-5 text-center">เวลาปิดรับ</th>
              <th className="p-5 text-center">สถานะ</th>
              <th className="p-5 text-center w-48">ผลรางวัล</th>
              <th className="p-5 text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {lottos.map((lotto) => {
              const result = resultsMap[lotto.id]; // ✅ เช็คว่ามีผลหรือยัง
              return (
                <tr key={lotto.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-5">
                      <div className="font-bold text-slate-800 text-base">{lotto.name}</div>
                  </td>
                  <td className="p-5 text-center font-mono text-slate-500">
                      {lotto.close_time?.substring(0,5) || '-'} น.
                  </td>
                  <td className="p-5 text-center">
                      {result ? (
                        <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200">
                            <CheckCircle size={12} /> ออกผลแล้ว
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-xs font-bold border border-slate-200">
                            <Clock size={12} /> รอออกผล
                        </span>
                      )}
                  </td>
                  <td className="p-5 text-center">
                      {result ? (
                          <div className="flex justify-center gap-2 font-mono font-bold">
                              <span className="bg-slate-800 text-white px-2 py-1 rounded text-sm" title="3 ตัวบน">{result.top_3}</span>
                              <span className="bg-slate-200 text-slate-700 px-2 py-1 rounded text-sm" title="2 ตัวล่าง">{result.bottom_2}</span>
                          </div>
                      ) : (
                          <span className="text-slate-300">-</span>
                      )}
                  </td>
                  <td className="p-5 text-center">
                    <button 
                      onClick={() => handleOpenModal(lotto)}
                      className={`px-4 py-2 rounded-xl font-bold text-sm shadow-sm transition-all active:scale-95 flex items-center gap-2 mx-auto ${
                          result 
                          ? 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-amber-600' 
                          : 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-200'
                      }`}
                    >
                      {result ? <><Edit3 size={16} /> แก้ไข</> : <><Trophy size={16} /> ใส่ผล</>}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* --- Mobile Card View --- */}
      <div className="md:hidden grid grid-cols-1 gap-4">
          {lottos.map((lotto) => {
              const result = resultsMap[lotto.id];
              return (
                <div key={lotto.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold shadow-sm ${result ? 'bg-green-100 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                                {lotto.name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-slate-800">{lotto.name}</h3>
                                <p className="text-xs text-slate-500 flex items-center gap-1">
                                    <Clock size={12} /> ปิดรับ: {lotto.close_time?.substring(0,5)} น.
                                </p>
                            </div>
                        </div>
                        {result && <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg border border-green-100">Success</span>}
                    </div>

                    {/* แสดงผลรางวัลถ้ามี */}
                    {result && (
                        <div className="bg-slate-50 rounded-xl p-3 mb-4 border border-slate-200 flex justify-between items-center px-6">
                            <div className="text-center">
                                <div className="text-[10px] text-slate-400 font-bold uppercase">3 บน</div>
                                <div className="text-xl font-black text-slate-800 tracking-widest">{result.top_3}</div>
                            </div>
                            <div className="w-px h-8 bg-slate-200"></div>
                            <div className="text-center">
                                <div className="text-[10px] text-slate-400 font-bold uppercase">2 ล่าง</div>
                                <div className="text-xl font-black text-slate-800 tracking-widest">{result.bottom_2}</div>
                            </div>
                        </div>
                    )}

                    <button 
                        onClick={() => handleOpenModal(lotto)}
                        className={`w-full py-3 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${
                            result 
                            ? 'bg-white border-2 border-slate-100 text-slate-500 hover:text-amber-600 hover:border-amber-100' 
                            : 'bg-slate-800 text-white hover:bg-black'
                        }`}
                    >
                        {result ? <><Edit3 size={18} /> แก้ไขผลรางวัล</> : <><Trophy size={18} className="text-amber-400" /> ใส่ผลรางวัล</>}
                    </button>
                </div>
              );
          })}
      </div>

      {/* --- Modal ใส่ผล (Responsive) --- */}
      {selectedLotto && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 relative">
            
            {/* Modal Header */}
            <div className={`p-6 pb-4 text-white text-center relative overflow-hidden ${resultsMap[selectedLotto.id] ? 'bg-slate-800' : 'bg-linear-to-r from-amber-400 to-orange-500'}`}>
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                <h3 className="text-xl font-black tracking-tight">{selectedLotto.name}</h3>
                <p className="text-white/80 text-xs mt-1 font-medium">
                    {resultsMap[selectedLotto.id] ? 'แก้ไขผลรางวัลเดิม' : `งวดวันที่ ${getDateParams().display}`}
                </p>
                <button 
                    onClick={() => setSelectedLotto(null)} 
                    className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/10 hover:bg-black/20 rounded-full p-1 transition-colors"
                >
                    <X size={20} />
                </button>
            </div>
            
            <form onSubmit={handleSubmitReward} className="p-6 space-y-6">
              <div className="space-y-4">
                  <div className="text-center">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">เลข 3 ตัวบน</label>
                      <input 
                        type="text" 
                        value={top3}
                        onChange={e => setTop3(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
                        maxLength={3}
                        className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 text-4xl text-center font-black tracking-[0.5em] text-slate-800 focus:border-amber-500 focus:ring-4 focus:ring-amber-100 outline-none transition-all placeholder-slate-200"
                        placeholder="---"
                        autoFocus
                      />
                  </div>

                  <div className="text-center">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">เลข 2 ตัวล่าง</label>
                      <input 
                        type="text" 
                        value={bottom2}
                        onChange={e => setBottom2(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
                        maxLength={2}
                        className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 text-4xl text-center font-black tracking-[0.5em] text-slate-800 focus:border-amber-500 focus:ring-4 focus:ring-amber-100 outline-none transition-all placeholder-slate-200"
                        placeholder="--"
                      />
                  </div>
              </div>

              <div className="pt-2">
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className={`w-full py-4 text-white rounded-2xl font-bold text-lg shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed ${
                        resultsMap[selectedLotto.id] ? 'bg-slate-700 hover:bg-slate-800 shadow-slate-300' : 'bg-amber-500 hover:bg-amber-600 shadow-amber-200'
                    }`}
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <CheckCircle size={20} />} 
                    {resultsMap[selectedLotto.id] ? 'บันทึกการแก้ไข' : 'ยืนยันผลรางวัล'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setSelectedLotto(null)}
                    className="w-full py-3 mt-3 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors"
                  >
                    ยกเลิก
                  </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}