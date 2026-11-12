/**
 * Registre des pays disponibles.
 *
 * Pour ajouter un pays : créer `assets/js/data/<id>.js` exportant un objet du même
 * schéma que `france`, puis l'importer et l'ajouter ici. Rien d'autre à toucher.
 */

import { france } from "./france.js";
import { usa } from "./usa.js";

export const datasets = {
  france,
  usa,
};

export function getDataset(id) {
  return (id && datasets[id]) || datasets.france;
}
