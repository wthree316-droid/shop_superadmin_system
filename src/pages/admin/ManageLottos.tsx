import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import client from '../../api/client';
import FlagSelector from '../../components/admin/FlagSelector';
import { 
  Plus, X, ListFilter, Pencil, Loader2, Search,
  Clock, CheckCircle, AlertCircle, ChevronDown, Database,
  Trash2, Coins, FolderCog, Palette, Save
} from 'lucide-react';
import type { LottoType, RateProfile } from '../../types/lotto';
import toast from 'react-hot-toast';
import { alertAction, confirmAction } from '../../utils/toastUtils';

// --- Configs ---
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
  name: '', code: '', category: '', 
  img_url: '',
  rate_profile_id: '',
  open_days: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'], 
  open_time: '00:00', close_time: '15:30', result_time: '16:00',
  api_link: '',
  is_active: true // ✅ [FIX] เพิ่ม is_active
};

// --- Helper Functions ---
const formatTimeForInput = (timeStr: string | null | undefined) => timeStr ? timeStr.substring(0, 5) : '00:00';

const getContrastTextColor = (hexColor: string) => {
    if (!hexColor || !hexColor.startsWith('#')) return '#ffffff';
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 145 ? '#1e293b' : '#ffffff';
};

const CategoryBadgeSelect = memo(({ currentId, categories, onChange, lottoId }: any) => {
    const activeCat = useMemo(() => 
        categories.find((c: any) => c.id === currentId) || { label: 'ไม่ระบุ', color: '#94a3b8' },
    [categories, currentId]);
    
    const style = useMemo(() => {
        const isHex = activeCat.color?.startsWith('#');
        return isHex ? { backgroundColor: activeCat.color, color: getContrastTextColor(activeCat.color) } : {};
    }, [activeCat.color]);

    const className = useMemo(() => {
        const isHex = activeCat.color?.startsWith('#');
        return isHex 
        ? 'appearance-none pl-3 pr-8 py-1 rounded-full font-bold text-[10px] cursor-pointer transition-all hover:opacity-90 shadow-sm border border-black/10 focus:ring-2 focus:ring-offset-1 focus:ring-blue-400 outline-none w-full text-center' 
        : `appearance-none pl-3 pr-8 py-1 rounded-full font-bold text-[10px] cursor-pointer ${activeCat.color} w-full text-center`;
    }, [activeCat.color]);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onChange(lottoId, e.target.value);
    };

    return (
        <div className="relative inline-block min-w-30">
            <select
                value={currentId}
                onChange={handleChange}
                className={className}
                style={style}
            >
                {categories.map((cat: any) => (
                    <option key={cat.id} value={cat.id} className="bg-white text-slate-800">
                        {cat.label}
                    </option>
                ))}
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60">
                <ChevronDown size={12} />
            </div>
        </div>
    );
});

// --- Sub-Components ---
const LottoRow = memo(({ lotto, categories, onToggle, onEdit, onDelete, onCategoryChange, isToggling }: any) => {
    return (
        <tr className="hover:bg-blue-50/30 transition-colors group">
            <td className="p-4 text-center">
                <div className="w-10 h-10 mx-auto rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                    {lotto.img_url ? (
                        <img 
                            src={lotto.img_url} 
                            loading="lazy" 
                            className="w-full h-full object-cover rounded-lg"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                    ) : <div className="text-[10px] text-gray-400 font-bold">NO IMG</div>}
                </div>
            </td>
            <td className="p-4">
                <div className="font-bold text-slate-800">{lotto.name}</div>
                <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 rounded border border-slate-200">{lotto.code}</span>
                    <CategoryBadgeSelect 
                        currentId={lotto.category} 
                        categories={categories}
                        lottoId={lotto.id} 
                        onChange={onCategoryChange}
                    />
                </div>
            </td>
            <td className="p-4 text-center">
                <button 
                    onClick={() => onToggle(lotto.id)} 
                    disabled={isToggling}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isToggling ? 'opacity-50 cursor-not-allowed' : ''} ${lotto.is_active ? 'bg-green-500' : 'bg-slate-200'}`}
                >
                    {isToggling ? (
                        <Loader2 className="absolute inset-0 m-auto animate-spin text-white" size={14} />
                    ) : (
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${lotto.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                    )}
                </button>
            </td>
            <td className="p-4 text-center font-mono font-bold text-red-500 bg-red-50/50 rounded-lg">{formatTimeForInput(lotto.close_time)}</td>
            <td className="p-4 text-center font-mono font-bold text-blue-500 bg-blue-50/50 rounded-lg">{formatTimeForInput(lotto.result_time)}</td>
            <td className="p-4 text-center">
                <div className="flex justify-center gap-2">
                    <button onClick={() => onEdit(lotto)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Pencil size={18} /></button>
                    <button onClick={() => onDelete(lotto.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={18} /></button>
                </div>
            </td>
        </tr>
    );
});

const LottoCard = memo(({ lotto, categories, onToggle, onEdit, onDelete, onCategoryChange, isToggling }: any) => {
    return (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 relative overflow-hidden">
            <div className="flex items-start gap-4 mb-3">
                <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                    {lotto.img_url ? (
                        <img 
                            src={lotto.img_url} 
                            loading="lazy" 
                            className="w-full h-full object-cover rounded-lg"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                    ) : <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400 font-bold">NO IMG</div>}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <h3 className="font-bold text-slate-800 text-lg truncate pr-2">{lotto.name}</h3>
                        <button 
                            onClick={() => onToggle(lotto.id)} 
                            disabled={isToggling}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${isToggling ? 'opacity-50 cursor-not-allowed' : ''} ${lotto.is_active ? 'bg-green-500' : 'bg-slate-200'}`}
                        >
                            {isToggling ? (
                                <Loader2 className="absolute inset-0 m-auto animate-spin text-white" size={12} />
                            ) : (
                                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${lotto.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                            )}
                        </button>
                    </div>
                    <div className="flex flex-col gap-2 mt-2">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 rounded border border-slate-200">{lotto.code}</span>
                        </div>
                        <div className="w-full">
                            <CategoryBadgeSelect 
                                currentId={lotto.category} 
                                categories={categories} 
                                lottoId={lotto.id}
                                onChange={onCategoryChange}
                            />
                        </div>
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
                <button onClick={() => onEdit(lotto)} className="flex-1 py-2 bg-slate-50 text-slate-600 rounded-lg font-bold text-xs border border-slate-200 active:scale-95 transition-all flex items-center justify-center gap-1 hover:bg-slate-100">
                    <Pencil size={14} /> แก้ไขข้อมูล
                </button>
                <button onClick={() => onDelete(lotto.id)} className="w-10 flex items-center justify-center bg-red-50 text-red-500 rounded-lg border border-red-100 active:scale-95 transition-all hover:bg-red-100">
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );
});

