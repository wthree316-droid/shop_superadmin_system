import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as htmlToImage from 'html-to-image';
import client from '../../api/client';
import { v4 as uuidv4 } from 'uuid';
import { 
  Trash2, Loader2, 
  Save, 
  Settings2, ArrowLeft,
  Calculator, 
  Delete,
  History, // [เพิ่ม] ไอคอน History
  FileText,
  Camera
} from 'lucide-react';
import { type CartItem } from '../../types/lotto';
import { generateNumbers, generateSpecialNumbers, generateReturnNumbers } from '../../types/lottoLogic';
import toast from 'react-hot-toast';


// --- Sub-Component: ตัวนับถอยหลัง ---
const CountDownTimer = ({ closeTime }: { closeTime: string }) => {
    const [timeLeft, setTimeLeft] = useState('00:00:00:00');

    useEffect(() => {
        if (!closeTime) return;

        const interval = setInterval(() => {
        const now = new Date();
        const [hours, minutes] = closeTime.split(':').map(Number);
        
        const target = new Date();
        target.setHours(hours, minutes, 0);

        const diff = target.getTime() - now.getTime();

        if (diff <= 0) {
            setTimeLeft("00:00:00:00");
            clearInterval(interval);
            return;
        }

        const h = Math.floor((diff / (1000 * 60 * 60)));
        const m = Math.floor((diff / (1000 * 60)) % 60);
        const s = Math.floor((diff / 1000) % 60);

        const strH = h.toString().padStart(2, '0');
        const strM = m.toString().padStart(2, '0');
        const strS = s.toString().padStart(2, '0');

        setTimeLeft(`${strH}:${strM}:${strS}`);
        }, 10);

        return () => clearInterval(interval);
    }, [closeTime]);

    return (
        <div className="text-red-500 font-bold text-xl animate-pulse">
        เหลือเวลา {timeLeft}
        </div>
    );
};

const getRateVal = (rateObj: any, field: 'pay' | 'min' | 'max') => {
    if (!rateObj) return field === 'min' ? 1 : (field === 'max' ? '-' : 0);
    if (typeof rateObj === 'object') {
        const val = rateObj[field];
        if (field === 'pay') return val || 0;
        if (field === 'min') return val || 1;
        if (field === 'max') return val || '-';
        return val;
    }
    if (field === 'pay') return Number(rateObj);
    if (field === 'min') return 1;
    return '-';
};

// [เพิ่ม] Helper สำหรับแปลงสถานะเป็น Badge
const getStatusBadge = (status: string) => {
    switch(status) {
        case 'WIN': return <span className="bg-green-500/20 text-green-400 text-[10px] px-1.5 py-0.5 rounded border border-green-500/30">ถูกรางวัล</span>;
        case 'LOSE': return <span className="bg-red-500/10 text-red-400 text-[10px] px-1.5 py-0.5 rounded border border-red-500/20">ไม่ถูก</span>;
        case 'CANCELLED': return <span className="bg-gray-500/20 text-gray-400 text-[10px] px-1.5 py-0.5 rounded border border-gray-500/30">ยกเลิก</span>;
        default: return <span className="bg-yellow-500/20 text-yellow-400 text-[10px] px-1.5 py-0.5 rounded border border-yellow-500/30">รอผล</span>;
    }
};

