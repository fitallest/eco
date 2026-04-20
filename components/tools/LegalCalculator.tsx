import React, { useState } from 'react';
import { Calculator, DollarSign, Percent, Users, ArrowRight, RefreshCw, ShieldCheck } from 'lucide-react';

export const LegalCalculator: React.FC = () => {
  const [mode, setMode] = useState<'COURT_FEE' | 'INTEREST' | 'INHERITANCE' | 'BHXH'>('COURT_FEE');
  const [result, setResult] = useState<string | null>(null);

  // Court Fee State
  const [disputeAmount, setDisputeAmount] = useState<string>('');

  // Interest State
  const [principal, setPrincipal] = useState<string>('');
  const [rate, setRate] = useState<string>('10');
  const [months, setMonths] = useState<string>('');

  // Inheritance State
  const [assetValue, setAssetValue] = useState<string>('');
  const [heirsCount, setHeirsCount] = useState<string>('');

  // BHXH State
  const [salaryAvg, setSalaryAvg] = useState<string>('');
  const [yearsBefore2014, setYearsBefore2014] = useState<string>('0');
  const [yearsAfter2014, setYearsAfter2014] = useState<string>('0');

  const formatCurrency = (val: string) => {
    if (!val) return '';
    const num = parseFloat(val.replace(/,/g, ''));
    if (isNaN(num)) return val;
    return num.toLocaleString('en-US');
  };

  const parseCurrency = (val: string) => {
    return parseFloat(val.replace(/,/g, '')) || 0;
  };

  const calculateCourtFee = () => {
    const amount = parseCurrency(disputeAmount);
    if (amount <= 0) return;

    let fee = 0;
    // Theo Nghị quyết 326/2016/UBTVQH14
    if (amount <= 60000000) fee = 3000000; 
    else if (amount <= 400000000) fee = amount * 0.05; 
    else if (amount <= 800000000) fee = 20000000 + (amount - 400000000) * 0.04; 
    else if (amount <= 2000000000) fee = 36000000 + (amount - 800000000) * 0.03; 
    else if (amount <= 4000000000) fee = 72000000 + (amount - 2000000000) * 0.02; 
    else fee = 112000000 + (amount - 4000000000) * 0.001; 

    setResult(`🏛️ ÁN PHÍ SƠ THẨM DÂN SỰ:\n👉 ${fee.toLocaleString('vi-VN')} VNĐ\n\n(Căn cứ: Nghị quyết 326/2016/UBTVQH14)`);
  };

  const calculateInterest = () => {
    const p = parseCurrency(principal);
    const r = parseFloat(rate);
    const m = parseFloat(months);
    if (p <= 0 || isNaN(r) || isNaN(m)) return;

    // Lãi đơn
    const interest = p * (r / 100) * (m / 12);
    const total = p + interest;

    setResult(`💰 TÍNH LÃI SUẤT CHẬM TRẢ:\n- Tiền gốc: ${p.toLocaleString('vi-VN')} VNĐ\n- Tiền lãi (${r}%/năm): ${interest.toLocaleString('vi-VN')} VNĐ\n👉 TỔNG CỘNG: ${total.toLocaleString('vi-VN')} VNĐ`);
  };

  const calculateInheritance = () => {
    const v = parseCurrency(assetValue);
    const h = parseInt(heirsCount);
    if (v <= 0 || isNaN(h) || h <= 0) return;

    const perPerson = v / h;
    setResult(`👨‍👩‍👧‍👦 CHIA THỪA KẾ THEO PHÁP LUẬT:\n- Tổng di sản: ${v.toLocaleString('vi-VN')} VNĐ\n- Số người thừa kế (Hàng 1): ${h} người\n👉 MỖI NGƯỜI NHẬN: ${perPerson.toLocaleString('vi-VN')} VNĐ`);
  };

  const calculateBHXH = () => {
    const salary = parseCurrency(salaryAvg);
    const yBefore = parseFloat(yearsBefore2014) || 0;
    const yAfter = parseFloat(yearsAfter2014) || 0;
    
    if (salary <= 0) return;

    // Công thức: (1.5 x Mbqtl x Năm trước 2014) + (2 x Mbqtl x Năm từ 2014)
    const amountBefore = 1.5 * salary * yBefore;
    const amountAfter = 2 * salary * yAfter;
    const total = amountBefore + amountAfter;

    setResult(`🛡️ BHXH MỘT LẦN (ƯỚC TÍNH):\n- Giai đoạn trước 2014: ${amountBefore.toLocaleString('vi-VN')} VNĐ\n- Giai đoạn từ 2014: ${amountAfter.toLocaleString('vi-VN')} VNĐ\n👉 TỔNG NHẬN VỀ: ${total.toLocaleString('vi-VN')} VNĐ\n\n(Lưu ý: Chưa trừ trượt giá, kết quả mang tính tham khảo)`);
  };

  return (
    <div className="p-4 bg-slate-900 rounded-xl border border-slate-700 h-full flex flex-col">
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 custom-scrollbar">
        <button onClick={() => {setMode('COURT_FEE'); setResult(null)}} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${mode === 'COURT_FEE' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}>Án Phí Tòa Án</button>
        <button onClick={() => {setMode('INTEREST'); setResult(null)}} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${mode === 'INTEREST' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}>Lãi Suất</button>
        <button onClick={() => {setMode('INHERITANCE'); setResult(null)}} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${mode === 'INHERITANCE' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}>Thừa Kế</button>
        <button onClick={() => {setMode('BHXH'); setResult(null)}} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${mode === 'BHXH' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}>BHXH 1 Lần</button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
        {mode === 'COURT_FEE' && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Giá trị tranh chấp (VNĐ)</label>
              <input 
                type="text" 
                value={disputeAmount} 
                onChange={e => setDisputeAmount(formatCurrency(e.target.value))} 
                className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-white font-mono focus:border-emerald-500 focus:outline-none" 
                placeholder="Ví dụ: 500,000,000"
              />
              <p className="text-[10px] text-slate-500 mt-1">Nhập số tiền mà bạn muốn khởi kiện đòi lại hoặc tranh chấp.</p>
            </div>
            <button onClick={calculateCourtFee} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg text-sm shadow-lg shadow-emerald-900/20">Tính Án Phí</button>
          </div>
        )}

        {mode === 'INTEREST' && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Số tiền gốc (VNĐ)</label>
              <input type="text" value={principal} onChange={e => setPrincipal(formatCurrency(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-white font-mono focus:border-emerald-500 focus:outline-none" placeholder="100,000,000"/>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Lãi suất (%/năm)</label>
                <input type="number" value={rate} onChange={e => setRate(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-white font-mono focus:border-emerald-500 focus:outline-none" placeholder="10"/>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Thời gian (tháng)</label>
                <input type="number" value={months} onChange={e => setMonths(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-white font-mono focus:border-emerald-500 focus:outline-none" placeholder="12"/>
              </div>
            </div>
            <button onClick={calculateInterest} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg text-sm shadow-lg shadow-emerald-900/20">Tính Lãi</button>
          </div>
        )}

        {mode === 'INHERITANCE' && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Tổng giá trị di sản (VNĐ)</label>
              <input type="text" value={assetValue} onChange={e => setAssetValue(formatCurrency(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-white font-mono focus:border-emerald-500 focus:outline-none" placeholder="2,000,000,000"/>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Số người thừa kế (Hàng thứ 1)</label>
              <input type="number" value={heirsCount} onChange={e => setHeirsCount(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-white font-mono focus:border-emerald-500 focus:outline-none" placeholder="3"/>
              <p className="text-[10px] text-slate-500 mt-1">Hàng thừa kế thứ 1 gồm: Vợ, chồng, cha đẻ, mẹ đẻ, cha nuôi, mẹ nuôi, con đẻ, con nuôi.</p>
            </div>
            <button onClick={calculateInheritance} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg text-sm shadow-lg shadow-emerald-900/20">Phân Chia</button>
          </div>
        )}

        {mode === 'BHXH' && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Mức lương bình quân đóng BHXH (VNĐ)</label>
              <input type="text" value={salaryAvg} onChange={e => setSalaryAvg(formatCurrency(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-white font-mono focus:border-emerald-500 focus:outline-none" placeholder="10,000,000"/>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Số năm trước 2014</label>
                <input type="number" value={yearsBefore2014} onChange={e => setYearsBefore2014(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-white font-mono focus:border-emerald-500 focus:outline-none" placeholder="0"/>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Số năm từ 2014</label>
                <input type="number" value={yearsAfter2014} onChange={e => setYearsAfter2014(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-white font-mono focus:border-emerald-500 focus:outline-none" placeholder="5"/>
              </div>
            </div>
            <button onClick={calculateBHXH} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg text-sm shadow-lg shadow-emerald-900/20">Tính BHXH 1 Lần</button>
          </div>
        )}

        {result && (
          <div className="mt-6 p-4 bg-slate-950 border border-emerald-500/30 rounded-lg animate-fade-in-up">
            <pre className="text-white font-mono text-sm whitespace-pre-wrap leading-relaxed">{result}</pre>
          </div>
        )}
      </div>
    </div>
  );
};
