// outsky.app — общее поведение страниц в концепции «Туманность»: плавная прокрутка, меню и свечение у курсора. Классический скрипт (defer),
// подключается после core.js на каждой такой странице. Без библиотек, слушатели пассивные. Шапка закреплена чистым CSS — JS ей не нужен.
(() => {
  const html = document.documentElement;
  const shot = html.classList.contains('shot') || /[?&]shot/.test(location.search);
  const rmq = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const P = { passive: true };

  // ---- плавная прокрутка к якорям (html.smooth, nebula.css; без RM) — после load и двух кадров, когда начальный переход по якорю уже сделан.
  //      В фоновой вкладке кадров нет — класс появится, когда вкладку откроют; до этого переходы мгновенные ----
  const smooth = () => requestAnimationFrame(() => requestAnimationFrame(() => html.classList.add('smooth')));
  if (document.readyState === 'complete') smooth(); else addEventListener('load', smooth, { once: true });

  // ---- меню (Popover API, работает и без JS): ссылка закрывает popover ----
  const menu = document.getElementById('menu');
  if (menu && menu.hidePopover) menu.addEventListener('click', e => { if (e.target.closest('a')) menu.hidePopover(); });

  // ---- свечение у курсора: один фиксированный слой радиусом ~480px (nebula.css), только мышь, без RM и ?shot, rAF-троттлинг ----
  const glow = document.querySelector('.cglow');
  if (glow && fine && !shot && !rmq.matches) {
    html.classList.add('cg');
    let gx = 0, gy = 0, grq = 0;
    const put = () => { grq = 0; glow.style.transform = `translate3d(${gx}px,${gy}px,0)`; };
    addEventListener('pointermove', e => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      gx = e.clientX; gy = e.clientY;
      if (!glow.classList.contains('on')) { put(); glow.classList.add('on'); } else if (!grq) grq = requestAnimationFrame(put);
    }, P);
    document.addEventListener('mouseout', e => { if (!e.relatedTarget) glow.classList.remove('on'); }, P);
  }
})();
