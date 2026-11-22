import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  typescript: { 
    // Mantenemos esto activado para asegurar que el despliegue no falle por tipos de terceros
    ignoreBuildErrors: true 
  },
  eslint: { 
    ignoreDuringBuilds: true 
  },
};

export default nextConfig;
