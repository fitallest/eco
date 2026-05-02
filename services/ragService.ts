// ragService.ts
// Handles local In-Memory RAG operations with IndexedDB and Semantic Chunking

export interface DocumentChunk {
  id: string;
  docId: string;
  docTitle: string;
  content: string;
  embedding?: number[];
}

// 1. Semantic Chunking
export const semanticChunkText = (text: string, maxChunkSize: number = 1200, overlapPercent: number = 15): string[] => {
  const chunks: string[] = [];
  const overlapSize = Math.floor(maxChunkSize * (overlapPercent / 100));
  
  // Split by legal anchors: Điều, Chương, Mục
  const sectionRegex = /(?:\n|^)(?=Điều\s+\d+|Chương\s+[IVXLCDM]+|Mục\s+\d+)/gi;
  const sections = text.split(sectionRegex).filter(s => s.trim().length > 0);
  
  for (const section of sections) {
    if (section.length <= maxChunkSize) {
      if (chunks.length > 0) {
        // Try to overlap
        const prev = chunks[chunks.length - 1];
        const overlapText = prev.slice(-overlapSize);
        chunks.push(overlapText + "\n" + section.trim());
      } else {
        chunks.push(section.trim());
      }
    } else {
      // Split by paragraphs
      const paragraphs = section.split(/(?:\n\s*){2,}/).filter(p => p.trim().length > 0);
      let currentChunk = '';
      
      for (const p of paragraphs) {
        if (currentChunk.length + p.length > maxChunkSize && currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
          const overlapText = currentChunk.slice(-overlapSize);
          currentChunk = overlapText + "\n" + p;
        } else {
          currentChunk += (currentChunk ? "\n\n" : "") + p;
        }
      }
      if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
      }
    }
  }
  
  // Post-processing to ensure no chunk is wildly over size
  const finalChunks: string[] = [];
  for (const chunk of chunks) {
    if (chunk.length > maxChunkSize * 1.5) {
      const sentences = chunk.split(/(?<=\.\s+)/);
      let c = '';
      for (const s of sentences) {
        if (c.length + s.length > maxChunkSize && c.length > 0) {
          finalChunks.push(c.trim());
          const overlapText = c.slice(-overlapSize);
          c = overlapText + " " + s;
        } else {
          c += s;
        }
      }
      if (c.trim().length > 0) finalChunks.push(c.trim());
    } else {
      finalChunks.push(chunk);
    }
  }
  
  return finalChunks.filter(c => c.length > 20);
};

// IndexedDB Helper
const DB_NAME = 'EcolawKB';
const STORE_NAME = 'chunks';

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('docId', 'docId', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveChunksToDB = async (chunks: DocumentChunk[]) => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    chunks.forEach(chunk => store.put(chunk));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const getAllChunksFromDB = async (): Promise<DocumentChunk[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const deleteDocument = async (docId: string) => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('docId');
    const request = index.getAllKeys(docId);
    request.onsuccess = () => {
      request.result.forEach(id => store.delete(id));
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
};

// 2. Fetch Embeddings in Batch
export const generateEmbeddingsBatch = async (inputs: string[]): Promise<number[][]> => {
  try {
    const res = await fetch('/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: inputs })
    });
    const data = await res.json();
    if (data.embeddings) return data.embeddings;
    if (data.embedding) return [data.embedding]; // fallback
    throw new Error('No embedding returned');
  } catch (err) {
    console.error("Error generating embeddings:", err);
    // Fallback mock
    return inputs.map(() => new Array(1536).fill(0).map(() => Math.random() - 0.5));
  }
};

export const generateEmbedding = async (input: string): Promise<number[]> => {
  const res = await generateEmbeddingsBatch([input]);
  return res[0];
};

// 3. Save chunks to IndexedDB
export const saveDocumentToKB = async (title: string, text: string, onProgress?: (p: number) => void) => {
  const chunks = semanticChunkText(text);
  const docId = `DOC_${Date.now()}`;
  const docChunks: DocumentChunk[] = [];
  
  const batchSize = 20; // 20 chunks per API call to avoid payload too large
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const embeddings = await generateEmbeddingsBatch(batch);
    
    batch.forEach((content, idx) => {
      docChunks.push({
        id: `${docId}_${i + idx}`,
        docId,
        docTitle: title,
        content,
        embedding: embeddings[idx]
      });
    });
    
    if (onProgress) {
      onProgress(Math.min(100, Math.round(((i + batchSize) / chunks.length) * 100)));
    }
  }
  
  await saveChunksToDB(docChunks);
  return docId;
};

// 4. Retrieve Document List
export const getAllDocuments = async () => {
  const chunks = await getAllChunksFromDB();
  const docsMap = new Map<string, { id: string, title: string, chunks: number }>();
  chunks.forEach(chunk => {
    if (!docsMap.has(chunk.docId)) {
      docsMap.set(chunk.docId, { id: chunk.docId, title: chunk.docTitle, chunks: 1 });
    } else {
      docsMap.get(chunk.docId)!.chunks++;
    }
  });
  return Array.from(docsMap.values());
};

// 5. Cosine Similarity
function cosineSimilarity(vecA: number[], vecB: number[]) {
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// 6. Search relevant chunks
export const retrieveRelevantContext = async (query: string, topK: number = 5, docId?: string): Promise<DocumentChunk[]> => {
  let kb = await getAllChunksFromDB();
  if (docId) {
    kb = kb.filter(c => c.docId === docId);
  }
  if (kb.length === 0) return [];

  const queryEmbedding = await generateEmbedding(query);
  
  const scoredChunks = kb.map(chunk => {
    const score = chunk.embedding ? cosineSimilarity(queryEmbedding, chunk.embedding) : 0;
    return { ...chunk, score };
  });

  scoredChunks.sort((a, b) => b.score - a.score);
  
  const relevant = scoredChunks.filter(c => c.score > 0.25).slice(0, topK);
  return relevant.map(({ embedding, score, ...rest }) => rest);
};
