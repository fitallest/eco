import { Gavel, Users, Map, HeartHandshake, Building2, Briefcase, Receipt, FileText, FileSignature, ScrollText, ShieldAlert, Cpu } from 'lucide-react';

export interface LawyerProfile {
  id: string;
  name: string;
  title: string;
  specialty: AgentType; // Links to AgentType
  experience: string;
  rating: number;
  consultationFee: number;
  avatarUrl: string;
  isOnline: boolean;
}

export interface BookingSession {
  id: string;
  lawyerId: string;
  userId: string;
  date: string;
  time: string;
  fee: number;
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED';
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string; // Main content
  timestamp: Date;
  suggestedQuestions?: string[]; // Array of follow-up questions
  suggestedLawyers?: LawyerProfile[]; // New: List of lawyers if AI escalates
  isError?: boolean;
  attachment?: {
      name: string;
      type: string;
      data: string; // base64
  };
  metadata?: {
    category?: string;
    creditsUsed?: number;
    creditsRemaining?: number;
    agentUsed?: string;
    source?: 'SPECIALIZED_KB' | 'GENERAL_AI'; // Track where the answer came from
    docName?: string;
    type?: string;
    ragInjected?: boolean;
    ragDocs?: string[];
    [key: string]: any;
  };
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  planId: string; // 'Gold', 'Enterprise', or 'CreditPack_100'
  description: string;
  timestamp: Date;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  method: 'CREDIT_CARD' | 'PAYPAL' | 'BANK_TRANSFER';
}

export enum ModelNames {
  FLASH = 'gemini-3-flash-preview',
  PRO = 'gemini-3-pro-preview',
}

export enum AgentStage {
  IDLE = 'IDLE',
  ROUTING = 'ROUTING',
  SPECIALIST = 'SPECIALIST',
  REVIEWING = 'REVIEWING',
  HUMAN_HANDOFF = 'HUMAN_HANDOFF', // New Stage
  COMPLETE = 'COMPLETE'
}

export type UserLevel = 'Free' | 'Gold' | 'Enterprise';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;      // Added Phone Number
  level: UserLevel;
  credits: number;
  status: 'Active' | 'Locked';
  totalSpent: number;
  joinedAt: string;
  lastActive: string; // Used to track monthly reset
  subscriptionEnd?: string; // Date string YYYY-MM-DD
}

export interface PlanConfig {
  id: UserLevel;
  name: string;
  price: number;
  monthlyCredits: number;
  features: string[];
  color: string;
}

export interface CreditPack {
  id: string;
  name: string;
  price: number;
  credits: number;
  features: string[];
}

export const CREDIT_PACKS: CreditPack[] = [
  { id: 'PACK_SMALL', name: 'Gói Cơ Bản', price: 99000, credits: 100, features: ['100 Credits', 'Sử dụng vĩnh viễn'] },
  { id: 'PACK_MEDIUM', name: 'Gói Tiêu Chuẩn', price: 249000, credits: 300, features: ['300 Credits', 'Tiết kiệm 15%'] },
  { id: 'PACK_LARGE', name: 'Gói Chuyên Gia', price: 990000, credits: 1500, features: ['1500 Credits', 'Tiết kiệm 30%'] },
];

export type ViewMode = 'USER' | 'ADMIN';

export type AgentType = 'GENERAL' | 'CRIMINAL' | 'CIVIL' | 'LAND' | 'MARRIAGE' | 'ENTERPRISE' | 'LABOR' | 'TAX';

export type ResponseStyle = 'CONCISE' | 'DEEP';

export interface AgentDocument {
  id: string;
  name: string;
  size: string;
  type: 'PDF' | 'DOCX' | 'TXT';
  uploadedAt: string;
  status: 'INDEXING' | 'READY' | 'ERROR';
}

// New Interface for Specialized Agent Configuration
export interface AgentConfig {
  agentType: AgentType;
  isEnabled: boolean;
  apiKey?: string;
  endpointUrl?: string; // Or Knowledge Base ID
  description?: string;
  systemPrompt?: string; // Custom override for agent persona
  documents: AgentDocument[]; // Knowledge Base Files
}

