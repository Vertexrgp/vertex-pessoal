import { Link, useRoute } from "wouter";
import {
  LayoutDashboard,
  ListTree,
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
  ChevronRight,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  name: string;
  path: string;
  icon: React.ElementType;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    label: "",
    items: [
      { name: "Dashboard", path: "/", icon: LayoutDashboard },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { name: "Lançamentos", path: "/transactions", icon: ListTree },
      { name: "Planejamento Mensal", path: "/monthly-planning", icon: CalendarDays },
      { name: "Orçamento", path: "/budget", icon: PieChart },
      { name: "Relatórios", path: "/reports", icon: BarChart3 },
    ],
  },
  {
    label: "Patrimônio",
    items: [
      { name: "Visão Geral", path: "/patrimonio", icon: Landmark },
      { name: "Recebíveis", path: "/receivables", icon: HandCoins },
      { name: "Dívidas", path: "/debts", icon: FileText },
      { name: "Rendas", path: "/incomes", icon: TrendingUp },
    ],
  },
  {
    label: "Cartões",
    items: [
      { name: "Faturas", path: "/faturas", icon: Receipt },
      { name: "Cartões Cadastrados", path: "/cartoes", icon: CreditCard },
    ],
  },
  {
    label: "Configurações",
    items: [
      { name: "Configurações", path: "/settings", icon: Settings },
    ],
  },
];

function NavLink({ item }: { item: NavItem }) {
  const [isActive] = useRoute(item.path === "/" ? "/" : item.path);
  const Icon = item.icon;
  return (
    <Link
      href={item.path}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-150 group text-sm font-medium",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      )}
    >
      <Icon
        className={cn(
          "w-4 h-4 flex-shrink-0 transition-colors",
          isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-600"
        )}
      />
      <span className="truncate">{item.name}</span>
    </Link>
  );
}

export function Sidebar() {
  return (
    <aside className="w-60 hidden md:flex flex-col border-r border-slate-200 bg-white h-screen sticky top-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
      <div className="p-5 flex items-center gap-3 border-b border-slate-100">
        <img
          src={`${import.meta.env.BASE_URL}images/logo-icon.png`}
          alt="Vertex Finance Logo"
          className="w-8 h-8 rounded-lg shadow-sm"
        />
        <h1 className="font-display font-bold text-lg text-slate-900 tracking-tight">
          Vertex <span className="text-primary">OS</span>
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
        {navSections.map((section, si) => (
          <div key={si}>
            {section.label && (
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-3 mb-1">
                {section.label}
              </p>
            )}
            <nav className="flex flex-col gap-0.5">
              {section.items.map(item => (
                <NavLink key={item.path} item={item} />
              ))}
            </nav>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-slate-100">
        <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-3 border border-primary/10">
          <p className="text-xs text-slate-500 font-medium">Conta Premium</p>
          <p className="text-sm font-semibold text-slate-900 mt-0.5">Plano Ativo</p>
        </div>
      </div>
    </aside>
  );
}
