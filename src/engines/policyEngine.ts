/**
 * Engine 7: Urban Policy Engine
 *
 * Classifies every 1km² grid into one of 5 policy zones:
 *
 *  🟢 GREEN          – OSI < 700, healthy, no intervention needed
 *  🌱 PLANTATION     – High OSI + good survival → plant trees
 *  🟠 CNG RESTRICTION – High OSI + low survival → CNG-only vehicles
 *  🔴 CRITICAL CNG   – Very high OSI + very low survival → immediate ban + enforcement
 *  🟡 MONITORED      – Moderate OSI, watch and reassess
 *
 * Vehicle estimate heuristic:
 *   Delhi avg ~8.5M registered vehicles across ~1500km² built-up area
 *   ≈ ~5,600 vehicles per km² (conservative urban estimate)
 *
 * CO₂ reduction heuristic:
 *   Average Delhi vehicle emits ~4.2 kg CO₂/day
 *   CNG vehicle emits ~1.8 kg CO₂/day → saving ~2.4 kg/vehicle/day
 *   We assume enforcing CNG in a zone converts 60% of petrol/diesel vehicles
 */

import { GridSurvivalData, PolicyZone, PolicyResult, ZoneType } from '@/types';

/* ── Constants ─────────────────────────────────────────────────────────────── */
const VEHICLES_PER_KM2        = 5600;   // avg vehicles/km²
const CO2_SAVING_KG_PER_VEH   = 2.4;   // kg CO2/day saved per vehicle converting to CNG
const CNG_CONVERSION_RATE     = 0.60;   // 60% of vehicles can be converted

/* ── Classification ─────────────────────────────────────────────────────────── */
function classifyGrid(
  g: GridSurvivalData,
  osiThreshold: number,
  survivalThreshold: number
): { zoneType: ZoneType; reason: string; urgencyLevel: 1 | 2 | 3 } {

  const { currentOSI: osi, survivalProbability: sp, suitabilityScore: ss } = g;

  // ── Green: healthy ──────────────────────────────────────────────────────────
  if (osi < 700) {
    return {
      zoneType: 'green',
      reason: `OSI ${Math.round(osi)} is below stress threshold — ecosystem healthy`,
      urgencyLevel: 1,
    };
  }

  // ── Monitored: borderline ───────────────────────────────────────────────────
  if (osi < osiThreshold) {
    return {
      zoneType: 'monitored',
      reason: `OSI ${Math.round(osi)} is moderate — monitor quarterly`,
      urgencyLevel: 1,
    };
  }

  // ── High OSI zone — check survival viability ────────────────────────────────
  if (osi >= osiThreshold) {

    // Good survival → plantation
    if (sp >= survivalThreshold) {
      return {
        zoneType: 'plantation',
        reason: `OSI ${Math.round(osi)} critical + survival ${(sp * 100).toFixed(0)}% viable → plantation recommended`,
        urgencyLevel: osi >= 800 ? 3 : 2,
      };
    }

    // Low survival + very high OSI → critical CNG ban
    if (sp < 0.40 && osi >= 800) {
      return {
        zoneType: 'critical_cng',
        reason: `OSI ${Math.round(osi)} extreme + survival ${(sp * 100).toFixed(0)}% (plantation not viable) → IMMEDIATE CNG BAN`,
        urgencyLevel: 3,
      };
    }

    // Low survival + high OSI → CNG restriction
    return {
      zoneType: 'cng_restriction',
      reason: `OSI ${Math.round(osi)} high + survival ${(sp * 100).toFixed(0)}% below viable threshold (${(survivalThreshold*100).toFixed(0)}%) — CNG vehicles only`,
      urgencyLevel: osi >= 800 ? 3 : 2,
    };
  }

  return { zoneType: 'monitored', reason: 'Borderline zone', urgencyLevel: 1 };
}

/* ── CO₂ / vehicle estimates ─────────────────────────────────────────────────── */
function estimateVehicleImpact(zoneType: ZoneType): { vehicles: number; co2Kg: number } {
  if (zoneType === 'green' || zoneType === 'monitored' || zoneType === 'plantation') {
    return { vehicles: 0, co2Kg: 0 };
  }
  const vehicles = Math.round(VEHICLES_PER_KM2 * CNG_CONVERSION_RATE);
  const co2Kg    = Math.round(vehicles * CO2_SAVING_KG_PER_VEH);
  return { vehicles, co2Kg };
}

/* ── Public API ─────────────────────────────────────────────────────────────── */
export function runPolicyEngine(
  grids: GridSurvivalData[],
  osiThreshold = 750,
  survivalThreshold = 0.60
): PolicyResult {
  const t0 = performance.now();

  const zones: PolicyZone[] = grids.map(g => {
    const { zoneType, reason, urgencyLevel } = classifyGrid(g, osiThreshold, survivalThreshold);
    const { vehicles, co2Kg }               = estimateVehicleImpact(zoneType);

    return {
      gridId: g.gridId,
      coordinates: g.coordinates,
      lat: g.lat,
      lng: g.lng,
      zoneType,
      osi: g.currentOSI,
      ndvi: g.currentNDVI,
      aod: g.currentAOD,
      temp: g.currentTemp,
      survivalProbability: g.survivalProbability,
      suitabilityScore: g.suitabilityScore,
      reason,
      estimatedVehicles: vehicles,
      co2ReductionKg: co2Kg,
      urgencyLevel,
    };
  });

  const count = (t: ZoneType) => zones.filter(z => z.zoneType === t).length;

  const cngZones = zones.filter(z => z.zoneType === 'cng_restriction' || z.zoneType === 'critical_cng');

  return {
    zones,
    totalGrids: zones.length,
    greenZones: count('green'),
    plantationZones: count('plantation'),
    cngRestrictionZones: count('cng_restriction'),
    criticalCngZones: count('critical_cng'),
    monitoredZones: count('monitored'),
    totalEstimatedVehiclesAffected: cngZones.reduce((s, z) => s + z.estimatedVehicles, 0),
    totalCO2ReductionTonnesPerDay: Math.round(cngZones.reduce((s, z) => s + z.co2ReductionKg, 0)) / 1000,
    totalPlantationAreaKm2: count('plantation'),
    executionTimeMs: Math.round(performance.now() - t0),
  };
}

/* ── Zone metadata (colors, labels) for UI ────────────────────────────────── */
export const ZONE_META: Record<ZoneType, {
  label: string; icon: string; color: string; mapColor: string; description: string;
}> = {
  green: {
    label: 'Green Zone',
    icon: '🟢',
    color: '#22c55e',
    mapColor: '#22c55e',
    description: 'Healthy ecosystem. No intervention required.',
  },
  plantation: {
    label: 'Plantation Zone',
    icon: '🌱',
    color: '#4caf50',
    mapColor: '#00f59d',
    description: 'High OSI + viable survival. Plant trees here.',
  },
  monitored: {
    label: 'Monitored Zone',
    icon: '🟡',
    color: '#eab308',
    mapColor: '#eab308',
    description: 'Moderate stress. Monitor regularly.',
  },
  cng_restriction: {
    label: 'CNG Restriction Zone',
    icon: '🚫',
    color: '#ff9100',
    mapColor: '#ff9100',
    description: 'Plantation not viable. Only CNG vehicles permitted.',
  },
  critical_cng: {
    label: 'Critical CNG Ban Zone',
    icon: '🔴',
    color: '#ff5983',
    mapColor: '#ff2052',
    description: 'Extreme OSI + no plantation viability. IMMEDIATE vehicle restriction.',
  },
};
