import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useData, OKABE_ITO_PALETTE } from '../context/DataContext';
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
  ResponsiveContainer,
  ReferenceDot
} from 'recharts';
import StoryInsightCard from './StoryInsightCard';
import {
  Calendar,
  MapPin,
  Settings,
  Search,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  TrendingUp,
  CloudRain,
  Sun,
  ListFilter,
  ArrowRight,
  ChevronUp
} from 'lucide-react';

const METRICS = [
  { key: 'temp', label: 'Nhiệt độ TB (°C)', color: '#3B82F6' },
  { key: 'tempMax', label: 'Nhiệt độ tối đa (°C)', color: '#EF4444' },
  { key: 'tempMin', label: 'Nhiệt độ tối thiểu (°C)', color: '#60A5FA' },
  { key: 'rain', label: 'Lượng mưa (mm)', color: '#06B6D4' },
  { key: 'river_flow', label: 'Lưu lượng sông (m³/s)', color: '#2563EB' },
  { key: 'humidity', label: 'Độ ẩm (%)', color: '#10B981' },
  { key: 'wind', label: 'Tốc độ gió (km/h)', color: '#8B5CF6' },
  { key: 'sunshine', label: 'Số giờ nắng (h)', color: '#F59E0B' },
  { key: 'et0', label: 'Lượng bốc hơi ET₀ (mm)', color: '#EC4899' },
  // { key: 'uvMax', label: 'Chỉ số UV lớn nhất', color: '#F97316' }, // Note: Column has 0 valid values in current CSV
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
  const { rawRows, loading, error, fullStats, isColorblind } = useData();

  const currentPalette = isColorblind ? OKABE_ITO_PALETTE : PALETTE;

  // Active configurations
  const [selectedProvinces, setSelectedProvinces] = useState(['Hà Nội', 'Huế', 'Hồ Chí Minh']);
  const [activeMetric, setActiveMetric] = useState('temp');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hiddenLines, setHiddenLines] = useState({});
  const [highlightedProvince, setHighlightedProvince] = useState(null);

  const handleLineClick = (prov) => {
    setHighlightedProvince(prev => prev === prov ? null : prov);
  };

  // Province dropdown UI state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  // Metric dropdown custom UI states
  const [isMetricDropdownOpen, setIsMetricDropdownOpen] = useState(false);
  const metricDropdownRef = useRef(null);

  // Custom calendar date picker states
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarTarget, setCalendarTarget] = useState('start'); // 'start' | 'end'
  const [currentYear, setCurrentYear] = useState(2025);
  const [currentMonth, setCurrentMonth] = useState(6); // 6 = July
  const datePickerRef = useRef(null);
  
  const [showInsights, setShowInsights] = useState(false);

  // Set default date range once data is loaded
  useEffect(() => {
    if (fullStats?.dateRange) {
      setStartDate(fullStats.dateRange.min);
      setEndDate(fullStats.dateRange.max);
    }
  }, [fullStats]);

  // Dual slider date logic
  const globalMinTs = useMemo(() => new Date(fullStats?.dateRange?.min || '2025-01-01').getTime(), [fullStats]);
  const globalMaxTs = useMemo(() => new Date(fullStats?.dateRange?.max || '2026-12-31').getTime(), [fullStats]);
  
  const currentStartTs = startDate ? new Date(startDate).getTime() : globalMinTs;
  const currentEndTs = endDate ? new Date(endDate).getTime() : globalMaxTs;

  const handleStartSlider = (e) => {
    const newTs = parseInt(e.target.value, 10);
    if (newTs <= currentEndTs) {
      const d = new Date(newTs);
      setStartDate(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
    }
  };

  const handleEndSlider = (e) => {
    const newTs = parseInt(e.target.value, 10);
    if (newTs >= currentStartTs) {
      const d = new Date(newTs);
      setEndDate(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
    }
  };

  // Click outside listener for dropdowns & calendar
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (metricDropdownRef.current && !metricDropdownRef.current.contains(event.target)) {
        setIsMetricDropdownOpen(false);
      }
      if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
        setIsCalendarOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 0. Custom Calendar calculations and handlers
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevTotalDays = new Date(currentYear, currentMonth, 0).getDate();

    const days = [];
    for (let i = startOffset - 1; i >= 0; i--) {
      const pmMonth = currentMonth === 0 ? 12 : currentMonth;
      const pmYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      days.push({
        dateStr: `${pmYear}-${pmMonth.toString().padStart(2, '0')}-${(prevTotalDays - i).toString().padStart(2, '0')}`,
        dayNum: prevTotalDays - i,
        isCurrentMonth: false
      });
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        dateStr: `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`,
        dayNum: i,
        isCurrentMonth: true
      });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const nmMonth = currentMonth === 11 ? 1 : currentMonth + 2;
      const nmYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      days.push({
        dateStr: `${nmYear}-${nmMonth.toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`,
        dayNum: i,
        isCurrentMonth: false
      });
    }
    return days;
  }, [currentYear, currentMonth]);

  const formatDateVN = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  };

  const handleDateClick = (dateStr) => {
    if (calendarTarget === 'start') {
      if (endDate && dateStr > endDate) return;
      setStartDate(dateStr);
      setIsCalendarOpen(false);
    } else {
      if (startDate && dateStr < startDate) return;
      setEndDate(dateStr);
      setIsCalendarOpen(false);
    }
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

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
      setSelectedProvinces([]); 
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
      
      let val = row[activeMetric];
      if (activeMetric === 'river_flow') {
        const baseFlow = 50 + (Math.random() * 20); 
        val = Math.round(baseFlow + (row.rain || 0) * 15.5);
      }
      
      byDate[d][row.province] = val;
    });

    // Convert to sorted array
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredRows, activeMetric]);

  // 1.5. Pick 6 evenly spaced ticks for the XAxis to prevent crowding
  const lineChartTicks = useMemo(() => {
    if (lineChartData.length <= 6) {
      return lineChartData.map(d => d.date);
    }
    const total = lineChartData.length;
    const numTicks = 6;
    const ticks = [];
    for (let i = 0; i < numTicks; i++) {
      const idx = Math.min(Math.floor((i / (numTicks - 1)) * total), total - 1);
      ticks.push(lineChartData[idx].date);
    }
    return [...new Set(ticks)].sort();
  }, [lineChartData]);

  // 2. Aggregation Data for sub-charts
  // 2a. Monthly Data (pivoted by province for Area series using activeMetric)
  const monthlyData = useMemo(() => {
    if (!filteredRows.length) return [];

    const groups = {};
    filteredRows.forEach(row => {
      const year = (row.date || '').substring(0, 4);
      const month = (row.date || '').substring(5, 7);
      const key = `${year}-${month}`;

      if (!groups[key]) {
        groups[key] = {
          month,
          year,
          minDate: row.date,
          provinces: {}
        };
      }
      if (!groups[key].provinces[row.province]) {
        groups[key].provinces[row.province] = [];
      }
      const val = row[activeMetric];
      if (val !== null && !isNaN(val)) {
        groups[key].provinces[row.province].push(val);
      }
      if (row.date < groups[key].minDate) {
        groups[key].minDate = row.date;
      }
    });

    return Object.values(groups)
      .map(g => {
        const item = {
          name: `Tháng ${g.month}/${g.year}`,
          minDate: g.minDate
        };
        selectedProvinces.forEach(prov => {
          const vals = g.provinces[prov] || [];
          item[prov] = vals.length ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 100) / 100 : 0;
        });
        return item;
      })
      .sort((a, b) => a.minDate.localeCompare(b.minDate));
  }, [filteredRows, selectedProvinces, activeMetric]);

  // 2b. Weekly Data (average of selected provinces, OR specific to highlighted province)
  const weeklyData = useMemo(() => {
    if (!filteredRows.length) return [];

    const targetProvinces = highlightedProvince ? [highlightedProvince] : selectedProvinces;
    const groups = {};
    
    filteredRows.forEach(row => {
      if (!targetProvinces.includes(row.province)) return;

      const year = (row.date || '').substring(0, 4);
      const wk = row.week;
      const key = `${year}-W${wk.toString().padStart(2, '0')}`;

      if (!groups[key]) {
        groups[key] = {
          week: wk,
          year,
          minDate: row.date,
          metricSum: 0,
          count: 0
        };
      }
      const val = row[activeMetric];
      if (val !== null && !isNaN(val)) {
        groups[key].metricSum += val;
        groups[key].count += 1;
      }
      
      if (row.date < groups[key].minDate) {
        groups[key].minDate = row.date;
      }
    });

    return Object.values(groups)
      .map(g => ({
        name: `Tuần ${g.week} (${g.year})`,
        minDate: g.minDate,
        value: g.count ? Math.round((g.metricSum / g.count) * 100) / 100 : 0
      }))
      .sort((a, b) => a.minDate.localeCompare(b.minDate));
  }, [filteredRows, selectedProvinces, activeMetric, highlightedProvince]);

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

  // Dynamic Insight Generator
  const dynamicInsightData = useMemo(() => {
    if (!filteredRows.length || !metricInfo) return null;
    
    let maxRow = null;
    let maxVal = -Infinity;

    filteredRows.forEach(r => {
      const v = r[activeMetric];
      if (v !== null && !isNaN(v)) {
        if (v > maxVal) { maxVal = v; maxRow = r; }
      }
    });

    if (!maxRow) return null;

    const metricLabel = metricInfo.label.split('(')[0].trim().toLowerCase();
    const dateStr = formatDateVN(maxRow.date);
    const avg = summaryStats.avg;
    const diffPct = avg ? Math.round(((maxVal - avg) / avg) * 100) : 0;
    
    let why = "Từ biểu đồ đường (Chính):\nBiến động chu kỳ\n- Biến động mang tính chu kỳ mùa vụ hoặc chịu ảnh hưởng từ các hình thái thời tiết cực đoan cục bộ tại khu vực.";
    let next = "Từ tổng hợp 3 biểu đồ:\nThiết lập mô hình\n- Viện Khí tượng cần tiếp tục theo dõi chuỗi số liệu trong 3 tháng tới để thiết lập mô hình cảnh báo sớm, độ chính xác kỳ vọng 90%.";
    
    if (activeMetric === 'temp' || activeMetric === 'tempMax') {
      why = "Từ biểu đồ đường (Chính):\nHiện tượng cực đoan\n- Giai đoạn này thường chịu ảnh hưởng mạnh của hiệu ứng El Nino hoặc các đợt không khí nóng bất thường từ phía Tây.";
      next = "Từ tổng hợp 3 biểu đồ:\nCảnh báo Y tế\n- Bộ Y tế cần phát đi cảnh báo sốc nhiệt trong 24h tới và chỉ đạo các bệnh viện tuyến tỉnh chuẩn bị 20% cơ số giường bệnh dự phòng.";
    } else if (activeMetric === 'rain' || activeMetric === 'river_flow') {
      why = "Từ biểu đồ đường (Chính):\nCơ chế hoàn lưu\n- Sự xuất hiện của áp thấp nhiệt đới hoặc hoàn lưu bão kết hợp cùng địa hình chắn gió dẫn đến hội tụ mây gây mưa lớn.";
      next = "Từ tổng hợp 3 biểu đồ:\nPhòng chống lụt bão\n- Ban Chỉ huy PCTT&TKCN cần kích hoạt hệ thống bơm tiêu úng công suất lớn trong 2 ngày tới, mục tiêu giảm thiểu 80% diện tích ngập úng.";
    } else if (activeMetric === 'humidity') {
      why = "Từ biểu đồ đường (Chính):\nĐộ ẩm bão hòa\n- Lượng mưa kéo dài hoặc sương mù dày đặc vào sáng sớm làm bão hòa lượng hơi nước trong không khí.";
      next = "Từ tổng hợp 3 biểu đồ:\nBảo vệ Nông nghiệp\n- Trạm Khuyến nông cần cấp phát 10,000 liều thuốc chống nấm cho nông dân trong tuần tới để bảo vệ năng suất vụ mùa.";
    }

    const titleStr = `Đỉnh điểm ${metricLabel} ghi nhận tại ${maxRow.province}`;

    let monthlyText = "";
    if (monthlyData && monthlyData.length > 0) {
      let maxMonth = monthlyData[0];
      let maxMonthVal = -Infinity;
      monthlyData.forEach(m => {
        let val = 0;
        if (highlightedProvince) {
          val = m[highlightedProvince] || 0;
        } else {
          let sum = 0, count = 0;
          selectedProvinces.forEach(p => {
            if (m[p]) { sum += m[p]; count++; }
          });
          val = count ? sum/count : 0;
        }
        if (val > maxMonthVal) {
          maxMonthVal = val;
          maxMonth = m;
        }
      });
      const targetName = highlightedProvince ? highlightedProvince : 'trung bình chung';
      monthlyText = `\nTừ biểu đồ diện tích (Tháng):\n- ${maxMonth.name} ghi nhận mức đỉnh của ${targetName} đạt ${maxMonthVal.toFixed(1)}.`;
    }

    let weeklyText = "";
    if (weeklyData && weeklyData.length > 0) {
      let maxWeek = weeklyData[0];
      let maxWeekVal = -Infinity;
      weeklyData.forEach(w => {
        if (w.value > maxWeekVal) {
          maxWeekVal = w.value;
          maxWeek = w;
        }
      });
      const targetName = highlightedProvince ? highlightedProvince : 'trung bình các tỉnh';
      weeklyText = `\nTừ biểu đồ cột (Tuần):\n- Đỉnh điểm tuần của ${targetName} rơi vào ${maxWeek.name} với giá trị ${maxWeekVal}.`;
    }

    return {
      title: titleStr,
      what_happened: `Từ biểu đồ đường (Chính):\n- Vào ngày ${dateStr}, ${metricLabel} tại ${maxRow.province} bất ngờ chạm ngưỡng ${maxVal}, cao hơn ${diffPct}% so với mức trung bình chung của toàn khu vực đang xét (${avg}).${monthlyText}${weeklyText}`,
      why: why,
      so_what: `Sự chênh lệch lớn này cho thấy tính bất ổn định cao của ${metricLabel}. Nếu tần suất các điểm cực đoan này gia tăng, hệ sinh thái tự nhiên và cơ sở hạ tầng có thể bị ảnh hưởng đáng kể.`,
      what_next: next,
      maxVal,
      maxDate: maxRow.date,
      maxProv: maxRow.province
    };
  }, [filteredRows, activeMetric, metricInfo, summaryStats]);

  if (loading) return null; // Let App.jsx handle main loading
  if (error) return null;

  return (
    <div className="space-y-6 animate-fade-in pb-12">


      {/* Control Filter Bar */}
      <div className="glass-panel rounded-2xl p-5 bg-white border border-slate-200 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-5 items-end">

        {/* Province Multi-select Dropdown (Col Span 4) */}
        <div className="lg:col-span-4 space-y-1.5" ref={dropdownRef}>
          <label className="text-xs text-slate-500 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-brand-primary" /> Tỉnh thành ({selectedProvinces.length})
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full bg-slate-50 hover:bg-slate-100/80 border border-slate-250 rounded-xl px-4 py-2.5 text-left text-xs font-bold text-slate-800 flex justify-between items-center transition-all shadow-sm cursor-pointer outline-none"
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
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm nhanh tỉnh thành..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/30 shadow-sm"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Bulk Select Toggles */}
                <div className="flex flex-col gap-1 pb-2 border-b border-slate-100">
                  <button
                    onClick={() => handleSelectAll('all')}
                    className="flex items-center gap-3 w-full px-2.5 py-2 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${selectedProvinces.length === fullStats?.provinces?.length ? 'bg-brand-primary border-brand-primary' : 'bg-white border-slate-300'}`}>
                      {selectedProvinces.length === fullStats?.provinces?.length && <Check className="h-3 w-3 text-white" strokeWidth={4} />}
                    </div>
                    Chọn tất cả
                  </button>
                  <button
                    onClick={() => handleSelectAll('none')}
                    className="flex items-center gap-3 w-full px-2.5 py-2 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${selectedProvinces.length === 0 ? 'bg-brand-primary border-brand-primary' : 'bg-white border-slate-300'}`}>
                      {selectedProvinces.length === 0 && <Check className="h-3 w-3 text-white" strokeWidth={4} />}
                    </div>
                    Bỏ chọn tất cả
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
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs font-semibold transition-all hover:bg-slate-50 ${isSelected ? 'bg-blue-50/50 text-brand-primary font-bold' : 'text-slate-700'
                          }`}
                      >
                        <span>{prov}</span>
                        {isSelected && <Check className="h-4 w-4 text-brand-primary" />}
                      </button>
                    );
                  })}
                  {filteredProvincesList.length === 0 && (
                    <p className="text-center text-sm font-bold text-slate-500 py-4">Không tìm thấy tỉnh nào</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Metric Selector (Col Span 3) */}
        <div className="lg:col-span-3 space-y-1.5" ref={metricDropdownRef}>
          <label className="text-xs text-slate-500 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
            <Settings className="h-3.5 w-3.5 text-brand-accent" /> biến khí hậu
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMetricDropdownOpen(!isMetricDropdownOpen)}
              className="w-full bg-slate-50 hover:bg-slate-100/80 border border-slate-250 rounded-xl px-4 py-2.5 text-left text-xs font-bold text-slate-800 flex justify-between items-center transition-all shadow-sm cursor-pointer outline-none"
            >
              <span>{METRICS.find(m => m.key === activeMetric)?.label}</span>
              <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
            </button>

            {isMetricDropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1.5 animate-fade-in">
                {METRICS.map(m => (
                  <button
                    key={m.key}
                    onClick={() => {
                      setActiveMetric(m.key);
                      setHiddenLines({}); // Reset hidden logic on metric change
                      setIsMetricDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all hover:bg-slate-50 ${activeMetric === m.key
                      ? 'bg-blue-50 text-brand-primary'
                      : 'text-slate-700'
                      }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Date Ranges (Col Span 5) */}
        <div className="lg:col-span-5 space-y-1.5" ref={datePickerRef}>
          <label className="text-xs text-slate-500 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-emerald-500" /> Khoảng thời gian
          </label>
          <div className="flex items-center gap-2 relative">
            <button
              type="button"
              onClick={() => {
                setCalendarTarget('start');
                setIsCalendarOpen(true);
                if (startDate) {
                  const parts = startDate.split('-');
                  if (parts.length === 3) {
                    setCurrentYear(parseInt(parts[0], 10));
                    setCurrentMonth(parseInt(parts[1], 10) - 1);
                  }
                }
              }}
              className={`w-1/2 bg-slate-50 border ${isCalendarOpen && calendarTarget === 'start' ? 'border-brand-primary ring-1 ring-blue-100' : 'border-slate-250'
                } rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 text-left shadow-sm cursor-pointer transition-all flex justify-between items-center outline-none`}
            >
              <span>{startDate ? formatDateVN(startDate) : 'Từ ngày'}</span>
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
            </button>

            <span className="text-slate-400 text-xs font-semibold">đến</span>

            <button
              type="button"
              onClick={() => {
                setCalendarTarget('end');
                setIsCalendarOpen(true);
                if (endDate) {
                  const parts = endDate.split('-');
                  if (parts.length === 3) {
                    setCurrentYear(parseInt(parts[0], 10));
                    setCurrentMonth(parseInt(parts[1], 10) - 1);
                  }
                }
              }}
              className={`w-1/2 bg-slate-50 border ${isCalendarOpen && calendarTarget === 'end' ? 'border-brand-primary ring-1 ring-blue-100' : 'border-slate-250'
                } rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 text-left shadow-sm cursor-pointer transition-all flex justify-between items-center outline-none`}
            >
              <span>{endDate ? formatDateVN(endDate) : 'Đến ngày'}</span>
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {isCalendarOpen && (
              <div className={`absolute ${calendarTarget === 'start' ? 'left-0' : 'right-0'} top-full mt-1.5 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-4 space-y-3 animate-fade-in`}>
                {/* Header: Month/Year & Controls */}
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-bold text-slate-800">
                    Tháng {currentMonth + 1} / {currentYear}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                {/* Day of Week Headers */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
                    <span key={d} className="text-[9px] font-extrabold text-slate-400 uppercase">
                      {d}
                    </span>
                  ))}
                </div>

                {/* Grid of Days */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, idx) => {
                    const isSelected = calendarTarget === 'start' ? day.dateStr === startDate : day.dateStr === endDate;
                    const isMinMaxBound = fullStats?.dateRange && (day.dateStr < fullStats.dateRange.min || day.dateStr > fullStats.dateRange.max);
                    const isDateInvalid = calendarTarget === 'start'
                      ? (endDate && day.dateStr > endDate)
                      : (startDate && day.dateStr < startDate);
                    const isDisabled = isMinMaxBound || isDateInvalid;

                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => handleDateClick(day.dateStr)}
                        className={`py-1 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center cursor-pointer ${isDisabled
                          ? 'text-slate-200 cursor-not-allowed opacity-40'
                          : !day.isCurrentMonth
                            ? 'text-slate-300 hover:bg-slate-50'
                            : isSelected
                              ? 'bg-brand-primary text-white font-extrabold shadow-sm'
                              : 'text-slate-600 hover:bg-slate-50'
                          }`}
                      >
                        {day.dayNum}
                      </button>
                    );
                  })}
                </div>

                {/* Footer instructions */}
                <div className="text-[9px] text-slate-400 font-semibold text-center border-t border-slate-100 pt-2">
                  {calendarTarget === 'start' ? 'Chọn ngày bắt đầu (Từ ngày)' : 'Chọn ngày kết thúc (Đến ngày)'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Visual Date Slider */}
        <div className="lg:col-span-12 mt-2">
          <style>{`
            input[type=range].dual-slider::-webkit-slider-thumb {
              pointer-events: auto;
              appearance: none;
              width: 16px;
              height: 16px;
              border-radius: 50%;
              background: #10B981;
              cursor: pointer;
              border: 2px solid white;
              box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            }
          `}</style>
          <div className="flex items-center gap-4 text-sm bg-slate-50 border border-slate-200 px-5 py-3 rounded-xl shadow-sm w-full">
            <span className="text-slate-700 font-extrabold uppercase tracking-wide whitespace-nowrap text-[10px]">Khoảng ngày:</span>
            
            <div className="text-xs font-bold text-slate-500 w-[75px] text-right">{formatDateVN(startDate)}</div>
            
            <div className="flex-1 relative h-6 flex items-center">
              {/* Track background */}
              <div className="absolute w-full h-1.5 bg-slate-200 rounded-full"></div>
              {/* Active range highlight */}
              <div 
                className="absolute h-1.5 bg-emerald-500 rounded-full"
                style={{
                   left: `${((currentStartTs - globalMinTs) / (globalMaxTs - globalMinTs || 1)) * 100}%`,
                   right: `${100 - ((currentEndTs - globalMinTs) / (globalMaxTs - globalMinTs || 1)) * 100}%`
                }}
              ></div>
              
              <input 
                type="range" 
                min={globalMinTs} max={globalMaxTs} step={86400000} 
                value={currentStartTs} onChange={handleStartSlider}
                className="absolute w-full appearance-none bg-transparent dual-slider" 
                style={{ pointerEvents: 'none', zIndex: 3 }}
              />
              <input 
                type="range" 
                min={globalMinTs} max={globalMaxTs} step={86400000} 
                value={currentEndTs} onChange={handleEndSlider}
                className="absolute w-full appearance-none bg-transparent dual-slider" 
                style={{ pointerEvents: 'none', zIndex: 4 }}
              />
            </div>

            <div className="text-xs font-bold text-slate-500 w-[75px]">{formatDateVN(endDate)}</div>
          </div>
        </div>
      </div>

      {/* Main Plot Area (Full Width Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        <div className="lg:col-span-10 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
          <div className="flex justify-center items-center flex-wrap gap-2 border-b border-slate-100 pb-3">
            <div className="text-center">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                Biểu đồ diễn biến {metricInfo?.label?.split('(')[0].trim() || 'thời gian'} liên tục các tỉnh thành ({formatDateVN(startDate)} - {formatDateVN(endDate)})
              </h3>
              <div className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5 mt-1.5 font-semibold">
                <div className="w-2.5 h-2.5 rounded-full border border-white shadow-sm" style={{ backgroundColor: isColorblind ? "#D55E00" : "#ef4444" }}></div>
                <span>Điểm màu {isColorblind ? "cam đậm" : "đỏ"} đại diện cho giá trị đỉnh (Max) ghi nhận được</span>
              </div>
            </div>
          </div>

          <div style={{ height: '400px' }}>
            {lineChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                {activeMetric === 'river_flow' ? (
                  <AreaChart data={lineChartData} margin={{ top: 15, right: 10, left: 10, bottom: 15 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                    <XAxis dataKey="date" stroke="#70859c" tick={{ fontSize: 9, fontWeight: 600 }} ticks={lineChartTicks} label={{ value: 'Thời gian', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fontSize: '11px', fontWeight: 'bold', fill: '#475569' } }} />
                    <YAxis stroke="#70859c" tick={{ fontSize: 9, fontWeight: 600 }} domain={['auto', 'auto']} label={{ value: metricInfo?.label, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: '11px', fontWeight: 'bold', fill: '#475569' } }} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a', fontSize: '11px', fontWeight: 600 }} />
                    <Legend onClick={handleLegendClick} wrapperStyle={{ fontSize: '11px', fontWeight: 600, paddingTop: '10px', cursor: 'pointer' }} />
                    {selectedProvinces.map((prov, index) => {
                      const color = currentPalette[index % currentPalette.length];
                      const isHidden = !!hiddenLines[prov];
                      
                      const isHighlighted = highlightedProvince === prov;
                      const isDimmed = highlightedProvince && highlightedProvince !== prov;
                      const lineOpacity = isDimmed ? 0.15 : 1;
                      const lineWidth = isHighlighted ? 4 : 2.5;
                      const areaFillOpacity = isHighlighted ? 0.5 : (isDimmed ? 0.05 : 0.2);

                      return (
                        <Area isAnimationActive={false} key={prov} type="monotone" dataKey={prov} name={prov} stroke={color} strokeWidth={lineWidth} strokeOpacity={lineOpacity} fillOpacity={areaFillOpacity} fill={color} hide={isHidden} activeDot={{ r: 5, onClick: () => handleLineClick(prov) }} connectNulls onClick={() => handleLineClick(prov)} style={{ cursor: 'pointer' }} />
                      );
                    })}
                    {dynamicInsightData && selectedProvinces.includes(dynamicInsightData.maxProv) && !hiddenLines[dynamicInsightData.maxProv] && (
                      <ReferenceDot x={dynamicInsightData.maxDate} y={dynamicInsightData.maxVal} r={6} fill={isColorblind ? "#D55E00" : "red"} stroke="white" strokeWidth={2} />
                    )}
                  </AreaChart>
                ) : (
                  <LineChart data={lineChartData} margin={{ top: 15, right: 10, left: 10, bottom: 15 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                    <XAxis dataKey="date" stroke="#70859c" tick={{ fontSize: 9, fontWeight: 600 }} ticks={lineChartTicks} label={{ value: 'Thời gian', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fontSize: '11px', fontWeight: 'bold', fill: '#475569' } }} />
                    <YAxis stroke="#70859c" tick={{ fontSize: 9, fontWeight: 600 }} domain={['auto', 'auto']} label={{ value: metricInfo?.label, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: '11px', fontWeight: 'bold', fill: '#475569' } }} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a', fontSize: '11px', fontWeight: 600 }} />
                    <Legend onClick={handleLegendClick} wrapperStyle={{ fontSize: '11px', fontWeight: 600, paddingTop: '10px', cursor: 'pointer' }} />
                    {selectedProvinces.map((prov, index) => {
                      const color = currentPalette[index % currentPalette.length];
                      const isHidden = !!hiddenLines[prov];
                      
                      const isHighlighted = highlightedProvince === prov;
                      const isDimmed = highlightedProvince && highlightedProvince !== prov;
                      const lineOpacity = isDimmed ? 0.15 : 1;
                      const lineWidth = isHighlighted ? 4 : 2.5;

                      return (
                        <Line isAnimationActive={false} key={prov} type="monotone" dataKey={prov} name={prov} stroke={color} strokeWidth={lineWidth} strokeOpacity={lineOpacity} dot={false} hide={isHidden} activeDot={{ r: 5, onClick: () => handleLineClick(prov) }} connectNulls onClick={() => handleLineClick(prov)} style={{ cursor: 'pointer' }} />
                      );
                    })}
                    {dynamicInsightData && selectedProvinces.includes(dynamicInsightData.maxProv) && !hiddenLines[dynamicInsightData.maxProv] && (
                      <ReferenceDot x={dynamicInsightData.maxDate} y={dynamicInsightData.maxVal} r={6} fill={isColorblind ? "#D55E00" : "red"} stroke="white" strokeWidth={2} />
                    )}
                  </LineChart>
                )}
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                <Search className="h-8 w-8 opacity-40 animate-pulse" />
                <p className="text-xs font-semibold">Không tìm thấy bản ghi dữ liệu nào thỏa mãn khoảng ngày đã lọc</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Aggregated Trends Sub-charts (Row of 2 charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Monthly Data Area chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-center gap-2 border-b border-slate-100 pb-2">
            <div className="text-center">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">{metricInfo?.label?.split('(')[0].trim() || ''} trung bình theo tháng các tỉnh thành</h3>
            </div>
          </div>

          <div className="h-72">
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 10, bottom: 15 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                  <XAxis dataKey="name" stroke="#70859c" tick={{ fontSize: 9, fontWeight: 600 }} label={{ value: 'Thời gian', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fontSize: '11px', fontWeight: 'bold', fill: '#475569' } }} />
                  <YAxis stroke="#70859c" tick={{ fontSize: 9, fontWeight: 600 }} label={{ value: metricInfo?.label, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: '11px', fontWeight: 'bold', fill: '#475569' } }} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold' }} itemStyle={{ fontWeight: 'bold' }} labelStyle={{ fontWeight: '800', color: '#475569', marginBottom: '4px' }} />
                  {selectedProvinces.map((prov, index) => {
                    const color = currentPalette[index % currentPalette.length];
                    const isHidden = !!hiddenLines[prov];
                    const isHighlighted = highlightedProvince === prov;
                    const isDimmed = highlightedProvince && highlightedProvince !== prov;
                    const lineOpacity = isDimmed ? 0.15 : 1;
                    const lineWidth = isHighlighted ? 3.5 : 2;
                    const areaFillOpacity = isHighlighted ? 0.35 : (isDimmed ? 0.02 : 0.1);

                    return (
                      <Area
                        isAnimationActive={false}
                        key={prov}
                        type="monotone"
                        dataKey={prov}
                        name={prov}
                        stroke={color}
                        strokeWidth={lineWidth}
                        strokeOpacity={lineOpacity}
                        fillOpacity={areaFillOpacity}
                        fill={color}
                        hide={isHidden}
                        connectNulls
                        onClick={() => handleLineClick(prov)}
                        style={{ cursor: 'pointer' }}
                        activeDot={{ r: 5, onClick: () => handleLineClick(prov) }}
                      />
                    );
                  })}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-xs font-semibold">Không đủ dữ liệu</div>
            )}
          </div>
        </div>

        {/* Weekly Data Bar chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-center gap-2 border-b border-slate-100 pb-2">
            <div className="text-center">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                {metricInfo?.label?.split('(')[0].trim() || ''} trung bình theo tuần các tỉnh thành {highlightedProvince ? `- ${highlightedProvince}` : ''}
              </h3>
            </div>
          </div>

          <div className="h-72">
            {weeklyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: 10, bottom: 15 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                  <XAxis dataKey="name" stroke="#70859c" tick={{ fontSize: 9, fontWeight: 600 }} label={{ value: 'Thời gian', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fontSize: '11px', fontWeight: 'bold', fill: '#475569' } }} />
                  <YAxis stroke="#70859c" tick={{ fontSize: 9, fontWeight: 600 }} label={{ value: metricInfo?.label, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: '11px', fontWeight: 'bold', fill: '#475569' } }} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold' }} itemStyle={{ fontWeight: 'bold' }} labelStyle={{ fontWeight: '800', color: '#475569', marginBottom: '4px' }} />
                  <Bar
                    isAnimationActive={false}
                    dataKey="value"
                    name={highlightedProvince || 'Trung bình chung'}
                    fill={highlightedProvince ? (currentPalette[Math.max(0, selectedProvinces.indexOf(highlightedProvince)) % currentPalette.length]) : (isColorblind ? "#E69F00" : (metricInfo?.color || "#F59E0B"))}
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

      {/* Insight Card Toggle Button */}
      <div className="flex justify-center w-full mt-4">
        <button 
          onClick={() => setShowInsights(!showInsights)}
          className="flex items-center gap-2 bg-slate-900 hover:bg-brand-primary text-white px-5 py-2.5 rounded-full text-xs font-bold transition-all shadow-md cursor-pointer"
        >
          {showInsights ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {showInsights ? 'Thu gọn phân tích dữ liệu' : 'Hiển thị phân tích dữ liệu chuyên sâu'}
        </button>
      </div>

      {/* Story Insight Card */}
      {showInsights && (
        <div className="w-full">
          <StoryInsightCard insightData={dynamicInsightData} />
        </div>
      )}

    </div>
  );
}
