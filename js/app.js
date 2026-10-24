'use strict';
/* Kado — cartes cadeaux, cashback & fidélité. Données 100 % locales (IndexedDB). */
(() => {
  const VERSION = '1.0.0';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const NS = 'http://www.w3.org/2000/svg';

  /* ---------- Icônes ---------- */
  const P = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    cart: '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2.5 3.5h3l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h8.2a1.5 1.5 0 0 0 1.5-1.1L21 8H6.2"/>',
    bell: '<path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    back: '<path d="m15 5-7 7 7 7"/>',
    edit: '<path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z"/><path d="m14.5 7.5 3 3"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    az: '<path d="M4 7h6M4 12h4M4 17h2"/><path d="M17 5v14m0 0-3-3m3 3 3-3"/>',
    amt: '<path d="M7 19V5m0 0L4 8m3-3 3 3"/><path d="M17 5v14m0 0-3-3m3 3 3-3"/>',
    scan: '<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/>',
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="m4 17 5-5 4 4 2-2 5 5"/>',
    x: '<path d="m6 6 12 12M18 6 6 18"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'
  };
  const ic = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n]}</svg>`;

  /* ---------- Réglages (localStorage, best effort) ---------- */
  const S = {
    get(k, d) { try { const v = localStorage.getItem('kado:' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('kado:' + k, JSON.stringify(v)); } catch { /* ignore */ } }
  };
  const alertDays = () => S.get('alertDays', 30);

  /* ---------- Thème : auto / clair / sombre ---------- */
  const themeMode = () => S.get('theme', 'auto');
  const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const isDark = () => { const m = themeMode(); return m === 'dark' || (m !== 'light' && !!(mq && mq.matches)); };
  function applyTheme() {
    const dark = isDark(), r = document.documentElement;
    r.setAttribute('data-theme', dark ? 'dark' : 'light'); r.setAttribute('data-mode', themeMode());
    const t = document.querySelector('meta[name=theme-color]'); if (t) t.setAttribute('content', dark ? '#141110' : '#EFEAE0');
  }
  if (mq && mq.addEventListener) mq.addEventListener('change', () => { if (themeMode() === 'auto') { applyTheme(); renderHome(); } });

  /* ---------- IndexedDB ---------- */
  let db = null;
  const openDB = () => new Promise(res => {
    try {
      const r = indexedDB.open('kado', 1);
      r.onupgradeneeded = () => {
        const d = r.result;
        if (!d.objectStoreNames.contains('cards')) d.createObjectStore('cards', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta', { keyPath: 'k' });
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => res(null);
      r.onblocked = () => res(null);
    } catch { res(null); }
  });
  const dbAll = n => new Promise(res => {
    if (!db) return res([]);
    const q = db.transaction(n).objectStore(n).getAll();
    q.onsuccess = () => res(q.result || []); q.onerror = () => res([]);
  });
  const dbPut = (n, v) => new Promise(res => {
    if (!db) return res();
    const t = db.transaction(n, 'readwrite'); t.objectStore(n).put(v);
    t.oncomplete = () => res(); t.onerror = () => { toast("Échec de l'enregistrement"); res(); };
  });
  const dbDel = (n, k) => new Promise(res => {
    if (!db) return res();
    const t = db.transaction(n, 'readwrite'); t.objectStore(n).delete(k);
    t.oncomplete = () => res(); t.onerror = () => res();
  });

  /* ---------- État ---------- */
  let cards = [];
  const ui = { sort: 'exp', archive: false, hero: 0, tab: 'cadeaux' };

  async function saveCard(c) {
    c.updatedAt = Date.now();
    const i = cards.findIndex(x => x.id === c.id);
    if (i >= 0) cards[i] = c; else cards.push(c);
    await dbPut('cards', c);
    refresh();
  }
  async function removeCard(id) {
    cards = cards.filter(c => c.id !== id);
    await dbDel('cards', id);
    refresh();
  }

  /* ---------- Utilitaires ---------- */
  const nf2 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const eur = n => nf2.format(n || 0) + ' €';
  const eurHero = n => '€' + nf2.format(n || 0);
  const pad = n => String(n).padStart(2, '0');
  const todayStr = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const d0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const dt = s => new Date(s + 'T00:00:00');
  const daysLeft = c => c.expiry ? Math.round((dt(c.expiry) - d0()) / 864e5) : null;
  const fmtDate = s => s ? dt(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const fmtMonth = s => dt(s).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
  const isLoy = c => c.kind === 'fidelite';
  const KIND = { cashback: 'Cashback', cadeau: 'Carte cadeau', fidelite: 'Fidélité' };
  const status = c => {
    if (c.archived) return 'archived';
    const dl = daysLeft(c);
    if (dl !== null && dl < 0) return 'expired';
    if (!isLoy(c) && c.balance < 0.005) return 'empty';
    return 'active';
  };
  const parseAmount = v => { const n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.')); return isFinite(n) ? Math.round(n * 100) / 100 : NaN; };

  /* ---------- Couleurs de marque (pastilles) ---------- */
  const BRANDS = [
    ['amazon', '#232F3E', '#FF9900'], ['galeries', '#B8152F', '#FFFFFF'], ['carrefour', '#0B4EA2', '#FFFFFF'],
    ['leroy', '#78BE20', '#14320A'], ['castorama', '#0A5BA8', '#FFD100'], ['nike', '#111111', '#FFFFFF'],
    ['decathlon', '#0082C3', '#FFFFFF'], ['fnac', '#E1A925', '#111111'], ['ikea', '#0058A3', '#FFDA1A'],
    ['sephora', '#000000', '#FFFFFF'], ['zalando', '#FF6900', '#FFFFFF'], ['auchan', '#D6001C', '#FFFFFF'],
    ['leclerc', '#0066B3', '#FFFFFF'], ['darty', '#E2001A', '#FFFFFF'], ['boulanger', '#F58220', '#FFFFFF']
  ];
  const PALETTE = [['#3B5B4E', '#CDEBDD'], ['#5A3E36', '#F2D9C9'], ['#2F3E5C', '#D3DDF5'], ['#6B4E71', '#EBD6F0'], ['#7A5C1E', '#F7E4B4'], ['#35514F', '#C9EFEA'], ['#7C3A3A', '#F6D3D3'], ['#44463A', '#E4E6C9']];
  function brandColor(name) {
    const n = (name || '').toLowerCase();
    for (const [k, bg, fg] of BRANDS) if (n.includes(k)) return { bg, fg };
    let h = 0; for (const ch of n) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const [bg, fg] = PALETTE[h % PALETTE.length]; return { bg, fg };
  }
  function initials(name) {
    const w = (name || '?').trim().split(/[\s'’-]+/).filter(Boolean);
    return (w.length > 1 ? w[0][0] + w[1][0] : (w[0] || '?')[0]).toUpperCase();
  }
  const logo = c => { const k = brandColor(c.brand); return `<span class="logo" style="background:${k.bg};color:${k.fg}">${esc(initials(c.brand))}</span>`; };

  /* ---------- Toast & confirmation ---------- */
  let toastT;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600);
  }
  function askConfirm(msg, ok = 'Confirmer', danger = true) {
    return new Promise(res => {
      const m = document.createElement('div');
      m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:70;display:grid;place-items:center;padding:24px';
      m.innerHTML = `<div class="block" style="max-width:360px;width:100%;margin:0"><p style="margin:0 0 16px;font-weight:700;font-size:16px;line-height:1.4">${esc(msg)}</p><div style="display:flex;gap:8px"><button class="btn ghost full" data-v="0">Annuler</button><button class="btn ${danger ? 'danger' : ''} full" data-v="1">${esc(ok)}</button></div></div>`;
      m.addEventListener('click', e => {
        const b = e.target.closest('[data-v]');
        if (b) { m.remove(); res(b.dataset.v === '1'); } else if (e.target === m) { m.remove(); res(false); }
      });
      document.body.append(m);
    });
  }

  /* ---------- Pages empilées (bouton Retour Android géré) ---------- */
  const pages = [];
  let ignorePop = 0;
  function openPage(html, cls = '') {
    const el = document.createElement('section');
    el.className = 'page ' + cls;
    el.innerHTML = html;
    $('#overlay-root').append(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
    pages.push(el);
    history.pushState({ kado: pages.length }, '');
    return el;
  }
  function closePage(viaPop) {
    const el = pages.pop(); if (!el) return;
    if (el._cleanup) try { el._cleanup(); } catch { /* ignore */ }
    el.classList.remove('in');
    setTimeout(() => el.remove(), 280);
    if (!viaPop) { ignorePop++; history.back(); }
  }
  window.addEventListener('popstate', () => {
    if (ignorePop > 0) { ignorePop--; return; }
    if (pages.length) closePage(true);
  });

  /* ---------- Accueil ---------- */
  function sorted(list) {
    const a = [...list];
    if (ui.sort === 'az') a.sort((x, y) => x.brand.localeCompare(y.brand, 'fr'));
    else if (ui.sort === 'exp') a.sort((x, y) => (x.expiry || '9999').localeCompare(y.expiry || '9999'));
    else if (ui.sort === 'amt') a.sort((x, y) => (isLoy(x) ? -1 : x.balance) < (isLoy(y) ? -1 : y.balance) ? 1 : -1);
    else a.sort((x, y) => (y.updatedAt || y.createdAt || 0) - (x.updatedAt || x.createdAt || 0));
    return a;
  }
  function rowHTML(c) {
    const st = status(c), dl = daysLeft(c), loy = isLoy(c);
    const soon = st === 'active' && dl !== null && dl <= alertDays();
    let exp = '';
    if (st === 'expired') exp = 'Expirée';
    else if (st === 'empty') exp = 'Épuisée';
    else if (c.expiry) exp = soon ? (dl === 0 ? "Expire aujourd'hui" : dl === 1 ? 'Expire demain' : 'Expire dans\u00A0' + dl + '\u00A0j') : 'Exp. ' + fmtMonth(c.expiry);
    const sub = [c.category || KIND[c.kind], exp].filter(Boolean).join(' · ');
    const pct = c.initial > 0 ? Math.max(0, Math.min(100, c.balance / c.initial * 100)) : 0;
    return `<button class="row ${soon ? 'soon' : ''} ${st !== 'active' ? 'off' : ''}" data-act="open" data-id="${c.id}">
      ${logo(c)}
      <span class="meta"><b>${esc(c.brand)}</b><small>${esc(sub)}</small></span>
      <span class="amt ${loy ? 'tag' : ''}">${loy ? 'Fidélité' : eur(c.balance)}</span>
      ${loy ? '' : `<i class="bar"><b style="width:${pct}%"></b></i>`}
    </button>`;
  }
  function stats() {
    const y = new Date().getFullYear();
    const act = cards.filter(c => status(c) === 'active' && !isLoy(c));
    const total = act.reduce((s, c) => s + c.balance, 0);
    const added = cards.filter(c => !isLoy(c) && new Date(c.createdAt || 0).getFullYear() === y).reduce((s, c) => s + (c.initial || 0), 0);
    let spent = 0, uses = 0;
    for (const c of cards) for (const h of c.history || []) if (new Date(h.date).getFullYear() === y) { spent += h.amount; uses++; }
    return { total, added, spent, uses };
  }
  function renderHome() {
    const st = stats();
    const gift = ui.tab !== 'fid';
    if (!gift && ui.sort === 'amt') ui.sort = 'az';
    const pool = cards.filter(c => gift ? !isLoy(c) : isLoy(c));
    const active = sorted(pool.filter(c => status(c) === 'active'));
    const arch = sorted(pool.filter(c => status(c) !== 'active'));
    const nGift = cards.filter(c => !isLoy(c) && status(c) === 'active').length;
    const nFid = cards.filter(c => isLoy(c) && status(c) === 'active').length;
    const soonSum = cards.filter(c => !isLoy(c) && status(c) === 'active' && daysLeft(c) !== null && daysLeft(c) <= alertDays()).reduce((s, c) => s + c.balance, 0);
    const alerts = computeAlerts().filter(a => a.kind === 'soon').length;
    const hero = ui.hero === 0
      ? `<div class="lbl">Cagnotte cadeaux</div><div class="big">${eurHero(st.total)}</div><div class="sub">${soonSum > 0.004 ? `dont ${eur(soonSum)} expirent sous ${alertDays()} jours` : `${nGift} carte${nGift > 1 ? 's' : ''} active${nGift > 1 ? 's' : ''}`}</div>`
      : `<div class="lbl">Dépensé cette année</div><div class="big">${eurHero(st.spent)}</div><div class="sub">${st.uses} utilisation${st.uses > 1 ? 's' : ''} · ${eur(st.added)} ajoutés</div>`;
    const chip = (k, label, icon) => `<button class="chip ${ui.sort === k ? 'on' : ''}" data-act="sort" data-k="${k}">${icon ? ic(icon) : ''}${label}</button>`;
    const chips = gift
      ? chip('exp', 'Expiration', 'clock') + chip('recent', 'Récentes') + chip('az', 'A–Z', 'az') + chip('amt', 'Montant', 'amt')
      : chip('az', 'A–Z', 'az') + chip('recent', 'Récentes') + chip('exp', 'Expiration', 'clock');
    const empty = gift
      ? `<div class="empty"><b>Aucune carte cadeau active</b>Appuie sur « Ajouter » pour importer un PDF de bons d'achat, scanner un code ou saisir une carte.</div>`
      : `<div class="empty"><b>Aucune carte de fidélité</b>Ajoute tes cartes de magasin avec « Ajouter », puis choisis le type « Fidélité ».</div>`;
    $('#app').innerHTML = `
      <header class="top">
        <button class="who" data-act="settings" aria-label="Réglages">
          <span class="avatar">K</span>
          <span><small>Bonjour</small><b>${esc(S.get('name', 'Toi'))}</b></span>
        </button>
        <div class="tools">
          <button class="bell" data-act="theme" aria-label="${isDark() ? 'Passer au thème clair' : 'Passer au thème sombre'}">${ic(isDark() ? 'sun' : 'moon')}</button>
          <button class="bell" data-act="alerts" aria-label="Alertes">${ic('bell')}${alerts ? '<span class="dot"></span>' : ''}</button>
        </div>
      </header>
      <section class="panel">
        <div class="hero">${hero}<button class="eur ${ui.hero ? 'on' : ''}" data-act="hero" aria-label="Basculer entre le solde et les dépenses de l'année">€</button></div>
        <div class="actions">
          <button data-act="add">${ic('plus')}Ajouter</button>
          <button data-act="search">${ic('search')}Rechercher</button>
          <button data-act="buy">${ic('cart')}Acheter</button>
        </div>
      </section>
      <div class="sec"><h2>Mes cartes</h2><span>${active.length} active${active.length > 1 ? 's' : ''}</span></div>
      <div class="seg tabs"><button class="${gift ? 'on' : ''}" data-act="tab" data-k="cadeaux">Cartes cadeaux · ${nGift}</button><button class="${gift ? '' : 'on'}" data-act="tab" data-k="fid">Fidélité · ${nFid}</button></div>
      <div class="chips">${chips}</div>
      <div class="list">${active.length ? active.map(rowHTML).join('') : empty}</div>
      ${arch.length ? `<button class="more" data-act="archive">${ui.archive ? 'Masquer' : 'Voir'} les cartes archivées, vides ou expirées (${arch.length})</button>` : ''}
      ${ui.archive ? `<div class="list">${arch.map(rowHTML).join('')}</div>` : ''}`;
  }
  function refresh() {
    renderHome();
    pages.forEach(p => p._render && p._render());
  }

  /* ---------- Alertes ---------- */
  function computeAlerts() {
    const days = alertDays(), out = [];
    for (const c of cards) {
      if (c.archived || !c.expiry) continue;
      const dl = daysLeft(c);
      if (!(isLoy(c) || c.balance >= 0.005)) continue;
      if (dl < 0) { if (!isLoy(c)) out.push({ c, dl, kind: 'lost' }); } else if (dl <= days) out.push({ c, dl, kind: 'soon' });
    }
    return out.sort((a, b) => a.dl - b.dl);
  }
  function openAlerts() {
    const el = openPage('');
    el._render = () => {
      const al = computeAlerts();
      el.innerHTML = `<div class="bar-top"><button class="round" data-act="back" aria-label="Retour">${ic('back')}</button><h1>Alertes</h1><span class="round ph"></span></div>
        <div class="block">${al.length ? al.map(a => `<button class="alert" data-act="open" data-id="${a.c.id}">${logo(a.c)}
          <span class="t"><b>${esc(a.c.brand)}</b><small>${isLoy(a.c) ? 'Carte de fidélité' : eur(a.c.balance)} · ${fmtDate(a.c.expiry)}</small></span>
          <span class="d ${a.kind === 'lost' ? 'bad' : ''}">${a.kind === 'lost' ? 'Expirée' : a.dl === 0 ? "Aujourd'hui" : a.dl === 1 ? 'Demain' : 'J-' + a.dl}</span></button>`).join('')
          : `<div class="empty" style="background:none;padding:18px 0"><b>Rien à signaler</b>Aucune carte n'expire dans les ${alertDays()} prochains jours.</div>`}</div>
        <p class="note">Les alertes couvrent les cartes avec un solde (ou de fidélité) dont la date de validité arrive dans les ${alertDays()} jours, et celles déjà expirées avec un solde restant. Le délai se règle dans les réglages.</p>`;
    };
    el._render();
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      if (b.dataset.act === 'back') closePage();
      if (b.dataset.act === 'open') openDetail(b.dataset.id);
    });
  }

  /* ---------- Codes-barres ---------- */
  const JB = { code_128: 'CODE128', ean_13: 'EAN13', ean_8: 'EAN8', code_39: 'CODE39', upc_a: 'UPC', upc_e: 'UPCE', itf: 'ITF', codabar: 'codabar', code_93: 'CODE128' };
  const FORMATS = [['code_128', 'Code 128'], ['qr_code', 'QR code'], ['ean_13', 'EAN-13'], ['ean_8', 'EAN-8'], ['code_39', 'Code 39'], ['upc_a', 'UPC-A'], ['itf', 'ITF']];
  function barcodeSVG(value, fmt, big) {
    const tryFmt = f => {
      const svg = document.createElementNS(NS, 'svg');
      JsBarcode(svg, value, { format: f, background: '#fff', lineColor: '#000', margin: 8, height: big ? 130 : 90, displayValue: true, font: 'Manrope, system-ui, sans-serif', fontOptions: '700', fontSize: big ? 22 : 16, textMargin: 4, width: 2 });
      const w = parseFloat(svg.getAttribute('width')), h = parseFloat(svg.getAttribute('height'));
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`); svg.removeAttribute('width'); svg.removeAttribute('height');
      return svg;
    };
    try { return tryFmt(JB[fmt] || 'CODE128'); } catch { /* checksum invalide, etc. */ }
    try { return tryFmt('CODE128'); } catch { return null; }
  }
  function qrImg(value) {
    try {
      const q = qrcode(0, 'M'); q.addData(value); q.make();
      const img = new Image(); img.className = 'qr'; img.alt = 'QR code'; img.src = q.createDataURL(8, 2); return img;
    } catch { return null; }
  }
  function codeNode(c, big, mode) {
    const v = c.code && c.code.value, f = (c.code && c.code.format) || 'code_128';
    if (mode !== 'image' && v) {
      if (f === 'qr_code') { const q = qrImg(v); if (q) return q; }
      else if (JB[f]) { const s = barcodeSVG(v, f, big); if (s) return s; }
    }
    if (c.image) { const img = new Image(); img.className = 'photo'; img.alt = 'Image du bon'; img.src = c.image; return img; }
    const d = document.createElement('div'); d.className = 'none';
    d.textContent = v ? `Format « ${f} » non reproductible : ajoute l'image d'origine du bon.` : "Aucun code enregistré. Modifie la carte pour en ajouter un.";
    return d;
  }
  function defaultMode(c) {
    const f = (c.code && c.code.format) || 'code_128';
    const ok = c.code && c.code.value && (f === 'qr_code' || JB[f]);
    return ok ? 'code' : (c.image ? 'image' : 'code');
  }

  /* ---------- Détail d'une carte ---------- */
  function storeUrl(brand) {
    const s = S.get('stores', []).find(x => x.brand.toLowerCase() === (brand || '').toLowerCase());
    return s ? s.url : '';
  }
  function openDetail(id) {
    const el = openPage('');
    el._mode = null; el._pin = false;
    el._render = () => {
      const c = cards.find(x => x.id === id);
      if (!c) { el.innerHTML = ''; if (pages.includes(el)) closePage(); return; }
      if (!el._mode) el._mode = defaultMode(c);
      const st = status(c), dl = daysLeft(c), loy = isLoy(c);
      let pill = '';
      if (st === 'archived') pill = '<span class="pill">Archivée</span>';
      else if (st === 'expired') pill = `<span class="pill bad">Expirée le ${fmtDate(c.expiry)}</span>`;
      else if (st === 'empty') pill = '<span class="pill bad">Épuisée</span>';
      else if (c.expiry) pill = `<span class="pill ${dl <= alertDays() ? 'warn' : ''}">${dl === 0 ? "Expire aujourd'hui" : dl === 1 ? 'Expire demain' : 'Expire dans ' + dl + ' jours'} · ${fmtDate(c.expiry)}</span>`;
      const pct = c.initial > 0 ? Math.max(0, Math.min(100, c.balance / c.initial * 100)) : 0;
      const hasImg = !!c.image, hasCode = !!(c.code && c.code.value);
      const canSpend = !loy && st === 'active';
      const url = storeUrl(c.brand);
      const hist = (c.history || []).slice().reverse();
      el.innerHTML = `
        <div class="bar-top"><button class="round" data-act="back" aria-label="Retour">${ic('back')}</button><h1>${esc(c.brand)}</h1><button class="round" data-act="edit" aria-label="Modifier">${ic('edit')}</button></div>
        <div class="balance compact">
          ${loy ? `<div class="row2">${logo(c)}<div class="mid"><div class="num" style="font-size:30px">Carte de fidélité</div></div></div>`
          : `<div class="row2">${logo(c)}<div class="mid"><div class="num">${eurHero(c.balance)}</div><div class="of">sur ${eur(c.initial)}</div></div></div><i class="bar"><b style="width:${pct}%"></b></i>`}
          ${pill}
        </div>
        ${(hasCode || hasImg) ? `<div class="block">
          ${hasCode && hasImg ? `<div class="seg"><button class="${el._mode === 'code' ? 'on' : ''}" data-act="mode" data-m="code">Code</button><button class="${el._mode === 'image' ? 'on' : ''}" data-act="mode" data-m="image">Image d'origine</button></div>` : ''}
          <div class="codebox" id="codebox" data-act="zoom"></div>
          <p class="hint">Touche le code pour l'agrandir</p></div>` : ''}
        ${canSpend ? `<div class="block"><h3>J'ai dépensé</h3>
          <div class="spend"><input id="amt" inputmode="decimal" placeholder="0,00" autocomplete="off"><button class="btn" data-act="spend">Déduire</button></div>
          <div class="quick"><button data-act="all">Tout utiliser (${eur(c.balance)})</button></div></div>` : ''}
        <div class="block"><h3>Détails</h3>
          <div class="kv"><span>Type</span><b>${KIND[c.kind]}${c.category ? ' · ' + esc(c.category) : ''}</b></div>
          ${c.number ? `<div class="kv"><span>N° de carte</span><b>${esc(c.number)}<button class="mini" data-act="copy" data-v="${esc(c.number)}">Copier</button></b></div>` : ''}
          ${c.pin ? `<div class="kv"><span>PIN</span><b>${el._pin ? esc(c.pin) : '••••'}<button class="mini" data-act="pin">${el._pin ? 'Masquer' : 'Voir'}</button><button class="mini" data-act="copy" data-v="${esc(c.pin)}">Copier</button></b></div>` : ''}
          ${c.expiry ? `<div class="kv"><span>Validité</span><b>${fmtDate(c.expiry)}</b></div>` : ''}
          ${c.notes ? `<div class="kv"><span>Notes</span><b style="font-weight:600;white-space:pre-wrap">${esc(c.notes)}</b></div>` : ''}
          ${url ? `<div class="kv"><span>Acheter / recharger</span><b><button class="mini" data-act="buyurl" data-u="${esc(url)}">Ouvrir le site</button></b></div>` : ''}
        </div>
        ${hist.length ? `<div class="block"><h3>Historique</h3>${hist.map(h => `<div class="hist"><div><b>−${eur(h.amount)}</b><small>${new Date(h.date).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</small></div><button class="undo" data-act="undo" data-h="${h.id}">Annuler</button></div>`).join('')}</div>` : ''}`;
      const box = $('#codebox', el);
      if (box) box.append(codeNode(c, false, el._mode));
    };
    el._render();
    el.addEventListener('click', async e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const c = cards.find(x => x.id === id); if (!c) return;
      switch (b.dataset.act) {
        case 'back': closePage(); break;
        case 'edit': formPage(c); break;
        case 'mode': el._mode = b.dataset.m; el._render(); break;
        case 'zoom': openCashier(c, el._mode); break;
        case 'pin': el._pin = !el._pin; el._render(); break;
        case 'copy': try { await navigator.clipboard.writeText(b.dataset.v); toast('Copié'); } catch { toast('Copie impossible'); } break;
        case 'buyurl': window.open(b.dataset.u, '_blank', 'noopener'); break;
        case 'all': { const i = $('#amt', el); i.value = String(c.balance).replace('.', ','); i.focus(); break; }
        case 'spend': {
          const v = parseAmount($('#amt', el).value);
          if (!(v > 0)) return toast('Saisis un montant');
          if (v > c.balance + 0.004) return toast('Montant supérieur au solde (' + eur(c.balance) + ')');
          c.balance = Math.max(0, Math.round((c.balance - v) * 100) / 100);
          (c.history = c.history || []).push({ id: uid(), date: new Date().toISOString(), amount: v });
          await saveCard(c);
          toast(c.balance < 0.005 ? 'Carte épuisée' : 'Solde restant : ' + eur(c.balance));
          break;
        }
        case 'undo': {
          const h = (c.history || []).find(x => x.id === b.dataset.h); if (!h) return;
          c.balance = Math.round((c.balance + h.amount) * 100) / 100;
          c.history = c.history.filter(x => x.id !== h.id);
          await saveCard(c); toast('Dépense annulée'); break;
        }
      }
    });
  }

  /* ---------- Plein écran « caisse » ---------- */
  function openCashier(c, mode) {
    const el = openPage('', 'white');
    el.innerHTML = `<div class="bar-top"><button class="round" style="background:#eee" data-act="back" aria-label="Fermer">${ic('x')}</button><h1>${esc(c.brand)}</h1><span class="round ph"></span></div>
      <div class="cashier"><div class="code"></div>${isLoy(c) ? '' : `<div class="bal">${eurHero(c.balance)}</div>`}
      ${c.number ? `<div style="color:#555;font-weight:700;letter-spacing:.04em;word-break:break-all;text-align:center">${esc(c.number)}</div>` : ''}</div>`;
    $('.code', el).append(codeNode(c, true, mode));
    el.addEventListener('click', e => { if (e.target.closest('[data-act="back"]')) closePage(); });
    let lock = null;
    if (navigator.wakeLock) navigator.wakeLock.request('screen').then(l => { lock = l; }).catch(() => {});
    el._cleanup = () => { if (lock) lock.release().catch(() => {}); };
  }

  /* ---------- Détection / import d'image ---------- */
  async function detectFrom(src) {
    if (!('BarcodeDetector' in window)) return null;
    try {
      const formats = await BarcodeDetector.getSupportedFormats();
      const r = await new BarcodeDetector({ formats }).detect(src);
      return r[0] ? { value: r[0].rawValue, format: r[0].format } : null;
    } catch { return null; }
  }
  async function importImage(file) {
    let bmp = null;
    try { bmp = await createImageBitmap(file); } catch { /* ignore */ }
    const det = bmp ? await detectFrom(bmp) : null;
    let dataUrl = '';
    if (bmp) {
      const k = Math.min(1, 1100 / Math.max(bmp.width, bmp.height));
      const cv = document.createElement('canvas'); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
      const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(bmp, 0, 0, cv.width, cv.height);
      dataUrl = cv.toDataURL('image/jpeg', 0.88);
    } else {
      dataUrl = await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => res(''); r.readAsDataURL(file); });
    }
    return { dataUrl, det };
  }

  /* ---------- Scanner caméra ---------- */
  async function openScanner(onResult) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return toast('Caméra indisponible');
    if (!('BarcodeDetector' in window)) return toast("Scan non pris en charge ici : importe une image ou saisis le code");
    const el = openPage(`<video playsinline muted></video><div class="frame"></div><button class="round x" data-act="back" aria-label="Fermer">${ic('x')}</button><div class="msg">Place le code dans le cadre</div>`, 'scan');
    el.addEventListener('click', e => { if (e.target.closest('[data-act="back"]')) closePage(); });
    let stop = false, stream = null;
    el._cleanup = () => { stop = true; if (stream) stream.getTracks().forEach(t => t.stop()); };
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      if (stop) { stream.getTracks().forEach(t => t.stop()); return; }
      const v = $('video', el); v.srcObject = stream; await v.play();
      const formats = await BarcodeDetector.getSupportedFormats();
      const det = new BarcodeDetector({ formats });
      const tick = async () => {
        if (stop) return;
        try {
          const r = await det.detect(v);
          if (r.length) { stop = true; if (navigator.vibrate) navigator.vibrate(60); closePage(); onResult({ value: r[0].rawValue, format: r[0].format }); return; }
        } catch { /* image pas prête */ }
        setTimeout(tick, 160);
      };
      tick();
    } catch {
      toast('Accès à la caméra refusé'); if (pages.includes(el)) closePage();
    }
  }

  /* ---------- Formulaire ajout / édition ---------- */
  function parseText(t) {
    const o = {};
    if (!t) return o;
    let m;
    if ((m = t.match(/(?:pin|code\s*secret|code)\s*[:=]?\s*(\d{3,8})\b/i))) o.pin = m[1];
    if ((m = t.match(/(\d{1,4}(?:[.,]\d{1,2})?)\s*(?:€|eur)/i))) o.amount = m[1].replace(',', '.');
    if ((m = t.match(/\b(\d{2})[\/.-](\d{2})[\/.-](20\d{2})\b/))) o.expiry = `${m[3]}-${m[2]}-${m[1]}`;
    if ((m = t.match(/(?:n[°o]|num[ée]ro|carte)\s*(?:de\s*carte)?\s*[:=]?\s*([0-9][0-9 -]{9,24})/i))) o.number = m[1].trim();
    return o;
  }
  function formPage(card, pre = {}) {
    const edit = !!card;
    const c = card ? JSON.parse(JSON.stringify(card)) : { id: uid(), kind: 'cadeau', brand: '', category: '', number: '', pin: '', initial: 0, balance: 0, expiry: '', notes: '', image: '', code: { value: '', format: 'code_128' }, history: [], createdAt: Date.now() };
    const extra = parseText(pre.text);
    if (!edit) {
      if (pre.text) c.notes = pre.text.slice(0, 600);
      if (extra.pin) c.pin = extra.pin;
      if (extra.number) c.number = extra.number;
      if (extra.expiry) c.expiry = extra.expiry;
      if (extra.amount) c.initial = c.balance = parseAmount(extra.amount);
    }
    const brands = [...new Set([...cards.map(x => x.brand), 'Amazon', 'Carrefour', 'Castorama', 'Leroy Merlin', 'Nike', 'Decathlon', 'Fnac', 'Galeries Lafayette', 'IKEA', 'Sephora', 'Zalando'])].sort((a, b) => a.localeCompare(b, 'fr'));
    const el = openPage(`
      <div class="bar-top"><button class="round" data-act="back" aria-label="Retour">${ic('back')}</button><h1>${edit ? 'Modifier la carte' : 'Nouvelle carte'}</h1><span class="round ph"></span></div>
      ${edit ? `<div class="srcs"><button class="src" data-act="scan">${ic('scan')}Scanner</button><button class="src" data-act="pick">${ic('image')}Importer une image</button></div>` : ''}
      <input type="file" id="file" accept="image/*" class="hidden">
      <div id="thumb"></div>
      <div class="seg" id="kind"></div>
      <label class="f"><span>Enseigne *</span><input id="brand" list="brands" autocomplete="off" placeholder="Carrefour, Leroy Merlin…"><datalist id="brands">${brands.map(b => `<option value="${esc(b)}">`).join('')}</datalist></label>
      <label class="f"><span>Catégorie</span><input id="cat" autocomplete="off" placeholder="Multi, Mode, Bricolage…"></label>
      <div id="money" class="two"></div>
      <label class="f"><span>Date de validité</span><input id="exp" type="date"></label>
      <div class="two"><label class="f"><span>N° de carte</span><input id="num" autocomplete="off" inputmode="text"></label><label class="f"><span>PIN</span><input id="pin" autocomplete="off" inputmode="numeric"></label></div>
      <div class="two"><label class="f"><span>Code (valeur)</span><input id="code" autocomplete="off"></label><label class="f"><span>Format</span><select id="fmt">${FORMATS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></label></div>
      <label class="f"><span>Notes</span><textarea id="notes"></textarea></label>
      <button class="btn full" data-act="save">${edit ? 'Enregistrer' : 'Ajouter la carte'}</button>
      ${edit ? `<div style="display:flex;gap:8px;margin-top:10px"><button class="btn ghost full" data-act="archive">${c.archived ? 'Désarchiver' : 'Archiver'}</button><button class="btn danger full" data-act="del">Supprimer</button></div>` : ''}
    `);
    const g = id => $('#' + id, el);
    const renderKind = () => {
      $('#kind', el).innerHTML = Object.entries(KIND).map(([k, l]) => `<button type="button" class="${c.kind === k ? 'on' : ''}" data-act="kind" data-k="${k}">${l}</button>`).join('');
      const money = $('#money', el);
      if (isLoy(c)) money.innerHTML = '';
      else money.innerHTML = edit
        ? `<label class="f"><span>Solde actuel (€)</span><input id="bal" inputmode="decimal"></label><label class="f"><span>Montant initial (€)</span><input id="ini" inputmode="decimal"></label>`
        : `<label class="f" style="grid-column:1/3"><span>Solde de la carte (€) *</span><input id="bal" inputmode="decimal" placeholder="0,00"></label>`;
      if (!isLoy(c)) { const b = g('bal'); if (b) b.value = c.balance ? String(c.balance).replace('.', ',') : ''; const i = g('ini'); if (i) i.value = c.initial ? String(c.initial).replace('.', ',') : ''; }
    };
    const renderThumb = () => {
      $('#thumb', el).innerHTML = c.image ? `<div class="thumb"><img src="${c.image}" alt=""><div>Image enregistrée avec la carte.${c.code.value ? '<br>Code lu : ' + esc(c.code.value) : ''}</div><button data-act="rmimg">Retirer</button></div>` : '';
    };
    const sync = () => { g('brand').value = c.brand; g('cat').value = c.category || ''; g('exp').value = c.expiry || ''; g('num').value = c.number || ''; g('pin').value = c.pin || ''; g('code').value = c.code.value || ''; { const f = c.code.format || 'code_128'; if (!FORMATS.some(x => x[0] === f)) g('fmt').insertAdjacentHTML('beforeend', `<option value="${esc(f)}">${esc(f)}</option>`); g('fmt').value = f; } g('notes').value = c.notes || ''; };
    const read = () => { c.brand = g('brand').value.trim(); c.category = g('cat').value.trim(); c.expiry = g('exp').value; c.number = g('num').value.trim(); c.pin = g('pin').value.trim(); c.code = { value: g('code').value.trim(), format: g('fmt').value }; c.notes = g('notes').value.trim(); };
    renderKind(); renderThumb(); sync();
    const applyDetected = det => {
      if (!det) return false;
      c.code = det; g('code').value = det.value;
      g('fmt').value = FORMATS.some(f => f[0] === det.format) ? det.format : 'code_128';
      if (!g('num').value) g('num').value = det.value;
      return true;
    };
    const handleFile = async f => {
      if (!f) return;
      toast('Lecture de l\'image…');
      const { dataUrl, det } = await importImage(f);
      c.image = dataUrl; renderThumb();
      let r = null;
      try { r = await KadoPDF.extractImage(f, m => toast(m)); } catch { /* ignore */ }
      read();
      const code = (r && r.code) || det;
      if (code && !c.code.value) c.code = code;
      const got = [];
      if (r) {
        if (r.brand && !c.brand) { c.brand = r.brand; got.push('enseigne'); }
        if (r.category && !c.category) c.category = r.category;
        if (r.number && !c.number) { c.number = r.number; got.push('numéro'); }
        if (r.pin && !c.pin) { c.pin = r.pin; got.push('PIN'); }
        if (r.expiry && !c.expiry) { c.expiry = r.expiry; got.push('validité'); }
        if (r.amount && !isLoy(c) && !c.initial && !c.balance) { c.initial = c.balance = r.amount; got.push('montant'); }
      }
      if (code && !c.number) c.number = code.value;
      renderKind(); sync(); renderThumb();
      if (code) got.unshift('code');
      toast(got.length ? 'Lu dans l\'image : ' + got.join(', ') + '. Vérifie les champs.' : (r && r.ocrFailed ? 'Texte illisible : saisis les champs à la main' : 'Rien de reconnu : saisis les champs à la main'));
    };
    if (pre.file) handleFile(pre.file);
    if (pre.code) { applyDetected(pre.code); toast('Code scanné : complète les informations'); }
    if (pre.file || pre.text) setTimeout(() => toast('Vérifie les champs préremplis'), 500);

    el.addEventListener('change', e => {
      if (e.target.id === 'file') handleFile(e.target.files[0]);
      if (e.target.id === 'pdfin' && e.target.files.length) { const fl = [...e.target.files]; e.target.value = ''; openPdfImport(fl, true); }
    });
    el.addEventListener('click', async e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      switch (b.dataset.act) {
        case 'back': closePage(); break;
        case 'pick': g('file').click(); break;
        case 'pdf': g('pdfin').click(); break;
        case 'scan': read(); openScanner(det => { applyDetected(det); toast('Code scanné'); }); break;
        case 'rmimg': c.image = ''; renderThumb(); break;
        case 'kind': read(); c.kind = b.dataset.k; renderKind(); break;
        case 'archive': c.archived = !c.archived; await saveCard(c); closePage(); toast(c.archived ? 'Carte archivée' : 'Carte désarchivée'); break;
        case 'del':
          if (await askConfirm(`Supprimer définitivement « ${c.brand} » ?`, 'Supprimer')) {
            await removeCard(c.id);
            while (pages.length) closePage();
            toast('Carte supprimée');
          }
          break;
        case 'save': {
          read();
          if (!c.brand) return toast("Indique l'enseigne");
          if (!isLoy(c)) {
            const bal = parseAmount(g('bal').value);
            if (!(bal >= 0)) return toast('Indique le solde');
            c.balance = bal;
            if (edit) { const ini = parseAmount(g('ini').value); c.initial = isFinite(ini) ? Math.max(ini, bal) : Math.max(c.initial, bal); }
            else c.initial = bal;
          } else { c.balance = 0; c.initial = 0; }
          await saveCard(c);
          closePage(); for (let i = 0; i < (pre.parents || 0); i++) closePage();
          toast(edit ? 'Carte mise à jour' : 'Carte ajoutée');
          break;
        }
      }
    });
    return el;
  }


  /* ---------- Import PDF : lecture automatique + vérification ---------- */
  function openPdfImport(files, closeParent) {
    const el = openPage(`<div class="bar-top"><button class="round" data-act="back" aria-label="Retour">${ic('back')}</button><h1>Import PDF</h1><span class="round ph"></span></div><div class="block"><p id="prog" style="margin:0;font-weight:700">Lecture du PDF…</p><p class="note" style="margin:8px 0 0">La lecture se fait sur ton téléphone : le fichier n'est envoyé nulle part.</p></div>`);
    let items = [];
    let warnings = [];
    const prog = m => { const p = $('#prog', el); if (p) p.textContent = m; };
    const norm = x => String(x || '').replace(/\D/g, '');
    const label = it => (it.code ? (FORMATS.find(f => f[0] === it.code.format) || [0, it.code.format])[1] : 'aucun code détecté');

    const render = () => {
      const n = items.filter(i => i.sel).length;
      el.innerHTML = `<div class="bar-top"><button class="round" data-act="back" aria-label="Retour">${ic('back')}</button><h1>${items.length} bon${items.length > 1 ? 's' : ''} détecté${items.length > 1 ? 's' : ''}</h1><span class="round ph"></span></div>
        ${warnings.map(w => `<div class="block warnbox">${esc(w)}</div>`).join('')}
        <p class="note">Vérifie les informations lues dans le PDF, corrige si besoin, puis ajoute les cartes.</p>
        ${items.map((it, i) => `<div class="block rv ${it.dup ? 'dup' : ''}" data-i="${i}">
          <label class="rvhead"><input type="checkbox" data-f="sel" ${it.sel ? 'checked' : ''}>${logo({ brand: it.brand || '?' })}<span class="t"><b>${esc(it.brand || 'Enseigne à choisir')}</b><small>${it.dup ? 'Déjà dans Kado · ' : ''}${files.length > 1 ? esc(it.file) + ' · ' : ''}page ${it.page} · ${esc(label(it))}</small></span></label>
          <div class="two"><label class="f"><span>Enseigne *</span><input data-f="brand" list="brands" value="${esc(it.brand)}" autocomplete="off"></label><label class="f"><span>Montant (€) *</span><input data-f="amount" inputmode="decimal" value="${it.amount != null ? String(it.amount).replace('.', ',') : ''}"></label></div>
          <div class="two"><label class="f"><span>Validité</span><input data-f="expiry" type="date" value="${esc(it.expiry)}"></label><label class="f"><span>PIN</span><input data-f="pin" value="${esc(it.pin)}" autocomplete="off"></label></div>
          <label class="f"><span>N° de carte</span><input data-f="number" value="${esc(it.number)}" autocomplete="off"></label>
          ${it.image ? `<div class="rvimg"><img src="${it.image}" alt="Code lu dans le PDF"></div>` : ''}
        </div>`).join('')}
        <datalist id="brands">${[...new Set([...cards.map(c => c.brand), ...KadoPDF.KNOWN.map(k => k[0])])].map(b => `<option value="${esc(b)}">`).join('')}</datalist>
        <button class="btn full" data-act="addall" ${n ? '' : 'disabled'}>Ajouter ${n} carte${n > 1 ? 's' : ''}</button>`;
    };

    el.addEventListener('input', e => {
      const f = e.target.dataset.f, blk = e.target.closest('.rv'); if (!f || !blk) return;
      const it = items[+blk.dataset.i];
      if (f === 'sel') { it.sel = e.target.checked; const n = items.filter(i => i.sel).length; const b = $('[data-act="addall"]', el); b.textContent = `Ajouter ${n} carte${n > 1 ? 's' : ''}`; b.disabled = !n; return; }
      it[f] = e.target.value;
      if (f === 'brand') { const b = $('.rvhead b', blk); if (b) b.textContent = e.target.value || 'Enseigne à choisir'; }
    });
    el.addEventListener('change', e => { if (e.target.dataset.f === 'sel') e.target.dispatchEvent(new Event('input', { bubbles: true })); });
    el.addEventListener('click', async e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      if (b.dataset.act === 'back') closePage();
      if (b.dataset.act === 'addall') {
        const sel = items.filter(i => i.sel);
        for (const it of sel) {
          const amount = parseAmount(it.amount);
          if (!it.brand.trim() || !(amount > 0)) {
            toast(!it.brand.trim() ? "Indique l'enseigne de chaque carte cochée" : 'Indique le montant de chaque carte cochée');
            const blk = $(`.rv[data-i="${items.indexOf(it)}"]`, el); if (blk) blk.scrollIntoView({ block: 'center', behavior: 'smooth' });
            return;
          }
          it._amount = amount;
        }
        b.disabled = true;
        let k = 0;
        for (const it of sel) {
          await saveCard({
            id: uid(), kind: 'cadeau', brand: it.brand.trim(), category: it.category || '', number: it.number.trim(), pin: (it.pin || '').trim(),
            initial: it._amount, balance: it._amount, expiry: it.expiry || '', notes: '', image: it.image || '',
            code: it.code || { value: norm(it.number), format: 'code_128' }, history: [], createdAt: Date.now() + k++
          });
          KadoPDF.rememberBin(norm(it.number), it.brand.trim());
        }
        closePage(); for (let i = 0; i < (+closeParent || 0); i++) closePage();
        toast(`${sel.length} carte${sel.length > 1 ? 's' : ''} ajoutée${sel.length > 1 ? 's' : ''}`);
      }
    });

    (async () => {
      try {
        for (let fi = 0; fi < files.length; fi++) {
          const r = await KadoPDF.extract(files[fi], m => prog((files.length > 1 ? `Fichier ${fi + 1}/${files.length} : ` : '') + m));
          warnings.push(...r.warnings.map(w => (files.length > 1 ? files[fi].name + ' : ' : '') + w));
          items.push(...r.cards);
        }
        for (const it of items) {
          it.dup = !!it.number && cards.some(c => norm(c.number) === norm(it.number));
          it.sel = !it.dup;
          it.amount = it.amount != null ? it.amount : '';
        }
        if (!items.length) {
          el.innerHTML = `<div class="bar-top"><button class="round" data-act="back" aria-label="Retour">${ic('back')}</button><h1>Import PDF</h1><span class="round ph"></span></div>
            <div class="block"><b>Aucun bon reconnu</b><p class="note" style="margin:8px 0 0">${warnings.map(esc).join('<br>')}<br>Tu peux ajouter la carte à la main ou depuis une capture d'écran.</p></div>`;
          return;
        }
        render();
      } catch (err) {
        if (!pages.includes(el)) return;
        el.innerHTML = `<div class="bar-top"><button class="round" data-act="back" aria-label="Retour">${ic('back')}</button><h1>Import PDF</h1><span class="round ph"></span></div>
          <div class="block"><b>Lecture impossible</b><p class="note" style="margin:8px 0 0">Ce fichier n'a pas pu être lu (${esc(err && err.message || 'erreur')}). Vérifie que c'est bien un PDF, ou réessaie en ligne si c'est la première utilisation.</p></div>`;
      }
    })();
  }


  /* ---------- Menu « Ajouter » ---------- */
  function openAddMenu() {
    const opt = (k, icon, t, s) => `<button class="opt" data-act="${k}"><span class="oi">${ic(icon)}</span><span class="ot"><b>${t}</b><small>${s}</small></span></button>`;
    const el = openPage(`<div class="bar-top"><button class="round" data-act="back" aria-label="Retour">${ic('back')}</button><h1>Ajouter une carte</h1><span class="round ph"></span></div>
      <div class="opts">
        ${opt('pdf', 'file', 'Importer un PDF', "Bons d'achat reçus par mail : tout est rempli automatiquement")}
        ${opt('scan', 'scan', 'Scanner un code', 'Code-barres ou QR code, sur une carte ou un écran')}
        ${opt('img', 'image', 'Importer une image', "Capture d'écran d'un bon ou d'une carte")}
        ${opt('manual', 'edit', 'Saisir à la main', 'Enseigne, solde, validité, numéro…')}
      </div>
      <input type="file" id="pdfin" accept="application/pdf,.pdf" multiple class="hidden">
      <input type="file" id="imgin" accept="image/*" class="hidden">`);
    el.addEventListener('change', e => {
      const t = e.target;
      if (t.id === 'pdfin' && t.files.length) { const fl = [...t.files]; t.value = ''; openPdfImport(fl, 1); }
      if (t.id === 'imgin' && t.files.length) { const f = t.files[0]; t.value = ''; formPage(null, { file: f, parents: 1 }); }
    });
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      switch (b.dataset.act) {
        case 'back': closePage(); break;
        case 'pdf': $('#pdfin', el).click(); break;
        case 'img': $('#imgin', el).click(); break;
        case 'manual': formPage(null, { parents: 1 }); break;
        case 'scan': openScanner(det => setTimeout(() => formPage(null, { code: det, parents: 1 }), 350)); break;
      }
    });
  }

  /* ---------- Recherche ---------- */
  function openSearch() {
    const el = openPage(`<div class="bar-top"><button class="round" data-act="back" aria-label="Retour">${ic('back')}</button><h1>Rechercher</h1><span class="round ph"></span></div>
      <input class="srch" id="q" placeholder="Enseigne, numéro, notes…" autocomplete="off"><div class="chips in-page" id="cats"></div><div class="list" id="res"></div>`);
    el._cat = '';
    const run = () => {
      const q = $('#q', el).value.trim().toLowerCase();
      const cats = [...new Set(cards.map(c => c.category).filter(Boolean))].sort((x, y) => x.localeCompare(y, 'fr'));
      if (el._cat && !cats.includes(el._cat)) el._cat = '';
      $('#cats', el).innerHTML = cats.length ? ['', ...cats].map(k => `<button class="chip ${el._cat === k ? 'on' : ''}" data-act="cat" data-k="${esc(k)}">${k ? esc(k) : 'Tout'}</button>`).join('') : '';
      const hit = sorted(cards).filter(c => (!el._cat || c.category === el._cat) && (!q || [c.brand, c.category, c.number, KIND[c.kind], c.notes].join(' ').toLowerCase().includes(q)));
      $('#res', el).innerHTML = hit.length ? hit.map(rowHTML).join('') : '<div class="empty"><b>Aucun résultat</b>Essaie un autre mot ou une autre catégorie.</div>';
    };
    el._render = run; run();
    el.addEventListener('input', e => { if (e.target.id === 'q') run(); });
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      if (b.dataset.act === 'back') closePage();
      if (b.dataset.act === 'open') openDetail(b.dataset.id);
      if (b.dataset.act === 'cat') { el._cat = b.dataset.k; run(); }
    });
    setTimeout(() => $('#q', el).focus(), 320);
  }

  /* ---------- Acheter : pages d'achat par enseigne ---------- */
  function normUrl(u) { u = (u || '').trim(); if (!u) return ''; return /^https?:\/\//i.test(u) ? u : 'https://' + u; }
  function openBuy() {
    const el = openPage('');
    el._render = () => {
      const st = S.get('stores', []);
      el.innerHTML = `<div class="bar-top"><button class="round" data-act="back" aria-label="Retour">${ic('back')}</button><h1>Acheter une carte</h1><span class="round ph"></span></div>
        <div class="block stores"><h3>Mes enseignes</h3>
          ${st.length ? st.map((s, i) => { const k = brandColor(s.brand); return `<div class="st"><span class="logo" style="background:${k.bg};color:${k.fg};width:44px;height:44px;font-size:17px;border-radius:13px">${esc(initials(s.brand))}</span><div class="t"><b>${esc(s.brand)}</b><small>${esc(s.url)}</small></div><button class="btn sm" data-act="go" data-u="${esc(s.url)}">Acheter</button><button class="round" style="width:40px;height:40px" data-act="rm" data-i="${i}" aria-label="Supprimer">${ic('x')}</button></div>`; }).join('')
          : '<div style="color:var(--ink-2);font-size:14px;line-height:1.5">Enregistre ici la page d\'achat des cartes cadeaux ou cashback de tes enseignes pour les ouvrir en un appui.</div>'}
        </div>
        ${(() => { const have = new Set(st.map(s => s.brand.toLowerCase())); const sg = [...new Set(cards.map(c => c.brand))].filter(b => !have.has(b.toLowerCase())); return sg.length ? `<div class="block"><h3>Enseignes de tes cartes</h3><div class="quick" style="margin-top:0">${sg.map(b => `<button data-act="sugg" data-b="${esc(b)}">+ ${esc(b)}</button>`).join('')}</div></div>` : ''; })()}
        <div class="block"><h3>Ajouter une enseigne</h3>
          <label class="f"><span>Enseigne</span><input id="sb" autocomplete="off" placeholder="Leroy Merlin"></label>
          <label class="f"><span>Lien de la page d'achat</span><input id="su" type="url" autocomplete="off" placeholder="https://…"></label>
          <button class="btn full" data-act="addstore">Enregistrer</button></div>
        <p class="note">Plus tard, Kado pourra te prévenir quand tu passes près d'un magasin dont tu as une carte ou un cashback disponible. Cette partie arrive dans une prochaine version.</p>`;
    };
    el._render();
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const st = S.get('stores', []);
      switch (b.dataset.act) {
        case 'back': closePage(); break;
        case 'go': window.open(b.dataset.u, '_blank', 'noopener'); break;
        case 'sugg': $('#sb', el).value = b.dataset.b; $('#su', el).focus(); break;
        case 'rm': st.splice(+b.dataset.i, 1); S.set('stores', st); el._render(); break;
        case 'addstore': {
          const brand = $('#sb', el).value.trim(), url = normUrl($('#su', el).value);
          if (!brand || !url) return toast('Indique le nom et le lien');
          st.push({ brand, url }); S.set('stores', st); el._render(); toast('Enseigne enregistrée'); refresh(); break;
        }
      }
    });
  }

  /* ---------- Réglages & sauvegarde ---------- */
  function notifState() { return !('Notification' in window) ? 'indispo' : Notification.permission; }
  async function enableReminders() {
    if (!('Notification' in window)) return toast('Notifications non prises en charge');
    const p = await Notification.requestPermission();
    if (p !== 'granted') return toast('Notifications refusées');
    await registerPeriodic();
    toast('Rappels activés'); notifyIfNeeded(true);
  }
  async function registerPeriodic() {
    try {
      const reg = await navigator.serviceWorker.ready;
      if ('periodicSync' in reg) await reg.periodicSync.register('kado-expiry', { minInterval: 12 * 3600 * 1000 });
    } catch { /* non disponible */ }
  }
  async function notifyIfNeeded(force) {
    if (notifState() !== 'granted') return;
    const al = computeAlerts().filter(a => a.kind === 'soon');
    if (!al.length) return;
    if (!force && S.get('lastNotif', '') === todayStr()) return;
    const body = al.length === 1 ? `${al[0].c.brand} expire ${al[0].dl === 0 ? "aujourd'hui" : 'dans ' + al[0].dl + ' j'}.` : `${al.length} cartes arrivent bientôt à expiration.`;
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification('Kado', { body, icon: './icons/icon-192.png', badge: './icons/icon-192.png', tag: 'kado-expiry' });
      S.set('lastNotif', todayStr());
    } catch { /* ignore */ }
  }
  async function exportData() {
    const data = { app: 'kado', version: 1, exportedAt: new Date().toISOString(), cards, stores: S.get('stores', []), settings: { name: S.get('name', 'Toi'), alertDays: alertDays() } };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `kado-sauvegarde-${todayStr()}.json`;
    document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    S.set('lastBackup', todayStr()); toast('Sauvegarde exportée');
  }
  async function importData(file) {
    try {
      const d = JSON.parse(await file.text());
      if (!d || d.app !== 'kado' || !Array.isArray(d.cards)) throw new Error('format');
      for (const c of d.cards) if (c && c.id) { const i = cards.findIndex(x => x.id === c.id); if (i >= 0) cards[i] = c; else cards.push(c); await dbPut('cards', c); }
      if (Array.isArray(d.stores)) { const cur = S.get('stores', []); for (const s of d.stores) if (!cur.some(x => x.brand === s.brand && x.url === s.url)) cur.push(s); S.set('stores', cur); }
      if (d.settings) { if (d.settings.name) S.set('name', d.settings.name); if (d.settings.alertDays) setAlertDays(d.settings.alertDays); }
      refresh(); toast(`${d.cards.length} carte(s) importée(s)`);
    } catch { toast('Fichier de sauvegarde invalide'); }
  }
  function setAlertDays(n) { S.set('alertDays', n); dbPut('meta', { k: 'alertDays', v: n }); }
  async function persistState() { try { return navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : false; } catch { return false; } }
  function openSettings() {
    const el = openPage('');
    el._render = async () => {
      const ns = notifState(), pers = await persistState();
      el.innerHTML = `<div class="bar-top"><button class="round" data-act="back" aria-label="Retour">${ic('back')}</button><h1>Réglages</h1><span class="round ph"></span></div>
        <div class="block"><h3>Apparence</h3><div class="seg" style="margin:0">${[['auto', 'Auto'], ['light', 'Clair'], ['dark', 'Sombre']].map(([k, l]) => `<button class="${themeMode() === k ? 'on' : ''}" data-act="thememode" data-m="${k}">${l}</button>`).join('')}</div><p class="note" style="margin:10px 0 0">Auto suit le thème de ton téléphone.</p></div>
        <div class="block"><label class="f"><span>Prénom affiché</span><input id="nm" value="${esc(S.get('name', 'Toi'))}" autocomplete="off"></label>
          <label class="f" style="margin:0"><span>Alerter avant l'expiration</span><select id="ad">${[7, 15, 30, 60, 90].map(n => `<option value="${n}" ${alertDays() === n ? 'selected' : ''}>${n} jours avant</option>`).join('')}</select></label></div>
        <div class="block"><h3>Rappels</h3>
          <p class="note" style="margin:0 0 12px">${ns === 'granted' ? 'Les rappels sont activés. Tu es prévenu à l\'ouverture de Kado, et en arrière-plan quand Android le permet (appli installée).' : ns === 'denied' ? 'Les notifications sont bloquées pour Kado : autorise-les dans les réglages du site dans Chrome.' : ns === 'indispo' ? 'Les notifications ne sont pas disponibles sur ce navigateur.' : 'Active les notifications pour être prévenu avant qu\'une carte n\'expire.'}</p>
          ${ns === 'default' ? '<button class="btn full" data-act="notif">Activer les rappels</button>' : ''}</div>
        <div class="block"><h3>Données</h3>
          <p class="note" style="margin:0 0 12px">Tout reste sur ce téléphone. Exporte régulièrement une sauvegarde pour ne rien perdre en cas de changement de téléphone ou d'effacement des données du navigateur.${S.get('lastBackup', '') ? ' Dernière sauvegarde : ' + fmtDate(S.get('lastBackup', '')) + '.' : ''}</p>
          <div style="display:flex;gap:8px"><button class="btn full" data-act="export">Exporter</button><button class="btn ghost full" data-act="import">Importer</button></div>
          <input type="file" id="imp" accept="application/json,.json" class="hidden">
          <p class="note" style="margin:12px 0 0">Stockage protégé : ${pers ? 'oui' : 'non'}${pers ? '' : ' (installe Kado sur l\'écran d\'accueil pour le renforcer).'}</p></div>
        <p class="note" style="text-align:center">Kado ${VERSION}</p>`;
    };
    el._render();
    el.addEventListener('input', e => { if (e.target.id === 'nm') { S.set('name', e.target.value.trim() || 'Toi'); renderHome(); } });
    el.addEventListener('change', e => {
      if (e.target.id === 'ad') { setAlertDays(+e.target.value); refresh(); }
      if (e.target.id === 'imp' && e.target.files[0]) importData(e.target.files[0]);
    });
    el.addEventListener('click', async e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      if (b.dataset.act === 'back') closePage();
      if (b.dataset.act === 'thememode') { S.set('theme', b.dataset.m); applyTheme(); renderHome(); el._render(); }
      if (b.dataset.act === 'notif') { await enableReminders(); el._render(); }
      if (b.dataset.act === 'export') exportData();
      if (b.dataset.act === 'import') $('#imp', el).click();
    });
  }

  /* ---------- Événements de l'accueil ---------- */
  $('#app').addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    switch (b.dataset.act) {
      case 'add': openAddMenu(); break;
      case 'theme': S.set('theme', isDark() ? 'light' : 'dark'); applyTheme(); renderHome(); toast(isDark() ? 'Thème sombre' : 'Thème clair'); break;
      case 'tab': ui.tab = b.dataset.k; renderHome(); break;
      case 'search': openSearch(); break;
      case 'buy': openBuy(); break;
      case 'alerts': openAlerts(); break;
      case 'settings': openSettings(); break;
      case 'hero': ui.hero = ui.hero ? 0 : 1; renderHome(); break;
      case 'sort': ui.sort = b.dataset.k; renderHome(); break;
      case 'archive': ui.archive = !ui.archive; renderHome(); break;
      case 'open': openDetail(b.dataset.id); break;
    }
  });
  // « Retour » depuis l'accueil du détail déclenché par une alerte ou une recherche : empile simplement.
  document.addEventListener('click', e => {
    const b = e.target.closest('#overlay-root [data-act="open"]'); // géré dans chaque page
    void b;
  });

  /* ---------- Partage Android → Kado ---------- */
  async function handleShare() {
    const p = new URLSearchParams(location.search);
    if (!p.has('share')) return;
    const n = +p.get('share') || 0;
    const files = []; let text = '';
    try {
      const cache = await caches.open('kado-share');
      for (let i = 0; i < n; i++) {
        const r = await cache.match('./shared-' + i); if (!r) continue;
        const type = r.headers.get('Content-Type') || 'application/octet-stream';
        files.push(new File([await r.blob()], `partage-${i + 1}${/pdf/.test(type) ? '.pdf' : ''}`, { type }));
      }
      const rt = await cache.match('./shared-text'); if (rt) text = await rt.text();
      for (const k of await cache.keys()) await cache.delete(k);
    } catch { /* ignore */ }
    history.replaceState(null, '', location.pathname);
    const pdfs = files.filter(f => /pdf/i.test(f.type) || /\.pdf$/i.test(f.name));
    if (pdfs.length) openPdfImport(pdfs, false);
    else formPage(null, { file: files[0] || null, text });
  }

  /* ---------- Démarrage ---------- */
  async function init() {
    applyTheme();
    db = await openDB();
    if (!db) toast('Stockage indisponible : les cartes ne seront pas conservées');
    cards = await dbAll('cards');
    dbPut('meta', { k: 'alertDays', v: alertDays() });
    renderHome();
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch { /* ignore */ }
    if ('serviceWorker' in navigator) {
      try { await navigator.serviceWorker.register('./sw.js'); } catch { /* http / file */ }
    }
    handleShare();
    notifyIfNeeded(false);
    if (notifState() === 'granted') registerPeriodic();
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { renderHome(); notifyIfNeeded(false); } });
    window.__kado = { get cards() { return cards; }, saveCard, openDetail, formPage };
  }
  init();
})();
