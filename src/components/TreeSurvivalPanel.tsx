'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { GeoJSONData } from '@/types';
import { processAllGridsSurvival, getSurvivalSummary, getSurvivalColor } from '@/engines/survivalModel';
import { useAppStore } from '@/store/appStore';

interface TreeSurvivalPanelProps {
  data: GeoJSONData;
}

const TreeSurvivalPanel: React.FC<TreeSurvivalPanelProps> = ({ data }) => {
  const { setSurvivalData } = useAppStore();

  const survivalGrids = useMemo(() => {
    const results = processAllGridsSurvival(data);
    setSurvivalData(results);
    return results;
  }, [data, setSurvivalData]);

  const summary = useMemo(() => getSurvivalSummary(survivalGrids), [survivalGrids]);

  const distributionData = useMemo(() => [
    { range: '75-95%', count: survivalGrids.filter(g => g.survivalProbability >= 0.75).length, color: '#22c55e', label: 'Excellent' },
    { range: '60-75%', count: survivalGrids.filter(g => g.survivalProbability >= 0.60 && g.survivalProbability < 0.75).length, color: '#84cc16', label: 'Good' },
    { range: '45-60%', count: survivalGrids.filter(g => g.survivalProbability >= 0.45 && g.survivalProbability < 0.60).length, color: '#eab308', label: 'Moderate' },
    { range: '30-45%', count: survivalGrids.filter(g => g.survivalProbability >= 0.30 && g.survivalProbability < 0.45).length, color: '#f97316', label: 'Poor' },
    { range: '5-30%', count: survivalGrids.filter(g => g.survivalProbability < 0.30).length, color: '#ef4444', label: 'Very Poor' },
  ], [survivalGrids]);

  const topGrids = survivalGrids.slice(0, 10);

  return (
    <div className="bg-[#0b1120]/80 backdrop-blur-2xl border border-white/[0.04] rounded-2xl p-5 h-full overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="mb-5 pb-3 border-b border-white/[0.04]">
        <h3 className="text-gray-100 font-bold text-sm tracking-wide flex items-center">
          <span className="mr-2">🌱</span> Tree Survival Intelligence
        </h3>
        <p className="text-gray-500 text-[10px] mt-0.5">
          AI-estimated survival probability for newly planted trees per grid
        </p>
      </div>

      {/* How it works */}
      <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-2.5 mb-4">
        <p className="text-emerald-300/70 text-[10px] leading-relaxed">
          🧠 The model analyzes each grid&apos;s <span className="text-white font-medium">vegetation (NDVI)</span>, <span className="text-white font-medium">temperature</span>, and <span className="text-white font-medium">pollution (AOD)</span> to estimate how likely planted saplings are to survive. Grids with existing greenery and moderate temperatures score highest.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {[
          { label: 'Avg Survival', value: `${(summary.avgSurvival * 100).toFixed(1)}%`, sub: `Best: ${(summary.bestSurvival * 100).toFixed(0)}%`, color: 'text-emerald-400', icon: '🎯' },
          { label: 'Suitable Grids', value: summary.totalSuitableGrids, sub: `of ${survivalGrids.length} total (>50%)`, color: 'text-green-400', icon: '✅' },
          { label: 'Avg NDVI Gain', value: `+${summary.avgNDVIGain.toFixed(4)}`, sub: 'Expected after 1 year', color: 'text-lime-400', icon: '📈' },
          { label: 'Stabilization', value: `${summary.avgStabilization} yrs`, sub: 'To ecological stability', color: 'text-teal-400', icon: '⏱️' },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-gray-900/30 rounded-xl p-3 border border-white/[0.03]">
            <div className="text-gray-500 text-[9px] uppercase font-bold tracking-wider mb-1 flex items-center">
              <span className="mr-1">{kpi.icon}</span>{kpi.label}
            </div>
            <div className={`${kpi.color} text-xl font-black leading-none`}>{kpi.value}</div>
            <div className="text-gray-600 text-[9px] mt-1">{kpi.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Distribution Chart */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mb-4">
        <div className="mb-1.5">
          <h4 className="text-gray-300 font-medium text-xs">Survival Distribution</h4>
          <p className="text-gray-600 text-[9px]">How many grids fall in each survival probability range</p>
        </div>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={distributionData}>
            <XAxis dataKey="range" stroke="#4b5563" fontSize={8} tickLine={false} />
            <YAxis hide />
            <Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', color: '#fff', fontSize: '10px' }} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {distributionData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-1 mt-1.5">
          {distributionData.map((d) => (
            <span key={d.range} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-900/30 border border-white/[0.02]">
              <span className="inline-block w-1.5 h-1.5 rounded-sm mr-1" style={{ backgroundColor: d.color }}></span>
              <span className="text-gray-400">{d.label}: </span>
              <span className="text-white font-medium">{d.count}</span>
            </span>
          ))}
        </div>
      </motion.div>

      {/* Top Grids */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        <div className="mb-2">
          <h4 className="text-gray-300 font-medium text-xs">🏆 Top 10 Plantation-Ready Grids</h4>
          <p className="text-gray-600 text-[9px] mt-0.5">Ranked by Suitability Score (survival × impact × urgency)</p>
        </div>
        <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
          {topGrids.map((grid, i) => (
            <motion.div
              key={grid.gridId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.03 }}
              className="bg-gray-900/30 rounded-lg p-2.5 border border-white/[0.03] hover:border-emerald-500/20 transition-all"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black text-white"
                    style={{ backgroundColor: getSurvivalColor(grid.survivalProbability) }}>
                    {i + 1}
                  </div>
                  <div>
                    <span className="text-white text-[11px] font-medium">{(grid.survivalProbability * 100).toFixed(1)}% survival</span>
                    <span className="text-gray-600 text-[9px] ml-2">{grid.lat.toFixed(3)}°N</span>
                  </div>
                </div>
                <div className="text-emerald-400 text-xs font-bold">{grid.suitabilityScore.toFixed(0)}<span className="text-gray-600 text-[9px]">/100</span></div>
              </div>
              <div className="grid grid-cols-4 gap-1 text-[9px]">
                <div><span className="text-gray-600">NDVI+</span><br /><span className="text-lime-400 font-medium">+{grid.expectedNDVIGain.toFixed(3)}</span></div>
                <div><span className="text-gray-600">OSI</span><br /><span className="text-red-400 font-medium">{grid.currentOSI.toFixed(0)}</span></div>
                <div><span className="text-gray-600">Temp</span><br /><span className="text-orange-400 font-medium">{grid.currentTemp.toFixed(0)}°C</span></div>
                <div><span className="text-gray-600">Stab.</span><br /><span className="text-teal-400 font-medium">{grid.stabilizationYears}yr</span></div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Next step hint */}
      <div className="mt-4 pt-3 border-t border-white/[0.04]">
        <p className="text-gray-500 text-[10px] text-center">
          ✅ Survival data loaded. Now switch to the <span className="text-amber-400 font-medium">💰 Optimizer</span> tab to generate a budget-optimized plantation plan.
        </p>
      </div>
    </div>
  );
};

export default TreeSurvivalPanel;
