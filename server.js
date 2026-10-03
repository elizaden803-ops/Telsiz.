// TELSİZ — internet üzərində qrup rabitə serveri, lisenziya + admin sistemi ilə
// Yerli işə salınma: npm install && node server.js

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const QRCode = require('qrcode');
const webpush = require('web-push');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;
const DATA_DIR = path.join(__dirname, 'data');
const HISTORY_LIMIT = 60;

// ⚠️ Master/qurucu kod — bunu bilən proqramı hər yerdə lisenziyalaya
// (və ya lisenziyanı silə) bilər. Render-in "Environment" bölməsində
// MASTER_CODE adlı dəyər qoysan, kod repo-da heç görünməz (tövsiyə olunur).
const MASTER_CODE = process.env.MASTER_CODE || '212500032Na';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

// ---------- Qrup kodları (YALNIZ master kodla yaradıla bilər) ----------
const CODES_FILE = path.join(DATA_DIR, 'group-codes.json');
function loadCodes() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(CODES_FILE)) return JSON.parse(fs.readFileSync(CODES_FILE, 'utf8'));
  } catch (e) {}
  return {};
}
function saveCodes(data) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(CODES_FILE, JSON.stringify(data));
  } catch (e) { console.error('Kod faylı yazıla bilmədi:', e.message); }
}
let groupCodes = loadCodes(); // { [code]: { licensed, createdAt } }

function isCodeUsable(code) {
  const entry = groupCodes[String(code || '').toLowerCase()];
  return !!(entry && entry.licensed);
}

// ---------- Push bildirişləri (VAPID) ----------
const VAPID_FILE = path.join(DATA_DIR, 'vapid.json');
function loadOrCreateVapid() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(VAPID_FILE)) return JSON.parse(fs.readFileSync(VAPID_FILE, 'utf8'));
  } catch (e) {}
  const keys = webpush.generateVAPIDKeys();
  try { fs.writeFileSync(VAPID_FILE, JSON.stringify(keys)); } catch (e) {}
  return keys;
}
const vapidKeys = loadOrCreateVapid();
webpush.setVapidDetails('mailto:admin@telsiz.local', vapidKeys.publicKey, vapidKeys.privateKey);

function notifyPush(channel, title, body) {
  const room = getRoom(channel);
  for (const [endpoint, sub] of room.pushSubs) {
    webpush.sendNotification(sub, JSON.stringify({ title, body })).catch((err) => {
      if (err && (err.statusCode === 410 || err.statusCode === 404)) room.pushSubs.delete(endpoint);
    });
  }
}

// ---------- Otaqlar (qruplar) ----------
// channel (group code) -> { clients: Set<ws>, history: [], adminTokens: Set, pin }
const rooms = new Map();
let nextMsgId = 1;

function getRoom(channel) {
  if (!rooms.has(channel)) rooms.set(channel, { clients: new Set(), history: [], adminTokens: new Set(), pin: null, pushSubs: new Map() });
  return rooms.get(channel);
}

function presenceList(room) {
  return [...room.clients].map(c => ({ id: c.id, name: c.name, admin: !!c.isAdmin })).filter(p => p.name);
}

function broadcastPresence(channel) {
  const room = getRoom(channel);
  const payload = JSON.stringify({ type: 'presence', users: presenceList(room) });
  for (const c of room.clients) if (c.readyState === 1) c.send(payload);
}

function broadcast(channel, msgObj, excludeWs) {
  const room = getRoom(channel);
  const payload = JSON.stringify(msgObj);
  for (const c of room.clients) if (c !== excludeWs && c.readyState === 1) c.send(payload);
}

