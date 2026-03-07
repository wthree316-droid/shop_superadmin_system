// src/components/common/TicketDetailModal.tsx
import { useEffect, useState } from 'react';
import client from '../../api/client';
import { X, Loader2 } from 'lucide-react';

interface TicketDetailModalProps {
    ticket: any;
    onClose: () => void;
    onCancelTicket: (ticketId: string) => void;
    closedText?: string; 
}

export default function TicketDetailModal({ ticket, onClose, onCancelTicket, closedText = "คืนทุน" }: TicketDetailModalProps) {
    const [ticketItems, setTicketItems] = useState<any[]>([]);
    const [loadingItems, setLoadingItems] = useState(false);

    // 🌟 ดึงข้อมูลอัตโนมัติเมื่อ ticket มีการเปลี่ยนแปลง (เปิด Modal)
    useEffect(() => {
        if (!ticket) {
            setTicketItems([]);
            return;
        }
        
        const fetchItems = async () => {
            setLoadingItems(true);
            try {
                const res = await client.get(`/play/tickets/${ticket.id}/items`);
                setTicketItems(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoadingItems(false);
            }
        };

        fetchItems();
    }, [ticket]);

    if (!ticket) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
                
                {/* --- Header --- */}
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800">รายละเอียดบิล</h3>
                        <div className="text-xs text-slate-500">#{ticket.id.substring(0, 8)}...</div>
                        {/* แสดงชื่อคนซื้อ (เฉพาะหน้า ShopHistory ที่มีข้อมูลนี้) */}
                        {ticket.user?.username && (
                            <div className="text-xs text-blue-600 font-bold mt-1">ผู้ซื้อ: {ticket.user.username}</div>
                        )}
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors"><X size={20} /></button>
                </div>

                {/* --- Body (รายการเลข) --- */}
                <div className="p-4 overflow-y-auto bg-white flex-1 custom-scrollbar">
                    {loadingItems ? (
                        <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                            <Loader2 className="animate-spin mb-2 text-blue-500" size={32} />
                            <span>กำลังโหลดรายการเลข...</span>
                        </div>
                    ) : ticketItems.length === 0 ? (
                        <div className="text-center py-10 text-slate-400">ไม่พบรายการเลข หรือบิลถูกยกเลิก</div>
                    ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-100 font-bold text-xs uppercase text-slate-500">
                            <tr>
                                    <th className="p-3 text-left">เลข</th>
                                    <th className="p-3 text-left">ประเภท</th>
                                    <th className="p-3 text-right">เรท</th>
                                    <th className="p-3 text-right">ราคา</th>
                                    <th className="p-3 text-right">รวม</th>
                                    <th className="p-3 text-center">ผล</th>
                                </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {ticketItems.map((item: any, i: number) => {
                                const isClosed = Number(item.reward_rate) === 0;
                                const potentialReward = Number(item.amount) * Number(item.reward_rate);
                                const translateType = (type: string) => {
                                    const map: Record<string, string> = {
                                        '2up': '2ตัวบน', '2down': '2ตัวล่าง',
                                        '3top': '3ตัวตรง', '3tod': '3ตัวโต๊ด',
                                        'run_up': 'วิ่งบน', 'run_down': 'วิ่งล่าง'
                                    };
                                    return map[type] || type;
                                };
                                return (
                                    <tr key={i} className={isClosed ? 'bg-red-50/50' : (item.status === 'WIN' ? 'bg-green-50' : '')}>
                                        <td className="p-3 font-bold text-slate-700">
                                            <span className={isClosed ? 'line-through text-red-400' : ''}>{item.number}</span>
                                        </td>
                                        <td className="p-3 text-xs text-slate-500">{translateType(item.bet_type)}</td>
                                        
                                        {isClosed ? (
                                            <>
                                                <td colSpan={3} className="p-3 text-center">
                                                    <span className="text-[10px] font-bold text-red-500 border border-red-200 bg-white px-2 py-1 rounded-lg">
                                                        ปิดรับ ({closedText})
                                                    </span>
                                                </td>
                                                <td className="p-3 text-right">
                                                    <span className="text-slate-400 text-xs">-</span>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="p-3 text-right text-gray-500 text-xs">{Number(item.reward_rate).toLocaleString()}</td>
                                                <td className="p-3 text-right font-mono">{Number(item.amount).toLocaleString()}</td>
                                                <td className="p-3 text-right font-bold text-blue-600 text-xs">{potentialReward.toLocaleString()}</td>
                                                <td className="p-3 text-right">
                                                    {item.status === 'WIN' ? <span className="text-green-600 font-bold text-xs bg-green-100 px-2 py-1 rounded-full">ถูกรางวัล</span> : 
                                                    item.status === 'LOSE' ? <span className="text-red-400 text-xs">ไม่ถูก</span> : 
                                                    <span className="text-orange-400 text-xs font-medium">รอผล</span>}
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    )}
                </div>

                <div className="p-4 border-t bg-gray-50 space-y-3">
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">ยอดซื้อรวม:</span>
                            <span className="font-bold text-slate-800">{Number(ticket.total_amount).toLocaleString()} บาท</span>
                        </div>
                        <div className="flex justify-between items-center text-sm border-t border-dashed pt-2">
                            <span className="text-slate-500">ผลรางวัลรวม:</span>
                            {(() => {
                                // 🌟 แก้ไขตรงนี้: ให้คำนวณจาก ticketItems (State) แทน
                                const winAmount = ticketItems.reduce((acc, item) => {
                                    return acc + (item.status === 'WIN' ? Number(item.winning_amount || 0) : 0);
                                }, 0);
                                
                                return winAmount > 0 ? (
                                    <span className="font-bold text-green-600">+{Number(winAmount).toLocaleString()} บาท</span>
                                ) : ticket.status === 'PENDING' ? (
                                    <span className="font-bold text-orange-400">รอผลรางวัล</span>
                                ) : (
                                    <span className="font-bold text-red-500">ไม่ถูกรางวัล</span>
                                );
                            })()}
                        </div>
                    </div>
                    {ticket.status === 'PENDING' && (
                        <button 
                            onClick={() => onCancelTicket(ticket.id)} 
                            className="w-full py-3 bg-white text-red-600 font-bold rounded-xl border-2 border-red-100 hover:bg-red-50 hover:border-red-200 transition-all shadow-sm"
                        >
                            ยกเลิกบิลคืนเงิน
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
}