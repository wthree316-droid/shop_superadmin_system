// ============================================
// Lotto Helpers - Utility Functions
// ============================================

import type { LottoType, Category } from '../types/lotto';

// ============================================
// Constants
// ============================================

export const TIME_CONSTANTS = {
  ONE_SECOND: 1000,
  ONE_MINUTE: 60 * 1000,
  THIRTY_MINUTES: 30 * 60 * 1000,
  ONE_HOUR: 60 * 60 * 1000,
  UPDATE_INTERVAL: 30 * 1000, // Update every 30 seconds
} as const;

// ============================================
// Time & Status Functions
// ============================================

/**
 * เช็คว่าหวยเปิดรับแทงอยู่หรือไม่ (Real-time Check)
 */
export const checkIsOpen = (lotto: any, now: Date): boolean => {
  if (lotto.is_active === false) return false;
  if (!lotto.close_time) return false;

  const currentStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const closeStr = lotto.close_time.substring(0, 5);
  const openStr = lotto.open_time ? lotto.open_time.substring(0, 5) : null;

  // --- 🌟 หวยรายเดือน (กำหนดเป็นช่วงวัน เช่น 2, 3, 4, 5) ---
  if (lotto.rules?.schedule_type === 'monthly') {
    const activeDates = (lotto.rules.close_dates || [1, 16]).map(Number);
    const todayDate = now.getDate();

    // 1. ถ้าวันนี้ไม่อยู่ในวันที่เลือกไว้เลย = ปิดรับแทง
    if (!activeDates.includes(todayDate)) return false;

    // 2. ตรวจสอบว่าวันนี้เป็น "วันแรก" หรือ "วันสุดท้าย" ของรอบที่เลือกติดกันหรือไม่
    const prevDate = new Date(now); prevDate.setDate(now.getDate() - 1);
    const isFirstDay = !activeDates.includes(prevDate.getDate());

    const nextDate = new Date(now); nextDate.setDate(now.getDate() + 1);
    const isLastDay = !activeDates.includes(nextDate.getDate());

    // 3. กำหนดเงื่อนไขเวลา
    if (isFirstDay && isLastDay) {
        // กรณีเลือกแค่วันเดียวโดดๆ
        if (!openStr) return currentStr <= closeStr;
        if (closeStr < openStr) {
            return currentStr >= openStr || currentStr <= closeStr;
        } else {
            return currentStr >= openStr && currentStr <= closeStr;
        }
    } else if (isFirstDay) {
        // วันแรก (เช่น วันที่ 2) -> ต้องรอให้ถึงเวลาเปิดก่อนค่อยแทงได้
        return openStr ? currentStr >= openStr : true;
    } else if (isLastDay) {
        // วันสุดท้าย (เช่น วันที่ 5) -> แทงได้เรื่อยๆ จนกว่าจะถึงเวลาปิด
        return currentStr <= closeStr;
    } else {
        // วันตรงกลาง (เช่น 3, 4) -> แทงได้ตลอด 24 ชั่วโมง
        return true;
    }
  }

  // --- 🌟 หวยรายวัน/หุ้น (Daily/Weekly) ---
  if (lotto.open_days && Array.isArray(lotto.open_days) && lotto.open_days.length > 0) {
    const daysMap = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const currentDayStr = daysMap[now.getDay()];
    
    if (!lotto.open_days.includes(currentDayStr)) {
      return false;
    }
  }

  // --- เช็คเวลาหวยรายวัน (รองรับข้ามวัน) ---
  if (!openStr) {
    return currentStr <= closeStr;
  }

  if (closeStr < openStr) {
    return currentStr >= openStr || currentStr <= closeStr;
  } else {
    return currentStr >= openStr && currentStr <= closeStr;
  }
};

/**
 * คำนวณวันปิดรอบถัดไป (Target Close Date)
 */
