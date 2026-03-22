import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PerformanceLayout } from "@/components/layout/PerformanceLayout";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Camera, X, Upload, Target, TrendingUp, TrendingDown,
  Save, ImagePlus, Minus, Plus, CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL;

type BodyGoal = {
  id: number;
  pesoAtual: string | null;
  bfAtual: string | null;
  pesoAlvo: string | null;
  bfAlvo: string | null;
  prazo: string | null;
};

type BodyPhoto = {
  id: number;
  tipo: string;
  imageData: string;
  goalId: number | null;
};

const FIXED_SLOTS = [
  { tipo: "atual_frente", label: "Frente", icon: "👤" },
  { tipo: "atual_lado", label: "Lado", icon: "🧍" },
  { tipo: "atual_costas", label: "Costas", icon: "🔄" },
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function diffLabel(curr: string | null, target: string | null, suffix: string, invertGood = false) {
  if (!curr || !target) return null;
  const diff = parseFloat(target) - parseFloat(curr);
  if (Math.abs(diff) < 0.01) return { label: "Sem diferença", color: "text-slate-500", icon: null };
  const positive = diff > 0;
  const good = invertGood ? !positive : positive;
  return {
    label: `${positive ? "+" : ""}${diff.toFixed(1)} ${suffix}`,
    color: good ? "text-emerald-600" : "text-rose-500",
    icon: positive ? TrendingUp : TrendingDown,
  };
}

/* ─── Photo Card: Fixed slot (Frente/Lado/Costas) ─── */
function FixedPhotoSlot({
  tipo, label, photo, onUpload, onRemove, uploading,
}: {
  tipo: string; label: string; photo?: BodyPhoto;
  onUpload: (tipo: string, file: File) => void;
  onRemove: (id: number) => void;
  uploading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
      <div
        className={cn(
          "relative w-full aspect-[3/4] rounded-2xl border-2 overflow-hidden transition-all",
          photo
            ? "border-slate-200 shadow-sm"
            : "border-dashed border-slate-300 hover:border-primary/60 cursor-pointer bg-slate-50 hover:bg-primary/5"
        )}
        onClick={() => !photo && !uploading && inputRef.current?.click()}
      >
        {photo ? (
          <>
            <img src={photo.imageData} alt={label} className="w-full h-full object-cover" />
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(photo.id); }}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
            {uploading ? (
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            ) : (
              <>
                <Camera className="w-8 h-8 text-slate-300" />
                <span className="text-xs text-center px-2">Clique para enviar</span>
              </>
            )}
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(tipo, file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/* ─── Photo Card: Reference (Objetivo) ─── */
function RefPhotoCard({
  photo, onRemove,
}: { photo: BodyPhoto; onRemove: (id: number) => void }) {
  return (
    <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-slate-200 shadow-sm group">
      <img src={photo.imageData} alt="Referência" className="w-full h-full object-cover" />
      <button
        onClick={() => onRemove(photo.id)}
        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors opacity-0 group-hover:opacity-100"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function AddPhotoCard({ onUpload, uploading }: { onUpload: (file: File) => void; uploading: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div
      onClick={() => !uploading && inputRef.current?.click()}
      className={cn(
        "aspect-[3/4] rounded-2xl border-2 border-dashed border-slate-300 hover:border-primary/60",
        "cursor-pointer bg-slate-50 hover:bg-primary/5 transition-all",
        "flex flex-col items-center justify-center gap-2 text-slate-400"
      )}
    >
      {uploading ? (
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      ) : (
        <>
          <ImagePlus className="w-8 h-8 text-slate-300" />
          <span className="text-xs text-center px-2">Adicionar foto</span>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/* ─── Number Field ─── */
function NumField({ label, value, onChange, suffix, placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  suffix?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <input
          type="number" step="0.1" min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="input w-full pr-10"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

export default function ObjetivoFisicoPage() {
  const qc = useQueryClient();
  const [uploadingTipo, setUploadingTipo] = useState<string | null>(null);

  const [form, setForm] = useState({
    pesoAtual: "", bfAtual: "",
    pesoAlvo: "", bfAlvo: "", prazo: "",
  });
  const [dirty, setDirty] = useState(false);

  const { data: goal, isLoading: goalLoading } = useQuery<BodyGoal | null>({
    queryKey: ["body-goal"],
    queryFn: () => fetch(`${BASE}api/performance/body-goal`).then(r => r.json()),
  });

  const { data: photos = [], isLoading: photosLoading } = useQuery<BodyPhoto[]>({
    queryKey: ["body-photos"],
    queryFn: () => fetch(`${BASE}api/performance/body-photos`).then(r => r.json()),
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
      const body = {
        pesoAtual: data.pesoAtual || null,
        bfAtual: data.bfAtual || null,
        pesoAlvo: data.pesoAlvo || null,
        bfAlvo: data.bfAlvo || null,
        prazo: data.prazo || null,
      };
      if (goal?.id) {
        return fetch(`${BASE}api/performance/body-goal/${goal.id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        }).then(r => r.json());
      }
      return fetch(`${BASE}api/performance/body-goal`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      }).then(r => r.json());
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["body-goal"] });
      setDirty(false);
    },
  });

  const addPhoto = useMutation({
    mutationFn: (data: { tipo: string; imageData: string; goalId?: number }) =>
      fetch(`${BASE}api/performance/body-photos`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["body-photos"] });
      setUploadingTipo(null);
    },
    onError: () => setUploadingTipo(null),
  });

  const removePhoto = useMutation({
    mutationFn: (id: number) =>
      fetch(`${BASE}api/performance/body-photos/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["body-photos"] }),
  });

  const handleUpload = useCallback(async (tipo: string, file: File) => {
    setUploadingTipo(tipo);
    try {
      const imageData = await fileToBase64(file);
      await addPhoto.mutateAsync({ tipo, imageData, goalId: goal?.id });
    } catch {
      setUploadingTipo(null);
    }
  }, [goal, addPhoto]);

  function setField(k: keyof typeof form, v: string) {
    setForm(f => ({ ...f, [k]: v }));
    setDirty(true);
  }

  const currentPhotos = FIXED_SLOTS.map(s => ({
    ...s,
    photo: photos.find(p => p.tipo === s.tipo),
  }));

  const refPhotos = photos.filter(p => p.tipo === "objetivo");

  const pesoDiff = diffLabel(form.pesoAtual, form.pesoAlvo, "kg");
  const bfDiff = diffLabel(form.bfAtual, form.bfAlvo, "%", true);

  const hasGap = form.pesoAtual && form.pesoAlvo && form.bfAtual && form.bfAlvo;

  return (
    <AppLayout title="Performance">
      <PerformanceLayout>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Objetivo Físico</h1>
            <p className="text-slate-500 text-sm mt-1">
              Compare seu físico atual com o objetivo desejado e acompanhe sua evolução
            </p>
          </div>
          <button
            onClick={() => saveGoal.mutate(form)}
            disabled={saveGoal.isPending || !dirty}
            className={cn(
              "flex items-center gap-2 btn-primary disabled:opacity-40",
              dirty && "ring-2 ring-primary/30"
            )}
          >
            <Save className="w-4 h-4" />
            {saveGoal.isPending ? "Salvando..." : "Salvar objetivo físico"}
          </button>
        </div>

        <div className="space-y-6">

          {/* ─── Físico Desejado ─── */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
                <Target className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Físico Desejado</h2>
                <p className="text-xs text-slate-500">Fotos de referência (como você quer chegar)</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {refPhotos.map(p => (
                <RefPhotoCard key={p.id} photo={p} onRemove={(id) => removePhoto.mutate(id)} />
              ))}
              {refPhotos.length < 3 && (
                <AddPhotoCard
                  uploading={uploadingTipo === "objetivo"}
                  onUpload={(file) => handleUpload("objetivo", file)}
                />
              )}
            </div>

            {refPhotos.length === 0 && (
              <p className="text-xs text-slate-400 mt-3 text-center">
                Adicione até 3 fotos de inspiração do físico que você quer alcançar
              </p>
            )}
          </div>

          {/* ─── Físico Atual ─── */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                <Camera className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Físico Atual</h2>
                <p className="text-xs text-slate-500">Registre 3 ângulos para comparação futura</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {currentPhotos.map(({ tipo, label, photo }) => (
                <FixedPhotoSlot
                  key={tipo}
                  tipo={tipo}
                  label={label}
                  photo={photo}
                  uploading={uploadingTipo === tipo}
                  onUpload={(t, file) => handleUpload(t, file)}
                  onRemove={(id) => removePhoto.mutate(id)}
                />
              ))}
            </div>
          </div>

          {/* ─── Dados Atuais + Objetivo Numérico ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Dados atuais */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-900 mb-4">Dados Atuais</h2>
              <div className="space-y-4">
                <NumField
                  label="Peso atual"
                  value={form.pesoAtual}
                  onChange={v => setField("pesoAtual", v)}
                  suffix="kg"
                  placeholder="Ex: 85.5"
                />
                <NumField
                  label="% de gordura atual"
                  value={form.bfAtual}
                  onChange={v => setField("bfAtual", v)}
                  suffix="%"
                  placeholder="Ex: 20"
                />
              </div>
            </div>

            {/* Objetivo numérico */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-900 mb-4">Objetivo Numérico</h2>
              <div className="space-y-4">
                <NumField
                  label="Peso alvo"
                  value={form.pesoAlvo}
                  onChange={v => setField("pesoAlvo", v)}
                  suffix="kg"
                  placeholder="Ex: 88"
                />
                <NumField
                  label="% gordura alvo"
                  value={form.bfAlvo}
                  onChange={v => setField("bfAlvo", v)}
                  suffix="%"
                  placeholder="Ex: 14"
                />
                <div>
                  <label className="label">Prazo</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={form.prazo}
                      onChange={e => setField("prazo", e.target.value)}
                      className="input w-full"
                    />
                    <CalendarDays className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── GAP / Diferença ─── */}
          {hasGap && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-900 mb-5">GAP — Diferença Atual → Objetivo</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { title: "Massa corporal", diff: pesoDiff },
                  { title: "Gordura corporal", diff: bfDiff },
                ].map(({ title, diff }) => (
                  diff && (
                    <div key={title} className="bg-slate-50 rounded-xl p-5">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{title}</p>
                      <div className="flex items-center gap-3">
                        {diff.icon && <diff.icon className={cn("w-6 h-6", diff.color)} />}
                        <span className={cn("text-2xl font-bold", diff.color)}>{diff.label}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-2">
                        {parseFloat(form[title === "Massa corporal" ? "pesoAtual" : "bfAtual"]).toFixed(1)}
                        {title === "Massa corporal" ? " kg" : "%"} atual →{" "}
                        {parseFloat(form[title === "Massa corporal" ? "pesoAlvo" : "bfAlvo"]).toFixed(1)}
                        {title === "Massa corporal" ? " kg" : "%"} alvo
                        {form.prazo && ` • até ${fmtDate(form.prazo)}`}
                      </p>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

          {/* ─── Empty state ─── */}
          {!hasGap && !goalLoading && (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center">
              <Target className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm font-medium">
                Preencha os dados atuais e o objetivo para ver a diferença calculada automaticamente
              </p>
            </div>
          )}

        </div>
      </PerformanceLayout>
    </AppLayout>
  );
}
