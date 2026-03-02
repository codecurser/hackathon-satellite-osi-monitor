import Papa from 'papaparse';
import { GridData, GeoJSONFeature, GeoJSONData, YearlyData } from '@/types';

export class DataProcessor {
  static parseCSV(csvText: string): GridData[] {
    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      transform: (value, field) => {
        if (field === 'AOD' || field === 'NDVI' || field === 'OSI' || field === 'Temp' || field === 'Year' || field === 'Predicted_OSI_2024') {
          return parseFloat(value) || 0;
        }
        return value;
      }
    });
    
    return result.data as GridData[];
  }

  static parseGeoJSON(geoString: string): GeoJSON.Polygon {
    try {
      const geoData = JSON.parse(geoString.replace(/""/g, '"'));
      return geoData as GeoJSON.Polygon;
    } catch (error) {
      console.error('Error parsing GeoJSON:', error);
      return {
        type: 'Polygon',
        coordinates: [[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]]]
      };
    }
  }

  static convertToGeoJSON(data: GridData[]): GeoJSONData {
    const features: GeoJSONFeature[] = data.map((row) => ({
      type: 'Feature',
      geometry: this.parseGeoJSON(row['.geo']),
      properties: row
    }));

    return {
      type: 'FeatureCollection',
      features
    };
  }

  static groupByYear(data: GridData[]): YearlyData {
    const yearlyData: YearlyData = {};
    
    data.forEach((row) => {
      const year = row.Year;
      if (!yearlyData[year]) {
        yearlyData[year] = {
          type: 'FeatureCollection',
          features: []
        };
      }
      
      yearlyData[year].features.push({
        type: 'Feature',
        geometry: this.parseGeoJSON(row['.geo']),
        properties: row
      });
    });

    return yearlyData;
  }

  static getOSIColor(value: number): string {
    if (value < 700) return '#22c55e'; // Green
    if (value < 750) return '#eab308'; // Yellow  
    if (value < 800) return '#f97316'; // Orange
    return '#ef4444'; // Red
  }

  static getRiskLevel(value: number): string {
    if (value < 700) return 'Low';
    if (value < 750) return 'Moderate';
    if (value < 800) return 'High';
    return 'Critical';
  }

  static calculateAnalytics(data: GeoJSONData, selectedYear: number, previousYearData?: GeoJSONData) {
    const features = data.features;
    const osiValues = features.map(f => f.properties.OSI);
    
    const averageOSI = osiValues.reduce((sum, val) => sum + val, 0) / osiValues.length;
    const criticalZones = features.filter(f => f.properties.OSI >= 800).length;
    const highRiskZones = features.filter(f => f.properties.OSI >= 750 && f.properties.OSI < 800).length;
    
    let yearOverYearChange = 0;
    if (previousYearData) {
      const prevAverage = previousYearData.features.reduce((sum, f) => sum + f.properties.OSI, 0) / previousYearData.features.length;
      yearOverYearChange = ((averageOSI - prevAverage) / prevAverage) * 100;
    }

    const oxygenDeficitIndex = (averageOSI - 650) / 150; // Normalized index
    const suggestedPlantationIncrease = Math.max(0, criticalZones * 0.1); // Hectares per critical zone

    return {
      averageOSI: Math.round(averageOSI * 100) / 100,
      criticalZones,
      highRiskZones,
      yearOverYearChange: Math.round(yearOverYearChange * 100) / 100,
      oxygenDeficitIndex: Math.round(oxygenDeficitIndex * 100) / 100,
      suggestedPlantationIncrease: Math.round(suggestedPlantationIncrease * 100) / 100
    };
  }

  static filterByBounds(data: GeoJSONData, bounds: { north: number; south: number; east: number; west: number }): GeoJSONData {
    const filteredFeatures = data.features.filter(feature => {
      const coords = feature.geometry.coordinates[0];
      return coords.some(([lng, lat]) => 
        lat <= bounds.north && 
        lat >= bounds.south && 
        lng <= bounds.east && 
        lng >= bounds.west
      );
    });

    return {
      type: 'FeatureCollection',
      features: filteredFeatures
    };
  }
}
