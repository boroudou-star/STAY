import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Reading notes now open in a panel on the Insights page; old links land there instead of a 404.
  async redirects() {
    return [{ source: "/insights/notes/:id", destination: "/insights", permanent: false }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
