/**
 * Registre des pays.
 *
 * Pour ajouter un pays : créer `assets/js/data/<id>.js` exportant un objet du même
 * schéma que `france`, puis l'importer et l'ajouter ici. Rien d'autre à toucher.
 */

import { france } from "./france.js";
import { usa } from "./usa.js";
import { royaumeUni } from "./royaume-uni.js";
import { espagne } from "./espagne.js";
import { portugal } from "./portugal.js";
import { russie } from "./russie.js";
import { paysBas } from "./pays-bas.js";
import { ottoman } from "./ottoman.js";
import { japon } from "./japon.js";
import { allemagne } from "./allemagne.js";
import { italie } from "./italie.js";
import { rome } from "./rome.js";

export const datasets = {
  france,
  usa,
  "royaume-uni": royaumeUni,
  espagne,
  portugal,
  russie,
  "pays-bas": paysBas,
  ottoman,
  japon,
  allemagne,
  italie,
  rome,
};

export function getDataset(id) {
  return (id && datasets[id]) || datasets.france;
}
