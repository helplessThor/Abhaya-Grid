import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const bounds = searchParams.get('bounds'); // sw_lat,sw_lon,ne_lat,ne_lon
    
    if (!bounds) {
      return NextResponse.json({ success: false, error: 'Bounds required' }, { status: 400 });
    }

    const [sw_lat, sw_lon, ne_lat, ne_lon] = bounds.split(',');

    // Overpass query for police stations and 24/7 pharmacies
    const overpassQuery = `
      [out:json][timeout:25];
      (
        node["amenity"="police"](${sw_lat},${sw_lon},${ne_lat},${ne_lon});
        way["amenity"="police"](${sw_lat},${sw_lon},${ne_lat},${ne_lon});
        relation["amenity"="police"](${sw_lat},${sw_lon},${ne_lat},${ne_lon});
        
        node["amenity"="pharmacy"]["opening_hours"="24/7"](${sw_lat},${sw_lon},${ne_lat},${ne_lon});
        way["amenity"="pharmacy"]["opening_hours"="24/7"](${sw_lat},${sw_lon},${ne_lat},${ne_lon});
        relation["amenity"="pharmacy"]["opening_hours"="24/7"](${sw_lat},${sw_lon},${ne_lat},${ne_lon});
      );
      out center;
    `;

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: overpassQuery,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (!response.ok) {
      throw new Error(`Overpass API responded with status ${response.status}`);
    }

    const data = await response.json();
    
    // Parse results
    const safeZones = data.elements.map(el => {
      const lat = el.lat || el.center?.lat;
      const lon = el.lon || el.center?.lon;
      const type = el.tags?.amenity;
      const name = el.tags?.name || (type === 'police' ? 'Police Station' : '24/7 Pharmacy');
      
      return { id: el.id, lat, lon, type, name };
    }).filter(z => z.lat && z.lon);

    return NextResponse.json({
      success: true,
      data: safeZones
    });
  } catch (error) {
    console.error('Overpass Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
