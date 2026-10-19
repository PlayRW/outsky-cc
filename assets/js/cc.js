// outsky.cc — поведение страниц сервиса поверх core.js и sky.js. Классический скрипт (defer), без библиотек,
// слушатели пассивные; без JS всё работает (ссылки и якоря, :target, :has()), здесь — только улучшения.
//  me    — метка «Ваша система» на карточке устройства посетителя ([data-os] в .vp-pl и .gd-sw).
//  dev   — инструкция: aria-current на плитке выбранного устройства (сам выбор — CSS по :target).
//  doc   — политика: язык меню и подвала — по разделу, который читают (html[data-ui]); подсветка пункта оглавления.
(() => {
  const html = document.documentElement, $$ = s => [...document.querySelectorAll(s)];
  const en = html.lang === 'en';
  const P = { passive: true };

  // ---- me: система посетителя ----
  const ua = navigator.userAgent;
  const os = /iPhone|iPad|iPod/.test(ua) ? 'ios' : /Android/.test(ua) ? 'android' : /Mac OS X/.test(ua) ? 'mac' : /Windows/.test(ua) ? 'windows' : null;
  if (os) $$(`.vp-pl [data-os="${os}"], .gd-sw [data-os="${os}"]`).forEach(el => {
    el.classList.add('is-me');
    const m = document.createElement('span');
    m.className = 'cc-me'; m.textContent = en ? 'Your system' : 'Ваша система';
    const ar = el.querySelector('.gd-ar'); if (ar) el.insertBefore(m, ar); else el.appendChild(m);
  });

  // ---- dev: выбранное устройство в инструкции ----
  const tiles = $$('.gd-sw a[href^="#"]');
  if (tiles.length) {
    const sync = () => tiles.forEach(a => { if (a.hash && a.hash === location.hash) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    sync(); addEventListener('hashchange', sync, P);
  }

  // ---- doc: политика на двух языках ----
  const sEn = document.getElementById('en'), sRu = document.getElementById('ru');
  const toc = $$('.pp-toc a[href^="#"]');
  if (sEn && sRu && toc.length && 'IntersectionObserver' in window) {
    const ui = l => { if (html.dataset.ui !== l) html.dataset.ui = l; };
    ui(/^#ru/.test(location.hash) ? 'ru' : 'en');
    // язык — по разделу, который пересекает линию на 30% высоты экрана
    const lio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) ui(e.target.id); }), { rootMargin: '-30% 0px -69% 0px' });
    lio.observe(sEn); lio.observe(sRu);
    // пункт оглавления — раздел у верхней кромки (под шапкой)
    const map = new Map(toc.map(a => [a.hash.slice(1), a]));
    let cur = null;
    const set = id => { const a = map.get(id) || null; if (a === cur) return; if (cur) cur.removeAttribute('aria-current'); if (a) a.setAttribute('aria-current', 'true'); cur = a; };
    const tio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) set(e.target.id); }), { rootMargin: '-90px 0px -72% 0px' });
    map.forEach((a, id) => { const s = document.getElementById(id); if (s) tio.observe(s); });
    // над первым разделом языка — ничего не подсвечено
    const top = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) set(null); }), { rootMargin: '-90px 0px -72% 0px' });
    $$('.pp-intro').forEach(el => top.observe(el));
  }
})();
