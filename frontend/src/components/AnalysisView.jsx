import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../context/DataContext';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ZAxis
} from 'recharts';
import {
  BarChart4,
  HelpCircle,
  Activity,
  Flame,
  Layers,
  ChevronDown
} from 'lucide-react';

const VARIABLES = [
  { key: 'temp', label: 'Nhiệt độ TB', shortLabel: 'N.độ TB' },
  { key: 'tempMax', label: 'Nhiệt độ Max', shortLabel: 'N.độ Max' },
  { key: 'tempMin', label: 'Nhiệt độ Min', shortLabel: 'N.độ Min' },
  { key: 'rain', label: 'Lượng mưa', shortLabel: 'Lượng mưa' },
  { key: 'humidity', label: 'Độ ẩm', shortLabel: 'Độ ẩm' },
  { key: 'wind', label: 'Tốc độ gió', shortLabel: 'Tốc độ gió' },
  { key: 'sunshine', label: 'Giờ nắng', shortLabel: 'Giờ nắng' },
  { key: 'et0', label: 'Bốc hơi ET₀', shortLabel: 'Bốc hơi ET₀' },
  // { key: 'uvMax', label: 'UV Cực đại', shortLabel: 'UV Cực đại' }, // Note: Column has 0 valid values in current CSV
  { key: 'cloud', label: 'Độ phủ mây', shortLabel: 'Đ.phủ mây' },
  { key: 'pressure', label: 'Khí áp', shortLabel: 'Khí áp' }
];

const REGION_COLORS = {
  RedRiverDelta: '#8B5CF6',
  NorthMountain: '#F59E0B',
  NorthCentral: '#2563EB',
  SouthCentral: '#06B6D4',
  CentralHighlands: '#10B981',
  Southeast: '#EC4899',
  MekongDelta: '#EF4444',
};



// ── Math Helpers for Pearson Correlation ────────────────────────────────────
function getMean(arr) {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function calculatePearson(x, y) {
  const n = x.length;
  if (n === 0 || n !== y.length) return 0;

  const meanX = getMean(x);
  const meanY = getMean(y);

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < n; i++) {
    const diffX = x[i] - meanX;
    const diffY = y[i] - meanY;
    num += diffX * diffY;
    denX += diffX * diffX;
    denY += diffY * diffY;
  }

  if (denX === 0 || denY === 0) return 0;
  return num / Math.sqrt(denX * denY);
}

// Tukey Box Plot calculations
function calculateBoxStats(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);

  const getPercentile = (p) => {
    const pos = (sorted.length - 1) * p;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sorted[base + 1] !== undefined) {
      return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    }
    return sorted[base];
  };

  const minVal = sorted[0];
  const maxVal = sorted[sorted.length - 1];
  const q1 = getPercentile(0.25);
  const median = getPercentile(0.5);
  const q3 = getPercentile(0.75);
  const iqr = q3 - q1;

  // Whiskers bounds (Tukey style)
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;

  // Actual values within fences
  const whiskerMin = Math.min(...sorted.filter(v => v >= lowerFence));
  const whiskerMax = Math.max(...sorted.filter(v => v <= upperFence));

  // Outliers
  const outliers = sorted.filter(v => v < whiskerMin || v > whiskerMax);

  return {
    min: minVal,
    max: maxVal,
    q1: Math.round(q1 * 100) / 100,
    median: Math.round(median * 100) / 100,
    q3: Math.round(q3 * 100) / 100,
    whiskerMin: Math.round(whiskerMin * 100) / 100,
    whiskerMax: Math.round(whiskerMax * 100) / 100,
    outliers: outliers.map(v => Math.round(v * 100) / 100)
  };
}

