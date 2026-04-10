'use client';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { useAppStore } from '@/store/appStore';
import Map2D from '@/components/Map2D';
import { DataProcessor } from '@/utils/dataProcessor';
import { processAllGridsSurvival } from '@/engines/survivalModel';
import { runAlgorithm, ALGORITHM_META } from '@/engines/graphOptimizer';
import { GeoJSONData, GraphAlgorithm, AlgorithmResult, GridSurvivalData } from '@/types';
import Link from 'next/link';

// ─── Algorithm list ─────────────────────────────────────────────────────────
const ALGOS: GraphAlgorithm[] = ['greedy', 'pagerank', 'centrality', 'dijkstra', 'mst', 'maxcoverage'];

// ─── Tiny animated terminal log ──────────────────────────────────────────────
function TerminalLog({ lines }: { lines: string[] }) {
  return (
    <div style={{
      fontFamily: 'JetBrains Mono, Fira Code, monospace', fontSize: 10,
      background: '#020609', border: '1px solid #0f2d1a',
      borderRadius: 8, padding: '10px 12px', overflowY: 'auto', maxHeight: 140,
      display: 'flex', flexDirection: 'column', gap: 2,
    }}>
      {lines.map((l, i) => (
        <div key={i} style={{ color: l.startsWith('[ERR]') ? '#ff5983' : l.startsWith('[OK]') ? '#00f59d' : '#3d6b4a' }}>
          {l}
        </div>
      ))}
      <div style={{ color: '#1a4f2a' }}>█</div>
    </div>
  );
}

// ─── SVG Node Graph (mini visual graph representation of selected grids) ─────
function NodeGraph({ grids, result, algo }: {
  grids: GridSurvivalData[];
  result: AlgorithmResult | null;
  algo: GraphAlgorithm;
}) {
  const meta = ALGORITHM_META[algo];
  const W = 340, H = 260;

  const nodes = useMemo(() => {
    if (!grids.length) return [];
    const selectedSet = new Set(result?.selectedGridIds ?? []);

    // Sample up to 60 grids, project lat/lng to canvas coords
    const sample = grids.slice(0, 300);
    const minLat = Math.min(...sample.map(g => g.lat));
    const maxLat = Math.max(...sample.map(g => g.lat));
    const minLng = Math.min(...sample.map(g => g.lng));
    const maxLng = Math.max(...sample.map(g => g.lng));

    return sample.map(g => ({
      id: g.gridId,
      x: ((g.lng - minLng) / (maxLng - minLng || 1)) * (W - 30) + 15,
      y: ((maxLat - g.lat) / (maxLat - minLat || 1)) * (H - 30) + 15,
      osi: g.currentOSI,
      selected: selectedSet.has(g.gridId),
      survival: g.survivalProbability,
    }));
  }, [grids, result]);

  // Build edges between selected neighbours for MST / Dijkstra
  const edgePaths = useMemo(() => {
    if (!result?.edges?.length) return [];
    // Map lng/lat → canvas x/y using same projection
    const sample = grids.slice(0, 300);
    const minLat = Math.min(...sample.map(g => g.lat));
    const maxLat = Math.max(...sample.map(g => g.lat));
    const minLng = Math.min(...sample.map(g => g.lng));
    const maxLng = Math.max(...sample.map(g => g.lng));
    const project = (lng: number, lat: number) => ({
      x: ((lng - minLng) / (maxLng - minLng || 1)) * (W - 30) + 15,
      y: ((maxLat - lat) / (maxLat - minLat || 1)) * (H - 30) + 15,
    });
    return result.edges.slice(0, 60).map(edge => {
      const a = project(edge[0][0], edge[0][1]);
      const b = project(edge[1][0], edge[1][1]);
      return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
    });
  }, [grids, result]);

  return (
    <svg width={W} height={H} style={{ display: 'block', width: '100%', height: '100%' }}>
      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map(t => (
        <React.Fragment key={t}>
          <line x1={W * t} y1={0} x2={W * t} y2={H} stroke="#0a1a0e" strokeWidth={1} />
          <line x1={0} y1={H * t} x2={W} y2={H * t} stroke="#0a1a0e" strokeWidth={1} />
        </React.Fragment>
      ))}

      {/* Edges (MST / Dijkstra) */}
      {edgePaths.map((e, i) => (
        <motion.line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
          stroke={meta.color} strokeWidth={1} strokeOpacity={0.5}
          strokeDasharray="3 2"
          initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.5 }}
          transition={{ delay: i * 0.005, duration: 0.4 }} />
      ))}

      {/* Nodes */}
      {nodes.map((n, i) => (
        <motion.circle key={n.id}
          cx={n.x} cy={n.y}
          r={n.selected ? 4.5 : 1.8}
          fill={n.selected ? meta.color : `rgba(${n.osi > 800 ? '255,89,131' : n.osi > 750 ? '255,193,7' : '0,229,255'},0.35)`}
          stroke={n.selected ? meta.color : 'none'}
          strokeWidth={n.selected ? 1 : 0}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: n.selected ? 1 : 0.4 }}
          transition={{ delay: i * 0.001, type: 'spring', stiffness: 200 }}
        />
      ))}

      {/* Legend */}
      <text x={8} y={H - 8} fontSize={8} fill="#1f4a2a" fontFamily="monospace">
        {nodes.length} nodes · {nodes.filter(n => n.selected).length} selected
      </text>
    </svg>
  );
}

