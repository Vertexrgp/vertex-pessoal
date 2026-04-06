import { db } from "@workspace/db";
import { sql, eq } from "drizzle-orm";
import { usersTable } from "@workspace/db/schema";

export async function getStripeSubscriptionByCustomerId(
  customerId: string
): Promise<any | null> {
  const result = await db.execute(
    sql`
      SELECT s.*, p.metadata as product_metadata, p.name as product_name
      FROM stripe.subscriptions s
      LEFT JOIN stripe.prices pr ON pr.id = s.items->0->>'price'
      LEFT JOIN stripe.products p ON p.id = pr.product
      WHERE s.customer = ${customerId}
        AND s.status IN ('active', 'trialing')
      ORDER BY s.created DESC
      LIMIT 1
    `
  );
  return result.rows[0] || null;
}

export async function getUserByStripeCustomerId(
  customerId: string
): Promise<any | null> {
  const result = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.stripeCustomerId, customerId))
    .limit(1);
  return result[0] || null;
}

export async function updateUserStripeInfo(
  userId: number,
  data: { stripeCustomerId?: string; stripeSubscriptionId?: string }
) {
  await db.update(usersTable).set(data).where(eq(usersTable.id, userId));
}

export async function getUserById(userId: number) {
  const result = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  return result[0] || null;
}

export function resolvePlanFromSubscription(sub: any): "free" | "pro" | "premium" {
  if (!sub || sub.status !== "active") return "free";
  const metadata = sub.product_metadata || {};
  const plan = metadata.vertex_plan || metadata.plan || "";
  if (plan === "premium") return "premium";
  if (plan === "pro") return "pro";
  return "pro";
}
