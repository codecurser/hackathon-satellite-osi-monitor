'use client';
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { GeoJSONData } from '@/types';
import { processAllGridsSurvival, getSurvivalSummary, getSurvivalColor } from '@/engines/survivalModel';
import { useAppStore } from '@/store/appStore';

interface Props { data: GeoJSONData; }

const TT = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'rgba(8,13,24,0.97)', border:'1px solid rgba(0,245,157,0.2)', borderRadius:10, padding:'10px 14px' }}>
      <p style={{ fontSize:12, fontWeight:600, color:'var(--text-1)', marginBottom:4 }}>{label}</p>
      {payload.map((e:any,i:number) => (
        <p key={i} style={{ fontSize:12, fontFamily:'monospace', color:e.fill }}>Grids: <strong>{e.value}</strong></p>
      ))}
    </div>
  );
};

export default function TreeSurvivalPanel({ data }: Props) {
  const { setSurvivalData } = useAppStore();

  const grids = useMemo(() => {
    const r = processAllGridsSurvival(data);
    setSurvivalData(r);
    return r;
  }, [data, setSurvivalData]);

  const summary = useMemo(() => getSurvivalSummary(grids), [grids]);

  const dist = useMemo(() => [
    { range:'75–95%', count: grids.filter(g => g.survivalProbability >= 0.75).length, color:'#00f59d', label:'Excellent' },
    { range:'60–75%', count: grids.filter(g => g.survivalProbability >= 0.6 && g.survivalProbability < 0.75).length, color:'#84cc16', label:'Good' },
    { range:'45–60%', count: grids.filter(g => g.survivalProbability >= 0.45 && g.survivalProbability < 0.6).length, color:'#ffc107', label:'Moderate' },
    { range:'30–45%', count: grids.filter(g => g.survivalProbability >= 0.3 && g.survivalProbability < 0.45).length, color:'#ff9100', label:'Poor' },
    { range:'<30%',   count: grids.filter(g => g.survivalProbability < 0.3).length, color:'#ff5983', label:'Very Poor' },
  ], [grids]);

  const top = grids.slice(0, 10);

  const kpis = [
    { label:'Avg Survival',   value:`${(summary.avgSurvival*100).toFixed(1)}%`,  color:'var(--green)', sub:`Best: ${(summary.bestSurvival*100).toFixed(0)}%` },
    { label:'Suitable Grids', value:String(summary.totalSuitableGrids),           color:'var(--cyan)',  sub:`of ${grids.length} (≥50%)` },
    { label:'Avg NDVI Gain',  value:`+${summary.avgNDVIGain.toFixed(4)}`,         color:'#84cc16',      sub:'After 1 year' },
    { label:'Stabilization',  value:`${summary.avgStabilization}yr`,              color:'var(--blue)',  sub:'To ecological stability' },
  ];

  return (
    <div className="panel" style={{ flex:1, minHeight:0, display:'flex', flexDirection:'column', overflow:'hidden',
      border:'1px solid rgba(0,245,157,0.08)' }}>
      {/* Header */}
      <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:18 }}>🌱</span>
          <div>
            <div style={{ fontSize:15, fontWeight:700 }}>Tree Survival Intelligence</div>
            <div className="text-3" style={{ fontSize:11, marginTop:1 }}>AI-estimated sapling survival per 1km² grid</div>
          </div>
        </div>
      </div>

      <div style={{ flex:1, minHeight:0, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:20 }}>
        {/* How it works */}
        <div style={{ background:'rgba(0,245,157,0.05)', border:'1px solid rgba(0,245,157,0.12)', borderRadius:12, padding:14 }}>
          <p style={{ fontSize:12, color:'rgba(0,245,157,0.75)', lineHeight:1.6 }}>
            🧠 Analyzes each grid's <strong style={{ color:'var(--text-1)' }}>vegetation (NDVI)</strong>,{' '}
            <strong style={{ color:'var(--text-1)' }}>temperature</strong>, and{' '}
            <strong style={{ color:'var(--text-1)' }}>pollution (AOD)</strong> to estimate sapling survival probability.
            Higher NDVI + cooler temperatures = best outcomes.
          </p>
        </div>

        {/* KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {kpis.map((k,i) => (
            <motion.div key={k.label} className="card"
              initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*.06 }}
              style={{ padding:'14px 12px' }}>
              <div className="label" style={{ fontSize:10, marginBottom:6 }}>{k.label}</div>
              <div className="mono display" style={{ fontSize:22, fontWeight:800, color:k.color, lineHeight:1 }}>{k.value}</div>
              <div className="text-3" style={{ fontSize:11, marginTop:5 }}>{k.sub}</div>
            </motion.div>
          ))}
        </div>

        <div className="divider" />

        {/* Distribution chart */}
        <div>
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:2 }}>Survival Distribution</div>
            <div className="text-3" style={{ fontSize:11 }}>Grid count per survival probability band</div>
          </div>
          <ResponsiveContainer width="100%" height={110}>
            <BarChart data={dist} barCategoryGap="25%">
              <XAxis dataKey="range" fontSize={10} tick={{ fill:'var(--text-3)', fontFamily:'monospace' }}
                tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip content={<TT />} cursor={{ fill:'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="count" radius={[4,4,0,0]}>
                {dist.map((e,i) => <Cell key={i} fill={e.color} fillOpacity={0.85} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:8 }}>
            {dist.map(d => (
              <span key={d.range} style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11,
                padding:'3px 8px', borderRadius:20, background:`${d.color}10`, border:`1px solid ${d.color}25` }}>
                <span style={{ width:8, height:8, borderRadius:2, background:d.color, display:'inline-block' }} />
                <span style={{ color:'var(--text-2)' }}>{d.label}:</span>
                <span className="mono" style={{ fontWeight:700, color:d.color }}>{d.count}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="divider" />

        {/* Top grids */}
        <div>
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:2 }}>🏆 Top 10 Plantation-Ready Grids</div>
            <div className="text-3" style={{ fontSize:11 }}>Ranked by suitability: survival × impact × urgency</div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {top.map((g, i) => {
              const col = getSurvivalColor(g.survivalProbability);
              return (
                <motion.div key={g.gridId} className="card"
                  initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} transition={{ delay:.1+i*.03 }}
                  style={{ padding:'12px 14px', borderColor:`${col}15` }}
                  whileHover={{ scale:1.01, borderColor:`${col}35` }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:24, height:24, borderRadius:7, background:col,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:11, fontWeight:800, color:'#000', flexShrink:0 }}>
                        {i+1}
                      </div>
                      <div>
                        <div style={{ fontSize:14, fontWeight:600 }}>
                          {(g.survivalProbability*100).toFixed(1)}% survival
                        </div>
                        <div className="mono text-3" style={{ fontSize:11 }}>{g.lat.toFixed(3)}°N · Score: {g.suitabilityScore.toFixed(0)}/100</div>
                      </div>
                    </div>
                  </div>
                  {/* Survival bar */}
                  <div style={{ height:4, borderRadius:4, background:`${col}15`, marginBottom:8 }}>
                    <div style={{ height:'100%', borderRadius:4, width:`${g.survivalProbability*100}%`, background:col }} />
                  </div>
                  {/* Metrics */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:4 }}>
                    {[
                      { k:'NDVI+', v:`+${g.expectedNDVIGain.toFixed(3)}`, c:'#84cc16' },
                      { k:'OSI',   v:g.currentOSI.toFixed(0),             c:'var(--red)' },
                      { k:'Temp',  v:`${g.currentTemp.toFixed(0)}°`,       c:'var(--amber)' },
                      { k:'Stab', v:`${g.stabilizationYears}yr`,          c:'var(--blue)' },
                    ].map(m => (
                      <div key={m.k} style={{ textAlign:'center' }}>
                        <div className="text-3" style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:2 }}>{m.k}</div>
                        <div className="mono" style={{ fontSize:12, fontWeight:700, color:m.c }}>{m.v}</div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div style={{ background:'rgba(255,193,7,0.06)', border:'1px solid rgba(255,193,7,0.15)', borderRadius:12, padding:14, textAlign:'center' }}>
          <p style={{ fontSize:12, color:'var(--text-2)' }}>
            ✅ Survival loaded. Switch to <strong style={{ color:'var(--amber)' }}>💰 Optimizer</strong> to build your plantation plan.
          </p>
        </div>
      </div>
    </div>
  );
}
