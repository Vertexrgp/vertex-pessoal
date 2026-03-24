import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { videosApi, type Video } from "@/lib/conhecimento-api";
import {
  Play, ArrowLeft, ExternalLink, Loader2, Edit2, Save, X,
  Lightbulb, Star, ListChecks, FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_MAP = {
  quero_ver:  { label: "Na fila",   cls: "bg-slate-100 text-slate-600" },
  vendo:      { label: "Assistindo", cls: "bg-violet-100 text-violet-700" },
  concluido:  { label: "Concluído", cls: "bg-emerald-100 text-emerald-700" },
};

const PLATAFORMA_COLORS: Record<string, string> = {
  YouTube: "#EF4444",
  Instagram: "#EC4899",
  Curso: "#6366F1",
  LinkedIn: "#3B82F6",
  TikTok: "#14B8A6",
  Outro: "#64748B",
};

export default function VideoDetailPage({ id }: { id?: string }) {
  const videoId = parseInt(id ?? "0");
  const qc = useQueryClient();
  const { toast } = useToast();

  const [editField, setEditField] = useState<"resumo" | "insights" | "pontos" | "frases" | null>(null);
  const [editValue, setEditValue] = useState("");

  const { data: video, isLoading } = useQuery<Video>({
    queryKey: ["video", videoId],
    queryFn: () => videosApi.get(videoId),
    enabled: !!videoId,
  });

  const update = useMutation({
    mutationFn: (data: Partial<Video>) => videosApi.update(videoId, data),
    onSuccess: (updated) => {
      qc.setQueryData(["video", videoId], updated);
      qc.invalidateQueries({ queryKey: ["videos"] });
      setEditField(null);
      toast({ title: "Salvo!" });
    },
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
        </div>
      </AppLayout>
    );
  }

  if (!video) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center py-24 text-center">
          <p className="text-slate-500">Vídeo não encontrado.</p>
          <Link href="/conhecimento/videos">
            <button className="mt-4 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold">Voltar</button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  const st = STATUS_MAP[video.status] ?? STATUS_MAP.quero_ver;
  const cor = PLATAFORMA_COLORS[video.plataforma] ?? "#64748B";

  const startEdit = (field: typeof editField, value: string | null) => {
    setEditField(field);
    setEditValue(value ?? "");
  };

  const saveField = () => {
    if (editField === "resumo") update.mutate({ resumo: editValue || null });
    if (editField === "insights") update.mutate({ insights: editValue || null });
    if (editField === "pontos") update.mutate({ pontosImportantes: editValue || null });
    if (editField === "frases") update.mutate({ frasesMarcantes: editValue || null });
  };

  function EditableSection({
    field,
    label,
    icon: Icon,
    value,
    iconColor,
    placeholder,
  }: {
    field: "resumo" | "insights" | "pontos" | "frases";
    label: string;
    icon: typeof Lightbulb;
    value: string | null;
    iconColor: string;
    placeholder: string;
  }) {
    const isEditing = editField === field;

    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconColor}`}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <h3 className="font-semibold text-slate-800 text-sm">{label}</h3>
          </div>
          {!isEditing && (
            <button onClick={() => startEdit(field, value)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-all">
              <Edit2 className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              rows={5}
              placeholder={placeholder}
              autoFocus
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditField(null)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 flex items-center gap-1">
                <X className="w-3 h-3" /> Cancelar
              </button>
              <button onClick={saveField} disabled={update.isPending} className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold flex items-center gap-1 disabled:opacity-50">
                {update.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Salvar
              </button>
            </div>
          </div>
        ) : value ? (
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{value}</p>
        ) : (
          <button onClick={() => startEdit(field, null)} className="text-sm text-slate-400 hover:text-primary transition-colors text-left">
            + Adicionar {label.toLowerCase()}...
          </button>
        )}
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Link href="/conhecimento/videos">
            <button className="p-2 rounded-xl hover:bg-slate-100 transition-all">
              <ArrowLeft className="w-4 h-4 text-slate-500" />
            </button>
          </Link>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Conhecimento · Vídeos</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="relative h-48 bg-slate-100">
            {video.thumbnail ? (
              <img src={video.thumbnail} alt={video.titulo} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: `${cor}15` }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: `${cor}25` }}>
                  <Play className="w-8 h-8" style={{ color: cor }} />
                </div>
              </div>
            )}
            {video.link && (
              <a
                href={video.link}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-3 right-3 flex items-center gap-2 px-3 py-2 bg-black/70 rounded-xl text-white text-xs font-semibold hover:bg-black/80 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Assistir
              </a>
            )}
          </div>

          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900 leading-snug">{video.titulo}</h1>
                {video.tema && <p className="text-sm text-slate-500 mt-1">{video.tema}</p>}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-4">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: cor }}>{video.plataforma}</span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${st.cls}`}>{st.label}</span>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">{video.categoria}</span>
            </div>

            <div className="mt-4 flex gap-3">
              {(["quero_ver", "vendo", "concluido"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => update.mutate({ status: s })}
                  disabled={video.status === s || update.isPending}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${video.status === s ? "bg-primary text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"} disabled:opacity-60`}
                >
                  {STATUS_MAP[s].label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <EditableSection
          field="resumo"
          label="Resumo"
          icon={FileText}
          value={video.resumo}
          iconColor="bg-blue-100 text-blue-600"
          placeholder="Sobre o que é esse vídeo? O que ele aborda?"
        />

        <EditableSection
          field="insights"
          label="Insights"
          icon={Lightbulb}
          value={video.insights}
          iconColor="bg-amber-100 text-amber-600"
          placeholder="O que você aprendeu? Quais insights tirou?"
        />

        <EditableSection
          field="pontos"
          label="Pontos Importantes"
          icon={ListChecks}
          value={video.pontosImportantes}
          iconColor="bg-emerald-100 text-emerald-600"
          placeholder="Liste os pontos mais importantes do vídeo..."
        />

        <EditableSection
          field="frases"
          label="Frases Marcantes"
          icon={Star}
          value={video.frasesMarcantes}
          iconColor="bg-violet-100 text-violet-600"
          placeholder="Frases ou citações que chamaram atenção..."
        />
      </div>
    </AppLayout>
  );
}
