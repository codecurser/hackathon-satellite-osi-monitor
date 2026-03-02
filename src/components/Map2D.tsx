'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useAppStore } from '@/store/appStore';
import { DataProcessor } from '@/utils/dataProcessor';
import { GeoJSONData } from '@/types';

// Use OpenStreetMap with Mapbox GL JS (no token required for OSM tiles)
mapboxgl.accessToken = 'no-token';

interface Map2DProps {
  data: GeoJSONData;
  selectedYear: number;
  mode: 'historical' | 'forecast';
}

const Map2D: React.FC<Map2DProps> = ({ data, selectedYear, mode }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  const { 
    showOSI, 
    showAOD, 
    showNDVI, 
    showTemp,
    selectedFeature,
    selectedPlantationLocation,
    setSelectedFeature,
    setMapViewState 
  } = useAppStore();

  const getOSIColor = useCallback((value: number): string => {
    if (value < 700) return '#22c55e'; // Green
    if (value < 750) return '#eab308'; // Yellow  
    if (value < 800) return '#f97316'; // Orange
    return '#ef4444'; // Red
  }, []);

  const getLayerColor = useCallback((property: string, value: number): string => {
    switch (property) {
      case 'AOD':
        if (value < 750) return '#3b82f6'; // Blue
        if (value < 800) return '#8b5cf6'; // Purple
        return '#ec4899'; // Pink
      case 'NDVI':
        if (value < 0.2) return '#f59e0b'; // Amber
        if (value < 0.3) return '#84cc16'; // Lime
        return '#10b981'; // Emerald
      case 'Temp':
        if (value < 28) return '#06b6d4'; // Cyan
        if (value < 30) return '#f59e0b'; // Amber
        return '#ef4444'; // Red
      default:
        return getOSIColor(value);
    }
  }, [getOSIColor]);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors'
          }
        },
        layers: [
          {
            id: 'osm-layer',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19
          }
        ]
      },
      center: [77.2090, 28.6139], // Delhi center
      zoom: 10,
      pitch: 0,
      bearing: 0,
      antialias: true
    });

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    map.current.on('move', () => {
      if (map.current) {
        setMapViewState({
          longitude: map.current.getCenter().lng,
          latitude: map.current.getCenter().lat,
          zoom: map.current.getZoom(),
          pitch: map.current.getPitch(),
          bearing: map.current.getBearing()
        });
      }
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [setMapViewState]);

  useEffect(() => {
    if (!map.current || !mapLoaded || !data) return;

    const mapInstance = map.current;

    // Remove existing layers and sources
    const layersToRemove = ['osi-layer', 'aod-layer', 'ndvi-layer', 'temp-layer'];
    layersToRemove.forEach(layerId => {
      if (mapInstance.getLayer(layerId)) {
        mapInstance.removeLayer(layerId);
      }
    });

    if (mapInstance.getSource('data-source')) {
      mapInstance.removeSource('data-source');
    }

    // Add new data source
    mapInstance.addSource('data-source', {
      type: 'geojson',
      data: data
    });

    // Add OSI layer
    if (showOSI) {
      mapInstance.addLayer({
        id: 'osi-layer',
        type: 'fill',
        source: 'data-source',
        paint: {
          'fill-color': [
            'case',
            ['<', ['get', mode === 'forecast' ? 'Predicted_OSI_2024' : 'OSI'], 700],
            '#22c55e',
            ['<', ['get', mode === 'forecast' ? 'Predicted_OSI_2024' : 'OSI'], 750],
            '#eab308',
            ['<', ['get', mode === 'forecast' ? 'Predicted_OSI_2024' : 'OSI'], 800],
            '#f97316',
            '#ef4444'
          ],
          'fill-opacity': 0.7,
          'fill-outline-color': '#000000'
        }
      });
    }

    // Add AOD layer
    if (showAOD) {
      mapInstance.addLayer({
        id: 'aod-layer',
        type: 'fill',
        source: 'data-source',
        paint: {
          'fill-color': [
            'case',
            ['<', ['get', 'AOD'], 750],
            '#3b82f6',
            ['<', ['get', 'AOD'], 800],
            '#8b5cf6',
            '#ec4899'
          ],
          'fill-opacity': 0.6,
          'fill-outline-color': '#000000'
        }
      });
    }

    // Add NDVI layer
    if (showNDVI) {
      mapInstance.addLayer({
        id: 'ndvi-layer',
        type: 'fill',
        source: 'data-source',
        paint: {
          'fill-color': [
            'case',
            ['<', ['get', 'NDVI'], 0.2],
            '#f59e0b',
            ['<', ['get', 'NDVI'], 0.3],
            '#84cc16',
            '#10b981'
          ],
          'fill-opacity': 0.6,
          'fill-outline-color': '#000000'
        }
      });
    }

    // Add Temperature layer
    if (showTemp) {
      mapInstance.addLayer({
        id: 'temp-layer',
        type: 'fill',
        source: 'data-source',
        paint: {
          'fill-color': [
            'case',
            ['<', ['get', 'Temp'], 28],
            '#06b6d4',
            ['<', ['get', 'Temp'], 30],
            '#f59e0b',
            '#ef4444'
          ],
          'fill-opacity': 0.6,
          'fill-outline-color': '#000000'
        }
      });
    }

    // Add hover effect
    mapInstance.on('mousemove', (e) => {
      const features = mapInstance.queryRenderedFeatures(e.point, {
        layers: layersToRemove.filter(layerId => mapInstance.getLayer(layerId))
      });

      mapInstance.getCanvas().style.cursor = features.length > 0 ? 'pointer' : '';
    });

    // Add click handler
    mapInstance.on('click', (e) => {
      const features = mapInstance.queryRenderedFeatures(e.point, {
        layers: layersToRemove.filter(layerId => mapInstance.getLayer(layerId))
      });

      if (features.length > 0) {
        setSelectedFeature(features[0]);
      }
    });

  }, [data, mapLoaded, showOSI, showAOD, showNDVI, showTemp, mode, setSelectedFeature]);

  // Handle plantation location highlighting
  useEffect(() => {
    if (!map.current || !mapLoaded || !selectedPlantationLocation) return;

    const mapInstance = map.current;

    // Remove existing highlight layer
    if (mapInstance.getLayer('highlight-layer')) {
      mapInstance.removeLayer('highlight-layer');
    }
    if (mapInstance.getSource('highlight-source')) {
      mapInstance.removeSource('highlight-source');
    }

    // Create highlight feature for selected plantation location
    const highlightFeature: GeoJSON.Feature = {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: selectedPlantationLocation.coordinates
      },
      properties: selectedPlantationLocation
    };

    // Add highlight source and layer
    mapInstance.addSource('highlight-source', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [highlightFeature] as GeoJSON.Feature[]
      }
    });

    mapInstance.addLayer({
      id: 'highlight-layer',
      type: 'circle',
      source: 'highlight-source',
      paint: {
        'circle-radius': 20,
        'circle-color': '#10b981',
        'circle-opacity': 0.8,
        'circle-stroke-width': 3,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-opacity': 1
      }
    });

    // Add pulsing animation
    mapInstance.addLayer({
      id: 'highlight-pulse-layer',
      type: 'circle',
      source: 'highlight-source',
      paint: {
        'circle-radius': 30,
        'circle-color': '#10b981',
        'circle-opacity': 0.3
      }
    });

    // Fly to the selected location
    mapInstance.flyTo({
      center: selectedPlantationLocation.coordinates,
      zoom: 14,
      speed: 1.2,
      curve: 1.4,
      easing(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      }
    });

  }, [selectedPlantationLocation, mapLoaded]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full rounded-2xl overflow-hidden" />
      
      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 bg-gray-900/90 backdrop-blur-xl border border-cyan-500/20 rounded-xl p-4">
        <h4 className="text-cyan-400 font-semibold text-sm mb-3">OSI Risk Levels</h4>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-gray-300 text-xs">Low (&lt;700)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span className="text-gray-300 text-xs">Moderate (700-749)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span className="text-gray-300 text-xs">High (750-799)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-gray-300 text-xs">Critical (≥800)</span>
          </div>
        </div>
      </div>

      {/* Year Badge */}
      <div className="absolute top-4 right-4 bg-gray-900/90 backdrop-blur-xl border border-cyan-500/20 rounded-xl px-4 py-2">
        <div className="text-white font-bold text-lg">
          {selectedYear}
          {mode === 'forecast' && (
            <span className="ml-2 text-xs text-purple-400 font-normal">AI</span>
          )}
        </div>
      </div>

      {/* Feature Popup */}
      {selectedFeature && (
        <div className="absolute top-4 left-4 bg-gray-900/95 backdrop-blur-xl border border-cyan-500/20 rounded-xl p-4 max-w-sm">
          <div className="flex justify-between items-start mb-3">
            <h4 className="text-cyan-400 font-semibold">Grid Details</h4>
            <button
              onClick={() => setSelectedFeature(null)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Year:</span>
              <span className="text-white font-medium">{selectedFeature.properties.Year}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">AOD:</span>
              <span className="text-white font-medium">{selectedFeature.properties.AOD?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">NDVI:</span>
              <span className="text-white font-medium">{selectedFeature.properties.NDVI?.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Temperature:</span>
              <span className="text-white font-medium">{selectedFeature.properties.Temp?.toFixed(1)}°C</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">OSI:</span>
              <span className="text-white font-medium">{selectedFeature.properties.OSI?.toFixed(2)}</span>
            </div>
            {mode === 'forecast' && selectedFeature.properties.Predicted_OSI_2024 && (
              <div className="flex justify-between">
                <span className="text-gray-400">Predicted OSI:</span>
                <span className="text-purple-400 font-medium">{selectedFeature.properties.Predicted_OSI_2024.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-400">Risk Level:</span>
              <span className={`font-medium ${
                selectedFeature.properties.OSI < 700 ? 'text-green-400' :
                selectedFeature.properties.OSI < 750 ? 'text-yellow-400' :
                selectedFeature.properties.OSI < 800 ? 'text-orange-400' :
                'text-red-400'
              }`}>
                {DataProcessor.getRiskLevel(selectedFeature.properties.OSI)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Map2D;
