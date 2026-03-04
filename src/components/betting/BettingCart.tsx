import { useMemo } from 'react';
import { Copy, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { type CartItem } from '../../types/lotto';
import { getGroupedCartItems } from '../../utils/bettingHelpers';

export default function BettingCart({ cart, setCart, risks }: any) {
    if (cart.length === 0) return null;

    const copyGroupNumbers = (instances: any[]) => {
        const textToCopy = instances.map(inst => inst.number).join(',');
        navigator.clipboard.writeText(textToCopy).then(() => {
            toast.success('คัดลอกตัวเลขเรียบร้อย!');
        }).catch(() => {
            toast.error('คัดลอกไม่สำเร็จ');
        });
    };

    const deleteGroup = (items: CartItem[]) => {
        const ids = new Set(items.map(i => i.temp_id));
        setCart((prev: CartItem[]) => prev.filter(i => !ids.has(i.temp_id)));
    };

    const isItemClosed = (item: CartItem) => {
        return risks.some((r: any) => 
            r.number === item.number && 
            r.risk_type === 'CLOSE' && 
            (r.specific_bet_type === 'ALL' || r.specific_bet_type === item.bet_type)
        );
    };

    const groupedItems = useMemo(() => getGroupedCartItems(cart), [cart]);

    return (
        <div className="mt-6 space-y-3 animate-fade-in">
            {groupedItems.map((group: any) => (
                <div key={group.key} className="bg-white rounded-xl border border-gray-200 shadow-sm flex overflow-hidden">
                    
                    <div className="w-28 bg-blue-50 border-r border-blue-100 p-2 flex flex-col justify-center items-center text-center shrink-0">
                        <div className="font-bold text-slate-700 text-[10px] md:text-xs mb-1 line-clamp-2 leading-tight">
                            {group.labelStr}
                        </div>
                        <div className="text-xs md:text-sm font-black text-blue-600">
                            {group.priceStr}
                        </div>
                    </div>

                    <div className="flex-1 p-3 bg-white flex flex-wrap gap-2 items-center content-center">
                        {group.instances.map((inst: { number: string, items: CartItem[] }, idx: number) => {
                            const isHalf = inst.items.some(item => 
                                risks.some((r: any) => r.number === item.number && r.risk_type === 'HALF' && (r.specific_bet_type === 'ALL' || r.specific_bet_type === item.bet_type))
                            );
                            
                            const isClosed = inst.items.some(item => isItemClosed(item));
                            
                            return (
                                <div 
                                    key={`${group.key}-${inst.number}-${idx}`}
                                    className="relative group/chip cursor-text selectable-text"
                                >
                                    <span className={`font-mono font-bold text-base px-2 py-1 rounded border transition-colors flex items-center gap-1
                                        ${isClosed 
                                            ? 'bg-red-100 text-red-500 border-red-200 line-through opacity-75' 
                                            : 'text-slate-700 bg-gray-100 border-gray-200'
                                        }
                                    `}>
                                        {inst.number}
                                    </span>
                                    
                                    {isHalf && !isClosed && (
                                        <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3 z-10">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500 border border-white"></span>
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="w-10 bg-gray-50 border-l border-gray-100 flex flex-col shrink-0">
                        <button 
                            onClick={() => copyGroupNumbers(group.instances)}
                            data-ignore="true"
                            className="flex-1 flex items-center justify-center text-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors border-b border-gray-100"
                            title="คัดลอกตัวเลขทั้งหมด"
                        >
                            <Copy size={16} />
                        </button>
                        <button 
                            onClick={() => deleteGroup(group.allGroupItems)}
                            className="flex-1 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="ลบรายการนี้"
                            data-ignore="true"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>
            ))}
            
            <div className="text-right text-xs text-gray-400 px-1">
                รวม {cart.length} รายการ
            </div>
        </div>
    );
}