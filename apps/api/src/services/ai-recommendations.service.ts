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
    subject: z
      .string()
      .describe(
        "Objet spécifique à ce commerce (domaine ou chiffre du constat principal), 4-9 mots, sans jargon",
      ),
    body: z
      .string()
      .describe(
        "Email de prospection de 8 à 14 lignes suivant la structure imposée : accroche = constat le plus marquant chiffré, 2-3 problèmes détaillés prouvant qu'on a regardé le site, conséquence business de chacun, puis UNE question simple. Signé « [Votre prénom], [Votre agence] »",
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
          description:
            "Objet spécifique à ce commerce (domaine ou chiffre du constat principal), 4-9 mots, sans jargon",
        },
        body: {
          type: "string",
          description:
            "Email de prospection de 8 à 14 lignes suivant la structure imposée : accroche = constat le plus marquant chiffré, 2-3 problèmes détaillés prouvant qu'on a regardé le site, conséquence business de chacun, puis UNE question simple. Signé « [Votre prénom], [Votre agence] »",
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
- Si le statut d'analyse est SITE_DOWN (domaine mort, site injoignable), c'est l'angle principal : ils ont déjà investi dans un site qui n'existe plus — leurs clients et Google tombent dans le vide.
- Priorise par impact commercial, pas par pureté technique.
- Ton : direct, bienveillant, jamais alarmiste ni condescendant.

RÈGLES SPÉCIFIQUES À L'EMAIL DE PROSPECTION (emailDraft) — c'est la pièce maîtresse :
L'email doit donner l'impression d'avoir été écrit à la main pour CE commerce précis, après avoir réellement visité son site. Un email interchangeable est un email raté.

Structure imposée :
1. Accroche (1-2 phrases) : LE constat le plus marquant de l'analyse, précis et vérifiable par le destinataire en 10 secondes (« votre site met 9 secondes à s'afficher sur un téléphone », « votre-domaine.fr ne répond plus », « votre site affiche encore "Non sécurisé" dans Chrome »). Jamais de présentation de soi en ouverture.
2. Détail (3-5 phrases) : 2 ou 3 problèmes concrets tirés des données, chacun avec la précision qui prouve qu'on a regardé (la plateforme détectée, le texte exact du titre de l'onglet, le nombre de secondes de chargement, l'hébergement gratuit avec son sous-domaine…) et sa conséquence commerciale en français courant (clients qui abandonnent avant d'avoir vu la page, invisibilité quand on cherche le métier + la ville sur Google, image peu professionnelle face aux concurrents).
3. Ouverture (1-2 phrases) : UNE seule question simple à laquelle on peut répondre en une ligne. Pas de rendez-vous imposé, pas de plaquette, pas de liste de prestations.

Interdits absolus (ce qui rend un email « bateau ») :
- « Je me permets de vous contacter », « J'espère que vous allez bien », « En tant qu'agence web… », « N'hésitez pas »
- Parler de soi ou de son agence avant de parler d'eux — la signature suffit
- Constats vagues : « votre site pourrait être amélioré », « votre présence en ligne mérite mieux », « à l'ère du numérique »
- Jargon (SEO, balise, meta, LCP, responsive) sans traduction immédiate en français courant
- Superlatifs, pression commerciale, promesses chiffrées inventées

Objet : tiré du constat principal, 4 à 9 mots, spécifique à ce commerce (idéalement avec son nom de domaine ou un chiffre), sans majuscules criardes ni point d'exclamation.`;

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
