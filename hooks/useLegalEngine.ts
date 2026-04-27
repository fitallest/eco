import { useState, useCallback } from 'react';
import { LegalChunk, RAGQuery, RAGResponse } from '../types';

const MOCK_LEGAL_KB: LegalChunk[] = [
  {
    id: 'KB-001',
    content: 'Theo Điều 428 BLDS 2015, một bên có quyền hủy bỏ hợp đồng khi bên kia vi phạm nghiêm trọng nghĩa vụ hợp đồng.',
    source: 'Bộ luật Dân sự 2015',
    relevanceScore: 0,
    metadata: { article: 'Điều 428', law: 'BLDS', year: 2015 }
  },
  {
    id: 'KB-002',
    content: 'Điều 418 BLDS 2015: Mức phạt vi phạm do các bên thỏa thuận. Trong thương mại không quá 8% giá trị nghĩa vụ bị vi phạm.',
    source: 'Bộ luật Dân sự 2015',
    relevanceScore: 0,
    metadata: { article: 'Điều 418', law: 'BLDS', year: 2015 }
  },
  {
    id: 'KB-003',
    content: 'Điều 122 BLDS 2015: Giao dịch dân sự vô hiệu khi vi phạm điều cấm. Quyền khởi kiện là quyền hiến định (Điều 30 HP 2013).',
    source: 'BLDS 2015 + Hiến pháp 2013',
    relevanceScore: 0,
    metadata: { article: 'Điều 122', law: 'BLDS', year: 2015 }
  },
  {
    id: 'KB-004',
    content: 'Luật Đất đai 2024: Thời hạn bàn giao quyền sử dụng đất phải ghi rõ trong hợp đồng. HĐ chuyển nhượng phải công chứng.',
    source: 'Luật Đất đai 2024',
    relevanceScore: 0,
    metadata: { article: 'Điều 45', law: 'Luật Đất đai', year: 2024 }
  },
  {
    id: 'KB-005',
    content: 'Điều 30 Luật TTTM 2010: Thỏa thuận trọng tài phải tự nguyện. Trọng tài do một bên chỉ định có thể bị vô hiệu.',
    source: 'Luật Trọng tài TM 2010',
    relevanceScore: 0,
    metadata: { article: 'Điều 30', law: 'Luật TTTM', year: 2010 }
  },
  {
    id: 'KB-006',
    content: 'Điều 434 BLDS 2015: Bên bán phải giao tài sản đúng thời hạn đã thỏa thuận. Bên mua có quyền yêu cầu bàn giao bất cứ lúc nào.',
    source: 'Bộ luật Dân sự 2015',
    relevanceScore: 0,
    metadata: { article: 'Điều 434', law: 'BLDS', year: 2015 }
  }
];

function chunkDocument(text: string, chunkSize: number = 500, overlap: number = 50): LegalChunk[] {
  const chunks: LegalChunk[] = [];
  let pos = 0, idx = 0;
  while (pos < text.length) {
    const end = Math.min(pos + chunkSize, text.length);
    chunks.push({
      id: `chunk-${idx}`,
      content: text.slice(pos, end).trim(),
      source: 'Tài liệu người dùng',
      relevanceScore: 0,
      metadata: {}
    });
    pos += chunkSize - overlap;
    idx++;
  }
  return chunks;
}

function searchContext(query: string, chunks: LegalChunk[], topK: number = 5): LegalChunk[] {
  const tokens = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);
  const scored = chunks.map(chunk => {
    const cl = chunk.content.toLowerCase();
    let score = 0;
    tokens.forEach(token => {
      const m = cl.match(new RegExp(token, 'gi'));
      if (m) score += m.length * (1 / Math.log(chunk.content.length + 1));
    });
    if (cl.includes(query.toLowerCase().slice(0, 30))) score += 2;
    return { ...chunk, relevanceScore: Math.min(score, 1) };
  });
  return scored.filter(c => c.relevanceScore > 0).sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, topK);
}

function validateNoHallucination(answer: string, context: LegalChunk[]): boolean {
  const ctx = context.map(c => c.content).join(' ').toLowerCase();
  const sentences = answer.split(/[.!?]/).filter(s => s.trim().length > 10);
  let valid = 0;
  sentences.forEach(s => {
    const kws = s.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    if (kws.length === 0) return;
    const matched = kws.filter(kw => ctx.includes(kw)).length;
    if (matched / kws.length > 0.3) valid++;
  });
  return sentences.length === 0 || (valid / sentences.length) > 0.5;
}

async function mockRAGQuery(query: RAGQuery): Promise<RAGResponse> {
  await new Promise(r => setTimeout(r, 800 + Math.random() * 1200));
  const { context, strict_mode } = query;

  if (context.length === 0 && strict_mode) {
    return {
      answer: '⚠️ Không tìm thấy thông tin liên quan trong tài liệu được cung cấp. Vui lòng cung cấp thêm ngữ cảnh.',
      sources: [],
      confidence: 0,
      hallucination_check: true
    };
  }

  let answer = `📋 **KẾT QUẢ TRA CỨU** ${strict_mode ? '(Strict Mode)' : ''}\n\nDựa trên ${context.length} nguồn:\n\n`;
  context.forEach((c, i) => {
    answer += `**${i + 1}. ${c.source}** ${c.metadata.article ? `(${c.metadata.article})` : ''}\n${c.content.slice(0, 200)}...\n\n`;
  });
  if (strict_mode) answer += `\n🔒 Strict Mode: Thông tin trích xuất trực tiếp từ tài liệu gốc.`;

  return {
    answer,
    sources: context,
    confidence: context.length > 0 ? Math.min(0.95, (context[0]?.relevanceScore || 0) + 0.3) : 0.1,
    hallucination_check: validateNoHallucination(answer, context)
  };
}

export function useLegalEngine() {
  const [isQuerying, setIsQuerying] = useState(false);
  const [lastResponse, setLastResponse] = useState<RAGResponse | null>(null);
  const [chunks, setChunks] = useState<LegalChunk[]>([]);

  const indexDocument = useCallback((text: string) => {
    const all = [...chunkDocument(text), ...MOCK_LEGAL_KB];
    setChunks(all);
    return all;
  }, []);

  const queryWithStrictMode = useCallback(async (
    query: string, customContext?: LegalChunk[], strictMode: boolean = true
  ): Promise<RAGResponse> => {
    setIsQuerying(true);
    try {
      const relevant = searchContext(query, customContext || chunks, 5);
      const response = await mockRAGQuery({ query, context: relevant, strict_mode: strictMode, max_chunks: 5 });
      setLastResponse(response);
      return response;
    } finally {
      setIsQuerying(false);
    }
  }, [chunks]);

  const searchKnowledgeBase = useCallback((query: string) => searchContext(query, MOCK_LEGAL_KB, 3), []);

  return { indexDocument, queryWithStrictMode, searchKnowledgeBase, isQuerying, lastResponse, chunks };
}
