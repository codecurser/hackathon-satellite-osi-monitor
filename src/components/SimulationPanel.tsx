'use client';

import React, { useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAppStore } from '@/store/appStore';
import { simulateImpact, getImprovementSummary } from '@/engines/impactSimulator';
import { GeoJSONData } from '@/types';

interface SimulationPanelProps {
  data: GeoJSONData;
}

const SimulationPanel: React.FC<SimulationPanelProps> = ({ data }) => {
  const {
    optimizationResult, simulationSnapshots, setSimulationSnapshots,
    simulationYear, setSimulationYear,
  } = useAppStore();

  const runSimulation = useCallback(() => {
    if (!optimizationResult || !data) return;
    const snapshots = simulateImpact(data, optimizationResult.selectedGrids);
    setSimulationSnapshots(snapshots);
  }, [data, optimizationResult, setSimulationSnapshots]);

  const improvement = useMemo(() => {
    if (!simulationSnapshots) return null;
    return getImprovementSummary(data, simulationSnapshots);
  }, [data, simulationSnapshots]);

  const chartData = useMemo(() => {
    if (!simulationSnapshots || !data) return [];
    const baseOSI = data.features.reduce((s, f) => s + f.properties.OSI, 0) / data.features.length;
    const baseCritical = data.features.filter(f => f.properties.OSI >= 800).length;
    const baseNDVI = data.features.reduce((s, f) => s + f.properties.NDVI, 0) / data.features.length;
    return [
      { year: 2024, avgOSI: Math.round(baseOSI), criticalZones: baseCritical, co2: 0, ndvi: parseFloat(baseNDVI.toFixed(4)) },
      ...simulationSnapshots.map(s => ({
        year: s.year, avgOSI: Math.round(s.avgOSI), criticalZones: s.criticalZones,
        co2: s.co2AbsorbedCumulative, ndvi: s.avgNDVI,
      }))
    ];
  }, [data, simulationSnapshots]);

  const currentSnapshot = useMemo(() =>
    simulationSnapshots?.find(s => s.year === simulationYear) || null
  , [simulationSnapshots, simulationYear]);

  return (
    <div className="bg-[#0b1120]/80 backdrop-blur-2xl border border-white/[0.04] rounded-2xl p-5 h-full overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="mb-5 pb-3 border-b border-white/[0.04]">
        <h3 className="text-gray-100 font-bold text-sm tracking-wide flex items-center">
          <span className="mr-2">🔮</span> 4-Year Impact Simulator
        </h3>
        <p className="text-gray-500 text-[10px] mt-0.5">
          Projecting how planted trees will improve Delhi&apos;s environment by 2028
        </p>
      </div>

      {/* Not ready state */}
      {!simulationSnapshots && (
        <div className="space-y-4">
          <div className="bg-purple-500/5 border border-purple-500/10 rounded-lg p-3">
            <p className="text-purple-300/70 text-[10px] leading-relaxed">
              🔮 The simulator models ecological change over 4 years using a <span className="text-white font-medium">logistic growth curve</span>. As trees mature:
            </p>
            <ul className="text-purple-300/60 text-[10px] mt-2 space-y-1 ml-4 list-disc">
              <li>NDVI increases (more vegetation)</li>
              <li>AOD decreases (trees filter pollution)</li>
              <li>OSI recalculated (stress reduces)</li>
              <li>CO₂ absorbed cumulatively</li>
            </ul>
          </div>

          <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            onClick={runSimulation} disabled={!optimizationResult}
            className={`w-full py-3 rounded-xl font-bold text-xs tracking-wider uppercase transition-all ${
              optimizationResult
                ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.2)] hover:shadow-[0_0_25px_rgba(168,85,247,0.4)]'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            }`}>
            {optimizationResult ? '🔮 Simulate 2025–2028 Impact' : '⏳ Run Budget Optimizer first'}
          </motion.button>
          {!optimizationResult && (
            <p className="text-gray-600 text-[9px] text-center">
              Complete the pipeline: 🌱 Survival → 💰 Optimizer → then come here.
            </p>
          )}
        </div>
      )}

      {/* Results */}
      {simulationSnapshots && improvement && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Year selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Viewing Year</span>
              <span className="text-purple-400 text-lg font-black">{simulationYear}</span>
            </div>
            <div className="flex space-x-1">
              {[2025, 2026, 2027, 2028].map((yr) => (
                <button key={yr} onClick={() => setSimulationYear(yr)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    simulationYear === yr
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md'
                      : 'bg-gray-900/30 text-gray-500 hover:text-gray-300 border border-white/[0.03]'
                  }`}>{yr}</button>
              ))}
            </div>
          </div>

          {/* Before → After */}
          <div className="bg-gradient-to-r from-red-500/5 to-emerald-500/5 rounded-xl p-3 border border-white/[0.04]">
            <div className="text-center text-gray-500 text-[9px] uppercase font-bold tracking-wider mb-2">
              2024 Baseline → {improvement.finalYear} Projected
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-gray-500 text-[9px]">OSI Change</div>
                <div className="text-emerald-400 text-lg font-black">-{improvement.osiReduction}</div>
                <div className="text-emerald-500/60 text-[9px]">{improvement.osiReductionPercent}% ↓</div>
              </div>
              <div>
                <div className="text-gray-500 text-[9px]">Critical Zones</div>
                <div className="text-green-400 text-lg font-black">-{improvement.criticalZoneReduction}</div>
                <div className="text-green-500/60 text-[9px]">zones eliminated</div>
              </div>
              <div>
                <div className="text-gray-500 text-[9px]">CO₂ Total</div>
                <div className="text-blue-400 text-lg font-black">{improvement.totalCO2}<span className="text-[10px] opacity-60">t</span></div>
                <div className="text-blue-500/60 text-[9px]">cumulative</div>
              </div>
            </div>
          </div>

          {/* OSI Trend Chart */}
          <div>
            <h4 className="text-gray-300 font-medium text-xs mb-1">Avg OSI Projection</h4>
            <p className="text-gray-600 text-[9px] mb-2">Lower = less stress = healthier environment</p>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="osiGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="year" stroke="#4b5563" fontSize={9} />
                <YAxis stroke="#4b5563" fontSize={9} />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', color: '#fff', fontSize: '10px' }} />
                <Area type="monotone" dataKey="avgOSI" stroke="#a855f7" fill="url(#osiGrad2)" strokeWidth={2} name="Avg OSI" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* CO₂ Chart */}
          <div>
            <h4 className="text-gray-300 font-medium text-xs mb-1">Cumulative CO₂ Absorbed</h4>
            <p className="text-gray-600 text-[9px] mb-2">Tonnes of carbon dioxide captured by growing trees</p>
            <ResponsiveContainer width="100%" height={100}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="year" stroke="#4b5563" fontSize={9} />
                <YAxis stroke="#4b5563" fontSize={9} />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', color: '#fff', fontSize: '10px' }} />
                <Line type="monotone" dataKey="co2" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} name="CO₂ (tonnes)" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Year Snapshot */}
          {currentSnapshot && (
            <div className="bg-purple-500/5 border border-purple-500/10 rounded-xl p-3">
              <h4 className="text-purple-400 text-[10px] font-bold uppercase tracking-wider mb-2">
                📊 {simulationYear} Detailed Snapshot
              </h4>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div><span className="text-gray-500">Avg OSI</span> <span className="text-white font-medium float-right">{currentSnapshot.avgOSI}</span></div>
                <div><span className="text-gray-500">Critical</span> <span className="text-red-400 font-medium float-right">{currentSnapshot.criticalZones}</span></div>
                <div><span className="text-gray-500">Avg NDVI</span> <span className="text-green-400 font-medium float-right">{currentSnapshot.avgNDVI}</span></div>
                <div><span className="text-gray-500">High Risk</span> <span className="text-orange-400 font-medium float-right">{currentSnapshot.highRiskZones}</span></div>
                <div><span className="text-gray-500">CO₂ Total</span> <span className="text-blue-400 font-medium float-right">{currentSnapshot.co2AbsorbedCumulative}t</span></div>
                <div><span className="text-gray-500">O₂ Total</span> <span className="text-cyan-400 font-medium float-right">{currentSnapshot.oxygenGenerated}t</span></div>
              </div>
            </div>
          )}

          {/* Reset */}
          <button onClick={() => setSimulationSnapshots(null)}
            className="w-full py-2 bg-gray-900/30 hover:bg-gray-800/50 text-gray-500 hover:text-gray-300 rounded-lg text-[10px] border border-white/[0.03] transition-all">
            🔄 Reset & Re-simulate
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default SimulationPanel;
