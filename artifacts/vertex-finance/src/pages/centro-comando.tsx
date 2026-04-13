// Destino: artifacts/vertex-finance/src/pages/centro-comando.tsx
//
// Página do Centro de Comando (Vertex Company).
// Espelha o estado dos arquivos Markdown do Mac (brain, tasks, memory/*) que
// chegam aqui via POST /api/centro-comando/sync feito pelo watcher no Mac.

import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Brain,
  CheckSquare,
  FolderOpen,
  Activity,
  FileText,
  Clock,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

type CentroFile = {
  id: number;
  fileKey: string;
  category: "brain" | "tasks" | "memory";
  content?: string;
  contentHash: string | null;
  source: string;
  syncedAt: string;
  updatedAt: string;
  bytes?: number;
};

type SyncEvent = {
  id: number;
  fileKey: string;
  action: "upsert" | "delete" | "noop";
  bytesBefore: number | null;
  bytesAfter: number | null;
  source: string;
  message: string | null;
  createdAt: string;
};

// Considera "stale" (desatualizado) se último sync foi há mais de 30 minutos
const STALE_THRESHOLD_MS = 30 * 60 * 1000;

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "agora";
  if (diff < 3_600_000) return `há ${Math.floor(diff / 60_000)} min`;
  if (diff < 86_400_000) return `há ${Math.floor(diff / 3_600_000)} h`;
  return `há ${Math.floor(diff / 86_400_000)} d`;
}

