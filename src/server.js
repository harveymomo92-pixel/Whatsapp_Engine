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
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 2000);
const POLL_MESSAGE_LIMIT = Number(process.env.POLL_MESSAGE_LIMIT || 20);
const BOOTSTRAP_MARK_SEEN_ONLY = String(process.env.BOOTSTRAP_MARK_SEEN_ONLY || 'false').toLowerCase() === 'true';
const DELIVERY_RETRY_BASE_MS = Number(process.env.DELIVERY_RETRY_BASE_MS || 5000);
const DELIVERY_RETRY_MAX_MS = Number(process.env.DELIVERY_RETRY_MAX_MS || 300000);
const DELIVERY_MAX_ATTEMPTS = Number(process.env.DELIVERY_MAX_ATTEMPTS || 10);
const STORE_PATH = path.resolve(process.cwd(), process.env.STORE_PATH || './data/store.json');
const LOG_PATH = path.resolve(process.cwd(), process.env.LOG_PATH || './data/engine.log');
const DELIVERY_QUEUE_PATH = path.resolve(process.cwd(), process.env.DELIVERY_QUEUE_PATH || './data/delivery-queue.json');

ensureDir(path.dirname(STORE_PATH));
ensureDir(path.dirname(LOG_PATH));
ensureDir(path.dirname(DELIVERY_QUEUE_PATH));
const store = loadStore(STORE_PATH);
let pollInProgress = false;
let queueDrainInProgress = false;

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
      const limit = url.searchParams.get('limit') || String(POLL_MESSAGE_LIMIT);
      return proxyJson(res, 'GET', `/chats/${encodeChatJid(jid)}/messages?limit=${encodeURIComponent(limit)}`);
    }

    if (req.method === 'GET' && url.pathname === '/api/messages/search') {
      const q = url.searchParams.get('q') || '';
      return proxyJson(res, 'GET', `/messages/search?q=${encodeURIComponent(q)}`);
    }

    if (req.method === 'GET' && url.pathname === '/api/debug/store') {
      const queue = loadDeliveryQueue();
      return json(res, 200, {
        ok: true,
        seenCount: Object.keys(store.seenMessageKeys || {}).length,
        lastPollAt: store.lastPollAt || null,
        lastSuccessfulPostAt: store.lastSuccessfulPostAt || null,
        lastErrorAt: store.lastErrorAt || null,
        lastError: store.lastError || null,
        bootstrapCompletedAt: store.bootstrapCompletedAt || null,
        bootstrapMarkSeenOnly: BOOTSTRAP_MARK_SEEN_ONLY,
        deliveryQueueSize: queue.length,
        deliveryStats: store.deliveryStats,
      });
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
    logLine('http_error', {
      status,
      message: error.message || 'Internal error',
    });
    return json(res, status, { error: error.message || 'Internal error' });
  }
});

server.listen(PORT, () => {
  logLine('startup', {
    port: PORT,
    bridgeBaseUrl: BRIDGE_BASE_URL,
    outgoingWebhookUrl: OUTGOING_WEBHOOK_URL || null,
    pollIntervalMs: POLL_INTERVAL_MS,
    pollMessageLimit: POLL_MESSAGE_LIMIT,
    bootstrapMarkSeenOnly: BOOTSTRAP_MARK_SEEN_ONLY,
    deliveryRetryBaseMs: DELIVERY_RETRY_BASE_MS,
    deliveryRetryMaxMs: DELIVERY_RETRY_MAX_MS,
    deliveryMaxAttempts: DELIVERY_MAX_ATTEMPTS,
  });
});

if (OUTGOING_WEBHOOK_URL) {
  setInterval(async () => {
    if (pollInProgress) {
      logLine('poll_skipped_overlap');
      return;
    }

    pollInProgress = true;
    try {
      await pollOutgoing();
      await drainDeliveryQueue();
    } catch (error) {
      store.lastErrorAt = new Date().toISOString();
      store.lastError = error.message;
      saveStore(STORE_PATH, store);
      logLine('poll_error', { message: error.message });
    } finally {
      pollInProgress = false;
    }
  }, POLL_INTERVAL_MS).unref();
}

