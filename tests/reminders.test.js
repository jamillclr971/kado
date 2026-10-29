'use strict';
/* node --test tests/ */
const test = require('node:test');
const assert = require('node:assert');
const R = require('../js/reminders.js');

const NOW = new Date('2026-06-10T10:00:00').getTime();
const day = n => { const d = new Date('2026-06-10T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const card = (id, inDays, extra = {}) => ({ id, brand: 'B' + id, kind: 'cadeau', balance: 20, expiry: day(inDays), ...extra });

test('paliers : délai choisi, 7, 3, 1 et jour même', () => {
  assert.deepStrictEqual(R.stagesFor(30), [30, 7, 3, 1, 0]);
  assert.deepStrictEqual(R.stagesFor(7), [7, 3, 1, 0]);
  assert.deepStrictEqual(R.stagesFor(90), [90, 7, 3, 1, 0]);
});

test('une carte hors fenêtre n\'est pas signalée', () => {
  const r = R.plan([card('a', 31)], { now: NOW });
  assert.strictEqual(r.due.length, 0);
  assert.strictEqual(r.soon, 0);
});

test('un palier n\'est notifié qu\'une fois, le suivant l\'est à nouveau', () => {
  const cards = [card('a', 25)];
  let r = R.plan(cards, { now: NOW });
  assert.strictEqual(r.due.length, 1);
  // même jour, deuxième vérification (page + service worker) : rien de nouveau
  r = R.plan(cards, { now: NOW, notified: r.notified });
  assert.strictEqual(r.due.length, 0);
  // 20 jours plus tard (J-5) : palier 7
  const later = NOW + 20 * 864e5;
  let r2 = R.plan(cards, { now: later, notified: r.notified });
  assert.deepStrictEqual(r2.due.map(d => d.stage), [7]);
  // le lendemain (J-4) : toujours palier 7, déjà notifié
  r2 = R.plan(cards, { now: later + 864e5, notified: r2.notified });
  assert.strictEqual(r2.due.length, 0);
  // J-1 puis jour même
  r2 = R.plan(cards, { now: NOW + 24 * 864e5, notified: r2.notified });
  assert.deepStrictEqual(r2.due.map(d => d.stage), [1]);
  r2 = R.plan(cards, { now: NOW + 25 * 864e5, notified: r2.notified });
  assert.deepStrictEqual(r2.due.map(d => d.stage), [0]);
});

test('une carte ouverte après plusieurs paliers sautés ne produit qu\'une notification', () => {
  const r = R.plan([card('a', 2)], { now: NOW });
  assert.strictEqual(r.due.length, 1);
  assert.strictEqual(r.due[0].stage, 3);
});

test('cartes ignorées : archivée, vide, expirée, sans date ; fidélité conservée', () => {
  const cards = [
    card('a', 5, { archived: true }), card('b', 5, { balance: 0 }), card('c', -1), card('d', 5, { expiry: '' }),
    card('e', 5, { kind: 'fidelite', balance: 0 })
  ];
  const r = R.plan(cards, { now: NOW });
  assert.deepStrictEqual(r.due.map(d => d.c.id), ['e']);
  assert.strictEqual(r.soon, 1);
});

test('changer la date de validité redonne un rappel', () => {
  const c = card('a', 5);
  const r = R.plan([c], { now: NOW });
  const r2 = R.plan([{ ...c, expiry: day(6) }], { now: NOW, notified: r.notified });
  assert.strictEqual(r2.due.length, 1);
});

test('élagage : les cartes sorties du suivi disparaissent de la mémoire', () => {
  const r = R.plan([card('a', 5)], { now: NOW });
  const r2 = R.plan([], { now: NOW, notified: r.notified });
  assert.deepStrictEqual(r2.notified, {});
});

test('force ré-annonce tout', () => {
  const cards = [card('a', 5)];
  const r = R.plan(cards, { now: NOW });
  assert.strictEqual(R.plan(cards, { now: NOW, notified: r.notified, force: true }).due.length, 1);
});

test('messages', () => {
  const one = R.message(R.plan([card('a', 1, { balance: 45.2 })], { now: NOW }).due);
  assert.match(one.title, /Ba expire demain/);
  assert.match(one.body, /45,20/);
  assert.strictEqual(one.url, './?card=a');
  const many = R.message(R.plan([card('a', 1), card('b', 2), card('c', 3), card('d', 4), card('e', 5)], { now: NOW }).due);
  assert.match(many.title, /5 cartes/);
  assert.match(many.body, /\+ 2 autres/);
  assert.strictEqual(many.url, './?alerts=1');
  assert.strictEqual(R.message([]), null);
});
