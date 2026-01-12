import { useState, useEffect } from 'react';
import client from '../../api/client';
import { Plus, Trash2, Building2, Loader2, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ManageBanks() {
  const [banks, setBanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({ 
    bank_name: '', 
    account_name: '', 
    account_number: '' 
  });

  useEffect(() => { fetchBanks(); }, []);

  const fetchBanks = async () => {
    setLoading(true);
    try {
      const res = await client.get('/topup/banks');
      setBanks(res.data);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!formData.bank_name || !formData.account_number) return toast.error('กรุณากรอกข้อมูลให้ครบ');
    
    try {
      await client.post('/topup/banks', formData);
      toast.success('เพิ่มบัญชีสำเร็จ');
      setFormData({ bank_name: '', account_name: '', account_number: '' });
      fetchBanks();
    } catch (err) { toast.error('เพิ่มบัญชีไม่สำเร็จ'); }
  };

  const handleDelete = async (id: string) => {
    if(!confirm('ยืนยันลบบัญชีนี้?')) return;
    try {
      await client.delete(`/topup/banks/${id}`);
      fetchBanks();
      toast.success('ลบสำเร็จ');
    } catch (err) { toast.error('ลบไม่สำเร็จ'); }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6 animate-fade-in">
      {/* ฝั่งซ้าย: รายการบัญชี */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Building2 size={20} className="text-blue-600"/> บัญชีรับเงินของร้าน
          </h3>
          
          <div className="space-y-3">
              {loading ? (
                  <div className="text-center py-4"><Loader2 className="animate-spin mx-auto"/></div>
              ) : banks.length > 0 ? banks.map(b => (
                  <div key={b.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center group hover:border-blue-200 transition-colors">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-slate-400">
                              <CreditCard size={18}/>
                          </div>
                          <div>
                              <div className="font-bold text-slate-800">{b.bank_name}</div>
                              <div className="text-sm font-mono text-slate-600 tracking-wider">{b.account_number}</div>
                              <div className="text-xs text-slate-400">{b.account_name}</div>
                          </div>
                      </div>
                      <button onClick={() => handleDelete(b.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                          <Trash2 size={18}/>
                      </button>
                  </div>
              )) : (
                  <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
                      ยังไม่มีบัญชีธนาคาร
                  </div>
              )}
          </div>
      </div>

      {/* ฝั่งขวา: ฟอร์มเพิ่ม */}
      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 h-fit">
          <h3 className="font-bold text-slate-800 mb-4">เพิ่มบัญชีใหม่</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">ธนาคาร</label>
                  <input 
                    placeholder="เช่น กสิกรไทย, ไทยพาณิชย์" 
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={formData.bank_name} onChange={e => setFormData({...formData, bank_name: e.target.value})}
                  />
              </div>
              <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">เลขบัญชี</label>
                  <input 
                    placeholder="xxx-x-xxxxx-x" 
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                    value={formData.account_number} onChange={e => setFormData({...formData, account_number: e.target.value})}
                  />
              </div>
              <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">ชื่อบัญชี</label>
                  <input 
                    placeholder="ชื่อ-นามสกุล เจ้าของบัญชี" 
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={formData.account_name} onChange={e => setFormData({...formData, account_name: e.target.value})}
                  />
              </div>
              
              <button type="submit" className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-black shadow-lg flex justify-center items-center gap-2 transition-transform active:scale-95 mt-2">
                  <Plus size={18}/> บันทึกข้อมูล
              </button>
          </form>
      </div>
    </div>
  );
}