import { useState, useEffect } from 'react';
import client from '../../api/client';
import { 
  Wallet, Upload, History, 
  Copy, Loader2, Image as ImageIcon, AlertCircle,
  ArrowRightLeft, Banknote, Landmark
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

// Types
interface BankAccount {
  id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
}

interface Transaction {
  id: string;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
  admin_remark?: string;
  type: 'DEPOSIT' | 'WITHDRAW';
}

export default function WalletPage() {
  const { user, fetchMe } = useAuth();
  
  // State: Tab Switching
  const [activeTab, setActiveTab] = useState<'DEPOSIT' | 'WITHDRAW'>('DEPOSIT');

  // Data State
  const [shopBanks, setShopBanks] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true); // ✅ จะถูกนำไปใช้แสดงผลแล้ว

  // Form State (Deposit)
  const [depAmount, setDepAmount] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Form State (Withdraw)
  const [withAmount, setWithAmount] = useState('');
  const [userBankName, setUserBankName] = useState('');
  const [userAccName, setUserAccName] = useState('');
  const [userAccNum, setUserAccNum] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'DEPOSIT') {
        const [resBanks, resHistory] = await Promise.all([
          client.get('/topup/banks'),
          client.get('/topup/requests')
        ]);
        setShopBanks(resBanks.data);
        setTransactions(resHistory.data.map((t:any) => ({...t, type: 'DEPOSIT'})));
      } else {
        const resHistory = await client.get('/withdraw/requests');
        setTransactions(resHistory.data.map((t:any) => ({...t, type: 'WITHDRAW'})));
      }
    } catch (err) {
      console.error(err);
      toast.error('โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers ---

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('คัดลอกเลขบัญชีแล้ว');
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depAmount || !file) return toast.error('กรุณากรอกข้อมูลให้ครบ');
    setIsSubmitting(true);
    const toastId = toast.loading('กำลังส่งข้อมูล...');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await client.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
      const proofImage = uploadRes.data.url || uploadRes.data.filename;

      await client.post('/topup/requests', { amount: Number(depAmount), proof_image: proofImage });
      
      toast.success('แจ้งเติมเงินสำเร็จ', { id: toastId });
      setDepAmount(''); setFile(null); setPreviewUrl(null);
      fetchData();
    } catch (err) {
      toast.error('ทำรายการไม่สำเร็จ', { id: toastId });
    } finally { setIsSubmitting(false); }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withAmount || !userBankName || !userAccName || !userAccNum) return toast.error('กรุณากรอกข้อมูลให้ครบ');
    
    if (Number(withAmount) > (user?.credit_balance || 0)) {
        return toast.error('ยอดเงินคงเหลือไม่พอ');
    }

    setIsSubmitting(true);
    const toastId = toast.loading('กำลังดำเนินการ...');
    try {
      await client.post('/withdraw/requests', {
          amount: Number(withAmount),
          bank_name: userBankName,
          account_name: userAccName,
          account_number: userAccNum
      });
      
      toast.success('แจ้งถอนสำเร็จ! เครดิตถูกตัดเพื่อรอตรวจสอบ', { id: toastId });
      setWithAmount(''); 
      await fetchMe();
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'ทำรายการไม่สำเร็จ';
      toast.error(msg, { id: toastId });
    } finally { setIsSubmitting(false); }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED': return <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">สำเร็จ</span>;
      case 'REJECTED': return <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">ถูกปฏิเสธ</span>;
      default: return <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold">รอตรวจสอบ</span>;
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto pb-24 animate-fade-in font-sans">
      
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="text-blue-600" /> กระเป๋าเงิน
        </h1>
        <div className="text-right">
            <div className="text-xs text-gray-500">เครดิตคงเหลือ</div>
            <div className="text-xl font-black text-blue-600">{user?.credit_balance?.toLocaleString()} ฿</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
          <button 
            onClick={() => setActiveTab('DEPOSIT')}
            className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                activeTab === 'DEPOSIT' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
              <Banknote size={16} /> เติมเครดิต
          </button>
          <button 
            onClick={() => setActiveTab('WITHDRAW')}
            className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                activeTab === 'WITHDRAW' ? 'bg-white text-orange-500 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
              <ArrowRightLeft size={16} /> ถอนเครดิต
          </button>
      </div>

      {/* ===================== DEPOSIT TAB ===================== */}
      {activeTab === 'DEPOSIT' && (
        <div className="animate-slide-up">
            {/* Shop Bank Account */}
            <div className="bg-linear-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg mb-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet size={100} /></div>
                <h2 className="text-sm font-medium opacity-80 mb-4">โอนเงินเข้าบัญชีนี้</h2>
                
                {/* ✅ เพิ่ม Loading ตรงนี้ด้วยก็ได้ หรือจะปล่อยว่างไว้ก็ได้ */}
                {loading && shopBanks.length === 0 ? (
                   <div className="flex justify-center py-4"><Loader2 className="animate-spin text-white/50" /></div>
                ) : shopBanks.length > 0 ? shopBanks.map(bank => (
                    <div key={bank.id} className="relative z-10 mb-4 last:mb-0">
                        <div className="font-bold text-lg mb-1">{bank.bank_name}</div>
                        <div className="flex items-center justify-between bg-white/10 p-3 rounded-lg backdrop-blur-sm">
                            <div>
                                <div className="text-2xl font-mono font-bold tracking-wider">{bank.account_number}</div>
                                <div className="text-sm opacity-90">{bank.account_name}</div>
                            </div>
                            <button onClick={() => handleCopy(bank.account_number)} className="p-2 hover:bg-white/20 rounded-full"><Copy size={20} /></button>
                        </div>
                    </div>
                )) : <div className="text-center bg-white/10 p-3 rounded opacity-80">ไม่พบข้อมูลบัญชีร้าน</div>}
            </div>

            {/* Deposit Form */}
            <form onSubmit={handleDepositSubmit} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mb-8">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Upload size={18} /> แจ้งสลิปการโอน</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">จำนวนเงินที่โอน</label>
                        <input type="number" value={depAmount} onChange={e => setDepAmount(e.target.value)} placeholder="ระบุยอดเงิน" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-lg focus:outline-none focus:ring-2 focus:ring-blue-500" min="1" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">หลักฐาน (สลิป)</label>
                        <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:bg-slate-50 cursor-pointer group">
                            <input type="file" accept="image/*" onChange={(e) => {
                                if(e.target.files?.[0]) {
                                    setFile(e.target.files[0]);
                                    setPreviewUrl(URL.createObjectURL(e.target.files[0]));
                                }
                            }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                            {previewUrl ? <img src={previewUrl} className="max-h-40 mx-auto rounded shadow" /> : <div className="text-slate-400 text-sm"><ImageIcon className="mx-auto mb-1"/>แตะเพื่ออัปโหลด</div>}
                        </div>
                    </div>
                    <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg disabled:opacity-50 transition-all">
                        {isSubmitting ? <Loader2 className="animate-spin mx-auto"/> : 'ยืนยันแจ้งเติมเงิน'}
                    </button>
                </div>
            </form>
        </div>
      )}

      {/* ===================== WITHDRAW TAB ===================== */}
      {activeTab === 'WITHDRAW' && (
        <div className="animate-slide-up">
            <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl mb-6 text-sm text-orange-800 flex items-start gap-3">
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                <div>
                    <b>ข้อควรระวัง:</b> เมื่อกดยืนยัน ยอดเครดิตจะถูกหักทันทีเพื่อรอการตรวจสอบ หากถูกปฏิเสธ ยอดเงินจะคืนเข้ากระเป๋าอัตโนมัติ
                </div>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mb-8">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Landmark size={18} /> ข้อมูลบัญชีรับเงิน</h3>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-600 mb-1">ธนาคาร</label>
                            <input type="text" value={userBankName} onChange={e => setUserBankName(e.target.value)} placeholder="เช่น กสิกรไทย" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-orange-400" />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-600 mb-1">เลขบัญชี</label>
                            <input type="text" value={userAccNum} onChange={e => setUserAccNum(e.target.value)} placeholder="เลขบัญชี" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-orange-400 font-mono" />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-600 mb-1">ชื่อบัญชี</label>
                            <input type="text" value={userAccName} onChange={e => setUserAccName(e.target.value)} placeholder="ชื่อ-นามสกุล" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-orange-400" />
                        </div>
                    </div>
                    <div className="pt-2 border-t border-dashed">
                         <label className="block text-sm font-bold text-slate-700 mb-1">จำนวนเงินที่ต้องการถอน</label>
                         <input type="number" value={withAmount} onChange={e => setWithAmount(e.target.value)} placeholder="ระบุยอดเงิน" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-xl text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400" min="1" />
                    </div>
                    <button type="submit" disabled={isSubmitting} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-orange-200 disabled:opacity-50 transition-all">
                        {isSubmitting ? <Loader2 className="animate-spin mx-auto"/> : 'ยืนยันแจ้งถอนเงิน'}
                    </button>
                </div>
            </form>
        </div>
      )}

      {/* Transaction History (Shared) */}
      <div>
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <History size={18} /> ประวัติการ{activeTab === 'DEPOSIT' ? 'เติม' : 'ถอน'} (ล่าสุด)
          </h3>
          <div className="space-y-3">
              {/* ✅ [แก้ไข] เพิ่ม Loading State ตรงนี้ */}
              {loading ? (
                  <div className="py-10 text-center text-slate-400 flex flex-col items-center">
                      <Loader2 className="animate-spin mb-2" size={24} />
                      <span className="text-xs">กำลังโหลดข้อมูล...</span>
                  </div>
              ) : transactions.length > 0 ? transactions.slice(0, 10).map(item => (
                  <div key={item.id} className="bg-white p-3 rounded-xl border border-slate-100 flex justify-between items-center shadow-sm">
                      <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              item.status === 'APPROVED' ? 'bg-green-100 text-green-600' : 
                              item.status === 'REJECTED' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'
                          }`}>
                              {item.type === 'DEPOSIT' ? <Banknote size={20}/> : <ArrowRightLeft size={20}/>}
                          </div>
                          <div>
                              <div className={`font-bold ${item.type === 'DEPOSIT' ? 'text-green-600' : 'text-orange-600'}`}>
                                  {item.type === 'DEPOSIT' ? '+' : '-'}{Number(item.amount).toLocaleString()} ฿
                              </div>
                              <div className="text-[10px] text-slate-400">
                                  {new Date(item.created_at).toLocaleString('th-TH')}
                              </div>
                          </div>
                      </div>
                      <div className="text-right">
                          {getStatusBadge(item.status)}
                          {item.admin_remark && (
                              <div className="text-[10px] text-red-500 mt-1 max-w-25 truncate">
                                  {item.admin_remark}
                              </div>
                          )}
                      </div>
                  </div>
              )) : (
                  <div className="text-center text-slate-400 py-6 bg-slate-50 rounded-xl text-sm">
                      ไม่มีรายการ
                  </div>
              )}
          </div>
      </div>

    </div>
  );
}