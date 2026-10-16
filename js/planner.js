/* ==========================================================================
   Algorithme du séjour — à partir des réponses au questionnaire
   1. Chaque réponse donne un score : « J'adore » > « Pourquoi pas » ; « Non merci » exclut.
   2. Les lieux sans réponse héritent du goût pour leur thème (affinité).
   3. Les sorties chères sont écartées (plafond par personne).
   4. Chaque journée pleine se concentre sur un quartier ; on enchaîne le lieu
      le plus désiré ET le plus proche, ouvert à l'heure d'arrivée.
   5. Déjeuner, pause café, soirée ; le 31 au soir selon le choix fête / calme.
   ========================================================================== */

export const PLAFOND = 40; // € par personne au-delà duquel une sortie est jugée chère

/** Les cartes du questionnaire, dans l'ordre (thèmes alternés) */
export const QUESTIONNAIRE = [
  'schonbrunn', 'demel', 'belvedere', 'marche-schonbrunn', 'riesenrad', 'figlmuller',
  'sisi', 'hundertwasserhaus', 'sacher', 'haus-der-musik', 'naschmarkt', 'stephansdom',
  'eislaufverein', 'khm', 'heuriger', 'gloriette', 'kapuzinergruft', 'plachutta',
  'marche-belvedere', 'ring', 'mozarthaus', 'spittelberg', 'wurstelstand', 'albertina'
];

export const JOURS = [
  { id: '28', court: 'Lun 28', long: 'Lundi 28 décembre' },
  { id: '29', court: 'Mar 29', long: 'Mardi 29 décembre' },
  { id: '30', court: 'Mer 30', long: 'Mercredi 30 décembre' },
  { id: '31', court: 'Jeu 31', long: 'Jeudi 31 décembre' },
  { id: '01', court: 'Ven 1', long: 'Vendredi 1er janvier' }
];

const VOISINS = { schonbrunn: ['schonbrunn', 'ouest'], centre: ['centre', 'ouest'], ouest: ['ouest', 'centre'], est: ['est', 'centre'] };
const NOM_ZONE = { schonbrunn: 'Schönbrunn', centre: 'Le cœur de Vienne', ouest: 'Du Ring au Naschmarkt', est: 'Belvédère et Prater' };
const VALEUR = { oui: 1, peutetre: 0.45, non: 0 };

