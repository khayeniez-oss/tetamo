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
          "/admindashboard/",
          "/agentdashboard/",
          "/pemilikdashboard/",
          "/login",
          "/signup",
          "/api/",
          "/dashboard/",
          "/payment/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}