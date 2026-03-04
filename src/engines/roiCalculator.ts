import { OptimizationResult, ROIResult, BudgetConfig } from '@/types';

/**
 * Engine 4: Environmental Return on Investment (ROI) Calculator
 *
 * Computes environmental impact metrics from the optimized plantation plan.
 * Useful for policymakers to quantify the value of their investment.
 *
 * Constants are based on published ecological research:
 * - Avg mature tree absorbs ~22 kg CO₂/year (EPA data)
 * - Avg mature tree produces ~100 kg O₂/year
 * - Avg mature tree retains ~15,000 liters water/year (intercepting rainfall)
 */

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Ecological constants (per tree, per year, at maturity)
const CO2_ABSORPTION_KG_PER_TREE = 22;
const O2_PRODUCTION_KG_PER_TREE = 100;
const WATER_RETENTION_LITERS_PER_TREE = 15000;
const MATURITY_FACTOR_YEAR1 = 0.15; // saplings absorb less in year 1

/**
 * Calculate comprehensive Environmental ROI from an optimization result.
 */
export function calculateROI(
  optimization: OptimizationResult,
  config: BudgetConfig
): ROIResult {
  const { selectedGrids, totalTrees, totalCost } = optimization;

  if (selectedGrids.length === 0) {
    return {
      predictedOSIReduction: 0,
      riskCategoryImprovement: 0,
      co2AbsorptionTonnes: 0,
      impactPerLakh: 0,
      environmentalROI: 0,
      oxygenGeneratedKg: 0,
      treesPerCriticalZone: 0,
      waterRetentionLiters: 0,
    };
  }

  // 1. Predicted OSI Reduction (avg across selected grids)
  const avgOSIReduction = selectedGrids.reduce((sum, g) => {
    // OSI drops proportional to survival × NDVI gain × current stress
    const reduction = g.currentOSI * g.survivalProb * g.expectedNDVIGain * 0.6;
    return sum + reduction;
  }, 0) / selectedGrids.length;

  // 2. Risk Category Improvement %
  // Grids likely to improve at least one risk category
  const improvingGrids = selectedGrids.filter(g =>
    g.survivalProb > 0.45 && g.expectedNDVIGain > 0.015
  ).length;
  const riskImprovement = (improvingGrids / selectedGrids.length) * 100;

  // 3. CO₂ Absorption (1st year estimate with survival factored in)
  const effectiveTrees = selectedGrids.reduce((sum, g) =>
    sum + g.treesNeeded * g.survivalProb, 0
  );
  const co2Year1 = effectiveTrees * CO2_ABSORPTION_KG_PER_TREE * MATURITY_FACTOR_YEAR1;
  const co2Tonnes = co2Year1 / 1000;

  // 4. Oxygen Generation
  const o2Year1 = effectiveTrees * O2_PRODUCTION_KG_PER_TREE * MATURITY_FACTOR_YEAR1;

  // 5. Water Retention
  const waterRetention = effectiveTrees * WATER_RETENTION_LITERS_PER_TREE * MATURITY_FACTOR_YEAR1;

  // 6. Impact per Lakh (₹1,00,000)
  const impactPerLakh = totalCost > 0
    ? optimization.totalImpactScore / (totalCost / 100000)
    : 0;

  // 7. Trees per critical zone
  const criticalGrids = selectedGrids.filter(g => g.currentOSI >= 800);
  const treesPerCritical = criticalGrids.length > 0
    ? totalTrees / criticalGrids.length
    : totalTrees;

  // 8. Composite Environmental ROI Score (0–100)
  const osiScore = clamp(avgOSIReduction / 60, 0, 1) * 25;          // max 25
  const riskScore = (riskImprovement / 100) * 25;                     // max 25
  const co2Score = clamp(co2Tonnes / 100, 0, 1) * 25;               // max 25
  const efficiencyScore = clamp(impactPerLakh * 50, 0, 1) * 25;     // max 25
  const environmentalROI = clamp(osiScore + riskScore + co2Score + efficiencyScore, 0, 100);

  return {
    predictedOSIReduction: round(avgOSIReduction, 1),
    riskCategoryImprovement: round(riskImprovement, 1),
    co2AbsorptionTonnes: round(co2Tonnes, 1),
    impactPerLakh: round(impactPerLakh, 4),
    environmentalROI: round(environmentalROI, 1),
    oxygenGeneratedKg: round(o2Year1, 0),
    treesPerCriticalZone: round(treesPerCritical, 0),
    waterRetentionLiters: round(waterRetention, 0),
  };
}

/**
 * Get the ROI grade label based on the composite score
 */
export function getROIGrade(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Excellent', color: '#22c55e' };
  if (score >= 60) return { label: 'Good', color: '#84cc16' };
  if (score >= 40) return { label: 'Moderate', color: '#eab308' };
  if (score >= 20) return { label: 'Low', color: '#f97316' };
  return { label: 'Poor', color: '#ef4444' };
}

/**
 * Generate a policy summary text
 */
export function generatePolicySummary(
  roi: ROIResult,
  optimization: OptimizationResult,
  config: BudgetConfig
): string {
  const budget = config.totalBudget >= 10000000
    ? `₹${round(config.totalBudget / 10000000, 2)} Crore`
    : `₹${round(config.totalBudget / 100000, 1)} Lakh`;

  return `With a budget of ${budget}, the optimized plan plants ${optimization.totalTrees.toLocaleString()} trees across ${optimization.selectedGrids.length} high-impact grids. `
    + `Expected first-year outcomes: ${roi.co2AbsorptionTonnes} tonnes CO₂ absorbed, `
    + `${roi.oxygenGeneratedKg.toLocaleString()} kg oxygen generated, `
    + `and an average OSI reduction of ${roi.predictedOSIReduction} points. `
    + `${roi.riskCategoryImprovement}% of selected zones are expected to improve their risk category. `
    + `Environmental ROI Score: ${roi.environmentalROI}/100.`;
}
