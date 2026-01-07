import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../../api/client';
import { v4 as uuidv4 } from 'uuid';
import { 
  Trash2, Loader2, 
  Camera, Save,
  Settings2
} from 'lucide-react';
import { type CartItem } from '../../types/lotto';
import { generateNumbers } from '../../types/lottoLogic'; // ใช้แค่ generateNumbers พื้นฐาน
import toast from 'react-hot-toast';

// --- Types & Helpers ---
type GroupedCartItem = {
  id: string; 
  numbers: string[];
  types: string[]; 
  prices: number[]; // เปลี่ยนเป็น array เพื่อ map 1:1 กับ types
  totalAmount: number;
  label: string; 
  priceLabel: string;
};

const reverseNumber = (num: string) => {
    if (num.length === 2) return num.split('').reverse().join('');
    return num;
};

export default function BettingRoom() {
  const { id } = useParams(); 
  const navigate = useNavigate();
  
  // Data State
  const [lotto, setLotto] = useState<any>(null);
  const [risks, setRisks] = useState<any[]>([]);
  const [rateProfile, setRateProfile] = useState<any>(null);
  
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
  const [isLoading, setIsLoading] = useState(false);

  // --- 1. Fetch Data ---
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
            } else { navigate('/play'); }
            const resRisks = await client.get(`/play/risks/${id}`);
            setRisks(resRisks.data);
        } catch (err) { console.error("Load data error", err); }
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
      // ปรับ max ของวินให้เยอะเข้าไว้ เพราะเราจะไม่ Auto-add แล้ว
      if (tab === 'win') return { max: 10, min: (winMode === '2' ? 2 : 3) };
      if (tab === '3') return { max: 3, min: 3 };
      if (tab === '2') return { max: 2, min: 2 };
      if (tab === '19') return { max: 1, min: 1 };
      return { max: 1, min: 1 }; 
  };

  const handleAddNumberToBuffer = (manualNum?: string) => {
      const numToAdd = manualNum || currentInput;
      if (!numToAdd) return;

      const config = getInputConfig();
      // เช็คความยาวขั้นต่ำ (ยกเว้นวินที่อาจจะยืดหยุ่นกว่า แต่ต้องไม่ต่ำกว่า min)
      if (numToAdd.length < config.min) {
           return toast.error(`กรุณาระบุตัวเลขอย่างน้อย ${config.min} ตัว`);
      }

      let numbersToAdd: string[] = [numToAdd];
      
      // Logic แตกตัวเลข
      if (tab === '19') {
          // 19 ประตู (รูดหน้า+หลัง)
          numbersToAdd = generateNumbers(numToAdd, '19gate');
      } else if (tab === 'win') {
          // วินเลข (Win)
          const mode = winMode === '2' ? 'win2' : 'win3';
          numbersToAdd = generateNumbers(numToAdd, mode);
          if(numbersToAdd.length === 0) return toast.error("จับวินไม่ได้ (เลขซ้ำหรือจำนวนไม่พอ)");
      }

      const newNumbers = numbersToAdd.filter(n => !bufferNumbers.includes(n));
      setBufferNumbers(prev => [...prev, ...newNumbers]);
      setCurrentInput('');
  };

  // Auto Add: ทำงานเฉพาะที่ไม่ใช่โหมด 'win'
  useEffect(() => {
      const config = getInputConfig();
      if (tab !== 'win' && currentInput.length === config.max) {
          handleAddNumberToBuffer();
      }
  }, [currentInput, tab]);

  // --- 1. เพิ่มฟังก์ชัน Quick Option (เบิ้ลหน้า/หลัง/หาม/19ประตู) ---
  const handleQuickOption = (type: string) => {
      let list: string[] = [];
      
      // 2 ตัว
      if (tab === '2' || tab === '19') {
          if (type === 'double') { // เบิ้ล 00-99
             for(let i=0; i<10; i++) list.push(`${i}${i}`);
          }
          if (type === 'sibling' && tab === '2') { // พี่น้อง 01, 12...
             const siblings = ['01','12','23','34','45','56','67','78','89','90','09','98','87','76','65','54','43','32','21','10'];
             list = [...siblings];
          }
      }

      // 3 ตัว
      if (tab === '3') {
          if (type === 'triple') { // ตอง 000-999
              for(let i=0; i<10; i++) list.push(`${i}${i}${i}`);
          }
          if (type === 'double_front') { // เบิ้ลหน้า (AAB) เช่น 110, 225
              for(let i=0; i<10; i++) {
                  for(let j=0; j<10; j++) {
                     if (i !== j) list.push(`${i}${i}${j}`);
                  }
              }
          }
          if (type === 'double_back') { // เบิ้ลหลัง (ABB) เช่น 011, 522
              for(let i=0; i<10; i++) {
                  for(let j=0; j<10; j++) {
                     if (i !== j) list.push(`${i}${j}${j}`);
                  }
              }
          }
          if (type === 'sandwich') { // หาม (ABA) เช่น 101, 525
              for(let i=0; i<10; i++) {
                  for(let j=0; j<10; j++) {
                     if (i !== j) list.push(`${i}${j}${i}`);
                  }
              }
          }
      }

      if (list.length > 0) {
          const newNumbers = list.filter(n => !bufferNumbers.includes(n));
          setBufferNumbers(prev => [...prev, ...newNumbers]);
          toast.success(`เพิ่ม ${newNumbers.length} รายการ`);
      }
  };

  const handleAddBill = () => {
      // ถ้ามีเลขค้างใน Input (เช่นพิมพ์วินค้างไว้) ให้เอาไปรวมด้วย
      if (currentInput && tab === 'win') {
          handleAddNumberToBuffer();
          // รอ useEffect หรือ state update รอบหน้า? ไม่ได้เพราะ state เป็น async
          // ในที่นี้ต้องระวังนิดนึง แต่วิธีที่ง่ายคือ user ต้องกด + ที่ input ก่อน
          // หรือ ถ้า user กดเพิ่มบิลเลย ให้เตือนถ้า buffer ว่าง
      }

      if (bufferNumbers.length === 0) return toast.error("กรุณาระบุตัวเลข");
      if (!priceTop && !priceBottom) return toast.error("กรุณาระบุราคาอย่างน้อย 1 ช่อง");

      const pTop = Number(priceTop) || 0;
      const pBottom = Number(priceBottom) || 0;
      const newItems: CartItem[] = [];

      bufferNumbers.forEach(num => {
          const isRisk = risks.find(r => r.number === num && r.risk_type === 'CLOSE');
          if (isRisk) return;

          const numsToProcess = isReverse && tab === '2' 
            ? Array.from(new Set([num, reverseNumber(num)])) 
            : [num];

          numsToProcess.forEach(n => {
             // Logic การจับคู่ Tab -> BetType
             if (tab === '2' || tab === '19' || (tab === 'win' && winMode === '2')) {
                 if (pTop > 0) newItems.push({ temp_id: uuidv4(), number: n, bet_type: '2up', amount: pTop, display_text: n });
                 if (pBottom > 0) newItems.push({ temp_id: uuidv4(), number: n, bet_type: '2down', amount: pBottom, display_text: n });
             } else if (tab === '3' || (tab === 'win' && winMode === '3')) {
                 if (pTop > 0) newItems.push({ temp_id: uuidv4(), number: n, bet_type: '3top', amount: pTop, display_text: n });
                 if (pBottom > 0) newItems.push({ temp_id: uuidv4(), number: n, bet_type: '3tod', amount: pBottom, display_text: n });
             } else if (tab === 'run') {
                 if (pTop > 0) newItems.push({ temp_id: uuidv4(), number: n, bet_type: 'run_up', amount: pTop, display_text: n });
                 if (pBottom > 0) newItems.push({ temp_id: uuidv4(), number: n, bet_type: 'run_down', amount: pBottom, display_text: n });
             }
          });
      });

      setCart(prev => [...newItems, ...prev]); 
      setBufferNumbers([]);
      setPriceTop('');
      setPriceBottom('');
      setIsReverse(false);
      toast.success('เพิ่มรายการเรียบร้อย');
  };

  // --- Grouping Logic for Cart Display (ฉบับแก้ไข: รวมยอดเงินก่อนจัดกลุ่ม) ---
  const getGroupedCartItems = (): GroupedCartItem[] => {
      const groupedByNum = new Map<string, {type: string, amount: number}[]>();
      
      // 1. จัดของใส่ตะกร้าแยกตามเลขก่อน
      cart.forEach(item => {
          if (!groupedByNum.has(item.number)) groupedByNum.set(item.number, []);
          groupedByNum.get(item.number)?.push({ type: item.bet_type, amount: item.amount });
      });

      const finalGroups = new Map<string, GroupedCartItem>();

      groupedByNum.forEach((bets, num) => {
          // 2. [NEW] รวมยอดเงินของประเภทเดียวกัน (Merge Duplicate Types)
          // เช่น มี 2up:10 และ 2up:5 -> รวมเป็น 2up:15
          const mergedBetsMap = new Map<string, number>();
          bets.forEach(b => {
              mergedBetsMap.set(b.type, (mergedBetsMap.get(b.type) || 0) + b.amount);
          });
          
          const mergedBets: {type: string, amount: number}[] = [];
          mergedBetsMap.forEach((amt, type) => {
              mergedBets.push({ type, amount: amt });
          });

          // 3. Sort เพื่อให้ลำดับตรงกัน (เช่น บนมาก่อนล่างเสมอ)
          mergedBets.sort((a, b) => a.type.localeCompare(b.type));
          
          // 4. สร้าง Signature จากยอดที่รวมแล้ว
          const sig = mergedBets.map(b => `${b.type}-${b.amount}`).join('|');
          
          if (!finalGroups.has(sig)) {
              // แปลง Type เป็น Label ภาษาไทย
              const typesArr: string[] = [];
              const pricesArr: number[] = [];
              let labelGroup = "หวย";

              mergedBets.forEach(b => {
                 typesArr.push(b.type);
                 pricesArr.push(b.amount);
              });

              // หา Label หลัก
              if (typesArr.some(t => t.includes('2') || t.includes('19'))) labelGroup = "2 ตัว";
              else if (typesArr.some(t => t.includes('3'))) labelGroup = "3 ตัว";
              else if (typesArr.some(t => t.includes('run'))) labelGroup = "เลขวิ่ง";

              // สร้าง Price Label
              const typeLabels = typesArr.map(t => {
                  if(t.includes('up') || t.includes('top')) return t.includes('3') ? '3บน' : (t.includes('run')?'วิ่งบน':'บน');
                  if(t.includes('down') || t.includes('tod')) return t.includes('tod') ? '3โต๊ด' : (t.includes('run')?'วิ่งล่าง':'ล่าง');
                  return t;
              });
              
              const priceLabelStr = `${typeLabels.join(' x ')}\n${pricesArr.join(' x ')}`;
              const totalPerNum = pricesArr.reduce((a,b)=>a+b, 0);

              finalGroups.set(sig, {
                  id: sig,
                  numbers: [num],
                  types: typesArr,
                  prices: pricesArr, // ตรงนี้คือราคาต่อหน่วยที่รวมแล้ว
                  totalAmount: totalPerNum, 
                  label: labelGroup,
                  priceLabel: priceLabelStr
              });
          } else {
              finalGroups.get(sig)?.numbers.push(num);
          }
      });

      // คืนค่าพร้อมคำนวณยอดรวมทั้งหมด (ราคาต่อชุด x จำนวนเลข)
      return Array.from(finalGroups.values()).map(g => ({
          ...g,
          totalAmount: g.totalAmount * g.numbers.length
      }));
  };

  const deleteGroup = (group: GroupedCartItem) => {
      // ลบรายการทั้งหมดที่ เลข และ ประเภท ตรงกับกลุ่มนี้ (ไม่เช็คราคาเป๊ะๆ เพราะราคามันถูกรวมไปแล้ว)
      setCart(prev => prev.filter(item => {
          const isNumInGroup = group.numbers.includes(item.number);
          const isTypeInGroup = group.types.includes(item.bet_type);
          
          // ถ้าเลขอยู่ในกลุ่ม และประเภทการแทงอยู่ในกลุ่ม -> ลบทิ้ง (return false)
          if (isNumInGroup && isTypeInGroup) {
              return false;
          }
          return true; // เก็บไว้
      }));
  };

  const submitTicket = async () => {
    if (cart.length === 0) return;
    setIsLoading(true);
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
        setIsLoading(false);
    }
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.amount, 0);
  const groupedItems = getGroupedCartItems();
  const labels = tab === '3' ? { top: '3 ตัวบน', bottom: '3 ตัวโต๊ด' } : (tab === 'run' ? { top: 'วิ่งบน', bottom: 'วิ่งล่าง' } : { top: 'บน', bottom: 'ล่าง' });

  if(!lotto) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto"/></div>;

  const getRateVal = (rateObj: any, field: string) => {
    if (!rateObj) return '-';
    // กรณีข้อมูลเป็น Object แบบใหม่
    if (typeof rateObj === 'object') {
        const val = rateObj[field];
        // ถ้า field เป็น pay แล้วไม่มีค่า ให้คืน 0, ถ้า min คืน 1
        if (field === 'pay') return val || 0;
        if (field === 'min') return val || 1;
        if (field === 'max') return val || '-'; // ถ้าไม่ตั้ง max คือไม่อั้นไม้
        return val;
    }
    // กรณีข้อมูลเก่า (เก็บแค่ราคาจ่ายเป็นตัวเลขเพียวๆ)
    if (field === 'pay') return rateObj;
    if (field === 'min') return 1;
    return '-';
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden font-sans">
      
      <div className="flex flex-1 overflow-hidden relative">
          
          {/* ================= CENTER COLUMN ================= */}
          <div className="flex-1 overflow-y-auto pb-20 bg-white"> 
             <div className="p-4 max-w-4xl mx-auto space-y-4">
                
                {/* Header Info Card */}
                <div className="bg-[#E0F7FA] border border-[#B2DFDB] rounded-lg p-3 flex justify-between items-center shadow-sm">
                    <div>
                        <h2 className="font-bold text-gray-800 text-lg">{lotto.name}</h2>
                        <div className="text-xs text-gray-600 mt-1">อัตราจ่าย <span className="font-bold">100 อัตราจ่ายเริ่มต้น</span></div>
                    </div>
                    <div className="text-right">
                        <div className="font-bold text-gray-800">03-01-2026</div>
                        {lotto.img_url && <img src={lotto.img_url} alt="flag" className="w-8 h-5 object-cover mt-1 ml-auto shadow-sm" />}
                    </div>
                </div>

                {/* Main Betting Card */}
                <div className="bg-[#E0F7FA] border border-[#B2DFDB] rounded-lg p-4 shadow-sm relative">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="font-bold text-gray-800 text-lg">แทงเร็ว</h3>
                            <div className="text-sm font-bold text-gray-700 mt-1">{lotto.name}</div>
                        </div>
                        <div className="text-right">
                             <div className="font-bold text-gray-800">03-01-2026</div>
                             {lotto.img_url && <img src={lotto.img_url} alt="flag" className="w-10 h-6 object-cover mt-1 ml-auto shadow-sm" />}
                        </div>
                    </div>

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

                    {/* ✅ เพิ่มส่วนนี้เข้าไปครับ: ปุ่มเลือกโหมดวิน (แสดงเฉพาะตอนเลือกวิน) */}
                    {tab === 'win' && (
                        <div className="flex gap-1 mb-4 bg-white p-1 rounded-md border border-green-200 w-fit">
                            <button
                                onClick={() => setWinMode('2')}
                                className={`px-4 py-1 rounded text-xs font-bold transition-all ${
                                    winMode === '2' 
                                    ? 'bg-[#2ECC71] text-white shadow-sm' 
                                    : 'text-gray-500 hover:bg-gray-100'
                                }`}
                            >
                                วิน 2 ตัว
                            </button>
                            <button
                                onClick={() => setWinMode('3')}
                                className={`px-4 py-1 rounded text-xs font-bold transition-all ${
                                    winMode === '3' 
                                    ? 'bg-[#2ECC71] text-white shadow-sm' 
                                    : 'text-gray-500 hover:bg-gray-100'
                                }`}
                            >
                                วิน 3 ตัว
                            </button>
                        </div>
                    )}

                    {/* ปุ่มยกเลิก */}
                    <div className="flex justify-end mb-2">
                        <button 
                            onClick={() => setBufferNumbers([])}
                            className="bg-[#EF5350] hover:bg-red-600 text-white px-3 py-1.5 rounded-md text-xs flex items-center gap-1 shadow-sm transition-colors"
                        >
                            <Trash2 size={14} /> ยกเลิก
                        </button>
                    </div>

                    {/* Buffer Area */}
                    {bufferNumbers.length > 0 && (
                        <div className="bg-white rounded-lg p-3 mb-3 border border-gray-200 min-h-15 max-h-37.5 overflow-y-auto">
                            <div className="flex flex-wrap gap-2">
                                {bufferNumbers.map((n, idx) => (
                                    <span key={idx} className="bg-[#2ECC71] text-white px-2 py-1 rounded text-sm font-bold shadow-sm">
                                        {n}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Quick Options (เพิ่มครบตามสั่ง) */}
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
                         {/* เพิ่มปุ่มเบิ้ลของ 19 ประตู */}
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
                                placeholder={tab === 'win' ? "ใส่เลขวิน (กด +)" : "ใส่เลข"}
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

                {/* Cart List (Grouping Style Fixed) */}
                {groupedItems.length > 0 && (
                    <div className="mt-6 space-y-4">
                        <div className="flex flex-col gap-3">
                            {groupedItems.map((group) => (
                                <div key={group.id} className="bg-gray-50 rounded-md border border-gray-200 overflow-hidden flex shadow-sm">
                                    {/* Left: Info Label */}
                                    <div className="w-28 md:w-36 bg-white border-r border-gray-200 p-3 flex flex-col justify-center items-center text-center shrink-0">
                                        <div className="font-bold text-gray-800 text-sm mb-1">{group.label}</div>
                                        <div className="text-xs font-bold text-blue-600 whitespace-pre-line leading-relaxed">
                                            {group.priceLabel}
                                        </div>
                                    </div>
                                    
                                    {/* Middle: Numbers */}
                                    <div className="flex-1 p-3 flex flex-wrap content-center gap-2 bg-white">
                                        {group.numbers.map((num, idx) => (
                                            <span key={idx} className="font-mono text-gray-800 text-sm font-bold bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                                {num}
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
                            className="flex-1 border-b border-gray-300 focus:border-blue-500 outline-none px-2 py-1 bg-transparent text-sm"
                        />
                     </div>
                     
                     <div className="text-center">
                        <h2 className="text-3xl font-bold text-gray-800 mb-6">รวม: {totalAmount.toLocaleString()} บาท</h2>
                        
                        <div className="flex justify-center gap-3">
                            <button className="bg-[#2ECC71] hover:bg-[#27AE60] text-white px-5 py-2 rounded-md font-bold flex items-center gap-2 shadow-sm transition-colors">
                                <Camera size={20} /> Screenshot
                            </button>
                            <button 
                                onClick={submitTicket}
                                disabled={isLoading || cart.length === 0}
                                className={`px-8 py-2 rounded-md font-bold text-white shadow-sm flex items-center gap-2 transition-all ${
                                    isLoading || cart.length === 0 
                                    ? 'bg-gray-400 cursor-not-allowed' 
                                    : 'bg-[#2962FF] hover:bg-blue-700'
                                }`}
                            >
                                {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                บันทึก
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
                       <div className="text-xs text-gray-400 mt-1">{lotto.name}</div>
                   </div>
                   {/* แสดงสถานะปิดรับ */}
                   <div className="text-right">
                        <div className="text-[10px] text-gray-500">ปิดรับ</div>
                        <div className="font-mono text-red-400 font-bold">{lotto.close_time?.substring(0,5) || '-'}</div>
                   </div>
               </div>
               
               <div className="p-3 space-y-6">
                   
                   {/* 1. ตารางเรทราคา (Pay, Min, Max) */}
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
                                   { key: 'run_up', label: 'วิ่งบน' },
                                   { key: 'run_down', label: 'วิ่งล่าง' },
                                   { key: '2up', label: '2 ตัวบน' },
                                   { key: '2down', label: '2 ตัวล่าง' },
                                   { key: '3top', label: '3 ตัวบน' },
                                   { key: '3tod', label: '3 ตัวโต๊ด' },
                               ].map((t) => {
                                   const rate = rateProfile?.rates?.[t.key];
                                   const pay = getRateVal(rate, 'pay');
                                   const min = getRateVal(rate, 'min');
                                   const max = getRateVal(rate, 'max'); // ขั้นสูงต่อไม้

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
                                   {/* เลขปิดรับ (แทงไม่ได้) */}
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

                                   {/* เลขอั้น (จ่ายครึ่ง/จ่ายลด) */}
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