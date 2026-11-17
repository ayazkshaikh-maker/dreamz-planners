/* Dreamz Studio — form fields bound to paths in Studio.state.content.
   Every field writes straight into the working content object and calls Studio.changed(). */
(function () {
  'use strict';
  var S = (window.Studio = window.Studio || {});
  var u = S.u, h = u.h;
  var F = (S.F = {});

  function C() { return S.state.content; }
  function val(path) { return u.get(C(), path); }
  function put(path, v) { u.set(C(), path, v); S.changed(path); }

  function wrap(label, control, opts) {
    opts = opts || {};
    var lab = h('div', { class: 'field__top' }, [h('span', { class: 'field__label', text: label })]);
    if (opts.rich) lab.appendChild(h('span', { class: 'chip-hint', title: 'Wrap a word in *stars* to make it gold italic', text: '*accent*' }));
    if (opts.counter) lab.appendChild(opts.counter);
    var kids = [lab, control];
    if (opts.hint) kids.push(h('p', { class: 'field__hint', text: opts.hint }));
    if (opts.extra) kids.push(opts.extra);
    return h('div', { class: 'field' + (opts.cls ? ' ' + opts.cls : '') }, kids);
  }
  F.wrap = wrap;

  var fieldSeq = 0;
  function fid() { return 'f' + (++fieldSeq); }

  /* text / rich text (single line) */
  F.text = function (path, label, o) {
    o = o || {};
    var id = fid();
    var inp = h('input', { id: id, class: 'input', type: o.type || 'text', value: val(path) == null ? '' : val(path), placeholder: o.placeholder || '', maxlength: o.max || null, spellcheck: o.type ? 'false' : 'true' });
    var counter = o.count ? h('span', { class: 'counter' }) : null;
    function upd() { if (counter) { var n = inp.value.length; counter.textContent = n + (o.count ? ' / ' + o.count : ''); counter.classList.toggle('is-over', n > o.count); } }
    inp.addEventListener('input', function () { put(path, o.number ? (inp.value === '' ? '' : +inp.value) : inp.value); upd(); });
    upd();
    var w = wrap(label, inp, { rich: o.rich, hint: o.hint, counter: counter, cls: o.cls });
    w.querySelector('.field__label').setAttribute('id', id + 'l'); inp.setAttribute('aria-labelledby', id + 'l');
    return w;
  };
  F.area = function (path, label, o) {
    o = o || {};
    var ta = h('textarea', { class: 'input', rows: o.rows || 3, placeholder: o.placeholder || '', maxlength: o.max || null, 'aria-label': label });
    ta.value = val(path) == null ? '' : val(path);
    var counter = o.count ? h('span', { class: 'counter' }) : null;
    function upd() { if (counter) { var n = ta.value.length; counter.textContent = n + ' / ' + o.count; counter.classList.toggle('is-over', n > o.count); } }
    ta.addEventListener('input', function () { put(path, ta.value); upd(); });
    upd();
    return wrap(label, ta, { rich: o.rich, hint: o.hint, counter: counter });
  };
  F.number = function (path, label, o) {
    o = o || {};
    var inp = h('input', { class: 'input input--num', type: 'number', min: o.min, max: o.max, step: o.step || 1, value: val(path) == null ? '' : val(path), 'aria-label': label });
    inp.addEventListener('input', function () { var n = parseFloat(inp.value); if (isFinite(n)) put(path, n); });
    return wrap(label, inp, { hint: o.hint, cls: 'field--num' });
  };
  F.range = function (path, label, o) {
    var out = h('output', { class: 'range-out', text: String(val(path)) });
    var inp = h('input', { type: 'range', class: 'range', min: o.min, max: o.max, step: o.step || 1, value: val(path), 'aria-label': label });
    inp.addEventListener('input', function () { out.textContent = inp.value; put(path, +inp.value); });
    return wrap(label, h('div', { class: 'range-row' }, [inp, out]), { hint: o.hint });
  };
  F.toggle = function (path, label, o) {
    o = o || {};
    var inp = h('input', { type: 'checkbox', role: 'switch', checked: o.invert ? val(path) === false : val(path) !== false && !!val(path) });
    inp.addEventListener('change', function () { put(path, o.invert ? !inp.checked : inp.checked); if (o.onchange) o.onchange(inp.checked); });
    return h('label', { class: 'switch' + (o.big ? ' switch--big' : '') }, [inp, h('span', { class: 'switch__track', 'aria-hidden': 'true' }), h('span', { class: 'switch__text' }, [h('strong', { text: label }), o.hint ? h('small', { text: o.hint }) : null])]);
  };
  F.select = function (path, label, options, o) {
    o = o || {};
    var sel = h('select', { class: 'input', 'aria-label': label });
    var cur = val(path);
    var opts = options.map(function (op) { return typeof op === 'string' ? { value: op, label: op } : op; });
    if (cur != null && cur !== '' && !opts.some(function (op) { return op.value === cur; })) opts.unshift({ value: cur, label: cur + ' (current)' });
    opts.forEach(function (op) { sel.appendChild(h('option', { value: op.value, text: op.label, style: op.font ? { fontFamily: "'" + op.font + "'" } : null })); });
    sel.value = cur == null ? '' : cur;
    sel.addEventListener('change', function () { put(path, sel.value); if (o.onchange) o.onchange(sel.value); });
    return wrap(label, sel, { hint: o.hint, extra: o.extra });
  };
  F.color = function (path, label, o) {
    o = o || {};
    var cur = val(path) || '#000000';
    var pick = h('input', { type: 'color', class: 'swatch', value: /^#[0-9a-f]{6}$/i.test(cur) ? cur : '#000000', 'aria-label': label + ' colour picker' });
    var txt = h('input', { class: 'input input--hex', value: cur, maxlength: 7, spellcheck: 'false', 'aria-label': label + ' hex value' });
    pick.addEventListener('input', function () { txt.value = pick.value.toUpperCase(); put(path, txt.value); if (o.onchange) o.onchange(); });
    txt.addEventListener('input', function () { if (/^#[0-9a-f]{6}$/i.test(txt.value)) { pick.value = txt.value; put(path, txt.value.toUpperCase()); if (o.onchange) o.onchange(); } });
    return wrap(label, h('div', { class: 'color-row' }, [pick, txt]), { hint: o.hint, cls: 'field--color' });
  };
  F.datetime = function (path, label, o) {
    var inp = h('input', { class: 'input', type: 'datetime-local', value: (val(path) || '').slice(0, 16), 'aria-label': label });
    inp.addEventListener('input', function () { put(path, inp.value); });
    var clear = u.btn('Clear', { small: true, kind: 'ghost', onclick: function () { inp.value = ''; put(path, ''); } });
    return wrap(label, h('div', { class: 'row' }, [inp, clear]), { hint: (o && o.hint) });
  };

  /* ---------- media ---------- */
  F.thumb = function (ref, cls) {
    var m = S.media.resolve(ref);
    var box = h('div', { class: 'thumb ' + (cls || '') });
    if (!m) { box.appendChild(u.icon('image', 22)); box.classList.add('is-empty'); return box; }
    if (m.thumb) {
      var img = h('img', { src: m.thumb, alt: '', loading: 'lazy' });
      img.addEventListener('error', function () {
        if (m.type === 'video' && m.src && !box.querySelector('video')) { img.remove(); box.appendChild(h('video', { src: m.src, muted: true, preload: 'metadata', playsinline: true })); }
        else { img.remove(); box.appendChild(u.icon('image', 22)); }
      });
      box.appendChild(img);
    } else if (m.type === 'video') box.appendChild(h('video', { src: m.src, muted: true, preload: 'metadata', playsinline: true }));
    if (m.type === 'video') box.appendChild(h('span', { class: 'thumb__badge', text: 'video' }));
    return box;
  };
  /* Focal point: click the thumbnail to mark what must stay in view when the picture is cropped.
     Saved per media in content.mediaFocus[ref] (applies everywhere that media appears). */
  F.focus = function (thumb, ref, row) {
    var map = C().mediaFocus = (C().mediaFocus && typeof C().mediaFocus === 'object' && !Array.isArray(C().mediaFocus)) ? C().mediaFocus : {};
    var man = (S.media.manifest && S.media.manifest[ref]) || {};
    function curPos() { return map[ref] || man.focus || '50% 50%'; }
    var dot = h('span', { class: 'focus-dot', 'aria-hidden': 'true' });
    var out = h('span', { class: 'focus-out muted' });
    var reset = u.btn('Centre', { small: true, kind: 'ghost', title: 'Reset the focal point', onclick: function () { delete map[ref]; S.changed('mediaFocus'); paint(); } });
    function paint() {
      var p = curPos().split(/\s+/);
      dot.style.left = p[0]; dot.style.top = p[1] || '50%';
      out.textContent = 'Focal point ' + curPos() + (map[ref] ? '' : man.focus ? ' (library default)' : '');
      reset.hidden = !map[ref];
    }
    thumb.classList.add('thumb--focus');
    // show the whole picture (the thumbnail takes the media's own shape) so a click maps to the real image
    if (man.w && man.h) thumb.style.aspectRatio = man.w + ' / ' + man.h;
    u.$$('img', thumb).forEach(function (im) { im.addEventListener('load', function () { if (im.naturalWidth && !(man.w && man.h)) thumb.style.aspectRatio = im.naturalWidth + ' / ' + im.naturalHeight; }); });
    thumb.title = 'Click where the faces / subject are — that part stays in view when the picture is cropped';
    thumb.setAttribute('role', 'button'); thumb.setAttribute('tabindex', '0');
    thumb.setAttribute('aria-label', 'Set focal point (arrow keys move it)');
    thumb.appendChild(dot);
    function set(x, y) { map[ref] = Math.round(Math.max(0, Math.min(100, x))) + '% ' + Math.round(Math.max(0, Math.min(100, y))) + '%'; S.changed('mediaFocus'); paint(); }
    thumb.addEventListener('click', function (e) { var r = thumb.getBoundingClientRect(); set((e.clientX - r.left) / r.width * 100, (e.clientY - r.top) / r.height * 100); });
    thumb.addEventListener('keydown', function (e) {
      var k = { ArrowLeft: [-5, 0], ArrowRight: [5, 0], ArrowUp: [0, -5], ArrowDown: [0, 5] }[e.key]; if (!k) return;
      e.preventDefault(); var p = curPos().split(/\s+/).map(parseFloat); set(p[0] + k[0], (isFinite(p[1]) ? p[1] : 50) + k[1]);
    });
    row.appendChild(h('div', { class: 'focus-bar' }, [out, reset]));
    paint();
  };
  F.media = function (path, label, o) {
    o = o || {};
    var row = h('div', { class: 'media-field' });
    function draw() {
      u.clear(row);
      var cur = val(path);
      var inp = h('input', { class: 'input', value: cur || '', placeholder: 'Media id or URL', spellcheck: 'false', 'aria-label': label + ' (media id or URL)' });
      inp.addEventListener('change', function () { put(path, inp.value.trim()); draw(); });
      var th = F.thumb(cur);
      row.appendChild(th);
      if (cur && !/^(brand|seo)\./.test(path) && o.focus !== false) F.focus(th, cur, row);
      row.appendChild(h('div', { class: 'media-field__side' }, [inp, h('div', { class: 'row' }, [
        u.btn('Choose…', { small: true, kind: 'outline', icon: 'image', onclick: function () { S.media.pick({ kind: o.kind }).then(function (ref) { if (ref) { put(path, ref); draw(); } }); } }),
        cur ? u.btn('Clear', { small: true, kind: 'ghost', onclick: function () { put(path, ''); draw(); } }) : null
      ])]));
    }
    draw();
    return wrap(label, row, { hint: o.hint });
  };
  F.mediaList = function (path, label, o) {
    o = o || {};
    var box = h('div', { class: 'media-list' });
    function arr() { var a = val(path); return Array.isArray(a) ? a : []; }
    function draw() {
      u.clear(box);
      arr().forEach(function (ref, i) {
        var tile = h('div', { class: 'media-list__item', title: ref }, [F.thumb(ref), h('span', { class: 'media-list__id', text: ref.split('/').pop() })]);
        var tools = h('div', { class: 'media-list__tools' }, [
          i > 0 ? h('button', { type: 'button', class: 'icon-btn icon-btn--sm', 'aria-label': 'Move earlier', onclick: function () { move(i, i - 1); } }, [u.icon('back', 14)]) : null,
          h('button', { type: 'button', class: 'icon-btn icon-btn--sm', 'aria-label': 'Remove', onclick: function () { var a = arr().slice(); a.splice(i, 1); put(path, a); draw(); } }, [u.icon('x', 14)])
        ]);
        tile.appendChild(tools);
        dragify(tile, i, move);
        box.appendChild(tile);
      });
      box.appendChild(h('button', { type: 'button', class: 'media-list__add', onclick: function () {
        S.media.pick({ kind: o.kind, multi: true }).then(function (refs) { if (refs && refs.length) { put(path, arr().concat(refs)); draw(); } });
      } }, [u.icon('plus', 20), h('span', { text: 'Add' })]));
    }
    function move(from, to) { var a = arr().slice(); var it = a.splice(from, 1)[0]; a.splice(to, 0, it); put(path, a); draw(); }
    draw();
    return wrap(label, box, { hint: o.hint || 'Drag to reorder. The first one is shown first.' });
  };

  /* ---------- HTML5 drag reorder (desktop) — buttons cover keyboard + touch ---------- */
  function dragify(el, index, move, handle) {
    el.dataset.index = index;
    if (handle) {
      handle.addEventListener('mousedown', function () { el.draggable = true; });
      handle.addEventListener('mouseup', function () { el.draggable = false; });
    } else el.draggable = true;
    el.addEventListener('dragstart', function (e) { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(index)); el.classList.add('is-dragging'); });
    el.addEventListener('dragend', function () { el.classList.remove('is-dragging'); if (handle) el.draggable = false; });
    el.addEventListener('dragover', function (e) { e.preventDefault(); el.classList.add('is-over'); });
    el.addEventListener('dragleave', function () { el.classList.remove('is-over'); });
    el.addEventListener('drop', function (e) {
      e.preventDefault(); el.classList.remove('is-over');
      var from = parseInt(e.dataTransfer.getData('text/plain'), 10);
      if (isFinite(from) && from !== index) move(from, index);
    });
  }
  F.dragify = dragify;

  /* ---------- list of strings ---------- */
  F.strings = function (path, label, o) {
    o = o || {};
    var box = h('div', { class: 'str-list' });
    function arr() { var a = val(path); return Array.isArray(a) ? a : []; }
    function draw() {
      u.clear(box);
      arr().forEach(function (s, i) {
        var handle = h('span', { class: 'grip', title: 'Drag to reorder', 'aria-hidden': 'true' }, [u.icon('grip')]);
        var inp = h('input', { class: 'input', value: s, placeholder: o.placeholder || '', 'aria-label': (o.itemLabel || 'Item') + ' ' + (i + 1) });
        inp.addEventListener('input', function () { var a = arr().slice(); a[i] = inp.value; put(path, a); });
        var row = h('div', { class: 'str-row' }, [handle, inp,
          h('button', { type: 'button', class: 'icon-btn icon-btn--sm', 'aria-label': 'Move up', disabled: i === 0, onclick: function () { move(i, i - 1); } }, [u.icon('up', 14)]),
          h('button', { type: 'button', class: 'icon-btn icon-btn--sm', 'aria-label': 'Move down', disabled: i === arr().length - 1, onclick: function () { move(i, i + 1); } }, [u.icon('down', 14)]),
          h('button', { type: 'button', class: 'icon-btn icon-btn--sm', 'aria-label': 'Remove', onclick: function () { var a = arr().slice(); a.splice(i, 1); put(path, a); draw(); } }, [u.icon('trash', 14)])
        ]);
        dragify(row, i, move, handle);
        box.appendChild(row);
      });
      box.appendChild(u.btn(o.addLabel || 'Add line', { small: true, kind: 'outline', icon: 'plus', onclick: function () {
        put(path, arr().concat([''])); draw(); var last = box.querySelectorAll('input'); if (last.length) last[last.length - 1].focus();
      } }));
    }
    function move(from, to) { var a = arr().slice(); var it = a.splice(from, 1)[0]; a.splice(to, 0, it); put(path, a); draw(); }
    draw();
    return wrap(label, box, { hint: o.hint });
  };

  /* ---------- repeating list of objects ----------
     F.list(path, label, { title(item,i), fields(basePath,item,i) -> nodes, blank() -> obj, hint, dupe(item) }) */
  var openState = new WeakMap();
  F.list = function (path, label, o) {
    var box = h('div', { class: 'obj-list' });
    function arr() { var a = val(path); return Array.isArray(a) ? a : []; }
    function draw() {
      u.clear(box);
      var a = arr();
      if (!a.length) box.appendChild(h('p', { class: 'empty', text: o.empty || 'Nothing here yet.' }));
      a.forEach(function (item, i) {
        var isOpen = u.isObj(item) && openState.get(item);
        var title = h('span', { class: 'card__title' });
        var sub = h('span', { class: 'card__sub' });
        function refreshTitle() {
          var t = o.title ? o.title(arr()[i], i) : 'Item ' + (i + 1);
          title.textContent = String(t || 'Untitled').replace(/\*/g, '');
          sub.textContent = o.sub ? String(o.sub(arr()[i], i) || '').replace(/\*/g, '') : '';
        }
        refreshTitle();
        var handle = h('span', { class: 'grip', title: 'Drag to reorder', 'aria-hidden': 'true' }, [u.icon('grip')]);
        var toggle = h('button', { type: 'button', class: 'card__toggle', 'aria-expanded': isOpen ? 'true' : 'false' }, [u.icon('chev', 14), h('span', { class: 'card__titles' }, [title, sub])]);
        var head = h('div', { class: 'card__head' }, [handle, toggle,
          h('button', { type: 'button', class: 'icon-btn icon-btn--sm', 'aria-label': 'Move up', disabled: i === 0, onclick: function () { move(i, i - 1); } }, [u.icon('up', 14)]),
          h('button', { type: 'button', class: 'icon-btn icon-btn--sm', 'aria-label': 'Move down', disabled: i === a.length - 1, onclick: function () { move(i, i + 1); } }, [u.icon('down', 14)]),
          h('button', { type: 'button', class: 'icon-btn icon-btn--sm', 'aria-label': 'Duplicate', title: 'Duplicate', onclick: function () {
            var list = arr().slice(); var copy = u.clone(list[i]); if (o.dupe) copy = o.dupe(copy) || copy; list.splice(i + 1, 0, copy); if (u.isObj(copy)) openState.set(copy, true); put(path, list); draw();
          } }, [u.icon('copy', 14)]),
          h('button', { type: 'button', class: 'icon-btn icon-btn--sm icon-btn--danger', 'aria-label': 'Delete', title: 'Delete', onclick: function () {
            u.confirm({ title: 'Remove this item?', body: '"' + title.textContent + '" will be removed from the draft. You can undo by not saving, or restore from history.', ok: 'Remove', danger: true }).then(function (yes) {
              if (!yes) return; var list = arr().slice(); list.splice(i, 1); put(path, list); draw();
            });
          } }, [u.icon('trash', 14)])
        ]);
        var body = h('div', { class: 'card__body' });
        var card = h('div', { class: 'card' + (isOpen ? ' is-open' : '') }, [head, body]);
        function fill() { if (!body.childNodes.length) u.append(body, o.fields(path + '.' + i, arr()[i], i)); }
        if (isOpen) fill();
        toggle.addEventListener('click', function () {
          var open = !card.classList.contains('is-open');
          card.classList.toggle('is-open', open); toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
          if (u.isObj(arr()[i])) openState.set(arr()[i], open);
          if (open) fill();
        });
        body.addEventListener('input', refreshTitle);
        body.addEventListener('change', refreshTitle);
        dragify(card, i, move, handle);
        box.appendChild(card);
      });
      box.appendChild(u.btn(o.addLabel || 'Add', { small: true, kind: 'outline', icon: 'plus', onclick: function () {
        var item = o.blank ? o.blank(arr()) : {}; if (u.isObj(item)) openState.set(item, true);
        put(path, arr().concat([item])); draw();
        var cards = box.querySelectorAll('.card'); if (cards.length) cards[cards.length - 1].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } }));
    }
    function move(from, to) { var a = arr().slice(); var it = a.splice(from, 1)[0]; a.splice(to, 0, it); put(path, a); draw(); }
    draw();
    var w = h('div', { class: 'field field--list' }, [h('div', { class: 'field__top' }, [h('span', { class: 'field__label', text: label }), h('span', { class: 'counter', text: arr().length + '' })]), o.hint ? h('p', { class: 'field__hint', text: o.hint }) : null, box]);
    var count = w.querySelector('.counter');
    box.addEventListener('click', function () { setTimeout(function () { count.textContent = arr().length; }, 0); });
    return w;
  };

  /* All string keys of an object as plain text fields (UI copy, labels). */
  F.auto = function (path, o) {
    o = o || {};
    var obj = val(path) || {};
    return Object.keys(obj).filter(function (k) { return typeof obj[k] === 'string' || typeof obj[k] === 'number'; }).map(function (k) {
      var long = String(obj[k]).length > 70;
      return long ? F.area(path + '.' + k, (o.labels && o.labels[k]) || u.human(k), { rows: 2, rich: o.rich && o.rich.indexOf(k) >= 0 }) : F.text(path + '.' + k, (o.labels && o.labels[k]) || u.human(k), { rich: o.rich && o.rich.indexOf(k) >= 0, number: typeof obj[k] === 'number' });
    });
  };

  F.group = function (title, kids, o) {
    o = o || {};
    return h('section', { class: 'group' + (o.cls ? ' ' + o.cls : '') }, [title ? h('h3', { class: 'group__title', text: title }) : null, o.intro ? h('p', { class: 'group__intro', text: o.intro }) : null, h('div', { class: 'group__body' + (o.cols ? ' cols-' + o.cols : '') }, kids)]);
  };
  F.note = function (text, kind) { return h('div', { class: 'note note--' + (kind || 'info') }, [h('p', { text: text })]); };
})();
