import { QUESTIONNAIRE, composerSejour, lienJournee, lienYAller, PLAFOND } from './planner.js?v=5.1';

/* ==========================================================================
   État, sauvegarde
   ========================================================================== */
const CLE = 'vienne-famille-v3';
const charger = () => { try { return JSON.parse(localStorage.getItem(CLE)) || {}; } catch { return {}; } };
const etat = {
  d: null,
  p: Object.assign({ rythme: 'tranquille', soir31: 'fete', fini: false, jour: '29', resas: {}, actif: null, vue: null,
    joueurs: [{ id: 'j1', nom: 'Papa', rep: {}, idx: 0 }, { id: 'j2', nom: 'Maman', rep: {}, idx: 0 }, { id: 'j3', nom: 'Evan', rep: {}, idx: 0 }, { id: 'j4', nom: 'Faustine', rep: {}, idx: 0 }] }, charger()),
  sejour: null
};
// ancienne version (un seul joueur) : ses réponses deviennent celles du premier joueur
if (etat.p.reponses && Object.keys(etat.p.reponses).length && !etat.p.joueurs.some((j) => Object.keys(j.rep).length)) {
  etat.p.joueurs[0].rep = etat.p.reponses; etat.p.joueurs[0].idx = etat.p.idx || 0;
}
delete etat.p.reponses; delete etat.p.revoir; delete etat.p.idx;
etat.p.joueurs.forEach((j, i) => { j.id ||= `j${i + 1}`; });
const sauver = () => { try { localStorage.setItem(CLE, JSON.stringify(etat.p)); } catch { /* navigation privée */ } };
const changer = () => { etat.sejour = null; sauver(); };
const sejour = () => (etat.sejour ||= composerSejour(etat.d, { ...etat.p, reponses: fusion().rep }));

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const lieu = (id) => etat.d.lieux.find((l) => l.id === id);
const img = (src, alt, eager) => `<img src="${esc(src)}" alt="${esc(alt)}" ${eager ? '' : 'loading="lazy"'} decoding="async">`;
const h = (heure) => heure.replace(':', 'h');
const duree = (m) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? String(m % 60).padStart(2, '0') : ''}` : `${m} min`);
const court = (nom) => nom.split(' (')[0].split(' :')[0];

/* ---------- icônes ---------- */
const ic = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const I = {
  coeur: ic('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/>'),
  croix: ic('<path d="M6 6l12 12M18 6 6 18"/>'),
  bof: ic('<path d="M5 12h14"/>'),
  fleche: ic('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  avion: ic('<path d="M10.5 13.5 3 11l1-2 8 1 4-5c1-1 3-1 3 0s-1 2-2 3l-5 4 1 8-2 1-2.5-7.5Z"/>'),
  maison: ic('<path d="M4 11 12 4l8 7v9H4z"/><path d="M10 20v-5h4v5"/>'),
  voiture: ic('<path d="M4 16v-4l2-5h12l2 5v4z"/><path d="M4 12h16"/><circle cx="7.5" cy="16.5" r="1.5"/><circle cx="16.5" cy="16.5" r="1.5"/>'),
  pied: ic('<circle cx="13" cy="4.5" r="1.8"/><path d="m9 21 2-6 3 3v3M11 15l1-5 3 3 3 1M12 10l-3 1-2 4"/>'),
  metro: ic('<rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 11h14M8 21l2-4M16 21l-2-4"/>'),
  aller: ic('<path d="M12 21s-7-6-7-11.5a7 7 0 0 1 14 0C19 15 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>'),
  info: ic('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.6v.1"/>'),
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
  tasse: ic('<path d="M4 9h12v4a6 6 0 0 1-6 6h0a6 6 0 0 1-6-6Z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16"/>'),
  couverts: ic('<path d="M7 3v8M5 3v4a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 0-3 2-3 5s1 4 3 4v9"/>'),
  etoile: ic('<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>'),
  musee: ic('<path d="M3 21h18M5 21V10M9 21V10M15 21V10M19 21V10M2 10l10-6 10 6Z"/>'),
  calendrier: ic('<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
  ticket: ic('<path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v8a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2Z"/><path d="M13 6v12"/>'),
  couches: ic('<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>')
};
const ICONE = { visite: I.musee, balade: I.pied, repas: I.couverts, cafe: I.tasse, fete: I.etoile, soiree: I.etoile, hotel: I.maison, transfert: I.voiture, vol: I.avion, info: I.info };
const COULEUR = { visite: '#C9DD6B', balade: '#9FD8B4', repas: '#E8765C', cafe: '#B7A8F5', fete: '#F2C14E', soiree: '#F2C14E', hotel: '#FFFFFF', transfert: '#FFFFFF', vol: '#FFFFFF', info: '#FFFFFF' };
const COULEUR_JOUR = { '28': '#B7A8F5', '29': '#C9DD6B', '30': '#9FD8B4', '31': '#F2C14E', '01': '#E8765C' };
const ICONE_TRAJET = { pied: I.pied, metro: I.metro, taxi: I.voiture };

/* ==========================================================================
   ACCUEIL
   ========================================================================== */
function rendreAccueil() {
  const { hotel } = etat.d;
  const fait = etat.p.fini;
  $('#ecran-accueil').innerHTML = `
    <div class="col">
      <div class="fenetre">
        ${img('images/belvedere.jpg', 'Le Belvédère illuminé, un soir d\'hiver', true)}
        <div class="contenu">
          <span class="chip">Famille Ropars · 28 déc → 1er janv</span>
          <h1 id="titre-accueil">Vienne en famille.</h1>
          <p class="accroche">Chacun swipe ses envies, on garde les matchs : votre séjour se compose tout seul.</p>
          <div class="actions">
            ${fait
              ? `<a class="btn btn-lime" href="#programme">Voir notre programme ${I.fleche}</a><a class="btn btn-verre" href="#envies">Revoir nos envies</a>`
              : `<a class="btn btn-lime" href="#envies">Composer notre séjour ${I.fleche}</a>`}
          </div>
        </div>
        <div class="stats">
          <div><b>4</b><span>voyageurs</span></div>
          <div><b>5</b><span>jours à Vienne</span></div>
          <div><b>${DECK().length}</b><span>photos à swiper</span></div>
          <div><b>00:00</b><span>minuit sous la cathédrale</span></div>
        </div>
      </div>
    </div>

    <section class="section col">
      <div class="tete-section">
        <span class="chip">Comment ça marche</span>
        <h2>Trois étapes, c'est tout</h2>
      </div>
      <div class="trois">
        <article class="carte etape-cm"><span class="no">ÉTAPE 01</span><span class="pastille">${I.coeur}</span><h3>Chacun swipe</h3><p>Des photos, une à une : à droite j'adore, à gauche non merci. Chacun son tour.</p></article>
        <article class="carte etape-cm"><span class="no">ÉTAPE 02</span><span class="pastille">♥</span><h3>Vos matchs</h3><p>Ce que plusieurs d'entre vous adorent devient un match, prioritaire au programme.</p></article>
        <article class="carte etape-cm"><span class="no">ÉTAPE 03</span><span class="pastille">${I.couches}</span><h3>Votre programme</h3><p>Jour par jour, sur la carte de Vienne en 3D, avec le chemin.</p></article>
      </div>
    </section>

    <section class="section col-etroite">
      <div class="tete-section">
        <span class="chip">Votre voyage</span>
        <h2>Tout est prévu</h2>
      </div>
      <div class="carte lignes-info">
        <div class="ligne-info"><span class="ic">${I.avion}</span><div><b>Aller · lundi 28 décembre</b><span>Paris 11h35 → Francfort → Vienne 15h40 (Condor)</span></div></div>
        <div class="ligne-info"><span class="ic">${I.voiture}</span><div><b>Transferts aéroport ↔ hôtel</b><span class="ok">✓ Aller et retour réservés</span></div></div>
        <div class="ligne-info"><span class="ic">${I.maison}</span><div><b>${esc(hotel.nom)}</b><span>${esc(hotel.adresse)} · à 10 min du Naschmarkt</span></div></div>
        <div class="ligne-info"><span class="ic">${I.avion}</span><div><b>Retour · vendredi 1er janvier</b><span>Départ de l'hôtel 8h30 · Vienne 11h10 → Paris 15h35</span></div></div>
      </div>
    </section>
    ${pied()}`;
}

/* ==========================================================================
   QUESTIONNAIRE façon Tinder — chaque voyageur swipe, on garde les matchs
   ========================================================================== */
const DECK = () => QUESTIONNAIRE.map(lieu).filter((l) => l && (l.budget ?? 0) <= PLAFOND);
const THEME = { palais: 'Palais & Sissi', art: 'Musées', musique: 'Musique', cafes: 'Café & gâteaux', gastro: 'À table', marches: 'Marchés & fêtes', balades: 'Balade', vues: 'Vue', film: 'Before Sunrise' };
const TEINTES = ['#DCEB86', '#B7A8F5', '#9FD8B4', '#F2C14E'];
const VAL = { oui: 1, peutetre: 0.45, non: 0 };
const vibrer = (ms = 12) => { try { navigator.vibrate?.(ms); } catch { /* rien */ } };

const joueurActif = () => etat.p.joueurs[etat.p.actif];
const nbRepondu = (j) => DECK().filter((l) => j.rep[l.id]).length;

/** Fusion des réponses de la famille → une réponse par lieu pour l'algorithme */
function fusion() {
  const rep = {}, matchs = {};
  for (const l of DECK()) {
    const votes = etat.p.joueurs.filter((j) => j.rep[l.id]).map((j) => ({ nom: j.nom, v: j.rep[l.id] }));
    if (!votes.length) continue;
    const moy = votes.reduce((s, x) => s + VAL[x.v], 0) / votes.length;
    rep[l.id] = moy >= 0.7 ? 'oui' : moy >= 0.35 ? 'peutetre' : 'non';
    const fans = votes.filter((x) => x.v === 'oui').map((x) => x.nom);
    if (fans.length >= 2 || (fans.length === 1 && votes.length === 1 && etat.p.joueurs.filter((j) => nbRepondu(j)).length === 1)) matchs[l.id] = fans;
    if (fans.length >= 2 && rep[l.id] !== 'oui') rep[l.id] = 'oui'; // un vrai match passe en priorité
  }
  return { rep, matchs };
}

function avatar(j, i, taille = 44) {
  return `<span class="avatar" style="--t:${taille}px;background:${TEINTES[i % TEINTES.length]}">${esc(j.nom.slice(0, 1).toUpperCase())}</span>`;
}

function rendreEnvies() {
  const p = etat.p;
  const el = $('#ecran-envies');
  if (p.vue === 'matchs') return rendreMatchs(el);
  if (p.vue === 'questions') return rendreQuestions(el);
  if (p.actif === null || p.actif === undefined || !joueurActif()) return rendreJoueurs(el);
  const j = joueurActif();
  if (j.idx >= DECK().length) return rendreBravo(el, j);
  rendrePile(el, j);
}

/* ---------- 1. Qui joue ? ---------- */
function rendreJoueurs(el) {
  const total = DECK().length;
  const { matchs } = fusion();
  const nbMatchs = Object.keys(matchs).length;
  el.innerHTML = `
    <div class="col-etroite section" style="padding-top:20px">
      <div class="tete-section">
        <span class="chip">Nos envies</span>
        <h2 id="titre-envies">Qui joue ?</h2>
        <p>Chacun swipe les photos de son côté. Ce que plusieurs d'entre vous adorent devient un <b>match</b>, et passe en priorité dans le programme.</p>
      </div>
      <div class="joueurs">
        ${p_joueurs().map((j, i) => {
          const n = nbRepondu(j);
          return `
          <div class="joueur ${n >= total ? 'fini' : ''}">
            <button type="button" class="joueur-jouer" data-jouer="${i}">
              ${avatar(j, i, 56)}
              <span class="joueur-txt"><b>${esc(j.nom)}</b><span>${n >= total ? '✓ Terminé' : n ? `${n} / ${total} photos` : 'Pas encore commencé'}</span>
                <span class="joueur-barre"><i style="width:${(n / total) * 100}%"></i></span></span>
              <span class="joueur-go">${n >= total ? 'Revoir' : n ? 'Continuer' : 'Jouer'}</span>
            </button>
            <button type="button" class="joueur-nom" data-renommer="${i}" aria-label="Changer le prénom de ${esc(j.nom)}">✎</button>
          </div>`;
        }).join('')}
      </div>
      <div style="display:grid;gap:10px;margin-top:22px">
        ${nbMatchs ? `<button type="button" class="btn btn-lime" data-action="matchs">♥ Voir nos ${nbMatchs} match${nbMatchs > 1 ? 's' : ''}</button>` : ''}
        ${etat.p.fini ? `<a class="btn btn-blanc" href="#programme">Voir le programme ${I.fleche}</a>` : ''}
      </div>
      <p class="petit" style="text-align:center;margin-top:18px;color:#10233D">${SYNC.actif
        ? `Chacun peut jouer sur son propre téléphone : les réponses se rassemblent toutes seules.${attente().length ? ` Il manque encore : ${attente().join(', ')}.` : ' <b>Tout le monde a répondu ✓</b>'}`
        : 'Chacun sur son téléphone ? Jouez, puis touchez « Envoyer mes réponses » : un lien à envoyer par WhatsApp à celui qui garde le programme.'}</p>
    </div>`;
}
const p_joueurs = () => etat.p.joueurs;

/* ---------- 2. La pile de cartes ---------- */
function carteHTML(l, rang) {
  return `
    <article class="carte-quiz ${rang === 0 ? 'dessus' : ''}" style="--rang:${rang}" ${rang === 0 ? 'id="carte-quiz"' : 'aria-hidden="true"'}>
      <div class="photo">${img(l.photos[0], l.nom, rang < 2)}
        <span class="tag">${esc(THEME[l.categories[0]] || '')}</span>
        ${rang === 0 ? `<span class="tampon oui">J'ADORE</span><span class="tampon non">NON MERCI</span><span class="tampon bof">POURQUOI PAS</span>
          <button type="button" class="info-btn" data-action="plus" aria-label="En savoir plus">i</button>
          <p class="plus-texte" hidden>${esc(l.description)}${l.film ? ` ${esc(l.film)}` : ''}</p>` : ''}
      </div>
      <div class="txt">
        <h2 ${rang === 0 ? 'id="titre-envies"' : ''}>${esc(court(l.nom))}</h2>
        <p class="phrase">${esc(l.sousTitre)}</p>
      </div>
    </article>`;
}

function rendrePile(el, j) {
  const deck = DECK();
  const i = etat.p.actif;
  const cartes = [2, 1, 0].map((r) => deck[j.idx + r] && carteHTML(deck[j.idx + r], r)).filter(Boolean).join('');
  el.innerHTML = `
    <div class="col-etroite quiz">
      <div class="quiz-haut">
        <button type="button" class="chip joueur-chip" data-action="joueurs">${avatar(j, i, 24)} ${esc(j.nom)} · changer</button>
        <span class="chip" style="margin:0">${j.idx + 1} / ${deck.length}</span>
      </div>
      <div class="quiz-barre" aria-hidden="true"><span style="width:${((j.idx + 1) / deck.length) * 100}%"></span></div>
      <div class="pile">${cartes}</div>
      <div class="reponses" role="group" aria-label="Votre réponse">
        <button type="button" class="rond-btn petit" data-action="annuler" ${j.idx === 0 ? 'disabled' : ''} aria-label="Annuler la dernière réponse">↺<small>Annuler</small></button>
        <button type="button" class="rond-btn non" data-rep="non" aria-label="Non merci">${I.croix}<small>Non merci</small></button>
        <button type="button" class="rond-btn bof" data-rep="peutetre" aria-label="Pourquoi pas">${I.bof}<small>Pourquoi pas</small></button>
        <button type="button" class="rond-btn oui" data-rep="oui" aria-label="J'adore">${I.coeur}<small>J'adore</small></button>
      </div>
      <p class="quiz-bas">← non · ↑ pourquoi pas · j'adore →</p>
    </div>`;
  activerGlisser();
  const suiv = deck[j.idx + 3]; if (suiv) new Image().src = suiv.photos[0];
}

function repondre(valeur) {
  const j = joueurActif();
  const l = DECK()[j?.idx];
  if (!l) return;
  if (valeur) j.rep[l.id] = valeur; else delete j.rep[l.id];
  pousserJoueur(j);
  changer();
  vibrer(valeur === 'oui' ? 25 : 12);
  const carte = $('#carte-quiz');
  if (carte) { carte.style.transition = ''; carte.style.transform = ''; carte.classList.add(valeur === 'oui' ? 'sort-droite' : valeur === 'non' ? 'sort-gauche' : 'sort-haut'); }
  // Match ? quelqu'un d'autre adore aussi
  if (valeur === 'oui') {
    const autres = etat.p.joueurs.filter((x) => x !== j && x.rep[l.id] === 'oui').map((x) => x.nom);
    if (autres.length) setTimeout(() => montrerMatch(l, autres), 280);
  }
  setTimeout(() => { j.idx++; sauver(); rendreEnvies(); }, 260);
}

function annuler() {
  const j = joueurActif();
  if (!j || j.idx === 0) return;
  j.idx--;
  delete j.rep[DECK()[j.idx].id];
  pousserJoueur(j);
  changer(); vibrer(8); rendreEnvies();
}

function montrerMatch(l, autres) {
  $('.match')?.remove();
  const m = document.createElement('div');
  m.className = 'match';
  m.setAttribute('role', 'status');
  m.innerHTML = `<div class="match-carte">${img(l.photos[0], l.nom, true)}<div><b>C'est un match !</b><span>${esc(autres.join(' et '))} ${autres.length > 1 ? 'adorent' : 'adore'} aussi ${esc(court(l.nom))} ♥</span></div></div>`;
  document.body.appendChild(m);
  vibrer([20, 60, 20]);
  setTimeout(() => m.classList.add('part'), 2000);
  setTimeout(() => m.remove(), 2500);
}

