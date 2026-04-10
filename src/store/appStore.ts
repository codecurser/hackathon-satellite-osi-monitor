import { create } from 'zustand';
import {
  TimeControlState, LayerControlState, MapViewState,
  BudgetConfig, GridSurvivalData, OptimizationResult,
  ROIResult, YearSnapshot, EngineTab, GreenLabState, GraphAlgorithm
} from '@/types';

interface AppState extends TimeControlState, LayerControlState {
  mapViewState: MapViewState;
  selectedFeature: any;
  selectedPlantationLocation: any;
  isLoading: boolean;
  error: string | null;

  // Engine states
  activeEngine: EngineTab;
  survivalData: GridSurvivalData[] | null;
  budgetConfig: BudgetConfig;
  optimizationResult: OptimizationResult | null;
  roiResult: ROIResult | null;
  simulationSnapshots: YearSnapshot[] | null;
  simulationYear: number;
  greenLabState: GreenLabState;

  // Actions
  setSelectedYear: (year: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaySpeed: (speed: number) => void;
  setMode: (mode: 'historical' | 'forecast') => void;
  setViewMode: (mode: '2d' | '3d') => void;
  toggleLayer: (layer: keyof Omit<LayerControlState, 'viewMode'>) => void;
  setMapViewState: (state: Partial<MapViewState>) => void;
  setSelectedFeature: (feature: any) => void;
  setSelectedPlantationLocation: (location: any) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setActiveEngine: (engine: EngineTab) => void;
  setSurvivalData: (data: GridSurvivalData[] | null) => void;
  setBudgetConfig: (config: Partial<BudgetConfig>) => void;
  setOptimizationResult: (result: OptimizationResult | null) => void;
  setROIResult: (result: ROIResult | null) => void;
  setSimulationSnapshots: (snapshots: YearSnapshot[] | null) => void;
  setSimulationYear: (year: number) => void;
  setGreenLabState: (patch: Partial<GreenLabState>) => void;
  reset: () => void;
}

const initialMapViewState: MapViewState = {
  longitude: 77.2090,
  latitude: 28.6139,
  zoom: 10,
  pitch: 0,
  bearing: 0
};

const initialTimeState: TimeControlState = {
  selectedYear: 2023,
  isPlaying: false,
  playSpeed: 1,
  mode: 'historical'
};

const initialLayerState: LayerControlState = {
  showAOD: false,
  showNDVI: false,
  showTemp: false,
  showOSI: true,
  viewMode: '2d'
};

const defaultBudgetConfig: BudgetConfig = {
  totalBudget: 5000000,
  costPerTree: 120,
  treesPerHectare: 400,
  plantableAreaPerGrid: 8,
};

export const useAppStore = create<AppState>((set) => ({
  ...initialTimeState,
  ...initialLayerState,
  mapViewState: initialMapViewState,
  selectedFeature: null,
  selectedPlantationLocation: null,
  isLoading: false,
  error: null,

  // Engine states
  activeEngine: 'osi',
  survivalData: null,
  budgetConfig: defaultBudgetConfig,
  optimizationResult: null,
  roiResult: null,
  simulationSnapshots: null,
  simulationYear: 2025,
  greenLabState: {
    primaryAlgorithm: 'greedy' as GraphAlgorithm,
    compareAlgorithm: null,
    isRunning: false,
    primaryResult: null,
    compareResult: null,
    topN: 30,
    compareMode: false,
  },

  setSelectedYear: (year) => set({ selectedYear: year }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setPlaySpeed: (speed) => set({ playSpeed: speed }),
  setMode: (mode) => set({
    mode,
    selectedYear: mode === 'forecast' ? 2024 : 2023
  }),
  setViewMode: (viewMode) => set({ viewMode }),
  toggleLayer: (layer) => set((state) => ({
    [layer]: !state[layer]
  })),
  setMapViewState: (newState) => set((state) => ({
    mapViewState: { ...state.mapViewState, ...newState }
  })),
  setSelectedFeature: (feature) => set({ selectedFeature: feature }),
  setSelectedPlantationLocation: (location) => set({ selectedPlantationLocation: location }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setActiveEngine: (engine) => set({ activeEngine: engine }),
  setSurvivalData: (data) => set({ survivalData: data }),
  setBudgetConfig: (config) => set((state) => ({
    budgetConfig: { ...state.budgetConfig, ...config }
  })),
  setOptimizationResult: (result) => set({ optimizationResult: result }),
  setROIResult: (result) => set({ roiResult: result }),
  setSimulationSnapshots: (snapshots) => set({ simulationSnapshots: snapshots }),
  setSimulationYear: (year) => set({ simulationYear: year }),
  setGreenLabState: (patch) => set((state) => ({ greenLabState: { ...state.greenLabState, ...patch } })),
  reset: () => set({
    ...initialTimeState,
    ...initialLayerState,
    mapViewState: initialMapViewState,
    selectedFeature: null,
    selectedPlantationLocation: null,
    isLoading: false,
    error: null,
    activeEngine: 'osi',
    survivalData: null,
    budgetConfig: defaultBudgetConfig,
    optimizationResult: null,
    roiResult: null,
    simulationSnapshots: null,
    simulationYear: 2025,
    greenLabState: {
      primaryAlgorithm: 'greedy' as GraphAlgorithm,
      compareAlgorithm: null,
      isRunning: false,
      primaryResult: null,
      compareResult: null,
      topN: 30,
      compareMode: false,
    },
  })
}));
