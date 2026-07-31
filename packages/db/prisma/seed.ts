import { PrismaClient } from "@prisma/client";
import { PLAN_DEFINITIONS } from "@commercehunter/shared";

const prisma = new PrismaClient();

// Inline bcrypt-compatible hash using $2b$ — we import bcrypt dynamically
async function hashPassword(password: string): Promise<string> {
  // Dynamic import to handle ESM/CJS
  const bcrypt = await import("bcrypt");
  return bcrypt.default.hash(password, 12);
}

async function main() {
  // Source unique du pricing : PLAN_DEFINITIONS (@commercehunter/shared),
  // aussi consommée par la landing. Le plan Self-hosted (billing dormant)
  // n'est pas commercialisé, il vit seulement ici.
  const plans = [
    ...Object.entries(PLAN_DEFINITIONS).map(([name, def]) => ({ name, ...def })),
    // Plan assigné à l'inscription quand le billing est dormant
    // (pas de STRIPE_SECRET_KEY ou BILLING_ENABLED=false) — 0 = illimité
    {
      name: "Self-hosted",
      priceCents: 0,
      cityLimit: 0,
      monthlyAnalysisLimit: 0,
      hasPdfExport: true,
      hasWhiteLabel: true,
      hasApiAccess: true,
    },
  ];

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { name: plan.name },
      update: plan,
      create: plan,
    });
  }

  console.log(`Seeded ${plans.length} subscription plans`);

  // ─── Admin account (optionnel, jamais de credentials en dur) ──
  // Fournir ADMIN_EMAIL et ADMIN_PASSWORD en variables d'environnement.
  // Sans elles, aucun compte n'est créé : passer par /register.
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME ?? "Admin";
  const adminOrgName = process.env.ADMIN_ORG_NAME ?? "Mon organisation";

  if (!adminEmail || !adminPassword) {
    console.log(
      "ADMIN_EMAIL / ADMIN_PASSWORD non définis — pas de compte admin seedé (utilisez /register)",
    );
    return;
  }
  if (adminPassword.length < 8) {
    throw new Error("ADMIN_PASSWORD doit faire au moins 8 caractères");
  }

  // Billing dormant → plan Self-hosted illimité ; sinon Starter
  const defaultPlanName =
    process.env.STRIPE_SECRET_KEY && process.env.BILLING_ENABLED !== "false"
      ? "Starter"
      : "Self-hosted";
  const defaultPlan = await prisma.subscriptionPlan.findUnique({
    where: { name: defaultPlanName },
  });
  if (!defaultPlan) {
    throw new Error(`Plan "${defaultPlanName}" not found — seed plans first`);
  }

  const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existingUser) {
    const passwordHash = await hashPassword(adminPassword);
    const org = await prisma.organization.create({
      data: {
        name: adminOrgName,
        planId: defaultPlan.id,
        billingPeriodStart: new Date(),
        users: {
          create: {
            email: adminEmail,
            passwordHash,
            name: adminName,
            role: "ADMIN",
          },
        },
      },
    });
    console.log(`Created admin user ${adminEmail} in org ${adminOrgName} (${org.id})`);
  } else {
    // Update role to ADMIN if not already
    await prisma.user.update({
      where: { email: adminEmail },
      data: { role: "ADMIN" },
    });
    console.log(`Admin user ${adminEmail} already exists — ensured ADMIN role`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
