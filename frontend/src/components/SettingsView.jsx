import React, { useState } from 'react';
import {
  Settings,
  Key,
  Cpu,
  FolderOpen,
  ToggleLeft,
  ToggleRight,
  Save,
  CheckCircle2,
  ChevronDown,
  Check
} from 'lucide-react';
import { useAppearance } from '../context/AppearanceContext';

function CustomSelect({ value, onChange, options, className }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef(null);

  React.useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  return (
    <div className="relative w-full text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`${className} flex items-center justify-between gap-1.5 cursor-pointer`}
      >
        <span>{selectedOption.label}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-60 flex-shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-full max-h-60 overflow-y-auto rounded-lg bg-white border border-slate-200 shadow-lg z-30 py-1 font-semibold text-slate-700 animate-fade-in">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange({ target: { value: opt.value } });
                setIsOpen(false);
              }}
              className={`w-full text-left px-3.5 py-2 hover:bg-blue-50 transition-colors flex items-center justify-between text-xs cursor-pointer ${opt.value === value ? 'bg-blue-55/60 text-brand-primary font-bold' : ''
                }`}
            >
              <span>{opt.label}</span>
              {opt.value === value && <Check className="h-3.5 w-3.5 text-brand-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SettingsView() {
  const { theme, setTheme, palette, setPalette } = useAppearance();
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
    <div className="space-y-8 animate-fade-in w-full">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight sm:text-3xl">Cấu hình nền tảng</h1>
        <p className="text-slate-500 text-sm mt-1">Thiết lập môi trường, kết nối LLM (AI Model) và cấu hình Sandbox.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">

        <div className="glass-panel bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Settings className="h-5 w-5 text-brand-primary" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Giao diện và khả năng tiếp cận</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-2"><label className="text-slate-650 font-bold">Chế độ hiển thị</label><div className="flex gap-2"><button type="button" onClick={() => setTheme('light')} className={`px-4 py-2 rounded-lg border font-bold ${theme === 'light' ? 'bg-brand-primary text-white' : 'border-slate-200'}`}>Sáng</button><button type="button" onClick={() => setTheme('dark')} className={`px-4 py-2 rounded-lg border font-bold ${theme === 'dark' ? 'bg-brand-primary text-white' : 'border-slate-200'}`}>Tối</button></div></div>
            <div className="space-y-2"><label className="text-slate-650 font-bold">Bảng màu biểu đồ</label><div className="flex gap-2"><button type="button" onClick={() => setPalette('standard')} className={`px-4 py-2 rounded-lg border font-bold ${palette === 'standard' ? 'bg-brand-primary text-white' : 'border-slate-200'}`}>Tiêu chuẩn</button><button type="button" onClick={() => setPalette('colorblind')} className={`px-4 py-2 rounded-lg border font-bold ${palette === 'colorblind' ? 'bg-brand-primary text-white' : 'border-slate-200'}`}>Thân thiện mù màu</button></div></div>
          </div>
        </div>

        {/* LLM Connection settings */}
        <div className="glass-panel bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Cpu className="h-5 w-5 text-brand-primary" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Cấu hình kết nối LLM</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-1.5">
              <label className="text-slate-650 font-bold cursor-pointer">Primary LLM Model</label>
              <CustomSelect
                value={model}
                onChange={(e) => setModel(e.target.value)}
                options={[
                  { value: 'gemini-flash', label: 'Gemini 1.5 Flash (Khuyên dùng - Nhanh)' },
                  { value: 'gemini-pro', label: 'Gemini 1.5 Pro (Thông minh)' },
                  { value: 'openai-gpt4', label: 'OpenAI GPT-4o (Độ chính xác cao)' },
                  { value: 'local-ollama', label: 'Local DeepSeek-Coder (Ollama - Cục bộ 100%)' }
                ]}
                className="glass-input w-full bg-white text-slate-800 font-semibold cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-650 font-bold">API Key</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Key className="h-3.5 w-3.5" />
                </span>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="glass-input w-full !pl-9 bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Local Environment settings */}
        <div className="glass-panel bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <FolderOpen className="h-5 w-5 text-brand-primary" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Cài đặt Local Environment</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-1.5">
              <label className="text-slate-650 font-bold">Thư mục dự án</label>
              <input
                type="text"
                value={localDir}
                onChange={(e) => setLocalDir(e.target.value)}
                className="glass-input w-full font-mono text-[11px] bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-650 font-bold">Thời gian chạy tối đa</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={timeout}
                  onChange={(e) => setTimeout(e.target.value)}
                  className="glass-input w-24 font-mono text-center bg-white"
                />
                <span className="text-slate-500 font-semibold">giây (Tránh treo luồng vô hạn)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Security Sandbox settings */}
        <div className="glass-panel bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-rose-500 animate-spin-slow" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Cơ chế bảo mật Sandbox</h2>
            </div>

            <button
              type="button"
              onClick={() => setEnableSandbox(!enableSandbox)}
              className="text-slate-400 hover:text-slate-650 transition-colors cursor-pointer"
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
              Khi kích hoạt, hệ thống thực hiện phân tích tĩnh mã nguồn Python trước khi khởi chạy.
              Lệnh import các thư viện hệ thống (như `os`, `sys`, `subprocess`, `shutil`) sẽ tự động bị chặn để bảo vệ an toàn cho máy chủ.
            </p>
            <div className="flex items-center gap-1.5 pt-1">
              <span className={`h-2 w-2 rounded-full ${enableSandbox ? 'bg-brand-primary animate-pulse' : 'bg-slate-300'}`} />
              <span className="text-[10px] text-slate-500 font-bold uppercase">
                {enableSandbox ? 'Sandbox: Đang kích hoạt' : 'Sandbox: Đã vô hiệu hóa'}
              </span>
            </div>
          </div>
        </div>

        {/* Submit Save */}
        <div className="flex items-center justify-between">
          <div>
            {saveSuccess && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 px-3.5 py-2 rounded-lg shadow-sm animate-fade-in">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="font-bold">Đã lưu cài đặt cấu hình thành công!</span>
              </div>
            )}
          </div>
          <button
            type="submit"
            className="bg-brand-primary hover:bg-brand-primary/90 text-white font-bold text-xs px-6 py-3 rounded-lg border border-transparent transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Save className="h-4 w-4" /> Lưu cấu hình
          </button>
        </div>

      </form>
    </div>
  );
}
