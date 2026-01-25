import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useShop } from '../../contexts/ShopContext';
import client from '../../api/client';
import { 
  User, Lock, Save, Shield, Wallet, Store, 
  Loader2, KeyRound, CheckCircle2, AlertCircle, Camera
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, fetchMe } = useAuth(); 
  const { shop } = useShop(); // ✅ ดึงข้อมูลร้านเพื่อเอาสีธีม
  
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    password: '',
    confirmPassword: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // กำหนดสีธีม (ถ้าไม่มีใช้สี Default)
  const themeColor = shop?.theme_color || '#4f46e5'; 

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        username: user.username,
        full_name: user.full_name || ''
      }));
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (formData.password && formData.password !== formData.confirmPassword) {
      setIsSubmitting(false);
      return toast.error('รหัสผ่านยืนยันไม่ตรงกัน');
    }

    try {
      const payload: any = {
        username: formData.username,
        full_name: formData.full_name
      };
      
      if (formData.password) {
        payload.password = formData.password;
      }

      await client.put('/users/me', payload);
      await fetchMe();

      toast.success('บันทึกข้อมูลเรียบร้อย');
      setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));

    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.detail || 'แก้ไขข้อมูลไม่สำเร็จ';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-fade-in">
      
      {/* --- Header Banner (ปรับให้ใช้ Theme Color) --- */}
      <div 
        className="relative h-48 rounded-b-[3rem] shadow-lg mb-20 overflow-hidden"
        style={{ background: `linear-gradient(to right, ${themeColor}, #1e1b4b)` }} // ✅ ไล่สีตามธีมร้าน
      >
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center">
              {/* รูปโปรไฟล์ User */}
              <div className="w-24 h-24 rounded-full bg-white p-1 shadow-xl relative group cursor-pointer">
                  <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center text-4xl font-bold text-slate-400 overflow-hidden">
                      {/* (อนาคต) ถ้ามีรูป User ให้ใส่ตรงนี้ */}
                      {user?.username?.charAt(0).toUpperCase()}
                  </div>
                  <div className="absolute bottom-0 right-0 bg-slate-800 p-1.5 rounded-full border-2 border-white text-white">
                      <Camera size={14} />
                  </div>
              </div>
              
              <div className="mt-2 text-center">
                  <h1 className="text-xl font-bold text-white shadow-sm">{user?.full_name || user?.username}</h1>
                  <span className="text-[10px] px-2 py-0.5 bg-white/20 text-white rounded-full font-bold backdrop-blur-sm border border-white/10">
                      {user?.role?.toUpperCase()}
                  </span>
              </div>
          </div>
      </div>

      <div className="px-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* --- Left Column: Info Cards --- */}
          <div className="space-y-4">
              {/* Wallet Info */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity" style={{ color: themeColor }}>
                      <Wallet size={80} />
                  </div>
                  <h3 className="text-slate-500 text-xs font-bold uppercase mb-2">เครดิตคงเหลือ</h3>
                  <div className="text-3xl font-black" style={{ color: themeColor }}> {/* ✅ สีตัวเลขตามธีม */}
                      {user?.credit_balance?.toLocaleString()} <span className="text-sm text-slate-400">฿</span>
                  </div>
              </div>

              {/* Shop Info (แสดง Logo ร้าน) */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden hover:shadow-md transition-all">
                  <div className="flex items-center gap-3 mb-3">
                      {/* ✅ ถ้ามี Logo ร้าน ให้แสดง Logo */}
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden border border-slate-100 bg-slate-50">
                          {user?.shop_logo ? (
                              <img src={user.shop_logo} className="w-full h-full object-cover" />
                          ) : (
                              <Store size={20} className="text-slate-400" />
                          )}
                      </div>
                      <div>
                          <h3 className="font-bold text-slate-700 text-sm">สมาชิกของร้าน</h3>
                          <p className="text-slate-500 text-xs">{user?.shop_name || 'ไม่ระบุ'}</p>
                      </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-slate-50 flex items-center gap-2 text-xs text-slate-400">
                      <Shield size={12} className="text-green-500" /> บัญชีปลอดภัย
                  </div>
              </div>
          </div>

          {/* --- Right Column: Edit Form --- */}
          <div className="md:col-span-2">
              <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                      <User style={{ color: themeColor }} size={20} /> แก้ไขข้อมูลส่วนตัว
                  </h2>

                  <div className="space-y-5">
                      {/* Full Name */}
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">ชื่อ-นามสกุล (ที่แสดงผล)</label>
                          <div className="relative">
                              <User className="absolute left-3 top-3 text-slate-400" size={18} />
                              <input 
                                  type="text" 
                                  name="full_name"
                                  value={formData.full_name}
                                  onChange={handleChange}
                                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:bg-white transition-all outline-none"
                                  style={{ '--tw-ring-color': themeColor } as any} // Custom ring color
                                  placeholder="เช่น สมชาย ใจดี"
                              />
                          </div>
                      </div>

                      {/* Username */}
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">ชื่อผู้ใช้ (Username)</label>
                          <div className="relative">
                              <KeyRound className="absolute left-3 top-3 text-slate-400" size={18} />
                              <input 
                                  type="text" 
                                  name="username"
                                  value={formData.username}
                                  onChange={handleChange}
                                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:bg-white transition-all outline-none font-medium"
                                  style={{ '--tw-ring-color': themeColor } as any}
                              />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                              <AlertCircle size={10} /> หากแก้ไขชื่อผู้ใช้ ท่านต้องใช้ชื่อใหม่ในการล็อกอินครั้งต่อไป
                          </p>
                      </div>

                      <div className="border-t border-slate-100 my-4"></div>

                      {/* Password Section */}
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1.5">เปลี่ยนรหัสผ่าน <span className="text-xs font-normal text-slate-400">(ระบุเฉพาะถ้าต้องการเปลี่ยน)</span></label>
                          
                          <div className="space-y-3">
                              <div className="relative">
                                  <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
                                  <input 
                                      type="password" 
                                      name="password"
                                      value={formData.password}
                                      onChange={handleChange}
                                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:bg-white transition-all outline-none"
                                      style={{ '--tw-ring-color': themeColor } as any}
                                      placeholder="รหัสผ่านใหม่"
                                  />
                              </div>
                              <div className="relative">
                                  <CheckCircle2 className="absolute left-3 top-3 text-slate-400" size={18} />
                                  <input 
                                      type="password" 
                                      name="confirmPassword"
                                      value={formData.confirmPassword}
                                      onChange={handleChange}
                                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:bg-white transition-all outline-none"
                                      style={{ '--tw-ring-color': themeColor } as any}
                                      placeholder="ยืนยันรหัสผ่านใหม่"
                                  />
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-8 flex justify-end">
                      <button 
                          type="submit" 
                          disabled={isSubmitting}
                          className="px-6 py-2.5 text-white font-bold rounded-xl shadow-lg flex items-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed hover:brightness-110 active:scale-95"
                          style={{ backgroundColor: themeColor }} // ✅ ปุ่มสีตามธีม
                      >
                          {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                          บันทึกการแก้ไข
                      </button>
                  </div>
              </form>
          </div>
      </div>
    </div>
  );
}