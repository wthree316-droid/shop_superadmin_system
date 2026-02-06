// ============================================
// LottoCard Component - Optimized & Accessible
// ============================================

import React, { useMemo } from 'react';
import { Clock, Lock } from 'lucide-react';
import type { LottoCardProps } from '../../types/lotto';
import { 
  checkIsOpen, 
  getCloseDate, 
  formatTimeRemaining, 
  TIME_CONSTANTS 
} from '../../utils/lottoHelpers';

const LottoCard: React.FC<LottoCardProps> = ({ lotto, now, onNavigate }) => {
  const isOpen = useMemo(() => checkIsOpen(lotto, now), [lotto, now]);
  const closeDate = useMemo(() => getCloseDate(lotto, now), [lotto, now]);
  
  const diff = closeDate ? closeDate.getTime() - now.getTime() : 0;
  const timeLeftStr = isOpen ? formatTimeRemaining(diff) : null;
  const isCritical = isOpen && diff < TIME_CONSTANTS.THIRTY_MINUTES;

  const handleClick = () => {
    if (isOpen) {
      onNavigate(lotto.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isOpen && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onNavigate(lotto.id);
    }
  };

  return (
    <div 
      role="button"
      tabIndex={isOpen ? 0 : -1}
      aria-label={`${lotto.name} - ${isOpen ? 'เปิดรับแทง' : 'ปิดรับแทง'}`}
      aria-disabled={!isOpen}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        relative p-3 rounded-sm shadow-sm border transition-all duration-200 overflow-hidden
        ${isOpen 
          ? 'bg-[#00B900] border-[#00A000] hover:scale-[1.02] hover:shadow-md text-white cursor-pointer focus:ring-2 focus:ring-blue-500 focus:outline-none' 
          : 'bg-gray-100 border-gray-200 opacity-90 text-gray-500 cursor-not-allowed grayscale pointer-events-none'
        }
      `}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="w-14 h-9 bg-white/20 rounded-sm overflow-hidden shrink-0 border border-white/10 shadow-sm">
          {lotto.img_url ? (
            <img 
              src={lotto.img_url} 
              alt={lotto.name} 
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => { 
                (e.target as HTMLImageElement).src = 'https://placehold.co/60x40?text=Lotto'; 
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[10px] font-bold">
              LOGO
            </div>
          )}
        </div>

        <div className="text-right flex flex-col items-end flex-1 pl-2">
          <h3 className={`font-bold text-sm leading-tight line-clamp-1 ${isOpen ? 'text-white' : 'text-gray-700'}`}>
            {lotto.name}
          </h3>
          <span className={`text-xs font-bold mt-0.5 ${isOpen ? 'text-white/90' : 'text-red-500'}`}>
            {isOpen ? 'เปิดรับ' : 'ปิดรับ'}
          </span>
        </div>
      </div>

      <div className={`text-[10px] space-y-0.5 font-medium ${isOpen ? 'text-white/90' : 'text-gray-500'}`}>
        {/* แถว: ปิดรับเมื่อไหร่ */}
        <div className="flex justify-between border-b border-white/10 pb-0.5 mb-0.5">
          {closeDate && closeDate.getDate() !== now.getDate() ? (
            <span className={`${isOpen ? 'text-yellow-200' : 'text-gray-600'} font-bold`}>
              ปิด {closeDate.getDate()}/{closeDate.getMonth() + 1}
            </span>
          ) : (
            <span>ปิดรับวันนี้</span>
          )}
          <span className="font-bold">{lotto.close_time?.substring(0, 5) || '-'}</span>
        </div>
        
        {/* แถว: ออกผล */}
        <div className="flex justify-between border-b border-white/10 pb-0.5 mb-0.5">
          <span>ออกผล</span>
          <span className="font-bold">{lotto.result_time?.substring(0, 5) || '-'}</span>
        </div>

        {/* แถว: สถานะ/เวลานับถอยหลัง */}
        <div className="flex justify-between items-center pt-0.5">
          <span>สถานะ</span>
          {!isOpen ? (
            <span className="font-bold text-red-500 flex items-center gap-1">
              <Lock size={10} /> ปิดชั่วคราว
            </span>
          ) : (
            <span className={`
              font-bold px-1.5 py-0 rounded text-[9px] whitespace-nowrap flex items-center gap-1
              ${isCritical 
                ? 'bg-red-600 text-white animate-pulse shadow-sm' 
                : 'bg-black/20' 
              }
            `}>
              {isCritical && <Clock size={10} strokeWidth={3} />} 
              ปิดใน {timeLeftStr}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Memoize to prevent unnecessary re-renders
export default React.memo(LottoCard, (prevProps, nextProps) => {
  // Re-render only when relevant props change
  const lottoEqual = (
    prevProps.lotto.id === nextProps.lotto.id &&
    prevProps.lotto.name === nextProps.lotto.name &&
    prevProps.lotto.img_url === nextProps.lotto.img_url &&
    prevProps.lotto.is_active === nextProps.lotto.is_active &&
    prevProps.lotto.close_time === nextProps.lotto.close_time &&
    prevProps.lotto.open_time === nextProps.lotto.open_time &&
    prevProps.lotto.result_time === nextProps.lotto.result_time
  );
  
  // Time changed significantly? (30 second buckets to reduce re-renders)
  const timeEqual = Math.floor(prevProps.now.getTime() / 30000) === 
                    Math.floor(nextProps.now.getTime() / 30000);
  
  // Return true to skip re-render (props are equal)
  return lottoEqual && timeEqual;
});
