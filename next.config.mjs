/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produce a self-contained output directory for Docker deployments.
  // The standalone build copies only the files needed to run the server,
  // keeping the final image small.
  output: "standalone",

  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
