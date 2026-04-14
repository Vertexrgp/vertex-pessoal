// Destino: artifacts/vertex-finance/src/pages/v2-centro-comando.tsx
//
// Frontend do Centro de Comando v2 — Rich React UI com 7 tabs
// Replica o design do localhost:3333 em React + TypeScript + Tailwind

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Youtube,
  DollarSign,
  Users,
  Video,
  ListTodo,
  Link as LinkIcon,
  Zap,
  FileDown,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

// ────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────

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

type SystemMetrics = {
  revenue: number;
  subscribers: number;
  views28d: number;
  videos_published: number;
  videos_produced: number;
  tasks_pending: number;
  tasks_done: number;
  memory_files: number;
  lastSync: string | null;
};

type YoutubeMetrics = {
  channel_id: string;
  title: string;
  subscribers: number;
  total_views: number;
  video_count: number;
  updated_at: string;
};

type YoutubeVideo = {
  id: string;
  title: string;
  published_at: string;
  views: number;
  likes: number;
  comments: number;
};

type WeeklyReport = {
  markdown: string;
  generated_at: string;
};

// ────────────────────────────────────────────────────────────────────
// UTILITIES
// ────────────────────────────────────────────────────────────────────

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

function countTasks(
  content: string
): { open: number; done: number } {
  if (!content) return { open: 0, done: 0 };
  const open = (content.match(/^\s*-\s*\[\s\]/gm) || []).length;
  const done = (content.match(/^\s*-\s*\[x\]/gim) || []).length;
  return { open, done };
}

// ────────────────────────────────────────────────────────────────────
// MAIN PAGE COMPONENT
// ────────────────────────────────────────────────────────────────────

