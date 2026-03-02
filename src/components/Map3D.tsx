'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { useAppStore } from '@/store/appStore';
import { GeoJSONData } from '@/types';

// Set your Cesium ion access token
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3NjE4MmYzOC1mNjY4LTQ5MzEtYjBjMy0xY2FlNjQxN2MwYjAiLCJpZCI6MTA2MzQsInNjb3BlcyI6WyJhc3IiLCJnYyJdLCJpYXQiOjE1NTgxMTcwNDJ9.q4c_Z-6lMP_28aXxc8tqPqIPRLaA-6JXfm4WTw7tBQ'; // Demo token

interface Map3DProps {
  data: GeoJSONData;
  selectedYear: number;
  mode: 'historical' | 'forecast';
}

const Map3D: React.FC<Map3DProps> = ({ data, selectedYear, mode }) => {
  const cesiumContainer = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const dataSourceRef = useRef<Cesium.GeoJsonDataSource | null>(null);
  const [cesiumLoaded, setCesiumLoaded] = useState(false);

  const { selectedFeature, setSelectedFeature, selectedPlantationLocation } = useAppStore();

  const getOSIColor = useCallback((value: number): Cesium.Color => {
    if (value < 700) return Cesium.Color.GREEN;
    if (value < 750) return Cesium.Color.YELLOW;
    if (value < 800) return Cesium.Color.ORANGE;
    return Cesium.Color.RED;
  }, []);

  useEffect(() => {
    if (!cesiumContainer.current || viewerRef.current) return;

    const viewer = new Cesium.Viewer(cesiumContainer.current, {
      timeline: false,
      animation: false,
      infoBox: false,
      selectionIndicator: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      baseLayerPicker: false,
      geocoder: false,
      fullscreenButton: false,
      vrButton: false,
    });

    // Set initial view to Delhi
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(77.2090, 28.6139, 50000),
      duration: 2.0
    });

    // Enable lighting based on sun/moon positions
    viewer.scene.globe.enableLighting = true;

    viewerRef.current = viewer;
    setCesiumLoaded(true);

    // Add click handler for feature selection
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((click: any) => {
      const pickedObject = viewer.scene.pick(click.position);
      if (Cesium.defined(pickedObject) && pickedObject.id) {
        const entity = pickedObject.id as Cesium.Entity;
        if (entity.properties) {
          const properties = entity.properties.getValue(Cesium.JulianDate.now());
          setSelectedFeature({
            properties: properties,
            geometry: { type: 'Polygon', coordinates: [] }
          });
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      handler.destroy();
      viewer.destroy();
      viewerRef.current = null;
    };
  }, [setSelectedFeature]);

  useEffect(() => {
    if (!viewerRef.current || !cesiumLoaded || !data) return;

    const viewer = viewerRef.current;

    // Remove existing data source
    if (dataSourceRef.current) {
      viewer.dataSources.remove(dataSourceRef.current);
    }

    // Load new GeoJSON data
    Cesium.GeoJsonDataSource.load(data, {
      stroke: Cesium.Color.BLACK,
      strokeWidth: 0.5,
      fill: Cesium.Color.WHITE.withAlpha(0.7),
      clampToGround: true
    }).then((dataSource) => {
      dataSourceRef.current = dataSource;
      viewer.dataSources.add(dataSource);

      // Style entities based on OSI values
      const entities = dataSource.entities.values;
      entities.forEach((entity) => {
        if (entity.properties) {
          const properties = entity.properties.getValue(Cesium.JulianDate.now());
          const osiValue = mode === 'forecast' ? properties.Predicted_OSI_2024 : properties.OSI;
          
          if (osiValue && entity.polygon) {
            const color = getOSIColor(osiValue);
            entity.polygon.material = new Cesium.ColorMaterialProperty(color.withAlpha(0.8));
            entity.polygon.extrudedHeight = new Cesium.ConstantProperty(100); // Add some height for 3D effect
          }
        }
      });

      // Fly to the data extent
      viewer.flyTo(dataSource, {
        duration: 1.5
      });
    });

  }, [data, cesiumLoaded, mode, getOSIColor]);

  // Handle plantation location highlighting in 3D
  useEffect(() => {
    if (!viewerRef.current || !cesiumLoaded || !selectedPlantationLocation) return;

    const viewer = viewerRef.current;

    // Remove existing highlight entities
    const highlightEntities = viewer.entities.values.filter(entity => 
      entity.id && entity.id.toString().startsWith('highlight-')
    );
    highlightEntities.forEach(entity => viewer.entities.remove(entity));

    // Create highlight entity for selected plantation location
    const highlightEntity = viewer.entities.add({
      id: `highlight-${selectedPlantationLocation.id}`,
      position: Cesium.Cartesian3.fromDegrees(
        selectedPlantationLocation.coordinates[0], 
        selectedPlantationLocation.coordinates[1],
        100
      ),
      point: {
        pixelSize: 20,
        color: Cesium.Color.LIME,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 3,
        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
      },
      label: {
        text: `Planting Zone\nPriority: ${selectedPlantationLocation.priority.toUpperCase()}`,
        font: '14pt sans-serif',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -30),
        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
      }
    });

    // Fly to the selected location
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        selectedPlantationLocation.coordinates[0],
        selectedPlantationLocation.coordinates[1],
        2000
      ),
      duration: 2.0,
      easingFunction: Cesium.EasingFunction.LINEAR_NONE
    });

  }, [selectedPlantationLocation, cesiumLoaded]);

  return (
    <div className="relative w-full h-full">
      <div ref={cesiumContainer} className="w-full h-full rounded-2xl overflow-hidden" />
      
      {/* 3D Globe Controls */}
      <div className="absolute top-4 right-4 bg-gray-900/90 backdrop-blur-xl border border-cyan-500/20 rounded-xl p-3">
        <div className="flex flex-col space-y-2">
          <button
            onClick={() => {
              if (viewerRef.current) {
                viewerRef.current.camera.flyTo({
                  destination: Cesium.Cartesian3.fromDegrees(77.2090, 28.6139, 50000),
                  duration: 2.0
                });
              }
            }}
            className="px-3 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg text-sm transition-colors"
          >
            Reset View
          </button>
          <button
            onClick={() => {
              if (viewerRef.current) {
                viewerRef.current.scene.globe.enableLighting = !viewerRef.current.scene.globe.enableLighting;
              }
            }}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
          >
            Toggle Lighting
          </button>
        </div>
      </div>

      {/* Year Badge */}
      <div className="absolute top-4 left-4 bg-gray-900/90 backdrop-blur-xl border border-cyan-500/20 rounded-xl px-4 py-2">
        <div className="text-white font-bold text-lg">
          {selectedYear}
          {mode === 'forecast' && (
            <span className="ml-2 text-xs text-purple-400 font-normal">AI</span>
          )}
        </div>
      </div>

      {/* Feature Popup */}
      {selectedFeature && (
        <div className="absolute bottom-4 left-4 bg-gray-900/95 backdrop-blur-xl border border-cyan-500/20 rounded-xl p-4 max-w-sm">
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
                {selectedFeature.properties.OSI < 700 ? 'Low' :
                 selectedFeature.properties.OSI < 750 ? 'Moderate' :
                 selectedFeature.properties.OSI < 800 ? 'High' : 'Critical'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {!cesiumLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90 rounded-2xl">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
            <p className="text-cyan-400">Loading 3D Globe...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Map3D;
