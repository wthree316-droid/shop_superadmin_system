import { useState, useEffect } from 'react';
import client from '../../api/client';
import { 
    Store, UserPlus, Plus, Users, Trash2, X, Eraser, 
    Search, CheckCircle, Loader2, Building2, LogIn, Globe,
    AlertTriangle, ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast'; 
import { confirmAction } from '../../utils/toastUtils';

export default function SuperShopManagement() {
  const [shops, setShops] = useState<any[]>([]);

  // Modal States
  const [showShopModal, setShowShopModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showAdminListModal, setShowAdminListModal] = useState(false);
  
  // Data States
  const [selectedShopId, setSelectedShopId] = useState<string>('');
  const [selectedShopName, setSelectedShopName] = useState<string>('');
  const [shopAdmins, setShopAdmins] = useState<any[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);

  // Form States
  const [newShop, setNewShop] = useState({ name: '', code: '', subdomain: '', logo_url: '' });
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
    } catch (err) { 
        console.error(err);
        toast.error("ไม่สามารถโหลดข้อมูลร้านค้าได้");
    }
  };

  const handleSaveShop = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (isEditMode) {
          await client.put(`/shops/${selectedShopId}`, newShop);
          toast.success('แก้ไขข้อมูลร้านเรียบร้อย');
          setShowShopModal(false);
          fetchShops();
      } else {
          const res = await client.post('/shops/', newShop);
          setSelectedShopId(res.data.id);
          setSelectedShopName(res.data.name);
          
          toast.success('สร้างร้านค้าสำเร็จ! กรุณาเพิ่มผู้ดูแล');
          setShowShopModal(false);
          setShowAdminModal(true); 
          fetchShops();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'เกิดข้อผิดพลาดในการบันทึก');
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
      toast.success(`เพิ่มผู้ดูแลให้ร้าน "${selectedShopName}" เรียบร้อย`);
      setShowAdminModal(false);
      setNewAdmin({ username: '', password: '', full_name: '' }); 
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'สร้างผู้ดูแลไม่สำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAdmin = (adminId: string, username: string) => {
      // ✅ ใช้ confirmAction แทน confirm()
      confirmAction(`ยืนยันลบผู้ดูแล "${username}"?`, async () => {
          try {
              await client.delete(`/users/${adminId}`);
              setShopAdmins(prev => prev.filter(a => a.id !== adminId));
              toast.success("ลบผู้ดูแลเรียบร้อย");
          } catch (err: any) {
              toast.error(err.response?.data?.detail || 'ลบไม่สำเร็จ');
          }
      }, 'ลบเลย');
  };

  const handleCleanupShop = (shopId: string, shopName: string) => {
      // ✅ ใช้ confirmAction ชั้นแรก
      confirmAction(`⚠️ ล้างข้อมูล (โพย, ตัวเลข, ผลรางวัล, เลขอั้น) ของร้าน "${shopName}"?`, async () => {
          // ยังคง prompt ไว้เพื่อความปลอดภัยสูงสุด (กันมือลั่นกด Confirm Toast ผิด)
          setTimeout(async () => {
              const confirm2 = prompt(`พิมพ์ชื่อร้าน "${shopName}" เพื่อยืนยันการล้างข้อมูล (ข้อมูลจะหายถาวร!)\nจะลบ: โพย, ตัวเลข, ผลรางวัล, เลขอั้น`);
              if (confirm2 !== shopName) return toast.error("ชื่อร้านไม่ถูกต้อง ยกเลิกรายการ");

              try {
                  await client.delete(`/system/cleanup/shop/${shopId}`);
                  toast.success(`ล้างข้อมูลร้าน ${shopName} เรียบร้อย (โพย, ตัวเลข, ผลรางวัล, เลขอั้น)`);
              } catch (err: any) {
                  toast.error(err.response?.data?.detail || 'เกิดข้อผิดพลาด');
              }
          }, 100); // delay นิดนึงเพื่อให้ toast หายไปก่อน prompt ขึ้น
      }, 'ล้างข้อมูล');
  };

  const toggleShopStatus = (shopId: string, currentStatus: boolean) => {
    const action = currentStatus ? 'ระงับ' : 'เปิดใช้งาน';
    // ✅ ใช้ confirmAction แทน confirm()
    confirmAction(`ต้องการ "${action}" ร้านค้านี้ใช่หรือไม่?`, async () => {
        try {
            await client.patch(`/shops/${shopId}/toggle_status`);
            setShops(prev => prev.map(s => 
                s.id === shopId ? { ...s, is_active: !currentStatus } : s
            ));
            toast.success(`สถานะร้านค้า: ${action} เรียบร้อย`);
        } catch (err: any) {
            toast.error('เปลี่ยนสถานะไม่สำเร็จ');
        }
    });
  };

    const handleImpersonate = (shopId: string) => {
        confirmAction('เข้าใช้งานในฐานะ Admin ของร้านนี้?', async () => {
            try {
                const res = await client.post(`/users/impersonate/${shopId}`);
                const { access_token, shop_subdomain } = res.data;
                const currentHost = window.location.hostname;

                // --- CASE: LOCALHOST ---
                if (currentHost.includes('localhost') || currentHost === '127.0.0.1') {
                    localStorage.setItem('token', access_token);
                    // บังคับโหลดใหม่เพื่อให้ Context เปลี่ยน
                    window.location.href = '/admin/dashboard';
                    return;
                }

                // --- CASE: PRODUCTION ---
                const protocol = window.location.protocol; // https:
                const rootDomain = import.meta.env.VITE_ROOT_DOMAIN || currentHost.split('.').slice(-2).join('.');
                
                // สร้าง URL (เช็คให้แน่ใจว่าไม่มี slash เกิน)
                const targetUrl = `${protocol}//${shop_subdomain}.${rootDomain}/login?token=${access_token}`;

                console.log('Redirecting to:', targetUrl); // ✅ ดู Log ก่อนไป

                window.location.href = targetUrl;

            } catch (err: any) {
                toast.error('เข้าสู่ระบบไม่ได้');
            }
        }, 'ยืนยัน');
    };

  const openCreateModal = () => {
      setNewShop({ name: '', code: '', subdomain: '', logo_url: '' });
      setIsEditMode(false);
      setShowShopModal(true);
  };

  const openEditModal = (shop: any) => {
      setNewShop({ 
          name: shop.name, 
          code: shop.code, 
          subdomain: shop.subdomain || '',
          logo_url: shop.logo_url || ''
      });
      setSelectedShopId(shop.id);
      setIsEditMode(true);
      setShowShopModal(true);
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
          toast.error("ไม่สามารถดึงรายชื่อผู้ดูแลได้");
      }
  };

  // ✅ [สำคัญ] กรองข้อมูลร้านค้า (เอากลับมาใส่ให้แล้วครับ)
  const filteredShops = shops.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.subdomain && s.subdomain.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-4 md:p-8 animate-fade-in text-slate-800 pb-24 md:pb-8">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
           <h1 className="text-2xl md:text-3xl font-black flex items-center gap-3 text-slate-800">
              <div className="p-2 bg-linear-to-br from-amber-400 to-orange-500 rounded-xl shadow-lg shadow-amber-200 text-white">
                <Store size={24} />
              </div>
              จัดการร้านค้า <span className="text-sm font-normal text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 hidden sm:inline-block shadow-sm">Total: {shops.length}</span>
           </h1>
           <p className="text-sm text-slate-500 mt-2 ml-1">สร้างและบริหารจัดการ Tenant ทั้งหมดในระบบ</p>
        </div>
        
        <div className="flex w-full md:w-auto gap-2">
            <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="ค้นหาร้านค้า / รหัส..." 
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-200 outline-none transition-all text-sm font-medium shadow-sm"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
            <button 
                onClick={openCreateModal}
                className="bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg hover:bg-black hover:scale-105 transition-all flex items-center gap-2 whitespace-nowrap"
            >
                <Plus size={20} /> <span className="hidden sm:inline">สร้างร้านใหม่</span>
            </button>
        </div>
      </div>

      {/* --- Desktop Table View --- */}
      <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-xs tracking-wider">
            <tr>
              <th className="p-5 pl-6">ข้อมูลร้านค้า</th>
              <th className="p-5 text-center">Subdomain</th>
              <th className="p-5 text-center">สถานะ</th>
              <th className="p-5 text-center">เข้าใช้งาน</th>
              <th className="p-5 text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filteredShops.map((shop) => (
              <tr key={shop.id} className="hover:bg-amber-50/40 transition-colors group">
                <td className="p-5 pl-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold border border-slate-200 group-hover:border-amber-300 group-hover:text-amber-500 transition-colors overflow-hidden">
                            {shop.logo_url ? <img src={shop.logo_url} className="w-full h-full object-cover"/> : shop.name[0]}
                        </div>
                        <div>
                            <div className="font-bold text-slate-800 text-base">{shop.name}</div>
                            <div className="font-mono text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md inline-block mt-1 border border-slate-200">CODE: {shop.code}</div>
                        </div>
                    </div>
                </td>
                <td className="p-5 text-center">
                    {shop.subdomain ? (
                        <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">
                            {shop.subdomain}
                        </span>
                    ) : (
                        <span className="text-xs text-slate-300">-</span>
                    )}
                </td>
                <td className="p-5 text-center">
                  <button 
                      onClick={() => toggleShopStatus(shop.id, shop.is_active)}
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border transition-all shadow-sm active:scale-95 flex items-center gap-1 mx-auto w-fit ${
                          shop.is_active 
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100' 
                          : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                      }`}
                  >
                      {shop.is_active ? <CheckCircle size={12}/> : <X size={12}/>}
                      {shop.is_active ? 'Active' : 'Suspended'}
                  </button>
                </td>
                <td className="p-5 text-center">
                    <button 
                        onClick={() => handleImpersonate(shop.id)}
                        className="text-indigo-600 hover:text-white hover:bg-indigo-600 border border-indigo-200 hover:border-indigo-600 font-bold text-xs flex items-center justify-center gap-1.5 mx-auto px-4 py-2 rounded-lg transition-all shadow-sm"
                    >
                        <LogIn size={14} /> Login
                    </button>
                </td>
                <td className="p-5 text-center">
                    <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => openEditModal(shop)}
                          className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-blue-600 bg-white hover:bg-blue-50 rounded-lg transition-colors border border-slate-200 shadow-sm"
                          title="แก้ไขข้อมูลร้าน"
                        >
                            <Eraser size={16} />
                        </button>

                        <button onClick={() => openAdminListModal(shop)} className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-amber-600 bg-white hover:bg-amber-50 rounded-lg transition-colors border border-slate-200 shadow-sm" title="ดู Admin">
                            <Users size={16} />
                        </button>
                        <button onClick={() => openAddAdminModal(shop)} className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-green-600 bg-white hover:bg-green-50 rounded-lg transition-colors border border-slate-200 shadow-sm" title="เพิ่ม Admin">
                            <UserPlus size={16} />
                        </button>
                        <div className="w-px h-6 bg-slate-200 mx-1 self-center"></div>
                        <button onClick={() => handleCleanupShop(shop.id, shop.name)} className="w-9 h-9 flex items-center justify-center text-red-400 hover:text-red-600 bg-white hover:bg-red-50 rounded-lg transition-colors border border-red-100 hover:border-red-200 shadow-sm" title="ล้างข้อมูล">
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

      {/* --- Mobile Card View --- */}
      <div className="md:hidden grid grid-cols-1 gap-4">
          {filteredShops.map((shop) => (
              <div key={shop.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 relative overflow-hidden">
                  <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-lg border border-slate-200 overflow-hidden">
                              {shop.logo_url ? <img src={shop.logo_url} className="w-full h-full object-cover"/> : shop.name[0]}
                          </div>
                          <div>
                              <h3 className="font-bold text-lg text-slate-800">{shop.name}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">#{shop.code}</span>
                                  {shop.subdomain && <span className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{shop.subdomain}</span>}
                              </div>
                          </div>
                      </div>
                      <button 
                          onClick={() => toggleShopStatus(shop.id, shop.is_active)}
                          className={`w-3 h-3 rounded-full transition-all ${shop.is_active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`}
                      ></button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-4">
                      <button 
                        onClick={() => handleImpersonate(shop.id)}
                        className="col-span-2 flex items-center justify-center gap-2 py-3 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-sm border border-indigo-100 hover:bg-indigo-100 active:scale-95 transition-all shadow-sm"
                      >
                          <LogIn size={18} /> เข้าสู่ระบบร้านค้า
                      </button>
                      <button 
                          onClick={() => openEditModal(shop)} 
                          className="flex items-center justify-center gap-2 py-2.5 bg-white text-slate-600 rounded-xl font-bold text-xs border border-slate-200 active:bg-slate-50"
                      >
                          <Eraser size={14} /> แก้ไขร้าน
                      </button>
                      <button onClick={() => openAdminListModal(shop)} className="flex items-center justify-center gap-2 py-2.5 bg-white text-slate-600 rounded-xl font-bold text-xs border border-slate-200 active:bg-slate-50"><Users size={14} /> ดู Admin</button>
                      <button onClick={() => openAddAdminModal(shop)} className="col-span-2 flex items-center justify-center gap-2 py-2.5 bg-white text-green-600 rounded-xl font-bold text-xs border border-green-200 active:bg-green-50"><UserPlus size={14} /> เพิ่ม Admin ใหม่</button>
                  </div>

                  <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                      <span className="text-[10px] text-red-300 font-bold uppercase flex items-center gap-1"><AlertTriangle size={12}/> Danger Zone</span>
                      <button onClick={() => handleCleanupShop(shop.id, shop.name)} className="flex items-center gap-1 text-red-500 text-xs font-bold hover:text-red-700 bg-red-50 border border-red-100 px-3 py-1.5 rounded-lg active:scale-95 transition-transform"><Trash2 size={14} /> ล้างข้อมูล</button>
                  </div>
              </div>
          ))}
      </div>

      {/* --- Modal 1: สร้าง/แก้ไขร้าน --- */}
      {showShopModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-linear-to-r from-slate-800 to-slate-900 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
                <h3 className="text-xl font-bold flex items-center gap-2 relative z-10">
                    <Building2 size={24} className="text-amber-400"/> 
                    {isEditMode ? 'แก้ไขข้อมูลร้านค้า' : 'สร้างร้านค้าใหม่'}
                </h3>
                <p className="text-slate-400 text-xs mt-1 relative z-10 font-medium pl-8">
                    {isEditMode ? 'อัปเดตข้อมูลและ Subdomain' : 'Step 1: กำหนดข้อมูลพื้นฐาน'}
                </p>
                
                <button onClick={() => setShowShopModal(false)} className="absolute top-4 right-4 text-white/50 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors z-20">
                    <X size={20}/>
                </button>
            </div>
            
            <form onSubmit={handleSaveShop} className="p-6 space-y-5">
              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">ชื่อร้าน</label>
                  <input 
                    placeholder="เช่น ร้านเฮงเฮง พาเพลิน" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:border-amber-400 focus:ring-4 focus:ring-amber-100 outline-none transition-all font-bold text-slate-800 placeholder-slate-300"
                    value={newShop.name} onChange={e => setNewShop({...newShop, name: e.target.value})} required
                  />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">รหัสร้าน (Code)</label>
                      <input 
                        placeholder="HENG01" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 uppercase font-mono text-sm focus:bg-white focus:border-amber-400 focus:ring-4 focus:ring-amber-100 outline-none transition-all placeholder-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        value={newShop.code} 
                        onChange={e => setNewShop({...newShop, code: e.target.value})} 
                        required
                        disabled={isEditMode}
                      />
                  </div>
                  
                  <div>
                      <label className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Globe size={12}/> Subdomain
                      </label>
                      <input 
                        placeholder="heng168" 
                        className="w-full bg-blue-50 border border-blue-200 rounded-xl p-3 font-mono text-sm text-blue-800 focus:ring-4 focus:ring-blue-100 outline-none transition-all placeholder-blue-300"
                        value={newShop.subdomain} 
                        onChange={e => setNewShop({...newShop, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
                      />
                  </div>

                <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Logo URL (ลิงก์รูปภาพ)
                    </label>
                    <div className="flex gap-3 items-center">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                            {newShop.logo_url ? (
                                <img src={newShop.logo_url} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-[10px] text-slate-400 font-bold">No Img</span>
                            )}
                        </div>
                        <input 
                            placeholder="https://.../logo.png" 
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:bg-white focus:border-amber-400 focus:ring-4 focus:ring-amber-100 outline-none transition-all placeholder-slate-300"
                            value={newShop.logo_url} 
                            onChange={e => setNewShop({...newShop, logo_url: e.target.value})}
                        />
                    </div>
                </div>
              </div>
              
              <div className="pt-2">
                <button type="submit" disabled={isSubmitting} className="w-full py-3.5 bg-slate-800 text-white rounded-xl font-bold hover:bg-black shadow-lg shadow-slate-300 hover:shadow-xl hover:-translate-y-0.5 transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <span>{isEditMode ? 'บันทึกการแก้ไข' : 'ยืนยันและไปต่อ'}</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Modal 2: สร้าง Admin --- */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-linear-to-r from-amber-400 to-orange-500 text-white relative overflow-hidden">
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/20 rounded-full blur-2xl -ml-6 -mb-6"></div>
                <h3 className="text-xl font-black flex items-center gap-2 relative z-10">
                    <UserPlus size={24} /> เพิ่มผู้ดูแลร้าน
                </h3>
                <p className="text-amber-50 text-xs mt-1 relative z-10 font-medium pl-8">
                    สำหรับร้าน: <span className="bg-white/20 px-2 py-0.5 rounded text-white font-bold">{selectedShopName}</span>
                </p>
                <button onClick={() => setShowAdminModal(false)} className="absolute top-4 right-4 text-white/60 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors z-20">
                    <X size={20}/>
                </button>
            </div>
            <form onSubmit={handleCreateAdmin} className="p-6 space-y-5 bg-white">
              <div className="space-y-1.5">
                 <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Username</label>
                 <input 
                    type="text"
                    placeholder="เช่น admin_heng" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:bg-white focus:border-amber-400 focus:ring-4 focus:ring-amber-100 outline-none font-bold placeholder-slate-300 transition-all"
                    value={newAdmin.username} onChange={e => setNewAdmin({...newAdmin, username: e.target.value})} required
                 />
              </div>
              <div className="space-y-1.5">
                 <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Password</label>
                 <input 
                    type="password"
                    placeholder="ตั้งรหัสผ่าน" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:bg-white focus:border-amber-400 focus:ring-4 focus:ring-amber-100 outline-none font-bold placeholder-slate-300 transition-all"
                    value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} required
                 />
              </div>
              <div className="space-y-1.5">
                 <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">ชื่อ-นามสกุล (Optional)</label>
                 <input 
                    type="text"
                    placeholder="เช่น เสี่ยเฮง (เจ้าของร้าน)" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:bg-white focus:border-amber-400 focus:ring-4 focus:ring-amber-100 outline-none font-medium placeholder-slate-300 transition-all"
                    value={newAdmin.full_name} onChange={e => setNewAdmin({...newAdmin, full_name: e.target.value})}
                 />
              </div>
              
              <div className="pt-2">
                <button type="submit" disabled={isSubmitting} className="w-full py-3.5 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg shadow-green-200 hover:shadow-xl hover:-translate-y-0.5 transition-all flex justify-center items-center gap-2">
                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle size={20}/> ยืนยันข้อมูล</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Modal 3: รายชื่อ Admin --- */}
      {showAdminListModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white z-10 relative shadow-sm">
                <div>
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><ShieldCheck className="text-blue-500" size={22}/> ผู้ดูแลร้าน</h3>
                    <p className="text-slate-500 text-xs font-medium pl-8">ร้าน: <span className="text-blue-600 font-bold">{selectedShopName}</span></p>
                </div>
                <button onClick={() => setShowAdminListModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                    <X size={20} />
                </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 custom-scrollbar bg-slate-50">
                {shopAdmins.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
                        <UserPlus size={40} className="mb-2 opacity-20" />
                        <span>ยังไม่มีผู้ดูแล</span>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {shopAdmins.map((admin) => (
                            <div key={admin.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors">
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
            
            <div className="p-4 border-t border-slate-100 bg-white text-center z-10 relative">
                <button 
                    onClick={() => { setShowAdminListModal(false); setShowAdminModal(true); }}
                    className="w-full py-3 bg-white border-2 border-dashed border-slate-300 text-slate-500 font-bold rounded-xl hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50 transition-all flex items-center justify-center gap-2"
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