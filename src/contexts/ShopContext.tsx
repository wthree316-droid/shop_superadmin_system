import React, { createContext, useContext, useState, useEffect } from 'react';
import client from '../api/client';

interface Shop {
  id: string;
  name: string;
  subdomain: string;
  logo_url?: string;
  theme_color?: string;
  line_id?: string;
}

interface ShopContextType {
  shop: Shop | null;
  isLoading: boolean;     // ✅ ชื่อที่ถูกต้อง
  isSystemAdmin: boolean;
  error: boolean;         // ✅ เพิ่มตัวนี้กลับมา
}

const ShopContext = createContext<ShopContextType | null>(null);

export const ShopProvider = ({ children }: { children: React.ReactNode }) => {
  const [shop, setShop] = useState<Shop | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false); // ✅ State สำหรับเก็บ Error

  useEffect(() => {
    const initShop = async () => {
      const hostname = window.location.hostname;
      const parts = hostname.split('.');
      let subdomain = '';

      if (hostname.includes('localhost')) {
          subdomain = parts[0] === 'localhost' ? '' : parts[0];
      } else if (parts.length > 2) {
          subdomain = parts[0];
      }

      // 1. กรณีเป็น System Admin (ไม่มี Subdomain)
      if (!subdomain || subdomain === 'www') {
          setShop(null);
          setIsLoading(false);
          return;
      }

      // 2. กรณีเป็นร้านค้า -> ยิง API เช็ค
      try {
        const res = await client.get(`/shops/config/${subdomain}`);
        setShop(res.data);
        if(res.data.name) document.title = res.data.name;
        setError(false); // สำคัญ: รีเซ็ต Error
        
      } catch (err: any) {
        // 3. ถ้าหาไม่เจอ (404) -> ถือว่าเป็น Error (ร้านปิด/ไม่มีจริง)
        if (err.response?.status === 404) {
             console.warn("Shop not found");
             setShop(null); 
             setError(true); // ✅ แจ้ง App ว่าเกิด Error แล้ว
        } else {
             console.error("Failed to load shop config:", err);
             // กรณีเน็ตหลุด หรือ Server พัง อาจจะเลือก Error หรือไม่ก็ได้
        }
      } finally {
        setIsLoading(false);
      }
    };

    initShop();
  }, []);

  // Logic: เป็น System Admin ก็ต่อเมื่อ ไม่มี Shop และ ไม่ Error
  const isSystemAdmin = !shop && !error;

  return (
    <ShopContext.Provider value={{ shop, isLoading, isSystemAdmin, error }}>
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = () => {
  const context = useContext(ShopContext);
  if (!context) throw new Error("useShop must be used within ShopProvider");
  return context;
};