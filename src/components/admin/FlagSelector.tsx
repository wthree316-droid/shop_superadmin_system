import { useState, useEffect, useRef } from 'react';
import client from '../../api/client';
import { Image, X, Check, Loader2, Trash2, UploadCloud } from 'lucide-react';
import toast from 'react-hot-toast';
import { confirmAction } from '../../utils/toastUtils';

interface FlagSelectorProps {
    currentUrl?: string;
    onSelect: (url: string) => void;
}

export default function FlagSelector({ currentUrl, onSelect }: FlagSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [flags, setFlags] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) fetchFlags();
    }, [isOpen]);

    const fetchFlags = async () => {
        setLoading(true);
        try {
            const res = await client.get('/media/flags');
            setFlags(res.data);
        } catch (error) {
            console.error("Failed to load flags", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // เช็คขนาดไฟล์ (ไม่เกิน 2MB)
        if (file.size > 2 * 1024 * 1024) return toast.error("ไฟล์ใหญ่เกินไป (Max 2MB)");

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            await client.post('/media/flags', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success("อัปโหลดเรียบร้อย");
            fetchFlags(); // โหลดรายการใหม่
        } catch (error) {
            toast.error("อัปโหลดไม่สำเร็จ");
        } finally {
            setUploading(false);
            if(fileInputRef.current) fileInputRef.current.value = ''; // Reset input
        }
    };

    const handleDelete = async (fileName: string, e: React.MouseEvent) => {
        e.stopPropagation(); // ไม่ให้ Trigger การเลือกรูป
        confirmAction("คุณต้องการลบรูปนี้ใช่หรือไม่?", async () => {
            try {
                // ส่งชื่อไฟล์ไปลบ (API รับ query param ?name=...)
                await client.delete(`/media/flags?name=${fileName}`);
                toast.success("ลบรูปภาพแล้ว");
                
                // ลบออกจาก State ทันที ไม่ต้องโหลดใหม่
                setFlags(prev => prev.filter(f => f.name !== fileName));
            } catch (error) {
                toast.error("ลบไม่สำเร็จ (อาจมีการใช้งานอยู่)");
            }
        }, 'ลบรูปภาพ', 'ยกเลิก');
    };

    return (
        <div>
            {/* Input File ซ่อนไว้ */}
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleUpload} 
            />

            <div className="flex items-center gap-4">
                <div 
                    onClick={() => setIsOpen(true)}
                    className="w-16 h-16 bg-slate-100 rounded-full border-2 border-slate-200 overflow-hidden flex items-center justify-center relative group cursor-pointer hover:border-blue-400 transition-colors"
                >
                    {currentUrl ? (
                        <img src={currentUrl} alt="Selected" className="w-full h-full object-cover" />
                    ) : (
                        <Image className="text-slate-400" />
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-bold">
                        เปลี่ยน
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => setIsOpen(true)}
                    className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                >
                    เลือกจากคลังภาพ
                </button>
            </div>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                        
                        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                <Image size={20} /> คลังรูปภาพ
                            </h3>
                            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-slate-200 rounded-full">
                                <X size={20} className="text-slate-500" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/50">
                            {loading && flags.length === 0 ? (
                                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" /></div>
                            ) : (
                                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-4">
                                    
                                    {/* 1. ปุ่มอัปโหลดรูปใหม่ (อยู่ตำแหน่งแรก) */}
                                    <div 
                                        onClick={() => !uploading && fileInputRef.current?.click()}
                                        className={`
                                            aspect-square rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 
                                            flex flex-col items-center justify-center gap-1 cursor-pointer 
                                            hover:bg-blue-100 transition-colors group
                                            ${uploading ? 'opacity-50 pointer-events-none' : ''}
                                        `}
                                    >
                                        {uploading ? (
                                            <Loader2 className="animate-spin text-blue-500" size={24} />
                                        ) : (
                                            <>
                                                <UploadCloud className="text-blue-400 group-hover:scale-110 transition-transform" size={24} />
                                                <span className="text-[10px] font-bold text-blue-500">เพิ่มรูป</span>
                                            </>
                                        )}
                                    </div>

                                    {/* 2. รายการรูปภาพ */}
                                    {flags.map((flag) => (
                                        <div 
                                            key={flag.name}
                                            onClick={() => {
                                                onSelect(flag.url);
                                                setIsOpen(false);
                                            }}
                                            className={`
                                                relative aspect-square rounded-xl border cursor-pointer transition-all group overflow-hidden bg-white shadow-sm
                                                ${currentUrl === flag.url ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200 hover:border-blue-400'}
                                            `}
                                        >
                                            <img src={flag.url} alt={flag.name} className="w-full h-full object-contain p-1" />
                                            
                                            {/* ปุ่มลบ (แสดงเมื่อ Hover) */}
                                            <button 
                                                onClick={(e) => handleDelete(flag.name, e)}
                                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-md transform hover:scale-110"
                                                title="ลบรูปนี้"
                                            >
                                                <Trash2 size={12} />
                                            </button>

                                            {/* ชื่อไฟล์ */}
                                            <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] text-center py-1 opacity-0 group-hover:opacity-100 truncate px-1">
                                                {flag.name}
                                            </div>

                                            {currentUrl === flag.url && (
                                                <div className="absolute top-1 left-1 bg-blue-500 text-white rounded-full p-0.5 shadow-sm">
                                                    <Check size={10} />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-3 border-t bg-white flex justify-between items-center text-xs text-slate-400">
                             <span>รูปทั้งหมด: {flags.length}</span>
                             <span>Supabase Storage</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}