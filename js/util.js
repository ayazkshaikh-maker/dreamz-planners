/* Dreamz Planners — small shared helpers (DP.u). */
(function () {
  'use strict';
  var DP = (window.DP = window.DP || {});

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  /* Content mini-markup: *word* -> <em>word</em> (gold italic accent). */
  function rich(s) { return esc(s).replace(/\*([^*]+)\*/g, '<em>$1</em>'); }
  function plain(s) { return String(s == null ? '' : s).replace(/\*/g, ''); }

  function h(tag, attrs, html) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === false || v == null) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else el.setAttribute(k, v === true ? '' : v);
    });
    if (html != null) el.innerHTML = html;
    return el;
  }

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return [].slice.call((root || document).querySelectorAll(sel)); }

  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  // ?motion=reduce forces the calm static layout (handy for testing and for the Studio preview).
  try { if (/[?&]motion=reduce/.test(location.search)) document.documentElement.classList.add('force-reduce'); } catch (e) {}
  function reduced() { return mqReduce.matches || document.documentElement.classList.contains('force-reduce'); }
  function isMobile() { return window.matchMedia('(max-width: 767px)').matches; }
  function finePointer() { return window.matchMedia('(hover: hover) and (pointer: fine)').matches; }

  function igUrl(handle) { return 'https://www.instagram.com/' + String(handle || '').replace(/^@/, '') + '/'; }
  function telHref(p) { var d = String(p.tel || p.number || p).replace(/[^\d+]/g, ''); if (d.charAt(0) !== '+') d = '+1' + d.replace(/^1(?=\d{10}$)/, ''); return 'tel:' + d; }
  function waHref(number, text) { return 'https://wa.me/' + String(number || '').replace(/\D/g, '') + (text ? '?text=' + encodeURIComponent(text) : ''); }

  /* Split text into word > char spans, keeping *accent* words as <em>. */
  function splitChars(el, text) {
    el.setAttribute('aria-label', plain(text));
    var parts = String(text).split(/(\*[^*]+\*)/g).filter(Boolean);
    var html = '';
    parts.forEach(function (part) {
      var accent = /^\*.*\*$/.test(part);
      var t = accent ? part.slice(1, -1) : part;
      t.split(/(\s+)/).forEach(function (w) {
        if (!w) return;
        if (/^\s+$/.test(w)) { html += ' '; return; }
        if (/^[,.;:!?)]/.test(w)) html = html.replace(/ $/, '');
        var chars = Array.from(w).map(function (c) { return '<span class="char">' + esc(c) + '</span>'; }).join('');
        html += '<span class="word' + (accent ? ' word--accent' : '') + '" aria-hidden="true">' + (accent ? '<em>' + chars + '</em>' : chars) + '</span>';
      });
    });
    el.innerHTML = html;
    return el;
  }
  function splitWords(el, text) {
    el.setAttribute('aria-label', plain(text));
    var parts = String(text).split(/(\*[^*]+\*)/g).filter(Boolean);
    var html = '';
    parts.forEach(function (part) {
      var accent = /^\*.*\*$/.test(part);
      var t = accent ? part.slice(1, -1) : part;
      t.split(/\s+/).forEach(function (w) {
        if (!w) return;
        if (/^[,.;:!?)]/.test(w)) html = html.replace(/ $/, '');
        html += '<span class="w' + (accent ? ' w--accent' : '') + '" aria-hidden="true">' + esc(w) + '</span> ';
      });
    });
    el.innerHTML = html;
    return el;
  }

  /* ---------- lazy video ---------- */
  var vio = null;
  function videoObserver() {
    if (vio || !('IntersectionObserver' in window)) return vio;
    vio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) {
          if (!v.dataset.loaded) loadVideo(v);
          if (!reduced() && !v.dataset.failed) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
        } else if (!v.paused) v.pause();
      });
    }, { rootMargin: '200px 0px', threshold: 0.01 });
    return vio;
  }
  function loadVideo(v) {
    v.dataset.loaded = '1';
    var webm = v.dataset.webm, src = v.dataset.src;
    if (webm) v.appendChild(h('source', { src: webm, type: 'video/webm' }));
    if (src) v.appendChild(h('source', { src: src, type: 'video/mp4' }));
    v.load();
  }
  /* Build a <figure>-less media element for a media id. Videos: poster first, src on view. */
  function media(ref, opts) {
    opts = opts || {};
    var m = DP.media.resolve(ref);
    if (!m) return h('div', { class: 'media media--empty ' + (opts.class || '') });
    if (m.type === 'video' && !opts.still) {
      var v = h('video', {
        class: 'media ' + (opts.class || ''), muted: true, playsinline: true, loop: true, preload: 'none',
        poster: m.poster || '', 'aria-hidden': opts.label ? null : 'true', 'aria-label': opts.label || null,
        'data-src': m.src, 'data-webm': m.webm || null, disablepictureinpicture: true
      });
      v.muted = true;
      v.addEventListener('error', function () { v.dataset.failed = '1'; }, true);
      var obs = videoObserver();
      if (obs) obs.observe(v); else loadVideo(v);
      return v;
    }
    var src = m.type === 'video' ? m.poster : (opts.thumb ? m.thumb : m.src);
    var img = h('img', { class: 'media ' + (opts.class || ''), src: src, alt: opts.alt || m.alt || '', loading: opts.eager ? 'eager' : 'lazy', decoding: 'async' });
    img.addEventListener('error', function () {
      if (img.dataset.fb) { img.classList.add('media--empty'); img.removeAttribute('src'); return; }
      img.dataset.fb = '1';
      if (m.thumb && img.src.indexOf(m.thumb) < 0) img.src = m.thumb; else { img.classList.add('media--empty'); img.removeAttribute('src'); }
    });
    return img;
  }
  function credit(ref, override) {
    var m = DP.media.resolve(ref);
    var c = override || (m && m.credit) || '';
    return c ? '<span class="credit">' + esc(c) + '</span>' : '';
  }

  function trapFocus(container, e) {
    var f = $$('a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select,textarea,[tabindex]:not([tabindex="-1"])', container)
      .filter(function (x) { return x.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function ymd(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function store(key, val) { try { if (val === undefined) return localStorage.getItem(key); localStorage.setItem(key, val); } catch (e) { return null; } }

  DP.u = {
    esc: esc, rich: rich, plain: plain, h: h, $: $, $$: $$, reduced: reduced, isMobile: isMobile, finePointer: finePointer,
    igUrl: igUrl, telHref: telHref, waHref: waHref, splitChars: splitChars, splitWords: splitWords,
    media: media, credit: credit, trapFocus: trapFocus, ymd: ymd, store: store, loadVideo: loadVideo
  };
})();
