import { useState, useEffect } from 'react';
import { 
  Search, ExternalLink, Globe, 
  TrendingUp, Star, LayoutGrid, MapPin, 
  Clock, CheckCircle2, ChevronRight, Loader2, Ban,
  Landmark, BarChart3, Gem
} from 'lucide-react';
import client from '../../api/client';

// --------------------------------------------------------
// 🔗 Config: จับคู่รหัสหวย (Code) กับ ลิงก์ดูผล
// --------------------------------------------------------
const EXTERNAL_LINKS: Record<string, string> = {
    // --- รัฐบาลไทย/ออมสิน/ธกส ---
    'THAI_GOV': 'https://news.sanook.com/lotto/',
    'THAI_GOV_70': 'https://news.sanook.com/lotto/',
    'GSB': 'https://www.gsb.or.th/lotto/',
    'BAAC': 'https://www.baac.or.th/lottery',

    // --- ฮานอย ---
    'HANOI_HD': 'https://xosohd.com',
    'HANOI_STAR': 'https://minhngocstar.com',
    'HANOI_TV': 'https://minhngoctv.com/',
    'HANOI_KACHAD': 'https://xosoredcross.com/',
    'HANOI_SPL': 'http://www.xsthm.com/',
    'HANOI_SAMAK': 'https://xosounion.com',
    'HANOI_NORM': 'https://www.minhngoc.net.vn/xo-so-truc-tiep/mien-bac.html',
    'HANOI_VIP': 'http://www.mlnhngoc.net/',
    'HANOI_PATT': 'https://xosodevelop.com',
    'HANOI_EXTRA': 'www.xosoextra.com',
    'HANOI_ASEAN': 'https://hanoiasean.com',
    'HANOI_SPEC': 'https://xoso.com.vn',
    'VIET_M_VIP': 'https://vnindexvip.com',
    'VIET_A_VIP': 'https://vnindexvip.com',
    'VIET_E_VIP': 'https://vnindexvip.com',

    // --- ลาว ---
    'LAO_TV': 'https://lao-tv.com',
    'LAO_HD': 'https://laoshd.com/',
    'LAO_STAR': 'www.laostars.com',
    'LAO_STOCK_VIP': 'https://lsxvip.com',
    'LAO_SAMAK': 'www.laounion.com',
    'LAO_ASEAN': 'https://lotterylaosasean.com/',
    'LAO_SAMAK_VIP': 'https://laounionvip.com',
    'LAO_STAR_VIP': 'www.laostarsvip.com',
    'LAO_KACHAD': 'https://lao-redcross.com',
    'LAO_EXTRA': 'https://laoextra.com/',
    'LAO_PRATU': 'https://laopatuxay.com',
    'LAO_SANTI': 'https://laosantipap.com',
    'LAO_PRACHA': 'https://laocitizen.com',
    'LAO_DEV': 'https://laodl.com/',

    // --- แม่โขง (อื่นๆ) ---
    'MK_TODAY': 'https://maekhongtoday.com',
    'MK_HD': 'https://MaeKhongHD.com',
    'MK_MEGA': 'https://MaeKhongMega.com',
    'MK_STAR': 'https://maekhongstar.com',
    'MK_PLUS': 'https://MaeKhongPlus.com',
    'MK_SPEC': 'https://maekhongspecial.com',
    'MK_NORM': 'https://laomaekhong.com',
    'MK_VIP': 'https://maekhongvip.com',
    'MK_PATT': 'https://maekhongphatthana.com',
    'MK_GOLD': 'https://MaeKhongGold.com',
    'MK_NIGHT': 'https://MaeKhongNight.com',

    // --- หุ้น / VIP / ดาวโจนส์ ---
    'ENGLAND': 'https://lottosuperrich.com/',
    'ENGLAND_VIP': 'https://lottosuperrich.com/',
    'GERMANY': 'https://lottosuperrich.com/',
    'GERMANY_VIP': 'https://lottosuperrich.com/',
    'RUSSIA': 'https://lottosuperrich.com/',
    'RUSSIA_VIP': 'https://lottosuperrich.com/',
    
    'DOW_VIP': 'https://stocks-vip.com',
    'DOW_USA': 'https://stocks-vip.com',
    'DOWJONES': 'https://stocks-vip.com',
    'DOW_STAR': 'https://dowjonestar.com/',
    'DOW_MID': 'https://dowjones-midnight.com',
    'DOW_EXTRA': 'https://dowjonesextra.com',
    'DOW_TV': 'https://tvdowjones.com',

    'NIKKEI_M_VIP': 'nikkeivipstock.com',
    'NIKKEI_A_VIP': 'nikkeivipstock.com',
    'CHINA_M_VIP': 'https://shenzhenindex.com',
    'CHINA_A_VIP': 'https://shenzhenindex.com',
    'HANGSENG_M_VIP': 'hangsengvip.com',
    'HANGSENG_A_VIP': 'hangsengvip.com',
    'TAIWAN_VIP': 'https://tsecvipindex.com',
    'KOREA_VIP': 'ktopvipindex.com',
    'SINGAPORE_VIP': 'https://stocks-vip.com/',
    'INDIA_VIP': 'https://stocks-vip.com/',
    
    // หุ้นปกติ
    'NIKKEI_M': 'https://nikkei225.jp/',
    'NIKKEI_A': 'https://nikkei225.jp/',
    'CHINA_M': 'https://th.investing.com/indices/szse-component',
    'CHINA_A': 'https://th.investing.com/indices/szse-component',
    'HANGSENG_M': 'https://www.hsi.com.hk/',
    'HANGSENG_A': 'https://www.hsi.com.hk/',
    'TAIWAN': 'https://www.twse.com.tw/',
    'KOREA': 'https://finance.yahoo.com/quote/%5EKS11/',
    'SINGAPORE': 'https://www.sgx.com/',
    'INDIA': 'https://www.bseindia.com/',
    'EGYPT': 'https://www.investing.com/indices/egx30',
};

