'use client';
import React, { useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/appStore';
import { runAlgorithm, ALGORITHM_META } from '@/engines/graphOptimizer';
import { GraphAlgorithm, AlgorithmResult } from '@/types';

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function AlgoCard({ algo, isActive, onClick }: {
  algo: GraphAlgorithm;
  isActive: boolean;
  onClick: () => void;
}) {
  const m = ALGORITHM_META[algo];
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 12px', borderRadius: 10, cursor: 'pointer', width: '100%',
        background: isActive ? `${m.color}18` : 'var(--card)',
        border: `1px solid ${isActive ? m.color + '55' : 'var(--border)'}`,
        transition: 'all .18s',
        boxShadow: isActive ? `0 0 14px ${m.color}22` : 'none',
      }}
    >
      <span style={{ fontSize: 18, flexShrink: 0 }}>{m.icon}</span>
      <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: isActive ? m.color : 'var(--text-1)', lineHeight: 1.2 }}>
          {m.label}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2, lineHeight: 1.4 }}>
          {m.bestFor}
        </div>
      </div>
      <div style={{
        fontSize: 9, fontFamily: 'monospace', color: m.color, opacity: 0.75,
        padding: '2px 6px', borderRadius: 4, background: `${m.color}15`,
        border: `1px solid ${m.color}22`, flexShrink: 0,
      }}>
        {m.complexity}
      </div>
    </motion.button>
  );
}

