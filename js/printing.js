/* Dreamz Planners — Printing & Stationery chapter.
   The "stationery wall": printed pieces hang from gold threads on three rails at different depths. They sway with
   scroll velocity, the rails drift in parallax, hovering lifts a card forward with a foil sheen and a spec tag, and a
   click opens a detail view (the card turns over to its specs, gallery, price / packages, "Add to quote").
   Phones get a swipeable fanned deck; reduced motion gets a tidy grid. Everything comes from content.printing
   (see content/SCHEMA.md). Prices are never invented: an empty price shows copy.priceOnRequest. */
(function () {
  'use strict';
  var DP = (window.DP = window.DP || {});
  var u = DP.u;
  var P = (DP.printing = {});
  var QKEY = 'dp:print-quote';

  function C() { return (DP.content && DP.content.printing) || {}; }
  function copy() { return C().copy || {}; }
  function items() { return (C().items || []).filter(function (it) { return it && it.id; }); }
  function byId(id) { return items().filter(function (it) { return it.id === id; })[0]; }
  function slug(s) { return String(s || 'other').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'other'; }
  /* images[] entries may be a media id / URL string or { src, focus, alt } */
  function imgs(it) {
    return (it.images || []).map(function (im) { return typeof im === 'string' ? { src: im } : (im || {}); }).filter(function (im) { return im.src; });
  }
  function priceText(it) {
    var p = String(it.price || '').trim();
    if (!p) return copy().priceOnRequest || 'Price on request';
    return it.unit ? p + ' / ' + it.unit : p;
  }
  function pictureEl(im, opts) {
    opts = opts || {};
    var m = DP.media.resolve(im.src) || {};
    var el = u.media(im.src, { still: true, thumb: !!opts.thumb, alt: opts.alt != null ? opts.alt : (im.alt || m.alt || ''), focus: im.focus || '' });
    if (im.focus && el.style) el.style.objectPosition = im.focus;
    // optional zoom: crop into a detail of the photo (e.g. the wax seal), centred on the focal point
    var z = parseFloat(im.zoom);
    if (z > 1 && el.style) { el.style.transform = 'scale(' + Math.min(z, 4) + ')'; el.style.transformOrigin = im.focus || (m.focus || '50% 50%'); }
    return el;
  }

  /* ---------------- quote list (this device only) ---------------- */
  function quote() { try { var q = JSON.parse(u.store(QKEY) || '[]'); return Array.isArray(q) ? q : []; } catch (e) { return []; } }
  function saveQuote(q) { u.store(QKEY, JSON.stringify(q)); renderQuote(); syncDetailQuote(); }
  function inQuote(id) { return quote().some(function (q) { return q.id === id; }); }
  function toggleQuote(id, finishes) {
    var q = quote(), i = -1;
    q.forEach(function (x, k) { if (x.id === id) i = k; });
    if (i >= 0) q.splice(i, 1); else q.push({ id: id, finishes: finishes || [] });
    saveQuote(q);
  }
  function quoteSummary(q) {
    return q.map(function (x) {
      var it = byId(x.id); if (!it) return null;
      return u.plain(it.name) + (x.finishes && x.finishes.length ? ' (' + x.finishes.join(', ') + ')' : '');
    }).filter(Boolean);
  }
  function requestQuote(extra) {
    var c = copy(), q = quote();
    var lines = quoteSummary(q);
    if (extra) lines.push(extra);
    var svc = c.wizardService || 'Printing & stationery';
    var wiz = (DP.content.wizard && DP.content.wizard.services) || [];
    if (wiz.indexOf(svc) < 0) svc = wiz.filter(function (s) { return /print|station/i.test(s); })[0] || svc;
    var had = (DP.tools && DP.tools.modalWizard && !DP.tools.modalWizard.done && DP.tools.modalWizard.state.services) || [];
    var pre = { services: had.indexOf(svc) >= 0 ? had.slice() : had.concat([svc]), printing: q.length || extra ? { items: q, package: extra || null } : null };
    if (lines.length) pre.message = (c.wizardNote || 'Printing quote') + ': ' + lines.join('; ');
    if (DP.tools && DP.tools.openWizard) DP.tools.openWizard(pre);
  }
  P.requestQuote = requestQuote;

  /* ---------------- section markup ---------------- */
  P.section = function (c) {
    var s = u.h('section', { id: 'printing', class: 'section printing', 'aria-label': c.eyebrow || 'Printing', 'data-chapter': 'printing' });
    s.innerHTML = '<div class="section__head">' + (c.eyebrow ? '<p class="eyebrow">' + u.esc(c.eyebrow) + '</p>' : '') +
      (c.title ? '<h2 class="display reveal-split">' + u.rich(c.title) + '</h2>' : '') +
      (c.intro ? '<p class="lede reveal-blur">' + u.rich(c.intro) + '</p>' : '') + '</div>';
    var list = items();
    var cats = [];
    list.forEach(function (it) { var k = it.category || 'Other'; if (cats.indexOf(k) < 0) cats.push(k); });
    var cc = c.copy || {};
    var bar = '<div class="pfilters" role="group" aria-label="' + u.esc((c.eyebrow || 'Printing') + ' — filter') + '">' +
      '<button type="button" class="chip pchip" data-pfilter="*" aria-pressed="true">' + u.esc(c.filterAll || 'All') + ' <span class="pchip__n">' + list.length + '</span></button>' +
      cats.map(function (k) {
        var n = list.filter(function (it) { return (it.category || 'Other') === k; }).length;
        return '<button type="button" class="chip pchip" data-pfilter="' + u.esc(slug(k)) + '" aria-pressed="false">' + u.esc(k) + ' <span class="pchip__n">' + n + '</span></button>';
      }).join('') + '</div>';
    s.insertAdjacentHTML('beforeend', bar);

    var wall = u.h('div', { class: 'pwall', 'data-pwall': '' });
    wall.innerHTML = '<div class="pwall__glow" aria-hidden="true"></div>' +
      [0, 1, 2].map(function (r) { return '<div class="pwall__rail" data-rail="' + r + '"><svg class="pwall__thread" aria-hidden="true" preserveAspectRatio="none"><path vector-effect="non-scaling-stroke"/><path class="pwall__thread-shine" vector-effect="non-scaling-stroke"/></svg></div>'; }).join('') +
      '<ul class="pwall__list" role="list"></ul>' +
      '<div class="pwall__nav" hidden><button type="button" class="pwall__btn" data-pdeck="-1" aria-label="' + u.esc(cc.prev || 'Previous piece') + '">' + DP.icons.left + '</button><span class="pwall__count" aria-live="polite"></span><button type="button" class="pwall__btn" data-pdeck="1" aria-label="' + u.esc(cc.next || 'Next piece') + '">' + DP.icons.right + '</button></div>';
    var ul = wall.querySelector('.pwall__list');
    list.forEach(function (it, i) {
      var im = imgs(it)[0];
      var finishes = (it.finishes || []).slice(0, 2).join(' · ');
      var li = u.h('li', { class: 'pwall__item', 'data-pitem': it.id, 'data-cat': slug(it.category || 'Other'), style: '--i:' + i });
      var btn = u.h('button', { type: 'button', class: 'pcard' + (it.featured ? ' is-featured' : ''), 'data-popen': it.id, 'data-cursor': 'View',
        'aria-label': u.plain(it.name) + (it.category ? ' — ' + it.category : '') + '. ' + (cc.flipBack || 'See the details') });
      btn.innerHTML = '<span class="pcard__clip" aria-hidden="true"></span><span class="pcard__paper"></span>' +
        '<span class="pcard__tag" aria-hidden="true"><b>' + u.esc(u.plain(it.name)) + '</b>' +
        (finishes || it.paper ? '<small>' + u.esc([finishes, it.paper].filter(Boolean).join(' · ')) + '</small>' : '') + '</span>' +
        (it.featured ? '<span class="pcard__ribbon" aria-hidden="true">' + u.esc(cc.featured || 'Featured') + '</span>' : '');
      var paper = btn.querySelector('.pcard__paper');
      if (im) paper.appendChild(pictureEl(im, { thumb: true, alt: '' }));
      paper.insertAdjacentHTML('beforeend', '<span class="pcard__sheen" aria-hidden="true"></span>');
      li.appendChild(btn);
      ul.appendChild(li);
    });
    s.appendChild(wall);
    var hasSample = list.some(function (it) { return it.sample; });
    s.insertAdjacentHTML('beforeend', '<p class="pwall__hint"><span class="pwall__hint-desk">' + u.esc(c.wallHint || '') + '</span><span class="pwall__hint-mob">' + u.esc(c.mobileHint || '') + '</span>' +
      (hasSample && c.sampleNote ? '<span class="pwall__sample">' + u.esc(c.sampleNote) + '</span>' : '') + '</p>');

    // quote tray
    s.insertAdjacentHTML('beforeend', '<div class="pquote panel" data-pquote aria-live="polite"></div>');

    // options
    var op = c.options || {};
    var groups = ['papers', 'finishes', 'methods', 'addons'].map(function (k) { return op[k]; }).filter(function (g) { return g && (g.items || []).length; });
    Object.keys(op).forEach(function (k) { if (['papers', 'finishes', 'methods', 'addons'].indexOf(k) < 0 && op[k] && (op[k].items || []).length) groups.push(op[k]); });
    if (groups.length) {
      s.insertAdjacentHTML('beforeend', '<div class="popts"><div class="popts__head">' + (c.optionsTitle ? '<h3 class="display popts__title">' + u.rich(c.optionsTitle) + '</h3>' : '') +
        (c.optionsIntro ? '<p class="lede">' + u.rich(c.optionsIntro) + '</p>' : '') + '</div><div class="popts__grid">' +
        groups.map(function (g) {
          return '<div class="popt"><h4 class="field-label">' + u.esc(g.label || '') + '</h4><ul>' + (g.items || []).filter(Boolean).map(function (x) { return '<li>' + u.esc(x) + '</li>'; }).join('') + '</ul></div>';
        }).join('') + '</div></div>');
    }
    // packages
    var pk = (c.packages || []).filter(function (p) { return p && p.name; });
    if (pk.length) {
      s.insertAdjacentHTML('beforeend', '<div class="ppk"><div class="popts__head">' + (c.packagesTitle ? '<h3 class="display popts__title">' + u.rich(c.packagesTitle) + '</h3>' : '') +
        (c.packagesIntro ? '<p class="lede">' + u.rich(c.packagesIntro) + '</p>' : '') + '</div><div class="ppk__grid">' +
        pk.map(function (p, i) {
          return '<article class="ppk__card' + (p.highlight ? ' is-highlight' : '') + '">' + (p.highlight ? '<span class="ppk__flag">' + u.esc(cc.highlight || 'Popular') + '</span>' : '') +
            '<h4 class="ppk__name">' + u.rich(p.name) + '</h4><p class="ppk__price">' + u.esc(String(p.price || '').trim() || cc.priceOnRequest || 'Price on request') + '</p>' +
            '<ul>' + (p.includes || []).filter(Boolean).map(function (x) { return '<li>' + u.esc(x) + '</li>'; }).join('') + '</ul>' +
            (p.note ? '<p class="ppk__note">' + u.esc(p.note) + '</p>' : '') +
            '<button type="button" class="btn ' + (p.highlight ? 'btn--gold' : 'btn--ghost') + ' btn--sm" data-ppackage="' + i + '">' + u.esc(cc.choosePackage || 'Ask about this package') + '</button></article>';
        }).join('') + '</div></div>');
    }
    return s;
  };

  /* ---------------- quote tray ---------------- */
  function renderQuote() {
    var box = u.$('[data-pquote]'); if (!box) return;
    var c = copy(), q = quote().filter(function (x) { return byId(x.id); });
    box.classList.toggle('is-empty', !q.length);
    box.innerHTML = '<div class="pquote__text"><span class="field-label">' + u.esc(c.quoteTitle || 'Your printing quote') + (q.length ? ' · ' + q.length : '') + '</span>' +
      (q.length ? '<ul class="pquote__list">' + q.map(function (x) {
        var it = byId(x.id);
        return '<li><span>' + u.esc(u.plain(it.name)) + (x.finishes && x.finishes.length ? ' <small>' + u.esc(x.finishes.join(', ')) + '</small>' : '') + '</span>' +
          '<button type="button" class="pquote__x" data-pq-remove="' + u.esc(x.id) + '" aria-label="' + u.esc((c.removeFromQuote || 'Remove') + ' ' + u.plain(it.name)) + '">' + DP.icons.close + '</button></li>';
      }).join('') + '</ul>' : '<p class="hint" style="margin:0">' + u.esc(c.quoteEmpty || '') + '</p>') + '</div>' +
      '<button type="button" class="btn btn--gold" data-pq-request>' + u.esc(c.requestQuote || 'Request a printing quote') + ' ' + DP.icons.arrow + '</button>';
  }

  /* ---------------- detail dialog ---------------- */
  var cur = { id: null, img: 0, finishes: [], order: [] };
  function syncDetailQuote() {
    var d = u.$('#pdetail'); if (!d || !cur.id) return;
    var b = d.querySelector('[data-pd-quote]'); if (!b) return;
    var on = inQuote(cur.id), c = copy();
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.innerHTML = (on ? DP.icons.seal.replace('<svg', '<svg class="pd__tick"') + u.esc(c.inQuote || 'In your quote') : DP.icons.plus + u.esc(c.addToQuote || 'Add to quote'));
  }
  P.open = function (id) {
    var it = byId(id), d = u.$('#pdetail'); if (!it || !d) return;
    var c = copy();
    cur.id = id; cur.img = 0;
    var saved = quote().filter(function (x) { return x.id === id; })[0];
    cur.finishes = saved ? (saved.finishes || []).slice() : [];
    cur.order = visibleIds();
    var pics = imgs(it);
    var specs = [
      it.paper ? [c.paperLabel || 'Paper', it.paper] : null,
      it.unit ? [c.unitLabel || 'Per', it.unit] : null,
      it.minQty ? [c.minQtyLabel || 'Minimum', it.minQty] : null,
      it.leadTime ? [c.leadTimeLabel || 'Lead time', it.leadTime] : null
    ].filter(Boolean);
    var root = d.querySelector('.pd');
    root.innerHTML =
      '<div class="pd__stage">' +
        '<div class="pflip" data-pflip><div class="pflip__inner">' +
          '<div class="pflip__face pflip__front"></div>' +
          '<div class="pflip__face pflip__back"><span class="pflip__crest" aria-hidden="true"></span><p class="eyebrow">' + u.esc(it.category || '') + '</p><p class="pflip__name">' + u.rich(it.name) + '</p>' +
            ((it.finishes || []).length ? '<p class="field-label">' + u.esc(c.finishesLabel || 'Finishes') + '</p><p class="pflip__fin">' + it.finishes.map(u.esc).join(' · ') + '</p>' : '') +
            (specs.length ? '<dl class="pflip__specs">' + specs.map(function (r) { return '<div><dt>' + u.esc(r[0]) + '</dt><dd>' + u.esc(r[1]) + '</dd></div>'; }).join('') + '</dl>' : '') +
            '<p class="pflip__price">' + u.esc(priceText(it)) + '</p></div>' +
        '</div></div>' +
        (pics.length > 1 ? '<div class="pd__thumbs" role="group" aria-label="Photos">' + pics.map(function (im, k) { return '<button type="button" data-pd-img="' + k + '" aria-label="Photo ' + (k + 1) + '" aria-current="' + (k === 0) + '"></button>'; }).join('') + '</div>' : '') +
      '</div>' +
      '<div class="pd__info">' +
        '<p class="eyebrow">' + u.esc(it.category || '') + (it.sample ? ' <span class="pd__sample">' + u.esc(c.sample || 'Sample design') + '</span>' : '') + '</p>' +
        '<h2 class="pd__title" id="pdetail-title">' + u.rich(it.name) + '</h2>' +
        (it.description ? '<p class="pd__desc">' + u.rich(it.description) + '</p>' : '') +
        ((it.finishes || []).length ? '<p class="field-label" id="pd-fin">' + u.esc(c.finishesLabel || 'Finishes') + '</p><div class="chips" role="group" aria-labelledby="pd-fin">' +
          it.finishes.map(function (f) { return '<button type="button" class="chip" data-pfinish="' + u.esc(f) + '" aria-pressed="' + (cur.finishes.indexOf(f) >= 0) + '">' + u.esc(f) + '</button>'; }).join('') + '</div>' : '') +
        (specs.length ? '<dl class="pd__specs">' + specs.map(function (r) { return '<div><dt>' + u.esc(r[0]) + '</dt><dd>' + u.esc(r[1]) + '</dd></div>'; }).join('') + '</dl>' : '') +
        '<p class="pd__price">' + u.esc(priceText(it)) + '</p>' +
        '<div class="pd__actions"><button type="button" class="btn btn--ghost" data-pd-quote aria-pressed="false"></button>' +
        '<button type="button" class="btn btn--gold" data-pd-request>' + u.esc(c.requestQuote || 'Request a printing quote') + ' ' + DP.icons.arrow + '</button></div>' +
        '<div class="pd__foot"><button type="button" class="linkbtn" data-pd-flip>' + u.esc(c.flipBack || 'See the details') + '</button>' +
        (cur.order.length > 1 ? '<span class="pd__step"><button type="button" class="icon-round" data-pd-step="-1" aria-label="' + u.esc(c.prev || 'Previous piece') + '">' + DP.icons.left + '</button><button type="button" class="icon-round" data-pd-step="1" aria-label="' + u.esc(c.next || 'Next piece') + '">' + DP.icons.right + '</button></span>' : '') + '</div>' +
      '</div>';
    var thumbs = root.querySelectorAll('[data-pd-img]');
    pics.forEach(function (im, k) { if (thumbs[k]) thumbs[k].appendChild(pictureEl(im, { thumb: true, alt: '' })); });
    showImg(0);
    d.setAttribute('aria-labelledby', 'pdetail-title');
    syncDetailQuote();
    if (!d.open && DP.tools && DP.tools.open) DP.tools.open(d);
    var crest = root.querySelector('.pflip__crest');
    if (crest) { var lg = (DP.content.brand && DP.content.brand.logo) || {}; crest.style.backgroundImage = 'url("' + new URL(lg.markDark || 'assets/brand/logo-mark-dark.svg', document.baseURI).href + '")'; }
  };
  function showImg(k) {
    var d = u.$('#pdetail'), it = byId(cur.id); if (!d || !it) return;
    var pics = imgs(it); if (!pics.length) return;
    cur.img = (k + pics.length) % pics.length;
    var front = d.querySelector('.pflip__front');
    front.innerHTML = '';
    var im = pictureEl(pics[cur.img], { alt: pics[cur.img].alt || (DP.media.resolve(pics[cur.img].src) || {}).alt || u.plain(it.name) });
    im.setAttribute('loading', 'eager');
    front.appendChild(im);
    front.insertAdjacentHTML('beforeend', '<span class="pcard__sheen" aria-hidden="true"></span>');
    u.$$('[data-pd-img]', d).forEach(function (b, i) { b.setAttribute('aria-current', i === cur.img ? 'true' : 'false'); });
    var fl = d.querySelector('[data-pflip]'); if (fl) setFlip(fl, false);
  }
  function setFlip(fl, on) {
    fl.classList.toggle('is-flipped', on);
    var d = u.$('#pdetail'), b = d && d.querySelector('[data-pd-flip]'), c = copy();
    if (b) b.textContent = on ? (c.flipFront || 'See the design') : (c.flipBack || 'See the details');
    var front = fl.querySelector('.pflip__front'), back = fl.querySelector('.pflip__back');
    if (front) front.setAttribute('aria-hidden', on ? 'true' : 'false');
    if (back) back.setAttribute('aria-hidden', on ? 'false' : 'true');
  }

  /* ---------------- layout: wall (desktop) / fanned deck (phone) / grid (static) ---------------- */
  var st = { filter: '*', deckIndex: 0, mode: '', sway: null, io: null, visible: false, ro: null, raf: 0 };
  function visibleIds() {
    return u.$$('.pwall__item').filter(function (li) { return !li.classList.contains('is-out'); }).map(function (li) { return li.dataset.pitem; });
  }
  function modeNow() {
    if (u.reduced() || document.documentElement.classList.contains('is-static')) return 'grid';
    return u.isMobile() ? 'deck' : 'wall';
  }
  function hash(i) { var x = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return x - Math.floor(x); }
  /* rails: thread hangs as a gentle catenary; y in px of the wall box */
  function sagAt(t, H) { return H * 0.045 * 4 * t * (1 - t); }
  /* Wall layout: rails are spread so the last row still fits, the card size follows the wall (rows may overlap a
     little, the front rail covering the back one, which is what gives the wall its depth). */
  function layoutWall() {
    var wall = u.$('[data-pwall]'); if (!wall) return;
    var W = wall.clientWidth, H = wall.clientHeight;
    var lis = u.$$('.pwall__item', wall);
    var vis = lis.filter(function (li) { return !li.classList.contains('is-out'); });
    var n = vis.length;
    var rails = n <= 4 ? [1] : n <= 8 ? [0, 2] : [0, 1, 2];
    var R = rails.length, perRow = Math.ceil(n / R) || 1;
    var top = 34, bottom = 44;
    var cw = Math.min(232, (H - top - bottom) / R * 1.18 * 0.75, W / perRow * 0.82, Math.max(150, W * 0.15));
    var ch = cw * 4 / 3;
    wall.style.setProperty('--cw', cw.toFixed(1) + 'px');
    var ys = {};
    rails.forEach(function (r, k) { ys[r] = R === 1 ? (H - ch) / 2 - 10 : top + k * (H - top - bottom - ch - H * 0.045) / (R - 1); });
    u.$$('.pwall__rail', wall).forEach(function (rl) {
      var r = +rl.dataset.rail, on = rails.indexOf(r) >= 0;
      rl.classList.toggle('is-off', !on);
      if (!on) return;
      var y = ys[r] + 2, path = 'M -20 ' + y.toFixed(1) + ' Q ' + (W / 2) + ' ' + (y + sagAt(0.5, H) * 2).toFixed(1) + ' ' + (W + 20) + ' ' + y.toFixed(1);
      var svg = rl.querySelector('svg'); svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      u.$$('path', svg).forEach(function (p) { p.setAttribute('d', path); });
    });
    var per = rails.map(function () { return []; });
    vis.forEach(function (li, k) { per[k % R].push(li); });
    per.forEach(function (row, ri) {
      var r = rails[ri], depth = R === 1 ? 1 : [0.84, 0.92, 1][r];
      var m = row.length;
      row.forEach(function (li, j) {
        var i = +li.style.getPropertyValue('--i') || j;
        var t = (j + 0.5 + (R > 1 ? [-0.14, 0.2, 0.04][r] : 0)) / m + (hash(i + r) - 0.5) * (0.2 / Math.max(m, 2)); // brick offset per rail + a hand-hung irregularity
        t = Math.max(0.07, Math.min(0.93, t));
        var x = t * W - cw / 2, y = ys[r] + sagAt(t, H) - 2;
        li.dataset.x = x; li.dataset.y = y;
        li.style.setProperty('--px', x.toFixed(1) + 'px');
        li.style.setProperty('--py', y.toFixed(1) + 'px');
        li.style.setProperty('--base', ((hash(i * 3) - 0.5) * 8).toFixed(2) + 'deg');
        li.style.setProperty('--ps', depth);
        li.style.zIndex = String(r * 10 + 2);
        li.dataset.rail = r;
      });
    });
    // filtered-out pieces lift off their clip from wherever they hung
    lis.forEach(function (li) { if (li.classList.contains('is-out')) li.style.setProperty('--py', ((+li.dataset.y || 0) - 70).toFixed(1) + 'px'); });
  }
  function layoutDeck() {
    var wall = u.$('[data-pwall]'); if (!wall) return;
    var all = u.$$('.pwall__item', wall);
    all.forEach(function (li) { li.classList.remove('is-front'); });
    var vis = all.filter(function (li) { return !li.classList.contains('is-out'); });
    var n = vis.length; if (!n) return;
    st.deckIndex = ((st.deckIndex % n) + n) % n;
    vis.forEach(function (li, k) {
      var d = k - st.deckIndex;
      if (d > n / 2) d -= n; if (d < -n / 2) d += n;
      var a = Math.abs(d);
      li.style.setProperty('--dx', (d * 34) + 'px');
      li.style.setProperty('--dy', (a * 12) + 'px');
      li.style.setProperty('--dr', (d * 7) + 'deg');
      li.style.setProperty('--ds', (1 - Math.min(a, 4) * 0.06).toFixed(3));
      li.style.zIndex = String(100 - a);
      li.classList.toggle('is-front', d === 0);
      li.classList.toggle('is-far', a > 3);
      var b = li.querySelector('.pcard'); if (b) b.tabIndex = d === 0 ? 0 : -1;
    });
    var cnt = wall.querySelector('.pwall__count'); if (cnt) cnt.textContent = (st.deckIndex + 1) + ' / ' + n;
  }
  function layout() {
    var wall = u.$('[data-pwall]'); if (!wall) return;
    var m = modeNow();
    if (m !== st.mode) {
      wall.classList.remove('is-wall', 'is-deck', 'is-grid', 'is-ready');
      wall.classList.add('is-' + m);
      st.mode = m;
      wall.querySelector('.pwall__nav').hidden = m !== 'deck';
      u.$$('.pcard', wall).forEach(function (b) { b.tabIndex = 0; });
    }
    if (m === 'wall') layoutWall(); else if (m === 'deck') layoutDeck();
    // first placement is instant; only later moves (filtering, resizing) glide
    if (!wall.classList.contains('is-ready')) { void wall.offsetWidth; requestAnimationFrame(function () { wall.classList.add('is-ready'); }); }
  }
  P.layout = layout;

  function applyFilter(key) {
    st.filter = key;
    u.$$('[data-pfilter]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.pfilter === key ? 'true' : 'false'); });
    u.$$('.pwall__item').forEach(function (li) {
      var out = key !== '*' && li.dataset.cat !== key;
      li.classList.toggle('is-out', out);
      li.toggleAttribute('inert', out);
      li.setAttribute('aria-hidden', out ? 'true' : 'false');
    });
    st.deckIndex = 0;
    layout();
  }

  /* ---------------- sway: each card is a damped pendulum driven by scroll velocity ---------------- */
  function startSway() {
    stopSway();
    if (!window.gsap || st.mode !== 'wall') return;
    var lis = u.$$('.pwall__item');
    var phys = lis.map(function (li, i) { return { li: li, a: 0, v: 0, k: 0.6 + hash(i * 7) * 0.8, ph: hash(i) * 6.28 }; });
    var lastY = window.scrollY, t0 = 0;
    st.sway = function (time) {
      if (!st.visible) return;
      var vel = DP.lenis ? DP.lenis.velocity : (window.scrollY - lastY);
      lastY = window.scrollY;
      vel = Math.max(-60, Math.min(60, vel || 0));
      t0 += 0.016;
      phys.forEach(function (p) {
        if (p.li.classList.contains('is-hot') || p.li.classList.contains('is-out')) { p.a += (0 - p.a) * 0.2; p.v = 0; }
        else {
          var target = vel * 0.22 * p.k + Math.sin(t0 * 0.9 + p.ph) * 0.6; // velocity push + a breath of air
          p.v += (target - p.a) * 0.06; p.v *= 0.86; p.a += p.v;
        }
        p.li.style.setProperty('--sway', p.a.toFixed(2) + 'deg');
      });
    };
    gsap.ticker.add(st.sway);
  }
  function stopSway() { if (st.sway && window.gsap) gsap.ticker.remove(st.sway); st.sway = null; }

  /* ---------------- scroll scenes (called from motion.init so motion.kill reverts them) ---------------- */
  P.motion = function (desk) {
    var sec = u.$('#printing'); if (!sec || !window.gsap) return;
    if (desk) {
      // parallax per depth: the back rail drifts most. Tweened as a CSS variable (--ry) so it composes with the
      // hang position / sway transform instead of replacing it.
      var wall = sec.querySelector('.pwall');
      gsap.fromTo(wall, { '--pp': 1 }, { '--pp': -1, ease: 'none', scrollTrigger: { trigger: wall, start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
      // the pieces are "hung" as the wall arrives: threads draw, cards drop onto their clips
      gsap.from(u.$$('.pwall__thread path', sec), { strokeDashoffset: 2000, strokeDasharray: 2000, duration: 1.6, ease: 'power2.out', stagger: 0.15, clearProps: 'strokeDasharray,strokeDashoffset', scrollTrigger: { trigger: '.pwall', start: 'top 75%' } });
      gsap.from(u.$$('.pwall__item:not(.is-out) .pcard', sec), { yPercent: -40, opacity: 0, rotate: function (i) { return (i % 2 ? -1 : 1) * 14; }, duration: 1.1, ease: 'back.out(1.6)', stagger: 0.05, clearProps: 'transform,opacity', scrollTrigger: { trigger: '.pwall', start: 'top 70%' } });
    }
    ScrollTrigger.batch(u.$$('.popt, .ppk__card', sec), { start: 'top 90%', once: true, onEnter: function (els) { gsap.from(els, { opacity: 0, y: 34, duration: 0.9, ease: 'power3.out', stagger: 0.07, overwrite: true }); } });
  };

  /* ---------------- init (every mount) ---------------- */
  P.init = function () {
    stopSway();
    if (st.io) { st.io.disconnect(); st.io = null; }
    if (st.ro) { st.ro.disconnect(); st.ro = null; }
    st.mode = ''; st.filter = '*'; st.deckIndex = 0;
    var sec = u.$('#printing');
    renderQuote();
    if (!sec) return;
    var wall = sec.querySelector('[data-pwall]');
    layout();
    // images settle -> relayout (card heights depend on the paper ratio)
    u.$$('img', wall).forEach(function (im) { if (!im.complete) im.addEventListener('load', function () { if (st.mode === 'wall') layoutWall(); }, { once: true }); });
    if ('ResizeObserver' in window) {
      var lastW = 0;
      st.ro = new ResizeObserver(function () { var w = wall.clientWidth; if (Math.abs(w - lastW) < 2) return; lastW = w; cancelAnimationFrame(st.raf); st.raf = requestAnimationFrame(function () { var was = st.mode; layout(); if (st.mode !== was) { if (st.mode === 'wall') startSway(); else stopSway(); } }); });
      st.ro.observe(wall);
    }
    st.io = new IntersectionObserver(function (es) { st.visible = es[0].isIntersecting; }, { rootMargin: '120px' });
    st.io.observe(wall);
    if (st.mode === 'wall' && !u.reduced()) startSway();
    bindDetail();
    if (sec.dataset.pbound) return; // listeners live on the section; a re-render makes a new section
    sec.dataset.pbound = '1';

    sec.addEventListener('click', function (e) {
      var f = e.target.closest('[data-pfilter]');
      if (f) { applyFilter(f.dataset.pfilter); return; }
      var dk = e.target.closest('[data-pdeck]');
      if (dk) { st.deckIndex += +dk.dataset.pdeck; layoutDeck(); var fr = sec.querySelector('.pwall__item.is-front .pcard'); if (fr) fr.focus({ preventScroll: true }); return; }
      var o = e.target.closest('[data-popen]');
      if (o) {
        if (st.mode === 'deck') {
          var li = o.closest('.pwall__item');
          if (li && !li.classList.contains('is-front')) { var ids = visibleIds(); st.deckIndex = ids.indexOf(li.dataset.pitem); layoutDeck(); return; }
        }
        P.open(o.dataset.popen); return;
      }
      var rm = e.target.closest('[data-pq-remove]');
      if (rm) { toggleQuote(rm.dataset.pqRemove); return; }
      if (e.target.closest('[data-pq-request]')) { requestQuote(); return; }
      var pk = e.target.closest('[data-ppackage]');
      if (pk) { var p = (C().packages || [])[+pk.dataset.ppackage]; if (p) requestQuote('package "' + u.plain(p.name) + '"'); }
    });
    // hover / focus lift (desktop wall)
    function hot(li, on) { if (li) li.classList.toggle('is-hot', on); }
    wall.addEventListener('pointerover', function (e) { var li = e.target.closest('.pwall__item'); if (li) hot(li, true); });
    wall.addEventListener('pointerout', function (e) { var li = e.target.closest('.pwall__item'); if (li && !li.contains(e.relatedTarget)) hot(li, false); });
    wall.addEventListener('focusin', function (e) { hot(e.target.closest('.pwall__item'), true); });
    wall.addEventListener('focusout', function (e) { hot(e.target.closest('.pwall__item'), false); });
    // phone deck: swipe
    var sx = null, sy = null;
    wall.addEventListener('pointerdown', function (e) { if (st.mode !== 'deck') return; sx = e.clientX; sy = e.clientY; }, { passive: true });
    wall.addEventListener('pointerup', function (e) {
      if (st.mode !== 'deck' || sx == null) return;
      var dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { st.deckIndex += dx < 0 ? 1 : -1; layoutDeck(); wall.dataset.swiped = '1'; setTimeout(function () { delete wall.dataset.swiped; }, 50); }
    });
    wall.addEventListener('click', function (e) { if (wall.dataset.swiped) { e.stopPropagation(); e.preventDefault(); } }, true);
    wall.addEventListener('keydown', function (e) {
      if (st.mode !== 'deck' || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
      st.deckIndex += e.key === 'ArrowRight' ? 1 : -1; layoutDeck(); e.preventDefault();
      var fr = wall.querySelector('.pwall__item.is-front .pcard'); if (fr) fr.focus({ preventScroll: true });
    });
  };

  function bindDetail() {
    var d = u.$('#pdetail'); if (!d || d.dataset.pbound) return;
    d.dataset.pbound = '1';
    d.addEventListener('click', function (e) {
      var t = e.target;
      var im = t.closest('[data-pd-img]'); if (im) { showImg(+im.dataset.pdImg); return; }
      var fin = t.closest('[data-pfinish]');
      if (fin) {
        var v = fin.dataset.pfinish, i = cur.finishes.indexOf(v);
        if (i >= 0) cur.finishes.splice(i, 1); else cur.finishes.push(v);
        fin.setAttribute('aria-pressed', i < 0 ? 'true' : 'false');
        if (inQuote(cur.id)) { var q = quote(); q.forEach(function (x) { if (x.id === cur.id) x.finishes = cur.finishes.slice(); }); saveQuote(q); }
        return;
      }
      if (t.closest('[data-pd-quote]')) { toggleQuote(cur.id, cur.finishes.slice()); return; }
      if (t.closest('[data-pd-request]')) {
        if (!inQuote(cur.id)) { var q2 = quote(); q2.push({ id: cur.id, finishes: cur.finishes.slice() }); u.store(QKEY, JSON.stringify(q2)); renderQuote(); }
        DP.tools.close(d); setTimeout(function () { requestQuote(); }, 60); return;
      }
      var fl = t.closest('[data-pd-flip]') || t.closest('.pflip__face');
      if (fl) { var card = d.querySelector('[data-pflip]'); setFlip(card, !card.classList.contains('is-flipped')); return; }
      var sp = t.closest('[data-pd-step]');
      if (sp) {
        var ord = cur.order.length ? cur.order : items().map(function (x) { return x.id; });
        var k = ord.indexOf(cur.id); P.open(ord[(k + (+sp.dataset.pdStep) + ord.length) % ord.length]);
      }
    });
    d.addEventListener('keydown', function (e) {
      if (e.target.closest('input,textarea')) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { var b = d.querySelector('[data-pd-step="' + (e.key === 'ArrowRight' ? 1 : -1) + '"]'); if (b) { b.click(); e.preventDefault(); } }
    });
    d.addEventListener('close', function () { cur.id = null; var root = d.querySelector('.pd'); if (root) root.innerHTML = ''; });
  }

  P.kill = function () { stopSway(); };
})();