function activerGlisser() {
  const carte = $('#carte-quiz');
  if (!carte) return;
  let x0 = null, y0 = 0, dx = 0, dy = 0;
  const t = { oui: $('.tampon.oui', carte), non: $('.tampon.non', carte), bof: $('.tampon.bof', carte) };
  carte.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; x0 = e.clientX; y0 = e.clientY; dx = dy = 0; carte.setPointerCapture(e.pointerId); carte.style.transition = 'none'; });
  carte.addEventListener('pointermove', (e) => {
    if (x0 === null) return;
    dx = e.clientX - x0; dy = e.clientY - y0;
    carte.style.transform = `translate(${dx}px, ${Math.min(0, dy)}px) rotate(${dx / 22}deg)`;
    t.oui.style.opacity = Math.max(0, Math.min(1, dx / 90));
    t.non.style.opacity = Math.max(0, Math.min(1, -dx / 90));
    t.bof.style.opacity = Math.abs(dx) < 50 ? Math.max(0, Math.min(1, -dy / 90)) : 0;
  });
  const fin = () => {
    if (x0 === null) return;
    x0 = null;
    Object.values(t).forEach((x) => { x.style.opacity = 0; });
    if (dx > 90) return repondre('oui');
    if (dx < -90) return repondre('non');
    if (dy < -90 && Math.abs(dx) < 60) return repondre('peutetre');
    carte.style.transition = 'transform .3s cubic-bezier(.3,1.5,.5,1)'; carte.style.transform = '';
  };
  carte.addEventListener('pointerup', fin);
  carte.addEventListener('pointercancel', fin);
}

