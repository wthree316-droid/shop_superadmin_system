import { useState, useEffect } from 'react';
import client from '../../api/client';
import { 
    Store, UserPlus, Plus, Users, Trash2, X, Eraser, 
    Search, CheckCircle, Loader2, Building2, LogIn
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext'; // เรียกใช้ Auth Context

export default function SuperShopManagement() {
  const [shops, setShops] = useState<any[]>([]);
  const { login } = useAuth(); // ดึงฟังก์ชัน login มาใช้ (เพื่อ set token ใหม่)

  // Modal States
  const [showShopModal, setShowShopModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showAdminListModal, setShowAdminListModal] = useState(false);
  
  // Data States
  const [selectedShopId, setSelectedShopId] = useState<string>('');
  const [selectedShopName, setSelectedShopName] = useState<string>('');
  const [shopAdmins, setShopAdmins] = useState<any[]>([]);

  // Form States
  const [newShop, setNewShop] = useState({ name: '', code: '' });
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '', full_name: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      const res = await client.get('/shops/');
      setShops(res.data);
    } catch (err) { console.error(err); }
  };

  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await client.post('/shops/', newShop);
      // alert('สร้างร้านค้าสำเร็จ! กรุณาสร้าง Admin ประจำร้านต่อเลย');
      
      setSelectedShopId(res.data.id);
      setSelectedShopName(res.data.name);
      
      setShowShopModal(false);
      setShowAdminModal(true); 
      fetchShops();
    } catch (err: any) {
      alert(`Error: ${err.response?.data?.detail}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await client.post('/users/admins', {
        ...newAdmin,
        shop_id: selectedShopId 
      });
      alert(`สร้าง Admin ให้ร้าน ${selectedShopName} สำเร็จ!`);
      setShowAdminModal(false);
      setNewAdmin({ username: '', password: '', full_name: '' }); 
    } catch (err: any) {
      alert(`Error: ${err.response?.data?.detail}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAddAdminModal = (shop: any) => {
      setSelectedShopId(shop.id);
      setSelectedShopName(shop.name);
      setNewAdmin({ username: '', password: '', full_name: '' });
      setShowAdminModal(true);
  };

  const openAdminListModal = async (shop: any) => {
      setSelectedShopId(shop.id);
      setSelectedShopName(shop.name);
      try {
          const res = await client.get(`/users/shop/${shop.id}/admins`);
          setShopAdmins(res.data);
          setShowAdminListModal(true);
      } catch (err) {
          console.error(err);
          alert("ไม่สามารถดึงข้อมูล Admin ได้");
      }
  };

  const handleDeleteAdmin = async (adminId: string, username: string) => {
      if (!confirm(`ต้องการลบผู้ดูแล ${username} ออกจากร้านใช่หรือไม่?`)) return;
      try {
          await client.delete(`/users/${adminId}`);
          setShopAdmins(shopAdmins.filter(a => a.id !== adminId));
      } catch (err: any) {
          alert(`ลบไม่สำเร็จ: ${err.response?.data?.detail}`);
      }
  };

  const handleCleanupShop = async (shopId: string, shopName: string) => {
      const confirm1 = confirm(`⚠️ คำเตือน: คุณกำลังจะล้างข้อมูล "ประวัติการแทงทั้งหมด" ของร้าน "${shopName}"`);
      if (!confirm1) return;
      
      const confirm2 = prompt(`พิมพ์ชื่อร้าน "${shopName}" เพื่อยืนยันการล้างข้อมูล`);
      if (confirm2 !== shopName) return alert("ชื่อร้านไม่ถูกต้อง ยกเลิกการทำรายการ");

      try {
          await client.delete(`/system/cleanup/shop/${shopId}`);
          alert(`ล้างข้อมูลร้าน ${shopName} เรียบร้อยแล้ว!`);
      } catch (err: any) {
          alert(`เกิดข้อผิดพลาด: ${err.response?.data?.detail}`);
      }
  };

  // Filter Search
  const filteredShops = shops.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

// [ใหม่] ฟังก์ชันกดเปลี่ยนสถานะร้าน (Active/Inactive)
  const toggleShopStatus = async (shopId: string, currentStatus: boolean) => {
    const action = currentStatus ? 'ระงับ' : 'เปิดใช้งาน';
    if (!confirm(`คุณต้องการ "${action}" ร้านค้านี้ใช่หรือไม่?`)) return;

    try {
        // เรียก API ที่มีอยู่ใน shops.py แล้ว
        await client.patch(`/shops/${shopId}/toggle_status`);
        
        // อัปเดตหน้าจอทันที
        setShops(shops.map(s => 
            s.id === shopId ? { ...s, is_active: !currentStatus } : s
        ));
    } catch (err: any) {
        alert('เปลี่ยนสถานะไม่สำเร็จ: ' + (err.response?.data?.detail || err.message));
    }
  };

  // [แก้ไข] ฟังก์ชันกดเข้าร้าน (เพิ่มการเก็บ Token สำรอง)
  const handleImpersonate = async (shopId: string) => {
      if(!confirm('คุณต้องการเข้าสู่ระบบในฐานะแอดมินของร้านนี้ใช่ไหม?')) return;
      
      try {
          // 1. [สำคัญ] เก็บ Token ของ Superadmin ไว้ก่อน เพื่อให้กดกลับมาได้
          const currentToken = localStorage.getItem('token');
          if (currentToken) {
              localStorage.setItem('super_backup_token', currentToken);
          }

          // 2. เรียก API เพื่อขอ Token ของร้านนั้น
          const res = await client.post(`/users/impersonate/${shopId}`);
          
          // 3. สั่ง Login ด้วย Token ใหม่
          await login(res.data.access_token);
          
          // 4. บังคับโหลดหน้าใหม่เพื่อเข้าสู่ Dashboard ร้าน
          window.location.href = '/admin/dashboard';
          
      } catch(err: any) {
          alert(err.response?.data?.detail || 'เข้าระบบไม่ได้ (ร้านอาจยังไม่มี Admin)');
      }
  };

  return (
    <div className="p-4 md:p-8 animate-fade-in text-slate-800 pb-24 md:pb-8">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
           <h1 className="text-2xl md:text-3xl font-black flex items-center gap-3 text-slate-800">
              <div className="p-2 bg-linear-to-br from-amber-400 to-yellow-500 rounded-xl shadow-lg shadow-amber-200 text-white">
                <Store size={24} />
              </div>
              จัดการร้านค้า <span className="text-sm font-normal text-slate-400 bg-white px-2 py-1 rounded-full border hidden sm:inline-block">Total: {shops.length}</span>
           </h1>
           <p className="text-sm text-slate-500 mt-2 ml-1">ดูแลจัดการ Tenant และผู้ดูแลระบบประจำร้าน</p>
        </div>
        
        <div className="flex w-full md:w-auto gap-2">
            <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="ค้นหาร้านค้า..." 
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-200 outline-none transition-all text-sm"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
            <button 
                onClick={() => { setShowShopModal(true); setNewShop({ name: '', code: '' }); }}
                className="bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold shadow-lg hover:bg-black hover:scale-105 transition-all flex items-center gap-2 whitespace-nowrap"
            >
                <Plus size={18} /> <span className="hidden sm:inline">สร้างร้านใหม่</span>
            </button>
        </div>
      </div>

      {/* --- Desktop Table View (ซ่อนบนมือถือ) --- */}
    <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-xs tracking-wider">
          <tr>
            <th className="p-5">ข้อมูลร้านค้า</th>
            <th className="p-5 text-center">สถานะ</th>
            <th className="p-5 text-center">เข้าใช้งาน</th>
            <th className="p-5 text-center">Admin Tools</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-sm">
          {filteredShops.map((shop) => (
            <tr key={shop.id} className="hover:bg-amber-50/30 transition-colors group">
              <td className="p-5">
                  <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 font-bold border border-slate-200 group-hover:border-amber-300 group-hover:text-amber-500 transition-colors">
                          {shop.name[0]}
                      </div>
                      <div>
                          <div className="font-bold text-slate-800 text-base">{shop.name}</div>
                          <div className="font-mono text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded inline-block mt-0.5">CODE: {shop.code}</div>
                      </div>
                  </div>
              </td>
              <td className="p-5 text-center">
                <button 
                    onClick={() => toggleShopStatus(shop.id, shop.is_active)}
                    className={`px-3 py-1 rounded-full text-xs font-bold border transition-all shadow-sm active:scale-95 ${
                        shop.is_active 
                        ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                        : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                    }`}
                    title="คลิกเพื่อเปลี่ยนสถานะ"
                >
                    {shop.is_active ? 'Active' : 'Inactive'}
                </button>
              </td>
              <td className="p-5 text-center">
                  {/* ✅ [แก้ไข] ปุ่มนี้เรียก handleImpersonate เพื่อเข้าร้าน */}
                  <button 
                      onClick={() => handleImpersonate(shop.id)}
                      className="text-indigo-600 hover:text-white hover:bg-indigo-600 border border-indigo-200 font-bold text-xs flex items-center justify-center gap-1.5 mx-auto px-4 py-2 rounded-lg transition-all shadow-sm"
                  >
                      <LogIn size={14} /> เข้าร้าน (Login)
                  </button>
              </td>
              <td className="p-5 text-center">
                  <div className="flex justify-center gap-2">
                      {/* ปุ่มแก้ไขข้อมูลร้าน */}
                      <button 
                        onClick={() => {
                            setNewShop({ name: shop.name, code: shop.code });
                            setSelectedShopId(shop.id);
                            setShowShopModal(true);
                        }} 
                        className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-blue-100 rounded-lg transition-colors border border-slate-200" 
                        title="แก้ไขร้าน"
                      >
                          <Eraser size={16} /> {/* หรือใช้ไอคอน Pencil */}
                      </button>

                      {/* ปุ่มดู Admin */}
                      <button onClick={() => openAdminListModal(shop)} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-amber-600 bg-slate-50 hover:bg-amber-100 rounded-lg transition-colors border border-slate-200" title="ดู Admin">
                          <Users size={16} />
                      </button>

                      {/* ปุ่มเพิ่ม Admin */}
                      <button onClick={() => openAddAdminModal(shop)} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-green-600 bg-slate-50 hover:bg-green-100 rounded-lg transition-colors border border-slate-200" title="เพิ่ม Admin">
                          <UserPlus size={16} />
                      </button>
                      
                      {/* ปุ่มล้างข้อมูล */}
                      <button onClick={() => handleCleanupShop(shop.id, shop.name)} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-red-600 bg-slate-50 hover:bg-red-100 rounded-lg transition-colors border border-slate-200" title="ล้างข้อมูล">
                          <Trash2 size={16} />
                      </button>
                  </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {filteredShops.length === 0 && <div className="p-12 text-center text-slate-400 flex flex-col items-center"><Store size={48} className="opacity-20 mb-2" />ไม่พบร้านค้าในระบบ</div>}
    </div>

    {/* --- Mobile Card View (แสดงบนมือถือ) --- */}
    <div className="md:hidden grid grid-cols-1 gap-4">
        {filteredShops.map((shop) => (
            <div key={shop.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 relative overflow-hidden">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-linear-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-500 font-bold text-lg shadow-inner">
                            {shop.name[0]}
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-800">{shop.name}</h3>
                            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">#{shop.code}</span>
                        </div>
                    </div>
                    {/* แก้ไขปุ่มสถานะตรงนี้ */}
                    <button 
                        onClick={() => toggleShopStatus(shop.id, shop.is_active)}
                        className={`w-3 h-3 rounded-full ${shop.is_active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`}
                        title="แตะเพื่อเปลี่ยนสถานะ"
                    ></button>
                </div>
                
                {/* ปุ่มหลักบนมือถือ */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    {/* ✅ [แก้ไข] ปุ่มนี้เรียก handleImpersonate */}
                    <button 
                      onClick={() => handleImpersonate(shop.id)}
                      className="col-span-2 flex items-center justify-center gap-2 py-3 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-sm border border-indigo-100 hover:bg-indigo-100 active:scale-95 transition-all shadow-sm"
                    >
                        <LogIn size={18} /> เข้าสู่ระบบร้านค้า
                    </button>

                    <button 
                      onClick={() => openAdminListModal(shop)}
                      className="flex items-center justify-center gap-2 py-2 bg-slate-50 text-slate-600 rounded-xl font-medium text-xs border border-slate-100 active:bg-slate-200"
                    >
                        <Users size={14} /> รายชื่อ Admin
                    </button>
                     <button 
                      onClick={() => openAddAdminModal(shop)}
                      className="flex items-center justify-center gap-2 py-2 bg-slate-50 text-slate-600 rounded-xl font-medium text-xs border border-slate-100 active:bg-slate-200"
                    >
                        <UserPlus size={14} /> เพิ่ม Admin
                    </button>
                </div>

                <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                    <span className="text-xs text-slate-400 font-medium">Danger Zone</span>
                    <button 
                      onClick={() => handleCleanupShop(shop.id, shop.name)}
                      className="flex items-center gap-1 text-red-400 text-xs font-bold hover:text-red-600 bg-red-50 px-3 py-1.5 rounded-lg"
                    >
                        <Trash2 size={14} /> ล้างข้อมูล
                    </button>
                </div>
            </div>
        ))}
        {filteredShops.length === 0 && <div className="text-center py-10 text-slate-400">ไม่พบข้อมูลร้านค้า</div>}
    </div>


      {/* --- Modal 1: สร้างร้าน --- */}
      {showShopModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-linear-to-r from-slate-800 to-slate-900 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-xl -mr-6 -mt-6"></div>
                <h3 className="text-xl font-bold flex items-center gap-2"><Building2 size={22} className="text-amber-400"/> สร้างร้านค้าใหม่</h3>
                <p className="text-slate-300 text-xs mt-1">Step 1: กำหนดข้อมูลพื้นฐานของร้าน</p>
            </div>
            <form onSubmit={handleCreateShop} className="p-6 space-y-4">
              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">ชื่อร้าน</label>
                  <input 
                    placeholder="เช่น ร้านเฮงเฮง พาเพลิน" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all font-bold text-slate-800"
                    value={newShop.name} onChange={e => setNewShop({...newShop, name: e.target.value})} required
                  />
              </div>
              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">รหัสร้าน (Code)</label>
                  <input 
                    placeholder="เช่น HENG01" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 uppercase font-mono focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all"
                    value={newShop.code} onChange={e => setNewShop({...newShop, code: e.target.value})} required
                  />
              </div>
              <div className="flex gap-3 mt-6 pt-2">
                <button type="button" onClick={() => setShowShopModal(false)} className="flex-1 py-3 text-slate-500 hover:bg-slate-100 rounded-xl font-bold transition-colors">ยกเลิก</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-black shadow-lg shadow-slate-300 transition-all flex justify-center items-center gap-2 disabled:opacity-70">
                    {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <span>ถัดไป &rarr;</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Modal 2: สร้าง Admin --- */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-linear-to-r from-amber-400 to-yellow-500 text-white relative">
                <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/20 rounded-full blur-lg -ml-4 -mb-4"></div>
                <h3 className="text-xl font-black flex items-center gap-2 relative z-10">
                    <UserPlus /> เพิ่มผู้ดูแล
                </h3>
                <p className="text-amber-50 text-xs mt-1 relative z-10 font-medium">สำหรับร้าน: <span className="bg-white/20 px-2 py-0.5 rounded text-white">{selectedShopName}</span></p>
            </div>
            <form onSubmit={handleCreateAdmin} className="p-6 space-y-4 bg-white">
              <div className="space-y-1">
                 <label className="text-xs font-bold text-slate-400 uppercase">Username</label>
                 <input 
                    type="text"
                    placeholder="เช่น admin_heng" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none font-bold"
                    value={newAdmin.username} onChange={e => setNewAdmin({...newAdmin, username: e.target.value})} required
                 />
              </div>
              <div className="space-y-1">
                 <label className="text-xs font-bold text-slate-400 uppercase">Password</label>
                 <input 
                    type="password"
                    placeholder="ตั้งรหัสผ่าน" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none"
                    value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} required
                 />
              </div>
              <div className="space-y-1">
                 <label className="text-xs font-bold text-slate-400 uppercase">ชื่อ-นามสกุล (Optional)</label>
                 <input 
                    type="text"
                    placeholder="เช่น เสี่ยเฮง" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none"
                    value={newAdmin.full_name} onChange={e => setNewAdmin({...newAdmin, full_name: e.target.value})}
                 />
              </div>
              
              <div className="flex gap-3 mt-6 pt-2">
                <button type="button" onClick={() => setShowAdminModal(false)} className="flex-1 py-3 text-slate-500 hover:text-slate-700 font-bold border rounded-xl bg-white hover:bg-slate-50 transition-colors">ปิด</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-md shadow-green-200 transition-colors flex justify-center items-center gap-2">
                    {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <><CheckCircle size={18}/> ยืนยัน</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Modal 3: รายชื่อ Admin --- */}
      {showAdminListModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Users className="text-slate-400" size={20}/> รายชื่อผู้ดูแล</h3>
                    <p className="text-slate-500 text-xs">ร้าน: <span className="font-bold text-slate-700">{selectedShopName}</span></p>
                </div>
                <button onClick={() => setShowAdminListModal(false)} className="p-2 text-slate-400 hover:text-white hover:bg-red-500 rounded-full transition-colors">
                    <X size={20} />
                </button>
            </div>
            
            <div className="p-2 overflow-y-auto flex-1 custom-scrollbar">
                {shopAdmins.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                        <UserPlus size={40} className="mb-2 opacity-20" />
                        <span>ยังไม่มีผู้ดูแล</span>
                    </div>
                ) : (
                    <div className="space-y-2 p-2">
                        {shopAdmins.map((admin) => (
                            <div key={admin.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-amber-200 hover:shadow-sm transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold group-hover:bg-amber-100 group-hover:text-amber-600 transition-colors">
                                        {admin.username[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800">{admin.username}</div>
                                        <div className="text-xs text-slate-500">{admin.full_name || 'ไม่ระบุชื่อ'}</div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleDeleteAdmin(admin.id, admin.username)}
                                    className="text-slate-300 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-all"
                                    title="ลบผู้ดูแล"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
                <button 
                    onClick={() => { setShowAdminListModal(false); setShowAdminModal(true); }}
                    className="w-full py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:border-amber-400 hover:text-amber-600 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                    <Plus size={18} /> เพิ่มผู้ดูแลคนใหม่
                </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}