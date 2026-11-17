/* Dreamz Studio service worker — Web Push for new inquiries + a tiny offline shell.
   Never caches Supabase / API responses: only same-origin Studio shell files are cached. */
'use strict';
var CACHE = 'dp-studio-shell-v1';
var SHELL = [
  './', './index.html', './studio.css', './manifest.webmanifest',
  './js/ui.js', './js/backend.js', './js/fields.js', './js/media.js', './js/editors.js', './js/panels.js', './js/push.js', './js/app.js',
  '../js/config.js', '../js/themes.js', '../js/upgrade.js',
  '../assets/brand/logo-mark.svg', '../assets/brand/logo-horizontal.svg', '../assets/brand/favicon.svg',
  '../assets/brand/icon-192.png', '../assets/brand/favicon-32.png'
];
var ICON = new URL('../assets/brand/icon-192.png', self.registration.scope).href;
var BADGE = new URL('../assets/brand/favicon-32.png', self.registration.scope).href;

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(SHELL.map(function (p) { return c.add(new Request(p, { cache: 'reload' })).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('dp-studio-shell-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

/* Network first for the shell (so updates show at once), cache only as an offline fallback. */
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;            // Supabase, CDNs, fonts: browser default, never cached here
  var scopePath = new URL('../', self.registration.scope).pathname;
  if (url.pathname.indexOf(scopePath) !== 0) return;
  var isShell = req.mode === 'navigate' || SHELL.some(function (p) { return new URL(p, self.registration.scope).pathname === url.pathname; });
  if (!isShell) return;
  e.respondWith(fetch(req).then(function (res) {
    if (res && res.ok && res.type === 'basic') { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req.mode === 'navigate' ? './' : req, copy); }); }
    return res;
  }).catch(function () {
    return caches.match(req.mode === 'navigate' ? './' : req, { ignoreSearch: req.mode === 'navigate' }).then(function (r) { return r || caches.match('./'); });
  }));
});

self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data ? e.data.text() : '' }; }
  var title = d.title || 'New inquiry';
  var opts = {
    body: d.body || 'Open the Studio to see it.',
    icon: ICON, badge: BADGE,
    tag: d.tag || ('lead-' + (d.lead_id || Date.now())),
    renotify: true,
    data: { url: d.url || './#leads', lead_id: d.lead_id || null }
  };
  e.waitUntil(self.registration.showNotification(title, opts).then(function () {
    return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) {
      cs.forEach(function (c) { c.postMessage({ type: 'dp:push', payload: d }); });
    });
  }));
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var target = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) {
    var scope = self.registration.scope;
    var c = cs.filter(function (w) { return w.url.indexOf(scope) === 0; })[0];
    if (c) {
      c.postMessage({ type: 'dp:open', url: target, lead_id: e.notification.data && e.notification.data.lead_id });
      return c.focus().then(function (w) { return w || c; });
    }
    return self.clients.openWindow(target);
  }));
});

/* Subscription rotated by the browser: tell open Studio tabs so they re-register it. */
self.addEventListener('pushsubscriptionchange', function () {
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) { cs.forEach(function (c) { c.postMessage({ type: 'dp:resubscribe' }); }); });
});
