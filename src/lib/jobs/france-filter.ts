import type { Job } from "../types";

/** Villes françaises reconnues (métropole + DOM principaux). */
const FRENCH_CITIES = new Set([
  "paris", "lyon", "marseille", "toulouse", "bordeaux", "lille", "nantes", "rennes",
  "strasbourg", "nice", "montpellier", "toulon", "grenoble", "dijon", "angers", "le mans",
  "amiens", "brest", "tours", "limoges", "clermont-ferrand", "clermontferrand", "rouen",
  "reims", "caen", "metz", "nancy", "nimes", "perignan", "perpignan", "besancon", "orleans",
  "mulhouse", "aix-en-provence", "aix en provence", "annecy", "chambery", "bayonne", "biarritz",
  "la rochelle", "larochelle", "poitiers", "limoges", "bourgogne", "franche-comte",
  "creteil", "versailles", "nanterre", "montreuil", "saint-denis", "saint etienne", "saint-etienne",
  "pace", "pau", "bruxelles", "geneve", "lassagne", "paris-la-defence", "la defense",
]);

/** Pays / régions étrangers à exclure explicitement. */
const FOREIGN_MARKERS = [
  "usa", "united states", "etats-unis", "canada", "uk", "united kingdom", "angleterre",
  "germany", "allemagne", "deutschland", "poland", "pologne", "spain", "espagne",
  "netherlands", "pays-bas", "ireland", "irlande", "portugal", "italy", "italie",
  "australia", "australie", "singapore", "singapour", "mexico", "mexique", "brazil",
  "bresil", "india", "inde", "china", "chine", "japan", "japon", "israel", "israël",
  "philippines", "turkey", "türkiye", "hongrie", "hungary", "romania", "roumanie",
  "apac", "latam", "emea", "worldwide", "anywhere", "remote germany", "remote usa",
];

function norm(s: string): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

/** Retourne true si l'offre est située en France (ou télétravail ouvert à la France). */
/** Villes étrangères fréquentes à exclure explicitement (même si la
 *  description mentionne la France, ce qui est courant dans les offres DACH). */
const FOREIGN_CITIES = [
  "frankfurt", "berlin", "munich", "munchen", "hamburg", "cologne", "koln", "hanover",
  "hannover", "stuttgart", "dusseldorf", "dortmund", "essen", "leipzig", "dresden",
  "nuremberg", "nurnberg", "bremen", "bonn", "mainz", "wiesbaden", "mannheim",
  "karlsruhe", "freiburg", "heidelberg", "augsburg", "kiel", "lubeck", "rostock",
  "warsaw", "varsovie", "krakow", "gdansk", "wroclaw", "poznan", "amsterdam",
  "rotterdam", "utrecht", "eindhoven", "brussels", "bruxelles", "vienna", "wien",
  "zurich", "geneva", "geneve", "basel", "bern", "london", "manchester", "birmingham",
  "madrid", "barcelona", "lisbon", "lisboa", "milan", "milano", "rome", "roma",
  "dublin", "copenhagen", "stockholm", "oslo", "helsinki", "prague", "praha",
  "budapest", "bucharest", "bucarest", "sofia", "athens", "istanbul", "tel aviv",
];

export function isFranceJob(job: Job): boolean {
  const city = norm(job.city);
  const country = norm(job.country);
  const location = `${city} ${country}`;

  // 1) REJET en priorité : ville ou pays étranger explicite.
  if (FOREIGN_CITIES.some((c) => city.includes(c))) return false;
  if (FOREIGN_MARKERS.some((m) => location.includes(m))) return false;
  if (["remote germany", "remote usa"].includes(city)) return false;

  // 2) Pays explicitement français.
  if (["france", "fr", "french", "hexagone"].some((v) => country === v || city === v || city.includes(v))) return true;

  // 3) Ville française reconnue.
  if ([...FRENCH_CITIES].some((c) => city.includes(c))) return true;

  // 4) Télétravail sans ville : accepter si le pays est France ou si le titre
  //    mentionne explicitement la France (pas la description, trop bruitée).
  if (!city || city === "teletravail" || city === "remote") {
    if (country.includes("france")) return true;
    if (/france|french|paris|lyon|hexagone/.test(norm(job.title))) return true;
  }

  // Localisation inconnue → rejet.
  return false;
}

/** Vérifie la fiabilité d'une offre : date de publication valide et récente,
 *  URL d'origine présente, titre et entreprise renseignés. */
export function isReliableJob(job: Job, maxAgeDays = 120): boolean {
  if (!job.title || !job.company) return false;
  if (!job.url || !/^https?:\/\//i.test(job.url)) return false;
  const t = new Date(job.posted_at).getTime();
  if (!Number.isFinite(t)) return false;
  const ageDays = (Date.now() - t) / 86400000;
  // Date dans le futur de plus d'un jour = donnée invalide.
  if (ageDays < -1) return false;
  if (ageDays > maxAgeDays) return false;
  return true;
}

/** Applique les deux filtres. */
export function isFranceAndReliable(job: Job): boolean {
  return isFranceJob(job) && isReliableJob(job);
}
