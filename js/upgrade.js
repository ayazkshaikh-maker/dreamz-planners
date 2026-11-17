/* Dreamz Planners — content upgrades (shared by the site and the Studio).
   Saved content (Supabase / local preview) replaces arrays as a whole, so a chapter added to the site later would
   never show up in content that was published before it existed. content.features lists the features the saved
   content already knows about; for every default feature missing there, a small migration adds the new chapter to
   sections[], its menu link and any new wizard option — once. After the owner saves, `features` is stored and the
   migration never runs again (so removing the link or chapter afterwards is respected).
   DP.upgradeContent(merged, saved, defaults) -> merged */
(function () {
  'use strict';
  var DP = (window.DP = window.DP || {});
  function find(list, fn) { for (var i = 0; i < (list || []).length; i++) if (fn(list[i])) return i; return -1; }
  function insertAfter(list, item, afterFn, beforeFn) {
    var i = find(list, afterFn);
    if (i >= 0) { list.splice(i + 1, 0, item); return; }
    var j = beforeFn ? find(list, beforeFn) : -1;
    if (j >= 0) list.splice(j, 0, item); else list.push(item);
  }
  var MIG = {
    printing: function (c, d) {
      if (Array.isArray(c.sections) && find(c.sections, function (s) { return s && s.id === 'printing'; }) < 0) {
        var ds = (d.sections || []).filter(function (s) { return s.id === 'printing'; })[0] || { id: 'printing', label: '6c · Printing & stationery', visible: true };
        insertAfter(c.sections, JSON.parse(JSON.stringify(ds)), function (s) { return s && s.id === 'estimator'; }, function (s) { return s && s.id === 'process'; });
      }
      if (Array.isArray(c.nav) && find(c.nav, function (n) { return n && n.href === '#printing'; }) < 0) {
        var dn = (d.nav || []).filter(function (n) { return n.href === '#printing'; })[0] || { label: 'Printing', href: '#printing' };
        insertAfter(c.nav, JSON.parse(JSON.stringify(dn)), function (n) { return n && n.href === '#services'; }, function (n) { return n && n.href === '#process'; });
      }
      var svc = (d.printing && d.printing.copy && d.printing.copy.wizardService) || 'Printing & stationery';
      if (c.wizard && Array.isArray(c.wizard.services) && c.wizard.services.indexOf(svc) < 0) {
        var k = c.wizard.services.indexOf('Not sure yet');
        if (k >= 0) c.wizard.services.splice(k, 0, svc); else c.wizard.services.push(svc);
      }
    },
    /* intro film overlay + page background music (theme.intro, theme.music). Objects deep-merge from the
       defaults on their own; this only adds built-in track / cue options missing from a saved list. */
    'intro-music': function (c, d) {
      var dt = d.theme || {};
      c.theme = c.theme || {};
      ['intro', 'music'].forEach(function (k) { if (!c.theme[k] || typeof c.theme[k] !== 'object') c.theme[k] = JSON.parse(JSON.stringify(dt[k] || {})); });
      [[c.theme.music, (dt.music || {}).tracks, 'tracks'], [c.theme.intro, (dt.intro || {}).cues, 'cues']].forEach(function (x) {
        var obj = x[0], defs = x[1] || [], key = x[2];
        if (!Array.isArray(obj[key])) { obj[key] = JSON.parse(JSON.stringify(defs)); return; }
        defs.forEach(function (t) { if (find(obj[key], function (s) { return s && s.id === t.id; }) < 0) obj[key].push(JSON.parse(JSON.stringify(t))); });
      });
    }
  };
  DP.upgradeContent = function (merged, saved, defaults) {
    if (!merged || !saved || !defaults) return merged;
    var all = Array.isArray(defaults.features) ? defaults.features : [];
    var have = Array.isArray(saved.features) ? saved.features : [];
    all.forEach(function (f) { if (have.indexOf(f) < 0 && MIG[f]) { try { MIG[f](merged, defaults); } catch (e) { console.warn('[dp] upgrade', f, e); } } });
    merged.features = all.concat(have.filter(function (f) { return all.indexOf(f) < 0; }));
    return merged;
  };
})();
