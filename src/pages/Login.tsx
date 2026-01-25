import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useShop } from '../contexts/ShopContext';
import { loginApi } from '../api/auth';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  Loader2, User, Lock, Eye, EyeOff, ShieldCheck, Crown
} from 'lucide-react';

export default function Login() {
  const { shop } = useShop(); 
  const { login } = useAuth();
  const navigate = useNavigate();

  // State (เหลือเท่าที่ใช้สำหรับการ Login)
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ----------------------------------------------------
  // 1. ส่วนรับ Token จาก URL (Impersonate / Auto Login)
  // ----------------------------------------------------
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const tokenFromUrl = params.get('token');

        if (tokenFromUrl) {
            const autoLogin = async () => {
                try {
                    // 1. เก็บ Token
                    localStorage.setItem('token', tokenFromUrl);
                    
                    localStorage.setItem('is_impersonating', 'true');
                    // 2. เรียก Login Context
                    await login(tokenFromUrl); 
                    
                    toast.success('ยืนยันตัวตนสำเร็จ');
                    
                    // 3. ล้าง URL
                    window.history.replaceState({}, document.title, window.location.pathname);
                    
                    // 4. ไปหน้าแรก (ให้ App.tsx ตัดสินใจต่อ)
                    // ✅ เพิ่ม setTimeout เล็กน้อยเพื่อให้ State อัปเดตทัน
                    setTimeout(() => {
                        navigate('/', { replace: true });
                    }, 100);

                } catch (err: any) {
                    console.error("Auto Login Failed:", err);
                    // ✅ แสดง Error ให้เห็นชัดๆ ว่าทำไมเข้าไม่ได้
                    toast.error(err.response?.data?.detail || 'Token ไม่ถูกต้อง หรือ หมดอายุ');
                    
                    localStorage.removeItem('token');
                    // ไม่ต้อง navigate('/login') เพราะตอนนี้ก็อยู่หน้า login อยู่แล้ว
                }
            };
            autoLogin();
        }
    }, [login, navigate]);

  // Function Login ปกติ
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        const res = await loginApi(formData);
        await login(res.access_token);
        
        toast.success('เข้าสู่ระบบสำเร็จ');
        navigate('/');
    } catch (err: any) {
        console.error("Login Error:", err);
        const msg = err.response?.data?.detail || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
        toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] p-4 font-sans animate-fade-in relative overflow-hidden">
      
      {/* --- Background Effects (Gold & Black Theme) --- */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-[#1a1a1a] via-[#000000] to-[#000000]"></div>
          <div className="absolute top-[-20%] left-[20%] w-125 h-125 bg-[#FFD700]/10 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-100 h-100 bg-[#B8860B]/10 rounded-full blur-[100px]"></div>
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
      </div>

      {/* --- Login Card --- */}
      <div className="w-full max-w-md bg-[#111]/80 backdrop-blur-2xl rounded-3xl shadow-[0_0_50px_-12px_rgba(212,175,55,0.25)] border border-[#d4af37]/30 overflow-hidden relative z-10 group">
        
        {/* Shine Effect on Card Border */}
        <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-[#d4af37] to-transparent opacity-50"></div>

        {/* Header Section */}
        <div className="pt-10 pb-2 px-8 text-center relative">
            
            <div className="flex flex-col items-center justify-center mb-6">
                {shop?.logo_url ? (
                    <div className="w-24 h-24 mb-4 rounded-full p-1 bg-linear-to-b from-[#d4af37] to-[#8a6e28]">
                        <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                             <img src={shop.logo_url} alt="Logo" className="w-20 h-20 object-contain" />
                        </div>
                    </div>
                ) : (
                    <div className="relative mb-2">
                         <div className="absolute -inset-4 bg-[#d4af37]/20 blur-xl rounded-full"></div>
                         <Crown className="w-10 h-10 text-[#d4af37] mx-auto mb-2 drop-shadow-[0_0_10px_rgba(212,175,55,0.8)]" strokeWidth={1.5} />
                    </div>
                )}
                
                <h1 className="text-5xl font-black tracking-[0.2em] bg-linear-to-b from-[#FFF] via-[#d4af37] to-[#8a6e28] bg-clip-text text-transparent drop-shadow-sm select-none"
                    style={{ fontFamily: "'Cinzel', serif" }} 
                >
                    NTLOT
                </h1>
                
                <p className="text-[#888] text-xs mt-2 uppercase tracking-widest font-medium">
                    {shop ? shop.name : 'Premium Lottery System'}
                </p>
            </div>

            <div className="h-px w-full bg-linear-to-r from-transparent via-[#333] to-transparent my-4"></div>

            <h2 className="text-xl font-bold text-white tracking-wide">
                Welcome Back
            </h2>
        </div>

        {/* Form Section */}
        <div className="p-8 pt-4">
            <form onSubmit={handleLogin} className="space-y-5">
                
                {/* Username */}
                <div className="space-y-2 group/input">
                    <label className="text-[10px] font-bold text-[#d4af37] uppercase ml-1 tracking-wider opacity-80">Username</label>
                    <div className="relative">
                        <input 
                            type="text" 
                            required
                            className="w-full pl-11 pr-4 py-3.5 bg-black/40 border border-[#333] rounded-xl text-white placeholder-gray-600 focus:bg-black/60 focus:ring-1 focus:ring-[#d4af37]/50 focus:border-[#d4af37] outline-none transition-all font-medium shadow-inner"
                            placeholder="กรอกชื่อผู้ใช้งาน"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                        <User className="absolute left-3.5 top-3.5 text-gray-500 group-focus-within/input:text-[#d4af37] transition-colors" size={20} />
                    </div>
                </div>

                {/* Password */}
                <div className="space-y-2 group/input">
                    <label className="text-[10px] font-bold text-[#d4af37] uppercase ml-1 tracking-wider opacity-80">Password</label>
                    <div className="relative">
                        <input 
                            type={showPassword ? "text" : "password"} 
                            required
                            className="w-full pl-11 pr-11 py-3.5 bg-black/40 border border-[#333] rounded-xl text-white placeholder-gray-600 focus:bg-black/60 focus:ring-1 focus:ring-[#d4af37]/50 focus:border-[#d4af37] outline-none transition-all font-medium shadow-inner"
                            placeholder="กรอกรหัสผ่าน"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <Lock className="absolute left-3.5 top-3.5 text-gray-500 group-focus-within/input:text-[#d4af37] transition-colors" size={20} />
                        <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-3.5 text-gray-500 hover:text-white transition-colors"
                        >
                            {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
                        </button>
                    </div>
                </div>

                {/* Action Button */}
                <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full py-4 rounded-xl font-bold text-black uppercase tracking-wider shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] hover:-translate-y-0.5 transition-all active:scale-95 flex items-center justify-center gap-2 mt-4 relative overflow-hidden group/btn"
                    style={{ 
                        background: 'linear-gradient(135deg, #b8860b 0%, #ffd700 50%, #b8860b 100%)',
                    }}
                >
                    <div className="absolute inset-0 bg-white/20 group-hover/btn:translate-x-full transition-transform duration-500 ease-in-out skew-x-12 -ml-20 w-1/2 h-full"></div>
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'LOGIN ACCESS'}
                </button>
            </form>

            <div className="mt-8 flex justify-center opacity-40 hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                    <ShieldCheck size={12} className="text-[#d4af37]" />
                    <span className="tracking-widest">SECURE SYSTEM</span>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}