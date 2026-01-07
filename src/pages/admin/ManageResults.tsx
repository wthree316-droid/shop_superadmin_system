import { useState, useEffect } from 'react';
import client from '../../api/client';
import { 
  X, Trophy, Calendar, 
  CheckCircle, Clock, AlertCircle, Loader2 
} from 'lucide-react';

export default function ManageResults() {
  const [lottos, setLottos] = useState<any[]>([]);
  const [selectedLotto, setSelectedLotto] = useState<any>(null); // สำหรับ Modal
  const [top3, setTop3] = useState('');
  const [bottom2, setBottom2] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterDate, setFilterDate] = useState('today'); // today, yesterday

  // วันที่ปัจจุบัน (Format: DD-MM-YYYY)
  const getDisplayDate = () => {
      const d = new Date();
      if (filterDate === 'yesterday') d.setDate(d.getDate() - 1);
      return d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  useEffect(() => {
    fetchData();
  }, [filterDate]);

  const fetchData = async () => {
      try {
        const res = await client.get('/play/lottos');
        setLottos(res.data);
      } catch (err) {
          console.error(err);
      }
  };

  const handleOpenModal = (lotto: any) => {
    setSelectedLotto(lotto);
    setTop3('');
    setBottom2('');
  };

  const handleSubmitReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLotto) return;
    
    // Validate length
    if (top3.length !== 3 || bottom2.length !== 2) {
        alert("กรุณากรอกเลขให้ครบ (3 ตัวบน และ 2 ตัวล่าง)");
        return;
    }

    if (!confirm(`ยืนยันผลรางวัล ${selectedLotto.name}?\n3 ตัวบน: ${top3}\n2 ตัวล่าง: ${bottom2}`)) return;

    setIsSubmitting(true);
    try {
      await client.post('/reward/issue', {
        lotto_type_id: selectedLotto.id,
        top_3: top3,
        bottom_2: bottom2
      });
      alert('✅ บันทึกผลรางวัลเรียบร้อย!');
      setSelectedLotto(null);
      fetchData(); // Refresh Data
    } catch (err: any) {
      alert(`Error: ${err.response?.data?.detail}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in p-4 md:p-6 pb-24 md:pb-8">
      
      {/* --- Header & Filter --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
           <h2 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2 tracking-tight">
              <div className="p-2 bg-amber-500 rounded-lg text-white shadow-lg shadow-amber-200">
                  <Trophy size={24} />
              </div>
              ออกผลรางวัล
           </h2>
           <p className="text-sm text-slate-500 mt-1 ml-1">กรอกผลรางวัลเพื่อตัดยอดและจ่ายเงิน</p>
        </div>

        {/* Date Filters */}
        <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex items-center w-full md:w-auto">
            <button 
                onClick={() => setFilterDate('today')}
                className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                    filterDate === 'today' ? 'bg-amber-100 text-amber-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                }`}
            >
                <Calendar size={16} /> วันนี้
            </button>
            <div className="w-px h-6 bg-slate-200 mx-1"></div>
            <button 
                onClick={() => setFilterDate('yesterday')}
                className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                    filterDate === 'yesterday' ? 'bg-amber-100 text-amber-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                }`}
            >
                <Calendar size={16} /> เมื่อวาน
            </button>
        </div>
      </div>

      {/* --- Desktop Table View (Hidden on Mobile) --- */}
      <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-xs tracking-wider">
            <tr>
              <th className="p-5 text-center w-16">#</th>
              <th className="p-5">รายการหวย</th>
              <th className="p-5 text-center">งวดประจำวันที่</th>
              <th className="p-5 text-center">สถานะ</th>
              <th className="p-5 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {lottos.map((lotto, index) => (
              <tr key={lotto.id} className="hover:bg-amber-50/30 transition-colors">
                <td className="p-5 text-center text-slate-400">{index + 1}</td>
                <td className="p-5">
                    <div className="font-bold text-slate-800 text-base">{lotto.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">ปิดรับ: {lotto.close_time?.substring(0,5) || '-'} น.</div>
                </td>
                <td className="p-5 text-center font-mono font-medium text-slate-600">
                    {getDisplayDate()}
                </td>
                <td className="p-5 text-center">
                    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-xs font-bold border border-slate-200">
                        <Clock size={12} /> รอออกผล
                    </span>
                </td>
                <td className="p-5 text-center">
                  <button 
                    onClick={() => handleOpenModal(lotto)}
                    className="bg-amber-500 text-white px-5 py-2 rounded-xl font-bold text-sm hover:bg-amber-600 shadow-md shadow-amber-200 transition-all active:scale-95 flex items-center gap-2 mx-auto"
                  >
                    <Trophy size={16} /> ใส่ผล
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- Mobile Card View (Show on Mobile) --- */}
      <div className="md:hidden grid grid-cols-1 gap-4">
          {lottos.map((lotto) => (
              <div key={lotto.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 relative overflow-hidden">
                  <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 font-bold shadow-sm">
                              {lotto.name.charAt(0)}
                          </div>
                          <div>
                              <h3 className="font-bold text-lg text-slate-800">{lotto.name}</h3>
                              <p className="text-xs text-slate-500 flex items-center gap-1">
                                  <Calendar size={12} /> งวด: {getDisplayDate()}
                              </p>
                          </div>
                      </div>
                      <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-1 rounded-md font-bold border border-slate-200">
                          รอผล
                      </span>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 flex justify-between items-center mb-4 border border-slate-100">
                      <span className="text-xs font-medium text-slate-500">เวลาผลออก</span>
                      <span className="text-sm font-bold font-mono text-slate-700 flex items-center gap-1">
                          <Clock size={14} className="text-amber-500" /> 
                          {lotto.result_time?.substring(0,5) || '--:--'} น.
                      </span>
                  </div>

                  <button 
                      onClick={() => handleOpenModal(lotto)}
                      className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-black active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                      <Trophy size={18} className="text-amber-400" /> ใส่ผลรางวัล
                  </button>
              </div>
          ))}
          {lottos.length === 0 && (
              <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                  <AlertCircle size={32} className="mx-auto mb-2 opacity-30" />
                  ไม่พบรายการหวย
              </div>
          )}
      </div>

      {/* --- Modal ใส่ผล (Responsive) --- */}
      {selectedLotto && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 relative">
            
            {/* Modal Header */}
            <div className="p-6 pb-4 bg-linear-to-r from-amber-400 to-orange-500 text-white text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                <h3 className="text-xl font-black tracking-tight">{selectedLotto.name}</h3>
                <p className="text-amber-100 text-xs mt-1 font-medium">งวดวันที่ {getDisplayDate()}</p>
                <button 
                    onClick={() => setSelectedLotto(null)} 
                    className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/10 hover:bg-black/20 rounded-full p-1 transition-colors"
                >
                    <X size={20} />
                </button>
            </div>
            
            <form onSubmit={handleSubmitReward} className="p-6 space-y-6">
              <div className="space-y-4">
                  <div className="text-center">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">เลข 3 ตัวบน</label>
                      <input 
                        type="text" 
                        value={top3}
                        onChange={e => setTop3(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
                        maxLength={3}
                        className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 text-4xl text-center font-black tracking-[0.5em] text-slate-800 focus:border-amber-500 focus:ring-4 focus:ring-amber-100 outline-none transition-all placeholder-slate-200"
                        placeholder="---"
                        autoFocus
                      />
                  </div>

                  <div className="text-center">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">เลข 2 ตัวล่าง</label>
                      <input 
                        type="text" 
                        value={bottom2}
                        onChange={e => setBottom2(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
                        maxLength={2}
                        className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 text-4xl text-center font-black tracking-[0.5em] text-slate-800 focus:border-amber-500 focus:ring-4 focus:ring-amber-100 outline-none transition-all placeholder-slate-200"
                        placeholder="--"
                      />
                  </div>
              </div>

              <div className="pt-2">
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full py-4 bg-slate-800 text-white rounded-2xl font-bold text-lg shadow-xl shadow-slate-300 hover:bg-black hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <CheckCircle size={20} />} 
                    ยืนยันผลรางวัล
                  </button>
                  <button 
                    type="button"
                    onClick={() => setSelectedLotto(null)}
                    className="w-full py-3 mt-3 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors"
                  >
                    ยกเลิก
                  </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}