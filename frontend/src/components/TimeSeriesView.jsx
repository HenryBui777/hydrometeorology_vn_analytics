import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useData } from '../context/DataContext';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { 
  Calendar, 
  MapPin, 
  Settings, 
  Search, 
  Check, 
  ChevronDown, 
  X,
  TrendingUp,
  CloudRain,
  Sun
} from 'lucide-react';

const METRICS = [
  { key: 'temp', label: 'Nhiệt độ TB (°C)', color: '#3B82F6' },
  { key: 'tempMax', label: 'Nhiệt độ tối đa (°C)', color: '#EF4444' },
  { key: 'tempMin', label: 'Nhiệt độ tối thiểu (°C)', color: '#60A5FA' },
  { key: 'rain', label: 'Lượng mưa (mm)', color: '#06B6D4' },
  { key: 'humidity', label: 'Độ ẩm (%)', color: '#10B981' },
  { key: 'wind', label: 'Tốc độ gió (km/h)', color: '#8B5CF6' },
  { key: 'sunshine', label: 'Số giờ nắng (h)', color: '#F59E0B' },
  { key: 'et0', label: 'Lượng bốc hơi ET₀ (mm)', color: '#EC4899' },
  { key: 'uvMax', label: 'Chỉ số UV lớn nhất', color: '#F97316' },
  { key: 'cloud', label: 'Độ phủ mây (%)', color: '#6B7280' },
  { key: 'pressure', label: 'Khí áp (hPa)', color: '#14B8A6' }
];

// Color palette for lines on the multi-line chart (12 distinctive colors)
const PALETTE = [
  '#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
  '#06B6D4', '#EC4899', '#F97316', '#14B8A6', '#4B5563',
  '#059669', '#D97706', '#DC2626', '#7C3AED', '#0891B2'
];

