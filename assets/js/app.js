/* =============================================================================
   Imperator — moteur de carte historique
   ========================================================================== */

import { datasets, getDataset } from "./data/index.js";

/* ------------------------------------------------------------------ données */

const RAMP = ["#ded6ef", "#c6b5e9", "#a488dd", "#8260c7", "#6140aa", "#452a86", "#2b1a5e"];
const BINS = [
  { min: 0, max: 1, color: "#d9d4c6", label: "moins d'un an" },
  { min: 1, max: 10, color: RAMP[0], label: "1 – 9 ans" },
  { min: 10, max: 50, color: RAMP[1], label: "10 – 49 ans" },
  { min: 50, max: 100, color: RAMP[2], label: "50 – 99 ans" },
  { min: 100, max: 250, color: RAMP[3], label: "100 – 249 ans" },
  { min: 250, max: 500, color: RAMP[4], label: "250 – 499 ans" },
  { min: 500, max: 800, color: RAMP[5], label: "500 – 799 ans" },
  { min: 800, max: Infinity, color: RAMP[6], label: "800 ans et plus" },
];

const GROUPS = {
  metropole: "Métropole",
  europe: "Europe",
  amerique: "Amérique",
  afrique: "Afrique",
  asie: "Asie",
  oceanie: "Océanie & océan Indien",
  antecedent: "Antécédents",
};

