/* Dreamz Studio — Analytics + Email panels (Phase 0).
   Both talk only to owner-only SECURITY DEFINER rpcs (see supabase/migrations/2026112101_phase0_*.sql).
   Until those exist (or in practice/local mode) the nav items stay hidden and the panels show a calm note.
   The Brevo key is never read here: the database only tells us whether one is set. */
(function () {
  'use strict';
  var S = (window.Studio = window.Studio || {});
  var u = S.u, h = u.h, F = S.F;
  var O = (S.ops = { available: { analytics: false, email: false } });
  function B() { return S.backend; }
  function rpc(name, args) {
    return B().timeout(B().client.rpc(name, args || {}), 12000).then(function (r) {
      if (r.error) { var e = new Error(r.error.message || 'Request failed'); e.code = r.error.code; throw e; }
      return r.data;
    });
  }
  function missing(e) { return e && (e.code === 'PGRST202' || e.code === '42883' || e.code === 'PGRST205' || e.code === '42P01' || /could not find|does not exist|schema cache/i.test(e.message || '')); }

  function head(title, intro, tools) {
    return h('div', { class: 'panel-head' }, [h('div', {}, [h('h2', { class: 'panel-title', text: title }), intro ? h('p', { class: 'muted', text: intro }) : null]), tools ? h('div', { class: 'row row--wrap' }, tools) : null]);
  }
  function unavailable(root, what) {
    root.appendChild(F.note(B().mode !== 'supabase'
      ? what + ' needs the live Studio. Sign in online (not practice mode) to use it.'
      : what + ' is not switched on for this website yet. Your web helper sets it up once; this page then fills in by itself.', 'warn'));
  }

  /* Called once the app is on screen: reveals the nav items whose database parts exist. Quiet on failure. */
  O.probe = function () {
    if (B().mode !== 'supabase') return Promise.resolve(O.available);
    function check(id, p) { return p.then(function () { O.available[id] = true; }, function () { O.available[id] = false; }).then(function () { if (S.showPanel) S.showPanel(id, O.available[id]); }); }
    return Promise.all([check('analytics', rpc('analytics_summary', { p_days: 1 })), check('email', rpc('email_status'))]).then(function () { return O.available; });
  };

  /* =============== ANALYTICS =============== */
  var A = { days: 30 };
  function bars(daily) {
    var ns = 'http://www.w3.org/2000/svg', W = 720, H = 180, pad = 0;
    var max = Math.max(1, Math.max.apply(null, daily.map(function (d) { return d.n; })));
    var total = daily.reduce(function (s, d) { return s + d.n; }, 0);
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + (H + pad)); svg.setAttribute('class', 'vchart');
    svg.setAttribute('role', 'img'); svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-label', 'Visits per day: ' + total + ' in ' + daily.length + ' days, busiest day ' + max + ' visits.');
    var bw = W / Math.max(1, daily.length), gap = Math.min(4, bw * 0.25);
    [0.5, 1].forEach(function (f) {
      var l = document.createElementNS(ns, 'line');
      l.setAttribute('x1', 0); l.setAttribute('x2', W); l.setAttribute('y1', H - H * f); l.setAttribute('y2', H - H * f); l.setAttribute('class', 'vchart__grid');
      svg.appendChild(l);
    });
    daily.forEach(function (d, i) {
      var bh = d.n ? Math.max(2, (d.n / max) * (H - 8)) : 0;
      var r = document.createElementNS(ns, 'rect');
      r.setAttribute('x', (i * bw + gap / 2).toFixed(1)); r.setAttribute('width', Math.max(1, bw - gap).toFixed(1));
      r.setAttribute('y', (H - bh).toFixed(1)); r.setAttribute('height', bh.toFixed(1)); r.setAttribute('rx', 2); r.setAttribute('class', 'vchart__bar');
      var t = document.createElementNS(ns, 'title'); t.textContent = u.fmtDate(d.day + 'T12:00:00') + ': ' + d.n + ' visit' + (d.n === 1 ? '' : 's');
      r.appendChild(t); svg.appendChild(r);
    });
    // date labels as HTML (the SVG stretches to the panel width, text inside it would distort)
    var labels = h('div', { class: 'vchart__labels', 'aria-hidden': 'true' });
    [0, Math.floor((daily.length - 1) / 2), daily.length - 1].filter(function (x, i, a) { return a.indexOf(x) === i; }).forEach(function (i) {
      if (daily[i]) labels.appendChild(h('span', { text: new Date(daily[i].day + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) }));
    });
    return h('div', {}, [svg, labels]);
  }
  function topList(rows, key, empty) {
    if (!rows || !rows.length) return h('p', { class: 'muted', text: empty });
    var max = Math.max.apply(null, rows.map(function (r) { return r.n; }));
    return h('ol', { class: 'hbars' }, rows.map(function (r) {
      return h('li', { class: 'hbar' }, [
        h('span', { class: 'hbar__fill', style: { width: Math.max(3, Math.round((r.n / max) * 100)) + '%' }, 'aria-hidden': 'true' }),
        h('span', { class: 'hbar__label', text: r[key] }), h('span', { class: 'hbar__n', text: String(r.n) })
      ]);
    }));
  }
  function stat(label, value) { return h('div', { class: 'stat' }, [h('strong', { text: value }), h('small', { class: 'muted', text: label })]); }

  O.analytics = function (root) {
    var body = h('div', { class: 'ops' });
    var seg = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Period' });
    [7, 30, 90].forEach(function (d) {
      seg.appendChild(h('button', { type: 'button', role: 'radio', class: 'seg__btn', 'aria-checked': String(A.days === d), text: d + ' days', onclick: function () { A.days = d; u.$$('.seg__btn', seg).forEach(function (b) { b.setAttribute('aria-checked', String(b.textContent === d + ' days')); }); load(); } }));
    });
    root.appendChild(head('Analytics', 'Who visits the website. No cookies and no personal data: only the page, the site a visitor came from, and phone or computer.', [seg,
      u.btn('Refresh', { small: true, kind: 'ghost', icon: 'reload', onclick: function () { load(); } })]));
    root.appendChild(body);
    if (B().mode !== 'supabase') { unavailable(body, 'Analytics'); return; }
    function load() {
      u.clear(body); body.appendChild(h('p', { class: 'muted', text: 'Loading…' }));
      rpc('analytics_summary', { p_days: A.days }).then(function (d) {
        u.clear(body);
        var dev = d.devices || {}, tot = (dev.mobile || 0) + (dev.desktop || 0);
        var pct = function (n) { return tot ? Math.round((n / tot) * 100) + '%' : '–'; };
        u.append(body, [
          h('div', { class: 'stats' }, [stat('Visits, last ' + d.days + ' days', String(d.total || 0)), stat('On phones', pct(dev.mobile || 0)), stat('On computers', pct(dev.desktop || 0))]),
          F.group('Visits per day', [d.total ? h('div', { class: 'vchart-wrap' }, [bars(d.daily || [])]) : h('p', { class: 'muted', text: 'No visits recorded in this period yet.' })]),
          h('div', { class: 'ops-cols' }, [
            F.group('Top pages', [topList(d.pages, 'path', 'Nothing yet.')]),
            F.group('Where visitors came from', [topList(d.referrers, 'host', 'No other websites yet (direct visits and apps are not listed).')])
          ]),
          h('p', { class: 'muted ops-foot', text: 'Visitors who switched on "Do not track" are not counted. Studio previews are never counted.' })
        ]);
      }).catch(function (e) { u.clear(body); if (missing(e)) unavailable(body, 'Analytics'); else body.appendChild(F.note('Could not load analytics: ' + e.message, 'warn')); });
    }
    load();
  };

  /* =============== EMAIL =============== */
  /* Same syntax as the Edge Function send-email: {{var}}, {{#var}}…{{/var}} kept only when var is set. */
  O.render = function (tpl, vars, html) {
    function val(k) { return vars[k] == null ? '' : String(vars[k]); }
    var out = String(tpl || '').replace(/\{\{#([a-z0-9_]+)\}\}([\s\S]*?)\{\{\/\1\}\}/gi, function (m, k, inner) { return val(k).trim() ? inner : ''; });
    return out.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, function (m, k) { return html ? u.esc(val(k)) : val(k); });
  };
  var SAMPLE = {
    name: 'Ayesha Khan', first_name: 'Ayesha', email: 'ayesha@example.com', phone: '404-555-0142', event_type: 'Mehndi & Sangeet',
    event_date: 'Saturday, May 16, 2027', guests: '250', services: 'Full planning, Decor', budget: '', message: 'We would love a garden mehndi with lots of marigolds.',
    studio_url: '#', brand_name: 'Dreamz Planners', slot: 'Tuesday, March 2 at 6:00 PM', year: String(new Date().getFullYear())
  };
  var VARS = ['name', 'first_name', 'email', 'phone', 'event_type', 'event_date', 'guests', 'services', 'budget', 'message', 'studio_url', 'brand_name', 'year'];
  var TPL_LABEL = { lead_ack: 'Thank-you to the couple', lead_owner: 'New inquiry to owners', booking_confirm: 'Booking confirmed (Phase 1)', booking_reminder: 'Booking reminder (Phase 1)' };
  var STATUS_TEXT = { queued: 'Waiting', sending: 'Sending', sent: 'Sent', failed: 'Failed', skipped: 'Skipped' };
  var E = { tpl: 'lead_ack' };

  O.email = function (root) {
    var statusBox = h('div', { class: 'pubcard' }), tplBox = h('div'), outBox = h('div', { class: 'hist' });
    root.appendChild(head('Email', 'Automatic emails: a thank-you to the couple and a summary to you for every new inquiry. Sent through Brevo (free, up to 300 a day).'));
    if (B().mode !== 'supabase') { unavailable(root, 'Email'); return; }
    u.append(root, [statusBox,
      F.group('Templates', [tplBox], { intro: 'Use {{first_name}}, {{event_type}} and the other names below. Wrap a sentence in {{#event_date}} … {{/event_date}} to show it only when that answer was given.' }),
      F.group('Recent emails', [h('div', { class: 'row' }, [u.btn('Refresh', { small: true, kind: 'ghost', icon: 'reload', onclick: loadOutbox })]), outBox], { intro: 'The last 50 emails and whether Brevo accepted them.' })
    ]);

    function drawStatus(st) {
      u.clear(statusBox);
      var sw = h('input', { type: 'checkbox', role: 'switch', checked: !!st.enabled, disabled: !st.key_set || !st.sender_email });
      var msg = h('p', { class: 'muted pushcard__msg', role: 'status', 'aria-live': 'polite' });
      sw.addEventListener('change', function () {
        var want = sw.checked; sw.disabled = true; msg.textContent = want ? 'Switching on…' : 'Switching off…';
        rpc('email_set_enabled', { p_on: want }).then(function (s) { u.toast(s.enabled ? 'Automatic emails are on' : 'Automatic emails are off', 'ok'); drawStatus(s); })
          .catch(function (e) { sw.checked = !want; sw.disabled = false; msg.textContent = e.message; });
      });
      var owners = (st.owner_emails || []).join(', ');
      u.append(statusBox, [
        h('label', { class: 'switch switch--big' }, [sw, h('span', { class: 'switch__track', 'aria-hidden': 'true' }), h('span', { class: 'switch__text' }, [h('strong', { text: 'Send automatic emails' }), h('small', { text: st.enabled ? 'On: every new inquiry sends the emails below.' : 'Off: nothing is sent.' })])]),
        h('dl', { class: 'dl' }, [
          dlRow('Brevo key', st.key_set ? 'Set (hidden)' : 'Not set yet — see OPS.md'),
          dlRow('Sender', st.sender_email ? (st.sender_name || '') + ' <' + st.sender_email + '>' : 'Not set yet'),
          dlRow('Owner copies go to', owners || 'Nobody yet — add owner emails (see OPS.md)'),
          dlRow('Sent today', String(st.sent_today || 0) + ' of 300')
        ]),
        h('div', { class: 'row row--wrap' }, [u.btn('Send a test to me', { kind: 'outline', small: true, icon: 'mail', disabled: !st.key_set || !st.sender_email, onclick: function () {
          msg.textContent = 'Queuing a test…';
          rpc('email_send_test').then(function (r) { msg.textContent = 'Test queued for ' + r.to + '. It should arrive within a minute (check spam too).'; setTimeout(loadOutbox, 4000); })
            .catch(function (e) { msg.textContent = e.message; });
        } })]),
        msg,
        F.note('Emails go out from your Gmail address until the business has its own domain, so some may land in spam or Promotions. Ask couples to look there.', 'info')
      ]);
    }
    function dlRow(k, v) { return h('div', { class: 'dl__row' }, [h('dt', { text: k }), h('dd', { text: v })]); }
    function loadStatus() {
      statusBox.appendChild(h('p', { class: 'muted', text: 'Checking…' }));
      rpc('email_status').then(drawStatus).catch(function (e) { u.clear(statusBox); if (missing(e)) unavailable(statusBox, 'Email'); else statusBox.appendChild(F.note('Could not load email settings: ' + e.message, 'warn')); });
    }

    function loadTemplates() {
      u.clear(tplBox); tplBox.appendChild(h('p', { class: 'muted', text: 'Loading templates…' }));
      B().timeout(B().client.from('email_templates').select('key,subject,html,enabled,description,updated_at').order('key')).then(function (r) {
        if (r.error) throw r.error;
        drawTemplates(r.data || []);
      }).catch(function (e) { u.clear(tplBox); tplBox.appendChild(F.note(missing(e) ? 'Templates are not set up yet.' : 'Could not load templates: ' + e.message, 'warn')); });
    }
    function drawTemplates(rows) {
      u.clear(tplBox);
      if (!rows.length) { tplBox.appendChild(h('p', { class: 'muted', text: 'No templates yet.' })); return; }
      var order = ['lead_ack', 'lead_owner', 'booking_confirm', 'booking_reminder'];
      rows.sort(function (a, b) { return (order.indexOf(a.key) + 1 || 99) - (order.indexOf(b.key) + 1 || 99); });
      if (!rows.some(function (r) { return r.key === E.tpl; })) E.tpl = rows[0].key;
      var seg = h('div', { class: 'seg seg--wrap', role: 'tablist', 'aria-label': 'Template' });
      var ed = h('div', { class: 'tpl' });
      rows.forEach(function (r) {
        seg.appendChild(h('button', { type: 'button', role: 'tab', class: 'seg__btn', 'aria-selected': String(r.key === E.tpl), text: TPL_LABEL[r.key] || r.key, onclick: function () { E.tpl = r.key; drawTemplates(rows); } }));
      });
      var t = rows.filter(function (r) { return r.key === E.tpl; })[0];
      var subj = h('input', { class: 'input', value: t.subject, maxlength: 200 });
      var html = h('textarea', { class: 'input tpl__html', rows: 14, spellcheck: 'false', value: t.html });
      var en = h('input', { type: 'checkbox', role: 'switch', checked: !!t.enabled });
      var frame = h('iframe', { class: 'tpl__frame', title: 'Email preview', sandbox: '' });
      var subjOut = h('p', { class: 'tpl__subject' });
      function preview() {
        subjOut.textContent = O.render(subj.value, SAMPLE, false);
        frame.srcdoc = O.render(html.value, SAMPLE, true);
      }
      var later = u.debounce(preview, 200);
      subj.addEventListener('input', later); html.addEventListener('input', later);
      var save = u.btn('Save template', { kind: 'gold', small: true, onclick: function () {
        if (!subj.value.trim() || !html.value.trim()) { u.toast('Subject and body are both needed', 'err'); return; }
        save.disabled = true;
        B().timeout(B().client.from('email_templates').update({ subject: subj.value.trim(), html: html.value, enabled: en.checked, updated_at: new Date().toISOString(), updated_by: B().user && B().user.id }).eq('key', t.key).select().single())
          .then(function (r) { if (r.error) throw r.error; Object.assign(t, r.data); u.toast('Template saved', 'ok'); })
          .catch(function (e) { u.toast('Could not save: ' + e.message, 'err'); }).then(function () { save.disabled = false; });
      } });
      u.append(ed, [
        t.description ? h('p', { class: 'muted', text: t.description }) : null,
        h('label', { class: 'switch' }, [en, h('span', { class: 'switch__track', 'aria-hidden': 'true' }), h('span', { class: 'switch__text' }, [h('strong', { text: 'Use this template' }), h('small', { text: 'When off, this email is not sent.' })])]),
        h('div', { class: 'tpl__grid' }, [
          h('div', { class: 'tpl__edit' }, [
            h('label', { class: 'field' }, [h('span', { class: 'field__label', text: 'Subject' }), subj]),
            h('label', { class: 'field' }, [h('span', { class: 'field__label', text: 'Body (HTML)' }), html]),
            h('p', { class: 'field__hint' }, ['Names you can use: ', VARS.map(function (v) { return '{{' + v + '}}'; }).join(' ')]),
            h('div', { class: 'row' }, [save])
          ]),
          h('div', { class: 'tpl__view' }, [h('p', { class: 'field__label', text: 'Preview (sample couple)' }), subjOut, frame])
        ])
      ]);
      u.append(tplBox, [seg, ed]);
      preview();
    }

    function loadOutbox() {
      u.clear(outBox); outBox.appendChild(h('p', { class: 'muted', text: 'Loading…' }));
      rpc('email_outbox_recent', { p_limit: 50 }).then(function (rows) {
        u.clear(outBox);
        if (!rows || !rows.length) { outBox.appendChild(h('p', { class: 'muted', text: 'No emails yet.' })); return; }
        rows.forEach(function (r) {
          outBox.appendChild(h('div', { class: 'hist__row' }, [
            h('div', {}, [h('strong', { text: (TPL_LABEL[r.template_key] || r.template_key) + (r.is_test ? ' · test' : '') }), h('small', { text: r.to_email + ' · ' + u.fmtDate(r.created_at, true) + (r.error ? ' · ' + r.error : '') })]),
            h('span', { class: 'pill pill--mail-' + r.status, text: STATUS_TEXT[r.status] || r.status })
          ]));
        });
      }).catch(function (e) { u.clear(outBox); outBox.appendChild(h('p', { class: 'muted', text: missing(e) ? 'Not set up yet.' : 'Could not load: ' + e.message })); });
    }

    loadStatus(); loadTemplates(); loadOutbox();
  };
})();
