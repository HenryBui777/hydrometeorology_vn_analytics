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
  RedRiverDelta:      '#6D28D9', // Darker Purple
  NorthMountain:      '#D97706', // Darker Amber
  NorthCentral:       '#1D4ED8', // Darker Royal Blue
  SouthCentral:       '#0891B2', // Darker Cyan
  CentralHighlands:   '#047857', // Darker Emerald
  Southeast:          '#BE185D', // Darker Pink/Magenta
  MekongDelta:        '#B91C1C', // Darker Red
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
  const [radarProvinces, setRadarProvinces] = useState([]);

  // Region and Season comparison states
  const [radarRegions, setRadarRegions] = useState(['Đồng bằng sông Hồng', 'Đông Nam Bộ']);
  const [radarSeasons, setRadarSeasons] = useState(['Mùa Hè', 'Mùa Đông']);

  // Metric dropdown custom UI states
  const [isMetricDropdownOpen, setIsMetricDropdownOpen] = useState(false);
  const metricDropdownRef = useRef(null);

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
      return res;
    });
  }, [rawRows, radarSeasons]);

  // Toggle selected regions on radar chart (Limit to max 2)
  const toggleRadarRegion = (regionName) => {
    setRadarRegions(prev => {
      if (prev.includes(regionName)) {
        if (prev.length <= 1) return prev;
        return prev.filter(r => r !== regionName);
      } else {
        if (prev.length >= 2) {
          return [prev[1], regionName]; // Slide window
        }
        return [...prev, regionName];
      }
    });
  };

  // Toggle selected seasons on radar chart (Limit to max 2)
  const toggleRadarSeason = (seasonName) => {
    setRadarSeasons(prev => {
      if (prev.includes(seasonName)) {
        if (prev.length <= 1) return prev;
        return prev.filter(s => s !== seasonName);
      } else {
        if (prev.length >= 2) {
          return [prev[1], seasonName]; // Slide window
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          
          {/* Horizontal Bar Chart card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 pb-3 shadow-sm space-y-4 flex flex-col justify-between lg:col-span-2">
            
            {/* Filter controls */}
            <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Xếp hạng 34 tỉnh thành Việt Nam</h3>
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
                        radius={[0, 4, 4, 0]}
                        className="cursor-pointer"
                      >
                        {sortedProvinceData.map((entry, index) => {
                          const isSelected = radarProvinces.includes(entry.name);
                          return (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.color} 
                              fillOpacity={isSelected ? 1.0 : 0.6}
                              stroke={isSelected ? '#1e293b' : 'none'}
                              strokeWidth={isSelected ? 2 : 0}
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

          {/* Radar Chart */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between items-stretch lg:col-span-1 min-h-[450px]">
            <div className="flex justify-between items-start flex-wrap gap-2 border-b border-slate-100 pb-3">
              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                Radar liên chiều khí hậu
              </span>
            </div>

            {radarProvinces.length > 0 ? (
              <div className="w-full flex-1 flex justify-center items-center mt-4">
                <ResponsiveContainer width="100%" height={320}>
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
      )}

      {/* RENDER TAB 2: REGIONS COMPARISON */}
      {subTab === 'regions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between lg:col-span-2">
            <div className="border-b border-slate-100 pb-3 flex justify-between items-center flex-wrap gap-2">
              <div>
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
                    margin={{ top: 15, right: 10, left: -10, bottom: 0 }}
                    onClick={(state) => {
                      if (state && state.activePayload && state.activePayload.length > 0) {
                        toggleRadarRegion(state.activePayload[0].payload.name);
                      } else if (state && state.activeLabel) {
                        toggleRadarRegion(state.activeLabel);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                    <XAxis dataKey="name" stroke="#70859c" tick={{ fontSize: 9, fontWeight: 700 }} />
                    <YAxis stroke="#70859c" tick={{ fontSize: 9, fontWeight: 600 }} domain={[0, 100]} unit="%" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '11px' }}
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

          {/* Radar Visual for Regions */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between items-stretch lg:col-span-1 min-h-[450px]">
            <div className="flex justify-between items-start flex-wrap gap-2 border-b border-slate-100 pb-3">
              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                Radar so sánh vùng địa lý
              </span>
            </div>

            {radarRegions.length > 0 ? (
              <div className="w-full flex-1 flex justify-center items-center mt-4">
                <ResponsiveContainer width="100%" height={320}>
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarRegionsData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fontWeight: 700, fill: '#475569' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8 }} />
                    
                    {radarRegions[0] && (
                      <Radar
                        name={radarRegions[0]}
                        dataKey={radarRegions[0]}
                        stroke="#3B82F6"
                        fill="#3B82F6"
                        fillOpacity={0.25}
                        strokeWidth={2}
                      />
                    )}
                    
                    {radarRegions[1] && (
                      <Radar
                        name={radarRegions[1]}
                        dataKey={radarRegions[1]}
                        stroke="#EF4444"
                        fill="#EF4444"
                        fillOpacity={0.25}
                        strokeWidth={2}
                      />
                    )}
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '10px' }}
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
      )}

      {/* RENDER TAB 3: SEASONS COMPARISON */}
      {subTab === 'seasons' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between lg:col-span-2">
            <div className="border-b border-slate-100 pb-3 flex justify-between items-center flex-wrap gap-2">
              <div>
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
                    margin={{ top: 15, right: 10, left: -10, bottom: 0 }}
                    onClick={(state) => {
                      if (state && state.activePayload && state.activePayload.length > 0) {
                        toggleRadarSeason(state.activePayload[0].payload.name);
                      } else if (state && state.activeLabel) {
                        toggleRadarSeason(state.activeLabel);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                    <XAxis dataKey="name" stroke="#70859c" tick={{ fontSize: 10, fontWeight: 700 }} />
                    <YAxis stroke="#70859c" tick={{ fontSize: 9, fontWeight: 600 }} domain={[0, 100]} unit="%" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '11px' }}
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

          {/* Radar Visual for Seasons */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between items-stretch lg:col-span-1 min-h-[450px]">
            <div className="flex justify-between items-start flex-wrap gap-2 border-b border-slate-100 pb-3">
              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                Radar so sánh mùa thời tiết
              </span>
            </div>

            {radarSeasons.length > 0 ? (
              <div className="w-full flex-1 flex justify-center items-center mt-4">
                <ResponsiveContainer width="100%" height={320}>
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarSeasonsData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fontWeight: 700, fill: '#475569' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8 }} />
                    
                    {radarSeasons[0] && (
                      <Radar
                        name={radarSeasons[0]}
                        dataKey={radarSeasons[0]}
                        stroke="#3B82F6"
                        fill="#3B82F6"
                        fillOpacity={0.25}
                        strokeWidth={2}
                      />
                    )}
                    
                    {radarSeasons[1] && (
                      <Radar
                        name={radarSeasons[1]}
                        dataKey={radarSeasons[1]}
                        stroke="#EF4444"
                        fill="#EF4444"
                        fillOpacity={0.25}
                        strokeWidth={2}
                      />
                    )}
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '10px' }}
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
      )}

    </div>
  );
}
