import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Check, Zap, Crown, Shield, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubscription, type Plan } from "@/hooks/useSubscription";

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

interface PlanInfo {
  priceId: string;
  amount: number;
  currency: string;
}

interface PlansConfig {
  pro: PlanInfo;
  premium: PlanInfo;
  configured: boolean;
}

interface PlanCard {
  id: Plan;
  name: string;
  price: string;
  period: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  borderColor: string;
  bgColor: string;
  badgeText?: string;
  badgeColor?: string;
  priceId: string;
  features: string[];
}

function buildPlans(config: PlansConfig | null): PlanCard[] {
  return [
    {
      id: "free",
      name: "Free",
      price: "R$0",
      period: "para sempre",
      description: "Para começar a organizar sua vida com o essencial.",
      icon: <Shield className="w-5 h-5" />,
      color: "text-neutral-400",
      borderColor: "border-neutral-700/50",
      bgColor: "bg-neutral-900/50",
      priceId: "",
      features: [
        "Dashboard geral",
        "Módulo Financeiro completo",
        "Agenda semanal básica",
        "1 projeto de vida",
        "Suporte por email",
      ],
    },
    {
      id: "pro",
      name: "Pro",
      price: "R$19,90",
      period: "por mês",
      description: "Para quem leva a sério o desenvolvimento pessoal.",
      icon: <Zap className="w-5 h-5" />,
      color: "text-indigo-400",
      borderColor: "border-indigo-500/60",
      bgColor: "bg-indigo-950/30",
      badgeText: "Mais popular",
      badgeColor: "bg-indigo-600 text-white",
      priceId: config?.pro.priceId || "",
      features: [
        "Tudo do plano Free",
        "Todos os 8 módulos",
        "Análise corporal com IA",
        "Sistema de treinos completo",
        "Múltiplos projetos de vida",
        "Módulo Conhecimento (livros, artigos, vídeos)",
        "Módulo Idiomas",
        "Suporte prioritário",
      ],
    },
    {
      id: "premium",
      name: "Premium",
      price: "R$39,90",
      period: "por mês",
      description: "Para quem quer o melhor, sem compromisso.",
      icon: <Crown className="w-5 h-5" />,
      color: "text-amber-400",
      borderColor: "border-amber-500/50",
      bgColor: "bg-amber-950/20",
      badgeText: "Completo",
      badgeColor: "bg-amber-600 text-white",
      priceId: config?.premium.priceId || "",
      features: [
        "Tudo do plano Pro",
        "Insights avançados com IA",
        "Exportação completa de dados",
        "Múltiplos perfis de usuário",
        "API de integração externa",
        "Acesso antecipado a novos recursos",
        "Suporte dedicado (chat 24h)",
        "Consultoria de setup pessoal",
      ],
    },
  ];
}

