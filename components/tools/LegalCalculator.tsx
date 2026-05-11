import React, { useState } from 'react';
import { Calculator, DollarSign, Percent, Users, ArrowRight, RefreshCw, ShieldCheck, MapPin, FileEdit, Phone, CheckCircle, ChevronDown, Bot, FileText, Zap } from 'lucide-react';

interface DetailedFeeResult {
  total: number;
  courtFee: number;
  appraisalFee: number;
  evidenceFee: number;
  caseType: string;
}

const QUIZ_QUESTIONS = [
  {
    question: "1. Tranh chấp của bạn là giữa...",
    options: ["Cá nhân với Cá nhân", "Cá nhân với Doanh nghiệp", "Doanh nghiệp với Doanh nghiệp"]
  },
  {
    question: "2. Nội dung chính liên quan đến...",
    options: ["Đất đai / Bất động sản", "Hợp đồng / Giao dịch", "Hôn nhân / Gia đình", "Bồi thường thiệt hại"]
  },
  {
    question: "3. Mục đích khởi kiện của bạn là gì?",
    options: ["Đòi tiền / Tài sản cụ thể", "Ly hôn / Chia tài sản", "Hủy bỏ Hợp đồng / Quyết định", "Khác"]
  }
];

export const LegalCalculator: React.FC = () => {
  const [mode, setMode] = useState<'COURT_FEE' | 'INTEREST' | 'INHERITANCE' | 'BHXH'>('COURT_FEE');
  const [result, setResult] = useState<string | null>(null);

  // --- Court Fee Specific State ---
  const [quizStep, setQuizStep] = useState<number>(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [disputeAmount, setDisputeAmount] = useState<string>('');
  const [baseSalary, setBaseSalary] = useState<string>('2340000');
  const [detailedResult, setDetailedResult] = useState<DetailedFeeResult | null>(null);

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

  const handleQuizAnswer = (answer: string) => {
    setQuizAnswers(prev => ({ ...prev, [quizStep]: answer }));
    if (quizStep < QUIZ_QUESTIONS.length) {
      setQuizStep(prev => prev + 1);
    }
  };

  const calculateCourtFee = () => {
    const amount = parseCurrency(disputeAmount);
    
    // Determine case type from quiz
    const subject = quizAnswers[1] || 'Dân sự';
    const action = quizAnswers[2] || '';
    
    let isPropertyDispute = amount > 0;
    if (action === 'Đòi tiền / Tài sản cụ thể' || action === 'Ly hôn / Chia tài sản') {
        isPropertyDispute = true;
    }
    if (action === 'Hủy bỏ Hợp đồng / Quyết định' && amount === 0) {
        isPropertyDispute = false;
    }

    let fee = 0;
    // Theo Nghị quyết 326/2016/UBTVQH14
    if (isPropertyDispute) {
      if (amount <= 60000000) fee = 3000000; 
      else if (amount <= 400000000) fee = amount * 0.05; 
      else if (amount <= 800000000) fee = 20000000 + (amount - 400000000) * 0.04; 
      else if (amount <= 2000000000) fee = 36000000 + (amount - 800000000) * 0.03; 
      else if (amount <= 4000000000) fee = 72000000 + (amount - 2000000000) * 0.02; 
      else fee = 112000000 + (amount - 4000000000) * 0.001; 
    } else {
      fee = 300000; // Vụ án dân sự không có giá ngạch
    }

    const baseSal = parseFloat(baseSalary);
    // Ước tính lệ phí thẩm định và chứng cứ
    const appraisalFee = baseSal * 1.5; 
    const evidenceFee = baseSal * 0.8; 

    setDetailedResult({
        total: fee + appraisalFee + evidenceFee,
        courtFee: fee,
        appraisalFee: appraisalFee,
        evidenceFee: evidenceFee,
        caseType: subject
    });
  };

  const calculateInterest = () => {
    const p = parseCurrency(principal);
    const r = parseFloat(rate);
    const m = parseFloat(months);
    if (p <= 0 || isNaN(r) || isNaN(m)) return;
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
    const amountBefore = 1.5 * salary * yBefore;
    const amountAfter = 2 * salary * yAfter;
    const total = amountBefore + amountAfter;
    setResult(`🛡️ BHXH MỘT LẦN (ƯỚC TÍNH):\n- Giai đoạn trước 2014: ${amountBefore.toLocaleString('vi-VN')} VNĐ\n- Giai đoạn từ 2014: ${amountAfter.toLocaleString('vi-VN')} VNĐ\n👉 TỔNG NHẬN VỀ: ${total.toLocaleString('vi-VN')} VNĐ\n\n(Lưu ý: Chưa trừ trượt giá, kết quả mang tính tham khảo)`);
  };

  const renderCourtFeeCalculator = () => {
    if (detailedResult) {
      return (
        <div className="space-y-6 animate-fade-in">
          {/* Green Result Column */}
          <div className="bg-emerald-950/40 border-2 border-emerald-500/50 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl"></div>
            <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl"></div>
            
            <div className="relative z-10 text-center mb-6">
                <p className="text-emerald-400 font-bold uppercase text-sm mb-2 flex items-center justify-center gap-2">
                    <ShieldCheck size={18}/> Án Phí & Lệ Phí Dự Tính
                </p>
                <div className="text-4xl md:text-5xl font-bold text-white mb-2 font-mono">
                    {detailedResult.total.toLocaleString('vi-VN')} <span className="text-xl text-emerald-500">VNĐ</span>
                </div>
                <p className="text-xs text-slate-400">Cho vụ án: {detailedResult.caseType} - Tính theo lương cơ sở {Number(baseSalary).toLocaleString('vi-VN')}đ</p>
            </div>

            <div className="space-y-3 relative z-10">
                <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg border border-emerald-900/30">
                    <span className="text-slate-300 text-sm">Án phí sơ thẩm</span>
                    <span className="text-emerald-400 font-mono font-bold">{detailedResult.courtFee.toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg border border-emerald-900/30">
                    <span className="text-slate-300 text-sm">Lệ phí thẩm định (ước tính)</span>
                    <span className="text-emerald-400 font-mono font-bold">{detailedResult.appraisalFee.toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg border border-emerald-900/30">
                    <span className="text-slate-300 text-sm">Thu thập chứng cứ (ước tính)</span>
                    <span className="text-emerald-400 font-mono font-bold">{detailedResult.evidenceFee.toLocaleString('vi-VN')} đ</span>
                </div>
            </div>
            
            <button onClick={() => {setDetailedResult(null); setQuizStep(0); setQuizAnswers({}); setDisputeAmount('');}} className="mt-4 w-full text-slate-400 hover:text-white text-xs underline flex items-center justify-center gap-1"><RefreshCw size={12}/> Tính toán lại</button>
          </div>

          {/* Conversion Funnel / Action Cards */}
          <div>
            <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2"><Zap size={16} className="text-amber-400"/> Gợi ý hành động tiếp theo</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* AI Draft */}
                <button className="bg-slate-900 border border-slate-700 hover:border-emerald-500 hover:bg-slate-800 p-4 rounded-xl text-left transition-all group">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-900/20 text-emerald-500 rounded-lg"><Bot size={18}/></div>
                        <h4 className="font-bold text-white text-sm">Tự tạo đơn khởi kiện bằng AI</h4>
                    </div>
                    <p className="text-xs text-slate-400 mb-2">Hệ thống AI tự động soạn thảo đơn dựa trên thông tin vụ việc chuẩn pháp lý.</p>
                    <div className="text-emerald-400 font-bold text-sm">79,000 VNĐ</div>
                </button>

                {/* Lawyer Draft (Decoy) */}
                <button className="bg-gradient-to-br from-slate-800 to-slate-900 border border-amber-500/50 hover:border-amber-400 p-4 rounded-xl text-left transition-all group relative overflow-hidden shadow-lg shadow-amber-900/10">
                    <div className="absolute top-0 right-0 bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg">KHUYÊN DÙNG</div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-amber-900/20 text-amber-500 rounded-lg"><FileEdit size={18}/></div>
                        <h4 className="font-bold text-white text-sm">Thuê Luật sư soạn đơn</h4>
                    </div>
                    <p className="text-xs text-slate-400 mb-2">Luật sư chuyên môn trực tiếp soạn và tư vấn quy trình nộp đơn.</p>
                    <div className="text-amber-400 font-bold text-sm">79,000 VNĐ</div>
                </button>

                {/* Voice Consult */}
                <button className="bg-slate-900 border border-slate-700 hover:border-blue-500 hover:bg-slate-800 p-4 rounded-xl text-left transition-all group">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-900/20 text-blue-500 rounded-lg"><Phone size={18}/></div>
                        <h4 className="font-bold text-white text-sm">Tư vấn qua Tổng đài</h4>
                    </div>
                    <p className="text-xs text-slate-400">Liên hệ trực tiếp với chuyên gia pháp lý để giải đáp thắc mắc ngay lập tức.</p>
                    <div className="mt-2 text-blue-400 font-bold text-xs uppercase flex items-center gap-1">Miễn phí gọi <ArrowRight size={12}/></div>
                </button>

                {/* Map Directions */}
                <button className="bg-slate-900 border border-slate-700 hover:border-slate-500 hover:bg-slate-800 p-4 rounded-xl text-left transition-all group">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-slate-800 text-slate-300 rounded-lg"><MapPin size={18}/></div>
                        <h4 className="font-bold text-white text-sm">Chỉ đường đến Tòa án</h4>
                    </div>
                    <p className="text-xs text-slate-400">Tìm tòa án có thẩm quyền gần nhất theo địa chỉ của bạn.</p>
                    <div className="mt-2 text-slate-400 font-bold text-xs uppercase flex items-center gap-1">Mở bản đồ <ArrowRight size={12}/></div>
                </button>
            </div>
          </div>
        </div>
      );
    }

    if (quizStep < QUIZ_QUESTIONS.length) {
      const currentQ = QUIZ_QUESTIONS[quizStep];
      return (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
             <div className="w-8 h-8 rounded-full bg-emerald-900/40 text-emerald-500 flex items-center justify-center font-bold border border-emerald-500/30">
               <Bot size={16}/>
             </div>
             <div>
               <div className="text-xs text-slate-500 font-bold uppercase">AI Trợ lý Án Phí</div>
               <div className="text-sm font-bold text-white">Hãy trả lời 3 câu hỏi để tôi phân loại vụ việc!</div>
             </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">{currentQ.question}</h3>
            <div className="space-y-3">
              {currentQ.options.map((opt, idx) => (
                <button 
                  key={idx} 
                  onClick={() => handleQuizAnswer(opt)}
                  className="w-full text-left p-4 rounded-xl border border-slate-700 hover:border-emerald-500 hover:bg-emerald-900/10 text-slate-300 hover:text-white transition-all flex items-center justify-between group"
                >
                  <span>{opt}</span>
                  <ArrowRight size={16} className="text-slate-600 group-hover:text-emerald-500 transition-colors"/>
                </button>
              ))}
            </div>
            
            <div className="mt-6 flex gap-1">
               {QUIZ_QUESTIONS.map((_, i) => (
                 <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= quizStep ? 'bg-emerald-500' : 'bg-slate-800'}`}></div>
               ))}
            </div>
          </div>
        </div>
      );
    }

    // Input form after quiz
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-5">
           <div className="flex items-start gap-3 mb-4">
              <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={18}/>
              <div>
                  <h4 className="text-sm font-bold text-white">Đã nhận diện: {quizAnswers[1] || 'Vụ việc dân sự'}</h4>
                  <p className="text-xs text-slate-400 mt-1">Loại yêu cầu: {quizAnswers[2]}</p>
              </div>
           </div>
           
           <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Giá trị tranh chấp (VNĐ)</label>
                <input 
                  type="text" 
                  value={disputeAmount} 
                  onChange={e => setDisputeAmount(formatCurrency(e.target.value))} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3.5 text-white font-mono focus:border-emerald-500 focus:outline-none transition-colors" 
                  placeholder="Ví dụ: 500,000,000 (Để trống nếu phi tài sản)"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Mức lương cơ sở áp dụng</label>
                <div className="relative">
                    <select 
                        value={baseSalary} 
                        onChange={e => setBaseSalary(e.target.value)} 
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3.5 text-white font-mono appearance-none focus:border-emerald-500 focus:outline-none transition-colors cursor-pointer"
                    >
                        <option value="2340000">2,340,000 VNĐ (Từ 01/07/2024)</option>
                        <option value="1800000">1,800,000 VNĐ (Từ 01/07/2023 - 30/06/2024)</option>
                        <option value="1490000">1,490,000 VNĐ (Trước 01/07/2023)</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"/>
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5">Lương cơ sở ảnh hưởng đến lệ phí thẩm định và án phí phi tài sản.</p>
              </div>
           </div>
        </div>

        <button onClick={calculateCourtFee} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl text-sm shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 transition-all">
            <Calculator size={18}/>
            Xác Nhận & Tính Toán
        </button>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 bg-[#0a0f1c] rounded-2xl border border-slate-800 h-full flex flex-col shadow-2xl">
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 custom-scrollbar">
        <button onClick={() => {setMode('COURT_FEE'); setResult(null); setDetailedResult(null);}} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${mode === 'COURT_FEE' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800 border border-slate-800'}`}>
            <Calculator size={14}/> Án Phí Tòa Án
        </button>
        <button onClick={() => {setMode('INTEREST'); setResult(null); setDetailedResult(null);}} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${mode === 'INTEREST' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800 border border-slate-800'}`}>
            <Percent size={14}/> Lãi Suất
        </button>
        <button onClick={() => {setMode('INHERITANCE'); setResult(null); setDetailedResult(null);}} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${mode === 'INHERITANCE' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800 border border-slate-800'}`}>
            <Users size={14}/> Thừa Kế
        </button>
        <button onClick={() => {setMode('BHXH'); setResult(null); setDetailedResult(null);}} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${mode === 'BHXH' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800 border border-slate-800'}`}>
            <ShieldCheck size={14}/> BHXH 1 Lần
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {mode === 'COURT_FEE' && renderCourtFeeCalculator()}

        {mode === 'INTEREST' && (
          <div className="space-y-5 animate-fade-in bg-slate-900/60 p-5 rounded-xl border border-slate-800">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Số tiền gốc (VNĐ)</label>
              <input type="text" value={principal} onChange={e => setPrincipal(formatCurrency(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white font-mono focus:border-emerald-500 focus:outline-none transition-colors" placeholder="100,000,000"/>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Lãi suất (%/năm)</label>
                <input type="number" value={rate} onChange={e => setRate(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white font-mono focus:border-emerald-500 focus:outline-none transition-colors" placeholder="10"/>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Thời gian (tháng)</label>
                <input type="number" value={months} onChange={e => setMonths(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white font-mono focus:border-emerald-500 focus:outline-none transition-colors" placeholder="12"/>
              </div>
            </div>
            <button onClick={calculateInterest} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl text-sm shadow-lg shadow-emerald-900/20 mt-2 transition-colors">Tính Lãi</button>
          </div>
        )}

        {mode === 'INHERITANCE' && (
          <div className="space-y-5 animate-fade-in bg-slate-900/60 p-5 rounded-xl border border-slate-800">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Tổng giá trị di sản (VNĐ)</label>
              <input type="text" value={assetValue} onChange={e => setAssetValue(formatCurrency(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white font-mono focus:border-emerald-500 focus:outline-none transition-colors" placeholder="2,000,000,000"/>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Số người thừa kế (Hàng thứ 1)</label>
              <input type="number" value={heirsCount} onChange={e => setHeirsCount(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white font-mono focus:border-emerald-500 focus:outline-none transition-colors" placeholder="3"/>
              <p className="text-[10px] text-slate-500 mt-1.5">Hàng thừa kế thứ 1 gồm: Vợ, chồng, cha đẻ, mẹ đẻ, cha nuôi, mẹ nuôi, con đẻ, con nuôi.</p>
            </div>
            <button onClick={calculateInheritance} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl text-sm shadow-lg shadow-emerald-900/20 mt-2 transition-colors">Phân Chia</button>
          </div>
        )}

        {mode === 'BHXH' && (
          <div className="space-y-5 animate-fade-in bg-slate-900/60 p-5 rounded-xl border border-slate-800">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Mức lương bình quân đóng BHXH (VNĐ)</label>
              <input type="text" value={salaryAvg} onChange={e => setSalaryAvg(formatCurrency(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white font-mono focus:border-emerald-500 focus:outline-none transition-colors" placeholder="10,000,000"/>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Số năm trước 2014</label>
                <input type="number" value={yearsBefore2014} onChange={e => setYearsBefore2014(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white font-mono focus:border-emerald-500 focus:outline-none transition-colors" placeholder="0"/>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Số năm từ 2014</label>
                <input type="number" value={yearsAfter2014} onChange={e => setYearsAfter2014(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white font-mono focus:border-emerald-500 focus:outline-none transition-colors" placeholder="5"/>
              </div>
            </div>
            <button onClick={calculateBHXH} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl text-sm shadow-lg shadow-emerald-900/20 mt-2 transition-colors">Tính BHXH 1 Lần</button>
          </div>
        )}

        {result && mode !== 'COURT_FEE' && (
          <div className="mt-6 p-5 bg-slate-950 border border-emerald-500/30 rounded-xl animate-fade-in-up">
            <pre className="text-white font-mono text-sm whitespace-pre-wrap leading-relaxed">{result}</pre>
          </div>
        )}
      </div>
    </div>
  );
};
