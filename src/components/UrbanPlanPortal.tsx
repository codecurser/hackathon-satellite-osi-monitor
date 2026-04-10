'use client';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

// ─── OSI color helper ─────────────────────────────────────────────────────────
const osiColor = (osi: number) =>
  osi >= 800 ? '#ff2052' : osi >= 750 ? '#ff9100' : osi >= 700 ? '#eab308' : '#22c55e';

// ─── Stat tile ────────────────────────────────────────────────────────────────
function StatTile({ label, value, unit, color, icon }: {
  label: string; value: string | number; unit: string; color: string; icon: string;
}) {
  return (
    <div style={{
      flex: 1, padding: '14px 12px', borderRadius: 10,
      background: `${color}0d`, border: `1px solid ${color}30`,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', right: 8, top: 8, fontSize: 22, opacity: 0.12 }}>{icon}</div>
      <div style={{ fontSize: 9, letterSpacing: '0.12em', color: `${color}99`, fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color, fontFamily: 'monospace', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, color: '#4a5568', marginTop: 4 }}>{unit}</div>
    </div>
  );
}

// ─── Plant card ───────────────────────────────────────────────────────────────
function PlantCard({ plant, count }: { plant: typeof PLANT_DB[string]; count: number }) {
  return (
    <div style={{
      padding: '10px 12px', borderRadius: 10,
      background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)',
      display: 'flex', gap: 10, alignItems: 'flex-start',
    }}>
      <span style={{ fontSize: 26, flexShrink: 0 }}>{plant.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#86efac' }}>{plant.name}</div>
        <div style={{ fontSize: 9, color: '#4a5568', fontStyle: 'italic', marginBottom: 4 }}>{plant.scientificName}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
          <div style={{ fontSize: 9, color: '#6b7280' }}>
            O₂: <span style={{ color: '#4ade80', fontWeight: 700 }}>{plant.o2KgPerYearPerTree}kg/yr</span>
          </div>
          <div style={{ fontSize: 9, color: '#6b7280' }}>
            CO₂: <span style={{ color: '#60a5fa', fontWeight: 700 }}>{plant.co2KgPerYearPerTree}kg/yr</span>
          </div>
          <div style={{ fontSize: 9, color: '#6b7280' }}>
            Growth: <span style={{ color: '#fbbf24', fontWeight: 700 }}>{plant.growthRate}</span>
          </div>
          <div style={{ fontSize: 9, color: '#6b7280' }}>
            Pollution: <span style={{ color: '#f87171', fontWeight: 700 }}>{plant.pollutionTolerance}</span>
          </div>
        </div>
        {plant.rooftopOk && (
          <div style={{ marginTop: 4, fontSize: 9, color: '#a78bfa', fontWeight: 700 }}>🏗️ Rooftop viable</div>
        )}
        <div style={{ marginTop: 4, fontSize: 9, color: '#374151', lineHeight: 1.4 }}>{plant.note}</div>
      </div>
    </div>
  );
}

// ─── Zone detail panel ────────────────────────────────────────────────────────
function ZoneDetailPanel({ zone, onClose }: { zone: InterventionZone; onClose: () => void }) {
  const meta = INTERVENTION_META[zone.interventionType];
  return (
    <motion.div
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      style={{
        position: 'absolute', top: 0, right: 0, bottom: 0,
        width: 320, background: '#070d14', borderLeft: `1px solid ${meta.color}30`,
        overflowY: 'auto', zIndex: 30, display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '16px 16px 12px',
        background: `${meta.color}0c`,
        borderBottom: `1px solid ${meta.color}20`, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{meta.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: meta.color }}>{meta.label}</div>
            <div style={{ fontSize: 10, color: '#4b5563', marginTop: 2, lineHeight: 1.4 }}>{meta.desc}</div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: '1px solid #1f2937', borderRadius: 6,
            color: '#6b7280', fontSize: 12, padding: '4px 8px', cursor: 'pointer',
          }}>✕</button>
        </div>
        <div style={{
          marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 10px', borderRadius: 20,
          background: zone.urgency === 3 ? 'rgba(255,81,83,0.1)' : zone.urgency === 2 ? 'rgba(255,145,0,0.1)' : 'rgba(34,197,94,0.1)',
          border: `1px solid ${zone.urgency === 3 ? 'rgba(255,81,83,0.3)' : zone.urgency === 2 ? 'rgba(255,145,0,0.3)' : 'rgba(34,197,94,0.3)'}`,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: zone.urgency === 3 ? '#ff5983' : zone.urgency === 2 ? '#ff9100' : '#22c55e' }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: zone.urgency === 3 ? '#ff5983' : zone.urgency === 2 ? '#ff9100' : '#22c55e', fontFamily: 'monospace' }}>
            {zone.urgency === 3 ? 'URGENT ACTION' : zone.urgency === 2 ? 'PRIORITY' : 'ROUTINE'}
          </span>
        </div>
      </div>

      {/* Metrics */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #111827', flexShrink: 0 }}>
        <div style={{ fontSize: 9, letterSpacing: '0.15em', color: '#374151', fontFamily: 'monospace', marginBottom: 10 }}>GRID TELEMETRY</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: 'OSI', value: Math.round(zone.osi), color: osiColor(zone.osi) },
            { label: 'NDVI', value: zone.ndvi.toFixed(3), color: '#4ade80' },
            { label: 'AOD', value: Math.round(zone.aod), color: '#60a5fa' },
            { label: 'TEMP', value: `${zone.temp.toFixed(1)}°C`, color: '#fbbf24' },
            { label: 'SURVIVAL', value: `${(zone.survivalProbability * 100).toFixed(0)}%`, color: zone.survivalProbability > 0.6 ? '#4ade80' : zone.survivalProbability > 0.4 ? '#fbbf24' : '#f87171' },
            { label: 'SUITABILITY', value: zone.suitabilityScore.toFixed(1), color: '#c084fc' },
          ].map(m => (
            <div key={m.label} style={{ padding: '8px 10px', borderRadius: 8, background: '#0d1117', border: '1px solid #1f2937' }}>
              <div style={{ fontSize: 8, color: '#374151', fontFamily: 'monospace' }}>{m.label}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: m.color, fontFamily: 'monospace' }}>{m.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Action summary */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #111827', flexShrink: 0 }}>
        <div style={{ fontSize: 9, letterSpacing: '0.15em', color: '#374151', fontFamily: 'monospace', marginBottom: 8 }}>RECOMMENDED ACTION</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#e5e7eb', marginBottom: 6 }}>{zone.actionSummary}</div>
        <div style={{ fontSize: 11, color: '#4b5563', lineHeight: 1.5 }}>{zone.reason}</div>

        {zone.treesRecommended > 0 && (
          <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, padding: '8px', borderRadius: 8, background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)' }}>
              <div style={{ fontSize: 8, color: '#4b5563', fontFamily: 'monospace' }}>UNITS PLANT</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#4ade80', fontFamily: 'monospace' }}>{zone.treesRecommended.toLocaleString()}</div>
            </div>
            <div style={{ flex: 1, padding: '8px', borderRadius: 8, background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)' }}>
              <div style={{ fontSize: 8, color: '#4b5563', fontFamily: 'monospace' }}>O₂/YEAR</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#60a5fa', fontFamily: 'monospace' }}>{zone.estimatedO2TonnesPerYear}t</div>
            </div>
          </div>
        )}

        {zone.estimatedVehiclesAffected > 0 && (
          <div style={{ marginTop: 10, padding: '10px', borderRadius: 8, background: 'rgba(255,145,0,0.06)', border: '1px solid rgba(255,145,0,0.2)' }}>
            <div style={{ fontSize: 9, color: '#4b5563', fontFamily: 'monospace', marginBottom: 4 }}>VEHICLE RESTRICTION IMPACT</div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div>
                <div style={{ fontSize: 8, color: '#6b7280' }}>Vehicles/day</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#ff9100', fontFamily: 'monospace' }}>~{zone.estimatedVehiclesAffected.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: 8, color: '#6b7280' }}>CO₂ saved</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#60a5fa', fontFamily: 'monospace' }}>{(zone.estimatedVehiclesAffected * 2.4 / 1000).toFixed(1)}t/day</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Plant recommendations */}
      {zone.recommendedPlants.length > 0 && (
        <div style={{ padding: '12px 16px', flex: 1 }}>
          <div style={{ fontSize: 9, letterSpacing: '0.15em', color: '#374151', fontFamily: 'monospace', marginBottom: 10 }}>
            RECOMMENDED SPECIES ({zone.recommendedPlants.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {zone.recommendedPlants.map(plant => (
              <PlantCard key={plant.id} plant={plant} count={zone.treesRecommended} />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Mapbox intervention map ──────────────────────────────────────────────────
function InterventionMap({
  geoData, zones, onZoneClick
}: {
  geoData: GeoJSONData;
  zones: InterventionZone[];
  onZoneClick: (zone: InterventionZone) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [loaded, setLoaded] = useState(false);

  const zoneMap = useMemo(() => {
    const m = new Map<string, InterventionZone>();
    zones.forEach(z => m.set(z.gridId, z));
    return m;
  }, [zones]);

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          'osm': { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256 }
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
      center: [77.2090, 28.6139], zoom: 10,
    });
    mapRef.current.on('load', () => setLoaded(true));
    return () => { mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  // Add intervention layer
  useEffect(() => {
    if (!mapRef.current || !loaded || !zones.length || !geoData) return;
    const m = mapRef.current;

    // Cleanup
    ['intervention-fill', 'intervention-outline'].forEach(id => {
      try { if (m.getLayer(id)) m.removeLayer(id); } catch {}
    });
    try { if (m.getSource('intervention-src')) m.removeSource('intervention-src'); } catch {}

    // Enrich GeoJSON with intervention type
    const enriched = {
      ...geoData,
      features: geoData.features.map(f => {
        const zone = zoneMap.get(f.properties['system:index'] || '');
        return {
          ...f,
          properties: {
            ...f.properties,
            interventionType: zone?.interventionType ?? 'healthy',
            fillColor: INTERVENTION_META[zone?.interventionType ?? 'healthy'].mapColor,
            gridId: f.properties['system:index'],
          },
        };
      }),
    };

    m.addSource('intervention-src', { type: 'geojson', data: enriched as any });

    m.addLayer({
      id: 'intervention-fill', type: 'fill', source: 'intervention-src',
      paint: {
        'fill-color': ['get', 'fillColor'],
        'fill-opacity': 0.55,
      },
    });

    m.addLayer({
      id: 'intervention-outline', type: 'line', source: 'intervention-src',
      paint: { 'line-color': ['get', 'fillColor'], 'line-width': 0.5, 'line-opacity': 0.4 },
    });

    // Click handler
    const onClick = (e: mapboxgl.MapMouseEvent) => {
      const features = m.queryRenderedFeatures(e.point, { layers: ['intervention-fill'] });
      if (!features.length) return;
      const gId = features[0].properties?.gridId;
      const zone = zoneMap.get(gId);
      if (zone) onZoneClick(zone);
    };

    const onHover = (e: mapboxgl.MapMouseEvent) => {
      const features = m.queryRenderedFeatures(e.point, { layers: ['intervention-fill'] });
      m.getCanvas().style.cursor = features.length ? 'pointer' : '';
    };

    m.on('click', onClick);
    m.on('mousemove', onHover);
    return () => { m.off('click', onClick); m.off('mousemove', onHover); };
  }, [loaded, zones, geoData, zoneMap, onZoneClick]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}

// ─── Filter pill ──────────────────────────────────────────────────────────────
function FilterPill({ type, count, active, onClick }: {
  type: InterventionType; count: number; active: boolean; onClick: () => void;
}) {
  const m = INTERVENTION_META[type];
  return (
    <motion.button onClick={onClick} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
        borderRadius: 8, border: `1px solid ${active ? m.color + '60' : '#1f2937'}`,
        background: active ? `${m.color}14` : '#0d1117', cursor: 'pointer',
        transition: 'all 0.15s',
      }}>
      <span style={{ fontSize: 14 }}>{m.icon}</span>
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: active ? m.color : '#6b7280' }}>{m.label}</div>
        <div style={{ fontSize: 9, color: '#374151', fontFamily: 'monospace' }}>{count} grids</div>
      </div>
    </motion.button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function UrbanPlanPortal() {
  const [geoData, setGeoData]       = useState<GeoJSONData | null>(null);
  const [survData, setSurvData]     = useState<GridSurvivalData[]>([]);
  const [zones, setZones]           = useState<InterventionZone[]>([]);
  const [loading, setLoading]       = useState(true);
  const [computing, setComputing]   = useState(false);
  const [selectedZone, setSelectedZone]   = useState<InterventionZone | null>(null);
  const [activeFilter, setActiveFilter]   = useState<InterventionType | 'all'>('all');
  const [result, setResult]               = useState<ReturnType<typeof runInterventionEngine> | null>(null);

  // Load data + compute survival + run engine on mount
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await fetch('/Delhi_1km_Final_OSI_Professional_2023.csv');
        if (!r.ok) throw new Error('CSV fetch failed');
        const geo = DataProcessor.convertToGeoJSON(DataProcessor.parseCSV(await r.text()));
        setGeoData(geo);
        await new Promise(res => setTimeout(res, 20));
        const sv = processAllGridsSurvival(geo);
        setSurvData(sv);
        setComputing(true);
        await new Promise(res => setTimeout(res, 30));
        const res2 = runInterventionEngine(sv);
        setResult(res2);
        setZones(res2.zones);
      } catch (e) { console.error(e); }
      finally { setLoading(false); setComputing(false); }
    })();
  }, []);

  const filteredZones = useMemo(() =>
    activeFilter === 'all' ? zones : zones.filter(z => z.interventionType === activeFilter),
    [zones, activeFilter]
  );

  const handleZoneClick = useCallback((zone: InterventionZone) => {
    setSelectedZone(zone);
  }, []);

  // ── Loading screen ───────────────────────────────────────────────────────────
  if (loading || computing) {
    return (
      <div style={{ height: '100vh', background: '#050a0e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, color: '#e5e7eb' }}>
        <div style={{ position: 'relative', width: 80, height: 80 }}>
          <div style={{ position: 'absolute', inset: 0, border: '2px solid transparent', borderTopColor: '#4ade80', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <div style={{ position: 'absolute', inset: 10, border: '2px solid transparent', borderTopColor: '#60a5fa', borderRadius: '50%', animation: 'spin 1.5s linear infinite reverse' }} />
          <div style={{ position: 'absolute', inset: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🌿</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#4ade80', marginBottom: 8 }}>
            {loading ? 'Loading Satellite Data…' : 'Computing Interventions…'}
          </div>
          <div style={{ fontSize: 12, color: '#374151', fontFamily: 'monospace' }}>
            {loading ? 'Fetching Delhi 1km² grid telemetry' : 'Running intervention engine across all grids'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#050a0e', color: '#e5e7eb', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>

      {/* ── HEADER ─────────────────────────────────────────────────────────────── */}
      <header style={{
        height: 56, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', borderBottom: '1px solid #111827',
        background: 'rgba(5,10,14,0.97)', backdropFilter: 'blur(20px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <motion.div whileHover={{ x: -2 }} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 10px', borderRadius: 7, border: '1px solid #1f2937',
              background: '#0d1117', color: '#6b7280', fontSize: 11, fontFamily: 'monospace', cursor: 'pointer',
            }}>
              ← DASHBOARD
            </motion.div>
          </Link>
          <div style={{ borderLeft: '1px solid #1f2937', paddingLeft: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 800, background: 'linear-gradient(135deg, #4ade80, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              🌿 Urban Intervention Planner
            </div>
            <div style={{ fontSize: 9, color: '#374151', fontFamily: 'monospace', letterSpacing: '0.18em', marginTop: 1 }}>
              GRID-LEVEL SPECIES & POLICY RECOMMENDATION SYSTEM
            </div>
          </div>
        </div>

        {result && (
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ fontSize: 10, color: '#4ade80', fontFamily: 'monospace', textAlign: 'right' }}>
              <div style={{ fontWeight: 800 }}>{result.totalGrids.toLocaleString()} GRIDS CLASSIFIED</div>
              <div style={{ color: '#374151' }}>in {result.executionTimeMs}ms</div>
            </div>
            <div style={{ fontSize: 10, color: '#60a5fa', fontFamily: 'monospace', textAlign: 'right' }}>
              <div style={{ fontWeight: 800 }}>{result.totalTreesRequired.toLocaleString()} TREES PLANNED</div>
              <div style={{ color: '#374151' }}>+ {result.totalO2TonnesPerYear}t O₂/yr</div>
            </div>
          </div>
        )}
      </header>

      {/* ── STATS BAR ──────────────────────────────────────────────────────────── */}
      {result && (
        <div style={{ height: 72, flexShrink: 0, padding: '10px 20px', borderBottom: '1px solid #111827', display: 'flex', gap: 10 }}>
          <StatTile label="Plantation Zones" value={result.byType.large_trees + result.byType.medium_trees + result.byType.shrubs_bamboo} unit="grids → tree planting" color="#4ade80" icon="🌳" />
          <StatTile label="Oxygen Plant Zones" value={result.byType.oxygen_plants} unit="grids → rooftop/vertical" color="#a78bfa" icon="🪴" />
          <StatTile label="CNG-Only Zones" value={result.byType.cng_only} unit="grids → vehicle restrict" color="#ff9100" icon="🚫" />
          <StatTile label="EV + CNG Zones" value={result.byType.ev_cng_zone} unit="grids → immediate ban" color="#ff5983" icon="⚡" />
          <StatTile label="O₂ Output (Mature)" value={`${result.totalO2TonnesPerYear}t`} unit="tonnes per year" color="#60a5fa" icon="💨" />
          <StatTile label="CO₂ Absorbed" value={`${result.totalCO2TonnesPerYear}t`} unit="tonnes per year" color="#34d399" icon="🌬️" />
        </div>
      )}

      {/* ── MAIN BODY ──────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

        {/* LEFT: Filters + zone list */}
        <div style={{ width: 250, flexShrink: 0, borderRight: '1px solid #111827', display: 'flex', flexDirection: 'column', overflowY: 'auto', background: '#070d14' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #111827', fontSize: 9, color: '#374151', fontFamily: 'monospace', letterSpacing: '0.15em' }}>
            ⚙ FILTER BY INTERVENTION
          </div>

          {/* All filter */}
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #0d1117' }}>
            <motion.button onClick={() => setActiveFilter('all')} whileHover={{ x: 3 }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                borderRadius: 8, border: `1px solid ${activeFilter === 'all' ? '#4ade8060' : '#1f2937'}`,
                background: activeFilter === 'all' ? 'rgba(74,222,128,0.08)' : '#0d1117',
                cursor: 'pointer', textAlign: 'left',
              }}>
              <span style={{ fontSize: 14 }}>🗺️</span>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: activeFilter === 'all' ? '#4ade80' : '#6b7280' }}>All Zones</div>
                <div style={{ fontSize: 9, color: '#374151', fontFamily: 'monospace' }}>{zones.length} grids</div>
              </div>
            </motion.button>
          </div>

          {/* Per-type filters */}
          <div style={{ padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(Object.keys(INTERVENTION_META) as InterventionType[]).map(type => (
              <FilterPill key={type} type={type}
                count={result?.byType[type] ?? 0}
                active={activeFilter === type}
                onClick={() => setActiveFilter(prev => prev === type ? 'all' : type)} />
            ))}
          </div>

          {/* Mini zone list */}
          <div style={{ padding: '10px 14px', borderTop: '1px solid #111827' }}>
            <div style={{ fontSize: 9, color: '#374151', fontFamily: 'monospace', letterSpacing: '0.15em', marginBottom: 8 }}>
              TOP URGENT ({filteredZones.filter(z => z.urgency === 3).length})
            </div>
            {filteredZones.filter(z => z.urgency === 3).slice(0, 15).map(zone => {
              const m = INTERVENTION_META[zone.interventionType];
              return (
                <motion.div key={zone.gridId} whileHover={{ x: 3 }} onClick={() => handleZoneClick(zone)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
                    borderRadius: 6, cursor: 'pointer', border: '1px solid transparent',
                    marginBottom: 4, transition: 'all 0.15s',
                  }}
                  whileHover={{ borderColor: `${m.color}40`, background: `${m.color}08` }}>
                  <span style={{ fontSize: 12 }}>{m.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: m.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {m.label}
                    </div>
                    <div style={{ fontSize: 9, color: '#374151', fontFamily: 'monospace' }}>
                      OSI {Math.round(zone.osi)} · {(zone.survivalProbability * 100).toFixed(0)}% surv
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* CENTER: Map */}
        <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
          {geoData && zones.length ? (
            <InterventionMap geoData={geoData} zones={filteredZones} onZoneClick={handleZoneClick} />
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151', fontFamily: 'monospace' }}>
              LOADING MAP…
            </div>
          )}

          {/* Map legend overlay */}
          <div style={{
            position: 'absolute', bottom: 24, left: 16, zIndex: 10,
            background: 'rgba(5,10,14,0.92)', backdropFilter: 'blur(12px)',
            border: '1px solid #1f2937', borderRadius: 10, padding: '10px 14px',
          }}>
            <div style={{ fontSize: 9, letterSpacing: '0.15em', color: '#374151', fontFamily: 'monospace', marginBottom: 8 }}>INTERVENTION LEGEND</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 14px' }}>
              {(Object.entries(INTERVENTION_META) as [InterventionType, typeof INTERVENTION_META[InterventionType]][]).map(([type, m]) => (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: m.mapColor, flexShrink: 0 }} />
                  <span style={{ fontSize: 9, color: '#6b7280' }}>{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Click hint */}
          {!selectedZone && (
            <div style={{
              position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(5,10,14,0.88)', backdropFilter: 'blur(8px)',
              border: '1px solid #1f2937', borderRadius: 20,
              padding: '6px 16px', fontSize: 11, color: '#6b7280', fontFamily: 'monospace',
            }}>
              🖱️ Click any grid to see intervention details + plant recommendations
            </div>
          )}

          {/* Zone detail panel */}
          <AnimatePresence>
            {selectedZone && (
              <ZoneDetailPanel zone={selectedZone} onClose={() => setSelectedZone(null)} />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── STATUS BAR ──────────────────────────────────────────────────────────── */}
      <footer style={{
        height: 24, flexShrink: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 16px',
        borderTop: '1px solid #111827', background: '#030608',
        fontSize: 8, fontFamily: 'monospace', color: '#374151', letterSpacing: '0.15em',
      }}>
        <span>UODP · URBAN INTERVENTION PLANNER · DELHI NCR 2023</span>
        <span style={{ color: '#4ade80' }}>
          {activeFilter === 'all' ? `ALL ${zones.length} GRIDS` : `${filteredZones.length} ${INTERVENTION_META[activeFilter].label.toUpperCase()} GRIDS`}
        </span>
        <span>ENGINE v1.0 · CLICK GRID FOR SPECIES RECOMMENDATION</span>
      </footer>
    </div>
  );
}
