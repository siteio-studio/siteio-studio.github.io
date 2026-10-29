// Набросок «Дом обуви»: каталог, фильтры, избранное, корзина и оформление — всё в браузере, без сервера.
// Заказ никуда не отправляется; имя и телефон из формы нигде не сохраняются.
(function () {
  const P = window.PRODUCTS || [];
  const CATS = window.CATS || {};
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* приватный режим */ } },
  };
  const rub = (n) => n.toLocaleString('ru-RU') + ' ₽';
  const HEART = '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>';
  const photo = (p, w = 800, h = 800) => p.photo.startsWith('ill:')
    ? `<svg viewBox="0 0 96 64" class="ill"><use href="#s-${p.photo.slice(4)}"/></svg>`
    : `<img src="https://images.unsplash.com/photo-${p.photo}?w=${w}&h=${h}&fit=crop&q=80&auto=format" alt="${p.name}" loading="lazy">`;
  const byId = (id) => P.find((p) => p.id === id);
  const oneSize = (p) => p.sizes.length === 1 && typeof p.sizes[0] === 'string';

  // --- Избранное и корзина (localStorage этого браузера) ---
  const favs = () => store.get('do-fav', []);
  const isFav = (id) => favs().includes(id);
  function toggleFav(id) {
    const f = favs(); const i = f.indexOf(id);
    if (i < 0) f.push(id); else f.splice(i, 1);
    store.set('do-fav', f); badges(); return i < 0;
  }
  const cart = () => store.get('do-cart', []).filter((x) => byId(x.id));
  const setCart = (c) => { store.set('do-cart', c); badges(); };
  function addToCart(id, size, color) {
    const c = cart(); const it = c.find((x) => x.id === id && x.size === size && x.color === color);
    if (it) it.qty++; else c.push({ id, size, color, qty: 1 });
    setCart(c);
  }
  function badges() {
    const n = cart().reduce((s, x) => s + x.qty, 0);
    $$('[data-cart-count]').forEach((b) => { b.textContent = n; b.hidden = !n; });
    const f = favs().length;
    $$('[data-fav-count]').forEach((b) => { b.textContent = f; b.hidden = !f; });
  }
  function toast(html) {
    let t = $('#toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); }
    t.innerHTML = html; t.classList.add('show');
    clearTimeout(t.h); t.h = setTimeout(() => t.classList.remove('show'), 4000);
  }
  function card(p) {
    const tag = p.tag ? `<span class="tag">${p.tag}</span>` : '';
    const price = p.old ? `<div class="price sale">${rub(p.price)}<s>${rub(p.old)}</s></div>` : `<div class="price">${rub(p.price)}</div>`;
    const dots = p.colors.map((c) => `<i style="background:${c[1]}" title="${c[0]}"></i>`).join('');
    return `<div class="card"><a href="tovar.html?id=${p.id}"><div class="img">${tag}${photo(p)}</div><div class="name">${p.name}</div>${price}<div class="dots">${dots}</div></a>` +
      `<button type="button" class="fav${isFav(p.id) ? ' on' : ''}" data-fav="${p.id}" aria-label="В избранное">${HEART}</button></div>`;
  }

  // --- Общее для всех страниц ---
  document.addEventListener('click', (e) => {
    const fav = e.target.closest('[data-fav]');
    if (fav && fav.dataset.fav) {
      e.preventDefault();
      const on = toggleFav(fav.dataset.fav);
      $$(`[data-fav="${fav.dataset.fav}"]`).forEach((b) => b.classList.toggle('on', on));
      toast(on ? 'Добавлено в избранное. <a href="katalog.html?fav=1">Открыть избранное</a>' : 'Убрано из избранного');
      if (document.body.dataset.page === 'catalog' && new URLSearchParams(location.search).has('fav') && !on) location.reload();
      return;
    }
    if (e.target.closest('[data-burger]')) { e.preventDefault(); document.body.classList.toggle('menu-open'); return; }
    if (e.target.closest('[data-search]')) {
      e.preventDefault(); document.body.classList.toggle('search-open');
      if (document.body.classList.contains('search-open')) $('#q').focus();
      return;
    }
    const demo = e.target.closest('[data-demo]');
    if (demo) { e.preventDefault(); toast(demo.dataset.demo); }
  });
  // Карта Яндекса грузится только по нажатию.
  $$('[data-map]').forEach((m) => m.addEventListener('click', () => {
    m.innerHTML = '<iframe src="https://yandex.ru/map-widget/v1/?ll=32.052327%2C54.776887&z=16&pt=32.052327%2C54.776887%2Cpm2rdm" title="Карта: Дом обуви, ул. Тенишевой, 4" loading="lazy"></iframe>';
  }, { once: true }));
  const novelties = $('#novelties');
  if (novelties) novelties.innerHTML = P.filter((p) => p.tag === 'Новинка').slice(0, 4).map(card).join('');

  // --- Каталог: фильтры, сортировка, «Показать ещё» ---
  function initCatalog() {
    const qs = new URLSearchParams(location.search);
    const cat = CATS[qs.get('cat')] ? qs.get('cat') : '';
    const q = (qs.get('q') || '').trim().toLowerCase();
    const fav = qs.has('fav');
    const base = P.filter((p) => (!cat || p.cat === cat) && (!fav || isFav(p.id)) &&
      (!q || `${p.name} ${p.type} ${CATS[p.cat]}`.toLowerCase().includes(q)));
    const title = fav ? 'Избранное' : q ? `Поиск: «${qs.get('q')}»` : cat ? CATS[cat] : 'Весь каталог';
    $('#cat-title').firstChild.textContent = title;
    $('#crumb').textContent = title;
    document.title = `${title} — Дом обуви`;
    $$(`nav a[data-cat="${cat}"], .mnav a[data-cat="${cat}"]`).forEach((a) => cat && a.classList.add('on'));
    if (q) $('#q').value = qs.get('q');

    const uniq = (a) => [...new Set(a)];
    const types = uniq(base.map((p) => p.type));
    const sizes = uniq(base.flatMap((p) => p.sizes).filter((s) => typeof s === 'number')).sort((a, b) => a - b);
    const colors = uniq(base.flatMap((p) => p.colors.map((c) => c.join('|'))));
    const seasons = uniq(base.map((p) => p.season));
    const st = { type: new Set(), size: new Set(), color: new Set(), season: new Set(), from: 0, to: 0, stock: false, sort: 'pop', shown: 9 };
    const box = (f, v, label, swatch = '') => `<label class="chk"><input type="checkbox" data-f="${f}" value="${v}"><i></i>${swatch}${label}</label>`;
    $('#filters-body').innerHTML =
      (types.length > 1 ? `<h3>Вид</h3>${types.map((t) => box('type', t, t)).join('')}` : '') +
      (sizes.length ? `<h3>Размер</h3><div class="sizes">${sizes.map((s) => `<label><input type="checkbox" data-f="size" value="${s}"><span>${s}</span></label>`).join('')}</div>` : '') +
      (colors.length > 1 ? `<h3>Цвет</h3>${colors.map((c) => { const [n, h] = c.split('|'); return box('color', n, n, `<em style="background:${h}"></em>`); }).join('')}` : '') +
      (seasons.length > 1 ? `<h3>Сезон</h3>${seasons.map((s) => box('season', s, s)).join('')}` : '') +
      `<h3>Цена, ₽</h3><div class="price-in"><input type="number" inputmode="numeric" data-f="from" placeholder="от ${base.length ? Math.min(...base.map((p) => p.price)) : 0}"><input type="number" inputmode="numeric" data-f="to" placeholder="до ${base.length ? Math.max(...base.map((p) => p.price)) : 0}"></div>` +
      `<h3>Наличие</h3><label class="chk"><input type="checkbox" data-f="stock"><i></i>Есть в магазине сегодня</label>`;

    function filtered() {
      let l = base.filter((p) =>
        (!st.type.size || st.type.has(p.type)) &&
        (!st.size.size || p.sizes.some((s) => st.size.has(String(s)) && !p.out.includes(s))) &&
        (!st.color.size || p.colors.some((c) => st.color.has(c[0]))) &&
        (!st.season.size || st.season.has(p.season)) &&
        (!st.from || p.price >= st.from) && (!st.to || p.price <= st.to) &&
        (!st.stock || p.stock));
      if (st.sort === 'cheap') l = [...l].sort((a, b) => a.price - b.price);
      if (st.sort === 'exp') l = [...l].sort((a, b) => b.price - a.price);
      if (st.sort === 'new') l = [...l].sort((a, b) => (b.tag === 'Новинка') - (a.tag === 'Новинка'));
      return l;
    }
    const plural = (n) => (n % 10 === 1 && n % 100 !== 11 ? 'модель' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'модели' : 'моделей');
    function draw() {
      const l = filtered();
      $('#count').textContent = `${l.length} ${plural(l.length)}`;
      $('#apply').textContent = `Показать ${l.length} ${plural(l.length)}`;
      $('#grid').innerHTML = l.length ? l.slice(0, st.shown).map(card).join('')
        : `<div class="empty">${fav && !base.length ? 'В избранном пока пусто — нажмите ♡ на товаре.' : 'Ничего не нашли.'}${base.length ? ' <button type="button" class="link" data-reset>Сбросить фильтры</button>' : ' <a class="link" href="katalog.html">Весь каталог</a>'}</div>`;
      $('#more').hidden = l.length <= st.shown;
    }
    $('#filters').addEventListener('input', (e) => {
      const el = e.target; const f = el.dataset.f; if (!f) return;
      if (f === 'from' || f === 'to') st[f] = Number(el.value) || 0;
      else if (f === 'stock') st.stock = el.checked;
      else if (el.checked) st[f].add(el.value); else st[f].delete(el.value);
      st.shown = 9; draw();
    });
    function reset() {
      ['type', 'size', 'color', 'season'].forEach((k) => st[k].clear());
      st.from = st.to = 0; st.stock = false; st.shown = 9;
      $$('#filters input').forEach((i) => { if (i.type === 'checkbox') i.checked = false; else i.value = ''; });
      draw();
    }
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-reset]')) reset();
      if (e.target.closest('[data-filters]')) document.body.classList.add('filters-open');
      if (e.target.closest('#apply') || e.target.closest('[data-filters-close]')) document.body.classList.remove('filters-open');
    });
    $('#sort').addEventListener('change', (e) => { st.sort = e.target.value; draw(); });
    $('#more').addEventListener('click', () => { st.shown += 9; draw(); });
    draw();
  }

  // --- Карточка товара ---
  const DESC = {
    'Ботинки': 'Ботинки из натуральной кожи на устойчивой подошве: держат форму и не натирают с первого дня.',
    'Сапоги': 'Сапоги на удобном каблуке, мягкое голенище хорошо садится по ноге.',
    'Туфли': 'Туфли на удобной колодке — на работу, к костюму и на выход.',
    'Босоножки': 'Лёгкие босоножки с ремешком на щиколотке — надёжно держат ногу.',
    'Кроссовки и кеды': 'Кеды на каждый день: мягкая стелька, гибкая подошва.',
    'Лоферы и мокасины': 'Мягкие модели без шнурков — легко надеть и удобно весь день.',
    'Кеды': 'Лёгкие детские кеды: гибкая подошва и удобная застёжка.',
    'Стельки': 'Стельки с поддержкой свода стопы — снижают усталость к вечеру.',
    'Сумки': 'Вместительная сумка из натуральной кожи с ремнём через плечо.',
    'Кошельки': 'Кошелёк из натуральной кожи: отделения для карт и купюр.',
  };
  function initProduct() {
    const p = byId(new URLSearchParams(location.search).get('id')) || P[0];
    document.title = `${p.name} — Дом обуви`;
    $$(`nav a[data-cat="${p.cat}"], .mnav a[data-cat="${p.cat}"]`).forEach((a) => a.classList.add('on'));
    $('#crumbs').innerHTML = `<a href="index.html">Главная</a> / <a href="katalog.html?cat=${p.cat}">${CATS[p.cat]}</a> / ${p.name}`;
    $('#pp-photo').innerHTML = photo(p, 1200, 1200);
    $('#pp-name').textContent = p.name;
    $('#pp-tag').hidden = !p.tag; $('#pp-tag').textContent = p.tag || '';
    $('#pp-price').innerHTML = p.old ? `<span class="sale">${rub(p.price)}</span><s>${rub(p.old)}</s>` : rub(p.price);
    $('#pp-desc').textContent = DESC[p.type] || '';
    $('#pp-mat').textContent = p.cat === 'sumki' ? 'Натуральная кожа, подкладка — текстиль. Протирать сухой мягкой тканью.'
      : 'Верх — натуральная кожа, подкладка — кожа, подошва — термопластичная резина. Чистить щёткой, защищать пропиткой для кожи.';
    $('#pp-stock').textContent = p.stock ? 'Есть в магазине на Тенишевой, 4 — можно примерить сегодня' : 'Под заказ: привезём в магазин за 2–3 дня';
    let color = p.colors[0][0]; let size = oneSize(p) ? p.sizes[0] : null;
    $('#pp-color').textContent = color;
    $('#pp-colors').innerHTML = p.colors.map((c, i) => `<button type="button" class="sw${i ? '' : ' on'}" data-color="${c[0]}" style="background:${c[1]}" aria-label="${c[0]}"></button>`).join('');
    $('#pp-sizes-wrap').hidden = oneSize(p);
    $('#pp-sizes').innerHTML = p.sizes.map((s) => `<button type="button" data-size="${s}"${p.out.includes(s) ? ' disabled title="Нет в наличии"' : ''}>${s}</button>`).join('');
    $('#pp-fav').dataset.fav = p.id; $('#pp-fav').classList.toggle('on', isFav(p.id));
    $('#pp-colors').addEventListener('click', (e) => {
      const b = e.target.closest('[data-color]'); if (!b) return;
      color = b.dataset.color; $('#pp-color').textContent = color;
      $$('#pp-colors .sw').forEach((x) => x.classList.toggle('on', x === b));
    });
    $('#pp-sizes').addEventListener('click', (e) => {
      const b = e.target.closest('[data-size]'); if (!b || b.disabled) return;
      size = b.dataset.size; $('#size-err').hidden = true;
      $$('#pp-sizes button').forEach((x) => x.classList.toggle('on', x === b));
    });
    $('#pp-add').addEventListener('click', () => {
      if (!size) { $('#size-err').hidden = false; return; }
      addToCart(p.id, String(size), color);
      toast(`«${p.name}»${oneSize(p) ? '' : `, размер ${size}`} — в корзине. <a href="korzina.html">Оформить заказ</a>`);
    });
    $('#similar').innerHTML = P.filter((x) => x.cat === p.cat && x.id !== p.id).slice(0, 4).map(card).join('');
  }

  // --- Корзина и оформление (без отправки) ---
  const DELIV = {
    pickup: { name: 'Самовывоз из магазина', price: 0, note: 'ул. Тенишевой, 4. Соберём заказ за 2 часа, можно примерить перед оплатой.' },
    courier: { name: 'Курьер по Смоленску', price: 300, free: 10000, note: 'На следующий день с 10:00 до 20:00. Бесплатно от 10 000 ₽.' },
    pvz: { name: 'Пункт выдачи по России', price: 390, note: '2–5 дней. Пункт выдачи выберете на карте при оформлении.' },
  };
  function initCart() {
    const form = $('#checkout');
    const delivCost = (sum) => { const d = DELIV[form.deliv.value]; return d.free && sum >= d.free ? 0 : d.price; };
    function draw() {
      const c = cart();
      $('#cart-empty').hidden = !!c.length; $('#cart-full').hidden = !c.length;
      if (!c.length) return;
      $('#cart-list').innerHTML = c.map((x, i) => {
        const p = byId(x.id);
        return `<div class="row"><a class="thumb" href="tovar.html?id=${p.id}">${photo(p, 300, 300)}</a>` +
          `<div class="info"><a href="tovar.html?id=${p.id}">${p.name}</a><span>${x.color}${x.size !== 'Один размер' ? `, размер ${x.size}` : ''}</span>` +
          `<div class="qty"><button type="button" data-q="-1" data-i="${i}" aria-label="Меньше">−</button><b>${x.qty}</b><button type="button" data-q="1" data-i="${i}" aria-label="Больше">+</button>` +
          `<button type="button" class="link" data-rm="${i}">Удалить</button></div></div><div class="sum">${rub(p.price * x.qty)}</div></div>`;
      }).join('');
      const sum = c.reduce((s, x) => s + byId(x.id).price * x.qty, 0);
      const n = c.reduce((s, x) => s + x.qty, 0);
      const d = delivCost(sum);
      $('#s-items').textContent = `Товары (${n})`; $('#s-sum').textContent = rub(sum);
      $('#s-deliv').textContent = d ? rub(d) : 'бесплатно';
      $('#s-total').textContent = rub(sum + d);
      $('#deliv-note').textContent = DELIV[form.deliv.value].note;
      $('#addr').hidden = form.deliv.value === 'pickup';
      form.address.required = form.deliv.value !== 'pickup';
      $('#submit').textContent = form.pay.value === 'card' ? `Перейти к оплате · ${rub(sum + d)}` : `Оформить заказ · ${rub(sum + d)}`;
    }
    $('#cart-list').addEventListener('click', (e) => {
      const c = cart(); const q = e.target.closest('[data-q]'); const rm = e.target.closest('[data-rm]');
      if (q) { const it = c[q.dataset.i]; it.qty = Math.max(1, it.qty + Number(q.dataset.q)); setCart(c); draw(); }
      if (rm) { c.splice(rm.dataset.rm, 1); setCart(c); draw(); }
    });
    form.addEventListener('change', draw);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const card = form.pay.value === 'card';
      const no = 1000 + (Date.now() % 9000);
      setCart([]); form.reset();
      $('#cart-full').hidden = true; $('#cart-empty').hidden = true;
      $('#done').hidden = false;
      $('#done-no').textContent = `№ ${no}`;
      $('#done-text').textContent = card
        ? 'На настоящем сайте здесь откроется страница оплаты картой, а после неё придёт чек и письмо с подтверждением.'
        : 'На настоящем сайте магазин получит заказ и позвонит вам, чтобы подтвердить его.';
      window.scrollTo(0, 0);
    });
    draw();
  }

  badges();
  const page = document.body.dataset.page;
  if (page === 'catalog') initCatalog();
  if (page === 'product') initProduct();
  if (page === 'cart') initCart();
})();
