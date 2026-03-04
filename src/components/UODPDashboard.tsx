'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TimeControl from '@/components/TimeControl';
import Map2D from '@/components/Map2D';
import Map3D from '@/components/Map3D';
import AnalyticsPanel from '@/components/AnalyticsPanel';
import TreeSurvivalPanel from '@/components/TreeSurvivalPanel';
import BudgetPanel from '@/components/BudgetPanel';
import SimulationPanel from '@/components/SimulationPanel';
import { useAppStore } from '@/store/appStore';
import { DataProcessor } from '@/utils/dataProcessor';
import { GeoJSONData, YearlyData, EngineTab } from '@/types';

const ENGINE_TABS: { id: EngineTab; label: string; icon: string; gradient: string; desc: string }[] = [
  { id: 'osi', label: 'Stress Map', icon: '🌫', gradient: 'from-cyan-600 to-blue-600', desc: 'Satellite-derived oxygen stress index across Delhi NCR — identifies critical intervention zones' },
  { id: 'survival', label: 'Survival AI', icon: '🌱', gradient: 'from-emerald-600 to-green-600', desc: 'Heuristic model predicting sapling survival probability based on NDVI, temperature & pollution levels' },
  { id: 'budget', label: 'Optimizer', icon: '💰', gradient: 'from-amber-600 to-orange-600', desc: 'Greedy knapsack algorithm selecting highest-impact grids under your budget constraint' },
  { id: 'roi', label: 'ROI', icon: '📉', gradient: 'from-blue-600 to-indigo-600', desc: 'Quantified environmental returns — CO₂ sequestration, O₂ generation, and risk improvement per ₹ spent' },
  { id: 'simulation', label: 'Simulator', icon: '🔮', gradient: 'from-purple-600 to-indigo-600', desc: 'Logistic growth model projecting NDVI increase, pollution decrease & stress reduction through 2028' },
];

