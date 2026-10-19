// outsky.app — общее ядро страниц «Туманности» (главная и внутренние). Без библиотек, все слушатели пассивные.
//  reveal  — .rv получает .is-in при первом входе в экран (IO .15, rootMargin -8% снизу); ?shot и без IO — сразу всё.
//  live    — секции [data-live] получают .is-live, пока они рядом с экраном (rootMargin 200px).
//  scrollfx— закреплённые треки [data-track] получают --p 0…1 (сглажено по времени, τ = 110 мс) и событие track:progress.
//            Включаются только при (min-width:1100px) and (min-height:680px), с JS, без reduced-motion и не в ?shot
//            (тогда на html ставится .pin; без него треки — обычный поток, см. nebula.css).
//  Эффекты подключаются лениво: <section data-fx="/assets/js/fx-home.js"> — import() при первом входе секции в экран.
(() => {
  const html = document.documentElement;
  const shot = /[?&]shot/.test(location.search);
  if (shot) html.classList.add('shot');
  const rm = matchMedia('(prefers-reduced-motion: reduce)');
  const pinMq = matchMedia('(min-width:1100px) and (min-height:680px)');
  const $$ = s => [...document.querySelectorAll(s)];

  // ---- reveal ----
  const rv = $$('.rv');
  if (shot || rm.matches || !('IntersectionObserver' in window)) rv.forEach(el => el.classList.add('is-in'));
  else {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }),
      { threshold: .15, rootMargin: '0px 0px -8% 0px' });
    rv.forEach(el => io.observe(el));
    addEventListener('transitionend', e => { if (e.target.classList && e.target.classList.contains('is-in')) e.target.style.willChange = 'auto'; }, { passive: true });
  }

  // ---- live ----
  const live = $$('[data-live]');
  if ('IntersectionObserver' in window && !shot) {
    const io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('is-live', e.isIntersecting)), { rootMargin: '200px 0px' });
    live.forEach(el => io.observe(el));
  }

  // ---- ленивые эффекты (один файл грузится один раз, сколько бы секций его ни просили) ----
  const fx = $$('[data-fx]'), loaded = new Set();
  const load = src => { if (loaded.has(src)) return; loaded.add(src); import(new URL(src, document.baseURI).href).catch(() => {}); };
  if (!('IntersectionObserver' in window)) fx.forEach(el => load(el.dataset.fx));
  else { const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { load(e.target.dataset.fx); io.unobserve(e.target); } }), { rootMargin: '300px 0px' }); fx.forEach(el => io.observe(el)); }

  // ---- scrollfx: закреплённые треки ----
  const tracks = $$('[data-track]').map(el => ({ el, p: 0, t: 0 }));
  let pin = false, raf = 0, last = 0, lastScroll = 0;
  function setPin() {
    pin = !shot && !rm.matches && pinMq.matches && tracks.length > 0;
    html.classList.toggle('pin', pin);
    if (!pin) tracks.forEach(k => { k.p = k.t = 0; k.el.style.removeProperty('--p'); });
    else kick();
  }
  function target(k) {
    const r = k.el.getBoundingClientRect(), span = r.height - innerHeight;
    return span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
  }
  function frame(now) {
    raf = 0;
    const dt = Math.min(64, now - (last || now)); last = now;
    let moving = false;
    tracks.forEach(k => {
      k.t = target(k);
      const d = k.t - k.p;
      k.p = Math.abs(d) < .0005 ? k.t : k.p + d * (1 - Math.exp(-dt / 110));
      if (k.p !== k.t) moving = true;
      k.el.style.setProperty('--p', k.p.toFixed(4));
      k.el.dispatchEvent(new CustomEvent('track:progress', { detail: k.p }));
    });
    if (moving || now - lastScroll < 150) raf = requestAnimationFrame(frame); else last = 0;
  }
  function kick() { if (pin && !raf) raf = requestAnimationFrame(frame); }
  addEventListener('scroll', () => { lastScroll = performance.now(); kick(); }, { passive: true });
  addEventListener('resize', kick, { passive: true });
  pinMq.addEventListener('change', setPin); rm.addEventListener('change', setPin);
  setPin();
  // фокус с клавиатуры внутри трека — прокрутить к началу сегмента карточки (data-seg="0…1"), чтобы карточку было видно.
  // Фокус от мыши/тача (клик по переключателю, кнопке, самой карточке) страницу не двигает — иначе колода «телепортировалась»
  // к data-seg. Карточка уже лежит сверху и видна целиком — остаёмся на месте (Tab между кнопками внутри неё);
  // scrollTo(scrollY) лишь обрывает плавную прокрутку, если она ещё идёт (Tab сразу после «Пропустить» увёл бы карточку из кадра).
  let kbd = true;
  addEventListener('pointerdown', () => { kbd = false; }, { passive: true, capture: true });
  addEventListener('keydown', () => { kbd = true; }, { passive: true, capture: true });
  const fv = el => { try { return el.matches(':focus-visible'); } catch (_) { return true; } };
  const shown = el => {
    const r = el.getBoundingClientRect(); if (r.top < 0 || r.bottom > innerHeight) return false;
    const h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!h && el.contains(h);
  };
  document.addEventListener('focusin', e => {
    if (!pin || !kbd || !fv(e.target)) return;
    const seg = e.target.closest('[data-seg]'), tr = seg && seg.closest('[data-track]'); if (!tr) return;
    const r = tr.getBoundingClientRect(), y = shown(seg) ? scrollY : scrollY + r.top + (r.height - innerHeight) * +seg.dataset.seg;
    scrollTo({ top: y, behavior: 'instant' });
  });
})();
