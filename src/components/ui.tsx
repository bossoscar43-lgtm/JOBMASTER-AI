"use client";

import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", loading, children, disabled, ...props }, ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-55 active:scale-[.98]",
        size === "sm" && "px-3 py-1.5 text-xs",
        size === "md" && "px-4 py-2.5 text-sm",
        size === "lg" && "px-6 py-3.5 text-sm",
        variant === "primary" && "jm-gradient text-white shadow-glow hover:brightness-110",
        variant === "secondary" && "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500/20",
        variant === "outline" && "border bg-transparent hover:bg-black/[.03] dark:hover:bg-white/[.05]",
        variant === "ghost" && "hover:bg-black/[.04] dark:hover:bg-white/[.06]",
        variant === "danger" && "bg-rose-600 text-white hover:bg-rose-700",
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
});

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("jm-card p-5", className)} {...props}>{children}</div>;
}

export function Badge({ children, className, tone = "indigo" }: { children: ReactNode; className?: string; tone?: "indigo" | "green" | "amber" | "rose" | "slate" | "violet" }) {
  const tones: Record<string, string> = {
    indigo: "bg-indigo-500/12 text-indigo-600 dark:text-indigo-300",
    green: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300",
    amber: "bg-amber-500/12 text-amber-600 dark:text-amber-300",
    rose: "bg-rose-500/12 text-rose-600 dark:text-rose-300",
    slate: "bg-slate-500/12 text-slate-600 dark:text-slate-300",
    violet: "bg-violet-500/12 text-violet-600 dark:text-violet-300",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold", tones[tone], className)}>{children}</span>;
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn("jm-input", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn("jm-input min-h-[110px] resize-y", className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...props }, ref) {
  return <select ref={ref} className={cn("jm-input cursor-pointer", className)} {...props}>{children}</select>;
});

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="jm-label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] jm-muted">{hint}</span>}
    </label>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div className={cn("max-h-[88vh] w-full overflow-y-auto rounded-2xl border p-6 shadow-2xl animate-fade-up",
        wide ? "max-w-3xl" : "max-w-lg")}
        style={{ background: "var(--surface)" }}
        onMouseDown={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between gap-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 opacity-60 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin text-indigo-500", className)} />;
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-14 text-center">
      {icon && <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-indigo-500/10 text-indigo-500">{icon}</div>}
      <p className="font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm jm-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-black/[.06] dark:bg-white/[.08]", className)}>
      <div className="h-full rounded-full jm-gradient transition-all duration-700" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="inline-flex items-center gap-2.5">
      <span className={cn("relative h-5 w-9 rounded-full transition-colors", checked ? "bg-indigo-600" : "bg-slate-400/50")}>
        <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all", checked ? "left-[18px]" : "left-0.5")} />
      </span>
      {label && <span className="text-sm">{label}</span>}
    </button>
  );
}

export function StatCard({ label, value, icon, trend, accent }: { label: string; value: string | number; icon?: ReactNode; trend?: string; accent?: string }) {
  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium jm-muted">{label}</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight">{value}</p>
          {trend && <p className="mt-1 text-[11px] text-emerald-500">{trend}</p>}
        </div>
        {icon && <div className={cn("grid h-10 w-10 place-items-center rounded-xl bg-indigo-500/10 text-indigo-500", accent)}>{icon}</div>}
      </div>
    </Card>
  );
}

export function Tabs({ tabs, active, onChange }: { tabs: { id: string; label: string }[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl border p-1" style={{ background: "var(--surface)" }}>
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className={cn("whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold transition",
            active === t.id ? "jm-gradient text-white shadow" : "opacity-60 hover:opacity-100")}>
          {t.label}
        </button>
      ))}
    </div>
  );
}