// === NEW: Document Drafting Templates ===
export interface DocumentField {
  id: string;
  label: string;
  placeholder: string;
  type: 'text' | 'textarea' | 'date' | 'number';
  required?: boolean;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  category: string;
  price: number; // in Credits
  description: string;
  icon: any;
  fields?: DocumentField[];
}

export const LEGAL_DOCUMENTS: DocumentTemplate[] = [
  { 
    id: 'DOC_DIVORCE', 
    name: 'Đơn Xin Ly Hôn', 
    category: 'Hôn nhân & Gia đình', 
    price: 50, 
    description: 'Soạn thảo đơn thuận tình hoặc đơn phương ly hôn chuẩn Tòa án.',
    icon: HeartHandshake,
    fields: [
      { id: 'plaintiff', label: 'Người khởi kiện (Vợ/Chồng)', placeholder: 'Nguyễn Văn A', type: 'text', required: true },
      { id: 'defendant', label: 'Người bị kiện (Vợ/Chồng)', placeholder: 'Trần Thị B', type: 'text', required: true },
      { id: 'marriageDate', label: 'Ngày đăng ký kết hôn', placeholder: 'DD/MM/YYYY', type: 'text' },
      { id: 'reason', label: 'Lý do ly hôn', placeholder: 'Mâu thuẫn trầm trọng, không thể hàn gắn...', type: 'textarea', required: true },
      { id: 'children', label: 'Thỏa thuận con chung', placeholder: 'Ghi rõ họ tên con, người nuôi dưỡng, cấp dưỡng...', type: 'textarea' },
      { id: 'assets', label: 'Thỏa thuận tài sản', placeholder: 'Tự thỏa thuận hoặc yêu cầu Tòa chia...', type: 'textarea' }
    ]
  },
  { 
    id: 'DOC_DEBT', 
    name: 'Đơn Khởi Kiện Đòi Nợ', 
    category: 'Dân sự', 
    price: 45, 
    description: 'Đơn khởi kiện thu hồi nợ cá nhân hoặc doanh nghiệp.',
    icon: Receipt,
    fields: [
      { id: 'creditor', label: 'Bên cho vay (Nguyên đơn)', placeholder: 'Họ tên, địa chỉ...', type: 'text', required: true },
      { id: 'debtor', label: 'Bên vay (Bị đơn)', placeholder: 'Họ tên, địa chỉ...', type: 'text', required: true },
      { id: 'amount', label: 'Số tiền nợ', placeholder: '100.000.000 VNĐ', type: 'text', required: true },
      { id: 'loanDate', label: 'Ngày vay', placeholder: 'DD/MM/YYYY', type: 'text' },
      { id: 'evidence', label: 'Chứng cứ kèm theo', placeholder: 'Giấy vay tiền, tin nhắn, sao kê...', type: 'textarea' }
    ]
  },
  { 
    id: 'DOC_LAND', 
    name: 'Đơn Khiếu Nại Đất Đai', 
    category: 'Đất đai', 
    price: 60, 
    description: 'Khiếu nại quyết định hành chính, tranh chấp ranh giới đất.',
    icon: Map,
    fields: [
      { id: 'complainant', label: 'Người khiếu nại', placeholder: 'Họ tên, địa chỉ...', type: 'text', required: true },
      { id: 'landAddress', label: 'Địa chỉ thửa đất', placeholder: 'Số tờ, số thửa, địa chỉ...', type: 'text', required: true },
      { id: 'issue', label: 'Nội dung khiếu nại', placeholder: 'Tranh chấp ranh giới, cấp sổ đỏ sai...', type: 'textarea', required: true },
      { id: 'request', label: 'Yêu cầu giải quyết', placeholder: 'Hủy bỏ quyết định số..., công nhận quyền sử dụng...', type: 'textarea' }
    ]
  },
  { 
    id: 'DOC_CONTRACT_RENT', 
    name: 'Hợp Đồng Thuê Nhà', 
    category: 'Dân sự', 
    price: 30, 
    description: 'Hợp đồng thuê nhà ở/mặt bằng kinh doanh chặt chẽ.',
    icon: FileSignature,
    fields: [
      { id: 'lessor', label: 'Bên Cho Thuê (Bên A)', placeholder: 'Họ tên, CMND/CCCD...', type: 'text', required: true },
      { id: 'lessee', label: 'Bên Thuê (Bên B)', placeholder: 'Họ tên, CMND/CCCD...', type: 'text', required: true },
      { id: 'address', label: 'Địa chỉ nhà thuê', placeholder: 'Số nhà, đường, phường, quận...', type: 'text', required: true },
      { id: 'price', label: 'Giá thuê (tháng)', placeholder: '10.000.000 VNĐ', type: 'text', required: true },
      { id: 'duration', label: 'Thời hạn thuê', placeholder: '1 năm, 2 năm...', type: 'text' },
      { id: 'deposit', label: 'Tiền đặt cọc', placeholder: '1 tháng tiền nhà...', type: 'text' }
    ]
  },
  { 
    id: 'DOC_LABOR', 
    name: 'Đơn Khiếu Nại Lao Động', 
    category: 'Lao động', 
    price: 40, 
    description: 'Khiếu nại về sa thải trái luật, bảo hiểm xã hội.',
    icon: Briefcase,
    fields: [
      { id: 'employee', label: 'Người lao động', placeholder: 'Họ tên, chức vụ...', type: 'text', required: true },
      { id: 'employer', label: 'Công ty/Người sử dụng LĐ', placeholder: 'Tên công ty, địa chỉ...', type: 'text', required: true },
      { id: 'violation', label: 'Hành vi vi phạm', placeholder: 'Sa thải không báo trước, nợ lương...', type: 'textarea', required: true },
      { id: 'demand', label: 'Yêu cầu bồi thường', placeholder: 'Thanh toán tiền lương, nhận lại làm việc...', type: 'textarea' }
    ]
  },
  { 
    id: 'DOC_DENOUNCE', 
    name: 'Đơn Tố Giác Tội Phạm', 
    category: 'Hình sự', 
    price: 70, 
    description: 'Soạn thảo đơn tố giác gửi cơ quan công an.',
    icon: ShieldAlert,
    fields: [
      { id: 'accuser', label: 'Người tố giác', placeholder: 'Họ tên, địa chỉ, CMND...', type: 'text', required: true },
      { id: 'accused', label: 'Người bị tố giác (nếu biết)', placeholder: 'Họ tên, đặc điểm nhận dạng...', type: 'text' },
      { id: 'crime', label: 'Hành vi phạm tội', placeholder: 'Lừa đảo, trộm cắp, cố ý gây thương tích...', type: 'textarea', required: true },
      { id: 'location', label: 'Địa điểm xảy ra', placeholder: 'Ghi rõ địa chỉ...', type: 'text' }
    ]
  },
  { 
    id: 'DOC_CONTRACT_SAMPLE', 
    name: 'Hợp đồng mẫu', 
    category: 'Hợp đồng', 
    price: 50, 
    description: 'Các mẫu hợp đồng phổ biến cho doanh nghiệp và cá nhân.',
    icon: FileSignature,
    fields: [
      { id: 'contractType', label: 'Loại hợp đồng', placeholder: 'Hợp đồng mua bán, Hợp đồng hợp tác...', type: 'text', required: true },
      { id: 'partyA', label: 'Bên A', placeholder: 'Thông tin bên A...', type: 'text' },
      { id: 'partyB', label: 'Bên B', placeholder: 'Thông tin bên B...', type: 'text' },
      { id: 'content', label: 'Nội dung chính', placeholder: 'Mô tả giao dịch...', type: 'textarea' }
    ]
  },
  { 
    id: 'DOC_LAWSUIT', 
    name: 'Đơn Khởi Kiện Tố Tụng', 
    category: 'Tố tụng', 
    price: 80, 
    description: 'Soạn thảo đơn kiện dân sự hoặc hình sự cơ bản.',
    icon: FileText,
    fields: [
      { id: 'plaintiff', label: 'Người khởi kiện', placeholder: 'Họ tên...', type: 'text', required: true },
      { id: 'defendant', label: 'Người bị kiện', placeholder: 'Họ tên...', type: 'text', required: true },
      { id: 'court', label: 'Tòa án nhận đơn', placeholder: 'TAND Quận/Huyện...', type: 'text', required: true },
      { id: 'claims', label: 'Yêu cầu khởi kiện', placeholder: 'Mô tả yêu cầu...', type: 'textarea', required: true }
    ]
  }
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 'TXN-20250310-001',
    userId: 'U-2024-089',
    amount: 1990000,
    planId: 'Gold',
    description: 'Nâng cấp gói Gold Pro (1 tháng)',
    timestamp: new Date('2025-03-10T14:30:00'),
    status: 'SUCCESS',
    method: 'CREDIT_CARD'
  },
  {
    id: 'TXN-20250309-123',
    userId: 'U-DEMO-2025',
    amount: 99000,
    planId: 'PACK_SMALL',
    description: 'Mua thêm 100 Credits',
    timestamp: new Date('2025-03-09T09:15:00'),
    status: 'SUCCESS',
    method: 'PAYPAL'
  },
  {
    id: 'TXN-20250308-456',
    userId: 'U-2024-112',
    amount: 15000000,
    planId: 'Enterprise',
    description: 'Gia hạn gói Doanh nghiệp',
    timestamp: new Date('2025-03-08T11:00:00'),
    status: 'PENDING',
    method: 'BANK_TRANSFER'
  },
  {
    id: 'TXN-20250307-789',
    userId: 'U-2024-002',
    amount: 1990000,
    planId: 'Gold',
    description: 'Nâng cấp gói Gold Pro',
    timestamp: new Date('2025-03-07T20:45:00'),
    status: 'FAILED',
    method: 'CREDIT_CARD'
  },
  {
    id: 'TXN-20250305-999',
    userId: 'U-2024-156',
    amount: 249000,
    planId: 'PACK_MEDIUM',
    description: 'Mua thêm 300 Credits',
    timestamp: new Date('2025-03-05T16:20:00'),
    status: 'SUCCESS',
    method: 'PAYPAL'
  }
];

