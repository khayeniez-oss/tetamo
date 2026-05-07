import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo-server";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // Admin dashboard
          "/admindashboard",
          "/admindashboard/",

          // Agent dashboard
          "/agentdashboard",
          "/agentdashboard/",

          // Owner dashboard
          "/pemilikdashboard",
          "/pemilikdashboard/",

          // Owner listing creation/private flow
          "/pemilik/iklan",
          "/pemilik/iklan/",

          // Auth pages
          "/login",
          "/signup",
          "/forgot-password",
          "/update-password",
          "/auth/callback",

          // Payment/private pages
          "/api",
          "/api/",
          "/payment",
          "/payment/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}