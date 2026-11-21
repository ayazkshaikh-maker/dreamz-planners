/* Dreamz Planners — free consultation booking (Phase 1).
   Talks only to two public SECURITY DEFINER rpcs (supabase/migrations/2026112102_phase1_booking.sql):
     consult_slots  → free start times only (never other people's bookings or details)
     consult_book   → books one slot; re-checked atomically in the database (no double booking)
   Entry points ([data-booking-entry], data-action="booking", the wizard thank-you step) stay hidden
   until the owners have switched booking on in the Studio. All copy lives in content.booking. */
(function () {
  'use strict';
  var DP = (window.DP = window.DP || {});
  var u = DP.u;
  function C() { return DP.content; }
  function K() { return (C() && C().booking) || {}; }
  function I() { return DP.icons || {}; }
  function fill(s, map) { return String(s || '').replace(/\{(\w+)\}/g, function (m, k) { return map[k] != null ? map[k] : m; }); }

  var BK = (DP.booking = { state: null, data: null, open: false });
  var probe = null;

  function client() { return DP.data && DP.data.client ? DP.data.client() : null; }
  function rpc(name, args) {
    var c = client();
    if (!c) return Promise.reject(new Error('offline'));
    var t = new Promise(function (res, rej) { setTimeout(function () { rej(new Error('timeout')); }, 9000); });
    return Promise.race([c.rpc(name, args || {}), t]).then(function (r) {
      if (r.error) { var e = new Error(r.error.message || 'error'); e.code = r.error.code; throw e; }
      return r.data;
    });
  }

  /* ---------- time helpers (always shown in the owners' time zone) ---------- */
  function parts(iso, tz) {
    var p = {};
    new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date(iso)).forEach(function (x) { p[x.type] = x.value; });
    return p;
  }
  function dayKey(iso, tz) { var p = parts(iso, tz); return p.year + '-' + p.month + '-' + p.day; }
  function fmt(iso, tz, o) { return new Intl.DateTimeFormat('en-US', Object.assign({ timeZone: tz }, o)).format(new Date(iso)); }
  function timeLabel(iso, tz) { return fmt(iso, tz, { hour: 'numeric', minute: '2-digit' }); }
  function longLabel(iso, tz) { return fmt(iso, tz, { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }); }
  function localDiffers(iso, tz) {
    try { var mine = Intl.DateTimeFormat().resolvedOptions().timeZone; return mine && mine !== tz && fmt(iso, mine, { hour: 'numeric', minute: '2-digit' }) !== timeLabel(iso, tz); } catch (e) { return false; }
  }
  function ics(d) { return d.replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
  function fold(line) { var out = []; while (line.length > 70) { out.push(line.slice(0, 70)); line = ' ' + line.slice(70); } out.push(line); return out.join('\r\n'); }
  function icsText(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }

  /* ---------- availability probe: reveals the entry points ---------- */
  BK.check = function (force) {
    if (probe && !force) return probe;
    var k = K();
    if (k.enabled === false || !client()) { probe = Promise.resolve(false); reveal(false); return probe; }
    probe = rpc('consult_slots', { p_days: 62 }).then(function (d) {
      BK.data = d && d.enabled ? d : null;
      var on = !!(BK.data && BK.data.slots && BK.data.slots.length);
      reveal(on);
      return on;
    }).catch(function () { reveal(false); return false; });
    return probe;
  };
  BK.available = function () { return !!(BK.data && BK.data.slots && BK.data.slots.length) && K().enabled !== false; };
  function reveal(on) { u.$$('[data-booking-entry]').forEach(function (el) { el.hidden = !on; }); }

  /* ---------- dialog ---------- */
  BK.openDialog = function (prefill) {
    var d = u.$('#booking');
    if (!d) return;
    var title = u.$('#booking-title');
    if (title) title.innerHTML = u.rich(K().title || 'Book a free consultation');
    BK.state = { step: 'pick', day: '', slot: '', name: '', email: '', phone: '', note: '', company: '', result: null, error: '' };
    if (prefill) ['name', 'email', 'phone'].forEach(function (k) { if (prefill[k]) BK.state[k] = String(prefill[k]); });
    DP.tools.open(d);
    render(true);
  };

  function root() { return u.$('#booking-root'); }

  function render(reload) {
    var el = root(), k = K(), s = BK.state;
    if (!el || !s) return;
    if (s.step === 'done') return renderDone();
    if (reload || !BK.data) {
      el.innerHTML = '<p class="hint" role="status">' + u.esc(k.loading || 'Finding open times…') + '</p>';
      return BK.check(true).then(function () { render(false); });
    }
    var d = BK.data, tz = d.timezone;
    if (!d.slots || !d.slots.length) {
      el.innerHTML = '<p class="bk__closed">' + u.esc(BK.data ? k.noSlots : k.closed) + '</p>' + direct();
      return;
    }
    var byDay = {}, days = [];
    d.slots.forEach(function (iso) { var key = dayKey(iso, tz); if (!byDay[key]) { byDay[key] = []; days.push(key); } byDay[key].push(iso); });
    if (!s.day || !byDay[s.day]) s.day = days[0];
    if (s.slot && d.slots.indexOf(s.slot) < 0) s.slot = '';
    var intro = fill(k.intro, { minutes: d.slot_minutes });
    var tzName = fmt(d.slots[0], tz, { timeZoneName: 'long' }).split(', ').pop();

    if (s.step === 'pick') {
      var dayBtns = days.map(function (key) {
        var iso = byDay[key][0], on = key === s.day;
        return '<button type="button" class="bk__day" role="radio" aria-checked="' + on + '" tabindex="' + (on ? 0 : -1) + '" data-day="' + key + '">' +
          '<small>' + u.esc(fmt(iso, tz, { weekday: 'short' })) + '</small><b>' + u.esc(fmt(iso, tz, { day: 'numeric' })) + '</b><small>' + u.esc(fmt(iso, tz, { month: 'short' })) + '</small></button>';
      }).join('');
      var times = byDay[s.day].map(function (iso, i) {
        var on = iso === s.slot, focusable = on || (!s.slot && i === 0) || (s.slot && byDay[s.day].indexOf(s.slot) < 0 && i === 0);
        return '<button type="button" class="chip bk__time" role="radio" aria-checked="' + on + '" tabindex="' + (focusable ? 0 : -1) + '" data-slot="' + iso + '">' + u.esc(timeLabel(iso, tz)) + '</button>';
      }).join('');
      el.innerHTML = '<div class="bk">' +
        '<p class="bk__intro">' + u.rich(intro) + '</p>' +
        '<p class="field-label" id="bk-dayq">' + u.esc(k.dayLabel) + '</p>' +
        '<div class="bk__days" role="radiogroup" aria-labelledby="bk-dayq">' + dayBtns + '</div>' +
        '<p class="field-label" id="bk-timeq">' + u.esc(fmt(byDay[s.day][0], tz, { weekday: 'long', month: 'long', day: 'numeric' })) + ' · ' + u.esc(k.timeLabel) + '</p>' +
        '<div class="chips bk__times" role="radiogroup" aria-labelledby="bk-timeq">' + times + '</div>' +
        '<p class="hint bk__tz">' + u.esc(fill(k.tzNote, { tz: tzName })) + '</p>' +
        '<p class="wiz__error" role="alert" aria-live="assertive">' + u.esc(s.error) + '</p>' +
        '<div class="wiz__nav"><span></span><button type="button" class="btn btn--gold" data-next' + (s.slot ? '' : ' aria-disabled="true"') + '>' + u.esc(k.next || 'Continue') + ' ' + (I().arrow || '') + '</button></div></div>';
    } else {
      var other = localDiffers(s.slot, tz) ? ' <span class="bk__local">(' + u.esc(fill(k.yourTime, { time: fmt(s.slot, Intl.DateTimeFormat().resolvedOptions().timeZone, { weekday: 'short', hour: 'numeric', minute: '2-digit' }) })) + ')</span>' : '';
      el.innerHTML = '<form class="bk" novalidate>' +
        '<div class="bk__summary"><span class="field-label">' + u.esc(k.chosenLabel) + '</span><strong>' + u.esc(longLabel(s.slot, tz)) + '</strong>' + other +
        ' <button type="button" class="linkbtn" data-change>' + u.esc(k.change) + '</button></div>' +
        '<h3 class="wiz__q bk__q">' + u.esc(k.detailsTitle) + '</h3>' +
        '<div class="field"><label for="bk-name">' + u.esc(k.nameLabel) + '</label><input class="input" id="bk-name" name="name" autocomplete="name" required maxlength="120" value="' + u.esc(s.name) + '"></div>' +
        '<div class="field-row"><div class="field"><label for="bk-email">' + u.esc(k.emailLabel) + '</label><input class="input" type="email" id="bk-email" name="email" autocomplete="email" required maxlength="160" value="' + u.esc(s.email) + '"></div>' +
        '<div class="field"><label for="bk-phone">' + u.esc(k.phoneLabel) + '</label><input class="input" type="tel" id="bk-phone" name="phone" autocomplete="tel" inputmode="tel" required maxlength="40" value="' + u.esc(s.phone) + '"></div></div>' +
        '<div class="field"><label for="bk-note">' + u.esc(k.noteLabel) + '</label><textarea class="input" id="bk-note" name="note" rows="2" maxlength="1000">' + u.esc(s.note) + '</textarea></div>' +
        '<div class="hp" aria-hidden="true"><label>Company<input tabindex="-1" autocomplete="off" name="company" value=""></label></div>' +
        '<p class="wiz__note">' + u.esc((C().wizard && C().wizard.consent) || '') + ' <a href="privacy.html">Privacy</a>.</p>' +
        '<p class="wiz__error" role="alert" aria-live="assertive">' + u.esc(s.error) + '</p>' +
        '<div class="wiz__nav"><button type="button" class="btn btn--ghost" data-change>' + u.esc((C().labels && C().labels.back) || 'Back') + '</button>' +
        '<button type="submit" class="btn btn--gold">' + u.esc(k.confirm) + ' ' + (I().arrow || '') + '</button></div></form>';
    }
    bind();
  }

  function direct() {
    var c = C();
    return '<div class="bk__direct">' + (c.contact.phones || []).map(function (ph) {
      return '<a class="btn btn--ghost" href="' + u.telHref(ph) + '">' + (I().phone || '') + ' ' + u.esc(c.labels.call) + ' ' + u.esc(ph.number) + '</a>';
    }).join('') + '<a class="btn btn--ghost" href="' + u.waHref(c.contact.whatsapp.number, c.contact.whatsapp.defaultMessage) + '" target="_blank" rel="noopener">' + (I().chat || '') + ' ' + u.esc(c.labels.whatsapp) + '</a></div>';
  }

  function focusFirst(sel) { var x = root().querySelector(sel); if (x) try { x.focus({ preventScroll: true }); } catch (e) {} }

  function bind() {
    var el = root(), s = BK.state, k = K();
    el.onclick = function (e) {
      var day = e.target.closest('[data-day]');
      if (day) { s.day = day.dataset.day; s.slot = ''; s.error = ''; render(); focusFirst('.bk__day[aria-checked=true]'); return; }
      var slot = e.target.closest('[data-slot]');
      if (slot) { s.slot = slot.dataset.slot; s.error = ''; render(); focusFirst('.bk__time[aria-checked=true]'); return; }
      if (e.target.closest('[data-next]')) {
        if (!s.slot) { s.error = k.errSlot; render(); focusFirst('.bk__time'); return; }
        s.error = ''; s.step = 'details'; render(); focusFirst('#bk-name'); return;
      }
      if (e.target.closest('[data-change]')) { collect(); s.step = 'pick'; s.error = ''; render(); focusFirst('.bk__time[aria-checked=true], .bk__time'); }
    };
    // arrow keys move between options inside a radiogroup (roving tabindex)
    el.onkeydown = function (e) {
      var opt = e.target.closest('[role=radio]');
      if (!opt || ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].indexOf(e.key) < 0) return;
      var all = u.$$('[role=radio]', opt.parentNode), i = all.indexOf(opt);
      var nx = all[(i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + all.length) % all.length];
      e.preventDefault(); nx.click();
    };
    var f = el.querySelector('form');
    if (f) f.addEventListener('submit', function (e) { e.preventDefault(); collect(); submit(); });
  }

  function collect() {
    var f = root().querySelector('form'), s = BK.state;
    if (!f) return;
    ['name', 'email', 'phone', 'note', 'company'].forEach(function (k) { if (f.elements[k]) s[k] = String(f.elements[k].value || '').trim(); });
  }

  function validate() {
    var s = BK.state, k = K(), f = root().querySelector('form'), err = '', bad = null;
    var digits = s.phone.replace(/\D/g, '');
    if (!s.name) { err = k.errName; bad = 'name'; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.email)) { err = k.errEmail; bad = 'email'; }
    else if (digits.length < 7 || digits.length > 15) { err = k.errPhone; bad = 'phone'; }
    u.$$('[aria-invalid]', f).forEach(function (x) { x.removeAttribute('aria-invalid'); });
    f.querySelector('.wiz__error').textContent = err;
    if (bad) { f.elements[bad].setAttribute('aria-invalid', 'true'); f.elements[bad].focus(); }
    return !err;
  }

  function submit() {
    var s = BK.state, k = K();
    if (!validate()) return;
    var btn = root().querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = k.sending || '…';
    if (s.company) { s.result = { start: s.slot, end: new Date(Date.parse(s.slot) + BK.data.slot_minutes * 60000).toISOString(), id: 'x' }; s.step = 'done'; render(); return; } // honeypot
    rpc('consult_book', { p_slot: s.slot, p_name: s.name, p_email: s.email, p_phone: s.phone, p_note: s.note || null }).then(function (r) {
      s.result = r; s.step = 'done';
      BK.check(true);
      render();
    }).catch(function (e) {
      var friendly = e.code === 'P0001' || e.code === '22023';
      s.error = friendly ? e.message : k.errGeneric;
      if (friendly && /taken|no longer open/i.test(e.message)) {
        s.step = 'pick'; s.slot = '';
        return BK.check(true).then(function () { render(); focusFirst('.bk__time'); });
      }
      render();
    });
  }

  function renderDone() {
    var s = BK.state, k = K(), c = C(), r = s.result || {}, tz = (BK.data && BK.data.timezone) || 'America/New_York';
    var label = longLabel(r.start || s.slot, tz);
    var gcal = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(k.eventTitle || '') +
      '&dates=' + ics(r.start) + '/' + ics(r.end) + '&details=' + encodeURIComponent(k.eventDetails || '');
    root().innerHTML = '<div class="wiz__success bk__done">' + (I().seal || '').replace('<svg', '<svg class="seal"') +
      '<h3 class="wiz__q" tabindex="-1">' + u.rich(k.successTitle) + '</h3>' +
      '<p class="bk__when"><strong>' + u.esc(label) + '</strong></p>' +
      '<p style="color:var(--muted);margin:0 auto;max-width:30rem">' + u.rich(fill(k.successBody, { minutes: (BK.data && BK.data.slot_minutes) || 30 })) + '</p>' +
      '<div class="actions"><button type="button" class="btn btn--gold" data-ics>' + u.esc(k.addToCalendar) + '</button>' +
      '<a class="btn btn--ghost" href="' + u.esc(gcal) + '" target="_blank" rel="noopener">' + u.esc(k.googleCalendar) + '</a>' +
      '<a class="btn btn--ghost" href="' + u.waHref(c.contact.whatsapp.number, c.contact.whatsapp.defaultMessage) + '" target="_blank" rel="noopener">' + (I().chat || '') + ' ' + u.esc(c.labels.whatsapp) + '</a></div></div>';
    root().querySelector('[data-ics]').addEventListener('click', function () { downloadIcs(r); });
    var h3 = root().querySelector('h3'); if (h3) h3.focus();
  }

  function downloadIcs(r) {
    var k = K(), now = ics(new Date().toISOString());
    var body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Dreamz Planners//Website//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
      'UID:consult-' + (r.id || now) + '@dreamzplanners', 'DTSTAMP:' + now, 'DTSTART:' + ics(r.start), 'DTEND:' + ics(r.end),
      'SUMMARY:' + icsText(k.eventTitle), 'DESCRIPTION:' + icsText(k.eventDetails), 'STATUS:CONFIRMED',
      'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsText(k.eventTitle), 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'].map(fold).join('\r\n') + '\r\n';
    var url = URL.createObjectURL(new Blob([body], { type: 'text/calendar;charset=utf-8' }));
    var a = document.createElement('a');
    a.href = url; a.download = 'dreamz-consultation.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  /* Called on every mount (content may have changed in the Studio preview). */
  BK.init = function () {
    var t = u.$('#booking-title');
    if (t) t.innerHTML = u.rich(K().title || '');
    u.$$('[data-booking-entry]').forEach(function (el) { el.hidden = !BK.available(); });
    BK.check();
  };
})();
