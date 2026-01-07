import { useState, useEffect } from 'react';
import client from '../../api/client';
import { 
    FileSpreadsheet, Plus, Trash2, X, Save, Pencil, 
    Settings2, Coins, AlertTriangle 
} from 'lucide-react';

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

export default function ManageRates() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // State
  const [editingId, setEditingId] = useState<string | null>(null); 
  const [profileName, setProfileName] = useState('');
  const [ratesData, setRatesData] = useState<any>({}); 
  const [activeMobileTab, setActiveMobileTab] = useState<string>(BET_TYPES[0].key); // สำหรับ Mobile Tab

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const res = await client.get('/play/rates');
      setProfiles(res.data);
    } catch (err) { console.error(err); }
  };

  const normalizeRateData = (rawData: any) => {
      const normalized: any = {};
      BET_TYPES.forEach(t => {
          const val = rawData[t.key];
          if (typeof val === 'object' && val !== null) {
              normalized[t.key] = { ...val }; 
          } else {
              normalized[t.key] = { ...defaultRateSettings, pay: val || '' };
          }
      });
      return normalized;
  };

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setProfileName('');
    const emptyData: any = {};
    BET_TYPES.forEach(t => { emptyData[t.key] = { ...defaultRateSettings }; });
    setRatesData(emptyData);
    setShowModal(true);
  };

  const handleOpenEditModal = (profile: any) => {
      setEditingId(profile.id);
      setProfileName(profile.name);
      setRatesData(normalizeRateData(profile.rates)); 
      setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if(!confirm('ยืนยันลบโปรไฟล์นี้? หากมีหวยใช้งานอยู่จะไม่สามารถลบได้')) return;
    try {
        await client.delete(`/play/rates/${id}`);
        fetchProfiles();
    } catch(err) { alert('ลบไม่สำเร็จ (อาจมีการใช้งานอยู่)'); }
  };

  const handleSubmit = async () => {
    if (!profileName) return alert('กรุณาตั้งชื่อโปรไฟล์');
    setIsLoading(true);

    try {
        const finalRates: any = {};
        BET_TYPES.forEach(t => {
            const d = ratesData[t.key] || defaultRateSettings;
            finalRates[t.key] = {
                pay: Number(d.pay) || 0,
                min: Number(d.min) || 1,
                max: Number(d.max) || 0,
                limit: Number(d.limit) || 0
            };
        });

        if (editingId) {
            // Logic แก้ไข (ถ้าระบบรองรับ PUT) - ตอนนี้ใช้ Create ใหม่แล้วลบเก่าไปก่อนตามโค้ดเดิม
             alert('ระบบแนะนำให้สร้างใหม่เพื่อความปลอดภัยของข้อมูลการเงิน');
        } else {
            await client.post('/play/rates', {
                name: profileName,
                rates: finalRates
            });
            alert('บันทึกสำเร็จ!');
            setShowModal(false);
            fetchProfiles();
        }

    } catch (err) {
        alert('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
        setIsLoading(false);
    }
  };

  const getVal = (rateObj: any, field: string) => {
    if (typeof rateObj === 'object' && rateObj !== null) return rateObj[field];
    if (field === 'pay') return rateObj; 
    if (field === 'min') return 1;
    return 0; 
  };

  return (
    <div className="animate-fade-in p-4 md:p-6 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2 tracking-tight">
                <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-200 text-white">
                    <FileSpreadsheet size={24} />
                </div>
                จัดการเรทราคา
            </h2>
            <p className="text-slate-500 text-sm mt-1 ml-1">กำหนดอัตราจ่ายและลิมิตความเสี่ยง</p>
        </div>
        <button 
            onClick={handleOpenCreateModal} 
            className="w-full md:w-auto bg-slate-800 text-white px-5 py-3 rounded-xl font-bold shadow-lg hover:bg-black hover:scale-105 transition-all flex gap-2 items-center justify-center"
        >
            <Plus size={20} /> สร้างโปรไฟล์ใหม่
        </button>
      </div>

      {/* Profile Cards Grid */}
      <div className="grid grid-cols-1 gap-6">
        {profiles.map((profile) => (
            <div key={profile.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                
                {/* Profile Header */}
                <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-white p-2 rounded-xl border border-slate-200 text-slate-600 shadow-sm">
                            <Settings2 size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-800">{profile.name}</h3>
                            <p className="text-xs text-slate-400">Rate Profile ID: {profile.id.substring(0,8)}...</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                         <button onClick={() => handleOpenEditModal(profile)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="ดู/แก้ไข">
                            <Pencil size={18} />
                        </button>
                        <button onClick={() => handleDelete(profile.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="ลบ">
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>

                {/* Desktop View: Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-center text-sm">
                        <thead className="bg-white text-slate-500 border-b border-slate-100">
                            <tr>
                                <th className="px-4 py-3 font-bold text-left w-32 border-r border-slate-100">ประเภท</th>
                                {BET_TYPES.map(t => (
                                    <th key={t.key} className={`px-4 py-3 font-bold min-w-25 ${t.color}`}>{t.label}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {/* Rows */}
                            {['pay', 'min', 'max', 'limit'].map((field) => (
                                <tr key={field} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-4 py-3 font-bold text-left text-slate-600 border-r border-slate-100 uppercase text-xs tracking-wider">
                                        {field === 'pay' ? 'อัตราจ่าย' : field === 'min' ? 'ขั้นต่ำ' : field === 'max' ? 'สูงสุด/ไม้' : 'ลิมิตอั้น'}
                                    </td>
                                    {BET_TYPES.map(t => {
                                        const val = getVal(profile.rates[t.key], field);
                                        return (
                                            <td key={t.key} className={`px-4 py-3 font-mono ${field === 'pay' ? 'font-bold text-base' : 'text-slate-500'} ${field === 'pay' ? 'text-green-600' : field === 'limit' ? 'text-red-500' : ''}`}>
                                                {Number(val) > 0 ? Number(val).toLocaleString() : <span className="text-slate-300">-</span>}
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View: Compact Grid */}
                <div className="md:hidden p-4 grid grid-cols-2 gap-3">
                    {BET_TYPES.map(t => (
                        <div key={t.key} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                            <div className={`text-xs font-bold mb-2 ${t.color}`}>{t.label}</div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-400">จ่าย</span>
                                    <span className="font-bold text-green-600">{Number(getVal(profile.rates[t.key], 'pay')).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-400">ลิมิต</span>
                                    <span className="font-bold text-red-500">{Number(getVal(profile.rates[t.key], 'limit')).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        ))}
        {profiles.length === 0 && (
            <div className="text-center py-20 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-300">
                <FileSpreadsheet size={48} className="mx-auto mb-4 opacity-20" />
                <p>ยังไม่มีข้อมูลเรทราคา</p>
            </div>
        )}
      </div>

      {/* --- Modal สร้าง/แก้ไข --- */}
      {showModal && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95">
                  {/* Modal Header */}
                  <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <div>
                        <h3 className="font-bold text-xl text-slate-800">
                            {editingId ? 'รายละเอียดเรทราคา' : 'สร้างโปรไฟล์ใหม่'}
                        </h3>
                        <p className="text-xs text-slate-500">กำหนดเรทจ่ายและเงื่อนไขการรับแทง</p>
                      </div>
                      <button onClick={() => setShowModal(false)} className="bg-white p-2 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors shadow-sm border border-slate-200">
                          <X size={20} />
                      </button>
                  </div>

                  <div className="p-5 overflow-y-auto flex-1 bg-slate-50/50 custom-scrollbar">
                      {/* Name Input */}
                      <div className="mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">ชื่อโปรไฟล์ (เช่น เรทมาตรฐาน, เรท VIP)</label>
                          <input 
                            type="text" 
                            className="w-full bg-slate-50 border border-slate-200 p-3 rounded-lg font-bold text-lg text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder-slate-300"
                            placeholder="ตั้งชื่อโปรไฟล์..."
                            value={profileName}
                            onChange={e => setProfileName(e.target.value)}
                          />
                      </div>

                      {/* --- Desktop Form View --- */}
                      <div className="hidden md:block bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                          <table className="w-full text-sm">
                              <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-xs">
                                  <tr>
                                      <th className="p-4 text-left">ประเภทหวย</th>
                                      <th className="p-4 text-center w-36 text-green-700 bg-green-50/50">อัตราจ่าย</th>
                                      <th className="p-4 text-center w-28">ขั้นต่ำ</th>
                                      <th className="p-4 text-center w-32">สูงสุด/ไม้</th>
                                      <th className="p-4 text-center w-36 text-red-700 bg-red-50/50">ลิมิตอั้น/เลข</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                  {BET_TYPES.map((t) => (
                                      <tr key={t.key} className="hover:bg-slate-50 transition-colors">
                                          <td className="p-4 font-bold text-slate-700 flex items-center gap-2">
                                              <div className={`w-3 h-3 rounded-full ${t.bg.replace('bg-', 'bg-').replace('50', '500')}`}></div>
                                              {t.label}
                                          </td>
                                          <td className="p-3 bg-green-50/30">
                                              <div className="relative">
                                                  <input type="number" className="w-full bg-white border border-green-200 rounded-lg py-2 px-3 text-center font-bold text-green-700 focus:ring-2 focus:ring-green-200 outline-none"
                                                    placeholder="0"
                                                    value={ratesData[t.key]?.pay}
                                                    onChange={e => setRatesData({...ratesData, [t.key]: { ...ratesData[t.key], pay: e.target.value }})}
                                                  />
                                              </div>
                                          </td>
                                          <td className="p-3">
                                              <input type="number" className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-center text-slate-600 focus:border-blue-400 outline-none"
                                                value={ratesData[t.key]?.min}
                                                onChange={e => setRatesData({...ratesData, [t.key]: { ...ratesData[t.key], min: e.target.value }})}
                                              />
                                          </td>
                                          <td className="p-3">
                                              <input type="number" className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-center text-slate-600 focus:border-blue-400 outline-none"
                                                value={ratesData[t.key]?.max}
                                                onChange={e => setRatesData({...ratesData, [t.key]: { ...ratesData[t.key], max: e.target.value }})}
                                              />
                                          </td>
                                          <td className="p-3 bg-red-50/30">
                                              <input type="number" className="w-full bg-white border border-red-200 rounded-lg py-2 px-3 text-center font-bold text-red-600 focus:ring-2 focus:ring-red-200 outline-none"
                                                placeholder="0 = ไม่อั้น"
                                                value={ratesData[t.key]?.limit}
                                                onChange={e => setRatesData({...ratesData, [t.key]: { ...ratesData[t.key], limit: e.target.value }})}
                                              />
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>

                      {/* --- Mobile Form View (Tabs + Cards) --- */}
                      <div className="md:hidden">
                          {/* Horizontal Scroll Menu */}
                          <div className="flex overflow-x-auto gap-2 mb-4 pb-2 no-scrollbar">
                              {BET_TYPES.map(t => (
                                  <button
                                    key={t.key}
                                    onClick={() => setActiveMobileTab(t.key)}
                                    className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold border transition-all ${
                                        activeMobileTab === t.key 
                                        ? `${t.bg} ${t.color} border-${t.color.split('-')[1]}-200 shadow-sm` 
                                        : 'bg-white text-slate-500 border-slate-200'
                                    }`}
                                  >
                                      {t.label}
                                  </button>
                              ))}
                          </div>

                          {/* Card Content */}
                          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                              {BET_TYPES.filter(t => t.key === activeMobileTab).map(t => (
                                  <div key={t.key} className="space-y-4 animate-fade-in">
                                      <div className="flex items-center gap-2 mb-2">
                                          <div className={`w-2 h-6 rounded-full ${t.bg.replace('50', '500')}`}></div>
                                          <h4 className="font-bold text-lg text-slate-800">{t.label}</h4>
                                      </div>
                                      
                                      <div>
                                          <label className="text-xs font-bold text-green-600 mb-1 flex items-center gap-1"><Coins size={12}/> อัตราจ่าย (บาทละ)</label>
                                          <input type="number" className="w-full bg-green-50/50 border border-green-200 rounded-xl p-3 font-bold text-green-700 text-lg focus:ring-2 focus:ring-green-100 outline-none"
                                            placeholder="0"
                                            value={ratesData[t.key]?.pay}
                                            onChange={e => setRatesData({...ratesData, [t.key]: { ...ratesData[t.key], pay: e.target.value }})}
                                          />
                                      </div>

                                      <div className="grid grid-cols-2 gap-4">
                                          <div>
                                              <label className="block text-xs font-bold text-slate-500 mb-1">ขั้นต่ำ (บาท)</label>
                                              <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 font-bold focus:bg-white outline-none"
                                                value={ratesData[t.key]?.min}
                                                onChange={e => setRatesData({...ratesData, [t.key]: { ...ratesData[t.key], min: e.target.value }})}
                                              />
                                          </div>
                                          <div>
                                              <label className="block text-xs font-bold text-slate-500 mb-1">สูงสุด (บาท)</label>
                                              <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 font-bold focus:bg-white outline-none"
                                                value={ratesData[t.key]?.max}
                                                onChange={e => setRatesData({...ratesData, [t.key]: { ...ratesData[t.key], max: e.target.value }})}
                                              />
                                          </div>
                                      </div>

                                      <div>
                                          <label className="text-xs font-bold text-red-500 mb-1 flex items-center gap-1"><AlertTriangle size={12}/> ลิมิตรับ/เลข (บาท)</label>
                                          <input type="number" className="w-full bg-red-50/50 border border-red-200 rounded-xl p-3 font-bold text-red-600 focus:ring-2 focus:ring-red-100 outline-none"
                                            placeholder="0 = ไม่อั้น"
                                            value={ratesData[t.key]?.limit}
                                            onChange={e => setRatesData({...ratesData, [t.key]: { ...ratesData[t.key], limit: e.target.value }})}
                                          />
                                          <p className="text-[10px] text-slate-400 mt-1">* ใส่ 0 หากต้องการรับไม่อั้น</p>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>

                  {/* Footer */}
                  <div className="p-5 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
                      <button onClick={() => setShowModal(false)} className="px-5 py-3 rounded-xl text-slate-500 font-bold hover:bg-slate-200 transition-colors">
                          ยกเลิก
                      </button>
                      {!editingId && (
                          <button onClick={handleSubmit} disabled={isLoading} className="px-8 py-3 bg-slate-800 text-white font-bold rounded-xl shadow-lg hover:bg-black hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                              {isLoading ? 'กำลังบันทึก...' : <><Save size={18} /> บันทึกข้อมูล</>}
                          </button>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}