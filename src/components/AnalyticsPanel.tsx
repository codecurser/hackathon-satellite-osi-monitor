'use client';

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { motion } from 'framer-motion';
import { GeoJSONData } from '@/types';
import { DataProcessor } from '@/utils/dataProcessor';

interface AnalyticsPanelProps {
  data: GeoJSONData;
  selectedYear: number;
  previousYearData?: GeoJSONData;
  mode: 'historical' | 'forecast';
}

const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ data, selectedYear, previousYearData, mode }) => {
  const analytics = useMemo(() => DataProcessor.calculateAnalytics(data, selectedYear, previousYearData), [data, selectedYear, previousYearData]);

  const riskDistribution = useMemo(() => {
    const f = data.features;
    return [
      { name: 'Low Risk', value: f.filter(x => x.properties.OSI < 700).length, color: '#22c55e', desc: 'OSI < 700' },
      { name: 'Moderate', value: f.filter(x => x.properties.OSI >= 700 && x.properties.OSI < 750).length, color: '#eab308', desc: 'OSI 700-749' },
      { name: 'High Risk', value: f.filter(x => x.properties.OSI >= 750 && x.properties.OSI < 800).length, color: '#f97316', desc: 'OSI 750-799' },
      { name: 'Critical', value: f.filter(x => x.properties.OSI >= 800).length, color: '#ef4444', desc: 'OSI ≥ 800' },
    ];
  }, [data]);

  const featureImportance = [
    { feature: 'AOD', importance: 0.42, color: '#3b82f6', desc: 'Aerosol pollution' },
    { feature: 'NDVI', importance: 0.28, color: '#10b981', desc: 'Vegetation health' },
    { feature: 'Temp', importance: 0.18, color: '#f59e0b', desc: 'Surface heat' },
    { feature: 'Year', importance: 0.12, color: '#8b5cf6', desc: 'Temporal trend' },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-[#0f172a]/95 backdrop-blur-xl border border-white/10 rounded-lg p-2.5 shadow-xl">
          <p className="text-white text-[11px] font-medium mb-1">{label}</p>
          {payload.map((entry: any, i: number) => (
            <p key={i} className="text-[11px]" style={{ color: entry.color }}>{entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}</p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#0b1120]/80 backdrop-blur-2xl border border-white/[0.04] rounded-2xl p-5 h-full overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/[0.04]">
        <div>
          <h3 className="text-gray-100 font-bold text-sm tracking-wide flex items-center">
            <span className="mr-2 text-cyan-400">📊</span> Stress Analytics
          </h3>
          <p className="text-gray-500 text-[10px] mt-0.5">Real-time environmental analysis for {selectedYear}</p>
        </div>
        {mode === 'forecast' && (
          <div className="flex items-center space-x-1.5 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
            <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse"></div>
            <span className="text-purple-300 text-[10px] font-bold tracking-wider uppercase">AI Forecast</span>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-2.5 mb-5">
        {[
          { label: 'Average OSI', value: analytics.averageOSI, color: 'cyan', desc: 'Mean oxygen stress across all grids', extra: analytics.yearOverYearChange !== 0 ? `${analytics.yearOverYearChange > 0 ? '↑' : '↓'} ${Math.abs(analytics.yearOverYearChange)}% YoY` : null, extraColor: analytics.yearOverYearChange > 0 ? 'text-red-400' : 'text-emerald-400' },
          { label: 'Critical Zones', value: analytics.criticalZones, color: 'red', desc: 'Grids with OSI ≥ 800 needing urgent action', extra: `High Risk: ${analytics.highRiskZones}`, extraColor: 'text-orange-400' },
          { label: 'O₂ Deficit', value: analytics.oxygenDeficitIndex, color: 'blue', desc: 'Normalized oxygen shortage (0=none, 1+=severe)', extra: 'Normalized Scale', extraColor: 'text-gray-500' },
          { label: 'Plant Target', value: `${analytics.suggestedPlantationIncrease} ha`, color: 'emerald', desc: 'Estimated hectares needing tree plantation', extra: `~${Math.round(analytics.suggestedPlantationIncrease * 400)} trees`, extraColor: 'text-emerald-400' },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="group relative bg-gray-900/30 rounded-xl p-3.5 border border-white/[0.04] hover:border-white/[0.08] transition-all">
            <div className={`text-gray-500 text-[9px] uppercase font-bold tracking-[0.15em] mb-1.5 flex items-center`}>
              <div className={`w-1 h-1 rounded-full bg-${kpi.color}-500 mr-1.5`}></div>
              {kpi.label}
            </div>
            <div className={`text-${kpi.color}-400 text-2xl font-black leading-none`}>{kpi.value}</div>
            {kpi.extra && <div className={`${kpi.extraColor} text-[10px] mt-1.5 font-medium`}>{kpi.extra}</div>}
            {/* Tooltip on hover */}
            <div className="absolute inset-0 flex items-center justify-center bg-[#0f172a]/95 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-3">
              <p className="text-gray-300 text-[10px] text-center leading-relaxed">{kpi.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Risk Distribution */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-gray-300 font-medium text-xs">Risk Distribution</h4>
          <span className="text-gray-600 text-[9px]">{data.features.length} total grids</span>
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <PieChart>
            <Pie data={riskDistribution} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2} dataKey="value">
              {riskDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="grid grid-cols-2 gap-1.5 mt-2">
          {riskDistribution.map((item) => (
            <div key={item.name} className="flex items-center space-x-1.5 bg-gray-900/30 rounded-lg px-2 py-1">
              <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: item.color }}></div>
              <span className="text-gray-400 text-[10px] truncate">{item.name}: <span className="text-white font-medium">{item.value}</span></span>
              <span className="text-gray-600 text-[9px] ml-auto">{item.desc}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Feature Importance */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mb-5">
        <div className="mb-2">
          <h4 className="text-gray-300 font-medium text-xs">XGBoost Feature Importance</h4>
          <p className="text-gray-600 text-[9px] mt-0.5">Which satellite features most influence OSI predictions</p>
        </div>
        <div className="space-y-2">
          {featureImportance.map((f) => (
            <div key={f.feature} className="flex items-center space-x-2">
              <span className="text-gray-400 text-[10px] w-10 shrink-0">{f.feature}</span>
              <div className="flex-1 h-4 bg-gray-900/50 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${f.importance * 100}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="h-full rounded-full flex items-center justify-end pr-1.5"
                  style={{ backgroundColor: f.color }}
                >
                  <span className="text-white text-[9px] font-bold">{(f.importance * 100).toFixed(0)}%</span>
                </motion.div>
              </div>
              <span className="text-gray-600 text-[9px] w-20 text-right">{f.desc}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Model Info (forecast mode) */}
      {mode === 'forecast' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="p-3 bg-purple-500/5 border border-purple-500/10 rounded-xl">
          <h4 className="text-purple-400 font-medium text-[11px] mb-2 flex items-center">
            <span className="mr-1.5">🧠</span> AI Model Details
          </h4>
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <div className="text-gray-500">Model</div><div className="text-gray-300 font-medium">XGBoost</div>
            <div className="text-gray-500">R² Score</div><div className="text-emerald-400 font-medium">0.966</div>
            <div className="text-gray-500">Training</div><div className="text-gray-300 font-medium">2019–2023</div>
            <div className="text-gray-500">Features</div><div className="text-gray-300 font-medium">AOD, NDVI, Temp, Year</div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AnalyticsPanel;
