import { GridSurvivalData, BudgetConfig, GridImpact, OptimizationResult } from '@/types';

/**
 * Engine 3: Budget-Constrained Plantation Optimizer
 * 
 * Uses a greedy knapsack algorithm to select the optimal set of grids
 * that maximize environmental impact under a given budget constraint.
 * 
 * Impact Score = Survival_Probability × Expected_NDVI_Gain × OSI_Reduction_Potential
 * Selection = Greedy by efficiency ratio (impact per ₹)
 */

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

const DEFAULT_CONFIG: BudgetConfig = {
  totalBudget: 5000000,       // ₹50,00,000 (50 Lakh)
  costPerTree: 120,           // ₹120 per tree
  treesPerHectare: 400,       // standard density
  plantableAreaPerGrid: 8,    // ~8 hectares plantable per 1km² grid
};

/**
 * Calculate the impact score for a single grid.
 * Higher score = more environmental benefit from planting here.
 */
function calculateImpactScore(grid: GridSurvivalData): number {
  // OSI Reduction Potential: how much benefit from reducing stress
  // Normalized to 0-1 range (grids with OSI > 700 benefit more)
  const osiReduction = Math.max(0, (grid.currentOSI - 650) / 250);

  // Combine the three factors
  const impact = grid.survivalProbability * grid.expectedNDVIGain * osiReduction;

  // Scale for readability (multiply by 1000)
  return round(impact * 1000, 3);
}

/**
 * Run the budget-constrained plantation optimization.
 * 
 * Algorithm: Greedy Knapsack
 * 1. Calculate impact score for each grid
 * 2. Calculate cost per grid (area × trees/ha × cost/tree)
 * 3. Sort by efficiency ratio (impact per ₹)
 * 4. Greedily select grids until budget is exhausted
 */
export function optimizePlantation(
  survivalData: GridSurvivalData[],
  config: BudgetConfig = DEFAULT_CONFIG
): OptimizationResult {
  if (!survivalData || survivalData.length === 0) {
    return {
      selectedGrids: [],
      totalTrees: 0,
      totalCost: 0,
      budgetUtilization: 0,
      totalImpactScore: 0,
      averageSurvival: 0,
      gridsEvaluated: 0,
    };
  }

  // Step 1: Score all grids
  const scoredGrids: GridImpact[] = survivalData
    .filter(g => g.survivalProbability > 0.15) // skip very low survival grids
    .map(grid => {
      const treesNeeded = config.plantableAreaPerGrid * config.treesPerHectare;
      const costForGrid = treesNeeded * config.costPerTree;
      const impactScore = calculateImpactScore(grid);
      const osiReduction = Math.max(0, (grid.currentOSI - 650) / 250);

      return {
        gridId: grid.gridId,
        coordinates: grid.coordinates,
        lat: grid.lat,
        lng: grid.lng,
        impactScore,
        efficiencyRatio: costForGrid > 0 ? round(impactScore / (costForGrid / 100000), 4) : 0,
        treesNeeded,
        costForGrid,
        survivalProb: grid.survivalProbability,
        expectedNDVIGain: grid.expectedNDVIGain,
        currentOSI: grid.currentOSI,
        osiReductionPotential: round(osiReduction, 3),
        rank: 0,
      };
    });

  // Step 2: Sort by efficiency ratio (bang for buck)
  scoredGrids.sort((a, b) => b.efficiencyRatio - a.efficiencyRatio);

  // Step 3: Greedy selection under budget constraint
  const selected: GridImpact[] = [];
  let remainingBudget = config.totalBudget;

  for (const grid of scoredGrids) {
    // Stop when budget is exhausted
    if (remainingBudget < grid.costForGrid) continue;
    if (grid.impactScore <= 0) continue;
    
    grid.rank = selected.length + 1;
    selected.push(grid);
    remainingBudget -= grid.costForGrid;
    
    // Stop if no budget left at all
    if (remainingBudget <= 0) break;
  }

  // Calculate summary statistics
  const totalTrees = selected.reduce((s, g) => s + g.treesNeeded, 0);
  const totalCost = config.totalBudget - remainingBudget;
  const totalImpact = selected.reduce((s, g) => s + g.impactScore, 0);
  const avgSurvival = selected.length > 0
    ? selected.reduce((s, g) => s + g.survivalProb, 0) / selected.length
    : 0;

  return {
    selectedGrids: selected,
    totalTrees,
    totalCost: round(totalCost, 0),
    budgetUtilization: round((totalCost / config.totalBudget) * 100, 1),
    totalImpactScore: round(totalImpact, 2),
    averageSurvival: round(avgSurvival, 3),
    gridsEvaluated: scoredGrids.length,
  };
}

/**
 * Format currency in Indian Rupee Lakhs/Crores
 */
export function formatINR(amount: number): string {
  if (amount >= 10000000) return `₹${round(amount / 10000000, 2)} Cr`;
  if (amount >= 100000) return `₹${round(amount / 100000, 2)} L`;
  if (amount >= 1000) return `₹${round(amount / 1000, 1)}K`;
  return `₹${amount}`;
}

/**
 * Get the default budget configuration
 */
export function getDefaultBudgetConfig(): BudgetConfig {
  return { ...DEFAULT_CONFIG };
}
