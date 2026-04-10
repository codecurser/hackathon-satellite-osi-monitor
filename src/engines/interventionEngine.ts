/**
 * Engine 8: Urban Intervention Planner
 *
 * For every 1km² Delhi grid, recommends the specific intervention:
 *  🌳 Large trees (Banyan / Peepal / Neem)
 *  🌲 Medium trees (Arjuna / Gulmohar / Moringa)
 *  🎋 Shrubs & bamboo corridors
 *  🪴 Oxygen plants (rooftop / vertical garden / indoor)
 *  🚫 CNG-only vehicle restriction
 *  ⚡ EV + CNG zone (extreme pollution)
 *  🟡 Monitored
 *  🟢 Healthy
 *
 * Plant data sourced from ICAR / Central Plantation Crops Research Institute
 * O2 output benchmarks at 5-year maturity, Delhi climate
 */

import { GridSurvivalData } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type InterventionType =
  | 'large_trees'
  | 'medium_trees'
  | 'shrubs_bamboo'
  | 'oxygen_plants'
  | 'cng_only'
  | 'ev_cng_zone'
  | 'monitored'
  | 'healthy';

export interface PlantSpec {
  id: string;
  name: string;
  scientificName: string;
  icon: string;
  o2KgPerYearPerTree: number;   // kg O₂/yr at maturity
  co2KgPerYearPerTree: number;  // kg CO₂/yr absorbed
  minNDVI: number;              // minimum NDVI needed
  maxTemp: number;              // max survivable temp (°C)
  pollutionTolerance: 'low' | 'medium' | 'high';
  growthRate: 'slow' | 'medium' | 'fast';
  spaceRequired: 'm2';
  rooftopOk: boolean;
  note: string;
}

export interface InterventionZone {
  gridId: string;
  lat: number;
  lng: number;
  coordinates: [number, number];
  interventionType: InterventionType;
  osi: number;
  ndvi: number;
  aod: number;
  temp: number;
  survivalProbability: number;
  suitabilityScore: number;
  recommendedPlants: PlantSpec[];
  treesRecommended: number;        // how many per grid
  estimatedO2TonnesPerYear: number;
  estimatedCO2TonnesPerYear: number;
  estimatedVehiclesAffected: number;
  urgency: 1 | 2 | 3;
  actionSummary: string;
  reason: string;
}

export interface InterventionResult {
  zones: InterventionZone[];
  totalGrids: number;
  byType: Record<InterventionType, number>;
  totalTreesRequired: number;
  totalO2TonnesPerYear: number;
  totalCO2TonnesPerYear: number;
  totalVehiclesAffected: number;
  executionTimeMs: number;
}

// ─── Plant Database ───────────────────────────────────────────────────────────