/** Couleur d'une durée en années. */
function colorFor(years) {
  if (!years || years < 1) return BINS[0].color;
  for (const b of BINS) if (years < b.max) return b.color;
  return RAMP[RAMP.length - 1];
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const fmt = (n) => n.toLocaleString("fr-FR");

/* ------------------------------------------------------------------- état */

const ds = getDataset(new URLSearchParams(location.search).get("pays"));
const territories = ds.territories.map((t) => ({
  ...t,
  years: totalYears(t),
}));

const state = {
  year: ds.endYear,
  mode: "cumul",
  selected: null,
  filter: "all",
  query: "",
  playing: false,
  zoom: { k: 1, x: 0, y: 0 },
  focus: null,
};

let geo = null;
let features = [];
let featureById = new Map();
let svg, viewport, gBase, gTerr, gMarkers, gLabels;
let projection, path, width = 0, height = 0;
let labelNodes = new Map();
let markerNodes = new Map();
let terrNodes = new Map();
let rafId = null;

/* ---------------------------------------------------------------- histoires */

function totalYears(t) {
  return t.periods.reduce((sum, [a, b]) => sum + Math.max(0, b - a), 0);
}

function heldAt(t, year) {
  return t.periods.some(([a, b]) => year >= a && year <= b);
}

function yearsAt(t, year) {
  return t.periods.reduce((sum, [a, b]) => sum + Math.max(0, Math.min(b, year) - a), 0);
}

/** Années affichées selon le mode. */
function valueOf(t) {
  return state.mode === "date" ? yearsAt(t, state.year) : t.years;
}

function isShown(t) {
  if (t.antecedent) return state.mode === "date" && state.year < 843;
  if (state.mode === "date") return true;
  return true;
}

function isHeld(t) {
  return state.mode === "date" ? heldAt(t, state.year) : true;
}

/* ------------------------------------------------------------------- init */

async function boot() {
  applyDatasetChrome();
  buildLegend();
  buildChips();
  wireChrome();
  await loadGeo();
  readUrl();
  syncModeUi();
  if (state.selected) showView("detail");
  setupMap();
  applyState();
  wireTimeline();
  if (state.selected) {
    renderDetail(state.selected);
    const t = territories.find((x) => x.id === state.selected);
    if (t && new URLSearchParams(location.search).has("t")) fitTo(t);
  }
}

function applyDatasetChrome() {
  document.documentElement.lang = "fr";
  document.querySelector(".stage-title .kicker").textContent = ds.title;
  document.getElementById("stage-title").textContent = ds.hero.headline;
  document.title = `Imperator — ${ds.title}, ${ds.hero.headline}`;
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute("content", ds.intro);
}

async function loadGeo() {
  const host = document.getElementById("map");
  host.insertAdjacentHTML("afterbegin", '<div class="loading" id="loading">Chargement du planisphère…</div>');
  const res = await fetch("assets/data/world.geo.json");
  geo = await res.json();
  // on normalise en vraies Features GeoJSON (d3.geoPath attend `type: "Feature"`)
  features = geo.features.map((f) => ({ ...f, type: "Feature", properties: { id: f.id, name: f.name } }));
  for (const f of features) featureById.set(f.id, f);

  const missing = new Set();
  for (const t of territories) {
    for (const id of t.geo || []) if (!featureById.has(id)) missing.add(`${t.id} → ${id}`);
  }
  if (missing.size) console.warn("Géométries manquantes :", [...missing]);
  const loading = document.getElementById("loading");
  if (loading) loading.remove();
}

/* ------------------------------------------------------------------- liens */

function readUrl() {
  const q = new URLSearchParams(location.search);
  const y = Number(q.get("an"));
  if (Number.isFinite(y) && q.get("an")) {
    state.year = clamp(y, ds.startYear, ds.endYear);
    state.mode = "date";
  }
  const t = q.get("t");
  if (t && territories.some((x) => x.id === t)) state.selected = t;
}

let urlTimer = null;
function writeUrl() {
  clearTimeout(urlTimer);
  urlTimer = setTimeout(() => {
    const q = new URLSearchParams();
    if (state.mode === "date") q.set("an", String(Math.round(state.year)));
    if (state.selected) q.set("t", state.selected);
    const s = q.toString();
    history.replaceState(null, "", s ? `?${s}` : location.pathname);
  }, 250);
}

/* -------------------------------------------------------------------- map */

function setupMap() {
  const host = document.getElementById("map");
  svg = d3.select(host).append("svg");
  const defs = svg.append("defs");
  defs
    .append("pattern")
    .attr("id", "hatch")
    .attr("width", 4)
    .attr("height", 4)
    .attr("patternTransform", "rotate(45)")
    .attr("patternUnits", "userSpaceOnUse")
    .append("line")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", 0)
    .attr("y2", 4)
    .attr("stroke", "#57503f")
    .attr("stroke-width", 2.2);

  viewport = svg.append("g").attr("class", "viewport");
  gBase = viewport.append("g").attr("class", "basemap");
  gTerr = viewport.append("g").attr("class", "territories");
  // marqueurs et libellés vivent hors du zoom : taille de texte constante
  gMarkers = svg.append("g").attr("class", "markers");
  gLabels = svg.append("g").attr("class", "labels");

  const ro = new ResizeObserver(() => resize());
  ro.observe(host);
  window.addEventListener("resize", () => { width = 0; height = 0; resize(); });
  resize();
}

let resizeTries = 0;

function resize() {
  const host = document.getElementById("map");
  const rect = host.getBoundingClientRect();
  const w = Math.round(rect.width);
  const h = Math.round(rect.height);
  // la mise en page n'est pas encore stabilisée : on réessaie à l'image suivante
  if ((w < 120 || h < 120) && resizeTries < 40) {
    resizeTries++;
    requestAnimationFrame(resize);
    return;
  }
  resizeTries = 0;
  if (w === width && h === height) return;
  width = w;
  height = h;

  svg.attr("viewBox", `0 0 ${w} ${h}`);
  projection = d3
    .geoNaturalEarth1()
    .rotate([-10, 0])
    .fitExtent([[16, 18], [w - 16, h - 18]], { type: "Sphere" });
  path = d3.geoPath(projection);

  drawBase();
  drawTerritories();
  drawMarkers();
  recenterFocus();
  updateTransform();
  applyState();
}

function drawBase() {
  gBase.selectAll("*").remove();
  gBase
    .append("path")
    .attr("class", "sphere")
    .attr("d", path({ type: "Sphere" }));

  gBase
    .append("path")
    .attr("class", "graticule")
    .attr("d", path(d3.geoGraticule10()));

  gBase
    .selectAll("path.land")
    .data(features)
    .join("path")
    .attr("class", "land")
    .attr("d", (f) => path(f));
}

function drawTerritories() {
  gTerr.selectAll("*").remove();
  terrNodes = new Map();

  for (const t of territories) {
    const g = gTerr.append("g").attr("class", "terr").attr("data-id", t.id);
    const geoms = (t.geo || []).map((id) => featureById.get(id)).filter(Boolean);
    for (const f of geoms) g.append("path").attr("d", path(f));
    if (t.id === "gaule" || t.id === "francs") g.classed("hatch", true);

    g.on("pointerenter", (ev) => onHover(t, ev))
      .on("pointermove", (ev) => moveTooltip(ev))
      .on("pointerleave", () => hideTooltip())
      .on("click", (ev) => {
        ev.stopPropagation();
        select(t.id);
      });
    terrNodes.set(t.id, g);
  }
}

function drawMarkers() {
  gMarkers.selectAll("*").remove();
  markerNodes = new Map();
  for (const t of territories) {
    const pts = t.markers || (t.marker ? [t.marker] : []);
    if (!pts.length) continue;
    const g = gMarkers.append("g").attr("class", "marker").attr("data-id", t.id);
    for (const p of pts) g.append("circle").attr("data-pos", p.join(","));
    markerNodes.set(t.id, g);
  }
}

/* --------------------------------------------------------------- transform */

function updateTransform() {
  const { k, x, y } = state.zoom;
  viewport.attr("transform", `translate(${x},${y}) scale(${k})`);

  // marqueurs et libellés : taille constante, donc hors échelle
  for (const [id, g] of markerNodes) {
    g.selectAll("circle").each(function () {
      const p = this.getAttribute("data-pos").split(",").map(Number);
      const xy = project(p);
      d3.select(this)
        .attr("cx", xy[0])
        .attr("cy", xy[1])
        .attr("r", 3.6)
        .attr("stroke-width", 1.1 / k);
    });
  }
  updateLabels();
}

/** Après un redimensionnement, on garde le point visé au centre. */
function recenterFocus() {
  if (!state.focus || state.zoom.k <= 1.001) return;
  const p = projection(state.focus);
  if (!p) return;
  state.zoom.x = width / 2 - p[0] * state.zoom.k;
  state.zoom.y = height / 2 - p[1] * state.zoom.k;
  clampZoom();
}

function project([lon, lat]) {
  const p = projection([lon, lat]);
  if (!p) return [-100, -100];
  const { k, x, y } = state.zoom;
  return [p[0] * k + x, p[1] * k + y];
}

function updateLabels() {
  gLabels.selectAll("*").remove();
  const fs = clamp(8.5 + Math.log2(state.zoom.k) * 1.7, 8.5, 15);
  gLabels.style("font-size", `${fs}px`);
  labelNodes = new Map();
  for (const t of territories) {
    const held = isHeld(t);
    const show =
      state.selected === t.id ||
      ((t.alwaysLabel || t.antecedent) && (state.mode === "cumul" || held));
    if (!show) continue;
    const p = t.label || anchorOf(t);
    if (!p) continue;
    const [x, y] = project(p);
    if (x < 20 || y < 20 || x > width - 20 || y > height - 20) continue;
    const txt = gLabels
      .append("text")
      .attr("x", x)
      .attr("y", y)
      .attr("text-anchor", "middle")
      .attr("class", t.id === state.selected ? "big" : "")
      .text(t.short || t.name);
    if (state.selected === t.id) txt.attr("class", "big");
    labelNodes.set(t.id, txt);
  }
}

function anchorOf(t) {
  const f = (t.geo || []).map((id) => featureById.get(id)).find(Boolean);
  if (!f) return t.marker || null;
  const c = d3.geoCentroid(f);
  return [c[0], c[1]];
}

/* ------------------------------------------------------------------ render */

function applyState() {
  const year = state.year;
  const dateMode = state.mode === "date";

  // territoires
  for (const t of territories) {
    const g = terrNodes.get(t.id);
    if (!g) continue;
    const shown = isShown(t);
    const held = isHeld(t);
    let fill = "none";
    let opacity = 0;

    if (shown) {
      if (t.antecedent) {
        fill = "url(#hatch)";
        opacity = 1;
      } else if (dateMode) {
        if (held) {
          fill = colorFor(Math.max(1, yearsAt(t, year)));
          opacity = 1;
        } else {
          opacity = 0;
        }
      } else {
        fill = colorFor(t.years);
        opacity = 1;
      }
    }

    g.selectAll("path")
      .attr("fill", fill)
      .attr("fill-opacity", opacity)
      .style("pointer-events", shown ? "auto" : "none");
    g.classed("dim", shown && !held && dateMode);
    g.classed("sel", state.selected === t.id);
  }

  // marqueurs
  for (const [id, g] of markerNodes) {
    const t = territories.find((x) => x.id === id);
    const shown = isShown(t);
    const held = isHeld(t);
    g.style("display", shown ? null : "none");
    g.classed("dim", shown && !held && dateMode);
    g.classed("sel", state.selected === id);
    g.selectAll("circle").attr("fill", t.antecedent ? "#8a8271" : colorFor(Math.max(1, valueOf(t))));
  }

  // fond : territoires non tenus = terre neutre
  gBase.selectAll("path.land").attr("fill", null);

  updateLabels();
  updateHeader();
  updateList();
  writeUrl();
  updateStatus(dateMode);
  updateTimelineUi();
}

function updateHeader() {
  const total = territories.filter((t) => !t.antecedent).reduce((s, t) => s + t.years, 0);
  const max = Math.max(...territories.filter((t) => !t.antecedent).map((t) => t.years));
  document.getElementById("stat-territories").textContent = territories.filter((t) => !t.antecedent).length;
  document.getElementById("stat-years").textContent = fmt(total);
  document.getElementById("stat-max").textContent = fmt(max);
}

function updateStatus(dateMode) {
  const el = document.getElementById("map-status");
  if (!dateMode) {
    el.hidden = true;
    return;
  }
  const held = territories.filter((t) => !t.antecedent && heldAt(t, state.year));
  el.hidden = false;
  if (state.year < 843) {
    const a = territories.filter((t) => t.antecedent && heldAt(t, state.year)).pop();
    el.innerHTML = `<strong>${formatYear(state.year)}</strong> ${a ? a.name : "avant la France"} <span style="opacity:.55">· antécédent</span>`;
    return;
  }
  el.innerHTML = `<strong>${formatYear(state.year)}</strong> ${held.length} territoire${held.length > 1 ? "s" : ""} tenu${held.length > 1 ? "s" : ""}`;
}

function formatYear(y) {
  if (y < 0) return `${fmt(-y)} av. J.-C.`;
  if (y < 1000) return String(y);
  return String(y);
}

/* --------------------------------------------------------------- légende */

function buildLegend() {
  const ul = document.getElementById("legend-items");
  ul.innerHTML = "";
  for (const b of BINS) {
    const li = document.createElement("li");
    li.innerHTML = `<i style="background:${b.color}"></i><span>${b.label}</span>`;
    ul.appendChild(li);
  }
  document.getElementById("legend-foot").textContent =
    "Somme des périodes documentées. Contours actuels.";
}

/* ---------------------------------------------------------------- chips */

function buildChips() {
  const host = document.getElementById("chips");
  const items = [{ id: "all", label: "Tout" }].concat(
    Object.entries(GROUPS)
      .filter(([id]) => id !== "antecedent")
      .map(([id, label]) => ({ id, label: label.replace(" & océan Indien", "") }))
  );
  host.innerHTML = "";
  for (const it of items) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip" + (it.id === state.filter ? " is-active" : "");
    b.dataset.filter = it.id;
    b.textContent = it.label;
    b.addEventListener("click", () => {
      state.filter = it.id;
      host.querySelectorAll(".chip").forEach((c) => c.classList.toggle("is-active", c === b));
      updateList();
    });
    host.appendChild(b);
  }
}

