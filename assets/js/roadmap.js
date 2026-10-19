// outsky.cc — копия /assets/js/roadmap.js с outsky.app (логика та же, отличаются только комментарии): колонки по статусам, а если продуктов на странице больше одного — ещё и вкладки продуктов.
// Данные — /assets/data/roadmap.json. Разметка строится только через createElement/textContent,
// никакого innerHTML с данными. Тексты интерфейса — по <html lang>. Без библиотек и внешних запросов.
// Какие продукты показывает страница — data-products у #rm (id через пробел; без атрибута — все из данных).
// Хэш продукта, которого на странице нет (#vpn, #extension), уводит на роадмап его сайта — data-away (только https://), с тем же хэшем.
// data-elsewhere — id таких продуктов: их хэш уводит сразу, до загрузки данных (прочие продукты из данных — после неё).
(() => {
  'use strict';
  const doc = document;
  const byId = id => doc.getElementById(id);
  const tabsEl = byId('rm-tabs'), board = byId('rm-board');
  if (!tabsEl || !board) return;
  const loading = byId('rm-loading'), errorEl = byId('rm-error'), updEl = byId('rm-updated'), note = byId('rm-note');
  const root = byId('rm') || board;
  const only = (root.getAttribute('data-products') || '').split(/\s+/).filter(Boolean);
  const awayAttr = root.getAttribute('data-away') || '';
  const away = /^https:\/\/[^\s"'<>#]+$/.test(awayAttr) ? awayAttr : '';

  const lang = doc.documentElement.lang === 'en' ? 'en' : 'ru';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (/[?&]shot/.test(location.search)) board.classList.add('rm-static'); // для скриншотов — без анимации
  const T = {
    ru: { all: 'Всё', empty: 'Пока пусто',
          months: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
          date: (d, m, y) => `${d} ${m} ${y}` },
    en: { all: 'All', empty: 'Nothing yet',
          months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
          date: (d, m, y) => `${m} ${d}, ${y}` }
  }[lang];

  const ALL = 'all';
  // Эти колонки видны всегда (пустая — с подписью), остальные — только если в них есть карточки.
  const ALWAYS = new Set(['planned', 'in_progress', 'testing', 'done']);
  const ID = /^[a-z0-9_-]{1,40}$/;

  const str = v => (typeof v === 'string' ? v : '');
  const tr = o => (o && typeof o === 'object') ? (str(o[lang]) || str(o.ru) || str(o.en)) : str(o);
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const el = (tag, cls, text) => {
    const n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  };

  // multi — вкладки продуктов есть (продуктов на странице больше одного); elsewhere — продукты, которых здесь нет
  let data = null, products = Object.create(null), tabs = [], current = ALL, multi = false;
  let elsewhere = new Set((root.getAttribute('data-elsewhere') || '').split(/\s+/).filter(id => ID.test(id) && !only.includes(id)));

  function formatDate(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(s));
    const mon = m && T.months[Number(m[2]) - 1];
    return mon ? T.date(Number(m[3]), mon, m[1]) : '';
  }

  function hashId() {
    try { return decodeURIComponent(location.hash.slice(1)); } catch (e) { return ''; }
  }
  // Вкладка из адреса: #app, #extension, #vpn. null — хэш не про вкладки (например, #main от ссылки «К содержимому»).
  function fromHash() {
    const h = hashId();
    return tabs.some(t => t.id === h) ? h : null;
  }
  // Старые ссылки на продукт, которого на этой странице нет, — на роадмап его сайта, на ту же вкладку (id — только [a-z0-9_-])
  function goAway() {
    const h = hashId();
    if (!away || !h || !elsewhere.has(h)) return false;
    location.replace(away + '#' + h);
    return true;
  }

  // Переключатель языка (шапка, меню, подвал) ведёт на ту же вкладку парной страницы.
  function syncLangLinks() {
    const hash = current === ALL ? '' : '#' + current;
    doc.querySelectorAll('.lang a[href]').forEach(a => { if (a.hash !== hash) a.hash = hash; });
  }

  function syncUrl() {
    const hash = current === ALL ? '' : '#' + current;
    if (location.hash !== hash) {
      try { history.replaceState(history.state, '', location.pathname + location.search + hash); } catch (e) { /* file:// и т. п. */ }
    }
  }

  // Прокрутить полосу вкладок так, чтобы кнопка была видна (без прокрутки страницы).
  function showTab(btn) {
    const l = btn.offsetLeft, r = l + btn.offsetWidth, sl = tabsEl.scrollLeft, w = tabsEl.clientWidth;
    let to = null;
    if (l < sl) to = Math.max(0, l - 8);
    else if (r > sl + w) to = r - w + 8;
    if (to == null) return;
    if (reduce || typeof tabsEl.scrollTo !== 'function') tabsEl.scrollLeft = to;
    else tabsEl.scrollTo({ left: to, behavior: 'smooth' });
  }

  // Затухание края у прокручиваемой полосы: видно, что дальше есть ещё колонки/вкладки.
  // Без вкладок доска доступна с клавиатуры (Tab), только когда её можно прокрутить вбок.
  function edges(node) {
    const rest = node.scrollWidth - node.clientWidth - node.scrollLeft;
    node.classList.toggle('rm-more', rest > 2);
    node.classList.toggle('rm-less', node.scrollLeft > 2);
    if (node === board && !multi) {
      if (node.scrollWidth - node.clientWidth > 2) node.tabIndex = 0;
      else node.removeAttribute('tabindex');
    }
  }
  let edgeRaf = 0;
  const edgesNow = () => { edges(board); edges(tabsEl); };
  const edgesSoon = () => {
    if (edgeRaf) return;
    edgeRaf = requestAnimationFrame(() => { edgeRaf = 0; edgesNow(); });
  };

  function buildTabs() {
    const list = [{ id: ALL, label: T.all }].concat(data.products.map(p => ({ id: p.id, label: tr(p) || p.id })));
    tabs = list.map(t => {
      const b = el('button', 'rm-tab', t.label);
      b.type = 'button';
      b.id = 'rm-tab-' + t.id;
      b.dataset.id = t.id;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-controls', 'rm-board');
      tabsEl.appendChild(b);
      return { id: t.id, btn: b };
    });
    board.setAttribute('role', 'tabpanel');
    board.tabIndex = 0;
  }

  function card(it, i) {
    const li = el('li', 'rm-card');
    li.style.setProperty('--i', String(Math.min(i, 10)));
    li.appendChild(el('h3', '', tr(it.title)));
    const text = tr(it.text);
    if (text) li.appendChild(el('p', '', text));

    const chips = [];
    if (multi && current === ALL && typeof it.product === 'string' && products[it.product]) {
      const c = el('span', 'rm-chip rm-prod', tr(products[it.product]) || it.product);
      c.setAttribute('data-product', it.product);
      chips.push(c);
    }
    (Array.isArray(it.tags) ? it.tags : []).forEach(tag => {
      if (typeof tag !== 'string' || !tag) return;
      chips.push(el('span', 'rm-chip', (has(data.tags, tag) && tr(data.tags[tag])) || tag));
    });
    if (chips.length) {
      const meta = el('div', 'rm-meta');
      chips.forEach(c => meta.appendChild(c));
      li.appendChild(meta);
    }
    return li;
  }

  function render() {
    tabs.forEach(t => {
      const on = t.id === current;
      t.btn.setAttribute('aria-selected', on ? 'true' : 'false');
      t.btn.tabIndex = on ? 0 : -1;
    });
    if (multi) board.setAttribute('aria-labelledby', 'rm-tab-' + current);

    const items = data.items.filter(it => current === ALL || it.product === current);
    const frag = doc.createDocumentFragment();
    data.statuses.forEach(s => {
      const list = items.filter(it => it.status === s.id);
      if (!list.length && !ALWAYS.has(s.id)) return;

      // колонка — стекло (.pane из nebula.css), цвет статуса — переменные в cc.css
      const col = el('section', 'rm-col pane');
      col.setAttribute('data-status', s.id);
      const h = el('h2', 'rm-col-h');
      h.id = 'rm-col-' + s.id;
      h.appendChild(el('span', 'rm-badge', tr(s) || s.id));
      const count = el('span', 'rm-count', String(list.length));
      count.setAttribute('aria-hidden', 'true');
      h.appendChild(count);
      col.setAttribute('aria-labelledby', h.id);
      col.appendChild(h);

      if (list.length) {
        const ul = el('ul', 'rm-list');
        ul.setAttribute('role', 'list'); // list-style:none в Safari убирает семантику списка
        list.forEach((it, i) => ul.appendChild(card(it, i)));
        col.appendChild(ul);
      } else {
        col.appendChild(el('p', 'rm-empty', T.empty));
      }
      frag.appendChild(col);
    });
    board.textContent = '';
    board.appendChild(frag);
    board.scrollLeft = 0;
    if (!board.hidden) edgesNow();
  }

  function select(id, fromUser) {
    if (!tabs.some(t => t.id === id)) id = ALL;
    if (id !== current) { current = id; render(); }
    if (fromUser) syncUrl();
    syncLangLinks();
  }

  function fail() {
    if (loading) loading.hidden = true;
    if (updEl) updEl.hidden = true;
    if (note) note.hidden = true;
    tabsEl.hidden = true; tabsEl.textContent = '';
    board.hidden = true; board.textContent = '';
    if (errorEl) errorEl.hidden = false;
  }

  function init(d) {
    if (!d || !Array.isArray(d.statuses) || !Array.isArray(d.products) || !Array.isArray(d.items)) throw new Error('roadmap: bad data');
    const all = d.products.filter(p => p && typeof p.id === 'string' && ID.test(p.id) && p.id !== ALL);
    const shown = only.length ? all.filter(p => only.includes(p.id)) : all;
    all.forEach(p => { if (!shown.includes(p)) elsewhere.add(p.id); });
    if (goAway()) return;
    const ids = new Set(shown.map(p => p.id));
    data = {
      statuses: d.statuses.filter(s => s && typeof s.id === 'string' && ID.test(s.id)),
      products: shown,
      items: d.items.filter(it => it && typeof it === 'object' && tr(it.title) && (!only.length || ids.has(it.product))),
      tags: (d.tags && typeof d.tags === 'object') ? d.tags : {}
    };
    data.products.forEach(p => { products[p.id] = p; });
    multi = data.products.length > 1;

    if (multi) buildTabs();
    current = fromHash() || ALL;
    render();

    const upd = formatDate(d.updated);
    if (updEl && upd) {
      const t = updEl.querySelector('time');
      if (t) { t.dateTime = d.updated; t.textContent = upd; updEl.hidden = false; }
    }
    if (loading) loading.hidden = true;
    tabsEl.hidden = !multi;
    board.hidden = false;
    if (note) note.hidden = false;
    syncLangLinks();
    const sel = tabs.find(t => t.id === current);
    if (sel) showTab(sel.btn);
    edgesNow();
    board.addEventListener('scroll', edgesSoon, { passive: true });
    tabsEl.addEventListener('scroll', edgesSoon, { passive: true });
    addEventListener('resize', edgesSoon, { passive: true });
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(edgesNow);

    tabsEl.addEventListener('click', e => {
      const b = e.target.closest('.rm-tab');
      if (!b) return;
      select(b.dataset.id, true);
      showTab(b);
    });
    // Клавиатура: стрелки влево/вправо, Home, End — фокус и выбор вместе (вкладки переключаются мгновенно).
    tabsEl.addEventListener('keydown', e => {
      const i = tabs.findIndex(t => t.btn === doc.activeElement);
      if (i < 0) return;
      const n = tabs.length;
      const j = e.key === 'ArrowRight' ? (i + 1) % n
        : e.key === 'ArrowLeft' ? (i - 1 + n) % n
        : e.key === 'Home' ? 0
        : e.key === 'End' ? n - 1 : -1;
      if (j < 0) return;
      e.preventDefault();
      const b = tabs[j].btn;
      b.focus({ preventScroll: true });
      select(tabs[j].id, true);
      showTab(b);
    });
    // Назад/вперёд по истории, ручная правка адреса.
    addEventListener('hashchange', () => {
      if (goAway()) return;
      const h = fromHash();
      if (h) select(h, false);
      else if (!location.hash) select(ALL, false);
    });
  }

  if (goAway()) return;   // известный чужой продукт — сразу, не дожидаясь данных
  if (typeof fetch !== 'function') { fail(); return; }
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 15000) : 0;
  fetch('/assets/data/roadmap.json', { cache: 'no-cache', credentials: 'same-origin', signal: ctrl ? ctrl.signal : undefined })
    .then(r => { if (!r.ok) throw new Error('roadmap: HTTP ' + r.status); return r.json(); })
    .then(d => { clearTimeout(timer); init(d); })
    .catch(() => { clearTimeout(timer); fail(); });
})();
