const jwt = require('jsonwebtoken');
const { readDB } = require('../lib/db');

const SECRET = process.env.JWT_SECRET || 'changeme_ryj_secret';

function verifyToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireAdmin(req, res, next) {
  const db = readDB();
  const u = db.users.find(x => x.id === req.user.id);
  if (!u || u.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}

module.exports = { verifyToken, requireAdmin, SECRET };
