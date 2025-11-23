const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { readDB, writeDB } = require('../lib/db');
let pg = null;
try { if (process.env.DATABASE_URL) pg = require('../lib/pg'); } catch (e) { pg = null; }
const { SECRET } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

router.post('/register', (req, res) => {
  const { name, lastName, birthDate, email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  // basic email format check
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(email)) return res.status(400).json({ error: 'Invalid email format' });
  const hash = bcrypt.hashSync(password, 10);
  const newUser = { id: uuidv4(), name: name || '', lastName: lastName || '', birthDate: birthDate || null, email, password: hash, role: 'user', createdAt: new Date().toISOString() };
  if (pg) {
    (async ()=>{
      try{
        const exists = await pg.getUserByEmail(email);
        if (exists) return res.status(400).json({ error: 'Email exists' });
        const created = await pg.createUser(newUser);
        return res.json({ ok: true, id: created.id });
      }catch(err){
        console.error(err);
        return res.status(500).json({ error: 'DB error' });
      }
    })();
  } else {
    const db = readDB();
    if (db.users.find(u => u.email === email)) return res.status(400).json({ error: 'Email exists' });
    db.users.push(newUser);
    writeDB(db);
    res.json({ ok: true, id: newUser.id });
  }
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (pg) {
    (async ()=>{
      try{
        const user = await pg.getUserByEmail(email);
        if (!user) return res.status(400).json({ error: 'Invalid credentials' });
        const match = bcrypt.compareSync(password, user.password);
        if (!match) return res.status(400).json({ error: 'Invalid credentials' });
        const tokenPayload = { id: user.id, email: user.email, role: user.role, name: user.name, lastName: user.lastName || '', birthDate: user.birthDate || null };
        const token = jwt.sign(tokenPayload, SECRET, { expiresIn: '12h' });
        const safe = { id: user.id, name: user.name, lastName: user.lastName || '', birthDate: user.birthDate || null, email: user.email, role: user.role };
        return res.json({ token, user: safe });
      }catch(err){
        console.error(err);
        return res.status(500).json({ error: 'DB error' });
      }
    })();
  } else {
    const db = readDB();
    const user = db.users.find(u => u.email === email);
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    const match = bcrypt.compareSync(password, user.password);
    if (!match) return res.status(400).json({ error: 'Invalid credentials' });
    const tokenPayload = { id: user.id, email: user.email, role: user.role, name: user.name, lastName: user.lastName || '', birthDate: user.birthDate || null };
    const token = jwt.sign(tokenPayload, SECRET, { expiresIn: '12h' });
    const safe = { id: user.id, name: user.name, lastName: user.lastName || '', birthDate: user.birthDate || null, email: user.email, role: user.role };
    res.json({ token, user: safe });
  }
});

module.exports = router;
