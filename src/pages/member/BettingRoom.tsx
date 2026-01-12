import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../../api/client';
import { v4 as uuidv4 } from 'uuid';
import { 
  Trash2, Loader2, 
  Save, // ลบ Camera ออกตามแจ้งเตือน
  Settings2, ArrowLeft
} from 'lucide-react';
import { type CartItem } from '../../types/lotto';
import { generateNumbers } from '../../types/lottoLogic';
import toast from 'react-hot-toast';

// --- Types & Helpers ---
type GroupedCartItem = {
  id: string; 
  numbers: string[];
  types: string[]; 
  prices: number[];
  totalAmount: number;
  label: string; 
  priceLabel: string;
};

const reverseNumber = (num: string) => {
    if (num.length === 2) return num.split('').reverse().join('');
    return num;
};

// Helper ดึงค่าเรท
const getRateVal = (rateObj: any, field: 'pay' | 'min' | 'max') => {
    if (!rateObj) return field === 'min' ? 1 : (field === 'max' ? '-' : 0);
    
    // กรณีเป็น Object
    if (typeof rateObj === 'object') {
        const val = rateObj[field];
        if (field === 'pay') return val || 0;
        if (field === 'min') return val || 1;
        if (field === 'max') return val || '-';
        return val;
    }
    // กรณีเป็นตัวเลข (Legacy)
    if (field === 'pay') return Number(rateObj);
    if (field === 'min') return 1;
    return '-';
};