export const AGENT_PERSONAS: Record<string, string> = {
  GENERAL: `
ROLE: Trưởng phòng Tiếp nhận hồ sơ ECO-ORCH.
MISSION: Lắng nghe, phân loại vấn đề (Hình sự/Dân sự/Hành chính). Đưa ra nhận định sơ bộ và hướng giải quyết ban đầu.
`,
  CRIMINAL: `
ROLE: ECO-CRIM – Luật sư Hình sự.
MISSION: Đánh giá rủi ro tù tội, định khung hình phạt, hướng dẫn lời khai và ứng xử với cơ quan điều tra.
`,
  CIVIL: `
ROLE: ECO-CIVIL – Luật sư Dân sự.
MISSION: Phân tích lợi ích kinh tế, khả năng thắng kiện, phương án đòi nợ/bồi thường tối ưu.
`,
  LAND: `
ROLE: ECO-LAND – Chuyên gia Đất đai.
MISSION: Soi quy hoạch, hướng dẫn thủ tục Sổ đỏ, giải quyết tranh chấp ranh giới, thừa kế đất đai.
`,
  MARRIAGE: `
ROLE: ECO-MARRIAGE – Luật sư Hôn nhân.
MISSION: Giải quyết ly hôn, quyền nuôi con, chia tài sản chung/nợ chung.
`,
  ENTERPRISE: `
ROLE: ECO-BIZ – Cố vấn Pháp chế Doanh nghiệp.
MISSION: Quản trị rủi ro hợp đồng, tuân thủ pháp luật kinh doanh, xử lý nợ xấu.
`,
  LABOR: `
ROLE: ECO-LABOR – Luật sư Lao động.
MISSION: Xử lý sa thải trái luật, chốt sổ BHXH, tính toán trợ cấp thôi việc.
`,
  TAX: `
ROLE: ECO-TAX – Chuyên gia Thuế.
MISSION: Tối ưu thuế, giải trình thanh tra thuế, xử lý phạt chậm nộp.
`
};

