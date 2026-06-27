import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  Play, 
  CheckCircle2, 
  XCircle,
  Cpu, 
  Clock, 
  ShieldCheck,
  ArrowRight
} from 'lucide-react';

export default function ExecutionMonitor({ 
  activeQuery, 
  executionStatus, 
  setExecutionStatus,
  setCurrentTab 
}) {
  const [streamedLogs, setStreamedLogs] = useState([]);
  const [currentLineIdx, setCurrentLineIdx] = useState(0);

  useEffect(() => {
    // If execution starts, stream logs line-by-line
    if (executionStatus === 'running' && activeQuery) {
      setStreamedLogs([]);
      setCurrentLineIdx(0);
      
      const interval = setInterval(() => {
        setStreamedLogs(prev => {
          if (currentLineIdx < activeQuery.logs.length) {
            const nextLogs = [...prev, activeQuery.logs[currentLineIdx]];
            setCurrentLineIdx(idx => idx + 1);
            return nextLogs;
          } else {
            clearInterval(interval);
            setExecutionStatus('success');
            return prev;
          }
        });
      }, 400); // Stream a line every 400ms

      return () => clearInterval(interval);
    }
  }, [executionStatus, currentLineIdx, activeQuery]);

  if (!activeQuery) {
    return (
      <div className="glass-panel rounded-xl p-16 text-center max-w-xl mx-auto space-y-6 animate-fade-in mt-12 bg-white border border-slate-200 shadow-sm">
        <div className="h-16 w-16 bg-blue-50 rounded-lg border border-blue-100 flex items-center justify-center mx-auto text-brand-primary">
          <Terminal className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-800">Chưa khởi chạy chương trình nào</h2>
          <p className="text-xs text-slate-500 font-semibold">
            Trình giám sát thực thi sẽ tự động hiển thị khi bạn phê duyệt và kích hoạt một đoạn mã nguồn phân tích trong tab Duyệt Mã Nguồn.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight sm:text-3xl">Giám sát thực thi cục bộ</h1>
        <p className="text-slate-500 text-sm mt-1">Quan sát trực tiếp quá trình biên dịch Python và xử lý file CSV thời tiết cục bộ.</p>
      </div>

      {/* Execution Status Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="tech-card rounded-lg p-5 bg-white flex items-center gap-4 border border-slate-200 shadow-sm">
          <div className={`p-3 rounded-lg border ${
            executionStatus === 'running' 
              ? 'bg-blue-50 border-brand-primary text-brand-primary animate-spin' 
              : executionStatus === 'success' 
                ? 'bg-blue-50 border-blue-100 text-brand-primary font-bold' 
                : 'bg-slate-100 border-slate-200 text-slate-400'
          }`}>
            {executionStatus === 'running' ? <Cpu className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
          </div>
          <div>
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Trạng thái</span>
            <p className="text-sm font-bold text-slate-800 mt-0.5">
              {executionStatus === 'running' && 'Đang thực thi...'}
              {executionStatus === 'success' && 'Đã hoàn thành'}
              {executionStatus === 'idle' && 'Đang chờ lệnh'}
            </p>
          </div>
        </div>

        <div className="tech-card rounded-lg p-5 bg-white flex items-center gap-4 border border-slate-200 shadow-sm">
          <div className="p-3 bg-blue-50 border border-blue-100 text-brand-primary rounded-lg">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Thời gian chạy</span>
            <p className="text-sm font-bold text-slate-800 mt-0.5">
              {executionStatus === 'running' ? '1.8 giây...' : executionStatus === 'success' ? '2.4 giây' : '--'}
            </p>
          </div>
        </div>

        <div className="tech-card rounded-lg p-5 bg-white flex items-center gap-4 border border-slate-200 shadow-sm">
          <div className="p-3 bg-blue-50 border border-blue-100 text-brand-primary rounded-lg">
            <Terminal className="h-5 w-5" />
          </div>
          <div>
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Môi trường</span>
            <p className="text-sm font-bold text-slate-800 mt-0.5">Local Python (venv_kttv)</p>
          </div>
        </div>

        <div className="tech-card rounded-lg p-5 bg-white flex items-center gap-4 border border-slate-200 shadow-sm">
          <div className="p-3 bg-blue-50 border border-blue-100 text-brand-primary rounded-lg">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">PID Tiến trình</span>
            <p className="text-sm font-bold text-slate-800 mt-0.5">
              {executionStatus === 'idle' ? '--' : 'PID: 12504'}
            </p>
          </div>
        </div>
      </div>

      {/* Terminal Display - Professional dark console */}
      <div className="rounded-xl overflow-hidden border border-slate-350 shadow-md">
        {/* Terminal Header */}
        <div className="bg-slate-900 px-4 py-3 border-b border-slate-950 flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 bg-accent-rose rounded-full" />
            <div className="h-2.5 w-2.5 bg-accent-amber rounded-full" />
            <div className="h-2.5 w-2.5 bg-accent-emerald rounded-full" />
            <span className="font-mono text-slate-400 ml-2 font-bold">cmd.exe - python execute_script.py</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">ANSI utf-8</span>
        </div>

        {/* Terminal Content Screen */}
        <div className="bg-slate-950 p-6 min-h-[300px] font-mono text-xs text-emerald-450 space-y-2 overflow-y-auto max-h-[400px] bg-black">
          {streamedLogs.length === 0 && executionStatus === 'idle' && (
            <p className="text-slate-500 italic">Đang chờ lệnh phê duyệt thực thi...</p>
          )}
          {streamedLogs.map((log, idx) => (
            <p 
              key={idx} 
              className={`leading-relaxed whitespace-pre-wrap ${
                log.startsWith('[') ? 'text-blue-400' : log.includes('SUCCESS') || log.includes('thành công') ? 'text-emerald-450 font-bold' : 'text-white'
              }`}
            >
              {log}
            </p>
          ))}
          {executionStatus === 'running' && (
            <div className="flex items-center gap-2 text-amber-400 pt-2">
              <span className="h-1.5 w-1.5 bg-amber-400 rounded-full animate-ping" />
              <span>Đang kết xuất và tạo file ảnh biểu đồ...</span>
            </div>
          )}
        </div>
      </div>

      {/* Next Step CTA */}
      {executionStatus === 'success' && (
        <div className="flex justify-end animate-bounce">
          <button 
            onClick={() => setCurrentTab('results')}
            className="bg-brand-primary hover:bg-brand-primary/90 text-white font-bold text-xs px-6 py-3 rounded-lg transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2 cursor-pointer"
          >
            Thành công! Đi tới xem kết quả trực quan <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
