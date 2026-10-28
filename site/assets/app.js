/* Page behaviour: theme, nav menu, progress, scroll-spy, reveal, copy, repo metrics. Adapted from the LLM Wiki Template site (MIT). */
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  var $ = function (id) { return d.getElementById(id); };
  var T = function (k, v) { return window.llmwT ? window.llmwT(k, v) : k; };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* Theme (the plugin demo follows it through the body class and an event) */
  var toggle = $('themeToggle');
  function setTheme(t, persist) {
    root.setAttribute('data-theme', t);
    d.body.classList.toggle('theme-light', t === 'light');
    if (persist) store.set('theme', t);
    var m = d.querySelector('meta[name="theme-color"]:not([media])');
    if (m) m.setAttribute('content', t === 'light' ? '#4f5bd5' : '#0b0d12');
    window.dispatchEvent(new Event('llmw:theme'));
  }
  d.body.classList.toggle('theme-light', root.getAttribute('data-theme') === 'light');
  if (toggle) toggle.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    if (d.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) d.startViewTransition(function () { setTheme(next, true); });
    else setTheme(next, true);
  });
  var mq = matchMedia('(prefers-color-scheme: light)');
  if (mq.addEventListener) mq.addEventListener('change', function () { if (!store.get('theme')) setTheme(mq.matches ? 'light' : 'dark', false); });

  /* Mobile menu */
  var btn = $('menuBtn'), panel = $('navPanel');
  function setMenu(open) {
    if (!btn || !panel) return;
    btn.setAttribute('aria-expanded', String(open));
    if (open) panel.setAttribute('data-open', ''); else panel.removeAttribute('data-open');
  }
  if (btn && panel) {
    btn.addEventListener('click', function () { setMenu(btn.getAttribute('aria-expanded') !== 'true'); });
    panel.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('.nav-links a')) setMenu(false); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { setMenu(false); btn.focus(); } });
    d.addEventListener('click', function (e) { if (btn.getAttribute('aria-expanded') === 'true' && !e.target.closest('.site-nav')) setMenu(false); });
    matchMedia('(min-width: 1300px)').addEventListener('change', function (e) { if (e.matches) setMenu(false); });
  }

  /* Progress bar + back to top */
  var progress = $('progress'), top = $('backToTop'), ticking = false;
  function onScroll() {
    ticking = false;
    var max = (root.scrollHeight - root.clientHeight) || 1, y = root.scrollTop;
    if (progress) progress.style.transform = 'scaleX(' + Math.min(1, y / max) + ')';
    if (top) top.hidden = y < 600;
  }
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
  if (top) top.addEventListener('click', function () { scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); });

  /* Scroll-spy: the nav link of the part the reader is in */
  var links = [].slice.call(d.querySelectorAll('.nav-links a[href^="#"]'));
  if ('IntersectionObserver' in window && links.length) {
    var secs = [].slice.call(d.querySelectorAll('main section[id]')), owner = {}, current = null;
    secs.forEach(function (s) {
      links.forEach(function (a) { if (a.getAttribute('href') === '#' + s.id) current = a; });
      owner[s.id] = current;
    });
    var spy = new IntersectionObserver(function (en) {
      en.forEach(function (e) {
        if (!e.isIntersecting) return;
        var own = owner[e.target.id];
        links.forEach(function (a) { if (a === own) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    secs.forEach(function (s) { spy.observe(s); });
  }

  /* Reveal on scroll (only when the head script added html.js) */
  if ('IntersectionObserver' in window && root.classList.contains('js')) {
    var io = new IntersectionObserver(function (en) { en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -5% 0px' });
    d.querySelectorAll('.card, .flow-card').forEach(function (el) { el.classList.add('reveal'); io.observe(el); });
  }

  /* Copy the install commands */
  var copy = $('copyQs'), qs = $('quickStart');
  function flash(el, key, back) { el.textContent = T(key); setTimeout(function () { el.textContent = (window.llmwDict && window.llmwDict[root.lang] && window.llmwDict[root.lang][back]) || 'Copy'; }, 1400); }
  if (copy && qs) copy.addEventListener('click', function () {
    var p = navigator.clipboard ? navigator.clipboard.writeText(qs.innerText) : Promise.reject();
    p.then(function () { flash(copy, 'copied', 'app.copy'); }, function () { flash(copy, 'failed', 'app.copy'); });
  });

  /* Repo facts: latest release and stars, cached 10 minutes so reloads do not burn the unauthenticated API quota */
  var ver = $('mVersion'), stars = $('mStars');
  function paint(r) {
    if (ver && r.tag) ver.textContent = T('ver', { v: r.tag });
    if (stars && r.stars != null) { stars.hidden = false; stars.textContent = T('stars', { n: r.stars }); }
    paint.last = r;
  }
  window.addEventListener('llmw:lang', function () { if (paint.last) paint(paint.last); });
  (function () {
    var c = store.get('brainFacts'), parsed = null;
    try { parsed = c && JSON.parse(c); } catch (e) {}
    if (parsed && Date.now() - parsed.t < 600000) { paint(parsed.r); return; }
    Promise.all([
      fetch('https://api.github.com/repos/jonyfs/llm-wiki-brain/releases/latest').then(function (x) { return x.ok ? x.json() : null; }),
      fetch('https://api.github.com/repos/jonyfs/llm-wiki-brain').then(function (x) { return x.ok ? x.json() : null; })
    ]).then(function (a) {
      var r = { tag: a[0] && a[0].tag_name, stars: a[1] && a[1].stargazers_count };
      if (!r.tag && r.stars == null) return;
      paint(r); store.set('brainFacts', JSON.stringify({ t: Date.now(), r: r }));
    }).catch(function () {});
  })();
})();