/* ---------- outils ---------- */
export const hm = (m) => { m = Math.round(m); return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
const min = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const arrondi = (m) => Math.ceil(m / 5) * 5;

export function distanceKm(a, b) {
  const R = 6371, r = Math.PI / 180;
  const x = Math.sin((b.lat - a.lat) * r / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin((b.lng - a.lng) * r / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function trajet(a, b, taxi = false) {
  const km = distanceKm(a, b) * 1.3;
  if (km < 0.15) return { mode: 'pied', minutes: 2, texte: 'Juste à côté' };
  if (taxi || km > 6) { const m = arrondi(8 + km * 2.2); return { mode: 'taxi', minutes: m, texte: `${m} min en taxi` }; }
  if (km <= 1.3) { const m = Math.max(3, Math.round(km / 4 * 60)); return { mode: 'pied', minutes: m, texte: `${m} min à pied` }; }
  const m = arrondi(10 + km * 3);
  return { mode: 'metro', minutes: m, texte: `${m} min en métro ou tram` };
}

/** Prix sans chiffres : repère simple */
export const niveauPrix = (euros) => (euros <= 0 ? 'Gratuit' : euros <= 15 ? '€' : euros <= 30 ? '€€' : '€€€');

function debutPossible(lieu, jour, arrivee) {
  const h = lieu.horaires && lieu.horaires[jour];
  if (!h) return null;
  const [o, f] = h.split('-').map(min);
  const fin = f === min('23:59') ? 24 * 60 : f;
  let debut = arrondi(arrivee);
  if (debut < o) { if (o - debut > 40) return null; debut = o; }
  return debut + lieu.duree <= fin ? debut : null;
}

/* ==========================================================================
   Composition du séjour
   ========================================================================== */
export function composerSejour(donnees, prefs) {
  const { lieux, hotel, voyage } = donnees;
  const rep = prefs.reponses || {};
  const tranquille = prefs.rythme !== 'actif';
  const fete = prefs.soir31 !== 'calme';
  const H = { lat: hotel.lat, lng: hotel.lng };
  const utilises = new Set();

  /* 1. Affinité par thème, calculée sur les réponses */
  const affinite = {};
  for (const [id, r] of Object.entries(rep)) {
    const l = lieux.find((x) => x.id === id);
    if (!l) continue;
    for (const c of l.categories) (affinite[c] ||= []).push(VALEUR[r] ?? 0);
  }
  const aff = (l) => Math.max(0, ...l.categories.map((c) => (affinite[c] ? affinite[c].reduce((s, v) => s + v, 0) / affinite[c].length : 0.3)));

  /* 2. Score de chaque lieu */
  const abordable = (l) => (l.budget ?? 0) <= PLAFOND;
  const sansReponse = Object.keys(rep).length === 0;
  const score = (l) => {
    if (!abordable(l) || rep[l.id] === 'non') return 0;
    if (sansReponse) return l.priorite >= 3 ? 50 + l.priorite * 3 : 0; // sans réponses : les incontournables
    if (rep[l.id] === 'oui') return 100 + l.priorite * 3;
    if (rep[l.id] === 'peutetre') return 40 + l.priorite * 3;
    const a = aff(l);
    return a < 0.35 ? 0 : a * 30 + l.priorite * 3;
  };
  const visites = lieux.filter((l) => (l.type === 'visite' || l.type === 'balade') && score(l) > 0 && l.id !== 'wagner');

  /* 3. Un quartier par journée pleine (le 31 : le centre, proche de la fête) */
  const scoreZone = {};
  for (const z of Object.keys(VOISINS)) scoreZone[z] = visites.filter((l) => l.zone === z).map(score).sort((a, b) => b - a).slice(0, 3).reduce((s, x) => s + x, 0);
  scoreZone.centre *= 0.5;
  const ordre = Object.keys(scoreZone).sort((a, b) => scoreZone[b] - scoreZone[a]);
  const zones = { '29': ordre[0] || 'ouest', '30': scoreZone[ordre[1]] > 0 ? ordre[1] : 'ouest', '31': 'centre' };
  if (zones['30'] === 'schonbrunn') [zones['29'], zones['30']] = ['schonbrunn', zones['29']];

  /* ---------- briques ---------- */
  const etape = (o) => Object.assign({ genre: 'info' }, o);
  const etapeLieu = (l, heure, tr, extra = {}) => ({
    id: l.id, heure: hm(heure), titre: extra.titre || l.nom, phrase: l.sousTitre, description: l.description, astuce: l.astuce,
    photo: l.photos && l.photos[0], duree: extra.duree ?? l.duree, prix: niveauPrix(l.budget ?? 0), acces: l.acces,
    horairesNote: l.horairesNote, statut: l.horairesStatut, lieu: { lat: l.lat, lng: l.lng }, trajet: tr,
    genre: extra.genre || l.type, aime: rep[l.id] === 'oui', film: l.film
  });

  function choisirTable(pos, t, jour, zonesOK, genre) {
    let best = null, bestV = -1;
    for (const l of lieux) {
      if (utilises.has(l.id) || rep[l.id] === 'non' || !abordable(l)) continue;
      if (genre === 'cafe' ? !(l.categories.includes('cafes') && (l.type === 'cafe' || l.type === 'repas')) : l.type !== 'repas') continue;
      const tr = trajet(pos, l);
      if (tr.minutes > 20 || (!zonesOK.includes(l.zone) && tr.minutes > 12)) continue;
      const debut = debutPossible(l, jour, t + tr.minutes);
      if (debut === null) continue;
      const v = (rep[l.id] === 'oui' ? 200 : rep[l.id] === 'peutetre' ? 80 : 20 + aff(l) * 20) - tr.minutes * 1.5;
      if (v > bestV) { bestV = v; best = { l, tr, debut }; }
    }
    return best;
  }

  function journee(jour, zone, cfg) {
    const etapes = [];
    const zonesOK = VOISINS[zone];
    let t = cfg.debut, pos = H, nb = 0, dej = false, cafe = false;
    etapes.push(etape({ heure: hm(t), titre: 'Départ de l\'hôtel', phrase: 'Petit-déjeuner pris, c\'est parti !', genre: 'hotel', lieu: { ...H } }));

    const pause = (genre) => {
      const r = choisirTable(pos, t, jour, zonesOK, genre);
      const duree = genre === 'cafe' ? 45 : 70;
      if (r) {
        utilises.add(r.l.id);
        etapes.push(etapeLieu(r.l, r.debut, r.tr, { genre, duree }));
        t = r.debut + duree; pos = r.l;
      } else {
        etapes.push(etape({
          heure: hm(t), genre, duree,
          titre: genre === 'cafe' ? 'Pause café' : 'Déjeuner dans un bistrot du quartier',
          phrase: genre === 'cafe' ? 'Une Melange et une part de strudel dans le café le plus proche.' : 'Le « Beisl » viennois : soupe, goulasch ou schnitzel, simple et bon.',
          prix: '€'
        }));
        t += duree;
      }
    };

    while (true) {
      if (!dej && t >= 12 * 60) { pause('repas'); dej = true; continue; }
      if (!cafe && dej && t >= 15 * 60 && nb >= cfg.max) { pause('cafe'); cafe = true; continue; }
      if (nb >= cfg.max || t >= cfg.fin) break;
      if (!dej && nb >= Math.ceil(cfg.max / 2)) { t = Math.max(t, 12 * 60); continue; }
      let best = null, bestV = -Infinity;
      for (const l of visites) {
        if (utilises.has(l.id) || !zonesOK.includes(l.zone)) continue;
        const tr = trajet(pos, l);
        const debut = debutPossible(l, jour, t + tr.minutes);
        if (debut === null) continue;
        if (!dej && debut + l.duree > 13 * 60 + 45) continue;
        if (debut + l.duree > cfg.fin + 30) continue;
        const v = score(l) + (l.zone === zone ? 25 : 0) - tr.minutes * 0.8 - (debut - t - tr.minutes) * 0.4;
        if (v > bestV) { bestV = v; best = { l, tr, debut }; }
      }
      if (!best) { if (!dej && t < 12 * 60) { t = 12 * 60; continue; } break; }
      utilises.add(best.l.id);
      etapes.push(etapeLieu(best.l, best.debut, best.tr));
      t = best.debut + best.l.duree; pos = best.l; nb++;
    }
    if (!dej) { t = Math.max(t, 12 * 60); pause('repas'); }
    if (!cafe && cfg.cafe !== false && t <= 17 * 60) { t = Math.max(t, 14 * 60 + 30); pause('cafe'); }
    return { etapes, t, pos };
  }

  const retour = (etapes, pos, t, titre = 'Retour à l\'hôtel', phrase = '') => {
    const tr = trajet(pos, H);
    const h = arrondi(t + tr.minutes);
    etapes.push(etape({ heure: hm(h), titre, phrase, genre: 'hotel', lieu: { ...H }, trajet: tr }));
    return h;
  };

  function diner(etapes, pos, heure, jour) {
    // un restaurant « J'adore » d'abord (même un peu loin), sinon un bien noté tout près
    const ok = (l) => l.type === 'repas' && l.duree >= 45 && !utilises.has(l.id) && rep[l.id] !== 'non' && abordable(l) && debutPossible(l, jour, heure) !== null;
    const aime = lieux.filter((l) => ok(l) && rep[l.id] === 'oui' && distanceKm(pos, l) < 4).sort((a, b) => distanceKm(pos, a) - distanceKm(pos, b));
    const proche = lieux.filter((l) => ok(l) && rep[l.id] !== undefined && distanceKm(pos, l) < 2).sort((a, b) => score(b) - score(a));
    const l = aime[0] || proche[0];
    if (l) { utilises.add(l.id); etapes.push(etapeLieu(l, heure, trajet(pos, l), { genre: 'repas', duree: 90, titre: `Dîner : ${l.nom}` })); return { pos: l, t: heure + 90 }; }
    etapes.push(etape({ heure: hm(heure), genre: 'repas', duree: 90, titre: 'Dîner près de l\'hôtel', phrase: 'Une adresse simple du quartier : demandez conseil à la réception.', prix: '€€' }));
    return { pos, t: heure + 90 };
  }

  /* ========== Lundi 28 : arrivée ========== */
  const j28 = [
    etape({ heure: '15:40', titre: 'Atterrissage à Vienne', phrase: 'Vol Condor depuis Francfort', genre: 'vol' }),
    etape({ heure: '16:15', titre: 'Transfert vers l\'hôtel', phrase: 'Déjà réservé ✓ Suivez la confirmation.', genre: 'transfert', trajet: { mode: 'taxi', minutes: 35, texte: 'Environ 35 min' } }),
    etape({ heure: '17:00', titre: 'Installation à l\'hôtel', phrase: `${hotel.nom}, ${hotel.adresse}`, genre: 'hotel', lieu: { ...H } })
  ];
  {
    let pos = H, t = 18 * 60 + 15;
    const w = lieux.find((l) => l.id === 'wagner');
    if (w) { const tr = trajet(pos, w); t = arrondi(t + tr.minutes); j28.push(etapeLieu(w, t, tr, { genre: 'balade' })); t += w.duree; pos = w; utilises.add('wagner'); }
    const n = lieux.find((l) => l.id === 'naschmarkt');
    if (n && rep.naschmarkt !== 'non') {
      const tr = trajet(pos, n); t = arrondi(t + tr.minutes);
      j28.push(etapeLieu(n, t, tr, { genre: 'repas', duree: 90, titre: 'Premier dîner au Naschmarkt' })); t += 90; pos = n; utilises.add('naschmarkt');
    } else { const d = diner(j28, pos, arrondi(t + 10), '28'); pos = d.pos; t = d.t; }
    retour(j28, pos, t, 'Retour à l\'hôtel', 'Bonne première nuit viennoise !');
  }

  /* ========== Mardi 29 et mercredi 30 ========== */
  const cfg = { debut: tranquille ? 10 * 60 : 9 * 60 + 15, max: tranquille ? 2 : 4, fin: tranquille ? 16 * 60 + 30 : 17 * 60 + 30 };
  const plein = {};
  let heurigerFait = false;
  for (const jour of ['29', '30']) {
    const r = journee(jour, zones[jour], cfg);
    let pos = r.pos, t = r.t;
    t = retour(r.etapes, pos, t, 'Pause à l\'hôtel', 'On se repose avant la soirée.');
    pos = H; t = Math.max(t + 60, 18 * 60 + 30);
    const heu = lieux.find((l) => l.id === 'heuriger');
    if (heu && !heurigerFait && rep.heuriger === 'oui' && heu.horaires[jour]) {
      heurigerFait = true; utilises.add('heuriger');
      r.etapes.push(etapeLieu(heu, t, trajet(pos, heu, true), { genre: 'repas', titre: 'Soirée au Heuriger' }));
      r.etapes.push(etape({ heure: hm(t + heu.duree + 30), titre: 'Retour à l\'hôtel en taxi', genre: 'hotel', lieu: { ...H }, trajet: trajet(heu, H, true) }));
    } else {
      const d = diner(r.etapes, pos, t, jour);
      retour(r.etapes, d.pos, d.t);
    }
    plein[jour] = r.etapes;
  }

  /* ========== Jeudi 31 : Saint-Sylvestre ========== */
  const r31 = journee('31', 'centre', { debut: tranquille ? 10 * 60 : 9 * 60 + 30, max: tranquille ? 2 : 3, fin: 14 * 60 + 30, cafe: false });
  const j31 = r31.etapes;
  if (fete) {
    retour(j31, r31.pos, r31.t, 'Grande sieste à l\'hôtel', 'Indispensable avant une longue nuit !');
    j31.push(etape({ heure: '18:00', genre: 'repas', duree: 120, restaurants: 'fete', titre: 'Dîner du Nouvel An', phrase: 'Tôt, simple et bon, avant la fête.', photo: 'images/hero2.jpg', lieu: { lat: 48.1953, lng: 16.369 }, trajet: { mode: 'pied', minutes: 12, texte: '12 min à pied' }, reserver: true }));
    j31.push(etape({ heure: '20:30', genre: 'fete', titre: 'Le parcours de fête du Nouvel An', phrase: 'Musique, stands de Punsch et foule joyeuse dans tout le centre. Gratuit.', photo: 'images/silvester.jpg', lieu: { lat: 48.2087, lng: 16.369 }, trajet: { mode: 'metro', minutes: 20, texte: '20 min en métro (U4 puis U1)' },
      description: 'Le « Silvesterpfad » relie la Freyung, Am Hof, le Graben, Stephansplatz et la Kärntner Straße, avec des scènes et des stands. En 2025/26, il était ouvert de 14h à 2h ; le programme 2026 sort en décembre.',
      astuce: 'Habillez-vous très chaudement et fixez un point de rendez-vous si vous êtes séparés. Pétards et fusées sont interdits.', prix: 'Gratuit' }));
    j31.push(etape({ heure: '23:40', genre: 'fete', titre: 'Minuit à Stephansplatz', phrase: 'La cloche Pummerin, puis Le Beau Danube bleu : tout le monde valse.', photo: 'images/pummerin.jpg', lieu: { lat: 48.2085, lng: 16.3725 }, trajet: { mode: 'pied', minutes: 10, texte: '10 min à pied' }, prix: 'Gratuit' }));
    j31.push(etape({ heure: '00:30', genre: 'hotel', titre: 'Retour à pied à l\'hôtel', phrase: 'Environ 35 min par la Kärntner Straße : les métros du centre sont bondés.', lieu: { ...H }, trajet: { mode: 'pied', minutes: 35, texte: '35 min à pied' } }));
  } else {
    const hdm = lieux.find((l) => l.id === 'haus-der-musik');
    let pos = r31.pos, t = Math.max(r31.t, 14 * 60);
    if (hdm && !utilises.has(hdm.id) && rep[hdm.id] !== 'non') {
      const tr = trajet(pos, hdm); t = arrondi(t + tr.minutes);
      j31.push(etapeLieu(hdm, t, tr)); utilises.add(hdm.id); t += hdm.duree; pos = hdm;
    }
    retour(j31, pos, t, 'Repos à l\'hôtel', 'On se fait beau pour le dîner.');
    j31.push(etape({ heure: '19:00', genre: 'repas', duree: 120, restaurants: 'calme', titre: 'Dîner du Nouvel An près de l\'hôtel', phrase: 'Un bon repas au calme, loin de la foule.', photo: 'images/hero2.jpg', lieu: { lat: 48.1953, lng: 16.369 }, trajet: { mode: 'pied', minutes: 12, texte: '12 min à pied' }, reserver: true }));
    j31.push(etape({ heure: '21:30', genre: 'hotel', titre: 'Retour à l\'hôtel', phrase: 'Avant la foule et les fermetures de rues.', lieu: { ...H }, trajet: { mode: 'pied', minutes: 12, texte: '12 min à pied' } }));
    j31.push(etape({ heure: '23:55', genre: 'fete', titre: 'Minuit en musique', phrase: 'Télévision ou radio ORF : la Pummerin, puis Le Beau Danube bleu. On valse dans la chambre !', photo: 'images/stephansdom.jpg', prix: 'Gratuit' }));
  }

  /* ========== Vendredi 1er : départ ========== */
  const j01 = [
    etape({ heure: '07:30', titre: 'Petit-déjeuner et valises', phrase: 'Prosit Neujahr ! Bonne année !', genre: 'hotel', lieu: { ...H } }),
    etape({ heure: '08:30', titre: 'Transfert vers l\'aéroport', phrase: 'Déjà réservé ✓ Vérifiez l\'heure la veille.', genre: 'transfert', trajet: { mode: 'taxi', minutes: 30, texte: 'Environ 30 min' }, lieu: { lat: voyage.aeroport.lat, lng: voyage.aeroport.lng } }),
    etape({ heure: '11:10', titre: 'Décollage pour Paris', phrase: 'Via Francfort, arrivée à Paris-CDG à 15h35.', genre: 'vol' })
  ];

  const jours = [
    { ...JOURS[0], titre: 'Arrivée', intro: 'Une soirée douce, à deux pas de l\'hôtel.', etapes: j28 },
    { ...JOURS[1], titre: NOM_ZONE[zones['29']], intro: 'Un quartier, peu de marche, beaucoup de belles choses.', etapes: plein['29'] },
    { ...JOURS[2], titre: NOM_ZONE[zones['30']], intro: 'Nouveau quartier, nouvelles merveilles.', etapes: plein['30'] },
    { ...JOURS[3], titre: fete ? 'Le Nouvel An dans les rues' : 'Un Nouvel An tout en douceur', intro: fete ? 'Matinée tranquille, sieste, puis la fête jusqu\'à minuit.' : 'Une belle journée, un bon dîner, minuit au calme.', etapes: j31 },
    { ...JOURS[4], titre: 'Retour', intro: 'Départ de l\'hôtel à 8h30.', etapes: j01 }
  ];
  for (const j of jours) { let n = 0; for (const e of j.etapes) if (e.lieu && e.genre !== 'hotel') e.numero = ++n; }
  // titre des journées pleines d'après le quartier réellement le plus visité
  for (const j of [jours[1], jours[2]]) {
    const compte = {};
    for (const e of j.etapes) { const l = e.id && lieux.find((x) => x.id === e.id); if (l && (l.type === 'visite' || l.type === 'balade')) compte[l.zone] = (compte[l.zone] || 0) + 1; }
    const z = Object.keys(compte).sort((a, b) => compte[b] - compte[a])[0];
    if (z) j.titre = NOM_ZONE[z];
  }

  const adores = lieux.filter((l) => rep[l.id] === 'oui');
  return { jours, nonPlaces: adores.filter((l) => !utilises.has(l.id)), utilises, prefs: { tranquille, fete } };
}

/** Lien Google Maps de la journée (hôtel → étapes → hôtel) */
export function lienJournee(jour, hotel) {
  const pts = [`${hotel.lat},${hotel.lng}`];
  for (const e of jour.etapes) if (e.lieu && e.genre !== 'hotel') pts.push(`${e.lieu.lat},${e.lieu.lng}`);
  if (jour.id !== '01') pts.push(`${hotel.lat},${hotel.lng}`);
  return 'https://www.google.com/maps/dir/' + pts.join('/');
}

/** « Y aller » : itinéraire en transports depuis l'étape précédente */
export function lienYAller(depuis, vers) {
  const o = depuis ? `&origin=${depuis.lat},${depuis.lng}` : '';
  return `https://www.google.com/maps/dir/?api=1${o}&destination=${vers.lat},${vers.lng}&travelmode=transit`;
}
