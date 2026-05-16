import csv
import urllib.request
import sqlite3
import random
import os
import json
from datetime import datetime, timedelta

# Configuration
DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'abhaya.db')
PUBLIC_DIR = os.path.join(os.path.dirname(__file__), '..', 'public')
GEOJSON_OUTPUT = os.path.join(PUBLIC_DIR, 'india_states_crimes.geojson')

CSV_URL = 'https://raw.githubusercontent.com/tvganesh/crime-against-women/master/dataset/pacCAW.csv'
GEOJSON_URL = 'https://raw.githubusercontent.com/Subhash9325/GeoJson-Data-of-Indian-States/master/Indian_States'
YEAR_TO_FETCH = '2012'

def generate_random_time():
    now = datetime.now()
    random_days = random.randint(0, 1095) # 3 years
    random_seconds = random.randint(0, 24*3600 - 1)
    past_date = now - timedelta(days=random_days, seconds=random_seconds)
    return past_date.isoformat()

def normalize_state_name(name):
    n = name.upper().strip()
    mapping = {
        'A & N ISLANDS': 'ANDAMAN AND NICOBAR',
        'D & N HAVELI': 'DADRA AND NAGAR HAVELI',
        'DAMAN & DIU': 'DAMAN AND DIU',
        'JAMMU & KASHMIR': 'JAMMU AND KASHMIR',
        'ODISHA': 'ORISSA',
        'UTTARAKHAND': 'UTTARANCHAL'
    }
    return mapping.get(n, n.replace(' & ', ' AND '))

def get_bbox(geometry):
    min_lon, max_lon = 180, -180
    min_lat, max_lat = 90, -90
    
    def process_coords(coords):
        nonlocal min_lon, max_lon, min_lat, max_lat
        if isinstance(coords[0], (int, float)):
            lon, lat = coords[0], coords[1]
            min_lon, max_lon = min(min_lon, lon), max(max_lon, lon)
            min_lat, max_lat = min(min_lat, lat), max(max_lat, lat)
        else:
            for sub_coords in coords:
                process_coords(sub_coords)
                
    process_coords(geometry['coordinates'])
    return min_lon, max_lon, min_lat, max_lat

def main():
    if not os.path.exists(PUBLIC_DIR):
        os.makedirs(PUBLIC_DIR)

    # 1. Fetch NCRB Data
    print(f"Fetching NCRB data from {CSV_URL}...")
    req = urllib.request.Request(CSV_URL, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        lines = [line.decode('utf-8') for line in response.readlines()]
    
    reader = csv.DictReader(lines)
    ncrb_totals = {}
    ncrb_details = {} # state -> list of (crime_type, count)
    
    for row in reader:
        state = normalize_state_name(row.get('STATE/UT', ''))
        crime_head = row.get('CRIME HEAD', '').strip()
        count_str = row.get(YEAR_TO_FETCH, '0')
        try:
            count = int(count_str)
        except ValueError:
            count = 0
            
        if crime_head == 'TOTAL CRIMES AGAINST WOMEN':
            ncrb_totals[state] = count
        else:
            if state not in ncrb_details:
                ncrb_details[state] = []
            ncrb_details[state].append((crime_head, count))

    # 2. Fetch GeoJSON
    print(f"Fetching Indian States GeoJSON...")
    req_geo = urllib.request.Request(GEOJSON_URL, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req_geo) as response:
        geojson = json.loads(response.read().decode('utf-8'))

    # 3. Process GeoJSON & Scatter Points
    incidents = []
    
    print("Processing GeoJSON polygons and mathematically scattering points...")
    for feature in geojson['features']:
        state_name = normalize_state_name(feature['properties'].get('NAME_1', ''))
        
        # Inject total crimes for choropleth
        total_crimes = ncrb_totals.get(state_name, 0)
        feature['properties']['total_crimes'] = total_crimes
        
        if total_crimes == 0:
            continue
            
        # Get bounding box for scattering
        min_lon, max_lon, min_lat, max_lat = get_bbox(feature['geometry'])
        feature['properties']['bbox'] = [min_lon, min_lat, max_lon, max_lat]
        
        # Scatter granular points
        state_crimes = ncrb_details.get(state_name, [])
        for crime_type, count in state_crimes:
            # Scale down for browser performance (approx 20% of volume for better density)
            sample_count = max(1, int(count * 0.20)) if count > 0 else 0
            
            for _ in range(sample_count):
                lon = random.uniform(min_lon, max_lon)
                lat = random.uniform(min_lat, max_lat)
                time_of_incident = generate_random_time()
                incidents.append((lat, lon, crime_type, time_of_incident))

    # Save augmented GeoJSON
    with open(GEOJSON_OUTPUT, 'w') as f:
        json.dump(geojson, f)
    print(f"Saved augmented GeoJSON to {GEOJSON_OUTPUT}")
    
    # 4. Save to SQLite
    print(f"Saving {len(incidents)} scattered incident records to SQLite database at {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS crimes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            latitude REAL,
            longitude REAL,
            crime_type TEXT,
            time_of_incident TEXT
        )
    ''')
    cursor.execute('DELETE FROM crimes')
    cursor.executemany('''
        INSERT INTO crimes (latitude, longitude, crime_type, time_of_incident)
        VALUES (?, ?, ?, ?)
    ''', incidents)
    conn.commit()
    conn.close()
    
    print("Backend data generation complete.")

if __name__ == '__main__':
    main()
