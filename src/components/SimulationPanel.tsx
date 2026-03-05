'use client';
import React, { useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAppStore } from '@/store/appStore';
import { simulateImpact, getImprovementSummary } from '@/engines/impactSimulator';
import { GeoJSONData } from '@/types';

interface Props { data: GeoJSONData; }

const TT = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'rgba(8,13,24,0.97)', border:'1px solid rgba(179,136,255,0.2)', borderRadius:10, padding:'10px 14px' }}>
      <p style={{ fontSize:12, fontWeight:600, color:'var(--text-1)', marginBottom:4, fontFamily:'monospace' }}>{label}</p>
      {payload.map((e:any,i:number) => (
        <p key={i} style={{ fontSize:12, fontFamily:'monospace', color:e.stroke||e.color }}>
          {e.name}: <strong>{typeof e.value === 'number' ? e.value.toFixed(2) : e.value}</strong>
        </p>
      ))}
    </div>
  );
};

export default function SimulationPanel({ data }: Props) {
  const { optimizationResult, simulationSnapshots, setSimulationSnapshots, simulationYear, setSimulationYear } = useAppStore();

  const run = useCallback(() => {
    if (!optimizationResult || !data) return;
    setSimulationSnapshots(simulateImpact(data, optimizationResult.selectedGrids));
  }, [data, optimizationResult, setSimulationSnapshots]);

  const improvement = useMemo(() => simulationSnapshots ? getImprovementSummary(data, simulationSnapshots) : null, [data, simulationSnapshots]);

  const chartData = useMemo(() => {
    if (!simulationSnapshots || !data) return [];
    const baseOSI = data.features.reduce((s,f) => s + f.properties.OSI, 0) / data.features.length;
    const baseCrit = data.features.filter(f => f.properties.OSI >= 800).length;
    const baseNDVI = data.features.reduce((s,f) => s + f.properties.NDVI, 0) / data.features.length;
    return [
      { year:2024, avgOSI:Math.round(baseOSI), criticalZones:baseCrit, co2:0, ndvi:parseFloat(baseNDVI.toFixed(4)) },
      ...simulationSnapshots.map(s => ({ year:s.year, avgOSI:Math.round(s.avgOSI), criticalZones:s.criticalZones, co2:s.co2AbsorbedCumulative, ndvi:s.avgNDVI })),
    ];
  }, [data, simulationSnapshots]);

  const snap = useMemo(() => simulationSnapshots?.find(s => s.year === simulationYear) || null, [simulationSnapshots, simulationYear]);

  return (
    <div className="panel" style={{ flex:1, minHeight:0, display:'flex', flexDirection:'column', overflow:'hidden',
      border:'1px solid rgba(179,136,255,0.1)' }}>
      {/* Header */}
      <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:18 }}>🔮</span>
          <div>
            <div style={{ fontSize:15, fontWeight:700 }}>4-Year Impact Simulator</div>
            <div className="text-3" style={{ fontSize:11, marginTop:1 }}>Projecting environmental recovery through 2028</div>
          </div>
        </div>
      </div>

      <div style={{ flex:1, minHeight:0, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:20 }}>

        {/* Pre-run */}
        {!simulationSnapshots && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ background:'rgba(179,136,255,0.06)', border:'1px solid rgba(179,136,255,0.15)', borderRadius:12, padding:16 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--purple)', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
                🧬 Logistic Growth Model
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {[
                  { icon:'📈', title:'NDVI rises',   desc:'More canopy cover',       color:'var(--green)' },
                  { icon:'☁️', title:'AOD drops',    desc:'Trees filter particles',   color:'var(--cyan)' },
                  { icon:'📉', title:'OSI falls',    desc:'Oxygen stress reduces',    color:'var(--purple)' },
                  { icon:'🌿', title:'CO₂ captured', desc:'Cumulative sequestration', color:'#84cc16' },
                ].map(m => (
                  <div key={m.title} className="card" style={{ padding:12 }}>
                    <div style={{ fontSize:18, marginBottom:6 }}>{m.icon}</div>
                    <div style={{ fontSize:13, fontWeight:700, color:m.color, marginBottom:2 }}>{m.title}</div>
                    <div className="text-3" style={{ fontSize:11 }}>{m.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <motion.button whileHover={optimizationResult ? { scale:1.01 } : {}} whileTap={optimizationResult ? { scale:.99 } : {}}
              onClick={run} disabled={!optimizationResult} className="btn btn-purple"
              style={{ width:'100%', padding:'13px 0', fontSize:13 }}>
              {optimizationResult ? '🔮 Simulate 2025–2028 Impact' : '⏳ Run Budget Optimizer first'}
            </motion.button>
            {!optimizationResult && (
              <p className="text-3" style={{ fontSize:11, textAlign:'center' }}>
                Pipeline: 🌱 Survival AI → 💰 Optimizer → 🔮 Simulator
              </p>
            )}
          </div>
        )}

        {/* Results */}
        {simulationSnapshots && improvement && (
          <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} style={{ display:'flex', flexDirection:'column', gap:20 }}>

            {/* Year selector */}
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <span className="label" style={{ fontSize:11 }}>Viewing Year</span>
                <span className="mono display" style={{ fontSize:24, fontWeight:800, color:'var(--purple)' }}>{simulationYear}</span>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                {[2025,2026,2027,2028].map(yr => (
                  <button key={yr} onClick={() => setSimulationYear(yr)} style={{
                    flex:1, padding:'9px 0', borderRadius:8, border:'1px solid',
                    borderColor: simulationYear === yr ? 'rgba(179,136,255,0.4)' : 'var(--border)',
                    background: simulationYear === yr ? 'rgba(179,136,255,0.15)' : 'rgba(0,0,0,0.3)',
                    color: simulationYear === yr ? 'var(--purple)' : 'var(--text-3)',
                    fontSize:13, fontWeight:700, fontFamily:'monospace',
                    cursor:'pointer', transition:'all .2s',
                    boxShadow: simulationYear === yr ? '0 0 12px rgba(179,136,255,0.15)' : 'none',
                  }}>{yr}</button>
                ))}
              </div>
            </div>

            {/* Before → After */}
            <div style={{ background:'linear-gradient(135deg, rgba(255,89,131,0.05), rgba(0,245,157,0.05))',
              border:'1px solid var(--border)', borderRadius:12, padding:16 }}>
              <div className="label" style={{ textAlign:'center', marginBottom:12 }}>
                2024 Baseline → {improvement.finalYear} Projected
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, textAlign:'center' }}>
                {[
                  { label:'OSI Change',     value:`−${improvement.osiReduction}`,         sub:`${improvement.osiReductionPercent}% ↓`, color:'var(--green)' },
                  { label:'Critical Zones', value:`−${improvement.criticalZoneReduction}`, sub:'eliminated',                           color:'var(--cyan)' },
                  { label:'CO₂ Total',      value:`${improvement.totalCO2}t`,              sub:'cumulative',                            color:'var(--blue)' },
                ].map(s => (
                  <div key={s.label}>
                    <div className="text-3" style={{ fontSize:11, marginBottom:4 }}>{s.label}</div>
                    <div className="mono display" style={{ fontSize:26, fontWeight:900, lineHeight:1, color:s.color }}>{s.value}</div>
                    <div style={{ fontSize:11, marginTop:4, color:`${s.color}80` }}>{s.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* OSI trend */}
            <div>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:3 }}>Avg OSI Over Time</div>
              <div className="text-3" style={{ fontSize:11, marginBottom:10 }}>Lower = less stress = healthier city</div>
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#b388ff" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#b388ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" fontSize={10} tick={{ fill:'var(--text-3)', fontFamily:'monospace' }} />
                  <YAxis fontSize={10} tick={{ fill:'var(--text-3)' }} />
                  <Tooltip content={<TT />} />
                  <Area type="monotone" dataKey="avgOSI" stroke="#b388ff" fill="url(#g1)" strokeWidth={2.5}
                    dot={{ fill:'#b388ff', r:4 }} name="Avg OSI" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* CO₂ trend */}
            <div>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:3 }}>Cumulative CO₂ Absorbed</div>
              <div className="text-3" style={{ fontSize:11, marginBottom:10 }}>Tonnes of carbon sequestered by growing trees</div>
              <ResponsiveContainer width="100%" height={100}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" fontSize={10} tick={{ fill:'var(--text-3)', fontFamily:'monospace' }} />
                  <YAxis fontSize={10} tick={{ fill:'var(--text-3)' }} />
                  <Tooltip content={<TT />} />
                  <Line type="monotone" dataKey="co2" stroke="var(--blue)" strokeWidth={2.5}
                    dot={{ fill:'var(--blue)', r:4, stroke:'rgba(68,138,255,0.4)', strokeWidth:4 }} name="CO₂ (t)" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Year snapshot */}
            {snap && (
              <div style={{ background:'rgba(179,136,255,0.06)', border:'1px solid rgba(179,136,255,0.15)', borderRadius:12, padding:16 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--purple)', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
                  📊 {simulationYear} Detailed Snapshot
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                  {[
                    { label:'Avg OSI',   value:String(snap.avgOSI),                   color:'var(--purple)' },
                    { label:'Critical',  value:String(snap.criticalZones),             color:'var(--red)' },
                    { label:'High Risk', value:String(snap.highRiskZones),             color:'var(--amber)' },
                    { label:'Avg NDVI',  value:String(snap.avgNDVI),                   color:'var(--green)' },
                    { label:'CO₂ Total', value:`${snap.co2AbsorbedCumulative}t`,       color:'var(--blue)' },
                    { label:'O₂ Total',  value:`${snap.oxygenGenerated}t`,             color:'var(--cyan)' },
                  ].map(s => (
                    <div key={s.label} className="card" style={{ padding:'10px 8px', textAlign:'center', borderColor:`${s.color}15` }}>
                      <div className="text-3" style={{ fontSize:10, marginBottom:4 }}>{s.label}</div>
                      <div className="mono" style={{ fontSize:14, fontWeight:800, color:s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reset */}
            <button onClick={() => setSimulationSnapshots(null)} style={{
              width:'100%', padding:'10px 0', borderRadius:10,
              background:'rgba(0,0,0,0.3)', border:'1px solid var(--border)',
              color:'var(--text-3)', fontSize:12, fontWeight:600, cursor:'pointer', transition:'all .2s',
            }}
            onMouseEnter={e => (e.target as HTMLElement).style.color = 'var(--text-2)'}
            onMouseLeave={e => (e.target as HTMLElement).style.color = 'var(--text-3)'}>
              🔄 Reset & Re-simulate
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
