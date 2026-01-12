import { useEffect, useState } from 'react';
import client from '../../api/client';
import { 
  User, Search, Plus, Wallet, SearchX, 
  CheckCircle, XCircle, KeyRound, Save, Loader2 
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ManageMembers() {
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null); // ใช้ร่วมกันทั้ง เติมเงิน และ รีเซ็ต
  
  // Forms State
  const [newMember, setNewMember] = useState({ username: '', password: '', full_name: '' });
  const [creditForm, setCreditForm] = useState({ amount: '', note: '' });
  const [resetForm, setResetForm] = useState({ username: '', password: '' }); // [ใหม่] Form รีเซ็ต

  // Mode Control (CREDIT หรือ RESET)
  const [modalMode, setModalMode] = useState<'CREDIT' | 'RESET' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const res = await client.get('/users/members');
      setMembers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await client.post('/users/members', newMember);
      toast.success('สร้างสมาชิกสำเร็จ');
      setShowCreateModal(false);
      setNewMember({ username: '', password: '', full_name: '' });
      fetchMembers();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'สร้างไม่สำเร็จ');
    }
  };

  const handleCreditAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !creditForm.amount) return;
    
    setIsSubmitting(true);
    try {
      await client.post(`/users/members/${selectedUser.id}/credit`, {
        amount: Number(creditForm.amount),
        note: creditForm.note
      });
      toast.success('ปรับยอดเครดิตเรียบร้อย');
      setModalMode(null);
      setSelectedUser(null);
      setCreditForm({ amount: '', note: '' });
      fetchMembers();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'เกิดข้อผิดพลาด');
    } finally {
      setIsSubmitting(false);
    }
  };

  // [ใหม่] ฟังก์ชันรีเซ็ต Username/Password
  const handleResetCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    // ต้องกรอกอย่างน้อย 1 อย่าง
    if (!resetForm.username && !resetForm.password) return toast.error('กรุณาระบุข้อมูลที่จะแก้ไข');
    
    if (!confirm(`ยืนยันการแก้ไขข้อมูลของ ${selectedUser.username}?`)) return;

    setIsSubmitting(true);
    try {
        // ใช้ API update_member_by_admin ที่มีอยู่แล้วใน users.py
        await client.put(`/users/members/${selectedUser.id}`, resetForm);
        
        toast.success('แก้ไขข้อมูลเข้าสู่ระบบสำเร็จ');
        setModalMode(null);
        setSelectedUser(null);
        setResetForm({ username: '', password: '' });
        fetchMembers(); // รีโหลดข้อมูลใหม่
    } catch(err: any) {
        toast.error(err.response?.data?.detail || 'แก้ไขไม่สำเร็จ');
    } finally {
        setIsSubmitting(false);
    }
  };

  // เปิด Modal รีเซ็ต
  const openResetModal = (user: any) => {
      setSelectedUser(user);
      setResetForm({ username: user.username, password: '' }); // ดึง username เดิมมาแสดง
      setModalMode('RESET');
  };

  // เปิด Modal เติมเงิน
  const openCreditModal = (user: any) => {
      setSelectedUser(user);
      setCreditForm({ amount: '', note: '' });
      setModalMode('CREDIT');
  }

  const filteredMembers = members.filter(m => 
    m.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.full_name && m.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="animate-fade-in p-4 md:p-6 pb-24 md:pb-8">
      
      {/* --- Header Section --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
           <h2 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2 tracking-tight">
              <div className="p-2 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-200">
                  <User size={24} />
              </div>
              สมาชิกในร้าน <span className="text-sm font-normal text-slate-400 bg-white px-2 py-1 rounded-full border hidden sm:inline-block">Total: {members.length}</span>
           </h2>
           <p className="text-sm text-slate-500 mt-1 ml-1">จัดการบัญชีลูกค้าและเติมเงินเครดิต</p>
        </div>
        
        <div className="flex flex-col sm:flex-row w-full md:w-auto gap-2">
            <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="ค้นหาชื่อ หรือ ยูเซอร์..." 
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <button 
                onClick={() => setShowCreateModal(true)}
                className="bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold shadow-lg hover:bg-black flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
                <Plus size={20} /> <span className="whitespace-nowrap">เพิ่มสมาชิก</span>
            </button>
        </div>
      </div>

      {/* --- Desktop Table View --- */}
      <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <th className="p-4 w-16 text-center">#</th>
                    <th className="p-4">ข้อมูลสมาชิก</th>
                    <th className="p-4 text-center">สถานะ</th>
                    <th className="p-4 text-right">เครดิตคงเหลือ</th>
                    <th className="p-4 text-center">จัดการ</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading ? (
                    <tr><td colSpan={5} className="p-12 text-center text-slate-400"><Loader2 className="animate-spin mx-auto"/></td></tr>
                ) : filteredMembers.length === 0 ? (
                    <tr>
                        <td colSpan={5} className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
                            <SearchX size={40} className="mb-2 opacity-20" />
                            ไม่พบรายชื่อสมาชิก
                        </td>
                    </tr>
                ) : (
                    filteredMembers.map((m, index) => (
                        <tr key={m.id} className="hover:bg-blue-50/30 transition-colors group">
                            <td className="p-4 text-center text-slate-400 font-mono">{index + 1}</td>
                            <td className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-lg border border-slate-200">
                                        {m.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800 text-base">{m.username}</div>
                                        <div className="text-slate-500 text-xs">{m.full_name || 'ไม่ระบุชื่อ'}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="p-4 text-center">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                                    m.is_active 
                                    ? 'bg-green-50 text-green-700 border-green-200' 
                                    : 'bg-red-50 text-red-700 border-red-200'
                                }`}>
                                    {m.is_active ? <CheckCircle size={12}/> : <XCircle size={12}/>}
                                    {m.is_active ? 'Active' : 'Banned'}
                                </span>
                            </td>
                            <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-1">
                                    <span className={`font-mono font-bold text-base ${Number(m.credit_balance) > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                                        {Number(m.credit_balance).toLocaleString()}
                                    </span>
                                    <span className="text-xs text-slate-400 font-medium">฿</span>
                                </div>
                            </td>
                            <td className="p-4 text-center">
                                <div className="flex justify-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                    {/* ปุ่มเติมเงิน */}
                                    <button 
                                        onClick={() => openCreditModal(m)}
                                        className="text-slate-400 hover:text-blue-600 bg-white border border-slate-200 hover:border-blue-300 p-2 rounded-lg transition-all shadow-sm active:scale-95"
                                        title="จัดการเครดิต"
                                    >
                                        <Wallet size={18} />
                                    </button>
                                    
                                    {/* [ใหม่] ปุ่มรีเซ็ต */}
                                    <button 
                                        onClick={() => openResetModal(m)}
                                        className="text-slate-400 hover:text-amber-600 bg-white border border-slate-200 hover:border-amber-300 p-2 rounded-lg transition-all shadow-sm active:scale-95"
                                        title="รีเซ็ต User/Pass"
                                    >
                                        <KeyRound size={18} />
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
              <div key={m.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 relative overflow-hidden">
                  <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xl shadow-inner">
                              {m.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                              <h3 className="font-bold text-lg text-slate-800">{m.username}</h3>
                              <p className="text-xs text-slate-500">{m.full_name || 'Member'}</p>
                          </div>
                      </div>
                      <span className={`w-3 h-3 rounded-full ${m.is_active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`}></span>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 flex justify-between items-center mb-3 border border-slate-100">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Credit Balance</span>
                      <div className="flex items-baseline gap-1">
                          <span className={`text-xl font-bold font-mono ${Number(m.credit_balance) > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                              {Number(m.credit_balance).toLocaleString()}
                          </span>
                          <span className="text-xs text-slate-400 font-bold">฿</span>
                      </div>
                  </div>

                  <div className="flex gap-2">
                      <button 
                          onClick={() => openCreditModal(m)}
                          className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                          <Wallet size={18} /> เติมเครดิต
                      </button>
                      <button 
                          onClick={() => openResetModal(m)}
                          className="px-4 py-2.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-xl font-bold text-sm hover:bg-amber-100 active:scale-95 transition-all flex items-center justify-center"
                      >
                          <KeyRound size={18} />
                      </button>
                  </div>
              </div>
          ))}
      </div>

      {/* --- Modal สร้างสมาชิก --- */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><User size={20} className="text-blue-600"/> เพิ่มสมาชิกใหม่</h3>
                    <button onClick={() => setShowCreateModal(false)} className="bg-white p-1 rounded-full text-slate-400 hover:text-red-500 border border-slate-200 transition-colors">
                        <Plus className="rotate-45" size={20} />
                    </button>
                </div>
                <form onSubmit={handleCreateMember} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Username</label>
                        <input 
                            type="text" required 
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-bold text-slate-800"
                            placeholder="ตั้งชื่อผู้ใช้..."
                            value={newMember.username}
                            onChange={e => setNewMember({...newMember, username: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Password</label>
                        <input 
                            type="password" required 
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                            placeholder="ตั้งรหัสผ่าน..."
                            value={newMember.password}
                            onChange={e => setNewMember({...newMember, password: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
                        <input 
                            type="text"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                            placeholder="ชื่อเล่น หรือ ชื่อจริง (ถ้ามี)"
                            value={newMember.full_name}
                            onChange={e => setNewMember({...newMember, full_name: e.target.value})}
                        />
                    </div>
                    <button type="submit" className="w-full bg-slate-800 text-white py-3.5 rounded-xl font-bold hover:bg-black shadow-lg shadow-slate-300 transition-all active:scale-95 mt-2">
                        ยืนยันการสร้าง
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* --- Modal เติมเครดิต --- */}
      {modalMode === 'CREDIT' && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800">จัดการเครดิต</h3>
                        <p className="text-xs text-slate-500 font-medium">Member: <span className="text-blue-600">{selectedUser.username}</span></p>
                    </div>
                    <button onClick={() => setModalMode(null)} className="bg-white p-1 rounded-full text-slate-400 hover:text-red-500 border border-slate-200 transition-colors">
                        <Plus className="rotate-45" size={20} />
                    </button>
                </div>
                
                <form onSubmit={handleCreditAdjust} className="p-6 space-y-5">
                    <div className="bg-linear-to-r from-blue-50 to-indigo-50 p-4 rounded-2xl border border-blue-100 flex justify-between items-center shadow-inner">
                        <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">ยอดเงินปัจจุบัน</span>
                        <span className="text-3xl font-black text-blue-600 tracking-tight">{Number(selectedUser.credit_balance).toLocaleString()}</span>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">ระบุจำนวนเงิน</label>
                        <div className="relative">
                            <input 
                                type="number" required autoFocus
                                className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 pl-12 focus:border-green-500 focus:ring-4 focus:ring-green-100 outline-none font-bold text-2xl text-slate-800 transition-all placeholder-slate-300"
                                placeholder="0.00"
                                value={creditForm.amount}
                                onChange={e => setCreditForm({...creditForm, amount: e.target.value})}
                            />
                            <div className="absolute left-4 top-4 text-slate-400 pointer-events-none">
                                <Wallet size={24} />
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1.5 ml-1 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> ใส่จำนวนบวก (+) เพื่อเติม
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 ml-2"></span> ใส่ติดลบ (-) เพื่อถอน
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">หมายเหตุ (Optional)</label>
                        <input 
                            type="text"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:border-blue-500 outline-none transition-all text-sm"
                            placeholder="เช่น โอนเงินสด, ถอนกำไร"
                            value={creditForm.note}
                            onChange={e => setCreditForm({...creditForm, note: e.target.value})}
                        />
                    </div>

                    <button type="submit" disabled={isSubmitting} className="w-full bg-green-600 text-white py-3.5 rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-200 transition-all flex justify-center gap-2 items-center active:scale-95 disabled:opacity-70">
                        {isSubmitting ? <Loader2 className="animate-spin" /> : <Save size={20} />} ยืนยันทำรายการ
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* --- [ใหม่] Modal Reset Credentials --- */}
      {modalMode === 'RESET' && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                            <KeyRound size={20} className="text-amber-500"/> แก้ไขข้อมูลเข้าสู่ระบบ
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">Member: <span className="text-amber-600">{selectedUser.username}</span></p>
                    </div>
                    <button onClick={() => setModalMode(null)} className="bg-white p-1 rounded-full text-slate-400 hover:text-red-500 border border-slate-200 transition-colors">
                        <Plus className="rotate-45" size={20} />
                    </button>
                </div>
                
                <form onSubmit={handleResetCredentials} className="p-6 space-y-5">
                    <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 text-xs text-amber-800 flex items-start gap-2">
                        <span className="text-xl">💡</span>
                        <div>
                            กรอกเฉพาะช่องที่ต้องการเปลี่ยน หากไม่ต้องการเปลี่ยนให้เว้นว่างไว้
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Username (ไอดีใหม่)</label>
                        <input 
                            type="text"
                            className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:border-amber-500 focus:ring-4 focus:ring-amber-100 outline-none transition-all font-bold text-slate-800"
                            placeholder="เว้นว่างถ้าไม่เปลี่ยน"
                            value={resetForm.username}
                            onChange={e => setResetForm({...resetForm, username: e.target.value})}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Password (รหัสผ่านใหม่)</label>
                        <input 
                            type="text" // ใช้ type text ให้แอดมินเห็นตัวเลขชัดๆ
                            className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:border-amber-500 focus:ring-4 focus:ring-amber-100 outline-none transition-all font-mono text-slate-800"
                            placeholder="เว้นว่างถ้าไม่เปลี่ยน"
                            value={resetForm.password}
                            onChange={e => setResetForm({...resetForm, password: e.target.value})}
                        />
                    </div>

                    <button type="submit" disabled={isSubmitting} className="w-full bg-amber-500 text-white py-3.5 rounded-xl font-bold hover:bg-amber-600 shadow-lg shadow-amber-200 transition-all flex justify-center gap-2 items-center active:scale-95 disabled:opacity-70">
                        {isSubmitting ? <Loader2 className="animate-spin" /> : <Save size={20} />} บันทึกการแก้ไข
                    </button>
                </form>
            </div>
        </div>
      )}

    </div>
  );
}