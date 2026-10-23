'use strict';
/* Kado — import de bons d'achat / cartes cadeaux au format PDF.
   Tout se passe sur le téléphone : PDF.js lit texte + rendu, ZXing décode les codes-barres. */
(() => {
  const BASE = document.baseURI;
  const url = p => new URL(p, BASE).href;

  /* ---------- Chargement paresseux des librairies ---------- */
  let pdfjsP = null, zxP = null;
  const loadPdfjs = () => pdfjsP || (pdfjsP = import(url('vendor/pdfjs/pdf.min.js')).then(m => {
    m.GlobalWorkerOptions.workerSrc = url('vendor/pdfjs/pdf.worker.min.js');
    return m;
  }));
  const loadZX = () => zxP || (zxP = new Promise((res, rej) => {
    const ready = () => {
      window.ZXingWASM.setZXingModuleOverrides({ locateFile: (path, prefix) => path.endsWith('.wasm') ? url('vendor/zxing/zxing_reader.wasm') : prefix + path });
      res(window.ZXingWASM);
    };
    if (window.ZXingWASM) return ready();
    const s = document.createElement('script');
    s.src = url('vendor/zxing/reader.iife.js'); s.onload = ready; s.onerror = () => rej(new Error('zxing'));
    document.head.append(s);
  }));

  /* ---------- Connaissances (enseignes, préfixes) ---------- */
  const KNOWN = [
    ['IKEA', 'Maison'], ['Leroy Merlin', 'Bricolage'], ['Castorama', 'Bricolage'], ['Brico Dépôt', 'Bricolage'], ['Bricorama', 'Bricolage'],
    ['Carrefour', 'Courses'], ['Auchan', 'Courses'], ['Leclerc', 'Courses'], ['Decathlon', 'Sport'], ['Intersport', 'Sport'], ['Nike', 'Sport'],
    ['Amazon', 'Multi'], ['Cdiscount', 'Multi'], ['Fnac', 'Culture'], ['Cultura', 'Culture'], ['Darty', 'High-tech'], ['Boulanger', 'High-tech'],
    ['Sephora', 'Beauté'], ['Zalando', 'Mode'], ['Kiabi', 'Mode'], ['Galeries Lafayette', 'Mode'], ['Maisons du Monde', 'Maison'], ['Conforama', 'Maison'],
    ['Truffaut', 'Jardin'], ['Botanic', 'Jardin'], ['Jardiland', 'Jardin']
  ];
  const SEED_BINS = { '503200': 'Carrefour', '627598': 'IKEA', '945001': 'Leroy Merlin', '700001': 'Decathlon' };
  const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const canon = name => { const n = norm(name).trim(); const k = KNOWN.find(([b]) => norm(b) === n); return k ? k[0] : null; };
  const categoryOf = brand => { const k = KNOWN.find(([b]) => b === brand); return k ? k[1] : ''; };

  const FMT = {
    Code128: 'code_128', QRCode: 'qr_code', MicroQRCode: 'qr_code', EAN13: 'ean_13', 'EAN-13': 'ean_13', EAN8: 'ean_8', 'EAN-8': 'ean_8',
    Code39: 'code_39', Code93: 'code_93', ITF: 'itf', UPCA: 'upc_a', 'UPC-A': 'upc_a', UPCE: 'upc_e', Codabar: 'codabar',
    DataMatrix: 'data_matrix', Aztec: 'aztec', PDF417: 'pdf417'
  };

  /* ---------- Lignes de texte (positions en pixels du rendu) ---------- */
  function toLines(items) {
    items.sort((a, b) => a.y - b.y || a.x - b.x);
    const lines = [];
    for (const it of items) {
      const top = it.y - it.h, bot = it.y;
      let L = lines.find(l => Math.min(bot, l.bot) - Math.max(top, l.top) > 0.45 * Math.min(it.h, l.bot - l.top));
      if (!L) { L = { items: [], top, bot }; lines.push(L); }
      L.items.push(it);
    }
    for (const L of lines) {
      L.items.sort((a, b) => a.x - b.x);
      let t = '', prev = null;
      for (const it of L.items) {
        if (prev && it.x - (prev.x + prev.w) > 0.25 * Math.max(it.h, prev.h)) t += ' ';
        t += it.s; prev = it;
      }
      L.text = t;
      L.x = L.items[0].x;
      L.y = L.bot;
      L.cy = (L.top + L.bot) / 2;
    }
    return lines;
  }

  const isoDate = (d, m, y) => {
    const dd = +d, mm = +m, yy = +y;
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return '';
    return `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  };
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  /* ---------- Analyse d'une page ---------- */
  function parsePage(lines, items) {
    const numbers = [], amounts = [], dates = [], pinsL = [], pinsU = [];
    // Numéros : on regarde élément par élément pour garder la position
    for (const it of items) {
      let s = it.s.replace(/^.*?[:：]\s*/, m => /\d/.test(m) ? '' : m); // retire « Numéro de carte : »
      s = s.trim();
      let m = s.match(/(?<!\d)(\d{12,25})(?!\d)/);
      let digits = m ? m[1] : '';
      if (!digits && /^(?:\d[ -]?){11,24}\d$/.test(s)) digits = s.replace(/\D/g, '');
      if (digits && !numbers.some(n => n.digits === digits)) numbers.push({ digits, x: it.x + it.w / 2, y: it.y - it.h / 2 });
      if (/^\d{4,8}$/.test(s) && s !== digits) pinsU.push({ v: s, x: it.x + it.w / 2, y: it.y - it.h / 2 });
    }
    for (const L of lines) {
      const t = L.text, pt = { x: L.x, y: L.cy };
      const used = [];
      for (const m of t.matchAll(/(\d{1,4})\s?€(\d{2})(?![\d\/.-])/g)) { amounts.push({ v: parseFloat(m[1] + '.' + m[2]), ...pt }); used.push(m.index); }
      for (const m of t.matchAll(/(\d{1,4}(?:[.,]\d{1,2})?)\s*(?:€|eur\b)/gi)) {
        if (used.some(i => Math.abs(i - m.index) < 3)) continue;
        const v = parseFloat(m[1].replace(',', '.'));
        if (v >= 1 && v <= 5000) amounts.push({ v, ...pt });
      }
      for (const m of t.matchAll(/(?<!\d)(\d{2})[\/.-](\d{2})[\/.-](20\d{2})(?!\d)/g)) { const d = isoDate(m[1], m[2], m[3]); if (d) dates.push({ v: d, ...pt }); }
      for (const m of t.matchAll(/(?:code\s*)?pin\s*[:：]?\s*(\d{3,8})(?!\d)/gi)) pinsL.push({ v: m[1], ...pt });
    }
    return { numbers, amounts, dates, pinsL, pinsU };
  }

  function nearestAssign(tokens, anchors) {
    // chaque jeton est rattaché à l'ancre (numéro de carte) la plus proche
    const per = anchors.map(() => []);
    for (const t of tokens) {
      let bi = 0, bd = Infinity;
      anchors.forEach((a, i) => { const d = dist(t, a); if (d < bd) { bd = d; bi = i; } });
      per[bi].push({ ...t, d: bd });
    }
    return per.map(l => l.sort((a, b) => a.d - b.d)[0] || null);
  }

  /* ---------- Extraction principale ---------- */
  async function extract(file, onProgress) {
    const say = m => { if (onProgress) onProgress(m); };
    say('Chargement des outils de lecture…');
    const [pdfjs, ZX] = await Promise.all([loadPdfjs(), loadZX()]);
    const data = new Uint8Array(await file.arrayBuffer());
    const doc = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;
    const cards = [], warnings = [];
    let fullText = '';
    const rawItems = [];
    const SCALE = 2.2;

    for (let p = 1; p <= doc.numPages; p++) {
      say(`Lecture de la page ${p} sur ${doc.numPages}…`);
      const page = await doc.getPage(p);
      const vp = page.getViewport({ scale: SCALE });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(vp.width); canvas.height = Math.round(vp.height);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;

      const tc = await page.getTextContent();
      const items = tc.items.filter(i => i.str && i.str.trim()).map(i => {
        const [x, y] = vp.convertToViewportPoint(i.transform[4], i.transform[5]);
        const h = Math.max(4, (i.height || Math.abs(i.transform[3]) || 10) * SCALE);
        return { s: i.str.trim(), x, y, w: (i.width || 0) * SCALE, h };
      });
      items.forEach(i => rawItems.push(i.s));
      const lines = toLines(items);
      fullText += lines.map(l => l.text).join('\n') + '\n';
      const pg = parsePage(lines, items);

      // Codes-barres de la page
      let symbols = [];
      try {
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const res = await ZX.readBarcodes(img, { tryHarder: true, tryRotate: true, maxNumberOfSymbols: 24 });
        symbols = res.filter(r => r.text).map(r => {
          const q = r.position, xs = [q.topLeft.x, q.topRight.x, q.bottomLeft.x, q.bottomRight.x], ys = [q.topLeft.y, q.topRight.y, q.bottomLeft.y, q.bottomRight.y];
          const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
          return { text: r.text, format: FMT[r.format] || String(r.format || '').toLowerCase(), x0, x1, y0, y1, x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
        });
      } catch (e) { warnings.push(`Page ${p} : lecture des codes impossible`); }

      // Ancres = numéros de carte ; à défaut, les codes eux-mêmes si ce sont des chiffres
      let anchors = pg.numbers.slice();
      if (!anchors.length) {
        for (const s of symbols) if (/^\d{8,25}$/.test(s.text) && !anchors.some(a => a.digits === s.text)) anchors.push({ digits: s.text, x: s.x, y: s.y + 40 });
      }
      if (!anchors.length) continue;
      anchors.sort((a, b) => a.y - b.y || a.x - b.x);

      // Appariement code ↔ ancre : valeur identique d'abord, sinon proximité
      const pairs = [];
      symbols.forEach((s, si) => anchors.forEach((a, ai) => {
        const same = s.text.replace(/\D/g, '') === a.digits || s.text.includes(a.digits) || a.digits.includes(s.text);
        const d = dist(s, a);
        if (same || d < canvas.height * 0.35) pairs.push({ si, ai, score: same ? -1 : d });
      }));
      pairs.sort((a, b) => a.score - b.score);
      const symOf = new Array(anchors.length).fill(null), usedS = new Set();
      for (const pr of pairs) { if (symOf[pr.ai] === null && !usedS.has(pr.si)) { symOf[pr.ai] = symbols[pr.si]; usedS.add(pr.si); } }

      const amt = nearestAssign(pg.amounts, anchors);
      const dat = nearestAssign(pg.dates, anchors);
      const pinL = nearestAssign(pg.pinsL, anchors);
      const pinU = nearestAssign(pg.pinsU.filter(t => t.v !== undefined), anchors);

      anchors.forEach((a, i) => {
        const sym = symOf[i];
        let image = '';
        if (sym) {
          const mx = Math.max(24, (sym.x1 - sym.x0) * 0.12), my = Math.max(24, (sym.y1 - sym.y0) * 0.12);
          const sx = Math.max(0, sym.x0 - mx), sy = Math.max(0, sym.y0 - my);
          const sw = Math.min(canvas.width - sx, sym.x1 - sym.x0 + 2 * mx), sh = Math.min(canvas.height - sy, sym.y1 - sym.y0 + 2 * my);
          const c2 = document.createElement('canvas'); c2.width = Math.round(sw); c2.height = Math.round(sh);
          c2.getContext('2d').drawImage(canvas, sx, sy, sw, sh, 0, 0, c2.width, c2.height);
          image = c2.toDataURL('image/jpeg', 0.9);
        }
        const pin = (pinL[i] && pinL[i].v) || (pinU[i] && pinU[i].d < 320 ? pinU[i].v : '');
        cards.push({
          number: a.digits, pin,
          amount: amt[i] ? amt[i].v : null,
          expiry: dat[i] ? dat[i].v : '',
          code: sym ? { value: sym.text, format: sym.format } : null,
          image, page: p
        });
      });
    }

    // Enseigne : titre « Bons d'achat X » (élément de texte), sinon nom connu le plus cité, sinon préfixe du numéro
    let brand = '';
    for (const t of rawItems) {
      const m = t.match(/^bons?\s+d['’]achat\s+(.{2,40})$/i);
      if (m) { const name = m[1].replace(/\s*\d+\s*€.*$/, '').replace(/\s+/g, ' ').trim(); if (name) { brand = canon(name) || name; break; } }
    }
    if (!brand) {
      const n = norm(fullText);
      let best = 0;
      for (const [b] of KNOWN) {
        const re = new RegExp('(^|[^a-z])' + norm(b).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![a-z])', 'g');
        const c = (n.match(re) || []).length;
        if (c > best) { best = c; brand = b; }
      }
    }
    const bins = Object.assign({}, SEED_BINS, readBins());
    for (const c of cards) {
      c.brand = brand || bins[c.number.slice(0, 6)] || '';
      c.category = categoryOf(c.brand);
      c.file = file.name;
    }

    // Contrôle du nombre de bons annoncé
    const exp = fullText.match(/(\d+)\s+bons?\s+d['’]achat/i);
    if (exp && +exp[1] !== cards.length) warnings.push(`Le PDF annonce ${exp[1]} bon(s), ${cards.length} trouvé(s) : vérifie la liste.`);
    if (!cards.length) warnings.push('Aucun numéro de carte reconnu dans ce PDF.');
    return { cards, warnings };
  }

  function readBins() { try { return JSON.parse(localStorage.getItem('kado:bins') || '{}'); } catch { return {}; } }
  function rememberBin(number, brand) {
    if (!number || number.length < 8 || !brand) return;
    try { const b = readBins(); b[number.slice(0, 6)] = brand; localStorage.setItem('kado:bins', JSON.stringify(b)); } catch { /* ignore */ }
  }

  window.KadoPDF = { extract, rememberBin, KNOWN };
})();
