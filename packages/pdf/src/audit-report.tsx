import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Link,
} from "@react-pdf/renderer";

// ─── Types ───────────────────────────────────────────────

export interface AuditReportData {
  business: {
    name: string;
    siret: string;
    siren: string;
    entityType: string;
    apeCode: string;
    legalForm: string | null;
    employeesRange: string | null;
    address: string | null;
    city: string;
    postalCode: string;
    phone: string | null;
    website: string | null;
    isHeadquarters: boolean;
  };
  analysis: {
    status: string;
    analyzedUrl: string | null;
    technical: {
      isHttps: boolean | null;
      httpStatusCode: number | null;
      responseTimeMs: number | null;
      hasRobotsTxt: boolean | null;
      hasSitemapXml: boolean | null;
    };
    seoOnPage: {
      title: string | null;
      titleLength: number | null;
      metaDescription: string | null;
      metaDescriptionLength: number | null;
      h1: string | null;
      hasCanonical: boolean | null;
      hasFavicon: boolean | null;
    };
    mobile: {
      hasViewport: boolean | null;
      mobileScore: number | null;
    };
    localSeo: {
      cityInTitle: boolean | null;
      cityInH1: boolean | null;
      cityInDescription: boolean | null;
      hasSchemaLocalBusiness: boolean | null;
      hasGoogleMapsEmbed: boolean | null;
    };
    scores: {
      seoScore: number | null;
      digitalScore: number | null;
      priority: string | null;
    };
    analyzedAt: string | null;
  } | null;
  generatedAt: string;
}

// ─── Colors (hex for PDF) ────────────────────────────────

const C = {
  bg: "#0F0F14",
  surface: "#1A1A24",
  border: "#2A2A3A",
  text: "#F5F5F5",
  muted: "#9090A0",
  purple: "#8B5CF6",
  cyan: "#00E5FF",
  pink: "#FF2E88",
  green: "#00FF9F",
  amber: "#FF9F1C",
};

// ─── Styles ──────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    backgroundColor: C.bg,
    color: C.text,
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
  },
  header: {
    marginBottom: 24,
    borderBottom: `2px solid ${C.purple}`,
    paddingBottom: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: C.cyan,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: C.muted,
  },
  section: {
    marginBottom: 18,
    backgroundColor: C.surface,
    borderRadius: 6,
    padding: 14,
    border: `1px solid ${C.border}`,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: C.purple,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    borderBottom: `0.5px solid ${C.border}`,
  },
  label: {
    color: C.muted,
    width: "50%",
  },
  value: {
    textAlign: "right",
    width: "50%",
    fontFamily: "Helvetica-Bold",
  },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 8,
    marginBottom: 4,
  },
  scoreBox: {
    alignItems: "center",
    padding: 10,
    backgroundColor: C.bg,
    borderRadius: 6,
    width: "30%",
  },
  scoreValue: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    color: C.cyan,
  },
  scoreLabel: {
    fontSize: 8,
    color: C.muted,
    marginTop: 2,
  },
  check: { color: C.green },
  cross: { color: C.pink },
  priorityHigh: { color: C.green },
  priorityMedium: { color: C.amber },
  priorityLow: { color: C.pink },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: C.muted,
  },
  link: {
    color: C.cyan,
    textDecoration: "none",
  },
  recoItem: {
    flexDirection: "row",
    marginBottom: 4,
  },
  recoBullet: {
    color: C.amber,
    marginRight: 6,
    fontFamily: "Helvetica-Bold",
  },
});

// ─── Helpers ─────────────────────────────────────────────

function Bool({ value }: { value: boolean | null }) {
  if (value === null) return <Text style={s.value}>—</Text>;
  return value ? (
    <Text style={[s.value, s.check]}>Oui</Text>
  ) : (
    <Text style={[s.value, s.cross]}>Non</Text>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <View style={s.row}>
      <Text style={s.label}>{label}</Text>
      {typeof value === "string" || typeof value === "number" ? (
        <Text style={s.value}>{value ?? "—"}</Text>
      ) : (
        value
      )}
    </View>
  );
}

function BoolRow({ label, value }: { label: string; value: boolean | null }) {
  return (
    <View style={s.row}>
      <Text style={s.label}>{label}</Text>
      <Bool value={value} />
    </View>
  );
}

function priorityStyle(p: string | null) {
  if (p === "HIGH") return s.priorityHigh;
  if (p === "MEDIUM") return s.priorityMedium;
  return s.priorityLow;
}

function generateRecommendations(data: AuditReportData): string[] {
  const recs: string[] = [];
  const a = data.analysis;
  const b = data.business;

  if (!b.website) {
    recs.push("Créer un site web — c'est la première étape pour être visible en ligne.");
    return recs;
  }

  if (!a || a.status !== "COMPLETED") return recs;

  if (!a.technical.isHttps) recs.push("Passer en HTTPS pour sécuriser le site et améliorer le référencement.");
  if (!a.technical.hasRobotsTxt) recs.push("Ajouter un fichier robots.txt pour guider les moteurs de recherche.");
  if (!a.technical.hasSitemapXml) recs.push("Créer un sitemap.xml pour améliorer l'indexation.");
  if ((a.technical.responseTimeMs ?? 9999) > 1000) recs.push("Optimiser la vitesse de chargement (actuellement > 1s).");
  if (!a.seoOnPage.title) recs.push("Ajouter une balise <title> au site.");
  else if ((a.seoOnPage.titleLength ?? 0) < 30 || (a.seoOnPage.titleLength ?? 0) > 60) recs.push("Ajuster la longueur du titre (idéal : 30-60 caractères).");
  if (!a.seoOnPage.metaDescription) recs.push("Ajouter une meta description pour améliorer le taux de clic.");
  if (!a.seoOnPage.h1) recs.push("Ajouter un titre H1 sur la page d'accueil.");
  if (!a.seoOnPage.hasCanonical) recs.push("Ajouter une balise canonical pour éviter le contenu dupliqué.");
  if (!a.mobile.hasViewport) recs.push("Ajouter une balise viewport pour le responsive mobile.");
  if (!a.localSeo.cityInTitle) recs.push(`Intégrer "${b.city}" dans le titre pour le SEO local.`);
  if (!a.localSeo.hasSchemaLocalBusiness) recs.push("Ajouter le schema LocalBusiness (données structurées) pour le référencement local.");
  if (!a.localSeo.hasGoogleMapsEmbed) recs.push("Intégrer une carte Google Maps pour renforcer la présence locale.");

  return recs;
}

