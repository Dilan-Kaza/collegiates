import path from "path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  // Pin the workspace root to this project so Next doesn't infer it from an
  // unrelated lockfile elsewhere on the machine.
  outputFileTracingRoot: path.resolve(process.cwd()),
  experimental: {
    // Client Router Cache reuse windows. `dynamic` defaults to 0, which means
    // every navigation re-fetches the destination's RSC payload from the server
    // — so bouncing /organizer -> /organizer/registrations -> /organizer paid for
    // three server renders. 30s of reuse removes the repeat round trips while
    // staying well inside the 60s TTL the server-side read caches use.
    staleTimes: { dynamic: 30, static: 180 },
  },
};

export default nextConfig;
