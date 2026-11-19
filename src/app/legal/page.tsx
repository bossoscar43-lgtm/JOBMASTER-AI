import { FileText, ShieldCheck, Cookie, Mail, Scale } from "lucide-react";
import { Badge, Card } from "@/components/ui";

export const metadata = {
  title: "Mentions légales, RGPD et conditions d'utilisation",
  description: "Informations légales, politique de confidentialité et conditions d'utilisation de JOBMASTER AI.",
};

const SECTIONS = [
  {
    icon: FileText,
    title: "Éditeur de la plateforme",
    content: [
      "JOBMASTER AI est une plateforme SaaS de recherche d'emploi assistée par intelligence artificielle.",
      "Éditeur : [NOM DE LA SOCIÉTÉ / ENTREPRENEUR INDIVIDUEL] — [SIRET] — [Adresse postale].",
      "Directeur de la publication : [NOM]. Contact : johnsalvador064@gmail.com.",
      "Hébergement : [NOM DE L'HÉBERGEUR] — [Adresse] — [Pays].",
      "⚠️ Ces coordonnées doivent être complétées avec vos informations réelles avant la mise en production.",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Protection des données (RGPD)",
    id: "rgpd",
    content: [
      "Conformément au Règlement Général sur la Protection des Données (UE 2016/679), JOBMASTER AI collecte et traite les données suivantes : adresse email, nom, CV et documents associés, préférences de recherche, candidatures et journaux d'activité.",
      "Finalités : analyse du CV, mise en correspondance avec des offres, génération de documents de candidature, suivi des candidatures, préparation aux entretiens et assistance conversationnelle.",
      "Base légale : consentement de l'utilisateur (inscription, dépôt de CV, autorisation explicite avant tout envoi d'email) et intérêt légitime pour la sécurité de la plateforme.",
      "Durée de conservation : les données sont conservées tant que le compte est actif. Vous pouvez demander leur suppression à tout moment depuis Paramètres → « Supprimer mon compte » (droit à l'effacement, art. 17 RGPD).",
      "Vos droits : accès (art. 15), rectification (art. 16), effacement (art. 17), limitation (art. 18), portabilité (art. 20) et opposition (art. 21). Exercez-les depuis les Paramètres ou par email à johnsalvador064@gmail.com.",
      "Les données sont hébergées chez Supabase (PostgreSQL, Union européenne) et traitées par OpenAI (États-Unis, garanties contractuelles) uniquement lorsque vous utilisez les fonctionnalités IA. Les CV stockés dans Firebase Storage restent privés et accessibles via des URL signées de 10 minutes.",
      "Aucune donnée n'est vendue à des tiers. Aucun profilage public n'est effectué.",
    ],
  },
  {
    icon: Cookie,
    title: "Cookies et traceurs",
    content: [
      "JOBMASTER AI utilise uniquement des cookies techniques et fonctionnels nécessaires à son fonctionnement : un cookie de session (httpOnly, Secure, SameSite=Lax) pour l'authentification, et le stockage local du navigateur pour vos préférences d'affichage (thème, langue).",
      "Aucun cookie publicitaire ni traceur de tiers à des fins de marketing n'est déposé. Google Analytics (Firebase) peut être activé côté client pour mesurer l'audience ; il peut être désactivé via les paramètres de votre navigateur.",
    ],
  },
  {
    icon: Mail,
    title: "Envoi des candidatures",
    content: [
      "Aucune candidature n'est envoyée sans votre autorisation explicite (case « J'autorise l'envoi » ou bouton « Postuler »).",
      "Les emails sont envoyés via un fournisseur configuré par l'administrateur (Gmail SMTP / Resend). Le destinataire est l'adresse trouvée dans l'annonce ou saisie par vous.",
      "JOBMASTER AI ne contourne aucun CAPTCHA, protection anti-robot ou restriction technique des sites tiers. Pour les formulaires externes, une assistance au remplissage avec validation humaine est proposée.",
    ],
  },
  {
    icon: Scale,
    title: "Conditions d'utilisation",
    content: [
      "JOBMASTER AI fournit une assistance à la recherche d'emploi. L'utilisateur reste seul responsable du contenu de ses candidatures et doit vérifier l'exactitude des informations générées avant envoi.",
      "L'IA ne fabrique aucune expérience, diplôme ou compétence : elle reformule et réorganise uniquement les éléments réellement présents dans votre CV.",
      "L'utilisateur s'engage à utiliser la plateforme conformément aux conditions d'utilisation des sources d'offres et des plateformes d'emploi, et à ne pas l'utiliser à des fins de spam ou de candidatures frauduleuses.",
      "Le service est fourni « en l'état ». L'éditeur ne garantit pas l'obtention d'un emploi ni de réponses aux candidatures.",
    ],
  },
];

export default function LegalPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <Badge><FileText className="h-3.5 w-3.5" /> Informations légales</Badge>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight">Mentions légales, confidentialité et conditions d'utilisation</h1>
      <p className="mt-2 text-sm jm-muted">Dernière mise à jour : {new Date().toLocaleDateString("fr-FR")}</p>

      <div className="mt-8 space-y-5">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.title} id={"id" in s ? (s as { id?: string }).id : undefined} className="prose-jm">
              <h2 className="flex items-center gap-2"><Icon className="h-4 w-4 text-indigo-500" /> {s.title}</h2>
              {s.content.map((p, i) => <p key={i}>{p}</p>)}
            </Card>
          );
        })}
      </div>

      <p className="mt-8 text-center text-xs jm-muted">
        Pour toute question juridique ou demande RGPD : johnsalvador064@gmail.com
      </p>
    </main>
  );
}
