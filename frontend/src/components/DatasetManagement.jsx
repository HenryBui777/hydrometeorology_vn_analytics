import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Info, 
  Search, 
  Table, 
  Database,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { mockDatasetInfo } from '../mockData';
import { useData } from '../context/DataContext';

export default function DatasetManagement() {
  const { rawRows, loading, fullStats } = useData();

  const [activeSubTab, setActiveSubTab] = useState('explorer'); // 'explorer' | 'schema'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data table pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Schema pagination states
  const [schemaPage, setSchemaPage] = useState(1);
  const schemaRowsPerPage = 10;

  // Filter real rows for data explorer
  const filteredRows = rawRows.filter(row =>
    row.province.toLowerCase().includes(searchQuery.toLowerCase()) ||
    row.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (row.season && row.season.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Pagination logic for data table
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredRows.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(filteredRows.length / rowsPerPage);

  // Pagination logic for schema explorer
  const indexOfLastSchemaRow = schemaPage * schemaRowsPerPage;
  const indexOfFirstSchemaRow = indexOfLastSchemaRow - schemaRowsPerPage;
  const currentSchemaRows = mockDatasetInfo.columns.slice(indexOfFirstSchemaRow, indexOfLastSchemaRow);
  const totalSchemaPages = Math.ceil(mockDatasetInfo.columns.length / schemaRowsPerPage);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight sm:text-3xl">Tập dữ liệu khí tượng</h1>
        <p className="text-slate-500 text-sm mt-1">
          Dữ liệu thời tiết được nạp cố định làm cơ sở phân tích cho các truy vấn và mô hình của trợ lý AI.
        </p>
      </div>

      {/* Loaded Dataset Info Card */}
      <div className="glass-panel rounded-2xl p-6 border border-emerald-250 bg-gradient-to-r from-white via-white to-emerald-50/20 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-50 border border-emerald-150 text-emerald-600 rounded-xl">
            <FileSpreadsheet className="h-8 w-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-800">{mockDatasetInfo.name}</h3>
              <span className="bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Tập dữ liệu chính thức
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl font-semibold">{mockDatasetInfo.description}</p>
          </div>
        </div>
      </div>

      {/* Dataset Details Section */}
      <div className="space-y-6">
        {/* Metadata Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="glass-card rounded-xl p-5 border border-slate-200">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Dung lượng file</span>
            <p className="text-xl font-extrabold text-slate-800 mt-1">{mockDatasetInfo.size}</p>
          </div>
          <div className="glass-card rounded-xl p-5 border border-slate-200">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Tổng số dòng</span>
            <p className="text-xl font-extrabold text-slate-800 mt-1">
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-brand-primary inline" />
              ) : (
                <>{(fullStats?.totalRows ?? rawRows.length).toLocaleString()} dòng</>
              )}
            </p>
          </div>
          <div className="glass-card rounded-xl p-5 border border-slate-200">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Số biến dữ liệu</span>
            <p className="text-xl font-extrabold text-slate-800 mt-1">{mockDatasetInfo.columnsCount} biến số</p>
          </div>
          <div className="glass-card rounded-xl p-5 border border-slate-200">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Độ đại diện địa lý</span>
            <p className="text-xl font-extrabold text-slate-800 mt-1">
              {loading ? '...' : `${fullStats?.provinces?.length ?? 34} tỉnh thành`}
            </p>
          </div>
        </div>

        {/* Sub-tabs Container */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-200 space-y-6 bg-white">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveSubTab('explorer')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  activeSubTab === 'explorer' 
                    ? 'bg-brand-primary text-white shadow-md' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Table className="h-4 w-4" /> Trình duyệt dữ liệu
              </button>
              <button
                onClick={() => setActiveSubTab('schema')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  activeSubTab === 'schema' 
                    ? 'bg-brand-primary text-white shadow-md' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Database className="h-4 w-4" /> Cấu trúc cột (Schema)
              </button>
            </div>

            {activeSubTab === 'explorer' && (
              <div className="relative w-64 text-xs">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="h-3.5 w-3.5" />
                </span>
                <input
                  type="text"
                  placeholder="Tìm theo tỉnh, vùng..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="glass-input w-full pl-9 py-2 text-xs"
                />
              </div>
            )}
          </div>

          {/* Sub-tab 1: Data Explorer */}
          {activeSubTab === 'explorer' && (
            <div className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
                  <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
                  <span className="text-sm font-semibold">Đang tải dữ liệu CSV...</span>
                </div>
              ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="min-w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                      <th className="px-6 py-4">Tỉnh thành</th>
                      <th className="px-6 py-4">Vùng miền</th>
                      <th className="px-6 py-4">Ngày</th>
                      <th className="px-6 py-4">Nhiệt độ TB (°C)</th>
                      <th className="px-6 py-4">Lượng mưa (mm)</th>
                      <th className="px-6 py-4">Độ ẩm TB (%)</th>
                      <th className="px-6 py-4">Gió max (km/h)</th>
                      <th className="px-6 py-4">Nắng (h)</th>
                      <th className="px-6 py-4">Mùa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentRows.length > 0 ? (
                      currentRows.map((row, index) => (
                        <tr key={index} className="hover:bg-slate-50/50 text-slate-700 transition-colors">
                          <td className="px-6 py-3.5 font-bold text-slate-900">{row.province}</td>
                          <td className="px-6 py-3.5 text-slate-600">{row.region}</td>
                          <td className="px-6 py-3.5 font-mono text-slate-500">{row.date}</td>
                          <td className="px-6 py-3.5 font-mono text-brand-primary font-bold">{row.temp?.toFixed(1)}</td>
                          <td className="px-6 py-3.5 font-mono text-brand-accent font-bold">{row.rain?.toFixed(2)}</td>
                          <td className="px-6 py-3.5 font-mono">{row.humidity?.toFixed(1)}%</td>
                          <td className="px-6 py-3.5 font-mono text-slate-600">{row.wind?.toFixed(1)}</td>
                          <td className="px-6 py-3.5 font-mono text-amber-600 font-bold">{row.sunshine?.toFixed(1)}</td>
                          <td className="px-6 py-3.5">
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-[10px] text-brand-primary font-bold">
                              {row.season || '—'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="9" className="text-center py-8 text-slate-400">Không tìm thấy bản ghi phù hợp.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              )}

              {/* Pagination Controls for Data table */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center text-xs text-slate-500 font-semibold pt-2">
                  <span>
                    Hiển thị {indexOfFirstRow + 1} - {Math.min(indexOfLastRow, filteredRows.length)} của {filteredRows.length.toLocaleString()} dòng dữ liệu thực
                  </span>
                  <div className="flex gap-2">
                    <button 
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      className="bg-slate-50 hover:bg-slate-100 disabled:opacity-40 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-all"
                    >
                      Trước
                    </button>
                    <span className="flex items-center px-3 text-slate-600 font-bold">
                      {currentPage} / {totalPages}
                    </span>
                    <button 
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      className="bg-slate-50 hover:bg-slate-100 disabled:opacity-40 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-all"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sub-tab 2: Schema Explorer (with pagination added) */}
          {activeSubTab === 'schema' && (
            <div className="space-y-4">
              <div className="bg-slate-50/50 rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                  <Info className="h-4 w-4 text-brand-accent" />
                  <span className="text-xs font-bold text-slate-700">Chi tiết cấu trúc cột (Hiển thị trang {schemaPage} / {totalSchemaPages})</span>
                </div>
                
                <div className="divide-y divide-slate-100 bg-white">
                  {currentSchemaRows.map((col, idx) => (
                    <div key={idx} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-2 hover:bg-slate-50/30 text-xs animate-fade-in">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-slate-900">{col.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            #{(schemaPage - 1) * schemaRowsPerPage + idx + 1}
                          </span>
                        </div>
                        <p className="text-slate-500 font-semibold">{col.description}</p>
                      </div>
                      <div className="flex gap-3 text-[10px] md:text-xs">
                        <span className="bg-slate-55 border border-slate-200 text-slate-650 font-mono px-2 py-0.5 rounded-md">
                          Kiểu: {col.type}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md font-mono font-bold ${col.nullCount > 0 ? 'bg-amber-50 border border-amber-100 text-amber-600' : 'bg-slate-100 border border-slate-200 text-slate-400'}`}>
                          Rỗng: {col.nullCount}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Schema Pagination controls */}
              {totalSchemaPages > 1 && (
                <div className="flex justify-between items-center text-xs text-slate-500 font-semibold pt-2">
                  <span>
                    Hiển thị {indexOfFirstSchemaRow + 1} - {Math.min(indexOfLastSchemaRow, mockDatasetInfo.columns.length)} trên tổng số {mockDatasetInfo.columns.length} thuộc tính của dataset
                  </span>
                  <div className="flex gap-2">
                    <button 
                      disabled={schemaPage === 1}
                      onClick={() => setSchemaPage(prev => Math.max(prev - 1, 1))}
                      className="bg-slate-50 hover:bg-slate-100 disabled:opacity-40 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 font-bold"
                    >
                      <ChevronLeft className="h-4 w-4" /> Trước
                    </button>
                    
                    {/* Render page numbers */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalSchemaPages }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          onClick={() => setSchemaPage(p)}
                          className={`w-7 h-7 text-xs font-bold rounded-lg transition-all ${
                            schemaPage === p 
                              ? 'bg-brand-primary text-white' 
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>

                    <button 
                      disabled={schemaPage === totalSchemaPages}
                      onClick={() => setSchemaPage(prev => Math.min(prev + 1, totalSchemaPages))}
                      className="bg-slate-50 hover:bg-slate-100 disabled:opacity-40 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 font-bold"
                    >
                      Sau <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
