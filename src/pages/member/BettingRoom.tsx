import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  History, 
  FileText,
  Camera,
  Check, Copy,
  Clock // ✅ เพิ่ม icon Clock
} from 'lucide-react';
import { type CartItem } from '../../types/lotto';
import { generateNumbers, generateSpecialNumbers, generateReturnNumbers } from '../../types/lottoLogic';
import { supabase } from '../../utils/supabaseClient.ts';
import toast from 'react-hot-toast';
import { alertAction, confirmAction } from '../../utils/toastUtils';

// --- Helper Functions ---

// ✅ 1. ฟังก์ชันหาวันปัจจุบัน (SUN, MON, ...)
const getTodayShort = () => {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  return days[new Date().getDay()];
};

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

const getCloseDate = (lotto: any, now: Date) => {
  if (!lotto.close_time) return null;
  
  const [cH, cM] = lotto.close_time.split(':').map(Number);
  const rules = lotto.rules || {}; 

  // --- A. หวยรายเดือน ---
  if (rules.schedule_type === 'monthly') {
      const targetDates = (rules.close_dates || [1, 16]).map(Number).sort((a: number, b: number) => a - b);
      const currentDay = now.getDate();
      let targetDay = -1;
      let targetMonth = now.getMonth();
      let targetYear = now.getFullYear();

      for (const d of targetDates) {
          if (d > currentDay) { targetDay = d; break; }
          if (d === currentDay) {
              const closeToday = new Date(now);
              closeToday.setHours(cH, cM, 0, 0);
              // ถ้ายังไม่เลยเวลาปิด ก็เอาวันนี้
              if (now <= closeToday) { targetDay = d; break; }
          }
      }

      if (targetDay === -1) {
          targetDay = targetDates[0]; 
          targetMonth++; 
          if (targetMonth > 11) { targetMonth = 0; targetYear++; }
      }
      return new Date(targetYear, targetMonth, targetDay, cH, cM, 0, 0);
  }

  // --- B. หวยรายวัน ---
  const closeDate = new Date(now);
  closeDate.setHours(cH, cM, 0, 0);

  // เช็คว่าข้ามวันหรือไม่
  const isOvernight = lotto.open_time && lotto.close_time && 
                      lotto.close_time.substring(0, 5) < lotto.open_time.substring(0, 5);

  if (isOvernight) {
      // กรณีข้ามวัน
      const currentTimeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      const closeTimeStr = lotto.close_time.substring(0, 5);
      
      if (currentTimeStr > closeTimeStr) {
          // เลยเวลาปิดแล้ว ให้เป้าหมายเป็นพรุ่งนี้
          closeDate.setDate(closeDate.getDate() + 1);
      }
  } else {
      // กรณีปกติ (ไม่ข้ามวัน)
      if (now > closeDate) {
          closeDate.setDate(closeDate.getDate() + 1);
      }
  }
  
  return closeDate;
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

const getStatusBadge = (status: string) => {
    switch(status) {
        case 'WIN': return <span className="bg-green-500/20 text-green-400 text-[10px] px-1.5 py-0.5 rounded border border-green-500/30">ถูกรางวัล</span>;
        case 'LOSE': return <span className="bg-red-500/10 text-red-400 text-[10px] px-1.5 py-0.5 rounded border border-red-500/20">ไม่ถูก</span>;
        case 'CANCELLED': return <span className="bg-gray-500/20 text-gray-400 text-[10px] px-1.5 py-0.5 rounded border border-gray-500/30">ยกเลิก</span>;
        default: return <span className="bg-yellow-500/20 text-yellow-400 text-[10px] px-1.5 py-0.5 rounded border border-yellow-500/30">รอผล</span>;
    }
};

const getContrastTextColor = (hexColor: string) => {
    if (!hexColor || !hexColor.startsWith('#')) return '#ffffff'; 
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 145 ? '#1e293b' : '#ffffff'; 
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

    // Focus Helper
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

    // Theme Logic
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

    // Data States
    const [lotto, setLotto] = useState<any>(null);
    const [risks, setRisks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState<any[]>([]);
    const [lottoStats, setLottoStats] = useState<any[]>([]);

    // Input States
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

    // ✅ คำนวณ targetDate แค่ครั้งเดียวตอนโหลด lotto เพื่อไม่ให้เวลากระโดดไปวันพรุ่งนี้ตอนหมดเวลา
    const targetDate = useMemo(() => {
        if (!lotto) return null;
        // ใช้เวลาปัจจุบันตอนที่โหลดข้อมูลมาคำนวณเป้าหมาย
        return getCloseDate(lotto, new Date());
    }, [lotto]); // จะคำนวณใหม่เฉพาะตอน lotto เปลี่ยน (เช่น โหลดครั้งแรก หรือ Realtime update)

    // Alert Action
    const handleTimeUp = useCallback(() => {
        alertAction(
            "หมดเวลาแทงแล้ว!\nระบบจะพาท่านกลับไปยังหน้าตลาด",
            "⛔ หมดเวลา",
            "error",
            "ตกลง",
            () => navigate('/play')
        );
    }, [navigate]);

    const isItemClosed = (item: CartItem) => {
        return risks.some(r => 
            r.number === item.number && 
            r.risk_type === 'CLOSE' && 
            (r.specific_bet_type === 'ALL' || r.specific_bet_type === item.bet_type)
        );
    };

    const fetchHistory = async (lottoId: string) => {
        try {
            const res = await client.get(`/play/history?limit=15&lotto_type_id=${lottoId}`);
            const historyData = Array.isArray(res.data) ? res.data : [];
            
            // เรียงลำดับโพยตามเวลาสร้างล่าสุดก่อน (ใหม่สุดขึ้นก่อน)
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

            // ตรวจสอบสถานะ active (สำหรับ Redirect) แต่เดี๋ยวเราจะมีหน้า Block UI ด้วย
            if (!currentLotto.is_active) {
                // toast.error("⛔ หวยนี้ปิดรับแทงชั่วคราว");
                // ไม่ต้อง Redirect ที่นี่ ปล่อยให้ไป Render หน้าปิด
            }

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

            if (currentLotto.theme_color) {
                applyThemeFromHex(currentLotto.theme_color);
            }

            await Promise.all([
                fetchHistory(id),
                fetchLottoStats(id)
            ]);

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
            },
            "ยืนยัน",
            "ยกเลิก"
        );
    };

    useEffect(() => {
        fetchData();
    }, [id]);  

    // ✅ useEffect สำหรับ Realtime (แก้ไขแล้ว)
    useEffect(() => {
        if (!id) return;

        // 1. Channel สำหรับดูสถานะหวย (เปิด/ปิด)
        const statusChannel = supabase
            .channel(`realtime-lotto-status-${id}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'lotto_types', filter: `id=eq.${id}` },
                (payload) => {
                    const updated = payload.new;
                    setLotto((prev: any) => ({ ...prev, is_active: updated.is_active }));
                    
                    if (!updated.is_active) {
                        // ✅ เพิ่มการเด้งออกเมื่อแอดมินปิด
                        alertAction(
                            "แอดมินปิดรับแทงหวยนี้แล้ว ระบบจะพาท่านกลับหน้าตลาด",
                            "⛔ ปิดรับแทง",
                            "error",
                            "ตกลง",
                            () => navigate('/play')
                        );
                    } else {
                        toast.success("✅ หวยเปิดรับแทงแล้ว");
                    }
                }
            )
            .subscribe();

        // 2. Channel สำหรับเลขอั้น (เหมือนเดิม)
        const riskChannel = supabase
            .channel(`realtime-risks-${id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'number_risks',
                    filter: `lotto_type_id=eq.${id}`
                },
                (_payload) => {
                    if (debounceRef.current) {
                        clearTimeout(debounceRef.current);
                    }

                    debounceRef.current = setTimeout(() => {
                        toast('⚠️ มีการอัปเดตเลขอั้น/ปิดรับใหม่', {
                            id: 'risk-update',
                            icon: '🔄',
                            style: {
                                border: '1px solid #FFA500',
                                padding: '16px',
                                color: '#713200',
                            },
                            duration: 3000
                        });

                        client.get(`/play/risks/${id}`).then(res => {
                            setRisks(res.data);
                        });

                        debounceRef.current = null;
                    }, 1000);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(statusChannel);
            supabase.removeChannel(riskChannel);
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [id, navigate]);

    const handleTabChange = (newTab: typeof tab) => {
        const hasData = bufferNumbers.length > 0 || currentInput.length > 0;
        if (hasData && newTab !== tab) {
            confirmAction(
                "⚠️ มีรายการเลขที่เลือกค้างอยู่\nยืนยันที่จะเปลี่ยนหรือไม่?",
                () => setTab(newTab),
                "เปลี่ยน",
                "ยกเลิก"
            );
            return; 
        }
        setTab(newTab);
    };

    const handleWinModeChange = (newMode: typeof winMode) => {
        const hasData = bufferNumbers.length > 0 || currentInput.length > 0;
        if (hasData && newMode !== winMode) {
            confirmAction(
                "⚠️ ข้อมูลจะถูกล้าง ยืนยันหรือไม่?",
                () => setWinMode(newMode),
                "ยืนยัน",
                "ยกเลิก"
            );
            return;
        }
        setWinMode(newMode);
    };

    useEffect(() => {
        setBufferNumbers([]);
        setRoot19Inputs([]); 
        setCurrentInput('');
        setPriceTop('');
        setPriceBottom('');
    }, [tab, winMode]);

    useEffect(() => {
        if (bufferNumbers.length === 0) {
            setRoot19Inputs([]);
        }
    }, [bufferNumbers]);

    useEffect(() => {
        if (loading) return;
        setTimeout(() => {
            if (numberInputRef.current) {
                numberInputRef.current.focus();
            }
        }, 100);
    }, [tab, winMode, loading]);

    const handleInputKeyDown = (e: React.KeyboardEvent, currentField: 'number' | 'top' | 'bottom') => {
        if (e.key === 'Tab') {
            e.preventDefault(); 
            if (currentField === 'number') {
                priceTopRef.current?.focus();
                priceTopRef.current?.select();
            } 
            else if (currentField === 'top') {
                priceBottomRef.current?.focus();
                priceBottomRef.current?.select();
            } 
            else if (currentField === 'bottom') {
                handleAddBill(); 
                setTimeout(() => {
                    numberInputRef.current?.focus();
                }, 100);
            }
        }
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
    
    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault(); 
        const text = e.clipboardData.getData('text');
        if (!text) return;
        const parts = text.split(/[^0-9]+/).filter(x => x); 
        if (parts.length === 0) return;

        if (tab === 'win') {
            const joined = parts.join('');
            const config = getInputConfig(); 
            if (joined.length > 7) return toast.error('ตัวเลขสูงสุด 7 ตัว');
            if (joined.length >= config.min) {
                handleAddNumberToBuffer(joined); 
                toast.success('วางและคำนวณอัตโนมัติ');
            } else {
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
            rootsToAdd.forEach(r => {
                allGenNumbers.push(...generateNumbers(r, '19gate'));
            });
            setRoot19Inputs(prev => [...prev, ...rootsToAdd]);
            setBufferNumbers(prev => [...prev, ...allGenNumbers]);
            return;
        }

        const validList: string[] = [];
        let errorCount = 0;
        parts.forEach(numStr => {
            if (numStr.length < config.min || numStr.length > config.max) {
                errorCount++;
                return;
            }
            validList.push(numStr);
        });
        if (validList.length > 0) {
            setBufferNumbers(prev => [...prev, ...validList]);
            toast.success(`วางเลขสำเร็จ ${validList.length} รายการ`);
        }
        if (errorCount > 0) toast.error(`ข้าม ${errorCount} ตัวที่หลักไม่ครบ/เกิน`);
    };

    const handleScreenshot = async () => {
        if (!billRef.current || cart.length === 0) return;
        const toastId = toast.loading('กำลังประมวลผล...');
        try {
            const blob = await htmlToImage.toBlob(billRef.current, {
                backgroundColor: '#ffffff',
                quality: 1.0,
                pixelRatio: 2,
                style: { minWidth: '1720px' },
                filter: (node) => {
                    if (node instanceof HTMLElement && node.dataset.ignore) return false;
                    return true;
                }
            });
            if (!blob) throw new Error('ไม่สามารถสร้างรูปภาพได้');
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);
            toast.dismiss(toastId);
            toast.success('คัดลอกรูปแล้ว!'); 
        } catch (error) {
            toast.dismiss(toastId);
            toast.error('คัดลอกไม่สำเร็จ');
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
        focusInput();
    };

    const handleReverseBuffer = () => {
        if (bufferNumbers.length === 0) return;
        let newSet: string[] = [];
        bufferNumbers.forEach(num => {
            const perms = generateReturnNumbers(num); 
            newSet.push(...perms);
        });
        setBufferNumbers(newSet); 
        toast.success(`กลับเลขเรียบร้อย`);
        focusInput();
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                if (document.activeElement instanceof HTMLInputElement && document.activeElement.type === 'text') return;
                e.preventDefault();
                handleReverseBuffer();
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
        
        const getMin = (type: string) => {
            const rate = currentRates[type];
            return Number(getRateVal(rate, 'min')) || 1;
        };
        const getMax = (type: string) => {
            const rate = currentRates[type];
            return Number(getRateVal(rate, 'max')) || 0;
        };

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
                if (pTop > 0) newItems.push({ 
                    temp_id: uuidv4(), number: num, bet_type: '2up', amount: pTop, display_text: num,
                    rate_pay: Number(getRateVal(currentRates['2up'], 'pay')), batch_id: currentBatchId
                });
                if (pBottom > 0) newItems.push({ 
                    temp_id: uuidv4(), number: num, bet_type: '2down', amount: pBottom, display_text: num,
                    rate_pay: Number(getRateVal(currentRates['2down'], 'pay')), batch_id: currentBatchId
                });
            } else if (tab === '3' || (tab === 'win' && winMode === '3')) {
                if (pTop > 0) newItems.push({ 
                    temp_id: uuidv4(), number: num, bet_type: '3top', amount: pTop, display_text: num,
                    rate_pay: Number(getRateVal(currentRates['3top'], 'pay')), batch_id: currentBatchId
                });
                if (pBottom > 0) newItems.push({ 
                    temp_id: uuidv4(), number: num, bet_type: '3tod', amount: pBottom, display_text: num,
                    rate_pay: Number(getRateVal(currentRates['3tod'], 'pay')), batch_id: currentBatchId
                });
            } else if (tab === 'run') {
                if (pTop > 0) newItems.push({ 
                    temp_id: uuidv4(), number: num, bet_type: 'run_up', amount: pTop, display_text: num,
                    rate_pay: Number(getRateVal(currentRates['run_up'], 'pay')), batch_id: currentBatchId
                });
                if (pBottom > 0) newItems.push({ 
                    temp_id: uuidv4(), number: num, bet_type: 'run_down', amount: pBottom, display_text: num,
                    rate_pay: Number(getRateVal(currentRates['run_down'], 'pay')), batch_id: currentBatchId
                });
            }
        });

        if(newItems.length === 0) return toast.error("ไม่มีรายการที่เพิ่มได้");

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
        const itemsByNum = new Map<string, CartItem[]>();
        batchItems.forEach(item => {
            if (!itemsByNum.has(item.number)) itemsByNum.set(item.number, []);
            itemsByNum.get(item.number)?.push(item);
        });

        const groups = new Map<string, any>();
        const typeOrder = ['2up', '2down', '3top', '3tod', 'run_up', 'run_down'];
        const sortTypes = (a: string, b: string) => typeOrder.indexOf(a) - typeOrder.indexOf(b);

        itemsByNum.forEach((userItems, number) => {
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
                const sig = currentSetItems.map(i => `${i.bet_type}:${i.amount}`).join('|');
                const labelStr = currentSetItems.map(i => getTypeLabel(i.bet_type)).join(' x ');
                const priceStr = currentSetItems.map(i => i.amount).join(' x ');

                if (!groups.has(sig)) {
                    groups.set(sig, {
                        key: uuidv4(), labelStr, priceStr, instances: [], allGroupItems: []
                    });
                }
                const group = groups.get(sig)!;
                group.instances.push({ number, items: currentSetItems });
                group.allGroupItems.push(...currentSetItems);
            }
        });
        return Array.from(groups.values());
    };

    const getGroupedCartItems = () => {
        const batches = new Map<string, CartItem[]>();
        cart.forEach(item => {
            const bId = (item as any).batch_id || 'legacy';
            if (!batches.has(bId)) batches.set(bId, []);
            batches.get(bId)?.push(item);
        });

        const allGroups: any[] = [];
        const seenBatches = new Set<string>();
        cart.forEach(item => {
            const bId = (item as any).batch_id || 'legacy';
            if (!seenBatches.has(bId)) {
                seenBatches.add(bId);
                const batchItems = batches.get(bId) || [];
                const batchGroups = groupItemsInBatch(batchItems);
                allGroups.push(...batchGroups);
            }
        });
        return allGroups;
    };

    const copyGroupNumbers = (instances: any[]) => {
        const textToCopy = instances.map(inst => inst.number).join(',');
        navigator.clipboard.writeText(textToCopy).then(() => {
            toast.success('คัดลอกตัวเลขเรียบร้อย!');
        }).catch(() => {
            toast.error('คัดลอกไม่สำเร็จ');
        });
    };

    const deleteGroup = (items: CartItem[]) => {
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
            if(id) fetchHistory(id); 
        } catch (err: any) {
            console.error(err);
            toast.dismiss(toastId);
            toast.error(err.response?.data?.detail || 'ส่งโพยไม่สำเร็จ');
        } finally {
            setIsSubmitting(false);
        }
        focusInput();
    };

    const totalAmount = cart.reduce((sum, item) => {
        if (isItemClosed(item)) return sum;
        return sum + item.amount;
    }, 0);
    
    const labels = tab === '3' ? { top: '3 ตัวบน', bottom: '3 ตัวโต๊ด' } : (tab === 'run' ? { top: 'วิ่งบน', bottom: 'วิ่งล่าง' } : { top: 'บน', bottom: 'ล่าง' });

    // ✅ Logic เช็ควันเปิด
    const isDayOpen = useMemo(() => {
        // ถ้าเป็นหวยรายเดือน ให้เปิดตลอด (ยกเว้น Logic เวลาใน getCloseDate จะจัดการเอง)
        if (lotto?.rules?.schedule_type === 'monthly') return true; 

        if (!lotto || !lotto.open_days) return true; // กันเหนียว
        const today = getTodayShort();
        return lotto.open_days.includes(today);
    }, [lotto]);

    if(loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-500 w-10 h-10"/></div>;
    
    // ✅ ถ้าไม่มี Lotto หรือ ปิดรับ (is_active) หรือ วันไม่ตรง -> โชว์หน้า Block
    if (!lotto || (!lotto.is_active || !isDayOpen)) {
        return (
            <div className="min-h-screen bg-slate-50 font-sans">
                {/* Header */}
                <div className="bg-slate-900 text-white p-4 sticky top-0 z-30 flex items-center gap-3 shadow-lg">
                    <button onClick={() => navigate('/play')} className="p-2 hover:bg-white/10 rounded-lg transition-all">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-lg font-bold truncate">{lotto ? lotto.name : 'ไม่พบข้อมูล'}</h1>
                </div>

                {/* Content Block */}
                <div className="flex flex-col items-center justify-center h-[80vh] p-6 text-center animate-in zoom-in-95">
                    <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center mb-6 shadow-inner">
                        <Clock size={48} className="text-slate-400" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-700 mb-2">
                        {lotto && !lotto.is_active ? 'ปิดรับแทงชั่วคราว' : 'วันนี้ไม่อยู่ในรอบเปิดรับ'}
                    </h2>
                    <p className="text-slate-500 mb-8 max-w-xs">
                        {lotto && !lotto.is_active 
                            ? 'ทางระบบได้ทำการปิดรับแทงหวยนี้ชั่วคราว กรุณาตรวจสอบใหม่ภายหลัง'
                            : `หวยนี้เปิดรับเฉพาะวัน: ${lotto?.open_days?.join(', ') || '-'}`
                        }
                    </p>
                    <button 
                        onClick={() => navigate('/play')}
                        className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:scale-105 transition-all"
                    >
                        กลับหน้าตลาด
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div 
            className="flex flex-col h-full bg-white overflow-hidden font-sans"
            style={themeStyles} 
            onMouseDown={handleBackgroundMouseDown}
        >
            <div className="mt-1 mx-4">
                <CountDownTimer 
                // ✅ ส่ง targetDate ที่ล็อคค่าแล้ว (useMemo) ไม่เปลี่ยนตามการพิมพ์
                targetDate={targetDate} 
                onTimeout={handleTimeUp}
                />
            </div>
            <div className="flex flex-1 overflow-hidden relative">
            
                <div className="flex-1 overflow-y-auto pb-20 bg-white"> 
                    <div className="p-4 max-w-4xl mx-auto space-y-4">
                        
                        <button onClick={() => navigate('/play')} className="flex items-center gap-1 text-gray-500 hover:text-gray-800 text-sm mb-2">
                            <ArrowLeft size={16} /> กลับไปหน้าตลาด
                        </button>
                    <div ref={billRef} className="bg-white p-2 rounded-xl">
                        <div className={`rounded-lg p-3 flex justify-between items-center shadow-sm border ${themeClasses.light} ${themeClasses.border}`}>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-white border-2 border-white shadow-sm overflow-hidden shrink-0 flex items-center justify-center">
                                    {lotto.img_url ? (
                                        <img 
                                            src={lotto.img_url} 
                                            alt={lotto.name} 
                                            className="w-full h-full object-cover"
                                            crossOrigin="anonymous" 
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); 
                                            }}
                                        />
                                    ) : (
                                        <div className="text-xl font-bold text-gray-400 bg-gray-100 w-full h-full flex items-center justify-center">
                                            {lotto.name.charAt(0)}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <h2 className="font-bold text-gray-800 text-lg leading-tight">{lotto.name}</h2>
                                    <div className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                                        ปิดรับ <span className="font-bold text-red-500 bg-red-50 px-1.5 rounded">{lotto.close_time?.substring(0,5)} น.</span>
                                    </div>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="font-bold text-gray-800 text-xs md:text-sm">งวดวันที่</div>
                                <div className="text-sm md:text-base font-bold text-blue-600">{new Date().toLocaleDateString('th-TH')}</div>
                            </div>
                        </div>

                        <div className="bg-[#F8FAFC] border border-gray-200 rounded-lg p-4 shadow-sm relative">
                            
                            <div className="flex flex-wrap gap-1 mb-4 text-nowrap">
                                {[{ id: '2', label: '2 ตัว' }, { id: '3', label: '3 ตัว' }, { id: '19', label: '19 ประตู' }, { id: 'run', label: 'เลขวิ่ง' }, { id: 'win', label: 'วินเลข' }].map((t) => (
                                    <button key={t.id} onClick={() => handleTabChange(t.id as any)} className={`px-4 py-1.5 rounded-md text-sm font-bold border transition-colors ${
                                        tab === t.id 
                                        ? `${themeClasses.main} border-transparent shadow-sm` 
                                        : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    {t.label}
                                    </button>
                                ))}
                            </div>

                            {tab === 'win' && (
                                <div className="flex flex-col gap-2 mb-4 w-fit">
                                    <div className="flex gap-1 bg-white p-1 rounded-md border justify-center border-green-200 ">
                                        <button onClick={() => handleWinModeChange('2')} className={`px-4 py-1 rounded text-xs font-bold transition-all ${winMode === '2' ? `${themeClasses.main} shadow-sm` : 'text-gray-500 hover:bg-gray-100'}`}>วิน 2 ตัว</button>
                                        <button onClick={() => handleWinModeChange('3')} className={`px-4 py-1 rounded text-xs font-bold transition-all ${winMode === '3' ? `${themeClasses.main} shadow-sm` : 'text-gray-500 hover:bg-gray-100'}`}>วิน 3 ตัว</button>
                                    </div>
                                    <div className="flex gap-1 bg-white p-1 rounded-md border border-blue-200">
                                        <button 
                                            onClick={() => { setIncludeDoubles(false); focusInput(); }} 
                                            className={`px-4 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 ${!includeDoubles ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
                                        >
                                            {!includeDoubles && <Check size={12} />} ไม่รวมเบิ้ล
                                        </button>
                                        <button 
                                            onClick={() => { setIncludeDoubles(true); focusInput(); }} 
                                            className={`px-4 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 ${includeDoubles ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
                                        >
                                            {includeDoubles && <Check size={12} />} รวมเบิ้ล
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-2 mb-2">
                                <button 
                                    onClick={() => { setBufferNumbers([]); focusInput(); }} 
                                    disabled={bufferNumbers.length === 0} 
                                    className="text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-md text-xs flex items-center gap-1 transition-colors disabled:opacity-50"
                                >
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
                                                className={`px-2 py-1 rounded text-sm font-bold shadow-sm cursor-pointer transition-colors select-none ${themeClasses.main} hover:bg-red-500 hover:text-white`}
                                                title="กดเพื่อลบเลขนี้"
                                            >
                                                {n}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

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
                                                        if (prev.length >= 7) return prev; 
                                                        return prev + strNum;
                                                    })}
                                                    className={`
                                                        font-bold text-lg py-3 rounded-lg shadow-sm transition-all border
                                                        ${isSelected 
                                                            ? `${themeClasses.main} border-transparent`
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

                            {tab !== 'win' && (
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {tab === '2' && (
                                        <>
                                            <button onClick={() => handleQuickOption('double')} className={`px-3 py-1.5 rounded-md text-xs font-bold ${themeClasses.main} ${themeClasses.hover}`}>+ เลขเบิ้ล</button>
                                            <button onClick={() => handleQuickOption('sibling')} className="bg-[#E67E22] text-white px-3 py-1.5 rounded-md text-xs font-bold hover:bg-[#D35400]">+ พี่น้อง</button>
                                        </>
                                    )}
                                    {tab === '3' && (
                                        <>
                                            <button onClick={() => handleQuickOption('triple')} className={`px-3 py-1.5 rounded-md text-xs font-bold ${themeClasses.main} ${themeClasses.hover}`}>+ ตอง</button>
                                            <button onClick={() => handleQuickOption('double_front')} className="bg-[#1E88E5] text-white px-3 py-1.5 rounded-md text-xs font-bold">+ เบิ้ลหน้า</button>
                                            <button onClick={() => handleQuickOption('sandwich')} className="bg-[#8E24AA] text-white px-3 py-1.5 rounded-md text-xs font-bold">+ หาม</button>
                                            <button onClick={() => handleQuickOption('double_back')} className="bg-[#00897B] text-white px-3 py-1.5 rounded-md text-xs font-bold">+ เบิ้ลหลัง</button>
                                        </>
                                    )}
                                    {tab === '19' && (
                                        <button onClick={() => handleQuickOption('double')} className={`px-3 py-1.5 rounded-md text-xs font-bold ${themeClasses.main} ${themeClasses.hover}`}>+ รูดเบิ้ล</button>
                                    )}
                                </div>
                            )}
                            
                            <div className={`${themeClasses.light} p-3 rounded-lg border ${themeClasses.border} flex flex-col lg:flex-row gap-2 items-stretch lg:items-center transition-all duration-300`}>
                                <div className="w-full lg:flex-1 min-w-0">
                                    <label className="text-xs text-gray-500 font-bold mb-1 block lg:hidden">ใส่เลข</label>
                                    
                                    <input 
                                        ref={numberInputRef} 
                                        type="tel" 
                                        value={currentInput}
                                        onChange={e => setCurrentInput(e.target.value.replace(/[^0-9]/g, ''))}
                                        onKeyDown={(e) => handleInputKeyDown(e, 'number')}
                                        onPaste={handlePaste} 
                                        placeholder={tab === 'win' ? "เลือกเลขวิน..." : "ใส่เลข"} 
                                        className={`w-full bg-white/90 border-b-2 text-center text-xl font-bold py-1 focus:outline-none text-gray-700 placeholder-blue-300 rounded-sm ${themeClasses.border} ${themeClasses.focus}`}
                                        maxLength={getInputConfig().max}
                                    />
                                </div>

                                {(tab === '2' || tab === '3' || tab === 'win') && (
                                    <button 
                                        onClick={handleReverseBuffer}
                                        disabled={bufferNumbers.length === 0}
                                        title="กด Spacebar เพื่อกลับเลข"
                                        className="bg-[#F39C12] hover:bg-[#E67E22] disabled:bg-gray-300 disabled:text-gray-500 text-white font-bold px-4 py-2 rounded-md shadow-md transition-all flex items-center justify-center gap-1 w-full lg:w-auto lg:shrink-0 whitespace-nowrap h-11"
                                    >
                                        <Settings2 size={18} /> กลับเลข
                                    </button>
                                )}

                                <div className="flex gap-2 w-full lg:w-auto lg:shrink-0">
                                    <div className="flex-1 lg:flex-none">
                                        <label className="text-xs text-gray-500 font-bold mb-1 block lg:hidden text-center">{labels.top}</label>
                                        
                                        <input 
                                            ref={priceTopRef} 
                                            type="tel" 
                                            value={priceTop}
                                            onChange={e => setPriceTop(e.target.value)}
                                            onKeyDown={(e) => handleInputKeyDown(e, 'top')} 
                                            placeholder={labels.top}
                                            className={`w-full lg:w-24 bg-white/90 border-b-2 text-center font-bold py-1 focus:outline-none text-gray-700 rounded-sm ${themeClasses.border} ${themeClasses.focus}`}
                                        />
                                    </div>
                                    <div className="flex-1 lg:flex-none">
                                        <label className="text-xs text-gray-500 font-bold mb-1 block lg:hidden text-center">{labels.bottom}</label>
                                        
                                        <input 
                                            ref={priceBottomRef} 
                                            type="tel" 
                                            value={priceBottom}
                                            onChange={e => setPriceBottom(e.target.value)}
                                            onKeyDown={(e) => handleInputKeyDown(e, 'bottom')} 
                                            placeholder={labels.bottom}
                                            className={`w-full lg:w-24 bg-white/90 border-b-2 text-center font-bold py-1 focus:outline-none text-gray-700 rounded-sm ${themeClasses.border} ${themeClasses.focus}`}
                                        />
                                    </div>
                                </div>

                                <button 
                                    ref={addButtonRef}
                                    onClick={() => {
                                        handleAddBill();
                                        setTimeout(() => numberInputRef.current?.focus(), 50);
                                    }}
                                    
                                    className={`font-bold px-6 py-2 rounded-md shadow-md active:scale-95 transition-all flex items-center justify-center gap-1 w-full lg:w-auto lg:shrink-0 h-11 whitespace-nowrap ${themeClasses.main} ${themeClasses.hover}`}
                                >
                                    <span className="text-lg">+</span> เพิ่มบิล
                                </button>
                            </div>

                        </div>
                        
                        {cart.length > 0 && (
                            <div className="mt-6 space-y-3 animate-fade-in">
                                {getGroupedCartItems().map((group) => (
                                    <div key={group.key} className="bg-white rounded-xl border border-gray-200 shadow-sm flex overflow-hidden">
                                        
                                        <div className="w-28 bg-blue-50 border-r border-blue-100 p-2 flex flex-col justify-center items-center text-center shrink-0">
                                            <div className="font-bold text-slate-700 text-[10px] md:text-xs mb-1 line-clamp-2 leading-tight">
                                                {group.labelStr}
                                            </div>
                                            <div className="text-xs md:text-sm font-black text-blue-600">
                                                {group.priceStr}
                                            </div>
                                        </div>

                                        <div className="flex-1 p-3 bg-white flex flex-wrap gap-2 items-center content-center">
                                            {group.instances.map((inst: { number: string, items: CartItem[] }, idx: number) => {
                                                const isHalf = inst.items.some(item => 
                                                    risks.some(r => r.number === item.number && r.risk_type === 'HALF' && (r.specific_bet_type === 'ALL' || r.specific_bet_type === item.bet_type))
                                                );
                                                
                                                const isClosed = inst.items.some(item => isItemClosed(item));
                                                
                                                return (
                                                    <div 
                                                        key={`${group.key}-${inst.number}-${idx}`}
                                                        className="relative group/chip cursor-text selectable-text"
                                                    >
                                                        <span className={`font-mono font-bold text-base px-2 py-1 rounded border transition-colors flex items-center gap-1
                                                            ${isClosed 
                                                                ? 'bg-red-100 text-red-500 border-red-200 line-through opacity-75' 
                                                                : 'text-slate-700 bg-gray-100 border-gray-200'
                                                            }
                                                        `}>
                                                            {inst.number}
                                                        </span>
                                                        
                                                        {isHalf && !isClosed && (
                                                            <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3 z-10">
                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500 border border-white"></span>
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="w-10 bg-gray-50 border-l border-gray-100 flex flex-col shrink-0">
                                        {/* ปุ่ม Copy */}
                                        <button 
                                            onClick={() => copyGroupNumbers(group.instances)}
                                            data-ignore="true"
                                            className="flex-1 flex items-center justify-center text-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors border-b border-gray-100"
                                            title="คัดลอกตัวเลขทั้งหมด"
                                        >
                                            <Copy size={16} />
                                        </button>

                                        {/* ปุ่ม Delete (ถังขยะ) */}
                                        <button 
                                            onClick={() => deleteGroup(group.allGroupItems)}
                                            className="flex-1 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                            title="ลบรายการนี้"
                                            data-ignore="true"
                                        >
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

                                <div className="absolute right-0 top-1/2 -translate-y-1/2 items-center gap-3">
                                    <div className="w-15 h-10 md:w-17 md:h-12 bg-white border-2 border-white shadow-md overflow-hidden flex items-center justify-center relative">
                                        {lotto.img_url ? (
                                            <img 
                                                src={lotto.img_url} 
                                                alt={lotto.name} 
                                                className="w-full h-full object-cover"
                                                crossOrigin="anonymous" 
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
                                        <div className="hidden absolute text-lg font-bold text-gray-400">
                                            {lotto.name.charAt(0)}
                                        </div>
                                    </div>
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
                
                {/* ----------------- ส่วน Sidebar ขวา (Desktop) ----------------- */}
                <div className="hidden lg:flex w-80 bg-[#1e293b] text-white border-l border-gray-700 flex-col shadow-xl z-10 overflow-y-auto">
                    
                    {/* Header สถิติ */}
                    <div className="p-4 bg-[#0f172a] border-b border-gray-700">
                        <h3 className="font-bold text-lg text-amber-400 flex items-center gap-2">
                            <History size={18}/> สถิติผลรางวัล
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">{lotto.name} (5 งวดล่าสุด)</p>
                    </div>

                    <div className="p-3 space-y-6">
                        
                        {/* ตารางสถิติ */}
                        <div className="bg-[#1e293b] rounded-lg overflow-hidden border border-gray-700">
                            <table className="w-full text-xs text-center">
                                <thead className="bg-[#334155] text-white font-bold">
                                    <tr>
                                        <th className="p-2 text-left pl-3">งวดวันที่</th>
                                        <th className="p-2 text-yellow-400">3 บน</th>
                                        <th className="p-2 text-blue-300">2 บน</th>
                                        <th className="p-2 text-green-400">2 ล่าง</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {lottoStats.map((stat: any, idx: number) => {
                                        const twoTop = stat.top_3 ? stat.top_3.slice(-2) : '-'; // คำนวณ 2 ตัวบน
                                        return (
                                            <tr key={idx} className="hover:bg-gray-800 transition-colors">
                                                <td className="p-2 text-left pl-3 text-gray-300 font-mono">
                                                    {new Date(stat.round_date).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit' })}
                                                </td>
                                                <td className="p-2 text-yellow-400 font-bold tracking-wider">{stat.top_3}</td>
                                                <td className="p-2 text-blue-300 font-bold tracking-wider">{twoTop}</td>
                                                <td className="p-2 text-green-400 font-bold tracking-wider">{stat.bottom_2}</td>
                                            </tr>
                                        );
                                    })}
                                    {lottoStats.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-4 text-center text-gray-500">
                                                ยังไม่มีผลรางวัล
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* ส่วนเลขอั้น/ปิดรับ */}
                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1 mt-4">
                            <Settings2 size={12}/> เลขอั้น / ปิดรับ
                        </h4>
                        <div className="bg-[#0f172a] rounded-lg border border-gray-700 p-3 min-h-25 custom-scrollbar overflow-y-auto max-h-100">
                            {risks.length === 0 ? (
                                <div className="text-center text-gray-500 text-xs py-4">✅ ไม่มีเลขอั้น</div>
                            ) : (
                                <div className="space-y-4">
                                    {risks.some(r => r.risk_type === 'CLOSE') && (
                                        <div className="relative">
                                            <div className="sticky top-0 bg-[#0f172a] z-10 pb-1 mb-1 border-b border-red-500/20">
                                                <div className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                                                    ⛔ ปิดรับ (ห้ามแทง)
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-2">
                                                {['ALL', '2up', '2down', '3top', '3tod', 'run_up', 'run_down'].map(typeKey => {
                                                    const items = risks.filter(r => r.risk_type === 'CLOSE' && (r.specific_bet_type || 'ALL') === typeKey);
                                                    if (items.length === 0) return null;

                                                    const typeName = {
                                                        'ALL': '⛔ เหมา(ทุกประเภท)',
                                                        '2up': '2 ตัวบน', '2down': '2 ตัวล่าง',
                                                        '3top': '3 ตัวบน', '3tod': '3 ตัวโต๊ด',
                                                        'run_up': 'วิ่งบน', 'run_down': 'วิ่งล่าง'
                                                    }[typeKey] || typeKey;

                                                    return (
                                                        <div key={typeKey} className="pl-1">
                                                            <div className="text-[13px] text-white mb-0.5 font-medium">{typeName}</div>
                                                            <div className="flex flex-wrap gap-1">
                                                                {items.map(r => (
                                                                    <span key={r.id} className="bg-red-500/10 text-red-500 border border-red-500/20 px-0.5 py-0.2 rounded text-[13.5px] font-mono font-bold">
                                                                        {r.number}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {risks.some(r => r.risk_type === 'HALF') && (
                                        <div className="relative pt-2">
                                            <div className="sticky top-0 bg-[#0f172a] z-10 pb-1 mb-1 border-b border-orange-500/20">
                                                <div className="text-[10px] font-bold text-orange-400 flex items-center gap-1">
                                                    ⚠️ จ่ายครึ่ง (อั้น)
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                {['ALL', '2up', '2down', '3top', '3tod', 'run_up', 'run_down'].map(typeKey => {
                                                    const items = risks.filter(r => r.risk_type !== 'CLOSE' && (r.specific_bet_type || 'ALL') === typeKey);
                                                    if (items.length === 0) return null;

                                                    const typeName = {
                                                        'ALL': '⚠️ เหมา(ทุกประเภท)',
                                                        '2up': '2 ตัวบน', '2down': '2 ตัวล่าง',
                                                        '3top': '3 ตัวบน', '3tod': '3 ตัวโต๊ด',
                                                        'run_up': 'วิ่งบน', 'run_down': 'วิ่งล่าง'
                                                    }[typeKey] || typeKey;

                                                    return (
                                                        <div key={typeKey} className="pl-1">
                                                            <div className="text-[9px] text-gray-400 mb-0.5 font-medium">{typeName}</div>
                                                            <div className="flex flex-wrap gap-1">
                                                                {items.map(r => (
                                                                    <span key={r.id} className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">
                                                                        {r.number}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ประวัติโพยล่าสุด */}
                        <div>
                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1 mt-4"><History size={12}/> ประวัติโพยล่าสุด</h4>
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
                                                        <div className="text-xs font-bold text-white">{Number(ticket.total_amount).toLocaleString()} บาท</div>
                                                        <div>{getStatusBadge(ticket.status)}
                                                        
                                                            {ticket.status === 'PENDING' && (
                                                                <button 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation(); 
                                                                        handleCancelTicket(ticket.id);
                                                                    }}
                                                                    className="text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 p-1 rounded transition-colors"
                                                                    title="ยกเลิกโพยนี้"
                                                                >
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                {ticket.note && (
                                                    <div className="text-[15px] text-white flex items-center gap-1 mt-1 bg-gray-800/50 p-1 rounded">
                                                        <FileText size={8} /> <b> {ticket.note} </b>
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