'use client';
import React, { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { useAppStore } from '@/store/appStore';
import { runPolicyEngine, ZONE_META } from '@/engines/policyEngine';
import { GeoJSONData } from '@/types';
import { ZoneType, PolicyZone } from '@/types';

// ─── Zone badge ──────────────────────────────────────────────────────────────
function ZoneBadge({ type }: { type: ZoneType }) {
  const m = ZONE_META[type];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700,
      background: `${m.color}18`, border: `1px solid ${m.color}40`, color: m.color,
    }}>
      {m.icon} {m.label}
    </span>
  );
}

// ─── KPI tile ────────────────────────────────────────────────────────────────
function KPITile({ label, value, sub, color, icon }: {
  label: string; value: string | number; sub: string; color: string; icon: string;
}) {
  return (
    <div className="card" style={{ padding: '12px 10px', borderColor: `${color}18`, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 8, right: 10, fontSize: 20, opacity: 0.12 }}>{icon}</div>
      <div className="label" style={{ fontSize: 9, marginBottom: 5 }}>{label}</div>
      <div className="mono display" style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div className="text-3" style={{ fontSize: 10, marginTop: 4 }}>{sub}</div>
    </div>
  );
}

// ─── Zone card in the list ────────────────────────────────────────────────────
function ZoneCard({ zone, rank }: { zone: PolicyZone; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const m = ZONE_META[zone.zoneType];

  return (
    <motion.div
      layout
      onClick={() => setExpanded(x => !x)}
      style={{
        borderRadius: 10, padding: '10px 12px', cursor: 'pointer',
        background: `${m.color}08`, border: `1px solid ${m.color}22`,
        transition: 'border-color 0.2s',
      }}
      whileHover={{ borderColor: `${m.color}55` }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: m.color, minWidth: 22, fontFamily: 'monospace' }}>
          #{rank}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <ZoneBadge type={zone.zoneType} />
            {zone.urgencyLevel === 3 && (
              <span style={{ fontSize: 9, color: '#ff5983', fontFamily: 'monospace', fontWeight: 700 }}>
                ● URGENT
              </span>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, marginTop: 6 }}>
            <div style={{ fontSize: 10 }}>
              <span style={{ color: 'var(--text-3)' }}>OSI </span>
              <span style={{ color: zone.osi >= 800 ? '#ff5983' : zone.osi >= 750 ? '#ff9100' : '#4caf50', fontWeight: 700, fontFamily: 'monospace' }}>
                {Math.round(zone.osi)}
              </span>
            </div>
            <div style={{ fontSize: 10 }}>
              <span style={{ color: 'var(--text-3)' }}>Surv </span>
              <span style={{ fontWeight: 700, fontFamily: 'monospace', color: zone.survivalProbability > 0.5 ? '#00f59d' : zone.survivalProbability > 0.35 ? '#ffc107' : '#ff5983' }}>
                {(zone.survivalProbability * 100).toFixed(0)}%
              </span>
            </div>
            <div style={{ fontSize: 10 }}>
              <span style={{ color: 'var(--text-3)' }}>Lat </span>
              <span style={{ fontFamily: 'monospace', color: 'var(--text-2)' }}>{zone.lat.toFixed(2)}</span>
            </div>
          </div>
        </div>
        <div style={{ color: 'var(--text-3)', fontSize: 10, flexShrink: 0 }}>
          {expanded ? '▲' : '▼'}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden', marginTop: 10, borderTop: `1px solid ${m.color}22`, paddingTop: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6, marginBottom: 8 }}>{zone.reason}</div>
            {(zone.zoneType === 'cng_restriction' || zone.zoneType === 'critical_cng') && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <div style={{ background: 'rgba(255,145,0,0.06)', border: '1px solid rgba(255,145,0,0.2)', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ fontSize: 9, color: 'var(--text-3)' }}>VEHICLES/DAY AFFECTED</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#ff9100', fontFamily: 'monospace' }}>~{zone.estimatedVehicles.toLocaleString()}</div>
                </div>
                <div style={{ background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ fontSize: 9, color: 'var(--text-3)' }}>CO₂ SAVED/DAY</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#00e5ff', fontFamily: 'monospace' }}>{zone.co2ReductionKg.toLocaleString()} kg</div>
                </div>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 6 }}>
              <div style={{ fontSize: 10, color: 'var(--text-3)' }}>AOD: <span style={{ color: 'var(--text-1)', fontFamily: 'monospace' }}>{Math.round(zone.aod)}</span></div>
              <div style={{ fontSize: 10, color: 'var(--text-3)' }}>NDVI: <span style={{ color: 'var(--text-1)', fontFamily: 'monospace' }}>{zone.ndvi.toFixed(3)}</span></div>
              <div style={{ fontSize: 10, color: 'var(--text-3)' }}>Temp: <span style={{ color: 'var(--text-1)', fontFamily: 'monospace' }}>{zone.temp.toFixed(1)}°C</span></div>
              <div style={{ fontSize: 10, color: 'var(--text-3)' }}>Suitability: <span style={{ color: 'var(--text-1)', fontFamily: 'monospace' }}>{zone.suitabilityScore.toFixed(1)}</span></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Donut chart custom label ──────────────────────────────────────────────
const RADIAN = Math.PI / 180;
function PieCustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, value, name }: any) {
  if (value === 0) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700}>
      {value}
    </text>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────
