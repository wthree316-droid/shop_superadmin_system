import { useState, useEffect, useRef } from 'react';
import client from '../../api/client';
import { Plus, X, Pencil, Loader2, Clock, CheckCircle, Trash2, Database, ChevronDown } from 'lucide-react';
import type { LottoType, RateProfile } from '../../types/lotto';
import FlagSelector from '../../components/admin/FlagSelector';
import { alertAction, confirmAction } from '../../utils/toastUtils';

const DAYS = [
  { id: 'SUN', label: 'อาทิตย์' }, { id: 'MON', label: 'จันทร์' }, { id: 'TUE', label: 'อังคาร' },
  { id: 'WED', label: 'พุธ' }, { id: 'THU', label: 'พฤหัส' }, { id: 'FRI', label: 'ศุกร์' }, { id: 'SAT', label: 'เสาร์' },
];

// ✅ แก้ไข: ตั้งค่าเริ่มต้นให้เปิดครบ 7 วัน (ป้องกัน user ลืมติ๊ก)
const INITIAL_FORM_STATE = {
  name: '', 
  code: '', 
  // category: '', // ตัดออก
  img_url: '',
  rate_profile_id: '', 
  open_days: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'], // Default เปิดทุกวัน
  open_time: '00:00', 
  close_time: '15:30', 
  result_time: '16:00', 
  api_link: ''
};