function formatBytes(n: number | null | undefined): string {
  if (!n && n !== 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

// Conta checkboxes [ ] vs [x] no conteúdo do TASKS.md
function countTasks(content: string): { open: number; done: number } {
  if (!content) return { open: 0, done: 0 };
  const open = (content.match(/^\s*-\s*\[\s\]/gm) || []).length;
  const done = (content.match(/^\s*-\s*\[x\]/gim) || []).length;
  return { open, done };
}

export default function CentroComandoPage() {
  const [selected, setSelected] = useState<string>("brain");

  const filesList = useQuery<CentroFile[]>({
    queryKey: ["centro-comando", "files"],
    queryFn: async () => {
      const r = await fetch("/api/centro-comando/files", { credentials: "include" });
      if (!r.ok) throw new Error("fail");
      return r.json();
    },
    refetchInterval: 15_000,
  });

  const selectedFile = useQuery<CentroFile>({
    queryKey: ["centro-comando", "file", selected],
    queryFn: async () => {
      const r = await fetch(`/api/centro-comando/files/${selected}`, { credentials: "include" });
      if (!r.ok) throw new Error("fail");
      return r.json();
    },
    enabled: !!selected,
    refetchInterval: 15_000,
  });

  const activity = useQuery<SyncEvent[]>({
    queryKey: ["centro-comando", "activity"],
    queryFn: async () => {
      const r = await fetch("/api/centro-comando/activity", { credentials: "include" });
      if (!r.ok) throw new Error("fail");
      return r.json();
    },
    refetchInterval: 15_000,
  });

  const tasksFile = useQuery<CentroFile>({
    queryKey: ["centro-comando", "tasks"],
    queryFn: async () => {
      const r = await fetch("/api/centro-comando/tasks", { credentials: "include" });
      if (!r.ok) throw new Error("fail");
      return r.json();
    },
    refetchInterval: 15_000,
  });

  const files = filesList.data ?? [];
  const lastSyncIso = files.length
    ? files.reduce((acc, f) => (f.syncedAt > acc ? f.syncedAt : acc), files[0].syncedAt)
    : null;
  const isStale = lastSyncIso
    ? Date.now() - new Date(lastSyncIso).getTime() > STALE_THRESHOLD_MS
    : true;

  const taskCounts = countTasks(tasksFile.data?.content || "");

  const grouped = {
    brain: files.filter((f) => f.category === "brain"),
    tasks: files.filter((f) => f.category === "tasks"),
    memory: files.filter((f) => f.category === "memory"),
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400 font-medium">
              <span>Vertex Company</span>
            </div>
            <h1 className="text-2xl font-light text-slate-900 mt-1">Centro de Comando</h1>
            <p className="text-sm text-slate-500 mt-1">
              Espelho do estado operacional sincronizado do Mac.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isStale ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                <AlertTriangle className="w-3.5 h-3.5" />
                Sync desatualizado · {relativeTime(lastSyncIso)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <RefreshCw className="w-3.5 h-3.5" />
                Sincronizado · {relativeTime(lastSyncIso)}
              </span>
            )}
            <button
              onClick={() => {
                filesList.refetch();
                selectedFile.refetch();
                activity.refetch();
                tasksFile.refetch();
              }}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              aria-label="Atualizar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KpiCard
            icon={Brain}
            label="Brain (CLAUDE.md)"
            value={grouped.brain.length ? "ativo" : "vazio"}
            sub={grouped.brain[0] ? formatBytes(grouped.brain[0].bytes) : "—"}
            accent="text-slate-700"
          />
          <KpiCard
            icon={CheckSquare}
            label="Tarefas"
            value={`${taskCounts.open} abertas`}
            sub={`${taskCounts.done} concluídas`}
            accent="text-sky-700"
          />
          <KpiCard
            icon={FolderOpen}
            label="Memory files"
            value={String(grouped.memory.length)}
            sub="arquivos sincronizados"
            accent="text-violet-700"
          />
          <KpiCard
            icon={Activity}
            label="Última atividade"
            value={relativeTime(activity.data?.[0]?.createdAt)}
            sub={activity.data?.[0]?.fileKey || "—"}
            accent="text-emerald-700"
          />
        </div>

        {/* Main grid: file tree + viewer + activity */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* File tree */}
          <aside className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-4 min-h-[500px]">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Arquivos
            </h2>
            <FileGroup
              title="Brain"
              files={grouped.brain}
              selected={selected}
              onSelect={setSelected}
              icon={Brain}
            />
            <FileGroup
              title="Tasks"
              files={grouped.tasks}
              selected={selected}
              onSelect={setSelected}
              icon={CheckSquare}
            />
            <FileGroup
              title="Memory"
              files={grouped.memory}
              selected={selected}
              onSelect={setSelected}
              icon={FolderOpen}
            />
            {files.length === 0 && !filesList.isLoading && (
              <EmptyState />
            )}
          </aside>

          {/* Viewer */}
          <section className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-4 min-h-[500px]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                <h2 className="text-sm font-medium text-slate-700">
                  {selected || "—"}
                </h2>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                {relativeTime(selectedFile.data?.updatedAt)}
              </div>
            </div>
            <pre className="text-xs leading-relaxed whitespace-pre-wrap break-words text-slate-700 font-mono bg-slate-50 border border-slate-100 rounded-lg p-4 max-h-[600px] overflow-auto">
{selectedFile.data?.content || (selectedFile.isLoading ? "Carregando…" : "Arquivo vazio ou não sincronizado.")}
            </pre>
          </section>

          {/* Activity */}
          <aside className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-4 min-h-[500px]">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Atividade (30d)
            </h2>
            <ul className="space-y-2">
              {(activity.data || []).slice(0, 30).map((ev) => (
                <li key={ev.id} className="text-xs border-l-2 border-slate-200 pl-3 py-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-slate-700 truncate">{ev.fileKey}</span>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded uppercase font-medium",
                        ev.action === "upsert" && "bg-emerald-50 text-emerald-700",
                        ev.action === "noop" && "bg-slate-50 text-slate-500",
                        ev.action === "delete" && "bg-rose-50 text-rose-700",
                      )}
                    >
                      {ev.action}
                    </span>
                  </div>
                  <div className="text-slate-400 text-[11px] mt-0.5">
                    {relativeTime(ev.createdAt)} · {ev.source}
                    {ev.bytesAfter != null ? ` · ${formatBytes(ev.bytesAfter)}` : ""}
                  </div>
                </li>
              ))}
              {(!activity.data || activity.data.length === 0) && (
                <li className="text-xs text-slate-400">Nenhum evento ainda.</li>
              )}
            </ul>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Icon className={cn("w-4 h-4", accent)} />
        <span>{label}</span>
      </div>
      <div className="text-xl font-light text-slate-900 mt-2">{value}</div>
      <div className="text-xs text-slate-400 mt-0.5">{sub}</div>
    </div>
  );
}

function FileGroup({
  title,
  files,
  selected,
  onSelect,
  icon: Icon,
}: {
  title: string;
  files: CentroFile[];
  selected: string;
  onSelect: (key: string) => void;
  icon: React.ElementType;
}) {
  if (files.length === 0) return null;
  return (
    <div className="mb-4">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
        <Icon className="w-3 h-3" />
        {title}
      </div>
      <ul className="space-y-0.5">
        {files.map((f) => (
          <li key={f.id}>
            <button
              onClick={() => onSelect(f.fileKey)}
              className={cn(
                "w-full text-left text-xs py-1.5 px-2 rounded-md font-mono truncate",
                selected === f.fileKey
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-50",
              )}
              title={f.fileKey}
            >
              {f.fileKey.replace(/^memory\//, "")}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-8 text-xs text-slate-400">
      Nenhum arquivo sincronizado.<br />
      Rode o watcher no Mac.
    </div>
  );
}
