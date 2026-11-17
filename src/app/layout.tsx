import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AssistantWidget } from "@/components/assistant-widget";
import { FirebaseHydrator } from "@/components/firebase-hydrator";

export const metadata: Metadata = {
  title: { default: "JOBMASTER AI — Ton prochain emploi commence ici", template: "%s | JOBMASTER AI" },
  description: "Plateforme intelligente de recherche d'emploi, d'adaptation de CV et de candidature assistée par IA.",
  icons: { icon: "/favicon.svg" },
};

const themeScript = `
(function(){
  try{
    var t = localStorage.getItem('jm-theme') || 'system';
    var dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
    document.documentElement.lang = localStorage.getItem('jm-lang') || 'fr';
  }catch(e){}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className="min-h-screen antialiased">
        <FirebaseHydrator />
        <Providers>
          {children}
          <AssistantWidget />
        </Providers>
      </body>
    </html>
  );
}
