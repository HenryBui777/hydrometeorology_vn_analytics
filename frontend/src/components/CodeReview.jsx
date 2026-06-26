import React, { useState, useEffect } from 'react';
import { 
  Check, 
  X, 
  Edit3, 
  AlertTriangle,
  Play, 
  HelpCircle,
  FileText,
  Workflow,
  Sparkles
} from 'lucide-react';

export default function CodeReview({ 
  activeQuery, 
  approveQuery, 
  rejectQuery, 
  updateActiveCode 
}) {
  const [editableCode, setEditableCode] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Sync state with parent active query
  useEffect(() => {
    if (activeQuery) {
      setEditableCode(activeQuery.code);
    }
  }, [activeQuery]);

  if (!activeQuery) {
    return (
      <div className="glass-panel rounded-2xl p-16 text-center max-w-xl mx-auto space-y-6 animate-fade-in mt-12 bg-white">
        <div className="h-16 w-16 bg-slate-50 rounded-full border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
          <Workflow className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-800">Chưa có mã nguồn cần phê duyệt</h2>
          <p className="text-xs text-slate-500 font-semibold">
            Mã nguồn phân tích Python sẽ được tự động sinh ra khi bạn đặt câu hỏi phân tích dữ liệu cho AI. 
            Vui lòng chuyển qua tab AI Chat để gửi yêu cầu.
          </p>
        </div>
      </div>
    );
  }

  const handleCodeChange = (e) => {
    setEditableCode(e.target.value);
    updateActiveCode(e.target.value);
  };

  const handleApprove = () => {
    approveQuery();
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Top Banner with workflow state */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-amber-50 border border-amber-250 text-amber-600 p-2.5 rounded-xl animate-pulse">
            <Workflow className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-800">Trình Phê Duyệt Mã Phân Tích (Human-in-the-Loop)</h2>
              <span className="bg-amber-50 border border-amber-200 text-amber-600 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded">
                Chờ duyệt
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Yêu cầu xác nhận mã nguồn trước khi biên dịch cục bộ bằng Python.</p>
          </div>
        </div>
        
        {/* Visual progress stepper */}
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-extrabold">
          <span className="text-emerald-600">Dữ Liệu</span>
          <span className="h-1 w-4 bg-emerald-200 rounded-full" />
          <span className="text-emerald-600">Câu Hỏi</span>
          <span className="h-1 w-4 bg-emerald-200 rounded-full" />
          <span className="text-amber-600">Xem Code (Đang ở đây)</span>
          <span className="h-1 w-4 bg-slate-200 rounded-full" />
          <span className="text-slate-400">Thực Thi</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Code Editor */}
        <div className="lg:col-span-2 flex flex-col glass-panel rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-900">
          
          {/* Editor Header */}
          <div className="p-4 border-b border-slate-950 bg-slate-950/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 bg-accent-rose rounded-full" />
              <div className="h-2.5 w-2.5 bg-accent-amber rounded-full" />
              <div className="h-2.5 w-2.5 bg-accent-emerald rounded-full" />
              <span className="text-[11px] font-mono text-slate-400 font-bold ml-2">python_script.py</span>
            </div>
            
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className={`flex items-center gap-1 text-[10px] px-2.5 py-1 rounded border transition-all font-bold ${
                isEditing 
                  ? 'bg-brand-primary text-white border-brand-primary' 
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
              }`}
            >
              <Edit3 className="h-3 w-3" /> {isEditing ? 'Đang chỉnh sửa' : 'Nhấn để sửa code'}
            </button>
          </div>

          {/* Textarea Editor - Nice dark visual coding panel */}
          <div className="relative flex-1 bg-slate-950 p-4 font-mono text-xs overflow-hidden h-[420px]">
            <textarea
              readOnly={!isEditing}
              value={editableCode}
              onChange={handleCodeChange}
              className="w-full h-full bg-transparent text-indigo-300 border-none outline-none resize-none overflow-y-auto leading-relaxed focus:ring-0"
              style={{
                fontFamily: "'Courier New', Courier, monospace",
                color: '#a5b4fc' // Light Indigo code color
              }}
            />
            {!isEditing && (
              <div className="absolute top-4 right-4 bg-slate-900/90 px-2 py-0.5 rounded border border-slate-850 text-[10px] text-slate-400 pointer-events-none uppercase font-bold select-none">
                Chỉ Xem
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Explanations & Actions */}
        <div className="space-y-6">
          
          {/* Question Summary */}
          <div className="glass-panel bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="h-4 w-4 text-brand-primary" /> Yêu Cầu Phân Tích
            </span>
            <div className="bg-slate-50 border border-slate-150 rounded-xl p-4">
              <p className="text-slate-800 text-xs sm:text-sm font-bold leading-relaxed">{activeQuery.question}</p>
            </div>
          </div>

          {/* AI Explanation Block */}
          <div className="glass-panel bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-brand-accent" /> Giải Thích Bằng Ngôn Ngữ Tự Nhiên
            </span>
            <div className="bg-blue-50/30 border border-blue-100 rounded-xl p-4 text-xs text-slate-650 leading-relaxed space-y-2">
              <p className="font-semibold">{activeQuery.explanation}</p>
              <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-550">
                <span className="font-bold text-brand-accent">Gợi ý kiểm tra:</span> Kiểm tra xem có lệnh truy xuất file không an toàn hay không.
              </div>
            </div>
          </div>

          {/* Safety Warning */}
          <div className="bg-rose-50 border border-rose-150 rounded-2xl p-5 text-xs text-rose-700 space-y-2 flex gap-3 shadow-sm">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-rose-500" />
            <div className="space-y-1">
              <h3 className="font-bold text-rose-700">Cảnh Báo An Toàn Local Run</h3>
              <p className="text-[11px] text-slate-600 font-semibold leading-relaxed">
                Mã Python sẽ chạy trực tiếp trên máy local của bạn. Hãy đảm bảo mã lệnh không chứa các hàm nguy hại 
                (như xóa file, gửi dữ liệu ra ngoài internet qua socket/requests).
              </p>
            </div>
          </div>

          {/* Execution Button Grid */}
          <div className="flex gap-4">
            <button
              onClick={() => rejectQuery()}
              className="flex-1 bg-white hover:bg-slate-50 text-rose-600 border border-slate-200 font-bold text-xs py-3.5 rounded-xl transition-all flex items-center justify-center gap-1.5"
            >
              <X className="h-4 w-4" /> Từ Chối
            </button>
            <button
              onClick={handleApprove}
              className="flex-1 bg-brand-primary hover:bg-brand-primary/90 text-white font-bold text-xs py-3.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/20"
            >
              <Play className="h-4 w-4" /> Phê Duyệt & Chạy
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
