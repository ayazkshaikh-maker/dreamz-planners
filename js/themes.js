/* Dreamz Planners — theme presets (shared by the site, 404/privacy and the Studio).
   A preset is a complete, designed look: page tokens + "media" tokens (used for text and UI that sits
   on top of photos/video, which stay cinematic and dark in every theme) + overlays (grain, vignette, shadows).
   content.theme.preset picks one; content.theme.colors holds optional per-token overrides (fine-tuning).
   DP.themes.vars(themeContent, presetId?) -> { mode, vars: { '--ink': '#…', … } } */
(function () {
  'use strict';
  var DP = (window.DP = window.DP || {});

  function hex(h) { h = String(h || '').replace('#', ''); if (h.length === 3) h = h.replace(/(.)/g, '$1$1'); return /^[0-9a-f]{6}$/i.test(h) ? h : null; }
  function rgb(h) { h = hex(h); return h ? [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)] : [0, 0, 0]; }
  function trip(h) { return rgb(h).join(' '); }
  function mix(a, b, t) { var x = rgb(a), y = rgb(b); return '#' + x.map(function (v, i) { return ('0' + Math.round(v * t + y[i] * (1 - t)).toString(16)).slice(-2); }).join('').toUpperCase(); }
  function lum(h) { return rgb(h).map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }).reduce(function (s, v, i) { return s + v * [0.2126, 0.7152, 0.0722][i]; }, 0); }
  function contrast(a, b) { if (!hex(a) || !hex(b)) return null; var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }

  /* best-contrast text colour: the candidate whose WORST contrast over all given fills is highest */
  function pickOn(fills, cands) {
    var best = cands[0], score = -1;
    cands.forEach(function (t) {
      var w = Math.min.apply(null, fills.map(function (f) { return contrast(t, f) || 0; }));
      if (w > score) { score = w; best = t; }
    });
    return best;
  }
  /* move colour `col` step by step towards the targets until it reaches `min` contrast on every background */
  function deepen(col, targets, bgs, min) {
    function worst(x) { return Math.min.apply(null, bgs.map(function (b) { return contrast(x, b) || 0; })); }
    if (worst(col) >= min) return col;
    var x = col;
    for (var k = 0; k < targets.length; k++) {
      for (var t = 0.9; t >= 0; t -= 0.1) { x = mix(col, targets[k], t); if (worst(x) >= min) return x; }
      col = targets[k];
    }
    return x;
  }

  /* colors = the 8 classic tokens (ink = page background, ivory = main text, plum = surfaces,
     aubergine = soft tint for gradients/hover, rani = pink accent, gold/goldDeep = lines + buttons,
     champagne = secondary accent text). media = the cinematic layer over photos and video. */
  var P = {
    'midnight-gold': {
      label: 'Midnight Gold', mode: 'dark', note: 'Midnight ballroom, molten gold — the original look.',
      colors: { ink: '#0E0A14', plum: '#2A1238', aubergine: '#45194F', rani: '#C2185B', gold: '#D4A853', goldDeep: '#9C7430', champagne: '#F1DFB6', ivory: '#FAF5EC' },
      fonts: { display: 'Cormorant Garamond', label: 'Marcellus', body: 'Manrope', script: 'Pinyon Script' }
    },
    'emerald-night': {
      label: 'Emerald Night', mode: 'dark', note: 'Deep emerald velvet with antique gold — mehndi-night luxe.',
      colors: { ink: '#06120E', plum: '#0E2A21', aubergine: '#174034', rani: '#D8517C', gold: '#D9B45E', goldDeep: '#9C7A34', champagne: '#EBDDB3', ivory: '#F6F1E4' },
      fonts: { display: 'Cormorant Garamond', label: 'Marcellus', body: 'Manrope', script: 'Pinyon Script' },
      media: { ink: '#04100C' }
    },
    'satin-ivory': {
      label: 'Satin Ivory', mode: 'light', note: 'Satin cream and porcelain, warm taupe type, champagne gold.',
      colors: { ink: '#F7F1E6', plum: '#EEE3D1', aubergine: '#E5D3BC', rani: '#B5476A', gold: '#856427', goldDeep: '#6B4F1F', champagne: '#7A5A3A', ivory: '#3B2D26' },
      fonts: { display: 'Cormorant Garamond', label: 'Marcellus', body: 'Manrope', script: 'Pinyon Script' },
      media: { ink: '#241A15', plum: '#3B2B22', ivory: '#FBF6EE', gold: '#E2C27E', goldDeep: '#A98443', champagne: '#F3E3C3' },
      surface: '#FFFDF8', rose: '#D9A7AE'
    },
    'rose-champagne': {
      label: 'Rose Champagne', mode: 'light', note: 'Blush silk, rosewood type and rose-gold accents.',
      colors: { ink: '#FBF1EE', plum: '#F4E1DB', aubergine: '#EDCFC6', rani: '#B23A5E', gold: '#93623A', goldDeep: '#73492A', champagne: '#8A5048', ivory: '#3E2629' },
      fonts: { display: 'Cormorant Garamond', label: 'Marcellus', body: 'Manrope', script: 'Pinyon Script' },
      media: { ink: '#2A161A', plum: '#43252B', ivory: '#FFF7F3', gold: '#E8C48A', goldDeep: '#B07E4E', champagne: '#F6DCCF' },
      surface: '#FFFAF8', rose: '#E3AAB5'
    }
  };
  var DEFAULT = 'midnight-gold';
  var COLOR_KEYS = ['ink', 'plum', 'aubergine', 'rani', 'gold', 'goldDeep', 'champagne', 'ivory'];
  var EXTRA_KEYS = ['mediaInk', 'mediaText', 'mediaGold'];

  function get(id) { return P[id] ? id : DEFAULT; }
  function mode(id) { return P[get(id)].mode; }

  /* Which preset is active. theme.visitorToggle: false (default) | true | 'auto'.
     When the toggle is on, the visitor flips between a light and a dark preset; the choice is remembered. */
  function pair(theme) {
    var main = get(theme && theme.preset);
    return {
      light: mode(main) === 'light' ? main : get((theme && theme.lightPreset) || 'satin-ivory'),
      dark: mode(main) === 'dark' ? main : get((theme && theme.darkPreset) || DEFAULT)
    };
  }
  function active(theme, opts) {
    opts = opts || {};
    theme = theme || {};
    if (opts.force && P[opts.force]) return opts.force;
    var main = get(theme.preset);
    var vt = theme.visitorToggle;
    if (!vt || opts.ignoreVisitor) return main;
    var pr = pair(theme), saved = null;
    try { saved = localStorage.getItem('dp:visitor-mode'); } catch (e) {}
    if (saved === 'light' || saved === 'dark') return pr[saved];
    if (vt === 'auto' && window.matchMedia) return window.matchMedia('(prefers-color-scheme: light)').matches ? pr.light : pr.dark;
    return main;
  }

  function vars(theme, presetId) {
    theme = theme || {};
    var id = get(presetId || theme.preset);
    var p = P[id];
    var c = {};
    COLOR_KEYS.forEach(function (k) { c[k] = p.colors[k]; });
    // owner fine-tuning applies to the main preset only (not to the visitor-toggle alternative)
    var ov = (id === get(theme.preset) && theme.colors) || {};
    COLOR_KEYS.concat(EXTRA_KEYS).forEach(function (k) { if (hex(ov[k])) c[k] = '#' + hex(ov[k]).toUpperCase(); });
    var light = p.mode === 'light';
    // Readability guard: on light themes gold is also used as small text on cards and tinted bands,
    // so it is deepened (towards goldDeep, then the text colour) until it reads at 4.6:1 on the darkest tint.
    var rawGold = c.gold;
    if (light) c.gold = deepen(c.gold, [c.goldDeep, c.ivory], [c.plum, mix(c.plum, c.aubergine, 0.5)], 4.6);
    var m = p.media || {};
    var mi = {
      ink: c.mediaInk || m.ink || (light ? '#241A15' : c.ink),
      plum: m.plum || (light ? mix(c.mediaInk || m.ink || '#241A15', '#ffffff', 0.86) : c.plum),
      ivory: c.mediaText || m.ivory || (light ? '#FBF6EE' : c.ivory),
      gold: c.mediaGold || m.gold || (light ? '#E2C27E' : c.gold),
      goldDeep: m.goldDeep || (light ? '#A98443' : c.goldDeep),
      champagne: m.champagne || (light ? '#F3E3C3' : c.champagne)
    };
    var accentFills = light ? [c.gold, c.goldDeep, mix(c.gold, c.goldDeep, 0.6)] : [c.gold, c.goldDeep, mix(c.gold, '#FFFFFF', 0.45), mix(c.gold, '#FFFFFF', 0.7)];
    var onAccent = pickOn(accentFills, light ? [mix(c.ink, '#FFFFFF', 0.4), '#FFFFFF', c.ivory, '#1A1114'] : [c.ink, mix(c.ink, '#000000', 0.5), '#FFFFFF']);
    var mOn = pickOn([mi.gold, mi.goldDeep, mix(mi.gold, '#FFFFFF', 0.45), mix(mi.gold, '#FFFFFF', 0.7)], [mi.ink, mix(mi.ink, '#000000', 0.5), '#FFFFFF']);
    function brightGrad(g, gd) { return 'linear-gradient(120deg, ' + mix(g, '#FFFFFF', 0.45) + ' 0%, ' + g + ' 38%, ' + gd + ' 62%, ' + mix(g, '#FFFFFF', 0.7) + ' 82%, ' + g + ' 100%)'; }
    function deepGrad(g, gd) { return 'linear-gradient(120deg, ' + mix(g, '#FFFFFF', 0.82) + ' 0%, ' + g + ' 36%, ' + gd + ' 64%, ' + mix(g, '#FFFFFF', 0.86) + ' 84%, ' + g + ' 100%)'; }
    var v = {
      '--ink': c.ink, '--plum': c.plum, '--aubergine': c.aubergine, '--rani': c.rani, '--gold': c.gold, '--gold-deep': c.goldDeep, '--champagne': c.champagne, '--ivory': c.ivory,
      '--gold-grad': light ? deepGrad(c.gold, c.goldDeep) : brightGrad(c.gold, c.goldDeep),
      // light buttons: the sheen stays at or below the gold so the light label keeps its contrast across the whole pill
      '--btn-grad': light ? 'linear-gradient(120deg, ' + c.gold + ' 0%, ' + mix(c.gold, c.goldDeep, 0.6) + ' 40%, ' + c.goldDeep + ' 70%, ' + c.gold + ' 100%)' : brightGrad(c.gold, c.goldDeep),
      // --on-gold / --on-accent = text on anything filled with the accent (buttons, selected chips, chosen dates,
      // open accordion icons, lit steps). Picked per theme for the best contrast against every stop of that fill.
      '--on-gold': onAccent,
      '--on-accent': onAccent,
      '--accent': c.gold,
      '--surface': light ? (p.surface || mix(c.ink, '#FFFFFF', 0.3)) : c.plum,
      '--rose': p.rose || c.rani,
      '--ok': light ? '#2E7D4F' : '#7BD389',
      '--err': light ? '#A3123F' : '#FF9DB8',
      '--scrim': trip(mi.ink),
      '--shadow': light ? trip(mix(c.ivory, c.ink, 0.6)) : '0 0 0',
      '--shadow-k': light ? '0.35' : '1',
      '--vignette': light ? trip(mix(c.goldDeep, c.ink, 0.5)) : '5 3 8',
      '--vignette-a': light ? '0.16' : '0.55',
      '--grain-a': light ? '0.045' : '0.07',
      '--grain-blend': light ? 'multiply' : 'overlay',
      '--backdrop': light ? trip(mix(c.ivory, c.ink, 0.55)) : '8 5 12',
      '--backdrop-a': light ? '0.42' : '0.78',
      '--m-ink': mi.ink, '--m-plum': mi.plum, '--m-ivory': mi.ivory, '--m-gold': mi.gold, '--m-gold-deep': mi.goldDeep, '--m-champagne': mi.champagne,
      '--m-grad': brightGrad(mi.gold, mi.goldDeep), '--m-on-gold': mOn
    };
    return { id: id, mode: p.mode, colors: c, rawGold: rawGold, media: mi, vars: v };
  }

  /* Rows for the Studio readability check. */
  function checks(t) {
    var c = t.colors, mi = t.media, light = t.mode === 'light';
    var gold = c.gold, onGold = t.vars['--on-gold'];
    return [
      ['Body text on page', c.ivory, c.ink, 4.5],
      ['Muted text on page', mix(c.ivory, c.ink, 0.7), c.ink, 4.5],
      ['Gold labels on page', gold, c.ink, light ? 4.5 : 3],
      ['Accent text (champagne) on page', c.champagne, c.ink, 4.5],
      ['Button / selected-option text on gold', onGold, gold, 4.5],
      ['Button text on the deep end of the gold', onGold, c.goldDeep, 4.5],
      ['Gold labels on cards & tinted bands', gold, c.plum, light ? 4.5 : 3],
      ['Text on cards', c.ivory, light ? t.vars['--surface'] : c.plum, 4.5],
      ['Text over photos & video (with shade)', mi.ivory, mix(mi.ink, '#777777', 0.75), 4.5],
      ['Pink accent on page', c.rani, c.ink, 3]
    ];
  }

  /* Write the tokens onto <html> (or any element) and set data-theme / data-mode. */
  function apply(t, el) {
    el = el || document.documentElement;
    Object.keys(t.vars).forEach(function (k) { el.style.setProperty(k, t.vars[k]); });
    el.setAttribute('data-theme', t.id);
    el.setAttribute('data-mode', t.mode);
    if (el === document.documentElement) {
      el.style.colorScheme = t.mode;
      var meta = document.querySelector('meta[name=theme-color]'); if (meta) meta.content = t.colors.ink;
      var cs = document.querySelector('meta[name=color-scheme]'); if (cs) cs.content = t.mode;
    }
    return t;
  }
  function urlTheme() { try { var m = /[?&]theme=([\w-]+)/.exec(location.search); return m && P[m[1]] ? m[1] : null; } catch (e) { return null; } }
  /* Called synchronously in <head>: paints the last theme the visitor saw (no dark flash on light themes). */
  function boot() {
    var cache = null;
    try { cache = JSON.parse(localStorage.getItem('dp:theme-cache') || 'null'); } catch (e) {}
    var theme = (cache && cache.theme) || {};
    var t = apply(vars(theme, active(theme, { force: urlTheme() })));
    DP.themeCache = cache;
    return t;
  }
  function remember(theme) { try { localStorage.setItem('dp:theme-cache', JSON.stringify({ theme: theme, logos: arguments[1] || null })); } catch (e) {} }

  DP.themes = {
    presets: P, DEFAULT: DEFAULT, COLOR_KEYS: COLOR_KEYS, EXTRA_KEYS: EXTRA_KEYS,
    get: get, mode: mode, pair: pair, active: active, vars: vars, checks: checks, contrast: contrast, mix: mix, hex: hex, pickOn: pickOn,
    apply: apply, boot: boot, remember: remember, urlTheme: urlTheme
  };
})();
