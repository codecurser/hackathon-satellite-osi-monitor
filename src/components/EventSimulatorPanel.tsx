/**
 * Plantation Event Simulator UI
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/appStore';
import { PlantationEvent } from '@/types';
import { getMaturityFactor } from '@/engines/eventEngine';

export default function EventSimulatorPanel() {
  const { 
    selectedYear, 
    plantationEvents, 
    addPlantationEvent, 
    removePlantationEvent,
    clearPlantationEvents,
    survivalData
  } = useAppStore();

  const [form, setForm] = useState({
    gridId: '',
    trees: 500,
    species: 'Neem',
    date: `${selectedYear}-01-01`
  });

  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.gridId) return;

    const newEvent: PlantationEvent = {
      id: `evt-${Date.now()}`,
      gridId: form.gridId,
      date: form.date,
      treesPlanted: form.trees,
      species: form.species,
      impactApplied: false
    };

    addPlantationEvent(newEvent);
  };

  const activeGrids = useMemo(() => {
    return survivalData?.slice(0, 20) || [];
  }, [survivalData]);

  const currentDate = new Date(`${selectedYear}-07-01`);

  return (
    <div className="flex flex-col h-full bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
      <div className="p-6 border-b border-white/10 bg-gradient-to-r from-emerald-500/10 to-transparent">
        <h2 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
          📅 Plantation Event Simulator
        </h2>
        <p className="text-slate-400 text-xs mt-1 uppercase tracking-widest font-mono">
          Temporal Impact Simulation Engine
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
        {/* Ad-hoc Event Creator */}
        <section>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Schedule New Plantation</h3>
          <form onSubmit={handleSubmit} className="space-y-4 bg-slate-800/40 p-4 rounded-xl border border-white/5">
            <div>
              <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Target Grid</label>
              <select 
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                value={form.gridId}
                onChange={e => setForm({...form, gridId: e.target.value})}
              >
                <option value="">Select a grid...</option>
                {activeGrids.map(g => (
                  <option key={g.gridId} value={g.gridId}>
                    {g.gridId} (OSI: {Math.round(g.currentOSI)})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Tree Count</label>
                <input 
                  type="number"
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm"
                  value={form.trees}
                  onChange={e => setForm({...form, trees: +e.target.value})}
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Plantation Date</label>
                <input 
                  type="date"
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm"
                  value={form.date}
                  onChange={e => setForm({...form, date: e.target.value})}
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold py-2 rounded-lg border border-emerald-500/30 transition-all text-xs uppercase tracking-widest"
              disabled={!form.gridId}
            >
              Add Event to Timeline
            </button>
          </form>
        </section>

        {/* Event Timeline */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Scheduled Events Timeline</h3>
            <button 
              onClick={clearPlantationEvents}
              className="text-[10px] text-red-400/60 hover:text-red-400 font-bold uppercase tracking-tighter"
            >
              Clear All
            </button>
          </div>

          <div className="space-y-3">
            {plantationEvents.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-2xl">
                <p className="text-slate-600 text-sm font-mono italic">No events scheduled. Use the form above to trigger dynamic changes.</p>
              </div>
            ) : (
              plantationEvents.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(event => {
                const eventDate = new Date(event.date);
                const msPassed = currentDate.getTime() - eventDate.getTime();
                const daysPassed = msPassed / (1000 * 60 * 60 * 24);
                const maturity = getMaturityFactor(daysPassed);
                const status = eventDate <= currentDate ? 'In Progress' : 'Future';
                
                return (
                  <motion.div 
                    layout
                    key={event.id}
                    className={`relative p-4 rounded-xl border transition-all cursor-pointer ${
                      eventDate <= currentDate 
                        ? 'bg-emerald-500/5 border-emerald-500/20 shadow-lg shadow-emerald-500/5' 
                        : 'bg-slate-800/20 border-white/5 opacity-60'
                    }`}
                    onClick={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${eventDate <= currentDate ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                          {eventDate <= currentDate ? '🌳' : '📅'}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{event.species} Plantation</div>
                          <div className="text-[10px] text-slate-500 font-mono italic">{event.gridId} · {event.date}</div>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); removePlantationEvent(event.id); }}
                        className="text-slate-600 hover:text-red-400 transition-colors"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="bg-slate-900/40 p-2 rounded-lg">
                        <div className="text-[8px] text-slate-500 uppercase font-bold mb-1">Impact Maturity</div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(maturity * 100, 100)}%` }}
                            className="h-full bg-emerald-500"
                          />
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-[9px] font-mono text-emerald-500/80">{(maturity * 100).toFixed(1)}%</span>
                          <span className="text-[8px] font-bold text-slate-600 uppercase">{status}</span>
                        </div>
                      </div>
                      <div className="bg-slate-900/40 p-2 rounded-lg">
                        <div className="text-[8px] text-slate-500 uppercase font-bold mb-1">Trees Planted</div>
                        <div className="text-lg font-black text-white leading-none">{event.treesPlanted}</div>
                        <div className="text-[8px] text-emerald-400/50 mt-1 uppercase font-bold italic tracking-tighter">Carbon Bank</div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {expandedEvent === event.id && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden mt-4 pt-4 border-t border-white/5 pointer-events-none"
                        >
                          <div className="text-[9px] text-slate-400 space-y-1 font-mono">
                            <p>DAYS PASSED: {Math.max(0, Math.round(daysPassed))}</p>
                            <p>EST. NDVI GAIN: +{(event.treesPlanted / 1000 * 0.05 * maturity).toFixed(4)}</p>
                            <p>EST. OSI REDUCTION: -{(event.treesPlanted / 1000 * 20 * maturity).toFixed(2)} pts</p>
                            <p className="text-emerald-400/60 mt-2 italic">“This plantation will reach 90% maturity in ~3 years.”</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })
            )}
          </div>
        </section>
      </div>

      <div className="p-4 bg-slate-950/40 border-t border-white/5">
        <div className="flex items-center gap-3 p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
          <div className="text-lg">🏆</div>
          <div>
            <div className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Academic Insight</div>
            <p className="text-[9px] text-slate-400 italic mt-0.5">
              "We introduced a temporal event-driven plantation model where real-world plantation activities dynamically update environmental indicators."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
