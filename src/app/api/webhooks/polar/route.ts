import { Webhooks } from "@polar-sh/nextjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { PLANS, FREE_TRIAL } from "@/lib/billing/constants";
import { sendEmail } from "@/lib/email/send";
import { getLastChanceRetentionHtml } from "@/lib/email/templates";

const RETENTION_EMAIL_COOLDOWN_DAYS = 30;

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,

  onSubscriptionCreated: async (payload) => {
    const customerId = payload.data.customerId;
    const externalId = payload.data.customer?.externalId;
    if (!externalId) {
      console.error(
        "[Polar Webhook] No external customer ID on subscription.created"
      );
      return;
    }

    const isTrialing = payload.data.status === "trialing";

    if (isTrialing) {
      // Guard: don't downgrade if user is already Pro (race with subscription.active)
      const [currentUser] = await db
        .select({ plan: users.plan })
        .from(users)
        .where(eq(users.id, externalId));
      if (currentUser?.plan === PLANS.PRO) {
        console.log(
          `[Polar Webhook] Skipping trialing event, user ${externalId} is already Pro`
        );
        return;
      }

      // Polar trial: store Polar IDs and set/extend trial, but keep plan as free.
      // Our trial limits (90 min, Pro features minus API/MCP) apply.
      const trialEndsAt = payload.data.trialEnd
        ? new Date(payload.data.trialEnd)
        : new Date(Date.now() + FREE_TRIAL.days * 24 * 60 * 60 * 1000);

      await db
        .update(users)
        .set({
          polarCustomerId: customerId,
          polarSubscriptionId: payload.data.id,
          trialEndsAt,
          currentPeriodStart: new Date(payload.data.currentPeriodStart),
          currentPeriodEnd: new Date(payload.data.currentPeriodEnd),
          updatedAt: new Date(),
        })
        .where(eq(users.id, externalId));

      console.log(
        `[Polar Webhook] Subscription created (trialing) for user ${externalId}, trial ends ${trialEndsAt.toISOString()}`
      );
    } else {
      // Direct subscription (no trial): activate Pro immediately
      await db
        .update(users)
        .set({
          plan: PLANS.PRO,
          polarCustomerId: customerId,
          polarSubscriptionId: payload.data.id,
          currentPeriodStart: new Date(payload.data.currentPeriodStart),
          currentPeriodEnd: new Date(payload.data.currentPeriodEnd),
          updatedAt: new Date(),
        })
        .where(eq(users.id, externalId));

      console.log(
        `[Polar Webhook] Subscription created (active) for user ${externalId}`
      );
    }
  },

  onSubscriptionActive: async (payload) => {
    // Fires when trial ends and payment succeeds, or on renewal.
    // This is when Pro actually activates.
    const externalId = payload.data.customer?.externalId;
    if (!externalId) return;

    await db
      .update(users)
      .set({
        plan: PLANS.PRO,
        polarSubscriptionId: payload.data.id,
        currentPeriodStart: new Date(payload.data.currentPeriodStart),
        currentPeriodEnd: new Date(payload.data.currentPeriodEnd),
        updatedAt: new Date(),
      })
      .where(eq(users.id, externalId));

    console.log(`[Polar Webhook] Subscription active for user ${externalId}`);
  },

  onSubscriptionUpdated: async (payload) => {
    const externalId = payload.data.customer?.externalId;
    if (!externalId) return;

    await db
      .update(users)
      .set({
        currentPeriodStart: new Date(payload.data.currentPeriodStart),
        currentPeriodEnd: new Date(payload.data.currentPeriodEnd),
        updatedAt: new Date(),
      })
      .where(eq(users.id, externalId));
  },

  onSubscriptionCanceled: async (payload) => {
    const externalId = payload.data.customer?.externalId;
    if (!externalId) return;

    const [user] = await db
      .select({
        email: users.email,
        name: users.name,
        lastRetentionEmailSentAt: users.lastRetentionEmailSentAt,
      })
      .from(users)
      .where(eq(users.id, externalId));

    if (!user) return;

    const now = new Date();
    const cooldownBoundary = new Date(now);
    cooldownBoundary.setDate(
      cooldownBoundary.getDate() - RETENTION_EMAIL_COOLDOWN_DAYS
    );
    const shouldSendRetentionEmail =
      !user.lastRetentionEmailSentAt ||
      user.lastRetentionEmailSentAt <= cooldownBoundary;

    if (shouldSendRetentionEmail) {
      const periodEnd = payload.data.currentPeriodEnd
        ? new Date(payload.data.currentPeriodEnd)
        : null;

      await sendEmail({
        to: user.email,
        subject: "Last chance to keep your Vernix Pro benefits",
        html: getLastChanceRetentionHtml(user.name, periodEnd),
      });

      await db
        .update(users)
        .set({
          lastRetentionEmailSentAt: now,
          updatedAt: now,
        })
        .where(eq(users.id, externalId));
    }

    // Subscription remains active until period end (or trial end), then revoked.
    console.log(
      `[Polar Webhook] Subscription canceled for user ${externalId}, active until ${payload.data.currentPeriodEnd}`
    );
  },

  onSubscriptionRevoked: async (payload) => {
    // Polar sends revoked when the subscription is fully terminated.
    // Always downgrade immediately. The sync will also catch this as a fallback.
    const externalId = payload.data.customer?.externalId;
    if (!externalId) return;

    await db
      .update(users)
      .set({
        plan: PLANS.FREE,
        polarSubscriptionId: null,
        trialEndsAt: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, externalId));

    console.log(`[Polar Webhook] Subscription revoked for user ${externalId}`);
  },

  onCustomerCreated: async (payload) => {
    const externalId = payload.data.externalId;
    if (!externalId) return;

    await db
      .update(users)
      .set({
        polarCustomerId: payload.data.id,
        updatedAt: new Date(),
      })
      .where(eq(users.id, externalId));
  },
});