export const PLANT_DB: Record<string, PlantSpec> = {
  banyan: {
    id: 'banyan', name: 'Banyan', scientificName: 'Ficus benghalensis',
    icon: '🌳', o2KgPerYearPerTree: 120, co2KgPerYearPerTree: 28,
    minNDVI: 0.28, maxTemp: 45, pollutionTolerance: 'high',
    growthRate: 'slow', spaceRequired: 'm2', rooftopOk: false,
    note: 'Highest O₂ output in Delhi. Needs large open space. Sacred tree.',
  },
  peepal: {
    id: 'peepal', name: 'Peepal', scientificName: 'Ficus religiosa',
    icon: '🌳', o2KgPerYearPerTree: 100, co2KgPerYearPerTree: 22,
    minNDVI: 0.22, maxTemp: 48, pollutionTolerance: 'high',
    growthRate: 'medium', spaceRequired: 'm2', rooftopOk: false,
    note: 'Releases O₂ at night. Exceptional pollution tolerance. Urban footpath-ready.',
  },
  neem: {
    id: 'neem', name: 'Neem', scientificName: 'Azadirachta indica',
    icon: '🌲', o2KgPerYearPerTree: 85, co2KgPerYearPerTree: 18,
    minNDVI: 0.16, maxTemp: 50, pollutionTolerance: 'high',
    growthRate: 'medium', spaceRequired: 'm2', rooftopOk: false,
    note: 'Most pollution-tolerant Delhi native. Drought-resistant. Anti-bacterial.',
  },
  arjuna: {
    id: 'arjuna', name: 'Arjuna', scientificName: 'Terminalia arjuna',
    icon: '🌲', o2KgPerYearPerTree: 70, co2KgPerYearPerTree: 16,
    minNDVI: 0.25, maxTemp: 42, pollutionTolerance: 'medium',
    growthRate: 'medium', spaceRequired: 'm2', rooftopOk: false,
    note: 'Excellent in low-lying areas and near water bodies. High shade canopy.',
  },
  gulmohar: {
    id: 'gulmohar', name: 'Gulmohar', scientificName: 'Delonix regia',
    icon: '🌺', o2KgPerYearPerTree: 55, co2KgPerYearPerTree: 12,
    minNDVI: 0.14, maxTemp: 45, pollutionTolerance: 'medium',
    growthRate: 'fast', spaceRequired: 'm2', rooftopOk: false,
    note: 'Fast-growing. Good for roadside. Dense canopy reduces urban heat island.',
  },
  moringa: {
    id: 'moringa', name: 'Moringa', scientificName: 'Moringa oleifera',
    icon: '🌱', o2KgPerYearPerTree: 40, co2KgPerYearPerTree: 8,
    minNDVI: 0.08, maxTemp: 52, pollutionTolerance: 'high',
    growthRate: 'fast', spaceRequired: 'm2', rooftopOk: true,
    note: 'Extreme heat+pollution tolerant. Can grow in poor soil. Rooftop viable.',
  },
  bamboo: {
    id: 'bamboo', name: 'Bamboo', scientificName: 'Dendrocalamus strictus',
    icon: '🎋', o2KgPerYearPerTree: 35, co2KgPerYearPerTree: 12,
    minNDVI: 0.12, maxTemp: 45, pollutionTolerance: 'high',
    growthRate: 'fast', spaceRequired: 'm2', rooftopOk: true,
    note: 'Produces 35% more O₂ per acre than trees. Ideal for narrow corridors and rooftops.',
  },
  snake_plant: {
    id: 'snake_plant', name: 'Snake Plant', scientificName: 'Sansevieria trifasciata',
    icon: '🪴', o2KgPerYearPerTree: 0.8, co2KgPerYearPerTree: 0.2,
    minNDVI: 0, maxTemp: 55, pollutionTolerance: 'high',
    growthRate: 'slow', spaceRequired: 'm2', rooftopOk: true,
    note: 'NASA-certified air purifier. Filters benzene, formaldehyde. Night O₂ release.',
  },
  spider_plant: {
    id: 'spider_plant', name: 'Spider Plant', scientificName: 'Chlorophytum comosum',
    icon: '🌿', o2KgPerYearPerTree: 0.6, co2KgPerYearPerTree: 0.15,
    minNDVI: 0, maxTemp: 50, pollutionTolerance: 'high',
    growthRate: 'fast', spaceRequired: 'm2', rooftopOk: true,
    note: 'Removes 90% of formaldehyde in 24hrs. Excellent for indoor govt buildings.',
  },
  peace_lily: {
    id: 'peace_lily', name: 'Peace Lily', scientificName: 'Spathiphyllum wallisii',
    icon: '🌸', o2KgPerYearPerTree: 0.7, co2KgPerYearPerTree: 0.18,
    minNDVI: 0, maxTemp: 40, pollutionTolerance: 'medium',
    growthRate: 'medium', spaceRequired: 'm2', rooftopOk: true,
    note: 'High humidity output improves air quality. Filters ammonia and xylene.',
  },
};

// ─── Plant selection logic ────────────────────────────────────────────────────

function selectPlants(ndvi: number, temp: number, aod: number, survivalProb: number): PlantSpec[] {
  const plants: PlantSpec[] = [];

  if (survivalProb >= 0.65 && ndvi >= 0.28 && temp <= 45) {
    plants.push(PLANT_DB.banyan);
  }
  if (survivalProb >= 0.55 && ndvi >= 0.22 && temp <= 48) {
    plants.push(PLANT_DB.peepal);
  }
  if (survivalProb >= 0.45 && ndvi >= 0.16) {
    plants.push(PLANT_DB.neem);
  }
  if (survivalProb >= 0.50 && ndvi >= 0.25 && temp <= 42) {
    plants.push(PLANT_DB.arjuna);
  }
  if (survivalProb >= 0.40 && ndvi >= 0.14) {
    plants.push(PLANT_DB.gulmohar);
  }
  if (ndvi >= 0.08) {
    plants.push(PLANT_DB.moringa);
  }
  if (ndvi >= 0.12) {
    plants.push(PLANT_DB.bamboo);
  }

  // For very stressed zones or dense urban — add oxygen plants
  if (plants.length === 0 || survivalProb < 0.50) {
    plants.push(PLANT_DB.snake_plant, PLANT_DB.spider_plant, PLANT_DB.peace_lily);
  }

  return plants.slice(0, 4); // max 4 recommendations per grid
}

// ─── Intervention classification ──────────────────────────────────────────────

