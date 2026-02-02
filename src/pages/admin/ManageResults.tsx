import { useState, useEffect, useRef, memo } from 'react';
import client from '../../api/client';
import { 
  X, Trophy, Calendar, 
  CheckCircle, Clock, Loader2, Edit3, 
  AlertCircle, Search, Ban
} from 'lucide-react';
import toast from 'react-hot-toast';
import { alertAction, confirmAction } from '../../utils/toastUtils';

// --- Helper Functions ---
const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    const dateObj = new Date(+y, +m - 1, +d);
    return dateObj.toLocaleDateString('th-TH', { 
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' 
    });
};

// --- Sub-Component: Modal บันทึกผล ---
const ResultModal = memo(({ lotto, existingResult, dateStr, onClose, onSuccess }: any) => {
    const [top3, setTop3] = useState('');
    const [bottom2, setBottom2] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // โหลดข้อมูลเดิมถ้ามี (รองรับทั้ง key ใหม่ top_3 และ key เก่า reward_data)
    useEffect(() => {
        if (existingResult) {
            setTop3(existingResult.top_3 || existingResult.reward_data?.top || '');
            setBottom2(existingResult.bottom_2 || existingResult.reward_data?.bottom || '');
        }
    }, [existingResult]);

    const handleConfirmSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validation
        if (top3.length !== 3) return toast.error('3 ตัวบน ต้องมี 3 หลัก');
        if (bottom2.length !== 2) return toast.error('2 ตัวล่าง ต้องมี 2 หลัก');

        // ✅ ใช้ confirmAction แบบใหม่
        confirmAction(
            `ยืนยันผลรางวัล: บน ${top3} | ล่าง ${bottom2} ?\n(ระบบจะคำนวณเงินรางวัลใหม่อัตโนมัติ)`,
            () => submitData(),
            'ยืนยันบันทึก',
            'ยกเลิก'
        );
    };

    const submitData = async () => {
        setIsSubmitting(true);
        const toastId = toast.loading('กำลังประมวลผลรางวัล...');
        try {
            const payload = {
                lotto_type_id: lotto.id,
                round_date: dateStr,
                top_3: top3,
                bottom_2: bottom2
            };

            const res = await client.post('/reward/issue', payload);
            toast.dismiss(toastId);

            if (res.data.success) {
                const { total_winners, total_payout, total_tickets_processed } = res.data;
                
                // ✅ ใช้ alertAction แบบใหม่ แสดงสรุปผล
                alertAction(
                    `ตรวจโพยเสร็จสิ้น ${total_tickets_processed} ใบ\n\n🎉 ถูกรางวัล: ${total_winners} รายการ\n💰 จ่ายเงินรวม: ${Number(total_payout).toLocaleString()} บาท`,
                    'บันทึกสำเร็จ!',
                    'success',
                    'ตกลง',
                    () => {
                        onSuccess();
                        onClose();
                    }
                );
            } else {
                toast.success('บันทึกผลเรียบร้อย');
                onSuccess();
                onClose();
            }

        } catch (err: any) {
            console.error(err);
            toast.dismiss(toastId);
            toast.error(err.response?.data?.detail || 'บันทึกไม่สำเร็จ');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
                
                {/* Modal Header */}
                <div className="bg-slate-900 px-6 py-4 flex justify-between items-center">
                    <h3 className="text-white font-bold text-lg flex items-center gap-2">
                        <Trophy className="text-amber-400" /> 
                        {existingResult ? 'แก้ไขผลรางวัล' : 'บันทึกผลรางวัล'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6">
                    <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-100">
                        <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 shadow-sm shrink-0">
                            {lotto.img_url ? (
                                <img src={lotto.img_url} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-2xl font-bold text-slate-400">{lotto.name[0]}</span>
                            )}
                        </div>
                        <div>
                            <h4 className="font-bold text-xl text-slate-800">{lotto.name}</h4>
                            <p className="text-slate-500 text-sm flex items-center gap-1 mt-1">
                                <Calendar size={14} /> งวดวันที่ {formatDateDisplay(dateStr)}
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleConfirmSubmit} className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 block">3 ตัวบน</label>
                                <input
                                    type="tel"
                                    maxLength={3}
                                    value={top3}
                                    onChange={(e) => setTop3(e.target.value.replace(/[^0-9]/g, ''))}
                                    className="w-full text-center text-3xl font-black tracking-widest py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all placeholder-slate-200 text-slate-800"
                                    placeholder="000"
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 block">2 ตัวล่าง</label>
                                <input
                                    type="tel"
                                    maxLength={2}
                                    value={bottom2}
                                    onChange={(e) => setBottom2(e.target.value.replace(/[^0-9]/g, ''))}
                                    className="w-full text-center text-3xl font-black tracking-widest py-3 border-2 border-slate-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all placeholder-slate-200 text-slate-800"
                                    placeholder="00"
                                />
                            </div>
                        </div>

                        {existingResult && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-3 text-sm text-amber-800">
                                <AlertCircle className="shrink-0 mt-0.5" size={18} />
                                <div>
                                    <span className="font-bold">คำเตือน:</span> การแก้ไขผลจะทำให้ระบบ <span className="font-bold underline">คำนวณเงินใหม่</span> (Rollback & Re-calculate)
                                </div>
                            </div>
                        )}

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-slate-900 text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-slate-300 hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <><Loader2 className="animate-spin" /> กำลังประมวลผล...</>
                                ) : (
                                    <><CheckCircle /> ยืนยันผลรางวัล</>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
});

