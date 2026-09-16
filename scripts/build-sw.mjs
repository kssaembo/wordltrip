import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

// Cache only the public offline page and its illustration. Never cache Auth,
// database responses, signed photos, or a student's rendered portfolio.
const files = ['/offline.html', '/pwa/icon-192.png']
const version = createHash('sha256')
  .update(files.map((p) => readFileSync(`dist${p}`).toString('base64')).join(''))
  .digest('hex')
  .slice(0, 12)
writeFileSync(
  'dist/sw.js',
  `
const CACHE = 'world-journal-offline-${version}';
const FILES = ${JSON.stringify(files)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('world-journal-offline-') && key !== CACHE).map(key => caches.delete(key)))));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.open(CACHE).then(cache => cache.match('/offline.html'))));
  } else if (FILES.includes(url.pathname) && !url.search) {
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(url.pathname)) || fetch(request)));
  }
});
`,
)
