import React, { useEffect, useState } from "react";
import { Newspaper, Loader2, CloudRain } from "lucide-react";

export default function NewsTicker() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        // Sử dụng rss2json API để fetch RSS từ Tuổi Trẻ (chuyên mục thời tiết)
        const res = await fetch("https://api.rss2json.com/v1/api.json?rss_url=https://tuoitre.vn/rss/thoi-tiet.rss");
        const data = await res.json();
        
        if (data && data.items && data.items.length > 0) {
          // Lọc ra các bài viết gần đây
          setNews(data.items.slice(0, 10));
        }
      } catch (err) {
        console.error("Failed to fetch news:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
    const id = setInterval(fetchNews, 300000); // 5 phút cập nhật 1 lần
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div className="w-full h-10 bg-slate-900 flex items-center px-4 text-slate-300 text-xs overflow-hidden">
        <div className="flex items-center gap-2 font-bold uppercase shrink-0 text-amber-400">
          <CloudRain className="w-4 h-4" /> BẢN TIN THỜI TIẾT
        </div>
        <div className="flex-1 px-4 flex items-center gap-2">
          <Loader2 className="w-3 h-3 animate-spin" /> Đang tải tin tức...
        </div>
      </div>
    );
  }

  if (news.length === 0) {
    return null;
  }

  // Render 2 lần để loop mượt
  const items = [...news, ...news];

  return (
    <div className="w-full h-10 bg-slate-900 border-b border-slate-800 flex items-center px-4 text-xs overflow-hidden shadow-inner shrink-0 relative z-10">
      <div className="flex items-center gap-2 font-black uppercase shrink-0 text-amber-400 border-r border-slate-700 pr-4 mr-2 bg-slate-900 relative z-20 h-full">
        <CloudRain className="w-4 h-4 animate-bounce" /> TIN TỨC
      </div>
      <div className="overflow-hidden flex-1 h-full flex">
        <div className="flex items-center animate-marquee whitespace-nowrap w-max hover:[animation-play-state:paused]">
          {items.map((n, i) => (
            <a
              key={`${n.guid || i}-${i}`}
              href={n.link}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 text-slate-300 hover:text-white hover:underline transition-colors flex items-center gap-2"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></span>
              <span className="font-semibold text-slate-100">{n.title}</span>
              <span className="text-slate-500 ml-1 text-[10px]">({n.pubDate?.split(' ')?.[0] || ''})</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
