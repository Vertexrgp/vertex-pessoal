import Stripe from "stripe";
import { StripeSync } from "stripe-replit-sync";

export async function getUncachableStripeClient(): Promise<Stripe> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY not set. Connect the Stripe integration first."
    );
  }
  return new Stripe(secretKey);
}

let syncInstance: StripeSync | null = null;

export async function getStripeSync(): Promise<StripeSync> {
  if (!syncInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const databaseUrl = process.env.DATABASE_URL;
    if (!secretKey) throw new Error("STRIPE_SECRET_KEY not set");
    if (!databaseUrl) throw new Error("DATABASE_URL not set");
    syncInstance = new StripeSync({ stripeSecretKey: secretKey, databaseUrl });
  }
  return syncInstance;
}