/* ---------- 3. Bravo, puis matchs ---------- */
function rendreBravo(el, j) {
  const { matchs } = fusion();
  const restants = etat.p.joueurs.filter((x) => nbRepondu(x) < DECK().length);
  el.innerHTML = `
    <div class="col-etroite section" style="padding-top:20px">
      <div class="carte" style="text-align:center;padding:30px 22px">
        ${avatar(j, etat.p.actif, 72)}
        <h2 id="titre-envies" style="font-size:clamp(2.2rem,7vw,3rem);margin-top:14px">Bravo ${esc(j.nom)} !</h2>
        <p style="color:var(--gris);margin-top:10px">${Object.values(j.rep).filter((v) => v === 'oui').length} coups de cœur. ${Object.keys(matchs).length ? `La famille a déjà <b>${Object.keys(matchs).length} match${Object.keys(matchs).length > 1 ? 's' : ''}</b>.` : ''}</p>
        <div style="display:grid;gap:10px;margin-top:22px">
          ${restants.length ? `<button type="button" class="btn btn-lime" data-action="joueurs">Passer le téléphone à ${esc(restants[0].nom)} ${I.fleche}</button>` : ''}
          <button type="button" class="btn ${restants.length ? 'btn-blanc' : 'btn-lime'}" data-action="matchs">♥ Voir nos matchs</button>
          ${SYNC.actif ? '<p class="petit" style="margin:4px 0">✓ Vos réponses sont envoyées automatiquement à la famille.</p>' : '<button type="button" class="btn btn-gris" data-action="partager">Envoyer mes réponses (WhatsApp…)</button>'}
          <button type="button" class="lien-simple" data-action="recommencer">Revoir mes photos depuis le début</button>
        </div>
      </div>
    </div>`;
}

function rendreMatchs(el) {
  const { matchs, rep } = fusion();
  const joueurs = etat.p.joueurs;
  const liste = DECK().filter((l) => matchs[l.id]).sort((a, b) => matchs[b.id].length - matchs[a.id].length);
  const ok = DECK().filter((l) => rep[l.id] === 'oui' && !matchs[l.id]);
  el.innerHTML = `
    <div class="col section" style="padding-top:20px">
      <div class="tete-section">
        <span class="chip">♥ Nos matchs</span>
        <h2 id="titre-envies">${liste.length ? `${liste.length} match${liste.length > 1 ? 's' : ''} en famille` : 'Pas encore de match'}</h2>
        <p>${liste.length ? 'Ce que plusieurs d\'entre vous adorent. Ce sera au programme en priorité.' : 'Quand au moins deux personnes adorent le même lieu, il apparaît ici.'}</p>
      </div>
      <div class="grille-matchs">
        ${liste.map((l) => `
          <div class="match-tuile">
            ${img(l.photos[0], l.nom)}
            <span class="match-noms">${matchs[l.id].map((n) => { const i = joueurs.findIndex((x) => x.nom === n); return avatar(joueurs[i], i, 28); }).join('')}</span>
            <b>${esc(court(l.nom))}</b>
          </div>`).join('')}
      </div>
      ${ok.length ? `<p style="text-align:center;margin-top:20px;color:#10233D">Aussi aimés : ${ok.map((l) => esc(court(l.nom))).join(', ')}.</p>` : ''}
      <div class="col-etroite" style="display:grid;gap:10px;margin-top:26px">
        <button type="button" class="btn btn-lime" data-action="questions-ouvrir">Créer notre programme ${I.fleche}</button>
        <button type="button" class="btn btn-blanc" data-action="joueurs">Retour aux joueurs</button>
      </div>
    </div>`;
}

