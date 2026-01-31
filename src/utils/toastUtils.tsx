
import toast, { type Toast } from 'react-hot-toast';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';


const ToastDialog = ({ 
    t, 
    title, 
    message, 
    icon, 
    actions 
}: { 
    t: Toast, 
    title?: string, 
    message: string, 
    icon?: React.ReactNode, 
    actions: React.ReactNode 
}) => {
    return (
        <div
            className={`
                max-w-sm w-full bg-white shadow-2xl rounded-2xl ring-1 ring-black/5 pointer-events-auto flex flex-col overflow-hidden font-sans
                transform transition-all duration-200 ease-in-out
                ${t.visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-2 scale-95'}
            `}
        >
            <div className="p-6 flex flex-col items-center text-center">
                {/* Icon Section */}
                {icon && (
                    <div className="mb-4">
                        {icon}
                    </div>
                )}
                
                {/* Text Section */}
                {title && <h3 className="text-lg font-bold text-slate-800 mb-1">{title}</h3>}
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                    {message}
                </p>
            </div>

            {/* Actions Section */}
            <div className="bg-slate-50 p-3 flex gap-3 border-t border-slate-100">
                {actions}
            </div>
        </div>
    );
};

// --- Export Functions ---

export const confirmAction = (
  message: string, 
  onConfirm: () => void, 
  confirmText = 'ยืนยัน', 
  cancelText = 'ยกเลิก',
  title = 'ยืนยันการทำรายการ'
) => {
  toast.custom((t) => (
      <ToastDialog 
          t={t}
          title={title}
          message={message}
          icon={
            // ลบ animate-bounce ออก เพื่อลดภาระการ render และดูนิ่งขึ้น
            <div className="w-12 h-12 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center">
                <AlertCircle size={28} strokeWidth={2.5} />
            </div>
          }
          actions={
            <>
                <button 
                    onClick={() => toast.dismiss(t.id)}
                    className="flex-1 bg-white text-slate-600 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 hover:text-slate-800 transition-colors active:scale-95"
                >
                    {cancelText}
                </button>
                <button 
                    onClick={() => {
                        toast.dismiss(t.id);
                        onConfirm(); // ทำคำสั่งทันที ไม่ต้องรอ Animation จบ
                    }}
                    className="flex-1 bg-slate-800 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-900 shadow-md shadow-slate-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    <CheckCircle size={16} />
                    {confirmText}
                </button>
            </>
          }
      />
  ), {
      duration: Infinity, 
      position: 'top-center',
      id: 'confirm-toast'
  });
};

export const alertAction = (
    message: string,
    title = 'แจ้งเตือน',
    type: 'success' | 'error' | 'info' = 'info',
    buttonText = 'ตกลง',
    onClose?: () => void // ✅ เพิ่มบรรทัดนี้ (รับฟังก์ชันเสริม)
) => {
    const config = {
        success: { 
            icon: <CheckCircle size={28} className="text-white" />, 
            bg: 'bg-green-500', 
            ring: 'ring-green-100',
            btn: 'bg-green-600 hover:bg-green-700 text-white'
        },
        error: { 
            icon: <X size={28} className="text-white" />, 
            bg: 'bg-red-500', 
            ring: 'ring-red-100',
            btn: 'bg-red-600 hover:bg-red-700 text-white'
        },
        info: { 
            icon: <Info size={28} className="text-white" />, 
            bg: 'bg-blue-500', 
            ring: 'ring-blue-100',
            btn: 'bg-blue-600 hover:bg-blue-700 text-white'
        }
    }[type];

    toast.custom((t) => (
        <ToastDialog 
            t={t}
            title={title}
            message={message}
            icon={
                <div className={`w-12 h-12 ${config.bg} rounded-full flex items-center justify-center shadow-lg ring-4 ${config.ring}`}>
                    {config.icon}
                </div>
            }
            actions={
                <button 
                    onClick={() => {
                        toast.dismiss(t.id);
                        if (onClose) onClose(); // ✅ สั่งทำงานฟังก์ชันที่ส่งมา (เช่น ดีดออก)
                    }}
                    className={`w-full ${config.btn} px-4 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95`}
                >
                    {buttonText}
                </button>
            }
        />
    ), {
        duration: Infinity, // ✅ เปลี่ยนเป็น Infinity เพื่อบังคับให้กดปุ่มเท่านั้นถึงจะหาย
        position: 'top-center',
        id: 'alert-toast' // ป้องกันการเด้งซ้ำ
    });
};