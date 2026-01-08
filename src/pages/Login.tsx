// src/pages/Login.tsx
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { loginApi } from '../api/auth'; // ✅ ดึง API แยกมาใช้
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  Loader2, User, Lock, Eye, EyeOff, ShieldCheck 
} from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!username || !password) return toast.error('กรุณากรอกข้อมูลให้ครบ');

    setIsSubmitting(true);
    const toastId = toast.loading('กำลังตรวจสอบ...', { position: 'bottom-center' });

    try {
      // 1. เตรียมข้อมูล
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      // 2. ยิง API Login (ใช้จาก auth.ts)
      const data = await loginApi(formData);

      // 3. เรียก Context login และ **รอ** ให้มันดึง User เสร็จ
      await login(data.access_token);

      // 4. แจ้งเตือนและเปลี่ยนหน้า (ข้อมูล User พร้อมแล้วแน่นอน)
      toast.dismiss(toastId);
      toast.success('เข้าสู่ระบบสำเร็จ', { position: 'bottom-center' });
      navigate('/'); // ไปได้เลย ไม่ต้องรอ timeout แล้ว เพราะข้อมูลพร้อมแล้ว
      
    } catch (err: any) {
      console.error("Login Error:", err);
      toast.dismiss(toastId);
      
      // แสดง Error message จาก Backend ถ้ามี
      const msg = err.response?.data?.detail || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
      toast.error(msg, { position: 'bottom-center' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    // ... (ส่วน UI เหมือนเดิมเป๊ะ ไม่ต้องแก้) ...
    <div className="min-h-screen bg-[#0f172a] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <h1 className="text-3xl font-black text-white tracking-tight">SHOP SYSTEMS</h1>
        <p className="mt-2 text-sm text-slate-400">ระบบจัดการร้านค้าออนไลน์</p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl sm:px-8 border border-slate-200">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 ml-1 uppercase">ชื่อผู้ใช้</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-slate-400" />
                    </div>
                    <input 
                        value={username} 
                        onChange={e => setUsername(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-800 font-medium placeholder-slate-400"
                        placeholder="Username"
                        disabled={isSubmitting}
                        autoFocus
                    />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 ml-1 uppercase">รหัสผ่าน</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-slate-400" />
                    </div>
                    <input 
                        type={showPassword ? "text" : "password"}
                        value={password} 
                        onChange={e => setPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-800 font-medium placeholder-slate-400"
                        placeholder="Password"
                        disabled={isSubmitting}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
              </div>
              
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl shadow-md hover:bg-black hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                    <Loader2 className="animate-spin" size={20} />
                ) : (
                    'เข้าสู่ระบบ'
                )}
              </button>
            </form>

            <div className="mt-6 flex justify-center">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                    <ShieldCheck size={12} className="text-green-500" />
                    <span>TEAMZENT CONTEXT</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}