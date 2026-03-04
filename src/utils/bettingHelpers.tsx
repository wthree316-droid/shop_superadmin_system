import { v4 as uuidv4 } from 'uuid';
import { type CartItem } from '../types/lotto';

// ✅ 1. ฟังก์ชันหาวันปัจจุบัน (SUN, MON, ...)
export const getTodayShort = () => {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  return days[new Date().getDay()];
};

export const getRateVal = (rateObj: any, field: 'pay' | 'min' | 'max') => {
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

export const getStatusBadge = (status: string) => {
    switch(status) {
        case 'WIN': return <span className="bg-green-500/20 text-green-400 text-[10px] px-1.5 py-0.5 rounded border border-green-500/30">ถูกรางวัล</span>;
        case 'LOSE': return <span className="bg-red-500/10 text-red-400 text-[10px] px-1.5 py-0.5 rounded border border-red-500/20">ไม่ถูก</span>;
        case 'CANCELLED': return <span className="bg-gray-500/20 text-gray-400 text-[10px] px-1.5 py-0.5 rounded border border-gray-500/30">ยกเลิก</span>;
        default: return <span className="bg-yellow-500/20 text-yellow-400 text-[10px] px-1.5 py-0.5 rounded border border-yellow-500/30">รอผล</span>;
    }
};

export const getContrastTextColor = (hexColor: string) => {
    if (!hexColor || !hexColor.startsWith('#')) return '#ffffff'; 
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 145 ? '#1e293b' : '#ffffff'; 
};

export const getTypeLabel = (type: string) => {
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

export const groupItemsInBatch = (batchItems: CartItem[]) => {
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

            currentSetItems.sort((a, b) => sortTypes(a.bet_type || '', b.bet_type || ''));
            const sig = currentSetItems.map(i => `${i.bet_type || ''}:${i.amount}`).join('|');
            const labelStr = currentSetItems.map(i => getTypeLabel(i.bet_type || '')).join(' x ');
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

export const getGroupedCartItems = (cart: CartItem[]) => {
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