/* ------------------------------------------------------------------ liste */

const strip = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function visibleTerritories() {
  const q = strip(state.query.trim());
  return territories
    .filter((t) => (state.filter === "all" ? !t.antecedent : t.group === state.filter))
    .filter((t) => state.mode !== "date" || yearsAt(t, state.year) > 0)
    .filter((t) => !q || strip(t.name).includes(q) || strip(t.short || "").includes(q))
    .sort((a, b) => valueOf(b) - valueOf(a) || a.name.localeCompare(b.name, "fr"));
}

let lastListYear = null;

function updateList() {
  // pendant la lecture, on ne reconstruit pas 50 lignes à chaque image
  if (state.playing && lastListYear !== null && Math.abs(state.year - lastListYear) < 3) return;
  lastListYear = state.year;
  const host = document.getElementById("list");
  const rows = visibleTerritories();
  const max = Math.max(1, ...rows.map((t) => valueOf(t)));
  host.innerHTML = "";

  rows.forEach((t, i) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    const v = valueOf(t);
    const held = state.mode === "date" && heldAt(t, state.year);
    const tag = state.mode === "date" && held ? '<span class="tag">tenu</span>' : "";
    btn.className =
      "row" +
      (state.selected === t.id ? " is-sel" : "") +
      (state.mode === "date" && !held ? " dim" : "");
    btn.innerHTML = `
      <span class="row-rank">${String(i + 1).padStart(2, "0")}</span>
      <span class="row-main">
        <span class="row-name">${t.name}${tag}</span>
        <span class="row-bar"><i style="width:${(v / max) * 100}%;background:${colorFor(Math.max(1, v))}"></i></span>
      </span>
      <span class="row-years">${fmt(v)}<small>ans</small></span>`;
    btn.addEventListener("click", () => select(t.id, true));
    btn.addEventListener("pointerenter", () => highlight(t.id, true));
    btn.addEventListener("pointerleave", () => highlight(t.id, false));
    li.appendChild(btn);
    host.appendChild(li);
  });

  if (!rows.length) {
    const msg =
      state.mode === "date" && !state.query
        ? `Aucun territoire français en ${formatYear(state.year)}.`
        : "Aucun territoire ne correspond.";
    host.innerHTML = `<li style="padding:22px 10px;color:var(--muted);font-size:12px;line-height:1.5">${msg}</li>`;
  }
}

