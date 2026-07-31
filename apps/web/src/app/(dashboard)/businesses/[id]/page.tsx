"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { showApiError, showSuccess } from "@/lib/toast";
import {
  AiRecommendationsCard,
  type AiRecommendations,
} from "@/components/businesses/ai-recommendations-card";
import { GlassCard } from "@/components/ui/glass-card";
import { ScoreGauge } from "@/components/ui/score-gauge";
import { SEORadarChart } from "@/components/ui/seo-radar-chart";
import { SplitLayout } from "@/components/ui/split-layout";
import { PriorityBadge, type Priority } from "@/components/ui/priority-badge";
import { GradientButton } from "@/components/ui/gradient-button";
import { SkeletonLoader } from "@/components/ui/skeleton-loader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AddToListDialog } from "@/components/prospects/add-to-list-dialog";

interface AnalysisDetail {
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
  performance: {
    performanceScore: number | null;
    lcpMs: number | null;
    clsScore: number | null;
    ttfbMs: number | null;
    fcpMs: number | null;
  };
  content: {
    totalImages: number | null;
    imagesWithAlt: number | null;
    h1Count: number | null;
    h2Count: number | null;
    h3Count: number | null;
    hasProperHeadingHierarchy: boolean | null;
    internalLinkCount: number | null;
    externalLinkCount: number | null;
    wordCount: number | null;
    textRatio: number | null;
    brokenLinksCount: number | null;
    checkedLinksCount: number | null;
  };
  platform: {
    detectedPlatform: string | null;
    isFreeHosting: boolean | null;
  };
  security: {
    hasHsts: boolean | null;
    hasCsp: boolean | null;
    hasXFrameOptions: boolean | null;
    hasXContentTypeOptions: boolean | null;
  };
  social: {
    hasOgTags: boolean | null;
    hasTwitterCard: boolean | null;
    hasOgImage: boolean | null;
    structuredDataTypes: string[];
    jsonLdInvalidCount: number | null;
  };
  scores: {
    seoScore: number | null;
    digitalScore: number | null;
    priority: Priority | null;
  };
  contactEmails: string[];
  analyzedAt: string | null;
  aiRecommendations: AiRecommendations | null;
  aiRecommendationsAt: string | null;
}

interface BusinessDetail {
  id: string;
  name: string;
  siret: string;
  siren: string;
  entityType: string;
  apeCode: string;
  legalForm: string | null;
  legalFormCode: string | null;
  employeesRange: string | null;
  address: string | null;
  city: string;
  postalCode: string;
  phone: string | null;
  website: string | null;
  isHeadquarters: boolean;
  analysis: AnalysisDetail | null;
  aiEnabled: boolean;
}