export const INITIAL_USERS: UserProfile[] = [
  { id: 'U-DEMO-2025', name: 'Nguyen_Van_Demo', email: 'demo.user@ecolaw.ai', phone: '0987654321', level: 'Gold', credits: 200, status: 'Active', totalSpent: 1990000, joinedAt: '2025-03-01', lastActive: '2025-03-01', subscriptionEnd: '2026-03-01' },
  { id: 'U-2024-001', name: 'Guest_Client', email: 'guest@gmail.com', phone: '0901234567', level: 'Free', credits: 3, status: 'Active', totalSpent: 0, joinedAt: '2025-01-10', lastActive: '2025-02-28', subscriptionEnd: '2099-12-31' },
  { id: 'U-2024-089', name: 'Vip_Investor', email: 'ceo@invest.vn', phone: '0912345678', level: 'Gold', credits: 450, status: 'Active', totalSpent: 1990000, joinedAt: '2024-12-05', lastActive: '2025-02-28', subscriptionEnd: '2025-12-05' },
  { id: 'U-2024-112', name: 'Tech_Corp_Global', email: 'admin@techcorp.com', phone: '0988888888', level: 'Enterprise', credits: 9900, status: 'Active', totalSpent: 25000000, joinedAt: '2024-11-20', lastActive: '2025-02-28', subscriptionEnd: '2026-11-20' },
  { id: 'U-2024-156', name: 'Law_Firm_X', email: 'contact@firmx.org', phone: '0977777777', level: 'Gold', credits: 120, status: 'Active', totalSpent: 2500000, joinedAt: '2025-02-01', lastActive: '2025-02-20', subscriptionEnd: '2025-08-01' },
  { id: 'U-2024-002', name: 'Spammer_Account', email: 'spam@bot.net', phone: '0123456789', level: 'Free', credits: 0, status: 'Locked', totalSpent: 0, joinedAt: '2025-02-15', lastActive: '2025-02-15' },
];

