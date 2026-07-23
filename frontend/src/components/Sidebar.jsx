import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight
} from 'lucide-react';
import { playClickSound } from '../utils/sound';

export default function Sidebar({ currentTab, setCurrentTab, isCollapsed, setIsCollapsed, pendingCount }) {
  const menuItems = [
    { id: 'dashboard', label: 'DASHBOARD TỔNG QUAN', iconUrl: 'https://img.icons8.com/fluency/48/combo-chart.png' },
    { id: 'timeseries', label: 'XU HƯỚNG THỜI GIAN', iconUrl: 'https://img.icons8.com/fluency/48/graph.png' },
    { id: 'comparison', label: 'So sánh đối chiếu', iconUrl: 'https://img.icons8.com/fluency/48/scales.png' },
    { id: 'analysis', label: 'Phân tích tương quan', iconUrl: 'https://img.icons8.com/fluency/48/heat-map.png' },
    { id: 'datasets', label: 'Tập dữ liệu', iconUrl: 'https://img.icons8.com/fluency/48/database.png' },
    { id: 'aianalyst', label: 'TRỢ LÝ PHÂN TÍCH AI', iconUrl: 'https://img.icons8.com/fluency/48/artificial-intelligence.png' }
  ];

  return (
    <aside 
      className={`bg-slate-900 border-r border-slate-800 flex flex-col justify-between h-screen transition-all duration-300 z-30 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div>
          <div className="p-4 border-b border-slate-700/50 flex items-center justify-between sticky top-0 bg-[#0A101D] z-10 transition-colors">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-10 h-10 flex-shrink-0">
                {/* Typhoon Vortex Effects */}
                <div className="absolute inset-0 rounded-full border-2 border-brand-primary/40 border-t-brand-accent animate-spin-slow opacity-80" />
                <div className="absolute inset-[3px] rounded-full border border-blue-400/30 border-b-blue-500 animate-[spin_2s_linear_infinite_reverse] opacity-60" />
                <div className="absolute inset-2 rounded-full bg-brand-primary/20 animate-pulse" />
                
                {/* Original Image */}
                <img src="https://img.icons8.com/fluency/48/weather.png" alt="KTTV Logo" className="h-6 w-6 object-contain relative z-10" />
              </div>
              {!isCollapsed && (
                <span 
                  onClick={() => {
                    playClickSound();
                    setCurrentTab('dashboard');
                  }}
                  className="font-bold text-sm text-slate-100 tracking-tight whitespace-nowrap flex items-center gap-1.5 cursor-pointer hover:text-brand-accent transition-colors"
                >
                  <span>MẮT BÃO S-34</span>
                  <span className="text-white text-[7.5px] font-extrabold w-[18px] h-[13px] rounded bg-brand-primary flex items-center justify-center leading-none pt-[0.5px]">AI</span>
                </span>
              )}
            </div>
          {!isCollapsed && (
            <button 
              onClick={() => {
                playClickSound();
                setIsCollapsed(true);
              }}
              className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1.5">
          {menuItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  playClickSound();
                  setCurrentTab(item.id);
                  if (window.innerWidth < 768) {
                    setIsCollapsed(true);
                  }
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                  isActive 
                    ? 'bg-brand-primary text-white shadow-lg shadow-blue-500/15' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3 font-semibold">
                  <img src={item.iconUrl} alt={item.label} className="h-5 w-5 object-contain flex-shrink-0" />
                  {!isCollapsed && <span className="whitespace-nowrap uppercase">{item.label}</span>}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Toggle (When Collapsed) */}
      {isCollapsed && (
        <div className="p-4 border-t border-slate-700/50">
          <button 
            onClick={() => {
              playClickSound();
              setIsCollapsed(false);
            }}
            className="w-full flex justify-center p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </aside>
  );
}
