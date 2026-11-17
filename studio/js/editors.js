/* Dreamz Studio — one editor per part of the content model (see content/SCHEMA.md). */
(function () {
  'use strict';
  var S = (window.Studio = window.Studio || {});
  var u = S.u, h = u.h, F = S.F;
  function C() { return S.state.content; }
  function head(base) { return [F.text(base + '.eyebrow', 'Eyebrow (small caps line)'), F.text(base + '.title', 'Title', { rich: true })]; }
  function plain(s) { return String(s || '').replace(/\*/g, ''); }
  /* one shared audio element for the Play buttons of the music / intro-cue pickers */
  var previewAudio = null, previewBtn = null;
  function sitePath(p) { return !p ? '' : /^(https?:|data:|blob:)/.test(p) ? p : '../' + String(p).replace(/^\.?\//, ''); }
  function playBtn(t, label) {
    var b = u.btn('▶ ' + (label || 'Play'), { small: true, kind: 'ghost', title: 'Listen to ' + (t.label || t.id) });
    b.addEventListener('click', function () {
      var mine = previewBtn === b && previewAudio && !previewAudio.paused;
      if (previewAudio) { previewAudio.pause(); if (previewBtn) previewBtn.classList.remove('is-active'); }
      if (mine) { previewBtn = null; return; }
      var probe = document.createElement('audio');
      var src = t.srcOgg && probe.canPlayType('audio/ogg; codecs="opus"') ? t.srcOgg : (t.src || t.srcOgg);
      if (!src) return u.toast('This track has no file', 'err');
      previewAudio = new Audio(sitePath(src)); previewAudio.volume = 0.6; previewBtn = b; b.classList.add('is-active');
      previewAudio.addEventListener('ended', function () { b.classList.remove('is-active'); });
      previewAudio.play().catch(function () { u.toast('Could not play this file in this browser', 'err'); b.classList.remove('is-active'); });
    });
    return b;
  }

  var FONTS = {
    display: ['Cormorant Garamond', 'Playfair Display', 'Bodoni Moda', 'EB Garamond', 'Libre Caslon Display', 'DM Serif Display', 'Gilda Display', 'Prata', 'Italiana', 'Cinzel'],
    label: ['Marcellus', 'Cinzel', 'Tenor Sans', 'Forum', 'Josefin Sans', 'Italiana', 'Cormorant SC'],
    body: ['Manrope', 'Inter', 'DM Sans', 'Jost', 'Lato', 'Nunito Sans', 'Work Sans', 'Karla', 'Poppins', 'Mulish'],
    script: ['Pinyon Script', 'Great Vibes', 'Parisienne', 'Allura', 'Alex Brush', 'Italianno', 'Tangerine', 'Petit Formal Script']
  };
  var fontsLoaded = false;
  function loadFontSamples() {
    if (fontsLoaded) return; fontsLoaded = true;
    var fams = [].concat(FONTS.display, FONTS.label, FONTS.body, FONTS.script).filter(function (f, i, a) { return a.indexOf(f) === i; });
    document.head.appendChild(h('link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?' + fams.map(function (f) { return 'family=' + f.replace(/ /g, '+'); }).join('&') + '&display=swap' }));
  }

  var sectionIds = function () { return (C().sections || []).map(function (s) { return s.id; }).filter(function (id) { return id !== 'preloader'; }); };

  var E = (S.editors = [
    /* ---------------- Look ---------------- */
    { id: 'brand', group: 'Look & feel', label: 'Brand & logos', render: function () {
      return [
        F.group('Name', [F.text('brand.name', 'Business name'), F.text('brand.shortName', 'Short name (giant footer word)'), F.text('brand.tagline', 'Tagline')]),
        F.group('Logos', [
          F.media('brand.logo.horizontal', 'Header logo — light/gold version (dark themes and over the hero film)', { kind: 'image', hint: 'SVG or transparent PNG/WebP works best. Falls back to the name in text if it cannot load.' }),
          F.media('brand.logo.horizontalDark', 'Header logo — dark version (light themes)', { kind: 'image' }),
          F.media('brand.logo.stacked', 'Footer logo — light/gold version', { kind: 'image' }),
          F.media('brand.logo.stackedDark', 'Footer logo — dark version (light themes)', { kind: 'image' }),
          F.media('brand.logo.mark', 'Monogram mark — light/gold version', { kind: 'image' }),
          F.media('brand.logo.markDark', 'Monogram mark — dark version', { kind: 'image' }),
          F.media('brand.logo.mark3d', '3D logo render', { kind: 'image' })
        ]),
        F.group('Browser icon', [F.media('brand.favicon', 'Favicon (square, 512 px PNG or SVG)', { kind: 'image', hint: 'Shown in the browser tab. Leave empty to keep the built-in DP icon.' })])
      ];
    } },
    { id: 'theme', group: 'Look & feel', label: 'Theme, colours & fonts', render: function () {
      loadFontSamples();
      var TH = window.DP && window.DP.themes;
      var th = C().theme = C().theme || {};
      if (!th.colors || typeof th.colors !== 'object') th.colors = {};
      if (!th.effects) th.effects = {};
      if (!TH) return [F.note('Theme presets could not load (js/themes.js). Reload the Studio.', 'warn')];
      var current = TH.get(th.preset);
      function eff() { return TH.vars(th, TH.get(th.preset)); }

      /* ---- preset picker: live mini previews ---- */
      function mini(id) {
        var t = TH.vars({ preset: id }, id), c = t.colors, m = t.media, v = t.vars;
        var font = "'" + ((th.fonts && th.fonts.display) || 'Cormorant Garamond') + "', Georgia, serif";
        return h('div', { class: 'tmini', 'aria-hidden': 'true', style: { background: c.ink, color: c.ivory } }, [
          h('div', { class: 'tmini__bar', style: { borderColor: 'color-mix(in srgb, ' + c.gold + ' 30%, transparent)' } }, [
            h('i', { style: { background: c.gold } }), h('span', { style: { background: c.ivory, opacity: .35 } }), h('span', { style: { background: c.ivory, opacity: .35 } }), h('b', { style: { background: v['--btn-grad'] } })
          ]),
          h('div', { class: 'tmini__hero', style: { background: 'linear-gradient(180deg, transparent, rgb(' + v['--scrim'] + ' / .85)), url(../assets/media/posters/hero-01.webp) center/cover' } }, [
            h('span', { class: 'tmini__h', style: { color: m.ivory, fontFamily: font } }, ['Turning ', h('em', { style: { color: m.gold }, text: 'moments' })])
          ]),
          h('div', { class: 'tmini__body' }, [
            h('small', { style: { color: c.gold }, text: 'THE PROMISE' }),
            h('span', { class: 'tmini__t', style: { fontFamily: font, color: c.ivory }, text: 'From setup to send off' }),
            h('span', { class: 'tmini__row' }, [
              h('span', { class: 'tmini__card', style: { background: t.mode === 'light' ? v['--surface'] : c.plum, borderColor: 'color-mix(in srgb, ' + c.gold + ' 30%, transparent)' } }),
              h('span', { class: 'tmini__btn', style: { background: v['--btn-grad'], color: v['--on-gold'] }, text: 'Plan' })
            ])
          ])
        ]);
      }
      function worst(id) {
        var rows = TH.checks(TH.vars({ preset: id }, id));
        return rows.every(function (r) { var k = TH.contrast(r[1], r[2]); return k == null || k >= r[3]; });
      }
      var picker = h('div', { class: 'tpresets', role: 'radiogroup', 'aria-label': 'Theme preset' });
      Object.keys(TH.presets).forEach(function (id) {
        var p = TH.presets[id];
        var b = h('button', { type: 'button', role: 'radio', class: 'tpreset' + (id === current ? ' is-on' : ''), 'aria-checked': String(id === current), onclick: function () {
          if (id === TH.get(th.preset) && !Object.keys(th.colors).length) return;
          th.preset = id;
          th.colors = {};
          if (p.mode === 'light') th.lightPreset = id; else th.darkPreset = id;
          S.changed('theme.preset'); S.rerender();
          u.toast(p.label + ' applied to your draft — save or publish to keep it', 'ok');
        } }, [mini(id), h('span', { class: 'tpreset__meta' }, [
          h('strong', { text: p.label }), h('small', { text: (p.mode === 'light' ? 'Light · ' : 'Dark · ') + p.note }),
          h('em', { class: worst(id) ? 'is-ok' : 'is-bad', text: worst(id) ? 'Readability AA ✓' : 'Check readability' })
        ])]);
        picker.appendChild(b);
      });

      /* ---- fine-tune: shows the preset value, saves only what you change ---- */
      var t0 = eff();
      var warn = h('div', { class: 'contrast' });
      function check() {
        var t = eff();
        u.clear(warn);
        TH.checks(t).forEach(function (r) {
          var k = TH.contrast(r[1], r[2]); if (k == null) return;
          var good = k >= r[3];
          warn.appendChild(h('div', { class: 'contrast__row ' + (good ? 'is-ok' : 'is-bad') }, [
            h('span', { class: 'contrast__sample', style: { color: r[1], background: r[2] }, text: 'Aa' }),
            h('span', { text: r[0] }), h('strong', { text: k.toFixed(1) + ':1' }), h('em', { text: good ? 'OK' : 'Too low — hard to read' })
          ]));
        });
      }
      var colorLabels = { ink: 'Page background', ivory: 'Main text', plum: 'Cards & surfaces', aubergine: 'Soft tint (gradients, hover)', gold: 'Gold (labels, lines, buttons)', goldDeep: 'Gold shadow side', champagne: 'Secondary accent text', rani: 'Pink accent', mediaInk: 'Shade over photos & video', mediaText: 'Text over photos & video', mediaGold: 'Gold over photos & video' };
      function tune(k) {
        var base = k === 'mediaInk' ? t0.media.ink : k === 'mediaText' ? t0.media.ivory : k === 'mediaGold' ? t0.media.gold : t0.colors[k];
        var cur = TH.hex(th.colors[k]) ? th.colors[k].toUpperCase() : base;
        var pick = h('input', { type: 'color', class: 'swatch', value: cur, 'aria-label': colorLabels[k] + ' colour picker' });
        var txt = h('input', { class: 'input input--hex', value: cur, maxlength: 7, spellcheck: 'false', 'aria-label': colorLabels[k] + ' hex value' });
        var reset = u.btn('', { small: true, kind: 'ghost', icon: 'reload', title: 'Back to the preset colour', onclick: function () { delete th.colors[k]; pick.value = base; txt.value = base; mark(); S.changed('theme.colors'); check(); } });
        function mark() { var on = TH.hex(th.colors[k]) && th.colors[k].toUpperCase() !== base.toUpperCase(); field.classList.toggle('is-tuned', !!on); reset.hidden = !on; }
        function set(v) { v = v.toUpperCase(); if (v === base.toUpperCase()) delete th.colors[k]; else th.colors[k] = v; mark(); S.changed('theme.colors.' + k); check(); }
        pick.addEventListener('input', function () { txt.value = pick.value.toUpperCase(); set(pick.value); });
        txt.addEventListener('input', function () { if (/^#[0-9a-f]{6}$/i.test(txt.value)) { pick.value = txt.value; set(txt.value); } });
        var field = F.wrap(colorLabels[k], h('div', { class: 'color-row' }, [pick, txt, reset]), { cls: 'field--color' });
        mark();
        return field;
      }
      var tuneKeys = TH.COLOR_KEYS.concat(TH.presets[current].mode === 'light' ? TH.EXTRA_KEYS : []);
      var colors = tuneKeys.map(tune);
      check();
      var resetAll = u.btn('Reset all fine-tuning', { small: true, kind: 'outline', icon: 'reload', onclick: function () { th.colors = {}; S.changed('theme.colors'); S.rerender(); } });

      function fontSel(key, label) {
        var sample = h('p', { class: 'font-sample', text: key === 'script' ? 'Forever & always' : key === 'body' ? 'From the first setup to the final dance.' : 'Dreamz Planners' });
        function upd() { sample.style.fontFamily = "'" + C().theme.fonts[key] + "'"; }
        upd();
        return F.select('theme.fonts.' + key, label, FONTS[key].map(function (f) { return { value: f, label: f, font: f }; }), { onchange: upd, extra: sample });
      }
      var presetOpts = function (mode) { return Object.keys(TH.presets).filter(function (id) { return TH.presets[id].mode === mode; }).map(function (id) { return { value: id, label: TH.presets[id].label }; }); };
      function visitorSel() {
        var sel = h('select', { class: 'input', 'aria-label': 'Light/dark button for visitors' }, [
          h('option', { value: 'off', text: 'No — always use the theme above' }),
          h('option', { value: 'on', text: 'Yes — visitors can switch (starts on the theme above)' }),
          h('option', { value: 'auto', text: 'Yes — and start from the visitor\'s phone/computer setting' })
        ]);
        sel.value = th.visitorToggle === 'auto' ? 'auto' : th.visitorToggle ? 'on' : 'off';
        sel.addEventListener('change', function () { th.visitorToggle = sel.value === 'auto' ? 'auto' : sel.value === 'on'; S.changed('theme.visitorToggle'); });
        return F.wrap('Show a light/dark button in the header', sel, { hint: 'The visitor\'s choice is remembered on their device.' });
      }
      var cursorToggle = F.toggle('theme.effects.customCursor', 'Cursor ring', { hint: 'Desktop only. A soft gold ring follows the normal mouse pointer (the pointer itself always stays visible).', onchange: function (on) { th.effects.cursor = on; } });
      return [
        F.group('Theme', [picker], { intro: 'Each theme is a complete look — page, cards, wizard, gallery and menus are designed for it. Photos and videos keep a cinematic shade in every theme so the text on them stays readable. Tap one to try it in the preview; nothing goes live until you publish.' }),
        F.group('Readability check — ' + TH.presets[current].label, [warn], { intro: 'WCAG AA: 4.5:1 for normal text, 3:1 for large accents. Re-checked as you fine-tune.' }),
        F.group('Fine-tune colours', colors.concat([h('div', { class: 'row' }, [resetAll])]), { cols: 2, intro: 'Optional. Starts from the theme\'s own colours; only what you change is saved, and picking another theme clears it.' }),
        F.group('Light / dark switch for visitors', [
          visitorSel(),
          F.select('theme.lightPreset', 'Light theme for the switch', presetOpts('light'), { hint: 'Used when the main theme is dark.' }),
          F.select('theme.darkPreset', 'Dark theme for the switch', presetOpts('dark'), { hint: 'Used when the main theme is light.' })
        ], { cols: 1 }),
        F.group('Fonts', [fontSel('display', 'Display (headlines)'), fontSel('label', 'Labels & wordmark'), fontSel('body', 'Body text'), fontSel('script', 'Script accent')], { cols: 2 }),
        F.group('Effects', [
          F.toggle('theme.effects.grain', 'Film grain', { hint: 'Subtle texture over the page' }),
          F.toggle('theme.effects.vignette', 'Vignette', { hint: 'Soft shaded edges' }),
          F.toggle('theme.effects.particles', 'Gold dust', { hint: 'Floating particles' }),
          cursorToggle,
          F.toggle('theme.effects.smoothScroll', 'Smooth scrolling', { hint: 'Cinematic scroll feel' }),
          F.toggle('theme.effects.mediaCredits', 'Photographer credits on photos & videos', { hint: 'Small © @photographer notes in the corner of each picture. Switch off to hide them everywhere (story credits under each wedding stay).' })
        ])
      ];
    } },
    /* ---- intro film overlay + page background music (theme.intro / theme.music) ---- */
    { id: 'intro', group: 'Look & feel', label: 'Intro film', render: function () {
      var th = C().theme = C().theme || {};
      var it = th.intro = th.intro || {};
      if (!it.posters) it.posters = {};
      var cues = Array.isArray(it.cues) ? it.cues : [];
      var preview = u.btn('Preview the intro', { kind: 'gold', icon: 'eye', onclick: function () {
        document.body.classList.add('preview-open');
        if (S.schedulePreview) S.schedulePreview();
        var fr = document.querySelector('.preview__frame');
        setTimeout(function () { try { fr.contentWindow.postMessage({ type: 'dp:intro-preview' }, location.origin); } catch (e) { u.toast('Open the preview first', 'err'); } }, 500);
      } });
      return [
        F.group('When it plays', [
          F.select('theme.intro.mode', 'Show the intro film', [
            { value: 'first-visit', label: 'Once per visit (first page load of a browser session)' },
            { value: 'every-load', label: 'Every time the page loads' },
            { value: 'off', label: 'Off — go straight to the website' }
          ], { hint: 'After the gold loader, visitors see the first frame with "Tap to enter". Tapping plays the film with sound; if they do nothing for 6 seconds it plays silently. Skip is always there, and Esc skips. Links straight to a chapter (#begin…) never show it.' }),
          h('div', { class: 'row' }, [preview])
        ]),
        F.group('Film files', [
          F.media('theme.intro.src16x9', 'Film — wide 16:9 (with sound)', { kind: 'video', focus: false, hint: 'Computers, tablets and phones held sideways. MP4, up to 10 MB when uploaded.' }),
          F.media('theme.intro.src9x16', 'Film — tall 9:16 (with sound)', { kind: 'video', focus: false, hint: 'Phones held upright.' }),
          F.media('theme.intro.silent16x9', 'Silent copy — 16:9 (optional)', { kind: 'video', focus: false, hint: 'Played muted when the visitor has not tapped. Empty = the version above, muted.' }),
          F.media('theme.intro.silent9x16', 'Silent copy — 9:16 (optional)', { kind: 'video', focus: false }),
          F.media('theme.intro.posters.16x9', 'First frame — 16:9 poster', { kind: 'image', focus: false, hint: 'Shown with "Tap to enter" until the film starts.' }),
          F.media('theme.intro.posters.9x16', 'First frame — 9:16 poster', { kind: 'image', focus: false })
        ], { cols: 2 }),
        F.group('Music under the film', [
          F.select('theme.intro.cue', 'Intro music', cues.map(function (q) { return { value: q.id, label: q.label || q.id }; }), { hint: '"In the film" uses the sound mixed into the film. Another choice plays that cue over the silent copy of the film.' }),
          h('div', { class: 'row' }, cues.map(function (q) { return playBtn(q, 'Play ' + (q.label || q.id).split('·')[0].trim()); }))
        ]),
        F.group('Labels', [F.text('theme.intro.enterLabel', 'Enter button', { hint: 'A ✦ is added after it.' }), F.text('theme.intro.skipLabel', 'Skip button'), F.text('theme.intro.playLabel', 'Play button (visitors who prefer less motion)'), F.text('theme.intro.soundLabel', 'Sound button (while it plays silently)')], { cols: 2 })
      ];
    } },
    { id: 'music', group: 'Look & feel', label: 'Background music', render: function () {
      var th = C().theme = C().theme || {};
      var m = th.music = th.music || {};
      if (!Array.isArray(m.tracks)) m.tracks = [];
      var list = h('div', { class: 'tracks', role: 'radiogroup', 'aria-label': 'Music track' });
      function draw() {
        u.clear(list);
        m.tracks.forEach(function (t, i) {
          var id = 'trk-' + i;
          var radio = h('input', { type: 'radio', name: 'dp-track', id: id, value: t.id, checked: m.track === t.id });
          radio.addEventListener('change', function () { m.track = t.id; S.changed('theme.music.track'); });
          var custom = !/^loop-[abc]$/.test(t.id || '');
          list.appendChild(h('div', { class: 'row', style: { alignItems: 'center', gap: '10px', padding: '6px 0' } }, [
            radio, h('label', { for: id, text: t.label || t.id, style: { flex: '1' } }), playBtn(t, 'Play'),
            custom ? u.btn('', { small: true, kind: 'ghost', icon: 'trash', title: 'Remove this track from the list', cls: 'is-danger', onclick: function () {
              m.tracks.splice(i, 1); if (m.track === t.id) m.track = (m.tracks[0] || {}).id || ''; S.changed('theme.music.tracks'); draw();
            } }) : null
          ]));
        });
      }
      draw();
      var file = h('input', { type: 'file', accept: 'audio/mpeg,audio/mp4,audio/x-m4a,audio/aac,audio/ogg,.mp3,.m4a,.ogg', hidden: true });
      file.addEventListener('change', function () {
        var f = file.files && file.files[0]; file.value = '';
        if (!f) return;
        S.media.uploadFiles([f]).then(function (added) {
          if (!added || !added.length) return;
          var t = { id: 'custom-' + Date.now().toString(36), label: f.name.replace(/\.[^.]+$/, ''), src: added[0], srcOgg: '' };
          m.tracks.push(t); m.track = t.id; S.changed('theme.music.tracks'); draw();
        });
      });
      var up = u.btn('Upload your own track', { small: true, kind: 'outline', icon: 'upload', onclick: function () { file.click(); } });
      var vol = h('input', { type: 'range', class: 'range', min: 5, max: 60, step: 1, value: Math.round((+m.volume || 0.25) * 100), 'aria-label': 'Volume' });
      var out = h('output', { class: 'range-out', text: vol.value + '%' });
      vol.addEventListener('input', function () { out.textContent = vol.value + '%'; m.volume = +vol.value / 100; S.changed('theme.music.volume'); });
      return [
        F.group('', [F.toggle('theme.music.enabled', 'Play soft music on the website', { big: true, hint: 'Never starts on its own: it begins after a visitor taps "enter" on the intro film, or when they press the music button. Their choice is remembered on their device.' })]),
        F.group('Track', [list, h('div', { class: 'row' }, [up, file]), F.note('Uploads: MP3, M4A or OGG up to 10 MB (live Studio only). For a gap-free loop, the end of the file should crossfade into its start — the three built-in tracks already do.', 'info')], { intro: 'Pick one. Use Play to listen here first.' }),
        F.group('Behaviour', [
          F.wrap('Volume', h('div', { class: 'range-row' }, [vol, out]), { hint: 'Kept low so it sits under the page (25% recommended).' }),
          F.toggle('theme.music.autoplayAfterIntro', 'Start after the intro film', { hint: 'Only when the visitor tapped "enter" (with sound).' }),
          F.toggle('theme.music.showToggle', 'Show the music button', { hint: 'Small round button bottom-left. Keep it on so visitors can always switch the music off.' }),
          F.text('theme.music.label', 'Button label (screen readers and tooltip)')
        ])
      ];
    } },
    { id: 'promo', group: 'Look & feel', label: 'Promo bar', render: function () {
      return [
        F.group('', [F.toggle('promo.enabled', 'Show the promo bar', { big: true, hint: 'The scrolling strip at the very top of the page' })]),
        F.group('Messages', [F.strings('promo.text', 'Lines (scroll one after another)', { addLabel: 'Add line', itemLabel: 'Line' })]),
        F.group('Style', [F.range('promo.speed', 'Speed', { min: 8, max: 200, hint: 'Higher is faster' }), F.color('promo.colors.bg', 'Background'), F.color('promo.colors.fg', 'Text'), F.color('promo.colors.accent', 'Separator ✦')], { cols: 2 }),
        F.group('Link', [F.text('promo.link', 'When tapped, go to', { hint: 'Use #begin for the inquiry section, any chapter (' + sectionIds().map(function (id) { return '#' + id; }).slice(0, 5).join(', ') + '…) or a full https:// link.' })])
      ];
    } },
    { id: 'announcement', group: 'Look & feel', label: 'Announcement popup', render: function () {
      return [
        F.group('', [F.toggle('announcement.enabled', 'Show the announcement', { big: true, hint: 'A small card that slides in after a few seconds' })]),
        F.group('Message', [F.text('announcement.title', 'Title', { rich: true }), F.area('announcement.body', 'Text', { rich: true }), F.text('announcement.cta.label', 'Button label'), F.text('announcement.cta.href', 'Button link', { hint: '#begin, #services… or a full https:// link' })]),
        F.group('Schedule', [F.datetime('announcement.start', 'Start showing', { hint: 'Empty = straight away' }), F.datetime('announcement.end', 'Stop showing', { hint: 'Empty = no end' }), F.number('announcement.delaySeconds', 'Delay before it appears (seconds)', { min: 0, max: 120 })], { cols: 2 }),
        F.group('Show again', [h('div', { class: 'row' }, [h('code', { class: 'code', text: C().announcement.id || '' }), u.btn('Show it to everyone again', { small: true, kind: 'outline', onclick: function () { C().announcement.id = 'ann-' + Date.now().toString(36); S.changed('announcement.id'); S.rerender(); u.toast('New announcement id set — visitors who closed the old one will see this one', 'ok'); } })])], { intro: 'Visitors who closed the popup will not see it again — unless you give it a new id.' })
      ];
    } },
    { id: 'sections', group: 'Look & feel', label: 'Sections & menu', render: function () {
      var box = h('div', { class: 'sec-list' });
      function draw() {
        u.clear(box);
        var list = C().sections || [];
        list.forEach(function (s, i) {
          if (s.id === 'preloader') return;
          var handle = h('span', { class: 'grip', 'aria-hidden': 'true' }, [u.icon('grip')]);
          var vis = h('input', { type: 'checkbox', role: 'switch', checked: s.visible !== false, 'aria-label': 'Show ' + plain(s.label) });
          vis.addEventListener('change', function () { s.visible = vis.checked; row.classList.toggle('is-hidden', !vis.checked); S.changed('sections'); });
          var row = h('div', { class: 'sec-row' + (s.visible === false ? ' is-hidden' : '') }, [handle,
            h('span', { class: 'sec-row__name' }, [h('strong', { text: s.label || s.id }), h('small', { text: '#' + s.id + (s.id === 'reviews' ? ' · also hidden until a review is published' : '') })]),
            h('button', { type: 'button', class: 'icon-btn icon-btn--sm', 'aria-label': 'Move up', disabled: i <= 1, onclick: function () { move(i, i - 1); } }, [u.icon('up', 14)]),
            h('button', { type: 'button', class: 'icon-btn icon-btn--sm', 'aria-label': 'Move down', disabled: i === list.length - 1, onclick: function () { move(i, i + 1); } }, [u.icon('down', 14)]),
            h('label', { class: 'switch switch--inline' }, [vis, h('span', { class: 'switch__track', 'aria-hidden': 'true' })]),
            u.btn('', { small: true, kind: 'ghost', icon: 'chev', title: 'Edit this chapter', onclick: function () { if (S.editors.some(function (e) { return e.id === s.id; })) S.go(s.id); } })
          ]);
          F.dragify(row, i, move, handle);
          box.appendChild(row);
        });
      }
      function move(from, to) {
        if (to < 1) to = 1;
        var a = C().sections.slice(); var it = a.splice(from, 1)[0]; a.splice(to, 0, it); C().sections = a; S.changed('sections'); draw();
      }
      draw();
      return [
        F.group('Page order', [box], { intro: 'Drag (or use the arrows) to reorder chapters. Switch one off to hide it. The opening animation always plays first.' }),
        F.group('Menu links', [F.list('nav', 'Header & footer menu', {
          title: function (n) { return n && n.label; }, sub: function (n) { return n && n.href; },
          blank: function () { return { label: 'New link', href: '#begin' }; },
          fields: function (b) { return [F.text(b + '.label', 'Label'), F.text(b + '.href', 'Link', { hint: 'Use #section-id (e.g. #faq) or a full https:// link' })]; }
        })])
      ];
    } },

    /* ---------------- Chapters ---------------- */
    { id: 'hero', group: 'Chapters', label: '1 · The Dream (hero)', render: function () {
      var actions = [{ value: 'wizard', label: 'Open the inquiry wizard' }, { value: 'film', label: 'Play the film' }];
      return [
        F.group('Text', [F.text('hero.eyebrow', 'Eyebrow'), F.text('hero.headline', 'Headline', { rich: true, hint: 'Animated letter by letter. Keep it short.' }), F.area('hero.sub', 'Sub-line', { rich: true })]),
        F.group('Background video', [F.media('hero.video', 'Hero video loop', { kind: 'video', hint: 'Pick a loop from the library, or Upload your own MP4/WebM (up to 10 MB). Click the picture to set the focal point.' }), F.media('hero.poster', 'Poster photo (optional)', { kind: 'image', hint: 'Shown while the video loads. Leave empty to use the first frame of the video (uploaded videos have none, so add one here).' })]),
        F.group('Buttons', [F.text('hero.ctaPrimary.label', 'Main button'), F.select('hero.ctaPrimary.action', 'Main button does', actions), F.text('hero.ctaSecondary.label', 'Second button'), F.select('hero.ctaSecondary.action', 'Second button does', actions)], { cols: 2 }),
        F.group('The film', [F.mediaList('hero.film', 'Clips played back-to-back', { kind: 'video' }), F.text('hero.filmCaption', 'Film caption')]),
        F.group('', [F.text('hero.scrollCue', 'Scroll hint')])
      ];
    } },
    { id: 'promise', group: 'Chapters', label: '2 · The Promise', render: function () {
      return [F.group('', [F.text('promise.eyebrow', 'Eyebrow'), F.area('promise.text', 'Promise text (fills in word by word)', { rich: true, rows: 4 }), F.text('promise.aside', 'Small line underneath')])];
    } },
    { id: 'behind', group: 'Chapters', label: '3 · Behind the curtain', render: function () {
      return [
        F.group('Text', head('behind').concat([F.text('behind.quote', 'Quote'), F.area('behind.body', 'Body', { rich: true })])),
        F.group('Media', [F.media('behind.video', 'Feature video (grows to full screen)', { kind: 'video' }), F.mediaList('behind.side', 'Two floating photos', { kind: 'image' })])
      ];
    } },
    { id: 'celebrations', group: 'Chapters', label: '4 · The celebrations', render: function () {
      return [
        F.group('Intro', head('celebrations').concat([F.area('celebrations.intro', 'Intro', { rich: true })])),
        F.group('Event cards', [F.list('celebrations.items', 'Celebrations', {
          title: function (it) { return it && it.name; }, sub: function (it) { return it && it.subtitle; },
          blank: function () { return { id: u.uid('event'), name: 'New celebration', subtitle: '', description: '', video: '', image: '' }; },
          dupe: function (c) { c.id = u.uid('event'); return c; },
          fields: function (b) { return [F.text(b + '.name', 'Name', { rich: true }), F.text(b + '.subtitle', 'Subtitle'), F.area(b + '.description', 'Description', { rich: true }), F.media(b + '.video', 'Video loop', { kind: 'video' }), F.media(b + '.image', 'Photo (used if no video)', { kind: 'image' }), F.text(b + '.credit', 'Credit override', { hint: 'Leave empty to use the photographer credit from the media library' })]; }
        })]),
        F.group('Closing card', [F.text('celebrations.endTitle', 'Title', { rich: true }), F.area('celebrations.endBody', 'Text', { rich: true })])
      ];
    } },
    { id: 'weddings', group: 'Chapters', label: '5 · Real weddings', render: function () {
      return [
        F.group('Intro', head('weddings').concat([F.area('weddings.intro', 'Intro', { rich: true }), F.text('weddings.trailWord', 'Big script words in the photo strip'), F.text('weddings.trailHint', 'Photo strip hint')])),
        F.group('Stories', [F.list('weddings.stories', 'Wedding stories', {
          title: function (s) { return s && s.couple; }, sub: function (s) { return s && [s.event, (s.gallery || []).length + ' photos'].join(' · '); },
          blank: function () { return { id: u.uid('story'), couple: 'Name & Name', event: 'Wedding', summary: '', cover: '', video: '', gallery: [], credits: [{ role: 'Photo', handle: '' }], instagram: '', layout: 'deck' }; },
          dupe: function (s) { s.id = u.uid('story'); return s; },
          fields: function (b) {
            return [
              F.text(b + '.couple', 'Couple', { hint: 'e.g. Faraz & Mahnoor' }), F.text(b + '.event', 'Event'), F.area(b + '.summary', 'Summary', { rich: true }),
              F.media(b + '.cover', 'Cover photo', { kind: 'image' }),
              F.mediaList(b + '.gallery', 'Gallery (lightbox order)', { kind: 'image' }),
              F.select(b + '.layout', 'Layout', [{ value: 'deck', label: 'Stacked deck (many photos)' }, { value: 'compact', label: 'Compact (one photo)' }]),
              F.list(b + '.credits', 'Credits', { title: function (c) { return c && (c.role + ' · @' + (c.handle || '')); }, blank: function () { return { role: 'Photo', handle: '' }; }, fields: function (cb) { return [F.text(cb + '.role', 'Role'), F.text(cb + '.handle', 'Instagram handle (without @)')]; } }),
              F.text(b + '.instagram', 'Instagram post link (optional)', { type: 'url' }),
              F.text(b + '.id', 'Anchor id', { hint: 'Used for #story-<id> links. Lowercase, no spaces.' })
            ];
          }
        })], { intro: 'Always credit the photographer. Only use weddings you planned.' })
      ];
    } },
    { id: 'services', group: 'Chapters', label: '6 · Services', render: function () {
      return [
        F.group('Intro', head('services').concat([F.area('services.intro', 'Intro', { rich: true })])),
        F.group('Prices', [F.toggle('services.showPrices', 'Show prices', { hint: 'Only services with a price filled in will show one' })]),
        F.group('Services', [F.list('services.items', 'Service levels', {
          title: function (s) { return s && s.name; }, sub: function (s) { return s && ('id: ' + s.id + (s.price ? ' · ' + s.price : '')); },
          blank: function () { return { id: u.uid('service'), name: 'New service', summary: '', includes: [], media: '', price: '' }; },
          dupe: function (s) { s.id = u.uid('service'); return s; },
          fields: function (b) { return [F.text(b + '.name', 'Name', { rich: true }), F.area(b + '.summary', 'Summary', { rich: true }), F.strings(b + '.includes', 'What is included', { addLabel: 'Add item' }), F.media(b + '.media', 'Hover photo', { kind: 'any' }), F.text(b + '.price', 'Price (optional)', { placeholder: 'e.g. From $4,500' }), F.text(b + '.id', 'Id', { hint: 'Keep full, partial and day-of — the celebration builder links to them.' })]; }
        })])
      ];
    } },
    { id: 'estimator', group: 'Chapters', label: '6b · Celebration builder', render: function () {
      return [
        F.group('Text', head('estimator').concat([F.area('estimator.intro', 'Intro', { rich: true }), F.text('estimator.cta', 'Button'), F.text('estimator.disclaimer', 'Small print')])),
        F.group('Event chips', [F.list('estimator.events', 'Events visitors can pick', { title: function (e) { return e && e.label; }, blank: function () { return { id: u.uid('ev'), label: 'New event' }; }, fields: function (b) { return [F.text(b + '.label', 'Label'), F.text(b + '.id', 'Id')]; } })]),
        F.group('Guest slider', [F.number('estimator.guests.min', 'Minimum'), F.number('estimator.guests.max', 'Maximum'), F.number('estimator.guests.step', 'Step'), F.number('estimator.guests.default', 'Starts at')], { cols: 2 }),
        F.group('Recommendation levels', [F.list('estimator.levels', 'Levels (first match wins, last is the catch-all)', {
          title: function (l) { return l && l.name; }, sub: function (l) { return l && ('≤ ' + l.maxEvents + ' events, ≤ ' + l.maxGuests + ' guests, ' + l.leadMonths + ' months'); },
          blank: function () { return { id: u.uid('lvl'), service: 'full', name: 'New level', maxEvents: 99, maxGuests: 100000, leadMonths: 12, note: '' }; },
          fields: function (b) { return [F.text(b + '.name', 'Name'), F.select(b + '.service', 'Links to service', (C().services.items || []).map(function (s) { return { value: s.id, label: plain(s.name) }; })), F.number(b + '.maxEvents', 'Up to how many events'), F.number(b + '.maxGuests', 'Up to how many guests'), F.number(b + '.leadMonths', 'Planning months'), F.area(b + '.note', 'Note', { rows: 2 })]; }
        })]),
        F.group('Timeline milestones', [F.list('estimator.milestones', 'Milestones', {
          title: function (m) { return m && m.label; }, sub: function (m) { return m && ('at ' + m.at); },
          blank: function () { return { at: 0.5, label: 'Milestone', body: '' }; },
          fields: function (b) { return [F.text(b + '.label', 'Label'), F.text(b + '.body', 'Text'), F.number(b + '.at', 'When (1 = start of planning, 0 = the day)', { min: 0, max: 1, step: 0.01 })]; }
        })]),
        F.group('Small text', F.auto('estimator.copy', { rich: ['emptyTitle'] }), { cols: 2 })
      ];
    } },
    { id: 'printing', group: 'Chapters', label: '6c · Printing & stationery', render: function () {
      var P = C().printing = C().printing || {};
      if (!Array.isArray(P.items)) P.items = [];
      if (!P.options || typeof P.options !== 'object') P.options = {};
      ['papers', 'finishes', 'methods', 'addons'].forEach(function (k) { if (!P.options[k]) P.options[k] = { label: u.human(k), items: [] }; });
      if (!Array.isArray(P.packages)) P.packages = [];
      if (!P.copy) P.copy = {};
      var secIdx = (C().sections || []).map(function (s) { return s.id; }).indexOf('printing');
      var vis = secIdx >= 0
        ? F.toggle('sections.' + secIdx + '.visible', 'Show the Printing & stationery chapter', { hint: 'Order on the page: Look & feel → Sections & menu.' })
        : h('div', {}, [F.note('This chapter is not in the page order yet.', 'warn'), u.btn('Add it after the celebration builder', { small: true, kind: 'outline', icon: 'plus', onclick: function () {
            var list = C().sections = (C().sections || []).slice(); var at = list.map(function (s) { return s.id; }).indexOf('estimator');
            list.splice(at >= 0 ? at + 1 : list.length, 0, { id: 'printing', label: '6c · Printing & stationery', visible: true }); S.changed('sections'); S.rerender();
          } })]);
      var cats = [];
      P.items.forEach(function (it) { if (it && it.category && cats.indexOf(it.category) < 0) cats.push(it.category); });
      var CAT_HINT = 'Pieces with the same category share a filter chip. In use: ' + (cats.join(', ') || '—') + '. Keep it to a handful (e.g. Invitations, Ceremony & events, Reception, Signage, Favours & packaging, Finishing touches); the piece name says what it is.';
      return [
        F.group('Chapter', [vis]),
        F.group('Intro', head('printing').concat([
          F.area('printing.intro', 'Intro', { rich: true }),
          F.text('printing.wallHint', 'Hint under the wall (desktop)'),
          F.text('printing.mobileHint', 'Hint under the deck (phones)'),
          F.text('printing.filterAll', 'Label of the "All" filter chip'),
          F.text('printing.sampleNote', 'Sample-design note', { hint: 'Shown while any piece is marked as a sample design.' })
        ])),
        F.group('Pieces on the wall', [F.list('printing.items', 'Printed pieces', {
          title: function (it) { return it && it.name; },
          sub: function (it) { return it && [it.category, (it.images || []).length + ' photos', it.price ? it.price : 'price on request', it.featured ? 'featured' : ''].filter(Boolean).join(' · '); },
          blank: function () { return { id: u.uid('piece'), name: 'New piece', category: cats[0] || 'Invitation suite', description: '', images: [], finishes: [], paper: '', price: '', unit: '', minQty: '', leadTime: '', featured: false, sample: false }; },
          dupe: function (it) { it.id = u.uid('piece'); return it; },
          addLabel: 'Add a piece',
          fields: function (b) {
            return [
              F.text(b + '.name', 'Name', { rich: true }),
              F.text(b + '.category', 'Category', { hint: CAT_HINT }),
              F.area(b + '.description', 'Description', { rich: true, rows: 3 }),
              F.list(b + '.images', 'Photos (first one hangs on the wall)', {
                title: function (im) { return im && (typeof im === 'string' ? im : im.src) || 'No photo yet'; },
                blank: function () { return { src: '', focus: '', zoom: 1, alt: '' }; },
                addLabel: 'Add a photo',
                fields: function (ib, im) {
                  if (typeof im === 'string') { var arr = u.get(C(), b + '.images'); var k = +ib.split('.').pop(); arr[k] = { src: im, focus: '', zoom: 1, alt: '' }; }
                  return [
                    F.media(ib + '.src', 'Photo', { kind: 'image', hint: 'Choose from the library or upload. Click the thumbnail to set the focal point everywhere this photo is used.' }),
                    F.text(ib + '.focus', 'Focal point for this card only (optional)', { placeholder: 'e.g. 50% 30%', hint: 'x% y% — overrides the library focal point on the wall and in the detail view.' }),
                    F.number(ib + '.zoom', 'Zoom into the focal point (1 = whole photo)', { min: 1, max: 4, step: 0.1, hint: 'e.g. 1.8 to show just the wax seal or the tag of a wider photo.' }),
                    F.text(ib + '.alt', 'Description for screen readers (optional)')
                  ];
                }
              }),
              F.strings(b + '.finishes', 'Finishes', { addLabel: 'Add finish', placeholder: 'e.g. Gold foil' }),
              F.text(b + '.paper', 'Paper / material'),
              F.text(b + '.price', 'Price (optional)', { placeholder: 'Leave empty to show "Price on request"', hint: 'Shown exactly as typed, e.g. "From $6". Nothing is shown when empty.' }),
              F.text(b + '.unit', 'Unit (optional)', { placeholder: 'e.g. card, set of 50' }),
              F.text(b + '.minQty', 'Minimum order (optional)', { placeholder: 'e.g. 50 pieces' }),
              F.text(b + '.leadTime', 'Lead time (optional)', { placeholder: 'e.g. 3–4 weeks' }),
              F.toggle(b + '.featured', 'Featured (gold ribbon on the wall)'),
              F.toggle(b + '.sample', 'Sample design (adds the sample note)', { hint: 'Switch off once the photo shows real work you printed.' }),
              F.text(b + '.id', 'Id', { hint: 'Lowercase, no spaces. Used by quote lists.' })
            ];
          }
        })], { intro: 'Add, remove, reorder or duplicate pieces. Prices stay empty unless you type one.' }),
        F.group('Paper, finishes & methods', [F.text('printing.optionsTitle', 'Title', { rich: true }), F.area('printing.optionsIntro', 'Intro', { rich: true, rows: 2 })].concat(
          ['papers', 'finishes', 'methods', 'addons'].map(function (k) {
            return h('div', { class: 'subgroup' }, [F.text('printing.options.' + k + '.label', 'List title'), F.strings('printing.options.' + k + '.items', P.options[k].label || u.human(k), { addLabel: 'Add option' })]);
          })
        )),
        F.group('Packages', [F.text('printing.packagesTitle', 'Title', { rich: true }), F.area('printing.packagesIntro', 'Intro', { rich: true, rows: 2 }), F.list('printing.packages', 'Packages', {
          title: function (p) { return p && p.name; }, sub: function (p) { return p && [(p.includes || []).length + ' items', p.price || 'price on request', p.highlight ? 'highlighted' : ''].filter(Boolean).join(' · '); },
          blank: function () { return { name: 'New package', includes: [], price: '', note: '', highlight: false }; },
          addLabel: 'Add a package',
          fields: function (b) { return [F.text(b + '.name', 'Name', { rich: true }), F.strings(b + '.includes', 'What is included', { addLabel: 'Add item' }), F.text(b + '.price', 'Price (optional)', { placeholder: 'Leave empty to show "Price on request"' }), F.text(b + '.note', 'Small note (optional)'), F.toggle(b + '.highlight', 'Highlight this package')]; }
        })]),
        F.group('Buttons & small text', F.auto('printing.copy'), { cols: 2 })
      ];
    } },
    { id: 'process', group: 'Chapters', label: '7 · The process', render: function () {
      return [F.group('Intro', head('process')), F.group('Steps', [F.list('process.steps', 'Steps (designed for 5)', {
        title: function (s) { return s && s.title; }, blank: function () { return { id: u.uid('step'), title: 'New step', body: '' }; }, dupe: function (s) { s.id = u.uid('step'); return s; },
        fields: function (b) { return [F.text(b + '.title', 'Title', { rich: true }), F.area(b + '.body', 'Text', { rich: true })]; }
      })])];
    } },
    { id: 'vendors', group: 'Chapters', label: '8 · Vendor circle', render: function () {
      return [F.group('Intro', head('vendors').concat([F.area('vendors.intro', 'Intro', { rich: true })])), F.group('Vendors', [F.list('vendors.items', 'Categories', {
        title: function (v) { return v && v.category; }, sub: function (v) { return v && (v.handles || []).map(function (x) { return '@' + x; }).join(' '); },
        blank: function () { return { category: 'New category', handles: [] }; },
        fields: function (b) { return [F.text(b + '.category', 'Category'), F.strings(b + '.handles', 'Instagram handles (without @)', { addLabel: 'Add handle', placeholder: 'handle' })]; }
      })])];
    } },
    { id: 'founders', group: 'Chapters', label: '9 · Founders', render: function () {
      return [
        F.group('Intro', head('founders').concat([F.area('founders.intro', 'Intro', { rich: true })])),
        F.group('Photo', [F.media('founders.photo', 'Team photo', { kind: 'image' }), F.text('founders.photoCaption', 'Caption')]),
        F.group('People', [F.list('founders.people', 'Founders', {
          title: function (p) { return p && p.name; }, sub: function (p) { return p && p.role; },
          blank: function () { return { name: 'New person', role: '', instagram: '', phone: '', photo: '' }; },
          fields: function (b) { return [F.text(b + '.name', 'Name'), F.text(b + '.role', 'Role'), F.text(b + '.instagram', 'Instagram handle (without @)'), F.text(b + '.phone', 'Phone (optional)', { type: 'tel' }), F.media(b + '.photo', 'Portrait (optional — replaces the initials)', { kind: 'image' })]; }
        })])
      ];
    } },
    { id: 'reviews', group: 'Chapters', label: '10 · Kind words', render: function () {
      return [F.group('Section text', head('reviews')), F.note('The reviews themselves are managed in "Reviews" (left menu). This chapter stays hidden until at least one real review is published.'), h('p', {}, [u.btn('Open the reviews manager', { kind: 'outline', onclick: function () { S.go('reviews-mgr'); } })])];
    } },
    { id: 'faq', group: 'Chapters', label: '11 · FAQ', render: function () {
      return [F.group('Intro', head('faq')), F.group('Questions', [F.list('faq.items', 'Questions & answers', {
        title: function (q) { return q && q.q; }, blank: function () { return { q: 'New question?', a: '' }; },
        fields: function (b) { return [F.text(b + '.q', 'Question'), F.area(b + '.a', 'Answer', { rich: true, rows: 4 })]; }
      })])];
    } },
    { id: 'begin', group: 'Chapters', label: '12 · Begin (inquiry)', render: function () {
      return [F.group('Text', head('begin').concat([F.area('begin.body', 'Text', { rich: true }), F.text('begin.dateCheckTitle', 'Date check title'), F.text('begin.dateCheckIntro', 'Date check intro'), F.text('begin.directTitle', 'Direct contact title')]))];
    } },
    { id: 'dateCheck', group: 'Chapters', label: 'Date check wording', render: function () {
      return [F.group('Status messages', F.auto('dateCheck.labels')), F.group('Labels', F.auto('dateCheck.copy'), { cols: 2 }), F.note('Set which dates are open, limited or booked in "Availability".')];
    } },
    { id: 'wizard', group: 'Chapters', label: 'Inquiry wizard', render: function () {
      return [
        F.group('Title', [F.text('wizard.title', 'Wizard title'), F.strings('wizard.steps', 'Step names (6, in order)')]),
        F.group('Options visitors can pick', [F.strings('wizard.eventTypes', 'Event types', { addLabel: 'Add event type' }), F.strings('wizard.services', 'Services', { addLabel: 'Add service' }), F.strings('wizard.budgets', 'Budget ranges (the visitor\'s own range — not your prices)', { addLabel: 'Add range' }), F.strings('wizard.contactMethods', 'Contact methods', { addLabel: 'Add method' })]),
        F.group('Guests', [F.number('wizard.guests.min', 'Minimum'), F.number('wizard.guests.max', 'Maximum'), F.number('wizard.guests.default', 'Starts at')], { cols: 3 }),
        F.group('After sending', [F.text('wizard.successTitle', 'Thank-you title', { rich: true }), F.area('wizard.successBody', 'Thank-you text', { rich: true }), F.text('wizard.whatsappIntro', 'First line of the WhatsApp summary'), F.text('wizard.consent', 'Privacy note')]),
        F.group('Questions & messages', F.auto('wizard.copy'), { cols: 2 })
      ];
    } },
    { id: 'footer', group: 'Chapters', label: 'Footer', render: function () {
      return [F.group('', [F.text('footer.note', 'Footer note'), F.text('footer.copyright', 'Copyright', { hint: 'The year is added automatically' }), F.list('footer.links', 'Footer links', { title: function (l) { return l && l.label; }, sub: function (l) { return l && l.href; }, blank: function () { return { label: 'Link', href: '' }; }, fields: function (b) { return [F.text(b + '.label', 'Label'), F.text(b + '.href', 'Link')]; } })])];
    } },
    { id: 'labels', group: 'Chapters', label: 'Buttons & small labels', render: function () {
      return [F.group('Small interface words', F.auto('labels'), { cols: 2 })];
    } },

    /* ---------------- Settings ---------------- */
    { id: 'contact', group: 'Settings', label: 'Contact details', render: function () {
      return [
        F.group('Phones', [F.list('contact.phones', 'Phone numbers (the first is used for the Call button)', {
          title: function (p) { return p && p.number; }, sub: function (p) { return p && p.label; },
          blank: function () { return { label: 'Phone', number: '', tel: '' }; },
          fields: function (b) {
            var telField = F.text(b + '.tel', 'Dial format (+1…)', { hint: 'Filled in automatically from the number' });
            var num = F.text(b + '.number', 'Number as shown', { type: 'tel', placeholder: '404-488-7643' });
            num.querySelector('input').addEventListener('input', function (e) {
              var d = e.target.value.replace(/\D/g, ''); if (d.length === 10) d = '1' + d;
              var tel = d ? '+' + d : ''; u.set(C(), b + '.tel', tel); telField.querySelector('input').value = tel; S.changed(b + '.tel');
            });
            return [F.text(b + '.label', 'Label'), num, telField];
          }
        })]),
        F.group('WhatsApp', [F.text('contact.whatsapp.number', 'WhatsApp number (country code + number, digits only)', { placeholder: '14044887643' }), F.area('contact.whatsapp.defaultMessage', 'Pre-filled message', { rows: 2 })]),
        F.group('Instagram', [F.text('contact.instagram.handle', 'Handle (without @)'), F.text('contact.instagram.url', 'Profile link', { type: 'url' })], { cols: 2 }),
        F.group('Email & address', [F.text('contact.email', 'Email', { type: 'email', hint: 'Hidden on the site while empty' }), F.text('contact.address', 'Street address', { hint: 'Hidden on the site while empty' })]),
        F.group('Area', [F.text('contact.city', 'City'), F.text('contact.region', 'State'), F.text('contact.country', 'Country'), F.text('contact.areaServed', 'Area served')], { cols: 2 })
      ];
    } },
    { id: 'seo', group: 'Settings', label: 'Search & sharing (SEO)', render: function () {
      var prev = h('div', { class: 'serp' });
      function draw() {
        var s = C().seo || {};
        u.clear(prev);
        prev.appendChild(h('span', { class: 'serp__url', text: (s.siteUrl || 'https://ayazkshaikh-maker.github.io/dreamz-planners/') }));
        prev.appendChild(h('span', { class: 'serp__title', text: (s.title || '').slice(0, 65) + ((s.title || '').length > 65 ? '…' : '') }));
        prev.appendChild(h('span', { class: 'serp__desc', text: (s.description || '').slice(0, 160) + ((s.description || '').length > 160 ? '…' : '') }));
      }
      draw();
      var g = F.group('Google & social preview', [
        F.text('seo.title', 'Page title', { count: 60 }), F.area('seo.description', 'Description', { count: 160, rows: 3 }),
        F.text('seo.siteUrl', 'Live site address', { type: 'url', placeholder: 'https://ayazkshaikh-maker.github.io/dreamz-planners/', hint: 'End with /. Leave empty to use the current address.' }),
        F.media('seo.ogImage', 'Share image (1200 × 630)', { kind: 'image' }),
        F.strings('seo.keywords', 'Keywords (for your reference)', { addLabel: 'Add keyword' })
      ]);
      g.addEventListener('input', draw);
      return [F.group('How it looks on Google', [prev]), g];
    } }
  ]);

  S.editorById = function (id) { return E.filter(function (e) { return e.id === id; })[0]; };
})();
