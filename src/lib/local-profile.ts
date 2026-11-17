import type { CandidateProfile, EducationItem, ExperienceItem } from "./types";

export const SKILLS = [
  "JavaScript", "TypeScript", "React", "Node.js", "Next.js", "Python", "Java", "PHP", "C++", "Ruby",
  "SQL", "PostgreSQL", "MySQL", "MongoDB", "Git", "Docker", "Kubernetes", "AWS", "Azure", "Linux",
  "HTML", "CSS", "Tailwind", "Excel", "Word", "PowerPoint", "Power BI", "Salesforce", "HubSpot", "SAP",
  "Marketing", "SEO", "SEA", "Google Ads", "Social Media", "Community Management", "Rédaction", "Communication",
  "Vente", "Relation client", "Négociation", "Sourcing", "Recrutement", "Formation", "RH", "Comptabilité",
  "Gestion de projet", "Agile", "Scrum", "Figma", "UX Design", "UI Design", "Prototypage", "Design System",
  "Logistique", "Maintenance", "Industrie", "Électricité", "Sécurité", "Restauration", "Service client",
  "Machine Learning", "NLP", "Pandas", "Data Analysis", "Analyse de données", "Anglais", "Espagnol",
  "Allemand", "Rigueur", "Autonomie", "Créativité", "Adaptabilité", "Travail en équipe", "Leadership",
  "Organisation", "Curiosité", "Sens du détail",
];

const CITIES = ["Paris", "Lyon", "Marseille", "Toulouse", "Bordeaux", "Lille", "Nantes", "Rennes", "Strasbourg", "Nice", "Montpellier", "Grenoble", "Dijon", "Angers", "Brest", "Tours"];
const DEGREES = ["Doctorat", "Master", "MBA", "Ingénieur", "Licence", "BUT", "DUT", "BTS", "Bac+5", "Bac+4", "Bac+3", "Bac+2", "Bac professionnel", "Bac", "CAP", "BEP"];
const DOMAIN_HINTS: Record<string, string[]> = {
  Informatique: ["React", "Python", "SQL", "Git", "JavaScript", "Docker", "Data Analysis"],
  Marketing: ["Marketing", "SEO", "Social Media", "Communication", "Google Ads"],
  "Ressources Humaines": ["Recrutement", "Sourcing", "Formation", "RH"],
  Commerce: ["Vente", "Relation client", "Négociation", "Service client"],
  Finance: ["Comptabilité", "Excel", "Finance", "Power BI"],
  Design: ["Figma", "UX Design", "UI Design", "Prototypage"],
  Industrie: ["Maintenance", "Industrie", "Électricité", "Sécurité"],
  Logistique: ["Logistique", "Organisation", "Excel"],
  Communication: ["Communication", "Rédaction", "Social Media"],
};

export function norm(text: string): string {
  return (text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function intersection(text: string, values: string[]): string[] {
  const n = norm(text);
  return values.filter((v) => n.includes(norm(v)));
}

function lines(text: string): string[] {
  return text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

export function localAnalyzeProfile(text: string): CandidateProfile {
  const clean = (text || "").replace(/\u0000/g, "");
  const ls = lines(clean);
  const email = clean.match(/[\w.+-]+@[\w-]+\.[\w.]{2,}/)?.[0] || "";
  const phone = clean.match(/(?:\+33|0)[\s.\-]?\d(?:[\s.\-]?\d{2}){4}/)?.[0] || "";
  const cityMatch = clean.match(/(?:à|@|ville\s*:)\s*([A-ZÀ-Ÿ][a-zà-ÿ-]{2,20})/);
  const city = CITIES.find((c) => norm(clean).includes(norm(c))) || (cityMatch ? cityMatch[1] : "");
  const yearsMatch = clean.match(/(\d{1,2})\s*ans?\s*(?:d'?expérience|d'?experience)/i);
  const skills = intersection(clean, SKILLS);
  const foundDomains = Object.entries(DOMAIN_HINTS)
    .filter(([, hints]) => hints.some((h) => skills.includes(h)))
    .map(([domain]) => domain);

  const education: EducationItem[] = ls
    .filter((l) => DEGREES.some((d) => norm(l).includes(norm(d))))
    .slice(0, 6)
    .map((l) => ({ degree: l.slice(0, 120), school: "", year: l.match(/\b(19|20)\d{2}\b/)?.[0] || "" }));

  const experiences: ExperienceItem[] = ls
    .filter((l) => /\b(19|20)\d{2}\b/.test(l) || /\b(juin|juillet|septembre|janvier|mars|avr)/i.test(l))
    .filter((l) => l.length > 25)
    .slice(0, 8)
    .map((l) => ({ title: l.slice(0, 140), period: l.match(/\b(19|20)\d{2}\b/)?.[0] || "" }));

  const nameLine = ls.find((l) => /^[A-ZÀ-Ÿ][a-zà-ÿ'-]+(?:\s+[A-ZÀ-Ÿ][a-zà-ÿ'-]+){1,3}$/.test(l) && !l.includes("@")) || "";
  const headline = nameLine || ls[0]?.slice(0, 90) || "";
  const qualities = intersection(clean, ["Rigueur", "Autonomie", "Créativité", "Adaptabilité", "Travail en équipe", "Leadership", "Organisation", "Curiosité", "Sens du détail"]);
  const languages = intersection(clean, ["Anglais", "Espagnol", "Allemand", "Italien", "Arabe"]);

  return {
    headline,
    summary: ls.filter((l) => l.length > 60).slice(0, 1)[0]?.slice(0, 400) || clean.slice(0, 400),
    city,
    phone,
    linkedin: clean.match(/https?:\/\/(?:www\.)?linkedin\.com\/in\/[^\s]+/i)?.[0] || "",
    website: clean.match(/https?:\/\/(?!www\.linkedin)[^\s]+\.[a-z]{2,}/i)?.[0] || "",
    experience_years: yearsMatch ? Number(yearsMatch[1]) : 0,
    seniority: "",
    availability: /disponible immédiatement/i.test(clean) ? "Immédiate" : "",
    desired_roles: [],
    domains: foundDomains,
    skills: [...new Set(skills)],
    languages: [...new Set(languages)],
    education,
    experiences,
    qualities: [...new Set(qualities)],
  };
}
