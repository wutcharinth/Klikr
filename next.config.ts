import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  async redirects() {
    return [
      // Old marketing pages → new structure.
      // The "showcase" page has been folded into /about. Demo gets its own
      // Next.js wrapper with the shared NavBar.
      { source: "/showcase", destination: "/about", permanent: true },
      { source: "/showcase.html", destination: "/about", permanent: true },
    ];
  },
};

export default nextConfig;
