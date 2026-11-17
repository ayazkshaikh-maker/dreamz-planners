/* Dreamz Studio — media library: site manifest (assets/media/manifest.json) + owner uploads
   (Supabase Storage bucket 'site-media'; in local mode small images are kept as data URLs on this device). */
(function () {
  'use strict';
  var S = (window.Studio = window.Studio || {});
  var u = S.u, h = u.h;
  var M = (S.media = { manifest: {}, list: [] });
  var MAX = 10 * 1024 * 1024, MAX_SIDE = 2000;

  function site(p) { return !p ? '' : /^(https?:|data:|blob:)/.test(p) ? p : '../' + String(p).replace(/^\.?\//, ''); }

  M.load = function () {
    return fetch('../assets/media/manifest.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }).then(function (j) {
      M.list = [].concat(j.loops || [], j.stills || []).filter(function (m) { return m && m.id; });
      M.list.forEach(function (m) { M.manifest[m.id] = m; });
    });
  };

  M.resolve = function (ref) {
    if (!ref) return null;
    ref = String(ref);
    var m = M.manifest[ref];
    if (m) {
      var vid = /loop|video|film/.test(m.type || '') || /\.(mp4|webm)$/i.test(m.src || '');
      return { id: ref, type: vid ? 'video' : 'image', src: site(m.src), thumb: site(m.thumb || m.poster || (vid ? '' : m.src)), credit: m.credit || '', alt: m.alt || '' };
    }
    if (/^(https?:|data:|blob:)/.test(ref) || ref.indexOf('/') >= 0) {
      var v = /\.(mp4|webm|mov)(\?|$)/i.test(ref);
      return { id: ref, type: v ? 'video' : 'image', src: site(ref), thumb: v ? '' : site(ref), credit: '' };
    }
    if (/^(still|tile)-/.test(ref)) return { id: ref, type: 'image', src: '../assets/media/stills/' + ref + '.webp', thumb: '../assets/media/thumbs/' + ref + '.webp', credit: '' };
    return { id: ref, type: 'video', src: '../assets/media/loops/' + ref + '.mp4', thumb: '../assets/media/posters/' + ref + '.webp', credit: '' };
  };

  /* ---------- uploads index ---------- */
  function library() { var l = S.state.content && S.state.content.mediaLibrary; return Array.isArray(l) ? l : []; }
  function localMedia() { return u.ls.get(S.backend.keys.localMedia, []); }
  /* Persist the uploads index into the stored draft without saving the owner's other unsaved edits. */
  function saveLibrary(lib) {
    S.state.content.mediaLibrary = lib;
    var saved = JSON.parse(S.state.savedJSON || '{}');
    saved.mediaLibrary = lib;
    return S.backend.saveDraft(saved).then(function () { S.state.savedJSON = JSON.stringify(saved); S.refreshDirty(); });
  }

  M.allItems = function () {
    var items = M.list.map(function (m) {
      var r = M.resolve(m.id);
      return { ref: m.id, kind: r.type, thumb: r.thumb, src: r.src, title: m.id, credit: m.credit || '', tags: (m.tags || []).join(' '), alt: m.alt || '', source: 'site' };
    });
    var seen = {};
    var ups = library().concat(M.remoteUploads || []).filter(function (x) { if (!x || !x.url || seen[x.url]) return false; seen[x.url] = 1; return true; }).map(function (x) {
      var vid = /^video/.test(x.type || '') || /\.(mp4|webm)(\?|$)/i.test(x.url);
      return { ref: x.url, kind: vid ? 'video' : 'image', thumb: vid ? '' : x.url, src: x.url, title: x.name || x.path, credit: '', tags: 'upload', alt: '', source: 'upload', path: x.path, size: x.size, created: x.created };
    });
    var loc = localMedia().map(function (x) { return { ref: x.url, kind: 'image', thumb: x.url, src: x.url, title: x.name, credit: '', tags: 'upload local', source: 'local', id: x.id, size: x.size }; });
    return ups.concat(loc).concat(items);
  };
  M.refreshRemote = function () { return S.backend.listUploads().then(function (l) { M.remoteUploads = l; }); };

  /* ---------- prepare + upload ---------- */
  function loadImage(file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () { res({ img: img, url: url }); };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('Could not read this image.')); };
      img.src = url;
    });
  }
  function toBlob(canvas, type, q) { return new Promise(function (res) { canvas.toBlob(res, type, q); }); }
  /* Downscale images over MAX_SIDE px to WebP; large-but-small-sided images are re-encoded as WebP too. */
  M.prepare = function (file, maxSide) {
    maxSide = maxSide || MAX_SIDE;
    var type = file.type || '';
    if (/^video\/(mp4|webm)$/.test(type)) {
      if (file.size > MAX) return Promise.reject(new Error(file.name + ' is ' + (file.size / 1048576).toFixed(1) + ' MB — videos must be 10 MB or less. Trim or compress it first.'));
      return Promise.resolve({ blob: file, name: file.name, type: type });
    }
    if (!/^image\//.test(type)) return Promise.reject(new Error(file.name + ': only images and MP4/WebM videos can be uploaded.'));
    if (/svg|gif|x-icon|vnd.microsoft.icon/.test(type)) {
      if (file.size > MAX) return Promise.reject(new Error(file.name + ' is larger than 10 MB.'));
      return Promise.resolve({ blob: file, name: file.name, type: type });
    }
    return loadImage(file).then(function (r) {
      var w = r.img.naturalWidth, hh = r.img.naturalHeight, side = Math.max(w, hh);
      if (side <= maxSide && file.size <= MAX && maxSide === MAX_SIDE) { URL.revokeObjectURL(r.url); return { blob: file, name: file.name, type: type, w: w, h: hh }; }
      var k = Math.min(1, maxSide / side), cw = Math.round(w * k), ch = Math.round(hh * k);
      var c = document.createElement('canvas'); c.width = cw; c.height = ch;
      var ctx = c.getContext('2d'); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(r.img, 0, 0, cw, ch);
      URL.revokeObjectURL(r.url);
      return toBlob(c, 'image/webp', 0.86).then(function (b) {
        if (!b || b.type !== 'image/webp') return toBlob(c, 'image/jpeg', 0.86).then(function (j) { return { blob: j, name: file.name.replace(/\.[^.]+$/, '') + '.jpg', type: 'image/jpeg', w: cw, h: ch }; });
        return { blob: b, name: file.name.replace(/\.[^.]+$/, '') + '.webp', type: 'image/webp', w: cw, h: ch };
      });
    }).then(function (p) { if (p.blob.size > MAX) throw new Error(file.name + ' is still over 10 MB after resizing.'); return p; });
  };

  M.uploadFiles = function (files) {
    files = Array.prototype.slice.call(files || []);
    var added = [];
    return files.reduce(function (p, file) {
      return p.then(function () {
        if (S.backend.mode !== 'supabase') {
          if (!/^image\//.test(file.type) || /svg|gif|icon/.test(file.type)) { u.toast(file.name + ': local mode keeps photos only (JPG/PNG/WebP). Videos need the live Studio.', 'err'); return; }
          return M.prepare(file, 1600).then(function (pr) {
            return new Promise(function (res) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.readAsDataURL(pr.blob); }).then(function (dataUrl) {
              var list = localMedia(); var it = { id: u.uid('local'), name: pr.name, url: dataUrl, size: pr.blob.size };
              list.unshift(it);
              if (!u.ls.set(S.backend.keys.localMedia, list)) throw new Error('This browser is out of space for local photos.');
              added.push(dataUrl); u.toast('Saved ' + pr.name + ' on this device', 'ok');
            });
          }).catch(function (e) { u.toast(e.message, 'err'); });
        }
        u.toast('Uploading ' + file.name + '…');
        return M.prepare(file).then(function (pr) {
          return S.backend.upload(pr.blob, pr.name, pr.type).then(function (r) {
            var entry = { path: r.path, url: r.url, name: pr.name, type: pr.type, size: pr.blob.size, w: pr.w || null, h: pr.h || null, created: new Date().toISOString() };
            added.push(r.url);
            return saveLibrary([entry].concat(library())).then(function () { u.toast('Uploaded ' + pr.name, 'ok'); });
          });
        }).catch(function (e) { u.toast(e.message || 'Upload failed', 'err'); });
      });
    }, Promise.resolve()).then(function () { return added; });
  };

  M.remove = function (item) {
    var used = JSON.stringify(S.state.content).split(item.ref).length - 1 - (S.backend.mode === 'supabase' ? 1 : 0);
    return u.confirm({ title: 'Delete this upload?', body: (used > 0 ? 'It is used in ' + used + ' place(s) in your draft — those spots will show nothing. ' : '') + 'The file is removed for good and cannot be recovered.', ok: 'Delete file', danger: true }).then(function (yes) {
      if (!yes) return false;
      if (item.source === 'local') { u.ls.set(S.backend.keys.localMedia, localMedia().filter(function (x) { return x.id !== item.id; })); return true; }
      return S.backend.removeUpload(item.path).catch(function (e) { u.toast('Storage: ' + e.message, 'err'); }).then(function () {
        M.remoteUploads = (M.remoteUploads || []).filter(function (x) { return x.path !== item.path; });
        return saveLibrary(library().filter(function (x) { return x.path !== item.path; })).then(function () { u.toast('Deleted', 'ok'); return true; });
      });
    });
  };

  /* ---------- grid (shared by the panel and the picker) ---------- */
  function grid(opts) {
    var state = { filter: opts.kind === 'video' ? 'video' : opts.kind === 'image' ? 'image' : 'all', q: '', picked: [] };
    var root = h('div', { class: 'mlib' });
    var tabs = h('div', { class: 'seg', role: 'tablist' });
    [['all', 'All'], ['video', 'Video loops'], ['image', 'Photos'], ['upload', 'My uploads']].forEach(function (t) {
      tabs.appendChild(h('button', { type: 'button', role: 'tab', class: 'seg__btn', 'aria-selected': state.filter === t[0] ? 'true' : 'false', text: t[1], onclick: function (e) {
        state.filter = t[0]; u.$$('.seg__btn', tabs).forEach(function (b) { b.setAttribute('aria-selected', 'false'); }); e.currentTarget.setAttribute('aria-selected', 'true'); draw();
      } }));
    });
    var search = h('input', { class: 'input', type: 'search', placeholder: 'Search id, tag, credit…', 'aria-label': 'Search media' });
    search.addEventListener('input', u.debounce(function () { state.q = search.value.toLowerCase(); draw(); }, 150));
    var file = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp,image/svg+xml,image/gif,image/x-icon,video/mp4,video/webm', multiple: true, hidden: true });
    var upBtn = u.btn('Upload', { kind: 'gold', small: true, icon: 'upload', onclick: function () { file.click(); } });
    file.addEventListener('change', function () { doUpload(file.files); file.value = ''; });
    var bar = h('div', { class: 'mlib__bar' }, [tabs, search, upBtn, file]);
    var drop = h('div', { class: 'mlib__drop' }, [h('p', { text: S.backend.mode === 'supabase' ? 'Drop photos or MP4/WebM videos here — up to 10 MB each. Photos larger than 2000 px are resized to WebP automatically.' : 'Local mode: drop photos here (kept on this device only, resized to 1600 px). Sign in to the live Studio to upload videos.' })]);
    ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types, 'Files') >= 0) { e.preventDefault(); drop.classList.add('is-hot'); } }); });
    ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function () { drop.classList.remove('is-hot'); }); });
    drop.addEventListener('drop', function (e) { e.preventDefault(); doUpload(e.dataTransfer.files); });
    var gridEl = h('div', { class: 'mlib__grid' });
    root.appendChild(bar); root.appendChild(drop); root.appendChild(gridEl);

    function doUpload(files) {
      upBtn.disabled = true;
      M.uploadFiles(files).then(function (added) {
        upBtn.disabled = false; state.filter = 'upload';
        u.$$('.seg__btn', tabs).forEach(function (b, i) { b.setAttribute('aria-selected', i === 3 ? 'true' : 'false'); });
        if (opts.pick && added.length) { state.picked = state.picked.concat(added); if (!opts.multi) return opts.pick([added[0]]); }
        draw();
      });
    }
    function draw() {
      u.clear(gridEl);
      var items = M.allItems().filter(function (it) {
        if (opts.kind && it.kind !== opts.kind && opts.kind !== 'any') return false;
        if (state.filter === 'upload' && it.source === 'site') return false;
        if ((state.filter === 'video' || state.filter === 'image') && it.kind !== state.filter) return false;
        if (state.q && (it.title + ' ' + it.tags + ' ' + it.credit + ' ' + it.alt).toLowerCase().indexOf(state.q) < 0) return false;
        return true;
      });
      if (!items.length) gridEl.appendChild(h('p', { class: 'empty', text: state.filter === 'upload' ? 'No uploads yet. Use Upload or drop files above.' : 'Nothing matches.' }));
      items.forEach(function (it) {
        var picked = state.picked.indexOf(it.ref) >= 0;
        var th = h('div', { class: 'thumb' });
        if (it.thumb) {
          var img = h('img', { src: it.thumb, alt: it.alt || '', loading: 'lazy' });
          img.addEventListener('error', function () { img.remove(); if (it.kind === 'video') th.appendChild(h('video', { src: it.src, muted: true, preload: 'metadata' })); });
          th.appendChild(img);
        } else if (it.kind === 'video') th.appendChild(h('video', { src: it.src, muted: true, preload: 'metadata' }));
        if (it.kind === 'video') th.appendChild(h('span', { class: 'thumb__badge', text: 'video' }));
        if (it.source !== 'site') th.appendChild(h('span', { class: 'thumb__badge thumb__badge--l', text: it.source === 'local' ? 'this device' : 'upload' }));
        var tile = h('div', { class: 'mtile' + (picked ? ' is-picked' : ''), tabindex: opts.pick ? '0' : null, role: opts.pick ? 'button' : null, 'aria-pressed': opts.pick ? String(picked) : null }, [
          th,
          h('div', { class: 'mtile__meta' }, [h('strong', { text: it.source === 'site' ? it.title : (it.title || '').split('/').pop() }), it.credit ? h('small', { text: it.credit }) : it.size ? h('small', { text: (it.size / 1024 / 1024).toFixed(2) + ' MB' }) : null])
        ]);
        if (opts.pick) {
          var choose = function () {
            if (!opts.multi) return opts.pick([it.ref]);
            var i = state.picked.indexOf(it.ref);
            if (i >= 0) state.picked.splice(i, 1); else state.picked.push(it.ref);
            tile.classList.toggle('is-picked'); tile.setAttribute('aria-pressed', String(state.picked.indexOf(it.ref) >= 0));
            if (opts.onPickChange) opts.onPickChange(state.picked);
          };
          tile.addEventListener('click', choose);
          tile.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(); } });
        } else {
          var tools = h('div', { class: 'mtile__tools' }, [
            u.btn('', { small: true, kind: 'ghost', icon: 'copy', title: 'Copy id / URL', onclick: function () {
              (navigator.clipboard ? navigator.clipboard.writeText(it.ref) : Promise.reject()).then(function () { u.toast('Copied — paste it into any media field', 'ok'); }, function () { u.toast(it.ref.slice(0, 120)); });
            } }),
            u.btn('', { small: true, kind: 'ghost', icon: 'external', title: 'Open file', onclick: function () { window.open(it.src, '_blank', 'noopener'); } }),
            it.source !== 'site' ? u.btn('', { small: true, kind: 'ghost', icon: 'trash', title: 'Delete upload', cls: 'is-danger', onclick: function () { M.remove(it).then(function (d) { if (d) draw(); }); } }) : null
          ]);
          tile.appendChild(tools);
        }
        gridEl.appendChild(tile);
      });
    }
    draw();
    M.refreshRemote().then(draw);
    return { el: root, picked: function () { return state.picked; } };
  }

  /* Picker modal → Promise<ref | ref[] | null> */
  M.pick = function (o) {
    o = o || {};
    var m = u.modal({ title: o.multi ? 'Choose media' : 'Choose ' + (o.kind === 'video' ? 'a video loop' : o.kind === 'image' ? 'a photo' : 'media'), wide: true });
    var addBtn = u.btn('Add selected', { kind: 'gold', disabled: true, onclick: function () { m.close(g.picked().slice()); } });
    var g = grid({ kind: o.kind, multi: o.multi, pick: function (refs) { m.close(o.multi ? refs : refs[0]); }, onPickChange: function (p) { addBtn.disabled = !p.length; addBtn.lastChild.textContent = p.length ? 'Add ' + p.length : 'Add selected'; } });
    m.body.appendChild(g.el);
    var url = h('input', { class: 'input', placeholder: 'Or paste an image/video URL (https://…)', 'aria-label': 'Media URL' });
    m.foot.appendChild(url);
    m.foot.appendChild(u.btn('Use URL', { kind: 'outline', onclick: function () { var v = url.value.trim(); if (/^https:\/\//.test(v)) m.close(o.multi ? [v] : v); else u.toast('Paste a full https:// address', 'err'); } }));
    if (o.multi) m.foot.appendChild(addBtn);
    return m.result;
  };

  /* Panel */
  M.panel = function (root) {
    root.appendChild(h('div', { class: 'panel-head' }, [h('div', {}, [h('h2', { class: 'panel-title', text: 'Media library' }), h('p', { class: 'muted', text: 'Video loops and photos from the site, plus your own uploads. Use "Choose…" in any image or video field to place them.' })])]));
    root.appendChild(grid({}).el);
  };
})();
