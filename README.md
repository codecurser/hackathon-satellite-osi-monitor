# 🌍 UODP 2.0 — Urban Climate Intelligence Platform

> **Next-generation satellite-driven environmental monitoring & graph-theory optimization platform for Delhi NCR**

---

## 📋 Overview

UODP 2.0 is a production-grade AI + Graph Theory dashboard for monitoring, predicting, and optimizing urban environmental health across Delhi NCR's **1km² grid** system. It fuses **satellite telemetry**, **ML-based forecasting**, and **6 graph algorithms** into a unified command-center UI with two distinct windows:

| Window | URL | Purpose |
|--------|-----|---------|
| **Main Dashboard** | `/` | OSI monitoring, survival AI, budget optimizer, ROI engine, multi-year simulator |
| **Green Lab** | `/green-lab` | Scientific graph-algorithm simulation for optimal tree placement |

---

## ✨ Feature Engines

### 🌫️ Engine 1 — OSI Stress Map
- Historical satellite data: **2019 → 2023** across ~900 Delhi NCR grid cells
- **AI Forecast Mode**: XGBoost-predicted OSI for 2024
- Interactive timeline with play/pause animation (0.5×, 1×, 2×)
- Dual-view: **2D Mapbox GL** map + **3D Cesium Globe**
- Click-to-inspect any grid: AOD, NDVI, Temp, OSI, Risk

### 🌱 Engine 2 — Survival AI
- Heuristic ecological model: NDVI × Temperature × AOD × OSI
- Computes **survival probability**, **expected NDVI gain**, **stabilization years**, **suitability score** for every grid
- Color-coded map overlay: green (high survival) → red (low survival)

### 💰 Engine 3 — Budget Optimizer
- Greedy knapsack algorithm: maximum environmental impact within a given budget
- Configurable: total budget (₹5L–₹5Cr), cost per tree (₹50–₹300)
- Outputs: grids selected, trees planted, budget utilization %, avg survival

### 📊 Engine 4 — ROI Engine
- Environmental return: CO₂ absorbed (t/yr), O₂ generated (kg), OSI reduction, water retention
- ROI grade: A–F composite environmental score per ₹ invested

### 🔮 Engine 5 — Multi-Year Simulator
- Logistic growth model projecting plantation impact to **2028**
- Per-year snapshots: avg OSI, critical zones, cumulative CO₂, oxygen generated

### 🌿 Engine 6 — Green Optimization Lab *(Separate Window)*
Six graph algorithms running client-side over the Delhi grid graph:

