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
export const checkIsOpen = (lotto: LottoType, now: Date): boolean => {
  if (lotto.is_active === false) return false;
  if (!lotto.close_time) return false;

  // --- หวยรายเดือน (Monthly) เช่น หวยรัฐบาล ---
  if (lotto.rules?.schedule_type === 'monthly') {
    const closeDates = (lotto.rules.close_dates || [1, 16]).map(Number);
    const todayDate = now.getDate();
    
    if (closeDates.includes(todayDate)) {
      const [cH, cM] = lotto.close_time.split(':').map(Number);
      const closeToday = new Date(now);
      closeToday.setHours(cH, cM, 0, 0);
      return now <= closeToday;
    }
    
    // วันอื่นๆ เปิดรับแทงล่วงหน้า
    return true;
  }

  // --- หวยรายวัน/หุ้น (เช็ควัน จันทร์-อาทิตย์) ---
  if (lotto.open_days && Array.isArray(lotto.open_days) && lotto.open_days.length > 0) {
    const daysMap = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const currentDayStr = daysMap[now.getDay()];
    
    if (!lotto.open_days.includes(currentDayStr)) {
      return false;
    }
  }

  // --- เช็คเวลา (รองรับข้ามวัน) ---
  if (!lotto.open_time) {
    const [cH, cM] = lotto.close_time.split(':').map(Number);
    const closeToday = new Date(now);
    closeToday.setHours(cH, cM, 0, 0);
    return now <= closeToday;
  }

  const currentStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const openStr = lotto.open_time.substring(0, 5);
  const closeStr = lotto.close_time.substring(0, 5);

  // ข้ามวัน (เช่น 08:00 - 00:10)
  if (closeStr < openStr) {
    return currentStr >= openStr || currentStr <= closeStr;
  } else {
    return currentStr >= openStr && currentStr <= closeStr;
  }
};

/**
 * คำนวณวันปิดรอบถัดไป (Target Close Date)
 */
export const getCloseDate = (lotto: LottoType, now: Date): Date | null => {
  if (!lotto.close_time) return null;
  
  const [cH, cM] = lotto.close_time.split(':').map(Number);
  const rules = lotto.rules || {};

  // --- หวยรายเดือน ---
  if (rules.schedule_type === 'monthly') {
    const targetDates = (rules.close_dates || [1, 16]).map(Number).sort((a, b) => a - b);
    const currentDay = now.getDate();
    let targetDay = -1;
    let targetMonth = now.getMonth();
    let targetYear = now.getFullYear();

    for (const d of targetDates) {
      if (d > currentDay) { 
        targetDay = d; 
        break; 
      }
      if (d === currentDay) {
        const closeToday = new Date(now);
        closeToday.setHours(cH, cM, 0, 0);
        if (now <= closeToday) { 
          targetDay = d; 
          break; 
        }
      }
    }

    if (targetDay === -1) {
      targetDay = targetDates[0];
      targetMonth++;
      if (targetMonth > 11) { 
        targetMonth = 0; 
        targetYear++; 
      }
    }
    return new Date(targetYear, targetMonth, targetDay, cH, cM, 0, 0);
  }

  // --- หวยรายวัน ---
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
    if (now >= closeDate) {
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
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// ============================================
// Ticket Calculation Functions
// ============================================

/**
 * คำนวณยอดเงินรางวัลรวมของบิล (Winning Amount)
 */
export const calculateWinAmount = (ticket: any): number => {
  if (ticket.status !== 'WIN') return 0;
  // ป้องกัน item.winning_amount เป็น null/undefined
  return ticket.items.reduce((sum: number, item: any) => sum + Number(item.winning_amount || 0), 0);
};

/**
 * คำนวณยอดสุทธิ (Net) = ยอดถูก - ยอดซื้อ
 */
export const calculateNet = (ticket: any): number => {
  if (ticket.status === 'CANCELLED') return 0;
  const win = calculateWinAmount(ticket);
  const buy = Number(ticket.total_amount || 0);
  return win - buy;
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
