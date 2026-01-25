// src/components/RoleGuard.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2} from 'lucide-react';

interface Props {
  allowedRoles: string[];
}

export const RoleGuard = ({ allowedRoles }: Props) => {
  const { user, isLoading } = useAuth();

  // ✅ ปรับส่วน Loading ให้สวยงาม อยู่กลางจอ
  if (isLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 gap-3">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <p className="text-slate-400 text-sm font-medium animate-pulse">กำลังตรวจสอบสิทธิ์...</p>
      </div>
    );
  }

  // 1. ถ้ายังไม่ Login -> ดีดไปหน้า Login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 2. ถ้า Role ไม่ได้รับอนุญาต -> ดีดไปหน้า Unauthorized
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // 3. ผ่าน -> แสดงเนื้อหา
  return <Outlet />;
};