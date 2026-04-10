'use client';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useSpring, useTransform, animate } from 'framer-motion';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { DataProcessor } from '@/utils/dataProcessor';
import { processAllGridsSurvival } from '@/engines/survivalModel';
import {
  runInterventionEngine, INTERVENTION_META,
  InterventionType, InterventionZone, PLANT_DB
} from '@/engines/interventionEngine';
import { GeoJSONData, GridSurvivalData } from '@/types';
import Link from 'next/link';

mapboxgl.accessToken = 'no-token';

// ─── Animated counter ─────────────────────────────────────────────────────────
function AnimCounter({ to, decimals = 0, suffix = '' }: { to: number; decimals?: number; suffix?: string }) {
  const [display, setDisplay] = useState('0');
  useEffect(() => {
    let start = 0;
    const duration = 900;
    const step = (timestamp: number, startTime: number) => {
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (to - start) * eased;
      setDisplay(current.toFixed(decimals));
      if (progress < 1) requestAnimationFrame(ts => step(ts, startTime));
    };
    requestAnimationFrame(ts => step(ts, ts));
  }, [to, decimals]);
  return <>{display}{suffix}</>;
}

// ─── OSI colour ───────────────────────────────────────────────────────────────
const osiColor = (v: number) =>
  v >= 800 ? '#ff4d6d' : v >= 750 ? '#fb923c' : v >= 700 ? '#fbbf24' : '#4ade80';

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, decimals = 0, suffix = '', unit, color, icon, delay = 0 }: {
  label: string; value: number; decimals?: number; suffix?: string;
  unit: string; color: string; icon: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      style={{
        flex: 1, padding: '14px 16px', borderRadius: 14,
        background: `linear-gradient(135deg, ${color}0d, ${color}05)`,
        border: `1px solid ${color}25`, position: 'relative', overflow: 'hidden',
      }}>
      {/* decorative blob */}
      <div style={{
        position: 'absolute', right: -12, top: -12, width: 60, height: 60,
        borderRadius: '50%', background: `${color}18`, filter: 'blur(16px)',
      }} />
      <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 9, letterSpacing: '0.14em', color: `${color}aa`, fontFamily: 'monospace', marginBottom: 4, textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 900, color, fontFamily: 'monospace', lineHeight: 1 }}>
        <AnimCounter to={value} decimals={decimals} suffix={suffix} />
      </div>
      <div style={{ fontSize: 10, color: '#4b5563', marginTop: 4 }}>{unit}</div>
    </motion.div>
  );
}

// ─── Plant chip ───────────────────────────────────────────────────────────────
function PlantCard({ plant }: { plant: typeof PLANT_DB[string] }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      layout onClick={() => setOpen(x => !x)}
      style={{
        borderRadius: 12, padding: '12px 14px', cursor: 'pointer',
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
        transition: 'border-color 0.2s',
      }}
      whileHover={{ borderColor: 'rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.04)' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ fontSize: 28, flexShrink: 0 }}>{plant.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#f0fdf4' }}>{plant.name}</div>
          <div style={{ fontSize: 9, color: '#6b7280', fontStyle: 'italic' }}>{plant.scientificName}</div>
        </div>
        <div style={{ fontSize: 9, color: '#374151', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}>▾</div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ paddingTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 8 }}>
              {[
                { k: 'O₂/yr', v: `${plant.o2KgPerYearPerTree}kg`, c: '#4ade80' },
                { k: 'CO₂/yr', v: `${plant.co2KgPerYearPerTree}kg`, c: '#60a5fa' },
                { k: 'Growth', v: plant.growthRate, c: '#fbbf24' },
                { k: 'Pollution', v: plant.pollutionTolerance, c: '#f87171' },
                { k: 'Max temp', v: `${plant.maxTemp}°C`, c: '#fb923c' },
                { k: 'Rooftop', v: plant.rooftopOk ? 'Yes ✓' : 'No', c: plant.rooftopOk ? '#a78bfa' : '#4b5563' },
              ].map(({ k, v, c }) => (
                <div key={k} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '6px 8px' }}>
                  <div style={{ fontSize: 8, color: '#4b5563', fontFamily: 'monospace' }}>{k}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: c }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 10, color: '#6b7280', lineHeight: 1.55 }}>{plant.note}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Urgency badge ────────────────────────────────────────────────────────────
