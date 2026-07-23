import { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';

const CSV_URL = '/data/kttv.csv';

// Region name mapping: Vietnamese region string → internal key
const REGION_KEY_MAP = {
  'Đồng bằng sông Hồng':         'RedRiverDelta',
  'Trung du miền núi Bắc Bộ':    'NorthMountain',
  'Bắc Trung Bộ':                'NorthCentral',
  'Duyên hải Nam Trung Bộ':      'SouthCentral',
  'Tây Nguyên':                  'CentralHighlands',
  'Đông Nam Bộ':                 'Southeast',
  'Đồng bằng sông Cửu Long':     'MekongDelta',
};

const REGION_DISPLAY = {
  RedRiverDelta:      'Đồng bằng sông Hồng',
  NorthMountain:      'Trung du miền núi Bắc Bộ',
  NorthCentral:       'Bắc Trung Bộ',
  SouthCentral:       'Duyên hải Nam Trung Bộ',
  CentralHighlands:   'Tây Nguyên',
  Southeast:          'Đông Nam Bộ',
  MekongDelta:        'Đồng bằng sông Cửu Long',
};

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Parse a raw CSV row into typed values.
 * Returns null if the row is clearly invalid.
 */
function parseRow(row) {
  const province = (row.province || '').trim();
  const region   = (row.region   || '').trim();
  const date     = (row.date     || '').trim();
  const season   = (row.season   || '').trim();
  const month    = parseInt(row.month, 10);

  if (!province || !date) return null;

  return {
    province,
    region,
    regionKey: REGION_KEY_MAP[region] || 'NorthMountain',
    date,
    year: parseInt(date.substring(0, 4), 10) || 0,
    season,
    month: isNaN(month) ? 0 : month,
    temp:      parseFloat(row.temp_mean) || 0,
    tempMax:   parseFloat(row.temp_max)  || 0,
    tempMin:   parseFloat(row.temp_min)  || 0,
    rain:      parseFloat(row.precipitation_sum)   || 0,
    humidity:  parseFloat(row.humidity_mean) || 0,
    wind:      parseFloat(row.wind_speed_max)  || 0,
    sunshine:  parseFloat(row.sunshine_hours)      || 0,
    et0:       parseFloat(row.et0) || 0,
    uvMax:     parseFloat(row.uv_index_max)        || null,
    cloud:     parseFloat(row.cloud_cover)    || 0,
    pressure:  parseFloat(row.pressure)   || 0,
    windDir:   row.wind_direction_10m_dominant || '',
    latitude:  parseFloat(row.latitude)  || 0,
    longitude: parseFloat(row.longitude) || 0,
    week:      parseInt(row.week, 10) || 0,
  };
}

/**
 * Apply active filters (region, month, season) to rows array.
 */
export function applyFilters(rows, filters) {
  return rows.filter(r => {
    if (filters.regionKey && filters.regionKey !== 'All' && r.regionKey !== filters.regionKey) return false;
    if (filters.year && filters.year !== 'All' && r.year !== parseInt(filters.year, 10)) return false;
    if (filters.month && filters.month !== 'All' && r.month !== parseInt(filters.month, 10)) return false;
    if (filters.season && filters.season !== 'All' && r.season !== filters.season) return false;
    return true;
  });
}

/**
 * Build region-level aggregates from a set of rows.
 */
function buildRegionStats(rows) {
  const byRegion = {};
  rows.forEach(r => {
    if (!byRegion[r.regionKey]) byRegion[r.regionKey] = [];
    byRegion[r.regionKey].push(r);
  });

  const result = {};
  Object.entries(REGION_DISPLAY).forEach(([key, name]) => {
    const rRows = byRegion[key] || [];
    const provinces = [...new Set(rRows.map(r => r.province))].join(', ');
    result[key] = {
      name,
      temp:      round2(avg(rRows.map(r => r.temp))),
      rain:      round2(avg(rRows.map(r => r.rain))),
      humidity:  Math.round(avg(rRows.map(r => r.humidity))),
      wind:      round2(avg(rRows.map(r => r.wind))),
      sunshine:  round2(avg(rRows.map(r => r.sunshine))),
      provinces,
      colorTemp: getRegionTempColor(key),
      colorRain: getRegionRainColor(key),
    };
  });
  return result;
}

function getRegionTempColor(key) {
  const map = {
    NorthMountain:    '#FEF08A',
    RedRiverDelta:    '#FEF3C7',
    NorthCentral:     '#FDE68A',
    SouthCentral:     '#F97316',
    CentralHighlands: '#FCD34D',
    Southeast:        '#EF4444',
    MekongDelta:      '#EA580C',
  };
  return map[key] || '#FEF3C7';
}

function getRegionRainColor(key) {
  const map = {
    NorthMountain:    '#7DD3FC',
    RedRiverDelta:    '#E0F2FE',
    NorthCentral:     '#1E3A8A',
    SouthCentral:     '#1D4ED8',
    CentralHighlands: '#3B82F6',
    Southeast:        '#BAE6FD',
    MekongDelta:      '#38BDF8',
  };
  return map[key] || '#7DD3FC';
}

/**
 * Build temperature trend for Hà Nội, Huế, Hồ Chí Minh
 * Sampled monthly for chart clarity.
 */
function buildTempTrend(rows) {
  const CITIES = ['Hà Nội', 'Huế', 'Hồ Chí Minh'];
  const cityRows = rows.filter(r => CITIES.includes(r.province));

  // Group by month
  const byMonth = {};
  cityRows.forEach(r => {
    const key = r.month;
    if (!byMonth[key]) byMonth[key] = {};
    if (!byMonth[key][r.province]) byMonth[key][r.province] = [];
    byMonth[key][r.province].push(r.temp);
  });

  const MONTH_LABELS = {
    12: 'T12', 1: 'T1', 2: 'T2', 3: 'T3', 4: 'T4', 5: 'T5', 6: 'T6',
    7: 'T7', 8: 'T8', 9: 'T9', 10: 'T10', 11: 'T11',
  };

  return Object.entries(byMonth)
    .sort(([a], [b]) => {
      const order = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
      return order.indexOf(parseInt(a)) - order.indexOf(parseInt(b));
    })
    .map(([month, cities]) => {
      const point = { date: MONTH_LABELS[parseInt(month)] || `T${month}` };
      CITIES.forEach(city => {
        if (cities[city]) point[city] = round2(avg(cities[city]));
      });
      return point;
    });
}

/**
 * Top provinces by average daily rainfall.
 */
function buildTopRainfallProvinces(rows, topN = 10) {
  const byProvince = {};
  rows.forEach(r => {
    if (!byProvince[r.province]) byProvince[r.province] = [];
    byProvince[r.province].push(r.rain);
  });
  return Object.entries(byProvince)
    .map(([name, vals]) => ({ name, value: round2(avg(vals)) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, topN);
}

/**
 * Humidity distribution by region.
 */
function buildHumidityByRegion(rows) {
  const byRegion = {};
  rows.forEach(r => {
    if (!byRegion[r.region]) byRegion[r.region] = [];
    byRegion[r.region].push(r.humidity);
  });
  return Object.entries(byRegion)
    .map(([name, vals]) => ({ name, value: Math.round(avg(vals)) }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Scatter data: temp vs humidity per province (one point per province = period avg).
 */
function buildCorrelationData(rows) {
  const byProvince = {};
  rows.forEach(r => {
    if (!byProvince[r.province]) byProvince[r.province] = { temp: [], humidity: [] };
    byProvince[r.province].temp.push(r.temp);
    byProvince[r.province].humidity.push(r.humidity);
  });
  return Object.entries(byProvince).map(([province, vals]) => ({
    province,
    temp:     round2(avg(vals.temp)),
    humidity: Math.round(avg(vals.humidity)),
  }));
}

/**
 * National KPIs across all rows.
 */
function buildNationalKPIs(rows) {
  return {
    temp:     round2(avg(rows.map(r => r.temp))),
    rain:     round2(avg(rows.map(r => r.rain))),
    humidity: Math.round(avg(rows.map(r => r.humidity))),
    wind:     round2(avg(rows.map(r => r.wind))),
    sunshine: round2(avg(rows.map(r => r.sunshine))),
    et0:      round2(avg(rows.map(r => r.et0))),
  };
}

/**
 * Build rainfall by region for bar chart.
 */
function buildRainfallByRegion(rows) {
  const byRegion = {};
  rows.forEach(r => {
    if (!byRegion[r.region]) byRegion[r.region] = [];
    byRegion[r.region].push(r.rain);
  });
  return Object.entries(byRegion)
    .map(([name, vals]) => ({ name, value: round2(avg(vals)) }))
    .sort((a, b) => b.value - a.value);
}

// ─── Main Hook ────────────────────────────────────────────────────────────────

export default function useCsvData() {
  const [rawRows, setRawRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    Papa.parse(CSV_URL, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed = results.data
          .map(parseRow)
          .filter(Boolean);
        setRawRows(parsed);
        setLoading(false);
      },
      error: (err) => {
        console.error('CSV parse error:', err);
        setError(err.message || 'Failed to load CSV');
        setLoading(false);
      },
    });
  }, []);

  // Pre-compute full aggregations (no filter applied)
  const fullStats = useMemo(() => {
    if (!rawRows.length) return null;
    return {
      regionStats:          buildRegionStats(rawRows),
      tempTrend:            buildTempTrend(rawRows),
      topRainfallProvinces: buildTopRainfallProvinces(rawRows),
      humidityByRegion:     buildHumidityByRegion(rawRows),
      correlationData:      buildCorrelationData(rawRows),
      nationalKPIs:         buildNationalKPIs(rawRows),
      rainfallByRegion:     buildRainfallByRegion(rawRows),
      totalRows:            rawRows.length,
      provinces:            [...new Set(rawRows.map(r => r.province))].sort(),
      regions:              [...new Set(rawRows.map(r => r.region))].sort(),
      dateRange: {
        min: rawRows.reduce((m, r) => r.date < m ? r.date : m, rawRows[0].date),
        max: rawRows.reduce((m, r) => r.date > m ? r.date : m, rawRows[0].date),
      },
    };
  }, [rawRows]);

  return { rawRows, loading, error, fullStats };
}
