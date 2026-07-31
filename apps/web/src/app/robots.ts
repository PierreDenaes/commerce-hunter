import type { MetadataRoute } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://commercehunter.dnada.cloud";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Pages applicatives sans intérêt SEO
        disallow: ["/dashboard", "/scans", "/businesses", "/prospects", "/settings", "/invite/"],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