/* --------------------------------------------------------------- sélection */

function select(id, fromList = false) {
  state.selected = state.selected === id ? null : id;
  applyState();
  const panel = document.getElementById("panel");
  if (state.selected) {
    renderDetail(state.selected);
    showView("detail");
    panel.scrollTop = 0;
  } else {
    showView("list");
  }
}

function showView(view) {
  document.querySelectorAll(".panel-view").forEach((el) => {
    el.hidden = el.dataset.view !== view;
  });
}

function renderDetail(id) {
  const t = territories.find((x) => x.id === id);
  if (!t) return;
  const host = document.getElementById("detail");
  const total = totalYears(t);
  const start = Math.min(...t.periods.map((p) => p[0]));
  const domainStart = start;
  const domainEnd = ds.endYear;
  const span = domainEnd - domainStart;

  const segs = t.periods
    .map(([a, b]) => {
      const x1 = ((a - domainStart) / span) * 300;
      const x2 = ((b - domainStart) / span) * 300;
      return `<rect x="${x1.toFixed(1)}" y="10" width="${Math.max(1.4, x2 - x1).toFixed(1)}" height="12" rx="2" fill="${colorFor(Math.max(1, total))}"/>`;
    })
    .join("");

  const periods = t.periods
    .map(([a, b]) => `<li><span>${formatYear(a)} → ${b === ds.endYear ? "aujourd'hui" : formatYear(b)}</span><span>${b - a} ans</span></li>`)
    .join("");


  host.innerHTML = `
    <p class="d-kicker">${t.kind || GROUPS[t.group]} · ${GROUPS[t.group]}</p>
    <h2 class="d-title">${t.name}</h2>
    <p class="d-sub">${t.periods.length > 1 ? `${t.periods.length} périodes de souveraineté` : "Une période de souveraineté"}</p>

    <div class="d-big">
      <b>${fmt(total)}</b>
      <span>ans de souveraineté française<br>${state.mode === "date" ? `dont ${fmt(yearsAt(t, state.year))} ans jusqu'en ${formatYear(state.year)}` : "cumulées sur toutes les périodes"}</span>
    </div>

    <div class="d-frise">
      <svg viewBox="0 0 300 32" preserveAspectRatio="none">
        <line x1="0" y1="16" x2="300" y2="16" stroke="#e6dfd0" stroke-width="1.5"/>
        ${segs}
      </svg>
      <div class="d-ticks">
        <span>${formatYear(start)}</span>
        <span>${t.periods.length > 1 ? `${t.periods.length} périodes` : ""}</span>
        <span>aujourd'hui</span>
      </div>
    </div>

    <ul class="d-periods">${periods}</ul>
    <p class="d-note">${t.note || ""}</p>
    <div class="d-actions">
      <button class="d-btn" type="button" data-action="fit">Centrer sur la carte</button>
      ${t.source ? `<a class="d-btn" href="${t.source}" target="_blank" rel="noopener">Source</a>` : ""}
    </div>`;

  host.querySelector('[data-action="fit"]').addEventListener("click", () => fitTo(t));
}

function fitTo(t) {
  const geoms = (t.geo || []).map((id) => featureById.get(id)).filter(Boolean);
  let bounds = null;

  if (geoms.length) {
    bounds = path.bounds({
      type: "FeatureCollection",
      features: geoms.map((g) =>
        g.type === "Feature" ? g : { type: "Feature", properties: {}, geometry: g }
      ),
    });
  } else {
    const pts = (t.markers || (t.marker ? [t.marker] : []))
      .map((p) => projection(p))
      .filter(Boolean);
    if (!pts.length) return;
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    bounds = [[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]];
  }

  const [[x0, y0], [x1, y1]] = bounds;
  const bw = Math.max(12, x1 - x0);
  const bh = Math.max(12, y1 - y0);
  const k = clamp(Math.min((width * 0.78) / bw, (height * 0.78) / bh), 1, 11);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  state.zoom = { k, x: width / 2 - cx * k, y: height / 2 - cy * k };
  state.focus = d3.geoCentroid({ type: "FeatureCollection", features: geoms.length ? geoms : [] });
  if (!geoms.length) {
    const pts = t.markers || (t.marker ? [t.marker] : []);
    if (pts.length) state.focus = [pts[0][0], pts[0][1]];
  }
  clampZoom();
  updateTransform();
  resetHint();
}

/* ------------------------------------------------------------------ hover */

const tooltip = () => document.getElementById("tooltip");

function onHover(t, ev) {
  const tt = tooltip();
  const v = state.mode === "date" ? yearsAt(t, state.year) : t.years;
  tt.hidden = false;
  tt.innerHTML = `<span class="tt-name">${t.name}</span>
    <span class="tt-years">${t.antecedent ? "antécédent" : `${fmt(v)} ans`}</span>
    <span class="tt-sub">${t.antecedent ? "avant la France" : state.mode === "date" && !heldAt(t, state.year) ? "hors souveraineté à cette date" : (t.kind || "")}</span>`;
  moveTooltip(ev);
}

function moveTooltip(ev) {
  const tt = tooltip();
  const rect = document.getElementById("map").getBoundingClientRect();
  const x = clamp(ev.clientX - rect.left, 60, rect.width - 60);
  const y = clamp(ev.clientY - rect.top, 40, rect.height - 10);
  tt.style.left = `${x}px`;
  tt.style.top = `${y}px`;
}

function hideTooltip() {
  tooltip().hidden = true;
}

function highlight(id, on) {
  const g = terrNodes.get(id);
  if (g) g.classed("sel", on || state.selected === id);
  if (on) {
    const t = territories.find((x) => x.id === id);
    if (t) {
      const p = t.label || anchorOf(t);
      if (p) {
        const [x, y] = project(p);
        const tt = tooltip();
        tt.hidden = false;
        tt.innerHTML = `<span class="tt-name">${t.name}</span><span class="tt-years">${fmt(valueOf(t))} ans</span>`;
        tt.style.left = `${x}px`;
        tt.style.top = `${y}px`;
      }
    }
  } else hideTooltip();
}

/* ------------------------------------------------------------------- zoom */

function wireZoom() {
  const host = document.getElementById("map");
  let dragging = false;
  let moved = 0;
  let start = null;

  host.addEventListener("wheel", (e) => {
    e.preventDefault();
    const rect = host.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    zoomAt(mx, my, e.deltaY < 0 ? 1.18 : 1 / 1.18);
  }, { passive: false });

  host.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".map-tools, .legend")) return;
    dragging = true;
    moved = 0;
    start = { x: e.clientX, y: e.clientY, tx: state.zoom.x, ty: state.zoom.y };
    host.classList.add("is-dragging");
  });

  window.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    moved = Math.max(moved, Math.abs(dx) + Math.abs(dy));
    state.zoom.x = start.tx + dx;
    state.zoom.y = start.ty + dy;
    clampZoom();
    updateTransform();
  });

  window.addEventListener("pointerup", () => {
    dragging = false;
    host.classList.remove("is-dragging");
  });

  host.addEventListener("click", (e) => {
    if (e.target.closest(".terr")) return;
    if (moved > 5) { moved = 0; return; }
    if (state.selected) select(state.selected);
  });

  document.querySelectorAll("[data-zoom]").forEach((b) => {
    b.addEventListener("click", () => {
      const a = b.dataset.zoom;
      if (a === "in") zoomAt(width / 2, height / 2, 1.35);
      else if (a === "out") zoomAt(width / 2, height / 2, 1 / 1.35);
      else {
        state.zoom = { k: 1, x: 0, y: 0 };
        updateTransform();
        resetHint();
      }
    });
  });
}

function zoomAt(mx, my, factor) {
  const { k, x, y } = state.zoom;
  const nk = clamp(k * factor, 1, 14);
  const real = nk / k;
  state.zoom = {
    k: nk,
    x: mx - (mx - x) * real,
    y: my - (my - y) * real,
  };
  clampZoom();
  updateTransform();
  resetHint();
}

function clampZoom() {
  const { k } = state.zoom;
  const minX = width - width * k;
  const minY = height - height * k;
  state.zoom.x = clamp(state.zoom.x, minX, 0);
  state.zoom.y = clamp(state.zoom.y, minY, 0);
  if (k === 1) { state.zoom.x = 0; state.zoom.y = 0; }
}

function resetHint() {
  const h = document.getElementById("map-hint");
  if (h) h.style.opacity = state.zoom.k > 1.02 ? "0" : "1";
}

/* ---------------------------------------------------------------- timeline */

function wireTimeline() {
  const slider = document.getElementById("slider");
  slider.min = String(ds.startYear);
  slider.max = String(ds.endYear);
  slider.value = String(state.year);
  slider.addEventListener("input", () => {
    if (state.mode !== "date") setMode("date", false);
    setYear(Number(slider.value));
  });

  document.getElementById("play").addEventListener("click", togglePlay);

  const phases = document.getElementById("phase-row");
  phases.innerHTML = "";
  for (const p of ds.phases) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "phase";
    b.dataset.year = p.year;
    b.innerHTML = `<b>${formatYear(p.year)}</b>${p.label}`;
    b.addEventListener("click", () => {
      setMode("date", false);
      setYear(p.year);
      if (state.mode === "date" && state.selected) applyState();
    });
    phases.appendChild(b);
  }

  buildSpark();
  buildTicks();
}

function buildSpark() {
  const W = 1000, H = 44;
  const host = document.getElementById("spark");
  const step = 2;
  const counts = [];
  for (let y = ds.startYear; y <= ds.endYear; y += step) {
    counts.push(territories.filter((t) => !t.antecedent && heldAt(t, y)).length);
  }
  const maxN = Math.max(1, ...counts);
  const scaled = counts.map((n, i) => [
    ((ds.startYear + i * step - ds.startYear) / (ds.endYear - ds.startYear)) * W,
    H - 3 - (n / maxN) * (H - 10),
  ]);
  const line = scaled.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;
  host.innerHTML = `
    <path class="area" d="${area}"/>
    <path class="line" d="${line}"/>
    <line class="head" id="spark-head" y1="0" y2="${H}" x1="0" x2="0"/>`;
}

function buildTicks() {
  const host = document.getElementById("ticks");
  host.innerHTML = "";
  for (const ev of ds.events) {
    const pct = ((ev.year - ds.startYear) / (ds.endYear - ds.startYear)) * 100;
    const d = document.createElement("div");
    d.className = "tick event";
    d.style.left = `${pct}%`;
    d.dataset.label = `${formatYear(ev.year)} · ${ev.text.split(" :")[0].slice(0, 34)}`;
    d.title = `${formatYear(ev.year)} — ${ev.text}`;
    d.addEventListener("click", () => {
      setMode("date", false);
      setYear(ev.year);
    });
    host.appendChild(d);
  }
}

function updateTimelineUi() {
  if (state.mode === "date") {
    document.getElementById("stage-title").textContent = `État du monde en ${formatYear(state.year)}`;
  }
  const slider = document.getElementById("slider");
  if (Number(slider.value) !== state.year) slider.value = String(state.year);
  document.getElementById("year-label").textContent = formatYear(state.year);

  const note = document.getElementById("year-note");
  const ev = ds.events.find((e) => e.year === state.year);
  if (ev) note.textContent = ev.text.split(" :")[0];
  else if (state.mode === "date") note.textContent = state.year >= 2026 ? "aujourd'hui" : "chronologie";
  else note.textContent = "aujourd'hui";

  const pct = ((state.year - ds.startYear) / (ds.endYear - ds.startYear)) * 100;
  const head = document.getElementById("spark-head");
  if (head) {
    head.setAttribute("x1", (pct * 10).toFixed(1));
    head.setAttribute("x2", (pct * 10).toFixed(1));
  }

  const held = territories.filter((t) => !t.antecedent && heldAt(t, state.year)).length;
  document.getElementById("live-n").textContent = state.mode === "date" ? held : territories.filter((t) => !t.antecedent).length;

  const current = [...document.querySelectorAll(".phase")]
    .filter((b) => Number(b.dataset.year) <= state.year)
    .pop();
  document.querySelectorAll(".phase").forEach((b) => b.classList.toggle("is-here", b === current));
}

function setYear(y) {
  state.year = clamp(Math.round(y), ds.startYear, ds.endYear);
  if (state.mode === "cumul" && state.year < ds.endYear) setMode("date", false);
  applyState();
}

function syncModeUi() {
  document.querySelectorAll(".mode").forEach((b) => {
    const on = b.dataset.mode === state.mode;
    b.classList.toggle("is-active", on);
    b.setAttribute("aria-selected", on ? "true" : "false");
  });
  document.getElementById("stage-title").textContent =
    state.mode === "date" ? `État du monde en ${formatYear(state.year)}` : ds.hero.headline;
  document.getElementById("legend-foot").textContent =
    state.mode === "date"
      ? "Années accumulées jusqu'à cette date. Contours actuels."
      : "Somme des périodes documentées. Contours actuels.";
}

function setMode(mode, announce = true) {
  state.mode = mode;
  syncModeUi();
  document.getElementById("stage-title").textContent =
    mode === "date" ? `État du monde en ${formatYear(state.year)}` : `${ds.hero.headline}`;
  if (mode === "cumul") state.year = ds.endYear;
  if (announce) applyState();
  else applyState();
}

function togglePlay() {
  state.playing = !state.playing;
  const btn = document.getElementById("play");
  btn.classList.toggle("is-playing", state.playing);
  if (state.playing) {
    setMode("date");
    if (state.year >= ds.endYear) state.year = ds.startYear;
    last = null;
    rafId = requestAnimationFrame(tick);
  } else if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

let last = null;
function tick(ts) {
  if (!state.playing) return;
  if (last == null) last = ts;
  const dt = Math.min(64, ts - last);
  last = ts;
  const yearsPerSecond = 30;
  const next = state.year + (dt / 1000) * yearsPerSecond;
  if (next >= ds.endYear) {
    setYear(ds.endYear);
    state.playing = false;
    document.getElementById("play").classList.remove("is-playing");
    rafId = null;
    return;
  }
  setYear(next);
  rafId = requestAnimationFrame(tick);
}

/* ------------------------------------------------------------------ chrome */

function wireChrome() {
  wireZoom();

  const about = document.getElementById("about");
  document.querySelectorAll("[data-action='about']").forEach((b) =>
    b.addEventListener("click", () => about.showModal())
  );
  if (location.hash === "#methode") about.showModal();
  document.querySelector("[data-action='close-about']").addEventListener("click", () =>
    document.getElementById("about").close()
  );
  document.getElementById("about").addEventListener("click", (e) => {
    if (e.target.id === "about") e.target.close();
  });
  document.querySelector("[data-action='back']").addEventListener("click", () => {
    state.selected = null;
    showView("list");
    applyState();
  });

  document.querySelectorAll(".mode").forEach((b) =>
    b.addEventListener("click", () => {
      if (b.dataset.mode === "date" && state.year >= ds.endYear) state.year = 1789;
      setMode(b.dataset.mode);
      if (b.dataset.mode === "date") resetHint();
    })
  );

  document.querySelectorAll(".country").forEach((b) => {
    const id = b.dataset.pays;
    if (!id) return;
    if (datasets[id] && id !== ds.id) {
      b.addEventListener("click", () => {
        location.search = `?pays=${id}`;
      });
    } else if (!datasets[id]) {
      b.addEventListener("click", () => {
        const old = b.innerHTML;
        b.innerHTML = "Bientôt<small>en préparation</small>";
        setTimeout(() => (b.innerHTML = old), 1400);
      });
    }
  });

  const search = document.getElementById("search");
  search.addEventListener("input", () => {
    state.query = search.value;
    updateList();
  });

  document.addEventListener("keydown", (e) => {
    if (e.target.matches("input, textarea")) return;
    if (e.code === "Space") { e.preventDefault(); togglePlay(); }
    if (e.code === "ArrowRight") { setMode("date", false); setYear(state.year + (e.shiftKey ? 25 : 1)); }
    if (e.code === "ArrowLeft") { setMode("date", false); setYear(state.year - (e.shiftKey ? 25 : 1)); }
    if (e.key === "Escape") {
      if (state.selected) { state.selected = null; showView("list"); applyState(); }
      else hideTooltip();
    }
  });
}

boot();
