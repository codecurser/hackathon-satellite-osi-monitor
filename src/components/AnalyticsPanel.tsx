'use client';
import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { GeoJSONData } from '@/types';
import { DataProcessor } from '@/utils/dataProcessor';

interface Props { data: GeoJSONData; selectedYear: number; previousYearData?: GeoJSONData; mode: 'historical' | 'forecast'; }

const TT = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'rgba(8,13,24,0.97)', border:'1px solid rgba(0,229,255,0.2)', borderRadius:10, padding:'10px 14px' }}>
      <p style={{ fontSize:12, fontWeight:600, color:'var(--text-1)', marginBottom:4 }}>{label}</p>
      {payload.map((e:any,i:number) => (
        <p key={i} style={{ fontSize:12, fontFamily:'monospace', color: e.fill || e.color }}>
          {e.name}: <strong>{typeof e.value === 'number' ? e.value.toFixed(2) : e.value}</strong>
        </p>
      ))}
    </div>
  );
};

export default function AnalyticsPanel({ data, selectedYear, previousYearData, mode }: Props) {
  const analytics = useMemo(() => DataProcessor.calculateAnalytics(data, selectedYear, previousYearData), [data, selectedYear, previousYearData]);

  const risk = useMemo(() => {
    const f = data.features;
    const total = f.length || 1;
    const items = [
      { name:'Low',      value: f.filter(x => x.properties.OSI < 700).length, color:'#00f59d' },
      { name:'Moderate', value: f.filter(x => x.properties.OSI >= 700 && x.properties.OSI < 750).length, color:'#ffc107' },
      { name:'High',     value: f.filter(x => x.properties.OSI >= 750 && x.properties.OSI < 800).length, color:'#ff9100' },
      { name:'Critical', value: f.filter(x => x.properties.OSI >= 800).length, color:'#ff5983' },
    ];
    return items.map(i => ({ ...i, pct: Math.round((i.value/total)*100) }));
  }, [data]);

  const features = [
    { name:'AOD',  pct:42, color:'#448aff', desc:'Aerosol pollution' },
    { name:'NDVI', pct:28, color:'#00f59d', desc:'Vegetation cover' },
    { name:'Temp', pct:18, color:'#ffc107', desc:'Surface heat' },
    { name:'Year', pct:12, color:'#b388ff', desc:'Temporal trend' },
  ];

  const kpis = [
    { label:'Avg OSI',      value: String(analytics.averageOSI), color:'var(--cyan)', sub: analytics.yearOverYearChange !== 0 ? `${analytics.yearOverYearChange > 0 ? '▲' : '▼'} ${Math.abs(analytics.yearOverYearChange)}% YoY` : 'Stable', subColor: analytics.yearOverYearChange > 0 ? 'var(--red)' : 'var(--green)' },
    { label:'Critical Zones', value: String(analytics.criticalZones), color:'var(--red)', sub:`High risk: ${analytics.highRiskZones}`, subColor:'var(--amber)' },
    { label:'O₂ Deficit',   value: String(analytics.oxygenDeficitIndex), color:'var(--blue)', sub:'Normalized index', subColor:'var(--text-3)' },
    { label:'Plant Target', value:`${analytics.suggestedPlantationIncrease}ha`, color:'var(--green)', sub:`~${Math.round(analytics.suggestedPlantationIncrease*400)} trees`, subColor:'var(--green)' },
  ];

  return (
    <div className="panel" style={{ flex:1, minHeight:0, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      {/* Header */}
      <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:18 }}>📊</span>
            <div>
              <div style={{ fontSize:15, fontWeight:700 }}>Stress Analytics</div>
              <div className="text-3" style={{ fontSize:11, marginTop:1 }}>Environmental analysis · {selectedYear}</div>
            </div>
          </div>
          {mode === 'forecast' && <span className="tag tag-purple">🤖 AI Forecast</span>}
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex:1, minHeight:0, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:20 }}>

        {/* KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {kpis.map((k,i) => (
            <motion.div key={k.label} className="card"
              initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*.06 }}
              style={{ padding:'14px 12px' }}>
              <div className="label" style={{ fontSize:10, marginBottom:6 }}>{k.label}</div>
              <div className="display mono" style={{ fontSize:24, fontWeight:800, color:k.color, lineHeight:1 }}>{k.value}</div>
              <div style={{ fontSize:11, marginTop:5, fontWeight:600, color:k.subColor }}>{k.sub}</div>
            </motion.div>
          ))}
        </div>

        {/* Risk Distribution */}
        <div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <span style={{ fontSize:13, fontWeight:700 }}>Risk Distribution</span>
            <span className="text-3" style={{ fontSize:11 }}>{data.features.length} grids</span>
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={risk} cx="50%" cy="50%" innerRadius={38} outerRadius={64}
                paddingAngle={3} dataKey="value" strokeWidth={0}>
                {risk.map((e,i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip content={<TT />} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginTop:8 }}>
            {risk.map(r => (
              <div key={r.name} className="card" style={{ padding:'8px 10px', display:'flex', alignItems:'center', gap:8,
                borderColor:`${r.color}15` }}>
                <div style={{ width:10, height:10, borderRadius:3, background:r.color, flexShrink:0 }} />
                <div>
                  <div className="text-2" style={{ fontSize:11 }}>{r.name}</div>
                  <div className="mono" style={{ fontSize:13, fontWeight:700, color:r.color }}>{r.value} <span className="text-3" style={{ fontSize:10 }}>({r.pct}%)</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="divider" />

        {/* Feature Importance */}
        <div>
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:3 }}>XGBoost Feature Importance</div>
            <div className="text-3" style={{ fontSize:11 }}>Drivers of OSI prediction accuracy</div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {features.map((f,i) => (
              <div key={f.name}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span className="mono" style={{ fontSize:13, fontWeight:700, color:f.color, width:36 }}>{f.name}</span>
                    <span className="text-3" style={{ fontSize:11 }}>{f.desc}</span>
                  </div>
                  <span className="mono" style={{ fontSize:13, fontWeight:700, color:f.color }}>{f.pct}%</span>
                </div>
                <div style={{ height:6, borderRadius:4, background:`${f.color}15`, overflow:'hidden' }}>
                  <motion.div initial={{ width:0 }} animate={{ width:`${f.pct}%` }}
                    transition={{ duration:1, delay:.4+i*.1, ease:'easeOut' }}
                    style={{ height:'100%', borderRadius:4, background:f.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI model (forecast) */}
        {mode === 'forecast' && (
          <>
            <div className="divider" />
            <div style={{ background:'var(--purple-a10)', border:'1px solid var(--purple-a20)', borderRadius:12, padding:16 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--purple)', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
                🧠 Model Details
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:'8px 16px', fontSize:12 }}>
                {[['Algorithm','XGBoost'],['R² Score','0.966 ✅'],['Training','2019–2023'],['Features','AOD · NDVI · Temp · Year']].map(([k,v]) => (
                  <React.Fragment key={k}>
                    <span className="text-3" style={{ fontWeight:600 }}>{k}</span>
                    <span className="mono" style={{ color:'var(--text-1)', fontWeight:600 }}>{v}</span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
