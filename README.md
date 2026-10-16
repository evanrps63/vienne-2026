# Vienne en famille

Site statique (HTML/CSS/JS, sans build) pour le séjour à Vienne du 28 décembre 2026 au 1er janvier 2027.

## Le principe

1. **Nos envies** : 24 photos, une à la fois. Pour chacune : « J'adore », « Pourquoi pas » ou « Non merci » (on peut aussi glisser la photo). Puis deux questions : le rythme et la soirée du 31.
2. **L'algorithme** (`js/planner.js`) transforme ces réponses en programme :
   - « J'adore » = prioritaire, « Pourquoi pas » = si la place le permet, « Non merci » = exclu ;
   - les lieux sans réponse héritent du goût pour leur thème ;
   - les sorties chères (au-delà de 40 € par personne) sont écartées ;
   - un quartier par journée, horaires d'ouverture respectés, déjeuner, café, soirée.
3. **Programme** : jour par jour, avec photo, heure, bouton « Y aller » (Google Maps) et carte du jour.
4. **Infos** : réservations à faire (cochables), vols, hôtel, mots utiles avec le son, spécialités.

Aucun budget n'est affiché : seulement un repère Gratuit / € / €€.

## Mise en commun automatique (Firebase, 5 minutes, gratuit)

Sans ça, chacun doit s'envoyer des liens. Avec ça, les réponses de chacun se rassemblent toutes seules, et dès que les 4 ont fini, **le programme final s'affiche sur tous les téléphones**.

1. Allez sur https://console.firebase.google.com avec votre compte Google, puis **Créer un projet** (nom : `vienne-ropars`, Google Analytics inutile).
2. Dans le menu, ouvrez **Realtime Database**, puis **Créer une base de données**. Choisissez l'emplacement **Belgique (europe-west1)** et **Démarrer en mode verrouillé**.
3. Onglet **Règles** : remplacez tout par ceci, puis **Publier** :
   ```json
   {
     "rules": {
       ".read": false,
       ".write": false,
       "familles": {
         "ropars-e7faeedf": { ".read": true, ".write": true }
       }
     }
   }
   ```
4. Onglet **Données** : copiez l'adresse affichée en haut (du type `https://vienne-ropars-default-rtdb.europe-west1.firebasedatabase.app`).
5. Collez-la dans `data/voyage.json`, ligne `"url": ""` de la partie `synchro`, puis remettez le site en ligne (`git add . && git commit -m "Synchro" && git push`).

La pastille « Synchronisé » apparaît alors en haut du site. Seuls les prénoms et les réponses (J'adore, Pourquoi pas, Non merci) sont stockés, sous un code de famille difficile à deviner (`ropars-e7faeedf`).

## Fichiers

```
index.html                 la page
css/style.css              le style (ciel, pilules, carte 3D)
js/app.js                  les écrans
js/planner.js              l'algorithme
data/lieux.json            les lieux (photos, horaires par date, budget estimé, réservation)
data/voyage.json           vols, aéroport, restaurants du 31
data/lexique.json          mots utiles
data/specialites.json      spécialités à goûter
data/credits-photos.json   source de chaque photo (Wikimedia Commons)
images/                    photos
```

Pour changer les photos du questionnaire, modifiez la liste `QUESTIONNAIRE` en haut de `js/planner.js`.

## Tester en local

```bash
python3 -m http.server 8642
```

Puis ouvrez http://localhost:8642

## Mettre en ligne (GitHub Pages)

1. Créez un dépôt sur https://github.com/new (compte `evanrps63`), par exemple `vienne-2026`.
2. Dans ce dossier :
   ```bash
   git init && git add . && git commit -m "Vienne en famille" && git branch -M main
   git remote add origin https://github.com/evanrps63/vienne-2026.git
   git push -u origin main
   ```
3. Sur GitHub : **Settings → Pages → Deploy from a branch → main / (root) → Save**.
4. Le site est en ligne après une minute : https://evanrps63.github.io/vienne-2026/

Après une modification, changez le numéro `?v=` dans `index.html` (et en haut de `js/app.js`) pour que les téléphones chargent la nouvelle version.
