# Kado

Appli web installable (PWA) pour suivre ses cartes cadeaux, cashback et de fidélité : solde, date de validité, historique des dépenses, code-barres / QR code à présenter en caisse.

- Données **100 % locales** (IndexedDB) : rien n'est envoyé nulle part.
- Fonctionne **hors ligne** une fois installée.
- **Import de PDF** (bons d'achat des sites de cashback) : enseigne, montant, validité, numéro, PIN et code-barres/QR sont lus automatiquement, y compris quand un PDF contient plusieurs bons. Un écran de contrôle permet de corriger avant l'ajout. Un PDF partagé depuis Gmail ou les fichiers (Partager → Kado) s'ouvre directement dans cet écran.
- Ajout par **scan caméra**, **import d'une image** (code lu + texte reconnu par OCR : enseigne, montant, validité, numéro, PIN), **partage Android vers Kado**, ou saisie manuelle.
- **Thème clair, sombre ou automatique** (réglages, ou bouton soleil/lune en haut de l'accueil).
- Sauvegarde / restauration en JSON depuis les réglages (toucher le prénom en haut à gauche).

## Mise en ligne sur GitHub Pages

1. Créer un dépôt (ex. `kado`) et y pousser le contenu de ce dossier à la racine.
2. Réglages du dépôt → **Pages** → Source : *Deploy from a branch* → branche `main`, dossier `/ (root)`.
3. Ouvrir `https://<utilisateur>.github.io/kado/` dans Chrome sur Android, puis menu ⋮ → **Installer l'application**.

Après installation, Kado apparaît dans la liste « Partager » d'Android pour les images.

## Mettre à jour

Modifier les fichiers, puis changer `VERSION` en tête de `sw.js` (ex. `kado-v6`) pour que les téléphones récupèrent la nouvelle version.

## Structure

```
index.html · manifest.webmanifest · sw.js
css/style.css · js/app.js · js/pdfimport.js
vendor/   JsBarcode, qrcode-generator, PDF.js (Apache-2.0), ZXing-wasm (MIT), Tesseract.js (Apache-2.0, OCR des images)
fonts/    DM Serif Display, Manrope (OFL)
icons/
```

## Prochaine version

Alertes de proximité des magasins (géolocalisation) : nécessitera une enveloppe d'application Android native.
