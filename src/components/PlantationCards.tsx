'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { GeoJSONData } from '@/types';
import { DataProcessor } from '@/utils/dataProcessor';
import { useAppStore } from '@/store/appStore';

interface PlantationLocation {
  id: string;
  coordinates: [number, number];
  lat: number;
  lng: number;
  osiValue: number;
  predictedOSI?: number;
  riskLevel: string;
  areaRequired: number; // in hectares
  priority: 'urgent' | 'high' | 'medium';
  address: string;
  ndvi: number;
  aod: number;
  temperature: number;
}

interface PlantationCardsProps {
  data: GeoJSONData;
  selectedYear: number;
  mode: 'historical' | 'forecast';
  onLocationClick?: (location: PlantationLocation) => void;
}

const PlantationCards: React.FC<PlantationCardsProps> = ({ 
  data, 
  selectedYear, 
  mode, 
  onLocationClick 
}) => {
  const { setSelectedPlantationLocation, setViewMode } = useAppStore();
  const criticalLocations = useMemo(() => {
    if (!data || !data.features || data.features.length === 0) {
      return [];
    }
    
    const features = data.features.filter(f => f.properties && f.properties.OSI >= 800); // Critical zones
    
    // Sort by OSI value (highest first) and take top 10
    const sortedFeatures = features
      .sort((a, b) => (b.properties?.OSI || 0) - (a.properties?.OSI || 0))
      .slice(0, 10);

    return sortedFeatures.map((feature, index) => {
      if (!feature.geometry || !feature.geometry.coordinates || !feature.properties) {
        return null;
      }
      
      const coords = feature.geometry.coordinates[0] as [number, number][]; // First ring of polygon
      const centerLng = coords.reduce((sum, coord) => sum + (coord[0] || 0), 0) / coords.length;
      const centerLat = coords.reduce((sum, coord) => sum + (coord[1] || 0), 0) / coords.length;
      
      // Generate approximate address based on coordinates (Delhi area)
      const getAddress = (lat: number, lng: number) => {
        if (lat > 28.7) return 'North Delhi';
        if (lat > 28.6) return 'Central Delhi';
        if (lat > 28.5) return 'South Delhi';
        if (lat > 28.4) return 'New Delhi';
        return 'Far South Delhi';
      };

      const osiValue = mode === 'forecast' ? 
        (feature.properties.Predicted_OSI_2024 || feature.properties.OSI) : 
        feature.properties.OSI;

      const priority: 'urgent' | 'high' | 'medium' = index < 3 ? 'urgent' : index < 6 ? 'high' : 'medium';
      
      return {
        id: feature.properties['system:index'] || `location-${index}`,
        coordinates: [centerLng, centerLat] as [number, number],
        lat: centerLat,
        lng: centerLng,
        osiValue: feature.properties.OSI || 0,
        predictedOSI: feature.properties.Predicted_OSI_2024,
        riskLevel: 'Critical',
        areaRequired: Math.max(0.5, ((osiValue || 800) - 800) * 0.01), // Scale area based on severity
        priority,
        address: getAddress(centerLat, centerLng),
        ndvi: feature.properties.NDVI || 0,
        aod: feature.properties.AOD || 0,
        temperature: feature.properties.Temp || 0
      } as PlantationLocation;
    }).filter(Boolean); // Remove any null entries
  }, [data, mode]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityBorderColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-red-500/50';
      case 'high': return 'border-orange-500/50';
      case 'medium': return 'border-yellow-500/50';
      default: return 'border-gray-500/50';
    }
  };

  const totalAreaRequired = criticalLocations.reduce((sum, loc) => sum + (loc?.areaRequired || 0), 0);

  return (
    <div className="bg-gray-900/90 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-6 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-cyan-400 font-semibold text-lg">Critical Plantation Zones</h3>
        <div className="text-sm text-gray-400">
          {criticalLocations.length} locations • {totalAreaRequired.toFixed(1)} ha total
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
          <div className="text-red-400 text-2xl font-bold">
            {criticalLocations.filter(l => l.priority === 'urgent').length}
          </div>
          <div className="text-red-300 text-xs">Urgent</div>
        </div>
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 text-center">
          <div className="text-orange-400 text-2xl font-bold">
            {criticalLocations.filter(l => l.priority === 'high').length}
          </div>
          <div className="text-orange-300 text-xs">High Priority</div>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-center">
          <div className="text-yellow-400 text-2xl font-bold">
            {criticalLocations.filter(l => l.priority === 'medium').length}
          </div>
          <div className="text-yellow-300 text-xs">Medium Priority</div>
        </div>
      </div>

      {/* Location Cards */}
      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
        {criticalLocations.map((location, index) => {
          if (!location) return null;
          
          return (
          <motion.div
            key={location.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`bg-gray-800/50 border ${getPriorityBorderColor(location.priority)} rounded-xl p-4 hover:bg-gray-800/70 transition-all duration-300 cursor-pointer group`}
            onClick={() => {
              setSelectedPlantationLocation(location);
              setViewMode('2d'); // Switch to 2D view for better visibility
              onLocationClick?.(location);
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className={`w-2 h-2 ${getPriorityColor(location.priority)} rounded-full`}></span>
                  <span className="text-white font-medium capitalize">{location.priority} Priority</span>
                  <span className="text-gray-400 text-xs">#{index + 1}</span>
                </div>
                <div className="text-gray-300 text-sm font-medium">{location.address}</div>
                <div className="text-gray-500 text-xs mt-1">
                  {location.lat?.toFixed(4)}°N, {location.lng?.toFixed(4)}°E
                </div>
              </div>
              <div className="text-right">
                <div className="text-red-400 text-lg font-bold">
                  {location.osiValue?.toFixed(1)}
                </div>
                <div className="text-gray-400 text-xs">OSI</div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 text-xs">
              <div>
                <div className="text-gray-400">Area</div>
                <div className="text-green-400 font-medium">{(location.areaRequired || 0).toFixed(2)} ha</div>
              </div>
              <div>
                <div className="text-gray-400">NDVI</div>
                <div className="text-green-400 font-medium">{(location.ndvi || 0).toFixed(3)}</div>
              </div>
              <div>
                <div className="text-gray-400">AOD</div>
                <div className="text-blue-400 font-medium">{(location.aod || 0).toFixed(0)}</div>
              </div>
              <div>
                <div className="text-gray-400">Temp</div>
                <div className="text-orange-400 font-medium">{(location.temperature || 0).toFixed(1)}°C</div>
              </div>
            </div>

            {mode === 'forecast' && location.predictedOSI && (
              <div className="mt-3 pt-3 border-t border-gray-700/50">
                <div className="flex items-center justify-between">
                  <span className="text-purple-400 text-xs">2024 Prediction</span>
                  <span className="text-purple-400 font-medium">{location.predictedOSI.toFixed(1)}</span>
                </div>
                <div className="text-gray-500 text-xs mt-1">
                  Change: {(((location.predictedOSI - (location.osiValue || 0)) / (location.osiValue || 1)) * 100).toFixed(1)}%
                </div>
              </div>
            )}

            {/* Hover hint */}
            <div className="mt-3 text-center">
              <span className="text-cyan-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                Click to highlight on map
              </span>
            </div>
          </motion.div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-700/50">
        <div className="flex items-center justify-between text-sm">
          <div className="text-gray-400">
            Total plantation needed: <span className="text-green-400 font-medium">{totalAreaRequired.toFixed(1)} hectares</span>
          </div>
          <div className="text-gray-400">
            Est. trees: <span className="text-green-400 font-medium">{Math.round(totalAreaRequired * 400)}</span>
          </div>
        </div>
        <div className="text-gray-500 text-xs mt-2">
          Based on 400 trees per hectare density
        </div>
      </div>
    </div>
  );
};

export default PlantationCards;