function UrgencyBadge({ level }: { level: 1 | 2 | 3 }) {
  const map = {
    3: { label: 'URGENT', color: '#ff4d6d', bg: 'rgba(255,77,109,0.1)' },
    2: { label: 'PRIORITY', color: '#fb923c', bg: 'rgba(251,146,60,0.1)' },
    1: { label: 'ROUTINE', color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
  };
  const { label, color, bg } = map[level];
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 10px', borderRadius: 20,
      background: bg, border: `1px solid ${color}30`,
    }}>
      <motion.div
        animate={level === 3 ? { scale: [1, 1.4, 1] } : {}}
        transition={{ duration: 1.5, repeat: Infinity }}
        style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
      <span style={{ fontSize: 9, fontWeight: 800, color, fontFamily: 'monospace' }}>{label}</span>
    </div>
  );
}

// ─── Zone detail slide-in panel ───────────────────────────────────────────────
function ZoneDetailPanel({ zone, onClose }: { zone: InterventionZone; onClose: () => void }) {
  const meta = INTERVENTION_META[zone.interventionType];
  return (
    <motion.aside
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 32 }}
      style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: 340,
        background: 'rgba(5,8,14,0.97)', backdropFilter: 'blur(24px)',
        borderLeft: `1px solid ${meta.color}20`,
        display: 'flex', flexDirection: 'column', zIndex: 40, overflowY: 'auto',
      }}>

      {/* Panel header */}
      <div style={{ padding: '18px 18px 14px', borderBottom: `1px solid ${meta.color}15`, flexShrink: 0, position: 'sticky', top: 0, background: 'rgba(5,8,14,0.98)', zIndex: 2 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              style={{ fontSize: 28, marginBottom: 6 }}>{meta.icon}</motion.div>
            <div style={{ fontSize: 16, fontWeight: 800, color: meta.color, letterSpacing: '-0.01em' }}>{meta.label}</div>
            <div style={{ fontSize: 11, color: '#4b5563', marginTop: 3, lineHeight: 1.45 }}>{meta.desc}</div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8, color: '#9ca3af', fontSize: 14, width: 32, height: 32,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}>✕</button>
        </div>
        <div style={{ marginTop: 12 }}>
          <UrgencyBadge level={zone.urgency} />
        </div>
      </div>

      {/* Grid telemetry */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
        <div style={{ fontSize: 9, letterSpacing: '0.14em', color: '#374151', fontFamily: 'monospace', marginBottom: 10, textTransform: 'uppercase' }}>Grid Telemetry</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          {[
            { k: 'OSI', v: Math.round(zone.osi), c: osiColor(zone.osi) },
            { k: 'NDVI', v: zone.ndvi.toFixed(3), c: '#4ade80' },
            { k: 'AOD', v: Math.round(zone.aod), c: '#60a5fa' },
            { k: 'TEMP', v: `${zone.temp.toFixed(1)}°`, c: '#fbbf24' },
            { k: 'SURVIVAL', v: `${(zone.survivalProbability * 100).toFixed(0)}%`, c: zone.survivalProbability > 0.6 ? '#4ade80' : zone.survivalProbability > 0.4 ? '#fbbf24' : '#ff4d6d' },
            { k: 'SUIT.', v: zone.suitabilityScore.toFixed(1), c: '#c084fc' },
          ].map(({ k, v, c }) => (
            <motion.div key={k} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '8px 10px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: 8, color: '#4b5563', fontFamily: 'monospace', marginBottom: 2 }}>{k}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: c, fontFamily: 'monospace' }}>{v}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Action */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
        <div style={{ fontSize: 9, letterSpacing: '0.14em', color: '#374151', fontFamily: 'monospace', marginBottom: 10, textTransform: 'uppercase' }}>Recommended Action</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#f0fdf4', marginBottom: 6, lineHeight: 1.4 }}>
          {zone.actionSummary}
        </div>
        <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.55 }}>{zone.reason}</div>

        {zone.treesRecommended > 0 && (
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.15)' }}>
              <div style={{ fontSize: 8, color: '#4b5563', fontFamily: 'monospace', marginBottom: 3 }}>UNITS TO PLANT</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#4ade80', fontFamily: 'monospace', lineHeight: 1 }}>
                {zone.treesRecommended.toLocaleString()}
              </div>
            </div>
            <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(96,165,250,0.07)', border: '1px solid rgba(96,165,250,0.15)' }}>
              <div style={{ fontSize: 8, color: '#4b5563', fontFamily: 'monospace', marginBottom: 3 }}>O₂ AT MATURITY</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#60a5fa', fontFamily: 'monospace', lineHeight: 1 }}>
                {zone.estimatedO2TonnesPerYear}t/yr
              </div>
            </div>
          </div>
        )}

        {zone.estimatedVehiclesAffected > 0 && (
          <div style={{ marginTop: 10, padding: '12px 14px', borderRadius: 10, background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.18)' }}>
            <div style={{ fontSize: 9, color: '#4b5563', fontFamily: 'monospace', marginBottom: 8, letterSpacing: '0.1em' }}>VEHICLE RESTRICTION IMPACT</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <div style={{ fontSize: 8, color: '#6b7280' }}>Vehicles/day</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#fb923c', fontFamily: 'monospace' }}>~{zone.estimatedVehiclesAffected.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: 8, color: '#6b7280' }}>CO₂ saved/day</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#60a5fa', fontFamily: 'monospace' }}>{(zone.estimatedVehiclesAffected * 2.4 / 1000).toFixed(1)}t</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Plant recommendations */}
      {zone.recommendedPlants.length > 0 && (
        <div style={{ padding: '14px 18px', flex: 1 }}>
          <div style={{ fontSize: 9, letterSpacing: '0.14em', color: '#374151', fontFamily: 'monospace', marginBottom: 12, textTransform: 'uppercase' }}>
            Recommended Species · {zone.recommendedPlants.length}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {zone.recommendedPlants.map(plant => (
              <PlantCard key={plant.id} plant={plant} />
            ))}
          </div>
        </div>
      )}
    </motion.aside>
  );
}

// ─── Mapbox map ───────────────────────────────────────────────────────────────
function InterventionMap({ geoData, zones, onZoneClick }: {
  geoData: GeoJSONData; zones: InterventionZone[];
  onZoneClick: (z: InterventionZone) => void;
}) {
  const ref      = useRef<HTMLDivElement>(null);
  const mapRef   = useRef<mapboxgl.Map | null>(null);
  const [loaded, setLoaded] = useState(false);

  const zoneMap = useMemo(() => {
    const m = new Map<string, InterventionZone>();
    zones.forEach(z => m.set(z.gridId, z));
    return m;
  }, [zones]);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    mapRef.current = new mapboxgl.Map({
      container: ref.current,
      style: {
        version: 8,
        sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256 } },
        layers: [{ id: 'osm', type: 'raster', source: 'osm', paint: { 'raster-opacity': 0.8 } }],
      },
      center: [77.2090, 28.6139], zoom: 10.2,
    });
    mapRef.current.on('load', () => setLoaded(true));
    return () => { mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !loaded || !zones.length || !geoData) return;
    const m = mapRef.current;
    ['iplan-fill', 'iplan-line'].forEach(id => { try { if (m.getLayer(id)) m.removeLayer(id); } catch {} });
    try { if (m.getSource('iplan')) m.removeSource('iplan'); } catch {}

    const enriched = {
      ...geoData,
      features: geoData.features.map(f => {
        const z = zoneMap.get(f.properties['system:index'] || '');
        return {
          ...f, properties: {
            ...f.properties,
            fillColor: INTERVENTION_META[z?.interventionType ?? 'healthy'].mapColor,
            gridId: f.properties['system:index'],
          },
        };
      }),
    };

    m.addSource('iplan', { type: 'geojson', data: enriched as any });
    m.addLayer({ id: 'iplan-fill', type: 'fill', source: 'iplan', paint: { 'fill-color': ['get', 'fillColor'], 'fill-opacity': 0.50 } });
    m.addLayer({ id: 'iplan-line', type: 'line', source: 'iplan', paint: { 'line-color': ['get', 'fillColor'], 'line-width': 0.6, 'line-opacity': 0.45 } });

    const onClick = (e: mapboxgl.MapMouseEvent) => {
      const f = m.queryRenderedFeatures(e.point, { layers: ['iplan-fill'] })[0];
      if (!f) return;
      const z = zoneMap.get(f.properties?.gridId);
      if (z) onZoneClick(z);
    };
    const onMove = (e: mapboxgl.MapMouseEvent) => {
      m.getCanvas().style.cursor = m.queryRenderedFeatures(e.point, { layers: ['iplan-fill'] }).length ? 'pointer' : '';
    };
    m.on('click', onClick); m.on('mousemove', onMove);
    return () => { m.off('click', onClick); m.off('mousemove', onMove); };
  }, [loaded, zones, geoData, zoneMap, onZoneClick]);

  return <div ref={ref} style={{ width: '100%', height: '100%' }} />;
}

