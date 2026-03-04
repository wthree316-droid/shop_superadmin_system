import { Trash2, Settings2, Delete, Calculator, Check } from 'lucide-react';

export default function BettingNumpad({
    tab, winMode, includeDoubles, setIncludeDoubles,
    bufferNumbers, setBufferNumbers, currentInput, setCurrentInput,
    priceTop, setPriceTop, priceBottom, setPriceBottom,
    themeClasses, labels, getInputConfig, handleTabChange,
    handleWinModeChange, handlePaste, handleInputKeyDown,
    handleAddNumberToBuffer, handleQuickOption, handleReverseBuffer,
    handleAddBill, numberInputRef, priceTopRef, priceBottomRef, addButtonRef, focusInput
}: any) {
    return (
        <div className="bg-[#F8FAFC] border border-gray-200 rounded-lg p-4 shadow-sm relative">
            <div className="flex flex-wrap gap-1 mb-4 text-nowrap">
                {[{ id: '2', label: '2 ตัว' }, { id: '3', label: '3 ตัว' }, { id: '19', label: '19 ประตู' }, { id: 'run', label: 'เลขวิ่ง' }, { id: 'win', label: 'วินเลข' }].map((t) => (
                    <button key={t.id} onClick={() => handleTabChange(t.id)} className={`px-4 py-1.5 rounded-md text-sm font-bold border transition-colors ${
                        tab === t.id 
                        ? `${themeClasses.main} border-transparent shadow-sm` 
                        : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
                    }`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'win' && (
                <div className="flex flex-col gap-2 mb-4 w-fit">
                    <div className="flex gap-1 bg-white p-1 rounded-md border justify-center border-green-200 ">
                        <button onClick={() => handleWinModeChange('2')} className={`px-4 py-1 rounded text-xs font-bold transition-all ${winMode === '2' ? `${themeClasses.main} shadow-sm` : 'text-gray-500 hover:bg-gray-100'}`}>วิน 2 ตัว</button>
                        <button onClick={() => handleWinModeChange('3')} className={`px-4 py-1 rounded text-xs font-bold transition-all ${winMode === '3' ? `${themeClasses.main} shadow-sm` : 'text-gray-500 hover:bg-gray-100'}`}>วิน 3 ตัว</button>
                    </div>
                    <div className="flex gap-1 bg-white p-1 rounded-md border border-blue-200">
                        <button 
                            onClick={() => { setIncludeDoubles(false); focusInput(); }} 
                            className={`px-4 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 ${!includeDoubles ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
                        >
                            {!includeDoubles && <Check size={12} />} ไม่รวมเบิ้ล
                        </button>
                        <button 
                            onClick={() => { setIncludeDoubles(true); focusInput(); }} 
                            className={`px-4 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 ${includeDoubles ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
                        >
                            {includeDoubles && <Check size={12} />} รวมเบิ้ล
                        </button>
                    </div>
                </div>
            )}

            <div className="flex justify-end gap-2 mb-2">
                <button 
                    onClick={() => { setBufferNumbers([]); focusInput(); }} 
                    disabled={bufferNumbers.length === 0} 
                    className="text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-md text-xs flex items-center gap-1 transition-colors disabled:opacity-50"
                >
                    <Trash2 size={14} /> ล้างเลขที่เลือก
                </button>
            </div>

            {bufferNumbers.length > 0 && (
                <div className="bg-white rounded-lg p-3 mb-3 border border-gray-200 min-h-12">
                    <div className="flex flex-wrap gap-2">
                        {bufferNumbers.map((n: string, idx: number) => (
                            <span 
                                key={idx} 
                                onClick={() => setBufferNumbers((prev: string[]) => prev.filter(item => item !== n))}
                                className={`px-2 py-1 rounded text-sm font-bold shadow-sm cursor-pointer transition-colors select-none ${themeClasses.main} hover:bg-red-500 hover:text-white`}
                                title="กดเพื่อลบเลขนี้"
                            >
                                {n}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {tab === 'win' && (
                <div className="mb-4">
                    <div className="grid grid-cols-5 gap-2 md:w-2/3 mx-auto">
                        {[1,2,3,4,5,6,7,8,9,0].map(num => {
                            const isSelected = currentInput.includes(num.toString());
                            return (
                                <button 
                                    key={num}
                                    onClick={() => setCurrentInput((prev: string) => {
                                        const strNum = num.toString();
                                        if (prev.includes(strNum)) return prev.replace(strNum, '');
                                        if (prev.length >= 7) return prev; 
                                        return prev + strNum;
                                    })}
                                    className={`
                                        font-bold text-lg py-3 rounded-lg shadow-sm transition-all border
                                        ${isSelected ? `${themeClasses.main} border-transparent` : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50 active:bg-blue-200'}
                                    `}
                                >
                                    {num}
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex justify-center mt-2 gap-2 md:w-2/3 mx-auto">
                        <button 
                            onClick={() => setCurrentInput((prev: string) => prev.slice(0, -1))}
                            className="flex-1 bg-red-100 text-red-600 py-2 rounded-lg font-bold flex items-center justify-center gap-1 hover:bg-red-200"
                        >
                            <Delete size={18}/> ลบ
                        </button>
                        <button 
                            onClick={() => handleAddNumberToBuffer()}
                            className="flex-2 bg-blue-600 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-blue-700 shadow-md"
                        >
                            <Calculator size={18}/> คำนวณชุดเลข
                        </button>
                    </div>
                </div>
            )}

            {tab !== 'win' && (
                <div className="flex flex-wrap gap-2 mb-4">
                    {tab === '2' && (
                        <>
                            <button onClick={() => handleQuickOption('double')} className={`px-3 py-1.5 rounded-md text-xs font-bold ${themeClasses.main} ${themeClasses.hover}`}>+ เลขเบิ้ล</button>
                            <button onClick={() => handleQuickOption('sibling')} className="bg-[#E67E22] text-white px-3 py-1.5 rounded-md text-xs font-bold hover:bg-[#D35400]">+ พี่น้อง</button>
                        </>
                    )}
                    {tab === '3' && (
                        <>
                            <button onClick={() => handleQuickOption('triple')} className={`px-3 py-1.5 rounded-md text-xs font-bold ${themeClasses.main} ${themeClasses.hover}`}>+ ตอง</button>
                            <button onClick={() => handleQuickOption('double_front')} className="bg-[#1E88E5] text-white px-3 py-1.5 rounded-md text-xs font-bold">+ เบิ้ลหน้า</button>
                            <button onClick={() => handleQuickOption('sandwich')} className="bg-[#8E24AA] text-white px-3 py-1.5 rounded-md text-xs font-bold">+ หาม</button>
                            <button onClick={() => handleQuickOption('double_back')} className="bg-[#00897B] text-white px-3 py-1.5 rounded-md text-xs font-bold">+ เบิ้ลหลัง</button>
                            <button onClick={() => handleQuickOption('prahan')} className="bg-red-600 text-white px-3 py-1.5 rounded-md text-xs font-bold hover:bg-red-700 shadow-sm transition-colors">+ ประหาร</button>
                        </>
                    )}
                    {tab === '19' && (
                        <button onClick={() => handleQuickOption('double')} className={`px-3 py-1.5 rounded-md text-xs font-bold ${themeClasses.main} ${themeClasses.hover}`}>+ รูดเบิ้ล</button>
                    )}
                </div>
            )}
            
            <div className={`${themeClasses.light} p-4 rounded-xl border ${themeClasses.border} flex flex-wrap gap-3 items-end transition-all duration-300`}>
                <div className="flex-1 min-w-35 w-full sm:w-auto">
                    <label className="text-xs text-slate-500 font-bold mb-1.5 block">ใส่เลข</label>
                    <input 
                        ref={numberInputRef} 
                        type="tel" 
                        value={currentInput}
                        onChange={e => setCurrentInput(e.target.value.replace(/[^0-9]/g, ''))}
                        onKeyDown={(e) => handleInputKeyDown(e, 'number')}
                        onPaste={handlePaste} 
                        placeholder={tab === 'win' ? "เลือกเลขวิน..." : "ระบุตัวเลข"} 
                        className={`w-full bg-white border-b-2 text-center text-xl font-bold py-2 focus:outline-none text-slate-800 placeholder-blue-300 rounded-lg shadow-sm transition-all h-11 ${themeClasses.border} ${themeClasses.focus}`}
                        maxLength={getInputConfig().max}
                    />
                </div>

                {(tab === '2' || tab === '3' || tab === 'win') && (
                    <button 
                        onClick={handleReverseBuffer}
                        disabled={bufferNumbers.length === 0}
                        title="กด Spacebar เพื่อกลับเลข"
                        className="bg-[#F39C12] hover:bg-[#E67E22] disabled:bg-gray-300 disabled:text-gray-500 text-white font-bold px-4 py-2 rounded-lg shadow-sm transition-all flex items-center justify-center gap-1 w-full sm:w-auto shrink-0 h-11"
                    >
                        <Settings2 size={18} /> กลับเลข
                    </button>
                )}

                <div className="flex gap-2 w-full sm:w-auto shrink-0 min-w-40 flex-1 sm:flex-none">
                    <div className="flex-1 sm:w-24">
                        <label className="text-xs text-slate-500 font-bold mb-1.5 block text-center">{labels.top}</label>
                        <input 
                            ref={priceTopRef} 
                            type="tel" 
                            value={priceTop}
                            onChange={e => setPriceTop(e.target.value)}
                            onKeyDown={(e) => handleInputKeyDown(e, 'top')} 
                            placeholder="ราคา"
                            className={`w-full bg-white border-b-2 text-center font-bold py-2 focus:outline-none text-slate-800 rounded-lg shadow-sm transition-all h-11 ${themeClasses.border} ${themeClasses.focus}`}
                        />
                    </div>
                    <div className="flex-1 sm:w-24">
                        <label className="text-xs text-slate-500 font-bold mb-1.5 block text-center">{labels.bottom}</label>
                        <input 
                            ref={priceBottomRef} 
                            type="tel" 
                            value={priceBottom}
                            onChange={e => setPriceBottom(e.target.value)}
                            onKeyDown={(e) => handleInputKeyDown(e, 'bottom')} 
                            placeholder="ราคา"
                            className={`w-full bg-white border-b-2 text-center font-bold py-2 focus:outline-none text-slate-800 rounded-lg shadow-sm transition-all h-11 ${themeClasses.border} ${themeClasses.focus}`}
                        />
                    </div>
                </div>

                <button 
                    ref={addButtonRef}
                    onClick={() => {
                        handleAddBill();
                        setTimeout(() => numberInputRef.current?.focus(), 50);
                    }}
                    className={`font-bold px-6 py-2 rounded-lg shadow-md active:scale-95 transition-all flex items-center justify-center gap-1 w-full sm:w-auto shrink-0 h-11 whitespace-nowrap ${themeClasses.main} ${themeClasses.hover}`}
                >
                    <span className="text-xl leading-none">+</span> เพิ่มบิล
                </button>
            </div>
        </div>
    );
}