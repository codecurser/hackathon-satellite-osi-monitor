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
