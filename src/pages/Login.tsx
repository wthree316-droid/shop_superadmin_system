import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useShop } from '../hooks/useShop';
import { loginApi, fetchMeApi } from '../api/auth'; // เรียก API Login
import client from '../api/client'; // เรียก client ตรงๆ สำหรับ Register
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  Loader2, User, Lock, Eye, EyeOff, ShieldCheck, Store, UserPlus, LogIn
} from 'lucide-react';

export default function Login() {
  const { shop } = useShop(); // ดึงข้อมูลร้าน (และสีธีม)
  const { login } = useAuth();
  const navigate = useNavigate(); // ✅ ประกาศแล้วต้องใช้ใน handleLogin หรือ handleRegister

  // State สลับโหมด (Login / Register)
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Form States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState(''); // เพิ่มสำหรับสมัคร
  const [confirmPassword, setConfirmPassword] = useState(''); // เพิ่มสำหรับสมัคร
  
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- ฟังก์ชันสมัครสมาชิก ---
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Validation
    if (!username || !password || !fullName || !confirmPassword) {
        return toast.error('กรุณากรอกข้อมูลให้ครบทุกช่อง');
    }
    if (password !== confirmPassword) {
        return toast.error('รหัสผ่านไม่ตรงกัน');
    }
    // *สำคัญ* ต้องมีร้านสังกัดเท่านั้นถึงจะสมัครได้ (Subdomain Check)
    if (!shop?.id) {
        return toast.error('ไม่สามารถสมัครผ่านลิงก์กลางได้ กรุณาขอลิงก์จากร้านค้า');
    }

    setIsSubmitting(true);
    try {
        // 2. ยิง API Register (ใช้ client ยิงไปที่ endpoint ที่เราเพิ่งสร้าง)
        await client.post('/auth/register', {
            username,
            password,
            full_name: fullName,
            shop_id: shop.id // ✅ ส่ง ID ร้านไปด้วย เพื่อผูก User กับร้านนี้
        });

        toast.success('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
        setIsRegisterMode(false); // สลับกลับไปหน้า Login
        setPassword('');
        setConfirmPassword('');
    } catch (err: any) {
        console.error(err);
        toast.error(err.response?.data?.detail || 'สมัครไม่สำเร็จ');
    } finally {
        setIsSubmitting(false);
    }
  };

  // --- ฟังก์ชันเข้าสู่ระบบ ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!username || !password) return toast.error('กรุณากรอกข้อมูลให้ครบ');

    setIsSubmitting(true);
    const toastId = toast.loading('กำลังตรวจสอบ...', { position: 'bottom-center' });

    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      // 1. ขอ Token
      const data = await loginApi(formData);
      localStorage.setItem('token', data.access_token);

      // 2. ขอข้อมูล User เพื่อเช็ค Role
      const userData = await fetchMeApi(); 
      await login(data.access_token); // อัปเดต Context
      
      toast.success(`ยินดีต้อนรับ ${userData.username}`, { id: toastId });

      // ✅ 3. ใช้ navigate ตรงนี้ (แก้ปัญหา value never read)
      switch (userData.role) {
        case 'superadmin':
          navigate('/super/dashboard');
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
      toast.error('เข้าสู่ระบบไม่สำเร็จ: ' + (err.response?.data?.detail || 'ข้อมูลผิดพลาด'), { id: toastId });
      localStorage.removeItem('token');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ดึงสีธีมจากร้าน (ถ้าไม่มีใช้สี Default)
  const themeColor = shop?.theme_color || '#2563EB'; // Default Blue

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
      
      {/* Background Effect (เปลี่ยนสีตามธีม) */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full opacity-20 blur-[100px]" style={{ backgroundColor: themeColor }}></div>
          <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] rounded-full bg-purple-600/10 blur-[100px]"></div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8 relative z-10">
        {/* Logo */}
        <div className={`w-24 h-24 mx-auto rounded-2xl flex items-center justify-center mb-4 shadow-2xl overflow-hidden ${shop ? 'bg-white p-1' : 'bg-slate-800 border border-slate-700'}`}>
            {shop?.logo_url ? (
                <img src={shop.logo_url} className="w-full h-full object-cover rounded-xl" alt="Shop Logo" />
            ) : shop ? (
                <Store size={48} style={{ color: themeColor }} />
            ) : (
                <ShieldCheck size={48} className="text-white" />
            )}
        </div>

        {/* Shop Name */}
        {shop ? (
            <>
                <h1 className="text-3xl font-black text-white tracking-tight">{shop.name}</h1>
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white/80 text-xs font-mono backdrop-blur-md">
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: themeColor }}></span>
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
            
            {/* Header Form */}
            <div className="mb-6 text-center">
                <h2 className="text-xl font-bold text-slate-800">
                    {isRegisterMode ? 'สมัครสมาชิกใหม่' : 'เข้าสู่ระบบ'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                    {isRegisterMode ? 'กรอกข้อมูลเพื่อเริ่มต้นใช้งาน' : 'ใส่ชื่อผู้ใช้และรหัสผ่านของคุณ'}
                </p>
            </div>

            <form onSubmit={isRegisterMode ? handleRegister : handleLogin} className="space-y-4">
              
              {/* Username */}
              <div>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-slate-400" />
                    </div>
                    <input 
                        value={username} 
                        onChange={e => setUsername(e.target.value)}
                        className="w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:border-transparent outline-none transition-all text-slate-800 font-bold placeholder-slate-300 bg-slate-50 focus:bg-white"
                        style={{ '--tw-ring-color': themeColor } as any} 
                        placeholder="ชื่อผู้ใช้ (Username)"
                        disabled={isSubmitting}
                    />
                </div>
              </div>

              {/* Full Name (เฉพาะสมัคร) */}
              {isRegisterMode && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <UserPlus className="h-5 w-5 text-slate-400" />
                        </div>
                        <input 
                            value={fullName} 
                            onChange={e => setFullName(e.target.value)}
                            className="w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:border-transparent outline-none transition-all text-slate-800 font-bold placeholder-slate-300 bg-slate-50 focus:bg-white"
                            style={{ '--tw-ring-color': themeColor } as any}
                            placeholder="ชื่อ-นามสกุลจริง"
                            disabled={isSubmitting}
                        />
                    </div>
                  </div>
              )}

              {/* Password */}
              <div>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-slate-400" />
                    </div>
                    <input 
                        type={showPassword ? "text" : "password"}
                        value={password} 
                        onChange={e => setPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:border-transparent outline-none transition-all text-slate-800 font-bold placeholder-slate-300 bg-slate-50 focus:bg-white"
                        style={{ '--tw-ring-color': themeColor } as any}
                        placeholder="รหัสผ่าน"
                        disabled={isSubmitting}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
              </div>

              {/* Confirm Password (เฉพาะสมัคร) */}
              {isRegisterMode && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <ShieldCheck className="h-5 w-5 text-slate-400" />
                        </div>
                        <input 
                            type="password"
                            value={confirmPassword} 
                            onChange={e => setConfirmPassword(e.target.value)}
                            className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:border-transparent outline-none transition-all text-slate-800 font-bold placeholder-slate-300 bg-slate-50 focus:bg-white"
                            style={{ '--tw-ring-color': themeColor } as any}
                            placeholder="ยืนยันรหัสผ่านอีกครั้ง"
                            disabled={isSubmitting}
                        />
                    </div>
                  </div>
              )}
              
              {/* ปุ่ม Action (ใช้สี Theme Color) */}
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full text-white font-bold py-3.5 rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
                style={{ backgroundColor: themeColor, boxShadow: `0 10px 15px -3px ${themeColor}40` }}
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : (isRegisterMode ? 'ยืนยันการสมัคร' : 'เข้าสู่ระบบ')}
              </button>
            </form>

            {/* Toggle Switch (เฉพาะหน้าร้านค้า) */}
            {shop && (
                <div className="mt-6 pt-6 border-t border-slate-100 text-center">
                    <p className="text-sm text-slate-500 mb-3">
                        {isRegisterMode ? 'มีบัญชีอยู่แล้ว?' : 'ยังไม่มีบัญชีสมาชิก?'}
                    </p>
                    <button 
                        onClick={() => { setIsRegisterMode(!isRegisterMode); setPassword(''); }}
                        className="text-sm font-bold bg-slate-50 px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-2 mx-auto border border-slate-200"
                        style={{ color: themeColor }}
                    >
                        {isRegisterMode ? <><LogIn size={16}/> กลับไปเข้าสู่ระบบ</> : <><UserPlus size={16}/> สมัครสมาชิกใหม่</>}
                    </button>
                </div>
            )}

            {!shop && (
                <div className="mt-6 flex justify-center">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                        <ShieldCheck size={12} />
                        <span>SECURE CONTEXT: GLOBAL SYSTEM</span>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}