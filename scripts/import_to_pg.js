/**
 * Simple import script: reads data.json and inserts users into Postgres users table.
 * Usage: set DATABASE_URL environment variable and run: node scripts/import_to_pg.js
 */
const fs = require('fs');
const path = require('path');
const pg = require('../lib/pg');

async function run() {
  const file = path.join(__dirname, '..', 'data.json');
  if (!fs.existsSync(file)) return console.error('data.json not found');
  const raw = fs.readFileSync(file, 'utf8');
  const db = JSON.parse(raw);
  if (!db.users || !db.users.length) return console.log('No users to import');
  for (const u of db.users) {
    try {
      // if user exists skip
      const existing = await pg.getUserByEmail(u.email);
      if (existing) { console.log('Skipping existing', u.email); continue; }
      // ensure id is uuid string (if not, pg will accept it if provided)
      await pg.createUser({ id: u.id, name: u.name, lastName: u.lastName, birthDate: u.birthDate, email: u.email, password: u.password, role: u.role });
      console.log('Imported', u.email);
    } catch (err) {
      console.error('Error importing', u.email, err.message);
    }
  }
  process.exit(0);
}

run().catch(err=>{ console.error(err); process.exit(1); });
