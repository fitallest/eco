import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, X, FileText, CheckCircle, Zap, ChevronRight, Eye, Smartphone } from 'lucide-react';
import { ScannedDocument, ScannedDocType } from '../../types';

interface DocumentScannerProps {
  onScanComplete?: (doc: ScannedDocument) => void;
  onAnalyzeContract?: (text: string, metadata: Record<string, string>) => void;
  onDraftDocument?: (text: string, metadata: Record<string, string>) => void;
}

// Mock OCR results per document type
const MOCK_OCR_RESULTS: Record<ScannedDocType, { text: string; data: Record<string, string> }> = {
  SO_DO: {
    text: `GIẤY CHỨNG NHẬN QUYỀN SỬ DỤNG ĐẤT\nSố: BV 123456\nChủ sở hữu: NGUYỄN VĂN MINH\nĐịa chỉ thửa đất: Số 123 Đường Lê Lợi, P. Bến Nghé, Q.1, TP.HCM\nDiện tích: 120 m2\nMục đích sử dụng: Đất ở\nThời hạn sử dụng: Lâu dài\nNgày cấp: 15/03/2020\nCơ quan cấp: UBND Quận 1, TP.HCM`,
    data: {
      'Số sổ': 'BV 123456',
      'Chủ sở hữu': 'NGUYỄN VĂN MINH',
      'Địa chỉ': 'Số 123 Đường Lê Lợi, P. Bến Nghé, Q.1, TP.HCM',
      'Diện tích': '120 m2',
      'Mục đích': 'Đất ở',
      'Thời hạn': 'Lâu dài',
      'Ngày cấp': '15/03/2020',
      'Cơ quan cấp': 'UBND Quận 1'
    }
  },
  CAN_CUOC: {
    text: `CĂN CƯỚC CÔNG DÂN\nSố: 079204001234\nHọ và tên: NGUYỄN VĂN MINH\nNgày sinh: 15/06/1990\nGiới tính: Nam\nQuốc tịch: Việt Nam\nQuê quán: Hà Nội\nNơi ĐKTT: 456 Nguyễn Huệ, Q.1, TP.HCM\nNgày cấp: 01/01/2022`,
    data: {
      'Số CCCD': '079204001234',
      'Họ tên': 'NGUYỄN VĂN MINH',
      'Ngày sinh': '15/06/1990',
      'Giới tính': 'Nam',
      'Quốc tịch': 'Việt Nam',
      'Quê quán': 'Hà Nội',
      'Nơi ĐKTT': '456 Nguyễn Huệ, Q.1, TP.HCM',
      'Ngày cấp': '01/01/2022'
    }
  },
  GIAY_KHAI_SINH: {
    text: `GIẤY KHAI SINH\nSố: 001/2020/KS\nHọ và tên: NGUYỄN MINH ANH\nNgày sinh: 01/01/2020\nGiới tính: Nữ\nNơi sinh: BV Từ Dũ, TP.HCM\nCha: NGUYỄN VĂN MINH\nMẹ: TRẦN THỊ HƯƠNG`,
    data: {
      'Số': '001/2020/KS',
      'Họ tên': 'NGUYỄN MINH ANH',
      'Ngày sinh': '01/01/2020',
      'Giới tính': 'Nữ',
      'Nơi sinh': 'BV Từ Dũ, TP.HCM',
      'Cha': 'NGUYỄN VĂN MINH',
      'Mẹ': 'TRẦN THỊ HƯƠNG'
    }
  },
  HOP_DONG: {
    text: 'Hợp đồng sẽ được nhận diện qua nội dung tải lên.',
    data: { 'Loại': 'Hợp đồng', 'Trạng thái': 'Cần phân tích chi tiết' }
  },
  KHAC: {
    text: 'Tài liệu chưa nhận diện được loại cụ thể.',
    data: { 'Loại': 'Khác', 'Trạng thái': 'Đang xử lý' }
  }
};

const DOC_LABELS: Record<ScannedDocType, string> = {
  SO_DO: '📜 Sổ đỏ / Sổ hồng',
  CAN_CUOC: '🪪 Căn cước công dân',
  GIAY_KHAI_SINH: '👶 Giấy khai sinh',
  HOP_DONG: '📄 Hợp đồng',
  KHAC: '📎 Tài liệu khác'
};

