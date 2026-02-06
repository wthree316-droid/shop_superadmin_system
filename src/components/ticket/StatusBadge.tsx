// ============================================
// Status Badge Component
// ============================================

import React from 'react';
import { CheckCircle, XCircle, Ban, Clock } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
}

/**
 * แสดงป้ายสถานะ (Badge) พร้อมไอคอน
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
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

// Backward compatibility - export as function
export const getStatusBadge = (status: string) => <StatusBadge status={status} />;
