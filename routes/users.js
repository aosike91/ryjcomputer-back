const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { readDB, writeDB } = require('../lib/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');
let pg = null;
try { if (process.env.DATABASE_URL) pg = require('../lib/pg'); } catch (e) { pg = null; }

// list users (admin)
router.get('/', verifyToken, requireAdmin, (req, res) => {
  if (pg) {
    (async ()=>{
      try{
        const rows = await pg.listUsers();
        return res.json(rows);
      }catch(err){ console.error(err); return res.status(500).json({ error: 'DB error' }); }
    })();
  } else {
    const db = readDB();
    const safe = db.users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt }));
    res.json(safe);
  }
});

// get profile (self or admin)
router.get('/:id', verifyToken, (req, res) => {
  if (pg) {
    (async ()=>{
      try{
        const u = await pg.getUserById(req.params.id);
        if (!u) return res.status(404).json({ error: 'Not found' });
        if (req.user.id !== u.id) {
          const me = await pg.getUserById(req.user.id);
          if (!me || me.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
        }
        const safe = { id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.created_at };
        return res.json(safe);
      }catch(err){ console.error(err); return res.status(500).json({ error: 'DB error' }); }
    })();
  } else {
    const db = readDB();
    const u = db.users.find(x => x.id === req.params.id);
    if (!u) return res.status(404).json({ error: 'Not found' });
    if (req.user.id !== u.id) {
      // allow admin
      const me = db.users.find(x => x.id === req.user.id);
      if (!me || me.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    }
    const safe = { id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt };
    res.json(safe);
  }
});

// update name (self or admin)
router.put('/:id', verifyToken, (req, res) => {
  if (pg) {
    (async ()=>{
      try{
        const u = await pg.getUserById(req.params.id);
        if (!u) return res.status(404).json({ error: 'Not found' });
        if (req.user.id !== u.id) {
          const me = await pg.getUserById(req.user.id);
          if (!me || me.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
        }
        await pg.updateUser(req.params.id, { name: req.body.name || u.name });
        return res.json({ ok: true });
      }catch(err){ console.error(err); return res.status(500).json({ error: 'DB error' }); }
    })();
  } else {
    const db = readDB();
    const u = db.users.find(x => x.id === req.params.id);
    if (!u) return res.status(404).json({ error: 'Not found' });
    if (req.user.id !== u.id) {
      const me = db.users.find(x => x.id === req.user.id);
      if (!me || me.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    }
    u.name = req.body.name || u.name;
    writeDB(db);
    res.json({ ok: true });
  }
});

// change password
router.post('/:id/password', verifyToken, (req, res) => {
  if (pg) {
    (async ()=>{
      try{
        const u = await pg.getUserById(req.params.id);
        if (!u) return res.status(404).json({ error: 'Not found' });
        const me = await pg.getUserById(req.user.id);
        const isAdmin = me && me.role === 'admin';
        if (req.user.id !== u.id && !isAdmin) return res.status(403).json({ error: 'Forbidden' });
        if (!isAdmin) {
          if (!req.body.currentPassword) return res.status(400).json({ error: 'currentPassword required' });
          const ok = bcrypt.compareSync(req.body.currentPassword, u.password);
          if (!ok) return res.status(400).json({ error: 'Wrong password' });
        }
        if (!req.body.newPassword) return res.status(400).json({ error: 'newPassword required' });
        const hashed = bcrypt.hashSync(req.body.newPassword, 10);
        await pg.updateUser(req.params.id, { password: hashed });
        return res.json({ ok: true });
      }catch(err){ console.error(err); return res.status(500).json({ error: 'DB error' }); }
    })();
  } else {
    const db = readDB();
    const u = db.users.find(x => x.id === req.params.id);
    if (!u) return res.status(404).json({ error: 'Not found' });
    const me = db.users.find(x => x.id === req.user.id);
    const isAdmin = me && me.role === 'admin';
    if (req.user.id !== u.id && !isAdmin) return res.status(403).json({ error: 'Forbidden' });
    if (!isAdmin) {
      // require currentPassword
      if (!req.body.currentPassword) return res.status(400).json({ error: 'currentPassword required' });
      const ok = bcrypt.compareSync(req.body.currentPassword, u.password);
      if (!ok) return res.status(400).json({ error: 'Wrong password' });
    }
    if (!req.body.newPassword) return res.status(400).json({ error: 'newPassword required' });
    u.password = bcrypt.hashSync(req.body.newPassword, 10);
    writeDB(db);
    res.json({ ok: true });
  }
});

// delete user (admin only)
router.delete('/:id', verifyToken, requireAdmin, (req, res) => {
  if (pg) {
    (async ()=>{
      try{ await pg.deleteUser(req.params.id); return res.json({ ok: true }); }catch(err){ console.error(err); return res.status(500).json({ error: 'DB error' }); }
    })();
  } else {
    const db = readDB();
    const idx = db.users.findIndex(x => x.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    db.users.splice(idx, 1);
    writeDB(db);
    res.json({ ok: true });
  }
});

module.exports = router;
