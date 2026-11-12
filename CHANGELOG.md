# Journal des modifications

Format : [CalVer](https://calver.org/) `vAAAA.MM.PATCH`. Le patch s'incrémente à chaque
modification ; la version courante est le premier titre ci-dessous.

---

## v2026.11.10 — 2026-11-12

**Neuf atlas supplémentaires** — l'application couvre désormais onze empires.

- **Royaume-Uni** (46 territoires) : Irlande 753 ans, Inde, Canada, Australie, Afrique, Mandats,
  points d'appui (Bermudes 414 ans).
- **Espagne** (28) : Nouvelle-Espagne, vice-royautés andines, Philippines 333 ans, Pays-Bas,
  Sahara, Guinée.
- **Portugal** (14) : Guinée 528 ans, Cap-Vert 513, Mozambique 470, Goa 451, Macao 442, Brésil 322.
- **Russie** (18) : de Kazan à l'URSS, Asie centrale, Caucase, Baltes, Finlande, Alaska.
- **Pays-Bas** (12) : Indonésie 347 ans, Suriname, Le Cap, Ceylan, Antilles.
- **Empire ottoman** (24) : Balkans, Levant, Égypte, Maghreb, Arabie, Crimée.
- **Allemagne** (23) : colonies africaines et océaniennes, Alsace-Moselle, occupations 1939-1945.
- **Italie** (8) : Érythrée, Somalie, Libye, Éthiopie, Albanie, Dodécanèse.
- **Japon** (11) : Taïwan, Corée, Mandchourie, occupations de 1942-1945, mandats du Pacifique.
- Sélecteur à onze pays, défilant sur mobile ; « Méthode » propre à chaque pays.
- Marqueurs ponctuels masqués quand le polygone est assez grand pour être vu.

## v2026.11.9 — 2026-11-12

- Libellés de carte masqués sous 640 px (sauf le territoire sélectionné) : plus de collision sur mobile.
- Note d'année tronquée proprement dans la barre de temps ; colonne élargie sur petit écran.

## v2026.11.8 — 2026-11-12

- Documentation du schéma multi-pays (`groups`, `about`, `adj`, `sovereignty`, `binEdges`).

## v2026.11.7 — 2026-11-12

Deuxième atlas : **les États-Unis**.

- **Jeu de données américain** (21 territoires) : treize colonies (1776), cessions de 1783,
  Louisiane (1803), Floride (1819), Texas (1845), Oregon (1846), cession mexicaine (1848),
  Alaska (1867), Hawaï (1898), puis l'outre-mer (Philippines, Porto Rico, Guam, Samoa, îles
  Vierges, Mariannes, canal de Panama, Guantanamo) et les interventions (Cuba, Japon, Irak,
  Afghanistan).
- **Moteur multi-pays** : chaque jeu de données porte son titre, sa méthode, son vocabulaire
  (« territoires français » / « américains »), ses classes de couleur et ses groupes de filtre.
  Le dialogue « Méthode » est généré depuis les données, plus écrit dans le HTML.
- **Classes de couleur par pays** : les durées ne se comparent pas d'un empire à l'autre — 250 ans
  est un record aux États-Unis, une durée moyenne en France.
- **Correction de fond** : la couche « territoires » ne dessine plus les contours des territoires
  invisibles (fill-opacity à zéro laissait les traits). La carte est nettement plus propre.
- Les découpages internes (États américains, provinces canadiennes, régions italiennes) ne sont
  plus dessinés dans le fond de carte : le pays Natural Earth s'en charge.
- Les 50 États américains sont désormais disponibles en géométrie pour les prochains jeux.

## v2026.11.6 — 2026-11-12

- **Lecture à vitesse variable** : le temps de lecture n'est plus proportionnel aux années mais à
  l'activité. Les siècles creux (843-1500) défilent en 3 s, la période 1500-1800 prend 9 s, et
  1830-1962 — conquêtes, protectorats, indépendances — ralentit à 10 s, avec une pause marquée
  sur 1960. Courbe calculée à partir des dates de début et de fin de chaque territoire.
