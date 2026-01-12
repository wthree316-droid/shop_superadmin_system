import { useEffect, useState } from 'react';
import client from '../../api/client';
import { Save, MessageSquare, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ManageLineConfig() {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [shopData, setShopData] = useState({
      line_channel_token: '',
      line_target_id: ''
  });

  useEffect(() => {
    fetchShopConfig();
  }, []);

  const fetchShopConfig = async () => {
    setLoading(true);
    try {
        const res = await client.get('/shops/');
        if (res.data && res.data.length > 0) {
            const myShop = res.data[0];
            setShopData({
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
          await client.put('/shops/config', {
              line_channel_token: shopData.line_channel_token,
              line_target_id: shopData.line_target_id
          });
          toast.success('บันทึกการตั้งค่าเรียบร้อย');
      } catch (err: any) {
          toast.error(err.response?.data?.detail || 'บันทึกไม่สำเร็จ');
      } finally {
          setSubmitting(false);
      }
  };

  // ✅ แก้ไข: นำ loading มาใช้แสดงผล
  if (loading) {
      return <div className="p-8 text-center text-slate-400 flex flex-col items-center"><Loader2 className="animate-spin mb-2" /> กำลังโหลดข้อมูล...</div>;
  }

  return (
    <form onSubmit={handleSave} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 relative overflow-hidden animate-in fade-in slide-in-from-bottom-2">
        <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-full blur-3xl -mr-16 -mt-16"></div>
        
        <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                <MessageSquare size={24} />
            </div>
            <div>
                <h3 className="font-bold text-lg text-slate-800">LINE Messaging API (2026)</h3>
                <p className="text-xs text-slate-500">ตั้งค่าการแจ้งเตือนผ่าน LINE Official Account</p>
            </div>
        </div>

        <div className="space-y-5 relative z-10">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3 text-sm text-blue-800">
                <AlertCircle size={20} className="shrink-0" />
                <div>
                    <p className="font-bold mb-1">วิธีหาค่า Token และ User ID:</p>
                    <ul className="list-disc pl-4 space-y-1 opacity-90 text-xs">
                        <li>เข้า <a href="https://developers.line.biz/console/" target="_blank" rel="noreferrer" className="underline font-bold">LINE Developers Console</a></li>
                        <li>เลือก Channel ของคุณ {'>'} Messaging API</li>
                        <li><strong>Channel Access Token:</strong> กด Issue แล้วก๊อปปี้มาใส่</li>
                        <li><strong>User ID:</strong> ดูที่ tab Basic Settings เลื่อนล่างสุด</li>
                    </ul>
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Channel Access Token (Long-lived)</label>
                <textarea 
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:ring-2 focus:ring-green-200 focus:border-green-500 outline-none transition-all font-mono text-xs"
                    placeholder="วาง Token ยาวๆ ตรงนี้..."
                    value={shopData.line_channel_token}
                    onChange={e => setShopData({...shopData, line_channel_token: e.target.value})}
                />
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Your User ID / Group ID</label>
                <input 
                    type="text"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:ring-2 focus:ring-green-200 focus:border-green-500 outline-none transition-all font-mono text-sm"
                    placeholder="Uxxxxxxxx..."
                    value={shopData.line_target_id}
                    onChange={e => setShopData({...shopData, line_target_id: e.target.value})}
                />
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button 
                    type="submit" 
                    disabled={submitting}
                    className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-green-200 hover:bg-green-700 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-70"
                >
                    {submitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} บันทึกการตั้งค่า LINE
                </button>
            </div>
        </div>
    </form>
  );
}