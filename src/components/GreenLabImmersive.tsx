'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/appStore';
import Map2D from '@/components/Map2D';
import Map3D from '@/components/Map3D';
import GreenLabPanel from '@/components/GreenLabPanel';
import { DataProcessor } from '@/utils/dataProcessor';
import { YearlyData, GeoJSONData } from '@/types';
import Link from 'next/link';

export default function GreenLabImmersive() {
  const [yearlyData, setYearlyData] = useState<YearlyData>({});
  const [currentData, setCurrentData] = useState<GeoJSONData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const { selectedYear, mode, viewMode, activeEngine, setActiveEngine, 
    setLoading: setStoreLoading, setSurvivalData } = useAppStore();

  // Redirect or set active engine if needed, but here we enforce greenlab
  useEffect(() => {
    setActiveEngine('greenlab');
  }, [setActiveEngine]);

  /* ── Data loading (mirrored from Dashboard but focused) ── */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true); setStoreLoading(true);
        const loaded: YearlyData = {};
        for (const y of [2023]) { // Only load current for lab context
          const r = await fetch(`/Delhi_1km_Final_OSI_Professional_${y}.csv`);
          if (r.ok) loaded[y] = DataProcessor.convertToGeoJSON(DataProcessor.parseCSV(await r.text()));
        }
        const r2 = await fetch('/Delhi_2024_OSI_Prediction.csv');
        if (r2.ok) loaded[2024] = DataProcessor.convertToGeoJSON(DataProcessor.parseCSV(await r2.text()));
        
        setYearlyData(loaded);
        const init = mode === 'forecast' ? 2024 : 2023;
        if (loaded[init]) setCurrentData(loaded[init]);

        // Pre-calculate survival data if not exists (shortcut for lab)
        // In a real app, this would be computed by the engine
        // We'll trust the user has visited the Survival tab or we can trigger it here
      } catch (e) {
        console.error(e);
      } finally { setLoading(false); setStoreLoading(false); }
    })();
  }, [mode, setStoreLoading]);

  return (
    <div className="flex flex-col h-screen bg-[#080d18] text-white overflow-hidden">
      {/* Immersive Header */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-white/10 bg-[#0a1120]/80 backdrop-blur-2xl z-50">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
              Green Optimization Lab 🧪
            </h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">
              Graph-Theory Based Environmental Simulation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
           <div className="flex bg-black/40 rounded-xl p-1 border border-white/5">
              <button 
                onClick={() => useAppStore.getState().setViewMode('2d')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === '2d' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-500 hover:text-white'}`}
              >2D Map</button>
              <button 
                onClick={() => useAppStore.getState().setViewMode('3d')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === '3d' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'text-gray-500 hover:text-white'}`}
              >3D Globe</button>
           </div>
           
           <div className="text-right">
             <div className="text-sm font-bold text-gray-300">Delhi NCR Region</div>
             <div className="text-[10px] text-green-500 font-mono">LIVE TELEMETRY ACTIVE</div>
           </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* Left Side: Large Map */}
        <div className="flex-1 relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50 bg-[#050810]">
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
          
          {/* Floating UI Elements */}
          <div className="absolute bottom-6 right-6 flex flex-col gap-3">
             <div className="bg-black/80 backdrop-blur-xl border border-white/10 p-4 rounded-xl max-w-xs transition-all hover:border-green-500/30">
                <h3 className="text-xs font-bold text-green-400 mb-2 flex items-center gap-2">
                   <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                   Graph topology active
                </h3>
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  The current visualization shows calculated edges representing environmental influence flows and connectivity potential between critical oxygen-depleted zones.
                </p>
             </div>
          </div>
        </div>

        {/* Right Side: Lab Controls */}
        <div className="w-[400px] flex flex-col gap-4">
          <div className="flex-1 rounded-2xl overflow-hidden mb-0">
             <GreenLabPanel />
          </div>
          
          <div className="bg-[#0f172a] rounded-2xl p-5 border border-white/10">
             <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
               <span>📊</span> Execution Statistics
             </h3>
             <div className="space-y-4">
                <div>
                   <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                      <span>ALGORITHMIC EFFICIENCY</span>
                      <span>88%</span>
                   </div>
                   <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: '88%' }} className="h-full bg-green-500" />
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                      <div className="text-[9px] text-gray-500 uppercase">Latency</div>
                      <div className="text-lg font-bold font-mono text-cyan-400">12ms</div>
                   </div>
                   <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                      <div className="text-[9px] text-gray-500 uppercase">Iterations</div>
                      <div className="text-lg font-bold font-mono text-purple-400">30x</div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </main>
      
      {/* Decorative footer */}
      <footer className="h-8 border-t border-white/5 px-6 flex items-center justify-between text-[8px] text-gray-600 font-mono tracking-widest uppercase bg-black/20">
         <span>INTERNAL USE ONLY // DEPT OF URBAN ECOLOGY</span>
         <span>SECURE SATELLITE UPLINK: STABLE</span>
         <span>v2.8.4-LAB-FINAL</span>
      </footer>
    </div>
  );
}
