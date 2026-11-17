import Link from "next/link";
import { HelpCircle, FileText, Search, Send, Mic2, Bot, ShieldCheck } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";

export const metadata = { title: "Centre d'aide" };

const ITEMS = [
  { icon: FileText, title: "Importer mon CV", text: "PDF, DOCX ou TXT, 10 Mo maximum. Les PDF scannés (images) produisent peu de texte : privilégiez un PDF textuel. L'analyse extrait uniquement les informations réellement présentes." },
  { icon: Search, title: "Lancer une recherche", text: "Définissez vos préférences une fois dans « Recherche automatique », puis cliquez sur « LANCER MA RECHERCHE AUTOMATIQUE ». Les offres sont dédupliquées, filtrées et scorées." },
  { icon: Send, title: "Envoyer une candidature", text: "Depuis une offre, générez le CV adapté et la lettre. Vérifiez les textes, indiquez l'email du recruteur et cochez l'autorisation explicite. En mode démo, l'email est journalisé sans être envoyé." },
  { icon: Mic2, title: "Coach entretien", text: "Simulez un entretien écrit ou vocal. L'IA note chaque réponse sur 100 et génère un rapport avec points forts et axes d'amélioration." },
  { icon: Bot, title: "Assistant IA", text: "Disponible sur toutes les pages. Il utilise le contexte de votre compte (CV, offres, candidatures) avec votre accord." },
  { icon: ShieldCheck, title: "Sécurité & RGPD", text: "Sessions httpOnly, rôles attribués côté serveur, journalisation des actions sensibles. Depuis les paramètres, exportez ou supprimez vos données." },
];

export default function HelpPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <Badge><HelpCircle className="h-3.5 w-3.5" /> Centre d'aide</Badge>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight">Guide d'utilisation</h1>
      <p className="mt-2 text-sm jm-muted">Tout ce qu'il faut savoir pour tirer le meilleur parti de JOBMASTER AI.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {ITEMS.map((i) => { const Icon = i.icon; return <Card key={i.title}>
          <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-indigo-500/10 text-indigo-500"><Icon className="h-5 w-5" /></div>
          <h2 className="font-bold">{i.title}</h2><p className="mt-2 text-sm leading-relaxed jm-muted">{i.text}</p>
        </Card>; })}
      </div>
      <Card className="mt-6">
        <h2 className="font-bold">Limites et transparence</h2>
        <p className="mt-2 text-sm leading-relaxed jm-muted">JOBMASTER AI n'envoie aucune candidature sans votre autorisation explicite, ne contourne aucun CAPTCHA ou protection anti-robot, et n'invente jamais d'expérience, de diplôme ou de compétence. Sans clés API configurées, l'application fonctionne avec un moteur local déterministe et un jeu d'offres de démonstration clairement identifié.</p>
        <Link href="/register" className="mt-5 inline-block"><Button>Commencer maintenant</Button></Link>
      </Card>
    </main>
  );
}
