/* Dreamz Planners — conversion tools: header, promo, dock, wizard, estimator, date check,
   lightbox, film, announcement, reviews. */
(function () {
  'use strict';
  var DP = (window.DP = window.DP || {});
  var u = DP.u;
  var T = (DP.tools = {});

  function C() { return DP.content; }
  function I() { return DP.icons; }

  /* ---------------- chrome: promo + header + mobile nav ---------------- */
  T.chrome = function () {
    var c = C();
    var top = u.$('#topbar');
    var promo = u.$('#promo');
    var p = c.promo || {};
    var texts = (p.text || []).filter(Boolean);
    if (p.enabled && texts.length) {
      promo.hidden = false;
      promo.href = p.link || '#begin';
      var row = texts.map(function (t) { return '<span class="promo__item">' + u.esc(t) + '</span>'; }).join('');
      var reps = Math.max(2, Math.ceil(8 / texts.length));
      var half = ''; for (var i = 0; i < reps; i++) half += row;
      promo.innerHTML = '<span class="sr-only">' + u.esc(texts.join('. ')) + '</span><span class="promo__track" aria-hidden="true">' + half + half + '</span>';
      document.documentElement.style.setProperty('--promo-h', '34px');
      var col = p.colors || {};
      if (col.bg) document.documentElement.style.setProperty('--promo-bg', col.bg);
      if (col.fg) document.documentElement.style.setProperty('--promo-fg', col.fg);
      if (col.accent) document.documentElement.style.setProperty('--promo-accent', col.accent);
      var sp = Math.max(8, Math.min(200, +p.speed || 40));
      document.documentElement.style.setProperty('--promo-dur', Math.round((texts.join('').length * reps) / sp * 6) + 's');
    } else {
      promo.hidden = true;
      document.documentElement.style.setProperty('--promo-h', '0px');
    }

    // two logo files: gold (for dark backgrounds / over the hero film) and dark (for light themes); CSS shows the right one
    var logo = u.$('#header-logo'), lg = c.brand.logo || {};
    logo.innerHTML = '';
    [['logo-for-dark', lg.horizontal], ['logo-for-light', lg.horizontalDark || lg.horizontal]].forEach(function (pair, k) {
      var img = u.h('img', { class: pair[0], src: pair[1], alt: k ? '' : c.brand.name, width: 196, height: 44 });
      img.addEventListener('error', function () { logo.innerHTML = '<span class="wordmark">' + u.esc(c.brand.name) + '</span>'; });
      logo.appendChild(img);
    });
    T.themeToggle();

    var nav = u.$('#nav'), mnav = u.$('#mobile-nav');
    var links = (c.nav || []).map(function (n) { return '<a href="' + u.esc(n.href) + '">' + u.esc(n.label) + '</a>'; }).join('');
    nav.innerHTML = links;
    mnav.innerHTML = links + '<a href="#begin">' + u.esc(c.labels.planCta) + '</a><div class="mobile-nav__contact">' +
      (c.contact.phones || []).map(function (ph) { return '<a class="btn btn--ghost btn--sm" href="' + u.telHref(ph) + '">' + I().phone + ' ' + u.esc(ph.number) + '</a>'; }).join('') + '</div>';
    u.$('#header-plan').innerHTML = u.esc(c.labels.planCta);

    var btn = u.$('#menu-btn');
    function setMenu(open) {
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      mnav.classList.toggle('is-open', open);
      mnav.toggleAttribute('inert', !open);
      if (DP.lenis) open ? DP.lenis.stop() : DP.lenis.start();
      if (open) { var a = mnav.querySelector('a'); if (a) a.focus(); }
      if (T._syncTop) T._syncTop();
    }
    if (!btn.dataset.bound) {
      btn.dataset.bound = '1';
      btn.addEventListener('click', function () { setMenu(btn.getAttribute('aria-expanded') !== 'true'); });
      mnav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && mnav.classList.contains('is-open')) { setMenu(false); btn.focus(); } });
      mnav.setAttribute('inert', '');

      var lastY = 0;
      // over the hero film the header uses the light-on-dark media palette; once scrolled it becomes page glass
      T._syncTop = function () {
        var first = u.$('main > section');
        var over = !top.classList.contains('is-scrolled') && first && first.id === 'hero' && !mnav.classList.contains('is-open');
        top.classList.toggle('on-media', !!over);
      };
      var onScroll = function () {
        var y = window.scrollY;
        top.classList.toggle('is-scrolled', y > 40);
        T._syncTop();
        var tt = u.$('#totop-float');
        if (tt) tt.classList.toggle('is-on', y > window.innerHeight * 2.5);
        var hide = y > lastY + 4 && y > window.innerHeight * 0.9 && !mnav.classList.contains('is-open');
        if (y < lastY - 4 || y < 200) top.classList.remove('is-hidden'); else if (hide) top.classList.add('is-hidden');
        lastY = y;
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();

      // active nav link
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (es) {
          es.forEach(function (e) {
            if (!e.isIntersecting) return;
            u.$$('#nav a').forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id); });
          });
        }, { rootMargin: '-45% 0px -50% 0px' });
        T._navIO = io;
      }
    }
    if (T._navIO) u.$$('main > section').forEach(function (s) { T._navIO.observe(s); });
    if (T._syncTop) T._syncTop();

    // floating back-to-top (appears after scrolling far); the footer has its own button
    var ft = u.$('#totop-float');
    if (ft) { ft.setAttribute('aria-label', c.labels.backToTop || 'Back to top'); ft.querySelector('.totop-float__tip').textContent = c.labels.backToTop || 'Back to top'; }
  };

  /* ---------------- visitor light / dark toggle (theme.visitorToggle) ---------------- */
  T.themeToggle = function () {
    var th = C().theme || {}, holder = u.$('#theme-toggle');
    if (!holder) return;
    holder.hidden = !th.visitorToggle || !DP.themes;
    if (holder.hidden) return;
    var now = DP.themeNow || { mode: 'dark' };
    var toLight = now.mode !== 'light';
    var lb = C().labels || {};
    var label = toLight ? (lb.lightTheme || 'Switch to light theme') : (lb.darkTheme || 'Switch to dark theme');
    holder.setAttribute('aria-label', label); holder.title = label;
    holder.setAttribute('aria-pressed', now.mode === 'light' ? 'true' : 'false');
    if (!holder.dataset.bound) {
      holder.dataset.bound = '1';
      holder.addEventListener('click', function () {
        var next = (DP.themeNow && DP.themeNow.mode === 'light') ? 'dark' : 'light';
        try { localStorage.setItem('dp:visitor-mode', next); } catch (e) {}
        DP.visitorClicked = true;
        DP.applyTheme(DP.content);
        T.themeToggle();
      });
    }
  };

  /* After any programmatic jump (back to top, nav links) let every scrubbed / pinned scene catch up with the
     final scroll position, so no transform is left half-way. */
  T.settle = function () {
    if (!window.ScrollTrigger) return;
    try { ScrollTrigger.update(); } catch (e) {}
    clearTimeout(T._settleT);
    T._settleT = setTimeout(function () { try { ScrollTrigger.update(); } catch (e) {} }, 900);
  };

  /* ---------------- back to top ---------------- */
  T.toTop = function () {
    var focusEl = u.$('#header-logo') || u.$('#main');
    if (DP.lenis) DP.lenis.scrollTo(0, { duration: 1.8, onComplete: T.settle });
    else { window.scrollTo({ top: 0, behavior: u.reduced() ? 'auto' : 'smooth' }); setTimeout(T.settle, u.reduced() ? 50 : 1200); }
    setTimeout(function () { try { focusEl.focus({ preventScroll: true }); } catch (e) {} }, u.reduced() ? 0 : 1200);
  };

  /* ---------------- dock ---------------- */
  T.dock = function () {
    var c = C(), dock = u.$('#dock');
    var ph = (c.contact.phones || [])[0] || {};
    dock.innerHTML =
      '<button type="button" class="dock__item dock__toggle" aria-expanded="false" aria-controls="dock" aria-label="' + u.esc(c.labels.contactOptions) + '">' + I().spark + '</button>' +
      '<a class="dock__item" href="' + u.telHref(ph) + '" aria-label="' + u.esc(c.labels.call + ' ' + (ph.number || '')) + '">' + I().phone + '<span class="dock__tip">' + u.esc(c.labels.call + ' ' + (ph.number || '')) + '</span></a>' +
      '<a class="dock__item" href="' + u.waHref(c.contact.whatsapp.number, c.contact.whatsapp.defaultMessage) + '" target="_blank" rel="noopener" aria-label="' + u.esc(c.labels.whatsapp) + '">' + I().chat + '<span class="dock__tip">' + u.esc(c.labels.whatsapp) + '</span></a>' +
      '<a class="dock__item" href="' + u.esc(c.contact.instagram.url) + '" target="_blank" rel="noopener" aria-label="' + u.esc(c.labels.instagram) + ' @' + u.esc(c.contact.instagram.handle) + '">' + I().ig + '<span class="dock__tip">@' + u.esc(c.contact.instagram.handle) + '</span></a>' +
      '<button type="button" class="dock__item dock__item--plan" data-action="wizard">' + I().spark + u.esc(c.labels.plan) + '</button>';
    var tog = dock.querySelector('.dock__toggle');
    tog.addEventListener('click', function () {
      var open = !dock.classList.contains('is-open');
      dock.classList.toggle('is-open', open);
      tog.setAttribute('aria-expanded', open ? 'true' : 'false');
      tog.innerHTML = open ? I().close : I().spark;
    });
    // magnification (reactbits Dock idea)
    if (u.finePointer() && !u.reduced()) {
      var items = u.$$('.dock__item', dock);
      dock.addEventListener('pointermove', function (e) {
        items.forEach(function (it) {
          var r = it.getBoundingClientRect();
          var d = Math.abs(e.clientX - (r.left + r.width / 2));
          it.style.setProperty('--s', (1 + Math.max(0, 1 - d / 140) * 0.32).toFixed(3));
        });
      });
      dock.addEventListener('pointerleave', function () { items.forEach(function (it) { it.style.setProperty('--s', 1); }); });
    }
    // hide dock while the final chapter's own tools are on screen
    var begin = u.$('#begin');
    if (begin && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { dock.classList.toggle('is-away', es[0].isIntersecting && !u.isMobile()); }, { threshold: 0.25 }).observe(begin);
    }
  };

  /* ---------------- dialogs ---------------- */
  function openDialog(d) {
    if (!d) return;
    T._lastFocus = document.activeElement;
    if (typeof d.showModal === 'function') { try { d.showModal(); } catch (e) { d.setAttribute('open', ''); } }
    else d.setAttribute('open', '');
    if (DP.lenis) DP.lenis.stop();
    document.documentElement.style.overflow = 'hidden';
  }
  function closeDialog(d) {
    if (!d) return;
    if (typeof d.close === 'function' && d.open) d.close(); else d.removeAttribute('open');
  }
  function onClosed() {
    if (u.$$('dialog[open]').length) return;
    if (DP.lenis) DP.lenis.start();
    document.documentElement.style.overflow = '';
    if (T._lastFocus && T._lastFocus.focus) try { T._lastFocus.focus(); } catch (e) {}
  }
  T.dialogs = function () {
    u.$$('dialog').forEach(function (d) {
      if (d.dataset.bound) return;
      d.dataset.bound = '1';
      d.addEventListener('close', function () { onClosed(); if (d.id === 'film') T.stopFilm(); });
      d.addEventListener('click', function (e) {
        if (e.target.closest('[data-close]')) closeDialog(d);
        else if (e.target === d && d.classList.contains('modal')) closeDialog(d);
      });
    });
  };
  T.open = openDialog; T.close = closeDialog;

  /* ---------------- wizard ---------------- */
  function Wizard(root, opts) {
    this.root = root; this.opts = opts || {};
    this.state = { events: [], date: '', flexible: false, guests: '', services: [], budget: '', name: '', phone: '', email: '', method: '', message: '', company: '', printing: null };
    this.step = 0; this.done = false; this.uid = 'wz' + Math.random().toString(36).slice(2, 7);
    this.render();
  }
  Wizard.prototype.prefill = function (data) {
    var s = this.state;
    Object.keys(data || {}).forEach(function (k) { s[k] = data[k]; });
    this.step = 0; this.done = false; this.render();
  };
  Wizard.prototype.steps = function () { return (C().wizard.steps || []); };
  function wcopy() { return C().wizard.copy || {}; }
  Wizard.prototype.render = function () {
    var W = wcopy();
    var c = C().wizard, s = this.state, st = this.step, id = this.uid, self = this;
    var names = this.steps();
    if (this.done) return this.renderSuccess();
    var html = '<div class="wiz"><div class="wiz__top"><span class="wiz__stepname">' + u.esc(names[st] || '') + '</span><span class="wiz__count">' + (st + 1) + ' / ' + names.length + '</span></div>' +
      '<div class="wiz__bar" role="progressbar" aria-label="Inquiry progress" aria-valuemin="1" aria-valuemax="' + names.length + '" aria-valuenow="' + (st + 1) + '"><i style="transform:scaleX(' + ((st + 1) / names.length) + ')"></i></div>' +
      '<form class="wiz__step" novalidate>';
    function chips(list, key, multi) {
      return '<div class="chips" role="' + (multi ? 'group' : 'radiogroup') + '" aria-labelledby="' + id + '-q">' + list.map(function (v) {
        var on = multi ? s[key].indexOf(v) >= 0 : s[key] === v;
        return '<button type="button" class="chip" data-key="' + key + '" data-multi="' + (multi ? 1 : 0) + '" data-val="' + u.esc(v) + '" ' + (multi ? 'aria-pressed' : 'role="radio" aria-checked') + '="' + on + '">' + u.esc(v) + '</button>';
      }).join('') + '</div>';
    }
    var today = u.ymd(new Date());
    if (st === 0) html += '<h3 class="wiz__q" id="' + id + '-q">' + u.esc(W.eventQ) + '</h3><p class="hint" style="margin:-8px 0 14px">' + u.esc(W.eventHint) + '</p>' + chips(c.eventTypes, 'events', true);
    if (st === 1) html += '<h3 class="wiz__q" id="' + id + '-q">' + u.esc(W.dateQ) + '</h3>' +
      '<div class="field-row"><div class="field"><label for="' + id + '-date">' + u.esc(W.dateLabel) + '</label><input class="input" type="date" id="' + id + '-date" name="date" min="' + today + '" value="' + u.esc(s.date) + '"' + (s.flexible ? ' disabled' : '') + '></div>' +
      '<div class="field"><label for="' + id + '-guests">' + u.esc(W.guestsLabel) + '</label><input class="input" type="number" inputmode="numeric" id="' + id + '-guests" name="guests" min="1" max="5000" placeholder="' + (c.guests && c.guests.default || 250) + '" value="' + u.esc(s.guests) + '"></div></div>' +
      '<label class="check"><input type="checkbox" name="flexible"' + (s.flexible ? ' checked' : '') + '> ' + u.esc(W.flexibleLabel) + '</label>' +
      '<p class="hint" data-avail aria-live="polite"></p>';
    if (st === 2) html += '<h3 class="wiz__q" id="' + id + '-q">' + u.esc(W.servicesQ) + '</h3><p class="hint" style="margin:-8px 0 14px">' + u.esc(W.servicesHint) + '</p>' + chips(c.services, 'services', true);
    if (st === 3) html += '<h3 class="wiz__q" id="' + id + '-q">' + u.esc(W.budgetQ) + '</h3><p class="hint" style="margin:-8px 0 14px">' + u.esc(W.budgetHint) + '</p>' + chips(c.budgets, 'budget', false);
    if (st === 4) html += '<h3 class="wiz__q" id="' + id + '-q">' + u.esc(W.contactQ) + '</h3>' +
      '<div class="field"><label for="' + id + '-name">' + u.esc(W.nameLabel) + '</label><input class="input" id="' + id + '-name" name="name" autocomplete="name" required value="' + u.esc(s.name) + '"></div>' +
      '<div class="field-row"><div class="field"><label for="' + id + '-phone">' + u.esc(W.phoneLabel) + '</label><input class="input" type="tel" id="' + id + '-phone" name="phone" autocomplete="tel" inputmode="tel" value="' + u.esc(s.phone) + '"></div>' +
      '<div class="field"><label for="' + id + '-email">' + u.esc(W.emailLabel) + '</label><input class="input" type="email" id="' + id + '-email" name="email" autocomplete="email" value="' + u.esc(s.email) + '"></div></div>' +
      '<p class="field-label" id="' + id + '-mq" style="margin-top:6px">' + u.esc(W.methodLabel) + '</p>' + chips(c.contactMethods, 'method', false).replace('aria-labelledby="' + id + '-q"', 'aria-labelledby="' + id + '-mq"') +
      '<div class="field" style="margin-top:14px"><label for="' + id + '-msg">' + u.esc(W.messageLabel) + '</label><textarea class="input" id="' + id + '-msg" name="message" rows="3">' + u.esc(s.message) + '</textarea></div>' +
      '<div class="hp" aria-hidden="true"><label>Company<input tabindex="-1" autocomplete="off" name="company" value=""></label></div>';
    if (st === 5) {
      var rows = [
        ['Celebrating', s.events.join(', ') || '—', 0],
        ['Date', s.flexible ? 'Flexible / not set' : (s.date ? fmtDate(s.date) : '—'), 1],
        ['Guests', s.guests || '—', 1],
        ['Services', s.services.join(', ') || '—', 2],
        ['Budget', s.budget || '—', 3],
        ['Name', s.name, 4], ['Phone', s.phone || '—', 4], ['Email', s.email || '—', 4], ['Reach me by', s.method || '—', 4], ['Notes', s.message || '—', 4]
      ];
      html += '<h3 class="wiz__q" id="' + id + '-q">' + u.esc(W.reviewQ) + '</h3><dl class="review-list">' + rows.map(function (r) {
        return '<div><dt>' + u.esc(r[0]) + '</dt><dd>' + u.esc(r[1]) + '</dd><button type="button" class="linkbtn" data-goto="' + r[2] + '" aria-label="Edit ' + u.esc(r[0]) + '">Edit</button></div>';
      }).join('') + '</dl><p class="wiz__note">' + u.esc(c.consent) + ' <a href="privacy.html">Privacy</a>.</p>';
    }
    html += '<p class="wiz__error" role="alert" aria-live="assertive"></p><div class="wiz__nav">' +
      (st > 0 ? '<button type="button" class="btn btn--ghost" data-back>' + u.esc(C().labels.back) + '</button>' : '<span></span>') +
      '<button type="submit" class="btn btn--gold">' + (st === names.length - 1 ? u.esc(C().labels.submit) : u.esc(C().labels.next)) + ' ' + I().arrow + '</button></div></form></div>';
    this.root.innerHTML = html;
    this.bind();
    if (st === 1) this.checkDate();
  };
  Wizard.prototype.collect = function () {
    var f = this.root.querySelector('form'); if (!f) return;
    var s = this.state;
    ['date', 'guests', 'name', 'phone', 'email', 'message', 'company'].forEach(function (k) {
      var el = f.elements[k]; if (el) s[k] = String(el.value || '').trim();
    });
    if (f.elements.flexible) s.flexible = f.elements.flexible.checked;
  };
  Wizard.prototype.validate = function () {
    var W = wcopy();
    var s = this.state, st = this.step, f = this.root.querySelector('form');
    var err = '', bad = null;
    if (st === 0 && !s.events.length) err = W.errEvent;
    if (st === 1) {
      if (!s.flexible && s.date && s.date < u.ymd(new Date())) { err = W.errDate; bad = f.elements.date; }
      if (s.guests && (!/^\d+$/.test(s.guests) || +s.guests < 1 || +s.guests > 5000)) { err = W.errGuests; bad = f.elements.guests; }
    }
    if (st === 4) {
      var phoneDigits = s.phone.replace(/\D/g, '');
      if (!s.name) { err = W.errName; bad = f.elements.name; }
      else if (!phoneDigits && !s.email) { err = W.errContact; bad = f.elements.phone; }
      else if (s.phone && (phoneDigits.length < 7 || phoneDigits.length > 15)) { err = W.errPhone; bad = f.elements.phone; }
      else if (s.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.email)) { err = W.errEmail; bad = f.elements.email; }
    }
    u.$$('[aria-invalid]', f).forEach(function (x) { x.removeAttribute('aria-invalid'); });
    var box = this.root.querySelector('.wiz__error');
    box.textContent = err;
    if (bad) { bad.setAttribute('aria-invalid', 'true'); bad.focus(); }
    return !err;
  };
  Wizard.prototype.go = function (n) {
    this.step = Math.max(0, Math.min(this.steps().length - 1, n));
    this.render();
    var q = this.root.querySelector('.wiz__q');
    if (q) { q.setAttribute('tabindex', '-1'); q.focus({ preventScroll: true }); }
  };
  Wizard.prototype.bind = function () {
    var self = this, f = this.root.querySelector('form');
    if (!f) return;
    f.addEventListener('click', function (e) {
      var chip = e.target.closest('.chip');
      if (chip) {
        var k = chip.dataset.key, v = chip.dataset.val;
        if (chip.dataset.multi === '1') {
          var arr = self.state[k], i = arr.indexOf(v);
          if (i >= 0) arr.splice(i, 1); else arr.push(v);
          chip.setAttribute('aria-pressed', i < 0 ? 'true' : 'false');
        } else {
          self.state[k] = self.state[k] === v ? '' : v;
          u.$$('.chip[data-key="' + k + '"]', f).forEach(function (c) { c.setAttribute('aria-checked', c.dataset.val === self.state[k] ? 'true' : 'false'); });
        }
        return;
      }
      if (e.target.closest('[data-back]')) { self.collect(); self.go(self.step - 1); }
      var g = e.target.closest('[data-goto]');
      if (g) self.go(+g.dataset.goto);
    });
    f.addEventListener('keydown', function (e) {
      // arrow keys inside a radiogroup of chips
      var chip = e.target.closest('.chip[role=radio]');
      if (!chip || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
      var all = u.$$('.chip[data-key="' + chip.dataset.key + '"]', f), i = all.indexOf(chip);
      var nx = all[(i + (e.key === 'ArrowRight' ? 1 : -1) + all.length) % all.length];
      nx.focus(); e.preventDefault();
    });
    f.addEventListener('change', function (e) {
      if (e.target.name === 'flexible') { f.elements.date.disabled = e.target.checked; self.collect(); self.checkDate(); }
      if (e.target.name === 'date') { self.collect(); self.checkDate(); }
    });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      self.collect();
      if (!self.validate()) return;
      if (self.step < self.steps().length - 1) self.go(self.step + 1);
      else self.submit();
    });
  };
  Wizard.prototype.checkDate = function () {
    var box = this.root.querySelector('[data-avail]');
    if (!box) return;
    var s = this.state;
    if (s.flexible || !s.date) { box.textContent = ''; return; }
    var L = C().dateCheck.labels;
    DP.data.getAvailability(s.date, s.date).then(function (rows) {
      var r = rows.filter(function (x) { return x.day === s.date; })[0];
      var st = r ? r.status : 'unknown';
      box.innerHTML = '<span class="cal__dot cal__dot--' + st + '"></span>' + u.esc(L[st] || L.unknown) + (r && r.note ? ' — ' + u.esc(r.note) : '');
    });
  };
  Wizard.prototype.summary = function () {
    var s = this.state;
    return [
      'Name: ' + s.name,
      'Celebrating: ' + (s.events.join(', ') || '—'),
      'Date: ' + (s.flexible ? 'flexible' : (s.date ? fmtDate(s.date) : '—')),
      'Guests: ' + (s.guests || '—'),
      'Services: ' + (s.services.join(', ') || '—'),
      'Budget: ' + (s.budget || '—'),
      s.message ? 'Notes: ' + s.message : ''
    ].filter(Boolean).join('\n');
  };
  Wizard.prototype.submit = function () {
    var self = this, s = this.state;
    var btn = this.root.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = wcopy().sending;
    if (s.company) { self.done = true; self.render(); return; } // honeypot: silently succeed
    DP.data.submitLead({
      name: s.name, phone: s.phone, email: s.email,
      event_type: s.events.join(', '), event_date: s.flexible ? null : s.date, guests: s.guests,
      services: s.services, budget: s.budget, message: s.message,
      source: this.opts.source || 'website',
      payload: { events: s.events, flexible: s.flexible, contactMethod: s.method, page: location.pathname, estimator: s.estimator || null, printing: s.printing || null, ua: navigator.userAgent.slice(0, 160) }
    }).then(function (res) {
      if (!res.ok) { self.root.querySelector('.wiz__error').textContent = wcopy().errSubmit; btn.disabled = false; btn.textContent = C().labels.submit; return; }
      self.mode = res.mode; self.done = true; self.render();
      var t = self.root.querySelector('.wiz__success h3'); if (t) { t.setAttribute('tabindex', '-1'); t.focus(); }
    });
  };
  Wizard.prototype.renderSuccess = function () {
    var c = C(), w = c.wizard;
    var text = w.whatsappIntro + '\n\n' + this.summary();
    this.root.innerHTML = '<div class="wiz__success">' + I().seal.replace('<svg', '<svg class="seal"') +
      '<h3 class="wiz__q">' + u.rich(w.successTitle) + '</h3><p style="color:var(--muted);margin:0 auto;max-width:30rem">' + u.rich(w.successBody) + '</p>' +
      '<div class="actions"><a class="btn btn--gold" href="' + u.waHref(c.contact.whatsapp.number, text) + '" target="_blank" rel="noopener">' + I().chat + ' ' + u.esc(wcopy().sendWhatsapp) + '</a>' +
      (c.contact.phones || []).map(function (ph) { return '<a class="btn btn--ghost" href="' + u.telHref(ph) + '">' + I().phone + ' ' + u.esc(c.labels.call) + ' ' + u.esc(ph.number) + '</a>'; }).join('') +
      '<button type="button" class="linkbtn" data-restart>' + u.esc(wcopy().restart) + '</button></div>' +
      (this.mode === 'local' ? '<p class="wiz__note">' + u.esc(wcopy().localNote) + '</p>' : '') + '</div>';
    var self = this;
    this.root.querySelector('[data-restart]').addEventListener('click', function () {
      self.state = { events: [], date: '', flexible: false, guests: '', services: [], budget: '', name: '', phone: '', email: '', method: '', message: '', company: '', printing: null };
      self.done = false; self.step = 0; self.render();
    });
  };
  function fmtDate(ymd) {
    var p = ymd.split('-'); var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' });
  }
  T.fmtDate = fmtDate;

  T.wizards = function () {
    var inline = u.$('[data-wizard-inline]');
    T.inlineWizard = inline ? new Wizard(inline, { source: 'website-inline' }) : null;
    var modalRoot = u.$('#wizard-root');
    T.modalWizard = new Wizard(modalRoot, { source: 'website-modal' });
    u.$('#wizard-title').innerHTML = u.esc(C().wizard.title);
  };
  T.openWizard = function (prefill) {
    if (prefill || (T.modalWizard && T.modalWizard.done)) T.modalWizard.prefill(prefill || {});
    openDialog(u.$('#wizard'));
  };

  /* ---------------- estimator ---------------- */
  T.estimator = function () {
    var root = u.$('[data-estimator]');
    if (!root) return;
    var e = C().estimator, g = e.guests || {}, EC = e.copy || {};
    var state = { events: [], guests: g.default || 250 };
    root.innerHTML = '<div class="panel"><div class="est__block"><span class="field-label" id="est-ev">' + u.esc(EC.eventsLabel) + '</span><div class="chips" role="group" aria-labelledby="est-ev">' +
      (e.events || []).map(function (ev) { return '<button type="button" class="chip" aria-pressed="false" data-ev="' + u.esc(ev.id) + '">' + u.esc(ev.label) + '</button>'; }).join('') + '</div></div>' +
      '<div class="est__block"><div class="range-row"><label class="field-label" for="est-guests">' + u.esc(EC.guestsLabel) + '</label><output class="range-out" for="est-guests" id="est-out">' + state.guests + '</output></div>' +
      '<input class="range" type="range" id="est-guests" min="' + (g.min || 25) + '" max="' + (g.max || 1000) + '" step="' + (g.step || 25) + '" value="' + state.guests + '"></div></div>' +
      '<div class="panel est__result" aria-live="polite"></div>';
    var out = root.querySelector('.est__result');
    function calc() {
      var n = state.events.length, gu = state.guests;
      var levels = (e.levels || []).slice();
      var level = levels.filter(function (l) { return n <= l.maxEvents && gu <= l.maxGuests; })[0] || levels[levels.length - 1];
      if (!n) {
        out.innerHTML = '<span class="field-label">' + u.esc(EC.emptyEyebrow) + '</span><p class="est__level">' + u.rich(EC.emptyTitle) + '</p><p class="est__note">' + u.rich(EC.emptyBody) + '</p>';
        return;
      }
      var months = level.leadMonths || 6;
      var svc = (C().services.items || []).filter(function (s) { return s.id === level.service; })[0];
      var labels = state.events.map(function (id) { var x = (e.events || []).filter(function (v) { return v.id === id; })[0]; return x ? x.label : id; });
      var tl = (e.milestones || []).map(function (m) {
        var mo = Math.round(months * m.at * 10) / 10, when;
        if (m.at === 0) when = EC.dayLabel;
        else if (mo < 1) when = String(EC.weeksBefore).replace('{n}', Math.max(1, Math.round(mo * 4.3)));
        else when = String(EC.monthsBefore).replace('{n}', Math.round(mo));
        return '<li><b>' + u.esc(m.label) + '</b><span class="when">' + when + '</span><small>' + u.esc(m.body) + '</small></li>';
      }).join('');
      out.innerHTML = '<span class="field-label">' + u.esc(EC.resultEyebrow) + '</span><p class="est__level">' + u.rich(level.name) + '</p>' +
        '<p class="est__note">' + u.esc(level.note) + (svc && C().services.showPrices && svc.price ? ' <strong>' + u.esc(svc.price) + '</strong>' : '') + '</p>' +
        '<span class="field-label">' + u.esc(String(EC.timelineLabel).replace('{months}', months)) + '</span><ol class="timeline">' + tl + '</ol>' +
        '<button type="button" class="btn btn--gold magnetic" data-est-send>' + u.esc(e.cta) + ' ' + I().arrow + '</button><p class="est__disclaimer">' + u.esc(e.disclaimer) + '</p>';
      out.querySelector('[data-est-send]').addEventListener('click', function () {
        var map = { full: 'Full planning', partial: 'Partial planning', 'day-of': 'Day-of coordination' };
        var wt = C().wizard.eventTypes || [];
        T.openWizard({
          events: labels.map(function (l) { var m = wt.filter(function (w) { return w.toLowerCase() === l.toLowerCase(); })[0]; return m || 'Other celebration'; }).filter(function (v, i, a) { return a.indexOf(v) === i; }),
          guests: String(state.guests), services: map[level.id] ? [map[level.id]] : [],
          estimator: { events: labels, guests: state.guests, level: level.name }
        });
      });
    }
    root.addEventListener('click', function (ev) {
      var chip = ev.target.closest('[data-ev]'); if (!chip) return;
      var id = chip.dataset.ev, i = state.events.indexOf(id);
      if (i >= 0) state.events.splice(i, 1); else state.events.push(id);
      chip.setAttribute('aria-pressed', i < 0 ? 'true' : 'false');
      calc();
    });
    var range = root.querySelector('#est-guests'), o = root.querySelector('#est-out');
    range.addEventListener('input', function () { state.guests = +range.value; o.textContent = range.value + (+range.value >= (g.max || 1000) ? '+' : ''); calc(); });
    calc();
  };

  /* ---------------- date check calendar ---------------- */
  T.dateCheck = function () {
    var root = u.$('[data-datecheck]');
    if (!root) return;
    var L = C().dateCheck.labels, DC = C().dateCheck.copy || {};
    var now = new Date(); now.setHours(0, 0, 0, 0);
    var view = new Date(now.getFullYear(), now.getMonth(), 1);
    var marks = {}, selected = '';
    function load() {
      var from = new Date(view.getFullYear(), view.getMonth(), 1), to = new Date(view.getFullYear(), view.getMonth() + 1, 0);
      return DP.data.getAvailability(u.ymd(from), u.ymd(to)).then(function (rows) { rows.forEach(function (r) { marks[r.day] = r; }); });
    }
    function draw() {
      var y = view.getFullYear(), m = view.getMonth();
      var first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
      var title = view.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      var dows = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
      var dowFull = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      var html = '<div class="cal__head"><button type="button" class="cal__nav" data-m="-1" aria-label="Previous month"' + (y === now.getFullYear() && m === now.getMonth() ? ' disabled' : '') + '>' + I().left + '</button>' +
        '<span class="cal__month" aria-live="polite">' + u.esc(title) + '</span><button type="button" class="cal__nav" data-m="1" aria-label="Next month">' + I().right + '</button></div>' +
        '<div class="cal__grid" role="grid" aria-label="' + u.esc(title) + '">' + dows.map(function (d, i) { return '<span class="cal__dow" aria-hidden="true" title="' + dowFull[i] + '">' + d + '</span>'; }).join('');
      for (var i = 0; i < first; i++) html += '<span aria-hidden="true"></span>';
      for (var d = 1; d <= days; d++) {
        var dt = new Date(y, m, d), key = u.ymd(dt), mk = marks[key];
        var past = dt < now;
        html += '<button type="button" class="cal__day' + (mk ? ' is-' + mk.status : '') + '" data-day="' + key + '" aria-pressed="' + (selected === key) + '"' + (past ? ' disabled' : '') +
          ' aria-label="' + u.esc(dt.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) + (mk ? ', ' + mk.status : '')) + '">' + d + '</button>';
      }
      html += '</div><div class="cal__result" aria-live="polite">' + (selected ? result(selected) : '<span class="cal__dot"></span>' + u.esc(DC.prompt)) + '</div>' +
        '<div class="cal__legend"><span><i class="cal__dot cal__dot--open"></i>' + u.esc(DC.legendOpen) + '</span><span><i class="cal__dot cal__dot--limited"></i>' + u.esc(DC.legendLimited) + '</span><span><i class="cal__dot cal__dot--booked"></i>' + u.esc(DC.legendBooked) + '</span></div>';
      root.innerHTML = html;
    }
    function result(key) {
      var mk = marks[key], st = mk ? mk.status : 'unknown';
      return '<span class="cal__dot cal__dot--' + st + '"></span><span><strong>' + u.esc(T.fmtDate(key)) + '</strong><br>' + u.esc(L[st] || L.unknown) + (mk && mk.note ? ' — ' + u.esc(mk.note) : '') + '</span>' +
        (st !== 'booked' ? '<button type="button" class="btn btn--gold btn--sm" data-hold="' + key + '" style="margin-left:auto">' + u.esc(DC.ask) + '</button>' : '');
    }
    root.addEventListener('click', function (e) {
      var nav = e.target.closest('[data-m]');
      if (nav) { view = new Date(view.getFullYear(), view.getMonth() + (+nav.dataset.m), 1); draw(); load().then(draw); return; }
      var day = e.target.closest('[data-day]');
      if (day && !day.disabled) { selected = day.dataset.day; draw(); var b = root.querySelector('[data-day="' + selected + '"]'); if (b) b.focus(); return; }
      var hold = e.target.closest('[data-hold]');
      if (hold) {
        var w = T.inlineWizard;
        var key = hold.dataset.hold;
        if (w && !w.done) { w.state.date = key; w.state.flexible = false; w.go(w.state.events.length ? 1 : 0); u.$('[data-wizard-inline]').scrollIntoView({ behavior: u.reduced() ? 'auto' : 'smooth', block: 'start' }); }
        else T.openWizard({ date: key });
      }
    });
    draw(); load().then(draw);
  };

  /* ---------------- lightbox ---------------- */
  T.lightbox = function () {
    var d = u.$('#lightbox');
    var st = { items: [], i: 0, title: '' };
    function show(i) {
      st.i = (i + st.items.length) % st.items.length;
      var m = DP.media.resolve(st.items[st.i]);
      var img = d.querySelector('.lb__img');
      img.classList.remove('is-in'); void img.offsetWidth;
      img.src = m.src; img.alt = m.alt || st.title + ' — photo ' + (st.i + 1);
      img.classList.add('is-in');
      d.querySelector('.lb__count').textContent = (st.i + 1) + ' / ' + st.items.length;
      d.querySelector('.lb__credit').innerHTML = u.credit(st.items[st.i], st.credit);
      u.$$('.lb__thumbs button', d).forEach(function (b, k) { b.setAttribute('aria-current', k === st.i ? 'true' : 'false'); if (k === st.i) b.scrollIntoView({ block: 'nearest', inline: 'center' }); });
      // preload neighbour
      var n = DP.media.resolve(st.items[(st.i + 1) % st.items.length]); if (n) { var p = new Image(); p.src = n.src; }
    }
    T.openGallery = function (storyIndex) {
      var story = C().weddings.stories[storyIndex]; if (!story) return;
      st.items = (story.gallery && story.gallery.length) ? story.gallery : [story.cover];
      st.title = story.couple;
      st.credit = story.credits && story.credits[0] ? story.credits[0].role + ' @' + String(story.credits[0].handle).replace(/^@/, '') : '';
      d.querySelector('.lb__title').textContent = story.couple;
      d.setAttribute('aria-label', story.couple + ' gallery');
      var th = d.querySelector('.lb__thumbs');
      th.innerHTML = '';
      st.items.forEach(function (id, k) {
        var b = u.h('button', { type: 'button', 'aria-label': 'Photo ' + (k + 1) });
        b.appendChild(u.media(id, { still: true, thumb: true, alt: '' }));
        b.addEventListener('click', function () { show(k); });
        th.appendChild(b);
      });
      d.querySelector('.lb__prev').hidden = d.querySelector('.lb__next').hidden = st.items.length < 2;
      openDialog(d);
      show(0);
    };
    d.querySelector('.lb__prev').addEventListener('click', function () { show(st.i - 1); });
    d.querySelector('.lb__next').addEventListener('click', function () { show(st.i + 1); });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') show(st.i - 1);
      if (e.key === 'ArrowRight') show(st.i + 1);
    });
    var sx = null;
    d.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    d.addEventListener('touchend', function (e) { if (sx == null) return; var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) show(st.i + (dx < 0 ? 1 : -1)); sx = null; });
  };

  /* ---------------- film ---------------- */
  var film = { i: 0, list: [], vids: [], raf: 0 };
  T.openFilm = function () {
    var d = u.$('#film'), c = C().hero;
    film.list = (c.film || [c.video]).filter(Boolean);
    var stage = d.querySelector('.film__stage');
    stage.innerHTML = '';
    film.vids = film.list.map(function (id) {
      var m = DP.media.resolve(id);
      var v = u.h('video', { muted: true, playsinline: true, preload: 'auto', poster: m.poster || '' });
      v.muted = true;
      if (m.webm) v.appendChild(u.h('source', { src: m.webm, type: 'video/webm' }));
      v.appendChild(u.h('source', { src: m.src, type: 'video/mp4' }));
      v.addEventListener('ended', function () { next(1); });
      v.addEventListener('error', function () { next(1); }, true);
      stage.appendChild(v);
      return v;
    });
    d.querySelector('.film__progress').innerHTML = film.list.map(function () { return '<i><b></b></i>'; }).join('');
    d.querySelector('.film__caption').innerHTML = u.esc(c.filmCaption || '') + ' <a href="' + u.esc(C().contact.instagram.url) + '" target="_blank" rel="noopener" style="color:var(--gold)">@' + u.esc(C().contact.instagram.handle) + '</a>';
    d.querySelector('.film__next').textContent = C().labels.nextClip || 'Next clip';
    openDialog(d);
    film.i = 0; play();
    cancelAnimationFrame(film.raf);
    (function tick() {
      var v = film.vids[film.i], bars = u.$$('.film__progress b', d);
      bars.forEach(function (b, k) { b.style.transform = 'scaleX(' + (k < film.i ? 1 : k > film.i ? 0 : (v && v.duration ? v.currentTime / v.duration : 0)) + ')'; });
      film.raf = requestAnimationFrame(tick);
    })();
  };
  function play() {
    var d = u.$('#film');
    film.vids.forEach(function (v, k) { v.classList.toggle('is-on', k === film.i); if (k !== film.i) v.pause(); });
    var v = film.vids[film.i]; if (!v) return;
    v.currentTime = 0; var p = v.play(); if (p && p.catch) p.catch(function () {});
    d.querySelector('.film__credit').innerHTML = u.credit(film.list[film.i]);
  }
  function next(dir) { if (!film.vids.length) return; film.i = (film.i + dir + film.vids.length) % film.vids.length; play(); }
  T.filmNext = next;
  T.stopFilm = function () { cancelAnimationFrame(film.raf); film.vids.forEach(function (v) { v.pause(); v.removeAttribute('src'); }); u.$('#film .film__stage').innerHTML = ''; film.vids = []; };

  /* ---------------- announcement ---------------- */
  T.announcement = function () {
    var a = C().announcement || {}, box = u.$('#announce');
    clearTimeout(T._annT);
    box.classList.remove('is-open');
    if (!a.enabled || !a.title) return;
    var now = Date.now();
    if (a.start && Date.parse(a.start) > now) return;
    if (a.end && Date.parse(a.end) < now) return;
    var key = 'dp:ann:' + (a.id || a.title);
    if (u.store(key) === 'dismissed' && !/preview=/.test(location.search)) return;
    box.innerHTML = '<button type="button" class="modal__close" aria-label="' + u.esc(C().labels.close) + '">' + I().close + '</button><p class="eyebrow">' + u.esc(C().labels.news) + '</p><h2 id="announce-title">' + u.rich(a.title) + '</h2><p>' + u.rich(a.body) + '</p>' +
      (a.cta && a.cta.label ? '<a class="btn btn--gold btn--sm" href="' + u.esc(a.cta.href || '#begin') + '">' + u.esc(a.cta.label) + '</a>' : '');
    function dismiss() { box.classList.remove('is-open'); u.store(key, 'dismissed'); }
    box.querySelector('.modal__close').addEventListener('click', dismiss);
    var cta = box.querySelector('.btn'); if (cta) cta.addEventListener('click', dismiss);
    box.addEventListener('keydown', function (e) { if (e.key === 'Escape') dismiss(); });
    T._annT = setTimeout(function () { if (!u.$$('dialog[open]').length) box.classList.add('is-open'); }, Math.max(0, +a.delaySeconds || 6) * 1000);
  };

  /* ---------------- reviews ---------------- */
  T.reviews = function () {
    var s = u.$('#reviews'); if (!s) return;
    DP.data.getReviews().then(function (rows) {
      rows = (rows || []).filter(function (r) { return r && r.body; });
      if (!rows.length) { s.hidden = true; return; }
      s.querySelector('[data-reviews]').innerHTML = rows.map(function (r) {
        var n = Math.max(0, Math.min(5, parseInt(r.rating, 10) || 0));
        return '<figure class="review">' + (n ? '<div class="stars" aria-label="' + n + ' out of 5">' + '★★★★★'.slice(0, n) + '</div>' : '') +
          '<blockquote>“' + u.esc(r.body) + '”</blockquote><figcaption>' + u.esc(r.author || '') + (r.event ? ' · ' + u.esc(r.event) : '') + '</figcaption></figure>';
      }).join('');
      s.hidden = false;
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    });
  };

  /* ---------------- global actions ---------------- */
  T.actions = function () {
    if (T._actionsBound) return;
    T._actionsBound = true;
    document.addEventListener('click', function (e) {
      var a = e.target.closest('[data-action]');
      if (a) {
        var act = a.dataset.action;
        if (act === 'wizard') { e.preventDefault(); T.openWizard(); }
        if (act === 'film') { e.preventDefault(); T.openFilm(); }
        if (act === 'top') { e.preventDefault(); T.toTop(); }
        return;
      }
      var g = e.target.closest('[data-gallery]');
      if (g) { e.preventDefault(); T.openGallery(+g.dataset.gallery); return; }
      var link = e.target.closest('a[href^="#"]');
      if (link && link.getAttribute('href').length > 1) {
        var target = document.getElementById(link.getAttribute('href').slice(1));
        if (target) {
          e.preventDefault();
          if (DP.lenis) DP.lenis.scrollTo(target, { offset: -60, duration: 1.6, onComplete: T.settle });
          else { target.scrollIntoView({ behavior: u.reduced() ? 'auto' : 'smooth' }); setTimeout(T.settle, u.reduced() ? 50 : 1200); }
          if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
          setTimeout(function () { target.focus({ preventScroll: true }); }, u.reduced() ? 0 : 900);
        }
      }
    });
    document.addEventListener('keydown', function (e) {
      if (!u.$('#film').open) return;
      if (e.key === 'ArrowRight') next(1);
      if (e.key === 'ArrowLeft') next(-1);
    });
    u.$('#film .film__next').addEventListener('click', function () { next(1); });
  };

  /* services accordion + hover preview */
  T.services = function () {
    var list = u.$('.svc-list'); if (!list) return;
    var prev = u.$('.svc-preview');
    list.addEventListener('click', function (e) {
      var b = e.target.closest('.svc__head'); if (!b) return;
      var item = b.closest('.svc'), open = !item.classList.contains('is-open');
      u.$$('.svc', list).forEach(function (s) {
        var on = s === item && open;
        s.classList.toggle('is-open', on);
        s.querySelector('.svc__head').setAttribute('aria-expanded', on ? 'true' : 'false');
        s.querySelector('.svc__panel').toggleAttribute('inert', !on);
      });
      setTimeout(function () { if (window.ScrollTrigger) window.ScrollTrigger.refresh(); }, 650);
    });
    if (!prev || !u.finePointer() || u.reduced() || !window.gsap) return;
    var gsap = window.gsap;
    gsap.set(prev, { xPercent: -50, yPercent: -50, scale: 0.8 });
    var xTo = gsap.quickTo(prev, 'x', { duration: 0.6, ease: 'power3' }), yTo = gsap.quickTo(prev, 'y', { duration: 0.6, ease: 'power3' });
    /* The preview is position:fixed. Scrolling (wheel, back-to-top, nav links) moves the list away from a pointer
       that does not move, and browsers fire no pointerleave for that — so the preview used to stay "frozen" over
       other chapters (e.g. the pergola photo over "The celebrations"). Every scroll now re-checks what is under
       the pointer, and the preview also hides when the list leaves the screen, the tab is hidden or a jump starts. */
    var px = -1, py = -1, shown = false;
    function hide(fast) {
      if (!shown) return;
      shown = false;
      gsap.to(prev, { opacity: 0, scale: 0.8, rotate: 0, duration: fast ? 0.15 : 0.35, overwrite: 'auto' });
    }
    function rowAt(x, y) {
      if (x < 0) return null;
      var el = document.elementFromPoint(x, y), row = el && el.closest ? el.closest('.svc') : null;
      return row && list.contains(row) && !row.classList.contains('is-open') ? row : null;
    }
    list.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      px = e.clientX; py = e.clientY;
      var row = e.target.closest('.svc');
      xTo(e.clientX + 40); yTo(e.clientY);
      if (!row || row.classList.contains('is-open')) { hide(); return; }
      var key = row.dataset.media;
      u.$$('img', prev).forEach(function (im) { im.classList.toggle('is-on', im.dataset.key === key); });
      shown = true;
      gsap.to(prev, { opacity: 1, scale: 1, rotate: (e.movementX || 0) * 0.4, duration: 0.5, ease: 'power3', overwrite: 'auto' });
    });
    list.addEventListener('pointerleave', function () { px = -1; hide(); });
    if (T._svcOff) T._svcOff();
    var onScroll = function () { if (shown && !rowAt(px, py)) hide(true); };
    var onAway = function () { hide(true); };
    var onJump = function (e) { if (e.target.closest && e.target.closest('[data-action], a[href^="#"]')) hide(true); };
    window.addEventListener('scroll', onScroll, { passive: true });
    var lenisOff = DP.lenis && DP.lenis.on ? DP.lenis.on('scroll', onScroll) : null;
    window.addEventListener('blur', onAway);
    document.addEventListener('visibilitychange', onAway);
    document.addEventListener('click', onJump, true);
    var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) { if (!es[0].isIntersecting) hide(true); }) : null;
    if (io) io.observe(list);
    T._svcOff = function () {
      window.removeEventListener('scroll', onScroll); window.removeEventListener('blur', onAway);
      if (typeof lenisOff === 'function') lenisOff();
      document.removeEventListener('visibilitychange', onAway); document.removeEventListener('click', onJump, true);
      if (io) io.disconnect();
    };
  };
})();
