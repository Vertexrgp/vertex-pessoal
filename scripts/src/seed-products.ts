import { getUncachableStripeClient } from "./stripeClient";

async function createProducts() {
  const stripe = await getUncachableStripeClient();

  console.log("Verificando produtos existentes no Stripe...");

  // Check Pro Plan
  const existingPro = await stripe.products.search({
    query: "name:'Vertex OS Pro' AND active:'true'",
  });

  let proProduct: { id: string };
  let proPriceId: string;

  if (existingPro.data.length > 0) {
    proProduct = existingPro.data[0];
    console.log(`Pro Plan já existe: ${proProduct.id}`);

    const proPrices = await stripe.prices.list({
      product: proProduct.id,
      active: true,
    });
    proPriceId = proPrices.data[0]?.id ?? "";
    console.log(`Pro Price ID: ${proPriceId}`);
  } else {
    console.log("Criando Vertex OS Pro...");
    proProduct = await stripe.products.create({
      name: "Vertex OS Pro",
      description: "Acesso completo a todos os módulos do Vertex OS",
      metadata: { vertex_plan: "pro" },
    });

    const proPrice = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 1990,
      currency: "brl",
      recurring: { interval: "month" },
    });
    proPriceId = proPrice.id;
    console.log(`Criado Pro: product=${proProduct.id} price=${proPriceId}`);
  }

  // Check Premium Plan
  const existingPremium = await stripe.products.search({
    query: "name:'Vertex OS Premium' AND active:'true'",
  });

  let premiumProduct: { id: string };
  let premiumPriceId: string;

  if (existingPremium.data.length > 0) {
    premiumProduct = existingPremium.data[0];
    console.log(`Premium Plan já existe: ${premiumProduct.id}`);

    const premiumPrices = await stripe.prices.list({
      product: premiumProduct.id,
      active: true,
    });
    premiumPriceId = premiumPrices.data[0]?.id ?? "";
    console.log(`Premium Price ID: ${premiumPriceId}`);
  } else {
    console.log("Criando Vertex OS Premium...");
    premiumProduct = await stripe.products.create({
      name: "Vertex OS Premium",
      description: "Acesso total com IA avançada e suporte dedicado",
      metadata: { vertex_plan: "premium" },
    });

    const premiumPrice = await stripe.prices.create({
      product: premiumProduct.id,
      unit_amount: 3990,
      currency: "brl",
      recurring: { interval: "month" },
    });
    premiumPriceId = premiumPrice.id;
    console.log(
      `Criado Premium: product=${premiumProduct.id} price=${premiumPriceId}`
    );
  }

  console.log("\n========================================");
  console.log("Adicione estas variáveis de ambiente:");
  console.log(`STRIPE_PRICE_PRO=${proPriceId}`);
  console.log(`STRIPE_PRICE_PREMIUM=${premiumPriceId}`);
  console.log("========================================\n");
}

createProducts().catch((err) => {
  console.error("Erro:", err.message);
  process.exit(1);
});
