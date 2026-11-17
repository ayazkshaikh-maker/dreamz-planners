/* Dreamz Planners — data adapter.
   One API for both modes (Supabase live / local fallback):
     DP.data.getContent()            -> Promise<content>
     DP.data.submitLead(lead)        -> Promise<{ok, mode:'supabase'|'local', error?}>
     DP.data.getAvailability(from,to)-> Promise<[{day:'YYYY-MM-DD', status, note}]>
     DP.data.getReviews()            -> Promise<[{author, event, body, rating}]>
   Plus DP.media.resolve(id) for media ids (manifest first, folder conventions second).
   Any Supabase failure falls back silently; the page must never break. */
(function () {
  'use strict';
  var CFG = window.DP_CONFIG || {};
  var DP = (window.DP = window.DP || {});
  var LEAD_QUEUE_KEY = 'dp:leadQueue';
  var client = null;
  var defaultsCache = null;

  function log() { try { console.info.apply(console, ['[dp]'].concat([].slice.call(arguments))); } catch (e) {} }

  function withTimeout(p, ms) {
    return new Promise(function (resolve, reject) {
      var t = setTimeout(function () { reject(new Error('timeout')); }, ms || CFG.TIMEOUT_MS || 4000);
      Promise.resolve(p).then(function (v) { clearTimeout(t); resolve(v); }, function (e) { clearTimeout(t); reject(e); });
    });
  }

  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }

  /* Objects merge key by key; arrays and scalars from `over` replace `base`.
     null/undefined in `over` keep the default. */
  function deepMerge(base, over) {
    if (!isObj(base)) return over === undefined || over === null ? base : over;
    if (!isObj(over)) return base;
    var out = {};
    Object.keys(base).forEach(function (k) { out[k] = base[k]; });
    Object.keys(over).forEach(function (k) {
      var b = base[k], o = over[k];
      if (o === undefined || o === null) return;
      out[k] = isObj(b) && isObj(o) ? deepMerge(b, o) : o;
    });
    return out;
  }

  function getClient() {
    if (client) return client;
    if (!CFG.USE_SUPABASE || !CFG.SUPABASE_URL || !CFG.SUPABASE_KEY) return null;
    if (!window.supabase || typeof window.supabase.createClient !== 'function') return null;
    try {
      client = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_KEY, {
        auth: { persistSession: true, autoRefreshToken: false, detectSessionInUrl: false }
      });
    } catch (e) { log('supabase init failed', e); client = null; }
    return client;
  }

  function fetchDefaults() {
    if (defaultsCache) return Promise.resolve(defaultsCache);
    return fetch(CFG.CONTENT_URL || 'content/site-content.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('content ' + r.status); return r.json(); })
      .then(function (j) { defaultsCache = j; return j; });
  }

  function previewMode() {
    try { return new URLSearchParams(location.search).get('preview') || ''; } catch (e) { return ''; }
  }

  function fetchRemote(id) {
    var c = getClient();
    if (!c) return Promise.resolve(null);
    // Short timeout: this blocks first paint; defaults are a complete site on their own.
    return withTimeout(c.from('site_content').select('data').eq('id', id).maybeSingle(), CFG.CONTENT_TIMEOUT_MS || 3000)
      .then(function (res) {
        if (res.error) { log('site_content', res.error.message); return null; }
        var d = res.data && res.data.data;
        return isObj(d) && Object.keys(d).length ? d : null;
      })
      .catch(function (e) { log('site_content unavailable', e.message); return null; });
  }

  function getContent() {
    var mode = previewMode();
    return fetchDefaults().then(function (defaults) {
      if (mode === 'local') {
        try {
          var local = JSON.parse(localStorage.getItem('dp:preview-content') || 'null');
          if (isObj(local)) return deepMerge(defaults, local);
        } catch (e) {}
        return defaults;
      }
      var id = mode === 'draft' ? 'draft' : 'published';
      return fetchRemote(id).then(function (remote) {
        if (!remote && id === 'draft') return fetchRemote('published');
        return remote;
      }).then(function (remote) {
        DP.contentSource = remote ? 'supabase:' + id : 'local';
        return remote ? deepMerge(defaults, remote) : defaults;
      });
    });
  }

  /* ---------- leads ---------- */
  function readQueue() { try { return JSON.parse(localStorage.getItem(LEAD_QUEUE_KEY) || '[]'); } catch (e) { return []; } }
  function writeQueue(q) { try { localStorage.setItem(LEAD_QUEUE_KEY, JSON.stringify(q)); } catch (e) {} }

  function toRow(lead) {
    var n = parseInt(lead.guests, 10);
    var date = /^\d{4}-\d{2}-\d{2}$/.test(lead.event_date || '') ? lead.event_date : null;
    return {
      name: String(lead.name || '').slice(0, 200),
      phone: lead.phone || null,
      email: lead.email || null,
      event_type: lead.event_type || null,
      event_date: date,
      guests: isFinite(n) ? n : null,
      services: Array.isArray(lead.services) ? lead.services : [],
      budget: lead.budget || null,
      message: lead.message || null,
      source: lead.source || 'website',
      payload: lead.payload || {}
    };
  }

  function insertRow(row) {
    var c = getClient();
    if (!c) return Promise.reject(new Error('no-supabase'));
    // No .select(): anonymous visitors may insert but not read leads.
    return withTimeout(c.from('leads').insert(row), 8000).then(function (res) {
      if (res.error) throw new Error(res.error.message);
      return true;
    });
  }

  function submitLead(lead) {
    if (!lead || !String(lead.name || '').trim()) return Promise.resolve({ ok: false, error: 'name-required' });
    var row = toRow(lead);
    return insertRow(row).then(function () {
      flushQueue();
      return { ok: true, mode: 'supabase' };
    }).catch(function (e) {
      log('lead stored locally', e.message);
      var q = readQueue();
      q.push({ row: row, queuedAt: new Date().toISOString() });
      writeQueue(q);
      return { ok: true, mode: 'local', error: e.message };
    });
  }

  var flushing = false;
  function flushQueue() {
    if (flushing) return;
    var q = readQueue();
    if (!q.length || !getClient()) return;
    flushing = true;
    var remaining = [];
    q.reduce(function (p, item) {
      return p.then(function () { return insertRow(item.row).catch(function () { remaining.push(item); }); });
    }, Promise.resolve()).then(function () { writeQueue(remaining); flushing = false; });
  }

  /* ---------- availability & reviews ---------- */
  function getAvailability(from, to) {
    var c = getClient();
    var fallback = function () {
      return (DP.content && DP.content.availability || []).filter(function (a) {
        return (!from || a.day >= from) && (!to || a.day <= to);
      });
    };
    if (!c) return Promise.resolve(fallback());
    var q = c.from('availability').select('day,status,note');
    if (from) q = q.gte('day', from);
    if (to) q = q.lte('day', to);
    return withTimeout(q.order('day')).then(function (res) {
      if (res.error) throw new Error(res.error.message);
      return (res.data || []).concat(fallback().filter(function (a) {
        return !(res.data || []).some(function (r) { return r.day === a.day; });
      }));
    }).catch(function (e) { log('availability fallback', e.message); return fallback(); });
  }

  function getReviews() {
    var c = getClient();
    var fallback = function () {
      return ((DP.content && DP.content.reviews && DP.content.reviews.items) || []).filter(function (r) { return r && r.body && r.published !== false; });
    };
    if (!c) return Promise.resolve(fallback());
    return withTimeout(c.from('reviews').select('author,event,body,rating,sort').eq('published', true).order('sort', { ascending: true }))
      .then(function (res) {
        if (res.error) throw new Error(res.error.message);
        var rows = res.data || [];
        return rows.length ? rows : fallback();
      }).catch(function (e) { log('reviews fallback', e.message); return fallback(); });
  }

  DP.data = {
    getContent: getContent,
    submitLead: submitLead,
    getAvailability: getAvailability,
    getReviews: getReviews,
    flushQueue: flushQueue,
    deepMerge: deepMerge,
    client: getClient
  };

  /* ---------- media resolver ---------- */
  var manifest = {};
  var manifestReady = null;
  var base = CFG.MEDIA_BASE || 'assets/media/';

  function normPath(p) {
    if (!p) return '';
    if (/^(https?:|data:|blob:)/.test(p) || p.indexOf('assets/') === 0) return p;
    return base + p.replace(/^\.?\//, '');
  }

  function loadManifest() {
    if (manifestReady) return manifestReady;
    manifestReady = fetch(CFG.MEDIA_MANIFEST || base + 'manifest.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) {
        var list = Array.isArray(j) ? j : [].concat(j.items || [], j.media || [], j.assets || [], j.loops || [], j.stills || []);
        list.forEach(function (m) { if (m && m.id) manifest[m.id] = m; });
        DP.mediaStories = (j && j.stories) || {};
      })
      .catch(function () { log('media manifest not found, using folder conventions'); });
    return manifestReady;
  }

  function resolve(ref) {
    if (!ref) return null;
    if (isObj(ref)) ref = ref.id || ref.src;
    ref = String(ref);
    var credits = (DP.content && DP.content.mediaCredits) || {};
    var focusMap = (DP.content && DP.content.mediaFocus) || {};
    var m = manifest[ref];
    if (m) {
      var isVideo = /video|loop|film/.test(m.type || '') || /\.(mp4|webm|mov)$/i.test(m.src || '');
      var webm = m.webm || (m.sources && m.sources.webm) || '';
      return {
        id: ref, type: isVideo ? 'video' : 'image',
        src: normPath(m.src), webm: webm ? normPath(webm) : '',
        poster: normPath(m.poster || (isVideo ? '' : m.src)), thumb: normPath(m.thumb || m.poster || m.src),
        w: m.w, h: m.h, credit: credits[ref] || m.credit || '', alt: m.alt || m.title || '',
        focus: focusMap[ref] || m.focus || ''
      };
    }
    if (/^(https?:|data:|blob:)/.test(ref) || ref.indexOf('/') >= 0) {
      var v = /\.(mp4|webm|mov)(\?|$)/i.test(ref);
      return { id: ref, type: v ? 'video' : 'image', src: normPath(ref), webm: '', poster: v ? '' : normPath(ref), thumb: v ? '' : normPath(ref), credit: credits[ref] || '', focus: focusMap[ref] || '' };
    }
    if (/^(still|tile)-/.test(ref)) {
      return { id: ref, type: 'image', src: base + 'stills/' + ref + '.webp', poster: base + 'stills/' + ref + '.webp', thumb: base + 'thumbs/' + ref + '.webp', webm: '', credit: credits[ref] || '', focus: focusMap[ref] || '' };
    }
    return { id: ref, type: 'video', src: base + 'loops/' + ref + '.mp4', webm: '', poster: base + 'posters/' + ref + '.webp', thumb: base + 'posters/' + ref + '.webp', credit: credits[ref] || '', focus: focusMap[ref] || '' };
  }

  DP.media = { load: loadManifest, resolve: resolve };
})();
