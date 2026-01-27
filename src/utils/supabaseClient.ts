import { createClient } from '@supabase/supabase-js';

// ค่าพวกนี้อยู่ในไฟล์ .env ของคุณ
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// สร้างและ Export ตัว Client เพื่อเอาไปใช้ในหน้าต่างๆ
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 10, // ป้องกันการส่งข้อมูลรัวเกินไป
    },
  },
});