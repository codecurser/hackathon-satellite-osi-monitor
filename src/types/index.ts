export interface GridData {
  'system:index': string;
  AOD: number;
  NDVI: number;
  OSI: number;
  Risk_Level: string;
  Temp: number;
  Year: number;
  '.geo': string;
  Predicted_OSI_2024?: number;
  Risk_2024?: string;
}

export interface GeoJSONFeature {
  type: 'Feature';
  geometry: GeoJSON.Polygon;
  properties: GridData;
}

export interface GeoJSONData {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

export interface YearlyData {
  [year: number]: GeoJSONData;
}

export interface AnalyticsData {
  averageOSI: number;
  criticalZones: number;
  highRiskZones: number;
  yearOverYearChange: number;
  oxygenDeficitIndex: number;
  suggestedPlantationIncrease: number;
}

export interface MapViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

export interface TimeControlState {
  selectedYear: number;
  isPlaying: boolean;
  playSpeed: number;
  mode: 'historical' | 'forecast';
}

export interface LayerControlState {
  showAOD: boolean;
  showNDVI: boolean;
  showTemp: boolean;
  showOSI: boolean;
  viewMode: '2d' | '3d';
}

// ========== ENGINE 2: Tree Survival Types ==========
export interface SurvivalResult {
  survivalProbability: number;
  expectedNDVIGain: number;
  stabilizationYears: number;
  suitabilityScore: number;
}

export interface GridSurvivalData {
  gridId: string;
  coordinates: [number, number];
  lat: number;
  lng: number;
  currentOSI: number;
  currentNDVI: number;
  currentAOD: number;
  currentTemp: number;
  survivalProbability: number;
  expectedNDVIGain: number;
  stabilizationYears: number;
  suitabilityScore: number;
}

// ========== ENGINE 3: Budget Optimizer Types ==========
export interface BudgetConfig {
  totalBudget: number;
  costPerTree: number;
  treesPerHectare: number;
  plantableAreaPerGrid: number;
}

export interface GridImpact {
  gridId: string;
  coordinates: [number, number];
  lat: number;
  lng: number;
  impactScore: number;
  efficiencyRatio: number;
  treesNeeded: number;
  costForGrid: number;
  survivalProb: number;
  expectedNDVIGain: number;
  currentOSI: number;
  osiReductionPotential: number;
  rank: number;
}

export interface OptimizationResult {
  selectedGrids: GridImpact[];
  totalTrees: number;
  totalCost: number;
  budgetUtilization: number;
  totalImpactScore: number;
  averageSurvival: number;
  gridsEvaluated: number;
}

// ========== ENGINE 4: ROI Calculator Types ==========
export interface ROIResult {
  predictedOSIReduction: number;
  riskCategoryImprovement: number;
  co2AbsorptionTonnes: number;
  impactPerLakh: number;
  environmentalROI: number;
  oxygenGeneratedKg: number;
  treesPerCriticalZone: number;
  waterRetentionLiters: number;
}

// ========== ENGINE 5: Multi-Year Simulator Types ==========
export interface GridSnapshot {
  gridId: string;
  osi: number;
  ndvi: number;
  aod: number;
  riskLevel: string;
}

export interface YearSnapshot {
  year: number;
  avgOSI: number;
  criticalZones: number;
  highRiskZones: number;
  avgNDVI: number;
  co2AbsorbedCumulative: number;
  oxygenGenerated: number;
  gridSnapshots: GridSnapshot[];
}

// ========== Dashboard Types ==========
export type EngineTab = 'osi' | 'survival' | 'budget' | 'roi' | 'simulation' | 'greenlab' | 'policy';

// ========== ENGINE 6: Graph Optimizer Types ==========
export type GraphAlgorithm = 'greedy' | 'pagerank' | 'centrality' | 'dijkstra' | 'mst' | 'maxcoverage';

export interface AlgorithmResult {
  algorithm: GraphAlgorithm;
  selectedGridIds: string[];
  edges?: [number, number][][]; // Array of paths (each path is an array of [lng, lat])
  treesRequired: number;
  osiReductionPct: number;
  coverageArea: number;       // km²
  impactScore: number;
  executionTimeMs: number;
  highlights: string[];       // human-readable callouts
}

export interface GreenLabState {
  primaryAlgorithm: GraphAlgorithm;
  compareAlgorithm: GraphAlgorithm | null;
  isRunning: boolean;
  primaryResult: AlgorithmResult | null;
  compareResult: AlgorithmResult | null;
  topN: number;
  compareMode: boolean;
}

// ========== ENGINE 7: Policy Engine Types ==========
export type ZoneType = 'green' | 'plantation' | 'cng_restriction' | 'critical_cng' | 'monitored';

export interface PolicyZone {
  gridId: string;
  coordinates: [number, number];
  lat: number;
  lng: number;
  zoneType: ZoneType;
  osi: number;
  ndvi: number;
  aod: number;
  temp: number;
  survivalProbability: number;
  suitabilityScore: number;
  reason: string;           // human-readable reason for classification
  estimatedVehicles: number; // daily vehicles affected (heuristic)
  co2ReductionKg: number;   // daily CO2 reduction if CNG enforced
  urgencyLevel: 1 | 2 | 3; // 1=low, 2=medium, 3=high
}

export interface PolicyResult {
  zones: PolicyZone[];
  totalGrids: number;
  greenZones: number;
  plantationZones: number;
  cngRestrictionZones: number;
  criticalCngZones: number;
  monitoredZones: number;
  totalEstimatedVehiclesAffected: number;
  totalCO2ReductionTonnesPerDay: number;
  totalPlantationAreaKm2: number;
  executionTimeMs: number;
}

export interface PolicyState {
  result: PolicyResult | null;
  isRunning: boolean;
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

export interface YearlyData {
  [year: number]: GeoJSONData;
}

export interface AnalyticsData {
  averageOSI: number;
  criticalZones: number;
  highRiskZones: number;
  yearOverYearChange: number;
  oxygenDeficitIndex: number;
  suggestedPlantationIncrease: number;
}

export interface MapViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

export interface TimeControlState {
  selectedYear: number;
  isPlaying: boolean;
  playSpeed: number;
  mode: 'historical' | 'forecast';
}

export interface LayerControlState {
  showAOD: boolean;
  showNDVI: boolean;
  showTemp: boolean;
  showOSI: boolean;
  viewMode: '2d' | '3d';
}

// ========== ENGINE 2: Tree Survival Types ==========
export interface SurvivalResult {
  survivalProbability: number;
  expectedNDVIGain: number;
  stabilizationYears: number;
  suitabilityScore: number;
}

export interface GridSurvivalData {
  gridId: string;
  coordinates: [number, number];
  lat: number;
  lng: number;
  currentOSI: number;
  currentNDVI: number;
  currentAOD: number;
  currentTemp: number;
  survivalProbability: number;
  expectedNDVIGain: number;
  stabilizationYears: number;
  suitabilityScore: number;
}

// ========== ENGINE 3: Budget Optimizer Types ==========
export interface BudgetConfig {
  totalBudget: number;
  costPerTree: number;
  treesPerHectare: number;
  plantableAreaPerGrid: number;
}

export interface GridImpact {
  gridId: string;
  coordinates: [number, number];
  lat: number;
  lng: number;
  impactScore: number;
  efficiencyRatio: number;
  treesNeeded: number;
  costForGrid: number;
  survivalProb: number;
  expectedNDVIGain: number;
  currentOSI: number;
  osiReductionPotential: number;
  rank: number;
}

export interface OptimizationResult {
  selectedGrids: GridImpact[];
  totalTrees: number;
  totalCost: number;
  budgetUtilization: number;
  totalImpactScore: number;
  averageSurvival: number;
  gridsEvaluated: number;
}

// ========== ENGINE 4: ROI Calculator Types ==========
export interface ROIResult {
  predictedOSIReduction: number;
  riskCategoryImprovement: number;
  co2AbsorptionTonnes: number;
  impactPerLakh: number;
  environmentalROI: number;
  oxygenGeneratedKg: number;
  treesPerCriticalZone: number;
  waterRetentionLiters: number;
}

// ========== ENGINE 5: Multi-Year Simulator Types ==========
export interface GridSnapshot {
  gridId: string;
  osi: number;
  ndvi: number;
  aod: number;
  riskLevel: string;
}

export interface YearSnapshot {
  year: number;
  avgOSI: number;
  criticalZones: number;
  highRiskZones: number;
  avgNDVI: number;
  co2AbsorbedCumulative: number;
  oxygenGenerated: number;
  gridSnapshots: GridSnapshot[];
}

// ========== Dashboard Types ==========
export type EngineTab = 'osi' | 'survival' | 'budget' | 'roi' | 'simulation' | 'greenlab' | 'policy';

// ========== ENGINE 6: Graph Optimizer Types ==========
export type GraphAlgorithm = 'greedy' | 'pagerank' | 'centrality' | 'dijkstra' | 'mst' | 'maxcoverage';

export interface AlgorithmResult {
  algorithm: GraphAlgorithm;
  selectedGridIds: string[];
  edges?: [number, number][][]; // Array of paths (each path is an array of [lng, lat])
  treesRequired: number;
  osiReductionPct: number;
  coverageArea: number;       // km²
  impactScore: number;
  executionTimeMs: number;
  highlights: string[];       // human-readable callouts
}

export interface GreenLabState {
  primaryAlgorithm: GraphAlgorithm;
  compareAlgorithm: GraphAlgorithm | null;
  isRunning: boolean;
  primaryResult: AlgorithmResult | null;
  compareResult: AlgorithmResult | null;
  topN: number;
  compareMode: boolean;
}

// ========== ENGINE 7: Policy Engine Types ==========
export type ZoneType = 'green' | 'plantation' | 'cng_restriction' | 'critical_cng' | 'monitored';

export interface PolicyZone {
  gridId: string;
  coordinates: [number, number];
  lat: number;
  lng: number;
  zoneType: ZoneType;
  osi: number;
  ndvi: number;
  aod: number;
  temp: number;
  survivalProbability: number;
  suitabilityScore: number;
  reason: string;           // human-readable reason for classification
  estimatedVehicles: number; // daily vehicles affected (heuristic)
  co2ReductionKg: number;   // daily CO2 reduction if CNG enforced
  urgencyLevel: 1 | 2 | 3; // 1=low, 2=medium, 3=high
}

export interface PolicyResult {
  zones: PolicyZone[];
  totalGrids: number;
  greenZones: number;
  plantationZones: number;
  cngRestrictionZones: number;
  criticalCngZones: number;
  monitoredZones: number;
  totalEstimatedVehiclesAffected: number;
  totalCO2ReductionTonnesPerDay: number;
  totalPlantationAreaKm2: number;
  executionTimeMs: number;
}

export interface PolicyState {
  result: PolicyResult | null;
  isRunning: boolean;
  showPolicyLayer: boolean;
  osiThreshold: number;       // grids above this are "stressed" (default 750)
  survivalThreshold: number;  // below this, plantation not viable (default 0.35)
}

export type PlantationEvent = {
  id: string;
  gridId: string;
  date: string; // ISO format or Year-Month
  treesPlanted: number;
  species: string;
  impactApplied: boolean;
};
