/* Dreamz Studio — browser push notifications for new inquiries.
   The VAPID PUBLIC key below is meant to be public. The private key lives only in the database
   (private.push_config) and is used by the Edge Function "lead-push". Permission is asked only on click. */
(function () {
  'use strict';
  var S = (window.Studio = window.Studio || {});
  var u = S.u, h = u.h;
  var VAPID_PUBLIC = 'BK9x-B-qp6qfLCvItDNi8YXGqDnJj_WdTUFeKNMvmtM-2tru30Eyy8q6-LvJC4nWnDCFA1LHk_KFb4KAsJk2rdo';
  var LABEL_KEY = 'dp:studio:pushLabel';
  var P = (S.push = { reg: null, listeners: [] });
  function B() { return S.backend; }

  /* ---------- environment ---------- */
  var ua = navigator.userAgent || '';
  P.isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  P.isStandalone = function () { return navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches); };
  P.supported = function () { return window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; };
  function defaultLabel() {
    var br = /Edg\//.test(ua) ? 'Edge' : /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /Firefox\//.test(ua) ? 'Firefox' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
    var os = /iPhone/.test(ua) ? 'iPhone' : (/iPad/.test(ua) || P.isIOS) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'device';
    return (P.isStandalone() ? 'Studio app' : br) + ' on ' + os;
  }
  P.label = function () { try { return localStorage.getItem(LABEL_KEY) || defaultLabel(); } catch (e) { return defaultLabel(); } };
  P.setLabel = function (v) { try { localStorage.setItem(LABEL_KEY, String(v || '').slice(0, 100)); } catch (e) {} };

  /* ---------- service worker ---------- */
  P.register = function () {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) return Promise.resolve(null);
    if (P._regP) return P._regP;
    P._regP = navigator.serviceWorker.register('sw.js', { scope: './' }).then(function (reg) { P.reg = reg; return reg; })
      .catch(function (e) { console.warn('Service worker not registered:', e && e.message); return null; });
    navigator.serviceWorker.addEventListener('message', function (e) {
      var d = e.data || {};
      if (d.type === 'dp:open') openFromUrl(d.url, d.lead_id);
      else if (d.type === 'dp:push' && S.panels && S.panels.loadLeads && S.state && S.state.content) S.panels.loadLeads().then(function () { if (S.state.current === 'leads') S.rerender(); });
      else if (d.type === 'dp:resubscribe') P.state().then(function (st) { if (st.permission === 'granted') P.enable(true).catch(function () {}); });
    });
    return P._regP;
  };
  function ready() {
    return P.register().then(function (reg) {
      if (!reg) throw new Error('This browser could not start the notification helper.');
      return navigator.serviceWorker.ready;
    });
  }
  function openFromUrl(url, leadId) {
    var m = /#leads(?:\/([0-9a-z-]+))?/i.exec(url || '');
    if (!m && !leadId) return;
    if (S.panels && S.panels.openLead && S.state && S.state.content) S.panels.openLead(leadId || (m && m[1]) || null);
  }
  /* Called once the app is on screen: honours #leads or #leads/<id> from a notification tap. */
  P.handleHash = function () {
    if (!/^#leads(\/|$)/.test(location.hash)) return false;
    var id = location.hash.split('/')[1] || null;
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    if (S.panels && S.panels.openLead) S.panels.openLead(id);
    return true;
  };

  function b64ToBytes(s) {
    var pad = '='.repeat((4 - (s.length % 4)) % 4), b = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
    var out = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) out[i] = b.charCodeAt(i); return out;
  }

  /* ---------- state ---------- */
  /* -> {status: 'unsupported'|'ios-install'|'local'|'blocked'|'off'|'on', permission, endpoint} */
  P.state = function () {
    if (B().mode !== 'supabase') return Promise.resolve({ status: 'local' });
    if (P.isIOS && !P.isStandalone()) return Promise.resolve({ status: 'ios-install' });
    if (!P.supported()) return Promise.resolve({ status: 'unsupported' });
    var perm = Notification.permission;
    if (perm === 'denied') return Promise.resolve({ status: 'blocked', permission: perm });
    return P.register().then(function (reg) {
      if (!reg) return { status: 'unsupported' };
      return reg.pushManager.getSubscription().then(function (sub) {
        if (!sub || perm !== 'granted') return { status: 'off', permission: perm };
        return B().client.from('push_subscriptions').select('id').eq('endpoint', sub.endpoint).maybeSingle().then(function (r) {
          return { status: r.data ? 'on' : 'off', permission: perm, endpoint: sub.endpoint, id: r.data && r.data.id, sub: sub };
        });
      });
    });
  };

  /* ---------- actions ---------- */
  P.enable = function (silent) {
    var perm = silent ? Promise.resolve(Notification.permission) : Notification.requestPermission();
    return Promise.resolve(perm).then(function (p) {
      if (p !== 'granted') { var e = new Error(p === 'denied' ? 'blocked' : 'dismissed'); e.code = p; throw e; }
      return ready();
    }).then(function (reg) {
      return reg.pushManager.getSubscription().then(function (old) {
        return old || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(VAPID_PUBLIC) });
      });
    }).then(function (sub) {
      var j = sub.toJSON(), db = B().client.from('push_subscriptions');
      var row = { endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, user_agent: ua.slice(0, 500), label: P.label() };
      return B().timeout(db.delete().eq('endpoint', j.endpoint)).then(function () { return B().timeout(B().client.from('push_subscriptions').insert(row)); })
        .then(function (r) {
          if (r.error) {
            if (/duplicate|unique/i.test(r.error.message)) throw new Error('This browser is already linked to the other owner\'s login. Sign in as them and turn it off there first.');
            throw new Error(r.error.message);
          }
          return sub;
        });
    });
  };
  P.disable = function () {
    return ready().then(function (reg) { return reg.pushManager.getSubscription(); }).then(function (sub) {
      if (!sub) return;
      return B().timeout(B().client.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)).then(function () { return sub.unsubscribe(); });
    });
  };
  P.test = function () {
    return B().timeout(B().client.functions.invoke('lead-push', { body: { test: true } }), 20000).then(function (r) {
      if (r.error) throw new Error(r.error.message || 'The test could not be sent.');
      return r.data || {};
    });
  };
  P.devices = function () {
    return B().timeout(B().client.from('push_subscriptions').select('id,label,user_agent,created_at,last_ok_at,failures,endpoint').order('created_at', { ascending: true })).then(function (r) {
      if (r.error) throw new Error(r.error.message); return r.data || [];
    });
  };
  P.removeDevice = function (id) {
    return B().timeout(B().client.from('push_subscriptions').delete().eq('id', id)).then(function (r) { if (r.error) throw new Error(r.error.message); });
  };

  /* ---------- UI ---------- */
  var TEXT = {
    on: ['On', 'This device gets a notification for every new inquiry, even when the Studio is closed.'],
    off: ['Off', 'Turn this on to get a notification on this device for every new inquiry.'],
    blocked: ['Blocked', 'Notifications are blocked for this site in your browser settings. Open the site settings (the lock icon next to the address), allow Notifications, then reload this page.'],
    unsupported: ['Not available', 'This browser cannot receive push notifications. Try Chrome, Edge, Firefox or Safari (on iPhone: from the Home Screen app).'],
    'ios-install': ['Needs Home Screen', 'Add Dreamz Studio to your Home Screen first (Share → Add to Home Screen), then turn notifications on here.'],
    local: ['Not in practice mode', 'Notifications need the live Studio. Sign in online (not practice mode) on this device to turn them on.']
  };

  /* Full card. Used in the Notifications dialog. */
  P.card = function (el) {
    var box = h('div', { class: 'pushcard' });
    el.appendChild(box);
    function draw(st) {
      u.clear(box);
      var t = TEXT[st.status] || TEXT.unsupported;
      var disabled = st.status === 'unsupported' || st.status === 'ios-install' || st.status === 'local';
      box.classList.toggle('is-disabled', disabled);
      var label = h('input', { class: 'input', maxlength: 100, value: P.label(), 'aria-label': 'Name for this device', disabled: disabled });
      label.addEventListener('change', function () { P.setLabel(label.value.trim()); });
      var actions = h('div', { class: 'row row--wrap' });
      var msg = h('p', { class: 'pushcard__msg muted', role: 'status', 'aria-live': 'polite' });
      function busy(b, text) { u.$$('button', actions).forEach(function (x) { x.disabled = b; }); if (text != null) msg.textContent = text; }
      if (st.status === 'off') actions.appendChild(u.btn('Turn on notifications on this device', { kind: 'gold', small: true, icon: 'bell', onclick: function () {
        P.setLabel(label.value.trim()); busy(true, 'Asking your browser…');
        P.enable().then(function () { u.toast('Notifications are on for this device', 'ok'); refresh(); })
          .catch(function (e) {
            busy(false, '');
            if (e.code === 'denied') refresh();
            else if (e.code === 'default') msg.textContent = 'No problem — you can turn them on any time.';
            else msg.textContent = 'Could not turn on: ' + e.message;
          });
      } }));
      if (st.status === 'on') {
        actions.appendChild(u.btn('Send test notification', { kind: 'gold', small: true, icon: 'bell', onclick: function () {
          busy(true, 'Sending…');
          P.test().then(function (r) { busy(false, r.sent ? 'Sent to ' + r.sent + ' of your device' + (r.sent > 1 ? 's' : '') + '. It should appear in a few seconds.' : 'No device accepted the test. Try turning notifications off and on again.'); loadDevices(); })
            .catch(function (e) { busy(false, 'Test failed: ' + e.message); });
        } }));
        actions.appendChild(u.btn('Save device name', { kind: 'outline', small: true, onclick: function () {
          P.setLabel(label.value.trim()); busy(true, 'Saving…');
          P.enable(true).then(function () { busy(false, 'Saved.'); loadDevices(); }).catch(function (e) { busy(false, e.message); });
        } }));
        actions.appendChild(u.btn('Turn off on this device', { kind: 'ghost', small: true, onclick: function () {
          busy(true, 'Turning off…');
          P.disable().then(function () { u.toast('Notifications are off for this device', 'ok'); refresh(); }).catch(function (e) { busy(false, e.message); });
        } }));
      }
      if (st.status === 'blocked') actions.appendChild(u.btn('I changed it — check again', { kind: 'outline', small: true, onclick: refresh }));
      var devList = h('div', { class: 'pushcard__devices' });
      u.append(box, [
        h('div', { class: 'pushcard__state' }, [h('span', { class: 'dot ' + (st.status === 'on' ? 'dot--ok' : 'dot--warn') }), h('strong', { text: 'This device: ' + t[0] })]),
        h('p', { class: 'muted', text: t[1] }),
        h('label', { class: 'field' }, [h('span', { class: 'field__label', text: 'Device name' }), label]),
        actions, msg,
        B().mode === 'supabase' && !disabled ? h('h3', { class: 'group__title', text: 'Your devices' }) : null,
        B().mode === 'supabase' && !disabled ? devList : null
      ]);
      function loadDevices() {
        u.clear(devList); devList.appendChild(h('p', { class: 'muted', text: 'Loading…' }));
        P.devices().then(function (rows) {
          u.clear(devList);
          if (!rows.length) { devList.appendChild(h('p', { class: 'muted', text: 'No devices yet.' })); return; }
          rows.forEach(function (d) {
            var me = st.endpoint && d.endpoint === st.endpoint;
            devList.appendChild(h('div', { class: 'pushdev' }, [
              h('div', {}, [h('strong', { text: (d.label || 'Device') + (me ? ' (this device)' : '') }),
                h('small', { class: 'muted', text: 'Added ' + u.fmtDate(d.created_at) + (d.last_ok_at ? ' · last delivered ' + u.fmtDate(d.last_ok_at, true) : '') + (d.failures ? ' · ' + d.failures + ' failed' : '') })]),
              u.btn('Remove', { small: true, kind: 'ghost', icon: 'trash', onclick: function () {
                u.confirm({ title: 'Remove this device?', body: '"' + (d.label || 'Device') + '" will stop getting notifications. You can turn them on again from that device.', ok: 'Remove', danger: true }).then(function (yes) {
                  if (!yes) return;
                  (me ? P.disable() : P.removeDevice(d.id)).then(function () { u.toast('Device removed', 'ok'); refresh(); }).catch(function (e) { u.toast(e.message, 'err'); });
                });
              } })
            ]));
          });
        }).catch(function (e) { u.clear(devList); devList.appendChild(h('p', { class: 'muted', text: 'Could not load devices: ' + e.message })); });
      }
      if (B().mode === 'supabase' && !disabled) loadDevices();
    }
    function refresh() {
      u.clear(box); box.appendChild(h('p', { class: 'muted', text: 'Checking notifications…' }));
      return P.state().then(draw).catch(function (e) { draw({ status: 'off' }); u.toast('Notifications: ' + e.message, 'err'); }).then(notify);
    }
    refresh();
    return box;
  };

  /* Notifications dialog. */
  P.open = function () {
    var m = u.modal({ title: 'Notifications' });
    m.body.appendChild(h('p', { class: 'muted', text: 'Get a notification on your phone or computer the moment a new inquiry arrives. Turn it on separately on each device you use.' }));
    P.card(m.body);
    m.foot.appendChild(u.btn('Done', { kind: 'ghost', small: true, onclick: function () { m.close(); } }));
  };

  /* Small status button (Leads header + account menu). */
  function notify() { P.state().then(function (st) { P.listeners = P.listeners.filter(function (l) { return l.el.isConnected; }); P.listeners.forEach(function (l) { try { l.fn(st); } catch (e) {} }); }).catch(function () {}); }
  P.button = function (opts) {
    opts = opts || {};
    var b = u.btn(opts.label || 'Notifications', { small: true, kind: opts.kind || 'ghost', icon: 'bell', title: 'Notifications for new inquiries', onclick: P.open });
    b.classList.add('pushbtn');
    var tag = h('span', { class: 'pushbtn__state', text: '…' });
    b.appendChild(tag);
    P.listeners.push({ el: b, fn: function (st) { tag.textContent = (TEXT[st.status] || TEXT.unsupported)[0]; b.dataset.state = st.status; } });
    setTimeout(function () { P.listeners = P.listeners.filter(function (l) { return l.el.isConnected || l.el === b; }); notify(); }, 0);
    return b;
  };
})();
