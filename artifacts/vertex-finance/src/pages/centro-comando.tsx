import { AppLayout } from "@/components/layout/AppLayout";

// Centro de Comando — wrapper minimal.
// A UI completa (6 KPIs + 7 tabs com todas as subtabs, scan de comentários, auditoria Amazon,
// botão Milgram, ações "Abrir no Claude", etc.) está no HTML estático servido pelo Vite
// em `/dashboard-legacy.html`. Aqui só fazemos o iframe fullscreen para preservar
// a sidebar do Vertex OS ao redor.
export default function CentroComandoPage() {
  return (
    <AppLayout>
      <div className="h-[calc(100vh-0px)] w-full bg-white">
        <iframe
          src="/dashboard-legacy.html"
          title="Centro de Comando — Vertex Company"
          className="h-full w-full border-0"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        />
      </div>
    </AppLayout>
  );
}
