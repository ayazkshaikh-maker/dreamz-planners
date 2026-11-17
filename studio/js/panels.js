/* Dreamz Studio — management panels: leads inbox, availability calendar, reviews, publish & history.
   Leads are untrusted visitor input: rendered with textContent only, CSV cells are formula-safe. */
(function () {
  'use strict';
  var S = (window.Studio = window.Studio || {});
  var u = S.u, h = u.h, F = S.F;
  var P = (S.panels = {});
  function B() { return S.backend; }
  function C() { return S.state.content; }

  function head(title, intro, tools) {
    return h('div', { class: 'panel-head' }, [h('div', {}, [h('h2', { class: 'panel-title', text: title }), intro ? h('p', { class: 'muted', text: intro }) : null]), tools ? h('div', { class: 'row' }, tools) : null]);
  }
  function localBanner(text) { return B().mode === 'local' ? F.note(text, 'warn') : null; }

  /* =============== LEADS =============== */
  var STATUSES = ['new', 'contacted', 'booked', 'lost'];
  var L = { rows: [], filter: 'all', q: '' };
  P.leadsCount = function () { return L.rows.filter(function (r) { return r.status === 'new'; }).length; };
  P.loadLeads = function () {
    return B().leads().then(function (rows) { L.rows = rows || []; S.updateBadges(); return L.rows; }).catch(function (e) { u.toast('Leads: ' + e.message, 'err'); return L.rows; });
  };
  function digits(p) { var d = String(p || '').replace(/\D/g, ''); if (d.length === 10) d = '1' + d; return d; }
  function waLink(r) {
    var first = String(r.name || '').trim().split(/\s+/)[0] || 'there';
    var msg = 'Hi ' + first + ', this is ' + (C().brand.name || 'Dreamz Planners') + '. Thank you for your inquiry' + (r.event_type ? ' about your ' + r.event_type : '') + (r.event_date ? ' on ' + u.fmtDate(r.event_date + 'T12:00:00') : '') + '. When is a good time to talk?';
    return 'https://wa.me/' + digits(r.phone) + '?text=' + encodeURIComponent(msg);
  }
  function csvCell(v) {
    var s = Array.isArray(v) ? v.join('; ') : v == null ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }
  function exportCsv(rows) {
    var cols = ['created_at', 'status', 'name', 'phone', 'email', 'event_type', 'event_date', 'guests', 'services', 'budget', 'message', 'source', 'notes'];
    var lines = [cols.join(',')].concat(rows.map(function (r) { return cols.map(function (c) { return csvCell(r[c]); }).join(','); }));
    u.download('dreamz-leads-' + u.ymd(new Date()) + '.csv', '﻿' + lines.join('\r\n'), 'text/csv;charset=utf-8');
  }
  function pill(status) { return h('span', { class: 'pill pill--' + status, text: status }); }

  P.leads = function (root) {
    var list = h('div', { class: 'leads' });
    var filters = h('div', { class: 'seg', role: 'tablist', 'aria-label': 'Filter by status' });
    var search = h('input', { class: 'input', type: 'search', placeholder: 'Search name, phone, email, message…', 'aria-label': 'Search leads', value: L.q });
    search.addEventListener('input', u.debounce(function () { L.q = search.value.toLowerCase(); draw(); }, 150));
    root.appendChild(head('Leads inbox', 'Every inquiry from the website, newest first.', [
      u.btn('Refresh', { small: true, kind: 'ghost', icon: 'reload', onclick: function () { P.loadLeads().then(draw); } }),
      u.btn('Export CSV', { small: true, kind: 'outline', icon: 'download', onclick: function () { exportCsv(visible()); } })
    ]));
    var lb = localBanner('Local mode: showing inquiries saved on this device only (visitors whose connection failed). Sign in to the live Studio to see every lead.');
    if (lb) root.appendChild(lb);
    root.appendChild(h('div', { class: 'toolbar' }, [filters, search]));
    root.appendChild(list);

    function visible() {
      return L.rows.filter(function (r) {
        if (L.filter !== 'all' && r.status !== L.filter) return false;
        if (!L.q) return true;
        return [r.name, r.phone, r.email, r.event_type, r.message, r.notes, r.budget].join(' ').toLowerCase().indexOf(L.q) >= 0;
      });
    }
    function drawFilters() {
      u.clear(filters);
      ['all'].concat(STATUSES).forEach(function (s) {
        var n = s === 'all' ? L.rows.length : L.rows.filter(function (r) { return r.status === s; }).length;
        filters.appendChild(h('button', { type: 'button', role: 'tab', class: 'seg__btn', 'aria-selected': String(L.filter === s), onclick: function () { L.filter = s; draw(); } }, [u.human(s) + ' ', h('span', { class: 'seg__n', text: String(n) })]));
      });
    }
    function draw() {
      drawFilters();
      u.clear(list);
      var rows = visible();
      if (!rows.length) { list.appendChild(h('div', { class: 'empty-state' }, [h('p', { class: 'display-sm', text: L.rows.length ? 'No leads match.' : 'No inquiries yet.' }), h('p', { class: 'muted', text: L.rows.length ? 'Try another filter.' : 'When someone sends the inquiry form, it lands here.' })])); return; }
      var table = h('div', { class: 'ltable', role: 'table', 'aria-label': 'Leads' });
      table.appendChild(h('div', { class: 'ltable__row ltable__head', role: 'row' }, ['Received', 'Name', 'Event', 'Date', 'Guests', 'Status'].map(function (t) { return h('span', { role: 'columnheader', text: t }); })));
      rows.forEach(function (r) {
        var row = h('button', { type: 'button', class: 'ltable__row' + (r.status === 'new' ? ' is-new' : ''), role: 'row', onclick: function () { drawer(r); } }, [
          h('span', { role: 'cell', class: 'ltable__when', text: u.fmtDate(r.created_at, true) }),
          h('span', { role: 'cell', class: 'ltable__name' }, [h('strong', { text: r.name || '(no name)' }), h('small', { text: r.phone || r.email || '' })]),
          h('span', { role: 'cell', text: r.event_type || '—' }),
          h('span', { role: 'cell', text: r.event_date ? u.fmtDate(r.event_date + 'T12:00:00') : (r.payload && r.payload.flexible ? 'Flexible' : '—') }),
          h('span', { role: 'cell', text: r.guests != null ? String(r.guests) : '—' }),
          h('span', { role: 'cell' }, [pill(r.status)])
        ]);
        table.appendChild(row);
      });
      list.appendChild(table);
    }
    function drawer(r) {
      var m = u.modal({ title: r.name || 'Lead', wide: false });
      m.el.classList.add('modal--drawer');
      function dl(label, value) { return value == null || value === '' || (Array.isArray(value) && !value.length) ? null : h('div', { class: 'dl__row' }, [h('dt', { text: label }), h('dd', { text: Array.isArray(value) ? value.join(', ') : String(value) })]); }
      var p = r.payload || {};
      var contact = h('div', { class: 'row row--wrap' }, [
        r.phone ? h('a', { class: 'btn btn--gold btn--sm', href: waLink(r), target: '_blank', rel: 'noopener' }, [u.icon('wa'), h('span', { text: 'Reply on WhatsApp' })]) : null,
        r.phone ? h('a', { class: 'btn btn--outline btn--sm', href: 'tel:+' + digits(r.phone) }, [u.icon('call'), h('span', { text: 'Call' })]) : null,
        r.email ? h('a', { class: 'btn btn--outline btn--sm', href: 'mailto:' + encodeURIComponent(r.email).replace(/%40/g, '@') + '?subject=' + encodeURIComponent('Your celebration — ' + (C().brand.name || 'Dreamz Planners')) }, [u.icon('mail'), h('span', { text: 'Email' })]) : null
      ]);
      var statusRow = h('div', { class: 'seg seg--status', role: 'radiogroup', 'aria-label': 'Status' });
      function drawStatus() {
        u.clear(statusRow);
        STATUSES.forEach(function (s) {
          statusRow.appendChild(h('button', { type: 'button', role: 'radio', class: 'seg__btn seg__btn--' + s, 'aria-checked': String(r.status === s), text: u.human(s), onclick: function () {
            var old = r.status; r.status = s; drawStatus();
            B().updateLead(r.id, { status: s }).then(function () { u.toast('Marked ' + s, 'ok'); draw(); S.updateBadges(); }).catch(function (e) { r.status = old; drawStatus(); u.toast(e.message, 'err'); });
          } }));
        });
      }
      drawStatus();
      var notes = h('textarea', { class: 'input', rows: 4, maxlength: 4000, placeholder: 'Private notes — only you see these', 'aria-label': 'Notes' });
      notes.value = r.notes || '';
      var saveNotes = u.btn('Save notes', { small: true, kind: 'outline', onclick: function () {
        B().updateLead(r.id, { notes: notes.value }).then(function () { r.notes = notes.value; u.toast('Notes saved', 'ok'); }).catch(function (e) { u.toast(e.message, 'err'); });
      } });
      u.append(m.body, [
        h('p', { class: 'muted', text: 'Received ' + u.fmtDate(r.created_at, true) + (r.source ? ' · ' + r.source : '') }),
        contact,
        h('h3', { class: 'group__title', text: 'Status' }), statusRow,
        h('h3', { class: 'group__title', text: 'Details' }),
        h('dl', { class: 'dl' }, [dl('Phone', r.phone), dl('Email', r.email), dl('Events', r.event_type), dl('Event date', r.event_date ? u.fmtDate(r.event_date + 'T12:00:00') : p.flexible ? 'Flexible / not set' : ''), dl('Guests', r.guests), dl('Services', r.services), dl('Budget', r.budget), dl('Prefers', p.contactMethod), dl('Message', r.message)]),
        p.estimator ? h('details', { class: 'details' }, [h('summary', { text: 'Celebration builder result' }), h('pre', { class: 'code', text: JSON.stringify(p.estimator, null, 2) })]) : null,
        h('h3', { class: 'group__title', text: 'Notes' }), notes, h('div', { class: 'row' }, [saveNotes])
      ]);
      m.foot.appendChild(u.btn('Delete lead', { kind: 'danger', small: true, icon: 'trash', onclick: function () {
        u.confirm({ title: 'Delete this lead?', body: 'The inquiry from ' + (r.name || 'this visitor') + ' will be deleted permanently. This cannot be undone — export a CSV first if you need a record.', ok: 'Delete permanently', danger: true }).then(function (yes) {
          if (!yes) return;
          B().deleteLead(r.id).then(function () { L.rows = L.rows.filter(function (x) { return x.id !== r.id; }); m.close(); draw(); S.updateBadges(); u.toast('Lead deleted', 'ok'); }).catch(function (e) { u.toast(e.message, 'err'); });
        });
      } }));
      m.foot.appendChild(u.btn('Close', { kind: 'ghost', small: true, onclick: function () { m.close(); } }));
    }
    draw();
    P.loadLeads().then(draw);
  };

  /* =============== AVAILABILITY =============== */
  var cal = { month: null, days: {}, selected: null };
  var CYCLE = ['', 'open', 'limited', 'booked'];
  P.calendar = function (root) {
    if (!cal.month) { var d = new Date(); cal.month = new Date(d.getFullYear(), d.getMonth(), 1); }
    var title = h('h3', { class: 'cal__title' });
    var gridEl = h('div', { class: 'cal__grid', role: 'grid' });
    var side = h('div', { class: 'cal__side' });
    root.appendChild(head('Availability', 'Tap a day to cycle: open → limited → booked → clear. Visitors see this in the date check.'));
    var lb = localBanner('Local mode: dates are stored in your draft content. Publish to show them on the page.');
    if (lb) root.appendChild(lb);
    root.appendChild(h('div', { class: 'cal' }, [
      h('div', { class: 'cal__main' }, [
        h('div', { class: 'cal__nav' }, [
          u.btn('', { small: true, kind: 'ghost', icon: 'back', title: 'Previous month', onclick: function () { cal.month = new Date(cal.month.getFullYear(), cal.month.getMonth() - 1, 1); load(); } }),
          title,
          h('button', { type: 'button', class: 'btn btn--ghost btn--sm', 'aria-label': 'Next month', onclick: function () { cal.month = new Date(cal.month.getFullYear(), cal.month.getMonth() + 1, 1); load(); } }, [h('span', { class: 'flip' }, [u.icon('back')])])
        ]),
        h('div', { class: 'cal__legend' }, ['open', 'limited', 'booked'].map(function (s) { return h('span', { class: 'legend legend--' + s, text: u.human(s) }); })),
        gridEl
      ]),
      side
    ]));

    function range() { var y = cal.month.getFullYear(), m = cal.month.getMonth(); return [u.ymd(new Date(y, m, 1)), u.ymd(new Date(y, m + 1, 0))]; }
    function load() {
      var r = range();
      if (B().mode === 'local') { cal.days = {}; (C().availability || []).forEach(function (a) { cal.days[a.day] = a; }); draw(); return; }
      draw();
      B().availability(r[0], r[1]).then(function (rows) { (rows || []).forEach(function (a) { cal.days[a.day] = a; }); draw(); }).catch(function (e) { u.toast('Availability: ' + e.message, 'err'); });
    }
    var chain = Promise.resolve();
    function write(day, status, note) {
      if (status) cal.days[day] = { day: day, status: status, note: note || '' }; else delete cal.days[day];
      if (B().mode === 'local') {
        var list = Object.keys(cal.days).sort().map(function (k) { return cal.days[k]; }).concat((C().availability || []).filter(function (a) { return !cal.days[a.day] && a.day !== day; }));
        C().availability = list.filter(function (a, i, arr) { return arr.findIndex(function (b) { return b.day === a.day; }) === i; }).sort(function (a, b) { return a.day < b.day ? -1 : 1; });
        S.changed('availability');
        return;
      }
      chain = chain.then(function () { return B().setDay(day, status, note); }).catch(function (e) { u.toast('Could not save ' + day + ': ' + e.message, 'err'); load(); });
    }
    function draw() {
      title.textContent = cal.month.toLocaleString(undefined, { month: 'long', year: 'numeric' });
      u.clear(gridEl);
      ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(function (d) { gridEl.appendChild(h('span', { class: 'cal__dow', text: d })); });
      var y = cal.month.getFullYear(), m = cal.month.getMonth(), first = new Date(y, m, 1).getDay(), n = new Date(y, m + 1, 0).getDate(), today = u.ymd(new Date());
      for (var i = 0; i < first; i++) gridEl.appendChild(h('span', { class: 'cal__pad' }));
      for (var d = 1; d <= n; d++) (function (d) {
        var key = u.ymd(new Date(y, m, d)), a = cal.days[key], st = a ? a.status : '';
        var cell = h('button', { type: 'button', class: 'cal__day' + (st ? ' is-' + st : '') + (key < today ? ' is-past' : '') + (key === today ? ' is-today' : '') + (cal.selected === key ? ' is-sel' : ''), 'aria-label': key + (st ? ', ' + st : ', not set'), onclick: function () {
          var next = CYCLE[(CYCLE.indexOf(st) + 1) % CYCLE.length];
          cal.selected = key; write(key, next, a && a.note); draw();
        } }, [h('span', { class: 'cal__n', text: String(d) }), a && a.note ? h('span', { class: 'cal__dot', title: a.note }) : null, st ? h('span', { class: 'cal__st', text: st }) : null]);
        gridEl.appendChild(cell);
      })(d);
      drawSide();
    }
    function drawSide() {
      u.clear(side);
      if (!cal.selected) { side.appendChild(h('p', { class: 'muted', text: 'Select a day to add a note (for example "Morning only" or "Hold for Patel family").' })); return; }
      var a = cal.days[cal.selected];
      side.appendChild(h('h3', { class: 'group__title', text: u.fmtDate(cal.selected + 'T12:00:00') }));
      var seg = h('div', { class: 'seg' });
      CYCLE.forEach(function (s) {
        seg.appendChild(h('button', { type: 'button', class: 'seg__btn seg__btn--' + (s || 'clear'), 'aria-pressed': String((a ? a.status : '') === s), text: s ? u.human(s) : 'Clear', onclick: function () { write(cal.selected, s, a && a.note); draw(); } }));
      });
      var note = h('input', { class: 'input', maxlength: 200, placeholder: 'Optional note (visible to you only in the Studio)', value: (a && a.note) || '', disabled: !a, 'aria-label': 'Note for this day' });
      side.appendChild(seg);
      side.appendChild(h('label', { class: 'field' }, [h('span', { class: 'field__label', text: 'Note' }), note]));
      side.appendChild(u.btn('Save note', { small: true, kind: 'outline', disabled: !a, onclick: function () { write(cal.selected, a.status, note.value); u.toast('Note saved', 'ok'); draw(); } }));
    }
    load();
  };

  /* =============== REVIEWS =============== */
  P.reviews = function (root) {
    var box = h('div', { class: 'rev-list' });
    var rows = [];
    root.appendChild(head('Reviews', 'Kind words shown in chapter 10. The chapter appears once one review is published.', [u.btn('Add review', { kind: 'gold', small: true, icon: 'plus', onclick: function () { edit({ author: '', event: '', body: '', rating: 5, published: false }); } })]));
    root.appendChild(F.note('Only add real words from real clients, with their permission. Never write or edit a review on someone\'s behalf.', 'warn'));
    var lb = localBanner('Local mode: reviews are stored in your draft content (as the page\'s fallback list). Publish to show them.');
    if (lb) root.appendChild(lb);
    root.appendChild(box);

    function localItems() { var it = (C().reviews && C().reviews.items) || []; it.forEach(function (r, i) { if (!r.id) r.id = u.uid('rev'); r.sort = i; }); return it; }
    function load() {
      if (B().mode === 'local') { rows = localItems(); draw(); return; }
      B().reviews().then(function (r) { rows = r || []; draw(); }).catch(function (e) { u.toast('Reviews: ' + e.message, 'err'); });
    }
    function save(r) {
      if (B().mode === 'local') {
        var items = localItems().slice(); var i = items.findIndex(function (x) { return x.id === r.id; });
        var clean = { id: r.id || u.uid('rev'), author: r.author, event: r.event, body: r.body, rating: +r.rating || 5, published: !!r.published };
        if (i >= 0) items[i] = clean; else items.push(clean);
        C().reviews.items = items; S.changed('reviews.items'); rows = items; draw(); return Promise.resolve();
      }
      if (!r.id) r.sort = rows.length ? Math.max.apply(null, rows.map(function (x) { return x.sort || 0; })) + 1 : 0;
      return B().saveReview(r).then(function () { load(); });
    }
    function remove(r) {
      return u.confirm({ title: 'Delete this review?', body: 'The review by ' + (r.author || 'this client') + ' will be deleted permanently.', ok: 'Delete', danger: true }).then(function (yes) {
        if (!yes) return;
        if (B().mode === 'local') { C().reviews.items = localItems().filter(function (x) { return x.id !== r.id; }); S.changed('reviews.items'); load(); return; }
        B().deleteReview(r.id).then(function () { u.toast('Deleted', 'ok'); load(); }).catch(function (e) { u.toast(e.message, 'err'); });
      });
    }
    function move(from, to) {
      var a = rows.slice(); var it = a.splice(from, 1)[0]; a.splice(to, 0, it); rows = a;
      if (B().mode === 'local') { C().reviews.items = a; S.changed('reviews.items'); draw(); return; }
      draw();
      Promise.all(a.map(function (r, i) { if (r.sort === i) return null; r.sort = i; return B().saveReview(r); })).then(function () { u.toast('Order saved', 'ok'); }).catch(function (e) { u.toast(e.message, 'err'); load(); });
    }
    function draw() {
      u.clear(box);
      if (!rows.length) { box.appendChild(h('div', { class: 'empty-state' }, [h('p', { class: 'display-sm', text: 'No reviews yet.' }), h('p', { class: 'muted', text: 'When a couple sends you kind words, add them here and switch on "Published".' })])); return; }
      rows.forEach(function (r, i) {
        var handle = h('span', { class: 'grip', 'aria-hidden': 'true' }, [u.icon('grip')]);
        var pub = h('input', { type: 'checkbox', role: 'switch', checked: !!r.published, 'aria-label': 'Published' });
        pub.addEventListener('change', function () { r.published = pub.checked; save(r).then(function () { u.toast(r.published ? 'Published' : 'Unpublished', 'ok'); }).catch(function (e) { u.toast(e.message, 'err'); }); });
        var card = h('div', { class: 'rev' + (r.published ? '' : ' is-draft') }, [
          handle,
          h('div', { class: 'rev__main' }, [
            h('p', { class: 'rev__stars', 'aria-label': (r.rating || 0) + ' of 5 stars', text: '★★★★★'.slice(0, r.rating || 0) + '☆☆☆☆☆'.slice(0, 5 - (r.rating || 0)) }),
            h('blockquote', { class: 'rev__body', text: r.body || '' }),
            h('p', { class: 'rev__by', text: '— ' + (r.author || '?') + (r.event ? ', ' + r.event : '') })
          ]),
          h('div', { class: 'rev__tools' }, [
            h('label', { class: 'switch switch--inline', title: 'Published' }, [pub, h('span', { class: 'switch__track', 'aria-hidden': 'true' }), h('span', { class: 'switch__text' }, [h('small', { text: r.published ? 'Live' : 'Hidden' })])]),
            h('button', { type: 'button', class: 'icon-btn icon-btn--sm', 'aria-label': 'Move up', disabled: i === 0, onclick: function () { move(i, i - 1); } }, [u.icon('up', 14)]),
            h('button', { type: 'button', class: 'icon-btn icon-btn--sm', 'aria-label': 'Move down', disabled: i === rows.length - 1, onclick: function () { move(i, i + 1); } }, [u.icon('down', 14)]),
            u.btn('Edit', { small: true, kind: 'ghost', onclick: function () { edit(r); } }),
            h('button', { type: 'button', class: 'icon-btn icon-btn--sm icon-btn--danger', 'aria-label': 'Delete', onclick: function () { remove(r); } }, [u.icon('trash', 14)])
          ])
        ]);
        F.dragify(card, i, move, handle);
        box.appendChild(card);
      });
    }
    function edit(r) {
      var m = u.modal({ title: r.id ? 'Edit review' : 'Add a review' });
      var author = h('input', { class: 'input', maxlength: 120, value: r.author || '', placeholder: 'e.g. Mahnoor & Faraz', autofocus: true });
      var event = h('input', { class: 'input', maxlength: 120, value: r.event || '', placeholder: 'e.g. Wedding, March 2026' });
      var body = h('textarea', { class: 'input', rows: 6, maxlength: 3000, placeholder: 'Paste their words exactly as they wrote them' }); body.value = r.body || '';
      var rating = h('select', { class: 'input' }, [5, 4, 3, 2, 1].map(function (n) { return h('option', { value: n, text: n + ' star' + (n > 1 ? 's' : '') }); })); rating.value = r.rating || 5;
      var pub = h('input', { type: 'checkbox', role: 'switch', checked: !!r.published });
      u.append(m.body, [
        F.note('Only real client words, used with permission.', 'warn'),
        h('label', { class: 'field' }, [h('span', { class: 'field__label', text: 'Client name' }), author]),
        h('label', { class: 'field' }, [h('span', { class: 'field__label', text: 'Event' }), event]),
        h('label', { class: 'field' }, [h('span', { class: 'field__label', text: 'Their words' }), body]),
        h('label', { class: 'field' }, [h('span', { class: 'field__label', text: 'Rating' }), rating]),
        h('label', { class: 'switch' }, [pub, h('span', { class: 'switch__track', 'aria-hidden': 'true' }), h('span', { class: 'switch__text' }, [h('strong', { text: 'Published' }), h('small', { text: 'Show it on the website' })])])
      ]);
      m.foot.appendChild(u.btn('Cancel', { kind: 'ghost', onclick: function () { m.close(); } }));
      m.foot.appendChild(u.btn('Save review', { kind: 'gold', onclick: function () {
        if (!author.value.trim() || !body.value.trim()) { u.toast('Name and words are both needed', 'err'); return; }
        save(Object.assign({}, r, { author: author.value.trim(), event: event.value.trim(), body: body.value.trim(), rating: +rating.value, published: pub.checked }))
          .then(function () { m.close(); u.toast('Review saved', 'ok'); }).catch(function (e) { u.toast(e.message, 'err'); });
      } }));
    }
    load();
  };

  /* =============== PUBLISH & HISTORY =============== */
  P.publish = function (root) {
    var status = h('div', { class: 'pubcard' });
    var hist = h('div', { class: 'hist' });
    root.appendChild(head('Publish & history', 'Drafts are private. Publishing updates the live website for everyone.'));
    root.appendChild(status);
    function drawStatus() {
      u.clear(status);
      var dirty = S.isDirty();
      u.append(status, [
        h('div', { class: 'pubcard__state' }, [h('span', { class: 'dot ' + (dirty ? 'dot--warn' : 'dot--ok') }), h('strong', { text: dirty ? 'You have unsaved changes' : 'Everything is saved' }), h('small', { class: 'muted', text: B().mode === 'local' ? 'Local mode — saved in this browser only' : 'Connected to the live database' })]),
        h('div', { class: 'row row--wrap' }, [
          u.btn('Save draft', { kind: 'outline', onclick: function () { S.saveDraft().then(drawStatus); } }),
          u.btn('Publish to website', { kind: 'gold', onclick: function () { S.publish().then(function () { drawStatus(); loadHist(); }); } }),
          h('a', { class: 'btn btn--ghost', href: B().mode === 'local' ? '../index.html?preview=local' : '../index.html', target: '_blank', rel: 'noopener' }, [u.icon('external'), h('span', { text: B().mode === 'local' ? 'Open local published page' : 'Open live website' })])
        ])
      ]);
    }
    drawStatus();
    S.onDirty = drawStatus;

    root.appendChild(F.group('Version history', [hist], { intro: 'Every publish is kept. Preview any version on the right, or restore it into your draft.' }));
    function loadHist() {
      u.clear(hist); hist.appendChild(h('p', { class: 'muted', text: 'Loading…' }));
      B().versions().then(function (vs) {
        u.clear(hist);
        if (!vs || !vs.length) { hist.appendChild(h('p', { class: 'muted', text: 'No published versions yet.' })); return; }
        vs.forEach(function (v, i) {
          hist.appendChild(h('div', { class: 'hist__row' }, [
            h('div', {}, [h('strong', { text: u.fmtDate(v.created_at, true) + (i === 0 ? ' · live now' : '') }), h('small', { text: v.note || 'No note' })]),
            h('div', { class: 'row' }, [
              u.btn('Preview', { small: true, kind: 'ghost', icon: 'eye', onclick: function () {
                B().version(v.id).then(function (data) { if (!data) throw new Error('Version not found'); S.previewVersion(data, u.fmtDate(v.created_at, true), function () { restore(data); }); }).catch(function (e) { u.toast(e.message, 'err'); });
              } }),
              u.btn('Restore', { small: true, kind: 'outline', onclick: function () { B().version(v.id).then(function (data) { if (data) restore(data); }).catch(function (e) { u.toast(e.message, 'err'); }); } })
            ])
          ]));
        });
      }).catch(function (e) { u.clear(hist); hist.appendChild(h('p', { class: 'muted', text: 'Could not load history: ' + e.message })); });
    }
    function restore(data) {
      return u.confirm({ title: 'Restore this version into your draft?', body: 'Your current draft will be replaced (unsaved changes are lost). The live site does not change until you publish.', ok: 'Restore into draft' }).then(function (yes) {
        if (!yes) return;
        S.setContent(u.merge(u.clone(S.state.defaults), data));
        S.saveDraft().then(function () { u.toast('Version restored into draft', 'ok'); });
      });
    }
    loadHist();

    var file = h('input', { type: 'file', accept: 'application/json,.json', hidden: true });
    file.addEventListener('change', function () {
      var f = file.files[0]; file.value = ''; if (!f) return;
      f.text().then(function (txt) {
        var j; try { j = JSON.parse(txt); } catch (e) { throw new Error('That file is not valid JSON.'); }
        if (j && j.content && j.studioBackup) j = j.content;
        if (!u.isObj(j) || j.schemaVersion !== 1) throw new Error('This backup is not a Dreamz content file (schemaVersion 1 expected).');
        return u.confirm({ title: 'Import this backup?', body: 'It replaces your current draft (' + f.name + '). Save or publish afterwards to keep it.', ok: 'Import' }).then(function (yes) {
          if (!yes) return; S.setContent(u.merge(u.clone(S.state.defaults), j)); u.toast('Backup imported into the editor — remember to save', 'ok');
        });
      }).catch(function (e) { u.toast(e.message, 'err'); });
    });
    root.appendChild(F.group('Backup', [h('div', { class: 'row row--wrap' }, [
      u.btn('Export JSON backup', { kind: 'outline', icon: 'download', onclick: function () { u.download('dreamz-content-' + u.ymd(new Date()) + '.json', JSON.stringify(C(), null, 2)); } }),
      u.btn('Import JSON…', { kind: 'outline', icon: 'upload', onclick: function () { file.click(); } }), file,
      u.btn('Reset to defaults', { kind: 'danger', onclick: function () {
        u.confirm({ title: 'Reset everything to the original content?', body: 'All text, colours, images and order go back to the built-in defaults in the editor. Nothing changes on the live site until you save and publish. Leads, reviews and dates are not touched.', ok: 'Reset editor', danger: true }).then(function (yes) {
          if (yes) { S.setContent(u.clone(S.state.defaults)); u.toast('Reset to defaults — save or publish to keep it', 'ok'); }
        });
      } })
    ])], { intro: 'Download a copy of all content before big changes. Import accepts a file exported here.' }));
  };
})();
