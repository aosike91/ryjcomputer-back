const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { readDB, writeDB } = require('../lib/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const upload = multer({ dest: path.join(__dirname, '..', 'uploads') });

// list
router.get('/', (req, res) => {
  const db = readDB();
  res.json(db.products || []);
});

// get by id
router.get('/:id', (req, res) => {
  const db = readDB();
  const p = db.products.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json(p);
});

// create (admin)
router.post('/', verifyToken, requireAdmin, (req, res) => {
  const db = readDB();
  const payload = req.body;
  const id = payload.id || ('prod-' + uuidv4());
  const product = Object.assign({ id, createdAt: new Date().toISOString() }, payload);
  db.products.push(product);
  writeDB(db);
  res.json({ ok: true, id, ...product });
});

// bulk upload JSON (admin)
router.post('/bulk', verifyToken, requireAdmin, (req, res) => {
  const db = readDB();
  const items = Array.isArray(req.body) ? req.body : [];
  const created = [];
  items.forEach(it => {
    const id = it.id || ('prod-' + uuidv4());
    db.products.push(Object.assign({ id, createdAt: new Date().toISOString() }, it));
    created.push(id);
  });
  writeDB(db);
  res.json({ ok: true, created });
});

// upload image for a product (admin)
router.post('/:id/image', verifyToken, requireAdmin, upload.single('image'), (req, res) => {
  const db = readDB();
  const p = db.products.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  // store URL relative to /uploads
  p.thumb = `/uploads/${req.file.filename}`;
  writeDB(db);
  res.json({ ok: true, url: p.thumb });
});

// update (admin)
router.put('/:id', verifyToken, requireAdmin, (req, res) => {
  const db = readDB();
  const p = db.products.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  Object.assign(p, req.body);
  p.updatedAt = new Date().toISOString();
  writeDB(db);
  res.json({ ok: true });
});

// delete (admin)
router.delete('/:id', verifyToken, requireAdmin, (req, res) => {
  const db = readDB();
  const idx = db.products.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  db.products.splice(idx, 1);
  writeDB(db);
  res.json({ ok: true });
});

module.exports = router;