export default function TimeSeriesView() {
  const { rawRows, loading, error, fullStats } = useData();

  // Active configurations
  const [selectedProvinces, setSelectedProvinces] = useState(['Hà Nội', 'Huế', 'Hồ Chí Minh']);
  const [activeMetric, setActiveMetric] = useState('temp');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hiddenLines, setHiddenLines] = useState({});

  // Province dropdown UI state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  // Set default date range once data is loaded
  useEffect(() => {
    if (fullStats?.dateRange) {
      setStartDate(fullStats.dateRange.min);
      setEndDate(fullStats.dateRange.max);
    }
  }, [fullStats]);

  // Click outside listener for dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter provinces list by search input
  const filteredProvincesList = useMemo(() => {
    if (!fullStats?.provinces) return [];
    return fullStats.provinces.filter(p => 
      p.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [fullStats, searchTerm]);

  // Handle province selection toggle
  const toggleProvince = (province) => {
    setSelectedProvinces(prev => {
      if (prev.includes(province)) {
        // Keep at least one province selected
        if (prev.length <= 1) return prev;
        return prev.filter(p => p !== province);
      } else {
        return [...prev, province];
      }
    });
  };

  // Select all / Deselect all helper
  const handleSelectAll = (action) => {
    if (action === 'all' && fullStats?.provinces) {
      setSelectedProvinces([...fullStats.provinces]);
    } else if (action === 'none') {
      setSelectedProvinces(['Hà Nội']); // Fallback to first major
    }
  };

  // Get active metric label & base color
  const metricInfo = useMemo(() => {
    return METRICS.find(m => m.key === activeMetric) || METRICS[0];
  }, [activeMetric]);

  // Filtered rows for the selected date range and selected provinces
  const filteredRows = useMemo(() => {
    if (!rawRows.length) return [];
    return rawRows.filter(r => {
      const matchProvince = selectedProvinces.includes(r.province);
      const matchStart = startDate ? r.date >= startDate : true;
      const matchEnd = endDate ? r.date <= endDate : true;
      return matchProvince && matchStart && matchEnd;
    });
  }, [rawRows, selectedProvinces, startDate, endDate]);

  // 1. Pivot Data for Multi-Line Chart (Grouped by date)
  const lineChartData = useMemo(() => {
    if (!filteredRows.length) return [];

    const byDate = {};
    filteredRows.forEach(row => {
      const d = row.date;
      if (!byDate[d]) {
        byDate[d] = { date: d };
      }
      byDate[d][row.province] = row[activeMetric];
    });

    // Convert to sorted array
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredRows, activeMetric]);

  // 2. Weekly Aggregation Data for sub-charts (Precipitation & Sunshine)
  const weeklyData = useMemo(() => {
    if (!filteredRows.length) return [];

    // Group rows by week
    const byWeek = {};
    filteredRows.forEach(row => {
      const wk = row.week;
      if (!byWeek[wk]) {
        byWeek[wk] = { week: wk, rainSum: 0, sunshineSum: 0, count: 0 };
      }
      byWeek[wk].rainSum += row.rain;
      byWeek[wk].sunshineSum += row.sunshine;
      byWeek[wk].count += 1;
    });

    // Map to formatted objects, sorted by week index
    return Object.values(byWeek)
      .map(w => ({
        name: `Tuần ${w.week}`,
        'Lượng mưa (mm)': Math.round((w.rainSum / w.count) * 100) / 100,
        'Số giờ nắng (h)': Math.round((w.sunshineSum / w.count) * 100) / 100
      }))
      .sort((a, b) => {
        const numA = parseInt(a.name.replace('Tuần ', ''), 10);
        const numB = parseInt(b.name.replace('Tuần ', ''), 10);
        return numA - numB;
      });
  }, [filteredRows]);

  // Toggles lines visibility on legend click
  const handleLegendClick = (o) => {
    const { dataKey } = o;
    setHiddenLines(prev => ({
      ...prev,
      [dataKey]: !prev[dataKey]
    }));
  };

  // Quick stats calculations for summary card
  const summaryStats = useMemo(() => {
    if (!filteredRows.length) return { avg: 0, max: 0, min: 0 };
    const values = filteredRows.map(r => r[activeMetric]).filter(v => v !== null && !isNaN(v));
    if (!values.length) return { avg: 0, max: 0, min: 0 };

    const sum = values.reduce((s, v) => s + v, 0);
    const avg = Math.round((sum / values.length) * 100) / 100;
    const max = Math.round(Math.max(...values) * 100) / 100;
    const min = Math.round(Math.min(...values) * 100) / 100;

    return { avg, max, min };
  }, [filteredRows, activeMetric]);

  if (loading) return null; // Let App.jsx handle main loading
  if (error) return null;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      

      {/* Control Filter Bar */}
      <div className="glass-panel rounded-2xl p-5 bg-white border border-slate-200 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-5 items-end">
        
        {/* Province Multi-select Dropdown (Col Span 5) */}
        <div className="lg:col-span-5 space-y-1.5" ref={dropdownRef}>
          <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-brand-primary" /> Chọn tỉnh thành ({selectedProvinces.length})
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full bg-slate-50 hover:bg-slate-100/80 border border-slate-250 rounded-xl px-4 py-2.5 text-left text-xs font-bold text-slate-800 flex justify-between items-center transition-all shadow-sm cursor-pointer"
            >
              <span className="truncate max-w-[85%]">
                {selectedProvinces.length === fullStats?.provinces?.length 
                  ? 'Tất cả 34 tỉnh thành' 
                  : selectedProvinces.join(', ')
                }
              </span>
              <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
            </button>

            {isDropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-3 space-y-3 animate-fade-in max-h-96 flex flex-col">
                {/* Search field */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm nhanh tỉnh thành..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-brand-primary"
                  />
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Bulk Select Toggles */}
                <div className="flex gap-2 text-[10px] font-bold pb-1.5 border-b border-slate-100">
                  <button
                    onClick={() => handleSelectAll('all')}
                    className="px-2.5 py-1 rounded bg-blue-50 border border-blue-100 text-brand-primary hover:bg-blue-100 transition-colors"
                  >
                    Chọn tất cả
                  </button>
                  <button
                    onClick={() => handleSelectAll('none')}
                    className="px-2.5 py-1 rounded bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors"
                  >
                    Bỏ chọn hết
                  </button>
                </div>

                {/* Scrollable list */}
                <div className="flex-1 overflow-y-auto space-y-0.5 max-h-60 pr-1">
                  {filteredProvincesList.map(prov => {
                    const isSelected = selectedProvinces.includes(prov);
                    return (
                      <button
                        key={prov}
                        onClick={() => toggleProvince(prov)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs font-semibold transition-all hover:bg-slate-50 ${
                          isSelected ? 'bg-blue-50/50 text-brand-primary font-bold' : 'text-slate-700'
                        }`}
                      >
                        <span>{prov}</span>
                        {isSelected && <Check className="h-4 w-4 text-brand-primary" />}
                      </button>
                    );
                  })}
                  {filteredProvincesList.length === 0 && (
                    <p className="text-center text-xs text-slate-400 py-3">Không tìm thấy tỉnh nào</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Metric Selector (Col Span 4) */}
        <div className="lg:col-span-4 space-y-1.5">
          <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
            <Settings className="h-3.5 w-3.5 text-brand-accent" /> Chọn biến khí hậu
          </label>
          <select
            value={activeMetric}
            onChange={(e) => {
              setActiveMetric(e.target.value);
              setHiddenLines({}); // Reset hidden logic on metric change
            }}
            className="w-full bg-slate-50 border border-slate-250 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 shadow-sm outline-none focus:border-brand-primary"
          >
            {METRICS.map(m => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* Date Ranges (Col Span 3) */}
        <div className="lg:col-span-3 space-y-1.5">
          <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-emerald-500" /> Khoảng thời gian
          </label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              min={fullStats?.dateRange?.min}
              max={fullStats?.dateRange?.max}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-1/2 bg-slate-50 border border-slate-250 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 shadow-sm focus:border-brand-primary"
            />
            <span className="text-slate-400 text-xs font-semibold">đến</span>
            <input
              type="date"
              value={endDate}
              min={fullStats?.dateRange?.min}
              max={fullStats?.dateRange?.max}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-1/2 bg-slate-50 border border-slate-250 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 shadow-sm focus:border-brand-primary"
            />
          </div>
        </div>

      </div>

      {/* Main Plot Area & Stat Summary Cards */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

        {/* Line Plot (Col Span 3) */}
        <div className="xl:col-span-3 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
          <div className="flex justify-between items-center flex-wrap gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Biểu đồ diễn biến thời gian liên tục</h3>
              <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                Rê chuột lên điểm nút để xem chi tiết. Click vào chú giải (Legend) để ẩn/hiện đường dữ liệu của tỉnh thành.
              </p>
            </div>
            <span className="text-[10px] bg-blue-50 border border-blue-100 text-brand-primary font-extrabold px-3 py-1 rounded-full uppercase">
              {metricInfo.label}
            </span>
          </div>

          <div style={{ height: '400px' }}>
            {lineChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineChartData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#70859c" 
                    tick={{ fontSize: 9, fontWeight: 600 }}
                  />
                  <YAxis 
                    stroke="#70859c"
                    tick={{ fontSize: 9, fontWeight: 600 }}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a', fontSize: '11px', fontWeight: 600 }} 
                  />
                  <Legend 
                    onClick={handleLegendClick}
                    wrapperStyle={{ fontSize: '11px', fontWeight: 600, paddingTop: '10px', cursor: 'pointer' }}
                  />
                  {selectedProvinces.map((prov, index) => {
                    const color = PALETTE[index % PALETTE.length];
                    const isHidden = !!hiddenLines[prov];
                    return (
                      <Line
                        key={prov}
                        type="monotone"
                        dataKey={prov}
                        name={prov}
                        stroke={color}
                        strokeWidth={2.5}
                        dot={false}
                        hide={isHidden}
                        activeDot={{ r: 5 }}
                        connectNulls
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                <Search className="h-8 w-8 opacity-40 animate-pulse" />
                <p className="text-xs font-semibold">Không tìm thấy bản ghi dữ liệu nào thỏa mãn khoảng ngày đã lọc</p>
              </div>
            )}
          </div>
        </div>

        {/* Statistics Summary side card (Col Span 1) */}
        <div className="xl:col-span-1 flex flex-col justify-between gap-6">
          
          {/* Main Stat summary */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 flex-1">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
              Chỉ số tóm tắt khoảng lọc
            </h3>
            
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase">Trung bình (Average)</span>
                <p className="text-2xl font-extrabold text-slate-800 font-mono">
                  {summaryStats.avg} <span className="text-xs font-bold text-slate-500">{activeMetric === 'temp' || activeMetric === 'tempMax' || activeMetric === 'tempMin' ? '°C' : activeMetric === 'rain' || activeMetric === 'et0' ? 'mm' : activeMetric === 'humidity' || activeMetric === 'cloud' ? '%' : activeMetric === 'wind' ? 'km/h' : activeMetric === 'sunshine' ? 'h' : ''}</span>
                </p>
              </div>

              <div className="p-3.5 bg-red-50/40 border border-red-100 rounded-xl space-y-1">
                <span className="text-[10px] text-red-500/70 font-extrabold uppercase">Cực đại lớn nhất (Max)</span>
                <p className="text-xl font-extrabold text-red-600 font-mono">
                  {summaryStats.max} <span className="text-xs font-bold text-red-400">{activeMetric === 'temp' || activeMetric === 'tempMax' || activeMetric === 'tempMin' ? '°C' : activeMetric === 'rain' || activeMetric === 'et0' ? 'mm' : activeMetric === 'humidity' || activeMetric === 'cloud' ? '%' : activeMetric === 'wind' ? 'km/h' : activeMetric === 'sunshine' ? 'h' : ''}</span>
                </p>
              </div>

              <div className="p-3.5 bg-blue-50/40 border border-blue-100 rounded-xl space-y-1">
                <span className="text-[10px] text-blue-500/70 font-extrabold uppercase">Cực tiểu thấp nhất (Min)</span>
                <p className="text-xl font-extrabold text-blue-600 font-mono">
                  {summaryStats.min} <span className="text-xs font-bold text-blue-400">{activeMetric === 'temp' || activeMetric === 'tempMax' || activeMetric === 'tempMin' ? '°C' : activeMetric === 'rain' || activeMetric === 'et0' ? 'mm' : activeMetric === 'humidity' || activeMetric === 'cloud' ? '%' : activeMetric === 'wind' ? 'km/h' : activeMetric === 'sunshine' ? 'h' : ''}</span>
                </p>
              </div>
            </div>
            
            <div className="text-[10px] text-slate-400 font-semibold leading-relaxed pt-2 border-t border-slate-100">
              Tính toán dựa trên <span className="text-slate-700 font-bold font-mono">{filteredRows.length} bản ghi</span> của {selectedProvinces.length} tỉnh thành từ {startDate} tới {endDate}.
            </div>
          </div>
          
        </div>

      </div>

      {/* Weekly Aggregated Trends Sub-charts (Row of 2 charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Weekly Precipitation Area chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <div className="p-1.5 rounded-lg bg-cyan-50 border border-cyan-100">
              <CloudRain className="h-4 w-4 text-cyan-600" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Lượng mưa trung bình theo tuần</h3>
              <p className="text-[10px] text-slate-400 font-semibold">Tính theo chỉ số trung bình tuần của các tỉnh đã chọn</p>
            </div>
          </div>

          <div className="h-72">
            {weeklyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rainGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                  <XAxis dataKey="name" stroke="#70859c" tick={{ fontSize: 9, fontWeight: 600 }} />
                  <YAxis stroke="#70859c" tick={{ fontSize: 9, fontWeight: 600 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '11px' }} />
                  <Area 
                    type="monotone" 
                    dataKey="Lượng mưa (mm)" 
                    stroke="#06B6D4" 
                    strokeWidth={2.5}
                    fillOpacity={1} 
                    fill="url(#rainGrad)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-xs font-semibold">Không đủ dữ liệu</div>
            )}
          </div>
        </div>

        {/* Weekly Sunshine Bar chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <div className="p-1.5 rounded-lg bg-amber-50 border border-amber-100">
              <Sun className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Số giờ nắng trung bình theo tuần</h3>
              <p className="text-[10px] text-slate-400 font-semibold">Tính theo chỉ số trung bình tuần của các tỉnh đã chọn</p>
            </div>
          </div>

          <div className="h-72">
            {weeklyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                  <XAxis dataKey="name" stroke="#70859c" tick={{ fontSize: 9, fontWeight: 600 }} />
                  <YAxis stroke="#70859c" tick={{ fontSize: 9, fontWeight: 600 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '11px' }} />
                  <Bar 
                    dataKey="Số giờ nắng (h)" 
                    fill="#F59E0B" 
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-xs font-semibold">Không đủ dữ liệu</div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