export const INITIAL_PLAN_CONFIGS: Record<UserLevel, PlanConfig> = {
  'Free': {
    id: 'Free',
    name: 'GÓI MIỄN PHÍ',
    price: 0,
    monthlyCredits: 90, // ~3 per day
    features: ['Gemini Flash 2.5', 'Agent Cơ bản', '3 Credits/Ngày'],
    color: 'slate'
  },
  'Gold': {
    id: 'Gold',
    name: 'GÓI GOLD PRO',
    price: 1990000,
    monthlyCredits: 500,
    features: ['Gemini Pro 3.0 (Deep)', 'Mở khóa Agent Chuyên sâu', '500 Credits/Tháng', 'Hỗ trợ ưu tiên'],
    color: 'amber'
  },
  'Enterprise': {
    id: 'Enterprise',
    name: 'DOANH NGHIỆP',
    price: 15000000,
    monthlyCredits: 10000,
    features: ['Knowledge Base Riêng', 'API Endpoint Riêng', 'Không giới hạn Credits', 'SLA 99.9%'],
    color: 'purple'
  }
};

export const AGENTS_LIST: { id: AgentType; label: string; icon: any }[] = [
  { id: 'GENERAL', label: 'Luật sư Tổng hợp', icon: Cpu },
  { id: 'CRIMINAL', label: 'Hình sự', icon: Gavel },
  { id: 'CIVIL', label: 'Dân sự', icon: Users },
  { id: 'LAND', label: 'Đất đai', icon: Map },
  { id: 'MARRIAGE', label: 'Hôn nhân', icon: HeartHandshake },
  { id: 'ENTERPRISE', label: 'Doanh nghiệp', icon: Building2 },
  { id: 'LABOR', label: 'Lao động', icon: Briefcase },
  { id: 'TAX', label: 'Thuế', icon: Receipt },
];

