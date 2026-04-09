/**
 * QuickEntryDialog — Lançamento rápido por linguagem natural + voz
 *
 * Arquitetura de transcrição separada do parser:
 *   transcribeVoice()  →  text  (Web Speech API — navegador)
 *   parseNaturalLanguage(text)  →  ParsedEntry  (Claude AI — backend)
 *   confirmSave(entry)  →  Transaction  (backend)
 *
 * No app mobile Expo, substituir transcribeVoice() por expo-speech/whisper
 * sem precisar alterar o resto do fluxo.
 *
 * Browsers suportados para voz:
 *   ✅ Chrome 25+, Edge 79+, Chrome Android
 *   ⚠️  Safari 14.1+ (com flag), Firefox NÃO suporta
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sparkles, Mic, MicOff, ArrowRight, Check, X,
  Edit2, TrendingUp, TrendingDown, Tag, CreditCard,
  Calendar, Layers, AlertCircle, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { getApiBase } from "@/lib/api-base";

const EXAMPLE_PHRASES = [
  "gastei 10 reais com café da manhã",
  "paguei 79 reais de Uber no débito",
  "recebi 2000 de freela",
  "comprei remédio por 32 reais",
  "foi 3x de 120 no cartão",
  "assinei a Netflix por 45,90",
  "almoço no restaurante 38 reais",
  "gasolina 180 reais no posto",
];

// ─── Suporte ao Web Speech API ────────────────────────────────────────────────
function getSpeechRecognition(): typeof window.SpeechRecognition | null {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null;
}

const speechSupported = !!getSpeechRecognition();

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface ParsedEntry {
  type: "income" | "expense";
  amount: number;
  totalAmount: number | null;
  description: string;
  suggestedCategory: string | null;
  categoryId: number | null;
  paymentMethod: string | null;
  installments: number | null;
  date: string;
  confidence: "high" | "medium" | "low";
  reasoning: string | null;
}

interface QuickEntryDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categories: { id: number; name: string; type: string; color?: string }[];
  accounts: { id: number; name: string }[];
  creditCards: { id: number; nomeCartao?: string; apelidoCartao?: string }[];
  onSaved: () => void;
}

type VoiceState = "idle" | "listening" | "processing";

// ─── Motor de interpretação (mesmo usado pela voz e pelo texto) ───────────────
async function parseNaturalLanguage(text: string): Promise<ParsedEntry> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/transactions/quick-parse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Erro ao interpretar");
  }
  return res.json();
}

// ─── Componente principal ────────────────────────────────────────────────────
export function QuickEntryDialog({
  open,
  onOpenChange,
  categories,
  accounts,
  creditCards,
  onSaved,
}: QuickEntryDialogProps) {
  const [step, setStep] = useState<"input" | "confirm" | "saving">("input");
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exampleIdx, setExampleIdx] = useState(0);

  // Voice state
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [interimText, setInterimText] = useState("");  // texto parcial enquanto fala
  const recognitionRef = useRef<InstanceType<typeof window.SpeechRecognition> | null>(null);

  // Edição do resultado
  const [editType, setEditType] = useState<"income" | "expense">("expense");
  const [editAmount, setEditAmount] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCategoryId, setEditCategoryId] = useState<string>("");
  const [editPayment, setEditPayment] = useState<string>("");
  const [editDate, setEditDate] = useState("");
  const [editAccountId, setEditAccountId] = useState<string>("");
  const [editCardId, setEditCardId] = useState<string>("");

  const inputRef = useRef<HTMLInputElement>(null);

  // Rotacionar placeholders
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setExampleIdx(i => (i + 1) % EXAMPLE_PHRASES.length), 3000);
    return () => clearInterval(t);
  }, [open]);

  // Reset ao abrir / parar voz ao fechar
  useEffect(() => {
    if (open) {
      setStep("input");
      setText("");
      setParsed(null);
      setError(null);
      setVoiceState("idle");
      setInterimText("");
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      stopListening();
    }
  }, [open]);

  // Preenche campos editáveis com resultado do parse
  function populateEdits(p: ParsedEntry) {
    setEditType(p.type);
    setEditAmount(p.amount.toFixed(2).replace(".", ","));
    setEditDesc(p.description);
    setEditCategoryId(p.categoryId?.toString() ?? "");
    setEditPayment(p.paymentMethod ?? "");
    setEditDate(p.date);
    setEditAccountId("");
    setEditCardId("");
  }

  // ─── Parse + navegação para etapa de confirmação ──────────────────────────
  async function handleParse(inputText?: string) {
    const t = (inputText ?? text).trim();
    if (!t) return;
    setLoading(true);
    setError(null);
    try {
      const result = await parseNaturalLanguage(t);
      setParsed(result);
      populateEdits(result);
      setStep("confirm");
    } catch (e: any) {
      setError(e.message ?? "Erro ao interpretar");
    } finally {
      setLoading(false);
    }
  }

  // ─── Voz: parar reconhecimento ────────────────────────────────────────────
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setVoiceState("idle");
    setInterimText("");
  }, []);

  // ─── Voz: iniciar reconhecimento ─────────────────────────────────────────
  const startListening = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) return;

    setError(null);
    setInterimText("");
    setText("");

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = true;   // mostra texto parcial enquanto fala
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => setVoiceState("listening");

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += t;
        } else {
          interim += t;
        }
      }
      if (interim) setInterimText(interim);
      if (final) {
        const transcribed = final.trim();
        setText(transcribed);
        setInterimText("");
        setVoiceState("processing");
        recognitionRef.current = null;
        // Envia automaticamente para o parser
        handleParse(transcribed);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      recognitionRef.current = null;
      setVoiceState("idle");
      setInterimText("");
      const msgs: Record<string, string> = {
        "not-allowed": "Permissão de microfone negada. Habilite nas configurações do navegador.",
        "no-speech": "Nenhuma fala detectada. Tente novamente.",
        "network": "Erro de rede ao processar voz.",
        "audio-capture": "Nenhum microfone encontrado.",
      };
      setError(msgs[event.error] ?? `Erro de voz: ${event.error}`);
    };

    recognition.onend = () => {
      if (voiceState === "listening") {
        setVoiceState("idle");
        setInterimText("");
      }
    };

    recognition.start();
  }, [voiceState]);

  // ─── Toggle microfone ─────────────────────────────────────────────────────
  function toggleVoice() {
    if (voiceState === "listening") {
      stopListening();
    } else if (voiceState === "idle") {
      startListening();
    }
  }

  // ─── Salvar lançamento ────────────────────────────────────────────────────
  async function handleSave() {
    setStep("saving");
    try {
      const base = getApiBase();
      const amount = parseFloat(editAmount.replace(",", ".").replace(/[^\d.]/g, ""));
      const today = editDate || new Date().toISOString().split("T")[0];

      if (parsed?.installments && parsed.installments >= 2) {
        const totalAmt = parsed.totalAmount ?? amount * parsed.installments;
        const body = {
          mode: "installment",
          description: editDesc,
          totalAmount: Number(totalAmt.toFixed(2)),
          totalInstallments: parsed.installments,
          firstInstallmentDate: today,
          firstInstallmentStatus: "paid",
          categoryId: editCategoryId ? Number(editCategoryId) : null,
          accountId: editAccountId ? Number(editAccountId) : null,
          creditCardId: editCardId ? Number(editCardId) : null,
          modoUsoCartao: editPayment === "Crédito" ? "fisico" : null,
        };
        const res = await fetch(`${base}/api/transactions/installments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Erro ao salvar");
      } else {
        const body = {
          type: editType,
          description: editDesc,
          amount: Number(amount.toFixed(2)),
          competenceDate: today,
          movementDate: today,
          status: "paid",
          paymentMethod: editPayment || null,
          categoryId: editCategoryId ? Number(editCategoryId) : null,
          accountId: editAccountId ? Number(editAccountId) : null,
          creditCardId: editCardId ? Number(editCardId) : null,
        };
        const res = await fetch(`${base}/api/transactions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Erro ao salvar");
      }
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      setError(e.message ?? "Erro ao salvar");
      setStep("confirm");
    }
  }

  const filteredCategories = categories.filter(c =>
    editType === "income" ? c.type === "income" : c.type === "expense"
  );

  const isListening = voiceState === "listening";
  const isProcessingVoice = voiceState === "processing";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl border-0 shadow-2xl">

        {/* Header gradiente */}
        <div className={cn(
          "px-6 pt-6 pb-5 text-white transition-colors duration-300",
          editType === "income"
            ? "bg-gradient-to-br from-emerald-500 to-teal-600"
            : "bg-gradient-to-br from-indigo-500 to-violet-600"
        )}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-semibold text-sm">Lançamento Rápido</span>
            </div>
            <button
              onClick={() => { stopListening(); onOpenChange(false); }}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-white/70 text-xs mt-2">
            {step === "input"
              ? isListening ? "Ouvindo… fale o lançamento agora"
              : isProcessingVoice ? "Processando fala…"
              : "Digite ou fale o lançamento em linguagem natural"
              : "Confirme os dados antes de salvar"}
          </p>
        </div>

        {/* ── Step: Input ─────────────────────────────────────────────────── */}
        {step === "input" && (
          <div className="p-6 space-y-4">

            {/* Campo de texto + botões */}
            <div className="relative">
              <Input
                ref={inputRef}
                value={isListening ? interimText : text}
                onChange={e => { if (!isListening) setText(e.target.value); }}
                onKeyDown={e => e.key === "Enter" && !loading && !isListening && text.trim() && handleParse()}
                placeholder={
                  isListening ? "Ouvindo…"
                  : isProcessingVoice ? "Processando fala…"
                  : EXAMPLE_PHRASES[exampleIdx]
                }
                readOnly={isListening || isProcessingVoice}
                className={cn(
                  "pr-24 h-12 text-sm rounded-xl border-slate-200 bg-slate-50 placeholder:text-slate-400",
                  "focus:border-indigo-400 focus:ring-indigo-400/20",
                  isListening && "border-red-300 bg-red-50 placeholder:text-red-400 focus:border-red-400",
                  isProcessingVoice && "border-amber-300 bg-amber-50",
                )}
              />

              {/* Botão microfone */}
              <button
                onClick={toggleVoice}
                disabled={!speechSupported || isProcessingVoice || loading}
                title={
                  !speechSupported ? "Seu navegador não suporta reconhecimento de voz"
                  : isListening ? "Parar gravação"
                  : "Falar lançamento"
                }
                className={cn(
                  "absolute right-11 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                  !speechSupported || loading
                    ? "text-slate-300 cursor-not-allowed"
                  : isListening
                    ? "bg-red-500 text-white shadow-md shadow-red-500/30 animate-pulse"
                  : isProcessingVoice
                    ? "bg-amber-400 text-white"
                  : "text-slate-400 hover:text-indigo-500 hover:bg-indigo-50"
                )}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Botão enviar */}
              <button
                onClick={() => handleParse()}
                disabled={(!text.trim() && !isListening) || loading || isListening || isProcessingVoice}
                className={cn(
                  "absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                  text.trim() && !loading && !isListening && !isProcessingVoice
                    ? "bg-indigo-500 text-white hover:bg-indigo-600 shadow-sm"
                    : "bg-slate-100 text-slate-300 cursor-not-allowed"
                )}
              >
                {loading || isProcessingVoice
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <ArrowRight className="w-4 h-4" />
                }
              </button>
            </div>

            {/* Feedback de voz */}
            {isListening && (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200">
                <div className="flex gap-1 items-end h-5">
                  {[0, 1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className="w-1 rounded-full bg-red-400"
                      style={{
                        height: `${40 + Math.sin(Date.now() / 200 + i) * 30}%`,
                        animation: `pulse ${0.5 + i * 0.1}s ease-in-out infinite alternate`,
                        minHeight: "4px",
                      }}
                    />
                  ))}
                </div>
                <div>
                  <p className="text-sm font-medium text-red-700">Ouvindo…</p>
                  <p className="text-xs text-red-500">Fale o lançamento claramente. Clique no microfone para parar.</p>
                </div>
              </div>
            )}

            {isProcessingVoice && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                Interpretando o que você falou…
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Exemplos rápidos */}
            {!isListening && !isProcessingVoice && (
              <div>
                <p className="text-xs text-slate-400 mb-2 font-medium">Exemplos</p>
                <div className="flex flex-wrap gap-1.5">
                  {EXAMPLE_PHRASES.slice(0, 4).map((ex, i) => (
                    <button
                      key={i}
                      onClick={() => setText(ex)}
                      className="text-xs px-2.5 py-1 rounded-full border border-slate-200 bg-white hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 text-slate-600 transition-colors"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Dica sobre voz */}
            {!isListening && !isProcessingVoice && (
              <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                {speechSupported ? (
                  <button
                    onClick={startListening}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-colors font-medium"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    Clique para falar
                    <span className="px-1.5 py-0.5 rounded-full bg-indigo-200 text-indigo-700 text-[10px] font-semibold">pt-BR</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-400 border border-dashed border-slate-200 cursor-not-allowed">
                    <MicOff className="w-3.5 h-3.5" />
                    Voz não disponível neste navegador
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Step: Confirm ────────────────────────────────────────────────── */}
        {(step === "confirm" || step === "saving") && parsed && (
          <div className="p-6 space-y-4">

            {/* Toggle Despesa / Receita */}
            <div className="flex rounded-xl overflow-hidden border border-slate-200 text-sm font-medium">
              <button
                onClick={() => setEditType("expense")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2.5 transition-colors",
                  editType === "expense" ? "bg-red-500 text-white" : "text-slate-500 hover:bg-slate-50"
                )}
              >
                <TrendingDown className="w-3.5 h-3.5" /> Despesa
              </button>
              <button
                onClick={() => setEditType("income")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2.5 transition-colors",
                  editType === "income" ? "bg-emerald-500 text-white" : "text-slate-500 hover:bg-slate-50"
                )}
              >
                <TrendingUp className="w-3.5 h-3.5" /> Receita
              </button>
            </div>

            {/* Valor em destaque */}
            <div className="text-center py-2">
              <p className="text-xs text-slate-400 mb-1 uppercase tracking-wide">Valor</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-slate-400 text-sm">R$</span>
                <input
                  value={editAmount}
                  onChange={e => setEditAmount(e.target.value)}
                  className="text-4xl font-bold text-slate-900 text-center w-40 outline-none border-b-2 border-transparent focus:border-indigo-400 bg-transparent"
                  placeholder="0,00"
                />
              </div>
              {parsed.installments && parsed.installments >= 2 && (
                <div className="mt-1.5 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-medium">
                  <Layers className="w-3 h-3" />
                  {parsed.installments}x de {formatCurrency(parsed.amount)} = {formatCurrency(parsed.totalAmount ?? parsed.amount * parsed.installments)} total
                </div>
              )}
            </div>

            {/* Descrição */}
            <div className="space-y-1">
              <label className="text-xs text-slate-500 font-medium flex items-center gap-1">
                <Edit2 className="w-3 h-3" /> Descrição
              </label>
              <Input
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                className="h-9 text-sm rounded-lg border-slate-200"
              />
            </div>

            {/* Grid: Categoria + Pagamento */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-500 font-medium flex items-center gap-1">
                  <Tag className="w-3 h-3" /> Categoria
                </label>
                <Select value={editCategoryId} onValueChange={setEditCategoryId}>
                  <SelectTrigger className="h-9 text-sm rounded-lg border-slate-200">
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories.map(c => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        <span className="flex items-center gap-2">
                          {c.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />}
                          {c.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-500 font-medium">Pagamento</label>
                <Select value={editPayment} onValueChange={setEditPayment}>
                  <SelectTrigger className="h-9 text-sm rounded-lg border-slate-200">
                    <SelectValue placeholder="Forma" />
                  </SelectTrigger>
                  <SelectContent>
                    {["Dinheiro", "Débito", "Crédito", "Pix", "Transferência"].map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Grid: Data + Conta/Cartão */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-500 font-medium flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Data
                </label>
                <Input
                  type="date"
                  value={editDate}
                  onChange={e => setEditDate(e.target.value)}
                  className="h-9 text-sm rounded-lg border-slate-200"
                />
              </div>

              {editPayment === "Crédito" ? (
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-medium flex items-center gap-1">
                    <CreditCard className="w-3 h-3" /> Cartão
                  </label>
                  <Select value={editCardId} onValueChange={setEditCardId}>
                    <SelectTrigger className="h-9 text-sm rounded-lg border-slate-200">
                      <SelectValue placeholder="Selecionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {creditCards.map(c => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.apelidoCartao ?? c.nomeCartao ?? `Cartão ${c.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-medium">Conta</label>
                  <Select value={editAccountId} onValueChange={setEditAccountId}>
                    <SelectTrigger className="h-9 text-sm rounded-lg border-slate-200">
                      <SelectValue placeholder="Selecionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map(a => (
                        <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Reasoning da IA — só mostra quando confiança não é alta */}
            {parsed.reasoning && parsed.confidence !== "high" && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{parsed.reasoning}</span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Ações */}
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1 rounded-xl border-slate-200"
                onClick={() => { setStep("input"); setError(null); }}
                disabled={step === "saving"}
              >
                Editar frase
              </Button>
              <Button
                className={cn(
                  "flex-1 rounded-xl text-white shadow-md",
                  editType === "income"
                    ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
                    : "bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/20"
                )}
                onClick={handleSave}
                disabled={step === "saving" || !editDesc.trim() || !editAmount}
              >
                {step === "saving" ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando…</>
                ) : (
                  <><Check className="w-4 h-4 mr-2" /> Salvar lançamento</>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
