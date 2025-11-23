const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initDB, readDB, writeDB } = require('./lib/db');

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const productsRoutes = require('./routes/products');
const ordersRoutes = require('./routes/orders');

const UPLOADS = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(UPLOADS));

// init DB
initDB();
const db = readDB();

// seed admin if missing
const bcrypt = require('bcrypt');
const ADMIN_EMAIL = 'ryjcomputer@gmail.com';
const ADMIN_PASS = 'QDETWTF43F6634F';
if (!db.users.find(u => u.email === ADMIN_EMAIL)) {
  const hash = bcrypt.hashSync(ADMIN_PASS, 10);
  db.users.push({ id: 'user-admin', name: 'Admin', email: ADMIN_EMAIL, password: hash, role: 'admin', createdAt: new Date().toISOString() });
  writeDB(db);
  console.log('Seeded admin user:', ADMIN_EMAIL);
}

app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/products', productsRoutes);
app.use('/orders', ordersRoutes);

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0';

// helper to get local LAN ip for convenience when HOST is 0.0.0.0
function getLocalIp() {
  try {
    const os = require('os');
    const ifaces = os.networkInterfaces();
    for (const name of Object.keys(ifaces)) {
      for (const iface of ifaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
  } catch (e) {
    return null;
  }
  return null;
}

app.listen(PORT, HOST, () => {
  if (HOST === '0.0.0.0') {
    const ip = getLocalIp();
    console.log(`Backend listening on 0.0.0.0:${PORT}`);
    if (ip) console.log(`Access it from other devices at http://${ip}:${PORT}`);
  } else {
    console.log(`Backend running on http://${HOST}:${PORT}`);
  }
});
