'use client';

import React, { useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { motion } from 'framer-motion';
import { GeoJSONData, AnalyticsData } from '@/types';
import { DataProcessor } from '@/utils/dataProcessor';

interface AnalyticsPanelProps {
  data: GeoJSONData;
  selectedYear: number;
  previousYearData?: GeoJSONData;
  mode: 'historical' | 'forecast';
}

const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ 
  data, 
  selectedYear, 
  previousYearData, 
  mode 
}) => {
  const analytics = useMemo(() => {
    return DataProcessor.calculateAnalytics(data, selectedYear, previousYearData);
  }, [data, selectedYear, previousYearData]);

  const riskDistribution = useMemo(() => {
    const features = data.features;
    const low = features.filter(f => f.properties.OSI < 700).length;
    const moderate = features.filter(f => f.properties.OSI >= 700 && f.properties.OSI < 750).length;
    const high = features.filter(f => f.properties.OSI >= 750 && f.properties.OSI < 800).length;
    const critical = features.filter(f => f.properties.OSI >= 800).length;

    return [
      { name: 'Low', value: low, color: '#22c55e' },
      { name: 'Moderate', value: moderate, color: '#eab308' },
      { name: 'High', value: high, color: '#f97316' },
      { name: 'Critical', value: critical, color: '#ef4444' }
    ];
  }, [data]);

  const featureImportance = useMemo(() => {
    // This would normally come from the trained model
    // For demo purposes, we'll use mock data
    return [
      { feature: 'AOD', importance: 0.42, color: '#3b82f6' },
      { feature: 'NDVI', importance: 0.28, color: '#10b981' },
      { feature: 'Temperature', importance: 0.18, color: '#f59e0b' },
      { feature: 'Year', importance: 0.12, color: '#8b5cf6' }
    ];
  }, []);

  const yearlyTrend = useMemo(() => {
    // Mock trend data - in real app, this would come from actual historical data
    return [
      { year: 2019, osi: 752 },
      { year: 2020, osi: 765 },
      { year: 2021, osi: 778 },
      { year: 2022, osi: 791 },
      { year: 2023, osi: 803 },
      { year: 2024, osi: analytics.averageOSI }
    ];
  }, [analytics.averageOSI]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900/95 backdrop-blur-xl border border-cyan-500/20 rounded-lg p-3">
          <p className="text-cyan-400 text-sm font-medium">{`${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-white text-sm" style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gray-900/90 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-6 shadow-2xl h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-cyan-400 font-semibold text-lg">AI Insights</h3>
        {mode === 'forecast' && (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
            <span className="text-purple-400 text-xs font-medium">AI Forecast</span>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50"
        >
          <div className="text-gray-400 text-xs mb-1">Average OSI</div>
          <div className="text-white text-2xl font-bold">{analytics.averageOSI}</div>
          {analytics.yearOverYearChange !== 0 && (
            <div className={`text-xs mt-1 ${
              analytics.yearOverYearChange > 0 ? 'text-red-400' : 'text-green-400'
            }`}>
              {analytics.yearOverYearChange > 0 ? '↑' : '↓'} {Math.abs(analytics.yearOverYearChange)}%
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50"
        >
          <div className="text-gray-400 text-xs mb-1">Critical Zones</div>
          <div className="text-red-400 text-2xl font-bold">{analytics.criticalZones}</div>
          <div className="text-gray-500 text-xs mt-1">High Risk: {analytics.highRiskZones}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50"
        >
          <div className="text-gray-400 text-xs mb-1">O₂ Deficit Index</div>
          <div className="text-cyan-400 text-2xl font-bold">{analytics.oxygenDeficitIndex}</div>
          <div className="text-gray-500 text-xs mt-1">Normalized scale</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50"
        >
          <div className="text-gray-400 text-xs mb-1">Plantation Needed</div>
          <div className="text-green-400 text-2xl font-bold">{analytics.suggestedPlantationIncrease} ha</div>
          <div className="text-gray-500 text-xs mt-1">Hectares to plant</div>
        </motion.div>
      </div>

      {/* Risk Distribution Pie Chart */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
        className="mb-6"
      >
        <h4 className="text-gray-300 font-medium text-sm mb-3">Risk Distribution</h4>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={riskDistribution}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {riskDistribution.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="grid grid-cols-2 gap-2 mt-3">
          {riskDistribution.map((item) => (
            <div key={item.name} className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }}></div>
              <span className="text-gray-400 text-xs">{item.name}: {item.value}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Feature Importance */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
        className="mb-6"
      >
        <h4 className="text-gray-300 font-medium text-sm mb-3">Feature Importance</h4>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={featureImportance} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis type="number" stroke="#9ca3af" fontSize={10} />
            <YAxis dataKey="feature" type="category" stroke="#9ca3af" fontSize={10} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="importance" fill="#06b6d4" radius={[0, 4, 4, 0]}>
              {featureImportance.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Yearly Trend */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.6 }}
      >
        <h4 className="text-gray-300 font-medium text-sm mb-3">OSI Trend (2019-2024)</h4>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={yearlyTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="year" stroke="#9ca3af" fontSize={10} />
            <YAxis stroke="#9ca3af" fontSize={10} />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="osi" 
              stroke="#06b6d4" 
              strokeWidth={2}
              dot={{ fill: '#06b6d4', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      {/* AI Model Info */}
      {mode === 'forecast' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-6 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl"
        >
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
            <h4 className="text-purple-400 font-medium text-sm">AI Model Information</h4>
          </div>
          <div className="space-y-1 text-xs text-gray-300">
            <div>Model: XGBoost Regression</div>
            <div>R² Score: 0.966</div>
            <div>Training Data: 2019-2023</div>
            <div>Features: AOD, NDVI, Temperature, Year</div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AnalyticsPanel;
