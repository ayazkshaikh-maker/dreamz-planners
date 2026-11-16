/* Dreamz Planners — visual effects: gold dust canvas, cursor, magnetic CTAs, tilt cards,
   image trail, velocity-skew vendor marquee. All pause off-screen and skip under reduced motion. */
(function () {
  'use strict';
  var DP = (window.DP = window.DP || {});
  var u = DP.u;
  var FX = (DP.fx = {});

  /* ---------- gold dust (one canvas, fixed, only runs while hero/promise/begin are visible) ---------- */
  FX.dust = function () {
    var cv = u.$('#dust');
    if (!cv || FX._dustOn) return;
    if (u.reduced() || !(DP.content.theme.effects || {}).particles) { cv.hidden = true; return; }
    FX._dustOn = true;
    var ctx = cv.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var W = 0, H = 0, parts = [], running = false, raf = 0, mx = -999, my = -999;
    var N = u.isMobile() ? 46 : 110;
    function resize() {
      W = window.innerWidth; H = window.innerHeight;
      cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function spawn(p, initial) {
      p.x = Math.random() * W; p.y = initial ? Math.random() * H : H + 10;
      p.r = Math.random() * 1.7 + 0.35; p.vy = -(Math.random() * 0.35 + 0.08); p.vx = (Math.random() - 0.5) * 0.15;
      p.a = Math.random() * 0.6 + 0.25; p.t = Math.random() * Math.PI * 2; p.tw = Math.random() * 0.03 + 0.008;
      p.hue = Math.random() < 0.12 ? 1 : 0;
      return p;
    }
    resize();
    for (var i = 0; i < N; i++) parts.push(spawn({}, true));
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('pointermove', function (e) { mx = e.clientX; my = e.clientY; }, { passive: true });
    function frame() {
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.t += p.tw; p.x += p.vx + Math.sin(p.t) * 0.18; p.y += p.vy;
        var dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy;
        if (d2 < 14400) { var f = (1 - d2 / 14400) * 1.6; p.x += dx / 60 * f; p.y += dy / 60 * f; }
        if (p.y < -10 || p.x < -20 || p.x > W + 20) spawn(p, false);
        var alpha = p.a * (0.55 + 0.45 * Math.sin(p.t * 2));
        var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        g.addColorStop(0, p.hue ? 'rgba(255,170,200,' + alpha + ')' : 'rgba(246,227,176,' + alpha + ')');
        g.addColorStop(0.35, p.hue ? 'rgba(194,24,91,' + alpha * 0.4 + ')' : 'rgba(212,168,83,' + alpha * 0.45 + ')');
        g.addColorStop(1, 'rgba(212,168,83,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, 6.2832); ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    }
    function set(on) {
      if (on === running) return;
      running = on;
      cv.classList.toggle('is-on', on);
      if (on) raf = requestAnimationFrame(frame); else cancelAnimationFrame(raf);
    }
    var visible = {};
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { visible[e.target.id] = e.isIntersecting; });
      set(Object.keys(visible).some(function (k) { return visible[k]; }) && !document.hidden);
    }, { threshold: 0.05 });
    ['hero', 'promise', 'begin'].forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) set(false); });
    FX._dustIO = io;
  };
  FX.dustObserve = function () {
    if (!FX._dustIO) return;
    ['hero', 'promise', 'begin'].forEach(function (id) { var el = document.getElementById(id); if (el) FX._dustIO.observe(el); });
  };

  /* ---------- custom cursor (desktop fine pointer only) ---------- */
  FX.cursor = function () {
    var c = u.$('#cursor');
    if (!c || FX._cursorOn || !u.finePointer() || u.reduced() || !(DP.content.theme.effects || {}).cursor) return;
    FX._cursorOn = true;
    document.documentElement.classList.add('has-cursor');
    var dot = c.querySelector('.cursor__dot'), ring = c.querySelector('.cursor__ring'), label = c.querySelector('.cursor__label');
    var x = -100, y = -100, rx = -100, ry = -100;
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX; y = e.clientY;
      dot.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
      var t = e.target;
      var view = t.closest && t.closest('[data-cursor]');
      var link = t.closest && t.closest('a,button,[role=button],summary,label,input,select,textarea');
      c.classList.toggle('is-view', !!view);
      c.classList.toggle('is-link', !view && !!link);
      label.textContent = view ? view.getAttribute('data-cursor') : '';
      c.classList.remove('is-hidden');
    }, { passive: true });
    document.addEventListener('pointerleave', function () { c.classList.add('is-hidden'); });
    (function loop() {
      rx += (x - rx) * 0.18; ry += (y - ry) * 0.18;
      ring.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)';
      requestAnimationFrame(loop);
    })();
  };

  /* ---------- magnetic buttons ---------- */
  FX.magnetic = function (root) {
    if (!u.finePointer() || u.reduced() || !window.gsap) return;
    u.$$('.magnetic', root).forEach(function (el) {
      if (el.dataset.mag) return;
      el.dataset.mag = '1';
      var xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1,0.4)' });
      var yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1,0.4)' });
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.35); yTo((e.clientY - r.top - r.height / 2) * 0.45);
      });
      el.addEventListener('pointerleave', function () { xTo(0); yTo(0); });
    });
  };

  /* ---------- tilt cards ---------- */
  FX.tilt = function (root) {
    if (!u.finePointer() || u.reduced()) return;
    u.$$('.tilt', root).forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        el.style.transform = 'perspective(900px) rotateX(' + ((0.5 - py) * 8).toFixed(2) + 'deg) rotateY(' + ((px - 0.5) * 10).toFixed(2) + 'deg)';
        el.style.setProperty('--mx', (px * 100).toFixed(1) + '%'); el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  };

  /* ---------- image trail (reactbits ImageTrail idea) ---------- */
  FX.trail = function () {
    var zone = u.$('[data-trail]');
    if (!zone || !window.gsap) return;
    var pool = []; try { pool = JSON.parse(zone.dataset.pool || '[]'); } catch (e) {}
    if (!pool.length) return;
    var imgs = pool.slice(0, 14).map(function (id) {
      var m = DP.media.resolve(id);
      var im = u.h('img', { class: 'trail__img', src: m.thumb || m.src, alt: '', loading: 'lazy', decoding: 'async' });
      zone.appendChild(im); return im;
    });
    var k = 0, lx = 0, ly = 0, z = 1;
    function drop(x, y, dir) {
      var im = imgs[k++ % imgs.length];
      var w = im.offsetWidth || 180, h = im.offsetHeight || 225;
      gsap.killTweensOf(im);
      gsap.set(im, { x: x - w / 2, y: y - h / 2, opacity: 1, scale: 0.6, rotate: (Math.random() - 0.5) * 18, zIndex: ++z });
      gsap.to(im, { scale: 1, duration: 0.5, ease: 'power3.out', x: x - w / 2 + (dir ? dir.x * 40 : 0), y: y - h / 2 + (dir ? dir.y * 40 : 0) });
      gsap.to(im, { opacity: 0, scale: 0.85, y: '+=60', duration: 0.9, delay: 0.55, ease: 'power2.in' });
    }
    if (u.reduced()) return;
    if (u.finePointer()) {
      zone.addEventListener('pointermove', function (e) {
        var r = zone.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
        var dx = x - lx, dy = y - ly, d = Math.hypot(dx, dy);
        if (d > 90) { drop(x, y, { x: dx / d, y: dy / d }); lx = x; ly = y; }
      });
    } else {
      // touch: a gentle automatic drift while the strip is on screen
      var timer = null;
      new IntersectionObserver(function (es) {
        if (es[0].isIntersecting && !timer) timer = setInterval(function () {
          var r = zone.getBoundingClientRect(); drop(Math.random() * r.width, r.height * (0.25 + Math.random() * 0.5));
        }, 650);
        else if (!es[0].isIntersecting && timer) { clearInterval(timer); timer = null; }
      }).observe(zone);
    }
  };

  /* ---------- vendor marquee with velocity skew ---------- */
  FX.marquee = function () {
    var rows = u.$$('.marquee');
    if (FX._mqTick && window.gsap) { gsap.ticker.remove(FX._mqTick); FX._mqTick = null; }
    if (!rows.length) return;
    if (u.reduced() || !window.gsap) return;
    var states = rows.map(function (m) {
      var track = m.querySelector('.marquee__track');
      var w = track.scrollWidth;
      var reps = Math.max(2, Math.ceil((window.innerWidth * 2) / Math.max(1, w)) + 1);
      var html = track.innerHTML;
      for (var i = 1; i < reps; i++) track.insertAdjacentHTML('beforeend', html);
      u.$$('.marquee__item', track).forEach(function (a, i) { if (i >= track.children.length / reps) { a.setAttribute('tabindex', '-1'); a.setAttribute('aria-hidden', 'true'); } });
      return { el: track, dir: +m.dataset.dir || -1, x: 0, unit: w, on: false };
    });
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { var s = states[rows.indexOf(e.target)]; if (s) s.on = e.isIntersecting; }); });
    rows.forEach(function (r) { io.observe(r); });
    var skew = 0, hover = 1;
    rows.forEach(function (r) { r.addEventListener('pointerenter', function () { hover = 0.25; }); r.addEventListener('pointerleave', function () { hover = 1; }); });
    if (FX._mqTick) gsap.ticker.remove(FX._mqTick);
    gsap.ticker.add(FX._mqTick = function (t, dt) {
      var v = DP.lenis ? DP.lenis.velocity : 0;
      var targetSkew = Math.max(-12, Math.min(12, v * 0.35));
      skew += (targetSkew - skew) * 0.12;
      var boost = 1 + Math.min(6, Math.abs(v) * 0.12);
      states.forEach(function (s) {
        if (!s.on) return;
        s.x += s.dir * 0.05 * dt * boost * hover * (v < 0 ? -1 : 1);
        if (s.x <= -s.unit) s.x += s.unit;
        if (s.x > 0) s.x -= s.unit;
        s.el.style.transform = 'translate3d(' + s.x.toFixed(2) + 'px,0,0) skewX(' + (-skew).toFixed(2) + 'deg)';
      });
    });
  };
})();
