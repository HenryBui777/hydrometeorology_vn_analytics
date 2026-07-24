import React, { useState, useEffect, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import {
  Terminal, Sparkles, Send, Play, X, CheckCircle, AlertTriangle,
  Cpu, Workflow, Clock, FileText, ChevronRight, BarChart2,
  Table, Download, Eye
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, ScatterChart, Scatter, ZAxis, PieChart, Pie, ComposedChart,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';

// Colors for charts
const COLORS_DEFAULT = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
const COLORS_COLORBLIND = ['#0072B2', '#E69F00', '#56B4E9', '#009E73', '#F0E442', '#D55E00', '#CC79A7'];
const FIELD_LABELS = {
  name: 'Đối tượng so sánh', province: 'Tỉnh/thành', region: 'Vùng', season: 'Mùa', month: 'Tháng',
  date: 'Thời gian', week: 'Tuần', latitude: 'Vĩ độ', longitude: 'Kinh độ', value: 'Giá trị', x: 'Trục X', y: 'Trục Y', secondary: 'Chỉ số phụ',
  temp_mean: 'Nhiệt độ trung bình (°C)', temp_max: 'Nhiệt độ cao nhất (°C)', temp_min: 'Nhiệt độ thấp nhất (°C)',
  app_temp_mean: 'Nhiệt độ cảm nhận TB (°C)', app_temp_max: 'Nhiệt độ cảm nhận cao nhất (°C)', app_temp_min: 'Nhiệt độ cảm nhận thấp nhất (°C)',
  precipitation_sum: 'Tổng lượng mưa (mm)', rain_sum: 'Lượng mưa (mm)', showers_sum: 'Lượng mưa rào (mm)', precipitation_hours: 'Số giờ mưa (giờ)',
  humidity_mean: 'Độ ẩm trung bình (%)', sunshine_hours: 'Số giờ nắng (giờ)', daylight_hours: 'Số giờ ban ngày (giờ)',
  wind_speed_max: 'Tốc độ gió lớn nhất (km/h)', wind_gusts_max: 'Gió giật lớn nhất (km/h)',
  wind_direction_10m_dominant: 'Hướng gió chủ đạo', weather_code: 'Mã thời tiết',
  cloud_cover: 'Độ che phủ mây (%)', et0: 'Lượng bốc hơi tham chiếu (mm)', pressure: 'Áp suất khí quyển (hPa)',
  shortwave_radiation_sum: 'Tổng bức xạ mặt trời', dew_point: 'Điểm sương (°C)', amplitude: 'Biên độ nhiệt (°C)',
  temp_range: 'Biên độ nhiệt (°C)', rain_std: 'Độ lệch chuẩn lượng mưa (mm)', score: 'Điểm tiềm năng',
  variability_score: 'Điểm thất thường tổng hợp', ratio: 'Tỷ lệ bốc hơi/giờ nắng'
};
const fieldLabel = (key) => FIELD_LABELS[key] || String(key || '').replaceAll('_', ' ');
const formatChartValue = (value) => typeof value === 'number' ? Number(value).toFixed(2) : value;
const formatAxisTick = (value) => {
  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue.toFixed(2) : value;
};
const inferCategoryLabel = (data, key, chartType) => {
  if (chartType === 'radar') return 'Chỉ số khí tượng';
  const values = (data || []).map((row) => String(row?.[key] ?? ''));
  if (key === 'date') return 'Ngày quan trắc';
  if (key === 'month' || values.some((value) => /^Tháng\s+\d+/i.test(value))) return 'Tháng';
  if (key === 'year') return 'Năm';
  if (key === 'week') return 'Tuần';
  if (key === 'season' || values.every((value) => ['Xuân', 'Hè', 'Thu', 'Đông'].includes(value))) return 'Mùa';
  const regionNames = ['Tây Nguyên', 'Bắc Trung Bộ', 'Đông Nam Bộ', 'Đồng bằng sông Hồng', 'Đồng bằng sông Cửu Long', 'Duyên hải Nam Trung Bộ', 'Trung du miền núi Bắc Bộ', 'Miền Bắc', 'Miền Trung', 'Miền Nam'];
  if (key === 'region' || (values.length > 0 && values.every((value) => regionNames.includes(value)))) return 'Vùng khí hậu';
  if (key === 'province' || key === 'name') return 'Tỉnh/thành phố';
  return fieldLabel(key);
};

// Scatter points represent places. Recharts normally only exposes the two
// numerical axes, so render the province/region in the tooltip explicitly.
const ScatterTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload || {};
  const entries = Object.entries(row).filter(([, value]) => typeof value === 'number');
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      {row.name && <p className="mb-1 font-extrabold text-slate-800">Tỉnh/thành: {row.name}</p>}
      {row.region && <p className="mb-1 font-semibold text-slate-700">Vùng: {row.region}</p>}
      {entries.map(([key, value]) => <p key={key} className="text-slate-600">{fieldLabel(key)}: <b>{formatChartValue(value)}</b></p>)}
    </div>
  );
};

