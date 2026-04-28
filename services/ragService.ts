// ragService.ts
// Handles local In-Memory RAG operations

export interface DocumentChunk {
  id: string;
  docId: string;
  docTitle: string;
  content: string;
  embedding?: number[];
}

// 1. Chunking text into smaller pieces
export const chunkText = (text: string, chunkSize: number = 800, overlap: number = 100): string[] => {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    let end = i + chunkSize;
    // try to find a natural break (newline or period)
    if (end < text.length) {
      let naturalBreak = text.lastIndexOf('\n', end);
      if (naturalBreak < i + chunkSize / 2) {
        naturalBreak = text.lastIndexOf('. ', end);
      }
      if (naturalBreak > i) {
        end = naturalBreak + 1;
      }
    }
    chunks.push(text.slice(i, end).trim());
    i = end - overlap;
  }
  return chunks.filter(c => c.length > 50); // Filter out too small chunks
};

// 2. Fetch Embeddings from Backend
export const generateEmbedding = async (input: string): Promise<number[]> => {
  try {
    const res = await fetch('/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input })
    });
    const data = await res.json();
    if (data.embedding) return data.embedding;
    throw new Error('No embedding returned');
  } catch (err) {
    console.error("Error generating embedding:", err);
    // Fallback mock embedding if API fails
    return new Array(1536).fill(0).map(() => Math.random() - 0.5);
  }
};

// 3. Save chunks to localStorage
export const saveDocumentToKB = async (title: string, text: string, onProgress?: (p: number) => void) => {
  const chunks = chunkText(text);
  const docId = `DOC_${Date.now()}`;
  const docChunks: DocumentChunk[] = [];
  
  for (let i = 0; i < chunks.length; i++) {
    const embedding = await generateEmbedding(chunks[i]);
    docChunks.push({
      id: `${docId}_${i}`,
      docId,
      docTitle: title,
      content: chunks[i],
      embedding
    });
    if (onProgress) onProgress(Math.round(((i + 1) / chunks.length) * 100));
  }
  
  // Load existing KB
  const existingKbStr = localStorage.getItem('ECOLAW_KNOWLEDGE_BASE');
  const existingKb: DocumentChunk[] = existingKbStr ? JSON.parse(existingKbStr) : [];
  
  // Save new
  const newKb = [...existingKb, ...docChunks];
  localStorage.setItem('ECOLAW_KNOWLEDGE_BASE', JSON.stringify(newKb));
  return docId;
};

// 4. Retrieve Document Chunks
export const getAllDocuments = () => {
  const existingKbStr = localStorage.getItem('ECOLAW_KNOWLEDGE_BASE');
  const existingKb: DocumentChunk[] = existingKbStr ? JSON.parse(existingKbStr) : [];
  // Group by docId
  const docsMap = new Map<string, { id: string, title: string, chunks: number }>();
  existingKb.forEach(chunk => {
    if (!docsMap.has(chunk.docId)) {
      docsMap.set(chunk.docId, { id: chunk.docId, title: chunk.docTitle, chunks: 1 });
    } else {
      docsMap.get(chunk.docId)!.chunks++;
    }
  });
  return Array.from(docsMap.values());
};

export const deleteDocument = (docId: string) => {
  const existingKbStr = localStorage.getItem('ECOLAW_KNOWLEDGE_BASE');
  if (!existingKbStr) return;
  const existingKb: DocumentChunk[] = JSON.parse(existingKbStr);
  const newKb = existingKb.filter(c => c.docId !== docId);
  localStorage.setItem('ECOLAW_KNOWLEDGE_BASE', JSON.stringify(newKb));
};

// 5. Cosine Similarity
function cosineSimilarity(vecA: number[], vecB: number[]) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// 6. Search relevant chunks
export const retrieveRelevantContext = async (query: string, topK: number = 3): Promise<DocumentChunk[]> => {
  const existingKbStr = localStorage.getItem('ECOLAW_KNOWLEDGE_BASE');
  if (!existingKbStr) return [];
  const kb: DocumentChunk[] = JSON.parse(existingKbStr);
  if (kb.length === 0) return [];

  const queryEmbedding = await generateEmbedding(query);
  
  // Calculate similarities
  const scoredChunks = kb.map(chunk => {
    const score = chunk.embedding ? cosineSimilarity(queryEmbedding, chunk.embedding) : 0;
    return { ...chunk, score };
  });

  // Sort descending
  scoredChunks.sort((a, b) => b.score - a.score);
  
  // Filter by threshold to ensure relevance (e.g., score > 0.4 for OpenAI)
  const relevant = scoredChunks.filter(c => c.score > 0.25).slice(0, topK);
  
  // Remove embedding from returned results to save memory
  return relevant.map(({ embedding, score, ...rest }) => rest);
};
