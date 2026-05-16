import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

// Define DB path relative to the project root
const dbPath = path.join(process.cwd(), 'abhaya.db');

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startHour = searchParams.get('startHour'); // 0-23
    const endHour = searchParams.get('endHour');     // 0-23
    const types = searchParams.get('types');         // comma separated
    const timeWindow = searchParams.get('timeWindow'); // 1w, 1m, 6m, 1y, 2y, 3y

    const db = new Database(dbPath, { readonly: true });
    
    let query = 'SELECT * FROM crimes WHERE 1=1';
    const params = [];

    if (timeWindow) {
      const now = new Date();
      let pastDate = new Date();
      if (timeWindow === '1w') pastDate.setDate(now.getDate() - 7);
      else if (timeWindow === '1m') pastDate.setMonth(now.getMonth() - 1);
      else if (timeWindow === '6m') pastDate.setMonth(now.getMonth() - 6);
      else if (timeWindow === '1y') pastDate.setFullYear(now.getFullYear() - 1);
      else if (timeWindow === '2y') pastDate.setFullYear(now.getFullYear() - 2);
      else if (timeWindow === '3y') pastDate.setFullYear(now.getFullYear() - 3);
      else pastDate.setFullYear(now.getFullYear() - 1); // default 1y

      query += ` AND time_of_incident >= ?`;
      params.push(pastDate.toISOString());
    }
    
    if (types) {
      const typeList = types.split(',');
      const placeholders = typeList.map(() => '?').join(',');
      query += ` AND crime_type IN (${placeholders})`;
      params.push(...typeList);
    }
    
    const rows = db.prepare(query).all(...params);
    
    // Filter by hour of day (Temporal Risk Filter)
    let filteredRows = rows;
    if (startHour !== null && endHour !== null) {
      const start = parseInt(startHour, 10);
      const end = parseInt(endHour, 10);
      
      filteredRows = rows.filter(row => {
        const date = new Date(row.time_of_incident);
        const hour = date.getHours();
        if (start <= end) {
          return hour >= start && hour <= end;
        } else {
          // Crosses midnight (e.g. 22 to 2)
          return hour >= start || hour <= end;
        }
      });
    }

    db.close();

    return NextResponse.json({
      success: true,
      data: filteredRows
    });
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