interface PolicyPanelProps { data: GeoJSONData }

export default function PolicyPanel({ data }: PolicyPanelProps) {
  const { survivalData, policyState, setPolicyState } = useAppStore();
  const { result, isRunning, osiThreshold, survivalThreshold } = policyState;
  const [filterType, setFilterType] = useState<ZoneType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'urgency' | 'osi'>('urgency');

  const run = useCallback(async () => {
    if (!survivalData?.length) return;
    setPolicyState({ isRunning: true });
    await new Promise(r => setTimeout(r, 30));
    const res = runPolicyEngine(survivalData, osiThreshold, survivalThreshold);
    setPolicyState({ result: res, isRunning: false, showPolicyLayer: true });
  }, [survivalData, osiThreshold, survivalThreshold, setPolicyState]);

  // Filtered + sorted zones list
  const displayZones = useMemo(() => {
    if (!result) return [];
    let zones = filterType === 'all' ? result.zones : result.zones.filter(z => z.zoneType === filterType);
    if (sortBy === 'urgency') zones = [...zones].sort((a, b) => b.urgencyLevel - a.urgencyLevel || b.osi - a.osi);
    else zones = [...zones].sort((a, b) => b.osi - a.osi);
    return zones.slice(0, 60); // cap list for perf
  }, [result, filterType, sortBy]);

  // Pie chart data
  const pieData = useMemo(() => {
    if (!result) return [];
    return ([
      { name: 'Green', value: result.greenZones,          color: ZONE_META.green.color },
      { name: 'Plantation', value: result.plantationZones,    color: ZONE_META.plantation.color },
      { name: 'Monitored', value: result.monitoredZones,      color: ZONE_META.monitored.color },
      { name: 'CNG Zone', value: result.cngRestrictionZones,  color: ZONE_META.cng_restriction.color },
      { name: 'Critical CNG', value: result.criticalCngZones, color: ZONE_META.critical_cng.color },
    ]).filter(d => d.value > 0);
  }, [result]);

  const osiPct  = ((osiThreshold - 700) / (850 - 700)) * 100;
  const survPct = ((survivalThreshold - 0.50) / (0.80 - 0.50)) * 100;

  return (
    <div className="panel" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      border: '1px solid rgba(255,145,0,0.12)' }}>

      {/* ── Header ── */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>🚦</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>Policy Engine</div>
            <div className="text-3" style={{ fontSize: 11, marginTop: 1 }}>
              Plantation vs CNG Restriction zone classifier
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ── No survival data ── */}
        {!survivalData?.length && (
          <div style={{ background: 'rgba(255,145,0,0.06)', border: '1px solid rgba(255,145,0,0.2)',
            borderRadius: 12, padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🌱</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#ff9100', marginBottom: 6 }}>Survival AI Required</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>
              Run <strong style={{ color: '#00f59d' }}>🌱 Survival AI</strong> tab first to compute grid probabilities, then return here.
            </div>
          </div>
        )}

        {/* ── Thresholds ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>⚙️</span> Classification Thresholds
          </div>

          {/* OSI threshold */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span className="label" style={{ fontSize: 11 }}>OSI Stress Threshold</span>
              <span className="mono display" style={{ fontSize: 18, fontWeight: 800, color: '#ff9100' }}>{osiThreshold}</span>
            </div>
            <input type="range" min={700} max={850} step={10}
              value={osiThreshold}
              onChange={e => setPolicyState({ osiThreshold: +e.target.value })}
              className="slider-amber"
              style={{ '--pct': `${osiPct}%` } as React.CSSProperties} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
              {['700', '775', '850'].map(l => <span key={l} className="mono text-3" style={{ fontSize: 9 }}>OSI {l}</span>)}
            </div>
          </div>

          {/* Survival threshold */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span className="label" style={{ fontSize: 11 }}>Min Survival (Plantation Viable)</span>
              <span className="mono display" style={{ fontSize: 18, fontWeight: 800, color: '#00f59d' }}>{(survivalThreshold * 100).toFixed(0)}%</span>
            </div>
            <input type="range" min={0.50} max={0.80} step={0.05}
              value={survivalThreshold}
              onChange={e => setPolicyState({ survivalThreshold: +e.target.value })}
              className="slider-green"
              style={{ '--pct': `${survPct}%` } as React.CSSProperties} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
              {['50%', '65%', '80%'].map(l => <span key={l} className="mono text-3" style={{ fontSize: 9 }}>{l}</span>)}
            </div>
          </div>
        </div>

        {/* ── Zone legend ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-1)', marginBottom: 2 }}>🗺️ Zone Classification Legend</div>
          {(Object.entries(ZONE_META) as [ZoneType, typeof ZONE_META[ZoneType]][]).map(([type, m]) => (
            <div key={type} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0',
              borderBottom: '1px solid var(--border-dim)' }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: m.color, flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: m.color }}>{m.icon} {m.label}</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', lineHeight: 1.4 }}>{m.description}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Run button ── */}
        <motion.button
          whileHover={survivalData?.length ? { scale: 1.01 } : {}}
          whileTap={survivalData?.length ? { scale: 0.99 } : {}}
          onClick={run}
          disabled={!survivalData?.length || isRunning}
          className="btn"
          style={{
            width: '100%', padding: '13px 0', fontSize: 13, fontWeight: 700,
            background: survivalData?.length
              ? 'linear-gradient(135deg, rgba(255,145,0,0.2), rgba(255,89,131,0.12))'
              : 'rgba(255,255,255,0.04)',
            border: `1px solid ${survivalData?.length ? 'rgba(255,145,0,0.4)' : 'var(--border)'}`,
            color: survivalData?.length ? '#ff9100' : 'var(--text-3)',
            borderRadius: 10, cursor: survivalData?.length ? 'pointer' : 'not-allowed',
            transition: 'all .2s',
          }}>
          {isRunning ? '⏳ Classifying zones…' : survivalData?.length
            ? '🚦 Run Policy Classification'
            : '⏳ Load Survival AI tab first'}
        </motion.button>

        {/* ── Results ── */}
        <AnimatePresence>
          {result && (
            <motion.div key="results"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* KPIs */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>📊 Overview</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <KPITile label="PLANTATION ZONES" value={result.plantationZones} sub={`${result.totalPlantationAreaKm2} km² plantable`} color="#4caf50" icon="🌱" />
                  <KPITile label="CNG RESTRICTION" value={result.cngRestrictionZones + result.criticalCngZones} sub="zones affected" color="#ff9100" icon="🚫" />
                  <KPITile label="VEHICLES/DAY" value={`~${(result.totalEstimatedVehiclesAffected / 1000).toFixed(0)}k`} sub="estimated affected" color="#00e5ff" icon="🚘" />
                  <KPITile label="CO₂ SAVED/DAY" value={`${result.totalCO2ReductionTonnesPerDay.toFixed(1)}t`} sub="if CNG enforced" color="#b388ff" icon="🌬️" />
                </div>
              </div>

              {/* Critical alert */}
              {result.criticalCngZones > 0 && (
                <motion.div
                  animate={{ borderColor: ['rgba(255,89,131,0.3)', 'rgba(255,89,131,0.7)', 'rgba(255,89,131,0.3)'] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{ background: 'rgba(255,89,131,0.06)', border: '1px solid rgba(255,89,131,0.3)',
                    borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#ff5983', marginBottom: 4 }}>
                    🔴 {result.criticalCngZones} Critical CNG Ban Zones Identified
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5 }}>
                    These zones have extreme OSI (≥800) with very low plantation viability (survival &lt;25%). Immediate petrol/diesel vehicle restriction is recommended.
                  </div>
                </motion.div>
              )}

              {/* Pie chart */}
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>🍩 Zone Distribution</div>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70}
                      dataKey="value" labelLine={false} label={PieCustomLabel}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} stroke="rgba(0,0,0,0.3)" strokeWidth={1} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 11 }}
                      formatter={(v: number, n: string) => [`${v} grids`, n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                  {pieData.map(d => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: 'var(--text-3)' }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                      <span>{d.name} ({d.value})</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Zone list */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>📍 Zone List</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <select value={filterType} onChange={e => setFilterType(e.target.value as ZoneType | 'all')}
                      style={{ fontSize: 10, padding: '3px 6px', borderRadius: 6, background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer' }}>
                      <option value="all">All zones</option>
                      <option value="critical_cng">🔴 Critical CNG</option>
                      <option value="cng_restriction">🚫 CNG Only</option>
                      <option value="plantation">🌱 Plantation</option>
                      <option value="monitored">🟡 Monitored</option>
                      <option value="green">🟢 Green</option>
                    </select>
                    <select value={sortBy} onChange={e => setSortBy(e.target.value as 'urgency' | 'osi')}
                      style={{ fontSize: 10, padding: '3px 6px', borderRadius: 6, background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer' }}>
                      <option value="urgency">Sort: Urgency</option>
                      <option value="osi">Sort: OSI</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {displayZones.map((zone, i) => (
                    <ZoneCard key={zone.gridId} zone={zone} rank={i + 1} />
                  ))}
                  {result.zones.length > 60 && (
                    <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-3)', padding: 8 }}>
                      Showing top 60 of {result.zones.length} zones
                    </div>
                  )}
                </div>
              </div>

              {/* Execution info */}
              <div style={{ fontSize: 10, color: 'var(--text-3)', textAlign: 'center', padding: 4 }}>
                Classified {result.totalGrids} grids in {result.executionTimeMs}ms ·
                OSI threshold: {osiThreshold} · Survival threshold: {(survivalThreshold * 100).toFixed(0)}%
              </div>

            </motion.div>
          )}
        </AnimatePresence>

        {/* Placeholder when no results */}
        {!result && survivalData?.length && (
          <div style={{ background: 'rgba(255,145,0,0.05)', border: '1px dashed rgba(255,145,0,0.2)',
            borderRadius: 10, padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🚦</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.7 }}>
              Adjust the thresholds above and tap <strong style={{ color: '#ff9100' }}>Run Policy Classification</strong> to identify plantation and CNG restriction zones.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
