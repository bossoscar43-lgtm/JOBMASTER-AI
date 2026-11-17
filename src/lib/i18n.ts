export type Locale = "fr" | "en";

const dict: Record<Locale, Record<string, string>> = {
  fr: {
    "nav.dashboard": "Tableau de bord",
    "nav.resumes": "Mes CV",
    "nav.profile": "Mon profil",
    "nav.search": "Recherche automatique",
    "nav.jobs": "Offres d'emploi",
    "nav.applications": "Candidatures",
    "nav.coach": "Coach entretien IA",
    "nav.assistant": "Assistant IA",
    "nav.history": "Historique",
    "nav.settings": "Paramètres",
    "nav.billing": "Abonnements",
    "nav.admin": "Administration",
    "nav.logout": "Se déconnecter",
    "action.save": "Enregistrer",
    "action.cancel": "Annuler",
    "action.delete": "Supprimer",
    "action.download": "Télécharger",
    "action.view": "Voir",
    "action.launch": "LANCER MA RECHERCHE AUTOMATIQUE",
    "common.loading": "Chargement…",
    "common.empty": "Aucune donnée pour le moment.",
    "common.error": "Une erreur est survenue.",
    "common.demo": "Démonstration",
    "common.fr": "Français",
    "common.en": "English",
    "hero.title": "Ton prochain emploi commence ici.",
    "hero.subtitle": "Dépose ton CV une seule fois. L'IA trouve, adapte et prépare tes candidatures — avec ton accord.",
    "hero.cta": "Commencer gratuitement",
    "hero.cta2": "Voir la démonstration",
  },
  en: {
    "nav.dashboard": "Dashboard",
    "nav.resumes": "My resumes",
    "nav.profile": "My profile",
    "nav.search": "Automatic search",
    "nav.jobs": "Job offers",
    "nav.applications": "Applications",
    "nav.coach": "AI Interview Coach",
    "nav.assistant": "AI Assistant",
    "nav.history": "History",
    "nav.settings": "Settings",
    "nav.billing": "Plans & billing",
    "nav.admin": "Administration",
    "nav.logout": "Sign out",
    "action.save": "Save",
    "action.cancel": "Cancel",
    "action.delete": "Delete",
    "action.download": "Download",
    "action.view": "View",
    "action.launch": "START MY AUTOMATIC SEARCH",
    "common.loading": "Loading…",
    "common.empty": "No data yet.",
    "common.error": "Something went wrong.",
    "common.demo": "Demo",
    "common.fr": "Français",
    "common.en": "English",
    "hero.title": "Your next job starts here.",
    "hero.subtitle": "Upload your resume once. AI finds, tailors and prepares your applications — with your approval.",
    "hero.cta": "Get started free",
    "hero.cta2": "View demo",
  },
};

export function translate(locale: Locale, key: string): string {
  return dict[locale]?.[key] || dict.fr[key] || key;
}

export function detectLocale(value: string | null | undefined): Locale {
  return value === "en" ? "en" : "fr";
}
