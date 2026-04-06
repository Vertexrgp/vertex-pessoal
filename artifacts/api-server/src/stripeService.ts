import { getUncachableStripeClient } from "./stripeClient";

export async function createOrGetStripeCustomer(
  userId: number,
  email: string,
  name: string,
  existingCustomerId?: string | null
): Promise<string> {
  const stripe = await getUncachableStripeClient();

  if (existingCustomerId) {
    return existingCustomerId;
  }

  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { userId: String(userId) },
  });

  return customer.id;
}

export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const stripe = await getUncachableStripeClient();

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return session.url!;
}

export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string> {
  const stripe = await getUncachableStripeClient();

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session.url;
}
