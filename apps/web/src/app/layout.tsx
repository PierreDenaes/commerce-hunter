import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import { MotionConfig } from "motion/react";
import { Toaster } from "sonner";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://commercehunter.dnada.cloud";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "CommerceHunter — Trouvez les entreprises sans présence digitale",
    template: "%s – CommerceHunter",
  },
  description:
    "Scannez un code postal, identifiez les commerces et PME sans site web ou mal référencés, et exportez vos prospects qualifiés en PDF ou CSV. L'outil de prospection des agences web.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: APP_URL,
    siteName: "CommerceHunter",
    title: "CommerceHunter — Trouvez les entreprises sans présence digitale",
    description:
      "Scannez un code postal, analysez le score digital de chaque entreprise et exportez vos prospects qualifiés. Prospection automatisée pour agences web.",
    images: [{ url: "/screenshots/fiche-entreprise.png", width: 1440, height: 900, alt: "CommerceHunter — audit digital et recommandations IA" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CommerceHunter — Trouvez les entreprises sans présence digitale",
    description:
      "Prospection automatisée pour agences web : scan SIRENE, score digital, exports PDF/CSV.",
    images: ["/screenshots/fiche-entreprise.png"],
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fr"
      className={`dark ${spaceGrotesk.variable} ${inter.variable}`}
    >
      <body className="font-body bg-background text-foreground antialiased">
        <MotionConfig reducedMotion="user">
          <div className="mx-auto max-w-screen-2xl">{children}</div>
          <Toaster theme="dark" position="bottom-right" />
        </MotionConfig>
      </body>
    </html>
  );
}
