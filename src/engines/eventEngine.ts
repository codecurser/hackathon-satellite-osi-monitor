/**
 * Engine 9: Plantation Event & Growth Model
 * 
 * Implements a temporal event-driven model where real-world plantation activities
 * dynamically update environmental indicators (NDVI, OSI) over time using 
 * growth functions.
 */

import { GridSurvivalData, PlantationEvent } from '@/types';

// Growth factor: How much NDVI increases per 1000 trees at 100% maturity
const NDVI_GROWTH_FACTOR = 0.05; 
// OSI reduction factor: How much OSI decreases per 1000 trees at 100% maturity
const OSI_REDUCTION_FACTOR = 20;

/**
 * Logarithmic growth function for trees
 * Trees dont provide full benefit instantly.
 * @param daysPassed days since planting
 * @param maturityDays days until the tree provides ~90% of its benefit (def 1095 = 3 years)
 */
export function getMaturityFactor(daysPassed: number, maturityDays: number = 1095): number {
  if (daysPassed <= 0) return 0;
  // Natural log growth model
  const factor = Math.log1p(daysPassed) / Math.log1p(maturityDays);
  return Math.min(factor, 1.2); // Cap at 120% for very old trees
}

/**
 * Calculates the current impact of all plantation events on a specific grid
 */
export function calculateEventImpact(
  gridId: string, 
  events: PlantationEvent[], 
  currentDate: Date
): { ndviGain: number; osiReduction: number } {
  let totalNDVIGain = 0;
  let totalOSIReduction = 0;

  const relevantEvents = events.filter(e => e.gridId === gridId);

  relevantEvents.forEach(event => {
    const eventDate = new Date(event.date);
    if (eventDate > currentDate) return; // Event hasnt happened yet

    const msPassed = currentDate.getTime() - eventDate.getTime();
    const daysPassed = msPassed / (1000 * 60 * 60 * 24);
    
    const maturity = getMaturityFactor(daysPassed);
    
    // Scale impact by number of trees (normalized per 1000)
    const treeScale = event.treesPlanted / 1000;
    
    totalNDVIGain += (NDVI_GROWTH_FACTOR * treeScale * maturity);
    totalOSIReduction += (OSI_REDUCTION_FACTOR * treeScale * maturity);
  });

  return {
    ndviGain: totalNDVIGain,
    osiReduction: totalOSIReduction
  };
}

/**
 * Applies event impacts to an entire dataset
 */
export function applyEventsToGrids(
  grids: GridSurvivalData[], 
  events: PlantationEvent[], 
  currentYear: number
): GridSurvivalData[] {
  // We approximate the date as July 1st of the selected year for simplicity
  const currentDate = new Date(`${currentYear}-07-01`);

  return grids.map(grid => {
    const { ndviGain, osiReduction } = calculateEventImpact(grid.gridId, events, currentDate);
    
    if (ndviGain === 0 && osiReduction === 0) return grid;

    return {
      ...grid,
      currentNDVI: Math.min(grid.currentNDVI + ndviGain, 0.95),
      currentOSI: Math.max(grid.currentOSI - osiReduction, 200),
      // Recalculate survival prob slightly improved due to existing successful planting
      survivalProbability: Math.min(grid.survivalProbability + (ndviGain * 0.5), 0.98)
    };
  });
}