export const getCloseDate = (lotto: any, now: Date): Date | null => {
    if (!lotto.close_time) return null;
    
    const [cH, cM] = lotto.close_time.split(':').map(Number);
    const rules = lotto.rules || {}; 

    // --- A. หวยรายเดือน (ระบบกำหนดเป็นช่วงวัน) ---
    if (rules.schedule_type === 'monthly') {
        const activeDates = (rules.close_dates || [1, 16]).map(Number).sort((a: number, b: number) => a - b);
        
        for (let i = 0; i < 60; i++) {
            const checkDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
            const checkDay = checkDate.getDate();
            
            if (activeDates.includes(checkDay)) {
                const nextDate = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate() + 1);
                if (!activeDates.includes(nextDate.getDate())) {
                    const closeTimeOfLastDay = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate(), cH, cM, 0, 0);
                    if (i === 0 && now >= closeTimeOfLastDay) continue;
                    return closeTimeOfLastDay;
                }
            }
        }
        return null;
    }

    // --- B. หวยรายวัน ---
    const closeDate = new Date(now);
    closeDate.setHours(cH, cM, 0, 0);

    const isOvernight = lotto.open_time && lotto.close_time && 
                        lotto.close_time.substring(0, 5) < lotto.open_time.substring(0, 5);

    if (isOvernight) {
        const currentTimeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const closeTimeStr = lotto.close_time.substring(0, 5);
        if (currentTimeStr > closeTimeStr) {
            closeDate.setDate(closeDate.getDate() + 1);
        }
    } else {
        if (now > closeDate) {
            closeDate.setDate(closeDate.getDate() + 1);
        }
    }
    
    return closeDate;
};
/**
 * Format เวลาที่เหลือเป็น HH:MM:SS
 */
export const formatTimeRemaining = (diff: number): string | null => {
  if (diff <= 0) return null;
  const h = Math.floor(diff / TIME_CONSTANTS.ONE_HOUR);
  const m = Math.floor((diff % TIME_CONSTANTS.ONE_HOUR) / TIME_CONSTANTS.ONE_MINUTE);
  const s = Math.floor((diff % TIME_CONSTANTS.ONE_MINUTE) / TIME_CONSTANTS.ONE_SECOND);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')} น.`;
};

// ============================================
// Ticket Calculation Functions
// ============================================
export const calculateWinAmount = (ticket: any) => {
    // 🌟 ดึงยอดรางวัลที่เซฟมากับบิลได้เลย ไม่ต้องบวกเลขไส้ในแล้ว
    return Number(ticket.winning_amount || 0);
};

export const calculateNet = (ticket: any) => {
    // 🌟 กำไร/ขาดทุน = ยอดถูกรางวัล - ยอดแทง
    const winAmount = Number(ticket.winning_amount || 0);
    const totalAmount = Number(ticket.total_amount || 0);
    return winAmount - totalAmount;
};

// ============================================
// UI Helper Functions
// ============================================

/**
 * ดึง Category Color Style
 */
export const getCategoryColorStyle = (cat: Category): { backgroundColor?: string } => {
  if (!cat.color) return { backgroundColor: '#3B82F6' };
  if (cat.color.startsWith('#')) return { backgroundColor: cat.color };
  return {};
};

/**
 * เรียงลำดับหวยตาม Priority
 */
export const sortLottos = (
  lottos: LottoType[], 
  categories: Category[], 
  now: Date
): LottoType[] => {
  return [...lottos].sort((a, b) => {
    // 1. เรียงตาม category order_index
    const catA = categories.find(c => c.id === a.category);
    const catB = categories.find(c => c.id === b.category);
    const orderA = catA?.order_index ?? 999;
    const orderB = catB?.order_index ?? 999;
    if (orderA !== orderB) return orderA - orderB;
    
    // 2. เรียง Open ขึ้นก่อน Closed
    const openA = checkIsOpen(a, now);
    const openB = checkIsOpen(b, now);
    if (openA && !openB) return -1;
    if (!openA && openB) return 1;
    
    // 3. เรียงตามเวลาปิด
    const dateA = getCloseDate(a, now);
    const dateB = getCloseDate(b, now);
    if (!dateA) return 1;
    if (!dateB) return -1;
    return dateA.getTime() - dateB.getTime();
  });
};
