import React from 'react';
import { BarChart2, HelpCircle, Lightbulb, ArrowRight, ChevronRight } from 'lucide-react';
import { useData } from '../context/DataContext';

const STORY_STEPS = [
  { key: "what_happened", label: "Hiện trạng", icon: BarChart2, color: "text-cyan-600", cbColor: "text-[#56B4E9]", border: "border-cyan-200", cbBorder: "border-[#56B4E9]/30", bg: "bg-cyan-50/60", cbBg: "bg-[#56B4E9]/10" },
  { key: "why", label: "Nguyên nhân", icon: HelpCircle, color: "text-purple-600", cbColor: "text-[#CC79A7]", border: "border-purple-200", cbBorder: "border-[#CC79A7]/30", bg: "bg-purple-50/60", cbBg: "bg-[#CC79A7]/10" },
  { key: "so_what", label: "Ý nghĩa", icon: Lightbulb, color: "text-amber-600", cbColor: "text-[#E69F00]", border: "border-amber-200", cbBorder: "border-[#E69F00]/30", bg: "bg-amber-50/60", cbBg: "bg-[#E69F00]/10" },
  { key: "what_next", label: "Hành động", icon: ArrowRight, color: "text-emerald-600", cbColor: "text-[#009E73]", border: "border-emerald-200", cbBorder: "border-[#009E73]/30", bg: "bg-emerald-50/60", cbBg: "bg-[#009E73]/10" },
];

export default function StoryInsightCard({ insightData }) {
  const { isColorblind } = useData();
  
  if (!insightData) return null;

  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4 animate-fade-in">
      <div className="flex items-center gap-2">
        <div className="h-6 w-1 bg-brand-primary rounded-full"></div>
        <h3 className="font-extrabold text-slate-800 uppercase tracking-wide text-sm">Phân tích Dữ liệu Chuyên sâu</h3>
      </div>
      
      {/* 4 Cards Layout with Arrows */}
      <div className="flex flex-col xl:flex-row items-stretch gap-3 xl:gap-2 w-full">
        {STORY_STEPS.map(({ key, label, icon: Icon, color, cbColor, bg, cbBg, border, cbBorder }, index) => {
          const activeColor = isColorblind ? cbColor : color;
          const activeBg = isColorblind ? cbBg : bg;
          const activeBorder = isColorblind ? cbBorder : border;
          return (
          <React.Fragment key={key}>
            <div className={`flex-1 rounded-xl border ${activeBorder} ${activeBg} p-4 flex flex-col gap-3 shadow-sm`}>
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${activeColor}`} />
                <h4 className={`text-xs font-extrabold uppercase tracking-wider ${activeColor}`}>{label}</h4>
              </div>
              <div className="text-[13px] text-slate-700 leading-relaxed font-medium space-y-1.5">
                {String(insightData[key]).split('\n').filter(Boolean).map((line, idx) => {
                  const trimmed = line.trim();
                  if (trimmed.startsWith('- ')) {
                    return (
                      <div key={idx} className="flex items-start gap-2">
                        <span className={`${activeColor} font-bold opacity-80 mt-0.5`}>•</span>
                        <span>{trimmed.substring(2)}</span>
                      </div>
                    );
                  }
                  return <div key={idx} className="font-bold text-slate-800 mt-2.5 first:mt-0 uppercase text-[11px] tracking-wide">{trimmed}</div>;
                })}
              </div>
            </div>
            
            {/* Arrow separator for xl screens */}
            {index < STORY_STEPS.length - 1 && (
              <div className="hidden xl:flex items-center justify-center px-2">
                <div className="bg-slate-50 text-slate-400 p-1.5 rounded-full shadow-sm border border-slate-200">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
            )}
          </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