function classifyIntervention(g: GridSurvivalData): {
  type: InterventionType;
  plants: PlantSpec[];
  actionSummary: string;
  reason: string;
  urgency: 1 | 2 | 3;
  treesCount: number;
} {
  const { currentOSI: osi, survivalProbability: sp, currentNDVI: ndvi,
    currentTemp: temp, currentAOD: aod } = g;

  // ── Healthy ──────────────────────────────────────────────────────────────────
  if (osi < 700) {
    return {
      type: 'healthy',
      plants: [],
      actionSummary: 'No intervention required',
      reason: `OSI ${Math.round(osi)} — ecosystem within healthy bounds`,
      urgency: 1, treesCount: 0,
    };
  }

  // ── Monitored ────────────────────────────────────────────────────────────────
  if (osi < 750) {
    const plants = selectPlants(ndvi, temp, aod, sp);
    return {
      type: 'monitored',
      plants: plants.slice(0, 2),
      actionSummary: 'Preventive planting — monitor quarterly',
      reason: `OSI ${Math.round(osi)} borderline — early intervention`,
      urgency: 1, treesCount: Math.round(50 * sp),
    };
  }

  // ── High stress zones ─────────────────────────────────────────────────────────

  // EV + CNG: very high OSI + very low survival → no plantation, full vehicle ban
  if (osi >= 800 && sp < 0.40) {
    return {
      type: 'ev_cng_zone',
      plants: [PLANT_DB.snake_plant, PLANT_DB.spider_plant],
      actionSummary: 'EV + CNG Zone — petrol/diesel ban + indoor oxygen plants',
      reason: `EXTREME: OSI ${Math.round(osi)} + survival ${(sp * 100).toFixed(0)}% — plantation impossible`,
      urgency: 3, treesCount: 0,
    };
  }

  // CNG only: high OSI + low survival
  if (osi >= 750 && sp < 0.60 && sp >= 0.40) {
    return {
      type: 'cng_only',
      plants: [PLANT_DB.moringa, PLANT_DB.bamboo, PLANT_DB.snake_plant],
      actionSummary: 'CNG-Only Zone — restrict vehicles + rooftop oxygen plants',
      reason: `OSI ${Math.round(osi)} high + survival ${(sp * 100).toFixed(0)}% below plantation threshold`,
      urgency: osi >= 800 ? 3 : 2, treesCount: 0,
    };
  }

  // Oxygen plants: some survival but not enough for full trees (very dense area)
  if (osi >= 750 && sp >= 0.40 && sp < 0.55 && ndvi < 0.15) {
    return {
      type: 'oxygen_plants',
      plants: [PLANT_DB.moringa, PLANT_DB.bamboo, PLANT_DB.snake_plant, PLANT_DB.spider_plant],
      actionSummary: 'Rooftop/vertical oxygen plants — no ground space',
      reason: `High OSI ${Math.round(osi)} + low NDVI ${ndvi.toFixed(2)} — no ground space for trees`,
      urgency: 2, treesCount: Math.round(200 * sp), // pots/units
    };
  }

  // Shrubs + bamboo: moderate NDVI, medium survival
  if (ndvi < 0.22 && sp >= 0.50) {
    const plants = [PLANT_DB.bamboo, PLANT_DB.moringa, PLANT_DB.neem];
    return {
      type: 'shrubs_bamboo',
      plants,
      actionSummary: 'Shrubs & bamboo corridors — fast carbon capture',
      reason: `Moderate NDVI ${ndvi.toFixed(2)} — shrub planting more effective than full trees`,
      urgency: 2, treesCount: Math.round(150 * sp),
    };
  }

  // Medium trees: NDVI 0.22–0.28
  if (ndvi >= 0.22 && ndvi < 0.28 && sp >= 0.55) {
    const plants = selectPlants(ndvi, temp, aod, sp).filter(p => p.id !== 'banyan');
    return {
      type: 'medium_trees',
      plants: plants.slice(0, 3),
      actionSummary: 'Medium tree plantation — Neem, Gulmohar, Moringa',
      reason: `OSI ${Math.round(osi)} + NDVI ${ndvi.toFixed(2)} — suitable for medium-canopy trees`,
      urgency: 2, treesCount: Math.round(100 * sp),
    };
  }

  // Large trees: high NDVI + good survival
  const plants = selectPlants(ndvi, temp, aod, sp);
  return {
    type: 'large_trees',
    plants: plants.filter(p => !['snake_plant', 'spider_plant', 'peace_lily'].includes(p.id)).slice(0, 3),
    actionSummary: 'Full plantation — Banyan, Peepal, Neem recommended',
    reason: `OSI ${Math.round(osi)} critical + NDVI ${ndvi.toFixed(2)} + survival ${(sp * 100).toFixed(0)}% — ideal conditions`,
    urgency: 3, treesCount: Math.round(3200 * sp),
  };
}

// ─── O₂/CO₂ estimation ───────────────────────────────────────────────────────

