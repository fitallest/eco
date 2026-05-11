import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';
import { X, ZoomIn, ZoomOut, Maximize, GitGraph, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';

export interface GraphNode {
  id: string;
  name: string;
  group: string;
  color?: string;
  val?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  label: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface CaseRelationMapProps {
  data?: GraphData;
  title?: string;
  onClose?: () => void;
  isOpen: boolean;
  onSync?: () => void;
  isSyncing?: boolean;
  autoSync?: boolean;
  onToggleAutoSync?: () => void;
}

// Sample Data for a typical case
const SAMPLE_DATA: GraphData = {
  nodes: [
    { id: 'nguyen_don', name: 'Ông A (Nguyên đơn)', group: 'person', color: '#3b82f6', val: 8 },
    { id: 'bi_don', name: 'Bà B (Bị đơn)', group: 'person', color: '#ef4444', val: 8 },
    { id: 'nguoi_lien_quan', name: 'Anh C (Làm chứng)', group: 'person', color: '#10b981', val: 6 },
    { id: 'hop_dong', name: 'Hợp đồng vay 500tr', group: 'document', color: '#f59e0b', val: 10 },
    { id: 'tai_san', name: 'Sổ đỏ thửa 123', group: 'asset', color: '#8b5cf6', val: 6 },
    { id: 'chuyen_khoan', name: 'Biên lai chuyển khoản', group: 'evidence', color: '#06b6d4', val: 6 },
  ],
  links: [
    { source: 'nguyen_don', target: 'hop_dong', label: 'Cho vay' },
    { source: 'bi_don', target: 'hop_dong', label: 'Ký vay' },
    { source: 'nguoi_lien_quan', target: 'hop_dong', label: 'Ký làm chứng' },
    { source: 'bi_don', target: 'tai_san', label: 'Sở hữu' },
    { source: 'tai_san', target: 'hop_dong', label: 'Thế chấp đảm bảo' },
    { source: 'nguyen_don', target: 'chuyen_khoan', label: 'Thực hiện' },
    { source: 'chuyen_khoan', target: 'hop_dong', label: 'Giải ngân' },
  ]
};

export const CaseRelationMap: React.FC<CaseRelationMapProps> = ({ 
  data = SAMPLE_DATA, 
  title = "Sơ đồ Quan hệ Vụ việc (Demo)",
  onClose,
  isOpen,
  onSync,
  isSyncing = false,
  autoSync = false,
  onToggleAutoSync
}) => {
  const fgRef = useRef<ForceGraphMethods>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoverNode, setHoverNode] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      setDimensions({ width: clientWidth, height: clientHeight });
    }
  }, [isOpen]);

  useEffect(() => {
    // Zoom to fit after data loads
    if (isOpen && fgRef.current) {
      setTimeout(() => {
        fgRef.current?.zoomToFit(400, 50);
      }, 500);
    }
  }, [isOpen, data]);


  // Custom node drawing to make it look premium
  const paintNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.name;
    const fontSize = 12 / globalScale;
    ctx.font = `${fontSize}px Inter, sans-serif`;
    const textWidth = ctx.measureText(label).width;
    const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.8);

    const isHovered = hoverNode === node.id;
    
    // Draw outer glow if hovered
    if (isHovered) {
      ctx.shadowColor = node.color || 'rgba(255, 255, 255, 0.5)';
      ctx.shadowBlur = 10;
    } else {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }

    // Node Circle — capped max radius to keep nodes readable
    const baseRadius = Math.min(node.val || 5, 12);
    const radius = isHovered ? baseRadius * 1.2 : baseRadius;
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = node.color || '#4ade80';
    ctx.fill();
    ctx.lineWidth = 2 / globalScale;
    ctx.strokeStyle = isHovered ? '#fff' : '#1e293b';
    ctx.stroke();

    // Node Label Background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.beginPath();
    ctx.roundRect(
      node.x - bckgDimensions[0] / 2, 
      node.y + radius + 2 / globalScale, 
      bckgDimensions[0], 
      bckgDimensions[1],
      4 / globalScale
    );
    ctx.fill();
    
    // Node Label Text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(label, node.x, node.y + radius + bckgDimensions[1] / 2 + 2 / globalScale);
    
    ctx.shadowColor = 'transparent'; // Reset shadow
  }, [hoverNode]);

  // Custom link drawing to add labels
  const paintLink = useCallback((link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const start = link.source;
    const end = link.target;
    if (!start.x || !start.y || !end.x || !end.y) return;

    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.lineWidth = 2 / globalScale;
    ctx.stroke();

    // Link label
    if (link.label) {
      const midX = start.x + (end.x - start.x) / 2;
      const midY = start.y + (end.y - start.y) / 2;
      
      const fontSize = 10 / globalScale;
      ctx.font = `${fontSize}px Inter, sans-serif`;
      
      // Calculate angle
      let angle = Math.atan2(end.y - start.y, end.x - start.x);
      // Keep text upright
      if (angle > Math.PI / 2 || angle < -Math.PI / 2) {
        angle += Math.PI;
      }
      
      ctx.save();
      ctx.translate(midX, midY);
      ctx.rotate(angle);
      
      const textWidth = ctx.measureText(link.label).width;
      
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(-textWidth/2 - 2/globalScale, -fontSize/2 - 2/globalScale, textWidth + 4/globalScale, fontSize + 4/globalScale);
      
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(link.label, 0, 0);
      ctx.restore();
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-5xl h-[85vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/10">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <GitGraph className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
              <p className="text-sm text-slate-400">Trực quan hóa mối quan hệ giữa các chủ thể & tài liệu</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onToggleAutoSync && (
              <button 
                onClick={onToggleAutoSync}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${autoSync ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}
                title="Tự động cập nhật khi có tin nhắn mới"
              >
                {autoSync ? <ToggleRight size={16}/> : <ToggleLeft size={16}/>} 
                <span className="hidden sm:inline">Tự Động Cập Nhật</span>
              </button>
            )}
            
            {onSync && (
              <button 
                onClick={onSync}
                disabled={isSyncing}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">{isSyncing ? 'Đang cập nhật...' : 'Cập nhật từ Chat'}</span>
              </button>
            )}

            <div className="w-px h-6 bg-slate-800 mx-1"></div>
            <button 
              onClick={() => fgRef.current?.zoom(fgRef.current.zoom() * 1.2, 400)}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              title="Phóng to"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button 
              onClick={() => fgRef.current?.zoom(fgRef.current.zoom() * 0.8, 400)}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              title="Thu nhỏ"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <button 
              onClick={() => fgRef.current?.zoomToFit(400, 50)}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors mr-2"
              title="Vừa màn hình"
            >
              <Maximize className="w-5 h-5" />
            </button>
            <div className="w-px h-6 bg-slate-800 mx-1"></div>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Graph Container */}
        <div ref={containerRef} className="flex-1 w-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black overflow-hidden cursor-move">
          <ForceGraph2D
            ref={fgRef}
            width={dimensions.width}
            height={dimensions.height}
            graphData={data}
            nodeCanvasObject={paintNode}
            linkCanvasObjectMode={() => 'replace'}
            linkCanvasObject={paintLink}
            nodePointerAreaPaint={(node, color, ctx) => {
              ctx.fillStyle = color;
              const radius = (node.val || 5) * 1.2;
              ctx.beginPath();
              ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
              ctx.fill();
            }}
            onNodeHover={(node: any) => setHoverNode(node ? node.id : null)}
            cooldownTicks={150}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
            linkDistance={120}
            d3Force="charge"
            d3ReheatSimulation={false}
            onEngineStop={() => fgRef.current?.zoomToFit(400, 60)}
            linkDirectionalParticles={2}
            linkDirectionalParticleSpeed={0.004}
            linkDirectionalParticleWidth={2}
            linkDirectionalParticleColor={() => '#38bdf8'}
          />
        </div>
        
        {/* Legend */}
        <div className="absolute bottom-6 left-6 flex gap-4 p-3 bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-xs text-slate-300">Nguyên đơn</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-xs text-slate-300">Bị đơn</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span className="text-xs text-slate-300">Người LC</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span className="text-xs text-slate-300">Tài liệu</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span className="text-xs text-slate-300">Tài sản</span>
          </div>
        </div>
      </div>
    </div>
  );
};
