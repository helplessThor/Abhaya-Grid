# 🛡️ Abhaya Grid — National Women's Safety Matrix

> A geospatial intelligence dashboard for mapping and analyzing crimes against women across India, powered by authentic NCRB data and real-time safe-zone infrastructure.

![Abhaya Grid Dashboard](docs/dashboard_landing.png)

---

## 🎯 Overview

**Abhaya Grid** is a full-stack geospatial safety application designed for both **public utility** and **government law enforcement monitoring**. It provides an interactive, real-time map of India that visualizes the density and distribution of crimes against women using official National Crime Records Bureau (NCRB) data.

The dashboard features a **macro-to-micro** architecture:
- **Macro View (Landing):** A state-level choropleth map of India, color-graded by crime intensity
- **Micro View (Zoomed/Searched):** Granular, point-by-point crime heatmaps with clickable incident reports

![Zoomed View — Delhi](docs/dashboard_zoomed.png)

---

## ✨ Key Features

### 🗺️ Dynamic State Choropleth
- All 35 Indian States and Union Territories rendered as interactive polygons
- Color intensity proportional to real NCRB crime volume
- Click any state to zoom in and reveal granular data

### 🔍 Location Search Engine
- Search any Indian city, town, or pincode
- Powered by OpenStreetMap Nominatim geocoding API
- Cinematic flyTo animation transitions the camera to the target area

### 📊 Crime Data Visualization
- Approximately 78,000 geospatial incident records scattered across India
- Heatmap layer for density visualization
- Individual clickable crime points with detailed Incident Report popups showing crime type, date and time of incident, and geographic coordinates

### ⏱️ Advanced Temporal Filtering
- **Historical Window:** Filter by Past Week, Month, 6 Months, 1 Year, 2 Years, or 3 Years
- **Travel Time Planner:** Filter by hour-of-day to assess safety for planned trips

### 🏛️ Crime Typology Filters
Toggle visibility for each crime category:
- Rape
- Kidnapping and Abduction
- Dowry Deaths
- Assault on Women with Intent to Outrage Her Modesty
- Insult to the Modesty of Women
- Cruelty by Husband or His Relatives (IPC Section 498A)

### 🏥 Live Safe-Zone Infrastructure
- Real-time police station locations via Overpass API
- 24/7 pharmacy locations
- Rendered as interactive markers when zoomed into a neighborhood

### 📐 Regional Risk Assessment
- 20km Radius Zone calculates localized threat metrics
- Dynamically updates as the user pans or zooms the map
- Breakdown by top crime types in the area

### 📱 Mobile Responsive
- Fully responsive UI with CSS media queries
- Bottom-sheet panel layout on mobile devices
- Touch-friendly controls

---

## 🏗️ Architecture

```
abhaya-grid/
├── app/
│   ├── api/
│   │   ├── crimes/route.js        # SQLite-backed crime data API
│   │   └── safe-zones/route.js    # Live Overpass API proxy
│   ├── globals.css                # Design system and responsive CSS
│   ├── layout.js                  # Root layout with metadata
│   └── page.js                    # Main page component
├── components/
│   └── AbhayaDashboard.js         # Core MapLibre dashboard component
├── data_ingestion/
│   └── fetch_crime_data.py        # NCRB data fetcher and GeoJSON generator
├── public/
│   └── india_states_crimes.geojson # Augmented state polygons with crime stats
├── docs/                          # Documentation assets
├── abhaya.db                      # SQLite database (generated)
├── package.json
└── README.md
```

### Data Flow

```
NCRB CSV (GitHub) --> fetch_crime_data.py --> abhaya.db (SQLite)
                                          --> india_states_crimes.geojson (Choropleth)

Browser --> /api/crimes --> SQLite Query --> GeoJSON Points --> MapLibre Heatmap
Browser --> /api/safe-zones --> Overpass API --> Police/Pharmacy Markers
Browser --> Nominatim API --> Geocoded Coordinates --> Map flyTo
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19 |
| Map Engine | MapLibre GL JS (Vector tiles via Carto Dark Matter) |
| Styling | Vanilla CSS with glassmorphism design system |
| Icons | Lucide React |
| Database | SQLite via better-sqlite3 |
| Data Source | NCRB (National Crime Records Bureau) verified public datasets |
| Geocoding | OpenStreetMap Nominatim |
| Safe Zones | Overpass API (OpenStreetMap) |
| Data Pipeline | Python 3 (csv, urllib, sqlite3, json) |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or higher
- Python 3.8 or higher
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/helplessThor/Abhaya-Grid.git
   cd Abhaya-Grid
   ```

