// src/pages/Login.tsx
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useShop } from '../hooks/useShop'; // ✅ [1] เพิ่มบรรทัดนี้
import { loginApi, fetchMeApi } from '../api/auth';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  Loader2, User, Lock, Eye, EyeOff, ShieldCheck, Store 
} from 'lucide-react';

export default function Login() {
  // ✅ [2] เรียกใช้ Hook เพื่อดึงข้อมูลร้าน (ถ้ามี)
  const { shop } = useShop(); 
  
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
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      // ยิง API Login
      const data = await loginApi(formData);
      
      localStorage.setItem('token', data.access_token);

      // ดึงข้อมูล User เพื่อเช็ค Role
      const userData = await fetchMeApi(); 
      
      // ✅ [3] (Optional) เช็คว่า User อยู่ถูกร้านไหม?
      // ถ้าเข้าผ่านลิงก์ร้าน (shop มีค่า) แต่ User ไม่ได้สังกัดร้านนี้ (และไม่ใช่ Superadmin)
      // อาจจะแจ้งเตือนหรือ Block ก็ได้ (แต่ในที่นี้ปล่อยผ่านไปก่อน ให้ Backend จัดการ)

      await login(data.access_token);
      toast.success(`ยินดีต้อนรับ ${userData.username}`, { id: toastId });

      // Redirect ตาม Role
      switch (userData.role) {
        case 'superadmin':
          navigate('/super/dashboard'); // แก้ให้ไป Dashboard จะสวยกว่า
          break;
        case 'admin':
          navigate('/admin/dashboard');
          break;
        case 'member':
          navigate('/play');
          break;
        default:
          navigate('/unauthorized');
      }

    } catch (err: any) {
      console.error(err);
      toast.error('เข้าสู่ระบบไม่สำเร็จ: ' + (err.response?.data?.detail || 'รหัสผ่านผิด'), { id: toastId });
      localStorage.removeItem('token');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
      
      {/* Background Effect */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[100px]"></div>
          <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] rounded-full bg-purple-600/10 blur-[100px]"></div>
      </div>

      {/* --- ส่วน Header ที่ปรับปรุงใหม่ --- */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8 relative z-10">
        
        {/* โชว์โลโก้ หรือ ไอคอน */}
        <div className={`w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-4 shadow-2xl ${shop ? 'bg-white p-1' : 'bg-slate-800 text-white border border-slate-700'}`}>
            {shop?.logo_url ? (
                <img src={shop.logo_url} className="w-full h-full object-cover rounded-xl" alt="Shop Logo" />
            ) : shop ? (
                <Store size={40} className="text-blue-600" />
            ) : (
                <ShieldCheck size={40} />
            )}
        </div>

        {/* โชว์ชื่อร้าน (Dynamic) */}
        {shop ? (
            <>
                <h1 className="text-3xl font-black text-white tracking-tight">{shop.name}</h1>
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-200 text-xs font-mono">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                    {shop.subdomain}.yoursite.com
                </div>
            </>
        ) : (
            <>
                <h1 className="text-3xl font-black text-white tracking-tight">SYSTEM ADMIN</h1>
                <p className="mt-2 text-sm text-slate-400">ระบบจัดการสำหรับผู้ดูแลระบบสูงสุด</p>
            </>
        )}
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-sm relative z-10">
        <div className="bg-white/95 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-2xl sm:px-8 border border-white/10">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 ml-1 uppercase">ชื่อผู้ใช้</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-slate-400" />
                    </div>
                    <input 
                        value={username} 
                        onChange={e => setUsername(e.target.value)}
                        className="w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-800 font-bold placeholder-slate-300 bg-slate-50 focus:bg-white"
                        placeholder="Username"
                        disabled={isSubmitting}
                        autoFocus
                    />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 ml-1 uppercase">รหัสผ่าน</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-slate-400" />
                    </div>
                    <input 
                        type={showPassword ? "text" : "password"}
                        value={password} 
                        onChange={e => setPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-800 font-bold placeholder-slate-300 bg-slate-50 focus:bg-white"
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
                className={`w-full text-white font-bold py-3.5 rounded-xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed
                    ${shop ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30' : 'bg-slate-800 hover:bg-black shadow-slate-900/30'}
                `}
              >
                {isSubmitting ? (
                    <Loader2 className="animate-spin" size={20} />
                ) : (
                    'เข้าสู่ระบบ'
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <ShieldCheck size={12} className={shop ? "text-blue-500" : "text-slate-500"} />
                    <span>SECURE CONTEXT: {shop ? 'SHOP TENANT' : 'GLOBAL SYSTEM'}</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}