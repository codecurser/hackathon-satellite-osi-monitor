'use client';

import React, { useMemo, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAppStore } from '@/store/appStore';
import { optimizePlantation, formatINR } from '@/engines/budgetOptimizer';
import { calculateROI, getROIGrade, generatePolicySummary } from '@/engines/roiCalculator';
import { GeoJSONData } from '@/types';
import { getSurvivalColor } from '@/engines/survivalModel';

interface BudgetPanelProps {
  data: GeoJSONData;
}

const BudgetPanel: React.FC<BudgetPanelProps> = ({ data }) => {
  const {
    survivalData, budgetConfig, setBudgetConfig,
    optimizationResult, setOptimizationResult,
    roiResult, setROIResult, activeEngine,
  } = useAppStore();
  const [selectedGridIndex, setSelectedGridIndex] = useState<number | null>(null);

  const runOptimization = useCallback(() => {
    if (!survivalData?.length) return;
    const result = optimizePlantation(survivalData, budgetConfig);
    setOptimizationResult(result);
    const roi = calculateROI(result, budgetConfig);
    setROIResult(roi);
    setSelectedGridIndex(null);
  }, [survivalData, budgetConfig, setOptimizationResult, setROIResult]);

  const roiGrade = useMemo(() => roiResult ? getROIGrade(roiResult.environmentalROI) : null, [roiResult]);
  const policySummary = useMemo(() =>
    roiResult && optimizationResult ? generatePolicySummary(roiResult, optimizationResult, budgetConfig) : null
  , [roiResult, optimizationResult, budgetConfig]);

  const impactChartData = useMemo(() => {
    if (!optimizationResult) return [];
    return optimizationResult.selectedGrids.slice(0, 15).map((g, i) => ({
      name: `#${i + 1}`,
      impact: g.impactScore,
      trees: g.treesNeeded,
      color: getSurvivalColor(g.survivalProb),
    }));
  }, [optimizationResult]);

  const isROIView = activeEngine === 'roi';
  const costPerGrid = budgetConfig.plantableAreaPerGrid * budgetConfig.treesPerHectare * budgetConfig.costPerTree;
  const maxGrids = Math.floor(budgetConfig.totalBudget / costPerGrid);

  const handleGridClick = useCallback((index: number) => {
    setSelectedGridIndex(prev => prev === index ? null : index);
  }, []);

  return (
    <div className="bg-[#0b1120]/80 backdrop-blur-xl border border-white/[0.04] rounded-2xl p-4 h-full overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="mb-4 pb-2.5 border-b border-white/[0.04]">
        <h3 className="text-gray-100 font-bold text-sm flex items-center">
          <span className="mr-2">{isROIView ? '📉' : '💰'}</span>
          {isROIView ? 'Environmental ROI' : 'Budget Optimizer'}
        </h3>
        <p className="text-gray-500 text-[10px] mt-0.5">
          {isROIView ? 'Environmental return: CO₂, O₂, OSI reduction per ₹ invested' : 'Select optimal grids for maximum environmental impact under budget'}
        </p>
      </div>

      {/* Budget Config */}
      {!isROIView && (
        <div className="space-y-2.5 mb-4">
          <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-2">
            <p className="text-amber-200/60 text-[9px] leading-relaxed">
              💡 <b className="text-white/80">How it works:</b> Set budget → Algorithm ranks all grids by <span className="text-amber-300">Impact Score</span> (Survival × NDVI Gain × Stress) → Greedily selects grids until budget runs out. Lower budget = fewer grids.
            </p>
          </div>

          {/* Budget */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-500 text-[9px] uppercase font-bold tracking-wider">Total Budget</span>
              <span className="text-amber-400 text-sm font-black">{formatINR(budgetConfig.totalBudget)}</span>
            </div>
            <input type="range" min={500000} max={50000000} step={500000}
              value={budgetConfig.totalBudget} onChange={(e) => setBudgetConfig({ totalBudget: Number(e.target.value) })}
              className="w-full accent-amber-500" />
            <div className="flex justify-between text-gray-700 text-[8px] mt-0.5"><span>₹5L</span><span>₹50L</span><span>₹5Cr</span></div>
          </div>

          {/* Cost per tree */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-500 text-[9px] uppercase font-bold tracking-wider">Cost / Tree</span>
              <span className="text-amber-400 text-sm font-black">₹{budgetConfig.costPerTree}</span>
            </div>
            <input type="range" min={50} max={300} step={10}
              value={budgetConfig.costPerTree} onChange={(e) => setBudgetConfig({ costPerTree: Number(e.target.value) })}
              className="w-full accent-amber-500" />
            <div className="flex justify-between text-gray-700 text-[8px] mt-0.5"><span>₹50</span><span>₹175</span><span>₹300</span></div>
          </div>

          {/* Budget breakdown */}
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="bg-gray-900/30 rounded-lg p-2 border border-white/[0.02]">
              <div className="text-gray-600 text-[8px] uppercase font-bold">Cost/Grid</div>
              <div className="text-amber-400 text-xs font-bold mt-0.5">{formatINR(costPerGrid)}</div>
            </div>
            <div className="bg-gray-900/30 rounded-lg p-2 border border-white/[0.02]">
              <div className="text-gray-600 text-[8px] uppercase font-bold">Max Grids</div>
              <div className="text-amber-400 text-xs font-bold mt-0.5">{maxGrids}</div>
            </div>
            <div className="bg-gray-900/30 rounded-lg p-2 border border-white/[0.02]">
              <div className="text-gray-600 text-[8px] uppercase font-bold">Max Trees</div>
              <div className="text-green-400 text-xs font-bold mt-0.5">{(maxGrids * budgetConfig.plantableAreaPerGrid * budgetConfig.treesPerHectare).toLocaleString()}</div>
            </div>
          </div>

          {/* Run button */}
          <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            onClick={runOptimization} disabled={!survivalData}
            className={`w-full py-2.5 rounded-xl font-bold text-[11px] tracking-wider uppercase transition-all ${
              survivalData
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-[0_0_12px_rgba(245,158,11,0.2)] hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                : 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
            }`}>
            {survivalData ? `⚡ Optimize for ${maxGrids} Best Grids` : '⏳ Load Survival AI tab first'}
          </motion.button>
          {!survivalData && (
            <p className="text-gray-700 text-[9px] text-center italic">Switch to 🌱 Survival AI tab → then come back here</p>
          )}
        </div>
      )}

      {/* Results */}
      {optimizationResult && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { label: 'Grids Selected', value: optimizationResult.selectedGrids.length, sub: `of ${optimizationResult.gridsEvaluated} viable`, color: 'text-amber-400' },
              { label: 'Trees Planted', value: optimizationResult.totalTrees.toLocaleString(), sub: `${budgetConfig.treesPerHectare}/ha density`, color: 'text-green-400' },
              { label: 'Budget Used', value: `${optimizationResult.budgetUtilization}%`, sub: `${formatINR(optimizationResult.totalCost)} of ${formatINR(budgetConfig.totalBudget)}`, color: 'text-orange-400' },
              { label: 'Avg Survival', value: `${(optimizationResult.averageSurvival * 100).toFixed(1)}%`, sub: 'across selected grids', color: 'text-emerald-400' },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-gray-900/30 rounded-lg p-2.5 border border-white/[0.03]">
                <div className="text-gray-600 text-[8px] uppercase font-bold tracking-wider mb-0.5">{kpi.label}</div>
                <div className={`${kpi.color} text-lg font-black leading-none`}>{kpi.value}</div>
                <div className="text-gray-700 text-[8px] mt-0.5">{kpi.sub}</div>
              </div>
            ))}
          </div>

          {/* Impact chart */}
          {impactChartData.length > 0 && (
            <div>
              <h4 className="text-gray-400 font-medium text-[11px] mb-0.5">Impact Score per Grid</h4>
              <p className="text-gray-700 text-[8px] mb-1">Taller bar = more environmental benefit. Color = survival probability.</p>
              <ResponsiveContainer width="100%" height={80}>
                <BarChart data={impactChartData}>
                  <XAxis dataKey="name" stroke="#374151" fontSize={7} tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', color: '#fff', fontSize: '9px' }}
                    formatter={(v: number) => v.toFixed(3)} />
                  <Bar dataKey="impact" radius={[2, 2, 0, 0]}>
                    {impactChartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ROI */}
          {roiResult && roiGrade && (
            <div className="bg-gradient-to-br from-gray-900/40 to-gray-900/20 rounded-xl p-3 border border-white/[0.04]">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-gray-500 text-[8px] uppercase font-bold tracking-wider">Environmental ROI</div>
                  <p className="text-gray-700 text-[8px]">CO₂ + O₂ + OSI + Efficiency composite</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black" style={{ color: roiGrade.color }}>{roiResult.environmentalROI}</div>
                  <div className="text-[10px] font-bold" style={{ color: roiGrade.color }}>{roiGrade.label}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: 'CO₂ Absorbed', value: `${roiResult.co2AbsorptionTonnes}t/yr`, color: 'text-blue-400', icon: '🌿' },
                  { label: 'O₂ Generated', value: `${roiResult.oxygenGeneratedKg.toLocaleString()}kg`, color: 'text-cyan-400', icon: '💨' },
                  { label: 'OSI Reduction', value: `-${roiResult.predictedOSIReduction}`, color: 'text-emerald-400', icon: '📉' },
                  { label: 'Risk Improved', value: `${roiResult.riskCategoryImprovement}%`, color: 'text-lime-400', icon: '✅' },
                ].map(m => (
                  <div key={m.label} className="bg-gray-900/30 rounded p-1.5 border border-white/[0.02]">
                    <span className="text-gray-600 text-[8px]">{m.icon} {m.label}</span>
                    <div className={`${m.color} font-bold text-[11px]`}>{m.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* WHERE TO PLANT */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div>
                <h4 className="text-gray-300 font-medium text-[11px]">📍 Where to Plant</h4>
                <p className="text-gray-700 text-[8px]">Each row = 1km² grid. Shows trees, cost, and survival for that zone.</p>
              </div>
              <span className="text-amber-400/60 text-[9px]">{optimizationResult.selectedGrids.length} grids</span>
            </div>

            <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar pr-0.5">
              {optimizationResult.selectedGrids.map((grid, i) => (
                <div key={`${grid.gridId}-${i}`}
                  onClick={() => handleGridClick(i)}
                  className={`rounded-lg p-2 border transition-all cursor-pointer ${
                    selectedGridIndex === i
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-gray-900/20 border-white/[0.02] hover:border-amber-500/15'
                  }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <div className={`w-4 h-4 rounded text-[8px] font-black text-white flex items-center justify-center shrink-0 ${
                        i < 3 ? 'bg-red-500' : i < 8 ? 'bg-orange-500' : i < 15 ? 'bg-yellow-500' : 'bg-gray-500'
                      }`}>{grid.rank}</div>
                      <div className="min-w-0">
                        <div className="text-white text-[10px] font-medium truncate">
                          {grid.lat.toFixed(3)}°N, {grid.lng.toFixed(3)}°E
                        </div>
                        <div className="text-gray-600 text-[8px]">
                          {grid.lat > 28.7 ? 'North Delhi' : grid.lat > 28.6 ? 'Central' : grid.lat > 28.5 ? 'South' : 'New Delhi'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] font-bold" style={{ color: getSurvivalColor(grid.survivalProb) }}>
                        {(grid.survivalProb * 100).toFixed(0)}%
                      </div>
                      <div className="text-gray-600 text-[8px]">{grid.treesNeeded} trees</div>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {selectedGridIndex === i && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      className="mt-2 pt-2 border-t border-white/[0.04]">
                      <div className="grid grid-cols-2 gap-1.5 text-[9px]">
                        <div className="bg-gray-900/30 rounded p-1.5">
                          <span className="text-gray-600">💰 Cost</span>
                          <div className="text-amber-400 font-bold">{formatINR(grid.costForGrid)}</div>
                        </div>
                        <div className="bg-gray-900/30 rounded p-1.5">
                          <span className="text-gray-600">📈 NDVI Gain</span>
                          <div className="text-lime-400 font-bold">+{grid.expectedNDVIGain.toFixed(4)}</div>
                        </div>
                        <div className="bg-gray-900/30 rounded p-1.5">
                          <span className="text-gray-600">🔴 Current OSI</span>
                          <div className="text-red-400 font-bold">{grid.currentOSI.toFixed(0)}</div>
                        </div>
                        <div className="bg-gray-900/30 rounded p-1.5">
                          <span className="text-gray-600">⚡ Impact</span>
                          <div className="text-cyan-400 font-bold">{grid.impactScore.toFixed(3)}</div>
                        </div>
                      </div>
                      <p className="text-gray-600 text-[8px] mt-1.5">
                        Plant <span className="text-white font-medium">{grid.treesNeeded}</span> trees in this 1km² grid at {grid.lat.toFixed(4)}°N for <span className="text-amber-400">{formatINR(grid.costForGrid)}</span>. Expected survival <span className="text-emerald-400">{(grid.survivalProb * 100).toFixed(0)}%</span>.
                      </p>
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Policy brief */}
          {policySummary && (
            <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-2.5">
              <h4 className="text-blue-400 text-[9px] font-bold uppercase tracking-wider mb-1">📋 Policy Brief</h4>
              <p className="text-gray-400 text-[9px] leading-relaxed">{policySummary}</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default BudgetPanel;