const UODPDashboard: React.FC = () => {
  const [yearlyData, setYearlyData] = useState<YearlyData>({});
  const [currentData, setCurrentData] = useState<GeoJSONData | null>(null);
  const [previousYearData, setPreviousYearData] = useState<GeoJSONData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    selectedYear, mode, viewMode, activeEngine, setActiveEngine,
    optimizationResult,
    setLoading: setStoreLoading, setError: setStoreError
  } = useAppStore();

  // Load CSV data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true); setStoreLoading(true); setError(null); setStoreError(null);
        const loadedData: YearlyData = {};
        for (const year of [2019, 2020, 2021, 2022, 2023]) {
          try {
            const res = await fetch(`/Delhi_1km_Final_OSI_Professional_${year}.csv`);
            if (!res.ok) throw new Error(`Failed: ${year}`);
            loadedData[year] = DataProcessor.convertToGeoJSON(DataProcessor.parseCSV(await res.text()));
          } catch (e) { console.error(`Error loading ${year}:`, e); }
        }
        try {
          const res = await fetch('/Delhi_2024_OSI_Prediction.csv');
          if (res.ok) loadedData[2024] = DataProcessor.convertToGeoJSON(DataProcessor.parseCSV(await res.text()));
        } catch (e) { console.error('Error loading 2024:', e); }
        setYearlyData(loadedData);
        const initYear = mode === 'forecast' ? 2024 : 2023;
        if (loadedData[initYear]) {
          setCurrentData(loadedData[initYear]);
          if (mode === 'historical' && loadedData[initYear - 1]) setPreviousYearData(loadedData[initYear - 1]);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load data';
        setError(msg); setStoreError(msg);
      } finally { setLoading(false); setStoreLoading(false); }
    };
    loadData();
  }, [mode, setStoreLoading, setStoreError]);

  const handleYearChange = useCallback((year: number) => {
    if (yearlyData?.[year]) {
      setCurrentData(yearlyData[year]);
      setPreviousYearData(mode === 'historical' && yearlyData[year - 1] ? yearlyData[year - 1] : null);
    }
  }, [yearlyData, mode]);

  useEffect(() => {
    handleYearChange(mode === 'forecast' ? 2024 : selectedYear);
  }, [selectedYear, mode, handleYearChange]);

  // Top 10 urgent grids for the current year
  const urgentGrids = useMemo(() => {
    if (!currentData?.features) return [];
    return currentData.features
      .filter(f => f.properties && f.properties.OSI >= 780)
      .sort((a, b) => (b.properties.OSI || 0) - (a.properties.OSI || 0))
      .slice(0, 10)
      .map((f, i) => {
        const coords = f.geometry.coordinates[0] as [number, number][];
        const lng = coords.reduce((s, c) => s + (c[0] || 0), 0) / coords.length;
        const lat = coords.reduce((s, c) => s + (c[1] || 0), 0) / coords.length;
        return {
          rank: i + 1,
          lat, lng,
          osi: mode === 'forecast' ? (f.properties.Predicted_OSI_2024 || f.properties.OSI) : f.properties.OSI,
          ndvi: f.properties.NDVI,
          aod: f.properties.AOD,
          temp: f.properties.Temp,
          risk: f.properties.OSI >= 800 ? 'Critical' : 'High',
          area: Math.max(0.5, ((f.properties.OSI || 800) - 780) * 0.01),
        };
      });
  }, [currentData, mode]);

  const activeTab = ENGINE_TABS.find(t => t.id === activeEngine);

  const renderRightPanel = () => {
    switch (activeEngine) {
      case 'survival': return currentData ? <TreeSurvivalPanel data={currentData} /> : null;
      case 'budget':
      case 'roi': return currentData ? <BudgetPanel data={currentData} /> : null;
      case 'simulation': return currentData ? <SimulationPanel data={currentData} /> : null;
      default: return currentData ? (
        <AnalyticsPanel data={currentData} selectedYear={selectedYear}
          previousYearData={previousYearData || undefined} mode={mode} />
      ) : null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20"></div>
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 animate-spin"></div>
            <div className="absolute inset-3 rounded-full border-2 border-transparent border-t-blue-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            <div className="absolute inset-6 rounded-full bg-cyan-500/10 flex items-center justify-center"><span className="text-lg">🌍</span></div>
          </div>
          <h2 className="text-cyan-400 text-xl font-bold mb-2">UODP 2.0</h2>
          <p className="text-gray-500 text-sm">Loading satellite data...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">⚠️</div>
          <h2 className="text-red-400 text-xl font-semibold mb-2">Data Loading Error</h2>
          <p className="text-gray-400 text-sm mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-medium">Retry</button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#020617] text-gray-100 overflow-hidden relative">
      {/* Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(6,182,212,0.05),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(168,85,247,0.03),transparent_60%)]" />
      </div>
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent z-20" />

      {/* Header */}
      <header className="relative z-20 bg-[#0a0f1a]/90 backdrop-blur-xl border-b border-white/[0.04] px-4 py-2">
        <div className="max-w-[1900px] w-full mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3 shrink-0">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-lg flex items-center justify-center border border-cyan-500/20">
              <span className="text-sm">🌍</span>
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-300">
                Urban Climate Intelligence
              </h1>
              <p className="text-[8px] tracking-[0.2em] font-medium text-gray-600 uppercase">UODP 2.0 · Data-Driven Intervention</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center bg-[#0f172a]/80 p-0.5 rounded-lg border border-white/[0.04]">
            {ENGINE_TABS.map((tab) => (
              <button key={tab.id} onClick={() => setActiveEngine(tab.id)}
                className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all flex items-center space-x-1 ${
                  activeEngine === tab.id
                    ? `bg-gradient-to-r ${tab.gradient} text-white shadow-md`
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'
                }`}>
                <span className="text-xs">{tab.icon}</span>
                <span className="hidden xl:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <div className="hidden lg:flex items-center space-x-1.5 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-emerald-400 text-[10px] font-semibold uppercase">Live</span>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold text-gray-300">Delhi NCR · <span className="text-cyan-400">{selectedYear}</span></div>
              <div className="text-[9px] text-gray-600 font-mono">{currentData?.features.length || 0} grids · 1km²</div>
            </div>
          </div>
        </div>
      </header>

      {/* Context Bar */}
      <div className="relative z-10 bg-[#0a0f1a]/50 border-b border-white/[0.02] px-4 py-1">
        <div className="max-w-[1900px] w-full mx-auto flex items-center justify-between">
          <p className="text-gray-500 text-[10px] flex items-center space-x-1.5">
            <span>{activeTab?.icon}</span>
            <span>{activeTab?.desc}</span>
            <span className="text-gray-700">·</span>
            <span className="text-cyan-400/60">Year {selectedYear} {mode === 'forecast' ? '(AI Predicted)' : '(Historical)'}</span>
          </p>
          {optimizationResult && (activeEngine === 'budget' || activeEngine === 'roi') && (
            <span className="text-amber-400/80 text-[10px]">✓ {optimizationResult.selectedGrids.length} grids · {optimizationResult.totalTrees.toLocaleString()} trees</span>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <main className="flex-1 overflow-hidden relative z-10">
        <div className="max-w-[1900px] w-full h-full mx-auto px-3 py-2">
          <div className="grid grid-cols-12 gap-3 h-full">
            
            {/* Left — Time Control + Urgent Grids */}
            <div className="col-span-3 2xl:col-span-2 h-full flex flex-col gap-3 overflow-hidden">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                <TimeControl onYearChange={handleYearChange} />
              </motion.div>
              
              {/* Top 10 Urgent Plantation Zones */}
              {activeEngine === 'osi' && urgentGrids.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  className="bg-[#0b1120]/80 backdrop-blur-xl border border-red-500/10 rounded-2xl p-3 flex-1 overflow-hidden flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-2 shrink-0">
                    <h3 className="text-xs font-bold text-gray-200 flex items-center">
                      <span className="mr-1.5">🚨</span> Priority Zones ({selectedYear})
                    </h3>
                    <span className="text-[9px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">Top {urgentGrids.length}</span>
                  </div>
                  <p className="text-gray-600 text-[9px] mb-2 shrink-0">Highest-stress zones requiring immediate intervention — sorted by OSI severity</p>
                  
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 min-h-0">
                    {urgentGrids.map((g) => (
                      <div key={g.rank}
                        className="bg-gray-900/30 rounded-lg p-2 border border-white/[0.03] hover:border-red-500/20 transition-all cursor-pointer"
                        onClick={() => {
                          useAppStore.getState().setSelectedPlantationLocation({
                            id: `urgent-${g.rank}`,
                            coordinates: [g.lng, g.lat],
                            priority: g.risk === 'Critical' ? 'urgent' : 'high',
                          });
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1.5">
                            <div className={`w-4 h-4 rounded text-[8px] font-black text-white flex items-center justify-center ${g.risk === 'Critical' ? 'bg-red-500' : 'bg-orange-500'}`}>{g.rank}</div>
                            <div>
                              <div className="text-white text-[10px] font-medium">{g.lat.toFixed(3)}°N, {g.lng.toFixed(3)}°E</div>
                              <div className="text-gray-600 text-[8px]">{g.lat > 28.7 ? 'N.Delhi' : g.lat > 28.6 ? 'Central' : g.lat > 28.5 ? 'South' : 'New Delhi'} · {g.area.toFixed(1)}ha</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-red-400 text-xs font-bold">{g.osi.toFixed(0)}</div>
                            <div className={`text-[8px] ${g.risk === 'Critical' ? 'text-red-400' : 'text-orange-400'}`}>{g.risk}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Center — Map */}
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 }} className="col-span-6 2xl:col-span-7 h-full flex flex-col">
              <div className="bg-[#0b1120]/80 backdrop-blur-xl border border-white/[0.04] rounded-2xl p-3 flex-grow flex flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-2 z-10 shrink-0">
                  <div className="flex items-center space-x-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)] animate-pulse" />
                    <span className="text-gray-400 font-medium text-[11px]">
                      {viewMode === '2d' ? '2D Topographical View' : '3D Spatial Globe'}
                    </span>
                    <span className="text-gray-700 text-[10px]">· Year {selectedYear}</span>
                  </div>
                  <div className="flex items-center bg-[#0f172a]/80 p-0.5 rounded-lg border border-white/[0.04]">
                    <button onClick={() => useAppStore.getState().setViewMode('2d')}
                      className={`px-2.5 py-1 rounded text-[10px] font-medium transition-all ${viewMode === '2d' ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow' : 'text-gray-500 hover:text-white'}`}>2D Map</button>
                    <button onClick={() => useAppStore.getState().setViewMode('3d')}
                      className={`px-2.5 py-1 rounded text-[10px] font-medium transition-all ${viewMode === '3d' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow' : 'text-gray-500 hover:text-white'}`}>3D Globe</button>
                  </div>
                </div>
                <div className="flex-1 min-h-0 rounded-xl overflow-hidden">
                  <AnimatePresence mode="wait">
                    {viewMode === '2d' && currentData && (
                      <motion.div key="2d" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                        <Map2D data={currentData} selectedYear={selectedYear} mode={mode} />
                      </motion.div>
                    )}
                    {viewMode === '3d' && currentData && (
                      <motion.div key="3d" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                        <Map3D data={currentData} selectedYear={selectedYear} mode={mode} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>

            {/* Right — Engine Panel */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }} className="col-span-3 h-full overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div key={activeEngine} initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }} className="h-full">
                  {renderRightPanel()}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UODPDashboard;
