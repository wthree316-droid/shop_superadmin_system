import { useState, useEffect } from 'react';
import client from '../../api/client';
import { 
  ShieldAlert, 
  Search, 
  Plus, 
  Trash2, 
  X, 
  AlertTriangle, 
  Ban, 
  Clock,
  CheckCircle2
} from 'lucide-react';

export default function ManageRisks() {
  const [lottos, setLottos] = useState<any[]>([]);
  const [selectedLotto, setSelectedLotto] = useState<any>(null); // หวยที่กำลังจัดการ
  const [risks, setRisks] = useState<any[]>([]); // รายการเลขที่ปิดของหวยนั้นๆ
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [inputNumbers, setInputNumbers] = useState('');
  const [riskType, setRiskType] = useState<'CLOSE' | 'HALF'>('CLOSE');
  const [isLoading, setIsLoading] = useState(false);

  // วันที่ปัจจุบัน
  const todayStr = new Date().toLocaleDateString('th-TH', { 
    day: '2-digit', month: 'short', year: '2-digit' 
  });

  useEffect(() => {
    fetchLottos();
  }, []);

  const fetchLottos = async () => {
    try {
      const res = await client.get('/play/lottos');
      setLottos(res.data);
    } catch (err) { console.error(err); }
  };

  const openRiskModal = async (lotto: any) => {
    setSelectedLotto(lotto);
    setRisks([]); 
    setInputNumbers('');
    try {
      const res = await client.get(`/play/risks/${lotto.id}`);
      setRisks(res.data);
    } catch (err) { console.error(err); }
  };

  const handleAddRisk = async () => {
    if (!inputNumbers.trim()) return;
    setIsLoading(true);

    // รองรับการกรอกหลายเลขคั่นด้วย comma หรือ space
    const numbers = inputNumbers.split(/[\s,]+/).filter(n => n.length > 0);

    try {
      // ยิง API ทีละตัว (Parallel Requests)
      await Promise.all(numbers.map(num => 
        client.post('/play/risks', {
          lotto_type_id: selectedLotto.id,
          number: num,
          risk_type: riskType
        })
      ));

      // Refresh รายการ
      const res = await client.get(`/play/risks/${selectedLotto.id}`);
      setRisks(res.data);
      setInputNumbers(''); // เคลียร์ช่อง
      
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRisk = async (riskId: string) => {
    if(!confirm('ต้องการปลดล็อคเลขนี้?')) return;
    try {
        await client.delete(`/play/risks/${riskId}`);
        setRisks(risks.filter(r => r.id !== riskId));
    } catch(err) { alert('ลบไม่สำเร็จ'); }
  };

  // Filter หวย
  const filteredLottos = lottos.filter(l => 
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      l.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
           <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <ShieldAlert className="text-red-600" /> จัดการเลขปิดรับ / เลขอั้น
           </h2>
           <p className="text-sm text-gray-500 mt-1">ตั้งค่าความเสี่ยงประจำงวดวันที่ {todayStr}</p>
        </div>
        
        {/* Search Bar */}
        <div className="relative w-full md:w-72">
           <input 
             type="text" 
             placeholder="ค้นหาชื่อหวย..." 
             className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-100 outline-none transition-shadow" 
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
           />
           <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
        </div>
      </div>

      {/* Lottos Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
         {filteredLottos.map((lotto) => (
             <div key={lotto.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between hover:shadow-md transition-shadow group">
                 <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center overflow-hidden">
                            {lotto.img_url ? (
                                <img src={lotto.img_url} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-xs font-bold text-blue-600">{lotto.code.substring(0,3)}</span>
                            )}
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800 text-lg group-hover:text-blue-600 transition-colors">{lotto.name}</h3>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                <Clock size={12} /> ปิดรับ {lotto.close_time?.substring(0, 5)} น.
                            </div>
                        </div>
                    </div>
                    {/* Status Badge (ถ้าอยากใส่) */}
                 </div>
                 
                 <button 
                    onClick={() => openRiskModal(lotto)}
                    className="w-full bg-white border-2 border-red-50 text-red-600 px-4 py-2.5 rounded-lg font-bold hover:bg-red-50 hover:border-red-200 transition-all flex items-center justify-center gap-2"
                 >
                    <AlertTriangle size={18} /> จัดการความเสี่ยง
                 </button>
             </div>
         ))}
      </div>

      {/* --- Risk Management Modal --- */}
      {selectedLotto && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">
                  
                  {/* Modal Header */}
                  <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <div>
                          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                              จัดการเลขอั้น <span className="text-blue-600 text-base font-normal">| {selectedLotto.name}</span>
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">งวดวันที่ {todayStr}</p>
                      </div>
                      <button onClick={() => setSelectedLotto(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                          <X size={24} />
                      </button>
                  </div>

                  <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                      
                      {/* Left Panel: เพิ่มเลขใหม่ */}
                      <div className="w-full md:w-5/12 bg-gray-50 p-6 border-r border-gray-100 flex flex-col">
                          <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                              <Plus size={18} className="text-blue-500" /> เพิ่มรายการใหม่
                          </h4>
                          
                          {/* Type Selector */}
                          <div className="grid grid-cols-2 gap-3 mb-4">
                              <button 
                                onClick={() => setRiskType('CLOSE')}
                                className={`py-3 px-2 rounded-xl border-2 font-bold text-sm flex flex-col items-center justify-center gap-1 transition-all ${
                                    riskType === 'CLOSE' 
                                    ? 'border-red-500 bg-red-50 text-red-600 shadow-sm' 
                                    : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'
                                }`}
                              >
                                  <Ban size={20} /> ปิดรับ
                              </button>
                              <button 
                                onClick={() => setRiskType('HALF')}
                                className={`py-3 px-2 rounded-xl border-2 font-bold text-sm flex flex-col items-center justify-center gap-1 transition-all ${
                                    riskType === 'HALF' 
                                    ? 'border-orange-500 bg-orange-50 text-orange-600 shadow-sm' 
                                    : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'
                                }`}
                              >
                                  <AlertTriangle size={20} /> จ่ายครึ่ง
                              </button>
                          </div>

                          {/* Input Area */}
                          <div className="flex-1 flex flex-col">
                              <label className="text-xs font-bold text-gray-500 mb-2 block">ระบุตัวเลข (คั่นด้วย , หรือเว้นวรรค)</label>
                              <textarea 
                                className="w-full flex-1 border border-gray-300 rounded-xl p-3 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none text-lg font-mono resize-none shadow-inner"
                                placeholder="เช่น 05, 12, 88"
                                value={inputNumbers}
                                onChange={e => setInputNumbers(e.target.value)}
                              />
                              <p className="text-[10px] text-gray-400 mt-2 text-right">
                                  {inputNumbers ? inputNumbers.split(/[\s,]+/).filter(n => n).length : 0} รายการ
                              </p>
                          </div>

                          <button 
                            onClick={handleAddRisk}
                            disabled={isLoading || !inputNumbers}
                            className="w-full mt-4 bg-gray-900 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-black disabled:bg-gray-300 transition-all flex items-center justify-center gap-2"
                          >
                              {isLoading ? <span className="animate-spin">⏳</span> : <CheckCircle2 size={18} />} 
                              บันทึกข้อมูล
                          </button>
                      </div>

                      {/* Right Panel: รายการปัจจุบัน */}
                      <div className="w-full md:w-7/12 p-6 overflow-y-auto bg-white">
                          <h4 className="font-bold text-gray-800 mb-4 flex justify-between items-center">
                              <span>รายการปัจจุบัน</span>
                              <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500 font-bold">{risks.length} รายการ</span>
                          </h4>

                          {risks.length === 0 ? (
                              <div className="h-64 flex flex-col items-center justify-center text-gray-300 border-2 border-dashed border-gray-100 rounded-xl">
                                  <ShieldAlert size={48} className="mb-2 opacity-20" />
                                  <p>ยังไม่มีการจำกัดความเสี่ยง</p>
                              </div>
                          ) : (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 content-start">
                                  {risks.map(r => (
                                      <div key={r.id} className={`relative group flex justify-between items-center p-2.5 rounded-lg border ${
                                          r.risk_type === 'CLOSE' ? 'bg-red-50 border-red-100' : 'bg-orange-50 border-orange-100'
                                      }`}>
                                          <div className="flex items-center gap-2">
                                              <span className={`font-black text-lg tracking-wider ${
                                                  r.risk_type === 'CLOSE' ? 'text-red-600' : 'text-orange-600'
                                              }`}>
                                                  {r.number}
                                              </span>
                                          </div>
                                          <div className="flex items-center">
                                              {/* Badge Type */}
                                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase mr-2 ${
                                                  r.risk_type === 'CLOSE' ? 'bg-white text-red-400' : 'bg-white text-orange-400'
                                              }`}>
                                                  {r.risk_type === 'CLOSE' ? 'ปิด' : 'ครึ่ง'}
                                              </span>
                                              
                                              {/* Delete Button */}
                                              <button 
                                                onClick={() => handleDeleteRisk(r.id)}
                                                className="text-gray-400 hover:text-red-500 transition-colors bg-white rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100"
                                              >
                                                  <Trash2 size={14} />
                                              </button>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>

                  </div>
              </div>
          </div>
      )}
    </div>
  );
}