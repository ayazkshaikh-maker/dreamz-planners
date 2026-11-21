/* Dreamz Studio — Consultations panel (Phase 1): bookings, weekly hours, blocked dates, calendar sync.
   Database: supabase/migrations/2026112102_phase1_booking.sql + 2026112102_phase1_calendar.sql.
   Owner-only (RLS + is_admin() rpcs). Until the migrations exist, or in practice/local mode, the nav item stays hidden.
   Visitor details (names, emails, notes) are untrusted: rendered with textContent only. */
(function () {
  'use strict';
  var S = (window.Studio = window.Studio || {});
  var u = S.u, h = u.h, F = S.F;
  var CFG = window.DP_CONFIG || {};
  var CS = (S.consult = { available: { consult: false } });
  function B() { return S.backend; }
  function rpc(name, args) {
    return B().timeout(B().client.rpc(name, args || {}), 12000).then(function (r) {
      if (r.error) { var e = new Error(r.error.message || 'Request failed'); e.code = r.error.code; throw e; }
      return r.data;
    });
  }
  function q(p) { return B().timeout(p, 12000).then(function (r) { if (r.error) { var e = new Error(r.error.message || 'Request failed'); e.code = r.error.code; throw e; } return r.data; }); }
  function missing(e) { return e && (e.code === 'PGRST202' || e.code === '42883' || e.code === 'PGRST205' || e.code === '42P01' || /could not find|does not exist|schema cache/i.test(e.message || '')); }
  function head(title, intro, tools) {
    return h('div', { class: 'panel-head' }, [h('div', {}, [h('h2', { class: 'panel-title', text: title }), intro ? h('p', { class: 'muted', text: intro }) : null]), tools ? h('div', { class: 'row row--wrap' }, tools) : null]);
  }

  CS.probe = function () {
    if (B().mode !== 'supabase') return Promise.resolve(false);
    return q(B().client.from('consult_settings').select('id').limit(1)).then(function () { return true; }, function () { return false; })
      .then(function (on) { CS.available.consult = on; if (S.showPanel) S.showPanel('consult', on); return on; });
  };

  /* ---------- time zone helpers ---------- */
  var DAYS = [['1', 'Monday'], ['2', 'Tuesday'], ['3', 'Wednesday'], ['4', 'Thursday'], ['5', 'Friday'], ['6', 'Saturday'], ['7', 'Sunday']];
  var ZONES = [['America/New_York', 'Eastern (Atlanta)'], ['America/Chicago', 'Central'], ['America/Denver', 'Mountain'], ['America/Los_Angeles', 'Pacific']];
  function fmt(iso, tz, o) { return new Intl.DateTimeFormat('en-US', Object.assign({ timeZone: tz }, o)).format(new Date(iso)); }
  function when(iso, tz) { return fmt(iso, tz, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }); }
  function partsIn(ms, tz) {
    var p = {};
    new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date(ms)).forEach(function (x) { p[x.type] = +x.value; });
    return p;
  }
  /* "2026-12-01T18:30" as wall-clock time in tz → UTC ISO string */
  CS.zonedToUtc = function (local, tz) {
    var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local || '');
    if (!m) return null;
    var want = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]), t = want;
    for (var i = 0; i < 3; i++) { var p = partsIn(t, tz); var seen = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second); t += want - seen; }
    return new Date(t).toISOString();
  };
  function toLocalInput(iso, tz) {
    var p = partsIn(Date.parse(iso), tz), z = function (n) { return String(n).padStart(2, '0'); };
    return p.year + '-' + z(p.month) + '-' + z(p.day) + 'T' + z(p.hour) + ':' + z(p.minute);
  }
  CS.feedUrl = function (token) {
    return CFG.SUPABASE_URL + '/rest/v1/rpc/calendar_ics?p_token=' + encodeURIComponent(token) + '&apikey=' + encodeURIComponent(CFG.SUPABASE_KEY);
  };

  var STATUS = { booked: 'Booked', cancelled: 'Cancelled', done: 'Done', no_show: 'No-show' };
  var V = { past: false };

  CS.panel = function (root) {
    var setBox = h('div'), listBox = h('div', { class: 'hist' }), hoursBox = h('div'), blockBox = h('div'), feedBox = h('div');
    root.appendChild(head('Consultations', 'Couples book a free call on the website in the times you open here. Bookings appear below and in your Leads pipeline (stage Consult).', [
      u.btn('Refresh', { small: true, kind: 'ghost', icon: 'reload', onclick: function () { loadAll(); } })
    ]));
    if (B().mode !== 'supabase') { root.appendChild(F.note('Consultations need the live Studio. Sign in online (not practice mode) to use them.', 'warn')); return; }
    var pastSw = h('input', { type: 'checkbox', role: 'switch', checked: V.past });
    pastSw.addEventListener('change', function () { V.past = pastSw.checked; loadBookings(); });
    u.append(root, [setBox,
      F.group('Bookings', [h('label', { class: 'switch switch--inline' }, [pastSw, h('span', { class: 'switch__track', 'aria-hidden': 'true' }), h('span', { text: 'Show past and cancelled' })]), listBox]),
      F.group('Weekly hours', [hoursBox], { intro: 'When couples can book. Times are in the time zone below. Leave a day off to close it.' }),
      F.group('Blocked dates', [blockBox], { intro: 'Days off, holidays or wedding days: no consultations can be booked on these dates.' }),
      F.group('Calendar sync', [feedBox], { intro: 'See every consultation and booked event in your own Google, Outlook or Apple calendar. The link is private: anyone who has it can see the bookings.' })
    ]);

    var settings = null;
    function tz() { return (settings && settings.timezone) || 'America/New_York'; }

    function loadAll() { loadSettings().then(function () { loadBookings(); loadBlocks(); }); loadFeed(); }

    /* ---------- on/off + settings ---------- */
    function loadSettings() {
      u.clear(setBox); setBox.appendChild(h('p', { class: 'muted', text: 'Loading…' }));
      return q(B().client.from('consult_settings').select('*').maybeSingle()).then(function (row) {
        settings = row || {}; drawSwitch(); drawHours();
      }).catch(function (e) {
        u.clear(setBox); setBox.appendChild(F.note(missing(e) ? 'Consultation booking is not set up for this website yet.' : 'Could not load the settings: ' + e.message, 'warn'));
      });
    }
    function saveSettings(patch, okMsg) {
      return q(B().client.from('consult_settings').update(Object.assign({}, patch, { updated_by: B().user && B().user.id })).eq('id', true).select().single())
        .then(function (row) { settings = row; u.toast(okMsg || 'Saved', 'ok'); return row; })
        .catch(function (e) { u.toast('Could not save: ' + e.message, 'err'); throw e; });
    }
    function drawSwitch() {
      u.clear(setBox);
      var sw = h('input', { type: 'checkbox', role: 'switch', checked: !!settings.enabled });
      sw.addEventListener('change', function () {
        var want = sw.checked; sw.disabled = true;
        saveSettings({ enabled: want }, want ? 'Online booking is open' : 'Online booking is closed').then(drawSwitch, function () { sw.checked = !want; sw.disabled = false; });
      });
      var box = h('div', { class: 'pubcard' }, [
        h('label', { class: 'switch switch--big' }, [sw, h('span', { class: 'switch__track', 'aria-hidden': 'true' }), h('span', { class: 'switch__text' }, [
          h('strong', { text: 'Take bookings on the website' }),
          h('small', { text: settings.enabled ? 'On: the "Book a free consultation" buttons show on the website.' : 'Off: the booking buttons are hidden. Existing bookings stay.' })])]),
        h('p', { class: 'muted', text: 'Confirmation and reminder emails go out only when automatic emails are switched on (Studio → Email).' })
      ]);
      setBox.appendChild(box);
    }

    /* ---------- weekly hours, slot length, notice ---------- */
    function drawHours() {
      u.clear(hoursBox);
      var weekly = settings.weekly || {}, rows = {};
      var grid = h('div', { class: 'hours' });
      DAYS.forEach(function (d) {
        var win = (weekly[d[0]] || [])[0];
        var on = h('input', { type: 'checkbox', checked: !!win, 'aria-label': d[1] + ' open' });
        var a = h('input', { class: 'input input--time', type: 'time', value: win ? win.start : '18:00', 'aria-label': d[1] + ' from', step: 900 });
        var b = h('input', { class: 'input input--time', type: 'time', value: win ? win.end : '21:00', 'aria-label': d[1] + ' until', step: 900 });
        function sync() { a.disabled = b.disabled = !on.checked; }
        on.addEventListener('change', sync); sync();
        rows[d[0]] = { on: on, a: a, b: b, extra: (weekly[d[0]] || []).slice(1) };
        grid.appendChild(h('div', { class: 'hours__row' }, [h('label', { class: 'hours__day' }, [on, h('span', { text: d[1] })]), a, h('span', { class: 'muted', text: 'to' }), b]));
      });
      var slot = h('select', { class: 'input', 'aria-label': 'Length of each consultation' }, [15, 20, 30, 45, 60, 90].map(function (m) { return h('option', { value: m, text: m + ' minutes', selected: +settings.slot_minutes === m }); }));
      var notice = h('input', { class: 'input input--num', type: 'number', min: 0, max: 720, value: settings.min_notice_hours != null ? settings.min_notice_hours : 24 });
      var ahead = h('input', { class: 'input input--num', type: 'number', min: 1, max: 365, value: settings.max_days_ahead || 60 });
      var zone = h('select', { class: 'input' }, ZONES.map(function (z) { return h('option', { value: z[0], text: z[1], selected: z[0] === tz() }); }));
      var save = u.btn('Save hours', { kind: 'gold', small: true, onclick: function () {
        var w = {}, bad = '';
        DAYS.forEach(function (d) {
          var r = rows[d[0]];
          w[d[0]] = r.on.checked ? [{ start: r.a.value, end: r.b.value }].concat(r.extra) : [];
          if (r.on.checked && (!r.a.value || !r.b.value || r.b.value <= r.a.value)) bad = d[1] + ': the end time must be after the start time.';
        });
        if (bad) { u.toast(bad, 'err'); return; }
        save.disabled = true;
        saveSettings({ weekly: w, slot_minutes: +slot.value, min_notice_hours: Math.max(0, Math.min(720, parseInt(notice.value, 10) || 0)), max_days_ahead: Math.max(1, Math.min(365, parseInt(ahead.value, 10) || 60)), timezone: zone.value }, 'Hours saved')
          .then(function () { drawHours(); loadBookings(); }, function () {}).then(function () { save.disabled = false; });
      } });
      u.append(hoursBox, [grid,
        h('div', { class: 'hours__opts' }, [
          h('label', { class: 'field' }, [h('span', { class: 'field__label', text: 'Each consultation' }), slot]),
          h('label', { class: 'field' }, [h('span', { class: 'field__label', text: 'Notice needed (hours)' }), notice]),
          h('label', { class: 'field' }, [h('span', { class: 'field__label', text: 'Bookable up to (days ahead)' }), ahead]),
          h('label', { class: 'field' }, [h('span', { class: 'field__label', text: 'Time zone' }), zone])
        ]),
        h('div', { class: 'row' }, [save])
      ]);
    }

    /* ---------- bookings ---------- */
    function loadBookings() {
      u.clear(listBox); listBox.appendChild(h('p', { class: 'muted', text: 'Loading…' }));
      var qb = B().client.from('consultations').select('*');
      qb = V.past ? qb.gte('slot_start', new Date(Date.now() - 180 * 864e5).toISOString()).order('slot_start', { ascending: false })
                  : qb.eq('status', 'booked').gte('slot_end', new Date(Date.now() - 6 * 36e5).toISOString()).order('slot_start', { ascending: true });
      q(qb.limit(200)).then(function (rows) {
        u.clear(listBox);
        if (!rows.length) { listBox.appendChild(h('p', { class: 'muted', text: V.past ? 'No consultations in the last 6 months.' : 'No upcoming consultations yet.' })); return; }
        rows.forEach(function (r) { listBox.appendChild(bookingRow(r)); });
      }).catch(function (e) { u.clear(listBox); listBox.appendChild(h('p', { class: 'muted', text: 'Could not load bookings: ' + e.message })); });
    }
    function bookingRow(r) {
      var actions = h('div', { class: 'row row--wrap' });
      if (r.lead_id && S.panels.openLead) actions.appendChild(u.btn('Open lead', { small: true, kind: 'ghost', onclick: function () { S.panels.openLead(r.lead_id); } }));
      if (r.status === 'booked') {
        actions.appendChild(u.btn('Move', { small: true, kind: 'outline', onclick: function () { reschedule(r); } }));
        if (Date.parse(r.slot_start) < Date.now()) {
          actions.appendChild(u.btn('Done', { small: true, kind: 'ghost', icon: 'check', onclick: function () { setStatus(r, 'done'); } }));
          actions.appendChild(u.btn('No-show', { small: true, kind: 'ghost', onclick: function () { setStatus(r, 'no_show'); } }));
        }
        actions.appendChild(u.btn('Cancel', { small: true, kind: 'danger', onclick: function () { cancel(r); } }));
      }
      return h('div', { class: 'hist__row bkrow' + (r.status !== 'booked' ? ' is-off' : '') }, [
        h('div', {}, [
          h('strong', { text: when(r.slot_start, tz()) }),
          h('span', { text: r.name }),
          h('small', { text: [r.phone, r.email].filter(Boolean).join(' · ') }),
          r.note ? h('small', { class: 'bkrow__note', text: '“' + r.note + '”' }) : null
        ]),
        h('div', { class: 'bkrow__side' }, [h('span', { class: 'pill pill--bk-' + r.status, text: STATUS[r.status] || r.status }), actions])
      ]);
    }
    function setStatus(r, st) {
      q(B().client.from('consultations').update({ status: st }).eq('id', r.id)).then(function () { u.toast('Marked ' + STATUS[st].toLowerCase(), 'ok'); loadBookings(); }).catch(function (e) { u.toast(e.message, 'err'); });
    }
    function cancel(r) {
      u.confirm({ title: 'Cancel this consultation?', body: r.name + ', ' + when(r.slot_start, tz()) + '. The time opens up for others again. No email is sent: let the couple know yourself.', ok: 'Cancel consultation', danger: true }).then(function (yes) {
        if (!yes) return;
        rpc('consult_cancel', { p_id: r.id }).then(function () { u.toast('Consultation cancelled', 'ok'); loadBookings(); S.panels.loadLeads && S.panels.loadLeads(); }).catch(function (e) { u.toast(e.message, 'err'); });
      });
    }
    function reschedule(r) {
      var m = u.modal({ title: 'Move consultation' });
      var input = h('input', { class: 'input', type: 'datetime-local', value: toLocalInput(r.slot_start, tz()), step: 300 });
      var notify = h('input', { type: 'checkbox', checked: true });
      var msg = h('p', { class: 'muted', role: 'status', 'aria-live': 'polite' });
      u.append(m.body, [
        h('p', {}, [h('strong', { text: r.name }), ' · now ' + when(r.slot_start, tz())]),
        h('label', { class: 'field' }, [h('span', { class: 'field__label', text: 'New date and time (' + (ZONES.filter(function (z) { return z[0] === tz(); })[0] || [0, tz()])[1] + ')' }), input]),
        h('label', { class: 'check' }, [notify, ' Email the new time to the couple (when automatic emails are on)']),
        h('p', { class: 'muted', text: 'You can pick any time, also outside your booking hours. It cannot overlap another booking.' }), msg
      ]);
      var go = u.btn('Move', { kind: 'gold', small: true, onclick: function () {
        var iso = CS.zonedToUtc(input.value, tz());
        if (!iso) { msg.textContent = 'Pick a date and time.'; return; }
        go.disabled = true; msg.textContent = 'Moving…';
        rpc('consult_reschedule', { p_id: r.id, p_slot: iso, p_notify: notify.checked }).then(function () { u.toast('Moved to ' + when(iso, tz()), 'ok'); m.close(); loadBookings(); })
          .catch(function (e) { go.disabled = false; msg.textContent = e.message; });
      } });
      m.foot.appendChild(go);
      m.foot.appendChild(u.btn('Close', { kind: 'ghost', small: true, onclick: function () { m.close(); } }));
    }

    /* ---------- blocked dates ---------- */
    function loadBlocks() {
      u.clear(blockBox); blockBox.appendChild(h('p', { class: 'muted', text: 'Loading…' }));
      q(B().client.from('consult_blocks').select('*').gte('day', u.ymd(new Date())).order('day')).then(drawBlocks)
        .catch(function (e) { u.clear(blockBox); blockBox.appendChild(h('p', { class: 'muted', text: 'Could not load: ' + e.message })); });
    }
    function drawBlocks(rows) {
      u.clear(blockBox);
      var day = h('input', { class: 'input input--date', type: 'date', min: u.ymd(new Date()), 'aria-label': 'Date to block' });
      var note = h('input', { class: 'input', maxlength: 200, placeholder: 'Reason (only you see it)', 'aria-label': 'Reason' });
      var add = u.btn('Block date', { small: true, kind: 'outline', icon: 'plus', onclick: function () {
        if (!day.value) { day.focus(); return; }
        q(B().client.from('consult_blocks').upsert({ day: day.value, note: note.value.trim() || null })).then(function () { u.toast('Blocked ' + u.fmtDate(day.value + 'T12:00:00'), 'ok'); loadBlocks(); }).catch(function (e) { u.toast(e.message, 'err'); });
      } });
      var list = h('div', { class: 'hist' });
      if (!rows.length) list.appendChild(h('p', { class: 'muted', text: 'No blocked dates.' }));
      rows.forEach(function (b) {
        list.appendChild(h('div', { class: 'hist__row' }, [
          h('div', {}, [h('strong', { text: u.fmtDate(b.day + 'T12:00:00') }), b.note ? h('small', { text: b.note }) : null]),
          u.btn('Unblock', { small: true, kind: 'ghost', icon: 'x', onclick: function () {
            q(B().client.from('consult_blocks').delete().eq('day', b.day)).then(function () { u.toast('Date open again', 'ok'); loadBlocks(); }).catch(function (e) { u.toast(e.message, 'err'); });
          } })
        ]));
      });
      u.append(blockBox, [h('div', { class: 'row row--wrap blockadd' }, [day, note, add]), list]);
    }

    /* ---------- calendar feed ---------- */
    function loadFeed() {
      u.clear(feedBox); feedBox.appendChild(h('p', { class: 'muted', text: 'Loading…' }));
      rpc('calendar_feed_info').then(drawFeed).catch(function (e) { u.clear(feedBox); feedBox.appendChild(F.note(missing(e) ? 'Calendar sync is not set up yet.' : 'Could not load: ' + e.message, 'warn')); });
    }
    function drawFeed(info) {
      u.clear(feedBox);
      var url = CS.feedUrl(info.token);
      var field = h('input', { class: 'input feed__url', readonly: true, value: url, 'aria-label': 'Private calendar link', onfocus: function () { this.select(); } });
      var copy = u.btn('Copy link', { small: true, kind: 'gold', icon: 'copy', onclick: function () {
        (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () { u.toast('Link copied', 'ok'); }, function () { field.focus(); field.select(); u.toast('Press Ctrl+C to copy', 'info'); });
      } });
      var rotate = u.btn('Make a new link', { small: true, kind: 'ghost', icon: 'reload', onclick: function () {
        u.confirm({ title: 'Make a new calendar link?', body: 'The old link stops working at once. Any calendar that uses it stops updating until you add the new link again.', ok: 'Make new link', danger: true }).then(function (yes) {
          if (!yes) return;
          rpc('calendar_feed_rotate').then(function (i) { u.toast('New link ready. Add it to your calendar again.', 'ok'); drawFeed(i); }).catch(function (e) { u.toast(e.message, 'err'); });
        });
      } });
      u.append(feedBox, [
        h('div', { class: 'row feed' }, [field, copy]),
        h('ul', { class: 'muted list feed__how' }, [
          h('li', { text: 'Google Calendar (on a computer): Other calendars → + → From URL → paste the link → Add calendar. Google refreshes it every few hours.' }),
          h('li', { text: 'Outlook: Add calendar → Subscribe from web → paste the link.' }),
          h('li', { text: 'iPhone / Mac: Settings → Calendar → Accounts → Add subscribed calendar → paste the link.' })
        ]),
        h('div', { class: 'row row--wrap' }, [rotate, h('small', { class: 'muted', text: 'Link made ' + u.fmtDate(info.rotated_at, true) + '. Make a new one if it was shared by mistake.' })])
      ]);
    }

    loadAll();
  };
})();