// --- Custom Components ---
const CustomNumberSelect = ({ value, options, onChange }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: any) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    useEffect(() => {
        if (isOpen && listRef.current) {
            const selectedElement = document.getElementById(`option-${value}`);
            if (selectedElement) {
                selectedElement.scrollIntoView({ block: 'center' });
            }
        }
    }, [isOpen, value]);

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between bg-white border border-gray-300 text-slate-700 text-lg font-bold font-mono rounded-lg px-3 py-1.5 hover:border-amber-400 transition-all ${isOpen ? 'ring-2 ring-amber-100 border-amber-400' : ''}`}
            >
                <span>{value}</span>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div 
                    ref={listRef}
                    className="absolute top-full left-0 w-full mt-1 max-h-40 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl z-50 custom-scrollbar"
                >
                    {options.map((opt: string) => (
                        <div
                            id={`option-${opt}`}
                            key={opt}
                            onClick={() => {
                                onChange(opt);
                                setIsOpen(false);
                            }}
                            className={`px-2 py-2 text-center font-mono cursor-pointer transition-colors text-sm ${
                                opt === value 
                                ? 'bg-amber-500 text-white font-bold' 
                                : 'text-slate-600 hover:bg-amber-50 hover:text-amber-700'
                            }`}
                        >
                            {opt}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const TimeSelector = ({ label, value, onChange, iconColorClass }: any) => {
    const [h, m] = (value || '00:00').split(':');
    const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
    const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

    const handleH = (newH: string) => onChange(`${newH}:${m || '00'}`);
    const handleM = (newM: string) => onChange(`${h || '00'}:${newM}`);

    return (
        <div className="p-3 rounded-xl border border-gray-200 bg-gray-50/50 flex flex-col items-center justify-center">
            <label className={`text-xs font-bold mb-2 flex items-center gap-1.5 ${iconColorClass}`}>
                <Clock size={14} /> {label}
            </label>
            
            <div className="flex items-center gap-2 w-full">
                <CustomNumberSelect value={h} options={HOURS} onChange={handleH} />
                <span className="text-gray-300 font-bold text-lg">:</span>
                <CustomNumberSelect value={m} options={MINUTES} onChange={handleM} />
            </div>
        </div>
    );
};

// --- Main Component ---
export default function ManageLottoTemplates() {

  const [lottos, setLottos] = useState<LottoType[]>([]);
  const [rateProfiles, setRateProfiles] = useState<RateProfile[]>([]);
  // const [categories, setCategories] = useState<any[]>([]); // ไม่ใช้แล้ว

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [scheduleType, setScheduleType] = useState('weekly'); 
  const [monthlyDates, setMonthlyDates] = useState<number[]>([1, 16]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      // ต้องมั่นใจว่า Backend มี Endpoint /play/lottos/templates แล้ว
      const [resLottos, resRates] = await Promise.all([
        client.get('/play/lottos/templates'), 
        client.get('/play/rates')
      ]);

      const sortedLottos = resLottos.data.sort((a: any, b: any) => {
        const getTimeScore = (timeStr: string | null) => {
            if (!timeStr) return 9999;
            const [h, m] = timeStr.split(':').map(Number);
            if (h < 5) return (h + 24) * 60 + m; 
            return h * 60 + m;
        };
        const scoreA = getTimeScore(a.close_time);
        const scoreB = getTimeScore(b.close_time);
        return scoreA - scoreB;
    });

      setLottos(sortedLottos);
      setRateProfiles(resRates.data);
      // setCategories(resCats.data);
    } catch (err) { 
        console.error("Fetch Error:", err); 
    } finally { 
        setIsLoading(false); 
    }
  };

  const formatTimeForInput = (timeStr: string | null | undefined) => {
    if (!timeStr) return '00:00';
    return timeStr.substring(0, 5);
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
        ...INITIAL_FORM_STATE,
        // category: categories.length > 0 ? categories[0].id : ''
    } as any);
    setScheduleType('weekly');
    setMonthlyDates([1, 16]);
    setShowModal(true);
  };

  const openEditModal = (lotto: any) => {
    setEditingId(lotto.id);
    setFormData({
      name: lotto.name,
      code: lotto.code,
      // category: lotto.category || (categories.length > 0 ? categories[0].id : ''),
      img_url: lotto.img_url || '',
      rate_profile_id: lotto.rate_profile_id || '',
      open_days: lotto.open_days || [],
      open_time: formatTimeForInput(lotto.open_time),
      close_time: formatTimeForInput(lotto.close_time || '15:30:00'),
      result_time: formatTimeForInput(lotto.result_time || '16:00:00'),
      api_link: lotto.api_link || ''
    } as any);

    const rules = lotto.rules || {};
    if (rules.schedule_type === 'monthly') {
        setScheduleType('monthly');
        setMonthlyDates(rules.close_dates || [1, 16]);
    } else {
        setScheduleType('weekly');
    }

    setShowModal(true);
  };

  const handleSaveLotto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const payload = { 
          ...formData, 
          rate_profile_id: formData.rate_profile_id || null, 
          is_template: true,
          rules: {
            schedule_type: scheduleType,
            close_dates: scheduleType === 'monthly' ? monthlyDates : undefined
          },
          open_days: scheduleType === 'monthly' ? [] : formData.open_days
      };

      if (editingId) {
        await client.put(`/play/lottos/${editingId}`, payload);
        alertAction('แก้ไขแม่แบบสำเร็จ!', 'สำเร็จ', 'success');
      } else {
        await client.post('/play/lottos', payload);
        alertAction('สร้างแม่แบบสำเร็จ!', 'สำเร็จ', 'success');
      }
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      alertAction(`Error: ${err.response?.data?.detail || 'เกิดข้อผิดพลาด'}`, 'ข้อผิดพลาด', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
      confirmAction("ยืนยันลบแม่แบบนี้? (ร้านค้าที่ดึงไปแล้วจะไม่ได้รับผลกระทบ)", async () => {
          try {
              await client.delete(`/play/lottos/${id}`);
              fetchData();
          } catch(err) { alertAction("ลบไม่สำเร็จ", "ข้อผิดพลาด", "error"); }
      }, "ลบข้อมูล", "ยกเลิก");
  }

  const toggleDay = (dayId: string) => {
    setFormData(prev => {
      const currentDays = prev.open_days || [];
      const newDays = currentDays.includes(dayId) ? currentDays.filter(d => d !== dayId) : [...currentDays, dayId];
      return { ...prev, open_days: newDays };
    });
  };

  return (
    <div className="max-w-7xl mx-auto animate-fade-in pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
            <div className="p-2 bg-linear-to-br from-yellow-400 to-amber-500 rounded-lg shadow-lg shadow-amber-200">
                <Database className="text-white" size={24} /> 
            </div>
            หวยแม่แบบ <span className="text-slate-400 text-lg font-normal">(Templates)</span>
          </h2>
          <p className="text-slate-500 text-sm mt-2 ml-1">จัดการข้อมูลหวยมาตรฐานสำหรับให้ร้านค้าดึงไปใช้งาน (System Global)</p>
        </div>
        <button 
            onClick={openCreateModal} 
            className="group relative bg-white border border-amber-200 text-amber-600 px-6 py-3 rounded-xl font-bold flex gap-2 items-center shadow-sm hover:shadow-md hover:border-amber-400 transition-all duration-300 overflow-hidden"
        >
            <div className="absolute inset-0 w-full h-full bg-amber-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="relative flex items-center gap-2">
                <Plus size={20} className="text-amber-500" /> สร้างแม่แบบใหม่
            </span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-20 text-center text-slate-400 flex flex-col items-center">
             <Loader2 className="animate-spin mb-4 text-amber-500" size={40} /> 
             <span className="animate-pulse">กำลังโหลดข้อมูลระบบ...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
             <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 text-slate-600 font-bold uppercase text-xs border-b border-gray-200">
                <tr>
                    <th className="p-5 w-24 text-center">รูปปก</th>
                    <th className="p-5">ชื่อหวย / รหัส</th>
                    {/* <th className="p-5 text-center">หมวดหมู่</th> */}
                    <th className="p-5 text-center">เวลาปิดรับ (Default)</th>
                    <th className="p-5 text-center">จัดการ</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-slate-700">
                {lottos.map(lotto => (
                    <tr key={lotto.id} className="hover:bg-yellow-50/50 transition-colors group">
                    <td className="p-4 text-center">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 p-0.5 mx-auto overflow-hidden shadow-sm group-hover:scale-110 transition-transform">
                            {lotto.img_url ? (
                                <img 
                                    src={lotto.img_url} 
                                    loading="lazy" 
                                    className="w-full h-full object-cover rounded-lg"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = 'https://placehold.co/100x100?text=No+Img';
                                        target.onerror = null;
                                    }}
                                />
                            ) : (
                                <div className="w-full h-full bg-gray-50 flex items-center justify-center text-xs text-gray-400 font-bold">NO IMG</div>
                            )}
                        </div>
                    </td>
                    <td className="p-4">
                        <div className="font-bold text-base text-slate-800">{lotto.name}</div>
                        <div className="text-xs font-mono text-amber-600 mt-1 bg-amber-50 px-2 py-0.5 rounded-md inline-block border border-amber-100">{lotto.code}</div>
                    </td>
                    {/* <td className="p-4 text-center">
                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold border border-gray-200">
                           {categories.find(c => c.id === lotto.category)?.label || 'ไม่ระบุ'}
                        </span>
                    </td> */}
                    <td className="p-4 text-center">
                        <span className="font-mono text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                            {formatTimeForInput(lotto.close_time)}
                        </span>
                    </td>
                    <td className="p-4 text-center">
                        <div className="flex justify-center gap-2">
                            <button onClick={() => openEditModal(lotto)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="แก้ไข">
                                <Pencil size={18} />
                            </button>
                            <button onClick={() => handleDelete(lotto.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="ลบ">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </td>
                    </tr>
                ))}
                {lottos.length === 0 && (
                    <tr>
                        <td colSpan={5} className="p-12 text-center text-slate-400">
                            <Database size={48} className="mx-auto mb-3 opacity-20 text-gray-300" />
                            ยังไม่มีข้อมูลแม่แบบในระบบ
                        </td>
                    </tr>
                )}
                </tbody>
             </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] text-slate-800 animate-in zoom-in-95 duration-200">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        {editingId ? <Pencil size={20} className="text-blue-500"/> : <Plus size={20} className="text-amber-500"/>} 
                        {editingId ? 'แก้ไขแม่แบบ' : 'สร้างแม่แบบใหม่'}
                    </h3>
                    <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="text-gray-400 hover:text-red-500" />
                    </button>
                </div>
                
                <div className="overflow-y-auto p-6 flex-1 custom-scrollbar">
                    <form id="lotto-form" onSubmit={handleSaveLotto} className="space-y-6">
                         
                         <div className="flex flex-col md:flex-row gap-6">
                            <div className="w-full md:w-1/3 flex flex-col gap-3">
                                <div>
                                    <label className="text-sm font-bold text-slate-700 uppercase mb-2 block">รูปปก / ธงชาติ</label>
                                    <FlagSelector currentUrl={formData.img_url} onSelect={(url) => setFormData({ ...formData, img_url: url })} />
                                </div>
                                <div className="bg-blue-50 text-blue-600 text-xs p-3 rounded-lg flex items-start gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                                    <span>แนะนำให้เลือกรูปจากคลังภาพเพื่อความรวดเร็ว</span>
                                </div>
                            </div>
                            
                            <div className="flex-1 space-y-4">
                                <div>
                                    <label className="block text-sm font-bold mb-1 text-gray-700">ชื่อหวย <span className="text-red-500">*</span></label>
                                    <input required className="w-full bg-white border border-gray-300 p-2.5 rounded-lg text-slate-800 focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none transition-all placeholder-gray-400" placeholder="เช่น หวยรัฐบาลไทย" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1 text-gray-700">รหัส (Code) <span className="text-red-500">*</span></label>
                                    <input required className="w-full bg-white border border-gray-300 p-2.5 rounded-lg text-slate-800 font-mono focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none uppercase placeholder-gray-400" placeholder="EX: THAI" value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} />
                                </div>
                                {/* <div>
                                    <label className="block text-sm font-bold mb-1 text-gray-700">หมวดหมู่</label>
                                    <select className="w-full bg-white border border-gray-300 p-2.5 rounded-lg text-slate-800 focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                                        <option value="">-- เลือกหมวดหมู่ --</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                    </select>
                                </div> */}
                                <div>
                                    <label className="block text-sm font-bold mb-1 text-amber-600">เรทราคาเริ่มต้น</label>
                                    <select className="w-full bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-amber-800 focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none font-bold" value={formData.rate_profile_id || ''} onChange={e => setFormData({...formData, rate_profile_id: e.target.value})}>
                                        <option value="">-- เลือกเรทราคา --</option>
                                        {rateProfiles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                </div>
                            </div>
                         </div>

                         <div className="h-px bg-gray-100 my-4" />

                         <div className="space-y-4">
                            <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                <Clock size={18} className="text-amber-500" /> ตั้งค่าเวลา (ค่าเริ่มต้น)
                            </h4>
                            <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-200 space-y-4">
                                
                                <div>
                                    <label className="block text-xs font-bold mb-2 text-gray-500 uppercase tracking-wider">รูปแบบการออกผล</label>
                                    <div className="flex gap-4 mb-4">
                                        <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-gray-200 hover:border-amber-400 transition-colors">
                                            <input type="radio" className="w-4 h-4 text-amber-500 focus:ring-amber-500" checked={scheduleType === 'weekly'} onChange={() => setScheduleType('weekly')} />
                                            <span className="text-sm font-bold text-slate-700">รายวัน / สัปดาห์</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-gray-200 hover:border-amber-400 transition-colors">
                                            <input type="radio" className="w-4 h-4 text-amber-500 focus:ring-amber-500" checked={scheduleType === 'monthly'} onChange={() => setScheduleType('monthly')} />
                                            <span className="text-sm font-bold text-slate-700">ระบุวันที่ (เช่น หวยไทย)</span>
                                        </label>
                                    </div>
                                </div>

                                {scheduleType === 'weekly' && (
                                    <div className="animate-in fade-in slide-in-from-top-2">
                                        <label className="block text-xs font-bold mb-2 text-gray-500 uppercase tracking-wider">วันเปิดรับ</label>
                                        <div className="flex gap-2 flex-wrap">
                                            {DAYS.map(d => (
                                                <button 
                                                    type="button" 
                                                    key={d.id} 
                                                    onClick={() => toggleDay(d.id)}
                                                    className={`w-9 h-9 rounded-lg text-xs font-bold border transition-all ${formData.open_days.includes(d.id) ? 'bg-amber-500 text-white border-amber-500 shadow-md scale-105' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400 hover:text-gray-600'}`}
                                                >
                                                    {d.label[0]}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {scheduleType === 'monthly' && (
                                    <div className="animate-in fade-in slide-in-from-top-2">
                                        <label className="block text-xs font-bold mb-2 text-gray-500 uppercase tracking-wider">เลือกวันที่หวยออก</label>
                                        <div className="flex flex-wrap gap-2">
                                            {[...Array(31)].map((_, i) => {
                                                const date = i + 1;
                                                const isSelected = monthlyDates.includes(date);
                                                return (
                                                    <button
                                                        key={date}
                                                        type="button"
                                                        onClick={() => {
                                                            if (isSelected) setMonthlyDates(monthlyDates.filter(d => d !== date));
                                                            else setMonthlyDates([...monthlyDates, date].sort((a,b)=>a-b));
                                                        }}
                                                        className={`w-9 h-9 rounded-lg text-xs font-bold border transition-all ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105' : 'bg-white text-gray-400 border-gray-200 hover:border-blue-400 hover:text-blue-600'}`}
                                                    >
                                                        {date}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-2">* เลือกวันที่ต้องการให้ระบบปิดรับและออกผล (เช่น วันที่ 1 และ 16)</p>
                                    </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <TimeSelector label="เวลาเปิด" value={formData.open_time} onChange={(v:string)=>setFormData({...formData, open_time: v})} iconColorClass="text-emerald-600" />
                                    <TimeSelector label="เวลาปิด" value={formData.close_time} onChange={(v:string)=>setFormData({...formData, close_time: v})} iconColorClass="text-rose-600" />
                                    <TimeSelector label="ผลออก" value={formData.result_time} onChange={(v:string)=>setFormData({...formData, result_time: v})} iconColorClass="text-blue-600" />
                                </div>
                            </div>
                         </div>

                    </form>
                </div>

                <div className="p-5 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
                    <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors font-bold">ยกเลิก</button>
                    <button type="submit" form="lotto-form" disabled={isSubmitting} className="px-6 py-2 bg-linear-to-r from-yellow-400 to-amber-500 text-white rounded-lg font-bold shadow-lg shadow-amber-200 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />} บันทึกข้อมูล
                    </button>
                </div>
           </div>
        </div>
      )}
    </div>
  );
}