function rendreQuestions(el) {
  const p = etat.p;
  const opt = (g, v, t, d) => `<button type="button" role="radio" data-choix="${g}" data-val="${v}" aria-checked="${p[g] === v}"><span class="rond"></span><span><b>${t}</b><span class="d">${d}</span></span></button>`;
  el.innerHTML = `
    <div class="col-etroite section" style="padding-top:20px">
      <div class="carte">
        <span class="mono">Pour toute la famille</span>
        <h2 id="titre-envies" style="font-size:clamp(2.2rem,7vw,3rem);margin-top:10px">Deux questions</h2>
        <h3 style="font-size:1.5rem;font-weight:700;margin-top:24px">Votre rythme</h3>
        <div class="choix" role="radiogroup" aria-label="Rythme">
          ${opt('rythme', 'tranquille', 'Tranquille', '2 visites par jour, des pauses, une sieste')}
          ${opt('rythme', 'actif', 'Plus actif', '3 à 4 visites par jour')}
        </div>
        <h3 style="font-size:1.5rem;font-weight:700">Le soir du 31 décembre</h3>
        <div class="choix" role="radiogroup" aria-label="Soirée du 31">
          ${opt('soir31', 'fete', 'La fête dans les rues', 'Musique, vin chaud, minuit sous la cathédrale')}
          ${opt('soir31', 'calme', 'Une soirée calme', 'Un bon dîner, minuit à l\'hôtel')}
        </div>
        <button type="button" class="btn btn-lime btn-plein" data-action="terminer">Voir notre programme ${I.fleche}</button>
      </div>
    </div>`;
}

/* ---------- 4. Partage des réponses par lien ---------- */
const CODE = { oui: 'o', peutetre: 'p', non: 'n' };
const DECODE = { o: 'oui', p: 'peutetre', n: 'non' };
async function partager() {
  const j = joueurActif();
  if (!j) return;
  const code = DECK().map((l) => CODE[j.rep[l.id]] || '-').join('');
  const url = `${location.origin}${location.pathname}#import=${encodeURIComponent(j.nom)}.${code}`;
  const texte = `Mes envies pour Vienne (${j.nom}) : ${url}`;
  try {
    if (navigator.share) await navigator.share({ title: 'Mes envies pour Vienne', text: texte, url });
    else { await navigator.clipboard.writeText(url); alerte('Lien copié : collez-le dans WhatsApp ✓'); }
  } catch { /* partage annulé */ }
}
function importer(hash) {
  const [nomEnc, code] = hash.replace('#import=', '').split('.');
  const nom = decodeURIComponent(nomEnc || '').trim().slice(0, 20) || 'Invité';
  if (!code) return;
  const rep = {};
  DECK().forEach((l, i) => { if (DECODE[code[i]]) rep[l.id] = DECODE[code[i]]; });
  let j = etat.p.joueurs.find((x) => x.nom.toLowerCase() === nom.toLowerCase());
  if (!j) {
    j = etat.p.joueurs.find((x) => !nbRepondu(x)) || (etat.p.joueurs.push({ nom, rep: {}, idx: 0 }), etat.p.joueurs.at(-1));
    j.nom = nom;
  }
  j.rep = rep; j.idx = DECK().length;
  pousserJoueur(j);
  etat.p.vue = 'matchs';
  changer();
  alerte(`Réponses de ${nom} ajoutées ✓`);
}
/* ---------- 5. Le programme final en un seul lien ---------- */
const b64 = (txt) => btoa(unescape(encodeURIComponent(txt))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const deb64 = (txt) => decodeURIComponent(escape(atob(txt.replace(/-/g, '+').replace(/_/g, '/'))));

async function partagerFamille() {
  const deck = DECK();
  const paquet = {
    j: etat.p.joueurs.filter((j) => nbRepondu(j)).map((j) => [j.nom, deck.map((l) => CODE[j.rep[l.id]] || '-').join('')]),
    r: etat.p.rythme === 'actif' ? 'a' : 't',
    s: etat.p.soir31 === 'calme' ? 'c' : 'f'
  };
  const url = `${location.origin}${location.pathname}#famille=${b64(JSON.stringify(paquet))}`;
  const texte = 'Notre programme pour Vienne 🇦🇹 : ouvrez ce lien, tout est prêt !';
  try {
    if (navigator.share) await navigator.share({ title: 'Notre programme pour Vienne', text: texte, url });
    else { await navigator.clipboard.writeText(url); alerte('Lien copié : collez-le dans WhatsApp ✓'); }
  } catch { /* partage annulé */ }
}

function chargerFamille(hash) {
  try {
    const paquet = JSON.parse(deb64(hash.replace('#famille=', '')));
    const deck = DECK();
    for (const [nom, code] of paquet.j || []) {
      const rep = {};
      deck.forEach((l, i) => { if (DECODE[code[i]]) rep[l.id] = DECODE[code[i]]; });
      let j = etat.p.joueurs.find((x) => x.nom.toLowerCase() === String(nom).toLowerCase());
      if (!j) { j = etat.p.joueurs.find((x) => !nbRepondu(x)); if (!j) { j = { nom, rep: {}, idx: 0 }; etat.p.joueurs.push(j); } }
      Object.assign(j, { nom: String(nom).slice(0, 20), rep, idx: deck.length });
      pousserJoueur(j);
    }
    Object.assign(etat.p, { rythme: paquet.r === 'a' ? 'actif' : 'tranquille', soir31: paquet.s === 'c' ? 'calme' : 'fete', fini: true, actif: null, vue: null, jour: '29' });
    changer();
    alerte('Programme de la famille chargé ✓');
    return true;
  } catch (e) { console.error(e); alerte('Ce lien ne fonctionne pas, redemandez-le.'); return false; }
}

function boutonFamille() {
  const n = etat.p.joueurs.filter((j) => nbRepondu(j)).length;
  return `<div class="partage-famille">
      <div><b>Envoyer ce programme à la famille</b><span>${n ? `Avec les réponses de ${etat.p.joueurs.filter((j) => nbRepondu(j)).map((j) => esc(j.nom)).join(', ')}.` : 'Programme type, sans réponses.'} Un seul lien : chacun l'ouvre et voit le même séjour.</span></div>
      <button type="button" class="btn btn-noir" data-action="partager-famille">Partager ↗</button>
    </div>`;
}

function alerte(texte) {
  $('.alerte-flot')?.remove();
  const a = document.createElement('div');
  a.className = 'alerte-flot'; a.setAttribute('role', 'status'); a.textContent = texte;
  document.body.appendChild(a);
  setTimeout(() => a.remove(), 2600);
}

/* ==========================================================================
   PROGRAMME : carte 3D + étapes
   ========================================================================== */
const C3D = { map: null, pret: false, pins: [], etapes: [], idx: 0, tour: false };

function rendreProgramme() {
  const el = $('#ecran-programme');
  if (!$('#map3d')) {
    el.innerHTML = `
      <div class="col">
        <div class="c3d">
          <div class="map3d" id="map3d" role="img" aria-label="Carte 3D de Vienne avec les étapes du jour"></div>
          <div class="panneau p-jours">
            <span class="mono">Vienne, jour par jour</span>
            <p class="titre-jour" id="c-titre"></p>
            <div class="c-jours" id="c-jours"></div>
          </div>
          <div class="panneau p-zoom">
            <button type="button" data-zoom="1" aria-label="Zoomer">+</button>
            <button type="button" data-zoom="-1" aria-label="Dézoomer">−</button>
          </div>
          <button type="button" class="p-ensemble" data-action="ensemble">Vue d'ensemble</button>
          <div class="panneau p-etape" id="p-etape" aria-live="polite"></div>
        </div>
      </div>
      <div class="col-etroite" id="liste-jour"></div>
      ${pied()}`;
    initCarte();
  }
  afficherJour();
}

function afficherJour() {
  const s = sejour();
  const j = s.jours.find((x) => x.id === etat.p.jour) || s.jours[1];
  etat.p.jour = j.id;
  arreterTour();

  // Panneau des jours
  $('#c-titre').innerHTML = `${esc(j.court)}<b>${esc(j.titre)}</b>`;
  $('#c-jours').innerHTML = s.jours.map((x) => `<button type="button" class="c-jour" data-jour="${x.id}" aria-pressed="${x.id === j.id}" style="--c:${COULEUR_JOUR[x.id]}"><i></i>${esc(x.court)}</button>`).join('');

  // Liste des étapes
  let prec = { lat: etat.d.hotel.lat, lng: etat.d.hotel.lng };
  const avecLieu = j.etapes.filter((e) => e.lieu);
  C3D.etapes = avecLieu.filter((e, i) => !(e.genre === 'hotel' && i > 0));
  const items = j.etapes.map((e) => { const html = rendreEtape(e, prec); if (e.lieu) prec = e.lieu; return html; }).join('');
  $('#liste-jour').innerHTML = `
    <div class="jour-tete">
      <span class="mono">${esc(j.long)}</span>
      <h2 id="titre-programme">${esc(j.titre)}</h2>
      <p>${esc(j.intro)}</p>
    </div>
    ${SYNC.actif && attente().length ? `<div class="bandeau">⏳ Programme provisoire. En attente de : <b>${attente().join(', ')}</b>. Il se mettra à jour tout seul.</div>` : SYNC.actif && SYNC.tousFinis ? '<div class="bandeau">✓ <b>Tout le monde a répondu</b> : voici votre programme final.</div>' : ''}
    ${!SYNC.actif && !etat.p.fini ? '<div class="bandeau">Programme type. <a href="#envies"><b>Swipez les photos</b></a> pour qu\'il vous ressemble.</div>' : ''}
    ${s.nonPlaces.length && (j.id === '29' || j.id === '30') ? `<div class="bandeau">Pas eu la place pour : <b>${s.nonPlaces.map((l) => esc(court(l.nom))).join(', ')}</b>.${etat.p.rythme === 'tranquille' ? ' <button type="button" class="lien-simple" data-action="actif" style="padding:0">Passer au rythme plus actif</button>' : ''}</div>` : ''}
    ${etat.p.fini && j.id === '28' ? boutonFamille() : ''}
    <ol class="programme">${items}</ol>
    ${etat.p.fini ? boutonFamille() : ''}
    <p style="margin-top:20px"><a class="btn btn-blanc btn-plein" href="${lienJournee(j, etat.d.hotel)}" target="_blank" rel="noopener">Toute la journée dans Google Maps ↗</a></p>`;

  // Carte
  C3D.idx = 0;
  majEtapeCarte();
  if (C3D.pret) dessinerJour(j);
}

function restaurants(mode) {
  const ids = mode === 'fete' ? ['vienna1st', 'rathauskeller'] : ['wienerwirtschaft'];
  return `<div class="restos">${(etat.d.voyage.restaurants31 || []).filter((r) => ids.includes(r.id)).map((r) => `
      <div class="resto"><b>${esc(r.nom)}</b><span>${esc(r.quartier)}</span><p>${esc(r.description)}</p>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          ${r.url ? `<a class="btn btn-noir btn-petit" href="${esc(r.url)}" target="_blank" rel="noopener">Réserver ↗</a>` : ''}
          <a class="btn btn-blanc btn-petit" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.nom + ', ' + r.adresse)}" target="_blank" rel="noopener">${I.aller} Plan</a>
        </div></div>`).join('')}
      <p class="petit" style="margin:0">Menus du Nouvel An publiés en novembre : à réserver tôt, pour 4.</p></div>`;
}