function pushHistory(channel, msgObj) {
  const room = getRoom(channel);
  room.history.push(msgObj);
  if (room.history.length > HISTORY_LIMIT) room.history.shift();
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function makeCode(len) {
  let out = '';
  const bytes = crypto.randomBytes(len);
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}
function freshGroupCode() {
  let code;
  do { code = makeCode(6); } while (rooms.has(code.toLowerCase()));
  return code;
}

function originFor(req) {
  const proto = req.headers['x-forwarded-proto'] || (req.socket.encrypted ? 'https' : 'http');
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

const qrCache = new Map();
async function getQrPng(url) {
  if (qrCache.has(url)) return qrCache.get(url);
  const png = await QRCode.toBuffer(url, { width: 480, margin: 1, color: { dark: '#141813', light: '#eae6d9' } });
  qrCache.set(url, png);
  if (qrCache.size > 500) qrCache.delete(qrCache.keys().next().value);
  return png;
}

function readJsonBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 10000) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch (e) { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, 'http://placeholder');
  let reqPath = urlObj.pathname;
  if (reqPath === '/') reqPath = '/index.html';

  // Ad sahəsinə yazılan mətnin master kod olub-olmadığını yoxla (dəyəri geri qaytarmır, yalnız bəli/xeyr)
  if (reqPath === '/api/check-master' && req.method === 'POST') {
    readJsonBody(req).then((body) => {
      const value = String(body.value || '').trim();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ isMaster: value === MASTER_CODE }));
    });
    return;
  }

  // Mövcud bir kodun lisenziya vəziyyətini yoxla (qurucu panelində istifadə üçün)
  if (reqPath === '/api/code-status' && req.method === 'GET') {
    const code = String(urlObj.searchParams.get('g') || '').trim().toLowerCase();
    if (!code) { res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify({ error: 'Kod lazımdır' })); return; }
    const entry = groupCodes[code];
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ exists: !!entry, licensed: !!(entry && entry.licensed) }));
    return;
  }

  // YALNIZ master kodla: mövcud bir kodu aktivləşdir/sil (əvvəl yaradılmış kod üçün)
  if (reqPath === '/api/license' && req.method === 'POST') {
    readJsonBody(req).then((body) => {
      const masterCode = String(body.masterCode || '').trim();
      const code = String(body.groupCode || '').trim().toLowerCase();
      const action = body.action === 'remove' ? 'remove' : 'activate';
      if (masterCode !== MASTER_CODE) {
        res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'Yanlış kod' }));
        return;
      }
      if (!code) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'Qrup kodu lazımdır' }));
        return;
      }
      if (!groupCodes[code]) groupCodes[code] = { licensed: false, createdAt: Date.now() };
      groupCodes[code].licensed = action === 'activate';
      saveCodes(groupCodes);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, licensed: groupCodes[code].licensed }));
    });
    return;
  }

  if (reqPath === '/api/vapid-public-key') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ key: vapidKeys.publicKey }));
    return;
  }

  if (reqPath === '/api/push-subscribe' && req.method === 'POST') {
    readJsonBody(req).then((body) => {
      const channel = String(body.channel || '').trim().toLowerCase();
      const sub = body.subscription;
      if (!channel || !sub || !sub.endpoint) { res.writeHead(400); res.end('{}'); return; }
      const room = getRoom(channel);
      room.pushSubs.set(sub.endpoint, sub);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true }));
    });
    return;
  }

  // YALNIZ master kodla: tamamilə yeni kod yarat (bunu yalnız qurucu edə bilər)
  if (reqPath === '/api/founder/new-code' && req.method === 'POST') {
    readJsonBody(req).then((body) => {
      const masterCode = String(body.masterCode || '').trim();
      if (masterCode !== MASTER_CODE) {
        res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'Yanlış kod' }));
        return;
      }
      const code = freshGroupCode();
      const adminToken = crypto.randomBytes(16).toString('hex');
      rooms.set(code.toLowerCase(), { clients: new Set(), history: [], adminTokens: new Set([adminToken]), pin: null, pushSubs: new Map() });
      groupCodes[code.toLowerCase()] = { licensed: true, createdAt: Date.now() };
      saveCodes(groupCodes);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ ok: true, code, adminToken }));
    });
    return;
  }

  if (reqPath === '/invite.png') {
    const code = String(urlObj.searchParams.get('g') || '').trim();
    if (!code) { res.writeHead(400); res.end(); return; }
    const link = `${originFor(req)}/?g=${encodeURIComponent(code)}`;
    getQrPng(link).then((png) => {
      res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' });
      res.end(png);
    }).catch(() => { res.writeHead(500); res.end(); });
    return;
  }

  if (reqPath === '/invite-link') {
    const code = String(urlObj.searchParams.get('g') || '').trim();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ url: `${originFor(req)}/?g=${encodeURIComponent(code)}` }));
    return;
  }

  const filePath = path.join(PUBLIC_DIR, reqPath);
  if (!filePath.startsWith(PUBLIC_DIR)) { res.writeHead(403); res.end('Qadağandır'); return; }
  const ALLOWED_STATIC_FILES = new Set(['/index.html', '/sw.js', '/manifest.webmanifest', '/icon.png']);
  if (!ALLOWED_STATIC_FILES.has(reqPath)) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Tapılmadı'); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Tapılmadı'); return; }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });
let nextId = 1;

