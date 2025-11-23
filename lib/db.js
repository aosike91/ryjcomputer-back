const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data.json');

// If DATABASE_URL is present, prefer Postgres via lib/pg.js
let usePg = false;
try {
  if (process.env.DATABASE_URL) {
    usePg = true;
  }
} catch (e) {}

let pg = null;
if (usePg) {
  try { pg = require('./pg'); } catch (e) { console.warn('pg module not available or DATABASE_URL invalid'); usePg = false; }
}

function initDB() {
  if (!fs.existsSync(FILE)) {
    const initial = { users: [], products: [], orders: [] };
    fs.writeFileSync(FILE, JSON.stringify(initial, null, 2));
  }
}

function readDB() {
  if (usePg && pg) {
    // fetch from postgres minimally for users/products
    // For simplicity return users/products as arrays via synchronous read is not possible
    // so we read the JSON fallback instead. Use DB helpers directly in routes when PG is enabled.
    try {
      const raw = fs.readFileSync(FILE, 'utf8');
      return JSON.parse(raw);
    } catch (e) {
      return { users: [], products: [], orders: [] };
    }
  }
  try {
    const raw = fs.readFileSync(FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return { users: [], products: [], orders: [] };
  }
}

function writeDB(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

module.exports = { initDB, readDB, writeDB };