function rendreEtape(e, prec) {
  const trajet = e.trajet ? `<li class="trajet">${ICONE_TRAJET[e.trajet.mode] || I.pied}${esc(e.trajet.texte)}</li>` : '';
  const idxCarte = C3D.etapes.indexOf(e);
  const voirCarte = idxCarte >= 0 ? `<button type="button" class="btn btn-gris btn-petit" data-aller="${idxCarte}">${I.couches} Sur la carte</button>` : '';
  const yAller = e.lieu && e.genre !== 'hotel' ? `<a class="btn btn-noir btn-petit" href="${lienYAller(prec, e.lieu)}" target="_blank" rel="noopener">${I.aller} Y aller</a>` : '';
  const aDetails = e.description || e.astuce || e.horairesNote || e.film;
  const details = aDetails ? `<button type="button" class="btn btn-gris btn-petit" data-action="details" aria-expanded="false">Détails</button>` : '';
  const blocDetails = aDetails ? `<div class="details" hidden>
      ${e.description ? `<p>${esc(e.description)}</p>` : ''}
      ${e.film ? `<p class="film">🎬 ${esc(e.film)}</p>` : ''}
      ${e.astuce ? `<p class="astuce"><b>Astuce :</b> ${esc(e.astuce)}</p>` : ''}
      ${e.acces && e.genre !== 'hotel' ? `<p class="note"><b>Accès :</b> ${esc(e.acces)}</p>` : ''}
      ${e.horairesNote ? `<p class="note"><b>Horaires :</b> ${esc(e.horairesNote)}</p>` : ''}
    </div>` : '';

  if (!e.photo) {
    return `${trajet}<li class="etape simple"><span class="ic">${ICONE[e.genre] || I.info}</span>
      <div><span class="heure">${h(e.heure)}</span><h3>${esc(e.titre)}</h3>${e.phrase ? `<p class="phrase">${esc(e.phrase)}</p>` : ''}</div>
      ${e.restaurants || yAller || details ? `<div class="plein">${e.restaurants ? restaurants(e.restaurants) : ''}${yAller || details ? `<div class="actions" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">${yAller}${voirCarte}${details}</div>` : ''}${blocDetails}</div>` : ''}
    </li>`;
  }
  const fans = e.id && fusion().matchs[e.id];
  const meta = [fans && fans.length ? `<li class="coeur">♥ ${fans.length > 1 ? 'Match' : 'Coup de cœur'} : ${esc(fans.join(', '))}</li>` : e.aime ? '<li class="coeur">♥ Coup de cœur</li>' : '', e.prix ? `<li>${esc(e.prix)}</li>` : '', e.duree ? `<li>${duree(e.duree)}</li>` : ''].join('');
  return `${trajet}<li class="etape">
    <div class="visuel">${img(e.photo, e.titre)}<span class="heure-verre">${h(e.heure)}</span>${e.numero ? `<span class="num">${e.numero}</span>` : ''}</div>
    <div class="corps">
      <h3>${esc(e.titre)}</h3>
      ${e.phrase ? `<p class="phrase">${esc(e.phrase)}</p>` : ''}
      ${meta ? `<ul class="meta">${meta}</ul>` : ''}
      ${e.restaurants ? restaurants(e.restaurants) : ''}
      <div class="actions">${yAller}${voirCarte}${details}</div>
      ${blocDetails}
    </div>
  </li>`;
}

/* ---------- carte 3D (MapLibre + bâtiments OpenFreeMap) ---------- */
const estMobile = () => window.matchMedia('(max-width: 899px)').matches;
const marges = () => (estMobile() ? { top: 80, bottom: 220, left: 30, right: 60 } : { top: 60, bottom: 60, left: 380, right: 80 });

