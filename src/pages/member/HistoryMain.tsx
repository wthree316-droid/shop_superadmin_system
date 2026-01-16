import { useState } from 'react';
import { FileSpreadsheet, ClipboardList } from 'lucide-react';

import History_outside from '../dashboard/History_outside';
import History from '../dashboard/History';

export default function HistoryMain() {
  const [activeTab, setActiveTab] = useState('outside');

  const tabs = [
    { id: 'outside', label: 'โพยไม่แยกประเภท', icon: FileSpreadsheet },
    { id: 'inside', label: 'โพยแยกประเภท', icon: ClipboardList },
  ];

  return (
    <div className="space-y-4 md:space-y-6 pb-10 animate-fade-in font-sans">
      
      {/* --- Header Card --- */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 md:p-6 border-b border-gray-100 bg-white">
            <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                    <ClipboardList size={24} />
                </div>
                ประวัติโพยของฉัน
            </h2>
            <p className="text-sm text-slate-500 mt-1 ml-12">ตรวจสอบรายการแทงและผลรางวัลย้อนหลัง</p>
        </div>
        
        {/* --- Tabs Navigation --- */}
        <div className="px-4 py-3 bg-slate-50/50 border-b border-gray-100">
            <div className="flex gap-2 p-1 bg-gray-200/50 rounded-xl w-fit">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all duration-200
                                ${isActive 
                                    ? 'bg-white text-blue-600 shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-gray-200/50'
                                }
                            `}
                        >
                            <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                            {tab.label}
                        </button>
                    )
                })}
            </div>
        </div>
      </div>

      {/* --- Content Area --- */}
      {/* ไม่ต้องมี Card ครอบซ้อนแล้ว เพราะ Component ลูก (History.tsx) มี Card ของตัวเอง */}
      <div className="min-h-125 relative">
            {/* Tab 1: ไม่แยกประเภท (Outside) */}
            {activeTab === 'outside' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <History_outside />
                </div>
            )}
            {/* Tab 2: แยกประเภท (Inside) */}
            {activeTab === 'inside' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <History />
                </div>
            )}
      </div>
    </div>
  );
}