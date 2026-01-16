import { useState, useEffect, useRef } from 'react';
import client from '../../api/client';
import { 
  Plus, X, ListFilter, Pencil, UploadCloud, Loader2,
  Clock, CheckCircle, AlertCircle, ChevronDown, Database,
  Trash2, Coins
} from 'lucide-react';
import type { LottoType, RateProfile } from '../../types/lotto';


const CATEGORIES = [
  { id: 'THAI', label: '🇹🇭 หวยรัฐบาล', color: 'bg-indigo-100 text-indigo-700' },
  { id: 'LAOS', label: '🇱🇦 หวยลาว', color: 'bg-blue-100 text-blue-700' },
  { id: 'HANOI', label: '🇻🇳 หวยฮานอย', color: 'bg-red-100 text-red-700' },
  { id: 'STOCKS', label: '📈 หวยหุ้น', color: 'bg-emerald-100 text-emerald-700' },
  { id: 'STOCKSVIP', label: '📈 หวยหุ้นVIP', color: 'bg-emerald-100 text-emerald-700' },
  { id: 'YIKI', label: '🎱 ยี่กี', color: 'bg-orange-100 text-orange-700' },
  { id: 'OTHERS', label: '🌐 อื่นๆ', color: 'bg-gray-100 text-gray-700' }
];

const DAYS = [
  { id: 'SUN', label: 'อาทิตย์', short: 'อา' }, 
  { id: 'MON', label: 'จันทร์', short: 'จ' }, 
  { id: 'TUE', label: 'อังคาร', short: 'อ' },
  { id: 'WED', label: 'พุธ', short: 'พ' }, 
  { id: 'THU', label: 'พฤหัส', short: 'พฤ' }, 
  { id: 'FRI', label: 'ศุกร์', short: 'ศ' }, 
  { id: 'SAT', label: 'เสาร์', short: 'ส' },
];

const INITIAL_FORM_STATE = {
  name: '', code: '', category: 'OTHERS',
  img_url: '',
  rate_profile_id: '',
  open_days: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'], // Default เปิดทุกวัน
  open_time: '00:00', close_time: '15:30', result_time: '16:00',
  api_link: ''
};

// --- Custom Components ---

