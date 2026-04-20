import React from 'react';

interface MarkdownRendererProps {
  content: string;
  mode?: 'chat' | 'document';
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, mode = 'chat' }) => {
  // Helper to parse bold and highlight text
  const parseInline = (text: string) => {
    // First split by bold
    const boldParts = text.split(/(\*\*.*?\*\*)/g);
    return boldParts.map((boldPart, bIndex) => {
      if (boldPart.startsWith('**') && boldPart.endsWith('**')) {
        return <strong key={`b-${bIndex}`} className={mode === 'document' ? 'font-bold' : 'font-bold text-emerald-400'}>{boldPart.slice(2, -2)}</strong>;
      }
      
      // Then split by highlight ==...==
      const highlightParts = boldPart.split(/(==.*?==)/g);
      return highlightParts.map((hlPart, hIndex) => {
          if (hlPart.startsWith('==') && hlPart.endsWith('==')) {
              return <mark key={`h-${bIndex}-${hIndex}`} className="bg-yellow-500/30 text-yellow-200 px-1 rounded font-medium">{hlPart.slice(2, -2)}</mark>;
          }
          return hlPart;
      });
    });
  };

  const processLine = (line: string, index: number) => {
    const trimmedLine = line.trim();
    
    if (!trimmedLine) return <div key={index} className="h-4"></div>;

    // Horizontal Rule
    if (trimmedLine.startsWith('---')) {
      return <hr key={index} className={`my-4 ${mode === 'document' ? 'border-black' : 'border-slate-700'}`} />;
    }

    // Headers (##)
    if (trimmedLine.startsWith('##')) {
       const text = trimmedLine.replace(/^#+\s*/, '');
       return <h3 key={index} className={`font-bold mt-4 mb-2 ${mode === 'document' ? 'text-lg text-center uppercase' : 'text-emerald-400 uppercase tracking-wide'}`}>{text}</h3>;
    }

    // Lists
    if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
      const text = trimmedLine.substring(2);
      return (
        <div key={index} className={`flex ${mode === 'document' ? 'ml-8 mb-2' : 'ml-4 mb-1'}`}>
          <span className={`mr-2 ${mode === 'document' ? 'text-black' : 'text-emerald-500'}`}>•</span>
          <span className={mode === 'document' ? 'text-justify' : 'text-slate-300'}>{parseInline(text)}</span>
        </div>
      );
    }

    // Document Specific Formatting
    if (mode === 'document') {
        // Center uppercase lines (likely headers like CỘNG HÒA XÃ HỘI...)
        const isUppercase = trimmedLine.length > 5 && trimmedLine === trimmedLine.toUpperCase();
        if (isUppercase || trimmedLine.includes('CỘNG HÒA XÃ HỘI') || trimmedLine.includes('Độc lập - Tự do')) {
            return <p key={index} className="text-center font-bold mb-1">{parseInline(trimmedLine)}</p>;
        }
        
        // Indent lines starting with "Kính gửi:" or similar
        if (trimmedLine.startsWith('Kính gửi:')) {
             return <p key={index} className="text-center font-bold mb-4 mt-4">{parseInline(trimmedLine)}</p>;
        }

        // Signature area (right aligned)
        if (trimmedLine.includes('Người làm đơn') || trimmedLine.includes('Ký tên') || trimmedLine.includes('Người viết đơn')) {
            return <div key={index} className="flex justify-end mt-8 mb-4 pr-8"><p className="text-center font-bold italic">{parseInline(trimmedLine)}</p></div>;
        }

        // Field lines (containing ':') or short lines -> Left align, no indent
        if (trimmedLine.includes(':') || trimmedLine.length < 60) {
            return <p key={index} className="mb-2 text-left leading-relaxed">{parseInline(trimmedLine)}</p>;
        }

        // Regular paragraphs -> Justify and Indent
        return <p key={index} className="mb-2 text-justify leading-relaxed indent-8">{parseInline(trimmedLine)}</p>;
    }

    // Chat Mode Formatting
    if (trimmedLine.includes('TRẠNG THÁI HỆ THỐNG') || trimmedLine.includes('NỘI DUNG TƯ VẤN') || trimmedLine.includes('KHUYẾN NGHỊ TIẾP THEO')) {
      const headerText = trimmedLine.replace(/\*\*/g, '').replace(/##/g, '').replace(/:/g, '').trim();
      return <h3 key={index} className="text-emerald-400 font-bold mt-4 mb-2 tracking-wide uppercase">{headerText}</h3>;
    }

    return <p key={index} className="mb-2 text-slate-200 leading-relaxed">{parseInline(trimmedLine)}</p>;
  };

  if (mode === 'document') {
      return (
          <div 
            className="bg-white text-black p-[2.5cm] shadow-2xl max-w-[210mm] min-h-[297mm] mx-auto text-base leading-relaxed selection:bg-blue-200 selection:text-black"
            style={{ fontFamily: '"Times New Roman", Times, serif' }}
          >
              {content.normalize('NFC').split('\n').map((line, idx) => processLine(line, idx))}
          </div>
      );
  }

  return (
    <div className="markdown-body text-sm md:text-base font-sans">
      {content.split('\n').map((line, idx) => processLine(line, idx))}
    </div>
  );
};