const LottoTableContainer = memo(({ lottos, categories, onToggle, onEdit, onDelete, onCategoryChange, togglingIds }: any) => {
    return (
        <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-xs tracking-wider">
                        <tr>
                            <th className="p-4 w-20 text-center">IMG</th>
                            <th className="p-4">ชื่อหวย / หมวดหมู่</th>
                            <th className="p-4 text-center">สถานะ</th>
                            <th className="p-4 text-center">ปิดรับ</th>
                            <th className="p-4 text-center">ผลออก</th>
                            <th className="p-4 text-center">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {lottos.map((lotto: any) => (
                            <LottoRow 
                                key={lotto.id} 
                                lotto={lotto}
                                categories={categories} 
                                onToggle={onToggle}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onCategoryChange={onCategoryChange}
                                isToggling={togglingIds.has(lotto.id)}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
});

const LottoListContainer = memo(({ lottos, categories, isLoading, onToggle, onEdit, onDelete, onCategoryChange, togglingIds }: any) => {
    return (
        <div className="md:hidden grid grid-cols-1 gap-4">
            {isLoading && <div className="text-center py-10 text-slate-400"><Loader2 className="animate-spin mx-auto mb-2" /> กำลังโหลด...</div>}
            
            {lottos.map((lotto: any) => (
                <LottoCard 
                    key={lotto.id}
                    lotto={lotto}
                    categories={categories}
                    onToggle={onToggle}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onCategoryChange={onCategoryChange}
                    isToggling={togglingIds.has(lotto.id)}
                />
            ))}
            {!isLoading && lottos.length === 0 && (
                <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                    <AlertCircle size={32} className="mx-auto mb-2 opacity-30" />
                    ยังไม่มีรายการหวย
                </div>
            )}
        </div>
    );
});

const CustomNumberSelect = memo(({ value, options, onChange }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: any) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false);
        };
        if (isOpen) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

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
                <div className="absolute top-full left-0 w-full mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl z-50 custom-scrollbar">
                    {options.map((opt: string) => (
                        <div
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
});

const TimeSelector = memo(({ label, value, onChange, colorClass, iconColorClass }: any) => {
    const [h, m] = (value || '00:00').split(':');
    const HOURS = useMemo(() => Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')), []);
    const MINUTES = useMemo(() => Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')), []);

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
});

export default function ManageLottos() {
  const [lottos, setLottos] = useState<LottoType[]>([]);
  const [rateProfiles, setRateProfiles] = useState<RateProfile[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [templateSearch, setTemplateSearch] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [isCatSubmitting, setIsCatSubmitting] = useState(false);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set()); // ✅ [FIX] เก็บ ID ที่กำลัง toggle
  const toggleQueueRef = useRef<Promise<void>>(Promise.resolve()); // ✅ [FIX] Queue สำหรับ serialize toggles
  
  const [bulkRateId, setBulkRateId] = useState('');
  
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catForm, setCatForm] = useState({ label: '', color: '#2563EB', order_index: 999 });
  
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
 
  const [scheduleType, setScheduleType] = useState<'weekly' | 'monthly'>('weekly');
  const [monthlyDates, setMonthlyDates] = useState<number[]>([1, 16]);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
      const handleResize = () => setIsMobile(window.innerWidth < 768);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [resLottos, resRates, resCats] = await Promise.all([
        client.get('/play/lottos'),
        client.get('/play/rates'),
        client.get('/play/categories')
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
      setCategories(resCats.data);
    } catch (err) { console.error(err); } 
    finally { setIsLoading(false); }
  }, []); // ไม่มี dependencies เพราะใช้แค่ setState
  
  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleStatus = useCallback(async (id: string) => {
    // ✅ [FIX] ป้องกันการกดซ้ำ ID เดียวกัน
    if (togglingIds.has(id)) {
        console.log(`⏭️ Toggle ${id} already in progress, skipping...`);
        return;
    }
    
    // ✅ [FIX] เพิ่มเข้า Queue (Serialize toggles) เพื่อป้องกัน Race Condition
    toggleQueueRef.current = toggleQueueRef.current.then(async () => {
      // เพิ่ม ID เข้า Set (แสดงว่ากำลัง toggle)
      setTogglingIds(prev => new Set(prev).add(id));
      
      try { 
          // 1. เรียก API และรอให้เสร็จ
          const response = await client.patch(`/play/lottos/${id}/toggle`); 
          console.log(`✅ Toggle API success:`, response.data);
          
          // 2. ✅ [OPTIMIZED] รอให้ Backend commit (ลดจาก 150ms → 100ms)
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // 3. โหลดข้อมูลใหม่จาก Backend
          await fetchData();
          
          // 4. ✅ [OPTIMIZED] รอให้ React render (ลดจาก 100ms → 50ms)
          await new Promise(resolve => setTimeout(resolve, 50));
      } 
      catch (err: any) { 
          console.error(`❌ Toggle ${id} error:`, err);
          toast.error('เปลี่ยนสถานะไม่สำเร็จ');
          // ถ้าพัง โหลดข้อมูลเดิมกลับมาเพื่อ sync
          await fetchData(); 
      } finally {
          // ลบ ID ออกจาก Set (toggle เสร็จแล้ว)
          setTogglingIds(prev => {
              const newSet = new Set(prev);
              newSet.delete(id);
              return newSet;
          });
      }
    }).catch(err => {
        console.error('❌ Queue error:', err);
    });
    
    // ไม่ต้อง return เพราะ Queue จัดการให้แล้ว
  }, [togglingIds, fetchData]);

// ✅ อัปเดตฟังก์ชันลบหวย พร้อมระบบกันมือลั่น
  const handleDelete = useCallback(async (id: string) => {
      // 1. หาชื่อหวยมาแสดงใน Alert
      const lottoToDelete = lottos.find(l => l.id === id);
      const lottoName = lottoToDelete ? lottoToDelete.name : 'หวยนี้';

      confirmAction(`⚠️ คำเตือนอันตราย: คุณกำลังจะลบ "${lottoName}"\nข้อมูลโพยที่ลูกค้าแทง, ยอดเงิน, และเลขอั้นทั้งหมดจะถูกลบทิ้งถาวร!`, () => {
          
          // 2. หน่วงเวลาเปิดกล่องให้พิมพ์ยืนยัน
          setTimeout(async () => {
              const input = prompt(`พิมพ์คำว่า "DELETE" เพื่อยืนยันการลบ ${lottoName} และข้อมูลทั้งหมด`);
              if (input !== 'DELETE') {
                  if (input !== null) toast.error("พิมพ์คำยืนยันไม่ถูกต้อง ยกเลิกการลบ");
                  return;
              }

              // 3. เริ่มลบจริง
              setIsLoading(true); // ใช้ State Loading เดิมเพื่อบล็อกหน้าจอ
              try {
                  await client.delete(`/play/lottos/${id}`);
                  setLottos(prev => prev.filter(l => l.id !== id));
                  alertAction('ลบหวยและข้อมูลโพยทั้งหมดเรียบร้อยแล้ว', 'สำเร็จ', 'success');
              } catch(err:any) { 
                  alertAction(`ลบไม่สำเร็จ: ${err.response?.data?.detail}`, 'ข้อผิดพลาด', 'error'); 
              } finally {
                  setIsLoading(false);
              }
          }, 150);

      }, 'ลบทิ้งถาวร', 'ยกเลิก');
  }, [lottos]); // อย่าลืมใส่ dependency lottos

  const openCreateModal = useCallback(() => {
    setEditingId(null);
    setFormData({
        ...INITIAL_FORM_STATE,
        category: categories.length > 0 ? categories[0].id : ''
    });
    setShowModal(true);
  }, [categories]);

  const openEditModal = useCallback((lotto: LottoType) => {
    setEditingId(lotto.id);
    setFormData({
      name: lotto.name,
      code: lotto.code,
      category: lotto.category || (categories.length > 0 ? categories[0].id : ''),
      img_url: lotto.img_url || '',
      rate_profile_id: lotto.rate_profile_id || '',
      open_days: lotto.open_days || [],
      open_time: formatTimeForInput(lotto.open_time || '00:00:00'),
      close_time: formatTimeForInput(lotto.close_time || '15:30:00'),
      result_time: formatTimeForInput(lotto.result_time || '16:00:00'),
      api_link: lotto.api_link || '',
      is_active: lotto.is_active ?? true // ✅ [FIX] ดึง is_active มาด้วย
    });

    const rules = lotto.rules || {};
    if (rules.schedule_type === 'monthly') {
        setScheduleType('monthly');
        setMonthlyDates(rules.close_dates || [1, 16]);
    } else {
        setScheduleType('weekly');
    }

    setShowModal(true);
  }, [categories]);

  const handleSaveLotto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const payload = { 
          ...formData,
          rate_profile_id: formData.rate_profile_id || null,
          is_active: formData.is_active ?? true, // ✅ [FIX] ส่ง is_active ไปด้วย
          rules: {
            schedule_type: scheduleType,
            close_dates: scheduleType === 'monthly' ? monthlyDates : undefined
          },
          open_days: scheduleType === 'monthly' ? [] : formData.open_days
      };

      if (editingId) {
        await client.put(`/play/lottos/${editingId}`, payload);
        toast.success('แก้ไขหวยสำเร็จ!');
      } else {
        await client.post('/play/lottos', payload);
        toast.success('เพิ่มหวยใหม่สำเร็จ!');
      }
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'เกิดข้อผิดพลาด');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveCategory = async () => {
      if (!catForm.label) return alertAction("กรุณากรอกชื่อหมวดหมู่", "แจ้งเตือน", "info");
      setIsCatSubmitting(true);
      try {
          if (editingCatId) {
              await client.put(`/play/categories/${editingCatId}`, catForm);
          } else {
              await client.post('/play/categories', catForm);
          }
          const res = await client.get('/play/categories'); 
          setCategories(res.data);
          setEditingCatId(null);
          setCatForm({ label: '', color: '#2563EB', order_index: 999 });
      } catch (err: any) {
          alertAction(`ทำรายการไม่สำเร็จ: ${err.response?.data?.detail}`, 'ข้อผิดพลาด', 'error');
      } finally {
          setIsCatSubmitting(false);
      }
  };

  const startEditCategory = (cat: any) => {
      setEditingCatId(cat.id);
      const colorValue = cat.color?.startsWith('#') ? cat.color : '#2563EB';
      setCatForm({ label: cat.label, color: colorValue, order_index: cat.order_index || 999 });
  };

  const cancelEditCategory = () => {
      setEditingCatId(null);
      setCatForm({ label: '', color: '#2563EB', order_index: 999 });
  };

  const handleDeleteCategory = async (id: string) => {
      confirmAction("⚠️ ต้องการลบหมวดหมู่นี้ใช่หรือไม่?", async () => {
          try {
              await client.delete(`/play/categories/${id}`);
              const res = await client.get('/play/categories');
              setCategories(res.data);
              if (editingCatId === id) cancelEditCategory();
          } catch (err: any) {
              alertAction(`ลบไม่สำเร็จ: ${err.response?.data?.detail}`, 'ข้อผิดพลาด', 'error');
          }
      }, 'ลบหมวดหมู่', 'ยกเลิก');
  };

// ✅ โหลดแม่แบบมาโชว์ตอนกดปุ่ม + เรียงเวลา
  const openImportModal = async () => {
    if (rateProfiles.length === 0) return alertAction("สร้าง Rate Profile ก่อนครับ", "แจ้งเตือน", "info");
    setIsLoading(true);
    try {
        const res = await client.get('/play/lottos/templates');
        
        // 🌟 สูตรเรียงลำดับเวลา (เหมือนหน้าหลัก)
        const sortedTemplates = res.data.sort((a: any, b: any) => {
            const getTimeScore = (timeStr: string | null) => {
                if (!timeStr) return 9999;
                const [h, m] = timeStr.split(':').map(Number);
                if (h < 5) return (h + 24) * 60 + m; 
                return h * 60 + m;
            };
            return getTimeScore(a.close_time) - getTimeScore(b.close_time);
        });

        setTemplates(sortedTemplates);
        setSelectedTemplates([]);
        setTemplateSearch(''); // เคลียร์ช่องค้นหา
        setShowImportModal(true);
    } catch (err: any) {
        toast.error("ไม่สามารถโหลดข้อมูลแม่แบบได้");
    } finally {
        setIsLoading(false);
    }
  };

  // ✅ ระบบกรองคำค้นหา (คำนวณแบบ Realtime)
  const filteredTemplates = templates.filter(tmpl => 
      tmpl.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
      tmpl.code.toLowerCase().includes(templateSearch.toLowerCase())
  );

  // ✅ ฟังก์ชันส่งข้อมูลตอนกดยืนยันการดึง
  const submitImport = async () => {
      if (selectedTemplates.length === 0) return toast.error("กรุณาเลือกอย่างน้อย 1 รายการ");
      setIsImporting(true);
      try {
          const res = await client.post('/play/lottos/import_defaults', { template_ids: selectedTemplates });
          alertAction(`✅ ${res.data.message}`, 'สำเร็จ', 'success');
          setShowImportModal(false);
          fetchData();
      } catch (err: any) { 
          alertAction(`Error: ${err.response?.data?.detail}`, 'ข้อผิดพลาด', 'error'); 
      } finally { 
          setIsImporting(false); 
      }
  };

  const toggleDay = (dayId: string) => {
    setFormData(prev => {
      const current = prev.open_days || [];
      const newDays = current.includes(dayId) ? current.filter(d => d !== dayId) : [...current, dayId];
      return { ...prev, open_days: newDays };
    });
  };

  const handleBulkUpdate = async () => {
    if (!bulkRateId) return alertAction("กรุณาเลือกเรทราคา", "แจ้งเตือน", "info");
    confirmAction(`⚠️ คำเตือน: คุณต้องการเปลี่ยนเรทราคาของหวย "ทุกรายการ" เป็นเรทที่เลือกใช่หรือไม่?`, async () => {
        setIsBulkUpdating(true);
        try {
            const res = await client.put('/play/lottos/bulk-rate-update', { rate_profile_id: bulkRateId });
            alertAction(`✅ อัปเดตสำเร็จ! เปลี่ยนเรทราคาให้หวยจำนวน ${res.data.updated_count} รายการเรียบร้อยแล้ว`, 'สำเร็จ', 'success');
            setShowBulkModal(false);
            fetchData(); 
        } catch (err: any) {
            console.error(err);
            alertAction(`❌ เกิดข้อผิดพลาด: ${err.response?.data?.detail || 'Unknown error'}`, 'ข้อผิดพลาด', 'error');
        } finally {
            setIsBulkUpdating(false);
        }
    }, 'ยืนยันเปลี่ยนเรท', 'ยกเลิก');
  };

  const handleQuickCategoryChange = useCallback(async (lottoId: string, newCategoryId: string) => {
      const currentLotto = lottos.find(l => l.id === lottoId);
      if (!currentLotto) return;

      setLottos(prev => prev.map(l => 
          l.id === lottoId ? { ...l, category: newCategoryId } : l
      ));
      
      try {
        const payload = {
            name: currentLotto.name,
            code: currentLotto.code,
            category: newCategoryId, 
            img_url: currentLotto.img_url,
            rate_profile_id: currentLotto.rate_profile_id,
            api_link: currentLotto.api_link,
            is_active: currentLotto.is_active,
            open_time: formatTimeForInput(currentLotto.open_time),
            close_time: formatTimeForInput(currentLotto.close_time),
            result_time: formatTimeForInput(currentLotto.result_time),
            open_days: currentLotto.open_days,
            rules: currentLotto.rules
        };

        await client.put(`/play/lottos/${lottoId}`, payload);
        toast.success("เปลี่ยนหมวดหมู่สำเร็จ");
        // fetchData(); // ไม่จำเป็นต้องโหลดใหม่ทั้งหมดถ้าไม่ต้องการ เพราะ Optimistic Update ทำงานแล้ว
      } catch (err: any) {
          console.error(err);
          const msg = err.response?.data?.detail || "เปลี่ยนหมวดหมู่ไม่สำเร็จ";
          toast.error(msg);
          fetchData(); 
      }
  }, [lottos]);

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2 tracking-tight">
            <ListFilter className="text-blue-600" size={28}/> จัดการรายการหวย
          </h2>
          <p className="text-sm text-slate-500 mt-1 ml-1">ตั้งค่าเวลาและสถานะของหวยแต่ละประเภท</p>
        </div>
        
        <div className="flex w-full md:w-auto gap-2 flex-wrap md:flex-nowrap">
            <button onClick={() => setShowCatModal(true)} className="flex-1 md:flex-none bg-white text-slate-600 border border-slate-200 px-4 py-2.5 rounded-xl font-bold flex gap-2 items-center justify-center text-sm shadow-sm hover:bg-slate-50 active:scale-95 transition-all">
              <FolderCog size={18} /> <span className="hidden sm:inline">หมวดหมู่</span>
            </button>
            <button onClick={() => setShowBulkModal(true)} className="flex-1 md:flex-none bg-indigo-50 text-indigo-600 border border-indigo-200 px-4 py-2.5 rounded-xl font-bold flex gap-2 items-center justify-center text-sm shadow-sm hover:bg-indigo-100 active:scale-95 transition-all">
              <Coins size={18} /> <span className="hidden sm:inline">ปรับเรททั้งหมด</span><span className="sm:hidden">Set Rates</span>
            </button>
            <button onClick={openImportModal} className="flex-1 md:flex-none bg-white text-purple-600 border border-purple-200 px-4 py-2.5 rounded-xl font-bold flex gap-2 items-center justify-center text-sm shadow-sm hover:bg-purple-50 active:scale-95 transition-all">
              <Database size={18} /> <span className="hidden sm:inline">ดึงจากระบบกลาง</span><span className="sm:hidden">Import</span>
            </button>
            <button onClick={openCreateModal} className="flex-1 md:flex-none bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold flex gap-2 items-center justify-center shadow-lg hover:bg-black active:scale-95 transition-all">
              <Plus size={20} /> เพิ่มหวยใหม่
            </button>
        </div>
      </div>

      {/* Desktop Table */}
      {!isMobile && (
        <LottoTableContainer 
            lottos={lottos}
            categories={categories} 
            onToggle={toggleStatus}
            onEdit={openEditModal}
            onDelete={handleDelete}
            onCategoryChange={handleQuickCategoryChange}
            togglingIds={togglingIds}
        />
      )}

      {/* Mobile Card */}
      {isMobile && (
        <LottoListContainer 
            lottos={lottos}
            categories={categories}
            isLoading={isLoading}
            onToggle={toggleStatus}
            onEdit={openEditModal}
            onDelete={handleDelete}
            onCategoryChange={handleQuickCategoryChange}
            togglingIds={togglingIds}
        />
      )}

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95">
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

            <div className="overflow-y-auto p-5 md:p-6 flex-1 bg-white custom-scrollbar">
              <form id="lotto-form" onSubmit={handleSaveLotto} className="space-y-6">
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="w-full md:w-1/3 flex flex-col gap-3">
                        <div>
                            <label className="text-sm font-bold text-slate-700 uppercase mb-2 block">รูปปก / ธงชาติ</label>
                            <FlagSelector currentUrl={formData.img_url} onSelect={(url) => setFormData({ ...formData, img_url: url })} />
                        </div>
                        <div className="bg-blue-50 text-blue-600 text-xs p-3 rounded-lg flex items-start gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                            <span>แนะนำให้เลือกรูปจากคลังภาพของระบบ เพื่อความรวดเร็วและถูกต้องของการแสดงผล</span>
                        </div>
                    </div>

                    <div className="flex-1 space-y-4">
                        {/* ✅ [NEW] Toggle สถานะเปิด/ปิดหวย */}
                        <div className="bg-linear-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-xl p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${formData.is_active ? 'bg-green-500 text-white' : 'bg-slate-300 text-slate-500'}`}>
                                        {formData.is_active ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-slate-800">สถานะหวย</div>
                                        <div className={`text-xs font-bold ${formData.is_active ? 'text-green-600' : 'text-slate-400'}`}>
                                            {formData.is_active ? 'เปิดรับแทง' : 'ปิดรับแทง'}
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => setFormData({...formData, is_active: !formData.is_active})}
                                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors shadow-inner ${formData.is_active ? 'bg-green-500' : 'bg-slate-300'}`}
                                >
                                    <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform shadow-md ${formData.is_active ? 'translate-x-7' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>

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
                                    <option value="">-- เลือกหมวด --</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
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

                <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Clock size={16} /> ตั้งค่าเวลา</h4>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">รูปแบบการออกผล</label>
                            <div className="flex gap-2 p-1 bg-white border border-slate-200 rounded-lg w-fit">
                                <button type="button" onClick={() => setScheduleType('weekly')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${scheduleType === 'weekly' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>รายสัปดาห์</button>
                                <button type="button" onClick={() => setScheduleType('monthly')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${scheduleType === 'monthly' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>รายเดือน (หวยไทย)</button>
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">
                                {scheduleType === 'weekly' ? 'วันเปิดรับ' : 'เลือกวันที่หวยออก'}
                            </label>
                            {scheduleType === 'weekly' && (
                                <div className="flex gap-2 flex-wrap">
                                    {DAYS.map(d => (
                                        <button 
                                            type="button" 
                                            key={d.id} 
                                            onClick={() => toggleDay(d.id)} 
                                            className={`w-9 h-9 rounded-lg text-xs font-bold border transition-all ${formData.open_days.includes(d.id) ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`}
                                        >
                                            {d.short}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {scheduleType === 'monthly' && (
                                <div className="flex gap-2 flex-wrap max-h-30 overflow-y-auto custom-scrollbar p-1">
                                    {[...Array(31)].map((_, i) => {
                                        const date = i + 1;
                                        const isSelected = monthlyDates.includes(date);
                                        return (
                                            <button
                                                type="button"
                                                key={date}
                                                onClick={() => { if (isSelected) setMonthlyDates(monthlyDates.filter(d => d !== date)); else setMonthlyDates([...monthlyDates, date].sort((a,b)=>a-b)); }}
                                                className={`w-9 h-9 rounded-lg text-xs font-bold border transition-all ${isSelected ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-400 border-slate-200 hover:border-indigo-300'}`}
                                            >
                                                {date}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
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

            <div className="p-5 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end">
                <button onClick={() => setShowModal(false)} className="px-5 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors">ยกเลิก</button>
                <button type="submit" form="lotto-form" disabled={isSubmitting} className="px-8 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-black shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                    {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />} บันทึก
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Categories & Bulk Modals (Unchanged) */}
       {showCatModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95">
                <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><FolderCog className="text-slate-600"/> จัดการหมวดหมู่</h3>
                    <button onClick={() => setShowCatModal(false)} className="text-slate-400 hover:text-red-500"><X size={20}/></button>
                </div>
                <div className="overflow-y-auto p-6 flex-1 custom-scrollbar">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-1">{editingCatId ? <Pencil size={12}/> : <Plus size={12}/>} {editingCatId ? 'แก้ไขหมวดหมู่' : 'สร้างใหม่'}</h4>
                        <div className="space-y-3">
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">ชื่อหมวดหมู่</label>
                                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 font-bold text-slate-800 focus:border-blue-500 outline-none text-sm" placeholder="เช่น หวยต่างประเทศ" value={catForm.label} onChange={e => setCatForm({...catForm, label: e.target.value})} />
                                </div>
                                <div className="w-20">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block text-center">ลำดับ</label>
                                    <input type="number" className="w-full bg-white border border-slate-200 rounded-lg px-2 py-2 font-mono text-center text-slate-800 focus:border-blue-500 outline-none text-sm" value={catForm.order_index} onChange={e => setCatForm({...catForm, order_index: Number(e.target.value)})} />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><Palette size={10}/> สีหมวดหมู่</label>
                                <div className="flex items-center gap-3">
                                    <div className="relative w-10 h-10 overflow-hidden rounded-lg shadow-sm border border-slate-200">
                                        <input type="color" className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer" value={catForm.color.startsWith('#') ? catForm.color : '#2563EB'} onChange={e => setCatForm({...catForm, color: e.target.value})} />
                                    </div>
                                    <div className="flex-1">
                                        <input type="text" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono uppercase text-slate-600 focus:border-blue-500 outline-none" value={catForm.color} onChange={e => setCatForm({...catForm, color: e.target.value})} maxLength={7} />
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 pt-2">
                                {editingCatId && <button onClick={cancelEditCategory} className="flex-1 py-2 bg-white border border-slate-200 text-slate-500 rounded-lg font-bold text-xs hover:bg-slate-100">ยกเลิก</button>}
                                <button onClick={handleSaveCategory} disabled={isCatSubmitting} className="flex-1 py-2 bg-slate-800 text-white rounded-lg font-bold shadow-md hover:bg-black active:scale-95 transition-all flex justify-center items-center gap-2 text-xs">
                                    {isCatSubmitting ? <Loader2 className="animate-spin" size={14} /> : (editingCatId ? <Save size={14} /> : <Plus size={14} />)} 
                                    {editingCatId ? 'บันทึกแก้ไข' : 'สร้างเลย'}
                                </button>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex justify-between items-center"><span>รายการที่มีอยู่ ({categories.length})</span></h4>
                        <div className="space-y-2">
                            {categories.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 border border-dashed border-slate-200 rounded-xl text-sm">ยังไม่มีหมวดหมู่</div>
                            ) : (
                                categories.map((cat: any) => {
                                    const isSystem = !cat.shop_id; 
                                    const isHex = cat.color?.startsWith('#');
                                    const badgeStyle = isHex ? { backgroundColor: cat.color, color: getContrastTextColor(cat.color) } : {};
                                    const badgeClass = isHex ? 'px-2 py-1 rounded text-[10px] font-bold' : `px-2 py-1 rounded text-[10px] font-bold ${cat.color}`;
                                    return (
                                        <div key={cat.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-blue-200 transition-colors group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold flex items-center justify-center border border-slate-200 shrink-0">{cat.order_index || 999}</div>
                                                <span className={badgeClass} style={badgeStyle}>ตัวอย่าง</span>
                                                <span className="font-bold text-slate-700 text-sm flex items-center gap-2">{cat.label} {isSystem && <span className="bg-gray-100 text-gray-400 text-[9px] px-1.5 py-0.5 rounded border border-gray-200">SYSTEM</span>}</span>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => startEditCategory(cat)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="แก้ไข"><Pencil size={14} /></button>
                                                <button onClick={() => handleDeleteCategory(cat.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="ลบหมวดหมู่"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {showBulkModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Coins className="text-indigo-600"/> ตั้งค่าเรททั้งหมด</h3>
                    <button onClick={() => setShowBulkModal(false)} className="text-slate-400 hover:text-red-500"><X size={20}/></button>
                </div>
                <div className="p-6">
                    <p className="text-sm text-slate-500 mb-4">เลือกโปรไฟล์เรทราคาที่ต้องการนำไปใช้กับ <b>หวยทั้งหมด ({lottos.length} รายการ)</b> ที่มีอยู่ในระบบขณะนี้</p>
                    <label className="text-xs font-bold text-slate-700 uppercase mb-2 block">เลือก Rate Profile</label>
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-200 outline-none mb-6" value={bulkRateId} onChange={(e) => setBulkRateId(e.target.value)}>
                        <option value="">-- กรุณาเลือก --</option>
                        {rateProfiles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                    <button onClick={handleBulkUpdate} disabled={isBulkUpdating || !bulkRateId} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 active:scale-95 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        {isBulkUpdating ? <Loader2 className="animate-spin" /> : <CheckCircle size={18} />} {isBulkUpdating ? 'กำลังประมวลผล...' : 'ยืนยันการเปลี่ยนเรท'}
                    </button>
                </div>
            </div>
        </div>
      )}
    
      {/* --- Import Modal (ติ๊กเลือกหวยแม่แบบ) --- */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            {/* 🌟 ปรับขนาดเป็น max-w-4xl เพื่อให้กว้างขึ้นและแสดง 2 คอลัมน์ได้ */}
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95">
                <div className="p-5 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <Database className="text-purple-600"/> เลือกดึงหวยจากระบบกลาง
                    </h3>
                    
                    {/* 🌟 ช่องค้นหาหวย */}
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="ค้นหาชื่อหวย หรือ Code..." 
                            value={templateSearch}
                            onChange={(e) => setTemplateSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-bold text-slate-700"
                        />
                    </div>
                    
                    <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-red-500 absolute top-5 right-5 sm:static"><X size={20}/></button>
                </div>

                <div className="overflow-y-auto p-4 md:p-6 flex-1 custom-scrollbar bg-slate-50/50">
                    {templates.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 font-bold">ไม่พบข้อมูลแม่แบบในระบบ</div>
                    ) : filteredTemplates.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 font-bold">ไม่พบหวยที่ค้นหา "{templateSearch}"</div>
                    ) : (
                        <div className="space-y-4">
                            {/* ปุ่มเลือกทั้งหมด (ฉลาดขึ้น: เลือกเฉพาะที่แสดงผลจากการค้นหา) */}
                            <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm sticky top-0 z-10">
                                <span className="font-bold text-slate-700 text-sm">
                                    เลือกทั้งหมด {templateSearch ? `ที่ค้นพบ (${filteredTemplates.length})` : `(${templates.length} รายการ)`}
                                </span>
                                <input 
                                    type="checkbox" 
                                    className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
                                    checked={filteredTemplates.length > 0 && filteredTemplates.every(t => selectedTemplates.includes(t.id))}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            const newSelected = new Set([...selectedTemplates, ...filteredTemplates.map(t => t.id)]);
                                            setSelectedTemplates(Array.from(newSelected));
                                        } else {
                                            const filteredIds = new Set(filteredTemplates.map(t => t.id));
                                            setSelectedTemplates(selectedTemplates.filter(id => !filteredIds.has(id)));
                                        }
                                    }}
                                />
                            </div>

                            {/* 🌟 แสดงรายการเป็น 2 คอลัมน์ (Desktop) เพื่อใช้พื้นที่ให้คุ้มค่า */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {filteredTemplates.map(tmpl => (
                                    <label key={tmpl.id} className={`flex items-center justify-between p-3 bg-white border rounded-xl cursor-pointer transition-all shadow-sm ${selectedTemplates.includes(tmpl.id) ? 'border-purple-500 ring-1 ring-purple-100' : 'border-slate-200 hover:border-purple-300'}`}>
                                        <div className="flex items-center gap-3 w-full min-w-0">
                                            <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                                                {tmpl.img_url ? <img src={tmpl.img_url} className="w-full h-full object-cover" /> : <div className="text-[8px] text-gray-400 font-bold">NO IMG</div>}
                                            </div>
                                            <div className="truncate">
                                                <div className="font-bold text-slate-700 text-sm truncate">{tmpl.name}</div>
                                                <div className="text-xs text-slate-500 font-mono mt-0.5 truncate flex items-center gap-1">
                                                    <span className="bg-slate-100 px-1 rounded">{tmpl.code}</span>
                                                    <span>ปิด: <span className="text-red-500 font-bold">{tmpl.close_time ? tmpl.close_time.substring(0,5) : '-'}</span></span>
                                                </div>
                                            </div>
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            className="w-5 h-5 accent-purple-600 rounded cursor-pointer shrink-0 ml-3"
                                            checked={selectedTemplates.includes(tmpl.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedTemplates([...selectedTemplates, tmpl.id]);
                                                else setSelectedTemplates(selectedTemplates.filter(id => id !== tmpl.id));
                                            }}
                                        />
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-5 border-t border-slate-100 bg-white flex gap-3 justify-end shrink-0">
                    <button onClick={() => setShowImportModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">ยกเลิก</button>
                    <button 
                        onClick={submitImport} 
                        disabled={isImporting || selectedTemplates.length === 0} 
                        className="px-6 py-2.5 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 shadow-lg active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isImporting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />} 
                        ดึงข้อมูล ({selectedTemplates.length})
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}