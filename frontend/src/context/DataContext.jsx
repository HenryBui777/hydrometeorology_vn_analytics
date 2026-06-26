import React, { createContext, useContext, useState, useMemo } from 'react';
import useCsvData, { applyFilters } from '../hooks/useCsvData';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { rawRows, loading, error, fullStats } = useCsvData();

  // Global filter state shared across all views
  const [filters, setFilters] = useState({
    regionKey: 'All',
    month: 'All',
    season: 'All',
  });

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
