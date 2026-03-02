'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TimeControl from '@/components/TimeControl';
import Map2D from '@/components/Map2D';
import Map3D from '@/components/Map3D';
import AnalyticsPanel from '@/components/AnalyticsPanel';
import PlantationCards from '@/components/PlantationCards';
import { useAppStore } from '@/store/appStore';
import { DataProcessor } from '@/utils/dataProcessor';
import { GeoJSONData, YearlyData } from '@/types';

const UODPDashboard: React.FC = () => {
  const [yearlyData, setYearlyData] = useState<YearlyData>({});
  const [currentData, setCurrentData] = useState<GeoJSONData | null>(null);
  const [previousYearData, setPreviousYearData] = useState<GeoJSONData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPlantationCards, setShowPlantationCards] = useState(false);

  const { selectedYear, mode, viewMode, setLoading: setStoreLoading, setError: setStoreError } = useAppStore();

  // Load and process data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setStoreLoading(true);
        setError(null);
        setStoreError(null);

        // Load historical data (2019-2023)
        const historicalYears = [2019, 2020, 2021, 2022, 2023];
        const loadedData: YearlyData = {};

        for (const year of historicalYears) {
          try {
            const response = await fetch(`/Delhi_1km_Final_OSI_Professional_${year}.csv`);
            if (!response.ok) {
              throw new Error(`Failed to load ${year} data`);
            }
            const csvText = await response.text();
            const parsedData = DataProcessor.parseCSV(csvText);
            const geoJSONData = DataProcessor.convertToGeoJSON(parsedData);
            loadedData[year] = geoJSONData;
          } catch (err) {
            console.error(`Error loading ${year} data:`, err);
            // Continue with other years even if one fails
          }
        }

        // Load 2024 prediction data
        try {
          const response = await fetch('/Delhi_2024_OSI_Prediction.csv');
          if (response.ok) {
            const csvText = await response.text();
            const parsedData = DataProcessor.parseCSV(csvText);
            const geoJSONData = DataProcessor.convertToGeoJSON(parsedData);
            loadedData[2024] = geoJSONData;
          }
        } catch (err) {
          console.error('Error loading 2024 prediction data:', err);
        }

        setYearlyData(loadedData);
        
        // Set initial data
        const initialYear = mode === 'forecast' ? 2024 : 2023;
        if (loadedData[initialYear]) {
          setCurrentData(loadedData[initialYear]);
          if (mode === 'historical' && loadedData[initialYear - 1]) {
            setPreviousYearData(loadedData[initialYear - 1]);
          }
        }

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
        setError(errorMessage);
        setStoreError(errorMessage);
      } finally {
        setLoading(false);
        setStoreLoading(false);
      }
    };

    loadData();
  }, [mode, setStoreLoading, setStoreError]);

  // Handle year change
  const handleYearChange = useCallback((year: number) => {
    if (yearlyData && yearlyData[year]) {
      setCurrentData(yearlyData[year]);
      
      // Set previous year data for comparison
      if (mode === 'historical' && yearlyData[year - 1]) {
        setPreviousYearData(yearlyData[year - 1]);
      } else {
        setPreviousYearData(null);
      }
    }
  }, [yearlyData, mode]);

  // Update current data when mode or selected year changes
  useEffect(() => {
    const year = mode === 'forecast' ? 2024 : selectedYear;
    handleYearChange(year);
  }, [selectedYear, mode, handleYearChange]);

  // Handle location click from plantation cards
  const handleLocationClick = useCallback((location: any) => {
    // This would zoom to the specific location on the map
    console.log('Zooming to location:', location);
    // Implementation would depend on whether 2D or 3D view is active
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="flex items-center justify-center space-x-2 mb-4">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-3 h-3 bg-cyan-400 rounded-full"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
          <h2 className="text-cyan-400 text-xl font-semibold mb-2">Urban Oxygen Deficit Predictor</h2>
          <p className="text-gray-400">Loading environmental data...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-red-400 text-xl font-semibold mb-2">Data Loading Error</h2>
          <p className="text-gray-400 text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-900/50 backdrop-blur-xl border-b border-cyan-500/20"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  Urban Oxygen Deficit Predictor
                </h1>
                <p className="text-gray-400 text-sm">AI Climate Intelligence Platform</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-gray-300">Live Data</span>
              </div>
              <div className="text-sm text-gray-400">
                Delhi NCR • 1km Resolution
              </div>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-120px)]">
          {/* Left Panel - Time Control */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="col-span-3"
          >
            <TimeControl onYearChange={handleYearChange} />
          </motion.div>

          {/* Center - Map */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="col-span-6"
          >
            <div className="bg-gray-900/50 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-4 h-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-cyan-400 font-semibold">
                  {viewMode === '2d' ? '2D Map View' : '3D Globe View'}
                </h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => useAppStore.getState().setViewMode('2d')}
                    className={`px-3 py-1 rounded-lg text-sm transition-all ${
                      viewMode === '2d' 
                        ? 'bg-cyan-500 text-white' 
                        : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    2D
                  </button>
                  <button
                    onClick={() => useAppStore.getState().setViewMode('3d')}
                    className={`px-3 py-1 rounded-lg text-sm transition-all ${
                      viewMode === '3d' 
                        ? 'bg-cyan-500 text-white' 
                        : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    3D
                  </button>
                  <button
                    onClick={() => setShowPlantationCards(!showPlantationCards)}
                    className={`px-3 py-1 rounded-lg text-sm transition-all ${
                      showPlantationCards 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    Planting
                  </button>
                </div>
              </div>
              
              <div className="h-[calc(100%-3rem)]">
                <AnimatePresence mode="wait">
                  {viewMode === '2d' && currentData && (
                    <motion.div
                      key="2d"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="h-full"
                    >
                      <Map2D 
                        data={currentData} 
                        selectedYear={selectedYear}
                        mode={mode}
                      />
                    </motion.div>
                  )}
                  {viewMode === '3d' && currentData && (
                    <motion.div
                      key="3d"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="h-full"
                    >
                      <Map3D 
                        data={currentData} 
                        selectedYear={selectedYear}
                        mode={mode}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          {/* Right Panel - Analytics or Plantation Cards */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="col-span-3"
          >
            <AnimatePresence mode="wait">
              {showPlantationCards && currentData ? (
                <motion.div
                  key="plantation"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="h-full"
                >
                  <PlantationCards 
                    data={currentData}
                    selectedYear={selectedYear}
                    mode={mode}
                    onLocationClick={handleLocationClick}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="analytics"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="h-full"
                >
                  {currentData && (
                    <AnalyticsPanel 
                      data={currentData}
                      selectedYear={selectedYear}
                      previousYearData={previousYearData || undefined}
                      mode={mode}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default UODPDashboard;
