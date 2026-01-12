import { useState, useEffect } from 'react';
import client from '../../api/client';
import { 
  Wallet, Upload, History, 
  Copy, Loader2, Image as AlertCircle,
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
  const [loading, setLoading] = useState(true);

  // Form State (Deposit)
  const [depAmount, setDepAmount] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); // URL สำหรับ Preview
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State (Withdraw)
  const [wdAmount, setWdAmount] = useState('');
  const [wdBank, setWdBank] = useState('');
  const [wdAccName, setWdAccName] = useState('');
  const [wdAccNum, setWdAccNum] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
        if(activeTab === 'DEPOSIT') {
            const resBanks = await client.get('/topup/banks');
            setShopBanks(resBanks.data);
            const resTrans = await client.get('/topup/requests?limit=10'); // ดึงแค่ 10 รายการล่าสุด
            setTransactions(resTrans.data.map((t:any) => ({...t, type: 'DEPOSIT'})));
        } else {
            // Withdraw Logic (ถ้ามี API แล้ว)
             try {
                const res = await client.get('/withdraw/requests?limit=10');
                setTransactions(res.data.map((t:any) => ({...t, type: 'WITHDRAW'})));
             } catch(e) {}
        }
    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  // Handle File Select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if(e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          if(file.size > 5 * 1024 * 1024) return toast.error('ไฟล์ใหญ่เกิน 5MB');
          
          setSelectedFile(file);
          setPreviewUrl(URL.createObjectURL(file));
      }
  };

  // 1. แจ้งเติมเงิน
  const handleDeposit = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!depAmount || Number(depAmount) <= 0) return toast.error('กรุณาระบุยอดเงิน');
      if(!selectedFile) return toast.error('กรุณาแนบสลิปโอนเงิน');

      setIsSubmitting(true);
      try {
          // 1. Upload Slip
          const formData = new FormData();
          formData.append('file', selectedFile);
          
          // ✅ [เพิ่ม] ระบุ Folder เพื่อให้ลง Bucket "slips"
          formData.append('folder', 'slip'); 

          const uploadRes = await client.post('/upload/', formData);
          const slipUrl = uploadRes.data.url;

          // 2. Create Request
          await client.post('/topup/requests', {
              amount: Number(depAmount),
              proof_image: slipUrl
          });

          toast.success('แจ้งเติมเงินสำเร็จ! รอตรวจสอบ');
          setDepAmount('');
          setSelectedFile(null);
          setPreviewUrl(null);
          fetchData();

      } catch (err: any) {
          toast.error(err.response?.data?.detail || 'เกิดข้อผิดพลาด');
      } finally {
          setIsSubmitting(false);
      }
  };

  // 2. แจ้งถอนเงิน
  const handleWithdraw = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!wdAmount || !wdBank || !wdAccNum) return toast.error('กรอกข้อมูลให้ครบ');
      
      setIsSubmitting(true);
      try {
          await client.post('/withdraw/requests', {
              amount: Number(wdAmount),
              bank_name: wdBank,
              account_name: wdAccName,
              account_number: wdAccNum
          });
          toast.success('แจ้งถอนเงินสำเร็จ');
          setWdAmount('');
          fetchData();
          fetchMe(); // อัปเดตยอดเงินมุมบน
      } catch (err: any) {
          toast.error(err.response?.data?.detail || 'ถอนเงินไม่สำเร็จ');
      } finally {
          setIsSubmitting(false);
      }
  };

  const getStatusBadge = (status: string) => {
      switch(status) {
          case 'APPROVED': return <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded text-[10px] font-bold border border-green-100">สำเร็จ</span>;
          case 'REJECTED': return <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded text-[10px] font-bold border border-red-100">ปฏิเสธ</span>;
          default: return <span className="text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded text-[10px] font-bold border border-yellow-100">รอตรวจสอบ</span>;
      }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
        <Loader2 className="w-10 h-10 text-slate-300 animate-spin mb-4" />
        <p className="text-slate-400 text-sm font-medium">กำลังโหลดข้อมูลกระเป๋าเงิน...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
        
        {/* Header ยอดเงิน */}
        <div className="bg-linear-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
            <div className="relative z-10">
                <p className="text-slate-400 text-xs font-bold mb-1 uppercase tracking-wider">Credit Balance</p>
                <h1 className="text-4xl font-black tracking-tight">{user?.credit_balance?.toLocaleString()} ฿</h1>
                <div className="flex gap-2 mt-4">
                    <button 
                        onClick={() => setActiveTab('DEPOSIT')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'DEPOSIT' ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : 'bg-white/10 text-slate-300 hover:bg-white/20'}`}
                    >
                        <Wallet size={16}/> ฝากเงิน
                    </button>
                    <button 
                        onClick={() => setActiveTab('WITHDRAW')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'WITHDRAW' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'bg-white/10 text-slate-300 hover:bg-white/20'}`}
                    >
                        <ArrowRightLeft size={16}/> ถอนเงิน
                    </button>
                </div>
            </div>
        </div>

        {/* --- Deposit Form --- */}
        {activeTab === 'DEPOSIT' && (
            <div className="space-y-4">
                {/* 1. เลือกบัญชี */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Landmark className="text-blue-500" size={20}/> โอนเงินเข้าบัญชี
                    </h3>
                    <div className="space-y-3">
                        {shopBanks.map(bank => (
                            <div key={bank.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center">
                                <div>
                                    <div className="font-bold text-slate-700">{bank.bank_name}</div>
                                    <div className="text-sm font-mono text-slate-600 tracking-wide">{bank.account_number}</div>
                                    <div className="text-xs text-slate-400">{bank.account_name}</div>
                                </div>
                                <button 
                                    onClick={() => {
                                        navigator.clipboard.writeText(bank.account_number);
                                        toast.success('คัดลอกเลขบัญชีแล้ว');
                                    }}
                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                    <Copy size={18}/>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. กรอกยอด + แนบสลิป */}
                <form onSubmit={handleDeposit} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">จำนวนเงินที่โอน</label>
                        <input 
                            type="number" 
                            className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-lg outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                            placeholder="0.00"
                            value={depAmount}
                            onChange={e => setDepAmount(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block">หลักฐานการโอน (สลิป)</label>
                        <div className="relative">
                            <input 
                                type="file" 
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden" 
                                id="slip-upload"
                            />
                            <label 
                                htmlFor="slip-upload"
                                className={`w-full h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${
                                    previewUrl ? 'border-green-300 bg-green-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
                                }`}
                            >
                                {previewUrl ? (
                                    <div className="relative w-full h-full p-2">
                                        {/* ✅ แก้ไข: ใส่ onError ตรงนี้ */}
                                        <img 
                                            src={previewUrl} 
                                            alt="Preview" 
                                            loading="lazy"
                                            decoding="async"
                                            className="w-full h-full object-contain rounded-lg"
                                            onError={(e) => {
                                                // วิธีแก้ TypeScript Error ตรงนี้
                                                const target = e.target as HTMLImageElement;
                                                target.src = 'https://placehold.co/400x200?text=Error';
                                                target.onerror = null;
                                            }}
                                        />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-lg">
                                            <p className="text-white font-bold text-xs">คลิกเพื่อเปลี่ยนรูป</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center text-slate-400">
                                        <Upload className="mx-auto mb-2" size={24}/>
                                        <span className="text-xs">คลิกเพื่อแนบสลิป</span>
                                    </div>
                                )}
                            </label>
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-200 hover:bg-green-700 active:scale-95 transition-all flex justify-center items-center gap-2"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin"/> : <UploadCloud size={20}/>}
                        แจ้งเติมเงิน
                    </button>
                </form>
            </div>
        )}

        {/* --- Withdraw Form --- */}
        {activeTab === 'WITHDRAW' && (
            <form onSubmit={handleWithdraw} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                 <div className="bg-orange-50 p-3 rounded-xl flex gap-2 items-start text-xs text-orange-700 border border-orange-100 mb-2">
                    <AlertCircle size={16} className="shrink-0 mt-0.5"/>
                    <p>ระบบจะโอนเงินเข้าบัญชีตามที่คุณระบุ โปรดตรวจสอบความถูกต้องก่อนกดยืนยัน</p>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">จำนวนเงินที่ถอน</label>
                        <input 
                            type="number" 
                            className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-lg outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="0.00"
                            value={wdAmount} onChange={e => setWdAmount(e.target.value)}
                        />
                    </div>
                    <div>
                         <label className="text-xs font-bold text-slate-500 uppercase ml-1">ธนาคาร</label>
                         <input 
                            className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                            placeholder="เช่น กสิกรไทย"
                            value={wdBank} onChange={e => setWdBank(e.target.value)}
                        />
                    </div>
                    <div>
                         <label className="text-xs font-bold text-slate-500 uppercase ml-1">เลขบัญชี</label>
                         <input 
                            className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-sm font-mono"
                            placeholder="xxx-x-xxxxx-x"
                            value={wdAccNum} onChange={e => setWdAccNum(e.target.value)}
                        />
                    </div>
                    <div className="col-span-2">
                         <label className="text-xs font-bold text-slate-500 uppercase ml-1">ชื่อบัญชี</label>
                         <input 
                            className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                            placeholder="ชื่อ-นามสกุล"
                            value={wdAccName} onChange={e => setWdAccName(e.target.value)}
                        />
                    </div>
                 </div>

                 <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full py-3 bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-200 hover:bg-orange-700 active:scale-95 transition-all flex justify-center items-center gap-2"
                >
                    {isSubmitting ? <Loader2 className="animate-spin"/> : <ArrowRightLeft size={20}/>}
                    แจ้งถอนเงิน
                </button>
            </form>
        )}

        {/* --- History List --- */}
        <div className="space-y-3">
            <h3 className="font-bold text-slate-700 ml-1 flex items-center gap-2">
                <History size={18}/> รายการล่าสุด
            </h3>
            {transactions.length > 0 ? transactions.map(item => (
                <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            item.type === 'WITHDRAW' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'
                        }`}>
                            {item.type === 'WITHDRAW' ? <ArrowRightLeft size={20}/> : <Banknote size={20}/>}
                        </div>
                        <div>
                            <div className={`font-bold ${item.type === 'WITHDRAW' ? 'text-orange-600' : 'text-green-600'}`}>
                                {item.type === 'WITHDRAW' ? '-' : '+'}{Number(item.amount).toLocaleString()} ฿
                            </div>
                            <div className="text-[10px] text-slate-400">
                                {new Date(item.created_at).toLocaleString('th-TH')}
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        {getStatusBadge(item.status)}
                        {item.admin_remark && (
                            <div className="text-[10px] text-red-500 mt-1 max-w-37.5 truncate">
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
  );
}

// ต้อง import UploadCloud ถ้ายังไม่มี
import { UploadCloud } from 'lucide-react';