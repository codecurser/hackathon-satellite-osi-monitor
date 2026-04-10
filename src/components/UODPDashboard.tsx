'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TimeControl from '@/components/TimeControl';
import Map2D from '@/components/Map2D';
import Map3D from '@/components/Map3D';
import AnalyticsPanel from '@/components/AnalyticsPanel';
import TreeSurvivalPanel from '@/components/TreeSurvivalPanel';
import BudgetPanel from '@/components/BudgetPanel';
import SimulationPanel from '@/components/SimulationPanel';
import GreenLabPanel from '@/components/GreenLabPanel';
import PolicyPanel from '@/components/PolicyPanel';
import EventSimulatorPanel from '@/components/EventSimulatorPanel';
import { useAppStore } from '@/store/appStore';
import { applyEventsToGrids } from '@/engines/eventEngine';
import Link from 'next/link';
import { DataProcessor } from '@/utils/dataProcessor';
import { GeoJSONData, YearlyData, EngineTab } from '@/types';

type Tab = { id: EngineTab; label: string; icon: string; color: string; tagClass: string; desc: string };

const TABS: Tab[] = [
  { id: 'osi',        label: 'Stress Map',  icon: '🌫️', color: '#00e5ff', tagClass: 'tag-cyan',   desc: 'Satellite O₂ stress index across Delhi NCR' },
  { id: 'survival',   label: 'Survival AI', icon: '🌱', color: '#00f59d', tagClass: 'tag-green',  desc: 'AI-predicted sapling survival probability per grid' },
  { id: 'budget',     label: 'Optimizer',   icon: '💰', color: '#ffc107', tagClass: 'tag-amber',  desc: 'Greedy knapsack: max-impact grids within budget' },
  { id: 'roi',        label: 'ROI Engine',  icon: '📊', color: '#448aff', tagClass: 'tag-cyan',   desc: 'CO₂, O₂ & OSI return per ₹ invested' },
  { id: 'simulation', label: 'Simulator',   icon: '🔮', color: '#b388ff', tagClass: 'tag-purple', desc: 'Logistic growth model projecting impact to 2028' },
  { id: 'greenlab',   label: 'Green Lab',   icon: '🌳', color: '#4caf50', tagClass: 'tag-green',  desc: 'Graph algorithm lab: optimal tree placement via Greedy, PageRank, MST & more' },
  { id: 'policy',     label: 'Policy',      icon: '🚦', color: '#ff9100', tagClass: 'tag-amber',  desc: 'Zone classifier: Plantation vs CNG-only restriction per grid' },
  { id: 'events',     label: 'Events',      icon: '📅', color: '#10b981', tagClass: 'tag-emerald', desc: 'Plantation event simulator: schedule real-world activities to see dynamic impact' },
];

