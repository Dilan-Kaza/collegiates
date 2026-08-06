import path from "path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  // Pin the workspace root to this project so Next doesn't infer it from an
  // unrelated lockfile elsewhere on the machine.
  outputFileTracingRoot: path.resolve(process.cwd()),
  experimental: {
    // Client Router Cache reuse windows. `dynamic` defaults to 0, so every navigation re-fetches
    // the destination's RSC payload; 30s of reuse stays well inside the 60s server-read TTL.
    staleTimes: { dynamic: 30, static: 180 },
  },
};

export default nextConfig;
