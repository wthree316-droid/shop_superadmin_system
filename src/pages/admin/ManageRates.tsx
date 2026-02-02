import { useState, useEffect } from 'react';
import client from '../../api/client';
import { 
    FileSpreadsheet, Plus, Trash2, X, Save, Pencil, 
    Settings2, Coins, Loader2, CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { confirmAction } from '../../utils/toastUtils';

// --- Configs ---
const BET_TYPES = [
  { key: '3top', label: '3 ตัวบน', color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { key: '3tod', label: '3 ตัวโต๊ด', color: 'text-blue-600', bg: 'bg-blue-50' },
  { key: '2up', label: '2 ตัวบน', color: 'text-purple-600', bg: 'bg-purple-50' },
  { key: '2down', label: '2 ตัวล่าง', color: 'text-pink-600', bg: 'bg-pink-50' },
  { key: 'run_up', label: 'วิ่งบน', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { key: 'run_down', label: 'วิ่งล่าง', color: 'text-teal-600', bg: 'bg-teal-50' },
];

const defaultRateSettings = {
  pay: '',     
  min: '1',    
  max: '2000', 
  limit: '0'   
};

// --- Main Component ---
export default function ManageRates() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState('');
  
  // State สำหรับเก็บค่าเรทของแต่ละประเภทหวย
  const [ratesData, setRatesData] = useState<any>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
        const res = await client.get('/play/rates');
        setProfiles(res.data);
    } catch (err) {
        console.error(err);
        toast.error('โหลดข้อมูลไม่สำเร็จ');
    }
  };

  // เตรียมข้อมูลสำหรับฟอร์ม (Reset หรือ Load ของเดิม)
  const prepareForm = (profile?: any) => {
      if (profile) {
          setEditingId(profile.id);
          setProfileName(profile.name);
          // แปลงข้อมูล rates เดิมมาใส่ใน State
          const currentRates: any = {};
          BET_TYPES.forEach(t => {
              const rate = profile.rates?.[t.key] || {};
              currentRates[t.key] = {
                  pay: rate.pay || '',
                  min: rate.min || '1',
                  max: rate.max || '2000',
                  limit: rate.limit || '0'
              };
          });
          setRatesData(currentRates);
      } else {
          setEditingId(null);
          setProfileName('');
          // ใช้ค่า Default
          const initialRates: any = {};
          BET_TYPES.forEach(t => {
              initialRates[t.key] = { ...defaultRateSettings };
          });
          setRatesData(initialRates);
      }
      setShowModal(true);
  };

  const handleDelete = (id: string) => {
      confirmAction(
          'ต้องการลบโปรไฟล์เรทราคานี้ใช่หรือไม่?',
          async () => {
              try {
                  await client.delete(`/play/rates/${id}`);
                  toast.success('ลบเรียบร้อย');
                  setProfiles(prev => prev.filter(p => p.id !== id));
              } catch (err: any) {
                  toast.error(err.response?.data?.detail || 'ลบไม่สำเร็จ (อาจมีการใช้งานอยู่)');
              }
          },
          'ลบข้อมูล',
          'ยกเลิก'
      );
  };

  const handleSubmit = async () => {
      if (!profileName.trim()) return toast.error('กรุณาตั้งชื่อโปรไฟล์');

      // ตรวจสอบข้อมูลว่ากรอกครบไหม (เช็คแค่ Pay ก็พอ)
      for (const type of BET_TYPES) {
          if (!ratesData[type.key]?.pay) {
              return toast.error(`กรุณาระบุอัตราจ่ายของ ${type.label}`);
          }
      }

      setIsLoading(true);
      try {
          const payload = {
              name: profileName,
              rates: ratesData
          };

          if (editingId) {
              // ✅ แก้ไข: ยิง PUT ไปอัปเดต
              await client.put(`/play/rates/${editingId}`, payload);
              toast.success('อัปเดตข้อมูลสำเร็จ');
          } else {
              // ✅ สร้างใหม่: ยิง POST
              await client.post('/play/rates', payload);
              toast.success('สร้างโปรไฟล์สำเร็จ');
          }

          setShowModal(false);
          fetchData();

      } catch (err: any) {
          console.error(err);
          toast.error(err.response?.data?.detail || 'ทำรายการไม่สำเร็จ');
      } finally {
          setIsLoading(false);
      }
  };

  // Helper ดึงค่าจาก Object rates อย่างปลอดภัย
  const getVal = (rateObj: any, field: string) => {
      if (!rateObj) return 0;
      // ถ้า field เป็น limit และค่าเป็น 0 หรือ '0' ถือว่าถูกต้อง (ไม่อั้น)
      if (field === 'limit' && (rateObj[field] === 0 || rateObj[field] === '0')) return 0;
      return rateObj[field] || 0;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 font-sans pb-24">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                <FileSpreadsheet className="text-blue-600" /> จัดการเรทราคา
            </h1>
            <p className="text-slate-500 text-sm mt-1">กำหนดอัตราจ่าย ส่วนลด และเลขอั้น สำหรับหวยแต่ละประเภท</p>
        </div>
        <button 
            onClick={() => prepareForm()}
            className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-black active:scale-95 transition-all"
        >
            <Plus size={20} /> สร้างโปรไฟล์ใหม่
        </button>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 gap-6">
          {profiles.map((profile) => (
              <div key={profile.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                  {/* Profile Header */}
                  <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                              <Coins className="text-amber-500" size={20} />
                          </div>
                          <h3 className="font-bold text-lg text-slate-800">{profile.name}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                          <button 
                            onClick={() => prepareForm(profile)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="แก้ไขข้อมูล"
                          >
                              <Pencil size={18} />
                          </button>
                          <button 
                            onClick={() => handleDelete(profile.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="ลบโปรไฟล์"
                          >
                              <Trash2 size={18} />
                          </button>
                      </div>
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-sm text-left">
                          <thead className="text-slate-500 font-bold bg-white border-b border-slate-100">
                              <tr>
                                  <th className="p-4 pl-6">ประเภท</th>
                                  <th className="p-4 text-center">อัตราจ่าย (บาท)</th>
                                  <th className="p-4 text-center">แทงขั้นต่ำ</th>
                                  <th className="p-4 text-center">แทงสูงสุด</th>
                                  <th className="p-4 text-center">รับสูงสุด/เลข (อั้น)</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                              {BET_TYPES.map((t) => {
                                  const rate = profile.rates?.[t.key] || {};
                                  return (
                                      <tr key={t.key} className="hover:bg-slate-50/50">
                                          <td className="p-4 pl-6 font-bold text-slate-700 flex items-center gap-2">
                                              <span className={`w-2 h-2 rounded-full ${t.bg.replace('bg-', 'bg-').replace('50', '500')}`}></span>
                                              {t.label}
                                          </td>
                                          <td className="p-4 text-center font-bold text-green-600">
                                              {Number(getVal(rate, 'pay')).toLocaleString()}
                                          </td>
                                          <td className="p-4 text-center text-slate-600">
                                              {Number(getVal(rate, 'min')).toLocaleString()}
                                          </td>
                                          <td className="p-4 text-center text-slate-600">
                                              {Number(getVal(rate, 'max')).toLocaleString()}
                                          </td>
                                          <td className="p-4 text-center text-slate-600">
                                              {/* ✅ แสดงผล "ไม่อั้น" ชัดเจน */}
                                              {Number(getVal(rate, 'limit')) === 0 ? (
                                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs font-bold border border-green-200">
                                                      <CheckCircle size={10} /> ไม่อั้น
                                                  </span>
                                              ) : (
                                                  Number(getVal(rate, 'limit')).toLocaleString()
                                              )}
                                          </td>
                                      </tr>
                                  );
                              })}
                          </tbody>
                      </table>
                  </div>

                  {/* Mobile Grid View */}
                  <div className="md:hidden p-4 grid grid-cols-2 gap-3">
                      {BET_TYPES.map((t) => (
                          <div key={t.key} className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col gap-2">
                              <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${t.bg} ${t.color}`}>{t.label}</span>
                              </div>
                              <div className="flex justify-between items-end">
                                  <div>
                                      <p className="text-[10px] text-slate-400">จ่าย</p>
                                      <p className="font-bold text-lg text-slate-800">{Number(getVal(profile.rates[t.key], 'pay')).toLocaleString()}</p>
                                  </div>
                                  <div className="text-right">
                                      <p className="text-[10px] text-slate-400">รับสูงสุด/เลข</p>
                                      {/* ✅ แสดงผล "ไม่อั้น" บนมือถือ */}
                                      {Number(getVal(profile.rates[t.key], 'limit')) === 0 ? (
                                          <span className="text-green-600 font-bold text-sm">ไม่อั้น</span>
                                      ) : (
                                          <span className="font-bold text-sm text-red-500">{Number(getVal(profile.rates[t.key], 'limit')).toLocaleString()}</span>
                                      )}
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          ))}

          {profiles.length === 0 && !isLoading && (
              <div className="text-center py-20 bg-white border-2 border-dashed border-slate-200 rounded-3xl">
                  <Settings2 className="mx-auto text-slate-300 mb-4" size={48} />
                  <p className="text-slate-400">ยังไม่มีข้อมูลเรทราคา</p>
              </div>
          )}
          
          {isLoading && profiles.length === 0 && (
               <div className="text-center py-20">
                   <Loader2 className="animate-spin mx-auto text-blue-500" size={32} />
               </div>
          )}
      </div>

      {/* Modal Form */}
      {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
                  
                  {/* Modal Header */}
                  <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
                      <div>
                          <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2">
                              {editingId ? <Pencil className="text-blue-500" /> : <Plus className="text-green-500" />}
                              {editingId ? 'แก้ไขเรทราคา' : 'เพิ่มเรทราคาใหม่'}
                          </h3>
                          <p className="text-xs text-slate-500 mt-1">กำหนดอัตราจ่ายและเงื่อนไขการรับแทง</p>
                      </div>
                      <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                          <X size={24} />
                      </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-6 overflow-y-auto custom-scrollbar bg-white">
                      <div className="space-y-6">
                          
                          {/* ชื่อโปรไฟล์ */}
                          <div>
                              <label className="block text-sm font-bold text-slate-700 mb-2">ชื่อโปรไฟล์เรทราคา <span className="text-red-500">*</span></label>
                              <input 
                                  type="text" 
                                  className="w-full p-3 border border-slate-200 rounded-xl font-bold text-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all placeholder-slate-300"
                                  placeholder="เช่น เรทมาตรฐาน, เรทจ่ายสูง"
                                  value={profileName}
                                  onChange={(e) => setProfileName(e.target.value)}
                                  autoFocus
                              />
                          </div>

                          {/* ตารางกรอกข้อมูล */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {BET_TYPES.map((t) => (
                                  <div key={t.key} className={`border border-slate-100 rounded-xl p-4 relative overflow-hidden group hover:border-blue-200 hover:shadow-md transition-all`}>
                                      <div className={`absolute top-0 left-0 w-1 h-full ${t.bg.replace('bg-', 'bg-').replace('50', '500')}`}></div>
                                      
                                      <div className="flex items-center gap-2 mb-3 pl-3">
                                          <span className={`text-xs font-bold px-2 py-1 rounded ${t.bg} ${t.color}`}>{t.label}</span>
                                      </div>

                                      <div className="space-y-3 pl-3">
                                          <div>
                                              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">อัตราจ่าย (บาท)</label>
                                              <input 
                                                type="number" 
                                                className="w-full p-2 border border-slate-200 rounded-lg font-bold text-green-600 focus:border-green-500 outline-none bg-green-50/30"
                                                placeholder="0"
                                                value={ratesData[t.key]?.pay}
                                                onChange={e => setRatesData({...ratesData, [t.key]: { ...ratesData[t.key], pay: e.target.value }})}
                                              />
                                          </div>
                                          
                                          <div className="grid grid-cols-2 gap-2">
                                              <div>
                                                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">ขั้นต่ำ</label>
                                                  <input 
                                                    type="number" 
                                                    className="w-full p-2 border border-slate-200 rounded-lg text-sm font-medium focus:border-blue-500 outline-none"
                                                    value={ratesData[t.key]?.min}
                                                    onChange={e => setRatesData({...ratesData, [t.key]: { ...ratesData[t.key], min: e.target.value }})}
                                                  />
                                              </div>
                                              <div>
                                                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">สูงสุด</label>
                                                  <input 
                                                    type="number" 
                                                    className="w-full p-2 border border-slate-200 rounded-lg text-sm font-medium focus:border-blue-500 outline-none"
                                                    value={ratesData[t.key]?.max}
                                                    onChange={e => setRatesData({...ratesData, [t.key]: { ...ratesData[t.key], max: e.target.value }})}
                                                  />
                                              </div>
                                          </div>

                                          <div>
                                              <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex justify-between">
                                                  <span>รับสูงสุด/เลข (อั้น)</span>
                                                  {Number(ratesData[t.key]?.limit) === 0 && <span className="text-green-600 text-[10px]">✅ ไม่อั้น</span>}
                                              </label>
                                              <input 
                                                type="number" 
                                                className={`w-full p-2 border rounded-lg text-sm font-medium focus:border-red-500 outline-none ${Number(ratesData[t.key]?.limit) === 0 ? 'bg-green-50 border-green-200 text-green-700' : 'border-slate-200'}`}
                                                value={ratesData[t.key]?.limit}
                                                onChange={e => setRatesData({...ratesData, [t.key]: { ...ratesData[t.key], limit: e.target.value }})}
                                              />
                                              <p className="text-[10px] text-slate-400 mt-1">* ใส่ 0 หากต้องการรับไม่อั้น</p>
                                          </div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>

                  {/* Footer */}
                  <div className="p-5 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end gap-3 shrink-0">
                      <button onClick={() => setShowModal(false)} className="px-5 py-3 rounded-xl text-slate-500 font-bold hover:bg-slate-200 transition-colors">
                          ยกเลิก
                      </button>
                      <button 
                        onClick={handleSubmit} 
                        disabled={isLoading} 
                        className={`px-8 py-3 font-bold rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2 ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-slate-800 hover:bg-black text-white'}`}
                      >
                          {isLoading ? <Loader2 className="animate-spin" /> : <><Save size={18} /> {editingId ? 'อัปเดตข้อมูล' : 'บันทึกข้อมูล'}</>}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}