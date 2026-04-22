import React, { useState } from 'react';
import { Newspaper, Globe, ArrowRight, Clock, TrendingUp } from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  time: string;
  category: 'LEGAL' | 'INTERNATIONAL';
  imageUrl?: string;
}

const MOCK_NEWS: NewsItem[] = [
  {
    id: '1',
    title: 'Quốc hội thông qua Luật Đất đai (sửa đổi) 2026',
    summary: 'Sáng nay, Quốc hội đã chính thức thông qua Luật Đất đai sửa đổi với tỷ lệ tán thành 98%, giải quyết các vướng mắc về định giá đất.',
    source: 'VnExpress',
    time: '2 giờ trước',
    category: 'LEGAL',
    imageUrl: 'https://picsum.photos/seed/law1/400/200'
  },
  {
    id: '2',
    title: 'Quy định mới về đấu giá biển số xe từ 1/7/2026',
    summary: 'Bộ Công an ban hành thông tư mới hướng dẫn chi tiết về quy trình đấu giá biển số xe trực tuyến, đảm bảo công khai minh bạch.',
    source: 'Dân Trí',
    time: '4 giờ trước',
    category: 'LEGAL',
    imageUrl: 'https://picsum.photos/seed/car/400/200'
  },
  {
    id: '3',
    title: 'EU chính thức áp dụng Đạo luật Trí tuệ nhân tạo (AI Act)',
    summary: 'Liên minh Châu Âu trở thành khu vực đầu tiên trên thế giới có khung pháp lý toàn diện kiểm soát rủi ro từ các hệ thống AI.',
    source: 'Reuters',
    time: '1 giờ trước',
    category: 'INTERNATIONAL',
    imageUrl: 'https://picsum.photos/seed/eu/400/200'
  },
  {
    id: '4',
    title: 'Tòa án Công lý Quốc tế (ICJ) ra phán quyết về tranh chấp biển',
    summary: 'ICJ đã đưa ra phán quyết cuối cùng về vụ kiện tranh chấp chủ quyền biển đảo kéo dài 10 năm giữa hai quốc gia Đông Nam Á.',
    source: 'BBC News',
    time: '5 giờ trước',
    category: 'INTERNATIONAL',
    imageUrl: 'https://picsum.photos/seed/sea/400/200'
  },
  {
    id: '5',
    title: 'Tăng mức phạt vi phạm nồng độ cồn kịch khung',
    summary: 'Nghị định 100 sửa đổi sẽ tăng mức phạt tiền và thời gian tước bằng lái đối với các trường hợp vi phạm nồng độ cồn nghiêm trọng.',
    source: 'Thanh Niên',
    time: '1 ngày trước',
    category: 'LEGAL',
    imageUrl: 'https://picsum.photos/seed/traffic/400/200'
  },
  {
    id: '6',
    title: 'Hiệp định thương mại tự do ASEAN - Canada được ký kết',
    summary: 'Lãnh đạo các nước ASEAN và Canada đã ký kết hiệp định thương mại tự do, mở ra cơ hội xuất khẩu lớn cho nông sản Việt Nam.',
    source: 'VTV',
    time: '3 giờ trước',
    category: 'INTERNATIONAL',
    imageUrl: 'https://picsum.photos/seed/trade/400/200'
  }
];

export const NewsSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'LEGAL' | 'INTERNATIONAL'>('LEGAL');

  const filteredNews = MOCK_NEWS.filter(item => item.category === activeTab);

  return (
    <div className="w-full max-w-4xl mx-auto mt-12 animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-4">
          <button 
            onClick={() => setActiveTab('LEGAL')}
            className={`flex items-center gap-2 pb-2 border-b-2 transition-colors ${activeTab === 'LEGAL' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            <Newspaper size={18} />
            <span className="font-bold text-sm uppercase tracking-wider">Tin Pháp Luật</span>
          </button>
          <button 
            onClick={() => setActiveTab('INTERNATIONAL')}
            className={`flex items-center gap-2 pb-2 border-b-2 transition-colors ${activeTab === 'INTERNATIONAL' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            <Globe size={18} />
            <span className="font-bold text-sm uppercase tracking-wider">Tin Quốc Tế</span>
          </button>
        </div>
        <button className="text-xs text-slate-500 hover:text-emerald-400 flex items-center gap-1 transition-colors">
          Xem tất cả <ArrowRight size={12} />
        </button>
      </div>

      {/* Mobile: horizontal scroll, Desktop: grid */}
      <div className="flex md:grid md:grid-cols-3 gap-4 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 -mx-2 px-2 md:mx-0 md:px-0">
        {filteredNews.map((news) => (
          <div key={news.id} className="group bg-slate-900/50 border border-slate-800 hover:border-emerald-500/30 rounded-xl overflow-hidden transition-all hover:bg-slate-900 cursor-pointer flex-shrink-0 w-[280px] md:w-auto">
            <div className="h-28 md:h-32 overflow-hidden relative">
              <img 
                src={news.imageUrl} 
                alt={news.title} 
                className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500 group-hover:scale-105 transform"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-2 right-2 bg-black/60 backdrop-blur px-2 py-0.5 rounded text-[10px] text-white flex items-center gap-1">
                <Clock size={10} /> {news.time}
              </div>
            </div>
            <div className="p-3 md:p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-950/30 px-1.5 py-0.5 rounded border border-emerald-900/50">{news.source}</span>
                {news.category === 'INTERNATIONAL' && <span className="text-[10px] text-slate-500 flex items-center gap-0.5"><Globe size={10}/> Global</span>}
              </div>
              <h3 className="text-sm font-bold text-slate-200 group-hover:text-emerald-400 transition-colors line-clamp-2 mb-2 leading-snug">
                {news.title}
              </h3>
              <p className="text-xs text-slate-500 line-clamp-2 mb-2 md:mb-3">
                {news.summary}
              </p>
              <div className="flex items-center text-[10px] text-slate-600 group-hover:text-slate-400 transition-colors">
                <TrendingUp size={12} className="mr-1" /> Nhiều người quan tâm
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
