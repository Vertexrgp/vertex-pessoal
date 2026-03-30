import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PerformanceLayout } from "@/components/layout/PerformanceLayout";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Camera, X, Target, TrendingUp, TrendingDown, Save,
  ImagePlus, CalendarDays, ZoomIn, Sparkles, ArrowRight,
  ChevronRight, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getApiBase } from "@/lib/api-base";

type BodyGoal = {
  id: number;
  pesoAtual: string | null;
  bfAtual: string | null;
  pesoAlvo: string | null;
  bfAlvo: string | null;
  prazo: string | null;
  updatedAt?: string;
};

type BodyPhoto = {
  id: number;
  tipo: string;
  imageUrl: string | null;
  objectPath: string | null;
  imageData: string | null;  // legacy
  goalId: number | null;
  createdAt?: string;
};

const CURRENT_SLOTS = [
  { tipo: "atual_frente", label: "Frente" },
  { tipo: "atual_lado", label: "Lado" },
  { tipo: "atual_costas", label: "Costas" },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

async function uploadToStorage(file: File, apiBase: string): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error("Formato inválido. Use JPG, PNG ou WebP.");
  if (file.size > MAX_FILE_SIZE) throw new Error("Arquivo muito grande. Limite: 5MB.");

  // Step 1: Request presigned URL
  const res = await fetch(`${apiBase}/api/storage/uploads/request-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
  });
  if (!res.ok) throw new Error("Falha ao obter URL de upload.");
  const { uploadURL, objectPath } = await res.json();

  // Step 2: Upload directly to GCS via presigned URL
  const putRes = await fetch(uploadURL, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!putRes.ok) throw new Error("Falha no upload da imagem.");

  return objectPath as string;
}

function fmtDate(d?: string | null) {
  if (!d) return null;
  const date = new Date(d);
  if (isNaN(date.getTime())) {
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  }
  return date.toLocaleDateString("pt-BR");
}

function calcProgress(curr: string, target: string): number {
  const c = parseFloat(curr);
  const t = parseFloat(target);
  if (!c || !t) return 0;
  const gap = Math.abs(t - c);
  const pct = (gap / Math.abs(t)) * 200;
  return Math.max(0, Math.min(100, 100 - pct));
}

function isClose(progress: number) { return progress >= 75; }

/* ─── Photo Modal ─── */
function PhotoModal({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
        <img src={src} alt="Foto ampliada" className="w-full h-auto max-h-[85vh] object-contain rounded-2xl shadow-2xl" />
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5 text-slate-700" />
        </button>
      </div>
    </div>
  );
}

/* ─── Reference Photo Card ─── */
function RefPhotoCard({ photo, onRemove, onZoom }: {
  photo: BodyPhoto; onRemove: (id: number) => void; onZoom: (src: string) => void;
}) {
  return (
    <div className="relative aspect-[2/3] rounded-xl overflow-hidden border border-slate-200 shadow-sm group transition-all duration-300 hover:scale-[1.02] hover:shadow-lg cursor-pointer">
      <img src={photo.imageUrl ?? photo.imageData ?? ""} alt="Referência" className="w-full h-full object-cover" onClick={() => onZoom(photo.imageUrl ?? photo.imageData ?? "")} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onZoom(photo.imageUrl ?? photo.imageData ?? "")}
          className="w-7 h-7 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white transition-colors">
          <ZoomIn className="w-3.5 h-3.5 text-slate-700" />
        </button>
        <button onClick={() => onRemove(photo.id)}
          className="w-7 h-7 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-red-50 transition-colors">
          <X className="w-3.5 h-3.5 text-rose-500" />
        </button>
      </div>
    </div>
  );
}

/* ─── Add Photo Card ─── */
function AddPhotoCard({ onUpload, uploading, compact }: {
  onUpload: (file: File) => void; uploading: boolean; compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        className={cn(
          "rounded-xl border-2 border-dashed border-slate-200 hover:border-primary/50 cursor-pointer",
          "bg-slate-50/80 hover:bg-primary/5 transition-all duration-200 group",
          "flex flex-col items-center justify-center gap-2 text-slate-400",
          compact ? "aspect-[2/3]" : "aspect-[2/3]"
        )}
      >
        {uploading ? (
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        ) : (
          <>
            <ImagePlus className="w-6 h-6 text-slate-300 group-hover:text-primary/60 transition-colors" />
            <span className="text-xs text-center px-2 group-hover:text-slate-600 transition-colors">
              {compact ? "Adicionar" : "Adicionar foto"}
            </span>
          </>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />
    </>
  );
}

/* ─── Fixed Photo Slot (Frente/Lado/Costas) ─── */
function FixedPhotoSlot({ tipo, label, photo, onUpload, onRemove, onZoom, uploading }: {
  tipo: string; label: string; photo?: BodyPhoto;
  onUpload: (tipo: string, file: File) => void;
  onRemove: (id: number) => void;
  onZoom: (src: string) => void;
  uploading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={cn(
          "relative aspect-[2/3] rounded-xl overflow-hidden border-2 transition-all duration-300",
          photo
            ? "border-slate-200 shadow-sm group hover:scale-[1.02] hover:shadow-md cursor-pointer"
            : "border-dashed border-slate-200 hover:border-primary/50 cursor-pointer bg-slate-50 hover:bg-primary/5"
        )}
        onClick={() => !photo && !uploading && inputRef.current?.click()}
      >
        {photo ? (
          <>
            <img src={photo.imageUrl ?? photo.imageData ?? ""} alt={label} className="w-full h-full object-cover" onClick={() => onZoom(photo.imageUrl ?? photo.imageData ?? "")} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={e => { e.stopPropagation(); onZoom(photo.imageUrl ?? photo.imageData ?? ""); }}
                className="w-7 h-7 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white transition-colors">
                <ZoomIn className="w-3.5 h-3.5 text-slate-700" />
              </button>
              <button onClick={e => { e.stopPropagation(); onRemove(photo.id); }}
                className="w-7 h-7 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-red-50 transition-colors">
                <X className="w-3.5 h-3.5 text-rose-500" />
              </button>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            {uploading ? (
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            ) : (
              <>
                <Camera className="w-7 h-7 text-slate-300" />
                <span className="text-xs text-slate-400">Enviar</span>
              </>
            )}
          </div>
        )}
      </div>
      <p className="text-center text-[11px] font-semibold text-slate-400 uppercase tracking-widest">{label}</p>
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(tipo, f); e.target.value = ""; }} />
    </div>
  );
}

/* ─── Numeric Input ─── */
function NumInput({ label, value, onChange, suffix, placeholder, highlight }: {
  label: string; value: string; onChange: (v: string) => void;
  suffix?: string; placeholder?: string; highlight?: boolean;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{label}</label>
      <div className="relative">
        <input
          type="number" step="0.1" min="0"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "w-full h-11 rounded-xl border px-3 pr-10 text-sm font-medium bg-white transition-all",
            "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50",
            highlight ? "border-primary/30 bg-primary/5" : "border-slate-200"
          )}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── Progress Bar ─── */
function ProgressBar({ progress, close }: { progress: number; close: boolean }) {
  return (
    <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div
        className={cn(
          "h-full rounded-full transition-all duration-700",
          close ? "bg-emerald-500" : progress > 40 ? "bg-primary/70" : "bg-slate-300"
        )}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export default function ObjetivoFisicoPage() {
  const qc = useQueryClient();
  const [uploadingTipo, setUploadingTipo] = useState<string | null>(null);
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);
  const [form, setForm] = useState({ pesoAtual: "", bfAtual: "", pesoAlvo: "", bfAlvo: "", prazo: "" });
  const [dirty, setDirty] = useState(false);

  const { data: goal } = useQuery<BodyGoal | null>({
    queryKey: ["body-goal"],
    queryFn: () => fetch(`${getApiBase()}/api/performance/body-goal`).then(r => r.json()),
  });

  const { data: photos = [] } = useQuery<BodyPhoto[]>({
    queryKey: ["body-photos"],
    queryFn: () => fetch(`${getApiBase()}/api/performance/body-photos`).then(r => r.json()),
  });

  useEffect(() => {
    if (goal && !dirty) {
      setForm({
        pesoAtual: goal.pesoAtual ?? "",
        bfAtual: goal.bfAtual ?? "",
        pesoAlvo: goal.pesoAlvo ?? "",
        bfAlvo: goal.bfAlvo ?? "",
        prazo: goal.prazo ?? "",
      });
    }
  }, [goal]);

  const saveGoal = useMutation({
    mutationFn: async (data: typeof form) => {
      const body = { pesoAtual: data.pesoAtual || null, bfAtual: data.bfAtual || null, pesoAlvo: data.pesoAlvo || null, bfAlvo: data.bfAlvo || null, prazo: data.prazo || null };
      if (goal?.id) return fetch(`${getApiBase()}/api/performance/body-goal/${goal.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json());
      return fetch(`${getApiBase()}/api/performance/body-goal`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json());
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["body-goal"] }); setDirty(false); },
  });

  const addPhoto = useMutation({
    mutationFn: (data: { tipo: string; objectPath: string; goalId?: number }) =>
      fetch(`${getApiBase()}/api/performance/body-photos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["body-photos"] }); setUploadingTipo(null); },
    onError: () => setUploadingTipo(null),
  });

  const removePhoto = useMutation({
    mutationFn: (id: number) => fetch(`${getApiBase()}/api/performance/body-photos/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["body-photos"] }),
  });

  const handleUpload = useCallback(async (tipo: string, file: File) => {
    setUploadingTipo(tipo);
    try {
      const objectPath = await uploadToStorage(file, getApiBase());
      await addPhoto.mutateAsync({ tipo, objectPath, goalId: goal?.id });
    } catch (err) {
      setUploadingTipo(null);
      alert(err instanceof Error ? err.message : "Erro ao enviar imagem.");
    }
  }, [goal, addPhoto]);

  function setField(k: keyof typeof form, v: string) { setForm(f => ({ ...f, [k]: v })); setDirty(true); }

  const refPhotos = photos.filter(p => p.tipo === "objetivo");
  const currentPhotos = CURRENT_SLOTS.map(s => ({ ...s, photo: photos.find(p => p.tipo === s.tipo) }));
  const lastCurrentPhoto = currentPhotos.filter(s => s.photo).sort((a, b) => {
    const da = a.photo?.createdAt ?? "";
    const db = b.photo?.createdAt ?? "";
    return db.localeCompare(da);
  })[0]?.photo;

  const pesoD = form.pesoAtual && form.pesoAlvo ? parseFloat(form.pesoAlvo) - parseFloat(form.pesoAtual) : null;
  const bfD = form.bfAtual && form.bfAlvo ? parseFloat(form.bfAlvo) - parseFloat(form.bfAtual) : null;
  const pesoProgress = form.pesoAtual && form.pesoAlvo ? calcProgress(form.pesoAtual, form.pesoAlvo) : 0;
  const bfProgress = form.bfAtual && form.bfAlvo ? calcProgress(form.bfAtual, form.bfAlvo) : 0;
  const pesoClose = isClose(pesoProgress);
  const bfClose = isClose(bfProgress);
  const hasData = pesoD !== null && bfD !== null;

  return (
    <AppLayout title="Performance">
      <PerformanceLayout>

        {/* ─── Header ─── */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Objetivo Físico</h1>
            <p className="text-sm text-slate-400 mt-1 font-medium">
              Seu corpo atual vs. o corpo que você está construindo
            </p>
          </div>
          <button
            onClick={() => saveGoal.mutate(form)}
            disabled={saveGoal.isPending || !dirty}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
              dirty
                ? "bg-primary text-white shadow-md shadow-primary/25 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            )}
          >
            <Save className="w-4 h-4" />
            {saveGoal.isPending ? "Salvando..." : "Salvar"}
          </button>
        </div>

        {/* ─── HERO: 3-column layout ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px_1fr] gap-5 mb-6">

          {/* LEFT: Físico Desejado */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                <Target className="w-4 h-4 text-violet-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800">Físico Desejado</h2>
                <p className="text-[11px] text-slate-400">Fotos de referência</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {refPhotos.map(p => (
                <RefPhotoCard key={p.id} photo={p} onRemove={id => removePhoto.mutate(id)} onZoom={setZoomSrc} />
              ))}
              {refPhotos.length < 3 && (
                <AddPhotoCard
                  compact
                  uploading={uploadingTipo === "objetivo"}
                  onUpload={file => handleUpload("objetivo", file)}
                />
              )}
            </div>

            {refPhotos.length === 0 && (
              <p className="text-xs text-slate-400 text-center mt-3 leading-relaxed">
                Adicione fotos de inspiração do físico que você quer alcançar
              </p>
            )}
          </div>

          {/* CENTER: Indicador Principal */}
          <div className={cn(
            "rounded-2xl p-5 shadow-sm border flex flex-col gap-5 transition-all duration-500",
            hasData
              ? "bg-gradient-to-b from-slate-900 to-slate-800 border-slate-700 shadow-xl shadow-slate-900/30"
              : "bg-white border-slate-200"
          )}>
            <div className="flex items-center justify-between">
              <p className={cn("text-xs font-bold uppercase tracking-widest", hasData ? "text-slate-400" : "text-slate-500")}>
                Distância ao objetivo
              </p>
              {hasData && <ArrowRight className="w-4 h-4 text-slate-500" />}
            </div>

            {hasData ? (
              <div className="flex flex-col gap-4 flex-1">
                {/* Peso */}
                <div className={cn(
                  "rounded-xl p-4 transition-all",
                  pesoClose ? "bg-emerald-500/15 ring-1 ring-emerald-500/30" : "bg-white/8"
                )}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Massa</p>
                  <div className="flex items-end justify-between gap-2">
                    <span className={cn("text-3xl font-black tracking-tight", pesoClose ? "text-emerald-400" : "text-white")}>
                      {pesoD! > 0 ? "+" : ""}{pesoD!.toFixed(1)}
                      <span className="text-base font-semibold ml-1 opacity-70">kg</span>
                    </span>
                    {pesoClose && <span className="text-xs text-emerald-400 font-semibold pb-1">Próximo!</span>}
                  </div>
                  <ProgressBar progress={pesoProgress} close={pesoClose} />
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[10px] text-slate-500">{parseFloat(form.pesoAtual).toFixed(1)} kg</span>
                    <span className="text-[10px] text-slate-500">{parseFloat(form.pesoAlvo).toFixed(1)} kg</span>
                  </div>
                </div>

                {/* Gordura */}
                <div className={cn(
                  "rounded-xl p-4 transition-all",
                  bfClose ? "bg-emerald-500/15 ring-1 ring-emerald-500/30" : "bg-white/8"
                )}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Gordura</p>
                  <div className="flex items-end justify-between gap-2">
                    <span className={cn("text-3xl font-black tracking-tight", bfClose ? "text-emerald-400" : "text-white")}>
                      {bfD! > 0 ? "+" : ""}{bfD!.toFixed(1)}
                      <span className="text-base font-semibold ml-1 opacity-70">%</span>
                    </span>
                    {bfClose && <span className="text-xs text-emerald-400 font-semibold pb-1">Próximo!</span>}
                  </div>
                  <ProgressBar progress={bfProgress} close={bfClose} />
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[10px] text-slate-500">{parseFloat(form.bfAtual).toFixed(1)}%</span>
                    <span className="text-[10px] text-slate-500">{parseFloat(form.bfAlvo).toFixed(1)}%</span>
                  </div>
                </div>

                {form.prazo && (
                  <div className="flex items-center gap-2 mt-auto">
                    <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-xs text-slate-400">Prazo: <span className="text-slate-300 font-semibold">{fmtDate(form.prazo)}</span></span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                  <Target className="w-6 h-6 text-slate-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-600">Preencha os dados</p>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Adicione peso e gordura atual e alvo para ver a análise
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Físico Atual */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Camera className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Físico Atual</h2>
                  <p className="text-[11px] text-slate-400">3 ângulos</p>
                </div>
              </div>
              {lastCurrentPhoto?.createdAt && (
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Clock className="w-3 h-3" />
                  <span>{fmtDate(lastCurrentPhoto.createdAt)}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {currentPhotos.map(({ tipo, label, photo }) => (
                <FixedPhotoSlot
                  key={tipo} tipo={tipo} label={label} photo={photo}
                  uploading={uploadingTipo === tipo}
                  onUpload={(t, f) => handleUpload(t, f)}
                  onRemove={id => removePhoto.mutate(id)}
                  onZoom={setZoomSrc}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ─── DADOS: 2-column ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">

          {/* Dados Atuais */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Dados Atuais</p>
            <div className="grid grid-cols-2 gap-4">
              <NumInput label="Peso atual" value={form.pesoAtual} onChange={v => setField("pesoAtual", v)} suffix="kg" placeholder="Ex: 85.5" />
              <NumInput label="% Gordura atual" value={form.bfAtual} onChange={v => setField("bfAtual", v)} suffix="%" placeholder="Ex: 20" />
            </div>
          </div>

          {/* Objetivo Numérico */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Objetivo Numérico</p>
            <div className="grid grid-cols-3 gap-4">
              <NumInput label="Peso alvo" value={form.pesoAlvo} onChange={v => setField("pesoAlvo", v)} suffix="kg" placeholder="Ex: 88" highlight={!!form.pesoAlvo} />
              <NumInput label="% Gordura alvo" value={form.bfAlvo} onChange={v => setField("bfAlvo", v)} suffix="%" placeholder="Ex: 14" highlight={!!form.bfAlvo} />
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Prazo</label>
                <input
                  type="date" value={form.prazo}
                  onChange={e => setField("prazo", e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ─── ANÁLISE + IA PLACEHOLDER ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Análise detalhada */}
          {hasData && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Análise Detalhada</p>
              <div className="space-y-3">
                {[
                  {
                    label: "Massa corporal",
                    curr: `${parseFloat(form.pesoAtual).toFixed(1)} kg`,
                    target: `${parseFloat(form.pesoAlvo).toFixed(1)} kg`,
                    diff: pesoD!, suffix: "kg", close: pesoClose, progress: pesoProgress,
                    icon: pesoD! > 0 ? TrendingUp : TrendingDown,
                  },
                  {
                    label: "Gordura corporal",
                    curr: `${parseFloat(form.bfAtual).toFixed(1)}%`,
                    target: `${parseFloat(form.bfAlvo).toFixed(1)}%`,
                    diff: bfD!, suffix: "%", close: bfClose, progress: bfProgress,
                    icon: bfD! > 0 ? TrendingUp : TrendingDown,
                  },
                ].map(row => (
                  <div key={row.label} className={cn(
                    "rounded-xl p-4 border transition-all",
                    row.close ? "border-emerald-200 bg-emerald-50" : "border-slate-100 bg-slate-50"
                  )}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-500">{row.label}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-400">{row.curr}</span>
                          <ChevronRight className="w-3 h-3 text-slate-300" />
                          <span className="text-xs font-semibold text-slate-700">{row.target}</span>
                        </div>
                      </div>
                      <div className={cn(
                        "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold",
                        row.close ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                      )}>
                        <row.icon className="w-3 h-3" />
                        {row.diff > 0 ? "+" : ""}{row.diff.toFixed(1)} {row.suffix}
                      </div>
                    </div>
                    <ProgressBar progress={row.progress} close={row.close} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* IA Placeholder */}
          <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Recomendações</h3>
                <span className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider">Em breve</span>
              </div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-6">
              <div className="space-y-2 w-full max-w-xs">
                {["Análise do gap massa × gordura", "Sugestão de calorias e macros", "Ajuste automático do plano alimentar"].map(item => (
                  <div key={item} className="h-8 rounded-lg bg-slate-100 animate-pulse flex items-center px-3">
                    <div className="h-2 bg-slate-200 rounded w-4/5" />
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                A IA analisará seu GAP e irá sugerir ajustes no treino e na dieta automaticamente
              </p>
            </div>
          </div>

          {/* Empty state when no data and no analysis */}
          {!hasData && (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-3">
              <Target className="w-10 h-10 text-slate-200" />
              <div>
                <p className="text-sm font-semibold text-slate-500">Dados insuficientes</p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Preencha o peso e gordura atual e alvo para ver a análise detalhada
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ─── Photo Modal ─── */}
        {zoomSrc && <PhotoModal src={zoomSrc} onClose={() => setZoomSrc(null)} />}

      </PerformanceLayout>
    </AppLayout>
  );
}
