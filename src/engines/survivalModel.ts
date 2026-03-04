import { GeoJSONData, GridSurvivalData, SurvivalResult } from '@/types';

/**
 * Engine 2: Tree Survival & Effectiveness Predictor
 * 
 * Heuristic-based model using research-backed ecological correlations.
 * No external training data needed — uses available satellite features.
 * 
 * Key factors:
 * - NDVI: Higher existing vegetation → better soil/water → better survival
 * - Temperature: Extreme heat kills saplings (optimal 20-32°C)
 * - AOD: High pollution stunts growth and reduces photosynthesis
 * - OSI: Higher stress areas need planting but may have worse conditions
 */

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Calculate tree survival probability and expected ecological impact
 * for a single grid cell based on its environmental features.
 */
export function calculateSurvival(
  ndvi: number,
  temp: number,
  aod: number,
  osi: number
): SurvivalResult {
  // ---- Survival Probability Scoring ----
  let survival = 0.50; // base survival rate

  // NDVI Factor: Existing vegetation indicates soil quality, water availability
  // Higher NDVI = better ecosystem support for new trees
  if (ndvi > 0.40) survival += 0.22;
  else if (ndvi > 0.35) survival += 0.18;
  else if (ndvi > 0.30) survival += 0.14;
  else if (ndvi > 0.25) survival += 0.10;
  else if (ndvi > 0.20) survival += 0.05;
  else if (ndvi > 0.15) survival += 0.00;
  else if (ndvi > 0.10) survival -= 0.08;
  else survival -= 0.15; // very barren = very poor survival

  // Temperature Factor: Optimal range 20-32°C for most Delhi saplings
  // (Neem, Peepal, Banyan thrive in this range)
  if (temp >= 20 && temp <= 28) survival += 0.15;
  else if (temp > 28 && temp <= 32) survival += 0.10;
  else if (temp > 32 && temp <= 35) survival += 0.03;
  else if (temp > 35 && temp <= 38) survival -= 0.05;
  else if (temp > 38 && temp <= 42) survival -= 0.12;
  else if (temp > 42) survival -= 0.20; // extreme heat
  else if (temp < 20 && temp >= 10) survival += 0.05;
  else survival -= 0.10; // too cold (rare for Delhi)

  // Pollution/AOD Factor: High aerosol reduces photosynthesis
  if (aod < 500) survival += 0.12;
  else if (aod < 650) survival += 0.08;
  else if (aod < 750) survival += 0.03;
  else if (aod < 850) survival -= 0.02;
  else if (aod < 950) survival -= 0.08;
  else survival -= 0.12; // very high pollution

  // Urgency bonus: High-stress areas get slight boost (more resources allocated)
  if (osi > 850) survival += 0.02;
  else if (osi > 800) survival += 0.01;

  survival = clamp(survival, 0.05, 0.95);

  // ---- Expected NDVI Gain ----
  // Trees in low-NDVI areas have more room to improve
  // But survival probability limits actual gain
  const ndviHeadroom = Math.max(0, 0.45 - ndvi); // max potential NDVI
  const ndviGain = survival * ndviHeadroom * 0.35; // 35% of headroom achievable

  // ---- Stabilization Time (years) ----
  // How long until the plantation reaches ecological stability
  const baseStabilization = 3;
  const difficultyPenalty = (1 - survival) * 6;
  const tempPenalty = temp > 38 ? 1.5 : temp > 35 ? 0.5 : 0;
  const stabilizationYears = Math.round(baseStabilization + difficultyPenalty + tempPenalty);

  // ---- Composite Suitability Score (0-100) ----
  // Combines survival probability, impact potential, and urgency
  const survivalScore = survival * 40;           // max 38 pts (0.95 * 40)
  const impactScore = Math.min(ndviGain * 300, 30); // max 30 pts
  const urgencyScore = clamp((osi - 650) / 200 * 30, 0, 30); // max 30 pts
  const suitabilityScore = clamp(survivalScore + impactScore + urgencyScore, 0, 100);

  return {
    survivalProbability: round(survival, 3),
    expectedNDVIGain: round(Math.max(0.001, ndviGain), 4),
    stabilizationYears: clamp(stabilizationYears, 2, 12),
    suitabilityScore: round(suitabilityScore, 1),
  };
}

