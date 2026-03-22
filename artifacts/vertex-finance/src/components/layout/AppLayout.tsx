import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Link, useRoute } from "wouter";
import { 
  LayoutDashboard, 
  ListTree, 
  CalendarDays, 
  Landmark, 
  PieChart, 
  BarChart3, 
  Settings,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Lançamentos", path: "/transactions", icon: ListTree },
  { name: "Cartões", path: "/credit-cards", icon: CreditCard },
  { name: "Planejamento", path: "/monthly-planning", icon: CalendarDays },
  { name: "Patrimônio", path: "/assets", icon: Landmark },
  { name: "Orçamento", path: "/budget", icon: PieChart },
  { name: "Relatórios", path: "/reports", icon: BarChart3 },
  { name: "Configurações", path: "/settings", icon: Settings },
];

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background text-slate-900 font-sans selection:bg-primary/20">
      <Sidebar />
      
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <img 
              src={`${import.meta.env.BASE_URL}images/logo-icon.png`} 
              alt="Logo" 
              className="w-7 h-7 rounded"
            />
            <span className="font-display font-bold text-lg">Vertex</span>
          </div>
          
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-slate-600">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 bg-white">
               <div className="p-6">
                 <h2 className="font-display font-bold text-xl">Menu</h2>
               </div>
               <nav className="flex flex-col gap-1 px-4">
                {navItems.map((item) => {
                  const [isActive] = useRoute(item.path);
                  const Icon = item.icon;
                  return (
                    <Link 
                      key={item.path} 
                      href={item.path}
                      className={cn(
                        "flex items-center gap-3 px-3 py-3 rounded-xl transition-all font-medium text-sm",
                        isActive ? "bg-primary/10 text-primary" : "text-slate-600"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </SheetContent>
          </Sheet>
        </header>

        <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
