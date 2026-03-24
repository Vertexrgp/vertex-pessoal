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
  prefixes?: string[];
  items?: NavItem[];
  groups?: NavGroup[];
};

const modules: Module[] = [
  {
    id: "financeiro",
    label: "Financeiro",
    icon: DollarSign,
    color: "text-emerald-600",
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
    color: "text-rose-600",
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
    color: "text-sky-600",
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
    color: "text-orange-500",
    prefixes: ["/viagens"],
    items: [
      { name: "Minhas Viagens", path: "/viagens", icon: MapPin },
    ],
  },
  {
    id: "crescimento",
    label: "Crescimento",
    icon: Rocket,
    color: "text-indigo-600",
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
    color: "text-amber-600",
    prefixes: ["/conhecimento"],
    items: [
      { name: "Livros",   path: "/conhecimento/livros",   icon: BookOpen },
      { name: "Artigos",  path: "/conhecimento/artigos",  icon: FileText },
      { name: "Vídeos",   path: "/conhecimento/videos",   icon: Play },
    ],
  },
  {
    id: "idiomas",
    label: "Idiomas",
    icon: Languages,
    color: "text-sky-600",
    prefixes: ["/idiomas"],
    items: [
      { name: "Inglês", path: "/idiomas/ingles", icon: Globe },
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
          ? "bg-primary/10 text-primary"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
      )}
    >
      <Icon
        className={cn(
          "flex-shrink-0 transition-colors",
          compact ? "w-5 h-5" : "w-3.5 h-3.5",
          isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-600"
        )}
      />
      {!compact && <span className="truncate leading-none text-xs">{item.name}</span>}
      {compact && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
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
            ? "bg-emerald-50 text-emerald-700"
            : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
        )}
      >
        <Icon className={cn("w-3.5 h-3.5 flex-shrink-0", active ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-500")} />
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
            ? "text-emerald-700 bg-emerald-50/60"
            : "text-slate-400 hover:text-slate-600 hover:bg-slate-50/80"
        )}
      >
        <div className="flex items-center gap-2">
          <Icon className={cn("w-3.5 h-3.5 flex-shrink-0", hasActiveChild ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-500")} />
          <span>{group.label}</span>
        </div>
        <ChevronDown
          className={cn(
            "w-3 h-3 transition-transform duration-200",
            isOpen ? "rotate-0" : "-rotate-90",
            hasActiveChild ? "text-emerald-500" : "text-slate-300"
          )}
        />
      </button>

      <div className={cn(
        "overflow-hidden transition-all duration-200",
        isOpen ? "max-h-[200px] opacity-100 mt-0.5" : "max-h-0 opacity-0"
      )}>
        <nav className="flex flex-col gap-0.5 pl-1 border-l border-slate-100 ml-3">
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

      <div className={cn(
        "overflow-hidden transition-all duration-200",
        isOpen ? "max-h-[600px] opacity-100 mt-0.5" : "max-h-0 opacity-0"
      )}>
        {mod.groups ? (
          <nav className="flex flex-col gap-0.5 pl-1.5 border-l border-slate-100 ml-2.5">
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
          <nav className="flex flex-col gap-0.5 pl-1.5 border-l border-slate-100 ml-2.5">
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
        "hidden md:flex flex-col border-r border-slate-200 bg-white h-screen sticky top-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-all duration-200",
        compact ? "w-[60px]" : "w-[220px]"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center flex-shrink-0 bg-slate-900 border-b border-slate-800 h-14",
        compact ? "justify-center px-0" : "px-5"
      )}>
        {compact ? (
          <div className="w-8 h-8 flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polygon points="1,2 11,20 21,2 18.5,2 11,16 3.5,2" fill="white"/>
            </svg>
          </div>
        ) : (
          <img
            src={`${import.meta.env.BASE_URL}images/vertex-logo-full.png`}
            alt="Vertex OS"
            className="h-7 object-contain object-left w-full"
            style={{ maxWidth: "170px" }}
          />
        )}
      </div>

      {/* Nav */}
      <div className={cn("flex-1 overflow-y-auto py-3 space-y-1", compact ? "px-1.5" : "px-3")}>
        {/* Dashboard global */}
        <NavItem
          item={{ name: "Dashboard", path: "/", icon: LayoutDashboard }}
          compact={compact}
        />

        {/* Sugestões */}
        <NavItem
          item={{ name: "Sugestões", path: "/sugestoes", icon: Sparkles }}
          compact={compact}
        />

        <div className="my-2 border-t border-slate-100" />

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
              openGroups={openGroups}
              onToggleGroup={toggleGroup}
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

      {/* Bottom: Premium badge + activity + collapse toggle */}
      <div className={cn("border-t border-slate-100 p-3 flex-shrink-0", compact ? "flex flex-col items-center gap-2" : "")}>
        {!compact && (
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-3 border border-primary/10 mb-2">
            <p className="text-[10px] text-slate-500 font-medium">Conta Premium</p>
            <p className="text-xs font-semibold text-slate-900 mt-0.5">Plano Ativo</p>
          </div>
        )}

        {/* Activity bell */}
        <button
          onClick={() => setShowActivity((s) => !s)}
          title="Atividade entre módulos"
          className={cn(
            "relative flex items-center gap-2 rounded-lg p-2 transition-colors w-full",
            showActivity
              ? "bg-indigo-50 text-indigo-600"
              : "text-slate-400 hover:text-slate-700 hover:bg-slate-50",
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
            "flex items-center gap-2 text-slate-400 hover:text-slate-700 transition-colors rounded-lg p-2 hover:bg-slate-50 w-full",
            compact ? "justify-center" : "justify-end"
          )}
        >
          {compact ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          {!compact && <span className="text-xs">Recolher</span>}
        </button>
      </div>

      {/* Activity feed panel */}
      {showActivity && (
        <ActivityFeed
          onClose={() => setShowActivity(false)}
          sidebarWidth={sidebarWidth}
        />
      )}
    </aside>
  );
}
