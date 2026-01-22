// src/utils/toastUtils.tsx
import toast from 'react-hot-toast';

export const confirmAction = (
  message: string, 
  onConfirm: () => void, 
  confirmText = 'ยืนยัน', 
  cancelText = 'ยกเลิก'
) => {
  toast((t) => (
      <div className="flex flex-col items-center gap-3 min-w-55 p-1 font-sans">
          <div className="font-bold text-slate-800 text-sm text-center leading-relaxed">
              {message}
          </div>
          <div className="flex gap-2 w-full justify-center">
              <button 
                  onClick={() => toast.dismiss(t.id)}
                  className="flex-1 bg-slate-100 text-slate-500 px-3 py-2 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors"
              >
                  {cancelText}
              </button>
              <button 
                  onClick={() => {
                      toast.dismiss(t.id);
                      onConfirm();
                  }}
                  className="flex-1 bg-slate-800 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-black transition-colors shadow-md shadow-slate-200"
              >
                  {confirmText}
              </button>
          </div>
      </div>
  ), {
      duration: 5000, 
      position: 'top-center',
      style: {
          background: '#fff',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          padding: '16px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          zIndex: 9999
      },
      icon: '⚠️'
  });
};