export default function BusinessDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [business, setBusiness] = useState<BusinessDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [addToListOpen, setAddToListOpen] = useState(false);

  const fetchBusiness = useCallback(() => {
    api
      .get<BusinessDetail>(`/api/v1/businesses/${id}`)
      .then(setBusiness)
      .catch(showApiError)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchBusiness();
  }, [fetchBusiness]);

  // Poll every 3s while analysis is PENDING or RUNNING
  useEffect(() => {
    const status = business?.analysis?.status;
    if (!business || (status !== "PENDING" && status !== "RUNNING")) return;

    const interval = setInterval(fetchBusiness, 3000);
    return () => clearInterval(interval);
  }, [business, fetchBusiness]);

  const handleExportPdf = async () => {
    setPdfError(null);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
    try {
      const res = await fetch(`${apiUrl}/api/v1/export/pdf/${id}`, {
        credentials: "include",
      });
      if (res.status === 403) {
        const data = await res.json();
        setPdfError(data.error ?? "Export PDF non disponible sur votre plan actuel. Passez au plan Pro.");
        return;
      }
      if (!res.ok) throw new Error("PDF export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `audit-${business?.name?.replace(/[^a-zA-Z0-9]/g, "_") ?? "export"}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      showSuccess("PDF téléchargé");
    } catch {
      setPdfError("Erreur lors de la génération du PDF.");
    }
  };

  const handleReanalyze = async () => {
    setReanalyzing(true);
    try {
      await api.post(`/api/v1/businesses/${id}/reanalyze`);
      showSuccess("Re-analyse lancée");
      setTimeout(fetchBusiness, 2000);
    } catch (err) {
      showApiError(err);
    } finally {
      setReanalyzing(false);
    }
  };

  if (loading) {
    return (
      <SplitLayout
        ratio="equal"
        left={
          <div className="space-y-4">
            <SkeletonLoader variant="gauge" />
            <SkeletonLoader variant="chart" />
          </div>
        }
        right={
          <div className="space-y-4">
            <SkeletonLoader variant="card" />
            <SkeletonLoader variant="card" />
          </div>
        }
      />
    );
  }

  if (!business) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <p className="text-muted-foreground">Entreprise introuvable.</p>
      </div>
    );
  }

  const a = business.analysis;
  const radarData = computeRadarScores(a);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">{business.name}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {business.siret} &middot; {business.city} &middot; {business.apeCode}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {a?.scores.priority && (
            <PriorityBadge priority={a.scores.priority} />
          )}
          <GradientButton
            variant="accent"
            size="sm"
            onClick={() => setAddToListOpen(true)}
          >
            + Liste
          </GradientButton>
          <GradientButton
            variant="accent"
            size="sm"
            onClick={handleExportPdf}
          >
            Export PDF
          </GradientButton>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <GradientButton
                variant="primary"
                size="sm"
                loading={reanalyzing}
              >
                Re-analyser
              </GradientButton>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmer la re-analyse</AlertDialogTitle>
                <AlertDialogDescription>
                  L&apos;analyse existante sera remplacée par une nouvelle analyse.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleReanalyze}>
                  Re-analyser
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {pdfError && (
        <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          <p>{pdfError}</p>
          <Link
            href="/settings/billing"
            className="mt-1 inline-block font-medium underline hover:no-underline"
          >
            Mettre à niveau mon plan
          </Link>
        </div>
      )}

      {/* En-tête : score, radar et informations légales côte à côte
          (mobile : empilés dans cet ordre) */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            <GlassCard className="flex flex-col items-center justify-center gap-4">
              <h2 className="font-heading text-sm font-semibold text-muted-foreground">
                Score Digital
              </h2>
              <ScoreGauge
                score={a?.scores.digitalScore ?? 0}
                size={160}
                label="/100"
              />
            </GlassCard>

            {a && a.scores.seoScore !== null && (
              <GlassCard>
                <h2 className="font-heading mb-4 text-sm font-semibold text-muted-foreground">
                  Radar SEO
                </h2>
                <SEORadarChart
                  data={[
                    { dimension: "Technique", score: radarData.technical },
                    { dimension: "On-Page", score: radarData.onPage },
                    { dimension: "Mobile", score: radarData.mobile },
                    { dimension: "SEO Local", score: radarData.local },
                    { dimension: "Performance", score: radarData.performance },
                    { dimension: "Contenu", score: radarData.content },
                    { dimension: "Sécurité", score: radarData.security },
                    { dimension: "Social", score: radarData.social },
                  ]}
                />
              </GlassCard>
            )}
          {/* Business info */}
          <GlassCard className="md:col-span-2 xl:col-span-1">
            <h2 className="font-heading mb-4 font-semibold">
              Informations légales
            </h2>
            <dl className="space-y-2 text-sm">
              <InfoRow label="SIRET" value={business.siret} />
              <InfoRow label="SIREN" value={business.siren} />
              <InfoRow label="Type" value={business.entityType} />
              <InfoRow label="Code APE" value={business.apeCode} />
              <InfoRow label="Forme juridique" value={business.legalForm} />
              <InfoRow label="Effectifs" value={business.employeesRange} />
              <InfoRow label="Adresse" value={business.address} />
              <InfoRow label="Ville" value={`${business.postalCode} ${business.city}`} />
              <InfoRow label="Téléphone" value={business.phone} />
              <InfoRow label="Siège" value={business.isHeadquarters ? "Oui" : "Non"} />
              {business.website && (
                <InfoRow
                  label="Site web"
                  value={
                    <a
                      href={business.website.startsWith("http") ? business.website : `https://${business.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {business.website}
                    </a>
                  }
                />
              )}
              {a && (
                <InfoRow
                  label="Email(s)"
                  value={
                    a.contactEmails.length > 0 ? (
                      <div className="flex flex-col items-end gap-1">
                        {a.contactEmails.map((email) => (
                          <a
                            key={email}
                            href={`mailto:${email}`}
                            className="text-primary hover:underline"
                          >
                            {email}
                          </a>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">Non trouvé sur le site</span>
                    )
                  }
                />
              )}
            </dl>
          </GlassCard>
      </div>

      {/* Recommandations IA — à la demande, si la clé est configurée côté serveur */}
      {business.aiEnabled &&
        a &&
        (a.status === "COMPLETED" || a.status === "NO_WEBSITE") && (
          <AiRecommendationsCard
            businessId={business.id}
            initial={a.aiRecommendations}
            generatedAt={a.aiRecommendationsAt}
          />
        )}

          {/* Analysis sections — colonnes façon masonry (1/2/3 selon l'écran) */}
          {a && (a.status === "COMPLETED" || ((a.status === "PENDING" || a.status === "RUNNING") && a.seoOnPage.title !== null)) && (
            <div className="mt-6 columns-1 gap-6 md:columns-2 xl:columns-3 [&>*]:mb-6 [&>*]:break-inside-avoid">
              <AnalysisSection title="Technique">
                <CheckRow label="HTTPS" value={a.technical.isHttps} />
                <TextRow
                  label="Code HTTP"
                  value={a.technical.httpStatusCode?.toString()}
                />
                <TextRow
                  label="Temps de réponse"
                  value={a.technical.responseTimeMs ? `${a.technical.responseTimeMs}ms` : null}
                />
                <CheckRow label="robots.txt" value={a.technical.hasRobotsTxt} />
                <CheckRow label="sitemap.xml" value={a.technical.hasSitemapXml} />
                <TextRow label="Plateforme détectée" value={a.platform.detectedPlatform} />
                {a.platform.isFreeHosting === true && (
                  <TextRow
                    label="Hébergement gratuit / page plateforme"
                    value="Oui ⚠️"
                  />
                )}
              </AnalysisSection>

              <AnalysisSection title="SEO On-Page">
                <TextRow label="Titre" value={a.seoOnPage.title} />
                <TextRow
                  label="Longueur titre"
                  value={a.seoOnPage.titleLength?.toString()}
                />
                <TextRow
                  label="Meta description"
                  value={a.seoOnPage.metaDescription}
                />
                <TextRow label="H1" value={a.seoOnPage.h1} />
                <CheckRow label="Canonical" value={a.seoOnPage.hasCanonical} />
                <CheckRow label="Favicon" value={a.seoOnPage.hasFavicon} />
              </AnalysisSection>

              <AnalysisSection title="Mobile">
                <CheckRow label="Viewport" value={a.mobile.hasViewport} />
                <TextRow
                  label="Score mobile"
                  value={a.mobile.mobileScore?.toString()}
                />
              </AnalysisSection>

              <AnalysisSection title="SEO Local">
                <CheckRow label="Ville dans le titre" value={a.localSeo.cityInTitle} />
                <CheckRow label="Ville dans le H1" value={a.localSeo.cityInH1} />
                <CheckRow
                  label="Ville dans la description"
                  value={a.localSeo.cityInDescription}
                />
                <CheckRow
                  label="Schema LocalBusiness"
                  value={a.localSeo.hasSchemaLocalBusiness}
                />
                <CheckRow
                  label="Google Maps"
                  value={a.localSeo.hasGoogleMapsEmbed}
                />
              </AnalysisSection>

              {/* Performance (PageSpeed) */}
              <AnalysisSection title="Performance">
                {a.performance.performanceScore !== null ? (
                  <>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-muted-foreground">Score PageSpeed</span>
                      <ScoreGauge
                        score={a.performance.performanceScore}
                        size={48}
                      />
                    </div>
                    <TextRow
                      label="LCP (Largest Contentful Paint)"
                      value={a.performance.lcpMs !== null ? `${a.performance.lcpMs}ms` : null}
                    />
                    <TextRow
                      label="CLS (Cumulative Layout Shift)"
                      value={a.performance.clsScore !== null ? (a.performance.clsScore / 1000).toFixed(3) : null}
                    />
                    <TextRow
                      label="TTFB (Time to First Byte)"
                      value={a.performance.ttfbMs !== null ? `${a.performance.ttfbMs}ms` : null}
                    />
                    <TextRow
                      label="FCP (First Contentful Paint)"
                      value={a.performance.fcpMs !== null ? `${a.performance.fcpMs}ms` : null}
                    />
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Données PageSpeed non disponibles (clé API non configurée ou analyse non effectuée).
                  </p>
                )}
              </AnalysisSection>

              {/* Content */}
              <AnalysisSection title="Contenu">
                <TextRow
                  label="Images totales"
                  value={a.content.totalImages?.toString()}
                />
                <TextRow
                  label="Images avec alt"
                  value={a.content.imagesWithAlt !== null && a.content.totalImages !== null
                    ? `${a.content.imagesWithAlt}/${a.content.totalImages}`
                    : null}
                />
                <TextRow label="H1" value={a.content.h1Count?.toString()} />
                <TextRow label="H2" value={a.content.h2Count?.toString()} />
                <TextRow label="H3" value={a.content.h3Count?.toString()} />
                <CheckRow
                  label="Hiérarchie des titres correcte"
                  value={a.content.hasProperHeadingHierarchy}
                />
                <TextRow
                  label="Liens internes"
                  value={a.content.internalLinkCount?.toString()}
                />
                <TextRow
                  label="Liens externes"
                  value={a.content.externalLinkCount?.toString()}
                />
                <TextRow
                  label="Mots sur la page"
                  value={a.content.wordCount?.toString()}
                />
                <TextRow
                  label="Liens cassés"
                  value={
                    a.content.brokenLinksCount != null
                      ? `${a.content.brokenLinksCount} / ${a.content.checkedLinksCount} testés${a.content.brokenLinksCount > 0 ? " ⚠️" : ""}`
                      : null
                  }
                />
              </AnalysisSection>

              {/* Security */}
              <AnalysisSection title="Sécurité">
                <CheckRow label="HSTS" value={a.security.hasHsts} />
                <CheckRow label="Content Security Policy" value={a.security.hasCsp} />
                <CheckRow label="X-Frame-Options" value={a.security.hasXFrameOptions} />
                <CheckRow label="X-Content-Type-Options" value={a.security.hasXContentTypeOptions} />
              </AnalysisSection>

              {/* Social */}
              <AnalysisSection title="Social & Données structurées">
                <CheckRow label="Open Graph" value={a.social.hasOgTags} />
                <CheckRow label="Twitter Card" value={a.social.hasTwitterCard} />
                <CheckRow label="Image de partage (og:image)" value={a.social.hasOgImage} />
                {a.social.jsonLdInvalidCount != null && a.social.jsonLdInvalidCount > 0 && (
                  <TextRow
                    label="Données structurées invalides"
                    value={`${a.social.jsonLdInvalidCount} bloc(s) ⚠️`}
                  />
                )}
                {a.social.structuredDataTypes.length > 0 && (
                  <TextRow
                    label="Données structurées"
                    value={a.social.structuredDataTypes.join(", ")}
                  />
                )}
                {a.social.structuredDataTypes.length === 0 && (
                  <TextRow
                    label="Données structurées"
                    value="Aucune"
                  />
                )}
              </AnalysisSection>
            </div>
          )}

          {a && a.status === "NO_WEBSITE" && (
            <GlassCard variant="subtle" className="mt-6">
              <p className="text-sm text-muted-foreground">
                Aucun site web détecté pour cette entreprise. L&apos;analyse SEO
                n&apos;est pas disponible.
              </p>
            </GlassCard>
          )}

          {a && (a.status === "PENDING" || a.status === "RUNNING") && (
            <GlassCard variant="subtle" className="mt-6">
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-warning border-t-transparent" />
                <p className="text-sm text-warning">
                  Analyse en cours... Les résultats s&apos;afficheront automatiquement.
                </p>
              </div>
            </GlassCard>
          )}

          {a && a.status === "FAILED" && (
            <GlassCard variant="subtle" className="mt-6">
              <p className="text-sm text-destructive">
                L&apos;analyse a échoué. Utilisez le bouton re-analyser.
              </p>
            </GlassCard>
          )}

      <AddToListDialog
        open={addToListOpen}
        onOpenChange={setAddToListOpen}
        businessIds={[id]}
        onSuccess={() => showSuccess("Entreprise ajoutée à la liste")}
      />
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode | string | null;
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className="text-right font-medium truncate">{value ?? "—"}</dd>
    </div>
  );
}

function AnalysisSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <GlassCard>
      <h2 className="font-heading mb-3 font-semibold">{title}</h2>
      <dl className="space-y-2 text-sm">{children}</dl>
    </GlassCard>
  );
}

function CheckRow({ label, value }: { label: string; value: boolean | null }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>
        {value === null ? (
          <span className="text-muted-foreground">—</span>
        ) : value ? (
          <span className="text-success">Oui</span>
        ) : (
          <span className="text-destructive">Non</span>
        )}
      </dd>
    </div>
  );
}

function TextRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className="text-right font-medium break-words min-w-0">
        {value ?? "—"}
      </dd>
    </div>
  );
}

function computeRadarScores(a: AnalysisDetail | null) {
  if (!a || a.scores.seoScore === null) {
    return { technical: 0, onPage: 0, mobile: 0, local: 0, performance: 0, content: 0, security: 0, social: 0 };
  }

  const bool = (v: boolean | null) => (v === true ? 1 : 0);

  // Technical (5 checks)
  const techScore =
    (bool(a.technical.isHttps) +
      (a.technical.httpStatusCode === 200 ? 1 : 0) +
      (a.technical.responseTimeMs !== null && a.technical.responseTimeMs < 1000 ? 1 : 0) +
      bool(a.technical.hasRobotsTxt) +
      bool(a.technical.hasSitemapXml)) *
    20;

  // On-Page (5 checks)
  const onPageScore =
    (((a.seoOnPage.titleLength ?? 0) >= 30 && (a.seoOnPage.titleLength ?? 0) <= 60 ? 1 : a.seoOnPage.title ? 0.5 : 0) +
      ((a.seoOnPage.metaDescriptionLength ?? 0) >= 120 ? 1 : a.seoOnPage.metaDescription ? 0.5 : 0) +
      (a.seoOnPage.h1 ? 1 : 0) +
      bool(a.seoOnPage.hasCanonical) +
      bool(a.seoOnPage.hasFavicon)) *
    20;

  // Mobile (2 checks)
  const mobileScore =
    (bool(a.mobile.hasViewport) * 50) +
    (a.mobile.mobileScore !== null ? Math.min(a.mobile.mobileScore, 100) / 2 : 0);

  // Local (5 checks)
  const localScore =
    (bool(a.localSeo.cityInTitle) +
      bool(a.localSeo.cityInH1) +
      bool(a.localSeo.cityInDescription) +
      bool(a.localSeo.hasSchemaLocalBusiness) +
      bool(a.localSeo.hasGoogleMapsEmbed)) *
    20;

  // Performance — use PageSpeed score directly, or 0
  const performanceScoreVal = a.performance.performanceScore ?? 0;

  // Content (5 checks: images with alt ratio, heading hierarchy, internal links, external links, enough images)
  let contentScore = 0;
  if (a.content.totalImages !== null && a.content.imagesWithAlt !== null) {
    const altRatio = a.content.totalImages > 0 ? a.content.imagesWithAlt / a.content.totalImages : 0;
    contentScore += altRatio >= 0.8 ? 20 : altRatio >= 0.5 ? 10 : 0;
  }
  contentScore += bool(a.content.hasProperHeadingHierarchy) * 20;
  contentScore += (a.content.internalLinkCount ?? 0) >= 5 ? 20 : (a.content.internalLinkCount ?? 0) >= 1 ? 10 : 0;
  contentScore += (a.content.externalLinkCount ?? 0) >= 1 ? 20 : 0;
  contentScore += (a.content.totalImages ?? 0) >= 3 ? 20 : (a.content.totalImages ?? 0) >= 1 ? 10 : 0;

  // Security (4 checks)
  const securityScore =
    (bool(a.security.hasHsts) +
      bool(a.security.hasCsp) +
      bool(a.security.hasXFrameOptions) +
      bool(a.security.hasXContentTypeOptions)) *
    25;

  // Social (3 checks: OG, Twitter, structured data)
  const socialScore =
    (bool(a.social.hasOgTags) * 33) +
    (bool(a.social.hasTwitterCard) * 33) +
    (a.social.structuredDataTypes.length > 0 ? 34 : 0);

  return {
    technical: Math.round(techScore),
    onPage: Math.round(onPageScore),
    mobile: Math.round(mobileScore),
    local: Math.round(localScore),
    performance: Math.round(performanceScoreVal),
    content: Math.min(100, Math.round(contentScore)),
    security: Math.round(securityScore),
    social: Math.min(100, Math.round(socialScore)),
  };
}
