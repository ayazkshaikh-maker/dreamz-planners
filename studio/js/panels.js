/* Dreamz Studio — management panels: leads pipeline, availability calendar, reviews, publish & history.
   Leads are untrusted visitor input: rendered with textContent only, CSV cells are formula-safe. */
(function () {
  'use strict';
  var S = (window.Studio = window.Studio || {});
  var u = S.u, h = u.h, F = S.F;
  var P = (S.panels = {});
  function B() { return S.backend; }
  function C() { return S.state.content; }

  function head(title, intro, tools) {
    return h('div', { class: 'panel-head' }, [h('div', {}, [h('h2', { class: 'panel-title', text: title }), intro ? h('p', { class: 'muted', text: intro }) : null]), tools ? h('div', { class: 'row row--wrap' }, tools) : null]);
  }
  function localBanner(text) { return B().mode === 'local' ? F.note(text, 'warn') : null; }

  /* =============== LEADS: pipeline (Phase 1) =============== */
  /* Stages live in leads.stage (migration 2026112102_phase1_crm.sql); the old status column follows it.
     Rows without a stage (local queue, or before the migration) fall back to their status. */
  var STAGES = [
    { id: 'new', label: 'New' }, { id: 'consult', label: 'Consult' }, { id: 'proposal', label: 'Proposal' },
    { id: 'booked', label: 'Booked' }, { id: 'done', label: 'Done' }, { id: 'lost', label: 'Lost' }
  ];
  var FROM_STATUS = { new: 'new', contacted: 'consult', booked: 'booked', lost: 'lost' };
  var TO_STATUS = { new: 'new', consult: 'contacted', proposal: 'contacted', booked: 'booked', done: 'booked', lost: 'lost' };
  var L = { rows: [], q: '', tag: '', due: false, view: 'board', stageTab: 'new' };
  try { L.view = sessionStorage.getItem('dp:studio:leadsView') || 'board'; } catch (e) {}
  function stageOf(r) { return STAGES.some(function (s) { return s.id === r.stage; }) ? r.stage : (FROM_STATUS[r.status] || 'new'); }
  function stageLabel(id) { var s = STAGES.filter(function (x) { return x.id === id; })[0]; return s ? s.label : id; }
  function today() { return u.ymd(new Date()); }
  function dueState(r) { if (!r.follow_up) return ''; var t = today(); return r.follow_up < t ? 'overdue' : r.follow_up === t ? 'due' : 'later'; }
  function tagsOf(r) { return Array.isArray(r.tags) ? r.tags : []; }
  P.leadsCount = function () { return L.rows.filter(function (r) { return stageOf(r) === 'new'; }).length; };
  P.dueCount = function () { return L.rows.filter(function (r) { var d = dueState(r); return (d === 'due' || d === 'overdue') && ['done', 'lost'].indexOf(stageOf(r)) < 0; }).length; };
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
    var cols = ['created_at', 'stage', 'name', 'phone', 'email', 'event_type', 'event_date', 'guests', 'services', 'budget', 'message', 'source', 'tags', 'follow_up', 'notes', 'note_log'];
    var lines = [cols.join(',')].concat(rows.map(function (r) {
      return cols.map(function (c) {
        if (c === 'stage') return csvCell(stageLabel(stageOf(r)));
        if (c === 'note_log') return csvCell((r.note_log || []).map(function (n) { return (n.at || '').slice(0, 10) + ' ' + n.text; }).join(' | '));
        return csvCell(r[c]);
      }).join(',');
    }));
    u.download('dreamz-leads-' + u.ymd(new Date()) + '.csv', '﻿' + lines.join('\r\n'), 'text/csv;charset=utf-8');
  }
  function pill(stage) { return h('span', { class: 'pill pill--st-' + stage, text: stageLabel(stage) }); }
  function dueBadge(r) {
    var d = dueState(r);
    if (!d) return null;
    var when = u.fmtDate(r.follow_up + 'T12:00:00');
    return h('span', { class: 'due due--' + d, text: d === 'overdue' ? 'Overdue · ' + when : d === 'due' ? 'Follow up today' : 'Follow up ' + when });
  }

  /* Move a lead to another stage (drag, card menu, drawer). Optimistic, rolled back on error. */
  function moveLead(r, stage, after) {
    var old = { stage: r.stage, status: r.status };
    if (stageOf(r) === stage) return;
    r.stage = stage; r.status = TO_STATUS[stage];
    if (after) after();
    B().updateLead(r.id, { stage: stage }).then(function () { u.toast(r.name + ' → ' + stageLabel(stage), 'ok'); S.updateBadges(); })
      .catch(function (e) { r.stage = old.stage; r.status = old.status; if (after) after(); u.toast(e.message, 'err'); });
  }

  P.leads = function (root) {
    var list = h('div', { class: 'leads' });
    var search = h('input', { class: 'input', type: 'search', placeholder: 'Search name, phone, email, notes…', 'aria-label': 'Search leads', value: L.q });
    search.addEventListener('input', u.debounce(function () { L.q = search.value.toLowerCase(); draw(); }, 150));
    var tagSel = h('select', { class: 'input input--tag', 'aria-label': 'Filter by tag' });
    var dueBtn = h('button', { type: 'button', class: 'seg__btn', 'aria-pressed': String(L.due), onclick: function () { L.due = !L.due; dueBtn.setAttribute('aria-pressed', String(L.due)); draw(); } });
    var viewSeg = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'View' });
    [['board', 'Board'], ['list', 'List']].forEach(function (v) {
      viewSeg.appendChild(h('button', { type: 'button', role: 'radio', class: 'seg__btn', 'aria-checked': String(L.view === v[0]), text: v[1], onclick: function () {
        L.view = v[0]; try { sessionStorage.setItem('dp:studio:leadsView', L.view); } catch (e) {}
        u.$$('.seg__btn', viewSeg).forEach(function (b) { b.setAttribute('aria-checked', String(b.textContent === v[1])); }); draw();
      } }));
    });
    tagSel.addEventListener('change', function () { L.tag = tagSel.value; draw(); });
    root.appendChild(head('Leads pipeline', 'Every inquiry and consultation, from first message to the big day. Drag a card to another stage, or use the stage menu on the card.', [
      S.push ? S.push.button({ kind: 'outline' }) : null,
      u.btn('Refresh', { small: true, kind: 'ghost', icon: 'reload', onclick: function () { P.loadLeads().then(draw); } }),
      u.btn('Export CSV', { small: true, kind: 'outline', icon: 'download', onclick: function () { exportCsv(visible()); } })
    ]));
    var lb = localBanner('Local mode: showing inquiries saved on this device only (visitors whose connection failed). Sign in to the live Studio to see every lead.');
    if (lb) root.appendChild(lb);
    root.appendChild(h('div', { class: 'toolbar' }, [viewSeg, search, tagSel, h('div', { class: 'seg' }, [dueBtn])]));
    root.appendChild(list);

    function visible() {
      return L.rows.filter(function (r) {
        if (L.tag && tagsOf(r).indexOf(L.tag) < 0) return false;
        if (L.due) { var d = dueState(r); if (d !== 'due' && d !== 'overdue') return false; }
        if (!L.q) return true;
        return [r.name, r.phone, r.email, r.event_type, r.message, r.notes, r.budget, tagsOf(r).join(' '), (r.note_log || []).map(function (n) { return n.text; }).join(' ')].join(' ').toLowerCase().indexOf(L.q) >= 0;
      });
    }
    function drawTools() {
      var tags = {};
      L.rows.forEach(function (r) { tagsOf(r).forEach(function (t) { tags[t] = (tags[t] || 0) + 1; }); });
      u.clear(tagSel);
      tagSel.appendChild(h('option', { value: '', text: 'All tags' }));
      Object.keys(tags).sort().forEach(function (t) { tagSel.appendChild(h('option', { value: t, text: t + ' (' + tags[t] + ')', selected: t === L.tag })); });
      if (L.tag && !tags[L.tag]) L.tag = '';
      tagSel.value = L.tag;
      tagSel.hidden = !Object.keys(tags).length;
      var n = P.dueCount();
      u.clear(dueBtn); u.append(dueBtn, ['Follow-ups due ', h('span', { class: 'seg__n', text: String(n) })]);
    }
    function emptyState() {
      return h('div', { class: 'empty-state' }, [h('p', { class: 'display-sm', text: L.rows.length ? 'No leads match.' : 'No inquiries yet.' }), h('p', { class: 'muted', text: L.rows.length ? 'Try another search or filter.' : 'When someone sends the inquiry form or books a consultation, it lands here.' })]);
    }
    function draw() {
      drawTools();
      u.clear(list);
      var rows = visible();
      if (L.view === 'list') return drawList(rows);
      drawBoard(rows);
    }

    /* ---------- board ---------- */
    function drawBoard(rows) {
      var tabs = h('div', { class: 'seg kanban__tabs', role: 'tablist', 'aria-label': 'Stage' });
      var board = h('div', { class: 'kanban', 'data-tab': L.stageTab });
      STAGES.forEach(function (st) {
        var items = rows.filter(function (r) { return stageOf(r) === st.id; });
        items.sort(function (a, b) {
          var da = dueState(a), db = dueState(b), rank = { overdue: 0, due: 1, later: 2, '': 3 };
          return (rank[da] - rank[db]) || String(b.created_at).localeCompare(String(a.created_at));
        });
        tabs.appendChild(h('button', { type: 'button', role: 'tab', class: 'seg__btn', 'aria-selected': String(L.stageTab === st.id), onclick: function () { L.stageTab = st.id; draw(); } }, [st.label + ' ', h('span', { class: 'seg__n', text: String(items.length) })]));
        var body = h('div', { class: 'kcol__body' });
        var col = h('section', { class: 'kcol kcol--' + st.id + (L.stageTab === st.id ? ' is-tab' : ''), 'aria-label': st.label + ', ' + items.length + ' leads', dataset: { stage: st.id } }, [
          h('header', { class: 'kcol__head' }, [h('h3', { text: st.label }), h('span', { class: 'kcol__n', text: String(items.length) })]), body
        ]);
        if (!items.length) body.appendChild(h('p', { class: 'kcol__empty muted', text: 'Nothing here' }));
        items.forEach(function (r) { body.appendChild(card(r)); });
        col.addEventListener('dragover', function (e) { if (!L.drag) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; col.classList.add('is-over'); });
        col.addEventListener('dragleave', function (e) { if (!col.contains(e.relatedTarget)) col.classList.remove('is-over'); });
        col.addEventListener('drop', function (e) {
          e.preventDefault(); col.classList.remove('is-over');
          var r = L.rows.filter(function (x) { return String(x.id) === String(L.drag); })[0];
          L.drag = null;
          if (r) moveLead(r, st.id, draw);
        });
        board.appendChild(col);
      });
      if (!rows.length && !L.rows.length) { list.appendChild(emptyState()); return; }
      u.append(list, [tabs, board]);
    }
    function card(r) {
      var st = stageOf(r), d = dueState(r);
      var sel = h('select', { class: 'input kcard__stage', 'aria-label': 'Move ' + (r.name || 'lead') + ' to stage' }, STAGES.map(function (s) { return h('option', { value: s.id, text: s.label, selected: s.id === st }); }));
      sel.addEventListener('change', function () { moveLead(r, sel.value, draw); });
      var open = h('button', { type: 'button', class: 'kcard__open', onclick: function () { drawer(r); } }, [
        h('strong', { class: 'kcard__name', text: r.name || '(no name)' }),
        h('small', { class: 'kcard__meta', text: [r.event_type, r.event_date ? u.fmtDate(r.event_date + 'T12:00:00') : ''].filter(Boolean).join(' · ') || (r.phone || r.email || '') }),
        r.source === 'consult-booking' ? h('small', { class: 'kcard__src', text: 'Booked a consultation' }) : null
      ]);
      var el = h('article', { class: 'kcard' + (d === 'overdue' ? ' is-overdue' : d === 'due' ? ' is-due' : '') + (st === 'new' ? ' is-new' : ''), draggable: 'true', dataset: { id: r.id } }, [
        open,
        tagsOf(r).length ? h('div', { class: 'kcard__tags' }, tagsOf(r).map(function (t) { return h('span', { class: 'tag', text: t }); })) : null,
        h('div', { class: 'kcard__foot' }, [dueBadge(r) || h('small', { class: 'muted', text: u.fmtDate(r.created_at) }), sel])
      ]);
      el.addEventListener('dragstart', function (e) { L.drag = r.id; el.classList.add('is-drag'); try { e.dataTransfer.setData('text/plain', String(r.id)); e.dataTransfer.effectAllowed = 'move'; } catch (x) {} });
      el.addEventListener('dragend', function () { el.classList.remove('is-drag'); u.$$('.kcol.is-over').forEach(function (c) { c.classList.remove('is-over'); }); });
      return el;
    }

    /* ---------- list ---------- */
    function drawList(rows) {
      if (!rows.length) { list.appendChild(emptyState()); return; }
      var table = h('div', { class: 'ltable', role: 'table', 'aria-label': 'Leads' });
      table.appendChild(h('div', { class: 'ltable__row ltable__head', role: 'row' }, ['Received', 'Name', 'Event', 'Date', 'Follow-up', 'Stage'].map(function (t) { return h('span', { role: 'columnheader', text: t }); })));
      rows.forEach(function (r) {
        table.appendChild(h('button', { type: 'button', class: 'ltable__row' + (stageOf(r) === 'new' ? ' is-new' : ''), role: 'row', onclick: function () { drawer(r); } }, [
          h('span', { role: 'cell', class: 'ltable__when', text: u.fmtDate(r.created_at, true) }),
          h('span', { role: 'cell', class: 'ltable__name' }, [h('strong', { text: r.name || '(no name)' }), h('small', { text: r.phone || r.email || '' })]),
          h('span', { role: 'cell', text: r.event_type || '—' }),
          h('span', { role: 'cell', text: r.event_date ? u.fmtDate(r.event_date + 'T12:00:00') : (r.payload && r.payload.flexible ? 'Flexible' : '—') }),
          h('span', { role: 'cell' }, [dueBadge(r) || '—']),
          h('span', { role: 'cell' }, [pill(stageOf(r))])
        ]));
      });
      list.appendChild(table);
    }

    /* ---------- drawer ---------- */
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

      var stageRow = h('div', { class: 'seg seg--status', role: 'radiogroup', 'aria-label': 'Stage' });
      function drawStage() {
        u.clear(stageRow);
        STAGES.forEach(function (s) {
          stageRow.appendChild(h('button', { type: 'button', role: 'radio', class: 'seg__btn seg__btn--st-' + s.id, 'aria-checked': String(stageOf(r) === s.id), text: s.label, onclick: function () { moveLead(r, s.id, function () { drawStage(); draw(); }); } }));
        });
      }
      drawStage();

      // follow-up date
      var fu = h('input', { class: 'input input--date', type: 'date', value: r.follow_up || '', 'aria-label': 'Follow-up date' });
      var fuMsg = h('span', { class: 'muted', role: 'status' });
      function saveFollow(v) {
        var old = r.follow_up;
        r.follow_up = v || null;
        B().updateLead(r.id, { follow_up: r.follow_up }).then(function () { u.toast(v ? 'Follow-up set for ' + u.fmtDate(v + 'T12:00:00') : 'Follow-up cleared', 'ok'); draw(); S.updateBadges(); })
          .catch(function (e) { r.follow_up = old; fu.value = old || ''; u.toast(e.message, 'err'); });
      }
      fu.addEventListener('change', function () { saveFollow(fu.value); });
      function quick(label, days) { return u.btn(label, { small: true, kind: 'ghost', onclick: function () { var d = new Date(); d.setDate(d.getDate() + days); fu.value = u.ymd(d); saveFollow(fu.value); } }); }

      // tags
      var tagBox = h('div', { class: 'tags' });
      var allTags = {}; L.rows.forEach(function (x) { tagsOf(x).forEach(function (t) { allTags[t] = 1; }); });
      var dlId = 'tags-' + String(r.id).replace(/[^a-z0-9]/gi, '').slice(0, 12);
      var tagIn = h('input', { class: 'input', placeholder: 'Add a tag, press Enter', maxlength: 30, list: dlId, 'aria-label': 'Add a tag' });
      var tagList = h('datalist', { id: dlId }, Object.keys(allTags).sort().map(function (t) { return h('option', { value: t }); }));
      function saveTags(next) {
        var old = tagsOf(r).slice();
        r.tags = next; drawTags();
        B().updateLead(r.id, { tags: next }).then(function () { draw(); }).catch(function (e) { r.tags = old; drawTags(); u.toast(e.message, 'err'); });
      }
      function drawTags() {
        u.clear(tagBox);
        tagsOf(r).forEach(function (t) {
          tagBox.appendChild(h('span', { class: 'tag tag--edit' }, [t, h('button', { type: 'button', class: 'tag__x', 'aria-label': 'Remove tag ' + t, onclick: function () { saveTags(tagsOf(r).filter(function (x) { return x !== t; })); } }, [u.icon('x', 12)])]));
        });
        if (!tagsOf(r).length) tagBox.appendChild(h('span', { class: 'muted', text: 'No tags yet.' }));
      }
      tagIn.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ',') return;
        e.preventDefault();
        var t = tagIn.value.trim().replace(/,/g, '').slice(0, 30);
        if (!t) return;
        if (tagsOf(r).length >= 12) { u.toast('Up to 12 tags per lead', 'err'); return; }
        if (tagsOf(r).map(function (x) { return x.toLowerCase(); }).indexOf(t.toLowerCase()) < 0) saveTags(tagsOf(r).concat([t]));
        tagIn.value = '';
      });
      drawTags();

      // notes (timestamped list)
      var noteList = h('ol', { class: 'notes' });
      function drawNotes() {
        u.clear(noteList);
        var log = (r.note_log || []).slice().reverse();
        if (!log.length && !r.notes) noteList.appendChild(h('li', { class: 'muted', text: 'No notes yet.' }));
        log.forEach(function (n) {
          noteList.appendChild(h('li', { class: 'note-item' }, [
            h('div', { class: 'note-item__meta' }, [h('small', { text: u.fmtDate(n.at, true) + (n.by ? ' · ' + n.by : '') }),
              h('button', { type: 'button', class: 'icon-btn icon-btn--sm', 'aria-label': 'Delete this note', onclick: function () {
                u.confirm({ title: 'Delete this note?', body: 'The note is removed from this lead. This cannot be undone.', ok: 'Delete note', danger: true }).then(function (yes) {
                  if (!yes) return;
                  B().deleteLeadNote(r.id, n.id).then(function (logNow) { r.note_log = logNow || []; drawNotes(); }).catch(function (e) { u.toast(e.message, 'err'); });
                });
              } }, [u.icon('trash', 14)])]),
            h('p', { text: n.text })
          ]));
        });
        if (r.notes) noteList.appendChild(h('li', { class: 'note-item note-item--old' }, [h('div', { class: 'note-item__meta' }, [h('small', { text: 'Earlier notes' })]), h('p', { text: r.notes })]));
      }
      drawNotes();
      var noteIn = h('textarea', { class: 'input', rows: 3, maxlength: 2000, placeholder: 'Add a note — only the owners see these', 'aria-label': 'New note' });
      var addNote = u.btn('Add note', { small: true, kind: 'outline', icon: 'plus', onclick: function () {
        var t = noteIn.value.trim();
        if (!t) { noteIn.focus(); return; }
        addNote.disabled = true;
        B().addLeadNote(r.id, t).then(function (logNow) { r.note_log = logNow || []; noteIn.value = ''; drawNotes(); u.toast('Note added', 'ok'); })
          .catch(function (e) { u.toast(e.message, 'err'); }).then(function () { addNote.disabled = false; });
      } });

      u.append(m.body, [
        h('p', { class: 'muted', text: 'Received ' + u.fmtDate(r.created_at, true) + (r.source ? ' · ' + r.source : '') }),
        contact,
        h('h3', { class: 'group__title', text: 'Stage' }), stageRow,
        h('h3', { class: 'group__title', text: 'Follow up' }),
        h('div', { class: 'row row--wrap' }, [fu, quick('Tomorrow', 1), quick('In 3 days', 3), quick('Next week', 7), u.btn('Clear', { small: true, kind: 'ghost', onclick: function () { fu.value = ''; saveFollow(''); } }), fuMsg]),
        h('h3', { class: 'group__title', text: 'Tags' }), tagBox, tagIn, tagList,
        h('h3', { class: 'group__title', text: 'Details' }),
        h('dl', { class: 'dl' }, [dl('Phone', r.phone), dl('Email', r.email), dl('Events', r.event_type), dl('Event date', r.event_date ? u.fmtDate(r.event_date + 'T12:00:00') : p.flexible ? 'Flexible / not set' : ''), dl('Guests', r.guests), dl('Services', r.services), dl('Budget', r.budget), dl('Prefers', p.contactMethod), dl('Message', r.message)]),
        p.estimator ? h('details', { class: 'details' }, [h('summary', { text: 'Celebration builder result' }), h('pre', { class: 'code', text: JSON.stringify(p.estimator, null, 2) })]) : null,
        h('h3', { class: 'group__title', text: 'Notes' }), noteIn, h('div', { class: 'row' }, [addNote]), noteList
      ]);
      m.foot.appendChild(u.btn('Delete lead', { kind: 'danger', small: true, icon: 'trash', onclick: function () {
        u.confirm({ title: 'Delete this lead?', body: 'The inquiry from ' + (r.name || 'this visitor') + ' will be deleted permanently. This cannot be undone — export a CSV first if you need a record.', ok: 'Delete permanently', danger: true }).then(function (yes) {
          if (!yes) return;
          B().deleteLead(r.id).then(function () { L.rows = L.rows.filter(function (x) { return x.id !== r.id; }); m.close(); draw(); S.updateBadges(); u.toast('Lead deleted', 'ok'); }).catch(function (e) { u.toast(e.message, 'err'); });
        });
      } }));
      m.foot.appendChild(u.btn('Close', { kind: 'ghost', small: true, onclick: function () { m.close(); } }));
    }
    function openPending() {
      if (!L.pending) return;
      var r = L.rows.filter(function (x) { return String(x.id) === String(L.pending); })[0];
      if (r) { L.pending = null; drawer(r); }
    }
    draw();
    P.loadLeads().then(function () { draw(); openPending(); if (L.pending) { u.toast('That inquiry is no longer in the inbox.', 'info'); L.pending = null; } });
  };
  /* Opened from a notification tap or the Consultations panel: show the pipeline and that lead's details. */
  P.openLead = function (id) { L.pending = id || null; L.tag = ''; L.due = false; L.q = ''; S.go('leads'); };

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
