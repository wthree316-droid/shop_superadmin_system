import { useEffect, useState } from 'react';
import client from '../../api/client';
import { Store, Users, Server, ShieldCheck, Trash2, AlertTriangle } from 'lucide-react';

export default function SuperDashboard() {
  const [stats, setStats] = useState({
    total_shops: 0,
    total_users: 0,
    active_shops: 0
  });

  useEffect(() => {
    // ในอนาคตควรทำ API /stats/system สำหรับ superadmin โดยเฉพาะ
    // ตอนนี้ Mock หรือดึงจาก list shop ไปพลางๆ
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
        const resShops = await client.get('/shops/');
        // const resUsers = await client.get('/users/all'); // ต้องทำ API นี้เพิ่มถ้าอยากได้
        setStats({
            total_shops: resShops.data.length,
            active_shops: resShops.data.filter((s:any) => s.is_active).length,
            total_users: 0 // รอ API
        });
    } catch(err) { console.error(err); }
  };

  // ฟังก์ชันล้างระบบ
  const handleGlobalCleanup = async () => {
      const confirm1 = confirm("⚠️ คำเตือน: คุณกำลังจะล้างข้อมูลประวัติการแทงทั้งหมดในระบบ!");
      if (!confirm1) return;
      const confirm2 = confirm("ยืนยันครั้งสุดท้าย: ข้อมูลจะไม่สามารถกู้คืนได้ พิมพ์ 'YES' เพื่อยืนยัน");
      if (!confirm2) return; // หรือจะให้พิมพ์ input จริงๆ ก็ได้

      try {
          await client.delete('/system/cleanup/global');
          alert('ล้างข้อมูลเรียบร้อย ระบบสะอาดเอี่ยม!');
          // Refresh stats
          fetchStats();
      } catch (err) {
          alert('เกิดข้อผิดพลาดในการล้างข้อมูล');
      }
  };

  return (
    <div className="p-6 animate-fade-in text-gray-800">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Server className="text-purple-600" /> System Overview
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
              <div className="p-4 bg-purple-100 text-purple-600 rounded-full">
                  <Store size={32} />
              </div>
              <div>
                  <p className="text-sm text-gray-500">Total Shops</p>
                  <h3 className="text-3xl font-bold text-gray-800">{stats.total_shops}</h3>
                  <p className="text-xs text-green-600 font-bold">Active: {stats.active_shops}</p>
              </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
              <div className="p-4 bg-blue-100 text-blue-600 rounded-full">
                  <Users size={32} />
              </div>
              <div>
                  <p className="text-sm text-gray-500">Total Users</p>
                  <h3 className="text-3xl font-bold text-gray-800">-</h3>
                  <p className="text-xs text-gray-400">System wide</p>
              </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
              <div className="p-4 bg-green-100 text-green-600 rounded-full">
                  <ShieldCheck size={32} />
              </div>
              <div>
                  <p className="text-sm text-gray-500">System Status</p>
                  <h3 className="text-3xl font-bold text-green-600">Online</h3>
                  <p className="text-xs text-gray-400">Server is running</p>
              </div>
          </div>
      </div>
      
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
          <p className="font-bold text-yellow-800">⚠️ Maintenance Mode</p>
          <p className="text-sm text-yellow-700">ระบบทำงานปกติ (ส่วนนี้เอาไว้กดปิดปรับปรุงระบบในอนาคต)</p>
      </div>

      <div className="mt-8">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-red-600">
              <AlertTriangle /> Danger Zone
          </h3>
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex justify-between items-center">
              <div>
                  <h4 className="font-bold text-red-800">ล้างข้อมูลธุรกรรมทั้งหมด (Global Cleanup)</h4>
                  <p className="text-sm text-red-600 mt-1">
                      ลบข้อมูล Tickets, Ticket Items, Audit Logs และ ผลรางวัล ทั้งหมดในระบบ (Users และ Shops จะยังอยู่)
                  </p>
              </div>
              <button 
                onClick={handleGlobalCleanup}
                className="bg-red-600 text-white px-6 py-3 rounded-lg font-bold shadow hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                  <Trash2 size={20} /> ล้างข้อมูลเดี๋ยวนี้
              </button>
          </div>
      </div>
    
    </div>
  );
}