export default function CentroComandoV2() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [reportCopied, setReportCopied] = useState(false);

  // Query: system metrics
  const systemQuery = useQuery<SystemMetrics>({
    queryKey: ["centro-comando", "system"],
    queryFn: async () => {
      const r = await fetch("/api/centro-comando/system", {
        credentials: "include",
      });
      if (!r.ok) throw new Error("fail");
      return r.json();
    },
    refetchInterval: 15_000,
  });

  // Query: YouTube metrics
  const youtubeMetricsQuery = useQuery<YoutubeMetrics | null>({
    queryKey: ["centro-comando", "youtube", "metrics"],
    queryFn: async () => {
      try {
        const r = await fetch("/api/centro-comando/youtube/metrics", {
          credentials: "include",
        });
        if (!r.ok) {
          if (r.status === 503) return null;
          throw new Error("fail");
        }
        return r.json();
      } catch {
        return null;
      }
    },
    refetchInterval: 30_000,
  });

  // Query: YouTube videos
  const youtubeVideosQuery = useQuery<YoutubeVideo[]>({
    queryKey: ["centro-comando", "youtube", "videos"],
    queryFn: async () => {
      try {
        const r = await fetch("/api/centro-comando/youtube/videos", {
          credentials: "include",
        });
        if (!r.ok) return [];
        const data = await r.json();
        return data.videos || [];
      } catch {
        return [];
      }
    },
    refetchInterval: 30_000,
  });

  // Query: Amazon audit
  const amazonQuery = useQuery<any>({
    queryKey: ["centro-comando", "amazon", "audit"],
    queryFn: async () => {
      try {
        const r = await fetch("/api/centro-comando/amazon/audit", {
          credentials: "include",
        });
        if (!r.ok) return { videos: [] };
        return r.json();
      } catch {
        return { videos: [] };
      }
    },
    refetchInterval: 60_000,
  });

  // Query: Weekly report
  const reportQuery = useQuery<WeeklyReport>({
    queryKey: ["centro-comando", "reports", "weekly"],
    queryFn: async () => {
      const r = await fetch("/api/centro-comando/reports/weekly", {
        credentials: "include",
      });
      if (!r.ok) throw new Error("fail");
      return r.json();
    },
    enabled: activeTab === "actions",
  });

  // Query: files (for memory tab)
  const filesQuery = useQuery<CentroFile[]>({
    queryKey: ["centro-comando", "files"],
    queryFn: async () => {
      const r = await fetch("/api/centro-comando/files", {
        credentials: "include",
      });
      if (!r.ok) throw new Error("fail");
      return r.json();
    },
    refetchInterval: 15_000,
  });

  // Query: activity log
  const activityQuery = useQuery<SyncEvent[]>({
    queryKey: ["centro-comando", "activity"],
    queryFn: async () => {
      const r = await fetch("/api/centro-comando/activity", {
        credentials: "include",
      });
      if (!r.ok) throw new Error("fail");
      return r.json();
    },
    refetchInterval: 15_000,
  });

  const system = systemQuery.data || {};
  const youtubeMetrics = youtubeMetricsQuery.data;
  const youtubeVideos = youtubeVideosQuery.data || [];
  const files = filesQuery.data || [];
  const activity = activityQuery.data || [];

  const lastSyncIso = activity.length ? activity[0].createdAt : null;
  const isStale = lastSyncIso
    ? Date.now() - new Date(lastSyncIso).getTime() > STALE_THRESHOLD_MS
    : true;

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: Brain },
    { id: "youtube", label: "YouTube", icon: Youtube },
    { id: "projects", label: "Projetos", icon: FolderOpen },
    { id: "tasks", label: "Tarefas", icon: CheckSquare },
    { id: "videos", label: "Vídeos", icon: Video },
    { id: "memory", label: "Memória", icon: FileText },
    { id: "actions", label: "Ações", icon: Zap },
  ];

  const handleRefresh = () => {
    queryClient.refetchQueries();
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6 bg-gradient-to-b from-slate-50 to-white">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500 font-semibold">
              <Brain className="w-4 h-4" />
              <span>Vertex Company</span>
            </div>
            <h1 className="text-3xl font-light text-slate-900 mt-2">
              Centro de Comando
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Dashboard operacional — múltiplos departamentos sincronizados
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isStale ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                <AlertTriangle className="w-4 h-4" />
                Desatualizado · {relativeTime(lastSyncIso)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <RefreshCw className="w-4 h-4" />
                Online · {relativeTime(lastSyncIso)}
              </span>
            )}
            <button
              onClick={handleRefresh}
              disabled={systemQuery.isPending}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              aria-label="Atualizar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard
            icon={DollarSign}
            label="Receita"
            value={`R$${system.revenue || 0}`}
            sub="Meta: R$40K"
            accent="text-emerald-600"
          />
          <KpiCard
            icon={Users}
            label="Inscritos"
            value={system.subscribers?.toLocaleString("pt-BR") || "—"}
            sub="Meta: 50K"
            accent="text-blue-600"
          />
          <KpiCard
            icon={Activity}
            label="Views 28d"
            value={system.views28d?.toLocaleString("pt-BR") || "—"}
            sub="Meta: 1M"
            accent="text-violet-600"
          />
          <KpiCard
            icon={CheckSquare}
            label="Tarefas"
            value={`${system.tasks_pending || 0} abertas`}
            sub={`${system.tasks_done || 0} feitas`}
            accent="text-amber-600"
          />
          <KpiCard
            icon={Video}
            label="Vídeos"
            value={system.videos_published || 0}
            sub={`${system.videos_produced || 0} produzidos`}
            accent="text-rose-600"
          />
          <KpiCard
            icon={Brain}
            label="Memória"
            value={system.memory_files || 0}
            sub="departamentos"
            accent="text-indigo-600"
          />
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 -mx-6 px-6">
          <div className="flex gap-1 overflow-x-auto -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 border-b-2 transition whitespace-nowrap",
                    activeTab === tab.id
                      ? "border-slate-900 text-slate-900 font-medium"
                      : "border-transparent text-slate-600 hover:text-slate-900"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === "dashboard" && (
            <DashboardTab system={system} activity={activity} />
          )}
          {activeTab === "youtube" && (
            <YoutubeTab
              metrics={youtubeMetrics}
              videos={youtubeVideos}
              amazon={amazonQuery.data}
            />
          )}
          {activeTab === "projects" && <ProjectsTab />}
          {activeTab === "tasks" && <TasksTab system={system} />}
          {activeTab === "videos" && <VideosTab videos={youtubeVideos} />}
          {activeTab === "memory" && <MemoryTab files={files} />}
          {activeTab === "actions" && (
            <ActionsTab report={reportQuery.data} copied={reportCopied} onCopy={() => setReportCopied(true)} />
          )}
        </div>
      </div>
    </AppLayout>
  );
}

