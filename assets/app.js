/* Музыкальное воспитание — эффекты поверх готового HTML.
   Переключатель: <html data-effects="full|lite|off"> или window.MUSIC_CONFIG = { effects: 'off' } до подключения скрипта.
   full — всё; lite — без декоративного движения (ноты, бегущая строка, вращение); off — только функциональный JS (лайтбокс, ритм, форма). */
(function () {
  'use strict';
  var root = document.documentElement;
  var cfg = window.MUSIC_CONFIG || {};
  var mode = cfg.effects || root.getAttribute('data-effects') || 'full';
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (mode !== 'off' && !reduced) root.classList.add('fx');
  if (mode === 'lite') root.classList.add('fx-lite');

  /* ---------- Звук (только по действию пользователя) ---------- */
  var ctx = null, master = null;
  function audio() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.32;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, dur, when) {
    var a = audio(); if (!a) return;
    var t = (when || a.currentTime) + 0.01;
    dur = dur || 0.9;
    [[1, 'triangle', 0.55], [2, 'sine', 0.18], [3, 'sine', 0.06]].forEach(function (p) {
      var o = a.createOscillator(), g = a.createGain();
      o.type = p[1]; o.frequency.value = freq * p[0];
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(p[2], t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
    });
  }
  function click(accent) {
    var a = audio(); if (!a) return;
    var t = a.currentTime + 0.005;
    var o = a.createOscillator(), g = a.createGain();
    o.type = 'square'; o.frequency.setValueAtTime(accent ? 1250 : 900, t);
    o.frequency.exponentialRampToValueAtTime(accent ? 600 : 420, t + 0.06);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(accent ? 0.35 : 0.22, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.12);
  }

  var soundOn = false;
  try { soundOn = localStorage.getItem('music-sound') === '1'; } catch (e) {}
  var toggle = document.querySelector('.sound-toggle');
  if (toggle) {
    toggle.hidden = false;
    var setLabel = function () {
      toggle.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
      toggle.querySelector('.lbl').textContent = soundOn ? 'Звук вкл.' : 'Звук';
    };
    setLabel();
    toggle.addEventListener('click', function () {
      soundOn = !soundOn; setLabel();
      try { localStorage.setItem('music-sound', soundOn ? '1' : '0'); } catch (e) {}
      if (soundOn) tone(523.25, 0.6);
    });
  }

  /* ---------- Играющий нотный стан ---------- */
  function burst(btn) {
    if (!root.classList.contains('fx') || root.classList.contains('fx-lite')) return;
    var host = btn.parentNode, glyphs = ['♪', '♫', '♩', '♬'];
    var s = document.createElement('span');
    s.className = 'note-burst'; s.setAttribute('aria-hidden', 'true');
    s.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
    s.style.left = btn.style.getPropertyValue('--x');
    s.style.top = (btn.offsetTop - btn.offsetHeight * 0.9) + 'px';
    s.style.setProperty('--c', getComputedStyle(btn).color);
    s.style.setProperty('--dx', (Math.random() * 60 - 30) + 'px');
    s.style.setProperty('--rot', (Math.random() * 40 - 20) + 'deg');
    host.appendChild(s);
    setTimeout(function () { s.remove(); }, 1200);
  }
  function hit(btn, dur) {
    tone(parseFloat(btn.getAttribute('data-freq')), dur);
    btn.classList.remove('ping'); void btn.offsetWidth; btn.classList.add('ping');
    burst(btn);
  }
  var noteBtns = Array.prototype.slice.call(document.querySelectorAll('.note-btn'));
  noteBtns.forEach(function (b) { b.addEventListener('click', function () { hit(b); }); });
  var scaleBtn = document.querySelector('[data-play-scale]');
  if (scaleBtn && noteBtns.length) {
    var playing = false;
    scaleBtn.addEventListener('click', function () {
      if (playing) return; playing = true;
      var seq = noteBtns.concat(noteBtns.slice(0, -1).reverse());
      seq.forEach(function (b, i) { setTimeout(function () { hit(b, 0.5); if (i === seq.length - 1) playing = false; }, i * 230); });
    });
  }

  /* ---------- Пианино-навигация: звук при наведении, если включён ---------- */
  document.querySelectorAll('.key[data-freq]').forEach(function (k) {
    var f = parseFloat(k.getAttribute('data-freq'));
    k.addEventListener('mouseenter', function () { if (soundOn) tone(f, 0.7); });
    k.addEventListener('focus', function () { if (soundOn) tone(f, 0.7); });
  });

  /* ---------- Появление при скролле ---------- */
  var watch = document.querySelectorAll('.reveal, .staff-rule, .play-staff-board, [data-count]');
  if ('IntersectionObserver' in window && root.classList.contains('fx')) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        // элемент уже выше экрана (переход по якорю) — показываем сразу
        if (!e.isIntersecting && e.boundingClientRect.bottom > 0) return;
        e.target.classList.add('in');
        if (e.target.hasAttribute('data-count')) countUp(e.target);
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    watch.forEach(function (el) { io.observe(el); });
  } else {
    watch.forEach(function (el) { el.classList.add('in'); });
  }
  function countUp(el) {
    var end = parseInt(el.getAttribute('data-count'), 10);
    if (!end || root.classList.contains('fx-lite')) return;
    var t0 = null, dur = 1400, suffix = el.getAttribute('data-suffix') || '';
    function step(t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(end * e) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------- Лайтбокс для галерей (ссылки работают и без JS) ---------- */
  var groups = document.querySelectorAll('[data-gallery]');
  if (groups.length && window.HTMLDialogElement) {
    var dlg = document.createElement('dialog');
    dlg.className = 'lightbox';
    dlg.setAttribute('aria-label', 'Просмотр изображения');
    dlg.innerHTML = '<img alt=""><button class="lb-close" type="button" aria-label="Закрыть">✕</button>' +
      '<button class="lb-nav lb-prev" type="button" aria-label="Предыдущее">←</button>' +
      '<button class="lb-nav lb-next" type="button" aria-label="Следующее">→</button><div class="lb-count" aria-live="polite"></div>';
    document.body.appendChild(dlg);
    var img = dlg.querySelector('img'), count = dlg.querySelector('.lb-count'), list = [], idx = 0;
    function show(i) {
      idx = (i + list.length) % list.length;
      var a = list[idx], im = a.querySelector('img');
      img.src = a.getAttribute('href'); img.alt = im ? im.alt : '';
      count.textContent = (idx + 1) + ' / ' + list.length;
    }
    groups.forEach(function (g) {
      var links = Array.prototype.slice.call(g.querySelectorAll('a[href$=".jpg"], a[href$=".png"]'));
      links.forEach(function (a, i) {
        a.addEventListener('click', function (ev) {
          ev.preventDefault(); list = links; show(i); dlg.showModal();
        });
      });
    });
    dlg.querySelector('.lb-close').addEventListener('click', function () { dlg.close(); });
    dlg.querySelector('.lb-prev').addEventListener('click', function () { show(idx - 1); });
    dlg.querySelector('.lb-next').addEventListener('click', function () { show(idx + 1); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });
  }

  /* ---------- «Играем в оркестр»: ритм из больших и маленьких фигур ---------- */
  var activeTimer = null, activeBtn = null;
  function stopRhythm() {
    if (activeTimer) clearTimeout(activeTimer);
    activeTimer = null;
    document.querySelectorAll('.beat.on').forEach(function (b) { b.classList.remove('on'); });
    if (activeBtn) { activeBtn.setAttribute('aria-pressed', 'false'); activeBtn.querySelector('.lbl').textContent = 'Играть'; }
    activeBtn = null;
  }
  document.querySelectorAll('.rhythm-row').forEach(function (row) {
    var btn = row.querySelector('.play-rhythm');
    if (row.classList.contains('editable')) {
      row.querySelectorAll('.beat').forEach(function (b) {
        b.addEventListener('click', function () {
          var small = b.classList.toggle('s');
          b.textContent = small ? 'ти' : 'та';
          b.setAttribute('aria-label', small ? 'Короткий звук — нажмите, чтобы сделать длинным' : 'Длинный звук — нажмите, чтобы сделать коротким');
          click(!small);
        });
      });
    }
    if (!btn) return;
    btn.hidden = false;
    btn.addEventListener('click', function () {
      if (activeBtn === btn) { stopRhythm(); return; }
      stopRhythm();
      activeBtn = btn; btn.setAttribute('aria-pressed', 'true'); btn.querySelector('.lbl').textContent = 'Стоп';
      var beats = Array.prototype.slice.call(row.querySelectorAll('.beat')), i = 0, loops = 0;
      (function next() {
        beats.forEach(function (b) { b.classList.remove('on'); });
        if (i >= beats.length) { i = 0; loops++; }
        if (loops >= 3) { stopRhythm(); return; }
        var b = beats[i], small = b.classList.contains('s');
        b.classList.add('on'); click(!small);
        i++;
        activeTimer = setTimeout(next, small ? 300 : 600);
      })();
    });
  });

  /* ---------- Форма контактов → письмо ---------- */
  var form = document.querySelector('form[data-mailto]');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = new FormData(form);
      var subject = 'Вопрос с сайта от ' + (f.get('name') || '');
      var body = (f.get('message') || '') + '\n\n' + (f.get('name') || '') + '\n' + (f.get('contact') || '');
      window.location.href = 'mailto:' + form.getAttribute('data-mailto') + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      var ok = form.querySelector('.form-ok'); if (ok) ok.hidden = false;
    });
  }

  /* ---------- Пауза бегущей строки вне экрана ---------- */
  var ticker = document.querySelector('.ticker-track');
  if (ticker && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      ticker.style.animationPlayState = en[0].isIntersecting ? '' : 'paused';
    }).observe(ticker);
  }
})();