export const DocumentScanner: React.FC<DocumentScannerProps> = ({ onScanComplete, onAnalyzeContract, onDraftDocument }) => {
  const [mode, setMode] = useState<'IDLE' | 'CAMERA' | 'PROCESSING' | 'RESULT'>('IDLE');
  const [selectedDocType, setSelectedDocType] = useState<ScannedDocType>('CAN_CUOC');
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('');
  const [result, setResult] = useState<ScannedDocument | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
      setMode('CAMERA');
    } catch {
      alert('Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập hoặc sử dụng chức năng tải ảnh.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setMode('IDLE');
  };

  const captureFromCamera = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    setPreviewImage(imageData);
    stopCamera();
    processDocument(imageData);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = reader.result as string;
      setPreviewImage(img);
      processDocument(img);
    };
    reader.readAsDataURL(file);
  };

  const processDocument = useCallback(async (imageData: string) => {
    setMode('PROCESSING');
    setProgress(0);

    // Phase 1: Recognition
    setPhase('Đang nhận diện loại văn bản...');
    for (let i = 0; i <= 35; i++) {
      await new Promise(r => setTimeout(r, 25));
      setProgress(i);
    }

    // Phase 2: Extraction  
    setPhase('Đang bóc tách chữ (OCR Engine)...');
    for (let i = 35; i <= 70; i++) {
      await new Promise(r => setTimeout(r, 30));
      setProgress(i);
    }

    // Phase 3: Assembly
    setPhase('Đang ráp nối & xác minh dữ liệu...');
    for (let i = 70; i <= 100; i++) {
      await new Promise(r => setTimeout(r, 25));
      setProgress(i);
    }

    const mockResult = MOCK_OCR_RESULTS[selectedDocType];
    const doc: ScannedDocument = {
      id: Date.now().toString(),
      type: selectedDocType,
      rawImage: imageData,
      extractedText: mockResult.text,
      extractedData: mockResult.data,
      confidence: 0.92 + Math.random() * 0.07,
      scannedAt: new Date()
    };

    setResult(doc);
    setMode('RESULT');
    onScanComplete?.(doc);
  }, [selectedDocType, onScanComplete]);

  const handleReset = () => {
    setMode('IDLE');
    setResult(null);
    setPreviewImage(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAnalyze = () => {
    if (result && onAnalyzeContract) {
      onAnalyzeContract(result.extractedText, result.extractedData);
    }
  };

  const handleDraft = () => {
    if (result && onDraftDocument) {
      onDraftDocument(result.extractedText, result.extractedData);
    }
  };

  // === CAMERA MODE ===
  if (mode === 'CAMERA') {
    return (
      <div className="h-full flex flex-col bg-black relative">
        <video ref={videoRef} autoPlay playsInline muted className="flex-1 object-cover" />
        {/* Scanner Overlay */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Corner brackets */}
          <div className="absolute top-[15%] left-[10%] w-16 h-16 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg" />
          <div className="absolute top-[15%] right-[10%] w-16 h-16 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg" />
          <div className="absolute bottom-[25%] left-[10%] w-16 h-16 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg" />
          <div className="absolute bottom-[25%] right-[10%] w-16 h-16 border-b-2 border-r-2 border-emerald-400 rounded-br-lg" />
          {/* Laser scan line */}
          <div className="absolute left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-scanner-laser shadow-[0_0_15px_rgba(52,211,153,0.8)]" />
          {/* Dim overlay outside scan area */}
          <div className="absolute inset-0 bg-black/40" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, 10% 15%, 10% 75%, 90% 75%, 90% 15%, 10% 15%)' }} />
        </div>
        {/* Controls */}
        <div className="absolute bottom-0 inset-x-0 p-6 flex justify-center gap-6 bg-gradient-to-t from-black/80 to-transparent">
          <button onClick={stopCamera} className="w-14 h-14 rounded-full bg-slate-800/80 border border-slate-600 flex items-center justify-center text-white hover:bg-red-600 transition-colors">
            <X size={24} />
          </button>
          <button onClick={captureFromCamera} className="w-20 h-20 rounded-full bg-emerald-500 border-4 border-white flex items-center justify-center text-white hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/30">
            <Camera size={32} />
          </button>
          <div className="w-14 h-14" /> {/* Spacer */}
        </div>
        <div className="absolute top-4 inset-x-0 text-center">
          <span className="bg-black/60 backdrop-blur-sm text-emerald-400 text-sm font-bold px-4 py-2 rounded-full">
            📷 Đặt tài liệu trong khung quét
          </span>
        </div>
      </div>
    );
  }

  // === PROCESSING MODE ===
  if (mode === 'PROCESSING') {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#020617] relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-30 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center gap-8 max-w-md w-full px-6">
          {/* Animated scanner visual */}
          <div className="relative w-48 h-64 bg-slate-900/50 border-2 border-slate-700 rounded-xl overflow-hidden">
            {previewImage && (
              <img src={previewImage} alt="Scanning" className="w-full h-full object-cover opacity-40" />
            )}
            {/* Laser line animation */}
            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-scanner-laser shadow-[0_0_20px_rgba(52,211,153,0.9)]" />
            {/* Grid overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(52,211,153,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(52,211,153,0.05)_1px,transparent_1px)] bg-[size:1rem_1rem]" />
            {/* Corner markers */}
            <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-emerald-400" />
            <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-emerald-400" />
            <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-emerald-400" />
            <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-emerald-400" />
          </div>

          {/* Progress */}
          <div className="w-full space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-emerald-400 font-bold flex items-center gap-2">
                <Zap size={14} className="animate-pulse" /> {phase}
              </span>
              <span className="text-slate-400 font-mono">{progress}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-200 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-center text-xs text-slate-500">
              {DOC_LABELS[selectedDocType]} • ECOLAW Vision Engine v2.0
            </div>
          </div>
        </div>
      </div>
    );
  }

  // === RESULT MODE ===
  if (mode === 'RESULT' && result) {
    return (
      <div className="h-full flex flex-col bg-[#020617] overflow-auto custom-scrollbar">
        <div className="p-4 border-b border-slate-800 bg-slate-900 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
              <CheckCircle size={20} className="text-emerald-500" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Quét Thành Công</h3>
              <p className="text-xs text-slate-400">Độ chính xác: {(result.confidence * 100).toFixed(1)}%</p>
            </div>
          </div>
          <button onClick={handleReset} className="text-xs text-slate-400 hover:text-white px-3 py-1.5 bg-slate-800 rounded-lg transition-colors">
            Quét mới
          </button>
        </div>

        <div className="flex-1 p-4 space-y-4">
          {/* Preview */}
          {previewImage && (
            <div className="relative w-full h-40 rounded-xl overflow-hidden border border-slate-800">
              <img src={previewImage} alt="Scanned" className="w-full h-full object-cover" />
              <div className="absolute top-2 left-2 bg-emerald-500/90 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                {DOC_LABELS[result.type]}
              </div>
            </div>
          )}

          {/* Extracted Data */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-3 border-b border-slate-800 bg-slate-900">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <Eye size={12} /> Dữ liệu đã bóc tách
              </h4>
            </div>
            <div className="p-3 space-y-2">
              {Object.entries(result.extractedData).map(([key, value]) => (
                <div key={key} className="flex items-start gap-3 py-2 border-b border-slate-800/50 last:border-0">
                  <span className="text-xs text-slate-500 min-w-[100px] font-medium">{key}</span>
                  <span className="text-sm text-white font-mono">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* JSON Output */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">JSON Output</span>
              <button
                onClick={() => navigator.clipboard.writeText(JSON.stringify(result.extractedData, null, 2))}
                className="text-[10px] text-emerald-500 hover:text-emerald-400 font-bold"
              >
                Copy
              </button>
            </div>
            <pre className="p-3 text-xs text-emerald-400 font-mono overflow-x-auto">
              {JSON.stringify(result.extractedData, null, 2)}
            </pre>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              {onAnalyzeContract && (
                <button
                  onClick={handleAnalyze}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Shield size={18} /> Phân Tích Rủi Ro
                </button>
              )}
              {onDraftDocument && (
                <button
                  onClick={handleDraft}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
                >
                  <FileText size={18} /> Soạn Văn Bản
                </button>
              )}
            </div>
            <button
              onClick={handleReset}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white font-bold rounded-xl transition-colors"
            >
              Quét Lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  // === IDLE MODE (Default) ===
  return (
    <div className="h-full flex flex-col items-center justify-center bg-[#020617] relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="relative z-10 max-w-lg w-full px-4 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-emerald-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center border border-emerald-500/30 mb-4">
            <FileText size={36} className="text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">Quét Tài Liệu Thông Minh</h2>
          <p className="text-slate-400 text-sm">Tải lên hoặc quét qua camera — AI tự động nhận diện & bóc tách dữ liệu</p>
        </div>

        {/* Document Type Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loại tài liệu</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(Object.keys(DOC_LABELS) as ScannedDocType[]).map(type => (
              <button
                key={type}
                onClick={() => setSelectedDocType(type)}
                className={`p-3 rounded-xl border text-xs font-medium transition-all text-left ${
                  selectedDocType === type
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                    : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-600'
                }`}
              >
                {DOC_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        {/* Upload Area */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-2xl p-8 text-center cursor-pointer transition-all hover:bg-slate-900/30 group"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Upload size={40} className="mx-auto mb-3 text-slate-500 group-hover:text-emerald-400 transition-colors" />
          <p className="text-slate-300 font-medium">Kéo thả hoặc click để tải ảnh</p>
          <p className="text-xs text-slate-500 mt-1">Hỗ trợ JPG, PNG, HEIC (Max 20MB)</p>
        </div>

        {/* Camera Button */}
        <button
          onClick={startCamera}
          className="w-full py-4 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 rounded-2xl transition-all flex items-center justify-center gap-3 group"
        >
          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
            <Smartphone size={20} className="text-emerald-500" />
          </div>
          <div className="text-left">
            <span className="text-white font-bold block">Quét qua Camera</span>
            <span className="text-xs text-slate-400">Đưa tài liệu vào khung quét</span>
          </div>
        </button>

        {/* Demo button - use mock data */}
        <button
          onClick={() => {
            setPreviewImage(null);
            processDocument('demo');
          }}
          className="w-full py-3 text-sm text-emerald-500 hover:text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 rounded-xl transition-all font-medium"
        >
          ⚡ Demo nhanh — Dùng dữ liệu mẫu
        </button>
      </div>
    </div>
  );
};
