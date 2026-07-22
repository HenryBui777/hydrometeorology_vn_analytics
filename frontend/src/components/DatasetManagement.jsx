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
  const activePage = parseInt(currentPage, 10) || 1;
  const indexOfLastRow = activePage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredRows.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(filteredRows.length / rowsPerPage);

  // Pagination logic for schema explorer
  const indexOfLastSchemaRow = schemaPage * schemaRowsPerPage;
  const indexOfFirstSchemaRow = indexOfLastSchemaRow - schemaRowsPerPage;
  const currentSchemaRows = mockDatasetInfo.columns.slice(indexOfFirstSchemaRow, indexOfLastSchemaRow);
  const totalSchemaPages = Math.ceil(mockDatasetInfo.columns.length / schemaRowsPerPage);

  return (
    <div className="space-y-8 animate-fade-in w-full">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight sm:text-3xl">Tập dữ liệu khí tượng</h1>
      </div>

      {/* Loaded Dataset Info Card */}
      <div className="glass-panel rounded-xl p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <FileSpreadsheet className="h-8 w-8 text-brand-primary flex-shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{mockDatasetInfo.name}</h3>
              <span className="bg-blue-50 dark:bg-slate-700 border border-blue-200 dark:border-slate-600 text-brand-primary dark:text-brand-accent text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Tập dữ liệu chính thức
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl font-semibold">{mockDatasetInfo.description}</p>
          </div>
        </div>
      </div>

      {/* Dataset Details Section */}
      <div className="space-y-6">
        {/* Metadata Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="tech-card rounded-lg border border-slate-200 dark:border-slate-700 p-5 bg-white dark:bg-slate-800 shadow-sm">
            <span className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Dung lượng file</span>
            <p className="text-xl font-extrabold text-slate-850 dark:text-slate-100 mt-1">{mockDatasetInfo.size}</p>
          </div>
          <div className="tech-card rounded-lg border border-slate-200 dark:border-slate-700 p-5 bg-white dark:bg-slate-800 shadow-sm">
            <span className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Tổng số dòng</span>
            <p className="text-xl font-extrabold text-slate-850 dark:text-slate-100 mt-1">
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-brand-primary inline" />
              ) : (
                <>{(fullStats?.totalRows ?? rawRows.length).toLocaleString()} dòng</>
              )}
            </p>
          </div>
          <div className="tech-card rounded-lg border border-slate-200 dark:border-slate-700 p-5 bg-white dark:bg-slate-800 shadow-sm">
            <span className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Số biến dữ liệu</span>
            <p className="text-xl font-extrabold text-slate-850 dark:text-slate-100 mt-1">{mockDatasetInfo.columnsCount} biến số</p>
          </div>
          <div className="tech-card rounded-lg border border-slate-200 dark:border-slate-700 p-5 bg-white dark:bg-slate-800 shadow-sm">
            <span className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Độ đại diện địa lý</span>
            <p className="text-xl font-extrabold text-slate-850 dark:text-slate-100 mt-1">
              {loading ? '...' : `${fullStats?.provinces?.length ?? 34} tỉnh thành`}
            </p>
          </div>
        </div>

        {/* Sub-tabs Container */}
        <div className="glass-panel rounded-xl p-6 border border-slate-200 dark:border-slate-700 space-y-6 bg-white dark:bg-slate-800 shadow-sm">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-4">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveSubTab('explorer')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 border cursor-pointer ${activeSubTab === 'explorer'
                    ? 'bg-brand-primary text-white border-brand-primary shadow-md shadow-blue-500/10'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600'
                  }`}
              >
                <Table className="h-4 w-4" /> Trình duyệt dữ liệu
              </button>
              <button
                onClick={() => setActiveSubTab('schema')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 border cursor-pointer ${activeSubTab === 'schema'
                    ? 'bg-brand-primary text-white border-brand-primary shadow-md shadow-blue-500/10'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600'
                  }`}
              >
                <Database className="h-4 w-4" /> Cấu trúc cột
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
                  className="glass-input w-full !pl-9 py-2 text-xs font-semibold placeholder:font-semibold placeholder:text-slate-400"
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
                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                  <table className="min-w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-655 dark:text-slate-300 font-bold uppercase tracking-wider whitespace-nowrap">
                        <th className="pl-5 pr-3 py-4">Tỉnh thành</th>
                        <th className="px-3 py-4">Vùng miền</th>
                        <th className="px-3 py-4">Ngày</th>
                        <th className="px-3 py-4">Nhiệt độ TB (°C)</th>
                        <th className="px-3 py-4">Lượng mưa (mm)</th>
                        <th className="px-3 py-4">Độ ẩm TB (%)</th>
                        <th className="px-3 py-4">Gió max (km/h)</th>
                        <th className="px-3 py-4">Nắng (h)</th>
                        <th className="pl-3 pr-5 py-4">Mùa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {currentRows.length > 0 ? (
                        currentRows.map((row, index) => (
                          <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 transition-colors">
                            <td className="pl-5 pr-3 py-3.5 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">{row.province}</td>
                            <td className="px-3 py-3.5 text-slate-600 dark:text-slate-400 min-w-[165px] max-w-[185px] leading-normal">{row.region}</td>
                            <td className="px-3 py-3.5 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">{row.date}</td>
                            <td className="px-3 py-3.5 font-mono text-brand-primary font-bold whitespace-nowrap">{row.temp?.toFixed(1)}</td>
                            <td className="px-3 py-3.5 font-mono text-brand-accent font-bold whitespace-nowrap">{row.rain?.toFixed(2)}</td>
                            <td className="px-3 py-3.5 font-mono whitespace-nowrap">{row.humidity?.toFixed(1)}%</td>
                            <td className="px-3 py-3.5 font-mono text-indigo-600 dark:text-indigo-400 font-bold whitespace-nowrap">{row.wind?.toFixed(1)}</td>
                            <td className="px-3 py-3.5 font-mono text-amber-600 font-bold whitespace-nowrap">{row.sunshine?.toFixed(1)}</td>
                            <td className="pl-3 pr-5 py-3.5 whitespace-nowrap">
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
                  <div className="flex gap-2.5 items-center">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      className="bg-slate-50 hover:bg-slate-100 disabled:opacity-40 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                    >
                      Trước
                    </button>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">Trang</span>
                      <input
                        type="text"
                        value={currentPage}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          if (val === '') {
                            setCurrentPage('');
                          } else {
                            const pageNum = Math.min(Math.max(parseInt(val, 10), 1), totalPages);
                            setCurrentPage(pageNum);
                          }
                        }}
                        onBlur={() => {
                          if (currentPage === '') {
                            setCurrentPage(1);
                          }
                        }}
                        className="w-12 text-center font-bold text-slate-800 border border-slate-200 rounded-lg py-1 bg-white focus:outline-none focus:border-brand-primary"
                      />
                      <span className="text-slate-400">/ {totalPages}</span>
                    </div>
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      className="bg-slate-50 hover:bg-slate-100 disabled:opacity-40 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
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
              <div className="bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center gap-2">
                  <Info className="h-4 w-4 text-brand-accent" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Chi tiết cấu trúc cột (Hiển thị trang {schemaPage} / {totalSchemaPages})</span>
                </div>

                <div className="overflow-x-auto bg-white dark:bg-slate-900">
                  <table className="min-w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-655 dark:text-slate-300 font-bold uppercase tracking-wider whitespace-nowrap">
                        <th className="pl-5 pr-3 py-4 w-1/4">Tên biến</th>
                        <th className="px-3 py-4 w-1/2">Ý nghĩa</th>
                        <th className="px-3 py-4">Kiểu dữ liệu</th>
                        <th className="pl-3 pr-5 py-4">Dữ liệu rỗng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {currentSchemaRows.map((col, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 transition-colors animate-fade-in">
                          <td className="pl-5 pr-3 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[13px] font-bold text-slate-900 dark:text-slate-100">{col.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                #{(schemaPage - 1) * schemaRowsPerPage + idx + 1}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-4 text-slate-500 dark:text-slate-400 font-semibold">{col.description}</td>
                          <td className="px-3 py-4 whitespace-nowrap">
                            <span className="bg-slate-55 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-650 dark:text-slate-300 font-mono px-2 py-0.5 rounded-md text-[10px] md:text-xs">
                              {col.type}
                            </span>
                          </td>
                          <td className="pl-3 pr-5 py-4 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-md font-mono font-bold text-[10px] md:text-xs ${col.nullCount > 0 ? 'bg-amber-50 dark:bg-amber-900/30 border border-amber-100 dark:border-amber-800/50 text-amber-600 dark:text-amber-500' : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'}`}>
                              {col.nullCount}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                          className={`w-7 h-7 text-xs font-bold rounded-lg transition-all ${schemaPage === p
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
