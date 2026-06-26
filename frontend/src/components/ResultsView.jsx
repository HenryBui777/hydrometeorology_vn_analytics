import React, { useState } from 'react';
import { 
  AreaChart as ChartIcon, 
  Table, 
  Code2, 
  Download, 
  Share2, 
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowLeft,
  ChevronRight,
  TrendingUp as TrendIcon
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  ScatterChart, 
  Scatter,
  AreaChart as RechartsAreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ZAxis
} from 'recharts';
import { predefinedQueries } from '../mockData';

export default function ResultsView() {
  const [selectedQueryId, setSelectedQueryId] = useState(null); // null means show list, or number shows specific dashboard
  const [activeTab, setActiveTab] = useState('chart'); // 'chart' | 'table' | 'code'

  const selectedQuery = predefinedQueries.find(q => q.id === selectedQueryId);

  const renderTrendIcon = (trend) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-rose-600" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-cyan-600" />;
      default: return <Minus className="h-4 w-4 text-slate-400" />;
    }
  };

  const getTrendClass = (trend) => {
    switch (trend) {
      case 'up': return 'bg-rose-50 border border-rose-100 text-rose-600';
      case 'down': return 'bg-cyan-50 border border-cyan-100 text-cyan-600';
      default: return 'bg-slate-50 border border-slate-200 text-slate-500';
    }
  };

  // Render multiple charts for each query to provide a comprehensive answer
  const renderMultiChartsGrid = () => {
    if (!selectedQuery) return null;
    const data = selectedQuery.chartData;
    
    if (selectedQuery.chartType === 'bar') {
      // Report 1: Rainfall analysis
      // We show 2 charts: 1. Bar chart comparing regions, 2. Area chart showing monthly trend
      const monthlyPrecipData = [
        { month: 'Tháng 12', 'Mưa TB': 3.12 },
        { month: 'Tháng 1', 'Mưa TB': 1.05 },
        { month: 'Tháng 2', 'Mưa TB': 0.85 },
        { month: 'Tháng 3', 'Mưa TB': 1.45 },
        { month: 'Tháng 4', 'Mưa TB': 2.68 },
        { month: 'Tháng 5', 'Mưa TB': 3.90 },
      ];

      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
          {/* Chart 1: Regional Comparison */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase">Biểu đồ 1: Lượng mưa trung bình theo vùng miền</span>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                  <XAxis dataKey="name" stroke="#70859c" tick={{ fontSize: 9 }} />
                  <YAxis stroke="#70859c" />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', color: '#0f172a' }} />
                  <Bar dataKey="value" name="Lượng mưa (mm)" fill="#2563EB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          {/* Chart 2: Monthly Precipitation trend */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase">Biểu đồ 2: Diễn biến lượng mưa trung bình theo tháng</span>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsAreaChart data={monthlyPrecipData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                  <XAxis dataKey="month" stroke="#70859c" />
                  <YAxis stroke="#70859c" />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', color: '#0f172a' }} />
                  <Area type="monotone" dataKey="Mưa TB" name="Lượng mưa (mm)" fill="#06B6D4" fillOpacity={0.15} stroke="#06B6D4" strokeWidth={2} />
                </RechartsAreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      );
    }

    if (selectedQuery.chartType === 'line') {
      // Report 2: Temperature trends
      // We show 2 charts: 1. Line chart comparing daily trends, 2. Bar chart comparing average monthly hot days
      const monthlyHotDays = [
        { month: 'Tháng 12', 'Hà Nội': 0, 'Huế': 0, 'Hồ Chí Minh': 3 },
        { month: 'Tháng 1', 'Hà Nội': 0, 'Huế': 0, 'Hồ Chí Minh': 5 },
        { month: 'Tháng 2', 'Hà Nội': 1, 'Huế': 2, 'Hồ Chí Minh': 12 },
        { month: 'Tháng 3', 'Hà Nội': 4, 'Huế': 6, 'Hồ Chí Minh': 22 },
        { month: 'Tháng 4', 'Hà Nội': 12, 'Huế': 18, 'Hồ Chí Minh': 28 },
        { month: 'Tháng 5', 'Hà Nội': 20, 'Huế': 24, 'Hồ Chí Minh': 25 },
      ];

      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
          {/* Chart 1: Daily Trends */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase">Biểu đồ 1: Xu hướng nhiệt độ 2m trung bình hàng ngày</span>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                  <XAxis dataKey="date" stroke="#70859c" />
                  <YAxis stroke="#70859c" />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', color: '#0f172a' }} />
                  <Legend />
                  <Line type="monotone" dataKey="Hà Nội" stroke="#06B6D4" strokeWidth={2} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="Huế" stroke="#f59e0b" strokeWidth={2} />
                  <Line type="monotone" dataKey="Hồ Chí Minh" stroke="#f43f5e" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          {/* Chart 2: Number of Hot Days */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase">Biểu đồ 2: Số ngày nắng nóng cực đoan (&gt;35°C) theo tháng</span>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyHotDays} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                  <XAxis dataKey="month" stroke="#70859c" />
                  <YAxis stroke="#70859c" />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', color: '#0f172a' }} />
                  <Legend />
                  <Bar dataKey="Hà Nội" fill="#06B6D4" />
                  <Bar dataKey="Huế" fill="#f59e0b" />
                  <Bar dataKey="Hồ Chí Minh" fill="#f43f5e" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      );
    }

    if (selectedQuery.chartType === 'scatter') {
      // Report 3: Hottest Provinces Correlation
      // We show 2 charts: 1. Scatter plot of Temp vs Rain, 2. Horizontal Bar Chart of temperatures
      const sortedTempData = [...data].sort((a, b) => b.temp - a.temp);

      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
          {/* Chart 1: Correlation Scatter */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase">Biểu đồ 1: Tương quan phân tán giữa Nhiệt độ và Lượng mưa</span>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                  <XAxis type="number" dataKey="temp" name="Nhiệt độ" unit="°C" stroke="#70859c" domain={[28, 33]} />
                  <YAxis type="number" dataKey="rain" name="Lượng mưa" unit="mm" stroke="#70859c" />
                  <ZAxis type="category" dataKey="name" name="Tỉnh thành" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0' }} />
                  <Scatter name="Top 10 tỉnh nóng" data={data} fill="#10b981" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
          {/* Chart 2: Horizontal Bars of Top Temperatures */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase">Biểu đồ 2: Bảng xếp hạng nhiệt độ trung bình Tháng 5/2026</span>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sortedTempData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                  <XAxis type="number" stroke="#70859c" domain={[26, 34]} />
                  <YAxis dataKey="name" type="category" stroke="#70859c" tick={{ fontSize: 9 }} width={65} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0' }} />
                  <Bar dataKey="temp" name="Nhiệt độ (°C)" fill="#f43f5e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  // Render raw data table results
  const renderResultsTable = () => {
    if (!selectedQuery) return null;
    const data = selectedQuery.chartData;
    
    if (selectedQuery.chartType === 'bar') {
      return (
        <table className="min-w-full text-left text-xs bg-white">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
              <th className="px-6 py-4">Vùng miền</th>
              <th className="px-6 py-4">Lượng mưa trung bình (mm)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50 text-slate-750">
                <td className="px-6 py-3.5 font-bold text-slate-900">{row.name}</td>
                <td className="px-6 py-3.5 font-mono text-brand-primary font-bold">{row.value} mm</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (selectedQuery.chartType === 'line') {
      return (
        <table className="min-w-full text-left text-xs bg-white">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
              <th className="px-6 py-4">Ngày</th>
              <th className="px-6 py-4">Hà Nội (°C)</th>
              <th className="px-6 py-4">Huế (°C)</th>
              <th className="px-6 py-4">Hồ Chí Minh (°C)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50 text-slate-750">
                <td className="px-6 py-3.5 font-mono font-bold text-slate-900">{row.date}</td>
                <td className="px-6 py-3.5 font-mono text-[#06B6D4] font-bold">{row['Hà Nội']}</td>
                <td className="px-6 py-3.5 font-mono text-[#f59e0b] font-bold">{row['Huế']}</td>
                <td className="px-6 py-3.5 font-mono text-[#f43f5e] font-bold">{row['Hồ Chí Minh']}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (selectedQuery.chartType === 'scatter') {
      return (
        <table className="min-w-full text-left text-xs bg-white">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
              <th className="px-6 py-4">Tỉnh thành</th>
              <th className="px-6 py-4">Nhiệt độ TB (°C)</th>
              <th className="px-6 py-4">Lượng mưa TB (mm)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50 text-slate-750">
                <td className="px-6 py-3.5 font-bold text-slate-900">{row.name}</td>
                <td className="px-6 py-3.5 font-mono text-rose-500 font-bold">{row.temp} °C</td>
                <td className="px-6 py-3.5 font-mono text-cyan-600 font-bold">{row.rain} mm</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    return null;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* View 1: Gallery list of previously executed analyses */}
      {selectedQueryId === null ? (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight sm:text-3xl">Kết Quả Trực Quan Hoá</h1>
            <p className="text-slate-500 text-sm mt-1">Danh sách các báo cáo phân tích dữ liệu khí tượng Việt Nam đã hoàn thành.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {predefinedQueries.map((q) => (
              <div 
                key={q.id} 
                onClick={() => { setSelectedQueryId(q.id); setActiveTab('chart'); }}
                className="glass-card bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:border-brand-primary/40 cursor-pointer flex flex-col justify-between h-56 transition-all duration-200 group"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] bg-emerald-50 border border-emerald-100 text-emerald-600 font-extrabold px-2 py-0.5 rounded-full uppercase">
                      Executed
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold font-mono">#{q.id}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-800 group-hover:text-brand-primary transition-colors leading-tight">
                    {q.title}
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold line-clamp-2 leading-relaxed">
                    {q.question}
                  </p>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                  <span className="text-[10px] bg-slate-50 border border-slate-200 text-slate-600 font-semibold px-2.5 py-1 rounded-lg uppercase">
                    Báo cáo {q.chartType === 'bar' ? 'Mưa' : q.chartType === 'line' ? 'Nhiệt độ' : 'Tương quan'}
                  </span>
                  <span className="text-xs text-brand-primary font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Xem đa biểu đồ <ChevronRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* View 2: Detailed Dashboard report answering the selected question (with multiple sub-charts) */
        <div className="space-y-6 animate-fade-in">
          
          {/* Header Panel with Back Button */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedQueryId(null)}
                className="p-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-650 rounded-xl transition-all shadow-sm"
                title="Quay lại danh sách"
              >
                <ArrowLeft className="h-4.5 w-4.5" />
              </button>
              <div>
                <h1 className="text-xl font-extrabold text-slate-800 tracking-tight sm:text-2xl">{selectedQuery.title}</h1>
                <p className="text-slate-500 text-xs font-semibold mt-0.5">Báo cáo đa biểu đồ phân tích thời tiết Việt Nam</p>
              </div>
            </div>
            
            {/* Export Buttons */}
            <div className="flex flex-wrap gap-2.5">
              <button className="bg-white hover:bg-slate-50 border border-slate-200 text-xs text-slate-700 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all">
                <Download className="h-3.5 w-3.5 text-brand-accent" /> CSV
              </button>
              <button className="bg-white hover:bg-slate-50 border border-slate-200 text-xs text-slate-700 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all">
                <Download className="h-3.5 w-3.5 text-brand-primary" /> Ảnh đồ thị
              </button>
              <button className="bg-brand-primary hover:bg-brand-primary/90 text-xs text-white font-bold px-4 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm shadow-blue-500/10">
                <Share2 className="h-3.5 w-3.5" /> Báo cáo
              </button>
            </div>
          </div>

          {/* Dynamic KPI Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {selectedQuery.kpis.map((kpi, idx) => (
              <div key={idx} className="glass-card rounded-xl p-5 border border-slate-200 bg-white flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{kpi.label}</span>
                  <p className="text-2xl font-extrabold text-slate-800 tracking-tight">{kpi.value}</p>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">{kpi.desc}</p>
                </div>
                <div className={`p-2.5 rounded-lg ${getTrendClass(kpi.trend)}`}>
                  {renderTrendIcon(kpi.trend)}
                </div>
              </div>
            ))}
          </div>

          {/* Main Tab Panel Display */}
          <div className="glass-panel bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
            {/* Navigation Tabs */}
            <div className="flex gap-2 border-b border-slate-100 pb-4">
              <button
                onClick={() => setActiveTab('chart')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'chart' 
                    ? 'bg-brand-primary text-white shadow-md' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <ChartIcon className="h-4 w-4" /> Biểu Đồ Tương Tác Phân Tích
              </button>
              <button
                onClick={() => setActiveTab('table')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'table' 
                    ? 'bg-brand-primary text-white shadow-md' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Table className="h-4 w-4" /> Bảng Số Liệu Kết Quả
              </button>
              <button
                onClick={() => setActiveTab('code')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'code' 
                    ? 'bg-brand-primary text-white shadow-md' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Code2 className="h-4 w-4" /> Mã Nguồn Đã Chạy
              </button>
            </div>

            {/* Tab 1: Interactive Charts Grid (Showing multiple charts!) */}
            {activeTab === 'chart' && (
              <div className="bg-slate-50/50 p-6 rounded-xl border border-slate-150 flex flex-col justify-center items-center space-y-4">
                {renderMultiChartsGrid()}
                <div className="mt-4 p-3 bg-white rounded-xl border border-slate-200 flex items-center gap-2 text-xs text-slate-550 max-w-lg shadow-sm">
                  <FileText className="h-4 w-4 text-brand-accent flex-shrink-0" />
                  <span>Hệ thống hiển thị kết hợp đa biểu đồ (Multi-chart) để phân tích sâu sắc các chiều tương quan thời tiết khác nhau.</span>
                </div>
              </div>
            )}

            {/* Tab 2: Result Table */}
            {activeTab === 'table' && (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                {renderResultsTable()}
              </div>
            )}

            {/* Tab 3: Executed Code */}
            {activeTab === 'code' && (
              <div className="bg-slate-900 rounded-xl border border-slate-950 p-5 font-mono text-xs text-indigo-200 max-h-[400px] overflow-y-auto leading-relaxed">
                <pre>{selectedQuery.code}</pre>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
