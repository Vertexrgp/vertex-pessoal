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
  BookOpen,
  Languages,
  Globe,
  Layers,
  Flag,
  Star,
  Rocket,
  Sparkles,
  Wallet,
  LineChart,
  Banknote,
  Landmark,
  ArrowLeftRight,
  Play,
  Compass,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ActivityFeed, useUnreadEventCount } from "@/components/ActivityFeed";

type NavItem = {
  name: string;
  path: string;
  icon: React.ElementType;
};

type NavGroup = {
  label: string;
  icon: React.ElementType;
  path?: string;
  items?: NavItem[];
};

type Module = {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  accentClass: string;
  prefixes?: string[];
  items?: NavItem[];
  groups?: NavGroup[];
};

const modules: Module[] = [
  {
    id: "financeiro",
    label: "Financeiro",
    icon: DollarSign,
    color: "text-emerald-400",
    accentClass: "text-emerald-400",
    prefixes: ["/transactions", "/monthly-planning", "/recorrencias", "/custo-de-vida", "/simulador-financeiro", "/budget", "/reports", "/patrimonio", "/receivables", "/debts", "/incomes", "/faturas", "/cartoes", "/assets"],
    groups: [
      {
        label: "Movimentações",
        icon: ArrowLeftRight,
        items: [
          { name: "Lançamentos",  path: "/transactions",  icon: ListTree },
          { name: "Recorrências", path: "/recorrencias",  icon: RefreshCw },
          { name: "Rendas",       path: "/incomes",       icon: Banknote },
          { name: "Recebíveis",   path: "/receivables",   icon: HandCoins },
        ],
      },
      {
        label: "Planejamento",
        icon: CalendarDays,
        items: [
          { name: "Plano Mensal", path: "/monthly-planning",     icon: CalendarDays },
          { name: "Orçamento",    path: "/budget",               icon: PieChart },
          { name: "Simulador",    path: "/simulador-financeiro",  icon: FlaskConical },
        ],
      },
      {
        label: "Cartões",
        icon: CreditCard,
        items: [
          { name: "Cartões", path: "/cartoes", icon: CreditCard },
          { name: "Faturas", path: "/faturas", icon: Receipt },
        ],
      },
      {
        label: "Patrimônio",
        icon: Landmark,
        items: [
          { name: "Ativos",           path: "/patrimonio",  icon: Building2 },
          { name: "Dívidas",          path: "/debts",       icon: FileText },
          { name: "Patrimônio total", path: "/patrimonio",  icon: Landmark },
        ],
      },
      {
        label: "Análises",
        icon: LineChart,
        items: [
          { name: "Relatórios",    path: "/reports",       icon: BarChart3 },
          { name: "Custo de vida", path: "/custo-de-vida", icon: HeartPulse },
        ],
      },
    ],
  },
  {
    id: "performance",
    label: "Performance",
    icon: Activity,
    color: "text-violet-400",
    accentClass: "text-violet-400",
    prefixes: ["/performance"],
    items: [
      { name: "Objetivo",         path: "/performance/objetivo",        icon: Target },
      { name: "Objetivo Físico",  path: "/performance/objetivo-fisico", icon: PersonStanding },
      { name: "Avaliação",        path: "/performance/avaliacao",       icon: Activity },
      { name: "Exames",           path: "/performance/exames",          icon: FileText },
      { name: "Protocolos",       path: "/performance/protocolos",      icon: FlaskConical },
      { name: "Treinos",          path: "/performance/treinos",         icon: Dumbbell },
      { name: "Nutrição",         path: "/performance/nutricao",        icon: Utensils },
      { name: "Progresso",        path: "/performance/progresso",       icon: TrendingUp },
      { name: "Recomendações",    path: "/performance/recomendacoes",   icon: Lightbulb },
    ],
  },
  {
    id: "agenda",
    label: "Agenda",
    icon: CalendarCheck,
    color: "text-sky-400",
    accentClass: "text-sky-400",
    prefixes: ["/agenda"],
    items: [
      { name: "Planejamento Semanal", path: "/agenda/planejamento-semanal", icon: CalendarDays },
      { name: "Visão Geral",          path: "/agenda",                      icon: CalendarCheck },
      { name: "Eventos",              path: "/agenda/eventos",               icon: CalendarDays },
      { name: "Lembretes",            path: "/agenda/lembretes",             icon: Bell },
    ],
  },
  {
    id: "viagens",
    label: "Viagens",
    icon: Plane,
    color: "text-cyan-400",
    accentClass: "text-cyan-400",
    prefixes: ["/viagens"],
    items: [
      { name: "Minhas Viagens", path: "/viagens", icon: MapPin },
    ],
  },
  {
    id: "crescimento",
    label: "Crescimento",
    icon: Rocket,
    color: "text-orange-400",
    accentClass: "text-orange-400",
    prefixes: ["/crescimento"],
    items: [
      { name: "Metas",        path: "/crescimento/metas",        icon: Flag },
      { name: "Checkpoints",  path: "/crescimento/checkpoints",  icon: Layers },
      { name: "Vision Board", path: "/crescimento/vision-board", icon: Star },
    ],
  },
  {
    id: "conhecimento",
    label: "Conhecimento",
    icon: BookOpen,
    color: "text-amber-400",
    accentClass: "text-amber-400",
    prefixes: ["/conhecimento"],
    items: [
      { name: "Biblioteca", path: "/conhecimento",         icon: BookOpen },
      { name: "Livros",     path: "/conhecimento/livros",  icon: BookOpen },
      { name: "Artigos",    path: "/conhecimento/artigos", icon: FileText },
      { name: "Vídeos",     path: "/conhecimento/videos",  icon: Play },
    ],
  },
  {
    id: "idiomas",
    label: "Idiomas",
    icon: Languages,
    color: "text-pink-400",
    accentClass: "text-pink-400",
    prefixes: ["/idiomas"],
    items: [
      { name: "Inglês", path: "/idiomas/ingles", icon: Globe },
    ],
  },
  {
    id: "vida",
    label: "Planejamento de Vida",
    icon: Compass,
    color: "text-violet-400",
    accentClass: "text-violet-400",
    prefixes: ["/vida"],
    items: [
      { name: "Projetos de Vida", path: "/vida", icon: Compass },
    ],
  },
];

