import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  CalendarDays,
  PieChart,
  BarChart3,
  Settings,
  CreditCard,
  Receipt,
  Landmark,
  TrendingUp,
  DollarSign,
  HandCoins,
  FileText,
  Building2,
  RefreshCw,
  HeartPulse,
  FlaskConical,
  Target,
  Activity,
  Dumbbell,
  Utensils,
  Lightbulb,
  ListTree,
  CalendarCheck,
  Plane,
  MapPin,
  Bell,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  PersonStanding,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  name: string;
  path: string;
  icon: React.ElementType;
};

type Module = {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  items: NavItem[];
  prefixes?: string[];
};

const modules: Module[] = [
  {
    id: "financeiro",
    label: "Financeiro",
    icon: DollarSign,
    color: "text-emerald-600",
    prefixes: ["/transactions", "/monthly-planning", "/recorrencias", "/custo-de-vida", "/simulador-financeiro", "/budget", "/reports"],
    items: [
      { name: "Lançamentos", path: "/transactions", icon: ListTree },
      { name: "Planejamento Mensal", path: "/monthly-planning", icon: CalendarDays },
      { name: "Recorrências", path: "/recorrencias", icon: RefreshCw },
      { name: "Custo de Vida", path: "/custo-de-vida", icon: HeartPulse },
      { name: "Simulador", path: "/simulador-financeiro", icon: FlaskConical },
      { name: "Orçamento", path: "/budget", icon: PieChart },
      { name: "Relatórios", path: "/reports", icon: BarChart3 },
    ],
  },
  {
    id: "patrimonio",
    label: "Patrimônio",
    icon: Landmark,
    color: "text-amber-600",
    prefixes: ["/patrimonio", "/receivables", "/debts", "/incomes"],
    items: [
      { name: "Visão Geral", path: "/patrimonio", icon: Building2 },
      { name: "Recebíveis", path: "/receivables", icon: HandCoins },
      { name: "Dívidas", path: "/debts", icon: FileText },
      { name: "Rendas", path: "/incomes", icon: TrendingUp },
    ],
  },
  {
    id: "cartoes",
    label: "Cartões",
    icon: CreditCard,
    color: "text-violet-600",
    prefixes: ["/faturas", "/cartoes"],
    items: [
      { name: "Faturas", path: "/faturas", icon: Receipt },
      { name: "Cartões Cadastrados", path: "/cartoes", icon: CreditCard },
    ],
  },
  {
    id: "performance",
    label: "Performance",
    icon: Activity,
    color: "text-rose-600",
    prefixes: ["/performance"],
    items: [
      { name: "Objetivo", path: "/performance/objetivo", icon: Target },
      { name: "Objetivo Físico", path: "/performance/objetivo-fisico", icon: PersonStanding },
      { name: "Avaliação", path: "/performance/avaliacao", icon: Activity },
      { name: "Exames", path: "/performance/exames", icon: FileText },
      { name: "Protocolos", path: "/performance/protocolos", icon: FlaskConical },
      { name: "Treinos", path: "/performance/treinos", icon: Dumbbell },
      { name: "Nutrição", path: "/performance/nutricao", icon: Utensils },
      { name: "Progresso", path: "/performance/progresso", icon: TrendingUp },
      { name: "Recomendações", path: "/performance/recomendacoes", icon: Lightbulb },
    ],
  },
  {
    id: "agenda",
    label: "Agenda",
    icon: CalendarCheck,
    color: "text-sky-600",
    prefixes: ["/agenda"],
    items: [
      { name: "Planejamento Semanal", path: "/agenda/planejamento-semanal", icon: CalendarDays },
      { name: "Visão Geral", path: "/agenda", icon: CalendarCheck },
      { name: "Eventos", path: "/agenda/eventos", icon: CalendarDays },
      { name: "Lembretes", path: "/agenda/lembretes", icon: Bell },
    ],
  },
  {
    id: "viagens",
    label: "Viagens",
    icon: Plane,
    color: "text-orange-500",
    prefixes: ["/viagens"],
    items: [
      { name: "Minhas Viagens", path: "/viagens", icon: MapPin },
    ],
  },
];

function getActiveModule(pathname: string): string | null {
  if (pathname === "/" || pathname === "") return null;
  for (const mod of modules) {
    if (mod.prefixes?.some(p => pathname === p || pathname.startsWith(p + "/"))) {
      return mod.id;
    }
  }
  return null;
}

function NavItem({ item, compact }: { item: NavItem; compact: boolean }) {
  const [location] = useLocation();
  const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
  const Icon = item.icon;

  return (
    <Link
      href={item.path}
      title={compact ? item.name : undefined}
      className={cn(
        "flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg transition-all duration-150 text-sm font-medium group relative",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
      )}
    >
      <Icon
        className={cn(
          "flex-shrink-0 transition-colors",
          compact ? "w-5 h-5" : "w-4 h-4",
          isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-600"
        )}
      />
      {!compact && <span className="truncate leading-none">{item.name}</span>}
      {compact && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
          {item.name}
        </div>
      )}
    </Link>
  );
}

