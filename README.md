# 🌍 Urban Oxygen Deficit Predictor (UODP)

**AI Climate Intelligence Platform for Urban Environmental Monitoring**

## 📋 Overview

The Urban Oxygen Deficit Predictor (UODP) is a production-ready environmental AI dashboard that provides real-time monitoring and prediction of oxygen stress levels in urban areas. Built for government and smart city deployment, this platform combines satellite-derived environmental indicators with AI-powered forecasting to identify critical zones requiring immediate plantation intervention.

## ✨ Key Features

### 🧠 **Time Intelligence Engine**
- **Historical Analysis**: Interactive timeline from 2019-2023
- **AI Forecast Mode**: XGBoost-powered predictions for 2024
- **Smooth Animation**: Play/pause controls with speed adjustment (0.5x, 1x, 2x)
- **Real-time Updates**: Instant data visualization changes

### 🗺️ **Dual Visualization System**
- **2D Mapbox GL JS**: Interactive satellite map with dynamic OSI overlays
- **3D Cesium Globe**: Immersive 3D Earth visualization with terrain data
- **Dynamic Color Gradients**: Green → Yellow → Orange → Red risk levels
- **Hover & Click Interactions**: Detailed grid information on demand

### 📊 **AI Insights Panel**
- **KPI Dashboard**: Average OSI, critical zones, oxygen deficit index
- **Risk Distribution**: Interactive pie charts with zone breakdowns
- **Feature Importance**: AOD, NDVI, Temperature, Year impact analysis
- **Trend Analysis**: Historical OSI trends (2019-2024)
- **Model Metrics**: XGBoost performance indicators (R² ≈ 0.966)

### 🌱 **Critical Plantation Zones**
- **Priority Ranking**: Urgent, High, Medium priority classifications
- **Location Intelligence**: Exact coordinates and area requirements
- **Environmental Context**: NDVI, AOD, temperature data per zone
- **Actionable Insights**: Hectares needed and tree count estimates
- **Interactive Cards**: Click-to-zoom functionality

### 🎨 **Futuristic UI Design**
- **Dark Space Theme**: Government command center aesthetic
- **Neon Accents**: Cyan highlights with glass morphism effects
- **Smooth Animations**: Framer Motion powered transitions
- **Responsive Layout**: Optimized for dashboard viewing

## 🚀 Getting Started

### **Prerequisites**
- Node.js 18+ 
- npm or yarn package manager

### **Installation**
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### **Access the Dashboard**
Open your browser and navigate to: `http://localhost:3000`

## 🎯 Usage Guide

### **Time Navigation**
1. Use the year slider to select specific years (2019-2023)
2. Click Play ▶ to animate through years automatically
3. Switch to AI Forecast Mode for 2024 predictions
4. Adjust animation speed with 0.5x, 1x, 2x controls

### **Map Visualization**
1. Toggle between 2D Map and 3D Globe views
2. Hover over grid cells for quick information
3. Click on grids for detailed environmental data
4. Use the Planting button to view critical zones

### **Analytics Panel**
1. Monitor real-time KPIs and trends
2. Analyze risk distribution across zones
3. Review feature importance for AI model
4. Track historical OSI trends

### **Plantation Planning**
1. Click "Planting" button to view critical zones
2. Review priority-ranked location cards
3. Analyze environmental context per zone
4. Calculate required plantation area and tree counts

## 📊 Data Model

### **Environmental Indicators**
- **AOD** (Aerosol Optical Depth): Atmospheric pollution indicator
- **NDVI** (Normalized Difference Vegetation Index): Vegetation health
- **Temperature**: Surface temperature measurements
- **OSI** (Oxygen Stress Index): Composite oxygen deficit metric
- **Predicted_OSI_2024**: AI-powered forecast values

### **Risk Classification**
- **Low**: OSI < 700 (Green)
- **Moderate**: OSI 700-749 (Yellow)
- **High**: OSI 750-799 (Orange)
- **Critical**: OSI ≥ 800 (Red)

## 🏗️ Technical Architecture

### **Frontend Stack**
- **Next.js 14** with App Router and TypeScript
- **React 18** with modern hooks and patterns
- **Tailwind CSS** for responsive styling
- **Framer Motion** for animations
- **Zustand** for state management

### **Visualization Libraries**
- **Mapbox GL JS** for 2D mapping
- **CesiumJS** for 3D globe visualization
- **Recharts** for analytics charts
- **Papa Parse** for CSV data processing

---

**Urban Oxygen Deficit Predictor (UODP)**  
*AI Climate Intelligence Platform for Smart Cities*  

Built with ❤️ for sustainable urban development
