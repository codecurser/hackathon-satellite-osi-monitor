'use client';
import React, { useMemo, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAppStore } from '@/store/appStore';
import { optimizePlantation, formatINR } from '@/engines/budgetOptimizer';
import { calculateROI, getROIGrade, generatePolicySummary } from '@/engines/roiCalculator';
import { GeoJSONData } from '@/types';
import { getSurvivalColor } from '@/engines/survivalModel';

interface Props { data: GeoJSONData; }

const TT = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'rgba(8,13,24,0.97)', border:'1px solid rgba(255,193,7,0.2)', borderRadius:10, padding:'10px 14px' }}>
      <p style={{ fontSize:12, fontWeight:600, color:'var(--text-1)', marginBottom:4 }}>{label}</p>
      {payload.map((e:any,i:number) => (
        <p key={i} style={{ fontSize:12, fontFamily:'monospace', color:'var(--amber)' }}>
          Impact: <strong>{typeof e.value === 'number' ? e.value.toFixed(3) : e.value}</strong>
        </p>
      ))}
    </div>
  );
};

export default function BudgetPanel({ data }: Props) {
  const { survivalData, budgetConfig, setBudgetConfig,
    optimizationResult, setOptimizationResult, roiResult, setROIResult, activeEngine } = useAppStore();
  const [expanded, setExpanded] = useState<number|null>(null);

  const run = useCallback(() => {
    if (!survivalData?.length) return;
    const r = optimizePlantation(survivalData, budgetConfig);
    setOptimizationResult(r);
    setROIResult(calculateROI(r, budgetConfig));
    setExpanded(null);
  }, [survivalData, budgetConfig, setOptimizationResult, setROIResult]);

  const grade    = useMemo(() => roiResult ? getROIGrade(roiResult.environmentalROI) : null, [roiResult]);
  const policy   = useMemo(() => roiResult && optimizationResult ? generatePolicySummary(roiResult, optimizationResult, budgetConfig) : null, [roiResult, optimizationResult, budgetConfig]);
  const chartData= useMemo(() => optimizationResult ? optimizationResult.selectedGrids.slice(0,15).map((g,i) => ({ name:`#${i+1}`, impact:g.impactScore, color:getSurvivalColor(g.survivalProb) })) : [], [optimizationResult]);

  const isROI      = activeEngine === 'roi';
  const costPGrid  = budgetConfig.plantableAreaPerGrid * budgetConfig.treesPerHectare * budgetConfig.costPerTree;
  const maxGrids   = Math.floor(budgetConfig.totalBudget / costPGrid);
  const budgetPct  = ((budgetConfig.totalBudget - 500000) / (50000000 - 500000)) * 100;
  const costPct    = ((budgetConfig.costPerTree - 50) / (300 - 50)) * 100;

  return (
    <div className="panel" style={{ flex:1, minHeight:0, display:'flex', flexDirection:'column', overflow:'hidden',
      border:`1px solid ${isROI ? 'rgba(68,138,255,0.1)' : 'rgba(255,193,7,0.08)'}` }}>
      {/* Header */}
      <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:18 }}>{isROI ? '📊' : '💰'}</span>
          <div>
            <div style={{ fontSize:15, fontWeight:700 }}>{isROI ? 'Environmental ROI' : 'Budget Optimizer'}</div>
            <div className="text-3" style={{ fontSize:11, marginTop:1 }}>
              {isROI ? 'CO₂, O₂ & OSI return per ₹ invested' : 'Greedy knapsack: max-impact within budget'}
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex:1, minHeight:0, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:20 }}>

        {/* Budget config */}
        {!isROI && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ background:'rgba(255,193,7,0.06)', border:'1px solid rgba(255,193,7,0.15)', borderRadius:12, padding:14 }}>
              <p style={{ fontSize:12, color:'rgba(255,193,7,0.8)', lineHeight:1.6 }}>
                💡 Set budget → ranks all grids by <strong style={{ color:'var(--amber)' }}>Impact Score</strong> (Survival × NDVI Gain × Stress) → greedily picks highest-value grids until budget is exhausted.
              </p>
            </div>

            {/* Budget slider */}
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <span className="label" style={{ fontSize:11 }}>Total Budget</span>
                <span className="mono display" style={{ fontSize:22, fontWeight:800, color:'var(--amber)' }}>{formatINR(budgetConfig.totalBudget)}</span>
              </div>
              <input type="range" min={500000} max={50000000} step={500000}
                value={budgetConfig.totalBudget}
                onChange={e => setBudgetConfig({ totalBudget:+e.target.value })}
                className="slider-amber" style={{ '--pct':`${budgetPct}%` } as React.CSSProperties} />
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
                {['₹5L','₹25L','₹5Cr'].map(l => <span key={l} className="mono text-3" style={{ fontSize:10 }}>{l}</span>)}
              </div>
            </div>

            {/* Cost per tree slider */}
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <span className="label" style={{ fontSize:11 }}>Cost / Tree</span>
                <span className="mono display" style={{ fontSize:22, fontWeight:800, color:'var(--amber)' }}>₹{budgetConfig.costPerTree}</span>
              </div>
              <input type="range" min={50} max={300} step={10}
                value={budgetConfig.costPerTree}
                onChange={e => setBudgetConfig({ costPerTree:+e.target.value })}
                className="slider-amber" style={{ '--pct':`${costPct}%` } as React.CSSProperties} />
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
                {['₹50','₹175','₹300'].map(l => <span key={l} className="mono text-3" style={{ fontSize:10 }}>{l}</span>)}
              </div>
            </div>

            {/* Budget breakdown */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
              {[
                { label:'Cost / Grid',  value:formatINR(costPGrid),            color:'var(--amber)' },
                { label:'Max Grids',    value:String(maxGrids),                color:'var(--amber)' },
                { label:'Max Trees',    value:(maxGrids * budgetConfig.plantableAreaPerGrid * budgetConfig.treesPerHectare).toLocaleString(), color:'var(--green)' },
              ].map(b => (
                <div key={b.label} className="card" style={{ padding:'10px 8px', textAlign:'center', borderColor:'rgba(255,193,7,0.1)' }}>
                  <div className="label" style={{ fontSize:9, marginBottom:5 }}>{b.label}</div>
                  <div className="mono" style={{ fontSize:13, fontWeight:800, color:b.color }}>{b.value}</div>
                </div>
              ))}
            </div>

            {/* Run button */}
            <motion.button whileHover={survivalData ? { scale:1.01 } : {}} whileTap={survivalData ? { scale:.99 } : {}}
              onClick={run} disabled={!survivalData} className="btn btn-amber"
              style={{ width:'100%', padding:'13px 0', fontSize:13 }}>
              {survivalData ? `⚡ Optimize · Best ${maxGrids} Grids` : '⏳ Load Survival AI tab first'}
            </motion.button>
            {!survivalData && <p className="text-3" style={{ fontSize:11, textAlign:'center' }}>Switch to 🌱 Survival AI → then return</p>}
          </div>
        )}

        {/* Results */}
        {optimizationResult && (
          <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} style={{ display:'flex', flexDirection:'column', gap:20 }}>
            {/* KPIs */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[
                { label:'Grids Selected', value:String(optimizationResult.selectedGrids.length), sub:`of ${optimizationResult.gridsEvaluated} viable`, color:'var(--amber)' },
                { label:'Trees Planted',  value:optimizationResult.totalTrees.toLocaleString(),  sub:`${budgetConfig.treesPerHectare}/ha density`,    color:'var(--green)' },
                { label:'Budget Used',    value:`${optimizationResult.budgetUtilization}%`,       sub:formatINR(optimizationResult.totalCost),          color:'#ff9100' },
                { label:'Avg Survival',   value:`${(optimizationResult.averageSurvival*100).toFixed(1)}%`, sub:'across selected grids',                color:'var(--cyan)' },
              ].map(k => (
                <div key={k.label} className="card" style={{ padding:'14px 12px', borderColor:'rgba(255,193,7,0.08)' }}>
                  <div className="label" style={{ fontSize:10, marginBottom:6 }}>{k.label}</div>
                  <div className="mono display" style={{ fontSize:22, fontWeight:800, color:k.color, lineHeight:1 }}>{k.value}</div>
                  <div className="text-3" style={{ fontSize:11, marginTop:5 }}>{k.sub}</div>
                </div>
              ))}
            </div>

            {/* Impact chart */}
            {chartData.length > 0 && (
              <div>
                <div style={{ marginBottom:8 }}>
                  <div style={{ fontSize:13, fontWeight:700, marginBottom:2 }}>Impact Score (Top 15 Grids)</div>
                  <div className="text-3" style={{ fontSize:11 }}>Bar height = environmental benefit · Color = survival probability</div>
                </div>
                <ResponsiveContainer width="100%" height={100}>
                  <BarChart data={chartData} barCategoryGap="22%">
                    <XAxis dataKey="name" fontSize={9} tick={{ fill:'var(--text-3)', fontFamily:'monospace' }} tickLine={false} axisLine={false} />
                    <YAxis hide />
                    <Tooltip content={<TT />} cursor={{ fill:'rgba(255,255,255,0.03)' }} />
                    <Bar dataKey="impact" radius={[3,3,0,0]}>
                      {chartData.map((e,i) => <Cell key={i} fill={e.color} fillOpacity={0.85} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* ROI Summary */}
            {roiResult && grade && (
              <div style={{ background:'rgba(68,138,255,0.06)', border:'1px solid rgba(68,138,255,0.15)', borderRadius:12, padding:16 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
                  <div>
                    <div className="label" style={{ fontSize:11, marginBottom:4 }}>Environmental ROI</div>
                    <div className="text-3" style={{ fontSize:11 }}>CO₂ + O₂ + OSI composite</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div className="mono display" style={{ fontSize:36, fontWeight:900, lineHeight:1, color:grade.color }}>{roiResult.environmentalROI}</div>
                    <div style={{ fontSize:12, fontWeight:700, color:grade.color }}>{grade.label}</div>
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {[
                    { label:'CO₂ Absorbed',  value:`${roiResult.co2AbsorptionTonnes}t/yr`,          color:'var(--blue)' },
                    { label:'O₂ Generated',  value:`${roiResult.oxygenGeneratedKg.toLocaleString()}kg`, color:'var(--cyan)' },
                    { label:'OSI Reduction', value:`−${roiResult.predictedOSIReduction}`,             color:'var(--green)' },
                    { label:'Risk Improved', value:`${roiResult.riskCategoryImprovement}%`,           color:'#84cc16' },
                  ].map(m => (
                    <div key={m.label} className="card" style={{ padding:'10px 12px', borderColor:`${m.color}15` }}>
                      <div className="text-3" style={{ fontSize:10, marginBottom:4 }}>{m.label}</div>
                      <div className="mono" style={{ fontSize:14, fontWeight:800, color:m.color }}>{m.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Where to plant */}
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700 }}>📍 Where to Plant</div>
                  <div className="text-3" style={{ fontSize:11, marginTop:1 }}>Each row = 1km² grid · Click to expand</div>
                </div>
                <span className="tag tag-amber" style={{ fontSize:11 }}>{optimizationResult.selectedGrids.length} grids</span>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {optimizationResult.selectedGrids.map((g,i) => {
                  const rankCol = i < 3 ? 'var(--red)' : i < 8 ? 'var(--amber)' : i < 15 ? '#ffc107' : 'var(--text-3)';
                  const isOpen  = expanded === i;
                  return (
                    <div key={`${g.gridId}-${i}`} className="card" style={{ padding:'12px 14px', cursor:'pointer',
                      borderColor: isOpen ? 'rgba(255,193,7,0.3)' : 'var(--border)',
                      background: isOpen ? 'rgba(255,193,7,0.04)' : 'var(--card)',
                      transition:'all .2s' }}
                      onClick={() => setExpanded(prev => prev === i ? null : i)}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <div style={{ width:22, height:22, borderRadius:6, background:rankCol,
                            display:'flex', alignItems:'center', justifyContent:'center',
                            fontSize:10, fontWeight:800, color:'#000', flexShrink:0 }}>
                            {g.rank}
                          </div>
                          <div>
                            <div className="mono" style={{ fontSize:12, fontWeight:600 }}>
                              {g.lat.toFixed(3)}°N, {g.lng.toFixed(3)}°E
                            </div>
                            <div className="text-3" style={{ fontSize:11 }}>
                              {g.lat > 28.7 ? 'North Delhi' : g.lat > 28.6 ? 'Central' : g.lat > 28.5 ? 'South Delhi' : 'New Delhi'}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign:'right' }}>
                          <div className="mono" style={{ fontSize:15, fontWeight:800, color:getSurvivalColor(g.survivalProb) }}>
                            {(g.survivalProb*100).toFixed(0)}%
                          </div>
                          <div className="text-3" style={{ fontSize:11 }}>{g.treesNeeded} trees</div>
                        </div>
                      </div>
                      {/* Expanded */}
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }}
                            exit={{ opacity:0, height:0 }} style={{ overflow:'hidden' }}>
                            <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid var(--border)',
                              display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                              {[
                                { label:'Cost',       value:formatINR(g.costForGrid),            color:'var(--amber)' },
                                { label:'NDVI Gain',  value:`+${g.expectedNDVIGain.toFixed(4)}`, color:'#84cc16' },
                                { label:'Current OSI',value:g.currentOSI.toFixed(0),             color:'var(--red)' },
                                { label:'Impact',     value:g.impactScore.toFixed(3),            color:'var(--cyan)' },
                              ].map(d => (
                                <div key={d.label} className="card" style={{ padding:'8px 10px' }}>
                                  <div className="text-3" style={{ fontSize:10, marginBottom:3 }}>{d.label}</div>
                                  <div className="mono" style={{ fontSize:13, fontWeight:700, color:d.color }}>{d.value}</div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Policy brief */}
            {policy && (
              <div style={{ background:'rgba(68,138,255,0.05)', border:'1px solid rgba(68,138,255,0.12)', borderRadius:12, padding:14 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--blue)', marginBottom:8 }}>📋 Policy Brief</div>
                <p style={{ fontSize:12, color:'var(--text-2)', lineHeight:1.7 }}>{policy}</p>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
