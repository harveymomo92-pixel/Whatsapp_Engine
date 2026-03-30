const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

loadEnv(path.join(__dirname, '..', '.env'));

const PORT = Number(process.env.PORT || 8560);
const BRIDGE_BASE_URL = process.env.BRIDGE_BASE_URL || 'http://127.0.0.1:8555';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';
const OUTGOING_WEBHOOK_URL = process.env.OUTGOING_WEBHOOK_URL || '';
const OUTGOING_WEBHOOK_TOKEN = process.env.OUTGOING_WEBHOOK_TOKEN || '';
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 5000);
const STORE_PATH = path.resolve(process.cwd(), process.env.STORE_PATH || './data/store.json');

ensureDir(path.dirname(STORE_PATH));
const store = loadStore(STORE_PATH);

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'GET' && url.pathname === '/health') {
      return json(res, 200, { ok: true, service: 'whatsapp-engine' });
    }

    if (req.method === 'GET' && url.pathname === '/api/status') {
      return proxyJson(res, 'GET', '/status');
    }

    if (req.method === 'GET' && url.pathname === '/api/qr') {
      const data = await bridgeFetch('GET', '/qr/data');
      return json(res, 200, data);
    }

    if (req.method === 'GET' && url.pathname === '/api/chats') {
      return proxyJson(res, 'GET', '/chats');
    }

    if (req.method === 'GET' && url.pathname.startsWith('/api/chats/') && url.pathname.endsWith('/messages')) {
      const jid = decodeURIComponent(url.pathname.replace('/api/chats/', '').replace('/messages', ''));
      const limit = url.searchParams.get('limit') || '20';
      return proxyJson(res, 'GET', `/chats/${encodeURIComponent(jid)}/messages?limit=${encodeURIComponent(limit)}`);
    }

    if (req.method === 'GET' && url.pathname === '/api/messages/search') {
      const q = url.searchParams.get('q') || '';
      return proxyJson(res, 'GET', `/messages/search?q=${encodeURIComponent(q)}`);
    }

    if (req.method === 'POST' && url.pathname === '/api/send/text') {
      const body = await readJson(req);
      return proxyJson(res, 'POST', '/send/text', body);
    }

    if (req.method === 'POST' && url.pathname === '/api/reply') {
      const body = await readJson(req);
      return proxyJson(res, 'POST', '/reply', body);
    }

    if (req.method === 'POST' && url.pathname === '/webhooks/inbound/send-text') {
      requireSecret(req);
      const body = await readJson(req);
      const result = await bridgeFetch('POST', '/send/text', body);
      return json(res, 200, { ok: true, action: 'send-text', result });
    }

    if (req.method === 'POST' && url.pathname === '/webhooks/inbound/reply') {
      requireSecret(req);
      const body = await readJson(req);
      const result = await bridgeFetch('POST', '/reply', body);
      return json(res, 200, { ok: true, action: 'reply', result });
    }

    if (req.method === 'POST' && url.pathname === '/webhooks/inbound/event') {
      requireSecret(req);
      const body = await readJson(req);
      let forwarded = null;
      if (body && body.send && body.send.to && body.send.message) {
        forwarded = await bridgeFetch('POST', '/send/text', {
          to: body.send.to,
          message: body.send.message,
        });
      }
      return json(res, 200, { ok: true, received: body, forwarded });
    }

    return json(res, 404, { error: 'Not found' });
  } catch (error) {
    const status = error.statusCode || 500;
    return json(res, status, { error: error.message || 'Internal error' });
  }
});

server.listen(PORT, () => {
  console.log(`whatsapp-engine listening on http://127.0.0.1:${PORT}`);
  console.log(`bridge base: ${BRIDGE_BASE_URL}`);
  if (OUTGOING_WEBHOOK_URL) {
    console.log(`outgoing webhook fanout enabled -> ${OUTGOING_WEBHOOK_URL}`);
  }
});

if (OUTGOING_WEBHOOK_URL) {
  setInterval(() => {
    pollOutgoing().catch((error) => {
      console.error('pollOutgoing error:', error.message);
    });
  }, POLL_INTERVAL_MS).unref();
}

async function pollOutgoing() {
  const chats = await bridgeFetch('GET', '/chats');
  if (!Array.isArray(chats)) return;

  for (const chat of chats) {
    const jid = chat.jid || chat.chat_jid || chat.id;
    if (!jid) continue;

    const messages = await bridgeFetch('GET', `/chats/${encodeURIComponent(jid)}/messages?limit=10`);
    if (!Array.isArray(messages)) continue;

    for (const message of messages) {
      const key = message.id || message.message_id || `${jid}:${message.timestamp}:${message.content || ''}`;
      if (store.seenMessageKeys[key]) continue;

      store.seenMessageKeys[key] = Date.now();
      saveStore(STORE_PATH, store);

      await postJson(OUTGOING_WEBHOOK_URL, {
        type: 'whatsapp.message',
        source: 'whatsapp-engine',
        chat,
        message,
        seenAt: new Date().toISOString(),
      }, OUTGOING_WEBHOOK_TOKEN);
    }
  }

  pruneSeen(store.seenMessageKeys, 5000);
  saveStore(STORE_PATH, store);
}

function pruneSeen(map, maxEntries) {
  const entries = Object.entries(map);
  if (entries.length <= maxEntries) return;
  entries.sort((a, b) => a[1] - b[1]);
  for (const [key] of entries.slice(0, entries.length - maxEntries)) {
    delete map[key];
  }
}

async function proxyJson(res, method, route, body) {
  const data = await bridgeFetch(method, route, body);
  return json(res, 200, data);
}

async function bridgeFetch(method, route, body) {
  const url = new URL(route, BRIDGE_BASE_URL);
  return requestJson(url, method, body);
}

async function postJson(target, payload, bearerToken) {
  const url = new URL(target);
  return requestJson(url, 'POST', payload, bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {});
}

function requestJson(url, method, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(url, {
      method,
      headers: {
        Accept: 'application/json',
        ...extraHeaders,
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const isJson = (res.headers['content-type'] || '').includes('application/json');
        const parsed = isJson && data ? safeJsonParse(data) : data;
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(parsed);
        } else {
          const error = new Error(typeof parsed === 'string' ? parsed : JSON.stringify(parsed));
          error.statusCode = res.statusCode;
          reject(error);
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function requireSecret(req) {
  if (!WEBHOOK_SECRET) return;
  const got = req.headers['x-webhook-secret'];
  if (got !== WEBHOOK_SECRET) {
    const error = new Error('Unauthorized');
    error.statusCode = 401;
    throw error;
  }
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (error) {
        error.statusCode = 400;
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function json(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function safeJsonParse(input) {
  try {
    return JSON.parse(input);
  } catch {
    return input;
  }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function loadStore(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return { seenMessageKeys: {} };
  }
}

function saveStore(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}
