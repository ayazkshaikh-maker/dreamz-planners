/* Dreamz Planners — renders every chapter from the content model into <main>. */
(function () {
  'use strict';
  var DP = (window.DP = window.DP || {});
  var u = DP.u;

  var I = {
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 3.5h3.2l1.6 4.2-2.2 1.5a11 11 0 0 0 7.2 7.2l1.5-2.2 4.2 1.6V19a2 2 0 0 1-2.2 2A17 17 0 0 1 3 5.7 2 2 0 0 1 5 3.5Z"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 11.6a8.5 8.5 0 0 1-12.6 7.5L3.5 20.5l1.4-4.3a8.5 8.5 0 1 1 15.6-4.6Z"/><path d="M9 8.6c0 3.4 2.9 6.3 6.3 6.3l1.1-1.6-1.9-1-1 .8a4.6 4.6 0 0 1-2.6-2.6l.8-1-1-1.9Z" fill="currentColor" stroke="none"/></svg>',
    ig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none"/></svg>',
    spark: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.5c.6 4.6 2.9 6.9 7.5 7.5-4.6.6-6.9 2.9-7.5 7.5-.6-4.6-2.9-6.9-7.5-7.5 4.6-.6 6.9-2.9 7.5-7.5Z"/><path d="M19 15.5c.3 2 1.2 3 3 3.2-1.8.3-2.7 1.2-3 3.3-.3-2.1-1.2-3-3-3.3 1.8-.2 2.7-1.2 3-3.2Z" opacity=".7"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    ornament: '<svg viewBox="0 0 120 24" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true"><path d="M0 12h46M74 12h46"/><path d="M60 3c2 5 4 7 9 9-5 2-7 4-9 9-2-5-4-7-9-9 5-2 7-4 9-9Z" fill="currentColor" stroke="none"/><circle cx="50" cy="12" r="1.6" fill="currentColor"/><circle cx="70" cy="12" r="1.6" fill="currentColor"/></svg>',
    seal: '<svg viewBox="0 0 84 84" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><circle cx="42" cy="42" r="40" opacity=".35"/><circle cx="42" cy="42" r="32"/><path d="M28 43l9 9 19-21" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  DP.icons = I;

  function head(c, extra) {
    return '<div class="section__head">' +
      (c.eyebrow ? '<p class="eyebrow">' + u.esc(c.eyebrow) + '</p>' : '') +
      (c.title ? '<h2 class="display reveal-split">' + u.rich(c.title) + '</h2>' : '') +
      (c.intro ? '<p class="lede reveal-blur">' + u.rich(c.intro) + '</p>' : '') + (extra || '') + '</div>';
  }
  function igLink(handle, cls) {
    var hd = String(handle || '').replace(/^@/, '');
    return '<a class="' + (cls || '') + '" href="' + u.igUrl(hd) + '" target="_blank" rel="noopener">@' + u.esc(hd) + '</a>';
  }
  function section(id, cls, label) {
    return u.h('section', { id: id, class: 'section ' + (cls || id), 'aria-label': label || null, 'data-chapter': id });
  }
  function append(el, node) { el.appendChild(node); return node; }

  var R = {};

  R.hero = function (c, C) {
    var s = u.h('section', { id: 'hero', class: 'hero on-media', 'data-chapter': 'hero', 'aria-label': u.plain(c.headline) });
    var mediaWrap = append(s, u.h('div', { class: 'hero__media' }));
    var vid = u.media(c.video, { class: 'hero__video', poster: c.poster ? (DP.media.resolve(c.poster) || {}).src : '' });
    vid.setAttribute && vid.setAttribute('preload', 'metadata');
    mediaWrap.appendChild(vid);
    mediaWrap.appendChild(u.h('div', { class: 'hero__shade' }));
    var content = append(s, u.h('div', { class: 'hero__content' }));
    content.innerHTML = '<p class="eyebrow hero__eyebrow">' + u.esc(c.eyebrow) + '</p>';
    var h1 = u.h('h1', { class: 'hero__title split' });
    u.splitChars(h1, c.headline || C.brand.tagline);
    content.appendChild(h1);
    content.insertAdjacentHTML('beforeend',
      '<p class="hero__sub">' + u.rich(c.sub) + '</p>' +
      '<div class="hero__ctas">' +
      '<button type="button" class="btn btn--gold magnetic" data-action="' + u.esc((c.ctaPrimary || {}).action || 'wizard') + '">' + u.esc((c.ctaPrimary || {}).label || C.labels.planCta) + ' ' + I.arrow + '</button>' +
      (c.ctaSecondary && c.ctaSecondary.label ? '<button type="button" class="btn btn--ghost magnetic" data-action="' + u.esc(c.ctaSecondary.action || 'film') + '">' + I.play + ' ' + u.esc(c.ctaSecondary.label) + '</button>' : '') +
      '</div>');
    s.insertAdjacentHTML('beforeend', '<div class="hero__meta">' + u.credit(c.video) + '</div>' +
      (c.scrollCue ? '<div class="scroll-cue" aria-hidden="true">' + u.esc(c.scrollCue) + '<i></i></div>' : ''));
    return s;
  };

  R.promise = function (c) {
    var s = section('promise', 'promise', c.eyebrow);
    var inner = append(s, u.h('div', { class: 'promise__inner' }));
    inner.innerHTML = '<div class="promise__ornament">' + I.ornament + '</div><p class="eyebrow" style="justify-content:center">' + u.esc(c.eyebrow) + '</p>';
    var p = u.h('p', { class: 'promise__text' });
    u.splitWords(p, c.text);
    inner.appendChild(p);
    if (c.aside) inner.insertAdjacentHTML('beforeend', '<p class="promise__aside">' + u.esc(c.aside) + '</p>');
    return s;
  };

  R.behind = function (c) {
    var s = section('behind', 'behind', c.eyebrow);
    var stage = append(s, u.h('div', { class: 'behind__stage' }));
    stage.innerHTML = '<h2 class="behind__title"><span class="eyebrow">' + u.esc(c.eyebrow) + '</span><span class="rich">' + u.rich(c.title) + '</span></h2>';
    (c.side || []).slice(0, 2).forEach(function (id, i) {
      var d = append(stage, u.h('div', { class: 'behind__side behind__side--' + (i ? 'b' : 'a'), 'aria-hidden': 'true' }));
      d.appendChild(u.media(id, { still: true }));
    });
    var frame = append(stage, u.h('div', { class: 'behind__frame on-media' }));
    frame.appendChild(u.media(c.video, { label: c.videoLabel || 'The Dreamz Planners team at work before the guests arrive' }));
    frame.insertAdjacentHTML('beforeend', u.credit(c.video));
    stage.insertAdjacentHTML('beforeend', '<div class="behind__quote on-media"><blockquote>“' + u.esc(c.quote) + '”</blockquote>' +
      (c.body ? '<p>' + u.rich(c.body) + '</p>' : '') + '</div>');
    return s;
  };

  R.celebrations = function (c) {
    var s = section('celebrations', 'celebrations', c.eyebrow);
    s.innerHTML = head(c);
    var reel = append(s, u.h('div', { class: 'reel' }));
    var track = append(reel, u.h('div', { class: 'reel__track' }));
    (c.items || []).forEach(function (it, i) {
      var card = append(track, u.h('article', { class: 'reel__card on-media', 'aria-label': u.plain(it.name) }));
      card.appendChild(u.media(it.video || it.image, { label: null, fill: true }));
      card.insertAdjacentHTML('beforeend', u.credit(it.video || it.image, it.credit) +
        '<div class="reel__body"><span class="reel__num">' + String(i + 1).padStart(2, '0') + ' / ' + String(c.items.length).padStart(2, '0') + '</span>' +
        '<h3 class="reel__name">' + u.rich(it.name) + '</h3><p class="reel__sub">' + u.esc(it.subtitle) + '</p>' +
        '<p class="reel__desc">' + u.rich(it.description) + '</p></div>');
    });
    var end = append(track, u.h('div', { class: 'reel__card reel__card--end' }));
    end.innerHTML = '<p class="display" style="font-size:clamp(2.2rem,4vw,3.6rem)">' + u.rich(c.endTitle || '') + '</p><p class="lede">' + u.rich(c.endBody || '') + '</p><div style="margin-top:1.6rem"><button type="button" class="btn btn--gold magnetic" data-action="wizard">' + u.esc(DP.content.labels.planCta) + ' ' + I.arrow + '</button></div>';
    reel.insertAdjacentHTML('beforeend', '<div class="reel__progress" aria-hidden="true"><i></i></div>');
    return s;
  };

  R.weddings = function (c) {
    var s = section('weddings', 'weddings', c.eyebrow);
    s.innerHTML = head(c);
    var pool = [];
    (c.stories || []).forEach(function (st) { (st.gallery || []).forEach(function (g) { pool.push(g); }); });
    if (pool.length > 2) {
      s.insertAdjacentHTML('beforeend', '<div class="trail" data-trail aria-hidden="true"><div class="trail__word">' + u.esc(c.trailWord || '') + '</div>' +
        '<span class="trail__hint">' + u.esc(c.trailHint || '') + '</span></div>');
      s.querySelector('[data-trail]').dataset.pool = JSON.stringify(pool);
    }
    var list = append(s, u.h('div', { class: 'stories' }));
    (c.stories || []).forEach(function (st, i) {
      var compact = st.layout === 'compact' || (st.gallery || []).length < 2;
      var art = append(list, u.h('article', { class: 'story' + (compact ? ' story--compact' : ''), id: 'story-' + st.id }));
      var names = u.esc(st.couple).replace(/\s*&amp;\s*/, ' <span class="amp">&amp;</span> ');
      var credits = (st.credits || []).map(function (cr) { return '<li>' + u.esc(cr.role) + ' ' + igLink(cr.handle) + '</li>'; }).join('');
      var text = '<div class="story__text"><span class="story__num">' + String(i + 1).padStart(2, '0') + ' — ' + u.esc(st.event) + '</span>' +
        '<h3 class="story__couple">' + names + '</h3><p class="story__summary">' + u.rich(st.summary) + '</p>' +
        (credits ? '<ul class="story__credits">' + credits + '</ul>' : '') +
        ((st.gallery || []).length ? '<button type="button" class="btn btn--ghost btn--sm" data-gallery="' + i + '">' + u.esc(DP.content.labels.viewGallery) + ' · ' + st.gallery.length + '</button>' : '') + '</div>';
      art.insertAdjacentHTML('beforeend', text);
      var gal = (st.gallery || []).length ? st.gallery : [st.cover];
      var deck = u.h('button', { type: 'button', class: 'deck', 'data-gallery': i, 'data-cursor': 'View', 'aria-label': u.esc(DP.content.labels.viewGallery) + ': ' + u.plain(st.couple) });
      var cards = [st.cover].concat(gal.filter(function (g) { return g !== st.cover; })).slice(0, compact ? 1 : 4).reverse();
      cards.forEach(function (id) {
        var card = append(deck, u.h('div', { class: 'deck__card' }));
        card.appendChild(u.media(id, { still: true, thumb: compact, alt: '' }));
      });
      deck.insertAdjacentHTML('beforeend', (gal.length > 1 ? '<span class="deck__count on-media">' + gal.length + ' ' + u.esc(DP.content.labels.photos) + '</span>' : '') + u.credit(st.cover, (st.credits && st.credits[0]) ? st.credits[0].role + ' @' + String(st.credits[0].handle).replace(/^@/, '') : ''));
      art.appendChild(deck);
    });
    return s;
  };

  R.services = function (c) {
    var s = section('services', 'services', c.eyebrow);
    s.innerHTML = head(c);
    var list = append(s, u.h('div', { class: 'svc-list' }));
    (c.items || []).forEach(function (it, i) {
      var id = 'svc-' + (it.id || i);
      var el = append(list, u.h('div', { class: 'svc', 'data-media': it.media || '' }));
      el.innerHTML = '<h3 style="margin:0"><button type="button" class="svc__head" aria-expanded="false" aria-controls="' + id + '">' +
        '<span class="svc__num">' + String(i + 1).padStart(2, '0') + '</span><span class="svc__name">' + u.rich(it.name) + '</span><span class="svc__icon">' + I.plus + '</span></button></h3>' +
        '<div class="svc__panel" id="' + id + '" role="region"><div><div class="svc__body"><span></span><div><p>' + u.rich(it.summary) + '</p>' +
        (c.showPrices && it.price ? '<p class="svc__price">' + u.esc(it.price) + '</p>' : '') +
        '</div><div><ul>' + (it.includes || []).map(function (x) { return '<li>' + u.esc(x) + '</li>'; }).join('') + '</ul></div>' +
        '<div class="svc__media-m"></div></div></div></div>';
      if (it.media) el.querySelector('.svc__media-m').appendChild(u.media(it.media, { still: true }));
      el.querySelector('.svc__panel').setAttribute('inert', '');
    });
    var prev = append(s, u.h('div', { class: 'svc-preview', 'aria-hidden': 'true' }));
    (c.items || []).forEach(function (it) {
      if (!it.media) return;
      var img = u.media(it.media, { still: true });
      img.dataset.key = it.media;
      prev.appendChild(img);
    });
    return s;
  };

  R.estimator = function (c) {
    var s = section('estimator', 'estimator', c.eyebrow);
    s.innerHTML = head(c);
    s.insertAdjacentHTML('beforeend', '<div class="est" data-estimator></div>');
    return s;
  };

  R.process = function (c) {
    var s = section('process', 'process', c.eyebrow);
    s.innerHTML = head(c);
    var wrap = append(s, u.h('div', { class: 'process__wrap' }));
    wrap.innerHTML = '<div class="process__line" aria-hidden="true"><div class="process__fill"></div></div>' +
      '<ol class="process__steps">' + (c.steps || []).map(function (st, i) {
        return '<li class="step"><div class="step__node" aria-hidden="true">' + String(i + 1).padStart(2, '0') + '</div>' +
          '<div class="step__text"><h3 class="step__title">' + u.rich(st.title) + '</h3><p class="step__body">' + u.rich(st.body) + '</p></div></li>';
      }).join('') + '</ol>';
    return s;
  };

  R.vendors = function (c) {
    var s = section('vendors', 'vendors', c.eyebrow);
    var orbit = '<div class="orbit" aria-hidden="true"><svg viewBox="0 0 200 200"><defs><path id="orbitPath" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0"/></defs>' +
      '<text font-family="Marcellus, serif" font-size="15" letter-spacing="5" fill="currentColor"><textPath href="#orbitPath">THE VENDOR CIRCLE ✦ ATLANTA ✦ THE VENDOR CIRCLE ✦ </textPath></text>' +
      '<path d="M100 82c1.5 9 6 13.5 15 15-9 1.5-13.5 6-15 15-1.5-9-6-13.5-15-15 9-1.5 13.5-6 15-15Z" fill="currentColor"/></svg></div>';
    s.innerHTML = '<div class="section__head"><div>' + (c.eyebrow ? '<p class="eyebrow">' + u.esc(c.eyebrow) + '</p>' : '') +
      '<h2 class="display reveal-split">' + u.rich(c.title) + '</h2>' + (c.intro ? '<p class="lede reveal-blur">' + u.rich(c.intro) + '</p>' : '') + '</div>' + orbit + '</div>';
    var all = [];
    (c.items || []).forEach(function (g) { (g.handles || []).forEach(function (hd) { all.push({ cat: g.category, handle: hd }); }); });
    var half = Math.ceil(all.length / 2);
    [all.slice(0, half), all.slice(half)].forEach(function (row, r) {
      if (!row.length) return;
      var m = append(s, u.h('div', { class: 'marquee', 'data-dir': r ? '1' : '-1' }));
      var track = append(m, u.h('div', { class: 'marquee__track' }));
      track.innerHTML = row.map(function (v) {
        var hd = String(v.handle).replace(/^@/, '');
        return '<a class="marquee__item" href="' + u.igUrl(hd) + '" target="_blank" rel="noopener"><span class="marquee__handle">@' + u.esc(hd) + '</span><span class="marquee__cat">' + u.esc(v.cat) + '</span></a>';
      }).join('');
    });
    return s;
  };

  R.founders = function (c, C) {
    var s = section('founders', 'founders', c.eyebrow);
    s.innerHTML = head(c);
    var grid = append(s, u.h('div', { class: 'founders__grid' }));
    if (c.photo) {
      var fig = append(grid, u.h('figure', { class: 'founders__photo', style: 'margin:0' }));
      fig.appendChild(u.media(c.photo, { still: true, alt: c.photoCaption || '' }));
      fig.insertAdjacentHTML('beforeend', '<figcaption class="on-media"><span>' + u.esc(c.photoCaption || '') + '</span>' + u.credit(c.photo) + '</figcaption>');
    }
    var cards = append(grid, u.h('div', { class: 'founders__cards' }));
    (c.people || []).forEach(function (p) {
      var initials = String(p.name || '').split(/\s+/).map(function (w) { return w.charAt(0); }).join('').slice(0, 2);
      var card = append(cards, u.h('article', { class: 'fcard tilt' }));
      card.innerHTML = '<div class="fcard__mono" aria-hidden="true">' + u.esc(initials) + '</div><h3>' + u.esc(p.name) + '</h3><p class="fcard__role">' + u.esc(p.role) + '</p>' +
        '<div class="fcard__links">' + (p.phone ? '<a class="btn btn--gold btn--sm" href="' + u.telHref(p.phone) + '">' + I.phone + ' ' + u.esc(p.phone) + '</a>' : '') +
        (p.instagram ? '<a class="btn btn--ghost btn--sm" href="' + u.igUrl(p.instagram) + '" target="_blank" rel="noopener">' + I.ig + ' @' + u.esc(String(p.instagram).replace(/^@/, '')) + '</a>' : '') + '</div>';
      if (p.photo) { var mono = card.querySelector('.fcard__mono'); mono.innerHTML = ''; mono.appendChild(u.media(p.photo, { still: true, alt: '' })); }
    });
    var noPhones = (c.people || []).every(function (p) { return !p.phone; });
    if (noPhones) {
      cards.insertAdjacentHTML('beforeend', '<div class="studio-lines"><span>' + u.esc(C.labels.callUs) + '</span>' + (C.contact.phones || []).map(function (ph) {
        return '<a class="btn btn--ghost btn--sm" href="' + u.telHref(ph) + '">' + I.phone + ' ' + u.esc(ph.number) + '</a>';
      }).join('') + '</div>');
    }
    return s;
  };

  R.reviews = function (c) {
    var s = section('reviews', 'reviews', c.eyebrow);
    s.hidden = true; // shown only when real published reviews exist
    s.innerHTML = head(c) + '<div class="reviews__grid" data-reviews></div>';
    return s;
  };

  R.faq = function (c) {
    var s = section('faq', 'faq', c.eyebrow);
    s.innerHTML = head(c) + '<div class="faq__list">' + (c.items || []).map(function (q) {
      return '<details><summary>' + u.esc(q.q) + '</summary><p>' + u.rich(q.a) + '</p></details>';
    }).join('') + '</div>';
    return s;
  };

  R.begin = function (c, C) {
    var s = section('begin', 'begin', c.eyebrow);
    s.insertAdjacentHTML('beforeend', '<div class="begin__bg" aria-hidden="true"></div>');
    s.querySelector('.begin__bg').appendChild(u.media('still-ma-ballroom', { still: true, alt: '' }));
    s.insertAdjacentHTML('beforeend', head({ eyebrow: c.eyebrow, title: c.title, intro: c.body }));
    var phones = (C.contact.phones || []).map(function (ph) {
      return '<a class="btn btn--ghost" href="' + u.telHref(ph) + '">' + I.phone + ' ' + u.esc(C.labels.call) + ' ' + u.esc(ph.number) + '</a>';
    }).join('');
    s.insertAdjacentHTML('beforeend', '<div class="begin__grid">' +
      '<div class="panel" data-wizard-inline></div>' +
      '<div class="begin__side"><div class="panel"><h3 class="field-label">' + u.esc(c.dateCheckTitle) + '</h3><p class="hint" style="margin:0 0 14px">' + u.esc(c.dateCheckIntro) + '</p><div data-datecheck></div></div>' +
      '<div class="panel direct"><h3 class="field-label">' + u.esc(c.directTitle) + '</h3>' + phones +
      '<a class="btn btn--ghost" href="' + u.waHref(C.contact.whatsapp.number, C.contact.whatsapp.defaultMessage) + '" target="_blank" rel="noopener">' + I.chat + ' ' + u.esc(C.labels.whatsapp) + '</a>' +
      '<a class="btn btn--ghost" href="' + u.esc(C.contact.instagram.url) + '" target="_blank" rel="noopener">' + I.ig + ' @' + u.esc(C.contact.instagram.handle) + '</a>' +
      (C.contact.email ? '<a class="btn btn--ghost" href="mailto:' + u.esc(C.contact.email) + '">' + u.esc(C.contact.email) + '</a>' : '') +
      '</div></div></div>');
    return s;
  };

  function footer(C) {
    var f = u.h('footer', { class: 'footer', id: 'footer' });
    var phones = (C.contact.phones || []).map(function (ph) { return '<li><a href="' + u.telHref(ph) + '">' + u.esc(ph.number) + '</a></li>'; }).join('');
    var nav = (C.nav || []).map(function (n) { return '<li><a href="' + u.esc(n.href) + '">' + u.esc(n.label) + '</a></li>'; }).join('');
    var links = (C.footer.links || []).map(function (n) { return '<a href="' + u.esc(n.href) + '">' + u.esc(n.label) + '</a>'; }).join(' · ');
    var lg = C.brand.logo || {};
    var onErr = ' onerror="this.replaceWith(Object.assign(document.createElement(\'p\'),{className:\'display footer__logo-text\',textContent:\'' + u.esc(C.brand.name).replace(/'/g, '') + '\'}))"';
    f.innerHTML = '<div class="footer__grid"><div><img class="footer__logo logo-for-dark" src="' + u.esc(lg.stacked || lg.horizontal) + '" alt="' + u.esc(C.brand.name) + '"' + onErr + '>' +
      '<img class="footer__logo logo-for-light" src="' + u.esc(lg.stackedDark || lg.horizontalDark || lg.stacked || lg.horizontal) + '" alt=""' + onErr + '>' +
      '<p class="footer__tag">' + u.esc(C.brand.tagline) + '</p><p style="color:var(--muted);max-width:28rem;margin:0">' + u.esc(C.footer.note) + '</p></div>' +
      '<div><h3>Contact</h3><ul>' + phones + '<li><a href="' + u.waHref(C.contact.whatsapp.number, C.contact.whatsapp.defaultMessage) + '" target="_blank" rel="noopener">WhatsApp</a></li>' +
      '<li><a href="' + u.esc(C.contact.instagram.url) + '" target="_blank" rel="noopener">Instagram @' + u.esc(C.contact.instagram.handle) + '</a></li>' +
      (C.contact.email ? '<li><a href="mailto:' + u.esc(C.contact.email) + '">' + u.esc(C.contact.email) + '</a></li>' : '') +
      '<li style="color:var(--muted)">' + u.esc([C.contact.address, C.contact.city, C.contact.region].filter(Boolean).join(', ')) + '</li></ul></div>' +
      '<div><h3>Explore</h3><ul>' + nav + '<li><a href="#begin">' + u.esc(C.labels.planCta) + '</a></li></ul></div></div>' +
      '<p class="footer__big gold-text" aria-hidden="true">' + u.esc(C.brand.shortName || C.brand.name) + '</p>' +
      '<div class="footer__base"><span>' + u.esc(C.footer.copyright) + ' ' + new Date().getFullYear() + '</span><span>' + links + '</span>' +
      '<button type="button" class="totop" data-action="top">' + u.esc(C.labels.backToTop || 'Back to top') + ' <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg></button></div>';
    return f;
  }

  DP.render = function (C) {
    var main = document.getElementById('main');
    main.innerHTML = '';
    (C.sections || []).forEach(function (sec) {
      if (!sec || sec.visible === false || !R[sec.id] || !C[sec.id]) return;
      try { main.appendChild(R[sec.id](C[sec.id], C)); }
      catch (e) { console.error('[dp] render failed for', sec.id, e); }
    });
    var old = document.getElementById('footer');
    if (old) old.remove();
    main.insertAdjacentElement('afterend', footer(C));
  };
})();