export default function AnalysisView() {
  const { rawRows, loading, error } = useData();

  // State for Scatter plot axes (defaults to Temp vs Humidity)
  const [scatterX, setScatterX] = useState('temp');
  const [scatterY, setScatterY] = useState('humidity');

  const [isXDropdownOpen, setIsXDropdownOpen] = useState(false);
  const [isYDropdownOpen, setIsYDropdownOpen] = useState(false);
  const [isBoxMetricDropdownOpen, setIsBoxMetricDropdownOpen] = useState(false);
  const [isBoxGroupByDropdownOpen, setIsBoxGroupByDropdownOpen] = useState(false);

  const xDropdownRef = React.useRef(null);
  const yDropdownRef = React.useRef(null);
  const boxMetricDropdownRef = React.useRef(null);
  const boxGroupByDropdownRef = React.useRef(null);

  React.useEffect(() => {
    function handleClickOutside(event) {
      if (xDropdownRef.current && !xDropdownRef.current.contains(event.target)) {
        setIsXDropdownOpen(false);
      }
      if (yDropdownRef.current && !yDropdownRef.current.contains(event.target)) {
        setIsYDropdownOpen(false);
      }
      if (boxMetricDropdownRef.current && !boxMetricDropdownRef.current.contains(event.target)) {
        setIsBoxMetricDropdownOpen(false);
      }
      if (boxGroupByDropdownRef.current && !boxGroupByDropdownRef.current.contains(event.target)) {
        setIsBoxGroupByDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // State for Box Plot
  const [boxMetric, setBoxMetric] = useState('temp');
  const [boxGroupBy, setBoxGroupBy] = useState('season'); // 'season' | 'region'

  // Interactive hover states
  const [hoveredCell, setHoveredCell] = useState(null); // { xKey, yKey, r }
  const [hoveredBox, setHoveredBox] = useState(null); // Box details for tooltip
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // --- 1. Dynamic Heatmap Calculation ---
  // Calculates Pearson matrix dynamically based on active rawRows (filtered state)
  const correlationMatrix = useMemo(() => {
    if (!rawRows.length) return [];

    // Extract arrays of values for all variables (omit null/NaN entries)
    const datasets = {};
    VARIABLES.forEach(v => {
      datasets[v.key] = rawRows.map(r => r[v.key]).map(val => val === null || isNaN(val) ? 0 : val);
    });

    // Compute coefficients matrix
    const matrix = [];
    VARIABLES.forEach(rowVar => {
      const row = { key: rowVar.key, label: rowVar.label, shortLabel: rowVar.shortLabel };
      VARIABLES.forEach(colVar => {
        row[colVar.key] = calculatePearson(datasets[rowVar.key], datasets[colVar.key]);
      });
      matrix.push(row);
    });
    return matrix;
  }, [rawRows]);

  // Color interpolation for heatmap cells
  const getCellColor = (r) => {
    if (r === 1) return 'rgba(239, 68, 68, 0.9)'; // Deep red for perfect positive
    if (r === -1) return 'rgba(37, 99, 235, 0.9)'; // Deep blue for perfect negative

    // Scale color values
    if (r > 0) {
      // Red gradient
      return `rgba(239, 68, 68, ${r * 0.75})`;
    } else {
      // Blue gradient
      return `rgba(59, 130, 246, ${Math.abs(r) * 0.75})`;
    }
  };

  // --- 2. Scatter Plot Data ---
  // To keep chart interactions highly performant and clear, 
  // we average X and Y per province per month (producing 34 * 6 = ~204 aggregated points)
  const scatterPlotData = useMemo(() => {
    if (!rawRows.length) return [];

    const grouped = {};
    rawRows.forEach(row => {
      const key = `${row.province}_${row.month}`;
      if (!grouped[key]) {
        grouped[key] = {
          province: row.province,
          regionKey: row.regionKey,
          region: row.region,
          xVals: [],
          yVals: []
        };
      }
      grouped[key].xVals.push(row[scatterX]);
      grouped[key].yVals.push(row[scatterY]);
    });

    const avg = arr => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
    const round = n => Math.round(n * 100) / 100;

    return Object.values(grouped).map(g => ({
      name: g.province,
      regionKey: g.regionKey,
      region: g.region,
      x: round(avg(g.xVals)),
      y: round(avg(g.yVals)),
      color: REGION_COLORS[g.regionKey] || '#94A3B8'
    }));
  }, [rawRows, scatterX, scatterY]);

  // Group scatter points by region for plotting multiple series
  const scatterSeries = useMemo(() => {
    const series = {};
    scatterPlotData.forEach(pt => {
      if (!series[pt.regionKey]) {
        series[pt.regionKey] = {
          name: pt.region,
          color: pt.color,
          data: []
        };
      }
      series[pt.regionKey].data.push(pt);
    });
    return Object.values(series);
  }, [scatterPlotData]);

  // Handle Heatmap Cell Click -> Updates Scatter plot axis selection
  const handleCellClick = (xKey, yKey) => {
    setScatterX(xKey);
    setScatterY(yKey);
  };

  // --- 3. Box Plot Data Calculation ---
  // Calculates Min, Q1, Median, Q3, Max for the selected variable grouped by [Season / Region / Province]
  const boxPlotData = useMemo(() => {
    if (!rawRows.length) return [];

    // Group raw rows
    const grouped = {};
    rawRows.forEach(row => {
      let groupKey = '';
      if (boxGroupBy === 'season') groupKey = row.season || 'Không rõ';
      else if (boxGroupBy === 'region') groupKey = row.region;
      else if (boxGroupBy === 'province') groupKey = row.province;

      if (!grouped[groupKey]) grouped[groupKey] = [];

      const val = row[boxMetric];
      if (val !== null && !isNaN(val)) {
        grouped[groupKey].push(val);
      }
    });

    // Compute box stats for each group
    return Object.entries(grouped)
      .map(([groupName, values]) => {
        const stats = calculateBoxStats(values);
        return {
          groupName,
          stats
        };
      })
      .filter(g => g.stats !== null);
  }, [rawRows, boxMetric, boxGroupBy]);

  // --- Render custom Box Plot elements using SVG ---
  const renderSvgBoxPlot = () => {
    if (!boxPlotData.length) return null;

    // Define dimensions of the SVG container
    const width = 1000;
    const height = 300;
    const paddingLeft = 60;
    const paddingRight = 60;
    const paddingTop = 20;
    const paddingBottom = 40;

    // Calculate global bounds for scaling the Y-axis
    const allValues = boxPlotData.flatMap(b => [
      b.stats.whiskerMin,
      b.stats.whiskerMax,
      ...b.stats.outliers
    ]);
    const maxVal = Math.max(...allValues);
    const minVal = Math.min(...allValues);
    const range = maxVal - minVal;

    // Leave 10% padding at top and bottom of values range
    const graphMin = minVal - range * 0.1;
    const graphMax = maxVal + range * 0.1;
    const graphRange = graphMax - graphMin;

    // Helper function: Translate actual metric value to SVG Y coordinate
    const scaleY = (val) => {
      const innerHeight = height - paddingTop - paddingBottom;
      const pct = (val - graphMin) / graphRange;
      return height - paddingBottom - (pct * innerHeight);
    };

    // Calculate X coordinate for each box group
    const boxCount = boxPlotData.length;
    const innerWidth = width - paddingLeft - paddingRight;
    const groupWidth = innerWidth / boxCount;

    return (
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[900px] h-80 bg-slate-50/20 border border-slate-100 rounded-xl">
          {/* Horizontal Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
            const val = graphMin + graphRange * p;
            const y = scaleY(val);
            return (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="3 3"
                />
                <text
                  x={paddingLeft - 15}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-400 font-bold font-mono text-[9px]"
                >
                  {Math.round(val * 10) / 10}
                </text>
              </g>
            );
          })}

          {/* Render each box plot */}
          {boxPlotData.map((group, index) => {
            const { groupName, stats } = group;
            const centerX = paddingLeft + (index * groupWidth) + (groupWidth / 2);

            // X bounds for drawing box
            const boxW = Math.min(groupWidth * 0.5, 45); // Limit maximum box width
            const boxX = centerX - boxW / 2;

            // Y coordinates for Tukey key variables
            const yMin = scaleY(stats.whiskerMin);
            const yQ1 = scaleY(stats.q1);
            const yMed = scaleY(stats.median);
            const yQ3 = scaleY(stats.q3);
            const yMax = scaleY(stats.whiskerMax);



            return (
              <g
                key={groupName}
                onMouseEnter={(e) => {
                  setHoveredBox({ groupName, stats });
                  setTooltipPos({ x: e.clientX, y: e.clientY });
                }}
                onMouseMove={(e) => {
                  setTooltipPos({ x: e.clientX, y: e.clientY });
                }}
                onMouseLeave={() => setHoveredBox(null)}
                className="cursor-pointer group"
              >
                {/* Whiskers - Vertical dashed lines */}
                <line
                  x1={centerX}
                  y1={yMin}
                  x2={centerX}
                  y2={yQ1}
                  stroke="#64748B"
                  strokeWidth={1.5}
                  strokeDasharray="2 2"
                />
                <line
                  x1={centerX}
                  y1={yQ3}
                  x2={centerX}
                  y2={yMax}
                  stroke="#64748B"
                  strokeWidth={1.5}
                  strokeDasharray="2 2"
                />

                {/* Whiskers Caps - Horizontal ticks */}
                <line
                  x1={centerX - 8}
                  y1={yMin}
                  x2={centerX + 8}
                  y2={yMin}
                  stroke="#475569"
                  strokeWidth={1.5}
                />
                <line
                  x1={centerX - 8}
                  y1={yMax}
                  x2={centerX + 8}
                  y2={yMax}
                  stroke="#475569"
                  strokeWidth={1.5}
                />

                {/* The main Interquartile Box (Q1 to Q3) */}
                <rect
                  x={boxX}
                  y={yQ3}
                  width={boxW}
                  height={Math.max(yQ1 - yQ3, 1)}
                  fill="#3B82F6"
                  fillOpacity={0.15}
                  stroke="#2563EB"
                  strokeWidth={2}
                  className="transition-all group-hover:fill-blue-500 group-hover:fill-opacity-25"
                  rx={2}
                />

                {/* Median Line */}
                <line
                  x1={boxX}
                  y1={yMed}
                  x2={boxX + boxW}
                  y2={yMed}
                  stroke="#EF4444"
                  strokeWidth={3.5}
                />

                {/* Outliers dots */}
                {stats.outliers.map((val, oIdx) => {
                  const yO = scaleY(val);
                  return (
                    <circle
                      key={oIdx}
                      cx={centerX}
                      cy={yO}
                      r={3}
                      fill="#EF4444"
                      fillOpacity={0.65}
                      stroke="#DC2626"
                      strokeWidth={1}
                    />
                  );
                })}

                {/* Group label at bottom axis */}
                <text
                  x={centerX}
                  y={height - 15}
                  textAnchor="middle"
                  className="fill-slate-600 font-bold text-[9.5px] group-hover:fill-brand-primary transition-colors"
                >
                  {groupName}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  if (loading || error) return null;

  return (
    <div className="space-y-6 animate-fade-in pb-12">


      {/* Row 1: Heatmap + Scatter Plot */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Heatmap Grid (Col Span 7) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
              Ma trận hệ số tương quan Pearson
            </h3>
          </div>

          {/* Grid Heatmap Container */}
          <div className="overflow-x-auto overflow-y-visible mt-4 pr-1 pb-1">
            <div className="min-w-[480px] space-y-1.5">
              {/* Header variables labels */}
              <div className="flex items-end gap-1 text-[9px] font-bold text-slate-700 text-center">
                <div className="w-[80px]" />
                <div className="flex-1 grid grid-cols-10 gap-1">
                  {VARIABLES.map(v => (
                    <div
                      key={v.key}
                      className="text-[9px] font-bold text-slate-700 text-center whitespace-normal break-words leading-tight flex items-end justify-center pb-1 h-9 select-none"
                      title={v.label}
                    >
                      {v.shortLabel}
                    </div>
                  ))}
                </div>
              </div>

              {/* Rows */}
              <div className="space-y-1">
                {correlationMatrix.map(row => (
                  <div key={row.key} className="flex items-center gap-1">
                    {/* Row Label */}
                    <div className="w-[80px] text-[9px] font-bold text-slate-700 truncate select-none" title={row.label}>
                      {row.shortLabel}
                    </div>
                    {/* Cells */}
                    <div className="flex-1 grid grid-cols-10 gap-1">
                      {VARIABLES.map(colVar => {
                        const rValue = row[colVar.key];
                        const color = getCellColor(rValue);
                        const isSelected = scatterX === colVar.key && scatterY === row.key;

                        return (
                          <div
                            key={colVar.key}
                            onClick={() => handleCellClick(colVar.key, row.key)}
                            onMouseEnter={() => setHoveredCell({ xKey: colVar.label, yKey: row.label, r: rValue })}
                            onMouseLeave={() => setHoveredCell(null)}
                            className={`aspect-square rounded flex items-center justify-center font-mono text-[8px] font-extrabold cursor-pointer border transition-all hover:scale-105 active:scale-95 ${isSelected ? 'border-slate-800 scale-102 ring-1 ring-slate-800 shadow-md' : 'border-transparent'
                              }`}
                            style={{ backgroundColor: color, color: Math.abs(rValue) > 0.45 ? '#fff' : '#1e293b' }}
                            title={`${row.label} vs ${colVar.label}: r = ${Math.round(rValue * 100) / 100}`}
                          >
                            {Math.round(rValue * 10) / 10}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Scatter Plot (Col Span 5) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
              Đồ thị phân tán tương tác
            </h3>
          </div>

          {/* Custom Selectors for axes */}
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="space-y-1 relative" ref={xDropdownRef}>
              <span className="text-[9px] text-slate-400 font-extrabold uppercase">Trục X</span>
              <button
                type="button"
                onClick={() => setIsXDropdownOpen(!isXDropdownOpen)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-800 flex justify-between items-center outline-none hover:bg-slate-100/80 transition-colors"
              >
                <span>{VARIABLES.find(v => v.key === scatterX)?.label}</span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {isXDropdownOpen && (
                <div className="absolute left-0 mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-30 max-h-60 overflow-y-auto text-[11px] font-bold text-slate-700 animate-fade-in">
                  {VARIABLES.map(v => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => {
                        setScatterX(v.key);
                        setIsXDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors ${scatterX === v.key ? 'text-brand-primary bg-blue-50/50' : 'text-slate-700'}`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1 relative" ref={yDropdownRef}>
              <span className="text-[9px] text-slate-400 font-extrabold uppercase">Trục Y</span>
              <button
                type="button"
                onClick={() => setIsYDropdownOpen(!isYDropdownOpen)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-800 flex justify-between items-center outline-none hover:bg-slate-100/80 transition-colors"
              >
                <span>{VARIABLES.find(v => v.key === scatterY)?.label}</span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {isYDropdownOpen && (
                <div className="absolute left-0 mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-30 max-h-60 overflow-y-auto text-[11px] font-bold text-slate-700 animate-fade-in">
                  {VARIABLES.map(v => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => {
                        setScatterY(v.key);
                        setIsYDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors ${scatterY === v.key ? 'text-brand-primary bg-blue-50/50' : 'text-slate-700'}`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Scatter Chart Visual */}
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                <XAxis
                  type="number"
                  dataKey="x"
                  name={VARIABLES.find(v => v.key === scatterX)?.label}
                  stroke="#70859c"
                  tick={{ fontSize: 9, fontWeight: 600 }}
                  domain={['auto', 'auto']}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name={VARIABLES.find(v => v.key === scatterY)?.label}
                  stroke="#70859c"
                  tick={{ fontSize: 9, fontWeight: 600 }}
                  domain={['auto', 'auto']}
                />
                <ZAxis type="category" dataKey="name" name="Tỉnh thành" />
                <RechartsTooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '10px' }}
                  formatter={(value, name, _props) => {
                    if (name === 'x') return [value, VARIABLES.find(v => v.key === scatterX)?.label];
                    if (name === 'y') return [value, VARIABLES.find(v => v.key === scatterY)?.label];
                    return [value, name];
                  }}
                />
                {scatterSeries.map(series => (
                  <Scatter
                    key={series.name}
                    name={series.name}
                    data={series.data}
                    fill={series.color}
                    isAnimationActive={false}
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Color Indicators Legend */}
          <div className="flex flex-wrap gap-2 text-[8px] font-bold justify-center pt-2 border-t border-slate-100">
            {scatterSeries.map(series => (
              <div key={series.name} className="flex items-center gap-1 text-slate-500">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: series.color }} />
                <span>{series.name}</span>
              </div>
            ))}
          </div>

        </div>

      </div>

      {/* Row 2: Distribution Box Plot */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">

        {/* Controls header */}
        <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
              Biểu đồ phân phối Box và Whisker
            </h3>
          </div>

          <div className="flex items-center gap-3">
            {/* Box Metric Selection */}
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <span className="text-slate-400 font-bold">Chỉ số:</span>
              <div className="relative" ref={boxMetricDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsBoxMetricDropdownOpen(!isBoxMetricDropdownOpen)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 flex items-center gap-1 hover:bg-slate-100/80 transition-colors"
                >
                  <span>{VARIABLES.find(v => v.key === boxMetric)?.label}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>

                {isBoxMetricDropdownOpen && (
                  <div className="absolute left-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-30 max-h-60 overflow-y-auto text-xs font-bold text-slate-700 animate-fade-in">
                    {VARIABLES.map(v => (
                      <button
                        key={v.key}
                        type="button"
                        onClick={() => {
                          setBoxMetric(v.key);
                          setIsBoxMetricDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors ${boxMetric === v.key ? 'text-brand-primary bg-blue-50/50' : 'text-slate-700'}`}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Box GroupBy selector */}
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <span className="text-slate-400 font-bold">Gom nhóm theo:</span>
              <div className="relative" ref={boxGroupByDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsBoxGroupByDropdownOpen(!isBoxGroupByDropdownOpen)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 flex items-center gap-1 hover:bg-slate-100/80 transition-colors"
                >
                  <span>{boxGroupBy === 'season' ? 'Mùa khí hậu' : 'Vùng miền'}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>

                {isBoxGroupByDropdownOpen && (
                  <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-30 text-xs font-bold text-slate-700 animate-fade-in">
                    <button
                      type="button"
                      onClick={() => {
                        setBoxGroupBy('season');
                        setIsBoxGroupByDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors ${boxGroupBy === 'season' ? 'text-brand-primary bg-blue-50/50' : 'text-slate-700'}`}
                    >
                      Mùa khí hậu
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBoxGroupBy('region');
                        setIsBoxGroupByDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors ${boxGroupBy === 'region' ? 'text-brand-primary bg-blue-50/50' : 'text-slate-700'}`}
                    >
                      Vùng miền
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Boxplot chart */}
        <div className="w-full relative">
          {renderSvgBoxPlot()}
        </div>

      </div>

      {/* Floating Tukey Box stats tooltip */}
      {hoveredBox && createPortal(
        <div
          className="fixed bg-white/95 backdrop-blur border border-slate-200 rounded-xl p-4 shadow-xl pointer-events-none z-50 text-[11px] font-medium text-slate-750 min-w-[220px] transition-all duration-75 space-y-3.5"
          style={{
            left: `${tooltipPos.x + 15}px`,
            top: `${tooltipPos.y + 15}px`,
            transform: tooltipPos.x > window.innerWidth - 260 ? 'translateX(-110%)' : 'none'
          }}
        >
          <div className="border-b border-slate-200 pb-1.5">
            <span className="text-[9px] text-brand-primary font-extrabold uppercase">Nhóm đang xem</span>
            <h4 className="text-xs font-extrabold text-slate-800 mt-0.5">{hoveredBox.groupName}</h4>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-[10px]">
            <div>
              <span className="text-[8px] text-slate-400 font-extrabold uppercase block font-sans">Whisker Max</span>
              <p className="font-bold text-slate-750">{hoveredBox.stats.whiskerMax}</p>
            </div>
            <div>
              <span className="text-[8px] text-slate-400 font-extrabold uppercase block font-sans">Q3 (Thượng phân vị)</span>
              <p className="font-bold text-slate-750">{hoveredBox.stats.q3}</p>
            </div>
            <div>
              <span className="text-[8px] text-red-500 font-extrabold uppercase block font-sans">Median (Trung vị)</span>
              <p className="font-bold text-red-650 text-xs">{hoveredBox.stats.median}</p>
            </div>
            <div>
              <span className="text-[8px] text-slate-400 font-extrabold uppercase block font-sans">Q1 (Hạ phân vị)</span>
              <p className="font-bold text-slate-750">{hoveredBox.stats.q1}</p>
            </div>
            <div>
              <span className="text-[8px] text-slate-400 font-extrabold uppercase block font-sans">Whisker Min</span>
              <p className="font-bold text-slate-750">{hoveredBox.stats.whiskerMin}</p>
            </div>
            <div>
              <span className="text-[8px] text-slate-400 font-extrabold uppercase block font-sans">Số điểm dị biệt</span>
              <p className="font-bold text-slate-750">{hoveredBox.stats.outliers.length} điểm</p>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
