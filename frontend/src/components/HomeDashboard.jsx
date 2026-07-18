import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Thermometer,
  CloudRain,
  Droplets,
  Wind,
  TrendingUp,
  TrendingDown,
  Database,
  Info,
  MapPin,
  Loader2,
  ChevronDown,
  Check
} from 'lucide-react';
import { useData } from '../context/DataContext';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart as RechartsAreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

function CustomSelect({ value, onChange, options, className }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef(null);

  React.useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`${className} flex items-center justify-between gap-1.5 cursor-pointer`}
      >
        <span>{selectedOption.label}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-60 flex-shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 min-w-full w-max max-w-[240px] max-h-80 overflow-y-auto rounded-lg bg-white border border-slate-200 shadow-lg z-30 py-1 font-semibold text-slate-750 animate-fade-in">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange({ target: { value: opt.value } });
                setIsOpen(false);
              }}
              className={`w-full text-left px-3.5 py-2 hover:bg-blue-50 transition-colors flex items-center justify-between text-xs cursor-pointer ${opt.value === value ? 'bg-blue-50 text-brand-primary font-bold' : ''
                }`}
            >
              <span>{opt.label}</span>
              {opt.value === value && <Check className="h-3.5 w-3.5 text-brand-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HomeDashboard({ datasetUploaded, setCurrentTab, submitQuery }) {
  // --- Real CSV data from context ---
  const { loading, error, fullStats, filteredStats, filters, setFilters } = useData();

  const [mapMetric, setMapMetric] = useState('temp'); // 'temp' | 'rain'
  const [selectedRegion, setSelectedRegion] = useState('NorthCentral');
  const [aiPromptInput, setAiPromptInput] = useState('');
  const [geoJson, setGeoJson] = useState(null);
  const [hoveredProvince, setHoveredProvince] = useState(null);
  const [mapTooltipPos, setMapTooltipPos] = useState({ x: 0, y: 0 });
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Sync local filter UI with global filter context
  const filterRegion = filters.regionKey;
  const filterMonth = filters.month;
  const filterSeason = filters.season;

  const setFilterRegion = (v) => setFilters(f => ({ ...f, regionKey: v }));
  const setFilterMonth = (v) => setFilters(f => ({ ...f, month: v }));
  const setFilterSeason = (v) => setFilters(f => ({ ...f, season: v }));

  const handleMouseDown = (e) => {
    if (zoomScale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setZoomScale(prev => Math.min(prev + 0.4, 4));
  };

  const handleZoomOut = () => {
    setZoomScale(prev => {
      const next = prev - 0.4;
      if (next <= 1) {
        setPanOffset({ x: 0, y: 0 });
        return 1;
      }
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  useEffect(() => {
    fetch('/vietnam_merged_provinces.geojson')
      .then(res => {
        if (!res.ok) throw new Error("Failed to load map data");
        return res.json();
      })
      .then(data => setGeoJson(data))
      .catch(err => console.error(err));
  }, []);

  const getRegionOfProvince = (provinceName) => {
    if (!provinceName) return 'NorthMountain';
    const name = provinceName.toLowerCase();

    // Check Red River Delta
    if (name.includes('hà nội') || name.includes('hanoi') || name.includes('bắc ninh') || name.includes('hưng yên') || name.includes('hải phòng') || name.includes('ninh bình') || name.includes('vĩnh phúc') || name.includes('hải dương') || name.includes('thái bình') || name.includes('hà nam') || name.includes('nam định')) {
      return 'RedRiverDelta';
    }
    // Check North Mountain
    if (name.includes('cao bằng') || name.includes('lai châu') || name.includes('lào cai') || name.includes('sơn la') || name.includes('tuyên quang') || name.includes('thái nguyên') || name.includes('phú thọ') || name.includes('hà giang') || name.includes('lạng sơn') || name.includes('bắc kạn') || name.includes('yên bái') || name.includes('hoà bình') || name.includes('quảng ninh') || name.includes('bắc giang') || name.includes('điện biên')) {
      return 'NorthMountain';
    }
    // Check North Central
    if (name.includes('thanh hóa') || name.includes('nghệ an') || name.includes('hà tĩnh') || name.includes('quảng trị') || name.includes('huế') || name.includes('thừa thiên')) {
      return 'NorthCentral';
    }
    // Check South Central
    if (name.includes('đà nẵng') || name.includes('quảng ngãi') || name.includes('khánh hòa') || name.includes('quảng nam') || name.includes('bình định') || name.includes('phú yên') || name.includes('ninh thuận') || name.includes('bình thuận')) {
      return 'SouthCentral';
    }
    // Check Central Highlands (Tây Nguyên)
    if (name.includes('gia lai') || name.includes('lâm đồng') || name.includes('kon tum') || name.includes('đắk lắk') || name.includes('đắk nông') || name.includes('dac lac') || name.includes('đắc lắc')) {
      return 'CentralHighlands';
    }
    // Check Southeast
    if (name.includes('hồ chí minh') || name.includes('tây ninh') || name.includes('bình dương') || name.includes('bình phước') || name.includes('đồng nai') || name.includes('bà rịa') || name.includes('vũng tàu')) {
      return 'Southeast';
    }
    // Check Mekong Delta
    if (name.includes('an giang') || name.includes('đồng tháp') || name.includes('cần thơ') || name.includes('vĩnh long') || name.includes('cà mau') || name.includes('long an') || name.includes('tiền giang') || name.includes('bến tre') || name.includes('trà vinh') || name.includes('hậu giang') || name.includes('sóc trăng') || name.includes('bạc liêu') || name.includes('kiên giang')) {
      return 'MekongDelta';
    }
    return 'NorthMountain';
  };

  const provinceStatus = {
    "Lai Châu": { status: "Không sáp nhập", color: "#F59E0B" },
    "Điện Biên": { status: "Không sáp nhập", color: "#F59E0B" },
    "Sơn La": { status: "Không sáp nhập", color: "#F59E0B" },
    "Cao Bằng": { status: "Không sáp nhập", color: "#F59E0B" },
    "Lạng Sơn": { status: "Không sáp nhập", color: "#F59E0B" },
    "Quảng Ninh": { status: "Không sáp nhập", color: "#F59E0B" },
    "Hà Nội": { status: "Không sáp nhập", color: "#F59E0B" },
    "Thanh Hóa": { status: "Không sáp nhập", color: "#F59E0B" },
    "Nghệ An": { status: "Không sáp nhập", color: "#F59E0B" },
    "Hà Tĩnh": { status: "Không sáp nhập", color: "#F59E0B" },
    "Thừa Thiên - Huế": { status: "Không sáp nhập", color: "#F59E0B", label: "TP. Huế" },

    "Tuyên Quang": { status: "Sáp nhập", color: "#60A5FA" },
    "Lào Cai": { status: "Sáp nhập", color: "#60A5FA" },
    "Phú Thọ": { status: "Sáp nhập", color: "#60A5FA" },
    "Thái Nguyên": { status: "Sáp nhập", color: "#60A5FA" },
    "Bắc Ninh": { status: "Sáp nhập", color: "#60A5FA" },
    "Hải Phòng": { status: "Sáp nhập", color: "#60A5FA" },
    "Hưng Yên": { status: "Sáp nhập", color: "#60A5FA" },
    "Ninh Bình": { status: "Sáp nhập", color: "#60A5FA" },
    "Quảng Trị": { status: "Sáp nhập", color: "#60A5FA" },
    "Đà Nẵng": { status: "Sáp nhập", color: "#60A5FA" },
    "Quảng Ngãi": { status: "Sáp nhập", color: "#60A5FA" },
    "Gia Lai": { status: "Sáp nhập", color: "#60A5FA" },
    "Đắk Lắk": { status: "Sáp nhập", color: "#60A5FA" },
    "Khánh Hòa": { status: "Sáp nhập", color: "#60A5FA" },
    "Lâm Đồng": { status: "Sáp nhập", color: "#60A5FA" },
    "Đồng Nai": { status: "Sáp nhập", color: "#60A5FA" },
    "Tây Ninh": { status: "Sáp nhập", color: "#60A5FA" },
    "Thành phố Hồ Chí Minh": { status: "Sáp nhập", color: "#60A5FA", label: "TP. HCM" },
    "An Giang": { status: "Sáp nhập", color: "#60A5FA" },
    "Đồng Tháp": { status: "Sáp nhập", color: "#60A5FA" },
    "Vĩnh Long": { status: "Sáp nhập", color: "#60A5FA" },
    "Cần Thơ": { status: "Sáp nhập", color: "#60A5FA" },
    "Cà Mau": { status: "Sáp nhập", color: "#60A5FA" },
    "Kiên Giang": { status: "Sáp nhập", color: "#60A5FA", label: "Đ. Phú Quốc" }
  };

  const getProvinceLabel = (name) => {
    const info = provinceStatus[name];
    if (info && info.label) return info.label;
    if (name === "Thừa Thiên - Huế") return "TP. Huế";
    if (name === "Thành phố Hồ Chí Minh") return "TP. HCM";
    if (name === "Hà Nội") return "TP. Hà Nội";
    if (name === "Hải Phòng") return "TP. Hải Phòng";
    if (name === "Cần Thơ") return "TP. Cần Thơ";
    if (name === "Đà Nẵng") return "TP. Đà Nẵng";
    if (name === "Thanh Hóa") return "Thanh Hoá";
    if (name === "Khánh Hòa") return "Khánh Hoà";
    return name;
  };

  const labelOffsets = {
    "Hà Nội": { dx: -10, dy: 10 },
    "Thành phố Hồ Chí Minh": { dx: 18, dy: -2 },
    "Hải Phòng": { dx: 12, dy: 5 },
    "Bắc Ninh": { dx: 6, dy: -3 },
    "Hưng Yên": { dx: 8, dy: 8 },
    "Hà Tĩnh": { dx: -10, dy: 0 },
    "Khánh Hòa": { dx: 16, dy: 0 },
    "Kiên Giang": { dx: -10, dy: 10 }
  };

  const getCentroid = (feature) => {
    if (!feature || !feature.geometry) return [0, 0];
    const { type, coordinates } = feature.geometry;

    const minLon = 101.8;
    const maxLon = 109.8;
    const minLat = 8.2;
    const maxLat = 23.8;
    const width = 180;
    const height = 450;

    const projectX = (lon) => ((lon - minLon) / (maxLon - minLon)) * width + 10;
    const projectY = (lat) => height - ((lat - minLat) / (maxLat - minLat)) * height + 15;

    let pts = [];
    if (type === 'Polygon') {
      pts = coordinates[0];
    } else if (type === 'MultiPolygon') {
      if (feature.properties.NAME_1 === 'Kiên Giang') {
        const poly = coordinates.find(p => {
          const ring = p[0];
          const avgLon = ring.reduce((sum, pt) => sum + pt[0], 0) / ring.length;
          return avgLon < 104.5;
        });
        pts = poly ? poly[0] : coordinates[0][0];
      } else {
        pts = coordinates[0][0];
      }
    }

    let sumX = 0;
    let sumY = 0;
    pts.forEach(pt => {
      sumX += projectX(pt[0]);
      sumY += projectY(pt[1]);
    });

    return [sumX / pts.length, sumY / pts.length];
  };

  const getProvincePath = (feature) => {
    if (!feature || !feature.geometry) return '';
    const { type, coordinates } = feature.geometry;

    const minLon = 101.8;
    const maxLon = 109.8;
    const minLat = 8.2;
    const maxLat = 23.8;
    const width = 180;
    const height = 450;

    const projectPoint = (coord) => {
      const lon = coord[0];
      const lat = coord[1];
      const x = ((lon - minLon) / (maxLon - minLon)) * width + 10;
      const y = height - ((lat - minLat) / (maxLat - minLat)) * height + 15;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    };

    if (feature.properties.NAME_1 === 'Kiên Giang') {
      if (type === 'MultiPolygon') {
        const filteredCoords = coordinates.filter(poly => {
          const ring = poly[0];
          const avgLon = ring.reduce((sum, pt) => sum + pt[0], 0) / ring.length;
          return avgLon < 104.5;
        });
        return filteredCoords.map(poly => {
          return poly.map(ring => {
            const points = ring.map(projectPoint).join(' ');
            return `M ${points} Z`;
          }).join(' ');
        }).join(' ');
      }
    }

    if (type === 'Polygon') {
      return coordinates.map(ring => {
        const points = ring.map(projectPoint).join(' ');
        return `M ${points} Z`;
      }).join(' ');
    } else if (type === 'MultiPolygon') {
      return coordinates.map(poly => {
        return poly.map(ring => {
          const points = ring.map(projectPoint).join(' ');
          return `M ${points} Z`;
        }).join(' ');
      }).join(' ');
    }
    return '';
  };

  // ── Data from CSV (real) ──────────────────────────────────────────
  // Use filteredStats when available, fall back to fullStats
  const activeStats = filteredStats || fullStats;
  const regionalData = activeStats ? activeStats.regionStats : {};
  const tempTrendData = fullStats ? fullStats.tempTrend : [];
  const rainfallProvincesData = activeStats ? activeStats.topRainfallProvinces : [];
  const humidityDistributionData = activeStats ? activeStats.humidityByRegion : [];
  const correlationData = activeStats ? activeStats.correlationData : [];
  const nationalKPIs = activeStats ? activeStats.nationalKPIs : { temp: 0, rain: 0, humidity: 0, wind: 0, sunshine: 0, et0: 0 };

  // Filtered rainfall for bar chart (filter by region if selected)
  const filteredRainfallData = filterRegion === 'All'
    ? rainfallProvincesData
    : rainfallProvincesData.filter(p => getRegionOfProvince(p.name) === filterRegion);

  // KPI display values — directly from real aggregated data
  const displayTemp = nationalKPIs.temp;
  const displayRain = nationalKPIs.rain;
  const displayHumidity = nationalKPIs.humidity;
  const displayWind = nationalKPIs.wind;
  const displaySunshine = nationalKPIs.sunshine;
  const displayET0 = nationalKPIs.et0;

  // Pre-calculate average statistics for each province
  const provinceStats = useMemo(() => {
    if (!rawRows.length) return {};
    const grouped = {};
    rawRows.forEach(r => {
      if (!grouped[r.province]) {
        grouped[r.province] = { temp: [], rain: [], humidity: [], wind: [], sunshine: [] };
      }
      const g = grouped[r.province];
      if (r.temp !== null && !isNaN(r.temp)) g.temp.push(r.temp);
      if (r.rain !== null && !isNaN(r.rain)) g.rain.push(r.rain);
      if (r.humidity !== null && !isNaN(r.humidity)) g.humidity.push(r.humidity);
      if (r.wind !== null && !isNaN(r.wind)) g.wind.push(r.wind);
      if (r.sunshine !== null && !isNaN(r.sunshine)) g.sunshine.push(r.sunshine);
    });

    const result = {};
    const avg = arr => arr.length ? arr.reduce((sum, v) => sum + v, 0) / arr.length : 0;
    
    Object.entries(grouped).forEach(([prov, data]) => {
      result[prov] = {
        temp: (avg(data.temp)).toFixed(1),
        rain: (avg(data.rain)).toFixed(1),
        humidity: Math.round(avg(data.humidity)),
        wind: (avg(data.wind)).toFixed(1),
        sunshine: Math.round(avg(data.sunshine))
      };
    });
    return result;
  }, [rawRows]);

  const getProvinceStats = (name) => {
    if (!name) return null;
    if (provinceStats[name]) return provinceStats[name];
    
    const keys = Object.keys(provinceStats);
    const matchedKey = keys.find(k => k.toLowerCase() === name.toLowerCase() || 
                                     name.toLowerCase().includes(k.toLowerCase()) ||
                                     k.toLowerCase().includes(name.toLowerCase()));
    if (matchedKey) return provinceStats[matchedKey];
    return null;
  };


  // Handlers for AI Quick Analysis
  const handlePromptSubmit = (e) => {
    e.preventDefault();
    if (!aiPromptInput.trim()) return;
    executeQuery(aiPromptInput);
  };

  const handleSuggestedPrompt = (prompt) => {
    executeQuery(prompt);
  };

  const executeQuery = (prompt) => {
    if (!datasetUploaded) {
      setCurrentTab('datasets');
      return;
    }
    // Set chat tab and submit question
    setCurrentTab('chat');
    // Delay slightly to allow tab render
    setTimeout(() => {
      submitQuery(prompt, 'user');
      // Simulate AI response
      setTimeout(() => {
        const matched = predefinedQueries.find(q => q.question.toLowerCase().includes(prompt.toLowerCase())) || predefinedQueries[0];
        submitQuery(
          `Tôi đã phân tích câu hỏi: "${prompt}". 
Dựa vào dữ liệu mẫu KTTV Việt Nam, tôi đã tạo ra mã nguồn Python để trích xuất số liệu. Trạng thái mã nguồn đang là **"Chờ Phê Duyệt"**.`,
          'ai',
          matched
        );
      }, 1500);
    }, 150);
  };

  // Helper to retrieve color based on active map metric selection
  const getRegionColor = (key) => {
    const region = regionalData[key];
    if (!region) return '#e2e8f0';
    return mapMetric === 'temp' ? region.colorTemp : region.colorRain;
  };

  // ── Loading & error states ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-slate-500">
        <Loader2 className="h-10 w-10 animate-spin text-brand-primary" />
        <p className="text-sm font-semibold">Đang tải dữ liệu KTTV (6,156 bản ghi)...</p>
        <p className="text-xs text-slate-400">Vui lòng chờ trong giây lát</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-rose-600">
        <Info className="h-8 w-8" />
        <p className="text-sm font-bold">Không thể tải dữ liệu CSV</p>
        <p className="text-xs text-slate-400 max-w-sm text-center">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">

      {/* 1. Concise Header Banner (Reduced height by 40%) */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-brand-primary to-brand-accent px-6 py-5 border border-blue-200 shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 text-white">
          <div className="space-y-1">
            <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
              Nền tảng phân tích thời tiết & khí hậu Việt Nam
            </h1>
            <p className="text-blue-50 text-xs font-semibold max-w-xl">
              Dự án Trực quan hóa dữ liệu Khí tượng Thủy văn (KTTV) 34 tỉnh thành Việt Nam tích hợp trợ lý lập trình AI cục bộ.
            </p>
          </div>
          <div className="flex gap-2.5 flex-shrink-0">
            {!datasetUploaded ? (
              <button
                onClick={() => setCurrentTab('datasets')}
                className="bg-white hover:bg-slate-50 text-brand-primary text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition-all"
              >
                Nạp tập dữ liệu mẫu
              </button>
            ) : (
              <button
                onClick={() => setCurrentTab('chat')}
                className="bg-white hover:bg-slate-50 text-brand-primary text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition-all"
              >
                Hỏi AI Phân Tích
              </button>
            )}

          </div>
        </div>
      </div>

      {/* 2. Interactive Filter Bar */}
      <div className="glass-panel rounded-2xl p-4 bg-white border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-slate-800">
          <img src="https://img.icons8.com/fluency/48/database.png" alt="Database" className="h-5 w-5 object-contain flex-shrink-0" />
          <span className="font-bold text-xs uppercase tracking-wider text-slate-700">Bộ lọc dữ liệu Dashboard</span>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Region Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-bold">Khu vực:</span>
            <CustomSelect
              value={filterRegion}
              onChange={(e) => {
                setFilterRegion(e.target.value);
                if (e.target.value !== 'All') setSelectedRegion(e.target.value);
              }}
              options={[
                { value: 'All', label: 'Tất cả vùng miền' },
                { value: 'NorthMountain', label: 'Miền núi phía Bắc' },
                { value: 'RedRiverDelta', label: 'Đồng bằng sông Hồng' },
                { value: 'NorthCentral', label: 'Bắc Trung Bộ' },
                { value: 'SouthCentral', label: 'Duyên hải Nam Trung Bộ' },
                { value: 'CentralHighlands', label: 'Tây Nguyên' },
                { value: 'Southeast', label: 'Đông Nam Bộ' },
                { value: 'MekongDelta', label: 'Đồng bằng sông Cửu Long' }
              ]}
              className="bg-slate-50 border border-slate-200 text-slate-700 font-bold px-2.5 py-1.5 rounded-lg shadow-sm focus:outline-none focus:border-brand-primary transition-all min-w-[170px]"
            />
          </div>

          {/* Month Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-bold">Tháng:</span>
            <CustomSelect
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              options={[
                { value: 'All', label: 'Tất cả các tháng' },
                { value: '12', label: 'Tháng 12 (2025)' },
                { value: '1', label: 'Tháng 1 (2026)' },
                { value: '2', label: 'Tháng 2' },
                { value: '3', label: 'Tháng 3' },
                { value: '4', label: 'Tháng 4' },
                { value: '5', label: 'Tháng 5' },
                { value: '6', label: 'Tháng 6' }
              ]}
              className="bg-slate-50 border border-slate-200 text-slate-700 font-bold px-2.5 py-1.5 rounded-lg shadow-sm focus:outline-none focus:border-brand-primary transition-all min-w-[140px]"
            />
          </div>

          {/* Season Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-bold">Mùa:</span>
            <CustomSelect
              value={filterSeason}
              onChange={(e) => setFilterSeason(e.target.value)}
              options={[
                { value: 'All', label: 'Tất cả các mùa' },
                { value: 'Đông', label: 'Mùa Đông' },
                { value: 'Xuân', label: 'Mùa Xuân' },
                { value: 'Hè', label: 'Mùa Hè' }
              ]}
              className="bg-slate-50 border border-slate-200 text-slate-700 font-bold px-2.5 py-1.5 rounded-lg shadow-sm focus:outline-none focus:border-brand-primary transition-all min-w-[130px]"
            />
          </div>

          {/* Reset Filters button */}
          {(filterRegion !== 'All' || filterMonth !== 'All' || filterSeason !== 'All') && (
            <button
              onClick={() => {
                setFilterRegion('All');
                setFilterMonth('All');
                setFilterSeason('All');
              }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold text-xs px-2.5 py-1.5 rounded-lg transition-all active:scale-95"
            >
              Đặt lại lọc
            </button>
          )}
        </div>
      </div>

      {/* 3. Climate KPI Cards Grid (with trend lines and sparklines) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">

        {/* KPI 1: Avg Temp */}
        <div className="glass-card rounded-2xl p-4 relative overflow-hidden bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Nhiệt độ trung bình</span>
            <img src="https://img.icons8.com/fluency/48/thermometer.png" alt="Nhiệt độ" className="h-6 w-6 object-contain flex-shrink-0" />
          </div>
          <div className="flex justify-between items-end">
            <div className="space-y-0.5">
              <span className="text-xl font-extrabold text-slate-800 tracking-tight">{displayTemp} °C</span>
              <div className="flex items-center gap-0.5 text-[9px] text-emerald-600 font-bold">
                <TrendingUp className="h-3 w-3" /> +0.4°C vs tháng trước
              </div>
            </div>
            {/* Tiny Sparkline */}
            <div className="pb-1">
              <svg className="w-12 h-6 text-orange-400" viewBox="0 0 50 20">
                <path d="M0,15 L10,13 L20,10 L30,12 L40,6 L50,3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* KPI 2: Avg Rain */}
        <div className="glass-card rounded-2xl p-4 relative overflow-hidden bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Lượng mưa trung bình</span>
            <img src="https://img.icons8.com/fluency/48/rain.png" alt="Lượng mưa" className="h-6 w-6 object-contain flex-shrink-0" />
          </div>
          <div className="flex justify-between items-end">
            <div className="space-y-0.5">
              <span className="text-xl font-extrabold text-slate-800 tracking-tight">{displayRain} mm</span>
              <div className="flex items-center gap-0.5 text-[9px] text-cyan-600 font-bold">
                <TrendingDown className="h-3 w-3" /> -12% vs tháng trước
              </div>
            </div>
            {/* Tiny Sparkline */}
            <div className="pb-1">
              <svg className="w-12 h-6 text-blue-400" viewBox="0 0 50 20">
                <path d="M0,5 L10,8 L20,12 L30,9 L40,15 L50,16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* KPI 3: Avg Humidity */}
        <div className="glass-card rounded-2xl p-4 relative overflow-hidden bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Độ ẩm trung bình</span>
            <img src="https://img.icons8.com/fluency/48/humidity.png" alt="Độ ẩm" className="h-6 w-6 object-contain flex-shrink-0" />
          </div>
          <div className="flex justify-between items-end">
            <div className="space-y-0.5">
              <span className="text-xl font-extrabold text-slate-800 tracking-tight">{displayHumidity} %</span>
              <div className="flex items-center gap-0.5 text-[9px] text-emerald-600 font-bold">
                <TrendingUp className="h-3 w-3" /> +1.2% vs tháng trước
              </div>
            </div>
            {/* Tiny Sparkline */}
            <div className="pb-1">
              <svg className="w-12 h-6 text-cyan-400" viewBox="0 0 50 20">
                <path d="M0,12 L10,10 L20,14 L30,8 L40,10 L50,4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* KPI 4: Avg Wind Speed */}
        <div className="glass-card rounded-2xl p-4 relative overflow-hidden bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Tốc độ gió trung bình</span>
            <img src="https://img.icons8.com/fluency/48/wind.png" alt="Tốc độ gió" className="h-6 w-6 object-contain flex-shrink-0" />
          </div>
          <div className="flex justify-between items-end">
            <div className="space-y-0.5">
              <span className="text-xl font-extrabold text-slate-800 tracking-tight">{displayWind} km/h</span>
              <div className="flex items-center gap-0.5 text-[9px] text-emerald-600 font-bold">
                <TrendingUp className="h-3 w-3" /> +0.8 km/h vs tháng trước
              </div>
            </div>
            {/* Tiny Sparkline */}
            <div className="pb-1">
              <svg className="w-12 h-6 text-slate-400" viewBox="0 0 50 20">
                <path d="M0,10 L10,11 L20,9 L30,10 L40,8 L50,7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* KPI 5: Avg Sunshine Hours */}
        <div className="glass-card rounded-2xl p-4 relative overflow-hidden bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Tổng giờ nắng</span>
            <img src="https://img.icons8.com/fluency/48/sun.png" alt="Giờ nắng" className="h-6 w-6 object-contain flex-shrink-0" />
          </div>
          <div className="flex justify-between items-end">
            <div className="space-y-0.5">
              <span className="text-xl font-extrabold text-slate-800 tracking-tight">{displaySunshine} giờ</span>
              <div className="flex items-center gap-0.5 text-[9px] text-emerald-600 font-bold">
                <TrendingUp className="h-3 w-3" /> +15.4 giờ vs tháng trước
              </div>
            </div>
            {/* Tiny Sparkline */}
            <div className="pb-1">
              <svg className="w-12 h-6 text-amber-550" viewBox="0 0 50 20">
                <path d="M0,10 L10,8 L20,5 L30,9 L40,4 L50,2" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* KPI 6: Avg Evapotranspiration ET0 */}
        <div className="glass-card rounded-2xl p-4 relative overflow-hidden bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Lượng bốc hơi ET₀</span>
            <img src="https://img.icons8.com/fluency/48/water.png" alt="Bốc hơi ET0" className="h-6 w-6 object-contain flex-shrink-0" />
          </div>
          <div className="flex justify-between items-end">
            <div className="space-y-0.5">
              <span className="text-xl font-extrabold text-slate-800 tracking-tight">{displayET0} mm</span>
              <div className="flex items-center gap-0.5 text-[9px] text-cyan-600 font-bold">
                <TrendingDown className="h-3 w-3" /> -4% vs tháng trước
              </div>
            </div>
            {/* Tiny Sparkline */}
            <div className="pb-1">
              <svg className="w-12 h-6 text-cyan-550" viewBox="0 0 50 20">
                <path d="M0,14 L10,12 L20,13 L30,9 L40,11 L50,8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>

      </div>

      {/* 2A. Vietnam Weather Map Section (Main visual focus) */}
      <div className="glass-panel rounded-2xl p-6 bg-white border border-slate-200 shadow-sm grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Map Panel Title & Toggle Controls */}
        <div className="lg:col-span-1 flex flex-col justify-between space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-brand-primary" /> Bản đồ khí hậu Việt Nam
            </h2>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              Bản đồ phân vùng địa lý Việt Nam. Rê chuột hoặc click vào một khu vực để hiển thị báo cáo chi tiết thời tiết.
            </p>


          </div>

          {/* Region Weather Inspector details card */}
          {selectedRegion && regionalData[selectedRegion] && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-800 text-sm">{regionalData[selectedRegion].name}</span>
                <span className="text-[10px] bg-blue-50 border border-blue-100 text-brand-primary font-bold px-2 py-0.5 rounded-full">
                  Khu vực
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-0.5">
                  <span className="text-slate-400 text-[10px] font-bold uppercase">Nhiệt độ TB</span>
                  <p className="font-bold text-slate-800 text-base">{regionalData[selectedRegion].temp} °C</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-slate-400 text-[10px] font-bold uppercase">Lượng mưa TB</span>
                  <p className="font-bold text-brand-primary text-base">{regionalData[selectedRegion].rain} mm</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-slate-400 text-[10px] font-bold uppercase">Độ ẩm TB</span>
                  <p className="font-bold text-slate-800">{regionalData[selectedRegion].humidity} %</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-slate-400 text-[10px] font-bold uppercase">Tốc độ gió</span>
                  <p className="font-bold text-slate-800">{regionalData[selectedRegion].wind} km/h</p>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Tỉnh thành đại diện:</span>
                <p className="text-[11px] text-slate-600 leading-relaxed font-semibold mt-0.5">
                  {regionalData[selectedRegion].provinces}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic SVG Map container */}
        <div className="lg:col-span-2 flex flex-col justify-center items-center bg-[#FAF6E8] border border-orange-100/40 rounded-2xl p-6 h-96 relative overflow-hidden select-none">

          {/* Hover Province Tooltip */}
          {hoveredProvince && createPortal(
            (() => {
              const pStats = getProvinceStats(hoveredProvince.originalName);
              return (
                <div 
                  className="fixed bg-slate-900/95 backdrop-blur border border-slate-800 text-white rounded-xl p-3 shadow-xl pointer-events-none z-50 text-[10px] font-medium min-w-[180px] transition-all space-y-2"
                  style={{ 
                    left: `${mapTooltipPos.x + 15}px`, 
                    top: `${mapTooltipPos.y + 15}px`,
                    transform: mapTooltipPos.x > window.innerWidth - 220 ? 'translateX(-110%)' : 'none'
                  }}
                >
                  <div className="border-b border-slate-800 pb-1.5 flex justify-between items-center">
                    <span className="font-extrabold text-brand-accent text-xs">{hoveredProvince.name}</span>
                    <span className="text-[7.5px] text-slate-400 font-extrabold uppercase tracking-wider">{hoveredProvince.status}</span>
                  </div>
                  {pStats ? (
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 font-mono text-[9px] text-slate-350">
                      <div>
                        <span className="text-[7.5px] text-slate-500 font-extrabold uppercase block font-sans">Nhiệt độ</span>
                        <span className="font-bold text-slate-100">{pStats.temp} °C</span>
                      </div>
                      <div>
                        <span className="text-[7.5px] text-slate-500 font-extrabold uppercase block font-sans">Lượng mưa</span>
                        <span className="font-bold text-blue-400">{pStats.rain} mm</span>
                      </div>
                      <div>
                        <span className="text-[7.5px] text-slate-500 font-extrabold uppercase block font-sans">Độ ẩm</span>
                        <span className="font-bold text-slate-100">{pStats.humidity} %</span>
                      </div>
                      <div>
                        <span className="text-[7.5px] text-slate-500 font-extrabold uppercase block font-sans">Tốc độ gió</span>
                        <span className="font-bold text-slate-100">{pStats.wind} km/h</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[7.5px] text-slate-500 font-extrabold uppercase block font-sans">Giờ nắng TB</span>
                        <span className="font-bold text-amber-400">{pStats.sunshine} giờ</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[8px] text-slate-500 font-bold">Không có dữ liệu chi tiết</p>
                  )}
                </div>
              );
            })(),
            document.body
          )}

          {/* Floating Zoom Controls */}
          <div className="absolute right-3 top-3 flex flex-col gap-1 z-20">
            <button
              type="button"
              onClick={handleZoomIn}
              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold h-7 w-7 rounded-lg shadow-sm flex items-center justify-center text-xs transition-all active:scale-90"
              title="Phóng to"
            >
              +
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold h-7 w-7 rounded-lg shadow-sm flex items-center justify-center text-xs transition-all active:scale-90"
              title="Thu nhỏ"
            >
              -
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 font-bold px-1 py-0.5 rounded-lg shadow-sm text-[8px] transition-all active:scale-90"
              title="Đặt lại"
            >
              RST
            </button>
          </div>

          {!geoJson ? (
            // Fallback: 7-region S-curve map while loading
            <svg
              className="w-full h-full max-w-[320px]"
              viewBox="0 0 240 400"
              style={{
                filter: 'drop-shadow(0 4px 6px rgba(15, 23, 42, 0.08))',
                cursor: zoomScale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <g
                style={{
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.15s ease-out'
                }}
              >
                {/* North Mountain Region */}
                <polygon
                  points="12,48 20,30 35,20 55,14 78,10 95,12 110,22 118,34 112,48 102,52 90,56 82,65 72,72 58,74 44,70 30,62 18,58"
                  fill="#F59E0B"
                  stroke="#fff"
                  strokeWidth={1}
                  className="cursor-pointer transition-all duration-200 hover:opacity-85"
                  onClick={() => { setSelectedRegion('NorthMountain'); setFilterRegion('NorthMountain'); }}
                />

                {/* Red River Delta Region */}
                <polygon
                  points="82,65 90,56 102,52 112,48 108,70 102,76 92,78 85,75"
                  fill="#60A5FA"
                  stroke="#fff"
                  strokeWidth={1}
                  className="cursor-pointer transition-all duration-200 hover:opacity-85"
                  onClick={() => { setSelectedRegion('RedRiverDelta'); setFilterRegion('RedRiverDelta'); }}
                />

                {/* North Central Region */}
                <polygon
                  points="58,74 82,65 108,70 115,82 122,95 128,112 134,130 138,145 137,155 126,145 115,138 105,128 95,120 85,110 75,98 65,85"
                  fill="#F59E0B"
                  stroke="#fff"
                  strokeWidth={1}
                  className="cursor-pointer transition-all duration-200 hover:opacity-85"
                  onClick={() => { setSelectedRegion('NorthCentral'); setFilterRegion('NorthCentral'); }}
                />

                {/* South Central Region */}
                <polygon
                  points="137,155 142,165 146,180 149,195 152,210 154,225 153,240 150,255 142,268 135,260 132,245 130,225 127,205 128,185 132,170"
                  fill="#60A5FA"
                  stroke="#fff"
                  strokeWidth={1}
                  className="cursor-pointer transition-all duration-200 hover:opacity-85"
                  onClick={() => { setSelectedRegion('SouthCentral'); setFilterRegion('SouthCentral'); }}
                />

                {/* Central Highlands Region */}
                <polygon
                  points="137,155 132,170 128,185 127,205 130,225 132,245 135,260 122,255 114,250 108,238 108,218 112,198 118,180 124,165"
                  fill="#60A5FA"
                  stroke="#fff"
                  strokeWidth={1}
                  className="cursor-pointer transition-all duration-200 hover:opacity-85"
                  onClick={() => { setSelectedRegion('CentralHighlands'); setFilterRegion('CentralHighlands'); }}
                />

                {/* Southeast Region */}
                <polygon
                  points="114,250 102,248 92,255 88,265 96,275 105,285 114,290 122,282 130,272 135,260 122,255"
                  fill="#60A5FA"
                  stroke="#fff"
                  strokeWidth={1}
                  className="cursor-pointer transition-all duration-200 hover:opacity-85"
                  onClick={() => { setSelectedRegion('Southeast'); setFilterRegion('Southeast'); }}
                />

                {/* Mekong Delta Region */}
                <polygon
                  points="88,265 80,272 70,278 62,288 52,298 46,310 48,325 52,338 60,345 72,342 85,335 98,320 108,305 114,290 105,285 96,275"
                  fill="#60A5FA"
                  stroke="#fff"
                  strokeWidth={1}
                  className="cursor-pointer transition-all duration-200 hover:opacity-85"
                  onClick={() => { setSelectedRegion('MekongDelta'); setFilterRegion('MekongDelta'); }}
                />

                {/* Paracel Islands (Quần đảo Hoàng Sa) */}
                <g className="cursor-pointer transition-all duration-200 hover:opacity-85" onClick={() => { setSelectedRegion('SouthCentral'); setFilterRegion('SouthCentral'); }}>
                  <circle cx="185" cy="120" r="2.5" fill="#60A5FA" stroke="#fff" strokeWidth={0.5} />
                  <circle cx="192" cy="122" r="2" fill="#60A5FA" stroke="#fff" strokeWidth={0.5} />
                  <circle cx="188" cy="128" r="2" fill="#60A5FA" stroke="#fff" strokeWidth={0.5} />
                  <circle cx="195" cy="127" r="1.5" fill="#60A5FA" stroke="#fff" strokeWidth={0.5} />
                  <text x="185" y="140" fontSize="7" fontWeight="bold" fill="#0f172a" textAnchor="middle">QĐ. Hoàng Sa</text>
                </g>

                {/* Spratly Islands (Quần đảo Trường Sa) */}
                <g className="cursor-pointer transition-all duration-200 hover:opacity-85" onClick={() => { setSelectedRegion('SouthCentral'); setFilterRegion('SouthCentral'); }}>
                  <circle cx="195" cy="290" r="2" fill="#60A5FA" stroke="#fff" strokeWidth={0.5} />
                  <circle cx="202" cy="295" r="1.5" fill="#60A5FA" stroke="#fff" strokeWidth={0.5} />
                  <circle cx="208" cy="305" r="2.5" fill="#60A5FA" stroke="#fff" strokeWidth={0.5} />
                  <circle cx="215" cy="315" r="1.5" fill="#60A5FA" stroke="#fff" strokeWidth={0.5} />
                  <circle cx="198" cy="308" r="2" fill="#60A5FA" stroke="#fff" strokeWidth={0.5} />
                  <text x="205" y="328" fontSize="7" fontWeight="bold" fill="#0f172a" textAnchor="middle">QĐ. Trường Sa</text>
                </g>
              </g>
            </svg>
          ) : (
            // Detailed 63-province GeoJSON map displaying ONLY the 34 provinces from dataset
            <svg
              className="w-full h-full max-w-[320px]"
              viewBox="0 0 260 480"
              style={{
                filter: 'drop-shadow(0 4px 6px rgba(15, 23, 42, 0.08))',
                cursor: zoomScale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <g
                style={{
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.15s ease-out'
                }}
              >
                {/* Render 34 Provinces paths */}
                {geoJson.features.map((feature, idx) => {
                  const provName = feature.properties.NAME_1;
                  const statusInfo = provinceStatus[provName];

                  // Omit the other 29 provinces not in the 34-province dataset
                  if (!statusInfo) return null;

                  const pathData = getProvincePath(feature);
                  const regionKey = getRegionOfProvince(provName);
                  const isSelected = selectedRegion === regionKey;

                   return (
                    <path
                      key={idx}
                      d={pathData}
                      fill={statusInfo.color}
                      stroke={isSelected ? '#2563EB' : '#fff'}
                      strokeWidth={isSelected ? 1.2 : 0.4}
                      className="cursor-pointer transition-all duration-150 hover:opacity-85"
                      onMouseEnter={(e) => {
                        setHoveredProvince({ name: getProvinceLabel(provName), originalName: provName, status: statusInfo.status });
                        setMapTooltipPos({ x: e.clientX, y: e.clientY });
                      }}
                      onMouseMove={(e) => {
                        setMapTooltipPos({ x: e.clientX, y: e.clientY });
                      }}
                      onMouseLeave={() => setHoveredProvince(null)}
                      onClick={() => { setSelectedRegion(regionKey); setFilterRegion(regionKey); }}
                    />
                  );
                })}

                {/* Paracel Islands (Quần đảo Hoàng Sa) */}
                <g className="cursor-pointer transition-all duration-200 hover:opacity-85" onClick={() => { setSelectedRegion('SouthCentral'); setFilterRegion('SouthCentral'); }}>
                  <circle cx="185" cy="120" r="2.5" fill="#60A5FA" stroke="#fff" strokeWidth={0.5} />
                  <circle cx="192" cy="122" r="2" fill="#60A5FA" stroke="#fff" strokeWidth={0.5} />
                  <circle cx="188" cy="128" r="2" fill="#60A5FA" stroke="#fff" strokeWidth={0.5} />
                  <circle cx="195" cy="127" r="1.5" fill="#60A5FA" stroke="#fff" strokeWidth={0.5} />
                  <text x="185" y="140" fontSize="6.5" fontWeight="bold" fill="#0f172a" textAnchor="middle">QĐ. Hoàng Sa</text>
                  <text x="185" y="148" fontSize="5.5" fontWeight="bold" fill="#475569" textAnchor="middle">(Đà Nẵng - Việt Nam)</text>
                </g>

                {/* Spratly Islands (Quần đảo Trường Sa) */}
                <g className="cursor-pointer transition-all duration-200 hover:opacity-85" onClick={() => { setSelectedRegion('SouthCentral'); setFilterRegion('SouthCentral'); }}>
                  <circle cx="195" cy="290" r="2" fill="#60A5FA" stroke="#fff" strokeWidth={0.5} />
                  <circle cx="202" cy="295" r="1.5" fill="#60A5FA" stroke="#fff" strokeWidth={0.5} />
                  <circle cx="208" cy="305" r="2.5" fill="#60A5FA" stroke="#fff" strokeWidth={0.5} />
                  <circle cx="215" cy="315" r="1.5" fill="#60A5FA" stroke="#fff" strokeWidth={0.5} />
                  <circle cx="198" cy="308" r="2" fill="#60A5FA" stroke="#fff" strokeWidth={0.5} />
                  <text x="205" y="328" fontSize="6.5" fontWeight="bold" fill="#0f172a" textAnchor="middle">QĐ. Trường Sa</text>
                  <text x="205" y="336" fontSize="5.5" fontWeight="bold" fill="#475569" textAnchor="middle">(Khánh Hòa - Việt Nam)</text>
                </g>

                {/* Render Province Text Labels */}
                {geoJson.features.map((feature, idx) => {
                  const provName = feature.properties.NAME_1;
                  const statusInfo = provinceStatus[provName];
                  if (!statusInfo) return null;

                  const [cx, cy] = getCentroid(feature);
                  const offset = labelOffsets[provName] || { dx: 0, dy: 0 };
                  const label = getProvinceLabel(provName);

                  return (
                    <text
                      key={`label-${idx}`}
                      x={cx + offset.dx}
                      y={cy + offset.dy}
                      fontSize="5.8"
                      fontWeight="bold"
                      fill="#0f172a"
                      textAnchor="middle"
                      className="pointer-events-none select-none"
                    >
                      {label}
                    </text>
                  );
                })}
              </g>
            </svg>
          )}

        </div>

      </div>

      {/* 2B. Main Analytics Section (2-Column Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Left: Temperature Trend Chart */}
        <div className="glass-panel rounded-2xl p-6 bg-white border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-800">Biến thiên nhiệt độ 3 miền</h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Xu hướng nhiệt độ trung bình (°C) tại Hà Nội, Huế và TP. HCM theo thời gian.</p>
          </div>
          <div className="h-72 w-full text-xs font-semibold">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={tempTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                <XAxis dataKey="date" stroke="#70859c" />
                <YAxis stroke="#70859c" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '8px' }}
                  labelStyle={{ fontWeight: 'bold', color: '#2563EB' }}
                />
                <Legend verticalAlign="top" height={36} />
                <Line type="monotone" dataKey="Hà Nội" stroke="#06B6D4" strokeWidth={2} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Huế" stroke="#f59e0b" strokeWidth={2} />
                <Line type="monotone" dataKey="Hồ Chí Minh" stroke="#f43f5e" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Rainfall by Province Bar Chart */}
        <div className="glass-panel rounded-2xl p-6 bg-white border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-800">Lượng mưa theo tỉnh thành (Top 10)</h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Các tỉnh thành có lượng mưa tích lũy trung bình (mm) cao nhất trong năm.</p>
          </div>
          <div className="h-72 w-full text-xs font-semibold">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredRainfallData.length > 0 ? filteredRainfallData : [{ name: 'Không có dữ liệu', value: 0 }]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                <XAxis dataKey="name" stroke="#70859c" tick={{ fontSize: 9 }} />
                <YAxis stroke="#70859c" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '8px' }}
                  labelStyle={{ fontWeight: 'bold', color: '#2563EB' }}
                />
                <Bar dataKey="value" name="Lượng mưa" fill="#2563EB" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* 2C. Secondary Analytics Section (2-Column Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Left: Humidity Distribution Area Chart */}
        <div className="glass-panel rounded-2xl p-6 bg-white border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-800">Độ ẩm tương đối theo vùng miền</h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Phân bố độ ẩm trung bình (%) của 7 khu vực địa lý khí hậu Việt Nam.</p>
          </div>
          <div className="h-72 w-full text-xs font-semibold">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsAreaChart data={humidityDistributionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                <XAxis dataKey="name" stroke="#70859c" tick={{ fontSize: 8 }} />
                <YAxis stroke="#70859c" domain={[60, 90]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '8px' }}
                />
                <Area type="monotone" dataKey="value" name="Độ ẩm TB" fill="#06B6D4" fillOpacity={0.15} stroke="#06B6D4" strokeWidth={2} />
              </RechartsAreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Temp vs Humidity Correlation Scatter Plot */}
        <div className="glass-panel rounded-2xl p-6 bg-white border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-800">Tương quan: Nhiệt độ & độ ẩm</h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Biểu đồ phân tán (Scatter plot) mô tả mối quan hệ giữa nhiệt độ (°C) và độ ẩm (%).</p>
          </div>
          <div className="h-72 w-full text-xs font-semibold">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                <XAxis type="number" dataKey="temp" name="Nhiệt độ" unit="°C" stroke="#70859c" domain={[12, 34]} />
                <YAxis type="number" dataKey="humidity" name="Độ ẩm" unit="%" stroke="#70859c" domain={[70, 95]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '8px' }} />
                <Scatter name="Trạm thời tiết" data={correlationData} fill="#10b981" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* 4. New Replacement Section: Insights & Dataset Technical Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Column 1: Extreme Climate & Anomalies Alert Console */}
        <div className="glass-panel rounded-2xl p-6 bg-white border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center gap-2.5">
            <img src="https://img.icons8.com/fluency/48/info.png" alt="Cảnh báo" className="h-6 w-6 object-contain flex-shrink-0" />
            <h3 className="text-base font-bold text-slate-800">Cảnh báo khí hậu đặc biệt</h3>
          </div>

          <div className="space-y-2.5 flex-1">
            <div className="flex gap-3 items-start p-2.5 bg-rose-50/40 border border-rose-100/50 rounded-xl">
              <span className="mt-0.5 text-[9px] bg-rose-100 border border-rose-200 text-rose-700 font-bold w-[76px] py-0.5 rounded flex-shrink-0 text-center justify-center flex items-center">NẮNG NÓNG</span>
              <div className="space-y-0.5">
                <p className="text-[11px] font-bold text-slate-800">Đông Nam Bộ (TP. HCM)</p>
                <p className="text-[10px] text-slate-650 font-medium leading-relaxed">
                  Đạt cực đại <strong className="text-rose-650">35.8 °C</strong>, chỉ số UV cực đại ở mức nguy hại là <strong>9.0</strong> vào giữa tháng 5/2026.
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-start p-2.5 bg-blue-50/30 border border-blue-100/50 rounded-xl">
              <span className="mt-0.5 text-[9px] bg-blue-100 border border-blue-200 text-blue-700 font-bold w-[76px] py-0.5 rounded flex-shrink-0 text-center justify-center flex items-center">MƯA LỚN</span>
              <div className="space-y-0.5">
                <p className="text-[11px] font-bold text-slate-800">Bắc Trung Bộ (Hà Tĩnh & Quảng Trị)</p>
                <p className="text-[10px] text-slate-650 font-medium leading-relaxed">
                  Lượng mưa kỷ lục đạt <strong>4.98 mm</strong> và <strong>4.25 mm</strong>, cao gấp 2.5 lần trung bình toàn quốc.
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-start p-2.5 bg-amber-50/40 border border-amber-100/50 rounded-xl">
              <span className="mt-0.5 text-[9px] bg-amber-100 border border-amber-200 text-amber-700 font-bold w-[76px] py-0.5 rounded flex-shrink-0 text-center justify-center flex items-center">TIA UV</span>
              <div className="space-y-0.5">
                <p className="text-[11px] font-bold text-slate-800">Tây Nam Bộ (An Giang)</p>
                <p className="text-[10px] text-slate-650 font-medium leading-relaxed">
                  Chỉ số UV cực đại chạm ngưỡng nguy hại <strong className="text-amber-700">9.2</strong>. Khuyến cáo hạn chế di chuyển ngoài trời.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Data Crawling & Sampling Engine */}
        <div className="glass-panel rounded-2xl p-6 bg-white border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center gap-2.5">
            <img src="https://img.icons8.com/fluency/48/weather.png" alt="Thu thập" className="h-6 w-6 object-contain flex-shrink-0" />
            <h3 className="text-base font-bold text-slate-800">Thu thập & xử lý số liệu</h3>
          </div>

          <div className="divide-y divide-slate-100 text-xs font-semibold flex-1">
            <div className="py-2 flex justify-between items-start gap-4">
              <span className="text-slate-400 flex-shrink-0">API Nguồn:</span>
              <span className="text-slate-800 font-bold text-right">Open-Meteo API</span>
            </div>
            <div className="py-2 flex justify-between items-start gap-4">
              <span className="text-slate-400 flex-shrink-0">Script chính:</span>
              <span className="text-slate-800 font-mono text-[11px] text-right">script/01_crawl.py</span>
            </div>
            <div className="py-2 flex flex-col gap-1">
              <span className="text-slate-400">Phương pháp lấy mẫu:</span>
              <p className="text-[10px] text-slate-650 leading-relaxed font-medium">
                • Tỉnh thông thường: Thu thập **5 điểm** quanh centroid.<br />
                • Tỉnh diện tích lớn: Thu thập **9 điểm** để tăng độ đại diện không gian.
              </p>
            </div>
            <div className="py-2 flex flex-col gap-1">
              <span className="text-slate-400">Phương pháp tổng hợp:</span>
              <p className="text-[10px] text-slate-650 leading-relaxed font-medium">
                • Biến số đo đạc: Tính giá trị trung bình theo ngày.<br />
                • Biến phân loại: Lấy yếu vị cho các chỉ số chính.
              </p>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 font-bold border-t border-slate-100 pt-2 flex justify-between">
            <span>Đầu ra: data/raw/openmeteo_2026/</span>
          </div>
        </div>

        {/* Column 3: Fixed Meteorological Dataset Specs */}
        <div className="glass-panel rounded-2xl p-6 bg-white border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center gap-2.5">
            <img src="https://img.icons8.com/fluency/48/csv.png" alt="Thông số" className="h-6 w-6 object-contain flex-shrink-0" />
            <h3 className="text-base font-bold text-slate-800">Thông số tập dữ liệu</h3>
          </div>

          <div className="divide-y divide-slate-100 text-xs font-semibold flex-1">
            <div className="py-2 flex justify-between">
              <span className="text-slate-400">Tên tệp:</span>
              <span className="text-slate-800 font-bold max-w-[130px] truncate" title="vietnam_kttv_34tinh_2025-12-06_2026-06-04.csv">
                vietnam_kttv_34tinh...csv
              </span>
            </div>
            <div className="py-2 flex justify-between">
              <span className="text-slate-400">Dung lượng:</span>
              <span className="text-slate-800 font-mono font-bold">2.38 MB</span>
            </div>
            <div className="py-2 flex justify-between">
              <span className="text-slate-400">Tổng số bản ghi:</span>
              <span className="text-slate-800 font-mono font-bold">{fullStats ? fullStats.totalRows.toLocaleString() : '...'} dòng</span>
            </div>
            <div className="py-2 flex justify-between">
              <span className="text-slate-400">Số lượng cột:</span>
              <span className="text-slate-800 font-mono font-bold">36 thuộc tính</span>
            </div>
            <div className="py-2 flex justify-between">
              <span className="text-slate-400">Thời gian:</span>
              <span className="text-slate-800 font-mono font-bold">
                {fullStats ? `${fullStats.dateRange.min} → ${fullStats.dateRange.max}` : '...'}
              </span>
            </div>
            <div className="py-2 flex justify-between">
              <span className="text-slate-400">Bao phủ:</span>
              <span className="text-slate-800 font-bold">{fullStats ? fullStats.provinces.length : 34} tỉnh/thành</span>
            </div>
          </div>

          <button
            onClick={() => setCurrentTab('datasets')}
            className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 text-xs font-bold transition-all"
          >
            Xem cấu trúc chi tiết
          </button>
        </div>
      </div>

    </div>
  );
}

