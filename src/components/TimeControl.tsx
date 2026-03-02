'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/appStore';

interface TimeControlProps {
  onYearChange: (year: number) => void;
}

const TimeControl: React.FC<TimeControlProps> = ({ onYearChange }) => {
  const {
    selectedYear,
    isPlaying,
    playSpeed,
    mode,
    setSelectedYear,
    setIsPlaying,
    setPlaySpeed,
    setMode
  } = useAppStore();

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const years = mode === 'historical' ? [2019, 2020, 2021, 2022, 2023] : [2024];
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);

  useEffect(() => {
    if (isPlaying && mode === 'historical') {
      intervalRef.current = setInterval(() => {
        const currentYear = selectedYear;
        const nextYear = currentYear >= maxYear ? minYear : currentYear + 1;
        setSelectedYear(nextYear);
        onYearChange(nextYear);
      }, 2000 / playSpeed); // 2 seconds per year at 1x speed
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, playSpeed, mode, minYear, maxYear, setSelectedYear, onYearChange]);

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    onYearChange(year);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleModeChange = (newMode: 'historical' | 'forecast') => {
    setMode(newMode);
    setIsPlaying(false);
  };

  return (
    <div className="bg-gray-900/90 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-6 shadow-2xl">
      {/* Mode Toggle */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-cyan-400 font-semibold text-lg">Time Intelligence</h3>
        <div className="flex bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => handleModeChange('historical')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 ${
              mode === 'historical'
                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Historical Mode
          </button>
          <button
            onClick={() => handleModeChange('forecast')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 relative ${
              mode === 'forecast'
                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            AI Forecast Mode
            {mode === 'forecast' && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* Year Display */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedYear}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="text-center mb-6"
        >
          <div className="text-4xl font-bold text-white mb-2">
            {selectedYear}
            {mode === 'forecast' && (
              <span className="ml-2 text-sm text-purple-400 font-normal">
                AI Forecast
              </span>
            )}
          </div>
          {mode === 'forecast' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-purple-300 bg-purple-500/10 rounded-lg px-3 py-1 inline-block"
            >
              Generated using XGBoost regression (R² ≈ 0.966)
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Year Slider */}
      {mode === 'historical' && (
        <div className="mb-6">
          <div className="relative">
            <input
              type="range"
              min={minYear}
              max={maxYear}
              value={selectedYear}
              onChange={(e) => handleYearChange(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${((selectedYear - minYear) / (maxYear - minYear)) * 100}%, #374151 ${((selectedYear - minYear) / (maxYear - minYear)) * 100}%, #374151 100%)`
              }}
            />
            <div className="flex justify-between mt-2">
              {years.map((year) => (
                <span
                  key={year}
                  className={`text-xs font-medium cursor-pointer transition-colors ${
                    selectedYear === year ? 'text-cyan-400' : 'text-gray-500 hover:text-gray-300'
                  }`}
                  onClick={() => handleYearChange(year)}
                >
                  {year}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Playback Controls */}
      {mode === 'historical' && (
        <div className="flex items-center justify-center space-x-4 mb-4">
          <button
            onClick={togglePlayPause}
            className="w-12 h-12 bg-cyan-500 hover:bg-cyan-400 text-white rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg shadow-cyan-500/25"
          >
            <AnimatePresence mode="wait">
              {isPlaying ? (
                <motion.div
                  key="pause"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="w-4 h-4 flex items-center justify-center"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                </motion.div>
              ) : (
                <motion.div
                  key="play"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="w-4 h-4 flex items-center justify-center ml-1"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </motion.div>
              )}
            </AnimatePresence>
          </button>

          {/* Speed Control */}
          <div className="flex items-center space-x-2">
            <span className="text-gray-400 text-sm">Speed:</span>
            <div className="flex bg-gray-800 rounded-lg p-1">
              {[0.5, 1, 2].map((speed) => (
                <button
                  key={speed}
                  onClick={() => setPlaySpeed(speed)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-all duration-300 ${
                    playSpeed === speed
                      ? 'bg-cyan-500 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Animation Indicator */}
      {isPlaying && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center space-x-1"
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-cyan-400 rounded-full"
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
        </motion.div>
      )}

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          background: #06b6d4;
          cursor: pointer;
          border-radius: 50%;
          box-shadow: 0 0 10px rgba(6, 182, 212, 0.5);
        }

        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: #06b6d4;
          cursor: pointer;
          border-radius: 50%;
          border: none;
          box-shadow: 0 0 10px rgba(6, 182, 212, 0.5);
        }
      `}</style>
    </div>
  );
};

export default TimeControl;