// --- Main Component ---
export default function ManageResults() {
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [lottos, setLottos] = useState<any[]>([]);
  const [resultsMap, setResultsMap] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [selectedLotto, setSelectedLotto] = useState<any>(null);
  
  const datePickerRef = useRef<HTMLInputElement>(null);
  const isToday = selectedDate === getTodayStr();
  const isYesterday = selectedDate === getYesterdayStr();

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
        const [resLottos, resResults] = await Promise.all([
            client.get('/play/lottos'),
            client.get(`/reward/daily?date=${selectedDate}`)
        ]);

        let allLottos = resLottos.data;
        const currentResults = resResults.data || {};

        // เรียงลำดับ: มีผลแล้วขึ้นก่อน -> ไม่มีผล -> ตามเวลาปิด
        allLottos.sort((a: any, b: any) => {
            const hasResA = !!currentResults[a.id];
            const hasResB = !!currentResults[b.id];
            
            if (hasResA && !hasResB) return -1;
            if (!hasResA && hasResB) return 1;

            if (!a.close_time) return 1;
            if (!b.close_time) return -1;
            return a.close_time.localeCompare(b.close_time);
        });

        setLottos(allLottos);
        setResultsMap(currentResults);

    } catch (err) {
        console.error(err);
        toast.error('โหลดข้อมูลไม่สำเร็จ');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 font-sans pb-20">
      
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-8">
        <div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                <Trophy className="text-amber-500" size={32} /> จัดการผลรางวัล
            </h1>
            <p className="text-slate-500 text-sm mt-1">บันทึกผล ตรวจรางวัล และดูยอดจ่ายเงิน</p>
        </div>

        {/* Date Picker Section */}
        <div className="flex flex-col gap-2 items-end w-full lg:w-auto">
            <div className="flex items-center gap-2 w-full justify-end">
                <div className="bg-slate-100 p-1 rounded-xl flex items-center flex-1 lg:flex-none shadow-inner">
                    <button 
                        onClick={() => setSelectedDate(getTodayStr())}
                        className={`flex-1 lg:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                            isToday ? 'bg-white text-slate-800 shadow-sm ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        วันนี้
                    </button>
                    <button 
                        onClick={() => setSelectedDate(getYesterdayStr())}
                        className={`flex-1 lg:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                            isYesterday ? 'bg-white text-slate-800 shadow-sm ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        เมื่อวาน
                    </button>
                </div>

                <div className="relative group">
                    <div 
                        onClick={() => datePickerRef.current?.showPicker()} 
                        className={`p-3 rounded-xl transition-all cursor-pointer shadow-sm border flex items-center justify-center ${
                            !isToday && !isYesterday 
                            ? 'bg-amber-100 text-amber-600 border-amber-200 ring-2 ring-amber-100' 
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        <Calendar size={20} />
                    </div>
                    <input
                        ref={datePickerRef}
                        type="date"
                        className="absolute inset-0 w-full h-full opacity-0 z-[-1]" 
                        value={selectedDate} 
                        max={getTodayStr()}   
                        onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                    />
                </div>
            </div>

            {/* แสดงวันที่งวดชัดเจน */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">งวดประจำวันที่</span>
                <span className="text-sm font-black text-blue-600">{formatDateDisplay(selectedDate)}</span>
            </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={48} className="text-blue-500 animate-spin mb-4" />
            <p className="text-slate-400 font-medium">กำลังโหลดข้อมูล...</p>
        </div>
      ) : (
        <>
            {/* --- Desktop Table View (แสดงบนจอใหญ่) --- */}
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
                    const isInactive = !lotto.is_active;
                    
                    return (
                        <tr key={lotto.id} className={`hover:bg-slate-50/80 transition-colors ${isInactive ? 'bg-slate-50/50 grayscale-[0.8]' : ''}`}>
                        <td className="p-5 pl-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm">
                                    {lotto.img_url ? (
                                        <img src={lotto.img_url} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="font-bold text-slate-400">{lotto.name[0]}</span>
                                    )}
                                </div>
                                <div>
                                    <div className="font-bold text-slate-800 text-base">{lotto.name}</div>
                                    {isInactive && <span className="text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded font-bold">ปิดรับชั่วคราว</span>}
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
                                        <span className="font-mono font-black text-lg text-slate-800 tracking-wider bg-slate-100 px-2 rounded">
                                            {result.top_3 || result.reward_data?.top || '-'}
                                        </span>
                                    </div>
                                    <div className="w-px h-8 bg-slate-200"></div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">2 ล่าง</span>
                                        <span className="font-mono font-black text-lg text-slate-800 tracking-wider bg-slate-100 px-2 rounded">
                                            {result.bottom_2 || result.reward_data?.bottom || '-'}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <span className="text-slate-300 text-2xl font-black tracking-widest opacity-20">--</span>
                            )}
                        </td>
                        <td className="p-5 text-center pr-8">
                            <button 
                            onClick={() => setSelectedLotto(lotto)}
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
            </div>

            {/* --- Mobile Card View (แสดงบนมือถือ) --- */}
            <div className="lg:hidden grid grid-cols-1 gap-4">
                {lottos.map((lotto) => {
                    const result = resultsMap[lotto.id];
                    const isInactive = !lotto.is_active;
                    
                    return (
                        <div key={lotto.id} className={`bg-white rounded-3xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 relative overflow-hidden ${isInactive ? 'grayscale-[0.8]' : ''}`}>
                            
                            {isInactive && (
                                <div className="absolute top-3 right-3 bg-gray-100 text-gray-500 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                    <Ban size={10} /> ปิดรับ
                                </div>
                            )}

                            <div className="flex justify-between items-start mb-5">
                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold shadow-inner ${result ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                                        {lotto.img_url ? <img src={lotto.img_url} className="w-full h-full object-cover rounded-2xl"/> : lotto.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-lg">{lotto.name}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-500 font-mono">
                                                <Clock size={10} /> {lotto.close_time?.substring(0,5)}
                                            </div>
                                            {result && (
                                                <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">ตรวจแล้ว</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Result Display Mobile */}
                            {result ? (
                                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-4 grid grid-cols-2 gap-px relative overflow-hidden">
                                    <div className="text-center relative z-10">
                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">3 ตัวบน</div>
                                        <div className="text-2xl font-black text-slate-800 font-mono tracking-widest">
                                            {result.top_3 || result.reward_data?.top || '-'}
                                        </div>
                                    </div>
                                    <div className="text-center relative z-10 border-l border-slate-200">
                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">2 ตัวล่าง</div>
                                        <div className="text-2xl font-black text-slate-800 font-mono tracking-widest">
                                            {result.bottom_2 || result.reward_data?.bottom || '-'}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-4 text-center">
                                    <p className="text-slate-400 text-sm font-medium">รอผลรางวัล</p>
                                </div>
                            )}

                            <button 
                                onClick={() => setSelectedLotto(lotto)}
                                className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 ${
                                    result 
                                    ? 'bg-white border border-slate-200 text-slate-500' 
                                    : 'bg-slate-900 text-white shadow-lg shadow-slate-300'
                                }`}
                            >
                                {result ? <><Edit3 size={16} /> แก้ไขผลรางวัล</> : <><Trophy size={16} className="text-amber-400" /> บันทึกผลรางวัล</>}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Empty State */}
            {lottos.length === 0 && (
                <div className="text-center py-20 text-slate-400 bg-white rounded-3xl border border-slate-100 shadow-sm mt-4">
                    <Search size={48} className="mx-auto mb-4 opacity-20"/>
                    <p>ยังไม่มีรายการหวยสำหรับวันที่เลือก</p>
                </div>
            )}
        </>
      )}

      {/* Render Modal */}
      {selectedLotto && (
          <ResultModal 
            lotto={selectedLotto}
            existingResult={resultsMap[selectedLotto.id]}
            dateStr={selectedDate}
            onClose={() => setSelectedLotto(null)}
            onSuccess={fetchData}
          />
      )}
    </div>
  );
}