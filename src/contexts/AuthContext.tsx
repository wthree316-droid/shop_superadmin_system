// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import client from '../api/client';
// import { jwtDecode } from 'jwt-decode';

// Type Definitions
interface User {
  id: string;
  username: string;
  role: 'superadmin' | 'admin' | 'member';
  shop_id: string | null;
  shop_name?: string;
  credit_balance: number; 
  full_name?: string;
}

interface AuthContextType {
  user: User | null;
  login: (token: string) => void;
  logout: () => void;
  isLoading: boolean;
  fetchMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ฟังก์ชันดึงข้อมูล User จาก Backend
  const fetchMe = async () => {
    try {
      const res = await client.get('/users/me');
      setUser(res.data);
    } catch (error) {
      console.error("Token invalid or expired", error);
      logout();
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

  const login = (token: string) => {
    localStorage.setItem('token', token);
    fetchMe(); // พอได้ token แล้ว ให้ไปดึงข้อมูล user ทันที
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

// Custom Hook ให้เรียกใช้ง่ายๆ
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};