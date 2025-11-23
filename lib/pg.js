const { Pool } = require('pg');

let pool = null;

function getPool() {
  if (pool) return pool;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  pool = new Pool({ connectionString: url, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false });
  return pool;
}

async function query(text, params) {
  const p = getPool();
  const res = await p.query(text, params);
  return res;
}

// users helpers
async function getUserByEmail(email) {
  const res = await query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email]);
  return res.rows[0] || null;
}

async function getUserById(id) {
  const res = await query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
  return res.rows[0] || null;
}

async function createUser(user) {
  const { id, name, lastName, birthDate, email, password, role } = user;
  const res = await query(
    `INSERT INTO users (id, name, "lastName", "birthDate", email, password, role)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [id, name, lastName, birthDate, email, password, role || 'user']
  );
  return res.rows[0];
}

async function listUsers() {
  const res = await query('SELECT id, name, "lastName", email, role, created_at FROM users ORDER BY created_at DESC');
  return res.rows;
}

async function updateUser(id, updates) {
  const fields = [];
  const params = [];
  let idx = 1;
  for (const k of Object.keys(updates)) {
    fields.push(`\"${k}\" = $${idx}`);
    params.push(updates[k]);
    idx++;
  }
  if (!fields.length) return null;
  params.push(id);
  const q = `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
  const res = await query(q, params);
  return res.rows[0];
}

async function deleteUser(id) {
  await query('DELETE FROM users WHERE id = $1', [id]);
  return true;
}

module.exports = { getPool, query, getUserByEmail, getUserById, createUser, listUsers, updateUser, deleteUser };