async function pollOutgoing() {
  const chats = await bridgeFetch('GET', '/chats');
  if (!Array.isArray(chats)) {
    logLine('poll_skip_invalid_chats', { receivedType: typeof chats });
    return;
  }

  let postedCount = 0;

  for (const chat of chats) {
    const jid = chat.jid || chat.chat_jid || chat.id;
    if (!jid) continue;

    const messages = await bridgeFetch('GET', `/chats/${encodeChatJid(jid)}/messages?limit=${encodeURIComponent(POLL_MESSAGE_LIMIT)}`);
    if (!Array.isArray(messages)) {
      logLine('poll_skip_invalid_messages', { jid, receivedType: typeof messages });
      continue;
    }

    for (const message of messages.slice().reverse()) {
      if (!shouldForwardMessage(message)) {
        trackStat('skipped');
        continue;
      }

      const key = buildMessageKey(jid, message);
      if (!key) {
        trackStat('skipped');
        continue;
      }
      if (store.seenMessageKeys[key]) {
        trackStat('deduped');
        continue;
      }

      if (BOOTSTRAP_MARK_SEEN_ONLY && !store.bootstrapCompletedAt) {
        store.seenMessageKeys[key] = Date.now();
        trackStat('bootstrapMarkedSeen');
        continue;
      }

      const payload = normalizeOutgoingPayload(chat, message);
      if (!payload) {
        trackStat('skipped');
        continue;
      }

      store.seenMessageKeys[key] = Date.now();
      try {
        await deliverPayload(key, payload, { jid, source: 'poll' });
        postedCount += 1;
      } catch (error) {
        store.lastErrorAt = new Date().toISOString();
        store.lastError = error.message;
        enqueueDelivery({ key, payload, jid, source: 'poll' }, error);
      }
    }
  }

  store.lastPollAt = new Date().toISOString();
  if (BOOTSTRAP_MARK_SEEN_ONLY && !store.bootstrapCompletedAt) {
    store.bootstrapCompletedAt = new Date().toISOString();
    logLine('bootstrap_completed', { seenCount: Object.keys(store.seenMessageKeys).length });
  }
  pruneSeen(store.seenMessageKeys, 5000);
  saveStore(STORE_PATH, store);

  if (postedCount > 0) {
    logLine('poll_complete', {
      postedCount,
      seenCount: Object.keys(store.seenMessageKeys).length,
      queueSize: loadDeliveryQueue().length,
    });
  }
}

async function deliverPayload(key, payload, meta = {}) {
  await postJson(OUTGOING_WEBHOOK_URL, payload, OUTGOING_WEBHOOK_TOKEN);
  store.lastSuccessfulPostAt = new Date().toISOString();
  trackStat('forwarded');
  saveStore(STORE_PATH, store);

  logLine('webhook_sent', {
    key,
    jid: meta.jid || payload.chat?.jid || '',
    messageId: payload.message?.id || '',
    messageType: payload.message?.msg_type || '',
    source: meta.source || 'unknown',
  });
}

function enqueueDelivery(job, error) {
  const queue = loadDeliveryQueue();
  const now = Date.now();
  const existing = queue.find((item) => item.key === job.key);
  const base = {
    key: job.key,
    jid: job.jid || job.payload?.chat?.jid || '',
    payload: job.payload,
    source: job.source || 'poll',
    attempts: 0,
    nextAttemptAt: now + DELIVERY_RETRY_BASE_MS,
    lastError: error ? error.message : 'Unknown delivery error',
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
  };

  if (existing) {
    existing.lastError = base.lastError;
    existing.updatedAt = base.updatedAt;
    existing.nextAttemptAt = Math.min(now + DELIVERY_RETRY_BASE_MS, now + DELIVERY_RETRY_MAX_MS);
  } else {
    queue.push(base);
  }

  saveDeliveryQueue(queue);
  trackStat('queued');
  saveStore(STORE_PATH, store);
  logLine('delivery_queued', { key: job.key, jid: base.jid, reason: base.lastError });
}

async function drainDeliveryQueue() {
  if (queueDrainInProgress) return;
  queueDrainInProgress = true;

  try {
    const queue = loadDeliveryQueue();
    if (!queue.length) return;

    const now = Date.now();
    const remaining = [];

    for (const item of queue) {
      if ((item.nextAttemptAt || 0) > now) {
        remaining.push(item);
        continue;
      }

      try {
        await deliverPayload(item.key, item.payload, { jid: item.jid, source: 'retry' });
        trackStat('retriedSuccess');
        logLine('delivery_retry_success', { key: item.key, jid: item.jid, attempts: item.attempts + 1 });
      } catch (error) {
        item.attempts = Number(item.attempts || 0) + 1;
        item.lastError = error.message;
        item.updatedAt = new Date().toISOString();

        if (item.attempts >= DELIVERY_MAX_ATTEMPTS) {
          trackStat('dropped');
          store.lastErrorAt = new Date().toISOString();
          store.lastError = `Dropped delivery ${item.key}: ${error.message}`;
          logLine('delivery_dropped', { key: item.key, jid: item.jid, attempts: item.attempts, error: error.message });
          continue;
        }

        const delay = Math.min(DELIVERY_RETRY_BASE_MS * (2 ** (item.attempts - 1)), DELIVERY_RETRY_MAX_MS);
        item.nextAttemptAt = Date.now() + delay;
        remaining.push(item);
        trackStat('retryScheduled');
        store.lastErrorAt = new Date().toISOString();
        store.lastError = error.message;
        logLine('delivery_retry_scheduled', {
          key: item.key,
          jid: item.jid,
          attempts: item.attempts,
          nextAttemptAt: new Date(item.nextAttemptAt).toISOString(),
          error: error.message,
        });
      }
    }

    saveDeliveryQueue(remaining);
    saveStore(STORE_PATH, store);
  } finally {
    queueDrainInProgress = false;
  }
}