function estimateGasOutput(plants: PlantSpec[], treesCount: number): {
  o2Tonnes: number; co2Tonnes: number;
} {
  if (!plants.length || !treesCount) return { o2Tonnes: 0, co2Tonnes: 0 };
  const avgO2  = plants.reduce((s, p) => s + p.o2KgPerYearPerTree, 0) / plants.length;
  const avgCO2 = plants.reduce((s, p) => s + p.co2KgPerYearPerTree, 0) / plants.length;
  return {
    o2Tonnes:  Math.round(avgO2  * treesCount) / 1000,
    co2Tonnes: Math.round(avgCO2 * treesCount) / 1000,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const INTERVENTION_META: Record<InterventionType, {
  label: string; icon: string; color: string; mapColor: string; desc: string;
}> = {
  healthy:      { label: 'Healthy Zone',      icon: '🟢', color: '#22c55e', mapColor: '#22c55e', desc: 'Ecosystem healthy — maintain current state' },
  monitored:    { label: 'Monitored Zone',     icon: '🟡', color: '#eab308', mapColor: '#eab308', desc: 'Borderline stress — preventive early planting' },
  large_trees:  { label: 'Large Tree Zone',    icon: '🌳', color: '#4caf50', mapColor: '#00f59d', desc: 'Full plantation: Banyan, Peepal, Neem' },
  medium_trees: { label: 'Medium Tree Zone',   icon: '🌲', color: '#84cc16', mapColor: '#84cc16', desc: 'Medium trees: Neem, Gulmohar, Arjuna, Moringa' },
  shrubs_bamboo:{ label: 'Shrub/Bamboo Zone',  icon: '🎋', color: '#14b8a6', mapColor: '#14b8a6', desc: 'Dense shrubs and bamboo corridors' },
  oxygen_plants:{ label: 'Oxygen Plant Zone',  icon: '🪴', color: '#a78bfa', mapColor: '#a78bfa', desc: 'Rooftop/vertical oxygen plants — no ground space' },
  cng_only:     { label: 'CNG-Only Zone',      icon: '🚫', color: '#ff9100', mapColor: '#ff9100', desc: 'Plantation not viable — CNG vehicles only' },
  ev_cng_zone:  { label: 'EV + CNG Zone',      icon: '⚡', color: '#ff5983', mapColor: '#ff2052', desc: 'EXTREME: All petrol/diesel banned — EV + CNG only' },
};

export function runInterventionEngine(grids: GridSurvivalData[]): InterventionResult {
  const t0 = performance.now();

  const zones: InterventionZone[] = grids.map(g => {
    const { type, plants, actionSummary, reason, urgency, treesCount } = classifyIntervention(g);
    const { o2Tonnes, co2Tonnes } = estimateGasOutput(plants, treesCount);
    const vehiclesAffected = (type === 'cng_only' || type === 'ev_cng_zone')
      ? Math.round(5600 * 0.6) : 0;

    return {
      gridId: g.gridId,
      lat: g.lat,
      lng: g.lng,
      coordinates: g.coordinates,
      interventionType: type,
      osi: g.currentOSI,
      ndvi: g.currentNDVI,
      aod: g.currentAOD,
      temp: g.currentTemp,
      survivalProbability: g.survivalProbability,
      suitabilityScore: g.suitabilityScore,
      recommendedPlants: plants,
      treesRecommended: treesCount,
      estimatedO2TonnesPerYear: o2Tonnes,
      estimatedCO2TonnesPerYear: co2Tonnes,
      estimatedVehiclesAffected: vehiclesAffected,
      urgency,
      actionSummary,
      reason,
    };
  });

  const byType = {} as Record<InterventionType, number>;
  Object.keys(INTERVENTION_META).forEach(k => { byType[k as InterventionType] = 0; });
  zones.forEach(z => { byType[z.interventionType]++; });

  const plantationZones = zones.filter(z =>
    ['large_trees', 'medium_trees', 'shrubs_bamboo', 'monitored'].includes(z.interventionType)
  );
  const vehicleZones = zones.filter(z => ['cng_only', 'ev_cng_zone'].includes(z.interventionType));

  return {
    zones,
    totalGrids: zones.length,
    byType,
    totalTreesRequired: plantationZones.reduce((s, z) => s + z.treesRecommended, 0),
    totalO2TonnesPerYear: Math.round(plantationZones.reduce((s, z) => s + z.estimatedO2TonnesPerYear, 0) * 10) / 10,
    totalCO2TonnesPerYear: Math.round(plantationZones.reduce((s, z) => s + z.estimatedCO2TonnesPerYear, 0) * 10) / 10,
    totalVehiclesAffected: vehicleZones.reduce((s, z) => s + z.estimatedVehiclesAffected, 0),
    executionTimeMs: Math.round(performance.now() - t0),
  };
}
