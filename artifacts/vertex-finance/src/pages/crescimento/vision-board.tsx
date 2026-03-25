import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Star, Plus, Trash2, Loader2, Type, ImageIcon, X,
  BringToFront, SendToBack, RotateCcw, ZoomIn, ZoomOut,
} from "lucide-react";
import { getApiBase } from "@/lib/api-base";

async function apiReq<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${getApiBase()}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

interface BoardItem {
  id: number;
  tipo: string;
  conteudo: string;
  x: number;
  y: number;
  largura: number;
  altura: number;
  zIndex: number;
  cor: string;
  fontSize: number;
  rotacao: number;
}

const TEXT_COLORS = [
  "#1e293b", "#6366F1", "#10B981", "#F59E0B", "#EF4444",
  "#3B82F6", "#8B5CF6", "#EC4899", "#FFFFFF",
];

const CARD_COLORS = [
  "#FFFFFF", "#FEF9C3", "#DBEAFE", "#D1FAE5", "#FCE7F3",
  "#EDE9FE", "#FEE2E2", "#FFEDD5", "#F1F5F9",
];

// ─── Draggable Canvas Item ────────────────────────────────────────────────────

function BoardElement({
  item,
  selected,
  onSelect,
  onUpdate,
  onDelete,
  onBringFront,
  onSendBack,
  canvasRef,
}: {
  item: BoardItem;
  selected: boolean;
  onSelect: (id: number) => void;
  onUpdate: (id: number, patch: Partial<BoardItem>) => void;
  onDelete: (id: number) => void;
  onBringFront: (id: number) => void;
  onSendBack: (id: number) => void;
  canvasRef: React.RefObject<HTMLDivElement>;
}) {
  const [editingText, setEditingText] = useState(false);
  const [localText, setLocalText] = useState(item.conteudo);
  const dragging = useRef(false);
  const resizing = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, ox: 0, oy: 0 });
  const resizeStart = useRef({ mx: 0, my: 0, ow: 0, oh: 0 });
  const elemRef = useRef<HTMLDivElement>(null);

  const handleMouseDownDrag = (e: React.MouseEvent) => {
    if (editingText) return;
    e.stopPropagation();
    onSelect(item.id);
    dragging.current = true;
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: item.x, oy: item.y };

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const dx = ev.clientX - dragStart.current.mx;
      const dy = ev.clientY - dragStart.current.my;
      if (elemRef.current) {
        elemRef.current.style.left = `${Math.max(0, dragStart.current.ox + dx)}px`;
        elemRef.current.style.top = `${Math.max(0, dragStart.current.oy + dy)}px`;
      }
    };

    const onUp = (ev: MouseEvent) => {
      if (!dragging.current) return;
      dragging.current = false;
      const dx = ev.clientX - dragStart.current.mx;
      const dy = ev.clientY - dragStart.current.my;
      onUpdate(item.id, {
        x: Math.max(0, dragStart.current.ox + dx),
        y: Math.max(0, dragStart.current.oy + dy),
      });
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    resizing.current = true;
    resizeStart.current = { mx: e.clientX, my: e.clientY, ow: item.largura, oh: item.altura };

    const onMove = (ev: MouseEvent) => {
      if (!resizing.current) return;
      const dw = ev.clientX - resizeStart.current.mx;
      const dh = ev.clientY - resizeStart.current.my;
      const nw = Math.max(120, resizeStart.current.ow + dw);
      const nh = Math.max(80, resizeStart.current.oh + dh);
      if (elemRef.current) {
        elemRef.current.style.width = `${nw}px`;
        elemRef.current.style.height = `${nh}px`;
      }
    };

    const onUp = (ev: MouseEvent) => {
      if (!resizing.current) return;
      resizing.current = false;
      const dw = ev.clientX - resizeStart.current.mx;
      const dh = ev.clientY - resizeStart.current.my;
      onUpdate(item.id, {
        largura: Math.max(120, resizeStart.current.ow + dw),
        altura: Math.max(80, resizeStart.current.oh + dh),
      });
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const handleDoubleClick = () => {
    if (item.tipo === "texto") {
      setEditingText(true);
    }
  };

  const handleTextBlur = () => {
    setEditingText(false);
    if (localText !== item.conteudo) {
      onUpdate(item.id, { conteudo: localText });
    }
  };

  return (
    <div
      ref={elemRef}
      className="absolute select-none group"
      style={{
        left: item.x,
        top: item.y,
        width: item.largura,
        height: item.altura,
        zIndex: selected ? 9999 : item.zIndex,
        transform: item.rotacao ? `rotate(${item.rotacao}deg)` : undefined,
      }}
      onMouseDown={handleMouseDownDrag}
      onDoubleClick={handleDoubleClick}
    >
      {/* The card itself */}
      <div
        className="w-full h-full rounded-2xl overflow-hidden relative"
        style={{
          backgroundColor: item.tipo === "imagem" ? "transparent" : item.cor,
          boxShadow: selected
            ? "0 0 0 2px #6366F1, 0 8px 32px rgba(0,0,0,0.25)"
            : "0 4px 20px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.12)",
          cursor: editingText ? "text" : "grab",
        }}
      >
        {/* Push pin decoration */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white z-10 shadow-md"
          style={{ backgroundColor: item.tipo === "imagem" ? "#6366F1" : "#94a3b8" }}
        />

        {item.tipo === "imagem" ? (
          <img
            src={item.conteudo}
            alt="vision"
            className="w-full h-full object-cover rounded-2xl"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full p-4 flex flex-col">
            {editingText ? (
              <textarea
                autoFocus
                value={localText}
                onChange={(e) => setLocalText(e.target.value)}
                onBlur={handleTextBlur}
                className="flex-1 w-full bg-transparent resize-none focus:outline-none font-medium"
                style={{ fontSize: item.fontSize, color: "#1e293b", lineHeight: 1.5 }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <p
                className="leading-relaxed whitespace-pre-wrap break-words font-medium h-full overflow-hidden"
                style={{ fontSize: item.fontSize, color: "#1e293b", lineHeight: 1.5 }}
              >
                {item.conteudo || <span className="text-slate-300 italic">Clique duas vezes para editar</span>}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Controls (visible when selected) */}
      {selected && !editingText && (
        <>
          {/* Delete button */}
          <button
            onMouseDown={(e) => { e.stopPropagation(); onDelete(item.id); }}
            className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 z-10"
          >
            <X className="w-3 h-3" />
          </button>

          {/* Resize handle */}
          <div
            onMouseDown={handleMouseDownResize}
            className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize z-10 flex items-end justify-end pb-1 pr-1"
          >
            <div className="w-3 h-3 border-b-2 border-r-2 border-primary rounded-br opacity-70" />
          </div>

          {/* Z-order controls */}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-1 bg-white rounded-lg shadow-lg border border-slate-100 px-1.5 py-1">
            <button onMouseDown={(e) => { e.stopPropagation(); onBringFront(item.id); }} className="p-0.5 hover:text-primary" title="Trazer para frente">
              <BringToFront className="w-3.5 h-3.5 text-slate-500 hover:text-primary" />
            </button>
            <button onMouseDown={(e) => { e.stopPropagation(); onSendBack(item.id); }} className="p-0.5 hover:text-primary" title="Enviar para trás">
              <SendToBack className="w-3.5 h-3.5 text-slate-500 hover:text-primary" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Add Text Modal ───────────────────────────────────────────────────────────

function AddTextModal({ onSave, onClose }: { onSave: (data: Partial<BoardItem>) => void; onClose: () => void }) {
  const [text, setText] = useState("Escreva aqui...");
  const [cor, setCor] = useState("#FEF9C3");
  const [fontSize, setFontSize] = useState(16);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900 flex items-center gap-2"><Type className="w-4 h-4 text-primary" /> Novo texto</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div className="px-5 py-4 flex flex-col gap-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            placeholder="Sua frase, citação ou objetivo..."
          />
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Cor do card</label>
            <div className="flex gap-2 flex-wrap">
              {CARD_COLORS.map((c) => (
                <button key={c} onClick={() => setCor(c)} className="w-7 h-7 rounded-lg border-2 transition-all shadow-sm" style={{ backgroundColor: c, borderColor: cor === c ? "#6366F1" : "#e2e8f0" }} />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Tamanho da fonte: {fontSize}px</label>
            <input type="range" min={11} max={32} value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value))} className="w-full accent-primary" />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button>
          <button
            onClick={() => onSave({ tipo: "texto", conteudo: text, cor, fontSize, largura: 240, altura: 180 })}
            disabled={!text.trim()}
            className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function VisionBoardPage() {
  const qc = useQueryClient();
  const canvasRef = useRef<HTMLDivElement>(null!);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showTextModal, setShowTextModal] = useState(false);
  const [maxZ, setMaxZ] = useState(10);

  const { data: items = [], isLoading } = useQuery<BoardItem[]>({
    queryKey: ["vboard"],
    queryFn: () => apiReq<BoardItem[]>("GET", "/api/crescimento/vision-board-items"),
  });

  // Track max zIndex
  useEffect(() => {
    if (items.length > 0) setMaxZ(Math.max(...items.map((i) => i.zIndex), 10));
  }, [items]);

  const create = useMutation({
    mutationFn: (data: Partial<BoardItem>) => apiReq<BoardItem>("POST", "/api/crescimento/vision-board-items", { ...data, zIndex: maxZ + 1 }),
    onSuccess: (item) => {
      qc.setQueryData<BoardItem[]>(["vboard"], (prev) => [...(prev ?? []), item]);
      setMaxZ((z) => z + 1);
      setSelectedId(item.id);
    },
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Partial<BoardItem> }) =>
      apiReq<BoardItem>("PUT", `/api/crescimento/vision-board-items/${id}`, patch),
    onSuccess: (updated) => {
      qc.setQueryData<BoardItem[]>(["vboard"], (prev) =>
        prev?.map((i) => (i.id === updated.id ? updated : i)) ?? []
      );
    },
  });

  const remove = useMutation({
    mutationFn: (id: number) => apiReq<{ ok: true }>("DELETE", `/api/crescimento/vision-board-items/${id}`),
    onSuccess: (_, id) => {
      qc.setQueryData<BoardItem[]>(["vboard"], (prev) => prev?.filter((i) => i.id !== id) ?? []);
      setSelectedId(null);
    },
  });

  const handleUpdate = useCallback((id: number, patch: Partial<BoardItem>) => {
    // Optimistic local update
    qc.setQueryData<BoardItem[]>(["vboard"], (prev) =>
      prev?.map((i) => (i.id === id ? { ...i, ...patch } : i)) ?? []
    );
    update.mutate({ id, patch });
  }, [qc, update]);

  const handleBringFront = useCallback((id: number) => {
    const nz = maxZ + 1;
    setMaxZ(nz);
    handleUpdate(id, { zIndex: nz });
  }, [maxZ, handleUpdate]);

  const handleSendBack = useCallback((id: number) => {
    const nz = Math.max(1, (items.find((i) => i.id === id)?.zIndex ?? 1) - 1);
    handleUpdate(id, { zIndex: nz });
  }, [items, handleUpdate]);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) setSelectedId(null);
  };

  const handleAddText = (data: Partial<BoardItem>) => {
    const canvas = canvasRef.current?.getBoundingClientRect();
    const cx = canvas ? Math.round(window.scrollX + (canvas.width / 2) - 120) : 200;
    const cy = canvas ? Math.round(window.scrollY + 200) : 200;
    create.mutate({ ...data, x: cx, y: cy });
    setShowTextModal(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const canvas = canvasRef.current?.getBoundingClientRect();
      const cx = canvas ? Math.round(canvas.width / 2 - 120) : 200;
      const cy = 200;
      create.mutate({ tipo: "imagem", conteudo: base64, x: cx, y: cy, largura: 260, altura: 200, cor: "transparent", fontSize: 16 });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const empty = !isLoading && items.length === 0;

  return (
    <AppLayout noPadding>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-5 py-3 bg-white/90 backdrop-blur border-b border-slate-200 shadow-sm sticky top-0 z-40">
        <div className="flex items-center gap-1 mr-2">
          <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
          <span className="font-bold text-slate-900 text-sm">Vision Board</span>
        </div>

        <div className="h-5 w-px bg-slate-200 mx-1" />

        <button
          onClick={() => setShowTextModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors"
        >
          <Type className="w-3.5 h-3.5" /> Texto
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors"
        >
          <ImageIcon className="w-3.5 h-3.5" /> Imagem
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

        {selectedId !== null && (
          <>
            <div className="h-5 w-px bg-slate-200 mx-1" />
            <span className="text-xs text-slate-400">Selecionado:</span>
            <button onClick={() => selectedId && handleBringFront(selectedId)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200">
              <BringToFront className="w-3 h-3" /> Frente
            </button>
            <button onClick={() => selectedId && handleSendBack(selectedId)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200">
              <SendToBack className="w-3 h-3" /> Atrás
            </button>
            <button onClick={() => selectedId && remove.mutate(selectedId)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-lg border border-red-200">
              <Trash2 className="w-3 h-3" /> Remover
            </button>
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] text-slate-400">{items.length} {items.length === 1 ? "item" : "itens"}</span>
        </div>
      </div>

      {/* Cork Board Canvas */}
      <div
        className="relative overflow-auto"
        style={{ height: "calc(100vh - 60px)", backgroundColor: "#b8955a" }}
      >
        {/* Cork texture overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              repeating-linear-gradient(0deg, transparent, transparent 14px, rgba(0,0,0,0.04) 14px, rgba(0,0,0,0.04) 15px),
              repeating-linear-gradient(90deg, transparent, transparent 14px, rgba(0,0,0,0.03) 14px, rgba(0,0,0,0.03) 15px),
              radial-gradient(ellipse at 20% 30%, rgba(255,255,255,0.06) 0%, transparent 60%),
              radial-gradient(ellipse at 80% 70%, rgba(0,0,0,0.06) 0%, transparent 50%)
            `,
          }}
        />

        {/* Canvas area */}
        <div
          ref={canvasRef}
          className="relative"
          style={{ width: "2400px", height: "1600px" }}
          onClick={handleCanvasClick}
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-white/50" />
            </div>
          )}

          {empty && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="bg-white/20 backdrop-blur-sm rounded-3xl px-10 py-8 text-center max-w-sm">
                <Star className="w-12 h-12 text-white/80 mx-auto mb-4 fill-white/30" />
                <p className="font-bold text-white text-lg mb-2">Seu mural está vazio</p>
                <p className="text-white/70 text-sm leading-relaxed">
                  Adicione textos com frases que te inspiram ou faça upload de imagens que representam seus objetivos.
                </p>
              </div>
            </div>
          )}

          {items.map((item) => (
            <BoardElement
              key={item.id}
              item={item}
              selected={selectedId === item.id}
              onSelect={setSelectedId}
              onUpdate={handleUpdate}
              onDelete={(id) => remove.mutate(id)}
              onBringFront={handleBringFront}
              onSendBack={handleSendBack}
              canvasRef={canvasRef}
            />
          ))}
        </div>
      </div>

      {/* Modals */}
      {showTextModal && <AddTextModal onClose={() => setShowTextModal(false)} onSave={handleAddText} />}
    </AppLayout>
  );
}
