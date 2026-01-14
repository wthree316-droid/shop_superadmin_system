import { useState, useEffect } from 'react';
import client from '../api/client';

export const useShop = () => {
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const checkDomain = async () => {
      // 1. อ่าน Subdomain จาก URL (เช่น shop1.yoursite.com -> ได้ shop1)
      const hostname = window.location.hostname;
      const parts = hostname.split('.');
      
      let subdomain = '';
      
      // กรณี Localhost (เช่น shop1.localhost:5173)
      if (hostname.includes('localhost')) {
          subdomain = parts[0] === 'localhost' ? '' : parts[0]; 
      } 
      // กรณี Production (เช่น shop1.yoursite.com)
      else if (parts.length > 2) {
          subdomain = parts[0];
      }

      // ถ้าเป็นเว็บหลัก (www หรือ ไม่มี subdomain) ไม่ต้องทำอะไร
      if (!subdomain || subdomain === 'www') {
          setLoading(false);
          return;
      }

      try {
        // 2. ยิงไปถาม Backend
        const res = await client.get(`/shops/config/${subdomain}`);
        setShop(res.data);
        
        // *เก็บ shop_id ไว้ใน LocalStorage หรือ Context เพื่อให้หน้าอื่นๆ ใช้ตอนยิง API*
        localStorage.setItem('current_shop_id', res.data.id);
        
      } catch (err) {
        // 3. ถ้าไม่เจอ (404) -> set Error
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    checkDomain();
  }, []);

  return { shop, loading, error };
};