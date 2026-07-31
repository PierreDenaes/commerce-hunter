import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

// ─── Recommandations IA (service optionnel) ───────────────
// Activé uniquement si ANTHROPIC_API_KEY est configurée — comme Google Places
// et PageSpeed, l'absence de clé désactive proprement la fonctionnalité.
// Généré À LA DEMANDE depuis la page entreprise, stocké sur Analysis
// (aiRecommendations) et réutilisé par l'UI et le PDF sans nouvel appel.

const DEFAULT_MODEL = "claude-opus-4-8";

export function isAiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// Schéma de sortie structurée — l'API garantit ce format (pas de parsing fragile)
export const AiRecommendationsSchema = z.object({
  summary: z
    .string()
    .describe(
      "Synthèse commerciale en 2-3 phrases : l'état de la présence digitale de l'entreprise et l'enjeu principal, en langage accessible à un non-technicien",
    ),
  priorityActions: z
    .array(
      z.object({
        title: z.string().describe("Action concrète, formulée simplement"),
        why: z
          .string()
          .describe(
            "Pourquoi ça compte pour CE commerce, avec l'impact business concret (visibilité locale, clients perdus…)",
          ),
        impact: z.enum(["FORT", "MOYEN"]),
        effort: z.enum(["FAIBLE", "MOYEN", "IMPORTANT"]),
      }),
    )
    .describe("3 à 5 actions priorisées par impact commercial"),
  quickWins: z
    .array(z.string())
    .describe("2 à 4 corrections rapides et peu coûteuses"),
  emailDraft: z.object({
    subject: z.string().describe("Objet d'email court et factuel, sans jargon"),
    body: z
      .string()
      .describe(
        "Email de prospection de 6 à 10 lignes : constat factuel personnalisé, bienveillant, une seule action demandée (réponse ou appel). Signé « [Votre prénom], [Votre agence] »",
      ),
  }),
});

export type AiRecommendations = z.infer<typeof AiRecommendationsSchema>;

// Schéma JSON pour la sortie structurée de l'API (miroir du schéma Zod —
// le helper zodOutputFormat du SDK requiert Zod v4, le projet est en v3)
const OUTPUT_JSON_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description:
        "Synthèse commerciale en 2-3 phrases : l'état de la présence digitale et l'enjeu principal, en langage accessible à un non-technicien",
    },
    priorityActions: {
      type: "array",
      description: "3 à 5 actions priorisées par impact commercial",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "Action concrète, formulée simplement" },
          why: {
            type: "string",
            description:
              "Pourquoi ça compte pour CE commerce, avec l'impact business concret",
          },
          impact: { type: "string", enum: ["FORT", "MOYEN"] },
          effort: { type: "string", enum: ["FAIBLE", "MOYEN", "IMPORTANT"] },
        },
        required: ["title", "why", "impact", "effort"],
        additionalProperties: false,
      },
    },
    quickWins: {
      type: "array",
      description: "2 à 4 corrections rapides et peu coûteuses",
      items: { type: "string" },
    },
    emailDraft: {
      type: "object",
      properties: {
        subject: {
          type: "string",
          description: "Objet d'email court et factuel, sans jargon",
        },
        body: {
          type: "string",
          description:
            "Email de prospection de 6 à 10 lignes : constat factuel personnalisé, bienveillant, une seule action demandée. Signé « [Votre prénom], [Votre agence] »",
        },
      },
      required: ["subject", "body"],
      additionalProperties: false,
    },
  },
  required: ["summary", "priorityActions", "quickWins", "emailDraft"],
  additionalProperties: false,
} as const;

interface BusinessContext {
  name: string;
  apeCode: string;
  city: string;
  postalCode: string;
  website: string | null;
  phone: string | null;
}

const SYSTEM_PROMPT = `Tu rédiges des audits de présence digitale pour des commerces et PME françaises, pour le compte d'une agence web locale qui propose création/refonte de sites, SEO local et accompagnement à la digitalisation.

Ton lecteur est double : le prestataire (qui utilisera l'audit pour prospecter) et le commerçant (qui recevra le rapport). Écris pour le commerçant : langage simple, zéro jargon technique non expliqué, constats factuels reliés à des enjeux business concrets (être trouvé sur Google, ne pas perdre les clients sur mobile, inspirer confiance).

Règles :
- Appuie-toi UNIQUEMENT sur les données d'analyse fournies — n'invente aucun constat.
- Adapte le propos au métier (code APE) et à la ville : une boulangerie vit du SEO local, un artisan des appels téléphoniques.
- Si l'entreprise n'a pas de site web, c'est l'angle principal : ce qu'elle perd concrètement, et ce qu'un site simple lui apporterait.
- Priorise par impact commercial, pas par pureté technique.
- Ton : direct, bienveillant, jamais alarmiste ni condescendant.`;

function buildUserPrompt(
  business: BusinessContext,
  analysisData: Record<string, unknown>,
): string {
  return `Entreprise à auditer :
- Nom : ${business.name}
- Activité (code APE) : ${business.apeCode}
- Ville : ${business.postalCode} ${business.city}
- Site web : ${business.website ?? "AUCUN SITE WEB"}
- Téléphone : ${business.phone ?? "non renseigné"}

Résultats de l'analyse automatique :
${JSON.stringify(analysisData, null, 2)}

Rédige la synthèse, les actions priorisées, les quick wins et le brouillon d'email de prospection.`;
}

export class AiRecommendationsService {
  private client: Anthropic;
  private model: string;

  constructor() {
    // La clé est lue par le SDK depuis ANTHROPIC_API_KEY
    this.client = new Anthropic();
    this.model = process.env.AI_MODEL ?? DEFAULT_MODEL;
  }

  async generate(
    business: BusinessContext,
    analysisData: Record<string, unknown>,
  ): Promise<AiRecommendations> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      messages: [
        { role: "user", content: buildUserPrompt(business, analysisData) },
      ],
      output_config: {
        format: {
          type: "json_schema",
          schema: OUTPUT_JSON_SCHEMA,
        },
      },
    });

    if (response.stop_reason === "refusal") {
      throw new Error("La génération des recommandations a été refusée.");
    }

    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === "text",
    );
    if (!textBlock) {
      throw new Error("Réponse IA vide — réessayez.");
    }

    // La sortie structurée garantit le format ; le parse Zod est une
    // ceinture-bretelles qui type le résultat
    return AiRecommendationsSchema.parse(JSON.parse(textBlock.text));
  }
}
