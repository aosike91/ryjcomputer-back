const express = require('express');
const router = express.Router();
const { readDB, writeDB } = require('../lib/db');
const { v4: uuidv4 } = require('uuid');
const { verifyToken } = require('../middleware/auth');

// create order (authenticated)
router.post('/', verifyToken, (req, res) => {
  const db = readDB();
  const { items, total } = req.body; // items: [{ id, qty }]
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Items required' });
  // check stock
  for (const it of items) {
    const p = db.products.find(x => x.id === it.id);
    if (!p) return res.status(400).json({ error: `Product ${it.id} not found` });
    if ((p.stock || 0) < it.qty) return res.status(400).json({ error: `No stock ${p.id}` });
  }
  // decrement stock
  for (const it of items) {
    const p = db.products.find(x => x.id === it.id);
    p.stock = (p.stock || 0) - it.qty;
  }
  const order = { id: 'ord-' + uuidv4(), userId: req.user.id, items, total: total || 0, createdAt: new Date().toISOString() };
  db.orders.push(order);
  writeDB(db);
  res.json({ ok: true, id: order.id });
});

module.exports = router;
