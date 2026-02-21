// ============================================
// Lotto Types - TypeScript Definitions
// ============================================

export interface LottoRules {
  schedule_type?: 'monthly' | 'daily';
  close_dates?: number[];
  [key: string]: any; // Allow additional properties
}

export interface LottoType {
  id: string;
  name: string;
  code: string;
  category: string;
  img_url?: string;
  is_active: boolean;
  open_time?: string;
  close_time?: string;
  result_time?: string;
  open_days?: string[];
  rules?: LottoRules;
  created_at?: string;
  rate_profile_id?: string | null;
  api_link?: string | null;
}

export interface Category {
  id: string;
  label: string;
  color: string;
  order_index?: number;
}

export interface LottoCardProps {
  lotto: LottoType;
  now: Date;
  onNavigate: (lottoId: string) => void;
}

export interface TimeRemaining {
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
}

export interface RateProfile {
  id: string;
  name: string;
  shop_id?: string;
  is_active?: boolean;
  created_at?: string;
  [key: string]: any; 
}

export interface CartItem {
  id?: string;
  temp_id?: string;     // เพิ่ม temp_id
  number: string;
  type?: string;        // เปลี่ยนเป็น Optional (ใส่เครื่องหมาย ?)
  bet_type?: string;    // เพิ่ม bet_type
  amount: number;       // จำนวนเงินที่แทง
  reward_rate?: number;
  rate_pay?: number;    // เพิ่ม rate_pay
  display_text?: string;// เพิ่ม display_text
  batch_id?: string;    // เพิ่ม batch_id
  [key: string]: any;   // อนุญาตให้มี properties อื่นๆ เพิ่มเติมได้
}