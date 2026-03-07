import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as htmlToImage from 'html-to-image';
import client from '../../api/client';
import { v4 as uuidv4 } from 'uuid';
import { Loader2, Save, ArrowLeft, Camera, Clock } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient.ts';
import toast from 'react-hot-toast';
import { alertAction, confirmAction } from '../../utils/toastUtils';

// --- นำเข้า Utilities และ Components ที่เราแยกไว้ ---
import { type CartItem } from '../../types/lotto';
import { generateNumbers, generateSpecialNumbers, generateReturnNumbers } from '../../types/lottoLogic';
import { getCloseDate } from '../../utils/lottoHelpers';
import { getTodayShort, getRateVal, getContrastTextColor } from '../../utils/bettingHelpers';
import BettingSidebar from '../../components/betting/BettingSidebar';
import BettingCart from '../../components/betting/BettingCart';
import BettingNumpad from '../../components/betting/BettingNumpad';

const CountDownTimer = ({ targetDate, onTimeout }: { targetDate: Date | null; onTimeout: () => void }) => {
    const [timeLeft, setTimeLeft] = useState('00:00:00');

    useEffect(() => {
        if (!targetDate) return;

        const interval = setInterval(() => {
            const now = new Date();
            const diff = targetDate.getTime() - now.getTime();

            if (diff <= 0) {
                setTimeLeft("00:00:00");
                clearInterval(interval);
                onTimeout(); 
                return;
            }

            const h = Math.floor((diff / (1000 * 60 * 60)));
            const m = Math.floor((diff / (1000 * 60)) % 60);
            const s = Math.floor((diff / 1000) % 60);

            setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        }, 1000);

        return () => clearInterval(interval);
    }, [targetDate, onTimeout]);

    return (
        <div className="text-red-500 font-bold text-xl animate-pulse">
            เหลือเวลา {timeLeft}
        </div>
    );
};

