export const CHAD_PROVINCES = [
  "Batha",
  "Borkou",
  "Chari-Baguirmi",
  "Ennedi-Est",
  "Ennedi-Ouest",
  "Guéra",
  "Hadjer-Lamis",
  "Kanem",
  "Lac",
  "Logone Occidental",
  "Logone Oriental",
  "Mandoul",
  "Mayo-Kebbi Est",
  "Mayo-Kebbi Ouest",
  "Moyen-Chari",
  "N'Djamena",
  "Ouaddaï",
  "Salamat",
  "Sila",
  "Tandjilé",
  "Tibesti",
  "Wadi Fira",
] as const;

export type ReportCategory =
  | "route"
  | "pont"
  | "ecole"
  | "sante"
  | "eau"
  | "marche"
  | "autre";

export type ReportStatus =
  | "signale"
  | "verifie"
  | "en_cours"
  | "resolu"
  | "rejete";

export type ReportSeverity = "vert" | "jaune" | "orange" | "rouge";

export const CATEGORIES: {
  value: ReportCategory;
  label: string;
  icon: string;
}[] = [
  {
    value: "route",
    label: "Route",
    icon: "🛣️",
  },
  {
    value: "pont",
    label: "Pont",
    icon: "🌉",
  },
  {
    value: "ecole",
    label: "École",
    icon: "🏫",
  },
  {
    value: "sante",
    label: "Centre de santé",
    icon: "🏥",
  },
  {
    value: "eau",
    label: "Eau",
    icon: "💧",
  },
  {
    value: "marche",
    label: "Marché",
    icon: "🏪",
  },
  {
    value: "autre",
    label: "Autre",
    icon: "📍",
  },
];

export const STATUSES: {
  value: ReportStatus;
  label: string;
  color: string;
}[] = [
  {
    value: "signale",
    label: "Signalé",
    color: "bg-muted text-muted-foreground",
  },
  {
    value: "verifie",
    label: "Vérifié",
    color: "bg-primary/15 text-primary",
  },
  {
    value: "en_cours",
    label: "En cours",
    color:
      "bg-[color:var(--color-severity-orange)]/20 text-[color:var(--color-severity-orange)]",
  },
  {
    value: "resolu",
    label: "Résolu",
    color:
      "bg-[color:var(--color-severity-vert)]/20 text-[color:var(--color-severity-vert)]",
  },
  {
    value: "rejete",
    label: "Rejeté",
    color: "bg-destructive/15 text-destructive",
  },
];

export const SEVERITIES: {
  value: ReportSeverity;
  label: string;
  hex: string;
}[] = [
  {
    value: "vert",
    label: "Faible",
    hex: "#22a861",
  },
  {
    value: "jaune",
    label: "Modéré",
    hex: "#FECB00",
  },
  {
    value: "orange",
    label: "Élevé",
    hex: "#FF6B1A",
  },
  {
    value: "rouge",
    label: "Critique",
    hex: "#C60C30",
  },
];

export function getCategory(v: string) {
  return (
    CATEGORIES.find((c) => c.value === v) ??
    CATEGORIES[CATEGORIES.length - 1]
  );
}

export function getStatus(v: string) {
  return STATUSES.find((s) => s.value === v) ?? STATUSES[0];
}

export function getSeverity(v: string) {
  return SEVERITIES.find((s) => s.value === v) ?? SEVERITIES[1];
}

/**
 * Auto-classify severity from category + keywords in description.
 *
 * vert   = Faible
 * jaune  = Modéré
 * orange = Élevé
 * rouge  = Critique
 */
export function classifySeverity(
  category: ReportCategory,
  description: string
): ReportSeverity {
  // Normalisation :
  // - minuscules
  // - suppression des accents
  const d = description
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // 🔴 CRITIQUE
  // Intervention immédiate nécessaire.
  const critical = [
    "mort",
    "deces",
    "decede",
    "effondre",
    "effondrement",
    "danger immediat",
    "urgence",
    "urgence absolue",
    "danger de mort",
    "risque pour la vie",
    "menace pour la vie",
    "blesse",
    "blessure grave",
    "victime",
    "incendie",
    "feu",
    "explosion",
    "inondation grave",
    "pont effondre",
    "batiment effondre",
    "ecole effondree",
    "hopital effondre",
    "route coupee",
    "pont coupe",
  ];

  // 🟠 ÉLEVÉ
  // Intervention rapide nécessaire.
  const high = [
    "impraticable",
    "grave",
    "dangereux",
    "danger",
    "ferme",
    "casse",
    "detruit",
    "rupture",
    "bloque",
    "bloquee",
    "accident",
    "fuite importante",
    "inondation",
    "panne importante",
  ];

  // 🟡 MODÉRÉ
  // Intervention normale.
  const moderate = [
    "degrade",
    "abime",
    "fissure",
    "trou",
    "fuite",
    "panne",
    "deteriore",
    "endommage",
  ];

  // 🔴 Vérifier d'abord les situations critiques
  if (critical.some((keyword) => d.includes(keyword))) {
    return "rouge";
  }

  // 🟠 Ensuite les situations élevées
  if (high.some((keyword) => d.includes(keyword))) {
    return "orange";
  }

  // 🟡 Ensuite les situations modérées
  if (moderate.some((keyword) => d.includes(keyword))) {
    return "jaune";
  }

  // Les ponts et centres de santé sont considérés
  // comme des catégories sensibles par défaut.
  if (category === "pont" || category === "sante") {
    return "orange";
  }

  // 🟡 Valeur par défaut
  return "jaune";
}