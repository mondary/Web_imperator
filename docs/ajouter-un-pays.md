# Ajouter un pays

Le moteur ne connaît aucun pays en particulier : il lit un objet de données et dessine. Les onze
atlas en ligne (France, États-Unis, Royaume-Uni, Espagne, Portugal, Russie, Pays-Bas, Ottomans,
Allemagne, Italie, Japon) ne partagent aucun code spécifique.

## 1. Écrire les données

Créer `assets/js/data/italie.js` sur le modèle de `france.js` :

```js
const W = (t) => `https://fr.wikipedia.org/wiki/${encodeURIComponent(t)}`;

export const italie = {
  id: "italie",
  name: "Italie",
  title: "Le monde italien",
  tagline: "…",
  intro: "…",
  startYear: -300,          // borne gauche du curseur
  endYear: 2026,
  defaultYear: 2026,
  origin: 1861,
  hero: { headline: "1861 – aujourd'hui", note: "…" },
  phases: [{ year: 1861, label: "Unification" }],
  events: [{ year: 1911, text: "Guerre de Libye : …" }],
  territories: [
    {
      id: "libye",
      name: "Libye",
      short: "Libye",
      group: "afrique",              // metropole | europe | amerique | afrique | asie | oceanie
      kind: "Colonie",
      geo: ["libye"],                // ids de assets/data/world.geo.json
      periods: [[1911, 1943]],       // [début, fin], négatif = av. J.-C.
      label: [17.0, 27.0],           // ancrage du libellé, [lon, lat] (facultatif)
      alwaysLabel: true,             // libellé visible en permanence
      marker: [17.0, 27.0],          // point coloré (facultatif, pour les micro-territoires)
      markers: [[12.5, 8.0]],        // plusieurs points
      note: "…",
      source: W("Libye italienne"),
    },
  ],
};
```

Règles du modèle :

| Champ | Rôle |
| --- | --- |
| `periods` | intervalles `[début, fin]`. **Les années sont additionnées** (`fin - début`). |
| `geo` | liste d'identifiants de polygones. Les pays du monde entier sont déjà présents. |
| `markers` | points `[lon, lat]` pour ce qui est trop petit pour être vu. |
| `antecedent: true` | période antérieure à l'État (ex. Gaule) : affichée en hachures, jamais comptée. |
| `group` | filtre et libellé de région dans la liste. |

Champs de tête (facultatifs mais recommandés) :

| Champ | Rôle |
| --- | --- |
| `groups` | `{ id: "Libellé" }` — les puces de filtre du panneau. |
| `about` | `{ title, lead, sections:[{h, p:[html]}] }` — la fenêtre « Méthode », propre au pays. |
| `adj` | `{ one, many }` — « territoires français » / « territoires américains ». |
| `sovereignty` | adjectif de la légende : « française », « américaine ». |
| `binEdges` | bornes des classes de couleur propres au pays (les durées ne se comparent pas d'un empire à l'autre). |

## 2. Déclarer le pays

Dans `assets/js/data/index.js` :

```js
import { france } from "./france.js";
import { italie } from "./italie.js";

export const datasets = { france, italie };
```

Puis dans `index.html`, ajouter le bouton au bandeau :

```html
<button class="country" type="button" data-pays="italie">Italie<small>en ligne</small></button>
```

C'est tout : `?pays=italie` charge le jeu de données, le sélecteur s'active, les libellés de
l'interface suivent (`title`, `hero.headline`, `intro`).

## 3. Géométrie manquante

Les contours viennent de Natural Earth 1:50m, qui couvre tous les pays mais pas les îles minuscules
ni les découpages historiques. Trois solutions :

1. **Un pays existant** — rien à faire, l'`id` est déjà dans `world.geo.json`.
2. **Un point** — `markers: [[lon, lat]]` suffit (Clipperton, les comptoirs de l'Inde…).
3. **Un polygone sur mesure** — ajouter une entrée dans `tools/build-geo.py` (section « inputs »)
   puis relancer `python3 tools/build-geo.py`. C'est ainsi que la Terre Adélie a été ajoutée.

Pour un territoire historique qui ne correspond à aucun État actuel, deux conventions sont
acceptables : approximer avec les frontières actuelles (ce que fait la Nouvelle-France, avec une
note explicite) ou dessiner un polygone simplifié.

## 4. Datation

Le projet assume des choix, pas une vérité :

- compter la **souveraineté effective** (administration, traité), pas la présence ponctuelle ;
- additionner les périodes plutôt que retenir la plus longue ;
- écrire dans `note` ce qui est discutable, et toujours lier une source.

Un écart de quelques années entre deux atlas est normal : la note et la source permettent au
lecteur de trancher.

## 5. Vérifier

```sh
python3 -m http.server 8080
```

Contrôler : totaux du panneau, ordre de la liste, absence d'avertissement `Géométries manquantes`
dans la console, et le rendu en mode Chronologie aux dates charnières.
