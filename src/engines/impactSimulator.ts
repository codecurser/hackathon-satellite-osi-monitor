import { GeoJSONData, GridImpact, YearSnapshot, GridSnapshot } from '@/types';

/**
 * Engine 5: Multi-Year Environmental Impact Simulator
 *
 * Simulates the ecological impact of tree plantation over 4 years (2025-2028).
 * 
 * For each year:
 * 1. Trees grow → NDVI increases in planted grids
 * 2. Air quality improves → AOD decreases slightly
 * 3. Updated features → OSI recalculated
 * 4. Cumulative CO₂ absorption computed
 * 
 * Growth model: Logistic curve — slow start, rapid mid-growth, plateau
 */

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getRiskLevel(osi: number): string {
  if (osi < 700) return 'Low';
  if (osi < 750) return 'Moderate';
  if (osi < 800) return 'High';
  return 'Critical';
}

// Logistic growth curve: slow start, rapid middle, plateau
function growthFactor(yearsSincePlanting: number): number {
  // S-curve: 0→~0.95 over 7 years, inflection at year 3
  return 1 / (1 + Math.exp(-1.2 * (yearsSincePlanting - 3)));
}

const CO2_PER_TREE_KG = 22;
const O2_PER_TREE_KG = 100;

/**
 * Deep clone features for mutation safety
 */
function cloneFeatures(features: GeoJSONData['features']): GeoJSONData['features'] {
  return features.map(f => ({
    ...f,
    properties: { ...f.properties },
    geometry: { ...f.geometry },
  }));
}

/**
 * Run a multi-year simulation of plantation impact.
 * 
 * @param baseData - Current GeoJSON grid data (2024 or latest)
 * @param selectedGrids - Grids selected by the budget optimizer
 * @param years - Years to simulate, e.g. [2025, 2026, 2027, 2028]
 * @param plantingYear - Year when trees are planted (default 2024)
 */
export function simulateImpact(
  baseData: GeoJSONData,
  selectedGrids: GridImpact[],
  years: number[] = [2025, 2026, 2027, 2028],
  plantingYear: number = 2024
): YearSnapshot[] {
  if (!baseData || !baseData.features || selectedGrids.length === 0) {
    return years.map(year => ({
      year,
      avgOSI: 0,
      criticalZones: 0,
      highRiskZones: 0,
      avgNDVI: 0,
      co2AbsorbedCumulative: 0,
      oxygenGenerated: 0,
      gridSnapshots: [],
    }));
  }

  const selectedIds = new Set(selectedGrids.map(g => g.gridId));
  const gridLookup = new Map(selectedGrids.map(g => [g.gridId, g]));
  let currentFeatures = cloneFeatures(baseData.features);
  const snapshots: YearSnapshot[] = [];
  let cumulativeCO2 = 0;
  let cumulativeO2 = 0;

  for (const year of years) {
    const yearsSincePlanting = year - plantingYear;
    const growth = growthFactor(yearsSincePlanting);

    // Update planted grids
    currentFeatures = currentFeatures.map(f => {
      const id = f.properties['system:index'];
      if (!selectedIds.has(id)) return f;

      const grid = gridLookup.get(id)!;
      const newFeature = {
        ...f,
        properties: { ...f.properties },
      };

      // NDVI increases as trees grow (logistic curve × survival × expected gain)
      const ndviIncrease = grid.expectedNDVIGain * growth * grid.survivalProb;
      newFeature.properties.NDVI = clamp(
        f.properties.NDVI + ndviIncrease,
        0, 0.8
      );

      // AOD decreases slightly (trees filter particulates)
      const aodReduction = grid.survivalProb * growth * 0.04; // up to 4% reduction
      newFeature.properties.AOD = Math.max(
        200,
        f.properties.AOD * (1 - aodReduction)
      );

      // Recalculate OSI based on updated features
      // Simplified OSI model: OSI decreases when NDVI increases and AOD decreases
      const ndviEffect = ndviIncrease * -180; // more vegetation → lower stress
      const aodEffect = (newFeature.properties.AOD - f.properties.AOD) * 0.08;
      newFeature.properties.OSI = clamp(
        f.properties.OSI + ndviEffect + aodEffect,
        350, 1000
      );
      newFeature.properties.Risk_Level = getRiskLevel(newFeature.properties.OSI);

      return newFeature;
    });

    // Calculate yearly CO₂ and O₂
    const effectiveTreesThisYear = selectedGrids.reduce((sum, g) => {
      const survivalDecay = Math.max(0.85, 1 - (1 - g.survivalProb) * 0.1 * yearsSincePlanting);
      return sum + g.treesNeeded * g.survivalProb * survivalDecay * growth;
    }, 0);

    const yearCO2 = effectiveTreesThisYear * CO2_PER_TREE_KG / 1000;
    const yearO2 = effectiveTreesThisYear * O2_PER_TREE_KG / 1000;
    cumulativeCO2 += yearCO2;
    cumulativeO2 += yearO2;

    // Build snapshot
    const osiValues = currentFeatures.map(f => f.properties.OSI);
    const ndviValues = currentFeatures.map(f => f.properties.NDVI);

    const gridSnapshots: GridSnapshot[] = currentFeatures.map(f => ({
      gridId: f.properties['system:index'],
      osi: round(f.properties.OSI, 1),
      ndvi: round(f.properties.NDVI, 4),
      aod: round(f.properties.AOD, 1),
      riskLevel: f.properties.Risk_Level,
    }));

    snapshots.push({
      year,
      avgOSI: round(osiValues.reduce((s, v) => s + v, 0) / osiValues.length, 1),
      criticalZones: currentFeatures.filter(f => f.properties.OSI >= 800).length,
      highRiskZones: currentFeatures.filter(f => f.properties.OSI >= 750 && f.properties.OSI < 800).length,
      avgNDVI: round(ndviValues.reduce((s, v) => s + v, 0) / ndviValues.length, 4),
      co2AbsorbedCumulative: round(cumulativeCO2, 1),
      oxygenGenerated: round(cumulativeO2, 1),
      gridSnapshots,
    });
  }

  return snapshots;
}

/**
 * Get improvement summary comparing baseline to final simulated year
 */
export function getImprovementSummary(
  baselineData: GeoJSONData,
  snapshots: YearSnapshot[]
) {
  if (!snapshots.length || !baselineData?.features?.length) {
    return {
      osiReduction: 0, osiReductionPercent: 0,
      criticalZoneReduction: 0, ndviIncrease: 0,
      totalCO2: 0, totalO2: 0, finalYear: 0,
    };
  }

  const baseOSI = baselineData.features.reduce((s, f) => s + f.properties.OSI, 0) / baselineData.features.length;
  const baseCritical = baselineData.features.filter(f => f.properties.OSI >= 800).length;
  const baseNDVI = baselineData.features.reduce((s, f) => s + f.properties.NDVI, 0) / baselineData.features.length;
  const final = snapshots[snapshots.length - 1];

  return {
    osiReduction: round(baseOSI - final.avgOSI, 1),
    osiReductionPercent: round(((baseOSI - final.avgOSI) / baseOSI) * 100, 1),
    criticalZoneReduction: baseCritical - final.criticalZones,
    ndviIncrease: round(final.avgNDVI - baseNDVI, 4),
    totalCO2: final.co2AbsorbedCumulative,
    totalO2: final.oxygenGenerated,
    finalYear: final.year,
  };
}