// --------------------------------------------------------
// 📂 Categories
// --------------------------------------------------------
const CATEGORIES = [
    { id: 'ALL', label: 'ทั้งหมด', icon: LayoutGrid, color: 'from-slate-700 to-slate-900' },
    { id: 'THAI', label: 'หวยรัฐบาลไทย', icon: Landmark, color: 'from-red-600 to-red-900' },
    { id: 'HANOI', label: 'หวยฮานอย', icon: Star, color: 'from-orange-500 to-orange-800' },
    { id: 'LAOS', label: 'หวยลาว', icon: MapPin, color: 'from-emerald-600 to-emerald-900' },
    { id: 'STOCKS', label: 'หวยหุ้น', icon: BarChart3, color: 'from-pink-600 to-pink-900' },
    { id: 'STOCKSVIP', label: 'หวยหุ้นVIP', icon: Gem, color: 'from-purple-600 to-purple-900' },
    { id: 'DOW', label: 'หวยดาวโจนส์', icon: TrendingUp, color: 'from-rose-700 to-rose-950' },
    { id: 'OTHERS', label: 'หวยอื่นๆ', icon: Globe, color: 'from-blue-600 to-blue-900' },
];

export default function LottoResultLinks() {
    const [lottos, setLottos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('ALL');

    useEffect(() => {
        const fetchLottos = async () => {
            try {
                const res = await client.get('/play/lottos');
                const activeLottos = res.data.filter((l: any) => l.is_active);
                setLottos(activeLottos);
            } catch (err) {
                console.error("Failed to fetch lottos", err);
            } finally {
                setLoading(false);
            }
        };
        fetchLottos();
    }, []);

    const ensureHttp = (url: string) => {
        if (!url || url === '-') return '#';
        if (!/^https?:\/\//i.test(url)) return `https://${url}`;
        return url;
    };

    // --- Logic การกรองแบบใหม่ ---
    const filteredLottos = lottos.filter(item => {
        const code = item.code.toUpperCase();
        
        // 1. ค้นหาจากชื่อ หรือ รหัส
        const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            code.includes(searchQuery.toUpperCase());
        
        // 2. กรองหมวดหมู่
        let matchCategory = true;
        if (activeTab !== 'ALL') {
            if (activeTab === 'THAI') {
                matchCategory = code.startsWith('THAI') || code.startsWith('GSB') || code.startsWith('BAAC');
            } 
            else if (activeTab === 'HANOI') {
                matchCategory = code.startsWith('HANOI') || code.startsWith('VIET');
            } 
            else if (activeTab === 'LAOS') {
                matchCategory = code.startsWith('LAO');
            } 
            else if (activeTab === 'DOW') {
                matchCategory = code.startsWith('DOW');
            } 
            else if (activeTab === 'STOCKSVIP') {
                matchCategory = code.includes('VIP') && !code.startsWith('DOW') && !code.startsWith('LAO') && !code.startsWith('VIET');
            } 
            else if (activeTab === 'STOCKS') {
                const isVIP = code.includes('VIP');
                const isDow = code.startsWith('DOW');
                
                const stockPrefixes = ['NIKKEI', 'CHINA', 'HANGSENG', 'TAIWAN', 'KOREA', 'SINGAPORE', 'INDIA', 'EGYPT', 'MALAYSIA', 'ENGLAND', 'GERMANY', 'RUSSIA', 'EURO'];
                matchCategory = !isVIP && !isDow && stockPrefixes.some(p => code.startsWith(p));
            } 
            else if (activeTab === 'OTHERS') {
                matchCategory = code.startsWith('MK_') || code.startsWith('YIKI') || code.startsWith('OTHER');
            }
        }

        return matchSearch && matchCategory;
    });

    return (
        <div className="min-h-screen bg-[#0F172A] pb-24 text-white font-sans">
            
            {/* --- Header Section --- */}
            <div className="bg-linear-to-b from-[#1E293B] to-[#0F172A] border-b border-white/5 sticky top-0 z-30 pt-4 pb-2 shadow-2xl">
                <div className="px-4 max-w-lg mx-auto">
                    <h1 className="text-2xl font-black text-transparent bg-clip-text bg-linear-to-r from-[#FFD700] via-[#FDB931] to-[#FFD700] text-center mb-4 flex items-center justify-center gap-2 drop-shadow-lg">
                        <Globe className="text-[#FDB931]" strokeWidth={2.5} /> 
                        ผลรางวัล
                    </h1>

                    {/* Search Bar */}
                    <div className="relative mb-4">
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อหวย... (เช่น ฮานอย, ลาว)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all shadow-inner"
                        />
                        <Search className="absolute left-4 top-3 text-slate-500" size={18} />
                    </div>

                    {/* Category Tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                        {CATEGORIES.map(cat => {
                            const isActive = activeTab === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveTab(cat.id)}
                                    className={`
                                        flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-300
                                        ${isActive 
                                            ? 'bg-linear-to-r from-[#d4af37] to-amber-600 text-white shadow-lg shadow-amber-900/40 scale-105 border border-amber-400/50' 
                                            : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-700'
                                        }
                                    `}
                                >
                                    <cat.icon size={14} />
                                    {cat.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* --- Content Area --- */}
            <div className="max-w-lg mx-auto p-4 space-y-3">
                
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="animate-spin text-[#d4af37]" size={40} />
                    </div>
                ) : filteredLottos.length === 0 ? (
                    <div className="text-center py-16 text-slate-500 opacity-60">
                        <Search size={48} className="mx-auto mb-2 opacity-50" />
                        <p>ไม่พบรายการที่ค้นหา</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {filteredLottos.map((item) => {
                            const linkUrl = EXTERNAL_LINKS[item.code];
                            const hasLink = !!linkUrl;

                            let matchedCat = CATEGORIES[0];
                            const code = item.code.toUpperCase();
                            if (code.startsWith('THAI') || code.startsWith('GSB')) matchedCat = CATEGORIES.find(c => c.id === 'THAI')!;
                            else if (code.startsWith('HANOI') || code.startsWith('VIET')) matchedCat = CATEGORIES.find(c => c.id === 'HANOI')!;
                            else if (code.startsWith('LAO')) matchedCat = CATEGORIES.find(c => c.id === 'LAOS')!;
                            else if (code.startsWith('DOW')) matchedCat = CATEGORIES.find(c => c.id === 'DOW')!;
                            else if (code.includes('VIP')) matchedCat = CATEGORIES.find(c => c.id === 'STOCKSVIP')!;
                            else if (code.startsWith('MK_')) matchedCat = CATEGORIES.find(c => c.id === 'OTHERS')!;
                            else if (['NIKKEI','CHINA','HANGSENG'].some(p => code.startsWith(p))) matchedCat = CATEGORIES.find(c => c.id === 'STOCKS')!;

                            const bgGradient = matchedCat?.color || 'from-slate-800 to-slate-900';

                            return (
                                <div 
                                    key={item.id} 
                                    className={`
                                        relative overflow-hidden rounded-2xl p-0.5
                                        bg-linear-to-br from-white/10 to-transparent
                                        hover:from-[#d4af37]/50 hover:to-transparent transition-all duration-300 group
                                    `}
                                >
                                    <div className="bg-[#1e293b] rounded-[14px] p-3 h-full flex flex-col relative z-10">
                                        
                                        {/* Header: รูป + ชื่อ */}
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="relative w-10 h-10 rounded-full bg-slate-900 border border-slate-600 shadow-sm overflow-hidden shrink-0">
                                                    {item.img_url ? (
                                                        <img 
                                                            src={item.img_url} 
                                                            alt={item.name} 
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).style.display = 'none';
                                                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                                            }}
                                                        />
                                                    ) : null}
                                                    {/* Fallback Icon */}
                                                    {/* ✅ แก้ไขจุด CSS Conflict: ถ้าไม่มีรูปให้แสดง flex ถ้ามีให้ซ่อน */}
                                                    <div className={`absolute inset-0 items-center justify-center bg-slate-800 text-slate-500 ${!item.img_url ? 'flex' : 'hidden'}`}>
                                                        <Globe size={18} />
                                                    </div>
                                                </div>

                                                <div className="min-w-0">
                                                    <h3 className="font-bold text-slate-100 text-sm leading-tight group-hover:text-[#d4af37] transition-colors truncate pr-2">
                                                        {item.name}
                                                    </h3>
                                                    {item.code.includes('VIP') && (
                                                        <span className="inline-block text-[9px] px-1.5 py-0.5 bg-linear-to-r from-amber-500 to-orange-500 rounded text-black font-bold mt-0.5">
                                                            VIP
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {hasLink ? (
                                                <a 
                                                    href={ensureHttp(linkUrl)} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-slate-600 group-hover:text-white transition-colors"
                                                >
                                                    <ExternalLink size={16} />
                                                </a>
                                            ) : (
                                                <span className="text-slate-700 cursor-not-allowed">
                                                    <Ban size={16} />
                                                </span>
                                            )}
                                        </div>

                                        {/* Time Info */}
                                        <div className="flex items-center justify-between text-xs bg-slate-900/50 rounded-lg p-2 mb-3 border border-slate-700/50">
                                            <div className="flex flex-col items-center flex-1 border-r border-slate-700/50 pr-2">
                                                <span className="text-red-400 font-medium mb-0.5 flex items-center gap-1">
                                                    <Clock size={10} /> ปิดรับ
                                                </span>
                                                <span className="text-white font-mono">{item.close_time?.substring(0, 5) || '-'}</span>
                                            </div>
                                            <div className="flex flex-col items-center flex-1 pl-2">
                                                <span className="text-emerald-400 font-medium mb-0.5 flex items-center gap-1">
                                                    <CheckCircle2 size={10} /> ผลออก
                                                </span>
                                                <span className="text-white font-mono">{item.result_time?.substring(0, 5) || '-'}</span>
                                            </div>
                                        </div>

                                        {/* Action Button */}
                                        {hasLink ? (
                                            <a 
                                                href={ensureHttp(linkUrl)} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className={`
                                                    mt-auto w-full py-2 rounded-lg 
                                                    bg-linear-to-r from-slate-700 to-slate-800 
                                                    border border-slate-600
                                                    text-slate-300 font-medium text-xs
                                                    flex items-center justify-center gap-2
                                                    hover:bg-linear-to-r ${bgGradient}
                                                    group-hover:text-white group-hover:border-transparent group-hover:font-bold
                                                    transition-all duration-300 shadow-lg
                                                `}
                                            >
                                                <span>ไปที่หน้าผลรางวัล</span>
                                                <ChevronRight size={14} />
                                            </a>
                                        ) : (
                                            <button 
                                                disabled
                                                className="
                                                    mt-auto w-full py-2 rounded-lg 
                                                    bg-slate-800/50 border border-slate-700
                                                    text-slate-600 font-medium text-xs
                                                    flex items-center justify-center gap-2 cursor-not-allowed
                                                "
                                            >
                                                <span>ไม่มีลิงก์ดูผล</span>
                                            </button>
                                        )}

                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}