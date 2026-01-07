import { useState, useEffect } from 'react';
import client from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { type CartItem } from '../../types/lotto';
import { v4 as uuidv4 } from 'uuid'; // npm install uuid @types/uuid ด้วยนะครับ
import { generateNumbers } from '../../types/lottoLogic';

export default function MemberKeypad() {
  const { user, fetchMe } = useAuth();
  
  // State
  const [number, setNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  // เพิ่ม State สำหรับเก็บรายการหวย
  const [lottos, setLottos] = useState<any[]>([]);
  // เปลี่ยน lottoId เป็น state ที่รอการเลือก
  const [lottoId, setLottoId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [note, setNote] = useState('');

  // ปุ่มประเภทหวย
  const betTypes = [
    { label: '2 ตัวบน', value: '2up' },
    { label: '2 ตัวล่าง', value: '2down' },
    { label: '3 ตัวตรง', value: '3top' },
    { label: '3 ตัวโต๊ด', value: '3tod' },
    { label: '19 ประตูบน', value: '19gate_up' },
    { label: '19 ประตูล่าง', value: '19gate_down' },
    { label: 'เลขวิ่งบน', value: 'run_up' },
    { label: 'เลขวิ่งล่าง', value: 'run_down' },
    { label: 'วิน 2 ตัวบน', value: 'win_2up' },
    { label: 'วิน 2 ตัวล่าง', value: 'win_2down' },
    { label: 'วิน 3 ตัว', value: 'win_3up' }
    // ... เพิ่มตามต้องการ

  ];
  
  const [selectedType, setSelectedType] = useState(betTypes[0].value);

  // 1. โหลด ID หวยรัฐบาลมาเก็บไว้ก่อน (Hardcode หรือ Fetch ก็ได้)
  useEffect(() => {
  const fetchLottos = async () => {
    try {
      const res = await client.get('/play/lottos');
      setLottos(res.data);

      // ถ้ามีหวย ให้เลือกตัวแรกเป็น Default เลย
      if (res.data.length > 0) {
        setLottoId(res.data[0].id);
      }
    } catch (err) {
      console.error("Failed to load lottos");
    }
  };
  fetchLottos();
}, []);

  // 2. ฟังก์ชันเพิ่มลงตะกร้า
  const addToCart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!number || !amount) return;

    let mode: 'normal' | '19gate' | 'win2' | 'win3' = 'normal';
    let coreType = selectedType; // Default

    // 1. ตรวจจับว่าเป็นประเภทพิเศษหรือไม่ และแปลงเป็น Core Type
    if (selectedType === '19gate_up') {
        mode = '19gate';
        coreType = '2up'; // ส่งไปหลังบ้านเป็น 2 ตัวบน
    } else if (selectedType === '19gate_down') {
        mode = '19gate';
        coreType = '2down'; // ส่งไปหลังบ้านเป็น 2 ตัวล่าง
    } else if (selectedType.includes('win')) {
        // เพิ่ม Logic วินถ้ามี
    }

    // 2. แตกเลข
    const numbersList = generateNumbers(number, mode);

    // 3. สร้างรายการลงตะกร้า
    const newItems = numbersList.map(num => ({
        temp_id: uuidv4(),
        number: num,
        bet_type: coreType as any, // บังคับเป็น Core Type
        amount: parseFloat(amount),
        display_text: `${selectedType} - ${num}` // โชว์ชื่อเดิม แต่เลขแตกแล้ว
    }));

    setCart([...cart, ...newItems]);
    setNumber('');
  };

  // 3. ฟังก์ชันส่งโพย (ยิง API จริง!)
  const submitTicket = async () => {
    if (cart.length === 0) return;
    if (!lottoId) {
       alert("กรุณาใส่ Lotto ID ใน Code หรือ Fetch มาก่อน");
       return;
    }

    setIsLoading(true);
    try {
      // แปลง CartItem ให้ตรงกับ Schema ที่ Backend ต้องการ (ตัด temp_id ออก)
      const payload = {
        lotto_type_id: lottoId,
        items: cart.map(({ temp_id, display_text, ...item }) => item),
        note: note
      };

      const res = await client.post('/play/submit_ticket', payload);
      alert(`ส่งโพยสำเร็จ! รหัสบิล: ${res.data.id}`);
      setCart([]); // ล้างตะกร้า
      
      // TODO: อาจจะ Refresh Credit User ตรงนี้
      await fetchMe();
      
    } catch (error: any) {
      alert(`ส่งไม่ผ่าน: ${error.response?.data?.detail || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 p-4 gap-4">
      {/* ฝั่งซ้าย: แผงกด */}
      <div className="w-2/3 bg-white p-6 rounded shadow-lg">
        <h2 className="text-xl font-bold mb-4">ร้าน: {user?.shop_id ? 'Mungmee Shop' : 'Loading...'}</h2>
        
        <form onSubmit={addToCart} className="space-y-4">
            {/* ส่วนเลือกประเภทหวย */}
            <div className="mb-4">
                <label className="block text-gray-700 font-bold mb-2">เลือกประเภทหวย</label>
                <select 
                    className="w-full p-2 border rounded"
                    value={lottoId}
                    onChange={(e) => setLottoId(e.target.value)}
                >
                    {lottos.map((lotto) => (
                    <option key={lotto.id} value={lotto.id}>
                        {lotto.name} (ปิด {lotto.close_time || '-'})
                    </option>
                    ))}
                </select>
            </div>

            <div className="mb-4">
                <label className="block text-gray-700 font-bold mb-2">รูปแบบการแทง</label>
                <div className="grid grid-cols-3 gap-2">
                    {betTypes.map((type) => (
                        <button
                        key={type.value}
                        type="button" // ต้องใส่ type="button" เพื่อไม่ให้มัน submit form
                        onClick={() => setSelectedType(type.value)}
                        className={`p-2 rounded border font-bold ${
                            selectedType === type.value 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-white text-gray-700 hover:bg-gray-100'
                        }`}
                        >
                        {type.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex gap-4">
                <input 
                    type="text" 
                    placeholder="เลข" 
                    className="border p-2 rounded w-1/2 text-2xl text-center"
                    value={number}
                    onChange={(e) => {
                        const val = e.target.value;
                        // กำหนดความยาวสูงสุดตามประเภท
                        let maxLength = 3; // ค่าปกติ
                        
                        // ถ้าเป็นกลุ่ม "วิน" ให้กรอกได้เยอะหน่อย (เช่น วิน 6 ตัว, 7 ตัว)
                        if (['win_2up', 'win_2down', 'win_3up'].includes(selectedType)) {
                            maxLength = 6; // วินได้สูงสุด 6 ตัวเลข (แล้วแต่ร้าน)
                        } 
                        
                        if (val.length <= maxLength) {
                            setNumber(val);
                        }
                    }}
                    autoFocus
                />
                <input 
                    type="number" 
                    placeholder="ราคา" 
                    className="border p-2 rounded w-1/2 text-2xl text-center"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                />
            </div>
            <div className="mb-4">
                <label className="block text-gray-700 font-bold mb-2">หมายเหตุ</label>
                <input 
                    type="text" 
                    placeholder="เช่น ป้าแดง, พี่วิน" 
                    className="w-full p-2 border rounded text-lg"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                />
            </div>

            <button type="submit" className="w-full bg-green-600 text-white p-4 rounded text-xl font-bold">
                เพิ่มรายการ (Enter)
            </button>
        </form>
      </div>

      {/* ฝั่งขวา: ตะกร้า */}
      <div className="w-1/3 bg-white p-6 rounded shadow-lg flex flex-col">
        <h3 className="text-lg font-bold border-b pb-2">รายการ ({cart.length})</h3>
        
        <div className="flex-1 overflow-y-auto py-2 space-y-2">
          {cart.map((item) => (
            <div key={item.temp_id} className="flex justify-between bg-gray-50 p-2 rounded border">
              <span>{item.display_text}</span>
              <span className="font-bold">{item.amount} บ.</span>
              <button onClick={() => setCart(cart.filter(c => c.temp_id !== item.temp_id))} className="text-red-500">
                X
              </button>
            </div>
          ))}
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between text-xl font-bold mb-4">
            <span>รวม</span>
            <span>{cart.reduce((sum, item) => sum + item.amount, 0)} บ.</span>
          </div>
          
          <button 
            onClick={submitTicket} 
            disabled={isLoading || cart.length === 0}
            className={`w-full p-4 rounded text-white font-bold ${isLoading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {isLoading ? 'กำลังส่ง...' : 'ยืนยันส่งโพย'}
          </button>
        </div>
      </div>
    </div>
  );
}