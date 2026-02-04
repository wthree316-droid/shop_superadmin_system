import { useEffect, useState, useMemo } from 'react';
import client from '../../api/client';
import { 
  User, Search, Plus, Wallet, SearchX, 
  CheckCircle, KeyRound, Save, Loader2,
  AlertTriangle, TrendingUp, Users, ShieldCheck,
  ArrowRightLeft
} from 'lucide-react';
import toast from 'react-hot-toast';
import { confirmAction, alertAction } from '../../utils/toastUtils';

export default function ManageMembers() {
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  
  // Forms State
  const [newMember, setNewMember] = useState({ username: '', password: '', full_name: '' });
  const [creditForm, setCreditForm] = useState({ amount: '', note: '' });
  const [resetForm, setResetForm] = useState({ username: '', password: '' });

  // Mode Control
  const [modalMode, setModalMode] = useState<'CREDIT' | 'RESET' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const res = await client.get('/users/members');
      // เรียงลำดับตามวันที่สร้างล่าสุดก่อน (ถ้ามี created_at) หรือ username
      const sorted = (res.data || []).sort((a: any, b: any) => 
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
      setMembers(sorted);
    } catch (err) {
      console.error(err);
      toast.error("โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await client.post('/users/members', newMember);
      alertAction('สร้างสมาชิกใหม่เรียบร้อยแล้ว', 'สำเร็จ', 'success');
      setShowCreateModal(false);
      setNewMember({ username: '', password: '', full_name: '' });
      fetchMembers();
    } catch (err: any) {
      alertAction(err.response?.data?.detail || 'สร้างไม่สำเร็จ', 'ข้อผิดพลาด', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreditAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !creditForm.amount) return;
    
    const amountVal = Number(creditForm.amount);
    const actionType = amountVal >= 0 ? 'เติมเงิน' : 'ถอนเงิน';
    const displayAmount = Math.abs(amountVal).toLocaleString();

    confirmAction(
        `ยืนยันการ ${actionType} จำนวน ${displayAmount} บาท?`, 
        async () => {
            setIsSubmitting(true);
            try {
              await client.post(`/users/members/${selectedUser.id}/credit`, {
                amount: amountVal,
                note: creditForm.note
              });
              alertAction(
                  `ทำรายการสำเร็จ! ${actionType}เรียบร้อย`, 
                  'สำเร็จ', 
                  'success'
              );
              setModalMode(null);
              setSelectedUser(null);
              setCreditForm({ amount: '', note: '' });
              fetchMembers();
            } catch (err: any) {
              alertAction(err.response?.data?.detail || 'เกิดข้อผิดพลาด', 'ข้อผิดพลาด', 'error');
            } finally {
              setIsSubmitting(false);
            }
        }, 
        'ยืนยันทำรายการ', 
        'ยกเลิก'
    );
  };

  const handleResetCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetForm.username && !resetForm.password) return toast.error('กรุณาระบุข้อมูลที่จะแก้ไข');
    
    confirmAction(
        `ยืนยันการแก้ไขข้อมูลของ ${selectedUser.username}?`,
        async () => {
            setIsSubmitting(true);
            try {
                await client.put(`/users/members/${selectedUser.id}`, resetForm);
                alertAction('อัปเดตข้อมูลเข้าสู่ระบบสำเร็จ', 'สำเร็จ', 'success');
                setModalMode(null);
                setSelectedUser(null);
                setResetForm({ username: '', password: '' });
                fetchMembers(); 
            } catch(err: any) {
                alertAction(err.response?.data?.detail || 'แก้ไขไม่สำเร็จ', 'ข้อผิดพลาด', 'error');
            } finally {
                setIsSubmitting(false);
            }
        },
        'บันทึกการเปลี่ยนแปลง',
        'ยกเลิก'
    );
  };

  const openResetModal = (user: any) => {
      setSelectedUser(user);
      setResetForm({ username: user.username, password: '' });
      setModalMode('RESET');
  };

  const openCreditModal = (user: any) => {
      setSelectedUser(user);
      setCreditForm({ amount: '', note: '' });
      setModalMode('CREDIT');
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    // Optimistic Update
    setMembers(prev => prev.map(m => m.id === id ? { ...m, is_active: !currentStatus } : m));
    try {
       await client.patch(`/users/${id}/toggle-status`); 
       toast.success(currentStatus ? 'ระงับการใช้งานแล้ว' : 'เปิดใช้งานสมาชิกแล้ว');
    } catch (err) {
       toast.error('เปลี่ยนสถานะไม่สำเร็จ');
       fetchMembers(); // Revert if failed
    }
  };

  const filteredMembers = members.filter(m => 
    m.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.full_name && m.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Stats Calculation
  const stats = useMemo(() => {
      const total = members.length;
      const active = members.filter(m => m.is_active).length;
      const totalCredit = members.reduce((sum, m) => sum + Number(m.credit_balance || 0), 0);
      return { total, active, totalCredit };
  }, [members]);

  return (
    <div className="animate-fade-in p-4 md:p-8 max-w-7xl mx-auto min-h-screen font-sans bg-slate-50/50">
      
      {/* --- Header Section --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6">
        <div>
           <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">จัดการสมาชิก</h1>
           <p className="text-slate-500 font-medium">ดูแลบัญชีผู้ใช้งาน ตรวจสอบสถานะ และจัดการเครดิต</p>
        </div>
        
        <button 
            onClick={() => setShowCreateModal(true)}
            className="group bg-slate-900 text-white px-5 py-3 rounded-2xl font-bold shadow-lg shadow-slate-200 hover:shadow-xl hover:bg-black hover:-translate-y-0.5 transition-all flex items-center gap-2.5 active:scale-95"
        >
            <div className="bg-white/20 p-1.5 rounded-lg group-hover:rotate-90 transition-transform duration-500">
                <Plus size={18} />
            </div>
            <span>เพิ่มสมาชิกใหม่</span>
        </button>
      </div>

      {/* --- Stats Cards --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Users size={24} />
              </div>
              <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">สมาชิกทั้งหมด</div>
                  <div className="text-2xl font-black text-slate-800">{stats.total} <span className="text-sm font-medium text-slate-400">คน</span></div>
              </div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ShieldCheck size={24} />
              </div>
              <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">ใช้งานปกติ</div>
                  <div className="text-2xl font-black text-slate-800">{stats.active} <span className="text-sm font-medium text-slate-400">คน</span></div>
              </div>
          </div>
      </div>

      {/* --- Search Bar --- */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 mb-6 flex items-center focus-within:ring-4 focus-within:ring-blue-50 focus-within:border-blue-200 transition-all max-w-2xl">
          <div className="pl-4 text-slate-400"><Search size={20}/></div>
          <input 
            type="text" 
            placeholder="ค้นหา Username หรือ ชื่อสมาชิก..." 
            className="w-full px-4 py-2.5 bg-transparent outline-none font-bold text-slate-700 placeholder:font-medium placeholder-slate-300"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl mr-1 transition-colors">
                  <SearchX size={18}/>
              </button>
          )}
      </div>

      {/* --- Desktop Table View --- */}
      <div className="hidden md:block bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                    <th className="p-5 w-20 text-center">#</th>
                    <th className="p-5">ข้อมูลสมาชิก</th>
                    <th className="p-5 text-center">สถานะ</th>
                    <th className="p-5 text-right">เครดิต (บาท)</th>
                    <th className="p-5 text-center">จัดการ</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading ? (
                    <tr><td colSpan={5} className="p-16 text-center text-slate-400"><Loader2 className="animate-spin mx-auto mb-2 text-blue-500"/> กำลังโหลดข้อมูล...</td></tr>
                ) : filteredMembers.length === 0 ? (
                    <tr>
                        <td colSpan={5} className="p-16 text-center text-slate-400 flex flex-col items-center justify-center">
                            <div className="bg-slate-50 p-4 rounded-full mb-3"><SearchX size={32} className="opacity-20" /></div>
                            <span className="font-medium">ไม่พบรายชื่อสมาชิก</span>
                        </td>
                    </tr>
                ) : (
                    filteredMembers.map((m, index) => (
                        <tr key={m.id} className="hover:bg-blue-50/30 transition-colors group">
                            <td className="p-5 text-center text-slate-300 font-mono font-bold">{index + 1}</td>
                            <td className="p-5">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 flex items-center justify-center font-black text-lg shadow-inner border border-white">
                                        {m.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800 text-base group-hover:text-blue-600 transition-colors">{m.username}</div>
                                        <div className="text-slate-400 text-xs font-medium">{m.full_name || '-'}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="p-5 text-center">
                                <button 
                                    onClick={() => handleToggleStatus(m.id, m.is_active)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                                        m.is_active ? 'bg-emerald-500' : 'bg-slate-200'
                                    }`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                                        m.is_active ? 'translate-x-6' : 'translate-x-1'
                                    }`} />
                                </button>
                                <div className="text-[10px] font-bold mt-1 text-slate-400 uppercase">{m.is_active ? 'Active' : 'Banned'}</div>
                            </td>
                            <td className="p-5 text-right">
                                <div className="font-mono font-bold text-lg text-slate-700 group-hover:text-blue-600 transition-colors">
                                    {Number(m.credit_balance).toLocaleString()}
                                </div>
                            </td>
                            <td className="p-5 text-center">
                                <div className="flex justify-center gap-2">
                                    <button 
                                        onClick={() => openCreditModal(m)}
                                        className="bg-white text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 p-2.5 rounded-xl transition-all shadow-sm active:scale-95 group/btn"
                                        title="เติม/ถอน เครดิต"
                                    >
                                        <ArrowRightLeft size={18} className="group-hover/btn:scale-110 transition-transform"/>
                                    </button>
                                    
                                    <button 
                                        onClick={() => openResetModal(m)}
                                        className="bg-white text-slate-400 hover:text-amber-600 hover:bg-amber-50 border border-slate-200 hover:border-amber-200 p-2.5 rounded-xl transition-all shadow-sm active:scale-95 group/btn"
                                        title="แก้ไขข้อมูลเข้าสู่ระบบ"
                                    >
                                        <KeyRound size={18} className="group-hover/btn:scale-110 transition-transform"/>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))
                )}
            </tbody>
        </table>
      </div>

      {/* --- Mobile Card View --- */}
      <div className="md:hidden space-y-4">
          {isLoading && <div className="text-center py-10 text-slate-400"><Loader2 className="animate-spin mx-auto"/></div>}
          
          {filteredMembers.map((m) => (
              <div key={m.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 relative overflow-hidden active:scale-[0.99] transition-transform">
                  <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 flex items-center justify-center font-black text-xl shadow-inner border border-white">
                              {m.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                              <h3 className="font-black text-lg text-slate-800">{m.username}</h3>
                              <p className="text-xs text-slate-500 font-medium">{m.full_name || 'Member'}</p>
                          </div>
                      </div>
                      <button 
                          onClick={() => handleToggleStatus(m.id, m.is_active)}
                          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              m.is_active 
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                              : 'bg-red-50 text-red-600 border-red-100'
                          }`}
                      >
                         {m.is_active ? 'Active' : 'Banned'}
                      </button>
                  </div>

                  <div className="bg-slate-50/50 rounded-2xl p-4 flex justify-between items-center mb-4 border border-slate-100">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                          <Wallet size={14}/> เครดิต
                      </span>
                      <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black font-mono text-slate-800">
                              {Number(m.credit_balance).toLocaleString()}
                          </span>
                          <span className="text-xs text-slate-400 font-bold">฿</span>
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                      <button 
                          onClick={() => openCreditModal(m)}
                          className="py-3 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                          <ArrowRightLeft size={18} /> จัดการเครดิต
                      </button>
                      <button 
                          onClick={() => openResetModal(m)}
                          className="py-3 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold text-sm hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                          <KeyRound size={18} /> แก้ไขข้อมูล
                      </button>
                  </div>
              </div>
          ))}
      </div>

      {/* --- Modal สร้างสมาชิก --- */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 ring-1 ring-white/20">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white/50 backdrop-blur-xl">
                    <h3 className="font-black text-xl text-slate-800 flex items-center gap-2"><User size={24} className="text-slate-900"/> เพิ่มสมาชิกใหม่</h3>
                    <button onClick={() => setShowCreateModal(false)} className="bg-slate-100 p-2 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-colors">
                        <SearchX size={20} />
                    </button>
                </div>
                <form onSubmit={handleCreateMember} className="p-6 space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Username</label>
                        <input 
                            type="text" required 
                            className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl p-3.5 outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300 placeholder:font-medium"
                            placeholder="ตั้งชื่อผู้ใช้..."
                            value={newMember.username}
                            onChange={e => setNewMember({...newMember, username: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Password</label>
                        <input 
                            type="password" required 
                            className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl p-3.5 outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300 placeholder:font-medium"
                            placeholder="ตั้งรหัสผ่าน..."
                            value={newMember.password}
                            onChange={e => setNewMember({...newMember, password: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Full Name</label>
                        <input 
                            type="text"
                            className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl p-3.5 outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300 placeholder:font-medium"
                            placeholder="ชื่อเล่น หรือ ชื่อจริง (Optional)"
                            value={newMember.full_name}
                            onChange={e => setNewMember({...newMember, full_name: e.target.value})}
                        />
                    </div>
                    <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-black shadow-lg shadow-slate-300 transition-all active:scale-95 mt-4 flex justify-center items-center gap-2 text-lg">
                        {isSubmitting ? <Loader2 className="animate-spin" size={24}/> : "ยืนยันการสร้าง"}
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* --- Modal เติมเครดิต --- */}
      {modalMode === 'CREDIT' && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 pb-0 flex justify-between items-start">
                    <div>
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                            <Wallet size={24} />
                        </div>
                        <h3 className="font-black text-2xl text-slate-800">จัดการเครดิต</h3>
                        <p className="text-sm text-slate-500 font-medium mt-1">ให้สมาชิก: <span className="text-blue-600 font-bold">{selectedUser.username}</span></p>
                    </div>
                    <button onClick={() => setModalMode(null)} className="bg-slate-50 p-2 rounded-full text-slate-400 hover:text-slate-800 transition-colors">
                        <SearchX size={20} />
                    </button>
                </div>
                
                <form onSubmit={handleCreditAdjust} className="p-6 pt-4 space-y-6">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">คงเหลือปัจจุบัน</span>
                        <span className="text-2xl font-black text-slate-700 tracking-tight">{Number(selectedUser.credit_balance).toLocaleString()}</span>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">ระบุจำนวนเงิน</label>
                        <div className="relative group">
                            <input 
                                type="number" required autoFocus
                                className={`w-full bg-white border-2 rounded-2xl p-4 pl-4 pr-12 outline-none font-bold text-3xl text-center transition-all placeholder-slate-200 ${
                                    Number(creditForm.amount) > 0 ? 'border-emerald-400 text-emerald-600 ring-4 ring-emerald-50' : 
                                    Number(creditForm.amount) < 0 ? 'border-red-400 text-red-600 ring-4 ring-red-50' : 
                                    'border-slate-200 text-slate-800 focus:border-blue-400 focus:ring-4 focus:ring-blue-50'
                                }`}
                                placeholder="0"
                                value={creditForm.amount}
                                onChange={e => setCreditForm({...creditForm, amount: e.target.value})}
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                {Number(creditForm.amount) > 0 ? <TrendingUp size={24} className="text-emerald-500"/> : 
                                 Number(creditForm.amount) < 0 ? <TrendingUp size={24} className="text-red-500 rotate-180"/> : 
                                 <span className="text-slate-300 font-bold text-xl">฿</span>}
                            </div>
                        </div>
                        
                        {/* Visual Helper */}
                        <div className="flex gap-2 mt-3">
                            <div className={`flex-1 p-2 rounded-xl border text-[10px] font-bold uppercase text-center transition-colors ${Number(creditForm.amount) > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-50 border-slate-100 text-slate-300'}`}>
                                เติมเงิน (+)
                            </div>
                            <div className={`flex-1 p-2 rounded-xl border text-[10px] font-bold uppercase text-center transition-colors ${Number(creditForm.amount) < 0 ? 'bg-red-50 border-red-200 text-red-600' : 'bg-slate-50 border-slate-100 text-slate-300'}`}>
                                ถอนเงิน (-)
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">หมายเหตุ (Optional)</label>
                        <input 
                            type="text"
                            className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-3 focus:bg-white focus:border-slate-300 outline-none transition-all text-sm font-medium text-slate-600"
                            placeholder="เช่น โอนเงินสด, ถอนกำไร"
                            value={creditForm.note}
                            onChange={e => setCreditForm({...creditForm, note: e.target.value})}
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={isSubmitting || !creditForm.amount} 
                        className={`w-full py-4 rounded-2xl font-bold shadow-lg transition-all flex justify-center gap-2 items-center active:scale-95 text-lg text-white ${
                            Number(creditForm.amount) >= 0 
                            ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200' 
                            : 'bg-red-500 hover:bg-red-600 shadow-red-200'
                        }`}
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" size={24}/> : <CheckCircle size={24} />} 
                        {Number(creditForm.amount) >= 0 ? 'ยืนยันเติมเงิน' : 'ยืนยันถอนเงิน'}
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* --- Modal Reset Credentials --- */}
      {modalMode === 'RESET' && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-amber-50/50">
                    <div>
                        <h3 className="font-black text-xl text-slate-800 flex items-center gap-2">
                            <KeyRound size={24} className="text-amber-500"/> แก้ไขรหัสผ่าน
                        </h3>
                        <p className="text-sm text-slate-500 font-medium mt-1">Member: <span className="text-amber-600 font-bold">{selectedUser.username}</span></p>
                    </div>
                    <button onClick={() => setModalMode(null)} className="bg-white p-2 rounded-full text-slate-400 hover:text-slate-800 transition-colors shadow-sm">
                        <SearchX size={20} />
                    </button>
                </div>
                
                <form onSubmit={handleResetCredentials} className="p-6 space-y-5">
                    <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-xs text-amber-800 flex items-start gap-3 font-medium leading-relaxed">
                        <AlertTriangle size={18} className="shrink-0 mt-0.5"/>
                        <div>
                            กรอกเฉพาะช่องที่ต้องการเปลี่ยน หากไม่ต้องการเปลี่ยนช่องไหนให้เว้นว่างไว้
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Username (ไอดีใหม่)</label>
                        <input 
                            type="text"
                            className="w-full bg-white border-2 border-slate-200 rounded-2xl p-3.5 focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300"
                            placeholder="เว้นว่างถ้าไม่เปลี่ยน"
                            value={resetForm.username}
                            onChange={e => setResetForm({...resetForm, username: e.target.value})}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Password (รหัสผ่านใหม่)</label>
                        <input 
                            type="text" 
                            className="w-full bg-white border-2 border-slate-200 rounded-2xl p-3.5 focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all font-mono text-slate-800 placeholder:text-slate-300"
                            placeholder="เว้นว่างถ้าไม่เปลี่ยน"
                            value={resetForm.password}
                            onChange={e => setResetForm({...resetForm, password: e.target.value})}
                        />
                    </div>

                    <button type="submit" disabled={isSubmitting} className="w-full bg-amber-500 text-white py-4 rounded-2xl font-bold hover:bg-amber-600 shadow-lg shadow-amber-200 transition-all flex justify-center gap-2 items-center active:scale-95 disabled:opacity-70 text-lg mt-2">
                        {isSubmitting ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />} บันทึกการแก้ไข
                    </button>
                </form>
            </div>
        </div>
      )}

    </div>
  );
}