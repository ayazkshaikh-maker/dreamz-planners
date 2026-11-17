/* Dreamz Planners — GSAP + ScrollTrigger + Lenis scenes ("The Night Unfolds").
   motion.init() is idempotent: motion.kill() reverts every scene so the Studio preview can re-render. */
(function () {
  'use strict';
  var DP = (window.DP = window.DP || {});
  var u = DP.u;
  var M = (DP.motion = {});
  var mm = null;

  M.enabled = function () { return !!(window.gsap && window.ScrollTrigger) && !u.reduced(); };

  /* ---------- smooth scroll ---------- */
  M.lenis = function () {
    if (DP.lenis || !M.enabled() || !window.Lenis) return;
    if ((DP.content.theme.effects || {}).smoothScroll === false) return;
    try {
      var lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 1, touchMultiplier: 1.4 });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
      DP.lenis = lenis;
    } catch (e) { console.warn('[dp] lenis unavailable', e); }
  };

  /* ---------- preloader ---------- */
  M.preloader = function (ready) {
    var pre = u.$('#preloader');
    if (!pre) return Promise.resolve();
    if (!M.enabled()) { pre.remove(); return Promise.resolve(); }
    var count = pre.querySelector('.preloader__count'), bar = pre.querySelector('.preloader__line i'), mark = pre.querySelector('.preloader__mark');
    var prog = { v: 0 };
    var lightMode = document.documentElement.getAttribute('data-mode') === 'light';
    var markUrl = lightMode ? 'assets/brand/logo-mark-dark.svg' : 'assets/brand/logo-mark.svg';
    var drawn = fetch(markUrl).then(function (r) { if (!r.ok) throw 0; return r.text(); }).then(function (txt) {
      mark.innerHTML = txt.replace(/<\?xml[^>]*>/, '');
      var svg = mark.querySelector('svg'); if (!svg) return;
      svg.removeAttribute('width'); svg.removeAttribute('height'); svg.setAttribute('aria-hidden', 'true');
      var paths = u.$$('path', svg);
      paths.forEach(function (p) {
        var L = 400; try { L = p.getTotalLength(); } catch (e) {}
        p.style.strokeDasharray = L; p.style.strokeDashoffset = L;
      });
      gsap.to(paths, { strokeDashoffset: 0, duration: 1.5, ease: 'power2.inOut', stagger: 0.02 });
      gsap.to(paths, { fillOpacity: 1, strokeOpacity: 0, duration: 0.8, delay: 1.1, ease: 'power2.out' });
      var m3d = new Image();
      m3d.className = 'preloader__3d'; m3d.alt = ''; m3d.src = 'assets/brand/logo-mark-3d.webp';
      m3d.onload = function () { mark.appendChild(m3d); gsap.fromTo(m3d, { opacity: 0, scale: 0.92, filter: 'blur(6px)' }, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.9, delay: 0.25, ease: 'power3.out' }); gsap.to(svg, { opacity: 0, duration: 0.6, delay: 0.5 }); };
    }).catch(function () {
      mark.innerHTML = '<span class="display gold-text" style="font-size:5rem">DP</span>';
    });
    function paint() { count.textContent = String(Math.round(prog.v)).padStart(3, '0'); bar.style.transform = 'scaleX(' + prog.v / 100 + ')'; }
    var pre1 = gsap.to(prog, { v: 82, duration: 1.4, ease: 'power2.out', onUpdate: paint });
    var cap = new Promise(function (r) { setTimeout(r, 4500); });
    return Promise.race([Promise.all([ready, new Promise(function (r) { setTimeout(r, 1500); })]), cap]).then(function () {
      return new Promise(function (resolve) {
        pre1.kill();
        var tl = gsap.timeline({ onComplete: function () { pre.remove(); } });
        tl.to(prog, { v: 100, duration: 0.45, ease: 'power2.inOut', onUpdate: paint })
          .to(pre.querySelector('.preloader__inner'), { scale: 0.9, opacity: 0, duration: 0.55, ease: 'power3.in' }, '+=0.1')
          .add(function () { pre.classList.add('is-done'); resolve(); })
          .to(pre.querySelector('.preloader__panel--top'), { yPercent: -100, duration: 1.15, ease: 'expo.inOut' }, '<0.1')
          .to(pre.querySelector('.preloader__panel--bottom'), { yPercent: 100, duration: 1.15, ease: 'expo.inOut' }, '<');
      });
    });
  };

  /* ---------- helpers ---------- */
  function cardShift(media) {
    if (!media || !media.style) return 0;
    var fy = parseFloat((media.style.objectPosition || '50% 50%').split(/\s+/)[1]);
    if (!isFinite(fy)) fy = 50;
    return Math.max(0, Math.min(20, (66 - fy) * 0.55));
  }
  function wrapWords(el) {
    if (el.dataset.wrapped) return u.$$('.rw__i', el);
    el.dataset.wrapped = '1';
    var nodes = [].slice.call(el.childNodes);
    nodes.forEach(function (n) {
      if (n.nodeType === 3) {
        var frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(function (w) {
          if (!w) return;
          if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(' ')); return; }
          var o = document.createElement('span'); o.className = 'rw';
          var i = document.createElement('span'); i.className = 'rw__i'; i.textContent = w;
          o.appendChild(i); frag.appendChild(o);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) {
        var o2 = document.createElement('span'); o2.className = 'rw';
        var i2 = document.createElement('span'); i2.className = 'rw__i';
        n.replaceWith(o2); i2.appendChild(n); o2.appendChild(i2);
      }
    });
    return u.$$('.rw__i', el);
  }

  M.heroIntro = function () {
    if (!M.enabled()) return;
    var hero = u.$('#hero'); if (!hero) return;
    var tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
    tl.from(u.$$('.hero__media .media', hero), { scale: 1.25, duration: 2.4, ease: 'power3.out' }, 0)
      .from(u.$$('.hero__title .char', hero), { yPercent: 115, rotate: 7, opacity: 0, duration: 1.3, stagger: 0.022 }, 0.15)
      .from(u.$$('.hero__eyebrow, .hero__sub, .hero__ctas > *, .hero__meta, .scroll-cue', hero), { opacity: 0, y: 26, filter: 'blur(10px)', duration: 1.1, stagger: 0.08, clearProps: 'filter' }, 0.6)
      .from('#topbar', { opacity: 0, duration: 1.2, ease: 'power2.out', clearProps: 'opacity' }, 0.5)
      .from('#dock', { opacity: 0, duration: 1, clearProps: 'opacity' }, 1.0);
  };

  /* ---------- scenes ---------- */
  M.init = function () {
    M.kill();
    var html = document.documentElement;
    if (!M.enabled()) { html.classList.add('is-static'); return; }
    html.classList.remove('is-static');
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
    mm = gsap.matchMedia();

    mm.add({ desk: '(min-width: 768px)', mob: '(max-width: 767px)' }, function (ctx) {
      var desk = ctx.conditions.desk;

      /* chapter 1: hero leaves — content lifts, film sinks and rounds into a card */
      var hero = u.$('#hero');
      if (hero) {
        gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } })
          .to(hero.querySelector('.hero__content'), { yPercent: -35, opacity: 0, ease: 'none' }, 0)
          .to(hero.querySelector('.hero__media'), { yPercent: 18, scale: 0.94, borderRadius: 32, ease: 'none' }, 0)
          .to(hero.querySelector('.hero__meta'), { opacity: 0, ease: 'none' }, 0);
      }

      /* chapter 2: the promise fills in word by word */
      var promise = u.$('#promise');
      if (promise) {
        var words = u.$$('.promise__text .w', promise);
        gsap.timeline({ scrollTrigger: desk
          ? { trigger: promise, start: 'top top', end: '+=140%', scrub: 0.6, pin: true, anticipatePin: 1 }
          : { trigger: promise, start: 'top 70%', end: 'bottom 70%', scrub: 0.6 } })
          .to(words, { opacity: 1, stagger: 0.12, ease: 'none', duration: 0.6 })
          .from(promise.querySelector('.promise__aside'), { opacity: 0, y: 20, filter: 'blur(8px)', duration: 0.8 }, '-=0.2')
          .from(promise.querySelector('.promise__ornament'), { scaleX: 0, opacity: 0, duration: 1 }, 0);
      }

      /* chapter 3: behind the curtain — the card grows to full bleed */
      var behind = u.$('#behind');
      if (behind) {
        var stage = behind.querySelector('.behind__stage'), frame = behind.querySelector('.behind__frame');
        if (desk) {
          gsap.timeline({ scrollTrigger: { trigger: stage, start: 'top top', end: '+=230%', scrub: 0.8, pin: true, anticipatePin: 1 } })
            .fromTo(frame, { clipPath: 'inset(39% 37% 7% 37% round 26px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'power2.inOut', duration: 1 }, 0)
            // while it is still a small card (lower part of the screen), slide the film down so its focal point (faces) sits in the card
            .fromTo(frame.querySelector('.media'), { yPercent: cardShift(frame.querySelector('.media')) }, { yPercent: 0, ease: 'power2.inOut', duration: 1 }, 0)
            .to(behind.querySelector('.behind__title'), { opacity: 0, scale: 0.9, filter: 'blur(8px)', duration: 0.55 }, 0.05)
            .to(behind.querySelector('.behind__side--a'), { yPercent: -160, xPercent: -60, rotate: -14, opacity: 0, duration: 0.8 }, 0)
            .to(behind.querySelector('.behind__side--b'), { yPercent: 160, xPercent: 60, rotate: 14, opacity: 0, duration: 0.8 }, 0)
            .to(frame, { '--shade': 1, duration: 0.4 }, 0.85)
            .fromTo(behind.querySelector('.behind__quote'), { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.5 }, 1.0)
            .to({}, { duration: 0.35 });
        } else {
          gsap.fromTo(frame, { clipPath: 'inset(8% 10% 8% 10% round 22px)' }, { clipPath: 'inset(0% 0% 0% 0% round 22px)', ease: 'none', scrollTrigger: { trigger: frame, start: 'top 90%', end: 'top 25%', scrub: true } });
        }
      }

      /* chapter 4: celebrations — horizontal pinned reel (desktop only) */
      var reel = u.$('#celebrations .reel');
      if (reel && desk) {
        var track = reel.querySelector('.reel__track');
        var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
        var tween = gsap.to(track, { x: function () { return -dist(); }, ease: 'none',
          scrollTrigger: { trigger: reel, start: 'top top', end: function () { return '+=' + dist(); }, scrub: 0.8, pin: true, anticipatePin: 1, invalidateOnRefresh: true,
            onUpdate: function (st) { var b = reel.querySelector('.reel__progress i'); if (b) b.style.transform = 'scaleX(' + st.progress.toFixed(4) + ')'; } } });
        u.$$('.reel__card', track).forEach(function (card) {
          var name = card.querySelector('.reel__name'), media = card.querySelector('.media');
          var st = { trigger: card, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true };
          if (name) gsap.fromTo(name, { xPercent: 22 }, { xPercent: -18, ease: 'none', scrollTrigger: st });
          if (media) gsap.fromTo(media, { xPercent: -6 }, { xPercent: 6, ease: 'none', scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
        });
      } else if (reel) {
        u.$$('.reel__card', reel).forEach(function (card) {
          gsap.from(card, { y: 60, opacity: 0, scale: 0.96, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: card, start: 'top 88%' } });
        });
      }

      /* chapter 5: stacked decks fan out */
      u.$$('.deck').forEach(function (deck) {
        var cards = u.$$('.deck__card', deck), n = cards.length;
        if (n < 2) {
          gsap.from(deck, { y: 40, opacity: 0, rotate: -3, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: deck, start: 'top 85%' } });
          return;
        }
        cards.forEach(function (c, i) {
          var depth = n - 1 - i; // 0 = top card
          var k = desk ? 1 : 0.45;
          gsap.fromTo(c, { rotate: 0, xPercent: 0, yPercent: 0, scale: 1 },
            { rotate: depth ? (depth % 2 ? -1 : 1) * (4 + depth * 3.5) * k : -1.5, xPercent: depth ? (depth % 2 ? -1 : 1) * (6 + depth * 5) * k : 0, yPercent: depth * -1.5, scale: 1 - depth * 0.035, ease: 'none',
              scrollTrigger: { trigger: deck, start: 'top 90%', end: 'center 45%', scrub: 0.8 } });
        });
      });

      /* founders photo parallax */
      var fp = u.$('.founders__photo .media');
      if (fp) gsap.fromTo(fp, { yPercent: -8 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.founders__photo', start: 'top bottom', end: 'bottom top', scrub: true } });

      /* chapter 7: the gold line draws itself, steps light up */
      var pw = u.$('.process__wrap');
      if (pw) {
        gsap.to(pw.querySelector('.process__fill'), { scaleY: 1, ease: 'none', scrollTrigger: { trigger: pw, start: 'top 62%', end: 'bottom 62%', scrub: 0.5 } });
        u.$$('.step', pw).forEach(function (st) {
          ScrollTrigger.create({ trigger: st, start: 'top 64%', toggleClass: { targets: st, className: 'is-lit' } });
          gsap.from(st.querySelector('.step__text'), { opacity: 0, x: desk ? (u.$$('.step', pw).indexOf(st) % 2 ? 60 : -60) : 40, filter: 'blur(8px)', duration: 1, ease: 'power3.out', scrollTrigger: { trigger: st, start: 'top 80%' } });
        });
      }

      /* begin background drift */
      var bb = u.$('.begin__bg .media');
      if (bb) gsap.fromTo(bb, { scale: 1.15 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '#begin', start: 'top bottom', end: 'bottom bottom', scrub: true } });

      /* generic reveals: headings word-by-word, blur-in leads, staggered blocks */
      u.$$('.reveal-split').forEach(function (h) {
        var inner = wrapWords(h);
        gsap.from(inner, { yPercent: 115, rotate: 5, duration: 1.2, ease: 'power4.out', stagger: 0.07, scrollTrigger: { trigger: h, start: 'top 88%' } });
      });
      u.$$('.reveal-blur, .section__head .eyebrow').forEach(function (el) {
        gsap.from(el, { opacity: 0, y: 26, filter: 'blur(12px)', duration: 1.2, ease: 'power3.out', clearProps: 'filter', scrollTrigger: { trigger: el, start: 'top 90%' } });
      });
      ScrollTrigger.batch('.svc, .faq details, .fcard, .panel, .story__text, .review', {
        start: 'top 90%', once: true,
        onEnter: function (els) { gsap.from(els, { opacity: 0, y: 40, duration: 1, ease: 'power3.out', stagger: 0.08, overwrite: true }); }
      });
      u.$$('.footer__big').forEach(function (el) {
        gsap.from(el, { yPercent: 40, opacity: 0, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom 85%', scrub: true } });
      });

      return function () { u.$$('.is-lit').forEach(function (s) { s.classList.remove('is-lit'); }); };
    });

    // late layout shifts (fonts, images) — refresh once things settle
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
    window.addEventListener('load', function () { ScrollTrigger.refresh(); }, { once: true });
  };

  M.kill = function () {
    if (mm) { try { mm.revert(); } catch (e) {} mm = null; }
    if (window.ScrollTrigger) ScrollTrigger.getAll().forEach(function (t) { t.kill(); });
  };
})();
