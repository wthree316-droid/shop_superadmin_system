import { useEffect, useState } from 'react';
import client from '../../api/client';
import { 
    Palette, Loader2, Globe, 
    Image as ImageIcon, Layers, RefreshCw, CheckCircle2 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { confirmAction } from '../../utils/toastUtils';

export default function ManageShopSettings() {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // State ข้อมูลร้าน
  const [shopData, setShopData] = useState({
      logo_url: '',
      theme_color: '#2563EB',
      line_channel_token: '',
      line_target_id: ''
  });

  // State ข้อมูลหมวดหมู่ (สำหรับปรับสีแยก)
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    const initData = async () => {
        setLoading(true);
        await Promise.all([fetchShopConfig(), fetchCategories()]);
        setLoading(false);
    };
    initData();
  }, []);

  const fetchShopConfig = async () => {
    try {
        const res = await client.get('/shops/');
        if (res.data && res.data.length > 0) {
            const myShop = res.data[0];
            setShopData({
                logo_url: myShop.logo_url || '',
                theme_color: myShop.theme_color || '#2563EB',
                line_channel_token: myShop.line_channel_token || '',
                line_target_id: myShop.line_target_id || ''
            });
        }
    } catch (err) {
        console.error(err);
        toast.error('โหลดข้อมูลร้านไม่สำเร็จ');
    }
  };

  const fetchCategories = async () => {
      try {
          // เรียก API ดึงหมวดหมู่ (ต้องแน่ใจว่า backend มี endpoint นี้)
          const res = await client.get('/play/categories');
          setCategories(res.data);
      } catch (err) {
          console.error("Error fetching categories:", err);
      }
  };

  const handleInitDefaultCategories = async () => {
        confirmAction("ยืนยันการเพิ่มหมวดหมู่มาตรฐาน?\n(ระบบจะเพิ่มเฉพาะหมวดหมู่ที่ยังไม่มี)", async () => {
            setLoading(true);
            try {
                const res = await client.post('/play/categories/init_defaults');
                toast.success(res.data.message);
                fetchCategories(); // รีเฟรชข้อมูลทันที
            } catch (err: any) {
                console.error(err);
                toast.error('ทำรายการไม่สำเร็จ');
            } finally {
                setLoading(false);
            }
        });
    };
    
  // ฟังก์ชันบันทึกการตั้งค่าร้าน (สีหลัก + โลโก้ + ไลน์)
  const handleSaveShop = async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitting(true);
      try {
          await client.put('/shops/config', shopData);
          toast.success('บันทึกข้อมูลร้านค้าเรียบร้อย');
      } catch (err: any) {
          toast.error(err.response?.data?.detail || 'บันทึกไม่สำเร็จ');
      } finally {
          setSubmitting(false);
      }
  };

  // ฟังก์ชันบันทึกสีหมวดหมู่ (แยกออกมาทำทีละอัน)
  const handleUpdateCategoryColor = async (catId: string, newColor: string) => {
      // 1. อัปเดต State ให้เห็นผลทันที (Optimistic UI) เพื่อความลื่นไหล
      setCategories(prev => prev.map(c => c.id === catId ? { ...c, color: newColor } : c));

      // 2. ส่ง API บันทึกลงฐานข้อมูล
      try {
          const cat = categories.find(c => c.id === catId);
          if (!cat) return;

          // ส่งค่าไปอัปเดต (ส่ง label เดิมกลับไปด้วย เพราะ API อาจจะต้องการ)
          await client.put(`/play/categories/${catId}`, {
              label: cat.label,
              color: newColor 
          });
          
          // ไม่ต้อง toast ทุกครั้งที่ลากสี (มันจะรก) อาจจะ toast เฉพาะตอนปล่อยเมาส์หรือทำ Debounce ก็ได้
          // แต่เพื่อให้ง่าย ใส่ toast แบบเบาๆ หรือไม่ใส่ก็ได้ครับ
      } catch (err) {
          console.error(err);
          toast.error('บันทึกสีหมวดหมู่ไม่สำเร็จ');
          fetchCategories(); // โหลดค่าเดิมกลับมาถ้าพัง
      }
  };

  if (loading) {
      return <div className="p-8 text-center text-slate-400 flex flex-col items-center"><Loader2 className="animate-spin mb-2" /> กำลังโหลดข้อมูล...</div>;
  }

  return (
    <div className="pb-20 max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 font-sans">
        
        {/* --- ส่วนที่ 1: ตั้งค่าธีมหลักร้านค้า (Global Theme) --- */}
        <form onSubmit={handleSaveShop} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <Palette size={24} />
                </div>
                <div>
                    <h3 className="font-bold text-lg text-slate-800">1. ธีมหลักร้านค้า (Global Theme)</h3>
                    <p className="text-xs text-slate-500">สีนี้จะถูกใช้เป็นค่าเริ่มต้นสำหรับทุกหน้า และหวยที่ไม่ได้กำหนดสีเฉพาะ</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Logo URL */}
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                        <ImageIcon size={14}/> Logo URL
                    </label>
                    <div className="flex gap-3">
                        <div className="w-12 h-12 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                            {shopData.logo_url ? <img src={shopData.logo_url} className="w-full h-full object-cover"/> : <Globe size={20} className="text-slate-300"/>}
                        </div>
                        <input 
                            type="text"
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:ring-2 focus:ring-blue-200 outline-none text-sm transition-all"
                            placeholder="https://example.com/logo.png"
                            value={shopData.logo_url}
                            onChange={e => setShopData({...shopData, logo_url: e.target.value})}
                        />
                    </div>
                </div>

                {/* Main Theme Color Picker */}
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                        <Palette size={14}/> สีหลักของร้าน
                    </label>
                    <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors">
                        <div className="relative w-10 h-10 overflow-hidden rounded-lg shadow-sm border border-slate-200">
                            <input 
                                type="color"
                                className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer"
                                value={shopData.theme_color}
                                onChange={e => setShopData({...shopData, theme_color: e.target.value})}
                            />
                        </div>
                        <div className="flex-1">
                            <input 
                                type="text"
                                className="w-full bg-transparent outline-none text-sm font-mono uppercase text-slate-700"
                                value={shopData.theme_color}
                                onChange={e => setShopData({...shopData, theme_color: e.target.value})}
                            />
                        </div>
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: shopData.theme_color }}></div>
                    </div>
                </div>
            </div>

            <div className="mt-6 flex justify-end">
                <button 
                    type="submit" 
                    disabled={submitting}
                    className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg hover:bg-black hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-70 text-sm"
                >
                    {submitting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />} บันทึกธีมหลัก
                </button>
            </div>
        </form>

        {/* --- ส่วนที่ 2: ตั้งค่าสีแยกรายหมวดหมู่ (Category Themes) --- */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                        <Layers size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-slate-800">2. แยกสีตามหมวดหมู่ (Category Theme)</h3>
                        <p className="text-xs text-slate-500">กำหนดสีเฉพาะกลุ่ม (เช่น หวยรัฐบาลสีแดง, หวยหุ้นสีเขียว)</p>
                    </div>
                </div>
                <button 
                    onClick={handleInitDefaultCategories}
                    className="text-xs bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 px-3 py-2 rounded-lg font-bold transition-all flex items-center gap-2 border border-transparent hover:border-blue-100"
                    title="สร้างหมวดหมู่พื้นฐาน (รัฐบาล, ฮานอย, ลาว...)"
                >
                    <Layers size={14}/> + หมวดหมู่พื้นฐาน
                </button>
                <button 
                    onClick={fetchCategories} 
                    className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-blue-600 transition-colors"
                    title="โหลดข้อมูลใหม่"
                >
                    <RefreshCw size={18}/>
                </button>
            </div>

            {categories.length === 0 ? (
                <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-xl border border-dashed">
                    ยังไม่มีหมวดหมู่หวยในระบบ
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {categories.map((cat) => {
                        // เช็คว่าเป็น Hex Color หรือไม่ (ถ้าเป็น class เช่น bg-red-500 แสดงว่ายังไม่ได้ตั้งค่าสีแบบใหม่)
                        const isHex = cat.color?.startsWith('#');
                        // ถ้ายังไม่ได้ตั้ง ให้แสดงเป็นสีหลักของร้านไปก่อน
                        const currentColor = isHex ? cat.color : shopData.theme_color;

                        return (
                            <div key={cat.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-purple-300 hover:shadow-md transition-all bg-white">
                                {/* Color Picker Wrapper */}
                                <div className="relative group cursor-pointer shrink-0">
                                    <input 
                                        type="color" 
                                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                                        value={currentColor}
                                        // ใช้ onBlur เพื่อบันทึกเมื่อปล่อยเมาส์/เลือกเสร็จ (ลด Request)
                                        onChange={(e) => {
                                            // อัปเดต UI ทันที
                                            setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, color: e.target.value } : c));
                                        }}
                                        onBlur={(e) => handleUpdateCategoryColor(cat.id, e.target.value)}
                                    />
                                    <div 
                                        className="w-12 h-12 rounded-lg shadow-sm border-2 border-white ring-1 ring-slate-200 transition-transform group-hover:scale-105"
                                        style={{ backgroundColor: currentColor }}
                                    ></div>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-slate-700 text-sm truncate" title={cat.label}>{cat.label}</div>
                                    <div className="text-[10px] text-slate-400 font-mono truncate flex items-center gap-1">
                                        {isHex ? (
                                            <span className="uppercase">{cat.color}</span>
                                        ) : (
                                            <span className="text-slate-300 italic flex items-center gap-1">
                                                <div className="w-2 h-2 rounded-full bg-slate-300"></div> ใช้สีร้าน
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {isHex && (
                                    <button 
                                        // รีเซ็ตกลับไปเป็นค่า Default (เช่น bg-gray-100 หรือค่าว่าง) เพื่อให้ไปดึงสีร้าน
                                        onClick={() => handleUpdateCategoryColor(cat.id, 'bg-gray-100 text-gray-700')} 
                                        className="text-[10px] text-slate-400 hover:text-red-500 hover:bg-red-50 px-2 py-1.5 rounded transition-colors"
                                        title="รีเซ็ตไปใช้สีร้าน"
                                    >
                                        รีเซ็ต
                                    </button>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>

    </div>
  );
}
