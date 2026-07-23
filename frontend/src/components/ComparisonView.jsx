import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useData, OKABE_ITO_PALETTE } from '../context/DataContext';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ReferenceLine
} from 'recharts';
import StoryInsightCard from './StoryInsightCard';
import {
  Building,
  Compass,
  CalendarDays,
  ArrowUpDown,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const METRICS = [
  { key: 'temp', label: 'Nhiệt độ TB (°C)' },
  { key: 'tempMax', label: 'Nhiệt độ tối đa (°C)' },
  { key: 'tempMin', label: 'Nhiệt độ tối thiểu (°C)' },
  { key: 'rain', label: 'Lượng mưa (mm)' },
  { key: 'humidity', label: 'Độ ẩm (%)' },
  { key: 'wind', label: 'Tốc độ gió (km/h)' },
  { key: 'sunshine', label: 'Số giờ nắng (h)' },
  { key: 'et0', label: 'Lượng bốc hơi ET₀ (mm)' }
];

const REGION_COLORS = {
  RedRiverDelta: '#6D28D9', // Darker Purple
  NorthMountain: '#D97706', // Darker Amber
  NorthCentral: '#1D4ED8', // Darker Royal Blue
  SouthCentral: '#0891B2', // Darker Cyan
  CentralHighlands: '#047857', // Darker Emerald
  Southeast: '#BE185D', // Darker Pink/Magenta
  MekongDelta: '#B91C1C', // Darker Red
};

const REGION_NAMES = {
  RedRiverDelta: 'Đồng bằng sông Hồng',
  NorthMountain: 'Trung du miền núi Bắc Bộ',
  NorthCentral: 'Bắc Trung Bộ',
  SouthCentral: 'Duyên hải Nam Trung Bộ',
  CentralHighlands: 'Tây Nguyên',
  Southeast: 'Đông Nam Bộ',
  MekongDelta: 'Đồng bằng sông Cửu Long',
};

// Logical maximums for variables used to normalize radar chart
const METRIC_MAXIMA = {
  temp: 40,
  rain: 15,
  humidity: 100,
  wind: 25,
  sunshine: 12,
  et0: 8
};

const RADAR_METRIC_LABELS = {
  temp: 'Nhiệt độ (°C)',
  rain: 'Lượng mưa (mm)',
  humidity: 'Độ ẩm (%)',
  wind: 'Gió (km/h)',
  sunshine: 'Nắng (h)',
  et0: 'Bốc hơi (mm)'
};

export default function ComparisonView() {
  const { rawRows, loading, error, isColorblind } = useData();

  const currentRegionColors = useMemo(() => {
    if (!isColorblind) return REGION_COLORS;
    return {
      RedRiverDelta: '#E69F00', // Orange
      NorthMountain: '#56B4E9', // Sky Blue
      NorthCentral: '#009E73', // Bluish Green
      SouthCentral: '#F0E442', // Yellow
      CentralHighlands: '#0072B2', // Blue
      Southeast: '#D55E00', // Vermilion
      MekongDelta: '#CC79A7', // Reddish Purple
    };
  }, [isColorblind]);

  const RADAR_COLORS = isColorblind
    ? { c1: '#0072B2', c2: '#D55E00', c3: '#009E73' }
    : { c1: '#3B82F6', c2: '#EF4444', c3: '#10B981' };

  // Sub-tabs: 'provinces' | 'regions' | 'seasons'
  const [subTab, setSubTab] = useState('provinces');

  // Province comparison states
  const [activeMetric, setActiveMetric] = useState('temp');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' | 'asc'
  const [radarProvinces, setRadarProvinces] = useState([]);

  // Region and Season comparison states
  const [radarRegions, setRadarRegions] = useState(['Đồng bằng sông Hồng', 'Đông Nam Bộ']);
  const [radarSeasons, setRadarSeasons] = useState(['Mùa Hè', 'Mùa Đông']);

  // Metric dropdown custom UI states
  const [isMetricDropdownOpen, setIsMetricDropdownOpen] = useState(false);
  const metricDropdownRef = useRef(null);

  const [showInsights, setShowInsights] = useState(false);

  // General utility helpers
  const avg = arr => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
  const round = n => Math.round(n * 100) / 100;

  // Close metric dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (metricDropdownRef.current && !metricDropdownRef.current.contains(event.target)) {
        setIsMetricDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- Calculate average metrics for all 34 provinces ---
  const provinceAverages = useMemo(() => {
    if (!rawRows.length) return [];

    const byProvince = {};
    rawRows.forEach(row => {
      const p = row.province;
      if (!byProvince[p]) {
        byProvince[p] = {
          name: p,
          regionKey: row.regionKey,
          region: row.region,
          temp: [], rain: [], humidity: [], wind: [], sunshine: [], et0: [], tempMax: [], tempMin: []
        };
      }
      byProvince[p].temp.push(row.temp);
      byProvince[p].tempMax.push(row.tempMax);
      byProvince[p].tempMin.push(row.tempMin);
      byProvince[p].rain.push(row.rain);
      byProvince[p].humidity.push(row.humidity);
      byProvince[p].wind.push(row.wind);
      byProvince[p].sunshine.push(row.sunshine);
      byProvince[p].et0.push(row.et0);
    });



    return Object.values(byProvince).map(p => ({
      name: p.name,
      regionKey: p.regionKey,
      region: p.region,
      temp: round(avg(p.temp)),
      tempMax: round(avg(p.tempMax)),
      tempMin: round(avg(p.tempMin)),
      rain: round(avg(p.rain)),
      humidity: Math.round(avg(p.humidity)),
      wind: round(avg(p.wind)),
      sunshine: round(avg(p.sunshine)),
      et0: round(avg(p.et0)),
      color: currentRegionColors[p.regionKey] || '#94A3B8'
    }));
  }, [rawRows]);

  // Sorted province data for horizontal bar chart
  const sortedProvinceData = useMemo(() => {
    const data = provinceAverages.map(p => ({ ...p }));
    data.sort((a, b) => {
      const valA = a[activeMetric];
      const valB = b[activeMetric];
      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });

    // Assign gradient colors from light to dark based on value
    const n = data.length;
    data.forEach((entry, index) => {
      if (isColorblind) {
        // Keep the region-based colorblind color which was already assigned in provinceAverages
        return;
      }

      // t ranges from 0 (lowest value) to 1 (highest value)
      let t = 0;
      if (n > 1) {
        t = sortOrder === 'desc' ? (n - 1 - index) / (n - 1) : index / (n - 1);
      }

      // Interpolate from Cyan-200 (light) to Blue-900 (dark)
      const r = Math.round(165 + (30 - 165) * t);
      const g = Math.round(243 + (58 - 243) * t);
      const b = Math.round(252 + (138 - 252) * t);

      entry.color = `rgb(${r}, ${g}, ${b})`;
    });

    return data;
  }, [provinceAverages, activeMetric, sortOrder, isColorblind]);

  // Automatically select the highest ranking province whenever the sorted data changes (e.g. on active metric switch)
  useEffect(() => {
    if (sortedProvinceData.length > 0) {
      setRadarProvinces([sortedProvinceData[0].name]);
    }
  }, [sortedProvinceData]);

  // --- Calculate Regional Aggregates for Tab 2 ---
  const regionalData = useMemo(() => {
    if (!rawRows.length) return [];

    const byRegion = {};
    rawRows.forEach(row => {
      const r = row.regionKey;
      if (!byRegion[r]) {
        byRegion[r] = { name: REGION_NAMES[r] || row.region, temp: [], rain: [], humidity: [], wind: [] };
      }
      byRegion[r].temp.push(row.temp);
      byRegion[r].rain.push(row.rain);
      byRegion[r].humidity.push(row.humidity);
      byRegion[r].wind.push(row.wind);
    });

    const avg = arr => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;

    return Object.values(byRegion).map(r => {
      const tAvg = avg(r.temp);
      const rAvg = avg(r.rain);
      const hAvg = avg(r.humidity);
      const wAvg = avg(r.wind);

      // Normalization factor (0-100 index) so that they can be plotted side-by-side beautifully
      return {
        name: r.name,
        // Raw values
        'Nhiệt độ (°C)': Math.round(tAvg * 10) / 10,
        'Lượng mưa (mm)': Math.round(rAvg * 100) / 100,
        'Độ ẩm (%)': Math.round(hAvg),
        'Tốc độ gió (km/h)': Math.round(wAvg * 10) / 10,
        // Normalized values for visualization
        'Nhiệt độ (chỉ số)': Math.round((tAvg / METRIC_MAXIMA.temp) * 100),
        'Lượng mưa (chỉ số)': Math.round((rAvg / METRIC_MAXIMA.rain) * 100),
        'Độ ẩm (chỉ số)': Math.round((hAvg / METRIC_MAXIMA.humidity) * 100),
        'Tốc độ gió (chỉ số)': Math.round((wAvg / METRIC_MAXIMA.wind) * 100)
      };
    });
  }, [rawRows]);

  const dynamicInsightData = useMemo(() => {
    const metricObj = METRICS.find(m => m.key === activeMetric);
    if (!sortedProvinceData.length || !metricObj) return null;

    const isDesc = sortOrder === 'desc';
    const topProv = sortedProvinceData[0];
    const bottomProv = sortedProvinceData[sortedProvinceData.length - 1];

    const metricLabel = metricObj.label.split('(')[0].trim().toLowerCase();
    const unitMatch = metricObj.label.match(/\(([^)]+)\)/);
    const unit = unitMatch ? unitMatch[1] : '';

    const avgVal = sortedProvinceData.reduce((s, p) => s + p[activeMetric], 0) / sortedProvinceData.length;
    const diffPct = avgVal ? Math.round(Math.abs((topProv[activeMetric] - avgVal) / avgVal) * 100) : 0;

    let why = "Từ biểu đồ cột (Bên trái):\nPhân hóa địa lý\n- Vị trí địa lý trải dài và cấu trúc địa hình đan xen phức tạp đã tạo nên sự khác biệt mạnh mẽ về vi khí hậu giữa các tỉnh thành.";
    let soWhat = "Từ biểu đồ cột (Bên trái):\nThách thức phát triển\n- Đe dọa trực tiếp đến chuỗi cung ứng nông sản và quy hoạch vùng.\n- Đòi hỏi chiến lược đầu tư hạ tầng linh hoạt, không thể áp dụng chung một khuôn mẫu.";
    let next = "Từ biểu đồ cột (Bên trái):\nGiải pháp quy hoạch\n- Tái cấu trúc mô hình sản xuất nông nghiệp theo đặc tính từng nhóm tỉnh.\n- Phân bổ lại nguồn nước dự trữ chiến lược sao cho phù hợp với khả năng chịu đựng của từng vùng.";

    if (activeMetric === 'temp' || activeMetric === 'tempMax' || activeMetric === 'tempMin' || activeMetric === 'sunshine') {
      why = "Từ biểu đồ cột (Bên trái):\nSự chi phối của vĩ độ và hoàn lưu\n- Phản ánh rõ rệt sự phân hóa khí hậu giữa vùng chịu ảnh hưởng của gió mùa (phía Bắc) và vùng nhiệt đới cận xích đạo (phía Nam).";
      soWhat = `Từ biểu đồ cột (Bên trái):\nTác động sinh thái học\n- Làm thay đổi chu kỳ sinh trưởng tự nhiên của hệ sinh thái động thực vật.\n- Gây xáo trộn nghiêm trọng đến năng suất nông nghiệp và định hướng mùa vụ giữa các khu vực.`;
      next = `Từ biểu đồ cột (Bên trái):\nThích ứng sinh học\n- Khuyến nghị chuyển đổi cơ cấu giống cây trồng, vật nuôi có khả năng chịu nhiệt/chịu lạnh phù hợp.\n- Ứng dụng khẩn cấp các giải pháp nông nghiệp công nghệ cao (nhà màng kiểm soát vi khí hậu).`;
    } else if (activeMetric === 'rain' || activeMetric === 'humidity' || activeMetric === 'wind') {
      why = "Từ biểu đồ cột (Bên trái):\nHiệu ứng địa hình và hướng gió\n- Địa hình đặc thù (như rặng Trường Sơn) kết hợp với hướng gió thịnh hành đã tạo ra sự đối lập mạnh mẽ về lượng ẩm giữa sườn đón gió và khuất gió.";
      soWhat = `Từ biểu đồ cột (Bên trái):\nRủi ro thời tiết cực đoan\n- Trực tiếp gia tăng rủi ro hạn hán thiếu nước ở vùng trũng và lũ quét/ngập úng ở vùng núi cao.\n- Gây áp lực nặng nề lên cấu trúc hệ sinh thái và nguồn cung nước sinh hoạt.`;
      next = `Từ biểu đồ cột (Bên trái):\nQuy hoạch công trình thủy lợi\n- Ưu tiên cấp thiết xây dựng các công trình hồ chứa, đập điều tiết đa mục tiêu.\n- Thiết lập mạng lưới trạm cảm biến cảnh báo sớm rủi ro thời tiết cực đoan.`;
    }

    // --- Phân tích Radar Chart & Liên hệ giữa 2 biểu đồ ---
    let radarWhat = '';
    let radarWhy = '';
    let radarSoWhat = '';
    let radarNext = '';

    if (radarProvinces.length === 1) {
      radarWhat = `\nTừ biểu đồ Radar (Bên phải):\nĐặc tính riêng lẻ\n- Biểu đồ phác họa "dấu vân tay khí hậu" độc bản của ${radarProvinces[0]}.\n- Hãy nhấp chọn thêm các tỉnh để kích hoạt so sánh.`;
      radarWhy = `\nTừ biểu đồ Radar (Bên phải):\nCơ sở hình thành đặc thù\n- Sự hội tụ của các điều kiện tự nhiên tại một điểm nút địa lý duy nhất tạo ra tổ hợp vi khí hậu không trùng lặp.`;
      radarSoWhat = `\nTừ biểu đồ Radar (Bên phải):\nLợi thế cạnh tranh\n- Làm nền tảng để xác định tiềm năng kinh tế sinh thái đặc thù của ${radarProvinces[0]}.`;
      radarNext = `\nTừ biểu đồ Radar (Bên phải):\nChiến lược bản địa hóa\n- Tập trung khai thác thế mạnh đặc thù thay vì áp dụng máy móc mô hình của địa phương khác.`;
    } else if (radarProvinces.length > 1) {
      const p1 = provinceAverages.find(p => p.name === radarProvinces[0]);
      const p2 = provinceAverages.find(p => p.name === radarProvinces[1]);

      if (p1 && p2) {
        const keys = ['temp', 'rain', 'humidity', 'wind', 'sunshine', 'et0'];
        let maxDiff = 0;
        let diffKey = '';
        keys.forEach(k => {
          const normDiff = Math.abs(p1[k] - p2[k]) / (METRIC_MAXIMA[k] || 100);
          if (normDiff > maxDiff) {
            maxDiff = normDiff;
            diffKey = k;
          }
        });

        const radarMetricObj = METRICS.find(m => m.key === diffKey);
        const radarMetricLabel = radarMetricObj ? radarMetricObj.label.split('(')[0].trim().toLowerCase() : '';
        const radarUnitMatch = radarMetricObj?.label?.match(/\(([^)]+)\)/);
        const radarUnit = radarUnitMatch ? radarUnitMatch[1] : '';

        const p1Val = p1[diffKey];
        const p2Val = p2[diffKey];

        radarWhat = `\nTừ biểu đồ Radar (Bên phải):\nSo sánh đa chiều\n- Chênh lệch lớn nhất giữa ${p1.name} và ${p2.name} nằm ở yếu tố ${radarMetricLabel}: ${p1.name} đạt ${p1Val} ${radarUnit} trong khi ${p2.name} là ${p2Val} ${radarUnit}.`;
        radarWhy = `\nTừ biểu đồ Radar (Bên phải):\nMối tương quan hệ thống\n- Nguyên lý "bình thông nhau": Chênh lệch về ${metricLabel} (biểu đồ trái) có tính liên kết và thường làm dịch chuyển sâu sắc đến ${radarMetricLabel} (biểu đồ phải).`;
        radarSoWhat = `\nTừ biểu đồ Radar (Bên phải):\nNguy cơ tổn thương chéo\n- Cảnh báo sự mất cân bằng sinh thái: Rủi ro không chỉ giới hạn ở ${metricLabel} mà sẽ lan rộng sang ${radarMetricLabel}, tạo phản ứng dây chuyền.`;
        radarNext = `\nTừ biểu đồ Radar (Bên phải):\nLiên kết vùng\n- Thay vì ứng phó đơn lẻ, cần xây dựng cơ chế phối hợp và chia sẻ rủi ro giữa ${p1.name} và ${p2.name}.`;
      }
    }

    const titleStr = `Khoảng cách cực đoan: ${topProv.name} dẫn đầu`;

    const what_happened = `${titleStr}\nTừ biểu đồ cột (Bên trái):\n- ${topProv.name} chạm mức cao nhất với ${topProv[activeMetric]} ${unit}, tạo cách biệt ${diffPct}% so với TB toàn quốc.\n- Phía đối lập, ${bottomProv.name} chạm đáy chỉ với ${bottomProv[activeMetric]} ${unit}.\n- Trung bình toàn quốc duy trì ở mức ${Math.round(avgVal * 10) / 10} ${unit}.${radarWhat}`;

    return {
      title: titleStr,
      what_happened,
      why: `${why}${radarWhy}`,
      so_what: `${soWhat}${radarSoWhat}`,
      what_next: `${next}${radarNext}`,
      avgVal
    };
  }, [sortedProvinceData, activeMetric, sortOrder, radarProvinces, provinceAverages]);

  // --- Calculate Seasonal Aggregates for Tab 3 ---
  const seasonalData = useMemo(() => {
    if (!rawRows.length) return [];

    const bySeason = {};
    rawRows.forEach(row => {
      const s = row.season;
      if (!s) return;
      if (!bySeason[s]) {
        bySeason[s] = { name: `Mùa ${s}`, temp: [], rain: [], humidity: [], wind: [] };
      }
      bySeason[s].temp.push(row.temp);
      bySeason[s].rain.push(row.rain);
      bySeason[s].humidity.push(row.humidity);
      bySeason[s].wind.push(row.wind);
    });

    const avg = arr => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;

    return Object.values(bySeason).map(s => {
      const tAvg = avg(s.temp);
      const rAvg = avg(s.rain);
      const hAvg = avg(s.humidity);
      const wAvg = avg(s.wind);

      return {
        name: s.name,
        // Raw values
        'Nhiệt độ (°C)': Math.round(tAvg * 10) / 10,
        'Lượng mưa (mm)': Math.round(rAvg * 100) / 100,
        'Độ ẩm (%)': Math.round(hAvg),
        'Tốc độ gió (km/h)': Math.round(wAvg * 10) / 10,
        // Normalized index
        'Nhiệt độ (chỉ số)': Math.round((tAvg / METRIC_MAXIMA.temp) * 100),
        'Lượng mưa (chỉ số)': Math.round((rAvg / METRIC_MAXIMA.rain) * 100),
        'Độ ẩm (chỉ số)': Math.round((hAvg / METRIC_MAXIMA.humidity) * 100),
        'Tốc độ gió (chỉ số)': Math.round((wAvg / METRIC_MAXIMA.wind) * 100)
      };
    });
  }, [rawRows]);

  // --- Generate Radar Chart Data for Tab 1 ---
  const radarChartData = useMemo(() => {
    if (radarProvinces.length === 0) return [];

    // Find average records for selected provinces
    const p1 = provinceAverages.find(p => p.name === radarProvinces[0]);
    const p2 = provinceAverages.find(p => p.name === radarProvinces[1]);
    const p3 = provinceAverages.find(p => p.name === radarProvinces[2]);

    const keys = ['temp', 'rain', 'humidity', 'wind', 'sunshine', 'et0'];

    return keys.map(key => {
      const maxVal = METRIC_MAXIMA[key] || 100;

      const res = {
        subject: RADAR_METRIC_LABELS[key] || key,
        fullMark: 100
      };

      if (p1) {
        // Store raw value for tooltip, normalized value (0-100) for drawing
        res[`raw_${p1.name}`] = p1[key];
        res[p1.name] = Math.min(Math.round((p1[key] / maxVal) * 100), 100);
      }
      if (p2) {
        res[`raw_${p2.name}`] = p2[key];
        res[p2.name] = Math.min(Math.round((p2[key] / maxVal) * 100), 100);
      }
      if (p3) {
        res[`raw_${p3.name}`] = p3[key];
        res[p3.name] = Math.min(Math.round((p3[key] / maxVal) * 100), 100);
      }

      return res;
    });
  }, [provinceAverages, radarProvinces]);

  // Toggle selected provinces on radar chart (Limit to max 3)
  const toggleRadarProvince = (prov) => {
    setRadarProvinces(prev => {
      if (prev.includes(prov)) {
        if (prev.length <= 1) return prev; // Keep at least one
        return prev.filter(p => p !== prov);
      } else {
        if (prev.length >= 3) {
          // Replace the oldest one (slide window)
          return [prev[1], prev[2], prov];
        }
        return [...prev, prov];
      }
    });
  };

  // --- Generate Radar Chart Data for Tab 2 (Regions) ---
  const radarRegionsData = useMemo(() => {
    if (radarRegions.length === 0) return [];

    const keys = ['temp', 'rain', 'humidity', 'wind', 'sunshine', 'et0'];
    const regionAvgs = {};

    radarRegions.forEach(rName => {
      const rKey = Object.keys(REGION_NAMES).find(k => REGION_NAMES[k] === rName) || '';
      const rRows = rawRows.filter(row => row.regionKey === rKey || row.region === rName);

      if (rRows.length > 0) {
        regionAvgs[rName] = {
          temp: avg(rRows.map(r => r.temp)),
          rain: avg(rRows.map(r => r.rain)),
          humidity: avg(rRows.map(r => r.humidity)),
          wind: avg(rRows.map(r => r.wind)),
          sunshine: avg(rRows.map(r => r.sunshine)),
          et0: avg(rRows.map(r => r.et0))
        };
      }
    });

    const p1 = regionAvgs[radarRegions[0]];
    const p2 = regionAvgs[radarRegions[1]];
    const p3 = regionAvgs[radarRegions[2]];

    return keys.map(key => {
      const maxVal = METRIC_MAXIMA[key] || 100;
      const res = {
        subject: RADAR_METRIC_LABELS[key] || key,
        fullMark: 100
      };

      if (p1) {
        res[`raw_${radarRegions[0]}`] = Math.round(p1[key] * 100) / 100;
        res[radarRegions[0]] = Math.min(Math.round((p1[key] / maxVal) * 100), 100);
      }
      if (p2) {
        res[`raw_${radarRegions[1]}`] = Math.round(p2[key] * 100) / 100;
        res[radarRegions[1]] = Math.min(Math.round((p2[key] / maxVal) * 100), 100);
      }
      if (p3) {
        res[`raw_${radarRegions[2]}`] = Math.round(p3[key] * 100) / 100;
        res[radarRegions[2]] = Math.min(Math.round((p3[key] / maxVal) * 100), 100);
      }
      return res;
    });
  }, [rawRows, radarRegions]);

  // --- Generate Radar Chart Data for Tab 3 (Seasons) ---
  const radarSeasonsData = useMemo(() => {
    if (radarSeasons.length === 0) return [];

    const keys = ['temp', 'rain', 'humidity', 'wind', 'sunshine', 'et0'];
    const seasonAvgs = {};

    radarSeasons.forEach(sName => {
      const sVal = sName.replace('Mùa ', '');
      const sRows = rawRows.filter(row => row.season === sVal);

      if (sRows.length > 0) {
        seasonAvgs[sName] = {
          temp: avg(sRows.map(r => r.temp)),
          rain: avg(sRows.map(r => r.rain)),
          humidity: avg(sRows.map(r => r.humidity)),
          wind: avg(sRows.map(r => r.wind)),
          sunshine: avg(sRows.map(r => r.sunshine)),
          et0: avg(sRows.map(r => r.et0))
        };
      }
    });

    const p1 = seasonAvgs[radarSeasons[0]];
    const p2 = seasonAvgs[radarSeasons[1]];
    const p3 = seasonAvgs[radarSeasons[2]];

    return keys.map(key => {
      const maxVal = METRIC_MAXIMA[key] || 100;
      const res = {
        subject: RADAR_METRIC_LABELS[key] || key,
        fullMark: 100
      };

      if (p1) {
        res[`raw_${radarSeasons[0]}`] = Math.round(p1[key] * 100) / 100;
        res[radarSeasons[0]] = Math.min(Math.round((p1[key] / maxVal) * 100), 100);
      }
      if (p2) {
        res[`raw_${radarSeasons[1]}`] = Math.round(p2[key] * 100) / 100;
        res[radarSeasons[1]] = Math.min(Math.round((p2[key] / maxVal) * 100), 100);
      }
      if (p3) {
        res[`raw_${radarSeasons[2]}`] = Math.round(p3[key] * 100) / 100;
        res[radarSeasons[2]] = Math.min(Math.round((p3[key] / maxVal) * 100), 100);
      }
      return res;
    });
  }, [rawRows, radarSeasons]);

  // --- Generate Insight Data for Regions ---
  const dynamicRegionInsightData = useMemo(() => {
    if (!regionalData.length) return null;

    let maxTempRegion = regionalData[0];
    let maxRainRegion = regionalData[0];

    regionalData.forEach(r => {
      if (r['Nhiệt độ (°C)'] > maxTempRegion['Nhiệt độ (°C)']) maxTempRegion = r;
      if (r['Lượng mưa (mm)'] > maxRainRegion['Lượng mưa (mm)']) maxRainRegion = r;
    });

    const titleStr = "Phân hóa khí hậu cấp vùng";
    let what_happened = `${titleStr}\nTừ biểu đồ cột (Bên trái):\n- Nền nhiệt cao nhất thuộc về ${maxTempRegion.name} (${maxTempRegion['Nhiệt độ (°C)']} °C).\n- Lượng mưa dồi dào nhất ghi nhận tại ${maxRainRegion.name} (${maxRainRegion['Lượng mưa (mm)']} mm).`;

    let why = "Từ biểu đồ cột (Bên trái):\nCơ sở phân hóa\n- Vị trí địa lý trải dài và cấu trúc địa hình đan xen (như dãy Trường Sơn) đã chia cắt Việt Nam thành các đới khí hậu chuyên biệt.";
    let soWhat = "Từ biểu đồ cột (Bên trái):\nThách thức vĩ mô\n- Đòi hỏi chiến lược quy hoạch kinh tế - xã hội phải bám sát đặc thù sinh thái của từng vùng.";
    let next = "Từ biểu đồ cột (Bên trái):\nChiến lược cấp vùng\n- Bộ Kế hoạch và Đầu tư (MPI) cần ban hành quy hoạch kinh tế theo lợi thế khí hậu vùng trong vòng 1 năm tới, nhằm tăng 15% hiệu quả đầu tư nông nghiệp.";

    let radarWhat = '';
    let radarWhy = '';
    let radarSoWhat = '';
    let radarNext = '';

    if (radarRegions.length === 1) {
      radarWhat = `\nTừ biểu đồ Radar (Bên phải):\nĐặc tính vùng\n- Biểu đồ phác họa "dấu vân tay khí hậu" đặc trưng của ${radarRegions[0]}.\n- Hãy nhấp chọn thêm vùng để so sánh.`;
      radarWhy = `\nTừ biểu đồ Radar (Bên phải):\nCơ sở hình thành\n- Sự hội tụ của các điều kiện tự nhiên tại một tọa độ địa lý duy nhất tạo ra vi khí hậu không trùng lặp.`;
      radarSoWhat = `\nTừ biểu đồ Radar (Bên phải):\nLợi thế cạnh tranh\n- Làm nền tảng để xác định tiềm năng kinh tế sinh thái đặc thù của vùng.`;
      radarNext = `\nTừ biểu đồ Radar (Bên phải):\nChiến lược bản địa hóa\n- Tập trung phát huy thế mạnh đặc thù thay vì áp dụng máy móc mô hình của vùng khác.`;
    } else if (radarRegions.length > 1) {
      let maxDiff = 0;
      let diffSubject = '';
      let p1Val = 0, p2Val = 0;

      radarRegionsData.forEach(item => {
        const diff = Math.abs(item[radarRegions[0]] - item[radarRegions[1]]);
        if (diff > maxDiff) {
          maxDiff = diff;
          diffSubject = item.subject;
          p1Val = item[`raw_${radarRegions[0]}`];
          p2Val = item[`raw_${radarRegions[1]}`];
        }
      });

      radarWhat = `\nTừ biểu đồ Radar (Bên phải):\nSo sánh đa chiều\n- Độ lệch pha lớn nhất giữa ${radarRegions[0]} và ${radarRegions[1]} nằm ở ${diffSubject}: ${radarRegions[0]} đạt ${p1Val} trong khi ${radarRegions[1]} là ${p2Val}.`;
      radarWhy = `\nTừ biểu đồ Radar (Bên phải):\nMối tương quan hệ thống\n- Sự chênh lệch về ${diffSubject} phản ánh bản chất đối lập về cấu trúc sinh thái giữa 2 vùng.`;
      radarSoWhat = `\nTừ biểu đồ Radar (Bên phải):\nNguy cơ đứt gãy chuỗi cung ứng\n- Sự đối lập này có thể gây xáo trộn dòng luân chuyển hàng hóa nông sản và năng lượng giữa ${radarRegions[0]} và ${radarRegions[1]}.`;
      radarNext = `\nTừ biểu đồ Radar (Bên phải):\nLiên kết đa vùng\n- Ban chỉ đạo liên vùng cần xây dựng cơ chế chia sẻ nguồn nước/năng lượng trong 6 tháng tới, hướng tới bù đắp 30% chênh lệch tài nguyên giữa các vùng.`;
    }

    return {
      title: titleStr,
      what_happened: `${what_happened}${radarWhat}`,
      why: `${why}${radarWhy}`,
      so_what: `${soWhat}${radarSoWhat}`,
      what_next: `${next}${radarNext}`,
    };
  }, [regionalData, radarRegions, radarRegionsData]);

  // --- Generate Insight Data for Seasons ---
  const dynamicSeasonInsightData = useMemo(() => {
    if (!seasonalData.length) return null;

    let maxTempSeason = seasonalData[0];
    let maxRainSeason = seasonalData[0];

    seasonalData.forEach(s => {
      if (s['Nhiệt độ (°C)'] > maxTempSeason['Nhiệt độ (°C)']) maxTempSeason = s;
      if (s['Lượng mưa (mm)'] > maxRainSeason['Lượng mưa (mm)']) maxRainSeason = s;
    });

    const titleStr = "Nhịp điệu thời tiết theo mùa";
    let what_happened = `${titleStr}\nTừ biểu đồ cột (Bên trái):\n- ${maxTempSeason.name} khắc nghiệt nhất với nền nhiệt ${maxTempSeason['Nhiệt độ (°C)']} °C.\n- ${maxRainSeason.name} tập trung lượng ẩm lớn nhất, đạt ${maxRainSeason['Lượng mưa (mm)']} mm.`;

    let why = "Từ biểu đồ cột (Bên trái):\nCơ chế hoàn lưu\n- Chuyển động biểu kiến của Mặt Trời kết hợp với sự luân phiên của các khối không khí tạo ra nhịp điệu 4 mùa rõ rệt.";
    let soWhat = "Từ biểu đồ cột (Bên trái):\nChu kỳ sinh thái\n- Quy định khắt khe lịch thời vụ nông nghiệp và chu kỳ bùng phát dịch bệnh theo mùa.";
    let next = "Từ biểu đồ cột (Bên trái):\nQuy hoạch mùa vụ\n- Bộ Nông nghiệp & Phát triển Nông thôn (MARD) cần cập nhật lịch thời vụ mới trước 2 tháng trước khi giao mùa, mục tiêu đảm bảo 95% diện tích gieo trồng an toàn.";

    let radarWhat = '';
    let radarWhy = '';
    let radarSoWhat = '';
    let radarNext = '';

    if (radarSeasons.length === 1) {
      radarWhat = `\nTừ biểu đồ Radar (Bên phải):\nNhận diện hình thái\n- Biểu đồ phác họa bộ khung khí hậu đặc trưng của ${radarSeasons[0]}.\n- Hãy nhấp chọn thêm mùa khác để đánh giá độ biến động.`;
      radarWhy = `\nTừ biểu đồ Radar (Bên phải):\nYếu tố chi phối\n- Đặc tính được định hình bởi hướng gió thịnh hành và cường độ bức xạ Mặt Trời tại thời điểm đó.`;
      radarSoWhat = `\nTừ biểu đồ Radar (Bên phải):\nTác động tập trung\n- Đây là giai đoạn cao điểm quyết định năng suất sinh học hoặc rủi ro thiên tai trong năm.`;
      radarNext = `\nTừ biểu đồ Radar (Bên phải):\nKế hoạch hành động\n- Chính quyền địa phương cần triển khai kế hoạch phòng chống thiên tai đặc thù trong 3 tháng tới, kỳ vọng giảm 20% thiệt hại do cực đoan thời tiết.`;
    } else if (radarSeasons.length > 1) {
      let maxDiff = 0;
      let diffSubject = '';
      let p1Val = 0, p2Val = 0;

      radarSeasonsData.forEach(item => {
        const diff = Math.abs(item[radarSeasons[0]] - item[radarSeasons[1]]);
        if (diff > maxDiff) {
          maxDiff = diff;
          diffSubject = item.subject;
          p1Val = item[`raw_${radarSeasons[0]}`];
          p2Val = item[`raw_${radarSeasons[1]}`];
        }
      });

      radarWhat = `\nTừ biểu đồ Radar (Bên phải):\nBiến động giao mùa\n- Chuyển biến khốc liệt nhất giữa ${radarSeasons[0]} và ${radarSeasons[1]} nằm ở ${diffSubject}: Từ mức ${p1Val} thay đổi đột ngột sang ${p2Val}.`;
      radarWhy = `\nTừ biểu đồ Radar (Bên phải):\nXung đột hoàn lưu\n- Sự tranh chấp giữa các khối không khí nóng-lạnh hoặc ẩm-khô là tác nhân chính gây ra biên độ dao động lớn về ${diffSubject}.`;
      radarSoWhat = `\nTừ biểu đồ Radar (Bên phải):\nSốc sinh lý sinh thái\n- Sự thay đổi đột ngột về ${diffSubject} dễ gây hiện tượng "sốc nhiệt/ẩm", làm bùng phát dịch bệnh.`;
      radarNext = `\nTừ biểu đồ Radar (Bên phải):\nKịch bản phòng vệ\n- Cơ quan khí tượng cần phát đi bản tin cảnh báo sốc sinh lý trước 10 ngày giao mùa, giúp người dân chuẩn bị che chắn, kỳ vọng bảo vệ 80% hoa màu.`;
    }

    return {
      title: titleStr,
      what_happened: `${what_happened}${radarWhat}`,
      why: `${why}${radarWhy}`,
      so_what: `${soWhat}${radarSoWhat}`,
      what_next: `${next}${radarNext}`,
    };
  }, [seasonalData, radarSeasons, radarSeasonsData]);

  // Toggle selected regions on radar chart (Limit to max 3)
  const toggleRadarRegion = (regionName) => {
    setRadarRegions(prev => {
      if (prev.includes(regionName)) {
        if (prev.length <= 1) return prev;
        return prev.filter(r => r !== regionName);
      } else {
        if (prev.length >= 3) {
          return [prev[1], prev[2], regionName]; // Slide window
        }
        return [...prev, regionName];
      }
    });
  };

  // Toggle selected seasons on radar chart (Limit to max 3)
  const toggleRadarSeason = (seasonName) => {
    setRadarSeasons(prev => {
      if (prev.includes(seasonName)) {
        if (prev.length <= 1) return prev;
        return prev.filter(s => s !== seasonName);
      } else {
        if (prev.length >= 3) {
          return [prev[1], prev[2], seasonName]; // Slide window
        }
        return [...prev, seasonName];
      }
    });
  };

  if (loading) return null;
  if (error) return null;

  return (
    <div className="space-y-6 animate-fade-in pb-12">


      {/* Sub Tab Navigation */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setSubTab('provinces')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${subTab === 'provinces'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
        >
          <Building className="h-4 w-4" /> So sánh các tỉnh
        </button>
        <button
          onClick={() => setSubTab('regions')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${subTab === 'regions'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
        >
          <Compass className="h-4 w-4" /> So sánh các vùng
        </button>
        <button
          onClick={() => setSubTab('seasons')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${subTab === 'seasons'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
        >
          <CalendarDays className="h-4 w-4" /> So sánh các mùa
        </button>
      </div>

      {/* RENDER TAB 1: PROVINCES COMPARISON */}
      {subTab === 'provinces' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">

            {/* Horizontal Bar Chart card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 pb-3 shadow-sm space-y-4 flex flex-col justify-between lg:col-span-2">

              {/* Filter controls */}
              <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-100 pb-4 relative">
                <div className="flex-1 flex justify-center">
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider text-center">
                    Xếp hạng 34 tỉnh thành Việt Nam theo {METRICS.find(m => m.key === activeMetric)?.label?.split('(')[0]?.trim() || ''}
                  </h3>
                </div>

                <div className="flex items-center gap-3">
                  {/* Metric selection custom dropdown */}
                  <div className="relative" ref={metricDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsMetricDropdownOpen(!isMetricDropdownOpen)}
                      className="bg-slate-50 hover:bg-slate-100 border border-slate-250 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer outline-none"
                    >
                      <span>{METRICS.find(m => m.key === activeMetric)?.label}</span>
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    </button>

                    {isMetricDropdownOpen && (
                      <div className="absolute right-0 mt-1.5 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1.5 animate-fade-in">
                        {METRICS.map(m => (
                          <button
                            key={m.key}
                            onClick={() => {
                              setActiveMetric(m.key);
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

                  {/* Sort toggle */}
                  <button
                    onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                    className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-250 text-slate-700 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
                    title="Sắp xếp"
                  >
                    <ArrowUpDown className="h-4 w-4 text-brand-primary" />
                    <span>{sortOrder === 'desc' ? 'Cao → Thấp' : 'Thấp → Cao'}</span>
                  </button>
                </div>
              </div>

              {/* Main Bar Chart */}
              <div className="bg-slate-50/30 rounded-xl p-3 border border-slate-100 shadow-inner">

                {/* Scrollable body with YAxis and Bars */}
                <div style={{ height: '350px', overflowY: 'auto', paddingRight: '8px', outline: 'none' }} className="focus:outline-none">
                  <div style={{ height: '900px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={sortedProvinceData}
                        layout="vertical"
                        margin={{ top: 20, right: 15, left: 10, bottom: 0 }}
                        onClick={(state) => {
                          if (state && state.activePayload && state.activePayload.length > 0) {
                            toggleRadarProvince(state.activePayload[0].payload.name);
                          } else if (state && state.activeLabel) {
                            toggleRadarProvince(state.activeLabel);
                          }
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                        {/* Hide XAxis here, render it fixed below */}
                        <XAxis type="number" hide />
                        <YAxis
                          dataKey="name"
                          type="category"
                          stroke="#70859c"
                          tick={{ fontSize: 9, fontWeight: 600 }}
                          width={105}
                          interval={0}
                          label={{ value: 'Tỉnh thành', position: 'insideTopLeft', offset: -10, style: { fontSize: '11px', fontWeight: 'bold', fill: '#475569' } }}
                        />
                        <Tooltip
                          cursor={{ fill: 'transparent' }}
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold' }}
                          itemStyle={{ fontWeight: 'bold' }}
                          labelStyle={{ fontWeight: '800', color: '#475569', marginBottom: '4px' }}
                          formatter={(value) => [
                            `${value} (${METRICS.find(m => m.key === activeMetric)?.label.split('(')[1] || ''}`,
                            `Trung bình`
                          ]}
                        />
                        <Bar
                          dataKey={activeMetric}
                          radius={[0, 4, 4, 0]}
                          className="cursor-pointer"
                        >
                          {sortedProvinceData.map((entry, index) => {
                            const isSelected = radarProvinces.includes(entry.name);
                            return (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.color}
                                fillOpacity={isSelected ? 1.0 : (index === 0 ? 0.9 : 0.4)}
                                stroke={isSelected ? '#334155' : 'none'}
                                strokeWidth={isSelected ? 2 : 0}
                              />
                            );
                          })}
                        </Bar>
                        {dynamicInsightData && dynamicInsightData.avgVal && (
                          <ReferenceLine
                            x={dynamicInsightData.avgVal}
                            stroke="#ef4444"
                            strokeDasharray="4 4"
                            strokeWidth={2}
                            label={{ position: 'top', value: `TB Toàn Quốc: ${Math.round(dynamicInsightData.avgVal * 100) / 100} ${METRICS.find(m => m.key === activeMetric)?.label.split('(')[1]?.replace(')', '') || ''}`, fill: '#ef4444', fontSize: 11, fontWeight: 'bold' }}
                          />
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Fixed bottom XAxis, padded right to match scrollbar offset */}
                <div className="border-t border-slate-100 bg-white" style={{ height: '45px', paddingRight: '14px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={sortedProvinceData}
                      layout="vertical"
                      margin={{ top: 0, right: 15, left: 10, bottom: 20 }}
                    >
                      <XAxis type="number" stroke="#70859c" tick={{ fontSize: 9, fontWeight: 600 }} label={{ value: METRICS.find(m => m.key === activeMetric)?.label, position: 'insideBottom', offset: -5, style: { fontSize: '11px', fontWeight: 'bold', fill: '#475569' } }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={105}
                        tick={false}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Bar dataKey={activeMetric} fill="transparent" opacity={0} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

              </div>

            </div>

            {/* Right Column: Radar Chart */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between items-stretch lg:col-span-1 min-h-[450px]">
              <div className="flex justify-center items-center flex-wrap gap-2 border-b border-slate-100 pb-3">
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider text-center">
                  Radar liên chiều khí hậu các tỉnh thành
                </span>
              </div>

              {radarProvinces.length > 0 ? (
                <div className="w-full flex-1 flex justify-center items-center mt-4">
                  <ResponsiveContainer width="100%" height={360}>
                    <RadarChart cx="50%" cy="50%" outerRadius="55%" data={radarChartData}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fontWeight: 700, fill: '#475569' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8 }} />

                      {radarProvinces[0] && (
                        <Radar
                          name={radarProvinces[0]}
                          dataKey={radarProvinces[0]}
                          stroke={RADAR_COLORS.c1}
                          fill={RADAR_COLORS.c1}
                          fillOpacity={0.4}
                          strokeWidth={2}
                        />
                      )}

                      {radarProvinces[1] && (
                        <Radar
                          name={radarProvinces[1]}
                          dataKey={radarProvinces[1]}
                          stroke={RADAR_COLORS.c2}
                          fill={RADAR_COLORS.c2}
                          fillOpacity={0.4}
                          strokeWidth={2}
                        />
                      )}

                      {radarProvinces[2] && (
                        <Radar
                          name={radarProvinces[2]}
                          dataKey={radarProvinces[2]}
                          stroke={RADAR_COLORS.c3}
                          fill={RADAR_COLORS.c3}
                          fillOpacity={0.4}
                          strokeWidth={2}
                        />
                      )}
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold' }}
                        itemStyle={{ fontWeight: 'bold' }}
                        labelStyle={{ fontWeight: '800', color: '#475569', marginBottom: '4px' }}
                        formatter={(value, name, props) => {
                          const rawVal = props?.payload?.[`raw_${name}`] ?? value;
                          return [`${rawVal} (Chỉ số: ${value}%)`, name];
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-slate-400 text-xs font-semibold">Chọn ít nhất một tỉnh để vẽ đồ thị radar.</div>
              )}
            </div>
          </div>

          {/* Insight Card Toggle Button */}
          <div className="flex justify-center w-full">
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

        </div>
      )}

      {/* RENDER TAB 2: REGIONS COMPARISON */}
      {subTab === 'regions' && (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between lg:col-span-2">
              <div className="border-b border-slate-100 pb-3 flex justify-center items-center flex-wrap gap-2">
                <div className="text-center">
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    So sánh 7 vùng địa lý trên các biến số chính
                  </h3>
                </div>
              </div>

              <div className="h-96">
                {regionalData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={regionalData}
                      margin={{ top: 15, right: 10, left: 10, bottom: 15 }}
                      onClick={(state) => {
                        if (state && state.activePayload && state.activePayload.length > 0) {
                          toggleRadarRegion(state.activePayload[0].payload.name);
                        } else if (state && state.activeLabel) {
                          toggleRadarRegion(state.activeLabel);
                        }
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                      <XAxis dataKey="name" stroke="#70859c" tick={{ fontSize: 9, fontWeight: 700 }} label={{ value: 'Vùng địa lý', position: 'insideBottom', offset: -5, style: { fontSize: '11px', fontWeight: 'bold', fill: '#475569' } }} />
                      <YAxis stroke="#70859c" tick={{ fontSize: 9, fontWeight: 600 }} domain={[0, 100]} label={{ value: 'Chỉ số (%)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: '11px', fontWeight: 'bold', fill: '#475569' } }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold' }}
                        itemStyle={{ fontWeight: 'bold' }}
                        labelStyle={{ fontWeight: '800', color: '#475569', marginBottom: '4px' }}
                        formatter={(value, name, props) => {
                          const rawName = name.replace(' (chỉ số)', '');
                          const payload = props?.payload;
                          const rawVal = payload
                            ? (payload[`${rawName} (°C)`] || payload[`${rawName} (mm)`] || payload[`${rawName} (%)`] || payload[`${rawName} (km/h)`] || value)
                            : value;
                          return [`${rawVal} (Chỉ số: ${value}%)`, rawName];
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                      <Bar dataKey="Nhiệt độ (chỉ số)" name="Nhiệt độ" fill={isColorblind ? "#E69F00" : "#F59E0B"} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Lượng mưa (chỉ số)" name="Lượng mưa" fill={isColorblind ? "#56B4E9" : "#06B6D4"} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Độ ẩm (chỉ số)" name="Độ ẩm" fill={isColorblind ? "#009E73" : "#10B981"} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Tốc độ gió (chỉ số)" name="Tốc độ gió" fill={isColorblind ? "#F0E442" : "#8B5CF6"} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-slate-400 text-xs font-semibold text-center py-20">Không có dữ liệu vùng</div>
                )}
              </div>
            </div>

            {/* Radar Visual for Regions */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between items-stretch lg:col-span-1 min-h-[450px]">
              <div className="flex justify-center items-center flex-wrap gap-2 border-b border-slate-100 pb-3">
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider text-center">
                  Radar so sánh vùng địa lý
                </span>
              </div>

              {radarRegions.length > 0 ? (
                <div className="w-full flex-1 flex justify-center items-center mt-4">
                  <ResponsiveContainer width="100%" height={320}>
                    <RadarChart cx="50%" cy="50%" outerRadius="60%" data={radarRegionsData}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fontWeight: 700, fill: '#475569' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8 }} />

                      {radarRegions[0] && (
                        <Radar
                          name={radarRegions[0]}
                          dataKey={radarRegions[0]}
                          stroke={RADAR_COLORS.c1}
                          fill={RADAR_COLORS.c1}
                          fillOpacity={0.4}
                          strokeWidth={2}
                        />
                      )}

                      {radarRegions[1] && (
                        <Radar
                          name={radarRegions[1]}
                          dataKey={radarRegions[1]}
                          stroke={RADAR_COLORS.c2}
                          fill={RADAR_COLORS.c2}
                          fillOpacity={0.4}
                          strokeWidth={2}
                        />
                      )}

                      {radarRegions[2] && (
                        <Radar
                          name={radarRegions[2]}
                          dataKey={radarRegions[2]}
                          stroke={RADAR_COLORS.c3}
                          fill={RADAR_COLORS.c3}
                          fillOpacity={0.4}
                          strokeWidth={2}
                        />
                      )}
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold' }}
                        itemStyle={{ fontWeight: 'bold' }}
                        labelStyle={{ fontWeight: '800', color: '#475569', marginBottom: '4px' }}
                        formatter={(value, name, props) => {
                          const rawVal = props?.payload?.[`raw_${name}`] ?? value;
                          return [`${rawVal} (Chỉ số: ${value}%)`, name];
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-slate-400 text-xs font-semibold">Chọn ít nhất một vùng để vẽ đồ thị radar.</div>
              )}
            </div>
          </div>

          {/* Insight Card Toggle Button for Tab 2 */}
          <div className="flex justify-center w-full mt-6">
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
            <div className="w-full mt-6">
              <StoryInsightCard insightData={dynamicRegionInsightData} />
            </div>
          )}

        </div>
      )}

      {/* RENDER TAB 3: SEASONS COMPARISON */}
      {subTab === 'seasons' && (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between lg:col-span-2">
              <div className="border-b border-slate-100 pb-3 flex justify-center items-center flex-wrap gap-2">
                <div className="text-center">
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    So sánh sự khác biệt khí tượng theo các Mùa khí hậu Việt Nam
                  </h3>
                </div>
              </div>

              <div className="h-96">
                {seasonalData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={seasonalData}
                      margin={{ top: 15, right: 10, left: 10, bottom: 15 }}
                      onClick={(state) => {
                        if (state && state.activePayload && state.activePayload.length > 0) {
                          toggleRadarSeason(state.activePayload[0].payload.name);
                        } else if (state && state.activeLabel) {
                          toggleRadarSeason(state.activeLabel);
                        }
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                      <XAxis dataKey="name" stroke="#70859c" tick={{ fontSize: 10, fontWeight: 700 }} label={{ value: 'Mùa', position: 'insideBottom', offset: -5, style: { fontSize: '11px', fontWeight: 'bold', fill: '#475569' } }} />
                      <YAxis stroke="#70859c" tick={{ fontSize: 9, fontWeight: 600 }} domain={[0, 100]} label={{ value: 'Chỉ số (%)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: '11px', fontWeight: 'bold', fill: '#475569' } }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold' }}
                        itemStyle={{ fontWeight: 'bold' }}
                        labelStyle={{ fontWeight: '800', color: '#475569', marginBottom: '4px' }}
                        formatter={(value, name, props) => {
                          const rawName = name.replace(' (chỉ số)', '');
                          const payload = props?.payload;
                          const rawVal = payload
                            ? (payload[`${rawName} (°C)`] || payload[`${rawName} (mm)`] || payload[`${rawName} (%)`] || payload[`${rawName} (km/h)`] || value)
                            : value;
                          return [`${rawVal} (Chỉ số: ${value}%)`, rawName];
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                      <Bar dataKey="Nhiệt độ (chỉ số)" name="Nhiệt độ" fill={isColorblind ? "#E69F00" : "#F59E0B"} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Lượng mưa (chỉ số)" name="Lượng mưa" fill={isColorblind ? "#56B4E9" : "#06B6D4"} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Độ ẩm (chỉ số)" name="Độ ẩm" fill={isColorblind ? "#009E73" : "#10B981"} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Tốc độ gió (chỉ số)" name="Tốc độ gió" fill={isColorblind ? "#F0E442" : "#8B5CF6"} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-slate-400 text-xs font-semibold text-center py-20">Không có dữ liệu mùa</div>
                )}
              </div>
            </div>

            {/* Radar Visual for Seasons */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between items-stretch lg:col-span-1 min-h-[450px]">
              <div className="flex justify-center items-center flex-wrap gap-2 border-b border-slate-100 pb-3">
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider text-center">
                  Radar so sánh mùa thời tiết
                </span>
              </div>

              {radarSeasons.length > 0 ? (
                <div className="w-full flex-1 flex justify-center items-center mt-4">
                  <ResponsiveContainer width="100%" height={320}>
                    <RadarChart cx="50%" cy="50%" outerRadius="60%" data={radarSeasonsData}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fontWeight: 700, fill: '#475569' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8 }} />

                      {radarSeasons[0] && (
                        <Radar
                          name={radarSeasons[0]}
                          dataKey={radarSeasons[0]}
                          stroke={RADAR_COLORS.c1}
                          fill={RADAR_COLORS.c1}
                          fillOpacity={0.4}
                          strokeWidth={2}
                        />
                      )}

                      {radarSeasons[1] && (
                        <Radar
                          name={radarSeasons[1]}
                          dataKey={radarSeasons[1]}
                          stroke={RADAR_COLORS.c2}
                          fill={RADAR_COLORS.c2}
                          fillOpacity={0.4}
                          strokeWidth={2}
                        />
                      )}

                      {radarSeasons[2] && (
                        <Radar
                          name={radarSeasons[2]}
                          dataKey={radarSeasons[2]}
                          stroke={RADAR_COLORS.c3}
                          fill={RADAR_COLORS.c3}
                          fillOpacity={0.4}
                          strokeWidth={2}
                        />
                      )}
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold' }}
                        itemStyle={{ fontWeight: 'bold' }}
                        labelStyle={{ fontWeight: '800', color: '#475569', marginBottom: '4px' }}
                        formatter={(value, name, props) => {
                          const rawVal = props?.payload?.[`raw_${name}`] ?? value;
                          return [`${rawVal} (Chỉ số: ${value}%)`, name];
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-slate-400 text-xs font-semibold">Chọn ít nhất một mùa để vẽ đồ thị radar.</div>
              )}
            </div>
          </div>

          {/* Insight Card Toggle Button for Tab 3 */}
          <div className="flex justify-center w-full mt-6">
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
            <div className="w-full mt-6">
              <StoryInsightCard insightData={dynamicSeasonInsightData} />
            </div>
          )}
        </div>
      )}

    </div>
  );
}