- Le curseur manuel recale la position de lecture ; reprise en cours de route sans saut.

## v2026.11.5 — 2026-11-12

- Infobulle de la liste ancrée sur le centre réel du territoire (moyenne de tous ses polygones),
  au lieu de son premier fragment.

## v2026.11.4 — 2026-11-12

Refonte demandée après la première relecture.

- **La France par provinces** : la métropole est découpée en 17 régions historiques reconstituées
  à partir des départements (domaine royal, Dauphiné, Bourgogne, Provence, Bretagne, Bresse, Béarn,
  Alsace, Moselle, Roussillon, Flandre, Franche-Comté, Lorraine, Comtat, Corse, Savoie, Nice).
  Chacune a ses propres dates de rattachement, y compris les coupures alsaciennes de 1871-1918 et
  1940-1944.
- **L'Empire napoléonien par régions** : Piémont, Vallée d'Aoste, Ligurie, Toscane, Ombrie, Latium,
  Belgique, Pays-Bas.
- **Chronologie à partir de 843** : la Gaule et les Francs disparaissent de la carte (antécédents,
  plus comptés) ; le curseur ne perd plus les neuf premiers siècles.
- **Cadrage automatique** : la carte se resserre sur les territoires français de la date et s'élargit
  quand l'empire s'étend, sans qu'un comptoir lointain ne force le planisphère. Le zoom manuel
  reprend la main, ⌂ recadre.
- **Vocabulaire** : « territoires tenus » devient « territoires français » ; la statistique
  « 8 035 ans cumulés » (dénuée de sens) est supprimée.
- **Modes renommés** : « Toutes époques » et « À une date », avec libellé de légende et de titre
  qui suivent la date.
- **Infobulles réparées** : ancrées sur le territoire, jamais hors champ, contenu adapté quand le
  territoire n'était pas français à la date affichée ; marqueurs (Clipperton, comptoirs) cliquables.
- **« Centrer sur la carte »** anime réellement le cadrage.
- Pays-Bas détachés de leurs communes caribéennes, qui faussaient le cadrage ; orientation des
  anneaux corrigée pour les nouvelles géométries.

## v2026.11.3 — 2026-11-12

- Antécédents (Gaule, Francs) rendus en hachures lisibles, avec mention « antécédent » dans le
  bandeau d'état.
- En chronologie, la liste ne garde que les territoires déjà concernés, avec un message explicite
  quand aucun ne l'est encore.
- Version 2026.11.2 : légende déplacée en bas à droite, bandeau compact sur mobile, libellés
  masqués pour les territoires non tenus, frise des fiches recadrée, traits à épaisseur constante.

## v2026.11.2 — 2026-11-12

- Légende déplacée en bas à droite pour dégager l'Asie ; bandeau compact sur mobile.
- En chronologie, les libellés des territoires non tenus à la date affichée disparaissent.
- Libellés de carte agrandis progressivement avec le zoom ; traits à épaisseur constante.
- Frise des fiches recadrée sur la première prise de possession.
- Panneau plus compact sur petit écran pour laisser respirer la carte.

## v2026.11.1 — 2026-11-12

Première version publique.

- Planisphère choroplèthe du monde français : 51 territoires, sept classes d'années de
  souveraineté.
- Chronologie jouable de 120 av. J.-C. à 2026 (curseur, lecture automatique, phases cliquables,
  frise de densité).
- Fiches territoires : périodes détaillées, nombre d'années par période, note critique, source.
- Recherche insensible aux accents, filtres par région, liste classée avec barres comparatives.
- Carte navigable (zoom molette, déplacement, recentrage sur un territoire), libellés adaptatifs.
- Liens partageables `?an=`, `?t=`, `#methode` ; mode mobile.
- Note de méthode expliquant le comptage et la correction 843 → 1 183 ans.
- Données géographiques Natural Earth 50m simplifiées (583 Ko) et moteur d3-geo embarqué.
- Registre de pays prêt pour l'Italie, l'Allemagne, l'Espagne, le Portugal, le Royaume-Uni.

Soutien : [ko-fi.com/pouark](https://ko-fi.com/pouark)
