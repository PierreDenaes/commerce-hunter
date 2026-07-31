import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import Stripe from "stripe";

process.env.DATABASE_URL ??=
  "postgresql://commercehunter:password@localhost:5433/commercehunter";
process.env.JWT_SECRET ??= "test-secret";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret";
process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
process.env.LOG_LEVEL = "silent";

const RUN_ID = Date.now();
const CUSTOMER_ID = `cus_test_${RUN_ID}`;

async function dbAvailable(): Promise<boolean> {
  try {
    const { prisma } = await import("@commercehunter/db");
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
const dbUp = await dbAvailable();
if (!dbUp) {
  console.warn("[stripe-webhook.integration] DATABASE_URL injoignable — suite ignorée");
}

describe.skipIf(!dbUp)("webhook Stripe (intégration DB)", () => {
  let app: FastifyInstance;
  let stripe: Stripe;
  let orgId: string;
  let starterPlanId: string;
  let proPlanId: string;

  function signedPost(payload: string, signature?: string) {
    return app.inject({
      method: "POST",
      url: "/api/v1/billing/webhook",
      headers: {
        "content-type": "application/json",
        "stripe-signature":
          signature ??
          stripe.webhooks.generateTestHeaderString({
            payload,
            secret: process.env.STRIPE_WEBHOOK_SECRET as string,
          }),
      },
      payload,
    });
  }

  function eventPayload(type: string, object: Record<string, unknown>): string {
    return JSON.stringify({
      id: `evt_test_${RUN_ID}`,
      object: "event",
      type,
      data: { object },
    });
  }

  beforeAll(async () => {
    const { buildApp } = await import("../../app.js");
    app = await buildApp();
    stripe = new Stripe("sk_test_dummy");

    const starter = await app.prisma.subscriptionPlan.upsert({
      where: { name: "Starter" },
      update: {},
      create: {
        name: "Starter",
        priceCents: 4900,
        cityLimit: 3,
        monthlyAnalysisLimit: 500,
        hasPdfExport: false,
        hasWhiteLabel: false,
        hasApiAccess: false,
      },
    });
    starterPlanId = starter.id;
    const pro = await app.prisma.subscriptionPlan.upsert({
      where: { name: "Pro" },
      update: {},
      create: {
        name: "Pro",
        priceCents: 11900,
        cityLimit: 0,
        monthlyAnalysisLimit: 2000,
        hasPdfExport: true,
        hasWhiteLabel: false,
        hasApiAccess: false,
      },
    });
    proPlanId = pro.id;

    const org = await app.prisma.organization.create({
      data: {
        name: `WebhookTestOrg-${RUN_ID}`,
        planId: starterPlanId,
        billingPeriodStart: new Date(),
        stripeCustomerId: CUSTOMER_ID,
        monthlyAnalysesUsed: 42,
      },
    });
    orgId = org.id;
  });

  afterAll(async () => {
    await app.prisma.organization.delete({ where: { id: orgId } });
    await app.close();
  });

  it("rejette une signature invalide", async () => {
    const res = await signedPost(
      eventPayload("invoice.paid", { customer: CUSTOMER_ID }),
      "t=123,v1=deadbeef",
    );
    expect(res.statusCode).toBe(400);
  });

  it("checkout.session.completed active le plan de l'organisation", async () => {
    const res = await signedPost(
      eventPayload("checkout.session.completed", {
        customer: CUSTOMER_ID,
        subscription: `sub_test_${RUN_ID}`,
        metadata: { organizationId: orgId, planId: proPlanId },
      }),
    );
    expect(res.statusCode).toBe(200);

    const org = await app.prisma.organization.findUnique({ where: { id: orgId } });
    expect(org?.planId).toBe(proPlanId);
    expect(org?.stripeSubscriptionId).toBe(`sub_test_${RUN_ID}`);
  });

  it("invoice.paid remet le compteur mensuel à zéro", async () => {
    const res = await signedPost(
      eventPayload("invoice.paid", { customer: CUSTOMER_ID }),
    );
    expect(res.statusCode).toBe(200);

    const org = await app.prisma.organization.findUnique({ where: { id: orgId } });
    expect(org?.monthlyAnalysesUsed).toBe(0);
  });

  it("customer.subscription.deleted repasse l'organisation en Starter", async () => {
    const res = await signedPost(
      eventPayload("customer.subscription.deleted", { customer: CUSTOMER_ID }),
    );
    expect(res.statusCode).toBe(200);

    const org = await app.prisma.organization.findUnique({ where: { id: orgId } });
    expect(org?.planId).toBe(starterPlanId);
    expect(org?.stripeSubscriptionId).toBeNull();
  });
});