// Dropdown เลือกเลข (Hour/Minute)
const CustomNumberSelect = ({ value, options, onChange }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: any) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && listRef.current) {
            const el = document.getElementById(`opt-${value}`);
            if (el) el.scrollIntoView({ block: 'center' });
        }
    }, [isOpen, value]);

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between bg-white border border-slate-200 text-slate-700 font-mono font-bold rounded-lg px-3 py-2 text-sm active:scale-95 transition-all ${isOpen ? 'ring-2 ring-blue-100 border-blue-400' : ''}`}
            >
                <span>{value}</span>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div ref={listRef} className="absolute top-full left-0 w-full mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl z-50 custom-scrollbar">
                    {options.map((opt: string) => (
                        <div
                            id={`opt-${opt}`}
                            key={opt}
                            onClick={() => { onChange(opt); setIsOpen(false); }}
                            className={`px-2 py-2 text-center font-mono text-sm cursor-pointer transition-colors ${opt === value ? 'bg-blue-600 text-white font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            {opt}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

const TimeSelector = ({ label, value, onChange, colorClass, iconColorClass }: any) => {
    const [h, m] = (value || '00:00').split(':');
    return (
        <div className={`p-3 rounded-xl border ${colorClass} bg-white flex flex-col items-center justify-center shadow-sm`}>
            <label className={`text-[10px] font-bold mb-2 flex items-center gap-1.5 uppercase tracking-wider ${iconColorClass}`}>
                <Clock size={12} /> {label}
            </label>
            <div className="flex items-center gap-1 w-full">
                <CustomNumberSelect value={h} options={HOURS} onChange={(v: string) => onChange(`${v}:${m || '00'}`)} />
                <span className="text-slate-300 font-bold text-xs">:</span>
                <CustomNumberSelect value={m} options={MINUTES} onChange={(v: string) => onChange(`${h || '00'}:${v}`)} />
            </div>
        </div>
    );
};

// --- Main Component ---
export default function ManageLottos() {
  const [lottos, setLottos] = useState<LottoType[]>([]);
  const [rateProfiles, setRateProfiles] = useState<RateProfile[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkRateId, setBulkRateId] = useState('');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [resLottos, resRates] = await Promise.all([
        client.get('/play/lottos'),
        client.get('/play/rates')
      ]);
      setLottos(resLottos.data);
      setRateProfiles(resRates.data);
    } catch (err) { console.error(err); } 
    finally { setIsLoading(false); }
  };

  const formatTimeForInput = (timeStr: string | null | undefined) => timeStr ? timeStr.substring(0, 5) : '00:00';

  const openCreateModal = () => {
    setEditingId(null);
    setFormData(INITIAL_FORM_STATE);
    setShowModal(true);
  };

  const openEditModal = (lotto: LottoType) => {
    setEditingId(lotto.id);
    setFormData({
      name: lotto.name,
      code: lotto.code,
      category: lotto.category || 'OTHERS',
      img_url: lotto.img_url || '',
      rate_profile_id: lotto.rate_profile_id || '',
      open_days: lotto.open_days || [],
      open_time: formatTimeForInput(lotto.open_time),
      close_time: formatTimeForInput(lotto.close_time || '15:30:00'),
      result_time: formatTimeForInput(lotto.result_time || '16:00:00'),
      api_link: lotto.api_link || ''
    });
    setShowModal(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return alert('ไฟล์ใหญ่เกิน 2MB');

    setIsUploading(true);
    const data = new FormData();
    data.append('file', file);

    try {
      const res = await client.post('/upload/', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      let fullUrl = res.data.url;
      if (fullUrl && fullUrl.startsWith('/static')) fullUrl = `http://127.0.0.1:8000${fullUrl}`;
      setFormData(prev => ({ ...prev, img_url: fullUrl }));
    } catch (err) { alert('อัปโหลดไม่สำเร็จ'); } 
    finally { setIsUploading(false); if(fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleSaveLotto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (editingId) await client.put(`/play/lottos/${editingId}`, formData);
      else await client.post('/play/lottos', formData);
      setShowModal(false);
      fetchData();
      alert(editingId ? 'แก้ไขสำเร็จ!' : 'สร้างหวยสำเร็จ!');
    } catch (err: any) { alert(`Error: ${err.response?.data?.detail}`); } 
    finally { setIsSubmitting(false); }
  };

  const toggleStatus = async (id: string) => {
    const original = [...lottos];
    setLottos(prev => prev.map(l => l.id === id ? { ...l, is_active: !l.is_active } : l));
    try { await client.patch(`/play/lottos/${id}/toggle`); } 
    catch (err) { setLottos(original); }
  };

  const handleDelete = async (id: string) => {
      if(!confirm('ยืนยันการลบหวยนี้?')) return;
      try {
          await client.delete(`/play/lottos/${id}`);
          fetchData();
      } catch(err:any) { alert(`ลบไม่สำเร็จ: ${err.response?.data?.detail}`); }
  }

  const handleImportTemplates = async () => {
    if (rateProfiles.length === 0) return alert("สร้าง Rate Profile ก่อนครับ");
    if (!confirm("ดึงหวยมาตรฐานจากระบบกลาง?")) return;
    setIsLoading(true);
    try {
        const res = await client.post('/play/lottos/import_defaults');
        alert(`✅ ${res.data.message}`);
        fetchData();
    } catch (err: any) { alert(`Error: ${err.response?.data?.detail}`); } 
    finally { setIsLoading(false); }
  };

  const toggleDay = (dayId: string) => {
    setFormData(prev => {
      const current = prev.open_days || [];
      const newDays = current.includes(dayId) ? current.filter(d => d !== dayId) : [...current, dayId];
      return { ...prev, open_days: newDays };
    });
  };

  // ฟังก์ชันอัปเดตเรทให้หวย 'ทุกตัว'
  const handleBulkUpdate = async () => {
    if (!bulkRateId) return alert("กรุณาเลือกเรทราคา");
    
    // ถามย้ำเพื่อความชัวร์
    if (!confirm(`⚠️ คำเตือน: คุณต้องการเปลี่ยนเรทราคาของหวย "ทุกรายการ" เป็นเรทที่เลือกใช่หรือไม่?`)) return;

    setIsBulkUpdating(true);
    try {
        // ยิง API แค่ครั้งเดียว จบงานทันที
        const res = await client.put('/play/lottos/bulk-rate-update', {
            rate_profile_id: bulkRateId
        });

        alert(`✅ อัปเดตสำเร็จ! เปลี่ยนเรทราคาให้หวยจำนวน ${res.data.updated_count} รายการเรียบร้อยแล้ว`);
        setShowBulkModal(false);
        fetchData(); // โหลดข้อมูลใหม่มาแสดง

    } catch (err: any) {
        console.error(err);
        alert(`❌ เกิดข้อผิดพลาด: ${err.response?.data?.detail || 'Unknown error'}`);
    } finally {
        setIsBulkUpdating(false);
    }
  };

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-8 animate-fade-in">
      
      {/* --- Header --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2 tracking-tight">
            <ListFilter className="text-blue-600" size={28}/> จัดการรายการหวย
          </h2>
          <p className="text-sm text-slate-500 mt-1 ml-1">ตั้งค่าเวลาและสถานะของหวยแต่ละประเภท</p>
        </div>
        
        <div className="flex w-full md:w-auto gap-2">
            {/* --- 1. เพิ่มปุ่ม "ปรับเรททั้งหมด" ตรงนี้ --- */}
            <button
              onClick={() => setShowBulkModal(true)}
              className="flex-1 md:flex-none bg-indigo-50 text-indigo-600 border border-indigo-200 px-4 py-2.5 rounded-xl font-bold flex gap-2 items-center justify-center text-sm shadow-sm hover:bg-indigo-100 active:scale-95 transition-all"
            >
              <Coins size={18} /> <span className="hidden sm:inline">ปรับเรททั้งหมด</span><span className="sm:hidden">Set Rates</span>
            </button>
            <button
              onClick={handleImportTemplates}
              className="flex-1 md:flex-none bg-white text-purple-600 border border-purple-200 px-4 py-2.5 rounded-xl font-bold flex gap-2 items-center justify-center text-sm shadow-sm hover:bg-purple-50 active:scale-95 transition-all"
            >
              <Database size={18} /> <span className="hidden sm:inline">ดึงจากระบบกลาง</span><span className="sm:hidden">Import</span>
            </button>
            <button
              onClick={openCreateModal}
              className="flex-1 md:flex-none bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold flex gap-2 items-center justify-center shadow-lg hover:bg-black active:scale-95 transition-all"
            >
              <Plus size={20} /> เพิ่มหวยใหม่
            </button>
        </div>
      </div>

      {/* --- Desktop Table View (Hidden on Mobile) --- */}
      <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-xs tracking-wider">
                <tr>
                  <th className="p-4 w-20 text-center">IMG</th>
                  <th className="p-4">ชื่อหวย</th>
                  <th className="p-4 text-center">สถานะ</th>
                  <th className="p-4 text-center">ปิดรับ</th>
                  <th className="p-4 text-center">ผลออก</th>
                  <th className="p-4 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lottos.map(lotto => (
                  <tr key={lotto.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="p-4 text-center">
                      <div className="w-10 h-10 mx-auto rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                        {lotto.img_url ? (
                                <img 
                                    src={lotto.img_url} 
                                    loading="lazy" 
                                    className="w-full h-full object-cover rounded-lg"
                                    // ✅ ใส่ onError ตรงนี้
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
                      <div className="font-bold text-slate-800">{lotto.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                         <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 rounded">{lotto.code}</span>
                         <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${CATEGORIES.find(c => c.id === lotto.category)?.color}`}>
                            {CATEGORIES.find(c => c.id === lotto.category)?.label}
                         </span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <button onClick={() => toggleStatus(lotto.id)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${lotto.is_active ? 'bg-green-500' : 'bg-slate-200'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${lotto.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </td>
                    <td className="p-4 text-center font-mono font-bold text-red-500 bg-red-50/50 rounded-lg">{formatTimeForInput(lotto.close_time)}</td>
                    <td className="p-4 text-center font-mono font-bold text-blue-500 bg-blue-50/50 rounded-lg">{formatTimeForInput(lotto.result_time)}</td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-2">
                          <button onClick={() => openEditModal(lotto)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Pencil size={18} /></button>
                          <button onClick={() => handleDelete(lotto.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
      </div>

      {/* --- Mobile Card View (Show on Mobile) --- */}
      <div className="md:hidden grid grid-cols-1 gap-4">
          {isLoading && <div className="text-center py-10 text-slate-400"><Loader2 className="animate-spin mx-auto mb-2" /> กำลังโหลด...</div>}
          
          {lottos.map(lotto => (
              <div key={lotto.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 relative overflow-hidden">
                  <div className="flex items-start gap-4 mb-3">
                      <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                          {lotto.img_url ? (
                                <img 
                                    src={lotto.img_url} 
                                    loading="lazy" 
                                    className="w-full h-full object-cover rounded-lg"
                                    // ✅ ใส่ onError ตรงนี้
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
                      <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                              <h3 className="font-bold text-slate-800 text-lg truncate pr-2">{lotto.name}</h3>
                              <button onClick={() => toggleStatus(lotto.id)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${lotto.is_active ? 'bg-green-500' : 'bg-slate-200'}`}>
                                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${lotto.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                              </button>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 rounded">{lotto.code}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${CATEGORIES.find(c => c.id === lotto.category)?.color}`}>
                                {CATEGORIES.find(c => c.id === lotto.category)?.label}
                              </span>
                          </div>
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-red-50 p-2 rounded-lg text-center border border-red-100">
                          <span className="text-[10px] text-red-400 font-bold uppercase block">ปิดรับ</span>
                          <span className="font-mono font-bold text-red-600">{formatTimeForInput(lotto.close_time)}</span>
                      </div>
                      <div className="bg-blue-50 p-2 rounded-lg text-center border border-blue-100">
                          <span className="text-[10px] text-blue-400 font-bold uppercase block">ผลออก</span>
                          <span className="font-mono font-bold text-blue-600">{formatTimeForInput(lotto.result_time)}</span>
                      </div>
                  </div>

                  <div className="flex gap-2">
                      <button onClick={() => openEditModal(lotto)} className="flex-1 py-2 bg-slate-50 text-slate-600 rounded-lg font-bold text-xs border border-slate-200 active:scale-95 transition-all flex items-center justify-center gap-1 hover:bg-slate-100">
                          <Pencil size={14} /> แก้ไขข้อมูล
                      </button>
                      <button onClick={() => handleDelete(lotto.id)} className="w-10 flex items-center justify-center bg-red-50 text-red-500 rounded-lg border border-red-100 active:scale-95 transition-all hover:bg-red-100">
                          <Trash2 size={16} />
                      </button>
                  </div>
              </div>
          ))}
          {!isLoading && lottos.length === 0 && (
              <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                  <AlertCircle size={32} className="mx-auto mb-2 opacity-30" />
                  ยังไม่มีรายการหวย
              </div>
          )}
      </div>

      {/* --- Modal Form (Responsive) --- */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    {editingId ? <Pencil size={20} className="text-blue-500"/> : <Plus size={20} className="text-green-500"/>} 
                    {editingId ? 'แก้ไขข้อมูล' : 'เพิ่มหวยใหม่'}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} className="bg-white p-2 rounded-full text-slate-400 hover:text-red-500 border border-slate-200 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-5 md:p-6 flex-1 bg-white custom-scrollbar">
              <form id="lotto-form" onSubmit={handleSaveLotto} className="space-y-6">
                
                {/* 1. Basic Info */}
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Image Upload */}
                    <div className="w-full md:w-1/3 flex flex-col gap-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">รูปปก</label>
                        <div 
                            onClick={() => !isUploading && fileInputRef.current?.click()}
                            className={`aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden bg-slate-50 ${isUploading ? 'opacity-50' : 'hover:border-blue-400 hover:bg-blue-50'}`}
                        >
                            {isUploading ? (
                                        <Loader2 className="animate-spin text-amber-500" size={32} />
                                    ) : formData.img_url ? (
                                        <>
                                            {/* ✅ ใส่ onError ตรงนี้ (Preview Modal) */}
                                            <img 
                                                src={formData.img_url} 
                                                className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-50"
                                                onError={(e) => {
                                                    const target = e.target as HTMLImageElement;
                                                    target.style.display = 'none'; // ซ่อนรูปที่เสีย เพื่อให้เห็น icon upload
                                                }}
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Pencil className="text-white drop-shadow-md" size={32} />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center p-4">
                                            <UploadCloud className="text-gray-400 mx-auto mb-2 group-hover:text-amber-500" size={32} />
                                            <span className="text-xs text-gray-500 group-hover:text-amber-600">คลิกเพื่ออัปโหลด</span>
                                        </div>
                                    )}
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                    </div>

                    <div className="flex-1 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">ชื่อหวย</label>
                                <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 focus:bg-white focus:border-blue-500 outline-none transition-all" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} placeholder="เช่น หวยรัฐบาล" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">รหัส (Code)</label>
                                <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono text-sm focus:bg-white focus:border-blue-500 outline-none uppercase" value={formData.code} onChange={e=>setFormData({...formData, code: e.target.value})} placeholder="THAI" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">หมวดหมู่</label>
                                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:bg-white focus:border-blue-500 outline-none" value={formData.category} onChange={e=>setFormData({...formData, category: e.target.value})}>
                                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-purple-600 uppercase mb-1 block">เรทราคา (Rate Profile)</label>
                            <select required className="w-full bg-purple-50 border border-purple-200 rounded-xl p-3 text-sm font-bold text-purple-800 focus:ring-2 focus:ring-purple-200 outline-none" value={formData.rate_profile_id} onChange={e=>setFormData({...formData, rate_profile_id: e.target.value})}>
                                <option value="">-- เลือกเรทราคา --</option>
                                {rateProfiles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <hr className="border-slate-100" />

                {/* 2. Time Settings */}
                <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Clock size={16} /> ตั้งค่าเวลา</h4>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">วันเปิดรับ</label>
                            <div className="flex gap-2 flex-wrap">
                                {DAYS.map(d => (
                                    <button type="button" key={d.id} onClick={() => toggleDay(d.id)} className={`w-9 h-9 rounded-lg text-xs font-bold border transition-all ${formData.open_days.includes(d.id) ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-400 border-slate-200'}`}>
                                        {d.short}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <TimeSelector label="เปิดรับ" value={formData.open_time} onChange={(v:string)=>setFormData({...formData, open_time: v})} colorClass="border-green-200" iconColorClass="text-green-600" />
                            <TimeSelector label="ปิดรับ" value={formData.close_time} onChange={(v:string)=>setFormData({...formData, close_time: v})} colorClass="border-red-200" iconColorClass="text-red-600" />
                            <TimeSelector label="ผลออก" value={formData.result_time} onChange={(v:string)=>setFormData({...formData, result_time: v})} colorClass="border-blue-200" iconColorClass="text-blue-600" />
                        </div>
                    </div>
                </div>

              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end">
                <button onClick={() => setShowModal(false)} className="px-5 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors">ยกเลิก</button>
                <button type="submit" form="lotto-form" disabled={isSubmitting} className="px-8 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-black shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                    {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />} บันทึก
                </button>
            </div>
          </div>
        </div>
      )}
      {/* --- 2. เพิ่ม Modal สำหรับ Bulk Update ตรงนี้ (วางก่อนปิด div นอกสุด) --- */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <Coins className="text-indigo-600"/> ตั้งค่าเรททั้งหมด
                    </h3>
                    <button onClick={() => setShowBulkModal(false)} className="text-slate-400 hover:text-red-500"><X size={20}/></button>
                </div>
                
                <div className="p-6">
                    <p className="text-sm text-slate-500 mb-4">
                        เลือกโปรไฟล์เรทราคาที่ต้องการนำไปใช้กับ <b>หวยทั้งหมด ({lottos.length} รายการ)</b> ที่มีอยู่ในระบบขณะนี้
                    </p>
                    
                    <label className="text-xs font-bold text-slate-700 uppercase mb-2 block">เลือก Rate Profile</label>
                    <select 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-200 outline-none mb-6"
                        value={bulkRateId}
                        onChange={(e) => setBulkRateId(e.target.value)}
                    >
                        <option value="">-- กรุณาเลือก --</option>
                        {rateProfiles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>

                    <button 
                        onClick={handleBulkUpdate}
                        disabled={isBulkUpdating || !bulkRateId}
                        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 active:scale-95 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isBulkUpdating ? <Loader2 className="animate-spin" /> : <CheckCircle size={18} />} 
                        {isBulkUpdating ? 'กำลังประมวลผล...' : 'ยืนยันการเปลี่ยนเรท'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}