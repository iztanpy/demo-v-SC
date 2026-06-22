import type { NextConfig } from "next";
import { fileURLToPath } from "url";
import { dirname } from "path";

// kg-v3 lives inside a multi-project repo with no local lockfile, so Turbopack
// mis-infers the workspace root and fails to resolve `next`. Pin it to this dir.
const here = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: here,
  },
};

export default nextConfig;
