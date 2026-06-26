import React from 'react';
import { 
  LayoutDashboard, 
  Database, 
  MessageSquareCode, 
  AreaChart, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  Cpu
} from 'lucide-react';

export default function Sidebar({ currentTab, setCurrentTab, isCollapsed, setIsCollapsed, pendingCount }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'datasets', label: 'Tập Dữ Liệu', icon: Database },
    { id: 'chat', label: 'AI Chat Phân Tích', icon: MessageSquareCode },
    { id: 'results', label: 'Kết Quả Trực Quan', icon: AreaChart },
    { id: 'settings', label: 'Cài Đặt', icon: Settings },
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
            <div className="bg-gradient-to-tr from-brand-primary to-brand-accent p-2.5 rounded-xl shadow-lg shadow-blue-500/25">
              <Cpu className="h-5 w-5 text-white" />
            </div>
            {!isCollapsed && (
              <span className="font-bold text-base text-slate-100 tracking-tight whitespace-nowrap">
                KTTV Analytics <span className="text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-brand-primary">AI</span>
              </span>
            )}
          </div>
          {!isCollapsed && (
            <button 
              onClick={() => setIsCollapsed(true)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all duration-200 ${
                  isActive 
                    ? 'bg-brand-primary text-white shadow-md shadow-blue-600/10' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
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
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </aside>
  );
}
