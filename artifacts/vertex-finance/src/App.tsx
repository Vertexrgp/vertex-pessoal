import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import NotFound from "@/pages/not-found";

import LoginPage from "./pages/login";
import RegisterPage from "./pages/register";
import Dashboard from "./pages/dashboard";
import TransactionsPage from "./pages/transactions";
import MonthlyPlanningPage from "./pages/monthly-planning";
import PatrimonioPage from "./pages/patrimonio";
import AssetsPage from "./pages/assets";
import ReceivablesPage from "./pages/receivables";
import DebtsPage from "./pages/debts";
import IncomesPage from "./pages/incomes";
import BudgetPage from "./pages/budget";
import ReportsPage from "./pages/reports";
import SettingsPage from "./pages/settings";
import FaturasPage from "./pages/faturas";
import CartoesPage from "./pages/cartoes";
import RecorrenciasPage from "./pages/recorrencias";
import CustoDeVidaPage from "./pages/custo-de-vida";
import SimuladorPage from "./pages/simulador";

import ObjetivoPage from "./pages/performance/objetivo";
import ObjetivoFisicoPage from "./pages/performance/objetivo-fisico";
import AnaliseCorporalPage from "./pages/performance/analise-corporal";
import AvaliacaoPage from "./pages/performance/avaliacao";
import ExamesPage from "./pages/performance/exames";
import ProtocolosPage from "./pages/performance/protocolos";
import TreinosPage from "./pages/performance/treinos";
import NutricaoPage from "./pages/performance/nutricao";
import ProgressoPage from "./pages/performance/progresso";
import RecomendacoesPage from "./pages/performance/recomendacoes";

import AgendaPage from "./pages/agenda/index";
import EventosPage from "./pages/agenda/eventos";
import LembretesPage from "./pages/agenda/lembretes";
import PlanejamentoSemanalPage from "./pages/agenda/planejamento-semanal";

import ViagensPage from "./pages/viagens/index";
import ViagemDetailPage from "./pages/viagens/[id]";

import MetasPage from "./pages/crescimento/metas";
import MetaDetailPage from "./pages/crescimento/meta-detalhe";
import CheckpointsPage from "./pages/crescimento/checkpoints";
import VisionBoardPage from "./pages/crescimento/vision-board";

import ConhecimentoHubPage from "./pages/conhecimento/index";
import LivrosPage from "./pages/conhecimento/livros";
import LivroDetailPage from "./pages/conhecimento/livro-detalhe";
import ArtigosPage from "./pages/conhecimento/artigos";
import ArtigoDetailPage from "./pages/conhecimento/artigo-detalhe";
import VideosPage from "./pages/conhecimento/videos";
import VideoDetailPage from "./pages/conhecimento/video-detalhe";

import InglesPage from "./pages/idiomas/ingles";
import SugestoesPage from "./pages/sugestoes";
import VidaPage from "./pages/vida/index";
import ProjetoDetalhePage from "./pages/vida/projeto-detalhe";
import CidadeDetalhePage from "./pages/vida/cidade-detalhe";
import PricingPage from "./pages/pricing";
import CentroComandoPage from "./pages/centro-comando";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function ProtectedRoute({ component: Component, ...props }: { component: React.ComponentType<any>; [key: string]: any }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Redirect to="/login" />;
  return <Component {...props} />;
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [location] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user && location !== "/login" && location !== "/register") {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <AuthGate>
      <Switch>
        {/* Public auth routes */}
        <Route path="/login" component={LoginPage} />
        <Route path="/register" component={RegisterPage} />

        {/* Protected app routes */}
        <Route path="/" component={Dashboard} />
        <Route path="/transactions" component={TransactionsPage} />
        <Route path="/monthly-planning" component={MonthlyPlanningPage} />
        <Route path="/patrimonio" component={AssetsPage} />
        <Route path="/receivables" component={ReceivablesPage} />
        <Route path="/debts" component={DebtsPage} />
        <Route path="/incomes" component={IncomesPage} />
        <Route path="/budget" component={BudgetPage} />
        <Route path="/reports" component={ReportsPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/faturas" component={FaturasPage} />
        <Route path="/cartoes" component={CartoesPage} />
        <Route path="/recorrencias" component={RecorrenciasPage} />
        <Route path="/custo-de-vida" component={CustoDeVidaPage} />
        <Route path="/simulador-financeiro" component={SimuladorPage} />

        <Route path="/performance/objetivo" component={ObjetivoPage} />
        <Route path="/performance/objetivo-fisico" component={ObjetivoFisicoPage} />
        <Route path="/performance/analise-corporal" component={AnaliseCorporalPage} />
        <Route path="/performance/avaliacao" component={AvaliacaoPage} />
        <Route path="/performance/exames" component={ExamesPage} />
        <Route path="/performance/protocolos" component={ProtocolosPage} />
        <Route path="/performance/treinos" component={TreinosPage} />
        <Route path="/performance/nutricao" component={NutricaoPage} />
        <Route path="/performance/progresso" component={ProgressoPage} />
        <Route path="/performance/recomendacoes" component={RecomendacoesPage} />

        <Route path="/agenda/planejamento-semanal" component={PlanejamentoSemanalPage} />
        <Route path="/agenda" component={AgendaPage} />
        <Route path="/agenda/eventos" component={EventosPage} />
        <Route path="/agenda/lembretes" component={LembretesPage} />

        <Route path="/viagens" component={ViagensPage} />
        <Route path="/viagens/:id">
          {(params) => <ViagemDetailPage id={params.id} />}
        </Route>

        <Route path="/crescimento/metas" component={MetasPage} />
        <Route path="/crescimento/metas/:id">
          {(params) => <MetaDetailPage id={params.id} />}
        </Route>
        <Route path="/crescimento/checkpoints" component={CheckpointsPage} />
        <Route path="/crescimento/vision-board" component={VisionBoardPage} />

        <Route path="/conhecimento" component={ConhecimentoHubPage} />
        <Route path="/conhecimento/livros" component={LivrosPage} />
        <Route path="/conhecimento/livros/:id">
          {(params) => <LivroDetailPage id={params.id} />}
        </Route>
        <Route path="/conhecimento/artigos" component={ArtigosPage} />
        <Route path="/conhecimento/artigos/:id">
          {(params) => <ArtigoDetailPage id={params.id} />}
        </Route>
        <Route path="/conhecimento/videos" component={VideosPage} />
        <Route path="/conhecimento/videos/:id">
          {(params) => <VideoDetailPage id={params.id} />}
        </Route>

        <Route path="/idiomas/ingles" component={InglesPage} />

        {/* Vida routes — fixed ordering to prevent param clash */}
        <Route path="/vida" component={VidaPage} />
        <Route path="/vida/:projetoId/cidades/:cidadeId" component={CidadeDetalhePage} />
        <Route path="/vida/:id" component={ProjetoDetalhePage} />

        <Route path="/sugestoes" component={SugestoesPage} />
        <Route path="/pricing" component={PricingPage} />
        <Route path="/centro-comando" component={CentroComandoPage} />

        {/* Legacy */}
        <Route path="/assets" component={AssetsPage} />
        <Route path="/credit-cards" component={FaturasPage} />
        <Route component={NotFound} />
      </Switch>
    </AuthGate>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
