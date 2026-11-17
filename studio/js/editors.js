/* Dreamz Studio — one editor per part of the content model (see content/SCHEMA.md). */
(function () {
  'use strict';
  var S = (window.Studio = window.Studio || {});
  var u = S.u, h = u.h, F = S.F;
  function C() { return S.state.content; }
  function head(base) { return [F.text(base + '.eyebrow', 'Eyebrow (small caps line)'), F.text(base + '.title', 'Title', { rich: true })]; }
  function plain(s) { return String(s || '').replace(/\*/g, ''); }

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

  var PRESETS = [
    { name: 'Midnight Gold', colors: { ink: '#0E0A14', plum: '#2A1238', aubergine: '#45194F', rani: '#C2185B', gold: '#D4A853', goldDeep: '#9C7430', champagne: '#F1DFB6', ivory: '#FAF5EC' }, fonts: { display: 'Cormorant Garamond', label: 'Marcellus', body: 'Manrope', script: 'Pinyon Script' } },
    { name: 'Rani Night', colors: { ink: '#14060E', plum: '#3A0C26', aubergine: '#5C1238', rani: '#E0407A', gold: '#E6B85C', goldDeep: '#A67C2E', champagne: '#F6D9C0', ivory: '#FFF4F0' }, fonts: { display: 'Playfair Display', label: 'Cinzel', body: 'Manrope', script: 'Great Vibes' } },
    { name: 'Ivory Day', colors: { ink: '#F8F1E6', plum: '#EFE3D3', aubergine: '#E4D2C0', rani: '#A3124A', gold: '#8C6420', goldDeep: '#6E5020', champagne: '#5A3E1C', ivory: '#24141F' }, fonts: { display: 'Cormorant Garamond', label: 'Marcellus', body: 'Manrope', script: 'Pinyon Script' } },
    { name: 'Emerald Mehndi', colors: { ink: '#07130F', plum: '#0F2A22', aubergine: '#1A3D30', rani: '#C2185B', gold: '#D9B45E', goldDeep: '#9C7430', champagne: '#EBDDB3', ivory: '#F7F3E8' }, fonts: { display: 'Bodoni Moda', label: 'Marcellus', body: 'DM Sans', script: 'Parisienne' } }
  ];

  var sectionIds = function () { return (C().sections || []).map(function (s) { return s.id; }).filter(function (id) { return id !== 'preloader'; }); };

  var E = (S.editors = [
    /* ---------------- Look ---------------- */
    { id: 'brand', group: 'Look & feel', label: 'Brand & logos', render: function () {
      return [
        F.group('Name', [F.text('brand.name', 'Business name'), F.text('brand.shortName', 'Short name (giant footer word)'), F.text('brand.tagline', 'Tagline')]),
        F.group('Logos', [
          F.media('brand.logo.horizontal', 'Header logo (gold, for dark backgrounds)', { kind: 'image', hint: 'SVG or transparent PNG/WebP works best. Falls back to the name in text if it cannot load.' }),
          F.media('brand.logo.stacked', 'Footer logo (stacked)', { kind: 'image' }),
          F.media('brand.logo.horizontalDark', 'Logo for light backgrounds', { kind: 'image' }),
          F.media('brand.logo.mark', 'Monogram mark', { kind: 'image' }),
          F.media('brand.logo.mark3d', '3D logo render', { kind: 'image' })
        ]),
        F.group('Browser icon', [F.media('brand.favicon', 'Favicon (square, 512 px PNG or SVG)', { kind: 'image', hint: 'Shown in the browser tab. Leave empty to keep the built-in DP icon.' })])
      ];
    } },
    { id: 'theme', group: 'Look & feel', label: 'Colours & fonts', render: function () {
      loadFontSamples();
      var warn = h('div', { class: 'contrast' });
      function check() {
        var c = C().theme.colors, rows = [
          ['Body text on page background', c.ivory, c.ink, 4.5], ['Champagne text on background', c.champagne, c.ink, 4.5],
          ['Gold accents on background', c.gold, c.ink, 3], ['Button text on gold', c.ink, c.gold, 4.5], ['Text on plum cards', c.ivory, c.plum, 4.5]
        ];
        u.clear(warn);
        rows.forEach(function (r) {
          var k = u.contrast(r[1], r[2]); if (k == null) return;
          var good = k >= r[3];
          warn.appendChild(h('div', { class: 'contrast__row ' + (good ? 'is-ok' : 'is-bad') }, [
            h('span', { class: 'contrast__sample', style: { color: r[1], background: r[2] }, text: 'Aa' }),
            h('span', { text: r[0] }), h('strong', { text: k.toFixed(1) + ':1' }), h('em', { text: good ? 'OK' : 'Too low — hard to read' })
          ]));
        });
      }
      var presetRow = h('div', { class: 'presets' }, PRESETS.map(function (p) {
        return h('button', { type: 'button', class: 'preset', onclick: function () {
          C().theme.colors = Object.assign({}, p.colors); C().theme.fonts = Object.assign({}, p.fonts); S.changed('theme'); S.rerender(); u.toast(p.name + ' applied — save or publish to keep it', 'ok');
        } }, [h('span', { class: 'preset__dots' }, ['ink', 'plum', 'rani', 'gold', 'ivory'].map(function (k) { return h('i', { style: { background: p.colors[k] } }); })), h('span', { class: 'preset__name', text: p.name, style: { fontFamily: "'" + p.fonts.display + "', serif" } })]);
      }));
      var colorLabels = { ink: 'Page background (ink)', plum: 'Surfaces (plum)', aubergine: 'Gradients & hover (aubergine)', rani: 'Accent pink (rani)', gold: 'Gold (lines, buttons)', goldDeep: 'Gold shadow', champagne: 'Light accent text (champagne)', ivory: 'Main text (ivory)' };
      var colors = Object.keys(colorLabels).map(function (k) { return F.color('theme.colors.' + k, colorLabels[k], { onchange: check }); });
      check();
      function fontSel(key, label) {
        var sample = h('p', { class: 'font-sample', text: key === 'script' ? 'Forever & always' : key === 'body' ? 'From the first setup to the final dance.' : 'Dreamz Planners' });
        function upd() { sample.style.fontFamily = "'" + C().theme.fonts[key] + "'"; }
        upd();
        return F.select('theme.fonts.' + key, label, FONTS[key].map(function (f) { return { value: f, label: f, font: f }; }), { onchange: upd, extra: sample });
      }
      return [
        F.group('Presets', [presetRow], { intro: 'One tap sets all colours and fonts. You can fine-tune afterwards. Light presets (Ivory Day) turn the text dark — check the hero over video in the preview before publishing.' }),
        F.group('Colours', colors, { cols: 2 }),
        F.group('Readability check', [warn], { intro: 'WCAG AA: 4.5:1 for text, 3:1 for large accents.' }),
        F.group('Fonts', [fontSel('display', 'Display (headlines)'), fontSel('label', 'Labels & wordmark'), fontSel('body', 'Body text'), fontSel('script', 'Script accent')], { cols: 2 }),
        F.group('Effects', [
          F.toggle('theme.effects.grain', 'Film grain', { hint: 'Subtle texture over the page' }),
          F.toggle('theme.effects.vignette', 'Vignette', { hint: 'Soft dark edges' }),
          F.toggle('theme.effects.particles', 'Gold dust', { hint: 'Floating particles' }),
          F.toggle('theme.effects.cursor', 'Custom cursor', { hint: 'Desktop only' }),
          F.toggle('theme.effects.smoothScroll', 'Smooth scrolling', { hint: 'Cinematic scroll feel' })
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
        F.group('Background video', [F.media('hero.video', 'Hero video loop', { kind: 'video' })]),
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
