import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import useCsvData, { applyFilters } from '../hooks/useCsvData';

const DataContext = createContext(null);

export const OKABE_ITO_PALETTE = [
  '#E69F00', // Orange
  '#56B4E9', // Sky Blue
  '#009E73', // Bluish Green
  '#F0E442', // Yellow
  '#0072B2', // Blue
  '#D55E00', // Vermilion
  '#CC79A7', // Reddish Purple
  '#000000', // Black
  '#999999', // Grey
  '#88CCEE', // Light Blue
  '#DDCC77', // Sand
  '#117733', // Dark Green
  '#332288', // Dark Blue
  '#AA4499', // Purple
  '#44AA99'  // Teal
];

export function DataProvider({ children }) {
  const { rawRows, loading, error, fullStats } = useCsvData();

  // Global filter state shared across all views
  const [filters, setFilters] = useState({
    regionKey: 'All',
    year: 'All',
    month: 'All',
    season: 'All',
  });

  const [isColorblind, setIsColorblind] = useState(false);

  useEffect(() => {
    const savedColorblind = localStorage.getItem('colorblind');
    if (savedColorblind === 'true') {
      setIsColorblind(true);
      document.documentElement.classList.add('colorblind');
    } else {
      setIsColorblind(false);
      document.documentElement.classList.remove('colorblind');
    }
  }, []);

  const toggleColorblind = () => {
    setIsColorblind(prev => {
      const newVal = !prev;
      localStorage.setItem('colorblind', newVal.toString());
      if (newVal) {
        document.documentElement.classList.add('colorblind');
      } else {
        document.documentElement.classList.remove('colorblind');
      }
      return newVal;
    });
  };

  // Filtered rows based on active filters
  const filteredRows = useMemo(() => {
    if (!rawRows.length) return [];
    return applyFilters(rawRows, filters);
  }, [rawRows, filters]);

  // Re-compute stats for filtered slice
  const filteredStats = useMemo(() => {
    if (!filteredRows.length || !fullStats) return fullStats;

    // Recalculate simple KPIs from filtered slice
    function avg(arr) {
      return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
    }
    function round2(n) { return Math.round(n * 100) / 100; }

    return {
      ...fullStats,
      nationalKPIs: {
        temp:     round2(avg(filteredRows.map(r => r.temp))),
        rain:     round2(avg(filteredRows.map(r => r.rain))),
        humidity: Math.round(avg(filteredRows.map(r => r.humidity))),
        wind:     round2(avg(filteredRows.map(r => r.wind))),
        sunshine: round2(avg(filteredRows.map(r => r.sunshine))),
        et0:      round2(avg(filteredRows.map(r => r.et0))),
      },
      filteredRows,
    };
  }, [filteredRows, fullStats]);

  const value = {
    loading,
    error,
    rawRows,
    filteredRows,
    fullStats,
    filteredStats,
    filters,
    setFilters,
    isColorblind,
    toggleColorblind,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside <DataProvider>');
  return ctx;
}

export default DataContext;
