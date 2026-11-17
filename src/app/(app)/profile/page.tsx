"use client";

import { useEffect, useState } from "react";
import { UserRound, Save, Plus, Trash2 } from "lucide-react";
import { useApi, apiJson } from "@/components/hooks";
import { Badge, Button, Card, Field, Input, Spinner, Textarea } from "@/components/ui";
import { useApp } from "@/components/providers";
import type { CandidateProfile, EducationItem, ExperienceItem } from "@/lib/types";

export default function ProfilePage() {
  const { data, loading } = useApi<CandidateProfile>("/api/profile");
  const { toast } = useApp();
  const [form, setForm] = useState<CandidateProfile | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (data) setForm(data); }, [data]);

  const set = (k: keyof CandidateProfile, v: unknown) => setForm((p) => p ? { ...p, [k]: v } : p);
  const arr = (k: keyof CandidateProfile) => (form?.[k] as string[] | undefined)?.join(", ") || "";
  const setArr = (k: keyof CandidateProfile, v: string) => set(k, v.split(",").map((x) => x.trim()).filter(Boolean));

  async function save() {
    if (!form) return;
    setSaving(true);
    try {
      await apiJson("/api/profile", "PUT", form);
      toast("Profil mis à jour.", "success");
    } catch (e) { toast(e instanceof Error ? e.message : "Erreur", "error"); }
    finally { setSaving(false); }
  }

  if (loading || !form) return <div className="grid place-items-center py-32"><Spinner /></div>;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div><h1 className="text-2xl font-extrabold tracking-tight">Mon profil candidat</h1><p className="mt-1 text-sm jm-muted">Ces informations alimentent l'IA pour chaque candidature.</p></div>
        <Button onClick={save} loading={saving}><Save className="h-4 w-4" /> Enregistrer</Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="space-y-4">
          <h2 className="flex items-center gap-2 font-bold"><UserRound className="h-4 w-4 text-indigo-500" /> Informations principales</h2>
          <Field label="Titre / Intitulé"><Input value={form.headline || ""} onChange={(e) => set("headline", e.target.value)} placeholder="Développeur Full Stack" /></Field>
          <Field label="Résumé professionnel"><Textarea value={form.summary || ""} onChange={(e) => set("summary", e.target.value)} placeholder="Parlez de votre parcours en quelques lignes…" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ville"><Input value={form.city || ""} onChange={(e) => set("city", e.target.value)} placeholder="Paris" /></Field>
            <Field label="Téléphone"><Input value={form.phone || ""} onChange={(e) => set("phone", e.target.value)} placeholder="06 12 34 56 78" /></Field>
            <Field label="LinkedIn"><Input value={form.linkedin || ""} onChange={(e) => set("linkedin", e.target.value)} placeholder="https://linkedin.com/in/…" /></Field>
            <Field label="Site web"><Input value={form.website || ""} onChange={(e) => set("website", e.target.value)} placeholder="https://…" /></Field>
            <Field label="Années d'expérience"><Input type="number" min="0" value={form.experience_years || 0} onChange={(e) => set("experience_years", Number(e.target.value))} /></Field>
            <Field label="Disponibilité"><Input value={form.availability || ""} onChange={(e) => set("availability", e.target.value)} placeholder="Immédiate" /></Field>
          </div>
        </Card>

        <Card className="space-y-4">
          <h2 className="font-bold">Compétences & projets</h2>
          <Field label="Compétences" hint="Séparées par une virgule"><Input value={arr("skills")} onChange={(e) => setArr("skills", e.target.value)} placeholder="React, Python, Gestion de projet" /></Field>
          <Field label="Postes recherchés"><Input value={arr("desired_roles")} onChange={(e) => setArr("desired_roles", e.target.value)} placeholder="Développeur, Chargé de projet" /></Field>
          <Field label="Domaines"><Input value={arr("domains")} onChange={(e) => setArr("domains", e.target.value)} placeholder="Informatique, Finance" /></Field>
          <Field label="Langues"><Input value={arr("languages")} onChange={(e) => setArr("languages", e.target.value)} placeholder="Français, Anglais" /></Field>
          <Field label="Qualités"><Input value={arr("qualities")} onChange={(e) => setArr("qualities", e.target.value)} placeholder="Rigueur, Autonomie" /></Field>
          <div className="flex flex-wrap gap-1.5 pt-1">{(form.skills || []).slice(0, 12).map((s) => <Badge key={s} tone="indigo">{s}</Badge>)}</div>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center justify-between"><h2 className="font-bold">Expériences</h2>
            <Button size="sm" variant="outline" onClick={() => set("experiences", [...(form.experiences || []), { title: "", company: "", period: "", description: "" }])}><Plus className="h-3.5 w-3.5" /> Ajouter</Button>
          </div>
          {(form.experiences || []).map((e: ExperienceItem, i: number) => (
            <div key={i} className="space-y-2 rounded-xl border p-3">
              <div className="flex justify-between"><span className="text-xs font-semibold">Expérience {i + 1}</span><button onClick={() => set("experiences", form.experiences!.filter((_, j) => j !== i))} className="text-rose-500"><Trash2 className="h-3.5 w-3.5" /></button></div>
              <Input value={e.title} onChange={(ev) => { const a = [...form.experiences!]; a[i] = { ...e, title: ev.target.value }; set("experiences", a); }} placeholder="Intitulé du poste" />
              <div className="grid grid-cols-2 gap-2">
                <Input value={e.company || ""} onChange={(ev) => { const a = [...form.experiences!]; a[i] = { ...e, company: ev.target.value }; set("experiences", a); }} placeholder="Entreprise" />
                <Input value={e.period || ""} onChange={(ev) => { const a = [...form.experiences!]; a[i] = { ...e, period: ev.target.value }; set("experiences", a); }} placeholder="2022-2024" />
              </div>
              <Textarea value={e.description || ""} onChange={(ev) => { const a = [...form.experiences!]; a[i] = { ...e, description: ev.target.value }; set("experiences", a); }} placeholder="Missions et résultats" />
            </div>
          ))}
          {!form.experiences?.length && <p className="text-sm jm-muted">Aucune expérience ajoutée. Elles sont extraites automatiquement de votre CV.</p>}
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center justify-between"><h2 className="font-bold">Formations</h2>
            <Button size="sm" variant="outline" onClick={() => set("education", [...(form.education || []), { degree: "", school: "", year: "" }])}><Plus className="h-3.5 w-3.5" /> Ajouter</Button>
          </div>
          {(form.education || []).map((e: EducationItem, i: number) => (
            <div key={i} className="space-y-2 rounded-xl border p-3">
              <div className="flex justify-between"><span className="text-xs font-semibold">Formation {i + 1}</span><button onClick={() => set("education", form.education!.filter((_, j) => j !== i))} className="text-rose-500"><Trash2 className="h-3.5 w-3.5" /></button></div>
              <Input value={e.degree} onChange={(ev) => { const a = [...form.education!]; a[i] = { ...e, degree: ev.target.value }; set("education", a); }} placeholder="Diplôme" />
              <div className="grid grid-cols-2 gap-2">
                <Input value={e.school || ""} onChange={(ev) => { const a = [...form.education!]; a[i] = { ...e, school: ev.target.value }; set("education", a); }} placeholder="Établissement" />
                <Input value={e.year || ""} onChange={(ev) => { const a = [...form.education!]; a[i] = { ...e, year: ev.target.value }; set("education", a); }} placeholder="Année" />
              </div>
            </div>
          ))}
          {!form.education?.length && <p className="text-sm jm-muted">Aucune formation ajoutée.</p>}
        </Card>
      </div>
    </div>
  );
}