function ModuleSection({
  mod,
  isOpen,
  isActive,
  compact,
  onToggle,
}: {
  mod: Module;
  isOpen: boolean;
  isActive: boolean;
  compact: boolean;
  onToggle: () => void;
}) {
  const Icon = mod.icon;

  if (compact) {
    return (
      <div className="flex flex-col gap-0.5">
        <div className="flex justify-center py-1">
          <div className={cn("w-[3px] h-3 rounded-full bg-current opacity-20", mod.color)} />
        </div>
        {mod.items.map(item => (
          <NavItem key={item.path} item={item} compact={true} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-150 group",
          isActive
            ? cn("text-slate-700", "bg-slate-50")
            : "text-slate-400 hover:text-slate-600 hover:bg-slate-50/80"
        )}
      >
        <div className="flex items-center gap-2">
          <Icon className={cn("w-3.5 h-3.5", isActive ? mod.color : "text-slate-400 group-hover:text-slate-500")} />
          <span>{mod.label}</span>
        </div>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 transition-transform duration-200",
            isOpen ? "rotate-0" : "-rotate-90",
            isActive ? "text-slate-500" : "text-slate-300"
          )}
        />
      </button>

      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          isOpen ? "max-h-[500px] opacity-100 mt-0.5" : "max-h-0 opacity-0"
        )}
      >
        <nav className="flex flex-col gap-0.5 pl-1.5 border-l border-slate-100 ml-2.5">
          {mod.items.map(item => (
            <NavItem key={item.path} item={item} compact={false} />
          ))}
        </nav>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [location] = useLocation();
  const [compact, setCompact] = useState(() => {
    try { return localStorage.getItem("sidebar-compact") === "true"; } catch { return false; }
  });

  const activeModule = getActiveModule(location);

  const [openModules, setOpenModules] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    modules.forEach(m => {
      initial[m.id] = m.id === activeModule;
    });
    return initial;
  });

  // Auto-expand active module when route changes
  useEffect(() => {
    if (activeModule) {
      setOpenModules(prev => ({
        ...prev,
        [activeModule]: true,
      }));
    }
  }, [activeModule]);

  const toggleModule = (id: string) => {
    setOpenModules(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleCompact = () => {
    setCompact(prev => {
      const next = !prev;
      try { localStorage.setItem("sidebar-compact", String(next)); } catch {}
      return next;
    });
  };

  const [isDashboard] = [location === "/" || location === ""];

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r border-slate-200 bg-white h-screen sticky top-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-all duration-200",
        compact ? "w-[60px]" : "w-[220px]"
      )}
    >
      {/* Logo */}
      <div className={cn("flex items-center border-b border-slate-100 h-14 flex-shrink-0", compact ? "justify-center px-0" : "px-4 gap-3")}>
        <img
          src={`${import.meta.env.BASE_URL}images/logo-icon.png`}
          alt="Vertex OS"
          className="w-7 h-7 rounded-lg shadow-sm flex-shrink-0"
        />
        {!compact && (
          <h1 className="font-display font-bold text-base text-slate-900 tracking-tight whitespace-nowrap">
            Vertex <span className="text-primary">OS</span>
          </h1>
        )}
      </div>

      {/* Nav */}
      <div className={cn("flex-1 overflow-y-auto py-3 space-y-1", compact ? "px-1.5" : "px-3")}>
        {/* Dashboard */}
        <NavItem
          item={{ name: "Dashboard", path: "/", icon: LayoutDashboard }}
          compact={compact}
        />

        <div className={cn("my-2", compact ? "border-t border-slate-100" : "")} />

        {/* Modules */}
        <div className="space-y-1">
          {modules.map(mod => (
            <ModuleSection
              key={mod.id}
              mod={mod}
              isOpen={openModules[mod.id] ?? false}
              isActive={mod.id === activeModule}
              compact={compact}
              onToggle={() => toggleModule(mod.id)}
            />
          ))}
        </div>

        <div className="my-2 border-t border-slate-100" />

        {/* Settings */}
        <NavItem
          item={{ name: "Configurações", path: "/settings", icon: Settings }}
          compact={compact}
        />
      </div>

      {/* Bottom: Premium badge + collapse toggle */}
      <div className={cn("border-t border-slate-100 p-3 flex-shrink-0", compact ? "flex justify-center" : "")}>
        {!compact && (
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-3 border border-primary/10 mb-2">
            <p className="text-[10px] text-slate-500 font-medium">Conta Premium</p>
            <p className="text-xs font-semibold text-slate-900 mt-0.5">Plano Ativo</p>
          </div>
        )}
        <button
          onClick={toggleCompact}
          title={compact ? "Expandir menu" : "Recolher menu"}
          className={cn(
            "flex items-center gap-2 text-slate-400 hover:text-slate-700 transition-colors rounded-lg p-2 hover:bg-slate-50 w-full",
            compact ? "justify-center" : "justify-end"
          )}
        >
          {compact ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          {!compact && <span className="text-xs">Recolher</span>}
        </button>
      </div>
    </aside>
  );
}
