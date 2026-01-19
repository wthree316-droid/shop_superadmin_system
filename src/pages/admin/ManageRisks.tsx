import { useState, useEffect, useRef } from 'react';
import client from '../../api/client';
import { 
  ShieldAlert, 
  Search, 
  Trash2, 
  X, 
  AlertTriangle, 
  Ban, 
  Clock,
  CheckCircle2,
  Layers,
  Eraser,
  AlertOctagon
} from 'lucide-react';
import toast from 'react-hot-toast';

// Config: กำหนดสีและไอคอนให้แต่ละประเภท
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
  
  const [typing, setTyping] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<Record<string, string[]>>({});

  const [riskType, setRiskType] = useState<'CLOSE' | 'HALF'>('CLOSE');
  const [isLoading, setIsLoading] = useState(false);

  // Ref สำหรับเก็บ Input
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const todayStr = new Date().toLocaleDateString('th-TH', { 
    day: '2-digit', month: 'short', year: '2-digit' 
  });

  useEffect(() => {
    fetchLottos();
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

  const openRiskModal = async (lotto: any) => {
    setSelectedLotto(lotto);
    setRisks([]); 
    setTyping({});
    setPending({}); 
    try {
      const res = await client.get(`/play/risks/${lotto.id}`);
      setRisks(res.data);
      
      // Auto Focus ช่องแรก
      setTimeout(() => {
          inputRefs.current['2up']?.focus();
      }, 100);

    } catch (err) { console.error(err); }
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

  // Logic การกดปุ่ม (Tab Loop & Enter)
  const handleGridKeyDown = (e: React.KeyboardEvent, currentKey: string) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          handleSaveRisks();
          return;
      }

      if (e.key === 'Tab') {
          e.preventDefault(); 

          const currentIndex = BET_TYPES.findIndex(t => t.key === currentKey);
          let nextIndex;
          
          if (e.shiftKey) {
              nextIndex = (currentIndex - 1 + BET_TYPES.length) % BET_TYPES.length;
          } else {
              nextIndex = (currentIndex + 1) % BET_TYPES.length;
          }

          const nextKey = BET_TYPES[nextIndex].key;
          
          if (inputRefs.current[nextKey]) {
              inputRefs.current[nextKey]?.focus();
              inputRefs.current[nextKey]?.select();
          }
      }
  };

  const removePendingItem = (key: string, numToRemove: string) => {
      setPending(prev => ({
          ...prev,
          [key]: prev[key].filter(n => n !== numToRemove)
      }));
  };

  const clearAllPending = () => {
      if(confirm('ล้างรายการที่เตรียมไว้ทั้งหมด?')) {
          setPending({});
          setTyping({});
          inputRefs.current['2up']?.focus();
      }
  };

  const handleSaveRisks = async () => {
    const hasData = Object.values(pending).some(list => list.length > 0);
    if (!hasData) return toast.error("ยังไม่มีรายการเลขที่เลือก");

    setIsLoading(true);
    const promises: Promise<any>[] = [];

    Object.entries(pending).forEach(([typeKey, numbers]) => {
        numbers.forEach(num => {
            promises.push(
                client.post('/play/risks', {
                    lotto_type_id: selectedLotto.id,
                    number: num,
                    risk_type: riskType,
                    specific_bet_type: typeKey 
                })
            );
        });
    });

    try {
      await Promise.all(promises);
      toast.success(`บันทึกสำเร็จ ${promises.length} รายการ`);
      const res = await client.get(`/play/risks/${selectedLotto.id}`);
      setRisks(res.data);
      setPending({});
      setTyping({});
      inputRefs.current['2up']?.focus();

    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRisk = async (riskId: string) => {
    if(!confirm('ต้องการปลดล็อคเลขนี้?')) return;
    try {
        await client.delete(`/play/risks/${riskId}`);
        setRisks(risks.filter(r => r.id !== riskId));
        toast.success("ลบเรียบร้อย");
    } catch(err) { toast.error('ลบไม่สำเร็จ'); }
  };

  const handleClearAllRisks = async () => {
      if (risks.length === 0) return;
      const confirmed = window.confirm(
          `⚠️ คำเตือนอันตราย!\n\nคุณกำลังจะลบเลขอั้น "ทั้งหมด" ({risks.length} รายการ) ของหวยนี้ออกจากระบบ\n\nยืนยันที่จะทำรายการหรือไม่?`
      );
      if (!confirmed) return;

      setIsLoading(true);
      const toastId = toast.loading("กำลังลบข้อมูล...");
      
      try {
          const deletePromises = risks.map(r => client.delete(`/play/risks/${r.id}`));
          await Promise.all(deletePromises);
          
          setRisks([]);
          toast.success("ล้างข้อมูลเลขอั้นทั้งหมดแล้ว", { id: toastId });
      } catch (err) {
          console.error(err);
          toast.error("เกิดข้อผิดพลาด บางรายการอาจยังไม่ถูกลบ", { id: toastId });
          const res = await client.get(`/play/risks/${selectedLotto.id}`);
          setRisks(res.data);
      } finally {
          setIsLoading(false);
      }
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

  return (
    <div className="animate-fade-in p-4 max-w-400 mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
           <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <ShieldAlert className="text-red-600 fill-red-100" size={32} /> จัดการความเสี่ยง (เลขอั้น)
           </h2>
           <p className="text-slate-500 mt-1 font-medium">ตั้งค่าความเสี่ยงประจำงวดวันที่ <span className="text-slate-800 font-bold">{todayStr}</span></p>
        </div>
        <div className="relative w-full md:w-80">
           <input 
             type="text" 
             placeholder="ค้นหาชื่อหวย..." 
             className="w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all shadow-sm" 
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
           />
           <Search className="absolute left-3.5 top-3 text-slate-400" size={20} />
        </div>
      </div>

      {/* Grid */}
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
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-6">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl h-full max-h-[90vh] flex flex-col overflow-hidden animate-scale-in">
                  
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
                              <p className="text-slate-500 text-sm font-medium">ระบบจัดการความเสี่ยงและเลขอั้น</p>
                          </div>
                      </div>
                      <button onClick={() => setSelectedLotto(null)} className="p-2.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                          <X size={28} />
                      </button>
                  </div>

                  <div className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-slate-50">
                      
                      {/* Left Panel */}
                      <div className="w-full lg:w-5/12 bg-white border-r border-slate-200 overflow-y-auto custom-scrollbar flex flex-col shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] z-10">
                          <div className="p-6 pb-24">
                              
                              <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-200 flex mb-6 shadow-inner">
                                  <button 
                                    onClick={() => setRiskType('CLOSE')}
                                    className={`flex-1 py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                                        riskType === 'CLOSE' 
                                        ? 'bg-red-500 text-white shadow-md' 
                                        : 'text-slate-500 hover:bg-white hover:text-slate-700'
                                    }`}
                                  >
                                      <Ban size={18} /> ปิดรับ (ไม่ขาย)
                                  </button>
                                  <button 
                                    onClick={() => setRiskType('HALF')}
                                    className={`flex-1 py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                                        riskType === 'HALF' 
                                        ? 'bg-orange-500 text-white shadow-md' 
                                        : 'text-slate-500 hover:bg-white hover:text-slate-700'
                                    }`}
                                  >
                                      <AlertTriangle size={18} /> จ่ายครึ่ง
                                  </button>
                              </div>

                              <div className="flex justify-between items-end mb-4">
                                  <div>
                                      <h4 className="font-bold text-slate-800 text-base">ระบุตัวเลข</h4>
                                      <p className="text-xs text-slate-400 mt-0.5">พิมพ์ครบหลักจะถูกส่งไปรอบันทึกอัตโนมัติ</p>
                                  </div>
                                  {totalPending > 0 && (
                                      <button onClick={clearAllPending} className="text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors">
                                          <Eraser size={14}/> ล้างทั้งหมด ({totalPending})
                                      </button>
                                  )}
                              </div>

                              <div className="grid gap-4">
                                  {BET_TYPES.map((type) => (
                                      <div key={type.key} className="bg-slate-50 p-3 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors group focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300">
                                          <div className="flex justify-between items-center mb-2">
                                              <div className={`text-xs font-bold px-2.5 py-1 rounded-md border flex items-center gap-1.5 uppercase tracking-wide ${type.color}`}>
                                                  {type.label} <span className="opacity-50">| {type.digits} หลัก</span>
                                              </div>
                                              
                                              {/* ✅ ตรงนี้แก้ Ref แล้ว */}
                                              <input 
                                                  ref={(el) => { inputRefs.current[type.key] = el; }} 
                                                  type="text" 
                                                  placeholder="..."
                                                  value={typing[type.key] || ''}
                                                  onChange={e => handleSmartInput(type.key, e.target.value, type.digits)}
                                                  onKeyDown={(e) => handleGridKeyDown(e, type.key)} 
                                                  maxLength={type.digits}
                                                  className="w-24 text-center font-mono font-bold text-xl bg-transparent border-b-2 border-slate-200 focus:border-blue-500 outline-none placeholder-slate-300 text-slate-700"
                                              />
                                          </div>

                                          <div className="flex flex-wrap gap-2 min-h-8 content-center">
                                              {(pending[type.key] || []).length === 0 ? (
                                                  <span className="text-[10px] text-slate-300 italic pl-1">ยังไม่มีรายการ..</span>
                                              ) : (
                                                  (pending[type.key] || []).map((num, idx) => (
                                                      <span key={idx} className="bg-white border border-slate-200 text-slate-700 pl-2 pr-1 py-1 rounded-lg text-sm font-mono font-bold shadow-sm flex items-center gap-1 animate-scale-in">
                                                          {num}
                                                          <button 
                                                            onClick={() => removePendingItem(type.key, num)} 
                                                            className="p-0.5 rounded-md hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors"
                                                            tabIndex={-1} 
                                                          >
                                                              <X size={14} />
                                                          </button>
                                                      </span>
                                                  ))
                                              )}
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                          
                          <div className="mt-auto sticky bottom-0 p-4 bg-white/90 backdrop-blur-md border-t border-slate-100">
                              <button 
                                onClick={handleSaveRisks}
                                disabled={isLoading || totalPending === 0}
                                className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold shadow-xl shadow-slate-200 hover:bg-black hover:shadow-2xl hover:-translate-y-0.5 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:translate-y-0 transition-all flex items-center justify-center gap-2.5 text-lg"
                              >
                                  {isLoading ? <span className="animate-spin">⏳</span> : <CheckCircle2 size={24} />} 
                                  บันทึกรายการ ({totalPending})
                              </button>
                          </div>
                      </div>

                      {/* Right Panel */}
                      <div className="w-full lg:w-7/12 flex flex-col h-full bg-slate-50/50">
                          <div className="px-6 py-4 flex justify-between items-center bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                              <div className="flex items-center gap-2.5">
                                  <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                                      <Layers size={20}/> 
                                  </div>
                                  <div>
                                      <h4 className="font-bold text-slate-800 text-sm">รายการในระบบ</h4>
                                      <p className="text-xs text-slate-500">{risks.length} รายการที่ใช้งานอยู่</p>
                                  </div>
                              </div>
                              <button 
                                onClick={handleClearAllRisks}
                                disabled={risks.length === 0 || isLoading}
                                className="text-red-600 hover:text-white hover:bg-red-600 border border-red-200 bg-red-50 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                  <Trash2 size={16} /> ล้างทั้งหมด
                              </button>
                          </div>

                          <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                              <div className="grid gap-6">
                                  {BET_TYPES.map(type => {
                                      const items = groupedRisks[type.key] || [];
                                      if (items.length === 0) return null;

                                      return (
                                          <div key={type.key} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                              <div className={`px-5 py-3 flex justify-between items-center border-b ${type.color.replace('bg-', 'bg-opacity-10 ').replace('text-', 'text-slate-700 ')}`}>
                                                  <div className="flex items-center gap-2">
                                                      <span className={`w-2 h-6 rounded-full ${type.color.split(' ')[1].replace('bg-', 'bg-')}`}></span>
                                                      <span className="font-bold text-sm">{type.label}</span>
                                                  </div>
                                                  <span className="bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-md text-xs font-bold">{items.length}</span>
                                              </div>
                                              
                                              <div className="p-4 flex flex-wrap gap-2.5">
                                                  {items.map(risk => (
                                                      <div key={risk.id} className={`group relative flex items-center gap-2 pl-3 pr-1 py-1.5 rounded-lg border text-base font-mono font-bold select-none cursor-default transition-all hover:shadow-sm hover:scale-105
                                                          ${risk.risk_type === 'CLOSE' 
                                                              ? 'bg-red-50 text-red-600 border-red-100 hover:border-red-300' 
                                                              : 'bg-orange-50 text-orange-600 border-orange-100 hover:border-orange-300'
                                                          }
                                                      `}>
                                                          {risk.number}
                                                          
                                                          <div className="h-4 w-px bg-current opacity-20 mx-1"></div>

                                                          <button 
                                                              onClick={() => handleDeleteRisk(risk.id)}
                                                              className="p-1 rounded-md hover:bg-white text-current opacity-60 hover:opacity-100 transition-all"
                                                              title="ลบรายการนี้"
                                                          >
                                                              <X size={14} />
                                                          </button>
                                                          
                                                          <span className={`absolute -top-2.5 -right-1 text-[9px] px-1.5 rounded-full text-white font-sans shadow-sm border border-white ${risk.risk_type === 'CLOSE' ? 'bg-red-500' : 'bg-orange-400'}`}>
                                                              {risk.risk_type === 'CLOSE' ? 'ปิด' : 'ครึ่ง'}
                                                          </span>
                                                      </div>
                                                  ))}
                                              </div>
                                          </div>
                                      );
                                  })}

                                  {risks.length === 0 && (
                                      <div className="h-64 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                                          <div className="bg-white p-4 rounded-full shadow-sm mb-3">
                                              <AlertOctagon size={40} className="text-slate-200" />
                                          </div>
                                          <p className="font-bold text-slate-400">ยังไม่มีการจำกัดความเสี่ยง</p>
                                          <p className="text-xs">เลือกประเภทและกรอกตัวเลขทางซ้ายมือ</p>
                                      </div>
                                  )}
                              </div>
                          </div>
                      </div>

                  </div>
              </div>
          </div>
      )}
    </div>
  );
}