function getActiveModule(pathname: string): string | null {
  if (pathname === "/" || pathname === "") return "dashboard";
  for (const mod of modules) {
    if (mod.prefixes?.some(p => pathname === p || pathname.startsWith(p + "/"))) {
      return mod.id;
    }
  }
  return null;
}

function NavItem({ item, compact, indent = false }: { item: NavItem; compact: boolean; indent?: boolean }) {
  const [location] = useLocation();
  const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
  const Icon = item.icon;

  return (
    <Link
      href={item.path}
      title={compact ? item.name : undefined}
      className={cn(
        "flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg transition-all duration-150 text-sm font-medium group relative",
        indent && !compact && "pl-4",
        isActive
          ? "bg-white/10 text-white"
          : "text-white/40 hover:bg-white/5 hover:text-white/75"
      )}
    >
      <Icon
        className={cn(
          "flex-shrink-0 transition-colors",
          compact ? "w-5 h-5" : "w-3.5 h-3.5",
          isActive ? "text-white" : "text-white/35 group-hover:text-white/60"
        )}
      />
      {!compact && <span className="truncate leading-none text-xs">{item.name}</span>}
      {compact && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-neutral-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity border border-neutral-700">
          {item.name}
        </div>
      )}
    </Link>
  );
}

function GroupSection({
  group,
  isOpen,
  onToggle,
}: {
  group: NavGroup;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const [location] = useLocation();
  const Icon = group.icon;

  if (group.path) {
    const isActive = location === group.path || (group.path !== "/" && location.startsWith(group.path + "/"));
    const isDash = group.path === "/";
    const active = isDash ? (location === "/" || location === "") : isActive;
    return (
      <Link
        href={group.path}
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 group",
          active
            ? "bg-white/10 text-white"
            : "text-white/40 hover:bg-white/5 hover:text-white/70"
        )}
      >
        <Icon className={cn("w-3.5 h-3.5 flex-shrink-0", active ? "text-white" : "text-white/30 group-hover:text-white/50")} />
        <span>{group.label}</span>
      </Link>
    );
  }

  const hasActiveChild = group.items?.some(item =>
    location === item.path || (item.path !== "/" && location.startsWith(item.path))
  );

  return (
    <div>
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 group",
          hasActiveChild
            ? "text-white/80 bg-white/5"
            : "text-white/35 hover:text-white/60 hover:bg-white/5"
        )}
      >
        <div className="flex items-center gap-2">
          <Icon className={cn("w-3.5 h-3.5 flex-shrink-0", hasActiveChild ? "text-white/70" : "text-white/30 group-hover:text-white/50")} />
          <span>{group.label}</span>
        </div>
        <ChevronDown
          className={cn(
            "w-3 h-3 transition-transform duration-200",
            isOpen ? "rotate-0" : "-rotate-90",
            hasActiveChild ? "text-white/50" : "text-white/20"
          )}
        />
      </button>

      <div className={cn(
        "overflow-hidden transition-all duration-200",
        isOpen ? "max-h-[200px] opacity-100 mt-0.5" : "max-h-0 opacity-0"
      )}>
        <nav className="flex flex-col gap-0.5 pl-1 border-l border-white/8 ml-3">
          {group.items?.map(item => (
            <NavItem key={item.path + item.name} item={item} compact={false} indent />
          ))}
        </nav>
      </div>
    </div>
  );
}