export default function BettingRoom() {
  const { id } = useParams(); 
  const navigate = useNavigate();
  
  // Data State
  const [lotto, setLotto] = useState<any>(null);
  const [risks, setRisks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [tab, setTab] = useState<'2' | '3' | '19' | 'run' | 'win'>('2');
  const [winMode, setWinMode] = useState<'2' | '3'>('2'); 
  
  // Betting Logic State
  const [currentInput, setCurrentInput] = useState('');
  const [bufferNumbers, setBufferNumbers] = useState<string[]>([]);
  const [priceTop, setPriceTop] = useState('');    
  const [priceBottom, setPriceBottom] = useState(''); 
  const [isReverse, setIsReverse] = useState(false); 

  // Cart & Note
  const [cart, setCart] = useState<CartItem[]>([]);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- 1. Fetch Data ---
  useEffect(() => {
    if(!id) return;
    const fetchData = async () => {
        setLoading(true);
        try {
            const [resLotto, resRisks] = await Promise.all([
                client.get(`/play/lottos/${id}`), 
                client.get(`/play/risks/${id}`)
            ]);
            
            setLotto(resLotto.data);
            setRisks(resRisks.data);
        } catch (err) { 
            console.error("Load data error", err);
            toast.error("ไม่พบข้อมูลหวย");
            navigate('/play');
        } finally {
            setLoading(false);
        }
    };
    fetchData();
  }, [id, navigate]);

  // Reset เมื่อเปลี่ยน Tab
  useEffect(() => {
      setBufferNumbers([]);
      setCurrentInput('');
      setPriceTop('');
      setPriceBottom('');
      setIsReverse(false);
  }, [tab, winMode]);

  // --- Functions ---
  const getInputConfig = () => {
      if (tab === 'win') return { max: 8, min: (winMode === '2' ? 2 : 3) };
      if (tab === '3') return { max: 3, min: 3 };
      if (tab === '2') return { max: 2, min: 2 };
      if (tab === '19') return { max: 1, min: 1 };
      if (tab === 'run') return { max: 1, min: 1 };
      return { max: 1, min: 1 }; 
  };

  const handleAddNumberToBuffer = (manualNum?: string) => {
      const numToAdd = manualNum || currentInput;
      if (!numToAdd) return;

      const config = getInputConfig();
      if (numToAdd.length < config.min) {
           return toast.error(`กรุณาระบุตัวเลขอย่างน้อย ${config.min} ตัว`);
      }

      let numbersToAdd: string[] = [numToAdd];
      
      if (tab === '19') {
          numbersToAdd = generateNumbers(numToAdd, '19gate');
      } else if (tab === 'win') {
          const mode = winMode === '2' ? 'win2' : 'win3';
          numbersToAdd = generateNumbers(numToAdd, mode);
          if(numbersToAdd.length === 0) return toast.error("จับวินไม่ได้ (เลขซ้ำหรือจำนวนไม่พอ)");
      }

      const newNumbers = numbersToAdd.filter(n => !bufferNumbers.includes(n));
      if(newNumbers.length === 0 && numbersToAdd.length > 0) {
           setCurrentInput('');
           return;
      }
      
      setBufferNumbers(prev => [...prev, ...newNumbers]);
      setCurrentInput('');
  };

  useEffect(() => {
      const config = getInputConfig();
      if (tab !== 'win' && currentInput.length === config.max) {
          handleAddNumberToBuffer();
      }
  }, [currentInput, tab]);

  const handleQuickOption = (type: string) => {
      let list: string[] = [];
      
      if (tab === '2' || tab === '19') {
          if (type === 'double') { 
             for(let i=0; i<10; i++) list.push(`${i}${i}`);
          }
          if (type === 'sibling' && tab === '2') { 
             const siblings = ['01','12','23','34','45','56','67','78','89','90','09','98','87','76','65','54','43','32','21','10'];
             list = [...siblings];
          }
      }

      if (tab === '3') {
          if (type === 'triple') { 
              for(let i=0; i<10; i++) list.push(`${i}${i}${i}`);
          }
          if (type === 'double_front') {
              for(let i=0; i<10; i++) for(let j=0; j<10; j++) if (i !== j) list.push(`${i}${i}${j}`);
          }
          if (type === 'double_back') {
              for(let i=0; i<10; i++) for(let j=0; j<10; j++) if (i !== j) list.push(`${i}${j}${j}`);
          }
          if (type === 'sandwich') {
              for(let i=0; i<10; i++) for(let j=0; j<10; j++) if (i !== j) list.push(`${i}${j}${i}`);
          }
      }

      if (list.length > 0) {
          const newNumbers = list.filter(n => !bufferNumbers.includes(n));
          setBufferNumbers(prev => [...prev, ...newNumbers]);
          toast.success(`เพิ่ม ${newNumbers.length} รายการ`);
      }
  };

  // --- Add to Cart Logic ---
  const handleAddBill = () => {
      if (currentInput && currentInput.length >= getInputConfig().min) {
          handleAddNumberToBuffer();
      }

      let finalNumbers = [...bufferNumbers];
      if (currentInput && currentInput.length >= getInputConfig().min && tab === 'win') {
           const mode = winMode === '2' ? 'win2' : 'win3';
           const generated = generateNumbers(currentInput, mode);
           finalNumbers = [...finalNumbers, ...generated];
           setCurrentInput('');
      } 
      
      if (finalNumbers.length === 0) return toast.error("กรุณาระบุตัวเลข");
      if (!priceTop && !priceBottom) return toast.error("กรุณาระบุราคาอย่างน้อย 1 ช่อง");

      const pTop = Number(priceTop) || 0;
      const pBottom = Number(priceBottom) || 0;
      const newItems: CartItem[] = [];

      // [FIX] เตรียม Rate สำหรับ lookup
      const currentRates = lotto?.rates || {};

      finalNumbers.forEach(num => {
          const isClosed = risks.find(r => r.number === num && r.risk_type === 'CLOSE');
          if (isClosed) return;

          const numsToProcess = (isReverse && tab === '2') 
            ? Array.from(new Set([num, reverseNumber(num)])) 
            : [num];

          numsToProcess.forEach(n => {
             if (tab === '2' || tab === '19' || (tab === 'win' && winMode === '2')) {
                 if (pTop > 0) newItems.push({ 
                    temp_id: uuidv4(), 
                    number: n, 
                    bet_type: '2up', 
                    amount: pTop, 
                    display_text: n,
                    // [FIX 1] ใส่ rate_pay
                    rate_pay: Number(getRateVal(currentRates['2up'], 'pay'))
                 });
                 if (pBottom > 0) newItems.push({ 
                    temp_id: uuidv4(), 
                    number: n, 
                    bet_type: '2down', 
                    amount: pBottom, 
                    display_text: n,
                    // [FIX 1] ใส่ rate_pay
                    rate_pay: Number(getRateVal(currentRates['2down'], 'pay'))
                 });
             } else if (tab === '3' || (tab === 'win' && winMode === '3')) {
                 if (pTop > 0) newItems.push({ 
                    temp_id: uuidv4(), 
                    number: n, 
                    bet_type: '3top', 
                    amount: pTop, 
                    display_text: n,
                    // [FIX 1] ใส่ rate_pay
                    rate_pay: Number(getRateVal(currentRates['3top'], 'pay'))
                 });
                 if (pBottom > 0) newItems.push({ 
                    temp_id: uuidv4(), 
                    number: n, 
                    bet_type: '3tod', 
                    amount: pBottom, 
                    display_text: n,
                    // [FIX 1] ใส่ rate_pay
                    rate_pay: Number(getRateVal(currentRates['3tod'], 'pay'))
                 });
             } else if (tab === 'run') {
                 if (pTop > 0) newItems.push({ 
                    temp_id: uuidv4(), 
                    number: n, 
                    bet_type: 'run_up', 
                    amount: pTop, 
                    display_text: n,
                    // [FIX 1] ใส่ rate_pay
                    rate_pay: Number(getRateVal(currentRates['run_up'], 'pay'))
                 });
                 if (pBottom > 0) newItems.push({ 
                    temp_id: uuidv4(), 
                    number: n, 
                    bet_type: 'run_down', 
                    amount: pBottom, 
                    display_text: n,
                    // [FIX 1] ใส่ rate_pay
                    rate_pay: Number(getRateVal(currentRates['run_down'], 'pay'))
                 });
             }
          });
      });

      if(newItems.length === 0) {
          return toast.error("ไม่มีรายการที่เพิ่มได้ (อาจเป็นเลขปิดรับทั้งหมด)");
      }

      setCart(prev => [...newItems, ...prev]); 
      setBufferNumbers([]);
      setPriceTop('');
      setPriceBottom('');
      setIsReverse(false);
      if (currentInput && tab === 'win') setCurrentInput('');

      toast.success(`เพิ่ม ${newItems.length} รายการ`);
  };

  // --- Grouping Logic ---
  const getGroupedCartItems = (): GroupedCartItem[] => {
      const groupedByNum = new Map<string, {type: string, amount: number}[]>();
      
      cart.forEach(item => {
          if (!groupedByNum.has(item.number)) groupedByNum.set(item.number, []);
          groupedByNum.get(item.number)?.push({ type: item.bet_type, amount: item.amount });
      });

      const finalGroups = new Map<string, GroupedCartItem>();

      groupedByNum.forEach((bets, num) => {
          const mergedBetsMap = new Map<string, number>();
          bets.forEach(b => {
              mergedBetsMap.set(b.type, (mergedBetsMap.get(b.type) || 0) + b.amount);
          });
          
          const mergedBets: {type: string, amount: number}[] = [];
          mergedBetsMap.forEach((amt, type) => {
              mergedBets.push({ type, amount: amt });
          });
          mergedBets.sort((a, b) => a.type.localeCompare(b.type));
          
          const sig = mergedBets.map(b => `${b.type}-${b.amount}`).join('|');
          
          if (!finalGroups.has(sig)) {
              const typesArr: string[] = [];
              const pricesArr: number[] = [];
              let labelGroup = "หวย";

              mergedBets.forEach(b => {
                 typesArr.push(b.type);
                 pricesArr.push(b.amount);
              });

              if (typesArr.some(t => t.includes('2') || t.includes('19'))) labelGroup = "2 ตัว";
              else if (typesArr.some(t => t.includes('3'))) labelGroup = "3 ตัว";
              else if (typesArr.some(t => t.includes('run'))) labelGroup = "เลขวิ่ง";

              const typeLabels = typesArr.map(t => {
                  if(t === '2up') return 'บน';
                  if(t === '2down') return 'ล่าง';
                  if(t === '3top') return '3บน';
                  if(t === '3tod') return '3โต๊ด';
                  if(t === 'run_up') return 'วิ่งบน';
                  if(t === 'run_down') return 'วิ่งล่าง';
                  return t;
              });
              
              const priceLabelStr = `${typeLabels.join(' + ')}\n${pricesArr.join(' + ')}`;
              const totalPerNum = pricesArr.reduce((a,b)=>a+b, 0);

              finalGroups.set(sig, {
                  id: sig,
                  numbers: [num],
                  types: typesArr,
                  prices: pricesArr,
                  totalAmount: totalPerNum, 
                  label: labelGroup,
                  priceLabel: priceLabelStr
              });
          } else {
              finalGroups.get(sig)?.numbers.push(num);
          }
      });

      return Array.from(finalGroups.values()).map(g => ({
          ...g,
          totalAmount: g.totalAmount * g.numbers.length
      }));
  };

  const deleteGroup = (group: GroupedCartItem) => {
      setCart(prev => prev.filter(item => {
          const isNumInGroup = group.numbers.includes(item.number);
          const isTypeInGroup = group.types.includes(item.bet_type);
          if (isNumInGroup && isTypeInGroup) return false;
          return true;
      }));
  };

  const submitTicket = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    const toastId = toast.loading('กำลังส่งโพย...');
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
        toast.dismiss(toastId);
        toast.success(`ส่งโพยสำเร็จ! รหัส: ${res.data.id.slice(0, 8)}`, { duration: 4000 });
        setCart([]);
        setNote('');
        navigate('/history');
    } catch (err: any) {
        console.error(err);
        toast.dismiss(toastId);
        toast.error(err.response?.data?.detail || 'ส่งโพยไม่สำเร็จ');
    } finally {
        setIsSubmitting(false);
    }
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.amount, 0);
  const groupedItems = getGroupedCartItems();
  const labels = tab === '3' ? { top: '3 ตัวบน', bottom: '3 ตัวโต๊ด' } : (tab === 'run' ? { top: 'วิ่งบน', bottom: 'วิ่งล่าง' } : { top: 'บน', bottom: 'ล่าง' });

  if(loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-500 w-10 h-10"/></div>;
  if(!lotto) return null;

  // [FIX 2] ลบ fallback ของ rateProfile ออก เพราะใช้ lotto.rates โดยตรงแล้ว
  const activeRates = lotto.rates || {};

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden font-sans">
      
      <div className="flex flex-1 overflow-hidden relative">
          
          {/* ================= CENTER COLUMN ================= */}
          <div className="flex-1 overflow-y-auto pb-20 bg-white"> 
             <div className="p-4 max-w-4xl mx-auto space-y-4">
                
                {/* Header Navigation */}
                <button onClick={() => navigate('/play')} className="flex items-center gap-1 text-gray-500 hover:text-gray-800 text-sm mb-2">
                    <ArrowLeft size={16} /> กลับไปหน้าตลาด
                </button>

                {/* Header Info Card */}
                <div className="bg-[#E0F7FA] border border-[#B2DFDB] rounded-lg p-3 flex justify-between items-center shadow-sm">
                    <div>
                        <h2 className="font-bold text-gray-800 text-lg">{lotto.name}</h2>
                        <div className="text-xs text-gray-600 mt-1">ปิดรับ <span className="font-bold text-red-500">{lotto.close_time?.substring(0,5)} น.</span></div>
                    </div>
                    <div className="text-right">
                        <div className="font-bold text-gray-800">งวดวันที่</div>
                        <div className="text-sm font-bold text-blue-600">{new Date().toLocaleDateString('th-TH')}</div>
                    </div>
                </div>

                {/* Main Betting Card */}
                <div className="bg-[#F8FAFC] border border-gray-200 rounded-lg p-4 shadow-sm relative">
                    
                    {/* Tabs */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        {[
                            { id: '2', label: '2 ตัว' },
                            { id: '3', label: '3 ตัว' },
                            { id: '19', label: '19 ประตู' },
                            { id: 'run', label: 'เลขวิ่ง' },
                            { id: 'win', label: 'วินเลข' }
                        ].map((t) => (
                            <button 
                                key={t.id}
                                onClick={() => setTab(t.id as any)}
                                className={`px-4 py-1.5 rounded-md text-sm font-bold border transition-colors ${
                                    tab === t.id 
                                    ? 'bg-[#2ECC71] text-white border-[#27AE60] shadow-sm' 
                                    : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Mode Selector for Win */}
                    {tab === 'win' && (
                        <div className="flex gap-1 mb-4 bg-white p-1 rounded-md border border-green-200 w-fit">
                            <button
                                onClick={() => setWinMode('2')}
                                className={`px-4 py-1 rounded text-xs font-bold transition-all ${
                                    winMode === '2' ? 'bg-[#2ECC71] text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'
                                }`}
                            >
                                วิน 2 ตัว
                            </button>
                            <button
                                onClick={() => setWinMode('3')}
                                className={`px-4 py-1 rounded text-xs font-bold transition-all ${
                                    winMode === '3' ? 'bg-[#2ECC71] text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'
                                }`}
                            >
                                วิน 3 ตัว
                            </button>
                        </div>
                    )}

                    {/* ปุ่มยกเลิก Buffer */}
                    <div className="flex justify-end mb-2">
                        <button 
                            onClick={() => setBufferNumbers([])}
                            disabled={bufferNumbers.length === 0}
                            className="text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-md text-xs flex items-center gap-1 transition-colors disabled:opacity-50"
                        >
                            <Trash2 size={14} /> ล้างเลขที่เลือก
                        </button>
                    </div>

                    {/* Buffer Area */}
                    {bufferNumbers.length > 0 && (
                        <div className="bg-white rounded-lg p-3 mb-3 border border-gray-200 min-h-12 max-h-32 overflow-y-auto">
                            <div className="flex flex-wrap gap-2">
                                {bufferNumbers.map((n, idx) => (
                                    <span key={idx} className="bg-[#2ECC71] text-white px-2 py-1 rounded text-sm font-bold shadow-sm">
                                        {n}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Quick Options */}
                    <div className="flex flex-wrap gap-2 mb-4">
                         {tab === '2' && (
                            <>
                                <button onClick={() => handleQuickOption('double')} className="bg-[#2ECC71] text-white px-3 py-1.5 rounded-md text-xs font-bold hover:bg-[#27AE60]">+ เลขเบิ้ล</button>
                                <button onClick={() => handleQuickOption('sibling')} className="bg-[#E67E22] text-white px-3 py-1.5 rounded-md text-xs font-bold hover:bg-[#D35400]">+ พี่น้อง</button>
                            </>
                         )}
                         {tab === '3' && (
                            <>
                                <button onClick={() => handleQuickOption('triple')} className="bg-[#2ECC71] text-white px-3 py-1.5 rounded-md text-xs font-bold">+ ตอง</button>
                                <button onClick={() => handleQuickOption('double_front')} className="bg-[#1E88E5] text-white px-3 py-1.5 rounded-md text-xs font-bold">+ เบิ้ลหน้า</button>
                                <button onClick={() => handleQuickOption('sandwich')} className="bg-[#8E24AA] text-white px-3 py-1.5 rounded-md text-xs font-bold">+ หาม</button>
                                <button onClick={() => handleQuickOption('double_back')} className="bg-[#00897B] text-white px-3 py-1.5 rounded-md text-xs font-bold">+ เบิ้ลหลัง</button>
                            </>
                         )}
                         {tab === '19' && (
                            <button onClick={() => handleQuickOption('double')} className="bg-[#2ECC71] text-white px-3 py-1.5 rounded-md text-xs font-bold hover:bg-[#27AE60]">+ รูดเบิ้ล</button>
                         )}
                    </div>
                    
                    {/* Input Row */}
                    <div className="bg-[#DCF8C6] p-3 rounded-lg border border-[#C5E1A5] flex flex-col md:flex-row gap-2 items-center">
                        <div className="flex-1 w-full">
                            <label className="text-xs text-gray-500 font-bold mb-1 block md:hidden">ใส่เลข</label>
                            <input 
                                type="tel" 
                                value={currentInput}
                                onChange={e => setCurrentInput(e.target.value.replace(/[^0-9]/g, ''))}
                                placeholder={tab === 'win' ? "ใส่เลขวิน (กด + เพื่อรวม)" : "ใส่เลข"}
                                className="w-full bg-[#E0F2F1] border-b-2 border-blue-400 text-center text-xl font-bold py-1 focus:outline-none focus:border-blue-600 text-gray-700 placeholder-blue-300"
                                maxLength={getInputConfig().max}
                                autoFocus
                            />
                        </div>

                        {tab === '2' && (
                            <button 
                                onClick={() => setIsReverse(!isReverse)}
                                className={`px-4 py-2 rounded-md text-white font-bold text-sm transition-colors w-full md:w-auto h-full ${isReverse ? 'bg-[#E67E22] shadow-inner' : 'bg-[#F39C12] hover:bg-[#E67E22]'}`}
                            >
                                {isReverse ? 'กลับเลข (On)' : 'กลับเลข'}
                            </button>
                        )}

                        <div className="flex gap-2 w-full md:w-auto">
                            <div className="flex-1">
                                <label className="text-xs text-gray-500 font-bold mb-1 block md:hidden text-center">{labels.top}</label>
                                <input 
                                    type="tel" 
                                    value={priceTop}
                                    onChange={e => setPriceTop(e.target.value)}
                                    placeholder={labels.top}
                                    className="w-full md:w-20 bg-[#E0F2F1] border-b-2 border-gray-400 text-center font-bold py-1 focus:outline-none focus:border-gray-600 text-gray-700"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-xs text-gray-500 font-bold mb-1 block md:hidden text-center">{labels.bottom}</label>
                                <input 
                                    type="tel" 
                                    value={priceBottom}
                                    onChange={e => setPriceBottom(e.target.value)}
                                    placeholder={labels.bottom}
                                    className="w-full md:w-20 bg-[#E0F2F1] border-b-2 border-gray-400 text-center font-bold py-1 focus:outline-none focus:border-gray-600 text-gray-700"
                                />
                            </div>
                        </div>

                        <button 
                            onClick={handleAddBill}
                            className="bg-[#2ECC71] hover:bg-[#27AE60] text-white font-bold px-6 py-2 rounded-md shadow-md active:scale-95 transition-all flex items-center gap-1 w-full md:w-auto justify-center"
                        >
                            <span className="text-lg">+</span> เพิ่มบิล
                        </button>
                    </div>

                </div>

                {/* Cart List */}
                {groupedItems.length > 0 && (
                    <div className="mt-6 space-y-4 animate-fade-in">
                        <div className="flex flex-col gap-3">
                            {groupedItems.map((group) => (
                                <div key={group.id} className="bg-gray-50 rounded-md border border-gray-200 overflow-hidden flex shadow-sm">
                                    {/* Left: Info */}
                                    <div className="w-28 md:w-36 bg-white border-r border-gray-200 p-3 flex flex-col justify-center items-center text-center shrink-0">
                                        <div className="font-bold text-gray-800 text-sm mb-1">{group.label}</div>
                                        <div className="text-xs font-bold text-blue-600 whitespace-pre-line leading-relaxed">
                                            {group.priceLabel}
                                        </div>
                                    </div>
                                    
                                    {/* Middle: Numbers */}
                                    <div className="flex-1 p-3 flex flex-wrap content-center gap-2 bg-white">
                                        {group.numbers.map((num, idx) => (
                                            <span key={idx} className="font-mono text-gray-800 text-sm font-bold bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 relative">
                                                {num}
                                                {/* Badge จ่ายครึ่ง */}
                                                {risks.some(r => r.number === num && r.risk_type === 'HALF') && (
                                                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                                                    </span>
                                                )}
                                            </span>
                                        ))}
                                    </div>
                                    
                                    {/* Right: Delete */}
                                    <div className="w-12 bg-white border-l border-gray-200 flex items-center justify-center shrink-0">
                                        <button 
                                            onClick={() => deleteGroup(group)}
                                            className="text-red-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Footer Summary */}
                <div className="mt-8 mb-10">
                     <div className="flex items-center gap-2 mb-6">
                        <span className="font-bold text-gray-800 whitespace-nowrap">หมายเหตุ:</span>
                        <input 
                            type="text" 
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            placeholder="บันทึกช่วยจำ (ถ้ามี)"
                            className="flex-1 border-b border-gray-300 focus:border-blue-500 outline-none px-2 py-1 bg-transparent text-sm"
                        />
                     </div>
                     
                     <div className="text-center">
                        <h2 className="text-3xl font-bold text-gray-800 mb-6">รวม: {totalAmount.toLocaleString()} บาท</h2>
                        
                        <div className="flex justify-center gap-3">
                            <button 
                                onClick={submitTicket}
                                disabled={isSubmitting || cart.length === 0}
                                className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg flex items-center gap-2 transition-all w-full md:w-auto justify-center ${
                                    isSubmitting || cart.length === 0 
                                    ? 'bg-gray-400 cursor-not-allowed' 
                                    : 'bg-[#2962FF] hover:bg-blue-700 hover:scale-105 active:scale-95'
                                }`}
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />}
                                บันทึกโพย
                            </button>
                        </div>
                     </div>
                </div>

             </div>
          </div>

          {/* ================= RIGHT COLUMN: RATES & RISKS ================= */}
          <div className="hidden lg:flex w-80 bg-[#1e293b] text-white border-l border-gray-700 flex-col shadow-xl z-10 overflow-y-auto">
               
               {/* Header */}
               <div className="p-4 bg-[#0f172a] border-b border-gray-700 flex justify-between items-center">
                   <div>
                       <h3 className="font-bold text-lg text-blue-400">อัตราจ่าย</h3>
                   </div>
               </div>
               
               <div className="p-3 space-y-6">
                   
                   {/* 1. ตารางเรทราคา */}
                   <div className="bg-[#1e293b] rounded-lg overflow-hidden border border-gray-700">
                       <table className="w-full text-xs text-center">
                           <thead className="bg-[#334155] text-white font-bold">
                               <tr>
                                   <th className="p-2 text-left pl-3">ประเภท</th>
                                   <th className="p-2 text-green-400">จ่าย</th>
                                   <th className="p-2 text-gray-300">ต่ำ</th>
                                   <th className="p-2 text-blue-300">สูง</th>
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-700">
                               {[
                                   { key: '3top', label: '3 ตัวบน' },
                                   { key: '3tod', label: '3 ตัวโต๊ด' },
                                   { key: '2up', label: '2 ตัวบน' },
                                   { key: '2down', label: '2 ตัวล่าง' },
                                   { key: 'run_up', label: 'วิ่งบน' },
                                   { key: 'run_down', label: 'วิ่งล่าง' },
                               ].map((t) => {
                                   const rate = activeRates[t.key];
                                   const pay = getRateVal(rate, 'pay');
                                   const min = getRateVal(rate, 'min');
                                   const max = getRateVal(rate, 'max');

                                   return (
                                       <tr key={t.key} className="hover:bg-gray-800 transition-colors">
                                           <td className="p-2 text-left pl-3 text-gray-300 font-medium">{t.label}</td>
                                           <td className="p-2 text-green-400 font-bold">{Number(pay).toLocaleString()}</td>
                                           <td className="p-2 text-gray-400">{Number(min).toLocaleString()}</td>
                                           <td className="p-2 text-blue-300">
                                               {max !== '-' ? Number(max).toLocaleString() : '∞'}
                                           </td>
                                       </tr>
                                   );
                               })}
                           </tbody>
                       </table>
                   </div>

                   {/* 2. เลขอั้น / เลขปิดรับ */}
                   <div>
                       <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1">
                           <Settings2 size={12}/> เลขอั้น / ปิดรับ
                       </h4>
                       <div className="bg-[#0f172a] rounded-lg border border-gray-700 p-3 min-h-25">
                           {risks.length === 0 ? (
                               <div className="text-center text-gray-500 text-xs py-4">
                                   ✅ ไม่มีเลขอั้น
                               </div>
                           ) : (
                               <div className="space-y-3">
                                   {/* เลขปิดรับ */}
                                   {risks.filter(r => r.risk_type === 'CLOSE').length > 0 && (
                                       <div>
                                           <div className="text-[10px] font-bold text-red-500 mb-1">⛔ ปิดรับ (ห้ามแทง)</div>
                                           <div className="flex flex-wrap gap-1">
                                               {risks.filter(r => r.risk_type === 'CLOSE').map(r => (
                                                   <span key={r.id} className="bg-red-500/10 text-red-500 border border-red-500/20 px-1.5 py-0.5 rounded text-[10px] font-mono">
                                                       {r.number}
                                                   </span>
                                               ))}
                                           </div>
                                       </div>
                                   )}

                                   {/* เลขอั้น */}
                                   {risks.filter(r => r.risk_type !== 'CLOSE').length > 0 && (
                                       <div>
                                           <div className="text-[10px] font-bold text-orange-400 mb-1">⚠️ จ่ายครึ่ง / อั้น</div>
                                           <div className="flex flex-wrap gap-1">
                                               {risks.filter(r => r.risk_type !== 'CLOSE').map(r => (
                                                   <span key={r.id} className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-1.5 py-0.5 rounded text-[10px] font-mono">
                                                       {r.number}
                                                   </span>
                                               ))}
                                           </div>
                                       </div>
                                   )}
                               </div>
                           )}
                       </div>
                   </div>

               </div>
          </div>
      </div>
    </div>
  );
}