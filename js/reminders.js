'use strict';
/* Kado — calcul des rappels d'expiration. Partagé par la page (app.js) et le service worker (importScripts). */
(root => {
  const DAY = 864e5;
  const nf = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const midnight = now => { const d = new Date(now); d.setHours(0, 0, 0, 0); return d; };

  /* Paliers : le délai choisi dans les réglages, puis 7, 3 et 1 jour(s) avant, puis le jour même. */
  const stagesFor = alertDays => [...new Set([alertDays, 7, 3, 1, 0].filter(d => d <= alertDays))].sort((a, b) => b - a);
  const stageOf = (dl, stages) => { let s = null; for (const t of stages) if (dl <= t) s = t; return s; };
  const keyOf = c => c.id + '|' + c.expiry;

  /* Une carte est notifiée une fois par palier franchi (pas une fois par jour).
     `notified` : { "id|date": palier déjà notifié } — retourné mis à jour, élagué des cartes sorties du suivi.
     `soon` : nombre de cartes à surveiller (pastille de l'appli). */
  function plan(cards, { alertDays = 30, notified = {}, now = Date.now(), force = false } = {}) {
    const stages = stagesFor(alertDays), today = midnight(now);
    const next = {}, due = [];
    let soon = 0;
    for (const c of cards) {
      if (c.archived || !c.expiry) continue;
      if (!(c.kind === 'fidelite' || (c.balance || 0) > 0.004)) continue;
      const dl = Math.round((new Date(c.expiry + 'T00:00:00') - today) / DAY);
      const stage = dl < 0 ? null : stageOf(dl, stages);
      if (stage === null) continue;
      soon++;
      const k = keyOf(c), prev = force ? undefined : notified[k];
      const fresh = prev === undefined || stage < prev;
      next[k] = fresh ? stage : prev;
      if (fresh) due.push({ c, dl, stage });
    }
    due.sort((a, b) => a.dl - b.dl);
    return { due, notified: next, soon };
  }

  const when = dl => dl === 0 ? "aujourd'hui" : dl === 1 ? 'demain' : 'dans ' + dl + ' jours';
  const whenShort = dl => dl === 0 ? "aujourd'hui" : dl === 1 ? 'demain' : 'J-' + dl;

  /* Texte de la notification pour les cartes à signaler ; null s'il n'y en a pas. */
  function message(due) {
    if (!due.length) return null;
    if (due.length === 1) {
      const { c, dl } = due[0];
      return {
        title: `${c.brand} expire ${when(dl)}`,
        body: c.kind === 'fidelite' ? 'Carte de fidélité à utiliser avant sa date de validité.' : `Il reste ${nf.format(c.balance)} € à utiliser.`,
        url: './?card=' + encodeURIComponent(c.id)
      };
    }
    const total = due.reduce((s, d) => s + (d.c.kind === 'fidelite' ? 0 : d.c.balance || 0), 0);
    const lines = due.slice(0, 3).map(d => `${d.c.brand} · ${whenShort(d.dl)}`);
    if (due.length > 3) lines.push(`+ ${due.length - 3} autre${due.length - 3 > 1 ? 's' : ''}`);
    return {
      title: `${due.length} cartes arrivent bientôt à expiration`,
      body: (total > 0.004 ? `${nf.format(total)} € à utiliser.\n` : '') + lines.join('\n'),
      url: './?alerts=1'
    };
  }

  const options = m => ({
    body: m.body, icon: './icons/icon-192.png', badge: './icons/icon-192.png',
    tag: 'kado-expiry', renotify: true, data: { url: m.url }
  });

  const api = { plan, message, options, stagesFor };
  root.KadoReminders = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this);
