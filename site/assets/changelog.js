/* Fills the changelog from the GitHub releases API (cached 10 minutes). Text is inserted with textContent only. */
(function () {
  'use strict';
  var box = document.getElementById('releases');
  function fail() { box.textContent = ''; var p = document.createElement('p'); p.className = 'muted'; p.textContent = 'Could not load the releases. See the link below.'; box.appendChild(p); }
  function paint(list) {
    box.textContent = '';
    list.forEach(function (r) {
      var card = document.createElement('div'); card.className = 'card';
      var h = document.createElement('h3'), a = document.createElement('a');
      a.href = r.html_url; a.textContent = r.name || r.tag_name; h.appendChild(a); card.appendChild(h);
      var p = document.createElement('p'); p.textContent = (r.published_at || '').slice(0, 10); card.appendChild(p);
      var body = (r.body || '').split('\n').filter(function (l) { return l.trim(); }).slice(0, 12);
      if (body.length) { var pre = document.createElement('p'); pre.textContent = body.join(' · ').slice(0, 600); card.appendChild(pre); }
      box.appendChild(card);
    });
  }
  var raw = null, parsed = null;
  try { raw = localStorage.getItem('brainReleases'); parsed = raw && JSON.parse(raw); } catch (e) {}
  if (parsed && Date.now() - parsed.t < 600000) return paint(parsed.r);
  fetch('https://api.github.com/repos/jonyfs/llm-wiki-brain/releases?per_page=30').then(function (r) { return r.ok ? r.json() : null; }).then(function (l) {
    if (!l || !l.length) return fail();
    paint(l);
    try { localStorage.setItem('brainReleases', JSON.stringify({ t: Date.now(), r: l.map(function (r) { return { name: r.name, tag_name: r.tag_name, html_url: r.html_url, published_at: r.published_at, body: r.body }; }) })); } catch (e) {}
  }).catch(fail);
})();
