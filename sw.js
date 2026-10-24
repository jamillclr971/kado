/* Kado — service worker : hors-ligne, cible de partage, rappel d'expiration */
const VERSION = 'kado-v5';
const SHARE_CACHE = 'kado-share';
const CORE = [
  './', './index.html', './manifest.webmanifest',
  './css/style.css', './js/app.js',
  './vendor/JsBarcode.all.min.js', './vendor/qrcode.js', './js/pdfimport.js',
  './vendor/pdfjs/pdf.min.js', './vendor/pdfjs/pdf.worker.min.js', './vendor/zxing/reader.iife.js', './vendor/zxing/zxing_reader.wasm',
  './fonts/dm-serif-display-latin-400-normal.woff2', './fonts/manrope-latin-wght-normal.woff2',
  './icons/icon-192.png', './icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== SHARE_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);

  // Partage Android -> Kado (image + texte)
  if (req.method === 'POST' && url.pathname.endsWith('/share-target')) {
    e.respondWith((async () => {
      try {
        const fd = await req.formData();
        const cache = await caches.open(SHARE_CACHE);
        for (const k of await cache.keys()) await cache.delete(k);
        const files = fd.getAll('media').filter(f => f && f.size);
        let n = 0;
        for (const f of files) {
          await cache.put(new Request('./shared-' + n), new Response(f, { headers: { 'Content-Type': f.type || 'image/jpeg' } }));
          n++;
        }
        const text = [fd.get('title'), fd.get('text')].filter(Boolean).join('\n');
        await cache.put(new Request('./shared-text'), new Response(text, { headers: { 'Content-Type': 'text/plain' } }));
        return Response.redirect(new URL('./?share=' + n, self.registration.scope).href, 303);
      } catch (err) {
        return Response.redirect(new URL('./', self.registration.scope).href, 303);
      }
    })());
    return;
  }

  if (req.method !== 'GET' || url.origin !== location.origin) return;

  // Cache d'abord, réseau en secours (et mise à jour silencieuse)
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req).then(res => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    const res = await net;
    if (res) return res;
    if (req.mode === 'navigate') return (await cache.match('./index.html')) || Response.error();
    return Response.error();
  })());
});

/* --- Rappel d'expiration en arrière-plan (Chrome Android, appli installée) --- */
function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('kado', 1);
    r.onupgradeneeded = () => {
      const d = r.result;
      if (!d.objectStoreNames.contains('cards')) d.createObjectStore('cards', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta', { keyPath: 'k' });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
const idbGet = (db, store, key) => new Promise(res => {
  const q = db.transaction(store).objectStore(store).get(key);
  q.onsuccess = () => res(q.result); q.onerror = () => res(undefined);
});
const idbAll = (db, store) => new Promise(res => {
  const q = db.transaction(store).objectStore(store).getAll();
  q.onsuccess = () => res(q.result || []); q.onerror = () => res([]);
});
const idbPut = (db, store, val) => new Promise(res => {
  const t = db.transaction(store, 'readwrite'); t.objectStore(store).put(val); t.oncomplete = () => res(); t.onerror = () => res();
});

async function checkExpiry() {
  const db = await idb();
  const days = ((await idbGet(db, 'meta', 'alertDays')) || { v: 30 }).v;
  const last = (await idbGet(db, 'meta', 'lastNotif')) || {};
  const d0 = new Date(); d0.setHours(0, 0, 0, 0);
  const today = d0.toISOString().slice(0, 10) + '|' + d0.getDate();
  if (last.v === today) return;
  const cards = await idbAll(db, 'cards');
  let n = 0, lost = 0;
  for (const c of cards) {
    if (c.archived || !c.expiry) continue;
    const left = Math.round((new Date(c.expiry + 'T00:00:00') - d0) / 864e5);
    const hasValue = c.kind === 'fidelite' || (c.balance || 0) > 0.004;
    if (hasValue && left >= 0 && left <= days) n++;
  }
  if (!n) return;
  await self.registration.showNotification('Kado', {
    body: n === 1 ? '1 carte arrive bientôt à expiration.' : n + ' cartes arrivent bientôt à expiration.',
    icon: './icons/icon-192.png', badge: './icons/icon-192.png', tag: 'kado-expiry'
  });
  await idbPut(db, 'meta', { k: 'lastNotif', v: today });
}

self.addEventListener('periodicsync', e => {
  if (e.tag === 'kado-expiry') e.waitUntil(checkExpiry().catch(() => {}));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(list => {
    if (list.length) return list[0].focus();
    return self.clients.openWindow('./');
  }));
});
