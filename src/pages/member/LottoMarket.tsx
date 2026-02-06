// ============================================
// LottoMarket - Optimized & Production-Ready
// ============================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import { supabase } from '../../utils/supabaseClient';
import { 
  Sparkles, Search, Clock, Layers, Loader2, AlertCircle
} from 'lucide-react';
import type { LottoType, Category } from '../../types/lotto';
import { 
  checkIsOpen, 
  getCloseDate, 
  getCategoryColorStyle,
  TIME_CONSTANTS,
  sortLottos
} from '../../utils/lottoHelpers';
import { getCategoryIcon } from '../../components/lotto/CategoryIcon';
import LottoCard from '../../components/lotto/LottoCard';

// ============================================
// Main Component
// ============================================

export default function LottoMarket() {
  // --- State Management ---
  const [lottos, setLottos] = useState<LottoType[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [now, setNow] = useState(new Date());
  const [filter, setFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  
  const navigate = useNavigate();

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [resLottos, resCats] = await Promise.all([
        client.get('/play/lottos'),
        client.get('/play/categories')
      ]);
      
      setLottos(resLottos.data);
      setCategories(resCats.data);
    } catch (err: any) {
      console.error("Failed to load market data", err);
      setError('ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --- Initial Load ---
  useEffect(() => {
    fetchData();
    
    // ✅ อัปเดตเวลาทุก 30 วินาที (แทน 1 วินาที) เพื่อประหยัด CPU
    const timer = setInterval(() => {
      setNow(new Date());
    }, TIME_CONSTANTS.UPDATE_INTERVAL);
    
    return () => clearInterval(timer);
  }, [fetchData]);

  // --- Realtime Subscription (with Error Handling) ---
  useEffect(() => {
    const channel = supabase
      .channel('realtime-lottos-market')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'lotto_types' },
        (payload) => {
          try {
            const updatedLotto = payload.new as LottoType;
            
            setLottos((prevLottos) => 
              prevLottos.map((l) => 
                l.id === updatedLotto.id ? { ...l, ...updatedLotto } : l
              )
            );
            
            console.log('✅ Realtime update:', updatedLotto.name);
          } catch (err) {
            console.error('❌ Realtime update error:', err);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime connected');
          setRealtimeStatus('connected');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Realtime connection error');
          setRealtimeStatus('error');
        } else if (status === 'CLOSED') {
          setRealtimeStatus('disconnected');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // --- Display Categories ---
  const displayCategories = useMemo(() => {
    return [
      { id: 'ALL', label: 'ทั้งหมด', color: '#2563EB', order_index: 0 } as Category, 
      ...categories
    ];
  }, [categories]);

  // --- Filter & Sort Lottos ---
  const getFilteredLottos = useCallback((categoryId: string) => {
    const filtered = lottos.filter(l => {
      const catMatch = categoryId === 'ALL' || l.category === categoryId;
      const searchMatch = l.name.toLowerCase().includes(searchTerm.toLowerCase());
      return catMatch && searchMatch;
    });

    return sortLottos(filtered, categories, now);
  }, [lottos, categories, now, searchTerm]);

  // --- Calculate Urgent Lottos (< 1 hour) ---
  const urgentLottos = useMemo(() => {
    return lottos
      .filter(l => {
        const isOpen = checkIsOpen(l, now);
        if (!isOpen) return false;
        
        const closeDate = getCloseDate(l, now);
        if (!closeDate) return false;
        
        const diff = closeDate.getTime() - now.getTime();
        return diff > 0 && diff <= TIME_CONSTANTS.ONE_HOUR;
      })
      .sort((a, b) => {
        const dateA = getCloseDate(a, now);
        const dateB = getCloseDate(b, now);
        return (dateA?.getTime() || 0) - (dateB?.getTime() || 0);
      });
  }, [lottos, now]);

  // --- Navigation Handler ---
  const handleNavigate = useCallback((lottoId: string) => {
    navigate(`/play/${lottoId}`);
  }, [navigate]);

  // --- Loading State ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
          <p className="text-gray-600 font-medium">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  // --- Error State ---
  if (error) {
    return (
      <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-lg max-w-md text-center">
          <AlertCircle className="text-red-500 mx-auto mb-4" size={48} />
          <h2 className="text-xl font-bold text-gray-800 mb-2">เกิดข้อผิดพลาด</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={fetchData}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
          >
            <Loader2 size={18} /> ลองอีกครั้ง
          </button>
        </div>
      </div>
    );
  }

  // --- Main Render ---
  return (
    <div className="min-h-screen bg-[#f1f5f9] pb-24 font-sans">
      
      {/* Header & Search */}
      <div className="bg-white text-gray-800 pt-4 pb-4 px-4 shadow-sm relative z-20">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold flex items-center gap-2 text-[#1e293b]">
            <Sparkles className="text-blue-600" size={20} /> ตลาดหวย
          </h1>
          <div className="text-xs text-gray-500 flex items-center gap-2">
            {/* Realtime Status Indicator */}
            <div className={`w-2 h-2 rounded-full ${
              realtimeStatus === 'connected' ? 'bg-green-500' : 
              realtimeStatus === 'error' ? 'bg-red-500' : 
              'bg-gray-400'
            }`} title={`Realtime: ${realtimeStatus}`} />
            {now.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'short' })}
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="ค้นหาชื่อหวย..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-100 border border-gray-200 text-gray-700 placeholder-gray-400 pl-9 pr-4 py-2 rounded-lg focus:outline-none focus:bg-white focus:border-blue-500 text-sm transition-all"
          />
        </div>
      </div>

      {/* Categories Bar */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 py-2 px-4 shadow-sm overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {displayCategories.map(cat => {
            const isSelected = filter === cat.id;
            const style = isSelected ? 
              (cat.id === 'ALL' ? { backgroundColor: '#2563EB' } : getCategoryColorStyle(cat)) 
              : {};
            
            return (
              <button
                key={cat.id}
                onClick={() => setFilter(cat.id)}
                style={style}
                className={`
                  whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-all border
                  ${isSelected 
                    ? 'text-white border-transparent shadow-sm' 
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }
                `}
              >
                {cat.id !== 'ALL' ? getCategoryIcon(cat.label) : null}
                {cat.id === 'ALL' && <Layers size={14}/>}
                {cat.label}
              </button>
            );
          })}
          
          {/* Empty State for Categories */}
          {displayCategories.length === 1 ? (
            <div className="text-xs text-gray-400 italic px-2 py-1">
              ยังไม่มีหมวดหมู่
            </div>
          ) : null}
        </div>
      </div>

      {/* Content Grid */}
      <div className="p-4">
        {filter === 'ALL' && searchTerm === '' ? (
          <div className="space-y-6">
            
            {/* 🔥 โซนหวยด่วน (ปิดใน 1 ชม.) */}
            {urgentLottos.length > 0 && (
              <div className="animate-in slide-in-from-top-4 fade-in duration-500">
                <h2 className="text-sm font-black text-red-600 mb-3 pl-2 border-l-4 border-red-500 flex items-center gap-2">
                  <Clock size={18} className="animate-pulse" /> โค้งสุดท้าย (ปิดใน 1 ชม.)
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 bg-red-50/50 p-3 rounded-xl border border-red-100 shadow-inner mb-6">
                  {urgentLottos.map(lotto => (
                    <LottoCard 
                      key={`urgent-${lotto.id}`} 
                      lotto={lotto} 
                      now={now}
                      onNavigate={handleNavigate}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Categories Section */}
            {displayCategories.slice(1).map(cat => {
              const catLottos = getFilteredLottos(cat.id);
              if (catLottos.length === 0) return null;

              return (
                <div key={cat.id}>
                  <h2 
                    className="text-sm font-bold text-gray-700 mb-3 pl-2 border-l-4 flex items-center gap-2"
                    style={{ borderColor: cat.color?.startsWith('#') ? cat.color : '#3B82F6' }}
                  >
                    <span>{getCategoryIcon(cat.label)}</span>
                    {cat.label}
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {catLottos.map(lotto => (
                      <LottoCard 
                        key={lotto.id} 
                        lotto={lotto} 
                        now={now}
                        onNavigate={handleNavigate}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Filtered View
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {getFilteredLottos(filter).map(lotto => (
              <LottoCard 
                key={lotto.id} 
                lotto={lotto} 
                now={now}
                onNavigate={handleNavigate}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {getFilteredLottos(filter).length === 0 && (
          <div className="text-center py-20 text-gray-400 text-sm flex flex-col items-center">
            <Search className="mb-2 opacity-30" size={48} />
            <p>ไม่พบรายการหวยที่เปิดรับ</p>
            <button 
              onClick={() => { 
                setFilter('ALL'); 
                setSearchTerm(''); 
              }} 
              className="mt-2 text-blue-500 underline text-xs hover:text-blue-700"
            >
              ดูทั้งหมด
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
