import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Play, 
  CheckCircle2, 
  XCircle,
  FileCode,
  Trash2,
  ExternalLink
} from 'lucide-react';

export default function HistoryView({ historyList, onRestoreRun, onDeleteRun }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredHistory = historyList.filter(item => 
    item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight sm:text-3xl">Lịch Sử Phân Tích</h1>
          <p className="text-slate-500 text-sm mt-1">Lưu trữ tất cả các mã nguồn, logs và kết quả trực quan hóa đã từng chạy.</p>
        </div>
        
        {/* Search Bar */}
        <div className="relative w-64 text-xs">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Tìm truy vấn trong lịch sử..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="glass-input w-full pl-9 py-2 text-xs"
          />
        </div>
      </div>

      {/* History List Grid */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Tên truy vấn</th>
                <th className="px-6 py-4">Yêu cầu người dùng</th>
                <th className="px-6 py-4">Thời gian chạy</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredHistory.length > 0 ? (
                filteredHistory.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 text-slate-700 transition-colors">
                    <td className="px-6 py-4 font-mono text-slate-400">#0{item.id}</td>
                    <td className="px-6 py-4 font-bold text-slate-900 whitespace-nowrap">{item.title}</td>
                    <td className="px-6 py-4 max-w-sm truncate font-semibold">{item.question}</td>
                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap">24-06-2026 12:{50 + idx}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="bg-emerald-50 border border-emerald-100 text-emerald-600 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                        <CheckCircle2 className="h-3 w-3" /> Thành công
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center flex justify-center gap-2">
                      <button
                        onClick={() => onRestoreRun(item)}
                        className="bg-blue-50 hover:bg-brand-primary text-brand-primary hover:text-white border border-blue-100 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" /> Khôi phục
                      </button>
                      <button
                        onClick={() => onDeleteRun(item.id)}
                        className="bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-150 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-400 bg-slate-50/20">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <History className="h-8 w-8 text-slate-400" />
                      <span className="font-semibold">Không có truy vấn nào trong lịch sử.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