export default function AIAnalystPortal({
  user,
  loginWithGoogle,
  datasetUploaded,
  submitQuery,
  activeQuery,
  setActiveQuery,
  executionStatus,
  setExecutionStatus,
  approveQuery,
  rejectQuery,
  updateActiveCode,
  historyList,
  chatHistory = []
}) {
  const [promptInput, setPromptInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [engine, setEngine] = useState('python');
  const [generateError, setGenerateError] = useState('');
  const [isColorBlind, setIsColorBlind] = useState(false);

  // Methodology suggestion state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // 4-Axis Analysis State
  const [insight, setInsight] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [exportingId, setExportingId] = useState(null);
  const [exportData, setExportData] = useState(null);

  const COLORS = isColorBlind ? COLORS_COLORBLIND : COLORS_DEFAULT;
  const autoChartType = useMemo(() => {
    const allowedTypes = new Set(['bar', 'bar-horizontal', 'line', 'multi-line', 'area', 'stacked-area', 'scatter', 'bubble', 'histogram', 'pie', 'donut', 'composed', 'radar', 'wind-rose']);
    const requestedType = activeQuery?.chartType;
    if (allowedTypes.has(requestedType)) return requestedType;

    const data = activeQuery?.chartData;
    const question = (activeQuery?.question || '').toLowerCase();
    const xKeys = data?.[0] ? Object.keys(data[0]) : [];
    const hasDate = xKeys.some((key) => /date|ngày|tháng|time/i.test(key));
    if (hasDate || /xu hướng|theo thời gian|diễn biến|trend/.test(question)) return 'line';
    if (/tương quan|mối quan hệ|correlation/.test(question)) return 'scatter';
    if (/tỷ trọng|tỉ trọng|cơ cấu|percentage|phần trăm/.test(question) && (data?.length || 0) <= 8) return 'pie';
    return 'bar';
  }, [activeQuery]);
  const autoChartLabel = { bar: 'Biểu đồ cột', 'bar-horizontal': 'Biểu đồ thanh ngang', line: 'Biểu đồ đường', 'multi-line': 'Biểu đồ nhiều đường', area: 'Biểu đồ miền', 'stacked-area': 'Biểu đồ miền chồng', scatter: 'Biểu đồ phân tán', bubble: 'Biểu đồ bong bóng', histogram: 'Biểu đồ phân bố tần suất', pie: 'Biểu đồ tròn', donut: 'Biểu đồ vành khuyên', composed: 'Biểu đồ kết hợp', radar: 'Biểu đồ radar', 'wind-rose': 'Biểu đồ hoa gió' }[autoChartType];

  // Fake streaming state for execution monitor
  const [streamedLogs, setStreamedLogs] = useState([]);
  const [currentLineIdx, setCurrentLineIdx] = useState(0);

  useEffect(() => {
    if (executionStatus === 'running' && activeQuery) {
      setInsight(null); // Reset insight when a new query runs
      setStreamedLogs([]);
      setCurrentLineIdx(0);
      const logsToStream = activeQuery.logs || ['[Hệ thống] Khởi tạo môi trường Python...', '[Hệ thống] Đang nạp dữ liệu đã làm sạch...', '[Hệ thống] Đang thực thi mã phân tích...'];
      const interval = setInterval(() => {
        setStreamedLogs(prev => {
          if (currentLineIdx < logsToStream.length) {
            const nextLogs = [...prev, logsToStream[currentLineIdx]];
            setCurrentLineIdx(idx => idx + 1);
            return nextLogs;
          } else {
            clearInterval(interval);
            return prev;
          }
        });
      }, 600);
      return () => clearInterval(interval);
    }
  }, [executionStatus, currentLineIdx, activeQuery]);

  const handleGenerate = async () => {
    if (!promptInput.trim()) return;
    setGenerateError('');
    setIsGenerating(true);

    try {
      const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');
      const response = await fetch(`${apiBase}/api/ai/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptInput, context: 'Dữ liệu thời tiết Việt Nam', engine, user_email: user?.email || '', chat_history: chatHistory.slice(-8) })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || `Backend trả về lỗi HTTP ${response.status}.`);

      submitQuery(
        `Đã tạo xong mã nguồn phân tích bằng Python. Vui lòng kiểm tra và phê duyệt.`,
        'ai',
        {
          id: data.log_id,
          question: promptInput,
          code: data.code,
          explanation: data.explanation,
          chartType: data.chart_type || 'bar',
          engine,
        }
      );
      setPromptInput('');
    } catch (error) {
      console.error(error);
      setGenerateError(error.message || 'Không thể kết nối Backend AI.');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderInteractiveChart = (chart = null) => {
    const data = chart?.data || activeQuery?.chartData;
    const chartType = chart?.type || autoChartType;
    if (!Array.isArray(data) || data.length === 0) {
      return <div className="p-10 text-center text-slate-500">Không có dữ liệu biểu đồ.</div>;
    }

    // Detect the category key and only numeric series for chart axes.
    const keys = Object.keys(data[0]);
    const xKey = keys.find(k => typeof data[0][k] === 'string') || keys[0];
    const yKeys = keys.filter(k => typeof data[0][k] === 'number');
    const scatterX = yKeys[0];
    const scatterY = yKeys[1] || yKeys[0];
    const categoryLabel = inferCategoryLabel(data, xKey, chartType);
    const displayTitle = chart?.title || activeQuery?.question || autoChartLabel;

    return (
      <div className="mt-4" id="chart-export-area">
        <h4 className="mb-3 text-center text-sm font-extrabold uppercase tracking-wide text-slate-700">{displayTitle}</h4>
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'bar' || chartType === 'histogram' ? (
              <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                <XAxis dataKey={xKey} tickFormatter={formatAxisTick} stroke="#64748b" fontSize={12} label={{ value: categoryLabel, position: 'insideBottom', offset: -2 }} />
                <YAxis tickFormatter={formatAxisTick} stroke="#64748b" fontSize={12} label={{ value: fieldLabel(yKeys[0]), angle: -90, position: 'insideLeft', offset: 8 }} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} formatter={(value, name) => [formatChartValue(value), fieldLabel(name)]} labelFormatter={(label) => categoryLabel + ': ' + label} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend />
                {yKeys.map((key, i) => <Bar key={key} name={fieldLabel(key)} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />)}
              </BarChart>
            ) : chartType === 'bar-horizontal' ? (
              <BarChart data={data} layout="vertical" margin={{ top: 20, right: 30, left: 80, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                <XAxis type="number" tickFormatter={formatAxisTick} stroke="#64748b" fontSize={12} label={{ value: fieldLabel(yKeys[0]), position: 'insideBottom', offset: -2 }} />
                <YAxis type="category" dataKey={xKey} stroke="#64748b" fontSize={12} width={110} label={{ value: categoryLabel, angle: -90, position: 'insideLeft', offset: 35 }} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} formatter={(value, name) => [formatChartValue(value), fieldLabel(name)]} labelFormatter={(label) => categoryLabel + ': ' + label} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend />
                {yKeys.map((key, i) => <Bar key={key} name={fieldLabel(key)} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[0, 4, 4, 0]} />)}
              </BarChart>
            ) : chartType === 'line' || chartType === 'multi-line' ? (
              <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                <XAxis dataKey={xKey} tickFormatter={formatAxisTick} stroke="#64748b" fontSize={12} label={{ value: categoryLabel, position: 'insideBottom', offset: -2 }} />
                <YAxis tickFormatter={formatAxisTick} stroke="#64748b" fontSize={12} label={{ value: fieldLabel(yKeys[0]), angle: -90, position: 'insideLeft', offset: 8 }} />
                <Tooltip formatter={(value, name) => [formatChartValue(value), fieldLabel(name)]} labelFormatter={(label) => categoryLabel + ': ' + label} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend />
                {yKeys.map((key, i) => <Line key={key} name={fieldLabel(key)} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />)}
              </LineChart>
            ) : chartType === 'area' || chartType === 'stacked-area' ? (
              <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                <XAxis dataKey={xKey} tickFormatter={formatAxisTick} stroke="#64748b" fontSize={12} label={{ value: categoryLabel, position: 'insideBottom', offset: -2 }} />
                <YAxis tickFormatter={formatAxisTick} stroke="#64748b" fontSize={12} label={{ value: fieldLabel(yKeys[0]), angle: -90, position: 'insideLeft', offset: 8 }} />
                <Tooltip formatter={(value, name) => [formatChartValue(value), fieldLabel(name)]} labelFormatter={(label) => fieldLabel(xKey) + ': ' + label} />
                <Legend />
                {yKeys.map((key, i) => <Area key={key} stackId={chartType === 'stacked-area' ? 'total' : undefined} name={fieldLabel(key)} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.25} />)}
              </AreaChart>
            ) : chartType === 'composed' ? (
              <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                <XAxis dataKey={xKey} tickFormatter={formatAxisTick} stroke="#64748b" fontSize={12} label={{ value: categoryLabel, position: 'insideBottom', offset: -2 }} />
                <YAxis yAxisId="left" tickFormatter={formatAxisTick} stroke="#64748b" fontSize={12} label={{ value: fieldLabel(yKeys[0]), angle: -90, position: 'insideLeft', offset: 8 }} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={formatAxisTick} stroke="#64748b" fontSize={12} label={{ value: fieldLabel(yKeys[1]), angle: 90, position: 'insideRight', offset: 8 }} />
                <Tooltip formatter={(value, name) => [formatChartValue(value), fieldLabel(name)]} labelFormatter={(label) => fieldLabel(xKey) + ': ' + label} />
                <Legend />
                <Bar yAxisId="left" name={fieldLabel(yKeys[0])} dataKey={yKeys[0]} fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" name={fieldLabel(yKeys[1])} type="monotone" dataKey={yKeys[1]} stroke={COLORS[2]} strokeWidth={3} />
              </ComposedChart>
            ) : chartType === 'radar' || chartType === 'wind-rose' ? (
              <RadarChart data={data} outerRadius="72%">
                <PolarGrid />
                <PolarAngleAxis dataKey={xKey} fontSize={12} />
                <PolarRadiusAxis tickFormatter={formatAxisTick} fontSize={10} />
                {yKeys.map((key, index) => <Radar key={key} name={fieldLabel(key)} dataKey={key} stroke={COLORS[index % COLORS.length]} fill={COLORS[index % COLORS.length]} fillOpacity={0.22} />)}
                <Legend />
                <Tooltip formatter={(value, name) => [formatChartValue(value), fieldLabel(name)]} />
              </RadarChart>
            ) : chartType === 'scatter' || chartType === 'bubble' ? (
              <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                <XAxis dataKey={scatterX} name={fieldLabel(scatterX)} tickFormatter={formatAxisTick} stroke="#64748b" fontSize={12} label={{ value: fieldLabel(scatterX), position: 'insideBottom', offset: -2 }} />
                <YAxis dataKey={scatterY} name={fieldLabel(scatterY)} tickFormatter={formatAxisTick} stroke="#64748b" fontSize={12} label={{ value: fieldLabel(scatterY), angle: -90, position: 'insideLeft', offset: 8 }} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ScatterTooltip />} />
                <Legend />
                {chartType === 'bubble' && yKeys[2] && <ZAxis dataKey={yKeys[2]} range={[80, 600]} name={fieldLabel(yKeys[2])} />}
                <Scatter name={chartType === 'bubble' ? 'Các địa điểm (kích thước = chỉ số thứ ba)' : 'Các địa điểm'} data={data} fill={COLORS[0]} />
              </ScatterChart>
            ) : (
              <PieChart>
                <Tooltip formatter={(value, name) => [formatChartValue(value), fieldLabel(name)]} labelFormatter={(label) => categoryLabel + ': ' + label} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend />
                <Pie data={data} dataKey={yKeys[0]} name={fieldLabel(yKeys[0])} nameKey={xKey} cx="50%" cy="50%" innerRadius={chartType === 'donut' ? 64 : 0} outerRadius={120} label>
                  {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderRawTable = (overrideData = null) => {
    const data = overrideData || activeQuery?.chartData;
    if (!data || !Array.isArray(data) || data.length === 0) {
      return <div className="p-10 text-center text-slate-500">Không có dữ liệu bảng.</div>;
    }
    const columns = Object.keys(data[0]);

    return (
      <div className="overflow-x-auto rounded-lg border border-slate-200 mt-4">
        <table className="min-w-full text-left text-sm bg-white">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {columns.map(col => <th key={col} className="px-6 py-3 font-bold text-slate-600 uppercase tracking-wider">{col}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50 transition-colors">
                {columns.map(col => <td key={col} className="px-6 py-3 text-slate-800">{row[col]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const handleExportPDF = async (item) => {
    if (exportingId) return;
    setExportingId(item.id);
    setExportData(null);
    try {
      let currentInsight = null;
      if (item.chartData) {
        const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');
        const response = await fetch(`${apiBase}/api/ai/analyze-chart`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: item.question || "",
            chart_data: item.chartData,
            chart_type: item.chartType || 'bar'
          })
        });
        if (response.ok) {
          currentInsight = await response.json().catch(() => null);
        }
      }

      setExportData({ item, insight: currentInsight });

      setTimeout(() => {
        const element = document.getElementById('ai-report-export-area');
        if (element) {
          const opt = {
            margin: 0.4,
            filename: `Bao_cao_AI_${item.id || Date.now()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
          };
          html2pdf().set(opt).from(element).save().then(() => {
            setTimeout(() => {
              setExportingId(null);
              setExportData(null);
            }, 500);
          });
        } else {
          setExportingId(null);
          setExportData(null);
        }
      }, 1500); // 1.5s delay to ensure charts are fully rendered

    } catch (e) {
      console.error(e);
      setExportingId(null);
      setExportData(null);
    }
  };

  const fetchInsight = async () => {
    if (!activeQuery || !activeQuery.chartData) return;
    setIsAnalyzing(true);
    try {
      const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');
      const response = await fetch(`${apiBase}/api/ai/analyze-chart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: activeQuery.question || "",
          chart_data: activeQuery.chartData,
          chart_type: autoChartType
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || `Backend trả về lỗi HTTP ${response.status}.`);
      setInsight(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (executionStatus === 'success' && activeQuery?.chartData && !insight && !isAnalyzing) {
      fetchInsight();
    }
  }, [executionStatus, activeQuery]);

  return (
    <div className="w-full min-h-full font-sans pb-10" id="report-export-area">

      {/* Login Gate */}
      {!user ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-10 shadow-lg text-center max-w-md">
            <Cpu className="h-16 w-16 text-indigo-500 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-slate-800 dark:text-white">Đăng nhập để sử dụng</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-3 font-medium leading-relaxed">Bạn cần đăng nhập để sử dụng chức năng Phân tích tích hợp AI. Lịch sử phân tích sẽ được lưu theo tài khoản của bạn.</p>
            <button
              onClick={loginWithGoogle}
              className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-3 rounded-xl transition-colors flex items-center gap-3 mx-auto cursor-pointer shadow-md"
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
              Đăng nhập với Google
            </button>
          </div>
        </div>
      ) : (
      <>

      {/* Header Section */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-serif font-bold text-slate-800 tracking-tight dark:text-white">Phân tích tích hợp AI</h1>
          <p className="text-slate-500 mt-2 font-medium dark:text-slate-400">Trợ lý chuyên gia dữ liệu, tự động phân tích và trực quan hóa thông tin.</p>
        </div>
      </div>

      {/* 1. Input Section */}
      <div className="bg-[#f9f9f5] border border-[#e5e5dd] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600" /> Khung nhập liệu yêu cầu
          </span>
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
            <button onClick={() => setEngine('python')} className={`px-3 py-1 text-[11px] font-bold rounded-md ${engine === 'python' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>Python</button>
            <button onClick={() => setEngine('sql')} className={`px-3 py-1 text-[11px] font-bold rounded-md ${engine === 'sql' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>SQL</button>
          </div>
        </div>

        <div className="space-y-4">
          <textarea
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            placeholder="Ví dụ: Phân tích xu hướng nhiệt độ và lượng mưa tại miền Trung trong 5 năm qua..."
            className="w-full bg-white dark:bg-slate-800 border border-[#e5e5dd] dark:border-slate-700 rounded-xl p-4 min-h-[120px] text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-y"
          />
          {generateError && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{generateError}</div>}

          {/* Suggestion toggle button */}
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                if (!showSuggestions && suggestions.length === 0) {
                  setLoadingSuggestions(true);
                  try {
                    const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');
                    const res = await fetch(`${apiBase}/api/ai/suggest-methods`);
                    const data = await res.json();
                    setSuggestions(data.suggestions || []);
                  } catch {}
                  setLoadingSuggestions(false);
                }
                setShowSuggestions(v => !v);
              }}
              className="text-[11px] px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-full font-bold hover:bg-amber-100 transition-colors cursor-pointer flex items-center gap-1"
            >
              {loadingSuggestions ? <Cpu className="h-3 w-3 animate-spin" /> : '💡'}
              {showSuggestions ? 'Ẩn gợi ý' : 'Chưa biết phân tích? Xem gợi ý'}
            </button>
          </div>

          {/* Suggestion cards panel */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="bg-white border border-amber-100 rounded-xl p-4 shadow-sm">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-3">Chọn một gợi ý để bắt đầu phân tích:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {suggestions.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setPromptInput(s.example_prompt); setShowSuggestions(false); }}
                    className="text-left p-3 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-xl mt-0.5">{s.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">{s.category}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            s.difficulty === 'Dễ' ? 'bg-emerald-100 text-emerald-700' :
                            s.difficulty === 'Trung bình' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>{s.difficulty}</span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">{s.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{s.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {["Diễn biến nhiệt độ Hà Nội", "Top 5 tỉnh nóng nhất tháng 5", "Tương quan nhiệt và ẩm miền Nam", "Biến động lượng mưa miền Trung", "So sánh giờ nắng Đà Nẵng & Huế"].map((tag) => (
                <button key={tag} onClick={() => setPromptInput(tag)} className="text-[11px] px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors cursor-pointer">
                  {tag}
                </button>
              ))}
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !promptInput.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm px-6 py-2.5 rounded-lg transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer"
            >
              {isGenerating ? <Cpu className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {isGenerating ? 'Đang phân tích dữ liệu...' : 'Tiến hành phân tích'}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Draft Code Review Section */}
      {activeQuery && (activeQuery.status === 'pending' || executionStatus !== 'idle') && (
        <div className="mt-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-visible animate-fade-in relative">
          <div className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between">
            <span className="text-xs font-black text-slate-700 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
              <FileText className="h-4 w-4 text-orange-500" /> Ý tưởng đề xuất
            </span>
            {activeQuery.status === 'pending' && <span className="bg-orange-100 text-orange-700 border border-orange-200 text-[10px] font-black px-2 py-1 rounded-md uppercase">Chờ phê duyệt</span>}
          </div>

          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">"{activeQuery.question}"</h3>
              <div className="bg-blue-50/50 dark:bg-slate-700/50 border border-blue-100 dark:border-slate-600 p-4 rounded-xl text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                <p className="font-semibold text-slate-800 dark:text-slate-200">Giải thích:</p>
                <p className="mt-1">{activeQuery.explanation || 'Đề xuất đã sẵn sàng. Hãy xem lại mã bên dưới trước khi chạy.'}</p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-900">
              <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex justify-between items-center">
                <span className="text-[11px] font-mono text-slate-400 font-bold">python_script.py (Có thể chỉnh sửa trực tiếp)</span>
              </div>
              <div className="h-[300px]">
                <Editor
                  height="100%"
                  defaultLanguage="python"
                  theme="vs-dark"
                  value={activeQuery.code || '# Chưa có mã phân tích. Hãy tạo lại đề xuất.'}
                  onChange={(value) => updateActiveCode(value || '')}
                  options={{ minimap: { enabled: false }, fontSize: 13, padding: { top: 16 } }}
                />
              </div>
            </div>

            {/* Approval Controls */}
            {activeQuery.status === 'pending' && executionStatus === 'idle' && (
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={rejectQuery} className="px-5 py-2.5 text-xs font-bold bg-white border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                  Từ chối & thử lại
                </button>
                <button onClick={approveQuery} className="px-5 py-2.5 text-xs font-bold bg-[#e06b4b] hover:bg-[#d45d3e] text-white rounded-lg shadow-md shadow-orange-600/20 transition-colors flex items-center gap-2 cursor-pointer">
                  <Play className="h-4 w-4" /> Đồng ý & Thực thi
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Execution & Results Section */}
      {(executionStatus === 'running' || executionStatus === 'success' || executionStatus === 'failed') && (
        <div className="mt-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden animate-fade-in relative">
          <div className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
              {executionStatus === 'success' ? <BarChart2 className="h-4 w-4 text-emerald-600" /> : <Terminal className="h-4 w-4 text-brand-primary" />}
              {executionStatus === 'success' ? 'Kết quả truy vấn' : 'Giám sát thực thi'}
            </span>
            {executionStatus === 'running' && <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-1 rounded-md uppercase animate-pulse">Đang chạy...</span>}
            {executionStatus === 'success' && <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md uppercase">Đã thực thi</span>}
            {executionStatus === 'failed' && <span className="text-[10px] font-extrabold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-1 rounded-md uppercase">Thực thi thất bại</span>}
          </div>

          <div className="p-6">
            {executionStatus === 'running' && (
              <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs text-green-400 space-y-2 h-[200px] overflow-y-auto">
                {streamedLogs.map((log, i) => (
                  <div key={i} className="animate-fade-in opacity-80">{log}</div>
                ))}
                <div className="animate-pulse opacity-50">_</div>
              </div>
            )}

            {executionStatus === 'failed' && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center space-y-4">
                <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto" />
                <div>
                  <h4 className="font-bold text-rose-800">Thực thi đoạn mã thất bại</h4>
                  <p className="text-sm text-rose-600 mt-1">{activeQuery?.errorMessage || 'Đã có lỗi xảy ra trong quá trình chạy mã. Vui lòng tạo đề xuất mới hoặc chỉnh lại mã.'}</p>
                </div>
                <button onClick={rejectQuery} className="bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs px-6 py-2.5 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-2">
                  <X className="h-4 w-4" /> Đóng & thử lại
                </button>
              </div>
            )}

            {executionStatus === 'success' && activeQuery?.chartData && (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-lg">
                  <div>
                    <p className="text-xs font-extrabold text-slate-800">{autoChartLabel}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">Tự động chọn theo câu hỏi và cấu trúc dữ liệu trả về.</p>
                  </div>
                  <button
                    onClick={() => setIsColorBlind(!isColorBlind)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-bold border transition-colors ${isColorBlind ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-white text-slate-500 border-slate-200'}`}
                  >
                    <Eye className="h-3 w-3" /> Mù màu
                  </button>
                </div>

                <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm overflow-hidden">
                  {renderInteractiveChart()}
                </div>

                {(activeQuery.additionalCharts || []).map((chart, index) => (
                  <div key={`${chart.title || 'supplement'}-${index}`} className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm overflow-hidden">
                    {renderInteractiveChart(chart)}
                  </div>
                ))}

                <details className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                  <summary className="cursor-pointer text-xs font-bold text-slate-600"><Table className="mr-1 inline h-3.5 w-3.5" />Xem bảng dữ liệu dùng để vẽ biểu đồ</summary>
                  {renderRawTable()}
                </details>

                {/* 4-Axis Insight Section */}
                {(isAnalyzing || (insight && insight.available !== false)) && (
                  <div className="mt-8 border-t border-slate-200 pt-8">
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2 mb-6">
                      <Sparkles className="h-4 w-4 text-emerald-500" /> Báo cáo phân tích chuyên sâu (4 trục)
                    </h3>
                    {isAnalyzing ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-100 animate-pulse rounded-xl"></div>)}
                      </div>
                    ) : insight && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-xl">
                          <h4 className="font-black text-blue-900 flex items-center gap-2"><span className="bg-blue-200 text-blue-900 w-6 h-6 flex items-center justify-center rounded-full text-xs font-black">1</span> Phân tích Mô tả</h4>
                          <p className="text-sm text-blue-800 dark:text-blue-200 mt-2 font-medium leading-relaxed">{insight.descriptive}</p>
                        </div>
                        <div className="bg-amber-50/50 border border-amber-100 p-5 rounded-xl">
                          <h4 className="font-black text-amber-900 flex items-center gap-2"><span className="bg-amber-200 text-amber-900 w-6 h-6 flex items-center justify-center rounded-full text-xs font-black">2</span> Phân tích Chẩn đoán</h4>
                          <p className="text-sm text-amber-800 dark:text-amber-200 mt-2 font-medium leading-relaxed">{insight.diagnostic}</p>
                        </div>
                        <div className="bg-purple-50/50 border border-purple-100 p-5 rounded-xl">
                          <h4 className="font-black text-purple-900 flex items-center gap-2"><span className="bg-purple-200 text-purple-900 w-6 h-6 flex items-center justify-center rounded-full text-xs font-black">3</span> Phân tích Dự đoán</h4>
                          <p className="text-sm text-purple-800 dark:text-purple-200 mt-2 font-medium leading-relaxed">{insight.predictive}</p>
                        </div>
                        <div className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-xl">
                          <h4 className="font-black text-emerald-900 flex items-center gap-2"><span className="bg-emerald-200 text-emerald-900 w-6 h-6 flex items-center justify-center rounded-full text-xs font-black">4</span> Đề xuất Hành động</h4>
                          <p className="text-sm text-emerald-800 dark:text-emerald-200 mt-2 font-medium leading-relaxed">{insight.prescriptive}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. History Log Section */}
      <div className="mt-12 space-y-4">
        <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
          <Clock className="h-4 w-4" /> Lịch sử phân tích
        </h3>
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase font-bold">
                <th className="px-5 py-3">Trạng thái</th>
                <th className="px-5 py-3">Câu hỏi</th>
                <th className="px-5 py-3">Ngôn ngữ mã nguồn</th>
                <th className="px-5 py-3">Loại biểu đồ</th>
                <th className="px-5 py-3">Có sửa code?</th>
                <th className="px-5 py-3">Thời gian thực thi</th>
                <th className="px-5 py-3">Thời gian truy vấn</th>
                <th className="px-5 py-3">Báo cáo</th>
                <th className="px-5 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historyList.map((item, idx) => {
                const statusMap = {
                  approved: { label: 'Đã duyệt', cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
                  pending: { label: 'Chờ duyệt', cls: 'bg-amber-50 text-amber-700 border-amber-100' },
                  rejected: { label: 'Từ chối', cls: 'bg-rose-50 text-rose-700 border-rose-100' },
                };
                const st = statusMap[item.status] || statusMap.approved;

                // Language badge
                const langLabel = (() => {
                  const e = (item.engine || '').toLowerCase();
                  if (e === 'sql') return { label: 'SQL', cls: 'bg-blue-50 text-blue-700' };
                  if (e === 'python') return { label: 'Python', cls: 'bg-indigo-50 text-indigo-700' };
                  return { label: 'Ngôn ngữ tự nhiên', cls: 'bg-violet-50 text-violet-700' };
                })();

                // Chart type label
                const chartTypeMap = {
                  bar: 'Cột', 'bar-horizontal': 'Cột ngang', line: 'Đường', 'multi-line': 'Đa đường',
                  area: 'Diện tích', scatter: 'Phân tán', pie: 'Tròn', donut: 'Donut',
                  radar: 'Radar', histogram: 'Histogram', 'wind-rose': 'Hoa gió',
                };
                const chartLabel = chartTypeMap[item.chart_type] || (item.chart_type || '—');

                // Human modified
                const wasModified = item.human_modified === 1 || item.human_modified === true;

                // Execution time
                const execTime = item.execution_time_ms > 0 ? `${item.execution_time_ms} ms` : '—';

                // Format created_at
                const timeStr = (() => {
                  if (!item.created_at) return '—';
                  try {
                    const d = new Date(item.created_at.replace(' ', 'T'));
                    return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                  } catch { return item.created_at; }
                })();

                return (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4">
                    <span className={`${st.cls} border font-extrabold text-[10px] px-2 py-1 rounded-md uppercase`}>{st.label}</span>
                  </td>
                  <td className="px-5 py-4 font-bold text-slate-800 truncate max-w-[200px]">{item.question || item.title}</td>
                  <td className="px-5 py-4">
                    <span className={`${langLabel.cls} text-[10px] font-bold px-2 py-1 rounded-md`}>{langLabel.label}</span>
                  </td>
                  <td className="px-5 py-4 text-slate-600 text-[11px] font-medium">{chartLabel}</td>
                  <td className="px-5 py-4 text-center">
                    {wasModified
                      ? <span className="text-amber-600 font-bold text-[11px]">✏️ Có</span>
                      : <span className="text-slate-400 text-[11px]">—</span>}
                  </td>
                  <td className="px-5 py-4 text-slate-500 font-mono text-[10px]">{execTime}</td>
                  <td className="px-5 py-4 text-slate-500 font-mono text-[10px] whitespace-nowrap">{timeStr}</td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => handleExportPDF(item)}
                      disabled={exportingId === item.id || !item.chartData}
                      className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg transition-colors text-[11px] disabled:opacity-50"
                    >
                      {exportingId === item.id ? <Cpu className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                      Xuất PDF
                    </button>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => {
                        setActiveQuery(item);
                        setExecutionStatus('success');
                        setTimeout(() => {
                          document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
                        }, 100);
                      }}
                      className="text-emerald-600 hover:text-emerald-800 font-bold flex items-center gap-1 justify-end ml-auto cursor-pointer"
                    >
                      Xem lại <ChevronRight className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
                );
              })}
              {historyList.length === 0 && (
                <tr><td colSpan="9" className="text-center py-6 text-slate-500">Chưa có lịch sử phân tích nào.</td></tr>
              )}

            </tbody>
          </table>
        </div>
      </div>


      {/* PDF Export Overlay */}
      {exportData && (
        <div className="fixed inset-0 z-[9999] overflow-auto" style={{ background: 'rgba(255,255,255,0.95)' }}>
          <div className="fixed inset-0 flex items-center justify-center z-[10000] pointer-events-none">
            <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center border border-slate-200 pointer-events-auto">
              <Cpu className="h-12 w-12 text-indigo-600 animate-spin mb-4" />
              <h3 className="text-xl font-black text-slate-800">Đang tạo báo cáo PDF...</h3>
              <p className="text-slate-500 mt-2 font-medium">Hệ thống đang tổng hợp biểu đồ và phân tích.</p>
            </div>
          </div>
          <div id="ai-report-export-area" className="bg-white text-slate-800 p-10 w-[800px] mx-auto my-10 shadow-lg relative z-0">
          <div className="text-center mb-8 border-b pb-4">
            <h2 className="text-2xl font-black text-slate-900 uppercase">Báo cáo Phân tích Khí tượng AI</h2>
            <p className="text-slate-500 text-sm mt-2">Được tạo bởi Nền tảng Phân tích KTTV Tích hợp AI</p>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-800 border-l-4 border-emerald-500 pl-3">Câu hỏi phân tích</h3>
              <p className="mt-2 text-slate-700 font-bold italic">"{exportData.item.question}"</p>
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-800 border-l-4 border-blue-500 pl-3">Giải thích phương pháp</h3>
              <p className="mt-2 text-slate-700">{exportData.item.explanation}</p>
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-800 border-l-4 border-amber-500 pl-3">Mã nguồn thực thi</h3>
              <pre className="bg-slate-50 border border-slate-200 p-4 rounded-lg text-xs overflow-x-hidden whitespace-pre-wrap font-mono text-slate-600 mt-2">
                {exportData.item.code}
              </pre>
            </div>

            <div className="pt-4" style={{ pageBreakInside: 'avoid' }}>
              <h3 className="text-lg font-black text-slate-800 border-l-4 border-indigo-500 pl-3">Kết quả trực quan</h3>
              <div className="mt-4 border border-slate-200 rounded-xl p-4 bg-white" style={{ minHeight: '400px' }}>
                {renderInteractiveChart({
                  data: exportData.item.chartData,
                  type: exportData.item.chartType || 'bar',
                  title: exportData.item.question
                })}
              </div>
            </div>

            <div className="pt-4" style={{ pageBreakInside: 'avoid' }}>
              <h3 className="text-lg font-black text-slate-800 border-l-4 border-slate-500 pl-3 mb-2">Bảng dữ liệu</h3>
              {renderRawTable(exportData.item.chartData)}
            </div>

            {exportData.insight && exportData.insight.available !== false && (
              <div className="pt-6 border-t" style={{ pageBreakInside: 'avoid' }}>
                <h3 className="text-lg font-black text-slate-800 border-l-4 border-purple-500 pl-3 mb-4">Phân tích chuyên sâu (4 trục)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <h4 className="font-black text-blue-900 mb-2">1. Mô tả</h4>
                    <p className="text-sm text-slate-700">{exportData.insight.descriptive}</p>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
                    <h4 className="font-black text-amber-900 mb-2">2. Chẩn đoán</h4>
                    <p className="text-sm text-slate-700">{exportData.insight.diagnostic}</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                    <h4 className="font-black text-purple-900 mb-2">3. Dự đoán</h4>
                    <p className="text-sm text-slate-700">{exportData.insight.predictive}</p>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                    <h4 className="font-black text-emerald-900 mb-2">4. Hành động</h4>
                    <p className="text-sm text-slate-700">{exportData.insight.prescriptive}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      )}
      </>)}
    </div>
  );
}
