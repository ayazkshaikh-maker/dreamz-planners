/* Dreamz Planners — intro film overlay (content.theme.intro).
   After the preloader: a full-screen poster with "Tap to enter ✦". The tap (a user gesture, so sound is
   allowed) plays the film with audio — 9:16 on portrait phones, 16:9 otherwise; if sound is refused it plays
   the silent cut muted. No tap for ~6 s → the silent cut plays muted on its own (nothing blocks the visitor).
   Skip is always visible, Esc skips, the end crossfades into the hero. Reduced motion: poster + a play button,
   no auto-play. Nothing of the film downloads before the overlay shows. mode "first-visit" = once per
   browser session (sessionStorage['dp:intro-seen']). ?intro=play forces it (testing / Studio preview). */
(function () {
  'use strict';
  var DP = (window.DP = window.DP || {});
  var u = DP.u;
  var SEEN = 'dp:intro-seen';
  var IDLE_MS = 6000;
  var I = (DP.intro = {});

  function cfg() { return (DP.content && DP.content.theme && DP.content.theme.intro) || {}; }
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } }
  function forced() { return /[?&]intro=play\b/.test(location.search); }
  function portrait() { return window.matchMedia('(max-width: 767px) and (orientation: portrait)').matches; }

  I.shouldShow = function () {
    var c = cfg();
    if (forced()) return true;
    var mode = c.mode || 'first-visit';
    if (mode === 'off' || !(c.src16x9 || c.src9x16)) return false;
    if (/[?&](preview)=/.test(location.search) || window.top !== window) return false; // Studio preview frame
    if (location.hash && location.hash.length > 1) return false; // deep link to a chapter: go straight there
    if (mode === 'first-visit' && ss(SEEN)) return false;
    return true;
  };

  /* Returns a promise that resolves when the overlay starts handing over to the hero. */
  I.run = function (opts) {
    opts = opts || {};
    if (!opts.force && !I.shouldShow()) return Promise.resolve();
    if (u.$('.intro')) return Promise.resolve();
    var c = cfg();
    ss(SEEN, '1');
    var reduced = u.reduced();
    var vert = portrait() && !!c.src9x16;
    var posters = c.posters || {};
    var src = vert ? c.src9x16 : (c.src16x9 || c.src9x16);
    var silent = vert ? (c.silent9x16 || c.src9x16) : (c.silent16x9 || c.src16x9 || c.silent9x16);
    var poster = vert ? (posters['9x16'] || posters['16x9']) : (posters['16x9'] || posters['9x16']);
    var cues = Array.isArray(c.cues) ? c.cues : [];
    var cue = c.cue && c.cue !== 'film' ? cues.filter(function (q) { return q && q.id === c.cue; })[0] : null;
    var saveData = !!(navigator.connection && navigator.connection.saveData);

    var lastFocus = document.activeElement;
    var root = u.h('div', { class: 'intro on-media', role: 'dialog', 'aria-modal': 'true', 'aria-label': (DP.content.brand && DP.content.brand.name || '') + ' — intro film' });
    root.innerHTML =
      (poster ? '<img class="intro__poster" alt="" decoding="async" src="' + u.esc(poster) + '">' : '') +
      '<video class="intro__video" playsinline preload="none" aria-hidden="true"></video>' +
      '<div class="intro__shade" aria-hidden="true"></div>' +
      '<button type="button" class="intro__enter"><span class="intro__enter-t">' + u.esc(reduced ? (c.playLabel || 'Play the film') : (c.enterLabel || 'Tap to enter')) + '</span> <span class="intro__star" aria-hidden="true">✦</span></button>' +
      '<button type="button" class="intro__sound" hidden>' + u.esc(c.soundLabel || 'Sound on') + '</button>' +
      '<button type="button" class="intro__skip">' + u.esc(c.skipLabel || 'Skip intro') + ' <span aria-hidden="true">→</span></button>' +
      '<div class="intro__bar" aria-hidden="true"><i></i></div>';
    document.body.appendChild(root);
    var video = root.querySelector('video'), enter = root.querySelector('.intro__enter'), skip = root.querySelector('.intro__skip'),
      sound = root.querySelector('.intro__sound'), barI = root.querySelector('.intro__bar i');
    var cueAudio = null, tapped = false, state = 'wait', idleT = 0, stallT = 0, rafId = 0, done = false, resolveFn;
    var promise = new Promise(function (r) { resolveFn = r; });

    if (DP.lenis) DP.lenis.stop();
    document.documentElement.classList.add('intro-open');
    if (DP.music) DP.music.hold('intro');
    requestAnimationFrame(function () { root.classList.add('is-in'); try { enter.focus({ preventScroll: true }); } catch (e) {} });

    function tick() {
      if (video.duration) barI.style.transform = 'scaleX(' + (video.currentTime / video.duration).toFixed(4) + ')';
      rafId = requestAnimationFrame(tick);
    }
    function watchStall() {
      clearTimeout(stallT);
      var last = -1;
      stallT = setInterval(function () {
        if (video.paused && state !== 'wait') return;
        if (video.currentTime === last) finish(); // no progress for 8 s: give up, show the site
        last = video.currentTime;
      }, 8000);
    }
    function load(url, muted) {
      video.muted = !!muted; video.defaultMuted = !!muted;
      if (muted) video.setAttribute('muted', ''); else video.removeAttribute('muted');
      video.src = url; video.preload = 'auto';
    }
    function startCue() {
      if (!cue || cueAudio) return null;
      var probe = document.createElement('audio');
      var s = cue.srcOgg && probe.canPlayType('audio/ogg; codecs="opus"') ? cue.srcOgg : (cue.src || cue.srcOgg);
      if (!s) return null;
      cueAudio = new Audio(s); cueAudio.preload = 'auto';
      return cueAudio;
    }
    function show() {
      root.classList.add('is-playing');
      enter.hidden = true;
      tick(); watchStall();
    }
    // with sound (after a tap)
    function playWithSound() {
      clearTimeout(idleT);
      tapped = true;
      if (DP.music) DP.music.prime();
      var useCue = !!startCue();
      if (useCue) {
        load(silent, true);
        var a = cueAudio.play(), v = video.play();
        state = 'sound';
        Promise.resolve(v).then(show, function () { finish(); });
        if (a && a.catch) a.catch(function () { cueAudio = null; });
        return;
      }
      load(src, false);
      state = 'sound';
      var p = video.play();
      if (p && p.then) p.then(show, function () { // sound refused: silent cut, muted
        playSilent(true);
      }); else show();
    }
    // muted (idle timeout, or sound refused)
    function playSilent(keepTap) {
      clearTimeout(idleT);
      if (!keepTap) sound.hidden = false; // offer sound on the way
      load(silent, true);
      state = 'silent';
      var p = video.play();
      if (p && p.then) p.then(show, function () { finish(); }); else show();
    }
    // tap during the muted play: switch to the sound version at the same moment
    function soundOn() {
      sound.hidden = true;
      tapped = true;
      if (DP.music) DP.music.prime();
      var t = video.currentTime || 0;
      if (startCue()) {
        cueAudio.currentTime = t; var a = cueAudio.play(); if (a && a.catch) a.catch(function () {});
        return;
      }
      if (silent === src) { video.muted = false; return; }
      var resume = function () { video.removeEventListener('loadedmetadata', resume); try { video.currentTime = t; } catch (e) {} var p = video.play(); if (p && p.catch) p.catch(function () { video.muted = true; video.play().catch(function () {}); }); };
      load(src, false);
      video.addEventListener('loadedmetadata', resume);
    }
    function finish() {
      if (done) return; done = true;
      clearTimeout(idleT); clearInterval(stallT); cancelAnimationFrame(rafId);
      document.removeEventListener('keydown', onKey, true);
      root.classList.add('is-out');
      try { video.pause(); } catch (e) {}
      if (cueAudio) { var ca = cueAudio, k = 0; var f = setInterval(function () { k++; ca.volume = Math.max(0, 1 - k / 10); if (k >= 10) { clearInterval(f); ca.pause(); } }, 60); }
      document.documentElement.classList.remove('intro-open');
      if (DP.lenis) DP.lenis.start();
      if (DP.music) { DP.music.release('intro'); DP.music.afterIntro(tapped); }
      resolveFn();
      setTimeout(function () {
        try { video.removeAttribute('src'); video.load(); } catch (e) {}
        root.remove();
        if (lastFocus && lastFocus.focus && document.body.contains(lastFocus) && lastFocus !== document.body) { try { lastFocus.focus({ preventScroll: true }); } catch (e) {} }
        else { var m = u.$('#main'); if (m) try { m.focus({ preventScroll: true }); } catch (e) {} }
      }, 1000);
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); finish(); }
      else if (e.key === 'Tab') { // keep focus inside the overlay
        var f = [enter, sound, skip].filter(function (b) { return !b.hidden; });
        var i = f.indexOf(document.activeElement);
        e.preventDefault();
        (f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length] || skip).focus();
      }
    }
    document.addEventListener('keydown', onKey, true);
    video.addEventListener('ended', finish);
    video.addEventListener('error', function () { if (state !== 'wait') finish(); });
    enter.addEventListener('click', function (e) { e.stopPropagation(); if (state === 'wait') playWithSound(); });
    sound.addEventListener('click', function (e) { e.stopPropagation(); soundOn(); });
    skip.addEventListener('click', function (e) { e.stopPropagation(); tapped = true; if (DP.music) DP.music.prime(); finish(); });
    // a tap anywhere on the poster counts as "enter"
    root.addEventListener('click', function (e) {
      if (e.target.closest('button')) return;
      if (state === 'wait') playWithSound(); else if (state === 'silent' && !sound.hidden) soundOn();
    });
    if (!reduced) idleT = setTimeout(function () { if (state === 'wait') { if (saveData) finish(); else playSilent(); } }, IDLE_MS);
    // hard cap: never keep the visitor longer than the film + a margin once it plays
    video.addEventListener('loadedmetadata', function () {
      var cap = ((video.duration || 15) + 6) * 1000;
      setTimeout(function () { if (!done && state !== 'wait') finish(); }, cap);
    }, { once: true });
    return promise;
  };

  // Studio: "Preview the intro" posts this to the preview iframe
  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin || !e.data || e.data.type !== 'dp:intro-preview') return;
    I.run({ force: true });
  });
})();