// ─── Document ────────────────────────────────────────────

export function AuditReport({ data }: { data: AuditReportData }) {
  const { business: b, analysis: a } = data;
  const recs = generateRecommendations(data);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>{b.name}</Text>
          <Text style={s.subtitle}>
            Audit Digital — {b.city} ({b.postalCode}) — {b.apeCode}
          </Text>
        </View>

        {/* Scores */}
        {a && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Scores</Text>
            <View style={s.scoreRow}>
              <View style={s.scoreBox}>
                <Text style={s.scoreValue}>{a.scores.seoScore ?? "—"}</Text>
                <Text style={s.scoreLabel}>SEO / 100</Text>
              </View>
              <View style={s.scoreBox}>
                <Text style={s.scoreValue}>{a.scores.digitalScore ?? "—"}</Text>
                <Text style={s.scoreLabel}>Digital / 100</Text>
              </View>
              <View style={s.scoreBox}>
                <Text style={[s.scoreValue, priorityStyle(a.scores.priority)]}>
                  {a.scores.priority ?? "—"}
                </Text>
                <Text style={s.scoreLabel}>Priorité</Text>
              </View>
            </View>
          </View>
        )}

        {/* Identité */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Identité</Text>
          <Row label="SIRET" value={b.siret} />
          <Row label="SIREN" value={b.siren} />
          <Row label="Type" value={b.entityType} />
          <Row label="Code APE" value={b.apeCode} />
          <Row label="Forme juridique" value={b.legalForm ?? "—"} />
          <Row label="Effectifs" value={b.employeesRange ?? "—"} />
          <Row label="Adresse" value={b.address ?? "—"} />
          <Row label="Ville" value={`${b.postalCode} ${b.city}`} />
          <Row label="Téléphone" value={b.phone ?? "—"} />
          <Row
            label="Site web"
            value={
              b.website ? (
                <Link style={[s.value, s.link]} src={b.website.startsWith("http") ? b.website : `https://${b.website}`}>
                  {b.website}
                </Link>
              ) : (
                <Text style={s.value}>Aucun</Text>
              )
            }
          />
          <Row label="Siège social" value={b.isHeadquarters ? "Oui" : "Non"} />
        </View>

        {/* Analysis sections */}
        {a && a.status === "COMPLETED" && (
          <>
            <View style={s.section}>
              <Text style={s.sectionTitle}>Audit Technique</Text>
              <BoolRow label="HTTPS" value={a.technical.isHttps} />
              <Row label="Code HTTP" value={a.technical.httpStatusCode?.toString() ?? "—"} />
              <Row
                label="Temps de réponse"
                value={a.technical.responseTimeMs ? `${a.technical.responseTimeMs} ms` : "—"}
              />
              <BoolRow label="robots.txt" value={a.technical.hasRobotsTxt} />
              <BoolRow label="sitemap.xml" value={a.technical.hasSitemapXml} />
            </View>

            <View style={s.section}>
              <Text style={s.sectionTitle}>SEO On-Page</Text>
              <Row label="Titre" value={a.seoOnPage.title ?? "—"} />
              <Row label="Longueur titre" value={a.seoOnPage.titleLength?.toString() ?? "—"} />
              <Row label="Meta description" value={a.seoOnPage.metaDescription ? `${a.seoOnPage.metaDescription.slice(0, 80)}...` : "—"} />
              <Row label="H1" value={a.seoOnPage.h1 ?? "—"} />
              <BoolRow label="Canonical" value={a.seoOnPage.hasCanonical} />
              <BoolRow label="Favicon" value={a.seoOnPage.hasFavicon} />
            </View>

            <View style={s.section}>
              <Text style={s.sectionTitle}>Mobile</Text>
              <BoolRow label="Viewport" value={a.mobile.hasViewport} />
              <Row label="Score mobile" value={a.mobile.mobileScore?.toString() ?? "—"} />
            </View>

            <View style={s.section}>
              <Text style={s.sectionTitle}>SEO Local</Text>
              <BoolRow label="Ville dans le titre" value={a.localSeo.cityInTitle} />
              <BoolRow label="Ville dans le H1" value={a.localSeo.cityInH1} />
              <BoolRow label="Ville dans la description" value={a.localSeo.cityInDescription} />
              <BoolRow label="Schema LocalBusiness" value={a.localSeo.hasSchemaLocalBusiness} />
              <BoolRow label="Google Maps" value={a.localSeo.hasGoogleMapsEmbed} />
            </View>
          </>
        )}

        {/* Recommendations */}
        {recs.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Recommandations</Text>
            {recs.map((rec, i) => (
              <View key={i} style={s.recoItem}>
                <Text style={s.recoBullet}>•</Text>
                <Text>{rec}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text>CommerceHunter — Audit Digital</Text>
          <Text>Généré le {data.generatedAt}</Text>
        </View>
      </Page>
    </Document>
  );
}
