// src/components/RoleGuard.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  allowedRoles: string[];
}

export const RoleGuard = ({ allowedRoles }: Props) => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>; // หรือใส่ Spinner สวยๆ

  // 1. ถ้ายังไม่ Login -> ดีดไปหน้า Login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 2. ถ้า Role ไม่ได้รับอนุญาต -> ดีดไปหน้า Unauthorized หรือหน้าแรก
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // 3. ผ่าน -> แสดงเนื้อหาข้างใน
  return <Outlet />;
};