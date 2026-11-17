/* Dreamz Planners — page background music (content.theme.music).
   Never starts without a gesture: it starts after the visitor tapped "enter" on the intro film, or from the
   floating toggle. The visitor's choice is remembered in localStorage['dp:music'] ('on' | 'off').
   Fades in / out, pauses while the tab is hidden, steps aside while a film plays (DP.music.hold / release).
   The loop files have their crossfade baked in, so <audio loop> is seamless (Opus .ogg where supported). */
(function () {
  'use strict';
  var DP = (window.DP = window.DP || {});
  var u = DP.u;
  var KEY = 'dp:music';
  var MU = (DP.music = {});
  var audio = null, ctx = null, gain = null, curSrc = '', level = 0, raf = 0;
  var want = false;      // the visitor wants music now
  var holds = {};        // reasons to stay quiet (film, intro, hidden tab)
  var armed = false;

  function cfg() { return (DP.content && DP.content.theme && DP.content.theme.music) || {}; }
  function pref() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function setPref(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  function abs(p) { try { return new URL(p, document.baseURI).href; } catch (e) { return p; } }
  function track() {
    var c = cfg(), list = Array.isArray(c.tracks) ? c.tracks : [];
    return list.filter(function (t) { return t && t.id === c.track; })[0] || list[0] || null;
  }
  function pickSrc(t) {
    if (!t) return '';
    var probe = document.createElement('audio');
    if (t.srcOgg && probe.canPlayType && probe.canPlayType('audio/ogg; codecs="opus"')) return t.srcOgg;
    return t.src || t.srcOgg || '';
  }
  function target() { var v = +cfg().volume; return isFinite(v) && v > 0 ? Math.min(1, v) : 0.25; }
  MU.available = function () { var c = cfg(); return !!(c.enabled && track() && pickSrc(track())); };
  MU.playing = function () { return !!(audio && !audio.paused && want); };

  function setLevel(v) {
    level = v;
    if (gain) gain.gain.value = v; else if (audio) audio.volume = Math.max(0, Math.min(1, v));
  }
  function fadeTo(to, ms, done) {
    cancelAnimationFrame(raf);
    var from = level, t0 = performance.now();
    (function step(now) {
      var k = Math.min(1, ((now || performance.now()) - t0) / Math.max(1, ms));
      setLevel(from + (to - from) * (k * k * (3 - 2 * k)));
      if (k < 1) raf = requestAnimationFrame(step); else if (done) done();
    })();
  }
  function ensure() {
    var src = pickSrc(track());
    if (!src) return null;
    var full = abs(src);
    if (audio && curSrc === full) return audio;
    if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); }
    audio = new Audio();
    audio.loop = true; audio.preload = 'auto';
    var same = new URL(full).origin === location.origin;
    if (!same) audio.crossOrigin = 'anonymous';
    audio.src = full; curSrc = full;
    // Web Audio gain for same-origin files (iOS ignores element.volume); element volume otherwise
    gain = null;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (AC && same) {
      try { ctx = ctx || new AC(); var node = ctx.createMediaElementSource(audio); gain = ctx.createGain(); node.connect(gain); gain.connect(ctx.destination); } catch (e) { gain = null; }
    }
    setLevel(0);
    return audio;
  }
  function quiet() { return Object.keys(holds).some(function (k) { return holds[k]; }); }
  function apply() {
    if (want && !quiet()) {
      var a = ensure(); if (!a) return;
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(function () {});
      var p = a.play();
      if (p && p.catch) p.catch(function () { want = false; sync(); });
      fadeTo(target(), 1800);
    } else if (audio && !audio.paused) {
      fadeTo(0, 700, function () { if (!want || quiet()) audio.pause(); });
    }
    sync();
  }
  function sync() {
    var b = u.$('#music-toggle'); if (!b) return;
    var on = want;
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.classList.toggle('is-on', on);
    var c = cfg(), tip = b.querySelector('.music-toggle__tip');
    var label = c.label || 'Background music';
    b.setAttribute('aria-label', label);
    if (tip) tip.textContent = label + (on ? ' · on' : ' · off');
  }

  /* Called from a user gesture (toggle click, the intro's "enter" tap). */
  MU.start = function (fromGesture) {
    if (!MU.available() || pref() === 'off' && !fromGesture) return;
    want = true; apply();
  };
  MU.stop = function () { want = false; apply(); };
  MU.toggle = function () {
    if (want) { setPref('off'); MU.stop(); } else { setPref('on'); want = true; apply(); }
  };
  /* After the intro film: only if the visitor tapped (gesture), autoplayAfterIntro is on and they never muted it. */
  MU.afterIntro = function (tapped) {
    var c = cfg();
    if (!tapped || !MU.available() || c.autoplayAfterIntro === false || pref() === 'off') return;
    want = true; apply();
  };
  /* Call inside a gesture that will start music later (the intro tap): unlocks the element for iOS / Safari. */
  MU.prime = function () {
    if (!MU.available() || pref() === 'off' || cfg().autoplayAfterIntro === false) return;
    var a = ensure(); if (!a) return;
    try {
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(function () {});
      setLevel(0);
      var p = a.play();
      if (p && p.then) p.then(function () { if (!want || quiet()) a.pause(); }, function () {}); else if (!want) a.pause();
    } catch (e) {}
  };
  MU.hold = function (why) { holds[why || 'x'] = true; apply(); };
  MU.release = function (why) { holds[why || 'x'] = false; apply(); };

  /* (Re)build the floating toggle for the current content. Called on every mount (Studio preview too). */
  MU.init = function () {
    var b = u.$('#music-toggle'); if (!b) return;
    var c = cfg();
    var show = MU.available() && c.showToggle !== false;
    b.hidden = !show;
    document.documentElement.classList.toggle('has-music', show);
    if (!b.dataset.bound) {
      b.dataset.bound = '1';
      b.addEventListener('click', function () { MU.toggle(); });
      document.addEventListener('visibilitychange', function () { holds.hidden = document.hidden; apply(); });
    }
    // track / volume changed (Studio): swap the file or re-level without restarting the visitor's choice
    if (audio && curSrc !== abs(pickSrc(track()) || '')) { var was = MU.playing(); audio.pause(); audio = null; curSrc = ''; if (was) apply(); }
    else if (MU.playing()) fadeTo(target(), 400);
    if (!MU.available()) { want = false; apply(); }
    // a returning visitor who left music on: it resumes on their first tap / key on the page (a gesture)
    if (!armed && pref() === 'on' && MU.available()) {
      armed = true;
      var go = function (e) {
        document.removeEventListener('pointerdown', go, true); document.removeEventListener('keydown', go, true);
        if (e && e.target && e.target.closest && e.target.closest('#music-toggle, .intro')) return; // handled there
        if (!want && pref() === 'on') { want = true; apply(); }
      };
      document.addEventListener('pointerdown', go, true); document.addEventListener('keydown', go, true);
    }
    sync();
  };
})();