function shouldForwardMessage(message) {
  if (!message || typeof message !== 'object') return false;
  if (message.is_from_me) return false;
  if (!message.id && !message.timestamp) return false;
  return true;
}

function buildMessageKey(jid, message) {
  if (!message) return '';
  return message.id || `${jid}:${message.timestamp || 'no-ts'}:${message.sender_jid || ''}:${message.content || ''}`;
}

function normalizeOutgoingPayload(chat, message) {
  if (!message) return null;

  const mimeType = inferMimeType(message);
  const mediaUrl = message.media_url || mediaPathToUrl(message.media_path);

  return {
    type: 'whatsapp.message',
    source: 'whatsapp-engine',
    chat: {
      jid: chat.jid || message.chat_jid || '',
      name: chat.name || message.group_name || '',
      type: chat.is_group || message.is_group ? 'group' : 'dm',
      is_group: Boolean(chat.is_group || message.is_group),
      unread_count: chat.unread_count || 0,
      last_message: chat.last_message || '',
      last_time: chat.last_time || null,
    },
    message: {
      id: message.id || '',
      chat_jid: message.chat_jid || chat.jid || '',
      sender_jid: message.sender_jid || '',
      sender_name: message.sender_name || '',
      content: message.content || '',
      caption: message.caption || message.content || '',
      msg_type: message.msg_type || message.type || 'unknown',
      timestamp: message.timestamp || null,
      is_from_me: Boolean(message.is_from_me),
      is_group: Boolean(message.is_group),
      group_name: message.group_name || '',
      mime_type: mimeType,
      media_url: mediaUrl,
      media_path: message.media_path || '',
      file_name: message.file_name || path.basename(message.media_path || '') || '',
    },
    seenAt: new Date().toISOString(),
  };
}

function inferMimeType(message) {
  const explicit = message.mime_type || '';
  if (explicit) return explicit;

  const type = message.msg_type || message.type || '';
  const mediaPath = message.media_path || '';
  const ext = path.extname(mediaPath).toLowerCase();

  if (type === 'image' || ['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
    if (ext === '.png') return 'image/png';
    if (ext === '.webp') return 'image/webp';
    return 'image/jpeg';
  }
  if (type === 'video' || ['.mp4', '.mov', '.mkv'].includes(ext)) return 'video/mp4';
  if (type === 'audio' || ['.mp3', '.ogg', '.wav', '.m4a'].includes(ext)) return 'audio/mpeg';
  if (type === 'document') return 'application/octet-stream';
  return '';
}

function encodeChatJid(jid) {
  return String(jid || '').replace(/%/g, '%25').replace(/\//g, '%2F');
}

function mediaPathToUrl(mediaPath) {
  if (!mediaPath) return '';
  if (mediaPath.startsWith('http://') || mediaPath.startsWith('https://') || mediaPath.startsWith('file://')) {
    return mediaPath;
  }
  return `file://${mediaPath}`;
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
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    parsed.seenMessageKeys = parsed.seenMessageKeys || {};
    parsed.deliveryStats = parsed.deliveryStats || defaultDeliveryStats();
    if (!Object.prototype.hasOwnProperty.call(parsed, 'bootstrapCompletedAt')) parsed.bootstrapCompletedAt = null;
    return parsed;
  } catch {
    return {
      seenMessageKeys: {},
      lastPollAt: null,
      lastSuccessfulPostAt: null,
      lastErrorAt: null,
      lastError: null,
      bootstrapCompletedAt: null,
      deliveryStats: defaultDeliveryStats(),
    };
  }
}

function saveStore(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function loadDeliveryQueue() {
  try {
    const parsed = JSON.parse(fs.readFileSync(DELIVERY_QUEUE_PATH, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveDeliveryQueue(queue) {
  fs.writeFileSync(DELIVERY_QUEUE_PATH, JSON.stringify(queue, null, 2));
}

function defaultDeliveryStats() {
  return {
    forwarded: 0,
    queued: 0,
    retryScheduled: 0,
    retriedSuccess: 0,
    dropped: 0,
    skipped: 0,
    deduped: 0,
    bootstrapMarkedSeen: 0,
  };
}

function trackStat(name) {
  if (!store.deliveryStats) store.deliveryStats = defaultDeliveryStats();
  store.deliveryStats[name] = Number(store.deliveryStats[name] || 0) + 1;
}

function logLine(event, details = {}) {
  const line = JSON.stringify({
    at: new Date().toISOString(),
    event,
    ...details,
  });
  fs.appendFileSync(LOG_PATH, `${line}\n`);
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
