/* Dreamz Planners — boot. Loads content (Supabase published over JSON defaults), applies theme + SEO,
   renders chapters, wires tools/effects/motion. DP.mount(content) can be called again by the Studio preview. */
(function () {
  'use strict';
  var DP = (window.DP = window.DP || {});
  var u = DP.u;
  var DEFAULT_FONTS = ['Cormorant Garamond', 'Marcellus', 'Manrope', 'Pinyon Script'];

  /* Theme = preset (js/themes.js) + optional per-token overrides in theme.colors.
     ?theme=<preset-id> forces a preset (testing); DP.forceTheme is set by the Studio preview. */
  function applyTheme(C) {
    var html = document.documentElement, root = html.style;
    var th = C.theme || {};
    var t = DP.themes.vars(th, DP.themes.active(th, { force: DP.forceTheme || DP.themes.urlTheme(), ignoreVisitor: /[?&]preview=/.test(location.search) && !DP.visitorClicked }));
    DP.themes.apply(t);
    DP.themeNow = t;
    if (!/[?&](preview|theme)=/.test(location.search)) DP.themes.remember({ preset: th.preset, colors: th.colors, visitorToggle: th.visitorToggle, lightPreset: th.lightPreset, darkPreset: th.darkPreset });
    var f = th.fonts || {};
    var stacks = { display: [f.display, 'Georgia, serif'], label: [f.label, 'Georgia, serif'], body: [f.body, 'system-ui, sans-serif'], script: [f.script, 'cursive'] };
    Object.keys(stacks).forEach(function (k) { if (stacks[k][0]) root.setProperty('--f-' + k, "'" + stacks[k][0] + "', " + stacks[k][1]); });
    var extra = [f.display, f.label, f.body, f.script].filter(function (n) { return n && DEFAULT_FONTS.indexOf(n) < 0; });
    var link = document.getElementById('dp-extra-fonts');
    if (extra.length) {
      var href = 'https://fonts.googleapis.com/css2?' + extra.map(function (n) { return 'family=' + encodeURIComponent(n).replace(/%20/g, '+') + ':ital,wght@0,300;0,400;0,600;1,400'; }).join('&') + '&display=swap';
      if (!link) { link = u.h('link', { rel: 'stylesheet', id: 'dp-extra-fonts' }); document.head.appendChild(link); }
      link.href = href;
    }
    var eff = th.effects || {};
    u.$('.grain').hidden = eff.grain === false;
    u.$('.vignette').hidden = eff.vignette === false;
    html.classList.toggle('no-credits', eff.mediaCredits === false);
    if (DP.tools && DP.tools.themeToggle && DP.content) try { DP.tools.themeToggle(); } catch (e) {}
    // Studio: optional favicon override (brand.favicon)
    var fav = C.brand && C.brand.favicon;
    if (fav) Array.prototype.forEach.call(document.querySelectorAll('link[rel~=icon]'), function (l) { l.href = fav; l.removeAttribute('type'); });
  }

  function applySeo(C) {
    var s = C.seo || {};
    if (s.title) document.title = s.title;
    function set(sel, attr, val) { var m = document.querySelector(sel); if (m && val) m.setAttribute(attr, val); }
    set('meta[name=description]', 'content', s.description);
    set('meta[property="og:title"]', 'content', s.title);
    set('meta[property="og:description"]', 'content', s.description);
    set('meta[name="twitter:title"]', 'content', s.title);
    set('meta[name="twitter:description"]', 'content', s.description);
    var base = s.siteUrl || (location.origin + location.pathname.replace(/[^/]*$/, ''));
    if (/^https?:/.test(base)) {
      set('link[rel=canonical]', 'href', base);
      set('meta[property="og:url"]', 'content', base);
      set('meta[property="og:image"]', 'content', new URL(s.ogImage || 'assets/brand/og-image.jpg', base).href);
      set('meta[name="twitter:image"]', 'content', new URL(s.ogImage || 'assets/brand/og-image.jpg', base).href);
    }
    // JSON-LD kept in sync with the content model
    var ld = document.getElementById('ld-business');
    if (ld) {
      var c = C.contact || {};
      var data = {
        '@context': 'https://schema.org', '@type': ['LocalBusiness', 'EventPlanner'],
        name: C.brand.name, slogan: C.brand.tagline, description: s.description,
        url: /^https?:/.test(base) ? base : undefined,
        image: /^https?:/.test(base) ? new URL(s.ogImage || 'assets/brand/og-image.jpg', base).href : undefined,
        telephone: (c.phones || []).map(function (p) { return '+1-' + p.number; }),
        email: c.email || undefined,
        areaServed: c.areaServed || 'Atlanta, GA',
        address: { '@type': 'PostalAddress', streetAddress: c.address || undefined, addressLocality: c.city || 'Atlanta', addressRegion: c.region || 'GA', addressCountry: c.country || 'US' },
        sameAs: [c.instagram && c.instagram.url].filter(Boolean),
        founder: ((C.founders && C.founders.people) || []).map(function (p) { return { '@type': 'Person', name: p.name, jobTitle: p.role }; })
      };
      ld.textContent = JSON.stringify(data);
    }
  }

  function mount(C) {
    DP.content = C;
    applyTheme(C);
    applySeo(C);
    if (DP.motion) DP.motion.kill();
    DP.render(C);
    try { DP.motion.lenis(); } catch (e) { console.warn('[dp] lenis', e); } // before the tools, so they can listen to smooth scroll
    var T = DP.tools;
    [T.chrome, T.dock, T.dialogs, T.wizards, T.estimator, T.dateCheck, T.services, T.reviews, T.announcement, DP.printing && DP.printing.init].filter(Boolean).forEach(function (fn) {
      try { fn(); } catch (e) { console.error('[dp] tool failed', e); }
    });
    try { DP.motion.lenis(); DP.motion.init(); } catch (e) { console.error('[dp] motion failed', e); document.documentElement.classList.add('is-static'); }
    try { DP.fx.dust(); DP.fx.dustObserve(); DP.fx.cursor(); DP.fx.magnetic(document); DP.fx.tilt(document); DP.fx.trail(); DP.fx.marquee(); } catch (e) { console.error('[dp] fx failed', e); }
  }
  DP.mount = mount;
  DP.applyTheme = applyTheme;

  function boot() {
    if (u.reduced()) document.documentElement.classList.add('is-static');
    // The film always starts at the opening scene (unless a #chapter link was used).
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    if (!location.hash) window.scrollTo(0, 0);
    try { DP.tools.lightbox(); DP.tools.actions(); } catch (e) { console.error(e); }
    var contentP = Promise.all([DP.data.getContent(), DP.media.load()]).then(function (r) { return r[0]; });
    var mounted = contentP.then(function (C) {
      mount(C);
      // wait for the hero poster so the curtain opens on a real frame
      var v = u.$('#hero .media');
      var src = v && (v.getAttribute('poster') || v.getAttribute('src'));
      if (!src) return;
      return new Promise(function (res) { var im = new Image(); im.onload = im.onerror = res; im.src = src; setTimeout(res, 2500); });
    }).catch(function (e) {
      console.error('[dp] content failed', e);
      document.getElementById('main').innerHTML = '<section class="section"><div class="wrap"><h1 class="display">Dreamz Planners</h1><p class="lede">Call us at <a href="tel:+14044887643">404-488-7643</a> or <a href="tel:+14045433444">404-543-3444</a>.</p></div></section>';
    });
    DP.motion.preloader(mounted).then(function () {
      DP.motion.heroIntro();
      if (window.ScrollTrigger) ScrollTrigger.refresh();
      setTimeout(function () { DP.data.flushQueue(); }, 3000);
    });

    // Studio live preview: parent window posts { type: 'dp:preview', content }
    window.addEventListener('message', function (e) {
      if (e.origin !== location.origin || !e.data || e.data.type !== 'dp:preview' || !e.data.content) return;
      var merged = DP.data.deepMerge(DP.defaults || DP.content, e.data.content);
      var y = window.scrollY;
      mount(merged);
      window.scrollTo(0, y);
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    });
    contentP.then(function (C) { DP.defaults = C; });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