| Algorithm | Strategy | Edge Type |
|-----------|----------|-----------|
| ⚡ **Greedy** | Sort by impact score | — |
| 🔗 **PageRank** | Environmental influence propagation (30 iterations, d=0.85) | Node ranking |
| 🕸️ **Centrality** | Weighted degree centrality | Hub detection |
| 🗺️ **Dijkstra** | Pollution choke-point blocking | Source→selected edges |
| 🌿 **MST (Kruskal's)** | Green corridors, minimum plantation cost | Spanning tree edges |
| 📡 **Max Coverage** | Greedy set-cover for maximum area influence | — |

Graph nodes = 1km² grids · Edges = 4-directional adjacency · Weight = OSI-based environmental influence

---

## 🧪 Green Lab (Scientific Window)

Navigate to `http://localhost:3000/green-lab` for the dedicated scientific simulation interface:

- **3-panel layout**: Control Tower → Map + Node Graph → Data Observatory
- **SVG Node Graph**: All grid nodes projected to canvas; selected nodes glow in algorithm color; MST/Dijkstra edges animated as dashed lines
- **Terminal execution log**: Real-time output of each algorithm step
- **Benchmark mode**: Run all 6 algorithms sequentially, auto-populated radar chart + comparison bars
- **Radar chart**: 4-axis comparison (OSI Reduction / Coverage / Impact Score / Efficiency)
- Self-contained: loads satellite CSV + computes survival data autonomously on page mount

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation & Dev Server

```bash
npm install
npm run dev
```

Open **`http://localhost:3000`** for the main dashboard.  
Open **`http://localhost:3000/green-lab`** for the scientific graph simulation lab.

### Production Build

```bash
npm run build
npm start
```

---

## 🗂️ Project Structure

```
src/
├── app/
│   ├── page.tsx                   # Main dashboard entry
│   ├── layout.tsx                 # Root layout + fonts
│   ├── globals.css                # Design tokens, components, animations
│   └── green-lab/
│       └── page.tsx               # Green Lab page route (/green-lab)
│
├── components/
│   ├── UODPDashboard.tsx          # Main dashboard shell (tabs, header, map layout)
│   ├── Map2D.tsx                  # Mapbox GL 2D map + graph edge overlay
│   ├── Map3D.tsx                  # CesiumJS 3D globe
│   ├── TimeControl.tsx            # Year slider + play/pause controls
│   ├── AnalyticsPanel.tsx         # OSI analytics, trend charts, KPIs
│   ├── TreeSurvivalPanel.tsx      # Engine 2 panel
│   ├── BudgetPanel.tsx            # Engine 3 + 4 panel
│   ├── SimulationPanel.tsx        # Engine 5 panel
│   ├── GreenLabPanel.tsx          # Engine 6 side-panel (in dashboard)
│   └── GreenLabImmersive.tsx      # Engine 6 full-screen scientific window
│
├── engines/
│   ├── survivalModel.ts           # Engine 2: Tree survival heuristic model
│   ├── budgetOptimizer.ts         # Engine 3: Greedy knapsack optimizer
│   ├── roiCalculator.ts           # Engine 4: Environmental ROI calculator
│   ├── impactSimulator.ts         # Engine 5: Logistic growth simulator
│   └── graphOptimizer.ts          # Engine 6: 6 graph algorithms (Greedy/PageRank/Centrality/Dijkstra/MST/MaxCoverage)
│
├── store/
│   └── appStore.ts                # Zustand global state (engines, map, time, greenLabState)
│
├── types/
│   └── index.ts                   # All TypeScript interfaces + EngineTab union
│
└── utils/
    └── dataProcessor.ts           # CSV parser + GeoJSON converter
```

---

## 📊 Data Model

### Environmental Indicators (per 1km² grid)
| Field | Description |
|-------|-------------|
| `OSI` | Oxygen Stress Index — composite environmental stress metric |
| `AOD` | Aerosol Optical Depth — atmospheric pollution indicator |
| `NDVI` | Normalized Difference Vegetation Index — vegetation health |
| `Temp` | Surface temperature (°C) |
| `Predicted_OSI_2024` | XGBoost AI forecast value |

### OSI Risk Classification
| Range | Level | Color |
|-------|-------|-------|
| < 700 | Minimal | 🟢 Green |
| 700–749 | Elevated | 🟡 Yellow |
| 750–799 | High | 🟠 Orange |
| ≥ 800 | Critical | 🔴 Red |

### Data Files (in `/public`)
```
Delhi_1km_Final_OSI_Professional_2019.csv
Delhi_1km_Final_OSI_Professional_2020.csv
Delhi_1km_Final_OSI_Professional_2021.csv
Delhi_1km_Final_OSI_Professional_2022.csv
Delhi_1km_Final_OSI_Professional_2023.csv
Delhi_2024_OSI_Prediction.csv
```

---

## 🏗️ Tech Stack

### Core
- **Next.js 16** (App Router) + **TypeScript**
- **React 19** with modern hooks
- **Zustand 5** for global state

### Visualization
- **Mapbox GL JS 3** — 2D interactive map
- **CesiumJS 1.138** — 3D globe
- **Recharts 3** — analytics charts (Bar, Radar, Line, Pie)

### Styling & Animation
- **Tailwind CSS 4** + **Vanilla CSS** design tokens
- **Framer Motion 12** — transitions + micro-animations

### Data
- **Papa Parse 5** — CSV streaming parser

---

## 🧬 Graph Theory — Engine 6 Deep Dive

The city grid is modeled as a graph:
- **Nodes**: Each 1km² grid cell
- **Edges**: 4-directional adjacency (N / S / E / W)
- **Weights**: OSI-based environmental influence

**Graph construction** uses rounded lat/lng (STEP = 0.01°  ≈ 1km) for adjacency detection.

```
Grid Graph:
  [N] [N] [N]
[W] ■ ─ ■ ─ ■ [E]
    |   |   |
    ■ ─ ■ ─ ■
    |   |   |
    ■ ─ ■ ─ ■ [S]

Each ■ = 1km² cell
── = bidirectional edge
```

All 6 algorithms share the same `GridSurvivalData[]` input (computed by Engine 2) and return an `AlgorithmResult` with selected grid IDs, edge paths (for MST/Dijkstra map visualization), trees required, OSI reduction estimate, and execution time.

---

## 🎯 Project Pipeline

```
Satellite Data (CSV)
        ↓
   DataProcessor (CSV → GeoJSON)
        ↓
   OSI Stress Map (Engine 1)
        ↓
   Survival AI (Engine 2)
        ↓
   Budget Optimizer (Engine 3) ──→ ROI Engine (Engine 4)
        ↓
   Multi-Year Simulator (Engine 5)
        ↓
   Green Optimization Lab (Engine 6)
        ↓
   Optimal Tree Plantation Zones
```

---

## 📦 Scripts

```bash
npm run dev     # Start development server (http://localhost:3000)
npm run build   # Build production bundle
npm start       # Run production server
npm run lint    # Run ESLint
```

---

*Built for sustainable urban development · UODP 2.0 · Delhi NCR · 1KM² Grid*
