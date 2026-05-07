import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: false,

  async redirects() {
    return [
      // Old language root
      {
        source: "/id",
        destination: "/",
        permanent: true,
      },

      // Old property URLs to new Tetamo property route
      {
        source: "/all-properties/:slug*",
        destination: "/properti/:slug*",
        permanent: true,
      },
      {
        source: "/id/all-properties/:slug*",
        destination: "/properti/:slug*",
        permanent: true,
      },

      // Old pages from previous website structure
      {
        source: "/kerajaan-broker/marketing-properti",
        destination: "/blog",
        permanent: true,
      },
      {
        source: "/aplikasiprosedur",
        destination: "/faq",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;