function initCarte() {
  if (!window.maplibregl) { $('#map3d').innerHTML = '<p style="padding:120px 20px;text-align:center">La carte n\'a pas pu se charger.</p>'; return; }
  C3D.pret = false;
  const map = new maplibregl.Map({ container: 'map3d', style: 'https://tiles.openfreemap.org/styles/liberty', center: [16.366, 48.203], zoom: 13.4, pitch: 58, bearing: -17, maxPitch: 75, attributionControl: { compact: true } });
  C3D.map = map;
  map.on('load', () => {
    if (map.getLayer('building-3d')) {
      map.setPaintProperty('building-3d', 'fill-extrusion-color', ['interpolate', ['linear'], ['get', 'render_height'], 0, '#EFE9DC', 40, '#E2D9C6']);
      map.setPaintProperty('building-3d', 'fill-extrusion-opacity', 0.92);
    }
    map.addSource('trajet', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({ id: 'trajet-ombre', type: 'line', source: 'trajet', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#1E2125', 'line-width': 9, 'line-opacity': 0.18, 'line-blur': 3 } });
    map.addLayer({ id: 'trajet', type: 'line', source: 'trajet', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#FFFFFF', 'line-width': 4.5, 'line-dasharray': [0.6, 1.8] } });
    C3D.pret = true;
    dessinerJour(sejour().jours.find((x) => x.id === etat.p.jour));
  });
}

function courbe(points) {
  const out = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i], [x2, y2] = points[i + 1];
    const s = i % 2 ? 1 : -1, cx = (x1 + x2) / 2 - (y2 - y1) * 0.18 * s, cy = (y1 + y2) / 2 + (x2 - x1) * 0.18 * s;
    for (let t = 0; t <= 1; t += 0.1) out.push([(1 - t) ** 2 * x1 + 2 * (1 - t) * t * cx + t * t * x2, (1 - t) ** 2 * y1 + 2 * (1 - t) * t * cy + t * t * y2]);
  }
  return out;
}

function dessinerJour(j) {
  if (!C3D.map || !C3D.pret || !j) return;
  C3D.pins.forEach((m) => m.remove());
  C3D.pins = C3D.etapes.map((e, i) => {
    const el = document.createElement('div');
    el.className = 'pin';
    el.style.setProperty('--c', COULEUR[e.genre] || '#fff');
    el.innerHTML = `<span class="pin-tete">${ICONE[e.genre] || I.info}${e.numero && e.genre !== 'hotel' ? `<span class="pin-num">${e.numero}</span>` : ''}</span><span class="pin-tige"></span>`;
    el.title = e.titre;
    el.addEventListener('click', (ev) => { ev.stopPropagation(); arreterTour(); allerA(i); });
    return new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([e.lieu.lng, e.lieu.lat]).addTo(C3D.map);
  });
  const coords = j.etapes.filter((e) => e.lieu).map((e) => [e.lieu.lng, e.lieu.lat]);
  C3D.map.getSource('trajet').setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: coords.length > 1 ? courbe(coords) : coords } });
  majEtapeCarte();
  vueEnsemble();
}

function vueEnsemble() {
  if (!C3D.pret || !C3D.etapes.length) return;
  const b = new maplibregl.LngLatBounds();
  C3D.etapes.forEach((e) => b.extend([e.lieu.lng, e.lieu.lat]));
  const boite = C3D.map.getContainer().getBoundingClientRect();
  if (boite.width < 200 || boite.height < 200) return; // carte cachée : on attendra qu'elle soit visible
  const cam = C3D.map.cameraForBounds(b, { padding: marges(), maxZoom: 15.4 });
  const c = cam && maplibregl.LngLat.convert(cam.center);
  if (cam && Number.isFinite(c.lng) && Number.isFinite(c.lat) && Number.isFinite(cam.zoom)) C3D.map.flyTo({ center: cam.center, zoom: cam.zoom + 0.1, pitch: 58, bearing: -17, duration: 1600, essential: true });
}

function allerA(i) {
  C3D.idx = Math.max(0, Math.min(i, C3D.etapes.length - 1));
  majEtapeCarte();
  const e = C3D.etapes[C3D.idx];
  if (C3D.pret && e) C3D.map.flyTo({ center: [e.lieu.lng, e.lieu.lat], zoom: e.genre === 'transfert' ? 12 : 16.3, pitch: 64, bearing: -30 + (C3D.idx % 3) * 25, duration: 2300, essential: true, padding: marges() });
}

function majEtapeCarte() {
  const el = $('#p-etape');
  const e = C3D.etapes[C3D.idx];
  if (!el) return;
  if (!e) { el.hidden = true; return; }
  el.hidden = false;
  C3D.pins.forEach((m, k) => m.getElement().classList.toggle('actif', k === C3D.idx));
  el.innerHTML = `
    <div class="txt">
      <span class="mono" style="color:#3F4448">Étape ${C3D.idx + 1} / ${C3D.etapes.length}</span>
      <h3>${h(e.heure)}<b>${esc(e.titre)}</b></h3>
      <p>${esc(e.phrase || '')}</p>
      <div class="nav-e">
        <button type="button" data-pas="-1" aria-label="Étape précédente" ${C3D.idx === 0 ? 'disabled' : ''}>‹</button>
        <button type="button" class="tour" data-action="tour">${C3D.tour ? 'Stop ■' : '▶ Visite'}</button>
        <button type="button" data-pas="1" aria-label="Étape suivante" ${C3D.idx === C3D.etapes.length - 1 ? 'disabled' : ''}>›</button>
      </div>
    </div>
    <div class="photo">${e.photo ? img(e.photo, e.titre, true) : `<span class="ic">${ICONE[e.genre] || I.info}</span>`}</div>`;
}

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
async function lancerTour() {
  if (C3D.tour) { arreterTour(); return; }
  if (!C3D.pret) return;
  C3D.tour = true; majEtapeCarte();
  for (let i = 0; i < C3D.etapes.length && C3D.tour; i++) {
    allerA(i);
    await new Promise((r) => C3D.map.once('moveend', r));
    await attendre(2400);
  }
  if (C3D.tour) { C3D.tour = false; majEtapeCarte(); vueEnsemble(); }
}
function arreterTour() { if (C3D.tour) { C3D.tour = false; C3D.map?.stop(); majEtapeCarte(); } }

/* ==========================================================================
   INFOS
   ========================================================================== */
const MOTS = ['Grüß Gott!', 'Bitte', 'Danke schön!', 'Entschuldigung', 'Einen Tisch für vier, bitte.', 'Eine Melange, bitte.', 'Zahlen, bitte!', 'Stimmt so.', 'Sprechen Sie Französisch?', 'Wo ist die Toilette?', 'Prost!', 'Prosit Neujahr!'];
const GOUTS = ['Wiener Schnitzel', 'Sachertorte', 'Apfelstrudel', 'Kaiserschmarrn', 'Wiener Melange', 'Punsch'];

function aReserver() {
  const out = [], vus = new Set();
  for (const j of sejour().jours) for (const e of j.etapes) {
    if (e.reserver) out.push({ id: 'diner31', titre: 'Le dîner du Nouvel An', quand: `${j.long} · ${h(e.heure)}`, urgent: true, lien: '#programme', texte: 'Voir les adresses', jour: '31' });
    const l = e.id && lieu(e.id);
    if (!l || !l.resa || vus.has(l.id) || !['urgent', 'bientot', 'avant'].includes(l.resa.niveau)) continue;
    vus.add(l.id);
    out.push({ id: l.id, titre: court(l.nom), quand: `${j.long} · ${h(e.heure)}`, urgent: l.resa.niveau !== 'avant', lien: l.resa.url, texte: `${l.resa.site} ↗` });
  }
  return out.sort((a, b) => b.urgent - a.urgent);
}