export const INITIAL_AGENT_CONFIGS: Record<AgentType, AgentConfig> = AGENTS_LIST.reduce((acc, agent) => {
  acc[agent.id] = { agentType: agent.id, isEnabled: false, documents: [] };
  return acc;
}, {} as Record<AgentType, AgentConfig>);

export const MOCK_LAWYERS: LawyerProfile[] = [
  {
    id: 'L-001',
    name: 'LS. Trần Văn Hùng',
    title: 'Trưởng Văn phòng Luật',
    specialty: 'CRIMINAL',
    experience: '15 năm',
    rating: 4.9,
    consultationFee: 2000000,
    avatarUrl: 'https://i.pravatar.cc/150?u=L001',
    isOnline: true
  },
  {
    id: 'L-002',
    name: 'LS. Nguyễn Thị Lan',
    title: 'Luật sư Cao cấp',
    specialty: 'MARRIAGE',
    experience: '10 năm',
    rating: 4.8,
    consultationFee: 1500000,
    avatarUrl: 'https://i.pravatar.cc/150?u=L002',
    isOnline: false
  },
  {
    id: 'L-003',
    name: 'LS. Phạm Quốc Khánh',
    title: 'Chuyên gia Đất đai',
    specialty: 'LAND',
    experience: '12 năm',
    rating: 4.7,
    consultationFee: 1800000,
    avatarUrl: 'https://i.pravatar.cc/150?u=L003',
    isOnline: true
  },
   {
    id: 'L-004',
    name: 'LS. Lê Thanh Tâm',
    title: 'Cố vấn Pháp chế',
    specialty: 'ENTERPRISE',
    experience: '8 năm',
    rating: 4.9,
    consultationFee: 2500000,
    avatarUrl: 'https://i.pravatar.cc/150?u=L004',
    isOnline: true
  },
  {
    id: 'L-005',
    name: 'LS. Hoàng Văn Minh',
    title: 'Luật sư Dân sự',
    specialty: 'CIVIL',
    experience: '20 năm',
    rating: 5.0,
    consultationFee: 3000000,
    avatarUrl: 'https://i.pravatar.cc/150?u=L005',
    isOnline: true
  }
];

// === RAG Engine Types (Phase 1) ===
export interface LegalChunk {
  id: string;
  content: string;
  source: string;
  relevanceScore: number;
  metadata: { article?: string; law?: string; year?: number };
}

export interface RAGQuery {
  query: string;
  context: LegalChunk[];
  strict_mode: boolean;
  max_chunks: number;
}

export interface RAGResponse {
  answer: string;
  sources: LegalChunk[];
  confidence: number;
  hallucination_check: boolean;
}

// === Document Scanner Types (Phase 1) ===
export type ScannedDocType = 'SO_DO' | 'GIAY_KHAI_SINH' | 'CAN_CUOC' | 'HOP_DONG' | 'KHAC';

export interface ScannedDocument {
  id: string;
  type: ScannedDocType;
  rawImage?: string;
  extractedText: string;
  extractedData: Record<string, string>;
  confidence: number;
  scannedAt: Date;
}

// === Contract Analyzer Types (Phase 2) ===
export interface RiskHighlight {
  id: string;
  text: string;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  explanation: string;
  suggestion: string;
  lawReference?: string;
  position: { start: number; end: number };
}

