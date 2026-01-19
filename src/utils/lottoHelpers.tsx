import { CheckCircle, XCircle, Ban, Clock } from 'lucide-react';

/**
 * คำนวณยอดเงินรางวัลรวมของบิล (Winning Amount)
 */
export const calculateWinAmount = (ticket: any) => {
    if (ticket.status !== 'WIN') return 0;
    // ป้องกัน item.winning_amount เป็น null/undefined
    return ticket.items.reduce((sum: number, item: any) => sum + Number(item.winning_amount || 0), 0);
};

/**
 * คำนวณยอดสุทธิ (Net) = ยอดถูก - ยอดซื้อ
 */
export const calculateNet = (ticket: any) => {
    if (ticket.status === 'CANCELLED') return 0;
    const win = calculateWinAmount(ticket);
    const buy = Number(ticket.total_amount || 0);
    return win - buy;
};

/**
 * แสดงป้ายสถานะ (Badge) พร้อมไอคอน
 */
export const getStatusBadge = (status: string) => {
    switch (status) {
        case 'WIN':
            return (
                <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2.5 py-0.5 rounded text-[10px] font-bold border border-green-200">
                    <CheckCircle size={12} /> ถูกรางวัล
                </span>
            );
        case 'LOSE':
            return (
                <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 px-2.5 py-0.5 rounded text-[10px] font-bold border border-red-100">
                    <XCircle size={12} /> ไม่ถูก
                </span>
            );
        case 'CANCELLED':
            return (
                <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 px-2.5 py-0.5 rounded text-[10px] font-bold border border-gray-200">
                    <Ban size={12} /> ยกเลิก
                </span>
            );
        default:
            return (
                <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded text-[10px] font-bold border border-blue-100">
                    <Clock size={12} /> รอผล
                </span>
            );
    }
};