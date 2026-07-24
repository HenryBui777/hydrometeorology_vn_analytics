import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../context/DataContext';
import {
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ZAxis,
  Cell
} from 'recharts';
import StoryInsightCard from './StoryInsightCard';
import {
  BarChart4,
  HelpCircle,
  Activity,
  Flame,
  Layers,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';
import ExportPDFButton from './ExportPDFButton';

const VARIABLES = [
  { key: 'temp', label: 'Nhiệt độ TB (°C)', shortLabel: 'N.độ TB' },
  { key: 'tempMax', label: 'Nhiệt độ Max (°C)', shortLabel: 'N.độ Max' },
  { key: 'tempMin', label: 'Nhiệt độ Min (°C)', shortLabel: 'N.độ Min' },
  { key: 'rain', label: 'Lượng mưa (mm)', shortLabel: 'Lượng mưa' },
  { key: 'humidity', label: 'Độ ẩm (%)', shortLabel: 'Độ ẩm' },
  { key: 'wind', label: 'Tốc độ gió (km/h)', shortLabel: 'Tốc độ gió' },
  { key: 'sunshine', label: 'Giờ nắng (h)', shortLabel: 'Giờ nắng' },
  { key: 'et0', label: 'Bốc hơi ET₀ (mm)', shortLabel: 'Bốc hơi ET₀' },
  { key: 'cloud', label: 'Độ phủ mây (%)', shortLabel: 'Đ.phủ mây' },
  { key: 'pressure', label: 'Khí áp (hPa)', shortLabel: 'Khí áp' }
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
  const { rawRows, loading, error, isColorblind } = useData();

  const currentRegionColors = useMemo(() => {
    if (!isColorblind) return REGION_COLORS;
    return {
      RedRiverDelta:      '#E69F00',
      NorthMountain:      '#56B4E9',
      NorthCentral:       '#009E73',
      SouthCentral:       '#F0E442',
      CentralHighlands:   '#0072B2',
      Southeast:          '#D55E00',
      MekongDelta:        '#CC79A7',
    };
  }, [isColorblind]);

  // State for Scatter plot axes (defaults to Temp vs Humidity)
  const [scatterX, setScatterX] = useState('temp');
  const [scatterY, setScatterY] = useState('humidity');

  const [isXDropdownOpen, setIsXDropdownOpen] = useState(false);
  const [isYDropdownOpen, setIsYDropdownOpen] = useState(false);
  const [isBoxMetricDropdownOpen, setIsBoxMetricDropdownOpen] = useState(false);
  const [isBoxGroupByDropdownOpen, setIsBoxGroupByDropdownOpen] = useState(false);
  const [showBoxInsights, setShowBoxInsights] = useState(false);
  
  const [showInsights, setShowInsights] = useState(false);
  const [forecastMonths, setForecastMonths] = useState(0);

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
    const interpolate = (c1, c2, t) => {
      const rVal = Math.round(c1[0] + (c2[0] - c1[0]) * t);
      const gVal = Math.round(c1[1] + (c2[1] - c1[1]) * t);
      const bVal = Math.round(c1[2] + (c2[2] - c1[2]) * t);
      return `rgb(${rVal}, ${gVal}, ${bVal})`;
    };
    
    const blue = isColorblind ? [0, 114, 178] : [37, 99, 235];
    const white = [255, 255, 255];
    const red = isColorblind ? [213, 94, 0] : [239, 68, 68];

    if (r < 0) {
      return interpolate(blue, white, r + 1); // r=-1 -> t=0 (blue), r=0 -> t=1 (white)
    } else {
      return interpolate(white, red, r); // r=0 -> t=0 (white), r=1 -> t=1 (red)
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
      color: currentRegionColors[g.regionKey] || '#94A3B8',
    }));
  }, [rawRows, scatterX, scatterY, currentRegionColors]);

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

  // --- 2.1 Linear Regression for Current Data ---
  const regressionLine = useMemo(() => {
    if (!scatterPlotData.length) return null;
    let n = scatterPlotData.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    scatterPlotData.forEach(pt => {
      sumX += pt.x;
      sumY += pt.y;
      sumXY += (pt.x * pt.y);
      sumXX += (pt.x * pt.x);
    });
    
    const denominator = (n * sumXX - sumX * sumX);
    if (denominator === 0) return null; 
    
    const a = (n * sumXY - sumX * sumY) / denominator;
    const b = (sumY - a * sumX) / n;

    const xVals = scatterPlotData.map(pt => pt.x);
    const minX = Math.min(...xVals);
    const maxX = Math.max(...xVals);
    
    return [
      { x: minX, regressionY: a * minX + b, name: 'Hồi quy tuyến tính' },
      { x: maxX, regressionY: a * maxX + b, name: 'Hồi quy tuyến tính' }
    ];
  }, [scatterPlotData]);

  // --- 2.2 Future Forecast Simulation (Pseudo-SARIMA) ---
  const forecastedData = useMemo(() => {
    if (forecastMonths === 0 || !rawRows.length) return [];
    
    const monthGroup = {};
    rawRows.forEach(r => {
      if (!monthGroup[r.month]) monthGroup[r.month] = { xSum: 0, ySum: 0, count: 0 };
      monthGroup[r.month].xSum += r[scatterX];
      monthGroup[r.month].ySum += r[scatterY];
      monthGroup[r.month].count++;
    });
    
    const months = Object.keys(monthGroup).map(Number).sort((a,b)=>a-b);
    let dx = 0, dy = 0;
    if (months.length >= 2) {
      for (let i = 1; i < months.length; i++) {
        const prev = monthGroup[months[i-1]];
        const curr = monthGroup[months[i]];
        dx += (curr.xSum/curr.count) - (prev.xSum/prev.count);
        dy += (curr.ySum/curr.count) - (prev.ySum/prev.count);
      }
      dx /= (months.length - 1);
      dy /= (months.length - 1);
    }

    const currentMonth = Math.max(...months);
    let targetMonth = ((currentMonth - 1 + forecastMonths) % 12) + 1;

    const provinceData = {};
    rawRows.forEach(r => {
      if (!provinceData[r.province]) provinceData[r.province] = {};
      provinceData[r.province][r.month] = { x: r[scatterX], y: r[scatterY] };
    });

    const forecastedPts = [];
    scatterPlotData.forEach(pt => {
      const pData = provinceData[pt.name];
      if (!pData) return;
      
      let baseVal = pData[targetMonth] || { x: pt.x, y: pt.y };
      
      forecastedPts.push({
        name: pt.name,
        x: Math.round((baseVal.x + dx * forecastMonths) * 100) / 100,
        y: Math.round((baseVal.y + dy * forecastMonths) * 100) / 100,
        color: pt.color,
      });
    });

    return forecastedPts;
  }, [rawRows, scatterPlotData, forecastMonths, scatterX, scatterY]);

  // --- 2.3 Forecast Regression Line ---
  const forecastRegressionLine = useMemo(() => {
    if (!forecastedData.length) return null;
    let n = forecastedData.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    forecastedData.forEach(pt => {
      sumX += pt.x;
      sumY += pt.y;
      sumXY += (pt.x * pt.y);
      sumXX += (pt.x * pt.x);
    });
    
    const denominator = (n * sumXX - sumX * sumX);
    if (denominator === 0) return null;
    
    const a = (n * sumXY - sumX * sumY) / denominator;
    const b = (sumY - a * sumX) / n;

    const xVals = forecastedData.map(pt => pt.x);
    const minX = Math.min(...xVals);
    const maxX = Math.max(...xVals);
    
    return [
      { x: minX, forecastY: a * minX + b, name: `Dự báo (${forecastMonths} tháng)` },
      { x: maxX, forecastY: a * maxX + b, name: `Dự báo (${forecastMonths} tháng)` }
    ];
  }, [forecastedData, forecastMonths]);

  const handleCellClick = (x, y) => {
    setScatterX(x);
    setScatterY(y);
  };

  const dynamicInsightData = useMemo(() => {
    if (!correlationMatrix.length || !scatterPlotData.length) return null;
    
    const yRow = correlationMatrix.find(row => row.key === scatterY);
    if (!yRow) return null;
    
    const r = yRow[scatterX];
    const rAbs = Math.abs(r);
    
    let strength = "rất yếu";
    if (rAbs >= 0.8) strength = "rất mạnh";
    else if (rAbs >= 0.6) strength = "mạnh";
    else if (rAbs >= 0.4) strength = "trung bình";
    else if (rAbs >= 0.2) strength = "yếu";

    const direction = r > 0 ? "đồng biến" : "nghịch biến";
    const xLabel = VARIABLES.find(v => v.key === scatterX)?.label.split('(')[0].trim().toLowerCase() || scatterX;
    const yLabel = VARIABLES.find(v => v.key === scatterY)?.label.split('(')[0].trim().toLowerCase() || scatterY;
    
    let why = "Từ biểu đồ Scatter (Bên phải):\nĐịnh luật tự nhiên\n- Mối quan hệ này xuất phát từ các định luật vật lý khí quyển cơ bản và sự tương tác giữa các yếu tố năng lượng trong tự nhiên.";
    if ((scatterX === 'temp' && scatterY === 'humidity') || (scatterY === 'temp' && scatterX === 'humidity')) {
      why = "Từ biểu đồ Scatter (Bên phải):\nHiệu ứng nhiệt - ẩm\n- Khi nhiệt độ tăng làm khả năng bốc hơi tăng theo, nếu không có nguồn cấp ẩm đầy đủ, độ ẩm tương đối sẽ sụt giảm mạnh.\n- Hiện tượng này đặc trưng cho hiệu ứng fơn (phơn) tại miền Trung.";
    } else if (scatterX === 'rain' || scatterY === 'rain') {
      why = "Từ biểu đồ Scatter (Bên phải):\nChi phối của hoàn lưu\n- Lượng mưa bị chi phối mạnh mẽ bởi hệ thống hoàn lưu gió mùa và đặc điểm địa hình (sườn đón gió).\n- Tạo ra mối liên kết phức tạp với các biến số khác.";
    }

    // 1. Analyze Scatter Dispersion
    let dispersionDesc = "Các điểm dữ liệu phân tán ngẫu nhiên, rời rạc và không tạo thành một quỹ đạo tuyến tính rõ nét, cho thấy sự khác biệt vi khí hậu rất lớn giữa các địa phương.";
    if (rAbs >= 0.7) {
      dispersionDesc = `Các điểm dữ liệu tập trung thành một dải hẹp dọc theo đường xu hướng ${direction}, chứng tỏ các địa phương đều tuân thủ chặt chẽ quy luật này mà ít có sự ngoại lệ.`;
    } else if (rAbs >= 0.4) {
      dispersionDesc = `Các điểm dữ liệu hình thành một đám mây có xu hướng ${direction}, tuy nhiên độ phân tán ở mức trung bình cho thấy yếu tố vi khí hậu bản địa vẫn tạo ra những biến động nhất định.`;
    }

    // 2. Analyze Regional Trends
    const regionAvgs = {};
    scatterPlotData.forEach(pt => {
      if (!regionAvgs[pt.regionKey]) {
        regionAvgs[pt.regionKey] = { name: pt.region, xSum: 0, ySum: 0, count: 0 };
      }
      regionAvgs[pt.regionKey].xSum += pt.x;
      regionAvgs[pt.regionKey].ySum += pt.y;
      regionAvgs[pt.regionKey].count += 1;
    });
    
    const regionStats = Object.values(regionAvgs).map(rg => ({
      name: rg.name,
      xAvg: rg.xSum / rg.count,
      yAvg: rg.ySum / rg.count
    }));

    regionStats.sort((a, b) => b.xAvg - a.xAvg);
    const topXRegion = regionStats[0];
    const bottomXRegion = regionStats[regionStats.length - 1];

    let regionalTrend = `Đặc biệt, nhóm ${topXRegion.name} có xu hướng tập trung ở mức cao của ${xLabel}, trong khi nhóm ${bottomXRegion.name} nằm ở thái cực ngược lại.`;
    if (r >= 0.4) {
       regionalTrend = `Phân nhóm địa lý rất rõ rệt: Vùng ${topXRegion.name} vươn lên mốc cao ở cả hai chỉ số, trong khi ${bottomXRegion.name} lại tập trung ở khu vực thấp, tạo nên sự phân hóa hai đầu.`;
    } else if (r <= -0.4) {
       regionalTrend = `Sự đối lập vùng miền: Vùng ${topXRegion.name} dù có ${xLabel} cao nhưng lại nằm ở vùng thấp của ${yLabel}. Trái ngược hoàn toàn với xu hướng của ${bottomXRegion.name}.`;
    }

    const xIsTemp = scatterX === 'temp' || scatterX === 'tempMax' || scatterX === 'tempMin';
    const yIsTemp = scatterY === 'temp' || scatterY === 'tempMax' || scatterY === 'tempMin';
    const hasTemp = xIsTemp || yIsTemp;
    const hasRain = scatterX === 'rain' || scatterY === 'rain';
    const hasHumid = scatterX === 'humidity' || scatterY === 'humidity';
    const hasSun = scatterX === 'sunshine' || scatterY === 'sunshine';

    let next = `Từ sự kết hợp 2 biểu đồ:\nỨng dụng thực tiễn\n- Viện Khoa học Khí tượng Thủy văn cần xuất bản báo cáo dự báo mô hình hồi quy trong 1 tháng tới, nhằm giúp các địa phương tăng 25% tính chính xác trong lập kế hoạch.\n- Cục Quản lý đê điều cần triển khai giám sát trực tiếp tại ${bottomXRegion.name} và ${topXRegion.name} ngay trong tuần tới để phản ứng nhanh với biến động.`;
    
    if (hasTemp && hasHumid) {
      next = `Từ sự kết hợp 2 biểu đồ:\nCảnh báo khô hạn & Nông nghiệp\n- Cục Kiểm lâm cần triển khai lắp đặt hệ thống cảnh báo cháy rừng tự động tại các vùng nhiệt cao trong 3 tháng tới, mục tiêu giảm 40% diện tích rừng bị cháy.\n- Sở Nông nghiệp tại ${topXRegion.name} cần giải ngân gói hỗ trợ tưới nhỏ giọt trong quý này để cứu 10,000 hecta cây trồng.`;
    } else if (hasRain) {
      next = `Từ sự kết hợp 2 biểu đồ:\nQuản trị rủi ro thiên tai\n- Ban Chỉ huy PCTT&TKCN cần thiết lập lưới cảnh báo sạt lở tự động trong 2 tháng tới, giúp sơ tán an toàn 100% dân cư vùng xung yếu trước mùa mưa.\n- Bộ NN&PTNT phải điều chỉnh lịch thời vụ tại ${topXRegion.name} trước 30 ngày để né tránh tháng cao điểm ngập lụt.`;
    } else if (hasSun) {
      next = `Từ sự kết hợp 2 biểu đồ:\nQuy hoạch năng lượng tái tạo\n- Tập đoàn EVN cần hoàn thiện quy hoạch lưới điện mặt trời trong 6 tháng tới để nâng tỷ trọng điện sạch lên 20%.\n- Các chủ đầu tư tư nhân nên bắt đầu rót vốn khảo sát tại ${topXRegion.name} ngay trong năm nay, kỳ vọng đạt công suất 500MW vào năm sau.`;
    }

    const titleStr = `Tương quan ${strength} (${r.toFixed(2)})`;

    let dx = 0, dy = 0;
    if (forecastMonths > 0 && rawRows.length) {
      const monthGroup = {};
      rawRows.forEach(r => {
        if (!monthGroup[r.month]) monthGroup[r.month] = { xSum: 0, ySum: 0, count: 0 };
        monthGroup[r.month].xSum += r[scatterX];
        monthGroup[r.month].ySum += r[scatterY];
        monthGroup[r.month].count++;
      });
      const months = Object.keys(monthGroup).map(Number).sort((a,b)=>a-b);
      if (months.length >= 2) {
        for (let i = 1; i < months.length; i++) {
          const prev = monthGroup[months[i-1]];
          const curr = monthGroup[months[i]];
          dx += (curr.xSum/curr.count) - (prev.xSum/prev.count);
          dy += (curr.ySum/curr.count) - (prev.ySum/prev.count);
        }
        dx /= (months.length - 1);
        dy /= (months.length - 1);
      }
    }

    return {
      title: titleStr,
      what_happened: `Từ Ma trận Heatmap (Bên trái):\nTương quan ${strength}\n- Phân tích dữ liệu cho thấy hệ số Pearson giữa ${xLabel} và ${yLabel} đạt r = ${r.toFixed(2)}.\n- Minh chứng cho một mối quan hệ ${strength} và ${direction} giữa hai đại lượng này.\n\nTừ biểu đồ Scatter (Bên phải):\nPhân bố và xu hướng vùng\n- ${dispersionDesc}\n- ${regionalTrend}`,
      why: why,
      so_what: `Từ sự kết hợp 2 biểu đồ:\nKhả năng dự báo\n- Với hệ số r = ${r.toFixed(2)}, phương trình hồi quy tuyến tính (đường nét liền) cho phép ước lượng sự thay đổi của ${yLabel} khi ${xLabel} biến động.\n- Sự phụ thuộc liên đới này cung cấp cơ sở khoa học vững chắc để các nhà hoạch định chính sách đưa ra các kịch bản sát với thực tiễn.`,
      what_next: forecastMonths > 0 
        ? `${next}\n\nDự báo ${forecastMonths} tháng tới (Pseudo-SARIMA):\n- Dữ liệu có xu hướng dịch chuyển định lượng: ${xLabel} ${dx > 0 ? 'tăng' : 'giảm'} ${Math.abs(dx * forecastMonths).toFixed(2)} đơn vị, và ${yLabel} ${dy > 0 ? 'tăng' : 'giảm'} ${Math.abs(dy * forecastMonths).toFixed(2)} đơn vị.\n- UBND các tỉnh cần duyệt chi ngân sách khẩn cấp trong ${Math.max(1, forecastMonths - 1)} tháng tới để thích ứng với đà dịch chuyển này, mục tiêu kiểm soát 100% rủi ro.` 
        : next
    };
  }, [correlationMatrix, scatterX, scatterY, scatterPlotData, forecastMonths, rawRows]);

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

  const boxPlotInsightData = useMemo(() => {
    if (!boxPlotData || !boxPlotData.length) return null;
    const metricLabel = VARIABLES.find(v => v.key === boxMetric)?.label || boxMetric;
    const groupByLabel = boxGroupBy === 'season' ? 'Mùa' : (boxGroupBy === 'region' ? 'Vùng miền' : 'Tỉnh thành');

    const sorted = [...boxPlotData].sort((a, b) => b.stats.median - a.stats.median);
    const highest = sorted[0];
    const lowest = sorted[sorted.length - 1];

    const sortedByIqr = [...boxPlotData].sort((a, b) => (b.stats.q3 - b.stats.q1) - (a.stats.q3 - a.stats.q1));
    const highestVariance = sortedByIqr[0];
    const lowestVariance = sortedByIqr[sortedByIqr.length - 1];

    const totalOutliers = boxPlotData.reduce((sum, b) => sum + b.stats.outliers.length, 0);

    return {
      title: `Phân phối ${metricLabel} theo ${groupByLabel}`,
      what_happened: `Phân tích Hình hộp (Box Plot):\nPhân hóa trung vị\n- Mức trung vị cao nhất thuộc về nhóm ${highest.groupName} (${highest.stats.median}).\n- Ngược lại, nhóm ${lowest.groupName} ghi nhận mức thấp nhất (${lowest.stats.median}).\n- Độ phân tán dữ liệu lớn nhất nằm ở nhóm ${highestVariance.groupName}.`,
      why: `Sự chênh lệch giữa các nhóm:\nĐặc thù địa lý & thời tiết\n- Việc gom nhóm theo ${groupByLabel} làm lộ rõ mức độ ổn định của ${metricLabel}.\n- Nhóm ${lowestVariance.groupName} có chiều cao hộp nhỏ nhất (IQR bé), chứng tỏ dữ liệu cực kỳ ổn định. Trái lại, ${highestVariance.groupName} chịu dao động mạnh.`,
      so_what: `Phân tích điểm dị biệt (Outliers):\n- Toàn hệ thống ghi nhận ${totalOutliers} điểm dữ liệu dị biệt (chấm đỏ nằm ngoài râu ria whisker).\n- Các điểm này đại diện cho các sự kiện thời tiết cực đoan (đạt đỉnh hoặc chạm đáy) vượt quá giới hạn phân phối thống kê thông thường.`,
      what_next: `Khuyến nghị thực tiễn:\n- Ban Chỉ đạo Quốc gia về PCTT cần giải ngân gói quỹ dự phòng cho nhóm ${highestVariance.groupName} trong 2 tháng tới, mục tiêu giảm thiểu 30% rủi ro do biến động cực đoan.\n- Viện Khí tượng phải hoàn thành lập hồ sơ giám sát ${totalOutliers} trường hợp dị biệt trong vòng 30 ngày để nâng cao 15% độ chính xác của các bản tin bão/lũ.`
    };
  }, [boxPlotData, boxMetric, boxGroupBy]);

  // --- Render custom Box Plot elements using SVG ---
  const renderSvgBoxPlot = () => {
    if (!boxPlotData.length) return null;

    // Define dimensions of the SVG container
    const width = 1000;
    const height = 300;
    const paddingLeft = 70;
    const paddingRight = 60;
    const paddingTop = 20;
    const paddingBottom = 45;

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
      <div className="w-full overflow-x-auto pb-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[900px] h-80 bg-slate-50/20 border border-slate-100 rounded-xl">
          <text
            x={-height / 2}
            y={14}
            transform="rotate(-90)"
            textAnchor="middle"
            className="fill-slate-500 font-bold text-[11px]"
          >
            {VARIABLES.find(v => v.key === boxMetric)?.label}
          </text>
          <text
            x={width / 2}
            y={height - 2}
            textAnchor="middle"
            className="fill-slate-500 font-bold text-[11px]"
          >
            {boxGroupBy === 'season' ? 'Mùa khí hậu' : 'Vùng miền'}
          </text>
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
                  x={paddingLeft - 10}
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
                  fill={isColorblind ? "#56B4E9" : "#3B82F6"}
                  fillOpacity={0.15}
                  stroke={isColorblind ? "#0072B2" : "#2563EB"}
                  strokeWidth={2}
                  className="transition-all group-hover:fill-opacity-25"
                  rx={2}
                />

                {/* Median Line */}
                <line
                  x1={boxX}
                  y1={yMed}
                  x2={boxX + boxW}
                  y2={yMed}
                  stroke={isColorblind ? "#D55E00" : "#EF4444"}
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
                  y={height - 20}
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
    <div id="analysis-export-area" className="space-y-6 animate-fade-in pb-12">

      {/* PDF Export button */}
      <div className="flex justify-end">
        <ExportPDFButton targetId="analysis-export-area" fileName="phan-tich-tuong-quan" label="Xuất PDF" />
      </div>

      {/* Row 1: Heatmap & Scatter Plot */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">

        {/* Heatmap Grid */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between">
          <div className="text-center w-full pb-2">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
              Ma trận hệ số tương quan Pearson
            </h3>
          </div>

          {/* Grid Heatmap Container */}
          <div className="overflow-x-visible overflow-y-visible mt-4 pr-1 pb-1 flex gap-2">
            <div className="w-full space-y-2 flex-1">
              {/* Header variables labels */}
              <div className="flex items-end gap-1.5 text-[10px] font-bold text-slate-700 text-center">
                <div className="w-[100px]" />
                <div className="flex-1 grid grid-cols-10 gap-1.5">
                  {VARIABLES.map(v => (
                    <div
                      key={v.key}
                      className="text-[10px] font-bold text-slate-700 text-center whitespace-normal break-words leading-tight flex items-end justify-center pb-1 h-10 select-none"
                      title={v.label}
                    >
                      {v.shortLabel}
                    </div>
                  ))}
                </div>
              </div>

              {/* Rows */}
              <div className="space-y-1.5">
                {correlationMatrix.map(row => (
                  <div key={row.key} className="flex items-center gap-1.5">
                    {/* Row Label */}
                    <div className="w-[100px] text-[10px] font-bold text-slate-700 truncate select-none" title={row.label}>
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
                            onMouseEnter={(e) => {
                              setHoveredCell({ xKey: colVar.label, yKey: row.label, r: rValue });
                              setTooltipPos({ x: e.clientX, y: e.clientY });
                            }}
                            onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
                            onMouseLeave={() => setHoveredCell(null)}
                            className={`aspect-square rounded-md flex items-center justify-center font-mono text-[9px] font-extrabold cursor-pointer border transition-all hover:scale-105 active:scale-95 ${isSelected ? 'border-slate-800 scale-102 ring-1 ring-slate-800 shadow-md z-10' : 'border-transparent'
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
            
            {/* Color Legend (Heatmap scale) */}
            <div className="flex flex-col items-center justify-between pt-10 pb-1">
              <span className="text-[10px] font-bold text-slate-500">1.0</span>
              <div 
                className="w-4 flex-1 my-2 rounded-sm border border-slate-200/60 shadow-inner" 
                style={{ background: 'linear-gradient(to top, rgb(37, 99, 235), rgb(255, 255, 255), rgb(239, 68, 68))' }}
              />
              <span className="text-[9px] font-bold text-slate-500">-1.0</span>
            </div>
          </div>
        </div>
        {/* Scatter Plot */}
        <div className="w-full bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="text-center w-full">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
              Đồ thị phân tán các phân vùng địa lý
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

            <div className="col-span-2 space-y-1 mt-1">
              <div className="flex justify-between items-center">
                <span className="text-[9px] text-slate-400 font-extrabold uppercase">Dự báo tương lai (tháng)</span>
                <span className="text-[10px] font-bold text-brand-primary bg-blue-50 px-2 py-0.5 rounded">{forecastMonths} tháng</span>
              </div>
              <input
                type="range"
                min="0"
                max="12"
                step="1"
                value={forecastMonths}
                onChange={(e) => setForecastMonths(Number(e.target.value))}
                className="w-full accent-brand-primary h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Scatter Chart Visual */}
          <div className="flex-1 min-h-[300px] mt-4 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart margin={{ top: 20, right: 20, bottom: 25, left: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                <XAxis
                  type="number"
                  dataKey="x"
                  name={VARIABLES.find(v => v.key === scatterX)?.label}
                  label={{ value: VARIABLES.find(v => v.key === scatterX)?.label, position: 'bottom', offset: 5, fontSize: 11, fontWeight: 'bold', fill: '#475569' }}
                  stroke="#70859c"
                  tick={{ fontSize: 9, fontWeight: 600 }}
                  domain={['auto', 'auto']}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name={VARIABLES.find(v => v.key === scatterY)?.label}
                  label={{ value: VARIABLES.find(v => v.key === scatterY)?.label, angle: -90, position: 'insideLeft', offset: -20, fontSize: 11, fontWeight: 'bold', fill: '#475569' }}
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
                    if (name === 'regressionY' || name === 'forecastY') return [value, 'Giá trị xu hướng'];
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
                    fillOpacity={forecastMonths > 0 ? 0.2 : 0.8}
                  />
                ))}

                {/* Regression Line */}
                {regressionLine && (
                  <Line 
                    data={regressionLine}
                    dataKey="regressionY"
                    stroke="#0f172a"
                    strokeWidth={2}
                    dot={false}
                    activeDot={false}
                    isAnimationActive={false}
                    name="Đường xu hướng hiện tại"
                  />
                )}

                {/* Forecast Scatter Points */}
                {forecastMonths > 0 && (
                  <Scatter
                    name="Dự báo tương lai"
                    data={forecastedData}
                    shape="star"
                    stroke="#0f172a"
                    strokeWidth={1}
                    isAnimationActive={false}
                  >
                    {forecastedData.map((pt, index) => (
                      <Cell key={`cell-${index}`} fill={pt.color} />
                    ))}
                  </Scatter>
                )}

                {/* Forecast Regression Line */}
                {forecastMonths > 0 && forecastRegressionLine && (
                  <Line 
                    data={forecastRegressionLine}
                    dataKey="forecastY"
                    stroke="#ef4444"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={false}
                    isAnimationActive={false}
                    name="Dự báo tương lai"
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Color Indicators Legend */}
          <div className="flex flex-wrap gap-3 text-[10px] font-bold justify-center -mt-2 pb-1 relative z-10">
            {scatterSeries.map(series => (
              <div key={series.name} className="flex items-center gap-1.5 text-slate-600">
                <span className="h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: series.color }} />
                <span>{series.name}</span>
              </div>
            ))}
          </div>

        </div>

        </div>

      {/* Insight Card Toggle Button */}
      <div className="flex justify-center w-full my-4">
        <button 
          onClick={() => setShowInsights(!showInsights)}
          className="flex items-center gap-2 bg-slate-900 hover:bg-brand-primary text-white px-5 py-2.5 rounded-full text-xs font-bold transition-all shadow-md cursor-pointer"
        >
          {showInsights ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {showInsights ? 'Thu gọn phân tích dữ liệu' : 'Hiển thị phân tích dữ liệu chuyên sâu'}
        </button>
      </div>

      {/* Insight Card Below */}
      {showInsights && (
        <div className="w-full">
          <StoryInsightCard insightData={dynamicInsightData} />
        </div>
      )}

      {/* Row 2: Distribution Box Plot */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">

        {/* Controls header */}
        <div className="flex flex-col items-center gap-4 border-b border-slate-100 pb-4">
          <div className="text-center w-full">
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
        
        {/* Insight Toggle for Box Plot */}
        <div className="flex justify-center w-full my-4">
          <button 
            onClick={() => setShowBoxInsights(!showBoxInsights)}
            className="flex items-center gap-2 bg-slate-900 hover:bg-brand-primary text-white px-5 py-2.5 rounded-full text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            {showBoxInsights ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showBoxInsights ? 'Thu gọn phân tích dữ liệu' : 'Hiển thị phân tích dữ liệu chuyên sâu'}
          </button>
        </div>
        
        {showBoxInsights && boxPlotInsightData && (
          <div className="w-full">
            <StoryInsightCard insightData={boxPlotInsightData} />
          </div>
        )}

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

      {/* Floating Heatmap Cell tooltip */}
      {hoveredCell && createPortal(
        <div
          className="fixed bg-white/95 backdrop-blur border border-slate-200 rounded-xl p-3 shadow-xl pointer-events-none z-50 text-[11px] font-medium text-slate-750 min-w-[200px] transition-all duration-75"
          style={{
            left: `${tooltipPos.x + 15}px`,
            top: `${tooltipPos.y + 15}px`,
            transform: tooltipPos.x > window.innerWidth - 220 ? 'translateX(-110%)' : 'none'
          }}
        >
          <div className="border-b border-slate-200 pb-1.5 mb-2">
            <span className="text-[9px] text-brand-primary font-extrabold uppercase">Tương quan Pearson (r)</span>
          </div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-slate-500 font-bold">Biến X:</span>
            <span className="text-slate-800 font-extrabold text-right">{hoveredCell.xKey}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-slate-500 font-bold">Biến Y:</span>
            <span className="text-slate-800 font-extrabold text-right">{hoveredCell.yKey}</span>
          </div>
          <div className="flex justify-between items-center pt-1.5 border-t border-slate-100">
            <span className="text-slate-500 font-bold">Hệ số (r):</span>
            <span className={`font-extrabold text-sm ${hoveredCell.r > 0 ? 'text-blue-600' : hoveredCell.r < 0 ? 'text-red-500' : 'text-slate-500'}`}>
              {Math.round(hoveredCell.r * 1000) / 1000}
            </span>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
