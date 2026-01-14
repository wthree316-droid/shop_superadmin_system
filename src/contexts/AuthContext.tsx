// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import client from '../api/client';

// Type Definitions
export interface User {
  id: string;
  username: string;
  role: 'superadmin' | 'admin' | 'member';
  shop_id: string | null;
  shop_name?: string;
  shop_logo?: string;
  credit_balance: number; 
  full_name?: string;
}

interface AuthContextType {
  user: User | null;
  login: (token: string) => Promise<void>; // ✅ เปลี่ยนเป็น Promise
  logout: () => void;
  isLoading: boolean;
  fetchMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ฟังก์ชันดึงข้อมูล User
  const fetchMe = async () => {
    try {
      const res = await client.get<User>('/users/me');
      setUser(res.data);
    } catch (error) {
      console.error("Failed to fetch user:", error);
      logout(); // ถ้าดึงไม่ได้ แสดงว่า Token เน่า -> Logout เลย
    } finally {
      setIsLoading(false);
    }
  };

  // ตรวจสอบ Token เมื่อเปิดเว็บครั้งแรก
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchMe();
    } else {
      setIsLoading(false);
    }
  }, []);

  // ✅ Login แบบรอให้ข้อมูลมาครบก่อน
  const login = async (token: string) => {
    localStorage.setItem('token', token);
    await fetchMe(); // รอให้ fetchMe ทำงานเสร็จก่อน function นี้ถึงจะจบ
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};