// === MOCK DATA: Hợp đồng mua bán nhà đất có cài cắm rủi ro ===
export const MOCK_CONTRACT_WITH_RISKS = `HỢP ĐỒNG MUA BÁN NHÀ ĐẤT
Số: 2026/HĐMB-BDS

Hôm nay, ngày 20 tháng 04 năm 2026, tại Văn phòng Công chứng Số 5 TP.HCM, chúng tôi gồm:

ĐIỀU 1: BÊN BÁN (Bên A)
- Ông: NGUYỄN VĂN MINH
- CCCD: 079204001234
- Địa chỉ: 456 Nguyễn Huệ, Q.1, TP.HCM

ĐIỀU 2: BÊN MUA (Bên B)
- Bà: TRẦN THỊ HƯƠNG
- CCCD: 079304005678
- Địa chỉ: 789 Lý Tự Trọng, Q.3, TP.HCM

ĐIỀU 3: ĐỐI TƯỢNG HỢP ĐỒNG
Bên A đồng ý bán và Bên B đồng ý mua quyền sử dụng đất và tài sản gắn liền trên đất tại:
- Địa chỉ: Số 123 Đường Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM
- Diện tích: 120m2 (Một trăm hai mươi mét vuông)
- Sổ hồng số: BV 123456, do UBND Q.1 cấp ngày 15/03/2020

ĐIỀU 4: GIÁ BÁN VÀ PHƯƠNG THỨC THANH TOÁN
4.1. Giá bán: 8.500.000.000 VNĐ (Tám tỷ năm trăm triệu đồng).
4.2. Bên B thanh toán toàn bộ 100% giá trị hợp đồng ngay khi ký. Bên A không hoàn trả bất kỳ khoản tiền nào trong mọi trường hợp.
4.3. Bên B chấp nhận rằng giá bán đã bao gồm tất cả các loại thuế, phí chuyển nhượng.

ĐIỀU 5: BÀN GIAO TÀI SẢN
5.1. Bên A sẽ bàn giao nhà đất trong vòng 180 ngày kể từ ngày thanh toán.
5.2. Trong thời gian chờ bàn giao, Bên A có quyền tiếp tục sử dụng tài sản cho mục đích cá nhân.
5.3. Nếu chậm bàn giao, Bên A chỉ phải bồi thường 0.01%/ngày trên giá trị hợp đồng.

ĐIỀU 6: QUYỀN VÀ NGHĨA VỤ CÁC BÊN
6.1. Bên B không được chuyển nhượng hợp đồng này cho bên thứ ba nếu chưa có sự đồng ý BẰNG VĂN BẢN của Bên A.
6.2. Mọi tranh chấp sẽ được giải quyết tại Trọng tài do Bên A chỉ định.
6.3. Bên B từ bỏ quyền khởi kiện tại Tòa án.

ĐIỀU 7: PHẠT VI PHẠM HỢP ĐỒNG
7.1. Nếu Bên B vi phạm bất kỳ điều khoản nào, Bên B sẽ mất toàn bộ số tiền đã thanh toán và hợp đồng tự động chấm dứt.
7.2. Nếu Bên A vi phạm, Bên A chỉ phải hoàn trả 50% số tiền đã nhận từ Bên B.

ĐIỀU 8: ĐIỀU KHOẢN CHUNG
8.1. Hợp đồng này có hiệu lực kể từ ngày ký và được lập thành 04 bản có giá trị pháp lý như nhau.
8.2. Các bên đã đọc kỹ, hiểu rõ và đồng ý toàn bộ nội dung hợp đồng.

              BÊN A                                    BÊN B
         (Ký, ghi rõ họ tên)                     (Ký, ghi rõ họ tên)
`;