function ModuleSection({
  mod,
  isOpen,
  isActive,
  compact,
  onToggle,
  openGroups,
  onToggleGroup,
}: {
  mod: Module;
  isOpen: boolean;
  isActive: boolean;
  compact: boolean;
  onToggle: () => void;
  openGroups: Record<string, boolean>;
  onToggleGroup: (label: string) => void;
}) {
  const Icon = mod.icon;
  const allItems: NavItem[] = mod.groups
    ? mod.groups.flatMap(g => g.items ?? (g.path ? [{ name: g.label, path: g.path, icon: g.icon }] : []))
    : (mod.items ?? []);

  if (compact) {
    return (
      <div className="flex flex-col gap-0.5">
        <div className="flex justify-center py-1">
          <div className={cn("w-[3px] h-3 rounded-full bg-current opacity-20", mod.color)} />
        </div>
        {allItems.map(item => (
          <NavItem key={item.path + item.name} item={item} compact={true} />
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
            ? "text-white/90 bg-white/5"
            : "text-white/35 hover:text-white/60 hover:bg-white/5"
        )}
      >
        <div className="flex items-center gap-2">
          <Icon className={cn(
            "w-3.5 h-3.5",
            isActive ? mod.accentClass : "text-white/30 group-hover:text-white/50"
          )} />
          <span>{mod.label}</span>
        </div>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 transition-transform duration-200",
            isOpen ? "rotate-0" : "-rotate-90",
            isActive ? "text-white/40" : "text-white/20"
          )}
        />
      </button>

      <div className={cn(
        "overflow-hidden transition-all duration-200",
        isOpen ? "max-h-[600px] opacity-100 mt-0.5" : "max-h-0 opacity-0"
      )}>
        {mod.groups ? (
          <nav className="flex flex-col gap-0.5 pl-1.5 border-l border-white/8 ml-2.5">
            {mod.groups.map(group => (
              <GroupSection
                key={group.label}
                group={group}
                isOpen={openGroups[group.label] ?? false}
                onToggle={() => onToggleGroup(group.label)}
              />
            ))}
          </nav>
        ) : (
          <nav className="flex flex-col gap-0.5 pl-1.5 border-l border-white/8 ml-2.5">
            {(mod.items ?? []).map(item => (
              <NavItem key={item.path} item={item} compact={false} />
            ))}
          </nav>
        )}
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
    modules.forEach(m => { initial[m.id] = m.id === activeModule; });
    return initial;
  });

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const fin = modules.find(m => m.id === "financeiro");
    const initial: Record<string, boolean> = {};
    fin?.groups?.forEach(g => { initial[g.label] = false; });
    return initial;
  });

  useEffect(() => {
    if (activeModule) {
      setOpenModules(prev => ({ ...prev, [activeModule]: true }));
    }
    if (activeModule === "financeiro") {
      const fin = modules.find(m => m.id === "financeiro");
      fin?.groups?.forEach(g => {
        if (g.items?.some(item =>
          location === item.path || (item.path !== "/" && location.startsWith(item.path))
        )) {
          setOpenGroups(prev => ({ ...prev, [g.label]: true }));
        }
      });
    }
  }, [activeModule, location]);

  const toggleModule = (id: string) => {
    setOpenModules(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const [showActivity, setShowActivity] = useState(false);
  const unreadCount = useUnreadEventCount();

  const toggleCompact = () => {
    setCompact(prev => {
      const next = !prev;
      try { localStorage.setItem("sidebar-compact", String(next)); } catch {}
      return next;
    });
  };

  const sidebarWidth = compact ? 60 : 220;

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col bg-[#0A0A0A] border-r border-neutral-800 h-screen sticky top-0 z-20 transition-all duration-200",
        compact ? "w-[60px]" : "w-[220px]"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center flex-shrink-0 border-b border-neutral-800 h-14",
        compact ? "justify-center px-0" : "px-4"
      )}>
        {compact ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polygon points="1,2 12,22 23,2 20,2 12,18 4,2" fill="white"/>
          </svg>
        ) : (
          <div className="flex items-center gap-3 w-full">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
              <polygon points="1,2 12,22 23,2 20,2 12,18 4,2" fill="white"/>
            </svg>
            <div className="w-px h-7 bg-neutral-700 flex-shrink-0" />
            <div className="flex flex-col leading-none">
              <div className="flex items-baseline gap-1">
                <span className="text-white font-bold text-sm tracking-tight">Vertex</span>
                <span className="text-white/30 font-light text-sm">|</span>
                <span className="text-white font-light text-sm tracking-tight">OS</span>
              </div>
              <span className="text-white/40 text-[9px] tracking-[0.18em] uppercase mt-0.5">Operating System</span>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <div className={cn("flex-1 overflow-y-auto py-3 space-y-1", compact ? "px-1.5" : "px-3")}>
        <NavItem
          item={{ name: "Dashboard", path: "/", icon: LayoutDashboard }}
          compact={compact}
        />
        <NavItem
          item={{ name: "Sugestões", path: "/sugestoes", icon: Sparkles }}
          compact={compact}
        />

        <div className="my-2 border-t border-neutral-800" />

        <div className="space-y-1">
          {modules.map(mod => (
            <ModuleSection
              key={mod.id}
              mod={mod}
              isOpen={openModules[mod.id] ?? false}
              isActive={mod.id === activeModule}
              compact={compact}
              onToggle={() => toggleModule(mod.id)}
              openGroups={openGroups}
              onToggleGroup={toggleGroup}
            />
          ))}
        </div>

        <div className="my-2 border-t border-neutral-800" />

        <NavItem
          item={{ name: "Configurações", path: "/settings", icon: Settings }}
          compact={compact}
        />
      </div>

      {/* Bottom */}
      <div className={cn("border-t border-neutral-800 p-3 flex-shrink-0", compact ? "flex flex-col items-center gap-2" : "")}>
        {!compact && (
          <div className="rounded-xl p-3 border border-neutral-800 bg-neutral-900 mb-2">
            <p className="text-[10px] text-white/35 font-medium">Conta Premium</p>
            <p className="text-xs font-semibold text-white/80 mt-0.5">Plano Ativo</p>
          </div>
        )}

        <button
          onClick={() => setShowActivity((s) => !s)}
          title="Atividade entre módulos"
          className={cn(
            "relative flex items-center gap-2 rounded-lg p-2 transition-colors w-full",
            showActivity
              ? "bg-indigo-500/15 text-indigo-400"
              : "text-white/35 hover:text-white/70 hover:bg-white/5",
            compact ? "justify-center" : ""
          )}
        >
          <div className="relative">
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-0.5 leading-none">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
          {!compact && <span className="text-xs">Atividade</span>}
        </button>

        <button
          onClick={toggleCompact}
          title={compact ? "Expandir menu" : "Recolher menu"}
          className={cn(
            "flex items-center gap-2 text-white/35 hover:text-white/70 transition-colors rounded-lg p-2 hover:bg-white/5 w-full",
            compact ? "justify-center" : "justify-end"
          )}
        >
          {compact ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          {!compact && <span className="text-xs">Recolher</span>}
        </button>
      </div>

      {showActivity && (
        <ActivityFeed
          onClose={() => setShowActivity(false)}
          sidebarWidth={sidebarWidth}
        />
      )}
    </aside>
  );
}
