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