export default function UODPDashboard() {
  const [yearlyData, setYearlyData]    = useState<YearlyData>({});
  const [currentData, setCurrentData]  = useState<GeoJSONData | null>(null);
  const [prevData, setPrevData]        = useState<GeoJSONData | null>(null);
  const [loading, setLoading]          = useState(true);
  const [error, setError]              = useState<string | null>(null);
  const [videoReady, setVideoReady]    = useState(false);

  const { 
    selectedYear, mode, viewMode, activeEngine, setActiveEngine,
    optimizationResult, setLoading: setStoreLoading, setError: setStoreError, plantationEvents 
  } = useAppStore();

  /* ── Data loading ── */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true); setStoreLoading(true); setError(null); setStoreError(null);
        const loaded: YearlyData = {};
        for (const y of [2019, 2020, 2021, 2022, 2023]) {
          try {
            const r = await fetch(`/Delhi_1km_Final_OSI_Professional_${y}.csv`);
            if (r.ok) loaded[y] = DataProcessor.convertToGeoJSON(DataProcessor.parseCSV(await r.text()));
          } catch { /* skip year */ }
        }
        try {
          const r = await fetch('/Delhi_2024_OSI_Prediction.csv');
          if (r.ok) loaded[2024] = DataProcessor.convertToGeoJSON(DataProcessor.parseCSV(await r.text()));
        } catch { /* skip */ }
        setYearlyData(loaded);
        const init = mode === 'forecast' ? 2024 : 2023;
        if (loaded[init]) {
          setCurrentData(loaded[init]);
          if (mode === 'historical' && loaded[init - 1]) setPrevData(loaded[init - 1]);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load data';
        setError(msg); setStoreError(msg);
      } finally { setLoading(false); setStoreLoading(false); }
    })();
  }, [mode, setStoreLoading, setStoreError]);

  const handleYearChange = useCallback((year: number) => {
    if (yearlyData[year]) {
      setCurrentData(yearlyData[year]);
      setPrevData(mode === 'historical' && yearlyData[year - 1] ? yearlyData[year - 1] : null);
    }
  }, [yearlyData, mode]);

  useEffect(() => {
    handleYearChange(mode === 'forecast' ? 2024 : selectedYear);
  }, [selectedYear, mode, handleYearChange]);

  /* --- APPLY PLANTATION EVENTS --- */
  const impactedData = useMemo(() => {
    if (!currentData || !plantationEvents.length) return currentData;
    
    const newFeatures = currentData.features.map(feature => {
      const gridId = feature.properties['system:index'];
      const results = applyEventsToGrids([{
        gridId,
        currentNDVI: feature.properties.NDVI,
        currentOSI: feature.properties.OSI,
        currentAOD: feature.properties.AOD,
        currentTemp: feature.properties.Temp,
        // minimal fields for the logic
        coordinates: [0,0], lat: 0, lng: 0, survivalProbability: 0, expectedNDVIGain: 0, stabilizationYears: 0, suitabilityScore: 0
      } as any], plantationEvents, selectedYear);

      const res = results[0];
      return {
        ...feature,
        properties: {
          ...feature.properties,
          NDVI: res.currentNDVI,
          OSI: res.currentOSI
        }
      };
    });

    return { ...currentData, features: newFeatures };
  }, [currentData, plantationEvents, selectedYear]);

  /* ── Top urgent grids ── */
  const urgentGrids = useMemo(() => {
    if (!currentData?.features) return [];
    return currentData.features
      .filter(f => f.properties?.OSI >= 780)
      .sort((a, b) => (b.properties.OSI || 0) - (a.properties.OSI || 0))
      .slice(0, 8)
      .map((f, i) => {
        const coords = f.geometry.coordinates[0] as [number, number][];
        const lng = coords.reduce((s, c) => s + (c[0] || 0), 0) / coords.length;
        const lat = coords.reduce((s, c) => s + (c[1] || 0), 0) / coords.length;
        const osi = mode === 'forecast' ? (f.properties.Predicted_OSI_2024 || f.properties.OSI) : f.properties.OSI;
        return { rank: i + 1, lat, lng, osi, ndvi: f.properties.NDVI, aod: f.properties.AOD,
          risk: osi >= 800 ? 'Critical' : 'High' };
      });
  }, [currentData, mode]);

  const activeTab = TABS.find(t => t.id === activeEngine)!;

  /* ── Right panel ── */
  const RightPanel = useCallback(() => {
    if (!currentData) return null;
    if (activeEngine === 'survival')  return <TreeSurvivalPanel data={currentData} />;
    if (activeEngine === 'budget' || activeEngine === 'roi') return <BudgetPanel data={currentData} />;
    if (activeEngine === 'simulation') return <SimulationPanel data={impactedData} />;
    if (activeEngine === 'greenlab')   return <GreenLabPanel />;
    if (activeEngine === 'policy')     return <PolicyPanel data={impactedData} />;
    if (activeEngine === 'events')     return <EventSimulatorPanel />;
    return <AnalyticsPanel data={impactedData} selectedYear={selectedYear} previousYearData={prevData || undefined} mode={mode} />;
  }, [currentData, activeEngine, selectedYear, prevData, mode, impactedData]);

  /* ── Loading ── */
  if (loading) return (
    <div style={{ height: '100vh', background: '#080d18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24 }}>
      <div style={{ position: 'relative', width: 96, height: 96 }}>
        <div className="spin-cw" style={{ position: 'absolute', inset: 0, border: '2px solid transparent', borderTopColor: '#00e5ff', borderRadius: '50%' }} />
        <div className="spin-ccw" style={{ position: 'absolute', inset: 10, border: '2px solid transparent', borderTopColor: '#00f59d', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', inset: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🌍</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div className="display gradient-cyan" style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>UODP 2.0</div>
        <div className="label" style={{ letterSpacing: '0.2em' }}>Loading satellite telemetry…</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16 }}>
          {[0,1,2,3,4].map(i => (
            <div key={i} className="breathe" style={{ width: 6, height: 6, borderRadius: '50%', background: '#00e5ff', animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
      </div>
    </div>
  );

  /* ── Error ── */
  if (error) return (
    <div style={{ height: '100vh', background: '#080d18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="panel" style={{ padding: 32, maxWidth: 360, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--red)', marginBottom: 8 }}>Data Load Failed</div>
        <div className="text-2" style={{ fontSize: 13, marginBottom: 20 }}>{error}</div>
        <button className="btn btn-cyan" onClick={() => window.location.reload()}>Retry</button>
      </div>
    </div>
  );

  /* ── MAIN ── */
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden', position: 'relative' }}>

      {/* Video background */}
      <video autoPlay muted loop playsInline onCanPlay={() => setVideoReady(true)}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
          opacity: videoReady ? 0.06 : 0, transition: 'opacity 2s ease', pointerEvents: 'none', zIndex: 0 }}>
        <source src="/bg-video.mp4" type="video/mp4" />
      </video>

      {/* Grid overlay */}
      <div className="grid-bg" style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }} />

      {/* Scan line */}
      <div className="scan-line" style={{
        position: 'absolute', left: 0, right: 0, height: 2, zIndex: 5, pointerEvents: 'none',
        background: 'linear-gradient(90deg, transparent, rgba(0,229,255,0.4), rgba(0,245,157,0.3), transparent)'
      }} />

      {/* Corner glow */}
      <div style={{ position: 'absolute', top: 0, right: 0, width: 500, height: 500, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse at top right, rgba(0,229,255,0.04), transparent 60%)' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: 400, height: 400, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse at bottom left, rgba(179,136,255,0.04), transparent 60%)' }} />

      {/* Top glow line */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, zIndex: 10,
        background: 'linear-gradient(90deg, transparent, #00e5ff, #00f59d, transparent)', opacity: 0.5 }} />

      {/* ═══════════════════════ HEADER ═══════════════════════ */}
      <header style={{
        flexShrink: 0, height: 60, position: 'relative', zIndex: 20,
        background: 'rgba(8,13,24,0.94)', backdropFilter: 'blur(24px)',
        borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'stretch'
      }}>
        <div style={{ maxWidth: 1920, width: '100%', margin: '0 auto', padding: '0 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>

          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <div style={{ position: 'relative', width: 36, height: 36 }}>
              <div className="spin-cw" style={{ position: 'absolute', inset: 0, border: '1.5px solid transparent',
                borderTopColor: '#00e5ff', borderRadius: '50%' }} />
              <div style={{ position: 'absolute', inset: 4, background: 'rgba(0,229,255,0.08)',
                border: '1px solid rgba(0,229,255,0.2)', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🛰️</div>
            </div>
            <div>
              <div className="display gradient-cyan" style={{ fontSize: 15, fontWeight: 800, lineHeight: 1 }}>
                Urban Climate Intelligence
              </div>
              <div className="mono text-3" style={{ fontSize: 10, letterSpacing: '0.18em', marginTop: 2 }}>
                UODP 2.0 · DELHI NCR · 1KM² GRID
              </div>
            </div>
          </div>

          {/* Engine Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.5)',
            border: '1px solid var(--border)', borderRadius: 12, padding: 4 }}>
            {TABS.map(tab => {
              const isActive = activeEngine === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveEngine(tab.id)} title={tab.desc}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 600, transition: 'all .2s',
                    background: isActive ? `rgba(${tab.color === '#00e5ff' ? '0,229,255' : tab.color === '#00f59d' ? '0,245,157' : tab.color === '#ffc107' ? '255,193,7' : tab.color === '#448aff' ? '68,138,255' : '179,136,255'},0.18)` : 'transparent',
                    border: isActive ? `1px solid rgba(${tab.color === '#00e5ff' ? '0,229,255' : tab.color === '#00f59d' ? '0,245,157' : tab.color === '#ffc107' ? '255,193,7' : tab.color === '#448aff' ? '68,138,255' : '179,136,255'},0.35)` : '1px solid transparent',
                    color: isActive ? tab.color : 'var(--text-3)',
                    boxShadow: isActive ? `0 0 16px rgba(${tab.color === '#00e5ff' ? '0,229,255' : tab.color === '#00f59d' ? '0,245,157' : tab.color === '#ffc107' ? '255,193,7' : tab.color === '#448aff' ? '68,138,255' : '179,136,255'},0.15)` : 'none',
                  }}>
                  <span style={{ fontSize: 14 }}>{tab.icon}</span>
                  <span style={{ display: 'none' }} className="xl:inline">{tab.label}</span>
                  <span style={{ display: 'inline' }}>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <Link href="/green-lab" style={{ textDecoration: 'none' }}>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 16px', borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(76,175,80,0.2), rgba(0,229,255,0.1))',
                border: '1px solid rgba(76,175,80,0.4)',
                cursor: 'pointer'
              }}>
              <span style={{ fontSize: 16 }}>🧪</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#4caf50' }}>IMMERSIVE LAB</span>
            </motion.div>
          </Link>

          <Link href="/urban-plan" style={{ textDecoration: 'none' }}>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 16px', borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(74,222,128,0.18), rgba(96,165,250,0.1))',
                border: '1px solid rgba(74,222,128,0.4)',
                cursor: 'pointer'
              }}>
              <span style={{ fontSize: 16 }}>🌿</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#4ade80' }}>URBAN PLANNER</span>
            </motion.div>
          </Link>

          {/* Right stats */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
            {/* Live badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20,
              background: 'var(--green-a10)', border: '1px solid var(--green-a20)' }}>
              <div className="breathe" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)' }} />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--green)' }}>LIVE</span>
            </div>
            {/* Year + mode */}
            <div style={{ textAlign: 'right' }}>
              <div className="display" style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1 }}>
                {selectedYear}
                {mode === 'forecast' && (
                  <span className="tag tag-purple" style={{ fontSize: 10, marginLeft: 8, verticalAlign: 'middle' }}>AI</span>
                )}
              </div>
              <div className="mono text-3" style={{ fontSize: 10, marginTop: 2 }}>
                {currentData?.features.length || 0} grids loaded
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════════════════ SUB-BAR ═══════════════════════ */}
      <div style={{ flexShrink: 0, height: 36, position: 'relative', zIndex: 15,
        background: 'rgba(6,11,22,0.8)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12 }}>
        <span style={{ fontSize: 14 }}>{activeTab.icon}</span>
        <span className="text-2" style={{ fontSize: 12 }}>{activeTab.desc}</span>
        <span className="text-3" style={{ fontSize: 12 }}>·</span>
        <span className="text-3" style={{ fontSize: 12 }}>
          Year {selectedYear} {mode === 'forecast' ? '(AI Predicted)' : '(Historical)'}
        </span>
        {optimizationResult && (activeEngine === 'budget' || activeEngine === 'roi') && (
          <span className="tag tag-amber" style={{ marginLeft: 'auto' }}>
            ✓ {optimizationResult.selectedGrids.length} grids · {optimizationResult.totalTrees.toLocaleString()} trees
          </span>
        )}
      </div>

      {/* ═══════════════════════ MAIN CONTENT ═══════════════════════ */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', padding: '12px 16px 12px', gap: 12,
        position: 'relative', zIndex: 10 }}>

        {/* ── LEFT SIDEBAR ── */}
        <div style={{ width: 272, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>

          {/* Time Control */}
          <div style={{ flexShrink: 0 }}>
            <TimeControl onYearChange={handleYearChange} />
          </div>

          {/* Priority Zones */}
          <AnimatePresence>
            {activeEngine === 'osi' && urgentGrids.length > 0 && (
              <motion.div key="priority"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <div className="panel" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
                  border: '1px solid rgba(255,89,131,0.12)' }}>
                  {/* Header */}
                  <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16 }}>🚨</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Priority Zones</span>
                      </div>
                      <span className="tag tag-red" style={{ fontSize: 10 }}>Top {urgentGrids.length}</span>
                    </div>
                    <p className="text-3" style={{ fontSize: 11 }}>Ranked by OSI severity for {selectedYear}</p>
                  </div>
                  {/* List */}
                  <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {urgentGrids.map(g => (
                      <div key={g.rank} className="card" style={{ padding: '10px 12px', cursor: 'pointer',
                        borderColor: g.risk === 'Critical' ? 'rgba(255,89,131,0.12)' : 'rgba(255,193,7,0.1)' }}
                        onClick={() => useAppStore.getState().setSelectedPlantationLocation({
                          id: `urgent-${g.rank}`, coordinates: [g.lng, g.lat],
                          priority: g.risk === 'Critical' ? 'urgent' : 'high',
                        })}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                              background: g.risk === 'Critical' ? 'var(--red)' : 'var(--amber)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 10, fontWeight: 800, color: '#000' }}>
                              {g.rank}
                            </div>
                            <div>
                              <div className="mono" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.2 }}>
                                {g.lat.toFixed(3)}°N, {g.lng.toFixed(3)}°E
                              </div>
                              <div className="text-3" style={{ fontSize: 11, marginTop: 2 }}>
                                {g.lat > 28.7 ? 'North Delhi' : g.lat > 28.6 ? 'Central' : g.lat > 28.5 ? 'South Delhi' : 'New Delhi'}
                              </div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div className="mono" style={{ fontSize: 15, fontWeight: 800, lineHeight: 1,
                              color: g.risk === 'Critical' ? 'var(--red)' : 'var(--amber)' }}>
                              {g.osi.toFixed(0)}
                            </div>
                            <span className={`tag ${g.risk === 'Critical' ? 'tag-red' : 'tag-amber'}`}
                              style={{ fontSize: 9, marginTop: 3, display: 'inline-flex' }}>
                              {g.risk}
                            </span>
                          </div>
                        </div>
                        {/* Mini metrics */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8,
                          paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                          <div>
                            <div className="label" style={{ fontSize: 9 }}>NDVI</div>
                            <div className="mono text-green" style={{ fontSize: 12, fontWeight: 700 }}>
                              {g.ndvi?.toFixed(3) ?? '—'}
                            </div>
                          </div>
                          <div>
                            <div className="label" style={{ fontSize: 9 }}>AOD</div>
                            <div className="mono text-amber" style={{ fontSize: 12, fontWeight: 700 }}>
                              {g.aod?.toFixed(2) ?? '—'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── CENTER MAP ── */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="panel" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Map toolbar */}
            <div style={{ flexShrink: 0, padding: '12px 16px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ position: 'relative', width: 10, height: 10 }}>
                  <div className="breathe" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--cyan)', opacity: 0.5 }} />
                  <div style={{ position: 'absolute', inset: 2, borderRadius: '50%', background: 'var(--cyan)' }} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)' }}>
                  {viewMode === '2d' ? '2D Topographic View' : '3D Spatial Globe'}
                </span>
                <span className="mono text-3" style={{ fontSize: 11 }}>· {selectedYear}</span>
              </div>
              {/* 2D/3D toggle */}
              <div style={{ display: 'flex', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border)',
                borderRadius: 8, padding: 3, gap: 3 }}>
                {(['2d', '3d'] as const).map(v => (
                  <button key={v} onClick={() => useAppStore.getState().setViewMode(v)}
                    style={{ padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                      background: viewMode === v ? (v === '2d' ? 'rgba(0,229,255,0.2)' : 'rgba(179,136,255,0.2)') : 'transparent',
                      color: viewMode === v ? (v === '2d' ? 'var(--cyan)' : 'var(--purple)') : 'var(--text-3)',
                      border: viewMode === v ? `1px solid ${v === '2d' ? 'rgba(0,229,255,0.35)' : 'rgba(179,136,255,0.35)'}` : '1px solid transparent',
                      transition: 'all .2s' }}>
                    {v === '2d' ? '2D Map' : '3D Globe'}
                  </button>
                ))}
              </div>
            </div>
            {/* Map canvas */}
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <AnimatePresence mode="wait">
                {viewMode === '2d' && impactedData && (
                  <motion.div key="2d" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ height: '100%' }}>
                    <Map2D data={impactedData} selectedYear={selectedYear} mode={mode} />
                  </motion.div>
                )}
                {viewMode === '3d' && currentData && (
                  <motion.div key="3d" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ height: '100%' }}>
                    <Map3D data={currentData} selectedYear={selectedYear} mode={mode} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ── RIGHT ENGINE PANEL ── */}
        <div style={{ width: 320, flexShrink: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <AnimatePresence mode="wait">
            <motion.div key={activeEngine}
              initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.22 }}
              style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <RightPanel />
            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
