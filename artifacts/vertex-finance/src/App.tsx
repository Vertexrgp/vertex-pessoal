import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Dashboard from "./pages/dashboard";
import TransactionsPage from "./pages/transactions";
import MonthlyPlanningPage from "./pages/monthly-planning";
import PatrimonioPage from "./pages/patrimonio";
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
import ObjetivosPage from "./pages/crescimento/objetivos";
import CheckpointsPage from "./pages/crescimento/checkpoints";
import VisionBoardPage from "./pages/crescimento/vision-board";

import LivrosPage from "./pages/conhecimento/livros";
import ArtigosPage from "./pages/conhecimento/artigos";
import ResumosPage from "./pages/conhecimento/resumos";
import FrasesPage from "./pages/conhecimento/frases";

import InglesPage from "./pages/idiomas/ingles";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/transactions" component={TransactionsPage} />
      <Route path="/monthly-planning" component={MonthlyPlanningPage} />
      <Route path="/patrimonio" component={PatrimonioPage} />
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
      <Route path="/crescimento/objetivos" component={ObjetivosPage} />
      <Route path="/crescimento/checkpoints" component={CheckpointsPage} />
      <Route path="/crescimento/vision-board" component={VisionBoardPage} />

      <Route path="/conhecimento/livros" component={LivrosPage} />
      <Route path="/conhecimento/artigos" component={ArtigosPage} />
      <Route path="/conhecimento/resumos" component={ResumosPage} />
      <Route path="/conhecimento/frases" component={FrasesPage} />

      <Route path="/idiomas/ingles" component={InglesPage} />

      {/* Legacy */}
      <Route path="/assets" component={PatrimonioPage} />
      <Route path="/credit-cards" component={FaturasPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
