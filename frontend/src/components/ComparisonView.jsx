import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useData } from '../context/DataContext';
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
  PolarRadiusAxis
} from 'recharts';
import { 
  Building, 
  Compass, 
  CalendarDays, 
  ArrowUpDown,
  ChevronDown
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
  RedRiverDelta:      '#8B5CF6', // Purple
  NorthMountain:      '#F59E0B', // Amber
  NorthCentral:       '#2563EB', // Royal Blue
  SouthCentral:       '#06B6D4', // Cyan
  CentralHighlands:   '#10B981', // Emerald
  Southeast:          '#EC4899', // Pink
  MekongDelta:        '#EF4444', // Red
};

const REGION_NAMES = {
  RedRiverDelta:      'Đồng bằng sông Hồng',
  NorthMountain:      'Trung du miền núi Bắc Bộ',
  NorthCentral:       'Bắc Trung Bộ',
  SouthCentral:       'Duyên hải Nam Trung Bộ',
  CentralHighlands:   'Tây Nguyên',
  Southeast:          'Đông Nam Bộ',
  MekongDelta:        'Đồng bằng sông Cửu Long',
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
  const { rawRows, loading, error } = useData();

  // Sub-tabs: 'provinces' | 'regions' | 'seasons'
  const [subTab, setSubTab] = useState('provinces');

  // Province comparison states
  const [activeMetric, setActiveMetric] = useState('temp');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' | 'asc'
  const [radarProvinces, setRadarProvinces] = useState(['Hà Nội', 'Hồ Chí Minh']);

  // Metric dropdown custom UI states
  const [isMetricDropdownOpen, setIsMetricDropdownOpen] = useState(false);
  const metricDropdownRef = useRef(null);

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

    const avg = arr => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
    const round = n => Math.round(n * 100) / 100;

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
      color: REGION_COLORS[p.regionKey] || '#94A3B8'
    }));
  }, [rawRows]);

  // Sorted province data for horizontal bar chart
  const sortedProvinceData = useMemo(() => {
    const data = [...provinceAverages];
    return data.sort((a, b) => {
      const valA = a[activeMetric];
      const valB = b[activeMetric];
      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });
  }, [provinceAverages, activeMetric, sortOrder]);

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

      return res;
    });
  }, [provinceAverages, radarProvinces]);

  // Toggle selected provinces on radar chart (Limit to max 2)
  const toggleRadarProvince = (prov) => {
    setRadarProvinces(prev => {
      if (prev.includes(prov)) {
        if (prev.length <= 1) return prev; // Keep at least one
        return prev.filter(p => p !== prov);
      } else {
        if (prev.length >= 2) {
          // Replace the second one or show limit warning (we pop one and push)
          return [prev[0], prov];
        }
        return [...prev, prov];
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
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            subTab === 'provinces' 
              ? 'bg-slate-900 text-white shadow-md' 
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <Building className="h-4 w-4" /> So sánh các tỉnh (Provinces)
        </button>
        <button
          onClick={() => setSubTab('regions')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            subTab === 'regions' 
              ? 'bg-slate-900 text-white shadow-md' 
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <Compass className="h-4 w-4" /> So sánh các vùng (Regions)
        </button>
        <button
          onClick={() => setSubTab('seasons')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            subTab === 'seasons' 
              ? 'bg-slate-900 text-white shadow-md' 
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <CalendarDays className="h-4 w-4" /> So sánh các mùa (Seasons)
        </button>
      </div>

      {/* RENDER TAB 1: PROVINCES COMPARISON */}
      {subTab === 'provinces' && (
        <div className="space-y-6">
          
          {/* Horizontal Bar Chart card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 pb-3 shadow-sm space-y-4">
            
            {/* Filter controls */}
            <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Xếp hạng 34 tỉnh thành Việt Nam</h3>
                <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                  Tô màu tự động theo vùng miền. Click vào một thanh cột của tỉnh bất kỳ để chọn so sánh đối đầu bên dưới.
                </p>
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
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all hover:bg-slate-50 ${
                            activeMetric === m.key 
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
                      margin={{ top: 10, right: 15, left: 10, bottom: 0 }}
                      onClick={(state) => {
                        if (state && state.activeLabel) {
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
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '11px' }}
                        formatter={(value) => [
                          `${value} (${METRICS.find(m => m.key === activeMetric)?.label.split('(')[1] || ''}`, 
                          `Trung bình`
                        ]}
                      />
                      <Bar 
                        dataKey={activeMetric} 
                        fill="#3B82F6"
                        radius={[0, 4, 4, 0]}
                        className="cursor-pointer"
                      >
                        {sortedProvinceData.map((entry, index) => {
                          const isSelected = radarProvinces.includes(entry.name);
                          return (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={isSelected ? '#1D4ED8' : '#3B82F6'} 
                              fillOpacity={isSelected ? 1 : 0.85}
                            />
                          );
                        })}
                      </Bar>
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
                    <XAxis type="number" stroke="#70859c" tick={{ fontSize: 9, fontWeight: 600 }} />
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

          {/* Radar Chart (Side-by-side Dual Inspector) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Province Selection Inspector panel */}
            <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                  Cấu hình đối đầu 2 tỉnh thành
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">
                  Chọn đúng tối đa 2 tỉnh thành bất kỳ bằng cách click dưới đây hoặc click trực tiếp vào biểu đồ thanh phía trên.
                </p>

                {/* Selected Display */}
                <div className="flex flex-col gap-2 mt-4">
                  {radarProvinces.map((prov, index) => {
                    const info = provinceAverages.find(p => p.name === prov);
                    const color = index === 0 ? '#3B82F6' : '#EF4444';
                    return (
                      <div key={prov} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                          <span>{prov}</span>
                          <span className="text-[9px] font-semibold text-slate-400">({info?.region})</span>
                        </div>
                        {radarProvinces.length > 1 && (
                          <button 
                            onClick={() => toggleRadarProvince(prov)}
                            className="text-slate-400 hover:text-rose-500 cursor-pointer"
                          >
                            Bỏ chọn
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selector List */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase">Danh sách tỉnh thành nhanh:</span>
                <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {provinceAverages.map(p => {
                    const isSelected = radarProvinces.includes(p.name);
                    return (
                      <button
                        key={p.name}
                        onClick={() => toggleRadarProvince(p.name)}
                        className={`py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer truncate ${
                          isSelected 
                            ? 'bg-slate-900 border-slate-900 text-white font-extrabold shadow-sm' 
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Radar Visual */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-center items-center relative min-h-[350px]">
              <span className="absolute top-4 left-4 text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                Biểu đồ Radar liên chiều khí hậu (6 biến cốt lõi)
              </span>

              {radarProvinces.length > 0 ? (
                <div className="w-full h-80 flex justify-center items-center mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarChartData}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fontWeight: 700, fill: '#475569' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8 }} />
                      
                      {radarProvinces[0] && (
                        <Radar
                          name={radarProvinces[0]}
                          dataKey={radarProvinces[0]}
                          stroke="#3B82F6"
                          fill="#3B82F6"
                          fillOpacity={0.25}
                          strokeWidth={2}
                        />
                      )}
                      
                      {radarProvinces[1] && (
                        <Radar
                          name={radarProvinces[1]}
                          dataKey={radarProvinces[1]}
                          stroke="#EF4444"
                          fill="#EF4444"
                          fillOpacity={0.25}
                          strokeWidth={2}
                        />
                      )}
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '10px' }}
                        formatter={(value, name, props) => {
                          const rawVal = props.payload[`raw_${name}`];
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

        </div>
      )}

      {/* RENDER TAB 2: REGIONS COMPARISON */}
      {subTab === 'regions' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3 flex justify-between items-center flex-wrap gap-2">
            <div>
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                So sánh 7 vùng địa lý trên các biến số chính
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                Các chỉ số đã được chuẩn hóa theo thang điểm 100% để hiển thị trực quan trực tiếp. Xem số liệu thực tế qua hộp Tooltip.
              </p>
            </div>
          </div>

          <div className="h-96">
            {regionalData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regionalData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                  <XAxis dataKey="name" stroke="#70859c" tick={{ fontSize: 9, fontWeight: 700 }} />
                  <YAxis stroke="#70859c" tick={{ fontSize: 9, fontWeight: 600 }} domain={[0, 100]} unit="%" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '11px' }}
                    formatter={(value, name, props) => {
                      const rawName = name.replace(' (chỉ số)', '');
                      const rawVal = props.payload[`${rawName} (°C)`] || props.payload[`${rawName} (mm)`] || props.payload[`${rawName} (%)`] || props.payload[`${rawName} (km/h)`] || value;
                      return [`${rawVal} (Chỉ số: ${value}%)`, rawName];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                  <Bar dataKey="Nhiệt độ (chỉ số)" name="Nhiệt độ" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Lượng mưa (chỉ số)" name="Lượng mưa" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Độ ẩm (chỉ số)" name="Độ ẩm" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Tốc độ gió (chỉ số)" name="Tốc độ gió" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-400 text-xs font-semibold text-center py-20">Không có dữ liệu vùng</div>
            )}
          </div>
        </div>
      )}

      {/* RENDER TAB 3: SEASONS COMPARISON */}
      {subTab === 'seasons' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3 flex justify-between items-center flex-wrap gap-2">
            <div>
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                So sánh sự khác biệt khí tượng theo các Mùa khí hậu Việt Nam
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                Xem diễn biến thay đổi các chỉ số thời tiết theo 4 mùa tự nhiên của Việt Nam.
              </p>
            </div>
          </div>

          <div className="h-96">
            {seasonalData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={seasonalData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                  <XAxis dataKey="name" stroke="#70859c" tick={{ fontSize: 10, fontWeight: 700 }} />
                  <YAxis stroke="#70859c" tick={{ fontSize: 9, fontWeight: 600 }} domain={[0, 100]} unit="%" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '11px' }}
                    formatter={(value, name, props) => {
                      const rawName = name.replace(' (chỉ số)', '');
                      const rawVal = props.payload[`${rawName} (°C)`] || props.payload[`${rawName} (mm)`] || props.payload[`${rawName} (%)`] || props.payload[`${rawName} (km/h)`] || value;
                      return [`${rawVal} (Chỉ số: ${value}%)`, rawName];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                  <Bar dataKey="Nhiệt độ (chỉ số)" name="Nhiệt độ" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Lượng mưa (chỉ số)" name="Lượng mưa" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Độ ẩm (chỉ số)" name="Độ ẩm" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Tốc độ gió (chỉ số)" name="Tốc độ gió" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-400 text-xs font-semibold text-center py-20">Không có dữ liệu mùa</div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