function rendreInfos() {
  const { voyage, hotel, lexique, specialites } = etat.d;
  const mots = lexique.groupes.flatMap((g) => g.mots).filter((m) => MOTS.includes(m.de));
  const gouts = specialites.sections.flatMap((s) => s.items).filter((i) => GOUTS.includes(i.nom));
  const resas = aReserver();
  const voix = 'speechSynthesis' in window;
  $('#ecran-infos').innerHTML = `
    <div class="col section" style="padding-top:20px">
      <div class="tete-section">
        <span class="chip">Infos pratiques</span>
        <h2 id="titre-infos">Bon à savoir</h2>
      </div>
      <div class="grille-infos">
        <article class="carte">
          <span class="mono">D'après votre programme</span>
          <h3 class="titre-carte">À réserver</h3>
          ${resas.length ? `<div class="resas">${resas.map((r) => { const fait = etat.p.resas[r.id]; return `
            <div class="resa ${fait ? 'faite' : ''}">
              <b>${esc(r.titre)}</b><span class="quand ${r.urgent && !fait ? 'urgent' : ''}">${r.urgent && !fait ? 'À faire tôt · ' : ''}${esc(r.quand)}</span>
              <div class="boutons">
                ${r.lien ? `<a class="btn btn-noir btn-petit" href="${esc(r.lien)}" ${r.lien.startsWith('#') ? `data-jour-lien="${r.jour}"` : 'target="_blank" rel="noopener"'}>${esc(r.texte)}</a>` : ''}
                <button type="button" class="case" data-resa="${r.id}" aria-pressed="${!!fait}">${fait ? '✓ Réservé' : 'Pas encore réservé'}</button>
              </div>
            </div>`; }).join('')}</div>` : '<p>Rien à réserver.</p>'}
        </article>

        <article class="carte">
          <span class="mono">Votre voyage</span>
          <h3 class="titre-carte">Vols, hôtel, transferts</h3>
          <div class="lignes-info">
            ${voyage.vols.aller.segments.map((s) => `<div class="ligne-info"><span class="ic">${I.avion}</span><div><b>Lun 28 · ${s.depart} → ${s.arrivee}</b><span>${esc(s.de)} → ${esc(s.a)} · ${esc(s.vol)}</span></div></div>`).join('')}
            <div class="ligne-info"><span class="ic">${I.voiture}</span><div><b>Transferts aéroport ↔ hôtel</b><span class="ok">✓ Aller et retour réservés</span></div></div>
            <div class="ligne-info"><span class="ic">${I.maison}</span><div><b>${esc(hotel.nom)}</b><span>${esc(hotel.adresse)} · <a href="https://www.google.com/maps/search/?api=1&query=${hotel.lat},${hotel.lng}" target="_blank" rel="noopener">plan</a></span></div></div>
            ${voyage.vols.retour.segments.map((s) => `<div class="ligne-info"><span class="ic">${I.avion}</span><div><b>Ven 1er · ${s.depart} → ${s.arrivee}</b><span>${esc(s.de)} → ${esc(s.a)} · ${esc(s.vol)}</span></div></div>`).join('')}
          </div>
        </article>

        <article class="carte">
          <span class="mono">${voix ? 'Touchez ▶ pour écouter' : 'Prononciation en bleu'}</span>
          <h3 class="titre-carte">Quelques mots</h3>
          <div class="mots">${mots.map((m) => `
            <div class="mot" lang="de"><span class="de">${esc(m.de)}</span><span class="pron" lang="fr">${esc(m.pron)}</span><span class="fr" lang="fr">${esc(m.fr)}</span>
              ${voix ? `<button type="button" class="ecouter" data-parler="${esc(m.de)}" aria-label="Écouter : ${esc(m.de)}">${I.play}</button>` : ''}</div>`).join('')}
          </div>
        </article>

        <div style="display:grid;gap:16px">
          <article class="carte">
            <span class="mono">Spécialités</span>
            <h3 class="titre-carte">À goûter</h3>
            <div class="gouts">${gouts.map((g) => `<div class="gout">${img(g.photo, g.nom)}<b>${esc(g.nom)}</b><span>${esc(g.texte.split('. ')[0])}.</span></div>`).join('')}</div>
          </article>
          <article class="carte">
            <span class="mono">Sur place</span>
            <h3 class="titre-carte">Les usages</h3>
            <ul class="liste-simple">
              <li>On dit <b>« Grüß Gott »</b> en entrant dans une boutique ou un café.</li>
              <li><b>Pourboire</b> : environ 10 %, annoncé en payant (« Stimmt so »).</li>
              <li>Carte bancaire presque partout ; <b>un peu d'espèces</b> pour les kiosques et les marchés.</li>
              <li>Au café, on peut rester longtemps : personne ne vous pressera.</li>
              <li>Urgences : <b>112</b>.</li>
            </ul>
          </article>
        </div>
      </div>
    </div>
    ${pied()}`;
}

