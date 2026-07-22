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
  Check,
  Sun,
  Glasses,
  Flame
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
  const { loading, error, fullStats, filteredStats, filters, setFilters, rawRows, filteredRows, isColorblind } = useData();

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

  // Dedicated filters for Climate Ranking section
  const [rankOrder, setRankOrder] = useState('desc'); // 'desc' | 'asc'
  const [rankLimit, setRankLimit] = useState(5); // 5 | 10
  const [selectedRankMetric, setSelectedRankMetric] = useState('all'); // 'all' | 'temp' | 'rain' | 'humidity' | 'wind'

  // Sync local filter UI with global filter context
  const filterRegion = filters.regionKey;
  const filterMonth = filters.month;
  const filterSeason = filters.season;

  const setFilterRegion = (v) => setFilters(f => ({ ...f, regionKey: v }));
  const setFilterMonth = (v) => setFilters(f => ({ ...f, month: v }));
  const setFilterSeason = (v) => setFilters(f => ({ ...f, season: v }));

  // Automatically sync selected region on map inspector when region filter changes
  useEffect(() => {
    if (filterRegion) {
      setSelectedRegion(filterRegion);
    }
  }, [filterRegion]);

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

  const directColor = isColorblind ? '#E69F00' : '#F59E0B';
  const mergedColor = isColorblind ? '#0072B2' : '#60A5FA';

  const provinceStatus = useMemo(() => ({
    "Lai Châu": { status: "Không sáp nhập", color: directColor },
    "Điện Biên": { status: "Không sáp nhập", color: directColor },
    "Sơn La": { status: "Không sáp nhập", color: directColor },
    "Cao Bằng": { status: "Không sáp nhập", color: directColor },
    "Lạng Sơn": { status: "Không sáp nhập", color: directColor },
    "Quảng Ninh": { status: "Không sáp nhập", color: directColor },
    "Hà Nội": { status: "Không sáp nhập", color: directColor },
    "Thanh Hóa": { status: "Không sáp nhập", color: directColor },
    "Nghệ An": { status: "Không sáp nhập", color: directColor },
    "Hà Tĩnh": { status: "Không sáp nhập", color: directColor },
    "Thừa Thiên - Huế": { status: "Không sáp nhập", color: directColor, label: "TP. Huế" },

    "Tuyên Quang": { status: "Sáp nhập", color: mergedColor },
    "Lào Cai": { status: "Sáp nhập", color: mergedColor },
    "Phú Thọ": { status: "Sáp nhập", color: mergedColor },
    "Thái Nguyên": { status: "Sáp nhập", color: mergedColor },
    "Bắc Ninh": { status: "Sáp nhập", color: mergedColor },
    "Hải Phòng": { status: "Sáp nhập", color: mergedColor },
    "Hưng Yên": { status: "Sáp nhập", color: mergedColor },
    "Ninh Bình": { status: "Sáp nhập", color: mergedColor },
    "Quảng Trị": { status: "Sáp nhập", color: mergedColor },
    "Đà Nẵng": { status: "Sáp nhập", color: mergedColor },
    "Quảng Ngãi": { status: "Sáp nhập", color: mergedColor },
    "Gia Lai": { status: "Sáp nhập", color: mergedColor },
    "Đắk Lắk": { status: "Sáp nhập", color: mergedColor },
    "Khánh Hòa": { status: "Sáp nhập", color: mergedColor },
    "Lâm Đồng": { status: "Sáp nhập", color: mergedColor },
    "Đồng Nai": { status: "Sáp nhập", color: mergedColor },
    "Tây Ninh": { status: "Sáp nhập", color: mergedColor },
    "Thành phố Hồ Chí Minh": { status: "Sáp nhập", color: mergedColor, label: "TP. HCM" },
    "An Giang": { status: "Sáp nhập", color: mergedColor },
    "Đồng Tháp": { status: "Sáp nhập", color: mergedColor },
    "Vĩnh Long": { status: "Sáp nhập", color: mergedColor },
    "Cần Thơ": { status: "Sáp nhập", color: mergedColor },
    "Cà Mau": { status: "Sáp nhập", color: mergedColor },
    "Kiên Giang": { status: "Sáp nhập", color: mergedColor, label: "Đ. Phú Quốc" }
  }), [directColor, mergedColor]);

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

  // ── Data from CSV (real & dynamically filtered) ───────────────────
  const activeRows = (filteredRows !== null && filteredRows !== undefined) ? filteredRows : rawRows;
  const activeStats = filteredStats || fullStats;
  const nationalKPIs = activeStats ? activeStats.nationalKPIs : { temp: 0, rain: 0, humidity: 0, wind: 0, sunshine: 0, et0: 0 };

  // Dynamic regional aggregates calculated strictly from active filtered rows
  const regionalData = useMemo(() => {
    const REGION_NAMES = {
      RedRiverDelta:      'Đồng bằng sông Hồng',
      NorthMountain:      'Trung du miền núi Bắc Bộ',
      NorthCentral:       'Bắc Trung Bộ',
      SouthCentral:       'Duyên hải Nam Trung Bộ',
      CentralHighlands:   'Tây Nguyên',
      Southeast:          'Đông Nam Bộ',
      MekongDelta:        'Đồng bằng sông Cửu Long',
    };

    const grouped = {};
    activeRows.forEach(r => {
      const key = r.regionKey || 'NorthMountain';
      if (!grouped[key]) {
        grouped[key] = { temp: [], rain: [], humidity: [], wind: [], provinces: new Set() };
      }
      const g = grouped[key];
      if (r.temp !== null && !isNaN(r.temp)) g.temp.push(r.temp);
      if (r.rain !== null && !isNaN(r.rain)) g.rain.push(r.rain);
      if (r.humidity !== null && !isNaN(r.humidity)) g.humidity.push(r.humidity);
      if (r.wind !== null && !isNaN(r.wind)) g.wind.push(r.wind);
      if (r.province) g.provinces.add(r.province);
    });

    const avg = arr => arr.length ? arr.reduce((sum, v) => sum + v, 0) / arr.length : 0;
    const res = {};
    Object.entries(REGION_NAMES).forEach(([key, name]) => {
      const g = grouped[key] || { temp: [], rain: [], humidity: [], wind: [], provinces: new Set() };
      res[key] = {
        name,
        temp: (avg(g.temp)).toFixed(2),
        rain: (avg(g.rain)).toFixed(2),
        humidity: Math.round(avg(g.humidity)),
        wind: (avg(g.wind)).toFixed(2),
        provinces: Array.from(g.provinces).slice(0, 10).join(', ') || 'Nhiều tỉnh thành'
      };
    });

    // Add entry for 'All' (National average)
    res['All'] = {
      name: 'Toàn Quốc (Cả nước)',
      temp: nationalKPIs.temp,
      rain: nationalKPIs.rain,
      humidity: nationalKPIs.humidity,
      wind: nationalKPIs.wind,
      provinces: '34 Tỉnh thành trên toàn quốc'
    };

    return res;
  }, [activeRows, nationalKPIs]);

  const tempTrendData = fullStats ? fullStats.tempTrend : [];
  const rainfallProvincesData = activeStats ? activeStats.topRainfallProvinces : [];
  const humidityDistributionData = activeStats ? activeStats.humidityByRegion : [];
  const correlationData = activeStats ? activeStats.correlationData : [];

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

  // Pre-calculate average statistics for each province from active filtered rows
  const provinceStats = useMemo(() => {
    if (!activeRows.length) return {};
    const grouped = {};
    activeRows.forEach(r => {
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
  }, [activeRows]);

  const provinceStatsArray = useMemo(() => {
    return Object.entries(provinceStats).map(([name, data]) => ({
      name,
      temp: parseFloat(data.temp) || 0,
      rain: parseFloat(data.rain) || 0,
      humidity: parseFloat(data.humidity) || 0,
      wind: parseFloat(data.wind) || 0
    }));
  }, [provinceStats]);



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
    setCurrentTab('aianalyst');
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

  const renderRankBadge = (idx) => {
    if (idx === 0) {
      return (
        <span className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-200 text-amber-950 font-black text-xs shadow-md flex items-center justify-center border-2 border-yellow-300 ring-2 ring-amber-400/40 flex-shrink-0" title="Huy chương Vàng (Top 1)">
          1
        </span>
      );
    }
    if (idx === 1) {
      return (
        <span className="w-7 h-7 rounded-full bg-gradient-to-tr from-slate-300 via-slate-200 to-slate-100 text-slate-800 font-black text-xs shadow-md flex items-center justify-center border-2 border-slate-300 ring-2 ring-slate-300/40 flex-shrink-0" title="Huy chương Bạc (Top 2)">
          2
        </span>
      );
    }
    if (idx === 2) {
      return (
        <span className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-700 via-amber-600 to-yellow-700 text-white font-black text-xs shadow-md flex items-center justify-center border-2 border-amber-600 ring-2 ring-amber-600/40 flex-shrink-0" title="Huy chương Đồng (Top 3)">
          3
        </span>
      );
    }
    return (
      <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 font-bold text-xs flex items-center justify-center flex-shrink-0 border border-slate-200">
        {idx + 1}
      </span>
    );
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

      {/* 1. Concise Header Banner (Centered) */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-brand-primary to-brand-accent p-6 border border-blue-200 shadow-md">
        <div className="relative z-10 flex flex-col items-center justify-center text-center gap-3 text-white">
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight uppercase text-center">
            NỀN TẢNG PHÂN TÍCH THỜI TIẾT & KHÍ HẬU VIỆT NAM
          </h1>
          <p className="text-blue-50 text-xs font-semibold max-w-2xl text-center leading-relaxed">
            Dự án Trực quan hóa dữ liệu Khí tượng Thủy văn 34 tỉnh thành Việt Nam tích hợp trợ lý lập trình AI cục bộ.
          </p>
          <div className="pt-1">
            {!datasetUploaded ? (
              <button
                onClick={() => setCurrentTab('datasets')}
                className="bg-white hover:bg-slate-50 text-brand-primary text-xs font-bold px-6 py-2.5 rounded-xl shadow-md transition-all active:scale-95"
              >
                Nạp tập dữ liệu mẫu
              </button>
            ) : (
              <button
                onClick={() => setCurrentTab('aianalyst')}
                className="bg-white hover:bg-slate-50 text-brand-primary text-xs font-bold px-6 py-2.5 rounded-xl shadow-md transition-all active:scale-95"
              >
                Hỏi AI Phân Tích
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Enhanced Filter Control Center (Centered) */}
      <div className="relative z-10 glass-panel rounded-2xl p-3.5 bg-gradient-to-br from-white to-slate-50 border border-brand-primary/20 shadow-lg flex flex-wrap items-center justify-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="bg-brand-primary/10 p-1.5 rounded-xl">
            <img src="https://img.icons8.com/fluency/48/sorting-options.png" alt="Filter" className="h-4.5 w-4.5 object-contain flex-shrink-0" />
          </div>
          <span className="font-extrabold text-xs uppercase tracking-wide text-brand-primary">Bộ lọc</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <span className="bg-slate-50 border-r border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500 flex items-center">Khu vực</span>
            <select
              value={filterRegion}
              onChange={(e) => {
                setFilterRegion(e.target.value);
                if (e.target.value !== 'All') setSelectedRegion(e.target.value);
              }}
              className="px-3 py-1.5 text-xs font-bold text-slate-800 bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-primary min-w-[150px] cursor-pointer"
            >
              <option value="All">Tất cả vùng miền</option>
              <option value="NorthMountain">Miền núi phía Bắc</option>
              <option value="RedRiverDelta">Đồng bằng sông Hồng</option>
              <option value="NorthCentral">Bắc Trung Bộ</option>
              <option value="SouthCentral">Duyên hải Nam Trung Bộ</option>
              <option value="CentralHighlands">Tây Nguyên</option>
              <option value="Southeast">Đông Nam Bộ</option>
              <option value="MekongDelta">Đồng bằng s. Cửu Long</option>
            </select>
          </div>

          <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <span className="bg-slate-50 border-r border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500 flex items-center">Thời gian</span>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold text-slate-800 bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-primary min-w-[125px] cursor-pointer"
            >
              <option value="All">Tất cả thời gian</option>
              <option value="1">Tháng 1</option>
              <option value="2">Tháng 2</option>
              <option value="3">Tháng 3</option>
              <option value="4">Tháng 4</option>
              <option value="5">Tháng 5</option>
              <option value="6">Tháng 6</option>
              <option value="7">Tháng 7</option>
              <option value="8">Tháng 8</option>
              <option value="9">Tháng 9</option>
              <option value="10">Tháng 10</option>
              <option value="11">Tháng 11</option>
              <option value="12">Tháng 12</option>
            </select>
          </div>

          <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <span className="bg-slate-50 border-r border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500 flex items-center">Mùa</span>
            <select
              value={filterSeason}
              onChange={(e) => setFilterSeason(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold text-slate-800 bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-primary min-w-[125px] cursor-pointer"
            >
              <option value="All">Tất cả các mùa</option>
              <option value="Xuân">Mùa Xuân</option>
              <option value="Hè">Mùa Hè</option>
              <option value="Thu">Mùa Thu</option>
              <option value="Đông">Mùa Đông</option>
            </select>
          </div>

          {(filterRegion !== 'All' || filterMonth !== 'All' || filterSeason !== 'All') && (
            <button
              onClick={() => {
                setFilterRegion('All');
                setFilterMonth('All');
                setFilterSeason('All');
              }}
              className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs px-3 py-1.5 rounded-xl transition-all border border-rose-200 active:scale-95"
            >
              Xóa Lọc
            </button>
          )}
        </div>
      </div>

      {/* 3. Thẻ KPI Cảnh Báo (Compact Alert Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
        
        {/* Nắng Nóng */}
        <div className="glass-card rounded-2xl p-4 relative overflow-hidden bg-rose-50/60 border border-rose-200 shadow-sm flex flex-col justify-between">
          <Sun className="w-20 h-20 text-rose-500/10 absolute -right-4 -top-4 pointer-events-none" />
          <div className="flex items-center justify-between mb-2 relative z-10">
            <div className="flex items-center gap-1.5">
              <span className="bg-rose-500 text-white text-[8.5px] font-extrabold uppercase px-1.5 py-0.5 rounded shadow-sm">Cảnh Báo</span>
              <span className="text-rose-700 text-[10px] font-bold uppercase tracking-wider">Nắng Nóng</span>
            </div>
            <div className="p-1.5 bg-rose-100/80 rounded-lg">
              <Sun className="h-5 w-5 text-rose-600 flex-shrink-0" />
            </div>
          </div>
          <div className="space-y-0.5 relative z-10">
            <div className="flex items-end gap-1.5">
              <span className="text-2xl font-extrabold text-rose-600 tracking-tight">{displayTemp} °C</span>
              <span className="text-[11px] text-rose-500 font-bold pb-0.5">Trung bình</span>
            </div>
            <p className="text-[9.5px] text-rose-800/80 font-medium leading-tight">
              Đỉnh điểm có thể chạm mức <strong className="text-rose-700">35.8 °C</strong> tại Đông Nam Bộ. Nguy cơ sốc nhiệt cao.
            </p>
          </div>
        </div>

        {/* Mưa Lớn */}
        <div className="glass-card rounded-2xl p-4 relative overflow-hidden bg-blue-50/60 border border-blue-200 shadow-sm flex flex-col justify-between">
          <CloudRain className="w-20 h-20 text-blue-500/10 absolute -right-4 -top-4 pointer-events-none" />
          <div className="flex items-center justify-between mb-2 relative z-10">
            <div className="flex items-center gap-1.5">
              <span className="bg-blue-500 text-white text-[8.5px] font-extrabold uppercase px-1.5 py-0.5 rounded shadow-sm">Cảnh Báo</span>
              <span className="text-blue-700 text-[10px] font-bold uppercase tracking-wider">Mưa Lớn</span>
            </div>
            <div className="p-1.5 bg-blue-100/80 rounded-lg">
              <CloudRain className="h-5 w-5 text-blue-600 flex-shrink-0" />
            </div>
          </div>
          <div className="space-y-0.5 relative z-10">
            <div className="flex items-end gap-1.5">
              <span className="text-2xl font-extrabold text-blue-600 tracking-tight">{displayRain} mm</span>
              <span className="text-[11px] text-blue-500 font-bold pb-0.5">Trung bình</span>
            </div>
            <p className="text-[9.5px] text-blue-800/80 font-medium leading-tight">
              Lượng mưa có thể cao gấp <strong className="text-blue-700">2.5 lần</strong> bình thường tại Bắc Trung Bộ. Nguy cơ ngập úng.
            </p>
          </div>
        </div>

        {/* Bức xạ UV */}
        <div className="glass-card rounded-2xl p-4 relative overflow-hidden bg-amber-50/60 border border-amber-200 shadow-sm flex flex-col justify-between">
          <Glasses className="w-20 h-20 text-amber-500/10 absolute -right-4 -top-4 pointer-events-none" />
          <div className="flex items-center justify-between mb-2 relative z-10">
            <div className="flex items-center gap-1.5">
              <span className="bg-amber-500 text-white text-[8.5px] font-extrabold uppercase px-1.5 py-0.5 rounded shadow-sm">Đáng Chú Ý</span>
              <span className="text-amber-700 text-[10px] font-bold uppercase tracking-wider">Chỉ Số UV</span>
            </div>
            <div className="p-1.5 bg-amber-100/80 rounded-lg">
              <Glasses className="h-5 w-5 text-amber-600 flex-shrink-0" />
            </div>
          </div>
          <div className="space-y-0.5 relative z-10">
            <div className="flex items-end gap-1.5">
              <span className="text-2xl font-extrabold text-amber-600 tracking-tight">9.2</span>
              <span className="text-[11px] text-amber-500 font-bold pb-0.5">Nguy hại</span>
            </div>
            <p className="text-[9.5px] text-amber-800/80 font-medium leading-tight">
              Ghi nhận tại Tây Nam Bộ vào giữa tháng. Khuyến cáo hạn chế di chuyển ngoài trời lúc giữa trưa.
            </p>
          </div>
        </div>

        {/* Khô Hạn */}
        <div className="glass-card rounded-2xl p-4 relative overflow-hidden bg-orange-50/60 border border-orange-200 shadow-sm flex flex-col justify-between">
          <Flame className="w-20 h-20 text-orange-500/10 absolute -right-4 -top-4 pointer-events-none" />
          <div className="flex items-center justify-between mb-2 relative z-10">
            <div className="flex items-center gap-1.5">
              <span className="bg-orange-500 text-white text-[8.5px] font-extrabold uppercase px-1.5 py-0.5 rounded shadow-sm">Theo Dõi</span>
              <span className="text-orange-700 text-[10px] font-bold uppercase tracking-wider">Khô Hạn</span>
            </div>
            <div className="p-1.5 bg-orange-100/80 rounded-lg">
              <Flame className="h-5 w-5 text-orange-600 flex-shrink-0" />
            </div>
          </div>
          <div className="space-y-0.5 relative z-10">
            <div className="flex items-end gap-1.5">
              <span className="text-2xl font-extrabold text-orange-600 tracking-tight">{displayHumidity} %</span>
              <span className="text-[11px] text-orange-500 font-bold pb-0.5">Độ ẩm TB</span>
            </div>
            <p className="text-[9.5px] text-orange-800/80 font-medium leading-tight">
              Lượng bốc hơi (ET₀) trung bình đạt <strong className="text-orange-700">{displayET0} mm</strong>. Chú ý cảnh báo cháy rừng diện rộng.
            </p>
          </div>
        </div>

      </div>

      {/* 2A. Vietnam Weather Map Section (Main visual focus - BIG MAP) */}
      <div className="glass-panel rounded-3xl bg-white border border-slate-200 shadow-xl grid grid-cols-1 lg:grid-cols-4 gap-0 overflow-hidden">
        
        {/* Map Panel Title & Inspector (1 column) */}
        <div className="lg:col-span-1 p-6 flex flex-col justify-between bg-slate-50/50 border-r border-slate-200/60 z-10">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                <MapPin className="h-6 w-6 text-brand-primary" /> Bản đồ khí hậu
              </h2>
              <p className="text-xs text-slate-500 font-semibold mt-2 leading-relaxed">
                Rê chuột hoặc click vào một khu vực để hiển thị báo cáo chi tiết về tình trạng thời tiết và các mức cảnh báo tương ứng.
              </p>
            </div>

            {/* Region Weather Inspector details card */}
            {selectedRegion && regionalData[selectedRegion] ? (
              <div className="bg-white border border-slate-200/80 shadow-sm rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <span className="font-extrabold text-slate-800 text-sm">{regionalData[selectedRegion].name}</span>
                  <span className="text-[10px] bg-blue-50 text-blue-600 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wide">
                    {selectedRegion === 'All' ? 'Cả nước' : 'Vùng'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">Nhiệt độ</span>
                    <p className="font-extrabold text-rose-600 text-base">{regionalData[selectedRegion].temp} °C</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">Lượng mưa</span>
                    <p className="font-extrabold text-blue-600 text-base">{regionalData[selectedRegion].rain} mm</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">Độ ẩm</span>
                    <p className="font-extrabold text-slate-700 text-base">{regionalData[selectedRegion].humidity} %</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">Gió</span>
                    <p className="font-extrabold text-slate-700 text-base">{regionalData[selectedRegion].wind} km/h</p>
                  </div>
                </div>
                <div className="pt-2.5 border-t border-slate-100">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Tỉnh thành đại diện:</span>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-semibold mt-0.5">
                    {regionalData[selectedRegion].provinces}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-slate-100 border border-slate-200 border-dashed rounded-xl p-5 text-center">
                <p className="text-xs text-slate-500 font-bold">Vui lòng chọn một khu vực</p>
              </div>
            )}
          </div>

          {/* Map Legend */}
          <div className="mt-4 pt-4 border-t border-slate-200/60">
            <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-3">Chú thích bản đồ</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full shadow-sm border border-slate-200" style={{ backgroundColor: directColor }}></div>
                <span className="text-xs font-bold text-slate-700">Trạm đo đạc trực tiếp (11 Tỉnh/Thành)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full shadow-sm border border-slate-200" style={{ backgroundColor: mergedColor }}></div>
                <span className="text-xs font-bold text-slate-700">Dữ liệu nội suy / Sáp nhập (23 Tỉnh/Thành)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic SVG Map container (Bigger - 3 columns, White background, Taller) */}
        <div className="lg:col-span-3 flex flex-col justify-center items-center bg-white h-[660px] relative overflow-hidden select-none">

          {/* Hover Province Tooltip */}
          {hoveredProvince && createPortal(
            (() => {
              const pStats = getProvinceStats(hoveredProvince.originalName);
              return (
                <div 
                  className="fixed bg-slate-900/95 backdrop-blur-md border border-slate-700/80 text-white rounded-2xl p-4 shadow-2xl pointer-events-none z-50 min-w-[240px] transition-all space-y-3"
                  style={{ 
                    left: `${mapTooltipPos.x + 15}px`, 
                    top: `${mapTooltipPos.y + 15}px`,
                    transform: mapTooltipPos.x > window.innerWidth - 260 ? 'translateX(-110%)' : 'none'
                  }}
                >
                  <div className="border-b border-slate-700/60 pb-2 flex justify-between items-center">
                    <span className="font-extrabold text-brand-accent text-base tracking-wide">{hoveredProvince.name}</span>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider border border-slate-700">{hoveredProvince.status}</span>
                  </div>
                  {pStats ? (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-xs text-slate-300">
                      <div>
                        <span className="text-[9.5px] text-slate-400 font-extrabold uppercase block font-sans tracking-wider">Nhiệt độ</span>
                        <span className="font-extrabold text-sm text-slate-100">{pStats.temp} °C</span>
                      </div>
                      <div>
                        <span className="text-[9.5px] text-slate-400 font-extrabold uppercase block font-sans tracking-wider">Lượng mưa</span>
                        <span className="font-extrabold text-sm text-blue-400">{pStats.rain} mm</span>
                      </div>
                      <div>
                        <span className="text-[9.5px] text-slate-400 font-extrabold uppercase block font-sans tracking-wider">Độ ẩm</span>
                        <span className="font-extrabold text-sm text-emerald-400">{pStats.humidity} %</span>
                      </div>
                      <div>
                        <span className="text-[9.5px] text-slate-400 font-extrabold uppercase block font-sans tracking-wider">Tốc độ gió</span>
                        <span className="font-extrabold text-sm text-slate-100">{pStats.wind} km/h</span>
                      </div>
                      <div className="col-span-2 pt-1 border-t border-slate-800/60">
                        <span className="text-[9.5px] text-slate-400 font-extrabold uppercase block font-sans tracking-wider">Giờ nắng trung bình</span>
                        <span className="font-extrabold text-sm text-amber-400">{pStats.sunshine} giờ</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 font-bold">Không có dữ liệu chi tiết</p>
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
              className="w-full h-full max-w-[550px] py-4"
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
              className="w-full h-full max-w-[460px] py-2 transition-transform"
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
                  const isSelected = selectedRegion === 'All' || selectedRegion === regionKey;

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

      {/* 2B. Xếp hạng khí hậu (Climate Ranking - Interactive Filter Toolbar) */}
      <div className="glass-panel rounded-2xl p-6 bg-white border border-slate-200 shadow-sm flex flex-col gap-6">
        
        {/* Ranking Toolbar Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
              <img src="https://img.icons8.com/fluency/48/star.png" alt="Ranking" className="h-6 w-6 object-contain flex-shrink-0" /> 
              {filterRegion === 'All' ? 'Xếp hạng khí hậu toàn quốc' : `Xếp hạng khí hậu ${regionalData[filterRegion]?.name || 'khu vực'}`}
            </h2>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              Tùy chỉnh tiêu chí lọc (Top 5 / Top 10, Cao nhất / Thấp nhất, Theo chỉ số) để xem bảng xếp hạng chi tiết.
            </p>
          </div>

          {/* Filter Controls Bar */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Sorting Order */}
            <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setRankOrder('desc')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  rankOrder === 'desc'
                    ? 'bg-white text-brand-primary shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Top Cao Nhất
              </button>
              <button
                type="button"
                onClick={() => setRankOrder('asc')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  rankOrder === 'asc'
                    ? 'bg-white text-brand-primary shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Top Thấp Nhất
              </button>
            </div>

            {/* Display Limit */}
            <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setRankLimit(5)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  rankLimit === 5
                    ? 'bg-white text-brand-primary shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Top 5
              </button>
              <button
                type="button"
                onClick={() => setRankLimit(10)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  rankLimit === 10
                    ? 'bg-white text-brand-primary shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Top 10
              </button>
            </div>

            {/* Metric Filter */}
            <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <span className="bg-slate-50 border-r border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500 flex items-center">Chỉ số</span>
              <select
                value={selectedRankMetric}
                onChange={(e) => setSelectedRankMetric(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold text-slate-800 bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-primary min-w-[130px] cursor-pointer"
              >
                <option value="all">Tất cả chỉ số</option>
                <option value="temp">Nhiệt độ</option>
                <option value="rain">Lượng mưa</option>
                <option value="humidity">Độ ẩm</option>
                <option value="wind">Tốc độ gió</option>
              </select>
            </div>

          </div>
        </div>

        {/* Dynamic Ranking Grid based on selected filters */}
        <div className={`grid grid-cols-1 ${selectedRankMetric === 'all' ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-1 max-w-2xl mx-auto w-full'} gap-5`}>
          
          {/* Top Nhiệt độ */}
          {(selectedRankMetric === 'all' || selectedRankMetric === 'temp') && (
            <div className="border border-rose-100 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-rose-50 px-4 py-3 border-b border-rose-100 flex items-center justify-between">
                <span className="font-extrabold text-rose-700 text-sm">
                  {rankOrder === 'desc' ? 'Top Nhiệt Độ Cao' : 'Top Nhiệt Độ Thấp'}
                </span>
                <img src="https://img.icons8.com/fluency/48/thermometer.png" alt="Nhiệt độ" className="h-5 w-5" />
              </div>
              <div className="divide-y divide-slate-100">
                {[...provinceStatsArray]
                  .sort((a, b) => rankOrder === 'desc' ? b.temp - a.temp : a.temp - b.temp)
                  .slice(0, rankLimit)
                  .map((stat, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        {renderRankBadge(idx)}
                        <span className="text-sm font-bold text-slate-800">{stat.name}</span>
                      </div>
                      <span className="text-sm font-extrabold text-slate-800">{stat.temp.toFixed(1)} °C</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Top Lượng mưa */}
          {(selectedRankMetric === 'all' || selectedRankMetric === 'rain') && (
            <div className="border border-blue-100 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-blue-50 px-4 py-3 border-b border-blue-100 flex items-center justify-between">
                <span className="font-extrabold text-blue-700 text-sm">
                  {rankOrder === 'desc' ? 'Top Lượng Mưa Lớn' : 'Top Mưa Ít (Khô Hạn)'}
                </span>
                <img src="https://img.icons8.com/fluency/48/rain.png" alt="Lượng mưa" className="h-5 w-5" />
              </div>
              <div className="divide-y divide-slate-100">
                {[...provinceStatsArray]
                  .sort((a, b) => rankOrder === 'desc' ? b.rain - a.rain : a.rain - b.rain)
                  .slice(0, rankLimit)
                  .map((stat, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        {renderRankBadge(idx)}
                        <span className="text-sm font-bold text-slate-800">{stat.name}</span>
                      </div>
                      <span className="text-sm font-extrabold text-slate-800">{stat.rain.toFixed(1)} mm</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Top Độ ẩm */}
          {(selectedRankMetric === 'all' || selectedRankMetric === 'humidity') && (
            <div className="border border-emerald-100 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-emerald-50 px-4 py-3 border-b border-emerald-100 flex items-center justify-between">
                <span className="font-extrabold text-emerald-700 text-sm">
                  {rankOrder === 'desc' ? 'Top Độ Ẩm Cao' : 'Top Độ Ẩm Thấp'}
                </span>
                <img src="https://img.icons8.com/fluency/48/humidity.png" alt="Độ ẩm" className="h-5 w-5" />
              </div>
              <div className="divide-y divide-slate-100">
                {[...provinceStatsArray]
                  .sort((a, b) => rankOrder === 'desc' ? b.humidity - a.humidity : a.humidity - b.humidity)
                  .slice(0, rankLimit)
                  .map((stat, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        {renderRankBadge(idx)}
                        <span className="text-sm font-bold text-slate-800">{stat.name}</span>
                      </div>
                      <span className="text-sm font-extrabold text-slate-800">{stat.humidity.toFixed(1)} %</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Top Tốc độ gió */}
          {(selectedRankMetric === 'all' || selectedRankMetric === 'wind') && (
            <div className="border border-cyan-100 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-cyan-50 px-4 py-3 border-b border-cyan-100 flex items-center justify-between">
                <span className="font-extrabold text-cyan-700 text-sm">
                  {rankOrder === 'desc' ? 'Top Tốc Độ Gió Mạnh' : 'Top Tốc Độ Gió Nhẹ'}
                </span>
                <img src="https://img.icons8.com/fluency/48/wind.png" alt="Tốc độ gió" className="h-5 w-5" />
              </div>
              <div className="divide-y divide-slate-100">
                {[...provinceStatsArray]
                  .sort((a, b) => rankOrder === 'desc' ? b.wind - a.wind : a.wind - b.wind)
                  .slice(0, rankLimit)
                  .map((stat, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        {renderRankBadge(idx)}
                        <span className="text-sm font-bold text-slate-800">{stat.name}</span>
                      </div>
                      <span className="text-sm font-extrabold text-slate-800">{stat.wind.toFixed(1)} km/h</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

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
