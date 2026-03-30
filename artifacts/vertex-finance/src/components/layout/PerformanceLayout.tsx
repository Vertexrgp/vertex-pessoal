import { Link, useRoute } from "wouter";
import { cn } from "@/lib/utils";
import {
  Target, Activity, FileText, FlaskConical,
  Dumbbell, Utensils, TrendingUp, Lightbulb, PersonStanding, Brain,
} from "lucide-react";

const PERF_TABS = [
  { label: "Objetivo", path: "/performance/objetivo", icon: Target },
  { label: "Objetivo Físico", path: "/performance/objetivo-fisico", icon: PersonStanding },
  { label: "Análise Corporal IA", path: "/performance/analise-corporal", icon: Brain },
  { label: "Avaliação", path: "/performance/avaliacao", icon: Activity },
  { label: "Exames", path: "/performance/exames", icon: FileText },
  { label: "Protocolos", path: "/performance/protocolos", icon: FlaskConical },
  { label: "Treinos", path: "/performance/treinos", icon: Dumbbell },
  { label: "Nutrição", path: "/performance/nutricao", icon: Utensils },
  { label: "Progresso", path: "/performance/progresso", icon: TrendingUp },
  { label: "Recomendações", path: "/performance/recomendacoes", icon: Lightbulb },
];

function PerfTab({ label, path, icon: Icon }: { label: string; path: string; icon: React.ElementType }) {
  const [isActive] = useRoute(path);
  return (
    <Link href={path}>
      <button className={cn(
        "flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-all",
        isActive
          ? "border-primary text-primary"
          : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
      )}>
        <Icon className="w-4 h-4" />
        {label}
      </button>
    </Link>
  );
}

export function PerformanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-8 -mx-6 sm:-mx-8 px-6 sm:px-8 border-b border-slate-200 bg-white">
        <div className="flex gap-1 overflow-x-auto pb-0 pt-1" style={{ scrollbarWidth: "none" }}>
          {PERF_TABS.map(tab => (
            <PerfTab key={tab.path} label={tab.label} path={tab.path} icon={tab.icon} />
          ))}
        </div>
      </div>
      {children}
    </div>
  );
}
