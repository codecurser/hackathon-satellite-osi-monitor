import { create } from 'zustand';
import { TimeControlState, LayerControlState, MapViewState } from '@/types';

interface AppState extends TimeControlState, LayerControlState {
  mapViewState: MapViewState;
  selectedFeature: any;
  selectedPlantationLocation: any;
  isLoading: boolean;
  error: string | null;
  
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
  reset: () => void;
}

const initialMapViewState: MapViewState = {
  longitude: 77.2090, // Delhi center
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

export const useAppStore = create<AppState>((set, get) => ({
  ...initialTimeState,
  ...initialLayerState,
  mapViewState: initialMapViewState,
  selectedFeature: null,
  selectedPlantationLocation: null,
  isLoading: false,
  error: null,

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
  
  reset: () => set({
    ...initialTimeState,
    ...initialLayerState,
    mapViewState: initialMapViewState,
    selectedFeature: null,
    selectedPlantationLocation: null,
    isLoading: false,
    error: null
  })
}));