function ResultKPIs({ result, color }: { result: AlgorithmResult; color: string }) {
  const m = ALGORITHM_META[result.algorithm];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {[
        { label: 'Grids Selected', value: String(result.selectedGridIds.length), sub: `top ${result.selectedGridIds.length} zones`, color },
        { label: 'Trees Required', value: result.treesRequired.toLocaleString(), sub: '3,200 trees/km²', color: '#00f59d' },
        { label: 'OSI Reduction', value: `−${result.osiReductionPct}%`, sub: 'estimated impact', color: '#ff5983' },
        { label: 'Coverage Area', value: `${result.coverageArea} km²`, sub: `in ${result.executionTimeMs}ms`, color: '#b388ff' },
      ].map(k => (
        <div key={k.label} className="card" style={{ padding: '12px 10px', borderColor: `${k.color}18` }}>
          <div className="label" style={{ fontSize: 9, marginBottom: 5 }}>{k.label}</div>
          <div className="mono display" style={{ fontSize: 18, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
          <div className="text-3" style={{ fontSize: 10, marginTop: 4 }}>{k.sub}</div>
        </div>
      ))}
    </div>
  );
}

function CompareTable({ primary, compare }: { primary: AlgorithmResult; compare: AlgorithmResult }) {
  const pm = ALGORITHM_META[primary.algorithm];
  const cm = ALGORITHM_META[compare.algorithm];
  const rows = [
    { label: 'Trees Required', pv: primary.treesRequired.toLocaleString(),     cv: compare.treesRequired.toLocaleString(),     winner: primary.treesRequired < compare.treesRequired ? 'p' : 'c' },
    { label: 'OSI Reduction %', pv: `${primary.osiReductionPct}%`,               cv: `${compare.osiReductionPct}%`,               winner: primary.osiReductionPct > compare.osiReductionPct ? 'p' : 'c' },
    { label: 'Coverage (km²)', pv: String(primary.coverageArea),               cv: String(compare.coverageArea),               winner: primary.coverageArea > compare.coverageArea ? 'p' : 'c' },
    { label: 'Impact Score',   pv: primary.impactScore.toFixed(2),              cv: compare.impactScore.toFixed(2),              winner: primary.impactScore > compare.impactScore ? 'p' : 'c' },
    { label: 'Exec Time (ms)', pv: String(primary.executionTimeMs),             cv: String(compare.executionTimeMs),             winner: primary.executionTimeMs < compare.executionTimeMs ? 'p' : 'c' },
  ];

  const pWins = rows.filter(r => r.winner === 'p').length;
  const cWins = rows.filter(r => r.winner === 'c').length;
  const winner = pWins >= cWins ? primary.algorithm : compare.algorithm;
  const winnerMeta = ALGORITHM_META[winner];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Winner badge */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        style={{ background: `${winnerMeta.color}15`, border: `1px solid ${winnerMeta.color}40`,
          borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 20 }}>🏆</span>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: winnerMeta.color }}>
            {winnerMeta.icon} {winnerMeta.label} wins ({pWins >= cWins ? pWins : cWins}/{rows.length} metrics)
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>
            {winnerMeta.bestFor}
          </div>
        </div>
      </motion.div>

      {/* Table */}
      <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: 'rgba(0,0,0,0.4)', padding: '8px 12px' }}>
          <div className="label" style={{ fontSize: 9 }}>METRIC</div>
          <div className="label" style={{ fontSize: 9, textAlign: 'center', color: pm.color }}>{pm.icon} {pm.label}</div>
          <div className="label" style={{ fontSize: 9, textAlign: 'center', color: cm.color }}>{cm.icon} {cm.label}</div>
        </div>
        {rows.map((r, i) => (
          <div key={r.label} style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
            padding: '8px 12px', borderTop: '1px solid var(--border)',
            background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{r.label}</div>
            <div className="mono" style={{ fontSize: 12, fontWeight: 700, textAlign: 'center',
              color: r.winner === 'p' ? pm.color : 'var(--text-3)' }}>
              {r.winner === 'p' && <span style={{ marginRight: 4 }}>✓</span>}{r.pv}
            </div>
            <div className="mono" style={{ fontSize: 12, fontWeight: 700, textAlign: 'center',
              color: r.winner === 'c' ? cm.color : 'var(--text-3)' }}>
              {r.winner === 'c' && <span style={{ marginRight: 4 }}>✓</span>}{r.cv}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AlgorithmHighlights({ result }: { result: AlgorithmResult }) {
  const m = ALGORITHM_META[result.algorithm];
  return (
    <div style={{ background: `${m.color}08`, border: `1px solid ${m.color}22`,
      borderRadius: 10, padding: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: m.color, marginBottom: 8 }}>
        {m.icon} {m.label} — Algorithm Notes
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8 }}>{m.description}</div>
      {result.highlights.map((h, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          <span style={{ color: m.color, flexShrink: 0 }}>›</span>
          <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{h}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Panel
// ─────────────────────────────────────────────

export default function GreenLabPanel() {
  const { survivalData, greenLabState, setGreenLabState } = useAppStore();
  const { primaryAlgorithm, compareAlgorithm, primaryResult, compareResult,
    topN, compareMode, isRunning } = greenLabState;

  const allAlgos: GraphAlgorithm[] = ['greedy', 'pagerank', 'centrality', 'dijkstra', 'mst', 'maxcoverage'];

  const run = useCallback(async () => {
    if (!survivalData?.length) return;
    setGreenLabState({ isRunning: true });
    // Yield to browser to allow UI update before heavy computation
    await new Promise(r => setTimeout(r, 30));
    const primary = runAlgorithm(primaryAlgorithm, survivalData, topN);
    const compare = compareMode && compareAlgorithm
      ? runAlgorithm(compareAlgorithm, survivalData, topN)
      : null;
    setGreenLabState({ primaryResult: primary, compareResult: compare, isRunning: false });
  }, [survivalData, primaryAlgorithm, compareAlgorithm, compareMode, topN, setGreenLabState]);

  const topNPct = ((topN - 10) / (100 - 10)) * 100;
  const primaryMeta = ALGORITHM_META[primaryAlgorithm];

  return (
    <div className="panel" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      border: '1px solid rgba(76,175,80,0.15)' }}>

      {/* Header */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>🌳</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>Green Optimization Lab</div>
            <div className="text-3" style={{ fontSize: 11, marginTop: 1 }}>
              Graph algorithm comparison for optimal tree placement
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* No survival data warning */}
        {!survivalData?.length && (
          <div style={{ background: 'rgba(76,175,80,0.06)', border: '1px solid rgba(76,175,80,0.2)',
            borderRadius: 12, padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🌱</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#4caf50', marginBottom: 6 }}>Survival AI Required</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>
              Switch to <strong style={{ color: '#00f59d' }}>🌱 Survival AI</strong> tab first to compute survival data, then return here to run graph algorithms.
            </div>
          </div>
        )}

        {/* Algorithm Selection */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>⚙️</span> Primary Algorithm
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {allAlgos.map(a => (
              <AlgoCard key={a} algo={a} isActive={primaryAlgorithm === a}
                onClick={() => setGreenLabState({ primaryAlgorithm: a })} />
            ))}
          </div>
        </div>

        {/* Compare Mode Toggle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>🔬</span> Compare Mode
            </div>
            <button onClick={() => setGreenLabState({ compareMode: !compareMode })}
              style={{
                padding: '4px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                background: compareMode ? 'rgba(0,229,255,0.15)' : 'rgba(255,255,255,0.05)',
                color: compareMode ? 'var(--cyan)' : 'var(--text-3)',
                border: `1px solid ${compareMode ? 'rgba(0,229,255,0.3)' : 'var(--border)'}`,
                transition: 'all .18s',
              }}>
              {compareMode ? '● ON' : '○ OFF'}
            </button>
          </div>

          <AnimatePresence>
            {compareMode && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>Compare against:</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
                  {allAlgos.filter(a => a !== primaryAlgorithm).map(a => {
                    const cm = ALGORITHM_META[a];
                    const isActive = compareAlgorithm === a;
                    return (
                      <button key={a} onClick={() => setGreenLabState({ compareAlgorithm: a })}
                        style={{
                          padding: '7px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
                          background: isActive ? `${cm.color}18` : 'var(--card)',
                          border: `1px solid ${isActive ? cm.color + '50' : 'var(--border)'}`,
                          color: isActive ? cm.color : 'var(--text-3)',
                          fontSize: 16, transition: 'all .15s',
                        }} title={cm.label}>
                        {cm.icon}
                      </button>
                    );
                  })}
                </div>
                {compareAlgorithm && (
                  <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 6 }}>
                    Comparing: <span style={{ color: primaryMeta.color }}>{primaryMeta.icon} {primaryMeta.label}</span>
                    {' vs '}
                    <span style={{ color: ALGORITHM_META[compareAlgorithm].color }}>
                      {ALGORITHM_META[compareAlgorithm].icon} {ALGORITHM_META[compareAlgorithm].label}
                    </span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Top N Slider */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span className="label" style={{ fontSize: 11 }}>Plantation Zones</span>
            <span className="mono display" style={{ fontSize: 20, fontWeight: 800, color: '#4caf50' }}>{topN}</span>
          </div>
          <input type="range" min={10} max={100} step={5}
            value={topN}
            onChange={e => setGreenLabState({ topN: +e.target.value })}
            className="slider-green"
            style={{ '--pct': `${topNPct}%` } as React.CSSProperties}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            {['10', '55', '100'].map(l => <span key={l} className="mono text-3" style={{ fontSize: 10 }}>{l} grids</span>)}
          </div>
        </div>

        {/* Run Button */}
        <motion.button
          whileHover={survivalData?.length ? { scale: 1.01 } : {}}
          whileTap={survivalData?.length ? { scale: 0.99 } : {}}
          onClick={run}
          disabled={!survivalData?.length || isRunning}
          className="btn"
          style={{
            width: '100%', padding: '13px 0', fontSize: 13, fontWeight: 700,
            background: survivalData?.length
              ? 'linear-gradient(135deg, rgba(76,175,80,0.2), rgba(0,245,157,0.15))'
              : 'rgba(255,255,255,0.04)',
            border: `1px solid ${survivalData?.length ? 'rgba(76,175,80,0.4)' : 'var(--border)'}`,
            color: survivalData?.length ? '#4caf50' : 'var(--text-3)',
            borderRadius: 10, cursor: survivalData?.length ? 'pointer' : 'not-allowed',
            transition: 'all .2s',
          }}>
          {isRunning
            ? '⏳ Running Algorithm…'
            : survivalData?.length
              ? `🚀 Run ${compareMode && compareAlgorithm ? 'Comparison' : primaryMeta.label}`
              : '⏳ Load Survival AI tab first'}
        </motion.button>

        {/* Results */}
        <AnimatePresence>
          {primaryResult && (
            <motion.div key="results"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Divider */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', marginBottom: 12 }}>
                  📊 Results
                </div>

                {/* KPIs */}
                <ResultKPIs result={primaryResult} color={primaryMeta.color} />
              </div>

              {/* Comparison table */}
              {compareMode && compareResult && (
                <CompareTable primary={primaryResult} compare={compareResult} />
              )}

              {/* Algorithm notes */}
              <AlgorithmHighlights result={primaryResult} />

              {/* Compare algo notes */}
              {compareMode && compareResult && (
                <AlgorithmHighlights result={compareResult} />
              )}

            </motion.div>
          )}
        </AnimatePresence>

        {/* Info blurb when no results yet */}
        {!primaryResult && survivalData?.length && (
          <div style={{ background: 'rgba(76,175,80,0.05)', border: '1px dashed rgba(76,175,80,0.2)',
            borderRadius: 10, padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🔬</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.7 }}>
              Select an algorithm above and tap <strong style={{ color: '#4caf50' }}>Run</strong> to compute optimal plantation zones using graph theory.
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
