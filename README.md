# Kado

Appli web installable (PWA) pour suivre ses cartes cadeaux, cashback et de fidélité : solde, date de validité, historique des dépenses, code-barres / QR code à présenter en caisse.

- Données **100 % locales** (IndexedDB) : rien n'est envoyé nulle part.
- Fonctionne **hors ligne** une fois installée.
- Ajout par **scan caméra**, **import d'une image** (le code est lu dans la capture), **partage Android vers Kado**, ou saisie manuelle.
- Sauvegarde / restauration en JSON depuis les réglages (toucher le prénom en haut à gauche).

## Mise en ligne sur GitHub Pages

1. Créer un dépôt (ex. `kado`) et y pousser le contenu de ce dossier à la racine.
2. Réglages du dépôt → **Pages** → Source : *Deploy from a branch* → branche `main`, dossier `/ (root)`.
3. Ouvrir `https://<utilisateur>.github.io/kado/` dans Chrome sur Android, puis menu ⋮ → **Installer l'application**.

Après installation, Kado apparaît dans la liste « Partager » d'Android pour les images.

## Mettre à jour

Modifier les fichiers, puis changer `VERSION` en tête de `sw.js` (ex. `kado-v2`) pour que les téléphones récupèrent la nouvelle version.

## Structure

```
index.html · manifest.webmanifest · sw.js
css/style.css · js/app.js
vendor/   JsBarcode, qrcode-generator (MIT)
fonts/    DM Serif Display, Manrope (OFL)
icons/
```

## Prochaine version

Alertes de proximité des magasins (géolocalisation) : nécessitera une enveloppe d'application Android native.
