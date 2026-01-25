// --- User & Auth ---
export type UserRole = 'superadmin' | 'admin' | 'member';

export interface User {
  id: string;
  username: string;
  full_name?: string;
  role: UserRole;
  shop_id?: string;
  shop_name?: string; // ที่เราเพิ่มใน users.py
  credit_balance: number;
  is_active: boolean;
  created_at: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

// --- Shop ---
export interface Shop {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
}

// --- Lotto & Rates ---
export interface RateProfile {
  id: string;
  name: string;
  rates: Record<string, any>; // { "2up": { pay: 90, min: 1 }, ... }
}

export interface LottoType {
  id: string;
  name: string;
  code: string;
  category: string;
  img_url?: string;
  rate_profile_id: string;
  open_days: string[];       
  open_time?: string;     
  close_time?: string;    
  result_time?: string;
  api_link?: string;
  is_active: boolean;
  is_template: boolean;
  rules?: any;          
}

export interface NumberRisk {
  id: string;
  lotto_type_id: string;
  number: string;
  risk_type: 'CLOSE' | 'HALF';
}

// --- Cart & Tickets (การแทง) ---
// Bet Type ที่ระบบรองรับ (Core Types)
export type BetType = '2up' | '2down' | '3top' | '3tod' | 'run_up' | 'run_down';

export interface BetItem {
  number: string;
  bet_type: BetType;
  amount: number;
}

// ใช้ในหน้า Frontend เวลาลูกค้ากดใส่ตะกร้า
export interface CartItem extends BetItem {
  temp_id: string;      // UUID ชั่วคราวไว้อ้างอิงตอนลบออกจากตะกร้า
  display_text: string; // เช่น "2 ตัวบน - 99"
  rate_pay: number;     // อัตราจ่ายที่จะได้รับ (โชว์ให้ลูกค้าดู)
  batch_id?: string;
}

export interface TicketItemResponse {
  id: string;
  number: string;
  bet_type: string;
  amount: number;
  reward_rate: number;
  winning_amount: number;
  status: 'PENDING' | 'WIN' | 'LOSE' | 'CANCELLED';
}

export interface Ticket {
  id: string;
  total_amount: number;
  status: 'PENDING' | 'WIN' | 'LOSE' | 'CANCELLED';
  created_at: string;
  note?: string;
  items: TicketItemResponse[];
  lotto_type?: {
    name: string;
    code: string;
    img_url?: string;
  };
  user?: {
    username: string;
    full_name: string;
  };
}

