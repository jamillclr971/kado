'use strict';
/* node --test tests/*.test.js — charge pdfimport.js dans un faux navigateur et teste la reconnaissance des enseignes. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const store = {};
const win = { localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } } };
const ctx = vm.createContext({ window: win, document: { baseURI: 'http://localhost/' }, localStorage: win.localStorage, URL, console });
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/pdfimport.js'), 'utf8'), ctx);
const K = win.KadoPDF;
const E = (...t) => t.map(x => (Array.isArray(x) ? { text: x[0], w: x[1] } : { text: x }));
const brand = (...t) => (K.detectBrand(E(...t)) || {}).brand || '';

test('noms exacts, accents et casse', () => {
  assert.strictEqual(brand('Votre bon d\'achat LEROY MERLIN'), 'Leroy Merlin');
  assert.strictEqual(brand('brico dépôt'), 'Brico Dépôt');
  assert.strictEqual(brand('Intermarché Hyper'), 'Intermarché');
  assert.strictEqual(brand('Joué Club - bon'), 'JouéClub');
});

test('alias et graphies', () => {
  assert.strictEqual(brand('E.Leclerc'), 'Leclerc');
  assert.strictEqual(brand('Mc Donald\'s France'), 'McDonald\'s');
  assert.strictEqual(brand('www.leroymerlin.fr'), 'Leroy Merlin');
  assert.strictEqual(brand('Lafayette'), 'Galeries Lafayette');
  assert.strictEqual(brand('Hyper U'), 'Super U');
});

test('fautes d\'OCR sur les noms longs', () => {
  assert.strictEqual(brand('Leroy Merlln'), 'Leroy Merlin');
  assert.strictEqual(brand('Carrefoun Market'), 'Carrefour');
  assert.strictEqual(brand('DECATHL0N'), 'Decathlon');
});

test('pas de faux positifs sur des mots courants', () => {
  assert.strictEqual(brand('Culture générale et loisirs'), '');          // ≠ Cultura
  assert.strictEqual(brand('Action requise : mais but atteint'), '');    // noms courants = strict
  assert.strictEqual(brand('Le match de ce soir, habitat naturel, courir vite'), '');
  assert.strictEqual(brand('Valable en magasin et sur internet pendant 12 mois'), '');
});

test('noms courants : reconnus par titre ou adresse web', () => {
  assert.strictEqual(K.titleBrand('Bon d\'achat Action 20 €'), 'Action');
  assert.strictEqual(brand('Retrouvez-nous sur www.action.com'), 'Action');
  assert.strictEqual(K.titleBrand('Carte cadeau But'), 'But');
});

test('pondération : le titre l\'emporte sur une mention en pied de page', () => {
  assert.strictEqual(brand(['IKEA', 3], 'Valable aussi chez Leroy Merlin', 'Leroy Merlin'), 'IKEA');
  assert.strictEqual(brand('IKEA', ['Leroy Merlin', 3]), 'Leroy Merlin');
});

test('titres', () => {
  assert.strictEqual(K.titleBrand('Bon d\'achat IKEA'), 'IKEA');
  assert.strictEqual(K.titleBrand('Bons d’achat Leroy Merlin'), 'Leroy Merlin');
  assert.strictEqual(K.titleBrand('Votre carte cadeau Sephora 50 €'), 'Sephora');
  assert.strictEqual(K.titleBrand('Chèque cadeau Boulanger'), 'Boulanger');
  assert.strictEqual(K.titleBrand('Bon d\'achat Maison Dupont'), 'Maison Dupont');    // enseigne inconnue : gardée telle quelle
  assert.strictEqual(K.titleBrand('Votre bon d\'achat est valable 1 an'), '');
  assert.strictEqual(K.titleBrand('Bon d\'achat de 50 €'), '');
  assert.strictEqual(K.titleBrand('Vos bons d\'achat pour vos courses'), '');
});

test('OCR : enseigne, montant, validité', () => {
  const r = K.parseOcr('Bon d\'achat Castorama\nMontant : 80 €\nValable jusqu\'au 31/12/2026\nN° 5032001234567890\nPIN 4821');
  assert.strictEqual(r.brand, 'Castorama');
  assert.strictEqual(r.category, 'Bricolage');
  assert.strictEqual(r.amount, 80);
  assert.strictEqual(r.expiry, '2026-12-31');
  assert.strictEqual(r.pin, '4821');
});

test('OCR : sans nom dans le texte, retombe sur le préfixe de numéro', () => {
  assert.strictEqual(K.parseOcr('Carte cadeau\n20 €').brand, '');
  K.rememberBin('9876543210123456', 'Cultura');
  assert.strictEqual(win.localStorage.getItem('kado:bins'), JSON.stringify({ 987654: 'Cultura' }));
});

test('table : pas de doublon de nom et catégories renseignées', () => {
  const names = K.KNOWN.map(k => k[0]);
  assert.strictEqual(new Set(names).size, names.length);
  assert.ok(K.KNOWN.every(k => k[1]));
  assert.ok(K.KNOWN.length > 100);
});
