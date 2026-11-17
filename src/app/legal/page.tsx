import { FileText } from "lucide-react";
import { Badge, Card } from "@/components/ui";

export const metadata = { title: "Mentions legales et RGPD" };

export default function LegalPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <Badge><FileText className="h-3.5 w-3.5" /> Informations legales</Badge>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight">Mentions legales et confidentialite</h1>
      <div className="mt-8 space-y-5">
        <Card className="prose-jm">
          <h2>Editeur</h2>
          <p>JOBMASTER AI, plateforme SaaS de recherche d'emploi assistee par IA. Coordonnees de l'editeur a completer avant production.</p>
          <h2 id="rgpd">Donnees traitees</h2>
          <p>CV, profil, preferences, offres, candidatures, documents generes et journaux d'activite. Hebergement a configurer selon le pays de production.</p>
          <h2>Finalites</h2>
          <p>Analyse du CV, matching, generation de documents, suivi des candidatures et preparation aux entretiens.</p>
        </Card>
      </div>
    </main>
  );
}
