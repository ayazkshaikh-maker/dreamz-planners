/* Dreamz Studio — backend adapter. Same API in two modes:
     'supabase' : live project (RLS protects everything; only the public publishable key is used)
     'local'    : this browser only (localStorage) — used when Supabase is off/unreachable, or for practice.
   Content rows always store the FULL merged content object. */
(function () {
  'use strict';
  var S = (window.Studio = window.Studio || {});
  var u = S.u;
  var CFG = window.DP_CONFIG || {};
  var B = (S.backend = { mode: 'local', client: null, user: null, reason: '' });

  var K = {
    draft: 'dp:studio:draft',
    published: 'dp:preview-content',      // read by index.html?preview=local
    versions: 'dp:studio:versions',
    leadMeta: 'dp:studio:leadMeta',
    leadQueue: 'dp:leadQueue',             // written by the public site when Supabase is unavailable
    reviews: 'dp:studio:reviews',
    localMedia: 'dp:studio:localMedia'
  };
  B.keys = K;

  function timeout(p, ms) {
    return new Promise(function (res, rej) {
      var t = setTimeout(function () { rej(new Error('Timed out — check your connection.')); }, ms || 12000);
      Promise.resolve(p).then(function (v) { clearTimeout(t); res(v); }, function (e) { clearTimeout(t); rej(e); });
    });
  }
  function ok(res) { if (res && res.error) throw new Error(res.error.message || String(res.error)); return res ? res.data : null; }
  B.timeout = timeout;

  /* Decide the mode. Practice mode is forced with ?local=1 (or chosen on the sign-in screen). */
  B.init = function () {
    var forced = /[?&]local=1\b/.test(location.search) || sessionStorage.getItem('dp:studio:forceLocal') === '1';
    if (forced) { B.mode = 'local'; B.reason = 'practice'; return Promise.resolve(B.mode); }
    if (!CFG.USE_SUPABASE) { B.mode = 'local'; B.reason = 'disabled'; return Promise.resolve(B.mode); }
    if (!window.supabase || !window.supabase.createClient) { B.mode = 'local'; B.reason = 'offline'; return Promise.resolve(B.mode); }
    B.client = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    // Reachability probe (public endpoint, no data).
    return timeout(fetch(CFG.SUPABASE_URL + '/auth/v1/health', { headers: { apikey: CFG.SUPABASE_KEY } }), 6000)
      .then(function (r) { if (!r.ok && r.status >= 500) throw new Error('status ' + r.status); B.mode = 'supabase'; return B.mode; })
      .catch(function () { B.mode = 'local'; B.reason = 'offline'; return B.mode; });
  };
  B.forceLocal = function (on) { try { on ? sessionStorage.setItem('dp:studio:forceLocal', '1') : sessionStorage.removeItem('dp:studio:forceLocal'); } catch (e) {} };

  /* ---------------- auth ---------------- */
  function redirect() { return location.href.split('#')[0]; }
  B.session = function () {
    if (B.mode !== 'supabase') return Promise.resolve(null);
    return B.client.auth.getSession().then(function (r) { var s = r.data && r.data.session; B.user = s ? s.user : null; return s; });
  };
  B.onAuth = function (fn) { if (B.client) B.client.auth.onAuthStateChange(function (ev, s) { B.user = s ? s.user : null; fn(ev, s); }); };
  B.signIn = function (email, password) { return timeout(B.client.auth.signInWithPassword({ email: email, password: password })).then(ok); };
  B.magicLink = function (email) { return timeout(B.client.auth.signInWithOtp({ email: email, options: { emailRedirectTo: redirect(), shouldCreateUser: false } })).then(ok); };
  B.signUp = function (email, password) { return timeout(B.client.auth.signUp({ email: email, password: password, options: { emailRedirectTo: redirect() } })).then(ok); };
  B.resetPassword = function (email) { return timeout(B.client.auth.resetPasswordForEmail(email, { redirectTo: redirect() })).then(ok); };
  B.updatePassword = function (pw) { return timeout(B.client.auth.updateUser({ password: pw })).then(ok); };
  B.signOut = function () { return B.client ? B.client.auth.signOut().catch(function () {}) : Promise.resolve(); };
  B.isAdmin = function () {
    if (B.mode !== 'supabase') return Promise.resolve(true);
    return timeout(B.client.rpc('is_admin')).then(ok).then(function (v) { return v === true; });
  };

  /* ---------------- content ---------------- */
  B.loadContentRows = function () {
    if (B.mode === 'local') return Promise.resolve({ draft: u.ls.get(K.draft, null), published: u.ls.get(K.published, null) });
    return timeout(B.client.from('site_content').select('id,data,updated_at')).then(ok).then(function (rows) {
      var out = { draft: null, published: null, updated: {} };
      (rows || []).forEach(function (r) { if (u.isObj(r.data) && Object.keys(r.data).length) out[r.id] = r.data; out.updated[r.id] = r.updated_at; });
      return out;
    });
  };
  B.saveDraft = function (content) {
    if (B.mode === 'local') {
      if (!u.ls.set(K.draft, content)) return Promise.reject(new Error('This browser is out of storage space.'));
      return Promise.resolve();
    }
    return timeout(B.client.from('site_content').upsert({ id: 'draft', data: content, updated_at: new Date().toISOString(), updated_by: B.user && B.user.id })).then(ok);
  };
  B.publish = function (content, note) {
    note = String(note || '').slice(0, 200);
    if (B.mode === 'local') {
      if (!u.ls.set(K.published, content) || !u.ls.set(K.draft, content)) return Promise.reject(new Error('This browser is out of storage space.'));
      var v = u.ls.get(K.versions, []);
      v.unshift({ id: Date.now(), note: note, created_at: new Date().toISOString(), data: content });
      while (v.length > 15) v.pop();
      while (v.length && !u.ls.set(K.versions, v)) v.pop();
      return Promise.resolve();
    }
    var now = new Date().toISOString(), by = B.user && B.user.id;
    return timeout(B.client.from('site_content').upsert([{ id: 'published', data: content, updated_at: now, updated_by: by }, { id: 'draft', data: content, updated_at: now, updated_by: by }])).then(ok)
      .then(function () { return timeout(B.client.from('content_versions').insert({ data: content, note: note || null, created_by: by })).then(ok); });
  };
  B.versions = function () {
    if (B.mode === 'local') return Promise.resolve(u.ls.get(K.versions, []).map(function (v) { return { id: v.id, note: v.note, created_at: v.created_at }; }));
    return timeout(B.client.from('content_versions').select('id,note,created_at').order('created_at', { ascending: false }).limit(40)).then(ok);
  };
  B.version = function (id) {
    if (B.mode === 'local') { var v = u.ls.get(K.versions, []).filter(function (x) { return String(x.id) === String(id); })[0]; return Promise.resolve(v ? v.data : null); }
    return timeout(B.client.from('content_versions').select('data').eq('id', id).maybeSingle()).then(ok).then(function (r) { return r && r.data; });
  };
  /* Patch only some keys of the stored draft (used for the media library index). */
  B.patchDraft = function (savedContent) { return B.saveDraft(savedContent); };

  /* ---------------- leads ---------------- */
  function localLeads() {
    var meta = u.ls.get(K.leadMeta, {});
    return u.ls.get(K.leadQueue, []).map(function (q) {
      var r = q.row || {}, id = 'local-' + (q.queuedAt || '') + '-' + u.slug(r.name);
      var m = meta[id] || {};
      if (m.deleted) return null;
      return Object.assign({}, r, { id: id, created_at: q.queuedAt, status: m.status || 'new', notes: m.notes || '', updated_at: m.updated_at || q.queuedAt });
    }).filter(Boolean).sort(function (a, b) { return String(b.created_at).localeCompare(String(a.created_at)); });
  }
  B.leads = function () {
    if (B.mode === 'local') return Promise.resolve(localLeads());
    return timeout(B.client.from('leads').select('*').order('created_at', { ascending: false }).limit(1000)).then(ok);
  };
  B.updateLead = function (id, patch) {
    if (B.mode === 'local') {
      var meta = u.ls.get(K.leadMeta, {}); meta[id] = Object.assign(meta[id] || {}, patch, { updated_at: new Date().toISOString() }); u.ls.set(K.leadMeta, meta);
      return Promise.resolve();
    }
    return timeout(B.client.from('leads').update(Object.assign({}, patch, { updated_at: new Date().toISOString() })).eq('id', id)).then(ok);
  };
  B.deleteLead = function (id) {
    if (B.mode === 'local') return B.updateLead(id, { deleted: true });
    return timeout(B.client.from('leads').delete().eq('id', id)).then(ok);
  };

  /* ---------------- availability (supabase mode; local mode edits content.availability) ---------------- */
  B.availability = function (from, to) {
    return timeout(B.client.from('availability').select('day,status,note').gte('day', from).lte('day', to).order('day')).then(ok);
  };
  B.setDay = function (day, status, note) {
    if (!status) return timeout(B.client.from('availability').delete().eq('day', day)).then(ok);
    return timeout(B.client.from('availability').upsert({ day: day, status: status, note: note ? String(note).slice(0, 200) : null })).then(ok);
  };

  /* ---------------- reviews ---------------- */
  B.reviews = function () {
    if (B.mode === 'local') return Promise.resolve(u.ls.get(K.reviews, []));
    return timeout(B.client.from('reviews').select('*').order('sort', { ascending: true }).order('created_at', { ascending: true })).then(ok);
  };
  B.saveReview = function (r) {
    var row = { author: String(r.author || '').slice(0, 120), event: r.event ? String(r.event).slice(0, 120) : null, body: String(r.body || '').slice(0, 3000), rating: r.rating ? Math.min(5, Math.max(1, +r.rating)) : null, published: !!r.published, sort: +r.sort || 0 };
    if (B.mode === 'local') {
      var all = u.ls.get(K.reviews, []);
      if (r.id) all = all.map(function (x) { return x.id === r.id ? Object.assign({ id: r.id, created_at: x.created_at }, row) : x; });
      else { row.id = u.uid('rev'); row.created_at = new Date().toISOString(); all.push(row); }
      u.ls.set(K.reviews, all);
      return Promise.resolve(r.id ? Object.assign({ id: r.id }, row) : row);
    }
    if (r.id) return timeout(B.client.from('reviews').update(row).eq('id', r.id).select().single()).then(ok);
    return timeout(B.client.from('reviews').insert(row).select().single()).then(ok);
  };
  B.deleteReview = function (id) {
    if (B.mode === 'local') { u.ls.set(K.reviews, u.ls.get(K.reviews, []).filter(function (x) { return x.id !== id; })); return Promise.resolve(); }
    return timeout(B.client.from('reviews').delete().eq('id', id)).then(ok);
  };

  /* ---------------- media storage ---------------- */
  B.BUCKET = 'site-media';
  B.upload = function (blob, name, type) {
    var d = new Date();
    var path = 'uploads/' + d.getFullYear() + '/' + Date.now().toString(36) + '-' + u.slug(name.replace(/\.[^.]+$/, '')) + '.' + (name.split('.').pop() || 'bin').toLowerCase();
    return timeout(B.client.storage.from(B.BUCKET).upload(path, blob, { contentType: type, cacheControl: '31536000', upsert: false }), 120000).then(ok).then(function () {
      return { path: path, url: B.client.storage.from(B.BUCKET).getPublicUrl(path).data.publicUrl };
    });
  };
  /* Listing needs a storage SELECT policy; without one this returns [] and the Studio relies on content.mediaLibrary. */
  B.listUploads = function () {
    if (B.mode !== 'supabase') return Promise.resolve([]);
    var year = new Date().getFullYear(), years = [year, year - 1];
    return Promise.all(years.map(function (y) {
      return timeout(B.client.storage.from(B.BUCKET).list('uploads/' + y, { limit: 500, sortBy: { column: 'created_at', order: 'desc' } }), 8000)
        .then(function (r) { return (r.data || []).filter(function (f) { return f.id; }).map(function (f) { var p = 'uploads/' + y + '/' + f.name; return { path: p, url: B.client.storage.from(B.BUCKET).getPublicUrl(p).data.publicUrl, name: f.name, size: f.metadata && f.metadata.size, type: f.metadata && f.metadata.mimetype, created: f.created_at }; }); })
        .catch(function () { return []; });
    })).then(function (lists) { return [].concat.apply([], lists); });
  };
  B.removeUpload = function (path) { return timeout(B.client.storage.from(B.BUCKET).remove([path])).then(ok); };
})();
