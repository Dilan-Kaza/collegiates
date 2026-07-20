import path from "path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  // Pin the workspace root to this project so Next doesn't infer it from an
  // unrelated lockfile elsewhere on the machine.
  outputFileTracingRoot: path.resolve(process.cwd()),
};

export default nextConfig;
