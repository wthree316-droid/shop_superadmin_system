import { useState } from 'react';

// ✅ กำหนดว่า Component นี้ต้องรับค่า Props อะไรบ้างจากไฟล์แม่
interface QuickDateFiltersProps {
    setStartDate: (date: string) => void;
    setEndDate: (date: string) => void;
}

export default function QuickDateFilters({ setStartDate, setEndDate }: QuickDateFiltersProps) {
    // 🌟 เพิ่ม State เพื่อจำว่าปุ่มไหนถูกเลือกอยู่ (ค่าเริ่มต้นคือ 'today' เพราะหน้าเว็บเปิดมาเป็นค่าของวันนี้)
    const [activePreset, setActivePreset] = useState('today');

    const formatDate = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const handleQuickDate = (preset: string) => {
        // 🌟 อัปเดตให้ปุ่มที่ถูกกด กลายเป็นปุ่ม Active
        setActivePreset(preset);

        const today = new Date();
        let start = new Date();
        let end = new Date();

        switch (preset) {
            case 'today': break;
            case 'yesterday':
                start.setDate(today.getDate() - 1);
                end.setDate(today.getDate() - 1);
                break;
            case 'last7':
                start.setDate(today.getDate() - 6);
                break;
            case 'thisWeek':
                const day = today.getDay();
                const diff = today.getDate() - day + (day === 0 ? -6 : 1); 
                start.setDate(diff);
                end.setDate(start.getDate() + 6); 
                break;
            case 'lastWeek':
                const prevWeekDay = today.getDay();
                const prevDiff = today.getDate() - prevWeekDay + (prevWeekDay === 0 ? -6 : 1) - 7;
                start.setDate(prevDiff);
                end.setDate(start.getDate() + 6);
                break;
            case 'thisMonth':
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                break;
            case 'lastMonth':
                start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                end = new Date(today.getFullYear(), today.getMonth(), 0);
                break;
        }
        // ✅ ส่งค่ากลับไปเปลี่ยน State ที่ไฟล์แม่
        setStartDate(formatDate(start));
        setEndDate(formatDate(end));
    };

    const buttons = [
        { label: 'วันนี้', value: 'today' }, { label: 'เมื่อวาน', value: 'yesterday' }, { label: '7 วันก่อน', value: 'last7' },
        { label: 'สัปดาห์นี้', value: 'thisWeek' }, { label: 'สัปดาห์ที่แล้ว', value: 'lastWeek' },
        { label: 'เดือนนี้', value: 'thisMonth' }, { label: 'เดือนที่แล้ว', value: 'lastMonth' }
    ];

    return (
        <div className="flex flex-wrap gap-1.5 mt-2">
            {buttons.map(btn => {
                // 🌟 เช็คว่าปุ่มนี้คือปุ่มที่กำลังใช้งานอยู่หรือไม่
                const isActive = activePreset === btn.value;

                return (
                    <button 
                        key={btn.value} 
                        onClick={() => handleQuickDate(btn.value)}
                        className={`px-2.5 py-1 text-[10px] md:text-xs font-bold rounded-md transition-all border shadow-sm whitespace-nowrap
                            ${isActive 
                                ? 'bg-indigo-600 text-white border-indigo-600 scale-105' // ✅ สีตอนที่ถูกเลือก (สีน้ำเงินเข้ม + ขยายขนาดนิดนึง)
                                : 'bg-white text-slate-500 border-slate-200 hover:bg-indigo-50 hover:text-indigo-600' // สีปกติ (สีขาว)
                            }
                        `}
                    >
                        {btn.label}
                    </button>
                );
            })}
        </div>
    );
}