'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Clock, ShieldAlert, MapPin, Search, Activity } from 'lucide-react';

const INDIA_CENTER = { longitude: 78.9629, latitude: 20.5937 };

const MAP_STYLE = {
  version: 8,
  sources: {
    'carto-dark': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png'
      ],
      tileSize: 256
    }
  },
  layers: [
    {
      id: 'base-map',
      type: 'raster',
      source: 'carto-dark',
      minzoom: 0,
      maxzoom: 22
    }
  ]
};

const AVAILABLE_CRIMES = [
  'RAPE',
  'KIDNAPPING AND ABDUCTION',
  'DOWRY DEATHS',
  'ASSAULT ON WOMEN WITH INTENT TO OUTRAGE HER MODESTY',
  'INSULT TO THE MODESTY OF WOMEN',
  'CRUELTY BY HUSBAND OR HIS RELATIVES (IPC SECTION 498A)'
];

const TIME_WINDOWS = [
  { value: '1w', label: 'Past Week' },
  { value: '1m', label: 'Past Month' },
  { value: '6m', label: 'Past 6 Months' },
  { value: '1y', label: 'Past Year' },
  { value: '2y', label: 'Past 2 Years' },
  { value: '3y', label: 'Past 3 Years' }
];

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return R * c;
}

export default function AbhayaDashboard() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef([]);
  
  const [crimes, setCrimes] = useState([]);
  const [safeZones, setSafeZones] = useState([]);
  
  // Filters
  const [startHour, setStartHour] = useState(22);
  const [endHour, setEndHour] = useState(1);
  const [selectedTypes, setSelectedTypes] = useState(AVAILABLE_CRIMES);
  const [timeWindow, setTimeWindow] = useState('1y');
  
  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Map State
  const [center, setCenter] = useState(INDIA_CENTER);

  // Initialize Map
  useEffect(() => {
    if (map.current) return;
    
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: [INDIA_CENTER.longitude, INDIA_CENTER.latitude],
      zoom: 4.2, 
      pitch: 0,
      bearing: 0,
      attributionControl: false
    });

    map.current.on('load', () => {
      // 1. State Choropleth (Macro view)
      map.current.addSource('states', {
        type: 'geojson',
        data: '/india_states_crimes.geojson'
      });

      map.current.addLayer({
        id: 'state-choropleth',
        type: 'fill',
        source: 'states',
        maxzoom: 7,
        paint: {
          'fill-color': [
            'interpolate', ['linear'], ['get', 'total_crimes'],
            0, 'rgba(0,0,0,0)',
            1000, 'rgba(255, 71, 87, 0.1)',
            5000, 'rgba(255, 71, 87, 0.3)',
            10000, 'rgba(255, 71, 87, 0.5)',
            20000, 'rgba(255, 71, 87, 0.7)',
            40000, 'rgba(255, 71, 87, 0.9)'
          ],
          'fill-opacity': [
            'interpolate', ['linear'], ['zoom'],
            4, 1,
            6, 0 
          ]
        }
      });

      map.current.addLayer({
        id: 'state-borders',
        type: 'line',
        source: 'states',
        maxzoom: 7,
        paint: {
          'line-color': '#ff4757',
          'line-width': 1,
          'line-opacity': [
            'interpolate', ['linear'], ['zoom'],
            4, 0.3,
            6, 0
          ]
        }
      });

      // 2. Granular Points (Micro view)
      map.current.addSource('crimes', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      map.current.addLayer({
        id: 'crime-heat',
        type: 'heatmap',
        source: 'crimes',
        maxzoom: 15,
        paint: {
          'heatmap-weight': 1,
          'heatmap-intensity': 1,
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(255,0,0,0)',
            0.2, 'rgba(255, 71, 87, 0.2)',
            0.4, 'rgba(255, 71, 87, 0.4)',
            0.6, 'rgba(255, 71, 87, 0.6)',
            0.8, 'rgba(255, 71, 87, 0.8)',
            1, 'rgba(255, 71, 87, 1)'
          ],
          'heatmap-radius': [
            'interpolate', ['linear'], ['zoom'],
            4, 5,
            11, 15,
            15, 40
          ],
          'heatmap-opacity': [
            'interpolate', ['linear'], ['zoom'],
            5, 0, 
            6, 0.7 
          ]
        }
      });

      map.current.addLayer({
        id: 'crime-points',
        type: 'circle',
        source: 'crimes',
        minzoom: 5.5,
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            6, 3,
            10, 6,
            14, 10
          ],
          'circle-color': '#ff4757',
          'circle-opacity': [
            'interpolate', ['linear'], ['zoom'],
            5.5, 0,
            6.5, 0.9
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': 'rgba(255,71,87,0.4)'
        }
      });

      // Map Interactions
      map.current.on('mouseenter', 'state-choropleth', () => {
        if (map.current.getZoom() < 6) map.current.getCanvas().style.cursor = 'pointer';
      });
      map.current.on('mouseleave', 'state-choropleth', () => {
        map.current.getCanvas().style.cursor = '';
      });
      map.current.on('mouseenter', 'crime-points', () => {
        map.current.getCanvas().style.cursor = 'pointer';
      });
      map.current.on('mouseleave', 'crime-points', () => {
        map.current.getCanvas().style.cursor = '';
      });

      map.current.on('click', 'state-choropleth', (e) => {
        if (map.current.getZoom() >= 6) return;
        const bboxData = e.features[0].properties.bbox;
        if (!bboxData) return;
        
        let bbox;
        if (typeof bboxData === 'string') {
            bbox = JSON.parse(bboxData);
        } else {
            bbox = bboxData;
        }

        map.current.fitBounds([
          [bbox[0], bbox[1]],
          [bbox[2], bbox[3]]
        ], { padding: 40, duration: 2000 });
      });

      map.current.on('click', 'crime-points', (e) => {
        const props = e.features[0].properties;
        const dateObj = new Date(props.time_of_incident);
        const formattedDate = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        const formattedTime = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        
        new maplibregl.Popup({ className: 'custom-popup' })
          .setLngLat(e.lngLat)
          .setHTML(`
            <div style="font-family: 'Inter', sans-serif; background: rgba(10,10,15,0.95); border: 1px solid rgba(255,71,87,0.3); border-radius: 8px; padding: 12px; min-width: 220px; box-shadow: 0 8px 32px rgba(0,0,0,0.5);">
              <div style="display:flex; align-items:center; gap:8px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px; margin-bottom: 8px;">
                <div style="width: 8px; height: 8px; border-radius: 50%; background: #ff4757; box-shadow: 0 0 8px #ff4757;"></div>
                <div style="color: #ff4757; font-weight: 700; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px;">INCIDENT REPORT</div>
              </div>
              <div style="color: #ffffff; font-weight: 600; font-size: 0.95rem; line-height: 1.3; margin-bottom: 12px; text-transform: capitalize;">
                ${props.crime_type.toLowerCase()}
              </div>
              <div style="display:flex; flex-direction:column; gap:4px; font-size: 0.8rem; color: #a0a0b0;">
                <div style="display:flex; justify-content:space-between;">
                  <span>Date:</span> <span style="color:#ffffff;">${formattedDate}</span>
                </div>
                <div style="display:flex; justify-content:space-between;">
                  <span>Time:</span> <span style="color:#ffffff;">${formattedTime}</span>
                </div>
                <div style="display:flex; justify-content:space-between;">
                  <span>Lat/Lng:</span> <span style="color:#ffffff;">${e.lngLat.lat.toFixed(4)}, ${e.lngLat.lng.toFixed(4)}</span>
                </div>
              </div>
            </div>
          `)
          .addTo(map.current);
      });
    });

    map.current.on('moveend', () => {
      setCenter({
        longitude: map.current.getCenter().lng,
        latitude: map.current.getCenter().lat
      });
      fetchSafeZones(map.current.getBounds());
    });
  }, []);

  // Update Crime GeoJSON when data changes
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;
    
    const source = map.current.getSource('crimes');
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features: crimes.map(c => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [c.longitude, c.latitude] },
          properties: c
        }))
      });
    }
  }, [crimes]);

  // Update Safe Zone Markers when data changes
  useEffect(() => {
    if (!map.current) return;
    
    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Only show safe zones if zoomed in
    if (map.current.getZoom() < 10) return;

    safeZones.forEach(zone => {
      const el = document.createElement('div');
      el.style.color = zone.type === 'police' ? '#1e90ff' : '#2ed573';
      el.style.cursor = 'pointer';
      el.style.filter = 'drop-shadow(0px 0px 4px rgba(0,0,0,0.5))';
      el.innerHTML = zone.type === 'police' 
        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>'
        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>';

      const marker = new maplibregl.Marker(el)
        .setLngLat([zone.lon, zone.lat])
        .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(`
          <div style="font-weight:600;margin-bottom:4px" class="popup-${zone.type}">
            ${zone.name}
          </div>
          <div style="color:var(--text-secondary);font-size:0.75rem">Verified Safe Haven</div>
        `))
        .addTo(map.current);
        
      markersRef.current.push(marker);
    });
  }, [safeZones]);

  // Fetch Safe Zones
  const fetchSafeZones = async (b) => {
    try {
      if (!map.current || map.current.getZoom() < 10) {
        setSafeZones([]);
        return;
      }
      const boundsStr = `${b.getSouthWest().lat},${b.getSouthWest().lng},${b.getNorthEast().lat},${b.getNorthEast().lng}`;
      const res = await fetch(`/api/safe-zones?bounds=${boundsStr}`);
      const json = await res.json();
      if (json.success) setSafeZones(json.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Crime Data
  useEffect(() => {
    const fetchCrimes = async () => {
      try {
        const typesParam = encodeURIComponent(selectedTypes.join(','));
        const res = await fetch(`/api/crimes?startHour=${startHour}&endHour=${endHour}&types=${typesParam}&timeWindow=${timeWindow}`);
        const json = await res.json();
        if (json.success) setCrimes(json.data);
      } catch (err) {
        console.error(err);
      }
    };
    const t = setTimeout(fetchCrimes, 300);
    return () => clearTimeout(t);
  }, [startHour, endHour, selectedTypes, timeWindow]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || !map.current) return;
    
    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=in`);
      const data = await res.json();
      
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        map.current.flyTo({
          center: [parseFloat(lon), parseFloat(lat)],
          zoom: 13,
          pitch: 45,
          essential: true,
          duration: 2500
        });
      } else {
        alert("Location not found in India.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const riskRadiusData = useMemo(() => {
    let total = 0;
    const breakdown = {};
    if (!map.current || map.current.getZoom() < 6) return { total: 0, breakdown: {} };

    crimes.forEach(c => {
      if (getDistanceFromLatLonInKm(center.latitude, center.longitude, c.latitude, c.longitude) <= 20) {
        total++;
        breakdown[c.crime_type] = (breakdown[c.crime_type] || 0) + 1;
      }
    });
    return { total, breakdown };
  }, [crimes, center]);

  const toggleCrimeType = (type) => {
    setSelectedTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  const formatHour = (h) => `${h % 12 || 12}:00 ${h >= 12 ? 'PM' : 'AM'}`;

  return (
    <>
      <div ref={mapContainer} className="map-container" />
      
      {/* Dynamic Crosshair visibility based on zoom */}
      <div className="crosshair" style={{ opacity: (!map.current || map.current.getZoom() < 6) ? 0 : 1 }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>
      </div>

      <div className="hud-container">
        {/* BRANDING HEADER */}
        <div className="branding-header">
          <Activity color="#ff4757" size={24} />
          <div>
            <h1>ABHAYA GRID</h1>
            <p>National Safety Matrix</p>
          </div>
        </div>

        <div className="panel" style={{ padding: '16px' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Search size={18} color="var(--text-secondary)" />
            <input 
              type="text" 
              placeholder="Search Indian city or pin..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <button type="submit" disabled={isSearching} className="search-btn">
              {isSearching ? '...' : 'Go'}
            </button>
          </form>
        </div>

        <div className="panel" style={{
            opacity: (!map.current || map.current.getZoom() < 6) ? 0.3 : 1,
            pointerEvents: (!map.current || map.current.getZoom() < 6) ? 'none' : 'auto',
            transition: 'opacity 0.5s'
        }}>
          <div className="title"><Clock size={20} color="var(--accent)" /> Temporal Filter</div>
          
          {/* TIME WINDOW SELECTOR */}
          <div className="label">Historical Window</div>
          <select 
            value={timeWindow} 
            onChange={(e) => setTimeWindow(e.target.value)}
            className="time-select"
          >
            {TIME_WINDOWS.map(tw => (
              <option key={tw.value} value={tw.value}>{tw.label}</option>
            ))}
          </select>

          <div className="label" style={{marginTop: '16px'}}>Planned Travel Time</div>
          <div className="slider-container">
            <div className="slider-labels"><span>Start: {formatHour(startHour)}</span></div>
            <input type="range" min="0" max="23" value={startHour} onChange={(e) => setStartHour(parseInt(e.target.value))} className="time-slider" />
            <div className="slider-labels" style={{ marginTop: '8px' }}><span>End: {formatHour(endHour)}</span></div>
            <input type="range" min="0" max="23" value={endHour} onChange={(e) => setEndHour(parseInt(e.target.value))} className="time-slider" />
          </div>
        </div>

        <div className="panel collapsable-panel">
          <div className="title"><ShieldAlert size={20} color="var(--accent)" /> Typology</div>
          <div className="label">Crime Filtering</div>
          <div className="toggles-list">
            {AVAILABLE_CRIMES.map(type => (
              <label key={type} className="toggle-item">
                <input type="checkbox" checked={selectedTypes.includes(type)} onChange={() => toggleCrimeType(type)} />
                <span className="toggle-label" title={type}>{type.length > 25 ? type.substring(0, 25) + '...' : type}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="radius-container" style={{
            opacity: (!map.current || map.current.getZoom() < 6) ? 0 : 1,
            pointerEvents: (!map.current || map.current.getZoom() < 6) ? 'none' : 'auto',
            transition: 'opacity 0.5s'
      }}>
        <div className="panel">
          <div className="title"><MapPin size={20} color="var(--accent)" /> Regional Risk Zone</div>
          <div className="label">20km Radius Assessment</div>
          <div className="stats-grid">
            <div className="stat-box" style={{ gridColumn: 'span 2' }}>
              <span className="stat-value">{riskRadiusData.total}</span>
              <span className="stat-label">Total Reported Incidents</span>
            </div>
            {Object.entries(riskRadiusData.breakdown).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([type, count]) => (
              <div key={type} className="stat-box">
                <span className="stat-value">{count}</span>
                <span className="stat-label" title={type}>{type.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