// ────────────────────────────────────────────────────────────────────
// TAB COMPONENTS
// ────────────────────────────────────────────────────────────────────

function DashboardTab({
  system,
  activity,
}: {
  system: SystemMetrics;
  activity: SyncEvent[];
}) {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">
          Progresso Meta R$40K/mês
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${Math.min((system.revenue / 40000) * 100, 100)}%` }}
              />
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-light text-slate-900">
              {((system.revenue / 40000) * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">
          Atividade Recente (30d)
        </h2>
        <ul className="space-y-3">
          {activity.slice(0, 10).map((ev) => (
            <li
              key={ev.id}
              className="flex items-center justify-between text-sm border-l-2 border-slate-200 pl-3 py-1"
            >
              <span className="font-mono text-slate-700">{ev.fileKey}</span>
              <span
                className={cn(
                  "text-[11px] px-2 py-1 rounded uppercase font-medium",
                  ev.action === "upsert" && "bg-emerald-50 text-emerald-700",
                  ev.action === "noop" && "bg-slate-50 text-slate-500",
                  ev.action === "delete" && "bg-rose-50 text-rose-700"
                )}
              >
                {ev.action}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function YoutubeTab({
  metrics,
  videos,
  amazon,
}: {
  metrics: YoutubeMetrics | null;
  videos: YoutubeVideo[];
  amazon?: any;
}) {
  if (!metrics) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
        <p className="text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 inline mr-2" />
          YOUTUBE_API_KEY não configurada no servidor
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Inscritos
          </h3>
          <p className="text-2xl font-light text-slate-900">
            {metrics.subscribers.toLocaleString("pt-BR")}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Total Views
          </h3>
          <p className="text-2xl font-light text-slate-900">
            {metrics.total_views.toLocaleString("pt-BR")}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Vídeos
          </h3>
          <p className="text-2xl font-light text-slate-900">
            {metrics.video_count}
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">
          Vídeos Recentes (Top 10)
        </h2>
        <ul className="space-y-3">
          {videos.slice(0, 10).map((v) => (
            <li key={v.id} className="flex items-center justify-between text-sm">
              <span className="text-slate-700 truncate font-medium">
                {v.title}
              </span>
              <span className="text-slate-500 font-mono text-xs">
                {v.views.toLocaleString("pt-BR")} views
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ProjectsTab() {
  const projects = [
    { name: "Content", icon: Video, status: "Ativo", color: "emerald" },
    {
      name: "Products",
      icon: FolderOpen,
      status: "Planejado",
      color: "amber",
    },
    { name: "Finance", icon: DollarSign, status: "Planejado", color: "slate" },
    { name: "Growth", icon: Activity, status: "Planejado", color: "slate" },
    { name: "R&D", icon: Brain, status: "Planejado", color: "violet" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {projects.map((p) => {
        const Icon = p.icon;
        return (
          <div
            key={p.name}
            className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-blue-300 transition"
          >
            <div className="flex items-start justify-between mb-3">
              <Icon className={cn("w-6 h-6", `text-${p.color}-600`)} />
              <span
                className={cn(
                  "text-xs font-medium px-2 py-1 rounded",
                  p.status === "Ativo"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-50 text-slate-600"
                )}
              >
                {p.status}
              </span>
            </div>
            <h3 className="text-lg font-medium text-slate-900">{p.name}</h3>
          </div>
        );
      })}
    </div>
  );
}

function TasksTab({ system }: { system: SystemMetrics }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">
        Status de Tarefas
      </h2>
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-700 font-medium">Abertas</span>
            <span className="text-slate-500">{system.tasks_pending || 0}</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all"
              style={{
                width: `${
                  ((system.tasks_pending || 0) /
                    ((system.tasks_pending || 0) + (system.tasks_done || 0) ||
                      1)) *
                  100
                }%`,
              }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-700 font-medium">Concluídas</span>
            <span className="text-slate-500">{system.tasks_done || 0}</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{
                width: `${
                  ((system.tasks_done || 0) /
                    ((system.tasks_pending || 0) + (system.tasks_done || 0) ||
                      1)) *
                  100
                }%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function VideosTab({ videos }: { videos: YoutubeVideo[] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <table className="w-full">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="text-left text-xs font-semibold text-slate-600 px-6 py-3 uppercase tracking-wider">
              Título
            </th>
            <th className="text-right text-xs font-semibold text-slate-600 px-6 py-3 uppercase tracking-wider">
              Views
            </th>
            <th className="text-right text-xs font-semibold text-slate-600 px-6 py-3 uppercase tracking-wider">
              Likes
            </th>
          </tr>
        </thead>
        <tbody>
          {videos.map((v, i) => (
            <tr key={v.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-6 py-3 text-sm text-slate-700 truncate">
                {v.title}
              </td>
              <td className="px-6 py-3 text-sm text-right text-slate-600 font-mono">
                {v.views.toLocaleString("pt-BR")}
              </td>
              <td className="px-6 py-3 text-sm text-right text-slate-600 font-mono">
                {v.likes.toLocaleString("pt-BR")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MemoryTab({ files }: { files: CentroFile[] }) {
  const grouped = {
    brain: files.filter((f) => f.category === "brain"),
    tasks: files.filter((f) => f.category === "tasks"),
    memory: files.filter((f) => f.category === "memory"),
  };

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([cat, items]) => {
        if (items.length === 0) return null;
        return (
          <div
            key={cat}
            className="bg-white border border-slate-200 rounded-2xl p-6"
          >
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
              {cat === "brain"
                ? "Brain (CLAUDE.md)"
                : cat === "tasks"
                  ? "Tarefas"
                  : "Memory"}
            </h2>
            <ul className="space-y-2">
              {items.map((f) => (
                <li
                  key={f.id}
                  className="text-sm flex justify-between items-center p-2 rounded hover:bg-slate-50"
                >
                  <span className="font-mono text-slate-700 truncate">
                    {f.fileKey.replace(/^memory\//, "")}
                  </span>
                  <span className="text-xs text-slate-500">
                    {relativeTime(f.updatedAt)} · {formatBytes(f.bytes)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function ActionsTab({
  report,
  copied,
  onCopy,
}: {
  report?: WeeklyReport;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Relatório Semanal
          </h2>
          {report && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(report.markdown);
                onCopy();
                setTimeout(() => {}, 2000);
              }}
              className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copiar
                </>
              )}
            </button>
          )}
        </div>
        {report ? (
          <pre className="text-xs leading-relaxed whitespace-pre-wrap break-words bg-slate-50 border border-slate-100 rounded-lg p-4 max-h-[400px] overflow-auto text-slate-700 font-mono">
            {report.markdown}
          </pre>
        ) : (
          <p className="text-sm text-slate-500">Carregando relatório...</p>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// HELPER COMPONENTS
// ────────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub: string;
  accent: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-slate-300 transition">
      <div className={cn("flex items-center gap-2 text-xs mb-2", accent)}>
        <Icon className="w-4 h-4" />
        <span className="text-slate-500">{label}</span>
      </div>
      <div className="text-xl font-light text-slate-900">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{sub}</div>
    </div>
  );
}
