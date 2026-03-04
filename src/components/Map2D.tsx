'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useAppStore } from '@/store/appStore';
import { DataProcessor } from '@/utils/dataProcessor';
import { GeoJSONData } from '@/types';

mapboxgl.accessToken = 'no-token';

interface Map2DProps {
  data: GeoJSONData;
  selectedYear: number;
  mode: 'historical' | 'forecast';
}

const HIGHLIGHT_LAYERS = ['highlight-pulse-layer', 'highlight-layer'];
const DATA_LAYERS = ['osi-layer', 'aod-layer', 'ndvi-layer', 'temp-layer'];

const Map2D: React.FC<Map2DProps> = ({ data, selectedYear, mode }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const {
    showOSI, showAOD, showNDVI, showTemp,
    selectedFeature, selectedPlantationLocation,
    setSelectedFeature, setMapViewState,
  } = useAppStore();

  // Safe layer/source removal helper
  const safeRemoveLayers = useCallback((mapInstance: mapboxgl.Map, layerIds: string[], sourceId?: string) => {
    layerIds.forEach(id => {
      try { if (mapInstance.getLayer(id)) mapInstance.removeLayer(id); } catch (e) { /* ignore */ }
    });
    if (sourceId) {
      try { if (mapInstance.getSource(sourceId)) mapInstance.removeSource(sourceId); } catch (e) { /* ignore */ }
    }
  }, []);

  // Initialize map
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
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [{
          id: 'osm-layer',
          type: 'raster',
          source: 'osm-tiles',
          minzoom: 0,
          maxzoom: 19,
        }],
      },
      center: [77.2090, 28.6139],
      zoom: 10,
      pitch: 0,
      bearing: 0,
      antialias: true,
    });

    map.current.on('load', () => setMapLoaded(true));

    map.current.on('move', () => {
      if (map.current) {
        setMapViewState({
          longitude: map.current.getCenter().lng,
          latitude: map.current.getCenter().lat,
          zoom: map.current.getZoom(),
          pitch: map.current.getPitch(),
          bearing: map.current.getBearing(),
        });
      }
    });

    return () => {
      if (map.current) { map.current.remove(); map.current = null; }
    };
  }, [setMapViewState]);

  // Update data layers
  useEffect(() => {
    if (!map.current || !mapLoaded || !data) return;
    const m = map.current;

    // Clear existing layers and source
    safeRemoveLayers(m, DATA_LAYERS, 'data-source');

    m.addSource('data-source', { type: 'geojson', data });

    const osiProp = mode === 'forecast' ? 'Predicted_OSI_2024' : 'OSI';

    if (showOSI) {
      m.addLayer({
        id: 'osi-layer', type: 'fill', source: 'data-source',
        paint: {
          'fill-color': [
            'case',
            ['<', ['get', osiProp], 700], '#22c55e',
            ['<', ['get', osiProp], 750], '#eab308',
            ['<', ['get', osiProp], 800], '#f97316',
            '#ef4444',
          ],
          'fill-opacity': 0.7,
          'fill-outline-color': 'rgba(0,0,0,0.2)',
        },
      });
    }

    if (showAOD) {
      m.addLayer({
        id: 'aod-layer', type: 'fill', source: 'data-source',
        paint: {
          'fill-color': ['case', ['<', ['get', 'AOD'], 750], '#3b82f6', ['<', ['get', 'AOD'], 800], '#8b5cf6', '#ec4899'],
          'fill-opacity': 0.6, 'fill-outline-color': 'rgba(0,0,0,0.2)',
        },
      });
    }

    if (showNDVI) {
      m.addLayer({
        id: 'ndvi-layer', type: 'fill', source: 'data-source',
        paint: {
          'fill-color': ['case', ['<', ['get', 'NDVI'], 0.2], '#f59e0b', ['<', ['get', 'NDVI'], 0.3], '#84cc16', '#10b981'],
          'fill-opacity': 0.6, 'fill-outline-color': 'rgba(0,0,0,0.2)',
        },
      });
    }

    if (showTemp) {
      m.addLayer({
        id: 'temp-layer', type: 'fill', source: 'data-source',
        paint: {
          'fill-color': ['case', ['<', ['get', 'Temp'], 28], '#06b6d4', ['<', ['get', 'Temp'], 30], '#f59e0b', '#ef4444'],
          'fill-opacity': 0.6, 'fill-outline-color': 'rgba(0,0,0,0.2)',
        },
      });
    }

    // Click handler
    const onClick = (e: mapboxgl.MapMouseEvent) => {
      const activeLayers = DATA_LAYERS.filter(id => m.getLayer(id));
      const features = m.queryRenderedFeatures(e.point, { layers: activeLayers });
      if (features.length > 0) setSelectedFeature(features[0]);
    };

    const onMove = (e: mapboxgl.MapMouseEvent) => {
      const activeLayers = DATA_LAYERS.filter(id => m.getLayer(id));
      const features = m.queryRenderedFeatures(e.point, { layers: activeLayers });
      m.getCanvas().style.cursor = features.length > 0 ? 'pointer' : '';
    };

    m.on('click', onClick);
    m.on('mousemove', onMove);

    return () => {
      m.off('click', onClick);
      m.off('mousemove', onMove);
    };
  }, [data, mapLoaded, showOSI, showAOD, showNDVI, showTemp, mode, setSelectedFeature, safeRemoveLayers]);

  // Plantation location highlighting — fixed to remove ALL layers before source
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const m = map.current;

    // Always clean up ALL highlight layers first, then source
    safeRemoveLayers(m, HIGHLIGHT_LAYERS, 'highlight-source');

    if (!selectedPlantationLocation?.coordinates) return;

    const coords = selectedPlantationLocation.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) return;

    try {
      m.addSource('highlight-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            geometry: { type: 'Point', coordinates: coords },
            properties: { priority: selectedPlantationLocation.priority || 'medium' },
          }] as GeoJSON.Feature[],
        },
      });

      // Outer pulse ring
      m.addLayer({
        id: 'highlight-pulse-layer', type: 'circle', source: 'highlight-source',
        paint: {
          'circle-radius': 28,
          'circle-color': '#10b981',
          'circle-opacity': 0.2,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#10b981',
          'circle-stroke-opacity': 0.4,
        },
      });

      // Inner marker
      m.addLayer({
        id: 'highlight-layer', type: 'circle', source: 'highlight-source',
        paint: {
          'circle-radius': 14,
          'circle-color': '#10b981',
          'circle-opacity': 0.7,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-opacity': 0.9,
        },
      });

      m.flyTo({
        center: coords as [number, number],
        zoom: 13.5,
        speed: 1.2,
        curve: 1.3,
        easing: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
      });
    } catch (e) {
      console.warn('Highlight layer error:', e);
    }
  }, [selectedPlantationLocation, mapLoaded, safeRemoveLayers]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full rounded-xl overflow-hidden" />

      {/* Legend */}
      <div className="absolute bottom-3 left-3 bg-[#0f172a]/90 backdrop-blur-xl border border-white/[0.06] rounded-lg p-2.5">
        <h4 className="text-gray-300 font-bold text-[10px] uppercase tracking-wider mb-1.5">Risk Classification</h4>
        <div className="space-y-1">
          {[
            { color: '#22c55e', label: 'Minimal Risk', range: 'OSI < 700' },
            { color: '#eab308', label: 'Elevated Risk', range: 'OSI 700-749' },
            { color: '#f97316', label: 'High Risk', range: 'OSI 750-799' },
            { color: '#ef4444', label: 'Critical', range: 'OSI ≥ 800' },
          ].map((item) => (
            <div key={item.label} className="flex items-center space-x-1.5">
              <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color }}></div>
              <span className="text-gray-400 text-[9px]">{item.label}</span>
              <span className="text-gray-600 text-[8px] ml-auto">{item.range}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Year Badge */}
      <div className="absolute top-3 right-3 bg-[#0f172a]/90 backdrop-blur-xl border border-white/[0.06] rounded-lg px-3 py-1.5">
        <span className="text-white font-bold text-sm">{selectedYear}</span>
        {mode === 'forecast' && <span className="ml-1.5 text-[9px] text-purple-400 font-medium">AI Predicted</span>}
      </div>

      {/* Feature Inspector */}
      {selectedFeature && (
        <div className="absolute top-3 left-3 bg-[#0f172a]/95 backdrop-blur-xl border border-white/[0.06] rounded-lg p-3 max-w-xs">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-gray-200 font-bold text-[11px]">📍 Grid Inspector</h4>
            <button onClick={() => setSelectedFeature(null)} className="text-gray-500 hover:text-white transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="space-y-1 text-[10px]">
            {[
              { label: 'Year', value: selectedFeature.properties.Year },
              { label: 'Aerosol (AOD)', value: selectedFeature.properties.AOD?.toFixed(1) },
              { label: 'Vegetation (NDVI)', value: selectedFeature.properties.NDVI?.toFixed(4) },
              { label: 'Temperature', value: `${selectedFeature.properties.Temp?.toFixed(1)}°C` },
              { label: 'Stress Index (OSI)', value: selectedFeature.properties.OSI?.toFixed(1) },
            ].map(row => (
              <div key={row.label} className="flex justify-between">
                <span className="text-gray-500">{row.label}</span>
                <span className="text-white font-medium">{row.value}</span>
              </div>
            ))}
            {mode === 'forecast' && selectedFeature.properties.Predicted_OSI_2024 && (
              <div className="flex justify-between"><span className="text-gray-500">Predicted OSI</span><span className="text-purple-400 font-medium">{selectedFeature.properties.Predicted_OSI_2024.toFixed(1)}</span></div>
            )}
            <div className="flex justify-between pt-1 border-t border-white/[0.04]">
              <span className="text-gray-500">Risk Level</span>
              <span className={`font-bold ${
                selectedFeature.properties.OSI < 700 ? 'text-green-400' : selectedFeature.properties.OSI < 750 ? 'text-yellow-400' : selectedFeature.properties.OSI < 800 ? 'text-orange-400' : 'text-red-400'
              }`}>{DataProcessor.getRiskLevel(selectedFeature.properties.OSI)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Map2D;