wss.on('connection', (ws) => {
  ws.id = nextId++;
  ws.name = null;
  ws.channel = null;
  ws.isAdmin = false;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch (e) { return; }

    if (msg.type === 'join') {
      const channel = String(msg.channel || '').trim().toLowerCase().slice(0, 40);
      const name = String(msg.name || 'Naməlum').trim().slice(0, 30) || 'Naməlum';
      if (!channel) { ws.send(JSON.stringify({ type: 'error', text: 'Qrup kodu yoxdur' })); return; }

      if (!isCodeUsable(channel)) { ws.send(JSON.stringify({ type: 'error', code: 'invalid-code', text: 'Bu kod tapılmadı və ya aktiv deyil.' })); return; }

      const room = getRoom(channel);
      if (room.pin && String(msg.pin || '') !== room.pin) {
        ws.send(JSON.stringify({ type: 'error', code: 'wrong-pin', text: 'PIN kodu səhvdir.' }));
        return;
      }

      ws.channel = channel;
      ws.name = name;
      if (room.adminTokens.has(msg.adminToken)) ws.isAdmin = true;

      room.clients.add(ws);
      ws.send(JSON.stringify({ type: 'history', messages: room.history, youId: ws.id, isAdmin: ws.isAdmin }));
      broadcastPresence(channel);
      broadcast(channel, { type: 'system', text: `${name} qoşuldu`, ts: Date.now() }, ws);
      return;
    }

    if (!ws.channel || !ws.name) return;

    if (msg.type === 'chat') {
      const out = { type: 'chat', msgId: nextMsgId++, id: ws.id, name: ws.name, text: String(msg.text || '').slice(0, 2000), ts: Date.now() };
      pushHistory(ws.channel, out);
      broadcast(ws.channel, out, null);
      notifyPush(ws.channel, 'TELSİZ', `${ws.name}: ${out.text.slice(0, 80)}`);
      return;
    }
    if (msg.type === 'photo') {
      const out = { type: 'photo', msgId: nextMsgId++, id: ws.id, name: ws.name, dataUrl: msg.dataUrl, ts: Date.now() };
      pushHistory(ws.channel, out);
      broadcast(ws.channel, out, null);
      notifyPush(ws.channel, 'TELSİZ', `${ws.name} şəkil göndərdi`);
      return;
    }
    if (msg.type === 'voice') {
      const out = { type: 'voice', msgId: nextMsgId++, id: ws.id, name: ws.name, dataUrl: msg.dataUrl, duration: msg.duration || 0, ts: Date.now() };
      pushHistory(ws.channel, out);
      broadcast(ws.channel, out, null);
      notifyPush(ws.channel, 'TELSİZ', `${ws.name} səs mesajı göndərdi`);
      return;
    }
    if (msg.type === 'ptt-start') { broadcast(ws.channel, { type: 'ptt-start', id: ws.id, name: ws.name }, ws); return; }
    if (msg.type === 'ptt-stop') { broadcast(ws.channel, { type: 'ptt-stop', id: ws.id, name: ws.name }, ws); return; }

    if (msg.type === 'sos') {
      const lat = typeof msg.lat === 'number' ? msg.lat : null;
      const lng = typeof msg.lng === 'number' ? msg.lng : null;
      broadcast(ws.channel, { type: 'sos', name: ws.name, lat, lng, ts: Date.now() }, null);
      notifyPush(ws.channel, '🚨 SOS — TELSİZ', `${ws.name} təcili kömək istəyir!`);
      return;
    }

    if (msg.type === 'set-pin') {
      if (!ws.isAdmin) return;
      const room = getRoom(ws.channel);
      const pin = String(msg.pin || '').trim().slice(0, 8);
      room.pin = pin || null;
      ws.send(JSON.stringify({ type: 'pin-updated', pin: room.pin }));
      return;
    }

    if (msg.type === 'kick') {
      if (!ws.isAdmin) return;
      const room = getRoom(ws.channel);
      const targetId = msg.targetId;
      for (const c of room.clients) {
        if (c.id === targetId) {
          c.send(JSON.stringify({ type: 'kicked', by: ws.name }));
          room.clients.delete(c);
          broadcast(ws.channel, { type: 'system', text: `${c.name} qrupdan çıxarıldı (${ws.name})`, ts: Date.now() }, null);
          try { c.close(); } catch (e) {}
        }
      }
      broadcastPresence(ws.channel);
      return;
    }

    if (msg.type === 'promote') {
      if (!ws.isAdmin) return;
      const room = getRoom(ws.channel);
      for (const c of room.clients) {
        if (c.id === msg.targetId && !c.isAdmin) {
          c.isAdmin = true;
          const newToken = crypto.randomBytes(16).toString('hex');
          room.adminTokens.add(newToken);
          c.send(JSON.stringify({ type: 'promoted', adminToken: newToken, by: ws.name }));
          broadcast(ws.channel, { type: 'system', text: `${c.name} admin edildi (${ws.name})`, ts: Date.now() }, null);
        }
      }
      broadcastPresence(ws.channel);
      return;
    }

    if (msg.type === 'delete-message') {
      if (!ws.isAdmin) return;
      const room = getRoom(ws.channel);
      const msgId = msg.msgId;
      room.history = room.history.filter(m => m.msgId !== msgId);
      broadcast(ws.channel, { type: 'message-deleted', msgId }, null);
      return;
    }
  });

  ws.on('close', () => {
    if (ws.channel) {
      const room = getRoom(ws.channel);
      room.clients.delete(ws);
      broadcastPresence(ws.channel);
      if (ws.name) broadcast(ws.channel, { type: 'system', text: `${ws.name} ayrıldı`, ts: Date.now() }, ws);
      if (room.clients.size === 0) rooms.delete(ws.channel);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('TELSİZ server işə düşdü, port:', PORT, '| kodlar yalnız master kodla yaradıla bilər');
});
