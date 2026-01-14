import { useState, useEffect } from 'react';
import client from '../api/client';

export const useShop = () => {
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const checkDomain = async () => {
      // 1. อ่าน Subdomain จาก URL
      const hostname = window.location.hostname;
      const parts = hostname.split('.');
      
      let subdomain = '';
      
      // กรณี Localhost
      if (hostname.includes('localhost')) {
          subdomain = parts[0] === 'localhost' ? '' : parts[0]; 
      } 
      // กรณี Production
      else if (parts.length > 2) {
          subdomain = parts[0];
      }

      // ถ้าเป็นเว็บหลัก (www หรือ ไม่มี subdomain) -> ถือเป็น System Admin
      if (!subdomain || subdomain === 'www') {
          setShop(null); // ✅ ชัดเจนว่าไม่มีร้าน (System)
          setLoading(false);
          return;
      }

      try {
        // 2. ยิงไปถาม Backend
        const res = await client.get(`/shops/config/${subdomain}`);
        setShop(res.data);
        
        // เก็บ shop_id ไว้ใช้งานต่อ
        localStorage.setItem('current_shop_id', res.data.id);
        
      } catch (err: any) {
        // 3. ✅ [จุดที่แก้ไข] เช็คว่า Error เพราะอะไร
        if (err.response && err.response.status === 404) {
            // ถ้าเป็น 404 แปลว่า "Subdomain นี้ไม่มีร้านค้าจริง"
            // ให้สมมติว่าเป็น System Admin (ไม่ต้อง Error)
            console.warn("Shop not found (404), assuming System Admin mode.");
            setShop(null);
            setError(false); // 👈 สำคัญ: ห้าม Error ไม่งั้นหน้าเว็บจะ Block
        } else {
            // ถ้าเป็น Error อื่น (เช่น 500 Server พัง, หรือเน็ตหลุด) ค่อย Block
            console.error("API Error:", err);
            setError(true);
        }
      } finally {
        setLoading(false);
      }
    };

    checkDomain();
  }, []);

  return { shop, loading, error };
};