/**
 * Process all grids in the GeoJSON data to compute survival metrics.
 * Returns an array of GridSurvivalData sorted by suitability score (descending).
 */
export function processAllGridsSurvival(data: GeoJSONData): GridSurvivalData[] {
  if (!data || !data.features) return [];

  const results: GridSurvivalData[] = data.features
    .filter(f => f.properties && f.geometry && f.geometry.coordinates)
    .map(feature => {
      const props = feature.properties;
      const coords = feature.geometry.coordinates[0] as [number, number][];
      const centerLng = coords.reduce((sum, c) => sum + (c[0] || 0), 0) / coords.length;
      const centerLat = coords.reduce((sum, c) => sum + (c[1] || 0), 0) / coords.length;

      const survival = calculateSurvival(
        props.NDVI || 0,
        props.Temp || 30,
        props.AOD || 700,
        props.OSI || 700
      );

      return {
        gridId: props['system:index'] || 'unknown',
        coordinates: [centerLng, centerLat] as [number, number],
        lat: centerLat,
        lng: centerLng,
        currentOSI: props.OSI || 0,
        currentNDVI: props.NDVI || 0,
        currentAOD: props.AOD || 0,
        currentTemp: props.Temp || 0,
        ...survival,
      };
    });

  // Sort by suitability (best first)
  results.sort((a, b) => b.suitabilityScore - a.suitabilityScore);

  return results;
}

/**
 * Get summary statistics for the survival analysis
 */
export function getSurvivalSummary(grids: GridSurvivalData[]) {
  if (grids.length === 0) {
    return {
      avgSurvival: 0, medianSurvival: 0, bestSurvival: 0, worstSurvival: 0,
      avgNDVIGain: 0, totalSuitableGrids: 0, highSurvivalCount: 0,
      moderateSurvivalCount: 0, lowSurvivalCount: 0, avgStabilization: 0,
    };
  }

  const sorted = [...grids].sort((a, b) => a.survivalProbability - b.survivalProbability);
  const survProbs = grids.map(g => g.survivalProbability);

  return {
    avgSurvival: round(survProbs.reduce((s, v) => s + v, 0) / survProbs.length, 3),
    medianSurvival: round(sorted[Math.floor(sorted.length / 2)].survivalProbability, 3),
    bestSurvival: round(Math.max(...survProbs), 3),
    worstSurvival: round(Math.min(...survProbs), 3),
    avgNDVIGain: round(
      grids.reduce((s, g) => s + g.expectedNDVIGain, 0) / grids.length, 4
    ),
    totalSuitableGrids: grids.filter(g => g.survivalProbability > 0.5).length,
    highSurvivalCount: grids.filter(g => g.survivalProbability >= 0.7).length,
    moderateSurvivalCount: grids.filter(g => g.survivalProbability >= 0.4 && g.survivalProbability < 0.7).length,
    lowSurvivalCount: grids.filter(g => g.survivalProbability < 0.4).length,
    avgStabilization: round(
      grids.reduce((s, g) => s + g.stabilizationYears, 0) / grids.length, 1
    ),
  };
}

/**
 * Get survival color for visualization
 */
export function getSurvivalColor(probability: number): string {
  if (probability >= 0.75) return '#22c55e'; // bright green
  if (probability >= 0.60) return '#84cc16'; // lime
  if (probability >= 0.45) return '#eab308'; // yellow
  if (probability >= 0.30) return '#f97316'; // orange
  return '#ef4444'; // red
}
