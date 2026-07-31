import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST ?? "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT ?? "587");
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  if (!SMTP_USER || !SMTP_PASS) {
    console.warn("[email] SMTP_USER or SMTP_PASS not set — emails will be skipped");
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false, // STARTTLS
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  return transporter;
}

const FRONTEND_URL = process.env.FRONTEND_URL ?? process.env.CORS_ORIGIN ?? "http://localhost:3000";

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  const t = getTransporter();
  if (!t) {
    console.warn(`[email] Skipping welcome email to ${to} (no SMTP config)`);
    return;
  }

  await t.sendMail({
    from: `CommerceHunter <${SMTP_USER}>`,
    to,
    subject: "Bienvenue sur CommerceHunter !",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #8B5CF6;">CommerceHunter</h2>
        <p>Bonjour ${name},</p>
        <p>Bienvenue sur CommerceHunter ! Votre compte est prêt.</p>
        <p>Vous pouvez maintenant rechercher des commerces locaux, analyser leur présence web et exporter vos prospects.</p>
        <p style="margin: 24px 0;">
          <a href="${FRONTEND_URL}/dashboard"
             style="background: linear-gradient(135deg, #8B5CF6, #00E5FF); color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Accéder au dashboard
          </a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #aaa; font-size: 12px;">CommerceHunter — Prospection commerciale intelligente</p>
      </div>
    `,
  });
}

export async function sendInvitationEmail(
  to: string,
  inviteUrl: string,
  organizationName: string,
  invitedByName: string,
): Promise<void> {
  const t = getTransporter();
  if (!t) {
    console.warn(`[email] Skipping invitation email to ${to} (no SMTP config)`);
    return;
  }

  await t.sendMail({
    from: `CommerceHunter <${SMTP_USER}>`,
    to,
    subject: `${invitedByName} vous invite à rejoindre ${organizationName} — CommerceHunter`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #8B5CF6;">CommerceHunter</h2>
        <p>Bonjour,</p>
        <p><strong>${invitedByName}</strong> vous invite à rejoindre l'équipe <strong>${organizationName}</strong> sur CommerceHunter.</p>
        <p style="margin: 24px 0;">
          <a href="${inviteUrl}"
             style="background: linear-gradient(135deg, #8B5CF6, #00E5FF); color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Rejoindre l'équipe
          </a>
        </p>
        <p style="color: #888; font-size: 14px;">Cette invitation expire dans <strong>7 jours</strong>.</p>
        <p style="color: #888; font-size: 14px;">Si vous ne souhaitez pas rejoindre cette équipe, ignorez cet email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #aaa; font-size: 12px;">CommerceHunter — Prospection commerciale intelligente</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const t = getTransporter();
  if (!t) {
    console.warn(`[email] Skipping password reset email to ${to} (no SMTP config)`);
    return;
  }

  await t.sendMail({
    from: `CommerceHunter <${SMTP_USER}>`,
    to,
    subject: "Réinitialisation de votre mot de passe — CommerceHunter",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #8B5CF6;">CommerceHunter</h2>
        <p>Bonjour,</p>
        <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
        <p>Cliquez sur le lien ci-dessous pour définir un nouveau mot de passe :</p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}"
             style="background: linear-gradient(135deg, #8B5CF6, #00E5FF); color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Réinitialiser mon mot de passe
          </a>
        </p>
        <p style="color: #888; font-size: 14px;">Ce lien expire dans <strong>1 heure</strong>.</p>
        <p style="color: #888; font-size: 14px;">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #aaa; font-size: 12px;">CommerceHunter — Prospection commerciale intelligente</p>
      </div>
    `,
  });
}
