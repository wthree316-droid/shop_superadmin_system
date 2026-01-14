import { useEffect, useState } from 'react';
import client from '../../api/client';
import { Save, MessageSquare, Palette, Loader2, Globe, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ManageShopSettings() {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [shopData, setShopData] = useState({
      logo_url: '',
      theme_color: '#2563EB',
      line_channel_token: '',
      line_target_id: ''
  });

  useEffect(() => {
    fetchShopConfig();
  }, []);

  const fetchShopConfig = async () => {
    setLoading(true);
    try {
        // ดึงข้อมูลร้านตัวเอง (Admin เห็นแค่ร้านตัวเองอยู่แล้วจาก API /shops/)
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
    } finally {
        setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitting(true);
      try {
          // เรียก API ที่เราเพิ่งแก้ในข้อ 3
          await client.put('/shops/config', shopData);
          toast.success('บันทึกการตั้งค่าเรียบร้อย');
          // (Optional) อาจจะสั่ง reload window เพื่อให้ theme เปลี่ยนทันที
      } catch (err: any) {
          toast.error(err.response?.data?.detail || 'บันทึกไม่สำเร็จ');
      } finally {
          setSubmitting(false);
      }
  };

  if (loading) {
      return <div className="p-8 text-center text-slate-400 flex flex-col items-center"><Loader2 className="animate-spin mb-2" /> กำลังโหลดข้อมูล...</div>;
  }

  return (
    <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2">
        
        {/* --- Card 1: Branding Settings --- */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <Palette size={24} />
                </div>
                <div>
                    <h3 className="font-bold text-lg text-slate-800">ตั้งค่าหน้าร้าน (Branding)</h3>
                    <p className="text-xs text-slate-500">โลโก้และสีธีมที่จะแสดงให้ลูกค้าเห็น</p>
                </div>
            </div>

            <div className="space-y-5">
                {/* Logo Input */}
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                        <ImageIcon size={14}/> Logo URL
                    </label>
                    <div className="flex gap-3">
                        <div className="w-16 h-16 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                            {shopData.logo_url ? (
                                <img src={shopData.logo_url} className="w-full h-full object-cover" onError={(e) => e.currentTarget.style.display = 'none'} />
                            ) : (
                                <Globe size={24} className="text-slate-300" />
                            )}
                        </div>
                        <div className="flex-1">
                            <input 
                                type="text"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:ring-2 focus:ring-blue-200 outline-none text-sm font-mono"
                                placeholder="https://..."
                                value={shopData.logo_url}
                                onChange={e => setShopData({...shopData, logo_url: e.target.value})}
                            />
                            <p className="text-[10px] text-slate-400 mt-1">* ใส่ลิงก์รูปภาพ (แนะนำขนาด 500x500px)</p>
                        </div>
                    </div>
                </div>

                {/* Theme Color Input */}
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                        <Palette size={14}/> สีธีมร้านค้า (Theme Color)
                    </label>
                    <div className="flex items-center gap-3">
                        <input 
                            type="color"
                            className="w-12 h-12 rounded-xl border border-slate-200 cursor-pointer p-1 bg-white"
                            value={shopData.theme_color}
                            onChange={e => setShopData({...shopData, theme_color: e.target.value})}
                        />
                        <div className="flex-1">
                            <input 
                                type="text"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:ring-2 focus:ring-blue-200 outline-none text-sm font-mono uppercase"
                                value={shopData.theme_color}
                                onChange={e => setShopData({...shopData, theme_color: e.target.value})}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* --- Card 2: LINE Settings (ของเดิม) --- */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-full blur-3xl -mr-16 -mt-16"></div>
            <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                    <MessageSquare size={24} />
                </div>
                <div>
                    <h3 className="font-bold text-lg text-slate-800">LINE Messaging API</h3>
                    <p className="text-xs text-slate-500">ตั้งค่าการแจ้งเตือนผ่าน LINE OA</p>
                </div>
            </div>

            <div className="space-y-5 relative z-10">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Channel Access Token</label>
                    <textarea 
                        rows={2}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:ring-2 focus:ring-green-200 outline-none text-xs font-mono"
                        placeholder="วาง Token ยาวๆ..."
                        value={shopData.line_channel_token}
                        onChange={e => setShopData({...shopData, line_channel_token: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Your User ID</label>
                    <input 
                        type="text"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:ring-2 focus:ring-green-200 outline-none text-sm font-mono"
                        placeholder="Uxxxxxxxx..."
                        value={shopData.line_target_id}
                        onChange={e => setShopData({...shopData, line_target_id: e.target.value})}
                    />
                </div>
            </div>
        </div>

        {/* Footer Button */}
        <div className="lg:col-span-2 flex justify-end">
            <button 
                type="submit" 
                disabled={submitting}
                className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:bg-black hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-70"
            >
                {submitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} บันทึกการตั้งค่าทั้งหมด
            </button>
        </div>
    </form>
  );
}