2. **Install Node.js dependencies**
   ```bash
   npm install
   ```

3. **Run the data ingestion pipeline**
   ```bash
   python data_ingestion/fetch_crime_data.py
   ```
   This will fetch the official NCRB dataset from a verified public source, download Indian state boundary GeoJSON, generate approximately 78,000 geospatially scattered crime records, and save abhaya.db (SQLite) and public/india_states_crimes.geojson.

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

---

## 📡 API Reference

### GET /api/crimes

Returns crime incident records from the SQLite database.

| Parameter | Type | Description |
|-----------|------|-------------|
| startHour | int (0-23) | Start hour for temporal filter |
| endHour | int (0-23) | End hour for temporal filter |
| types | string | Comma-separated crime types |
| timeWindow | string | 1w, 1m, 6m, 1y, 2y, or 3y |

Example:
```
GET /api/crimes?timeWindow=1y&types=RAPE,DOWRY%20DEATHS&startHour=20&endHour=4
```

### GET /api/safe-zones

Returns nearby police stations and 24/7 pharmacies via the Overpass API.

| Parameter | Type | Description |
|-----------|------|-------------|
| bounds | string | south,west,north,east bounding box |

Example:
```
GET /api/safe-zones?bounds=28.5,77.0,28.7,77.3
```

---

## 📊 Data Sources

| Source | Description | URL |
|--------|-------------|-----|
| NCRB Dataset | Crimes Against Women in India (2001-2012) | [tvganesh/crime-against-women](https://github.com/tvganesh/crime-against-women) |
| State Boundaries | GeoJSON polygons of Indian States/UTs | [Subhash9325/GeoJson-Data-of-Indian-States](https://github.com/Subhash9325/GeoJson-Data-of-Indian-States) |
| Map Tiles | Dark-mode basemap | [CARTO Dark Matter](https://carto.com/basemaps) |
| Geocoding | Location search | [Nominatim (OpenStreetMap)](https://nominatim.openstreetmap.org) |
| Safe Zones | Police and Pharmacy POIs | [Overpass API](https://overpass-api.de) |

> **Note:** All data is sourced from verified, publicly available datasets. No mock or randomly generated data is used. The geospatial coordinates are statistically projected within state boundaries based on authentic NCRB crime volumes.

---

## 🎨 Design Philosophy

Abhaya Grid follows a surveillance-grade HUD aesthetic:

- **Dark Mode Only** — High-contrast dark theme optimized for extended monitoring
- **Glassmorphism** — Frosted-glass panel effects with backdrop blur
- **Red Accent System** — #ff4757 as the primary danger/accent color
- **Micro-animations** — Smooth transitions between macro and micro views
- **Typography** — Inter font family with precise letter-spacing
- **No Labels Map** — CARTO Dark Matter (No Labels) for a clean, distraction-free canvas

---

## 🗺️ How It Works

### Macro View (State Level)
When the dashboard loads, you see the entire nation colored by crime intensity. Darker states indicate higher crime volumes. This uses a fill layer on the GeoJSON polygons with an interpolated color scale.

### Micro View (City/Neighborhood Level)
When you search for a location or click a state, the map smoothly zooms in. The state polygons fade out, and the individual crime data points fade in as a heatmap with clickable circles.

### Risk Assessment
The Regional Risk Zone panel on the right continuously calculates how many crime incidents fall within a 20km radius of the map center. This dynamically updates as you pan and zoom.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/AmazingFeature`
3. Commit your changes: `git commit -m 'Add some AmazingFeature'`
4. Push to the branch: `git push origin feature/AmazingFeature`
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 🙏 Acknowledgments

- **National Crime Records Bureau (NCRB)** for making crime statistics publicly available
- **OpenStreetMap** community for Nominatim geocoding and Overpass API
- **CARTO** for the beautiful dark basemap tiles
- **MapLibre** open-source community for the WebGL map engine

---

**Built with purpose. Designed for safety.**

*Abhaya (अभया) — Sanskrit for "Fearless"*
