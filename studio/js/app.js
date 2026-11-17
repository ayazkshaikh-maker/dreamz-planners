/* Dreamz Studio — boot, sign-in, layout, live preview, save / publish. */
(function () {
  'use strict';
  var S = (window.Studio = window.Studio || {});
  var u = S.u, h = u.h, B = S.backend;
  var state = (S.state = { content: null, defaults: null, savedJSON: '', current: null, previewOverride: null, device: 'desktop' });
  var root = document.getElementById('studio');

  var PANELS = [
    { id: 'media', label: 'Media library', wide: true, render: function (el) { S.media.panel(el); } },
    { id: 'leads', label: 'Leads inbox', wide: true, badge: true, render: function (el) { S.panels.leads(el); } },
    { id: 'availability', label: 'Availability', wide: true, render: function (el) { S.panels.calendar(el); } },
    { id: 'reviews-mgr', label: 'Reviews', wide: true, render: function (el) { S.panels.reviews(el); } },
    { id: 'publish', label: 'Publish & history', render: function (el) { S.panels.publish(el); } }
  ];

  /* ---------------- boot ---------------- */
  function screen(node) { u.clear(root); root.appendChild(node); }
  function loading(text) { screen(h('div', { class: 'boot' }, [h('img', { src: '../assets/brand/logo-mark.svg', alt: '', class: 'boot__mark' }), h('p', { class: 'muted', text: text || 'Opening the Studio…' })])); }

  function boot() {
    loading();
    var hashErr = /error_description=([^&]+)/.exec(location.hash);
    Promise.all([
      fetch('../content/site-content.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('Could not load the default content (' + r.status + ').'); return r.json(); }),
      S.media.load(),
      B.init()
    ]).then(function (r) {
      state.defaults = r[0];
      if (hashErr) u.toast(decodeURIComponent(hashErr[1].replace(/\+/g, ' ')), 'err', 9000);
      if (B.mode === 'local') return enterApp();
      B.onAuth(function (ev) {
        if (ev === 'PASSWORD_RECOVERY') showNewPassword();
        else if (ev === 'SIGNED_IN' && !state.content && !state.checking) checkAdmin();
        else if (ev === 'SIGNED_OUT') { state.content = null; showAuth(); }
      });
      return B.session().then(function (s) { if (/type=recovery/.test(location.hash)) return; if (s) return checkAdmin(); showAuth(); });
    }).catch(function (e) {
      screen(h('div', { class: 'auth' }, [h('div', { class: 'auth__card' }, [h('h1', { class: 'display', text: 'Something went wrong' }), h('p', { text: e.message }), u.btn('Try again', { kind: 'gold', onclick: function () { location.reload(); } })])]));
    });
  }

  function checkAdmin() {
    state.checking = true;
    loading('Checking your access…');
    return B.isAdmin().then(function (ok) { state.checking = false; if (ok) return enterApp(); showDenied(); })
      .catch(function (e) { state.checking = false; u.toast('Could not check access: ' + e.message, 'err'); showDenied(e.message); });
  }

  /* ---------------- auth screens ---------------- */
  function brandHead(sub) {
    return h('div', { class: 'auth__brand' }, [h('img', { src: '../assets/brand/logo-horizontal.svg', alt: 'Dreamz Planners', class: 'auth__logo' }), h('p', { class: 'eyebrow', text: sub || 'Studio' })]);
  }
  function showAuth(tab) {
    tab = tab || 'signin';
    var card = h('div', { class: 'auth__card' });
    var tabs = [['signin', 'Sign in'], ['magic', 'Email me a link'], ['setup', 'First-time setup'], ['reset', 'Forgot password']];
    var seg = h('div', { class: 'seg seg--auth', role: 'tablist' }, tabs.map(function (t) {
      return h('button', { type: 'button', role: 'tab', class: 'seg__btn', 'aria-selected': String(t[0] === tab), text: t[1], onclick: function () { showAuth(t[0]); } });
    }));
    var msg = h('p', { class: 'auth__msg', role: 'status', 'aria-live': 'polite' });
    function say(text, kind) { msg.textContent = text; msg.className = 'auth__msg auth__msg--' + (kind || 'info'); }
    var email = h('input', { class: 'input', type: 'email', autocomplete: 'username', required: true, placeholder: 'you@example.com', value: sessionStorage.getItem('dp:studio:email') || '' });
    var pw = h('input', { class: 'input', type: 'password', autocomplete: tab === 'setup' ? 'new-password' : 'current-password', minlength: tab === 'setup' ? 8 : null, placeholder: tab === 'setup' ? 'At least 8 characters' : '' });
    var pw2 = h('input', { class: 'input', type: 'password', autocomplete: 'new-password', placeholder: 'Type it again' });
    var fields = [h('label', { class: 'field' }, [h('span', { class: 'field__label', text: 'Email' }), email])];
    if (tab === 'signin' || tab === 'setup') fields.push(h('label', { class: 'field' }, [h('span', { class: 'field__label', text: tab === 'setup' ? 'Choose a password' : 'Password' }), pw]));
    if (tab === 'setup') fields.push(h('label', { class: 'field' }, [h('span', { class: 'field__label', text: 'Confirm password' }), pw2]));
    var intro = {
      signin: 'Welcome back. Sign in with the email and password you set up.',
      magic: 'We email you a one-tap sign-in link. Open it on this device.',
      setup: 'Create your Studio login once. You will get an email to confirm your address. Only the owners\' email addresses (on the owner list) can open the Studio.',
      reset: 'Enter your email and we will send a link to choose a new password.'
    }[tab];
    var submit = u.btn({ signin: 'Sign in', magic: 'Send my link', setup: 'Create my login', reset: 'Send reset link' }[tab], { kind: 'gold', cls: 'btn--block' });
    submit.type = 'submit';
    var form = h('form', { class: 'auth__form', novalidate: true }, [h('p', { class: 'muted', text: intro })].concat(fields, [msg, submit]));
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var em = email.value.trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { say('Please enter a valid email address.', 'err'); email.focus(); return; }
      try { sessionStorage.setItem('dp:studio:email', em); } catch (x) {}
      if (tab === 'setup') {
        if (pw.value.length < 8) { say('Use at least 8 characters for your password.', 'err'); pw.focus(); return; }
        if (pw.value !== pw2.value) { say('The two passwords do not match.', 'err'); pw2.focus(); return; }
      }
      if (tab === 'signin' && !pw.value) { say('Please enter your password.', 'err'); pw.focus(); return; }
      submit.disabled = true; say('One moment…');
      var p = tab === 'signin' ? B.signIn(em, pw.value) : tab === 'magic' ? B.magicLink(em) : tab === 'setup' ? B.signUp(em, pw.value) : B.resetPassword(em);
      p.then(function (data) {
        submit.disabled = false;
        if (tab === 'signin') { say('Signed in.', 'ok'); return checkAdmin(); }
        if (tab === 'magic') say('Check your inbox for the sign-in link. It works once and expires soon.', 'ok');
        if (tab === 'reset') say('If that email has a Studio login, a reset link is on its way.', 'ok');
        if (tab === 'setup') {
          if (data && data.user && Array.isArray(data.user.identities) && !data.user.identities.length) say('That email already has a login. Use "Sign in" or "Forgot password".', 'err');
          else if (data && data.session) { say('Login created.', 'ok'); checkAdmin(); }
          else say('Almost done: open the confirmation email we just sent, then come back and sign in. Remember — only email addresses on the owner list get access.', 'ok');
        }
      }).catch(function (err) {
        submit.disabled = false;
        var m = err.message || 'Something went wrong.';
        if (/confirm/i.test(m)) m = 'Please confirm your email first — open the link in the email we sent you.';
        else if (/invalid login/i.test(m)) m = 'That email and password do not match. Try again, or use "Forgot password".';
        else if (/signups not allowed|user not found|otp/i.test(m) && tab === 'magic') m = 'No Studio login exists for that email yet. Use "First-time setup" first.';
        else if (/rate limit|too many/i.test(m)) m = 'Too many attempts — please wait a minute and try again.';
        say(m, 'err');
      });
    });
    u.append(card, [brandHead('Appearance Studio'), seg, form,
      h('div', { class: 'auth__alt' }, [
        B.mode === 'local' ? null : h('button', { type: 'button', class: 'linkish', text: 'Just exploring? Open practice mode (changes stay on this device)', onclick: function () { B.forceLocal(true); location.href = location.pathname; } }),
        h('a', { class: 'linkish', href: '../index.html', text: '← Back to the website' })
      ])
    ]);
    screen(h('div', { class: 'auth' }, [card]));
    setTimeout(function () { (email.value ? (pw.parentNode ? pw : email) : email).focus(); }, 50);
  }

  function showNewPassword() {
    var pw = h('input', { class: 'input', type: 'password', autocomplete: 'new-password', placeholder: 'At least 8 characters' });
    var pw2 = h('input', { class: 'input', type: 'password', autocomplete: 'new-password' });
    var msg = h('p', { class: 'auth__msg', role: 'status' });
    var submit = u.btn('Save new password', { kind: 'gold', cls: 'btn--block' }); submit.type = 'submit';
    var form = h('form', { class: 'auth__form' }, [h('p', { class: 'muted', text: 'Choose a new password for your Studio login.' }), h('label', { class: 'field' }, [h('span', { class: 'field__label', text: 'New password' }), pw]), h('label', { class: 'field' }, [h('span', { class: 'field__label', text: 'Confirm' }), pw2]), msg, submit]);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (pw.value.length < 8) { msg.textContent = 'Use at least 8 characters.'; return; }
      if (pw.value !== pw2.value) { msg.textContent = 'The passwords do not match.'; return; }
      submit.disabled = true;
      B.updatePassword(pw.value).then(function () { u.toast('Password updated', 'ok'); history.replaceState(null, '', location.pathname); checkAdmin(); }).catch(function (err) { submit.disabled = false; msg.textContent = err.message; });
    });
    screen(h('div', { class: 'auth' }, [h('div', { class: 'auth__card' }, [brandHead('New password'), form])]));
  }

  function showDenied(extra) {
    var email = (B.user && B.user.email) || 'this account';
    screen(h('div', { class: 'auth' }, [h('div', { class: 'auth__card auth__card--denied' }, [
      brandHead('Studio'),
      h('h1', { class: 'display', text: 'This login is not on the owner list' }),
      h('p', {}, ['You are signed in as ', h('strong', { text: email }), ', but the Studio only opens for the Dreamz Planners owners.']),
      h('ul', { class: 'muted list' }, [
        h('li', { text: 'If you just created your login, open the confirmation email first, then sign in again.' }),
        h('li', { text: 'If you are an owner and still see this, ask your web helper to add this exact email to the owner list.' })
      ]),
      extra ? h('p', { class: 'muted', text: 'Details: ' + extra }) : null,
      h('div', { class: 'row row--wrap' }, [
        u.btn('Check again', { kind: 'outline', onclick: checkAdmin }),
        u.btn('Sign out', { kind: 'gold', onclick: function () { B.signOut().then(function () { showAuth(); }); } })
      ])
    ])]));
  }

  /* ---------------- app ---------------- */
  function enterApp() {
    loading('Loading your content…');
    return B.loadContentRows().then(function (rows) {
      var base = rows.draft || rows.published || {};
      state.content = u.merge(u.clone(state.defaults), base);
      if (window.DP && DP.upgradeContent) DP.upgradeContent(state.content, base, state.defaults); // adds chapters introduced after this content was saved
      state.savedJSON = JSON.stringify(state.content);
      state.rows = rows;
      buildLayout();
      var last = null; try { last = sessionStorage.getItem('dp:studio:view'); } catch (e) {}
      go(last && (S.editorById(last) || panelById(last)) ? last : 'brand');
      if (S.panels.loadLeads) S.panels.loadLeads();
    }).catch(function (e) {
      u.toast('Could not load content: ' + e.message + ' — switching to local mode.', 'err', 9000);
      B.mode = 'local'; B.reason = 'offline';
      return enterApp();
    });
  }
  function panelById(id) { return PANELS.filter(function (p) { return p.id === id; })[0]; }

  var els = {};
  function buildLayout() {
    var modeBadge = B.mode === 'local'
      ? h('span', { class: 'mode mode--local', title: 'Nothing here reaches the live website' }, [h('span', { class: 'dot dot--warn' }), { practice: 'Practice mode · this device only', disabled: 'Local mode · Supabase switched off', offline: 'Offline · local mode' }[B.reason] || 'Local mode'])
      : h('span', { class: 'mode mode--live' }, [h('span', { class: 'dot dot--ok' }), 'Live']);
    els.dirty = h('span', { class: 'saved', role: 'status', 'aria-live': 'polite' });
    els.save = u.btn('Save draft', { kind: 'outline', small: true, title: 'Save draft (Ctrl+S)', onclick: function () { saveDraft(); } });
    els.publish = u.btn('Publish', { kind: 'gold', small: true, onclick: function () { publish(); } });
    function userMenuEl(cls) {
      return h('div', { class: cls }, [
        B.mode === 'supabase' ? h('span', { class: 'user__email', text: (B.user && B.user.email) || '' }) : null,
        B.mode === 'supabase'
          ? u.btn('Sign out', { small: true, kind: 'ghost', onclick: function () { guardLeave().then(function (ok) { if (ok) B.signOut(); }); } })
          : (B.reason === 'practice' ? u.btn('Exit practice', { small: true, kind: 'ghost', onclick: function () { guardLeave().then(function (ok) { if (ok) { B.forceLocal(false); location.href = location.pathname; } }); } }) : null)
      ]);
    }
    var userMenu = userMenuEl('user');
    var menuBtn = h('button', { type: 'button', class: 'icon-btn top__menu', 'aria-label': 'Open menu', onclick: function () { document.body.classList.toggle('nav-open'); } }, [u.icon('menu', 20)]);
    var prevBtn = h('button', { type: 'button', class: 'icon-btn top__prev', 'aria-label': 'Show preview', onclick: function () { document.body.classList.toggle('preview-open'); schedulePreview(); } }, [u.icon('eye', 20)]);
    var top = h('header', { class: 'top' }, [menuBtn,
      h('a', { class: 'top__brand', href: '../index.html', target: '_blank', rel: 'noopener', title: 'Open the website' }, [h('img', { src: '../assets/brand/logo-mark.svg', alt: '' }), h('span', {}, [h('strong', { text: 'Dreamz' }), h('em', { text: 'Studio' })])]),
      modeBadge, h('span', { class: 'top__spacer' }), els.dirty, prevBtn, els.save, els.publish, userMenu
    ]);

    els.nav = h('nav', { class: 'nav', 'aria-label': 'Editors' });
    var groups = {};
    S.editors.forEach(function (e) { (groups[e.group] = groups[e.group] || []).push(e); });
    Object.keys(groups).forEach(function (g) {
      els.nav.appendChild(h('p', { class: 'nav__group', text: g }));
      groups[g].forEach(function (e) { els.nav.appendChild(navItem(e.id, e.label)); });
    });
    els.nav.appendChild(h('p', { class: 'nav__group', text: 'Manage' }));
    PANELS.forEach(function (p) { els.nav.appendChild(navItem(p.id, p.label, p.badge)); });
    els.nav.appendChild(h('p', { class: 'nav__keys muted', text: 'Ctrl+S saves the draft' }));
    els.nav.appendChild(userMenuEl('user user--nav'));

    els.editor = h('main', { class: 'editor', id: 'editor', tabindex: '-1' });
    els.preview = buildPreview();
    var localNote = B.mode === 'local' ? h('div', { class: 'banner' }, [h('p', { text: B.reason === 'practice'
      ? 'Practice mode: everything you do is saved in this browser only. "Publish" updates the local preview page (index.html?preview=local) — not the live website.'
      : 'The live database is not reachable, so the Studio is working locally in this browser. Drafts and publishes stay on this device until you sign in online.' })]) : null;
    var scrim = h('div', { class: 'scrim', onclick: function () { document.body.classList.remove('nav-open'); } });
    screen(h('div', { class: 'shell' }, [top, localNote, h('div', { class: 'body' }, [els.nav, scrim, els.editor, els.preview])]));
    refreshDirty();
  }
  function navItem(id, label, badge) {
    var b = h('button', { type: 'button', class: 'nav__item', dataset: { id: id }, onclick: function () { go(id); } }, [h('span', { text: label }), badge ? h('span', { class: 'badge', hidden: true }) : null]);
    return b;
  }
  S.updateBadges = function () {
    var n = S.panels.leadsCount ? S.panels.leadsCount() : 0;
    u.$$('.nav__item[data-id="leads"] .badge').forEach(function (b) { b.textContent = n; b.hidden = !n; b.setAttribute('aria-label', n + ' new leads'); });
  };

  function go(id) {
    state.current = id;
    try { sessionStorage.setItem('dp:studio:view', id); } catch (e) {}
    document.body.classList.remove('nav-open');
    u.$$('.nav__item', els.nav).forEach(function (b) { b.classList.toggle('is-active', b.dataset.id === id); if (b.dataset.id === id) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    var panel = panelById(id), ed = S.editorById(id);
    document.body.classList.toggle('is-wide', !!(panel && panel.wide));
    S.onDirty = null;
    u.clear(els.editor);
    if (panel) panel.render(els.editor);
    else if (ed) {
      els.editor.appendChild(h('div', { class: 'panel-head' }, [h('div', {}, [h('p', { class: 'eyebrow', text: ed.group }), h('h2', { class: 'panel-title', text: ed.label })])]));
      u.append(els.editor, ed.render());
      var sec = (state.content.sections || []).filter(function (s) { return s.id === id; })[0];
      if (sec) setTimeout(function () { scrollPreviewTo(id); }, 50);
      if (sec && sec.visible === false) els.editor.insertBefore(S.F.note('This chapter is switched off in "Sections & menu", so it is not on the page.', 'warn'), els.editor.children[1]);
    }
    els.editor.scrollTop = 0;
  }
  S.go = go;
  S.rerender = function () { var y = els.editor.scrollTop; go(state.current); els.editor.scrollTop = y; };

  /* ---------------- dirty tracking ---------------- */
  S.isDirty = function () { return !!state.content && JSON.stringify(state.content) !== state.savedJSON; };
  function refreshDirty() {
    if (!els.dirty) return;
    var d = S.isDirty();
    els.dirty.textContent = d ? 'Unsaved changes' : 'All changes saved';
    els.dirty.classList.toggle('is-dirty', d);
    document.body.classList.toggle('is-dirty', d);
    if (S.onDirty) try { S.onDirty(); } catch (e) {}
  }
  S.refreshDirty = refreshDirty;
  var dirtyLater = u.debounce(refreshDirty, 120);
  S.changed = function () { dirtyLater(); schedulePreview(); };
  S.setContent = function (c) {
    var lib = state.content && state.content.mediaLibrary;
    state.content = c;
    if (lib && !Array.isArray(c.mediaLibrary)) c.mediaLibrary = lib;
    refreshDirty(); S.rerender(); schedulePreview();
  };
  window.addEventListener('beforeunload', function (e) { if (S.isDirty()) { e.preventDefault(); e.returnValue = ''; } });
  function guardLeave() {
    if (!S.isDirty()) return Promise.resolve(true);
    return u.confirm({ title: 'Leave without saving?', body: 'You have unsaved changes. They will be lost.', ok: 'Leave anyway', danger: true });
  }

  /* ---------------- save / publish ---------------- */
  var busy = false;
  function saveDraft() {
    if (busy) return Promise.resolve();
    busy = true; els.save.disabled = true;
    var snapshot = JSON.stringify(state.content);
    return B.saveDraft(JSON.parse(snapshot)).then(function () {
      state.savedJSON = snapshot; refreshDirty(); u.toast('Draft saved', 'ok');
    }).catch(function (e) { u.toast('Could not save: ' + e.message, 'err'); }).then(function () { busy = false; els.save.disabled = false; });
  }
  function publish() {
    if (busy) return Promise.resolve();
    return u.confirm({
      title: B.mode === 'local' ? 'Publish locally?' : 'Publish to the live website?',
      body: B.mode === 'local' ? 'Updates the local preview page in this browser (index.html?preview=local).' : 'Everyone visiting the website will see these changes within a few seconds. A copy is kept in history.',
      input: { label: 'What changed? (optional note for history)', placeholder: 'e.g. New spring promo, updated FAQ', maxlength: 200 },
      ok: 'Publish'
    }).then(function (note) {
      if (note === false) return;
      busy = true; els.publish.disabled = true;
      var snapshot = JSON.stringify(state.content);
      return B.publish(JSON.parse(snapshot), typeof note === 'string' ? note.trim() : '').then(function () {
        state.savedJSON = snapshot; refreshDirty();
        u.toast(B.mode === 'local' ? 'Published locally — open index.html?preview=local to see it' : 'Published — the website is updated', 'ok', 5000);
        if (B.mode === 'local') reloadPreview();
      }).catch(function (e) { u.toast('Could not publish: ' + e.message, 'err'); }).then(function () { busy = false; els.publish.disabled = false; });
    });
  }
  S.saveDraft = saveDraft; S.publish = publish;

  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 's' || e.key === 'S')) {
      if (!state.content) return;
      e.preventDefault(); saveDraft();
    }
  });

  /* ---------------- live preview ---------------- */
  var DEVICES = { desktop: 1440, tablet: 820, mobile: 390 };
  function buildPreview() {
    var frame = h('iframe', { class: 'preview__frame', title: 'Live preview of the website', src: '../index.html?preview=local' });
    var stage = h('div', { class: 'preview__stage' }, [frame]);
    var seg = h('div', { class: 'seg seg--icons', role: 'radiogroup', 'aria-label': 'Preview width' });
    [['desktop', 'Desktop'], ['tablet', 'Tablet'], ['mobile', 'Phone']].forEach(function (d) {
      var b = h('button', { type: 'button', role: 'radio', class: 'seg__btn', 'aria-checked': String(state.device === d[0]), title: d[1], 'aria-label': d[1], onclick: function () {
        state.device = d[0]; u.$$('.seg__btn', seg).forEach(function (x) { x.setAttribute('aria-checked', 'false'); }); b.setAttribute('aria-checked', 'true'); fit();
      } }, [u.icon(d[0] === 'mobile' ? 'phone' : d[0])]);
      seg.appendChild(b);
    });
    els.frame = frame; els.stage = stage;
    els.pstatus = h('span', { class: 'preview__status muted', text: 'Loading preview…' });
    els.pbanner = h('div', { class: 'preview__banner', hidden: true });
    frame.addEventListener('load', function () { els.pstatus.textContent = 'Starting…'; waitReady(); });
    var pane = h('aside', { class: 'preview', 'aria-label': 'Preview' }, [
      h('div', { class: 'preview__bar' }, [seg, els.pstatus, h('span', { class: 'top__spacer' }),
        u.btn('', { small: true, kind: 'ghost', icon: 'reload', title: 'Reload preview', onclick: reloadPreview }),
        h('a', { class: 'btn btn--ghost btn--sm', href: '../index.html?preview=local', target: '_blank', rel: 'noopener', title: 'Open the preview in a new tab', 'aria-label': 'Open the preview in a new tab', onclick: function () { writeLocalPreview(); } }, [u.icon('external')]),
        h('button', { type: 'button', class: 'icon-btn preview__close', 'aria-label': 'Close preview', onclick: function () { document.body.classList.remove('preview-open'); } }, [u.icon('x')])
      ]),
      els.pbanner, stage
    ]);
    if (window.ResizeObserver) new ResizeObserver(fit).observe(stage); else window.addEventListener('resize', fit);
    return pane;
  }
  function fit() {
    if (!els.stage) return;
    var w = els.stage.clientWidth, hh = els.stage.clientHeight, target = DEVICES[state.device];
    if (!w || !hh) return;
    var scale = Math.min(1, (w - 16) / target);
    els.frame.style.width = target + 'px';
    els.frame.style.height = Math.round((hh - 8) / scale) + 'px';
    els.frame.style.transform = 'scale(' + scale + ')';
    els.frame.style.left = Math.max(0, Math.round((w - target * scale) / 2)) + 'px';
  }
  /* In live mode the working copy is mirrored to the preview key so a reload shows it straight away.
     In local mode that key IS the locally published page, so drafts are only posted. */
  function writeLocalPreview() { if (B.mode === 'supabase') u.ls.set(B.keys.published, state.previewOverride || state.content); }
  function frameDP() { try { return els.frame.contentWindow && els.frame.contentWindow.DP; } catch (e) { return null; } }
  var readyTimer;
  function waitReady() {
    clearInterval(readyTimer);
    var t0 = Date.now();
    readyTimer = setInterval(function () {
      var dp = frameDP();
      if (dp && dp.defaults && dp.content) { clearInterval(readyTimer); els.pstatus.textContent = 'Live'; pushPreview(); setTimeout(fit, 0); }
      else if (Date.now() - t0 > 15000) { clearInterval(readyTimer); els.pstatus.textContent = 'Preview did not load — try reload'; }
    }, 150);
  }
  function pushPreview() {
    if (!els.frame || !state.content) return;
    writeLocalPreview();
    var dp = frameDP();
    if (!dp || !dp.defaults) return;
    try { els.frame.contentWindow.postMessage({ type: 'dp:preview', content: u.clone(state.previewOverride || state.content) }, location.origin); }
    catch (e) { els.pstatus.textContent = 'Preview error'; }
  }
  var schedulePreview = u.debounce(pushPreview, 300);
  S.schedulePreview = schedulePreview;
  function reloadPreview() { writeLocalPreview(); els.pstatus.textContent = 'Reloading…'; try { els.frame.contentWindow.location.reload(); } catch (e) { els.frame.src = els.frame.src; } }
  function scrollPreviewTo(id) {
    try {
      var w = els.frame.contentWindow, el = w.document.getElementById(id);
      if (el) { if (w.DP && w.DP.lenis && w.DP.lenis.scrollTo) w.DP.lenis.scrollTo(el, { immediate: true }); else w.scrollTo(0, el.getBoundingClientRect().top + w.scrollY - 60); }
    } catch (e) {}
  }
  S.previewVersion = function (data, label, onRestore) {
    state.previewOverride = u.merge(u.clone(state.defaults), data);
    if (window.DP && DP.upgradeContent) DP.upgradeContent(state.previewOverride, data, state.defaults);
    u.clear(els.pbanner);
    u.append(els.pbanner, [h('span', { text: 'Previewing the version from ' + label }),
      u.btn('Restore this', { small: true, kind: 'gold', onclick: function () { onRestore(); back(); } }),
      u.btn('Back to my draft', { small: true, kind: 'outline', onclick: back })]);
    els.pbanner.hidden = false;
    document.body.classList.add('preview-open');
    pushPreview();
    function back() { state.previewOverride = null; els.pbanner.hidden = true; pushPreview(); }
  };

  S.screens = { auth: showAuth, denied: showDenied, newPassword: showNewPassword };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
