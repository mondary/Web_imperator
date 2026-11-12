<img src="icon.png" width="84" alt="Imperator">

[🇫🇷 FR](README.md) · [🇬🇧 EN](README_en.md)

# Imperator — The French World

**An interactive planisphere: how many years did each territory in the world spend under French
sovereignty?** From Roman Gaul to today — 51 territories, a time cursor and sourced profiles.

![Cumulative view](screenshots/01-cumul.png)

## What it does

- **Choropleth map** — every territory is shaded by its number of years under French sovereignty,
  all periods added up (7 classes, from "less than a year" to "800 years and more").
- **Playable timeline** — a cursor runs from 120 BC to 2026; the play button replays the whole
  story in about fifteen seconds. At any date, the map and the list show what was held, and for
  how long.
- **51 profiles** — detailed periods, years per period, a critical note, a source link.
- **Search and filters** by region, ranked list, comparison bars.
- **Navigable map** — wheel zoom, drag, automatic recentring on a territory.
- **Shareable links** — `?an=1789` opens a date, `?t=algerie` a profile, `#methode` the method
  note.
- Responsive, no network dependency, no build step.

![Timeline in 1789](screenshots/02-chronologie-1789.png)
![Territory profile](screenshots/03-fiche.png)
<img src="screenshots/04-mobile.png" width="360" alt="Mobile view">

## Run locally

Data and code are loaded as ES modules, so a small HTTP server is required (opening `index.html`
directly will not work).

```sh
cd Web_imperator
python3 -m http.server 8080
# → http://localhost:8080
```

## Deploy

No build: the folder *is* the site. Drop it as-is on Netlify, Vercel, GitHub Pages, o2switch or any
static host.

## How years are counted

A territory counts as soon as a French authority exercises sovereignty there: possession, treaty,
annexation, protectorate or mandate. It stops counting at cession, independence or military loss.
**Periods are added together**: Saint-Pierre-et-Miquelon, lost and returned three times, stacks all
three occupations.

Two deliberate choices:

1. **Mainland France: 1,183 years, not 843.** The viral map that inspired this project shows
   "843 years" — that is the year of the Treaty of Verdun mistaken for a duration. From 843 to 2026
   there are 1,183 years. Occupations (Alsace-Moselle 1871-1918 and 1940-1944) are not deducted.
2. **Present-day borders.** Historical borders cannot be drawn for every period, so New France is
   shown with the modern provinces and states it partly covered. The map measures a *presence*, not
   a front line.

The full rationale lives in the site's "Méthode" dialog.

## Structure

```
index.html
assets/
  css/app.css            single stylesheet, colour tokens
  js/app.js              engine: projection, map, timeline, panel
  js/data/france.js      ★ the historical dataset (the only file to edit)
  data/world.geo.json    simplified Natural Earth 50m outlines (583 KB)
  vendor/                d3-selection, d3-array, d3-geo (local copies)
  img/favicon.svg
tools/build-geo.py       rebuilds world.geo.json from world-atlas / us-atlas / Canada
screenshots/
```

## Adding a country

The engine is generic. Adding Italy, Germany or Portugal means writing a dataset file in the same
shape as `assets/js/data/france.js` and wiring it into the country switcher. The procedure is
documented (in French) in [docs/ajouter-un-pays.md](docs/ajouter-un-pays.md).

## Sources

- Outlines: [Natural Earth](https://www.naturalearthdata.com/) via `world-atlas` 1:50m,
  `us-atlas` (US states) and a Canadian provinces split.
- Dates and narratives: Wikipedia pages, linked from every profile.

Dates follow the most commonly accepted accounts; they remain debatable, and contested cases are
flagged in the notes.

## Support

This project is free and ad-free. A coffee funds the next atlases:

[☕ ko-fi.com/pouark](https://ko-fi.com/pouark)
