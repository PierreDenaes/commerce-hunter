import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import Stripe from "stripe";
import { z } from "zod";

const CheckoutSchema = z.object({
  planId: z.string().uuid(),
});

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";
const FRONTEND_URL = process.env.CORS_ORIGIN ?? "http://localhost:3000";

function getStripe() {
  if (!STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(STRIPE_SECRET_KEY);
}

export default async function billingRoutes(app: FastifyInstance) {
  // ─── GET /api/v1/billing/plans — Plans achetables ──────
  app.get(
    "/api/v1/billing/plans",
    { preHandler: app.authenticate },
    async (_request, reply) => {
      const plans = await app.prisma.subscriptionPlan.findMany({
        where: { priceCents: { gt: 0 } },
        orderBy: { priceCents: "asc" },
        select: {
          id: true,
          name: true,
          priceCents: true,
          cityLimit: true,
          monthlyAnalysisLimit: true,
          hasPdfExport: true,
          hasWhiteLabel: true,
          hasApiAccess: true,
        },
      });
      return reply.send({ plans });
    },
  );

  // ─── POST /api/v1/billing/checkout — Create checkout session ──
  app.post<{ Body: { planId: string } }>(
    "/api/v1/billing/checkout",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const parsed = CheckoutSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "planId (UUID) is required" });
      }
      const { planId } = parsed.data;

      const targetPlan = await app.prisma.subscriptionPlan.findUnique({
        where: { id: planId },
      });

      if (!targetPlan) {
        return reply.status(404).send({ error: "Plan not found" });
      }

      // Le plan self-hosted (0 €) n'est pas achetable via Stripe
      if (targetPlan.priceCents === 0) {
        return reply.status(400).send({ error: "This plan is not purchasable" });
      }

      const org = await app.prisma.organization.findUnique({
        where: { id: request.user.organizationId },
        select: { id: true, name: true, stripeCustomerId: true },
      });

      if (!org) {
        return reply.status(404).send({ error: "Organization not found" });
      }

      try {
        const stripe = getStripe();

        // Create or reuse Stripe customer
        let customerId = org.stripeCustomerId;
        if (!customerId) {
          const customer = await stripe.customers.create({
            name: org.name,
            metadata: { organizationId: org.id },
          });
          customerId = customer.id;

          await app.prisma.organization.update({
            where: { id: org.id },
            data: { stripeCustomerId: customerId },
          });
        }

        const session = await stripe.checkout.sessions.create({
          customer: customerId,
          mode: "subscription",
          line_items: [
            {
              price_data: {
                currency: "eur",
                product_data: {
                  name: `CommerceHunter ${targetPlan.name}`,
                  description: `Plan ${targetPlan.name} — ${targetPlan.monthlyAnalysisLimit === 0 ? "Analyses illimitées" : `${targetPlan.monthlyAnalysisLimit} analyses/mois`}`,
                },
                unit_amount: targetPlan.priceCents,
                recurring: { interval: "month" },
              },
              quantity: 1,
            },
          ],
          metadata: {
            organizationId: org.id,
            planId: targetPlan.id,
          },
          success_url: `${FRONTEND_URL}/settings/billing?success=true`,
          cancel_url: `${FRONTEND_URL}/settings/billing?canceled=true`,
        });

        return reply.send({ checkoutUrl: session.url });
      } catch (err) {
        request.log.error({ err }, "Stripe checkout session creation failed");
        return reply.status(500).send({ error: "Failed to create checkout session" });
      }
    },
  );

  // ─── GET /api/v1/billing/portal — Billing portal session ──
  app.get(
    "/api/v1/billing/portal",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const org = await app.prisma.organization.findUnique({
        where: { id: request.user.organizationId },
        select: { stripeCustomerId: true },
      });

      if (!org?.stripeCustomerId) {
        return reply.status(400).send({
          error: "No billing account found. Please subscribe to a plan first.",
        });
      }

      try {
        const stripe = getStripe();

        const session = await stripe.billingPortal.sessions.create({
          customer: org.stripeCustomerId,
          return_url: `${FRONTEND_URL}/settings/billing`,
        });

        return reply.send({ portalUrl: session.url });
      } catch (err) {
        request.log.error({ err }, "Stripe portal session creation failed");
        return reply.status(500).send({ error: "Failed to create billing portal session" });
      }
    },
  );

  // ─── POST /api/v1/billing/webhook — Stripe webhook ────────
  // Register in encapsulated scope with custom content type parser for raw body
  app.register(async (webhookScope) => {
    webhookScope.removeAllContentTypeParsers();
    webhookScope.addContentTypeParser(
      "application/json",
      { parseAs: "buffer" },
      (_req, body, done) => {
        done(null, body);
      },
    );

    webhookScope.post(
      "/api/v1/billing/webhook",
      async (request: FastifyRequest, reply: FastifyReply) => {
        const stripe = getStripe();
        const sig = request.headers["stripe-signature"];

        if (!sig || !STRIPE_WEBHOOK_SECRET) {
          return reply.status(400).send({ error: "Missing signature or webhook secret" });
        }

        let event: Stripe.Event;

        try {
          event = stripe.webhooks.constructEvent(
            request.body as Buffer,
            sig as string,
            STRIPE_WEBHOOK_SECRET,
          );
        } catch (err) {
          request.log.error({ err }, "Webhook signature verification failed");
          return reply.status(400).send({ error: "Invalid signature" });
        }

        request.log.info({ eventType: event.type }, "Stripe webhook received");

        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            const orgId = session.metadata?.organizationId;
            const planId = session.metadata?.planId;

            if (orgId && planId) {
              await app.prisma.organization.update({
                where: { id: orgId },
                data: {
                  planId,
                  stripeCustomerId: session.customer as string,
                  stripeSubscriptionId: session.subscription as string,
                },
              });
              request.log.info({ orgId, planId }, "Organization plan updated via checkout");
            }
            break;
          }

          case "invoice.paid": {
            const invoice = event.data.object as Stripe.Invoice;
            const customerId = invoice.customer as string;

            // Reset monthly counter on successful payment
            const org = await app.prisma.organization.findFirst({
              where: { stripeCustomerId: customerId },
            });

            if (org) {
              await app.prisma.organization.update({
                where: { id: org.id },
                data: {
                  monthlyAnalysesUsed: 0,
                  billingPeriodStart: new Date(),
                },
              });
              request.log.info({ orgId: org.id }, "Monthly counter reset on invoice.paid");
            }
            break;
          }

          case "invoice.payment_failed": {
            const invoice = event.data.object as Stripe.Invoice;
            const customerId = invoice.customer as string;

            request.log.warn(
              { customerId },
              "Payment failed — org flagged for follow-up",
            );
            break;
          }

          case "customer.subscription.updated": {
            const subscription = event.data.object as Stripe.Subscription;
            const customerId = subscription.customer as string;

            const org = await app.prisma.organization.findFirst({
              where: { stripeCustomerId: customerId },
            });

            if (org) {
              const priceId = subscription.items.data[0]?.price?.id;
              if (priceId) {
                request.log.info(
                  { orgId: org.id, subscriptionId: subscription.id },
                  "Subscription updated",
                );
              }
            }
            break;
          }

          case "customer.subscription.deleted": {
            const subscription = event.data.object as Stripe.Subscription;
            const customerId = subscription.customer as string;

            // Downgrade to Starter
            const org = await app.prisma.organization.findFirst({
              where: { stripeCustomerId: customerId },
            });

            if (org) {
              const starterPlan = await app.prisma.subscriptionPlan.findFirst({
                where: { name: "Starter" },
              });

              if (starterPlan) {
                await app.prisma.organization.update({
                  where: { id: org.id },
                  data: {
                    planId: starterPlan.id,
                    stripeSubscriptionId: null,
                  },
                });
                request.log.info(
                  { orgId: org.id },
                  "Organization downgraded to Starter after subscription deletion",
                );
              }
            }
            break;
          }
        }

        return reply.status(200).send({ received: true });
      },
    );
  });
}
