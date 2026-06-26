import React, { useState } from 'react';
import { 
  Settings, 
  Key, 
  Cpu, 
  FolderOpen, 
  ToggleLeft,
  ToggleRight,
  Save,
  CheckCircle2
} from 'lucide-react';

export default function SettingsView() {
  const [model, setModel] = useState('gemini-flash');
  const [apiKey, setApiKey] = useState('••••••••••••••••••••••••••••••••');
  const [localDir, setLocalDir] = useState('d:/CODE/final_dataVisualization/hydrometeorology_vn_analytics/data');
  const [enableSandbox, setEnableSandbox] = useState(true);
  const [timeout, setTimeout] = useState(30);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 3000);
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight sm:text-3xl">Cấu Hình Nền Tảng</h1>
        <p className="text-slate-500 text-sm mt-1">Thiết lập các thông số môi trường thực thi, kết nối mô hình AI LLM và lưu trữ logs.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* LLM Connection settings */}
        <div className="glass-panel bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Cpu className="h-5 w-5 text-brand-primary" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Cấu Hình Mô Hình AI (LLM)</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-1.5">
              <label className="text-slate-650 font-bold">Mô hình ngôn ngữ chính</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="glass-input w-full bg-white text-slate-800 font-semibold"
              >
                <option value="gemini-flash">Gemini 1.5 Flash (Khuyên dùng - Nhanh)</option>
                <option value="gemini-pro">Gemini 1.5 Pro (Thông minh)</option>
                <option value="openai-gpt4">OpenAI GPT-4o (Độ chính xác cao)</option>
                <option value="local-ollama">Local DeepSeek-Coder (Ollama - Cục bộ 100%)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-650 font-bold">Khóa API Key</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Key className="h-3.5 w-3.5" />
                </span>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="glass-input w-full pl-9 bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Local Environment settings */}
        <div className="glass-panel bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <FolderOpen className="h-5 w-5 text-brand-accent" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Cài Đặt Môi Trường Cục Bộ (Local)</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-1.5">
              <label className="text-slate-650 font-bold">Thư mục làm việc của dự án</label>
              <input
                type="text"
                value={localDir}
                onChange={(e) => setLocalDir(e.target.value)}
                className="glass-input w-full font-mono text-[11px] bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-650 font-bold">Giới hạn thời gian chạy (Timeout)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={timeout}
                  onChange={(e) => setTimeout(e.target.value)}
                  className="glass-input w-24 font-mono text-center bg-white"
                />
                <span className="text-slate-500 font-semibold">giây (Hạn chế treo luồng vô hạn)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Security Sandbox settings */}
        <div className="glass-panel bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-rose-500" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Chế Độ Bảo Mật Cát (Sandbox)</h2>
            </div>
            
            <button
              type="button"
              onClick={() => setEnableSandbox(!enableSandbox)}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              {enableSandbox ? (
                <ToggleRight className="h-9 w-9 text-brand-primary" />
              ) : (
                <ToggleLeft className="h-9 w-9 text-slate-350" />
              )}
            </button>
          </div>
          
          <div className="text-xs space-y-2">
            <p className="text-slate-600 leading-relaxed font-semibold">
              Khi được bật, các tập lệnh Python sinh ra sẽ được phân tích từ khóa nguy hiểm tĩnh (Static Analysis) trước khi chạy. 
              Các dòng lệnh import các thư viện hệ thống như `os`, `sys`, `subprocess`, `shutil` sẽ bị chặn để bảo vệ máy tính của bạn.
            </p>
            <div className="flex items-center gap-1.5 pt-1">
              <span className={`h-2 w-2 rounded-full ${enableSandbox ? 'bg-brand-primary animate-pulse' : 'bg-slate-300'}`} />
              <span className="text-[10px] text-slate-500 font-bold uppercase">
                {enableSandbox ? 'Sandbox đang bảo vệ' : 'Cảnh báo: Sandbox đã tắt'}
              </span>
            </div>
          </div>
        </div>

        {/* Submit Save */}
        <div className="flex items-center justify-between">
          <div>
            {saveSuccess && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 border border-emerald-150 px-3.5 py-2 rounded-xl shadow-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="font-bold">Đã lưu cài đặt cấu hình thành công!</span>
              </div>
            )}
          </div>
          <button
            type="submit"
            className="bg-brand-primary hover:bg-brand-primary/90 text-white font-bold text-xs px-6 py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
          >
            <Save className="h-4 w-4" /> Lưu Cấu Hướng
          </button>
        </div>

      </form>
    </div>
  );
}
