import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight
} from 'lucide-react';

export default function Sidebar({ currentTab, setCurrentTab, isCollapsed, setIsCollapsed, pendingCount }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', iconUrl: 'https://img.icons8.com/fluency/48/combo-chart.png' },
    { id: 'timeseries', label: 'Xu hướng thời gian', iconUrl: 'https://img.icons8.com/fluency/48/graph.png' },
    { id: 'comparison', label: 'So sánh đối chiếu', iconUrl: 'https://img.icons8.com/fluency/48/scales.png' },
    { id: 'analysis', label: 'Phân tích tương quan', iconUrl: 'https://img.icons8.com/fluency/48/heat-map.png' },
    { id: 'datasets', label: 'Tập dữ liệu', iconUrl: 'https://img.icons8.com/fluency/48/database.png' },
    { id: 'chat', label: 'AI chat phân tích', iconUrl: 'https://img.icons8.com/fluency/48/artificial-intelligence.png' },
    { id: 'settings', label: 'Cài đặt', iconUrl: 'https://img.icons8.com/fluency/48/gear.png' },
  ];

  return (
    <aside 
      className={`bg-slate-900 border-r border-slate-800 flex flex-col justify-between h-screen transition-all duration-300 z-30 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div>
        <div className="p-5 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center gap-3 overflow-hidden">
            <img src="https://img.icons8.com/fluency/48/weather.png" alt="KTTV Logo" className="h-8 w-8 object-contain flex-shrink-0" />
            {!isCollapsed && (
              <span className="font-bold text-sm text-slate-100 tracking-tight whitespace-nowrap flex items-center gap-1.5">
                <span>KTTV Analytics</span>
                <span className="text-white text-[7.5px] font-extrabold w-[18px] h-[13px] rounded bg-brand-primary flex items-center justify-center leading-none pt-[0.5px]">AI</span>
              </span>
            )}
          </div>
          {!isCollapsed && (
            <button 
              onClick={() => setIsCollapsed(true)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
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
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                  isActive 
                    ? 'bg-brand-primary text-white shadow-lg shadow-blue-500/15' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3 font-semibold">
                  <img src={item.iconUrl} alt={item.label} className="h-5 w-5 object-contain flex-shrink-0" />
                  {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Toggle (When Collapsed) */}
      {isCollapsed && (
        <div className="p-4 border-t border-slate-800 flex justify-center">
          <button 
            onClick={() => setIsCollapsed(false)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </aside>
  );
}
