export interface LottoType {
  id: string;
  name: string;
  code: string;
  rules: any;
}

export interface BetItem {
  number: string;
  bet_type: '2up' | '2down' | '3top' | '3tod' | 'run_up' | 'run_down';
  amount: number;
}

// รายการในตะกร้า (เพิ่ม ID ชั่วคราวเพื่อให้ลบออกง่ายๆ ก่อนส่ง backend)
export interface CartItem extends BetItem {
  temp_id: string; 
  display_text: string; // เช่น "19ประตู บน (5)"
}

export interface NumberRisk {
  id: string;
  lotto_type_id: string;
  number: string;
  risk_type: 'CLOSE' | 'HALF';
}