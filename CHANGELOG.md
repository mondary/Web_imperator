# Journal des modifications

Format : [CalVer](https://calver.org/) `vAAAA.MM.PATCH`. Le patch s'incrémente à chaque
modification ; la version courante est le premier titre ci-dessous.

---

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