export default function PricingPage() {
  const { plan: currentPlan, loading: subLoading, refetch } = useSubscription();
  const [, setLocation] = useLocation();
  const [checkoutLoading, setCheckoutLoading] = useState<Plan | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [plansConfig, setPlansConfig] = useState<PlansConfig | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/stripe/plans`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setPlansConfig(d))
      .catch(() => {});
  }, []);

  const plans = buildPlans(plansConfig);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      setSuccessMsg("Assinatura confirmada! Seu plano foi atualizado.");
      refetch();
    } else if (params.get("canceled") === "true") {
      setErrorMsg("Pagamento cancelado. Nenhuma cobrança foi feita.");
    }
  }, []);

  async function handleUpgrade(plan: PlanCard) {
    if (plan.id === "free") return;
    if (!plan.priceId) {
      setErrorMsg(
        "Stripe ainda não configurado. Execute o script de seed de produtos."
      );
      return;
    }

    setCheckoutLoading(plan.id);
    setErrorMsg("");
    try {
      const res = await fetch(`${API_BASE}/api/stripe/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ priceId: plan.priceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao criar sessão");
      if (data.url) window.location.href = data.url;
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao iniciar checkout");
    } finally {
      setCheckoutLoading(null);
    }
  }

  async function handleManageSubscription() {
    setPortalLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(`${API_BASE}/api/stripe/portal`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao abrir portal");
      if (data.url) window.location.href = data.url;
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao abrir portal de assinatura");
    } finally {
      setPortalLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-6 py-12">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 text-indigo-400 text-xs font-medium mb-6">
            <Zap className="w-3.5 h-3.5" />
            Vertex OS — Planos
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Escolha seu plano
          </h1>
          <p className="text-white/50 text-base max-w-xl mx-auto">
            Invista no seu sistema operacional pessoal. Cancele quando quiser, sem
            burocracia.
          </p>
        </div>

        {/* Alerts */}
        {successMsg && (
          <div className="mb-8 p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm text-center">
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">
            {errorMsg}
          </div>
        )}

        {/* Current plan indicator */}
        {!subLoading && currentPlan !== "free" && (
          <div className="mb-8 flex items-center justify-center gap-3">
            <p className="text-white/50 text-sm">
              Plano atual:{" "}
              <span
                className={cn(
                  "font-semibold",
                  currentPlan === "premium" ? "text-amber-400" : "text-indigo-400"
                )}
              >
                {currentPlan === "premium" ? "Premium" : "Pro"}
              </span>
            </p>
            <button
              onClick={handleManageSubscription}
              disabled={portalLoading}
              className="text-xs text-white/35 hover:text-white/60 underline underline-offset-2 transition-colors disabled:opacity-50"
            >
              {portalLoading ? "Abrindo..." : "Gerenciar assinatura"}
            </button>
          </div>
        )}

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map((plan) => {
            const isCurrentPlan = currentPlan === plan.id;
            const isLoading = checkoutLoading === plan.id;
            const isBetter =
              (currentPlan === "free" && plan.id !== "free") ||
              (currentPlan === "pro" && plan.id === "premium");

            return (
              <div
                key={plan.id}
                className={cn(
                  "relative rounded-2xl border p-6 flex flex-col transition-all duration-200",
                  plan.borderColor,
                  plan.bgColor,
                  plan.id === "pro" &&
                    "ring-1 ring-indigo-500/30 shadow-lg shadow-indigo-500/10"
                )}
              >
                {/* Badge */}
                {plan.badgeText && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span
                      className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        plan.badgeColor
                      )}
                    >
                      {plan.badgeText}
                    </span>
                  </div>
                )}

                {/* Plan header */}
                <div className="mb-6">
                  <div className={cn("mb-3", plan.color)}>{plan.icon}</div>
                  <h2 className={cn("text-xl font-bold mb-1", plan.color)}>
                    {plan.name}
                  </h2>
                  <p className="text-white/45 text-xs leading-relaxed">
                    {plan.description}
                  </p>
                </div>

                {/* Price */}
                <div className="mb-6 pb-6 border-b border-white/8">
                  <div className="flex items-end gap-1">
                    <span className="text-3xl font-black text-white">
                      {plan.price}
                    </span>
                    <span className="text-white/35 text-sm mb-1">
                      /{plan.period}
                    </span>
                  </div>
                </div>

                {/* Features */}
                <ul className="flex-1 space-y-2.5 mb-8">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2">
                      <Check
                        className={cn("w-3.5 h-3.5 mt-0.5 flex-shrink-0", plan.color)}
                      />
                      <span className="text-white/65 text-xs leading-snug">
                        {feat}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {isCurrentPlan ? (
                  <div className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 text-sm font-medium text-center">
                    Plano atual
                  </div>
                ) : plan.id === "free" ? (
                  <button
                    onClick={() => setLocation("/")}
                    className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white/70 text-sm font-medium transition-colors"
                  >
                    Usar grátis
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan)}
                    disabled={isLoading || !isBetter}
                    className={cn(
                      "w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2",
                      plan.id === "pro"
                        ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                        : "bg-amber-600 hover:bg-amber-500 text-white",
                      (isLoading || !isBetter) && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        {isBetter
                          ? `Assinar ${plan.name}`
                          : "Incluído no plano atual"}
                        {isBetter && <ArrowRight className="w-4 h-4" />}
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <p className="text-center text-white/25 text-xs mt-10">
          Pagamentos processados com segurança pelo Stripe. Cancele a qualquer
          momento direto pelo portal.
        </p>
      </div>
    </div>
  );
}
