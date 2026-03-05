'use client';
import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/appStore';

interface Props { onYearChange: (y: number) => void; }

export default function TimeControl({ onYearChange }: Props) {
  const { selectedYear, isPlaying, playSpeed, mode,
    setSelectedYear, setIsPlaying, setPlaySpeed, setMode } = useAppStore();
  const timer = useRef<NodeJS.Timeout | null>(null);
  const years = mode === 'historical' ? [2019,2020,2021,2022,2023] : [2024];
  const min = Math.min(...years), max = Math.max(...years);
  const pct = max === min ? 100 : ((selectedYear - min) / (max - min)) * 100;

  useEffect(() => {
    if (isPlaying && mode === 'historical') {
      timer.current = setInterval(() => {
        setSelectedYear(y => { const next = y >= max ? min : y + 1; onYearChange(next); return next; });
      }, 2000 / playSpeed);
    } else { if (timer.current) { clearInterval(timer.current); timer.current = null; } }
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [isPlaying, playSpeed, mode, min, max, setSelectedYear, onYearChange]);

  const set = (y: number) => { setSelectedYear(y); onYearChange(y); };
  const setModeWrapped = (m: 'historical' | 'forecast') => { setMode(m); setIsPlaying(false); };

  return (
    <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>⏱️</span>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Time Control</span>
        </div>
        {isPlaying && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            {[0,1,2].map(i => (
              <motion.div key={i} style={{ width: 3, height: 12, borderRadius: 2, background: 'var(--cyan)' }}
                animate={{ scaleY: [0.4, 1, 0.4] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }} />
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Mode toggle */}
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border)', borderRadius: 10, padding: 4, gap: 4 }}>
          {(['historical','forecast'] as const).map(m => (
            <button key={m} onClick={() => setModeWrapped(m)} style={{
              flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 700, textTransform: 'capitalize', transition: 'all .2s',
              background: mode === m ? (m === 'historical' ? 'rgba(0,229,255,0.18)' : 'rgba(179,136,255,0.18)') : 'transparent',
              border: mode === m ? `1px solid ${m === 'historical' ? 'rgba(0,229,255,0.35)' : 'rgba(179,136,255,0.35)'}` : '1px solid transparent',
              color: mode === m ? (m === 'historical' ? 'var(--cyan)' : 'var(--purple)') : 'var(--text-3)',
            }}>
              {m === 'historical' ? 'Historical' : 'Forecast'}
              {m === 'forecast' && mode === 'forecast' && (
                <span className="breathe" style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                  background: 'var(--purple)', marginLeft: 6, verticalAlign: 'middle' }} />
              )}
            </button>
          ))}
        </div>

        {/* Year display */}
        <AnimatePresence mode="wait">
          <motion.div key={selectedYear}
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
            style={{ textAlign: 'center' }}>
            <div className="display gradient-cyan" style={{ fontSize: 48, fontWeight: 900, lineHeight: 1 }}>
              {selectedYear}
            </div>
            {mode === 'forecast' && (
              <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 12px', borderRadius: 20,
                background: 'var(--purple-a10)', border: '1px solid var(--purple-a20)' }}>
                <span className="breathe" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--purple)', display: 'inline-block' }} />
                <span className="mono" style={{ fontSize: 11, color: 'var(--purple)', fontWeight: 600 }}>XGBoost R² = 0.966</span>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Slider */}
        {mode === 'historical' && (
          <div>
            <input type="range" min={min} max={max} value={selectedYear}
              onChange={e => set(+e.target.value)}
              className="slider-cyan"
              style={{ '--pct': `${pct}%` } as React.CSSProperties} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              {years.map(y => (
                <button key={y} onClick={() => set(y)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
                  color: selectedYear === y ? 'var(--cyan)' : 'var(--text-3)',
                  transition: 'color .15s',
                }}>{y}</button>
              ))}
            </div>
          </div>
        )}

        {/* Playback */}
        {mode === 'historical' && (
          <div>
            <div className="divider" style={{ marginBottom: 12 }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button onClick={() => setIsPlaying(!isPlaying)} style={{
                width: 40, height: 40, borderRadius: 10, border: '1px solid',
                borderColor: isPlaying ? 'var(--cyan-a40)' : 'var(--cyan-a20)',
                background: isPlaying ? 'var(--cyan-a10)' : 'rgba(0,229,255,0.06)',
                color: 'var(--cyan)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: isPlaying ? '0 0 16px rgba(0,229,255,0.2)' : 'none',
                transition: 'all .2s',
              }}>
                {isPlaying
                  ? <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                  : <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                }
              </button>
              <div style={{ display: 'flex', gap: 4 }}>
                <span className="label" style={{ fontSize: 10, alignSelf: 'center', marginRight: 4 }}>Speed</span>
                {[0.5, 1, 2].map(s => (
                  <button key={s} onClick={() => setPlaySpeed(s)} style={{
                    padding: '5px 10px', borderRadius: 6, border: '1px solid',
                    borderColor: playSpeed === s ? 'var(--cyan-a40)' : 'var(--border)',
                    background: playSpeed === s ? 'var(--cyan-a10)' : 'rgba(0,0,0,0.3)',
                    color: playSpeed === s ? 'var(--cyan)' : 'var(--text-3)',
                    fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
                    cursor: 'pointer', transition: 'all .15s',
                  }}>{s}×</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Info row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: 'Mode',  value: mode === 'historical' ? 'Historical' : 'Forecast', color: mode === 'historical' ? 'var(--cyan)' : 'var(--purple)' },
            { label: 'Range', value: mode === 'historical' ? '2019 – 2023' : '2024',   color: 'var(--green)' },
          ].map(d => (
            <div key={d.label} className="card" style={{ padding: '10px 12px', textAlign: 'center' }}>
              <div className="label" style={{ fontSize: 9, marginBottom: 4 }}>{d.label}</div>
              <div className="mono" style={{ fontSize: 12, fontWeight: 700, color: d.color }}>{d.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
