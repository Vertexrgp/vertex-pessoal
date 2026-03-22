import { Link, useRoute } from "wouter";
import { 
  LayoutDashboard, 
  ListTree, 
  CalendarDays, 
  Landmark, 
  PieChart, 
  BarChart3, 
  Settings 
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Lançamentos", path: "/transactions", icon: ListTree },
  { name: "Planejamento", path: "/monthly-planning", icon: CalendarDays },
  { name: "Patrimônio", path: "/assets", icon: Landmark },
  { name: "Orçamento", path: "/budget", icon: PieChart },
  { name: "Relatórios", path: "/reports", icon: BarChart3 },
  { name: "Configurações", path: "/settings", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="w-64 hidden md:flex flex-col border-r border-slate-200 bg-white h-screen sticky top-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
      <div className="p-6 flex items-center gap-3">
        <img 
          src={`${import.meta.env.BASE_URL}images/logo-icon.png`} 
          alt="Vertex Finance Logo" 
          className="w-8 h-8 rounded-lg shadow-sm"
        />
        <h1 className="font-display font-bold text-xl text-slate-900 tracking-tight">
          Vertex <span className="text-primary">OS</span>
        </h1>
      </div>

      <div className="px-4 py-2">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-4 px-2">Menu Principal</p>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const [isActive] = useRoute(item.path);
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.path} 
                href={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-sm font-medium",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <Icon className={cn(
                  "w-5 h-5 transition-colors", 
                  isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-600"
                )} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-6">
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 shadow-inner">
          <p className="text-xs text-slate-500 font-medium">Conta Premium</p>
          <p className="text-sm font-semibold text-slate-900 mt-0.5">Plano Ativo</p>
        </div>
      </div>
    </aside>
  );
}
