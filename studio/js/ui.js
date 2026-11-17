/* Dreamz Studio — small UI helpers: DOM builder, escaping, toasts, modal dialogs, object paths.
   Everything user-entered is rendered with textContent (never innerHTML) unless passed through esc(). */
(function () {
  'use strict';
  var S = (window.Studio = window.Studio || {});
  var u = (S.u = {});

  u.$ = function (s, r) { return (r || document).querySelector(s); };
  u.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  u.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  /* h('div', {class:'x', onclick: fn, text:'hi'}, [children]) — strings become text nodes. */
  u.h = function (tag, attrs, children) {
    var el = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === undefined || v === null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'dataset') Object.keys(v).forEach(function (d) { el.dataset[d] = v[d]; });
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else if (k === 'checked') el.checked = !!v;
      else el.setAttribute(k, v === true ? '' : v);
    });
    u.append(el, children);
    return el;
  };
  u.append = function (el, children) {
    if (children === undefined || children === null || children === false) return el;
    (Array.isArray(children) ? children : [children]).forEach(function (c) {
      if (c === undefined || c === null || c === false) return;
      if (Array.isArray(c)) return u.append(el, c);
      el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
    return el;
  };
  u.clear = function (el) { while (el.firstChild) el.removeChild(el.firstChild); return el; };

  /* Inline SVG icons (static markup, no user data). */
  var ICONS = {
    plus: 'M12 5v14M5 12h14', trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13', copy: 'M8 8h12v12H8zM4 16V4h12',
    up: 'M12 19V5M5 12l7-7 7 7', down: 'M12 5v14M5 12l7 7 7-7', grip: 'M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01',
    chev: 'M9 6l6 6-6 6', x: 'M6 6l12 12M18 6L6 18', image: 'M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4', reload: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
    desktop: 'M3 4h18v12H3zM8 20h8M12 16v4', tablet: 'M6 3h12v18H6zM11 18h2', phone: 'M8 3h8v18H8zM11 18h2',
    eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z', eyeoff: 'M3 3l18 18M10.6 6.1A10 10 0 0 1 12 6c6 0 10 6 10 6a17 17 0 0 1-3.2 3.8M6.6 7.6C3.8 9.4 2 12 2 12s4 6 10 6c1.4 0 2.7-.3 3.9-.8',
    upload: 'M12 16V4M6 10l6-6 6 6M4 20h16', download: 'M12 4v12M6 10l6 6 6-6M4 20h16', menu: 'M4 7h16M4 12h16M4 17h16',
    wa: 'M4 20l1.5-4A8 8 0 1 1 8 18.5zM9 9c0 3 3 6 6 6l1-1.5-2-1-1 1c-1-.5-2-1.5-2.5-2.5l1-1-1-2z', call: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z',
    star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z', back: 'M15 6l-6 6 6 6', check: 'M5 12l5 5 9-10',
    mail: 'M3 6h18v12H3zM3 6l9 7 9-7', external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
    bell: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0'
  };
  u.icon = function (name, size) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('width', size || 16); svg.setAttribute('height', size || 16);
    svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '1.8');
    svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round'); svg.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS(ns, 'path'); p.setAttribute('d', ICONS[name] || ''); svg.appendChild(p);
    return svg;
  };
  u.btn = function (label, opts) {
    opts = opts || {};
    var b = u.h('button', { type: 'button', class: 'btn ' + (opts.kind ? 'btn--' + opts.kind : '') + (opts.small ? ' btn--sm' : '') + (opts.cls ? ' ' + opts.cls : ''), title: opts.title, 'aria-label': opts.aria || (label ? null : opts.title), onclick: opts.onclick, disabled: opts.disabled });
    if (opts.icon) b.appendChild(u.icon(opts.icon, opts.iconSize));
    if (label) b.appendChild(u.h('span', { text: label }));
    return b;
  };

  /* ---------- object paths ---------- */
  u.split = function (path) { return Array.isArray(path) ? path : String(path).split('.').filter(Boolean); };
  u.get = function (obj, path) {
    var parts = u.split(path), cur = obj;
    for (var i = 0; i < parts.length; i++) { if (cur == null) return undefined; cur = cur[parts[i]]; }
    return cur;
  };
  u.set = function (obj, path, val) {
    var parts = u.split(path), cur = obj;
    for (var i = 0; i < parts.length - 1; i++) {
      var k = parts[i];
      if (cur[k] == null || typeof cur[k] !== 'object') cur[k] = /^\d+$/.test(parts[i + 1]) ? [] : {};
      cur = cur[k];
    }
    cur[parts[parts.length - 1]] = val;
  };
  u.isObj = function (v) { return v && typeof v === 'object' && !Array.isArray(v); };
  u.clone = function (v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); };
  /* Same merge rules as the site (js/data.js): objects merge, arrays + scalars replace, null keeps default. */
  u.merge = function merge(base, over) {
    if (!u.isObj(base)) return over === undefined || over === null ? base : over;
    if (!u.isObj(over)) return base;
    var out = {};
    Object.keys(base).forEach(function (k) { out[k] = base[k]; });
    Object.keys(over).forEach(function (k) {
      var b = base[k], o = over[k];
      if (o === undefined || o === null) return;
      out[k] = u.isObj(b) && u.isObj(o) ? merge(b, o) : o;
    });
    return out;
  };
  u.debounce = function (fn, ms) {
    var t; return function () { var a = arguments, self = this; clearTimeout(t); t = setTimeout(function () { fn.apply(self, a); }, ms); };
  };
  u.uid = function (prefix) { return (prefix || 'id') + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); };
  u.slug = function (s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'item'; };
  u.human = function (key) { return String(key).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ').replace(/^./, function (c) { return c.toUpperCase(); }); };
  u.fmtDate = function (iso, withTime) {
    if (!iso) return '';
    var d = new Date(iso); if (isNaN(d)) return String(iso);
    var o = { year: 'numeric', month: 'short', day: 'numeric' };
    if (withTime) { o.hour = 'numeric'; o.minute = '2-digit'; }
    return d.toLocaleString(undefined, o);
  };
  u.ymd = function (d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  u.ls = {
    get: function (k, fb) { try { var v = localStorage.getItem(k); return v == null ? fb : JSON.parse(v); } catch (e) { return fb; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };

  /* ---------- colour contrast (WCAG) ---------- */
  function lum(hex) {
    var m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(String(hex || '').trim()); if (!m) return null;
    var h = m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1];
    var rgb = [0, 2, 4].map(function (i) { var c = parseInt(h.substr(i, 2), 16) / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  }
  u.contrast = function (a, b) {
    var la = lum(a), lb = lum(b); if (la == null || lb == null) return null;
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };

  /* ---------- toasts ---------- */
  u.toast = function (msg, kind, ms) {
    var box = u.$('#toasts');
    if (!box) { box = u.h('div', { id: 'toasts', class: 'toasts', role: 'status', 'aria-live': 'polite' }); document.body.appendChild(box); }
    var t = u.h('div', { class: 'toast toast--' + (kind || 'info') }, [u.h('span', { text: msg })]);
    var close = u.h('button', { type: 'button', class: 'toast__x', 'aria-label': 'Dismiss', onclick: function () { t.remove(); } }, [u.icon('x', 14)]);
    t.appendChild(close);
    box.appendChild(t);
    setTimeout(function () { t.classList.add('is-out'); setTimeout(function () { t.remove(); }, 300); }, ms || (kind === 'err' ? 7000 : 3200));
  };

  /* ---------- modal dialogs (no window.alert/confirm) ---------- */
  var openModals = [];
  u.modal = function (opts) {
    var prevFocus = document.activeElement;
    var back = u.h('div', { class: 'modal-back' });
    var box = u.h('div', { class: 'modal' + (opts.wide ? ' modal--wide' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.title || 'Dialog' });
    var head = u.h('div', { class: 'modal__head' }, [u.h('h2', { class: 'modal__title', text: opts.title || '' })]);
    var api = { el: box, body: u.h('div', { class: 'modal__body' }), foot: u.h('div', { class: 'modal__foot' }), close: close };
    head.appendChild(u.h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Close', onclick: function () { close(null); } }, [u.icon('x')]));
    box.appendChild(head); box.appendChild(api.body); box.appendChild(api.foot);
    back.appendChild(box);
    document.body.appendChild(back);
    var resolver; api.result = new Promise(function (r) { resolver = r; });
    back.addEventListener('mousedown', function (e) { if (e.target === back) close(null); });
    function close(v) {
      if (!back.parentNode) return;
      back.remove(); openModals.splice(openModals.indexOf(api), 1);
      if (opts.onclose) opts.onclose(v);
      resolver(v);
      if (prevFocus && prevFocus.focus) try { prevFocus.focus(); } catch (e) {}
    }
    openModals.push(api);
    setTimeout(function () {
      var order = ['[autofocus]', '.modal__body input:not([type=hidden]):not([type=checkbox])', '.modal__body textarea', '.modal__foot .btn--gold', '.modal__foot .btn', 'button'];
      for (var i = 0; i < order.length; i++) { var f = box.querySelector(order[i]); if (f) { f.focus(); return; } }
    }, 30);
    return api;
  };
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openModals.length) { e.preventDefault(); openModals[openModals.length - 1].close(null); return; }
    // keep Tab inside the top dialog (aria-modal promises that)
    if (e.key === 'Tab' && openModals.length) {
      var box = openModals[openModals.length - 1].el;
      var f = [].filter.call(box.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'), function (x) { return x.offsetParent !== null; });
      if (!f.length) { e.preventDefault(); return; }
      var first = f[0], last = f[f.length - 1], a = document.activeElement;
      if (!box.contains(a)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* confirm({title, body, ok, danger, input:{label, value, maxlength}}) -> Promise<false | true | string> */
  u.confirm = function (o) {
    var m = u.modal({ title: o.title || 'Are you sure?' });
    if (o.body) u.append(m.body, typeof o.body === 'string' ? u.h('p', { class: 'muted', text: o.body }) : o.body);
    var inp = null;
    if (o.input) {
      inp = u.h(o.input.multiline ? 'textarea' : 'input', { class: 'input', value: o.input.value || '', maxlength: o.input.maxlength || 200, placeholder: o.input.placeholder || '', autofocus: true });
      m.body.appendChild(u.h('label', { class: 'field' }, [u.h('span', { class: 'field__label', text: o.input.label || '' }), inp]));
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !o.input.multiline) { e.preventDefault(); m.close(inp.value); } });
    }
    m.foot.appendChild(u.btn(o.cancel || 'Cancel', { kind: 'ghost', onclick: function () { m.close(false); } }));
    m.foot.appendChild(u.btn(o.ok || 'OK', { kind: o.danger ? 'danger' : 'gold', onclick: function () { m.close(inp ? inp.value : true); } }));
    return m.result.then(function (v) { return v === null ? false : v; });
  };

  u.download = function (name, text, type) {
    var blob = new Blob([text], { type: type || 'application/json' });
    var a = u.h('a', { href: URL.createObjectURL(blob), download: name });
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
})();
