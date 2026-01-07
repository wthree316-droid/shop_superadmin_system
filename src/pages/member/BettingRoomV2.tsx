// src/pages/member/BettingRoom.tsx
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../../api/client';
import { v4 as uuidv4 } from 'uuid';
import { 
  Trash2, Plus, ArrowLeft, Receipt, History, Send, Loader2, 
  CheckCircle2, ShieldAlert, BadgePercent, Zap 
} from 'lucide-react';
import { type CartItem } from '../../types/lotto';
import { generateNumbers, generateSpecialNumbers } from '../../types/lottoLogic';
import toast from 'react-hot-toast';

type BetType = '2up' | '2down' | '3top' | '3tod' | 'run_up' | 'run_down';

export default function BettingRoom() {
  const { id } = useParams(); 
  const navigate = useNavigate();
  
  // Data State
  const [lotto, setLotto] = useState<any>(null);
  const [risks, setRisks] = useState<any[]>([]); // เก็บเลขอั้น
  const [rateProfile, setRateProfile] = useState<any>(null); // เก็บเรทจ่าย
  
  // Betting State
  const [tab, setTab] = useState<'2' | '3' | '19' | 'run' | 'win'>('2');
  const [winMode, setWinMode] = useState<'2' | '3'>('2'); 
  const [number, setNumber] = useState('');
  const [price, setPrice] = useState(''); 
  const [selectedTypes, setSelectedTypes] = useState<BetType[]>(['2up', '2down']); 

  // Cart & Note
  const [cart, setCart] = useState<CartItem[]>([]);
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const typingTimeoutRef = useRef<any>(null);

  // 1. Fetch Lotto & Risks
  useEffect(() => {
    if(!id) return;
    const fetchData = async () => {
        try {
            const resLotto = await client.get('/play/lottos');
            const found = resLotto.data.find((l:any) => l.id === id);
            if(found) {
                setLotto(found);
                if(found.rate_profile_id) {
                    const resRates = await client.get('/play/rates');
                    const foundRate = resRates.data.find((r:any) => r.id === found.rate_profile_id);
                    setRateProfile(foundRate);
                }
            } else { 
                navigate('/play'); 
            }

            const resRisks = await client.get(`/play/risks/${id}`);
            setRisks(resRisks.data);
        } catch (err) {
            console.error("Load data error", err);
        }
    };
    fetchData();
  }, [id, navigate]);

  // Reset Types เมื่อเปลี่ยน Tab
  useEffect(() => {
      if (tab === '2') setSelectedTypes(['2up', '2down']);
      else if (tab === '3') setSelectedTypes(['3top', '3tod']);
      else if (tab === '19') setSelectedTypes(['2up', '2down']);
      else if (tab === 'run') setSelectedTypes(['run_up']);
      else if (tab === 'win') setSelectedTypes(winMode === '2' ? ['2up', '2down'] : ['3top', '3tod']);
      setNumber('');
  }, [tab, winMode]);

  // --- Helpers ---
  const getInputConfig = () => {
      if (tab === 'win') return { placeholder: 'เช่น 12345', max: 8, min: (winMode === '2' ? 2 : 3) };
      if (tab === '3') return { placeholder: '000', max: 3, min: 3 };
      if (tab === '2') return { placeholder: '00', max: 2, min: 2 };
      if (tab === '19') return { placeholder: '0', max: 1, min: 1 };
      return { placeholder: '0', max: 1, min: 1 }; 
  };

  const addListToCart = (numbersList: string[]) => {
    if (numbersList.length === 0) return;
    if (!price || Number(price) <= 0) return toast.error("กรุณาระบุราคา");
    if (selectedTypes.length === 0) return toast.error("กรุณาเลือกประเภท");

    const newItems: CartItem[] = [];
    const amount = Number(price);

    numbersList.forEach(num => {
        // เช็คเลขอั้น
        const risk = risks.find(r => r.number === num);
        if (risk && risk.risk_type === 'CLOSE') return; 

        selectedTypes.forEach(type => {
            let label = num; 
            if (tab === '19') label = `${num} (19ประตู)`;
            
            newItems.push({
                temp_id: uuidv4(),
                number: num,
                bet_type: type, 
                amount: amount,
                display_text: label
            });
        });
    });

    setCart([...newItems, ...cart]); 
  };

  const handleProcessNumber = () => {
    if(!number) return;
    const config = getInputConfig();

    if (number.length < config.min && tab !== 'win') { 
        toast.error(`กรุณาระบุเลขให้ครบ ${config.min} ตัว`);
        setNumber('');
        return;
    }
    
    let mode: 'normal' | '19gate' | 'win2' | 'win3' = 'normal';
    if (tab === '19') mode = '19gate';
    else if (tab === 'win') mode = winMode === '2' ? 'win2' : 'win3';

    const numbersList = generateNumbers(number, mode);
    
    if (numbersList.length === 0) {
        if (tab === 'win' && number.length < config.min) return; 
        toast.error("ตัวเลขไม่ถูกต้อง");
        setNumber('');
        return;
    }

    addListToCart(numbersList);
    setNumber(''); 
  };

  // Auto-Add Logic
  useEffect(() => {
    const config = getInputConfig();
    if (number.length === config.max) {
        if (!price) return; 
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            handleProcessNumber();
        }, 400); 
    }
    return () => { if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current); };
  }, [number, price, selectedTypes]); 

  const handleQuickOption = (type: any) => {
      if (!price) return toast.error("กรุณาระบุราคาก่อนเลือกออฟชั่นเสริม");
      const list = generateSpecialNumbers(type);
      addListToCart(list);
  };

  const toggleType = (type: BetType) => {
      if (selectedTypes.includes(type)) {
          setSelectedTypes(selectedTypes.filter(t => t !== type));
      } else {
          setSelectedTypes([...selectedTypes, type]);
      }
  };

  // Grouping Logic
  const getGroupedCart = () => {
    const map = new Map<string, { price: number, types: string[], number: string }>();
    cart.forEach(item => {
        const key = `${item.number}-${item.amount}`;
        if (!map.has(key)) map.set(key, { price: item.amount, types: [], number: item.number });
        map.get(key)!.types.push(item.bet_type);
    });

    const finalGroups: { [key: string]: { label: string, types: string[], amount: number, numbers: string[] } } = {};
    map.forEach((val) => {
        const uniqueTypes = Array.from(new Set(val.types)).sort();
        const typeSig = uniqueTypes.join(',');
        const groupKey = `${typeSig}-${val.price}`;

        if (!finalGroups[groupKey]) {
            finalGroups[groupKey] = {
                label: getDisplayLabel(uniqueTypes),
                types: uniqueTypes,
                amount: val.price,
                numbers: []
            };
        }
        finalGroups[groupKey].numbers.push(val.number);
    });
    return Object.values(finalGroups);
  };

  const getDisplayLabel = (types: string[]) => {
      const has2up = types.includes('2up');
      const has2down = types.includes('2down');
      
      if(types.length === 2 && has2up && has2down) return '2 ตัว บน+ล่าง';
      if(types.length === 2 && types.includes('3top') && types.includes('3tod')) return '3 ตัว ตรง+โต๊ด';
      
      return types.map(t => {
          if (t === '2up') return 'บน';
          if (t === '2down') return 'ล่าง';
          if (t === '3top') return '3ตรง';
          if (t === '3tod') return '3โต๊ด';
          if (t === 'run_up') return 'วิ่งบน';
          if (t === 'run_down') return 'วิ่งล่าง';
          return t;
      }).join('+');
  };

  const deleteGroup = (targetTypes: string[], amount: number) => {
      if(!confirm("ยืนยันลบรายการกลุ่มนี้?")) return;
      setCart(prev => prev.filter(item => {
          const isTarget = targetTypes.includes(item.bet_type as BetType) && item.amount === amount;
          return !isTarget;
      }));
  };
  
  const deleteItemsByNumberAndPrice = (num: string, amt: number) => {
      setCart(cart.filter(c => !(c.number === num && c.amount === amt)));
  };

  const submitTicket = async () => {
    if (cart.length === 0) return;
    setIsLoading(true);
    const toastId = toast.loading('กำลังส่งโพย...'); // โชว์ loading

    try {
        const payload = {
            lotto_type_id: lotto.id,
            note: note,
            items: cart.map(item => ({
                number: item.number,
                bet_type: item.bet_type,
                amount: item.amount
            }))
        };

        const res = await client.post('/play/submit_ticket', payload);
        
        toast.dismiss(toastId); // ปิด loading
        toast.success(`ส่งโพยสำเร็จ! รหัส: ${res.data.id.slice(0, 8)}`, { duration: 4000 });
        
        // Reset All
        setCart([]);
        setNote('');
        navigate('/history'); // ส่งเสร็จเด้งไปดูประวัติเลย (UX ที่ดี)

    } catch (err: any) {
        console.error(err);
        toast.dismiss(toastId);
        // แสดง Error จาก Backend (เช่น เงินไม่พอ)
        toast.error(err.response?.data?.detail || 'ส่งโพยไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
        setIsLoading(false);
    }
  };

  const renderRateTable = () => {
      if(!rateProfile) return <div className="text-gray-400 text-sm text-center">ไม่พบข้อมูลเรท</div>;
      
      const displayRates = [
          { key: '3top', label: '3 ตัวบน', color: 'text-red-600' },
          { key: '3tod', label: '3 ตัวโต๊ด', color: 'text-red-500' },
          { key: '2up', label: '2 ตัวบน', color: 'text-blue-600' },
          { key: '2down', label: '2 ตัวล่าง', color: 'text-blue-500' },
          { key: 'run_up', label: 'วิ่งบน', color: 'text-green-600' },
          { key: 'run_down', label: 'วิ่งล่าง', color: 'text-green-500' },
      ];

      return (
          <div className="space-y-2">
              {displayRates.map((r) => {
                  const rateVal = rateProfile.rates[r.key];
                  const pay = typeof rateVal === 'object' ? rateVal?.pay : rateVal;
                  if(!pay) return null;

                  return (
                      <div key={r.key} className="flex justify-between items-center text-sm border-b border-gray-100 pb-1 last:border-0">
                          <span className="text-gray-600">{r.label}</span>
                          <span className={`font-bold ${r.color}`}>จ่าย {pay}</span>
                      </div>
                  );
              })}
          </div>
      );
  };

  const renderRisks = () => {
      if(risks.length === 0) return <div className="text-green-500 text-xs text-center py-2">✅ ไม่มีเลขอั้น/ปิดรับ</div>;
      
      const closed = risks.filter(r => r.risk_type === 'CLOSE');
      const half = risks.filter(r => r.risk_type === 'HALF');

      return (
          <div className="space-y-3 mt-2">
              {closed.length > 0 && (
                  <div>
                      <div className="text-xs font-bold text-red-600 flex items-center gap-1 mb-1"><ShieldAlert size={12}/> เลขปิดรับ (แทงไม่ได้)</div>
                      <div className="flex flex-wrap gap-1">
                          {closed.map(r => <span key={r.id} className="bg-red-50 text-red-600 px-1.5 rounded text-[10px] border border-red-100">{r.number}</span>)}
                      </div>
                  </div>
              )}
              {half.length > 0 && (
                  <div>
                      <div className="text-xs font-bold text-orange-600 flex items-center gap-1 mb-1"><BadgePercent size={12}/> เลขจ่ายครึ่ง</div>
                      <div className="flex flex-wrap gap-1">
                          {half.map(r => <span key={r.id} className="bg-orange-50 text-orange-600 px-1.5 rounded text-[10px] border border-orange-100">{r.number}</span>)}
                      </div>
                  </div>
              )}
          </div>
      );
  };

  if(!lotto) return <div className="p-10 text-center">Loading...</div>;

  const totalAmount = cart.reduce((sum, item) => sum + item.amount, 0);
  const groupedItems = getGroupedCart();
  const inputConfig = getInputConfig();

  const renderTypeToggles = () => {
      const options: { id: BetType, label: string }[] = [];
      if (tab === '2' || tab === '19' || (tab === 'win' && winMode === '2')) {
          options.push({ id: '2up', label: 'บน' }, { id: '2down', label: 'ล่าง' });
      } else if (tab === '3' || (tab === 'win' && winMode === '3')) {
          options.push({ id: '3top', label: '3ตัวตรง' }, { id: '3tod', label: '3ตัวโต๊ด' });
      } else if (tab === 'run') {
          options.push({ id: 'run_up', label: 'วิ่งบน' }, { id: 'run_down', label: 'วิ่งล่าง' });
      }

      return (
          <div className="flex gap-2 mb-2">
              {options.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleType(opt.id)}
                    className={`flex-1 py-2 rounded-lg font-bold text-sm border-2 transition-all flex items-center justify-center
                        ${selectedTypes.includes(opt.id) 
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105' 
                            : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                        }
                    `}
                  >
                      {selectedTypes.includes(opt.id) && <CheckCircle2 size={14} className="mr-1" />}
                      {opt.label}
                  </button>
              ))}
          </div>
      );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-100 overflow-hidden">
      
      {/* 1. Navbar */}
      <div className="bg-white px-4 py-3 shadow-sm border-b z-20 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
            <button onClick={() => navigate('/play')} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600">
                <ArrowLeft size={20} />
            </button>
            <div>
                <h1 className="font-bold text-gray-800 leading-none">{lotto.name}</h1>
                <div className="text-[10px] text-red-500 font-bold mt-0.5">ปิดรับ {lotto.close_time?.substring(0,5)}</div>
            </div>
        </div>
        <button onClick={() => navigate('/history')} className="text-blue-600 text-xs font-bold bg-blue-50 px-3 py-1.5 rounded-full flex items-center gap-1">
            <History size={14} /> ประวัติโพย
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
          
          {/* ================= LEFT COLUMN: KEYPAD & BILL ================= */}
          <div className="flex-1 overflow-y-auto pb-6 scrollbar-hide bg-gray-50/50"> 
             <div className="p-4 max-w-2xl mx-auto space-y-4">
                
                {/* 2.1 Tab Selector */}
                <div className="grid grid-cols-5 gap-1.5 bg-white p-1.5 rounded-xl shadow-sm border border-gray-200">
                    {[
                        { id: '2', label: '2 ตัว' },
                        { id: '3', label: '3 ตัว' },
                        { id: '19', label: '19ประตู' },
                        { id: 'run', label: 'เลขวิ่ง' },
                        { id: 'win', label: 'เลขวิน' }
                    ].map((t) => (
                        <button 
                            key={t.id}
                            onClick={() => { setTab(t.id as any); }}
                            className={`py-2 rounded-lg font-bold text-[10px] sm:text-xs transition-all ${tab === t.id ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Sub-Tabs (Win) */}
                {tab === 'win' && (
                    <div className="flex bg-blue-50 p-1 rounded-lg w-full">
                        <button onClick={() => setWinMode('2')} className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${winMode === '2' ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-400'}`}>วิน 2 ตัว</button>
                        <button onClick={() => setWinMode('3')} className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${winMode === '3' ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-400'}`}>วิน 3 ตัว</button>
                    </div>
                )}

                {/* Quick Options (เติมส่วนที่หายไปให้ครบ) */}
                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                    {/* แท็บ 2 ตัว */}
                    {tab === '2' && (
                        <>
                            <button onClick={() => handleQuickOption('double')} className="px-3 py-1.5 rounded-full text-xs font-bold border border-purple-200 text-purple-600 bg-purple-50 hover:bg-purple-100"><Zap size={10} className="inline mr-1"/>เบิ้ล</button>
                            <button onClick={() => handleQuickOption('sibling')} className="px-3 py-1.5 rounded-full text-xs font-bold border border-orange-200 text-orange-600 bg-orange-50 hover:bg-orange-100"><Zap size={10} className="inline mr-1"/>พี่น้อง</button>
                        </>
                    )}
                    {/* แท็บ 19 ประตู (เพิ่มปุ่มเบิ้ล) */}
                    {tab === '19' && (
                        <button onClick={() => handleQuickOption('double')} className="px-3 py-1.5 rounded-full text-xs font-bold border border-purple-200 text-purple-600 bg-purple-50 hover:bg-purple-100"><Zap size={10} className="inline mr-1"/>รูดเบิ้ล</button>
                    )}
                    {/* แท็บ 3 ตัว (เพิ่มเบิ้ลหน้า/หลัง) */}
                    {tab === '3' && (
                        <>
                            <button onClick={() => handleQuickOption('triple')} className="px-3 py-1.5 rounded-full text-xs font-bold border border-red-200 text-red-600 bg-red-50">ตอง</button>
                            <button onClick={() => handleQuickOption('sandwich')} className="px-3 py-1.5 rounded-full text-xs font-bold border border-indigo-200 text-indigo-600 bg-indigo-50">หาม</button>
                            <button onClick={() => handleQuickOption('double_front')} className="px-3 py-1.5 rounded-full text-xs font-bold border border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100">เบิ้ลหน้า</button>
                            <button onClick={() => handleQuickOption('double_back')} className="px-3 py-1.5 rounded-full text-xs font-bold border border-teal-200 text-teal-600 bg-teal-50 hover:bg-teal-100">เบิ้ลหลัง</button>
                        </>
                    )}
                </div>

                {/* 2.2 Input Area (Smart Box) */}
                <div className="bg-white p-4 rounded-2xl shadow-md border border-gray-100">
                    {/* Price Input */}
                    <div className="mb-4">
                        <label className="text-[10px] font-bold text-gray-400 block mb-1">ราคา (บาท)</label>
                        <input 
                            type="tel" 
                            value={price} 
                            onChange={e => setPrice(e.target.value)} 
                            className="w-full text-center text-3xl font-bold p-2 border-b-2 border-blue-100 focus:border-blue-500 outline-none text-blue-600 placeholder-gray-200 bg-transparent transition-colors" 
                            placeholder="ระบุราคา" 
                        />
                    </div>

                    {/* Type Toggles */}
                    <div className="mb-4">
                        {renderTypeToggles()}
                    </div>

                    {/* Number Input */}
                    <div className="relative pt-2">
                        <label className="text-xs font-bold text-gray-400 block mb-1 text-center">
                            {tab === 'win' ? `ระบุเลขวิน ${winMode} ตัว` : `ระบุตัวเลข (${tab === '19' ? 'เลขรูด' : tab})`}
                        </label>
                        <input 
                            type="tel" 
                            value={number}
                            onChange={e => setNumber(e.target.value.replace(/[^0-9]/g, ''))} 
                            className="w-full text-center text-4xl font-bold p-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none tracking-[0.2em] text-gray-800 placeholder-gray-300 transition-all"
                            placeholder={inputConfig.placeholder}
                            maxLength={inputConfig.max}
                            autoFocus
                        />
                        {/* ปุ่ม Add Manual (Optional) */}
                        <button 
                            onClick={handleProcessNumber}
                            className="absolute right-2 top-1/2 mt-2 bg-gray-900 text-white p-2 rounded-lg shadow-lg active:scale-95 hover:bg-gray-800 transition-colors"
                        >
                            <Plus size={20} />
                        </button>
                    </div>
                </div>

                {/* 2.3 Compact Cart (Grouped) */}
                {groupedItems.length > 0 && (
                    <div className="animate-fade-in-up">
                        <div className="flex justify-between items-end mb-2 px-2">
                            <h3 className="text-sm font-bold text-gray-600 flex items-center gap-2">
                                <Receipt size={16} /> รายการที่เลือก ({groupedItems.length})
                            </h3>
                            <button onClick={() => setCart([])} className="text-xs text-red-500 underline">ล้างทั้งหมด</button>
                        </div>
                        
                        <div className="space-y-3">
                            {groupedItems.map((group, idx) => (
                                <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative group">
                                    {/* Header Line: ประเภท + ราคา */}
                                    <div className="bg-blue-50/80 px-3 py-2 flex justify-between items-center border-b border-gray-100">
                                        <div className="flex items-center gap-2">
                                            <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded font-bold shadow-sm">
                                                {group.label}
                                            </span>
                                            <span className="text-xs font-bold text-gray-500">
                                                ราคา <span className="text-blue-600 text-sm">{group.amount}</span> ฿
                                            </span>
                                        </div>
                                        {/* ปุ่มลบทั้งกลุ่ม */}
                                        <button 
                                            onClick={() => deleteGroup(group.types, group.amount)}
                                            className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    
                                    {/* Numbers Body: แสดงแบบ Chips เรียงกัน */}
                                    <div className="p-3 bg-white">
                                        <div className="flex flex-wrap gap-1.5">
                                            {group.numbers.map((num, nIdx) => (
                                                <div key={nIdx} className="relative group/num">
                                                    <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-sm font-mono font-bold border border-gray-200 select-all cursor-default">
                                                        {num}
                                                    </span>
                                                    {/* กดที่เลขเพื่อลบเฉพาะเลขนั้น */}
                                                    <button 
                                                        onClick={() => deleteItemsByNumberAndPrice(num, group.amount)}
                                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/num:opacity-100 transition-opacity z-10"
                                                    >
                                                        <Trash2 size={10} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* 2.4 Summary & Confirm (Moved here) */}
                        <div className="bg-white p-4 rounded-xl shadow-md border border-blue-100 mt-6 space-y-3 sticky bottom-2 z-10">
                            <input 
                                type="text" 
                                placeholder="📝 บันทึกช่วยจำ (ถ้ามี)..." 
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-gray-50"
                            />
                            <div className="flex justify-center items-center pt-2 border-t border-gray-100">
                                <span className="text-gray-500 px-4 font-bold">ยอดรวม</span>
                                <span className="text-2xl font-bold text-blue-700">{totalAmount.toLocaleString()} ฿</span>
                            </div>
                            <button 
                                onClick={submitTicket} 
                                disabled={isLoading || cart.length === 0}
                                className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold text-lg shadow-lg shadow-blue-200 active:scale-95 transition-all disabled:bg-gray-300 flex items-center justify-center gap-2 hover:bg-blue-700"
                            >
                                {isLoading ? <Loader2 className="animate-spin" /> : <Send size={20} />} 
                                {isLoading ? 'กำลังส่ง...' : 'ยืนยันส่งโพย'}
                            </button>
                        </div>
                    </div>
                )}
             </div>
          </div>

          {/* -------------------- RIGHT COLUMN: RATES & RISKS -------------------- */}
          <div className="hidden lg:flex w-80 bg-white border-l flex-col shadow-xl z-10">
               <div className="p-4 border-b font-bold bg-blue-50 text-blue-800 flex items-center gap-2">
                   <BadgePercent size={18} />
                   <span>อัตราจ่าย & เลขอั้น</span>
               </div>
               
               <div className="flex-1 overflow-y-auto p-4 space-y-6">
                   {/* 1. Rates Table */}
                   <div>
                       <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">อัตราจ่าย (บาทละ)</h4>
                       <div className="bg-white rounded-lg border border-gray-100 p-3 shadow-sm">
                           {renderRateTable()}
                       </div>
                   </div>

                   {/* 2. Risks List */}
                   <div>
                       <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">เลขอั้น / ปิดรับ</h4>
                       <div className="bg-white rounded-lg border border-gray-100 p-3 shadow-sm min-h-25">
                           {renderRisks()}
                       </div>
                   </div>
               </div>
          </div>
      </div>
    </div>
  );
}