function pied() {
  const c = etat.d.credits || {};
  return `
    <footer class="pied"><div class="col">
      <p class="marque-pied">Vienne en famille<span>.</span></p>
      <p>Famille Ropars · 4 voyageurs · du 28 décembre 2026 au 1er janvier 2027. Horaires vérifiés en octobre 2026, certains restent à confirmer pour les fêtes.</p>
      <details><summary>Sources et crédits photos</summary>
        <p>Cartes © OpenStreetMap, OpenFreeMap. Photos : Wikimedia Commons.</p>
        <ul>${Object.values(c).map((u) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(decodeURIComponent(u.split('File:')[1] || u))}</a></li>`).join('')}</ul>
      </details>
    </div></footer>`;
}

/* ---------- voix ---------- */
function parler(texte, bouton) {
  speechSynthesis.cancel();
  document.querySelectorAll('.ecouter.parle').forEach((b) => b.classList.remove('parle'));
  const u = new SpeechSynthesisUtterance(texte);
  const voix = speechSynthesis.getVoices();
  const v = voix.find((x) => x.lang === 'de-AT') || voix.find((x) => x.lang === 'de-DE') || voix.find((x) => x.lang.startsWith('de'));
  u.lang = v ? v.lang : 'de-AT'; if (v) u.voice = v;
  u.rate = 0.8;
  u.onend = u.onerror = () => bouton.classList.remove('parle');
  bouton.classList.add('parle');
  speechSynthesis.speak(u);
}
if ('speechSynthesis' in window) speechSynthesis.getVoices();


/* ==========================================================================
   SYNCHRONISATION AUTOMATIQUE (Firebase Realtime Database, API REST)
   Chaque réponse part dans le « cloud » ; chaque téléphone récupère celles
   des autres. Quand tout le monde a fini, le programme final s'affiche partout.
   ========================================================================== */
const SYNC = { actif: false, base: '', ok: null, minuteurs: {}, tousFinis: false };

function initSync() {
  const cfg = etat.d.voyage.synchro || {};
  if (!cfg.url || !cfg.famille) return;
  SYNC.actif = true;
  SYNC.base = `${cfg.url.replace(/\/+$/, '')}/familles/${encodeURIComponent(cfg.famille)}`;
  tirer();
  setInterval(() => { if (!document.hidden) tirer(); }, 15000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tirer(); });
}

function etatSync(ok) {
  SYNC.ok = ok;
  const el = $('#etat-sync');
  if (el) { el.hidden = false; el.className = `pilule sync ${ok ? 'en-ligne' : 'hors-ligne'}`; el.innerHTML = `<span class="point"></span>${ok ? 'Synchronisé' : 'Hors ligne'}`; }
}

async function envoyer(chemin, corps) {
  if (!SYNC.actif) return;
  try {
    const r = await fetch(`${SYNC.base}/${chemin}.json`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) });
    etatSync(r.ok);
  } catch { etatSync(false); }
}

function pousserJoueur(j) {
  j.maj = Date.now();
  sauver();
  if (!SYNC.actif) return;
  clearTimeout(SYNC.minuteurs[j.id]);
  SYNC.minuteurs[j.id] = setTimeout(() => envoyer(`joueurs/${j.id}`, { nom: j.nom, code: DECK().map((l) => CODE[j.rep[l.id]] || '-').join(''), maj: j.maj }), 600);
}

function pousserReglages() {
  etat.p.majReglages = Date.now();
  sauver();
  envoyer('reglages', { rythme: etat.p.rythme, soir31: etat.p.soir31, maj: etat.p.majReglages });
}

async function tirer() {
  try {
    const r = await fetch(`${SYNC.base}.json`, { cache: 'no-store' });
    if (!r.ok) throw new Error(r.status);
    const data = await r.json();
    etatSync(true);
    if (data) appliquerCloud(data);
  } catch { etatSync(false); }
}

function appliquerCloud(data) {
  const deck = DECK();
  let change = false;
  for (const [id, jc] of Object.entries(data.joueurs || {})) {
    let j = etat.p.joueurs.find((x) => x.id === id);
    if (!j) { j = { id, nom: jc.nom, rep: {}, idx: 0 }; etat.p.joueurs.push(j); change = true; }
    if ((jc.maj || 0) > (j.maj || 0)) {
      const rep = {};
      deck.forEach((l, i) => { if (DECODE[jc.code?.[i]]) rep[l.id] = DECODE[jc.code[i]]; });
      const enCours = etat.p.actif !== null && etat.p.joueurs[etat.p.actif] === j && location.hash === '#envies';
      if (!enCours) { Object.assign(j, { nom: jc.nom, rep, maj: jc.maj }); j.idx = Math.max(j.idx || 0, Object.keys(rep).length); change = true; }
    }
  }
  const rg = data.reglages;
  if (rg && (rg.maj || 0) > (etat.p.majReglages || 0)) { Object.assign(etat.p, { rythme: rg.rythme, soir31: rg.soir31, majReglages: rg.maj }); change = true; }
  // Tout le monde a fini ? → programme final
  const tous = etat.p.joueurs.length && etat.p.joueurs.every((j) => nbRepondu(j) >= deck.length);
  if (tous && !SYNC.tousFinis) {
    SYNC.tousFinis = true;
    if (!etat.p.fini) { etat.p.fini = true; change = true; }
    alerte('Tout le monde a répondu : votre programme final est prêt ✓');
  }
  if (change) {
    changer();
    const ecran = location.hash.slice(1) || 'accueil';
    const enQuiz = ecran === 'envies' && etat.p.actif !== null && !etat.p.vue;
    if (!enQuiz && ECRANS[ecran]) (ecran === 'programme' ? afficherJour : ECRANS[ecran])();
  }
}

/** Où en est chacun (pour l'écran « Qui joue ? » et le programme) */
function attente() {
  const total = DECK().length;
  return etat.p.joueurs.filter((j) => nbRepondu(j) < total).map((j) => `${esc(j.nom)} (${nbRepondu(j)}/${total})`);
}

/* ==========================================================================
   Événements
   ========================================================================== */
document.addEventListener('click', (ev) => {
  const t = ev.target;
  const rep = t.closest('[data-rep]');
  if (rep) { repondre(rep.dataset.rep); return; }
  const a = t.closest('[data-action]');
  if (a) {
    const act = a.dataset.action;
    if (act === 'plus') { const p = a.closest('.photo').querySelector('.plus-texte'); p.hidden = !p.hidden; }
    if (act === 'annuler') annuler();
    if (act === 'joueurs') { Object.assign(etat.p, { actif: null, vue: null }); sauver(); rendreEnvies(); window.scrollTo({ top: 0 }); }
    if (act === 'matchs') { etat.p.vue = 'matchs'; sauver(); rendreEnvies(); window.scrollTo({ top: 0 }); }
    if (act === 'questions-ouvrir') { etat.p.vue = 'questions'; sauver(); rendreEnvies(); window.scrollTo({ top: 0 }); }
    if (act === 'partager') partager();
    if (act === 'partager-famille') partagerFamille();
    if (act === 'recommencer') { joueurActif().idx = 0; sauver(); rendreEnvies(); }
    if (act === 'terminer') { Object.assign(etat.p, { fini: true, vue: null, actif: null, jour: '29' }); changer(); location.hash = '#programme'; }
    if (act === 'details') { const d = a.closest('li').querySelector('.details'); d.hidden = !d.hidden; a.textContent = d.hidden ? 'Détails' : 'Masquer'; }
    if (act === 'actif') { etat.p.rythme = 'actif'; changer(); afficherJour(); }
    if (act === 'tour') lancerTour();
    if (act === 'ensemble') { arreterTour(); vueEnsemble(); }
    return;
  }
  const jo = t.closest('[data-jouer]');
  if (jo) { const i = Number(jo.dataset.jouer); const j = etat.p.joueurs[i]; if (nbRepondu(j) >= DECK().length) j.idx = 0; Object.assign(etat.p, { actif: i, vue: null }); sauver(); rendreEnvies(); window.scrollTo({ top: 0 }); return; }
  const rn = t.closest('[data-renommer]');
  if (rn) { const j = etat.p.joueurs[Number(rn.dataset.renommer)]; const nom = prompt('Prénom :', j.nom); if (nom && nom.trim()) { j.nom = nom.trim().slice(0, 20); changer(); pousserJoueur(j); rendreEnvies(); } return; }
  const ch = t.closest('[data-choix]');
  if (ch) { etat.p[ch.dataset.choix] = ch.dataset.val; changer(); pousserReglages(); ch.parentElement.querySelectorAll('[data-choix]').forEach((b) => b.setAttribute('aria-checked', b === ch)); return; }
  const jb = t.closest('[data-jour]');
  if (jb) { etat.p.jour = jb.dataset.jour; sauver(); afficherJour(); return; }
  const jl = t.closest('[data-jour-lien]');
  if (jl) { etat.p.jour = jl.dataset.jourLien; sauver(); }
  const al = t.closest('[data-aller]');
  if (al) { arreterTour(); $('.c3d').scrollIntoView({ behavior: 'smooth', block: 'start' }); allerA(Number(al.dataset.aller)); return; }
  const pas = t.closest('[data-pas]');
  if (pas) { arreterTour(); allerA(C3D.idx + Number(pas.dataset.pas)); return; }
  const z = t.closest('[data-zoom]');
  if (z && C3D.map) { C3D.map.zoomTo(C3D.map.getZoom() + Number(z.dataset.zoom), { duration: 400 }); return; }
  const rs = t.closest('[data-resa]');
  if (rs) { const id = rs.dataset.resa; etat.p.resas[id] = !etat.p.resas[id]; sauver(); rendreInfos(); return; }
  const v = t.closest('[data-parler]');
  if (v) parler(v.dataset.parler, v);
});

/* ==========================================================================
   Navigation
   ========================================================================== */
const ECRANS = { accueil: rendreAccueil, envies: rendreEnvies, programme: rendreProgramme, infos: rendreInfos };
function router() {
  if (location.hash.startsWith('#import=')) { importer(location.hash); history.replaceState(null, '', '#envies'); }
  if (location.hash.startsWith('#famille=')) { const ok = chargerFamille(location.hash); history.replaceState(null, '', ok ? '#programme' : '#accueil'); }
  const nom = location.hash.slice(1) || 'accueil';
  const ecran = ECRANS[nom] ? nom : 'accueil';
  if (ecran !== 'programme') arreterTour();
  document.querySelectorAll('.ecran').forEach((s) => s.classList.toggle('actif', s.id === `ecran-${ecran}`));
  document.querySelectorAll('[data-nav]').forEach((a) => (a.dataset.nav === ecran ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  ECRANS[ecran]();
  if (ecran === 'programme' && C3D.map) setTimeout(() => { C3D.map.resize(); vueEnsemble(); }, 80);
  window.scrollTo({ top: 0 });
  document.title = { accueil: 'Vienne en famille', envies: 'Nos envies · Vienne', programme: 'Programme · Vienne', infos: 'Infos · Vienne' }[ecran];
}

async function demarrer() {
  try {
    const f = (u) => fetch(u, { cache: 'no-cache' }).then((r) => { if (!r.ok) throw new Error(u); return r.json(); });
    const [l, v, s, c, lx] = await Promise.all(['data/lieux.json', 'data/voyage.json', 'data/specialites.json', 'data/credits-photos.json', 'data/lexique.json'].map(f));
    etat.d = { lieux: l.lieux, hotel: l.hotel, voyage: v, specialites: s, credits: c, lexique: lx };
    const jours = Math.ceil((new Date('2026-12-28T11:35:00+01:00') - Date.now()) / 864e5);
    if (jours > 0) $('#compte').textContent = `J-${jours} · 4 voyageurs`;
    $('#chargement').remove();
    initSync();
    window.addEventListener('hashchange', router);
    router();
  } catch (e) {
    console.error(e);
    const el = $('#chargement'); if (el) el.textContent = 'Le site n\'a pas pu se charger. Ouvrez-le par son adresse internet.';
  }
}
demarrer();