// ─── Filter pill ──────────────────────────────────────────────────────────────
function FilterPill({ type, count, active, onClick }: {
  type: InterventionType; count: number; active: boolean; onClick: () => void;
}) {
  const m = INTERVENTION_META[type];
  return (
    <motion.button onClick={onClick} whileTap={{ scale: 0.96 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', borderRadius: 10, width: '100%',
        border: `1px solid ${active ? m.color + '55' : 'rgba(255,255,255,0.05)'}`,
        background: active ? `${m.color}10` : 'rgba(255,255,255,0.01)',
        cursor: 'pointer', transition: 'all 0.18s', textAlign: 'left',
      }}>
      <span style={{ fontSize: 16, flexShrink: 0 }}>{m.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: active ? m.color : '#9ca3af', lineHeight: 1.2 }}>{m.label}</div>
        <div style={{ fontSize: 9, color: '#4b5563', fontFamily: 'monospace' }}>{count} grids</div>
      </div>
      {active && <div style={{ width: 6, height: 6, borderRadius: '50%', background: m.color, flexShrink: 0 }} />}
    </motion.button>
  );
}

// ─── Main portal ──────────────────────────────────────────────────────────────
export default function UrbanPlanPortal() {
  const [geoData, setGeoData]   = useState<GeoJSONData | null>(null);
  const [zones, setZones]       = useState<InterventionZone[]>([]);
  const [loading, setLoading]   = useState(true);
  const [phase, setPhase]       = useState<'fetch' | 'survival' | 'engine' | 'done'>('fetch');
  const [selected, setSelected] = useState<InterventionZone | null>(null);
  const [filter, setFilter]     = useState<InterventionType | 'all'>('all');
  const [result, setResult]     = useState<ReturnType<typeof runInterventionEngine> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setPhase('fetch');
        const r = await fetch('/Delhi_1km_Final_OSI_Professional_2023.csv');
        if (!r.ok) throw new Error('Failed to fetch telemetry');
        const geo = DataProcessor.convertToGeoJSON(DataProcessor.parseCSV(await r.text()));
        setGeoData(geo);

        setPhase('survival');
        await new Promise(res => setTimeout(res, 30));
        const sv = processAllGridsSurvival(geo);

        setPhase('engine');
        await new Promise(res => setTimeout(res, 30));
        const res2 = runInterventionEngine(sv);
        setResult(res2);
        setZones(res2.zones);
      } catch (e) { console.error(e); }
      finally { setPhase('done'); setLoading(false); }
    })();
  }, []);

  const filteredZones = useMemo(() =>
    filter === 'all' ? zones : zones.filter(z => z.interventionType === filter),
    [zones, filter]);

  const handleClick = useCallback((z: InterventionZone) => setSelected(z), []);

  const phaseLabel = { fetch: 'Fetching satellite telemetry…', survival: 'Running survival model…', engine: 'Classifying interventions…', done: '' }[phase];

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ height: '100vh', background: '#050a0e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
      <div style={{ position: 'relative', width: 92, height: 92 }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          style={{ position: 'absolute', inset: 0, border: '2px solid transparent', borderTopColor: '#4ade80', borderRadius: '50%' }} />
        <motion.div animate={{ rotate: -360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          style={{ position: 'absolute', inset: 12, border: '2px solid transparent', borderTopColor: '#60a5fa', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', inset: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🌿</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <motion.div
          key={phase}
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          style={{ fontSize: 15, fontWeight: 700, color: '#f0fdf4', marginBottom: 6 }}>
          {phaseLabel}
        </motion.div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
          {(['fetch', 'survival', 'engine'] as const).map((p, i) => (
            <div key={p} style={{
              width: 24, height: 3, borderRadius: 2,
              background: phase === p ? '#4ade80' : ['done'].includes(phase) || i < ['fetch', 'survival', 'engine'].indexOf(phase) + 1 ? '#1f2937' : '#1f2937',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>
      </div>
      <div style={{ fontSize: 10, color: '#374151', fontFamily: 'monospace', letterSpacing: '0.15em' }}>
        URBAN INTERVENTION PLANNER · DELHI NCR
      </div>
    </div>
  );

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#060b10', color: '#e5e7eb', overflow: 'hidden', fontFamily: '"Inter", sans-serif' }}>

      {/* ══ HEADER ══════════════════════════════════════════════════════════════ */}
      <motion.header
        initial={{ y: -56 }} animate={{ y: 0 }} transition={{ duration: 0.4 }}
        style={{
          height: 56, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(6,11,16,0.96)', backdropFilter: 'blur(24px)', zIndex: 10,
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <motion.div whileHover={{ x: -2 }} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '5px 11px',
              borderRadius: 8, border: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(255,255,255,0.03)', color: '#6b7280',
              fontSize: 11, fontFamily: 'monospace', cursor: 'pointer', letterSpacing: '0.06em',
            }}>← DASHBOARD</motion.div>
          </Link>
          <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.07)' }} />
          <div>
            <div style={{
              fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em',
              background: 'linear-gradient(135deg, #4ade80 30%, #60a5fa)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>🌿 Urban Intervention Planner</div>
            <div style={{ fontSize: 9, color: '#374151', fontFamily: 'monospace', letterSpacing: '0.16em', marginTop: 1 }}>
              GRID-LEVEL SPECIES & POLICY RECOMMENDATIONS · DELHI NCR 2023
            </div>
          </div>
        </div>

        {result && (
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#4ade80', fontFamily: 'monospace' }}>{result.totalGrids.toLocaleString()} grids classified</div>
              <div style={{ fontSize: 9, color: '#374151' }}>in {result.executionTimeMs}ms · click any grid for recommendations</div>
            </div>
            <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.07)' }} />
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80' }} className="breathe" />
              <span style={{ fontSize: 10, fontWeight: 700, color: '#4ade80', letterSpacing: '0.12em' }}>LIVE ENGINE</span>
            </div>
          </div>
        )}
      </motion.header>

      {/* ══ STATS BAR ═══════════════════════════════════════════════════════════ */}
      {result && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          style={{ flexShrink: 0, padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 10 }}>
          <StatCard label="Plantation Zones"  value={(result.byType.large_trees + result.byType.medium_trees + result.byType.shrubs_bamboo)} unit="grids → tree planting"  color="#4ade80" icon="🌳" delay={0.1} />
          <StatCard label="Oxygen Plant Zones" value={result.byType.oxygen_plants} unit="grids → rooftop/vertical" color="#a78bfa" icon="🪴" delay={0.15} />
          <StatCard label="CNG Restriction"    value={result.byType.cng_only}    unit="grids → CNG vehicles only" color="#fb923c" icon="🚫" delay={0.2} />
          <StatCard label="EV + CNG Zones"     value={result.byType.ev_cng_zone} unit="grids → full diesel ban"  color="#ff4d6d" icon="⚡" delay={0.25} />
          <StatCard label="O₂ Output (mature)" value={result.totalO2TonnesPerYear} decimals={1} suffix="t" unit="tonnes O₂ per year" color="#60a5fa" icon="💨" delay={0.3} />
          <StatCard label="CO₂ Absorbed"       value={result.totalCO2TonnesPerYear} decimals={1} suffix="t" unit="tonnes CO₂ per year"  color="#34d399" icon="🌬️" delay={0.35} />
        </motion.div>
      )}

      {/* ══ BODY ════════════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

        {/* LEFT SIDEBAR */}
        <motion.aside
          initial={{ x: -260 }} animate={{ x: 0 }} transition={{ duration: 0.35, delay: 0.1 }}
          style={{
            width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column',
            borderRight: '1px solid rgba(255,255,255,0.05)', background: '#060b10', overflowY: 'auto',
          }}>

          {/* Filter header */}
          <div style={{ padding: '14px 14px 10px', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: 9, letterSpacing: '0.16em', color: '#374151', fontFamily: 'monospace', marginBottom: 10 }}>⚙ FILTER ZONES</div>

            {/* All */}
            <motion.button onClick={() => setFilter('all')} whileTap={{ scale: 0.97 }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                borderRadius: 10, border: `1px solid ${filter === 'all' ? 'rgba(99,179,237,0.4)' : 'rgba(255,255,255,0.05)'}`,
                background: filter === 'all' ? 'rgba(99,179,237,0.08)' : 'rgba(255,255,255,0.01)',
                cursor: 'pointer', marginBottom: 8,
              }}>
              <span style={{ fontSize: 16 }}>🗺️</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: filter === 'all' ? '#93c5fd' : '#9ca3af' }}>All Zones</div>
                <div style={{ fontSize: 9, color: '#4b5563', fontFamily: 'monospace' }}>{zones.length} grids</div>
              </div>
            </motion.button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {(Object.keys(INTERVENTION_META) as InterventionType[]).map(type => (
                <FilterPill key={type} type={type}
                  count={result?.byType[type] ?? 0}
                  active={filter === type}
                  onClick={() => setFilter(p => p === type ? 'all' : type)} />
              ))}
            </div>
          </div>

          {/* Urgent list */}
          <div style={{ padding: '12px 14px', flex: 1 }}>
            <div style={{ fontSize: 9, letterSpacing: '0.16em', color: '#374151', fontFamily: 'monospace', marginBottom: 10 }}>
              🔴 TOP URGENT ({filteredZones.filter(z => z.urgency === 3).slice(0, 12).length})
            </div>
            {filteredZones.filter(z => z.urgency === 3).slice(0, 12).map(zone => {
              const m = INTERVENTION_META[zone.interventionType];
              return (
                <motion.div key={zone.gridId} whileHover={{ x: 3, background: `${m.color}0c` }}
                  onClick={() => handleClick(zone)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '7px 9px',
                    borderRadius: 8, cursor: 'pointer', marginBottom: 4,
                    border: selected?.gridId === zone.gridId ? `1px solid ${m.color}40` : '1px solid transparent',
                    background: selected?.gridId === zone.gridId ? `${m.color}0a` : 'transparent',
                    transition: 'all 0.15s',
                  }}>
                  <span style={{ fontSize: 13, flexShrink: 0 }}>{m.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: m.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.label}
                    </div>
                    <div style={{ fontSize: 9, color: '#4b5563', fontFamily: 'monospace' }}>
                      OSI {Math.round(zone.osi)} · {(zone.survivalProbability * 100).toFixed(0)}%
                    </div>
                  </div>
                </motion.div>
              );
            })}
            {filteredZones.filter(z => z.urgency === 3).length === 0 && (
              <div style={{ fontSize: 11, color: '#374151', textAlign: 'center', padding: '20px 0' }}>
                No urgent zones in current filter
              </div>
            )}
          </div>
        </motion.aside>

        {/* CENTER MAP */}
        <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
          {geoData && zones.length ? (
            <InterventionMap geoData={geoData} zones={filteredZones} onZoneClick={handleClick} />
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151', fontFamily: 'monospace', fontSize: 13 }}>
              LOADING MAP…
            </div>
          )}

          {/* Click hint */}
          <AnimatePresence>
            {!selected && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{
                  position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
                  background: 'rgba(6,11,16,0.88)', backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20,
                  padding: '7px 18px', fontSize: 11, color: '#6b7280', fontFamily: 'monospace',
                  pointerEvents: 'none', whiteSpace: 'nowrap',
                }}>
                🖱️ Click any coloured grid for species & policy details
              </motion.div>
            )}
          </AnimatePresence>

          {/* Legend card */}
          <div style={{
            position: 'absolute', bottom: 20, left: 16, zIndex: 10,
            background: 'rgba(6,11,16,0.92)', backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14,
            padding: '12px 16px',
          }}>
            <div style={{ fontSize: 9, letterSpacing: '0.15em', color: '#374151', fontFamily: 'monospace', marginBottom: 8 }}>INTERVENTION LEGEND</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 16px' }}>
              {(Object.entries(INTERVENTION_META) as [InterventionType, typeof INTERVENTION_META[InterventionType]][]).map(([type, m]) => (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 9, height: 9, borderRadius: 2, background: m.mapColor, flexShrink: 0 }} />
                  <span style={{ fontSize: 9, color: '#9ca3af' }}>{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Active filter badge */}
          {filter !== 'all' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              style={{
                position: 'absolute', top: 14, right: 14, zIndex: 10,
                background: `${INTERVENTION_META[filter].color}18`, backdropFilter: 'blur(12px)',
                border: `1px solid ${INTERVENTION_META[filter].color}40`, borderRadius: 20,
                padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6,
              }}>
              <span style={{ fontSize: 13 }}>{INTERVENTION_META[filter].icon}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: INTERVENTION_META[filter].color }}>
                {INTERVENTION_META[filter].label} · {filteredZones.length} grids
              </span>
              <button onClick={() => setFilter('all')} style={{
                background: 'none', border: 'none', color: INTERVENTION_META[filter].color,
                cursor: 'pointer', fontSize: 12, padding: '0 0 0 4px', opacity: 0.7,
              }}>✕</button>
            </motion.div>
          )}

          {/* Zone detail panel */}
          <AnimatePresence>
            {selected && <ZoneDetailPanel zone={selected} onClose={() => setSelected(null)} />}
          </AnimatePresence>
        </div>
      </div>

      {/* ══ STATUS BAR ══════════════════════════════════════════════════════════ */}
      <div style={{
        height: 26, flexShrink: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 18px',
        borderTop: '1px solid rgba(255,255,255,0.04)', background: '#040810',
        fontSize: 8, fontFamily: 'monospace', color: '#374151', letterSpacing: '0.14em',
      }}>
        <span>UODP · URBAN INTERVENTION PLANNER · DELHI NCR 2023</span>
        <span style={{ color: filter !== 'all' ? INTERVENTION_META[filter].color : '#4ade80' }}>
          {filter === 'all' ? `ALL ZONES · ${zones.length} GRIDS` : `${INTERVENTION_META[filter].label.toUpperCase()} · ${filteredZones.length} GRIDS`}
        </span>
        <span>ENGINE v1.0 · {result?.executionTimeMs ?? 0}ms</span>
      </div>
    </div>
  );
}