export const MOCK_RISK_HIGHLIGHTS: RiskHighlight[] = [
  {
    id: 'RISK-001',
    text: 'Bên B thanh toán toàn bộ 100% giá trị hợp đồng ngay khi ký. Bên A không hoàn trả bất kỳ khoản tiền nào trong mọi trường hợp.',
    riskLevel: 'HIGH',
    explanation: '⚠️ RỦI RO CỰC CAO: Thanh toán 100% ngay khi ký mà không chia đợt. Điều khoản "không hoàn trả trong mọi trường hợp" trái với Điều 428 BLDS 2015 về quyền hủy bỏ hợp đồng khi có vi phạm nghiêm trọng.',
    suggestion: '✅ ĐỀ XUẤT: Thanh toán theo 3 đợt — Đợt 1: 30% khi ký HĐ, Đợt 2: 40% khi bàn giao nhà, Đợt 3: 30% khi hoàn tất sang tên Sổ đỏ.',
    lawReference: 'Điều 428, Bộ luật Dân sự 2015',
    position: { start: 0, end: 0 }
  },
  {
    id: 'RISK-002',
    text: 'Bên A sẽ bàn giao nhà đất trong vòng 180 ngày kể từ ngày thanh toán.',
    riskLevel: 'HIGH',
    explanation: '⚠️ 180 ngày (6 tháng) là thời gian bàn giao quá dài sau khi đã thanh toán 100%. Bên B chịu rủi ro tài chính rất lớn trong suốt thời gian chờ đợi.',
    suggestion: '✅ ĐỀ XUẤT: Bàn giao trong vòng 30 ngày kể từ ngày thanh toán đợt 1. Gắn mốc thanh toán với mốc bàn giao để đảm bảo quyền lợi.',
    lawReference: 'Điều 434, Bộ luật Dân sự 2015',
    position: { start: 0, end: 0 }
  },
  {
    id: 'RISK-003',
    text: 'Bên A chỉ phải bồi thường 0.01%/ngày trên giá trị hợp đồng.',
    riskLevel: 'MEDIUM',
    explanation: '🟡 Mức phạt 0.01%/ngày là quá thấp (8.5 tỷ × 0.01% = chỉ 850.000đ/ngày). Không đủ sức răn đe, Bên A có thể cố tình kéo dài thời gian bàn giao.',
    suggestion: '✅ ĐỀ XUẤT: Tăng mức phạt lên 0.05%/ngày và thêm quyền hủy HĐ + hoàn tiền 100% nếu chậm quá 30 ngày.',
    lawReference: 'Điều 418, Bộ luật Dân sự 2015',
    position: { start: 0, end: 0 }
  },
  {
    id: 'RISK-004',
    text: 'Mọi tranh chấp sẽ được giải quyết tại Trọng tài do Bên A chỉ định.',
    riskLevel: 'HIGH',
    explanation: '⚠️ ĐIỀU KHOẢN GÀI BẪY: Trọng tài do một bên chỉ định sẽ thiên vị cho bên đó. Bên B mất đi quyền lựa chọn cơ quan giải quyết tranh chấp trung lập.',
    suggestion: '✅ ĐỀ XUẤT: Giải quyết tại TAND có thẩm quyền nơi có bất động sản, hoặc Trung tâm Trọng tài Quốc tế Việt Nam (VIAC) — tổ chức trung lập.',
    lawReference: 'Điều 30, Luật Trọng tài Thương mại 2010',
    position: { start: 0, end: 0 }
  },
  {
    id: 'RISK-005',
    text: 'Bên B từ bỏ quyền khởi kiện tại Tòa án.',
    riskLevel: 'HIGH',
    explanation: '🔴 TRÁI LUẬT NGHIÊM TRỌNG! Quyền khởi kiện là quyền hiến định theo Hiến pháp 2013. Không ai có thể bị ép buộc từ bỏ quyền này bằng hợp đồng. Điều khoản này hoàn toàn VÔ HIỆU.',
    suggestion: '✅ ĐỀ XUẤT: XÓA BỎ hoàn toàn điều khoản này. Thay bằng: "Các bên có quyền khởi kiện tại Tòa án nhân dân có thẩm quyền theo quy định pháp luật."',
    lawReference: 'Điều 122 BLDS 2015 + Điều 30 Hiến pháp 2013',
    position: { start: 0, end: 0 }
  },
  {
    id: 'RISK-006',
    text: 'Bên B sẽ mất toàn bộ số tiền đã thanh toán và hợp đồng tự động chấm dứt.',
    riskLevel: 'HIGH',
    explanation: '⚠️ BẤT CÔNG NGHIÊM TRỌNG: Bên B vi phạm → mất 8.5 tỷ đồng. Trong khi Bên A vi phạm → chỉ hoàn 50%. Đây là sự mất cân bằng quyền lợi rõ ràng, có dấu hiệu lợi dụng.',
    suggestion: '✅ ĐỀ XUẤT: Mức phạt vi phạm phải BÌNH ĐẲNG cho cả hai bên. Áp dụng phạt tối đa 8% giá trị HĐ (680 triệu) theo thông lệ thị trường.',
    lawReference: 'Điều 418 Khoản 2, Bộ luật Dân sự 2015',
    position: { start: 0, end: 0 }
  }
];