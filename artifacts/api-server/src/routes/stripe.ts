import { Router } from "express";
import {
  createOrGetStripeCustomer,
  createCheckoutSession,
  createPortalSession,
} from "../stripeService";
import {
  getUserById,
  updateUserStripeInfo,
  getStripeSubscriptionByCustomerId,
  resolvePlanFromSubscription,
} from "../stripeStorage";

const router = Router();

router.get("/stripe/plans", async (_req: any, res: any) => {
  const pricePro = process.env.STRIPE_PRICE_PRO || "";
  const pricePremium = process.env.STRIPE_PRICE_PREMIUM || "";
  return res.json({
    pro: { priceId: pricePro, amount: 1990, currency: "brl" },
    premium: { priceId: pricePremium, amount: 3990, currency: "brl" },
    configured: !!(pricePro && pricePremium),
  });
});

router.get("/stripe/subscription", async (req: any, res: any) => {
  try {
    const user = await getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

    if (!user.stripeCustomerId) {
      return res.json({ plan: "free", subscription: null });
    }

    const sub = await getStripeSubscriptionByCustomerId(user.stripeCustomerId);
    const plan = resolvePlanFromSubscription(sub);

    return res.json({ plan, subscription: sub || null });
  } catch (err: any) {
    console.error("stripe/subscription error:", err.message);
    return res.json({ plan: "free", subscription: null });
  }
});

router.post("/stripe/create-checkout-session", async (req: any, res: any) => {
  try {
    const { priceId } = req.body;
    if (!priceId) {
      return res.status(400).json({ error: "priceId obrigatório" });
    }

    const user = await getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

    const customerId = await createOrGetStripeCustomer(
      user.id,
      user.email,
      user.name,
      user.stripeCustomerId
    );

    if (!user.stripeCustomerId) {
      await updateUserStripeInfo(user.id, { stripeCustomerId: customerId });
    }

    const host = req.headers.host || "";
    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
    const baseUrl = `${protocol}://${host}`;

    const url = await createCheckoutSession(
      customerId,
      priceId,
      `${baseUrl}/pricing?success=true`,
      `${baseUrl}/pricing?canceled=true`
    );

    return res.json({ url });
  } catch (err: any) {
    console.error("create-checkout-session error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

router.post("/stripe/portal", async (req: any, res: any) => {
  try {
    const user = await getUserById(req.user.id);
    if (!user || !user.stripeCustomerId) {
      return res
        .status(400)
        .json({ error: "Sem assinatura ativa para gerenciar" });
    }

    const host = req.headers.host || "";
    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
    const returnUrl = `${protocol}://${host}/pricing`;

    const url = await createPortalSession(user.stripeCustomerId, returnUrl);
    return res.json({ url });
  } catch (err: any) {
    console.error("portal error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
