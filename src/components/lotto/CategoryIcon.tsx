// ============================================
// Category Icon Components
// ============================================

import React from 'react';
import { Globe, Crown, TrendingUp, Search } from 'lucide-react';

interface FlagProps {
  code: string;
  label: string;
}

const Flag: React.FC<FlagProps> = ({ code, label }) => (
  <img 
    src={`https://flagcdn.com/w40/${code}.png`} 
    srcSet={`https://flagcdn.com/w80/${code}.png 2x`} 
    alt={label} 
    className="w-5 h-auto rounded-xs shadow-sm object-cover mr-1.5" 
  />
);

interface IconBadgeProps {
  icon: React.ElementType;
  colorClass?: string;
  style?: React.CSSProperties;
}

const IconBadge: React.FC<IconBadgeProps> = ({ icon: Icon, colorClass, style }) => (
  <div 
    className={`w-5 h-3.5 flex items-center justify-center rounded-xs shadow-sm mr-1.5 ${colorClass || ''}`} 
    style={style}
  >
    <Icon size={12} strokeWidth={3} className="text-white" />
  </div>
);

/**
 * ดึง Flag Icon หรือ Category Icon ตามชื่อหมวดหมู่
 */
export const getCategoryIcon = (label: string): React.ReactElement => {
  const name = label.toLowerCase();

  // VIP & Special
  if (name.includes('vip')) {
    return <IconBadge icon={Crown} style={{ background: 'linear-gradient(to right, #FBBF24, #F59E0B)' }} />;
  }
  if (name.includes('หุ้น') || name.includes('stock')) {
    return <IconBadge icon={TrendingUp} colorClass="bg-blue-500" />;
  }
  if (name.includes('อื่น') || name.includes('etc')) {
    return <IconBadge icon={Search} colorClass="bg-gray-500" />;
  }

  // Country Flags
  if (name.includes('ไทย') || name.includes('รัฐบาล')) return <Flag code="th" label={label} />;
  if (name.includes('ฮานอย') || name.includes('เวียดนาม')) return <Flag code="vn" label={label} />;
  if (name.includes('ลาว')) return <Flag code="la" label={label} />;
  if (name.includes('มาเล')) return <Flag code="my" label={label} />;
  if (name.includes('จีน')) return <Flag code="cn" label={label} />;
  if (name.includes('เกาหลี')) return <Flag code="kr" label={label} />;
  if (name.includes('ญี่ปุ่น') || name.includes('นิเคอิ')) return <Flag code="jp" label={label} />;
  if (name.includes('ไต้หวัน')) return <Flag code="tw" label={label} />;
  if (name.includes('สิงคโปร์')) return <Flag code="sg" label={label} />;
  if (name.includes('อินเดีย')) return <Flag code="in" label={label} />;
  if (name.includes('รัสเซีย')) return <Flag code="ru" label={label} />;
  if (name.includes('เยอรมัน')) return <Flag code="de" label={label} />;
  if (name.includes('อังกฤษ')) return <Flag code="gb" label={label} />;
  if (name.includes('ดาวโจนส์') || name.includes('อเมริกา') || name.includes('us')) {
    return <Flag code="us" label={label} />;
  }
  if (name.includes('ฮ่องกง')) return <Flag code="hk" label={label} />;
  if (name.includes('อียิปต์')) return <Flag code="eg" label={label} />;
  
  // Default
  return <Globe size={16} className="text-gray-400 mr-1.5" />;
};
