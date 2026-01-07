import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import { Search, Calendar, Trophy, ArrowRight, Loader2 } from 'lucide-react';

export default function MemberResults() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // [ใหม่] State ค้นหา
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const res = await client.get('/reward/history');
      setResults(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // [ใหม่] Logic กรองข้อมูล
  const filteredResults = results.filter(item => 
    item.lotto_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 pb-24 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Trophy className="text-yellow-500" /> ผลรางวัลย้อนหลัง
          </h1>
          <p className="text-gray-500 text-sm mt-1">ตรวจสอบผลรางวัลหวยทุกประเภท</p>
        </div>
        
        {/* Search Bar (ตกแต่ง) */}
        <div className="relative w-full md:w-64">
          <input 
            type="text" 
            placeholder="ค้นหาตามชื่อหวย..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
        </div>
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Loader2 className="animate-spin mb-2" size={32} />
            <p>กำลังโหลดข้อมูล...</p>
        </div>
      ) : filteredResults.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-200">
            <div className="text-4xl mb-2">📭</div>
            <p className="text-gray-500 font-medium">ไม่พบข้อมูลผลรางวัล</p>
            <p className="text-xs text-gray-400 mt-1">ลองเปลี่ยนคำค้นหา หรือรอผลรางวัลออก</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredResults.map((item) => (
            <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-300 group">
              {/* Card Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-4 text-white flex justify-between items-center">
                <h3 className="font-bold text-lg truncate pr-2">{item.lotto_name}</h3>
                <div className="flex items-center gap-1 text-blue-100 text-xs bg-white/20 px-2 py-1 rounded backdrop-blur-sm">
                  <Calendar size={12} />
                  {new Date(item.round_date).toLocaleDateString('th-TH', { 
                    day: 'numeric', month: 'short', year: '2-digit' 
                  })}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6">
                <div className="flex gap-4 text-center">
                  {/* 3 ตัวบน */}
                  <div className="flex-1 bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col justify-center min-h-[100px]">
                    <div className="text-[10px] text-gray-500 font-bold uppercase mb-1 tracking-wider">3 ตัวบน</div>
                    <div className={`text-3xl font-black tracking-widest ${item.top_3 ? 'text-gray-800' : 'text-gray-300 text-xl tracking-normal font-medium'}`}>
                      {item.top_3 || 'รอผล'}
                    </div>
                  </div>

                  {/* 2 ตัวล่าง */}
                  <div className="flex-1 bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col justify-center min-h-[100px]">
                    <div className="text-[10px] text-gray-500 font-bold uppercase mb-1 tracking-wider">2 ตัวล่าง</div>
                    <div className={`text-3xl font-black tracking-widest ${item.bottom_2 ? 'text-blue-600' : 'text-gray-300 text-xl tracking-normal font-medium'}`}>
                      {item.bottom_2 || 'รอผล'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer (Link ไปหน้า History) */}
              <div 
                className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-center cursor-pointer hover:bg-gray-100 transition-colors group/btn"
                onClick={() => navigate('/history')}
              >
                <span className="text-sm text-blue-600 font-bold flex items-center justify-center gap-1 group-hover/btn:translate-x-1 transition-transform">
                  ตรวจโพยของฉัน <ArrowRight size={14} />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}