export default function BettingRoom() {
    const { id } = useParams(); 
    const navigate = useNavigate();

    const numberInputRef = useRef<HTMLInputElement>(null);
    const priceTopRef = useRef<HTMLInputElement>(null);
    const priceBottomRef = useRef<HTMLInputElement>(null);
    const addButtonRef = useRef<HTMLButtonElement>(null);
    const billRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const focusInput = () => {
        setTimeout(() => {
            if (numberInputRef.current) {
                numberInputRef.current.focus();
            }
        }, 50); 
    };

    const handleBackgroundMouseDown = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const isSelectable = target.closest('.selectable-text');

        const isInteractive = 
            isSelectable ||
            target.tagName === 'INPUT' || 
            target.tagName === 'BUTTON' || 
            target.tagName === 'A' ||
            target.closest('button') || 
            target.closest('a') ||
            target.closest('input');

        if (!isInteractive) {
            e.preventDefault();
        }
    };

    const themeClasses = {
        main: 'bg-[var(--theme-main)] text-[var(--theme-text-contrast)]', 
        light: 'bg-[var(--theme-light)]',         
        border: 'border-[var(--theme-border)]',   
        text: 'text-[var(--theme-main)]',         
        focus: 'focus:border-[var(--theme-main)]', 
        hover: 'hover:opacity-90'                 
    };

    const [themeStyles, setThemeStyles] = useState<React.CSSProperties>({
        '--theme-main': '#2ECC71',
        '--theme-light': '#2ECC711A',
        '--theme-border': '#2ECC714D',
        '--theme-text-contrast': '#ffffff'
    } as React.CSSProperties);

    const applyThemeFromHex = (hex: string) => {
        if (!hex) return;
        const contrastText = getContrastTextColor(hex);
        setThemeStyles({
            '--theme-main': hex,
            '--theme-light': `${hex}1A`,
            '--theme-border': `${hex}4D`,
            '--theme-text-contrast': contrastText
        } as React.CSSProperties);
    };

    const [lotto, setLotto] = useState<any>(null);
    const [risks, setRisks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState<any[]>([]);
    const [lottoStats, setLottoStats] = useState<any[]>([]);

    const [tab, setTab] = useState<'2' | '3' | '19' | 'run' | 'win'>('2');
    const [winMode, setWinMode] = useState<'2' | '3'>('2'); 
    const [includeDoubles, setIncludeDoubles] = useState(false);

    const [currentInput, setCurrentInput] = useState('');
    const [bufferNumbers, setBufferNumbers] = useState<string[]>([]);
    const [root19Inputs, setRoot19Inputs] = useState<string[]>([]); 
    
    const [priceTop, setPriceTop] = useState('');    
    const [priceBottom, setPriceBottom] = useState(''); 

    const [cart, setCart] = useState<CartItem[]>([]);
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const targetDate = useMemo(() => {
        if (!lotto) return null;
        return getCloseDate(lotto, new Date());
    }, [lotto]);

    const handleTimeUp = useCallback(() => {
        alertAction(
            "หมดเวลาแทงแล้ว!\nระบบจะพาท่านกลับไปยังหน้าตลาด",
            "⛔ หมดเวลา",
            "error",
            "ตกลง",
            () => navigate('/play')
        );
    }, [navigate]);

    const fetchHistory = async (lottoId: string) => {
        try {
            const res = await client.get(`/play/history?limit=15&lotto_type_id=${lottoId}`);
            const historyData = Array.isArray(res.data) ? res.data : [];
            const sortedHistory = historyData.sort((a: any, b: any) => {
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });
            setHistory(sortedHistory); 
        } catch (err) {
            console.error("Fetch history error", err);
            setHistory([]); 
        }
    };

    const fetchLottoStats = async (lottoId: string) => {
        try {
            const res = await client.get(`/reward/history?lotto_type_id=${lottoId}&limit=5`);
            setLottoStats(res.data);
        } catch (err) { 
            console.error("Fetch stats error", err); 
        }
    };

    const fetchData = async () => {
        if(!id) {
            setLoading(false);
            navigate('/play');
            return;
        }

        setLoading(true);
        try {
            const [resLotto, resRisks] = await Promise.all([
                client.get(`/play/lottos/${id}`), 
                client.get(`/play/risks/${id}`)
            ]);

            const currentLotto = resLotto.data;
            if (currentLotto.close_time) {
                const now = new Date();
                const realTargetDate = getCloseDate(currentLotto, now);
                if (realTargetDate && now > realTargetDate) {
                    toast.error("⛔ หวยนี้ปิดรับแล้ว (หมดเวลา)");
                    navigate('/play'); 
                    return;
                }
            }

            setLotto(currentLotto);
            setRisks(resRisks.data);
            if (currentLotto.theme_color) applyThemeFromHex(currentLotto.theme_color);

            await Promise.all([fetchHistory(id), fetchLottoStats(id)]);
        } catch (err) { 
            console.error("Load data error", err);
            toast.error("ไม่พบข้อมูลหวย");
            navigate('/play');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelTicket = (ticketId: string) => {
        confirmAction(
            "ยืนยันการยกเลิกโพยนี้? เงินจะถูกคืนทันที",
            async () => {
                try {
                    await client.patch(`/play/tickets/${ticketId}/cancel`);
                    toast.success("ยกเลิกโพยสำเร็จ");
                    if (id) fetchHistory(id); 
                } catch(err: any) {
                    toast.error(err.response?.data?.detail || 'ยกเลิกไม่สำเร็จ');
                }
            }, "ยืนยัน", "ยกเลิก"
        );
    };

    useEffect(() => { fetchData(); }, [id]);  

    useEffect(() => {
        if (!id) return;
        const statusChannel = supabase
            .channel(`realtime-lotto-status-${id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'lotto_types', filter: `id=eq.${id}` }, (payload) => {
                    const updated = payload.new;
                    setLotto((prev: any) => ({ ...prev, is_active: updated.is_active }));
                    if (!updated.is_active) {
                        alertAction("แอดมินปิดรับแทงหวยนี้แล้ว ระบบจะพาท่านกลับหน้าตลาด", "⛔ ปิดรับแทง", "error", "ตกลง", () => navigate('/play'));
                    } else {
                        toast.success("✅ หวยเปิดรับแทงแล้ว");
                    }
                }
            ).subscribe();

        const riskChannel = supabase
            .channel(`realtime-risks-${id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'number_risks', filter: `lotto_type_id=eq.${id}` }, (_payload) => {
                    if (debounceRef.current) clearTimeout(debounceRef.current);
                    const randomDelay = 1000 + Math.floor(Math.random() * 2000);
                    debounceRef.current = setTimeout(() => {
                        toast('⚠️ มีการอัปเดตเลขอั้น/ปิดรับใหม่', { id: 'risk-update', icon: '🔄', style: { border: '1px solid #FFA500', padding: '16px', color: '#713200' }, duration: 3000 });
                        client.get(`/play/risks/${id}`).then(res => setRisks(res.data));
                        debounceRef.current = null;
                    }, randomDelay);
                }
            ).subscribe();

        return () => {
            supabase.removeChannel(statusChannel);
            supabase.removeChannel(riskChannel);
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [id, navigate]);

    const handleTabChange = (newTab: typeof tab) => {
        const hasData = bufferNumbers.length > 0 || currentInput.length > 0;
        if (hasData && newTab !== tab) {
            confirmAction("⚠️ มีรายการเลขที่เลือกค้างอยู่\nยืนยันที่จะเปลี่ยนหรือไม่?", () => setTab(newTab), "เปลี่ยน", "ยกเลิก");
            return; 
        }
        setTab(newTab);
    };

    const handleWinModeChange = (newMode: typeof winMode) => {
        const hasData = bufferNumbers.length > 0 || currentInput.length > 0;
        if (hasData && newMode !== winMode) {
            confirmAction("⚠️ ข้อมูลจะถูกล้าง ยืนยันหรือไม่?", () => setWinMode(newMode), "ยืนยัน", "ยกเลิก");
            return;
        }
        setWinMode(newMode);
    };

    useEffect(() => {
        setBufferNumbers([]); setRoot19Inputs([]); setCurrentInput(''); setPriceTop(''); setPriceBottom('');
    }, [tab, winMode]);

    useEffect(() => {
        if (bufferNumbers.length === 0) setRoot19Inputs([]);
    }, [bufferNumbers]);

    useEffect(() => {
        if (loading) return;
        setTimeout(() => { if (numberInputRef.current) numberInputRef.current.focus(); }, 100);
    }, [tab, winMode, loading]);

    const handleInputKeyDown = (e: React.KeyboardEvent, currentField: 'number' | 'top' | 'bottom') => {
        if (e.key === 'Tab') {
            e.preventDefault(); 
            if (currentField === 'number') { priceTopRef.current?.focus(); priceTopRef.current?.select(); } 
            else if (currentField === 'top') { priceBottomRef.current?.focus(); priceBottomRef.current?.select(); } 
            else if (currentField === 'bottom') { handleAddBill(); setTimeout(() => numberInputRef.current?.focus(), 100); }
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            if (currentField === 'number') priceTopRef.current?.focus();
            else if (currentField === 'top') priceBottomRef.current?.focus();
            else if (currentField === 'bottom') { handleAddBill(); setTimeout(() => numberInputRef.current?.focus(), 50); }
        }
    };
    
    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault(); 
        const text = e.clipboardData.getData('text');
        if (!text) return;
        const cleanText = text.replace(/\d+(?:\s*[*xX×]\s*\d+)+/g, ' ');
        const parts = cleanText.split(/[^0-9]+/).filter(x => x); 
        if (parts.length === 0) return;
        
        if (tab === 'win') {
            const joined = parts.join('');
            const config = getInputConfig(); 
            if (joined.length > 7) return toast.error('ตัวเลขสูงสุด 7 ตัว');
            if (joined.length >= config.min) { handleAddNumberToBuffer(joined); toast.success('วางและคำนวณอัตโนมัติ'); } 
            else {
                if (currentInput.length + joined.length > 7) return toast.error('ตัวเลขรวมกันเกิน 7 ตัว');
                setCurrentInput(prev => prev + joined);
            }
            return;
        }

        const config = getInputConfig();
        if (tab === '19') {
            const uniqueInputs = [...new Set(parts.filter(n => n.length === 1))];
            const availableSlots = 3 - root19Inputs.length;
            if (availableSlots <= 0) return toast.error("⚠️ รูดได้สูงสุด 3 ตัวต่อรอบบิล");
            const newRoots = uniqueInputs.filter(n => !root19Inputs.includes(n));
            if (newRoots.length === 0) return toast("เลขซ้ำหรือไม่มีเลขใหม่");
            const rootsToAdd = newRoots.slice(0, availableSlots);
            if (newRoots.length > availableSlots) toast(`นำเข้า ${availableSlots} ตัวแรก (${rootsToAdd.join(', ')}) เนื่องจากครบโควต้า`);
            else toast.success(`วางเลขรูด ${rootsToAdd.length} ตัวสำเร็จ`);

            const allGenNumbers: string[] = [];
            rootsToAdd.forEach(r => allGenNumbers.push(...generateNumbers(r, '19gate')));
            setRoot19Inputs(prev => [...prev, ...rootsToAdd]);
            setBufferNumbers(prev => [...prev, ...allGenNumbers]);
            return;
        }

        const validList: string[] = [];
        let errorCount = 0;
        parts.forEach(numStr => {
            if (numStr.length < config.min || numStr.length > config.max) { errorCount++; return; }
            validList.push(numStr);
        });
        if (validList.length > 0) {
            setBufferNumbers(prev => [...prev, ...validList]);
            toast.success(`วางเลขสำเร็จ ${validList.length} รายการ`);
        }
        if (errorCount > 0) toast.error(`ข้าม ${errorCount} ตัวที่หลักไม่ครบ/เกิน`);
    };

    // 🌟 ฟังก์ชันแคปจอแบบอัปเกรด (ใช้เทคนิค Promise รอรูป)
    const handleScreenshot = async () => {
        if (!billRef.current || cart.length === 0) return;
        const toastId = toast.loading('กำลังประมวลผลรูปภาพบิล...');
        
        try {
            await new Promise(resolve => setTimeout(resolve, 200));

            // 1. สร้างฟังก์ชันสำหรับวาดรูป (ยังไม่สั่งทำงานทันที)
            // 💡 ทริค: ลด pixelRatio จาก 2 เป็น 1.5 ภาพยังสวยคมชัด แต่ประมวลผลไวขึ้นและกิน RAM น้อยลงครึ่งนึง!
            const getBlobData = () => htmlToImage.toBlob(billRef.current!, {
                backgroundColor: '#ffffff',
                quality: 0.9,     
                pixelRatio: 1.5, 
                cacheBust: true, 
                filter: (node) => {
                    if (node instanceof HTMLElement && node.dataset.ignore) return false;
                    return true;
                }
            }).then(blob => {
                if (!blob) throw new Error('ไม่สามารถสร้างรูปภาพได้');
                return blob;
            });

            try {
                // 2. แผน A: สั่งคัดลอกทันที! โดยส่ง Promise (getBlobData) ไปให้เบราว์เซอร์รอ
                await navigator.clipboard.write([
                    new ClipboardItem({
                        'image/png': getBlobData() 
                    })
                ]);
                toast.success('คัดลอกรูปภาพแล้ว! นำไปวางส่งได้เลย', { id: toastId }); 
                
            } catch (clipboardError) {
                // 3. แผน B: ถ้าเบราว์เซอร์เก่าเกินไปหรือไม่ยอมรับ Promise ค่อยใช้วิธีดาวน์โหลด
                console.warn('Clipboard write failed, falling back to download', clipboardError);
                
                const blob = await getBlobData();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Bill_${lotto?.name || 'Lotto'}_${new Date().getTime()}.png`; 
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                toast.success('บันทึกรูปบิลลงเครื่องแล้ว!', { id: toastId });
            }
            
        } catch (error) {
            console.error('Screenshot error:', error);
            toast.error('แคปหน้าจอไม่สำเร็จ โปรดลองอีกครั้ง', { id: toastId });
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
        if (numToAdd.length < config.min) return toast.error(`กรุณาระบุตัวเลขอย่างน้อย ${config.min} ตัว`);

        if (tab === '19') {
            if (root19Inputs.length >= 3) return toast.error("⚠️ รูดได้สูงสุด 3 ตัวต่อรอบบิล");
            if (root19Inputs.includes(numToAdd)) return toast.error("⚠️ เลขนี้รูดไปแล้ว");
            setRoot19Inputs(prev => [...prev, numToAdd]);
        }

        let numbersToAdd: string[] = [numToAdd];
        if (tab === '19') numbersToAdd = generateNumbers(numToAdd, '19gate');
        else if (tab === 'win') {
            const mode = winMode === '2' ? 'win2' : 'win3';
            numbersToAdd = generateNumbers(numToAdd, mode, includeDoubles);
            if(numbersToAdd.length === 0) return toast.error("จับวินไม่ได้");
        }

        setBufferNumbers(prev => [...prev, ...numbersToAdd]);
        setCurrentInput('');
        focusInput();
    };

    useEffect(() => {
        const config = getInputConfig();
        if (tab !== 'win' && currentInput.length === config.max) {
            handleAddNumberToBuffer();
        }
    }, [currentInput, tab]);

    const handleQuickOption = (type: string) => {
        let list: string[] = [];
        if (type === 'prahan') {
            const front = generateSpecialNumbers('double_front' as any) || [];
            const sandwich = generateSpecialNumbers('sandwich' as any) || [];
            const back = generateSpecialNumbers('double_back' as any) || [];
            list = Array.from(new Set([...front, ...sandwich, ...back]));
        } else {
            list = generateSpecialNumbers(type as any) || [];
        }

        if (list.length > 0) {
            const newNumbers = list.filter(n => !bufferNumbers.includes(n));
            if (newNumbers.length > 0) {
                setBufferNumbers(prev => [...prev, ...newNumbers]);
                toast.success(`เพิ่ม ${newNumbers.length} รายการ`);
            } else { toast("เลขชุดนี้ถูกเลือกไว้หมดแล้ว"); }
        }
        focusInput();
    };

    const handleReverseBuffer = () => {
        if (bufferNumbers.length === 0) return;
        let newSet: string[] = [];
        bufferNumbers.forEach(num => newSet.push(...generateReturnNumbers(num)));
        setBufferNumbers(newSet); 
        toast.success(`กลับเลขเรียบร้อย`);
        focusInput();
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                if (document.activeElement instanceof HTMLInputElement && document.activeElement.type === 'text') return;
                e.preventDefault(); handleReverseBuffer();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [bufferNumbers]);

    const handleAddBill = () => {
        if (currentInput && currentInput.length >= getInputConfig().min) handleAddNumberToBuffer();

        let pendingNumbers: string[] = [];
        if (currentInput && currentInput.length >= getInputConfig().min && tab === 'win') {
            const mode = winMode === '2' ? 'win2' : 'win3';
            pendingNumbers = generateNumbers(currentInput, mode, includeDoubles);
            setCurrentInput('');
        }
        
        const finalNumbersToProcess = [...bufferNumbers, ...pendingNumbers];
        if (finalNumbersToProcess.length === 0) return toast.error("กรุณาระบุตัวเลข");
        if (!priceTop && !priceBottom) return toast.error("กรุณาระบุราคาอย่างน้อย 1 ช่อง");

        const pTop = Number(priceTop) || 0;
        const pBottom = Number(priceBottom) || 0;
        const currentRates = lotto?.rates || {};
        
        const getMin = (type: string) => Number(getRateVal(currentRates[type], 'min')) || 1;
        const getMax = (type: string) => Number(getRateVal(currentRates[type], 'max')) || 0;

        if (pTop > 0) {
            const typeToCheck = (tab === '3') ? '3top' : (tab === 'run' ? 'run_up' : '2up');
            const minBet = getMin(typeToCheck);
            if (pTop < minBet) return toast.error(`ราคาบน/วิ่งบน ขั้นต่ำ ${minBet} บาท`);
            const maxBet = getMax(typeToCheck);
            if (maxBet > 0 && pTop > maxBet) return toast.error(`ราคาบน/วิ่งบน สูงสุดไม่เกิน ${maxBet} บาท`);
        }

        if (pBottom > 0) {
            const typeToCheck = (tab === '3') ? '3tod' : (tab === 'run' ? 'run_down' : '2down');
            const minBet = getMin(typeToCheck);
            if (pBottom < minBet) return toast.error(`ราคาล่าง/โต๊ด ขั้นต่ำ ${minBet} บาท`);
            const maxBet = getMax(typeToCheck);
            if (maxBet > 0 && pBottom > maxBet) return toast.error(`ราคาล่าง/โต๊ด สูงสุดไม่เกิน ${maxBet} บาท`);
        }
        
        const newItems: CartItem[] = [];
        const currentBatchId = uuidv4();

        finalNumbersToProcess.forEach(num => {
            if (tab === '2' || tab === '19' || (tab === 'win' && winMode === '2')) {
                if (pTop > 0) newItems.push({ temp_id: uuidv4(), number: num, bet_type: '2up', amount: pTop, display_text: num, rate_pay: Number(getRateVal(currentRates['2up'], 'pay')), batch_id: currentBatchId });
                if (pBottom > 0) newItems.push({ temp_id: uuidv4(), number: num, bet_type: '2down', amount: pBottom, display_text: num, rate_pay: Number(getRateVal(currentRates['2down'], 'pay')), batch_id: currentBatchId });
            } else if (tab === '3' || (tab === 'win' && winMode === '3')) {
                if (pTop > 0) newItems.push({ temp_id: uuidv4(), number: num, bet_type: '3top', amount: pTop, display_text: num, rate_pay: Number(getRateVal(currentRates['3top'], 'pay')), batch_id: currentBatchId });
                if (pBottom > 0) newItems.push({ temp_id: uuidv4(), number: num, bet_type: '3tod', amount: pBottom, display_text: num, rate_pay: Number(getRateVal(currentRates['3tod'], 'pay')), batch_id: currentBatchId });
            } else if (tab === 'run') {
                if (pTop > 0) newItems.push({ temp_id: uuidv4(), number: num, bet_type: 'run_up', amount: pTop, display_text: num, rate_pay: Number(getRateVal(currentRates['run_up'], 'pay')), batch_id: currentBatchId });
                if (pBottom > 0) newItems.push({ temp_id: uuidv4(), number: num, bet_type: 'run_down', amount: pBottom, display_text: num, rate_pay: Number(getRateVal(currentRates['run_down'], 'pay')), batch_id: currentBatchId });
            }
        });

        if(newItems.length === 0) return toast.error("ไม่มีรายการที่เพิ่มได้");

        setCart(prev => [...newItems, ...prev]); 
        setBufferNumbers([]); setPriceTop(''); setPriceBottom('');
        toast.success(`เพิ่ม ${newItems.length} รายการ`);
    };

    const submitTicket = async () => {
        if (cart.length === 0) return;
        setIsSubmitting(true);
        const toastId = toast.loading('กำลังส่งโพย...');
        try {
            const payload = {
                lotto_type_id: lotto.id, note: note,
                items: cart.map(item => ({ number: item.number, bet_type: item.bet_type, amount: item.amount }))
            };
            const res = await client.post('/play/submit_ticket', payload);
            toast.dismiss(toastId);
            toast.success(`ส่งโพยสำเร็จ! รหัส: ${res.data.id.slice(0, 8)}`, { duration: 4000 });
            setCart([]); setNote('');
            if(id) fetchHistory(id); 
        } catch (err: any) {
            console.error(err);
            toast.dismiss(toastId);
            toast.error(err.response?.data?.detail || 'ส่งโพยไม่สำเร็จ');
        } finally { setIsSubmitting(false); }
        focusInput();
    };

    const totalAmount = cart.reduce((sum, item) => {
        const isClosed = risks.some(r => r.number === item.number && r.risk_type === 'CLOSE' && (r.specific_bet_type === 'ALL' || r.specific_bet_type === item.bet_type));
        return isClosed ? sum : sum + item.amount;
    }, 0);
    
    const labels = tab === '3' ? { top: '3 ตัวบน', bottom: '3 ตัวโต๊ด' } : (tab === 'run' ? { top: 'วิ่งบน', bottom: 'วิ่งล่าง' } : { top: 'บน', bottom: 'ล่าง' });

    const isDayOpen = useMemo(() => {
        if (lotto?.rules?.schedule_type === 'monthly') return true; 
        if (!lotto || !lotto.open_days) return true; 
        return lotto.open_days.includes(getTodayShort());
    }, [lotto]);

    if(loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-500 w-10 h-10"/></div>;
    
    if (!lotto || (!lotto.is_active || !isDayOpen)) {
        return (
            <div className="min-h-screen bg-slate-50 font-sans">
                <div className="bg-slate-900 text-white p-4 sticky top-0 z-30 flex items-center gap-3 shadow-lg">
                    <button onClick={() => navigate('/play')} className="p-2 hover:bg-white/10 rounded-lg transition-all"><ArrowLeft size={20} /></button>
                    <h1 className="text-lg font-bold truncate">{lotto ? lotto.name : 'ไม่พบข้อมูล'}</h1>
                </div>
                <div className="flex flex-col items-center justify-center h-[80vh] p-6 text-center animate-in zoom-in-95">
                    <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center mb-6 shadow-inner"><Clock size={48} className="text-slate-400" /></div>
                    <h2 className="text-2xl font-black text-slate-700 mb-2">{lotto && !lotto.is_active ? 'ปิดรับแทงชั่วคราว' : 'วันนี้ไม่อยู่ในรอบเปิดรับ'}</h2>
                    <p className="text-slate-500 mb-8 max-w-xs">{lotto && !lotto.is_active ? 'ทางระบบได้ทำการปิดรับแทงหวยนี้ชั่วคราว กรุณาตรวจสอบใหม่ภายหลัง' : `หวยนี้เปิดรับเฉพาะวัน: ${lotto?.open_days?.join(', ') || '-'}`}</p>
                    <button onClick={() => navigate('/play')} className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:scale-105 transition-all">กลับหน้าตลาด</button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white overflow-hidden font-sans" style={themeStyles} onMouseDown={handleBackgroundMouseDown}>
            <div className="mt-1 mx-4"><CountDownTimer targetDate={targetDate} onTimeout={handleTimeUp}/></div>
            <div className="flex flex-1 overflow-hidden relative">
                <div className="flex-1 overflow-y-auto pb-20 bg-white"> 
                    <div className="p-4 max-w-4xl mx-auto space-y-4">
                        <button onClick={() => navigate('/play')} className="flex items-center gap-1 text-gray-500 hover:text-gray-800 text-sm mb-2"><ArrowLeft size={16} /> กลับไปหน้าตลาด</button>
                    
                        <div ref={billRef} className="bg-white p-2 rounded-xl">
                            <div className={`rounded-lg p-3 flex justify-between items-center shadow-sm border ${themeClasses.light} ${themeClasses.border}`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-white border-2 border-white shadow-sm overflow-hidden shrink-0 flex items-center justify-center">
                                        {lotto.img_url ? (
                                            <img src={lotto.img_url} alt={lotto.name} className="w-full h-full object-cover" crossOrigin="anonymous" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }} />
                                        ) : (
                                            <div className="text-xl font-bold text-gray-400 bg-gray-100 w-full h-full flex items-center justify-center">{lotto.name.charAt(0)}</div>
                                        )}
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-gray-800 text-lg leading-tight">{lotto.name}</h2>
                                        <div className="text-xs text-gray-600 mt-1 flex items-center gap-1">ปิดรับ <span className="font-bold text-red-500 bg-red-50 px-1.5 rounded">{lotto.close_time?.substring(0,5)} น.</span></div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-gray-800 text-xs md:text-sm">งวดวันที่</div>
                                    <div className="text-sm md:text-base font-bold text-blue-600">{new Date().toLocaleDateString('th-TH')}</div>
                                </div>
                            </div>

                            {/* --- Component Numpad ใส่เลข --- */}
                            <BettingNumpad 
                                tab={tab}
                                winMode={winMode} 
                                includeDoubles={includeDoubles} setIncludeDoubles={setIncludeDoubles}
                                currentInput={currentInput} setCurrentInput={setCurrentInput}
                                bufferNumbers={bufferNumbers} setBufferNumbers={setBufferNumbers}
                                priceTop={priceTop} setPriceTop={setPriceTop}
                                priceBottom={priceBottom} setPriceBottom={setPriceBottom}
                                themeClasses={themeClasses} labels={labels} getInputConfig={getInputConfig}
                                handleTabChange={handleTabChange} handleWinModeChange={handleWinModeChange} 
                                handleInputKeyDown={handleInputKeyDown} handlePaste={handlePaste}
                                handleAddNumberToBuffer={handleAddNumberToBuffer} handleQuickOption={handleQuickOption}
                                handleReverseBuffer={handleReverseBuffer} handleAddBill={handleAddBill}
                                numberInputRef={numberInputRef} priceTopRef={priceTopRef}
                                priceBottomRef={priceBottomRef} addButtonRef={addButtonRef} focusInput={focusInput}
                            />
                            
                            {/* --- Component เรนเดอร์บิล --- */}
                            <BettingCart cart={cart} setCart={setCart} risks={risks} />

                            <div className="mt-8 mb-4">
                                <div className="flex items-center gap-2 mb-6">
                                    <span className="font-bold text-gray-800 whitespace-nowrap">หมายเหตุ:</span>
                                    <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="บันทึกช่วยจำ (ถ้ามี)" className="flex-1 border-b border-gray-300 focus:border-blue-500 outline-none px-2 py-1 bg-transparent text-sm" />
                                </div>
                                <div className="relative flex items-center justify-center py-2">
                                    <div className="text-center w-full">
                                        <h2 className="text-3xl font-bold text-gray-800 mb-1">รวม: {totalAmount.toLocaleString()} บาท</h2>
                                        <p className="text-xs text-gray-400">สรุปรายการ ณ {new Date().toLocaleString('th-TH')}</p>
                                    </div>
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 items-center gap-3">
                                        <div className="w-15 h-10 md:w-17 md:h-12 bg-white border-2 border-white shadow-md overflow-hidden flex items-center justify-center relative">
                                            {lotto.img_url ? (
                                                <img src={lotto.img_url} alt={lotto.name} className="w-full h-full object-cover" crossOrigin="anonymous" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }} />
                                            ) : (
                                                <div className="text-lg font-bold text-gray-400 bg-gray-100 w-full h-full flex items-center justify-center">{lotto.name.charAt(0)}</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mb-10 flex justify-center gap-3">
                            <button onClick={handleScreenshot} disabled={cart.length === 0} className={`px-4 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all border ${cart.length === 0 ? 'bg-white text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-green-700 text-white border-indigo-100 hover:bg-indigo-700 hover:scale-105 active:scale-95'}`}>
                                <Camera size={24} /> <span className="hidden md:inline">แคปจอ</span>
                            </button>
                            <button onClick={submitTicket} disabled={isSubmitting || cart.length === 0} className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg flex items-center gap-2 transition-all flex-1 md:flex-none justify-center md:min-w-50 ${isSubmitting || cart.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#2962FF] hover:bg-blue-700 hover:scale-105 active:scale-95'}`}>
                                {isSubmitting ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />} บันทึกโพย
                            </button>
                        </div>
                    </div>
                </div>
                
                {/* --- Component Sidebar (ข้อมูลฝั่งขวาบน Desktop) --- */}
                <BettingSidebar lotto={lotto} lottoStats={lottoStats} risks={risks} history={history} handleCancelTicket={handleCancelTicket} />
            </div>
        </div>
    );
}