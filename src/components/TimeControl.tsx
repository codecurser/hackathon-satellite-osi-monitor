'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/appStore';

interface TimeControlProps {
  onYearChange: (year: number) => void;
}

const TimeControl: React.FC<TimeControlProps> = ({ onYearChange }) => {
  const {
    selectedYear, isPlaying, playSpeed, mode,
    setSelectedYear, setIsPlaying, setPlaySpeed, setMode,
  } = useAppStore();

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const years = mode === 'historical' ? [2019, 2020, 2021, 2022, 2023] : [2024];
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);

  useEffect(() => {
    if (isPlaying && mode === 'historical') {
      intervalRef.current = setInterval(() => {
        const next = selectedYear >= maxYear ? minYear : selectedYear + 1;
        setSelectedYear(next);
        onYearChange(next);
      }, 2000 / playSpeed);
    } else {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, playSpeed, mode, minYear, maxYear, setSelectedYear, onYearChange]);

  const handleYearChange = (year: number) => { setSelectedYear(year); onYearChange(year); };
  const handleModeChange = (m: 'historical' | 'forecast') => { setMode(m); setIsPlaying(false); };

  return (
    <div className="bg-[#0b1120]/80 backdrop-blur-xl border border-white/[0.04] rounded-2xl p-4">
      {/* Mode Toggle */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-gray-300 font-bold text-xs tracking-wide flex items-center">
          <span className="mr-1.5">⏱️</span>Time Control
        </h3>
        <div className="flex bg-[#0f172a] rounded-lg p-0.5 border border-white/[0.04]">
          <button onClick={() => handleModeChange('historical')}
            className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${
              mode === 'historical' ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow' : 'text-gray-500 hover:text-white'
            }`}>Historical</button>
          <button onClick={() => handleModeChange('forecast')}
            className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all relative ${
              mode === 'forecast' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow' : 'text-gray-500 hover:text-white'
            }`}>
            Forecast
            {mode === 'forecast' && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />}
          </button>
        </div>
      </div>

      {/* Year Display */}
      <AnimatePresence mode="wait">
        <motion.div key={selectedYear} initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
          className="text-center mb-3">
          <div className="text-3xl font-black text-white">
            {selectedYear}
            {mode === 'forecast' && <span className="ml-2 text-xs text-purple-400 font-normal">AI</span>}
          </div>
          {mode === 'forecast' && (
            <div className="text-[9px] text-purple-400/70 bg-purple-500/10 rounded px-2 py-0.5 inline-block mt-1">
              XGBoost R² ≈ 0.966
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Year Slider */}
      {mode === 'historical' && (
        <div className="mb-3">
          <input type="range" min={minYear} max={maxYear} value={selectedYear}
            onChange={(e) => handleYearChange(parseInt(e.target.value))}
            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${((selectedYear - minYear) / (maxYear - minYear)) * 100}%, #1e293b ${((selectedYear - minYear) / (maxYear - minYear)) * 100}%, #1e293b 100%)`
            }} />
          <div className="flex justify-between mt-1">
            {years.map((year) => (
              <span key={year} onClick={() => handleYearChange(year)}
                className={`text-[10px] font-medium cursor-pointer transition-colors ${
                  selectedYear === year ? 'text-cyan-400' : 'text-gray-600 hover:text-gray-400'
                }`}>{year}</span>
            ))}
          </div>
        </div>
      )}

      {/* Playback */}
      {mode === 'historical' && (
        <div className="flex items-center justify-center space-x-3">
          <button onClick={() => setIsPlaying(!isPlaying)}
            className="w-8 h-8 bg-cyan-500 hover:bg-cyan-400 text-white rounded-full flex items-center justify-center transition-all shadow-[0_0_10px_rgba(6,182,212,0.3)]">
            {isPlaying ? (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
            ) : (
              <svg className="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            )}
          </button>
          <div className="flex items-center space-x-1">
            <span className="text-gray-500 text-[9px]">Speed:</span>
            <div className="flex bg-[#0f172a] rounded p-0.5 border border-white/[0.04]">
              {[0.5, 1, 2].map((speed) => (
                <button key={speed} onClick={() => setPlaySpeed(speed)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                    playSpeed === speed ? 'bg-cyan-500 text-white' : 'text-gray-500 hover:text-white'
                  }`}>{speed}x</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Playing indicator */}
      {isPlaying && (
        <div className="flex items-center justify-center space-x-1 mt-2">
          {[0, 1, 2].map((i) => (
            <motion.div key={i} className="w-1.5 h-1.5 bg-cyan-400 rounded-full"
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }} />
          ))}
        </div>
      )}

      <style jsx>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none; width: 16px; height: 16px; background: #06b6d4;
          cursor: pointer; border-radius: 50%; box-shadow: 0 0 8px rgba(6,182,212,0.5);
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px; height: 16px; background: #06b6d4;
          cursor: pointer; border-radius: 50%; border: none; box-shadow: 0 0 8px rgba(6,182,212,0.5);
        }
      `}</style>
    </div>
  );
};

export default TimeControl;
