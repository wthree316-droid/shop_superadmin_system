import { useState, useEffect, useRef } from 'react';
import client from '../../api/client';
import { 
  ShieldAlert, Search, Trash2, X, AlertTriangle, Ban, 
  Clock, CheckCircle2, Layers, Eraser, AlertOctagon, Zap,
  Calendar, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { confirmAction } from '../../utils/toastUtils';

// Config
const BET_TYPES = [
    { key: '2up', label: '2 ตัวบน', digits: 2, color: 'text-blue-600 bg-blue-50 border-blue-200' },
    { key: '2down', label: '2 ตัวล่าง', digits: 2, color: 'text-purple-600 bg-purple-50 border-purple-200' },
    { key: '3top', label: '3 ตัวบน', digits: 3, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { key: '3tod', label: '3 ตัวโต๊ด', digits: 3, color: 'text-teal-600 bg-teal-50 border-teal-200' },
    { key: 'run_up', label: 'วิ่งบน', digits: 1, color: 'text-orange-600 bg-orange-50 border-orange-200' },
    { key: 'run_down', label: 'วิ่งล่าง', digits: 1, color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
];

export default function ManageRisks() {
  const [lottos, setLottos] = useState<any[]>([]);
  const [selectedLotto, setSelectedLotto] = useState<any>(null); 
  const [risks, setRisks] = useState<any[]>([]); 
  const [searchTerm, setSearchTerm] = useState('');
  
  // State วันที่
  const getToday = () => {
  // ใช้เวลา Local ปัจจุบัน ไม่แปลงเป็น UTC
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
  };
  const [selectedDate, setSelectedDate] = useState(getToday());

  const [typing, setTyping] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<Record<string, string[]>>({});
  
  const [globalInput, setGlobalInput] = useState('');
  const [shopTheme, setShopTheme] = useState('#2563EB'); 

  const [riskType, setRiskType] = useState<'CLOSE' | 'HALF'>('CLOSE');
  
  // ✅ แยก State: isLoading (บันทึกข้อมูล) กับ isFetching (โหลดข้อมูล) เพื่อความลื่นไหล
  const [isLoading, setIsLoading] = useState(false); 
  const [isFetching, setIsFetching] = useState(false);

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    fetchLottos();
    fetchShopTheme();
  }, []);

  const fetchLottos = async () => {
    try {
      const res = await client.get('/play/lottos');
      const sorted = res.data.sort((a: any, b: any) => {
          if (!a.close_time) return 1;
          if (!b.close_time) return -1;
          return a.close_time.localeCompare(b.close_time);
      });
      setLottos(sorted);
    } catch (err) { console.error(err); }
  };

  const fetchShopTheme = async () => {
      try {
          const res = await client.get('/shops/');
          if (res.data && res.data.length > 0) {
              setShopTheme(res.data[0].theme_color || '#2563EB');
          }
      } catch (err) { console.error("Theme fetch error", err); }
  };

  const openRiskModal = async (lotto: any) => {
    setSelectedLotto(lotto);
    setRisks([]); 
    setTyping({});
    setPending({}); 
    setGlobalInput('');
    setIsFetching(true); // ✅ เริ่มโหลด

    try {
      const res = await client.get(`/play/risks/${lotto.id}?date=${selectedDate}`);
      setRisks(res.data);
      
      // Focus ไปที่ช่องแรกเมื่อโหลดเสร็จ
      setTimeout(() => {
          inputRefs.current['2up']?.focus();
      }, 100);

    } catch (err) { 
        console.error(err); 
    } finally {
        setIsFetching(false); // ✅ โหลดเสร็จ
    }
  };

  // โหลดข้อมูลใหม่เมื่อเปลี่ยนวันที่ (เฉพาะตอนเปิด Modal อยู่)
  useEffect(() => {
      if (selectedLotto) {
          openRiskModal(selectedLotto);
      }
  }, [selectedDate]);

  // Helper สำหรับปุ่มลัดวันที่
  const setDateFilter = (type: 'today' | 'yesterday') => {
      const d = new Date();
      if (type === 'yesterday') d.setDate(d.getDate() - 1);
      setSelectedDate(d.toISOString().split('T')[0]);
  };

  // --- Logic เดิม (distributeNumbers, handleSmartInput, ฯลฯ) ---
  const distributeNumbers = (rawText: string) => {
      const parts = rawText.split(/[^0-9]+/).filter(x => x); 
      if (parts.length === 0) return 0;
      let count = 0;
      setPending(prev => {
          const newState = { ...prev };
          parts.forEach(num => {
              BET_TYPES.forEach(type => {
                  if (type.digits === num.length) {
                      const currentList = newState[type.key] || [];
                      if (!currentList.includes(num)) {
                          newState[type.key] = [...currentList, num];
                          count++;
                      }
                  }
              });
          });
          return newState;
      });
      return count;
  };

  const handleSmartInput = (key: string, value: string, digits: number) => {
      const val = value.replace(/[^0-9]/g, ''); 
      if (val.length === digits) {
          setPending(prev => {
              const currentList = prev[key] || [];
              if (currentList.includes(val)) return prev; 
              return { ...prev, [key]: [...currentList, val] };
          });
          setTyping(prev => ({ ...prev, [key]: '' })); 
      } else if (val.length < digits) {
          setTyping(prev => ({ ...prev, [key]: val }));
      }
  };

  const handleGlobalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          const count = distributeNumbers(globalInput);
          if (count > 0) {
              setGlobalInput('');
              toast.success(`เพิ่ม ${count} รายการเรียบร้อย`);
          }
      }
  };

  const handleGlobalPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text');
      if (!text) return;
      const count = distributeNumbers(text);
      if (count > 0) toast.success(`วางและกระจาย ${count} รายการสำเร็จ!`);
      else toast.error("ไม่พบตัวเลขที่ใช้ได้");
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, key: string, digits: number) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text');
      if (!text) return;
      const parts = text.split(/[^0-9]+/).filter(x => x); 
      const validNumbers: string[] = [];
      let errorCount = 0;
      parts.forEach(numStr => {
          if (numStr.length === digits) validNumbers.push(numStr);
          else errorCount++;
      });
      if (validNumbers.length > 0) {
          setPending(prev => {
              const currentList = prev[key] || [];
              const uniqueSet = new Set([...currentList, ...validNumbers]);
              return { ...prev, [key]: Array.from(uniqueSet) };
          });
          toast.success(`วางเลขสำเร็จ ${validNumbers.length} รายการ`);
      }
      if (errorCount > 0) toast.error(`ข้าม ${errorCount} ตัวที่หลักไม่ครบ/เกิน`);
  };

  const handleGridKeyDown = (e: React.KeyboardEvent, currentKey: string) => {
      if (e.key === 'Enter') { e.preventDefault(); handleSaveRisks(); return; }
      if (e.key === 'Tab') {
          e.preventDefault(); 
          const currentIndex = BET_TYPES.findIndex(t => t.key === currentKey);
          let nextIndex;
          if (e.shiftKey) nextIndex = (currentIndex - 1 + BET_TYPES.length) % BET_TYPES.length;
          else nextIndex = (currentIndex + 1) % BET_TYPES.length;
          const nextKey = BET_TYPES[nextIndex].key;
          if (inputRefs.current[nextKey]) {
              inputRefs.current[nextKey]?.focus();
              inputRefs.current[nextKey]?.select();
          }
      }
  };

  const removePendingItem = (key: string, numToRemove: string) => {
      setPending(prev => ({ ...prev, [key]: prev[key].filter(n => n !== numToRemove) }));
  };

  const clearAllPending = () => {
      confirmAction('ล้างรายการที่เตรียมไว้ทั้งหมด?', () => {
          setPending({}); setTyping({}); setGlobalInput('');
          inputRefs.current['2up']?.focus();
      }, 'ยืนยัน', 'ยกเลิก');
  };

  const processSaveRisks = async () => {
    setIsLoading(true);

    try {
        // 1. แปลงข้อมูลจาก pending (Map) ให้เป็น Array ก้อนเดียว
        const riskItems: any[] = [];
        Object.entries(pending).forEach(([typeKey, numbers]) => {
            numbers.forEach(num => {
                riskItems.push({
                    number: num,
                    specific_bet_type: typeKey
                });
            });
        });

        // 2. ยิง API ครั้งเดียว
        await client.post('/play/risks/batch', {
            lotto_type_id: selectedLotto.id,
            risk_type: riskType, 
            items: riskItems,
            date: selectedDate 
        });

        toast.success(`บันทึกสำเร็จ ${riskItems.length} รายการ`);
        
        // Refresh ข้อมูล
        openRiskModal(selectedLotto);
        setPending({}); 
        setTyping({}); 
        setGlobalInput('');

    } catch (err: any) {
        console.error(err);
        toast.error(err.response?.data?.detail || 'เกิดข้อผิดพลาดในการบันทึก');
    } finally {
        setIsLoading(false);
    }
  };

  const handleSaveRisks = async () => {
    const hasData = Object.values(pending).some(list => list.length > 0);
    if (!hasData) return toast.error("ยังไม่มีรายการเลขที่เลือก");

    const today = new Date().toISOString().split('T')[0];
    if (selectedDate < today) {
        confirmAction(`⚠️ คุณกำลังบันทึกข้อมูลย้อนหลังของวันที่ ${selectedDate}\nต้องการทำรายการต่อหรือไม่?`, () => processSaveRisks(), 'ทำรายการต่อ', 'ยกเลิก');
        return;
    }

    await processSaveRisks();
  };

  const handleDeleteRisk = async (riskId: string) => {
    confirmAction('ต้องการปลดล็อคเลขนี้?', async () => {
        try {
            await client.delete(`/play/risks/${riskId}`);
            setRisks(risks.filter(r => r.id !== riskId));
            toast.success("ลบเรียบร้อย");
        } catch(err) { toast.error('ลบไม่สำเร็จ'); }
    }, 'ปลดล็อค', 'ยกเลิก');
  };

  const handleClearAllRisks = async () => {
      if (risks.length === 0) return;
      confirmAction(`⚠️ ยืนยันลบเลขอั้น "ทั้งหมด" ของวันที่ ${selectedDate}?`, async () => {
          setIsLoading(true);
          try {
              await client.delete(`/play/risks/clear`, {
                  params: {
                      lotto_id: selectedLotto.id,
                      date: selectedDate
                  }
              });
              
              setRisks([]);
              toast.success("ล้างข้อมูลเรียบร้อย");
          } catch (err) { 
              console.error(err);
              toast.error("เกิดข้อผิดพลาดในการลบ"); 
              openRiskModal(selectedLotto); // โหลดข้อมูลเดิมกลับมา
          } finally { 
              setIsLoading(false); 
          }
      }, 'ล้างข้อมูล', 'ยกเลิก');
  };

  const getRisksByType = () => {
      const grouped: Record<string, any[]> = {};
      BET_TYPES.forEach(t => grouped[t.key] = []);
      risks.forEach(r => {
          const key = r.specific_bet_type || 'ALL';
          if (!grouped[key]) grouped[key] = []; 
          grouped[key].push(r);
      });
      return grouped;
  };

  const groupedRisks = getRisksByType();
  const totalPending = Object.values(pending).reduce((sum, list) => sum + list.length, 0);
  const filteredLottos = lottos.filter(l => l.name.includes(searchTerm) || l.code.includes(searchTerm));

  // เช็คว่าเป็นวันปัจจุบันหรือไม่ (เพื่อ Highlight ปุ่ม)
  const isToday = selectedDate === getToday();
  const isYesterday = selectedDate === new Date(Date.now() - 86400000).toISOString().split('T')[0];

  return (
    <div className="animate-fade-in p-4 max-w-400 mx-auto font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
           <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <ShieldAlert className="text-red-600 fill-red-100" size={32} /> จัดการความเสี่ยง (เลขอั้น)
           </h2>
           <p className="text-slate-500 mt-1 font-medium">ตั้งค่าความเสี่ยงและปิดรับตัวเลข</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
            
            {/* ✅ [ใหม่] ปุ่มลัด วันนี้/เมื่อวาน */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center shadow-inner h-11">
                <button 
                    onClick={() => setDateFilter('today')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all h-full flex items-center ${isToday ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    วันนี้
                </button>
                <button 
                    onClick={() => setDateFilter('yesterday')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all h-full flex items-center ${isYesterday ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    เมื่อวาน
                </button>
            </div>

            {/* Date Picker */}
            <div className="relative">
                <Calendar className="absolute left-3 top-3 text-slate-400" size={18} />
                <input 
                    type="date" 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all shadow-sm font-bold text-slate-700 w-full h-11"
                />
            </div>

            {/* Search Box */}
            <div className="relative w-full md:w-64">
                <input 
                    type="text" 
                    placeholder="ค้นหาชื่อหวย..." 
                    className="w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all shadow-sm h-11" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="absolute left-3.5 top-3 text-slate-400" size={20} />
            </div>
        </div>
      </div>

      {/* Grid ของหวย */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
         {filteredLottos.map((lotto) => (
             <div key={lotto.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer" onClick={() => openRiskModal(lotto)}>
                 <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shadow-inner shrink-0 group-hover:scale-105 transition-transform">
                            {lotto.img_url ? (
                                <img src={lotto.img_url} alt={lotto.name} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-sm font-bold text-slate-400">{lotto.code.substring(0,3)}</span>
                            )}
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-lg leading-tight group-hover:text-blue-600 transition-colors">{lotto.name}</h3>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1 font-medium bg-slate-50 px-2 py-0.5 rounded-full w-fit">
                                <Clock size={12} /> ปิด {lotto.close_time?.substring(0, 5)} น.
                            </div>
                        </div>
                    </div>
                 </div>
                 <button className="w-full bg-white text-red-600 border border-red-100 px-4 py-2.5 rounded-xl font-bold hover:bg-red-50 transition-all flex items-center justify-center gap-2 shadow-sm">
                    <AlertTriangle size={18} /> จัดการเลขอั้น
                 </button>
             </div>
         ))}
      </div>

      {/* Modal */}
      {selectedLotto && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-6 animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl h-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                  
                  {/* Modal Header */}
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0 z-20 shadow-sm">
                      <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full border-2 border-white shadow-md overflow-hidden bg-slate-100 hidden sm:block">
                              {selectedLotto.img_url && <img src={selectedLotto.img_url} className="w-full h-full object-cover"/>}
                          </div>
                          <div>
                              <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                                  {selectedLotto.name}
                              </h3>
                              {/* ✅ แสดงวันที่ที่กำลังดูข้อมูลอยู่ */}
                              <div className="flex items-center gap-2 text-slate-500 text-sm font-medium mt-0.5">
                                  <Calendar size={14}/> วันที่: 
                                  <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                                      {new Date(selectedDate).toLocaleDateString('th-TH', { dateStyle: 'long' })}
                                  </span>
                              </div>
                          </div>
                      </div>
                      <button onClick={() => setSelectedLotto(null)} className="p-2.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                          <X size={28} />
                      </button>
                  </div>

                  <div className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-slate-50">
                      
                      {/* Left Panel (Form) */}
                      <div className="w-full lg:w-5/12 bg-white border-r border-slate-200 overflow-y-auto custom-scrollbar flex flex-col shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] z-10">
                          <div className="p-6 pb-24">
                              
                              {/* ปุ่มเลือกประเภทความเสี่ยง */}
                              <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-200 flex mb-4 shadow-inner">
                                  <button onClick={() => setRiskType('CLOSE')} className={`flex-1 py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${riskType === 'CLOSE' ? 'bg-red-500 text-white shadow-md' : 'text-slate-500 hover:bg-white hover:text-slate-700'}`}>
                                      <Ban size={18} /> ปิดรับ (ไม่ขาย)
                                  </button>
                                  <button onClick={() => setRiskType('HALF')} className={`flex-1 py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${riskType === 'HALF' ? 'bg-orange-500 text-white shadow-md' : 'text-slate-500 hover:bg-white hover:text-slate-700'}`}>
                                      <AlertTriangle size={18} /> จ่ายครึ่ง
                                  </button>
                              </div>

                              {/* ช่องทางลัด */}
                              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-6 relative group focus-within:ring-2 focus-within:ring-blue-200 transition-all">
                                  <div className="flex items-center gap-3">
                                      <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Zap size={20} /></div>
                                      <div className="flex-1">
                                          <label className="text-[10px] font-bold text-blue-500 uppercase tracking-wider block mb-0.5">ทางลัด (พิมพ์/วางเลข แล้วกด Enter)</label>
                                          <input type="text" value={globalInput} onChange={e => setGlobalInput(e.target.value)} onKeyDown={handleGlobalKeyDown} onPaste={handleGlobalPaste} placeholder="เช่น 12 123 59" className="w-full bg-transparent font-mono font-bold text-lg text-blue-800 placeholder-blue-300 outline-none" />
                                      </div>
                                  </div>
                              </div>

                              <div className="flex justify-between items-end mb-4">
                                  <div><h4 className="font-bold text-slate-800 text-base">ระบุตัวเลขรายประเภท</h4><p className="text-xs text-slate-400 mt-0.5">แยกตามประเภทการแทง</p></div>
                                  {totalPending > 0 && <button onClick={clearAllPending} className="text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"><Eraser size={14}/> ล้างทั้งหมด ({totalPending})</button>}
                              </div>

                              {/* Input Grid */}
                              <div className="grid gap-4">
                                  {BET_TYPES.map((type) => (
                                      <div key={type.key} className="bg-slate-50 p-3 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors group focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300">
                                          <div className="flex justify-between items-center mb-2">
                                              <div className={`text-xs font-bold px-2.5 py-1 rounded-md border flex items-center gap-1.5 uppercase tracking-wide ${type.color}`}>{type.label} <span className="opacity-50">| {type.digits} หลัก</span></div>
                                              <input ref={(el) => { inputRefs.current[type.key] = el; }} type="text" placeholder="..." value={typing[type.key] || ''} onChange={e => handleSmartInput(type.key, e.target.value, type.digits)} onKeyDown={(e) => handleGridKeyDown(e, type.key)} onPaste={(e) => handlePaste(e, type.key, type.digits)} maxLength={type.digits} className="w-24 text-center font-mono font-bold text-xl bg-transparent border-b-2 border-slate-200 focus:border-blue-500 outline-none placeholder-slate-300 text-slate-700" />
                                          </div>
                                          <div className="flex flex-wrap gap-2 min-h-8 content-center">
                                              {(pending[type.key] || []).length === 0 ? <span className="text-[10px] text-slate-300 italic pl-1">ยังไม่มีรายการ..</span> : (pending[type.key] || []).map((num, idx) => (
                                                  <span key={idx} className="bg-white border border-slate-200 text-slate-700 pl-2 pr-1 py-1 rounded-lg text-sm font-mono font-bold shadow-sm flex items-center gap-1 animate-scale-in">{num}<button onClick={() => removePendingItem(type.key, num)} className="p-0.5 rounded-md hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors" tabIndex={-1}><X size={14} /></button></span>
                                              ))}
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                          
                          <div className="mt-auto sticky bottom-0 p-4 bg-white/90 backdrop-blur-md border-t border-slate-100">
                              <button onClick={handleSaveRisks} disabled={isLoading || totalPending === 0} style={{ backgroundColor: totalPending > 0 ? shopTheme : undefined }} className={`w-full text-white py-3.5 rounded-xl font-bold shadow-xl shadow-slate-200 hover:shadow-2xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2.5 text-lg ${totalPending === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'hover:opacity-90'}`}>
                                  {isLoading ? <span className="animate-spin">⏳</span> : <CheckCircle2 size={24} />} บันทึกรายการ ({totalPending})
                              </button>
                          </div>
                      </div>

                      {/* Right Panel: List (แสดงรายการที่มีอยู่) */}
                      <div className="w-full lg:w-7/12 flex flex-col h-full bg-slate-50/50">
                          <div className="px-6 py-4 flex justify-between items-center bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                              <div className="flex items-center gap-2.5">
                                  <div className="bg-blue-50 p-2 rounded-lg text-blue-600"><Layers size={20}/></div>
                                  <div>
                                      <h4 className="font-bold text-slate-800 text-sm">รายการในระบบ</h4>
                                      <p className="text-xs text-slate-500">{risks.length} รายการที่ใช้งานอยู่</p>
                                  </div>
                              </div>
                              <button onClick={handleClearAllRisks} disabled={risks.length === 0 || isLoading} className="text-red-600 hover:text-white hover:bg-red-600 border border-red-200 bg-red-50 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                  <Trash2 size={16} /> ล้างทั้งหมด
                              </button>
                          </div>

                          <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                              
                              {/* ✅ แสดง Loader ขณะดึงข้อมูล */}
                              {isFetching ? (
                                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                      <Loader2 size={40} className="animate-spin mb-2 text-blue-500" />
                                      <p className="font-medium animate-pulse">กำลังโหลดข้อมูล...</p>
                                  </div>
                              ) : (
                                  <div className="grid gap-6">
                                      {BET_TYPES.map(type => {
                                          const items = groupedRisks[type.key] || [];
                                          if (items.length === 0) return null;
                                          return (
                                              <div key={type.key} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow animate-slide-up">
                                                  <div className={`px-5 py-3 flex justify-between items-center border-b ${type.color.replace('bg-', 'bg-opacity-10 ').replace('text-', 'text-slate-700 ')}`}>
                                                      <div className="flex items-center gap-2"><span className={`w-2 h-6 rounded-full ${type.color.split(' ')[1].replace('bg-', 'bg-')}`}></span><span className="font-bold text-sm">{type.label}</span></div>
                                                      <span className="bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-md text-xs font-bold">{items.length}</span>
                                                  </div>
                                                  <div className="p-4 flex flex-wrap gap-2.5">
                                                      {items.map(risk => (
                                                          <div key={risk.id} className={`group relative flex items-center gap-2 pl-3 pr-1 py-1.5 rounded-lg border text-base font-mono font-bold select-none cursor-default transition-all hover:shadow-sm hover:scale-105 ${risk.risk_type === 'CLOSE' ? 'bg-red-50 text-red-600 border-red-100 hover:border-red-300' : 'bg-orange-50 text-orange-600 border-orange-100 hover:border-orange-300'}`}>
                                                              {risk.number}
                                                              <div className="h-4 w-px bg-current opacity-20 mx-1"></div>
                                                              <button onClick={() => handleDeleteRisk(risk.id)} className="p-1 rounded-md hover:bg-white text-current opacity-60 hover:opacity-100 transition-all" title="ลบรายการนี้"><X size={14} /></button>
                                                              <span className={`absolute -top-2.5 -right-1 text-[9px] px-1.5 rounded-full text-white font-sans shadow-sm border border-white ${risk.risk_type === 'CLOSE' ? 'bg-red-500' : 'bg-orange-400'}`}>{risk.risk_type === 'CLOSE' ? 'ปิด' : 'ครึ่ง'}</span>
                                                          </div>
                                                      ))}
                                                  </div>
                                              </div>
                                          );
                                      })}
                                      {risks.length === 0 && (
                                          <div className="h-64 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                                              <div className="bg-white p-4 rounded-full shadow-sm mb-3"><AlertOctagon size={40} className="text-slate-200" /></div>
                                              <p className="font-bold text-slate-400">ยังไม่มีการจำกัดความเสี่ยง</p>
                                              <p className="text-xs">เลือกประเภทและกรอกตัวเลขทางซ้ายมือ</p>
                                          </div>
                                      )}
                                  </div>
                              )}
                          </div>
                      </div>

                  </div>
              </div>
          </div>
      )}
    </div>
  );
}