export default function BettingRoom() {
    const { id } = useParams(); 
    const navigate = useNavigate();

    // Data State
    const [lotto, setLotto] = useState<any>(null);
    const [risks, setRisks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // [เพิ่ม] History State
    const [history, setHistory] = useState<any[]>([]);

    // UI State
    const [tab, setTab] = useState<'2' | '3' | '19' | 'run' | 'win'>('2');
    const [winMode, setWinMode] = useState<'2' | '3'>('2'); 

    // Betting Logic State
    const [currentInput, setCurrentInput] = useState('');
    const [bufferNumbers, setBufferNumbers] = useState<string[]>([]);
    const [priceTop, setPriceTop] = useState('');    
    const [priceBottom, setPriceBottom] = useState(''); 

    // Cart & Note
    const [cart, setCart] = useState<CartItem[]>([]);
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- 1. Fetch Data ---
    const fetchData = async () => {
        if(!id) return;
        setLoading(true);
        try {
            const [resLotto, resRisks] = await Promise.all([
                client.get(`/play/lottos/${id}`), 
                client.get(`/play/risks/${id}`)
            ]);
            setLotto(resLotto.data);
            setRisks(resRisks.data);
            
            // [เพิ่ม] เรียกฟังก์ชันดึงประวัติ
            fetchHistory();

        } catch (err) { 
            console.error("Load data error", err);
            toast.error("ไม่พบข้อมูลหวย");
            navigate('/play');
        } finally {
            setLoading(false);
        }
    };

    // [เพิ่ม] ฟังก์ชันดึงประวัติ 15 รายการล่าสุด
    const fetchHistory = async () => {
        if (!id) return;
        try {
            const res = await client.get(`/play/history?limit=15&lotto_type_id=${id}`);
            // ✅ แก้เป็น: เช็คว่าเป็น Array ไหม ถ้าไม่ใช่ให้เป็นว่าง
            setHistory(Array.isArray(res.data) ? res.data : []); 
        } catch (err) {
            console.error("Fetch history error", err);
            setHistory([]); // ✅ กันเหนียวกรณี Error
        }
    };
    // ✅ [เพิ่ม] ฟังก์ชันสำหรับเปลี่ยน Tab แบบมีการแจ้งเตือน
    const handleTabChange = (newTab: typeof tab) => {
        // เช็คว่ามีข้อมูลค้างอยู่ไหม (เลขใน Buffer หรือ เลขที่กำลังพิมพ์)
        const hasData = bufferNumbers.length > 0 || currentInput.length > 0;

        if (hasData && newTab !== tab) {
            const confirmChange = window.confirm("⚠️ มีรายการเลขที่เลือกค้างอยู่\nการเปลี่ยนรูปแบบจะล้างข้อมูลที่เลือกไว้ทั้งหมด\n\nยืนยันที่จะเปลี่ยนหรือไม่?");
            if (!confirmChange) {
                return; // ถ้ากด Cancel ให้หยุด ไม่เปลี่ยน Tab ข้อมูลไม่หาย
            }
        }
        
        // ถ้าไม่มีข้อมูล หรือ กดยืนยัน -> ให้เปลี่ยน Tab ได้
        setTab(newTab);
        // (useEffect ตัวเดิมด้านล่างจะทำงานอัตโนมัติเพื่อล้างข้อมูลให้เอง)
    };

    // ✅ [เพิ่ม] ฟังก์ชันสำหรับเปลี่ยน WinMode (วิน 2/3) แบบมีการแจ้งเตือน
    const handleWinModeChange = (newMode: typeof winMode) => {
        const hasData = bufferNumbers.length > 0 || currentInput.length > 0;

        if (hasData && newMode !== winMode) {
            const confirmChange = window.confirm("⚠️ เปลี่ยนรูปแบบการวินเลข ข้อมูลจะถูกล้าง\nยืนยันหรือไม่?");
            if (!confirmChange) return;
        }
        setWinMode(newMode);
    };

    useEffect(() => {
        fetchData();
    }, [id, navigate]);

    // Reset เมื่อเปลี่ยน Tab
    useEffect(() => {
        setBufferNumbers([]);
        setCurrentInput('');
        setPriceTop('');
        setPriceBottom('');
    }, [tab, winMode]);

    // 2. สร้าง Refs เพื่อเอาไว้ควบคุมช่องกรอกข้อมูล
    const numberInputRef = useRef<HTMLInputElement>(null);
    const priceTopRef = useRef<HTMLInputElement>(null);
    const priceBottomRef = useRef<HTMLInputElement>(null);
    const addButtonRef = useRef<HTMLButtonElement>(null);

    // 3. Auto Focus: เมื่อเปลี่ยน Tab หรือ WinMode ให้เด้งไปช่อง "ใส่เลข" เสมอ
    useEffect(() => {
        if (loading) return;
        // ใช้ setTimeout เล็กน้อยเพื่อให้ DOM Render เสร็จก่อนค่อย Focus
        setTimeout(() => {
            if (numberInputRef.current) {
                numberInputRef.current.focus();
            }
        }, 100);
    }, [tab, winMode, loading]);

    // 4. Logic การกดปุ่ม Tab (Navigation Flow)
    const handleInputKeyDown = (e: React.KeyboardEvent, currentField: 'number' | 'top' | 'bottom') => {
        // ถ้ากดปุ่ม Tab
        if (e.key === 'Tab') {
            e.preventDefault(); // ห้ามไม่ให้ Browser เลื่อนเอง เราจะคุมเอง

            if (currentField === 'number') {
                // ครั้งที่ 1: จากช่องเลข -> ไปราคาบน
                priceTopRef.current?.focus();
                priceTopRef.current?.select(); // ไฮไลท์ข้อความเดิม (ถ้ามี)
            } 
            else if (currentField === 'top') {
                // ครั้งที่ 2: จากราคาบน -> ไปราคาล่าง
                priceBottomRef.current?.focus();
                priceBottomRef.current?.select();
            } 
            else if (currentField === 'bottom') {
                // ครั้งที่ 3: จากราคาล่าง -> "กดปุ่มเพิ่มบิล" -> กลับไปช่องเลข
                handleAddBill(); // สั่งเพิ่มบิลทันที
                
                // รอแป๊บเดียวแล้วเด้งกลับไปช่องเลข
                setTimeout(() => {
                    numberInputRef.current?.focus();
                }, 50);
            }
        }
        
        // แถม: ถ้ากด Enter ก็ให้ทำงานเหมือน Tab (เผื่อคนถนัด Enter)
        if (e.key === 'Enter') {
            e.preventDefault();
            if (currentField === 'number') priceTopRef.current?.focus();
            else if (currentField === 'top') priceBottomRef.current?.focus();
            else if (currentField === 'bottom') {
                handleAddBill();
                setTimeout(() => numberInputRef.current?.focus(), 50);
            }
        }
    };
    
    // 2. สร้าง Ref สำหรับจับภาพพื้นที่บิล
    const billRef = useRef<HTMLDivElement>(null);

    // 3. สร้างฟังก์ชันแคปหน้าจอ
    const handleScreenshot = async () => {
        if (!billRef.current || cart.length === 0) return;
        
        const toastId = toast.loading('กำลังประมวลผล...');
        try {
            // 1. เปลี่ยนจาก toPng เป็น toBlob
            const blob = await htmlToImage.toBlob(billRef.current, {
                backgroundColor: '#ffffff',
                quality: 1.0,
                pixelRatio: 2,
                style: {
                    minWidth: '1720px', 
                },
                filter: (node) => {
                    if (node instanceof HTMLElement && node.dataset.ignore) {
                        return false;
                    }
                    return true;
                }
            });

            if (!blob) {
                throw new Error('ไม่สามารถสร้างรูปภาพได้');
            }

            // 2. เขียนรูปภาพลง Clipboard (Copy)
            // หมายเหตุ: ฟีเจอร์นี้ส่วนใหญ่ต้องรันบน HTTPS หรือ localhost เท่านั้น
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);
            
            toast.dismiss(toastId);
            toast.success('คัดลอกรูปแล้ว! กดวาง (Paste) ได้เลย'); // แจ้งเตือนใหม่

        } catch (error) {
            console.error("Screenshot error:", error);
            toast.dismiss(toastId);
            toast.error('คัดลอกไม่สำเร็จ (บราวเซอร์อาจไม่รองรับ)');
        }
    };


    const getInputConfig = () => {
        if (tab === 'win') return { max: 7, min: (winMode === '2' ? 2 : 3) };
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

        setBufferNumbers(prev => [...prev, ...numbersToAdd]);
        setCurrentInput('');
    };

    useEffect(() => {
        const config = getInputConfig();
        if (tab !== 'win' && currentInput.length === config.max) {
            handleAddNumberToBuffer();
        }
    }, [currentInput, tab]);

    const handleQuickOption = (type: string) => {
        const list = generateSpecialNumbers(type as any);
        if (list.length > 0) {
            const newNumbers = list.filter(n => !bufferNumbers.includes(n));
            if (newNumbers.length > 0) {
                setBufferNumbers(prev => [...prev, ...newNumbers]);
                toast.success(`เพิ่ม ${newNumbers.length} รายการ`);
            } else {
                toast("เลขชุดนี้ถูกเลือกไว้หมดแล้ว");
            }
        }
    };

    const handleReverseBuffer = () => {
        if (bufferNumbers.length === 0) return;
        let newSet: string[] = [];
        bufferNumbers.forEach(num => {
            const perms = generateReturnNumbers(num); 
            newSet.push(...perms);
        });
        const uniqueNumbers = [...new Set(newSet)];
        setBufferNumbers(uniqueNumbers);
        toast.success(`กลับเลขเรียบร้อย (รวม ${uniqueNumbers.length} รายการ)`);
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                if (document.activeElement instanceof HTMLInputElement && document.activeElement.type === 'text') {
                    return;
                }
                e.preventDefault();
                handleReverseBuffer();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [bufferNumbers]);


    // --- Add to Cart Logic ---
    const handleAddBill = () => {
        if (currentInput && currentInput.length >= getInputConfig().min) {
            handleAddNumberToBuffer();
        }

        // ถ้ามีการพิมพ์ค้างไว้ ก็เอามาคำนวณรวมด้วย
        let pendingNumbers: string[] = [];
        if (currentInput && currentInput.length >= getInputConfig().min && tab === 'win') {
            const mode = winMode === '2' ? 'win2' : 'win3';
            const generated = generateNumbers(currentInput, mode);
            pendingNumbers = generated;
            setCurrentInput('');
        }
        
        // ✅ เอามารวมกันเลย (ไม่ต้อง new Set เพื่อตัดซ้ำ)
        const finalNumbersToProcess = [...bufferNumbers, ...pendingNumbers];

        if (finalNumbersToProcess.length === 0) return toast.error("กรุณาระบุตัวเลข");
        if (!priceTop && !priceBottom) return toast.error("กรุณาระบุราคาอย่างน้อย 1 ช่อง");

        const pTop = Number(priceTop) || 0;
        const pBottom = Number(priceBottom) || 0;
        // 1. ดึงเรทราคามาเช็ค (ถ้าไม่มีให้ใช้ default เป็น 1)
        const currentRates = lotto?.rates || {};
        
        // ✅ เพิ่มฟังก์ชัน Helper ดึงขั้นต่ำ
        const getMin = (type: string) => {
            const rate = currentRates[type];
            if (typeof rate === 'object') return Number(rate.min) || 1;
            return 1;
        };
        // ✅ 2. [เพิ่ม] Helper ดึงค่า Max (สูงสุด)
        const getMax = (type: string) => {
            const rate = currentRates[type];
            // ถ้าเป็น object ให้ดึงค่า max, ถ้าไม่มีหรือเป็น 0 ถือว่า "ไม่จำกัด"
            if (typeof rate === 'object') return Number(rate.max) || 0;
            return 0; 
        };

       // --- ตรวจสอบยอดเงิน (บน / วิ่งบน) ---
        if (pTop > 0) {
            const typeToCheck = (tab === '3') ? '3top' : (tab === 'run' ? 'run_up' : '2up');
            
            // เช็คขั้นต่ำ
            const minBet = getMin(typeToCheck);
            if (pTop < minBet) return toast.error(`ราคาบน/วิ่งบน ขั้นต่ำ ${minBet} บาท`);

            // ✅ เช็คสูงสุด (ถ้ามีการตั้งค่า Max ไว้)
            const maxBet = getMax(typeToCheck);
            if (maxBet > 0 && pTop > maxBet) {
                return toast.error(`ราคาบน/วิ่งบน สูงสุดไม่เกิน ${maxBet.toLocaleString()} บาท`);
            }
        }

        // --- ตรวจสอบยอดเงิน (ล่าง / โต๊ด / วิ่งล่าง) ---
        if (pBottom > 0) {
            const typeToCheck = (tab === '3') ? '3tod' : (tab === 'run' ? 'run_down' : '2down');
            
            // เช็คขั้นต่ำ
            const minBet = getMin(typeToCheck);
            if (pBottom < minBet) return toast.error(`ราคาล่าง/โต๊ด ขั้นต่ำ ${minBet} บาท`);

            // ✅ เช็คสูงสุด
            const maxBet = getMax(typeToCheck);
            if (maxBet > 0 && pBottom > maxBet) {
                return toast.error(`ราคาล่าง/โต๊ด สูงสุดไม่เกิน ${maxBet.toLocaleString()} บาท`);
            }
        }
        
        const newItems: CartItem[] = [];
        const currentBatchId = uuidv4();

        finalNumbersToProcess.forEach(num => {
            const isClosed = risks.find(r => r.number === num && r.risk_type === 'CLOSE');
            if (isClosed) return;

            if (tab === '2' || tab === '19' || (tab === 'win' && winMode === '2')) {
                if (pTop > 0) newItems.push({ 
                    temp_id: uuidv4(), number: num, bet_type: '2up', amount: pTop, display_text: num,
                    rate_pay: Number(getRateVal(currentRates['2up'], 'pay')),
                    batch_id: currentBatchId
                });
                if (pBottom > 0) newItems.push({ 
                    temp_id: uuidv4(), number: num, bet_type: '2down', amount: pBottom, display_text: num,
                    rate_pay: Number(getRateVal(currentRates['2down'], 'pay')),
                    batch_id: currentBatchId
                });
            } else if (tab === '3' || (tab === 'win' && winMode === '3')) {
                if (pTop > 0) newItems.push({ 
                    temp_id: uuidv4(), number: num, bet_type: '3top', amount: pTop, display_text: num,
                    rate_pay: Number(getRateVal(currentRates['3top'], 'pay')),
                    batch_id: currentBatchId
                });
                if (pBottom > 0) newItems.push({ 
                    temp_id: uuidv4(), number: num, bet_type: '3tod', amount: pBottom, display_text: num,
                    rate_pay: Number(getRateVal(currentRates['3tod'], 'pay')),
                    batch_id: currentBatchId
                });
            } else if (tab === 'run') {
                if (pTop > 0) newItems.push({ 
                    temp_id: uuidv4(), number: num, bet_type: 'run_up', amount: pTop, display_text: num,
                    rate_pay: Number(getRateVal(currentRates['run_up'], 'pay')),
                    batch_id: currentBatchId
                });
                if (pBottom > 0) newItems.push({ 
                    temp_id: uuidv4(), number: num, bet_type: 'run_down', amount: pBottom, display_text: num,
                    rate_pay: Number(getRateVal(currentRates['run_down'], 'pay')),
                    batch_id: currentBatchId
                });
            }
        });

        if(newItems.length === 0) {
            return toast.error("ไม่มีรายการที่เพิ่มได้ (อาจเป็นเลขปิดรับทั้งหมด)");
        }

        setCart(prev => [...newItems, ...prev]); 
        setBufferNumbers([]);
        setPriceTop('');
        setPriceBottom('');
        
        toast.success(`เพิ่ม ${newItems.length} รายการ`);
    };

    const getTypeLabel = (type: string) => {
        switch(type) {
            case '2up': return 'บน';
            case '2down': return 'ล่าง';
            case '3top': return '3ตัวบน';
            case '3tod': return '3ตัวโต๊ด';
            case 'run_up': return 'วิ่งบน';
            case 'run_down': return 'วิ่งล่าง';
            default: return type;
        }
    };
    const groupItemsInBatch = (batchItems: CartItem[]) => {
        const itemsByNumber = new Map<string, CartItem[]>();
        batchItems.forEach(item => {
            if (!itemsByNumber.has(item.number)) itemsByNumber.set(item.number, []);
            itemsByNumber.get(item.number)?.push(item);
        });

        const groups = new Map<string, any>();
        const typeOrder = ['2up', '2down', '3top', '3tod', 'run_up', 'run_down'];
        const sortTypes = (a: string, b: string) => typeOrder.indexOf(a) - typeOrder.indexOf(b);

        itemsByNumber.forEach((userItems, number) => {
             const piles = new Map<string, CartItem[]>();
             userItems.forEach(item => {
                 const key = `${item.bet_type}:${item.amount}`;
                 if (!piles.has(key)) piles.set(key, []);
                 piles.get(key)?.push(item);
             });

             while (piles.size > 0) {
                 const currentSetItems: CartItem[] = [];
                 for (const [key, stack] of piles.entries()) {
                     const item = stack.pop();
                     if (item) currentSetItems.push(item);
                     if (stack.length === 0) piles.delete(key);
                 }
                 if (currentSetItems.length === 0) break;

                 currentSetItems.sort((a, b) => sortTypes(a.bet_type, b.bet_type));
                 
                 // สร้าง Key โดยรวม batch_id เข้าไปด้วย เพื่อความชัวร์ (แต่จริงๆ เราแยก loop แล้ว)
                 const sig = currentSetItems.map(i => `${i.bet_type}:${i.amount}`).join('|');
                 
                 const labelStr = currentSetItems.map(i => getTypeLabel(i.bet_type)).join(' + ');
                 const priceStr = currentSetItems.map(i => i.amount).join(' + ');

                 if (!groups.has(sig)) {
                     groups.set(sig, {
                         key: uuidv4(), // ใช้ UUID ไปเลยเพื่อแยกการ์ดแน่นอน
                         labelStr,
                         priceStr,
                         instances: [],
                         allGroupItems: []
                     });
                 }
                 const group = groups.get(sig)!;
                 group.instances.push({ number, items: currentSetItems });
                 group.allGroupItems.push(...currentSetItems);
             }
        });
        return Array.from(groups.values());
    };

    // ✅ ฟังก์ชันหลัก: แยกรายการตาม Batch ID ก่อน แล้วค่อยจัดกลุ่มย่อย
    const getGroupedCartItems = () => {
        // 1. แยกรายการออกเป็นกองๆ ตาม Batch ID (Add Bill ครั้งเดียวกัน อยู่กองเดียวกัน)
        const batches = new Map<string, CartItem[]>();
        
        cart.forEach(item => {
            // ถ้าเป็นของเก่าที่ไม่มี batch_id ให้ใช้ 'legacy' รวมกันไว้
            const bId = (item as any).batch_id || 'legacy';
            if (!batches.has(bId)) batches.set(bId, []);
            batches.get(bId)?.push(item);
        });

        const allGroups: any[] = [];

        // 2. วนลูปทีละ Batch เพื่อสร้างการ์ดของใครของมัน
        // (เนื่องจากเราเอาของใหม่ไว้บนสุดใน state cart แล้ว เราจึงวนตามลำดับที่เจอได้เลย)
        // แต่ Batch ID อาจจะกระจัดกระจาย เราควรคงลำดับตาม Cart หลัก
        
        // วิธีที่ดีกว่า: วนหา Batch Unique ID ตามลำดับที่ปรากฏใน Cart
        const seenBatches = new Set<string>();
        cart.forEach(item => {
            const bId = (item as any).batch_id || 'legacy';
            if (!seenBatches.has(bId)) {
                seenBatches.add(bId);
                // ดึงรายการทั้งหมดของ Batch นี้มาประมวลผลทีเดียว
                const batchItems = batches.get(bId) || [];
                const batchGroups = groupItemsInBatch(batchItems);
                allGroups.push(...batchGroups);
            }
        });

        return allGroups;
    };

    // ฟังก์ชันลบทั้งกลุ่ม
    const deleteGroup = (items: CartItem[]) => {
        const ids = new Set(items.map(i => i.temp_id));
        setCart(prev => prev.filter(i => !ids.has(i.temp_id)));
    };

    // ฟังก์ชันลบเฉพาะตัวเลขนี้ (ในกลุ่มนี้)
    const deleteInstance = (items: CartItem[]) => {
        const ids = new Set(items.map(i => i.temp_id));
        setCart(prev => prev.filter(i => !ids.has(i.temp_id)));
    };

    const submitTicket = async () => {
        if (cart.length === 0) return;
        setIsSubmitting(true);
        const toastId = toast.loading('กำลังส่งโพย...');
        try {
            const payload = {
                lotto_type_id: lotto.id,
                note: note,
                items: cart.map(item => ({ number: item.number, bet_type: item.bet_type, amount: item.amount }))
            };
            const res = await client.post('/play/submit_ticket', payload);
            toast.dismiss(toastId);
            toast.success(`ส่งโพยสำเร็จ! รหัส: ${res.data.id.slice(0, 8)}`, { duration: 4000 });
            setCart([]);
            setNote('');
            
            // [เพิ่ม] โหลดประวัติใหม่หลังส่งโพยสำเร็จ
            fetchHistory(); 
            
            // navigate('/history'); // [ถ้าต้องการให้อยู่หน้าเดิมดูประวัติ ก็ comment บรรทัดนี้ออก]
        } catch (err: any) {
            console.error(err);
            toast.dismiss(toastId);
            toast.error(err.response?.data?.detail || 'ส่งโพยไม่สำเร็จ');
        } finally {
            setIsSubmitting(false);
        }
    };

    const totalAmount = cart.reduce((sum, item) => sum + item.amount, 0);
    
    const labels = tab === '3' ? { top: '3 ตัวบน', bottom: '3 ตัวโต๊ด' } : (tab === 'run' ? { top: 'วิ่งบน', bottom: 'วิ่งล่าง' } : { top: 'บน', bottom: 'ล่าง' });
    const activeRates = lotto?.rates || {};

    if(loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-500 w-10 h-10"/></div>;
    if(!lotto) return null;

    return (
        <div className="flex flex-col h-full bg-white overflow-hidden font-sans">
            <div className="mt-1 mx-4">
                <CountDownTimer closeTime={lotto.close_time || "00:00"} />
            </div>
            <div className="flex flex-1 overflow-hidden relative">
            
                {/* ================= CENTER COLUMN ================= */}
                <div className="flex-1 overflow-y-auto pb-20 bg-white"> 
                    <div className="p-4 max-w-4xl mx-auto space-y-4">
                        
                        {/* Header */}
                        <button onClick={() => navigate('/play')} className="flex items-center gap-1 text-gray-500 hover:text-gray-800 text-sm mb-2">
                            <ArrowLeft size={16} /> กลับไปหน้าตลาด
                        </button>
                    <div ref={billRef} className="bg-white p-2 rounded-xl">
                        <div className="bg-[#E0F7FA] border border-[#B2DFDB] rounded-lg p-3 flex justify-between items-center shadow-sm">
                            {/* ฝั่งซ้าย: รูป + ชื่อหวย */}
                            <div className="flex items-center gap-3">
                                {/* กรอบรูปธง */}
                                <div className="w-12 h-12 rounded-full bg-white border-2 border-white shadow-sm overflow-hidden shrink-0 flex items-center justify-center">
                                    {lotto.img_url ? (
                                        <img 
                                            src={lotto.img_url} 
                                            alt={lotto.name} 
                                            className="w-full h-full object-cover" 
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none'; // ซ่อนรูปถ้าโหลดไม่ได้
                                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); // โชว์ตัวอักษรแทน
                                            }}
                                        />
                                    ) : (
                                        <div className="text-xl font-bold text-gray-400 bg-gray-100 w-full h-full flex items-center justify-center">
                                            {lotto.name.charAt(0)}
                                        </div>
                                    )}
                                    {/* Fallback กรณีรูปเสีย */}
                                    <div className="hidden absolute text-xl font-bold text-gray-400">
                                        {lotto.name.charAt(0)}
                                    </div>
                                </div>

                                {/* ชื่อและเวลาปิด */}
                                <div>
                                    <h2 className="font-bold text-gray-800 text-lg leading-tight">{lotto.name}</h2>
                                    <div className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                                        ปิดรับ <span className="font-bold text-red-500 bg-red-50 px-1.5 rounded">{lotto.close_time?.substring(0,5)} น.</span>
                                    </div>
                                </div>
                            </div>

                            {/* ฝั่งขวา: วันที่ (เหมือนเดิม) */}
                            <div className="text-right">
                                <div className="font-bold text-gray-800 text-xs md:text-sm">งวดวันที่</div>
                                <div className="text-sm md:text-base font-bold text-blue-600">{new Date().toLocaleDateString('th-TH')}</div>
                            </div>
                        </div>

                        {/* Main Betting Card */}
                        <div className="bg-[#F8FAFC] border border-gray-200 rounded-lg p-4 shadow-sm relative">
                            
                            {/* Tabs */}
                            <div className="flex flex-wrap gap-1 mb-4 text-nowrap">
                                {[{ id: '2', label: '2 ตัว' }, { id: '3', label: '3 ตัว' }, { id: '19', label: '19 ประตู' }, { id: 'run', label: 'เลขวิ่ง' }, { id: 'win', label: 'วินเลข' }].map((t) => (
                                    <button key={t.id} onClick={() => handleTabChange(t.id as any)} className={`px-4 py-1.5 rounded-md text-sm font-bold border transition-colors ${tab === t.id ? 'bg-[#2ECC71] text-white border-[#27AE60] shadow-sm' : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'}`}>
                                        {t.label}
                                    </button>
                                ))}
                            </div>

                            {/* Mode Selector for Win */}
                            {tab === 'win' && (
                                <div className="flex gap-1 mb-4 bg-white p-1 rounded-md border border-green-200 w-fit">
                                    <button onClick={() => handleWinModeChange('2')} className={`px-4 py-1 rounded text-xs font-bold transition-all ${winMode === '2' ? 'bg-[#2ECC71] text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}>วิน 2 ตัว</button>
                                    <button onClick={() => handleWinModeChange('3')} className={`px-4 py-1 rounded text-xs font-bold transition-all ${winMode === '3' ? 'bg-[#2ECC71] text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}>วิน 3 ตัว</button>
                                </div>
                            )}

                            {/* Buffer Control */}
                            <div className="flex justify-end gap-2 mb-2">
                                <button onClick={() => setBufferNumbers([])} disabled={bufferNumbers.length === 0} className="text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-md text-xs flex items-center gap-1 transition-colors disabled:opacity-50">
                                    <Trash2 size={14} /> ล้างเลขที่เลือก
                                </button>
                            </div>

                            
                            {bufferNumbers.length > 0 && (
                                <div className="bg-white rounded-lg p-3 mb-3 border border-gray-200 min-h-12">
                                    <div className="flex flex-wrap gap-2">
                                        {bufferNumbers.map((n, idx) => (
                                            <span 
                                                key={idx} 
                                                onClick={() => setBufferNumbers(prev => prev.filter(item => item !== n))}
                                                className="bg-[#2ECC71] text-white px-2 py-1 rounded text-sm font-bold shadow-sm cursor-pointer hover:bg-red-500 transition-colors select-none"
                                                title="กดเพื่อลบเลขนี้"
                                            >
                                                {n}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Keypad for Win Mode */}
                            {tab === 'win' && (
                                <div className="mb-4">
                                    <div className="grid grid-cols-5 gap-2 md:w-2/3 mx-auto">
                                        {[1,2,3,4,5,6,7,8,9,0].map(num => {
                                            const isSelected = currentInput.includes(num.toString());
                                            return (
                                                <button 
                                                    key={num}
                                                    onClick={() => setCurrentInput(prev => {
                                                        const strNum = num.toString();
                                                        if (prev.includes(strNum)) {
                                                            return prev.replace(strNum, '');
                                                        }
                                                        if (prev.length >= 8) return prev; 
                                                        return prev + strNum;
                                                    })}
                                                    className={`
                                                        font-bold text-lg py-3 rounded-lg shadow-sm transition-all border
                                                        ${isSelected 
                                                            ? 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700 active:bg-blue-800' 
                                                            : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50 active:bg-blue-200' 
                                                        }
                                                    `}
                                                >
                                                    {num}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="flex justify-center mt-2 gap-2 md:w-2/3 mx-auto">
                                        <button 
                                            onClick={() => setCurrentInput(prev => prev.slice(0, -1))}
                                            className="flex-1 bg-red-100 text-red-600 py-2 rounded-lg font-bold flex items-center justify-center gap-1 hover:bg-red-200"
                                        >
                                            <Delete size={18}/> ลบ
                                        </button>
                                        <button 
                                            onClick={() => handleAddNumberToBuffer()}
                                            className="flex-2 bg-blue-600 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-blue-700 shadow-md"
                                        >
                                            <Calculator size={18}/> คำนวณชุดเลข
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Quick Options */}
                            {tab !== 'win' && (
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
                            )}
                            
                            {/* Input Row */}
                            <div className="bg-[#DCF8C6] p-3 rounded-lg border border-[#C5E1A5] flex flex-col md:flex-row gap-2 items-center">
                                <div className="flex-1 w-full">
                                    <label className="text-xs text-gray-500 font-bold mb-1 block md:hidden">ใส่เลข</label>
                                    
                                    {/* [แก้ไข] ช่องใส่เลข */}
                                    <input 
                                        ref={numberInputRef} // ✅ ใส่ ref
                                        type="tel" 
                                        value={currentInput}
                                        onChange={e => setCurrentInput(e.target.value.replace(/[^0-9]/g, ''))}
                                        onKeyDown={(e) => handleInputKeyDown(e, 'number')} // ✅ ดักจับปุ่ม
                                        placeholder={tab === 'win' ? "เลือกเลขวิน..." : "ใส่เลข"}
                                        className="w-full bg-[#E0F2F1] border-b-2 border-blue-400 text-center text-xl font-bold py-1 focus:outline-none focus:border-blue-600 text-gray-700 placeholder-blue-300"
                                        maxLength={getInputConfig().max}
                                    />
                                </div>

                                {(tab === '2' || tab === '3' || tab === '19' || tab === 'win') && (
                                    <button 
                                        onClick={handleReverseBuffer}
                                        disabled={bufferNumbers.length === 0}
                                        title="กด Spacebar เพื่อกลับเลข"
                                        className="bg-[#F39C12] hover:bg-[#E67E22] disabled:bg-gray-300 disabled:text-gray-500 text-white font-bold px-4 py-2 rounded-md shadow-md transition-all flex items-center justify-center gap-1 w-full md:w-auto whitespace-nowrap h-full min-h-11"
                                    >
                                        <Settings2 size={18} /> กลับเลข
                                    </button>
                                )}

                                <div className="flex gap-2 w-full md:w-auto">
                                    <div className="flex-1">
                                        <label className="text-xs text-gray-500 font-bold mb-1 block md:hidden text-center">{labels.top}</label>
                                        
                                        {/* [แก้ไข] ช่องราคาบน */}
                                        <input 
                                            ref={priceTopRef} // ✅ ใส่ ref
                                            type="tel" 
                                            value={priceTop}
                                            onChange={e => setPriceTop(e.target.value)}
                                            onKeyDown={(e) => handleInputKeyDown(e, 'top')} // ✅ ดักจับปุ่ม
                                            placeholder={labels.top}
                                            className="w-full md:w-20 bg-[#E0F2F1] border-b-2 border-gray-400 text-center font-bold py-1 focus:outline-none focus:border-gray-600 text-gray-700"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-xs text-gray-500 font-bold mb-1 block md:hidden text-center">{labels.bottom}</label>
                                        
                                        {/* [แก้ไข] ช่องราคาล่าง */}
                                        <input 
                                            ref={priceBottomRef} // ✅ ใส่ ref
                                            type="tel" 
                                            value={priceBottom}
                                            onChange={e => setPriceBottom(e.target.value)}
                                            onKeyDown={(e) => handleInputKeyDown(e, 'bottom')} // ✅ ดักจับปุ่ม (กดแล้วเพิ่มบิลเลย)
                                            placeholder={labels.bottom}
                                            className="w-full md:w-20 bg-[#E0F2F1] border-b-2 border-gray-400 text-center font-bold py-1 focus:outline-none focus:border-gray-600 text-gray-700"
                                        />
                                    </div>
                                </div>

                                <button 
                                    ref={addButtonRef}
                                    onClick={() => {
                                        handleAddBill();
                                        // ถ้ากดปุ่มด้วยเมาส์ ก็ให้โฟกัสกลับไปช่องเลขเหมือนกัน
                                        setTimeout(() => numberInputRef.current?.focus(), 50);
                                    }}
                                    
                                    className="bg-[#2ECC71] hover:bg-[#27AE60] text-white font-bold px-6 py-2 rounded-md shadow-md active:scale-95 transition-all flex items-center gap-1 w-full md:w-auto justify-center"
                                >
                                    <span className="text-lg">+</span> เพิ่มบิล
                                </button>
                            </div>

                        </div>
                        {/* Cart List */}
                        {cart.length > 0 && (
                            <div className="mt-6 space-y-3 animate-fade-in">
                                {getGroupedCartItems().map((group) => (
                                    <div key={group.key} className="bg-white rounded-xl border border-gray-200 shadow-sm flex overflow-hidden">
                                        
                                        {/* หัวข้อกลุ่ม (ประเภท + ราคา) */}
                                        <div className="w-28 bg-blue-50 border-r border-blue-100 p-2 flex flex-col justify-center items-center text-center shrink-0">
                                            <div className="font-bold text-slate-700 text-[10px] md:text-xs mb-1 line-clamp-2 leading-tight">
                                                {group.labelStr}
                                            </div>
                                            <div className="text-xs md:text-sm font-black text-blue-600">
                                                {group.priceStr}
                                            </div>
                                        </div>

                                        {/* รายการตัวเลข (Chip) */}
                                        <div className="flex-1 p-3 bg-white flex flex-wrap gap-2 items-center content-center">
                                            {group.instances.map((inst: { number: string, items: CartItem[] }, idx: number) => {
                                                const isHalf = risks.some(r => r.number === inst.number && r.risk_type === 'HALF');
                                                
                                                return (
                                                    <div 
                                                        key={`${group.key}-${inst.number}-${idx}`}
                                                        onClick={() => deleteInstance(inst.items)} // ลบเฉพาะชุดนี้
                                                        className="relative group/chip cursor-pointer select-none"
                                                        title="แตะเพื่อลบ"
                                                    >
                                                        <span className="font-mono font-bold text-base text-slate-700 bg-gray-100 px-2 py-1 rounded border border-gray-200 group-hover/chip:bg-red-50 group-hover/chip:text-red-500 group-hover/chip:border-red-200 transition-colors flex items-center gap-1">
                                                            {inst.number}
                                                            {/* ไอคอนลบเล็กๆ */}
                                                            <Trash2 size={10} className="hidden group-hover/chip:inline opacity-50" />
                                                        </span>
                                                        
                                                        {/* Badge จ่ายครึ่ง */}
                                                        {isHalf && (
                                                            <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3 z-10">
                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500 border border-white"></span>
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* ปุ่มลบทั้งกลุ่ม */}
                                        <div 
                                            className="w-10 bg-gray-50 border-l border-gray-100 flex items-center justify-center shrink-0 hover:bg-red-50 transition-colors cursor-pointer"
                                            data-ignore="true"
                                            onClick={() => deleteGroup(group.allGroupItems)}
                                        >
                                            <button className="text-gray-400 hover:text-red-500 transition-colors">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                
                                <div className="text-right text-xs text-gray-400 px-1">
                                    รวม {cart.length} รายการ
                                </div>
                            </div>
                        )}

                        {/* Footer Summary */}
                        <div className="mt-8 mb-4">
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
                            <div className="relative flex items-center justify-center py-2">
                                <div className="text-center w-full">
                                    <h2 className="text-3xl font-bold text-gray-800 mb-1">
                                        รวม: {totalAmount.toLocaleString()} บาท
                                    </h2>
                                    <p className="text-xs text-gray-400">
                                        สรุปรายการ ณ {new Date().toLocaleString('th-TH')}
                                    </p>
                                </div>

                                {/* --- ส่วนขวา: รูปและชื่อหวย (ลอยอยู่ขวาสุดโดยไม่ดันตัวหนังสือตรงกลาง) --- */}
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 items-center gap-3">
                                    {/* รูปโลโก้ */}
                                    <div className="w-15 h-10 md:w-17 md:h-12 bg-white border-2 border-white shadow-md overflow-hidden flex items-center justify-center relative">
                                        {lotto.img_url ? (
                                            <img 
                                                src={lotto.img_url} 
                                                alt={lotto.name} 
                                                className="w-full h-full object-cover" 
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                                }}
                                            />
                                        ) : (
                                            <div className="text-lg font-bold text-gray-400 bg-gray-100 w-full h-full flex items-center justify-center">
                                                {lotto.name.charAt(0)}
                                            </div>
                                        )}
                                        {/* Fallback ตัวอักษร */}
                                        <div className="hidden absolute text-lg font-bold text-gray-400">
                                            {lotto.name.charAt(0)}
                                        </div>
                                    </div>
                                     {/* ชื่อหวย (ซ่อนในมือถือจอเล็กกันทับยอดเงิน, โชว์ในจอ sm ขึ้นไป) */}
                                    <div className="text-center hidden sm:block opacity-75">
                                        <div className="text-[10px] text-red-500 font-bold">
                                            ปิด {lotto.close_time?.substring(0,5)} น.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                    </div>

                        <div className="mb-10 flex justify-center gap-3">
                            {/* 4. เพิ่มปุ่มแคปหน้าจอ */}
                            <button 
                                onClick={handleScreenshot}
                                disabled={cart.length === 0}
                                className={`px-4 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all border
                                    ${cart.length === 0 
                                        ? 'bg-white text-gray-400 border-gray-200 cursor-not-allowed' 
                                        : 'bg-green-700 text-white border-indigo-100 hover:bg-indigo-700 hover:scale-105 active:scale-95'
                                    }
                                `}
                            >
                                <Camera size={24} /> 
                                <span className="hidden md:inline">แคปจอ</span>
                            </button>

                            <button 
                                onClick={submitTicket} 
                                disabled={isSubmitting || cart.length === 0} 
                                className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg flex items-center gap-2 transition-all flex-1 md:flex-none justify-center md:min-w-50
                                    ${isSubmitting || cart.length === 0 
                                        ? 'bg-gray-400 cursor-not-allowed' 
                                        : 'bg-[#2962FF] hover:bg-blue-700 hover:scale-105 active:scale-95'
                                    }
                                `}
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />} บันทึกโพย
                            </button>
                        </div>
                    </div>
                </div>
                {/* Right Column: Rates & Risks */}
                <div className="hidden lg:flex w-80 bg-[#1e293b] text-white border-l border-gray-700 flex-col shadow-xl z-10 overflow-y-auto">
                    <div className="p-4 bg-[#0f172a] border-b border-gray-700 flex justify-between items-center">
                        <div><h3 className="font-bold text-lg text-blue-400">อัตราจ่าย</h3></div>
                    </div>
                    <div className="p-3 space-y-6">
                        <div className="bg-[#1e293b] rounded-lg overflow-hidden border border-gray-700">
                            <table className="w-full text-xs text-center">
                                <thead className="bg-[#334155] text-white font-bold">
                                    <tr><th className="p-2 text-left pl-3">ประเภท</th><th className="p-2 text-green-400">จ่าย</th><th className="p-2 text-gray-300">ต่ำ</th><th className="p-2 text-blue-300">สูง</th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {[{ key: '3top', label: '3 ตัวบน' }, { key: '3tod', label: '3 ตัวโต๊ด' }, { key: '2up', label: '2 ตัวบน' }, { key: '2down', label: '2 ตัวล่าง' }, { key: 'run_up', label: 'วิ่งบน' }, { key: 'run_down', label: 'วิ่งล่าง' }].map((t) => {
                                        const rate = activeRates[t.key];
                                        return (
                                            <tr key={t.key} className="hover:bg-gray-800 transition-colors">
                                                <td className="p-2 text-left pl-3 text-gray-300 font-medium">{t.label}</td>
                                                <td className="p-2 text-green-400 font-bold">{Number(getRateVal(rate, 'pay')).toLocaleString()}</td>
                                                <td className="p-2 text-gray-400">{Number(getRateVal(rate, 'min')).toLocaleString()}</td>
                                                <td className="p-2 text-blue-300">{getRateVal(rate, 'max') !== '-' ? Number(getRateVal(rate, 'max')).toLocaleString() : '∞'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Risk Section */}
                        <div>
                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1"><Settings2 size={12}/> เลขอั้น / ปิดรับ</h4>
                            <div className="bg-[#0f172a] rounded-lg border border-gray-700 p-3 min-h-25">
                                {risks.length === 0 ? <div className="text-center text-gray-500 text-xs py-4">✅ ไม่มีเลขอั้น</div> : (
                                    <div className="space-y-3">
                                        {risks.filter(r => r.risk_type === 'CLOSE').length > 0 && (
                                            <div>
                                                <div className="text-[10px] font-bold text-red-500 mb-1">⛔ ปิดรับ (ห้ามแทง)</div>
                                                <div className="flex flex-wrap gap-1">
                                                    {risks.filter(r => r.risk_type === 'CLOSE').map(r => <span key={r.id} className="bg-red-500/10 text-red-500 border border-red-500/20 px-1.5 py-0.5 rounded text-[10px] font-mono">{r.number}</span>)}
                                                </div>
                                            </div>
                                        )}
                                        {risks.filter(r => r.risk_type !== 'CLOSE').length > 0 && (
                                            <div>
                                                <div className="text-[10px] font-bold text-orange-400 mb-1">⚠️ จ่ายครึ่ง / อั้น</div>
                                                <div className="flex flex-wrap gap-1">
                                                    {risks.filter(r => r.risk_type !== 'CLOSE').map(r => <span key={r.id} className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-1.5 py-0.5 rounded text-[10px] font-mono">{r.number}</span>)}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* [เพิ่มส่วนนี้] History Section */}
                        <div>
                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1"><History size={12}/> ประวัติโพยล่าสุด</h4>
                            <div className="bg-[#0f172a] rounded-lg border border-gray-700 overflow-hidden">
                                {history.length === 0 ? (
                                    <div className="text-center text-gray-500 text-xs py-4">ยังไม่มีประวัติ</div>
                                ) : (
                                    <div className="divide-y divide-gray-800">
                                        {history.map((ticket: any) => (
                                            <div key={ticket.id} className="p-3 hover:bg-gray-800/50 transition-colors">
                                                <div className="flex justify-between items-start mb-1">
                                                    <div>
                                                        <div className="text-[10px] text-gray-400">
                                                            {new Date(ticket.created_at).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })} {new Date(ticket.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute:'2-digit' })}
                                                        </div>
                                                        <div className="text-xs font-bold text-blue-300 truncate w-32">
                                                            {ticket.lotto_type?.name || 'หวย'}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xs font-bold text-white">{Number(ticket.total_amount).toLocaleString()}</div>
                                                        <div>{getStatusBadge(ticket.status)}</div>
                                                    </div>
                                                </div>
                                                {ticket.note && (
                                                    <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-1 bg-gray-800/50 p-1 rounded">
                                                        <FileText size={8} /> {ticket.note}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
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