// ─── Radar comparison chart ───────────────────────────────────────────────────
function AlgoRadar({ results }: { results: Partial<Record<GraphAlgorithm, AlgorithmResult>> }) {
  const entries = Object.entries(results) as [GraphAlgorithm, AlgorithmResult][];
  if (entries.length < 2) return null;

  // Normalise metrics 0-100
  const maxTrees = Math.max(...entries.map(([, r]) => r.treesRequired));
  const maxCoverage = Math.max(...entries.map(([, r]) => r.coverageArea));
  const maxImpact = Math.max(...entries.map(([, r]) => r.impactScore));
  const maxOSI = Math.max(...entries.map(([, r]) => r.osiReductionPct));

  const axes = ['OSI Reduction', 'Coverage', 'Impact Score', 'Efficiency'];

  const data = axes.map(ax => {
    const obj: Record<string, number | string> = { ax };
    entries.forEach(([algo, r]) => {
      obj[algo] = ax === 'OSI Reduction'
        ? (r.osiReductionPct / (maxOSI || 1)) * 100
        : ax === 'Coverage'
          ? (r.coverageArea / (maxCoverage || 1)) * 100
          : ax === 'Impact Score'
            ? (r.impactScore / (maxImpact || 1)) * 100
            : // Efficiency = inverse of trees required (less = better)
              (1 - r.treesRequired / (maxTrees || 1)) * 100;
    });
    return obj;
  });

  return (
    <ResponsiveContainer width="100%" height={200}>
      <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
        <PolarGrid stroke="#0f2d1a" />
        <PolarAngleAxis dataKey="ax" tick={{ fill: '#3d5a7a', fontSize: 9, fontFamily: 'monospace' }} />
        {entries.map(([algo]) => (
          <Radar key={algo} name={algo} dataKey={algo}
            stroke={ALGORITHM_META[algo].color} fill={ALGORITHM_META[algo].color} fillOpacity={0.12} strokeWidth={1.5} />
        ))}
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ─── Comparison bar table ─────────────────────────────────────────────────────
function CompareBar({ label, results }: { label: string; results: [GraphAlgorithm, number][] }) {
  const max = Math.max(...results.map(([, v]) => v), 1);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 9, fontFamily: 'monospace', color: '#3d5a7a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{label}</div>
      {results.map(([algo, val]) => {
        const m = ALGORITHM_META[algo];
        return (
          <div key={algo} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 12, flexShrink: 0, width: 20 }}>{m.icon}</span>
            <div style={{ flex: 1, height: 8, background: '#0a1a0e', borderRadius: 4, overflow: 'hidden' }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${(val / max) * 100}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{ height: '100%', background: `linear-gradient(90deg, ${m.color}80, ${m.color})`, borderRadius: 4 }} />
            </div>
            <span style={{ fontSize: 9, fontFamily: 'monospace', color: m.color, minWidth: 50, textAlign: 'right' }}>{typeof val === 'number' && val > 999 ? val.toLocaleString() : val.toFixed(1)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function GreenLabImmersive() {
  const [currentData, setCurrentData] = useState<GeoJSONData | null>(null);
  const [survivalData, setSurvivalDataLocal] = useState<GridSurvivalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlgo, setSelectedAlgo] = useState<GraphAlgorithm>('greedy');
  const [topN, setTopN] = useState(30);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Partial<Record<GraphAlgorithm, AlgorithmResult>>>({});
  const [runAll, setRunAll] = useState(false);
  const [logLines, setLogLines] = useState<string[]>(['[SYS] Green Optimization Lab v3.0 booting...', '[SYS] Awaiting telemetry...']);
  const { selectedYear, mode, greenLabState, setGreenLabState } = useAppStore();

  const log = useCallback((line: string) => {
    setLogLines(prev => [...prev.slice(-40), line]);
  }, []);

  // ── Load data & compute survival ──────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoading(true);
      log('[SYS] Fetching satellite telemetry...');
      try {
        const year = mode === 'forecast' ? 2024 : 2023;
        const suffix = mode === 'forecast' ? 'Delhi_2024_OSI_Prediction.csv' : `Delhi_1km_Final_OSI_Professional_${year}.csv`;
        const r = await fetch(`/${suffix}`);
        if (!r.ok) throw new Error('CSV fetch failed');
        const text = await r.text();
        const geo = DataProcessor.convertToGeoJSON(DataProcessor.parseCSV(text));
        setCurrentData(geo);
        log(`[OK] Loaded ${geo.features.length} grid cells for ${year}`);
        log('[SYS] Computing survival probabilities...');
        await new Promise(res => setTimeout(res, 20));
        const sv = processAllGridsSurvival(geo);
        setSurvivalDataLocal(sv);
        useAppStore.getState().setSurvivalData(sv);
        log(`[OK] Survival engine complete — ${sv.length} grids scored`);
        log('[SYS] Graph builder ready. Select algorithm to proceed.');
      } catch (e) {
        log(`[ERR] ${e}`);
      } finally {
        setLoading(false);
      }
    })();
  }, [mode, log]);

  // ── Run a single algorithm ─────────────────────────────────────────────────
  const executeAlgorithm = useCallback(async (algo: GraphAlgorithm) => {
    if (!survivalData.length) return;
    const meta = ALGORITHM_META[algo];
    log(`[RUN] Executing ${meta.label} (topN=${topN})...`);
    setRunning(true);
    await new Promise(r => setTimeout(r, 30));
    const t0 = performance.now();
    const res = runAlgorithm(algo, survivalData, topN);
    const elapsed = Math.round(performance.now() - t0);
    setResults(prev => ({ ...prev, [algo]: res }));
    setGreenLabState({ primaryAlgorithm: algo, primaryResult: res });
    log(`[OK] ${meta.label} — ${res.selectedGridIds.length} zones · OSI −${res.osiReductionPct}% · ${elapsed}ms`);
    res.highlights.forEach(h => log(`  › ${h}`));
    setRunning(false);
  }, [survivalData, topN, log, setGreenLabState]);

  // ── Run all algorithms ─────────────────────────────────────────────────────
  const executeAll = useCallback(async () => {
    if (!survivalData.length) return;
    setRunAll(true);
    log('[SYS] Benchmarking all 6 algorithms...');
    const newResults: Partial<Record<GraphAlgorithm, AlgorithmResult>> = {};
    for (const algo of ALGOS) {
      const meta = ALGORITHM_META[algo];
      log(`[RUN] ${meta.label}...`);
      await new Promise(r => setTimeout(r, 20));
      const res = runAlgorithm(algo, survivalData, topN);
      newResults[algo] = res;
      log(`[OK]  ${meta.label} → score=${res.impactScore.toFixed(2)} · ${res.executionTimeMs}ms`);
    }
    setResults(newResults);
    setGreenLabState({ primaryResult: newResults[selectedAlgo] ?? null });
    log('[SYS] Benchmark complete. Radar chart updated.');
    setRunAll(false);
  }, [survivalData, topN, selectedAlgo, log, setGreenLabState]);

  const activeResult = results[selectedAlgo] ?? null;
  const topNPct = ((topN - 10) / (100 - 10)) * 100;
  const primaryMeta = ALGORITHM_META[selectedAlgo];

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      background: '#020b05', color: '#c8e6c9', overflow: 'hidden',
      fontFamily: 'Inter, sans-serif',
    }}>

      {/* ═══════════ SCANLINE OVERLAY ═══════════ */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 100,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.07) 2px, rgba(0,0,0,0.07) 4px)',
      }} />

      {/* ═══════════ HEADER ═══════════ */}
      <header style={{
        height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', borderBottom: '1px solid #0d2b14',
        background: 'rgba(0,10,2,0.95)', backdropFilter: 'blur(20px)', zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <motion.div whileHover={{ x: -3 }} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '5px 10px', borderRadius: 8,
              border: '1px solid #0d2b14', background: '#040f07',
              color: '#3d6b4a', fontSize: 11, fontFamily: 'monospace', cursor: 'pointer',
            }}>
              ← DASHBOARD
            </motion.div>
          </Link>
          <div style={{ borderLeft: '1px solid #0d2b14', paddingLeft: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#4caf50', letterSpacing: '0.05em' }}>
              🌿 GREEN OPTIMIZATION LAB
            </div>
            <div style={{ fontSize: 9, color: '#1f4a2a', fontFamily: 'monospace', letterSpacing: '0.2em', marginTop: 1 }}>
              GRAPH-THEORY ENVIRONMENTAL SIMULATION SYSTEM v3.0
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* Algo selector pills */}
          <div style={{ display: 'flex', gap: 4, background: '#040f07', border: '1px solid #0d2b14', borderRadius: 8, padding: 3 }}>
            {ALGOS.map(a => {
              const m = ALGORITHM_META[a];
              const isSel = selectedAlgo === a;
              return (
                <motion.button key={a} onClick={() => setSelectedAlgo(a)}
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  style={{
                    padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 16,
                    background: isSel ? `${m.color}22` : 'transparent',
                    outline: isSel ? `1px solid ${m.color}60` : 'none',
                    transition: 'all 0.15s',
                  }} title={m.label}>
                  {m.icon}
                </motion.button>
              );
            })}
          </div>

          {/* Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontFamily: 'monospace' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: loading ? '#ffc107' : '#4caf50' }}
              className={loading ? '' : 'breathe'} />
            <span style={{ color: loading ? '#ffc107' : '#4caf50' }}>
              {loading ? 'LOADING TELEMETRY' : `${survivalData.length} GRIDS READY`}
            </span>
          </div>
        </div>
      </header>

      {/* ═══════════ MAIN 3-PANEL LAYOUT ═══════════ */}
      <main style={{ flex: 1, display: 'grid', gridTemplateColumns: '280px 1fr 300px', gap: 0, minHeight: 0 }}>

        {/* ══ LEFT PANEL: CONTROL TOWER ══ */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 0,
          borderRight: '1px solid #0d2b14', background: '#020a04',
          overflowY: 'auto',
        }}>
          {/* Section header */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #0d2b14', fontSize: 10, color: '#1f4a2a', fontFamily: 'monospace', letterSpacing: '0.15em' }}>
            ⚙ CONTROL TOWER
          </div>

          {/* Algorithm cards */}
          <div style={{ padding: '10px 12px' }}>
            <div style={{ fontSize: 9, color: '#1f4a2a', fontFamily: 'monospace', letterSpacing: '0.15em', marginBottom: 8 }}>SELECT ALGORITHM</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {ALGOS.map(a => {
                const m = ALGORITHM_META[a];
                const isSel = selectedAlgo === a;
                const hasResult = !!results[a];
                return (
                  <motion.div key={a} onClick={() => setSelectedAlgo(a)}
                    whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                      borderRadius: 8, cursor: 'pointer',
                      background: isSel ? `${m.color}12` : 'transparent',
                      border: `1px solid ${isSel ? m.color + '40' : '#0d2b14'}`,
                      transition: 'all 0.15s',
                    }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{m.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: isSel ? m.color : '#4a7c59', lineHeight: 1 }}>
                        {m.label}
                      </div>
                      <div style={{ fontSize: 9, color: '#1f4a2a', fontFamily: 'monospace', marginTop: 2 }}>
                        {m.complexity}
                      </div>
                    </div>
                    {hasResult && (
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Selected algo info */}
          <div style={{ margin: '0 12px', borderRadius: 8, padding: '10px 12px', background: `${primaryMeta.color}08`, border: `1px solid ${primaryMeta.color}20` }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: primaryMeta.color, marginBottom: 4 }}>{primaryMeta.icon} {primaryMeta.label}</div>
            <div style={{ fontSize: 10, color: '#3d5a7a', lineHeight: 1.5 }}>{primaryMeta.description}</div>
            <div style={{ marginTop: 8, fontSize: 9, color: '#1f4a2a', fontFamily: 'monospace' }}>Best for: {primaryMeta.bestFor}</div>
          </div>

          {/* topN Slider */}
          <div style={{ padding: '12px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 9, color: '#1f4a2a', fontFamily: 'monospace', letterSpacing: '0.1em' }}>PLANTATION ZONES</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#4caf50', fontFamily: 'monospace' }}>{topN}</span>
            </div>
            <input type="range" min={10} max={100} step={5}
              value={topN} onChange={e => setTopN(+e.target.value)}
              className="slider-green" style={{ '--pct': `${topNPct}%` } as React.CSSProperties} />
          </div>

          {/* Run button */}
          <div style={{ padding: '0 12px 12px' }}>
            <motion.button
              whileHover={survivalData.length ? { scale: 1.02 } : {}}
              whileTap={survivalData.length ? { scale: 0.98 } : {}}
              onClick={() => executeAlgorithm(selectedAlgo)}
              disabled={!survivalData.length || running || runAll}
              style={{
                width: '100%', padding: '11px 0', borderRadius: 8,
                fontSize: 11, fontWeight: 800, fontFamily: 'monospace', letterSpacing: '0.1em',
                background: survivalData.length ? `linear-gradient(135deg, ${primaryMeta.color}25, ${primaryMeta.color}15)` : '#040f07',
                border: `1px solid ${survivalData.length ? primaryMeta.color + '50' : '#0d2b14'}`,
                color: survivalData.length ? primaryMeta.color : '#1f4a2a',
                cursor: survivalData.length && !running ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
              }}>
              {running ? '⏳ COMPUTING...' : `▶ RUN ${primaryMeta.label.toUpperCase()}`}
            </motion.button>

            <motion.button
              whileHover={survivalData.length ? { scale: 1.02 } : {}}
              whileTap={survivalData.length ? { scale: 0.98 } : {}}
              onClick={executeAll}
              disabled={!survivalData.length || running || runAll}
              style={{
                width: '100%', padding: '9px 0', borderRadius: 8, marginTop: 6,
                fontSize: 10, fontWeight: 800, fontFamily: 'monospace', letterSpacing: '0.1em',
                background: '#040f07', border: '1px solid #0d2b14',
                color: '#3d6b4a', cursor: survivalData.length && !runAll ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
              }}>
              {runAll ? '⏳ BENCHMARKING...' : '⚡ BENCHMARK ALL 6'}
            </motion.button>
          </div>

          {/* Terminal log */}
          <div style={{ padding: '0 12px 12px' }}>
            <div style={{ fontSize: 9, color: '#1f4a2a', fontFamily: 'monospace', letterSpacing: '0.15em', marginBottom: 6 }}>EXECUTION LOG</div>
            <TerminalLog lines={logLines} />
          </div>
        </div>

        {/* ══ CENTER: MAP + NODE GRAPH ══ */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, borderRight: '1px solid #0d2b14' }}>

          {/* Map (top 65%) */}
          <div style={{ flex: '0 0 65%', position: 'relative', borderBottom: '1px solid #0d2b14' }}>
            <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 20, display: 'flex', gap: 6 }}>
              <div style={{ padding: '3px 8px', borderRadius: 6, background: '#020a04e0', border: '1px solid #0d2b14', fontSize: 9, color: primaryMeta.color, fontFamily: 'monospace' }}>
                {primaryMeta.icon} {primaryMeta.label.toUpperCase()} ACTIVE
              </div>
              {activeResult && (
                <div style={{ padding: '3px 8px', borderRadius: 6, background: '#020a04e0', border: '1px solid #0d2b14', fontSize: 9, color: '#4caf50', fontFamily: 'monospace' }}>
                  {activeResult.selectedGridIds.length} ZONES SELECTED
                </div>
              )}
            </div>
            {currentData ? (
              <Map2D data={currentData} selectedYear={selectedYear} mode={mode} />
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1f4a2a', fontFamily: 'monospace', fontSize: 12 }}>
                LOADING TELEMETRY...
              </div>
            )}
          </div>

          {/* Node Graph (bottom 35%) */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: '#020a04' }}>
            <div style={{ padding: '8px 16px', borderBottom: '1px solid #0d2b14', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 9, color: '#1f4a2a', fontFamily: 'monospace', letterSpacing: '0.15em' }}>
                GRAPH TOPOLOGY · NODE NETWORK VISUALIZER
              </span>
              <span style={{ fontSize: 9, color: primaryMeta.color, fontFamily: 'monospace' }}>
                {primaryMeta.icon} {primaryMeta.complexity}
              </span>
            </div>
            <div style={{ flex: 1, minHeight: 0, padding: 8 }}>
              <NodeGraph grids={survivalData} result={activeResult} algo={selectedAlgo} />
            </div>
          </div>
        </div>

        {/* ══ RIGHT PANEL: DATA OBSERVATORY ══ */}
        <div style={{
          display: 'flex', flexDirection: 'column', background: '#020a04',
          overflowY: 'auto',
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #0d2b14', fontSize: 10, color: '#1f4a2a', fontFamily: 'monospace', letterSpacing: '0.15em' }}>
            📡 DATA OBSERVATORY
          </div>

          {activeResult ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* KPI tiles */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {[
                  { label: 'ZONES', value: activeResult.selectedGridIds.length, unit: 'grids', color: primaryMeta.color },
                  { label: 'TREES', value: activeResult.treesRequired.toLocaleString(), unit: 'planted', color: '#00f59d' },
                  { label: 'OSI REDUCTION', value: `−${activeResult.osiReductionPct}%`, unit: 'estimated', color: '#ff5983' },
                  { label: 'EXEC TIME', value: `${activeResult.executionTimeMs}ms`, unit: 'CPU', color: '#b388ff' },
                ].map(k => (
                  <div key={k.label} style={{
                    padding: '10px 10px', borderRadius: 8,
                    background: `${k.color}08`, border: `1px solid ${k.color}20`,
                  }}>
                    <div style={{ fontSize: 8, color: '#1f4a2a', fontFamily: 'monospace', letterSpacing: '0.15em' }}>{k.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: k.color, fontFamily: 'JetBrains Mono,monospace', lineHeight: 1.2, marginTop: 2 }}>{k.value}</div>
                    <div style={{ fontSize: 8, color: '#3d5a7a', marginTop: 2 }}>{k.unit}</div>
                  </div>
                ))}
              </div>

              {/* Algorithm notes */}
              <div style={{ background: '#040f07', border: '1px solid #0d2b14', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 9, color: '#1f4a2a', fontFamily: 'monospace', letterSpacing: '0.1em', marginBottom: 6 }}>ALGORITHM REPORT</div>
                {activeResult.highlights.map((h, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                    <span style={{ color: primaryMeta.color, fontSize: 10, flexShrink: 0 }}>›</span>
                    <span style={{ fontSize: 10, color: '#4a7c59', lineHeight: 1.4 }}>{h}</span>
                  </div>
                ))}
              </div>

              {/* Coverage bar */}
              <div style={{ background: '#040f07', border: '1px solid #0d2b14', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 9, color: '#1f4a2a', fontFamily: 'monospace', letterSpacing: '0.1em' }}>COVERAGE AREA</span>
                  <span style={{ fontSize: 9, color: primaryMeta.color, fontFamily: 'monospace' }}>{activeResult.coverageArea} km²</span>
                </div>
                <div style={{ height: 6, background: '#0a1a0e', borderRadius: 3, overflow: 'hidden' }}>
                  <motion.div initial={{ width: 0 }}
                    animate={{ width: `${Math.min((activeResult.coverageArea / (survivalData.length || 1)) * 100, 100)}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    style={{ height: '100%', background: `linear-gradient(90deg, ${primaryMeta.color}60, ${primaryMeta.color})`, borderRadius: 3 }} />
                </div>
              </div>

            </motion.div>
          ) : (
            <div style={{ padding: 20, textAlign: 'center', color: '#1f4a2a', fontFamily: 'monospace', fontSize: 11, lineHeight: 1.8 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔬</div>
              <div>SELECT ALGORITHM</div>
              <div>AND RUN TO SEE</div>
              <div>ANALYSIS OUTPUT</div>
            </div>
          )}

          {/* ── Benchmark radar (when ≥2 results exist) ── */}
          {Object.keys(results).length >= 2 && (
            <div style={{ borderTop: '1px solid #0d2b14', padding: '10px 12px' }}>
              <div style={{ fontSize: 9, color: '#1f4a2a', fontFamily: 'monospace', letterSpacing: '0.15em', marginBottom: 4 }}>
                ◈ BENCHMARK RADAR
              </div>
              <AlgoRadar results={results} />
            </div>
          )}

          {/* ── Benchmark comparison bars ── */}
          {Object.keys(results).length >= 2 && (
            <div style={{ borderTop: '1px solid #0d2b14', padding: '10px 12px' }}>
              <div style={{ fontSize: 9, color: '#1f4a2a', fontFamily: 'monospace', letterSpacing: '0.15em', marginBottom: 10 }}>◈ METRIC COMPARISON</div>
              <CompareBar label="OSI REDUCTION (%)"
                results={ALGOS.filter(a => results[a]).map(a => [a, results[a]!.osiReductionPct])} />
              <CompareBar label="IMPACT SCORE"
                results={ALGOS.filter(a => results[a]).map(a => [a, results[a]!.impactScore])} />
              <CompareBar label="TREES REQUIRED (÷1000)"
                results={ALGOS.filter(a => results[a]).map(a => [a, results[a]!.treesRequired / 1000])} />
            </div>
          )}
        </div>
      </main>

      {/* ═══════════ STATUS BAR ═══════════ */}
      <footer style={{
        height: 24, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', borderTop: '1px solid #0d2b14',
        background: '#010804', fontSize: 8, fontFamily: 'monospace',
        color: '#1f4a2a', letterSpacing: '0.15em',
      }}>
        <span>UODP-GREENLAB · DELHI NCR · 1KM² GRID</span>
        <span style={{ color: primaryMeta.color }}>{primaryMeta.icon} {primaryMeta.label.toUpperCase()} — {primaryMeta.complexity}</span>
        <span>SATELLITE UPLINK: STABLE · v3.0.0</span>
      </footer>
    </div>
  );
}