// (predefinedQueries moved to mockData.js — imported by App.jsx)
const predefinedQueries = [
  {
    id: 1,
    title: "So sánh lượng mưa các vùng",
    question: "Tỉnh nào mưa nhiều nhất?",
    explanation: "Tính toán lượng mưa trung bình theo từng vùng (region) từ tháng 12/2025 đến tháng 03/2026...",
    code: `# Lượng mưa\nprint("Script lượng mưa")`,
    logs: ["[2026-06-24 12:49:05] Running..."],
    kpis: [{ label: "Nhiệt độ", value: "25.8", desc: "Avg", trend: "up" }],
    chartType: "bar",
    chartData: [{ name: "Tây Ninh", value: 3.5 }]
  },
  {
    id: 2,
    title: "Xu hướng nhiệt độ 3 miền",
    question: "Xu hướng nhiệt độ 3 miền",
    explanation: "Nhóm dữ liệu theo ngày và lọc riêng cho 3 thành phố đại diện 3 miền...",
    code: `# Xu hướng\nprint("Script xu hướng")`,
    logs: ["[2026-06-24 12:51:10] Running..."],
    kpis: [{ label: "Nhiệt độ", value: "25.8", desc: "Avg", trend: "up" }],
    chartType: "line",
    chartData: [{ date: "12-06", "Hà Nội": 20.1 }]
  },
  {
    id: 3,
    title: "10 tỉnh nóng nhất",
    question: "Tỉnh nào nóng nhất?",
    explanation: "Trích xuất dữ liệu của tháng 5/2026, tính toán giá trị trung bình của nhiệt độ...",
    code: `# Nóng nhất\nprint("Script nóng nhất")`,
    logs: ["[2026-06-24 12:54:20] Running..."],
    kpis: [{ label: "Nhiệt độ", value: "25.8", desc: "Avg", trend: "up" }],
    chartType: "scatter",
    chartData: [{ name: "Tây Ninh", temp: 32.48, rain: 0.04 }]
  }
];
